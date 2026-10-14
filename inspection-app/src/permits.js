/* ---------------- County "Permit History by Parcel" PDF parser ----------------
   Uses the positioned text rows from pdfLines (lines.rows = [[{x,s}]]). */
function parsePermits(lines) {
  const rows = lines.rows || lines.map(l => l.split(' | ').map((s, i) => ({ x: i * 200, s })));
  const txt = lines.map(l => String(l));
  const P = { geo: {}, districts: [], accela: [], lix: [], holds: [] };
  const find = re => txt.findIndex(l => re.test(l));
  const pn = txt.find(l => /^Parcel Number/.test(l)); if (pn) P.parcel = (pn.match(/(\d{3}-\d{3}-\d{3})/) || [])[1] || '';
  const ri = find(/^Reference Address/); if (ri >= 0 && txt[ri + 1]) { const cs = txt[ri + 1].split(' | '); P.addr = cs[0]; const ac = cs.find(c => /^\d+(\.\d+)?$/.test(c.trim())); if (ac) P.acreage = ac.trim(); }
  const z = txt.find(l => /^Zoning:/.test(l)); if (z) P.zoning = z.replace(/^Zoning:\s*/, '').trim();
  const sd = txt.find(l => /^Supervisorial District/.test(l)); if (sd) P.supDistrict = (sd.split('|')[1] || '').trim();
  // Parcel Geographical Data: label/value cells in columns; continuation rows join to the column they line up with
  const gi = find(/^Parcel Geographical Data/), ge = find(/^Year Built:/);
  if (gi >= 0) {
    let cols = []; // [{x, label, value}]
    for (let r = gi + 1; r < (ge > gi ? ge : gi + 30) && r < rows.length; r++) {
      rows[r].forEach(c => {
        const m = c.s.match(/^([A-Z][A-Za-z .'()/-]+?):\s*(.*)$/);
        if (m) cols.push({ x: c.x, label: m[1].trim(), value: m[2].trim(), row: r });
        else { const lastRow = Math.max(-1, ...cols.filter(k => k.row < r).map(k => k.row)); const prev = cols.filter(k => k.row === lastRow).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0]; if (prev) prev.value = (prev.value + ' ' + c.s).trim(); }
      });
    }
    cols.forEach(k => { P.geo[k.label] = k.value; });
  }
  if (ge >= 0) P.yearBuilt = (txt[ge].match(/(\d{4})/) || [])[1] || '';
  const di = find(/^Special Districts/), ai = find(/^Accela Cases/);
  if (di >= 0) for (let r = di + 1; r < (ai > di ? ai : di + 20); r++) txt[r].split(' | ').forEach(s => { s = s.trim(); if (s) P.districts.push(s); });
  // Accela cases (may continue on the next page)
  const STATUS = /^(Closed|Open|Active|Issued|Final|Finaled|Expired|Void|Pending|Approved|In Review|Withdrawn|Canceled|Cancelled)$/i;
  txt.forEach((l, r) => {
    const cs = l.split(' | ').map(s => s.trim());
    if (/^\d{2}[A-Z]{3}-[0-9O]{5}-\d{5}$|^\d{2}[A-Z]{3}-\d{5}$/.test(cs[0]) && /^(B|P|E|F|C|PW)$/.test(cs[1] || '')) {
      const st = STATUS.test(cs[cs.length - 1]) ? cs.pop() : ''; const mid = cs.slice(3);
      let planner = '', project = '';
      if (mid.length >= 2) { planner = mid[0]; project = mid.slice(1).join(' '); } else if (mid.length === 1) { if (/^[A-Z]{2,3}$/.test(mid[0])) planner = mid[0]; else project = mid[0]; }
      P.accela.push({ num: cs[0], dept: cs[1], filed: cs[2], planner, project, status: st });
    }
    if (/^\d{4,7}-\d{2}$/.test(cs[0]) && /\d{2}\/\d{2}\/\d{2}/.test(l)) {
      const dates = cs.filter(c => /^\d{2}\/\d{2}\/\d{2,4}$/.test(c));
      P.lix.push({ app: cs[0], type: cs[1] || '', desc: cs[2] || '', issued: dates[0] || '', action: dates[1] || '', status: cs[cs.length - 1] });
    }
  });
  // Parcel holds (section appears only when there are holds)
  const hi = find(/Parcel Hold|^Holds\b/i);
  if (hi >= 0) for (let r = hi + 1; r < txt.length && r < hi + 12; r++) { if (/^(Accela Cases|LIX |Special Districts|Parcel Geographical)/.test(txt[r])) break; if (txt[r].trim() && !/^There are no/i.test(txt[r])) P.holds.push(txt[r].replace(/ \| /g, ' · ')); }
  return P;
}
/* What kind of work a permit was for, and its year (file dates are application dates) */
const PERMIT_TAGS = [[/ROOF/, 'Roof'], [/KITCH/, 'Kitchen'], [/BATH|TUB|SHOWER/, 'Bath'], [/ADDIT/, 'Addition'], [/REMODEL/, 'Remodel'], [/SOLAR|PV\b/, 'Solar'], [/POOL|SPA\b/, 'Pool / spa'], [/\bADU\b|DWELLING UNIT|GUEST/, 'ADU / guest unit'], [/GARAGE/, 'Garage'], [/SHED/, 'Shed'], [/CONVERS/, 'Conversion'], [/DECK/, 'Deck'], [/WINDOW/, 'Windows'], [/PLUMB|REPIPE|WATER HEATER/, 'Plumbing'], [/ELECT|PANEL/, 'Electrical'], [/HVAC|FURNACE|MECH/, 'HVAC'], [/DEMO/, 'Demolition'], [/GRAD/, 'Grading']];
function permitItems(P) {
  const yr = d => { const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return ''; let y = +m[3]; if (y < 100) y += y > 40 ? 1900 : 2000; return String(y); };
  const out = [];
  (P.accela || []).forEach(a => { const tags = PERMIT_TAGS.filter(([re]) => re.test(a.project || '')).map(t => t[1]); out.push({ year: yr(a.filed), date: a.filed, what: a.project || '(no project name)', dept: { B: 'Building', P: 'Planning', E: 'Enforcement', F: 'Fire', PW: 'Public Works', C: 'Cannabis' }[a.dept] || a.dept, status: a.status, tags, num: a.num }); });
  (P.lix || []).forEach(l => { const tags = PERMIT_TAGS.filter(([re]) => re.test(l.desc || '')).map(t => t[1]); out.push({ year: yr(l.issued), date: l.issued, what: l.desc, dept: 'Building (LIX)', status: l.status, tags, num: l.app }); });
  return out.sort((a, b) => (+a.year || 0) - (+b.year || 0));
}
