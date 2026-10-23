/* =====================================================================
   Regression and "Adjustment methods compared" (her ask, Oct 22 2026 – after Jason's post).
   1. Regression: one multiple regression of the market-area sales (her archive + this job's MLS closed sales,
      the same sales the grouped-sales check uses, brought to the effective date by the segment's own time trend):
      price = constant + living area + usable lot + view tier + quality + condition + baths + pool + spa + courts
      + ADU sq ft + landscaping + garage. Each answer comes with how sure it is (t, 95% range) and whether the
      data are enough: too few sales, could be zero, or the wrong sign → red ✗ "Not enough data – do not use".
   2. Methods compared: for every adjustment line, each method's answer side by side (sensitivity, grouped sales,
      regression, matched pairs, depreciated cost as an upper limit) with a ✓ usable / ⚠ use with care /
      ✗ not enough data. She ticks the green ✓ on the one(s) she relies on; a ✗ cannot be ticked. When the usable
      answers are far apart it says so, and "Why do these disagree?" asks Claude (numbers only, no addresses;
      per the order's AI setting) for likely reasons and what to test next – Claude never picks the rate.
   3. Her ticks write the "how the adjustments were derived" paragraph of the sales comparison comment.
   It is support beside her rate – she decides every rate and the value.
   ===================================================================== */
const REG_VARS = [   // [field in the sales rows, rate key, label, rounding, should be positive?, yes/no feature?]
  ['gla', 'gla', 'Living area (per sq ft)', 5, true, false], ['usAc', 'usableAc', 'Usable lot area (per acre)', 5000, true, false], ['vt', 'viewStep', 'View (per tier)', 5000, true, false],
  ['q', 'qStep', 'Quality (per step)', 5000, true, false], ['c', 'cStep', 'Condition (per step)', 5000, true, false], ['full', 'bath', 'Full baths (each)', 500, true, false],
  ['pool', 'pool', 'Pool', 5000, true, true], ['spa', 'spa', 'Spa', 5000, true, true], ['tennis', 'tennis', 'Tennis court', 5000, true, true], ['sport', 'sport', 'Sport court', 5000, true, true],
  ['aduSf', 'aduSf', 'ADU / guest sq ft', 5, true, false], ['land', 'landStep', 'Landscaping (per step)', 5000, true, false], ['garage', 'space', 'Garage spaces (each)', 500, true, false]];
