/* =====================================================================
   Grouped-sales support for the other grid lines (Oct 2026).
   Her comparability groups again (usable lot band, view tier, before / after
   1945, quality, finished area band), sales brought to today with the
   segment's own time index.  For each line, the group dimension for that
   feature is left out of the group, and the value of the feature is measured
   only from differences INSIDE a group (sales compared with their own group's
   average), with living area held level.  So a pool is measured against
   similar houses without one, not against the market as a whole.
   It is support beside her rate – she decides.  Bedrooms: her call per job.
   ===================================================================== */
const SUP_LINES = [
  // [rate key, label, feature, group dimension left out, hold living area level?, unit rounding]
  ['gla', 'Living area', 'gla', 'area', false, 5],
  ['usableAc', 'Usable lot area', 'usAc', 'lot', true, 5000],
  ['viewStep', 'View (per tier)', 'vt', 'vt', true, 5000],
  ['qStep', 'Quality (per step)', 'q', 'q', true, 5000],
  ['cStep', 'Condition (per step)', 'c', null, true, 5000],
  ['bath', 'Full baths', 'full', null, true, 500],
  ['pool', 'Pool', 'pool', null, true, 5000],
  ['spa', 'Spa', 'spa', null, true, 5000],
  ['tennis', 'Tennis court', 'tennis', null, true, 5000],
  ['sport', 'Sport court', 'sport', null, true, 5000],
  ['aduSf', 'ADU / guest sq ft', 'aduSf', null, true, 5],
  ['landStep', 'Landscaping (per step)', 'land', null, true, 5000],
  ['space', 'Garage spaces', 'garage', null, true, 500],
];
const SUP_PCT = { viewStep: 'viewPct', qStep: 'qPct', cStep: 'cPct' };
const SUP_COV = ['gla', 'usAc', 'vt', 'q', 'c', 'full', 'pool', 'spa', 'tennis', 'sport', 'garage'];   // held level together, so one feature does not borrow another's value
function solveLin(A, b) { const n = b.length; A = A.map(r => [...r]); b = [...b];
  for (let c = 0; c < n; c++) { let pv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[pv][c])) pv = r; [A[c], A[pv]] = [A[pv], A[c]]; [b[c], b[pv]] = [b[pv], b[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null; for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let t = b[i]; for (let k = i + 1; k < n; k++) t -= A[i][k] * x[k]; x[i] = t / A[i][i]; } return x; }
