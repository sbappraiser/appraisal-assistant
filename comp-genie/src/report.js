/* =====================================================================
   Report details for the full report (Oct 16 2026).
   Fills the parts of the 3.6 report that are not in the iPad inspection or the grid:
   assignment (from the order in the Appraisal Assistant), legal description, zoning,
   number of parcels, all rights included, highest and best use, market (from the
   hub's Market tab), contract (from the hub's document reader), value and dates.
   She decides every answer; the card only pre-fills what the order already says.
   ===================================================================== */
const ASSIGN = [['Purchase', 'Purchase'], ['Refinance', 'Refinance'], ['HomeEquity', 'Home equity'], ['Construction', 'Construction'], ['LoanModification', 'Loan modification'], ['REO', 'REO'], ['ShortSale', 'Short sale'], ['DeedInLieu', 'Deed in lieu'], ['Preforeclosure', 'Pre-foreclosure'], ['PortfolioEvaluation', 'Portfolio evaluation'], ['Other', 'Other']];
const VMETHOD = [['TraditionalAppraisal', 'Traditional appraisal'], ['HybridAppraisal', 'Hybrid appraisal'], ['DesktopAppraisal', 'Desktop appraisal']];
const VCOND = [['AsIs', 'As is'], ['SubjectToRepair', 'Subject to repair'], ['SubjectToInspection', 'Subject to inspection'], ['SubjectToCompletionPerPlans', 'Subject to completion per plans']];
/* her three boxes → UAD 3.6 Additional Scope of Work (one 2,500-character field) */
const sowText = R => [String(R.sowNote || '').trim(), String(R.eaNote || '').trim() ? 'Extraordinary assumptions: ' + String(R.eaNote).trim() : '', String(R.hcNote || '').trim() ? 'Hypothetical conditions: ' + String(R.hcNote).trim() : ''].filter(Boolean).join('\n\n');
/* Additional appraiser certifications (her ask Oct 21 2026; A-1 2200.0034 / .0086 / .0087, F-1 29.053): up to 6, 360 characters each */
const CERT_N = 6, CERT_MAX = 360;
const certList = R => Array.from({ length: CERT_N }, (_, i) => String(R['cert' + (i + 1)] || '').trim()).filter(Boolean);
const CERT_AI = ['The reported analyses, opinions and conclusions were developed, and this report has been prepared, in conformity with the requirements of the Code of Professional Ethics and Standards of Professional Practice of the Appraisal Institute.',
  'The use of this report is subject to the requirements of the Appraisal Institute relating to review by its duly authorized representatives.',
  'As of the date of this report, I have completed the continuing education program for Designated Members of the Appraisal Institute.'];   // her three, from her SFREP template (Oct 21 2026) – used until she saves her own
function certHTML(R) { const L = certList(R); if (R.addlCert !== 'true' && !L.length) return '';
  const n = Math.min(CERT_N, Math.max(3, L.length + 1));
  return `<div class="certs"><p class="help">One certification per box – SFREP shows each as its own numbered line (up to ${CERT_N}, ${CERT_MAX} characters each). They cannot contradict the standard certifications.</p>
    ${Array.from({ length: n }, (_, i) => { const k = 'cert' + (i + 1), v = String(R[k] || ''); return `<label class="fld"><span>Certification ${i + 1} <small class="${v.length > CERT_MAX ? 'warnTxt' : 'muted'}">${v.length} / ${CERT_MAX}</small></span><textarea class="txt" rows="3" maxlength="${CERT_MAX}" data-rpt="${k}">${esc(v)}</textarea></label>`; }).join('')}
    <div class="row"><button type="button" class="btn sm" data-act="cert-usual">Use my usual certifications</button><button type="button" class="btn sm" data-act="cert-save"${L.length ? '' : ' disabled'}>Save these as my usual</button></div></div>`; }
const sowAny = R => !!sowText(R); const sowLen = R => sowText(R).length;
/* her appraiser details (from her SFREP signature page, Oct 21 2026) */
const APPRAISER_ME = { first: 'Jennifer', middle: 'L', last: 'Heath', company: 'Jennifer Heath, LLC', addr: '5662 Calle Real, PNB #103', city: 'Goleta', state: 'CA', zip: '93117', licType: 'CertifiedResidential', lic: 'AR017399', licState: 'CA', licExp: '2027-03-04' };
const EXCL_REASONS = [['NotNecessaryForCredibleResults', 'Not necessary for credible results'], ['InsufficientData', 'Insufficient data'], ['LackOfLandSales', 'Lack of land sales'], ['DifficultyEstimatingDepreciation', 'Difficulty estimating depreciation'], ['Other', 'Other']];
const HBU_TESTS = [['legal', 'Legally permissible'], ['phys', 'Physically possible'], ['fin', 'Financially feasible'], ['max', 'Maximally productive']];
const ORDER_ASSIGN = { uadPurchase: 'Purchase', uadRefi: 'Refinance', uadHeloc: 'HomeEquity', uadConstruction: 'Construction', construction: 'Construction' };

const R0 = J => { J.report = J.report || { hbu: {} }; J.report.hbu = J.report.hbu || {}; return J.report; };
const orderOf = J => (app.orders || []).find(o => o.id === J.orderId) || null;
/* what the client's engagement letter asks for (read in the hub: order.letterFields, order.reqs) – her ask Oct 21 2026 */
function clientNeeds(J) { const o = orderOf(J); if (!o) return []; const F = o.letterFields || {}; const out = [];
  if (F.noCost) out.push({ k: 'noCost', t: 'Cost approach not required' }); else if (F.cost) out.push({ k: 'cost', t: 'Cost approach required' });
  if (F.rcnEach) out.push({ k: 'rcnEach', t: 'Replacement cost new (RCN) of each building' }); else if (F.rcn) out.push({ k: 'rcn', t: 'Replacement cost new / insurable value' });
  if (F.acn) out.push({ k: 'acn', t: 'ACN (actual cash value)' });
  if (F.rentWord || F.rent || o.rent) out.push({ k: 'rent', t: F.rentWord ? 'Rent survey' : 'Rent schedule (1007)' });
  if (F.ops) out.push({ k: 'ops', t: 'Operating income statement (216)' });
  if (F.mc) out.push({ k: 'mc', t: '1004MC market conditions' });
  if (F.docReview && F.docReview.length) out.push({ k: 'docs', t: 'Review / comment on: ' + F.docReview.join(', ') });
  const open = (o.reqs || []).filter(r => !r.done).length; if (open) out.push({ k: 'reqs', t: `${open} client requirement${open > 1 ? 's' : ''} not ticked yet (hub › Order › Client requirements)`, warn: true });
  return out; }
const clientNeedsHTML = J => { const L = clientNeeds(J); return L.length ? `<div class="cneeds"><b>The client's letter asks for:</b> ${L.map(x => `<span class="cneed${x.warn ? ' warn' : ''}">${esc(x.t)}</span>`).join(' ')}</div>` : ''; };
function zoneTable() { if (!app.zoneDesc) { app.zoneDesc = {}; DB.get('kv', 'zoneDesc').then(r => { app.zoneDesc = (r && r.v) || {}; if (app.job) rptRedraw(); }); } return app.zoneDesc; }

/* what the order, the inspection and the CRS already say (shown grey until she types her own) */
function reportFrom(J) {
  const o = orderOf(J) || {}, I = (J.subject.insp || {}), crs = J.subject.crs || {}, oc = o.crs || {};
  const zone = I.zoneCode || (o.permits && o.permits.zoning) || oc.zoning || crs.zoning || '';
  const apns = String(o.apn || J.subject.apn || I.apn || '').split(/[;,&]| and /).map(x => x.trim()).filter(Boolean);
  const c0 = (o.clients || [])[0] || {};
  return { assign: ORDER_ASSIGN[o.type] || (o.type ? 'Other' : ''), fileNo: o.fileNo || J.fileNo || '', eff: o.effDate || o.inspDate || o.dod || J.subject.eff || '',
    legal: o.legal || I.legal || crs.legal || '', rightsNot: o.rightsNot || '', zone, zoneDesc: I.zoneDesc || zoneTable()[zone.toUpperCase()] || '', parcels: apns.length || (I.apn ? 1 : ''),
    client: c0.company || c0.name || '', clientAddr1: c0.addr1 || '', clientAddr2: c0.addr2 || '',
    lender: o.lenderDiff ? (o.lenderCo || '') : '', lenderAddr1: o.lenderDiff ? o.lenderAddr1 || '' : '', lenderAddr2: o.lenderDiff ? o.lenderAddr2 || '' : '',
    amc: o.amcUsed ? (o.amcCo || '') : '', amcAddr1: o.amcUsed ? o.amcAddr1 || '' : '', amcAddr2: o.amcUsed ? o.amcAddr2 || '' : '',
    insp: I.inspType || 'InteriorAndExterior', market: (o.market && o.market.uad) || null, contract: o.uad || null, hasOrder: !!o.id, fee: o.fee || '', otherUsers: o.otherUsers || '', zoneComp: I.zoneComp || '', accessRaw: I.accessRaw || '',
    sowCost: o.id ? !!o.apCost : undefined, sowIncome: o.id ? !!o.apIncome : undefined, sowRent: o.id ? !!o.rent : undefined, sowAddlUser: o.id ? !!String(o.otherUsers || '').trim() : undefined,
    /* her Order › Scope of work tab (Oct 21 2026): highest and best use, added scope, extraordinary assumptions, hypothetical conditions */
    hbu: { legal: !!o.hbuLegal, phys: !!o.hbuPhys, fin: !!o.hbuFin, max: !!o.hbuMax }, hbuPresent: o.hbuPresent || '', hbuNote: o.hbuNote || '', sowNote: o.sowNote || '', eaNote: o.ea || '', hcNote: o.hc || '', addlCond: o.addlCond || '', addlCondText: o.addlCondText || '',
    listedYear: o.listing === 'listed' || o.listing === 'contract' ? true : undefined, priorHits: priorHits(J, o.effDate || o.inspDate || o.dod || J.subject.eff || '') };
}
const rv = (J, k) => { const R = R0(J), F = reportFrom(J); return blank(R[k]) ? F[k] : R[k]; };
/* her answers here, or the order's Scope of work tab where she left one blank (read-only copy for checking and export) */
function RE(J) { const R = R0(J), F = reportFrom(J); const o = { ...R }; ['hbuNote', 'hbuPresent', 'sowNote', 'eaNote', 'hcNote', 'addlCond', 'addlCondText'].forEach(k => { if (blank(R[k]) && !blank(F[k])) o[k] = F[k]; });
  o.hbu = Object.values(R.hbu || {}).some(Boolean) ? R.hbu : (Object.values(F.hbu || {}).some(Boolean) ? F.hbu : (R.hbu || {})); return o; }

/* her exposure-time rule (Oct 19 2026): count only the days a comp was on the market at a reasonable price – from its last price
   reduction to the pending / contingent date; a comp that was never reduced counts its days on market */