function matInv(A) { const n = A.length; const out = []; for (let i = 0; i < n; i++) { const e = Array(n).fill(0); e[i] = 1; const x = solveLin(A, e); if (!x) return null; out.push(x); } return out[0].map((_, r) => out.map(col => col[r])); }
function olsFit(rows, vars) {   // rows: {y, x:{}} → b, se, t, r2, n, p
  const n = rows.length, p = vars.length + 1; if (n <= p + 2) return null;
  const X = rows.map(r => [1, ...vars.map(v => +r[v])]), y = rows.map(r => r.adj);
  const XX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((t, row) => t + row[i] * row[j], 0)));
  const Xy = Array.from({ length: p }, (_, i) => X.reduce((t, row, k) => t + row[i] * y[k], 0));
  const sc = XX.map((r, i) => Math.sqrt(r[i]) || 1);   // scale for a steadier solve
  const XXs = XX.map((r, i) => r.map((v, j) => v / sc[i] / sc[j])), Xys = Xy.map((v, i) => v / sc[i]);
  const bs = solveLin(XXs, Xys); if (!bs) return null; const b = bs.map((v, i) => v / sc[i]);
  const fit = X.map(row => row.reduce((t, v, i) => t + v * b[i], 0)); const my = y.reduce((t, v) => t + v, 0) / n;
  const sse = y.reduce((t, v, i) => t + (v - fit[i]) ** 2, 0), sst = y.reduce((t, v) => t + (v - my) ** 2, 0);
  const inv = matInv(XXs); const s2 = sse / (n - p);
  const se = inv ? inv.map((r, i) => Math.sqrt(Math.max(0, r[i] * s2)) / sc[i]) : b.map(() => null);
  return { b, se, t: b.map((v, i) => se[i] ? v / se[i] : null), r2: sst ? 1 - sse / sst : null, adjR2: sst ? 1 - (sse / (n - p)) / (sst / (n - 1)) : null, n, p, sdRes: Math.sqrt(s2) };
}
function regRun(J) {
  const scope = J.regScope || 'all'; let { seg, rows } = tsSales(J); const res = { at: Date.now(), seg: seg && seg.name, lines: [], scope };
  if (scope === 'similar' && seg && ARCH.loaded) { const S = simSet(J); if (!S.err) rows = S.rows; }
  if (!seg) { res.err = 'Enter the subject address (and market area) first.'; return res; }
  if (!ARCH.loaded) { res.err = 'Load your comp archive first (top of the page).'; return res; }
  const tr = tsRates(tsFit(rows, 12)); const mo = tr ? (tr.m12 !== null ? tr.m12 : tr.m24) : null; res.timed = mo;
  rows.forEach(r => { r.adj = mo !== null ? r.price * Math.pow(1 + mo / 100, r.back) : r.price; });
  // keep a feature only when most sales have it on file and it varies; yes/no features need at least 5 sales that have it
  const cand = REG_VARS.filter(([f, , , , , yn]) => { const have = rows.filter(r => !blank(r[f])); if (have.length < rows.length * 0.8) return false; const vals = new Set(have.map(r => +r[f])); if (vals.size < 2) return false;
    if (yn && have.filter(r => +r[f] > 0).length < 5) { { const h = have.filter(r => +r[f] > 0).length; res.lines.push({ f, k: REG_VARS.find(v => v[0] === f)[1], thin: `only ${h} sale${h === 1 ? ' has' : 's have'} it (needs 5)` }); } return false; } return true; });
  REG_VARS.filter(v => !cand.includes(v) && !res.lines.some(l => l.f === v[0])).forEach(([f, k]) => res.lines.push({ f, k, thin: 'not on file for most sales, or every sale is the same' }));
  const vars = cand.map(v => v[0]); const use = rows.filter(r => vars.every(v => !blank(r[v])));
  res.n = use.length; res.vars = vars.length; res.need = Math.max(30, 10 * (vars.length + 1));
  const F = vars.length ? olsFit(use, vars) : null; if (!F) { res.err = `Not enough sales for a regression (${use.length}).`; return res; }
  Object.assign(res, { r2: F.r2, adjR2: F.adjR2, sdRes: F.sdRes, medPrice: medOf(use.map(r => r.adj)) });
  cand.forEach(([f, k, label, rnd, pos], i) => { const b = F.b[i + 1], se = F.se[i + 1], t = F.t[i + 1]; const R = v => v === null ? null : Math.round(v / rnd) * rnd;
    const L = { f, k, label, b: R(b), lo: se ? R(b - 1.96 * se) : null, hi: se ? R(b + 1.96 * se) : null, t: t === null ? null : Math.round(t * 10) / 10 };
    const cap = { pool: 0.1, spa: 0.05, tennis: 0.1, sport: 0.06, space: 0.03, bath: 0.06, landStep: 0.08 }[k]; const typ = medOf(use.map(r => r.adj));
    if (use.length < 5 * (vars.length + 1)) L.why = `only ${use.length} sales for ${vars.length} features (needs at least ${5 * (vars.length + 1)})`;
    else if (t === null || Math.abs(t) < 2) L.why = 'could be zero (its 95% range takes in zero)';
    else if (pos && b < 0) L.why = 'comes out negative – something else is mixed in';
    else if (se && Math.abs(se / b) > 0.35) L.care = 'wide 95% range';
    else if (cap && b > cap * typ) L.care = `over ${Math.round(cap * 100)}% of the typical price – likely also picks up size or setting`;
    else if (use.length < res.need) L.care = `${use.length} sales for ${vars.length} features (about ${res.need} is better)`;
    if (!L.why && F.adjR2 !== null && F.adjR2 < 0.5) L.why = `the regression explains only ${Math.round(F.adjR2 * 100)}% of the price differences`;
    else if (!L.why && !L.care && F.adjR2 !== null && F.adjR2 < 0.7) L.care = `the regression explains only ${Math.round(F.adjR2 * 100)}% of the price differences`;
    res.lines.push(L); });
  return res;
}