function supSolve(rows, xk, drop) {   // within-group least squares: price ~ group + this feature + the other features held level
  const keyOf = r => ['lot', 'vt', 'age', 'q', 'area'].filter(d => d !== drop).map(d => r.dims[d]).join('|');
  const cov = [xk, ...SUP_COV.filter(c => c !== xk)]; const use = rows.filter(r => cov.every(c => !blank(r[c])));
  const by = new Map(); use.forEach(r => { const k = keyOf(r); if (!by.has(k)) by.set(k, []); by.get(k).push(r); });
  const m = cov.length; const XX = Array.from({ length: m }, () => Array(m).fill(0)), Xy = Array(m).fill(0); let n = 0, gv = 0;
  by.forEach(L => { if (L.length < 2) return; const mu = cov.map(c => L.reduce((t, r) => t + +r[c], 0) / L.length), my = L.reduce((t, r) => t + r.adj, 0) / L.length;
    let vx = 0; L.forEach(r => { const x = cov.map((c, i) => +r[c] - mu[i]), y = r.adj - my; vx += x[0] * x[0]; n++;
      for (let i = 0; i < m; i++) { Xy[i] += x[i] * y; for (let j = 0; j < m; j++) XX[i][j] += x[i] * x[j]; } });
    if (vx > 1e-9) gv++; });
  if (!XX[0][0]) return { n, gv, b: null };
  // a feature that never varies inside a group cannot be measured: leave it out of the solve
  const keep = [...Array(m).keys()].filter(i => XX[i][i] > 1e-9 * (1 + XX[0][0]));
  const x = solveLin(keep.map(i => keep.map(j => XX[i][j] + (i === j ? XX[i][i] * 1e-9 : 0))), keep.map(i => Xy[i]));
  return { n, gv, b: x ? x[0] : null };
}
function supRun(J) {
  const { seg, rows, skipped, job } = tsSales(J); const res = { at: Date.now(), seg: seg && seg.name, n: rows.length, job, lines: [] };
  if (!seg) { res.err = 'Enter the subject address (and neighborhood) first.'; return res; }
  if (!ARCH.loaded) { res.err = 'Load your comp archive first (top of the page).'; return res; }
  const tr = tsRates(tsFit(rows, 12)); const mo = tr ? (tr.m12 !== null ? tr.m12 : tr.m24) : null;
  rows.forEach(r => { r.adj = mo !== null ? r.price * Math.pow(1 + mo / 100, r.back) : r.price; });   // brought to the effective date with the segment's measured rate
  res.timed = mo; res.covN = rows.filter(r => SUP_COV.every(c => !blank(r[c]))).length;
  const P = (() => { const s = rows.map(r => r.adj).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; })(); res.medPrice = P;
  const st = startsFor(J).rates;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  SUP_LINES.forEach(([k, label, xk, drop, hold, rnd0]) => {
    const r0 = supSolve(rows, xk, drop); const line = { k, label, n: r0.n, groups: r0.gv, b: null };
    if (r0.b === null || r0.gv < 3 || r0.n < 12) { line.thin = true; res.lines.push(line); return; }
    const bs = []; for (let i = 0; i < 60; i++) { const s = rows.map(() => rows[Math.floor(rnd() * rows.length)]); const x = supSolve(s, xk, drop); if (x.b !== null && x.gv >= 3) bs.push(x.b); }
    bs.sort((a, b) => a - b); const q = p => bs.length ? bs[Math.floor(p * (bs.length - 1))] : null;
    const R = v => v === null ? null : Math.round(v / rnd0) * rnd0;
    Object.assign(line, { b: R(r0.b), lo: R(q(0.25)), hi: R(q(0.75)), neg: r0.b < 0, wide: bs.length >= 30 && q(0.25) < 0 && q(0.75) > 0 });
    if (SUP_PCT[k] && P) line.pct = Math.round(r0.b / P * 1000) / 10;
    const cap = { pool: 0.1, spa: 0.05, tennis: 0.1, sport: 0.06, space: 0.03, bath: 0.06, landStep: 0.08 }[k];
    if (cap && P && r0.b > cap * P) line.big = Math.round(cap * 100);
    if (k === 'aduSf') { const g = res.lines.find(x => x.k === 'gla'); if (g && g.b > 0 && r0.b > g.b * 1.25) line.aduOver = g.b; }
    const sp = num(st[k]); if (sp && r0.b > 0 && (r0.b > 2 * sp || r0.b < sp / 2)) line.far = sp;
    res.lines.push(line);
  });
  return res;
}
function supHTML(J) {
  const T = J.support; const G = G0(J);
  const head = `<h2>Grouped-sales support <small>for the other lines</small></h2>
    <p class="help">Your groups again (usable lot band, view tier, before / after 1945, quality, finished area band), with every sale brought to today by the segment's own time trend. For each line I leave that feature out of the group and measure it only from differences <i>inside</i> a group, with the other features held level at the same time (living area, usable lot, view, quality, condition, baths, pool, spa, courts, garage) – so a pool is measured against similar houses without one, and is not credited with the extra size that pool houses tend to have. Uses your archive plus the closed sales from this job's MLS search. You pick the rate; bedrooms stay your call.</p>
    <div class="row"><button class="btn primary" data-act="sup-run">${T ? 'Run it again' : 'Find support for my lines'}</button>${T ? `<small>Run ${esc(new Date(T.at).toLocaleString())} · ${T.n} sales in ${esc(T.seg || '')}${T.job && T.job.n ? ` (${T.job.n} from this job)` : ''}${T.timed !== null && T.timed !== undefined ? ` · prices brought to the effective date at ${pct(T.timed)} / month` : ' · not enough sales to measure time, so prices were not brought to the effective date'}</small>` : ''}</div>`;
  if (!T) return head; if (T.err) return head + `<p class="warn">${esc(T.err)}</p>`;
  const fmt = (k, v) => v === null || v === undefined ? '–' : v < 0 ? '−' + money(-v) : money(v);
  const rows = T.lines.map(L => {
    const cur = G.rates[L.k], curP = SUP_PCT[L.k] ? G.rates[SUP_PCT[L.k]] : undefined;
    const yours = !blank(cur) ? fmt(L.k, cur) : !blank(curP) ? curP + '%' : '–';
    if (L.thin) return `<tr><th>${esc(L.label)}</th><td>${yours}</td><td colspan="2"><small>Not enough – ${L.groups} group${L.groups === 1 ? '' : 's'} where sales differ on this (needs 3 groups and 12 sales).</small></td><td></td></tr>`;
    const warn = L.neg ? 'Comes out negative – the groups do not support this line (too few, or something else is mixed in).' : L.wide ? 'The middle half runs from minus to plus – weak support.' : L.big ? `More than ${L.big}% of the typical price – too large to be this feature alone; the few sales that have it likely differ in other ways not on file (estate size, setting).` : L.aduOver ? `More per sq ft than the main house (${money(L.aduOver)}) – the ADU sales likely carry other value; use with care.` : L.far ? `Far from your starting point (${money(L.far)}) – the groups may be mixing in other differences; lean on sensitivity and your experience.` : L.groups < 6 ? 'Only a few groups – use with care.' : '';
    const use = L.neg ? '' : `<button class="btn sm" data-supuse="${L.k}" data-v="${L.b}">Use ${fmt(L.k, L.b)}</button>${L.pct !== undefined ? ` <button class="btn sm" data-supuse="${SUP_PCT[L.k]}" data-v="${L.pct}">Use ${L.pct}%</button>` : ''}`;
    return `<tr><th>${esc(L.label)}<br><small>${esc(RATES[L.k] ? RATES[L.k][0] : '')}</small></th><td>${yours}</td><td><b>${fmt(L.k, L.b)}</b>${L.pct !== undefined ? ` <small>(${L.pct}% of the typical price)</small>` : ''}<br><small>middle half ${fmt(L.k, L.lo)} to ${fmt(L.k, L.hi)}</small></td>
      <td><small>${L.n} sales · ${L.groups} groups where sales differ</small></td><td>${warn ? `<small class="warn">${esc(warn)}</small><br>` : ''}${use}</td></tr>`; }).join('');
  return head + `<div class="tablewrap"><table class="ts sup"><thead><tr><th>Line</th><th>Your rate</th><th>Grouped sales say</th><th>From</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="help">Groups are broad, so these are a starting range, not a matched pair. Check them against sensitivity on the grid and your experience. Typical price in this segment today: ${money(Math.round(T.medPrice / 5000) * 5000)}.</p>`;
}