function expRows(J) {
  return usedComps(J).map(c => { const C = compFacts(c, J); const d = redDaysOf(C) ?? C.redDays; const dom = num(C.dom);
    const lp = num(C.listPrice) || num(C.origList), sp = num(C.price);   // her ask Oct 22 2026: show when a comp sold over the list price
    return { c, title: compTitle(c), use: c.use, lastRed: C.lastRed, days: d !== null ? d : dom, from: d !== null ? 'since the last price reduction' : 'days on market (no reduction)', dom, lp, sp, ratio: lp && sp ? sp / lp : null }; }).filter(r => r.days !== null && r.days !== undefined && !isNaN(r.days));
}
function expHelpHTML(J) {
  const L = expRows(J); if (!L.length) return '<p class="help">Your comps’ days on market at a reasonable price show here once the grid has comps (last price reduction from the MLS printout).</p>';
  const ds = L.map(r => r.days).sort((a, b) => a - b); const lo = ds[0], hi = ds[ds.length - 1], med = ds[Math.floor((ds.length - 1) / 2)];
  return `<div class="exphelp"><p class="help"><b>Days on the market at a reasonable price</b> (your rule: an overpriced period does not count – from the last price reduction to pending; no reduction = days on market)</p>
    <table class="mini"><tr><th>Comp</th><th>Last price reduction</th><th class="r">Days</th><th class="r">List price</th><th class="r">Sale price</th><th class="r">Sale / list</th><th></th></tr>${L.map(r => `<tr><td>${r.use}. ${esc(r.title)}</td><td>${r.lastRed ? esc(showDate(r.lastRed)) : '–'}</td><td class="r">${r.days}</td><td class="r">${r.lp ? money(r.lp) : '–'}</td><td class="r">${r.sp ? money(r.sp) : '–'}</td><td class="r">${r.ratio ? `${r.ratio > 1 ? '<b>' : ''}${(r.ratio * 100).toFixed(1)}%${r.ratio > 1 ? ' over list</b>' : ''}` : '–'}</td><td><small class="muted">${esc(r.from)}${r.lastRed && r.dom ? ' · ' + r.dom + ' total' : ''}</small></td></tr>`).join('')}</table>
    ${(() => { const R = L.filter(r => r.ratio), over = R.filter(r => r.ratio > 1); return R.length ? `<p class="help">${over.length ? `<b>${over.length} of ${R.length} sold over the list price</b> (${over.map(r => 'comp ' + r.use).join(', ')}) – a sign of competing offers and a short exposure time.` : `None of the ${R.length} sold over the list price.`} Median sale / list ${(R.map(r => r.ratio).sort((a, b) => a - b)[Math.floor((R.length - 1) / 2)] * 100).toFixed(1)}%.</p>` : ''; })()}
    <p>Range <b>${lo}–${hi} days</b> · median ${med} <button class="btn sm" data-act="exp-use" data-lo="${lo}" data-hi="${hi}">Use ${lo} to ${hi}</button></p></div>`;
}
/* prior services: her archive (subject records) and her orders for the same address in the 3 years before the effective date */
function priorHits(J, eff0) {
  const out = []; const eff = isoDate((J.report || {}).eff || eff0) || todayISO(); const from = (+eff.slice(0, 4) - 3) + eff.slice(4);
  const a = J.subject.addr || ''; if (!a) return out; const p = splitAddr(a); const key = addrKey(p.no, p.street, J.subject.unit || p.unit);
  try { if (ARCH.loaded) archiveFind({ apn: J.subject.apn, key }).forEach(r => { const d = String(r.entered_date || ''); if (r.record_role === 'subject' && d >= from && d < eff) out.push(`appraised (subject of ${r.from_report || 'a report'}, entered ${showDate(d)})`); }); } catch (e) {}
  (app.orders || []).forEach(o => { if (o.id === J.orderId) return; const s = String(o.address || '').split(',')[0]; const q = splitAddr(s); if (!s || addrKey(q.no, q.street, q.unit) !== key) return;
    const d = String(o.effective || o.inspDate || o.orderDate || o.created || '').slice(0, 10); if (d && d >= from && d < eff) out.push(`order ${o.fileNo || ''} (${showDate(d)}${o.stage ? ', ' + o.stage : ''})`.replace('order  (', 'order (')); });
  return out;
}
function reportHTML(J, part) {   // part: 'early' (Assignment, scope and site – right after the inspection) | 'late' (value and reconciliation) | all
  const R = R0(J), F = reportFrom(J), G = G0(J), H = RE(J).hbu, RX = RE(J);
  const inp = (k, ph, w) => `<input class="txt" data-rpt="${k}" value="${esc(R[k] ?? '')}" placeholder="${esc(F[k] || ph || '')}"${w ? ` style="width:${w}"` : ''}>`;
  const sel = (k, list, def, note = 'from the order') => `<select data-rpt="${k}"><option value="">${def ? esc((list.find(x => x[0] === def) || [, ''])[1]) + ' (' + note + ')' : '—'}</option>${list.map(([v, l]) => `<option value="${v}"${R[k] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const yn = (k, def) => `<select data-rpt="${k}"><option value="">${def === true ? 'Yes' : def === false ? 'No' : '—'}${def !== undefined ? ' (usual)' : ''}</option><option value="true"${R[k] === 'true' ? ' selected' : ''}>Yes</option><option value="false"${R[k] === 'false' ? ' selected' : ''}>No</option></select>`;
  /* drop-downs straight from Fannie Mae's A-1 list (her rule Oct 22 2026), less any choice hidden in Settings */
  const selA = (k, key, def, note = 'usual') => { const L = a1Opts(key); if (R[k] && !L.some(x => x[0] === R[k])) L.push([R[k], a1Label(R[k])]); return sel(k, L, def, note); };   // a hidden choice already chosen stays
  const ta = (k, max, ph, rows = 2) => `<textarea class="txt" rows="${rows}" maxlength="${max}" data-rpt="${k}" placeholder="${esc(ph || '')}">${esc(R[k] || '')}</textarea>`;
  const fx = (l, body, note) => `<label class="fld"><span>${l}${note ? ` <small class="muted">${note}</small>` : ''}</span>${body}</label>`;
  const M = F.market;
  /* her ask (Oct 21 2026): she did not see this was hers to fill in – a clear banner with what is still missing (from the pre-check), bigger type */
  const need = typeof precheckGrid === 'function' ? precheckGrid(J).filter(x => x.sev === 'Must fix' && typeof preGo === 'function' && (preGo0(J, x) || {}).label === 'Report details') : [];
  const out = `<h2>Report details <small>– yours to fill in before you export</small></h2>
  <div class="rptneed ${need.length ? 'warn' : 'done'}">${need.length ? `<b>${need.length} answer${need.length > 1 ? 's' : ''} still needed here:</b><ul>${need.map(x => `<li>${esc(x.msg.replace(/\s*\(Report details[^)]*\)\.?/, '').replace(/ – it is the value on page 1 of the report\./, ' – the value on page 1 of the report.'))}</li>`).join('')}</ul>` : '<b>✓ Everything the report needs here is answered.</b>'}
    <span class="rptkey"><span class="k own">your entry</span> <span class="k sug">suggested – type over it or leave it</span></span></div>
  ${clientNeedsHTML(J)}
  <p class="help">${F.hasOrder ? 'Grey entries come from the order in the Appraisal Assistant, your inspection or the CRS report. Type over any of them.' : 'This assignment is not linked to an order, so nothing is filled from the Appraisal Assistant. Open it from the order (Comp genie button on the order page) to fill the assignment, client and market.'}</p>
  <div class="rptgrid">
    <section><h3>Assignment <small>from 1 Intake</small></h3>
      ${F.hasOrder ? `<table class="mini rptfrom">${[['Client', rv(J, 'client')], ['Lender', rv(J, 'lender')], ['AMC', rv(J, 'amc')], ['File number', rv(J, 'fileNo')], ['Assignment reason', (ASSIGN.find(x => x[0] === rv(J, 'assign')) || [, rv(J, 'assign')])[1]]].map(([l, v]) => `<tr><th>${l}</th><td>${v ? esc(v) : '<span class="muted">—</span>'}</td></tr>`).join('')}</table>
      <p class="help">These live in <b>1 Intake</b> (the order). Change them there; they come here by themselves.</p>
      <label class="fld"><span>Effective date</span>${inp('eff', 'YYYY-MM-DD')}</label>
      <label class="fld"><span>Measurement standard (your sketch)</span>${sel('measStd', [['AmericanNationalStandardsInstitute', 'ANSI Z765'], ['AmericanMeasurementStandard', 'American Measurement Standard'], ['Other', 'Other']], 'AmericanNationalStandardsInstitute', 'usual')}</label>`
      : `      <label class="fld"><span>Assignment reason</span>${sel('assign', ASSIGN, F.assign)}</label>
      ${rv(J, 'assign') === 'Other' ? `<label class="fld"><span>Other reason</span>${inp('assignOther', 'e.g. Estate settlement')}</label>` : ''}
      <label class="fld"><span>Property valuation method</span>${sel('vmethod', VMETHOD, 'TraditionalAppraisal', 'usual')}</label>
      <label class="fld"><span>Measurement standard (your sketch)</span>${sel('measStd', [['AmericanNationalStandardsInstitute', 'ANSI Z765'], ['AmericanMeasurementStandard', 'American Measurement Standard'], ['Other', 'Other']], 'AmericanNationalStandardsInstitute', 'usual')}</label>
      <label class="fld"><span>Property data report used instead of an inspection?</span>${yn('pdr', false)}</label>
      <label class="fld"><span>Your file number</span>${inp('fileNo')}</label>
      <label class="fld"><span>Effective date</span>${inp('eff', 'YYYY-MM-DD')}</label>
      <label class="fld"><span>Client</span>${inp('client', 'Client name')}</label>
      <label class="fld"><span>Client address</span>${inp('clientAddr1', 'Street')} ${inp('clientAddr2', 'City, ST ZIP')}</label>
      <label class="fld"><span>Lender (if not the client)</span>${inp('lender')}</label>
      <label class="fld"><span>AMC</span>${inp('amc')}</label>
`}
      ${cmtBoxHTML(J, 'cAssign')}</section>
    <section><h3>Legal and rights</h3>
      <div class="fld"><span>Legal description <label class="btn sm">Import the deed (PDF)<input type="file" accept=".pdf" data-act="deed" hidden></label></span><textarea class="txt" rows="${Math.min(8, 2 + Math.round(String(R.legal || '').length / 140))}" data-rpt="legal" placeholder="${esc(F.legal || 'From the deed, the CRS report or the preliminary title report')}">${esc(R.legal || '')}</textarea></div>
      <label class="fld"><span>Number of parcels</span>${inp('parcels', '1', '5em')}</label>
      <label class="fld"><span>All rights included in the appraisal?</span>${yn('allRights', true)}</label>
      <label class="fld"><span>Rights not included <small class="muted">(only sent when the answer above is No; 540 characters)</small></span><textarea class="txt" rows="2" maxlength="540" data-rpt="rightsNot" placeholder="${esc(F.rightsNot || 'e.g. Oil, gas and mineral rights below 500 feet, reserved in a prior deed')}">${esc(R.rightsNot || '')}</textarea>${F.rightsNot && R.allRights !== 'false' ? '<small class="muted">The order has a reservation from the deed. If those rights are not part of what you appraised, answer No above.</small>' : ''}</label>
      ${R.allRights === 'false' ? `<label class="fld"><span>Kind of rights not included</span>${sel('rightsType', RIGHTS_TYPES, rightsGuess(rv(J, 'rightsNot')), 'from the description')}</label>${R.rightsType === 'Other' ? `<label class="fld"><span>Describe (33 characters)</span>${inp('rightsOther', 'e.g. Geothermal rights')}</label>` : ''}` : ''}
      ${rv(J, 'allRights') !== 'false' ? fx('Mineral rights leased?', yn('minLeased', false), 'only asked when the mineral rights are part of what you appraise') : ''}
      ${fx('Construction stage', selA('constr', 'PROPERTY_DETAIL/ConstructionStatusType', 'Complete'))}</section>
    <section><h3>Site</h3>
      <label class="fld"><span>Zoning code</span>${inp('zone', 'e.g. E-3', '8em')}</label>
      <label class="fld"><span>Zoning description</span>${inp('zoneDesc', 'e.g. One-family residential, 7,000 sq. ft. minimum lot')}<small class="muted">Kept for this code, so you type it once.</small></label>
      ${fx('Zoning compliance', selA('zoneComp', 'SITE_ZONING_DETAIL/SiteZoningComplianceType', F.zoneComp || '', F.zoneComp ? 'from your inspection' : 'usual'))}
      ${/LegalNonConforming|Illegal/.test(rv(J, 'zoneComp') || '') ? fx('Zoning compliance – describe', ta('zoneCompDesc', 246, 'e.g. The lot is smaller than the 7,000 sq ft minimum of the zone.'), '246 characters') : ''}
      ${rv(J, 'zoneComp') === 'LegalNonConforming' ? fx('Could it be rebuilt to its current density and use?', yn('zoneRebuild')) : ''}
      ${rv(J, 'zoneComp') === 'Illegal' ? fx('Why it is illegal', selA('zoneIllegal', 'ZONING_ILLEGAL_REASON/SiteZoningComplianceIllegalReasonType', '')) + (R.zoneIllegal === 'Other' ? fx('Describe', inp('zoneIllegalOther', '33 characters')) : '') : ''}
      ${fx('Site dimensions', inp('siteDim', 'e.g. 60 x 130 (from the plat map)'), '66 characters')}
      ${num(rv(J, 'parcels')) > 1 ? fx('Are the parcels next to each other?', yn('parcelsContig')) + (R.parcelsContig === 'false' ? fx('What separates them', selA('parcelSep', 'NON_CONTIGUOUS_PARCEL_SEPARATOR/ParcelSeparatorType', '')) + (R.parcelSep === 'Other' ? fx('Describe', inp('parcelSepOther', '33 characters')) : '') : '') : ''}
      ${!F.accessRaw || F.accessRaw === 'PrivateStreet' ? fx('Private street maintenance agreement known?', yn('privMaint'), 'only when the access is a private street') : ''}
      ${fx('Easement that affects the property?', yn('ease', false))}
      ${R.ease === 'true' ? fx('Kind of easement', selA('easeType', 'EASEMENT/EasementType', '')) + (R.easeType === 'Other' ? fx('Describe', inp('easeTypeOther', '45 characters')) : '') + fx('Effect on value or marketability', selA('easeImpact', 'EASEMENT/ValueMarketabilityImpactType', '')) + fx('Easement – describe', ta('easeDesc', 140, 'e.g. 10 ft utility easement along the rear lot line'), '140 characters') : ''}
      ${fx('Encroachment?', yn('encr', false))}
      ${R.encr === 'true' ? fx('What encroaches', selA('encrType', 'ENCROACHMENT/EncroachmentType', '')) + (R.encrType === 'Other' ? fx('Describe', inp('encrTypeOther', '45 characters')) : '') + fx('Direction', selA('encrDir', 'ENCROACHMENT/EncroachmentDirectionType', '')) + fx('Effect on value or marketability', selA('encrImpact', 'ENCROACHMENT/ValueMarketabilityImpactType', '')) + fx('Encroachment – describe', ta('encrDesc', 140, 'e.g. The neighbor’s fence is about 2 ft onto the subject site'), '140 characters') : ''}
      ${CMT_TIP}${cmtBoxHTML(J, 'cSite')}</section>
    <section><h3>Improvements</h3>
      <p class="help">The rooms, finishes, quality, condition, defects and photos come from your inspection. Add here only what those fields cannot show.</p>
      ${cmtBoxHTML(J, 'cSubject')}</section>
    <section><h3>Contract and history</h3>
      ${F.contract && F.contract.arms === 'false' || R.nonArmsNote ? fx('Not an arm’s-length sale – explain', ta('nonArmsNote', 1250, 'e.g. The buyer is the seller’s daughter; the price was set by the family.'), '1,250 characters') : ''}
      <label class="fld"><span>Subject listed for sale in the past year?</span>${yn('listedYear', F.listedYear)}</label>
      ${rv(J, 'listedYear') === 'true' || RX.listedYear === 'true' ? fx('Listing type', selA('lstType', 'LISTING_INFORMATION_DETAIL/ListingType', 'MLS')) + (R.lstType === 'Other' ? fx('Describe', inp('lstTypeOther', '45 characters')) : '') + fx('Status', selA('lstStatus', 'LISTING_INFORMATION_DETAIL/ListingStatusType', '')) + fx('Listing number (MLS #)', inp('lstId')) + fx('Start date', inp('lstStart', 'YYYY-MM-DD')) + fx('End date', inp('lstEnd', 'YYYY-MM-DD'), 'blank while still listed') + fx('Starting list price', inp('lstOrig', '$')) + fx('Final or current list price', inp('lstFinal', '$')) + fx('Days on market', inp('lstDom', '', '6em')) + fx('Total days on market (all listings)', inp('lstCdom', '', '6em')) : ''}
      ${cmtBoxHTML(J, 'cSubjPrior')}</section>
    <section><h3>Highest and best use</h3>
      ${HBU_TESTS.map(([k, l]) => `<label class="check"><input type="checkbox" data-hbu="${k}" ${H[k] ? 'checked' : ''}>${l}</label>`).join('')}
      <label class="fld"><span>Is the highest and best use as improved the present use?</span>${yn('hbuPresent', F.hbuPresent === 'true' ? true : F.hbuPresent === 'false' ? false : undefined)}</label>
      <div class="row"><button class="btn small" data-act="hbu-all">All four tests met · present use</button><button class="btn ghost small" data-act="hbu-draft">Draft the comment</button></div>
      <label class="fld"><span>Highest and best use comment ${cmtCount(String(R.hbuNote || ''), 4000)}</span><textarea class="txt" rows="4" maxlength="4000" data-rpt="hbuNote" placeholder="${esc(F.hbuNote ? 'From the order’s Scope of work: ' + F.hbuNote : 'Your comment')}">${esc(R.hbuNote || '')}</textarea></label></section>
    <section><h3>Approaches, assumptions and conditions <small>UAD 3.6 – every answer is required</small></h3>
      <label class="fld"><span>Cost approach developed?</span>${yn('sowCost', F.sowCost)}</label>
      <label class="fld"><span>Income approach developed?</span>${yn('sowIncome', F.sowIncome)}</label>
      <label class="fld"><span>Rent schedule (1007) included?</span>${yn('sowRent', F.sowRent)}</label>
      <label class="fld"><span>Government agency appraisal (FHA, VA, USDA)?</span>${yn('sowGov', false)}${R.sowGov === 'true' ? ` ${sel('govType', [['FHA', 'FHA'], ['VA', 'VA'], ['USDA', 'USDA']], '')}` : ''}</label>
      <label class="fld"><span>Intended users besides the client?</span>${yn('sowAddlUser', F.sowAddlUser)}</label>
      <label class="fld"><span>Additional scope of work?</span>${yn('sowAddlScope', sowAny(RX) ? true : false)}</label>
      <label class="fld"><span>Scope of work – what you did beyond the standard <small class="muted">(shares 2,500 characters with the two boxes below)</small></span><textarea class="txt" rows="3" maxlength="2500" data-rpt="sowNote" placeholder="${esc(F.sowNote ? 'From the order’s Scope of work: ' + F.sowNote : 'e.g. Exterior photos of the comps were taken from the street; the subject\'s permits were reviewed at the County.')}">${esc(R.sowNote || '')}</textarea></label>
      <label class="fld"><span>Extraordinary assumptions</span><textarea class="txt" rows="3" maxlength="2500" data-rpt="eaNote" placeholder="${esc(F.eaNote ? 'From the order’s Scope of work: ' + F.eaNote : 'e.g. The owner-reported permits for the 2010 remodel are assumed accurate; if not, the value could change.')}">${esc(R.eaNote || '')}</textarea></label>
      <label class="fld"><span>Hypothetical conditions</span><textarea class="txt" rows="3" maxlength="2500" data-rpt="hcNote" placeholder="${esc(F.hcNote ? 'From the order’s Scope of work: ' + F.hcNote : 'e.g. As if the repairs listed in the Unit Interior section were completed as of the effective date.')}">${esc(R.hcNote || '')}</textarea></label>
      <p class="help">${sowLen(RX).toLocaleString()} of 2,500 characters used (all three boxes together). Choose as is or subject to just below.</p>
      <label class="fld"><span>Market value condition – as is or subject to</span>${sel('vcond', VCOND, 'AsIs', 'usual')}</label>
      ${(R.vcond || 'AsIs') !== 'AsIs' ? fx('Condition rating as it is today', selA('asIsCond', 'VALUATION_RECONCILIATION_SUMMARY_DETAIL/PropertyAsIsConditionRatingCode', '')) : ''}</section>
    <section><h3>Comparable transfer history</h3>${cmtBoxHTML(J, 'cCompPrior')}</section>
    <section><h3>Prior services and certifications</h3>
      <label class="fld"><span>Prior services: have you performed any services on this property in the three years before accepting the assignment?</span>${yn('priorSvc')}</label>
      ${F.priorHits.length ? `<p class="help warnTxt">Your records show: ${F.priorHits.map(esc).join(' · ')}</p>` : '<p class="help">Nothing in your archive or your orders for this address in the three years before the effective date.</p>'}
      <label class="fld"><span>Describe the prior services <small class="muted">(only when Yes; 1,250 characters)</small></span><textarea class="txt" rows="2" maxlength="1250" data-rpt="priorSvcText" placeholder="e.g. I appraised the subject property for a refinance in May 2024.">${esc(R.priorSvcText || '')}</textarea></label>
      <label class="fld"><span>Additional appraiser certifications? <small class="muted">e.g. your Appraisal Institute certifications</small></span>${yn('addlCert', false)}</label>
      ${certHTML(R)}
      <label class="fld"><span>Is this a reconsideration of value?</span>${yn('reconsider', false)}</label>
      ${R.reconsider === 'true' ? fx('Requested by', selA('rovBy', 'RECONSIDERATION_OF_VALUE/ReconsiderationOfValueRequestedByType', 'BorrowerInitiated')) + fx('Result', selA('rovResult', 'RECONSIDERATION_OF_VALUE/ReconsiderationOfValueResultType', '')) + fx('Date of the result', inp('rovDate', 'YYYY-MM-DD')) + fx('Reconsideration of value – comment', ta('rovNote', 2500, 'What was asked, what you reviewed, and why the value did or did not change', 3), '2,500 characters') : ''}
      ${revHTML(R)}
    </section>
    <section><h3>Value and reconciliation</h3>
      ${rptIndHTML(J)}
      <label class="fld"><span>Opinion of market value</span>${inp('opinion', !blank(G.value) ? money(Math.round(num(G.value))) + ' (sales comparison)' : '$')}</label>
      <label class="fld"><span>Additional client-requested conditions? <small class="muted">(from the order – e.g. a value under a marketing-time limit)</small></span>${yn('addlCond', F.addlCond === 'true' ? true : false)}</label>
      ${RX.addlCond === 'true' ? `<label class="fld"><span>Describe them <small class="muted">(2,500 characters)</small></span><textarea class="txt" rows="2" maxlength="2500" data-rpt="addlCondText" placeholder="${esc(F.addlCondText ? 'From the order: ' + F.addlCondText : 'The conditions the client asked for')}">${esc(R.addlCondText || '')}</textarea></label>`
        + fx('Alternate opinion of value (under those conditions)', inp('altValue', '$')) + fx('Its value condition', selA('altCond', 'ADDITIONAL_REQUESTED_CONDITIONAL_VALUATION/PropertyValuationConditionalConclusionType', 'AsIs'))
        + fx('Its time frame', selA('altTime', 'ADDITIONAL_REQUESTED_CONDITIONAL_VALUATION/MarketingOrExposureTimeType', 'ClientImposedRestrictedMarketingTime')) + fx('Days', inp('altLow', 'from', '6em') + ' to ' + inp('altHigh', 'to', '6em')) : ''}
      <label class="fld"><span>Reasonable exposure time (days)</span>${inp('expLow', 'from', '6em')} to ${inp('expHigh', 'to', '6em')}</label>
      ${expHelpHTML(J)}
      ${M && M.mktime ? `<p class="help">Marketing time (from <b>3 Market</b>): <b>${esc({ UnderThreeMonths: 'under 3 months', ThreeToSixMonths: '3 to 6 months', OverSixMonths: 'over 6 months' }[M.mktime] || M.mktime)}</b> – your exposure time should agree with it.</p>` : ''}
      ${['Income', 'Cost'].map(A => { const off = R['sow' + A] === 'false' || (blank(R['sow' + A]) && F['sow' + A] === false); if (!off) return ''; const k = 'excl' + A;
        return `<label class="fld"><span>${A} approach not developed – reason</span>${sel(k, EXCL_REASONS.filter(x => A === 'Cost' || !/Depreciation|Land/.test(x[0])), 'NotNecessaryForCredibleResults', 'usual')}${R[k] === 'Other' ? ` <input class="txt" data-rpt="${k}Other" maxlength="225" value="${esc(R[k + 'Other'] || '')}" placeholder="Describe (225 characters)">` : ''}</label>`; }).join('')}
      <label class="fld"><span>Reconciliation comment ${cmtCount(String(R.reconNote || ''), 5000)}</span><textarea class="txt" rows="3" maxlength="5000" data-rpt="reconNote">${esc(R.reconNote || '')}</textarea></label></section>
    <section><h3>Market <small>on the Appraisal Assistant's Market tab</small></h3>
      ${M ? `<table class="mini"><tr><th>Look back</th><td>${esc(M.L)} months</td></tr><tr><th>Actives</th><td>${esc(M.activeN)}${M.activeN ? ` · ${money(M.activeLow)} / ${money(M.activeMed)} / ${money(M.activeHigh)} · median DOM ${esc(Math.round(M.activeDom))}` : ''}</td></tr>
        <tr><th>Pendings</th><td>${esc(M.pendingN)}</td></tr><tr><th>Sales</th><td>${esc(M.salesN)}${M.salesN ? ` · ${money(M.saleLow)} / ${money(M.saleMed)} / ${money(M.saleHigh)}` : ''}</td></tr>
        <tr><th>Demand / supply</th><td>${esc({ Shortage: 'Shortage', InBalance: 'In balance', OverSupply: 'Oversupply' }[M.supply] || '—')}</td></tr><tr><th>Marketing time</th><td>${esc({ UnderThreeMonths: 'Under 3 months', ThreeToSixMonths: '3 to 6 months', OverSixMonths: 'Over 6 months' }[M.mktime] || '—')}</td></tr><tr><th>Distressed competition</th><td>${M.distress === 'true' ? 'Yes' : M.distress === 'false' ? 'No' : '—'}</td></tr>
        <tr><th>Boundary</th><td>${M.boundary ? '✓' : '<b class="warnTxt">missing</b>'}</td></tr><tr><th>Search criteria</th><td>${M.criteria ? '✓' : '<b class="warnTxt">missing</b>'}</td></tr><tr><th>Price trend comment</th><td>${M.comment ? '✓ ' + M.comment.length.toLocaleString() + ' characters' : '<b class="warnTxt">missing</b>'}</td></tr></table>
        <p class="help">These go into the Market section. To change them, open the order's Market tab in the Appraisal Assistant, then come back here.</p>`
      : `<p class="help">${F.hasOrder ? 'Nothing yet. In the Appraisal Assistant open this order › <b>Market</b> tab: drop your SBMLS market-area search CSV (the micro market: actives, pendings and sales in the look-back period) and, once a month, the SBMLS monthly statistics PDF (the macro market). Check the boundary, criteria and price-trend comment, then come back here.' : 'Link this assignment to an order to bring in the Market section.'}</p>`}
      ${M && M.general ? `<p class="help">Market commentary: ✓ ${M.general.length.toLocaleString()} characters (Market tab).</p>` : '<p class="help">Market commentary: write it on the Market tab, under the Price Trend commentary.</p>'}${R.cMarket ? cmtBoxHTML(J, 'cMarket') + '<small class="muted">You typed this here before; it is used instead of the Market tab’s. Clear it to use the Market tab’s.</small>' : ''}
      ${F.contract && (F.contract.price || F.contract.cdate) ? `<p class="help">Sales contract (from the document reader): ${esc(money(num(String(F.contract.price).replace(/[$,]/g, ''))))}${F.contract.cdate ? ' · ' + esc(F.contract.cdate) : ''} – goes into the contract section.</p>` : ''}</section>
  </div>`;
  return part ? rptPart(J, out, part) : out;
}

function hbuDraft(J) {
  const R = R0(J), z = rv(J, 'zone'), zd = rv(J, 'zoneDesc');
  return `The subject's present use as a single-family residence is legally permissible under its ${z ? z + ' ' : ''}zoning${zd ? ' (' + zd + ')' : ''}, physically possible given the site's size, shape, topography and access, financially feasible, and maximally productive, as supported by the market data in this report. The highest and best use of the subject as improved is its present use.`;
}

document.addEventListener('change', e => {
  const t = e.target; if (!app.job) return; const R = R0(app.job);
  if (t.dataset.rpt) { const k = t.dataset.rpt, v = t.value.trim(); if (v === '') delete R[k]; else R[k] = k === 'zone' ? v.toUpperCase() : t.tagName === 'TEXTAREA' ? t.value : v;
    if (k === 'zoneDesc' && v) { const code = rv(app.job, 'zone').toUpperCase(); if (code) { zoneTable()[code] = v; DB.put('kv', { id: 'zoneDesc', v: app.zoneDesc }); } }
    save(); if (['assign', 'zone', 'allRights', 'rightsType', 'sowGov', 'addlCond', 'sowIncome', 'sowCost', 'exclIncome', 'exclCost', 'sowNote', 'eaNote', 'hcNote', 'addlCert', 'zoneComp', 'zoneIllegal', 'parcels', 'parcelsContig', 'parcelSep', 'ease', 'easeType', 'encr', 'encrType', 'listedYear', 'lstType', 'vcond', 'allRights', 'reconsider', 'addlCond'].includes(k) || /^cert\d$/.test(k)) rptRedraw();
    else [['#setupCard', 'early'], ['#compHistCard', 'comps'], ['#reportCard', 'late'], ['#certCard', 'certs']].forEach(([id, pt]) => { const b = document.querySelector(id + ' .rptneed'); if (b) { const d = document.createElement('div'); d.innerHTML = reportHTML(app.job, pt); const nb = d.querySelector('.rptneed'); if (nb) b.replaceWith(nb); } });   /* the 'still needed' list follows her answers */
    return; }
  if (t.dataset.hbu) { R.hbu[t.dataset.hbu] = t.checked; save(); }
});
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-act="cert-usual"],[data-act="cert-save"]'); if (!b || !app.job) return; const R = R0(app.job);
  if (b.dataset.act === 'cert-save') { await DB.put('kv', { id: 'myCerts', v: certList(R) }); toast('Saved – “Use my usual certifications” puts these in on your next report'); return; }
  const mine = ((await DB.get('kv', 'myCerts')) || {}).v; const L = mine && mine.length ? mine : CERT_AI;
  if (certList(R).length && !confirm('Replace the certifications in these boxes with your usual ones?')) return;
  for (let i = 1; i <= CERT_N; i++) delete R['cert' + i]; L.slice(0, CERT_N).forEach((t, i) => R['cert' + (i + 1)] = t); R.addlCert = 'true'; save();
  rptRedraw(); toast(mine && mine.length ? 'Your usual certifications are in' : 'Your three Appraisal Institute certifications are in – edit them, then “Save these as my usual”'); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="hbu-all"],[data-act="hbu-draft"],[data-act="exp-use"]'); if (!b || !app.job) return; const R = R0(app.job);
  if (b.dataset.act === 'exp-use') { R.expLow = b.dataset.lo; R.expHigh = b.dataset.hi; }
  if (b.dataset.act === 'hbu-all') { HBU_TESTS.forEach(([k]) => R.hbu[k] = true); R.hbuPresent = 'true'; }
  if (b.dataset.act === 'hbu-draft') { if (R.hbuNote && !confirm('Replace your comment with a new draft?')) return; R.hbuNote = hbuDraft(app.job); }
  save(); rptRedraw();
});

/* element order for the items added Oct 19 2026 that the D-1 sample does not show (A-1 order: alphabetical within the container) */
{ const ins = (p, tag, after) => { const L = D1_ORDER[p]; if (!L || L.includes(tag)) return; const i = after ? L.indexOf(after) : -1; if (after && i >= 0) L.splice(i + 1, 0, tag); else L.unshift(tag); };
  ins('SCOPE_OF_WORK_DETAIL', 'GovernmentAgencyAppraisalType', 'GovernmentAgencyAppraisalIndicator'); ins('SCOPE_OF_WORK_DETAIL', 'ValuationAssignmentTypeOtherDescription', 'ValuationAssignmentType'); ins('SCOPE_OF_WORK_DETAIL', 'ValuationScopeOfWorkDescription', 'ValuationAssignmentTypeOtherDescription');
  ins('VALUATION_RECONCILIATION_DETAIL', 'AdditionalClientRequestedConditionsCommentDescription'); ins('VALUATION_REPORT_DETAIL', 'AppraiserPriorServicesPerformedDescription', 'AppraiserFileIdentifier'); }
/* rights not included (A-1 0100.0035–0037, sort 1350–1352: after PROPERTY_VALUATIONS, before SALES_CONTRACTS) */
if (D1_ORDER.PROPERTY && !D1_ORDER.PROPERTY.includes('REAL_PROPERTY_INTERESTS')) D1_ORDER.PROPERTY.splice(D1_ORDER.PROPERTY.indexOf('SALES_CONTRACTS'), 0, 'REAL_PROPERTY_INTERESTS');
D1_ORDER.REAL_PROPERTY_INTERESTS = D1_ORDER.REAL_PROPERTY_INTERESTS || ['REAL_PROPERTY_INTEREST'];
D1_ORDER.REAL_PROPERTY_INTEREST = D1_ORDER.REAL_PROPERTY_INTEREST || ['AppraisedIndicator', 'PropertyPartialInterestType', 'PropertyPartialInterestTypeOtherDescription'];
const RIGHTS_TYPES = [['MineralRights', 'Mineral rights (oil, gas, minerals)'], ['WaterRights', 'Water rights'], ['AirRights', 'Air rights'], ['TimberRights', 'Timber rights'], ['Other', 'Other']];
const rightsGuess = t => /oil|gas|mineral|hydrocarbon/i.test(t || '') ? 'MineralRights' : /water/i.test(t || '') ? 'WaterRights' : /timber/i.test(t || '') ? 'TimberRights' : /\bair\b/i.test(t || '') ? 'AirRights' : '';

/* ---------------- into the full report (DOM of the merged file) ---------------- */
function writeReportXML(doc, NS, J, SUBJ, VA, SVC) {
  const R = RE(J), F = reportFrom(J), H = R.hbu, G = G0(J);   // RE: her answers, else the order's Scope of work tab
  const pos = (parent, tag) => { const seq = D1_ORDER[parent.localName] || []; const r = seq.indexOf(tag); const kids = [...parent.children];
    if (r >= 0) return kids.find(k => { const i = seq.indexOf(k.localName); return i > r; }) || null;
    return kids.find(k => seq.indexOf(k.localName) < 0 && k.localName > tag) || null; };
  const child = (parent, tag) => { for (const k of parent.children) if (k.localName === tag) return k; const e = doc.createElementNS(NS, tag); parent.insertBefore(e, pos(parent, tag)); return e; };
  const add = (parent, tag) => { const e = doc.createElementNS(NS, tag); const kids = [...parent.children].filter(k => k.localName === tag); const last = kids[kids.length - 1]; parent.insertBefore(e, last ? last.nextSibling : pos(parent, tag)); return e; };
  const set = (parent, tag, v) => { if (blank(v) || v === '') return; const e = child(parent, tag); e.textContent = String(v); return e; };
  const path = (el, ...tags) => tags.reduce((p, t) => child(p, t), el);
  const tf = (k, def) => { const v = R[k]; return v === 'true' ? 'true' : v === 'false' ? 'false' : def; };
  const VR = child(VA, 'VALUATION_REPORT');
  if (typeof costXML === 'function') costXML(J, VR, child, set, doc, NS, SVC);   // her cost approach (costapp.js)
  if (typeof incomeXML === 'function') incomeXML(J, VR, child, set);   // GRM income approach (income.js)
  const comment = (cat, text, max) => { if (!text) return; const VC = child(VR, 'VALUATION_COMMENTARIES');
    for (const c of VC.children) { const ct = [...c.children].find(k => k.localName === 'ValuationAnalysisCategoryType'); if (ct && ct.textContent === cat) { const tx = [...c.children].find(k => k.localName === 'ValuationCommentText'); if (tx) tx.textContent = text.slice(0, max); return; } }
    const c = add(VC, 'VALUATION_COMMENTARY'); set(c, 'ValuationAnalysisCategoryType', cat); set(c, 'ValuationCommentText', text.slice(0, max)); };

  // assignment
  const sow = path(VR, 'SCOPE_OF_WORK', 'SCOPE_OF_WORK_DETAIL');
  set(sow, 'SalesComparisonApproachIndicator', 'true');
  const asg = rv(J, 'assign'); set(sow, 'ValuationAssignmentType', asg); if (asg === 'Other') set(sow, 'ValuationAssignmentTypeOtherDescription', (R.assignOther || '').slice(0, 33) || null);
  const rd = path(VR, 'VALUATION_REPORT_DETAIL');
  set(rd, 'AppraiserFileIdentifier', rv(J, 'fileNo')); set(rd, 'PropertyDataReportIndicator', tf('pdr', 'false'));
  set(rd, 'MeasurementStandardPublisherType', rv(J, 'measStd') || 'AmericanNationalStandardsInstitute'); set(rd, 'SketchExistsIndicator', 'true');   /* A-1 3300.0007: required with a sketch (her Oct 21 import: Sketch › Measurement Standard blank) */ set(rd, 'ValuationReportInspectionCertificationType', F.insp);
  { const fb = (k, def) => tf(k, def === true ? 'true' : def === false ? 'false' : undefined);   // the order's answer when she has not chosen
    set(sow, 'CostApproachIndicator', fb('sowCost', F.sowCost)); set(sow, 'IncomeApproachIndicator', fb('sowIncome', F.sowIncome)); set(sow, 'RentScheduleIndicator', fb('sowRent', F.sowRent));
    set(sow, 'GovernmentAgencyAppraisalIndicator', fb('sowGov', false)); if (R.sowGov === 'true' && R.govType) set(sow, 'GovernmentAgencyAppraisalType', R.govType);
    set(sow, 'ValuationAdditionalIntendedUserIndicator', fb('sowAddlUser', F.sowAddlUser)); set(sow, 'ValuationAdditionalScopeOfWorkIndicator', R.sowAddlScope === 'false' && !sowAny(R) ? 'false' : sowAny(R) || R.sowAddlScope === 'true' ? 'true' : 'false');   /* her text turns it on (A-1 2200.0062 / .0003; her Oct 21 SFREP: the box was there but the indicator No) */
    if (sowAny(R)) set(sow, 'ValuationScopeOfWorkDescription', sowText(R).slice(0, 2500));   // her added scope, extraordinary assumptions and hypothetical conditions in the one 3.6 field (F-1 29.003)
    { const CL = R.addlCert === 'false' ? [] : certList(R); set(rd, 'AppraiserAdditionalCertificationIndicator', CL.length ? 'true' : 'false');   // her certifications turn it on; Yes with none typed would fail the import (pre-check)
      if (CL.length) { const CS = child(path(VR, 'SCOPE_OF_WORK'), 'VALUATION_REPORT_ADDITIONAL_CERTIFICATIONS');
        CL.forEach(t => { const c = add(CS, 'VALUATION_REPORT_ADDITIONAL_CERTIFICATION'); set(c, 'ValuationAdditionalCertificationIncludedByType', 'Appraiser'); set(c, 'ValuationAdditionalCertificationText', t.slice(0, CERT_MAX)); }); } } set(rd, 'ReconsiderationOfValueIndicator', fb('reconsider', false));
    set(rd, 'AppraiserPriorServicesPerformedIndicator', tf('priorSvc')); if (R.priorSvc === 'true' && R.priorSvcText) set(rd, 'AppraiserPriorServicesPerformedDescription', R.priorSvcText.slice(0, 1250));
    set(child(SUBJ, 'LISTING_INFORMATION_SUMMARY'), 'ListedWithinPreviousYearIndicator', fb('listedYear', F.listedYear));
    if (SVC) set(child(SVC, 'SERVICE_DETAIL'), 'ServiceType', 'Valuation');
    const rdet = path(VR, 'VALUATION_RECONCILIATION', 'VALUATION_RECONCILIATION_DETAIL'); { const X = RE(J); set(rdet, 'AdditionalClientRequestedConditionsIndicator', X.addlCond === 'true' ? 'true' : 'false');   // her answer, else the order's (her ask Oct 22 2026: it belongs in the order)
    if (X.addlCond === 'true' && X.addlCondText) set(rdet, 'AdditionalClientRequestedConditionsCommentDescription', String(X.addlCondText).slice(0, 2500)); } }
  set(path(SUBJ, 'PROPERTY_VALUATIONS', 'PROPERTY_VALUATION', 'PROPERTY_VALUATION_DETAIL'), 'PropertyValuationMethodType', R.vmethod || 'TraditionalAppraisal');
  // reconciliation
  const rs = path(VR, 'VALUATION_RECONCILIATION', 'VALUATION_RECONCILIATION_SUMMARY');
  set(path(rs, 'VALUATION_CONDITIONS', 'VALUATION_CONDITION'), 'PropertyValuationConditionalConclusionType', R.vcond || 'AsIs');
  const rsd = child(rs, 'VALUATION_RECONCILIATION_SUMMARY_DETAIL');
  const eff = isoDate(rv(J, 'eff')) || rv(J, 'eff'); set(rsd, 'AppraisalReportEffectiveDate', eff);
  if (!blank(R.expLow) || !blank(R.expHigh)) { set(rsd, 'MarketingOrExposureHighRangeDaysCount', num(R.expHigh)); set(rsd, 'MarketingOrExposureLowRangeDaysCount', num(R.expLow)); set(rsd, 'MarketingOrExposureTimeType', 'ReasonableExposureTime'); }
  const op = rptOpinion(J); set(rsd, 'OpinionOfValueAmount', op === null ? null : Math.round(op));
  /* A-1 1300.0002 / .0004: the reason an approach was not developed (SFREP showed Reason for Exclusion red) */
  [['Income', 'INCOME_APPROACH'], ['Cost', 'COST_APPROACH']].forEach(([A, tag]) => { const off = R['sow' + A] === 'false' || (blank(R['sow' + A]) && F['sow' + A] === false); if (!off) return;   // only when the approach is answered No
    const why = R['excl' + A] || 'NotNecessaryForCredibleResults'; const e = path(VR, 'APPROACH_TO_VALUE', tag, 'VALUATION_APPROACH_EXCLUSION_REASONS', 'VALUATION_APPROACH_EXCLUSION_REASON');
    set(e, 'ValuationApproachExclusionReasonType', why); if (why === 'Other') set(e, 'ValuationApproachExclusionReasonTypeOtherDescription', String(R['excl' + A + 'Other'] || 'Other').slice(0, 225)); });
  if (R.reconNote) set(path(VR, 'VALUATION_RECONCILIATION', 'VALUATION_RECONCILIATION_DETAIL'), 'ValuationReconciliationSummaryCommentDescription', R.reconNote.slice(0, 5000));
  // subject: legal, parcels, zoning, rights, H&BU
  const legal = rv(J, 'legal'); if (legal) set(path(SUBJ, 'PARCEL_SUMMARY', 'PARCEL_SUMMARY_DETAIL'), 'ParcelsLegalDescription', legal.slice(0, 15000));
  const SITE = child(SUBJ, 'SITE');
  set(child(SITE, 'SITE_SIZE_LAYOUT'), 'ParcelCount', num(rv(J, 'parcels')) || 1);
  const zone = rv(J, 'zone'), zd = rv(J, 'zoneDesc');
  if (zone || zd) { const z = path(SITE, 'SITE_ZONING', 'SITE_ZONING_DETAIL'); set(z, 'SiteZoningClassificationDescription', zd && zd.slice(0, 100)); set(z, 'SiteZoningClassificationIdentifier', zone); }
  set(path(SUBJ, 'SALES_CONTRACTS', 'SALES_CONTRACT', 'SALES_CONTRACT_DETAIL'), 'AllPropertyRightsAppraisedIndicator', tf('allRights', 'true'));
  t2XML(J, R, SUBJ, VR, child, add, set, path, doc, NS);   // tentacle 2 office fields (Oct 22 2026)
  t78XML(J, R, VR, SVC, child, add, set, path);   // tentacles 7 and 8 (Oct 22 2026)
  if (tf('allRights', 'true') === 'false') { const rn = rv(J, 'rightsNot'); if (rn) set(sow, 'PropertyRightsNotAppraisedDescription', String(rn).slice(0, 540));
    const ty = R.rightsType || rightsGuess(rn); if (ty) { const ri = add(path(SUBJ, 'REAL_PROPERTY_INTERESTS'), 'REAL_PROPERTY_INTEREST');
      set(ri, 'AppraisedIndicator', 'false'); set(ri, 'PropertyPartialInterestType', ty); if (ty === 'Other') set(ri, 'PropertyPartialInterestTypeOtherDescription', String(R.rightsOther || '').slice(0, 33) || null); } }
  if (HBU_TESTS.some(([k]) => H[k]) || R.hbuPresent) { const hb = child(SITE, 'HIGHEST_AND_BEST_USE');
    set(hb, 'FinanciallyFeasibleIndicator', String(!!H.fin)); set(hb, 'LegallyPermissibleIndicator', String(!!H.legal)); set(hb, 'MaximallyProductiveIndicator', String(!!H.max)); set(hb, 'PhysicallyPossibleIndicator', String(!!H.phys)); set(hb, 'SiteHighestBestUseIndicator', R.hbuPresent || null); }
  comment('HighestAndBestUse', R.hbuNote, 4000);
  if (typeof CMT_BOXES !== 'undefined') CMT_BOXES.forEach(([k, cat, , max]) => comment(cat, String(R[k] || (k === 'cMarket' && F.market && F.market.general) || '').trim(), max));   // market commentary: the hub's Market tab unless she typed one here   // her comment boxes for SFREP (cmtdraft.js)
  // usable lot area in the site comment (it cannot be a site influence)
  const S = subjFacts(J);
  if (!blank(S.usable)) { const VC = child(VR, 'VALUATION_COMMENTARIES'); const line = `Usable Lot Area/Utility: ${(+S.usable).toFixed(2)} ac.`;
    let c = [...VC.children].find(c => [...c.children].some(k => k.localName === 'ValuationAnalysisCategoryType' && k.textContent === 'SiteFeatures'));
    if (c) { const tx = [...c.children].find(k => k.localName === 'ValuationCommentText'); if (tx && !/Usable Lot Area\/Utility/.test(tx.textContent)) tx.textContent = (tx.textContent.trim() + ' ' + line).trim(); }
    else comment('SiteFeatures', line, 4000); }
  // market (hub Market tab)
  const M = F.market;
  if (M) { const MK = child(SUBJ, 'MARKET'); const md = child(MK, 'MARKET_DETAIL');
    set(md, 'MarketBoundariesDescription', M.boundary && M.boundary.slice(0, 1250)); set(md, 'MarketInventoryLookbackMonthsCount', M.L); set(md, 'MarketInventorySearchParameterDescription', M.criteria && M.criteria.slice(0, 1250));
    const inv = child(MK, 'MARKET_INVENTORIES'); while (inv.firstChild) inv.removeChild(inv.firstChild);
    const mi = (n, lo, med, hi, dom, type) => { const e = add(inv, 'MARKET_INVENTORY'); set(e, 'MarketInventoryCount', n); if (n) { set(e, 'MarketInventoryHighestPriceAmount', hi); set(e, 'MarketInventoryLowestPriceAmount', lo); set(e, 'MarketInventoryMedianDaysOnMarketCount', dom == null ? null : Math.round(dom)); set(e, 'MarketInventoryMedianPriceAmount', med == null ? null : Math.round(med)); } set(e, 'MarketInventoryType', type); };
    mi(M.activeN, M.activeLow, M.activeMed, M.activeHigh, M.activeDom, 'ActiveListings'); mi(M.pendingN, null, null, null, null, 'PendingSales'); mi(M.salesN, M.saleLow, M.saleMed, M.saleHigh, null, 'TotalSales');
    let tr = [...MK.children].find(k => k.localName === 'MARKET_TREND'); if (!tr) { tr = child(MK, 'MARKET_TREND'); tr.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:label', 'MARKET_TREND_1'); }
    set(tr, 'MarketingTimeType', M.mktime); set(tr, 'MarketSupplyTrendType', M.supply); set(tr, 'MarketTrendsForeclosureActivityIndicator', M.distress);
    if (M.comment) set(tr, 'PriceTrendsAnalysisDescription', M.comment.slice(0, 2500)); }
  // sales contract (hub document reader)
  const K = F.contract;
  if (K && (K.price || K.cdate || K.saleType)) { const sc = path(SUBJ, 'SALES_CONTRACTS', 'SALES_CONTRACT', 'SALES_CONTRACT_DETAIL');
    const yn = v => v === 'true' ? 'true' : v === 'false' ? 'false' : null;
    set(sc, 'ArmsLengthIndicator', yn(K.arms)); set(sc, 'PersonalPropertyIncludedIndicator', yn(K.pp)); set(sc, 'SalesConcessionIndicator', yn(K.conc)); set(sc, 'SalesConcessionsTypicalToMarketIndicator', yn(K.concTyp));
    const p = num(String(K.price || '').replace(/[$,\s]/g, '')); set(sc, 'SalesContractAmount', p); set(sc, 'SalesContractDate', isoDate(K.cdate) || null); set(sc, 'SalesContractExistsIndicator', 'true'); set(sc, 'SalesContractReviewedIndicator', 'true');
    set(sc, 'SaleType', K.saleType); const ca = num(String(K.concAmt || '').replace(/[$,\s]/g, '')); if (ca !== null) set(sc, 'TotalSalesConcessionAmount', ca);
    comment('SalesContract', K.cmt, 5000); }
  /* the appraiser (A-1 2400.0041 / .0047 / .0051, required) and who completed the inspection (D-1: INSPECTION_CompletedBy_ROLE) –
     her Oct 21 import showed Scope of Inspection by Appraiser red. Her details (APPRAISER_ME); with Overwrite off SFREP keeps her own profile. */
  { const M = APPRAISER_ME; const PS = child(SVC, 'PARTIES'); const P = add(PS, 'PARTY'); const nm = path(P, 'INDIVIDUAL', 'NAME'); set(nm, 'FirstName', M.first); set(nm, 'LastName', M.last); if (M.middle) set(nm, 'MiddleName', M.middle);
    const ad = path(P, 'ADDRESSES', 'ADDRESS'); set(ad, 'AddressLineText', M.addr); set(ad, 'CityName', M.city); set(ad, 'PostalCode', M.zip); set(ad, 'StateCode', M.state);
    const RO = child(child(P, 'ROLES'), 'ROLE'); RO.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:label', 'ROLE_Appraiser'); set(path(RO, 'APPRAISER', 'APPRAISER_DETAIL'), 'AppraiserCompanyName', M.company);
    const L = path(RO, 'LICENSES', 'LICENSE'); set(child(L, 'APPRAISER_LICENSE'), 'AppraiserLicenseType', M.licType); const LD = child(L, 'LICENSE_DETAIL'); set(LD, 'LicenseExpirationDate', M.licExp); set(LD, 'LicenseIdentifier', M.lic); set(LD, 'LicenseIssuingAuthorityStateCode', M.licState);
    set(child(RO, 'ROLE_DETAIL'), 'PartyRoleType', 'Appraiser');
    { const fee = num(String(reportFrom(J).fee || '').replace(/[$,\s]/g, '')); if (fee) { const PSV = path(RO, 'SERVICE_PROVIDER', 'PROVIDED_SERVICES', 'PROVIDED_SERVICE'); set(PSV, 'FeeType', 'AppraisalFee'); set(PSV, 'ProvidedServiceActualCostAmount', fee.toFixed(2)); } }   // her fee from the order (A-1 2.006)
    const insp = [...SUBJ.getElementsByTagNameNS(NS, 'INSPECTION')].find(x => (x.getAttributeNS('http://www.w3.org/1999/xlink', 'label') || '') === 'INSPECTION_Appraiser');
    if (insp) { const RL = child(SVC, 'RELATIONSHIPS'); const r = doc.createElementNS(NS, 'RELATIONSHIP'); const XLN = 'http://www.w3.org/1999/xlink'; r.setAttributeNS(XLN, 'xlink:arcrole', 'urn:fdc:mismo.org:2009:residential/INSPECTION_CompletedBy_ROLE'); r.setAttributeNS(XLN, 'xlink:from', 'INSPECTION_Appraiser'); r.setAttributeNS(XLN, 'xlink:to', 'ROLE_Appraiser'); RL.appendChild(r); } }
  // parties: client, lender, AMC
  const parties = [[rv(J, 'client'), rv(J, 'clientAddr1'), rv(J, 'clientAddr2'), 'Client'], [rv(J, 'lender'), F.lenderAddr1, F.lenderAddr2, 'Lender'], [rv(J, 'amc'), F.amcAddr1, F.amcAddr2, 'ManagementCompany']].filter(p => p[0]);
  if (parties.length) { const PS = child(SVC, 'PARTIES');
    parties.forEach(([name, a1, a2, role]) => { const P = add(PS, 'PARTY'); const le = child(P, 'LEGAL_ENTITY'); set(child(le, 'LEGAL_ENTITY_DETAIL'), 'FullName', name.slice(0, 100));
      const m = String(a2 || '').match(/^(.*?),\s*([A-Z]{2})\s+(\d{5})/); if (a1 && m) { const ad = path(P, 'ADDRESSES', 'ADDRESS'); set(ad, 'AddressLineText', a1); set(ad, 'CityName', m[1]); set(ad, 'PostalCode', m[3]); set(ad, 'StateCode', m[2]); }
      set(path(P, 'ROLES', 'ROLE', 'ROLE_DETAIL'), 'PartyRoleType', role); }); }
}

/* Report details in two places (her ask Oct 22 2026: assignment, scope, EA/HC, H&BU, subject and site, prior services "much earlier in the assignment";
   site questions and comments together): 'early' = card #setupCard right after the inspection (step 5), 'late' = value, reconciliation, transfer history
   and the market status in Review and export */
/* the report details by tentacle (her octopus, Oct 22 2026) */
const RPT_PARTS = { early: ['Assignment', 'Legal and rights', 'Site', 'Improvements', 'Contract and history', 'Highest and best use', 'Approaches, assumptions and conditions'],
  comps: ['Comparable transfer history'], late: ['Value and reconciliation'], certs: ['Prior services and certifications'] };
const RPT_EARLY = RPT_PARTS.early, RPT_LATE = RPT_PARTS.late;
const RPT_STAGE = { early: 'setup', comps: 'workbook', late: 'recon', certs: 'final' };
/* which part a "still needed" message belongs to */
const rptPartOf = m => /prior services|certification|reconsideration|revision/i.test(m) ? 'certs' : /comparable sales.*transfer|comparables' transfer/i.test(m) ? 'comps' : /opinion of market value|reconciliation comment|exposure time|client-requested|approach not developed/i.test(m) ? 'late' : 'early';
const rptLateMsg = m => rptPartOf(m) !== 'early';
function rptPart(J, html, part) {
  const a = html.indexOf('<div class="rptgrid">'); const body = html.slice(a + '<div class="rptgrid">'.length, html.lastIndexOf('</div>'));
  const secs = body.split(/(?=<section><h3>)/).filter(x => x.startsWith('<section><h3>')).map(x => [x.match(/^<section><h3>([^<]*)/)[1].trim(), x.trim()]);
  const L = (RPT_PARTS[part] || []).map(t => (secs.find(([n]) => n === t) || [])[1]).filter(Boolean);
  const need = typeof precheckGrid === 'function' ? precheckGrid(J).filter(x => x.sev === 'Must fix' && typeof preGo === 'function' && (preGo0(J, x) || {}).label === 'Report details' && rptPartOf(x.msg) === part) : [];
  const banner = `<div class="rptneed ${need.length ? 'warn' : 'done'}">${need.length ? `<b>${need.length} answer${need.length > 1 ? 's' : ''} still needed here:</b><ul>${need.map(x => `<li><a href="#" class="rptgo" data-rptgo="${esc(x.msg)}" title="Go there">${esc(x.msg.replace(/\s*\(Report details[^)]*\)\.?/, ''))}</a></li>`).join('')}</ul>` : '<b>✓ Everything needed here is answered.</b>'}
    <span class="rptkey"><span class="k own">your entry</span> <span class="k sug">suggested – type over it or leave it</span></span></div>`;
  const F = reportFrom(J);
  return (part === 'early' ? `<h2>Assignment, scope and site <small>– answer these early; they go to SFREP when you export</small></h2>${banner}${clientNeedsHTML(J)}<p class="help">${F.hasOrder ? 'Suggested entries come from the order, your inspection or the CRS report. Type over any of them.' : 'This assignment is not linked to an order, so nothing is filled from the Appraisal Assistant. Open it from the order (Comp genie button on the order page) to fill the assignment, client and market.'}</p>`
    : part === 'comps' ? `<h2>Comparable transfer history</h2>`
    : part === 'certs' ? `<h2>Prior services and certifications</h2>${banner}`
    : `<h2>Reconciliation <small>– after the sales comparison, cost and income approaches</small></h2>${banner}`) + `<div class="rptgrid rptbands">${L.join('\n')}</div>`; }
/* the value of each approach, filled in from its own section (her ask Oct 22 2026) */
function rptIndications(J) { const G = G0(J), R = R0(J), o = (app.orders || []).find(x => x.id === J.orderId) || null; const T = f => { try { return f(); } catch (e) { return null; } };
  const costOn = J.costOn ?? (R.sowCost === 'true' || (!R.sowCost && !!(o && o.apCost))); const incOn = J.incomeOn ?? (R.sowIncome === 'true' || (!R.sowIncome && !!(o && (o.apIncome || o.rent))));
  const sca = num(G.value), cost = costOn ? T(() => num(costJob(J).value) || costCalc(J).rounded) : null, inc = incOn ? T(() => { const v = num(incomeJob(J).value); if (v) return v; const X = incomeCalc(J); return X.ind ? Math.round(X.ind / 1000) * 1000 : null; }) : null;
  return [['Sales comparison', sca, true], ['Cost', cost, costOn], ['Income', inc, incOn]]; }
const rptOpinion = J => { const v = num(String(R0(J).opinion || '').replace(/[$,\s]/g, '')); return !blank(v) ? v : (num(G0(J).value) || null); };   // her typed value, else the sales comparison value
function rptIndHTML(J) { const L = rptIndications(J);
  return `<table class="mini rptind"><tr><th colspan="2">Indicated value by</th></tr>${L.map(([n, v, on]) => `<tr><th>${n} approach</th><td>${!on ? '<span class="muted">not developed</span>' : v ? '<b>' + money(Math.round(v)) + '</b>' : '<span class="warnTxt">not finished yet</span>'}</td></tr>`).join('')}</table>
    <p class="help">Filled in from each approach. The opinion of value below starts as the sales comparison value – type your reconciled value over it.</p>`; }
function rptRedraw() { const J = app.job; if (!J) return; [['#setupCard', 'early'], ['#compHistCard', 'comps'], ['#reportCard', 'late'], ['#certCard', 'certs']].forEach(([id, pt]) => { const c = $(id); if (c && c.innerHTML) c.innerHTML = reportHTML(J, pt); }); }

/* her ask Oct 22 2026: "click here, it takes me to where the legal description goes, then I can import the deed" – reads the legal description
   (and any reservation, e.g. mineral rights) from a deed PDF with text; a scan has no text (Acrobat › Scan & OCR › Recognize text first, or the order's Documents › Read with Claude) */
function deedRead(pages) { const out = {}; pages.forEach(t => { const T = String(t || '').replace(/ \| /g, ' ').replace(/[ \t]+/g, ' ');
    if (!out.legal) { const m = T.match(/(?:following described real property|real property (?:in|situated in|located in)[^:]{0,160}?described as follows|LEGAL DESCRIPTION)[^:]{0,200}?:\s*([\s\S]{40,4000}?)(?=\n\s*\(?signature|\n\s*Dated|\n\s*MAIL TAX|\n\s*IN WITNESS|\n\s*Commonly known|\n\s*APN|\n\s*A\.?P\.?N|\n\s*Assessor'?s Parcel|$)/i); if (m) out.legal = m[1].replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim(); }
    if (!out.reserve) { const x = T.match(/((?:EXCEPTING|RESERVING) THEREFROM[\s\S]{20,600}?\.(?=\s|$))/i); if (x) out.reserve = x[1].replace(/\s+/g, ' ').trim(); } });
  return out; }
document.addEventListener('change', async e => { const t = e.target; if (!t || t.dataset.act !== 'deed' || !t.files[0] || !app.job) return; const f = t.files[0]; t.value = '';
  try { toast('Reading the deed…'); const L = await pdfLines(f); const pages = []; L.forEach((ln, i) => { const p = (L.pageOf && L.pageOf[i]) || 1; pages[p - 1] = (pages[p - 1] || '') + ln + '\n'; });
    if (!pages.join('').trim()) { toast('That deed is a scan with no text. In Acrobat use Scan & OCR › Recognize text, or put it in the order’s ① Documents and use Read with Claude.', 9000); return; }
    const D = deedRead(pages); const R = R0(app.job);
    if (!D.legal) { toast('No legal description found in that PDF – look for “described as follows” and copy it into the box.', 8000); return; }
    if (R.legal && R.legal.trim() && !confirm('Replace the legal description in the box with the one from the deed?')) return;
    R.legal = D.legal; if (D.reserve && blank(R.rightsNot)) R.rightsNot = D.reserve.slice(0, 540); save(); rptRedraw();
    toast(`Legal description filled from ${f.name}${D.reserve ? ' – the deed also has a reservation; it is in “Rights not included” (answer “All rights included?” No if those rights are not appraised)' : ''}`, 8000);
    setTimeout(() => { const b = document.querySelector('textarea[data-rpt="legal"]'); if (b) { b.scrollIntoView({ block: 'center' }); b.classList.add('goflash'); } }, 150); }
  catch (er) { console.error(er); toast('Could not read that PDF: ' + (er.message || er), 7000); } });

/* ---------- tentacle 2 office fields (her ask Oct 22 2026: every required UAD field, drop-downs from A-1) ---------- */
const A1_LABEL = { LegalNonConforming: 'Legal non-conforming', NoZoning: 'No zoning', IngressOrEgress: 'Ingress or egress', BorderingPropertyEncroachingOnSubjectProperty: 'A neighbor encroaches on the subject', SubjectPropertyEncroachingOnBorderingProperty: 'The subject encroaches on a neighbor', ForSaleByOwner: 'For sale by owner', OffMarket: 'Off market', SettledSale: 'Sold (settled)', UnderConstruction: 'Under construction', OtherParcel: 'Another parcel', BodyOfWater: 'Body of water', AccessoryDwellingUnit: 'Accessory dwelling unit', DevelopmentStandards: 'Development standards', ExcessiveUnits: 'Too many units', LotSize: 'Lot size', ManufacturedHome: 'Manufactured home' };
const a1Label = v => A1_LABEL[v] || String(v).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()).replace(/ ([A-Z])(?=[a-z])/g, m => m.toLowerCase());
/* choices she never uses are hidden (Settings › My drop-down lists, kept in this browser): "PARENT/Field=Value" */
const a1Hidden = () => { try { return JSON.parse(localStorage.getItem('genie.hideOpts') || '[]'); } catch (e) { return []; } };
const A1_USED = new Set();
function a1Opts(key) { A1_USED.add(key); const H = a1Hidden(); return ((typeof A1 !== 'undefined' && A1[key] && A1[key].e) || []).filter(v => !H.includes(key + '=' + v)).map(v => [v, a1Label(v)]); }
function t2XML(J, R, SUBJ, VR, child, add, set, path, doc, NS) { const v = k => String(R[k] ?? '').trim(); const X = RE(J);
  const SITE = child(SUBJ, 'SITE');
  if (v('siteDim')) set(child(SITE, 'SITE_SIZE_LAYOUT'), 'SiteDimensionsDescription', v('siteDim').slice(0, 66));
  if (num(rv(J, 'parcels')) > 1 && v('parcelsContig')) { set(child(SITE, 'SITE_SIZE_LAYOUT'), 'ParcelsContiguousIndicator', v('parcelsContig'));
    if (v('parcelsContig') === 'false' && v('parcelSep')) { const ps = path(SUBJ, 'PARCEL_SUMMARY', 'NON_CONTIGUOUS_PARCEL_SEPARATORS', 'NON_CONTIGUOUS_PARCEL_SEPARATOR'); set(ps, 'ParcelSeparatorType', v('parcelSep')); if (v('parcelSep') === 'Other') set(ps, 'ParcelSeparatorTypeOtherDescription', v('parcelSepOther').slice(0, 33)); } }
  const zc = v('zoneComp'); if (zc) set(path(SITE, 'SITE_ZONING', 'SITE_ZONING_DETAIL'), 'SiteZoningComplianceType', zc);   // her answer here wins over the iPad's
  const zcNow = zc || rv(J, 'zoneComp') || '';
  if (/LegalNonConforming|Illegal/.test(zcNow) && v('zoneCompDesc')) set(path(SITE, 'SITE_ZONING', 'SITE_ZONING_DETAIL'), 'SiteZoningComplianceDescription', v('zoneCompDesc').slice(0, 246));
  if (zcNow === 'LegalNonConforming' && v('zoneRebuild')) set(path(SITE, 'SITE_ZONING', 'SITE_ZONING_DETAIL'), 'ZoningPermitRebuildToCurrentDensityIndicator', v('zoneRebuild'));
  if (zcNow === 'Illegal' && v('zoneIllegal')) { const zi = path(SITE, 'SITE_ZONING', 'ZONING_ILLEGAL_REASONS', 'ZONING_ILLEGAL_REASON'); set(zi, 'SiteZoningComplianceIllegalReasonType', v('zoneIllegal')); if (v('zoneIllegal') === 'Other') set(zi, 'SiteZoningComplianceIllegalReasonTypeOtherDescription', v('zoneIllegalOther').slice(0, 33)); }
  if (v('privMaint')) set(path(SITE, 'PROPERTY_ACCESS', 'PROPERTY_ACCESS_DETAIL'), 'PrivateStreetMaintenanceAgreementExistIndicator', v('privMaint'));
  const enc = (kind, fill) => { const ens = child(SUBJ, 'ENCUMBRANCES'); let en = [...ens.children].find(e => [...e.getElementsByTagNameNS(NS, 'EncumbranceType')].some(t => t.textContent === kind));
    if (!en) { en = add(ens, 'ENCUMBRANCE'); set(child(en, 'ENCUMBRANCE_DETAIL'), 'EncumbranceType', kind); } fill(en); };
  if (v('ease') === 'true' && v('easeType')) enc('Easement', en => { const e = path(en, 'EASEMENTS', 'EASEMENT'); set(e, 'EasementType', v('easeType')); if (v('easeType') === 'Other') set(e, 'EasementTypeOtherDescription', v('easeTypeOther').slice(0, 45));
    if (v('easeImpact')) set(e, 'ValueMarketabilityImpactType', v('easeImpact')); if (v('easeDesc')) set(e, 'EasementDescription', v('easeDesc').slice(0, 140)); });
  if (v('encr') === 'true' && v('encrType')) enc('Encroachment', en => { const e = path(en, 'ENCROACHMENTS', 'ENCROACHMENT'); set(e, 'EncroachmentType', v('encrType')); if (v('encrType') === 'Other') set(e, 'EncroachmentTypeOtherDescription', v('encrTypeOther').slice(0, 45));
    if (v('encrDir')) set(e, 'EncroachmentDirectionType', v('encrDir')); if (v('encrImpact')) set(e, 'ValueMarketabilityImpactType', v('encrImpact')); if (v('encrDesc')) set(e, 'EncroachmentDescription', v('encrDesc').slice(0, 140)); });
  const PD = child(SUBJ, 'PROPERTY_DETAIL');
  set(PD, 'ConstructionStatusType', v('constr') || 'Complete');
  if (rv(J, 'allRights') !== 'false') set(PD, 'MineralRightsLeasedIndicator', v('minLeased') || 'false');
  if (v('nonArmsNote')) set(path(SUBJ, 'SALES_CONTRACTS', 'SALES_CONTRACT', 'SALES_CONTRACT_DETAIL'), 'NonArmsLengthCommentText', v('nonArmsNote').slice(0, 1250));
  if ((v('listedYear') || X.listedYear) === 'true') { const LD = path(SUBJ, 'LISTING_INFORMATIONS', 'LISTING_INFORMATION', 'LISTING_INFORMATION_DETAIL'); const d = k => { const x = isoDate(v(k)); return x || null; }, amt = k => { const n = num(v(k).replace(/[$,\s]/g, '')); return blank(n) ? null : Math.round(n); };
    set(LD, 'ListingType', v('lstType') || 'MLS'); if (v('lstType') === 'Other') set(LD, 'ListingTypeOtherDescription', v('lstTypeOther').slice(0, 45)); set(LD, 'ListingStatusType', v('lstStatus') || null); set(LD, 'ListingIdentifier', v('lstId').slice(0, 45) || null);
    set(LD, 'ListingStartDate', d('lstStart')); set(LD, 'ListingEndDate', d('lstEnd')); set(LD, 'InitialListPriceAmount', amt('lstOrig')); set(LD, 'FinalListPriceAmount', amt('lstFinal')); if (v('lstDom') !== '') set(LD, 'DaysOnMarketCount', num(v('lstDom')));
    if (v('lstCdom') !== '') set(child(SUBJ, 'LISTING_INFORMATION_SUMMARY'), 'CumulativeDaysOnMarketCount', num(v('lstCdom'))); }
  if ((R.vcond || 'AsIs') !== 'AsIs' && v('asIsCond')) set(path(VR, 'VALUATION_RECONCILIATION', 'VALUATION_RECONCILIATION_SUMMARY', 'VALUATION_RECONCILIATION_SUMMARY_DETAIL'), 'PropertyAsIsConditionRatingCode', v('asIsCond'));
}

/* Settings › My drop-down lists: each list the octopus shows from A-1, with every choice ticked = shown (her ask Oct 22 2026) */
const A1_NAMES = { 'SITE_ZONING_DETAIL/SiteZoningComplianceType': 'Zoning compliance', 'ZONING_ILLEGAL_REASON/SiteZoningComplianceIllegalReasonType': 'Why zoning is illegal', 'NON_CONTIGUOUS_PARCEL_SEPARATOR/ParcelSeparatorType': 'What separates the parcels',
  'EASEMENT/EasementType': 'Kind of easement', 'EASEMENT/ValueMarketabilityImpactType': 'Easement – effect on value', 'ENCROACHMENT/EncroachmentType': 'What encroaches', 'ENCROACHMENT/EncroachmentDirectionType': 'Encroachment direction',
  'ENCROACHMENT/ValueMarketabilityImpactType': 'Encroachment – effect on value', 'PROPERTY_DETAIL/ConstructionStatusType': 'Construction stage', 'LISTING_INFORMATION_DETAIL/ListingType': 'Listing type', 'LISTING_INFORMATION_DETAIL/ListingStatusType': 'Listing status',
  'VALUATION_RECONCILIATION_SUMMARY_DETAIL/PropertyAsIsConditionRatingCode': 'Condition rating as it is today' };
function optsPopup() { const H = new Set(a1Hidden()); const keys = [...new Set([...Object.keys(A1_NAMES), ...A1_USED])].filter(k => typeof A1 !== 'undefined' && A1[k] && A1[k].e);
  const bg = document.createElement('div'); bg.className = 'cpk'; bg.id = 'optsPop';
  bg.innerHTML = `<div class="cpkbox" role="dialog"><div class="row"><b>My drop-down lists</b><span class="grow"></span><button class="btn sm primary" data-opts="save">Save</button><button class="btn sm" data-opts="close">Close</button></div>
    <p class="help">Every choice comes from Fannie Mae's A-1 list. Untick the ones that never apply to your work and they stop showing in that drop-down (an answer already chosen stays). Tick them again any time.</p>
    ${keys.map(k => `<fieldset class="optset"><legend>${esc(A1_NAMES[k] || k)}</legend>${A1[k].e.map(v => `<label class="check"><input type="checkbox" data-optk="${esc(k + '=' + v)}" ${H.has(k + '=' + v) ? '' : 'checked'}> ${esc(a1Label(v))}</label>`).join('')}</fieldset>`).join('')}</div>`;
  document.body.appendChild(bg); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-act="set-opts"],[data-opts]'); if (!b) return;
  if (b.dataset.act === 'set-opts') { optsPopup(); return; }
  const m = document.getElementById('optsPop'); if (b.dataset.opts === 'save' && m) { const hide = [...m.querySelectorAll('[data-optk]')].filter(x => !x.checked).map(x => x.dataset.optk); try { localStorage.setItem('genie.hideOpts', JSON.stringify(hide)); } catch (er) {} toast(hide.length + ' choice' + (hide.length === 1 ? '' : 's') + ' hidden'); rptRedraw(); }
  if (m) m.remove(); });

/* revision history (A-1 27.000–27.002, her octopus tentacle 8, Oct 22 2026): one row per change after the report was first sent */
const REVISION_CATS = () => a1Opts('VALUATION_REVISION/RevisionCategoryType');
function revHTML(R) { const L = R.revs || [];
  return `<div class="revs"><b>Revision history</b> <small class="muted">– goes into the report (UAD section 27) only when you change a report already delivered; one row per change, 1,250 characters each. Not the same as “Your revision log” in the pre-check, which keeps a reviewer's requests as reminders.</small>
    ${L.map((r, i) => `<div class="revrow"><input class="txt" data-rev="${i}|date" value="${esc(r.date || '')}" placeholder="YYYY-MM-DD" style="width:9em"><select data-rev="${i}|cat"><option value="">Section…</option>${REVISION_CATS().map(([v, l]) => `<option value="${v}"${r.cat === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select><textarea class="txt" rows="2" maxlength="1250" data-rev="${i}|text" placeholder="What changed and why">${esc(r.text || '')}</textarea><button type="button" class="btn sm" data-revdel="${i}">Remove</button></div>`).join('')}
    <button type="button" class="btn sm" data-act="rev-add">+ Add a revision</button></div>`; }
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || !t.dataset.rev || !app.job) return; const [i, k] = t.dataset.rev.split('|'); const R = R0(app.job); R.revs = R.revs || []; if (!R.revs[+i]) return; R.revs[+i][k] = k === 'date' ? (isoDate(t.value) || t.value.trim()) : t.value; save(); });
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-act="rev-add"],[data-revdel]'); if (!a || !app.job) return; const R = R0(app.job); R.revs = R.revs || [];
  if (a.dataset.act === 'rev-add') R.revs.push({ date: todayISO(), cat: '', text: '' }); else R.revs.splice(+a.dataset.revdel, 1); save(); rptRedraw(); });
