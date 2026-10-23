/* =====================================================================
   Comp history (her request, Oct 19 2026): right-click a comp (or click
   "History" on its page) to see every version of it – each report in her
   ACI archive (UAD 2.6, or GPAR / older forms with word ratings) and each
   3.6 assignment here (used as a comp, considered not used, or only on the
   list) – and pick one to work from.
   Sorted: this sale first, then earlier sales (newest first); inside each
   sale, newest first. Click a column heading to sort another way.
   ===================================================================== */
const HIST = { id: null, sort: 'group', dir: 1, open: {} };
const HIST_KEYS = ['status', 'salePrice', 'saleDate', 'listPrice', 'gla', 'beds', 'full', 'half', 'quality', 'condition', 'viewTypes', 'siteSf', 'usableSf', 'yearBuilt'];
const histFilled = vals => FIELDS.filter(f => !blank(vals[f.k])).length;
/* her comments on this comp in a 3.6 assignment: the sales comparison comment sentences that name it, its not-used comment, her notes */
function histComments(j, o) {
  const out = []; const t = compTitle(o); const m = String(t).match(/^(\d+)\s+(\S+)/); const note = String(((j.grid || {}).note) || '');
  if (m && note) { const re = new RegExp('\\b' + m[1] + '\\s+' + m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    // from the sentence that names it to the next sentence that starts with another address (or a new paragraph)
    note.split(/\n\s*\n/).forEach(p => { const S = p.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || []; let on = false, buf = [];
      S.forEach(x => { const t = x.trim(); if (re.test(t)) { if (!on && buf.length) buf = []; on = true; } else if (on && /^\d{2,6}\s+[A-Z]/.test(t)) { out.push({ what: 'Sales comparison comment', text: buf.join(' ') }); buf = []; on = false; } if (on) buf.push(t); });
      if (on && buf.length) out.push({ what: 'Sales comparison comment', text: buf.join(' ') }); }); }
  if (o.notUsed && String(o.notUsed.text || '').trim()) out.push({ what: 'Considered, not used – comment', text: o.notUsed.text.trim() });
  if (String(o.notes || '').trim()) out.push({ what: 'Your notes for this comp', text: o.notes.trim() });
  return out;
}
const histKey = o => { if (o.key) return o.key; const a = V(o, 'addr'); if (!a) return ''; const p = splitAddr(a); return addrKey(p.no, p.street, V(o, 'unit') || p.unit); };
function histSameProp(c, o) {
  const a1 = apnKey(c.apn || V(c, 'apn')), a2 = apnKey(o.apn || V(o, 'apn')); const k1 = histKey(c), k2 = histKey(o);
  if (a1 && a2) return a1 === a2 && (!k1 || !k2 || k1 === k2);   // lot splits share a parcel root: the address must agree too
  const m1 = V(c, 'mls'), m2 = V(o, 'mls'); if (m1 && m2 && m1 === m2) return true;
  return !!(k1 && k2 && k1 === k2);
}
/* her rule (Oct 19 2026): a version that is the same as another except that it is older (actual age, year built ±1 from the age
   arithmetic) or that only the date she checked the prior sales changed is not a new version – the newer one replaces it */
const histPrior = t => { t = String(t || '').trim(); return !t || /no transfers?/i.test(t) ? '' : t.replace(/^\s*(CRS Data|CRS|Realist|Realquest|NDC)\s*-\s*/i, ''); };
function sameButAged(a, b) {
  for (const f of FIELDS) { const x = a[f.k], y = b[f.k];
    if (f.k === 'yearBuilt') { if (blank(x) !== blank(y) || (!blank(x) && Math.abs(num(x) - num(y)) > 1)) return false; continue; }
    if (blank(x) && blank(y)) continue; if (blank(x) !== blank(y) || !sameVal(f, x, y)) return false; }
  return histPrior(a.priorSaleText) === histPrior(b.priorSaleText);
}
function histSaleOf(vals) { return { price: num(vals.salePrice) || null, date: vals.saleDate || vals.contractDate || '' }; }
function histSameSale(a, b) {
  if (!a || !b || (!a.price && !a.date) || (!b.price && !b.date)) return false;
  if (a.price && b.price && Math.abs(a.price - b.price) <= 1000) return true;
  return !!(a.date && b.date && Math.abs(monthsBetween(a.date, b.date)) <= 1.5);
}
async function histVersions(c) {
  const out = []; const now = histSaleOf({ salePrice: V(c, 'salePrice'), saleDate: V(c, 'saleDate'), contractDate: V(c, 'contractDate') });
  // her ACI archive: one record per report the property was in
  (c.src.arch || []).forEach(a => { const v = a.v || {};
    out.push({ kind: 'arch', id: 'a' + a.rec, rec: a.rec, report: a.report || '(report name not kept)', date: a.entered || '', form: v.quality || v.condition ? 'UAD 2.6' : 'GPAR / older form (word ratings)',
      role: a.role === 'subject' ? 'Subject of the report' : a.role === 'comparable' ? 'Comparable' : (a.role || 'Record'), vals: v, filled: histFilled(v), chosen: archChosen(c) && archChosen(c).rec === a.rec,
      alsoIn: (a.also || []).length ? a.also.map(x => (x.report || '?') + (x.entered ? ' (' + showDate(x.entered) + ')' : '')) : null }); });
  // 3.6 assignments here in OctoSleuth
  const jobs = await DB.all('jobs'); const seenJobs = new Set();
  jobs.forEach(j => (j.comps || []).forEach(o => { if (j.id === app.job.id && o.id === c.id) return; if (!histSameProp(c, o)) return;
    const vals = Object.fromEntries(FIELDS.map(f => [f.k, V(o, f.k)]).filter(([, v]) => !blank(v))); seenJobs.add(j.name);
    out.push({ kind: 'job', id: 'j' + j.id + '|' + o.id, jobId: j.id, compId: o.id, report: j.name + (j.id === app.job.id ? ' (this assignment)' : ''), date: j.updated ? new Date(j.updated).toISOString().slice(0, 10) : '', form: 'UAD 3.6',
      role: o.use ? 'Comp ' + o.use : o.notUsed ? 'Considered, not used' + ((o.notUsed.reasons || []).length ? ' – ' + o.notUsed.reasons.join(', ') : '') : 'On the list, not used', vals, filled: histFilled(vals), notUsed: o.notUsed || null, cmt: histComments(j, o) }); }));
  // her comp database (saved from the grid) – only when that assignment is gone
  { const rec = await DB.get('kv', 'mycomps'); ((rec && rec.v) || []).forEach((r, i) => { const vals = r.values || {}; if (seenJobs.has(r.job)) return;
      const probe = { apn: vals.apn, edit: vals, src: { arch: [], cort: [] }, pick: {} };
      if (!histSameProp(c, probe)) return;
      out.push({ kind: 'db', id: 'd' + i, idx: i, report: (r.job || 'My comp database') + ' (saved copy)', date: r.saved ? new Date(r.saved).toISOString().slice(0, 10) : '', form: 'UAD 3.6',
        role: r.compNo ? 'Comp ' + r.compNo : r.notUsed ? 'Considered, not used' : 'Saved', vals, filled: histFilled(vals), notUsed: r.notUsed || null }); }); }
  // which sale each version is about
  out.forEach(x => { const s = histSaleOf(x.vals); x.same = histSameSale(now, s);
    x.group = x.same ? 'This sale' : s.price || s.date ? 'Sale ' + [s.date ? showDate(s.date) : '', s.price ? money(s.price) : ''].filter(Boolean).join(' ') : x.vals.listPrice ? 'Listing ' + money(x.vals.listPrice) : 'No sale recorded';
    x.gdate = s.date || ''; });
  // the same version again, only more aged → one row (the newest), with the other reports listed
  const keep = []; [...out].sort((p, q) => String(q.date).localeCompare(String(p.date))).forEach(x => {
    const twin = keep.find(k => k.group === x.group && sameButAged(k.vals, x.vals));
    if (twin) { (twin.alsoIn = twin.alsoIn || []).push(x.report + (x.date ? ' (' + showDate(x.date) + ')' : ''), ...(x.alsoIn || [])); if (x.cmt && x.cmt.length) twin.cmt = [...(twin.cmt || []), ...x.cmt.map(k => ({ ...k, what: k.what + ' – ' + x.report }))]; if (x.chosen) twin.chosenTwin = x; } else keep.push(x); });
  return keep;
}
function histSorted(list) {
  const d = HIST.dir, by = HIST.sort, s = (a, b) => String(a).localeCompare(String(b));
  return [...list].sort((a, b) => {
    if (by === 'group') { if (a.same !== b.same) return a.same ? -1 : 1; if (a.group !== b.group) return s(b.gdate, a.gdate) || s(a.group, b.group); return s(b.date, a.date); }
    if (by === 'date') return d * s(b.date, a.date);
    if (by === 'filled') return d * (b.filled - a.filled) || s(b.date, a.date);
    if (by === 'form') return d * s(a.form, b.form) || s(b.date, a.date);
    if (by === 'report') return d * s(a.report, b.report);
    return 0; });
}
function histFieldsHTML(x) {
  const also = x.alsoIn && x.alsoIn.length ? `<p class="help"><b>Also in:</b> ${x.alsoIn.map(esc).join(' · ')} <small>(the same data – open any of these reports for your comments)</small></p>` : '';
  const cm = (x.cmt || []).map((k, i) => `<div class="hcmt"><div class="row"><b>${esc(k.what)}</b><span class="grow"></span><button class="btn sm" data-hcopy="${esc(x.id)}|${i}">Copy</button></div><p>${esc(k.text)}</p></div>`).join('');
  const none = x.kind === 'arch' ? '<p class="help">Your comments are in the report itself – the archive keeps the comp data, not the report comments. Open the report named above to copy them.</p>' : (!cm ? '<p class="help">No comments on this comp in that assignment.</p>' : '');
  return also + cm + none + `<table class="hfields">${HIST_KEYS.filter(k => !blank(x.vals[k])).map(k => { const f = FIELD[k] || { l: k, t: 'text' }; return `<tr><th>${esc(f.l)}</th><td>${esc(fmt(f, x.vals[k]))}</td></tr>`; }).join('')}</table>`;
}
async function histOpen(id) {
  const c = app.job && app.job.comps.find(x => x.id === id); if (!c) return;
  if (HIST.id !== id) HIST.open = {}; HIST.id = id;
  const list = histSorted(await histVersions(c)); HIST.list = list;
  let box = document.getElementById('histBox'); if (!box) { box = document.createElement('div'); box.id = 'histBox'; box.className = 'hist'; document.body.appendChild(box); }
  const th = (k, l) => `<th><button class="lnk" data-hsort="${k}">${l}${HIST.sort === k ? (HIST.dir > 0 ? ' ▾' : ' ▴') : ''}</button></th>`;
  let lastG = null;
  box.innerHTML = `<div class="histcard" role="dialog" aria-label="Comp history"><div class="row"><h2>History – ${esc(compTitle(c))}</h2><span class="grow"></span><button class="btn sm" data-hsort="group">This sale first</button><button class="btn sm" data-hclose="1">Close</button></div>
    <p class="help">Every version of this property: each report in your ACI archive (UAD 2.6, or GPAR / older forms with word ratings) and each 3.6 assignment here. <b>Fields filled</b> shows how complete each one is. Click a row to see its main figures.</p>
    ${list.length ? `<div class="tablewrap"><table class="tbl hlist"><thead><tr>${th('date', 'Date')}${th('report', 'Report')}${th('form', 'Form')}<th>How it was used</th>${th('filled', 'Fields filled')}<th></th></tr></thead><tbody>
    ${list.map(x => { const g = HIST.sort === 'group' && x.group !== lastG ? `<tr class="hgrp"><th colspan="6">${esc(x.group)}${x.same ? ' <small>(the sale on your grid)</small>' : ''}</th></tr>` : ''; lastG = x.group;
      const act = x.kind === 'arch' ? (x.chosen || x.chosenTwin ? '<span class="pill ok">in use</span>' : `<button class="btn sm primary" data-huse="${esc(x.id)}">Use this version</button>`)
        : `<button class="btn sm" data-hfill="${esc(x.id)}" title="Only the fields that are blank on this comp now">Fill blanks from it</button><button class="btn sm primary" data-hall="${esc(x.id)}" title="Its values become your values on this comp${x.same ? '' : ' (house and site only – it is a different sale)'}">Use its values</button>`;
      return g + `<tr class="hrow${HIST.open[x.id] ? ' on' : ''}" data-hrow="${esc(x.id)}"><td>${esc(showDate(x.date))}</td><td>${esc(x.report)}${x.alsoIn ? `<br><small class="muted" title="${esc(x.alsoIn.join(' · '))}">same in ${x.alsoIn.length} other report${x.alsoIn.length === 1 ? '' : 's'} (the same data)</small>` : ''}</td><td>${esc(x.form)}</td><td>${esc(x.role)}</td><td class="r">${x.filled} of ${FIELDS.length}</td><td class="acts">${act}</td></tr>`
        + (HIST.open[x.id] ? `<tr class="hdet"><td colspan="6">${histFieldsHTML(x)}</td></tr>` : ''); }).join('')}</tbody></table></div>`
    : '<p>No other versions yet – not in your archive and not in another assignment.</p>'}
    <p class="help">Using an archive version makes it the “My database” column for this comp. Using a 3.6 version copies its values into “Your value” (for a different sale, only the house and site, never the sale facts). Nothing else changes.</p></div>`;
}
function histApply(x, all) {
  const c = app.job.comps.find(y => y.id === HIST.id); if (!c || !x) return 0; let n = 0;
  FIELDS.forEach(f => { const v = x.vals[f.k]; if (blank(v)) return; if (!x.same && ['sale', 'listing'].includes(f.kind)) return;
    if (all ? !sameVal(f, V(c, f.k), v) : blank(V(c, f.k))) { c.edit[f.k] = v; n++; } });
  if (x.notUsed && !c.notUsed && !c.use) { c.notUsed = JSON.parse(JSON.stringify(x.notUsed)); }
  return n;
}
document.addEventListener('contextmenu', e => {
  const t = e.target.closest('[data-open],[data-wbcol],[data-hist]'); if (!t || !app.job || e.target.closest('input,textarea,select')) return;
  e.preventDefault(); histOpen(t.dataset.open || t.dataset.wbcol || t.dataset.hist);
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-hclose],[data-hsort],[data-huse],[data-hfill],[data-hall],[data-hcopy],[data-hrow],[data-hist]'); if (!b) { const bx = document.getElementById('histBox'); if (bx && e.target === bx) bx.remove(); return; }
  if (b.dataset.hist && !b.closest('#histBox')) { e.preventDefault(); e.stopPropagation(); histOpen(b.dataset.hist); return; }
  if (!b.closest('#histBox')) return; e.stopPropagation();
  if (b.dataset.hclose) { document.getElementById('histBox').remove(); return; }
  if (b.dataset.hsort) { const k = b.dataset.hsort; HIST.dir = HIST.sort === k && k !== 'group' ? -HIST.dir : 1; HIST.sort = k; histOpen(HIST.id); return; }
  const find = id => (HIST.list || []).find(x => x.id === id);
  if (b.dataset.huse) { const x = find(b.dataset.huse); const c = app.job.comps.find(y => y.id === HIST.id); c.archPick = x.rec; save(); render(); histOpen(HIST.id); toast('Using the ' + x.report + ' version for “My database”'); return; }
  if (b.dataset.hfill || b.dataset.hall) { const x = find(b.dataset.hfill || b.dataset.hall); const n = histApply(x, !!b.dataset.hall); save(); render(); histOpen(HIST.id); toast(n ? `${n} field${n === 1 ? '' : 's'} filled from ${x.report} – shown as your values (↺ undoes one)` : 'Nothing to fill – this comp already has those fields'); return; }
  if (b.dataset.hcopy) { const [id, i] = b.dataset.hcopy.split('|'); const x = find(id); const t = x && x.cmt && x.cmt[+i] ? x.cmt[+i].text : ''; try { await navigator.clipboard.writeText(t); toast('Copied – paste it into your comment'); } catch (er) { toast('Could not copy – select the text and press Ctrl+C'); } return; }
  if (b.dataset.hrow && !e.target.closest('button')) { HIST.open[b.dataset.hrow] = !HIST.open[b.dataset.hrow]; histOpen(HIST.id); }
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const bx = document.getElementById('histBox'); if (bx) bx.remove(); } });
