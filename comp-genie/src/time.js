/* =====================================================================
   Market conditions (time) support, Oct 2026 – her comparability groups.
   Sales from her archive in the subject's segment are sorted into her groups
   (usable lot band, view tier, built before/after 1945, quality, finished
   area band).  Each group keeps its own price level; the change over time is
   measured across all groups together (log price = group + half-year), so
   size / view / quality mix does not pass for market change.  Checked against
   resales of the same property and Zillow.  Price bands are NOT used to pick
   sales (that would hide appreciation); the subject's price tier only decides
   which tier's trend is shown first.  She picks the rate – nothing is set for her.
   ===================================================================== */
const TS = { last: null };
const nbhdNorm = s => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
function tsSegment(J) {
  const S = subjFacts(J); const seg = (G0(J).seg) || segGuess(J);
  if (seg === 'Montecito') return { name: 'Montecito (93108)', test: r => r.zip === '93108', acres: true };
  if (seg === 'Hope Ranch') return { name: 'Hope Ranch', test: r => /^hope ranch(?!\s*annex)/.test(nbhdNorm(r.nbhd)) && !/annex/.test(nbhdNorm(r.nbhd)), acres: true };
  const nb = nbhdNorm(S.nbhd || J.subject.nbhd || ''); const zip = (String(J.subject.zip || J.subject.addr || '').match(/\b93\d{3}\b/) || [])[0];
  if (nb) return { name: 'Neighborhood: ' + (S.nbhd || J.subject.nbhd), test: r => nbhdNorm(r.nbhd) === nb, acres: false, zip };
  if (zip) return { name: 'ZIP ' + zip + ' (no neighborhood entered for the subject)', test: r => r.zip === zip, acres: false };
  return null;
}
const LOT_BANDS_AC = [0.5, 1.5, 3, 10], LOT_BANDS_SF = [5000, 8500, 14000, 20000, 43560, 65340, 130680, 435600];
const bandOf = (v, cuts) => { let i = 0; while (i < cuts.length && v >= cuts[i]) i++; return i; };
function tsSales(J) {   // her archive sales in the segment, plus closed sales from this job's MLS search, with her group key
  const seg = tsSegment(J); if (!seg || !ARCH.loaded) return { seg, rows: [], skipped: {}, job: { n: 0, skipped: 0, site: 0 } };
  if (!ARCH.recIdx) { ARCH.recIdx = new Map(); ARCH.rows.forEach((r, i) => ARCH.recIdx.set(r[ARCH.c.rec_id], i)); }
  const eff = J.subject.eff || todayISO(); const effM = +eff.slice(0, 4) * 12 + (+eff.slice(5, 7) - 1);
  const rows = [], skipped = { lot: 0, view: 0, q: 0, area: 0, year: 0 }; const seen = new Set();
  const mk = (o, src) => {   // o: price, month, usAc|siteSf, vt, q, c, fin, gla, yb + features
    const m = +String(o.month).slice(0, 4) * 12 + (+String(o.month).slice(5, 7) - 1); const back = effM - m; if (!(back >= 0 && back < 72)) return 'old';
    if (o.usAc == null && o.siteSf == null) return 'lot'; if (o.vt == null) return 'view'; if (o.q == null) return 'q'; if (!o.fin) return 'area'; if (!o.yb) return 'year';
    const lotV = o.usAc != null ? o.usAc * 43560 : o.siteSf;
    const lot = (o.usAc != null ? '' : 's') + (seg.acres ? bandOf(lotV / 43560, LOT_BANDS_AC) : bandOf(lotV, LOT_BANDS_SF));   // 's' = grouped by site size (no usable lot on file) – kept apart
    const age = !seg.acres && lotV < 5000 ? 'any' : (o.yb < 1945 ? 'pre1945' : '1945+');
    const qn = Math.round(-o.q);   // whole UAD step for the group
    const dims = { lot, vt: o.vt, age, q: qn, area: bandOf(o.fin, [2000, 4000, 6000]) };
    rows.push({ ...o, src, y: Math.log(o.price), p: Math.floor(back / 6), back, dims, key: [dims.lot, dims.vt, dims.age, dims.q, dims.area].join('|') }); return '';
  };
  Object.values(ARCH.sales).forEach(s => {
    if (!s.use || !s.price || !s.month) return; const i = ARCH.recIdx.get(s.primary); if (i === undefined) return;
    const R = ARCH.rows[i], g = k => R[ARCH.c[k]];
    if (!seg.test({ zip: String(g('zip') || ''), nbhd: g('neighborhood') || '' })) return;
    const us = g('usable_sf'), vr = String(g('view_rating') || ''), q = g('quality'), cd = g('condition'), fin = (+g('gla') || 0) + (+g('bsmt_fin_sf') || 0);
    const yb = g('year_built_est') || (g('actual_age') != null && g('entered_date') ? +String(g('entered_date')).slice(0, 4) - g('actual_age') : null);
    const vt = !vr ? null : /adverse/i.test(vr) ? -1 : /neutral/i.test(vr) ? 0 : g('view_panoramic') ? 3 : g('view_limited') ? 1 : 2;
    const tq = (archTier(g('fu_raw'), 'Q', q) || '|mid').split('|')[1], tc = (archTier(g('fu_raw'), 'C', cd) || '|mid').split('|')[1];
    const acc = (() => { try { return JSON.parse(g('accessory_json') || '[]'); } catch (e) { return []; } })(); const liv = acc.filter(b => b.fin && !/storage|shed|barn|garage|stable|greenhouse|carport/i.test(b.type || ''));
    const why = mk({ price: +s.price, month: s.month, usAc: us ? us / 43560 : null, vt, q: q ? ratingPos('Q' + q, tq) : null, c: cd ? ratingPos('C' + cd, tc) : null, fin, gla: +g('gla') || null, yb,
      full: g('baths_full'), half: g('baths_half') || 0, pool: g('pool') ? 1 : 0, spa: g('spa') ? 1 : 0, tennis: g('tennis') ? 1 : 0, sport: g('sport_court') || g('pickleball') ? 1 : 0,
      aduSf: acc.length || g('acc_count') != null ? liv.reduce((t, b) => t + (+b.sf || 0), 0) : null, land: goodness('land', { land: g('landscaping') }), garage: g('garage_spaces'),
      addr: g('norm_address') || '', remodel: g('remodel_year'), title: [g('street_number'), g('street_name')].filter(Boolean).join(' ') }, 'arch');
    if (why && why !== 'old') skipped[why]++;
    if (!why) seen.add((g('norm_address') || '') + '|' + String(s.month).slice(0, 7));
  });
  // closed sales from this job (her MLS search, PDFs, CORT) that are not already in the archive
  const job = { n: 0, skipped: 0, site: 0 };
  (J.comps || []).forEach(c => {
    const C = compFacts(c, J); if (!C.price || !C.sale) return; if (!/closed|sold/i.test(String(V(c, 'status') || 'Closed'))) return;
    if (!seg.test({ zip: String(V(c, 'zip') || ''), nbhd: V(c, 'nbhd') || '' })) return;
    const month = String(C.sale).slice(0, 7); const addr = (c.src.arch[0] && c.src.arch[0].v && archRowAddr(c)) || '';
    if (c.src.arch.some(a => a.v && String(a.v.saleDate || '').slice(0, 7) === month)) return;   // the archive already has this sale
    if (addr && seen.has(addr + '|' + month)) return;
    const A = aduNums(C);
    const why = mk({ price: C.price, month, usAc: blank(C.usable) ? null : +C.usable, siteSf: blank(C.usable) && C.site ? +C.site : null, vt: viewTier(C.view), q: C.q ? ratingPos(C.q, fineOf(J, c.id, 'q')) : null,
      c: C.c ? ratingPos(C.c, fineOf(J, c.id, 'c')) : null, fin: (+C.gla || 0) + (+C.bsmt || 0), gla: C.gla || null, yb: C.year, full: C.full, half: C.half || 0,
      pool: hasFeat(C, 'pool'), spa: hasFeat(C, 'spa'), tennis: hasFeat(C, 'tennis'), sport: hasFeat(C, 'sport'), aduSf: A.sf, land: goodness('land', C), garage: C.garage, addr, title: compTitle(c) }, 'job');
    if (why === '') { job.n++; if (blank(C.usable)) job.site++; } else if (why !== 'old') job.skipped++;
  });
  return { seg, rows, skipped, job };
}
const archRowAddr = c => { const a = c.src.arch[0]; const i = a && ARCH.recIdx ? ARCH.recIdx.get(a.rec) : undefined; return i === undefined ? '' : ARCH.rows[i][ARCH.c.norm_address] || ''; };
/* least squares: log price = group + half-year (the newest half-year is the reference) */
function tsFit(rows, P) {
  const cnt = new Map(); rows.forEach(r => cnt.set(r.key, (cnt.get(r.key) || 0) + 1));
  const use = rows.filter(r => cnt.get(r.key) > 1 && r.p < P); if (use.length < 20) return null;
  const keys = [...new Set(use.map(r => r.key))]; const kIdx = new Map(keys.map((k, i) => [k, i])); const nG = keys.length, n = nG + (P - 1);
  const A = Array.from({ length: n }, () => new Float64Array(n)), b = new Float64Array(n);
  use.forEach(r => { const cols = [kIdx.get(r.key)]; if (r.p > 0) cols.push(nG + r.p - 1); cols.forEach(a => { b[a] += r.y; cols.forEach(c => { A[a][c] += 1; }); }); });
  for (let i = 0; i < n; i++) A[i][i] += 1e-6;
  // Gaussian elimination
  for (let c = 0; c < n; c++) { let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; const d = A[c][c]; if (Math.abs(d) < 1e-12) continue;
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const x = new Float64Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k]; x[i] = Math.abs(A[i][i]) < 1e-12 ? 0 : s / A[i][i]; }
  const per = [0]; for (let p = 1; p < P; p++) per.push(x[nG + p - 1]);
  const cntP = Array(P).fill(0); use.forEach(r => cntP[r.p]++);
  return { per, cntP, n: use.length, groups: nG };
}
const tsMonthly = (per, a, b, months) => { const m = arr => arr.reduce((s, v) => s + v, 0) / arr.length; const d = m(per.slice(a[0], a[1] + 1)) - m(per.slice(b[0], b[1] + 1)); return (Math.exp(d / months) - 1) * 100; };
const TS_MIN_YEAR = 8;   // sales needed in each year compared
function tsRates(fit) { if (!fit) return null; const P = fit.per, C = fit.cntP; const yr = (a, b) => (C[a] || 0) + (C[b] || 0);
  const ok = r => r !== null && Math.abs(r) <= 4 ? r : null;   // more than 4% a month is a data problem, not a market
  // % per month: newest year vs the year before; newest year vs two years before – only when each year has enough sales
  return { m12: P.length >= 4 && yr(0, 1) >= TS_MIN_YEAR && yr(2, 3) >= TS_MIN_YEAR ? ok(tsMonthly(P, [0, 1], [2, 3], 12)) : null,
    m24: P.length >= 6 && yr(0, 1) >= TS_MIN_YEAR && yr(4, 5) >= TS_MIN_YEAR ? ok(tsMonthly(P, [0, 1], [4, 5], 24)) : null }; }
