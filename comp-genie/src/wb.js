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
  get per() { try { return +(localStorage.getItem('genie-wb-per') || 6); } catch (e) { return 6; } },
  set per(v) { try { localStorage.setItem('genie-wb-per', String(v)); } catch (e) {} } };
const CPOP = (() => { const q = new URLSearchParams(location.search); return q.get('pop') === 'comp' ? { id: q.get('id') || '', job: q.get('job') || '' } : null; })();   // one comp in its own window (her request, Oct 19 2026)
let WBC = null; try { WBC = new BroadcastChannel('comp-genie'); } catch (e) {}
function wbNotify() { if (WBC && app.job) try { WBC.postMessage({ job: app.job.id, from: WIN }); } catch (e) {} }
if (WBC) WBC.onmessage = async e => {
  const d = e.data || {}; if (d.job && d.from !== WIN && !app.jobs.some(x => x.id === d.job)) { const nj = await DB.get('jobs', d.job); if (nj) app.jobs.unshift(nj); }   // an assignment started in another window
  if (!app.job || d.from === WIN || d.job !== app.job.id) return;
  const j = await DB.get('jobs', app.job.id); if (!j) return;
  const i = app.jobs.findIndex(x => x.id === j.id); if (i >= 0) app.jobs[i] = j; else app.jobs.unshift(j); app.job = j;
  // keep what she is typing in this window: put it back after the redraw
  const a = document.activeElement; const dirty = a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.value !== a.defaultValue ? [FOCUS_KEYS.map(k => [k, a.getAttribute(k)]).find(x => x[1]), a.value] : null;
  render(); if (dirty && dirty[0]) { const el = document.querySelector(`[${dirty[0][0]}="${CSS.escape(dirty[0][1])}"]`); if (el) { el.value = dirty[1]; el.focus({ preventScroll: true }); } }
  else if (a && a.getAttribute) { const k = FOCUS_KEYS.map(k => [k, a.getAttribute(k)]).find(x => x[1]); if (k) { const el = document.querySelector(`[${k[0]}="${CSS.escape(k[1])}"]`); if (el) el.focus({ preventScroll: true }); } }
};
const wbLean = () => WB.on;
function wbSlice(all) {
  if (POP) return all.slice(POP.from - 1, POP.to);
  return all;   /* her note (Oct 20 2026): all comps stay in one grid; "comps on screen" sets how many fit across, the scroll bar (or ◀ ▶) slides to the rest */
}
/* size the comp columns so WB.per of them fill the grid box; the rest are reached with the side-to-side scroll bar */
function wbFit() {
  const t = document.querySelector('#gridCard table.grid'); if (!t) return; if (POP) { const h = t.querySelector('thead th'); if (h) t.style.setProperty('--labw', h.offsetWidth + 'px'); return; } const w = t.closest('.tablewrap');
  const ths = [...t.querySelectorAll('thead th')]; if (ths.length < 3) return;
  const n = ths.length - 2; t.style.setProperty('--labw', ths[0].offsetWidth + 'px');
  if (!WB.on || WB.per >= 99 || n <= WB.per) { ths.slice(2).forEach(h => { h.style.minWidth = ''; }); t.style.width = ''; return; }
  const fixed = ths[0].offsetWidth + ths[1].offsetWidth, cw = Math.max(document.body.classList.contains('sbs') ? 290 : 110, Math.floor((w.clientWidth - fixed) / WB.per));
  ths.slice(2).forEach(h => { h.style.minWidth = h.style.width = cw + 'px'; }); t.style.width = (fixed + cw * n) + 'px';
  wbPagerText();
}
function wbColW() { const h = document.querySelector('#gridCard table.grid thead th:nth-child(3)'); return h ? h.offsetWidth : 150; }
function wbScroll(d) { const w = document.querySelector('#gridCard .tablewrap'); if (w) w.scrollBy({ left: d * wbColW() * WB.per, behavior: 'smooth' }); }
function wbPagerText() {
  const w = document.querySelector('#gridCard .tablewrap'), el = document.querySelector('.wbbar .pager .pgtxt'); if (!w || !el) return;
  const n = document.querySelectorAll('#gridCard table.grid thead th').length - 2, cw = wbColW();
  const first = Math.min(n, Math.round(w.scrollLeft / cw) + 1), last = Math.min(n, first + WB.per - 1);
  el.textContent = `comps ${first}–${last} of ${n}`;
  const pb = document.querySelector('[data-act="wb-prev"]'), nb = document.querySelector('[data-act="wb-next"]');
  if (pb) pb.disabled = w.scrollLeft < 4; if (nb) nb.disabled = w.scrollLeft + w.clientWidth >= w.scrollWidth - 4;
  if (!w.dataset.pg) { w.dataset.pg = 1; w.addEventListener('scroll', () => wbPagerText(), { passive: true }); }
}
const WB_ROWS = row => !wbLean() || row[3] || ['price', 'prox', 'src', 'adu'].includes(row[0]) || !!GRID_INFO[row[0]] || row[0] === 'structure';   /* her listing lines and HOA facts show in Workbook view too */
const WB_NOEDIT = ['ppsf', 'src', 'prox', 'overList'];
/* a line's entry as text, for the subject or a comp (what "=" / "=2" copies) */
function wbFactText(id, F) {
  if (id === 'baths') return blank(F.full) ? '' : `${F.full}/${F.half || 0}`;
  if (id === 'beds') return blank(F.beds) ? '' : String(F.beds);
  if (id === 'usable') return blank(F.usable) ? '' : F.usable + ' ac';   // her rule: acres always show "ac"
  const v = F[id]; return blank(v) ? '' : String(v);
}
const WB_EDIT = { price: 'salePrice', sale: 'saleDate', contract: 'contractDate', conc: 'concessions', terms: 'financing', dom: 'dom', site: 'siteSf', topo: 'topo', nbhd: 'nbhd',
  land: 'landscaping', style: 'style', carport: 'carport', year: 'yearBuilt', gla: 'gla', bsmt: 'bsmtFin', garage: 'garage', energy: 'energy', porch: 'porch', other: 'other', rooms: 'rooms', attach: 'attach', status: 'status', listPrice: 'listPrice', origList: 'origList', listDate: 'listDate', lastRed: 'lastRed', redDays: 'redDays', cdom: 'cdom', project: 'project', hoa: 'hoa', hoaAmen: 'hoaAmen', landCommon: 'landCommon', structure: 'structure', unitPos: 'unitPos', floor: 'floor' };
