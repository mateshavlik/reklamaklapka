# Reklama Klapka — webová prezentace

Moderní jednostránkový web reklamní agentury **REKLAMA KLAPKA s.r.o.** (Česká Lípa, založeno 1991).
Statický web bez frameworků — čisté HTML, CSS a vanilla JavaScript. Připraveno k nasazení.

## Struktura

```
index.html            – celá stránka (všechny sekce + SEO + JSON-LD)
css/styles.css        – design systém a responzivní layout
js/main.js            – navigace, scroll-spy, počítadla, parallax, filtr galerie, lightbox, formulář
assets/
  fonts/              – self-hosted fonty (Outfit + Inter, GDPR-friendly)
  gallery/<kat>/      – optimalizované WebP fotky realizací (náhled + full)
  hero/               – cutout maskotky bez pozadí (hero-cutout.webp + .png fallback)
  logo.png / .webp    – logo
  favicon*, icon-*    – ikony
  og-image.jpg        – náhled pro sdílení na sociálních sítích
robots.txt, sitemap.xml, site.webmanifest
img/                  – ZDROJOVÉ fotky (nepotřebné na produkci, slouží jen pro re-generaci)
scripts/              – build skript na obrázky (nepotřebné na produkci)
```

## Co nasadit na hosting

Stačí nahrát tyto soubory/složky:
`index.html`, `css/`, `js/`, `assets/`, `robots.txt`, `sitemap.xml`, `site.webmanifest`

**Nemusíte** nahrávat: `img/`, `scripts/`, `node_modules/`, `package*.json`, `README.md`.

## Lokální spuštění

```bash
python -m http.server 5050
# otevřete http://localhost:5050
```
(Web je nutné servírovat přes HTTP server, ne otevírat přímo přes file:// — kvůli fontům.)

## Re-generace obrázků (volitelné)

Pokud přidáte/změníte fotky ve složce `img/`, znovu vygenerujte optimalizované verze:

```bash
npm install        # jen poprvé
npm run images
```
Skript vytvoří WebP náhledy i full verze, favicony, OG image a `scripts/generated-gallery.html`,
jehož obsah vložte do `index.html` na místo galerie.

Cutout maskotky (odstranění bílého pozadí) se generuje zvlášť:

```bash
npm run cutout    # -> assets/hero/hero-cutout.webp + .png
```

## ⚠️ Před spuštěním upravte

1. **Loga referencí v hero** — v hero sekci jsou za maskotkou loga firem (Alstom, Festool,
   Prominent, Modus, Nemocnice Česká Lípa, Ježek SW, město Česká Lípa). Zatím jsou to
   **textové placeholdery** (`.hero__logos` v `index.html`). Nahraďte je reálnými logy
   (ideálně průhledné SVG/PNG do `assets/reference/`) — `<span class="rlogo">` přepište na `<img>`.
2. **Kontaktní formulář** — je připravený na backend, zatím jen simuluje odeslání.
   V `js/main.js` (sekce „PŘIPRAVENO NA BACKEND") napojte odeslání na váš endpoint
   nebo zapněte Netlify Forms (`data-netlify="true"` na `<form>`).
3. **Doména** — v `index.html` (canonical, OG, JSON-LD) a v `sitemap.xml`/`robots.txt`
   je použita `https://www.reklamaklapka.cz/`. Pokud nasadíte jinam, upravte URL.

> Recenze v sekci „Recenze" jsou **reálné Google recenze** zákazníků (pohyblivý pás).

## SEO & výkon

- Title, meta description, Open Graph, Twitter Cards, Schema.org `LocalBusiness` (JSON-LD).
- Optimalizované WebP obrázky, lazy loading, předdefinované rozměry (nulový CLS).
- Self-hosted fonty s `font-display: swap`, preload kritických zdrojů.
- Respektuje `prefers-reduced-motion`.