function tsBoot(rows, P, B = 150) { const out12 = [], out24 = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < B; k++) { const s = rows.map(() => rows[Math.floor(rnd() * rows.length)]); const f = tsFit(s, P); const r = tsRates(f); if (!r) continue; if (r.m12 !== null) out12.push(r.m12); if (r.m24 !== null) out24.push(r.m24); }
  const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
  return { m12: out12.length >= 50 ? [q(out12, 0.25), q(out12, 0.75)] : [null, null], m24: out24.length >= 50 ? [q(out24, 0.25), q(out24, 0.75)] : [null, null], n: out12.length }; }
function tsResales(rows) {   // the same house sold twice, no remodel recorded in between
  const by = new Map(); rows.forEach(r => { if (!r.addr) return; if (!by.has(r.addr)) by.set(r.addr, []); by.get(r.addr).push(r); });
  const pairs = []; by.forEach(L => { L.sort((a, b) => b.back - a.back); for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; const mo = a.back - b.back; if (mo < 6) continue;
    if (b.remodel && +b.remodel >= +String(a.month).slice(0, 4)) continue; pairs.push({ title: b.title || b.addr, m1: a.month, m2: b.month, p1: a.price, p2: b.price, mo, rate: (Math.pow(b.price / a.price, 1 / mo) - 1) * 100 }); } });
  const s = pairs.map(p => p.rate).sort((x, y) => x - y); const q = p => s.length ? s[Math.floor(p * (s.length - 1))] : null;
  const mo = pairs.map(p => p.mo).sort((x, y) => x - y); const yrs = pairs.flatMap(p => [p.m1, p.m2]).map(m => +String(m).slice(0, 4)).sort();
  return { pairs: pairs.sort((x, y) => String(y.m2).localeCompare(String(x.m2))), med: q(0.5), lo: q(0.25), hi: q(0.75), moMed: mo.length ? mo[Math.floor((mo.length - 1) / 2)] : null, from: yrs[0], to: yrs[yrs.length - 1] }; }
