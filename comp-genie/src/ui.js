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
  await revLoad(); await refLoad();
  app.jobs = (await DB.all('jobs')).sort((a, b) => b.updated - a.updated);
  const last = await DB.get('kv', 'lastJob');
  app.job = ((POP || CPOP) && app.jobs.find(j => j.id === (POP || CPOP).job)) || app.jobs.find(j => last && j.id === last.v) || app.jobs[0] || null;
  app.orders = await readOrders();
  await archPhotoInit(); try { if (localStorage.getItem('genie.classic') === '1') document.body.classList.add('classic'); } catch (e) {} try { const gl = await DB.get('kv', 'gridLines'); if (gl && gl.v) GRID_DEFAULT = gl.v; } catch (e) {}
  const oq = new URLSearchParams(location.search).get('order');
  if (new URLSearchParams(location.search).get('embed')) document.body.classList.add('embed');   // inside the Appraisal Assistant's Comp genie tab
  if (CPOP) app.sel = CPOP.id;
  app.home = !POP && !CPOP && !oq && !new URLSearchParams(location.search).get('job');   // her request (Oct 19 2026): open on the list of assignments, not the last one
  if (oq) { history.replaceState(null, '', location.pathname); const o = app.orders.find(x => x.id === oq); if (o) await jobFromOrder(o); else toast('That order was not found in this browser. Open the Appraisal Assistant in this same browser (Chrome).', 6000); }
  if (!app.job && !app.home) await newJob();
  app.jobs.forEach(j => (j.files || []).forEach(f => { if (!f.id) { f.id = uid(); f.legacy = true; } }));
  for (const j of app.jobs) { let ch = false; (j.comps || []).forEach(c => { const m = String((c.edit || {}).mlsCondition || '').trim().toUpperCase().match(/^(?:(LOW|MID|HIGH)\s+)?C\s*([1-6])\s*([+-])?$/); if (!m || !blank(c.edit.condition)) return;   // a C rating typed in the MLS words line before Oct 19 2026
      c.edit.condition = 'C' + m[2]; delete c.edit.mlsCondition; if (m[1] || m[3]) { const G = G0(j); G.fine = G.fine || {}; G.fine[c.id] = G.fine[c.id] || {}; G.fine[c.id].c = m[1] ? m[1].toLowerCase() : m[3] === '-' ? 'low' : 'high'; } ch = true; });
    if (ch) await DB.put('jobs', j); }  // files dropped before "remove file" existed
  await loadPhotos();
  render();
}
window.addEventListener('message', async e => {   // the Appraisal Assistant shows its Comp genie tab again: read the orders again (same site only)
  if (e.origin === location.origin && e.data && e.data.type === 'aa-order-made') { const j = app.jobs.find(x => x.id === e.data.jobId); if (j) { j.orderId = e.data.orderId; if (!j.fileNo) j.fileNo = e.data.fileNo || ''; await DB.put('jobs', j); }
    app.orders = await readOrders(); render(); toast('Made the order ' + (e.data.fileNo || '') + ' in the Appraisal Assistant – it is on its Home and All files lists', 6000); return; }
  if (e.origin !== location.origin || !e.data || e.data.type !== 'aa-refresh') return;
  app.orders = await readOrders();
  if (e.data.order && (!app.job || app.job.orderId !== e.data.order || app.home)) { const o = app.orders.find(x => x.id === e.data.order); if (o) { app.home = false; await jobFromOrder(o); await loadPhotos(); } }
  if (e.data.order && app.job && app.job.orderId === e.data.order) { const o = app.orders.find(x => x.id === e.data.order); if (o) await pullWorkfile(o); }
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
/* her iPad Workfile package dropped in the order's Documents (Oct 19 2026): the subject comes in here once, and again when a newer one is dropped */
async function pullWorkfile(o, quiet) {
  const ds = ((o && o.docs) || []).filter(d => d.type === 'ipadWorkfile').sort((a, b) => String(b.added || '').localeCompare(String(a.added || ''))); const d = ds[0]; if (!d || !app.job) return false;
  const key = d.id + '|' + (d.added || ''); if (app.job.inspDoc === key) return false;
  const rec = await readOrderDoc(d.id); if (!rec || !rec.blob) return false;
  try { const z = await readZip(new File([rec.blob], rec.name || d.name)); if (!z.has('inspection-backup.json')) return false; const note = await ingestInspection(z, d.name); app.job.inspDoc = key; await saveNow(); if (!quiet) toast(note, 7000); return true; }
  catch (e) { console.warn('workfile', e); toast('Could not read the iPad workfile ' + d.name + ': ' + (e.message || e), 6000); return false; }
}
/* the order's Search Criteria search (the micro market on the Market tab) – its listings become the comps considered, minus the ones she unticked there */
function orderMicro(o) {   // one CSV, or several she added together on the Market tab ("a.csv + b.csv")
  const mi = o && o.market && o.market.micro; if (!mi || !mi.file) return null;
  const names = [...new Set([...(mi.rows || []).map(r => r.src).filter(Boolean), ...String(mi.file).split(' + ').map(x => x.trim()).filter(Boolean)])];
  const docs = names.map(n => (o.docs || []).find(d => d.name === n)).filter(Boolean); if (!docs.length) return null;
  const file = docs.map(d => d.name).join(' + ');
  return { file, docs, docId: docs[0].id, exclude: mi.exclude || {}, n: (mi.rows || []).filter(r => !(mi.exclude || {})[r.mls]).length || (mi.rows || []).length };
}
const microIn = (J, M) => (J.files || []).some(f => f.kind === 'MLS export' && f.name === M.file);
/* the micro search is her comps to start: when nothing is on the grid yet, its listings go on it in the Comps considered order –
   closed sales by closing date (most recent first), then pendings, then actives. After that she adds and removes them herself. */
const gridInDateOrder = J => { const u = J.comps.filter(c => c.use).sort((a, b) => a.use - b.use); const d = u.slice().sort(compOrder); return u.every((c, i) => c === d[i] && c.use === i + 1); };
function gridDateOrder(J) { J.comps.filter(c => c.use).sort(compOrder).forEach((c, i) => { c.use = i + 1; }); }
/* after the comps are on the grid: which still need their CRS report (one drop takes them all; each is matched by APN or address) */
function photoNeedHTML(J) {   // the front photo in the square after the comp number comes from the MLS photos zip
  const used = J.comps.filter(c => c.use && (V(c, 'mls') || c.mls)); const need = used.filter(c => !frontOf(c)); if (!need.length) return '';
  const fromArch = need.filter(c => archPhotoNames(c).length).length; const archTip = fromArch && AP.state !== 'ok' ? ` <b>${fromArch}</b> of them have a front photo in your archive – <button class="lnk" data-act="archphotos">${AP.state === 'ask' ? 'reconnect' : 'connect'} your archive photos</button>.` : '';
  return `<p class="help photoneed"><b>MLS photos:</b> ${need.length} of ${used.length} MLS comps on the grid have no photo yet (${need.map(c => esc(V(c, 'mls') || c.mls)).join(', ')}). In Flexmls tick those listings › <b>Download photos</b> (zip), then drop the zip in the box below – the first photo (the front) shows next to each comp number. ${archTip} <small>Click a comp to pick a different front photo.</small></p>`;
}
function crsNeedHTML(J) {
  const used = J.comps.filter(c => c.use).sort((a, b) => a.use - b.use); if (!used.length) return '';
  const need = used.filter(c => !c.src.crs || c.src.crs.fromList);
  if (!need.length) return `<p class="help crsok"><b class="ok">✓</b> CRS reports are in for all ${used.length} comps on the grid.</p>`;
  return `<div class="crsneed"><b>Upload the CRS report for each comp on the grid</b> <small>(${need.length} of ${used.length} still needed)</small>
    <ul>${need.map(c => `<li>Comp ${c.use} – ${esc(c.label || c.mls || '')}${c.apn ? ` <small>APN ${esc(c.apn)}</small>` : ''}${c.mls ? ` <small>MLS ${esc(c.mls)}</small>` : ''}</li>`).join('')}</ul>
    <label class="btn primary">Choose CRS PDFs<input type="file" multiple accept=".pdf,application/pdf" data-act="files" hidden></label> <span class="help">Pick them all at once (or drop them in the box below) – each one finds its comp by APN or address and leaves this list.${need.some(c => c.src.crs && c.src.crs.fromList) ? ' (A sale from your CRS neighborhood list has only its sale, size, year and lot – the CRS report adds beds, baths and location.)' : ''}</span></div>`;
}
function microToGrid(rows) {
  const J = app.job; if (!J || J.comps.some(c => c.use)) return 0;
  const rank = r => /closed|sold/i.test(r.status || '') || r.saleDate ? 0 : /pend|contract|escrow/i.test(r.status || '') ? 1 : 2;
  const list = rows.slice().sort((a, b) => rank(a) - rank(b) || String(b.saleDate || b.contractDate || b.listDate || '').localeCompare(String(a.saleDate || a.contractDate || a.listDate || '')));
  const cs = []; list.forEach(r => { const c = findComp({ mls: r.mls, apn: r.apn, key: r.addr ? addrKey(r.addr) : '', label: r.addr }); if (c && !c.notUsed && !cs.includes(c)) cs.push(c); });
  cs.sort(compOrder).forEach((c, i) => { c.use = i + 1; });   // same order as Comps considered: closed sales by closing date, most recent first (her rule, Oct 20 2026)
  return cs.length;
}
async function pullMicro(o, quiet) {
  const M = orderMicro(o); if (!M || !app.job) return ''; const by = new Map(); const crsRows = []; let missing = 0;
  for (const d of M.docs) { const rec = await readOrderDoc(d.id); if (!rec || !rec.blob) { missing++; continue; }
    const text = await readText(new File([rec.blob], d.name));
    if (isCrsExport(text)) { parseCrsExport(text).forEach(r => crsRows.push(r)); continue; }   // a CRS Data neighborhood sales list
    parseMlsCsv(text).forEach(r => by.set(r.mls || (r.addr + '|' + by.size), r)); }
  if (!by.size && !crsRows.length) { if (!quiet) toast('The search file was not found in the Appraisal Assistant'); return ''; }
  const all = [...by.values()]; const rows = all.filter(r => !M.exclude[r.mls]);
  // her note (Oct 20 2026): a CRS sale that is not in the micro search is often in the macro (Market Area Boundary) MLS search – take its MLS data from there
  const macroRows = []; { const ma = o && o.market; const names = ma && ma.file ? String(ma.file).split(' + ').map(x => x.trim()).filter(Boolean) : [];
    for (const n of names) { const d = (o.docs || []).find(x => x.name === n); if (!d || M.docs.some(x => x.id === d.id)) continue; const rec = await readOrderDoc(d.id); if (!rec || !rec.blob) continue;
      const tx = await readText(new File([rec.blob], d.name)); if (isCrsExport(tx)) continue; parseMlsCsv(tx).forEach(r => { if (!by.has(r.mls)) macroRows.push(r); }); } }
  const macroUsed = new Map();
  const note = rows.length ? ingestMls(rows, M.file) : '';
  // CRS list: a sale that is also in the MLS search joins that comp (its unticked listings stay out); the rest come in as CRS-only comps
  const same = (a, b) => (apnKey(a.apn) && apnKey(a.apn) === apnKey(b.apn)) || (a.addr && b.addr && addrKey(a.addr) === addrKey(b.addr));
  const crsIn = []; let crsNew = 0;
  if (crsRows.length) { const fid = uid();
    crsRows.forEach(r => { const id = 'CRS:' + (apnKey(r.apn) || addrKey(r.addr)); if (M.exclude[id]) return; const twin = [...all, ...macroRows.filter(x => x.saleDate && (!r.saleDate || Math.abs(new Date(x.saleDate) - new Date(r.saleDate)) <= 90 * 864e5))].filter(x => same(x, r)).sort((x, y) => { const sc = z => z.saleDate ? (r.saleDate ? Math.abs(new Date(z.saleDate) - new Date(r.saleDate)) / 864e5 : 500) : /Pend|Contract/i.test(z.status || '') ? 2e5 : 3e5; return sc(x) - sc(y); })[0];   // a house with several listings: the closed one nearest the recorded sale if (twin && M.exclude[twin.mls]) return;
      if (twin && !all.includes(twin)) macroUsed.set(twin.mls, twin);
      const seed = { mls: twin ? twin.mls : '', apn: r.apn, key: r.addr ? addrKey(r.addr) : '', label: r.addr }; const was = findComp(seed);
      if (was && was.src.crs && !was.src.crs.fromList) { crsIn.push({ ...r, mls: seed.mls }); return; }   // her CRS report is already on it
      const { isNew } = upsertComp(seed, 'crs', crsFromList(r), fid); if (isNew) crsNew++; crsIn.push({ ...r, mls: seed.mls, status: 'Closed' }); });
    logFile(M.file.split(' + ').filter(n => /crs|prospect/i.test(n)).join(' + ') || 'CRS list', 'CRS report', crsIn.length, fid); }
  { let hist = 0; app.job.comps.forEach(c => { const cur = c.src.mls; macroRows.filter(x => x.saleDate && (!cur || x.mls !== cur.mls) && !macroUsed.has(x.mls) && same(x, { apn: c.apn || V(c, 'apn'), addr: V(c, 'addr') || c.label })).forEach(x => { c.mlsOther = c.mlsOther || []; if (!c.mlsOther.some(o => o.mls === x.mls)) { c.mlsOther.push(x); hist++; } }); }); }   // earlier MLS sales of the same houses, from the macro search
  if (macroUsed.size) ingestMls([...macroUsed.values()], 'Macro search: ' + String(o.market.file || 'MLS export'));   // the MLS data for CRS sales that were only in the macro search
  await archPhotoFill(false); const left = Object.keys(M.exclude).length; const onGrid = microToGrid([...rows, ...crsIn.map(r => ({ ...r, status: 'Closed' }))]); save(); render();
  if (!quiet) toast(`Added your Search Criteria search: ${rows.length} listings` + (crsRows.length ? ` and ${crsIn.length} CRS sales (${crsNew} not in the MLS search)` : '') + (macroUsed.size ? `; MLS data for ${macroUsed.size} of them from your macro search` : '') + (onGrid ? `, ${onGrid} put on the grid` : '') + (left ? ` (${left} you unticked on the Market tab left out)` : '') + (missing ? ` – ${missing} file${missing > 1 ? 's were' : ' was'} not found` : ''), 7000);
  return note;
}
window.addEventListener('focus', async () => { const o = await readOrders(); if (o.length !== (app.orders || []).length) { app.orders = o; render(); } else app.orders = o; });
const jobLabel = j => { const same = app.jobs.filter(x => x.name === j.name).length > 1; return j.name + (same ? ` – started ${new Date(j.created || 0).toLocaleDateString()} ${new Date(j.created || 0).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, ${(j.comps || []).filter(c => c.use).length} on the grid` : ''); };   // two assignments with one name: tell them apart
const orderName = o => [o.fileNo, String(o.address || '').split(',')[0].trim()].filter(Boolean).join(' ') || 'Order';
async function jobFromOrder(o) {
  const parts = String(o.address || '').split(',').map(x => x.trim());
  const sub = { addr: parts[0] || '', city: parts[1] || '', zip: ((parts[2] || '').match(/\d{5}/) || [''])[0], apn: o.apn || '', lat: o.lat || '', lon: o.lon || '', eff: o.effective || todayISO() };
  if (o.unit) sub.unit = o.unit;
  if (app.job) await saveNow(); app.jobs = (await DB.all('jobs')).sort((a, b) => b.updated - a.updated);   // Oct 20 2026: a window open since yesterday did not know the assignment made in another window and started a second one – always look at what is saved
  let j = app.jobs.find(x => x.orderId === o.id);
  if (!j) {   // Oct 20 2026: never start a second assignment for a property she already has one for – an assignment with the same subject (address or APN) that is not tied to another order is this one
    const ak = addrKey(parts[0] || ''), pk = apnKey(o.apn || ''); const ids = new Set((app.orders || []).map(x => x.id));
    j = app.jobs.find(x => (!x.orderId || !ids.has(x.orderId)) && ((pk && apnKey(x.subject.apn) === pk) || (ak && addrKey(x.subject.addr || '') === ak)) && (x.comps || []).length) || null;
    if (j) { j.orderId = o.id; toast('Linked your assignment “' + j.name + '” to this order', 6000); } }
  if (j) { Object.entries(sub).forEach(([k, v]) => { if (v && !j.subject[k]) j.subject[k] = v; }); if (o.effective) j.subject.eff = o.effective; app.job = j; }
  else { j = await newJob(orderName(o)); j.orderId = o.id; Object.assign(j.subject, sub); }
  if (o.crs && !j.subject.crs) j.subject.crs = crsCanon(o.crs);
  j.subject.listings = o.listings || []; j.fileNo = o.fileNo || '';
  app.sel = null; await saveNow(); await loadPhotos(); toast('Opened the assignment for order ' + orderName(o));
  await pullWorkfile(o);
  { const M = orderMicro(o); if (M && !microIn(j, M)) { const had = j.comps.some(c => c.use); await pullMicro(o, true); const g = had ? 0 : j.comps.filter(c => c.use).length; toast('Opened the assignment for order ' + orderName(o) + ' and added your Search Criteria search (' + M.file + ')' + (g ? ` – its ${g} listing${g > 1 ? 's are' : ' is'} on the grid to start. Next: upload a CRS report for each (Add comps).` : ''), 9000); } }
}
async function newJob(name) {
  const j = { id: uid(), name: name || 'New assignment', created: Date.now(), updated: Date.now(), subject: { addr: '', city: '', zip: '', apn: '', lat: '', lon: '', eff: todayISO() }, comps: [], files: [] };
  app.jobs.unshift(j); app.job = j; app.sel = null; await saveNow(); return j;
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); }
function jobStatus(J) {   // for the green check on the Appraisal Assistant's Comp genie tab: what the grid pre-check still finds
  let n; try { n = precheckGrid(J).filter(x => !/outside the adjusted range/.test(x.msg)).map(x => x.msg); } catch (e) { n = ['the grid could not be checked']; }
  return { n, at: Date.now() };
}
async function saveNow() { if (!app.job) return; app.job.updated = Date.now(); app.job.status = jobStatus(app.job);
  if (app.job.orderId && window.parent !== window) { try { window.parent.postMessage({ type: 'aa-genie-status', order: app.job.orderId, n: app.job.status.n }, location.origin); } catch (e) {} }
  await DB.put('jobs', app.job); if (!POP && !CPOP) await DB.put('kv', { id: 'lastJob', v: app.job.id }); wbNotify(); if (!POP && !CPOP) { snapMaybe(app.job); myDbAuto(); } }

/* ---------------- photos ---------------- */
app.photos = []; // [{id, mls, n, name}] for this job (blobs stay in storage)
async function loadPhotos() { app.photos = app.job ? (await DB.byJob(app.job.id)).map(p => ({ id: p.id, mls: p.mls, arch: p.arch, comp: p.comp, n: p.n, name: p.name, file: p.file })) : []; }
const archPhotoNames = c => [...new Set((c.src.arch || []).map(a => String(a.photo || '').trim()).filter(Boolean))];
const photosOf = c => { const m = V(c, 'mls'); const mlsPs = m ? app.photos.filter(p => p.mls === m).sort((a, b) => a.n - b.n) : [];
  const an = archPhotoNames(c); const archPs = an.length ? app.photos.filter(p => p.arch && an.includes(p.arch)).sort((a, b) => an.indexOf(a.arch) - an.indexOf(b.arch)) : [];
  const own = app.photos.filter(p => p.comp === c.id).sort((a, b) => a.n - b.n);
  return [...mlsPs, ...own, ...archPs]; };   // MLS photos first; your archive's front photo when the MLS has none (her note, Oct 20 2026)
/* ---- your archive's front photos: ACI keeps them in "ACI Research\Research Photos" as R…F.IMG (JPEG). She connects a copy of that folder once;
   Chrome remembers it (asks again with one click after a restart). Only the photos of this assignment's comps are copied in. ---- */
const AP = { dir: null, state: '' };   // state: '' not connected · 'ask' connected before, needs a click · 'ok'
async function archPhotoInit() { try { const r = await DB.get('kv', 'archPhotoDir'); if (!r || !r.h) return; AP.dir = r.h; AP.name = r.name || r.h.name;
  AP.state = (await AP.dir.queryPermission({ mode: 'read' })) === 'granted' ? 'ok' : 'ask'; } catch (e) { AP.state = ''; } }
async function archPhotoConnect() {
  if (AP.dir && AP.state === 'ask') { try { if ((await AP.dir.requestPermission({ mode: 'read' })) === 'granted') { AP.state = 'ok'; await archPhotoFill(true); render(); return; } } catch (e) {} }
  if (!window.showDirectoryPicker) { toast('This browser cannot open a folder – use Chrome on your computer'); return; }
  let h; try { h = await window.showDirectoryPicker({ id: 'aciphotos', mode: 'read' }); } catch (e) { if (e && e.name !== 'AbortError') toast('Chrome would not open that folder (' + (e.message || e.name) + '). Copy the Research Photos folder to Documents and pick the copy.', 9000); return; }
  let n = 0; for await (const [nm] of h.entries()) { if (/^R[0-9A-Z]+F\.IMG$/i.test(nm)) { n++; if (n > 3) break; } }
  if (!n) { toast('No ACI photos (R…F.IMG) in “' + h.name + '”. Pick the “Research Photos” folder.', 8000); return; }
  AP.dir = h; AP.name = h.name; AP.state = 'ok'; await DB.put('kv', { id: 'archPhotoDir', h, name: h.name }); await archPhotoFill(true); render();
}
async function archPhotoFill(loud) {
  if (AP.state !== 'ok' || !app.job) return 0; const have = new Set(app.photos.filter(p => p.arch).map(p => p.arch)); let n = 0, miss = 0;
  for (const c of app.job.comps) { if (photosOf(c).length) continue;   // MLS photos (or an archive photo) already there
    for (const nm of archPhotoNames(c)) { if (have.has(nm)) continue; let f = null;
      for (const ext of ['.IMG', '.img', '.jpg', '.JPG']) { try { f = await (await AP.dir.getFileHandle(nm + ext)).getFile(); break; } catch (e) {} }
      if (!f) { miss++; continue; } have.add(nm);
      await DB.put('photos', { id: app.job.id + ':arch:' + nm, jobId: app.job.id, mls: '', arch: nm, n: 0, name: nm + '.jpg', file: 'arch', blob: new Blob([await f.arrayBuffer()], { type: 'image/jpeg' }) }); n++; break; } }
  if (n) await loadPhotos(); if (loud || n) toast(n ? `${n} front photo${n > 1 ? 's' : ''} from your archive added` + (miss ? ` (${miss} named in the archive but not in the folder)` : '') : 'No archive photos needed – every comp with an archive photo already has a photo', 6000);
  return n;
}
const archPhotoPill = () => !ARCH.loaded ? '' : AP.state === 'ok' ? `<span class="pill ok" title="Front photos from your ACI archive fill in when a comp has no MLS photo">Archive photos ✓</span>` : `<button class="pill warn" data-act="archphotos" title="Connect your ACI Research Photos folder so a comp's front photo comes from your archive when the MLS has none">${AP.state === 'ask' ? 'Archive photos – click to reconnect' : 'Connect archive photos'}</button>`;
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
  c.src.arch = rows.map(r => ({ rec: r.rec_id, label: archLabel(r), report: r.from_report || '', entered: r.entered_date || '', role: r.record_role || '', photo: r.front_photo || '', also: (() => { try { return JSON.parse(r.also_reports || '[]'); } catch (e) { return []; } })(), v: archCanon(r) }));
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
  if (srcName === 'mls' && rec && c.src.mls && c.src.mls.mls && rec.mls && c.src.mls.mls !== rec.mls) {   // another listing of the same house: keep the newer one, the other is its listing history
    const when = x => String(x.saleDate || x.contractDate || x.listDate || ''); const [newer, older] = when(rec) >= when(c.src.mls) ? [rec, c.src.mls] : [c.src.mls, rec];
    c.mlsOther = (c.mlsOther || []).filter(o => o.mls !== older.mls && o.mls !== newer.mls); c.mlsOther.push(older); rec = newer; }
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
      if (low.endsWith('.zip')) { const z = await readZip(f); if (z.has('comp-genie.json')) { backupPick(z, f.name); continue; } if (z.has('orders.json')) { notes.push(f.name + ': this Appraisal Assistant backup has no Comp genie assignments in it – try the backup from the day before'); continue; } notes.push(z.has('inspection-backup.json') ? await ingestInspection(z, f.name) : await ingestPhotos(f, z)); }
      else if (low.endsWith('.csv')) {
        const text = await readText(f); const head = text.slice(0, 2000).toLowerCase();
        if (head.includes('listing number')) notes.push(ingestMls(parseMlsCsv(text), f.name));
        else if (head.includes('grantor')) notes.push(await ingestCort(parseCortCsv(text), f.name));
        else notes.push(f.name + ': not an MLS export or a CORT table');
      } else if (low.endsWith('.xlsx')) notes.push(await ingestXlsx(f));
      else if (low.endsWith('.gz') || low.endsWith('.json')) notes.push(await ingestJson(f));
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
  setCort(app.cort); await DB.put('kv', { id: 'cort', rows: app.cort });   // saved first – it works from the start page too (no assignment open)
  if (app.job) { logFile(name, 'CORT table', added, fid); app.job.comps.forEach(attachCort); }
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
    let added = 0; if (Array.isArray(data.myComps) && data.myComps.length) { const rec = await DB.get('kv', 'mycomps'); const list = (rec && rec.v) || []; data.myComps.forEach(r => { const i = list.findIndex(x => x.key === r.key); if (i < 0) { list.push(r); added++; } else if ((r.saved || 0) > (list[i].saved || 0)) list[i] = r; }); await DB.put('kv', { id: 'mycomps', v: list }); }
    return 'Assignment restored: ' + j.name + (added ? ` · ${added} comp${added === 1 ? '' : 's'} added back to your comp database` : '');
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
  return `<header class="top"><h1>Comp Genie</h1><span class="pill ver" title="The Comp genie version – after Ctrl+R it should match the one I tell you">Version ${typeof BUILD !== 'undefined' ? BUILD : ''}</span>
    <span class="pill ${ARCH.loaded ? 'ok' : 'warn'}">${ARCH.loaded ? `Archive: ${ARCH.rows.length.toLocaleString()} records` : 'Archive not loaded'}</span>${archPhotoPill()}
    <span class="pill">${app.cort.length ? `CORT: ${app.cort.length} sales` : 'No CORT table'}</span><span class="pill" title="Your land sale and construction cost databases (shared with the cost approach)">${(app.land || []).length ? `Land sales: ${app.land.length}` : 'No land sales'} · ${app.costDb ? `Costs: ${app.costDb.projects.length} projects` : 'No cost database'}</span><span class="grow"></span>
    <button class="btn" data-act="newjob">New assignment</button>
    ${open.length ? `<select data-act="fromorder" aria-label="Start from an order"><option value="">From an order…</option>${open.map(o => `<option value="${o.id}">${esc(orderName(o))}</option>`).join('')}</select>` : ''}</header>
  ${(() => { const todo = open.filter(o => !app.jobs.some(j => j.orderId === o.id)); return todo.length ? `<section class="card"><h2>Orders not started here yet</h2><p class="muted">Every open order in the Appraisal Assistant. Click <b>Start</b> and its assignment is made from the order (subject, effective date, your Search Criteria search).</p>
    <table class="tbl homelist"><thead><tr><th>Order</th><th>Subject</th><th>Client</th><th>Status</th><th></th></tr></thead><tbody>${todo.map(o => `<tr><td><b>${esc(o.fileNo || '')}</b></td><td>${esc(o.address || '')}</td><td>${esc(((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name || '')}</td><td>${esc(o.stage || 'New')}</td><td><button class="btn primary" data-act="startorder" data-id="${o.id}">Start</button></td></tr>`).join('')}</tbody></table></section>` : ''; })()}
  <section class="card"><h2>Your assignments</h2>
    ${app.jobs.length ? `<p class="muted">Click one to open it. To go back to this list later, choose <b>All assignments</b> in the Assignment box at the top.</p>
    <table class="tbl homelist"><thead><tr><th>Assignment</th><th>Subject</th><th>Effective date</th><th>Comps</th><th>Order</th><th>Last changed</th></tr></thead><tbody>
    ${app.jobs.map(j => { const o = orderOfJ(j), S = j.subject || {}; const used = (j.comps || []).filter(c => c.use).length;
      return `<tr data-act="openjob" data-id="${j.id}" tabindex="0" style="cursor:pointer"><td><b>${esc(jobLabel(j))}</b></td><td>${esc([S.addr, S.city].filter(Boolean).join(', '))}</td><td>${esc(S.eff || '')}</td><td>${(j.comps || []).length}${used ? ` (${used} on the grid)` : ''}</td><td>${o ? esc(o.fileNo || '') + (o.stage ? ' · ' + esc(o.stage) : '') : `<button class="btn small" data-act="mkorder" data-id="${j.id}" title="Add this assignment to the Appraisal Assistant as an order">Make it an order</button>`}</td><td>${esc(d(j.updated))}</td></tr>`; }).join('')}
    </tbody></table>` : '<p>No assignments yet. Click <b>New assignment</b>, or start one <b>From an order</b> in the Appraisal Assistant.</p>'}
  </section>
  <footer class="foot">Comp Genie · your data stays on this computer · build ${typeof BUILD !== 'undefined' ? BUILD : ''}</footer>`;
}
/* every redraw keeps her place on the page (her note, Oct 20 2026: saving a comp to her database jumped to the top);
   the few actions that should go to the top (open an assignment, the start page) scroll there themselves after render */
