import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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
const tileAssetRoot = join(
  react02Root,
  "public",
  "assets",
  "design-trim",
  "游戏组件",
  "麻将牌"
);
const tileFaceSourceRoot = join(sourceRoot, "tile-faces");

mkdirSync(sourceRoot, { recursive: true });
mkdirSync(generatedRoot, { recursive: true });
mkdirSync(tileFaceSourceRoot, { recursive: true });

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
  console.log(`copied ${from} -> img/react02/source/${to}`);
}

const writeText = (filename, content) => {
  writeFileSync(join(generatedRoot, filename), content.trimStart(), "utf8");
  console.log(`generated img/react02/generated/${filename}`);
};

const copyTileAsset = filename => {
  const source = join(tileAssetRoot, filename);
  if (!existsSync(source)) {
    throw new Error(`Missing react-02 tile asset: ${source}`);
  }

  copyFileSync(source, join(tileFaceSourceRoot, filename));
  return source;
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

const numberedTileAssets = suit =>
  Array.from({ length: 9 }, (_, index) => ({
    asset: `mahjong_${suit}_${String(index + 1).padStart(2, "0")}${suit === "tong" && index + 1 >= 6 && index + 1 !== 7 ? ".webp" : suit === "tiao" && index + 1 === 9 ? ".webp" : ".png"}`,
  }));

const tileDefs = [
  ...numberedTileAssets("wan"),
  ...numberedTileAssets("tong"),
  ...numberedTileAssets("tiao"),
  { asset: "mahjong_wind_east.png" },
  { asset: "mahjong_wind_south.png" },
  { asset: "mahjong_wind_west.png" },
  { asset: "mahjong_wind_north.png" },
  { asset: "mahjong_dragon_bai.png" },
  { asset: "mahjong_dragon_fa.png" },
  { asset: "mahjong_dragon_zhong.png" },
  { asset: "mahjong_wan_05.png" },
  { asset: "mahjong_tong_05.png" },
  { asset: "mahjong_tiao_05.png" },
];

const tileBackAsset = "mahjong_back_green_wave.webp";

const tileAtlasBaseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
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
  <g opacity=".26">
    <path d="M0 320H512M0 400H512M0 416H512" stroke="#043021" stroke-width="3"/>
    <path d="M0 472H512" stroke="#ffffff" stroke-width="3"/>
  </g>
</svg>`;

const renderTileImage = async filename =>
  sharp(copyTileAsset(filename))
    .resize({
      width: 56,
      height: 76,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

const renderBackImage = async filename =>
  sharp(copyTileAsset(filename))
    .resize({
      width: 192,
      height: 96,
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();

const shadowSvg = (cx, cy) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
    <ellipse cx="${cx}" cy="${cy}" rx="24" ry="5" fill="#002b20" opacity=".18"/>
  </svg>`
);

const generateTileAtlas = async () => {
  const composites = [{ input: Buffer.from(tileAtlasBaseSvg), left: 0, top: 0 }];

  for (let index = 0; index < tileDefs.length; index++) {
    const col = index % 8;
    const row = Math.floor(index / 8);
    const x = col * 64;
    const y = row * 80;
    composites.push({ input: shadowSvg(32, 72), left: x, top: y });
    composites.push({ input: await renderTileImage(tileDefs[index].asset), left: x + 4, top: y + 2 });
  }

  composites.push({ input: await renderBackImage(tileBackAsset), left: 320, top: 320 });

  const output = join(generatedRoot, "tile-labels-react02.png");
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);

  console.log("generated img/react02/generated/tile-labels-react02.png");
};

writeText("table-felt.svg", tableFeltSvg);
await generateTileAtlas();
writeText("fx-discard-marker.svg", discardMarkerSvg);

console.log(`React-02 asset pack generated at ${outputRoot}`);
