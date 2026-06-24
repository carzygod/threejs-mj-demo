#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:1234';
const DEFAULT_WIDTH = 2000;
const DEFAULT_HEIGHT = 900;
const DISCARD_MARKER_FADE_MS = 1100;

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const [key, inlineValue] = arg.slice(2).split('=');
    if (inlineValue !== undefined) {
      result[key] = inlineValue;
    } else {
      result[key] = argv[i + 1];
      i++;
    }
  }
  return result;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

async function importPlaywright() {
  try {
    return await import('playwright-core');
  } catch (error) {
    console.error('Missing dependency: playwright-core.');
    console.error('Run `npm install` in game/threejsDemo before `npm run verify:20x9`.');
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const args = parseArgs(process.argv.slice(2));
const url = args.url ?? DEFAULT_URL;
const width = Number(args.width ?? DEFAULT_WIDTH);
const height = Number(args.height ?? DEFAULT_HEIGHT);
const outDir = path.resolve(args.outDir ?? 'artifacts');
const ratio = width / height;

assert(Math.abs(ratio - 20 / 9) < 0.01, `Viewport must be 20:9, received ${width}:${height}.`);

await fs.mkdir(outDir, { recursive: true });

const { chromium } = await importPlaywright();
const chromeExecutable = findChromeExecutable();
const launchOptions = {
  headless: true,
  args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
};
if (chromeExecutable) {
  launchOptions.executablePath = chromeExecutable;
} else {
  launchOptions.channel = 'chrome';
}

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const browserErrors = [];

page.on('console', message => {
  if (message.type() === 'error') {
    browserErrors.push(`console: ${message.text()}`);
  }
});
page.on('pageerror', error => {
  browserErrors.push(`pageerror: ${error.message}`);
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const game = window.game;
    return Boolean(
      game &&
      game.world &&
      game.mainGroup &&
      game.mainView &&
      document.querySelector('#main canvas')
    );
  }, null, { timeout: 60000 });
  await page.waitForFunction(() => {
    const game = window.game;
    return game.world.toSelect().some(item => item.cameraHand === true);
  }, null, { timeout: 60000 });
  await page.waitForTimeout(600);

  const stamp = timestamp();
  const initialScreenshot = path.join(outDir, `verify-20x9-${stamp}-initial.png`);
  const dragScreenshot = path.join(outDir, `verify-20x9-${stamp}-drag-discard.png`);
  const finalScreenshot = path.join(outDir, `verify-20x9-${stamp}-final.png`);

  await page.screenshot({ path: initialScreenshot });

  const dragTargets = await page.evaluate(() => {
    const game = window.game;
    const world = game.world;
    const seat = world.seat;
    const main = document.getElementById('main');
    const rect = main.getBoundingClientRect();
    const three = window.three;
    const raycaster = new three.Raycaster();
    const tablePlane = new three.Plane(new three.Vector3(0, 0, 1), 0);

    function project(place) {
      const point = place.position.clone();
      return projectPoint(point);
    }

    function projectPoint(point) {
      game.mainGroup.updateMatrixWorld(true);
      game.mainGroup.localToWorld(point);
      point.project(game.mainView.camera);
      return {
        x: rect.left + (point.x + 1) * rect.width / 2,
        y: rect.top + (-point.y + 1) * rect.height / 2,
      };
    }

    function screenToTable(point) {
      const mouse = new three.Vector2(
        (point.x - rect.left) / rect.width * 2 - 1,
        -((point.y - rect.top) / rect.height * 2 - 1)
      );
      raycaster.setFromCamera(mouse, game.mainView.camera);
      const worldPoint = new three.Vector3();
      if (!raycaster.ray.intersectPlane(tablePlane, worldPoint)) {
        return null;
      }
      game.mainGroup.worldToLocal(worldPoint);
      return worldPoint;
    }

    const handSelects = world.toSelect().filter(item => {
      const thing = world.things.get(item.id);
      return item.cameraHand === true &&
        thing &&
        thing.slot.group === 'hand' &&
        thing.slot.seat === seat;
    });

    const discardSlots = [...world.slots.values()].filter(slot =>
      slot.type === 'TILE' &&
      slot.group === 'discard' &&
      slot.seat === seat &&
      slot.thing === null &&
      (!slot.links.requires || slot.links.requires.thing !== null)
    );

    let target = null;
    for (const handSelect of handSelects) {
      const handThing = world.things.get(handSelect.id);
      const handPoint = project(handSelect);
      const handDrop = screenToTable(handPoint);
      if (handDrop === null) {
        continue;
      }

      for (const discardSlot of discardSlots) {
        const discardPlace = discardSlot.placeWithOffset(0);
        const desiredDrop = handDrop.clone().add(
          discardPlace.position.clone().sub(handThing.place().position)
        );
        const dragPoint = projectPoint(desiredDrop);
        if (
          dragPoint.x >= rect.left + 8 &&
          dragPoint.x <= rect.left + rect.width - 8 &&
          dragPoint.y >= rect.top + 8 &&
          dragPoint.y <= rect.top + rect.height - 8
        ) {
          target = {
            hand: handPoint,
            drag: dragPoint,
            handSlotName: handThing.slot.name,
            discardSlotName: discardSlot.name,
          };
          break;
        }
      }

      if (target !== null) {
        break;
      }
    }

    const beforeDiscardThingIndexes = [...world.things.values()].filter(thing =>
      thing.type === 'TILE' &&
      thing.slot.seat === seat &&
      (thing.slot.group === 'discard' || thing.slot.group === 'discard.extra')
    ).map(thing => thing.index);

    return {
      ...target,
      beforeDiscardThingIndexes,
    };
  });

  assert(dragTargets.hand !== null, 'No selectable camera-hand tile found.');
  assert(dragTargets.drag !== null, 'No reachable discard drag target found.');

  await page.mouse.move(dragTargets.hand.x, dragTargets.hand.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(dragTargets.drag.x, dragTargets.drag.y, { steps: 30 });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(180);

  const dragResult = await page.evaluate(({ beforeDiscardThingIndexes }) => {
    const game = window.game;
    const world = game.world;
    const discards = [...world.things.values()].filter(thing =>
      thing.type === 'TILE' &&
      thing.slot.seat === world.seat &&
      (thing.slot.group === 'discard' || thing.slot.group === 'discard.extra')
    );
    const before = new Set(beforeDiscardThingIndexes);
    const newDiscards = discards.filter(thing => !before.has(thing.index));

    return {
      beforeDiscardCount: beforeDiscardThingIndexes.length,
      afterDiscardCount: discards.length,
      newDiscards: newDiscards.map(thing => ({
        index: thing.index,
        slotName: thing.slot.name,
        rotationIndex: thing.rotationIndex,
      })),
      transientMarkerCount: game.objectView.transientMarkers?.length ?? 0,
    };
  }, dragTargets);

  await page.screenshot({ path: dragScreenshot });

  assert(
    dragResult.afterDiscardCount === dragResult.beforeDiscardCount + 1,
    `Discard count did not increase by 1: ${JSON.stringify(dragResult)}`
  );
  assert(dragResult.newDiscards.length === 1, `Expected one new discard: ${JSON.stringify(dragResult)}`);
  assert(dragResult.newDiscards[0].rotationIndex === 0, `Discarded tile is not face-up: ${JSON.stringify(dragResult)}`);
  assert(dragResult.transientMarkerCount > 0, `Discard marker did not appear: ${JSON.stringify(dragResult)}`);

  await page.waitForTimeout(DISCARD_MARKER_FADE_MS);
  const markerAfterFade = await page.evaluate(() =>
    window.game.objectView.transientMarkers?.length ?? 0
  );
  assert(markerAfterFade === 0, `Discard marker did not auto-fade, remaining: ${markerAfterFade}.`);

  await page.screenshot({ path: finalScreenshot });
  assert(browserErrors.length === 0, `Browser errors occurred:\n${browserErrors.join('\n')}`);

  console.log(JSON.stringify({
    url,
    viewport: `${width}x${height}`,
    chromeExecutable: chromeExecutable ?? 'channel:chrome',
    screenshots: {
      initial: initialScreenshot,
      dragDiscard: dragScreenshot,
      final: finalScreenshot,
    },
    dragResult,
  }, null, 2));
} finally {
  await browser.close();
}
