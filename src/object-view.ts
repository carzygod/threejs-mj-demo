import { Group, Mesh, Vector3, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, BoxGeometry, CylinderGeometry, InstancedMesh, BufferGeometry } from "three";
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { World } from "./world";
import { Client } from "./client";
import { AssetLoader } from "./asset-loader";
import { Center } from "./center";
import { ThingParams, ThingGroup, TileThingGroup, StickThingGroup, MarkerThingGroup } from "./thing-group";
import { ThingType, Place, TileVariant, DiceInfo } from "./types";
import { TABLE_VISUAL_SIZE } from "./table-layout";

export interface Render {
  type: ThingType;
  thingIndex: number;
  place: Place;
  selected: boolean;
  hovered: boolean;
  held: boolean;
  temporary: boolean;
  bottom: boolean;
}

const MAX_SHADOWS = 300;
const SHOW_SCORE_TRAYS = false;
const TABLE_RAIL_HEIGHT = 1.8;
const TABLE_RAIL_THICKNESS = 5.5;
const TABLE_GOLD_TRIM = 0.8;
const TABLE_CORNER_ORNAMENT_HEIGHT = 0.32;
const DISCARD_MARKER_DURATION_MS = 900;
const HELD_GLOW_OPACITY = 0.48;

interface TransientMarker {
  mesh: Mesh;
  startedAt: number;
  baseZ: number;
}

export class ObjectView {
  mainGroup: Group;
  private assetLoader: AssetLoader;

  private center: Center;

  private thingGroups: Map<ThingType, ThingGroup>;

  private shadowObject: InstancedMesh;
  private dropShadowProto: Mesh;
  private dropShadowObjects: Array<Mesh>;
  private transientMarkers: Array<TransientMarker>;
  private heldGlowObjects: Array<Mesh>;

  selectedObjects: Array<Mesh>;

  constructor(mainGroup: Group, assetLoader: AssetLoader, client: Client) {
    this.mainGroup = mainGroup;
    this.assetLoader = assetLoader;

    this.center = new Center(this.assetLoader, client);
    this.center.mesh.position.set(World.WIDTH / 2, World.WIDTH / 2, 0.75);
    this.dropShadowObjects = [];
    this.transientMarkers = [];
    this.heldGlowObjects = [];
    this.selectedObjects = [];

    this.thingGroups = new Map();
    this.thingGroups.set(ThingType.TILE, new TileThingGroup(this.assetLoader, this.mainGroup));
    this.thingGroups.set(ThingType.STICK, new StickThingGroup(this.assetLoader, this.mainGroup));
    this.thingGroups.set(ThingType.MARKER, new MarkerThingGroup(this.assetLoader, this.mainGroup));

    const plane = new PlaneGeometry(1, 1, 1);
    let material = new MeshBasicMaterial({
      transparent: true,
      opacity: 0.16,
      color: 0x001812,
      depthWrite: false,
    });
    this.shadowObject = new InstancedMesh(plane, material, MAX_SHADOWS);
    this.shadowObject.visible = true;
    this.mainGroup.add(this.shadowObject);

    material = material.clone();
    material.opacity = 0.24;

    this.dropShadowProto = new Mesh(plane, material);
    this.dropShadowProto.name = 'dropShadow';

    this.addStatic();
  }

  replaceThings(params: Map<number, ThingParams>): void {
    const visibleTypes = SHOW_SCORE_TRAYS
      ? [ThingType.TILE, ThingType.STICK, ThingType.MARKER]
      : [ThingType.TILE, ThingType.MARKER];

    for (const type of visibleTypes) {
      const typeParams = [...params.values()].filter(p => p.type === type);
      typeParams.sort((a, b) => a.index - b.index);

      if (typeParams.length === 0) {
        continue;
      }
      const startIndex = typeParams[0].index;
      const thingGroup = this.thingGroups.get(type)!;
      thingGroup.replace(startIndex, typeParams);
    }
  }