/* ---- every method's answer for each line ---- */
const METH = [['sens', 'Sensitivity (grid comps)'], ['ssen', 'Sensitivity (similar sales)'], ['grp', 'Grouped sales'], ['reg', 'Regression'], ['pair', 'Matched pairs'], ['cost', 'Depreciated cost (upper limit)']];
const METH_LINES = [['gla', 'Living area', 'per sq ft'], ['usableAc', 'Usable lot area', 'per acre'], ['viewStep', 'View', 'per tier'], ['qStep', 'Quality', 'per step'], ['cStep', 'Condition', 'per step'],
  ['bath', 'Full baths', 'each'], ['bed', 'Bedrooms', 'each'], ['space', 'Garage spaces', 'each'], ['pool', 'Pool', ''], ['spa', 'Spa', ''], ['tennis', 'Tennis court', ''], ['sport', 'Sport court', ''], ['aduSf', 'ADU / guest sq ft', 'per sq ft'], ['landStep', 'Landscaping', 'per step'], ['timePct', 'Sale date (time)', '% per month']];
const mf = (k, v) => v == null ? '–' : /Pct$/.test(k) ? (+v).toFixed(2).replace(/\.?0+$/, '') + '%' : v < 0 ? '−' + money(-v) : money(v);
function methData(J) { const out = {}; const put = (k, m, o) => { (out[k] = out[k] || {})[m] = o; };
  const S = J.sensSnap; if (S && S.lines) S.lines.forEach(L => { const k = { qTier: 'qStep', cTier: 'cStep' }[L.k] || L.k; if (/Pct$/.test(L.k) && L.k !== 'timePct') return;
    const bad = L.flat ? 'the comps do not tell this one (the range hardly changes)' : L.edge ? 'tightest at the end of the range tried' : L.moved < 3 ? `only ${L.moved} comps differ` : '';
    put(k, 'sens', { v: L.best, st: bad ? 'x' : 'ok', why: bad, note: `${L.moved} comps differ${L.band && L.band[0] < L.band[1] ? '; about as tight ' + mf(L.k, L.band[0]) + ' to ' + mf(L.k, L.band[1]) : ''}`, tier: L.k !== k }); });
  const SS = J.simSens; if (SS && SS.lines) SS.lines.forEach(L => { if (L.thin) return put(L.k, 'ssen', { st: 'x', why: `only ${L.moved} of the ${SS.n} similar sales differ on this (needs 5)` });
    const bad = L.flat ? 'the similar sales do not tell this one (the range hardly changes)' : L.edge ? 'tightest at the end of the range tried' : '';
    const cap = { pool: 0.1, spa: 0.05, tennis: 0.1, sport: 0.06, space: 0.03, bath: 0.06, landStep: 0.08 }[L.k]; const big = cap && SS.med && L.best > cap * SS.med ? `over ${Math.round(cap * 100)}% of the typical price` : '';
    put(L.k, 'ssen', { v: L.best, st: bad ? 'x' : L.moved < 8 || big ? 'care' : 'ok', why: bad || big || (L.moved < 8 ? `only ${L.moved} sales differ` : ''), note: `${L.moved} of ${SS.n} similar sales differ${L.band[0] < L.band[1] ? '; about as tight ' + mf(L.k, L.band[0]) + ' to ' + mf(L.k, L.band[1]) : ''}` }); });
  const G = J.support; if (G && G.lines) G.lines.forEach(L => { if (L.thin) return put(L.k, 'grp', { st: 'x', why: `${L.groups || 0} groups where sales differ (needs 3 groups and 12 sales)` });
    const bad = L.neg ? 'comes out negative' : L.wide ? 'the middle half runs from minus to plus' : ''; const care = L.big ? `over ${L.big}% of the typical price` : L.aduOver ? 'more per sq ft than the main house' : L.far ? 'far from your starting point' : L.groups < 6 ? 'only a few groups' : '';
    put(L.k, 'grp', { v: L.b, st: bad ? 'x' : care ? 'care' : 'ok', why: bad || care, note: `${L.n} sales, ${L.groups} groups; middle half ${mf(L.k, L.lo)} to ${mf(L.k, L.hi)}` }); });
  const R = J.regress; if (R && R.lines) R.lines.forEach(L => { if (L.thin) return put(L.k, 'reg', { st: 'x', why: L.thin });
    put(L.k, 'reg', { v: L.b, st: L.why ? 'x' : L.care ? 'care' : 'ok', why: L.why || L.care || '', note: `${R.n} sales; 95% range ${mf(L.k, L.lo)} to ${mf(L.k, L.hi)}; t ${L.t}` }); });
  try { const P = matchedPairs(J); const by = {}; P.forEach(x => { const k = { gla: 'gla', full: 'bath', garage: 'space', pool: 'pool', q: 'qStep', c: 'cStep' }[x.k]; if (k && x.per !== null) (by[k] = by[k] || []).push(x.per); });
    Object.entries(by).forEach(([k, a]) => { const m = medOf(a), agree = a.every(v => v > 0) && Math.max(...a) <= Math.min(...a) * 1.3;
      put(k, 'pair', { v: Math.round(m), st: a.length >= 2 && agree ? 'ok' : a.some(v => v <= 0) ? 'x' : 'care', why: a.some(v => v <= 0) ? 'a pair points the wrong way' : a.length < 2 ? 'one pair – a clue, not proof' : !agree ? 'the pairs do not agree' : '', note: `${a.length} pair${a.length > 1 ? 's' : ''}` }); }); } catch (e) {}
  try { const C = costCheck(J); C.rows.forEach(r => { if (['gla', 'space', 'pool', 'landStep', 'aduSf'].includes(r.k)) put(r.k, 'cost', { v: r.d, st: 'limit', why: 'an upper limit, not a market rate', note: r.src }); }); } catch (e) {}
  return out; }
