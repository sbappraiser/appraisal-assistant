/* ---------------- App state ---------------- */
const app = { ins: null, tab: 'property', open: new Set(), groups: {}, cur: null, confirm: null, saving: null, ovrOpen: null, appl: null, missIdx: 0, undo: null };
const EXTRA_TABS = [{ id: 'photos', title: 'Photos' }, { id: 'summaries', title: 'Summaries' }, { id: 'attention', title: 'Needs Attention' }, { id: 'export', title: 'Save & Export' }];
const tabShown = (sec, ins) => !sec.showTab || !!sec.showTab(ins || app.ins);
const ALL_TABS_FULL = () => [{ id: 'overview', title: '▦ Buttons' }, { id: 'cw', title: 'Complex walk' }, { id: 'walk', title: '🚶 Walk-through' }, { id: 'dictate', title: '🎤 Dictate' }, ...SECTIONS.filter(s => tabShown(s)).map(s => ({ id: s.id, title: s.title })), ...EXTRA_TABS];
const ALL_TABS = () => { const T = ALL_TABS_FULL(); if (typeof dkWalk !== 'function' || !dkWalk()) return T;   // walk-through mode (6r)
  const keep = new Set(['walk', 'dictate', 'photos', 'attention', app.tab]); return [...T.filter(t => keep.has(t.id)), { id: 'alltabs', title: '☰ All tabs' }]; };
const CAM_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const LIB_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>';

const isReq = (f, d, ins) => typeof f.req === 'function' ? !!f.req(d || {}, ins || app.ins) : !!f.req;
const isShown = (f, d, ins) => !f.show || !!f.show(d || {}, ins || app.ins);
const groupShown = (g, sec, ins) => tabShown(sec, ins) && (!g.showGroup || g.showGroup(ins.data[sec.id], ins));

/* ---------------- Saving ---------------- */
async function writeNow() { await DB.put('inspections', JSON.parse(JSON.stringify(app.ins))); }
function save() {
  if (!app.ins) return;
  deriveFromInterview(app.ins); gateFix(app.ins);
  app.ins.updated = Date.now();
  clearTimeout(app.saving); setSaved('Saving…');
  app.saving = setTimeout(async () => {
    try { await writeNow(); setSaved(DB.persistent ? 'Saved ✓' : 'Saved (session only)'); }
    catch (e) { setSaved('NOT SAVED – storage error'); }
  }, 200);
}
/* asked once: years the owner gives on the Interview tab fill the UAD time frames (only when still empty) */
function deriveFromInterview(ins) {
  const iv = ins.data.interview || {}; const base = parseInt(String(ins.data.property.inspDate || '').slice(0, 4), 10) || new Date().getFullYear();
  const age = y => { const n = parseInt(String(y || ''), 10); return n && n <= base ? base - n : null; };
  const tf = a => a === null ? undefined : a < 1 ? 'LessThanOneYear' : a < 5 ? 'OneToFiveYears' : a < 10 ? 'FiveToTenYears' : 'TenOrMoreYears';
  const k0 = (ins.lists.kitchens || [])[0], ka = age(iv.kitYear), ba = age(iv.bathYear), ra = age(iv.roofYear);
  if (k0 && ka !== null && k0.time === undefined && k0.upd && k0.upd !== 'NotUpdated') k0.time = tf(ka);
  if (ba !== null) (ins.lists.baths || []).forEach(b => { if (b.time === undefined && b.upd && b.upd !== 'NotUpdated') b.time = tf(ba); });
  if (ra !== null && ins.data.front.roofAge === undefined) ins.data.front.roofAge = ra < 1 ? 'LessThanOneYear' : ra < 10 ? 'OneToTenYears' : ra < 20 ? 'TenToTwentyYears' : 'TwentyOrMoreYears';
}
async function saveNow(announce) {
  if (!app.ins) return; clearTimeout(app.saving);
  try { app.ins.updated = Date.now(); await writeNow(); const t = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); setSaved('Saved ✓ ' + t); if (announce) toast('Saved at ' + t); }
  catch (e) { setSaved('NOT SAVED'); toast('Could not save. Export a backup now.'); }
}
function setSaved(t) { const el = $('#saved'); if (el) el.textContent = t; }
window.addEventListener('pagehide', () => { if (app.ins && !app.leaving) writeNow().catch(() => {}); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && app.ins && !app.leaving) writeNow().catch(() => {}); });
window.addEventListener('pageshow', e => { if (e.persisted && app.leaving) location.reload(); }); // came back to a frozen copy: start fresh

