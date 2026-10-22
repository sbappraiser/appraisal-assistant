/* =====================================================================
   Market conditions (UAD 3.6 section 17, Fannie Mae Appendix A-1)
   Her terms (Oct 19 2026): MACRO = the market area (Market Area Boundary 17.003; the same field as the 2.6 neighborhood).
   MICRO = the competitive market area: similar properties within the macro market area (Search Criteria 17.004).
   Location (busy street, flood zone, school, shared driveway, park, waterfront…) is a separate item within the market area.
   Everything is computed here, no AI, so it works on "No AI" jobs. She reviews every choice and draft.
   A-1 notes: 17.006 median DOM is of the ACTIVE listings; 17.018 one data source per entry, 33 chars;
   17.003 / 17.004 1,250 chars; 17.019 2,500 chars. Data source wording: "SBMLS".
   ===================================================================== */
const MK = { stats: {}, zillow: {}, boundaries: [] };          // shared by every order (kv store)
const SUPPLY = [['Shortage', 'Shortage'], ['InBalance', 'In Balance'], ['OverSupply', 'Oversupply']];
const MKTIME = [['UnderThreeMonths', 'Under 3 months'], ['ThreeToSixMonths', '3 to 6 months'], ['OverSixMonths', 'Over 6 months']];
const DISTRESS_RE = /REO|Bank Owned|Foreclosure|Short Sale|Notice Of Default/i;
const DAY = 864e5;
const isoAddMonths = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const median = a => { const s = a.filter(v => v != null && !isNaN(v)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const $m = v => v == null ? '' : '$' + Math.round(v).toLocaleString();
const pct = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10) + '%';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = ym => { const [y, m] = ym.split('-').map(Number); return MONTHS[m - 1] + ' ' + y; };
const shortDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${+m}/${+d}/${y}`; };

async function mkLoad() { for (const k of ['stats', 'zillow', 'boundaries']) { const r = await ODB.get('kv', 'mk:' + k).catch(() => null); if (r) MK[k] = r.v; } }
const mkSave = k => ODB.put('kv', { id: 'mk:' + k, v: MK[k] }).catch(e => toast('Could not save: ' + (e.message || e)));
function M() { cur.market = cur.market || { lookback: 12, rows: [], exclude: {}, types: null }; return cur.market; }
function mkChanged() { saveLetter(true, true); }

/* ---------- 1. the market-area search (SBMLS CSV export) ---------- */
function parseMarketCsv(text) {
  const rows = G.parseCSV(text); if (rows.length < 2) throw new Error('That CSV is empty.');
  const H = rows[0].map(x => x.trim()); const ix = {}; H.forEach((x, i) => { ix[x.toLowerCase()] = i; });
  if (!('listing number' in ix)) throw new Error('This CSV has no "Listing Number" column. Is it the SBMLS export?');
  return rows.slice(1).map(r => {
    const g = (...names) => { for (const n of names) { const i = ix[n.toLowerCase()]; if (i !== undefined && String(r[i] || '').trim() !== '') return String(r[i]).trim(); } return ''; };
    const yes = h => /^(yes|y|true|1)$/i.test(String(r[ix[h.toLowerCase()]] || '').trim());
    const details = H.filter(x => /^(Pub|Pvt) Listing Details: /.test(x) && yes(x)).map(x => x.split(': ')[1]).filter(x => !/^(None|Standard)$/.test(x));
    const st = g('Status').toUpperCase();
    const offs = ['Withdrawal Date', 'Cancel Date', 'End Date'].map(n => G.isoDate(g(n))).filter(Boolean).sort();
    const addr = [g('Street #'), G.titleCase(g('Street Name'))].filter(Boolean).join(' ');
    return { mls: g('Listing Number'), apn: g('Parcel Number', 'APN', 'Assessor Parcel Number'), status: st, typ: g('TYP') || g('Property Type') || '', district: g('District'), addr, unit: g('Unit/Space #'),
      listDate: G.isoDate(g('Begin Date', 'Start Active Date')), contractDate: G.isoDate(g('Under Contract Date')), saleDate: G.isoDate(g('Sold Date', 'COE', 'Close Date', 'Closing Date', 'Closed Date', 'Selling Date', 'Sale Date', 'Settled Date', 'Contract Closing Date')),
      offDate: ['A', 'P', 'C', 'U', 'S'].includes(st) ? '' : (offs[0] || G.isoDate(g('Status Change Date'))), fallDate: G.isoDate(g('Fallthrough Date')),
      listPrice: G.num(g('Price')), origList: G.num(g('Original List Price')), salePrice: G.num(g('Sold Price', 'Close Price', 'Closed Price', 'Closing Price', 'Selling Price', 'Sale Price', 'Sales Price')), dom: G.num(g('Days On Market')), cdom: G.num(g('Cumulative DOM')),
      gla: G.num(g('Total SqFt.', 'Total SqFt')), details, distressed: details.some(d => DISTRESS_RE.test(d)), conc: g('Seller Concessions').toUpperCase().slice(0, 1), twoUnits: /^\d+[A-Za-z]?\s*[\/&-]\s*\d+/.test(addr) };
  }).filter(r => r.mls);
}
function statusAt(r, eff) { // what the listing was on the effective date
  if (r.listDate && r.listDate > eff) return '';
  if (r.saleDate && r.saleDate <= eff) return 'sold';
  if (r.offDate && r.offDate <= eff) return '';
  const fell = r.fallDate && r.contractDate && r.fallDate >= r.contractDate && r.fallDate <= eff;
  if (r.contractDate && r.contractDate <= eff && !fell) return 'pending';
  if ((r.status === 'C' || r.status === 'S') && !r.saleDate) return 'closed – no sale date';   // closed in the MLS, but the CSV row has no sale date / price (her question, Oct 20 2026)
  return r.listDate ? 'active' : '';
}
function mkEff() { return (cur && effectiveDate(readForm())) || todayISO(); }
function MI() { const m = M(); m.micro = m.micro || { rows: [], exclude: {}, types: null }; return m.micro; }
function mkCompute(src) {   // src: the market-area search (default) or the comparable-sales search
  const m = M(), eff = mkEff(), L = +m.lookback || 12, start = isoAddMonths(eff, -L); src = src || m;
  const nearToday = daysBetween(eff, todayISO()) <= 3; // current assignment: MLS days on market are as of the export
  const types = src.types; const out = { eff, start, L, rows: [] };
  (src.rows || []).forEach(r0 => {
    const fx = (src.fix || {})[r0.mls]; const r = fx ? { ...r0, ...(r0.crsFill || {}), ...fx, typed: true } : r0.crsFill ? { ...r0, ...r0.crsFill, crsFilled: true } : r0;   // sale date / price she typed for a closed row the CSV left blank
    const s = statusAt(r, eff); let use = s && !(src.exclude || {})[r.mls] && (r.crsOnly || !types || types.includes(r.typ));
    if (r.crsOnly && m.countCrs === false) use = false;   // CRS-only sales: not in the SBMLS numbers unless she counts them
    if (s === 'sold' && r.saleDate <= start) use = false;
    if (s === 'closed – no sale date') use = false;   // shown, but it cannot be counted without a sale date
    const dom = s === 'active' ? (nearToday && r.dom != null ? r.dom : (r.listDate ? daysBetween(r.listDate, eff) : null)) : r.cdom ?? r.dom;
    out.rows.push({ ...r, at: s === 'sold' && r.saleDate <= start ? 'older sale' : s, use, domAt: dom });
  });
  const A = out.rows.filter(r => r.use && r.at === 'active'), P = out.rows.filter(r => r.use && r.at === 'pending'), S = out.rows.filter(r => r.use && r.at === 'sold');
  const lp = A.map(r => r.listPrice).filter(v => v != null), sp = S.map(r => r.salePrice).filter(v => v != null);
  Object.assign(out, { A, P, S,
    activeN: A.length, activeLow: lp.length ? Math.min(...lp) : null, activeMed: median(lp), activeHigh: lp.length ? Math.max(...lp) : null, activeDom: median(A.map(r => r.domAt)),
    pendingN: P.length, salesN: S.length, saleLow: sp.length ? Math.min(...sp) : null, saleMed: median(sp), saleHigh: sp.length ? Math.max(...sp) : null,
    saleDom: median(S.map(r => r.cdom ?? r.dom)), perMonth: S.length / L, distressed: [...A, ...P, ...S].filter(r => r.distressed) });
  out.supply = out.perMonth > 0 ? out.activeN / out.perMonth : null;
  out.suggest = {
    supply: out.supply == null ? '' : out.supply < 4 ? 'Shortage' : out.supply <= 6 ? 'InBalance' : 'OverSupply',
    mktime: out.saleDom == null ? '' : out.saleDom < 90 ? 'UnderThreeMonths' : out.saleDom <= 180 ? 'ThreeToSixMonths' : 'OverSixMonths',
    distress: out.distressed.length ? 'true' : 'false' };
  out.trend = mkTrend(S);
  return out;
}
function mkTrend(S) { // log-linear fit of price per sq ft against sale date; shown only as an indication
  const pts = S.filter(r => r.salePrice && r.gla > 300 && r.saleDate).map(r => ({ t: Date.parse(r.saleDate) / (365.25 * DAY), y: Math.log(r.salePrice / r.gla) }));
  if (pts.length < 6) return { n: pts.length, ok: false };
  const n = pts.length, mt = pts.reduce((s, p) => s + p.t, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.t - mt) ** 2, 0), sxy = pts.reduce((s, p) => s + (p.t - mt) * (p.y - my), 0), syy = pts.reduce((s, p) => s + (p.y - my) ** 2, 0);
  const b = sxx ? sxy / sxx : 0, r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { n, ok: true, annual: (Math.exp(b) - 1) * 100, r2 };
}

/* ---------- 2. the monthly SBMLS statistics PDF ---------- */
async function pdfItems(file) {
  const pdfjs = await loadPdfJs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise; const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent(); const its = [];
    tc.items.forEach(it => { const s = it.str; if (!s.trim()) return; const x0 = it.transform[4], y = it.transform[5], w = it.width || 0;
      const parts = s.split(/(\s{2,}|\s(?=\$)|\s(?=\d))/).filter(p => p && p.trim()); if (parts.length < 2) { its.push({ x: x0, y, w, s: s.trim() }); return; }
      let off = 0; const per = w / Math.max(1, s.length); parts.forEach(p => { const i = s.indexOf(p, off); its.push({ x: x0 + i * per, y, w: p.length * per, s: p.trim() }); off = i + p.length; }); });
    pages.push({ n, items: its, text: its.map(i => i.s).join(' ') });
  }
  return pages;
}
function pdfRows(items, tol = 3) {
  const rows = []; [...items].sort((a, b) => b.y - a.y || a.x - b.x).forEach(it => { let r = rows.find(r => Math.abs(r.y - it.y) <= tol); if (!r) { r = { y: it.y, items: [] }; rows.push(r); } r.items.push(it); });
  rows.forEach(r => { r.items.sort((a, b) => a.x - b.x); r.text = r.items.map(i => i.s).join(' ').replace(/\s+/g, ' ').trim(); });
  return rows.sort((a, b) => b.y - a.y);
}
const NUM_TOK = /^\$?-?[\d,]+(\.\d+)?%?$/;
const tokNum = s => { const v = Number(String(s).replace(/[$,%]/g, '')); return isNaN(v) ? null : v; };
const MON_RE = /^(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)\.?$/i;
const monIdx = s => ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(s.toLowerCase().slice(0, 3));
function parseStatsPdf(pages) {
  const all = pages.map(p => p.text).join(' ');
  const mm = all.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})\b/i);
  if (!mm || !/Summary of Stats/i.test(all)) throw new Error('This does not look like the SBMLS Monthly MLS Statistics PDF.');
  const ym = mm[2] + '-' + String(MONTHS.findIndex(x => x.toLowerCase() === mm[1].toLowerCase()) + 1).padStart(2, '0');
  const out = { ym, warn: [], he: { summary: {}, prev: {}, ytd: {}, monthly: {} }, condo: { summary: {}, prev: {}, ytd: {}, monthly: {} } };
  let seg = 'he';
  const SUM_COLS = ['total', 'listVolume', 'medList', 'avgList', 'dom', 'cdom', 'soldVolume', 'medSold', 'avgSold', 'spLp', 'spOlp'];
  for (const pg of pages) {
    if (pg.items.length < 25 && /Districts/i.test(pg.text)) { if (/Condo/i.test(pg.text)) seg = 'condo'; else if (/Home Estate/i.test(pg.text)) seg = 'he'; }
    const S = out[seg]; const rows = pdfRows(pg.items);
    if (/Summary of Stats/i.test(pg.text)) {
      rows.forEach((r, i) => {
        const nums = r.items.filter(t => NUM_TOK.test(t.s)); if (nums.length < 4) return;
        let label = r.items.filter(t => !NUM_TOK.test(t.s)).map(t => t.s).join(' ');
        if (!label) { const near = rows.filter(q => q !== r && Math.abs(q.y - r.y) <= 14 && q.items.every(t => !NUM_TOK.test(t.s))); label = near.sort((a, b) => b.y - a.y).map(q => q.text).join(' '); }
        label = label.replace(/\s+/g, ' ').trim(); if (!label) return;
        const o = {}; nums.forEach((t, k) => { if (SUM_COLS[k]) o[SUM_COLS[k]] = tokNum(t.s); }); S.summary[label] = o;
      });
    } else if (/Previous Year Comparison/i.test(pg.text)) {
      let yr = null; rows.forEach(r => { const y = r.text.match(/^(?:[A-Z]+)\s+(\d{4})$/i); if (y) { yr = y[1]; return; }
        const lab = (r.items[0] || {}).s; if (yr && /^(Sold|Pending)$/i.test(lab)) { const nums = r.items.filter(t => NUM_TOK.test(t.s)); const o = {}; nums.forEach((t, k) => { if (SUM_COLS[k]) o[SUM_COLS[k]] = tokNum(t.s); }); (S.prev[yr] = S.prev[yr] || {})[lab] = o; } });
    } else if (/~/.test(pg.text) && /YTD/i.test(pg.text) && /(Total Active Listings|Sold Properties)/i.test(pg.text)) {
      let label = '';
      rows.forEach(r => { const pairs = [...r.text.matchAll(/(\d{4})\s*~\s*\$?\s*([\d,]{2,})/g)];
        if (!pairs.length) { if (!/~|^(UP|DOWN)\b|^\d+$/i.test(r.text) && !/SOLD Properties$|ACTIVE and PENDING/.test(r.text)) label = r.text; return; }
        const a = pairs[0], b = pairs[pairs.length - 1]; if (a === b) return;
        const key = /Total Active/i.test(label) ? 'active' : /New Listings/i.test(label) ? 'newL' : /Median List/i.test(label) ? 'medList' : /Escrow/i.test(label) ? 'escrow' : /^Sold Properties/i.test(label) ? 'sold'
          : /Median Sales Price.*(w\/o|\/o)/i.test(label) ? 'medSaleX' : /Median Sales Price/i.test(label) ? 'medSale' : /Average Sold Price.*w\/o/i.test(label) ? 'avgSaleX' : /Average Sold Price/i.test(label) ? 'avgSale' : /Sold Volume/i.test(label) ? 'volume' : '';
        if (key) S.ytd[key] = { y0: +a[1], v0: tokNum(a[2]), y1: +b[1], v1: tokNum(b[2]) }; });
    } else if (/Month by Month/i.test(pg.text)) {
      const kind = /Median Sales Price/i.test(pg.text) ? 'median' : /Sales\s*[–-]\s*Month by Month/i.test(pg.text) ? 'sales' : ''; if (!kind) continue;
      const mrow = rows.find(r => r.items.filter(t => MON_RE.test(t.s)).length >= 6); if (!mrow) continue;
      const labs = mrow.items.filter(t => MON_RE.test(t.s)).map(t => ({ c: t.x + t.w / 2, m: monIdx(t.s) }));
      const x0 = labs[0].c - 25;
      const vals = pg.items.filter(t => t.y > mrow.y + 2 && NUM_TOK.test(t.s) && t.x + t.w / 2 > x0 && (kind === 'median' ? /^\$/.test(t.s) : !/^\$/.test(t.s)));
      // the last label is the report month; count back for the years
      const [ry, rm] = ym.split('-').map(Number); let y = ry, mo = rm - 1; const yms = [];
      for (let k = labs.length - 1; k >= 0; k--) { if (k < labs.length - 1) { mo--; if (mo < 0) { mo = 11; y--; } } yms[k] = y + '-' + String(mo + 1).padStart(2, '0'); }
      const segName = seg === 'condo' ? 'condo' : 'Home Estate/PUD', what = kind === 'median' ? 'median price' : 'sales';
      if (labs[labs.length - 1].m !== rm - 1) { out.warn.push(`The ${segName} month-by-month ${what} chart in this PDF does not end at ${monthName(ym)}, so it was not used.`); continue; } // skip rather than guess
      if (labs.some((l, k) => k && l.m !== (labs[k - 1].m + 1) % 12)) { out.warn.push(`The ${segName} month-by-month ${what} chart in this PDF has months out of order, so it was not used.`); continue; }
      vals.forEach(v => { const c = v.x + v.w / 2; let best = 0; labs.forEach((l, k) => { if (Math.abs(l.c - c) < Math.abs(labs[best].c - c)) best = k; });
        if (Math.abs(labs[best].c - c) > 30) return; const key = yms[best]; S.monthly[key] = S.monthly[key] || {};
        if (S.monthly[key][kind] == null) S.monthly[key][kind] = tokNum(v.s); });
    }
  }
  if (!Object.keys(out.he.summary).length) throw new Error('Could not find the Summary of Stats table in that PDF.');
  // this month's own figures always win for the report month
  ['he', 'condo'].forEach(k => { const s = out[k].summary.Sold; if (s) { out[k].monthly[ym] = { ...(out[k].monthly[ym] || {}), sales: s.total, median: s.medSold }; } });
  return out;
}
function mkHistory(seg) { // every month seen in any loaded statistics PDF; the newer PDF wins
  const h = {}; Object.keys(MK.stats).sort().forEach(k => Object.entries((MK.stats[k][seg] || {}).monthly || {}).forEach(([ym, v]) => { h[ym] = { ...(h[ym] || {}), ...v }; }));
  return Object.keys(h).sort().map(ym => ({ ym, ...h[ym] }));
}
function mkStatsFor(eff) { // the latest statistics month on or before the effective date
  const ks = Object.keys(MK.stats).sort(); const e = eff.slice(0, 7); let k = ks.filter(x => x <= e).pop(); return k ? MK.stats[k] : null;
}

/* ---------- 3. drafts ---------- */
const mkSeg = () => ['condo', 'coop'].includes((cur || {}).propType) ? 'condo' : 'he';
function mkCriteriaDraft(R) {
  const m = M(); const dists = [...new Set(((MI().rows || []).length ? MI().rows : m.rows || []).map(r => r.district).filter(Boolean))];
  const types = [...new Set(R.rows.filter(r => r.use).map(r => r.typ).filter(Boolean))];
  const TYP = { HE: 'single-family homes (Home/Estate)', PU: 'PUD homes', CO: 'condominiums', DU: 'duplexes' };
  const src = (MI().rows || []).length ? MI() : m; const excl = (src.rows || []).filter(r => (src.exclude || {})[r.mls]);
  return `SBMLS search of ${types.map(t => TYP[t] || t).join(', ') || 'residential listings'}${dists.length ? ' in District' + (dists.length > 1 ? 's ' : ' ') + dists.join(', ') : ''}: closed sales from ${shortDate(R.start)} through the effective date of ${shortDate(R.eff)} (${R.L} months), and listings active or pending on the effective date.`
    + (excl.length ? ` ${excl.length} listing${excl.length > 1 ? 's' : ''} not competitive with the subject ${excl.length > 1 ? 'were' : 'was'} excluded (${excl.map(r => r.addr).join('; ')}).` : '');
}
/* 17.019 draft, short (her review Oct 20 2026: the first draft was too long and repeated the Search Result Metrics).
   Her wording for a stable market: fluctuations are typical and reflect property differences rather than changes in market conditions. */
function mkTrendSuggest(R) {   // from the chart: both medians move less than about 3% a year → stable
  const Q = MI().rows.length ? mkCompute(M()) : null; const a = trendChange(R), b = Q && trendChange(Q); const xs = [a, b].filter(Boolean); if (!xs.length) return '';
  const pm = median(xs.map(x => x.perMo)); return Math.abs(pm) < 0.25 ? 'stable' : pm > 0 ? 'increasing' : 'declining';
}
function mkCommentDraft(R) {
  const seg = mkSeg(), st = mkStatsFor(R.eff), S = st && st[seg]; const parts = [];
  const segName = seg === 'condo' ? 'condominium' : 'Home Estate/PUD'; const pct = x => (x >= 0 ? '+' : '') + (Math.round(x * 10) / 10) + '%';
  const Q = MI().rows.length ? mkCompute(M()) : null; const tM = trendChange(R), tA = Q && trendChange(Q);
  const TC = { increasing: 'increasing', stable: 'stable', declining: 'declining' }[M().trendConcl || mkTrendSuggest(R)];
  parts.push([1, `Market conditions are analyzed as of the effective date of ${shortDate(R.eff)}.`]);
  if (R.salesN) parts.push([1, `The ${R.salesN} competing sale${R.salesN === 1 ? '' : 's'} in the ${R.L}-month look-back period sold from ${$m(R.saleLow)} to ${$m(R.saleHigh)} (median ${$m(R.saleMed)})` + (Q && Q.salesN ? `, and the ${Q.salesN} sales within the market area boundary (median ${$m(Q.saleMed)}) were considered as context.` : '.')]);
  else parts.push([1, `There were no competing sales in the ${R.L}-month look-back period; the listings, pending sales and the broader market were considered.`]);
  if (R.salesN && R.salesN < MK_MIN_SALES) parts.push([1, `The ${R.salesN} competing sale${R.salesN === 1 ? ' is' : 's are'} too few to measure a reliable price trend on their own, so the broader market was also considered.`]);
  if (tM || tA) { const bits = [tM ? `${pct(tM.pct)} for the competing sales` : '', tA ? `${pct(tA.pct)} for the market area sales` : ''].filter(Boolean).join(' and ');
    parts.push([1, `From the earlier to the later sales, the median sale price changed about ${bits}` + (TC === 'stable' ? '. These fluctuations are typical and reflect property differences rather than changes in market conditions.' : TC === 'increasing' ? ', indicating increasing values.' : TC === 'declining' ? ', indicating declining values.' : '.')]); }
  parts.push([1, R.activeN ? `There ${R.activeN === 1 ? 'is 1 active competing listing' : 'are ' + R.activeN + ' active competing listings'} and ${R.pendingN} pending sale${R.pendingN === 1 ? '' : 's'}` + (R.supply != null ? `, about ${(Math.round(R.supply * 10) / 10)} months of supply` : '') + (R.saleDom != null ? `; the sales had a median marketing time of ${Math.round(R.saleDom)} days.` : '.')
    : `There are no active competing listings and ${R.pendingN} pending sale${R.pendingN === 1 ? '' : 's'}, indicating limited supply` + (R.saleDom != null ? `; the sales had a median marketing time of ${Math.round(R.saleDom)} days.` : '.')]);
  if (S && S.ytd && S.ytd.medSale) { const y = S.ytd; parts.push([3, `South Coast ${segName} statistics (SBMLS Districts 05-35) through ${monthName(st.ym)} show the median sales price ${y.medSale.v1 >= y.medSale.v0 ? 'up' : 'down'} about ${Math.abs(Math.round((y.medSale.v1 / y.medSale.v0 - 1) * 1000) / 10)}% from the same period of ${y.medSale.y0 || (y.sold && y.sold.y0) || 'the prior year'}.`]); }
  parts.push([2, `Price per square foot was not relied on as a trend measure because it does not reflect differences in lot utility, quality, condition, features and view.`]);
  if (TC) parts.push([1, `Market values are considered ${TC} as of the effective date.`]);
  parts.push([1, `No forecast of future market conditions or value is intended.`]);
  let keep = parts.slice(); const len = () => keep.map(p => p[1]).join(' ').length;
  for (const pr of [5, 3, 2]) { if (len() <= 2500) break; keep = keep.filter(p => p[0] !== pr); }
  return keep.map(p => p[1]).join(' ').slice(0, 2500);
}
const MK_MIN_SALES = 12;   // fewer competing sales than this: the default “not sufficient” comment and the broader market
function mkZKey() { const f = cur ? readForm() : {}; const zip = String(f.zip || '').match(/\d{5}/); const by = M().zillowBy || (zip || /Unincorporated/.test(f.jurisdiction || '') ? 'zip' : 'city'); return by === 'zip' && zip ? 'zip:' + zip[0] : mkCity(); }
function mkCity() { const f = cur ? readForm() : {}; if (f.city) return f.city; const a = String((cur && cur.address) || '').split(',').map(x => x.trim()); return a[1] && !/^[A-Z]{2}(\s+\d{5})?/.test(a[1]) ? a[1] : ''; }

/* ---------- 4. graphs (PNG for the report: white page, one hue) ---------- */
const GC = { ink: '#1c2631', muted: '#5b6876', grid: '#e4e9ee', dot: '#8db8d2', line: '#1f4f6e', bar: '#2c5a78' };
function chartFrame(cv, title, sub) {
  const W = 1200, H = 680; cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = GC.ink; g.font = '600 30px Inter, Arial, sans-serif'; g.fillText(title, 40, 52);
  g.fillStyle = GC.muted; g.font = '20px Inter, Arial, sans-serif'; g.fillText(sub, 40, 84);
  return { g, W, H, L: 120, R: W - 40, T: 120, B: H - 80 };
}
function niceTicks(lo, hi, n = 5) { if (lo === hi) { lo *= 0.9; hi = hi * 1.1 || 1; } const step0 = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(step0)), step = [1, 2, 2.5, 5, 10].map(k => k * p).find(s => s >= step0); const t = []; for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.001; v += step) t.push(v); if (t[t.length - 1] < hi) t.push(t[t.length - 1] + step); return t; }
const moneyShort = v => v >= 1e6 ? '$' + (Math.round(v / 1e5) / 10) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v);
function yAxis(f, ticks, fmt) { const { g, L, R, T, B } = f; const lo = ticks[0], hi = ticks[ticks.length - 1]; const Y = v => B - (v - lo) / (hi - lo) * (B - T);
  g.font = '18px Inter, Arial, sans-serif'; g.textAlign = 'right'; ticks.forEach(v => { g.strokeStyle = GC.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); g.fillStyle = GC.muted; g.fillText(fmt(v), L - 12, Y(v) + 6); }); g.textAlign = 'left'; return Y; }
function monthsSpan(a, b) { const out = []; let [y, m] = a.slice(0, 7).split('-').map(Number); const [y2, m2] = b.slice(0, 7).split('-').map(Number); while (y < y2 || (y === y2 && m <= m2)) { out.push(y + '-' + String(m).padStart(2, '0')); m++; if (m > 12) { m = 1; y++; } } return out; }
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function drawPriceTrend(cv, R, perSf) {
  const S = R.S.filter(r => r.salePrice && r.saleDate && (!perSf || r.gla > 300)); const val = r => perSf ? r.salePrice / r.gla : r.salePrice;
  const few = S.length / Math.max(1, R.L) < 3; /* under ~3 sales a month: quarterly medians */ const f = chartFrame(cv, perSf ? 'Price trend – sale price per sq. ft.' : 'Price trend – sale prices', `SBMLS · ${S.length} sales in the ${R.L} months to ${shortDate(R.eff)} · each dot is a sale; line = ${few ? 'quarterly' : 'monthly'} median`);
  const { g, L, R: RR, B } = f; if (!S.length) { g.fillStyle = GC.muted; g.font = '24px Inter, Arial, sans-serif'; g.fillText('No sales in the lookback period.', L, 300); return; }
  const vs = S.map(val); const Y = yAxis(f, niceTicks(Math.min(...vs), Math.max(...vs)), v => perSf ? '$' + Math.round(v).toLocaleString() : moneyShort(v));
  const t0 = Date.parse(R.start), t1 = Date.parse(R.eff); const X = iso => L + (Date.parse(iso) - t0) / (t1 - t0) * (RR - L);
  const ms = monthsSpan(R.start, R.eff); g.fillStyle = GC.muted; g.font = '18px Inter, Arial, sans-serif'; g.textAlign = 'center';
  ms.forEach((ym, i) => { const step = ms.length > 14 ? 3 : 1; if (i % step) return; const [y, m] = ym.split('-').map(Number); g.fillText(MON3[m - 1] + (m === 1 || i === 0 ? ' ' + String(y).slice(2) : ''), X(ym + '-15'), B + 30); }); g.textAlign = 'left';
  // median line by month or quarter
  const bucket = r => { const [y, m] = r.saleDate.split('-').map(Number); return few ? y + '-Q' + Math.ceil(m / 3) : r.saleDate.slice(0, 7); };
  const groups = {}; S.forEach(r => { (groups[bucket(r)] = groups[bucket(r)] || []).push(r); });
  const line = Object.keys(groups).sort().map(k => { const rs = groups[k]; const mid = rs.map(r => Date.parse(r.saleDate)).reduce((a, b) => a + b, 0) / rs.length; return { x: L + (mid - t0) / (t1 - t0) * (RR - L), y: Y(median(rs.map(val))) }; });
  S.forEach(r => { g.beginPath(); g.arc(X(r.saleDate), Y(val(r)), 8, 0, Math.PI * 2); g.fillStyle = GC.dot; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); });
  if (line.length > 1) { g.strokeStyle = GC.line; g.lineWidth = 3; g.beginPath(); line.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
  line.forEach(p => { g.beginPath(); g.arc(p.x, p.y, 5, 0, Math.PI * 2); g.fillStyle = GC.line; g.fill(); });
  if (S.length < 12) { g.fillStyle = GC.muted; g.font = 'italic 18px Inter, Arial, sans-serif'; g.fillText(`Few sales (${S.length}): read the trend with care.`, L, f.H - 22); }
  chartLegend(g, RR, [[GC.dot, 'dot', 'a sale'], [GC.line, 'line', (few ? 'quarterly' : 'monthly') + ' median']]);
}
/* macro (market area boundary) and micro (competing properties) side by side, for her price-trend conclusion (Oct 20 2026).
   Sale prices, not price per sq ft (her rule). Each line = median by quarter (or month when there are 3+ sales a month). */
function trendChange(R) {   // median of the first third of the period vs the last third
  const S = R.S.filter(r => r.salePrice && r.saleDate).sort((a, b) => a.saleDate.localeCompare(b.saleDate)); if (S.length < 6) return null;
  const k = Math.max(2, Math.floor(S.length / 3)); const a = median(S.slice(0, k).map(r => r.salePrice)), b = median(S.slice(-k).map(r => r.salePrice));
  const months = Math.max(1, (Date.parse(S[S.length - k / 2 | 0].saleDate) - Date.parse(S[k / 2 | 0].saleDate)) / 2629800000);
  return { a, b, pct: (b / a - 1) * 100, perMo: ((b / a) ** (1 / months) - 1) * 100, n: S.length, months };
}
function drawTrendBoth(cv, RA, RM) {
  const sets = [['Macro – market area boundary', RA, '#9aa7b4', '#5b6876'], ...(RM && RM !== RA ? [['Micro – competing properties', RM, '#f2b366', '#c0392b']] : [])];
  const all = sets.flatMap(([, R]) => R.S.filter(r => r.salePrice && r.saleDate)); const R0 = RA;
  const f = chartFrame(cv, 'Price trend – macro and micro market', `SBMLS · sale prices in the ${R0.L} months to ${shortDate(R0.eff)} · dots = sales, lines = median by ${all.length / Math.max(1, R0.L) < 6 ? 'quarter' : 'month'}`);
  const { g, L, R: RR, B } = f; if (!all.length) { g.fillStyle = GC.muted; g.font = '24px Inter, Arial, sans-serif'; g.fillText('No sales in the look-back period.', L, 300); return; }
  const vs = all.map(r => r.salePrice); const Y = yAxis(f, niceTicks(Math.min(...vs), Math.max(...vs)), moneyShort);
  const t0 = Date.parse(R0.start), t1 = Date.parse(R0.eff); const X = iso => L + (Date.parse(iso) - t0) / (t1 - t0) * (RR - L);
  const ms = monthsSpan(R0.start, R0.eff); g.fillStyle = GC.muted; g.font = '18px Inter, Arial, sans-serif'; g.textAlign = 'center';
  ms.forEach((ym, i) => { const step = ms.length > 14 ? 3 : 1; if (i % step) return; const [y, m] = ym.split('-').map(Number); g.fillText(MON3[m - 1] + (m === 1 || i === 0 ? ' ' + String(y).slice(2) : ''), X(ym + '-15'), B + 30); }); g.textAlign = 'left';
  sets.forEach(([name, R, dot, line], si) => { const S = R.S.filter(r => r.salePrice && r.saleDate); const few = S.length / Math.max(1, R.L) < 3;
    S.forEach(r => { g.beginPath(); g.arc(X(r.saleDate), Y(r.salePrice), si ? 7 : 5, 0, Math.PI * 2); g.fillStyle = dot; g.fill(); });
    const bucket = r => { const [y, m] = r.saleDate.split('-').map(Number); return few ? y + '-Q' + Math.ceil(m / 3) : r.saleDate.slice(0, 7); };
    const G = {}; S.forEach(r => { (G[bucket(r)] = G[bucket(r)] || []).push(r); });
    const pts = Object.keys(G).sort().map(k => { const rs = G[k]; const mid = rs.map(r => Date.parse(r.saleDate)).reduce((a, b) => a + b, 0) / rs.length; return { x: L + (mid - t0) / (t1 - t0) * (RR - L), y: Y(median(rs.map(r => r.salePrice))) }; });
    if (pts.length > 1) { g.strokeStyle = line; g.lineWidth = 4; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
    pts.forEach(p => { g.beginPath(); g.arc(p.x, p.y, 6, 0, Math.PI * 2); g.fillStyle = line; g.fill(); });
    const tc = trendChange(R); const txt = `${name}: ${S.length} sales` + (tc ? ` · median ${moneyShort(tc.a)} → ${moneyShort(tc.b)} (${tc.pct >= 0 ? '+' : ''}${tc.pct.toFixed(1)}%, about ${tc.perMo >= 0 ? '+' : ''}${tc.perMo.toFixed(2)}% a month)` : ' · too few sales to read a change');
    chartLegend(g, RR, sets.flatMap(([nm, , d, l]) => [[d, 'dot', (nm.split(' – ')[0]) + ' sale'], [l, 'line', (nm.split(' – ')[0]) + ' median']]));
    g.font = '600 18px Inter, Arial, sans-serif'; const w = g.measureText(txt).width; const yy = 134 + si * 30; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(L + 6, yy - 20, w + 34, 28); g.fillStyle = line; g.fillRect(L + 12, yy - 10, 16, 6); g.fillText(txt, L + 34, yy); });
}
function drawAbsorption(cv, R) {
  const ms = monthsSpan(isoAddMonths(R.eff, -R.L + 1), R.eff); const cnt = ms.map(ym => R.S.filter(r => r.saleDate.slice(0, 7) === ym).length);
  const f = chartFrame(cv, 'Absorption rate – closed sales per month', `SBMLS · ${R.salesN} sales in ${R.L} months = ${(Math.round(R.perMonth * 10) / 10)} per month · ${R.activeN} active listings` + (R.supply != null ? ` = about ${(Math.round(R.supply * 10) / 10)} months of supply` : ''));
  const { g, L, R: RR, B } = f; const Y = yAxis(f, niceTicks(0, Math.max(2, ...cnt), Math.min(5, Math.max(2, ...cnt))), v => String(Math.round(v)));
  const bw = (RR - L) / ms.length; g.textAlign = 'center';
  ms.forEach((ym, i) => { const x = L + i * bw + 2, w = bw - 4, y = Y(cnt[i]); if (cnt[i]) { g.fillStyle = GC.bar; const r = Math.min(4, w / 2); g.beginPath(); g.moveTo(x, B); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, B); g.fill(); g.fillStyle = GC.ink; g.font = '600 18px Inter, Arial, sans-serif'; g.fillText(cnt[i], x + w / 2, y - 8); }
    const [yy, m] = ym.split('-').map(Number); if (ms.length <= 14 || i % 3 === 0) { g.fillStyle = GC.muted; g.font = '18px Inter, Arial, sans-serif'; g.fillText(MON3[m - 1] + (m === 1 || i === 0 ? ' ' + String(yy).slice(2) : ''), x + w / 2, B + 30); } });
  g.textAlign = 'left';
}
function drawMacro(cv, seg) {
  const H = mkHistory(seg).filter(x => x.median).slice(-24); const f = chartFrame(cv, `South Coast ${seg === 'condo' ? 'condominium' : 'Home Estate/PUD'} median sale price by month`, `SBMLS Monthly MLS Statistics, Districts 05-35 · ${H.length} months`);
  const { g, L, R: RR, B } = f; if (H.length < 2) { g.fillStyle = GC.muted; g.font = '24px Inter, Arial, sans-serif'; g.fillText('Load a monthly statistics PDF to see this graph.', L, 300); return; }
  const Y = yAxis(f, niceTicks(Math.min(...H.map(x => x.median)) * 0.95, Math.max(...H.map(x => x.median)) * 1.02), moneyShort); const X = i => L + (i + 0.5) * (RR - L) / H.length;
  g.strokeStyle = GC.line; g.lineWidth = 3; g.beginPath(); H.forEach((p, i) => i ? g.lineTo(X(i), Y(p.median)) : g.moveTo(X(i), Y(p.median))); g.stroke();
  H.forEach((p, i) => { g.beginPath(); g.arc(X(i), Y(p.median), 6, 0, Math.PI * 2); g.fillStyle = GC.line; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    const [y, m] = p.ym.split('-').map(Number); if (H.length <= 13 || i % 2 === 0) { g.fillStyle = GC.muted; g.font = '18px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(MON3[m - 1] + (m === 1 || i === 0 ? ' ' + String(y).slice(2) : ''), X(i), B + 30); g.textAlign = 'left'; } });
}
function savePng(cv, name) { cv.toBlob(b => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 2000); }, 'image/png'); toast('Saved ' + name + ' to Downloads'); }

/* ---------- 5. the Market tab ---------- */
let mkLast = null;
const MKSORT = { macro: { k: 'at', dir: 1 }, micro: { k: 'at', dir: 1 } };
const AT_ORDER = ['active', 'pending', 'sold', 'older sale', 'closed – no sale date', ''];
function mkTable(R, src, which) {
  const S = MKSORT[which]; const val = (r, k) => k === 'at' ? AT_ORDER.indexOf(r.at || '') : k === 'ppsf' ? (r.salePrice && r.gla ? r.salePrice / r.gla : null) : k === 'addr' ? String(r.addr || '').toLowerCase() : r[k];
  const rows = R.rows.slice().sort((a, b) => { const x = val(a, S.k), y = val(b, S.k); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * S.dir || String(b.saleDate || b.listDate).localeCompare(String(a.saleDate || a.listDate)); });
  const th = (k, l) => `<th data-mksort="${which}|${k}" class="sortable${S.k === k ? ' on' : ''}" title="Sort">${l}${S.k === k ? (S.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const inc = which === 'micro' ? 'data-mkinc2' : 'data-mkinc';
  return `<div class="tableWrap"><table class="facts mkrows"><tr><th></th>${th('addr', 'Address')}${th('at', 'On ' + h(shortDate(R.eff)))}${th('listDate', 'Listed')}${th('listPrice', 'List price')}${th('contractDate', 'Contract')}${th('saleDate', 'Sold')}${th('salePrice', 'Sale price')}${th('ppsf', '$ / sq ft')}${th('domAt', 'DOM')}${th('gla', 'Sq ft')}<th>Notes</th></tr>
    ${rows.map(r => `<tr class="${r.use ? '' : 'off'}">
      <td><input type="checkbox" ${inc}="${h(r.mls)}" ${(src.exclude || {})[r.mls] ? '' : 'checked'} title="Use this listing" aria-label="Use ${h(r.addr)}"></td><td>${h(r.addr)}${r.unit ? ' #' + h(r.unit) : ''}${r.crsOnly ? (r.macroMls ? `<small class="mkcrs">CRS sale · in your macro MLS search (MLS ${h(r.macroMls)}) but outside your micro criteria</small>` : `<small class="mkcrs">CRS only – not in SBMLS? check Flexmls${r.apn ? ' · APN ' + h(r.apn) : ''}</small>`) : `<small>MLS ${h(r.mls)} · ${h(r.typ)}${r.crs ? ' · <span class="mkcrsok">+ CRS</span>' : ''}</small>`}</td>
      <td>${r.at === 'closed – no sale date' ? `<b class="warnTxt">closed – no sale date or price in the CSV</b><span class="mkfix">Sold <input type="date" data-mkfix="${which}|${h(r.mls)}|saleDate" aria-label="Sold date"> for $<input class="num" inputmode="numeric" data-mkfix="${which}|${h(r.mls)}|salePrice" placeholder="sold price" aria-label="Sold price"></span>` : h(r.at || 'not on the market') + (r.crsOnly ? '<small>recorded sale (CRS)' + (r.use || (src.exclude || {})[r.mls] ? '' : ' · not counted') + '</small>' : '') + mkCrsDiff(r) + (r.crsFilled ? '<small>sale date from CRS (recorded)</small>' : '') + (r.typed ? `<small>sale typed by you · <a href="#" data-mkunfix="${which}|${h(r.mls)}">undo</a></small>` : '')}</td><td>${h(shortDate(r.listDate))}</td><td>${h($m(r.listPrice))}</td><td>${h(shortDate(r.contractDate))}</td><td>${h(shortDate(r.saleDate))}</td><td>${h($m(r.salePrice))}</td><td>${r.salePrice && r.gla ? h($m(r.salePrice / r.gla)) : ''}</td><td>${h(r.domAt ?? '')}</td><td>${r.gla ? Math.round(r.gla).toLocaleString() : ''}</td>
      <td>${[r.twoUnits ? 'two units? (left out)' : '', r.distressed ? '<b>distressed: ' + h(r.details.join(', ')) + '</b>' : r.details.length ? h(r.details.join(', ')) : ''].filter(Boolean).join(' · ')}</td></tr>`).join('')}</table></div>`;
}
/* a CSV for a search box. A small file next to a loaded search is ADDED to it (her Oct 20 2026 loss: a one-sale CSV
   replaced the whole search); a full export replaces it. The search before is kept: "Bring back the previous search". */
async function mkAddSearch(file, which, how) {
  try { const text0 = await G.readText(file); if (G.isCrsExport(text0)) { await mkAddCrs(file, text0, which); return; }
    const rows = parseMarketCsv(text0); rows.forEach(r => { r.src = file.name; }); const m = which === 'micro' ? MI() : M(); const old = (m.rows || []).map(r => r.src ? r : { ...r, src: !/ \+ /.test(m.file || '') ? m.file : '' });
    let mode = how || 'replace';
    if (!how && old.length && rows.length < Math.max(5, old.length / 2)) mode = confirm(`${file.name} has ${rows.length} listing${rows.length === 1 ? '' : 's'}; your search has ${old.length}.\n\nOK = ADD ${rows.length === 1 ? 'it' : 'them'} to your search (keeps the other ${old.length}).\nCancel = REPLACE the whole search with this file.`) ? 'add' : 'replace';
    m.prev = { rows: old, file: m.file, exclude: { ...(m.exclude || {}) }, types: m.types, at: new Date().toISOString() };
    if (mode === 'add') { const ids = new Set(rows.map(r => r.mls)); m.rows = [...old.filter(r => !ids.has(r.mls)), ...rows]; m.rows = mkJoinCrs(m.rows); m.file = (m.file || '') + ' + ' + file.name; rows.forEach(r => { if (m.exclude) delete m.exclude[r.mls]; }); }
    else { m.rows = rows; m.file = file.name; m.exclude = {}; m.types = null; }
    rows.filter(r => r.twoUnits).forEach(r => { m.exclude = m.exclude || {}; m.exclude[r.mls] = true; });
    { const inf = mkCrsInfos({ rows: m.prev.rows }); if (inf.length && mode === 'add') mkCrsApply(m, which, inf); }
    mkChanged(); mkRender(true); toast(mode === 'add' ? `${rows.length} listing${rows.length === 1 ? '' : 's'} added – the search now has ${m.rows.length}` : `${rows.length} listings read from ${file.name}` + (which === 'micro' ? ' (comparable-sales search)' : ' (market area)'));
    if (!(cur.docs || []).some(d => d.name === file.name)) addDocs([file], 'marketSearch'); // keep the search with the order's documents
  } catch (e) { toast(e.message || 'Could not read that file'); }
}
/* CRS Data neighborhood sales list (Oct 20 2026). A sale that is also in the MLS search joins that listing (CRS details
   added; a closed MLS row with no sale date gets the recorded sale); the others come in as "CRS only" sales for her to
   check in Flexmls (agent entry errors can keep a listing out of a boundary search). CRS-only sales are not counted in the
   SBMLS market numbers unless she ticks "Count them"; they all go to the Comp genie. Owner names are never kept. */
function mkCrsBoxHTML() {
  const rows = MI().rows || []; const only = rows.filter(r => r.crsOnly), joined = rows.filter(r => !r.crsOnly && r.crs); if (!only.length && !joined.length) return '';
  const inMac = only.filter(r => r.macroMls), notMls = only.filter(r => !r.macroMls), diff = joined.filter(r => mkCrsDiff(r));
  return `<div class="mkcrsbox"><b>CRS Data list:</b> ${joined.length} sale${joined.length === 1 ? '' : 's'} joined to their MLS listing (“+ CRS”)${diff.length ? `, <b>${diff.length}</b> where CRS and the MLS differ (shown in blue on the row – you decide which is right)` : ''}.
    ${notMls.length ? `<br><b>${notMls.length} not in SBMLS?</b> – recorded sales with no MLS listing in your searches. They are counted. Check each in Flexmls by address or APN (an agent's entry error can keep a listing out of a boundary search); if you find it, export that listing's CSV and drop it here – it joins the sale.` : ''}
    ${inMac.length ? `<br><b>${inMac.length} in your macro MLS search but outside your micro criteria</b> (for example two-story or a different size) – left unticked. Tick any that do compete.` : ''}
    ${only.length ? `<label class="check"><input type="checkbox" data-mkcountcrs ${M().countCrs !== false ? 'checked' : ''}> Count the ticked CRS sales in the market numbers and the 1004MC (adds “CRS Data” as a Price Trend Source)</label>` : ''}</div>`;
}
const mkSame = (a, b) => (G.apnKey(a.apn) && G.apnKey(a.apn) === G.apnKey(b.apn)) || (a.addr && b.addr && G.addrKey(a.addr) === G.addrKey(b.addr) && (a.unit || '') === (b.unit || ''));
const mkCrsInfo = (c, file) => ({ file, addr: c.addr, saleDate: c.saleDate, salePrice: c.salePrice, gla: c.gla, yearBuilt: c.yearBuilt, lotSf: c.lotSf, apn: c.apn, doc: c.doc });
const mkCrsId = c => 'CRS:' + (G.apnKey(c.apn) || G.addrKey(c.addr));
/* the MLS listing a recorded sale belongs to: a house can have several listings (an earlier one that expired) –
   the closed one whose sale date is nearest the recorded date wins (5375 Parejo, Oct 20 2026) */
function mkBestTwin(list, c) {
  const days = (x, y) => Math.abs((new Date(x) - new Date(y)) / 864e5);
  const score = x => (x.status === 'C' || x.status === 'S') && x.saleDate ? (c.saleDate ? days(x.saleDate, c.saleDate) : 500) : (x.status === 'C' || x.status === 'S') ? 1e5 : /^(P|U)/.test(x.status) ? 2e5 : 3e5 + (c.saleDate && (x.listDate || x.offDate) ? days(x.listDate || x.offDate, c.saleDate) : 0);
  const cand = list.filter(x => !x.crsOnly && mkSame(x, c)); return cand.sort((x, y) => score(x) - score(y))[0] || null;
}
/* lay every CRS sale of this search onto its rows again: joined to the right MLS listing, or a CRS-only row.
   Micro only: a CRS-only sale that IS in the macro MLS search did not meet her micro criteria (stories, size …), so it is left unticked
   until she ticks it (m.crsKeep). CRS-only sales are actual sales and are counted (her rule, Oct 20 2026) unless she unticks "Count". */
function mkCrsApply(m, which, infos) {
  const base = (m.rows || []).filter(r => !r.crsOnly).map(r => { const o = { ...r }; delete o.crs; delete o.crsFill; return o; });
  const macro = which === 'micro' ? (M().rows || []).filter(r => !r.crsOnly) : []; const fresh = []; let matched = 0, filled = 0, inMacro = 0;
  m.exclude = m.exclude || {}; m.crsKeep = m.crsKeep || {};
  infos.forEach(c => { const t = mkBestTwin(base, c);
    if (t) { if (t.crs) return; matched++; t.crs = c; if ((t.status === 'C' || t.status === 'S') && !t.saleDate && c.saleDate) { t.crsFill = { saleDate: c.saleDate, salePrice: c.salePrice }; filled++; } return; }
    const id = mkCrsId(c); if (fresh.some(x => x.mls === id)) return; const mt = macro.length ? mkBestTwin(macro, c) : null;
    if (mt) { inMacro++; if (!m.crsKeep[id]) m.exclude[id] = true; }
    fresh.push({ mls: id, crsOnly: true, src: c.file, status: 'S', typ: '', addr: c.addr, unit: '', apn: c.apn, saleDate: c.saleDate, salePrice: c.salePrice, gla: c.gla,
      listDate: '', contractDate: '', offDate: '', listPrice: null, dom: null, cdom: null, details: [], distressed: false, conc: '', twoUnits: false, crs: c, macroMls: mt ? mt.mls : '' }); });
  m.rows = [...base, ...fresh]; m.crsV = 2; return { matched, filled, fresh: fresh.length, inMacro };
}
const mkCrsInfos = (m, skipFile) => (m.rows || []).filter(r => r.crs && r.crs.file !== skipFile).map(r => ({ ...r.crs, addr: r.crs.addr || r.addr, apn: r.crs.apn || r.apn }));
function mkJoinCrs(rows) { return rows; }   // joining is done by mkCrsApply after every MLS file (see mkAddSearch)
async function mkAddCrs(file, text, which) {
  const list = G.parseCrsExport(text); if (!list.length) { toast('No sales found in that CRS file'); return; }
  const m = which === 'micro' ? MI() : M();
  m.prev = { rows: (m.rows || []).slice(), file: m.file, exclude: { ...(m.exclude || {}) }, types: m.types, at: new Date().toISOString() };
  const k = mkCrsApply(m, which, [...mkCrsInfos(m, file.name), ...list.map(c => mkCrsInfo(c, file.name))]);
  if (!String(m.file || '').split(' + ').includes(file.name)) m.file = m.file ? m.file + ' + ' + file.name : file.name;
  mkChanged(); mkRender(true);
  toast(`CRS list: ${list.length} sales – ${k.matched} joined to their MLS listing${k.filled ? ` (${k.filled} missing sale date${k.filled > 1 ? 's' : ''} filled from the recorded sale)` : ''}, ${k.fresh} not in this MLS search` + (k.inMacro ? ` (${k.inMacro} of them are in your macro MLS search, so outside your micro criteria – left unticked)` : '') + '.', 12000);
  if (!(cur.docs || []).some(d => d.name === file.name)) addDocs([file], 'crsList');
}
/* where the two sources disagree – she decides which is right */
function mkCrsDiff(r) {
  const c = r.crs; if (!c || r.crsOnly) return ''; const d = [];
  if (c.salePrice && r.salePrice && Math.abs(c.salePrice - r.salePrice) >= 1000 && !r.crsFilled) d.push(`price ${$m(c.salePrice)}`);
  if (c.saleDate && r.saleDate && !r.crsFilled && Math.abs((new Date(c.saleDate) - new Date(r.saleDate)) / 864e5) > 10) d.push(`recorded ${shortDate(c.saleDate)}`);
  if (c.gla && r.gla && Math.abs(c.gla - r.gla) >= 25) d.push(`${Number(c.gla).toLocaleString()} sq ft`);
  return d.length ? `<span class="mkdiff">CRS differs: ${d.join(' · ')}</span>` : '';
}
/* the CSV files already in this order's documents, to load one again with one click */
function mkCsvDocsHTML(which) {
  const m = which === 'micro' ? MI() : M(); const cs = (cur.docs || []).filter(d => /\.csv$/i.test(d.name || ''));
  const prev = m.prev && (m.prev.rows || []).length ? `<button type="button" class="btn small" data-mkprev="${which}">↶ Bring back the previous search (${m.prev.rows.length} listings${m.prev.file ? ' – ' + h(m.prev.file) : ''})</button>` : '';
  return cs.length || prev ? `<div class="mkcsvs">${prev}${cs.length ? '<span class="help">Or use a CSV already in this order:</span>' + cs.map(d => { const n = (m.rows || []).filter(r => (r.src || (!/ \+ /.test(m.file || '') ? m.file : '')) === d.name).length; return `<span class="mkcsv"><button type="button" class="btn small ghost" data-mkcsv="${which}|${h(d.id)}" title="Load this file again (replace or add)">${h(d.name)}${n ? ` <small>${n} in the search</small>` : ''}</button><button type="button" class="btn small ghost mkx" data-mkcsvdel="${which}|${h(d.id)}" title="Remove this file: its listings come out of the search and the file is deleted from the order" aria-label="Remove ${h(d.name)}">✕</button></span>`; }).join('') : ''}</div>` : '';
}
async function mkAddStats(file) {
  try { toast('Reading the statistics PDF…'); const st = parseStatsPdf(await pdfItems(file)); st.file = file.name; MK.stats[st.ym] = st; await mkSave('stats');
    const n = Object.keys(st.he.monthly).length; mkRender(); toast(`SBMLS statistics for ${monthName(st.ym)} loaded (${n} months of medians)` + (st.warn.some(x => (mkSeg() === 'condo') === /condo/i.test(x)) ? ' – see the note about its charts' : ''), 5000); }
  catch (e) { console.error(e);
    if (/zillow/i.test(file.name)) { toast('That looks like a Zillow page. This box is for the SBMLS monthly statistics report.', 7000); return; }
    toast((e.message || 'Could not read that PDF') + ' This box is for the monthly statistics report from SBAOR. ', 7000); }
}
async function mkAddZillow(file) {   // kept with the order's documents; a PDF saved from Chrome (Print › Save as PDF) has text, so its figures fill in
  await addDocs([file], 'zillow'); let got = {};
  try { if (/\.pdf$/i.test(file.name)) got = parseZillowText((await G.pdfLines(file)).map(l => typeof l === 'string' ? l : (l.text || l.s || (l.items || []).map(t => t.s).join(' '))).join(' ')); } catch (e) { console.warn('zillow text', e); }
  const want = mkZKey(); const place = got._place || ''; delete got._place; const zk = place || want; const n = Object.keys(got).length;
  const nm = k => k.startsWith('zip:') ? 'ZIP ' + k.slice(4) : k;
  const other = place && want && place !== want ? `This Zillow page is for ${nm(place)}, not ${nm(want)}, so its figures were kept for ${nm(place)}. For ${nm(want)}, search it on Zillow and save that page. ` : '';
  if (n && zk) { const zz = MK.zillow[zk] = MK.zillow[zk] || {}; Object.entries(got).forEach(([k, v]) => { zz[k] = v; }); await mkSave('zillow'); const m = M(); if (!m.commentEdited) m.comment = mkCommentDraft(mkLast || mkCompute()); mkChanged(); }
  mkRender(); toast(other ? other + (n ? `(${n} figures read.)` : '') : n ? `Zillow page kept, and ${n} figure${n > 1 ? 's' : ''} filled in from it – check them.` : 'Zillow page kept with this order. It has no readable text (a screenshot), so type its figures – or save the page from Chrome with Print › Save as PDF and drop that.', 8000);
}
function parseZillowText(t) {   // Zillow "Housing Market Overview" wording
  t = String(t || '').replace(/\s+/g, ' '); const out = {}; const money = x => Number(String(x).replace(/[$,]/g, ''));
  const date = re => { const m = t.match(re); if (!m) return ''; const d = new Date(m[1]); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
  let m;
  if ((m = t.match(/Typical Home Values?\s*:?\s*\$\s?([\d,]{5,})/i)) || (m = t.match(/(?:average|typical)[^$]{0,60}?home value[^$]{0,40}\$\s?([\d,]{5,})/i)) || (m = t.match(/home value[^$]{0,40}\$\s?([\d,]{5,})/i))) out.value = money(m[1]);
  if ((m = t.match(/1-Year Value Change\s*:?\s*([+-]?\d+(?:\.\d+)?)\s?%/i)) || (m = t.match(/([+-]?\d+(?:\.\d+)?)\s?%\s*(?:1-year change|1-yr|over the (?:past|last) year)/i)) || (m = t.match(/(up|down)\s+(\d+(?:\.\d+)?)%\s+over the (?:past|last) year/i))) out.change = m.length > 2 && /down/i.test(m[1]) ? -Number(m[2]) : Number(m[m.length > 2 && m[2] ? 2 : 1]);
  if ((m = t.match(/Median Sale Price\s*:?\s*\$\s?([\d,]+)/i))) out.medSale = money(m[1]);
  if ((m = t.match(/Median Sale to List Ratio\s*:?\s*([01]?\.\d+)/i))) out.stl = Number(m[1]);
  if ((m = t.match(/Median Days to Pending\s*:?\s*(\d+)/i))) out.dtp = Number(m[1]);
  const asOf = date(/Data through ([A-Z][a-z]+ \d{1,2}, \d{4})/) || date(/Median Sale Price\s*:?\s*\$[\d,]+\s*\(([A-Z][a-z]+ \d{1,2}, \d{4})\)/) || date(/\(([A-Z][a-z]+ \d{1,2}, \d{4})\)/); if (asOf && Object.keys(out).length) out.asOf = asOf;
  { const z = t.match(/\b(\d{5})\s*,?\s*(?:CA\s+)?Housing Market/i) || t.match(/home-values\/\d+\/(\d{5})\//); const c = t.match(/([A-Z][A-Za-z .'-]{2,40}),\s*CA Housing Market/); out._place = z ? 'zip:' + z[1] : c ? c[1].trim().replace(/^.*\b(?:Trends|Zillow|PM|AM)\s+/, '') : ''; }
  return out;
}
/* sales she removed in the comp genie as outside her boundaries (kv 'genieExcl:<order>', written by the genie): unticked in both searches */
let MK_GX = '';
/* the same keys the comp genie uses (its util.js apnKey / addrKey) */
const mkApnK = s => { const g = String(s || '').match(/\d+/g) || []; if (g.length === 3 && g.every(x => x.length <= 3)) return g.map(x => x.padStart(3, '0')).join(''); const d = g.join(''); return d.length >= 8 ? d.slice(0, 9) : ''; };
const MK_DIRS = new Set(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west']), MK_SUF = new Set(['rd', 'road', 'dr', 'drive', 'ln', 'lane', 'st', 'street', 'ave', 'avenue', 'av', 'way', 'wy', 'ct', 'court', 'pl', 'place', 'cir', 'circle', 'blvd', 'boulevard', 'ter', 'terrace', 'trl', 'trail', 'pkwy', 'parkway', 'hwy', 'highway', 'loop']);
const mkAddrK = a => { const m = String(a || '').split(',')[0].match(/^\s*(\d+)\S*\s+(.+)$/); if (!m) return ''; const w = m[2].toLowerCase().replace(/[.'’]/g, '').replace(/\s*(#|unit|apt|ste)\s*\S+$/, '').split(/[^a-z0-9]+/).filter(Boolean);
  while (w.length > 1 && MK_DIRS.has(w[0])) w.shift(); while (w.length > 1 && (MK_SUF.has(w[w.length - 1]) || MK_DIRS.has(w[w.length - 1]))) w.pop(); return m[1] + '|' + w.join(' '); };
async function mkGenieExcl() { if (!cur) return; const id = cur.id; const r = await ODB.get('kv', 'genieExcl:' + id).catch(() => null); const L = (r && r.v && r.v.items) || []; if (!L.length || !cur || cur.id !== id) return;
  const sig = id + '|' + L.length; if (MK_GX === sig) return; MK_GX = sig;
  const hit = row => { const k = { mls: String(row.mls || '').trim(), apn: mkApnK(row.apn) || '', addr: row.addr ? mkAddrK(row.addr) : '' };
    return L.some(x => (k.mls && x.mls && k.mls === x.mls) || (k.apn && x.apn && k.apn === x.apn) || (k.addr && x.addr && k.addr.split('#')[0] === x.addr.split('#')[0])); };
  let n = 0; [M(), MI()].forEach(q => { q.exclude = q.exclude || {}; (q.rows || []).forEach(row => { if (hit(row) && !q.exclude[row.mls]) { q.exclude[row.mls] = true; q.outArea = q.outArea || {}; q.outArea[row.mls] = true; n++; } }); });
  if (n) { mkChanged(); toast(`${n} listing${n > 1 ? 's' : ''} unticked – removed in the comp genie as outside your boundaries`); mkRender(); } }
function mkRender(redraft) {
  const box = $('#mkBody'); if (!box || !cur) return; const m = M(); mkGenieExcl();
  { const used = new Set([M(), MI()].flatMap(q => String(q.file || '').split(' + ').map(x => x.trim()).filter(Boolean)));   // files used on this tab: filed under the right kind
    let ch = false; (cur.docs || []).forEach(d => { if (!used.has(d.name)) return; const want = /prospect|crs/i.test(d.name) && !/customexport/i.test(d.name) ? 'crsList' : 'marketSearch'; if (d.type !== want && ['mls', 'other', ''].includes(d.type || '')) { d.type = want; ch = true; } });
    if (ch) { saveLetter(true); if (typeof renderDocs === 'function') renderDocs(); } }
  [[M(), 'macro'], [MI(), 'micro']].forEach(([q, w]) => { if (q.crsV !== 2 && (q.rows || []).some(r => r.crs)) { mkCrsApply(q, w, mkCrsInfos(q)); mkChanged(); } });   // CRS lists loaded before Oct 20 2026 evening: joined again the right way
  const RA = mkCompute(); const R = MI().rows.length ? mkCompute(MI()) : RA; mkLast = R;
  if (redraft || m.comment == null) { if (R.rows.length || Object.keys(MK.stats).length) { if (!m.commentEdited) m.comment = mkCommentDraft(R); if (!m.criteriaEdited) m.criteria = mkCriteriaDraft(R); } }
  const pick = (k, list) => m[k] || R.suggest[{ supply: 'supply', mktime: 'mktime', distress: 'distress' }[k]] || '';
  const sel = (k, list, sug) => `<select data-mk="${k}">${['', ...list.map(x => x[0])].map(v => `<option value="${v}"${pick(k) === v ? ' selected' : ''}>${v ? list.find(x => x[0] === v)[1] : '—'}</option>`).join('')}</select>${sug ? ` <small class="${m[k] && m[k] !== sug ? 'warnTxt' : 'muted'}">suggested: ${h((list.find(x => x[0] === sug) || [, ''])[1])}</small>` : ''}`;
  { // snapshot for the full report (Comp genie reads it from this order)
    const U = { eff: R.eff, L: R.L, boundary: m.boundary || '', criteria: m.criteria || '', comment: m.comment || '', general: m.general || '', activeN: R.activeN, activeLow: R.activeLow, activeMed: R.activeMed, activeHigh: R.activeHigh, activeDom: R.activeDom,
      pendingN: R.pendingN, salesN: R.salesN, saleLow: R.saleLow, saleMed: R.saleMed, saleHigh: R.saleHigh, supply: pick('supply'), mktime: pick('mktime'), distress: pick('distress'), sources: (m.sources || ['SBMLS']).filter(x => x !== 'Zillow') };
    if (R.rows.length && JSON.stringify(U) !== JSON.stringify(m.uad)) { m.uad = U; mkChanged(); } }
  const typesAll = [...new Set((m.rows || []).map(r => r.typ).filter(Boolean))];
  const st = mkStatsFor(R.eff); const city = mkCity(); 
  const sources = (m.sources || ['SBMLS'].concat(m.countCrs !== false && (MI().rows || []).some(r => r.crsOnly) ? ['CRS Data'] : [])).filter(x => x !== 'Zillow');
  const cnt = (id, max) => `<span class="cnt" data-cnt="${id}" data-max="${max}"></span>`;
  box.innerHTML = `
  <div class="mkgrid">
  <section class="mkcard"><h3>1 · Market Area Boundary (17.003) – everything inside your boundaries <small>the broader market: background for the Market Commentary and Price Trend Analysis</small></h3>
    <div class="grid3"><label>Effective date<input value="${h(shortDate(R.eff))}" disabled></label>
      <label>Look back<select data-mk="lookback">${[3, 6, 12, 18, 24, 36].map(n => `<option value="${n}"${+m.lookback === n ? ' selected' : ''}>${n} months</option>`).join('')}</select></label>
      <label>Property types${typesAll.length ? `<span class="types">${typesAll.map(t => `<label class="check"><input type="checkbox" data-mktype="${h(t)}" ${!m.types || m.types.includes(t) ? 'checked' : ''}>${h(t)}</label>`).join('')}</span>` : '<input disabled value="from the search">'}</label></div>
    <p class="help">The effective date comes from the order (inspection date, or the date of death for retrospective work). Change it on the Order &amp; letter tab.</p>
    <div class="drop" id="mkDrop"><div><span class="eyebrow mkhd">Market Area Boundary search <b>(MACRO market area)</b></span><p class="help">In Flexmls, search all residential listings inside your market area boundaries (actives, pendings and sales for the look-back period), export the CSV and drop it here.${m.file ? ' Loaded: <b>' + h(m.file) + '</b>' : ''}</p>${mkCsvDocsHTML('macro')}</div>
      <label class="btn" for="mkFile">Choose CSV<input type="file" id="mkFile" accept=".csv,text/csv"></label></div>
    ${(cur.docs || []).some(d => d.type === 'marketSearch' && /\.csv$/i.test(d.name)) && !m.rows.length ? '<p><button type="button" class="btn small" id="mkFromDocs">Use the market search in this order’s documents</button></p>' : ''}
    ${m.rows.length ? mkTable(RA, m, 'macro') + '<p class="help">Untick a listing that is not competitive with the subject (wrong property type, two units on one lot, a different market). It is left out of every number below. Click a column heading to sort.</p>' : ''}
  </section>
  <section class="mkcard"><h3>2 · Search Criteria (17.004) – the comparable properties within the boundaries <small>fills the UAD 3.6 Search Result Metrics (17.005–17.016)</small></h3>
    <div class="drop" id="mkDrop2"><div><span class="eyebrow mkhd">Search Criteria search <b>(MICRO – competitive market area)</b></span><p class="help">Your Flexmls search of the similar properties within the macro market area that compete with the subject (the same one you use for the 1004MC and, in a 2.6 report, the comparable listings and sales line at the top of the Sales Comparison Approach). Export the CSV and drop it here. Its results are the 3.6 Search Result Metrics, Demand/Supply and Marketing Time. Until it is loaded, the boundary search above is used. You can also drop a <b>CRS Data neighborhood sales export</b> (CSV) here: sales also in the MLS search join their listing, the others are added as <b>CRS only</b>.${MI().file ? ' Loaded: <b>' + h(MI().file) + '</b>' : ''}</p>${mkCsvDocsHTML('micro')}${mkCrsBoxHTML()}</div>
      <label class="btn" for="mkFile2">Choose CSV<input type="file" id="mkFile2" accept=".csv,text/csv"></label></div>
    ${MI().rows.length ? (() => { const Q = R; const ppsf = Q.S.filter(r => r.salePrice && r.gla).map(r => r.salePrice / r.gla), stl = Q.S.filter(r => r.salePrice && r.listPrice).map(r => r.salePrice / r.listPrice);
      return `<table class="facts uad mkmini"><tr><th>Sales in the look-back</th><td>${Q.salesN}${Q.salesN ? ` · ${$m(Q.saleLow)} / ${$m(Q.saleMed)} / ${$m(Q.saleHigh)} (low / median / high)` : ''}</td></tr>
<tr><th>Median sale-to-list</th><td>${stl.length ? Math.round(median(stl) * 1000) / 10 + '%' : '—'}</td></tr>
        <tr><th>Median days on market (sales)</th><td>${Q.saleDom != null ? Math.round(Q.saleDom) : '—'}</td></tr><tr><th>Active / pending now</th><td>${Q.activeN} / ${Q.pendingN}</td></tr>
        <tr><th>Price trend</th><td>${Q.salesN < MK_MIN_SALES ? 'not enough competing sales to measure (' + Q.salesN + ') – the comment uses the broader market' : Q.salesN + ' competing sales'}</td></tr></table>` + mkTable(Q, MI(), 'micro'); })() : ''}
  </section>
  <section class="mkcard"><h3>3 · UAD 3.6 Market section</h3><p class="help">${MI().rows.length ? 'Search Result Metrics from the Search Criteria search (box 2).' : '<b class="warnTxt">Box 2 is empty</b> – these metrics use the Market Area Boundary search (box 1) for now.'}</p>
    <table class="facts uad"><tr><th>Market Area Boundary <span class="sfn">(17.003)</span></th><td><textarea data-mk="boundary" rows="3" maxlength="1250" placeholder="e.g. Samarkand market area: bounded by De la Vina St, State St, Las Positas Rd and Highway 101">${h(m.boundary || '')}</textarea>${cnt('boundary', 1250)}
      <div class="row"><select id="mkBndPick"><option value="">Use a saved area…</option>${MK.boundaries.map((b, i) => `<option value="${i}">${h(b.name)}</option>`).join('')}</select><button type="button" class="btn ghost small" id="mkBndSave">Save this area</button><button type="button" class="btn ghost small" data-copy="boundary">Copy</button></div></td></tr>
    <tr><th>Search Criteria Description <span class="sfn">(17.004)</span></th><td><textarea data-mk="criteria" rows="3" maxlength="1250">${h(m.criteria || '')}</textarea>${cnt('criteria', 1250)}<div class="row"><button type="button" class="btn ghost small" data-redraft="criteria">Draft again</button><button type="button" class="btn ghost small" data-copy="criteria">Copy</button></div></td></tr>
    <tr><th>Sales in Past ___ Months (look-back) <span class="sfn">(17.011)</span></th><td>${R.L}</td></tr>
    <tr><th>Active Listings <span class="sfn">(17.005)</span></th><td>${R.activeN}</td></tr>
    <tr><th>Lowest / Median / Highest List Price <span class="sfn">(17.007 / 17.008 / 17.009)</span></th><td>${R.activeN ? `${$m(R.activeLow)} / ${$m(R.activeMed)} / ${$m(R.activeHigh)}` : '<small class="muted">not needed when there are no actives</small>'}</td></tr>
    <tr><th>Median Days on Market (actives) <span class="sfn">(17.006)</span></th><td>${R.activeN ? Math.round(R.activeDom) : '<small class="muted">not needed when there are no actives</small>'}</td></tr>
    <tr><th>Pending Sales <span class="sfn">(17.010)</span></th><td>${R.pendingN}</td></tr>
    <tr><th>Sales in Past ${R.L} Months <span class="sfn">(17.012)</span></th><td>${R.salesN}</td></tr>
    <tr><th>Lowest / Median / Highest Sale Price <span class="sfn">(17.013 / 17.014 / 17.015)</span></th><td>${R.salesN ? `${$m(R.saleLow)} / ${$m(R.saleMed)} / ${$m(R.saleHigh)}` : '<small class="muted">not needed when there are no sales</small>'}</td></tr>
    <tr><th>Distressed Market Competition <span class="sfn">(17.016)</span></th><td>${sel('distress', [['false', 'No'], ['true', 'Yes']], R.rows.length ? R.suggest.distress : '')}${R.distressed.length ? `<small> ${R.distressed.length} REO / short sale / foreclosure listing${R.distressed.length > 1 ? 's' : ''}. Estate and trust sales are not distressed.</small>` : ''}</td></tr>
    <tr><th>Demand/Supply <span class="sfn">(17.021)</span></th><td>${sel('supply', SUPPLY, R.suggest.supply)}<small class="muted"> ${R.supply != null ? `${(Math.round(R.supply * 10) / 10)} months of supply (${R.activeN} actives ÷ ${(Math.round(R.perMonth * 100) / 100)} sales a month). Guide: under 4 shortage, 4–6 in balance, over 6 oversupply.` : 'No sales in the look-back period, so no months of supply.'}</small></td></tr>
    <tr><th>Marketing Time <span class="sfn">(17.022)</span></th><td>${sel('mktime', MKTIME, R.suggest.mktime)}<small class="muted"> ${R.saleDom != null ? `median ${Math.round(R.saleDom)} days on market (cumulative) for the sales` : ''}</small></td></tr>
    <tr><th>Price Trend Source <span class="sfn">(17.018)</span> <small>one per line, 33 characters each</small></th><td><textarea data-mk="sources" rows="2">${h(sources.join('\n'))}</textarea></td></tr>
    <tr><th>Your price-trend conclusion</th><td><select data-mk="trendConcl"><option value="">—</option><option value="increasing"${m.trendConcl === 'increasing' ? ' selected' : ''}>Increasing</option><option value="stable"${m.trendConcl === 'stable' ? ' selected' : ''}>Stable</option><option value="declining"${m.trendConcl === 'declining' ? ' selected' : ''}>Declining</option></select> ${(() => { const sg = mkTrendSuggest(R); return !m.trendConcl && sg ? `<small class="warnTxt">The chart suggests <b>${sg}</b> – the draft uses it until you pick.</small> <button type="button" class="btn small" data-mktrend="${sg}">Use ${sg}</button>` : '<small class="muted">used in the draft</small>'; })()}</td></tr>
    <tr><td colspan="2"><figure><canvas id="mkG0"></canvas><div class="row"><button type="button" class="btn small" data-png="mkG0">Save picture</button>${(() => { const w = [['market area boundary', mkCompute()], ...(MI().rows.length ? [['competing', R]] : [])].map(([n, X]) => { const d = X.S.map(r => r.saleDate).filter(Boolean).sort()[0]; return d && d > isoAddMonths(X.start, 3) ? `the ${n} search starts ${shortDate(d)}` : ''; }).filter(Boolean); return w.length ? `<p class="help warnTxt">The look-back is ${R.L} months, but ${w.join(' and ')} – export it again for the whole period so the earlier and later sales compare the same span.</p>` : ''; })()}<span class="help"><b>Goes into the SFREP file</b> with Comp genie › Full report (Price Trend Graph); the absorption chart below goes in too (Absorption Rate Graph). Raw medians mix different houses (size, quality, condition, lot, view). Use this to see the direction; for a measured rate that holds those level, open the Comp genie › <b>Market conditions support</b> – it groups your archive sales by usable lot, view, quality and size.</span></div></figure></td></tr>
    <tr><th>Price Trend Analysis Commentary <span class="sfn">(17.019)</span></th><td><textarea data-mk="comment" rows="10" maxlength="2500">${h(m.comment || '')}</textarea>${cnt('comment', 2500)}
      <div class="row"><button type="button" class="btn ghost small" data-redraft="comment">Draft again</button><button type="button" class="btn ghost small" data-copy="comment">Copy</button></div>
      <p class="help">Drafted from the numbers on this page in your wording. Edit freely; your edits are kept until you press Draft again.</p></td></tr>
    <tr><th>Market commentary <span class="sfn">(general commentary – Market)</span><br><small>what the numbers above do not show: what drives demand, financing, seasonality</small></th><td><textarea data-mk="general" rows="5" maxlength="5000">${h(m.general || '')}</textarea>${cnt('general', 5000)}
      <p class="help">Goes to SFREP's Market commentary box when the Comp genie exports. Your standard market paragraphs: click in the box.</p></td></tr></table>
  </section>
  <section class="mkcard"><h3>4 · Graphs for the report</h3>
    <p class="help">Each one saves as a picture for the report's market exhibits (UAD image types: Price Trend, Absorption Rate).</p>
    <figure><canvas id="mkG1"></canvas><div class="row"><label class="check"><input type="checkbox" id="mkPsf" ${m.perSf ? 'checked' : ''}>Price per square foot</label><button type="button" class="btn small" data-png="mkG1">Save picture</button></div></figure>
    <figure><canvas id="mkG2"></canvas><div class="row"><button type="button" class="btn small" data-png="mkG2">Save picture</button></div></figure>
    <figure><canvas id="mkG3"></canvas><div class="row"><button type="button" class="btn small" data-png="mkG3">Save picture</button></div></figure>
  </section>
  <section class="mkcard"><h3>5 · Big picture: SBMLS monthly statistics</h3>
    <div class="drop" id="mkStatsDrop"><div><span class="eyebrow mkhd">SBMLS Monthly MLS Statistics PDF</span><p class="help">The monthly statistics report from the Santa Barbara Association of REALTORS® (Summary of Stats for Home Estate/PUD Districts 05–35 and condos: sales, pendings, new and active listings, median and average prices, days on market, year-to-date comparisons). Load each month's PDF once; every order uses it. ${Object.keys(MK.stats).length ? 'Loaded: ' + Object.keys(MK.stats).sort().map(monthName).join(', ') + '.' : 'None loaded yet.'}${st ? ' This order uses <b>' + monthName(st.ym) + '</b>.' : ''}</p></div>
      <label class="btn" for="mkStatsFile">Choose PDF<input type="file" id="mkStatsFile" accept=".pdf,application/pdf"></label></div>
    ${st ? mkStatsTable(st[mkSeg()], st.ym) : ''}${(() => { const segW = mkSeg() === 'condo' ? /condo/i : /^(?!.*condo)/i; const w = st && st.warn ? st.warn.filter(x => segW.test(x)) : []; return w.length ? `<p class="help warnTxt">${w.map(h).join(' ')} This month's own totals from its Summary of Stats page were used instead.</p>` : ''; })()}
    ${(cur.docs || []).filter(d => d.type === 'zillow').map(d => `<p class="help mkzold">Zillow page kept with this order: <button type="button" class="lnk" data-zopen="${d.id}">${h(d.name)}</button> <button type="button" class="mkx" data-zdel="${d.id}" title="Remove this file from the order">✕ Remove this file</button></p>`).join('')}
  </section></div>
  <div class="formEnd"><button type="button" class="btn" id="mkSaveBtn">Save</button><a class="btn primary" id="mkGenie" href="${h(genieURL(cur))}" target="aa-genie">Save and open the Comp genie →</a><button type="button" class="btn ghost" id="mkOrderBtn">Back to the order</button><span class="savedAt" data-saved></span></div>`;
  // graphs
  drawTrendBoth($('#mkG0'), RA, MI().rows.length ? R : null); drawPriceTrend($('#mkG1'), R, !!m.perSf); drawAbsorption($('#mkG2'), R); drawMacro($('#mkG3'), mkSeg());
  // the price trend and absorption charts go into the SFREP file (Comp genie › Full report): kept with the order as pictures (Oct 20 2026)
  try { const c0 = $('#mkG0'), c2 = $('#mkG2'); const t = c0 ? c0.toDataURL('image/jpeg', 0.9) : '', a = c2 ? c2.toDataURL('image/jpeg', 0.9) : ''; const ch = m.charts || {};
    if ((t || a) && (ch.trend !== t || ch.absorb !== a)) { m.charts = { trend: t, absorb: a, at: new Date().toISOString() }; saveLetter(true, true); } } catch (e) {}
  // wiring
  const dz = $('#mkDrop'); ['dragover', 'dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddSearch(e.dataTransfer.files[0]); }));
  const sz = $('#mkStatsDrop'); ['dragover', 'dragleave', 'drop'].forEach(ev => sz.addEventListener(ev, e => { e.preventDefault(); sz.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddStats(e.dataTransfer.files[0]); }));
  $('#mkFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddSearch(f); };
  $('#mkFile2').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddSearch(f, 'micro'); };
  { const z2 = $('#mkDrop2'); ['dragover', 'dragleave', 'drop'].forEach(ev => z2.addEventListener(ev, e => { e.preventDefault(); z2.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddSearch(e.dataTransfer.files[0], 'micro'); })); }
  box.querySelectorAll('[data-mksort]').forEach(th => th.onclick = () => { const [w, k] = th.dataset.mksort.split('|'); const S = MKSORT[w]; MKSORT[w] = { k, dir: S.k === k ? -S.dir : (['listPrice', 'salePrice', 'domAt', 'gla', 'ppsf'].includes(k) ? -1 : 1) }; mkRender(); });
  box.querySelectorAll('[data-mkinc2]').forEach(cb => cb.onchange = () => { const q = MI(); q.exclude = q.exclude || {}; q.crsKeep = q.crsKeep || {}; if (cb.checked) { delete q.exclude[cb.dataset.mkinc2]; q.crsKeep[cb.dataset.mkinc2] = true; } else { q.exclude[cb.dataset.mkinc2] = true; delete q.crsKeep[cb.dataset.mkinc2]; } mkChanged(); mkRender(true); });
  $('#mkStatsFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddStats(f); };
  const fd = $('#mkFromDocs'); if (fd) fd.onclick = async () => { const d = cur.docs.find(d => d.type === 'marketSearch' && /\.csv$/i.test(d.name)); const f = await docFile(d.id); if (f) mkAddSearch(f); };
  box.querySelectorAll('[data-mktrend]').forEach(bt => bt.onclick = () => { m.trendConcl = bt.dataset.mktrend; mkChanged(); mkRender(!m.commentEdited); });
  box.querySelectorAll('[data-mkcsv]').forEach(bt => bt.onclick = async e => { e.stopPropagation(); const [w, id] = bt.dataset.mkcsv.split('|'); const rec = await ODB.get('docs', id); const d = (cur.docs || []).find(x => x.id === id); if (!rec || !rec.blob) { toast('That file is not stored any more'); return; }
    const ask = confirm('Replace the search with ' + (d ? d.name : 'this file') + '?\n\nOK = replace the whole search · Cancel = add its listings to the search'); await mkAddSearch(new File([rec.blob], d ? d.name : 'search.csv', { type: 'text/csv' }), w, ask ? 'replace' : 'add'); });
  box.querySelectorAll('[data-mkcountcrs]').forEach(c => c.onchange = () => { m.countCrs = c.checked; if (m.sources) { m.sources = m.sources.filter(x => x !== 'CRS Data'); if (c.checked) m.sources.push('CRS Data'); } mkChanged(); mkRender(!m.commentEdited); });
  box.querySelectorAll('[data-mkcsvdel]').forEach(bt => bt.onclick = async e => { e.stopPropagation(); const [w, id] = bt.dataset.mkcsvdel.split('|'); const q = w === 'micro' ? MI() : M(); const d = (cur.docs || []).find(x => x.id === id); if (!d) return;
    const mine = r => (r.src || (!/ \+ /.test(q.file || '') ? q.file : '')) === d.name; const n = (q.rows || []).filter(mine).length + (q.rows || []).filter(r => !mine(r) && r.crs && r.crs.file === d.name).length;
    if (!confirm(`Remove ${d.name}?` + (n ? `\n\nIts ${n} listing${n === 1 ? '' : 's'} come out of the search (the others stay).` : '') + '\nThe file is deleted from this order. “Bring back the previous search” can undo the listings.')) return;
    if (n) { q.prev = { rows: q.rows, file: q.file, exclude: { ...(q.exclude || {}) }, types: q.types, at: new Date().toISOString() }; q.rows = q.rows.filter(r => !mine(r)).map(r => r.crs && r.crs.file === d.name ? (({ crs, crsFill, ...o }) => o)(r) : r); q.file = String(q.file || '').split(' + ').filter(x => x && x !== d.name).join(' + '); mkChanged(); }
    await removeDoc(id); mkRender(true); toast(d.name + ' removed' + (n ? ` – ${n} listing${n === 1 ? '' : 's'} taken out of the search` : '')); });
  box.querySelectorAll('[data-mkprev]').forEach(bt => bt.onclick = e => { e.stopPropagation(); const q = bt.dataset.mkprev === 'micro' ? MI() : M(); const P = q.prev; if (!P) return; const now = { rows: q.rows, file: q.file, exclude: q.exclude, types: q.types };
    Object.assign(q, { rows: P.rows, file: P.file, exclude: P.exclude || {}, types: P.types }); q.prev = now; mkChanged(); mkRender(true); toast('The previous search is back (' + q.rows.length + ' listings)'); });
  box.querySelectorAll('[data-mkfix]').forEach(inp => inp.onchange = () => { const [w, mls, k] = inp.dataset.mkfix.split('|'); const q = w === 'micro' ? MI() : m; q.fix = q.fix || {}; const f = q.fixDraft = q.fixDraft || {}; f[mls] = f[mls] || {};
    f[mls][k] = k === 'salePrice' ? G.num(inp.value) : inp.value; if (f[mls].saleDate && f[mls].salePrice) { q.fix[mls] = { saleDate: f[mls].saleDate, salePrice: f[mls].salePrice }; delete f[mls]; if (q.exclude) delete q.exclude[mls]; mkChanged(); mkRender(true); toast('Counted as a closed sale with the date and price you typed'); } });
  box.querySelectorAll('[data-mkunfix]').forEach(a => a.onclick = e => { e.preventDefault(); const [w, mls] = a.dataset.mkunfix.split('|'); const q = w === 'micro' ? MI() : m; if (q.fix) delete q.fix[mls]; mkChanged(); mkRender(true); });
  box.querySelectorAll('[data-mkinc]').forEach(cb => cb.onchange = () => { m.exclude = m.exclude || {}; if (cb.checked) delete m.exclude[cb.dataset.mkinc]; else m.exclude[cb.dataset.mkinc] = true; mkChanged(); mkRender(true); });
  box.querySelectorAll('[data-mktype]').forEach(cb => cb.onchange = () => { m.types = [...box.querySelectorAll('[data-mktype]:checked')].map(x => x.dataset.mktype); mkChanged(); mkRender(true); });
  box.querySelectorAll('select[data-mk]').forEach(s => s.onchange = () => { const k = s.dataset.mk; if (k === 'lookback') { m.lookback = +s.value; mkChanged(); mkRender(true); return; } m[k] = s.value; mkChanged(); mkRender(k === 'trendConcl' && !m.commentEdited); });
  box.querySelectorAll('textarea[data-mk]').forEach(t => t.oninput = () => { const k = t.dataset.mk; if (k === 'sources') m.sources = t.value.split('\n').map(x => x.trim().slice(0, 33)).filter(Boolean); else { m[k] = t.value; if (k === 'comment') m.commentEdited = true; if (k === 'criteria') m.criteriaEdited = true; } if (m.uad && ['boundary', 'criteria', 'comment', 'general'].includes(k)) m.uad[k] = t.value; mkCounts(); mkChanged(); });
  box.querySelectorAll('[data-redraft]').forEach(b => b.onclick = () => { const k = b.dataset.redraft; m[k] = k === 'comment' ? mkCommentDraft(R) : mkCriteriaDraft(R); m[k + 'Edited'] = false; mkChanged(); mkRender(); toast('Drafted again from the current numbers'); });
  box.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(m[b.dataset.copy] || ''); toast('Copied – paste it into SFREP'); } catch (e) { toast('Select the text and press Ctrl+C'); } });
  box.querySelectorAll('[data-png]').forEach(b => b.onclick = () => savePng($('#' + b.dataset.png), G.safeName(`${cur.fileNo || street(cur) || 'Market'} ${{ mkG1: 'Price Trend', mkG2: 'Absorption Rate', mkG3: 'SBMLS South Coast Median' }[b.dataset.png]}`) + '.png'));
  $('#mkSaveBtn').onclick = () => saveLetter(false); $('#mkGenie').onclick = () => saveLetter(true); $('#mkOrderBtn').onclick = () => { saveLetter(true); showTab('letter'); window.scrollTo(0, 0); };
  $('#mkPsf').onchange = e => { m.perSf = e.target.checked; mkChanged(); drawPriceTrend($('#mkG1'), R, m.perSf); };
  $('#mkBndPick').onchange = e => { const b = MK.boundaries[e.target.value]; if (b) { m.boundary = b.text; mkChanged(); mkRender(); } };
  $('#mkBndSave').onclick = () => { const t = (m.boundary || '').trim(); if (!t) { toast('Type the boundary first'); return; } const name = prompt('Name for this market area (for example "Samarkand")'); if (!name) return; const i = MK.boundaries.findIndex(b => b.name === name); if (i >= 0) MK.boundaries[i].text = t; else MK.boundaries.push({ name, text: t }); MK.boundaries.sort((a, b) => a.name.localeCompare(b.name)); mkSave('boundaries'); mkRender(); toast('Saved “' + name + '” for later orders'); };
  box.querySelectorAll('[data-zopen]').forEach(b => b.onclick = () => openDoc(b.dataset.zopen));
  box.querySelectorAll('[data-zdel]').forEach(b => b.onclick = async () => { const d = (cur.docs || []).find(x => x.id === b.dataset.zdel); if (!d || !confirm('Remove “' + d.name + '” from this order?')) return; await removeDoc(d.id); mkRender(); });
  mkCounts(); if (typeof mcMount === 'function') mcMount(R);
}
function mkCounts() { document.querySelectorAll('[data-cnt]').forEach(s => { const t = document.querySelector(`textarea[data-mk="${s.dataset.cnt}"]`); const n = t ? t.value.length : 0, max = +s.dataset.max; s.textContent = `${n.toLocaleString()} of ${max.toLocaleString()} characters`; s.className = 'cnt' + (n > max ? ' over' : n > max * 0.92 ? ' near' : ''); }); }
function mkStatsTable(S, ym) {
  if (!S) return ''; const y = S.ytd || {}; const row = (l, k, money) => y[k] ? `<tr><th>${l}</th><td>${money ? $m(y[k].v0) : y[k].v0.toLocaleString()}</td><td>${money ? $m(y[k].v1) : y[k].v1.toLocaleString()}</td><td>${pct((y[k].v1 / y[k].v0 - 1) * 100)}</td></tr>` : '';
  const s = (S.summary || {}).Sold || {}, ca = (S.summary || {})['Current Active'] || {};
  return `<table class="facts"><tr><th>${mkSeg() === 'condo' ? 'Condos' : 'Home Estate/PUD'} · year to date through ${monthName(ym)}</th><th>${(y.sold || {}).y0 || ''}</th><th>${(y.sold || {}).y1 || ''}</th><th>Change</th></tr>
    ${row('Closed sales', 'sold')}${row('Entered escrow', 'escrow')}${row('Median sale price', 'medSale', 1)}${row('Median w/o Hope Ranch/Montecito', 'medSaleX', 1)}${row('Average sale price', 'avgSale', 1)}${row('Active listings', 'active')}${row('New listings', 'newL')}${row('Median list price', 'medList', 1)}${row('Sold volume', 'volume', 1)}</table>
    <p class="help">${monthName(ym)}: ${s.total ?? '—'} sales, median ${$m(s.medSold)}, average ${s.dom ?? '—'} days on market (${s.cdom ?? '—'} continuous) · ${ca.total ?? '—'} current active listings.</p>`;
}

/* her ask (Oct 20 2026): a legend on the price-trend graphs – what each dot and line colour means */
function chartLegend(g, RR, items) { g.save(); g.font = '600 18px Inter, Arial, sans-serif'; g.textAlign = 'left'; const y = 680 - 20;   // one row under the month labels, right-aligned (so it is also in the saved picture)
  const ws = items.map(x => g.measureText(x[2]).width + 40); let x = RR - ws.reduce((a, b) => a + b, 0) - 20 * (items.length - 1);
  items.forEach(([c, kind, label], i) => { g.fillStyle = c; if (kind === 'dot') { g.beginPath(); g.arc(x + 10, y - 6, 7, 0, Math.PI * 2); g.fill(); } else { g.fillRect(x, y - 8, 24, 5); g.beginPath(); g.arc(x + 12, y - 6, 5, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#000'; g.fillText(label, x + 32, y); x += ws[i] + 20; }); g.restore(); }