function methGap(D) { const v = Object.entries(D || {}).filter(([m, o]) => m !== 'cost' && o.st !== 'x' && o.v != null).map(([, o]) => o.v); if (v.length < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v); if (lo <= 0) return { lo, hi, pct: null }; const pct = Math.round((hi / lo - 1) * 100); return pct > 35 ? { lo, hi, pct } : null; }
const methPick = J => (J.adjPick = J.adjPick || {});
function methHTML(J) {
  const G = G0(J); const D = methData(J); const P = methPick(J); const R = J.regress;
  const any = Object.keys(D).length; const fmt = (k, v) => v == null ? '–' : k === 'timePct' ? (+v).toFixed(2) + '%' : v < 0 ? '−' + money(-v) : money(v);
  const icon = st => st === 'x' ? '<span class="mx" title="Not enough data – do not use">✗</span>' : st === 'care' ? '<span class="mc" title="Use with care">⚠</span>' : st === 'limit' ? '<span class="ml" title="Upper limit">⤒</span>' : '<span class="mo" title="Enough data">●</span>';
  const lines = METH_LINES.filter(([k]) => D[k] || !blank(G.rates[k]));
  const head = `<h2>Adjustment methods compared <small>every method's answer, side by side – you pick</small></h2>
    <p class="help">Run <b>Sensitivity</b> (on the grid), <b>Find support for my lines</b> (grouped sales) and <b>Run the regression</b> below, then come back here. Each answer shows <span class="mo">●</span> enough data, <span class="mc">⚠</span> use with care, or <span class="mx">✗</span> <b>not enough data – do not use</b>. Tick the green <b>✓</b> on the method(s) you rely on for each line; your ticks write the “how the adjustments were derived” paragraph of your sales comparison comment. Nothing changes your rates.</p>
    <div class="row"><button class="btn${R ? '' : ' primary'}" data-act="reg-run">${R ? 'Run the regression again' : 'Run the regression'}</button>${R && !R.err ? `<small>${R.n} sales in ${esc(R.seg || '')} · ${R.vars} features · R² ${R.r2 != null ? R.r2.toFixed(2) : '–'} (adjusted ${R.adjR2 != null ? R.adjR2.toFixed(2) : '–'}) · typical miss ${money(Math.round(R.sdRes / 1000) * 1000)}${R.n < R.need ? ` · <span class="warnTxt">needs about ${R.need} sales for ${R.vars} features – answers are marked ✗</span>` : ''}</small>` : R && R.err ? `<small class="warnTxt">${esc(R.err)}</small>` : ''}
    ${J.sensSnap ? '' : '<small class="warnTxt">Sensitivity not run yet for this assignment</small>'}</div>
    <div class="row simrow"><button class="btn${J.simSens ? '' : ' primary'}" data-act="sim-run">${J.simSens ? 'Run similar-sales sensitivity again' : 'Run sensitivity on similar sales'}</button>
      <label class="inl small">sold within <select data-simo="months">${[12, 24, 36, 48, 72].map(m => `<option value="${m}" ${simOpts(J).months === m ? 'selected' : ''}>${m} months</option>`).join('')}</select></label>
      <label class="inl small">living area ± <select data-simo="glaPct">${[20, 25, 35, 50].map(m => `<option value="${m}" ${simOpts(J).glaPct === m ? 'selected' : ''}>${m}%</option>`).join('')}</select></label>
      <label class="inl small">Regression on <select data-regscope>${[['all', 'all market-area sales'], ['similar', 'the similar sales only']].map(([v, l]) => `<option value="${v}" ${(J.regScope || 'all') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${J.simSens ? (J.simSens.err ? `<small class="warnTxt">${esc(J.simSens.err)}</small>` : `<small>${J.simSens.n} similar sales of ${J.simSens.all} in the market area (view within one tier, quality within one step, usable lot half to double)</small>`) : ''}</div>`;
  if (!any && !lines.length) return head;
  const rows = lines.map(([k, label, unit]) => { const d = D[k] || {}; const gap = methGap(d); const picked = P[k] || [];
    const cell = m => { const o = d[m]; if (!o) return '<td class="mcell"><small class="muted">–</small></td>'; const on = picked.includes(m);
      return `<td class="mcell ${o.st === 'x' ? 'mbad' : ''} ${on ? 'mon' : ''}">${icon(o.st)} <b>${o.v != null ? fmt(k, o.v) : ''}</b>${o.why ? `<br><small class="${o.st === 'x' ? 'warnTxt' : ''}">${o.st === 'x' ? 'Not enough data – do not use: ' : ''}${esc(o.why)}</small>` : ''}${o.note ? `<br><small class="muted">${esc(o.note)}</small>` : ''}
        ${o.st === 'x' ? '' : `<br><label class="mpick"><input type="checkbox" data-mpick="${k}|${m}" ${on ? 'checked' : ''}> <span>✓</span> I rely on this</label>`}</td>`; };
    return `<tr><th>${esc(label)}<br><small>${esc(unit)}</small></th><td>${fmt(k, G.rates[k])}${G.rateFrom && G.rateFrom[k] ? `<br><small class="muted">${esc(G.rateFrom[k])}</small>` : ''}</td>${METH.map(([m]) => cell(m)).join('')}
      <td>${gap ? `<small class="warnTxt">${gap.pct === null ? 'The methods point different ways.' : `The usable answers are ${gap.pct}% apart (${fmt(k, gap.lo)} to ${fmt(k, gap.hi)}).`}</small><br><button class="btn sm" data-mwhy="${k}">Why do these disagree?</button>` : ''}</td></tr>
      <tr class="mwhyrow" ${app.mwhy && app.mwhy.k === k && app.mwhy.job === J.id ? '' : 'hidden'}><td colspan="${METH.length + 3}"><div class="mwhy">${app.mwhy && app.mwhy.k === k ? app.mwhy.html : ''}</div></td></tr>`; }).join('');
  return head + `<div class="tablewrap"><table class="ts meth"><thead><tr><th>Line</th><th>Your rate</th>${METH.map(([, l]) => `<th>${esc(l)}</th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="help">Regression uses every sale in the market area at once; sensitivity uses only your comps; grouped sales compare similar houses with and without the feature; matched pairs are two sales alike in all but one thing; cost is what the feature costs new less depreciation – buyers rarely pay more than that. Different answers are normal. When they are far apart, look for something the sales share that is not on the grid (the bigger houses also have the better views, newer kitchens, larger lots…).</p>`;
}
/* her green ticks → the derivation paragraph for the sales comparison comment */
const METH_SAY = { ssen: 'sensitivity analysis of similar market-area sales', sens: 'sensitivity analysis of the comparable sales', grp: 'grouped-sales analysis of similar market-area properties with and without the feature', reg: 'multiple regression of the market area sales', pair: 'matched paired sales', cost: 'the depreciated cost of the feature, as an upper limit' };
function methDerivation(J) { const G = G0(J), P = methPick(J), D = methData(J), R = J.regress; const set = k => !blank(G.rates[k]) && num(G.rates[k]);
  const fmt = (k, v) => k === 'timePct' ? (+v) + '% per month' : money(v); const out = [], none = [];
  METH_LINES.forEach(([k, label, unit]) => { if (!set(k)) return; const ms = (P[k] || []).filter(m => D[k] && D[k][m] && D[k][m].st !== 'x');
    if (!ms.length) { none.push(label.toLowerCase()); return; }
    const det = m => { const o = D[k][m]; return m === 'reg' && R ? `${METH_SAY.reg} (${R.n} sales, indicating ${fmt(k, o.v)}${unit && k !== 'timePct' ? ' ' + unit : ''})` : m === 'grp' && J.support ? `${METH_SAY.grp} (${J.support.n} sales, indicating ${fmt(k, o.v)})` : m === 'sens' ? `${METH_SAY.sens} (the rate that brought the adjusted sale prices of the ${J.sensSnap && J.sensSnap.n ? J.sensSnap.n + ' ' : ''}comparables closest together)` : m === 'ssen' && J.simSens ? `${METH_SAY.ssen} (${J.simSens.n} sales within ${J.simSens.o.months} months and ±${J.simSens.o.glaPct}% of the subject's living area, indicating ${fmt(k, o.v)})` : m === 'pair' ? `${METH_SAY.pair} (${o.note})` : `${METH_SAY[m]} (${fmt(k, o.v)})`; };
    out.push(`${label} (${fmt(k, G.rates[k])}${unit && k !== 'timePct' ? ' ' + unit : ''}): derived from ${ms.map(det).join(', supported by ')}.`); });
  if (!out.length && !none.length) return '';
  let t = 'HOW THE ADJUSTMENTS WERE DERIVED\n\n' + (out.length ? 'The adjustments were derived from the market data as follows. ' + out.join(' ') : '');
  if (none.length) t += `${out.length ? ' ' : ''}The ${none.join(', ')} adjustment${none.length > 1 ? 's were' : ' was'} [say how – the sales did not give a reliable measured indication; e.g. based on the appraiser's knowledge of buyer reaction in this market].`;
  t += ' Each method was tested; methods without enough data to be reliable were not used.';
  return t; }
/* "Why do these disagree?" – numbers only, per the order's AI setting; Claude explains and suggests tests, never picks the rate */
async function methWhy(J, k) {
  const show = h => { app.mwhy = { job: J.id, k, html: h }; const sc = document.getElementById('supCard'); if (sc) sc.innerHTML = supHTML(J); };
  let mode = ''; try { const o = typeof orderOf === 'function' ? orderOf(J) : null; mode = (o && o.aiUse) || ''; } catch (e) {}
  if (mode === 'No') return show('<p class="warnTxt">This order is set to <b>No AI</b>, so nothing is sent. Change the order’s AI use to Yes or Redacted to ask Claude.</p>');
  if (!hwKey()) return show('<p class="warnTxt">No Claude key is saved on this computer. Add it in the Octopus › Standard wording › AI settings.</p>');
  if (navigator.onLine === false) return show('<p class="warnTxt">No internet – try again when you are online.</p>');
  const L = METH_LINES.find(x => x[0] === k); const D = methData(J)[k] || {}; const S = subjFacts(J);
  const comps = usedComps(J).map(c => { const F = compFacts(c, J); return { comp: c.use, price: F.price, saleMonth: String(F.sale || '').slice(0, 7), livingSf: F.gla, siteSf: F.site, usableAc: F.usableAc, quality: F.q, condition: F.c, view: F.view, yearBuilt: F.year, fullBaths: F.full, garage: F.garage, pool: F.pool, adu: F.adu ? 'yes' : '' }; });
  const facts = { line: L ? L[1] + ' ' + L[2] : k, yourRate: G0(J).rates[k], methods: Object.fromEntries(Object.entries(D).map(([m, o]) => [METH.find(x => x[0] === m)[1], { answer: o.v, status: o.st === 'x' ? 'not enough data' : o.st === 'care' ? 'use with care' : o.st === 'limit' ? 'upper limit' : 'enough data', why: o.why, detail: o.note }])),
    subject: { livingSf: S.gla, siteSf: S.site, usableAc: S.usableAc, quality: S.q, condition: S.c, view: S.view, yearBuilt: S.year }, compsOnGrid: comps,
    regression: J.regress && !J.regress.err ? { sales: J.regress.n, features: J.regress.vars, r2: J.regress.r2 } : null, groupedSales: J.support && !J.support.err ? { sales: J.support.n } : null };
  show('<p>Claude is looking at the numbers…</p>');
  const sys = `You help a certified residential appraiser understand why different adjustment-support methods give different answers for one adjustment line. You get only numbers (no addresses or names). Explain in plain words, briefly: the most likely reasons the answers differ (e.g. features that move together with this one in the sales – bigger houses with better views or newer finishes; few comps differing on the line; outliers; time; a non-linear effect such as diminishing value per extra sq ft; group effects), which answer the data seem to support better and why, and 2–4 specific further tests she can run with her own data. Do NOT choose or recommend a final adjustment rate and do not give a value opinion – she decides. No biased wording. Reply with JSON only: {"reasons": ["…"], "stronger": "…", "tests": ["…"]}`;
  try { const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': hwKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: hwModel(), max_tokens: 1500, system: sys, messages: [{ role: 'user', content: JSON.stringify(facts) }] }) });
    const j = await res.json(); if (!res.ok) throw new Error((j.error && j.error.message) || 'error ' + res.status);
    const txt = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''); const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    show(`<b>Why the answers may differ</b><ul>${(o.reasons || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>${o.stronger ? `<p><b>Which the data seem to support:</b> ${esc(o.stronger)}</p>` : ''}${(o.tests || []).length ? `<b>Tests you could run</b><ul>${o.tests.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<p class="help">Claude's reading of the numbers only – you pick the method and the rate. <button class="btn sm" data-mwhyclose="1">Close</button></p>`);
  } catch (e) { show(`<p class="warnTxt">Claude could not answer: ${esc(e.message || String(e))}</p>`); } }
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || !app.job) return;
  if (t.dataset.simo) { app.job.simOpts = { ...simOpts(app.job), [t.dataset.simo]: +t.value }; save(); toast('Click Run sensitivity on similar sales to use the new range'); return; }
  if (t.matches && t.matches('[data-regscope]')) { app.job.regScope = t.value; save(); toast('Click Run the regression again'); return; } });
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || !t.dataset.mpick || !app.job) return; const [k, m] = t.dataset.mpick.split('|'); const P = methPick(app.job);
  const a = new Set(P[k] || []); t.checked ? a.add(m) : a.delete(m); P[k] = [...a]; if (!P[k].length) delete P[k]; save(); const sc = document.getElementById('supCard'); if (sc) sc.innerHTML = supHTML(app.job); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-mwhy],[data-mwhyclose]'); if (!b || !app.job) return;
  if (b.dataset.mwhyclose) { app.mwhy = null; const sc = document.getElementById('supCard'); if (sc) sc.innerHTML = supHTML(app.job); return; }
  methWhy(app.job, b.dataset.mwhy); });

