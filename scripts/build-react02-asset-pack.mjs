import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const react02Root = join(root, "..", "react-02");
const uiRoot = join(
  react02Root,
  "public",
  "assets",
  "generated",
  "ui-20260614",
  "mahjong-room-componentized-v2"
);

const outputRoot = join(root, "img", "react02");
const sourceRoot = join(outputRoot, "source");
const generatedRoot = join(outputRoot, "generated");

mkdirSync(sourceRoot, { recursive: true });
mkdirSync(generatedRoot, { recursive: true });

const sourceAssets = [
  ["BG-ROOM-JIANGNAN-NIGHT.png", "room-bg-20x9.png"],
  ["TABLE-BASE-PERSPECTIVE.png", "table-perspective-source.png"],
  ["TILE-BACK-GREEN.png", "tile-back-green-source.png"],
  ["FX-DISCARD-MARKER.png", "fx-discard-marker-source.png"],
];

for (const [from, to] of sourceAssets) {
  const source = join(uiRoot, from);
  if (!existsSync(source)) {
    throw new Error(`Missing react-02 asset: ${source}`);
  }
  copyFileSync(source, join(sourceRoot, to));
}

const writeText = (filename, content) => {
  writeFileSync(join(generatedRoot, filename), content.trimStart(), "utf8");
};

const tableFeltSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="feltGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#0fa373"/>
      <stop offset="46%" stop-color="#087056"/>
      <stop offset="100%" stop-color="#03463b"/>
    </radialGradient>
    <pattern id="woven" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M0 8H18M8 0V18" stroke="#74c7a2" stroke-opacity=".06" stroke-width="1"/>
      <path d="M0 17H18M17 0V18" stroke="#001b18" stroke-opacity=".16" stroke-width="1"/>
    </pattern>
    <filter id="softNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="23" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.1"/>
      </feComponentTransfer>
    </filter>
    <linearGradient id="feltWood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#51270f"/>
      <stop offset="34%" stop-color="#9c541e"/>
      <stop offset="58%" stop-color="#45200e"/>
      <stop offset="100%" stop-color="#c98a38"/>
    </linearGradient>
    <linearGradient id="feltGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6d430d"/>
      <stop offset="20%" stop-color="#f8d879"/>
      <stop offset="50%" stop-color="#8a560f"/>
      <stop offset="80%" stop-color="#fff0a7"/>
      <stop offset="100%" stop-color="#6d430d"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#feltGlow)"/>
  <rect width="1024" height="1024" fill="url(#woven)"/>
  <path d="M78 82H946V942H78Z M150 156H874V868H150Z"
        fill="url(#feltWood)" fill-rule="evenodd" opacity=".95"/>
  <path d="M101 105H923V919H101Z M150 156H874V868H150Z"
        fill="none" stroke="url(#feltGold)" stroke-width="16" stroke-linejoin="round" opacity=".9"/>
  <path d="M150 156H874V868H150Z" fill="none" stroke="#261006" stroke-width="10" opacity=".78"/>
  <path d="M128 128H896M128 896H896M128 128V896M896 128V896"
        stroke="#ffdf7b" stroke-opacity=".24" stroke-width="8" stroke-linecap="round"/>
  <circle cx="512" cy="500" r="250" fill="none" stroke="#9ed7bd" stroke-width="12" stroke-opacity=".08"/>
  <circle cx="512" cy="500" r="178" fill="none" stroke="#042b25" stroke-width="6" stroke-opacity=".35"/>
  <path d="M214 246H810V778H214Z" fill="none" stroke="#d3b25b" stroke-opacity=".13" stroke-width="7"/>
  <path d="M247 279H777V745H247Z" fill="none" stroke="#9be3bd" stroke-opacity=".1" stroke-width="3"/>
  <path d="M512 220c78 92 144 143 248 168-99 31-166 82-248 177-84-96-151-147-248-177 103-24 170-76 248-168Z"
        fill="none" stroke="#d5be70" stroke-opacity=".08" stroke-width="10"/>
  <rect width="1024" height="1024" filter="url(#softNoise)" opacity=".45"/>
