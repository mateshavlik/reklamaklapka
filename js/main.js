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
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Otevřít menu');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
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
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
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
      /* === PŘIPRAVENO NA BACKEND ===
         Zde napojte odeslání. Příklady:
         - Netlify Forms: přidejte na <form> atribut data-netlify="true" a níže fetch na '/';
         - vlastní endpoint: fetch('/api/poptavka', { method:'POST', body:new FormData(form) })
      */
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Odesílám…';
      status.className = 'form__status';
      setTimeout(() => {
        form.reset();
        btn.disabled = false;
        status.textContent = 'Děkujeme! Vaši poptávku jsme přijali, brzy se vám ozveme.';
        status.className = 'form__status is-ok';
      }, 700);
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
})();
