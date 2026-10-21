/* =====================================================================
   The comp model: fields, which source fills each field, flags.
   ===================================================================== */
const SRC = {
  edit: { name: 'Yours', short: 'You' },
  arch: { name: 'My database', short: 'My DB' },
  mls: { name: 'MLS export', short: 'MLS' },
  pdf: { name: 'MLS printout', short: 'Printout' },
  crs: { name: 'CRS report / public record', short: 'CRS' },
  cort: { name: 'CORT', short: 'CORT' },
};
const SRC_ORDER = ['arch', 'mls', 'pdf', 'crs', 'cort'];

/* kind decides the default source:
   sale  – the sale itself: your archive only when that record is this same sale
   phys  – the house: your archive first (your inspection or verification), unless your record is old
   site  – site, view, location: your archive first
   id    – identity
   geo   – map position (MLS / CRS)
   listing – listing history facts: MLS printout first */
const FIELDS = [
  // Sale and listing
  { k: 'mls', l: 'MLS #', g: 'Sale and listing', kind: 'listing', t: 'text' },
  { k: 'status', l: 'Listing status', g: 'Sale and listing', kind: 'sale', t: 'text' },
  { k: 'origList', l: 'Original list price', g: 'Sale and listing', kind: 'listing', t: 'money' },
  { k: 'listPrice', l: 'List price (final, at contract)', g: 'Sale and listing', kind: 'listing', t: 'money' },
  { k: 'salePrice', l: 'Sale / contract price', g: 'Sale and listing', kind: 'sale', t: 'money' },
  { k: 'contractDate', l: 'Contract date', g: 'Sale and listing', kind: 'sale', t: 'date' },
  { k: 'saleDate', l: 'Sale date', g: 'Sale and listing', kind: 'sale', t: 'date' },
  { k: 'dom', l: 'Days on market', g: 'Sale and listing', kind: 'listing', t: 'int' },
  { k: 'cdom', l: 'Cumulative days on market', g: 'Sale and listing', kind: 'listing', t: 'int' },
  { k: 'saleType', l: 'Sale type', g: 'Sale and listing', kind: 'sale', t: 'text' },
  { k: 'financing', l: 'Transfer terms (financing)', g: 'Sale and listing', kind: 'sale', t: 'text' },
  { k: 'concessions', l: 'Known sales concessions ($)', g: 'Sale and listing', kind: 'sale', t: 'money' },
  { k: 'concessionsYN', l: 'Seller concessions (MLS yes/no)', g: 'Sale and listing', kind: 'listing', t: 'text' },
  { k: 'verification', l: 'Your verification notes', g: 'Sale and listing', kind: 'sale', t: 'text' },
  // Location and site
  { k: 'addr', l: 'Street address', g: 'Location and site', kind: 'id', t: 'text' },
  { k: 'unit', l: 'Unit', g: 'Location and site', kind: 'id', t: 'text' },
  { k: 'city', l: 'City', g: 'Location and site', kind: 'id', t: 'text' },
  { k: 'zip', l: 'ZIP', g: 'Location and site', kind: 'id', t: 'text' },
  { k: 'zip4', l: 'ZIP+4 (last 4 digits)', g: 'Location and site', kind: 'id', t: 'text' },
  { k: 'apn', l: 'APN', g: 'Location and site', kind: 'id', t: 'text' },
  { k: 'lat', l: 'Latitude', g: 'Location and site', kind: 'geo', t: 'num6' },
  { k: 'lon', l: 'Longitude', g: 'Location and site', kind: 'geo', t: 'num6' },
  { k: 'nbhd', l: 'Market area', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'locRating', l: 'Location rating', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'locFactors', l: 'Location factors', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'siteSf', l: 'Site size', g: 'Location and site', kind: 'site', t: 'site' },
  { k: 'usableSf', l: 'Usable site', g: 'Location and site', kind: 'site', t: 'site' },
  { k: 'landSplit', l: 'Land split (r/e/o/w acres)', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'topo', l: 'Topography', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'viewRating', l: 'View rating', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'viewTypes', l: 'View', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'viewRange', l: 'View range', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'landscaping', l: 'Landscaping (your scale)', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'fema', l: 'Flood zone (CRS)', g: 'Location and site', kind: 'site', t: 'text' },
  { k: 'hoa', l: 'Association fee ($/month)', g: 'Location and site', kind: 'site', t: 'money' },
  // Improvements
  { k: 'attach', l: 'Attached / detached', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'style', l: 'Design (style)', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'stories', l: 'Stories', g: 'Improvements', kind: 'phys', t: 'num' },
  { k: 'quality', l: 'Quality', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'condition', l: 'Condition', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'mlsCondition', l: 'Condition (MLS words)', g: 'Improvements', kind: 'listing', t: 'text' },
  { k: 'remodel', l: 'Updates / remodel', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'yearBuilt', l: 'Year built', g: 'Improvements', kind: 'phys', t: 'year' },
  { k: 'effAge', l: 'Effective age', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'gla', l: 'Total sq ft (GLA)', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'mainSf', l: 'Main house sq ft', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'otherSf', l: 'Other structures sq ft', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'sfSource', l: 'Sq ft source', g: 'Improvements', kind: 'listing', t: 'text' },
  { k: 'rooms', l: 'Total rooms', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'beds', l: 'Bedrooms', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'full', l: 'Full baths', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'half', l: 'Half baths', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'bathsTotal', l: 'Baths (total, public record)', g: 'Improvements', kind: 'phys', t: 'num' },
  { k: 'bsmtSf', l: 'Basement sq ft', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'bsmtFin', l: 'Basement finished sq ft', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'bgBeds', l: 'Below-grade bedrooms', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'basement', l: 'Basement (MLS)', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'garage', l: 'Garage spaces', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'garageType', l: 'Garage type', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'carport', l: 'Carport spaces', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'driveway', l: 'Driveway spaces', g: 'Improvements', kind: 'phys', t: 'int' },
  { k: 'heatCool', l: 'Heating / cooling', g: 'Improvements', kind: 'phys', t: 'text' },
  { k: 'energy', l: 'Energy features', g: 'Improvements', kind: 'phys', t: 'text' },
  // Amenities and other structures
  { k: 'adu', l: 'ADU', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'guest', l: 'Guest quarters', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'barn', l: 'Barn', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'stable', l: 'Stable', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'horse', l: 'Horse facilities', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'pool', l: 'Pool', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'spa', l: 'Spa', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'tennis', l: 'Tennis court', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'sport', l: 'Sport / pickleball court', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'porch', l: 'Porch / patio / deck', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
  { k: 'accessory', l: 'Other structures', g: 'Amenities and other structures', kind: 'phys', t: 'text' },
];
const FIELD = Object.fromEntries(FIELDS.map(f => [f.k, f]));

const SALE_TYPE_TEXT = { ArmLth: 'Typically motivated', Listing: 'Typically motivated (listing)', REO: 'REO sale', Short: 'Short sale', Estate: 'Estate sale', CrtOrd: 'Court ordered non-foreclosure sale', NonArm: 'Sale between related parties', Relo: 'Relocation sale', Trust: 'Estate sale' };   // her note Oct 20 2026: shown in the 3.6 words (ArmLth = Typically motivated)
function fmt(f, v) {
  if (blank(v)) return '';
  if (f.k === 'saleType') return SALE_TYPE_TEXT[v] || (typeof PICK !== 'undefined' && (PICK.xferTerms.opts.find(o => o[0] === v) || [])[1]) || String(v);
  if (f.k === 'status' && typeof statusText === 'function') return statusText(v);
  if (['guest', 'barn', 'stable', 'horse', 'pool', 'spa', 'tennis', 'sport'].includes(f.k) && /^(no|n|false|0)$/i.test(String(v).trim())) return 'None';   // 3.6 says None, not No (her question Oct 20 2026)   // 3.6 words: Closed → Settled sale
  switch (f.t) {
    case 'money': return money(v);
    case 'int': return int(v);
    case 'year': return String(Math.round(+v));
    case 'num': return String(+(+v).toFixed(2));
    case 'num6': return (+v).toFixed(6);
    case 'date': return showDate(v);
    case 'site': return +v >= 43560 * 0.5 ? (+v / 43560).toFixed(2) + ' ac' : int(v) + ' sf';
    default: return String(v);
  }
}
function parseInput(f, s) { // what she types into "Your value"
  s = String(s ?? '').trim(); if (s === '') return null;
  if (['money', 'int', 'num', 'year', 'num6'].includes(f.t)) return num(s);
  if (f.t === 'date') return isoDate(s) || s;
  if (f.t === 'site') { const m = s.match(/^([\d.,]+)\s*(ac|acre|acres)?$/i); if (!m) return num(s); const n = num(m[1]); return m[2] || n < 200 ? Math.round(n * 43560) : n; }
  return s;
}
const normCmp = (f, v) => {
  if (blank(v)) return null;
  if (f.k === 'addr') return addrKey(v);
  if (f.k === 'apn') return apnKey(v);
  if (['money', 'int', 'num', 'year', 'site', 'num6'].includes(f.t)) return +v;
  if (f.t === 'date') return isoDate(v).slice(0, 7);
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, '');
};
function sameVal(f, a, b) {
  if (f.k === 'apn' && apnKey(a) && apnKey(a) === apnKey(b)) return true;   // 069-172-27 (CORT) = 069-172-027 (CRS)
  const x = normCmp(f, a), y = normCmp(f, b); if (x === null || y === null) return true;
  if (typeof x === 'number') { if (f.t === 'num6') return Math.abs(x - y) < 0.002; if (f.t === 'site') return Math.abs(x - y) <= Math.max(500, 0.03 * Math.max(x, y)); return Math.abs(x - y) <= Math.max(f.t === 'money' ? 1 : 0, 0.005 * Math.max(Math.abs(x), Math.abs(y))); }
  return x === y;
}

