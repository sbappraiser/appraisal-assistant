/* ---------------- Photo file naming ---------------- */
function orderedPhotos(ins) {
  const tabIdx = id => SECTIONS.findIndex(s => s.id === id);
  return [...ins.photos].sort((a, b) => tabIdx(photoTab(a)) - tabIdx(photoTab(b)) || (a.extra - b.extra) || a.ts - b.ts);
}
function sfrepNames(names) { const m = new Map(); names.forEach((v, k) => m.set(k, v.replace(/[^A-Za-z0-9.()-]+/g, '_'))); return m; }
function photoFileNames(ins) {
  const used = new Set(); const map = new Map();
  orderedPhotos(ins).forEach((p, i) => {
    let base = `${String(i + 1).padStart(3, '0')} ${safeName(p.label)}`; let n = base, k = 2;
    while (used.has(n.toLowerCase())) n = base + ' (' + k++ + ')';
    used.add(n.toLowerCase()); map.set(p.id, n + '.jpg');
  });
  return map;
}

/* ---------------- Readable notes (HTML for the workfile) ---------------- */
function notesHTML(ins, names) {
  const issues = computeIssues(ins);
  const row = (l, v) => v ? `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>` : '';
  const fieldRows = (fields, d) => fields.filter(f => !['photo', 'info', 'crs'].includes(f.t) && isShown(f, d, ins)).map(f => row(f.l, f.t === 'calc' ? String(f.calc(ins)) : f.t === 'review' ? (f.items(ins) || []).map(i => i.label + ': ' + (i.value || '—')).join('; ') : valText(f, d[f.k], d))).join('');
  const pics = list => list.length ? `<div class="pics">${list.map(p => `<figure><img src="Photos/${encodeURI(names.get(p.id))}" alt=""><figcaption>${esc(p.label)}</figcaption></figure>`).join('')}</div>` : '';
  let body = '';
  SECTIONS.forEach(sec => {
    let s = '';
    sec.groups.forEach(g => {
      const rows = fieldRows(g.fields, ins.data[sec.id]);
      let lst = '';
      if (g.list) ins.lists[g.list].forEach((it, i) => {
        const nm = LISTS[g.list].name(it, i, ins.lists[g.list]);
        lst += `<h4>${esc(nm)}</h4><table>${fieldRows(LISTS[g.list].fields, it)}${(g.list === 'kitchens' || g.list === 'baths') ? row('Quality comment (auto)', roomQualityComment(g.list, it)) : ''}</table>${pics(ins.photos.filter(p => p.list === g.list && p.item === it.id))}`;
      });
      const gp = ins.photos.filter(p => p.sec === sec.id && !p.extra && g.fields.some(f => f.k === p.field));
      if (rows || lst || gp.length) s += `<h3>${esc(g.title)}</h3>${rows ? `<table>${rows}</table>` : ''}${pics(gp)}${lst}`;
    });
    const ex = ins.photos.filter(p => p.sec === sec.id && p.extra);
    if (ex.length) s += `<h3>Workfile photos</h3>${pics(ex)}`;
    if (s) body += `<section><h2>${esc(sec.title)}</h2>${s}</section>`;
  });
  const sums = COMMENT_TARGETS.map(t => { const r = buildComment(ins, t); return r.text ? `<h3>${esc(t.title)} <small>${t.fid} · ${r.text.length}/${t.lim}</small></h3><p>${esc(r.text)}</p>${r.dropped.length ? `<p class="dropped">Not included in the UAD field (over limit): ${esc(r.dropped.join(' '))}</p>` : ''}` : ''; }).join('');
  const open = issues.filter(x => !ins.overrides[x.key]); const ovr = issues.filter(x => ins.overrides[x.key]);
  const p = ins.data.property;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(insTitle(ins))} – Inspection Notes</title>
