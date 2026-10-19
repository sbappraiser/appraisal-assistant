/* =====================================================================
   Grid workbook (Oct 2026) – office, three monitors.
   · Workbook view: only the lines she compares / adjusts, comp facts typed
     straight into the grid, comps a page at a time (subject always shown).
   · Pop-outs: the grid in separate windows (comps 1–3, 4–6, 7–9 …) she moves
     to each monitor; every window stays in step (BroadcastChannel + the same
     browser storage).
   · Keys: Tab = same line, next comp (then the next line); Shift+Tab back;
     Enter = same comp, next line.  "=" copies the subject's entry for that
     line, "=2" copies comp 2's.  Ctrl+Shift+2 swaps this comp with comp 2.
     Ctrl+Z outside a text box takes the comp off the grid (saved to her
     database and to "considered, not used" first) with an Undo bar.
   · Arrange: move comps up / down, e.g. #12 into #2.
   ===================================================================== */
const POP = (() => { const q = new URLSearchParams(location.search); return q.get('pop') === 'grid' ? { from: +q.get('from') || 1, to: +q.get('to') || 3, job: q.get('job') || '' } : null; })();
const WIN = Math.random().toString(36).slice(2);
const WB = { page: 0, cur: null, undo: null,
  get on() { if (POP) return true; try { return localStorage.getItem('genie-wb') === '1'; } catch (e) { return false; } },
  set on(v) { try { localStorage.setItem('genie-wb', v ? '1' : '0'); } catch (e) {} },
  get per() { try { return +(localStorage.getItem('genie-wb-per') || 3); } catch (e) { return 3; } },
  set per(v) { try { localStorage.setItem('genie-wb-per', String(v)); } catch (e) {} } };
const CPOP = (() => { const q = new URLSearchParams(location.search); return q.get('pop') === 'comp' ? { id: q.get('id') || '', job: q.get('job') || '' } : null; })();   // one comp in its own window (her request, Oct 19 2026)
let WBC = null; try { WBC = new BroadcastChannel('comp-genie'); } catch (e) {}
function wbNotify() { if (WBC && app.job) try { WBC.postMessage({ job: app.job.id, from: WIN }); } catch (e) {} }
if (WBC) WBC.onmessage = async e => {
  const d = e.data || {}; if (!app.job || d.from === WIN || d.job !== app.job.id) return;
  const j = await DB.get('jobs', app.job.id); if (!j) return;
  const i = app.jobs.findIndex(x => x.id === j.id); if (i >= 0) app.jobs[i] = j; app.job = j;
  // keep what she is typing in this window: put it back after the redraw
  const a = document.activeElement; const dirty = a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.value !== a.defaultValue ? [FOCUS_KEYS.map(k => [k, a.getAttribute(k)]).find(x => x[1]), a.value] : null;
  render(); if (dirty && dirty[0]) { const el = document.querySelector(`[${dirty[0][0]}="${CSS.escape(dirty[0][1])}"]`); if (el) { el.value = dirty[1]; el.focus({ preventScroll: true }); } }
  else if (a && a.getAttribute) { const k = FOCUS_KEYS.map(k => [k, a.getAttribute(k)]).find(x => x[1]); if (k) { const el = document.querySelector(`[${k[0]}="${CSS.escape(k[1])}"]`); if (el) el.focus({ preventScroll: true }); } }
};
const wbLean = () => WB.on;
function wbSlice(all) {
  if (POP) return all.slice(POP.from - 1, POP.to);
  if (!WB.on || WB.per >= 99) return all;
  const pages = Math.max(1, Math.ceil(all.length / WB.per)); if (WB.page >= pages) WB.page = pages - 1; if (WB.page < 0) WB.page = 0;
  return all.slice(WB.page * WB.per, WB.page * WB.per + WB.per);
}
const WB_ROWS = row => !wbLean() || row[3] || ['price', 'prox'].includes(row[0]);
const WB_NOEDIT = ['ppsf', 'src', 'prox'];
/* a line's entry as text, for the subject or a comp (what "=" / "=2" copies) */
function wbFactText(id, F) {
  if (id === 'baths') return blank(F.full) ? '' : `${F.full}/${F.half || 0}`;
  if (id === 'beds') return blank(F.beds) ? '' : String(F.beds);
  const v = F[id]; return blank(v) ? '' : String(v);
}
const WB_EDIT = { price: 'salePrice', sale: 'saleDate', contract: 'contractDate', conc: 'concessions', terms: 'financing', dom: 'dom', site: 'siteSf', topo: 'topo', nbhd: 'nbhd',
  land: 'landscaping', style: 'style', year: 'yearBuilt', gla: 'gla', bsmt: 'bsmtFin', garage: 'garage', energy: 'energy', porch: 'porch', other: 'other', rooms: 'rooms', attach: 'attach' };