/* ---------------- one comp ---------------- */
function newComp(seed) {
  return { id: uid(), created: Date.now(), key: seed.key || '', apn: seed.apn || '', mls: seed.mls || '', label: seed.label || '',
    src: { arch: [], mls: null, pdf: null, crs: null, cort: [] }, archPick: null, cortPick: 0, pick: {}, edit: {}, use: null, photos: [], front: null, notes: '' };
}
const compKeyOf = c => c.key || addrKey(val(c, 'addr').v || c.label);

/* the sale this comp is about: MLS (closed or pending) → CORT → CRS → your archive */
function currentSale(c) {
  const m = c.src.mls, p = c.src.pdf;
  for (const s of [m, p]) if (s && (s.saleDate || s.contractDate || /Pending|Active/i.test(s.status || ''))) return { date: s.saleDate || s.contractDate || s.listDate || '', price: s.salePrice || null, from: s._src, status: s.status };
  const t = c.src.cort[c.cortPick || 0]; if (t && t.saleDate) return { date: t.saleDate, price: t.salePrice, from: 'cort', status: 'Closed' };
  const r = c.src.crs && c.src.crs.lastSale; const rd = r && (r.recorded || r.date); if (r && rd && monthsBetween(rd, todayISO()) < 24) return { date: rd, price: r.price, from: 'crs', status: 'Closed' };
  const a = c.src.arch.find(x => x.v.salePrice); if (a) return { date: a.v.saleDate, price: a.v.salePrice, from: 'arch', status: 'Closed' };
  return null;
}
function archMatches(a, sale) { // is this archive record the same sale?
  if (!sale) return true; if (sale.from === 'arch') return !!a.v.salePrice;
  if (!a.v.salePrice || !a.v.saleDate) return false;
  if (sale.price && Math.abs(a.v.salePrice - sale.price) <= 1000) return true;
  return sale.date ? Math.abs(monthsBetween(a.v.saleDate, sale.date)) <= 1.5 : false;
}
function archChosen(c) {
  if (!c.src.arch.length) return null;
  if (c.archPick !== null && c.archPick !== undefined) { const a = c.src.arch.find(x => x.rec === c.archPick); if (a) return a; }
  const sale = currentSale(c);
  return c.src.arch.find(a => archMatches(a, sale)) || c.src.arch[0];
}
function srcVals(c) { return rcMemo('srcVals', c.id, () => srcVals0(c)); }
function srcVals0(c) { // canonical values per source for this comp
  const a = archChosen(c);
  // show the CRS recorded price beside the others when its last sale is this sale
  let crs = c.src.crs; const sale = currentSale(c);
  /* her rule (Oct 19 2026): in CRS Data the closing (sale) date is the Date Recorded, not the Date column */
  const crsRec = crs && crs.lastSale ? (crs.lastSale.recorded || crs.lastSale.date) : '';
  if (crs && crs.lastSale && sale && sale.date && Math.abs(monthsBetween(crsRec, sale.date)) <= 2) crs = { ...crs, salePrice: crs.lastSale.price, saleDate: crsRec };
  if (crs && crs.salePrice) { const fin = crsFinancing(crs); if (fin) crs = { ...crs, financing: fin }; }
  const finFix = o =>   /* Oct 20 2026: the Flexmls Financing number is not the terms – hidden (also in comps brought in before) */ o && /^\s*\d+\s*$/.test(String(o.financing || '')) ? { ...o, financing: remarkFinancing('', [o.privateRemarks, o.remarks].filter(Boolean).join(' • ')) } : o;
  const sfFix = o => o && /^measured$/i.test(String(o.sfSource || '').trim()) ? { ...o, sfSource: 'MLS' } : o;   // MLS data brought in before Oct 20 2026
  const histOnly = o => { if (!o || !offMlsSale(c)) return o; const x = { ...o }; ['status', 'listPrice', 'origList', 'listDate', 'lastRed', 'dom', 'cdom', 'financing', 'concessions', 'saleType', 'saleTypeNote', 'contractDate', 'salePrice', 'saleDate'].forEach(k => delete x[k]); return x; };   // a cancelled / expired listing is not this sale – keep only its house facts
  return { arch: a ? a.v : null, mls: histOnly(sfFix(finFix(c.src.mls))), pdf: histOnly(lastRedOf(sfFix(finFix(c.src.pdf)))), crs, cort: c.src.cort[c.cortPick || 0] || null };
}
/* her note (Oct 19 2026): the CRS Mortgage History shows the buyer's loan – a loan recorded near the sale's recording date with the buyer as borrower */
function crsFinancing(crs) {
  const L = crs.loans || []; const s = crs.lastSale; if (!s || (!L.length && !crs.loansRead)) return '';
  const when = s.recorded || s.date; if (!when) return '';
  const words = t => String(t || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !['and', 'the', 'trust', 'family', 'living', 'revocable', 'llc', 'inc'].includes(w));
  const buyer = new Set(words(s.buyer));
  const near = L.filter(l => { const d = isoDate(l.date); return d && Math.abs(Date.parse(d) - Date.parse(when)) <= 45 * 864e5; });
  const pick = near.find(l => !buyer.size || words(l.borrower).some(w => buyer.has(w))) || null;
  if (pick) return 'Loan: ' + (pick.lender || 'lender not named') + (num(pick.amount) ? ' ' + money(num(pick.amount)) : '') + ' (CRS mortgage history)';
  return 'No loan near the sale in the CRS mortgage history (cash?)';
}
/* her note (Oct 19 2026): the last price reduction is in the MLS printout History – the newest price change on or before the contract (pending) date */
function lastRedOf(p) {
  if (!p || !(p.priceChanges || []).length) return p;
  const cd = p.contractDate || p.lpcDate || '';
  const pc = p.priceChanges.filter(x => x.date && (!cd || x.date <= cd) && !(num(x.pct) > 0)).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if (!pc) return p;
  return { ...p, lastRed: p.lastRed || pc.date, redDays: cd ? Math.round((Date.parse(cd) - Date.parse(pc.date)) / 864e5) : null };
}
function defaultOrder(c, f) {
  const a = archChosen(c), sale = currentSale(c); const matched = a && archMatches(a, sale);
  const recent = a && (matched || (a.v.saleDate && sale && sale.date && Math.abs(monthsBetween(a.v.saleDate, sale.date)) <= 24) || (!a.v.saleDate && a.entered && monthsBetween(a.entered, todayISO()) <= 24));
  /* her rule (Oct 20 2026): address, city, ZIP, site size, sale price, sale date and year built default to the public record (CRS Data, then the recorded CORT deed);
     lenders want them to match public records, with a comment when something differs. Room count, beds, baths, sq ft and condition keep the old order. */
  if (['addr', 'city', 'zip', 'zip4', 'apn', 'siteSf', 'yearBuilt'].includes(f.k)) { const rest = (f.kind === 'site' || f.kind === 'phys' ? (recent ? ['arch', 'mls', 'pdf'] : ['mls', 'pdf', 'arch']) : ['arch', 'mls', 'pdf']); return ['crs', ...rest, 'cort']; }
  if (f.k === 'salePrice' || f.k === 'saleDate') { const t = c.src.cort[c.cortPick || 0]; const cortOk = t && t.saleDate && sale && sale.date && Math.abs(monthsBetween(t.saleDate, sale.date)) <= 2;   // CRS only carries this sale when its last recorded sale is this one (srcVals)
    return ['crs', ...(cortOk ? ['cort'] : []), ...(matched ? ['arch', 'mls', 'pdf'] : ['mls', 'pdf'])]; }
  switch (f.kind) {
    case 'sale': if (f.k === 'financing') return matched ? ['arch', 'crs', 'cort'] : ['crs', 'cort'];   // Oct 20 2026: MLS is not a good source for financing – only the recorded loan (CRS, CORT) or her own archive   // her note: the recorded loan (CRS mortgage history, CORT lender) shows the financing
      return matched ? ['arch', 'mls', 'pdf', 'cort', 'crs'] : ['mls', 'pdf', 'cort', ...(sale && sale.from === 'crs' ? ['crs'] : [])];   // a sale only in CRS (not in the MLS): its recorded sale
    case 'listing': if (f.k === 'sfSource' && a && a.v && a.v.sfSource) { const gl = num(V(c, 'gla')), ag = num(a.v.gla); if (gl && ag && Math.abs(gl - ag) <= 1) return ['arch', 'pdf', 'mls']; }   // her measurement counts only when the GLA in use is the one she measured
      if (f.k === 'sfSource') return ['pdf', 'mls'];
      return ['pdf', 'mls', ...(matched ? ['arch'] : []), ...(sale && sale.from === 'arch' ? ['arch'] : [])];
    case 'phys': return recent ? ['arch', 'mls', 'pdf', 'crs', 'cort'] : ['mls', 'pdf', 'arch', 'crs', 'cort'];
    case 'geo': return ['crs', 'mls', 'pdf'];   // Oct 20 2026: the public-record (parcel) location first, like the address
    default: return ['arch', 'mls', 'pdf', 'crs', 'cort'];
  }
}
function val(c, k) { return rcMemo('val', c.id + '|' + k, () => val0(c, k)); }
function val0(c, k) { // → { v, src, auto }
  const f = FIELD[k] || { k, t: 'text', kind: 'id' };
  if (c.edit && k in c.edit && !blank(c.edit[k])) return { v: c.edit[k], src: 'edit' };
  const S = srcVals(c);
  if (c.pick && c.pick[k] && S[c.pick[k]] && !blank(S[c.pick[k]][k])) return { v: S[c.pick[k]][k], src: c.pick[k] };
  let codeOnly = null;
  for (const s of defaultOrder(c, f)) if (S[s] && !blank(S[s][k])) {
    let v = S[s][k];
    if (k === 'financing' && /^MLS code/.test(v)) { codeOnly = codeOnly || { v, src: s, auto: true }; continue; }   // a Flexmls number, not the financing – another source wins
    // your archive keeps sale dates as month/year: take the exact day from another source when it is the same month
    if (f.t === 'date' && String(v).length === 7) { const exact = SRC_ORDER.map(x => S[x] && S[x][k]).find(x => x && String(x).length === 10 && String(x).startsWith(v)); if (exact) v = exact; }
    return { v, src: s, auto: true };
  }
  return codeOnly || { v: null, src: null };
}
const V = (c, k) => val(c, k).v;
function disagree(c, k) {
  const f = FIELD[k]; const S = srcVals(c); const vals = SRC_ORDER.map(s => S[s] && S[s][k]).filter(v => !blank(v));
  for (let i = 1; i < vals.length; i++) if (!sameVal(f, vals[0], vals[i])) return true; return false;
}
function compTitle(c) { const a = V(c, 'addr') || c.label || '(no address)'; const u = V(c, 'unit'); return a + (u ? ' #' + u : ''); }