/* ---------------- Home ---------------- */
async function renderHome() {
  app.ins = null; app.returnTo = null; document.querySelectorAll('.return-bar').forEach(e => e.remove()); document.title = 'Octopus Mobile Appraisal Assistant';
  let raw = [];
  try { raw = (await DB.all('inspections')) || []; } catch (e) { showFatal('Could not read saved inspections: ' + (e.message || e), 'home'); }
  const all = raw.map(i => { try { return normalize(i); } catch (e) { i._broken = e.message || String(e); return i; } }).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const root = $('#app');
  root.innerHTML = `
  <header class="bar"><div class="bar-row"><div class="title"><img class="brandLogo" src="logo-96.png" alt="" width="32" height="32"><b>Octopus Mobile</b><span>${all.length} inspection${all.length === 1 ? '' : 's'} on this iPad · ${(navigator.standalone || matchMedia('(display-mode: standalone)').matches) ? 'opened from the Home Screen icon' : 'opened in Safari'}</span></div>
    ${hcBtn()}<button class="icon-btn" id="storeBtn">Storage check</button><label class="icon-btn" style="position:relative;overflow:hidden">Restore backup<input id="restoreFile" type="file" accept=".zip,application/zip" style="position:absolute;inset:0;opacity:0"></label></div></header>
  <main>
    ${(navigator.standalone || matchMedia('(display-mode: standalone)').matches) ? '' : '<p class="warn-box">You are in Safari. Inspections made here are kept separately from the Home Screen app – use the Home Screen icon for real work.</p>'}
    <div class="hbig"><button class="hbig-b primary" id="bigNew"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M7.5 12h9"/></svg><b>New inspection</b><small>From an order sent from the Octopus, or start blank</small></button>
      <label class="hbig-b"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5h6l2 2h10v9.5H3z"/><path d="M3 7.5V5h6l2 2.5"/></svg><b>Open existing</b><small>Below, or import a Workfile or orders file from OneDrive</small><input id="bigOpen" type="file" accept=".zip,.json,application/zip,application/json"></label></div>
    ${await homeList(all)}
    ${!DB.persistent ? '<p class="warn-box">This browser is not letting the app save to the iPad. Open the app from its Home Screen icon so inspections are kept.</p>' : ''}
    <p class="app-ver">Version ${typeof BUILD !== 'undefined' ? esc(BUILD) : '?'}</p>
  </main>`;
  { const nb = $('#newBtn'); if (nb) nb.onclick = () => { const f = $('#newForm'); f.hidden = !f.hidden; if (!f.hidden) $('#nAddr').focus(); }; }
  bindStreetSugg($('#nAddr'), () => '', v => { $('#nAddr').value = v; });
  $('#newForm').onsubmit = async e => {
    e.preventDefault(); const a = capWords($('#nAddr').value.trim()), f = $('#nFile').value.trim(); if (!a || !f) return;
    const ins = newInspection(f, a); await DB.put('inspections', ins); openInspection(ins.id);
  };
  root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openInspection(b.dataset.open));
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { app.confirm = 'del:' + b.dataset.del; renderHome(); });
  root.querySelectorAll('[data-delno]').forEach(b => b.onclick = () => { app.confirm = null; renderHome(); });
  root.querySelectorAll('[data-delyes]').forEach(b => b.onclick = async () => {
    const id = b.dataset.delyes; const ph = await DB.photosFor(id); for (const p of ph) await DB.del('photos', p.id);
    await DB.del('inspections', id); app.confirm = null; toast('Inspection deleted'); renderHome();
  });
  $('#restoreFile').onchange = e => restoreBackup(e.target.files[0]);
  $('#ordersFile').onchange = e => loadOrdersFile(e.target.files[0]);
  root.querySelectorAll('[data-ostart]').forEach(b => b.onclick = () => startFromOrder(b.dataset.ostart));
  root.querySelectorAll('[data-oclear]').forEach(b => b.onclick = async () => { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to clear the list'; return; } await clearOrders(); toast('Orders list cleared (your inspections are kept)'); renderHome(); });
  $('#storeBtn').onclick = storageCheck;
  { const bn = $('#bigNew'); if (bn) bn.onclick = () => { const f = $('#newForm'); if (f) { f.hidden = false; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#nAddr') && $('#nAddr').focus(), 300); } }; const bo = $('#bigOpen'); if (bo) bo.onchange = e => { const f = e.target.files[0]; if (f) loadOrdersFile(f); }; }
  root.querySelectorAll('[data-backup]').forEach(b => b.onclick = async () => {
    const ins = all.find(x => x.id === b.dataset.backup); if (!ins) return;
    app.ins = ins; try { await doExport('workfile', b); } finally { app.ins = null; }
  });
  syncBar();
}
function safeCard(i) {
  try { if (i._broken) throw new Error(i._broken); return homeCard(i); }
  catch (e) {
    const name = (i.data && i.data.property && (i.data.property.fileName || i.data.property.addr)) || 'Inspection';
    return `<div class="card"><b>${esc(name)}</b><div class="meta warn-box">Some details could not be shown (${esc(e.message || e)}). Your data is still saved.</div>
      <div class="row"><button class="btn primary" data-open="${i.id}">Open</button><button class="btn" data-backup="${i.id}">Save backup</button></div></div>`;
  }
}
function homeCard(i) {
  const issues = computeIssues(i).filter(x => !i.overrides[x.key]);
  const req = issues.filter(x => x.sev === 'Required' || x.sev === 'Photo').length;
  const total = Math.max(1, countRequired(i)); const pct = Math.max(0, Math.min(100, Math.round(100 * (1 - req / total))));
  const confirming = app.confirm === 'del:' + i.id;
  return `<div class="card">
    <b>${esc(insTitle(i))}</b><div class="meta">${esc(insAddr(i))}</div>
    <div class="meta">${i.photos.length} photos · updated ${new Date(i.updated).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${i.exported ? ' · <strong>Exported ' + new Date(i.exported).toLocaleDateString() + '</strong>' : ''}</div>
    <div class="prog" title="${pct}% of required items complete"><i style="width:${pct}%"></i></div>
    <div class="meta">${req ? req + ' required item' + (req === 1 ? '' : 's') + ' left' : 'All required items complete'}</div>
    ${confirming ? `<div class="confirm">Delete this inspection and its photos?${i.exported ? '' : ' It has NOT been exported.'} <button class="btn danger solid sm" data-delyes="${i.id}">Delete</button><button class="btn sm" data-delno="1">Keep</button></div>`
      : `<div class="row"><button class="btn primary" data-open="${i.id}">Open</button><button class="btn" data-backup="${i.id}">Save backup</button><button class="btn danger" data-del="${i.id}">Delete</button></div>`}
  </div>`;
}

/* ---------------- Storage check & photo recovery ---------------- */
async function storageCheck() {
  const out = []; let orphans = new Map();
  try {
    out.push('Storage open: ' + (DB.persistent ? 'yes' : 'NO – the app could not open its storage'));
    const ins = (await DB.all('inspections')) || []; out.push('Inspections stored: ' + ins.length);
    const ids = new Set(ins.map(i => i.id));
    const linked = new Set(); ins.forEach(i => (i.photos || []).forEach(p => p && linked.add(p.id)));
    const ph = (await DB.all('photos')) || []; out.push('Photos stored: ' + ph.length);
    ph.forEach(p => { if (!linked.has(p.id)) { const k = p.insId || '?'; if (!orphans.has(k)) orphans.set(k, []); orphans.get(k).push(p); } });
    const nOrph = [...orphans.values()].reduce((a, b) => a + b.length, 0);
    out.push('Photos not attached to any inspection: ' + nOrph + (orphans.size ? ' (from ' + orphans.size + ' inspection' + (orphans.size > 1 ? 's' : '') + (orphans.size && [...orphans.keys()].some(k => !ids.has(k)) ? ' that are no longer listed' : '') + ')' : ''));
  } catch (e) { out.push('Error reading storage: ' + (e.message || e)); }
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.push('Space used by the app: ' + (e.usage / 1048576).toFixed(1) + ' MB'); } } catch (e) {}
  try { if (navigator.storage && navigator.storage.persisted) out.push('Protected from automatic cleanup: ' + ((await navigator.storage.persisted()) ? 'yes' : 'no')); } catch (e) {}
  try { if (indexedDB.databases) { const d = await indexedDB.databases(); out.push('Databases: ' + (d.map(x => x.name + ' v' + x.version).join(', ') || 'none')); } } catch (e) {}
  try { out.push('Opened as: ' + (navigator.standalone || matchMedia('(display-mode: standalone)').matches ? 'Home Screen app' : 'Safari tab') + ' · ' + location.host); } catch (e) {}
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const groups = [...orphans.entries()];
  bg.innerHTML = `<div class="fatal" style="max-width:640px;width:100%;max-height:90vh;overflow:auto"><h2 style="color:#000">Storage check</h2>
    <p class="fatal-msg">${out.map(esc).join('<br>')}</p>
    ${groups.map(([k, arr], n) => `<div class="row"><button class="btn primary" data-recover="${esc(k)}">Recover ${arr.length} photo${arr.length > 1 ? 's' : ''} (group ${n + 1})</button></div>`).join('')}
    <p class="help">Take a screenshot of this box and send it to Claude.</p>
    <div class="row"><button class="btn" id="storeClose">Close</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelector('#storeClose').onclick = () => bg.remove();
  bg.querySelectorAll('[data-recover]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Recovering…';
    try { await recoverPhotos(orphans.get(b.dataset.recover)); bg.remove(); toast('Photos recovered into a new inspection'); renderHome(); }
    catch (e) { b.textContent = 'Failed: ' + (e.message || e); }
  });
}
async function recoverPhotos(recs) {
  const ts = id => { const n = parseInt(String(id).slice(0, 8), 36); return n > 1.5e12 && n < 2.5e12 ? n : 0; };
  recs = recs.slice().sort((a, b) => ts(a.id) - ts(b.id));
  const first = ts(recs[0].id); const when = first ? new Date(first).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const ins = newInspection('Recovered photos ' + when, 'Recovered photos – see Property tab, Extra workfile photos');
  recs.forEach((r, i) => {
    ins.photos.push({ id: r.id, sec: 'property', field: null, list: null, item: null, slot: null, extra: true, label: 'Recovered photo ' + (i + 1), cat: 'SupplementalExhibit', roomType: null, required: false, ts: ts(r.id) || Date.now(), w: null, h: null, autoLabel: true });
  });
  for (const r of recs) { r.insId = ins.id; await DB.put('photos', r); }
  await DB.put('inspections', ins);
}

/* ---------------- Inspection shell ---------------- */
async function openInspection(id, tab) {
  try { await openInspection2(id, tab); }
  catch (e) { console.error(e); renderHome(); setTimeout(() => showFatal('Could not open this inspection: ' + (e.message || e), 'open'), 50); }
}
async function openInspection2(id, tab) {
  const ins = normalize(await DB.get('inspections', id)); app.ins = ins;
  app.tab = (tab && (SECTIONS.some(x => x.id === tab) || EXTRA_TABS.some(x => x.id === tab) || tab === 'walk' || tab === 'dictate' || tab === 'overview' || tab === 'cw' || String(tab).startsWith('b:'))) ? tab : 'overview';
  if (typeof wkResolvePending === 'function' && wkResolvePending(ins)) { ins.updated = Date.now(); try { await DB.put('inspections', JSON.parse(JSON.stringify(ins))); } catch (e) {} } app.open = new Set(); app.groups = {}; app.cur = null; app.confirm = null; app.appl = null;
  const root = $('#app');
  root.innerHTML = `<header class="bar"><div class="bar-row">
      <button class="icon-btn" id="homeBtn" aria-label="Home – all inspections">‹ Home</button>
      <div class="title"><b id="tTitle"></b> <i class="tent" title="Tentacle 2 of the Octopus – the subject">2 · Subject</i><span id="tAddr"></span></div>
      <span class="saved" id="saved">Saved ✓</span>
      <button class="icon-btn" id="saveBtn">Save</button>
      <div class="bar-tools">
      <button class="icon-btn" id="ovWalk" aria-label="Walk-through">🚶<span class="bl"> Walk-through</span></button>
      <button class="icon-btn" id="ovDict" aria-label="Dictate">🎤<span class="bl"> Dictate</span></button>
      <button class="icon-btn" id="ovBtns" aria-label="All buttons">▦<span class="bl"> Buttons</span></button>
      <button class="icon-btn" id="jumpBtn" aria-label="Search">🔍<span class="bl"> Search</span></button>
      <button class="icon-btn sk-btn" id="sketchBtn" aria-label="Sketch">✏️<span class="bl"> OctoSketch</span></button>
      ${hcBtn()}<button class="icon-btn" id="insStore">Storage check</button></div>
      <button class="attn-pill" id="attnPill"></button></div>
    <nav class="tabs" id="tabs" role="tablist"></nav></header>
  <main id="main"></main>`;
  $('#homeBtn').onclick = async () => { await saveNow(); renderHome(); window.scrollTo(0, 0); };
  $('#saveBtn').onclick = () => saveNow(true);
  $('#jumpBtn').onclick = openJump;
  $('#sketchBtn').onclick = async () => { const b = $('#sketchBtn'); b.textContent = 'Saving…'; const url = 'sketch.html?ins=' + encodeURIComponent(app.ins.id) + '&tab=' + encodeURIComponent(app.tab || 'interior'); try { await saveNow(); } catch (e) {} app.leaving = true; clearTimeout(app.saving); DB.close(); b.textContent = 'Opening…'; location.href = url; };
  $('#attnPill').onclick = () => goTab('attention');
  $('#insStore').onclick = storageCheck;
  $('#ovWalk').onclick = () => goTab('walk'); $('#ovDict').onclick = () => goTab('dictate'); $('#ovBtns').onclick = () => { goTab('overview'); window.scrollTo(0, 0); };
  renderTab();
}
function refreshChrome() {
  const ins = app.ins; $('#tTitle').textContent = insTitle(ins); $('#tAddr').textContent = insAddr(ins);
  document.title = insTitle(ins) + ' – Inspection';
  const issues = computeIssues(ins).filter(x => !ins.overrides[x.key]);
  const req = issues.filter(x => x.sev === 'Required' || x.sev === 'Photo').length;
  const pill = $('#attnPill'); pill.textContent = req ? (innerWidth < 520 ? `⚠ ${req}` : `${req} need${req === 1 ? 's' : ''} attention`) : (issues.length ? issues.length + ' to review' : 'Ready ✓'); pill.classList.toggle('ok', !req);
  const byTab = {}; issues.forEach(x => { if (x.sev === 'Required' || x.sev === 'Photo') byTab[x.tab] = (byTab[x.tab] || 0) + 1; });
  $('#tabs').innerHTML = ALL_TABS().map(t => `<button class="tab" role="tab" aria-selected="${t.id === app.tab}" data-tab="${t.id}">${esc(t.title)}${byTab[t.id] ? `<span class="dot">${byTab[t.id]}</span>` : (SECTIONS.some(s => s.id === t.id) ? '<span class="dot done">✓</span>' : '')}</button>`).join('');
  $('#tabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => goTab(b.dataset.tab));
  { const hide = !app.classic && (app.tab === 'overview' || app.tab === 'cw' || String(app.tab).startsWith('b:')); $('#tabs').hidden = hide; $('#tabs').style.display = hide ? 'none' : ''; }
  const sel = $('#tabs [aria-selected="true"]');
  if (sel) { const nav = $('#tabs'); nav.scrollLeft = sel.offsetLeft - nav.clientWidth / 2 + sel.offsetWidth / 2; }
}
function goTab(id, anchor, groupId) {
  if (id === 'alltabs') { dkSetWalk(false); refreshChrome(); toast('All tabs are back'); return; }
  if (app.tab !== id) saveNow();
  if (id !== 'walk' && typeof WSR !== 'undefined' && WSR.on) wsrStop();
  if (app.tab === 'walk' && id !== 'walk' && typeof wkCommit === 'function') { try { const ta = document.getElementById('wkNote'); const w = wkData(app.ins); if (ta) w.notes[w.place] = wkClean(ta.value); wkCommit(app.ins, null, false, true); } catch (e) {} }
  app.tab = id; app.missIdx = 0;
  if (groupId) openGroup(id, groupId);
  renderTab();
  if (anchor && document.getElementById(anchor)) scrollToEl(anchor); else if (groupId) scrollToEl('grp-' + groupId); else window.scrollTo(0, 0);
  if (anchor && app.returnTo) { const el = document.getElementById(anchor); const box = el && el.querySelector('textarea, input.txt'); if (box) setTimeout(() => { try { box.focus({ preventScroll: true }); } catch (e) {} }, 150); }
}
function scrollToEl(id) {
  const el = document.getElementById(id); if (!el) { window.scrollTo(0, 0); return; }
  const top = el.getBoundingClientRect().top + window.scrollY - ($('.bar') ? $('.bar').offsetHeight : 0) - 12;
  window.scrollTo(0, Math.max(0, top)); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
}

/* Subsection (group) open state, per tab */
function groupIssues(sec, g, ins = app.ins) { return computeIssues(ins).filter(x => !ins.overrides[x.key] && x.tab === sec.id && x.group === g.id && (x.sev === 'Required' || x.sev === 'Photo')); }
function ensureGroups(sec, only) {
  if (app.groups[sec.id]) { const S = app.groups[sec.id]; if (only && ![...S].some(id => only.includes(id))) { const f = sec.groups.find(g => only.includes(g.id) && groupShown(g, sec, app.ins)); if (f) { S.add(f.id); app.cur = f.id; } } return S; }
  const set = new Set(); const vis = sec.groups.filter(g => groupShown(g, sec, app.ins) && (!only || only.includes(g.id)));
  const first = vis[0]; // first visit to a tab: start at its first subsection
  if (first) { set.add(first.id); app.cur = first.id; }
  app.groups[sec.id] = set; return set;
}
function openGroup(tab, gid) { const sec = SECTIONS.find(s => s.id === tab); if (!sec) return; ensureGroups(sec).add(gid); app.cur = gid; }

function renderTab() {
  try { renderTab2(); }
  catch (e) { console.error(e); showFatal(e.message || e, 'tab ' + app.tab); }
}
function renderTab2() {
  const y = window.scrollY; refreshChrome(); const main = $('#main');
  const sec = SECTIONS.find(s => s.id === app.tab);
  if (sec) main.innerHTML = legend() + renderSection(sec) + extraPhotos(sec);
  else if (app.tab === 'overview') main.innerHTML = renderOverview();
  else if (app.tab === 'cw') main.innerHTML = renderCW();
  else if (String(app.tab).startsWith('b:')) main.innerHTML = renderOvButton(app.tab.slice(2));
  else if (app.tab === 'dictate') main.innerHTML = renderDictate();
  else if (app.tab === 'walk') main.innerHTML = renderWalk();
  else if (app.tab === 'photos') main.innerHTML = renderGallery();
  else if (app.tab === 'summaries') main.innerHTML = renderSummaries();
  else if (app.tab === 'attention') main.innerHTML = renderAttention();
  else if (app.tab === 'export') main.innerHTML = renderExport();
  bind(main); if (app.tab === 'overview' || String(app.tab).startsWith('b:')) bindOverview(main); if (app.tab === 'cw') bindCW(main); if (app.tab === 'dictate') bindDictate(main); if (app.tab === 'walk') { bindWalk(main); setTimeout(wkMicState, 0); } fillThumbs(main); window.scrollTo(0, y);
  returnBar();
  syncBar();
}
/* the top bar is fixed: keep the page padded by its real height (it wraps on narrow screens) */
function syncBar() { const bar = $('.bar'); if (!bar) return; document.documentElement.style.setProperty('--barh', bar.offsetHeight + 'px');
  if (!syncBar.ro && window.ResizeObserver) { syncBar.ro = new ResizeObserver(() => { const b = $('.bar'); if (b) document.documentElement.style.setProperty('--barh', b.offsetHeight + 'px'); }); }
  if (syncBar.ro && syncBar.watched !== bar) { syncBar.ro.disconnect(); syncBar.ro.observe(bar); syncBar.watched = bar; } }
/* "Done – back to …" bar after jumping from a review list (Systems / Utilities / Counts confirmed) */
function returnBar() {
  const r = app.returnTo; let bar = document.querySelector('.return-bar');
  if (!r) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.className = 'return-bar'; document.body.appendChild(bar); }
  bar.innerHTML = `<button class="btn ret-go">✓ Done – back to ${esc(r.title)}</button><button class="btn ret-x" aria-label="Stay here">✕</button>`;
}
function returnNow() {
  const x = app.returnTo; if (!x) return; app.returnTo = null;
  const a = document.activeElement; if (a && a.blur) a.blur();
  document.querySelectorAll('.return-bar').forEach(e => e.remove());
  saveNow(); goTab(x.tab, x.anchor || null, x.group || null); toast('Changes saved');
}
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.ret-go')) { e.preventDefault(); returnNow(); } else if (e.target.closest && e.target.closest('.ret-x')) { e.preventDefault(); app.returnTo = null; returnBar(); } }, true);
function hcInit() { let on = false; try { on = localStorage.getItem('hc') === '1'; } catch (e) {} document.documentElement.classList.toggle('hc', on); }
function hcToggle() { const on = !document.documentElement.classList.contains('hc'); document.documentElement.classList.toggle('hc', on); try { localStorage.setItem('hc', on ? '1' : '0'); } catch (e) {} document.querySelectorAll('.hc-btn').forEach(b => b.setAttribute('aria-pressed', on)); }
const hcBtn = () => `<button class="icon-btn hc-btn" aria-pressed="${document.documentElement.classList.contains('hc')}" onclick="hcToggle()" aria-label="Outdoor">☀<span class="bl"> Outdoor</span></button>`;
function legend() {
  const n = computeIssues(app.ins).filter(x => !app.ins.overrides[x.key] && x.tab === app.tab && (x.sev === 'Required' || x.sev === 'Photo')).length;
  return `<div class="legend"><span class="lg req">Required (UAD)</span><span class="lg opt">Optional</span>
    <button class="lg warn" id="nextMiss" ${n ? '' : 'disabled'}>${n ? `Missing: ${n} – tap to go to next ›` : 'Nothing missing on this tab ✓'}</button></div>`;
}
function nextMissing() {
  const ins = app.ins; const list = computeIssues(ins).filter(x => !ins.overrides[x.key] && x.tab === app.tab && (x.sev === 'Required' || x.sev === 'Photo'));
  if (!list.length) return; const x = list[app.missIdx % list.length]; app.missIdx++;
  if (x.group) openGroup(app.tab, x.group); if (x.item) app.open.add(x.item);
  renderTab(); scrollToEl(x.anchor || ('grp-' + x.group));
}

/* ---------------- Jump to ---------------- */
function openJump() {
  const ins = app.ins; const nav = [];
  SECTIONS.forEach(s => { nav.push({ tab: s.id, label: s.title, sub: 'Tab' }); s.groups.filter(g => groupShown(g, s, ins)).forEach(g => nav.push({ tab: s.id, gid: g.id, label: g.title, sub: s.title })); });
  EXTRA_TABS.forEach(t => nav.push({ tab: t.id, label: t.title, sub: 'Tab' }));
  // everything you've entered: field names, typed text, picked options, list items, comments
  const found = [];
  const add = (q, label, value, tab, gid, anchor, item) => {
    const hay = (label + ' ' + value).toLowerCase(); if (!hay.includes(q)) return;
    found.push({ tab, gid, anchor, item, label, value });
  };
  const search = q => {
    found.length = 0; if (q.length < 2) return;
    SECTIONS.forEach(sec => sec.groups.forEach(g => {
      if (!groupShown(g, sec, ins)) return;
      g.fields.forEach(f => { if (['info', 'crs', 'review', 'calc', 'photo'].includes(f.t) || !isShown(f, secData(ins, sec.id, f), ins)) return; const d = secData(ins, sec.id, f); add(q, f.l, valText(f, d[f.k], d), sec.id, g.id, `f-${sec.id}-${f.k}`); });
      if (g.list) ins.lists[g.list].forEach((it, i) => { const nm = LISTS[g.list].name(it, i, ins.lists[g.list]); LISTS[g.list].fields.forEach(f => { if (['info', 'photo'].includes(f.t) || !isShown(f, it, ins)) return; add(q, nm + ' – ' + f.l, valText(f, it[f.k], it), sec.id, g.id, `f-${g.list}-${it.id}-${f.k}`, it.id); }); });
    }));
    COMMENT_TARGETS.forEach(c => { const tx = buildComment(ins, c).text; if (tx.toLowerCase().includes(q)) found.push({ tab: 'summaries', anchor: 'sum-' + c.id, label: c.title, value: tx }); });
    ins.photos.forEach(p => { if ((p.label || '').toLowerCase().includes(q)) found.push({ tab: 'photos', label: 'Photo', value: p.label }); });
  };
  const snip = (v, q) => { v = String(v || ''); const i = v.toLowerCase().indexOf(q); if (i < 0) return esc(v.slice(0, 90)); const a = Math.max(0, i - 40); return (a ? '…' : '') + esc(v.slice(a, i)) + '<mark>' + esc(v.substr(i, q.length)) + '</mark>' + esc(v.slice(i + q.length, i + q.length + 50)) + (i + q.length + 50 < v.length ? '…' : ''); };
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet jump" role="dialog" aria-label="Search"><div class="body">
    <form id="jumpForm" class="jump-form" autocomplete="off"><input class="txt" id="jumpQ" type="search" enterkeyhint="search" placeholder="Search anything: attic, granite, terrorist, Bath 2…"><button class="btn primary" type="submit">Search</button></form>
    <div id="jumpList" class="jump-list"></div><button class="btn" id="jumpClose">Close</button></div></div>`;
  document.body.appendChild(bg);
  let list = [];
  const go = e => { bg.remove(); if (e.item) app.open.add(e.item); app.returnTo = null; goTab(e.tab, e.anchor || null, e.gid || null); if (e.anchor) { const el = document.getElementById(e.anchor); const box = el && el.querySelector('textarea, input.txt'); if (box && box.value) setTimeout(() => { try { box.focus({ preventScroll: true }); const qi = box.value.toLowerCase().indexOf(lastQ); if (qi >= 0) box.setSelectionRange(qi, qi + lastQ.length); } catch (x) {} }, 150); } };
  let lastQ = '';
  const draw = raw => {
    const q = raw.trim().toLowerCase(); lastQ = q; search(q);
    const navHits = nav.filter(e => !q || (e.label + ' ' + e.sub).toLowerCase().includes(q));
    list = [...found, ...navHits.map(e => ({ ...e, nav: true }))];
    $('#jumpList', bg).innerHTML = (found.length ? `<div class="jump-h">${found.length} match${found.length === 1 ? '' : 'es'} in your entries</div>` : (q.length >= 2 ? '<div class="jump-h">No match in your entries</div>' : ''))
      + list.map((e, i) => e.nav ? `<button class="jump-item ${e.gid ? '' : 'top'}" data-i="${i}">${esc(e.label)}<small>${esc(e.sub)}</small></button>`
        : `<button class="jump-item hit" data-i="${i}">${esc(e.label)}<small>${snip(e.value, q)}</small></button>`).join('');
    $('#jumpList', bg).querySelectorAll('[data-i]').forEach(b => b.onclick = () => go(list[+b.dataset.i]));
  };
  draw('');
  $('#jumpQ', bg).oninput = e => draw(e.target.value);
  $('#jumpForm', bg).onsubmit = ev => { ev.preventDefault(); draw($('#jumpQ', bg).value); if (list.length && found.length) go(list[0]); else if (!found.length) $('#jumpQ', bg).blur(); };
  $('#jumpClose', bg).onclick = () => bg.remove(); bg.onclick = e => { if (e.target === bg) bg.remove(); };
  setTimeout(() => $('#jumpQ', bg).focus(), 50);
}

/* ---------------- Sections ---------------- */
function renderSection(sec, only) {
  const ins = app.ins; const openSet = ensureGroups(sec, only);
  const vis = sec.groups.filter(g => groupShown(g, sec, ins) && (!only || only.includes(g.id)));
  return vis.map((g, gi) => {
    const open = openSet.has(g.id); const miss = groupIssues(sec, g).length;
    const n = g.list ? ins.lists[g.list].length : 0;
    const started = g.fields.some(f => !['calc', 'info', 'crs', 'permits', 'review'].includes(f.t) && !isEmpty(secData(ins, sec.id, f)[f.k])) || n > 0;
    const status = miss ? `<span class="gstat miss">${miss} missing</span>` : '';
    const rv = !!(ins.reviewed || {})[sec.id + ':' + g.id]; const green = rv && !miss;
    let body = '';
    if (open) {
      const fieldsHtml = g.fields.map(f => renderField(f, secData(ins, sec.id, f), { sec: sec.id, group: g.id })).join('');
      const showList = g.list && (!g.listShow || g.listShow(ins.data[sec.id], ins));
      const next = vis[gi + 1];
      body = `${fieldsHtml ? `<div class="fields two">${fieldsHtml}</div>` : ''}${showList ? renderList(g.list) : ''}
        <div class="gfoot"><button class="btn donecheck" data-donegroup="${g.id}" data-next="${next ? next.id : ''}"><span class="gcheck sm ${green ? 'on' : ''}" aria-hidden="true">✓</span><span>Done with ${esc(g.title)}</span></button></div>`;
    }
    return `<section data-secid="${sec.id}" class="group ${open ? 'open' : 'closed'} ${app.cur === g.id && open ? 'current' : ''}" id="grp-${g.id}">
      <div class="ghead-row"><button class="gcheck ${green ? 'on' : ''}" data-check="${g.id}" aria-pressed="${green}" aria-label="${green ? 'Reviewed' : 'Mark reviewed'}">✓</button><button class="ghead" data-group="${g.id}" aria-expanded="${open}"><span class="chev">${open ? '▾' : '▸'}</span><span class="gtitle">${esc(g.title)}</span>${g.list ? `<span class="count">${n} added</span>` : ''}${status}</button></div>
      ${body}</section>`;
  }).join('');
}

function photoCount(n) { return n ? `<span class="pcount">${n} photo${n === 1 ? '' : 's'}</span>` : ''; }
function renderField(f, d, ctx) {
  const ins = app.ins; d = d || {};
  if (!isShown(f, d, ins)) return '';
  const id = ctx.list ? `f-${ctx.list}-${ctx.item}-${f.k}` : `f-${ctx.sec}-${f.k}`;
  const data = ctx.list ? `data-list="${ctx.list}" data-item="${ctx.item}"` : `data-sec="${ctx.sec}"`;
  if (f.t === 'info') return `<div class="field wide note-field"><div class="info remind">📏 ${esc(f.l)}</div></div>`;
  if (f.t === 'order') return `<div class="field wide" id="${id}">${orderWidget()}</div>`;
  if (f.t === 'crs') return `<div class="field wide" id="${id}">${crsWidget()}</div>`;
  if (f.t === 'permits') { const w = permitsWidget(f.compact); return w ? `<div class="field wide" id="${id}">${f.compact ? '<div class="flabel"><span class="lab">' + esc(f.l) + '</span></div>' : ''}${w}</div>` : ''; }
  const req = isReq(f, d, ins);
  let v = d[f.k]; let filled;
  let nph = 0;
  if (f.t === 'photo') { nph = photosInSlot(ins, { sec: ctx.sec, field: f.k }).length; filled = nph > 0; }
  else if (f.t === 'calc') { v = f.calc(ins); filled = true; }
  else if (f.t === 'review') filled = true;
  else if (f.t === 'appliances') filled = v && Object.keys(v).length > 0;
  else filled = !isEmpty(v);
  const over = f.lim && typeof v === 'string' && v.length > f.lim;
  const missing = (req && !filled) || over;
  const o = ['one', 'multi', 'sel'].includes(f.t) ? optsOf(f, d) : [];
  const wide = ['multi', 'note', 'photo', 'appliances', 'review'].includes(f.t) || (f.t === 'one' && o.length > 4) || (f.t === 'calc' && typeof v === 'string');
  const tag = f.t === 'photo' ? (req ? 'Required photo' : f.recommended ? 'Suggested photo' : 'Photo') : f.t === 'calc' || f.t === 'review' ? 'Auto' : (req ? 'Required' : 'Optional');
  let html = `<div class="field ${req ? 'req' : ''} ${missing ? 'missing' : ''} ${wide ? 'wide' : ''}" id="${id}">
    <div class="flabel"><span class="tag">${tag}</span><span class="lab">${esc(f.l)}</span>${f.fid ? `<span class="fid">${esc(f.fid)}</span>` : ''}${f.t === 'photo' ? photoCount(nph) : ''}</div>
    ${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}`;
  const attr = `${data} data-k="${f.k}" data-t="${f.t}"`;
  switch (f.t) {
    case 'yn':
      html += `<div class="chips yn">${[[true, 'Yes'], [false, 'No']].map(([val, l]) => `<button class="chip radio" ${attr} data-v="${val}" aria-pressed="${v === val}"><span class="box"></span>${l}</button>`).join('')}</div>`; break;
    case 'one': case 'multi': {
      const multi = f.t === 'multi'; const arr = multi ? (v || []) : [v];
      const ic = f.icons === 'roof' ? ROOF_ICONS : null;
      html += `<div class="chips">${o.map(([c, l]) => `<button class="chip ${multi ? '' : 'radio'} ${ic && ic[c] ? 'withicon' : ''}" ${attr} data-v="${esc(c)}" aria-pressed="${arr.includes(c)}"><span class="box"></span>${ic && ic[c] ? `<svg class="chipicon" viewBox="0 0 64 40" aria-hidden="true">${ic[c]}</svg>` : ''}${esc(l)}</button>`).join('')}</div>`; break;
    }
    case 'sel': html += `<select class="txt" ${attr}><option value="">Choose…</option>${o.map(([c, l]) => `<option value="${esc(c)}" ${v === c ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; break;
    // numbers, money, phone and dates get their own 10-key pad (the iPad keyboard has no number pad)
    case 'money': html += tenkey(attr, v ?? '', '0', true, '$'); break;
    case 'num': html += tenkey(attr, v ?? '', '', true); break;
    case 'year': html += tenkey(attr, v ?? '', 'YYYY', false); break;
    case 'phone': html += tenkey(attr, fmtPhone(v || ''), '(805) 555-1234', false); break;
    case 'date': html += tenkey(attr, fmtDateUS(v || ''), 'MM/DD/YYYY', false); break;
    case 'month': html += `<input class="txt num" type="month" ${attr} value="${esc(v || '')}" placeholder="YYYY-MM">`; break;
    case 'text': html += `<input class="txt" spellcheck="true" autocorrect="${CAP_WORDS.has(f.k) ? 'off' : 'on'}" autocapitalize="${CAP_WORDS.has(f.k) ? 'words' : 'sentences'}" ${attr} value="${esc(v || '')}" ${f.lim ? `maxlength="${f.lim}"` : ''}>`; break;
    case 'note':
      html += `<textarea class="txt" spellcheck="true" autocorrect="on" autocapitalize="sentences" ${attr} placeholder="${f.lim ? 'Max ' + f.lim + ' characters' : 'Notes for your workfile'}">${esc(v || '')}</textarea>`;
      if (f.lim) html += `<div class="limit ${over ? 'over' : ''}" data-limit="${f.lim}">${(v || '').length} / ${f.lim}</div>`;
      html += `<div class="wordwarn">${wordWarn(v)}</div>`; break;
    case 'count':
      html += `<div class="stepper"><button ${attr} data-step="-1" aria-label="Decrease">−</button><output>${v ?? '–'}</output><button ${attr} data-step="1" aria-label="Increase">+</button></div>`; break;
    case 'review': { const items = f.items(ins) || [];
      html += items.length ? `<div class="review">${items.map(x => `<div class="rv-row"><span class="rv-l">${esc(x.label)}</span><span class="rv-v ${x.value ? '' : 'empty'}">${esc(x.value || 'Not entered')}</span>${x.go ? `<button class="btn sm" data-go="${esc(x.go)}" data-ret="${esc(ctx.sec + '|' + id + '|' + (ctx.group || '') + '|' + f.l)}">Change ›</button>` : ''}</div>`).join('')}</div>` : '<div class="calc-text">Nothing entered yet.</div>'; break; }
    case 'calc': html += typeof v === 'string' ? `<div class="calc-text">${esc(v)}</div>` : `<div class="calc">${esc(Number(v || 0).toLocaleString())}</div>`; break;
    case 'appliances': html += applianceWidget(d, ctx, f); break;
    case 'photo': html += photoSlot({ sec: ctx.sec, field: f.k, label: f.l, cat: f.cat, required: req }); break;
  }
  return html + '</div>';
}

/* roof style line sketches (front elevation, 64×40) */
const ROOF_ICONS = (() => { const W = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"', box = '<path d="M14 38V24h36v14" ' + W + '/>';
  const r = d => `<path d="${d}" ${W}/>` + box;
  return {
    Gable: r('M10 24L32 6l22 18'), Hip: r('M10 24l12-14h20l12 14'), Flat: r('M11 24h42M11 21h42'), Shed: r('M10 24h44V10z'),
    Mansard: r('M10 24l5-12h34l5 12M15 12l4-6h26l4 6'), Gambrel: r('M10 24l7-11 15-7 15 7 7 11'), 'Dutch Gable': r('M10 24l10-10h24l10 10M24 14l8-8 8 8'),
    Butterfly: r('M10 10l22 10 22-10'), 'Multiple Ridges': r('M8 24l12-12 12 12 12-12 12 12'), 'Steep Pitch': r('M12 24L32 2l20 22'),
    'Low Pitch': r('M9 24l23-10 23 10'), Dormers: r('M10 24L32 6l22 18M24 17v-6h8v6M40 19v-5h6v5') };
})();
function tenkey(attr, val, ph, dot, prefix) {
  const keys = ['7','8','9','4','5','6','1','2','3', dot ? '.' : '', '0','⌫'];
  return `<div class="padwrap">${prefix ? `<span class="pfx">${prefix}</span>` : ''}<input class="txt num${prefix ? ' haspfx' : ''}" inputmode="none" data-tenkey="1" ${attr} value="${esc(val)}" placeholder="${esc(ph)}"><div class="tenkey" hidden>${keys.map(k => k ? `<button type="button" class="tk" data-tk="${k}">${k}</button>` : '<span></span>').join('')}<button type="button" class="tk done" data-tk="done">Done</button></div></div>`;
}
const fmtPhone = v => { const d = String(v).replace(/\D/g, '').slice(0, 10); if (!d) return ''; if (d.length < 4) return '(' + d; if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`; return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; };
const fmtDateUS = v => { v = String(v || ''); const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const d = v.replace(/\D/g, '').slice(0, 8); if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) { const [m, dd, y] = v.split('/'); return `${m.padStart(2, '0')}/${dd.padStart(2, '0')}/${y}`; }
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
const usToIso = s => { const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return undefined; const [mo, dd, y] = [+m[1], +m[2], +m[3]]; const t = new Date(y, mo - 1, dd);
  return t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === dd ? `${m[3]}-${m[1]}-${m[2]}` : undefined; };
/* Kitchen appliances: tap appliance -> quantity (if any) -> brand -> folds closed */
function applianceWidget(d, ctx, f) {
  const val = d[f.k] || {}; const key = ctx.item + ':';
  const editing = app.appl && app.appl.startsWith(key) ? app.appl.slice(key.length) : null;
  const editor = ak => {
    const a = APPLIANCES.find(x => x.k === ak); const s = val[ak] || {}; const da = `data-ak="${ak}" data-list="${ctx.list}" data-item="${ctx.item}"`;
    return `<div class="appl-edit" id="appl-edit"><div class="appl-title">${esc(a.l)}</div>
      ${a.qty ? `<div class="flabel"><span class="lab">How many?</span></div><div class="stepper"><button data-applqty="-1" ${da}>−</button><output>${s.qty || 1}</output><button data-applqty="1" ${da}>+</button></div>` : ''}
      ${a.brand ? `<div class="flabel"><span class="lab">Brand (tap one to finish)</span></div><div class="chips">${BRANDS.map(b => `<button class="chip radio" data-applbrand="${esc(b)}" ${da} aria-pressed="${s.brand === b}"><span class="box"></span>${esc(b)}</button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn sm primary" data-appldone="1">Done</button><button class="btn sm danger" data-applrm="${ak}" data-list="${ctx.list}" data-item="${ctx.item}">Remove ${esc(a.l)}</button></div></div>`;
  };
  return `<div class="chips">${APPLIANCES.map(a => {
    const s = val[a.k]; const on = !!s;
    const lab = on ? `${a.l}${s.brand ? ' – ' + s.brand : ''}${a.qty && s.qty > 1 ? ' ×' + s.qty : ''}` : a.l;
    return `<button class="chip ${on ? 'appl-on' : ''}" data-appl="${a.k}" data-list="${ctx.list}" data-item="${ctx.item}" aria-pressed="${on}"><span class="box"></span>${esc(lab)}</button>${editing === a.k ? editor(a.k) : ''}`;
  }).join('')}</div>`;
}
function photoSlot(slot) {
  const ins = app.ins; const ph = photosInSlot(ins, slot);
  const s = esc(JSON.stringify(slot));
  return `<div class="photo-slot">
    ${ph.map(p => `<button class="thumb ${p.required ? 'req' : ''} ${p.extra && p.toReport ? 'rep' : ''}" data-view="${p.id}"><img data-pid="${p.id}" alt=""><span>${esc(p.label)}</span></button>`).join('')}
    <label class="cam">${CAM_SVG}${ph.length ? 'Add another' : 'Take photo'}<input type="file" accept="image/*" capture="environment" data-slot="${s}"></label>
    <label class="cam lib">${LIB_SVG}From library<input type="file" accept="image/*" multiple data-slot="${s}"></label>
  </div>`;
}
function extraPhotos(sec) {
  const slot = { sec: sec.id, extra: true, label: sec.title + ' – workfile', cat: 'SupplementalExhibit' };
  const ph = photosInSlot(app.ins, slot);
  return `<section class="group extra"><div class="extra-photos"><h3>Extra workfile photos – ${esc(sec.title)} ${photoCount(ph.length)}</h3>${photoSlot(slot)}</div></section>`;
}

/* ---------------- Active orders from the Octopus (desktop) ----------------
   The desktop saves "Active Orders.json"; she opens it here from Files (OneDrive / iCloud Drive).
   Kept in the sketches store: 'orders:active' = the list, 'plan:<order>:<n>' = floor plan pictures. */
const fmtD = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-').map(Number); if (!d) return iso; return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }); };
const fmtT = t => { if (!t) return ''; const [hh, mm] = t.split(':').map(Number); return new Date(2000, 0, 1, hh, mm).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
/* her ask (Oct 22): one list – Active orders (orders from the computer + every inspection not yet sent), then Sent orders;
   each row: address, file name, date; newest first; two copies of the same address are flagged so the newest is clear */
async function homeList(all) {
  let rec = null; try { rec = await DB.get('sketches', 'orders:active'); } catch (e) {}
  const orders = (rec && rec.orders) || []; const sk = {}; try { ((await DB.all('sketches')) || []).forEach(r => { if (r && r.areas) sk[r.id] = r.areas.filter(a => a.closed).length; }); } catch (e) {}
  const key = a => String(a || '').toLowerCase().replace(/,.*$/, '').replace(/[^a-z0-9]/g, '');
  const rows = [];
  all.forEach(i => { const o = i.orderId ? orders.find(x => x.id === i.orderId) : null; rows.push({ i, o, addr: insAddr(i) || (o && o.address) || '', file: insTitle(i), t: i.updated || 0, sent: !!i.exported }); });
  orders.filter(o => !all.some(i => i.orderId === o.id)).forEach(o => rows.push({ o, addr: o.address || '', file: o.fileNo ? 'File ' + o.fileNo : '', t: o.inspDate ? new Date(o.inspDate + 'T' + (o.inspTime || '09:00')).getTime() : (rec && rec.made) || 0, sent: false, todo: true }));
  const cnt = {}; rows.filter(r => r.i).forEach(r => { const k = key(r.addr); cnt[k] = (cnt[k] || 0) + 1; });
  const newest = {}; rows.filter(r => r.i).forEach(r => { const k = key(r.addr); if (!newest[k] || r.t > newest[k]) newest[k] = r.t; });
  const when = t => t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const row = r => { const i = r.i, o = r.o; const k = key(r.addr); const dup = i && cnt[k] > 1; const confirming = i && app.confirm === 'del:' + i.id;
    const street = String(r.addr || '').split(',')[0] || '(no address)';
    const bits = i ? [i.photos.length + ' photos', sk[i.id] ? '✏️ sketch ' + sk[i.id] + ' area' + (sk[i.id] > 1 ? 's' : '') : 'no sketch', i.exported ? 'sent ' + new Date(i.exported).toLocaleDateString() : ''].filter(Boolean) : [o.inspDate ? 'inspection ' + fmtD(o.inspDate) + (o.inspTime ? ' at ' + fmtT(o.inspTime) : '') : 'order – not started', o.access && o.access.phone ? 'access ' + o.access.phone : ''].filter(Boolean);
    return `<div class="hrow ${dup ? (r.t === newest[k] ? 'dupnew' : 'dupold') : ''}"><div class="hmain"><b>${esc(street)}</b> <span class="hfile">${esc(r.file)}</span>
        ${dup ? `<span class="hdup">${r.t === newest[k] ? 'newest copy' : 'older copy'}</span>` : ''}<div class="meta">${i ? 'updated ' : ''}${esc(when(r.t))}${bits.length ? ' · ' + esc(bits.join(' · ')) : ''}</div></div>
      <div class="hbtns">${confirming ? `<span class="confirm">Delete it and its photos${i.exported ? '' : ' (NOT sent)'}?</span><button class="btn danger solid sm" data-delyes="${i.id}">Delete</button><button class="btn sm" data-delno="1">Keep</button>`
        : i ? `<button class="btn primary sm" data-open="${i.id}">Open</button><button class="btn sm" data-backup="${i.id}" title="Export a Workfile (backup / move to another device)">Workfile</button><button class="btn danger sm" data-del="${i.id}" aria-label="Delete">✕</button>`
        : `<button class="btn primary sm" data-ostart="${esc(o.id)}">Start</button>`}</div></div>`; };
  const act = rows.filter(r => !r.sent).sort((a, b) => b.t - a.t), sent = rows.filter(r => r.sent).sort((a, b) => b.t - a.t);
  return `<section class="orders-home"><div class="row" style="align-items:center;justify-content:space-between;flex-wrap:wrap"><h2>Active orders${rec ? ` <small>orders file from ${esc(new Date(rec.made).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</small>` : ''}</h2>
    <span class="row"><button class="btn primary" id="newBtn">＋ New inspection</button><label class="btn" style="position:relative;overflow:hidden">${rec ? 'Get newer orders' : 'Get orders'}<input id="ordersFile" type="file" style="position:absolute;inset:0;opacity:0"></label>${rec ? '<button class="btn" data-oclear>Clear orders</button>' : ''}</span></div>
    <form class="new-form" id="newForm" autocomplete="off" hidden>
      <div><label class="flabel" for="nAddr"><span class="tag">Required</span><span class="lab">Property address</span></label><input class="txt" id="nAddr" required autocapitalize="words" autocorrect="off" placeholder="123 Oak Street"></div>
      <div><label class="flabel" for="nFile"><span class="tag">Required</span><span class="lab">File name</span></label><input class="txt" id="nFile" required placeholder="2026-1015"></div>
      <button class="btn primary" type="submit">Start inspection</button></form>
    <div class="hlist">${act.map(row).join('') || `<p class="help">No active orders. On the computer, press <b data-keep>Send active orders to the iPad</b> (the same file works on the iPhone), save it to iCloud Drive or OneDrive, then tap <b>Get orders</b> here – or tap <b>＋ New inspection</b>.</p>`}</div></section>
    ${sent.length ? `<section class="orders-home"><h2>Sent orders <small>exported – kept here until you delete them</small></h2><div class="hlist">${sent.map(row).join('')}</div></section>` : ''}`;
}
async function ordersBlock(all) {
  let rec = null; try { rec = await DB.get('sketches', 'orders:active'); } catch (e) {}
  const list = (rec && rec.orders) || [];
  const card = o => { const ins = all.find(i => i.orderId === o.id); const street = String(o.address || '').split(',')[0];
    return `<div class="card order-card"><b>${esc(street || '(no address)')}</b>
      <div class="meta">${esc([o.fileNo && 'File ' + o.fileNo, o.type, o.reportForm].filter(Boolean).join(' · '))}</div>
      ${o.inspDate ? `<div class="meta"><b>Inspection ${esc(fmtD(o.inspDate))}${o.inspTime ? ' at ' + esc(fmtT(o.inspTime)) : ''}</b></div>` : ''}
      ${o.access && (o.access.name || o.access.phone) ? `<div class="meta">Access: ${esc([o.access.name, o.access.rel].filter(Boolean).join(', '))} ${o.access.phone ? `<a href="tel:${esc(o.access.phone.replace(/[^\d+]/g, ''))}">${esc(o.access.phone)}</a>` : ''}</div>` : ''}
      ${o.todos && o.todos.length ? `<div class="meta">${o.todos.length} to-do${o.todos.length > 1 ? 's' : ''} from the order</div>` : ''}
      <div class="row">${ins ? `<button class="btn primary" data-open="${ins.id}">Open inspection</button>` : `<button class="btn primary" data-ostart="${esc(o.id)}">Start inspection</button>`}</div></div>`; };
  return `<section class="orders-home"><div class="row" style="align-items:center;justify-content:space-between"><h2>Active orders${rec ? ` <small>from ${esc(new Date(rec.made).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</small>` : ''}</h2>
    <span class="row"><label class="btn" style="position:relative;overflow:hidden">${rec ? 'Get the newer orders file' : 'Get orders (Active Orders file)'}<input id="ordersFile" type="file" style="position:absolute;inset:0;opacity:0"></label>${rec ? '<button class="btn" data-oclear>Clear</button>' : ''}</span></div>
    ${list.length ? `<div class="cards">${list.map(card).join('')}</div>` : `<p class="help">On the computer, press <b data-keep>Send active orders to the iPad</b> in the Octopus (the same file works on the iPhone) and save the file to OneDrive or iCloud Drive. Then tap <b>Get orders</b> here and pick “Active Orders.json” in Files.</p>`}</section>`;
}
async function clearOrders() {
  const all = (await DB.all('sketches')) || [];
  for (const r of all) if (r.id === 'orders:active') await DB.del('sketches', r.id);
}
async function loadOrdersFile(file) {
  if (!file) return;
  if (/\.zip$/i.test(file.name) || /zip/.test(file.type)) {   // her Oct 22 try: an iPad export picked here – a Workfile moves the inspection over, an SFREP file cannot
    if (/workfile/i.test(file.name)) { toast('That is an inspection Workfile – adding the inspection to this ' + (typeof DEVICE !== 'undefined' ? DEVICE : 'device') + '…', 5000); return restoreBackup(file); }
    toast('“' + file.name + '” is the SFREP file – it goes to the computer, not here. To move an inspection to this ' + (typeof DEVICE !== 'undefined' ? DEVICE : 'device') + ', export it as a Workfile on the other device, then tap Restore backup here (or Get orders) and pick the “– Workfile.zip”.', 14000); return; }
  toast('Reading the orders file…');
  try {
    let d; try { d = JSON.parse(await file.text()); } catch (e) { throw new Error('“' + file.name + '” is not an orders file. Pick “Active Orders.json” or an “Order … .json” file from the Octopus.'); }
    if (d.app !== 'appraisal-assistant' || d.kind !== 'active-orders') throw new Error('That is not an Active Orders file from the Octopus.');
    const old = await DB.get('sketches', 'orders:active');
    const keep = new Set(); const orders = [];
    const incoming = d.orders || [];
    if (d.single && old) for (const o of old.orders || []) if (!incoming.some(x => x.id === o.id)) { orders.push(o); (o.plans || []).forEach(pl => keep.add(pl.key)); }   // one order: add it to the list, keep the others
    for (const o of incoming) {
      const plans = [];
      for (let n = 0; n < (o.plans || []).length; n++) { const key = 'plan:' + o.id + ':' + n; await DB.put('sketches', { id: key, src: o.plans[n].src, name: o.plans[n].name }); plans.push({ key, name: o.plans[n].name }); keep.add(key); }
      orders.push({ ...o, plans });
    }
    await DB.put('sketches', { id: 'orders:active', made: d.single && old ? old.made : d.made, orders });
    // floor plans of orders no longer on the list stay only if an inspection uses them
    const inUse = new Set(); ((await DB.all('inspections')) || []).forEach(i => (((i.data || {}).property || {}).order || { plans: [] }).plans.forEach(pl => inUse.add(pl.key)));
    if (old) for (const o of old.orders || []) for (const pl of o.plans || []) if (!keep.has(pl.key) && !inUse.has(pl.key)) await DB.del('sketches', pl.key);
    toast(d.single ? 'Added ' + (String((incoming[0] || {}).address || '').split(',')[0] || 'the order') + ' – ' + orders.length + ' active order' + (orders.length === 1 ? '' : 's') + ' on this iPad' : orders.length + ' active order' + (orders.length === 1 ? '' : 's') + ' on this iPad'); renderHome();
  } catch (e) { console.error(e); toast(e.message || 'Could not read that file'); }
}
async function startFromOrder(id) {
  const rec = await DB.get('sketches', 'orders:active'); const o = rec && (rec.orders || []).find(x => x.id === id); if (!o) return;
  const parts = String(o.address || '').split(',').map(x => x.trim()); const street = titleCase(parts[0] || '');
  const ins = newInspection(o.fileNo || street, street); ins.orderId = o.id; const p = ins.data.property;
  // address from the order; CRS facts (never beds, baths or square feet) when the order has the CRS report
  const zm = (parts[2] || '').match(/([A-Z]{2})?\s*(\d{5})(?:-(\d{4}))?/);
  applyCRS(ins, { addr: parts[0] || '', city: parts[1] || '', state: (zm && zm[1]) || 'CA', zip: zm ? zm[2] : '', zip4: zm && zm[3] ? zm[3] : '', county: o.county || '' }); delete p.crs;
  if (o.crs) applyCRS(ins, { ...o.crs, file: o.crs.file || 'CRS report (from the order)', loadedAt: 'with the order' });
  p.addr = street || p.addr; if (o.unit) p.unit = o.unit;
  if (o.inspDate) p.inspDate = o.inspDate;
  if (o.permits) { p.permits = o.permits; if (o.permits.zoning && !ins.data.site.zoneCode) ins.data.site.zoneCode = o.permits.zoning; }
  p.order = { id: o.id, fileNo: o.fileNo, aiUse: o.aiUse || '', client: o.client, type: o.type, reportForm: o.reportForm || '', effDate: o.effDate, inspDate: o.inspDate, inspTime: o.inspTime, access: o.access || {}, todos: o.todos || [], done: {}, notes: o.notes || '',
    listings: o.listings || [], docs: o.docs || [], plans: o.plans || [], apn: o.apn || '', lat: o.lat || '', lon: o.lon || '' };
  await DB.put('inspections', ins); toast('Inspection started from order ' + (o.fileNo || street)); openInspection(ins.id);
}
function orderWidget() {
  const O = app.ins.data.property.order; if (!O) return ''; const done = O.done || {};
  const rows = [['File', O.fileNo], ['Client', O.client], ['Assignment', O.type], ['Report form', O.reportForm], ['Effective date', fmtD(O.effDate)], ['Inspection', [fmtD(O.inspDate), fmtT(O.inspTime)].filter(Boolean).join(' at ')], ['APN', O.apn]].filter(r => r[1]);
  return `<div class="crs"><table class="crs-table">${rows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}
    ${O.access && (O.access.name || O.access.phone) ? `<tr><th>Access contact</th><td>${esc([O.access.name, O.access.rel].filter(Boolean).join(', '))} ${O.access.phone ? `<a href="tel:${esc(O.access.phone.replace(/[^\d+]/g, ''))}">${esc(O.access.phone)}</a>` : ''}</td></tr>` : ''}
    ${O.notes ? `<tr><th>Notes</th><td>${esc(O.notes)}</td></tr>` : ''}</table>
    ${O.todos.length ? `<h3>To-dos from the order</h3>${O.todos.map((t, i) => `<label class="todo"><input type="checkbox" data-todo="${i}" ${done[i] ? 'checked' : ''}> ${esc(t)}</label>`).join('')}` : ''}
    ${O.listings.length ? `<h3>MLS history of the subject</h3><table class="crs-table">${O.listings.map(x => `<tr><th>MLS ${esc(x.mls)}</th><td>${esc([x.status, x.listDate && 'listed ' + x.listDate, x.listPrice && '$' + Number(x.listPrice).toLocaleString(), x.saleDate && 'sold ' + x.saleDate, x.salePrice && '$' + Number(x.salePrice).toLocaleString()].filter(Boolean).join(' · '))}</td></tr>`).join('')}</table>` : ''}
    ${O.plans.length ? `<p class="help">Floor plan${O.plans.length > 1 ? 's' : ''} from the order: open the sketch, then More → Floor plan underlay.</p>` : ''}
    ${O.docs.length ? `<p class="help">Documents in the order (on the computer): ${esc(O.docs.map(d => d.type).join(', '))}</p>` : ''}</div>`;
}

/* ---------------- CRS Data import ---------------- */
function crsWidget() {
  const c = app.ins.data.property.crs;
  const rows = c ? [['Address', [c.addr, c.cityLine].filter(Boolean).join(', ')], ['APN', c.apn], ['Owner of record', c.owner], ['Year built (assessor / MLS)', [c.yearBuilt, c.yearBuiltMls].filter(Boolean).join(' / ')], ['Lot size', [c.lotSf && Number(c.lotSf).toLocaleString() + ' sq. ft.', c.acres && c.acres + ' ac.'].filter(Boolean).join(' / ')], ['Land use', c.landUse], ['Zoning', c.zoning], ['FEMA flood zone', [c.fema, c.femaPanel, c.femaDate].filter(Boolean).join(' · ')],
    ['Last sale', c.sales && c.sales[0] ? `${c.sales[0].date} ${c.sales[0].amount || ''} ${c.sales[0].instrument || ''}` : ''], ['Transfers in last 3 years', c.sales ? String(c.sales.filter(s => withinYears(s.date, 3)).length) : '']].filter(r => r[1]) : [];
  return `<div class="crs">
    <p class="help">Before you leave the office, load the CRS Property Report PDF. It fills the address, ZIP+4, county and year built, and keeps APN, owner, lot size, flood zone and sales history for your workfile and SFREP.</p>
    <label class="btn primary crs-btn">${c ? 'Load a different CRS report' : 'Load CRS Property Report (PDF)'}<input type="file" accept="application/pdf,.pdf" id="crsFile"></label>
    ${c ? `<div class="crs-loaded">Loaded ${esc(c.loadedAt || '')} from ${esc(c.file || 'CRS report')}</div><table class="crs-table">${rows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>` : ''}
  </div>`;
}
function permitsWidget(compact) {
  const P = app.ins.data.property.permits; const items = P ? permitItems(P) : [];
  if (compact && P) return '';
  return `<div class="crs">
    ${compact ? '' : '<p class="help">Optional: the County "Permit History by Parcel" PDF. Only what matters for the appraisal and interview is kept: zoning, any parcel hold, and the permit list to go over with the property contact.</p>'}
    <label class="btn primary crs-btn">${P ? 'Load a different permit history' : 'Import County Permit History (PDF)'}<input type="file" accept="application/pdf,.pdf" class="permitFile"></label>
    ${P ? `<div class="crs-loaded">Loaded ${esc(P.loadedAt || '')}${P.parcel ? ' · APN ' + esc(P.parcel) : ''}</div>
      ${P.holds.length ? `<div class="warn-box">Parcel hold on record: ${esc(P.holds.join(' / '))}</div>` : ''}
      <table class="crs-table">${P.zoning ? `<tr><th>Zoning</th><td>${esc(P.zoning)}</td></tr>` : ''}<tr><th>Parcel holds</th><td>${P.holds.length ? esc(P.holds.join(' / ')) : 'None shown'}</td></tr></table>
      ${items.length ? `<table class="crs-table"><tr><th>Year filed</th><td><b>Permit / case</b></td></tr>${items.map(i => `<tr><th>${esc(i.year)}</th><td>${esc(i.what)} <small>(${esc(i.dept)}${i.status ? ', ' + esc(i.status) : ''})</small></td></tr>`).join('')}</table>` : ''}` : ''}
  </div>`;
}
async function loadPermits(file) {
  if (!file) return; toast('Reading permit history…');
  try {
    const lines = await pdfLines(file); const P = parsePermits(lines);
    if (!P.parcel && !P.accela.length && !P.zoning) throw new Error('This does not look like a County Permit History by Parcel report.');
    P.file = file.name; P.loadedAt = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const p = app.ins.data.property, si = app.ins.data.site; p.permits = P;
    if (P.zoning && !si.zoneCode) si.zoneCode = P.zoning;
    await saveNow(); toast('Permit history loaded'); renderTab();
  } catch (e) { console.error(e); toast(e.message || 'Could not read that PDF'); }
}
function withinYears(dstr, n) { const d = new Date(dstr); if (isNaN(d)) return false; const lim = new Date(); lim.setFullYear(lim.getFullYear() - n); return d >= lim; }
async function loadCRS(file) {
  if (!file) return; toast('Reading CRS report…');
  try {
    const lines = await pdfLines(file); const c = parseCRS(lines);
    if (!c.addr && !c.apn) throw new Error('This does not look like a CRS Property Report.');
    c.file = file.name; c.loadedAt = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    applyCRS(app.ins, c);
    await saveNow(); toast('CRS data loaded'); renderTab();
  } catch (e) { console.error(e); toast(e.message || 'Could not read that PDF'); }
}
// SUBJECT RULE: beds, baths and square footage from the CRS are never put into the inspection – she counts and measures on site.
const NO_SUBJECT_COUNTS = ['beds', 'bedsMls', 'baths', 'bathsMls', 'sqft', 'sqftAssessor', 'sqftMls', 'rooms', 'roomsMls'];
function applyCRS(ins, c) {
  { NO_SUBJECT_COUNTS.forEach(k => delete c[k]);
    const p = ins.data.property, fr = ins.data.front, si = ins.data.site;
    p.crs = c; if (p.pubCmt === undefined) p.pubCmt = true;
    if (c.addr) p.addr = titleCase(c.addr);
    if (c.city && uspsCity(c.city) !== c.city) { if (!p.nbhd) p.nbhd = titleCase(c.city); c.city = uspsCity(c.city); }   // Montecito → neighborhood, mail city Santa Barbara
    if (c.city) { const m = CITIES.find(x => x[0].toLowerCase() === c.city.toLowerCase()); if (m) { p.city = m[0]; delete p.cityOther; } else { p.city = 'Other'; p.cityOther = titleCase(c.city); } }
    if (c.state) p.state = c.state;
    if (c.zip) { if (ZIPS.includes(c.zip)) { p.zip = c.zip; delete p.zipOther; } else { p.zip = 'Other'; p.zipOther = c.zip; } }
    if (c.zip4) p.zip4 = c.zip4;
    if (c.county) { if (/santa barbara/i.test(c.county)) p.county = 'Santa Barbara'; else if (/ventura/i.test(c.county)) p.county = 'Ventura'; else { p.county = 'Other'; p.countyOther = c.county.replace(/ County.*/i, ''); } }
    if (c.yearBuilt && !fr.yearBuilt) fr.yearBuilt = Number(c.yearBuilt);
    if (c.fema && isEmpty(si.hazard)) si.hazard = /^(A|V)/i.test(c.fema) ? ['FEMASpecialFloodHazardArea'] : ['None'];
  }
}
const titleCase = s => String(s || '').toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase());
let pdfjsLib = null;
async function pdfLines(file) {
  if (!pdfjsLib) { pdfjsLib = await import('./pdf.min.mjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs'; }
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
  const out = []; out.rows = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent(); const rows = new Map();
    tc.items.forEach(it => { if (!it.str.trim()) return; const y = Math.round(it.transform[5]); let k = [...rows.keys()].find(r => Math.abs(r - y) <= 2); if (k === undefined) { k = y; rows.set(k, []); } rows.get(k).push({ x: it.transform[4], s: it.str, w: it.width }); });
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, its]) => { its.sort((a, b) => a.x - b.x); let line = '', end = 0; const cells = []; its.forEach(i => { const gap = i.x - end; if (!line || gap > 8) cells.push({ x: i.x, s: i.s }); else cells[cells.length - 1].s += ' ' + i.s; line += (line ? (gap > 8 ? ' | ' : ' ') : '') + i.s; end = i.x + i.w; }); out.push(line.trim()); out.rows.push(cells.map(c => ({ x: c.x, s: c.s.trim() }))); });
  }
  return out;
}

/* ---------------- Lists ---------------- */
const ROOM_LISTS_TOP = new Set(['rooms', 'bedrooms', 'baths', 'kitchens', 'wetbars']);   // rooms: the photo first (her ask, Oct 20 2026)
function renderList(key) {
  const def = LISTS[key], ins = app.ins, list = ins.lists[key];
  const items = list.map((it, i) => {
    const name = def.name(it, i, list); const open = app.open.has(it.id);
    const miss = itemIssues(key, it, i).filter(x => x.sev === 'Required' || x.sev === 'Photo').length;
    const conf = app.confirm === 'rm:' + it.id;
    const nph = ins.photos.filter(p => p.list === key && p.item === it.id).length;
    const fixed = def.keepFirst && i === 0; const canRename = def.fields.some(f => f.k === 'label');
    return `<div class="item ${open ? 'open' : ''}" id="item-${it.id}">
      <div class="item-head">${app.renaming === it.id
          ? `<form class="rename" data-renameform="${it.id}" data-list="${key}"><input class="txt" id="rename-${it.id}" value="${esc(name)}" aria-label="Name" autocomplete="off"><button class="btn sm primary" type="submit">Save name</button><button class="btn sm" type="button" data-renameno="1">Cancel</button></form>`
          : `<button class="name" data-toggle="${it.id}" aria-expanded="${open}">${open ? '▾' : '▸'} ${esc(name)}<small>${nph} photo${nph === 1 ? '' : 's'}</small></button>
        <span class="badge ${miss ? '' : 'ok'}">${miss ? miss + ' missing' : 'Complete'}</span>
        ${canRename ? `<button class="btn sm" data-rename="${it.id}">Rename</button>` : ''}
        ${fixed ? '' : `<button class="btn sm danger" data-rm="${it.id}" data-rmlist="${key}">Remove</button>`}`}</div>
      ${conf ? `<div class="confirm">Remove ${esc(name)}${nph ? ' and its ' + nph + ' photo' + (nph > 1 ? 's' : '') : ''}? <button class="btn danger solid sm" data-rmyes="${it.id}" data-rmlist="${key}">Remove</button><button class="btn sm" data-rmno="1">Cancel</button></div>` : ''}
      ${open ? `<div class="item-body"><div class="fields two">${ROOM_LISTS_TOP.has(key) ? itemPhotos(key, it, i) : ''}${def.fields.map(f => renderField(f, it, { list: key, item: it.id })).join('')}
        ${ROOM_LISTS_TOP.has(key) ? '' : itemPhotos(key, it, i)}${qualityPreview(key, it)}</div>
        <div class="gfoot"><button class="btn sm done" data-toggle="${it.id}">Done with ${esc(name)} ▴</button></div></div>` : ''}
    </div>`;
  }).join('');
  const qa = def.quickAdd ? `<div class="flabel"><span class="lab">Tap each one this property has (tap again to add another of the same kind)</span></div><div class="chips">${def.quickAdd.o.map(t => { const n = list.filter(x => x[def.quickAdd.k] === t).length; return `<button class="chip ${n ? 'appl-on' : ''}" data-add="${key}" data-preset="${esc(t)}" aria-pressed="${n > 0}"><span class="box"></span>${esc(t)}${n > 1 ? ' ×' + n : ''}</button>`; }).join('')}</div>` : '';
  return `<div class="list-items">${items}</div>${qa}<div class="add-row" id="add-${key}">${def.quickAdd ? '' : `<button class="btn primary" data-add="${key}">+ ${esc(def.addLabel)}</button>`}
    ${key === 'baths' ? '<button class="btn primary" data-add="baths" data-kind="HalfBathroom">+ Add half bath</button>' : ''}
    ${list.length > 1 ? `<button class="btn sm" data-expand="${key}">${list.every(x => app.open.has(x.id)) ? 'Collapse all' : 'Expand all'}</button>` : ''}</div>`;
}
function itemPhotoSlots(key, it, i, ins = app.ins) {
  const def = LISTS[key], list = ins.lists[key]; const slots = [];
  if (def.photo && (!def.photo.showIf || def.photo.showIf(it))) {
    const p = def.photo; const label = p.label(it, i, list);
    const required = !!p.required; const recommended = !!p.recommended || (p.recommendedIf && p.recommendedIf(it));
    slots.push({ list: key, item: it.id, slot: 'main', label, cat: p.cat, required, recommended, roomType: p.roomType || (p.roomTypeFn && p.roomTypeFn(it)) || null });
  }
  if (def.extraPhotos) def.extraPhotos(it).filter(x => x.show).forEach(x => slots.push({ list: key, item: it.id, slot: x.key, label: x.label, cat: x.cat, required: !!x.required, roomType: x.roomType || null }));
  return slots;
}
function itemPhotos(key, it, i) {
  return itemPhotoSlots(key, it, i).map(s => { const n = photosInSlot(app.ins, s).length; return `<div class="field wide ${s.required ? 'req' : ''} ${s.required && !n ? 'missing' : ''}" id="f-${key}-${it.id}-photo-${s.slot}">
    <div class="flabel"><span class="tag">${s.required ? 'Required photo' : s.recommended ? 'Suggested photo' : 'Photo'}</span><span class="lab">${esc(s.label)}</span>${photoCount(n)}</div>${photoSlot(s)}</div>`; }).join('');
}
function qualityPreview(key, it) {
  if (key !== 'kitchens' && key !== 'baths') return '';
  const t = roomQualityComment(key, it);
  return `<div class="field wide"><div class="flabel"><span class="tag">Auto</span><span class="lab">Quality comment for SFREP (10.040)</span></div><div class="calc-text">${esc(t || 'Check cabinets, counters and features above to build this comment.')}</div><div class="limit">${t.length} characters</div></div>`;
}
function addItem(key, kind, preset) {
  const ins = app.ins, list = ins.lists[key]; const it = { id: uid() };
  if (preset && LISTS[key].quickAdd) it[LISTS[key].quickAdd.k] = preset;
  if (key === 'bedrooms') { it.label = 'Bedroom ' + (list.length + 1); it.level = 'LevelOne'; }
  if (key === 'baths') { it.kind = kind || 'FullBathroom'; const n = list.filter(b => b.kind === it.kind).length + 1; it.label = (it.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') + n; it.level = 'LevelOne'; }
  if (key === 'kitchens') it.level = 'LevelOne';
  if (key === 'levels') { const used = list.map(l => l.level); const nxt = LEVELS_ALL.find(([c]) => !used.includes(c)); if (nxt) { it.level = nxt[0]; it.grade = nxt[0].startsWith('Below') ? 'FullyBelowGrade' : 'AboveGrade'; } }
  if (key === 'rooms') it.level = 'LevelOne';
  list.forEach(x => app.open.delete(x.id)); // fold the others so only the new one is open
  list.push(it); app.open.add(it.id); save(); renderTab();
  setTimeout(() => scrollToEl('item-' + it.id), 30);
}

/* ---------------- Events ---------------- */
function findField(secId, k) { const sec = SECTIONS.find(s => s.id === secId); for (const g of sec.groups) for (const f of g.fields) if (f.k === k) return { f, g }; return {}; }
function target(el) {
  const ins = app.ins;
  if (el.dataset.list) { const it = ins.lists[el.dataset.list].find(x => x.id === el.dataset.item); return { obj: it, f: LISTS[el.dataset.list].fields.find(f => f.k === el.dataset.k) }; }
  const { f, g } = findField(el.dataset.sec, el.dataset.k); if (g) app.cur = g.id;
  return { obj: secData(ins, el.dataset.sec, f), f };
}
function itemOf(el) { return app.ins.lists[el.dataset.list].find(x => x.id === el.dataset.item); }
function bind(root) {
  root.querySelectorAll('input.txt[data-k="addr"]').forEach(inp => bindStreetSugg(inp, () => (app.ins && app.ins.data.property || {}).zip));   // her Oct 24 2026
  const nm = $('#nextMiss'); if (nm) nm.onclick = nextMissing;
  root.querySelectorAll('[data-group]').forEach(b => b.onclick = () => {
    const sec = secOfEl(b); const set = ensureGroups(sec); const id = b.dataset.group;
    if (set.has(id)) set.delete(id); else { set.add(id); app.cur = id; }
    saveNow(); renderTab(); if (set.has(id)) scrollToEl('grp-' + id);
  });
  root.querySelectorAll('[data-check]').forEach(b => b.onclick = () => {
    const ins = app.ins; ins.reviewed = ins.reviewed || {}; const sec = secOfEl(b); const k = sec.id + ':' + b.dataset.check; const g = sec.groups.find(x => x.id === b.dataset.check); const miss = groupIssues(sec, g).length;
    if (ins.reviewed[k] && !miss) delete ins.reviewed[k]; else ins.reviewed[k] = true;
    if (miss) toast(`${miss} item${miss > 1 ? 's' : ''} still missing – the check turns green when ${miss > 1 ? 'they are' : 'it is'} filled`);
    save(); renderTab();
  });
  root.querySelectorAll('[data-donegroup]').forEach(b => b.onclick = () => {
    const mark = b.querySelector('.gcheck'); const miss = groupIssues(secOfEl(b), secOfEl(b).groups.find(x => x.id === b.dataset.donegroup)).length;
    if (mark && !miss) mark.classList.add('on'); b.disabled = true;
    setTimeout(() => doneGroup(b), miss ? 0 : 280);
  });
  function doneGroup(b) {
    const sec = secOfEl(b); const set = ensureGroups(sec);
    set.delete(b.dataset.donegroup); app.ins.reviewed = app.ins.reviewed || {}; app.ins.reviewed[sec.id + ':' + b.dataset.donegroup] = true; saveNow();
    if (String(app.tab).startsWith('b:') && !b.dataset.next) { toast('Done with ' + ((ovBtn(app.tab.slice(2)) || {}).t || 'this button')); goTab('overview'); window.scrollTo(0, 0); return; }
    if (b.dataset.next) { set.add(b.dataset.next); app.cur = b.dataset.next; renderTab(); scrollToEl('grp-' + b.dataset.next); }
    else { const i = SECTIONS.findIndex(s => s.id === app.tab); goTab(SECTIONS[i + 1] ? SECTIONS[i + 1].id : 'attention'); }
  }
  root.querySelectorAll('.chip[data-k]').forEach(b => b.onclick = () => {
    const { obj, f } = target(b); let v = b.dataset.v;
    if (f.t === 'yn') { v = v === 'true'; obj[f.k] = obj[f.k] === v ? undefined : v; }
    else if (f.t === 'one') obj[f.k] = obj[f.k] === v ? undefined : v;
    else { const arr = new Set(obj[f.k] || []); if (arr.has(v)) arr.delete(v); else { if (v === 'None' || v === 'No Fire Hazard Zone') arr.clear(); else { arr.delete('None'); arr.delete('No Fire Hazard Zone'); } arr.add(v); } obj[f.k] = [...arr]; }
    if (f.k === 'view' && obj.viewPrimary && !(obj.view || []).includes(obj.viewPrimary)) delete obj.viewPrimary;
    if (['attach', 'pud', 'project'].includes(f.k)) propDefaults(app.ins.data.property);
    if (f.gate) gateSet(app.ins, Object.keys(app.ins.data).find(s => app.ins.data[s] === obj) || '', f.k);   // first yes/no question of a section (Oct 23 2026)
    if (b.dataset.list === 'outbuildings' && f.k === 'real' && obj.real === false) { obPersonal(obj); return; }   // her rule Oct 23 2026: personal property is not an outbuilding
    if (f.k === 'whStrap') strapSync(app.ins);   // her Oct 24 2026: a strapped water heater is a disaster mitigation feature
    if (f.k === 'atticAcc') { if (obj.atticAcc === true) obj.attic = true; else if (obj._atticAuto) obj.attic = undefined; obj._atticAuto = obj.atticAcc === true; }   // an accessible attic is an attic (UAD 8.017); No asks whether there is a sealed one   // her ask Oct 21 2026: a detached house, not PUD, not condo → the owner keeps up the outside
    save(); renderTab();
  });
  root.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { const { obj, f } = target(b); obj[f.k] = Math.max(0, (+obj[f.k] || 0) + (+b.dataset.step)); save(); renderTab(); });
  root.querySelectorAll('input.txt[data-k], textarea.txt[data-k], select.txt[data-k]').forEach(inp => {
    let before = inp.value;
    const upd = () => {
      const { obj, f } = target(inp); let v = inp.value;
      if (f.t === 'phone') { inp.value = fmtPhone(v); obj[f.k] = inp.value || undefined; }
      else if (f.t === 'date') { inp.value = fmtDateUS(v.replace(/\D/g, '')); obj[f.k] = usToIso(inp.value); inp.classList.toggle('bad', inp.value.length === 10 && !obj[f.k]); }
      else if (['num', 'money', 'year'].includes(f.t)) { v = v.replace(/[^0-9.]/g, ''); if (f.t === 'year') v = v.replace(/\./g, '').slice(0, 4); obj[f.k] = v === '' ? undefined : Number(v); }
      else obj[f.k] = v === '' ? undefined : v;
      if (inp.tagName === 'TEXTAREA' && before.trim().length >= 15 && inp.value.trim() === '') offerUndo(obj, f.k, before);
      before = inp.value || before;
      if (['fileName', 'addr', 'city', 'cityOther'].includes(f.k)) refreshTitleOnly();
      const lim = inp.parentElement.querySelector('[data-limit]'); if (lim) { lim.textContent = inp.value.length + ' / ' + lim.dataset.limit; lim.classList.toggle('over', inp.value.length > +lim.dataset.limit); }
      save();
    };
    inp.addEventListener('input', upd); inp.addEventListener('change', () => { upd(); if (CAP_WORDS.has(inp.dataset.k)) { const { obj, f } = target(inp); if (obj[f.k]) { obj[f.k] = capWords(obj[f.k]); inp.value = obj[f.k]; } if (f.k === 'addr') splitAddr(obj); save(); refreshTitleOnly(); } renderTab(); });
    if (inp.dataset.tenkey) { const pad = inp.parentElement.querySelector('.tenkey'); let dirty = false;
      inp.addEventListener('focus', () => { pad.hidden = false; });
      inp.addEventListener('blur', () => { pad.hidden = true; if (dirty) { dirty = false; inp.dispatchEvent(new Event('change')); } });
      // keys act on finger-down so a quick tap is never lost, and the field keeps the focus
      pad.querySelectorAll('[data-tk]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); const k = b.dataset.tk;
        if (k === 'done') { inp.blur(); return; }
        if (k === '⌫') inp.value = inp.value.slice(0, -1); else if (k === '.' && inp.value.includes('.')) return; else inp.value += k;
        dirty = true; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120); inp.dispatchEvent(new Event('input')); })); }
  });
  root.querySelectorAll('input[type=file][data-slot]').forEach(inp => inp.onchange = async () => {
    const slot = JSON.parse(inp.dataset.slot); const files = [...inp.files]; if (!files.length) return;
    toast(files.length > 1 ? `Adding ${files.length} photos…` : 'Adding photo…');
    try { for (const file of files) { const m = await addPhoto(app.ins, slot, file); if (slot.cw && typeof cwAiLabel === 'function') cwAiLabel(m); } await saveNow(); toast(files.length > 1 ? files.length + ' photos saved' : 'Photo saved: ' + app.ins.photos[app.ins.photos.length - 1].label); }
    catch (e) { toast('Could not save that photo. Try again.'); }
    renderTab();
  });
  const crs = root.querySelector('#crsFile'); if (crs) crs.onchange = () => loadCRS(crs.files[0]);
  root.querySelectorAll('[data-todo]').forEach(cb => cb.onchange = async () => { const O = app.ins.data.property.order; O.done = O.done || {}; O.done[cb.dataset.todo] = cb.checked; await saveNow(); });
  root.querySelectorAll('.permitFile').forEach(pmf => pmf.onchange = () => loadPermits(pmf.files[0]));
  root.querySelectorAll('[data-appl]').forEach(b => b.onclick = () => {
    const it = itemOf(b); it.appl = it.appl || {}; const ak = b.dataset.appl; const a = APPLIANCES.find(x => x.k === ak);
    if (!it.appl[ak]) it.appl[ak] = a.qty ? { qty: 1 } : {};
    app.appl = (a.brand || a.qty) ? it.id + ':' + ak : null; save(); renderTab(); if (app.appl) { const e = document.getElementById('appl-edit'); if (e) e.scrollIntoView({ block: 'nearest' }); }
  });
  root.querySelectorAll('[data-applbrand]').forEach(b => b.onclick = () => { const it = itemOf(b); it.appl[b.dataset.ak].brand = b.dataset.applbrand; app.appl = null; save(); renderTab(); });
  root.querySelectorAll('[data-applqty]').forEach(b => b.onclick = () => { const it = itemOf(b); const s = it.appl[b.dataset.ak]; s.qty = Math.max(1, (s.qty || 1) + (+b.dataset.applqty)); save(); renderTab(); });
  root.querySelectorAll('[data-applrm]').forEach(b => b.onclick = () => { const it = itemOf(b); delete it.appl[b.dataset.applrm]; app.appl = null; save(); renderTab(); });
  root.querySelectorAll('[data-appldone]').forEach(b => b.onclick = () => { app.appl = null; renderTab(); });
  root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => openViewer(b.dataset.view));
  const addNote = (id, txt) => { const ins = app.ins; ins.comments[id] = [(ins.comments[id] || '').trim(), txt].filter(Boolean).join(' '); const ta = root.querySelector('#c-' + id); if (ta) ta.value = ins.comments[id]; updateSummary(id); save(); };
  root.querySelectorAll('[data-addnote]').forEach(b => b.onclick = () => { addNote(b.dataset.addnote, b.dataset.text); const box = b.closest('.dk-sugg'); b.remove(); if (box && !box.querySelector('.dk-sg')) box.remove(); toast('Added – read it over in the comment box'); });
  root.querySelectorAll('[data-addallnotes]').forEach(b => b.onclick = () => { const id = b.dataset.addallnotes; root.querySelectorAll(`[data-addnote="${id}"]`).forEach(x => { addNote(id, x.dataset.text); x.remove(); }); const box = b.closest('.dk-sugg'); if (box) box.remove(); else b.remove(); toast('Added – read it over in the comment box'); });
  root.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { const id = b.dataset.toggle; const wasOpen = app.open.has(id); if (wasOpen) app.shiftAt = Date.now(); wasOpen ? app.open.delete(id) : app.open.add(id); saveNow(); renderTab();
    if (!wasOpen) scrollToEl('item-' + id);
    else if (b.closest('.gfoot')) { const key = Object.keys(app.ins.lists).find(k => app.ins.lists[k].some(x => x.id === id)); const add = key && document.getElementById('add-' + key); if (add) { const top = add.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2; window.scrollTo(0, Math.max(0, top)); add.classList.add('flash'); setTimeout(() => add.classList.remove('flash'), 1600); } } });
  root.querySelectorAll('[data-expand]').forEach(b => b.onclick = () => { const l = app.ins.lists[b.dataset.expand]; const all = l.every(x => app.open.has(x.id)); l.forEach(x => all ? app.open.delete(x.id) : app.open.add(x.id)); renderTab(); });
  root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { if (Date.now() - (app.shiftAt || 0) < 700) return; addItem(b.dataset.add, b.dataset.kind, b.dataset.preset); });
  root.querySelectorAll('[data-rename]').forEach(b => b.onclick = () => { app.renaming = b.dataset.rename; renderTab(); const i = document.getElementById('rename-' + app.renaming); if (i) { i.focus(); i.select(); } });
  root.querySelectorAll('[data-renameno]').forEach(b => b.onclick = () => { app.renaming = null; renderTab(); });
  root.querySelectorAll('[data-renameform]').forEach(f => f.onsubmit = e => {
    e.preventDefault(); const it = app.ins.lists[f.dataset.list].find(x => x.id === f.dataset.renameform);
    const v = f.querySelector('input').value.trim(); if (it) { if (v) it.label = v; else delete it.label; }
    app.renaming = null; save(); renderTab(); toast(v ? 'Renamed to ' + v : 'Name reset');
  });
  root.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { app.confirm = 'rm:' + b.dataset.rm; renderTab(); });
  root.querySelectorAll('[data-rmno]').forEach(b => b.onclick = () => { app.confirm = null; renderTab(); });
  root.querySelectorAll('[data-rmyes]').forEach(b => b.onclick = async () => {
    const key = b.dataset.rmlist, id = b.dataset.rmyes; const ins = app.ins;
    const gone = ins.photos.filter(p => p.list === key && p.item === id);
    ins.photos = ins.photos.filter(p => !(p.list === key && p.item === id)); ins.lists[key] = ins.lists[key].filter(x => x.id !== id);
    app.open.delete(id); if (app.appl && app.appl.startsWith(id + ':')) app.appl = null;
    app.confirm = null; app.shiftAt = Date.now(); renderTab(); toast('Removed'); await saveNow();
    for (const p of gone) { try { await DB.del('photos', p.id); thumbCache.delete(p.id); } catch (e) {} }
  });
  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (b.dataset.ret) { const [rt, ra, rg] = b.dataset.ret.split('|'); const sec = SECTIONS.find(s => s.id === rt); const g = sec && sec.groups.find(x => x.id === rg); app.returnTo = { tab: rt, anchor: ra, group: rg, title: g ? g.title : (b.dataset.ret.split('|')[3] || 'where you were') }; } const [tab, anchor, item, group] = b.dataset.go.split('|'); if (item) app.open.add(item); goTab(tab, anchor, group || null); });
  root.querySelectorAll('[data-ovr]').forEach(b => b.onclick = () => {
    if (b.dataset.check) { app.ins.overrides[b.dataset.ovr] = 'Dismissed'; save(); renderTab(); toast('Dismissed – see the list at the bottom to undo'); return; }
    app.ovrOpen = b.dataset.ovr; renderTab(); const i = $('#ovrText'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus({ preventScroll: true }); } });
  root.querySelectorAll('[data-ovrsave]').forEach(b => b.onclick = () => { const r = ($('#ovrText').value || '').trim() || 'Overridden in field'; app.ins.overrides[b.dataset.ovrsave] = r; app.ovrOpen = null; save(); renderTab(); toast('Overridden'); });
  root.querySelectorAll('[data-ovrcancel]').forEach(b => b.onclick = () => { app.ovrOpen = null; renderTab(); });
  root.querySelectorAll('[data-ovrclear]').forEach(b => b.onclick = () => { delete app.ins.overrides[b.dataset.ovrclear]; save(); renderTab(); });
  root.querySelectorAll('[data-starter]').forEach(b => b.onclick = () => { const [id, k] = b.dataset.starter.split('|'); const c = (typeof CMT36 !== 'undefined' ? CMT36 : [])[+k]; const ta = document.getElementById('c-' + id); if (!c || !ta) return;
    ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + c[4]; ta.dispatchEvent(new Event('input')); ta.focus(); const i = ta.value.indexOf('['); if (i >= 0) ta.setSelectionRange(i, ta.value.indexOf(']', i) + 1); toast('Added – fill in the [brackets]'); });
  root.querySelectorAll('[data-comment]').forEach(t => { let before = t.value; t.addEventListener('input', () => { if (before.trim().length >= 15 && !t.value.trim()) offerUndo(app.ins.comments, t.dataset.comment, before); before = t.value || before; app.ins.comments[t.dataset.comment] = t.value; save(); updateSummary(t.dataset.comment); }); });
  root.querySelectorAll('[data-final]').forEach(t => { t.addEventListener('input', () => { app.ins.finals[t.dataset.final] = t.value; save(); const c = document.getElementById('cnt-' + t.dataset.final); const lim = COMMENT_TARGETS.find(x => x.id === t.dataset.final).lim; c.textContent = t.value.length + ' / ' + lim; c.classList.toggle('over', t.value.length > lim); }); });
  root.querySelectorAll('[data-editfinal]').forEach(b => b.onclick = () => { const id = b.dataset.editfinal; app.ins.finals[id] = buildComment(app.ins, COMMENT_TARGETS.find(x => x.id === id)).text; save(); renderTab(); });
  root.querySelectorAll('[data-resetfinal]').forEach(b => b.onclick = () => { delete app.ins.finals[b.dataset.resetfinal]; save(); renderTab(); });
  root.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => { const t = buildComment(app.ins, COMMENT_TARGETS.find(x => x.id === b.dataset.copy)).text; try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast('Copy not available here'); } });
  root.querySelectorAll('[data-export]').forEach(b => b.onclick = () => doExport(b.dataset.export, b));
}
/* Warn when a comment is wiped out, with one-tap undo */
function offerUndo(obj, key, text) {
  document.querySelectorAll('.undo-bar').forEach(e => e.remove());
  const bar = document.createElement('div'); bar.className = 'undo-bar'; bar.setAttribute('role', 'alert');
  bar.innerHTML = `<span>You just erased a comment.</span><button class="btn sm primary">Undo – put it back</button><button class="btn sm">Keep erased</button>`;
  document.body.appendChild(bar);
  const [undo, keep] = bar.querySelectorAll('button');
  undo.onclick = () => { obj[key] = text; bar.remove(); save(); renderTab(); toast('Comment restored'); };
  keep.onclick = () => bar.remove(); setTimeout(() => bar.remove(), 12000);
}
function refreshTitleOnly() { $('#tTitle').textContent = insTitle(app.ins); $('#tAddr').textContent = insAddr(app.ins); }
async function fillThumbs(root) { for (const img of root.querySelectorAll('img[data-pid]')) img.src = await thumbFor(img.dataset.pid); }

