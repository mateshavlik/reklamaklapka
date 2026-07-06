/* =========================================================
   REKLAMA KLAPKA — interakce (vanilla JS, bez závislostí)
   ========================================================= */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Rok v patičce ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header stav + tlačítko nahoru ---------- */
  const header = document.getElementById('header');
  const toTop = document.getElementById('toTop');
  function onScroll() {
    const y = window.scrollY;
    if (header) header.dataset.state = y > 12 ? 'scrolled' : 'top';
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobilní menu ---------- */
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Otevřít menu');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', open);  // zámek scrollu + ztmavení pozadí
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    });
    $$('.nav__link', nav).forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
    document.addEventListener('click', e => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const ro = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => ro.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Scroll-spy (aktivní odkaz) ---------- */
  const navLinks = $$('.nav__link');
  const linkById = {};
  navLinks.forEach(l => {
    const id = (l.getAttribute('href') || '').replace('#', '');
    if (id) linkById[id] = l;
  });
  const spied = $$('main section[id], #top');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        navLinks.forEach(l => l.classList.remove('is-active'));
        if (linkById[id]) linkById[id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spied.forEach(s => so.observe(s));
  }

  /* ---------- Count-up statistiky ---------- */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const plain = el.hasAttribute('data-plain'); // rok bez oddělovače tisíců
    const fmt = v => (plain ? String(v) : v.toLocaleString('cs-CZ')) + suffix;
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const dur = 1600, start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const counters = $$('.stat__num[data-count]');
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(c => co.observe(c));
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Jemný parallax v hero ---------- */
  const scene = $('[data-parallax-scene]');
  const layers = $$('[data-parallax]');
  if (scene && layers.length && !reduceMotion && window.matchMedia('(min-width: 921px)').matches) {
    let ticking = false;
    function parallax() {
      const rect = scene.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      layers.forEach(l => {
        const speed = parseFloat(l.dataset.parallax) || 0;
        // jen --py: CSS si zachová rotaci přes rotate(var(--rot))
        l.style.setProperty('--py', `${(center * speed) / 100}px`);
      });
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
    parallax();
  }

  /* ---------- Karty služeb -> filtr v galerii ---------- */
  function applyFilter(cat) {
    const btn = $(`.filter[data-filter="${cat}"]`);
    if (btn) btn.click();
  }
  $$('.service-card[data-filter]').forEach(card => {
    const go = () => {
      const cat = card.dataset.filter;
      const target = document.getElementById('realizace');
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      applyFilter(cat);
    };
    card.addEventListener('click', e => { if (e.target.closest('a')) return; go(); }); // odkaz (katalog) nechá projít
    card.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) { e.preventDefault(); go(); }
    });
  });

  /* ---------- Filtrování galerie ---------- */
  const filters = $$('.filter');
  const items = $$('.gallery__item');
  const emptyMsg = $('.gallery__empty');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      filters.forEach(f => { f.classList.remove('is-active'); f.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
      let visible = 0;
      items.forEach((it, i) => {
        const show = cat === 'vse' || it.dataset.cat === cat;
        it.classList.toggle('is-hidden', !show);
        if (show) { it.style.animationDelay = (Math.min(visible, 12) * 0.03) + 's'; visible++; }
      });
      if (emptyMsg) emptyMsg.hidden = visible !== 0;
    });
  });

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbCounter = document.getElementById('lbCounter');
  let gallerySet = [], current = 0, lastFocus = null;

  function visibleItems() {
    return items.filter(it => !it.classList.contains('is-hidden'));
  }
  function show(i) {
    if (!gallerySet.length) return;
    current = (i + gallerySet.length) % gallerySet.length;
    const data = gallerySet[current];
    lbImg.src = data.full;
    lbImg.alt = data.alt;
    lbCaption.textContent = data.alt;
    lbCounter.textContent = `${current + 1} / ${gallerySet.length}`;
  }
  function openLightbox(itemEl) {
    gallerySet = visibleItems().map(it => {
      const btn = $('.gallery__open', it);
      return { full: btn.dataset.full, alt: btn.dataset.alt || '' };
    });
    const idx = visibleItems().indexOf(itemEl);
    lastFocus = document.activeElement;
    show(idx < 0 ? 0 : idx);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('lbClose').focus();
  }
  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.src = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('.gallery__open').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(btn.closest('.gallery__item')));
  });
  if (lb) {
    document.getElementById('lbClose').addEventListener('click', closeLightbox);
    document.getElementById('lbNext').addEventListener('click', () => show(current + 1));
    document.getElementById('lbPrev').addEventListener('click', () => show(current - 1));
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'ArrowLeft') show(current - 1);
    });
    // Swipe na mobilu
    let sx = 0;
    lb.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---------- Marquee recenzí (plynulá smyčka zprava doleva) ---------- */
  const mqTrack = $('#reviewsMarquee .marquee__track');
  if (mqTrack && !reduceMotion) {
    const half = mqTrack.children.length;            // počet originálních karet
    mqTrack.insertAdjacentHTML('beforeend', mqTrack.innerHTML); // 2. kopie -> bezešvý loop na -50%
    Array.from(mqTrack.children).slice(half).forEach(c => c.setAttribute('aria-hidden', 'true'));
    mqTrack.style.animationDuration = Math.max(45, half * 4.5) + 's';
  }

  /* ---------- Kontaktní formulář (validace + odeslání) ---------- */
  const form = document.getElementById('contactForm');
  if (form) {
    const status = document.getElementById('formStatus');

    /* Předvyplnění z „Mám zájem" na Volných plochách (?plocha=…&adresa=…&rozmery=…) */
    try {
      const params = new URLSearchParams(location.search);
      const plocha = params.get('plocha');
      if (plocha) {
        const msg = form.elements['message'];
        if (msg && !msg.value.trim()) {
          const adresa = params.get('adresa');
          const rozmery = params.get('rozmery');
          msg.value = 'Dobrý den,\n\nmám zájem o reklamní plochu „' + plocha + '"'
            + (adresa ? ' (' + adresa + ')' : '')
            + (rozmery ? ', rozměry ' + rozmery : '')
            + '.\n\nProsím o více informací a cenovou nabídku.';
        }
        // Plynulé odscrolování k formuláři (i když je v URL #kontakt)
        setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
      }
    } catch (e) { /* URLSearchParams nepodporováno — ignorovat */ }

    const setError = (field, msg) => {
      const wrap = field.closest('.form__field');
      const err = $('.form__error', wrap);
      wrap.classList.toggle('is-invalid', !!msg);
      if (err) err.textContent = msg || '';
      return !msg;
    };
    const validators = {
      name: v => v.trim().length >= 2 ? '' : 'Zadejte prosím své jméno.',
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Zadejte platný e‑mail.',
      phone: v => v.trim() === '' || /^[0-9 +]{6,}$/.test(v.trim()) ? '' : 'Zadejte platné telefonní číslo.',
      message: v => v.trim().length >= 10 ? '' : 'Napište nám prosím alespoň pár vět.'
    };
    function validateField(field) {
      const fn = validators[field.name];
      return fn ? setError(field, fn(field.value)) : true;
    }
    form.querySelectorAll('input,textarea').forEach(f => {
      f.addEventListener('blur', () => { if (f.name in validators) validateField(f); });
      f.addEventListener('input', () => {
        if (f.closest('.form__field') && f.closest('.form__field').classList.contains('is-invalid')) validateField(f);
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      // Honeypot
      if (form.website && form.website.value) return;
      let ok = true;
      ['name', 'email', 'phone', 'message'].forEach(n => {
        const f = form.elements[n];
        if (f && !validateField(f)) ok = false;
      });
      if (!ok) {
        status.textContent = 'Zkontrolujte prosím zvýrazněná pole.';
        status.className = 'form__status is-err';
        const firstBad = form.querySelector('.is-invalid input, .is-invalid textarea');
        if (firstBad) firstBad.focus();
        return;
      }
      /* === Odeslání přes Web3Forms (bez backendu) === */
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Odesílám…';
      status.className = 'form__status';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            form.reset();
            status.textContent = 'Děkujeme! Vaši poptávku jsme přijali, brzy se vám ozveme.';
            status.className = 'form__status is-ok';
          } else {
            status.textContent = 'Odeslání se nezdařilo (' + (data.message || 'zkuste to prosím znovu') + '). Případně nám zavolejte.';
            status.className = 'form__status is-err';
          }
        })
        .catch(() => {
          status.textContent = 'Odeslání se nezdařilo — zkontrolujte připojení, nebo nám prosím zavolejte.';
          status.className = 'form__status is-err';
        })
        .finally(() => { btn.disabled = false; });
    });
  }

  /* ---------- Souhlas s cookies + načtení Google mapy ---------- */
  const COOKIE_KEY = 'rk-cookie';
  const bar = document.getElementById('cookieBar');
  const mapWrap = document.getElementById('mapWrap');
  const mapFrame = mapWrap ? mapWrap.querySelector('iframe[data-src]') : null;
  const readConsent = () => { try { return localStorage.getItem(COOKIE_KEY); } catch (e) { return null; } };
  function loadMap() {
    if (mapFrame && !mapFrame.src) mapFrame.src = mapFrame.dataset.src;
    if (mapWrap) mapWrap.classList.add('is-loaded');
  }
  function setConsent(value) {
    try { localStorage.setItem(COOKIE_KEY, value); } catch (e) {}
    if (bar) bar.hidden = true;
    if (value === 'accepted') loadMap();
  }
  const savedConsent = readConsent();
  if (savedConsent === 'accepted') loadMap();
  else if (savedConsent !== 'rejected' && bar) bar.hidden = false;

  const accept = document.getElementById('cookieAccept');
  const reject = document.getElementById('cookieReject');
  const mapLoadBtn = document.getElementById('mapLoadBtn');
  if (accept) accept.addEventListener('click', () => setConsent('accepted'));
  if (reject) reject.addEventListener('click', () => setConsent('rejected'));
  // „Zobrazit mapu" v placeholderu = souhlas s načtením Google mapy
  if (mapLoadBtn) mapLoadBtn.addEventListener('click', () => setConsent('accepted'));

  /* ---------- Hero: hustý barevný scatter plovoucích glyfů ----------
     Rozmístění řeší JS (vyhne se textu, CTA i modelce), pohyb dělá CSS. */
  (function heroGlyphs() {
    const layer = document.querySelector('.hero__glyphs');
    const hero = document.querySelector('.hero');
    if (!layer || !hero) return;

    const CHARS = ['R', 'K', 'A', 'a', 'k', 'r', '2', '5', '8', '+', '3', '!'];
    // barevná paleta – echo písmen na tváři modelky
    const COLORS = ['#E40615', '#2b3a8f', '#1f9d61', '#e8a11c', '#8a2be2', '#e6357a', '#12a5b0', '#f2662d'];
    const ANIMS = ['glyDriftA', 'glyDriftB', 'glyDriftC', 'glyDriftD', 'glyDriftE', 'glyDriftF'];
    // pevné počty na vodorovné zóny (stabilní poměr při každém načtení):
    // levá 65 % tlačená spíš dolů, střed doplněný z pravé strany, pravá plnější
    const ZONES = [
      { n: 22, min: -2.5, max: 46, lowFrac: 0.65 },       // levá – 65 % spíš níž
      { n: 11, min: 42, max: 64, yMin: 0, yMax: 60 },     // střed mezi nadpisem a hlavou – víc glyfů, spíš horní část
      { n: 14, min: 47, max: 80 },                        // střed-pravá (část za modelkou)
      { n: 21, min: 80, max: 99 },                        // daleko vpravo
      // POZOR: nové zóny přidávej na KONEC – stávající rozmístění (seed) tím zůstane stejné
      { n: 7, min: -2.5, max: 44, yMin: 0, yMax: 42 },    // levá horní část – přidané glyfy
    ];

    // deterministický generátor (mulberry32) → stejné rozmístění při každém načtení;
    // mění se jen pohyb (CSS animace). Seed se resetuje na začátku build().
    const SEED = 20260706;
    let s = SEED;
    const rand = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rnd = (a, b) => a + rand() * (b - a);
    const pick = (arr) => arr[(rand() * arr.length) | 0];

    function makeGlyph(z, scale, blurMul) {
      // POZOR: pořadí volání rand() nesmět měnit (jinak se změní desktopové rozmístění).
      const size = rnd(24, 122) * scale;                   // menší glyfy na menších displejích
      const g = document.createElement('span');
      g.className = 'gly';
      g.textContent = pick(CHARS);
      g.style.left = rnd(z.min, z.max).toFixed(2) + '%';   // lehký přesah přes okraje = přirozenější
      // svislé umístění: volitelný rozsah zóny, nebo tlačit spíš dolů (lowFrac)
      const yMin = z.yMin != null ? z.yMin : -3;
      const yMax = z.yMax != null ? z.yMax : 95;
      const top = (z.lowFrac && rand() < z.lowFrac) ? rnd(45, 95) : rnd(yMin, yMax);
      g.style.top = top.toFixed(2) + '%';
      g.style.fontSize = Math.round(size) + 'px';
      g.style.setProperty('--r', rnd(-26, 26).toFixed(1) + 'deg');
      g.style.color = pick(COLORS);
      g.style.opacity = rnd(0.10, 0.24).toFixed(2);      // za textem/modelkou raději jemnější
      g.style.filter = 'blur(' + (rnd(0.3, 1.5) * blurMul).toFixed(1) + 'px)';  // na mobilu tlumenější (výkon)
      if (!reduceMotion) {
        g.style.animationName = pick(ANIMS);
        g.style.animationDuration = Math.round(rnd(7, 18)) + 's';
        g.style.animationDelay = '-' + Math.round(rnd(0, 30)) + 's';
      }
      return g;
    }

    function build() {
      s = SEED;               // reset → identické rozmístění pokaždé (i po resize)
      layer.innerHTML = '';
      const W = hero.getBoundingClientRect().width || window.innerWidth;
      if (W < 320) return;    // extrémně úzké – přeskočit
      // desktop = 1:1 jako dřív; menší displeje → menší glyfy, menší hustota, tlumenější blur
      const scale = Math.max(0.42, Math.min(1, W / 1400));
      const density = Math.max(0.55, Math.min(1, W / 1400));
      const blurMul = W <= 1040 ? 0.5 : 1;
      const frag = document.createDocumentFragment();
      ZONES.forEach((z) => {
        const n = Math.round(z.n * density);
        for (let i = 0; i < n; i++) frag.appendChild(makeGlyph(z, scale, blurMul));
      });
      layer.appendChild(frag);
    }

    build();
    // Přestavuj JEN při změně šířky. Na mobilu se resize spouští i při scrollu
    // (schování/zobrazení adresního řádku mění výšku) – to bychom nesměli přestavovat,
    // jinak se glyfy vytvoří znovu a animace „naskočí" na začátek (efekt restartu).
    let lastW = window.innerWidth, rt;
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - lastW) < 24) return; // jen výška → ignorovat
      lastW = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(build, 250);
    }, { passive: true });
  })();
})();
