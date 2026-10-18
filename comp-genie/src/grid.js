/* =====================================================================
   Adjustment grid (UAD 3.6 sales comparison), Oct 2026.
   She makes every adjustment.  The grid only does the arithmetic she asks for:
   type an amount in any cell, or type a rate once (per sq ft, per usable acre,
   per bath, per space, % per month) and the cells without your own amount use it.
   Usable Lot Area/Utility: only from her archive or her own measurement.
   ===================================================================== */
const ADJ_ROWS = [
  // [id, label, section, UAD adjustment line (null = no adjustment), rate key]
  ['price', 'Sale price', 'Sales and listing', null],
  ['ppsf', 'Price per sq ft (living area)', 'Sales and listing', null],
  ['src', 'Data source', 'Sales and listing', null],
  ['prox', 'Proximity to subject', 'Sales and listing', null],
  ['terms', 'Transfer terms (financing)', 'Sales and listing', 'FinancingMethod'],
  ['conc', 'Known sales concessions', 'Sales and listing', 'SalesConcessions'],
  ['contract', 'Contract date', 'Sales and listing', 'ContractDate'],
  ['sale', 'Sale date (market conditions)', 'Sales and listing', 'SaleDate', 'timePct'],
  ['dom', 'Days on market', 'Sales and listing', null],
  ['site', 'Site size', 'Site', 'SiteSize'],
  ['nbhd', 'Neighborhood name', 'Site', 'NeighborhoodName'],
  ['loc', 'Site influence (location)', 'Site', 'SiteInfluence'],
  ['view', 'View', 'Site', 'View'],
  ['usable', 'Usable Lot Area/Utility', 'Site', 'OTHER', 'usableAc', 'Usable Lot Area/Utility'],
  ['land', 'Landscaping', 'Site', 'OTHER', null, 'Landscaping'],   // her SFREP template needs an Add Other row named exactly "Landscaping"
  ['topo', 'Topography', 'Site', 'Topography'],
  ['year', 'Year built', 'Dwelling', 'YearBuilt'],
  ['style', 'Design (style)', 'Dwelling', 'DwellingStyle'],
  ['energy', 'Energy efficient features', 'Dwelling', 'EnergyEfficientAndGreenFeatures'],
  ['beds', 'Bedrooms', 'Dwelling', 'LivingUnitBedroomCount', 'bed'],
  ['baths', 'Baths (full / half)', 'Dwelling', 'LivingUnitBathroomCount', 'bath'],
  ['gla', 'Living area above grade (sq ft)', 'Dwelling', 'LivingUnitStandardFinishedAreaAboveGrade', 'gla'],
  ['bsmt', 'Below grade finished (sq ft)', 'Dwelling', 'LivingUnitStandardFinishedAreaBelowGrade'],
  ['q', 'Overall quality', 'Dwelling', 'OverallQualityRating'],
  ['c', 'Overall condition', 'Dwelling', 'OverallConditionRating'],
  ['porch', 'Porch / patio / deck', 'Amenities', 'OutdoorLivingAmenity'],
  ['pool', 'Pool / spa', 'Amenities', 'WaterFeaturesAmenity'],
  ['adu', 'ADU / guest house / outbuildings', 'Amenities', 'Outbuilding'],
  ['other', 'Other amenities', 'Amenities', 'MiscellaneousAmenity'],
  ['garage', 'Vehicle storage', 'Amenities', 'VehicleStorage', 'space'],
];
const LOT_UTILITY = 'Usable Lot Area/Utility';      // her exact SFREP template "Add Other" row name (must match letter for letter)
const RATES = { gla: ['$ per sq ft', 'subject − comp sq ft × rate'], usableAc: ['$ per usable acre', 'subject − comp usable acres × rate'], bed: ['$ per bedroom', 'bedroom difference × rate'],
  bath: ['$ per full bath', 'full-bath difference × rate (half baths at half the rate)'], space: ['$ per garage space', 'space difference × rate'], timePct: ['% per month', 'months from sale to effective date × % × price'] };

const G0 = J => { J.grid = J.grid || { rates: {}, cells: {}, weights: {}, subj: {}, value: null, note: '' }; return J.grid; };
const usedComps = J => J.comps.filter(c => c.use).sort((a, b) => a.use - b.use);
const acOf = sf => sf ? Math.round(sf / 43560 * 100) / 100 : null;

