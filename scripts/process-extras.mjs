/**
 * Zpracování dodaných materiálů:
 *  - fotky budovy (O nás)  -> assets/about/*.webp
 *  - loga referencí        -> assets/reference/*.webp  (vyklíčování bílého pozadí, zachování barev)
 */
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'img');
const OUT = path.join(ROOT, 'assets');

async function ensure(d){ await fs.mkdir(d, { recursive: true }); }

async function buildings(){
  const dir = path.join(OUT, 'about');
  await ensure(dir);
  await sharp(path.join(SRC,'budova-1.jpeg')).rotate().resize({width:900,withoutEnlargement:true}).webp({quality:82,effort:5}).toFile(path.join(dir,'budova-1.webp'));
  await sharp(path.join(SRC,'budova-2.jpeg')).rotate().resize({width:1000,withoutEnlargement:true}).webp({quality:82,effort:5}).toFile(path.join(dir,'budova-2.webp'));
  console.log('  ✓ budovy (about/budova-1.webp, budova-2.webp)');
}

// Vyklíčování bílého pozadí: alpha podle "bělosti" (min kanálu), barvy zůstanou.
function keyWhite(data, info, LO=224, HI=249){ // <LO = plně viditelné, >HI = průhledné, mezi = plynulý přechod
  const ch = info.channels;
  for (let i=0;i<data.length;i+=ch){
    const w = Math.min(data[i], data[i+1], data[i+2]);
    let a = 255;
    if (w >= HI) a = 0;
    else if (w > LO) a = Math.round(255 * (HI - w) / (HI - LO));
    const cur = ch === 4 ? data[i+3] : 255;
    if (ch === 4) data[i+3] = Math.min(cur, a);
  }
}

async function logo(file, slug, outW=420, lo=224, hi=249){
  const input = sharp(path.join(SRC, file)).ensureAlpha();
  const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
  keyWhite(data, info, lo, hi);
  // přesný ořez podle alpha (bounding box neprůhledných pixelů)
  const { width:w, height:h, channels:ch } = info;
  let minX=w, minY=h, maxX=0, maxY=0;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    if (data[(y*w+x)*ch+3] > 16){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  }
  const cw = Math.max(1, maxX-minX+1), chh = Math.max(1, maxY-minY+1);
  const out = path.join(OUT,'reference',`${slug}.webp`);
  const r = await sharp(data, { raw: { width:w, height:h, channels:ch } })
    .extract({ left:minX, top:minY, width:cw, height:chh })
    .resize({ width: outW, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6, alphaQuality: 100 }).toFile(out);
  console.log(`  ✓ ${slug}.webp (${r.width}×${r.height})`);
  return { slug, w: r.width, h: r.height };
}

async function main(){
  console.log('▶ Fotky budovy:');
  await buildings();
  console.log('▶ Loga referencí (vyklíčování bílé):');
  await ensure(path.join(OUT,'reference'));
  const logos = [
    ['logo-alstom.png','alstom', 200, 234],   // světle šedé pozadí -> agresivnější práh
    ['logo-festool.png','festool'],
    ['logo-ceskalipa.png','ceskalipa'],
    ['logo-prominent.png','prominent'],
    ['logo-modus.png','modus'],
    ['logo nemocnice.png','nemocnice'],
    ['logo-ježeksw.png','jezeksw'],
  ];
  const res = [];
  for (const [f,s,lo,hi] of logos) res.push(await logo(f,s,420,lo,hi));
  console.log('\nRozměry log (pro CSS):');
  res.forEach(r=>console.log(`  ${r.slug}: ${r.w}×${r.h}  (poměr ${(r.w/r.h).toFixed(2)})`));
}
main().catch(e=>{console.error(e);process.exit(1);});