/* ---------------- sale and listing history ---------------- */
function priorSales(c) {
  const out = []; const sale = currentSale(c);
  const add = s => { if (!s || !s.date) return; out.push(s); };
  (c.mlsOther || []).filter(o => o.saleDate && o.salePrice).forEach(o => add({ date: o.saleDate, price: o.salePrice, src: 'MLS ' + o.mls, type: 'Sale' }));   // an earlier MLS sale of the same house (micro or macro search)
  (c.src.pdf ? c.src.pdf.priorSales : []).forEach(add);
  (c.src.crs ? c.src.crs.priorSales : []).forEach(s => add(s && s.recorded ? { ...s, date: s.recorded } : s));   // CRS: the recording date is the closing date
  c.src.cort.forEach(t => add({ date: t.saleDate, price: t.salePrice, src: 'CORT ' + (t.period || ''), type: t.salePrice ? 'Sale' : 'Transfer' }));
  c.src.arch.forEach(a => {
    // "02/25/2026 | 0 | CRS - Intrafamily" = a $0 deed transfer; "10/07/2024 | 0 | CRS - No Transfers" = the date you searched, not a sale
    const txt = String(a.v.priorSaleText || ''); const m = txt.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*\|\s*\$?([\d,]+)\s*\|?\s*(.*)$/);
    if (m && !/no transfer/i.test(txt)) { const pr = num(m[2]); const inst = m[3].replace(/^(CRS Data|CRS|Realist|Realquest|NDC)\s*-\s*/i, '').trim(); add({ date: isoDate(m[1]), price: pr || null, inst, src: 'Your archive (' + (a.report || '') + ')', type: pr ? 'Sale' : 'Transfer' }); } if (a.v.salePrice && !archMatches(a, sale)) add({ date: a.v.saleDate, price: a.v.salePrice, src: 'Your archive (' + (a.report || '') + ')', type: 'Sale' }); });
  // drop this sale itself and repeats of the same transfer from several sources
  // the same transfer seen from another source (your figure can differ a little from the recorded price)
  const isThis = s => sale && sale.date && Math.abs(monthsBetween(s.date, sale.date)) <= 2 && (!s.price || !sale.price || Math.abs(s.price - sale.price) <= sale.price * 0.05);
  const kept = [];
  out.filter(s => !isThis(s)).sort((a, b) => b.date.localeCompare(a.date)).forEach(s => {
    const dup = kept.find(k => Math.abs(monthsBetween(k.date, s.date)) <= 2 && (!k.price || !s.price || Math.abs(k.price - s.price) <= Math.max(1000, k.price * 0.002)));
    if (dup) { if (!dup.src.includes(s.src)) dup.src += '; ' + s.src; if (!dup.price && s.price) dup.price = s.price; } else kept.push({ ...s });
  });
  if (sale && sale.date) kept.forEach(s => { s.monthsBefore = monthsBetween(s.date, sale.date); });
  return kept.filter(s => !sale || !sale.date || s.monthsBefore > 0 || s.date <= sale.date);
}
function compFlags(c, job) { return rcMemo('compFlags', c.id, () => compFlags0(c, job)); }
function compFlags0(c, job) {
  const F = []; const sale = currentSale(c); const yb = V(c, 'yearBuilt'); const price = V(c, 'salePrice');
  const st = V(c, 'status') || (sale && sale.status) || '';
  if (/Active/i.test(st)) F.push({ sev: 'info', t: 'Active listing (not a sale)' });
  else if (/Pending|Under Contract|Contingent/i.test(st)) F.push({ sev: 'info', t: 'Pending sale – contract price may be unknown' });
  else if (/Expired|Withdrawn|Cancel/i.test(st)) F.push({ sev: 'warn', t: st + ' listing (did not sell)' });
  const st2 = V(c, 'saleType'); if (st2 && !/ArmLth|Listing/i.test(st2)) F.push({ sev: 'warn', t: 'Sale type: ' + (SALE_TYPE_TEXT[st2] || st2) + (c.src.mls && c.src.mls.saleTypeNote ? ' (' + c.src.mls.saleTypeNote + ')' : '') });
  const PS = priorSales(c); const before = yb ? PS.filter(s => s.price && s.date && +s.date.slice(0, 4) < +yb) : [];
  if (before.length) F.push({ sev: 'info', t: `Sold before the house was built (${yb}): ${before.slice(0, 3).map(s => showDate(s.date) + ' ' + money(s.price)).join(', ')}${before.length > 3 ? ' …' : ''} – land or teardown ${before.length > 1 ? 'sales, not resales' : 'sale, not a resale'}` });
  PS.forEach(s => {
    if (before.includes(s) || (yb && s.date && +s.date.slice(0, 4) < +yb)) return;
    if (!s.price) { if (s.monthsBefore > 0 && s.monthsBefore <= 12) F.push({ sev: 'info', t: `Transfer within 12 months: ${showDate(s.date)} ${s.inst || 'deed'} (no price)` }); return; }
    if (price && s.price && s.monthsBefore > 0 && s.monthsBefore <= 24 && price >= s.price * 1.25) { const rm = remodelAfter(c, s.date);   // her note Oct 20 2026: a remodel after the prior sale explains it ('26 Rmdl C2+)
      F.push(rm ? { sev: 'info', t: `Resold after a remodel: bought ${showDate(s.date)} for ${money(s.price)}, remodeled (${rm}), sold again ${Math.round(s.monthsBefore)} months later (+${Math.round((price / s.price - 1) * 100)}%) – report the prior sale and the remodel` }
        : { sev: 'warn', t: `Quick resale: sold ${showDate(s.date)} for ${money(s.price)}, ${Math.round(s.monthsBefore)} months earlier (+${Math.round((price / s.price - 1) * 100)}%) – check for a flip or remodel` }); }
    else if (s.monthsBefore > 0 && s.monthsBefore <= 12) F.push({ sev: 'info', t: `Prior sale within 12 months: ${showDate(s.date)} ${money(s.price)} – report it in the prior sale history` });
  });
  const p = c.src.pdf;
  if (p) {
    if (p.fallthroughs) F.push({ sev: 'info', t: `Escrow fell through ${p.fallthroughs} time${p.fallthroughs > 1 ? 's' : ''} before this sale` });
    const dupes = (p.listings || []).filter(h => h.mls !== p.mls && /Closed/i.test(h.status) && sale && h.date && Math.abs(monthsBetween(h.date, sale.date)) < 1);
    if (dupes.length) F.push({ sev: 'info', t: 'Also closed under MLS ' + dupes.map(d => d.mls).join(', ') + ' (same sale listed twice)' });

  }
  // a recorded price that differs from the price being used (credits, personal property, recording errors)
  const used = val(c, 'salePrice'); const Sv = srcVals(c);
  ['crs', 'cort'].forEach(s => { const rp = Sv[s] && Sv[s].salePrice; if (used.v && rp && used.src !== s && Math.abs(rp - used.v) > Math.max(1000, used.v * 0.002) && (s !== 'cort' || !sale || !Sv.cort.saleDate || Math.abs(monthsBetween(Sv.cort.saleDate, sale.date)) <= 2))
    F.push({ sev: 'warn', t: `Recorded price (${SRC[s].short}) ${money(rp)} differs from the price used, ${money(used.v)} (${SRC[used.src].short}) – explain in the report which is the effective sale price and why (credit, personal property, recording error)` }); });
  if (used.v && ['crs', 'cort'].includes(used.src)) ['mls', 'pdf'].forEach(s => { const mp = Sv[s] && Sv[s].salePrice; if (mp && Math.abs(mp - used.v) > Math.max(1000, used.v * 0.002) && !F.some(x => /differs from the public record/.test(x.t)))
    F.push({ sev: 'warn', t: `${SRC[s].short} sale price ${money(mp)} differs from the public record ${money(used.v)} (${SRC[used.src].short}) – the public record is used; explain the difference (e.g. negotiated ${money(mp)} with a credit for repairs, commission not taken, agent was the buyer)` }); });   // her rule: the public record is dominant
  { const lp = num(V(c, 'listPrice')) || num(V(c, 'origList')), pr = num(V(c, 'salePrice')), dm = num(V(c, 'cdom')) || num(V(c, 'dom')); if (pr && lp && pr > lp && /closed|sold|settled/i.test(String(V(c, 'status') || 'Closed'))) { const t = `Sold ${money(pr - lp)} over the list price (${(pr / lp * 100).toFixed(1)}%)`;
    if (dm !== null && dm >= 30) F.push({ sev: 'warn', t: t + ` after ${dm} days on market – call the agent to find out why` }); else F.push({ sev: 'info', t: t + (dm !== null ? ` in ${dm} days on market` : '') + (dm !== null && dm <= 14 ? ' – likely multiple offers' : '') }); } }
  { if (offMlsSale(c)) { const was = [...(c.mlsOther || []), ...[c.src.mls, c.src.pdf].filter(Boolean)].filter(o => !o.saleDate && o.mls).map(o => `MLS ${o.mls} (${o.status || 'off market'}${o.listPrice ? ', ' + money(o.listPrice) : ''})`);
    F.push({ sev: 'info', t: `Sold without an MLS listing (public record only)${was.length ? '; earlier listing ' + was.join(', ') : ''} – 3.6: Listing status Settled sale, Days on market 0, no list price, contract date Unknown; verify the sale and pick the sale type (Typically motivated, or Other: Private sale)` }); } }
  if (/^y/i.test(V(c, 'concessionsYN') || '') && blank(V(c, 'concessions'))) F.push({ sev: 'warn', t: 'MLS says seller concessions: Yes, amount not stated – verify with the agent and type it on the Known sales concessions line' });   // CSV or printout
  const dom = V(c, 'dom'), cdom = V(c, 'cdom'); if (dom && cdom && cdom > dom + 30) F.push({ sev: 'info', t: `Relisted: ${dom} days on this listing, ${cdom} cumulative` });
  const op = V(c, 'origList'); if (op && price && price < op * 0.85) F.push({ sev: 'info', t: `Sold ${Math.round((1 - price / op) * 100)}% under the original list price` });
  { const ps = priorSales(c), cs = currentSale(c); const other = [...ps, ...(cs ? [{ date: cs.date, price: cs.price, src: cs.from }] : [])];   // a CORT line that another source agrees with (same date and price) is confirmed (Oct 20 2026)
    c.src.cort.forEach(t => { if (t.conf === null || t.conf >= 60) return; const ok = other.some(s => String(s.src || '').split('; ').some(x => !/^CORT/.test(x) && x !== 'cort') && s.date && t.saleDate && Math.abs(monthsBetween(s.date, t.saleDate)) <= 1 && (!t.salePrice || !s.price || Math.abs(s.price - t.salePrice) <= Math.max(1000, s.price * 0.01)));
      if (!ok) F.push({ sev: 'warn', t: `CORT line read with low confidence (${t.conf}) – check it against the scan ${t.file || ''}` }); }); }
  { const Sv2 = srcVals(c); const m = Sv2.mls || Sv2.pdf, r = Sv2.crs; if (m && r) {   // her note: public-record rooms / beds / baths / sq ft are often wrong, MLS ones too – and an ADU or outbuilding is sometimes counted in
    const dif = [['rooms', 'Room count'], ['beds', 'Bedrooms'], ['bathsTotal', 'Baths']].filter(([k]) => !blank(m[k]) && !blank(r[k]) && +m[k] !== +r[k] && !(c.pick && c.pick[k]) && blank((c.edit || {})[k])).map(([k, l]) => `${l}: MLS ${m[k]}, public record ${r[k]}`);
    if (dif.length) F.push({ sev: 'info', t: dif.join(' · ') + ' – check (an ADU or outbuilding counted in?) and click the one to use' });
    const dg = num(m.gla) && num(r.gla) ? Math.abs(num(m.gla) - num(r.gla)) : 0, ad = num(V(c, 'aduSf')) || num(V(c, 'otherSf')); if (dg > 100 && ad && Math.abs(dg - ad) <= Math.max(50, ad * 0.1)) F.push({ sev: 'warn', t: `The sq ft difference (${dg.toLocaleString()}) is about the ADU / outbuilding size (${ad.toLocaleString()}) – one source may include it` }); } }
  if (disagree(c, 'gla') && !(c.pick && c.pick.gla) && blank((c.edit || {}).gla)) F.push({ sev: 'info', t: 'Square footage differs between sources – click the one to use' });   // resolved once she picks a source or types hers
  const a = archChosen(c); if (a && sale && !archMatches(a, sale) && a.v.saleDate) F.push({ sev: 'info', t: `Your archive has this property from an earlier sale (${showDate(a.v.saleDate)}); its sale facts are not used. House facts from your record ${monthsBetween(a.v.saleDate, sale.date) <= 24 ? 'are used' : 'are older than 2 years, so MLS is used first'}` });
  if (job && job.subject && job.subject.eff && sale && sale.date && monthsBetween(sale.date, job.subject.eff) > 12) F.push({ sev: 'warn', t: 'Sale is more than 12 months before the effective date' });
  return F;
}
function proximity(c, job) {
  const s = job && job.subject; if (!s) return null;
  const a = { lat: num(s.lat), lon: num(s.lon) }, b = num(V(c, 'lat')) ? { lat: num(V(c, 'lat')), lon: num(V(c, 'lon')) } : (c.geo ? { lat: c.geo.lat, lon: c.geo.lon } : { lat: null, lon: null });   // c.geo: found by address for the map
  const mi = milesBetween(a, b); if (mi === null) return null;
  return { mi, dir: directionOf(a, b) };
}