/* write a typed (or copied) entry into the comp – her own values, kept apart from the sources like any edit */
function wbFactSet(J, c, id, text) {
  const E = c.edit = c.edit || {}; const t = String(text || '').trim(); const n = s => num(String(s).replace(/[$,\s]/g, ''));
  const put = (k, v) => { if (blank(v) || v === '') { delete E[k]; if (WB_ZAP) { c.zapK = c.zapK || {}; c.zapK[k] = true; } } else { E[k] = v; if (c.zapK) { delete c.zapK[k]; if (!Object.keys(c.zapK).length) delete c.zapK; } } };
  if (!WB_ZAP && t !== '' && c.zap) { delete c.zap[id]; if (!Object.keys(c.zap).length) delete c.zap; }
  switch (id) {
    case 'usable': put('usableSf', t === '' ? null : Math.round((n(t.replace(/ac(res?)?$/i, '')) || 0) * 43560)); return;
    case 'beds': put('beds', t === '' ? null : n(t)); put('bgBeds', t === '' ? null : 0); return;
    case 'baths': { const m = t.match(/(\d+)\D*(\d+)?/); put('full', m ? +m[1] : null); put('half', m ? (m[2] ? +m[2] : 0) : null); return; }
    case 'q': case 'c': { const L = id.toUpperCase(); const m = t.toUpperCase().match(new RegExp(L + '?\\s*([1-6])')); put(id === 'q' ? 'quality' : 'condition', m ? L + m[1] : (t ? t : null));
      const tier = /\+|high/i.test(t) ? 'high' : /-|low/i.test(t) ? 'low' : /mid/i.test(t) ? 'mid' : null; if (tier) { const G = G0(J); G.fine = G.fine || {}; G.fine[c.id] = G.fine[c.id] || {}; G.fine[c.id][id] = tier; } return; }
    case 'view': case 'loc': { const [a, ...b] = t.split(/:|\s–\s/); put(id === 'view' ? 'viewRating' : 'locRating', a ? a.trim() : null); put(id === 'view' ? 'viewTypes' : 'locFactors', b.join(':').trim() || null); if (id === 'view') put('viewRange', null); return; }
    case 'pool': put('pool', t === '' ? null : /pool/i.test(t) ? 'Yes' : 'No'); put('spa', t === '' ? null : /spa|hot ?tub|jacuzzi/i.test(t) ? 'Yes' : 'No'); return;
    case 'courts': put('tennis', t === '' ? null : /tennis/i.test(t) ? 'Yes' : 'No'); put('sport', t === '' ? null : /sport|pickleball|basketball/i.test(t) ? 'Yes' : 'No'); return;
    case 'adu': { const o = typeof obLiving === 'function' && obParse(t).items.length ? obLiving(t) : null; if (o) { put('adu', t); put('aduSf', o.sf); put('aduBaths', o.baths); return; }
      put('adu', t || null); const sf = t.match(/(\d[\d,]*)\s*(sf|sq)/i), ba = t.match(/(\d+(\.\d)?)\s*bath/i); put('aduSf', t === '' ? null : sf ? n(sf[1]) : (/^(no|none)$/i.test(t) ? 0 : null)); put('aduBaths', t === '' ? null : ba ? +ba[1] : 0); return; }
  }
  if (id === 'contract' || id === 'cdom') { if (/^\s*u(nk(nown)?)?\s*$/i.test(t)) { unkSet(J, c, id, 'unknown'); return; } if (t !== '') delete E[id === 'contract' ? 'contractUnknown' : 'cdomUnknown']; }   // her shortcut: U = Unknown
  if (id === 'conc') { if (/^\s*(no|none|n|0)\s*$/i.test(t)) { concSet(J, c, 'no'); return; } if (/unknown|^\s*y(es)?\s*$/i.test(t)) { concSet(J, c, 'unknown'); return; }
    if (t !== '' && n(t) !== null) { put('concessions', n(t)); put('concessionsYN', n(t) > 0 ? 'Yes' : 'No'); return; } }   // typed: No / 0, an amount, or Yes (amount unknown)
  if (id === 'stl') { const v = num(t.replace(/[^0-9.]/g, '')); put('grid_stl', t === '' || v === null ? null : +v.toFixed(1) + '%'); return; }   // a listing's anticipated ratio, e.g. 98%
  const k = WB_EDIT[id]; if (!k) { put('grid_' + id, t || null); return; }   // a line with no source field (Cooling, Functional utility, her own lines …): her entry
  const f = FIELD[k] || {}; put(k, t === '' ? null : ['int', 'num', 'money'].includes(f.t) || ['siteSf', 'yearBuilt', 'gla', 'bsmtFin', 'garage', 'salePrice', 'concessions', 'dom', 'cdom', 'listPrice', 'origList', 'hoa', 'redDays'].includes(k) ? n(t) : ['listDate', 'lastRed'].includes(k) ? (isoDate(t) || t) : t);
}
/* "=" and "=N" in a comp's cell */
function wbEquals(J, cid, rowId, v, isFact) {
  const c = J.comps.find(x => x.id === cid); if (!c) return false; const m = String(v).trim().match(/^=\s*(\d*)$/); if (!m) return false;
  const row = adjRows(J).find(r => r[0] === rowId); const G = G0(J);
  const src = m[1] ? usedComps(J).find(x => x.use === +m[1]) : null; if (m[1] && !src) { toast(`There is no comp ${m[1]} on the grid`); return true; }
  if (isFact) { const F = src ? compFacts(src, J) : subjFacts(J); let txt = wbFactText(rowId, F);
    /* her rule (Oct 20 2026): "=" copies the entry with its impact – view and location in the picker's form ("Neutral: Residential") */
    if (rowId === 'view' && txt) { const L = vwParse(txt); if (L.length) txt = vwText(L); }
    if (rowId === 'loc' && txt) { const L = siParse(txt); if (L.length) txt = siText(L); }
    wbFactSet(J, c, rowId, txt); c.edit = c.edit || {};
    if ((PICK[rowId] || rowId === 'view' || rowId === 'loc') && txt) c.edit['pk_' + rowId] = txt; else delete c.edit['pk_' + rowId];
    if (rowId === 'view') { const t = vtOf(J, src ? src.id : 'subj', src ? compFacts(src, J).view : F.view); if (t !== null && t !== undefined) { G.viewT = G.viewT || {}; G.viewT[c.id] = t; } }
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
  const was = c.use; markNotUsed(c); J.comps.forEach(x => { if (x.use && x.use > was) x.use--; }); app.nuAsk = c.id; app.nuAskShown = null;
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
  return `<div class="wbbar"><label class="chk" title="Like your 2.6 grid: each comp's $ adjustment in its own column beside the entry (fewer comps fit across – slide for the rest). SFREP gets the same 3.6 lines either way."><input type="checkbox" data-sbs="1" ${document.body.classList.contains('sbs') ? 'checked' : ''}> <b>Adjustment beside the entry</b></label> <label class="chk"><input type="checkbox" data-wbon="1" ${on ? 'checked' : ''}> <b>Workbook view</b> <small>only the lines you adjust · type comp facts in the grid</small></label>
    ${on ? `<label title="How many comps fit across the screen – all of them stay in the grid; slide to the others with the scroll bar at the bottom or ◀ ▶">Comps across <select data-wbper="1">${[3, 4, 5, 6, 9, 99].map(n => `<option value="${n}" ${n === per ? 'selected' : ''}>${n === 99 ? 'all' : n}</option>`).join('')}</select></label>
      ${per < 99 && pages > 1 ? `<span class="pager"><button class="btn sm" data-act="wb-prev" disabled title="Slide back">◀</button> <span class="pgtxt">comps 1–${Math.min(all.length, per)} of ${all.length}</span> <button class="btn sm" data-act="wb-next" title="Slide to the next comps">▶</button></span>` : ''}` : ''}
    <span class="grow"></span><span class="gview">View <select data-gview="1" title="How to look at the grid"><option value="page" ${document.body.classList.contains('gridbox') ? '' : 'selected'}>On the page</option><option value="box" ${document.body.classList.contains('gridbox') ? 'selected' : ''}>⤢ In its own box (two scroll bars)</option><option value="win:1|99">Own window – all comps</option>${pops.map(([a, b]) => `<option value="win:${a}|${b}">Own window – comps ${a}–${b}</option>`).join('')}</select></span>
    <span class="pops">Pop out <button class="btn sm primary" data-wbpop="1|99" title="All the comps side by side in their own window – the side-to-side scroll bar stays at the bottom of the window; scroll up and down with the mouse wheel">all comps</button> ${pops.map(([a, b]) => `<button class="btn sm" data-wbpop="${a}|${b}" title="Opens the grid for comps ${a}–${b} in its own window – drag it to another monitor">${a}–${b}</button>`).join('')}</span>
    ${(() => { const n = emptyLines(J).length, h = Object.keys(G0(J).hide || {}).length; return `<button class="btn sm" data-act="hide-empty" ${n ? '' : 'disabled'} title="Hides the optional lines with nothing in them for the subject or any comp – they stay saved (blank) and go to SFREP as before">Hide empty lines${n ? ' (' + n + ')' : ''}</button>${h ? `<button class="btn sm" data-act="show-hidden" title="Bring the hidden empty lines back">Show hidden (${h})</button>` : ''}`; })()}
    <button class="btn sm" data-act="wb-arrange">${app.wbArrange ? 'Close arrange' : 'Arrange'}</button></div>
    ${app.wbArrange ? `<div class="wbarr">${all.map((c, i) => `<div><b>#${c.use}</b> ${esc(compTitle(c))} <button class="btn sm" data-wbmv="${c.id}|${c.use - 1}" ${i ? '' : 'disabled'}>▲</button><button class="btn sm" data-wbmv="${c.id}|${c.use + 1}" ${i < all.length - 1 ? '' : 'disabled'}>▼</button> move to # <input class="txt xs" data-wbto="${c.id}" inputmode="numeric" placeholder="${c.use}"></div>`).join('')}</div>` : ''}
    ${on ? `<p class="help keys">Keys: <b>Tab</b> same line, next comp · <b>Enter</b> next line · <b>=</b> same as the subject (at once) · <b>=2</b> same as comp 2 · <b>Ctrl+Y</b> (in a box) empty the box · <b>Ctrl+Shift+2</b> swap this comp with comp 2 · <b>Ctrl+Z</b> take this comp off the grid (asks first).</p>` : ''}`;
}
function popHTML(J) {
  const all = usedComps(J); const L = all.slice(POP.from - 1, POP.to);
  const allc = POP.to >= 99; return `<header class="top pop"><h1>Comp Genie</h1><span class="pill">${esc(J.name)}</span><span class="pill">${allc ? `All ${all.length} comps` : `Comps ${POP.from}–${POP.to}`}</span><span class="grow"></span>
    ${allc ? '' : `<button class="btn sm" data-wbpage="-3">◀ ${Math.max(1, POP.from - 3)}–${Math.max(3, POP.to - 3)}</button><button class="btn sm" data-wbpage="3">${POP.from + 3}–${POP.to + 3} ▶</button>`}<small>stays in step with your other windows</small></header>
    <section class="card" id="gridCard">${L.length ? gridHTML(J) : `<p class="help">No comps ${POP.from}–${POP.to} on the grid yet.</p>`}</section>`;
}
/* where the cursor is: the comp of the focused cell, or the last one she was in */
const wbCellComp = el => { const d = el && el.closest && el.closest('[data-gadj],[data-gfact],[data-gfine]'); if (!d) return null; const v = d.dataset.gadj || d.dataset.gfact || d.dataset.gfine; return v.split('|')[0]; };
document.addEventListener('focusin', e => { const c = wbCellComp(e.target); if (c && c !== 'subj') WB.cur = c; if (c) wbMark(e.target); wbColTint(); });
/* her ask (Oct 20 2026): she keeps her place when she looks at the MLS on another monitor – the comp's whole column is tinted
   and the last box she was in keeps a dashed tangerine outline, even after the window loses focus */
let WB_LAST = null;
function wbMark(el) { const k = FOCUS_KEYS.map(k => [k, el.getAttribute && el.getAttribute(k)]).find(x => x[1]); if (!k) return; WB_LAST = k;
  document.querySelectorAll('.lastcell').forEach(x => x.classList.remove('lastcell')); el.classList.add('lastcell'); }
function wbColTint() { let st = document.getElementById('curcolcss'); if (!st) { st = document.createElement('style'); st.id = 'curcolcss'; document.head.appendChild(st); }
  const ths = [...document.querySelectorAll('#gridCard table.grid thead th')]; const i = WB.cur ? ths.findIndex(h => h.dataset.wbcol === WB.cur) : -1; ths.forEach(h => { if (h.dataset.wbcol) h.classList.toggle('cur', h.dataset.wbcol === WB.cur); });
  st.textContent = '';   /* her note (Oct 21 2026): no column highlight – only the pale yellow box she is in (look.css) and the comp's name marked in the header */
  if (WB_LAST) { const el = document.querySelector(`[${WB_LAST[0]}="${CSS.escape(WB_LAST[1])}"]`); if (el && !el.classList.contains('lastcell')) { document.querySelectorAll('.lastcell').forEach(x => x.classList.remove('lastcell')); el.classList.add('lastcell'); } } }
let WB_EQ = null, WB_ZAP = false;
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
    if (target) { e.preventDefault(); target.focus({ preventScroll: true }); wbReveal(target); try { target.select(); } catch (x) {} }   // leaving the cell saves it; the redraw keeps the new cell in focus
    return;
  }
  /* her keys inside a grid box (Oct 20 2026): Ctrl+Y empties the box (type the new entry; leave it empty and the source value comes back);
     "=" copies the subject at once – a number typed right after it (=2) copies that comp instead */
  /* her keys (Oct 20 2026, corrected): Ctrl+Y in a box empties the cell; Ctrl+Z takes the comp off (asks first) – in a box or not */
  if (cell && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); WB_EQ = null; const cid = cell.split('|')[0]; if (cid !== 'subj' && app.job.comps.some(x => x.id === cid && x.use)) wbRemoveAsk(app.job, cid); return; }
  if (!cell && t && t.dataset && t.dataset.gsubj && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'y') { e.preventDefault(); t.value = ''; t.dispatchEvent(new Event('change', { bubbles: true })); return; }   // the subject's box: empty it
  if (cell && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'y') { e.preventDefault(); WB_EQ = null;
    if (t.dataset.gfact) { const [cid, row] = t.dataset.gfact.split('|'); const c = app.job.comps.find(x => x.id === cid); if (!c) return;
      if (c.zap && c.zap[row] && t.value === '') { wbUnzap(c, row); toast('Back to your sources'); }   // Ctrl+Y again on an emptied box: the sources come back
      else { WB_ZAP = true; try { wbFactSet(app.job, c, row, ''); } finally { WB_ZAP = false; } c.zap = c.zap || {}; c.zap[row] = true; if (c.edit) delete c.edit['pk_' + row];
        toast('Emptied – type the new entry (Ctrl+Y again brings back your sources)'); }
      t.value = ''; t.defaultValue = ''; save(); renderKeepFocus(); return; }
    t.value = ''; t.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (cell && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === '=') {   // anywhere in the box, even with text in it

    e.preventDefault(); t.value = '='; WB_EQ = { cell, at: Date.now() }; t.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (WB_EQ && /^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && Date.now() - WB_EQ.at < 2500) {
    const el = document.querySelector(`[data-gadj="${CSS.escape(WB_EQ.cell)}"],[data-gfact="${CSS.escape(WB_EQ.cell)}"]`);
    if (el && (el === t || !inBox)) { e.preventDefault(); el.value = '=' + e.key; WB_EQ = null; el.dispatchEvent(new Event('change', { bubbles: true })); return; } }
  if (cell && e.key.length === 1) WB_EQ = null;
  if (e.ctrlKey && e.shiftKey && /^Digit[1-9]$/.test(e.code) && WB.cur) { e.preventDefault(); const n = +e.code.slice(5); if (wbSwap(app.job, WB.cur, n)) { save(); renderKeepFocus(); toast(`Swapped with comp ${n}`); } return; }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !inBox && WB.on && WB.cur && document.querySelector('#gridCard')) { e.preventDefault(); wbRemoveAsk(app.job, WB.cur); return; }
});

