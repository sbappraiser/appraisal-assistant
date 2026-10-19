/* =====================================================================
   Automatic backup (Oct 19 2026 – after Chrome's "delete site data when you close all windows" setting erased
   her orders and the Comp genie on a restart). She picks a folder once (ideally in OneDrive); every day she
   uses the Appraisal Assistant a backup zip (orders, clients, documents, her lists, Comp genie assignments)
   is written there by itself – today's file is replaced as she works, the last 30 days are kept.
   Chrome keeps the folder permission between visits but may ask again after a restart: then the Home page
   shows one button to allow it. When Chrome comes up empty the Home page offers the newest backup.
   ===================================================================== */
const AB = { dir: null, perm: 'none', last: null, busy: false, dirty: false, t: null, err: '' };
const AB_KEEP = 30;
const abName = d => `Appraisal Assistant backup ${d}.zip`;
const abSupported = () => typeof window.showDirectoryPicker === 'function';
async function abLoad() {
  try { const r = await ODB.get('kv', 'ab:dir'); AB.dir = (r && r.v) || null; const l = await ODB.get('kv', 'ab:last'); AB.last = (l && l.v) || null; } catch (e) { AB.dir = null; }
  try { if (!AB.last) AB.last = JSON.parse(localStorage.getItem('aa.abLast') || 'null'); } catch (e) {}
  AB.perm = AB.dir ? await AB.dir.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt') : 'none';
}
async function abChoose() {
  if (!abSupported()) { toast('Automatic backup needs Chrome or Edge on a computer.'); return; }
  try { const d = await window.showDirectoryPicker({ id: 'aa-backup', mode: 'readwrite', startIn: 'documents' }); AB.dir = d; await ODB.put('kv', { id: 'ab:dir', v: d }); AB.perm = 'granted'; AB.err = ''; await abRun(true); }
  catch (e) { if (e && e.name !== 'AbortError') toast('Could not use that folder: ' + (e.message || e)); }
  abRender();
}
async function abAllow() {
  if (!AB.dir) return abChoose();
  try { AB.perm = await AB.dir.requestPermission({ mode: 'readwrite' }); } catch (e) { AB.perm = 'prompt'; }
  if (AB.perm === 'granted') await abRun(true); abRender();
}
/* write today's backup (replaces today's file), then keep the newest AB_KEEP */
async function abRun(force) {
  if (!AB.dir || AB.busy) return; if (AB.perm !== 'granted') { AB.perm = await AB.dir.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt'); if (AB.perm !== 'granted') { abRender(); return; } }
  const today = todayISO(); if (!force && !AB.dirty && AB.last && AB.last.date === today) return;
  if (!letters.some(realOrder)) { if (force) toast('Nothing to back up yet – the first backup is saved as soon as you have an order.', 6000); abRender(); return; }   // never write an empty backup over a good one
  AB.busy = true;
  try {
    const B = await buildBackup();
    const fh = await AB.dir.getFileHandle(abName(today), { create: true }); const w = await fh.createWritable(); await w.write(B.blob); await w.close();
    AB.last = { date: today, at: new Date().toISOString(), orders: B.orders, docs: B.docs, jobs: B.jobs, folder: AB.dir.name }; AB.dirty = false; AB.err = '';
    await ODB.put('kv', { id: 'ab:last', v: AB.last }); try { localStorage.setItem('aa.abLast', JSON.stringify(AB.last)); } catch (e) {}
    const names = []; for await (const [n, h] of AB.dir.entries()) if (h.kind === 'file' && /^Appraisal Assistant backup \d{4}-\d{2}-\d{2}\.zip$/.test(n)) names.push(n);
    names.sort().reverse().slice(AB_KEEP).forEach(n => AB.dir.removeEntry(n).catch(() => {}));
  } catch (e) { AB.err = e.message || String(e); console.warn('auto backup', e); }
  AB.busy = false; abRender();
}
function abSoon() { AB.dirty = true; clearTimeout(AB.t); AB.t = setTimeout(() => abRun(), 90 * 1000); }   // 1½ minutes after the last save
async function abStart() {
  await abLoad(); abRender();
  setTimeout(() => abRun(), 8000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && AB.dirty) abRun(); });
  setInterval(() => { if (AB.dirty) abRun(); }, 15 * 60 * 1000);
}
/* Chrome came up empty: restore the newest backup from a folder she picks (or the saved folder) */
async function abRestoreNewest() {
  try {
    let d = AB.dir; if (d && (await d.queryPermission({ mode: 'read' })) !== 'granted') { if ((await d.requestPermission({ mode: 'read' })) !== 'granted') d = null; }
    if (!d) { if (!abSupported()) { $('#restoreFile').click(); return; } d = await window.showDirectoryPicker({ id: 'aa-backup', mode: 'readwrite', startIn: 'documents' }); }
    const names = []; for await (const [n, h] of d.entries()) if (h.kind === 'file' && /^Appraisal Assistant backup .*\.zip$/i.test(n)) names.push(n);
    if (!names.length) { toast('No "Appraisal Assistant backup" files in that folder.', 6000); return; }
    names.sort().reverse(); let f = null, nm = '';
    for (const n of names) { const fl = await (await d.getFileHandle(n)).getFile();   // the newest backup that has orders in it (an empty one is skipped)
      try { const z = await G.readZip(fl); const j = z.get('orders.json'); const o = j && JSON.parse(new TextDecoder().decode(j)); if (o && (o.letters || []).some(realOrder)) { f = fl; nm = n; break; } } catch (e) {} }
    if (!f) { toast('The backups in that folder have no orders in them yet.', 6000); return; }
    AB.dir = d; await ODB.put('kv', { id: 'ab:dir', v: d }); AB.perm = await d.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt');
    toast('Restoring ' + nm + '…'); await restore(f); abRender();
  } catch (e) { if (e && e.name !== 'AbortError') toast('Could not restore: ' + (e.message || e), 6000); }
}
/* the card on the Home page */
function abCardHTML() {
  const empty = !letters.some(realOrder);
  const last = AB.last && AB.last.orders ? `Last backup <b>${h(longDate(AB.last.date))}</b> at ${h(new Date(AB.last.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))} – ${AB.last.orders} orders, ${AB.last.docs} documents${AB.last.jobs ? ', ' + AB.last.jobs + ' Comp genie assignments' : ''}` : '';
  let body;
  if (!abSupported()) body = `<p class="help">Automatic backup works in Chrome or Edge on a computer. Use <b>Back up</b> at the top instead.</p>`;
  else if (!AB.dir) body = `<p class="help warnTxt"><b>Automatic backup is off.</b> Your orders live only in this browser – if Chrome clears its site data they are gone. Pick a folder once (a folder in <b>OneDrive</b> is best, so it is also off this computer) and a backup is saved there by itself every day you work.</p><div class="row"><button type="button" class="btn primary" id="abChoose">Choose a backup folder…</button></div>`;
  else if (AB.perm !== 'granted') body = `<p class="help warnTxt"><b>Chrome needs your OK to keep backing up</b> to the folder “${h(AB.dir.name)}” (it asks again after a restart).</p><div class="row"><button type="button" class="btn primary" id="abAllow">Allow today’s backup</button><button type="button" class="btn ghost small" id="abChoose">Choose another folder</button></div>${last ? `<p class="help">${last}</p>` : ''}`;
  else body = `<p class="help"><span class="ck">✓</span> Backing up to the folder <b>“${h(AB.dir.name)}”</b> – every day you work, the last ${AB_KEEP} days kept.${AB.busy ? ' Saving now…' : ''}</p>${last ? `<p class="help">${last}</p>` : ''}${AB.err ? `<p class="help warnTxt">The last backup did not save: ${h(AB.err)}</p>` : ''}<div class="row"><button type="button" class="btn small" id="abNow">Back up now</button><button type="button" class="btn ghost small" id="abChoose">Change folder</button></div>`;
  const rescue = empty ? `<div class="abempty"><p><b>No orders in this browser.</b> If Chrome cleared its data, bring everything back from your newest backup.</p><button type="button" class="btn primary" id="abRestore">Restore from my backup folder…</button> <small class="muted">or use Restore at the top to pick a backup file</small></div>` : '';
  return `<h3>Automatic backup</h3>${rescue}${body}`;
}
function abRender() {
  const box = document.getElementById('abCard'); if (!box) return; box.innerHTML = abCardHTML();
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  on('abChoose', abChoose); on('abAllow', abAllow); on('abNow', () => abRun(true)); on('abRestore', abRestoreNewest);
}

