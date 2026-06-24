import { AssetLoader } from "./asset-loader";
import { Mesh, CanvasTexture, Vector2, MeshLambertMaterial } from "three";
import { Client } from "./client";
import { DiceInfo } from "./types";

export class Center {
  mesh: Mesh;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: CanvasTexture;

  scores: Array<number | null> = new Array(5).fill(null);
  nicks: Array<string | null> = new Array(4).fill(null);
  dealer: number | null = null;
  honba = 0;
  diceInfo: DiceInfo = {dice: [1, 1], state: 'ignore'};
  shouldDrawDice = false;

  diceImg: HTMLImageElement;

  client: Client;

  dirty = true;

  constructor(loader: AssetLoader, client: Client) {
    this.mesh = loader.makeCenter();
    this.canvas = document.getElementById('center')! as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    const material = this.mesh.material as MeshLambertMaterial;
    const image = material.map!.image as HTMLImageElement;

    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);

    this.texture = new CanvasTexture(this.canvas);
    this.texture.flipY = false;
    this.texture.rotation = Math.PI;
    this.texture.center = new Vector2(0.5, 0.5);
    this.texture.anisotropy = 16;
    material.map = this.texture;
    material.transparent = true;
    material.depthWrite = false;

    this.client = client;
    this.client.nicks.on('update', this.update.bind(this));
    this.client.match.on('update', this.update.bind(this));
    this.client.seats.on('update', this.update.bind(this));
    this.client.dice.on('update', this.updateDice.bind(this));

    this.diceImg = document.getElementById('dice-img')! as HTMLImageElement;

    client.on('disconnect', this.update.bind(this));
  }

  update(): void {
    for (let i = 0; i < 4; i++) {
      if (this.client.connected()) {
        const playerId = this.client.seatPlayers[i];
        const nick = playerId !== null ? this.client.nicks.get(playerId) : null;
        this.nicks[i] = nick ?? null;
      } else {
        this.nicks[i] = null;
      }
    }

    this.dealer = this.client.match.get(0)?.dealer ?? null;
    this.honba = this.client.match.get(0)?.honba ?? 0;

    this.dirty = true;
  }

  updateDice(): void {
    this.diceInfo = this.client.dice.get(0) ?? {dice: [1, 1], state: 'ignore'};
    if (this.diceInfo.state == 'rolled') {
      this.shouldDrawDice = true;
      this.dirty = true;
      setTimeout(() => {
        this.shouldDrawDice = false;
        this.dirty = true;
        this.draw();
      }, 1000);
    }
  }

  setScores(scores: Array<number | null>): void {
    for (let i = 0; i < 5; i++) {
      if (scores[i] !== this.scores[i]) {
        this.dirty = true;
      }
      this.scores[i] = scores[i];
    }
  }

  draw(): void {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;

    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, 512, 512);
    this.ctx.textBaseline = 'middle';
    this.drawPanel();

    this.ctx.translate(256, 256);
    this.drawCompass();

    for (let i = 0; i < 4; i++) {
      this.ctx.save();
      this.ctx.rotate(-Math.PI / 2 * i);
      this.drawSeatInfo(i);
      if (this.dealer === i) {
        this.drawDealer();
      }
      this.ctx.restore();
    }

    if (this.shouldDrawDice) {
      this.ctx.save();
      this.ctx.rotate(Math.PI / 4);
      this.drawDice();
      this.ctx.restore();
    }

    this.texture.needsUpdate = true;
  }

  drawPanel(): void {
    const ctx = this.ctx;
    const x = 108;
    const y = 108;
    const size = 296;

    const gradient = ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, '#0f523c');
    gradient.addColorStop(0.56, '#063b32');
    gradient.addColorStop(1, '#052a24');

    ctx.save();
    this.roundRect(x, y, size, size, 26);
    ctx.fillStyle = 'rgba(4, 22, 18, 0.72)';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255, 225, 127, 0.72)';
    ctx.stroke();

    this.roundRect(x + 16, y + 16, size - 32, size - 32, 18);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 237, 167, 0.48)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 32px "Microsoft YaHei", SimHei, sans-serif';
    ctx.fillStyle = '#ffe6a0';
    ctx.fillText(`第${this.honba + 1}局`, 256, 205);
    ctx.font = '700 22px "Microsoft YaHei", SimHei, sans-serif';
    ctx.fillStyle = '#c8f3d5';
    ctx.fillText('江南麻将', 256, 306);
    ctx.restore();
  }

  drawCompass(): void {
    const ctx = this.ctx;
    const winds = [
      { text: '北', x: 0, y: -86 },
      { text: '东', x: 84, y: 0 },
      { text: '南', x: 0, y: 86 },
      { text: '西', x: -84, y: 0 },
    ];

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(3, 27, 23, 0.72)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(246, 205, 97, 0.55)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 25px "Microsoft YaHei", SimHei, sans-serif';
    for (const wind of winds) {
      ctx.fillStyle = '#f6d27b';
      ctx.fillText(wind.text, wind.x, wind.y);
    }
    ctx.restore();
  }

  drawSeatInfo(index: number): void {
    const score = this.scores[index];
    const nick = this.formatNick(this.nicks[index]);
    const ctx = this.ctx;

    ctx.save();
    this.roundRect(-74, -138, 148, 32, 10);
    ctx.fillStyle = 'rgba(5, 38, 32, 0.72)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(229, 190, 87, 0.45)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 17px "Microsoft YaHei", SimHei, sans-serif';
    ctx.fillStyle = '#f9e5a2';
    ctx.fillText(nick, 0, -126);

    if (score !== null) {
      ctx.font = '700 18px Verdana, Arial, sans-serif';
      ctx.fillStyle = score < 0 ? '#ff9f76' : '#c8f3d5';
      ctx.fillText(String(score), 0, -104);
    }
    ctx.restore();
  }

  drawDealer(): void {
    const ctx = this.ctx;
    ctx.save();
    this.roundRect(-28, -101, 56, 24, 8);
    ctx.fillStyle = '#b67b19';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffeba7';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '700 16px "Microsoft YaHei", SimHei, sans-serif';
    ctx.fillStyle = '#fff4c2';
    ctx.fillText('庄', 0, -89);
    ctx.restore();
  }

  formatNick(nick: string | null): string {
    if (nick === null || nick === '') {
      return '玩家';
    }
    return nick.substring(0, 8);
  }

  roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const ctx = this.ctx;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawDice(): void {
    let [a, b] = this.diceInfo.dice;

    // Animate
    // const t = Math.floor(new Date().getTime() / 100);
    // a = t % 6 + 1;
    // // https://en.wikipedia.org/wiki/Linear_congruential_generator
    // b = (t * 1664525 + 1013904223) % 6 + 1;

    this.drawDie(a, -44, -20, 40);
    this.drawDie(b, 4, -20, 40);
  }

  drawDie(n: number, dx: number, dy: number, dstSize: number) {
    const srcSize = this.diceImg.naturalHeight;
    this.ctx.drawImage(
      this.diceImg,
      (n - 1) * srcSize, 0,
      srcSize, srcSize,
      dx, dy,
      dstSize, dstSize,
    );
  }
}
