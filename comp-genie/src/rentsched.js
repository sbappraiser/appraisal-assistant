/* =====================================================================
   Tentacle 6 – the UAD 3.6 rent schedule and income approach records (Oct 21 2026; A-1 sections 23 and 24, D-1 2- to 4-unit sample).
   Rent schedule (1007), when the assignment includes one: the subject unit's rent (rented or not, lease, concessions, utilities, furnished,
   rent control, market rent), additional rental income, totals, each comparable rental's 3.6 record and the rental commentary.
   Income approach: each gross rent multiplier comparable's record. Every answer is hers; the page only adds up and copies.
   ===================================================================== */
const rentOn = J => { const R = R0(J), F = reportFrom(J); return R.sowRent === 'true' || (blank(R.sowRent) && F.sowRent === true); };
const incOn = J => { const R = R0(J), F = reportFrom(J); return J.incomeOn ?? (R.sowIncome === 'true' || (blank(R.sowIncome) && F.sowIncome === true)); };
function rsJob(J) { const K = incomeJob(J); K.sched = K.sched || {}; K.addl = K.addl || []; return K; }
const RS_YN = [['', '–'], ['true', 'Yes'], ['false', 'No']];
const RS_CMP = [['', '–'], ['Superior', 'Superior'], ['Similar', 'Similar'], ['Inferior', 'Inferior']];
const RS_WT = [['', '–'], ['Most', 'Most weight'], ['Less', 'Less weight'], ['NoWeight', 'No weight']];
const rsSel = (attr, v, opts) => `<select ${attr}>${opts.map(([o, l]) => `<option value="${o}" ${String(v ?? '') === o ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const rsYM = t => { const s = String(t || '').trim(); let m; if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return `${m[2]}-${m[1].padStart(2, '0')}`; if ((m = s.match(/^(\d{4})-(\d{2})/))) return `${m[1]}-${m[2]}`; return null; };   // MM/YYYY → YYYY-MM (A-1 LeaseStartDate)
function rsTotals(J) { const K = rsJob(J), S = K.sched, X = incomeCalc(J); const actual = S.rented === 'true' ? num(S.actual) || 0 : 0; const market = num(K.rent) || X.rent || 0;
  const A = K.addl.filter(a => a.type && a.type !== 'None'); const aa = A.reduce((t, a) => t + (num(a.actual) || 0), 0), ae = A.reduce((t, a) => t + (num(a.est) || 0), 0);
  return { actual, market, aa, ae, totActual: actual + aa, totEst: market + ae }; }

/* ---- the page (drawn inside the income card) ---- */
function rsSubjHTML(J) { if (!rentOn(J)) return ''; const K = rsJob(J), S = K.sched, T = rsTotals(J); const f = (k, ph, w) => `<input class="txt sm" data-rs="${k}" value="${esc(S[k] ?? '')}" placeholder="${ph || ''}" style="width:${w || 7}em">`;
  const rented = S.rented === 'true';
  return `<h3>Rent schedule – the subject <small>UAD 3.6 Rental Information (F-1 23.01) · the assignment includes a rent schedule</small></h3>
    <div class="row wrap">
      <label>Currently rented ${rsSel('data-rs="rented"', S.rented, RS_YN)}</label>
      ${rented ? `<label>Monthly rent $ ${f('actual', 'actual rent', 6)}</label><label>Month-to-month ${rsSel('data-rs="mtm"', S.mtm, RS_YN)}</label>${S.mtm === 'false' ? `<label>Lease start ${f('lease', 'MM/YYYY', 6)}</label>` : ''}
        <label>Rent concessions ${rsSel('data-rs="conc"', S.conc, RS_YN)}</label><label>Utilities / services included ${rsSel('data-rs="util"', S.util, RS_YN)}</label><label>Furnished ${rsSel('data-rs="furn"', S.furn, RS_YN)}</label>` : ''}
      <label>Rent control ${rsSel('data-rs="ctl"', S.ctl, [['', '–'], ['No', 'No'], ['Yes', 'Yes']])}</label>
    </div>
    ${S.ctl === 'Yes' ? `<label class="fld"><span>Rent control and its effect on value and marketability <small>(3.6, 2,500 characters)</small></span><textarea class="txt" rows="2" data-rs="ctlNote" maxlength="2500">${esc(S.ctlNote || '')}</textarea></label>` : ''}
    <div class="row wrap"><b>Additional rental income</b> ${K.addl.map((a, i) => `<span class="chip">${rsSel(`data-ra="${i}|type"`, a.type, [['', '–'], ['Parking', 'Parking'], ['Storage', 'Storage'], ['Other', 'Other']])}${a.type === 'Other' ? `<input class="txt xs" data-ra="${i}|other" maxlength="45" placeholder="describe" value="${esc(a.other || '')}">` : ''} actual $<input class="txt xs num" data-ra="${i}|actual" value="${esc(a.actual ?? '')}" style="width:5em"> estimated $<input class="txt xs num" data-ra="${i}|est" value="${esc(a.est ?? '')}" style="width:5em"> <button class="btn xs" data-radel="${i}">✕</button></span>`).join(' ') || '<span class="help">none</span>'} <button class="btn xs" data-raadd="1">+ Add</button></div>
    <p class="help">Totals sent: actual rent ${money(T.actual)} + additional ${money(T.aa)} = ${money(T.totActual)} · market rent ${money(T.market)} (the market rent below) + additional ${money(T.ae)} = ${money(T.totEst)} per month.</p>`; }
function rsRentalMore(J, r) { const m = (k, opts) => rsSel(`data-rt2="${r.id}|${k}"`, r[k], opts); const t = (k, ph, w) => `<input class="txt xs" data-rt2="${r.id}|${k}" value="${esc(r[k] ?? '')}" placeholder="${ph}" style="width:${w}em">`;
  return `<tr class="rsmore"><td></td><td colspan="10"><small>3.6:</small> furnished ${m('furn', RS_YN)} utilities incl. ${m('util', RS_YN)} concessions ${m('conc', RS_YN)} rent control ${m('ctl', [['', '–'], ['No', 'No'], ['Yes', 'Yes']])}
    · vs subject: vehicle storage ${m('cCar', RS_CMP)} view ${m('cView', RS_CMP)} site ${m('cSite', RS_CMP)} overall ${m('cAll', RS_CMP)} · weight ${m('wt', RS_WT)}
    · condition ${m('cond', [['', '–'], ...['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(c => [c, c])])} lot sq ft ${t('lot', 'sq ft', 5)} market area ${t('nbhd', 'name', 8)} ZIP ${t('zip', 'ZIP', 4)}</td></tr>`; }
function rsGrmMore(J, g) { const m = (k, opts) => rsSel(`data-gm2="${g.id}|${k}"`, g[k], opts); const t = (k, ph, w) => `<input class="txt xs" data-gm2="${g.id}|${k}" value="${esc(g[k] ?? '')}" placeholder="${ph}" style="width:${w}em">`;
  return `<tr class="rsmore"><td></td><td colspan="5"><small>3.6:</small> city ${t('city', 'city', 7)} ZIP ${t('zip', 'ZIP', 4)} sale date ${t('date', 'MM/DD/YYYY', 6)} units ${t('units', '1', 2)} ADUs ${t('adus', '0', 2)} sq ft (all units) ${t('gba', 'sq ft', 4)}
    · rent is ${m('est', [['', '–'], ['false', 'actual'], ['true', 'estimated']])} rent control ${m('ctl', [['', '–'], ['No', 'No'], ['Yes', 'Yes']])} weight ${m('wt', RS_WT)}${g.lat && g.lon ? ` <span class="help">📍 located</span>` : ''}</td></tr>`; }
function rsNoteHTML(J) { if (!rentOn(J)) return ''; const K = rsJob(J); const t = K.rentNote != null ? K.rentNote : rsNoteDraft(J);
  return `<label class="fld"><span>Rental analysis comment <small>(3.6 Rental Information commentary, F-1 23.04 · ${t.length.toLocaleString()} / 5,000)</small></span><textarea class="txt" rows="4" data-rsnote="1" maxlength="5000">${esc(t)}</textarea></label>
    <div class="row"><button class="btn sm ghost" data-rsredraft="1">Write it again from the figures</button></div>`; }
function rsNoteDraft(J) { const X = incomeCalc(J), K = rsJob(J), S = K.sched; let t = '';
  if (X.R.length) t += `${X.R.length} comparable rental${X.R.length > 1 ? 's were' : ' was'} considered${X.R.some(r => /^MLS/.test(r.src || '')) ? ' from the MLS' : ''}, with adjusted monthly rents of ${money(Math.min(...X.rents))} to ${money(Math.max(...X.rents))}. `;
  if (X.rent) t += `The subject's market rent is estimated at ${money(X.rent)} per month. `;
  t += S.rented === 'true' ? `The subject is currently rented at ${money(num(S.actual))} per month${S.mtm === 'true' ? ' on a month-to-month basis' : ''}. ` : S.rented === 'false' ? 'The subject is not currently rented. ' : '';
  return t.trim(); }
document.addEventListener('change', e => { const t = e.target; if (!app.job || !(t.dataset.rs || t.dataset.ra || t.dataset.rt2 || t.dataset.gm2 || t.dataset.rsnote)) return; const J = app.job, K = rsJob(J); e.stopPropagation();
  if (t.dataset.rs) K.sched[t.dataset.rs] = t.value.trim() === '' ? null : t.value.trim();
  else if (t.dataset.ra) { const [i, k] = t.dataset.ra.split('|'); const a = K.addl[+i]; if (a) a[k] = t.value.trim() === '' ? null : ['actual', 'est'].includes(k) ? num(t.value.replace(/[$,]/g, '')) : t.value.trim(); }
  else if (t.dataset.rt2) { const [id, k] = t.dataset.rt2.split('|'); const r = J.rentals.find(x => x.id === id); if (r) r[k] = t.value.trim() === '' ? null : k === 'lot' ? num(t.value.replace(/[,]/g, '')) : t.value.trim(); }
  else if (t.dataset.gm2) { const [id, k] = t.dataset.gm2.split('|'); const g = K.grm.find(x => x.id === id); if (g) { g[k] = t.value.trim() === '' ? null : ['units', 'adus', 'gba'].includes(k) ? num(t.value.replace(/[,]/g, '')) : t.value.trim(); if (['city', 'zip'].includes(k)) { g.lat = null; g.lon = null; } } }
  else if (t.dataset.rsnote) { K.rentNote = t.value; save(); return; }
  save(); incomeRedraw(); }, true);
document.addEventListener('click', async e => { const t = e.target.closest('[data-raadd],[data-radel],[data-rsredraft],[data-grmgeo]'); if (!t || !app.job) return; const J = app.job, K = rsJob(J);
  if (t.dataset.raadd) K.addl.push({ type: 'Parking' }); else if (t.dataset.radel) K.addl.splice(+t.dataset.radel, 1); else if (t.dataset.rsredraft) K.rentNote = null;
  else if (t.dataset.grmgeo) { toast('Finding the rented sales on the map…'); const miss = await geocodeGrm(J); toast(miss.length ? 'Not found: ' + miss.join(', ') : 'Located – proximity goes into the report', 5000); }
  save(); incomeRedraw(); });
async function geocodeGrm(J) { const K = incomeJob(J); const miss = [];
  for (const g of K.grm.filter(g => g.use !== false && g.addr && !(g.lat && g.lon))) { try { const q = [g.addr, g.city || J.subject.city || 'Santa Barbara', 'CA', g.zip || ''].filter(Boolean).join(', ');
      const a = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(q))).json(); if (a && a[0]) { g.lat = +a[0].lat; g.lon = +a[0].lon; } else miss.push(g.addr); } catch (er) { miss.push(g.addr); }
    await new Promise(z => setTimeout(z, 1100)); }
  save(); return miss; }