/* ---- the Comp genie's own storage (same site, IndexedDB "appraisal-assistant"): assignments and her settings ---- */
const GENIE_SKIP = new Set(['archive', 'cort', 'lastJob']);   // the archive and CORT table are reloaded from their own files
function genieDB(create) {
  return new Promise(res => { let r; try { r = indexedDB.open('appraisal-assistant', 1); } catch (e) { res(null); return; }
    r.onupgradeneeded = () => { const d = r.result; if (!create) { try { r.transaction.abort(); } catch (e) {} return; }
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('jobs')) d.createObjectStore('jobs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('photos')) { const p = d.createObjectStore('photos', { keyPath: 'id' }); p.createIndex('job', 'jobId'); } };
    r.onerror = () => res(null); r.onblocked = () => res(null); r.onsuccess = () => res(r.result); });
}
const gTx = (d, st, mode, fn) => new Promise((res, rej) => { const t = d.transaction(st, mode); const q = fn(t.objectStore(st)); let out; if (q && 'onsuccess' in q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); });
async function genieExport() {
  try { if (indexedDB.databases) { const l = await indexedDB.databases(); if (!l.some(x => x.name === 'appraisal-assistant')) return null; } } catch (e) {}
  const d = await genieDB(false); if (!d) return null;
  try { if (!d.objectStoreNames.contains('jobs')) return null;
    const jobs = await gTx(d, 'jobs', 'readonly', s => s.getAll()) || []; const kv = (await gTx(d, 'kv', 'readonly', s => s.getAll()) || []).filter(x => !GENIE_SKIP.has(x.id));
    return { app: 'comp-genie', saved: new Date().toISOString(), jobs, kv };
  } catch (e) { return null; } finally { d.close(); }
}
async function genieImport(g) {   // adds what is missing; never overwrites an assignment or setting already there
  if (!g || g.app !== 'comp-genie') return 0; const d = await genieDB(true); if (!d) return 0; let n = 0;
  try { const have = new Set((await gTx(d, 'jobs', 'readonly', s => s.getAllKeys())) || []); const haveKv = new Set((await gTx(d, 'kv', 'readonly', s => s.getAllKeys())) || []);
    await gTx(d, 'jobs', 'readwrite', s => { (g.jobs || []).forEach(j => { if (!have.has(j.id)) { s.put(j); n++; } }); });
    await gTx(d, 'kv', 'readwrite', s => { (g.kv || []).forEach(k => { if (!haveKv.has(k.id)) s.put(k); }); });
  } finally { d.close(); }
  return n;
}
