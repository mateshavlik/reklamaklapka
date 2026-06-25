/**
 * Odstranění bílého pozadí hero fotky (maskotka) -> průhledný cutout.
 * Metoda: flood-fill od okrajů přes "skoro bílé" pixely (zachová světlé tóny
 * uvnitř postavy, které nejsou spojité s pozadím) + jemné prolnutí hrany.
 *
 * Výstup: assets/hero/hero-cutout.webp (alpha) + hero-cutout.png (fallback)
 */
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'img', 'hero-pani.jpg');
const OUTDIR = path.join(ROOT, 'assets', 'hero');

// Práh "skoro bílé": vysoký jas + nízká sytost
const TH = 234;        // min. hodnota kanálu, aby byl pixel kandidát pozadí
const SAT = 22;        // max. rozdíl mezi kanály (nízká sytost = neutrální)

function isBgCandidate(r, g, b) {
  if (r < TH || g < TH || b < TH) return false;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return (max - min) <= SAT;
}

async function run() {
  const img = sharp(SRC).rotate();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const idx = (x, y) => (y * w + x) * ch;

  // 1) flood-fill od všech okrajových pixelů
  const bg = new Uint8Array(w * h); // 1 = pozadí
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (bg[p]) return;
    const i = idx(x, y);
    if (isBgCandidate(data[i], data[i + 1], data[i + 2])) { bg[p] = 1; stack.push(x, y); }
  };
  for (let x = 0; x < w; x++) { pushIf(x, 0); pushIf(x, h - 1); }
  for (let y = 0; y < h; y++) { pushIf(0, y); pushIf(w - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
  }

  // 2) alpha = 255 (popředí) / 0 (pozadí)
  const alpha = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) alpha[p] = bg[p] ? 0 : 255;

  // 3) eroze popředí o 1 px (odřízne bílý lem kolem vlasů)
  const eroded = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (alpha[p] === 0) { eroded[p] = 0; continue; }
    let minN = 255;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      minN = Math.min(minN, alpha[ny * w + nx]);
    }
    eroded[p] = minN;
  }

  // 4) jemné prolnutí hrany (3x3 box blur na alpha)
  const out = Buffer.from(data);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      sum += eroded[ny * w + nx]; n++;
    }
    out[idx(x, y) + 3] = Math.round(sum / n);
  }

  const base = sharp(out, { raw: { width: w, height: h, channels: ch } });
  // trim průhledných okrajů a zmenšení na rozumnou velikost
  const trimmed = base.trim({ threshold: 1 });
  const meta = await trimmed.clone().png().toBuffer({ resolveWithObject: true });

  await fs.mkdir(OUTDIR, { recursive: true });
  const finalPng = await sharp(meta.data)
    .resize({ width: 1000, withoutEnlargement: true })
    .png({ compressionLevel: 9 });
  const pngInfo = await finalPng.clone().toFile(path.join(OUTDIR, 'hero-cutout.png'));
  await finalPng.clone().webp({ quality: 86, effort: 6, alphaQuality: 100 }).toFile(path.join(OUTDIR, 'hero-cutout.webp'));

  // počet odstraněných pixelů (kontrola)
  let bgCount = 0; for (let p = 0; p < w * h; p++) bgCount += bg[p];
  console.log(`Zdroj: ${w}×${h}, odstraněno pozadí: ${(100 * bgCount / (w * h)).toFixed(1)} %`);
  console.log(`Cutout: ${pngInfo.width}×${pngInfo.height} -> assets/hero/hero-cutout.{webp,png}`);
}
run().catch(e => { console.error(e); process.exit(1); });