</svg>`;

const discardMarkerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff4a3" stop-opacity=".9"/>
      <stop offset="52%" stop-color="#f0b934" stop-opacity=".36"/>
      <stop offset="100%" stop-color="#f0b934" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="118" fill="url(#glow)"/>
  <circle cx="128" cy="128" r="76" fill="none" stroke="#ffe17a" stroke-width="10" stroke-opacity=".92"/>
  <circle cx="128" cy="128" r="96" fill="none" stroke="#c9861b" stroke-width="4" stroke-opacity=".56"/>
</svg>`;

const numerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const tileDefs = [
  ...numerals.map((n, i) => ({ kind: "wan", value: i + 1, main: n, sub: "萬" })),
  ...numerals.map((n, i) => ({ kind: "tong", value: i + 1, main: n, sub: "筒" })),
  ...numerals.map((n, i) => ({ kind: "tiao", value: i + 1, main: n, sub: "條" })),
  { kind: "wind", main: "東" },
  { kind: "wind", main: "南" },
  { kind: "wind", main: "西" },
  { kind: "wind", main: "北" },
  { kind: "dragon", main: "白" },
  { kind: "dragon", main: "發" },
  { kind: "dragon-red", main: "中" },
  { kind: "red", main: "伍", sub: "萬" },
];

const dots = (count, cx, cy, gap, radius) => {
  const patterns = {
    1: [[0, 0]],
    2: [[-0.55, -0.55], [0.55, 0.55]],
    3: [[-0.6, -0.6], [0, 0], [0.6, 0.6]],
    4: [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]],
    5: [[-0.62, -0.62], [0.62, -0.62], [0, 0], [-0.62, 0.62], [0.62, 0.62]],
    6: [[-0.62, -0.7], [0.62, -0.7], [-0.62, 0], [0.62, 0], [-0.62, 0.7], [0.62, 0.7]],
    7: [[-0.7, -0.7], [0, -0.7], [0.7, -0.7], [-0.48, 0], [0.48, 0], [-0.48, 0.7], [0.48, 0.7]],
    8: [[-0.7, -0.75], [0, -0.75], [0.7, -0.75], [-0.7, 0], [0.7, 0], [-0.7, 0.75], [0, 0.75], [0.7, 0.75]],
    9: [[-0.7, -0.72], [0, -0.72], [0.7, -0.72], [-0.7, 0], [0, 0], [0.7, 0], [-0.7, 0.72], [0, 0.72], [0.7, 0.72]],
  };

  return patterns[count]
    .map(([x, y], index) => {
      const color = index % 2 === 0 ? "#b9231f" : "#0b7a54";
      return `<circle cx="${cx + x * gap}" cy="${cy + y * gap}" r="${radius}" fill="none" stroke="${color}" stroke-width="3.4"/>
        <circle cx="${cx + x * gap}" cy="${cy + y * gap}" r="${radius * 0.45}" fill="${color}" opacity=".88"/>`;
    })
    .join("\n");
};