<style>body{font:15px/1.45 -apple-system,"Segoe UI",Arial,sans-serif;color:#12302f;max-width:960px;margin:0 auto;padding:24px 16px}h1{color:#066a70;margin:0}h2{background:#0b8f96;color:#fff;padding:8px 12px;border-radius:6px;margin:28px 0 8px;font-size:18px}h3{color:#066a70;margin:18px 0 6px;font-size:16px}h4{margin:14px 0 4px}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #d5e6e7;padding:5px 8px}th{width:38%;font-weight:600;color:#4b6766}.pics{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}figure{margin:0;width:220px}figure img{width:100%;border-radius:6px;border:1px solid #d5e6e7}figcaption{font-size:12px}.meta{color:#4b6766}.dropped{color:#c45f06;font-size:13px}small{color:#4b6766;font-weight:400}@media print{h2{break-after:avoid}figure{break-inside:avoid}}</style></head><body>
<h1>${esc(insTitle(ins))}</h1><p class="meta">${esc([p.addr, p.unit, p.city, p.state, p.zip].filter(Boolean).join(', '))}<br>County: ${esc(p.county || '')} · Inspected ${esc(p.inspDate || '')} · Exported ${new Date().toLocaleString()}<br>${ins.photos.length} photos · Inspection record ID ${ins.id}</p>
${body}
${crsNotes(ins)}${permitNotes(ins)}<section><h2>Measure for SFREP (from your sketch)</h2>${measureReminders(ins).length ? '<ul>' + measureReminders(ins).map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '<p>None.</p>'}</section>
${(ins.sketch && (ins.sketch.calcs || []).length) ? `<section><h2>Area calculations (from the sketch, ANSI Z765-2021)</h2>${ins.sketch.calcs.map(x => `<h4>${esc(x.code)} ${esc(x.name)} · ${esc(x.levelName || x.level)}</h4><table>${x.lines.map(l => `<tr><td>${esc(l.t)}</td><td style="text-align:right">${l.a.toFixed(1)}</td></tr>`).join('')}${x.less.map(k => `<tr><td>less ${esc(k.name)} (drawn inside)</td><td style="text-align:right">−${k.a.toFixed(1)}</td></tr>`).join('')}<tr><th>Total</th><th style="text-align:right">${x.net.toLocaleString()} sf</th></tr></table>`).join('')}</section>` : ''}
<section><h2>UAD commentary (as sent to SFREP)</h2>${sums || '<p>None.</p>'}</section>
<section><h2>Open items at export</h2>${open.length ? '<ul>' + open.map(x => `<li>${esc(x.sev)}: ${esc(x.label)}</li>`).join('') + '</ul>' : '<p>None.</p>'}
${ovr.length ? '<h3>Overridden in the field</h3><ul>' + ovr.map(x => `<li>${esc(x.label)} — ${esc(ins.overrides[x.key])}</li>`).join('') + '</ul>' : ''}</section>
</body></html>`;
}

/* ---------------- MISMO 3.6 XML (UAD subject inspection data) ---------------- */
class XN { constructor(tag, attrs) { this.tag = tag; this.attrs = attrs || {}; this.kids = []; this.text = null; } }
function X(parent, tag, attrs) { const n = new XN(tag, attrs); if (parent) parent.kids.push(n); return n; }
function V(parent, tag, value, attrs) { if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) return null; const n = X(parent, tag, attrs); n.text = typeof value === 'boolean' ? String(value) : String(value); return n; }
const SQFT = { AreaUnitOfMeasureType: 'SquareFeet' };
function xmlOut(n, ind = '') {
  const a = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  if (n.text !== null) return `${ind}<${n.tag}${a}>${esc(n.text)}</${n.tag}>\n`;
  if (!n.kids.length) return n.selfClose ? `${ind}<${n.tag}${a}/>\n` : '';
  const inner = n.kids.map(k => xmlOut(k, ind + '\t')).join('');
  return inner ? `${ind}<${n.tag}${a}>\n${inner}${ind}</${n.tag}>\n` : '';
}
const ROOM_MAP = { 'Living Room': 'LivingRoom', 'Family Room': 'FamilyRoom', 'Dining Room': 'DiningRoom', 'Breakfast Room': 'BreakfastRoom', 'Den': 'Den', 'Recreation Room': 'RecreationRoom', 'Game Room': 'RecreationRoom', 'Media Room': 'MediaRoom', 'Theater': 'MediaRoom', 'Walk-In Pantry': 'WalkInPantry', 'Laundry Room': 'LaundryRoom', 'Mudroom': 'Mudroom', 'Sunroom': 'Sunroom', 'Loft': 'Loft', 'Workshop': 'Workshop', 'Utility Room': 'UtilityRoom', 'Mechanical': 'UtilityRoom' };
const OUTB_MAP = { 'Guest House': 'GuestHouse', 'Guest Quarters': 'GuestHouse', 'Studio': 'Studio', 'Art Studio': 'Studio', 'Pool House': 'PoolHouse', 'Cabana': 'PoolHouse', 'Office': 'Office', 'Barn': 'Barn', 'Stable': 'Stable', 'Shed': 'Shed', 'Storage': 'Shed', 'Workshop': 'Workshop', 'Greenhouse': 'Greenhouse', 'Boathouse': 'Boathouse', 'Bunkhouse': 'Bunkhouse', 'Kennel': 'EnclosedKennel', 'Indoor Riding Arena': 'IndoorRidingArena' };
const UAD_FLOOR = new Set(UAD.FlooringType.map(x => x[0]));
const UAD_CEIL = new Set(UAD.CeilingStyleType.map(x => x[0]));
const UAD_HEAT = new Set(UAD.HeatingSystemType.map(x => x[0]));
const UAD_VIEW = new Set(UAD.ViewType.map(x => x[0]));
const FLOOR_MAP = { Tile: 'CeramicTile', LVP: 'Vinyl', 'Vinyl Tile': 'Vinyl', 'Vinyl Sheet': 'Vinyl', Plywood: 'SubflooringOnly' };
const yn = v => v === true ? 'true' : v === false ? 'false' : undefined;

function buildMISMO(ins, imgName) {
  const d = ins.data, Lx = ins.lists;
  const imagesInto = (parent, photos, extra) => { if (!photos.length) return; const box = X(parent, 'IMAGES'); photos.forEach(p => { const im = X(box, 'IMAGE'); V(im, 'ImageCaptionCommentDescription', p.label.slice(0, 100)); if (extra && extra.cat) V(im, 'ImageCategoryType', extra.cat); V(im, 'ImageFileLocationIdentifier', '\\\\Images\\' + imgName.get(p.id)); V(im, 'MIMETypeIdentifier', 'image/jpeg'); }); };
  const used = new Set();
  const take = filter => { const out = ins.photos.filter(p => (!p.extra || p.toReport) && !used.has(p.id) && filter(p)); out.forEach(p => used.add(p.id)); return out; };

  const root = X(null, 'MESSAGE', { 'xmlns:xlink': 'http://www.w3.org/1999/xlink', xmlns: 'http://www.mismo.org/residential/2009/schemas', 'xmlns:gse': 'http://www.datamodelextension.org', MISMOReferenceModelIdentifier: '3.6.0366' });
  const doc = X(X(X(X(root, 'DOCUMENT_SETS'), 'DOCUMENT_SET'), 'DOCUMENTS'), 'DOCUMENT');
  V(X(X(doc, 'ABOUT_VERSIONS'), 'ABOUT_VERSION'), 'AboutVersionIdentifier', '1');
  const svc = X(X(X(X(X(X(doc, 'DEAL_SETS'), 'DEAL_SET'), 'DEALS'), 'DEAL'), 'SERVICES'), 'SERVICE');
  const RELS = X(svc, 'RELATIONSHIPS');
  const va = X(X(X(X(svc, 'VALUATION'), 'VALUATION_RESPONSE'), 'VALUATION_ANALYSES'), 'VALUATION_ANALYSIS');
  const isProj = IS_PROJ(ins), isHoa = IS_HOA(ins), isCoop = IS_COOP(ins), PJ = d.project || {};
  if (isProj && (PJ.dataSrc || []).length) {
    const DSS = X(va, 'DATA_SOURCES');
    PJ.dataSrc.forEach(t => { const lab = 'DATA_SOURCE_PROJECT_' + t; const e = X(DSS, 'DATA_SOURCE', { 'xlink:label': lab }); V(e, 'DataSourceType', t); if (t === 'Other') V(e, 'DataSourceTypeOtherDescription', (PJ.dataSrcOther || 'Other').slice(0, 33));
      X(RELS, 'RELATIONSHIP', { 'xlink:arcrole': 'urn:fdc:mismo.org:2009:residential/DATA_SOURCE_IsDataSourceFor_PROJECT', 'xlink:from': lab, 'xlink:to': 'PROJECT_SUBJECT' }).selfClose = true; });
  }
  const P = X(X(va, 'PROPERTIES'), 'PROPERTY', { ValuationUseType: 'SubjectProperty' });

  // ADDRESS
  const ad = X(P, 'ADDRESS'); V(ad, 'AddressLineText', d.property.addr); V(ad, 'AddressUnitIdentifier', d.property.unit); V(ad, 'CityName', cityOf(d.property)); V(ad, 'CountyName', countyOf(d.property)); V(ad, 'PostalCode', zipOf(d.property) ? zipOf(d.property) + (d.property.zip4 ? '-' + d.property.zip4 : '') : undefined); V(ad, 'StateCode', (d.property.state || '').toUpperCase());

  // CAR_STORAGES
  const cs = X(P, 'CAR_STORAGES');
  const privGar = d.garage.hasGarage && d.garage.garShared !== true; // a shared parking garage is sent as ParkingGarage spaces below
  if (privGar) {
    const c = X(cs, 'CAR_STORAGE'); const det = X(c, 'CAR_STORAGE_DETAIL');
    V(det, 'CarStorageAreaMeasure', skGarage(ins, false), SQFT); V(det, 'CarStorageAttachmentType', d.garage.garAttach); V(det, 'CarStorageType', 'Garage'); V(det, 'ParkingSpacesCount', d.garage.garSpaces);
    imagesInto(c, take(p => p.sec === 'garage'));
  }
  if (d.driveway.hasDrive) {
    const c = X(cs, 'CAR_STORAGE'); const det = X(c, 'CAR_STORAGE_DETAIL');
    V(det, 'CarStorageType', d.driveway.driveShared ? 'SharedDriveway' : 'Driveway');
    const mat = UAD.ImprovedSurfaceMaterialType.some(x => x[0] === d.driveway.driveMat) ? d.driveway.driveMat : (d.driveway.driveMat ? 'Other' : undefined);
    V(det, 'ImprovedSurfaceMaterialType', mat); if (mat === 'Other') V(det, 'ImprovedSurfaceMaterialTypeOtherDescription', String(d.driveway.driveMat).slice(0, 33));
    V(det, 'ParkingSpacesCount', d.driveway.driveSpaces); V(det, 'TenOrMoreParkingSpacesIndicator', (d.driveway.driveSpaces || 0) >= 10 ? 'true' : 'false');
    imagesInto(c, take(p => p.sec === 'driveway'));
  }
  if (d.garage.carport) { const det = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); V(det, 'CarStorageAreaMeasure', skGarage(ins, true), SQFT); V(det, 'CarStorageAttachmentType', d.garage.carportAttach); V(det, 'CarStorageType', 'Carport'); V(det, 'ParkingSpacesCount', d.garage.carport); }
  const projSpaces = isHoa ? [['ParkingGarage', 'pgSpaces', 'pgAssign'], ['CommonCarport', 'ccSpaces', 'ccAssign'], ['OpenLot', 'olSpaces', 'olAssign']].filter(([, n]) => (d.garage[n] || 0) > 0) : [];
  projSpaces.forEach(([type, n, a]) => { const det = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); V(det, 'CarStorageType', type); V(det, 'ParkingSpacesCount', d.garage[n]); V(det, 'ProjectParkingSpaceAssignmentType', d.garage[a]); });
  if (!d.driveway.hasDrive && !privGar && !d.garage.carport && !projSpaces.length) V(X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'), 'CarStorageType', 'None');

  // DISASTER_MITIGATION_FEATURES
  const dm = X(P, 'DISASTER_MITIGATION_FEATURES'); (d.interview.disaster || []).forEach(t => V(X(dm, 'DISASTER_MITIGATION_FEATURE'), 'DisasterMitigationFeatureType', t));

  // ENCUMBRANCES: age restriction from the CC&Rs (e.g. 55+)
  const AG = d.site.ageRestr !== undefined ? d.site : PJ; // 6f: asked on the Site tab for every property type
  if (AG.ageRestr === true) { const en = X(X(P, 'ENCUMBRANCES'), 'ENCUMBRANCE'); const cr = X(X(en, 'CONDITION_COVENANT_RESTRICTIONS'), 'CONDITION_COVENANT_RESTRICTION');
    V(cr, 'RestrictionDescription', AG.ageDesc); V(cr, 'RestrictionType', 'Age'); V(cr, 'ValueMarketabilityImpactType', AG.ageImpact); V(X(en, 'ENCUMBRANCE_DETAIL'), 'EncumbranceType', 'ConditionsCovenantsRestrictions'); }

  // ENERGY_EFFICIENCY_AND_GREEN
  const s = d.systems; const eg = X(P, 'ENERGY_EFFICIENCY_AND_GREEN'); const egd = X(eg, 'ENERGY_EFFICIENCY_AND_GREEN_DETAIL');
  const renew = (s.renew || []).filter(x => x !== 'None'), certs = (s.certs || []).filter(x => x !== 'None'), rat = (s.ratings || []).filter(x => x !== 'None');
  if (s.renew || s.certs || s.ratings) { V(egd, 'EfficiencyRatingExistsIndicator', String(rat.length > 0)); V(egd, 'GreenCertificationExistsIndicator', String(certs.length > 0)); V(egd, 'RenewableEnergyComponentExistsIndicator', String(renew.length > 0)); }
  V(egd, 'ValueMarketabilityImpactType', s.effImpact);
  if (renew.length) { const rc = X(eg, 'RENEWABLE_ENERGY_COMPONENTS'); renew.forEach(r => { const c = X(rc, 'RENEWABLE_ENERGY_COMPONENT'); if (r === 'Solar') { V(c, 'RenewableEnergyComponentFinancedIndicator', yn(s.solarFin)); V(c, 'RenewableEnergyComponentOwnershipType', s.solarOwn); } V(c, 'RenewableEnergyComponentType', r); }); }

  // ENVIRONMENTAL_CONDITIONS / FUNCTIONAL_ISSUES
  const env = X(P, 'ENVIRONMENTAL_CONDITIONS'); (d.site.envCond || []).forEach(t => { const e = X(env, 'ENVIRONMENTAL_CONDITION'); if (t !== 'None') { V(e, 'EnvironmentalConditionIdentifiedDescription', d.site.envDesc); V(e, 'EnvironmentalConditionProximityType', d.site.envProx); } V(e, 'EnvironmentalConditionType', t); });
  const fi = X(P, 'FUNCTIONAL_ISSUES'); const UF = new Set(UAD.FunctionalIssueType.map(x => x[0]));
  (d.condition.func || []).forEach(t => { const e = X(fi, 'FUNCTIONAL_ISSUE'); if (UF.has(t)) V(e, 'FunctionalIssueType', t); else { V(e, 'FunctionalIssueType', 'Other'); V(e, 'FunctionalIssueTypeOtherDescription', t.slice(0, 33)); } });

  // HOMEOWNERS_ASSOCIATIONS (condo, co-op, PUD)
  if (isHoa) {
    const AC = X(X(X(P, 'HOMEOWNERS_ASSOCIATIONS'), 'HOMEOWNERS_ASSOCIATION'), 'ASSOCIATION_CHARGES');
    const due = X(AC, 'ASSOCIATION_CHARGE'); const dd = X(due, 'ASSOCIATION_CHARGE_DETAIL'); V(dd, 'AssociationChargeAmount', (PJ.dues === undefined ? undefined : Math.round(+PJ.dues / ({ Quarterly: 3, 'Semi-annually': 6, Annually: 12 }[PJ.duesFreq] || 1)))); V(dd, 'AssociationChargePeriodType', 'Monthly'); V(dd, 'AssociationChargeType', 'AssociationDues');
    const inc = X(due, 'ASSOCIATION_CHARGE_INCLUDES_UTILITIES');
    (PJ.duesUtil || []).forEach(u => { if (u === 'Other') { const others = [...(PJ.duesUtilOtherPick || []), PJ.duesUtilOther].filter(Boolean); (others.length ? others : ['Other']).forEach(o => { const e = X(inc, 'ASSOCIATION_CHARGE_INCLUDES_UTILITY'); V(e, 'AssociationChargeIncludesUtilityType', 'Other'); V(e, 'AssociationChargeIncludesUtilityTypeOtherDescription', String(o).slice(0, 33)); }); return; }
      const e = X(inc, 'ASSOCIATION_CHARGE_INCLUDES_UTILITY'); V(e, 'AssociationChargeIncludesUtilityType', u); });
    if (['None', 'Existing', 'Proposed'].includes(PJ.specAssess)) { const sa = X(X(AC, 'ASSOCIATION_CHARGE'), 'ASSOCIATION_CHARGE_DETAIL');  V(sa, 'AssociationChargeType', 'AssociationSpecialAssessment'); V(sa, 'AssociationSpecialAssessmentStatusType', PJ.specAssess); }
    if (isProj && PJ.transferFee !== undefined) { const tf = X(X(AC, 'ASSOCIATION_CHARGE'), 'ASSOCIATION_CHARGE_DETAIL'); if (PJ.transferFee) { V(tf, 'AssociationChargeAmount', PJ.transferAmt); V(tf, 'AssociationChargePeriodType', 'OneTime'); V(tf, 'AssociationChargeType', 'OwnershipTransferFee'); } V(tf, 'OwnershipTransferFeeIndicator', yn(PJ.transferFee)); }
  }

  // IMPROVEMENTS: main dwelling
  const IMPS = X(P, 'IMPROVEMENTS');
  const DW = 'IMPROVEMENT_SubjectDwelling', UNIT = 'PROPERTY_UNIT_SubjectUnit1';
  const imp = X(IMPS, 'IMPROVEMENT', { 'xlink:label': DW }); const idt = X(imp, 'IMPROVEMENT_DETAIL');
  V(idt, 'ConvertedAreaExistsIndicator', yn(d.front.converted)); V(idt, 'ConvertedAreaFinishComparisonType', d.front.convSim); V(idt, 'ConvertedAreaOriginalUseType', d.front.convFrom);
  V(idt, 'CoolingSystemExistsIndicator', d.systems.cool ? String(!(d.systems.cool.length === 1 && d.systems.cool[0] === 'None')) : undefined);
  V(idt, 'DwellingExteriorDefectsExistIndicator', yn(d.exterior.extDefects));
  V(idt, 'HeatingSystemExistsIndicator', d.systems.heat ? String(!(d.systems.heat.length === 1 && d.systems.heat[0] === 'None')) : undefined);
  V(idt, 'ImprovementType', 'Dwelling'); V(idt, 'NonContinuousFinishedAreaIndicator', yn(d.interior.noncont));
  V(idt, 'PropertyStructureBuiltYear', d.front.yearBuilt); V(idt, 'PropertyStructureBuiltYearEstimatedIndicator', d.front.yearBuilt ? String(!!d.front.yearEst) : undefined);
  const PUS = X(imp, 'PROPERTY_UNITS');
  const unit = (puParent, label, src, opts) => { // src: {beds, full, half, levels[], rooms[], flooring...}
    const pu = X(puParent, 'PROPERTY_UNIT', { 'xlink:label': label });
    const acc = X(pu, 'ACCESSIBILITY_FEATURES'); (src.access || []).forEach(a => { const e = X(acc, 'ACCESSIBILITY_FEATURE'); V(e, 'AccessibilityFeatureType', a); if (a !== 'None') V(e, 'AccessibilityModificationDescription', src.accessDesc); });
    const ic = X(pu, 'INTERIOR_COMPONENTS');
    if ((src.flooring || []).length) { const c = X(ic, 'INTERIOR_COMPONENT'); const fc = X(c, 'FLOOR_COVERINGS'); src.flooring.filter(f => f !== 'None').forEach(f => { const e = X(fc, 'FLOOR_COVERING'); const m = FLOOR_MAP[f] || (UAD_FLOOR.has(f) ? f : null); if (m) V(e, 'FlooringType', m); else { V(e, 'FlooringType', 'Other'); V(e, 'FlooringTypeOtherDescription', f.slice(0, 33)); } V(e, 'ImprovementComponentConditionStatusType', src.floorCond); }); const det = X(c, 'INTERIOR_COMPONENT_DETAIL'); V(det, 'ImprovementComponentType', 'Flooring'); V(det, 'OverallFlooringUpdateStatusType', src.floorUpd); }
    if ((src.ceilH || []).length || (src.ceilS || []).length) { const c = X(ic, 'INTERIOR_COMPONENT'); const det = X(c, 'INTERIOR_COMPONENT_DETAIL'); V(det, 'ImprovementComponentConditionStatusType', src.wallCond); V(det, 'ImprovementComponentType', 'WallsAndCeiling'); const wc = X(c, 'WALLS_AND_CEILING'); const h = X(wc, 'CEILING_HEIGHTS'); (src.ceilH || []).forEach(x => V(X(h, 'CEILING_HEIGHT'), 'ApproximateCeilingHeightType', x)); const st = X(wc, 'CEILING_STYLES'); (src.ceilS || []).forEach(x => { const e = X(st, 'CEILING_STYLE'); if (UAD_CEIL.has(x)) V(e, 'CeilingStyleType', x); else { V(e, 'CeilingStyleType', 'Other'); V(e, 'CeilingStyleTypeOtherDescription', x.slice(0, 33)); } }); }
    const lv = X(pu, 'LEVELS'); (src.levels || []).forEach(l => { const e = X(lv, 'LEVEL'); V(e, 'AccessType', l.access); V(e, 'BelowGradeExteriorAccessType', l.bgAccess); V(e, 'GradeLevelType', l.grade); V(e, 'LevelFinishedAreaMeasure', l.finSf, SQFT); V(e, 'LevelType', l.level); V(e, 'LevelUnfinishedAreaMeasure', l.unfSf, SQFT); });
    const ar = X(pu, 'PROPERTY_UNIT_AREA'); const a = src.area || {};
    V(ar, 'UnitAboveGradeUnfinishedAreaMeasure', a.agUnfin, SQFT); V(ar, 'UnitBelowGradeUnfinishedAreaMeasure', a.bgUnfin, SQFT); V(ar, 'UnitNonStandardAboveGradeFinishedAreaMeasure', a.agNon, SQFT); V(ar, 'UnitNonStandardBelowGradeFinishedAreaMeasure', a.bgNon, SQFT); V(ar, 'UnitStandardAboveGradeFinishedAreaMeasure', a.agFin, SQFT); V(ar, 'UnitStandardBelowGradeFinishedAreaMeasure', a.bgFin, SQFT);
    const det = X(pu, 'PROPERTY_UNIT_DETAIL');
    V(det, 'AccessoryDwellingUnitIndicator', String(!!opts.adu));
    if (opts.adu) { V(det, 'AccessoryDwellingUnitLegallyRentableIndicator', yn(src.rentable)); V(det, 'AccessoryDwellingUnitTypicalToMarketIndicator', yn(src.typical)); V(det, 'AccessType', src.accessType); }
    V(det, 'AllowableLiveWorkSpaceIndicator', yn(src.liveWork));
    V(det, 'BedroomCount', src.beds); V(det, 'CornerUnitIndicator', yn(src.corner)); V(det, 'FloorIdentifier', src.floor); V(det, 'FullBathroomCount', src.full); V(det, 'HalfBathroomCount', src.half);
    V(det, 'InteriorConditionRatingCode', src.ic); V(det, 'InteriorQualityRatingCode', src.iq); V(det, 'LevelCount', src.levelCount);
    V(det, 'OverallBathroomsUpdateStatusType', src.bathUpd);
    if (opts.adu) V(det, 'SeparatePostalAddressIndicator', yn(src.postal));
    if (opts.adu) V(det, 'UnitIdentifier', (src.ident || 'ADU').slice(0, 25));
    V(det, 'UnitBelowGradeFinishComparisonType', src.bgCompare);
    V(det, 'UnitInteriorDefectsExistIndicator', yn(src.defects)); V(det, 'UnitMixedUsageIndicator', yn(src.unitMixed)); V(det, 'UnitOccupancyType', src.occ); V(det, 'UnitValuationCommentText', src.comment);
    if (opts.adu) V(det, 'UtilitiesMeteredSeparatelyIndicator', yn(src.metered));
    const rooms = X(pu, 'ROOMS');
    (src.rooms || []).forEach(r => {
      const rm = X(rooms, 'ROOM'); imagesInto(rm, r.photos || []);
      const rd = X(rm, 'ROOM_DETAIL'); V(rd, 'LevelType', r.level);
      V(rd, 'RoomConditionAdditionalDescription', r.condNote); V(rd, 'RoomConditionStatusType', r.condStat); V(rd, 'RoomQualityDescription', r.quality);
      V(rd, 'RoomType', r.type); if (r.type === 'Other') V(rd, 'RoomTypeOtherDescription', (r.other || '').slice(0, 33));
      V(rd, 'RoomUpdatedTimeframeType', r.time); V(rd, 'RoomUpdateStatusType', r.upd);
    });
    return pu;
  };
  const roomPhotos = (list, it, slot = 'main') => take(p => p.list === list && p.item === it.id && p.slot === slot);
  const mainRooms = [
    ...Lx.kitchens.map(k => ({ type: 'Kitchen', level: k.level, upd: k.upd, time: k.time, condStat: k.condStat, condNote: k.condNote, quality: roomQualityComment('kitchens', k), photos: roomPhotos('kitchens', k) })),
    ...Lx.baths.map(b => ({ type: b.kind, level: b.level, upd: b.upd, time: b.time, condStat: b.condStat, condNote: b.condNote, quality: roomQualityComment('baths', b), photos: roomPhotos('baths', b) })),
    ...Lx.bedrooms.map(b => ({ type: 'Bedroom', level: b.level, photos: roomPhotos('bedrooms', b) })),
    ...Lx.rooms.map(r => ({ type: ROOM_MAP[r.type] || 'Other', other: r.label || r.type, level: r.level, photos: roomPhotos('rooms', r) })),
  ];
  const sumL = (above, k) => Lx.levels.filter(l => above ? l.grade === 'AboveGrade' : l.grade && l.grade !== 'AboveGrade').reduce((t, l) => t + (+l[k] || 0), 0);
  const getC = id => { const t = COMMENT_TARGETS.find(x => x.id === id); return buildComment(ins, t).text || undefined; };
  unit(PUS, UNIT, {
    access: d.interior.access, accessDesc: d.interior.accessDesc, flooring: unitList(ins, 'flooring'), floorCond: d.interior.floorCond, floorUpd: d.interior.floorUpd,
    ceilH: d.interior.ceilH, ceilS: unitList(ins, 'ceilS'), wallCond: d.interior.wallCond, levels: Lx.levels.map(l => ({ ...l, ...skLevelArea(ins, l.level) })), area: skUnitArea(ins),
    beds: Lx.bedrooms.length, full: Lx.baths.filter(b => b.kind === 'FullBathroom').length, half: Lx.baths.filter(b => b.kind === 'HalfBathroom').length,
    ic: d.interior.ic, iq: d.interior.iq, levelCount: Lx.levels.length, bathUpd: d.interior.bathUpd, defects: d.interior.intDefects, occ: d.property.occ,
    comment: getC('interior'), rooms: mainRooms, bgCompare: d.interior.bgCompare,
    corner: RISE(ins) ? d.interior.corner : undefined, floor: RISE(ins) ? d.interior.floorNum : undefined,
    liveWork: d.property.siteCommon === true ? d.interior.liveWork : undefined, unitMixed: d.property.siteCommon === true ? d.interior.unitMixed : undefined,
  }, {});
  // ADUs inside the dwelling are extra units of the dwelling; others are separate improvements
  const aduLabels = [];
  const aduSrc = (a, i) => ({ access: [], flooring: a.flooring, floorUpd: a.floorUpd, ceilH: a.ceilH, ceilS: a.ceilS, levels: a.level ? [{ level: a.level, grade: a.level.startsWith('Below') ? 'FullyBelowGrade' : 'AboveGrade' }] : [],
    area: {}, beds: a.beds || 0, full: a.fullBaths || 0, half: a.halfBaths || 0, ic: a.ic, iq: a.iq, levelCount: a.levels, bathUpd: a.bathUpd,
    defects: a.defects, occ: a.occ, rentable: a.rentable, typical: a.typical, accessType: a.access, postal: a.postal, ident: a.ident || ('ADU ' + (i + 1)), metered: a.metered,
    comment: aduComment(ins, a, i),
    rooms: [
      ...(a.kitchen && a.kitchen !== 'None' ? [{ type: 'Kitchen', level: a.level, upd: a.kitUpd, time: a.kitTime, photos: take(p => p.list === 'adus' && p.item === a.id && p.slot === 'kit') }] : []),
      ...((a.fullBaths || 0) > 0 ? [{ type: 'FullBathroom', level: a.level, photos: take(p => p.list === 'adus' && p.item === a.id && p.slot === 'bath') }] : []),
      ...((a.halfBaths || 0) > 0 ? [{ type: 'HalfBathroom', level: a.level, photos: take(p => p.list === 'adus' && p.item === a.id && p.slot === 'half') }] : []),
      ...((a.beds || 0) > 0 ? [{ type: 'Bedroom', level: a.level, photos: take(p => p.list === 'adus' && p.item === a.id && p.slot === 'bed') }] : []),
    ] });
  Lx.adus.forEach((a, i) => { if (a.loc === 'Dwelling') { const lab = 'PROPERTY_UNIT_ADU' + (i + 1); unit(PUS, lab, aduSrc(a, i), { adu: true }); aduLabels.push([a.id, lab, DW]); } });

  // STRUCTURE (main dwelling)
  const ST = X(imp, 'STRUCTURE'); const AD = X(ST, 'ARCHITECTURAL_DESIGN'); V(AD, 'ArchitecturalDesignCategoryType', d.front.design);
  const attached = d.property.attach === 'Attached', sDes = attached ? d.property.structDesign : undefined, th = sDes === 'RowhouseTownhouse', hoExt = d.property.hoExt !== false;
  V(AD, 'StructuralDesignType', sDes); if (sDes === 'Other') V(AD, 'StructuralDesignTypeOtherDescription', (d.property.structOther || 'Other').slice(0, 33));
  V(X(X(ST, 'CONSTRUCTION_METHODS'), 'CONSTRUCTION_METHOD'), 'ConstructionMethodType', d.front.constr);
  const SC = hoExt ? X(ST, 'STRUCTURE_COMPONENTS') : new XN('STRUCTURE_COMPONENTS'); // not sent when the HOA maintains the exterior
  if ((d.front.walls || []).length) { const c = X(SC, 'STRUCTURE_COMPONENT'); const w = X(c, 'EXTERIOR_WALLS'); d.front.walls.forEach(m => V(X(w, 'EXTERIOR_WALL'), 'WallMaterialType', m)); const dt = X(c, 'STRUCTURE_COMPONENT_DETAIL'); V(dt, 'ImprovementComponentConditionStatusType', d.front.wallsCond); V(dt, 'ImprovementComponentType', 'ExteriorWallsAndTrim'); }
  if ((d.front.foundType || []).length) { const c = X(SC, 'STRUCTURE_COMPONENT'); const f = X(X(c, 'FOUNDATIONS'), 'FOUNDATION'); const fm = X(f, 'FOUNDATION_MATERIALS'); const perim = d.front.foundType.includes('ConcretePerimeter'); [...new Set([...(d.front.foundMat || []), ...(perim ? ['PouredConcrete'] : [])])].forEach(m => V(X(fm, 'FOUNDATION_MATERIAL'), 'FoundationMaterialType', m)); const fs = X(f, 'FOUNDATION_STYLES'); [...new Set(d.front.foundType.map(t => t === 'ConcretePerimeter' ? 'CrawlSpace' : t))].forEach(t => V(X(fs, 'FOUNDATION_STYLE'), 'FoundationType', t)); const dt = X(c, 'STRUCTURE_COMPONENT_DETAIL'); V(dt, 'ImprovementComponentConditionStatusType', d.front.foundCond); V(dt, 'ImprovementComponentType', 'Foundation'); }
  if (d.front.roofObs !== undefined || (d.front.roofMat || []).length) { const c = X(SC, 'STRUCTURE_COMPONENT'); const r = X(c, 'ROOF'); const rd = X(r, 'ROOF_DETAIL'); V(rd, 'RoofEstimatedAgeRangeType', d.front.roofAge); V(rd, 'RoofObservableIndicator', yn(d.front.roofObs)); const rm = X(r, 'ROOF_MATERIALS'); (d.front.roofMat || []).forEach(m => V(X(rm, 'ROOF_MATERIAL'), 'RoofMaterialType', m)); const dt = X(c, 'STRUCTURE_COMPONENT_DETAIL'); if (d.front.roofObs !== false) V(dt, 'ImprovementComponentConditionStatusType', d.front.roofCond); V(dt, 'ImprovementComponentType', 'Roof'); }
  if ((d.front.windows || []).length) { const c = X(SC, 'STRUCTURE_COMPONENT'); const dt = X(c, 'STRUCTURE_COMPONENT_DETAIL'); V(dt, 'ImprovementComponentConditionStatusType', d.front.winCond); V(dt, 'ImprovementComponentType', 'Windows'); V(dt, 'ImprovementComponentTypeAdditionalDescription', d.front.windows.join(', ').slice(0, 100)); }
  const sd = X(ST, 'STRUCTURE_DETAIL'); if (hoExt) { V(sd, 'ExteriorConditionRatingCode', d.front.ec); V(sd, 'ExteriorQualityRatingCode', d.front.eq); } V(sd, 'FrontDoorApproximateElevationRangeType', d.front.frontElev);
  V(sd, 'LivingUnitCount', 1 + Lx.adus.filter(a => a.loc === 'Dwelling').length);
  if (th) { V(sd, 'RowhouseTownhouseBackToBackIndicator', yn(d.property.thBack)); V(sd, 'RowhouseTownhouseEndUnitIndicator', yn(d.property.thEnd)); if (d.property.thStacked) V(sd, 'RowhouseTownhouseLocationType', d.property.thLoc); V(sd, 'RowhouseTownhouseStackedIndicator', yn(d.property.thStacked)); }
  V(sd, 'StoriesCount', d.front.stories);
  V(sd, 'StructureValuationCommentText', getC('exterior'));
  // SYSTEM
  const SY = X(imp, 'SYSTEM'); const cool = X(SY, 'COOLING_SYSTEMS'); (d.systems.cool || []).filter(c => ['Centralized', 'Individual'].includes(c)).forEach(c => V(X(cool, 'COOLING_SYSTEM'), 'CoolingSystemType', c));
  (d.systems.cool || []).filter(c => !['Centralized', 'Individual', 'None'].includes(c)).forEach(c => { const e = X(cool, 'COOLING_SYSTEM'); V(e, 'CoolingSystemType', c === 'Mini Split' ? 'Individual' : 'Other'); if (c !== 'Mini Split') V(e, 'CoolingSystemTypeOtherDescription', c); });
  const heat = X(SY, 'HEATING_SYSTEMS'); (d.systems.heat || []).filter(h => h !== 'None').forEach((h, i) => { const e = X(heat, 'HEATING_SYSTEM'); V(e, 'HeatingFuelType', (d.systems.heatFuel || [])[Math.min(i, (d.systems.heatFuel || []).length - 1)]); if (UAD_HEAT.has(h)) V(e, 'HeatingSystemType', h); else { V(e, 'HeatingSystemType', 'Other'); V(e, 'HeatingSystemTypeOtherDescription', h.slice(0, 33)); } });
  const mech = X(SY, 'MECHANICAL_SYSTEMS'); const UM = new Set(UAD.MechanicalSystemType.map(x => x[0]));
  if ((d.systems.wh || []).length) V(X(mech, 'MECHANICAL_SYSTEM'), 'MechanicalSystemType', 'WaterHeater');
  (d.systems.mech || []).filter(m => UM.has(m) && m !== 'WaterHeater').forEach(m => V(X(mech, 'MECHANICAL_SYSTEM'), 'MechanicalSystemType', m));
  V(X(SY, 'SYSTEM_DETAIL'), 'CoreHeatingSystemBelowGradeIndicator', yn(d.systems.heatBelow));

  // Standalone ADUs and outbuildings
  Lx.adus.forEach((a, i) => {
    if (a.loc === 'Dwelling') return;
    const lab = 'IMPROVEMENT_ADU' + (i + 1); const im = X(IMPS, 'IMPROVEMENT', { 'xlink:label': lab }); const dt = X(im, 'IMPROVEMENT_DETAIL');
    V(dt, 'ImprovementType', 'Outbuilding'); V(dt, 'OutbuildingDefectsExistIndicator', yn(a.defects)); V(dt, 'OutbuildingRealPropertyIndicator', 'true'); V(dt, 'OutbuildingType', 'StandaloneADU');
    const pl = 'PROPERTY_UNIT_ADU' + (i + 1); unit(X(im, 'PROPERTY_UNITS'), pl, aduSrc(a, i), { adu: true }); aduLabels.push([a.id, pl, lab]);
    const sdd = X(X(im, 'STRUCTURE'), 'STRUCTURE_DETAIL'); V(sdd, 'LivingUnitCount', 1);
  });
  const outLabels = [];
  Lx.outbuildings.forEach((o, i) => {
    const lab = 'IMPROVEMENT_OUTBUILDING' + (i + 1); outLabels.push([o.id, lab]); const im = X(IMPS, 'IMPROVEMENT', { 'xlink:label': lab }); const dt = X(im, 'IMPROVEMENT_DETAIL');
    if (o.real === true) { V(dt, 'CoolingSystemExistsIndicator', String((o.feat || []).includes('Cooled'))); V(dt, 'HeatingSystemExistsIndicator', String((o.feat || []).includes('Heated'))); }
    V(dt, 'ImprovementType', 'Outbuilding'); V(dt, 'OutbuildingDefectsExistIndicator', yn(o.defects)); V(dt, 'OutbuildingRealPropertyIndicator', yn(o.real));
    const t = OUTB_MAP[o.type]; V(dt, 'OutbuildingType', t || (o.type ? 'Other' : undefined)); if (!t && o.type) V(dt, 'OutbuildingTypeOtherDescription', (o.label || o.type).slice(0, 21));
    const ou = X(X(im, 'OUTBUILDING'), 'OUTBUILDING_UTILITIES'); (o.util || []).forEach(u => { const m = { Electricity: 'Electricity', Gas: 'Gas', Water: 'Water', 'Sanitary Sewer': 'SanitarySewer', Septic: 'SanitarySewer', None: 'None' }[u]; if (m) V(X(ou, 'OUTBUILDING_UTILITY'), 'UtilityType', m); });
    const sdd = X(X(im, 'STRUCTURE'), 'STRUCTURE_DETAIL');
    V(sdd, 'StructureValuationCommentText', buildComment(ins, COMMENT_TARGETS.find(x => x.id === 'outbuilding')).text ? GEN.outbuilding(ins)[i].t + (o.note ? ' ' + o.note : '') : undefined);
  });

  // INSPECTIONS: report-level exhibits with SFREP link elements
  const INS = X(P, 'INSPECTIONS'); const insp = X(INS, 'INSPECTION'); const box = X(insp, 'IMAGES');
  const push = (p, cat, link, noCap) => { const im = X(box, 'IMAGE'); if (!noCap) V(im, 'ImageCaptionCommentDescription', p.label.slice(0, 100)); V(im, 'ImageCategoryType', cat); V(im, 'ImageFileLocationIdentifier', '\\\\Images\\' + imgName.get(p.id)); V(im, 'MIMETypeIdentifier', 'image/jpeg'); if (link) V(im, link[0], link[1]); };
  const front = take(p => p.sec === 'front' && p.field === 'photoFront');
  if (front[0]) push(front[0], 'PropertyPhoto');
  front.forEach(p => push(p, 'DwellingFront', ['ImageImprovement', DW]));
  take(p => p.sec === 'street' && p.field === 'photoStreet').forEach(p => push(p, 'PropertyAccess'));
  take(p => p.sec === 'exterior' && p.field === 'photoRear').forEach(p => push(p, 'DwellingRear', ['ImageImprovement', DW]));
  take(p => ['front', 'exterior'].includes(p.sec)).forEach(p => push(p, 'DwellingExteriorExhibit', ['ImageImprovement', DW]));
  take(p => p.sec === 'site' && p.field === 'photoWater').forEach(p => push(p, 'WaterFrontage'));
  take(p => p.sec === 'site' && /photoView/.test(p.field || '')).forEach(p => push(p, 'View', ['ImageItem', 'SITE_VIEW_1']));
  take(p => p.sec === 'site' && p.field === 'photoInfl').forEach(p => push(p, 'SiteInfluence', ['ImageItem', 'SITE_INFLUENCE_1']));
  take(p => p.sec === 'site' && /photoSite/.test(p.field || '')).forEach(p => push(p, 'SiteCharacteristic', ['ImageItem', 'SITE_FEATURE_1']));
  take(p => p.sec === 'project' && /photoAmen/.test(p.field || '')).forEach(p => push(p, 'ProjectAmenity'));
  take(p => p.sec === 'project' && /photoProjDef/.test(p.field || '')).forEach(p => push(p, 'ProjectDeficiency'));
  take(p => p.sec === 'project').forEach(p => push(p, 'ProjectExhibit'));
  take(p => p.sec === 'street').forEach(p => push(p, 'SiteExhibit'));
  // the first exterior photo of each outbuilding / ADU has no caption: SFREP puts that one in the building's main photo box
  const firstSeen = new Set(); const mainFirst = arr => arr.slice().sort((a, b) => (a.slot === 'main' ? 0 : 1) - (b.slot === 'main' ? 0 : 1));
  mainFirst(take(p => p.list === 'outbuildings')).forEach(p => { const l = outLabels.find(x => x[0] === p.item); const first = p.slot === 'main' && !firstSeen.has(p.item); if (first) firstSeen.add(p.item); push(p, 'OutbuildingExhibit', l ? ['ImageImprovement', l[1]] : null, first); });
  take(p => p.list === 'adus' && p.slot === 'main').forEach(p => { const l = aduLabels.find(x => x[0] === p.item); const first = !firstSeen.has(p.item); if (first) firstSeen.add(p.item); push(p, 'OutbuildingExhibit', l ? ['ImageImprovement', l[2]] : null, first); });
  take(p => p.list === 'adus').forEach(p => { const l = aduLabels.find(x => x[0] === p.item); push(p, 'UnitInteriorExhibit', l ? ['ImagePropertyUnit', l[1]] : null); });
  take(p => p.sec === 'interior' && p.field === 'sketchImg').forEach(p => push(p, 'SubjectPropertyImprovementSketch'));
  take(p => p.list === 'noncont').forEach(p => push(p, 'NoncontinuousArea'));
  take(p => p.sec === 'interior' || ['wetbars', 'levels'].includes(p.list)).forEach(p => push(p, 'UnitInteriorExhibit', ['ImagePropertyUnit', UNIT]));
  take(p => p.sec === 'systems').forEach(p => push(p, 'EnergyEfficientAndGreenFeaturesExhibit'));
  take(p => p.sec === 'condition').forEach(p => push(p, 'FunctionalObsolescenceExhibit'));
  const idt2 = X(X(INS, 'INSPECTION', { 'xlink:label': 'INSPECTION_Appraiser' }), 'INSPECTION_DETAIL');
  V(idt2, 'InspectionDate', d.property.inspDate); V(idt2, 'PropertyExteriorInspectionMethodType', d.property.extMethod); V(idt2, 'PropertyInteriorInspectionMethodType', d.property.intMethod);

  // LOCATION_IDENTIFIER and PARCELS from the CRS report
  const crs = d.property.crs || {};
  if (crs.lat && crs.lng) { const g = X(X(P, 'LOCATION_IDENTIFIER'), 'GEOSPATIAL_INFORMATION'); V(g, 'LatitudeIdentifier', crs.lat); V(g, 'LongitudeIdentifier', crs.lng); }
  if (crs.apn || d.site.apnDesc) { const pr = X(X(P, 'PARCELS'), 'PARCEL'); const pdd = X(pr, 'PARCEL_DETAIL'); V(pdd, 'ParcelAreaMeasure', crs.lotSf, SQFT); V(pdd, 'ParcelDescriptionClassificationType', d.site.apnDesc); if (d.site.apnDesc === 'Other') V(pdd, 'ParcelDescriptionClassificationTypeOtherDescription', (d.site.apnOther || '').slice(0, 50));
    if (crs.apn) { const pid = X(X(pr, 'PARCEL_IDENTIFICATIONS'), 'PARCEL_IDENTIFICATION'); V(pid, 'ParcelIdentificationType', 'AssessorUnformattedIdentifier'); V(pid, 'ParcelIdentifier', crs.apn); } }
  // PROPERTY_AMENITY
  const CAT = { Fence: 'OutdoorAccessories', IrrigationSystem: 'OutdoorAccessories', OutdoorFireplace: 'OutdoorAccessories', OutdoorKitchen: 'OutdoorAccessories', SportsCourt: 'OutdoorAccessories', Deck: 'OutdoorLiving', Patio: 'OutdoorLiving', Porch: 'OutdoorLiving', Balcony: 'OutdoorLiving', Gazebo: 'OutdoorLiving', Portico: 'OutdoorLiving', IngroundPool: 'WaterFeatures', IngroundSpa: 'WaterFeatures', OutdoorShower: 'WaterFeatures', Elevator: 'WholeHome', FireSuppressionSystem: 'WholeHome', ElectricVehicleChargingStation: 'WholeHome', SmartHomeSystem: 'WholeHome', IndoorFireplace: 'WholeHome', MultipleZoneHeatingVentilationAndAirConditioning: 'WholeHome', WholeHouseVentilation: 'WholeHome', WoodStove: 'WholeHome', Sauna: 'WaterFeatures', OutdoorRidingRing: 'Miscellaneous', Other: 'Miscellaneous' };
  const amen = []; // {type, other, mat, area, count, photos, pool:[]}
  Lx.outdoorLiving.forEach(o => { const t = ['Porch', 'Patio', 'Deck', 'Balcony', 'Portico'].includes(o.type) ? o.type : 'Other'; amen.push({ type: t, other: t === 'Other' ? o.type : null, mat: o.material, photos: take(p => p.list === 'outdoorLiving' && p.item === o.id) }); });
  Lx.waterFeatures.filter(w => !/^Above-ground/.test(w.type || '')).forEach(w => { const t = ['IngroundPool', 'IngroundSpa', 'OutdoorShower', 'Sauna'].includes(w.type) ? w.type : 'Other'; const pf = ['IngroundPool', 'IngroundSpa'].includes(t) ? (w.feat || []).filter(f => ['Heated', 'Caged', 'Indoor'].includes(f)) : []; amen.push({ type: t, other: t === 'Other' ? w.type : null, photos: take(p => p.list === 'waterFeatures' && p.item === w.id), pool: pf, cat: 'WaterFeatures' }); });
  const a = d.amenities; const hs = a.hardscape || [], od = a.outdoor || [], rec = a.rec || [], sm = d.systems.smart || [], ie = d.interior.intFeat || [], eff = d.systems.eff || [];
  if (hs.includes('Fencing') || (a.fenceMat || []).length) amen.push({ type: 'Fence', other: null, mat: { Wood: 'Wood', Vinyl: 'Vinyl', 'Wrought Iron': 'Metal', 'Chain Link': 'Metal', 'Block / Masonry': 'Concrete' }[(a.fenceMat || [])[0]] });
  if ((a.landSys || []).some(x => /Irrigation/.test(x))) amen.push({ type: 'IrrigationSystem' });
  if (od.includes('Outdoor Fireplace') || hs.includes('Outdoor Fireplace')) amen.push({ type: 'OutdoorFireplace' });
  if (od.includes('Outdoor Kitchen') || od.includes('Built-in BBQ Area')) amen.push({ type: 'OutdoorKitchen' });
  if (rec.some(x => /Court/.test(x))) amen.push({ type: 'SportsCourt', count: rec.filter(x => /Court/.test(x)).length });
  if (od.includes('Gazebo') || hs.includes('Gazebo')) amen.push({ type: 'Gazebo' });
  if (od.includes('Sauna') && !amen.some(x => x.type === 'Sauna')) amen.push({ type: 'Sauna' });
  if (od.includes('Outdoor Shower') && !amen.some(x => x.type === 'OutdoorShower')) amen.push({ type: 'OutdoorShower' });
  if (ie.includes('Elevator')) amen.push({ type: 'Elevator' });
  if (ie.includes('Fire Sprinklers')) amen.push({ type: 'FireSuppressionSystem' });
  if (eff.includes('EV Charging') || (d.garage.garFeat || []).includes('EV Charger')) amen.push({ type: 'ElectricVehicleChargingStation' });
  if (sm.length) amen.push({ type: 'SmartHomeSystem' });
  if ((d.interior.fireplaces || 0) > 0) amen.push({ type: 'IndoorFireplace', count: d.interior.fireplaces });
  if ((d.systems.heatZones || 0) >= 2) amen.push({ type: 'MultipleZoneHeatingVentilationAndAirConditioning' });
  if ((d.systems.mech || []).includes('Whole House Ventilation')) amen.push({ type: 'WholeHouseVentilation' });
  if (a.equestrian) amen.push({ type: 'Other', other: 'Equestrian', photos: take(p => p.sec === 'amenities' && p.field === 'photoEquine') });
  // anything not placed above (amenity / site / parking photos, and extra photos she ticked "Send to SFREP") goes in as an exhibit of its section
  take(p => p.sec === 'amenities' || p.sec === 'buildings').forEach(p => push(p, 'SubjectPropertyAmenitiesExhibit'));
  take(p => p.sec === 'site').forEach(p => push(p, 'SiteExhibit'));
  take(p => p.sec === 'garage' || p.sec === 'driveway').forEach(p => push(p, 'VehicleStorageExhibit'));
  // PROJECT (condo / co-op; PUD gets amenities, legal action and developer control)
  if (isHoa) {
    const PR = X(P, 'PROJECT', { 'xlink:label': 'PROJECT_SUBJECT' });
    const amList = [...(PJ.projAmen || [])]; if (PJ.clubReq === true && !amList.includes('ClubMembership')) amList.push('ClubMembership');
    const am = X(PR, 'PROJECT_AMENITIES'); amList.filter(x => !(x === 'None' && amList.length > 1)).forEach(t => { const e = X(am, 'PROJECT_AMENITY');
      if (t === 'UnitStorage' || t === 'BoatSlip') { const own = t === 'UnitStorage' ? PJ.storageOwn : PJ.slipOwn; V(e, 'AmenityOwnershipType', own); if (own === 'Other') V(e, 'AmenityOwnershipTypeOtherDescription', ((t === 'UnitStorage' ? PJ.storageOther : PJ.slipOther) || 'Other').slice(0, 33)); }
      if (t.startsWith('Other:')) { V(e, 'AmenityType', 'Other'); V(e, 'AmenityTypeOtherDescription', t.slice(6).slice(0, 33)); return; }
      V(e, 'AmenityType', t); if (t === 'Other') V(e, 'AmenityTypeOtherDescription', (PJ.projAmenOther || 'Other').slice(0, 33)); });
    if (isProj) { const pa2 = X(PR, 'PROJECT_ANALYSIS');
      if (PJ.groundRent) { const grIso = (() => { const m = String(PJ.grExp || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}$/.test(PJ.grExp || '') ? PJ.grExp : undefined; })();
        V(pa2, 'ProjectAnalysisGroundRentAmount', PJ.grMonthly !== undefined ? Math.round(PJ.grMonthly * 12) : PJ.grAmt); V(pa2, 'ProjectAnalysisGroundRentDescription', PJ.grDesc); V(pa2, 'ProjectAnalysisGroundRentExpirationDate', grIso); }
      V(pa2, 'ProjectAnalysisGroundRentIndicator', yn(PJ.groundRent)); if (PJ.projDef) V(pa2, 'ProjectConditionAndQualityDescription', PJ.projDefDesc); V(pa2, 'ProjectDeficiencyObservedIndicator', yn(PJ.projDef)); }
    if (isCoop && PJ.blanket) { const bf = X(PR, 'PROJECT_BLANKET_FINANCINGS'); const share = PJ.sharesTotal && PJ.sharesUnit ? PJ.sharesUnit / PJ.sharesTotal : 0; const pr = v => share && v ? (v * share).toFixed(2) : undefined;
      (Lx.blanketLoans || []).forEach(b => { const e = X(bf, 'PROJECT_BLANKET_FINANCING'); V(e, 'AmortizationType', b.amort); if (b.amort === 'Other') V(e, 'AmortizationTypeOtherDescription', (b.amortOther || 'Other').slice(0, 33)); V(e, 'BalloonIndicator', yn(b.balloon)); if (b.rateKnown) V(e, 'CurrentInterestRatePercent', b.rate); V(e, 'InterestRateAvailableIndicator', yn(b.rateKnown)); V(e, 'LienPriorityType', b.lien);
        if (b.loc) { V(e, 'LineOfCreditDrawnAmount', b.drawn); V(e, 'LineOfCreditDrawnProRataShareAttributableToUnitAmount', pr(b.drawn)); } V(e, 'LineOfCreditIndicator', yn(b.loc)); if (b.loc) { V(e, 'LineOfCreditMaximumAmount', b.max); V(e, 'LineOfCreditMaximumProRataShareAttributableToUnitAmount', pr(b.max)); }
        V(e, 'LoanRemainingMaturityTermMonthsCount', b.term); V(e, 'PaymentAmountAvailableIndicator', yn(b.payKnown)); if (b.payKnown) { V(e, 'PaymentFrequencyType', 'Monthly'); V(e, 'TotalPaymentAmount', b.pay); } if (b.loc === false) { V(e, 'UPBAmount', b.upb); V(e, 'UPBProRataShareAttributableToUnitAmount', pr(b.upb)); } }); }
    if (isProj && PJ.projComplete === false) { const pc2 = X(PR, 'PROJECT_COMPONENTS'); (PJ.projIncomplete || []).forEach(t => { const e = X(pc2, 'PROJECT_COMPONENT'); V(e, 'ProjectComponentCategoryType', t); if (t === 'Other') V(e, 'ProjectComponentCategoryTypeOtherDescription', (PJ.projIncOther || 'Other').slice(0, 33)); V(e, 'ProjectComponentCompletedIndicator', 'false'); }); }
    if (isProj) { const cv = X(PR, 'PROJECT_CONVERSION'); V(cv, 'ProjectConversionIndicator', yn(PJ.converted)); if (PJ.converted) { V(cv, 'ProjectConversionOriginalUseType', PJ.convFrom); if (PJ.convFrom === 'Other') V(cv, 'ProjectConversionOriginalUseTypeOtherDescription', (PJ.convOther || 'Other').slice(0, 33)); } }
    const pdd2 = X(PR, 'PROJECT_DETAIL'); V(pdd2, 'LegalActionIndicator', yn(PJ.legalAction));
    if (isProj) { V(pdd2, 'ProjectCommercialSpaceIndicator', yn(PJ.commercial)); if (PJ.commercial) V(pdd2, 'ProjectCommercialSpacePercent', PJ.commercialPct); V(pdd2, 'ProjectCompletedIndicator', yn(PJ.projComplete));
      V(pdd2, 'ProjectDwellingUnitCount', PJ.unitsTotal); V(pdd2, 'ProjectDwellingUnitsForSaleCount', PJ.unitsForSale); V(pdd2, 'ProjectDwellingUnitsRentedCount', PJ.unitsRented); if (PJ.rentedEst) V(pdd2, 'ProjectDwellingUnitsRentedEstimateDescription', PJ.rentedEstWhy); V(pdd2, 'ProjectDwellingUnitsRentedEstimateIndicator', yn(PJ.rentedEst)); V(pdd2, 'ProjectDwellingUnitsSoldCount', PJ.unitsSold);
      V(pdd2, 'ProjectLegalStructureType', d.property.legal); V(pdd2, 'ProjectName', PJ.projName); if (PJ.projComplete === false) V(pdd2, 'SubjectBuildingCompletedIndicator', yn(PJ.subjBldgComplete)); }
    V(X(PR, 'PROJECT_DEVELOPER'), 'ProjectDeveloperOrSponsorControlsProjectManagementIndicator', yn(PJ.devControl));
    if (isProj) { const fi2 = X(PR, 'PROJECT_FINANCIAL_INFORMATION'); if (isCoop) { V(fi2, 'ProjectBlanketFinancingIndicator', yn(PJ.blanket)); V(fi2, 'ProjectTotalSharesIssuedAndOutstandingCount', PJ.sharesTotal); V(fi2, 'SingleEntityGreatestNumberOfSharesCount', PJ.singleShares); } else V(fi2, 'SingleEntityGreatestNumberOfUnitsCount', PJ.singleUnits); }
  }
  const PA = X(P, 'PROPERTY_AMENITY'); const cats = X(PA, 'AMENITY_CATEGORIES');
  ['OutdoorAccessories', 'OutdoorLiving', 'WaterFeatures', 'WholeHome', 'Miscellaneous'].forEach(cn => {
    const items = amen.filter(x => (x.cat || CAT[x.type]) === cn); if (!items.length) return;
    const ac = X(cats, 'AMENITY_CATEGORY'); const as = X(ac, 'AMENITIES');
    items.forEach(it => { const am = X(as, 'AMENITY'); const ad2 = X(am, 'AMENITY_DETAIL'); V(ad2, 'AmenityAreaMeasure', it.area, SQFT); V(ad2, 'AmenityCount', it.count);
      const UMAT = new Set(UAD.AmenityMaterialType.map(x => x[0])); V(ad2, 'AmenityMaterialType', it.mat && UMAT.has(it.mat) ? it.mat : undefined);
      V(ad2, 'AmenityType', it.type); if (it.type === 'Other') V(ad2, 'AmenityTypeOtherDescription', (it.other || 'Other').slice(0, 33));
      imagesInto(am, it.photos || []); if ((it.pool || []).length) { const sp = X(am, 'SWIMMING_POOL_FEATURES'); it.pool.forEach(f => V(X(sp, 'SWIMMING_POOL_FEATURE'), 'SwimmingPoolFeatureType', f)); } });
    V(X(ac, 'AMENITY_CATEGORY_DETAIL'), 'AmenityCategoryType', cn);
  });

  // PROPERTY_DEFECT
  const PD = X(P, 'PROPERTY_DEFECT'); const DS = X(PD, 'DEFECTS'); const UDC = new Set(UAD.DefectComponentLabelType.map(x => x[0]));
  const compMap = { 'Exterior Walls and Trim': 'ExteriorWallsAndTrim', 'Roof': 'Roof', 'Foundation': 'Foundation', 'Windows': 'Windows', 'Mechanical System': 'MechanicalSystem', 'Flooring': 'Flooring', 'Walls and Ceiling': 'WallsAndCeiling', 'Interior Walls': 'WallsAndCeiling', 'Interior Ceilings': 'WallsAndCeiling' };
  Lx.defects.forEach((df, i) => {
    const de = X(DS, 'DEFECT', { 'xlink:label': 'DEFECT_' + (i + 1) }); const dd = X(de, 'DEFECT_DETAIL');
    const comp = compMap[df.component]; V(dd, 'DefectComponentLabelType', comp || 'Other'); if (!comp) V(dd, 'DefectComponentLabelTypeOtherDescription', (df.component || 'Other').slice(0, 33));
    V(dd, 'DefectItemAffectsSoundnessStructuralIntegrityIndicator', yn(df.struct));
    V(dd, 'DefectItemDescription', [df.desc, (df.obs || []).length ? '(' + df.obs.join(', ') + ')' : ''].filter(Boolean).join(' ').slice(0, 520));
    V(dd, 'DefectItemEstimatedCostToRepairAmount', df.cost);
    const loc = { 'Full Bathroom': 'FullBathroom', 'Half Bathroom': 'HalfBathroom', 'Kitchen': 'Kitchen' }[df.component]; V(dd, 'DefectItemLocationType', loc || 'Other'); if (!loc) V(dd, 'DefectItemLocationTypeOtherDescription', (df.where || df.component || '').slice(0, 31));
    V(dd, 'DefectItemRecommendedActionType', df.action);
    imagesInto(de, take(p => p.list === 'defects' && p.item === df.id));
  });
  if (Lx.defects.length) { const sm2 = X(PD, 'PROPERTY_DEFECT_SUMMARY'); const tot = Lx.defects.reduce((t, x) => t + (+x.cost || 0), 0); V(sm2, 'CostToRepairType', tot ? 'Itemized' : undefined); V(sm2, 'DefectCostToRepairTotalAmount', tot || undefined); }

  // PROPERTY_DETAIL
  const pdt = X(P, 'PROPERTY_DETAIL');
  V(pdt, 'AccessoryDwellingUnitTotalCount', Lx.adus.length); V(pdt, 'AttachmentType', d.property.attach); V(pdt, 'DwellingCount', 1);
  V(pdt, 'FunctionalIssueDescription', getC('functional'));
  if (isCoop) V(pdt, 'CooperativeProprietaryLeaseExpirationDate', PJ.leaseExp);
  V(pdt, 'HomeownerResponsibleForExteriorMaintenanceIndicator', yn(d.property.hoExt)); V(pdt, 'LivingUnitExcludingADUCount', d.property.units);
  V(pdt, 'NativeAmericanLandsIndicator', yn(d.property.native)); V(pdt, 'NewConstructionIndicator', yn(d.property.newCon));
  V(pdt, 'OverallConditionRatingCode', d.condition.oc); V(pdt, 'OverallQualityRatingCode', d.condition.oq);
  const xfers = priorTransfers(ins); if (xfers) V(pdt, 'PriorSalesOrTransfersIndicator', String(xfers.length > 0));
  V(pdt, 'PropertyAmenityExistsIndicator', String(amen.length > 0)); if (!isProj || IS_CONDO(ins)) V(pdt, 'PropertyEstateType', d.property.estate); if (isCoop) V(pdt, 'PropertyCooperativeSharesCount', PJ.sharesUnit); V(pdt, 'PropertyInProjectIndicator', yn(d.property.project)); if (isCoop && PJ.blanket && PJ.sharesTotal && PJ.sharesUnit) V(pdt, 'ProRataSharePercent', (PJ.sharesUnit / PJ.sharesTotal * 100).toFixed(4)); V(pdt, 'PUDIndicator', yn(d.property.pud));
  V(pdt, 'SubjectPropertyAmenitiesDefectsExistIndicator', yn(d.amenities.amenDefects)); V(pdt, 'VehicleStorageDefectsExistIndicator', yn(d.garage.vsDefects));
  { const pt = X(X(P, 'PROPERTY_TAXES'), 'PROPERTY_TAX'); const ptd = X(pt, 'PROPERTY_TAX_DETAIL'); if (isHoa) V(ptd, 'PropertyTaxAbatementsOrExemptionsIndicator', yn(PJ.taxAbate)); V(ptd, 'SpecialTaxAssessmentsIndicator', yn(d.property.specialTax));
    if (isHoa && PJ.taxAbate && (PJ.taxAbAmt || PJ.taxAbExp)) { const te = X(X(pt, 'PROPERTY_TAX_EXEMPTIONS'), 'PROPERTY_TAX_EXEMPTION'); V(te, 'TaxAbatementsOrExemptionsAnnualAmount', PJ.taxAbAmt); V(te, 'TaxAbatementsOrExemptionsExpirationDate', PJ.taxAbExp); } }
  if (d.property.siteCommon !== true) { const pus = X(P, 'PROPERTY_USE_SUMMARY'); V(pus, 'NonResidentialUseDescription', d.property.mixed ? d.property.mixedDesc : undefined); V(pus, 'PropertyMixedUsageIndicator', yn(d.property.mixed)); }

  // SITE
  if (xfers && xfers.length) { const SH = X(P, 'SALES_HISTORIES'); xfers.forEach(x => { const h = X(SH, 'SALES_HISTORY');
    if (!x.amount) { V(h, 'OwnershipTransferAmountNotAvailableReasonType', 'NotDisclosed'); }
    V(h, 'OwnershipTransferDate', x.iso); if (x.amount) V(h, 'OwnershipTransferTransactionAmount', x.amount); V(h, 'OwnershipTransferTransactionType', x.type); if (x.type === 'Sale') V(h, 'SaleType', x.saleType); }); }
  const SI = X(P, 'SITE');
  const hzs = X(SI, 'HAZARD_ZONES'); (d.site.hazard || []).forEach(h => { const e = X(hzs, 'HAZARD_ZONE'); if (['None', 'FEMASpecialFloodHazardArea'].includes(h)) V(e, 'HazardZoneType', h); else { V(e, 'HazardZoneType', 'Other'); V(e, 'HazardZoneTypeOtherDescription', (h === 'Other' ? d.site.hazardOther || 'Other' : h).slice(0, 33)); } });
  const pa = X(SI, 'PROPERTY_ACCESS'); const ast = X(X(pa, 'ACCESS_STREETS'), 'ACCESS_STREET'); V(ast, 'ImprovedSurfaceMaterialType', d.street.streetSurface); V(ast, 'StreetAccessType', d.street.streetType);
  const pad = X(pa, 'PROPERTY_ACCESS_DETAIL'); V(pad, 'PropertyAccessDescription', d.street.accessDesc || (d.street.accessTypical === false ? getC('accessDesc') : undefined)); V(pad, 'PropertyAccessTypicalToMarketIndicator', yn(d.street.accessTypical)); V(pad, 'PropertyPrimaryEntryExitMethodType', d.street.primaryAccess);
  const sdt = X(SI, 'SITE_DETAIL'); V(sdt, 'BroadbandInternetAvailableIndicator', yn(d.site.broadband)); V(sdt, 'LandOwnedInCommonIndicator', yn(d.property.siteCommon)); V(sdt, 'SiteDefectsExistIndicator', yn(d.site.siteDefects));
  const sfs = X(SI, 'SITE_FEATURES'); let sfn = 0;
  (d.site.siteFeat || []).forEach(t => { const f = X(sfs, 'SITE_FEATURE', { 'xlink:label': 'SITE_FEATURE_' + (++sfn) }); const fd = X(f, 'SITE_FEATURE_DETAIL'); if (t !== 'None') V(fd, 'SiteFeatureDescription', d.site.siteFeatDesc); V(fd, 'SiteFeatureType', t); if (t !== 'None') V(fd, 'ValueMarketabilityImpactType', d.site.siteFeatImpact);
    if (t === 'Topography') { const tp = X(f, 'TOPOGRAPHIES'); (d.site.topo || []).forEach(x => V(X(tp, 'TOPOGRAPHY'), 'TopographyType', x)); } });
  if (!(d.site.siteFeat || []).includes('Topography') && (d.site.topo || []).length) { const f = X(sfs, 'SITE_FEATURE', { 'xlink:label': 'SITE_FEATURE_' + (++sfn) }); const fd = X(f, 'SITE_FEATURE_DETAIL'); V(fd, 'SiteFeatureType', 'Topography'); V(fd, 'ValueMarketabilityImpactType', 'Neutral'); const tp = X(f, 'TOPOGRAPHIES'); d.site.topo.forEach(x => V(X(tp, 'TOPOGRAPHY'), 'TopographyType', x)); }
  const sis = X(SI, 'SITE_INFLUENCES');
  // (lot acreage no longer written as a site influence; usable area goes on the grid's Usable Lot Area/Utility row)
  (d.site.influences || []).forEach((t, i) => { const si = X(sis, 'SITE_INFLUENCE', { 'xlink:label': 'SITE_INFLUENCE_' + (i + 1) });
    if (t === 'BodyOfWater') { const bw = X(X(si, 'BODIES_OF_WATER'), 'BODY_OF_WATER'); V(bw, 'BodyOfWaterType', d.site.water); V(bw, 'PrivateAccessIndicator', yn(d.site.waterPrivate)); V(bw, 'WaterAccessDepthType', d.site.waterDepth); V(bw, 'WaterAccessRightType', d.site.waterRights); }
    const sd2 = X(si, 'SITE_INFLUENCE_DETAIL'); V(sd2, 'SiteInfluenceDescription', d.site.inflDesc); V(sd2, 'SiteInfluenceProximityType', d.site.inflProx); V(sd2, 'SiteInfluenceType', t); V(sd2, 'ValueMarketabilityImpactType', d.site.inflImpact); });
  const pc = d.property.crs || {}; const ssl = X(SI, 'SITE_SIZE_LAYOUT'); if (d.property.siteCommon !== true) V(ssl, 'LotSizeAreaMeasure', pc.lotSf, SQFT);
  const util = X(SI, 'SITE_UTILITIES');
  const U2 = (type, own, svc) => { if (!own || own === 'None') return; const owners = own === 'Both' ? ['Public', 'NonPublic'] : [own]; owners.forEach(o => { const su = X(util, 'SITE_UTILITY'); const det = X(su, 'SITE_UTILITY_DETAIL'); if (o === 'NonPublic') { V(det, 'SiteUtilityDescription', d.site.utilDesc); } V(det, 'SiteUtilityOwnershipType', o); V(det, 'UtilityType', type); if (o === 'NonPublic') V(det, 'ValueMarketabilityImpactType', d.site.utilImpact); if (o === 'NonPublic' && svc) { const sv = X(X(su, 'SITE_UTILITY_SERVICES'), 'SITE_UTILITY_SERVICE'); V(sv, svc[0], svc[1]); } }); };
  U2('Electricity', d.site.elec); U2('Gas', d.site.gas); U2('Water', d.site.waterUtil, ['WaterSourceType', d.site.waterSrc]);
  U2('SanitarySewer', d.site.sewer, ['SewerSystemType', ['Septic', 'Cesspool'].includes(d.site.sewerType) ? d.site.sewerType : (d.site.sewerType ? 'Other' : undefined)]);
  const sv = X(SI, 'SITE_VIEWS'); (d.site.view || []).forEach((t, i) => { const v = X(sv, 'SITE_VIEW', { 'xlink:label': 'SITE_VIEW_' + (i + 1) }); V(v, 'ValueMarketabilityImpactType', d.site.viewImpact); V(v, 'ViewPrimaryIndicator', String(d.site.viewPrimary ? t === d.site.viewPrimary : i === 0)); V(v, 'ViewRangeType', d.site.viewRange); if (UAD_VIEW.has(t)) V(v, 'ViewType', t); else { V(v, 'ViewType', 'Other'); V(v, 'ViewTypeOtherDescription', t.slice(0, 33)); } });
  if (d.site.zoneCode || d.site.zoneComp) { const zd = X(X(SI, 'SITE_ZONING'), 'SITE_ZONING_DETAIL'); V(zd, 'SiteZoningClassificationDescription', d.site.zoneDesc); V(zd, 'SiteZoningClassificationIdentifier', d.site.zoneCode); V(zd, 'SiteZoningComplianceType', d.site.zoneComp); }

  // VALUATION_REPORT commentaries
  const VR = X(va, 'VALUATION_REPORT'); const VC = X(VR, 'VALUATION_COMMENTARIES');
  [['siteFeatures', 'SiteFeatures'], ['siteInfluence', 'SiteInfluences'], ['view', 'SiteViews'], ['disaster', 'DisasterMitigation'], ['energy', 'EnergyEfficientAndGreenFeatures'], ['vehicle', 'VehicleStorage'], ['amenities', 'SubjectPropertyAmenities'], ['qc', 'OverallQualityAndCondition']].forEach(([id, cat]) => {
    const t = getC(id); if (!t) return; const c = X(VC, 'VALUATION_COMMENTARY'); V(c, 'ValuationAnalysisCategoryType', cat); V(c, 'ValuationCommentText', t);
  });
  { const t = getC('assignment'); if (t) { const c = X(VC, 'VALUATION_COMMENTARY'); V(c, 'ValuationAnalysisCategoryType', 'Assignment'); V(c, 'ValuationCommentText', t); } }
  if (isHoa) {
    const pc3 = (cat, imp, cmt) => { if (!imp && !cmt) return; const c = X(VC, 'VALUATION_COMMENTARY'); V(c, 'ValuationAnalysisCategoryType', cat); V(c, 'ValuationCommentText', cmt ? String(cmt).slice(0, 1000) : undefined); V(c, 'ValueMarketabilityImpactType', imp); };
    if (PJ.devControl) pc3('ProjectDeveloperOrSponsorControlsProjectManagement', PJ.impDev, PJ.cmtDev);
    if (isProj && PJ.projComplete === false) pc3('IncompleteProject', PJ.impInc, PJ.cmtInc);
    if (isProj && PJ.converted) pc3('ProjectConversion', PJ.impConv, PJ.cmtConv);
    if (isProj) pc3(isCoop ? 'SingleEntityGreatestNumberOfSharesOwned' : 'SingleEntityGreatestNumberOfUnitsOwned', PJ.impSingle, PJ.cmtSingle);
    if (isProj && PJ.commercial) pc3('ProjectCommercialSpace', PJ.impComm, PJ.cmtComm);
    if (PJ.legalAction) pc3('ProjectLegalAction', PJ.impLegal, PJ.cmtLegal);
    if (isProj && PJ.transferFee) pc3('TransferFeeAttributedToSubjectProperty', PJ.impFee, PJ.cmtFee);
    if (['Existing', 'Proposed'].includes(PJ.specAssess)) pc3('ProjectSpecialAssessmentsAttributedToSubjectProperty', PJ.impSpec, PJ.cmtSpec);
    if (PJ.taxAbate) pc3('PropertyTaxAbatementsOrExemptions', PJ.impTax, PJ.cmtTax);
    if (PJ.projFactors) pc3('ProjectFactors', undefined, PJ.projFactors);
    const gp = getC('project'); if (gp) { const c = X(VC, 'VALUATION_COMMENTARY'); V(c, 'ValuationAnalysisCategoryType', 'Project'); V(c, 'ValuationCommentText', gp); }
  }
  if ((d.condition.valCond || []).length) { const vcs = X(X(X(VR, 'VALUATION_RECONCILIATION'), 'VALUATION_RECONCILIATION_SUMMARY'), 'VALUATION_CONDITIONS'); (d.condition.valCond.includes('AsIs') ? ['AsIs'] : d.condition.valCond).forEach(v => V(X(vcs, 'VALUATION_CONDITION'), 'PropertyValuationConditionalConclusionType', v)); }
  V(X(X(VR, 'VALUATION_SOFTWARE_SYSTEMS'), 'VALUATION_SOFTWARE_SYSTEM'), 'ValuationSoftwareProductName', 'UAD Field Inspection (iPad)');

  take(() => true).forEach(p => push(p, 'SupplementalExhibit'));   // last: anything still not placed

  // DOCUMENT_CLASSIFICATION
  const dc = X(doc, 'DOCUMENT_CLASSIFICATION'); V(X(X(dc, 'DOCUMENT_CLASSES'), 'DOCUMENT_CLASS'), 'DocumentType', 'AppraisalReport');
  const dcd = X(dc, 'DOCUMENT_CLASSIFICATION_DETAIL'); V(dcd, 'DocumentFormIssuingEntityNameType', 'FNM_FRE'); V(dcd, 'DocumentFormIssuingEntityVersionIdentifier', 'September 2024');

  return '<?xml version="1.0" encoding="UTF-8"?>\n<!--Subject inspection data exported by UAD Field Inspection for import into Appraise-It Pro (Home > Import Forms).-->\n' + xmlOut(root);
}
function aduComment(ins, a, i) {
  const t = COMMENT_TARGETS.find(x => x.id === 'adu');
  const all = GEN.adu({ ...ins, lists: { ...ins.lists, adus: [a] } }).filter(Boolean).map(x => x.t).join(' ');
  return all.slice(0, t.lim) || undefined;
}

/* Site size in acres (CRS lot size, else County acreage) */
/* ---- areas from the sketch page (ins.sketch.totals) ---- */
const SK_LV = { LevelOne: 'L1', LevelTwo: 'L2', LevelThree: 'L3', LevelFour: 'L4', LevelFive: 'L5', LevelSix: 'L6', LevelSeven: 'L7', LevelEight: 'L8', LevelNine: 'L9', LevelTen: 'L10', BelowGradeOne: 'B1', BelowGradeTwo: 'B2', BelowGradeThree: 'B3', BelowGradeFour: 'B4', BelowGradeFive: 'B5' };
function skUnitArea(ins) { const T = ins.sketch && ins.sketch.totals; if (!T || !ins.sketch.areaCount) return {}; return { agFin: T.agFin, agNon: T.agNon, agUnfin: T.agUnf, bgFin: T.bgFin, bgNon: T.bgNon, bgUnfin: T.bgUnf }; }
function skLevelArea(ins, uadLevel) { const T = ins.sketch && ins.sketch.totals; const L = T && T.levels && T.levels[SK_LV[uadLevel]]; if (!L) return {}; return { finSf: (L.fin || 0) + (L.non || 0), unfSf: L.unf || 0 }; }
function skGarage(ins, carport) { const T = ins.sketch && ins.sketch.totals; if (!T || !(T.gar || []).length) return undefined; const g = T.gar.filter(x => /carport/i.test(x.name) === carport); return g.length ? g.reduce((t, x) => t + x.sf, 0) : undefined; }
function acresOf(ins) { const c = ins.data.property.crs || {}, P = ins.data.property.permits || {}; const sf = +c.lotSf; if (sf) return (sf / 43560).toFixed(2); if (c.acres) return Number(c.acres).toFixed(2); return ''; }
/* Transfers of the subject within 3 years before the inspection date, from the CRS report (null when no CRS) */
function priorTransfers(ins) {
  const c = ins.data.property.crs; if (!c) return null;
  const eff = new Date(ins.data.property.inspDate || Date.now()); const lim = new Date(eff); lim.setFullYear(lim.getFullYear() - 3);
  return (c.sales || []).map(s => { const dt = new Date(s.date); if (isNaN(dt) || dt < lim || dt > eff) return null;
    const amount = s.amount ? Number(String(s.amount).replace(/[^\d]/g, '')) : 0; const inst = s.instrument || '';
    const deedOnly = !amount || /intrafamily|quit ?claim|affidavit|trustee|transfer|gift|interspousal/i.test(inst) && !amount;
    const type = deedOnly ? 'DeedTransferOnly' : 'Sale';
    const saleType = /foreclos|trustee'?s? deed/i.test(inst) ? 'ForeclosureSale' : /intrafamily|related/i.test(inst) ? 'SaleBetweenRelatedParties' : 'TypicallyMotivated';
    return { iso: dt.toISOString().slice(0, 10), date: s.date, amount, type, saleType, inst, buyer: s.buyer, seller: s.seller, doc: s.doc }; }).filter(Boolean);
}

/* ---------------- Export actions ---------------- */
async function photoEntries(ins, names, prefix) {
  const out = [];
  for (const p of ins.photos) { const rec = await DB.get('photos', p.id); if (rec) out.push({ name: prefix + names.get(p.id), data: rec.blob }); }
  return out;
}
async function doExport(kind, btn) {
  const ins = app.ins; const old = btn.textContent; btn.disabled = true; btn.textContent = 'Building…';
  try {
    const names = photoFileNames(ins); const base = safeName(insTitle(ins) + ' ' + (ins.data.property.addr || ''));
    let blob, fname;
    if (kind === 'workfile') {
      const sNames = sfrepNames(names);
      const sfrepPhotos = ins.photos.filter(p => !p.extra || p.toReport);
      const entries = [
        { name: 'Inspection Notes.html', data: notesHTML(ins, names) },
        { name: 'inspection-backup.json', data: JSON.stringify({ app: 'uad36-inspect', version: 1, inspection: ins }) },
        ...(await photoEntries(ins, names, 'Photos/')),
        { name: 'SFREP/' + base + '.xml', data: buildMISMO(ins, sNames) },
      ];
      for (const p of sfrepPhotos) { const rec = await DB.get('photos', p.id); if (rec) entries.push({ name: 'SFREP/Images/' + sNames.get(p.id), data: rec.blob }); }
      const skp = ins.photos.filter(p => p.sec === 'interior' && p.field === 'sketchImg').sort((a, b) => a.ts - b.ts); const pdfPages = [];
      for (const p of skp) { const rec = await DB.get('photos', p.id); if (rec && rec.blob && p.w && p.h) pdfPages.push({ bytes: new Uint8Array(await rec.blob.arrayBuffer()), w: p.w, h: p.h }); }
      if (pdfPages.length) entries.push({ name: 'Sketch.pdf', data: makePdf(pdfPages) });
      blob = await makeZip(entries); fname = base + ' – Workfile.zip';
    } else {
      const sNames = sfrepNames(names); const entries = [{ name: base + '.xml', data: buildMISMO(ins, sNames) }];
      for (const p of ins.photos.filter(p => !p.extra || p.toReport)) { const rec = await DB.get('photos', p.id); if (rec) entries.push({ name: 'Images/' + sNames.get(p.id), data: rec.blob }); }
      blob = await makeZip(entries); fname = base + ' – SFREP.zip';
    }
    const r = await deliver(blob, fname);
    if (r === 'shared' || r === 'downloaded') { ins.exported = Date.now(); save(); toast(r === 'shared' ? 'Exported' : 'Downloaded ' + fname); }
    else if (r === 'blocked') toast('This preview cannot save files. Use the installed app to export.');
  } catch (e) { console.error(e); toast('Export failed: ' + (e.message || e)); }
  btn.disabled = false; btn.textContent = old;
}

async function restoreBackup(file) {
  if (!file) return;
  try {
    const files = await readZip(file); const json = files.get('inspection-backup.json');
    if (!json) throw new Error('This zip has no inspection backup. Choose a Workfile package exported by this app.');
    const data = JSON.parse(new TextDecoder().decode(json)); const ins = normalize(data.inspection);
    const names = photoFileNames(ins); let n = 0;
    if (await DB.get('inspections', ins.id)) { ins.id = uid(); ins.data.property.fileName = insTitle(ins) + ' (restored copy)'; }
    for (const p of ins.photos) {
      const bytes = files.get('Photos/' + names.get(p.id)); if (!bytes) continue;
      const blob = new Blob([bytes], { type: 'image/jpeg' }); const { thumb } = await processImage(new File([blob], 'p.jpg', { type: 'image/jpeg' }));
      if (await DB.get('photos', p.id)) p.id = uid();
      await DB.put('photos', { id: p.id, insId: ins.id, blob, thumb }); n++;
    }
    await DB.put('inspections', ins); toast(`Restored with ${n} photos`); openInspection(ins.id);
  } catch (e) { toast(e.message || 'Could not restore that file'); }
}

function permitNotes(ins) {
  const P = ins.data.property.permits; if (!P) return '';
  const items = permitItems(P);
  return `<section><h2>County permit history by parcel</h2><p class="meta">From ${esc(P.file || 'County report')}, loaded ${esc(P.loadedAt || '')}. Dates are application (file) dates.</p>
<table>${P.zoning ? `<tr><th>Zoning</th><td>${esc(P.zoning)}</td></tr>` : ''}<tr><th>Parcel holds</th><td>${P.holds.length ? esc(P.holds.join(' / ')) : 'None shown'}</td></tr></table>
${items.length ? `<h3>Permits and cases</h3><table>${items.map(i => `<tr><th>${esc(i.date)}</th><td>${esc(i.what)} · ${esc(i.dept)}${i.status ? ' · ' + esc(i.status) : ''} · ${esc(i.num)}</td></tr>`).join('')}</table>` : ''}</section>`;
}
function crsNotes(ins) {
  const c = ins.data.property.crs; if (!c) return '';
  const r = (l, v) => v ? `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>` : '';
  return `<section><h2>Public record (CRS Data, ${esc(c.loadedAt || '')})</h2><table>${r('Address', [c.addr, c.cityLine].join(', '))}${r('APN', c.apn)}${r('Owner of record', c.owner)}${r('Land use', c.landUse)}${r('Year built (assessor / MLS)', [c.yearBuilt, c.yearBuiltMls].filter(Boolean).join(' / '))}${r('Beds / baths (assessor)', [c.beds, c.baths].filter(Boolean).join(' / '))}${r('Public record sq. ft.', c.sqft)}${r('Lot size', [c.lotSf && c.lotSf + ' sq. ft.', c.acres && c.acres + ' ac.'].filter(Boolean).join(' / '))}${r('Latitude / longitude', c.lat ? c.lat + ', ' + c.lng : '')}${r('Census tract', c.census)}${r('FEMA flood zone', [c.fema, c.femaRisk, c.femaPanel, c.femaDate].filter(Boolean).join(' · '))}</table>
  ${(c.sales || []).length ? `<h3>Sales / transfer history</h3><table><tr><th>Date</th><td><b>Amount · Instrument · Buyer · Doc #</b></td></tr>${c.sales.map(x => `<tr><th>${esc(x.date)}</th><td>${esc([x.amount, x.instrument, x.buyer, x.doc].filter(Boolean).join(' · '))}</td></tr>`).join('')}</table>` : ''}
  ${(c.loans || []).length ? `<h3>Mortgage history</h3><table>${c.loans.map(x => `<tr><th>${esc(x.date)}</th><td>${esc([x.amount, x.lender, x.doc].filter(Boolean).join(' · '))}</td></tr>`).join('')}</table>` : ''}</section>`;
}
