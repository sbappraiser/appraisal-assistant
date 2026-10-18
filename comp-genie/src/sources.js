/* =====================================================================
   Sources. Each reader turns one kind of file into "canonical" records:
   plain objects whose keys are the field keys in FIELDS (model.js).
   ===================================================================== */

/* ---------------- 1. Your comp archive (converted from ACI) ---------------- */
const ARCH = { loaded: false, cols: [], rows: [], sales: {}, byAddr: new Map(), byApn: new Map(), streets: [], zipCity: {} };
function archiveIndex(data) {
  ARCH.cols = data.cols; ARCH.rows = data.rows; ARCH.sales = data.sales || {}; ARCH.built = data.built; ARCH.loaded = true;
  ARCH.c = {}; data.cols.forEach((c, i) => { ARCH.c[c] = i; });
  ARCH.byAddr = new Map(); ARCH.byApn = new Map(); const zc = {}; const seen = new Set(); ARCH.streets = [];
  data.rows.forEach((r, i) => {
    const g = k => r[ARCH.c[k]];
    const k = addrKey(g('street_number'), g('street_name'), g('unit'));
    if (!ARCH.byAddr.has(k)) ARCH.byAddr.set(k, []); ARCH.byAddr.get(k).push(i);
    const ak = apnKey(g('apn')); if (ak) { if (!ARCH.byApn.has(ak)) ARCH.byApn.set(ak, []); ARCH.byApn.get(ak).push(i); }
    const z = g('zip'), city = g('city'); if (z && city) { zc[z] = zc[z] || {}; zc[z][city] = (zc[z][city] || 0) + 1; }
    const label = [g('street_number'), g('street_name')].filter(Boolean).join(' ') + (g('unit') ? ' #' + g('unit') : '');
    if (!seen.has(k)) { seen.add(k); ARCH.streets.push({ k, label, low: label.toLowerCase(), city: g('city') || '' }); }
  });
  Object.entries(zc).forEach(([z, m]) => { ARCH.zipCity[z] = Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]; });
}
const archRow = i => { const r = ARCH.rows[i], o = {}; ARCH.cols.forEach((c, j) => { o[c] = r[j]; }); o._i = i; return o; };
function archiveFind({ apn, key }) { // row indexes for one property
  const set = new Set();
  if (apn && ARCH.byApn.has(apnKey(apn))) ARCH.byApn.get(apnKey(apn)).forEach(i => set.add(i));
  if (key && ARCH.byAddr.has(key)) ARCH.byAddr.get(key).forEach(i => set.add(i));
  // an APN match must not drag in a different street address (lot splits share a parcel root)
  return [...set].map(archRow).sort((a, b) => String(b.entered_date || '').localeCompare(String(a.entered_date || '')));
}
function archiveSuggest(q, n = 8) {
  const s = q.toLowerCase().trim(); if (s.length < 2) return [];
  const k = addrKey(s);
  const out = ARCH.streets.filter(x => x.low.startsWith(s) || x.k === k || (k.split('|')[1] && x.k.startsWith(k))).slice(0, n);
  return out;
}
const VIEW_UAD = { Residential: 'Residential', Water: 'Ocean', Mountain: 'Mountain', 'City Skyline': 'Skyline', Woods: 'Woods', 'Golf Course': 'GolfCourse', Canyon: 'Valley', 'City Street': 'CityStreet', Pastoral: 'Pastoral', Park: 'Park', 'Garden Setting': 'Residential', 'Power Lines': 'Other' };
const LOC_TEXT = { Res: 'Residential', BusyRd: 'Busy road', ShrDrv: 'Shared drive', PvtLn: 'Private lane', WtrFr: 'Waterfront', InterLot: 'Interior lot', PvtRd: 'Private road', FwyNse: 'Freeway noise', Noise: 'Noise', FldZn: 'Flood zone', Rural: 'Rural', Train: 'Train', 'Debris/Fire': 'Debris flow / fire', FlagLot: 'Flag lot', AdjPrk: 'Adjacent park', Gated: 'Gated', Comm: 'Commercial', DrvEsmt: 'Driveway easement', Schl: 'School', FldWy: 'Floodway', Esmt: 'Easement', SecondRow: 'Second row', NrWtr: 'Near water', LotsToAmenity: 'Lots to amenity' };
function archCanon(a) {
  const am = String(a.amenities || '').split(';');
  const acc = (() => { try { return JSON.parse(a.accessory_json || '[]'); } catch (e) { return []; } })();
  const hasType = re => acc.some(b => re.test(b.type || ''));
  // listings in your archive (active, pending, expired…) carry the list price, not a sale price
  const isListing = (a.listing_status && !/closed|sold/i.test(a.listing_status)) || (a.sale_type === 'Listing' && !a.listing_status);
  const v = {
    mls: a.mls_no || '', addr: [a.street_number, a.street_name].filter(Boolean).join(' '), unit: a.unit || '', city: a.city || '', zip: a.zip || '', apn: a.apn || '', nbhd: a.neighborhood || '',
    status: a.listing_status || (isListing ? 'Listing' : a.record_role === 'subject' ? '' : (a.price ? 'Closed' : '')),
    salePrice: isListing ? null : a.price, listPrice: isListing ? a.price : null, saleDate: isListing ? '' : (a.sale_month || ''), contractDate: a.contract_month || '', dom: a.dom, saleType: a.sale_type || '', financing: a.financing || '', concessions: a.concession_amt,
    verification: a.verification || '', lprDays: a.lpr_days,
    siteSf: a.site_sf, usableSf: a.usable_sf, landSplit: a.land_split || '', topo: a.topography || '',
    locRating: a.location_rating || '', locFactors: String(a.location_factors || '').split(';').filter(Boolean).map(x => LOC_TEXT[x] || x).join('; '),
    viewRating: a.view_rating || '', viewTypes: String(a.view_types || '').split(';').filter(Boolean).join('; '), viewRange: a.view_panoramic ? 'Panoramic' : a.view_limited ? 'Limited' : '',
    attach: a.attachment || '', style: a.style || '', stories: a.stories,
    quality: a.quality ? 'Q' + a.quality + (a.quality_mod || '') : '', condition: a.condition ? 'C' + a.condition + (a.condition_mod || '') : '',
    yearBuilt: a.year_built_est || (a.actual_age != null && a.entered_date ? +String(a.entered_date).slice(0, 4) - a.actual_age : null), effAge: a.effective_age,
    rooms: a.rooms, beds: a.beds, bgBeds: a.bg_beds, full: a.baths_full, half: a.baths_half, gla: a.gla, bsmtSf: a.bsmt_sf, bsmtFin: a.bsmt_fin_sf,
    garage: a.garage_spaces, garageType: a.garage_type || '', carport: a.carport_spaces, driveway: a.driveway_spaces,
    heatCool: a.heating_cooling || '', energy: [a.energy_raw, a.solar ? 'Solar' : '', a.battery ? 'Battery' : '', a.generator ? 'Generator' : ''].filter(Boolean).join('; '),
    adu: a.adu_or_guest ? (hasType(/^(ADU|JADU)$/) ? 'ADU' : 'Guest house') : (a.acc_count != null ? 'None' : ''),
    guest: hasType(/guest/i) ? 'Yes' : '', barn: hasType(/barn/i) ? 'Yes' : '', stable: hasType(/stable/i) ? 'Yes' : '', horse: a.equestrian || am.includes('equestrian') ? 'Yes' : '',
    pool: a.pool ? 'Yes' : (a.amenities != null ? 'No' : ''), spa: a.spa ? 'Yes' : '', tennis: a.tennis ? 'Yes' : '', sport: a.sport_court || a.pickleball ? 'Yes' : '',
    landscaping: a.landscaping || '', porch: a.porch_patio || '', accessory: a.accessory_raw || '', otherSf: (a.acc_fin_sf || 0) + (a.acc_unfin_sf || 0) || null, remodel: a.fu_raw || '',
    hoa: a.hoa_month, priorSaleText: a.prior_sale || '',
  };
  return v;
}
function archLabel(a) {
  const role = a.record_role === 'subject' ? 'Subject' : a.record_role === 'comparable' ? 'Comp' : (a.record_role || 'Record');
  const isListing = (a.listing_status && !/closed|sold/i.test(a.listing_status)) || (a.sale_type === 'Listing' && !a.listing_status);
  const sale = isListing ? `${a.listing_status || 'Listing'} ${money(a.price)} list` : a.price ? `${money(a.price)} ${showDate(a.sale_month)}` : 'no sale';
  return `${role} · ${sale} · entered ${showDate(a.entered_date)} · ${a.from_report || ''}`;
}

