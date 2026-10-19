/* =====================================================================
   Comp Genie – screens
   ===================================================================== */
const app = { job: null, jobs: [], sel: null, cort: [], cortByApn: new Map(), cortByKey: new Map(), photoCache: new Map(), busy: '', confirm: null, sugg: [], showAll: false };

/* ---------------- start ---------------- */
async function start() {
  await DB.init();
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {} // ask Chrome to keep this data, never clear it to free space
  const arch = await DB.get('kv', 'archive'); if (arch && arch.data) archiveIndex(arch.data);
  const cort = await DB.get('kv', 'cort'); setCort(cort ? cort.rows : []);
  await revLoad();
  app.jobs = (await DB.all('jobs')).sort((a, b) => b.updated - a.updated);
  const last = await DB.get('kv', 'lastJob');
  app.job = (POP && app.jobs.find(j => j.id === POP.job)) || app.jobs.find(j => last && j.id === last.v) || app.jobs[0] || null;
  app.orders = await readOrders();
  const oq = new URLSearchParams(location.search).get('order');
  if (new URLSearchParams(location.search).get('embed')) document.body.classList.add('embed');   // inside the Appraisal Assistant's Comp genie tab
  app.home = !POP && !oq && !new URLSearchParams(location.search).get('job');   // her request (Oct 19 2026): open on the list of assignments, not the last one
  if (oq) { history.replaceState(null, '', location.pathname); const o = app.orders.find(x => x.id === oq); if (o) await jobFromOrder(o); else toast('That order was not found in this browser. Open the Appraisal Assistant in this same browser (Chrome).', 6000); }
  if (!app.job && !app.home) await newJob();
  app.jobs.forEach(j => (j.files || []).forEach(f => { if (!f.id) { f.id = uid(); f.legacy = true; } }));  // files dropped before "remove file" existed
  await loadPhotos();
  render();
}
window.addEventListener('message', async e => {   // the Appraisal Assistant shows its Comp genie tab again: read the orders again (same site only)
  if (e.origin !== location.origin || !e.data || e.data.type !== 'aa-refresh') return;
  app.orders = await readOrders();
  if (e.data.order && (!app.job || app.job.orderId !== e.data.order || app.home)) { const o = app.orders.find(x => x.id === e.data.order); if (o) { app.home = false; await jobFromOrder(o); await loadPhotos(); } }
  if (!e.data.order && !app.job) app.home = true;
  render();
});
function setCort(rows) {
  app.cort = rows || []; app.cortByApn = new Map(); app.cortByKey = new Map();
  app.cort.forEach((r, i) => { const a = apnKey(r.apn); if (a) { if (!app.cortByApn.has(a)) app.cortByApn.set(a, []); app.cortByApn.get(a).push(i); }
    if (r.addr) { const k = addrKey(r.addr); if (!app.cortByKey.has(k)) app.cortByKey.set(k, []); app.cortByKey.get(k).push(i); } });
}
/* ---------------- orders from the Appraisal Assistant (same site, same browser) ---------------- */
async function readOrders() { // read-only; never creates the orders storage if the assistant was not used in this browser
  try { if (indexedDB.databases) { const l = await indexedDB.databases(); if (!l.some(d => d.name === 'aa-orders')) return []; } } catch (e) {}
  return new Promise(res => {
    let r; try { r = indexedDB.open('aa-orders'); } catch (e) { res([]); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} };
    r.onerror = () => res([]); r.onblocked = () => res([]);
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('orders')) { d.close(); res([]); return; }
      const q = d.transaction('orders').objectStore('orders').getAll(); q.onsuccess = () => { d.close(); res(q.result || []); }; q.onerror = () => { d.close(); res([]); }; };
  });
}
const ORDER_DONE = ['Delivered', 'Paid', 'Cancelled'];
function readOrderDoc(id) { // one stored document (its file) from the Appraisal Assistant; read-only
  return new Promise(res => { let r; try { r = indexedDB.open('aa-orders'); } catch (e) { res(null); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} }; r.onerror = () => res(null);
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('docs')) { d.close(); res(null); return; } const q = d.transaction('docs').objectStore('docs').get(id); q.onsuccess = () => { d.close(); res(q.result || null); }; q.onerror = () => { d.close(); res(null); }; }; });
}
/* the order's Search Criteria search (the micro market on the Market tab) – its listings become the comps considered, minus the ones she unticked there */
function orderMicro(o) { const mi = o && o.market && o.market.micro; if (!mi || !mi.file) return null; const doc = (o.docs || []).find(d => d.name === mi.file); return doc ? { file: mi.file, docId: doc.id, exclude: mi.exclude || {}, n: (mi.rows || []).length } : null; }
const microIn = (J, M) => (J.files || []).some(f => f.kind === 'MLS export' && f.name === M.file);
async function pullMicro(o, quiet) {
  const M = orderMicro(o); if (!M || !app.job) return ''; const rec = await readOrderDoc(M.docId); if (!rec || !rec.blob) { if (!quiet) toast('The search file was not found in the Appraisal Assistant'); return ''; }
  const rows = parseMlsCsv(await readText(new File([rec.blob], M.file))).filter(r => !M.exclude[r.mls]);
  const note = ingestMls(rows, M.file); const left = Object.keys(M.exclude).length; save(); render();
  if (!quiet) toast(`Added your Search Criteria search: ${rows.length} listings` + (left ? ` (${left} you unticked on the Market tab left out)` : ''), 6000);
  return note;
}
window.addEventListener('focus', async () => { const o = await readOrders(); if (o.length !== (app.orders || []).length) { app.orders = o; render(); } else app.orders = o; });
const orderName = o => [o.fileNo, String(o.address || '').split(',')[0].trim()].filter(Boolean).join(' ') || 'Order';
async function jobFromOrder(o) {
  const parts = String(o.address || '').split(',').map(x => x.trim());
  const sub = { addr: parts[0] || '', city: parts[1] || '', zip: ((parts[2] || '').match(/\d{5}/) || [''])[0], apn: o.apn || '', lat: o.lat || '', lon: o.lon || '', eff: o.effective || todayISO() };
  if (o.unit) sub.unit = o.unit;
  let j = app.jobs.find(x => x.orderId === o.id);
  if (j) { Object.entries(sub).forEach(([k, v]) => { if (v && !j.subject[k]) j.subject[k] = v; }); if (o.effective) j.subject.eff = o.effective; app.job = j; }
  else { j = await newJob(orderName(o)); j.orderId = o.id; Object.assign(j.subject, sub); }
  if (o.crs && !j.subject.crs) j.subject.crs = crsCanon(o.crs);
  j.subject.listings = o.listings || []; j.fileNo = o.fileNo || '';
  app.sel = null; await saveNow(); await loadPhotos(); toast('Opened the assignment for order ' + orderName(o));
  { const M = orderMicro(o); if (M && !microIn(j, M)) { await pullMicro(o, true); toast('Opened the assignment for order ' + orderName(o) + ' and added your Search Criteria search (' + M.file + ')', 6000); } }
}
async function newJob(name) {
  const j = { id: uid(), name: name || 'New assignment', created: Date.now(), updated: Date.now(), subject: { addr: '', city: '', zip: '', apn: '', lat: '', lon: '', eff: todayISO() }, comps: [], files: [] };
  app.jobs.unshift(j); app.job = j; app.sel = null; await saveNow(); return j;
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); }
async function saveNow() { if (!app.job) return; app.job.updated = Date.now(); await DB.put('jobs', app.job); if (!POP) await DB.put('kv', { id: 'lastJob', v: app.job.id }); wbNotify(); }

/* ---------------- photos ---------------- */
app.photos = []; // [{id, mls, n, name}] for this job (blobs stay in storage)
async function loadPhotos() { app.photos = app.job ? (await DB.byJob(app.job.id)).map(p => ({ id: p.id, mls: p.mls, n: p.n, name: p.name, file: p.file })) : []; }
const photosOf = c => { const m = V(c, 'mls'); return m ? app.photos.filter(p => p.mls === m).sort((a, b) => a.n - b.n) : []; };
const frontOf = c => { const ps = photosOf(c); return ps.find(p => p.id === c.front) || ps[0] || null; };
async function photoURL(id) {
  if (app.photoCache.has(id)) return app.photoCache.get(id);
  const r = await DB.get('photos', id); if (!r) return ''; const u = URL.createObjectURL(r.blob); app.photoCache.set(id, u); return u;
}
async function fillImages(root = document) { for (const img of $$('img[data-photo]', root)) { if (!img.src) img.src = await photoURL(img.dataset.photo); } }