/* ---------------- Photo viewer ---------------- */
async function openViewer(pid) {
  const ins = app.ins; const p = ins.photos.find(x => x.id === pid); if (!p) return;
  const rec = await DB.get('photos', pid); const url = rec ? URL.createObjectURL(rec.blob) : '';
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-label="Photo"><img src="${url}" alt="${esc(p.label)}"><div class="body">
    <div class="flabel"><span class="tag">${p.required ? 'UAD required' : 'Photo'}</span><span class="lab">${esc(photoWhere(ins, p))}</span></div>
    <label class="flabel" for="phLabel">Label</label><input class="txt" id="phLabel" value="${esc(p.label)}" maxlength="100">
    <div class="help">The label becomes the photo file name and the caption in SFREP (max 100 characters).</div>
    ${p.extra ? `<label class="dk-walk"><input type="checkbox" id="phRep" ${p.toReport ? 'checked' : ''}> <b>Send to SFREP</b> as an additional photo in this section</label>` : ''}
    <div id="phConfirm"></div>
    ${isSketchPhoto(p) ? '' : `<div class="row"><button class="btn" id="phBlur">▦ Blur part of photo</button>${rec && rec.original ? '<button class="btn" id="phUnblur">Remove blur (use original)</button>' : ''}</div>
    ${rec && rec.original ? '<div class="help">This photo is blurred. The blurred copy goes to SFREP and the report; the unblurred original stays on this iPad and goes only in the workfile package.</div>' : ''}`}
    <div class="row"><button class="btn primary" id="phSave">Save label</button><button class="btn danger" id="phDel">Delete photo</button><button class="btn" id="phClose">Close</button></div></div></div>`;
  document.body.appendChild(bg);
  const close = () => { URL.revokeObjectURL(url); bg.remove(); renderTab(); };
  bg.onclick = e => { if (e.target === bg) close(); };
  $('#phClose', bg).onclick = close;
  const rp = $('#phRep', bg); if (rp) rp.onchange = () => { p.toReport = rp.checked; save(); toast(rp.checked ? 'This photo will go to SFREP' : 'Workfile only'); };
  $('#phSave', bg).onclick = () => { p.label = $('#phLabel', bg).value.trim() || p.label; p.autoLabel = false; save(); toast('Label saved'); close(); };
  const bb = $('#phBlur', bg); if (bb) bb.onclick = () => { if (!rec) return toast('This photo is not on this iPad'); close(); openBlurEditor(pid); };
  const ub = $('#phUnblur', bg); if (ub) ub.onclick = async () => { await unblurPhoto(pid); close(); openViewer(pid); };
  $('#phDel', bg).onclick = () => {
    $('#phConfirm', bg).innerHTML = `<div class="confirm">Delete this photo? <button class="btn danger solid sm" id="phDelYes">Delete</button></div>`;
    $('#phDelYes', bg).onclick = async () => { await DB.del('photos', pid); ins.photos = ins.photos.filter(x => x.id !== pid); await saveNow(); toast('Photo deleted'); close(); };
  };
}
/* ---------- blur tool: hide people, family photos, artwork, religious items, graffiti, personal items ---------- */
// The blurred copy replaces the photo (SFREP, report, thumbnails). The unblurred original is kept in the same record
// (rec.original) and is exported only in the workfile package. The blur is pixelate + box blur, so it cannot be undone from the file.
const isSketchPhoto = p => p && p.sec === 'interior' && p.field === 'sketchImg';
function boxBlur(id, w, h, r) { // separable running-sum box blur on ImageData, in place
  if (r < 1) return; const d = id.data, tmp = new Uint8ClampedArray(d.length), n = r * 2 + 1;
  for (let y = 0; y < h; y++) { const row = y * w * 4; for (let c = 0; c < 3; c++) { let sum = 0;
    for (let i = -r; i <= r; i++) sum += d[row + Math.min(w - 1, Math.max(0, i)) * 4 + c];
    for (let x = 0; x < w; x++) { tmp[row + x * 4 + c] = sum / n; sum += d[row + Math.min(w - 1, x + r + 1) * 4 + c] - d[row + Math.max(0, x - r) * 4 + c]; } }
    for (let x = 0; x < w; x++) tmp[row + x * 4 + 3] = 255; }
  for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[Math.min(h - 1, Math.max(0, i)) * w * 4 + x * 4 + c];
    for (let y = 0; y < h; y++) { d[y * w * 4 + x * 4 + c] = sum / n; sum += tmp[Math.min(h - 1, y + r + 1) * w * 4 + x * 4 + c] - tmp[Math.max(0, y - r) * w * 4 + x * 4 + c]; } }
}
function makeBlurred(img, W, H) { // pixelate (downscale, upscale) then box blur
  const blk = Math.max(12, Math.round(Math.max(W, H) / 55));
  const sm = document.createElement('canvas'); sm.width = Math.max(1, Math.round(W / blk)); sm.height = Math.max(1, Math.round(H / blk));
  const sg = sm.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(img, 0, 0, sm.width, sm.height);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, W, H);
  const id = g.getImageData(0, 0, W, H); boxBlur(id, W, H, Math.round(blk / 2)); g.putImageData(id, 0, 0); return out;
}
async function thumbFromCanvas(c) { const s = Math.min(1, 360 / Math.max(c.width, c.height)); const t = document.createElement('canvas'); t.width = Math.round(c.width * s); t.height = Math.round(c.height * s); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); return t.toDataURL('image/jpeg', 0.72); }
async function blobImage(blob) { const u = URL.createObjectURL(blob); try { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('The photo could not be opened')); i.src = u; }); } finally { setTimeout(() => URL.revokeObjectURL(u), 1000); } }
async function unblurPhoto(pid) {
  const ins = app.ins; const p = ins.photos.find(x => x.id === pid); const rec = await DB.get('photos', pid); if (!p || !rec || !rec.original) return;
  const img = await blobImage(rec.original); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
  rec.blob = rec.original; delete rec.original; rec.thumb = await thumbFromCanvas(c); await DB.put('photos', rec);
  thumbCache.set(pid, rec.thumb); delete p.blurred; await saveNow(); toast('Blur removed – the original photo is back');
}
async function openBlurEditor(pid) {
  const ins = app.ins; const p = ins.photos.find(x => x.id === pid); const rec = await DB.get('photos', pid); if (!p || !rec) return;
  let img; try { img = await blobImage(rec.blob); } catch (e) { return toast(e.message); }
  const W = img.naturalWidth, H = img.naturalHeight; const blurred = makeBlurred(img, W, H);
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H; const mg = mask.getContext('2d');
  const SIZES = { s: 0.025, m: 0.05, l: 0.1 }; let tool = 'm', strokes = [], cur = null;
  const ed = document.createElement('div'); ed.className = 'blur-ed'; ed.setAttribute('role', 'dialog'); ed.setAttribute('aria-label', 'Blur part of photo');
  ed.innerHTML = `<div class="blur-bar"><b>Blur:</b>
    <button class="btn sm" data-bt="s">Brush small</button><button class="btn sm" data-bt="m">Brush medium</button><button class="btn sm" data-bt="l">Brush large</button><button class="btn sm" data-bt="rect">▭ Box</button>
    <span class="sp"></span><button class="btn sm" id="blUndo">↶ Undo</button><button class="btn sm" id="blReset">Reset</button><button class="btn sm" id="blCancel">Cancel</button><button class="btn primary sm" id="blSave">Save blur</button></div>
    <div class="blur-help">Paint over people, family photos, artwork, religious items, graffiti or personal items with your finger, or choose Box and drag a rectangle. The original stays in the workfile only.</div>
    <div class="blur-wrap"><canvas></canvas></div>`;
  document.body.appendChild(ed);
  const cv = ed.querySelector('canvas'), g = cv.getContext('2d'); const tmp = document.createElement('canvas'); let sc = 1;
  const fit = () => { const wr = ed.querySelector('.blur-wrap'); sc = Math.min(wr.clientWidth / W, wr.clientHeight / H); cv.width = Math.max(1, Math.round(W * sc)); cv.height = Math.max(1, Math.round(H * sc)); tmp.width = cv.width; tmp.height = cv.height; render(); };
  const paint = (k, s) => { // draw a stroke onto the full-size mask
    mg.fillStyle = mg.strokeStyle = '#000';
    if (s.t === 'rect') { const x = Math.min(s.a[0], s.b[0]), y = Math.min(s.a[1], s.b[1]); mg.fillRect(x, y, Math.abs(s.b[0] - s.a[0]), Math.abs(s.b[1] - s.a[1])); return; }
    mg.lineWidth = s.r * 2; mg.lineCap = mg.lineJoin = 'round'; mg.beginPath(); mg.moveTo(s.pts[0][0], s.pts[0][1]); s.pts.forEach(q => mg.lineTo(q[0], q[1])); if (s.pts.length === 1) mg.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]); mg.stroke(); };
  const rebuild = () => { mg.clearRect(0, 0, W, H); strokes.forEach(s => paint(mg, s)); if (cur) paint(mg, cur); };
  let raf = 0; const render = () => { raf = 0; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    const t = tmp.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, tmp.width, tmp.height); t.drawImage(blurred, 0, 0, tmp.width, tmp.height);
    t.globalCompositeOperation = 'destination-in'; t.drawImage(mask, 0, 0, tmp.width, tmp.height); t.globalCompositeOperation = 'source-over'; g.drawImage(tmp, 0, 0);
    if (cur && cur.t === 'rect') { g.strokeStyle = '#ff7a00'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(Math.min(cur.a[0], cur.b[0]) * sc, Math.min(cur.a[1], cur.b[1]) * sc, Math.abs(cur.b[0] - cur.a[0]) * sc, Math.abs(cur.b[1] - cur.a[1]) * sc); g.setLineDash([]); } };
  const later = () => { if (!raf) raf = requestAnimationFrame(render); };
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / sc, (e.clientY - r.top) / sc]; };
  const setTool = t => { tool = t; ed.querySelectorAll('[data-bt]').forEach(b => b.classList.toggle('primary', b.dataset.bt === t)); };
  setTool('m');
  ed.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => setTool(b.dataset.bt));
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const q = at(e);
    cur = tool === 'rect' ? { t: 'rect', a: q, b: q } : { t: 'brush', r: Math.max(W, H) * SIZES[tool] / 2, pts: [q] }; if (cur.t === 'brush') paint(mg, cur); later(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; const q = at(e); if (cur.t === 'rect') { cur.b = q; rebuild(); } else { cur.pts.push(q); paint(mg, { ...cur, pts: cur.pts.slice(-2) }); } later(); });
  const up = () => { if (!cur) return; if (cur.t !== 'rect' || (Math.abs(cur.b[0] - cur.a[0]) > 3 && Math.abs(cur.b[1] - cur.a[1]) > 3)) strokes.push(cur); cur = null; rebuild(); later(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.style.touchAction = 'none';
  const shut = () => { window.removeEventListener('resize', fit); ed.remove(); renderTab(); };
  ed.querySelector('#blUndo').onclick = () => { if (!strokes.length) return toast('Nothing to undo'); strokes.pop(); rebuild(); later(); };
  ed.querySelector('#blReset').onclick = () => { strokes = []; rebuild(); later(); };
  ed.querySelector('#blCancel').onclick = shut;
  ed.querySelector('#blSave').onclick = async () => {
    if (!strokes.length) return toast('Paint over the part to blur first');
    const btn = ed.querySelector('#blSave'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d'); og.drawImage(img, 0, 0);
      const bl = document.createElement('canvas'); bl.width = W; bl.height = H; const bg2 = bl.getContext('2d'); bg2.drawImage(blurred, 0, 0); bg2.globalCompositeOperation = 'destination-in'; bg2.drawImage(mask, 0, 0); og.drawImage(bl, 0, 0);
      const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', 0.86)); if (!blob) throw new Error('The blurred photo could not be made');
      const fresh = await DB.get('photos', pid) || rec; if (!fresh.original) fresh.original = fresh.blob;
      fresh.blob = blob; fresh.thumb = await thumbFromCanvas(out); await DB.put('photos', fresh);
      thumbCache.set(pid, fresh.thumb); p.blurred = true; await saveNow(); toast('Blur saved – the original is kept for the workfile only'); shut(); openViewer(pid);
    } catch (e) { btn.disabled = false; btn.textContent = 'Save blur'; toast('Could not save: ' + (e.message || e)); }
  };
  window.addEventListener('resize', fit); requestAnimationFrame(fit);
}
function photoWhere(ins, p) {
  if (p.list) { const l = ins.lists[p.list] || []; const i = l.findIndex(x => x.id === p.item); return LISTS[p.list].title + (i >= 0 ? ' › ' + LISTS[p.list].name(l[i], i, l) : ''); }
  const s = SECTIONS.find(x => x.id === p.sec); return (s ? s.title : '') + (p.extra ? ' › workfile photo' : '');
}
function photoTab(p) {
  if (p.sec) return p.sec;
  for (const s of SECTIONS) for (const g of s.groups) if (g.list === p.list) return s.id;
  return 'photos';
}

/* ---------------- Gallery ---------------- */
function renderGallery() {
  const ins = app.ins; const issues = computeIssues(ins).filter(x => x.photo && !ins.overrides[x.key]);
  const secs = SECTIONS.map(s => {
    const ph = ins.photos.filter(p => photoTab(p) === s.id);
    const miss = issues.filter(x => x.tab === s.id);
    if (!ph.length && !miss.length) return '';
    return `<div class="gal-sec"><h3>${esc(s.title)} · ${ph.length}</h3>
      ${miss.length ? `<div class="missing-photos">${miss.map(m => `<button class="${m.sev === 'Recommended' ? 'sug' : ''}" data-go="${m.tab}|${m.anchor}|${m.item || ''}|${m.group || ''}" data-ret="photos|||All Photos">${m.sev === 'Recommended' ? 'Suggested: ' : 'Missing: '}${esc(m.label)} ›</button>`).join('')}</div>` : ''}
      <div class="gal">${ph.map(p => `<button class="thumb ${p.required ? 'req' : ''} ${p.extra && p.toReport ? 'rep' : ''}" data-view="${p.id}"><img data-pid="${p.id}" alt=""><span>${esc(p.label)}</span></button>`).join('')}</div></div>`;
  }).join('');
  const req = issues.filter(x => x.sev === 'Photo').length;
  return `<section class="group open"><div class="ghead static"><span class="gtitle">All photos</span><span class="count">${ins.photos.length} taken · ${req} required missing</span></div>
    ${req ? '' : '<div class="exp"><div class="info">All required photos are taken.</div></div>'}${secs || '<div class="exp"><p>No photos yet. Use the camera buttons in each tab.</p></div>'}</section>`;
}

/* ---------------- Summaries ---------------- */
function renderSummaries() {
  const ins = app.ins;
  const rows = COMMENT_TARGETS.map(t => {
    if (t.id === 'project' && !IS_HOA(ins)) return '';
    if (t.id === 'adu' && !ins.lists.adus.length) return ''; if (t.id === 'outbuilding' && !ins.lists.outbuildings.length) return '';
    const r = buildComment(ins, t); const editing = ins.finals[t.id] !== undefined;
    return `<div class="sum" id="sum-${t.id}"><h3>${esc(t.title)}<span class="fid">${t.fid} · max ${t.lim.toLocaleString()}</span></h3>
      ${editing ? `<textarea class="txt" spellcheck="true" autocorrect="on" autocapitalize="sentences" data-final="${t.id}" style="min-height:160px">${esc(ins.finals[t.id])}</textarea>
        <div class="limit ${r.over ? 'over' : ''}" id="cnt-${t.id}">${r.text.length} / ${t.lim}</div>
        <div class="row"><button class="btn sm" data-resetfinal="${t.id}">Go back to automatic summary</button><button class="btn sm" data-copy="${t.id}">Copy</button></div>`
      : `<div class="auto ${r.text ? '' : 'empty'}" id="auto-${t.id}">${esc(r.text || 'Nothing checked yet for this section.')}</div>
        <div class="limit ${r.over ? 'over' : ''}" id="cnt-${t.id}">${r.text.length} / ${t.lim}</div>
        ${r.dropped.length ? `<div class="dropped">Left out to stay under the limit (kept in your workfile): ${esc(r.dropped.join(' '))}</div>` : ''}
        <label class="flabel" for="c-${t.id}"><span class="tag">Optional</span><span class="lab">Your added comment</span></label>
        <textarea class="txt" spellcheck="true" autocorrect="on" autocapitalize="sentences" id="c-${t.id}" data-comment="${t.id}" placeholder="Added after the checkbox summary">${esc(ins.comments[t.id] || '')}</textarea>${starterChips(t.id)}
        <div class="row"><button class="btn sm" data-editfinal="${t.id}">Edit final wording</button><button class="btn sm" data-copy="${t.id}">Copy</button></div>
        ${typeof dkNoteSugg === 'function' ? dkNoteSugg(ins, t.id) : ''}`}
    </div>`;
  }).join('');
  const rq = [...ins.lists.kitchens.map((k, i) => [LISTS.kitchens.name(k, i), roomQualityComment('kitchens', k)]), ...ins.lists.baths.map((b, i) => [LISTS.baths.name(b, i, ins.lists.baths), roomQualityComment('baths', b)])];
  return `<section class="group open"><div class="ghead static"><span class="gtitle">UAD commentary</span></div><div class="exp"><p>Each summary is written from your checkboxes, then your own comment is added. If the total runs over the UAD character limit, the least important sentences are left out first. Edit the final wording any time.</p></div>${rows}</section>
    <section class="group open"><div class="ghead static"><span class="gtitle">Kitchen &amp; bath quality comments</span></div>${rq.map(([n, t]) => `<div class="sum"><h3>${esc(n)}</h3><div class="auto ${t ? '' : 'empty'}">${esc(t || 'No details checked yet.')}</div></div>`).join('')}</section>`;
}
function updateSummary(id) {
  const t = COMMENT_TARGETS.find(x => x.id === id); const r = buildComment(app.ins, t);
  const a = document.getElementById('auto-' + id); if (a) { a.textContent = r.text || 'Nothing checked yet for this section.'; a.classList.toggle('empty', !r.text); }
  const c = document.getElementById('cnt-' + id); if (c) { c.textContent = r.text.length + ' / ' + t.lim; c.classList.toggle('over', r.over); }
}

/* ---------------- Needs Attention ---------------- */
function listHome(key) { for (const s of SECTIONS) for (const g of s.groups) if (g.list === key) return { tab: s.id, group: g.id }; return { tab: 'property', group: null }; }
function itemIssues(key, it, i, ins = app.ins) {
  const def = LISTS[key], list = ins.lists[key], out = []; const name = def.name(it, i, list); const h = listHome(key);
  def.fields.forEach(f => {
    if (!isShown(f, it, ins) || f.t === 'info') return;
    const empty = f.t === 'appliances' ? !(it[f.k] && Object.keys(it[f.k]).length) : isEmpty(it[f.k]);
    if (isReq(f, it, ins) && empty) out.push({ key: `${key}:${it.id}:${f.k}`, sev: 'Required', label: `${name}: ${f.l}`, tab: h.tab, group: h.group, anchor: `f-${key}-${it.id}-${f.k}`, item: it.id });
    if (f.lim && typeof it[f.k] === 'string' && it[f.k].length > f.lim) out.push({ key: `${key}:${it.id}:${f.k}:lim`, sev: 'Required', label: `${name}: ${f.l} is over ${f.lim} characters`, tab: h.tab, group: h.group, anchor: `f-${key}-${it.id}-${f.k}`, item: it.id, noOverride: true });
  });
  itemPhotoSlots(key, it, i, ins).forEach(s => {
    if ((s.required || s.recommended) && !photosInSlot(ins, s).length) out.push({ key: `${key}:${it.id}:photo:${s.slot}`, sev: s.required ? 'Photo' : 'Recommended', photo: true, label: `${s.label} photo`, tab: h.tab, group: h.group, anchor: `f-${key}-${it.id}-photo-${s.slot}`, item: it.id });
  });
  return out;
}
const _issueCache = { ver: null, ins: null, val: null };
function computeIssues(ins) {
  const sig = ins.updated + ':' + ins.photos.length + ':' + Object.keys(ins.overrides).length;
  if (_issueCache.ins === ins && _issueCache.ver === sig) return _issueCache.val;
  const out = [];
  SECTIONS.forEach(sec => sec.groups.forEach(g => {
    if (!groupShown(g, sec, ins)) return;
    g.fields.forEach(f => {
      if (f.link) return;
      const d = ins.data[sec.id]; if (!isShown(f, d, ins) || ['calc', 'info', 'crs', 'permits', 'review'].includes(f.t)) return;
      const req = isReq(f, d, ins);
      if (f.t === 'photo') {
        const has = photosInSlot(ins, { sec: sec.id, field: f.k }).length > 0;
        if (!has && (req || f.recommended)) out.push({ key: `${sec.id}:${f.k}`, sev: req ? 'Photo' : 'Recommended', photo: true, label: `${f.l} photo`, tab: sec.id, group: g.id, anchor: `f-${sec.id}-${f.k}` });
        return;
      }
      if (req && isEmpty(d[f.k])) out.push({ key: `${sec.id}:${f.k}`, sev: 'Required', label: f.l, tab: sec.id, group: g.id, anchor: `f-${sec.id}-${f.k}` });
      if (f.lim && typeof d[f.k] === 'string' && d[f.k].length > f.lim) out.push({ key: `${sec.id}:${f.k}:lim`, sev: 'Required', label: `${f.l} is over ${f.lim} characters`, tab: sec.id, group: g.id, anchor: `f-${sec.id}-${f.k}`, noOverride: true });
    });
    if (g.list && (!g.listShow || g.listShow(ins.data[sec.id], ins))) ins.lists[g.list].forEach((it, i) => out.push(...itemIssues(g.list, it, i, ins)));
  }));
  const L2 = ins.lists, d = ins.data;
  if (!L2.baths.some(b => b.kind === 'FullBathroom')) out.push({ key: 'nobath', sev: 'Check', label: 'No full bath added', tab: 'interior', group: 'baths', anchor: 'grp-baths' });
  if (!L2.bedrooms.length) out.push({ key: 'nobed', sev: 'Check', label: 'No bedrooms added', tab: 'interior', group: 'beds', anchor: 'grp-beds' });
  if (!L2.levels.length) out.push({ key: 'nolevel', sev: 'Required', label: 'No levels added', tab: 'interior', group: 'levels', anchor: 'grp-levels' });
  if (!unitList(ins, 'ceilS').length) out.push({ key: 'noceil', sev: 'Required', label: 'Ceiling type: add a ceiling type to at least one room', tab: 'interior', group: 'rooms', anchor: 'grp-rooms' });
  if (!unitList(ins, 'flooring').length) out.push({ key: 'nofloor', sev: 'Required', label: 'Flooring: add flooring to your rooms, baths or kitchen', tab: 'interior', group: 'rooms', anchor: 'grp-rooms' });
  const area = { Site: ['site', 'siteDefects'], 'Dwelling Exterior': ['exterior', 'extDefects'], 'Unit Interior': ['interior', 'intDefects'], 'Subject Property Amenities': ['amenities', 'amenDefects'], 'Vehicle Storage': ['garage', 'vsDefects'] };
  Object.entries(area).forEach(([a, [sec, k]]) => {
    const has = L2.defects.some(x => x.area === a);
    if (d[sec][k] === true && !has) out.push({ key: `def:${a}`, sev: 'Check', label: `${a} defects marked Yes, but none described on the Defects tab`, tab: 'defects', group: 'defList', anchor: 'grp-defList' });
    if (has && d[sec][k] !== true) out.push({ key: `defind:${a}`, sev: 'Required', label: `${a}: a defect is described, so “defects present” should be Yes`, tab: sec, anchor: `f-${sec}-${k}`, group: findField(sec, k).g ? findField(sec, k).g.id : null, noOverride: true });
  });
  { const P = ins.data.property.permits; if (P) { (P.holds || []).forEach((h, i) => out.push({ key: 'hold:' + i, sev: 'Check', label: `Parcel hold on record (County): ${h} – may need to be cleared before the property is marketable`, tab: 'property', group: 'crs', anchor: 'grp-crs' }));
    (P.accela || []).filter(a => a.dept === 'E' && !/closed|final/i.test(a.status || '')).forEach(a => out.push({ key: 'enf:' + a.num, sev: 'Check', label: `Open enforcement case ${a.num}: ${a.project || ''}`, tab: 'property', group: 'crs', anchor: 'grp-crs' })); } }
  if (d.property.project === true && d.property.condotel === true) out.push({ key: 'condotel', sev: 'Check', label: 'Condotel: most lenders (and Fannie Mae / Freddie Mac) treat condotels as ineligible. Confirm with your client and describe the rental program in the project commentary.', tab: 'property', group: 'ptype', anchor: 'f-property-condotel' });
  { const vc = d.condition.valCond || []; const act = L2.defects.filter(x => x.action && x.action !== 'None');
    if (vc.includes('AsIs') && vc.length > 1) out.push({ key: 'vc:mix', sev: 'Required', label: 'Market value condition: “As Is” cannot be combined with a “Subject to” condition', tab: 'condition', group: 'overall', anchor: 'f-condition-valCond', noOverride: true });
    if (vc.includes('AsIs') && act.length) out.push({ key: 'vc:def', sev: 'Required', label: `Market value condition is “As Is”, but ${act.length} defect${act.length > 1 ? 's recommend' : ' recommends'} ${listJoin([...new Set(act.map(x => x.action.toLowerCase()))])}. Use “Subject to…” or change the defect action.`, tab: 'condition', group: 'overall', anchor: 'f-condition-valCond', noOverride: true });
    const eaTopics = new Set((L2.eas || []).map(x => x.topic));
    if (['No', 'Unknown'].includes(d.interview.addPermit) && !eaTopics.has('Permits')) out.push({ key: 'ea:permit', sev: 'Check', label: 'Additions / conversions are not confirmed as permitted: consider an extraordinary assumption (Interview tab).', tab: 'interview', group: 'ea', anchor: 'grp-ea' });
    if (L2.defects.some(x => x.action === 'Inspection') && !eaTopics.has('Defect / condition')) out.push({ key: 'ea:insp', sev: 'Check', label: 'A defect recommends inspection: consider an extraordinary assumption or “Subject to Inspection”.', tab: 'interview', group: 'ea', anchor: 'grp-ea' });
    if (vc.includes('SubjectToCompletionPerPlans') && !eaTopics.has('Proposed construction / plans')) out.push({ key: 'ea:plans', sev: 'Check', label: 'Value is subject to completion per plans: add a hypothetical condition for the proposed construction.', tab: 'interview', group: 'ea', anchor: 'grp-ea' });
    if (vc.includes('SubjectToRepair') && !eaTopics.has('Repairs to be completed')) out.push({ key: 'ea:rep', sev: 'Check', label: 'Value is subject to repair: add a hypothetical condition describing the repairs.', tab: 'interview', group: 'ea', anchor: 'grp-ea' }); }
  if (ins.sketch && Array.isArray(ins.sketch.labelIds)) { const ids = new Set(ins.sketch.labelIds); ['bedrooms', 'baths', 'kitchens', 'wetbars', 'rooms'].forEach(k => (ins.lists[k] || []).forEach((it, i) => { if (it.fromSketch && !ids.has(it.fromSketch)) out.push({ key: 'skroom:' + it.id, sev: 'Check', label: `${LISTS[k].name(it, i, ins.lists[k])} came from a sketch label that was removed – remove the room here, or put the label back on the sketch.`, tab: 'interior', group: listHome(k).group, anchor: 'grp-' + listHome(k).group }); })); }
  if (ins.sketch && ins.sketch.areaCount && (!ins.sketch.imageAt || ins.sketch.imageAt + 5000 < ins.sketch.updated)) out.push({ key: 'skimg:' + Math.floor((ins.sketch.updated || 0) / 60000), sev: 'Check', label: 'The sketch image is missing or older than the drawing: open ✏️ Sketch and tap “Back to inspection” to refresh it before exporting.', tab: 'interior', group: 'unit', anchor: 'f-interior-sketchRev' });
  wordFlags(ins).forEach(w => out.push({ key: 'word:' + w.where + ':' + w.word, sev: 'Check', label: `Wording: “${w.word}” in ${w.where} may be flagged in SFREP or by reviewers (fair housing / bias wording). Consider rephrasing.`, tab: w.tab, group: w.group || null, anchor: w.anchor || '', item: w.item || null }));
  measureReminders(ins).forEach(m => out.push({ key: 'measure:' + m, sev: 'Check', label: `Measure for SFREP: ${m}`, tab: 'attention', anchor: '' }));
  COMMENT_TARGETS.forEach(t => { const r = buildComment(ins, t); const br = (r.text.match(/\[[^\]\n]{1,80}\]/) || [])[0]; if (br) out.push({ key: `br:${t.id}`, sev: 'Required', label: `${t.title}: fill in ${br}`, tab: 'summaries', group: null, anchor: 'sum-' + t.id }); });
  COMMENT_TARGETS.forEach(t => { const r = buildComment(ins, t); if (r.over) out.push({ key: `lim:${t.id}`, sev: 'Required', label: `${t.title} is over ${t.lim} characters`, tab: 'summaries', anchor: 'sum-' + t.id, noOverride: true }); });
  _issueCache.ins = ins; _issueCache.ver = sig; _issueCache.val = out;
  return out;
}
// Words that bias / fair-housing checkers commonly flag, plus obvious dictation slips
const FLAG_RX = new RegExp('\\b(' + [
  // Fannie Mae / Freddie Mac unacceptable subjective terms
  'pride of ownership', 'mature', '(?:good|poor|bad|nice|declining) (?:neighborhood|area|location)', '(?:un)?desirable (?:neighborhood|area|location)', 'desirable', 'undesirable', 'crime[- ]ridden', 'crime', 'criminal\\w*',
  // safety / exclusivity language
  'safe(?:ty)? (?:neighborhood|area|community|street)', 'unsafe', 'dangerous', 'gangs?', 'ghetto', 'exclusive', 'prestigious', 'upscale', 'elite',
  // protected classes: national origin, race, religion, familial status, age, disability, sex
  'european', 'french', 'italian', 'spanish', 'asian', 'african', 'mexican', 'hispanic', 'latino', 'ethnic\\w*', 'immigrant\\w*', 'minorit(?:y|ies)', 'integrated', 'diverse',
  'church\\w*', 'synagogue', 'mosque', 'christian', 'jewish', 'muslim',
  'family[- ]friendly', 'young famil(?:y|ies)', 'families with children', 'kids', 'singles', 'retirees', 'elderly', 'seniors',
  'handicap(?:ped)?', 'wheelchair[- ]bound', 'bachelor', 'man cave', 'master (?:bed(?:room)?|bath|suite)',
  // dictation slips seen so far
  'terror\\w*'
].join('|') + ')\\b', 'gi');
/* live warning under a comment box while she types or dictates */
function wordWarn(t) { const w = [...new Set((String(t || '').match(FLAG_RX) || []).map(x => x.toLowerCase()))]; return w.length ? `Avoid ${w.map(x => '“' + esc(x) + '”').join(', ')} – reviewers and SFREP treat ${w.length > 1 ? 'these words' : 'this word'} as biased or subjective.` : ''; }
document.addEventListener('input', e => { const t = e.target; if (t.tagName !== 'TEXTAREA') return; const ww = t.parentElement && t.parentElement.querySelector('.wordwarn'); if (ww) ww.innerHTML = wordWarn(t.value); });
function wordFlags(ins) {
  const out = []; const seen = new Set();
  const scan = (text, where, tab, group, anchor, item) => { (String(text || '').match(FLAG_RX) || []).forEach(m => { const k = where + m.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ word: m, where, tab, group, anchor, item }); } }); };
  COMMENT_TARGETS.forEach(t => scan(buildComment(ins, t).text, t.title, 'summaries', null, 'sum-' + t.id));
  SECTIONS.forEach(sec => sec.groups.forEach(g => g.fields.forEach(f => { if ((f.t === 'note' || f.t === 'text') && !f.link) scan(ins.data[sec.id][f.k], f.l, sec.id, g.id, `f-${sec.id}-${f.k}`); })));
  Object.keys(LISTS).forEach(k => ins.lists[k].forEach((it, i) => { LISTS[k].fields.forEach(f => { if (f.t === 'note' || f.t === 'text') scan(it[f.k], LISTS[k].name(it, i, ins.lists[k]) + ' – ' + f.l, listHome(k).tab, listHome(k).group, `f-${k}-${it.id}-${f.k}`, it.id); }); if (k === 'kitchens' || k === 'baths') scan(roomQualityComment(k, it), LISTS[k].name(it, i, ins.lists[k]) + ' – quality comment', listHome(k).tab, listHome(k).group, 'item-' + it.id, it.id); }));
  return out;
}
function measureReminders(ins) {
  const m = [];
  ins.lists.outdoorLiving.forEach(o => { if (['Deck', 'Balcony', 'Portico', 'Porch', 'Veranda', 'Roof Deck', 'Patio'].includes(o.type)) m.push(o.type); });
  if ((ins.data.amenities.outdoor || []).includes('Gazebo')) m.push('Gazebo');
  if (ins.data.garage.hasGarage && ins.data.garage.garShared !== true) m.push('Garage');
  ins.lists.outbuildings.forEach(o => m.push(LISTS.outbuildings.name(o)));
  ins.lists.adus.forEach((a, i) => m.push(LISTS.adus.name(a, i)));
  ins.lists.noncont.forEach((n, i) => m.push(LISTS.noncont.name(n, i)));
  if (ins.data.site.waterPrivate) m.push('Water frontage (linear ft.)');
  return m;
}
function countRequired(ins) {
  let n = 0; SECTIONS.forEach(sec => sec.groups.forEach(g => g.fields.forEach(f => { const d = ins.data[sec.id]; if (!f.link && isShown(f, d, ins) && isReq(f, d, ins)) n++; })));
  Object.keys(LISTS).forEach(k => ins.lists[k].forEach(it => LISTS[k].fields.forEach(f => { if (isShown(f, it, ins) && isReq(f, it, ins)) n++; })));
  return n;
}
function renderAttention() {
  const ins = app.ins; const all = computeIssues(ins);
  const open = all.filter(x => !ins.overrides[x.key]), done = all.filter(x => ins.overrides[x.key]);
  const order = { Required: 0, Photo: 1, Check: 2, Recommended: 3 };
  open.sort((a, b) => order[a.sev] - order[b.sev] || ALL_TABS_FULL().findIndex(t => t.id === a.tab) - ALL_TABS_FULL().findIndex(t => t.id === b.tab));
  const tabName = id => (ALL_TABS_FULL().find(t => t.id === id) || {}).title || '';
  const sevName = { Required: 'Required', Photo: 'Required photo', Check: 'Check', Recommended: 'Suggested photo' };
  const row = (x, over) => `<div class="att ${over ? 'overridden' : ''}"><span class="sev ${x.sev}">${sevName[x.sev]}</span>
    <div class="what">${esc(x.label)}<small>${esc(tabName(x.tab))}${over ? ' · overridden: ' + esc(ins.overrides[x.key]) : ''}</small></div>
    ${x.tab !== 'attention' ? `<button class="btn sm primary" data-go="${x.tab}|${x.anchor}|${x.item || ''}|${x.group || ''}" data-ret="attention|||Needs Attention">Go</button>` : ''}
    ${over ? `<button class="btn sm" data-ovrclear="${esc(x.key)}">Undo override</button>` : x.noOverride ? '' : `<button class="btn sm" data-ovr="${esc(x.key)}" ${x.sev === 'Check' || x.sev === 'Recommended' ? 'data-check="1"' : ''}>${x.sev === 'Check' || x.sev === 'Recommended' ? 'Dismiss' : 'Override'}</button>`}
    ${app.ovrOpen === x.key ? `<div class="ovr"><input class="txt" id="ovrText" placeholder="Reason (e.g. owner would not allow photo)"><button class="btn sm primary" data-ovrsave="${esc(x.key)}">Save override</button><button class="btn sm" data-ovrcancel="1">Cancel</button></div>` : ''}</div>`;
  const req = open.filter(x => x.sev === 'Required' || x.sev === 'Photo').length;
  return `<section class="group open"><div class="ghead static"><span class="gtitle">Needs attention</span><span class="count">${req} required · ${open.length - req} to review</span></div>
    ${open.length ? open.map(x => row(x, false)).join('') : '<div class="exp"><div class="info">Everything required is complete. Review your photos, then export.</div></div>'}</section>
    ${done.length ? `<section class="group open"><div class="ghead static"><span class="gtitle">Overridden / dismissed</span><span class="count">${done.length}</span></div>${done.map(x => row(x, true)).join('')}</section>` : ''}`;
}

/* ---------------- Export tab ---------------- */
function renderExport() {
  const ins = app.ins; const req = computeIssues(ins).filter(x => !ins.overrides[x.key] && (x.sev === 'Required' || x.sev === 'Photo')).length;
  return `<section class="group open"><div class="ghead static"><span class="gtitle">Save & export</span></div>
    <div class="exp"><div class="${DB.persistent ? 'info' : 'warn-box'}">${DB.persistent ? 'Everything is saved on this iPad as you work, with or without a signal. Export when you are back on Wi-Fi or have a USB-C drive plugged in.' : 'This browser is not saving to the iPad. Export now so nothing is lost.'}</div>
      ${req ? `<div class="warn-box">${req} required item${req === 1 ? ' is' : 's are'} still open. You can export anyway; the notes will list them.</div>` : ''}</div>
    <div class="exp"><h3>Workfile package</h3><p>One .zip for your desktop workfile: readable inspection notes (open in any browser), the SFREP import file with its photos (SFREP › Images), the workfile-only photos (Photos), each photo once, and a backup you can load back into this app for a revision.</p>
      <div class="row"><button class="btn primary" data-export="workfile">Export workfile package</button></div></div>
    <div class="exp"><h3>SFREP import file</h3><p>A UAD 3.6 .zip (XML plus Images folder) for Appraise-It Pro: Home → Import Forms. Square footage is left blank for you to enter from your sketch.</p>
      <div class="row"><button class="btn cyan" data-export="sfrep">Export SFREP file</button></div></div>
    <div class="exp"><h3>Where files go</h3><p>Export opens the share sheet. Choose <b>Save to Files</b>, then <b>OneDrive → Inspections</b>. It appears on your PC once the iPad is on Wi-Fi.</p></div>
  </section>`;
}

/* UAD 3.6 starter comments under each iPad comment box (Oct 22 2026; the same list as the Octopus's Common responses, cmt36data.js) */
const STARTER_FID = { accessDesc: ['4.024'], siteFeatures: ['4.066'], siteInfluence: ['4.030', '4.049'], view: ['4.042'], disaster: ['5.001'], energy: ['6.015', '6.016'], exterior: ['8.061'], interior: ['10.061'], adu: ['10.061'],
  outbuilding: ['12.025'], functional: ['11.001'], vehicle: ['13.010'], amenities: ['14.011'], assignment: ['2.061'], qc: ['15.010'] };
function starterChips(id) { const F = STARTER_FID[id]; if (!F || typeof CMT36 === 'undefined') return ''; const L = CMT36.map((c, k) => [c, k]).filter(([c]) => F.includes(c[2])); if (!L.length) return '';
  return `<div class="starters"><span class="stlab">3.6 starter comments – tap to add:</span>${L.map(([c, k]) => `<button type="button" class="chip starter" data-starter="${id}|${k}" title="${esc(c[4])}">${esc(c[1])}</button>`).join('')}</div>`; }

/* her rule (Oct 23 2026): a shed or other structure that is personal property is not an outbuilding.
   It moves to Landscaping & outdoor living (with gazebo, trellis …); its photos go with it. */
function obPersonal(it) {
  const ins = app.ins; const a = ins.data.amenities = ins.data.amenities || {};
  const what = it.label || it.type || 'Shed';
  const arr = new Set(a.outdoor || []); arr.add('Shed (personal property)'); a.outdoor = [...arr]; a.recYes = true;
  ins.photos.filter(p => p.list === 'outbuildings' && p.item === it.id).forEach(p => Object.assign(p, { sec: 'amenities', field: null, list: null, item: null, slot: null, extra: true, label: what + ' (personal property)', cat: 'SubjectPropertyAmenitiesExhibit' }));
  ins.lists.outbuildings = ins.lists.outbuildings.filter(x => x.id !== it.id); app.open.delete(it.id);
  save(); renderTab(); toast('Not permanently attached = personal property. Moved to Landscaping & outdoor living as "Shed (personal property)".');
}

/* her Oct 24 2026: names and streets – capital letter at the start of each word (the rest stays as typed, so McDonald stays) */
const CAP_WORDS = new Set(['addr', 'cityOther', 'countyOther', 'projName', 'hoaName', 'hoaContactName', 'clubName', 'waterName', 'whoName', 'ident']);
function capWords(v) { return String(v).replace(/(^|[\s\-\/(])([a-z])/g, (m, a, b) => a + b.toUpperCase()); }

/* her Oct 24 2026: street name suggestions while she types an address – real street names in her ZIP codes (Census list, streets.js).
   Streets in the ZIP she picked, and whose house numbers cover the number typed, come first. Tap one to use it. */
function streetSugg(v, zip) {
  const m = String(v || '').match(/^\s*(\d+[A-Za-z]?(?:-\d+)?)\s+(.*)$/); const n = m ? m[1] : '', rest = (m ? m[2] : String(v || '')).trim().toLowerCase().replace(/\s+/g, ' ');
  if (rest.length < 2 || /,/.test(rest)) return [];
  const num = parseInt(n, 10), zi = STREET_ZIPS.indexOf(String(zip || '')), out = [];
  STREETS.forEach(([name, zs, lo, hi]) => { const l = name.toLowerCase(); if (l === rest) return;
    const bare = l.replace(/^(n|s|e|w|north|south|east|west)\s+/, '');
    let sc = l.startsWith(rest) ? 3 : bare.startsWith(rest) ? 2.5 : l.split(' ').some(w => w.startsWith(rest)) ? 1 : 0; if (!sc) return;
    if (zi >= 0 && zs.includes(String(zi))) sc += 2;
    if (num && hi && num >= lo && num <= hi) sc += 1.5; else if (num && hi) sc -= 1;
    out.push([sc, name]); });
  out.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));
  return [...new Set(out.map(x => x[1]))].slice(0, 6).map(name => (n ? n + ' ' : '') + name);
}
function bindStreetSugg(inp, getZip, onPick) {
  if (!inp || inp.dataset.sugg) return; inp.dataset.sugg = '1'; inp.setAttribute('autocomplete', 'off');
  const box = document.createElement('div'); box.className = 'st-sugg'; inp.insertAdjacentElement('afterend', box);
  const show = () => { const L = streetSugg(inp.value, getZip && getZip()); box.innerHTML = L.map(s => `<button type="button" class="st-s" data-st="${esc(s)}">${esc(s)}</button>`).join(''); box.hidden = !L.length; };
  inp.addEventListener('input', show); inp.addEventListener('focus', show);
  inp.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 250));
  box.addEventListener('pointerdown', e => { const b = e.target.closest('[data-st]'); if (!b) return; e.preventDefault(); inp.value = b.dataset.st; box.hidden = true; if (onPick) onPick(inp.value); else { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } });
  box.hidden = true;
}

/* her Oct 24 2026: water heater strapped (double or single) → UAD disaster mitigation "Water Heater Strapping" (5.000), one answer in both places */
function strapSync(ins) { const s = ins.data.systems || {}, iv = ins.data.interview = ins.data.interview || {}; const st = s.whStrap || [];
  const L = new Set(iv.disaster || []);
  if (st.some(x => /^(Double|Single) Strapped$/.test(x))) { L.delete('None'); L.add('WaterHeaterStrapping'); }
  else if (L.has('WaterHeaterStrapping') && iv._strapAuto) L.delete('WaterHeaterStrapping');
  iv._strapAuto = L.has('WaterHeaterStrapping') && st.some(x => /Strapped$/.test(x) && !/^Not/.test(x)); iv.disaster = [...L]; }