/* ---- her follow-up (Oct 22 2026): "Could the checks run off a larger or older dataset, not just what I put on the grid?
   Probably not the whole market – the range of values and features is too wide."  So: a SIMILAR-SALES set from her
   market-area sales (archive + this job's MLS search, brought to the effective date): sold within N months, living area
   within ±P% of the subject, view within one tier, quality within one step, usable lot within half to double.
   Sensitivity is run on that set (every sale adjusted to the subject with her rates, one line at a time), and the
   regression can be run on that set instead of the whole market area. ---- */
const SIM_DEF = { months: 36, glaPct: 35 };
const simOpts = J => ({ ...SIM_DEF, ...(J.simOpts || {}) });
function simSubject(J) { const S = subjFacts(J); const A = aduNums(S);
  return { gla: num(S.gla), usAc: blank(S.usable) ? null : +S.usable, vt: viewTier(S.view), q: S.q ? ratingPos(S.q, fineOf(J, 'subj', 'q')) : null, c: S.c ? ratingPos(S.c, fineOf(J, 'subj', 'c')) : null,
    full: num(S.full), pool: hasFeat(S, 'pool'), spa: hasFeat(S, 'spa'), tennis: hasFeat(S, 'tennis'), sport: hasFeat(S, 'sport'), aduSf: A ? A.sf : null, land: goodness('land', S), garage: num(S.garage) }; }
