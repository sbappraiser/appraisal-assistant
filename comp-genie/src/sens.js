/* =====================================================================
   Sensitivity analysis (Oct 2026).
   For one adjustment line at a time, try a range of rates with every other
   line left as it is, and see which rate lines the adjusted sale prices up
   most tightly (smallest standard deviation).  Her own typed cell amounts
   never move.  It is a suggestion beside her rate – she decides.
   ===================================================================== */
const SENS_LABEL = { gla: 'Living area', usableAc: 'Usable lot area', bed: 'Bedrooms', bath: 'Full baths', halfBath: 'Half baths', space: 'Garage spaces', timePct: 'Sale date (time)',
  pool: 'Pool', spa: 'Spa', pond: 'Pond', lake: 'Lake', tennis: 'Tennis court', sport: 'Sport court', qStep: 'Quality', qPct: 'Quality', cStep: 'Condition', cPct: 'Condition',
  viewStep: 'View', viewPct: 'View', landStep: 'Landscaping', aduSf: 'ADU / guest sq ft', aduBath: 'ADU / guest baths' };
const PCT_KEYS = ['timePct', 'qPct', 'cPct', 'viewPct'];
const rowsWith = k => ADJ_ROWS.filter(r => r[3] && (k === 'halfBath' ? r[4] === 'bath' : [].concat(r[4] || []).includes(k)));
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x) return m * p; return 10 * p; }
const sdOf = a => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
const medOf = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

