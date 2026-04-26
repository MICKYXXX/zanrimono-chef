/**
 * アプリアイコン・スプラッシュ画面 PNG 生成スクリプト
 * 実行: node scripts/generate-assets.mjs
 */

import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/images');

// ─── SVG 定義 ────────────────────────────────────────────────────────────────

/** フライパン＋湯気 SVG（1024×1024、背景グリーン） */
function iconSvg(size) {
  const s = size;
  const cx = s / 2;   // 512
  const cy = s / 2;   // 512

  // フライパンのスケール基準（1024px 基準で設計）
  const sc = s / 1024;

  // ── フライパン本体 ──
  // 丸いパン部分（楕円）
  const panRx = 220 * sc;
  const panRy = 180 * sc;
  const panCy = cy + 20 * sc;

  // 柄
  const handleW = 40 * sc;
  const handleH = 200 * sc;
  const handleX = cx + panRx - 4 * sc;
  const handleY = panCy - handleW / 2;

  // 柄の丸め
  const hr = handleW / 2;

  // 湯気 3 本（パン中央上部から）
  // 各湯気は上方向に S 字カーブ
  const steamY1 = panCy - panRy - 10 * sc;  // 湯気の開始 Y
  const steamH = 160 * sc;                   // 湯気の高さ
  const sw = 18 * sc;                         // 線の太さ
  const amp = 40 * sc;                        // 振れ幅

  // 湯気 X 座標（左・中・右）
  const steamXs = [cx - 100 * sc, cx, cx + 100 * sc];

  const steamPaths = steamXs.map((sx) => {
    const x0 = sx;
    const y0 = steamY1;
    const x1 = sx + amp;
    const y1 = steamY1 - steamH * 0.33;
    const x2 = sx - amp;
    const y2 = steamY1 - steamH * 0.66;
    const x3 = sx;
    const y3 = steamY1 - steamH;
    return `<path d="M${x0},${y0} C${x1},${y1} ${x2},${y2} ${x3},${y3}"
      fill="none" stroke="white" stroke-width="${sw}"
      stroke-linecap="round"/>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <!-- 背景 -->
  <rect width="${s}" height="${s}" fill="#1E6B45"/>

  <!-- フライパン：柄 -->
  <rect x="${handleX}" y="${handleY}"
    width="${handleH}" height="${handleW}"
    rx="${hr}" ry="${hr}"
    fill="white"/>

  <!-- フライパン：本体（楕円） -->
  <ellipse cx="${cx}" cy="${panCy}" rx="${panRx}" ry="${panRy}" fill="white"/>

  <!-- フライパン：リム（内側を少し削ってリング状に見せる） -->
  <ellipse cx="${cx}" cy="${panCy}"
    rx="${panRx - 22 * sc}" ry="${panRy - 22 * sc}"
    fill="#1E6B45"/>

  <!-- 湯気 -->
  ${steamPaths}
</svg>`;
}

/** スプラッシュ用 SVG（1024×1024、グリーン背景＋アイコン＋テキスト） */
function splashSvg(size) {
  const s = size;
  const cx = s / 2;
  const sc = s / 1024;

  // フライパンを少し小さめ・上寄せに配置
  const panScale = 0.55;
  const panCy = cx - 60 * sc;

  const panRx = 220 * sc * panScale;
  const panRy = 180 * sc * panScale;

  const handleW = 40 * sc * panScale;
  const handleH = 200 * sc * panScale;
  const handleX = cx + panRx - 4 * sc * panScale;
  const handleY = panCy - handleW / 2;
  const hr = handleW / 2;

  const steamY1 = panCy - panRy - 10 * sc * panScale;
  const steamH = 160 * sc * panScale;
  const sw = 18 * sc * panScale;
  const amp = 40 * sc * panScale;
  const steamXs = [cx - 100 * sc * panScale, cx, cx + 100 * sc * panScale];

  const steamPaths = steamXs.map((sx) => {
    const x0 = sx;
    const y0 = steamY1;
    const x1 = sx + amp;
    const y1 = steamY1 - steamH * 0.33;
    const x2 = sx - amp;
    const y2 = steamY1 - steamH * 0.66;
    const x3 = sx;
    const y3 = steamY1 - steamH;
    return `<path d="M${x0},${y0} C${x1},${y1} ${x2},${y2} ${x3},${y3}"
      fill="none" stroke="white" stroke-width="${sw}"
      stroke-linecap="round"/>`;
  }).join('\n    ');

  // テキスト
  const textY = panCy + panRy + 90 * sc;
  const fontSize = 72 * sc;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <!-- 背景 -->
  <rect width="${s}" height="${s}" fill="#1E6B45"/>

  <!-- フライパン：柄 -->
  <rect x="${handleX}" y="${handleY}"
    width="${handleH}" height="${handleW}"
    rx="${hr}" ry="${hr}"
    fill="white"/>

  <!-- フライパン：本体 -->
  <ellipse cx="${cx}" cy="${panCy}" rx="${panRx}" ry="${panRy}" fill="white"/>

  <!-- フライパン：リム -->
  <ellipse cx="${cx}" cy="${panCy}"
    rx="${panRx - 22 * sc * panScale}" ry="${panRy - 22 * sc * panScale}"
    fill="#1E6B45"/>

  <!-- 湯気 -->
  ${steamPaths}

  <!-- テキスト -->
  <text x="${cx}" y="${textY}"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle">残りものシェフ</text>
</svg>`;
}

// ─── PNG 生成 ────────────────────────────────────────────────────────────────

async function generate() {
  const SIZE = 1024;

  console.log('Generating icon.png …');
  await sharp(Buffer.from(iconSvg(SIZE)))
    .png()
    .toFile(resolve(OUT, 'icon.png'));
  console.log('  ✓ assets/images/icon.png');

  console.log('Generating splash-icon.png …');
  await sharp(Buffer.from(splashSvg(SIZE)))
    .png()
    .toFile(resolve(OUT, 'splash-icon.png'));
  console.log('  ✓ assets/images/splash-icon.png');

  console.log('\nDone!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
