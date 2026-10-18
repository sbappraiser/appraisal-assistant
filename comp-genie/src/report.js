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
const HBU_TESTS = [['legal', 'Legally permissible'], ['phys', 'Physically possible'], ['fin', 'Financially feasible'], ['max', 'Maximally productive']];
const ORDER_ASSIGN = { uadPurchase: 'Purchase', uadRefi: 'Refinance', uadHeloc: 'HomeEquity', uadConstruction: 'Construction', construction: 'Construction' };

const R0 = J => { J.report = J.report || { hbu: {} }; J.report.hbu = J.report.hbu || {}; return J.report; };
const orderOf = J => (app.orders || []).find(o => o.id === J.orderId) || null;
function zoneTable() { if (!app.zoneDesc) { app.zoneDesc = {}; DB.get('kv', 'zoneDesc').then(r => { app.zoneDesc = (r && r.v) || {}; const c = $('#reportCard'); if (c && app.job) c.innerHTML = reportHTML(app.job); }); } return app.zoneDesc; }

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
    insp: I.inspType || 'InteriorAndExterior', market: (o.market && o.market.uad) || null, contract: o.uad || null, hasOrder: !!o.id };
}
const rv = (J, k) => { const R = R0(J), F = reportFrom(J); return blank(R[k]) ? F[k] : R[k]; };