/* subject facts: what she typed in the grid, else her inspection (workfile), else the order / CRS */
function subjFacts(J) {
  const I = J.subject.insp || {}, T = G0(J).subj, crs = J.subject.crs || {};
  const f = { price: '', ppsf: '', src: 'Inspection ' + (I.inspDate ? showDate(I.inspDate) : ''), prox: '', terms: '', conc: '', contract: '', sale: '', dom: '',
    site: I.siteSf || num(crs.lotSf) || null, usable: I.usableAc ?? null, loc: I.loc || '', view: I.view || '', topo: I.topo || '', nbhd: I.nbhd || '', land: I.land || '',
    style: I.style || '', year: I.year || num(crs.yearBuilt) || null, q: I.q || '', c: I.c || '', beds: I.beds ?? null, full: I.full ?? null, half: I.half ?? null,
    gla: I.gla ?? null, bsmt: I.bsmt ?? null, garage: I.garage ?? null, energy: I.energy || '', pool: I.pool || '', porch: I.porch || '', adu: I.adu || '', other: I.other || '' };
  Object.entries(T).forEach(([k, v]) => { if (!blank(v)) f[k] = v; });
  return f;
}
function compFacts(c, J) {
  const g = k => V(c, k); const px = proximity(c, J);
  return { price: num(g('salePrice')), src: g('mls') ? 'MLS ' + g('mls') : (c.src.cort.length ? 'CORT' : c.src.arch.length ? 'Your archive' : ''), prox: px ? px.mi.toFixed(2) + ' mi ' + px.dir.replace(/([a-z])([A-Z])/, '$1 $2') : '',
    terms: g('financing') || '', conc: num(g('concessions')), contract: g('contractDate') || '', sale: g('saleDate') || '', dom: g('dom'),
    site: num(g('siteSf')), usable: acOf(num(g('usableSf'))), loc: [g('locRating'), g('locFactors')].filter(Boolean).join(': '), view: [g('viewRating'), g('viewTypes')].filter(Boolean).join(': '),
    topo: g('topo') || '', nbhd: g('nbhd') || '', land: g('landscaping') || '', style: g('style') || '', year: num(g('yearBuilt')), q: g('quality') || '', c: g('condition') || '',
    beds: num(g('beds')), full: num(g('full')), half: num(g('half')), gla: num(g('gla')), bsmt: num(g('bsmtFin')), garage: num(g('garage')), energy: g('energy') || '',
    pool: [yes(g('pool')) ? 'Pool' : '', yes(g('spa')) ? 'Spa' : ''].filter(Boolean).join(', '), porch: g('porch') || '', adu: [g('adu'), g('guest'), g('accessory')].filter(Boolean).join('; '),
    other: [yes(g('tennis')) ? 'Tennis' : '', yes(g('sport')) ? 'Sport court' : '', g('horse') || ''].filter(Boolean).join(', ') };
}
function showFact(k, v) {
  if (blank(v) || v === '') return '';
  if (['price', 'conc'].includes(k)) return money(v);
  if (['contract', 'sale'].includes(k)) return showDate(v);
  if (k === 'site') return fmt(FIELD.siteSf, v);
  if (k === 'usable') return (+v).toFixed(2) + ' ac';
  if (['gla', 'bsmt'].includes(k)) return int(v);
  return String(v);
}
/* the amount the rate gives, or null */
function rateAmount(row, S, C, J) {
  const R = G0(J).rates; const key = row[4]; const r = num(R[key]); if (!key || !r) return null;
  const d = (a, b) => (blank(a) || blank(b)) ? null : (+a) - (+b);
  let x = null;
  if (key === 'gla') { const dd = d(S.gla, C.gla); x = dd === null ? null : dd * r; }
  if (key === 'usableAc') { const dd = d(S.usable, C.usable); x = dd === null ? null : dd * r; }
  if (key === 'bed') { const dd = d(S.beds, C.beds); x = dd === null ? null : dd * r; }
  if (key === 'bath') { const df = d(S.full, C.full), dh = d(S.half || 0, C.half || 0); x = df === null ? null : df * r + (dh || 0) * r / 2; }
  if (key === 'space') { const dd = d(S.garage, C.garage); x = dd === null ? null : dd * r; }
  if (key === 'timePct') { const eff = J.subject.eff; if (!C.sale || !eff || !C.price) return null; const m = monthsBetween(C.sale, eff); x = m === null ? null : C.price * r / 100 * m; }
  return x === null ? null : Math.round(x / 500) * 500;
}
function cellAmount(J, c, row) {
  const v = ((G0(J).cells[c.id] || {})[row[0]]); if (!blank(v)) return { v: +v, own: true };
  const S = subjFacts(J), C = compFacts(c, J); const a = rateAmount(row, S, C, J); return { v: a, own: false };
}
function compTotals(J, c) {
  const C = compFacts(c, J); let net = 0, gross = 0, lines = 0;
  // order as on the 3.6 grid (D-1 sample): Add Other rows first, then site, dwelling, units, quality/condition, amenities
  ADJ_ROWS.filter(r => r[3]).sort((x, y) => (y[3] === 'OTHER') - (x[3] === 'OTHER')).forEach(r => { const a = cellAmount(J, c, r).v; if (a) { net += a; gross += Math.abs(a); lines++; } });
  const price = C.price || 0; return { price, net, gross, lines, adj: price + net, netPct: price ? net / price * 100 : 0, grossPct: price ? gross / price * 100 : 0, adjPsf: C.gla ? (price + net) / C.gla : null };
}