/* ---- into the full report ---- */
function rsXML(J, doc, NS, SUBJ, VA, SVC) { const RON = rentOn(J), ION = incOn(J); if (!RON && !ION) return; const K = rsJob(J), S = K.sched, X = incomeCalc(J), T = rsTotals(J);
  const XL = 'http://www.w3.org/1999/xlink'; const kids = (el, tag) => [...el.children].filter(k => k.localName === tag);
  const el = (p, tag, attrs) => { const e = doc.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => k.startsWith('xlink:') ? e.setAttributeNS(XL, k, v) : e.setAttribute(k, v)); p.appendChild(e); return e; };
  const leaf = (p, tag, v, attrs) => { if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return null; const e = el(p, tag, attrs); e.textContent = String(v); return e; };
  const one = (p, tag) => kids(p, tag)[0] || el(p, tag);
  const PROPS = kids(VA, 'PROPERTIES')[0]; const RL = kids(SVC, 'RELATIONSHIPS')[0] || el(SVC, 'RELATIONSHIPS'); const rel = (arc, from, to) => el(RL, 'RELATIONSHIP', { 'xlink:arcrole': 'urn:fdc:mismo.org:2009:residential/' + arc, 'xlink:from': from, 'xlink:to': to });
  const subjLL = { lat: num(J.subject.lat), lon: num(J.subject.lon) }; const prox = (lat, lon) => { if (!num(lat) || !num(lon)) return null; const mi = milesBetween(subjLL, { lat: num(lat), lon: num(lon) }); return mi === null ? null : { mi, dir: directionOf(subjLL, { lat: num(lat), lon: num(lon) }) }; };
  const addr = (P, a, city, zip) => { const A = el(P, 'ADDRESS'); leaf(A, 'AddressLineText', String(a || '').slice(0, 100)); leaf(A, 'CityName', city || J.subject.city || null); leaf(A, 'PostalCode', zip || null); leaf(A, 'StateCode', 'CA'); };
  const IMS = kids(SUBJ, 'IMPROVEMENTS')[0]; const dw = IMS && kids(IMS, 'IMPROVEMENT').find(i => kids(i, 'IMPROVEMENT_DETAIL').some(d => kids(d, 'ImprovementType').some(x => x.textContent === 'Dwelling')));
  const units = dw && kids(dw, 'PROPERTY_UNITS')[0] ? kids(kids(dw, 'PROPERTY_UNITS')[0], 'PROPERTY_UNIT') : []; const isAdu = u => [...u.getElementsByTagNameNS(NS, 'AccessoryDwellingUnitIndicator')].some(x => x.textContent.trim() === 'true');
  const pu = units.find(u => !isAdu(u));
  /* subject: summary (rent schedule, and the gross monthly rent for the income approach) */
  const RIS = one(SUBJ, 'RENTAL_INFORMATION_SUMMARY'); [...RIS.children].forEach(k => k.remove());
  if (RON) { const AI = el(RIS, 'ADDITIONAL_RENTAL_INCOMES'); const A = K.addl.filter(a => a.type && a.type !== 'None');
    (A.length ? A : [{ type: 'None', actual: 0, est: 0 }]).forEach(a => { const x = el(AI, 'ADDITIONAL_RENTAL_INCOME'); leaf(x, 'AdditionalRentalIncomeType', a.type); if (a.type === 'Other') leaf(x, 'AdditionalRentalIncomeTypeOtherDescription', String(a.other || 'Other').slice(0, 45)); leaf(x, 'MonthlyActualAdditionalIncomeAmount', Math.round(num(a.actual) || 0)); leaf(x, 'MonthlyEstimatedAdditionalIncomeAmount', Math.round(num(a.est) || 0)); }); }
  const D = el(RIS, 'RENTAL_INFORMATION_SUMMARY_DETAIL');
  if (ION && S.ctl) leaf(D, 'PropertyRentControlStatusType', S.ctl);
  if (RON && S.ctl === 'Yes' && S.ctlNote) leaf(D, 'RentControlDescription', String(S.ctlNote).slice(0, 2500));
  if (RON) { leaf(D, 'TotalMonthlyActualAdditionalIncomeAmount', Math.round(T.aa)); leaf(D, 'TotalMonthlyActualIncomeAmount', Math.round(T.totActual)); }
  leaf(D, 'TotalMonthlyActualRentAmount', Math.round(T.actual));
  if (RON) { leaf(D, 'TotalMonthlyEstimatedAdditionalIncomeAmount', Math.round(T.ae)); leaf(D, 'TotalMonthlyEstimatedIncomeAmount', Math.round(T.totEst)); }
  leaf(D, 'TotalMonthlyMarketRentAmount', T.market ? Math.round(T.market) : null);
  /* subject unit: its rent schedule line (the primary unit; an ADU is not on her schedule – it says so) */
  let subjRI = null;
  if (RON && pu) { const PD = kids(pu, 'PROPERTY_UNIT_DETAIL')[0] || el(pu, 'PROPERTY_UNIT_DETAIL'); kids(PD, 'UnitIncludedInRentScheduleIndicator').forEach(k => k.remove()); leaf(PD, 'UnitIncludedInRentScheduleIndicator', 'true');
    units.filter(isAdu).forEach(u => { const d = kids(u, 'PROPERTY_UNIT_DETAIL')[0]; if (d && !kids(d, 'UnitIncludedInRentScheduleIndicator').length) leaf(d, 'UnitIncludedInRentScheduleIndicator', 'false'); });
    kids(pu, 'UNIT_RENT_SCHEDULE').forEach(k => k.remove()); kids(pu, 'RENTAL_INFORMATIONS').forEach(k => k.remove());
    subjRI = 'RENTAL_INFORMATION_SubjectUnit1'; const RI = el(el(pu, 'RENTAL_INFORMATIONS'), 'RENTAL_INFORMATION', { 'xlink:label': subjRI });
    { const CS = el(RI, 'CAR_STORAGES'); const F = subjFacts(J); const VSr = Array.isArray(G0(J).subj.vs) && G0(J).subj.vs.length ? G0(J).subj.vs : null;
      const rows = VSr ? VSr.map(x => ({ t: x.t, n: +x.n, o: x.o })) : [+F.garage > 0 ? { t: 'Garage', n: +F.garage } : null, +F.carport > 0 ? { t: 'Carport', n: +F.carport } : null].filter(Boolean);
      (rows.length ? rows : [{ t: 'None' }]).forEach(x => { const d = el(el(CS, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); leaf(d, 'CarStorageType', x.t); if (x.t === 'Other') leaf(d, 'CarStorageTypeOtherDescription', String(x.o || 'Other').slice(0, 45)); if (x.t !== 'None') leaf(d, 'ParkingSpacesCount', x.n); }); }
    const U = el(pu, 'UNIT_RENT_SCHEDULE'); const gla = num(subjFacts(J).gla); const rented = S.rented === 'true';
    leaf(U, 'ActualRentPerUnitFinishedAreaAmount', gla ? (T.actual / gla).toFixed(2) : null);
    if (rented) { leaf(U, 'FinancialRentalConcessionIndicator', S.conc); if (S.mtm === 'false') leaf(U, 'LeaseStartDate', rsYM(S.lease)); leaf(U, 'MonthToMonthLeaseIndicator', S.mtm); }
    leaf(U, 'RentControlStatusType', S.ctl); if (rented) { leaf(U, 'UnitChargesIncludeUtilitiesIndicator', S.util); leaf(U, 'UnitFurnishedIndicator', S.furn); }
    leaf(U, 'UnitMonthlyActualRentAmount', Math.round(T.actual)); leaf(U, 'UnitMonthlyMarketRentAmount', T.market ? Math.round(T.market) : null); leaf(U, 'UnitRentedIndicator', S.rented); }
  /* comparable rentals (D-1 2- to 4-unit: PROPERTY_RENT_COMPn) */
  if (RON) X.R.forEach((r, i) => { const n = i + 1, P = el(PROPS, 'PROPERTY', { 'xlink:label': `PROPERTY_RENT_COMP${n}`, ValuationUseType: 'RentalComparable' }); addr(P, r.addr, r.city, r.zip);
    const CD = el(el(P, 'COMPARABLE'), 'COMPARABLE_DETAIL'); const px = prox(r.lat, r.lon); if (px && px.mi > 0) leaf(CD, 'ComparableToSubjectDirectionType', px.dir); leaf(CD, 'PropertyOrdinalNumber', n); if (px) leaf(CD, 'ProximityToSubjectDistanceLinearMeasure', px.mi.toFixed(2), { LinearUnitOfMeasureType: 'Miles' });
    const IM = el(el(P, 'IMPROVEMENTS'), 'IMPROVEMENT'); leaf(el(IM, 'IMPROVEMENT_DETAIL'), 'ImprovementType', 'Dwelling'); const U = el(el(IM, 'PROPERTY_UNITS'), 'PROPERTY_UNIT');
    if (num(r.gla)) leaf(el(U, 'PROPERTY_UNIT_AREA'), 'UnitTotalFinishedAreaMeasure', Math.round(num(r.gla)), { AreaUnitOfMeasureType: 'SquareFeet' });
    const ba = num(r.baths) || 0; const UD = el(U, 'PROPERTY_UNIT_DETAIL'); leaf(UD, 'BedroomCount', num(r.beds) ?? null); leaf(UD, 'FullBathroomCount', Math.floor(ba)); leaf(UD, 'HalfBathroomCount', ba % 1 >= 0.5 ? 1 : 0); leaf(UD, 'InteriorConditionRatingCode', r.cond || null);
    const lab = `RENTAL_INFORMATION_RENTCOMP${n}_SUBJECTUNIT1`; const RC = el(el(el(el(U, 'RENTAL_INFORMATIONS'), 'RENTAL_INFORMATION', { 'xlink:label': lab }), 'RENTAL_COMPARISON'), 'RENTAL_COMPARISON_DETAIL');
    leaf(RC, 'CarStoragesComparisonType', r.cCar || null); leaf(RC, 'ComparableWeightType', r.wt || null); leaf(RC, 'RentalUnitAdjustedRentAmount', Math.round(X.adj(r))); leaf(RC, 'RentalUnitToSubjectComparisonType', r.cAll || null); leaf(RC, 'SiteInfluencesComparisonType', r.cSite || null); leaf(RC, 'ViewsComparisonType', r.cView || null);
    const RS = el(U, 'UNIT_RENT_SCHEDULE'); leaf(RS, 'ActualRentPerUnitFinishedAreaAmount', num(r.gla) && num(r.rent) ? (num(r.rent) / num(r.gla)).toFixed(2) : null); leaf(RS, 'FinancialRentalConcessionIndicator', r.conc || null); leaf(RS, 'LeaseStartDate', rsYM(r.date)); leaf(RS, 'RentControlStatusType', r.ctl || null); leaf(RS, 'UnitChargesIncludeUtilitiesIndicator', r.util || null); leaf(RS, 'UnitFurnishedIndicator', r.furn || null); leaf(RS, 'UnitMonthlyActualRentAmount', num(r.rent) ? Math.round(num(r.rent)) : null);
    if (r.lat && r.lon) { const GI = el(el(P, 'LOCATION_IDENTIFIER'), 'GEOSPATIAL_INFORMATION'); leaf(GI, 'LatitudeIdentifier', (+r.lat).toFixed(6)); leaf(GI, 'LongitudeIdentifier', (+r.lon).toFixed(6)); }
    if (r.nbhd) leaf(el(el(P, 'NEIGHBORHOOD'), 'NEIGHBORHOOD_DETAIL'), 'NeighborhoodName', String(r.nbhd).slice(0, 50));
    { const PD = el(P, 'PROPERTY_DETAIL'); leaf(PD, 'PropertyInProjectIndicator', 'false'); leaf(PD, 'PUDIndicator', 'false'); }
    { const SI = el(P, 'SITE'); leaf(el(SI, 'SITE_DETAIL'), 'LandOwnedInCommonIndicator', 'false'); if (num(r.lot)) leaf(el(SI, 'SITE_SIZE_LAYOUT'), 'LotSizeAreaMeasure', Math.round(num(r.lot)), { AreaUnitOfMeasureType: 'SquareFeet' }); }
    if (subjRI) rel('RENTAL_INFORMATION_IsComparableFor_RENTAL_INFORMATION', lab, subjRI);
    if (r.mls) { const DS = kids(VA, 'DATA_SOURCES')[0] || VA.insertBefore(doc.createElementNS(NS, 'DATA_SOURCES'), VA.firstChild); const dl = `DATA_SOURCE_RENTCOMP${n}_MLS`; const d = el(DS, 'DATA_SOURCE', { 'xlink:label': dl }); leaf(d, 'DataSourceIdentifier', String(r.mls).slice(0, 20)); leaf(d, 'DataSourceName', DS_NAME.MLS); leaf(d, 'DataSourceType', 'MLS'); rel('DATA_SOURCE_IsDataSourceFor_PROPERTY', dl, `PROPERTY_RENT_COMP${n}`); } });
  /* gross rent multiplier comparables (D-1: PROPERTY_GRM_COMPn) */
  if (ION) K.grm.filter(g => g.use !== false && num(g.price) && num(g.rent)).forEach((g, i) => { const n = i + 1, P = el(PROPS, 'PROPERTY', { 'xlink:label': `PROPERTY_GRM_COMP${n}`, ValuationUseType: 'GrossRentMultiplierComparable' }); addr(P, g.addr, g.city, g.zip);
    const CD = el(el(P, 'COMPARABLE'), 'COMPARABLE_DETAIL'); const px = prox(g.lat, g.lon); if (px && px.mi > 0) leaf(CD, 'ComparableToSubjectDirectionType', px.dir); leaf(CD, 'ComparableWeightType', g.wt || null); leaf(CD, 'GrossMonthlyRentMultiplierNumber', Math.min(999, Math.round(num(g.price) / num(g.rent)))); leaf(CD, 'PropertyOrdinalNumber', n); if (px) leaf(CD, 'ProximityToSubjectDistanceLinearMeasure', px.mi.toFixed(2), { LinearUnitOfMeasureType: 'Miles' });
    if (g.lat && g.lon) { const GI = el(el(P, 'LOCATION_IDENTIFIER'), 'GEOSPATIAL_INFORMATION'); leaf(GI, 'LatitudeIdentifier', (+g.lat).toFixed(6)); leaf(GI, 'LongitudeIdentifier', (+g.lon).toFixed(6)); }
    { const PD = el(P, 'PROPERTY_DETAIL'); leaf(PD, 'AccessoryDwellingUnitTotalCount', num(g.adus) || 0); leaf(PD, 'LivingUnitExcludingADUCount', num(g.units) || 1); if (num(g.gba)) leaf(PD, 'TotalFinishedAreaOfAllLivingUnitsIncludingADUAreaMeasure', Math.round(num(g.gba)), { AreaUnitOfMeasureType: 'SquareFeet' }); }
    { const d = el(el(P, 'RENTAL_INFORMATION_SUMMARY'), 'RENTAL_INFORMATION_SUMMARY_DETAIL'); leaf(d, 'PropertyRentControlStatusType', g.ctl || null); leaf(d, 'TotalMonthlyActualRentAmount', Math.round(num(g.rent))); leaf(d, 'TotalMonthlyActualRentAmountEstimatedIndicator', g.est || 'false'); }
    { const h = el(el(P, 'SALES_HISTORIES'), 'SALES_HISTORY'); leaf(h, 'OwnershipTransferDate', isoDate(g.date) || null); leaf(h, 'OwnershipTransferTransactionAmount', Math.round(num(g.price))); leaf(h, 'OwnershipTransferTransactionType', 'Sale'); } });
  /* the rental commentary (F-1 23.04) */
  if (RON) { const t = (K.rentNote != null ? K.rentNote : rsNoteDraft(J)).trim(); if (t) { const VR = kids(VA, 'VALUATION_REPORT')[0]; if (VR) { const VC = kids(VR, 'VALUATION_COMMENTARIES')[0] || el(VR, 'VALUATION_COMMENTARIES');
    kids(VC, 'VALUATION_COMMENTARY').filter(c => kids(c, 'ValuationAnalysisCategoryType').some(x => x.textContent === 'ComparableRental')).forEach(c => c.remove());
    const c = el(VC, 'VALUATION_COMMENTARY'); leaf(c, 'ValuationAnalysisCategoryType', 'ComparableRental'); leaf(c, 'ValuationCommentText', t.slice(0, 5000)); } } }
  if (!RIS.children.length || (RIS.children.length === 1 && !kids(RIS, 'RENTAL_INFORMATION_SUMMARY_DETAIL')[0].children.length)) RIS.remove();
}
/* what only she can answer, for the pre-check */
function rsCheck(J) { const out = []; const RON = rentOn(J), ION = incOn(J); if (!RON && !ION) return out; const K = rsJob(J), S = K.sched, X = incomeCalc(J); const must = msg => out.push({ sev: 'Must fix', msg: 'Income (6): ' + msg });
  if (RON) { if (!S.rented) must('Rent schedule – is the subject currently rented? (Yes / No)'); if (!S.ctl) must('Rent schedule – rent control (Yes / No).');
    if (S.rented === 'true') { if (!num(S.actual)) must('Rent schedule – the subject\'s monthly rent.'); ['mtm', 'conc', 'util', 'furn'].forEach(k => { if (!S[k]) must(`Rent schedule – ${{ mtm: 'month-to-month', conc: 'rent concessions', util: 'utilities / services included', furn: 'furnished' }[k]} (Yes / No).`); }); if (S.mtm === 'false' && !rsYM(S.lease)) must('Rent schedule – lease start (MM/YYYY).'); }
    if (S.ctl === 'Yes' && !String(S.ctlNote || '').trim()) must('Rent schedule – describe the rent control and its effect on value and marketability.');
    if (!(num(K.rent) || X.rent)) must('Rent schedule – the subject\'s market rent.');
    K.addl.forEach((a, i) => { if (a.type === 'Other' && !String(a.other || '').trim()) must(`Additional rental income ${i + 1} – describe “Other”.`); });
    if (!X.R.length) out.push({ sev: 'Check', msg: 'Income (6): the rent schedule has no comparable rentals ticked.' });
    X.R.forEach((r, i) => { const w = `Comparable rental ${i + 1}`; if (r.dbOld) must(`${w} came from your rental database – ${r.dbOld} (type it in Rent / mo).`); if (!r.addr) must(`${w} – address.`); if (!num(r.rent)) must(`${w} – monthly rent.`); if (!r.cCar) must(`${w} – vehicle storage compared with the subject (Superior / Similar / Inferior).`); if (!r.wt) must(`${w} – weight (Most / Less / No weight).`);
      if (!(r.lat && r.lon)) out.push({ sev: 'Check', msg: `Income (6): ${w} has no map location – its proximity is not sent. Make the Rental map (Maps card) to locate it.` }); }); }
  if (ION) K.grm.filter(g => g.use !== false && num(g.price) && num(g.rent)).forEach((g, i) => { const w = `GRM comparable ${i + 1}`; if (!g.wt) must(`${w} – weight (Most / Less / No weight).`); if (!isoDate(g.date)) must(`${w} – sale date.`); if (!g.zip) must(`${w} – ZIP code.`);
    if (!(g.lat && g.lon)) out.push({ sev: 'Check', msg: `Income (6): ${w} has no map location – click “Find on the map” so its proximity is sent.` }); });
  return out; }