function reportHTML(J) {
  const R = R0(J), F = reportFrom(J), G = G0(J), H = R.hbu;
  const inp = (k, ph, w) => `<input class="txt" data-rpt="${k}" value="${esc(R[k] ?? '')}" placeholder="${esc(F[k] || ph || '')}"${w ? ` style="width:${w}"` : ''}>`;
  const sel = (k, list, def, note = 'from the order') => `<select data-rpt="${k}"><option value="">${def ? esc((list.find(x => x[0] === def) || [, ''])[1]) + ' (' + note + ')' : '—'}</option>${list.map(([v, l]) => `<option value="${v}"${R[k] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const yn = (k, def) => `<select data-rpt="${k}"><option value="">${def === true ? 'Yes' : def === false ? 'No' : '—'}${def !== undefined ? ' (usual)' : ''}</option><option value="true"${R[k] === 'true' ? ' selected' : ''}>Yes</option><option value="false"${R[k] === 'false' ? ' selected' : ''}>No</option></select>`;
  const M = F.market;
  return `<h2>Report details <small>for the full report</small></h2>
  <p class="help">${F.hasOrder ? 'Grey entries come from the order in the Appraisal Assistant, your inspection or the CRS report. Type over any of them.' : 'This assignment is not linked to an order, so nothing is filled from the Appraisal Assistant. Open it from the order (Comp genie button on the order page) to fill the assignment, client and market.'}</p>
  <div class="rptgrid">
    <section><h3>Assignment</h3>
      <label class="fld"><span>Assignment reason</span>${sel('assign', ASSIGN, F.assign)}</label>
      ${rv(J, 'assign') === 'Other' ? `<label class="fld"><span>Other reason</span>${inp('assignOther', 'e.g. Estate settlement')}</label>` : ''}
      <label class="fld"><span>Property valuation method</span>${sel('vmethod', VMETHOD, 'TraditionalAppraisal', 'usual')}</label>
      <label class="fld"><span>Property data report used instead of an inspection?</span>${yn('pdr', false)}</label>
      <label class="fld"><span>Your file number</span>${inp('fileNo')}</label>
      <label class="fld"><span>Effective date</span>${inp('eff', 'YYYY-MM-DD')}</label>
      <label class="fld"><span>Client</span>${inp('client', 'Client name')}</label>
      <label class="fld"><span>Client address</span>${inp('clientAddr1', 'Street')} ${inp('clientAddr2', 'City, ST ZIP')}</label>
      <label class="fld"><span>Lender (if not the client)</span>${inp('lender')}</label>
      <label class="fld"><span>AMC</span>${inp('amc')}</label></section>
    <section><h3>Subject and site</h3>
      <label class="fld"><span>Legal description</span><textarea class="txt" rows="2" data-rpt="legal" placeholder="${esc(F.legal || 'From the CRS report or the preliminary title report')}">${esc(R.legal || '')}</textarea></label>
      <label class="fld"><span>Number of parcels</span>${inp('parcels', '1', '5em')}</label>
      <label class="fld"><span>All rights included in the appraisal?</span>${yn('allRights', true)}</label>
      <label class="fld"><span>Rights not included <small class="muted">(only sent when the answer above is No; 540 characters)</small></span><textarea class="txt" rows="2" maxlength="540" data-rpt="rightsNot" placeholder="${esc(F.rightsNot || 'e.g. Oil, gas and mineral rights below 500 feet, reserved in a prior deed')}">${esc(R.rightsNot || '')}</textarea>${F.rightsNot && R.allRights !== 'false' ? '<small class="muted">The order has a reservation from the deed. If those rights are not part of what you appraised, answer No above.</small>' : ''}</label>
      <label class="fld"><span>Zoning code</span>${inp('zone', 'e.g. E-3', '8em')}</label>
      <label class="fld"><span>Zoning description</span>${inp('zoneDesc', 'e.g. One-family residential, 7,000 sq. ft. minimum lot')}<small class="muted">Kept for this code, so you type it once.</small></label></section>
    <section><h3>Highest and best use</h3>
      ${HBU_TESTS.map(([k, l]) => `<label class="check"><input type="checkbox" data-hbu="${k}" ${H[k] ? 'checked' : ''}>${l}</label>`).join('')}
      <label class="fld"><span>Is the highest and best use as improved the present use?</span>${yn('hbuPresent')}</label>
      <div class="row"><button class="btn small" data-act="hbu-all">All four tests met · present use</button><button class="btn ghost small" data-act="hbu-draft">Draft the comment</button></div>
      <label class="fld"><span>Highest and best use comment ${cmtBtn('textarea[data-rpt="hbuNote"]')}</span><textarea class="txt" rows="4" data-rpt="hbuNote" placeholder="Your comment">${esc(R.hbuNote || '')}</textarea></label></section>
    <section><h3>Value and reconciliation</h3>
      <label class="fld"><span>Opinion of market value</span>${inp('opinion', !blank(G.value) ? money(G.value) + ' (sales comparison)' : '$')}</label>
      <label class="fld"><span>Market value condition</span>${sel('vcond', VCOND, 'AsIs', 'usual')}</label>
      <label class="fld"><span>Reasonable exposure time (days)</span>${inp('expLow', 'from', '6em')} to ${inp('expHigh', 'to', '6em')}</label>
      <label class="fld"><span>Reconciliation comment ${cmtBtn('textarea[data-rpt="reconNote"]')}</span><textarea class="txt" rows="3" data-rpt="reconNote">${esc(R.reconNote || '')}</textarea></label></section>
    <section><h3>Market <small>from the hub's Market tab</small></h3>
      ${M ? `<table class="mini"><tr><th>Look back</th><td>${esc(M.L)} months</td></tr><tr><th>Actives</th><td>${esc(M.activeN)}${M.activeN ? ` · ${money(M.activeLow)} / ${money(M.activeMed)} / ${money(M.activeHigh)} · median DOM ${esc(Math.round(M.activeDom))}` : ''}</td></tr>
        <tr><th>Pendings</th><td>${esc(M.pendingN)}</td></tr><tr><th>Sales</th><td>${esc(M.salesN)}${M.salesN ? ` · ${money(M.saleLow)} / ${money(M.saleMed)} / ${money(M.saleHigh)}` : ''}</td></tr>
        <tr><th>Demand / supply</th><td>${esc({ Shortage: 'Shortage', InBalance: 'In balance', OverSupply: 'Oversupply' }[M.supply] || '—')}</td></tr><tr><th>Marketing time</th><td>${esc({ UnderThreeMonths: 'Under 3 months', ThreeToSixMonths: '3 to 6 months', OverSixMonths: 'Over 6 months' }[M.mktime] || '—')}</td></tr><tr><th>Distressed competition</th><td>${M.distress === 'true' ? 'Yes' : M.distress === 'false' ? 'No' : '—'}</td></tr>
        <tr><th>Boundary</th><td>${M.boundary ? '✓' : '<b class="warnTxt">missing</b>'}</td></tr><tr><th>Search criteria</th><td>${M.criteria ? '✓' : '<b class="warnTxt">missing</b>'}</td></tr><tr><th>Price trend comment</th><td>${M.comment ? '✓ ' + M.comment.length.toLocaleString() + ' characters' : '<b class="warnTxt">missing</b>'}</td></tr></table>
        <p class="help">These go into the Market section. To change them, open the order's Market tab in the Appraisal Assistant, then come back here.</p>`
      : `<p class="help">${F.hasOrder ? 'Nothing yet. In the Appraisal Assistant open this order › <b>Market</b> tab: drop your SBMLS market-area search CSV (the micro market: actives, pendings and sales in the look-back period) and, once a month, the SBMLS monthly statistics PDF (the macro market). Check the boundary, criteria and price-trend comment, then come back here.' : 'Link this assignment to an order to bring in the Market section.'}</p>`}
      ${F.contract && (F.contract.price || F.contract.cdate) ? `<p class="help">Sales contract (from the document reader): ${esc(money(num(String(F.contract.price).replace(/[$,]/g, ''))))}${F.contract.cdate ? ' · ' + esc(F.contract.cdate) : ''} – goes into the contract section.</p>` : ''}</section>
  </div>`;
}

function hbuDraft(J) {
  const R = R0(J), z = rv(J, 'zone'), zd = rv(J, 'zoneDesc');
  return `The subject's present use as a single-family residence is legally permissible under its ${z ? z + ' ' : ''}zoning${zd ? ' (' + zd + ')' : ''}, physically possible given the site's size, shape, topography and access, financially feasible, and maximally productive, as supported by the market data in this report. The highest and best use of the subject as improved is its present use.`;
}

document.addEventListener('change', e => {
  const t = e.target; if (!app.job) return; const R = R0(app.job);
  if (t.dataset.rpt) { const k = t.dataset.rpt, v = t.value.trim(); if (v === '') delete R[k]; else R[k] = k === 'zone' ? v.toUpperCase() : t.tagName === 'TEXTAREA' ? t.value : v;
    if (k === 'zoneDesc' && v) { const code = rv(app.job, 'zone').toUpperCase(); if (code) { zoneTable()[code] = v; DB.put('kv', { id: 'zoneDesc', v: app.zoneDesc }); } }
    save(); if (['assign', 'zone'].includes(k)) { const c = $('#reportCard'); if (c) c.innerHTML = reportHTML(app.job); } return; }
  if (t.dataset.hbu) { R.hbu[t.dataset.hbu] = t.checked; save(); }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="hbu-all"],[data-act="hbu-draft"]'); if (!b || !app.job) return; const R = R0(app.job);
  if (b.dataset.act === 'hbu-all') { HBU_TESTS.forEach(([k]) => R.hbu[k] = true); R.hbuPresent = 'true'; }
  if (b.dataset.act === 'hbu-draft') { if (R.hbuNote && !confirm('Replace your comment with a new draft?')) return; R.hbuNote = hbuDraft(app.job); }
  save(); const c = $('#reportCard'); if (c) c.innerHTML = reportHTML(app.job);
});

/* ---------------- into the full report (DOM of the merged file) ---------------- */
function writeReportXML(doc, NS, J, SUBJ, VA, SVC) {
  const R = R0(J), F = reportFrom(J), H = R.hbu, G = G0(J);
  const pos = (parent, tag) => { const seq = D1_ORDER[parent.localName] || []; const r = seq.indexOf(tag); const kids = [...parent.children];
    if (r >= 0) return kids.find(k => { const i = seq.indexOf(k.localName); return i > r; }) || null;
    return kids.find(k => seq.indexOf(k.localName) < 0 && k.localName > tag) || null; };
  const child = (parent, tag) => { for (const k of parent.children) if (k.localName === tag) return k; const e = doc.createElementNS(NS, tag); parent.insertBefore(e, pos(parent, tag)); return e; };
  const add = (parent, tag) => { const e = doc.createElementNS(NS, tag); const kids = [...parent.children].filter(k => k.localName === tag); const last = kids[kids.length - 1]; parent.insertBefore(e, last ? last.nextSibling : pos(parent, tag)); return e; };
  const set = (parent, tag, v) => { if (blank(v) || v === '') return; const e = child(parent, tag); e.textContent = String(v); return e; };
  const path = (el, ...tags) => tags.reduce((p, t) => child(p, t), el);
  const tf = (k, def) => { const v = R[k]; return v === 'true' ? 'true' : v === 'false' ? 'false' : def; };
  const VR = child(VA, 'VALUATION_REPORT');
  const comment = (cat, text, max) => { if (!text) return; const VC = child(VR, 'VALUATION_COMMENTARIES');
    for (const c of VC.children) { const ct = [...c.children].find(k => k.localName === 'ValuationAnalysisCategoryType'); if (ct && ct.textContent === cat) { const tx = [...c.children].find(k => k.localName === 'ValuationCommentText'); if (tx) tx.textContent = text.slice(0, max); return; } }
    const c = add(VC, 'VALUATION_COMMENTARY'); set(c, 'ValuationAnalysisCategoryType', cat); set(c, 'ValuationCommentText', text.slice(0, max)); };

  // assignment
  const sow = path(VR, 'SCOPE_OF_WORK', 'SCOPE_OF_WORK_DETAIL');
  set(sow, 'SalesComparisonApproachIndicator', 'true');
  const asg = rv(J, 'assign'); set(sow, 'ValuationAssignmentType', asg); if (asg === 'Other') set(sow, 'ValuationAssignmentTypeOtherDescription', (R.assignOther || '').slice(0, 33) || null);
  const rd = path(VR, 'VALUATION_REPORT_DETAIL');
  set(rd, 'AppraiserFileIdentifier', rv(J, 'fileNo')); set(rd, 'PropertyDataReportIndicator', tf('pdr', 'false'));
  set(rd, 'SketchExistsIndicator', 'true'); set(rd, 'ValuationReportInspectionCertificationType', F.insp);
  set(path(SUBJ, 'PROPERTY_VALUATIONS', 'PROPERTY_VALUATION', 'PROPERTY_VALUATION_DETAIL'), 'PropertyValuationMethodType', R.vmethod || 'TraditionalAppraisal');
  // reconciliation
  const rs = path(VR, 'VALUATION_RECONCILIATION', 'VALUATION_RECONCILIATION_SUMMARY');
  set(path(rs, 'VALUATION_CONDITIONS', 'VALUATION_CONDITION'), 'PropertyValuationConditionalConclusionType', R.vcond || 'AsIs');
  const rsd = child(rs, 'VALUATION_RECONCILIATION_SUMMARY_DETAIL');
  const eff = isoDate(rv(J, 'eff')) || rv(J, 'eff'); set(rsd, 'AppraisalReportEffectiveDate', eff);
  if (!blank(R.expLow) || !blank(R.expHigh)) { set(rsd, 'MarketingOrExposureHighRangeDaysCount', num(R.expHigh)); set(rsd, 'MarketingOrExposureLowRangeDaysCount', num(R.expLow)); set(rsd, 'MarketingOrExposureTimeType', 'ReasonableExposureTime'); }
  const op = num(String(R.opinion || '').replace(/[$,\s]/g, '')); set(rsd, 'OpinionOfValueAmount', op === null ? null : Math.round(op));
  if (R.reconNote) set(path(VR, 'VALUATION_RECONCILIATION', 'VALUATION_RECONCILIATION_DETAIL'), 'ValuationReconciliationSummaryCommentDescription', R.reconNote.slice(0, 5000));
  // subject: legal, parcels, zoning, rights, H&BU
  const legal = rv(J, 'legal'); if (legal) set(path(SUBJ, 'PARCEL_SUMMARY', 'PARCEL_SUMMARY_DETAIL'), 'ParcelsLegalDescription', legal.slice(0, 15000));
  const SITE = child(SUBJ, 'SITE');
  set(child(SITE, 'SITE_SIZE_LAYOUT'), 'ParcelCount', num(rv(J, 'parcels')) || 1);
  const zone = rv(J, 'zone'), zd = rv(J, 'zoneDesc');
  if (zone || zd) { const z = path(SITE, 'SITE_ZONING', 'SITE_ZONING_DETAIL'); set(z, 'SiteZoningClassificationDescription', zd && zd.slice(0, 100)); set(z, 'SiteZoningClassificationIdentifier', zone); }
  set(path(SUBJ, 'SALES_CONTRACTS', 'SALES_CONTRACT', 'SALES_CONTRACT_DETAIL'), 'AllPropertyRightsAppraisedIndicator', tf('allRights', 'true'));
  if (tf('allRights', 'true') === 'false') { const rn = rv(J, 'rightsNot'); if (rn) set(sow, 'PropertyRightsNotAppraisedDescription', String(rn).slice(0, 540)); }
  if (HBU_TESTS.some(([k]) => H[k]) || R.hbuPresent) { const hb = child(SITE, 'HIGHEST_AND_BEST_USE');
    set(hb, 'FinanciallyFeasibleIndicator', String(!!H.fin)); set(hb, 'LegallyPermissibleIndicator', String(!!H.legal)); set(hb, 'MaximallyProductiveIndicator', String(!!H.max)); set(hb, 'PhysicallyPossibleIndicator', String(!!H.phys)); set(hb, 'SiteHighestBestUseIndicator', R.hbuPresent || null); }
  comment('HighestAndBestUse', R.hbuNote, 4000);
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
  // parties: client, lender, AMC (the appraiser stays as your SFREP template has her)
  const parties = [[rv(J, 'client'), rv(J, 'clientAddr1'), rv(J, 'clientAddr2'), 'Client'], [rv(J, 'lender'), F.lenderAddr1, F.lenderAddr2, 'Lender'], [rv(J, 'amc'), F.amcAddr1, F.amcAddr2, 'ManagementCompany']].filter(p => p[0]);
  if (parties.length) { const PS = child(SVC, 'PARTIES');
    parties.forEach(([name, a1, a2, role]) => { const P = add(PS, 'PARTY'); const le = child(P, 'LEGAL_ENTITY'); set(child(le, 'LEGAL_ENTITY_DETAIL'), 'FullName', name.slice(0, 100));
      const m = String(a2 || '').match(/^(.*?),\s*([A-Z]{2})\s+(\d{5})/); if (a1 && m) { const ad = path(P, 'ADDRESSES', 'ADDRESS'); set(ad, 'AddressLineText', a1); set(ad, 'CityName', m[1]); set(ad, 'PostalCode', m[3]); set(ad, 'StateCode', m[2]); }
      set(path(P, 'ROLES', 'ROLE', 'ROLE_DETAIL'), 'PartyRoleType', role); }); }
}