/* ---------------- comps: find, add, attach sources ---------------- */
function findComp({ mls, apn, key }) {
  const J = app.job.comps;
  return (mls && J.find(c => c.mls === mls || V(c, 'mls') === mls)) || (apn && apnKey(apn) && J.find(c => apnKey(c.apn || V(c, 'apn')) === apnKey(apn))) || (key && J.find(c => c.key === key)) || null;
}
function attachArchive(c) {
  if (!ARCH.loaded) return;
  const rows = archiveFind({ apn: c.apn || V(c, 'apn'), key: c.key });
  c.src.arch = rows.map(r => ({ rec: r.rec_id, label: archLabel(r), report: r.from_report || '', entered: r.entered_date || '', role: r.record_role || '', photo: r.front_photo || '', v: archCanon(r) }));
}
function attachCort(c) {
  const idx = new Set(); const a = apnKey(c.apn || V(c, 'apn')); if (a && app.cortByApn.has(a)) app.cortByApn.get(a).forEach(i => idx.add(i));
  if (c.key && app.cortByKey.has(c.key)) app.cortByKey.get(c.key).forEach(i => idx.add(i));
  c.src.cort = [...idx].map(i => app.cort[i]).sort((x, y) => String(y.saleDate).localeCompare(String(x.saleDate)));
}
function upsertComp(seed, srcName, rec, fid) {
  let c = findComp(seed); const isNew = !c;
  if (!c) { c = newComp(seed); c.madeBy = fid || 'typed'; app.job.comps.push(c); }
  if (rec && fid) rec._file = fid;
  if (seed.apn && !c.apn) c.apn = seed.apn; if (seed.mls && !c.mls) c.mls = seed.mls; if (seed.key && !c.key) c.key = seed.key; if (seed.label && !c.label) c.label = seed.label;
  if (srcName) c.src[srcName] = rec;
  attachArchive(c); attachCort(c);
  return { c, isNew };
}
function addByAddress(text) {
  text = String(text || '').trim(); if (!text) return;
  const key = addrKey(text); const hit = ARCH.streets.find(s => s.k === key);
  const { c, isNew } = upsertComp({ key, label: hit ? hit.label : titleCase(text) });
  app.sel = c.id; save(); render();
  toast(!isNew ? 'Already in this list' : c.src.arch.length ? `Found in your archive: ${c.src.arch.length} record${c.src.arch.length > 1 ? 's' : ''}` : (c.src.cort.length ? 'Not in your archive – found in CORT' : 'Not in your archive. Add the MLS, CRS or CORT data.'));
}