/* tentacles 7 and 8 in the SFREP file */
function t78XML(J, R, VR, SVC, child, add, set, path) { const v = k => String(R[k] ?? '').trim(); const amt = k => { const n = num(v(k).replace(/[$,\s]/g, '')); return blank(n) ? null : Math.round(n); };
  if (R.addlCond === 'true') { const A = path(VR, 'VALUATION_RECONCILIATION', 'ADDITIONAL_REQUESTED_CONDITIONAL_VALUATIONS', 'ADDITIONAL_REQUESTED_CONDITIONAL_VALUATION');
    set(A, 'AdditionalOpinionOfValueAmount', amt('altValue')); set(A, 'PropertyValuationConditionalConclusionType', v('altCond') || 'AsIs'); set(A, 'MarketingOrExposureTimeType', v('altTime') || 'ClientImposedRestrictedMarketingTime');
    if (v('altLow') && v('altHigh')) { set(A, 'MarketingOrExposureLowRangeDaysCount', num(v('altLow'))); set(A, 'MarketingOrExposureHighRangeDaysCount', num(v('altHigh'))); } else if (v('altLow') || v('altHigh')) set(A, 'MarketingOrExposureDaysCount', num(v('altLow') || v('altHigh'))); }
  if (R.reconsider === 'true') { const O = path(VR, 'RECONSIDERATIONS_OF_VALUE', 'RECONSIDERATION_OF_VALUE'); set(O, 'ReconsiderationOfValueRequestedByType', v('rovBy') || 'BorrowerInitiated'); set(O, 'ReconsiderationOfValueResultType', v('rovResult') || null); set(O, 'ReconsiderationOfValueResultDate', isoDate(v('rovDate')) || null); set(O, 'ReconsiderationOfValueCommentDescription', v('rovNote').slice(0, 2500) || null); }
  (R.revs || []).filter(r => r.cat && r.text).forEach(r => { const V = add(child(VR, 'VALUATION_REVISIONS'), 'VALUATION_REVISION'); set(V, 'RevisionCategoryType', r.cat); set(V, 'RevisionDate', isoDate(r.date) || todayISO()); set(V, 'RevisionText', String(r.text).slice(0, 1250)); });
  const F = reportFrom(J);
  if ((R.sowAddlUser === 'true' || (blank(R.sowAddlUser) && F.sowAddlUser)) && String(F.otherUsers || R.addlUsers || '').trim()) set(path(VR, 'SCOPE_OF_WORK', 'VALUATION_REPORT_ADDITIONAL_INTENDED_USERS', 'VALUATION_REPORT_ADDITIONAL_INTENDED_USER'), 'ValuationAdditionalIntendedUserDescription', String(R.addlUsers || F.otherUsers).trim().slice(0, 180));
}