/* ---------------- the grid card ---------------- */
function gridHTML(J) {
  const used = usedComps(J); if (!used.length) return '<h2>Adjustment grid</h2><p class="help">Pick comps with “Use as” in the list above; they line up here in grid order.</p>';
  const G = G0(J), S = subjFacts(J); const tot = used.map(c => compTotals(J, c));
  const inspNote = J.subject.insp ? `Subject from your inspection (${esc(J.subject.insp.file || 'workfile')}).` : 'Subject: drop your iPad <b>Workfile package</b> (.zip) on this page to fill the subject column from your inspection, or type the subject values in the grid.';
  let sec = '';
  const rows = ADJ_ROWS.map(row => {
    const [id, label, section, type] = row; const head = section !== sec ? `<tr class="grp"><th colspan="${2 + used.length}">${esc(section)}</th></tr>` : ''; sec = section;
    const sv = id === 'baths' ? [S.full, S.half].every(blank) ? '' : `${S.full ?? '–'} / ${S.half ?? 0}` : showFact(id, S[id]);
    const subjCell = ['price', 'ppsf', 'src', 'prox', 'dom', 'terms', 'conc', 'contract', 'sale'].includes(id) ? `<td class="subj">${esc(sv)}</td>`
      : `<td class="subj"><input class="txt sm" data-gsubj="${id}" value="${esc(blank(G.subj[id]) ? '' : G.subj[id])}" placeholder="${esc(sv || (id === 'usable' ? 'Measure it' : ''))}"></td>`;
    const cells = used.map(c => { const C = compFacts(c, J);
      let shown = id === 'baths' ? ([C.full, C.half].every(blank) ? '' : `${C.full ?? '–'} / ${C.half ?? 0}`) : id === 'ppsf' ? (C.price && C.gla ? money(C.price / C.gla) : '') : showFact(id, C[id]);
      if (id === 'usable' && blank(C.usable)) shown = '<span class="measure">Measure it</span>'; else shown = esc(shown);
      if (!type) return `<td>${shown}</td>`;
      const a = cellAmount(J, c, row);
      return `<td><div class="gval">${shown}</div><input class="txt sm adj ${a.own ? 'own' : a.v !== null ? 'auto' : ''}" data-gadj="${c.id}|${id}" value="${a.own ? a.v : ''}" placeholder="${a.v !== null && !a.own ? (a.v >= 0 ? '+' : '') + a.v.toLocaleString() : '$ adj'}" inputmode="decimal" title="${a.own ? 'Your amount – clear it to use the rate' : a.v !== null ? 'From your rate – type to override' : 'Type the adjustment'}"></td>`; }).join('');
    const rk = row[4]; const rate = rk ? `<div class="grate"><label>${esc(RATES[rk][0])} <input class="txt xs" data-grate="${rk}" value="${esc(blank(G.rates[rk]) ? '' : G.rates[rk])}" inputmode="decimal"></label></div>` : '';
    return head + `<tr><th>${esc(label)}${rate}</th>${subjCell}${cells}</tr>`;
  }).join('');
  const sumRow = (label, fn, cls = '') => `<tr class="tot ${cls}"><th>${label}</th><td></td>${used.map((c, i) => `<td>${fn(tot[i], c)}</td>`).join('')}</tr>`;
  const adjs = tot.map(t => t.adj).filter(Boolean); const lo = Math.min(...adjs), hi = Math.max(...adjs);
  const med = adjs.length ? [...adjs].sort((a, b) => a - b)[Math.floor((adjs.length - 1) / 2)] : null;
  return `<h2>Adjustment grid <small>UAD 3.6 lines · your amounts</small></h2>
    <p class="help">${inspNote} Type an amount in any cell (minus for a downward adjustment). Or type a rate once beside a line; cells without your own amount then use it (shown in grey). Clear a cell to go back to the rate. Usable Lot Area/Utility comes only from your archive or your measurement – blank comps say <span class="measure">Measure it</span>.</p>
    <div class="tablewrap"><table class="grid"><thead><tr><th></th><th>Subject<br><small>${esc(J.subject.addr || '')}</small></th>${used.map(c => `<th>Comp ${c.use}<br><small>${esc(compTitle(c))}</small></th>`).join('')}</tr></thead>
    <tbody>${rows}
    ${sumRow('Net adjustment', t => `${t.net >= 0 ? '+' : '−'}${money(Math.abs(t.net))} <small class="${Math.abs(t.netPct) > GRID_LIMITS.net ? 'over' : ''}">${t.netPct.toFixed(1)}%</small>`)}
    ${sumRow('Gross adjustment', t => `${money(t.gross)} <small class="${t.grossPct > GRID_LIMITS.gross ? 'over' : ''}">${t.grossPct.toFixed(1)}%</small>`)}
    ${sumRow('Adjusted sale price', t => `<b>${money(t.adj)}</b>${t.adjPsf ? `<br><small>${money(t.adjPsf)} / sq ft</small>` : ''}`, 'big')}
    ${sumRow('Weight in reconciliation', (t, c) => `<select data-gweight="${c.id}"><option value="">–</option>${[['Most', 'Most weight'], ['Less', 'Less weight'], ['NoWeight', 'No weight']].map(([v, l]) => `<option value="${v}" ${G.weights[c.id] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
    </tbody></table></div>
    <div class="gsum"><div><span>Adjusted range</span><b>${adjs.length ? money(lo) + ' – ' + money(hi) : '–'}</b></div><div><span>Spread</span><b>${adjs.length > 1 ? money(hi - lo) + ' (' + ((hi - lo) / lo * 100).toFixed(1) + '%)' : '–'}</b></div><div><span>Median</span><b>${med ? money(med) : '–'}</b></div>
      <label><span>Your indicated value (sales comparison)</span><input class="txt" data-gvalue="1" value="${esc(blank(G.value) ? '' : G.value)}" placeholder="$" inputmode="decimal"></label></div>
    <label class="fld"><span>Sales comparison comment (your words)</span><textarea class="txt" rows="3" data-gnote="1">${esc(G.note || '')}</textarea></label>
    ${reviewHTML(J)}`;
}

/* text for an Add Other row (subject or comp) */
function otherDesc(r, F) {
  if (r[0] === 'usable') return blank(F.usable) ? '' : (+F.usable).toFixed(2) + ' ac';
  return String(F[r[0]] || '').trim();
}

/* ---------------- review: direction, math, consistency, missing, bracketing, limits (Oct 2026) ----------------
   Every flag can be marked OK with her reason; nothing is changed for her. */
const LAND_SCALE = ['none', 'minimal', 'fair', 'avg-fair', 'average', 'avg-good', 'good', 'very good', 'excellent'];
const GRID_LIMITS = { gross: 25, net: 15, line: 10 };
const LIMIT_TEXT = 'Adjustments for some comparables exceed typical guidelines (25% gross, 15% net, 10% for a single line). This is expected given the lack of more similar sales and the non-conforming nature of this market segment; the comparables used are the most similar sales available and were weighted accordingly.';
function goodness(k, F) {   // a number where higher = better, or null when it cannot be told
  const n = v => blank(v) || v === '' ? null : num(v);
  const rating = v => { const m = String(v || '').match(/(\d)/); return m ? -(+m[1]) : null; };   // Q2 is better than Q4
  switch (k) {
    case 'gla': case 'bsmt': case 'site': case 'beds': case 'garage': return n(F[k]);
    case 'usable': return n(F.usable);
    case 'baths': return blank(F.full) ? null : (+F.full) + (+F.half || 0) / 2;
    case 'q': return rating(F.q); case 'c': return rating(F.c);
    case 'view': { const t = String(F.view || '').toLowerCase(); return /adverse/.test(t) ? 0 : /beneficial/.test(t) ? 2 : /neutral/.test(t) ? 1 : null; }
    case 'land': { const t = String(F.land || '').toLowerCase().replace(/\bv(ery)?[-. ]?good\b/, 'very good').replace(/average[- ]good|avg[- ]good/, 'avg-good').replace(/average[- ]fair|avg[- ]fair/, 'avg-fair').replace(/^avg$/, 'average');
      const i = LAND_SCALE.findIndex(x => t.startsWith(x)); return i < 0 ? null : i; }
    case 'pool': case 'adu': { const t = String(F[k] || '').trim(); if (!t) return null; return /^(no|none)$/i.test(t) ? 0 : 1; }
    default: return null;
  }
}
const REVIEW_ROWS = { gla: 'sq ft', bsmt: 'sq ft', usable: 'acre', beds: 'bedroom', baths: 'bath', garage: 'space', q: 'quality step', c: 'condition step', view: 'view tier', land: 'landscaping step', pool: '', adu: '', site: 'sq ft' };
const SMALL = { gla: 100, bsmt: 100, usable: 0.05, site: 2000 };   // differences this small are often not adjusted
const sgn = a => (a < 0 ? '−' : '+') + money(Math.abs(a));
const factText = (id, F) => id === 'baths' ? (blank(F.full) ? '?' : F.full + '/' + (F.half || 0)) : (showFact(id, F[id]) || '?');
function gridReview(J) {
  const used = usedComps(J); const S = subjFacts(J); const G = G0(J); const out = []; const add = (key, sev, msg, extra) => out.push({ key, sev, msg, ok: G.ok && G.ok[key], ...(extra || {}) });
  const rowOf = id => ADJ_ROWS.find(r => r[0] === id);
  Object.keys(REVIEW_ROWS).forEach(id => { const row = rowOf(id); if (!row) return; const per = [];
    used.forEach(c => { const C = compFacts(c, J); const gs = goodness(id, S), gc = goodness(id, C); const a = cellAmount(J, c, row).v; const name = 'Comp ' + c.use;
      if (gs === null || gc === null) { if (a) per.push(null); return; }
      const d = gs - gc;   // > 0: the subject is better, so the comp is adjusted up (+)
      if (d > 0 && a < 0) add(`dir:${c.id}:${id}`, 'Direction', `${name} – ${row[1]}: the comp is inferior to the subject, so the adjustment is usually plus (+), but it is ${sgn(a)}.`);
      else if (d < 0 && a > 0) add(`dir:${c.id}:${id}`, 'Direction', `${name} – ${row[1]}: the comp is superior to the subject, so the adjustment is usually minus (−), but it is +${money(a)}.`);
      const small = SMALL[id] !== undefined && Math.abs(d) < SMALL[id];
      if (d !== 0 && !small && !a && id !== 'site') add(`miss:${c.id}:${id}`, 'Not adjusted', `${name} – ${row[1]}: the comp differs from the subject (${factText(id, S)} vs ${factText(id, C)}) but has no adjustment.`);
      if (d === 0 && a && ['gla', 'beds', 'baths', 'garage', 'q', 'c', 'land', 'usable'].includes(id)) add(`eq:${c.id}:${id}`, 'Check', `${name} – ${row[1]}: same as the subject, but adjusted ${sgn(a)}.`);
      if (d !== 0 && a && REVIEW_ROWS[id]) per.push({ name, rate: a / d });
      // math: her own amount against the rate she set
      const own = cellAmount(J, c, row).own; if (own && row[4]) { const ra = rateAmount(row, S, C, J); if (ra !== null && Math.abs(ra - a) > Math.max(1000, Math.abs(ra) * 0.05)) add(`math:${c.id}:${id}`, 'Math', `${name} – ${row[1]}: you typed ${sgn(a)}; your rate × the difference gives ${sgn(ra)}.`); }
    });
    const rs = per.filter(Boolean); if (rs.length > 1) { const v = rs.map(x => Math.abs(x.rate)); const lo = Math.min(...v), hi = Math.max(...v);
      if (lo > 0 && hi / lo > 1.5) add(`cons:${id}`, 'Consistency', `${row[1]}: the amount per ${REVIEW_ROWS[id]} differs between comps (${rs.map(x => x.name + ' ' + money(Math.abs(x.rate))).join(', ')}). Fine if the comps differ in a way that explains it – say why.`); }
  });
  // bracketing on the main features
  [['gla', 'living area'], ['usable', 'usable lot area'], ['q', 'quality'], ['view', 'view'], ['land', 'landscaping']].forEach(([id, l]) => {
    const gs = goodness(id, S); if (gs === null) return; const gc = used.map(c => goodness(id, compFacts(c, J))).filter(x => x !== null); if (gc.length < 2) return;
    if (gs > Math.max(...gc)) add(`br:${id}`, 'Bracketing', `The subject's ${l} is better than every comp – none bracket it from above.`);
    if (gs < Math.min(...gc)) add(`br:${id}`, 'Bracketing', `The subject's ${l} is below every comp – none bracket it from below.`);
  });
  // limits: 25% gross, 15% net, 10% a line
  used.forEach(c => { const t = compTotals(J, c); const name = 'Comp ' + c.use; if (!t.price) return;
    if (t.grossPct > GRID_LIMITS.gross) add(`lim:g:${c.id}`, 'Limit', `${name}: gross adjustment ${t.grossPct.toFixed(1)}% is over ${GRID_LIMITS.gross}%.`, { limit: true });
    if (Math.abs(t.netPct) > GRID_LIMITS.net) add(`lim:n:${c.id}`, 'Limit', `${name}: net adjustment ${t.netPct.toFixed(1)}% is over ${GRID_LIMITS.net}%.`, { limit: true });
    ADJ_ROWS.filter(r => r[3]).forEach(r => { const a = cellAmount(J, c, r).v; if (a && Math.abs(a) / t.price * 100 > GRID_LIMITS.line) add(`lim:l:${c.id}:${r[0]}`, 'Limit', `${name} – ${r[1]}: ${money(Math.abs(a))} is ${(Math.abs(a) / t.price * 100).toFixed(1)}% of the sale price (over ${GRID_LIMITS.line}%).`, { limit: true }); });
  });
  return out;
}
function reviewHTML(J) {
  if (!usedComps(J).length) return ''; const F = gridReview(J); const open = F.filter(f => !f.ok); const G = G0(J);
  const anyLimit = F.some(f => f.limit); const noted = (G.note || '').includes(LIMIT_TEXT.slice(0, 60));
  return `<div class="review"><h3>Review <small>${F.length ? `${open.length} to check · ${F.length - open.length} marked OK` : 'nothing to flag'}</small></h3>
    <p class="help">Checks your grid for direction (+/−), math, consistency, missing adjustments, bracketing and the 25% gross / 15% net / 10% line guidelines. Nothing is changed for you – mark a flag OK and say why; your reason goes in the workfile.</p>
    ${F.map(f => `<div class="rv ${f.ok ? 'ok' : ''}"><span class="rvs rv-${f.sev.replace(/\s/g, '')}">${esc(f.sev)}</span><span class="rvm">${esc(f.msg)}</span>
      <input class="txt sm" data-gok="${esc(f.key)}" value="${esc(f.ok || '')}" placeholder="OK because…">${f.limit && !f.ok ? `<button class="btn sm" data-gokstd="${esc(f.key)}">Use my standard reason</button>` : ''}</div>`).join('')}
    ${anyLimit && !noted ? `<div class="row"><button class="btn" data-glimnote="1">Add the guideline explanation to the sales comparison comment</button></div><p class="help"><i>${esc(LIMIT_TEXT)}</i></p>` : ''}</div>`;
}

/* ---------------- the subject from her iPad workfile package ---------------- */
async function ingestInspection(files, name) {
  const b = files.get('inspection-backup.json'); const ins = JSON.parse(new TextDecoder().decode(b)).inspection;
  const D = ins.data || {}, L = ins.lists || {}, T = (ins.sketch && ins.sketch.totals) || {}, crs = (D.property && D.property.crs) || {};
  const xmlName = [...files.keys()].find(k => /^SFREP\/[^/]+\.xml$/i.test(k));
  const site = num(crs.lotSf) || null;
  const s = app.job.subject;
  s.insp = { file: name, inspDate: D.property.inspDate, gla: T.agFin || null, bsmt: T.bgFin || 0, beds: (L.bedrooms || []).length, full: (L.baths || []).filter(x => x.kind === 'FullBathroom').length,
    half: (L.baths || []).filter(x => x.kind === 'HalfBathroom').length, year: num(D.front.yearBuilt), q: D.condition.oq || '', c: D.condition.oc || '', style: D.front.design || '',
    siteSf: site, usableAc: D.site.usable === 'All Usable' && site ? acOf(site) : null, garage: D.garage.garShared ? 0 : (D.garage.hasGarage ? num(D.garage.garSpaces) : 0),
    view: [(D.site.view || []).join(', '), D.site.viewImpact].filter(Boolean).join(' – '), loc: [(D.site.influences || []).join(', '), D.site.inflImpact].filter(Boolean).join(' – '),
    topo: (D.site.topo || []).join(', '), energy: (D.systems.renew || []).filter(x => x !== 'None').join(', '),
    pool: (L.waterFeatures || []).map(w => w.type).filter(Boolean).join(', '), porch: (L.outdoorLiving || []).map(o => o.type).filter(Boolean).join(', '),
    adu: [...(L.adus || []).map(a => a.ident || 'ADU'), ...(L.outbuildings || []).filter(o => o.real !== false).map(o => o.label || o.type)].filter(Boolean).join(', '), hasXml: !!xmlName };
  if (!s.addr && D.property.addr) s.addr = D.property.addr;
  if (!s.lat && crs.lat) { s.lat = crs.lat; s.lon = crs.lng; }
  if (!s.apn && crs.apn) s.apn = crs.apn;
  // keep the workfile itself so the full-report export can use its SFREP subject file and photos
  await DB.put('kv', { id: 'insp:' + app.job.id, name, blob: new Blob([await makeZip([...files].filter(([k]) => /^SFREP\//i.test(k)).map(([k, v]) => ({ name: k, data: v })))]) });
  logFile(name, 'Inspection (subject)', 1);
  return `${name}: subject filled from your inspection – ${s.insp.gla ? int(s.insp.gla) + ' sq ft, ' : ''}${s.insp.beds} bedrooms, ${s.insp.full} full / ${s.insp.half} half baths${s.insp.q ? ', ' + s.insp.q + '/' + s.insp.c : ''}.${s.insp.usableAc === null ? ' Usable lot area: measure it.' : ''}`;
}

/* ---------------- adjustments into the SFREP file ---------------- */
function gridAdjustXML(CMP, c, job) {
  const G = job.grid; if (!G) return null; const box = X(CMP, 'COMPARABLE_ADJUSTMENTS'); const C = compFacts(c, job); let any = false;
  // order as on the 3.6 grid (D-1 sample): Add Other rows first, then site, dwelling, units, quality/condition, amenities
  ADJ_ROWS.filter(r => r[3]).sort((x, y) => (y[3] === 'OTHER') - (x[3] === 'OTHER')).forEach(r => { const a = cellAmount(job, c, r).v;
    if (r[3] === 'OTHER') { const desc = otherDesc(r, C); if (!desc && !a) return; const e = X(box, 'COMPARABLE_ADJUSTMENT'); XV(e, 'AdditionalComparisonLineItemDescription', desc || null); XV(e, 'AdditionalComparisonLineItemIdentifier', r[5]); XV(e, 'ComparableAdjustmentAmount', a || 0); XV(e, 'ComparableAdjustmentType', 'SalesComparableAdditionalAdjustableComparisonItem'); any = true; return; }
    if (a === null || a === undefined) return; const e = X(box, 'COMPARABLE_ADJUSTMENT'); XV(e, 'ComparableAdjustmentAmount', Math.round(a)); XV(e, 'ComparableAdjustmentType', r[3]); any = true; });
  if (!any) CMP.kids = CMP.kids.filter(k => k !== box);
  return compTotals(job, c);
}

/* full report: her iPad subject file + the comps with your grid, value and Usable Lot Area/Utility row; photos from both */
async function exportFullReport() {
  const J = app.job; const used = usedComps(J); if (!used.length) { toast('Pick comps first'); return; }
  const rec = await DB.get('kv', 'insp:' + J.id); if (!rec) { toast('Drop your iPad Workfile package on this page first'); return; }
  const files = await readZip(rec.blob); const xmlName = [...files.keys()].find(k => /^SFREP\/[^/]+\.xml$/i.test(k)); if (!xmlName) { toast('That workfile has no SFREP file'); return; }
  const NS = 'http://www.mismo.org/residential/2009/schemas', XL = 'http://www.w3.org/1999/xlink';
  const P = new DOMParser(); const sub = P.parseFromString(new TextDecoder().decode(files.get(xmlName)), 'application/xml');
  const cmp = P.parseFromString(buildCompsMISMO(J, used), 'application/xml');
  const q1 = (d, tag) => d.getElementsByTagNameNS(NS, tag)[0];
  const ORDER = { PROPERTY: ['ADDRESS', 'CAR_STORAGES', 'COMPARABLE', 'DISASTER_MITIGATION_FEATURES', 'ENCUMBRANCES', 'ENERGY_EFFICIENCY_AND_GREEN', 'ENVIRONMENTAL_CONDITIONS', 'FUNCTIONAL_ISSUES', 'HOMEOWNERS_ASSOCIATIONS', 'IMPROVEMENTS', 'INSPECTIONS', 'LISTING_INFORMATION_SUMMARY', 'LISTING_INFORMATIONS', 'LOCATION_IDENTIFIER', 'MARKET', 'NEIGHBORHOOD', 'PARCEL_SUMMARY', 'PARCELS', 'PROJECT', 'PROPERTY_AMENITY', 'PROPERTY_DEFECT', 'PROPERTY_DETAIL', 'PROPERTY_TAXES', 'PROPERTY_USE_SUMMARY', 'PROPERTY_VALUATIONS', 'SALES_CONTRACTS', 'SITE', 'SALES_HISTORIES'],
    VALUATION_ANALYSIS: ['DATA_SOURCES', 'PROPERTIES', 'VALUATION_REPORT'], SERVICE: ['VALUATION', 'PARTIES', 'RELATIONSHIPS', 'SERVICE_DETAIL'],
    VALUATION_REPORT: ['ADDITIONAL_IDENTIFIERS', 'APPROACH_TO_VALUE', 'SCOPE_OF_WORK', 'VALUATION_COMMENTARIES', 'VALUATION_RECONCILIATION', 'VALUATION_REPORT_DETAIL', 'VALUATION_SOFTWARE_SYSTEMS'] };
  const child = (parent, tag) => { for (const k of parent.children) if (k.localName === tag) return k; const e = sub.createElementNS(NS, tag); const seq = D1_ORDER[parent.localName] || ORDER[parent.localName] || []; const r = seq.indexOf(tag);
    const after = [...parent.children].find(k => seq.indexOf(k.localName) > r && r >= 0); parent.insertBefore(e, after || null); return e; };
  const leaf = (parent, tag, text, attrs) => { const e = sub.createElementNS(NS, tag); e.textContent = String(text); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
  const VA = q1(sub, 'VALUATION_ANALYSIS'), PROPS = q1(sub, 'PROPERTIES'), SUBJ = [...PROPS.children].find(p => p.getAttribute('ValuationUseType') === 'SubjectProperty'), SVC = q1(sub, 'SERVICE');
  // comps after the subject; their data sources and relationships
  [...q1(cmp, 'PROPERTIES').children].forEach(p => PROPS.appendChild(sub.importNode(p, true)));
  const DS = child(VA, 'DATA_SOURCES'); [...(q1(cmp, 'DATA_SOURCES') || { children: [] }).children].forEach(d => DS.appendChild(sub.importNode(d, true)));
  if (!DS.children.length) DS.remove();
  const RL = child(SVC, 'RELATIONSHIPS'); [...(q1(cmp, 'RELATIONSHIPS') || { children: [] }).children].forEach(r => RL.appendChild(sub.importNode(r, true)));
  if (!RL.children.length) RL.remove();
  // subject's Usable Lot Area/Utility row
  const S = subjFacts(J);
  ADJ_ROWS.filter(r => r[3] === 'OTHER').forEach(r => { const desc = otherDesc(r, S); if (!desc) return; const CM = child(SUBJ, 'COMPARABLE'); const AS = child(CM, 'COMPARABLE_ADJUSTMENTS'); const a = sub.createElementNS(NS, 'COMPARABLE_ADJUSTMENT'); AS.appendChild(a);
    leaf(a, 'AdditionalComparisonLineItemDescription', desc); leaf(a, 'AdditionalComparisonLineItemIdentifier', r[5]); leaf(a, 'ComparableAdjustmentType', 'SalesComparableAdditionalAdjustableComparisonItem'); });
  // value and comment
  const G = G0(J); const VR = child(VA, 'VALUATION_REPORT');
  if (!blank(G.value) || G.note) { const sca = child(child(VR, 'APPROACH_TO_VALUE'), 'SALES_COMPARISON_APPROACH'); const det = child(sca, 'SALES_COMPARISON_APPROACH_DETAIL');
    if (G.note) leaf(det, 'SalesComparisonCommentDescription', G.note.slice(0, 5000)); if (!blank(G.value)) leaf(det, 'ValueIndicatedBySalesComparisonAmount', Math.round(num(G.value))); }
  writeReportXML(sub, NS, J, SUBJ, VA, SVC);   // assignment, legal, zoning, H&BU, market, contract, value (report.js)
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<!--Subject from the UAD Field Inspection app, comps and adjustment grid from Comp Genie, for import into Appraise-It Pro (Home > Import Forms).-->\n' + new XMLSerializer().serializeToString(sub.documentElement);
  const entries = [{ name: jobBase() + ' - Full report.xml', data: xml }];
  for (const [k, v] of files) if (/^SFREP\/Images\//i.test(k)) entries.push({ name: k.replace(/^SFREP\//i, ''), data: v });
  for (const c of used) { const fr = frontOf(c); if (fr) { const r = await DB.get('photos', fr.id); if (r) entries.push({ name: 'Images/' + photoName(c), data: r.blob }); } }
  download(await makeZip(entries), jobBase() + ' - Full report SFREP.zip'); toast('Saved to your Downloads folder');
}
