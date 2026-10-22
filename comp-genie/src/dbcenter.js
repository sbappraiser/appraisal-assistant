/* =====================================================================
   The Database center (the head of the octopus; her rules Oct 22 2026): the databases stay correct.
   - SHOW FIRST: a file that would add to, change or remove from CORT, land sales or the cost database shows what it would do
     (counts and examples) and waits for her OK; Cancel leaves the database exactly as it was. (safety.js keeps the version
     before for undo and logs the change.)
   - LOOK INSIDE: every database can be read as a table – search, sort, page, save as CSV. Read only: nothing is edited here.
   - INTEGRITY: duplicates, records missing their key facts, and signs of two properties mixed together (one APN with two
     different addresses) are listed so she can check them.
   ===================================================================== */
const DBC_CONFIRM = { cort: 'CORT weekly closings', landSales: 'Land sales', costDb: 'Construction cost database' };
const dbcKey = { cort: r => [apnKey(r.apn) || '', r.saleDate || r.recDate || '', r.doc || ''].join('|'), landSales: r => String(r.id || '') };
const dbcRows = (id, rec) => !rec ? [] : id === 'cort' ? (rec.rows || []) : id === 'costDb' ? (((rec.v || {}).projects) || []) : (Array.isArray(rec.v) ? rec.v : []);
const dbcLabel = r => r ? (r.addr || r.address || r.name || r.project || r.apn || r.id || '').toString().slice(0, 60) : '';
const dbcClean = r => JSON.stringify(r, (k, v) => k.startsWith('_') ? undefined : v);
function dbcDiff(id, oldRec, newRec) { const A = dbcRows(id, oldRec), B = dbcRows(id, newRec);
  if (!dbcKey[id]) return { added: [], changed: [], removed: [], whole: true, before: A.length, after: B.length };
  const key = dbcKey[id], ma = new Map(A.map(r => [key(r), r])), mb = new Map(B.map(r => [key(r), r]));
  const added = B.filter(r => !ma.has(key(r))), removed = A.filter(r => !mb.has(key(r))), changed = B.filter(r => ma.has(key(r)) && dbcClean(ma.get(key(r))) !== dbcClean(r));
  return { added, changed, removed, before: A.length, after: B.length }; }
/* a small yes / no window (her look) */
function dbcAsk(title, html, okLabel) { return new Promise(res => { const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet dbcask"><h2>${esc(title)}</h2>${html}<div class="row"><button class="btn primary" data-dbc="ok">${esc(okLabel || 'Yes, change it')}</button><button class="btn" data-dbc="no">Cancel – leave it as it is</button></div></div>`;
  const done = v => { bg.remove(); res(v); }; bg.addEventListener('click', e => { const b = e.target.closest('[data-dbc]'); if (b) done(b.dataset.dbc === 'ok'); });
  document.body.appendChild(bg); bg.querySelector('[data-dbc="ok"]').focus(); }); }
async function dbcConfirm(id, oldRec, newRec) {
  const D = dbcDiff(id, oldRec, newRec); const ex = L => L.slice(0, 5).map(r => `<li>${esc(dbcLabel(r))}${r.saleDate ? ' · ' + esc(showDate(r.saleDate)) : ''}${r.salePrice ? ' · ' + esc(money(r.salePrice)) : ''}</li>`).join('');
  if (!D.whole && !D.added.length && !D.changed.length && !D.removed.length) return true;   // nothing would change
  const html = D.whole ? `<p>This replaces your whole ${esc(DBC_CONFIRM[id])}: <b>${D.before.toLocaleString()}</b> projects now → <b>${D.after.toLocaleString()}</b> after.</p>`
    : `<p>Your ${esc(DBC_CONFIRM[id])} has <b>${D.before.toLocaleString()}</b> records. After this: <b>${D.after.toLocaleString()}</b>.</p><ul class="dbcsum">
      ${D.added.length ? `<li><b>${D.added.length.toLocaleString()} added</b><ul>${ex(D.added)}</ul></li>` : ''}${D.changed.length ? `<li><b>${D.changed.length.toLocaleString()} changed</b> (the same record with new facts)<ul>${ex(D.changed)}</ul></li>` : ''}${D.removed.length ? `<li class="warnTxt"><b>${D.removed.length.toLocaleString()} removed</b><ul>${ex(D.removed)}</ul></li>` : ''}</ul>`;
  return dbcAsk('Change your ' + DBC_CONFIRM[id] + '?', html + '<p class="help">The version before is kept – Database center › Recent changes › Undo brings it back.</p>'); }