const bamboos = (count, cx, cy, gap) => {
  const patterns = {
    1: [[0, 0]],
    2: [[-0.38, 0], [0.38, 0]],
    3: [[-0.55, 0], [0, 0], [0.55, 0]],
    4: [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]],
    5: [[-0.55, -0.5], [0.55, -0.5], [0, 0], [-0.55, 0.5], [0.55, 0.5]],
    6: [[-0.58, -0.55], [0, -0.55], [0.58, -0.55], [-0.58, 0.55], [0, 0.55], [0.58, 0.55]],
    7: [[-0.58, -0.62], [0, -0.62], [0.58, -0.62], [-0.58, 0], [0.58, 0], [-0.35, 0.62], [0.35, 0.62]],
    8: [[-0.62, -0.65], [0, -0.65], [0.62, -0.65], [-0.62, 0], [0.62, 0], [-0.62, 0.65], [0, 0.65], [0.62, 0.65]],
    9: [[-0.62, -0.65], [0, -0.65], [0.62, -0.65], [-0.62, 0], [0, 0], [0.62, 0], [-0.62, 0.65], [0, 0.65], [0.62, 0.65]],
  };

  return patterns[count]
    .map(([x, y], index) => {
      const color = count === 1 || index % 4 === 0 ? "#b9231f" : "#12754b";
      const px = cx + x * gap;
      const py = cy + y * gap;
      return `<rect x="${px - 5}" y="${py - 17}" width="10" height="34" rx="4" fill="${color}"/>
        <path d="M${px - 7} ${py - 5}H${px + 7}M${px - 7} ${py + 6}H${px + 7}" stroke="#f3fff2" stroke-width="2" opacity=".65"/>`;
    })
    .join("\n");
};

const tileFace = (tile, index) => {
  const col = index % 8;
  const row = Math.floor(index / 8);
  const x = col * 64;
  const y = row * 80;
  const cx = x + 32;
  const red = tile.kind === "dragon-red" || tile.kind === "red";
  let marks = "";

  if (tile.kind === "tong") {
    marks = dots(tile.value, cx, y + 41, tile.value > 6 ? 18 : 22, tile.value > 6 ? 5.2 : 6.4);
  } else if (tile.kind === "tiao") {
    marks = bamboos(tile.value, cx, y + 41, tile.value > 6 ? 17 : 21);
  } else {
    marks = `
      <text x="${cx}" y="${y + 38}" text-anchor="middle" font-size="${tile.sub ? 29 : 40}" font-weight="800"
        fill="${red ? "#b9231f" : tile.kind === "dragon" ? "#0b7a54" : "#151815"}">${tile.main}</text>
      ${tile.sub ? `<text x="${cx}" y="${y + 64}" text-anchor="middle" font-size="20" font-weight="800" fill="#b9231f">${tile.sub}</text>` : ""}
    `;
  }

  return `
    <g>
      <rect x="${x + 4}" y="${y + 4}" width="56" height="70" rx="7" fill="#f8f5e8"/>
      <rect x="${x + 6}" y="${y + 6}" width="52" height="65" rx="6" fill="url(#faceGrad)"/>
      <path d="M${x + 9} ${y + 65}H${x + 55}V${y + 71}H${x + 9}Z" fill="#5ebd70" opacity=".5"/>
      ${marks}
    </g>`;
};

const tileAtlasSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffef6"/>
      <stop offset="66%" stop-color="#ece9dd"/>
      <stop offset="100%" stop-color="#d2d3ca"/>
    </linearGradient>
    <linearGradient id="backGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9cf279"/>
      <stop offset="45%" stop-color="#4bc65a"/>
      <stop offset="100%" stop-color="#238b42"/>
    </linearGradient>
    <linearGradient id="sideGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff8e5"/>
      <stop offset="62%" stop-color="#d8d1bd"/>
      <stop offset="100%" stop-color="#58ad5f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#23884e"/>
  <rect y="320" width="512" height="96" fill="url(#backGrad)"/>
  <rect y="416" width="512" height="96" fill="url(#sideGrad)"/>
  <g font-family="Microsoft YaHei, SimHei, Noto Sans CJK SC, serif" dominant-baseline="middle">
    ${tileDefs.map(tileFace).join("\n")}
  </g>
  <g opacity=".26">
    <path d="M0 320H512M0 400H512M0 416H512" stroke="#043021" stroke-width="3"/>
    <path d="M0 472H512" stroke="#ffffff" stroke-width="3"/>
  </g>
</svg>`;

writeText("table-felt.svg", tableFeltSvg);
writeText("tile-labels-react02.svg", tileAtlasSvg);
writeText("fx-discard-marker.svg", discardMarkerSvg);

console.log(`React-02 asset pack generated at ${outputRoot}`);
