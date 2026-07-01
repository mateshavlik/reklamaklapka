/**
 * Image pipeline pro web Reklama Klapka.
 * - Hero maskotka -> responzivní WebP
 * - 55 fotek realizací -> WebP náhled (720px) + WebP full (1600px), auto-rotace dle EXIF
 * - Logo -> optimalizované PNG + WebP
 * - Favicony z SVG (červený zaoblený čtverec + bílé "K")
 * - OG image 1200x630
 * - Vygenerovaný HTML markup galerie (s width/height => nulový CLS) + manifest.json
 *
 * Spuštění:  npm run images
 */
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

sharp.cache(false);
sharp.concurrency(2);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'img');
const OUT = path.join(ROOT, 'assets');
const GALLERY_OUT = path.join(OUT, 'gallery');

// Pořadí + popisky dle zadání (filtry).
const CATEGORIES = [
  { dir: 'Auta',               slug: 'auta',           label: 'Auta',               alt: 'Polep vozidla' },
  { dir: 'Bannery',            slug: 'bannery',        label: 'Bannery',            alt: 'Reklamní banner' },
  { dir: 'Desky a fasády',     slug: 'desky-fasady',   label: 'Desky a fasády',     alt: 'Reklamní deska a malba na fasádě' },
  { dir: 'Světelná reklama',   slug: 'svetelna-reklama',label: 'Světelná reklama',  alt: 'Světelná reklama' },
  { dir: 'Polepy',             slug: 'polepy',         label: 'Polepy',             alt: 'Polep ploch a stěn' },
  { dir: 'Výlohy',             slug: 'vylohy',         label: 'Výlohy',             alt: 'Polep a grafika výlohy' },
  { dir: '3D nápisy',          slug: '3d-napisy',      label: '3D nápisy',          alt: '3D nápis a prostorové logo' },
  { dir: 'Infosystémy',        slug: 'infosystemy',    label: 'Informační systémy', alt: 'Informační a orientační systém' },
  { dir: 'Nástěnky do výroby', slug: 'nastenky',       label: 'Nástěnky',           alt: 'Firemní nástěnka' },
  { dir: 'Textil + papír',     slug: 'textil-papir',   label: 'Textil + papír',     alt: 'Potisk textilu a tiskovin' },
  { dir: 'Dárkoviny',          slug: 'darkoviny',      label: 'Dárkoviny',          alt: 'Reklamní předmět' },
];

async function ensureDir(d) { await fs.mkdir(d, { recursive: true }); }

async function processGallery() {
  await ensureDir(GALLERY_OUT);
  const items = [];
  for (const cat of CATEGORIES) {
    const srcDir = path.join(SRC, cat.dir);
    const outDir = path.join(GALLERY_OUT, cat.slug);
    await ensureDir(outDir);
    let files;
    try {
      files = (await fs.readdir(srcDir)).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
    } catch { console.warn('  ! chybí složka', cat.dir); continue; }

    let i = 0;
    for (const file of files) {
      i++;
      const base = `${i}`;
      const thumbName = `${base}-thumb.webp`;
      const fullName = `${base}-full.webp`;
      const input = sharp(path.join(srcDir, file)).rotate(); // auto-orient dle EXIF

      // full (lightbox)
      await input.clone()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(path.join(outDir, fullName));

      // thumb (galerie) + zjištění rozměrů pro nulový CLS
      const info = await input.clone()
        .resize({ width: 760, withoutEnlargement: true })
        .webp({ quality: 74, effort: 5 })
        .toFile(path.join(outDir, thumbName));

      items.push({
        cat: cat.slug,
        label: cat.label,
        thumb: `assets/gallery/${cat.slug}/${thumbName}`,
        full: `assets/gallery/${cat.slug}/${fullName}`,
        w: info.width,
        h: info.height,
        alt: `${cat.alt} — realizace Reklama Klapka, Česká Lípa`,
      });
      process.stdout.write(`  ✓ ${cat.slug}/${file} (${info.width}×${info.height})\n`);
    }
  }
  return items;
}

function galleryHtml(items) {
  return items.map((it, idx) => (
`        <figure class="gallery__item" data-cat="${it.cat}" data-index="${idx}">
          <button class="gallery__open" type="button" data-full="${it.full}" data-alt="${it.alt}" aria-label="Zvětšit fotografii: ${it.label}">
            <img src="${it.thumb}" width="${it.w}" height="${it.h}" loading="lazy" decoding="async" alt="${it.alt}">
            <span class="gallery__tag">${it.label}</span>
          </button>
        </figure>`
  )).join('\n');
}

