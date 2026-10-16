/* =====================================================================
   Market conditions (UAD 3.6 section 17, Fannie Mae Appendix A-1)
   MICRO: her SBMLS market-area search (CSV export) → counts, prices, DOM, supply, trend.
   MACRO: the monthly SBMLS statistics PDF (+ Zillow figures she types) → context for the comment.
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
    return { mls: g('Listing Number'), status: st, typ: g('TYP') || g('Property Type') || '', district: g('District'), addr, unit: g('Unit/Space #'),
      listDate: G.isoDate(g('Begin Date', 'Start Active Date')), contractDate: G.isoDate(g('Under Contract Date')), saleDate: G.isoDate(g('Sold Date', 'COE')),
      offDate: ['A', 'P', 'C', 'U', 'S'].includes(st) ? '' : (offs[0] || G.isoDate(g('Status Change Date'))), fallDate: G.isoDate(g('Fallthrough Date')),
      listPrice: G.num(g('Price')), origList: G.num(g('Original List Price')), salePrice: G.num(g('Sold Price')), dom: G.num(g('Days On Market')), cdom: G.num(g('Cumulative DOM')),
      gla: G.num(g('Total SqFt.', 'Total SqFt')), details, distressed: details.some(d => DISTRESS_RE.test(d)), twoUnits: /^\d+[A-Za-z]?\s*[\/&-]\s*\d+/.test(addr) };
  }).filter(r => r.mls);
}
function statusAt(r, eff) { // what the listing was on the effective date
  if (r.listDate && r.listDate > eff) return '';
  if (r.saleDate && r.saleDate <= eff) return 'sold';
  if (r.offDate && r.offDate <= eff) return '';
  const fell = r.fallDate && r.contractDate && r.fallDate >= r.contractDate && r.fallDate <= eff;
  if (r.contractDate && r.contractDate <= eff && !fell) return 'pending';
  if (r.status === 'C' && !r.saleDate) return '';
  return r.listDate ? 'active' : '';
}
function mkEff() { return (cur && effectiveDate(readForm())) || todayISO(); }
function MI() { const m = M(); m.micro = m.micro || { rows: [], exclude: {}, types: null }; return m.micro; }
function mkCompute(src) {   // src: the market-area search (default) or the comparable-sales search
  const m = M(), eff = mkEff(), L = +m.lookback || 12, start = isoAddMonths(eff, -L); src = src || m;
  const nearToday = daysBetween(eff, todayISO()) <= 3; // current assignment: MLS days on market are as of the export
  const types = src.types; const out = { eff, start, L, rows: [] };
  (src.rows || []).forEach(r => {
    const s = statusAt(r, eff); let use = s && !(src.exclude || {})[r.mls] && (!types || types.includes(r.typ));
    if (s === 'sold' && r.saleDate <= start) use = false;
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
function mkCommentDraft(R) {
  const seg = mkSeg(), st = mkStatsFor(R.eff), S = st && st[seg]; const parts = [];
  const segName = seg === 'condo' ? 'condominium' : 'Home Estate/PUD';
  parts.push([1, `Market conditions are analyzed as of the effective date of ${shortDate(R.eff)}.`]);
  if (R.salesN || R.activeN) {
    let s = `The search of competing properties within the market area boundary (search criteria above) shows ${R.salesN} closed sale${R.salesN === 1 ? '' : 's'} in the ${R.L} months before the effective date` + (R.salesN ? ` (${$m(R.saleLow)} to ${$m(R.saleHigh)}, median ${$m(R.saleMed)})` : '')
      + `, ${R.activeN} active listing${R.activeN === 1 ? '' : 's'}` + (R.activeN ? ` (median list price ${$m(R.activeMed)}, median ${Math.round(R.activeDom)} days on market)` : '') + ` and ${R.pendingN} pending sale${R.pendingN === 1 ? '' : 's'}.`;
    parts.push([1, s]);
    { const Q = MI().rows.length ? mkCompute(M()) : null; if (Q && Q.salesN) { const ppsf = Q.S.filter(r => r.salePrice && r.gla).map(r => r.salePrice / r.gla); const stl = Q.S.filter(r => r.salePrice && r.listPrice).map(r => r.salePrice / r.listPrice);
      parts.push([1, `All residential sales within the market area boundary (${Q.salesN} sale${Q.salesN === 1 ? '' : 's'}, ${$m(Q.saleLow)} to ${$m(Q.saleHigh)}, median ${$m(Q.saleMed)}${stl.length ? ', median sale-to-list ' + Math.round(median(stl) * 1000) / 10 + '%' : ''}${Q.saleDom != null ? ', median ' + Math.round(Q.saleDom) + ' days on market' : ''}) were considered as context.`]); } }
    if (R.supply != null) parts.push([1, `At the rate of about ${(Math.round(R.perMonth * 10) / 10)} sale${Math.round(R.perMonth * 10) === 10 ? '' : 's'} per month, current inventory represents approximately ${(Math.round(R.supply * 10) / 10)} months of supply` + (R.saleDom != null ? `, and the median marketing time of the sales was ${Math.round(R.saleDom)} days.` : '.')]);
    else parts.push([1, `There were no closed sales in the lookback period, so an absorption rate could not be measured; the available listings and pending sales were considered.`]);
    if (R.salesN < MK_MIN_SALES) parts.push([1, `The ${R.salesN} competing sale${R.salesN === 1 ? '' : 's'} within the defined market area ${R.salesN === 1 ? 'is' : 'are'} not sufficient to measure a reliable price trend, and price per square foot is not a reliable measure because it does not account for differences in lot utility, quality, condition, bathrooms, features, pools and spas, outbuildings, accessory dwelling units and view. The broader market was therefore considered.`]);
    else parts.push([1, `Changes in market conditions were considered within the competing sales and in the broader market.`]);
  }
  if (S && S.ytd && S.ytd.sold) { const y = S.ytd, f = (k, w) => y[k] ? `${w} ${y[k].v1 >= y[k].v0 ? 'up' : 'down'} about ${Math.abs(Math.round((y[k].v1 / y[k].v0 - 1) * 1000) / 10)}%` : '';
    const bits = [f('sold', 'closed sales'), f('escrow', 'properties entering escrow'), y.medSale ? `${f('medSale', 'the median sales price')} (${$m(y.medSale.v1)} vs. ${$m(y.medSale.v0)})` : '', f('active', 'active listings')].filter(Boolean);
    if (bits.length > 1) bits[bits.length - 1] = 'and ' + bits[bits.length - 1];
    parts.push([3, `For the South Coast (SBMLS Districts 05-35), ${segName} statistics through ${monthName(st.ym)} compared with the same period of ${y.sold.y0} show ${bits.join(', ')}.` + (y.medSaleX ? ` Without Hope Ranch and Montecito, the median sales price was ${y.medSaleX.v1 >= y.medSaleX.v0 ? 'up' : 'down'} about ${Math.abs(Math.round((y.medSaleX.v1 / y.medSaleX.v0 - 1) * 1000) / 10)}%.` : '')]); }
  const H = mkHistory(seg).filter(x => x.ym <= R.eff.slice(0, 7)).slice(-12).filter(x => x.median);
  if (H.length >= 6) { const lo = H.reduce((a, b) => b.median < a.median ? b : a), hi = H.reduce((a, b) => b.median > a.median ? b : a), last = H[H.length - 1];
    parts.push([4, `Over the prior 12 months, monthly median sale prices ranged from about ${$m(lo.median)} (${monthName(lo.ym)}) to ${$m(hi.median)} (${monthName(hi.ym)}), with ${monthName(last.ym)} at ${$m(last.median)}${last.sales ? ' on ' + last.sales + ' sales' : ''}, without a consistent month-to-month direction.`]); }
  const zk = mkZKey(); const z = zk && MK.zillow[zk]; const zWhere = zk && zk.startsWith('zip:') ? `ZIP code ${zk.slice(4)} (ZIP-code level data, used as supporting context; the defined market area is not the same as the ZIP code)` : mkCity();
  if (z && z.value) parts.push([5, `Zillow reports a typical home value for ${zWhere} of ${$m(z.value)}${z.asOf ? ' as of ' + shortDate(z.asOf) : ''}${z.change != null && z.change !== '' ? ', ' + (z.change >= 0 ? 'up' : 'down') + ' ' + Math.abs(z.change) + '% over one year' : ''}${z.dtp ? ', with a median of ' + z.dtp + ' days to pending' : ''}.`]);
  const TC = { increasing: 'increasing', stable: 'stable', declining: 'declining' }[M().trendConcl];
  if (TC) parts.push([1, `Based on the competing sales and the broader market data, market values are considered ${TC} as of the effective date.`]);
  parts.push([1, `Aggregate statistics reflect changes in the mix, location and price range of the properties sold and are considered as market context; the market-condition conclusion and any date-of-sale/market-condition adjustment are based on ${R.salesN < MK_MIN_SALES ? 'the broader market data together with the competing sales' : 'evidence within the subject\'s competitive market segment'}. No forecast of future market conditions or value is intended.`]);
  // keep within 2,500 characters: drop the least important parts first
  let keep = parts.slice(); const len = () => keep.map(p => p[1]).join(' ').length;
  for (const pr of [5, 4, 2, 3]) { if (len() <= 2500) break; keep = keep.filter(p => p[0] !== pr); }
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
const AT_ORDER = ['active', 'pending', 'sold', 'older sale', ''];
function mkTable(R, src, which) {
  const S = MKSORT[which]; const val = (r, k) => k === 'at' ? AT_ORDER.indexOf(r.at || '') : k === 'ppsf' ? (r.salePrice && r.gla ? r.salePrice / r.gla : null) : k === 'addr' ? String(r.addr || '').toLowerCase() : r[k];
  const rows = R.rows.slice().sort((a, b) => { const x = val(a, S.k), y = val(b, S.k); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * S.dir || String(b.saleDate || b.listDate).localeCompare(String(a.saleDate || a.listDate)); });
  const th = (k, l) => `<th data-mksort="${which}|${k}" class="sortable${S.k === k ? ' on' : ''}" title="Sort">${l}${S.k === k ? (S.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const inc = which === 'micro' ? 'data-mkinc2' : 'data-mkinc';
  return `<div class="tableWrap"><table class="facts mkrows"><tr><th></th>${th('addr', 'Address')}${th('at', 'On ' + h(shortDate(R.eff)))}${th('listDate', 'Listed')}${th('listPrice', 'List price')}${th('contractDate', 'Contract')}${th('saleDate', 'Sold')}${th('salePrice', 'Sale price')}${th('ppsf', '$ / sq ft')}${th('domAt', 'DOM')}${th('gla', 'Sq ft')}<th>Notes</th></tr>
    ${rows.map(r => `<tr class="${r.use ? '' : 'off'}">
      <td><input type="checkbox" ${inc}="${h(r.mls)}" ${(src.exclude || {})[r.mls] ? '' : 'checked'} title="Use this listing" aria-label="Use ${h(r.addr)}"></td><td>${h(r.addr)}${r.unit ? ' #' + h(r.unit) : ''}<small>MLS ${h(r.mls)} · ${h(r.typ)}</small></td>
      <td>${h(r.at || 'not on the market')}</td><td>${h(shortDate(r.listDate))}</td><td>${h($m(r.listPrice))}</td><td>${h(shortDate(r.contractDate))}</td><td>${h(shortDate(r.saleDate))}</td><td>${h($m(r.salePrice))}</td><td>${r.salePrice && r.gla ? h($m(r.salePrice / r.gla)) : ''}</td><td>${h(r.domAt ?? '')}</td><td>${r.gla ? Math.round(r.gla).toLocaleString() : ''}</td>
      <td>${[r.twoUnits ? 'two units? (left out)' : '', r.distressed ? '<b>distressed: ' + h(r.details.join(', ')) + '</b>' : r.details.length ? h(r.details.join(', ')) : ''].filter(Boolean).join(' · ')}</td></tr>`).join('')}</table></div>`;
}
async function mkAddSearch(file, which) {
  try { const rows = parseMarketCsv(await G.readText(file)); const m = which === 'micro' ? MI() : M(); m.rows = rows; m.file = file.name; m.exclude = {}; rows.filter(r => r.twoUnits).forEach(r => { m.exclude[r.mls] = true; });
    m.types = null; mkChanged(); mkRender(true); toast(`${rows.length} listings read from ${file.name}` + (which === 'micro' ? ' (comparable-sales search)' : ' (market area)'));
    if (!(cur.docs || []).some(d => d.name === file.name)) addDocs([file]); // keep the search with the order's documents
  } catch (e) { toast(e.message || 'Could not read that file'); }
}
async function mkAddStats(file) {
  try { toast('Reading the statistics PDF…'); const st = parseStatsPdf(await pdfItems(file)); st.file = file.name; MK.stats[st.ym] = st; await mkSave('stats');
    const n = Object.keys(st.he.monthly).length; mkRender(); toast(`SBMLS statistics for ${monthName(st.ym)} loaded (${n} months of medians)` + (st.warn.some(x => (mkSeg() === 'condo') === /condo/i.test(x)) ? ' – see the note about its charts' : ''), 5000); }
  catch (e) { console.error(e);
    if (/zillow/i.test(file.name)) { await mkAddZillow(file); return; }
    toast((e.message || 'Could not read that PDF') + ' This box is for the monthly statistics report from SBAOR. A Zillow page goes under Zillow below.', 7000); }
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
function mkRender(redraft) {
  const box = $('#mkBody'); if (!box || !cur) return; const m = M(); const RA = mkCompute(); const R = MI().rows.length ? mkCompute(MI()) : RA; mkLast = R;
  if (redraft || m.comment == null) { if (R.rows.length || Object.keys(MK.stats).length) { if (!m.commentEdited) m.comment = mkCommentDraft(R); if (!m.criteriaEdited) m.criteria = mkCriteriaDraft(R); } }
  const pick = (k, list) => m[k] || R.suggest[{ supply: 'supply', mktime: 'mktime', distress: 'distress' }[k]] || '';
  const sel = (k, list, sug) => `<select data-mk="${k}">${['', ...list.map(x => x[0])].map(v => `<option value="${v}"${pick(k) === v ? ' selected' : ''}>${v ? list.find(x => x[0] === v)[1] : '—'}</option>`).join('')}</select>${sug ? ` <small class="${m[k] && m[k] !== sug ? 'warnTxt' : 'muted'}">suggested: ${h((list.find(x => x[0] === sug) || [, ''])[1])}</small>` : ''}`;
  { // snapshot for the full report (Comp genie reads it from this order)
    const U = { eff: R.eff, L: R.L, boundary: m.boundary || '', criteria: m.criteria || '', comment: m.comment || '', activeN: R.activeN, activeLow: R.activeLow, activeMed: R.activeMed, activeHigh: R.activeHigh, activeDom: R.activeDom,
      pendingN: R.pendingN, salesN: R.salesN, saleLow: R.saleLow, saleMed: R.saleMed, saleHigh: R.saleHigh, supply: pick('supply'), mktime: pick('mktime'), distress: pick('distress'), sources: m.sources || ['SBMLS'] };
    if (R.rows.length && JSON.stringify(U) !== JSON.stringify(m.uad)) { m.uad = U; mkChanged(); } }
  const typesAll = [...new Set((m.rows || []).map(r => r.typ).filter(Boolean))];
  const st = mkStatsFor(R.eff); const city = mkCity(); const zKey = mkZKey(); const z = MK.zillow[zKey] || {}; const zipNow = (String(readForm().zip || '').match(/\d{5}/) || [''])[0];
  const sources = m.sources || ['SBMLS'].concat(z.value ? ['Zillow'] : []);
  const cnt = (id, max) => `<span class="cnt" data-cnt="${id}" data-max="${max}"></span>`;
  box.innerHTML = `
  <div class="mkgrid">
  <section class="mkcard"><h3>1 · Market Area Boundary (17.003) – everything inside your boundaries <small>the broader market: background for the Market Commentary and Price Trend Analysis</small></h3>
    <div class="grid3"><label>Effective date<input value="${h(shortDate(R.eff))}" disabled></label>
      <label>Look back<select data-mk="lookback">${[3, 6, 12, 18, 24, 36].map(n => `<option value="${n}"${+m.lookback === n ? ' selected' : ''}>${n} months</option>`).join('')}</select></label>
      <label>Property types${typesAll.length ? `<span class="types">${typesAll.map(t => `<label class="check"><input type="checkbox" data-mktype="${h(t)}" ${!m.types || m.types.includes(t) ? 'checked' : ''}>${h(t)}</label>`).join('')}</span>` : '<input disabled value="from the search">'}</label></div>
    <p class="help">The effective date comes from the order (inspection date, or the date of death for retrospective work). Change it on the Order &amp; letter tab.</p>
    <div class="drop" id="mkDrop"><div><span class="eyebrow">Market Area Boundary search (macro)</span><p class="help">In Flexmls, search all residential listings inside your market area boundaries (actives, pendings and sales for the look-back period), export the CSV and drop it here.${m.file ? ' Loaded: <b>' + h(m.file) + '</b>' : ''}</p></div>
      <label class="btn" for="mkFile">Choose CSV<input type="file" id="mkFile" accept=".csv,text/csv"></label></div>
    ${(cur.docs || []).some(d => d.type === 'marketSearch' && /\.csv$/i.test(d.name)) && !m.rows.length ? '<p><button type="button" class="btn small" id="mkFromDocs">Use the market search in this order’s documents</button></p>' : ''}
    ${m.rows.length ? mkTable(RA, m, 'macro') + '<p class="help">Untick a listing that is not competitive with the subject (wrong property type, two units on one lot, a different market). It is left out of every number below. Click a column heading to sort.</p>' : ''}
  </section>
  <section class="mkcard"><h3>2 · Search Criteria (17.004) – the comparable properties within the boundaries <small>fills the UAD 3.6 Search Result Metrics (17.005–17.016)</small></h3>
    <div class="drop" id="mkDrop2"><div><span class="eyebrow">Search Criteria search (micro)</span><p class="help">Your Flexmls search of the properties within the boundaries that compete with the subject (the same one you use for the 1004MC and, in a 2.6 report, the comparable listings and sales line at the top of the Sales Comparison Approach). Export the CSV and drop it here. Its results are the 3.6 Search Result Metrics, Demand/Supply and Marketing Time. Until it is loaded, the boundary search above is used.${MI().file ? ' Loaded: <b>' + h(MI().file) + '</b>' : ''}</p></div>
      <label class="btn" for="mkFile2">Choose CSV<input type="file" id="mkFile2" accept=".csv,text/csv"></label></div>
    ${MI().rows.length ? (() => { const Q = R; const ppsf = Q.S.filter(r => r.salePrice && r.gla).map(r => r.salePrice / r.gla), stl = Q.S.filter(r => r.salePrice && r.listPrice).map(r => r.salePrice / r.listPrice);
      return `<table class="facts uad mkmini"><tr><th>Sales in the look-back</th><td>${Q.salesN}${Q.salesN ? ` · ${$m(Q.saleLow)} / ${$m(Q.saleMed)} / ${$m(Q.saleHigh)} (low / median / high)` : ''}</td></tr>
<tr><th>Median sale-to-list</th><td>${stl.length ? Math.round(median(stl) * 1000) / 10 + '%' : '—'}</td></tr>
        <tr><th>Median days on market (sales)</th><td>${Q.saleDom != null ? Math.round(Q.saleDom) : '—'}</td></tr><tr><th>Active / pending now</th><td>${Q.activeN} / ${Q.pendingN}</td></tr>
        <tr><th>Price trend</th><td>${Q.salesN < MK_MIN_SALES ? 'not enough competing sales to measure (' + Q.salesN + ') – the comment uses the broader market' : Q.salesN + ' competing sales'}</td></tr></table>` + mkTable(Q, MI(), 'micro'); })() : ''}
  </section>
  <section class="mkcard"><h3>3 · UAD 3.6 Market section</h3><p class="help">${MI().rows.length ? 'Search Result Metrics from the Search Criteria search (box 2).' : '<b class="warnTxt">Box 2 is empty</b> – these metrics use the Market Area Boundary search (box 1) for now.'}</p>
    <table class="facts uad"><tr><th>17.003 Market Area Boundary</th><td><textarea data-mk="boundary" rows="3" maxlength="1250" placeholder="e.g. Samarkand neighborhood: bounded by De la Vina St, State St, Las Positas Rd and Highway 101">${h(m.boundary || '')}</textarea>${cnt('boundary', 1250)}
      <div class="row"><select id="mkBndPick"><option value="">Use a saved area…</option>${MK.boundaries.map((b, i) => `<option value="${i}">${h(b.name)}</option>`).join('')}</select><button type="button" class="btn ghost small" id="mkBndSave">Save this area</button><button type="button" class="btn ghost small" data-copy="boundary">Copy</button></div></td></tr>
    <tr><th>17.004 Search Criteria Description</th><td><textarea data-mk="criteria" rows="3" maxlength="1250">${h(m.criteria || '')}</textarea>${cnt('criteria', 1250)}<div class="row"><button type="button" class="btn ghost small" data-redraft="criteria">Draft again</button><button type="button" class="btn ghost small" data-copy="criteria">Copy</button></div></td></tr>
    <tr><th>17.011 Sales in Past ___ Months (look-back)</th><td>${R.L}</td></tr>
    <tr><th>17.005 Active Listings</th><td>${R.activeN}</td></tr>
    <tr><th>17.007 / 17.008 / 17.009 Lowest / Median / Highest List Price</th><td>${R.activeN ? `${$m(R.activeLow)} / ${$m(R.activeMed)} / ${$m(R.activeHigh)}` : '<small class="muted">not needed when there are no actives</small>'}</td></tr>
    <tr><th>17.006 Median Days on Market (actives)</th><td>${R.activeN ? Math.round(R.activeDom) : '<small class="muted">not needed when there are no actives</small>'}</td></tr>
    <tr><th>17.010 Pending Sales</th><td>${R.pendingN}</td></tr>
    <tr><th>17.012 Sales in Past ${R.L} Months</th><td>${R.salesN}</td></tr>
    <tr><th>17.013 / 17.014 / 17.015 Lowest / Median / Highest Sale Price</th><td>${R.salesN ? `${$m(R.saleLow)} / ${$m(R.saleMed)} / ${$m(R.saleHigh)}` : '<small class="muted">not needed when there are no sales</small>'}</td></tr>
    <tr><th>17.016 Distressed Market Competition</th><td>${sel('distress', [['false', 'No'], ['true', 'Yes']], R.rows.length ? R.suggest.distress : '')}${R.distressed.length ? `<small> ${R.distressed.length} REO / short sale / foreclosure listing${R.distressed.length > 1 ? 's' : ''}. Estate and trust sales are not distressed.</small>` : ''}</td></tr>
    <tr><th>17.021 Demand/Supply</th><td>${sel('supply', SUPPLY, R.suggest.supply)}<small class="muted"> ${R.supply != null ? `${(Math.round(R.supply * 10) / 10)} months of supply (${R.activeN} actives ÷ ${(Math.round(R.perMonth * 100) / 100)} sales a month). Guide: under 4 shortage, 4–6 in balance, over 6 oversupply.` : 'No sales in the look-back period, so no months of supply.'}</small></td></tr>
    <tr><th>17.022 Marketing Time</th><td>${sel('mktime', MKTIME, R.suggest.mktime)}<small class="muted"> ${R.saleDom != null ? `median ${Math.round(R.saleDom)} days on market (cumulative) for the sales` : ''}</small></td></tr>
    <tr><th>17.018 Price Trend Source <small>one per line, 33 characters each</small></th><td><textarea data-mk="sources" rows="2">${h(sources.join('\n'))}</textarea></td></tr>
    <tr><th>Your price-trend conclusion</th><td><select data-mk="trendConcl"><option value="">—</option><option value="increasing"${m.trendConcl === 'increasing' ? ' selected' : ''}>Increasing</option><option value="stable"${m.trendConcl === 'stable' ? ' selected' : ''}>Stable</option><option value="declining"${m.trendConcl === 'declining' ? ' selected' : ''}>Declining</option></select> <small class="muted">added as the last sentence of the draft</small></td></tr>
    <tr><th>17.019 Price Trend Analysis Commentary</th><td><textarea data-mk="comment" rows="10" maxlength="2500">${h(m.comment || '')}</textarea>${cnt('comment', 2500)}
      <div class="row"><button type="button" class="btn ghost small" data-redraft="comment">Draft again</button><button type="button" class="btn ghost small" data-copy="comment">Copy</button></div>
      <p class="help">Drafted from the numbers on this page in your wording. Edit freely; your edits are kept until you press Draft again.</p></td></tr></table>
  </section>
  <section class="mkcard"><h3>4 · Graphs for the report</h3>
    <p class="help">Each one saves as a picture for the report's market exhibits (UAD image types: Price Trend, Absorption Rate).</p>
    <figure><canvas id="mkG1"></canvas><div class="row"><label class="check"><input type="checkbox" id="mkPsf" ${m.perSf ? 'checked' : ''}>Price per square foot</label><button type="button" class="btn small" data-png="mkG1">Save picture</button></div></figure>
    <figure><canvas id="mkG2"></canvas><div class="row"><button type="button" class="btn small" data-png="mkG2">Save picture</button></div></figure>
    <figure><canvas id="mkG3"></canvas><div class="row"><button type="button" class="btn small" data-png="mkG3">Save picture</button></div></figure>
  </section>
  <section class="mkcard"><h3>5 · Big picture: SBMLS monthly statistics and Zillow</h3>
    <div class="drop" id="mkStatsDrop"><div><span class="eyebrow">SBMLS Monthly MLS Statistics PDF</span><p class="help">The monthly statistics report from the Santa Barbara Association of REALTORS® (Summary of Stats for Home Estate/PUD Districts 05–35 and condos: sales, pendings, new and active listings, median and average prices, days on market, year-to-date comparisons). Load each month's PDF once; every order uses it. ${Object.keys(MK.stats).length ? 'Loaded: ' + Object.keys(MK.stats).sort().map(monthName).join(', ') + '.' : 'None loaded yet.'}${st ? ' This order uses <b>' + monthName(st.ym) + '</b>.' : ''}</p></div>
      <label class="btn" for="mkStatsFile">Choose PDF<input type="file" id="mkStatsFile" accept=".pdf,application/pdf"></label></div>
    ${st ? mkStatsTable(st[mkSeg()], st.ym) : ''}${(() => { const segW = mkSeg() === 'condo' ? /condo/i : /^(?!.*condo)/i; const w = st && st.warn ? st.warn.filter(x => segW.test(x)) : []; return w.length ? `<p class="help warnTxt">${w.map(h).join(' ')} This month's own totals from its Summary of Stats page were used instead.</p>` : ''; })()}
    <h4>Zillow – ${h(zKey.startsWith('zip:') ? 'ZIP ' + zKey.slice(4) : (city || 'the subject’s city'))}</h4><div class="zby"><label class="check"><input type="radio" name="zby" value="zip" ${zKey.startsWith('zip:') ? 'checked' : ''} ${zipNow ? '' : 'disabled'}>Subject's ZIP code${zipNow ? ' (' + zipNow + ')' : ''} – best for unincorporated areas</label><label class="check"><input type="radio" name="zby" value="city" ${zKey.startsWith('zip:') ? '' : 'checked'}>Zillow's city page for the mailing city${city ? ' (' + h(city) + ')' : ''}</label></div>${/Unincorporated/.test(readForm().jurisdiction || '') ? '<p class="help">This property is in ' + h(readForm().jurisdiction) + ' (from the County permit history), so the mailing city is not its city – use the ZIP code.</p>' : ''}<p class="help">Type the figures from Zillow's page for this ZIP code or city. They are kept for it and used for every order there. In the comment, ZIP-code data is described as supporting context.</p>
    <div class="drop" id="mkZilDrop"><div><span class="eyebrow">Zillow page (PDF or picture)</span><p class="help">Keep the Zillow page with this order (workfile, or a market exhibit). On zillow.com search the ZIP code (for example 93111), choose Single family and 5-yr, then save the page. To have the figures fill in, save the page from Chrome with <b>Print › Save as PDF</b> (set Pages to Custom 1-2 to keep just the overview and graph) (a Snagit or screenshot PDF is only a picture, so type its figures instead).${(cur.docs || []).filter(d => d.type === 'zillow').map(d => `<br>Kept: <button type="button" class="lnk" data-zopen="${d.id}">${h(d.name)}</button>`).join('')}</p></div>
      <label class="btn" for="mkZilFile">Choose file<input type="file" id="mkZilFile" accept=".pdf,image/*"></label></div>
    <div class="grid3 zil"><label>As of<input type="date" data-z="asOf" value="${h(z.asOf || '')}"></label><label>Typical home value ($)<input data-z="value" inputmode="numeric" value="${h(z.value ? Number(z.value).toLocaleString() : '')}"></label><label>1-year change (%)<input data-z="change" inputmode="decimal" value="${h(z.change ?? '')}"></label>
      <label>Median sale price ($)<input data-z="medSale" inputmode="numeric" value="${h(z.medSale ? Number(z.medSale).toLocaleString() : '')}"></label><label>Sale-to-list ratio<input data-z="stl" inputmode="decimal" value="${h(z.stl || '')}"></label><label>Median days to pending<input data-z="dtp" inputmode="numeric" value="${h(z.dtp || '')}"></label></div>
  </section></div>
  <div class="formEnd"><button type="button" class="btn" id="mkSaveBtn">Save</button><a class="btn primary" id="mkGenie" href="${h(genieURL(cur))}" target="aa-genie">Save and open the Comp genie →</a><button type="button" class="btn ghost" id="mkOrderBtn">Back to the order</button><span class="savedAt" data-saved></span></div>`;
  // graphs
  drawPriceTrend($('#mkG1'), R, !!m.perSf); drawAbsorption($('#mkG2'), R); drawMacro($('#mkG3'), mkSeg());
  // wiring
  const dz = $('#mkDrop'); ['dragover', 'dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddSearch(e.dataTransfer.files[0]); }));
  const sz = $('#mkStatsDrop'); ['dragover', 'dragleave', 'drop'].forEach(ev => sz.addEventListener(ev, e => { e.preventDefault(); sz.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddStats(e.dataTransfer.files[0]); }));
  $('#mkFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddSearch(f); };
  $('#mkFile2').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddSearch(f, 'micro'); };
  { const z2 = $('#mkDrop2'); ['dragover', 'dragleave', 'drop'].forEach(ev => z2.addEventListener(ev, e => { e.preventDefault(); z2.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddSearch(e.dataTransfer.files[0], 'micro'); })); }
  box.querySelectorAll('[data-mksort]').forEach(th => th.onclick = () => { const [w, k] = th.dataset.mksort.split('|'); const S = MKSORT[w]; MKSORT[w] = { k, dir: S.k === k ? -S.dir : (['listPrice', 'salePrice', 'domAt', 'gla', 'ppsf'].includes(k) ? -1 : 1) }; mkRender(); });
  box.querySelectorAll('[data-mkinc2]').forEach(cb => cb.onchange = () => { const q = MI(); q.exclude = q.exclude || {}; if (cb.checked) delete q.exclude[cb.dataset.mkinc2]; else q.exclude[cb.dataset.mkinc2] = true; mkChanged(); mkRender(true); });
  $('#mkStatsFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddStats(f); };
  const fd = $('#mkFromDocs'); if (fd) fd.onclick = async () => { const d = cur.docs.find(d => d.type === 'marketSearch' && /\.csv$/i.test(d.name)); const f = await docFile(d.id); if (f) mkAddSearch(f); };
  box.querySelectorAll('[data-mkinc]').forEach(cb => cb.onchange = () => { m.exclude = m.exclude || {}; if (cb.checked) delete m.exclude[cb.dataset.mkinc]; else m.exclude[cb.dataset.mkinc] = true; mkChanged(); mkRender(true); });
  box.querySelectorAll('[data-mktype]').forEach(cb => cb.onchange = () => { m.types = [...box.querySelectorAll('[data-mktype]:checked')].map(x => x.dataset.mktype); mkChanged(); mkRender(true); });
  box.querySelectorAll('select[data-mk]').forEach(s => s.onchange = () => { const k = s.dataset.mk; if (k === 'lookback') { m.lookback = +s.value; mkChanged(); mkRender(true); return; } m[k] = s.value; mkChanged(); mkRender(k === 'trendConcl' && !m.commentEdited); });
  box.querySelectorAll('textarea[data-mk]').forEach(t => t.oninput = () => { const k = t.dataset.mk; if (k === 'sources') m.sources = t.value.split('\n').map(x => x.trim().slice(0, 33)).filter(Boolean); else { m[k] = t.value; if (k === 'comment') m.commentEdited = true; if (k === 'criteria') m.criteriaEdited = true; } if (m.uad && ['boundary', 'criteria', 'comment'].includes(k)) m.uad[k] = t.value; mkCounts(); mkChanged(); });
  box.querySelectorAll('[data-redraft]').forEach(b => b.onclick = () => { const k = b.dataset.redraft; m[k] = k === 'comment' ? mkCommentDraft(R) : mkCriteriaDraft(R); m[k + 'Edited'] = false; mkChanged(); mkRender(); toast('Drafted again from the current numbers'); });
  box.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(m[b.dataset.copy] || ''); toast('Copied – paste it into SFREP'); } catch (e) { toast('Select the text and press Ctrl+C'); } });
  box.querySelectorAll('[data-png]').forEach(b => b.onclick = () => savePng($('#' + b.dataset.png), G.safeName(`${cur.fileNo || street(cur) || 'Market'} ${{ mkG1: 'Price Trend', mkG2: 'Absorption Rate', mkG3: 'SBMLS South Coast Median' }[b.dataset.png]}`) + '.png'));
  $('#mkSaveBtn').onclick = () => saveLetter(false); $('#mkGenie').onclick = () => saveLetter(true); $('#mkOrderBtn').onclick = () => { saveLetter(true); showTab('letter'); window.scrollTo(0, 0); };
  $('#mkPsf').onchange = e => { m.perSf = e.target.checked; mkChanged(); drawPriceTrend($('#mkG1'), R, m.perSf); };
  $('#mkBndPick').onchange = e => { const b = MK.boundaries[e.target.value]; if (b) { m.boundary = b.text; mkChanged(); mkRender(); } };
  $('#mkBndSave').onclick = () => { const t = (m.boundary || '').trim(); if (!t) { toast('Type the boundary first'); return; } const name = prompt('Name for this market area (for example "Samarkand")'); if (!name) return; const i = MK.boundaries.findIndex(b => b.name === name); if (i >= 0) MK.boundaries[i].text = t; else MK.boundaries.push({ name, text: t }); MK.boundaries.sort((a, b) => a.name.localeCompare(b.name)); mkSave('boundaries'); mkRender(); toast('Saved “' + name + '” for later orders'); };
  $('#mkZilFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) mkAddZillow(f); };
  { const zd = $('#mkZilDrop'); ['dragover', 'dragleave', 'drop'].forEach(ev => zd.addEventListener(ev, e => { e.preventDefault(); zd.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) mkAddZillow(e.dataTransfer.files[0]); })); }
  box.querySelectorAll('[data-zopen]').forEach(b => b.onclick = () => openDoc(b.dataset.zopen));
  box.querySelectorAll('input[name=zby]').forEach(r => r.onchange = () => { m.zillowBy = r.value; mkChanged(); mkRender(!m.commentEdited); });
  box.querySelectorAll('[data-z]').forEach(i => i.onchange = () => { if (!zKey) { toast('Fill in the property address first'); return; } const zz = MK.zillow[zKey] = MK.zillow[zKey] || {}; const k = i.dataset.z; { const n = Number(String(i.value).replace(/[$,%\s+]/g, '')); zz[k] = k === 'asOf' ? i.value : (i.value.trim() === '' || !isFinite(n) || /^[-–—]+$/.test(i.value.trim())) ? '' : n; i.value = k === 'asOf' ? i.value : zz[k] === '' ? '' : k === 'value' || k === 'medSale' ? Number(zz[k]).toLocaleString() : String(zz[k]); } mkSave('zillow'); if (!m.commentEdited) { m.comment = mkCommentDraft(mkLast || mkCompute()); const t = box.querySelector('textarea[data-mk=comment]'); if (t) t.value = m.comment; mkCounts(); mkChanged(); } });
  mkCounts();
}
function mkCounts() { document.querySelectorAll('[data-cnt]').forEach(s => { const t = document.querySelector(`textarea[data-mk="${s.dataset.cnt}"]`); const n = t ? t.value.length : 0, max = +s.dataset.max; s.textContent = `${n.toLocaleString()} of ${max.toLocaleString()} characters`; s.className = 'cnt' + (n > max ? ' over' : n > max * 0.92 ? ' near' : ''); }); }
function mkStatsTable(S, ym) {
  if (!S) return ''; const y = S.ytd || {}; const row = (l, k, money) => y[k] ? `<tr><th>${l}</th><td>${money ? $m(y[k].v0) : y[k].v0.toLocaleString()}</td><td>${money ? $m(y[k].v1) : y[k].v1.toLocaleString()}</td><td>${pct((y[k].v1 / y[k].v0 - 1) * 100)}</td></tr>` : '';
  const s = (S.summary || {}).Sold || {}, ca = (S.summary || {})['Current Active'] || {};
  return `<table class="facts"><tr><th>${mkSeg() === 'condo' ? 'Condos' : 'Home Estate/PUD'} · year to date through ${monthName(ym)}</th><th>${(y.sold || {}).y0 || ''}</th><th>${(y.sold || {}).y1 || ''}</th><th>Change</th></tr>
    ${row('Closed sales', 'sold')}${row('Entered escrow', 'escrow')}${row('Median sale price', 'medSale', 1)}${row('Median w/o Hope Ranch/Montecito', 'medSaleX', 1)}${row('Average sale price', 'avgSale', 1)}${row('Active listings', 'active')}${row('New listings', 'newL')}${row('Median list price', 'medList', 1)}${row('Sold volume', 'volume', 1)}</table>
    <p class="help">${monthName(ym)}: ${s.total ?? '—'} sales, median ${$m(s.medSold)}, average ${s.dom ?? '—'} days on market (${s.cdom ?? '—'} continuous) · ${ca.total ?? '—'} current active listings.</p>`;
}
