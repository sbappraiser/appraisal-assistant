/* =====================================================================
   Safety (her plan part D, Oct 21 2026): protect her databases from loss and unintended changes.
   - Chrome is asked to keep this site's storage (persistent storage), so it is not cleared to free space.
   - Before a database is replaced (CORT, land sales, cost database, her land edits, left-out budgets), the version
     before is kept and the change is logged – one click undoes the last change (My databases › Recent changes).
   - Each database is checked when My databases opens (does it read, are the records whole).
   ===================================================================== */
const SAFE_DBS = { cort: 'CORT weekly closings', landSales: 'Land sales', landEdits: 'Your land sale edits', costDb: 'Construction cost database', costOut: 'Budgets you left out', rentDb: 'Rental database' };
const SAFE = { persisted: null, log: [] };
const safeCount = (id, v) => { if (!v) return 0; if (id === 'cort') return (v.rows || []).length; if (id === 'costDb') return ((v.v || {}).projects || []).length; const x = v.v; return Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0; };
(() => { const put = DB.put.bind(DB);
  DB.put = async (store, obj) => {
    /* show first, then change (her rule Oct 22 2026): CORT, land sales and the cost database wait for her OK; Cancel puts everything back */
    if (store === 'kv' && obj && typeof DBC_CONFIRM !== 'undefined' && DBC_CONFIRM[obj.id] && !SAFE.restoring && typeof dbcConfirm === 'function') { const old0 = await DB.get('kv', obj.id);
      if (old0 && !(await dbcConfirm(obj.id, old0, obj))) { if (obj.id === 'cort' && typeof setCort === 'function') setCort(old0.rows || []); if (obj.id === 'landSales') app.land = old0.v || []; if (obj.id === 'costDb') app.costDb = old0.v || null; if (obj.id === 'rentDb' && typeof RDB !== 'undefined') RDB.list = old0.v || [];
        try { if (typeof render === 'function') render(); } catch (e) {} throw new Error('Not changed – you cancelled, so your ' + DBC_CONFIRM[obj.id] + ' is as it was.'); } }
    if (store === 'kv' && obj && SAFE_DBS[obj.id] && !SAFE.restoring) { try { const old = await DB.get('kv', obj.id);
        if (old) { const a = safeCount(obj.id, old), b = safeCount(obj.id, obj);
          await put('kv', { ...old, id: 'prev:' + obj.id, prevOf: obj.id, at: new Date().toISOString() });
          const L = ((await DB.get('kv', 'dblog')) || {}).v || []; L.unshift({ at: new Date().toISOString(), db: obj.id, before: a, after: b }); await put('kv', { id: 'dblog', v: L.slice(0, 100) }); SAFE.log = L.slice(0, 100); } } catch (e) { console.warn('safety log', e); } }
    return put(store, obj); }; })();
async function safeUndo(id) { const p = await DB.get('kv', 'prev:' + id); if (!p) { toast('Nothing to undo for ' + SAFE_DBS[id]); return; }
  const cur = await DB.get('kv', id); const back = { ...p, id }; delete back.prevOf; delete back.at;
  SAFE.restoring = true; try { await DB.put('kv', back); if (cur) await DB.put('kv', { ...cur, id: 'prev:' + id, prevOf: id, at: new Date().toISOString() }); } finally { SAFE.restoring = false; }   // undo can be undone
  const L = ((await DB.get('kv', 'dblog')) || {}).v || []; L.unshift({ at: new Date().toISOString(), db: id, undo: true, before: safeCount(id, cur), after: safeCount(id, back) }); await DB.put('kv', { id: 'dblog', v: L.slice(0, 100) }); SAFE.log = L;
  toast(SAFE_DBS[id] + ': the change was undone – reloading'); setTimeout(() => location.reload(), 900); }
async function safePersist() { try { if (navigator.storage && navigator.storage.persist) { SAFE.persisted = await navigator.storage.persisted(); if (!SAFE.persisted) SAFE.persisted = await navigator.storage.persist(); } } catch (e) {} }
async function safeLoadLog() { try { SAFE.log = ((await DB.get('kv', 'dblog')) || {}).v || []; } catch (e) { SAFE.log = []; } if (typeof DBV !== 'undefined' && DBV && typeof render === 'function') try { render(); } catch (e) {} }
/* does each database read, and are its records whole? */
function safeHealth() { const out = [];
  try { const r = app.cort || []; const bad = r.filter(x => !x || !(x.salePrice || x.price) || !(x.saleDate || x.recDate || x.date)).length; out.push(['CORT weekly closings', !r.length ? 'empty' : bad > r.length * 0.2 ? `${bad} of ${r.length} rows have no price or date` : 'ok']); } catch (e) { out.push(['CORT weekly closings', 'could not be read']); }
  try { const r = app.land || []; const bad = r.filter(x => !x || !num(x.price || x.salePrice)).length; out.push(['Land sales', !r.length ? 'empty' : bad > r.length * 0.2 ? `${bad} of ${r.length} have no price` : 'ok']); } catch (e) { out.push(['Land sales', 'could not be read']); }
  try { const C = app.costDb; out.push(['Construction cost database', !C ? 'empty' : !Array.isArray(C.projects) || !Array.isArray(C.lines) || !C.projects.length ? 'incomplete – add the workbook again' : 'ok']); } catch (e) { out.push(['Construction cost database', 'could not be read']); }
  try { out.push(['Comp archive', !ARCH.loaded ? 'empty' : ARCH.rows.length ? 'ok' : 'no records']); } catch (e) { out.push(['Comp archive', 'could not be read']); }
  return out; }