/* write a typed (or copied) entry into the comp – her own values, kept apart from the sources like any edit */
function wbFactSet(J, c, id, text) {
  const E = c.edit = c.edit || {}; const t = String(text || '').trim(); const n = s => num(String(s).replace(/[$,\s]/g, ''));
  const put = (k, v) => { if (blank(v) || v === '') delete E[k]; else E[k] = v; };
  switch (id) {
    case 'usable': put('usableSf', t === '' ? null : Math.round((n(t.replace(/ac(res?)?$/i, '')) || 0) * 43560)); return;
    case 'beds': put('beds', t === '' ? null : n(t)); put('bgBeds', t === '' ? null : 0); return;
    case 'baths': { const m = t.match(/(\d+)\D*(\d+)?/); put('full', m ? +m[1] : null); put('half', m ? (m[2] ? +m[2] : 0) : null); return; }
    case 'q': case 'c': { const L = id.toUpperCase(); const m = t.toUpperCase().match(new RegExp(L + '?\\s*([1-6])')); put(id === 'q' ? 'quality' : 'condition', m ? L + m[1] : (t ? t : null));
      const tier = /\+|high/i.test(t) ? 'high' : /-|low/i.test(t) ? 'low' : /mid/i.test(t) ? 'mid' : null; if (tier) { const G = G0(J); G.fine = G.fine || {}; G.fine[c.id] = G.fine[c.id] || {}; G.fine[c.id][id] = tier; } return; }
    case 'view': case 'loc': { const [a, ...b] = t.split(/:|\s–\s/); put(id === 'view' ? 'viewRating' : 'locRating', a ? a.trim() : null); put(id === 'view' ? 'viewTypes' : 'locFactors', b.join(':').trim() || null); if (id === 'view') put('viewRange', null); return; }
    case 'pool': put('pool', t === '' ? null : /pool/i.test(t) ? 'Yes' : 'No'); put('spa', t === '' ? null : /spa|hot ?tub|jacuzzi/i.test(t) ? 'Yes' : 'No'); return;
    case 'courts': put('tennis', t === '' ? null : /tennis/i.test(t) ? 'Yes' : 'No'); put('sport', t === '' ? null : /sport|pickleball|basketball/i.test(t) ? 'Yes' : 'No'); return;
    case 'adu': { put('adu', t || null); const sf = t.match(/(\d[\d,]*)\s*(sf|sq)/i), ba = t.match(/(\d+(\.\d)?)\s*bath/i); put('aduSf', t === '' ? null : sf ? n(sf[1]) : (/^(no|none)$/i.test(t) ? 0 : null)); put('aduBaths', t === '' ? null : ba ? +ba[1] : 0); return; }
  }
  const k = WB_EDIT[id]; if (!k) return;
  const f = FIELD[k] || {}; put(k, t === '' ? null : ['int', 'num', 'money'].includes(f.t) || ['siteSf', 'yearBuilt', 'gla', 'bsmtFin', 'garage', 'salePrice', 'concessions', 'dom'].includes(k) ? n(t) : t);
}
/* "=" and "=N" in a comp's cell */
function wbEquals(J, cid, rowId, v, isFact) {
  const c = J.comps.find(x => x.id === cid); if (!c) return false; const m = String(v).trim().match(/^=\s*(\d*)$/); if (!m) return false;
  const row = ADJ_ROWS.find(r => r[0] === rowId); const G = G0(J);
  const src = m[1] ? usedComps(J).find(x => x.use === +m[1]) : null; if (m[1] && !src) { toast(`There is no comp ${m[1]} on the grid`); return true; }
  if (isFact) { const F = src ? compFacts(src, J) : subjFacts(J); wbFactSet(J, c, rowId, wbFactText(rowId, F));
    if (rowId === 'q' || rowId === 'c') { const fine = src ? fineOf(J, src.id, rowId) : fineOf(J, 'subj', rowId); G.fine = G.fine || {}; G.fine[c.id] = G.fine[c.id] || {}; G.fine[c.id][rowId] = fine; }
    toast(`Comp ${c.use} – ${row ? row[1] : rowId}: same as ${src ? 'comp ' + src.use : 'the subject'}`); return true; }
  G.cells[cid] = G.cells[cid] || {};
  if (!src) G.cells[cid][rowId] = 0;   // same as the subject on this line: no adjustment
  else { const a = cellAmount(J, src, row).v; if (a === null) delete G.cells[cid][rowId]; else G.cells[cid][rowId] = a; }
  toast(`Comp ${c.use} – ${row ? row[1] : rowId}: ${src ? 'comp ' + src.use + "'s adjustment" : 'no adjustment (same as the subject)'}`); return true;
}
/* move / swap comps */
function wbMove(J, cid, to) {
  const L = usedComps(J); const c = L.find(x => x.id === cid); if (!c) return; to = Math.max(1, Math.min(L.length, to));
  const rest = L.filter(x => x !== c); rest.splice(to - 1, 0, c); rest.forEach((x, i) => { x.use = i + 1; });
}
function wbSwap(J, cid, n) { const L = usedComps(J); const a = L.find(x => x.id === cid), b = L.find(x => x.use === n); if (!a || !b || a === b) return false; const u = a.use; a.use = b.use; b.use = u; return true; }
/* Ctrl+Z off the grid: comp out, saved first, with an Undo bar */
async function wbRemove(J, cid) {
  const c = J.comps.find(x => x.id === cid); if (!c || !c.use) return;
  const snap = { job: J.id, cid, uses: J.comps.map(x => [x.id, x.use]), notUsed: c.notUsed ? JSON.parse(JSON.stringify(c.notUsed)) : null, label: `Comp ${c.use} (${compTitle(c)})` };
  try { await saveToMyDb(c); } catch (e) {}
  const was = c.use; markNotUsed(c); J.comps.forEach(x => { if (x.use && x.use > was) x.use--; });
  WB.undo = snap; WB.cur = null; save(); render(); wbUndoBar();
}
function wbUndo() { const s = WB.undo; const J = app.job; if (!s || !J || s.job !== J.id) return; const m = new Map(s.uses); J.comps.forEach(x => { if (m.has(x.id)) x.use = m.get(x.id); });
  const c = J.comps.find(x => x.id === s.cid); if (c) { if (s.notUsed) c.notUsed = s.notUsed; else delete c.notUsed; } WB.undo = null; app.nuAsk = null; save(); render(); wbUndoBar(); toast(s.label + ' is back on the grid'); }