/* a remodel after the prior sale: her archive note ('26 Rmdl, 2026 Remodel, Rebuild …) dated after it, or the MLS listing says remodeled / renovated */
function remodelAfter(c, priorDate) {
  const py = +String(priorDate || '').slice(0, 4); const a = archChosen(c) || (c.src.arch || [])[0]; const t = String(a && a.v ? a.v.remodel || '' : '');
  const m = t.match(/(?:'(\d{2})|\b((?:19|20)\d{2}))\s*-?\s*(?:'?\d{2,4})?\s*(rmdl|remodel|rmd|reno|renovat|rebuild|rbld|update|updt)/i);
  if (m) { const y = m[2] ? +m[2] : 2000 + +m[1]; if (!py || y >= py) return t.trim(); }
  const S = c.src.mls || c.src.pdf; const w = S ? [S.mlsCondition, S.remodel, S.remarks].filter(Boolean).join(' ') : '';
  const mm = w.match(/remodel\w*|renovat\w*|rebuilt|completely updated|fully updated/i); return mm ? 'MLS: ' + mm[0].toLowerCase() : '';
}

/* the comp sold without an MLS listing for this sale (her Oct 20 2026 case: 719 Camino Cascada – cancelled in the MLS, sold later off-market): the sale is from public record */
function offMlsSale(c) { const s = currentSale(c); if (!s || !/crs|cort/.test(s.from || '')) return false; return ![c.src.mls, c.src.pdf].some(o => o && (o.saleDate || o.contractDate || /Pending|Active/i.test(o.status || ''))); }