/* ---------------- 2. MLS export (flexmls CSV) ---------------- */
const MLS_STATUS = { A: 'Active', P: 'Pending', C: 'Closed', X: 'Expired', W: 'Withdrawn', K: 'Cancelled', U: 'Under Contract', S: 'Closed' };
const SF_SOURCE = { M: 'Measured', P: 'Public Records', O: 'Other/See Remarks', A: 'Appraisal', B: 'Builder', S: 'Seller' };
function parseMlsCsv(text) {
  const rows = parseCSV(text); if (rows.length < 2) return [];
  const H = rows[0].map(h => h.trim()); const ix = {}; H.forEach((h, i) => { ix[h.toLowerCase()] = i; });
  if (!('listing number' in ix)) throw new Error('This CSV has no "Listing Number" column. Is it the MLS export?');
  return rows.slice(1).map(r => {
    const g = (...names) => { for (const n of names) { const i = ix[n.toLowerCase()]; if (i !== undefined && String(r[i] || '').trim() !== '') return String(r[i]).trim(); } return ''; };
    const groups = {}; H.forEach((h, i) => { const m = h.match(/^(.+?):\s*(.+)$/); if (m && /^(yes|y|true|1)$/i.test(String(r[i] || '').trim())) (groups[m[1]] = groups[m[1]] || []).push(m[2]); });
    const raw = {}; H.forEach((h, i) => { if (String(r[i] || '').trim() !== '') raw[h] = String(r[i]).trim(); });
    return { raw, groups, g };
  }).map(({ raw, groups, g }) => mlsCanon(raw, groups, g));
}
function mlsCanon(raw, G, g) {
  const has = (grp, re) => (G[grp] || []).some(x => re.test(x));
  const list = grp => (G[grp] || []).join('; ');
  const st = g('Status'); const status = MLS_STATUS[st] || st;
  const garN = Math.max(0, ...(G['Parking/Garage'] || []).map(x => (x.match(/^Gar #(\d+)/) || [])[1] || 0).map(Number), num(g('Parking/Garage: Total # Garage Spaces')) || 0) || null;
  const cpN = Math.max(0, ...(G['Parking/Garage'] || []).map(x => (x.match(/^Cpt #(\d+)/) || [])[1] || 0).map(Number)) || null;
  const uncN = Math.max(0, ...(G['Parking/Garage'] || []).map(x => (x.match(/^Unc #(\d+)/) || [])[1] || 0).map(Number)) || null;
  const garType = has('Parking/Garage', /^Attached$/) ? 'Attached' : has('Parking/Garage', /^Detached$/) ? 'Detached' : '';
  const acres = num(g('Apx # Acres')), lotSf = num(g('Apx Lot SqFt'));
  const typ = g('TYP'); const condoDet = has('Condo/CO-OP/PUD', /^Detached$/), condoAtt = has('Condo/CO-OP/PUD', /^Attached$/);
  const saleTypeTxt = [...(G['Pub Listing Details'] || []), ...(G['Pvt Listing Details'] || [])].filter(x => !/^(None|Standard)$/.test(x));
  const saleType = saleTypeTxt.some(x => /REO|Bank Owned|Foreclosure/i.test(x)) ? 'REO' : saleTypeTxt.some(x => /Short/i.test(x)) ? 'Short' : saleTypeTxt.some(x => /Probate|Court|Conservator/i.test(x)) ? 'CrtOrd' : saleTypeTxt.some(x => /Estate|Trust/i.test(x)) ? 'Estate' : saleTypeTxt.some(x => /Bankruptcy/i.test(x)) ? 'CrtOrd' : (status === 'Closed' ? 'ArmLth' : '');
  const aduN = ['ADU #1: Type', 'ADU #2: Attached'].filter(k => raw[k]).length;
  const views = G['View'] || [];
  return {
    _src: 'mls', mls: g('Listing Number'), addr: [g('Street #'), titleCase(g('Street Name'))].filter(Boolean).join(' '), unit: g('Unit/Space #'), zip: g('Postal Code'), apn: g('Parcel Number'),
    city: g('City') ? titleCase(g('City')) : '',
    status, listPrice: num(g('Price')), origList: num(g('Original List Price')), listDate: isoDate(g('Begin Date')),
    contractDate: isoDate(g('Under Contract Date')), saleDate: isoDate(g('Sold Date', 'COE')), salePrice: num(g('Sold Price')),
    dom: num(g('Days On Market')), cdom: num(g('Cumulative DOM')), financing: g('Financing'), concessions: num(g('Seller Concessions')),
    saleType, saleTypeNote: saleTypeTxt.join('; '),
    siteSf: lotSf || (acres ? Math.round(acres * 43560) : null), acres,
    topo: list('Location/Topo'), viewTypes: views.filter(v => !/^Setting$/.test(v)).join('; ') || (views.includes('Setting') ? 'Setting' : ''),
    viewRange: views.includes('Panoramic') ? 'Panoramic' : views.includes('Partial/Filtered') ? 'Partial' : '',
    attach: condoAtt ? 'Attached' : condoDet ? 'Detached' : (/^HE$/i.test(typ) ? 'Detached' : ''), propType: typ,
    style: list('Style'), stories: has('Construction', /Single Story/) ? 1 : has('Construction', /Two Story/) ? 2 : has('Construction', /Tri/) ? 3 : null,
    mlsCondition: list('Condition'), yearBuilt: num(g('Year Built')), assessorYB: num(g('Assessor Year Built')),
    beds: num(g('Total Bedrooms')), full: num(g('Total Full Baths')), half: num(g('Total Half Baths')), bathsTotal: num(g('Total Bathrooms')),
    gla: num(g('Total SqFt.', 'Total SqFt')), mainSf: num(g('Main House SqFt')), otherSf: num(g('Other Structures SqFt')), assessorSf: num(g('Assessor SqFt')),
    sfSource: SF_SOURCE[g('Source')] || g('Source'), basement: has('Rooms', /Basement/) ? 'Basement' : (g('Basement') || ''),
    garage: garN, garageType: garType, carport: cpN, driveway: uncN,
    heatCool: [list('Heating'), list('Cooling') || 'No cooling listed'].filter(Boolean).join(' / '), heating: list('Heating'), cooling: list('Cooling'),
    energy: [has('Amenities', /Solar PV/) || (G['Electric'] || []).length ? 'Solar' + ((G['Electric'] || []).length ? ' (' + G['Electric'].join(', ') + ')' : '') : '', has('Amenities', /Battery/) ? 'Battery' : '', has('Amenities', /Generator/) ? 'Generator' : ''].filter(Boolean).join('; '),
    adu: /^y/i.test(g('ADU')) || has('Other Buildings', /ADU/) ? (aduN > 1 ? '2 ADUs' : 'ADU') : 'None',
    aduNote: ['ADU #1: Type', 'ADU #1: Beds', 'ADU #1: Baths', 'ADU #1: Attached', 'ADU #1: Year Built'].filter(k => raw[k]).map(k => k.replace('ADU #1: ', '') + ' ' + raw[k]).join(', '),
    guest: has('Amenities', /Guest/) || has('Other Buildings', /Second Residence|Employee|Foreman/) ? (list('Amenities').match(/Guest (House|Quarters)/) || ['Yes'])[0] : 'No',
    barn: has('Other Buildings', /^Barn$/) ? 'Yes' : 'No', stable: has('Other Buildings', /^Stable$/) ? 'Yes' : 'No',
    horse: has('Grounds/Landscaping', /Horse/) || has('Amenities', /Horses/) || has('Other Buildings', /Paddock/) ? 'Yes' : 'No',
    pool: (G['Pool Features'] || []).length ? 'Yes' : 'No', spa: has('Grounds/Landscaping', /Hot Tub|SPA/i) ? 'Yes' : 'No',
    tennis: has('Grounds/Landscaping', /Tennis/) ? 'Yes' : 'No', sport: has('Grounds/Landscaping', /Pickleball|Sport/) ? 'Yes' : 'No',
    porch: list('Patio and Porch Features'), accessory: list('Other Buildings'),
    hoa: num(g('Condo/CO-OP/PUD: Association Fee', 'Association Fee', 'HOA Fee')),
    lat: num(g('Geo Lat', 'Latitude')), lon: num(g('Geo Lon', 'Longitude')),
    remarks: g('Public Remarks'), privateRemarks: g('Private Remarks'), water: list('Water/Sewer'), roof: list('Roof'), foundation: list('Foundation'),
    remodel: [has('Amenities', /Remodeled Kitchen/) ? 'Remodeled kitchen' : '', has('Amenities', /Remodeled Bath/) ? 'Remodeled bath' : '', has('Condition', /Updated|Remodeled/) ? 'Updated/Remodeled' : ''].filter(Boolean).join('; '),
    listAgent: g('Listing Member'), sellAgent: g('Selling Member'),
  };
}

/* ---------------- 3. MLS printout (flexmls PDF): detail, square-foot source, location, history ---------------- */
const RX_LISTING = /^- (\d{2}-\d+)\s+([A-Za-z][A-Za-z /]*?)\s+\$([\d,]+)\s+(?:(-?[\d.,]+)%\s+)?(\d{2}\/\d{2}\/\d{4})\s+(\d+)?\s*(\d+)?\s*(.*)$/;
const RX_EVENT = /^- (?:- )?([A-Za-z][A-Za-z_ ,./]*?)\s+\$([\d,]+)\s+(?:(-?[\d.,]+)%\s+)?(\d{2}\/\d{2}\/\d{4})(?:\s+(\d+))?\s*$/;
function parseMlsPdf(L) {
  const out = []; let cur = null, mode = '', hist = null, ev = null, colLabel = ['', ''];
  const flat = i => L.rows[i].map(c => c.s).join(' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < L.length; i++) {
    const line = flat(i); const cells = L.rows[i];
    if (/^flexmls Web/.test(line) || /^\d+ of \d+ /.test(line) || /^\+ MLS #/.test(line)) continue;
    let m = line.match(/^MLS #\s?(\d{2}-\d+)$/);
    if (m) { const addr = i > 0 ? flat(i - 1) : ''; cur = { mls: m[1], addrLine: addr, d: {}, history: [] }; out.push(cur); mode = 'detail'; colLabel = ['', '']; continue; }
    if (!cur) continue;
    if ((m = line.match(/^History for MLS # ?(\d{2}-\d+)/))) { mode = 'history'; hist = null; ev = null; continue; }
    if (/^(Supplement|Photos|Documents|Floor ?plans?) for MLS #/.test(line) || /^MLS # \d{2}-\d+ /.test(line)) { mode = 'skip'; continue; }
    if (/^Information is deemed|^Information may be|^2026 MLS and FBS|^not be the listing/.test(line)) continue;
    if (mode === 'detail') {
      // two columns: labels start at the left margin or just right of the middle; values sit to their right
      cells.forEach(c => {
        const col = c.x < 300 ? 0 : 1; const isLabel = (c.x < 60) || (c.x > 290 && c.x < 330);
        if (isLabel) { colLabel[col] = c.s.replace(/:$/, '').trim(); if (!(colLabel[col] in cur.d)) cur.d[colLabel[col]] = ''; }
        else if (colLabel[col]) cur.d[colLabel[col]] = (cur.d[colLabel[col]] ? cur.d[colLabel[col]] + ' ' : '') + c.s;
      });
    } else if (mode === 'history') {
      if ((m = line.match(RX_LISTING))) {
        let cdom = m[7], addr = m[8]; if (!addr && cdom) { addr = ''; }
        hist = { mls: m[1], status: m[2].trim(), price: num(m[3]), pct: m[4] || '', date: isoDate(m[5]), dom: num(m[6]), cdom: num(cdom), addr: (addr || '').trim(), events: [] };
        cur.history.push(hist); ev = null; continue;
      }
      if (hist && (m = line.match(RX_EVENT))) { ev = { type: m[1].trim(), price: num(m[2]), pct: m[3] || '', date: isoDate(m[4]), dom: num(m[5]), changes: [] }; hist.events.push(ev); continue; }
      if (ev && /^(Change at|Old Value|New Value|Change by)/.test(line)) ev.changes.push(line);
      else if (ev && ev.changes.length && /^(Old|New) Value/.test(ev.changes[ev.changes.length - 1])) ev.changes[ev.changes.length - 1] += ' ' + line;
    }
  }
  return out.map(pdfCanon);
}
function parkingCounts(s) {
  const n = re => { const m = s.match(re); return m ? +m[1] : null; };
  return { garage: n(/Total # Garage Spaces:\s*(\d+)/i) ?? n(/Gar #(\d+)/i), carport: n(/Total # Carport Spaces:\s*(\d+)/i) ?? n(/Cpt #(\d+)/i), driveway: n(/Total # Uncovered Spaces:\s*(\d+)/i) ?? n(/Unc #(\d+)/i),
    garageType: /\bAttached\b/.test(s) ? 'Attached' : /\bDetached\b/.test(s) ? 'Detached' : '' };
}
function pdfCanon(p) {
  const d = p.d, me = p.history.find(h => h.mls === p.mls) || null;
  const evs = me ? me.events : [];
  const uc = evs.find(e => /Under Contract Date/i.test(e.type)); // newest first
  const priceChanges = evs.filter(e => /Price Change/i.test(e.type)).map(e => ({ date: e.date, price: e.price, pct: e.pct }));
  const falls = evs.filter(e => /Fallthrough/i.test(e.type)).length;
  const firstNew = [...evs].reverse().find(e => /^(New|Copy)$/i.test(e.type));
  const am = String(p.addrLine || '').match(/^(.+?),\s*([A-Z .]+),\s*([A-Z]{2})\s+(\d{5})/);
  const sale = me && /Closed/i.test(me.status) ? me : null;
  const others = p.history.filter(h => h.mls !== p.mls);
  return {
    _src: 'pdf', mls: p.mls, addr: am ? am[1] : '', city: am ? titleCase(am[2]) : '', zip: am ? am[4] : '', apn: d['Parcel Number'] || '',
    status: d['Status'] || (me ? me.status : ''), listPrice: uc ? uc.price : num(d['Price']), origList: num(d['Original List Price']) || (firstNew ? firstNew.price : null),
    listDate: isoDate(d['Begin Date']), contractDate: isoDate(d['Under Contract Date']) || (uc ? uc.date : ''),
    salePrice: num(d['Sold Price']) ?? (sale ? sale.price : null), saleDate: isoDate(d['Sold Date']) || (sale ? sale.date : ''),
    financing: d['Financing'] || '', concessionsYN: d['Seller Concessions'] || '', nbhd: String(d['Neighborhood'] || '').replace(/^\d+\s*-\s*/, ''),
    otherSf: num(d['Other Structures SqFt']), cityLimits: d['Within City Limits Y/N'] || '', propType: d['TYP'] || '',
    dom: num(d['Days on Market']) ?? (me ? me.dom : null), cdom: num(d['Cumulative Days on Market']) ?? (me ? me.cdom : null),
    terms: d['Terms'] || '', concessionsOffered: d['Seller Consider Concessions'] || '',
    sfSource: d['Source'] || '', gla: num(d['Total SqFt.']), mainSf: num(d['Main House SqFt']), yearBuilt: num(d['Year Built']),
    beds: num(d['Total Bedrooms']), full: num(d['Total Full Baths']), half: num(d['Total Half Baths']), acres: num(d['Apx # Acres']),
    siteSf: num(d['Apx Lot SqFt']) || (num(d['Apx # Acres']) ? Math.round(num(d['Apx # Acres']) * 43560) : null),
    lat: num(d['Geo Lat']), lon: num(d['Geo Lon']), style: d['Style'] || '', mlsCondition: d['Condition'] || '', viewTypes: d['View'] || '', topo: d['Location/Topo'] || '',
    parkingText: d['Parking/Garage'] || '', ...parkingCounts(d['Parking/Garage'] || ''), heatCool: [d['Heating'], d['Cooling']].filter(Boolean).join(' / '), heating: d['Heating'] || '', cooling: d['Cooling'] || '',
    zoning: d['Zoning'] || '', water: d['Water/Sewer'] || '',
    lpcDate: uc ? uc.date : '', priceChanges, fallthroughs: falls,
    listings: p.history.map(h => ({ mls: h.mls, status: h.status, price: h.price, date: h.date, dom: h.dom, cdom: h.cdom, addr: h.addr })),
    priorSales: others.filter(h => /Closed/i.test(h.status)).map(h => ({ date: h.date, price: h.price, src: 'MLS ' + h.mls, type: 'Sale' })),
    detail: d,
  };
}

/* ---------------- 4. CRS Data property report (PDF) ---------------- */
function crsCanon(c) {
  const sales = (c.sales || []).map(s => ({ date: isoDate(s.date), recorded: isoDate(s.recorded), price: num(s.amount), src: 'CRS ' + (s.instrument || 'deed'), type: num(s.amount) ? 'Sale' : 'Transfer', inst: s.instrument || '', buyer: s.buyer || '', seller: s.seller || '', doc: s.doc || '' }));
  return {
    _src: 'crs', addr: titleCase(c.addr || ''), city: titleCase(c.city || ''), zip: c.zip || '', apn: c.apn || '',
    beds: num(c.beds), bathsTotal: num(c.baths), gla: num(c.sqftAssessor), yearBuilt: num(c.yearBuilt), rooms: num(c.rooms),
    siteSf: num(c.lotSf) || (num(c.acres) ? Math.round(num(c.acres) * 43560) : null), acres: num(c.acres),
    lat: num(c.lat), lon: num(c.lng), zoning: c.zoning || '', landUse: c.landUse || '', fema: [c.fema, c.femaPanel, c.femaDate].filter(Boolean).join(' · '), owner: c.owner || '',
    priorSales: sales, loans: c.loans || [],
    lastSale: sales.find(s => s.price) || null,
  };
}

/* ---------------- 5. CORT grant-deed printouts (table made from the weekly scans) ---------------- */
function parseCortCsv(text) {
  const rows = parseCSV(text); const H = rows[0].map(h => h.trim().toLowerCase());
  if (!H.includes('grantor') || !H.includes('apn')) throw new Error('This is not a CORT table (no APN / Grantor columns).');
  return rows.slice(1).map(r => { const o = {}; H.forEach((h, i) => { o[h] = (r[i] || '').trim(); }); return o; }).map(cortCanon);
}
const CORT_CITY = { SBAR: 'Santa Barbara', GOLT: 'Goleta', MONT: 'Montecito', CARP: 'Carpinteria', SUMM: 'Summerland', 'I.V.': 'Isla Vista', UNIN: '', ONIN: '' };
function cortCanon(o) {
  const noAddr = o.no_address === '1' || /NO (COUNTY|ADDRESS)/.test(o.address);
  return {
    _src: 'cort', apn: o.apn, addr: noAddr ? '' : titleCase(o.address), city: CORT_CITY[o.city] ?? titleCase(o.city),
    salePrice: num(o.price), saleDate: isoDate(o.date), recDate: isoDate(o.date), beds: num(o.beds), bathsTotal: num(o.baths), rooms: num(o.rooms), gla: num(o.sqft), yearBuilt: num(o.year_built),
    cortRemarks: o.remarks, financing: o.lender ? (/SELLER/i.test(o.lender) ? 'Seller' : 'Loan: ' + o.lender + (num(o.loan) ? ' ' + money(o.loan) : '')) : 'No loan recorded',
    grantor: o.grantor, grantee: o.grantee, doc: o.instno, period: o.period, conf: num(o.ocr_conf_min), file: o.source_file,
  };
}