/* undo a Ctrl+Y empty: forget that line's emptied keys (found by a dry run on a blank copy) so the sources show again */
function wbUnzap(c, row) { if (c.zap) { delete c.zap[row]; if (!Object.keys(c.zap).length) delete c.zap; }
  const probe = { id: c.id, edit: {} }; WB_ZAP = true; try { wbFactSet(app.job, probe, row, ''); } finally { WB_ZAP = false; }
  for (const k in (probe.zapK || {})) if (c.zapK) delete c.zapK[k]; if (c.zapK && !Object.keys(c.zapK).length) delete c.zapK; }

/* bring a grid box fully into view inside the grid – clear of the line names and the Subject column that stay put on the left */
function wbReveal(el) { const w = el.closest('.tablewrap'); if (!w) { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; } const td = el.closest('td') || el;
  const W = w.getBoundingClientRect(), r = td.getBoundingClientRect(); const ths = w.querySelectorAll('thead th'); const fixed = (ths[0] ? ths[0].offsetWidth : 0) + (ths[1] ? ths[1].offsetWidth : 0); const head = w.querySelector('thead') ? w.querySelector('thead').offsetHeight : 0;
  if (r.left < W.left + fixed) w.scrollLeft -= (W.left + fixed - r.left) + 6; else if (r.right > W.right - 14) w.scrollLeft += (r.right - W.right) + 20;
  if (r.top < W.top + head) w.scrollTop -= (W.top + head - r.top) + 6; else if (r.bottom > W.bottom - 14) w.scrollTop += (r.bottom - W.bottom) + 20; }

/* View: the grid on the page, in its own box, or in its own window (her ask Oct 21 2026) */
function gridBox(on) { document.body.classList.toggle('gridbox', !!on); try { localStorage.setItem('genie-gridbox', on ? '1' : ''); } catch (e) {} if (typeof hbarSync === 'function') try { hbarSync(); } catch (e) {} }
document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('select[data-gview]'); if (!s) return; const v = s.value;
  if (v === 'page') gridBox(false); else if (v === 'box') gridBox(true);
  else if (v.startsWith('win:')) { gridBox(false); const b = document.createElement('button'); b.dataset.wbpop = v.slice(4); b.hidden = true; document.body.appendChild(b); b.click(); b.remove(); setTimeout(() => { s.value = 'page'; }, 50); } });
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-act="gbox-close"]')) { e.stopPropagation(); gridBox(false); const s = document.querySelector('select[data-gview]'); if (s) s.value = 'page'; } }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('gridbox') && !document.querySelector('.sheet-bg,.sheetbg')) gridBox(false); });
try { if (localStorage.getItem('genie-gridbox') === '1' && !(typeof POP !== 'undefined' && POP)) document.addEventListener('DOMContentLoaded', () => document.body.classList.add('gridbox')); } catch (e) {}