function safetyHTML() { const H = safeHealth(); const L = (SAFE.log || []).slice(0, 12);
  const undoable = Object.keys(SAFE_DBS).filter(id => L.some(x => x.db === id));
  return `<section class="card"><h2>Is everything safe? ${SAFE.persisted ? '<span class="dbst on">✓ storage kept by Chrome</span>' : '<span class="dbst off">Chrome may clear this site’s storage</span>'}</h2>
    <table class="ts"><tbody>${H.map(([n, s]) => `<tr><th>${esc(n)}</th><td>${s === 'ok' ? '<span class="dbst on">✓ opened cleanly</span>' : s === 'empty' ? '<span class="dbst">not added yet</span>' : `<span class="dbst off">⚠ ${esc(s)}</span>`}</td></tr>`).join('')}</tbody></table>
    ${SAFE.persisted ? '' : '<p class="help warnTxt">Chrome has not agreed to keep this site’s storage. Keep your automatic backup on (Appraisal Assistant › Home) and your original files in OneDrive. In Chrome › Settings › Privacy › Site settings, do <b>not</b> clear data when you close Chrome. Chrome agrees more readily once the Appraisal Assistant is bookmarked or installed (⋮ › Cast, save and share › Install page as app).</p>'}
    <h3>Recent changes to your databases</h3>
    ${L.length ? `<table class="ts"><tbody>${L.map(x => `<tr><td>${esc(new Date(x.at).toLocaleString())}</td><td>${esc(SAFE_DBS[x.db] || x.db)}</td><td>${x.undo ? 'undone' : 'changed'}: ${x.before.toLocaleString()} → ${x.after.toLocaleString()}</td></tr>`).join('')}</tbody></table>
      <div class="row">${undoable.map(id => `<button class="btn" data-safeundo="${id}">Undo the last change to ${esc(SAFE_DBS[id])}</button>`).join('')}</div>` : '<p class="help">No changes yet. Each time a database is replaced, the version before is kept here so you can undo it.</p>'}</section>
  <section class="card"><h2>Protecting your computer and your clients' information</h2><ul class="safelist">
    <li><b>Backups in two places:</b> the automatic daily backup in a OneDrive folder (Appraisal Assistant › Home) and, once a month, a copy on an external drive kept apart from the computer.</li>
    <li><b>Keep the originals:</b> your ACI archive, CORT emails, cost workbook and MLS exports stay in OneDrive – the assistant reads copies and never changes them.</li>
    <li><b>Updates:</b> let Windows and Chrome update themselves; restart when they ask.</li>
    <li><b>Protection:</b> Microsoft Defender (or your antivirus) on; BitLocker drive encryption on (Windows › Settings › Privacy & security › Device encryption), so a lost or stolen laptop does not expose client files.</li>
    <li><b>Passwords:</b> RoboForm with a strong master password; two-step sign-in on Microsoft, Google, your MLS and your bank.</li>
    <li><b>Email and links:</b> do not open attachments or links you did not expect, even from a known client – call to check. Lenders and AMCs never ask for your password by email.</li>
    <li><b>Chrome extensions:</b> only the ones you know (RoboForm, Claude). Each can read pages.</li>
    <li><b>Lock the screen</b> when you step away (Windows key + L).</li>
    <li><b>Confidentiality:</b> client and borrower information stays on this computer and in your OneDrive; nothing here is uploaded. Follow each client's AI and confidentiality terms (the order shows them).</li>
    <li><b>Records:</b> keep each workfile at least 5 years after the report was prepared, or 2 years after the end of any court case where you testified (USPAP Record Keeping Rule), whichever is later.</li>
    <li><b>Your protection:</b> the assistant only suggests – every rating, adjustment and value is yours. Keep your E&O insurance current, and let the pre-check and review genie run before every export.</li></ul></section>`; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-safeundo]'); if (!b) return; if (!confirm('Undo the last change to ' + SAFE_DBS[b.dataset.safeundo] + '?')) return; safeUndo(b.dataset.safeundo); });
safePersist(); { const w = setInterval(() => { if (DB.ready && DB.ready.then) { clearInterval(w); DB.ready.then(safeLoadLog); } }, 200); }