function render() { const y = window.scrollY; rcRun(renderPage); if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); requestAnimationFrame(() => { if (Math.abs(window.scrollY - y) > 2 && !render.top) window.scrollTo(0, y); render.top = false; }); }
function renderPage() {
  const J = app.job; const root = $('#app');
  if (J && !J.gridManual && J.comps.some(c => c.use) && !gridInDateOrder(J)) { gridDateOrder(J); save(); }   // her rule: the grid is in closing-date order unless she numbered it herself
  if (CPOP) { const c = J && J.comps.find(x => x.id === CPOP.id); root.innerHTML = c ? `<header class="top pop"><h1>Comp Genie</h1><span class="pill">${esc(J.name)}</span><span class="grow"></span><small>stays in step with your other windows</small></header>` + detailHTML(c) : '<p class="help">That comp is no longer in this assignment.</p>'; document.title = (c ? compTitle(c) : 'Comp') + ' · ' + (J ? J.name : ''); fillImages(); return; }
  if (POP) { root.innerHTML = popHTML(J); document.title = `Comps ${POP.from}–${POP.to} · ${J.name}`; wbUndoBar(); return; }
  if (app.home || !J) { root.innerHTML = homeHTML(); document.title = 'Comp Genie'; return; }
  document.title = 'Comp Genie · ' + J.name;
  root.dataset.stage = J.stage || (J.comps.some(c => c.use) ? 'workbook' : 'micro');
  root.innerHTML = `
  <header class="top"><h1>Comp Genie</h1><span class="pill ver" title="The Comp genie version – after Ctrl+R it should match the one I tell you">Version ${typeof BUILD !== 'undefined' ? BUILD : ''}</span>
    <span class="pill ${ARCH.loaded ? 'ok' : 'warn'}">${ARCH.loaded ? `Archive: ${ARCH.rows.length.toLocaleString()} records` : 'Archive not loaded'}</span>${archPhotoPill()}
    <span class="pill">${app.cort.length ? `CORT: ${app.cort.length} sales` : 'No CORT table'}</span><span class="pill" title="Your land sale and construction cost databases (shared with the cost approach)">${(app.land || []).length ? `Land sales: ${app.land.length}` : 'No land sales'} · ${app.costDb ? `Costs: ${app.costDb.projects.length} projects` : 'No cost database'}</span>
    <span class="grow"></span>
    <label class="jobsel">Assignment <select data-act="pickjob" id="jobpick"><option value="">All assignments (start page)</option>${app.jobs.map(j => `<option value="${j.id}" ${j.id === J.id ? 'selected' : ''}>${esc(jobLabel(j))}</option>`).join('')}</select></label>
    <button class="btn" data-act="newjob">New assignment</button>
    ${(app.orders || []).some(o => !ORDER_DONE.includes(o.stage || 'New')) ? `<select data-act="fromorder" aria-label="Start from an order"><option value="">From an order…</option>${app.orders.filter(o => !ORDER_DONE.includes(o.stage || 'New')).sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || ''))).map(o => `<option value="${o.id}">${esc(orderName(o))}</option>`).join('')}</select>` : ''}
    <button class="btn" data-act="backup" title="Save this assignment to a file">Back up</button><button class="btn" data-act="snaps" title="Every assignment is saved here automatically as you work (every 20 minutes, the last 12 kept, plus one a day for 2 weeks) – bring back an earlier version as a copy">Earlier versions…</button><label class="btn" title="Bring back an assignment from your Appraisal Assistant daily backup (.zip) or a Comp genie backup – as a copy, nothing here is changed">Restore from a backup…<input type="file" accept=".zip,.gz,.json" data-act="files" hidden></label>
    ${app.confirm === 'deljob' ? `<span class="confirm">Delete “${esc(J.name)}”? <button class="btn danger solid" data-act="deljob-yes">Delete</button><button class="btn" data-act="cancel">Keep</button></span>` : `<button class="btn danger" data-act="deljob">Delete</button>`}
  </header>
  ${ARCH.loaded ? '' : `<section class="card notice"><b>Load your comp archive${app.jobs.some(j => j.comps.length) ? ' in this browser' : ' once'}.</b> ${app.jobs.some(j => j.comps.length) ? 'Each browser (Chrome, Firefox, Edge) keeps its own copy, and this one has none yet. ' : ''}Drop <i>Comp Archive.json.gz</i> and <i>CORT Sales.csv</i> anywhere on this page (or <label class="link">choose it<input type="file" multiple data-act="files" hidden></label>). It is saved on this computer only; nothing is uploaded.</section>`}
  ${stageBarHTML(J)}
  <div class="busy" id="busy" ${app.busy ? '' : 'hidden'}>${esc(app.busy)}</div>
  <section class="card st st-micro"><h2>Subject</h2>${subjectHTML(J)}</section>
  <section class="card st st-micro"><h2>Add comps</h2>
    <div class="addrow"><div class="sugwrap"><input id="addr" class="txt big" placeholder="Type a comp address, e.g. 1181 Glenview" autocomplete="off" data-act="sugg"><div class="sugg" id="sugg"></div></div>
      <button class="btn primary" data-act="add">Add comp</button></div>
    <p class="help">If the address is in your archive, it fills in at once with every version you have. Then drop files to add to it.</p>
    ${(() => { const o = (app.orders || []).find(x => x.id === J.orderId); const M = orderMicro(o); if (!o) return `<p class="help">This assignment is not an order in the Appraisal Assistant yet. <button class="btn small" data-act="mkorder" data-id="${J.id}">Make it an order</button></p>`; if (!M) return `<p class="help">No Search Criteria search on this order yet. In the Appraisal Assistant, open the order's <b>Market</b> tab and drop it in box 2; it comes in here.</p>`;
      return microIn(J, M) ? `<p class="help"><b class="ok">✓</b> Your Search Criteria search from the order's Market tab is in: <b>${esc(M.file)}</b>${Object.keys(M.exclude).length ? ` (${Object.keys(M.exclude).length} listing${Object.keys(M.exclude).length > 1 ? 's' : ''} you unticked there left out)` : ''}. <button class="lnk" data-act="pullmicro">Bring it in again</button></p>`
        : `<div class="row"><button class="btn primary" data-act="pullmicro">Add your Search Criteria search (${M.n} listings)</button><span class="help">from the order's Market tab: ${esc(M.file)}</span></div>`; })()}
    ${crsNeedHTML(J)}${photoNeedHTML(J)}
    <label class="drop" id="drop"><input type="file" multiple data-act="files" hidden>
      <b>Drop files here</b> or click to choose: MLS export (.csv) · MLS photos (.zip) · MLS printout (.pdf) · CRS reports (.pdf) · CORT table (.csv) · comp archive (.gz) · your land sales or cost database (.xlsx)</label>
    ${(J.files || []).length ? `<details class="files"${crsNeedHTML(J) || /^rf:/.test(app.confirm || '') ? ' open' : ''}><summary><b>Files in this assignment</b> <small>${J.files.length}${crsNeedHTML(J) ? '' : ' · <span class="ccdone">✓</span> nothing else needed'} · (✕ takes a file back out)</small></summary><ul>${J.files.map(f => `<li>${esc(f.name)} <small>${esc(f.kind)}${f.n ? ', ' + f.n : ''}</small> ${app.confirm === 'rf:' + f.id ? `<span class="confirm">Take it out? <button class="btn danger solid sm" data-rfyes="${esc(f.id)}">Remove file</button><button class="btn sm" data-act="cancel">Keep</button></span>` : `<button class="btn sm" data-rf="${esc(f.id)}" title="Remove this file and what it added">✕</button>`}</li>`).join('')}</ul></details>` : ''}
  </section>
  <section class="card st st-micro" id="compsCard">${compsCardHTML(J)}</section>
  <section class="card st st-workbook" id="wbStrip">${confirmStripHTML(J)}</section>
  <div id="detail" class="st st-micro st-workbook">${app.sel ? detailHTML(J.comps.find(c => c.id === app.sel)) : ''}</div>
  <section class="card st st-workbook" id="gridCard">${gridHTML(J)}</section>
  <section class="card st st-final" id="finalCard">${finalGridHTML(J)}</section>
  <section class="card st st-final" id="mapCard"></section>
  <section class="card st st-workbook" id="refCard">${refHTML(J)}</section>
  <section class="card st st-workbook" id="costCard">${costHTML(J)}</section>
  <section class="card st st-workbook" id="incomeCard">${incomeHTML(J)}</section>
  <section class="card st st-workbook st-final" id="nuCard">${notUsedHTML(J)}</section>
  <section class="card st st-workbook" id="timeCard">${timeHTML(J)}</section>
  <section class="card st st-workbook" id="supCard">${supHTML(J)}</section>
  <section class="card st st-final" id="preCard">${precheckHTML(J)}</section>
  <section class="card st st-final" id="reportCard">${reportHTML(J)}</section>
  <section class="card st st-final" id="exportCard"><h2>Export</h2>${exportHTML(J)}</section>
  <footer class="foot">Comp Genie · your data stays on this computer · build ${typeof BUILD !== 'undefined' ? BUILD : ''}</footer>`;
  fillImages(); mapsRender(); { const t = document.querySelector('.top'); if (t) document.documentElement.style.setProperty('--toph', t.offsetHeight + 'px'); }   // the comp's sticky header sits under the top bar
}
/* Redraw after a field changes without losing your place: Tab moves on first, then the page is
   redrawn and the cursor is put back in the field you tabbed (or clicked) into. */
const FOCUS_KEYS = ['data-gfact', 'data-subj', 'data-edit', 'data-jobname', 'data-notes', 'data-gadj', 'data-gsubj', 'data-grate', 'data-gvalue', 'data-gnote', 'data-gok', 'id'];
function renderKeepFocus() {
  setTimeout(() => {
    const a = document.activeElement; let key = null;
    if (a && a !== document.body) for (const k of FOCUS_KEYS) { const v = a.getAttribute(k); if (v) { key = [k, v]; break; } }
    const pos = a && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    render();
    if (key) { const el = document.querySelector(`[${key[0]}="${CSS.escape(key[1])}"]`); if (el) { el.focus({ preventScroll: true }); try { if (pos) el.setSelectionRange(pos[0], pos[1]); } catch (e) {} } }
  }, 0);
}
/* her ask Oct 20 2026: select all / several comps and act on them at once */
const CSEL = new Set();
function bulkBarHTML(J) { if (!J.comps.length) return '';
  const n = CSEL.size; const off = J.comps.filter(c => !c.use).length;
  return `<div class="bulk"><b>Select:</b> <button class="lnk" data-act="csel" data-w="all">all ${J.comps.length}</button> · <button class="lnk" data-act="csel" data-w="off">not in the workbook (${off})</button> · <button class="lnk" data-act="csel" data-w="none">none</button>
    ${n ? `<span class="bsel"><b>${n} selected:</b> <button class="btn sm primary" data-act="bulkgrid">Put in the workbook</button>
      <button class="btn sm" data-act="bulknu">Analyzed – not used</button> reason <select data-bulkreason>${NOTUSED_REASONS.map(([v, l]) => `<option value="${v}" ${v === 'DesignOrStyleVariance' ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <label class="inl"><input type="checkbox" data-bulkdb> also save to my comp database</label> <button class="btn sm" data-act="bulkdb" title="Save the ticked comps to your comp database (on this computer; merged into your archive at the next rebuild) – they stay where they are">Save to my comp database</button></span>` : '<small class="muted">tick comps in the first column, or use a quick select</small>'}</div>`; }
const compsCardHTML = J => J.ccDone ? `<div class="row"><h2 style="margin:0"><span class="ccdone">✓</span> Comps considered <small>${J.comps.length} · done</small></h2><span class="grow"></span><button class="btn sm" data-act="ccopen" title="Show the list again">Show ▾</button></div>`
  : `<div class="row"><h2 style="margin:0">Comps considered <small>${J.comps.length}</small></h2><span class="grow"></span>${J.comps.length ? `<button class="btn sm" data-act="ccdone" title="Mark the list finished and fold it away (Show ▾ brings it back)" style="color:var(--ok);border-color:#8fcca0">✓ Done – collapse</button>` : ''}${(() => { const n = J.comps.filter(c => !c.use && !c.notUsed).length; return n ? `<button class="btn sm primary" data-act="gridall" title="Puts on the grid every comp that is not on the grid yet and not already listed under Analyzed – not used, in closing-date order">All undecided → Workbook (${n})</button>` : ''; })()}${J.comps.filter(c => c.use).length > 1 && !gridInDateOrder(J) ? `<button class="btn sm" data-act="gridorder" title="Comp 1 = the most recent closing, as in this list">Number the grid in closing-date order</button>` : ''}${J.comps.length ? (app.confirm === 'rmall' ? `<span class="confirm">Remove all ${J.comps.length} comps from this assignment? <button class="btn danger solid sm" data-act="rmall-yes">Remove all</button><button class="btn sm" data-act="cancel">Keep</button></span>` : `<button class="btn sm danger" data-act="rmall">Remove all comps</button>`) : ''}</div>${bulkBarHTML(J)}${compsTable(J)}`;
/* Redraw only what depends on a typed value, so the field you are in (and the next one you Tab to) is never replaced. */
function renderParts(opts = {}) { return rcRun(() => renderParts0(opts)); }
function renderParts0(opts = {}) {
  const J = app.job;
  const jp = $('#jobpick'); if (jp) jp.innerHTML = app.jobs.map(j => `<option value="${j.id}" ${j.id === J.id ? 'selected' : ''}>${esc(jobLabel(j))}</option>`).join('');
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
function compGroup(c) { const st = String(V(c, 'status') || (currentSale(c) || {}).status || ''); if (/closed|sold|settled/i.test(st) || (!st && V(c, 'saleDate'))) return 0; if (/pending|contract|contingent/i.test(st)) return 1; if (/active|coming/i.test(st)) return 2; return 3; }   // Oct 20 2026: her ▾ pick saves SettledSale – it dropped 604 Dara from comp 3 to comp 10
function compOrder(a, b) {
  const ga = compGroup(a), gb = compGroup(b); if (ga !== gb) return ga - gb;
  const d = c => String((ga === 0 ? V(c, 'saleDate') : ga === 1 ? V(c, 'contractDate') || V(c, 'listDate') : V(c, 'listDate')) || V(c, 'saleDate') || '');
  return d(b).localeCompare(d(a));
}
function compsTable(J) {
  if (!J.comps.length) return '<p class="help">No comps yet. Type an address above, or drop your MLS export.</p>';
  const rows = [...J.comps].sort(compOrder);
  [...CSEL].forEach(id => { if (!J.comps.some(c => c.id === id)) CSEL.delete(id); });
  const maxUse = Math.max(9, J.comps.length);
  return `<div class="tablewrap"><table class="comps"><thead><tr><th class="ck"><input type="checkbox" data-cselall title="Select all" ${J.comps.length && J.comps.every(c => CSEL.has(c.id)) ? 'checked' : ''}></th><th title="Green ✓ = sent to the workbook, with its comp number">Workbook</th><th></th><th>Address</th><th>Status</th><th class="r">Price</th><th>Date</th><th class="r">GLA</th><th title="From the MLS listing (Construction: Single Story, Two Story, Split Level, Tri-Level); blank when the agent did not tick one or the sale is not in the MLS">Stories</th><th class="r">Site</th><th>Q / C</th><th>Location</th><th>View</th><th class="r" title="Usable lot area / utility">Usable</th><th class="r">Miles</th><th>Sources</th><th></th></tr></thead><tbody>
  ${rows.map(c => { const fr = frontOf(c); const px = proximity(c, J); const flAll = compFlags(c, J); const fl = flAll.filter(x => !flagChecked(c, x)); const warn = fl.filter(x => x.sev === 'warn').length;
    const st = V(c, 'status') || ((currentSale(c) || {}).status || '');
    return `<tr class="${c.id === app.sel ? 'sel' : ''} ${c.use ? 'used' : ''}" data-open="${c.id}">
      <td class="ck"><input type="checkbox" data-csel="${c.id}" ${CSEL.has(c.id) ? 'checked' : ''} aria-label="Select"></td>
      <td class="usecell"><button class="wbtick${c.use ? ' on' : ''}" data-quse="${c.id}" aria-pressed="${c.use ? 'true' : 'false'}" title="${c.use ? 'In the workbook – click to take it out (it stays here, under Analyzed – not used)' : 'Click to send it to the workbook'}">${c.use ? '✓' : ''}</button><select data-use="${c.id}" aria-label="Use as comp number" title="Or pick its comp number">${'<option value="">–</option>'}${Array.from({ length: maxUse }, (_, i) => `<option ${c.use === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>${!c.use && c.notUsed ? '<br><small class="nutag">analyzed – not used</small>' : ''}</td>
      <td>${fr ? `<img class="thumb" data-photo="${fr.id}" alt="">` : `<button type="button" class="nothumb" data-pickphoto="${c.id}" title="${archPhotoNames(c).length && AP.state !== 'ok' ? 'Your archive has a front photo of this one – click to connect your archive photos' : 'Click to add a photo: the MLS photos zip, or a picture of the front'}">📷</button>`}</td>
      <td><b>${esc(compTitle(c))}</b>${linesBadge(c, J)}${c.use && fl.length ? ` <span class="badge flagred" title="${esc(fl.map(x => x.t).join('\n'))}">⚑ ${fl.length}</span>` : c.use && flAll.length ? ' <span class="badge flagok" title="All flags checked">✓</span>' : ''}<br><small>${esc(V(c, 'mls') ? 'MLS ' + V(c, 'mls') : '')}</small> <button class="btn xs" data-act="cpop" data-id="${c.id}" title="Open this comp in its own window you can move to another screen">↗ pop out</button></td>
      <td>${esc(statusText(st))}</td><td class="r">${money(V(c, 'salePrice') || V(c, 'listPrice'))}${!V(c, 'salePrice') && V(c, 'listPrice') ? '<br><small>list</small>' : ''}</td>
      <td>${esc(showDate(V(c, 'saleDate') || V(c, 'contractDate')))}</td><td class="r">${int(V(c, 'gla'))}</td><td>${(() => { const tg = (c.src.mls && c.src.mls.storyTags) || []; if (tg.length) return esc(tg.map(x => x.replace(/ Story$/i, '').replace(/-?Level$/i, ' level').replace(/^Tri level$/i, 'Tri-level')).join(', ')); const word = n => n === 1 ? 'Single' : n === 2 ? 'Two' : n === 3 ? 'Three' : n === 4 ? 'Four' : esc(n);
      const n = (c.src.mls && c.src.mls.stories) || (c.src.pdf && c.src.pdf.stories) || null; if (n) return word(n);
      const a = archChosen(c) || (c.src.arch || [])[0]; const an = a && a.v && a.v.stories;   // her 2.6 Design line (DT1;Ranch) in your archive
      return an ? `<span title="From your archive: ${esc(a.v.designRaw || '')}">${word(an)} <small class="muted">archive</small></span>` : ''; })()}</td><td class="r">${esc(fmt(FIELD.siteSf, V(c, 'siteSf')))}</td>
      <td>${esc([V(c, 'quality'), V(c, 'condition')].filter(Boolean).join(' / '))}</td><td><small>${esc((() => { const F = compFacts(c, J); return String(F.loc || '').slice(0, 40); })())}</small></td><td><small>${esc([V(c, 'viewRating'), V(c, 'viewTypes')].filter(Boolean).join(': ')).slice(0, 40)}</small></td><td class="r">${(() => { const u = compFacts(c, J).usable; return blank(u) ? '' : (+u).toFixed(2) + ' ac'; })()}</td>
      <td class="r">${px ? px.mi.toFixed(2) + '<br><small>' + px.dir.replace(/([a-z])([A-Z])/, '$1 $2') + '</small>' : ''}</td>
      <td>${sourcesOf(c).map(s => `<span class="src">${esc(s)}</span>`).join(' ')}</td>
      <td>${app.confirm === 'rm:' + c.id ? `<span class="rmask">Keep it as analyzed – not used? <button class="btn sm primary" data-rmnu="${c.id}">Keep as not used</button><button class="btn sm primary" data-rmnu="${c.id}" data-nudb="1" title="Listed under Analyzed – not used, and saved to your comp database">Keep as not used + save to my comp database</button><button class="btn sm" data-rmdb="${c.id}">Save to my comp database, then remove</button><button class="btn danger solid sm" data-rmyes="${c.id}">Remove</button><button class="btn sm" data-act="cancel">Cancel</button></span>` : `<button class="btn sm" data-rm="${c.id}" title="Remove from this list">✕</button>`}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
const DETAIL_ALWAYS = ['quality', 'condition', 'beds', 'full', 'half', 'garage', 'carport'];   // her lines, always there to fill in
const PR_FROM_MLS = { yearBuilt: 'assessorYB', gla: 'assessorSf' };   // public-record figures the MLS export carries (never its total baths – she uses full and half baths only)
function cellHTML(c, f, s, S, using) {
  const v = S[s] ? S[s][f.k] : null;
  if (blank(v) && s === 'crs' && S.mls && PR_FROM_MLS[f.k] && !blank(S.mls[PR_FROM_MLS[f.k]])) { const pv = S.mls[PR_FROM_MLS[f.k]];
    return `<td class="srccell prmls" title="The public-record figure shown in the MLS export – type it in Your value to use it">${esc(fmt(f, pv))} <small class="muted">public record (MLS)</small></td>`; }
  if (blank(v)) return `<td class="srccell empty"></td>`;
  const on = using.src === s;
  return `<td class="srccell ${on ? 'on' : ''}" data-pick="${s}" data-field="${f.k}" title="Use the ${esc(SRC[s].name)} value">${esc(fmt(f, v))}</td>`;
}
/* MLS listing link (her request): a link pattern she sets up once from one of her own MLS listing pages – nothing is fetched by the Comp genie */
let MLSLINK = ''; DB.get('kv', 'mlsLink').then(r => { MLSLINK = (r && r.v) || ''; }).catch(() => {});
let MLSSTART = 'https://www.flexmls.com/'; DB.get('kv', 'mlsStart').then(r => { if (r && r.v) MLSSTART = r.v; }).catch(() => {});   /* SBMLS (Flex) has no address per listing: open her MLS once, then paste each number */
async function mlsGo(n) {
  try { await navigator.clipboard.writeText(n); } catch (e) {}
  let w = window.open('', 'mls-listing', 'width=1200,height=950'); if (!w) { toast('Chrome blocked the MLS window – allow pop-ups for this page', 6000); return; }
  let blank = false; try { blank = !w.location.href || w.location.href === 'about:blank'; } catch (e) { blank = false; }   /* a page from the MLS cannot be read from here: it is already open */
  if (blank) w.location.href = MLSSTART; try { w.focus(); } catch (e) {}
  toast(blank ? `MLS opening – sign in, then click the MLS search box and press Ctrl+V (MLS ${n} is copied)` : `MLS ${n} copied – in the MLS window click the search box and press Ctrl+V`, 7000);
}
function mlsLinkHTML(c) { const n = String(V(c, 'mls')).trim();
  const direct = MLSLINK ? MLSLINK.replace('{mls}', encodeURIComponent(n)).replace('{mlsnodash}', encodeURIComponent(n.replace(/-/g, ''))) : '';
  return `<p class="mlsrow"><b>MLS ${esc(n)}</b> ${direct ? `<button class="btn sm primary" data-act="mlswin" data-u="${esc(direct)}" title="Opens the listing in a window you can move to another screen (you need to be logged in)">Open in MLS ↗</button>` : `<button class="btn sm primary" data-act="mlsgo" data-n="${esc(n)}" title="Copies the number and brings up your MLS window (the sign-in page the first time) – paste it in the MLS search box">Look it up in MLS ↗</button>`}
    <button class="btn sm" data-act="mlscopy" data-n="${esc(n)}">Copy MLS #</button> <button class="lnk" data-act="mlsset">MLS settings</button></p>
  ${app.mlsSet ? `<div class="card notice"><b>Your MLS.</b> Paste the address your MLS opens at (for SBMLS: the Flex sign-in page, e.g. https://www.flexmls.com/). If your MLS ever shows one listing at its own address, paste that address and type its MLS number – then each comp opens straight to its listing.
    <div class="row"><input class="txt" id="mlsUrl" placeholder="${esc(MLSSTART)}" style="flex:2"><input class="txt" id="mlsNo" placeholder="MLS # (only for a listing address)" style="width:16em"><button class="btn primary" data-act="mlssave">Save</button><button class="btn" data-act="mlscancel">Cancel</button></div></div>` : ''}`; }
/* which line of the comp's Field by field table a flag is about (her ask Oct 20 2026: show where the warning is) */
const flagChecked = (c, f) => !!(c.flagOk && c.flagOk[f.t]);   // the same words = the same flag; if the facts change, the flag comes back
const FLAG_KEY = t => /^Square footage|sq ft difference/i.test(t) ? 'gla' : /^Room count/i.test(t) ? 'rooms' : /^Bedrooms/i.test(t) ? 'beds' : /^Baths/i.test(t) ? 'bathsTotal' : /^Sale type/i.test(t) ? 'saleType' : /concession/i.test(t) ? 'concessions' : /^Recorded price|differs from the public record|^Quick resale|^Sold \d+% under|over the list price/i.test(t) ? 'salePrice' : /12 months before the effective/i.test(t) ? 'saleDate' : /^Relisted/i.test(t) ? 'cdom' : /^(Active|Pending|Expired|Withdrawn|Cancel)/i.test(t) ? 'status' : '';
function detailHTML(c) {
  if (!c) return '';
  const J = app.job; const S = srcVals(c); const flAll = compFlags(c, J); const fl = flAll.filter(x => !flagChecked(c, x)); const flDone = flAll.filter(x => flagChecked(c, x)); const ps = photosOf(c); const fr = frontOf(c); const prior = priorSales(c); const px = proximity(c, J);
  const cols = SRC_ORDER.filter(s => ['arch', 'mls', 'crs'].includes(s) || (s === 'cort' ? c.src.cort.length : c.src[s]));   // her three always side by side, even when empty
  let lastG = '';
  const rows = FIELDS.map(f => {
    const u = val(c, f.k); const any = cols.some(s => S[s] && !blank(S[s][f.k])) || !blank(c.edit[f.k]); if (f.k === 'bathsTotal') return '';   // not used: full and half baths only (her rule, Oct 19 2026)
    if (!any && !app.showAll && !DETAIL_ALWAYS.includes(f.k)) return '';   // her own Q and C ratings always have a row
    const head = f.g !== lastG ? `<tr class="grp"><th colspan="${3 + cols.length}">${esc(f.g)}</th></tr>` : ''; lastG = f.g;
    const dis = disagree(c, f.k); const fk = c.use ? fl.filter(x => FLAG_KEY(x.t) === f.k) : [];
    const PICKED = { heatCool: ['grid_heat', 'grid_cool'], saleType: ['grid_xferTerms'], financing: ['grid_terms', 'pk_terms'], garage: ['vs'], carport: ['vs'], quality: ['pk_q'], condition: ['pk_c'] };   // a ▾ pick on the line counts as her value (Oct 20 2026)
    const picked = (PICKED[f.k] || []).some(k => !blank(c.edit[k]) && !(Array.isArray(c.edit[k]) && !c.edit[k].length));
    const open = dis && !c.pick[f.k] && blank(c.edit[f.k]) && !picked;
    const none = !any && blank(u.v) && DETAIL_ALWAYS.includes(f.k) && !picked;   // her ask: a line no source has (quality, condition, beds, baths, garage …) – highlight it to fill in   // her ask Oct 20 2026: sources disagree and she has not chosen yet → yellow until she clicks one (or types her own)
    return head + `<tr${fk.length ? ` class="flagrow" title="${esc(fk.map(x => x.t).join(' · '))}"` : open ? ' class="disrow" title="The sources disagree – click the value to use"' : none ? ' class="disrow emptyrow" title="No source has this – type your value"' : ''}><th>${fk.length ? '<span class="flagmk">⚑</span> ' : ''}${esc(f.l)}${dis ? ' <span class="diff" title="Sources disagree">≠</span>' : ''}</th>
      <td class="using">${esc(fmt(f, u.v))}${u.src ? ` <span class="tag ${u.src}">${esc(SRC[u.src].short)}</span>` : ''}${(c.pick[f.k] || !blank(c.edit[f.k])) ? ` <button class="lnk" data-reset="${f.k}" title="Back to the automatic choice">↺</button>` : ''}</td>
      <td class="mine">${(() => { const own = !blank(c.edit[f.k]); const echo = own ? '' : (blank(u.v) ? '' : String(fmt(f, u.v)));   // her ask Oct 20 2026: the box shows the value in use (the green one); it becomes hers only when she changes it
        if (f.k === 'heatCool' && !own && (c.edit.grid_heat || c.edit.grid_cool)) return `<input class="txt sm own" readonly value="${esc([c.edit.grid_heat || '–', c.edit.grid_cool || '–'].join(' / '))}" title="Your ▾ heating / ▾ cooling picks">` + ` <button type="button" class="btn xs" data-uadpick="${c.id}|heat" title="Heating – UAD 3.6 answers">▾ heating</button> <button type="button" class="btn xs" data-uadpick="${c.id}|cool" title="Cooling – UAD 3.6 answers">▾ cooling</button>`;
        return `<input class="txt sm${own ? ' own' : ' echo'}" data-edit="${f.k}" ${own ? '' : `data-echo="${esc(echo)}"`} value="${esc(own ? (f.t === 'date' ? showDate(c.edit[f.k]) : f.k === 'saleType' ? fmt(f, c.edit[f.k]) : c.edit[f.k]) : echo)}" placeholder="type your value" title="${own ? 'Your value – ↺ goes back to the sources' : 'The value in use (green). Type over it to use your own.'}">` + (f.k === 'quality' || f.k === 'condition' ? qcSel(c.id, f.k === 'quality' ? 'q' : 'c', u.v) + fineSel(c.id, f.k === 'quality' ? 'q' : 'c', J) : '') + (() => { if (f.k === 'heatCool') return ` <button type="button" class="btn xs" data-uadpick="${c.id}|heat" title="Heating – UAD 3.6 answers">▾ heating</button> <button type="button" class="btn xs" data-uadpick="${c.id}|cool" title="Cooling – UAD 3.6 answers">▾ cooling</button>${(() => { const F = compFacts(c, J); return F.heat || F.cool ? `<small class="vsx">3.6: ${esc([F.heat, F.cool].filter(Boolean).join(' / '))}</small>` : ''; })()}`; if (f.k === 'garage') return ` <button type="button" class="btn xs" data-vspick="${c.id}" title="Type | spaces | attachment / driveway surface (UAD 3.6 vehicle storage)">▾ vehicle storage</button>`;   // her ask Oct 20 2026
      const id = f.k === 'sfSource' ? 'sfSource' : f.k === 'saleType' ? 'xferTerms' : Object.keys(WB_EDIT).find(i => WB_EDIT[i] === f.k && PICK[i]); return id ? pkBtn(c.id, id) : ''; })(); })()}</td>
      ${cols.map(s => cellHTML(c, f, s, S, u)).join('')}</tr>`;
  }).join('');
  const archSel = c.src.arch.length ? `<select data-archpick="${c.id}">${c.src.arch.map(a => `<option value="${a.rec}" ${archChosen(c) && archChosen(c).rec === a.rec ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select>` : '';
  const cortSel = c.src.cort.length > 1 ? `<select data-cortpick="${c.id}">${c.src.cort.map((t, i) => `<option value="${i}" ${(c.cortPick || 0) === i ? 'selected' : ''}>${esc(showDate(t.saleDate) + ' ' + money(t.salePrice))}</option>`).join('')}</select>` : '';
  const p = c.src.pdf, m = c.src.mls;
  return `<section class="card detail" id="det-${c.id}">
    <div class="dstick"><div class="dline">${fr ? `<img class="mini-hero" data-photo="${fr.id}" data-view="${fr.id}" alt="Front photo" title="Click to look at the photos full size">` : ''}
      <h2>${esc(compTitle(c))} <small>${esc([V(c, 'city'), V(c, 'zip')].filter(Boolean).join(' '))}</small></h2>
      <span class="big">${esc(statusText(V(c, 'status')))} · ${money(V(c, 'salePrice') || V(c, 'listPrice'))} · ${esc(showDate(V(c, 'saleDate') || V(c, 'contractDate')))}${px ? ` · ${px.mi.toFixed(2)} mi ${esc(px.dir)}` : ''}</span>
      <span class="grow"></span>
      <label>Use as comp # <select data-use="${c.id}"><option value="">–</option>${Array.from({ length: Math.max(9, J.comps.length) }, (_, i) => `<option ${c.use === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
      <button class="btn sm" data-hist="${c.id}" title="Every version of this comp: your ACI reports (2.6 / GPAR) and your 3.6 assignments – pick one to work from (or right-click the comp anywhere)">History</button>${CPOP ? '' : `<button class="btn sm" data-act="cpop" data-id="${c.id}" title="Open this comp in a window of its own – drag it to another screen and make it bigger">Pop out ↗</button>`}<button class="btn sm" data-act="close">Close</button></div></div>
    <div class="dmore"><div class="dinfo">${V(c, 'mls') ? mlsLinkHTML(c) : ''}
      ${fl.length && !c.use ? `<details class="flagdone"><summary>${fl.length} note${fl.length === 1 ? '' : 's'} on this property (it is not on the grid)</summary><ul>${fl.map(x => `<li>${esc(x.t)}</li>`).join('')}</ul></details>` : fl.length ? `<div class="flagbox"><b>⚑ ${fl.length} flag${fl.length === 1 ? '' : 's'} – check ${fl.length === 1 ? 'this' : 'these'}</b>${fl.some(x => FLAG_KEY(x.t)) ? ' <small>(the lines they point to are marked ⚑ in red below)</small>' : ''} <small>Click <b>✓ Checked</b> when you have looked into one.</small><ul class="flags">${fl.map(x => `<li class="${x.sev}">${esc(x.t)} <button class="btn xs" data-flagok="${esc(c.id)}" data-ft="${esc(x.t)}" title="I checked this – clear the flag">✓ Checked</button></li>`).join('')}</ul></div>` : flAll.length ? '<p class="help"><b class="ok">✓</b> All flags checked.</p>' : '<p class="help">No flags.</p>'}
      ${flDone.length ? `<details class="flagdone"><summary>${flDone.length} checked flag${flDone.length === 1 ? '' : 's'}</summary><ul>${flDone.map(x => `<li>${esc(x.t)} <button class="lnk" data-flagundo="${esc(c.id)}" data-ft="${esc(x.t)}">undo</button></li>`).join('')}</ul></details>` : ''}</div>
    ${ps.length ? `<div class="dphotos">${fr ? `<img class="hero" data-photo="${fr.id}" data-view="${fr.id}" alt="Front photo" title="Click to look at the photos full size">` : ''}<div class="strip">${ps.map(ph => `<button class="ph ${fr && ph.id === fr.id ? 'on' : ''}" data-view="${ph.id}" title="Click to look at it full size"><img data-photo="${ph.id}" alt="Photo ${ph.n}"></button>`).join('')}</div><p class="help">Click a photo to see it full size and page through them. The outlined one is the front photo; change it in the viewer.</p></div>` : (V(c, 'mls') ? '<p class="help">No photos yet – drop the MLS photos zip.</p>' : '')}</div>
    <h3>Field by field <small>click any source value to use it, or type your own</small></h3>
    <div class="tablewrap"><table class="cmp"><colgroup><col style="width:200px"><col style="width:190px"><col style="width:120px">${cols.map(() => '<col>').join('')}</colgroup><thead><tr><th>Field</th><th class="using">Using</th><th>Your value</th>${cols.map(s => `<th>${esc(SRC[s].name)}${s === 'arch' ? '<br>' + (c.src.arch.length ? archSel : '<small class="muted">not in your database</small>') : s === 'cort' ? '<br>' + cortSel : s === 'mls' && !c.src.mls ? '<br><small class="muted">drop the MLS export</small>' : s === 'crs' ? (c.src.crs ? '' : '<br><small class="muted">no CRS PDF yet – public-record figures from the MLS show here</small>') : ''}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <p><label><input type="checkbox" data-act="showall" ${app.showAll ? 'checked' : ''}> Show empty fields too</label></p>
    ${compLinesHTML(c, J)}
    <h3>Prior sales and transfers</h3>
    ${prior.length ? `<table class="mini"><tr><th>Date</th><th class="r">Price</th><th>Type</th><th>Before this sale</th><th>From</th></tr>${prior.map(s => `<tr class="${s.monthsBefore > 0 && s.monthsBefore <= 12 ? 'hot' : ''}"><td>${esc(showDate(s.date))}</td><td class="r">${money(s.price)}</td><td>${esc(s.inst || s.type || '')}</td><td>${s.monthsBefore != null ? Math.round(s.monthsBefore) + ' mo' : ''}</td><td><small>${esc(s.src)}</small></td></tr>`).join('')}</table>` : '<p class="help">None found in the sources you have loaded.</p>'}
    ${p && (p.listings || []).length ? `<h3>Listing history (MLS printout)</h3><table class="mini"><tr><th>MLS #</th><th>Status</th><th class="r">Price</th><th>Date</th><th class="r">DOM</th><th class="r">CDOM</th></tr>${p.listings.map(h => `<tr class="${h.mls === p.mls ? 'hot' : ''}"><td>${esc(h.mls)}</td><td>${esc(h.status)}</td><td class="r">${money(h.price)}</td><td>${esc(showDate(h.date))}</td><td class="r">${int(h.dom)}</td><td class="r">${int(h.cdom)}</td></tr>`).join('')}</table>
      ${(p.priceChanges || []).length ? `<p class="help">Price changes on this listing: ${p.priceChanges.map(x => `${showDate(x.date)} → ${money(x.price)}${x.pct ? ' (' + x.pct + '%)' : ''}`).join(' · ')}</p>` : ''}` : ''}
    ${m && (m.remarks || m.privateRemarks) ? `<details><summary>MLS remarks</summary><p>${esc(m.remarks)}</p>${m.privateRemarks ? `<p><b>Agent remarks:</b> ${esc(m.privateRemarks)}</p>` : ''}${m.aduNote ? `<p><b>ADU:</b> ${esc(m.aduNote)}</p>` : ''}</details>` : ''}
    ${c.src.cort.length ? `<details><summary>CORT lines</summary><table class="mini"><tr><th>Week</th><th>Grantor → grantee</th><th class="r">Price</th><th>Recorded</th><th>Remarks</th><th>Financing</th><th>Doc #</th></tr>${c.src.cort.map(t => `<tr><td>${esc(t.period)}</td><td>${esc(t.grantor)} → ${esc(t.grantee)}</td><td class="r">${money(t.salePrice)}</td><td>${esc(showDate(t.saleDate))}</td><td>${esc(t.cortRemarks)}</td><td>${esc(t.financing)}</td><td>${esc(t.doc)}</td></tr>`).join('')}</table></details>` : ''}
    ${(() => { if (!c.fuNoted && typeof archFU === 'function') { const fu = archFU(c); if (fu.raw) { c.fuNoted = true; if (!String(c.notes || '').includes(fu.raw)) c.notes = [c.notes, '2.6 functional utility: ' + fu.raw].filter(Boolean).join('\n'); save(); } } const mr = (c.src.mls && c.src.mls.remodel) || (c.src.pdf && c.src.pdf.remodel); if (mr && !c.mlsRemNoted) { c.mlsRemNoted = true; if (!String(c.notes || '').includes(mr)) c.notes = [c.notes, 'MLS updates: ' + mr].filter(Boolean).join('\n'); save(); } return ''; })()}    <label class="fld"><span>Notes for this comp</span><textarea class="txt" rows="2" data-notes="${c.id}">${esc(c.notes || '')}</textarea></label>
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
  const my = await DB.get('kv', 'mycomps');   // her comp database rides along in every backup (Oct 20 2026), so it is never only in this browser
  const blob = await gzipBlob(JSON.stringify({ app: 'comp-genie-job', version: 1, job: app.job, myComps: (my && my.v) || [] }));
  download(blob, safeName(app.job.name) + ' - Comp Genie backup.json.gz');
}

/* ---------------- events ---------------- */
function openComp(id) { app.sel = id; render(); const d = $('#detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
document.addEventListener('click', async e => {
  { const lp = e.target.closest('[data-locpick]'); if (lp) { e.stopPropagation(); locPick(lp.dataset.locpick); return; } }
  { const gl = e.target.closest('[data-glinedel]'); if (gl) { e.preventDefault(); const G = G0(app.job); G.custom = (G.custom || []).filter(x => x.id !== gl.dataset.glinedel); save(); render(); return; } }
  { const pp = e.target.closest('[data-pickphoto]'); if (pp) { e.stopPropagation(); const c = app.job && app.job.comps.find(x => x.id === pp.dataset.pickphoto); if (!c) return;
      if (archPhotoNames(c).length && AP.state !== 'ok') { await archPhotoConnect(); return; }
      const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.zip,image/*';
      inp.onchange = async () => { const fs = [...inp.files]; if (!fs.length) return; const zips = fs.filter(f => /\.zip$/i.test(f.name)), imgs = fs.filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
        if (zips.length) await ingest(zips);
        if (imgs.length) { let k = 0; for (const f of imgs) { const id = app.job.id + ':comp:' + c.id + ':' + Date.now() + '_' + (k++); await DB.put('photos', { id, jobId: app.job.id, mls: '', comp: c.id, n: 100 + k, name: f.name, file: 'picked', blob: f }); if (!c.front) c.front = id; }
          await loadPhotos(); save(); render(); toast(`${imgs.length} photo${imgs.length > 1 ? 's' : ''} added to ${compTitle(c)}`); } };
      inp.click(); return; } }
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
  const wp = e.target.closest('[data-act]') && e.target.closest('[data-wbcol]') ? null : e.target.closest('[data-wbpop],[data-wbmv],[data-wbpage],[data-wbcol]');   // a button inside a column header (MLS link) is its own click
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
    if (nb.dataset.rmnu) { const ord = c.use && gridInDateOrder(app.job); markNotUsed(c); if (ord) gridDateOrder(app.job); app.nuAsk = c.id; app.confirm = null; let n = 0; if (nb.dataset.nudb) n = await saveToMyDb(c); save(); render(); toast('Kept as analyzed – not used' + (nb.dataset.nudb ? ` and saved to your comp database (${n} saved)` : '') + '. Pick the reason below the grid.', 6000); return; }
    if (nb.dataset.savedb || nb.dataset.rmdb) { const n = await saveToMyDb(c); toast(`Saved to your comp database (${n} saved) – it goes into your archive the next time it is rebuilt`); }
    if (nb.dataset.rmdb) { app.job.comps = app.job.comps.filter(x => x.id !== id); if (app.sel === id) app.sel = null; app.confirm = null; save(); render(); return; }
    if (nb.dataset.nuback) { delete c.notUsed; if (app.nuAsk === id) app.nuAsk = null; save(); render(); return; }
    return; }
  { const q = e.target.closest('[data-quse]'); if (q && app.job) { e.stopPropagation(); const c = app.job.comps.find(x => x.id === q.dataset.quse); if (!c) return;
      if (c.use) { const ord = gridInDateOrder(app.job); markNotUsed(c); app.nuAsk = c.id; c.use = null; if (ord) gridDateOrder(app.job); toast('Taken out of the workbook – listed under Analyzed – not used. Pick the reason there.' + (ord ? ' The others moved up.' : '')); }
      else { const ord = gridInDateOrder(app.job); const taken = new Set(app.job.comps.map(x => x.use).filter(Boolean)); let n = 1; while (taken.has(n)) n++; c.use = n; delete c.notUsed; if (ord) gridDateOrder(app.job); toast(`In the workbook as comp ${c.use}` + (ord && c.use !== n ? ' (in closing-date order)' : '')); }
      save(); render(); return; } }
  { const ro = e.target.closest('[data-refopen],[data-refclose]'); if (ro && app.job) { app.ref = app.ref || { tab: 'land', area: null, q: '', newOnly: true }; if (ro.dataset.refopen) { app.ref.openFor = app.job.id; app.ref.closedFor = null; } else { app.ref.closedFor = app.job.id; app.ref.openFor = null; } const c = $('#refCard'); if (c) c.innerHTML = refHTML(app.job); return; } }
  { const rt = e.target.closest('[data-reftab]'); if (rt && app.job) { app.ref = app.ref || {}; app.ref.tab = rt.dataset.reftab; const c = $('#refCard'); if (c) c.innerHTML = refHTML(app.job); return; } }
  { const fo = e.target.closest('[data-flagok],[data-flagundo]'); if (fo) { const c = app.job.comps.find(x => x.id === (fo.dataset.flagok || fo.dataset.flagundo)); if (c) { c.flagOk = c.flagOk || {}; if (fo.dataset.flagok) c.flagOk[fo.dataset.ft] = Date.now(); else delete c.flagOk[fo.dataset.ft]; save(); render(); } return; } }   // her ask Oct 20 2026: clear a flag once checked
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
    case 'startorder': { const o = (app.orders || []).find(x => x.id === t.dataset.id); if (!o) break; app.home = false; await jobFromOrder(o); await loadPhotos(); render.top = true; render(); window.scrollTo(0, 0); break; }
    case 'mkorder': { const j = app.jobs.find(x => x.id === t.dataset.id); if (!j) break; if (j.orderId && (app.orders || []).some(o => o.id === j.orderId)) { toast('Already an order'); break; }
      if (window.parent === window) { toast('Open the Appraisal Assistant, click its Comp genie tab, and click Make it an order there – the order is made by the Appraisal Assistant.', 7000); break; }
      const S = j.subject || {}; t.disabled = true; t.textContent = 'Making the order…';
      window.parent.postMessage({ type: 'aa-make-order', jobId: j.id, name: j.name, fileNo: j.fileNo || '', subject: { addr: S.addr || '', unit: S.unit || '', city: S.city || '', zip: S.zip || '', apn: S.apn || '', lat: S.lat || '', lon: S.lon || '', eff: S.eff || '' } }, location.origin); break; }
    case 'cpop': { const w = window.open(`?pop=comp&id=${encodeURIComponent(t.dataset.id)}&job=${encodeURIComponent(app.job.id)}`, 'genie-comp-' + t.dataset.id, 'width=1100,height=900'); if (!w) toast('Chrome blocked the window – allow pop-ups for this page', 6000); break; }
    case 'mlsgo': mlsGo(t.dataset.n); break;
    case 'mlscopy': try { await navigator.clipboard.writeText(t.dataset.n); toast('Copied MLS ' + t.dataset.n + ' – paste it in the MLS search box'); } catch (e) { toast('Could not copy'); } break;
    case 'mlswin': { const w = window.open(t.dataset.u, 'mls-listing', 'width=1200,height=950'); if (!w) toast('Chrome blocked the window – allow pop-ups for this page', 6000); break; }   
    case 'mlsset': app.mlsSet = true; render(); break;
    case 'mlscancel': app.mlsSet = false; render(); break;
    case 'mlssave': { const u = ($('#mlsUrl').value || '').trim(), n = ($('#mlsNo').value || '').trim(); if (!/^https?:\/\//i.test(u)) { toast('Paste the address from Chrome (it starts with https://)'); break; }
      const vs = n ? [n, n.replace(/-/g, ''), encodeURIComponent(n)] : []; const hit = vs.find(v => u.includes(v));
      if (!hit) { MLSSTART = u; await DB.put('kv', { id: 'mlsStart', v: u }); app.mlsSet = false; render(); toast('Saved as your MLS start page – MLS buttons open it, and the number is copied for you to paste', 7000); break; }
      MLSLINK = u.replace(hit, '{mls}'); if (hit === n.replace(/-/g, '') && hit !== n) MLSLINK = MLSLINK.replace('{mls}', '{mlsnodash}');
      await DB.put('kv', { id: 'mlsLink', v: MLSLINK }); app.mlsSet = false; render(); toast('Saved – every comp now has Open in MLS'); break; }
    case 'openjob': { const j = app.jobs.find(x => x.id === t.dataset.id); if (!j) break; app.home = false; app.job = j; app.sel = null; await DB.put('kv', { id: 'lastJob', v: j.id }); await loadPhotos(); render.top = true; render(); window.scrollTo(0, 0); break; }
    case 'deljob': app.confirm = 'deljob'; render(); break;
    case 'snaps': snapPick(); break;
    case 'stage': app.job.stage = t.dataset.s; save(); render.top = true; render(); window.scrollTo(0, 0); break;
    case 'openwb': openComp(t.dataset.id); break;
    case 'confirm': { const c = app.job.comps.find(x => x.id === t.dataset.id); if (c) { c.confirmed = Date.now(); save(); render(); toast('Comp ' + c.use + ' – data confirmed ✓'); } break; }
    case 'unconfirm': { const c = app.job.comps.find(x => x.id === t.dataset.id); if (c) { delete c.confirmed; save(); render(); } break; }
    case 'nextconfirm': { const U = usedComps(app.job); const i = U.findIndex(c => c.id === t.dataset.id); const n = [...U.slice(i + 1), ...U.slice(0, Math.max(0, i))].find(c => !c.confirmed && c.id !== t.dataset.id) || (i < 0 ? U.find(c => !c.confirmed) : null);
      if (n) { if (app.job.stage !== 'workbook') app.job.stage = 'workbook'; openComp(n.id); } else toast('All comps in the workbook are confirmed ✓ – make your adjustments, then go to ③ Final grid', 6000); break; }
    case 'deljob-yes': { await snapTake(app.job, 'before delete'); const id = app.job.id; await DB.del('jobs', id); for (const p of await DB.byJob(id)) await DB.del('photos', p.id); app.jobs = app.jobs.filter(j => j.id !== id); app.job = app.jobs[0] || null; app.confirm = null; app.home = true; await loadPhotos(); render.top = true; render(); window.scrollTo(0, 0); toast('Assignment deleted'); break; }
    case 'cancel': app.confirm = null; render(); break;
    case 'rmall': app.confirm = 'rmall'; render(); break;
    case 'rmall-yes': app.job.comps = []; app.sel = null; app.confirm = null; await saveNow(); render(); toast('All comps removed – your files list is unchanged'); break;
    case 'close': if (CPOP) { window.close(); break; } app.sel = null; render(); break;
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
    case 'archphotos': await archPhotoConnect(); break;
    case 'glopen': app.glOpen = !app.glOpen; break;
    case 'gladd': { const n = ($('#glNew') || {}).value; const nm = String(n || '').trim().slice(0, 36); if (!nm) { toast('Type the name of your line first'); break; } const G = G0(app.job); G.custom = G.custom || [];
      const id = 'cx_' + uid().slice(0, 8); G.custom.push({ id, name: nm, section: ($('#glSec') || {}).value || 'Amenities' }); G.lines = G.lines || {}; G.lines[id] = true; app.glOpen = true; save(); render(); toast('Line “' + nm + '” added – type each comp’s entry on it'); break; }
    case 'glsave': { const G = G0(app.job); const on = {}; adjRows(app.job).forEach(r => { on[r[0]] = lineOn(r[0], app.job); }); GRID_DEFAULT = { on, custom: (G.custom || []).map(x => ({ ...x })) }; await DB.put('kv', { id: 'gridLines', v: GRID_DEFAULT }); toast('Saved as your default – new assignments start with these lines'); break; }
    case 'glreset': { const G = G0(app.job); delete G.lines; if (GRID_DEFAULT && GRID_DEFAULT.custom) { G.custom = G.custom || []; GRID_DEFAULT.custom.forEach(x => { if (!G.custom.some(y => y.id === x.id)) G.custom.push({ ...x }); }); } save(); render(); toast('Back to your default lines'); break; }
    case 'gridall': { const J = app.job; const ord = !J.comps.some(c => c.use) || gridInDateOrder(J); let n = Math.max(0, ...J.comps.map(c => c.use || 0));
      const add = J.comps.filter(c => !c.use && !c.notUsed).sort(compOrder); add.forEach(c => { c.use = ++n; }); if (ord) gridDateOrder(J); save(); render();
      toast(`${add.length} comp${add.length === 1 ? '' : 's'} moved to the workbook` + (ord ? ' in closing-date order (comp 1 = the most recent)' : ' after the ones you numbered') + '. Remove takes one off and lists it under Analyzed – not used.', 7000); break; }
    case 'csel': { const w = t.dataset.w; CSEL.clear(); if (w !== 'none') app.job.comps.filter(c => w === 'all' || !c.use).forEach(c => CSEL.add(c.id)); render(); break; }
    case 'bulkgrid': { const J = app.job; const ord = !J.comps.some(c => c.use) || gridInDateOrder(J); let n = Math.max(0, ...J.comps.map(c => c.use || 0));
      const add = J.comps.filter(c => CSEL.has(c.id) && !c.use).sort(compOrder); add.forEach(c => { c.use = ++n; delete c.notUsed; }); if (ord) gridDateOrder(J); CSEL.clear(); save(); render();
      toast(`${add.length} comp${add.length === 1 ? '' : 's'} moved to the workbook` + (ord ? ' in closing-date order' : ''), 6000); break; }
    case 'bulkdb': { const L = app.job.comps.filter(c => CSEL.has(c.id)); for (const c of L) await saveToMyDb(c); CSEL.clear(); save(); render(); toast(`${L.length} comp${L.length === 1 ? '' : 's'} saved to your comp database – each with its sources, your notes, flags and any adjustments`, 6000); break; }
    case 'bulknu': { const J = app.job; const why = ($('[data-bulkreason]') || {}).value || 'Other'; const db = ($('[data-bulkdb]') || {}).checked; const ord = gridInDateOrder(J);
      const L = J.comps.filter(c => CSEL.has(c.id)); L.forEach(c => { markNotUsed(c); if (!c.notUsed.reasons.includes(why)) c.notUsed.reasons.push(why); }); if (ord) gridDateOrder(J);
      let k = 0; if (db) for (const c of L) k += await saveToMyDb(c) ? 1 : 0; CSEL.clear(); save(); render();
      toast(`${L.length} comp${L.length === 1 ? '' : 's'} listed under Analyzed – not used (reason: ${(NOTUSED_REASONS.find(r => r[0] === why) || [, why])[1]})` + (db ? `; saved to your comp database` : '') + '. Change a reason there if one differs.', 7000); break; }
    case 'ccdone': app.job.ccDone = true; save(); render(); break;   // her ask Oct 20 2026: fold away the finished Comps considered list
    case 'ccopen': app.job.ccDone = false; save(); render(); break;
    case 'gridorder': gridDateOrder(app.job); app.job.gridManual = false; save(); render(); toast('Grid numbered in closing-date order – comp 1 is the most recent'); break;
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
  if (e.target.dataset && e.target.dataset.csel) { e.target.checked ? CSEL.add(e.target.dataset.csel) : CSEL.delete(e.target.dataset.csel); renderParts ? (() => { const cc = $('#compsCard'); const y = window.scrollY; if (cc) { cc.innerHTML = compsCardHTML(app.job); fillImages(cc); } window.scrollTo(0, y); })() : render(); return; }
  if (e.target.dataset && 'cselall' in e.target.dataset) { CSEL.clear(); if (e.target.checked) app.job.comps.forEach(c => CSEL.add(c.id)); const cc = $('#compsCard'); const y = window.scrollY; if (cc) { cc.innerHTML = compsCardHTML(app.job); fillImages(cc); } window.scrollTo(0, y); return; }
  const t = e.target;
  if (t.dataset.act === 'files' && t.files.length) { await ingest([...t.files]); t.value = ''; return; }
  if (t.dataset.act === 'subjcrs' && t.files.length) { try { const r = crsCanon(parseCRS(await pdfLines(t.files[0]))); app.job.subject.crs = r; ['addr', 'city', 'zip', 'apn'].forEach(k => { if (r[k]) app.job.subject[k] = r[k]; }); if (r.lat) { app.job.subject.lat = r.lat; app.job.subject.lon = r.lon; } if (app.job.name === 'New assignment' && r.addr) app.job.name = r.addr; logFile(t.files[0].name, 'CRS (subject)', 1); save(); render(); toast('Subject filled from the CRS report'); } catch (err) { toast('Could not read that CRS report'); } return; }
  if (t.dataset.act === 'fromorder' && t.value) { const o = app.orders.find(x => x.id === t.value); if (o) { app.home = false; await jobFromOrder(o); await loadPhotos(); render(); } return; }
  if (t.dataset.act === 'pickjob' && !t.value) { app.home = true; render.top = true; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.act === 'pickjob') { app.home = false; app.job = app.jobs.find(j => j.id === t.value); app.sel = null; await DB.put('kv', { id: 'lastJob', v: app.job.id }); await loadPhotos(); render(); return; }
  if (t.dataset.act === 'showall') { app.showAll = t.checked; render(); return; }
  if (t.dataset.use) { const J = app.job; const c = J.comps.find(x => x.id === t.dataset.use); const n = t.value ? +t.value : null;
    // her own number: the comp moves to that place and the others close up behind it (nothing is bumped off the grid); from now on the grid keeps her order
    const list = J.comps.filter(x => x.use && x !== c).sort((a, b) => a.use - b.use);
    if (!n) { if (c.use) { markNotUsed(c); app.nuAsk = c.id; } c.use = null; } else { list.splice(Math.min(n - 1, list.length), 0, c); delete c.notUsed; }
    list.forEach((x, i) => { x.use = i + 1; }); J.gridManual = !gridInDateOrder(J); save(); render(); return; }
  if (t.dataset.archpick) { const c = app.job.comps.find(x => x.id === t.dataset.archpick); c.archPick = +t.value; save(); render(); return; }
  if (t.dataset.cortpick) { const c = app.job.comps.find(x => x.id === t.dataset.cortpick); c.cortPick = +t.value; save(); render(); return; }
  if (t.dataset.edit && 'echo' in t.dataset && String(t.value).trim() === String(t.dataset.echo).trim()) return;   // unchanged copy of the value in use – not her own
  if (t.dataset.edit) { const c = app.job.comps.find(x => x.id === app.sel); let f = FIELD[t.dataset.edit];
    if (f.k === 'mlsCondition' && /^\s*(?:(?:low|mid|high)\s+)?c\s*[1-6]\s*[+-]?\s*$/i.test(t.value)) { f = FIELD.condition; toast('A C rating goes in the Condition line (the one the grid uses) – moved it there', 6000); }   // she typed C3- in the MLS words line
    { const m = String(t.value || '').trim().toUpperCase().match(/^(?:(LOW|MID|HIGH)\s+)?([QC])\s*([1-6])\s*([+-])?$/); if (m && ['quality', 'condition'].includes(f.k) && (m[1] || m[4])) {   // "C3-" / "High Q3": UAD takes the whole rating; the tier goes to the grid
      const tier = m[1] ? m[1].toLowerCase() : m[4] === '-' ? 'low' : 'high'; const G = G0(app.job); G.fine = G.fine || {}; G.fine[c.id] = G.fine[c.id] || {}; G.fine[c.id][m[2].toLowerCase()] = tier; t.value = m[2] + m[3];
      toast(`Saved as ${m[2]}${m[3]} (UAD takes whole ratings only) with the tier “${tier}” on your grid`, 6000); } }
    if (f.k === 'saleType' && typeof PICK !== 'undefined' && String(t.value).trim()) { const P = pkParse(PICK.xferTerms, t.value); const v = P.vals[0] === 'Other' ? 'Other: ' + (P.other || t.value).trim() : P.vals[0]; if (v) { c.edit.saleType = v; delete c.edit.grid_xferTerms; delete c.edit.pk_xferTerms; save(); render(); return; } }   // her typed sale type → the 3.6 answer (Oct 20 2026: 5114 La Ramada would not change)
    const v = parseInput(f, t.value); if (blank(v)) delete c.edit[f.k]; else c.edit[f.k] = v; save(); renderParts({ field: f.k }); return; }
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
  if (t.dataset.boe) { app.boe = app.boe || {}; app.boe[t.dataset.boe] = t.value; const c = $('#refCard'); if (c) c.innerHTML = refHTML(app.job); return; }
  if (t.dataset.refarea !== undefined || t.dataset.refnew !== undefined) { const R = app.ref; if (t.dataset.refarea !== undefined) R.area = t.value; if (t.dataset.refnew !== undefined) R.newOnly = t.checked; const c = $('#refCard'); if (c) c.innerHTML = refHTML(app.job); return; }
  if (t.dataset.gmode) { const G = G0(app.job); G.mode = t.value; if (t.value === 'condo' && !G.tier) G.tier = 'condo'; save(); renderKeepFocus(); return; }
  if (t.dataset.gvt) { const G = G0(app.job); G.viewT = G.viewT || {}; const w = t.dataset.gvt; if (t.value === '') { delete G.viewT[w]; } else { G.viewT[w] = +t.value; vtRemember(app.job, w, +t.value); } save(); renderKeepFocus(); return; }
  if (t.dataset.qc) { const [who, k] = t.dataset.qc.split('|'); pkSave(app.job, who, k, t.value); return; }   // the Q / C drop-down
  if (t.dataset.gfine) { const G = G0(app.job); G.fine = G.fine || {}; const [who, k] = t.dataset.gfine.split('|'); G.fine[who] = G.fine[who] || {}; G.fine[who][k] = t.value; save(); renderKeepFocus(); return; }
  if (t.dataset.gok !== undefined) { const G = G0(app.job); G.ok = G.ok || {}; const v = t.value.trim(); if (v) G.ok[t.dataset.gok] = v; else delete G.ok[t.dataset.gok]; save(); renderKeepFocus(); return; }
  if (t.dataset.classic) { try { localStorage.setItem('genie.classic', t.checked ? '1' : '0'); } catch (e) {} document.body.classList.toggle('classic', t.checked); return; }
  if (t.dataset.gline) { const G = G0(app.job); G.lines = G.lines || {}; G.lines[t.dataset.gline] = t.checked; save(); render(); return; }
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
let REFQ_T = null;
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.refq !== undefined) { const v = e.target.value; clearTimeout(REFQ_T); REFQ_T = setTimeout(() => { app.ref.q = v; const c = $('#refCard'); if (c) { c.innerHTML = refHTML(app.job); const i = c.querySelector('[data-refq]'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } } }, 300); return; }
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

/* her ask (Oct 20 2026): a popped-out comp tells the main window when it closes; the main window then goes to the next comp on the grid that still has flags */
if (CPOP) window.addEventListener('pagehide', () => { try { if (WBC) WBC.postMessage({ cpopClosed: CPOP.id, job: CPOP.job, from: WIN }); } catch (e) {} });
if (!CPOP && !POP && WBC) WBC.addEventListener('message', e => { const d = e.data || {}; if (!d.cpopClosed || !app.job || d.job !== app.job.id) return;
  const J = app.job; const L = [...J.comps].sort(compOrder); const i = L.findIndex(c => c.id === d.cpopClosed);
  const open = c => c.use && compFlags(c, J).some(f => !flagChecked(c, f));
  const next = [...L.slice(i + 1), ...L.slice(0, Math.max(0, i))].find(c => c.id !== d.cpopClosed && open(c));
  if (J.ccDone) { J.ccDone = false; save(); } render();
  setTimeout(() => { if (next) { const tr = (J.stage === 'micro' ? document.querySelector(`table.comps tr[data-open="${CSS.escape(next.id)}"]`) : null) || document.querySelector(`#wbStrip [data-act="openwb"][data-id="${CSS.escape(next.id)}"]`) || document.querySelector(`table.comps tr[data-open="${CSS.escape(next.id)}"]`); if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); tr.classList.add('nextflag'); const b = tr.matches('button') ? tr : tr.querySelector('[data-act="cpop"]'); if (b) b.focus({ preventScroll: true }); setTimeout(() => tr.classList.remove('nextflag'), 6000); }
      toast('Next comp with flags: ' + compTitle(next) + ' (comp ' + next.use + ') – press Enter to open it', 6000); }
    else { const cc = document.getElementById('compsCard'); if (cc) cc.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('No more flags on the comps on your grid ✓', 5000); } }, 150); });

/* her Appraisal Assistant daily backup (.zip with comp-genie.json): pick an assignment saved in it and bring it back as a copy – nothing here is overwritten (Oct 20 2026) */
function backupPick(z, fname) {
  let g = null; try { g = JSON.parse(new TextDecoder().decode(z.get('comp-genie.json'))); } catch (e) {} if (!g || !Array.isArray(g.jobs) || !g.jobs.length) { toast('That backup has no Comp genie assignments'); return; }
  const when = t => t ? new Date(t).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const JL = g.jobs.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)); const rows = JL.map((j, ix) => { const cs = j.comps || []; return `<tr><td><b>${esc(j.name)}</b><br><small>${esc((j.subject || {}).addr || '')}</small></td><td>${esc(when(j.created))}</td><td>${esc(when(j.updated))}</td><td class="r">${cs.length}</td><td class="r">${cs.filter(c => c.use).length}</td><td class="r">${cs.filter(c => c.src && c.src.crs && !c.src.crs.fromList).length}</td><td><button class="btn sm primary" data-bkrestore="${ix}">Bring back as a copy</button></td></tr>`; }).join('');
  const bg = document.createElement('div'); bg.className = 'sheetbg';
  bg.innerHTML = `<div class="sheet"><h2>Assignments in your backup <small>${esc(fname)} · saved ${esc(when(g.saved))}</small></h2><p class="help">Pick the one to bring back. It comes in as a <b>copy</b> named “… (from backup)” – your assignments here are not changed. Photos are not in this backup; drop the MLS photos zip again if you want them.</p>
    <div class="tablewrap"><table class="mini"><tr><th>Assignment</th><th>Started</th><th>Last changed</th><th class="r">Comps</th><th class="r">On grid</th><th class="r">CRS reports</th><th></th></tr>${rows}</table></div><p><button class="btn" data-bkclose="1">Close</button></p></div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', async e => { const t = e.target; if (t.dataset.bkclose || t === bg) { bg.remove(); return; }
    if (t.dataset.bkrestore) { const src = JL[+t.dataset.bkrestore]; if (!src) return; const j = JSON.parse(JSON.stringify(src)); j.id = uid(); j.name = src.name.replace(/ \(before delete\)$/, '') + ' (from ' + new Date(src.updated || g.saved || Date.now()).toLocaleString([], { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ')'; j.restoredFrom = src.id;   // keeps its order link and comes first, so opening the order opens this copy
      app.jobs.unshift(j); app.job = j; app.sel = null; app.home = false; await saveNow(); j.comps.forEach(c => { c.src = c.src || {}; c.src.arch = c.src.arch || []; c.src.cort = c.src.cort || []; attachArchive(c); attachCort(c); }); await saveNow(); bg.remove(); render();
      toast(`Brought back “${src.name}” as a copy: ${j.comps.length} comps, ${j.comps.filter(c => c.use).length} on the grid. Opening the order now opens this copy – when you are happy with it, delete the other one.`, 9000); } });
}

/* ---- earlier versions kept in this browser (Oct 20 2026, after her grid was lost with no backup): a copy of the assignment every 20 minutes while she works
   (the last 12), the first one of each day (14 days) and one before a delete. "Earlier versions…" brings one back as a copy. ---- */
const SNAP_GAP = 20 * 60e3, SNAP_KEEP = 12, SNAP_DAYS = 14;
async function snapIdx() { const r = await DB.get('kv', 'snapidx'); return (r && r.v) || []; }
async function snapTake(j, why) { if (!j || !(j.comps || []).length) return false; const at = Date.now(); const key = 'snap:' + j.id + ':' + at;
  await DB.put('kv', { id: key, v: JSON.parse(JSON.stringify(j)) });
  let L = await snapIdx(); L.push({ key, job: j.id, name: j.name, at, why: why || '', comps: j.comps.length, grid: j.comps.filter(c => c.use).length, crs: j.comps.filter(c => c.src && c.src.crs && !c.src.crs.fromList).length });
  const mine = L.filter(x => x.job === j.id).sort((a, b) => b.at - a.at); const day = d => new Date(d).toDateString(); const keep = new Set();
  mine.slice(0, SNAP_KEEP).forEach(x => keep.add(x.key)); const seen = new Set(); mine.slice().reverse().forEach(x => { if (!seen.has(day(x.at)) && at - x.at < SNAP_DAYS * 864e5) { seen.add(day(x.at)); keep.add(x.key); } }); mine.filter(x => x.why).forEach(x => { if (at - x.at < 30 * 864e5) keep.add(x.key); });
  for (const x of mine) if (!keep.has(x.key)) await DB.del('kv', x.key);
  L = L.filter(x => x.job !== j.id || keep.has(x.key)); await DB.put('kv', { id: 'snapidx', v: L }); return true; }
let SNAP_LAST = {};
async function snapMaybe(j) { try { const t = SNAP_LAST[j.id] || ((await snapIdx()).filter(x => x.job === j.id).sort((a, b) => b.at - a.at)[0] || {}).at || 0; if (Date.now() - t < SNAP_GAP) { SNAP_LAST[j.id] = t; return; } if (await snapTake(j)) SNAP_LAST[j.id] = Date.now(); } catch (e) { console.warn('snapshot', e); } }
async function snapPick() { const L = (await snapIdx()).sort((a, b) => b.at - a.at); if (!L.length) { toast('No earlier versions saved yet – they start being kept as you work from now on', 6000); return; }
  const jobs = []; for (const x of L.slice(0, 60)) { const r = await DB.get('kv', x.key); if (r && r.v) { const j = r.v; j.updated = x.at; j.name = j.name + (x.why ? ' (' + x.why + ')' : ''); jobs.push(j); } }
  const z = new Map([['comp-genie.json', new TextEncoder().encode(JSON.stringify({ app: 'comp-genie', saved: new Date().toISOString(), jobs }))]]); backupPick(z, 'earlier versions kept in this browser'); }

/* her steps (Oct 20 2026) */
function stageBarHTML(J) { const st = J.stage || (J.comps.some(c => c.use) ? 'workbook' : 'micro'); const U = usedComps(J); const conf = U.filter(c => c.confirmed).length;
  const o = (app.orders || []).find(x => x.id === J.orderId);
  const step = (k, n, l, sub) => `<button class="stepb${st === k ? ' on' : ''}" data-act="stage" data-s="${k}"><b>${n}</b> ${l}<small>${sub}</small></button>`;
  return `<nav class="steps">${o ? `<a class="stepb" href="../appraisal-assistant/?order=${encodeURIComponent(o.id)}&tab=market" target="_top" title="Macro, then micro – the order's Market tab in the Appraisal Assistant"><b>⓪</b> Market<small>macro → micro</small></a>` : ''}
    ${step('micro', '①', 'Comps considered', `${J.comps.length} · screen, pick for the workbook`)}${step('workbook', '②', 'Workbook', U.length ? `${U.length} comps · ${conf} confirmed · adjust` : 'confirm each comp, adjust')}${step('final', '③', 'Final grid', 'review · export to SFREP')}</nav>`; }