function sensKeys(J) {   // which rate to test on each line: the one she uses, else the $ one
  const R = G0(J).rates; const set = k => !blank(R[k]);
  const pick = (a, b) => set(b) && !set(a) ? b : a;
  const ks = ['timePct', pick('viewStep', 'viewPct'), 'usableAc', 'landStep', 'bed', 'bath', 'gla', pick('qStep', 'qPct'), pick('cStep', 'cPct'), 'pool', 'spa', 'pond', 'lake', 'tennis', 'sport', 'aduSf', 'aduBath', 'space'];
  if (set('bath')) ks.splice(ks.indexOf('bath') + 1, 0, 'halfBath');
  return ks;
}
function sensRange(k, J, P, ppsf) {
  const cur = num(G0(J).rates[k]);
  let lo = 0, hi = { gla: Math.max(ppsf || 0, 500), usableAc: 4000000, bed: 500000, bath: 250000, halfBath: 125000, space: 150000, pool: 400000, spa: 150000, pond: 200000, lake: 400000,
    tennis: 400000, sport: 200000, aduSf: 1000, aduBath: 100000, qStep: 0.15 * P, cStep: 0.15 * P, viewStep: 0.15 * P, landStep: 0.05 * P, qPct: 15, cPct: 15, viewPct: 15, timePct: 2 }[k];
  if (k === 'timePct') lo = -2;
  if (cur && Math.abs(cur) * 1.5 > hi) hi = Math.abs(cur) * 2;
  const step = PCT_KEYS.includes(k) ? (k === 'timePct' ? 0.05 : niceStep(hi / 40)) : Math.max(500, niceStep(hi / 40));
  const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  if (cur !== null && !out.includes(cur)) out.push(cur);
  return out.sort((a, b) => a - b);
}
function sensRun(J) {
  const G = G0(J); const used = usedComps(J); if (used.length < 3) return { err: 'Sensitivity needs at least 3 comps on the grid.' };
  const S = subjFacts(J); const F = used.map(c => compFacts(c, J));
  const prices = F.map(C => C.price).filter(Boolean); if (prices.length < 3) return { err: 'Sensitivity needs at least 3 comps with a sale price.' };
  const P = medOf(prices), ppsf = medOf(F.filter(C => C.price && C.gla).map(C => C.price / C.gla).concat([0]).filter(Boolean)) || 0;
  const own = (c, row) => { const v = (G.cells[c.id] || {})[row[0]]; return blank(v) ? null : +v; };
  const rowAmt = (i, row) => { const o = own(used[i], row); if (o !== null) return o; return rateAmount(row, S, F[i], J) || 0; };
  const adjAll = () => used.map((c, i) => (F[i].price || 0) + ADJ_ROWS.filter(r => r[3]).reduce((t, r) => t + rowAmt(i, r), 0));
  const base = adjAll().filter((x, i) => F[i].price); const out = { at: Date.now(), n: base.length, sd: sdOf(base), spread: Math.max(...base) - Math.min(...base), med: medOf(base), lines: [] };
  const R = G.rates;
  sensKeys(J).forEach(k => {
    const rows = rowsWith(k); if (!rows.length) return;
    const save = R[k];
    // which comps does this line move? (rate set to a test amount vs nothing; her own cells do not move)
    const probe = v => { R[k] = v; const a = used.map((c, i) => rows.reduce((t, r) => t + rowAmt(i, r), 0)); return a; };
    const test = sensRange(k, J, P, ppsf); const hiV = test[test.length - 1];
    const a0 = probe(0), a1 = probe(hiV); const moved = used.filter((c, i) => F[i].price && a0[i] !== a1[i]).length;
    if (moved < 2) { if (blank(save)) delete R[k]; else R[k] = save; return; }
    const curve = test.map(v => { R[k] = v; const adj = adjAll().filter((x, i) => F[i].price); return { v, sd: sdOf(adj), spread: Math.max(...adj) - Math.min(...adj), med: medOf(adj) }; });
    if (blank(save)) delete R[k]; else R[k] = save;
    const best = curve.reduce((b, x) => x.sd < b.sd - 1e-6 ? x : b, curve[0]);
    const curV = num(save); const now = curV !== null ? curve.find(x => x.v === curV) : curve.find(x => x.v === 0);
    const sdMax = Math.max(...curve.map(x => x.sd));
    const flat = (sdMax - best.sd) / P < 0.005;     // under ½% of value either way
    const edge = best.v === test[0] || best.v === hiV;
    // where the range is within 5% of its tightest – a band, not one magic number
    const near = curve.filter(x => x.sd <= best.sd * 1.05 + P * 0.0005).map(x => x.v);
    out.lines.push({ k, moved, cur: curV, best: best.v, bestSd: best.sd, bestSpread: best.spread, bestMed: best.med, nowSd: now ? now.sd : null, nowSpread: now ? now.spread : null, band: [Math.min(...near), Math.max(...near)], flat, edge, curve: curve.map(x => [x.v, x.sd]) });
  });
  return out;
}
const sensFmt = (k, v) => v === null || v === undefined ? '–' : PCT_KEYS.includes(k) ? (+v).toFixed(2).replace(/\.?0+$/, '') + '%' : v < 0 ? '−' + money(-v) : money(v);
function sensSpark(L) {
  const W = 120, H = 28, xs = L.curve.map(x => x[0]), ys = L.curve.map(x => x[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys) || 1;
  const X = v => (x1 === x0 ? 0 : (v - x0) / (x1 - x0)) * (W - 4) + 2, Y = v => H - 2 - (y1 === y0 ? 0 : (v - y0) / (y1 - y0)) * (H - 4);
  const pts = L.curve.map(([v, s]) => `${X(v).toFixed(1)},${Y(s).toFixed(1)}`).join(' ');
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="spread by rate"><polyline points="${pts}" fill="none" stroke="#3a6ea5" stroke-width="1.5"/>
    <circle cx="${X(L.best).toFixed(1)}" cy="${Y(L.bestSd).toFixed(1)}" r="3" fill="#2a8a4a"/>${L.cur !== null ? `<line x1="${X(L.cur).toFixed(1)}" x2="${X(L.cur).toFixed(1)}" y1="2" y2="${H - 2}" stroke="#c77d1a" stroke-dasharray="2 2"/>` : ''}</svg>`;
}
function sensHTML(J) {
  if (usedComps(J).length < 3) return '';
  const T = app.sens && app.sens.job === J.id ? app.sens.res : null;
  const head = `<div class="sens"><h3>Sensitivity <small>which rate lines the comps up best</small></h3>
    <p class="help">For one line at a time, I try a range of rates with every other line as it is now, and find where the adjusted sale prices sit closest together. Your own typed amounts never move. It is support, not proof: it works best with 5 or more comps that differ on that line. Nothing changes until you press Use.</p>
    <div class="row"><button class="btn${T ? '' : ' primary'}" data-act="sens-run">${T ? 'Run it again (after changes)' : 'Run sensitivity'}</button>${T ? `<small>Adjusted range now: ${money(T.spread)} apart · typical difference from the middle ${money(Math.round(T.sd / 500) * 500)} (${T.n} comps)</small>` : ''}</div>`;
  if (!T) return head + '</div>';
  if (T.err) return head + `<p class="help">${esc(T.err)}</p></div>`;
  if (!T.lines.length) return head + '<p class="help">No line has at least 2 comps that differ from the subject, so there is nothing to test.</p></div>';
  const rows = T.lines.map(L => {
    const note = L.flat ? 'Hardly changes the range – the comps do not tell this one; use your experience.' : L.edge ? 'Tightest at the end of what I tried – the comps may not support this line (or something else is off).' : L.moved < 3 ? 'Only 2 comps differ – weak support.' : '';
    const same = L.cur !== null && L.best === L.cur;
    return `<tr><th>${esc(SENS_LABEL[L.k] || L.k)}<br><small>${esc(RATES[L.k] ? RATES[L.k][0] : '')} · ${L.moved} comps differ</small></th>
      <td>${sensFmt(L.k, L.cur)}</td><td><b>${sensFmt(L.k, L.best)}</b>${L.band[0] < L.band[1] ? `<br><small>about as tight from ${sensFmt(L.k, L.band[0])} to ${sensFmt(L.k, L.band[1])}</small>` : ''}</td>
      <td>${L.nowSpread !== null ? money(L.nowSpread) : '–'} → <b>${money(L.bestSpread)}</b><br><small>value middle ${money(L.bestMed)}</small></td><td>${sensSpark(L)}</td>
      <td>${note ? `<small class="warn">${esc(note)}</small><br>` : ''}${same ? '<small>Your rate is already the tightest.</small>' : `<button class="btn sm" data-sensuse="${L.k}" data-v="${L.best}">Use ${sensFmt(L.k, L.best)}</button>`}</td></tr>`; }).join('');
  return head + `<div class="tablewrap"><table class="senst"><thead><tr><th>Line</th><th>Your rate</th><th>Tightest at</th><th>Range apart: now → at that rate</th><th>Spread by rate <small>(green = tightest, orange = yours)</small></th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="help">Lines are tested one at a time, so after you change one rate, run it again – the others can shift. A line that only lines up at an extreme rate usually means a comp is not comparable or another line is off.</p></div>`;
}