/* --- look inside: a read-only table of any database --- */
const DBV2 = { id: null, q: '', sort: null, desc: false, page: 0 };
function dbcSource(id) { if (id === 'cort') return app.cort || []; if (id === 'land') return app.land || []; if (id === 'cost') return (app.costDb && app.costDb.projects) || [];
  if (id === 'arch') return ARCH.loaded ? ARCH.rows.map((_, i) => i) : []; return []; }
const dbcRow = (id, x) => id === 'arch' ? archRow(x) : x;
function dbcCols(id, rows) { const pref = { cort: ['saleDate', 'addr', 'apn', 'salePrice', 'doc', 'buyer', 'seller', 'financing', 'period'], land: ['addr', 'apn', 'saleDate', 'salePrice', 'acres', 'sf', 'area', 'zone', 'view'],
    arch: ['address', 'apn', 'sale_date', 'sale_price', 'gla', 'record_role', 'from_report', 'entered_date'], cost: ['name', 'project', 'year', 'area', 'quality', 'kind'] }[id] || [];
  const seen = new Set(); rows.slice(0, 200).forEach(x => Object.keys(dbcRow(id, x)).forEach(k => { if (!k.startsWith('_')) seen.add(k); }));
  return [...pref.filter(k => seen.has(k)), ...[...seen].filter(k => !pref.includes(k))].slice(0, 12); }