function simSet(J) { const { seg, rows } = tsSales(J); const o = simOpts(J); const sj = simSubject(J); if (!seg) return { err: 'Enter the subject address (and market area) first.' }; if (!ARCH.loaded) return { err: 'Load your comp archive first (top of the page).' };
  if (!sj.gla) return { err: 'The subject needs its living area first.' };
  const tr = tsRates(tsFit(rows, 12)); const mo = tr ? (tr.m12 !== null ? tr.m12 : tr.m24) : null; rows.forEach(r => { r.adj = mo !== null ? r.price * Math.pow(1 + mo / 100, r.back) : r.price; });
  const keep = rows.filter(r => r.back <= o.months && r.gla && Math.abs(r.gla - sj.gla) / sj.gla <= o.glaPct / 100 && (sj.vt == null || r.vt == null || Math.abs(r.vt - sj.vt) <= 1) && (sj.q == null || r.q == null || Math.abs(r.q - sj.q) <= 1.01)
    && (sj.usAc == null || r.usAc == null || (r.usAc >= sj.usAc / 2 && r.usAc <= sj.usAc * 2)));
  return { seg, rows: keep, sj, timed: mo, o, all: rows.length }; }
const SIM_LINES = [['gla', 'gla'], ['usableAc', 'usAc'], ['viewStep', 'vt'], ['qStep', 'q'], ['cStep', 'c'], ['bath', 'full'], ['pool', 'pool'], ['spa', 'spa'], ['tennis', 'tennis'], ['sport', 'sport'], ['aduSf', 'aduSf'], ['landStep', 'land'], ['space', 'garage']];
function simRate(J, k, P) { const R = G0(J).rates; const pk = { viewStep: 'viewPct', qStep: 'qPct', cStep: 'cPct' }[k]; if (!blank(R[k])) return num(R[k]) || 0; if (pk && !blank(R[pk])) return (num(R[pk]) || 0) / 100 * P; return 0; }
function simSensRun(J) { const S = simSet(J); const res = { at: Date.now(), lines: [] }; if (S.err) { res.err = S.err; return res; }
  const rows = S.rows, sj = S.sj; res.n = rows.length; res.all = S.all; res.o = S.o; if (rows.length < 8) { res.err = `Only ${rows.length} similar sales – widen the months or the size range.`; return res; }
  const P = medOf(rows.map(r => r.adj)); const ppsf = medOf(rows.filter(r => r.gla).map(r => r.adj / r.gla));
  const diff = (r, f) => (blank(sj[f]) || blank(r[f])) ? 0 : (+sj[f]) - (+r[f]);
  const base = rows.map(r => r.adj + SIM_LINES.reduce((t, [k, f]) => t + simRate(J, k, P) * diff(r, f), 0));
  res.sd0 = sdOf(base); res.med = P;
  SIM_LINES.forEach(([k, f]) => { const moved = rows.filter(r => diff(r, f) !== 0).length; if (moved < 5) { res.lines.push({ k, moved, thin: true }); return; }
    const cur = simRate(J, k, P); const test = sensRange(k, J, P, ppsf);
    const curve = test.map(v => { const adj = rows.map((r, i) => base[i] - cur * diff(r, f) + v * diff(r, f)); return { v, sd: sdOf(adj) }; });
    const best = curve.reduce((b, x) => x.sd < b.sd - 1e-6 ? x : b, curve[0]); const sdMax = Math.max(...curve.map(x => x.sd));
    const near = curve.filter(x => x.sd <= best.sd * 1.05 + P * 0.0005).map(x => x.v);
    res.lines.push({ k, moved, best: best.v, flat: (sdMax - best.sd) / P < 0.005, edge: best.v === test[0] || best.v === test[test.length - 1], band: [Math.min(...near), Math.max(...near)] }); });
  return res; }
