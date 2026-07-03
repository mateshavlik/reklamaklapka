/* ============================================================
   Administrace reklamních ploch (Supabase Auth + DB + Storage)
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const BUCKET = window.SUPABASE_BUCKET || 'plochy-fotky';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const loginView = $('loginView'), adminView = $('adminView');
  const loginForm = $('loginForm'), loginError = $('loginError');
  const list = $('list'), adminMsg = $('adminMsg');

  if (!window.SUPABASE_URL || /VLOZ/.test(window.SUPABASE_URL) || !window.SUPABASE_ANON_KEY || /VLOZ/.test(window.SUPABASE_ANON_KEY) || !window.supabase) {
    loginError.textContent = 'Chybí konfigurace Supabase — vyplňte js/supabase-config.js.';
    return;
  }
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  /* ---------- AUTH ---------- */
  async function refreshAuth() {
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (session) {
      loginView.hidden = true; adminView.hidden = false;
      $('userEmail').textContent = session.user.email; $('userEmail').hidden = false;
      $('logoutBtn').hidden = false;
      loadList();
    } else {
      loginView.hidden = false; adminView.hidden = true;
      $('userEmail').hidden = true; $('logoutBtn').hidden = true;
    }
  }
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const btn = $('loginBtn'); btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPassword').value });
    btn.disabled = false;
    if (error) { loginError.textContent = 'Přihlášení selhalo: ' + error.message; return; }
    refreshAuth();
  });
  $('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); refreshAuth(); });

  /* ---------- STORAGE ---------- */
  async function uploadFile(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  function pathFromUrl(url) {
    const m = String(url).split('/public/' + BUCKET + '/');
    return m[1] || null;
  }
  async function deleteByUrl(url) {
    const p = pathFromUrl(url);
    if (p) { try { await sb.storage.from(BUCKET).remove([p]); } catch (e) {} }
  }

  /* ---------- LIST ---------- */
  async function loadList() {
    list.innerHTML = '<p class="admin__note">Načítám…</p>';
    const { data, error } = await sb.from('plochy').select('*')
      .order('pripnuta', { ascending: false }).order('poradi', { ascending: true }).order('created_at', { ascending: false });
    if (error) { list.innerHTML = '<p class="admin__note">Chyba: ' + esc(error.message) + '</p>'; return; }
    if (!data.length) { list.innerHTML = '<p class="admin__note">Zatím žádná plocha. Přidejte první tlačítkem „+ Přidat plochu".</p>'; return; }
    list.innerHTML = data.map(rowHtml).join('');
    bindRows(data);
  }
  function rowHtml(p) {
    const taken = p.stav === 'obsazena';
    const cover = p.hlavni_foto;
    return `<div class="arow${p.skryta ? ' is-hidden' : ''}" data-id="${p.id}">
      <div class="arow__thumb">${cover ? `<img src="${esc(cover)}" alt="">` : '<span>—</span>'}</div>
      <div class="arow__info">
        <strong>${esc(p.nazev)} ${p.pripnuta ? '📌' : ''} ${p.skryta ? '👁️‍🗨️' : ''}</strong>
        <span>${esc(p.adresa || '')}${p.rozmery ? ' · ' + esc(p.rozmery) : ''}</span>
      </div>
      <div class="arow__status">
        <button class="chip ${taken ? 'chip--taken' : 'chip--free'}" data-act="stav" type="button">${taken ? 'Obsazená' : 'Volná'}</button>
      </div>
      <div class="arow__actions">
        <button class="iconbtn" data-act="edit" type="button" title="Upravit">✏️</button>
        <button class="iconbtn" data-act="pin" type="button" title="${p.pripnuta ? 'Odepnout' : 'Připnout nahoru'}">📌</button>
        <button class="iconbtn" data-act="hide" type="button" title="${p.skryta ? 'Zobrazit' : 'Skrýt z webu'}">👁️</button>
        <button class="iconbtn iconbtn--danger" data-act="del" type="button" title="Smazat">🗑️</button>
      </div>
    </div>`;
  }
  function bindRows(data) {
    const byId = {}; data.forEach(p => byId[p.id] = p);
    list.querySelectorAll('.arow').forEach(row => {
      const p = byId[row.dataset.id];
      row.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => rowAction(btn.dataset.act, p)));
    });
  }
  async function rowAction(act, p) {
    if (act === 'edit') return openEditor(p);
    if (act === 'stav') return patch(p.id, { stav: p.stav === 'obsazena' ? 'volna' : 'obsazena' });
    if (act === 'pin') return patch(p.id, { pripnuta: !p.pripnuta });
    if (act === 'hide') return patch(p.id, { skryta: !p.skryta });
    if (act === 'del') {
      if (!confirm('Opravdu smazat plochu „' + p.nazev + '"? Tuto akci nelze vrátit.')) return;
      const photos = [p.hlavni_foto].concat(Array.isArray(p.fotky) ? p.fotky : []).filter(Boolean);
      await Promise.all(photos.map(deleteByUrl));
      const { error } = await sb.from('plochy').delete().eq('id', p.id);
      if (error) return note('Chyba: ' + error.message);
      note('Plocha smazána.'); loadList();
    }
  }
  async function patch(id, fields) {
    const { error } = await sb.from('plochy').update(fields).eq('id', id);
    if (error) return note('Chyba: ' + error.message);
    loadList();
  }
  function note(t) { adminMsg.textContent = t; setTimeout(() => { if (adminMsg.textContent === t) adminMsg.textContent = ''; }, 4000); }

  /* ---------- EDITOR ---------- */
  const editor = $('editor'), photoGrid = $('photoGrid');
  let working = { id: null, photos: [] };

  function openEditor(p) {
    p = p || {};
    working = { id: p.id || null, photos: [p.hlavni_foto].concat(Array.isArray(p.fotky) ? p.fotky : []).filter(Boolean) };
    $('editorTitle').textContent = p.id ? 'Upravit plochu' : 'Nová plocha';
    $('fId').value = p.id || '';
    $('fNazev').value = p.nazev || '';
    $('fAdresa').value = p.adresa || '';
    $('fRozmery').value = p.rozmery || '';
    $('fGps').value = p.gps || '';
    $('fPopis').value = p.popis || '';
    $('fStav').value = p.stav || 'volna';
    $('fPripnuta').checked = !!p.pripnuta;
    $('fSkryta').checked = !!p.skryta;
    $('editorError').textContent = '';
    renderPhotos();
    editor.hidden = false; document.body.style.overflow = 'hidden';
  }
  function closeEditor() { editor.hidden = true; document.body.style.overflow = ''; }
  function renderPhotos() {
    photoGrid.innerHTML = working.photos.map((u, i) =>
      `<div class="pchip${i === 0 ? ' is-cover' : ''}"><img src="${esc(u)}" alt="">
        ${i === 0 ? '<span class="pchip__cover">Hlavní</span>' : `<button type="button" class="pchip__cover pchip__set" data-i="${i}">Jako hlavní</button>`}
        <button type="button" class="pchip__del" data-i="${i}" title="Odebrat">×</button></div>`
    ).join('');
    photoGrid.querySelectorAll('.pchip__del').forEach(b => b.addEventListener('click', () => removePhoto(+b.dataset.i)));
    photoGrid.querySelectorAll('.pchip__set').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; const [x] = working.photos.splice(i, 1); working.photos.unshift(x); renderPhotos(); }));
  }
  async function removePhoto(i) {
    const url = working.photos[i];
    working.photos.splice(i, 1); renderPhotos();
    if (url) deleteByUrl(url); // z úložiště pryč hned
  }
  $('fileInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    const lbl = $('uploadLabel'); lbl.textContent = 'Nahrávám…';
    try {
      for (const f of files) { const url = await uploadFile(f); working.photos.push(url); renderPhotos(); }
    } catch (err) { $('editorError').textContent = 'Nahrání selhalo: ' + err.message; }
    lbl.textContent = '+ Nahrát fotky'; e.target.value = '';
  });

  $('editorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('editorError').textContent = '';
    const btn = $('saveBtn'); btn.disabled = true;
    const row = {
      nazev: $('fNazev').value.trim(),
      adresa: $('fAdresa').value.trim() || null,
      rozmery: $('fRozmery').value.trim() || null,
      gps: $('fGps').value.trim() || null,
      popis: $('fPopis').value.trim() || null,
      stav: $('fStav').value,
      pripnuta: $('fPripnuta').checked,
      skryta: $('fSkryta').checked,
      hlavni_foto: working.photos[0] || null,
      fotky: working.photos.slice(1)
    };
    let error;
    if (working.id) ({ error } = await sb.from('plochy').update(row).eq('id', working.id));
    else ({ error } = await sb.from('plochy').insert(row));
    btn.disabled = false;
    if (error) { $('editorError').textContent = 'Uložení selhalo: ' + error.message; return; }
    closeEditor(); note('Uloženo ✓'); loadList();
  });

  $('addBtn').addEventListener('click', () => openEditor(null));
  $('editorClose').addEventListener('click', closeEditor);
  $('editorCancel').addEventListener('click', closeEditor);
  editor.addEventListener('click', e => { if (e.target === editor) closeEditor(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !editor.hidden) closeEditor(); });

  refreshAuth();
})();