function dbcViewHTML() { const id = DBV2.id; const all = dbcSource(id); const cols = dbcCols(id, all); const W = DBV2.q.toLowerCase().split(/\s+/).filter(Boolean);
  let rows = all.map(x => dbcRow(id, x)); if (W.length) rows = rows.filter(r => { const t = cols.map(c => r[c]).join(' ').toLowerCase(); return W.every(w => t.includes(w)); });
  if (DBV2.sort) { const k = DBV2.sort; rows.sort((a, b) => { const x = a[k], y = b[k]; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true }); return DBV2.desc ? -c : c; }); }
  const per = 100, pages = Math.max(1, Math.ceil(rows.length / per)); DBV2.page = Math.min(DBV2.page, pages - 1); const show = rows.slice(DBV2.page * per, DBV2.page * per + per);
  const name = { cort: 'CORT weekly closings', land: 'Land sales', arch: 'Comp archive', cost: 'Construction cost database – projects' }[id];
  const cell = v => v == null ? '' : typeof v === 'number' ? (v > 1000 ? v.toLocaleString() : String(v)) : esc(String(v).slice(0, 80));
  DBV2.rows = rows; DBV2.cols = cols;
  return `<div class="sheet dbcview"><div class="row"><h2 style="margin:0">${esc(name)}</h2><span class="muted">${rows.length.toLocaleString()} of ${all.length.toLocaleString()} records · read only</span><span class="grow"></span>
    <button class="btn sm" data-dbcv="csv">Save these as CSV</button><button class="btn sm" data-dbcv="close">Close</button></div>
    <div class="row"><input id="dbcQ" class="txt" placeholder="Search – e.g. an address, APN, buyer, 2025-" value="${esc(DBV2.q)}" style="flex:1"></div>
    <div class="tablewrap dbctab"><table class="ts"><thead><tr>${cols.map(c => `<th data-dbcs="${esc(c)}" title="Sort">${esc(c)}${DBV2.sort === c ? (DBV2.desc ? ' ▼' : ' ▲') : ''}</th>`).join('')}</tr></thead>
      <tbody>${show.map(r => `<tr>${cols.map(c => `<td>${cell(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="row"><button class="btn sm" data-dbcv="prev" ${DBV2.page ? '' : 'disabled'}>‹ Previous</button><span class="muted">page ${DBV2.page + 1} of ${pages}</span><button class="btn sm" data-dbcv="next" ${DBV2.page < pages - 1 ? '' : 'disabled'}>Next ›</button></div></div>`; }
function dbcOpen(id, q) { DBV2.id = id; DBV2.q = q || ''; DBV2.sort = null; DBV2.page = 0; let bg = document.getElementById('dbcBg'); if (!bg) { bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'dbcBg'; document.body.appendChild(bg); } bg.innerHTML = dbcViewHTML(); }
function dbcRedraw() { const bg = document.getElementById('dbcBg'); if (!bg) return; const q = document.getElementById('dbcQ'); const pos = q ? q.selectionStart : 0; bg.innerHTML = dbcViewHTML(); const q2 = document.getElementById('dbcQ'); if (q && q2 && document.activeElement !== q2 && q === document.activeElement) {} if (q2 && DBV2.typing) { q2.focus(); q2.setSelectionRange(pos, pos); } }
document.addEventListener('click', e => { if (!e.target.closest) return;
  const o = e.target.closest('[data-dbcopen]'); if (o) { dbcOpen(o.dataset.dbcopen, o.dataset.dbcq || ''); return; }
  const s = e.target.closest('[data-dbcs]'); if (s) { const k = s.dataset.dbcs; DBV2.desc = DBV2.sort === k ? !DBV2.desc : false; DBV2.sort = k; DBV2.typing = false; dbcRedraw(); return; }
  const b = e.target.closest('[data-dbcv]'); if (!b) { if (e.target.id === 'dbcBg') e.target.remove(); return; } const a = b.dataset.dbcv;
  if (a === 'close') document.getElementById('dbcBg').remove(); if (a === 'prev') { DBV2.page--; DBV2.typing = false; dbcRedraw(); } if (a === 'next') { DBV2.page++; DBV2.typing = false; dbcRedraw(); }
  if (a === 'csv') { const q = v => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const csv = [DBV2.cols.join(','), ...DBV2.rows.map(r => DBV2.cols.map(c => q(r[c])).join(','))].join('\r\n'); const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a2.download = (DBV2.id + ' ' + todayISO() + '.csv'); a2.click(); } });
document.addEventListener('input', e => { if (e.target.id !== 'dbcQ') return; DBV2.q = e.target.value; DBV2.page = 0; DBV2.typing = true; dbcRedraw(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const bg = document.getElementById('dbcBg'); if (bg) bg.remove(); } });
/* --- integrity: duplicates, missing key facts, one APN with two different addresses (two properties mixed?) --- */
function dbcIntegrity() { const out = [];
  const check = (name, id, rows, keyOf, need) => { if (!rows.length) return; const seen = new Map(); let dup = 0; rows.forEach(r => { const k = keyOf(r); if (!k) return; seen.set(k, (seen.get(k) || 0) + 1); }); seen.forEach(n => { if (n > 1) dup += n - 1; });
    const miss = rows.filter(r => need.some(k => blank(r[k]) || r[k] === '')).length;
    const byApn = new Map(); rows.forEach(r => { const a = apnKey(r.apn); const ad = r.addr || r.address; if (!a || !ad) return; const k = addrKey(ad); if (!k) return; if (!byApn.has(a)) byApn.set(a, new Set()); byApn.get(a).add(k + '¦' + ad); });
    const mixed = [...byApn.entries()].filter(([, S]) => new Set([...S].map(x => x.split('¦')[0])).size > 1).map(([a, S]) => ({ apn: a, addrs: [...new Set([...S].map(x => x.split('¦')[1]))].slice(0, 3) }));
    out.push({ name, id, n: rows.length, dup, miss, need, mixed }); };
  check('CORT weekly closings', 'cort', app.cort || [], dbcKey.cort, ['apn', 'saleDate', 'salePrice']);
  check('Land sales', 'land', app.land || [], r => String(r.id || ''), ['salePrice']);
  if (ARCH.loaded) { const rows = []; for (let i = 0; i < ARCH.rows.length; i++) rows.push(archRow(i)); check('Comp archive', 'arch', rows, () => '', []); }
  return out; }
function dbcIntegrityHTML() { const L = dbcIntegrity(); if (!L.length) return '';
  return `<section class="card"><h2>Integrity check <small>– nothing is changed; check these yourself</small></h2>${L.map(x => `<div class="dbcint"><b>${esc(x.name)}</b> · ${x.n.toLocaleString()} records ·
      ${x.dup ? `<span class="dbst off">${x.dup} duplicate${x.dup > 1 ? 's' : ''}</span>` : '<span class="dbst on">✓ no duplicates</span>'}
      ${x.need.length ? (x.miss ? ` <span class="dbst off">${x.miss} missing ${x.need.join(' / ')}</span>` : ' <span class="dbst on">✓ key facts present</span>') : ''}
      ${x.mixed.length ? ` <span class="dbst off">${x.mixed.length} APN${x.mixed.length > 1 ? 's' : ''} with more than one address</span><ul class="dbcmix">${x.mixed.slice(0, 8).map(m => `<li><button class="linkbtn" data-dbcopen="${x.id}" data-dbcq="${esc(m.apn)}">APN ${esc(m.apn)}</button>: ${m.addrs.map(esc).join(' · ')}</li>`).join('')}${x.mixed.length > 8 ? `<li>… and ${x.mixed.length - 8} more</li>` : ''}</ul><p class="help">One parcel number with two different addresses can be a corner lot or a unit – or two properties' data mixed. Click to look.</p>` : ' <span class="dbst on">✓ each APN has one address</span>'}</div>`).join('')}</section>`; }