/* ---------------- files in ---------------- */
async function ingest(files) {
  const notes = []; app.batch = []; app.crsChoices = [];
  for (const f of files) {
    try {
      app.busy = 'Reading ' + f.name + '…'; renderBusy();
      const low = f.name.toLowerCase();
      if (low.endsWith('.zip')) { const z = await readZip(f); notes.push(z.has('inspection-backup.json') ? await ingestInspection(z, f.name) : await ingestPhotos(f, z)); }
      else if (low.endsWith('.csv')) {
        const text = await readText(f); const head = text.slice(0, 2000).toLowerCase();
        if (head.includes('listing number')) notes.push(ingestMls(parseMlsCsv(text), f.name));
        else if (head.includes('grantor')) notes.push(await ingestCort(parseCortCsv(text), f.name));
        else notes.push(f.name + ': not an MLS export or a CORT table');
      } else if (low.endsWith('.gz') || low.endsWith('.json')) notes.push(await ingestJson(f));
      else if (low.endsWith('.pdf')) {
        const first = await pdfFirstText(f);
        if (/APN\/Tax ID|CRS Data|Property Report/i.test(first.text)) { const c = crsCanon(parseCRS(await pdfLines(f))); notes.push(ingestCrs(c, f.name)); }
        else if (/flexmls|MLS #/i.test(first.text)) { const L = await pdfLines(f, (n, t) => { if (n % 20 === 0) { app.busy = `Reading the MLS printout… page ${n} of ${t}`; renderBusy(); } }); notes.push(ingestPdf(parseMlsPdf(L), f.name)); }
        else if (!first.text.trim()) notes.push(f.name + ': this is a scan (a picture, no text). If it is a CORT printout, send it to Claude for now to add it to your CORT table.');
        else notes.push(f.name + ': not a PDF the genie knows (MLS printout or CRS report).');
      } else notes.push(f.name + ': file type not used here');
    } catch (e) { console.error(e); notes.push(f.name + ': could not read – ' + (e.message || e)); }
  }
  app.busy = ''; save(); render(); if (notes.length) showNotes(notes, app.batch.slice(), app.crsChoices.slice());
}
function logFile(name, kind, n, id) {
  app.job.files = (app.job.files || []).filter(x => !(x.name === name && x.kind === kind));
  const e = { id: id || uid(), name, kind, n, at: Date.now() }; app.job.files.push(e); if (app.batch) app.batch.push(e.id); return e;
}
/* Take a dropped file back out: its data comes off every comp, and comps that came only from it are removed. */
const KIND_SRC = { 'MLS export': 'mls', 'MLS printout': 'pdf', 'CRS report': 'crs' };
async function removeFile(fileId) {
  const J = app.job; const e = (J.files || []).find(x => x.id === fileId); if (!e) return;
  const mine = rec => rec && (rec._file === e.id || (!rec._file && e.legacy));
  const src = KIND_SRC[e.kind];
  if (src) J.comps.forEach(c => { if (mine(c.src[src])) { c.src[src] = null; c._lost = true; } });
  if (e.kind === 'CRS (subject)' && J.subject.crs) { const r = J.subject.crs; if (String(J.subject.lat) === String(r.lat)) { J.subject.lat = ''; J.subject.lon = ''; } J.subject.crs = null; }
  if (e.kind === 'MLS photos') { for (const p of await DB.byJob(J.id)) if (p.file === e.id || (!p.file && e.legacy)) await DB.del('photos', p.id); app.photoCache.clear(); await loadPhotos(); }
  if (e.kind === 'CORT table') { const before = app.cort.length; app.cort = app.cort.filter(r => r._file !== e.id); if (app.cort.length !== before) { setCort(app.cort); await DB.put('kv', { id: 'cort', rows: app.cort }); J.comps.forEach(attachCort); } }
  const left = c => c.src.mls || c.src.pdf || c.src.crs || c.use || Object.keys(c.edit || {}).length;
  J.comps = J.comps.filter(c => { const gone = (c.madeBy === e.id || (c._lost && !c.madeBy)) && !left(c); delete c._lost; return !gone; });
  if (app.sel && !J.comps.some(c => c.id === app.sel)) app.sel = null;
  J.files = J.files.filter(x => x.id !== e.id); await saveNow();
}
function ingestMls(rows, name) {
  let made = 0, merged = 0; const fid = uid();
  rows.forEach(r => { const { isNew } = upsertComp({ mls: r.mls, apn: r.apn, key: r.addr ? addrKey(r.addr) : '', label: r.addr }, 'mls', r, fid); isNew ? made++ : merged++; });
  logFile(name, 'MLS export', rows.length, fid);
  return `${name}: ${rows.length} listings (${made} new, ${merged} matched to comps already here)`;
}
function ingestPdf(list, name) {
  let made = 0, merged = 0; const fid = uid();
  list.forEach(r => { const { isNew } = upsertComp({ mls: r.mls, apn: r.apn, key: r.addr ? addrKey(r.addr) : '', label: r.addr }, 'pdf', r, fid); isNew ? made++ : merged++; });
  logFile(name, 'MLS printout', list.length, fid);
  return `${name}: ${list.length} listings with history (${merged} matched, ${made} new)`;
}
function ingestCrs(r, name) {
  const s = app.job.subject; const key = addrKey(r.addr);
  if ((s.addr && addrKey(s.addr) === key) || (s.apn && apnKey(s.apn) && apnKey(s.apn) === apnKey(r.apn))) { s.crs = r; fillSubjectFrom(r); logFile(name, 'CRS (subject)', 1); return `${name}: subject's CRS report – location and APN filled in`; }
  const fid = uid(); const { isNew } = upsertComp({ apn: r.apn, key, label: r.addr }, 'crs', r, fid); logFile(name, 'CRS report', 1, fid);
  if (!s.addr) (app.crsChoices = app.crsChoices || []).push({ fid, r, name }); // subject not entered yet: offer 'this is the subject'
  return `${name}: ${r.addr} (${isNew ? 'new comp' : 'matched'})`;
}
async function ingestCort(rows, name) {
  const seen = new Set(app.cort.map(r => r.apn + '|' + r.saleDate + '|' + r.doc)); let added = 0; const fid = uid();
  rows.forEach(r => { const k = r.apn + '|' + r.saleDate + '|' + r.doc; if (!seen.has(k)) { seen.add(k); r._file = fid; app.cort.push(r); added++; } });
  logFile(name, 'CORT table', added, fid);
  setCort(app.cort); await DB.put('kv', { id: 'cort', rows: app.cort });
  app.job.comps.forEach(attachCort);
  return `${name}: ${added} new CORT sales saved (${app.cort.length} in your CORT table). They fill in automatically when a comp matches by APN or address.`;
}
async function ingestPhotos(f, z) {
  const files = z || await readZip(f); let n = 0; const mlsSet = new Set(); const fid = uid();
  for (const [path, data] of files) {
    const base = path.split('/').pop(); const m = base.match(/^(\d{2}-\d+)_(\d+)\.(jpe?g|png)$/i); if (!m) continue;
    const id = app.job.id + ':' + m[1] + '_' + m[2];
    await DB.put('photos', { id, jobId: app.job.id, mls: m[1], n: +m[2], name: base, file: fid, blob: new Blob([data], { type: /png$/i.test(m[3]) ? 'image/png' : 'image/jpeg' }) });
    n++; mlsSet.add(m[1]);
  }
  await loadPhotos(); logFile(f.name, 'MLS photos', n, fid);
  const missing = [...mlsSet].filter(m => !app.job.comps.some(c => V(c, 'mls') === m));
  return `${f.name}: ${n} photos for ${mlsSet.size} listings${missing.length ? ` (${missing.length} listings are not in your list yet – their photos appear when you add the MLS export)` : ''}`;
}
async function ingestJson(f) {
  const data = await gunzipJSON(f);
  if (data && data.app === 'appraisal-assistant-comp-archive') {
    app.busy = 'Saving your archive on this computer…'; renderBusy();
    archiveIndex(data); await DB.put('kv', { id: 'archive', data, loaded: Date.now() });
    app.job.comps.forEach(attachArchive);
    return `Comp archive loaded: ${data.rows.length.toLocaleString()} records, ${Object.keys(data.sales).length.toLocaleString()} sales (built ${data.built || ''}). It stays on this computer.`;
  }
  if (data && data.app === 'comp-genie-job') {
    const j = data.job; j.id = uid(); j.name = j.name + ' (restored)'; app.jobs.unshift(j); app.job = j; app.sel = null; await saveNow(); await loadPhotos();
    j.comps.forEach(c => { attachArchive(c); attachCort(c); });
    return 'Assignment restored: ' + j.name;
  }
  throw new Error('not a comp archive or a Comp Genie backup');
}
function fillSubjectFrom(r) {
  const s = app.job.subject; ['addr', 'city', 'zip', 'apn'].forEach(k => { if (!s[k] && r[k]) s[k] = r[k]; });
  if (r.lat && r.lon) { s.lat = r.lat; s.lon = r.lon; }
}

/* ---------------- rendering ---------------- */
/* the start page: every assignment, newest first */
function homeHTML() {
  const orderOfJ = j => (app.orders || []).find(o => o.id === j.orderId) || null;
  const d = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const open = (app.orders || []).filter(o => !ORDER_DONE.includes(o.stage || 'New')).sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || '')));
  return `<header class="top"><h1>Comp Genie</h1>
    <span class="pill ${ARCH.loaded ? 'ok' : 'warn'}">${ARCH.loaded ? `Archive: ${ARCH.rows.length.toLocaleString()} records` : 'Archive not loaded'}</span>
    <span class="pill">${app.cort.length ? `CORT: ${app.cort.length} sales` : 'No CORT table'}</span><span class="grow"></span>
    <button class="btn" data-act="newjob">New assignment</button>
    ${open.length ? `<select data-act="fromorder" aria-label="Start from an order"><option value="">From an order…</option>${open.map(o => `<option value="${o.id}">${esc(orderName(o))}</option>`).join('')}</select>` : ''}</header>
  ${(() => { const todo = open.filter(o => !app.jobs.some(j => j.orderId === o.id)); return todo.length ? `<section class="card"><h2>Orders not started here yet</h2><p class="muted">Every open order in the Appraisal Assistant. Click <b>Start</b> and its assignment is made from the order (subject, effective date, your Search Criteria search).</p>
    <table class="tbl homelist"><thead><tr><th>Order</th><th>Subject</th><th>Client</th><th>Status</th><th></th></tr></thead><tbody>${todo.map(o => `<tr><td><b>${esc(o.fileNo || '')}</b></td><td>${esc(o.address || '')}</td><td>${esc(((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name || '')}</td><td>${esc(o.stage || 'New')}</td><td><button class="btn primary" data-act="startorder" data-id="${o.id}">Start</button></td></tr>`).join('')}</tbody></table></section>` : ''; })()}
  <section class="card"><h2>Your assignments</h2>
    ${app.jobs.length ? `<p class="muted">Click one to open it. To go back to this list later, choose <b>All assignments</b> in the Assignment box at the top.</p>
    <table class="tbl homelist"><thead><tr><th>Assignment</th><th>Subject</th><th>Effective date</th><th>Comps</th><th>Order</th><th>Last changed</th></tr></thead><tbody>
    ${app.jobs.map(j => { const o = orderOfJ(j), S = j.subject || {}; const used = (j.comps || []).filter(c => c.use).length;
      return `<tr data-act="openjob" data-id="${j.id}" tabindex="0" style="cursor:pointer"><td><b>${esc(j.name)}</b></td><td>${esc([S.addr, S.city].filter(Boolean).join(', '))}</td><td>${esc(S.eff || '')}</td><td>${(j.comps || []).length}${used ? ` (${used} on the grid)` : ''}</td><td>${o ? esc(o.fileNo || '') + (o.stage ? ' · ' + esc(o.stage) : '') : ''}</td><td>${esc(d(j.updated))}</td></tr>`; }).join('')}
    </tbody></table>` : '<p>No assignments yet. Click <b>New assignment</b>, or start one <b>From an order</b> in the Appraisal Assistant.</p>'}
  </section>
  <footer class="foot">Comp Genie · your data stays on this computer · build ${typeof BUILD !== 'undefined' ? BUILD : ''}</footer>`;
}
function render() {
  const J = app.job; const root = $('#app');
  if (POP) { root.innerHTML = popHTML(J); document.title = `Comps ${POP.from}–${POP.to} · ${J.name}`; wbUndoBar(); return; }
  if (app.home || !J) { root.innerHTML = homeHTML(); document.title = 'Comp Genie'; return; }
  document.title = 'Comp Genie · ' + J.name;
  root.innerHTML = `
  <header class="top"><h1>Comp Genie</h1>
    <span class="pill ${ARCH.loaded ? 'ok' : 'warn'}">${ARCH.loaded ? `Archive: ${ARCH.rows.length.toLocaleString()} records` : 'Archive not loaded'}</span>
    <span class="pill">${app.cort.length ? `CORT: ${app.cort.length} sales` : 'No CORT table'}</span>
    <span class="grow"></span>
    <label class="jobsel">Assignment <select data-act="pickjob" id="jobpick"><option value="">All assignments (start page)</option>${app.jobs.map(j => `<option value="${j.id}" ${j.id === J.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select></label>
    <button class="btn" data-act="newjob">New assignment</button>
    ${(app.orders || []).some(o => !ORDER_DONE.includes(o.stage || 'New')) ? `<select data-act="fromorder" aria-label="Start from an order"><option value="">From an order…</option>${app.orders.filter(o => !ORDER_DONE.includes(o.stage || 'New')).sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || ''))).map(o => `<option value="${o.id}">${esc(orderName(o))}</option>`).join('')}</select>` : ''}
    <button class="btn" data-act="backup" title="Save this assignment to a file">Back up</button>
    ${app.confirm === 'deljob' ? `<span class="confirm">Delete “${esc(J.name)}”? <button class="btn danger solid" data-act="deljob-yes">Delete</button><button class="btn" data-act="cancel">Keep</button></span>` : `<button class="btn danger" data-act="deljob">Delete</button>`}
  </header>
  ${ARCH.loaded ? '' : `<section class="card notice"><b>Load your comp archive${app.jobs.some(j => j.comps.length) ? ' in this browser' : ' once'}.</b> ${app.jobs.some(j => j.comps.length) ? 'Each browser (Chrome, Firefox, Edge) keeps its own copy, and this one has none yet. ' : ''}Drop <i>Comp Archive.json.gz</i> and <i>CORT Sales.csv</i> anywhere on this page (or <label class="link">choose it<input type="file" multiple data-act="files" hidden></label>). It is saved on this computer only; nothing is uploaded.</section>`}
  <div class="busy" id="busy" ${app.busy ? '' : 'hidden'}>${esc(app.busy)}</div>
  <section class="card"><h2>Subject</h2>${subjectHTML(J)}</section>
  <section class="card"><h2>Add comps</h2>
    <div class="addrow"><div class="sugwrap"><input id="addr" class="txt big" placeholder="Type a comp address, e.g. 1181 Glenview" autocomplete="off" data-act="sugg"><div class="sugg" id="sugg"></div></div>
      <button class="btn primary" data-act="add">Add comp</button></div>
    <p class="help">If the address is in your archive, it fills in at once with every version you have. Then drop files to add to it.</p>
    ${(() => { const o = (app.orders || []).find(x => x.id === J.orderId); const M = orderMicro(o); if (!o) return ''; if (!M) return `<p class="help">No Search Criteria search on this order yet. In the Appraisal Assistant, open the order's <b>Market</b> tab and drop it in box 2; it comes in here.</p>`;
      return microIn(J, M) ? `<p class="help"><b class="ok">✓</b> Your Search Criteria search from the order's Market tab is in: <b>${esc(M.file)}</b>${Object.keys(M.exclude).length ? ` (${Object.keys(M.exclude).length} listing${Object.keys(M.exclude).length > 1 ? 's' : ''} you unticked there left out)` : ''}. <button class="lnk" data-act="pullmicro">Bring it in again</button></p>`
        : `<div class="row"><button class="btn primary" data-act="pullmicro">Add your Search Criteria search (${M.n} listings)</button><span class="help">from the order's Market tab: ${esc(M.file)}</span></div>`; })()}
    <label class="drop" id="drop"><input type="file" multiple data-act="files" hidden>
      <b>Drop files here</b> or click to choose: MLS export (.csv) · MLS photos (.zip) · MLS printout (.pdf) · CRS reports (.pdf) · CORT table (.csv) · comp archive (.gz)</label>
    ${(J.files || []).length ? `<div class="files"><b>Files in this assignment</b> <small>(✕ takes a file back out)</small><ul>${J.files.map(f => `<li>${esc(f.name)} <small>${esc(f.kind)}${f.n ? ', ' + f.n : ''}</small> ${app.confirm === 'rf:' + f.id ? `<span class="confirm">Take it out? <button class="btn danger solid sm" data-rfyes="${esc(f.id)}">Remove file</button><button class="btn sm" data-act="cancel">Keep</button></span>` : `<button class="btn sm" data-rf="${esc(f.id)}" title="Remove this file and what it added">✕</button>`}</li>`).join('')}</ul></div>` : ''}
  </section>
  <section class="card" id="compsCard">${compsCardHTML(J)}</section>
  <div id="detail">${app.sel ? detailHTML(J.comps.find(c => c.id === app.sel)) : ''}</div>
  <section class="card" id="gridCard">${gridHTML(J)}</section>
  <section class="card" id="nuCard">${notUsedHTML(J)}</section>
  <section class="card" id="timeCard">${timeHTML(J)}</section>
  <section class="card" id="supCard">${supHTML(J)}</section>
  <section class="card" id="preCard">${precheckHTML(J)}</section>
  <section class="card" id="reportCard">${reportHTML(J)}</section>
  <section class="card" id="exportCard"><h2>Export</h2>${exportHTML(J)}</section>
  <footer class="foot">Comp Genie · your data stays on this computer · build ${typeof BUILD !== 'undefined' ? BUILD : ''}</footer>`;
  fillImages();
}
/* Redraw after a field changes without losing your place: Tab moves on first, then the page is
   redrawn and the cursor is put back in the field you tabbed (or clicked) into. */
const FOCUS_KEYS = ['data-gfact', 'data-subj', 'data-edit', 'data-jobname', 'data-notes', 'data-gadj', 'data-gsubj', 'data-grate', 'data-gvalue', 'data-gnote', 'data-gok', 'id'];
function renderKeepFocus() {
  setTimeout(() => {
    const a = document.activeElement; let key = null;
    if (a && a !== document.body) for (const k of FOCUS_KEYS) { const v = a.getAttribute(k); if (v) { key = [k, v]; break; } }
    const pos = a && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    const y = window.scrollY; render(); window.scrollTo(0, y);
    if (key) { const el = document.querySelector(`[${key[0]}="${CSS.escape(key[1])}"]`); if (el) { el.focus({ preventScroll: true }); try { if (pos) el.setSelectionRange(pos[0], pos[1]); } catch (e) {} } }
  }, 0);
}
const compsCardHTML = J => `<div class="row"><h2 style="margin:0">Comps considered <small>${J.comps.length}</small></h2><span class="grow"></span>${J.comps.length ? (app.confirm === 'rmall' ? `<span class="confirm">Remove all ${J.comps.length} comps from this assignment? <button class="btn danger solid sm" data-act="rmall-yes">Remove all</button><button class="btn sm" data-act="cancel">Keep</button></span>` : `<button class="btn sm danger" data-act="rmall">Remove all comps</button>`) : ''}</div>${compsTable(J)}`;
/* Redraw only what depends on a typed value, so the field you are in (and the next one you Tab to) is never replaced. */
function renderParts(opts = {}) {
  const J = app.job;
  const jp = $('#jobpick'); if (jp) jp.innerHTML = app.jobs.map(j => `<option value="${j.id}" ${j.id === J.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('');
  const cc = $('#compsCard'); if (cc) { cc.innerHTML = compsCardHTML(J); fillImages(cc); }
  const ex = $('#exportCard'); if (ex) ex.innerHTML = '<h2>Export</h2>' + exportHTML(J);
  if (opts.grid !== false) { const gc = $('#gridCard'); if (gc) gc.innerHTML = gridHTML(J); }
  { const nc = $('#nuCard'); if (nc) nc.innerHTML = notUsedHTML(J); const tc = $('#timeCard'); if (tc) tc.innerHTML = timeHTML(J); const sc = $('#supCard'); if (sc) sc.innerHTML = supHTML(J); const pc = $('#preCard'); if (pc) pc.innerHTML = precheckHTML(J); }
  if (opts.field && app.sel) { // one row of the field-by-field table
    const c = J.comps.find(x => x.id === app.sel); const f = FIELD[opts.field]; const u = val(c, f.k);
    const inp = document.querySelector(`[data-edit="${f.k}"]`); const row = inp && inp.closest('tr');
    if (row) { row.querySelector('td.using').innerHTML = `${esc(fmt(f, u.v))}${u.src ? ` <span class="tag ${u.src}">${esc(SRC[u.src].short)}</span>` : ''}${(c.pick[f.k] || !blank(c.edit[f.k])) ? ` <button class="lnk" data-reset="${f.k}" title="Back to the automatic choice">↺</button>` : ''}`;
      row.querySelectorAll('td.srccell').forEach(td => td.classList.toggle('on', td.dataset.pick === u.src)); }
  }
}
function renderBusy() { const b = $('#busy'); if (b) { b.hidden = !app.busy; b.textContent = app.busy; } }
function subjectHTML(J) {
  const s = J.subject; const inA = s.addr && ARCH.loaded ? ARCH.byAddr.get(addrKey(s.addr)) : null;
  const f = (k, l, w = '') => `<label class="fld ${w}"><span>${l}</span><input class="txt" data-subj="${k}" value="${esc(s[k] ?? '')}"></label>`;
  return `<div class="grid6">${f('addr', 'Address', 'w2')}${f('city', 'City')}${f('zip', 'ZIP')}${f('apn', 'APN')}<label class="fld"><span>Effective date</span><input class="txt" data-subj="eff" placeholder="mm/dd/yyyy" value="${esc(showDate(s.eff) || s.eff || '')}"></label>
    ${f('lat', 'Latitude')}${f('lon', 'Longitude')}<label class="fld"><span>Assignment name</span><input class="txt" data-jobname="1" value="${esc(J.name)}"></label></div>
    <p class="help">Latitude and longitude give each comp its distance and direction. Fill them from the subject's CRS report: <label class="link">choose the subject's CRS PDF<input type="file" accept=".pdf" data-act="subjcrs" hidden></label>${inA ? ` · Your archive has ${inA.length} record${inA.length > 1 ? 's' : ''} for this address.` : ''}</p>`;
}
/* Closed sales first (newest closing on top), then pending (newest contract), then active listings (newest list date), then everything else */
function compGroup(c) { const st = String(V(c, 'status') || (currentSale(c) || {}).status || ''); if (/closed|sold/i.test(st) || (!st && V(c, 'saleDate'))) return 0; if (/pending|contract|contingent/i.test(st)) return 1; if (/active|coming/i.test(st)) return 2; return 3; }
function compOrder(a, b) {
  const ga = compGroup(a), gb = compGroup(b); if (ga !== gb) return ga - gb;
  const d = c => String((ga === 0 ? V(c, 'saleDate') : ga === 1 ? V(c, 'contractDate') || V(c, 'listDate') : V(c, 'listDate')) || V(c, 'saleDate') || '');
  return d(b).localeCompare(d(a));
}
function compsTable(J) {
  if (!J.comps.length) return '<p class="help">No comps yet. Type an address above, or drop your MLS export.</p>';
  const rows = [...J.comps].sort(compOrder);
  const maxUse = Math.max(9, J.comps.length);
  return `<div class="tablewrap"><table class="comps"><thead><tr><th>Use as</th><th></th><th>Address</th><th>Status</th><th class="r">Price</th><th>Date</th><th class="r">GLA</th><th class="r">Site</th><th>Q / C</th><th>View</th><th class="r">Miles</th><th>Sources</th><th>Flags</th><th></th></tr></thead><tbody>
  ${rows.map(c => { const fr = frontOf(c); const px = proximity(c, J); const fl = compFlags(c, J); const warn = fl.filter(x => x.sev === 'warn').length;
    const st = V(c, 'status') || ((currentSale(c) || {}).status || '');
    return `<tr class="${c.id === app.sel ? 'sel' : ''} ${c.use ? 'used' : ''}" data-open="${c.id}">
      <td class="usecell"><button class="btn small${c.use ? '' : ' primary'}" data-quse="${c.id}" title="${c.use ? 'Take it off the grid' : 'Put it on the grid as the next comp'}">${c.use ? 'Remove' : '+ Grid'}</button><select data-use="${c.id}" aria-label="Use as comp number" title="Or pick its comp number">${'<option value="">–</option>'}${Array.from({ length: maxUse }, (_, i) => `<option ${c.use === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></td>
      <td>${fr ? `<img class="thumb" data-photo="${fr.id}" alt="">` : '<span class="nothumb"></span>'}</td>
      <td><b>${esc(compTitle(c))}</b><br><small>${esc(V(c, 'mls') ? 'MLS ' + V(c, 'mls') : '')}</small></td>
      <td>${esc(st)}</td><td class="r">${money(V(c, 'salePrice') || V(c, 'listPrice'))}${!V(c, 'salePrice') && V(c, 'listPrice') ? '<br><small>list</small>' : ''}</td>
      <td>${esc(showDate(V(c, 'saleDate') || V(c, 'contractDate')))}</td><td class="r">${int(V(c, 'gla'))}</td><td class="r">${esc(fmt(FIELD.siteSf, V(c, 'siteSf')))}</td>
      <td>${esc([V(c, 'quality'), V(c, 'condition')].filter(Boolean).join(' / '))}</td><td><small>${esc([V(c, 'viewRating'), V(c, 'viewTypes')].filter(Boolean).join(': ')).slice(0, 40)}</small></td>
      <td class="r">${px ? px.mi.toFixed(2) + '<br><small>' + px.dir.replace(/([a-z])([A-Z])/, '$1 $2') + '</small>' : ''}</td>
      <td>${sourcesOf(c).map(s => `<span class="src">${esc(s)}</span>`).join(' ')}</td>
      <td>${fl.length ? `<span class="badge ${warn ? 'warn' : ''}">${fl.length}</span>` : ''}</td>
      <td>${app.confirm === 'rm:' + c.id ? `<span class="rmask">Keep it as analyzed – not used? <button class="btn sm primary" data-rmnu="${c.id}">Keep as not used</button><button class="btn sm" data-rmdb="${c.id}">Save to my comp database, then remove</button><button class="btn danger solid sm" data-rmyes="${c.id}">Remove</button><button class="btn sm" data-act="cancel">Cancel</button></span>` : `<button class="btn sm" data-rm="${c.id}" title="Remove from this list">✕</button>`}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function cellHTML(c, f, s, S, using) {
  const v = S[s] ? S[s][f.k] : null; if (blank(v)) return `<td class="srccell empty"></td>`;
  const on = using.src === s;
  return `<td class="srccell ${on ? 'on' : ''}" data-pick="${s}" data-field="${f.k}" title="Use the ${esc(SRC[s].name)} value">${esc(fmt(f, v))}</td>`;
}
function detailHTML(c) {
  if (!c) return '';
  const J = app.job; const S = srcVals(c); const fl = compFlags(c, J); const ps = photosOf(c); const fr = frontOf(c); const prior = priorSales(c); const px = proximity(c, J);
  const cols = SRC_ORDER.filter(s => s === 'arch' ? c.src.arch.length : s === 'cort' ? c.src.cort.length : c.src[s]);
  let lastG = '';
  const rows = FIELDS.map(f => {
    const u = val(c, f.k); const any = cols.some(s => S[s] && !blank(S[s][f.k])) || !blank(c.edit[f.k]); if (!any && !app.showAll) return '';
    const head = f.g !== lastG ? `<tr class="grp"><th colspan="${3 + cols.length}">${esc(f.g)}</th></tr>` : ''; lastG = f.g;
    const dis = disagree(c, f.k);
    return head + `<tr><th>${esc(f.l)}${dis ? ' <span class="diff" title="Sources disagree">≠</span>' : ''}</th>
      <td class="using">${esc(fmt(f, u.v))}${u.src ? ` <span class="tag ${u.src}">${esc(SRC[u.src].short)}</span>` : ''}${(c.pick[f.k] || !blank(c.edit[f.k])) ? ` <button class="lnk" data-reset="${f.k}" title="Back to the automatic choice">↺</button>` : ''}</td>
      <td><input class="txt sm" data-edit="${f.k}" value="${esc(blank(c.edit[f.k]) ? '' : (f.t === 'date' ? showDate(c.edit[f.k]) : c.edit[f.k]))}" placeholder="your value"></td>
      ${cols.map(s => cellHTML(c, f, s, S, u)).join('')}</tr>`;
  }).join('');
  const archSel = c.src.arch.length ? `<select data-archpick="${c.id}">${c.src.arch.map(a => `<option value="${a.rec}" ${archChosen(c) && archChosen(c).rec === a.rec ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select>` : '';
  const cortSel = c.src.cort.length > 1 ? `<select data-cortpick="${c.id}">${c.src.cort.map((t, i) => `<option value="${i}" ${(c.cortPick || 0) === i ? 'selected' : ''}>${esc(showDate(t.saleDate) + ' ' + money(t.salePrice))}</option>`).join('')}</select>` : '';
  const p = c.src.pdf, m = c.src.mls;
  return `<section class="card detail" id="det-${c.id}">
    <div class="dhead"><div>${fr ? `<img class="hero" data-photo="${fr.id}" data-view="${fr.id}" alt="Front photo" title="Click to look at the photos full size">` : ''}</div>
      <div><h2>${esc(compTitle(c))} <small>${esc([V(c, 'city'), V(c, 'zip')].filter(Boolean).join(' '))}</small></h2>
      <p class="big">${esc(V(c, 'status') || '')} · ${money(V(c, 'salePrice') || V(c, 'listPrice'))} · ${esc(showDate(V(c, 'saleDate') || V(c, 'contractDate')))}${px ? ` · ${px.mi.toFixed(2)} mi ${esc(px.dir)}` : ''}</p>
      <p><label>Use as comp # <select data-use="${c.id}"><option value="">–</option>${Array.from({ length: Math.max(9, J.comps.length) }, (_, i) => `<option ${c.use === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
         <button class="btn sm" data-act="close">Close</button></p>
      ${fl.length ? `<ul class="flags">${fl.map(x => `<li class="${x.sev}">${esc(x.t)}</li>`).join('')}</ul>` : '<p class="help">No flags.</p>'}</div></div>
    ${ps.length ? `<div class="strip">${ps.map(ph => `<button class="ph ${fr && ph.id === fr.id ? 'on' : ''}" data-view="${ph.id}" title="Click to look at it full size"><img data-photo="${ph.id}" alt="Photo ${ph.n}"></button>`).join('')}</div><p class="help">Click a photo to see it full size and page through them. The outlined one is the front photo; change it in the viewer.</p>` : (V(c, 'mls') ? '<p class="help">No photos yet – drop the MLS photos zip.</p>' : '')}
    <h3>Field by field <small>click any source value to use it, or type your own</small></h3>
    <div class="tablewrap"><table class="cmp"><colgroup><col style="width:200px"><col style="width:190px"><col style="width:120px">${cols.map(() => '<col>').join('')}</colgroup><thead><tr><th>Field</th><th>Using</th><th>Your value</th>${cols.map(s => `<th>${esc(SRC[s].name)}${s === 'arch' ? '<br>' + archSel : s === 'cort' ? '<br>' + cortSel : ''}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <p><label><input type="checkbox" data-act="showall" ${app.showAll ? 'checked' : ''}> Show empty fields too</label></p>
    <h3>Prior sales and transfers</h3>
    ${prior.length ? `<table class="mini"><tr><th>Date</th><th class="r">Price</th><th>Type</th><th>Before this sale</th><th>From</th></tr>${prior.map(s => `<tr class="${s.monthsBefore > 0 && s.monthsBefore <= 12 ? 'hot' : ''}"><td>${esc(showDate(s.date))}</td><td class="r">${money(s.price)}</td><td>${esc(s.inst || s.type || '')}</td><td>${s.monthsBefore != null ? Math.round(s.monthsBefore) + ' mo' : ''}</td><td><small>${esc(s.src)}</small></td></tr>`).join('')}</table>` : '<p class="help">None found in the sources you have loaded.</p>'}
    ${p && (p.listings || []).length ? `<h3>Listing history (MLS printout)</h3><table class="mini"><tr><th>MLS #</th><th>Status</th><th class="r">Price</th><th>Date</th><th class="r">DOM</th><th class="r">CDOM</th></tr>${p.listings.map(h => `<tr class="${h.mls === p.mls ? 'hot' : ''}"><td>${esc(h.mls)}</td><td>${esc(h.status)}</td><td class="r">${money(h.price)}</td><td>${esc(showDate(h.date))}</td><td class="r">${int(h.dom)}</td><td class="r">${int(h.cdom)}</td></tr>`).join('')}</table>
      ${(p.priceChanges || []).length ? `<p class="help">Price changes on this listing: ${p.priceChanges.map(x => `${showDate(x.date)} → ${money(x.price)}${x.pct ? ' (' + x.pct + '%)' : ''}`).join(' · ')}</p>` : ''}` : ''}
    ${m && (m.remarks || m.privateRemarks) ? `<details><summary>MLS remarks</summary><p>${esc(m.remarks)}</p>${m.privateRemarks ? `<p><b>Agent remarks:</b> ${esc(m.privateRemarks)}</p>` : ''}${m.aduNote ? `<p><b>ADU:</b> ${esc(m.aduNote)}</p>` : ''}</details>` : ''}
    ${c.src.cort.length ? `<details><summary>CORT lines</summary><table class="mini"><tr><th>Week</th><th>Grantor → grantee</th><th class="r">Price</th><th>Recorded</th><th>Remarks</th><th>Financing</th><th>Doc #</th></tr>${c.src.cort.map(t => `<tr><td>${esc(t.period)}</td><td>${esc(t.grantor)} → ${esc(t.grantee)}</td><td class="r">${money(t.salePrice)}</td><td>${esc(showDate(t.saleDate))}</td><td>${esc(t.cortRemarks)}</td><td>${esc(t.financing)}</td><td>${esc(t.doc)}</td></tr>`).join('')}</table></details>` : ''}
    <label class="fld"><span>Notes for this comp</span><textarea class="txt" rows="2" data-notes="${c.id}">${esc(c.notes || '')}</textarea></label>
  </section>`;
}
function exportHTML(J) {
  const used = J.comps.filter(c => c.use).sort((a, b) => a.use - b.use);
  return `<p>${used.length ? `Comps chosen: ${used.map(c => `<b>${c.use}</b> ${esc(compTitle(c))}`).join(' · ')}` : 'Pick comps with “Use as” in the list. If none are picked, the table export includes every comp considered.'}</p>
  <div class="row"><button class="btn primary" data-act="x-full" ${used.length && J.subject.insp ? '' : 'disabled'} title="${J.subject.insp ? '' : 'Drop your iPad Workfile package first'}">Full report for SFREP (.zip)</button><button class="btn primary" data-act="x-sfrep" ${used.length ? '' : 'disabled'}>SFREP comps file (.zip)</button>
  <button class="btn" data-act="x-csv">Comps table (.csv)</button>
  <button class="btn" data-act="x-photos">Front photos (.zip)</button></div>
  <p class="help"><b>Full report</b> = your iPad inspection (subject, photos, sketch) + these comps with your adjustments, your Usable Lot Area/Utility row, indicated value and comment, plus the Report details below, in one file. <b>Comps file</b> = the comps and your adjustments only, for a report that already has the inspection. Both carry the front photos, sale and listing data, site, view and house facts. Import into a copy of your report first (Home › Import Forms) to see how SFREP takes it.</p>`;
}
function useCrsAsSubject(ch) {
  return removeFile(ch.fid).then(() => { const s = app.job.subject; s.crs = ch.r; ['addr', 'city', 'zip', 'apn'].forEach(k => { if (ch.r[k]) s[k] = ch.r[k]; }); if (ch.r.lat) { s.lat = ch.r.lat; s.lon = ch.r.lon; }
    if (app.job.name === 'New assignment' && ch.r.addr) app.job.name = ch.r.addr; logFile(ch.name, 'CRS (subject)', 1); return saveNow(); });
}
/* Full-size photo viewer: arrows (or the keyboard) to page through, one click to make a photo the front photo */
function openViewer(c, startId) {
  const ps = photosOf(c); let i = Math.max(0, ps.findIndex(p => p.id === startId));
  const bg = document.createElement('div'); bg.className = 'viewer';
  const draw = async () => { const ph = ps[i]; const fr = frontOf(c);
    bg.innerHTML = `<div class="vbar"><b>${esc(compTitle(c))}</b> · photo ${i + 1} of ${ps.length}<span class="grow"></span>
      ${fr && fr.id === ph.id ? '<span class="pill ok">Front photo</span>' : '<button class="btn primary" data-vfront="1">Use as the front photo</button>'}<button class="btn" data-vclose="1">Close ✕</button></div>
      <button class="varr l" data-vstep="-1" aria-label="Previous">‹</button><img class="vimg" alt="Photo ${i + 1}" src="${await photoURL(ph.id)}"><button class="varr r" data-vstep="1" aria-label="Next">›</button>`;
    bg.querySelector('[data-vclose]').onclick = close; bg.querySelectorAll('[data-vstep]').forEach(b => b.onclick = () => step(+b.dataset.vstep));
    const f = bg.querySelector('[data-vfront]'); if (f) f.onclick = () => { c.front = ph.id; save(); draw(); render(); }; };
  const step = d => { i = (i + d + ps.length) % ps.length; draw(); };
  const key = e => { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'Escape') close(); };
  const close = () => { document.removeEventListener('keydown', key); bg.remove(); };
  document.addEventListener('keydown', key); document.body.appendChild(bg); draw();
}
function showNotes(notes, fileIds, crsChoices) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet"><h2>Files read</h2><ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul><div class="row"><button class="btn primary" data-close="1">OK</button>${(crsChoices || []).map((ch, i) => `<button class="btn primary" data-subj-crs="${i}">${esc(ch.r.addr || ch.name)} is the subject</button>`).join('')}${(fileIds || []).length ? `<button class="btn danger" data-undo="1">Undo – take ${fileIds.length > 1 ? 'these files' : 'this file'} back out</button>` : ''}</div></div>`;
  document.body.appendChild(bg); bg.querySelector('[data-close]').onclick = () => bg.remove(); bg.querySelector('[data-close]').focus();
  bg.querySelectorAll('[data-subj-crs]').forEach(b => b.onclick = async () => { await useCrsAsSubject(crsChoices[+b.dataset.subjCrs]); bg.remove(); render(); toast('Subject filled from the CRS report'); });
  const u = bg.querySelector('[data-undo]'); if (u) u.onclick = async () => { u.disabled = true; u.textContent = 'Taking out…'; for (const id of fileIds) await removeFile(id); bg.remove(); render(); toast('Undone – nothing from ' + (fileIds.length > 1 ? 'those files' : 'that file') + ' is left'); };
}

/* ---------------- exports ---------------- */
function jobBase() { return safeName(app.job.subject.addr || app.job.name); }
async function exportSfrep() {
  const used = app.job.comps.filter(c => c.use).sort((a, b) => a.use - b.use); if (!used.length) return;
  const entries = [{ name: jobBase() + ' - Comps.xml', data: buildCompsMISMO(app.job, used) }];
  for (const c of used) { const fr = frontOf(c); if (fr) { const r = await DB.get('photos', fr.id); if (r) entries.push({ name: 'Images/' + photoName(c), data: r.blob }); } }
  download(await makeZip(entries), jobBase() + ' - Comps SFREP.zip'); toast('Saved to your Downloads folder');
}
function exportCsv() {
  const used = app.job.comps.filter(c => c.use).sort((a, b) => a.use - b.use);
  const list = [...used, ...app.job.comps.filter(c => !c.use)];
  download(new Blob([compsCSV(app.job, list)], { type: 'text/csv' }), jobBase() + ' - Comps considered.csv');
}
async function exportPhotos() {
  const used = app.job.comps.filter(c => c.use); const list = used.length ? used : app.job.comps; const entries = []; const names = new Set();
  for (const c of list) { const fr = frontOf(c); if (!fr) continue; const r = await DB.get('photos', fr.id); if (!r) continue; let nm = safeName(compTitle(c)) + '.jpg'; let i = 2; while (names.has(nm)) nm = safeName(compTitle(c)) + ' (' + i++ + ').jpg'; names.add(nm); entries.push({ name: nm, data: r.blob }); }
  if (!entries.length) { toast('No photos yet – drop the MLS photos zip first'); return; }
  download(await makeZip(entries), jobBase() + ' - Comp photos.zip');
}
async function backupJob() {
  const blob = await gzipBlob(JSON.stringify({ app: 'comp-genie-job', version: 1, job: app.job }));
  download(blob, safeName(app.job.name) + ' - Comp Genie backup.json.gz');
}

/* ---------------- events ---------------- */
function openComp(id) { app.sel = id; render(); const d = $('#detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
document.addEventListener('click', async e => {
  const gt = e.target.closest('[data-gtiers]');
  if (gt) { const G = G0(app.job); const tx = tiersText(app.job); if (!tx) { toast('Enter the quality and condition ratings first'); return; }
    G.note = String(G.note || '').replace(/Within the UAD quality and condition ratings[^]*?within each rating\./, '').trim(); G.note = [G.note, tx].filter(Boolean).join(' '); save(); renderKeepFocus(); toast('Added to the sales comparison comment – read it over'); return; }
  const gb = e.target.closest('[data-gokstd],[data-glimnote]');
  if (gb) { const G = G0(app.job); G.ok = G.ok || {};
    if (gb.dataset.gokstd) G.ok[gb.dataset.gokstd] = 'Lack of more similar sales; non-conforming market segment – expected (see sales comparison comment).';
    if (gb.dataset.glimnote || gb.dataset.gokstd) { if (!(G.note || '').includes(LIMIT_TEXT.slice(0, 60))) G.note = [(G.note || '').trim(), LIMIT_TEXT].filter(Boolean).join(' '); }
    save(); renderKeepFocus(); toast('Added to the sales comparison comment – read it over'); return; }
  const su = e.target.closest('[data-sensuse]');
  if (su) { const G = G0(app.job); const k = su.dataset.sensuse, v = +su.dataset.v; G.rates[k] = v; G.rateFrom = G.rateFrom || {}; G.rateFrom[k] = 'sensitivity (tightest adjusted range, ' + usedComps(app.job).length + ' comps)'; save(); app.sens = { job: app.job.id, res: sensRun(app.job) }; renderKeepFocus(); toast((SENS_LABEL[k] || k) + ': ' + sensFmt(k, v) + ' – every comp is recalculated'); return; }
  const wp = e.target.closest('[data-wbpop],[data-wbmv],[data-wbpage],[data-wbcol]');
  if (wp) { const d = wp.dataset;
    if (d.wbpop) { const [a, b] = d.wbpop.split('|'); await saveNow(); window.open(`${location.pathname}?pop=grid&from=${a}&to=${b}&job=${encodeURIComponent(app.job.id)}`, 'genie-grid-' + a, 'width=1000,height=1100'); return; }
    if (d.wbmv) { const [id, to] = d.wbmv.split('|'); wbMove(app.job, id, +to); save(); renderKeepFocus(); return; }
    if (d.wbpage) { const k = +d.wbpage; const a = Math.max(1, POP.from + k), b = a + (POP.to - POP.from); location.search = `?pop=grid&from=${a}&to=${b}&job=${encodeURIComponent(POP.job)}`; return; }
    if (d.wbcol) { WB.cur = d.wbcol; document.querySelectorAll('[data-wbcol]').forEach(x => x.classList.toggle('cur', x.dataset.wbcol === WB.cur)); return; } }
  const rd = e.target.closest('[data-revdel]');
  if (rd) { await revLoad(); REVLOG = REVLOG.filter(r => r.id !== rd.dataset.revdel); await revSave(); renderKeepFocus(); return; }
  const sp = e.target.closest('[data-supuse]');
  if (sp) { const G = G0(app.job); const k = sp.dataset.supuse, v = +sp.dataset.v; const T = app.job.support || {}; G.rates[k] = v; G.rateFrom = G.rateFrom || {}; G.rateFrom[k] = 'grouped sales: ' + (T.seg || '') + ', ' + (T.n || 0) + ' sales'; save(); renderKeepFocus(); toast((RATES[k] ? RATES[k][0] : k) + ': ' + (/Pct$/.test(k) ? v + '%' : money(v)) + ' – every comp is recalculated'); return; }
  const tu = e.target.closest('[data-tsuse]');
  if (tu) { const G = G0(app.job); G.rates.timePct = +tu.dataset.tsuse; G.rateFrom = G.rateFrom || {}; G.rateFrom.timePct = 'market conditions support: ' + tu.dataset.tslabel; save(); renderKeepFocus(); toast('Sale date line: ' + tu.dataset.tsuse + '% per month – every comp is recalculated'); return; }
  const nb = e.target.closest('[data-rmnu],[data-rmdb],[data-savedb],[data-nuback]');
  if (nb) { const id = nb.dataset.rmnu || nb.dataset.rmdb || nb.dataset.savedb || nb.dataset.nuback; const c = app.job.comps.find(x => x.id === id); if (!c) return;
    if (nb.dataset.rmnu) { markNotUsed(c); app.nuAsk = c.id; app.confirm = null; save(); render(); toast('Kept as analyzed – not used. Pick the reason below the grid.'); return; }
    if (nb.dataset.savedb || nb.dataset.rmdb) { const n = await saveToMyDb(c); toast(`Saved to your comp database (${n} saved) – it goes into your archive the next time it is rebuilt`); }
    if (nb.dataset.rmdb) { app.job.comps = app.job.comps.filter(x => x.id !== id); if (app.sel === id) app.sel = null; app.confirm = null; save(); render(); return; }
    if (nb.dataset.nuback) { delete c.notUsed; if (app.nuAsk === id) app.nuAsk = null; save(); render(); return; }
    return; }
  { const q = e.target.closest('[data-quse]'); if (q && app.job) { e.stopPropagation(); const c = app.job.comps.find(x => x.id === q.dataset.quse); if (!c) return;
      if (c.use) { markNotUsed(c); app.nuAsk = c.id; c.use = null; toast('Taken off the grid – kept as analyzed, not used. Pick the reason below the grid.'); }
      else { const taken = new Set(app.job.comps.map(x => x.use).filter(Boolean)); let n = 1; while (taken.has(n)) n++; c.use = n; delete c.notUsed; toast(`On the grid as comp ${n}`); }
      save(); render(); return; } }
  const t = e.target.closest('[data-act],[data-open],[data-pick],[data-reset],[data-front],[data-view],[data-rm],[data-rmyes],[data-rf],[data-rfyes],.sug');
  if (!t) return;
  if (t.matches('select,input,option')) return;
  const c = app.sel ? app.job.comps.find(x => x.id === app.sel) : null;
  if (t.classList.contains('sug')) { $('#addr').value = t.dataset.label; addByAddress(t.dataset.label); return; }
  if (t.dataset.open && !e.target.closest('select,button,input')) { openComp(t.dataset.open); return; }
  if (t.dataset.pick && c) { c.pick[t.dataset.field] = t.dataset.pick; delete c.edit[t.dataset.field]; save(); render(); return; }
  if (t.dataset.reset && c) { delete c.pick[t.dataset.reset]; delete c.edit[t.dataset.reset]; save(); render(); return; }
  if (t.dataset.view && c) { openViewer(c, t.dataset.view); return; }
  if (t.dataset.front && c) { c.front = t.dataset.front; save(); render(); return; }
  if (t.dataset.rf) { app.confirm = 'rf:' + t.dataset.rf; render(); return; }
  if (t.dataset.rfyes) { app.confirm = null; await removeFile(t.dataset.rfyes); render(); toast('File taken out'); return; }
  if (t.dataset.rm) { app.confirm = 'rm:' + t.dataset.rm; render(); return; }
  if (t.dataset.rmyes) { app.job.comps = app.job.comps.filter(x => x.id !== t.dataset.rmyes); if (app.sel === t.dataset.rmyes) app.sel = null; app.confirm = null; save(); render(); return; }
  switch (t.dataset.act) {
    case 'add': addByAddress($('#addr').value); break;
    case 'newjob': app.home = false; await newJob(); await loadPhotos(); render(); break;
    case 'startorder': { const o = (app.orders || []).find(x => x.id === t.dataset.id); if (!o) break; app.home = false; await jobFromOrder(o); await loadPhotos(); render(); window.scrollTo(0, 0); break; }
    case 'openjob': { const j = app.jobs.find(x => x.id === t.dataset.id); if (!j) break; app.home = false; app.job = j; app.sel = null; await DB.put('kv', { id: 'lastJob', v: j.id }); await loadPhotos(); render(); window.scrollTo(0, 0); break; }
    case 'deljob': app.confirm = 'deljob'; render(); break;
    case 'deljob-yes': { const id = app.job.id; await DB.del('jobs', id); for (const p of await DB.byJob(id)) await DB.del('photos', p.id); app.jobs = app.jobs.filter(j => j.id !== id); app.job = app.jobs[0] || null; app.confirm = null; app.home = true; await loadPhotos(); render(); window.scrollTo(0, 0); toast('Assignment deleted'); break; }
    case 'cancel': app.confirm = null; render(); break;
    case 'rmall': app.confirm = 'rmall'; render(); break;
    case 'rmall-yes': app.job.comps = []; app.sel = null; app.confirm = null; await saveNow(); render(); toast('All comps removed – your files list is unchanged'); break;
    case 'close': app.sel = null; render(); break;
    case 'backup': backupJob(); break;
    case 'nuok': app.nuAsk = null; render(); break;
    case 'sens-run': { app.sens = { job: app.job.id, res: sensRun(app.job) }; renderKeepFocus(); break; }
    case 'sup-run': { toast('Measuring your lines from your groups…'); await new Promise(r => setTimeout(r, 30)); app.job.support = supRun(app.job); save(); renderKeepFocus(); break; }
    case 'ts-run': { toast('Measuring time from your groups…'); await new Promise(r => setTimeout(r, 30)); app.job.timeSupport = await tsRun(app.job); save(); renderKeepFocus(); break; }
    case 'savealldb': { const L = app.job.comps.filter(c => c.use || c.notUsed); let n = 0; for (const c of L) n = await saveToMyDb(c); toast(L.length ? `${L.length} comps saved to your comp database (${n} saved in all) – with your tiers` : 'No comps on the grid yet'); break; }
    case 'starts-use': { const n = startsUse(app.job); save(); renderKeepFocus(); toast(n ? n + ' rate' + (n > 1 ? 's' : '') + ' filled from your starting points – change any of them' : 'Your rates are already filled – clear one to use the starting point'); break; }
    case 'starts-edit': app.startsEdit = !app.startsEdit; renderKeepFocus(); break;
    case 'starts-file': download(new Blob([JSON.stringify({ app: 'comp-genie-starting-points', v: startsNow() }, null, 1)], { type: 'application/json' }), 'My starting points.json'); break;
    case 'starts-reset': if (confirm('Go back to the original starting-point list? Your changes to the list are replaced.')) { STARTS = JSON.parse(JSON.stringify(STARTS_DEFAULT)); await DB.put('kv', { id: 'starts', v: STARTS }); renderKeepFocus(); } break;
    case 'x-sfrep': exportSfrep(); break;
    case 'x-full': exportFullReport(); break;
    case 'wb-prev': WB.page--; renderKeepFocus(); break;
    case 'wb-next': WB.page++; renderKeepFocus(); break;
    case 'wb-arrange': app.wbArrange = !app.wbArrange; renderKeepFocus(); break;
    case 'wb-undo': wbUndo(); break;
    case 'wb-undo-x': WB.undo = null; wbUndoBar(); break;
    case 'dr-make': DR.text = drBuild(app.job); DR.open = true; renderKeepFocus(); setTimeout(() => { const t = $('#drText'); if (t) t.scrollIntoView({ block: 'center' }); }, 60); break;
    case 'dr-replace': case 'dr-append': { const G = G0(app.job); const tx = ($('#drText') || {}).value || DR.text; G.note = t.dataset.act === 'dr-replace' || !String(G.note || '').trim() ? tx : String(G.note).trim() + '\n\n' + tx; DR.open = false; save(); renderKeepFocus(); toast('In the sales comparison comment – read it through and fill in the [brackets]'); break; }
    case 'dr-copy': { const tx = ($('#drText') || {}).value || DR.text; try { await navigator.clipboard.writeText(tx); toast('Copied'); } catch (e) { toast('Select the text and press Ctrl+C'); } break; }
    case 'dr-close': DR.open = false; renderKeepFocus(); break;
    case 'x-full-anyway': exportFullReport(true); break;
    case 'pre-run': { toast('Checking…'); await precheckRun(app.job, false); renderKeepFocus(); break; }
    case 'rev-add': { await revLoad(); const t = ($('#revText') || {}).value || ''; if (!t.trim()) { toast('Type what they asked first'); break; }
      app.revOpen = true; REVLOG.push({ id: 'r' + Date.now().toString(36), text: t.trim(), word: (($('#revWord') || {}).value || '').trim(), client: (($('#revClient') || {}).value || '').trim(), added: todayISO(), on: true }); await revSave();
      if (app.pre && app.pre.job === app.job.id) await precheckRun(app.job, app.pre.wantExport); renderKeepFocus(); toast('Added – every pre-check will remind you'); break; }
    case 'pullmicro': { const o = (app.orders || []).find(x => x.id === app.job.orderId); if (o) await pullMicro(o); break; }
    case 'x-csv': exportCsv(); break;
    case 'x-photos': exportPhotos(); break;
    case 'showall': app.showAll = t.checked; render(); break;
  }
});
document.addEventListener('toggle', e => { if (e.target.dataset && e.target.dataset.revopen) app.revOpen = e.target.open; }, true);
document.addEventListener('change', async e => {
  if (e.target.dataset && e.target.dataset.drshort) { DR.forceShort = e.target.checked; DR.text = drBuild(app.job); if (!e.target.checked && DR.text.length > 10000) DR.text = drBuild(app.job); renderKeepFocus(); return; }
  if (e.target.dataset && e.target.dataset.revdone) { const J = app.job; J.revDone = J.revDone || {}; J.revDone[e.target.dataset.revdone] = e.target.checked; save(); await precheckRun(J, app.pre && app.pre.wantExport); renderKeepFocus(); return; }
  if (e.target.dataset && e.target.dataset.revon) { await revLoad(); const r = REVLOG.find(x => x.id === e.target.dataset.revon); if (r) r.on = e.target.checked; await revSave(); return; }
  const t = e.target;
  if (t.dataset.act === 'files' && t.files.length) { await ingest([...t.files]); t.value = ''; return; }
  if (t.dataset.act === 'subjcrs' && t.files.length) { try { const r = crsCanon(parseCRS(await pdfLines(t.files[0]))); app.job.subject.crs = r; ['addr', 'city', 'zip', 'apn'].forEach(k => { if (r[k]) app.job.subject[k] = r[k]; }); if (r.lat) { app.job.subject.lat = r.lat; app.job.subject.lon = r.lon; } if (app.job.name === 'New assignment' && r.addr) app.job.name = r.addr; logFile(t.files[0].name, 'CRS (subject)', 1); save(); render(); toast('Subject filled from the CRS report'); } catch (err) { toast('Could not read that CRS report'); } return; }
  if (t.dataset.act === 'fromorder' && t.value) { const o = app.orders.find(x => x.id === t.value); if (o) { app.home = false; await jobFromOrder(o); await loadPhotos(); render(); } return; }
  if (t.dataset.act === 'pickjob' && !t.value) { app.home = true; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.act === 'pickjob') { app.home = false; app.job = app.jobs.find(j => j.id === t.value); app.sel = null; await DB.put('kv', { id: 'lastJob', v: app.job.id }); await loadPhotos(); render(); return; }
  if (t.dataset.act === 'showall') { app.showAll = t.checked; render(); return; }
  if (t.dataset.use) { const c = app.job.comps.find(x => x.id === t.dataset.use); const n = t.value ? +t.value : null; if (!n && c.use) { markNotUsed(c); app.nuAsk = c.id; } if (n) app.job.comps.forEach(x => { if (x !== c && x.use === n) x.use = null; }); c.use = n; save(); render(); return; }
  if (t.dataset.archpick) { const c = app.job.comps.find(x => x.id === t.dataset.archpick); c.archPick = +t.value; save(); render(); return; }
  if (t.dataset.cortpick) { const c = app.job.comps.find(x => x.id === t.dataset.cortpick); c.cortPick = +t.value; save(); render(); return; }
  if (t.dataset.edit) { const c = app.job.comps.find(x => x.id === app.sel); const f = FIELD[t.dataset.edit]; const v = parseInput(f, t.value); if (blank(v)) delete c.edit[f.k]; else c.edit[f.k] = v; save(); renderParts({ field: f.k }); return; }
  if (t.dataset.subj) { app.job.subject[t.dataset.subj] = t.dataset.subj === 'eff' ? (isoDate(t.value) || t.value.trim()) : t.value.trim(); if (t.dataset.subj === 'addr' && (!app.job.name.trim() || app.job.name === 'New assignment')) app.job.name = t.value.trim() || app.job.name; const jn = $('[data-jobname]'); if (jn && document.activeElement !== jn) jn.value = app.job.name; save(); renderParts(); return; }
  if (t.dataset.jobname) { app.job.name = t.value.trim() || 'Assignment'; save(); renderParts(); return; }
  if (t.dataset.notes) { const c = app.job.comps.find(x => x.id === t.dataset.notes); c.notes = t.value; save(); return; }
  // adjustment grid
  if (t.dataset.nu || t.dataset.nur) { const [id, k] = (t.dataset.nu || t.dataset.nur).split('|'); const c = app.job.comps.find(x => x.id === id); if (!c) return; markNotUsed(c); const N = c.notUsed;
    if (t.dataset.nur) { N.reasons = N.reasons.filter(x => x !== k); if (t.checked) N.reasons.push(k); } else if (k === 'report' || k === 'client') N[k] = t.checked; else N[k] = t.value;
    save(); if (t.dataset.nur && k === 'Other') render(); return; }
  if (t.dataset.gseg || t.dataset.gtier) { const G = G0(app.job); if (t.dataset.gseg) G.seg = t.value; else G.tier = t.value; save(); renderKeepFocus(); return; }
  if (t.dataset.st) { const P = STARTS || (STARTS = JSON.parse(JSON.stringify(STARTS_DEFAULT))); const path = t.dataset.st.split('.'); let o = P; path.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; });
    const last = path[path.length - 1]; o[last] = path[0] === 'notes' ? t.value : (t.value.trim() === '' ? null : num(t.value.replace(/[$,\s]/g, ''))); DB.put('kv', { id: 'starts', v: P }); renderKeepFocus(); return; }
  if (t.dataset.act === 'starts-load' && t.files && t.files[0]) { try { const d = JSON.parse(await t.files[0].text()); if (!d.v || !d.v.tiers) throw 0; STARTS = d.v; await DB.put('kv', { id: 'starts', v: STARTS }); toast('Starting points loaded'); renderKeepFocus(); } catch (e) { toast('That is not a starting-points file'); } return; }
  if (t.dataset.gfine) { const G = G0(app.job); G.fine = G.fine || {}; const [who, k] = t.dataset.gfine.split('|'); G.fine[who] = G.fine[who] || {}; G.fine[who][k] = t.value; save(); renderKeepFocus(); return; }
  if (t.dataset.gok !== undefined) { const G = G0(app.job); G.ok = G.ok || {}; const v = t.value.trim(); if (v) G.ok[t.dataset.gok] = v; else delete G.ok[t.dataset.gok]; save(); renderKeepFocus(); return; }
  if (t.dataset.gfact) { const [cid, row] = t.dataset.gfact.split('|'); const c = app.job.comps.find(x => x.id === cid); if (!c) return;
    if (!wbEquals(app.job, cid, row, t.value, true)) wbFactSet(app.job, c, row, t.value); save(); renderKeepFocus(); return; }
  if (t.dataset.gadj && /^\s*=/.test(t.value)) { const [cid, row] = t.dataset.gadj.split('|'); if (wbEquals(app.job, cid, row, t.value, false)) { save(); renderKeepFocus(); return; } }
  if (t.dataset.wbon) { WB.on = t.checked; WB.page = 0; renderKeepFocus(); return; }
  if (t.dataset.wbper) { WB.per = +t.value; WB.page = 0; renderKeepFocus(); return; }
  if (t.dataset.wbto) { const v = +t.value; if (v) { wbMove(app.job, t.dataset.wbto, v); save(); renderKeepFocus(); } return; }
  if (t.dataset.gadj || t.dataset.gsubj || t.dataset.grate || t.dataset.gvalue || t.dataset.gnote || t.dataset.gweight) { const G = G0(app.job); const v = t.value.trim();
    const n = s => { const x = num(String(s).replace(/[$,\s]/g, '').replace(/^\+/, '')); return x === null ? null : x; };
    if (t.dataset.gadj) { const [cid, row] = t.dataset.gadj.split('|'); G.cells[cid] = G.cells[cid] || {}; if (v === '') delete G.cells[cid][row]; else G.cells[cid][row] = n(v); }
    if (t.dataset.gsubj === 'baths') { const m = v.match(/(\d+)\D*(\d+)?/); if (v === '' || !m) { delete G.subj.baths; delete G.subj.full; delete G.subj.half; } else { G.subj.baths = v; G.subj.full = +m[1]; G.subj.half = m[2] ? +m[2] : 0; } }
    else if (t.dataset.gsubj) { const k = t.dataset.gsubj; if (v === '') delete G.subj[k]; else G.subj[k] = ['site', 'usable', 'year', 'beds', 'full', 'half', 'gla', 'bsmt', 'garage'].includes(k) ? (n(v.replace(/ac$/i, '')) ?? v) : v; }
    if (t.dataset.grate) { if (v === '') delete G.rates[t.dataset.grate]; else G.rates[t.dataset.grate] = n(v.replace('%', '')); if (G.rateFrom) delete G.rateFrom[t.dataset.grate]; }
    if (t.dataset.gvalue) G.value = v === '' ? null : n(v);
    if (t.dataset.gnote) { G.note = t.value; save(); return; }
    if (t.dataset.gweight) { if (v) G.weights[t.dataset.gweight] = v; else delete G.weights[t.dataset.gweight]; }
    save(); renderKeepFocus(); return; }
});
document.addEventListener('input', e => {
  if (e.target.id === 'drText') { DR.text = e.target.value; const c = $('#drCt'); if (c) c.innerHTML = scCount(DR.text); return; }
  if (e.target.dataset && e.target.dataset.gnote) { const c = $('#gnoteCt'); if (c) c.innerHTML = scCount(e.target.value); }
  const t = e.target; if (t.id !== 'addr') return;
  const s = archiveSuggest(t.value); const box = $('#sugg');
  const cortHits = t.value.trim().length > 3 ? app.cort.filter(r => r.addr && r.addr.toLowerCase().startsWith(t.value.trim().toLowerCase())).slice(0, 4) : [];
  box.innerHTML = s.map(x => `<button class="sug" data-label="${esc(x.label)}"><b>${esc(x.label)}</b> <small>${esc(x.city)} · ${ARCH.byAddr.get(x.k).length} in archive</small></button>`).join('')
    + cortHits.map(r => `<button class="sug" data-label="${esc(r.addr)}"><b>${esc(r.addr)}</b> <small>CORT ${esc(showDate(r.saleDate))} ${money(r.salePrice)}</small></button>`).join('');
});
document.addEventListener('keydown', e => {
  if (e.target.id !== 'addr' || e.key !== 'Enter') return; e.preventDefault();
  // a partly typed address takes the first suggestion, unless it already names a property in your archive
  const typed = e.target.value; const first = $('#sugg .sug');
  addByAddress(ARCH.byAddr.has(addrKey(typed)) || !first ? typed : first.dataset.label);
});
['dragover', 'drop'].forEach(ev => document.addEventListener(ev, async e => {
  e.preventDefault(); const d = $('#drop'); if (ev === 'dragover') { if (d) d.classList.add('over'); return; }
  if (d) d.classList.remove('over'); if (e.dataTransfer && e.dataTransfer.files.length) await ingest([...e.dataTransfer.files]);
}));
document.addEventListener('dragleave', e => { const d = $('#drop'); if (d && !e.relatedTarget) d.classList.remove('over'); });