  replaceShadows(places: Array<Place>): void {
    const dummy = new Object3D();

    this.shadowObject.count = 0;
    for (const place of places) {
      dummy.position.set(place.position.x, place.position.y, 0.1);
      dummy.scale.set(place.size.x, place.size.y, 1);
      dummy.updateMatrix();

      const idx = this.shadowObject.count++;
      this.shadowObject.setMatrixAt(idx, dummy.matrix);
    }
    this.shadowObject.instanceMatrix.needsUpdate = true;
  }

  private addStatic(): void {
    const tableMesh = this.assetLoader.makeTable();
    tableMesh.position.set(World.WIDTH / 2, World.WIDTH / 2, 0);
    this.mainGroup.add(tableMesh);

    this.addTableFrame();
    this.mainGroup.add(this.center.mesh);

    tableMesh.updateMatrixWorld();
    this.center.mesh.updateMatrixWorld();

    if (SHOW_SCORE_TRAYS) {
      const tray = this.assetLoader.makeTray();
      tray.updateMatrixWorld();
      const geometries: Array<BufferGeometry> = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 6; j++) {
          const trayPos = new Vector3(
            25 + 24 * j - World.WIDTH / 2,
            -33 - World.WIDTH / 2,
            0
          );
          trayPos.applyAxisAngle(new Vector3(0, 0, 1), Math.PI * i / 2);

          const geometry = tray.geometry.clone();

          geometry.rotateZ(Math.PI * i / 2);
          geometry.translate(
            trayPos.x + World.WIDTH / 2,
            trayPos.y + World.WIDTH / 2,
            0
          );

          geometries.push(geometry);
        }
      }
      tray.geometry = mergeGeometries(geometries);
      tray.position.set(0, 0, 0);
      this.mainGroup.add(tray);
      tray.updateMatrixWorld();
    }
  }

  updateScores(scores: Array<number | null>): void {
    this.center.setScores(scores);
    this.center.draw();
  }

  updateThings(things: Array<Render>): void {
    this.selectedObjects.splice(0);
    const heldGlowPlaces: Array<Place> = [];
    for (const thing of things) {
      if (!SHOW_SCORE_TRAYS && thing.type === ThingType.STICK) {
        continue;
      }

      const thingGroup = this.thingGroups.get(thing.type)!;
      const custom = thing.hovered || thing.selected || thing.held || thing.bottom;
      if (!custom && thingGroup.canSetSimple()) {
        thingGroup.setSimple(thing.thingIndex, thing.place.position, thing.place.rotation);
        continue;
      }

      const obj = thingGroup.setCustom(
        thing.thingIndex, thing.place.position, thing.place.rotation);

      const material = obj.material as MeshLambertMaterial;
      const wasTransparent = material.transparent;

      material.color.set(1.0, 1.0, 1.0);
      material.emissive.set(0.0, 0.0, 0.0);
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      material.depthTest = true;
      obj.renderOrder = 0;

      if (thing.type === ThingType.MARKER) {
        material.transparent = true;
        material.opacity = 0.74;
        material.depthWrite = false;
        obj.renderOrder = 2;
      }

      if (thing.hovered) {
        material.emissive.set(0.09, 0.07, 0.02);
      }

      if (thing.bottom) {
        material.color.set(0.84, 0.88, 0.78);
      }

      if (thing.selected) {
        material.color.set(1.1, 1.03, 0.82);
        material.emissive.set(0.15, 0.1, 0.02);
        if (!thing.held) {
          obj.position.z += 0.7;
        }
        this.selectedObjects.push(obj);
      }

      if (thing.held) {
        material.transparent = true;
        material.opacity = thing.temporary ? 0.88 : 1;
        material.depthTest = false;
        obj.position.z += 1;
        obj.renderOrder = 1;
        if (thing.type === ThingType.TILE) {
          heldGlowPlaces.push(thing.place);
        }
      }

      if (material.transparent !== wasTransparent) {
        material.needsUpdate = true;
      }

      obj.updateMatrix();
      obj.updateMatrixWorld();
    }
    this.updateHeldGlows(heldGlowPlaces);
    this.updateTransientMarkers();
  }

  private updateHeldGlows(places: Array<Place>): void {
    while (this.heldGlowObjects.length < places.length) {
      const glow = this.assetLoader.makeMarker();
      glow.name = 'heldTileGlow';
      glow.renderOrder = 0.5;
      const material = glow.material as MeshLambertMaterial;
      material.transparent = true;
      material.opacity = HELD_GLOW_OPACITY;
      material.color.set(1.0, 0.86, 0.32);
      material.emissive.set(0.28, 0.16, 0.02);
      material.depthWrite = false;
      material.depthTest = false;
      this.heldGlowObjects.push(glow);
      this.mainGroup.add(glow);
    }

    for (let i = 0; i < this.heldGlowObjects.length; i++) {
      const glow = this.heldGlowObjects[i];
      const place = places[i];
      if (place === undefined) {
        glow.visible = false;
        continue;
      }

      glow.visible = true;
      glow.position.set(
        place.position.x,
        place.position.y,
        place.position.z - Math.max(0.35, place.size.z * 0.18),
      );
      glow.setRotationFromQuaternion(place.rotation);
      glow.scale.setScalar(1.16);
      const material = glow.material as MeshLambertMaterial;
      material.opacity = HELD_GLOW_OPACITY;
      glow.updateMatrixWorld();
    }
  }

  showDiscardMarker(place: Place): void {
    const marker = this.assetLoader.makeMarker();
    marker.position.set(
      place.position.x,
      place.position.y,
      Math.max(0.12, place.position.z - place.size.z / 2 + 0.08),
    );
    marker.setRotationFromQuaternion(place.rotation);
    marker.scale.setScalar(1.05);
    marker.renderOrder = 4;

    const material = marker.material as MeshLambertMaterial;
    material.transparent = true;
    material.opacity = 0.94;
    material.depthWrite = false;

    this.transientMarkers.push({
      mesh: marker,
      startedAt: performance.now(),
      baseZ: marker.position.z,
    });
    this.mainGroup.add(marker);
    marker.updateMatrixWorld();
  }

  private updateTransientMarkers(): void {
    const now = performance.now();
    for (let i = this.transientMarkers.length - 1; i >= 0; i--) {
      const marker = this.transientMarkers[i];
      const age = now - marker.startedAt;
      const progress = Math.min(1, age / DISCARD_MARKER_DURATION_MS);

      if (progress >= 1) {
        this.mainGroup.remove(marker.mesh);
        marker.mesh.geometry.dispose();
        (marker.mesh.material as MeshLambertMaterial).dispose();
        this.transientMarkers.splice(i, 1);
        continue;
      }

      const eased = 1 - Math.pow(1 - progress, 2);
      const material = marker.mesh.material as MeshLambertMaterial;
      material.opacity = 0.94 * (1 - eased);
      marker.mesh.scale.setScalar(1.05 + eased * 0.34);
      marker.mesh.position.z = marker.baseZ + eased * 0.18;
      marker.mesh.updateMatrixWorld();
    }
  }

  private addTableFrame(): void {
    const railMaterial = new MeshLambertMaterial({ color: 0x7a401d });
    const railHighlightMaterial = new MeshLambertMaterial({ color: 0xc0782d });
    const goldMaterial = new MeshLambertMaterial({ color: 0xd8a84a });
    const darkGrooveMaterial = new MeshLambertMaterial({ color: 0x2f170a });
    const tableSize = TABLE_VISUAL_SIZE;
    const center = World.WIDTH / 2;
    const outerMin = center - tableSize / 2;
    const outerMax = center + tableSize / 2;
    const railZ = TABLE_RAIL_HEIGHT / 2 + 0.02;
    const topBottomLength = tableSize;
    const sideLength = tableSize - TABLE_RAIL_THICKNESS * 2;

    const addBox = (
      name: string,
      width: number,
      depth: number,
      height: number,
      x: number,
      y: number,
      z: number,
      material: MeshLambertMaterial,
      rotationZ: number = 0,
    ): Mesh => {
      const mesh = new Mesh(new BoxGeometry(width, depth, height), material);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.rotation.z = rotationZ;
      this.mainGroup.add(mesh);
      mesh.updateMatrixWorld();
      return mesh;
    };

    const addRoundStud = (
      name: string,
      radius: number,
      height: number,
      x: number,
      y: number,
      z: number,
      material: MeshLambertMaterial,
    ): Mesh => {
      const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 32), material);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.rotation.x = Math.PI / 2;
      this.mainGroup.add(mesh);
      mesh.updateMatrixWorld();
      return mesh;
    };

    addBox('table-rail-front', topBottomLength, TABLE_RAIL_THICKNESS, TABLE_RAIL_HEIGHT,
      center, outerMin + TABLE_RAIL_THICKNESS / 2, railZ, railMaterial);
    addBox('table-rail-back', topBottomLength, TABLE_RAIL_THICKNESS, TABLE_RAIL_HEIGHT,
      center, outerMax - TABLE_RAIL_THICKNESS / 2, railZ, railMaterial);
    addBox('table-rail-left', TABLE_RAIL_THICKNESS, sideLength, TABLE_RAIL_HEIGHT,
      outerMin + TABLE_RAIL_THICKNESS / 2, center, railZ, railMaterial);
    addBox('table-rail-right', TABLE_RAIL_THICKNESS, sideLength, TABLE_RAIL_HEIGHT,
      outerMax - TABLE_RAIL_THICKNESS / 2, center, railZ, railMaterial);

    const innerMin = outerMin + TABLE_RAIL_THICKNESS - 0.4;
    const innerMax = outerMax - TABLE_RAIL_THICKNESS + 0.4;
    const trimZ = TABLE_RAIL_HEIGHT + 0.18;
    const trimLength = innerMax - innerMin;

    addBox('table-gold-front', trimLength, TABLE_GOLD_TRIM, 0.38,
      center, innerMin, trimZ, goldMaterial);
    addBox('table-gold-back', trimLength, TABLE_GOLD_TRIM, 0.38,
      center, innerMax, trimZ, goldMaterial);
    addBox('table-gold-left', TABLE_GOLD_TRIM, trimLength, 0.38,
      innerMin, center, trimZ, goldMaterial);
    addBox('table-gold-right', TABLE_GOLD_TRIM, trimLength, 0.38,
      innerMax, center, trimZ, goldMaterial);

    addBox('table-wood-front-highlight', trimLength, 0.55, 0.22,
      center, innerMin + 2.1, trimZ + 0.04, railHighlightMaterial);
    addBox('table-wood-back-highlight', trimLength, 0.55, 0.22,
      center, innerMax - 2.1, trimZ + 0.04, railHighlightMaterial);
    addBox('table-wood-left-highlight', 0.55, trimLength, 0.22,
      innerMin + 2.1, center, trimZ + 0.04, railHighlightMaterial);
    addBox('table-wood-right-highlight', 0.55, trimLength, 0.22,
      innerMax - 2.1, center, trimZ + 0.04, railHighlightMaterial);

    addBox('table-inner-groove-front', trimLength, 0.36, 0.18,
      center, innerMin + 3.7, trimZ + 0.06, darkGrooveMaterial);
    addBox('table-inner-groove-back', trimLength, 0.36, 0.18,
      center, innerMax - 3.7, trimZ + 0.06, darkGrooveMaterial);
    addBox('table-inner-groove-left', 0.36, trimLength, 0.18,
      innerMin + 3.7, center, trimZ + 0.06, darkGrooveMaterial);
    addBox('table-inner-groove-right', 0.36, trimLength, 0.18,
      innerMax - 3.7, center, trimZ + 0.06, darkGrooveMaterial);

    this.addCornerOrnaments(addBox, addRoundStud, innerMin, innerMax, trimZ, goldMaterial, railHighlightMaterial);
  }

  private addCornerOrnaments(
    addBox: (
      name: string,
      width: number,
      depth: number,
      height: number,
      x: number,
      y: number,
      z: number,
      material: MeshLambertMaterial,
      rotationZ?: number,
    ) => Mesh,
    addRoundStud: (
      name: string,
      radius: number,
      height: number,
      x: number,
      y: number,
      z: number,
      material: MeshLambertMaterial,
    ) => Mesh,
    innerMin: number,
    innerMax: number,
    trimZ: number,
    goldMaterial: MeshLambertMaterial,
    railHighlightMaterial: MeshLambertMaterial,
  ): void {
    const ornamentZ = trimZ + 0.34;
    const studZ = ornamentZ + TABLE_CORNER_ORNAMENT_HEIGHT * 0.5;
    const corners = [
      { sx: -1, sy: -1, name: 'front-left' },
      { sx: 1, sy: -1, name: 'front-right' },
      { sx: 1, sy: 1, name: 'back-right' },
      { sx: -1, sy: 1, name: 'back-left' },
    ];

    for (const corner of corners) {
      const x = corner.sx < 0 ? innerMin + 6.2 : innerMax - 6.2;
      const y = corner.sy < 0 ? innerMin + 6.2 : innerMax - 6.2;
      const xArm = x + corner.sx * 3.5;
      const yArm = y + corner.sy * 3.5;
      const diagonal = corner.sx === corner.sy ? Math.PI / 4 : -Math.PI / 4;

      addBox(`table-corner-${corner.name}-gold-arm-x`, 11.5, 0.72, TABLE_CORNER_ORNAMENT_HEIGHT,
        x, yArm, ornamentZ, goldMaterial);
      addBox(`table-corner-${corner.name}-gold-arm-y`, 0.72, 11.5, TABLE_CORNER_ORNAMENT_HEIGHT,
        xArm, y, ornamentZ, goldMaterial);
      addBox(`table-corner-${corner.name}-gold-diagonal`, 10.5, 0.72, TABLE_CORNER_ORNAMENT_HEIGHT,
        x + corner.sx * 1.5, y + corner.sy * 1.5, ornamentZ + 0.04, goldMaterial, diagonal);
      addBox(`table-corner-${corner.name}-wood-highlight`, 7.2, 0.46, TABLE_CORNER_ORNAMENT_HEIGHT * 0.7,
        x - corner.sx * 2.1, y - corner.sy * 2.1, ornamentZ + 0.08, railHighlightMaterial, diagonal);
      addRoundStud(`table-corner-${corner.name}-gold-stud`, 1.25, TABLE_CORNER_ORNAMENT_HEIGHT,
        x + corner.sx * 5.1, y + corner.sy * 5.1, studZ, goldMaterial);
    }
  }

  updateDropShadows(places: Array<Place>): void {
    for (const obj of this.dropShadowObjects) {
      this.mainGroup.remove(obj);
    }
    this.dropShadowObjects.splice(0);

    for (const place of places) {
      const obj = this.dropShadowProto.clone();
      obj.position.set(
        place.position.x,
        place.position.y,
        place.position.z - place.size.z/2 + 0.2);
      obj.scale.set(place.size.x, place.size.y, 1);
      this.dropShadowObjects.push(obj);
      this.mainGroup.add(obj);
      obj.updateMatrixWorld();
    }
  }

  setTileVariant(tileVariant: TileVariant) {
    const tileThingGroup = this.thingGroups.get(ThingType.TILE) as TileThingGroup;
    tileThingGroup.setVariant(tileVariant);
  }
}