function readOrderKv(id) { return new Promise(res => { let r; try { r = indexedDB.open('aa-orders'); } catch (e) { res(null); return; }
  r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} }; r.onerror = () => res(null);
  r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) { d.close(); res(null); return; } const q = d.transaction('kv').objectStore('kv').get(id); q.onsuccess = () => { d.close(); res(q.result || null); }; q.onerror = () => { d.close(); res(null); }; }; }); }
async function tsRun(J) {
  const { seg, rows, skipped, job } = tsSales(J); const P = 12;
  const res = { at: Date.now(), seg: seg && seg.name, n: rows.length, skipped, job };
  if (!seg) { res.err = 'Enter the subject address (and neighborhood) first.'; return res; }
  if (!ARCH.loaded) { res.err = 'Load your comp archive first (top of the page).'; return res; }
  const fit = tsFit(rows, P); res.all = fit && { ...tsRates(fit), ci: tsBoot(rows, P), per: fit.per, cntP: fit.cntP, n: fit.n, groups: fit.groups };
  // the subject's price tier: groups are put in a tier by their typical price, so a sale never leaves its tier by selling higher
  const tier = tierGuess(J); const Pst = startsNow(); const gMed = new Map(); const byK = new Map(); rows.forEach(r => { if (!byK.has(r.key)) byK.set(r.key, []); byK.get(r.key).push(r.price); });
  byK.forEach((L, k) => { const s = [...L].sort((a, b) => a - b); gMed.set(k, s[Math.floor((s.length - 1) / 2)]); });
  const tierOf = v => v >= Pst.highFrom ? 'high' : v < Pst.lowBelow ? 'low' : 'middle';
  const tRows = rows.filter(r => tierOf(gMed.get(r.key)) === tier); const tf = tRows.length >= 60 ? tsFit(tRows, P) : null;
  res.tier = { name: tier, n: tRows.length, fit: tf && { ...tsRates(tf), ci: tsBoot(tRows, P), n: tf.n } };
  res.resale = tsResales(rows);
  const zip = (String(J.subject.zip || J.subject.addr || '').match(/\b93\d{3}\b/) || [])[0] || (seg.name.match(/93\d{3}/) || [])[0];
  const z = await readOrderKv('mk:zillow'); const zz = z && z.v && zip ? z.v['zip:' + zip] : null; if (zz && zz.change) res.zillow = { zip, change: +zz.change, asOf: zz.asOf || '', monthly: (Math.pow(1 + (+zz.change) / 100, 1 / 12) - 1) * 100 };
  return res;
}
const pct = (v, d = 2) => v === null || v === undefined || isNaN(v) ? '–' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d) + '%';
function tsChart(per, cntP) {   // half-year index, oldest → newest, oldest = 100
  const P = per.length; const ix = per.map(v => Math.exp(v)); const ord = [...Array(P).keys()].reverse(); const base = ix[P - 1]; const vals = ord.map(p => ix[p] / base * 100);
  const W = 640, H = 220, L = 46, R = 12, T = 14, B = 40; const lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.12 || 5; const y0 = lo - pad, y1 = hi + pad;
  const X = i => L + i * (W - L - R) / (P - 1), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const lab = p => { const d = new Date(); return p === 0 ? 'last 6 mo' : `${p * 6}–${p * 6 + 6} mo ago`; };
  const ticks = [y0, (y0 + y1) / 2, y1].map(v => `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="tl">${Math.round(v)}</text><line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="tschart" role="img" aria-label="Price index by half-year">${ticks}
    <polyline points="${vals.map((v, i) => X(i) + ',' + Y(v)).join(' ')}" class="ln"/>
    ${vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${2.5 + Math.min(5, Math.sqrt(cntP[ord[i]] || 0) / 2)}" class="pt"><title>${lab(ord[i])}: index ${v.toFixed(1)} · ${cntP[ord[i]] || 0} sales</title></circle>
      <text x="${X(i)}" y="${H - B + 14}" text-anchor="middle" class="tl">${cntP[ord[i]] || 0}</text>`).join('')}
    <text x="${L}" y="${H - 6}" class="tl">← 6 years ago · numbers = sales in each half-year · newest →</text></svg>`;
}
function timeHTML(J) {
  const G = G0(J); const T = J.timeSupport;
  const head = `<h2>Market conditions support <small>time adjustment from your groups</small></h2>
    <p class="help">Sales from your archive in the subject's segment, last 6 years, sorted into your groups (usable lot band, view tier, built before / after 1945, quality, finished area band). Each group keeps its own price level and the change over time is measured across them together, so differences in size, view or quality are not mistaken for market change. Checked against resales of the same house and Zillow. You pick the rate.</p>
    <div class="row"><button class="btn primary" data-act="ts-run">${T ? 'Run it again' : 'Find time support'}</button>${T ? `<small>Run ${esc(new Date(T.at).toLocaleString())}</small>` : ''}</div>`;
  if (!T) return head; if (T.err) return head + `<p class="warn">${esc(T.err)}</p>`;
  const use = (v, label) => v === null || v === undefined || isNaN(v) ? '' : `<button class="btn sm" data-tsuse="${v.toFixed(2)}" data-tslabel="${esc(label)}">Use ${pct(v)} / month</button>`;
  const A = T.all, TT = T.tier && T.tier.fit, RS = T.resale;
  const rowsH = [
    A && ['All your groups in ' + T.seg, `${A.n} sales · ${A.groups} groups`, A.m12, A.ci && A.ci.m12, A.m24, A.ci && A.ci.m24],
    TT && [`${T.tier.name[0].toUpperCase() + T.tier.name.slice(1)} tier only (the subject's tier)`, `${TT.n} sales`, TT.m12, TT.ci && TT.ci.m12, TT.m24, TT.ci && TT.ci.m24],
  ].filter(Boolean).map(([l, n, m12, c12, m24, c24]) => `<tr><th>${esc(l)}<br><small>${esc(n)}</small></th><td>${m12 === null ? '<small>not enough sales in each year</small>' : `<b>${pct(m12)}</b><br><small>middle half ${c12 && c12[0] !== null ? pct(c12[0]) + ' to ' + pct(c12[1]) : '–'}</small><br>${use(m12, l + ', last 12 months')}`}</td>
    <td>${m24 === null ? '<small>not enough sales in each year</small>' : `<b>${pct(m24)}</b><br><small>middle half ${c24 && c24[0] !== null ? pct(c24[0]) + ' to ' + pct(c24[1]) : '–'}</small><br>${use(m24, l + ', last 24 months')}`}</td></tr>`).join('');
  const thin = []; if (!A) thin.push('Not enough grouped sales in this segment to measure time (fewer than 20 sales in groups of 2 or more).');
  else if (A.m12 === null && A.m24 === null) thin.push(`Not enough sales in each year to measure a trend here (each year compared needs at least ${TS_MIN_YEAR} grouped sales). Use the resales, Zillow and your MLS statistics, or a broader segment.`);
  if (T.tier && !TT) thin.push(`The subject's ${T.tier.name} tier has only ${T.tier.n} sales – too few for its own trend; use the segment-wide line.`);
  const sk = T.skipped || {}; const skN = Object.values(sk).reduce((a, b) => a + b, 0);
  return head + `${thin.map(t => `<p class="warn">${esc(t)}</p>`).join('')}
    <table class="ts"><thead><tr><th></th><th>Last 12 months<br><small>% per month</small></th><th>Last 24 months<br><small>% per month</small></th></tr></thead><tbody>${rowsH}
      <tr><th>Resales of the same house<br><small>${RS.pairs.length} pairs, no remodel recorded between${RS.moMed ? `; typically ${RS.moMed} months apart, ${RS.from}–${RS.to} – a longer span than the 12-month line, so it reflects earlier years too` : ''}</small></th><td colspan="2"><b>${pct(RS.med)}</b> median per month <small>(middle half ${pct(RS.lo)} to ${pct(RS.hi)})</small> ${RS.pairs.length >= 5 ? use(RS.med, 'resales of the same house') : '<small>– too few pairs to rely on</small>'}</td></tr>
      ${T.zillow ? `<tr><th>Zillow ZIP ${esc(T.zillow.zip)}<br><small>${esc(T.zillow.asOf || '')}</small></th><td colspan="2">${pct(T.zillow.change, 1)} in a year = <b>${pct(T.zillow.monthly)}</b> per month <small>(typical home value, all homes in the ZIP – context only)</small></td></tr>` : `<tr><th>Zillow</th><td colspan="2"><small>No Zillow figures saved for this ZIP on the hub's Market tab.</small></td></tr>`}
    </tbody></table>
    ${A ? tsChart(A.per, A.cntP) : ''}
    <p class="help">${skN ? `${skN} sales in the segment were left out because your archive lacks a needed item (usable lot ${sk.lot}, view ${sk.view}, quality ${sk.q}, finished area ${sk.area}, year built ${sk.year}). ` : ''}${T.job && T.job.n ? `Includes ${T.job.n} closed sale${T.job.n === 1 ? '' : 's'} from this job's MLS search that are not in your archive${T.job.site ? ` (${T.job.site} grouped by site size because no usable lot is on file – kept in their own groups)` : ''}. ` : ''}${T.job && T.job.skipped ? `${T.job.skipped} job sales were left out (no view, quality, area or year built on file). ` : ''}Price tiers only decide which line applies to your subject; sales were not filtered by price, so a house that sold higher does not drop out of the trend.</p>
    ${RS.pairs.length ? `<details><summary>The resales (${RS.pairs.length})</summary><table class="ts small"><tr><th>Address</th><th>First sale</th><th>Second sale</th><th>% per month</th></tr>${RS.pairs.slice(0, 40).map(p => `<tr><td>${esc(p.title)}</td><td>${esc(p.m1)} ${money(p.p1)}</td><td>${esc(p.m2)} ${money(p.p2)}</td><td>${pct(p.rate)}</td></tr>`).join('')}</table></details>` : ''}
    ${G.rates.timePct !== undefined && !blank(G.rates.timePct) ? `<p>Your rate on the grid: <b>${pct(+G.rates.timePct)} per month</b>${G.rateFrom && G.rateFrom.timePct ? ' – from ' + esc(G.rateFrom.timePct) : ''}.</p>` : ''}`;
}
