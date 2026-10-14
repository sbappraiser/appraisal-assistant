/* ---------------- CRS Data "Property Report" PDF parser ----------------
   Input: text lines rebuilt from the PDF, cells separated by " | ".
   Output: the public-record facts used to pre-fill the inspection. */
function parseCRS(lines) {
  const c = {}; const cells = l => l.split(' | ').map(s => s.trim());
  const after = (label) => { // value in the cell right after an exact label cell
    for (const l of lines) { const cs = cells(l); const i = cs.findIndex(x => x === label); if (i >= 0 && cs[i + 1] !== undefined) return cs[i + 1]; }
    return '';
  };
  const afterAll = (label) => { for (const l of lines) { const cs = cells(l); const i = cs.findIndex(x => x === label); if (i >= 0) return cs.slice(i + 1); } return []; };
  // Address: "Property Address | 5464 Berkeley Rd | ..." then next line "Santa Barbara, CA 93111-1614"
  const ai = lines.findIndex(l => l.startsWith('Property Address'));
  if (ai >= 0) {
    c.addr = cells(lines[ai])[1] || '';
    for (let j = ai + 1; j < ai + 4 && j < lines.length; j++) {
      const m = lines[j].match(/^([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5})(?:-(\d{4}))?/);
      if (m) { c.city = m[1].trim(); c.state = m[2]; c.zip = m[3]; c.zip4 = m[4] || ''; c.cityLine = lines[j].split(' | ')[0]; break; }
    }
  }
  c.county = after('County');
  c.apn = after('APN/Tax ID');
  c.owner = after('Name');
  c.landUse = after('Land Use');
  c.sqft = after('Square Feet').replace(/[^\d]/g, '');
  c.taxArea = after('Tax Area');
  c.census = after('2020 Census Trct/Blk');
  const yb = afterAll('Year Built'); c.yearBuilt = (yb[0] || '').replace(/[^\d]/g, ''); c.yearBuiltMls = (yb[1] || '').replace(/[^\d]/g, '');
  const bd = afterAll('Bedrooms'); c.beds = bd[0] || ''; c.bedsMls = bd[1] || '';
  const ba = afterAll('Total Bathrooms'); c.baths = ba[0] || ''; c.bathsMls = ba[1] || '';
  const isq = afterAll('Improvement Sq. Ft'); c.sqftAssessor = (isq[0] || '').replace(/[^\d]/g, ''); c.sqftMls = (isq[1] || '').replace(/[^\d]/g, '');
  if (!c.sqftAssessor && c.sqft) c.sqftAssessor = c.sqft;
  const tr = afterAll('Total Rooms'); c.rooms = (tr[0] || '').replace(/[^\d]/g, ''); c.roomsMls = (tr[1] || '').replace(/[^\d]/g, '');
  c.lotSf = after('Lot Square Feet').replace(/[^\d]/g, '');
  c.acres = after('Acreage');
  const ll = after('Latitude/Longitude').replace(/°/g, ''); const llm = ll.match(/(-?\d+\.\d+)\s*\/\s*(-?\d+\.\d+)/); if (llm) { c.lat = llm[1]; c.lng = llm[2]; }
  const z = after('Zoning Code'); c.zoning = /^(Special|Owner|Road|Topography|District)/.test(z) ? '' : z;
  // FEMA: first row after the "Zone Code" header
  const fi = lines.findIndex(l => l.startsWith('Zone Code'));
  if (fi >= 0) for (let j = fi + 1; j < fi + 4 && j < lines.length; j++) {
    const cs = cells(lines[j]); if (/^(A|AE|AH|AO|AR|A99|V|VE|X|B|C|D)$/.test(cs[0])) {
      c.fema = cs[0]; c.femaRisk = cs[1] || '';
      const panel = lines[j].match(/(\d{6}-[0-9A-Z]{6,})/); if (panel) c.femaPanel = panel[1];
      const dt = lines[j].match(/(\d{2}\/\d{2}\/\d{4})\s*$/); if (dt) c.femaDate = dt[1];
      break;
    }
  }
  // Sales history rows start with two dates
  const si = lines.findIndex(l => l.startsWith('SALES HISTORY')), ti = lines.findIndex(l => l.startsWith('TAX ASSESSMENT'));
  c.sales = [];
  if (si >= 0) for (let j = si + 1; j < (ti > si ? ti : lines.length); j++) {
    const cs = cells(lines[j]); if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cs[0])) continue;
    const row = { date: cs[0], recorded: /^\d{1,2}\/\d{1,2}\/\d{4}/.test(cs[1] || '') ? cs[1].split(' ')[0] : '' };
    const amt = lines[j].match(/\$[\d,]+/); if (amt) row.amount = amt[0];
    // The seller's name can run into the deed type in one cell ("Funk Brian & Estate Of Grant Deed"): split it off.
    const INST = /(Grant Deed|Trustee'?s Deed|Quit ?claim Deed|Intrafamily Transfer|Interspousal (Transfer|Deed)|Correction Deed|Affidavit Of Death|Executor'?s Deed|Administrator'?s Deed|Gift Deed|Warranty Deed|Foreclosure|Transfer On Death Deed|Deed Of Distribution|Sheriff'?s Deed|Deed)\s*(\d{4}-)?$/i;
    const instCell = cs.find(x => INST.test(x)); let sellerPart = '';
    if (instCell) { const m = instCell.match(INST); row.instrument = m[1]; sellerPart = instCell.slice(0, m.index).trim(); }
    const rest = cs.slice(1).filter(x => x !== instCell && x !== cs[1] && !/^\$[\d,]+$/.test(x) && !/^\d{4}-$/.test(x) && !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(x));
    row.buyer = rest[0] || ''; row.seller = rest[1] || sellerPart || '';
    if (!rest.length && sellerPart) row.names = sellerPart; // buyer and seller printed together; kept as one line
    const docA = lines[j].match(/(\d{4}-)\s*$/); const nxt = lines[j + 1] ? lines[j + 1].match(/(\d{7})\s*$/) : null; if (docA && nxt) row.doc = docA[1] + nxt[1];
    c.sales.push(row);
  }
  // Mortgage history rows: "MM/DD/YYYY | $amount | borrower | lender | doc"
  const mi = lines.findIndex(l => l.startsWith('MORTGAGE HISTORY')); c.loans = [];
  if (mi >= 0) for (let j = mi + 1; j < lines.length && !/^FORECLOSURE|^PROPERTY CHARACTERISTICS/.test(lines[j]); j++) {
    const cs = cells(lines[j]); if (!/^\d{2}\/\d{2}\/\d{4}$/.test(cs[0]) || !/^\$/.test(cs[1] || '')) continue;
    c.loans.push({ date: cs[0], amount: cs[1], borrower: cs[2] || '', lender: cs[3] || '', doc: cs[4] || '' });
  }
  const li = lines.findIndex(l => l.startsWith('LEGAL DESCRIPTION')); c.legal = '';
  if (li >= 0) for (let j = li + 1; j < li + 6 && j < lines.length; j++) { const cs = cells(lines[j]); if (cs[0] === 'Description' && cs[1] && !/^(FEMA|Zone)/.test(cs[1])) { c.legal = cs[1]; break; } }
  return c;
}