function wbUndoBar() {
  let b = document.getElementById('wbUndo'); if (!WB.undo) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'wbUndo'; b.className = 'wbundo'; document.body.appendChild(b); }
  b.innerHTML = `${esc(WB.undo.label)} is off the grid – saved to your comp database and to “considered, not used”. <button class="btn sm primary" data-act="wb-undo">Undo</button> <button class="btn sm" data-act="wb-undo-x">OK</button>`;
}
function wbBar(J, all) {
  if (POP) return '';
  const on = WB.on; const per = WB.per; const pages = Math.max(1, Math.ceil(all.length / per));
  const pops = []; for (let a = 1; a <= Math.max(all.length, 3); a += 3) pops.push([a, Math.min(a + 2, Math.max(all.length, a + 2))]);
  return `<div class="wbbar"><label class="chk"><input type="checkbox" data-wbon="1" ${on ? 'checked' : ''}> <b>Workbook view</b> <small>only the lines you adjust · type comp facts in the grid</small></label>
    ${on ? `<label>Comps per page <select data-wbper="1">${[3, 4, 5, 6, 9, 99].map(n => `<option value="${n}" ${n === per ? 'selected' : ''}>${n === 99 ? 'all' : n}</option>`).join('')}</select></label>
      ${per < 99 && pages > 1 ? `<span class="pager"><button class="btn sm" data-act="wb-prev" ${WB.page ? '' : 'disabled'}>◀</button> comps ${WB.page * per + 1}–${Math.min(all.length, WB.page * per + per)} of ${all.length} <button class="btn sm" data-act="wb-next" ${WB.page < pages - 1 ? '' : 'disabled'}>▶</button></span>` : ''}` : ''}
    <span class="grow"></span><span class="pops">Pop out ${pops.map(([a, b]) => `<button class="btn sm" data-wbpop="${a}|${b}" title="Opens the grid for comps ${a}–${b} in its own window – drag it to another monitor">${a}–${b}</button>`).join('')}</span>
    <button class="btn sm" data-act="wb-arrange">${app.wbArrange ? 'Close arrange' : 'Arrange'}</button></div>
    ${app.wbArrange ? `<div class="wbarr">${all.map((c, i) => `<div><b>#${c.use}</b> ${esc(compTitle(c))} <button class="btn sm" data-wbmv="${c.id}|${c.use - 1}" ${i ? '' : 'disabled'}>▲</button><button class="btn sm" data-wbmv="${c.id}|${c.use + 1}" ${i < all.length - 1 ? '' : 'disabled'}>▼</button> move to # <input class="txt xs" data-wbto="${c.id}" inputmode="numeric" placeholder="${c.use}"></div>`).join('')}</div>` : ''}
    ${on ? `<p class="help keys">Keys: <b>Tab</b> same line, next comp · <b>Enter</b> next line · <b>=</b> same as the subject · <b>=2</b> same as comp 2 · <b>Ctrl+Shift+2</b> swap this comp with comp 2 · <b>Ctrl+Z</b> (outside a box) take this comp off the grid.</p>` : ''}`;
}
function popHTML(J) {
  const all = usedComps(J); const L = all.slice(POP.from - 1, POP.to);
  return `<header class="top pop"><h1>Comp Genie</h1><span class="pill">${esc(J.name)}</span><span class="pill">Comps ${POP.from}–${POP.to}</span><span class="grow"></span>
    <button class="btn sm" data-wbpage="-3">◀ ${Math.max(1, POP.from - 3)}–${Math.max(3, POP.to - 3)}</button><button class="btn sm" data-wbpage="3">${POP.from + 3}–${POP.to + 3} ▶</button><small>stays in step with your other windows</small></header>
    <section class="card" id="gridCard">${L.length ? gridHTML(J) : `<p class="help">No comps ${POP.from}–${POP.to} on the grid yet.</p>`}</section>`;
}
/* where the cursor is: the comp of the focused cell, or the last one she was in */
const wbCellComp = el => { const d = el && el.closest && el.closest('[data-gadj],[data-gfact],[data-gfine]'); if (!d) return null; const v = d.dataset.gadj || d.dataset.gfact || d.dataset.gfine; return v.split('|')[0]; };
document.addEventListener('focusin', e => { const c = wbCellComp(e.target); if (c && c !== 'subj') WB.cur = c; });
document.addEventListener('keydown', async e => {
  const t = e.target; const inBox = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  const cell = t && t.dataset && (t.dataset.gadj || t.dataset.gfact);
  if (cell && (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey))) {
    const kind = t.dataset.gadj ? 'gadj' : 'gfact'; const [cid, row] = cell.split('|');
    const cells = [...document.querySelectorAll('#gridCard [data-gadj],#gridCard [data-gfact]')].filter(x => !x.disabled);
    const rows = [...new Set(cells.map(x => (x.dataset.gadj || x.dataset.gfact).split('|')[1]))];
    const cols = [...new Set(cells.map(x => (x.dataset.gadj || x.dataset.gfact).split('|')[0]))];
    const find = (c, r, k) => cells.find(x => x.dataset[k] === c + '|' + r) || cells.find(x => (x.dataset.gadj || x.dataset.gfact) === c + '|' + r);
    let target = null;
    if (e.key === 'Enter') { for (let i = rows.indexOf(row) + 1; i < rows.length && !target; i++) target = find(cid, rows[i], kind); }
    else { const dir = e.shiftKey ? -1 : 1; let ci = cols.indexOf(cid) + dir, ri = rows.indexOf(row);
      while (ri >= 0 && ri < rows.length && !target) { if (ci < 0 || ci >= cols.length) { ri += dir; ci = dir > 0 ? 0 : cols.length - 1; continue; } target = find(cols[ci], rows[ri], kind); ci += dir; } }
    if (target) { e.preventDefault(); target.focus(); try { target.select(); } catch (x) {} }   // leaving the cell saves it; the redraw keeps the new cell in focus
    return;
  }
  if (e.ctrlKey && e.shiftKey && /^Digit[1-9]$/.test(e.code) && WB.cur) { e.preventDefault(); const n = +e.code.slice(5); if (wbSwap(app.job, WB.cur, n)) { save(); renderKeepFocus(); toast(`Swapped with comp ${n}`); } return; }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !inBox && WB.on && WB.cur && document.querySelector('#gridCard')) { e.preventDefault(); await wbRemove(app.job, WB.cur); return; }
});