/* the recorded document number of THIS sale (her ask Oct 20 2026) – the CRS sale or the CORT line whose date matches the sale (±2 months); CRS first */
function docNoOf(c) {
  { const m = String((c.edit || {}).verification || '').match(/(?:doc\.?\s*(?:no\.?|#)?|#)\s?(\d{3,12})(?:\s+(\d{1,2}\/\d{1,2}\/\d{2,4}))?/i); if (m) return { doc: m[1], from: 'you', date: m[2] ? isoDate(m[2]) : '' }; }   // she typed it in Your verification notes: hers wins
  const cs = currentSale(c); if (!cs || !cs.date) return null; const near = d => d && Math.abs(monthsBetween(d, cs.date)) <= 2;
  const L = c.src.crs && c.src.crs.lastSale; if (L && L.doc && near(L.recorded || L.date)) return { doc: L.doc, from: 'crs', date: L.recorded || L.date };
  const t = (c.src.cort || []).find(x => x.doc && near(x.saleDate)); if (t) return { doc: t.doc, from: 'cort', date: t.saleDate };
  for (const a of (c.src.arch || [])) { const m = String((a.v || {}).verification || '').match(/#\s?(\d{3,7})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/); if (m && near(isoDate(m[2]))) return { doc: m[1], from: 'arch', date: isoDate(m[2]) }; }   // her 2.6 verification line: "Doc. #06575 03/04/26"
  return null; }
/* her format (Oct 20 2026): the last 5 digits of the recording number, then the closing (recording) date – "Doc #06575 03/04/2026" */
const docShort = d => { const m = String(d || '').match(/(\d+)\D*$/); if (!m) return String(d || ''); const n = m[1]; return n.length > 5 ? n.slice(-5) : n; };
function docText(c) { const D = docNoOf(c); if (!D) return ''; const cs = currentSale(c); const dt = D.date || (cs && cs.date) || ''; return 'Doc #' + docShort(D.doc) + (dt ? ' ' + showDate(dt) : ''); }
