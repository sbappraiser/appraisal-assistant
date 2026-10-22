/* =====================================================================
   My rental database (her ask Oct 22 2026): the rental comps from her rent surveys, kept in one place for the next rent schedule.
   - Starts from the rentals in her ACI comp archive (comparable type "Rental"). ACI kept their facts but not the rent, lease date,
     utilities or furnished – those records say "rent not saved".
   - Each rent survey adds to it: "Save these rentals to my rental database" on 6 Income – one record per property (address + unit),
     with every rent she has seen for it (date, rent, report), newest first. Shown first, kept for undo, logged (her database rules).
   - 6 Income › "From my rental database": pick rentals; they come in with the last rent and its date flagged "confirm today's rent"
     until she types the current rent – old data is never passed off as current.
   ===================================================================== */
const RDB = { list: [], loaded: false, q: '', f: null };
const rdbKey = r => (typeof addrKey === 'function' ? addrKey([r.addr, r.unit ? '#' + r.unit : ''].join(' ')) : String(r.addr || '').toLowerCase().replace(/[^a-z0-9#]/g, '')) + '|' + String(r.city || '').toLowerCase().replace(/[^a-z]/g, '');
async function rdbLoad() { try { const a = await DB.get('kv', 'rentDb'); RDB.list = (a && a.v) || []; } catch (e) { RDB.list = []; } RDB.loaded = true; }
async function rdbSave(next, why) { await DB.put('kv', { id: 'rentDb', v: next }); RDB.list = next; toast(why || 'Rental database saved', 5000); }   // safety.js shows the change first (DBC_CONFIRM) and keeps the version before
const rdbLast = r => (r.rents || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
const rdbAge = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})/); if (!m) return null; const now = new Date(); return (now.getFullYear() - +m[1]) * 12 + (now.getMonth() + 1 - +m[2]); };   // months
const rdbYM = t => { const s = String(t || '').trim(); let m; if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return `${m[2]}-${m[1].padStart(2, '0')}`; if ((m = s.match(/^(\d{4})-(\d{2})/))) return `${m[1]}-${m[2]}`; return ''; };
const rdbMY = ym => { const m = String(ym || '').match(/^(\d{4})-(\d{2})/); return m ? `${m[2]}/${m[1]}` : ''; };
/* the rentals in her ACI archive → records (facts only; ACI saved no rent) */
function rdbFromArchive() { if (!ARCH.loaded) return []; const out = []; const ix = {}; ARCH.cols.forEach((c, i) => ix[c] = i);
  if (ix.comparable_type === undefined) return out;
  ARCH.rows.forEach((row, i) => { if (row[ix.comparable_type] !== 'Rental') return; const a = archRow(i); const name = String(a.street_name || '').trim(); const um = name.match(/\s#\s*(\S+)$/);
    const full = num(a.baths_full) || 0, half = num(a.baths_half) || 0; const age = num(a.actual_age);
    out.push({ id: 'aci' + a.rec_id, origin: 'ACI archive', addr: [a.street_number, um ? name.replace(um[0], '') : name].filter(Boolean).join(' ').trim(), unit: a.unit || (um ? um[1] : ''), city: a.city || '', zip: String(a.zip || '').slice(0, 5), apn: a.apn || '',
      mls: a.mls_no || ((String(a.verification || '').match(/#\s*(\d{2}-\d{3,5})/) || [])[1] || ''), beds: num(a.beds), baths: full + half / 2 || null, rooms: num(a.rooms), gla: num(a.gla), lot: num(a.usable_sf) || num(a.site_sf) || null,
      cond: a.condition_raw || '', qual: a.quality_raw || '', design: a.design_raw || '', loc: a.location_raw || '', view: a.view_raw || '', garage: a.garage_raw || '', yearBuilt: age && age > 1800 ? age : null, age: age && age < 300 ? age : null,
      nbhd: a.neighborhood || a.neighborhood_row || '', src: a.verification || '', amen: [a.amenities, a.accessory_raw].filter(x => x && x !== 'None').join('; '), photo: a.front_photo || '',
      rents: [{ date: String(a.entered_date || '').slice(0, 7), rent: null, report: a.from_report || '', note: 'rent not saved by ACI' }] }); });
  return out; }
/* a rental from this assignment → a record */
function rdbFromJob(J, r) { const K = typeof incomeJob === 'function' ? incomeJob(J) : {}; void K;
  return { origin: 'Rent survey', addr: String(r.addr || '').trim(), unit: r.unit || '', city: r.city || J.subject.city || '', zip: String(r.zip || '').slice(0, 5), mls: r.mls || '', beds: num(r.beds), baths: num(r.baths), gla: num(r.gla), lot: num(r.lot),
    cond: r.cond || '', nbhd: r.nbhd || '', src: r.src || '', lat: num(r.lat) || null, lon: num(r.lon) || null,
    rents: [{ date: rdbYM(r.date) || todayISO().slice(0, 7), rent: num(r.rent), report: J.subject.fileNo || J.name || J.subject.address || '', lease: rdbYM(r.date), furn: r.furn || '', util: r.util || '', conc: r.conc || '' }] }; }
/* merge: same property (address + unit + city) → one record; its facts take the newer ones, its rents are added (never mixed with another property) */
function rdbMerge(list, adds) { const by = new Map(list.map(r => [rdbKey(r), JSON.parse(JSON.stringify(r))])); let nNew = 0, nUpd = 0;
  adds.forEach(a => { const k = rdbKey(a); if (!a.addr) return; const o = by.get(k);
    if (!o) { by.set(k, { ...a, id: a.id || 'r' + Math.random().toString(36).slice(2, 10) }); nNew++; return; }
    let ch = false; ['unit', 'zip', 'mls', 'beds', 'baths', 'rooms', 'gla', 'lot', 'cond', 'qual', 'design', 'loc', 'view', 'garage', 'nbhd', 'src', 'lat', 'lon', 'yearBuilt', 'amen', 'photo'].forEach(f => { if (!blank(a[f]) && a[f] !== '' && String(a[f]) !== String(o[f] ?? '')) { if (a.origin !== 'ACI archive' || blank(o[f]) || o[f] === '') { o[f] = a[f]; ch = true; } } });
    (a.rents || []).forEach(x => { if (!(o.rents || []).some(y => y.date === x.date && String(y.rent ?? '') === String(x.rent ?? '') && y.report === x.report)) { (o.rents = o.rents || []).push(x); ch = true; } });
    if (ch) nUpd++; });
  return { list: [...by.values()], nNew, nUpd }; }
async function rdbAddArchive() { if (!ARCH.loaded) { toast('Load your comp archive first (Database center › Comp archive)'); return; } const A = rdbFromArchive(); if (!A.length) { toast('Your archive has no rental comps'); return; }
  const M = rdbMerge(RDB.list, A); if (!M.nNew && !M.nUpd) { toast('Your rental database already has all ' + A.length + ' rentals from the archive'); return; }
  try { await rdbSave(M.list, `${M.nNew} rentals added from your comp archive${M.nUpd ? `, ${M.nUpd} updated` : ''} – ACI did not save their rents; add the rent when you use one`); } catch (e) { toast(e.message); } if (typeof render === 'function') render(); }
async function rdbSaveJob(J) { const R = (J.rentals || []).filter(r => r.use && r.addr && num(r.rent) && !r.dbOld);
  const skip = (J.rentals || []).filter(r => r.use && r.addr && r.dbOld).length;
  if (!R.length) { toast(skip ? 'Type today\'s rent for the rentals from your database first – they still show the old rent' : 'Nothing to save – tick rentals with an address and a rent'); return; }
  if (!RDB.loaded) await rdbLoad(); const M = rdbMerge(RDB.list, R.map(r => rdbFromJob(J, r)));
  try { await rdbSave(M.list, `Rental database: ${M.nNew} new, ${M.nUpd} updated${skip ? ` (${skip} not saved – their rent is still the old one)` : ''}`); } catch (e) { toast(e.message); } if (typeof incomeRedraw === 'function') incomeRedraw(); }
/* ---- 6 Income › From my rental database ---- */
function rdbPickHTML(J) { const S = subjFacts(J); const F = RDB.f || (RDB.f = { city: J.subject.city || '', beds: num(S.beds) || '', gla: num(S.gla) || '' });
  const W = RDB.q.toLowerCase().split(/\s+/).filter(Boolean); const have = new Set((J.rentals || []).map(r => rdbKey(r)));
  let L = RDB.list.filter(r => { if (F.city && String(r.city || '').toLowerCase() !== String(F.city).toLowerCase()) return false; if (F.beds && r.beds && Math.abs(r.beds - F.beds) > 1) return false; if (F.gla && r.gla && Math.abs(r.gla - F.gla) > F.gla * 0.35) return false;
    if (W.length) { const t = [r.addr, r.unit, r.city, r.zip, r.nbhd, r.mls, r.src, (r.rents || []).map(x => x.report).join(' ')].join(' ').toLowerCase(); if (!W.every(w => t.includes(w))) return false; } return true; });
  L.sort((a, b) => String((rdbLast(b) || {}).date || '').localeCompare(String((rdbLast(a) || {}).date || '')));
  const row = r => { const x = rdbLast(r) || {}; const mo = rdbAge(x.date); const old = mo !== null && mo > 12; const isIn = have.has(rdbKey(r));
    return `<tr><td><input type="checkbox" data-rdbsel="${esc(r.id)}" ${isIn ? 'disabled title="already on this rent schedule"' : ''}></td><td>${esc(r.addr)}${r.unit ? ' #' + esc(r.unit) : ''}<br><small class="muted">${esc(r.city)} ${esc(r.zip || '')}${r.nbhd ? ' · ' + esc(r.nbhd) : ''}</small></td>
      <td>${r.beds ?? ''}/${r.baths ?? ''}</td><td class="r">${r.gla ? r.gla.toLocaleString() : ''}</td><td>${esc(r.cond || '')}</td>
      <td class="r">${x.rent ? '<b>' + money(x.rent) + '</b>' : '<span class="warnTxt">rent not saved</span>'}<br><small class="${old ? 'warnTxt' : 'muted'}">${x.date ? rdbMY(x.date) : ''}${old ? ' · ' + Math.floor(mo / 12) + ' yr old' : ''}</small></td>
      <td><small>${esc(x.report || '')}<br>${esc(String(r.src || '').slice(0, 40))}</small></td></tr>`; };
  return `<div class="sheet rdbpick"><div class="row"><h2 style="margin:0">My rental database</h2><span class="muted">${L.length} of ${RDB.list.length} rentals</span><span class="grow"></span><button class="btn sm" data-rdbclose="1">Close</button></div>
    <div class="row wrap"><input class="txt" data-rdbq="1" placeholder="Search – street, neighborhood, MLS #, report" value="${esc(RDB.q)}" style="flex:1">
      <label>City <input class="txt sm" data-rdbf="city" value="${esc(F.city)}" style="width:9em"></label><label>Bedrooms ±1 of <input class="txt xs num" data-rdbf="beds" value="${esc(F.beds)}" style="width:3em"></label><label>Sq ft ±35% of <input class="txt xs num" data-rdbf="gla" value="${esc(F.gla)}" style="width:5em"></label></div>
    <div class="tablewrap" style="max-height:55vh;overflow:auto"><table class="tbl"><thead><tr><th></th><th>Address</th><th>Bd/Ba</th><th class="r">Sq ft</th><th>Cond.</th><th class="r">Last rent</th><th>Report · source</th></tr></thead><tbody>${L.map(row).join('') || '<tr><td colspan="7" class="help">None match – clear the city, bedrooms or sq ft boxes to see more.</td></tr>'}</tbody></table></div>
    <div class="row"><button class="btn primary" data-rdbadd="1">Add the ticked rentals to this rent schedule</button><span class="help">They come in with the last rent and its date marked <b>confirm today's rent</b> – type the current rent (and lease date) before you use them.</span></div></div>`; }
function rdbOpen() { if (!app.job) return; let bg = document.getElementById('rdbBg'); if (!bg) { bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'rdbBg'; document.body.appendChild(bg); } bg.innerHTML = rdbPickHTML(app.job); }
document.addEventListener('click', async e => { const t = e.target.closest && e.target.closest('[data-rdbopen],[data-rdbclose],[data-rdbadd],[data-rdbsave],[data-rdbarch]'); if (!t) return;
  if (t.dataset.rdbarch) { await rdbAddArchive(); return; }
  if (!app.job && !t.dataset.rdbclose) return; const J = app.job;
  if (t.dataset.rdbopen) { if (!RDB.loaded) await rdbLoad(); if (!RDB.list.length) { toast('Your rental database is empty – Database center › My rental database › Bring in the rentals from your comp archive, or save the rentals of a rent survey'); return; } rdbOpen(); return; }
  if (t.dataset.rdbclose) { const bg = document.getElementById('rdbBg'); if (bg) bg.remove(); return; }
  if (t.dataset.rdbsave) { await rdbSaveJob(J); return; }
  if (t.dataset.rdbadd) { const ids = [...document.querySelectorAll('[data-rdbsel]:checked')].map(x => x.dataset.rdbsel); if (!ids.length) { toast('Tick the rentals to add'); return; } let k = 0;
    ids.forEach(id => { const r = RDB.list.find(x => x.id === id); if (!r) return; const x = rdbLast(r) || {};
      J.rentals.push({ id: uid(), use: true, dbId: r.id, addr: r.addr + (r.unit ? ' #' + r.unit : ''), city: r.city, zip: r.zip, mls: r.mls || '', beds: r.beds, baths: r.baths, gla: r.gla, lot: r.lot, cond: r.cond || null, nbhd: r.nbhd || null, lat: r.lat || null, lon: r.lon || null,
        rent: x.rent || null, date: rdbMY(x.lease || x.date), src: r.src || r.origin, dbOld: x.rent ? `rent ${money(x.rent)} as of ${rdbMY(x.date) || 'unknown'} – confirm today's rent` : 'rent not saved – type today\'s rent' }); k++; });
    const bg = document.getElementById('rdbBg'); if (bg) bg.remove(); save(); if (typeof incomeRedraw === 'function') incomeRedraw(); toast(`${k} rental${k === 1 ? '' : 's'} added – type today's rent for each (marked ⚠)`, 7000); } });
document.addEventListener('input', e => { if (!e.target.dataset) return; if (e.target.dataset.rdbq) { RDB.q = e.target.value; const pos = e.target.selectionStart; rdbOpen(); const q = document.querySelector('[data-rdbq]'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } });
document.addEventListener('change', e => { if (!e.target.dataset || !e.target.dataset.rdbf) return; RDB.f[e.target.dataset.rdbf] = e.target.dataset.rdbf === 'city' ? e.target.value.trim() : (num(e.target.value) || ''); rdbOpen(); });
/* Database center card */
function rdbCardHTML() { const n = RDB.list.length, withRent = RDB.list.filter(r => (rdbLast(r) || {}).rent).length; const archN = ARCH.loaded ? rdbFromArchive().length : 0;
  return ['My rental database', n ? `<span class="dbst on">✓ ${n} rentals · ${withRent} with a rent</span>` : '<span class="dbst off">empty</span>',
    'The rental comps from your rent surveys – each property once, with every rent you have seen for it (date, rent, report). ACI kept your older rentals’ facts but not their rents.', '6 Income › From my rental database; each rent survey adds to it',
    (archN ? `<button class="btn primary" data-rdbarch="1">Bring in the ${archN} rentals from your comp archive</button>` : '<span class="help">Load your comp archive to bring in its rentals.</span>') + (n ? ' <button class="btn" data-dbcopen="rent">Look inside</button>' : '')]; }
