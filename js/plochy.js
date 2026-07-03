/* ============================================================
   Volné reklamní plochy — veřejná stránka
   Načítá data ze Supabase a vykresluje karty.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const loading = $('plochyLoading'), errorEl = $('plochyError'), emptyEl = $('plochyEmpty');
  const blockVolne = $('blockVolne'), blockObsazene = $('blockObsazene');
  const gridVolne = $('gridVolne'), gridObsazene = $('gridObsazene');

  function show(el, on) { if (el) el.hidden = !on; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // Chybí konfigurace?
  if (!window.SUPABASE_URL || /VLOZ/.test(window.SUPABASE_URL) || !window.SUPABASE_ANON_KEY || /VLOZ/.test(window.SUPABASE_ANON_KEY)) {
    show(loading, false); show(errorEl, true);
    if (errorEl) errorEl.innerHTML = 'Sekce se připravuje. (Chybí konfigurace Supabase — viz <code>js/supabase-config.js</code>.)';
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    show(loading, false); show(errorEl, true);
    return;
  }

  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  function mapUrl(p) {
    if (p.gps && /^\s*https?:\/\//i.test(p.gps)) return p.gps.trim();
    if (p.gps && /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(p.gps)) return 'https://www.google.com/maps?q=' + encodeURIComponent(p.gps.trim());
    if (p.adresa) return 'https://www.google.com/maps?q=' + encodeURIComponent(p.adresa);
    return null;
  }
  function photosOf(p) {
    const arr = [];
    if (p.hlavni_foto) arr.push(p.hlavni_foto);
    (Array.isArray(p.fotky) ? p.fotky : []).forEach(u => { if (u && arr.indexOf(u) === -1) arr.push(u); });
    return arr;
  }
  function zajemHref(p) {
    // Přesměrování na poptávkový formulář s předvyplněnými údaji o ploše.
    const q = new URLSearchParams();
    q.set('plocha', p.nazev || '');
    if (p.adresa) q.set('adresa', p.adresa);
    if (p.rozmery) q.set('rozmery', p.rozmery);
    return 'index.html?' + q.toString() + '#kontakt';
  }

  function cardHtml(p, idx) {
    const photos = photosOf(p);
    const cover = photos[0];
    const taken = p.stav === 'obsazena';
    const map = mapUrl(p);
    const thumbs = photos.slice(1, 5).map((u, i) =>
      `<button class="plocha__thumb" type="button" data-ploid="${idx}" data-photo="${i + 1}" aria-label="Zvětšit fotografii"><img src="${esc(u)}" alt="" loading="lazy"></button>`
    ).join('');
    const extra = photos.length > 5 ? `<span class="plocha__more">+${photos.length - 4}</span>` : '';

    return `<article class="plocha${taken ? ' plocha--taken' : ''}">
      <div class="plocha__cover">
        ${cover
          ? `<button class="plocha__coverbtn" type="button" data-ploid="${idx}" data-photo="0" aria-label="Zvětšit fotografii"><img src="${esc(cover)}" alt="${esc(p.nazev)}" loading="lazy"></button>`
          : `<div class="plocha__noimg">bez fotografie</div>`}
        <span class="plocha__badge ${taken ? 'is-taken' : 'is-free'}">${taken ? 'Obsazená' : 'Volná'}</span>
      </div>
      <div class="plocha__body">
        <h3 class="plocha__title">${esc(p.nazev)}</h3>
        <ul class="plocha__meta">
          ${p.adresa ? `<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(p.adresa)}</li>` : ''}
          ${p.rozmery ? `<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 3v18"/></svg>${esc(p.rozmery)}</li>` : ''}
        </ul>
        ${p.popis ? `<p class="plocha__desc">${esc(p.popis)}</p>` : ''}
        ${thumbs ? `<div class="plocha__gallery">${thumbs}${extra}</div>` : ''}
        <div class="plocha__actions">
          ${taken ? '' : `<a class="btn btn--primary" href="${zajemHref(p)}">Mám zájem</a>`}
          ${map ? `<a class="btn btn--outline" href="${esc(map)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>Mapa</a>` : ''}
        </div>
      </div>
    </article>`;
  }

  let ALL = [];
  function render(list) {
    ALL = list;
    const volne = list.filter(p => p.stav !== 'obsazena');
    const obsazene = list.filter(p => p.stav === 'obsazena');
    show(loading, false);
    if (!list.length) { show(emptyEl, true); return; }

    if (volne.length) {
      gridVolne.innerHTML = volne.map((p) => cardHtml(p, list.indexOf(p))).join('');
      $('countVolne').textContent = '(' + volne.length + ')';
      show(blockVolne, true);
    }
    if (obsazene.length) {
      gridObsazene.innerHTML = obsazene.map((p) => cardHtml(p, list.indexOf(p))).join('');
      $('countObsazene').textContent = '(' + obsazene.length + ')';
      show(blockObsazene, true);
    }
    if (!volne.length && !obsazene.length) show(emptyEl, true);
    bindLightbox();
  }

  async function load() {
    try {
      const { data, error } = await sb.from('plochy').select('*')
        .eq('skryta', false)
        .order('pripnuta', { ascending: false })
        .order('poradi', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      render(data || []);
    } catch (e) {
      show(loading, false); show(errorEl, true);
      console.error('Plochy load error:', e.message || e);
    }
  }

  /* ---------- Lightbox ---------- */
  const lb = $('pLightbox'), lbImg = $('pLbImg'), lbCap = $('pLbCaption'), lbCount = $('pLbCounter');
  let set = [], cur = 0, lastFocus = null;
  function lbShow(i) {
    if (!set.length) return;
    cur = (i + set.length) % set.length;
    lbImg.src = set[cur]; lbImg.alt = '';
    lbCount.textContent = (cur + 1) + ' / ' + set.length;
  }
  function lbOpen(plIdx, photoIdx) {
    const p = ALL[plIdx]; if (!p) return;
    set = photosOf(p); if (!set.length) return;
    lbCap.textContent = p.nazev || '';
    lastFocus = document.activeElement;
    lbShow(photoIdx || 0);
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('pLbClose').focus();
  }
  function lbClose() {
    lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; lbImg.src = '';
    if (lastFocus) lastFocus.focus();
  }
  function bindLightbox() {
    document.querySelectorAll('.plocha__coverbtn, .plocha__thumb').forEach(btn => {
      btn.addEventListener('click', () => lbOpen(+btn.dataset.ploid, +btn.dataset.photo));
    });
  }
  if (lb) {
    $('pLbClose').addEventListener('click', lbClose);
    $('pLbNext').addEventListener('click', () => lbShow(cur + 1));
    $('pLbPrev').addEventListener('click', () => lbShow(cur - 1));
    lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') lbClose();
      else if (e.key === 'ArrowRight') lbShow(cur + 1);
      else if (e.key === 'ArrowLeft') lbShow(cur - 1);
    });
  }

  load();
})();