async function processHero() {
  const heroDir = path.join(OUT, 'hero');
  await ensureDir(heroDir);
  const src = sharp(path.join(SRC, 'hero-pani.jpg')).rotate();
  await src.clone().resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(path.join(heroDir, 'hero-pani-1100.webp'));
  await src.clone().resize({ width: 760, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(heroDir, 'hero-pani-760.webp'));
  await src.clone().resize({ width: 1100, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(heroDir, 'hero-pani-1100.jpg'));
  console.log('  ✓ hero (1100/760 webp + jpg fallback)');
}

async function processLogo() {
  // Originál je červené logo na PLNÉM bílém pozadí -> vyklíčujeme bílou na průhlednost.
  // alpha = jak daleko od bílé; všechny zachované pixely přebarvíme na značkovou červenou (logo je jednobarevné).
  const input = sharp(path.join(SRC, 'logo reklama klapka.PNG'));
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  for (let i = 0; i < data.length; i += ch) {
    const a = 255 - Math.min(data[i], data[i + 1], data[i + 2]);
    data[i] = 228; data[i + 1] = 6; data[i + 2] = 21; data[i + 3] = a;
  }
  const keyed = sharp(data, { raw: { width: info.width, height: info.height, channels: ch } }).trim();
  await keyed.clone().resize({ width: 600, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo.png'));
  await keyed.clone().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 92, effort: 6, alphaQuality: 100 }).toFile(path.join(OUT, 'logo.webp'));
  console.log('  ✓ logo (průhledné pozadí, png + webp)');
}

const BRAND = '#E40615';
function faviconSvg(size = 256) {
  const r = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${BRAND}"/>
  <text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"
    font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="${Math.round(size*0.62)}" fill="#ffffff">K</text>
</svg>`;
}

async function processFavicons() {
  const svg = faviconSvg(256);
  await fs.writeFile(path.join(OUT, 'favicon.svg'), faviconSvg(64));
  const buf = Buffer.from(svg);
  const sizes = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'favicon-48.png': 48, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
  for (const [name, s] of Object.entries(sizes)) {
    await sharp(buf, { density: 384 }).resize(s, s).png().toFile(path.join(OUT, name));
  }
  console.log('  ✓ favicony (svg + png 16/32/48/180/192/512)');
}

async function processOg() {
  const W = 1200, H = 630;
  const hero = await sharp(path.join(SRC, 'hero-pani.jpg')).rotate()
    .resize({ height: 560, withoutEnlargement: true }).png().toBuffer();
  const logo = await sharp(path.join(SRC, 'logo reklama klapka.PNG')).trim()
    .resize({ width: 420 }).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const heroMeta = await sharp(hero).metadata();
  const base = sharp({ create: { width: W, height: H, channels: 4, background: '#ffffff' } });
  await base.composite([
    { input: hero, left: W - heroMeta.width - 30, top: H - heroMeta.height },
    { input: logo, left: 80, top: 150 },
    {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><text x="0" y="40" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#15141A">Výroba reklamy od roku 1991</text><text x="0" y="92" font-family="Arial, sans-serif" font-size="24" fill="#5b5563">Česká Lípa · polepy · bannery · 3D nápisy · tisk</text></svg>`),
      left: 84, top: logoMeta.height + 180,
    },
  ]).jpeg({ quality: 86 }).toFile(path.join(OUT, 'og-image.jpg'));
  console.log('  ✓ og-image 1200×630');
}

async function main() {
  console.log('▶ Optimalizace obrázků...');
  await ensureDir(OUT);
  await processLogo();
  await processHero();
  await processFavicons();
  await processOg();
  console.log('▶ Galerie realizací:');
  const items = await processGallery();

  await fs.writeFile(path.join(GALLERY_OUT, 'manifest.json'), JSON.stringify(items, null, 2));
  await fs.writeFile(path.join(ROOT, 'scripts', 'generated-gallery.html'), galleryHtml(items));
  console.log(`\n✅ Hotovo: ${items.length} fotek realizací zpracováno.`);
  console.log('   -> assets/gallery/<kategorie>/<n>-thumb.webp & -full.webp');
  console.log('   -> scripts/generated-gallery.html (vlož do index.html)');
}

main().catch(e => { console.error(e); process.exit(1); });
