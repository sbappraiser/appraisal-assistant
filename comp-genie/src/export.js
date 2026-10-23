/* =====================================================================
   Exports: SFREP comps file (MISMO 3.6 / UAD, following Fannie Mae's
   Appendix D-1 sample), comps table (CSV), comp photos.
   ===================================================================== */
class XN { constructor(tag, attrs) { this.tag = tag; this.attrs = attrs || {}; this.kids = []; this.text = null; } }
function X(parent, tag, attrs) { const n = new XN(tag, attrs); if (parent) parent.kids.push(n); return n; }
function XV(parent, tag, value, attrs) { if (blank(value)) return null; const n = X(parent, tag, attrs); n.text = String(value); return n; }
function xmlOut(n, ind = '') {
  const a = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  if (n.text !== null) return `${ind}<${n.tag}${a}>${esc(n.text)}</${n.tag}>\n`;
  if (!n.kids.length) return n.selfClose ? `${ind}<${n.tag}${a}/>\n` : '';
  const inner = n.kids.map(k => xmlOut(k, ind + '\t')).join('');
  return inner ? `${ind}<${n.tag}${a}>\n${inner}${ind}</${n.tag}>\n` : '';
}
const SQFT = { AreaUnitOfMeasureType: 'SquareFeet' };
const has = (s, re) => re.test(String(s || ''));

/* ---- value maps to UAD 3.6 enumerations ---- */
function uadStatus(s) { s = String(s || ''); return /Closed|Sold|Settled/i.test(s) ? 'SettledSale' : /Pending|Under Contract|Contingent/i.test(s) ? 'Pending' : /Active/i.test(s) ? 'Active' : s ? 'OffMarket' : ''; }   // also her ▾ pick words (Settled sale, Off market)
function uadStructure(s) { s = String(s || ''); return /town|row/i.test(s) ? 'RowhouseTownhouse' : /semi/i.test(s) ? 'SemiDetached' : /high/i.test(s) ? 'Highrise' : /mid/i.test(s) ? 'Midrise' : /low|garden|flat/i.test(s) ? 'Lowrise' : s ? 'Other' : null; }
function uadProjAmen(s) { const out = []; const add = (t, other) => { if (!out.some(x => x.t === t && x.other === other)) out.push({ t, other }); };
  String(s || '').split(/[;,]/).map(x => x.trim()).filter(Boolean).forEach(x => { const M = [[/spa|hot ?tub|jacuzzi/i, 'IngroundSpa'], [/pool/i, 'IngroundPool'], [/tennis|pickle|sport|court/i, 'SportsCourt'], [/club ?house/i, 'Clubhouse'], [/gym|fitness|exercise/i, 'FitnessArea'], [/gate/i, 'GatedCommunity'], [/elevator/i, 'Elevator'], [/laundry/i, 'SharedLaundryFacilities'], [/play/i, 'Playground'], [/storage/i, 'UnitStorage'], [/sauna/i, 'Sauna'], [/beach/i, 'Beach'], [/recreat|rec room/i, 'RecreationArea'], [/ev charg/i, 'ElectricVehicleChargingStation'], [/grounds|landscap/i, 'GroundsMaintenance'], [/trash/i, 'TrashRemoval'], [/^none$/i, 'None']].find(([re]) => re.test(x));
    if (M) add(M[1]); else add('Other', x.slice(0, 33)); }); return out; }
function uadSaleType(s) { if (/^Other\b/.test(String(s || ''))) return 'Other'; if (typeof PICK !== 'undefined' && PICK.xferTerms.opts.some(o => o[0] === s)) return s; return ({ ArmLth: 'TypicallyMotivated', Listing: 'TypicallyMotivated', REO: 'REOSale', Short: 'ShortSale', Estate: 'EstateSale', CrtOrd: 'CourtOrderedNonForeclosureSale', NonArm: 'SaleBetweenRelatedParties', Relo: 'RelocationSale', Trust: 'EstateSale' })[s] || (s ? 'Other' : 'TypicallyMotivated'); }
function uadFinancing(s) {
  s = String(s || ''); if (!s) return {};
  if (/^MLS code/i.test(s)) return {};   // (cash?) = no loan near the sale in the CRS mortgage history – cash (her note Oct 20 2026)   // not confirmed – she types what it was
  if (/cash|no loan/i.test(s)) return { none: true };
  if (/conv/i.test(s)) return { type: 'Conventional' }; if (/FHA/i.test(s)) return { type: 'FHA' }; if (/\bVA\b/i.test(s)) return { type: 'VA' };
  if (/USDA|rural/i.test(s)) return { type: 'USDARuralDevelopment' }; if (/private|seller/i.test(s)) return { type: 'Private' };
  if (/loan:/i.test(s)) return { type: 'Conventional' };
  if (/unknown|^MLS code/i.test(s)) return {};
  return { type: 'Other', other: s.slice(0, 33) };
}
const STYLE_MAP = [[/spanish|hacienda/i, 'Spanish'], [/mediterr/i, 'Mediterranean'], [/mid.?century|modern/i, 'Modern'], [/contemp/i, 'Contemporary'], [/ranch/i, 'Ranch'], [/craftsman/i, 'Craftsman'], [/cottage/i, 'Cottage'], [/bungalow/i, 'Bungalow'], [/cape ?cod/i, 'CapeCod'], [/colonial/i, 'Colonial'], [/tudor/i, 'Tudor'], [/victorian/i, 'Victorian'], [/farm/i, 'Farmhouse'], [/traditional/i, 'Traditional'], [/french|normand/i, 'Other'], [/adobe|southwest/i, 'Southwest'], [/georgian/i, 'Georgian']];
function uadStyle(s) { s = String(s || ''); if (!s) return null; { const ex = typeof PICK !== 'undefined' ? pkParse(PICK.style, s.split(';')[0]) : null; if (ex && ex.ok && ex.vals[0]) return { t: ex.vals[0], other: ex.vals[0] === 'Other' ? ex.other.slice(0, 33) : '' }; } for (const [re, t] of STYLE_MAP) if (re.test(s)) return { t, other: t === 'Other' ? s.split(';')[0].slice(0, 33) : '' }; return { t: 'Other', other: s.split(';')[0].slice(0, 33) }; }
function uadHeat(s) {
  s = String(s || '').split('/')[0]; const out = [];
  if (/forced|FWA|FAU/i.test(s)) out.push('ForcedWarmAir'); if (/radiant|rdnt/i.test(s)) out.push('Radiant'); if (/baseboard|HWBB/i.test(s)) out.push('Baseboard');
  if (/gravity|floor furnace/i.test(s)) out.push('GravityAir'); if (/ductless|mini/i.test(s)) out.push('MiniSplit'); if (/stove/i.test(s)) out.push('Stove');
  if (/wall/i.test(s) && !out.length) out.push('Other');
  return out;
}
function uadFuel(s) { return /propane/i.test(s) ? 'Propane' : /electric|elect|\belec\b|heat ?pu?mp|htpmp|heat pmp/i.test(s) ? 'Electric' : /gas/i.test(s) ? 'NaturalGas' : ''; }
function uadCool(s) {
  const t = String(s || ''); const part = t.includes('/') ? t.split('/').slice(1).join('/') : t;
  if (/no cooling|none/i.test(part) && !/central|C\/Air|A\/C/i.test(part)) return { exists: false };
  if (/central|C\/Air|A\/C|heat pump/i.test(t)) return { exists: true, type: 'Centralized' };
  if (/window|ductless|mini|wall unit|individual/i.test(t)) return { exists: true, type: 'Individual' };
  return null;
}
const VIEW_MAP = [[/ocean|water|coast|harbor|beach|island/i, 'Ocean'], [/mountain/i, 'Mountain'], [/skyline|city(?! street)/i, 'Skyline'], [/city street/i, 'CityStreet'], [/golf/i, 'GolfCourse'], [/wood/i, 'Woods'], [/park|greenbelt/i, 'Park'], [/pastoral/i, 'Pastoral'], [/canyon|valley/i, 'Valley'], [/lake/i, 'Lake'], [/creek/i, 'Creek'], [/residential|garden|setting/i, 'Residential']];
function uadViews(s) { const out = []; String(s || '').split(/;\s*/).filter(Boolean).forEach(p => { if (/panoramic|partial|filtered|other/i.test(p)) return; const m = VIEW_MAP.find(([re]) => re.test(p)); const t = m ? m[1] : 'Other'; if (!out.some(o => o.t === t)) out.push({ t, other: t === 'Other' ? p.slice(0, 33) : '' }); }); return out; }
/* her water frontage cell, one body of water per "|": "Ocean frontage 60 ft beach", "Lake, no private access", "Creek 120 ft shallow" */
const WF_TYPES = ['Bay', 'Canal', 'Cove', 'Creek', 'Gulf', 'Lake', 'Marsh', 'Ocean', 'Pond', 'Reservoir', 'River', 'Sound'];
const WF_FEATS = [[/beach/i, 'Beach'], [/boat ?lift/i, 'BoatLift'], [/boat ?ramp/i, 'BoatRamp'], [/slip/i, 'BoatSlip'], [/\bdock/i, 'Dock'], [/\bpier/i, 'Pier'], [/rip ?rap/i, 'Riprap'], [/sea ?wall|bulkhead/i, 'SeawallOrBulkhead']];
function wfParse(text) { const t = String(text || '').trim(); if (!t || /^(none|no|n\/a)$/i.test(t)) return [];
  return t.split(/\s*\|\s*/).filter(Boolean).map(p => { const ty = WF_TYPES.find(x => new RegExp('\\b' + x, 'i').test(p)); const ft = (p.match(/(\d[\d,.]*)\s*(?:ft|feet|')/i) || [])[1];
    const priv = !/no private|not private|view only|across|no access|public access only/i.test(p);
    const depth = /non[- ]?navigable/i.test(p) ? 'NonNavigable' : /deep/i.test(p) ? 'DeepWater' : /shallow/i.test(p) ? 'ShallowWater' : null;
    const name = (p.match(/named\s+(.+?)(?=\s+\d|\s+(?:deep|shallow|non|with|beach|dock|pier|frontage|private)\b|,|;|$)/i) || [])[1] || (ty === 'Ocean' ? 'Pacific Ocean' : null);
    return { type: ty || 'Other', other: ty ? '' : p.replace(/\d.*$/, '').trim().slice(0, 33), name, priv, depth, ft: ft ? +ft.replace(/,/g, '') : null, feats: WF_FEATS.filter(([re]) => re.test(p)).map(x => x[1]) }; }); }
const INFL_MAP = [[/busy road|freeway/i, 'BusyRoadway'], [/^residential$/i, 'Residential'], [/waterfront|near water/i, 'BodyOfWater'], [/commercial/i, 'CommercialArea'], [/train/i, 'RailLine'], [/school/i, 'School'], [/park/i, 'Park'], [/golf/i, 'GolfCourse']];
/* one UAD 3.6 site influence, elements in schema (alphabetical) order */
function siXV(d, i, put) { put(d, 'SiteInfluenceProximityType', i.prox || null); put(d, 'SiteInfluenceType', i.type); if (i.type === 'Other') put(d, 'SiteInfluenceTypeOtherDescription', String(i.other || 'Other').slice(0, 45)); put(d, 'ValueMarketabilityImpactType', i.impact || 'Neutral'); }
function funcIssues(t) { t = String(t || '').trim(); if (!t) return []; const out = [];
  t.split(/;|,/).map(x => x.trim()).filter(Boolean).forEach(p => { const ty = /^none/i.test(p) ? 'None' : /ceiling/i.test(p) ? 'CeilingHeight' : /floor ?plan|layout|tandem|access/i.test(p) ? 'FloorPlan' : /non.?conform/i.test(p) ? 'NonConformity' : /over.?improv/i.test(p) ? 'Overimprovement' : /under.?improv/i.test(p) ? 'Underimprovement' : 'Other';
    if (!out.some(o => o.t === ty && ty !== 'Other')) out.push({ t: ty, other: ty === 'Other' ? p.slice(0, 33) : '' }); });
  return out.some(o => o.t !== 'None') ? out.filter(o => o.t !== 'None') : out; }
function uadInfluences(s) { const out = []; String(s || '').split(/;\s*/).filter(Boolean).forEach(p => { const m = INFL_MAP.find(([re]) => re.test(p)); const t = m ? m[1] : 'Other'; if (!out.some(o => o.t === t && t !== 'Other')) out.push({ t, other: t === 'Other' ? p.slice(0, 33) : '' }); }); return out; }
const yes = v => /^(yes|y|true|1)/i.test(String(v || '')) || (typeof v === 'string' && /guest|adu/i.test(v) && !/^none|^no$/i.test(v));

/* MLS roof / exterior words → the UAD 3.6 lists (A-1 RoofMaterialType, WallMaterialType); anything else goes as Other with the MLS word */
function uadRoof(t) { const out = []; String(t || '').split(/;\s*|,\s*/).map(x => x.trim()).filter(Boolean).forEach(x => { const m = [[/compos|comp\b|shingle|asphalt/i, 'Composition'], [/concrete/i, 'Concrete'], [/clay|spanish|mission/i, 'Clay'], [/metal|steel/i, 'Metal'], [/shake|wood/i, 'Wood'], [/slate/i, 'Slate'], [/rock|gravel|tar|built.?up/i, 'TarAndGravel'], [/rubber|membrane|torch/i, 'Rubber'], [/solar shingle/i, 'SolarShingles']].find(([re]) => re.test(x)); const t2 = m ? m[1] : 'Other'; if (!out.some(o => o.t === t2 && t2 !== 'Other')) out.push({ t: t2, o: x.slice(0, 33) }); }); return out.filter(o => o.t !== 'Other' || !/^other$/i.test(o.o)); }
function uadWall(t) { const out = []; String(t || '').split(/;\s*|,\s*/).map(x => x.trim()).filter(Boolean).forEach(x => { const m = [[/stucco/i, 'Stucco'], [/adobe/i, 'Adobe'], [/brick/i, 'Brick'], [/synthetic stone|veneer/i, 'SyntheticStone'], [/stone/i, 'Stone'], [/vinyl/i, 'Vinyl'], [/hardi|cement/i, 'CementBoard'], [/block/i, 'ConcreteBlock'], [/concrete/i, 'PouredConcrete'], [/log/i, 'Log'], [/alum/i, 'Aluminum'], [/steel|metal/i, 'Steel'], [/glass/i, 'Glass'], [/wood|siding|shingle|board/i, 'Wood']].find(([re]) => re.test(x)); const t2 = m ? m[1] : 'Other'; if (!out.some(o => o.t === t2 && t2 !== 'Other')) out.push({ t: t2, o: x.slice(0, 33) }); }); return out.filter(o => o.t !== 'Other' || !/^other$/i.test(o.o)); }
function photoName(c) { return safeName(compTitle(c)).replace(/[^A-Za-z0-9.()-]+/g, '_') + '.jpg'; }

/* ---- one comparable ---- */
function buildCompXML(PROPS, RELS, DSS, c, n, job) {
  const lab = 'PROPERTY_SALESCOMP' + n;
  const P = X(PROPS, 'PROPERTY', { ValuationUseType: 'SalesComparable', 'xlink:label': lab });
  const g = k => V(c, k);
  // ADDRESS
  const ad = X(P, 'ADDRESS'); XV(ad, 'AddressLineText', g('addr')); if (g('unit')) { XV(ad, 'AddressUnitDesignatorType', 'Unit'); XV(ad, 'AddressUnitIdentifier', g('unit')); }
  XV(ad, 'CityName', g('city') || ARCH.zipCity[g('zip')] || ZIP_CITY[String(g('zip') || '').slice(0, 5)] || ''); XV(ad, 'PostalCode', zip9(c)); XV(ad, 'StateCode', 'CA');
  // CAR_STORAGES
  const cs = X(P, 'CAR_STORAGES'); let any = false;
  const VS = c.edit && Array.isArray(c.edit.vs) && c.edit.vs.length ? c.edit.vs : null;   // her ▾ pick rows: every type, with attachment / driveway surface (Oct 20 2026)
  if (VS) VS.forEach(x => { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); if (['Garage', 'Carport'].includes(x.t) && x.a) XV(d, 'CarStorageAttachmentType', x.a); XV(d, 'CarStorageType', x.t); if (x.t === 'Other') XV(d, 'CarStorageTypeOtherDescription', String(x.o || 'Other').slice(0, 45));
    if (['Driveway', 'SharedDriveway'].includes(x.t)) { if (x.s) XV(d, 'ImprovedSurfaceMaterialType', x.s); XV(d, 'TenOrMoreParkingSpacesIndicator', +x.n >= 10 ? 'true' : 'false'); if (+x.n < 10) XV(d, 'ParkingSpacesCount', +x.n); } else XV(d, 'ParkingSpacesCount', +x.n); });
  else if (c.edit && c.edit.vsNone) { any = true; XV(X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'), 'CarStorageType', 'None'); }
  const gar = VS || (c.edit && c.edit.vsNone) ? 0 : num(g('garage')); if (gar) { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); const gt = String(g('garageType') || ''); XV(d, 'CarStorageAttachmentType', /built/i.test(gt) ? 'BuiltIn' : /detach/i.test(gt) ? 'Detached' : /attach/i.test(gt) ? 'Attached' : null); XV(d, 'CarStorageType', 'Garage'); XV(d, 'ParkingSpacesCount', gar); }
  const cp = VS || (c.edit && c.edit.vsNone) ? 0 : num(g('carport')); if (cp) { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); XV(d, 'CarStorageType', 'Carport'); XV(d, 'ParkingSpacesCount', cp); }
  const dw = VS || (c.edit && c.edit.vsNone) ? 0 : num(g('driveway')); if (dw) { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); XV(d, 'CarStorageType', 'Driveway'); XV(d, 'ParkingSpacesCount', dw); XV(d, 'TenOrMoreParkingSpacesIndicator', dw >= 10 ? 'true' : 'false'); }
  if (!any && !VS && gar === 0) XV(X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'), 'CarStorageType', 'None');
  // COMPARABLE: your adjustments from the grid (if any), then the detail
  const CMP = X(P, 'COMPARABLE'); const gt = gridAdjustXML(CMP, c, job, n);
  const cd = X(CMP, 'COMPARABLE_DETAIL'); const px = proximity(c, job);
  if (gt && gt.lines) { XV(cd, 'AdjustedSalesPriceAmount', Math.round(gt.adj)); XV(cd, 'SalePriceNetTotalAdjustmentAmount', Math.round(gt.net)); }
  if (job.grid && job.grid.weights && job.grid.weights[c.id]) XV(cd, 'ComparableWeightType', job.grid.weights[c.id]);
  const price = num(g('salePrice')), list = num(g('listPrice')), gla = num(g('gla')); const status = uadStatus(g('status') || (currentSale(c) || {}).status);
  if (px) XV(cd, 'ComparableToSubjectDirectionType', px.dir);
  if (status === 'Pending') XV(cd, 'ContractAmountUnknownIndicator', price ? 'false' : 'true');
  XV(cd, 'ContractDateUnknownIndicator', isoDate(g('contractDate')).length === 10 ? 'false' : 'true');   /* her Oct 21 import: comp 3 showed Unknown = No with no date – the flag now follows the date actually sent */
  const fin = uadFinancing(g('financing')); if (status === 'SettledSale') { if (fin.type) { XV(cd, 'MortgageType', fin.type); if (fin.other) XV(cd, 'MortgageTypeOtherDescription', fin.other); } if (fin.none || fin.type) XV(cd, 'NoFinancingTransactionIndicator', fin.none ? 'true' : 'false'); }
  if (price && gla) XV(cd, 'PricePerTotalStandardAboveGradeFinishedAreaAmount', Math.round(price / gla));
  XV(cd, 'PropertyOrdinalNumber', n);
  if (px) XV(cd, 'ProximityToSubjectDistanceLinearMeasure', px.mi.toFixed(2), { LinearUnitOfMeasureType: 'Miles' });
  if (status !== 'SettledSale') { const own = num(String((c.edit || {}).grid_stl || '').replace(/[^0-9.]/g, '')); const r = own || (price && list ? price / list * 100 : null); if (r) XV(cd, 'SaleToListPriceRatioPercent', Math.round(+r));   /* A-1: a positive whole number (102 = 102 %) */ }   /* a listing: her anticipated ratio (F-1 22.01.35) */
  cd.kids.sort((a, b) => a.tag.localeCompare(b.tag)); // UAD order is alphabetical inside COMPARABLE_DETAIL
  // ENERGY_EFFICIENCY_AND_GREEN
  const EN = compFacts(c, job).energy; const EP = typeof PICK !== 'undefined' && EN ? pkParse(PICK.energy, String(EN)) : null;   // her ▾ pick (Oct 20 2026): each renewable component with its ownership
  if (EP && EP.ok && EP.vals.length && !EP.vals.every(v => v === 'None')) { const e = X(P, 'ENERGY_EFFICIENCY_AND_GREEN'); const R = EP.vals.filter(v => v !== 'Other' && v !== 'None');
    const d = X(e, 'ENERGY_EFFICIENCY_AND_GREEN_DETAIL'); if (EP.other) XV(d, 'EnergyEfficientAndGreenDescription', EP.other.slice(0, 2500)); const GP = greenParse(EP.other); XV(d, 'EfficiencyRatingExistsIndicator', GP.ratings.length ? 'true' : 'false'); XV(d, 'GreenCertificationExistsIndicator', GP.certs.length ? 'true' : 'false'); XV(d, 'RenewableEnergyComponentExistsIndicator', R.length ? 'true' : 'false');
    if (GP.certs.length) { const GC = X(e, 'GREEN_BUILDING_CERTIFICATIONS'); GP.certs.forEach(g => { const x = X(GC, 'GREEN_BUILDING_CERTIFICATION'); XV(x, 'GreenCertificationLevelName', g.level && g.level.slice(0, 10)); XV(x, 'GreenCertificationName', g.name.slice(0, 30)); }); }   // F-1 22.06.06
    if (GP.ratings.length) { const GR = X(e, 'GREEN_EFFICIENCY_RATINGS'); GP.ratings.forEach(g => { const x = X(GR, 'GREEN_EFFICIENCY_RATING'); XV(x, 'EfficiencyRatingName', g.name.slice(0, 30)); XV(x, 'EfficiencyRatingScoreValue', g.score && String(g.score).slice(0, 10)); }); }   // F-1 22.06.07
    if (R.length) { const RS = X(e, 'RENEWABLE_ENERGY_COMPONENTS'); R.forEach(v => { const r = X(RS, 'RENEWABLE_ENERGY_COMPONENT'); const own = { SolarOwned: 'Owned', SolarLeased: 'Leased', SolarPPA: 'PowerPurchaseAgreement' }[v]; if (own) XV(r, 'RenewableEnergyComponentOwnershipType', own); XV(r, 'RenewableEnergyComponentType', /^Solar/.test(v) ? 'Solar' : v); }); } }
  else if (EP && EP.ok && EP.vals.includes('None')) { const e = X(P, 'ENERGY_EFFICIENCY_AND_GREEN'); const d = X(e, 'ENERGY_EFFICIENCY_AND_GREEN_DETAIL'); XV(d, 'EfficiencyRatingExistsIndicator', 'false'); XV(d, 'GreenCertificationExistsIndicator', 'false'); XV(d, 'RenewableEnergyComponentExistsIndicator', 'false'); }   /* A-1 1800.0106-0108: all three for every comp */
  else { const en = String(g('energy') || ''); if (/solar|photovolt|geotherm|wind\s*(turbine|power|generator|mill)/i.test(en)) { const e = X(P, 'ENERGY_EFFICIENCY_AND_GREEN'); XV(X(e, 'ENERGY_EFFICIENCY_AND_GREEN_DETAIL'), 'RenewableEnergyComponentExistsIndicator', 'true'); XV(X(X(e, 'RENEWABLE_ENERGY_COMPONENTS'), 'RENEWABLE_ENERGY_COMPONENT'), 'RenewableEnergyComponentType', /geotherm/i.test(en) ? 'Geothermal' : /wind\s*(turbine|power|generator|mill)/i.test(en) ? 'WindTurbine' : 'Solar'); } }
  // HAZARD (from CRS flood zone) goes in SITE below
  // IMPROVEMENTS
  const mode = gridMode(job), CF = compFacts(c, job);   /* condo / PUD facts from her grid */
  { const fx = funcIssues(CF.func); if (fx.length) { const FI = X(P, 'FUNCTIONAL_ISSUES'); fx.forEach(f => { const e = X(FI, 'FUNCTIONAL_ISSUE'); XV(e, 'FunctionalIssueType', f.t); if (f.other) XV(e, 'FunctionalIssueTypeOtherDescription', f.other); }); } }   // her Functional utility line
  if (mode !== 'house' && num(CF.hoa)) { const d = X(X(X(X(P, 'HOMEOWNERS_ASSOCIATIONS'), 'HOMEOWNERS_ASSOCIATION'), 'ASSOCIATION_CHARGES'), 'ASSOCIATION_CHARGE'); const dd = X(d, 'ASSOCIATION_CHARGE_DETAIL'); XV(dd, 'AssociationChargeAmount', Math.round(num(CF.hoa))); XV(dd, 'AssociationChargeType', 'AssociationDues'); }
  const IMPS = X(P, 'IMPROVEMENTS'); const imp = X(IMPS, 'IMPROVEMENT'); const idt = X(imp, 'IMPROVEMENT_DETAIL'); const CFx = compFacts(c, job); const cool = CFx.cool && typeof PICK !== 'undefined' && pkParse(PICK.cool, CFx.cool).ok ? (/^none/i.test(CFx.cool) ? { exists: false } : { exists: true, type: pkParse(PICK.cool, CFx.cool).vals[0] }) : uadCool(g('heatCool'));   // her ▾ pick first
  if (cool) XV(idt, 'CoolingSystemExistsIndicator', cool.exists ? 'true' : 'false');
  XV(idt, 'ImprovementType', 'Dwelling'); if (num(g('yearBuilt')) >= 1700) { XV(idt, 'PropertyStructureBuiltYear', g('yearBuilt')); XV(idt, 'PropertyStructureBuiltYearEstimatedIndicator', 'false'); }   // a 0 from the MLS is no year (schema minimum 0001)
  const aduHere = typeof obParse === 'function' ? obParse(CF.adu).items.filter(o => OB_ADU.includes(o.t)).length : 0;   /* a comp with an ADU: its units are named (D-1 SF3 / SF4) */
  const pu = X(X(imp, 'PROPERTY_UNITS'), 'PROPERTY_UNIT', aduHere ? { 'xlink:label': `PROPERTY_UNIT_SalesComp${n}_Primary` } : undefined);
  const ar = X(pu, 'PROPERTY_UNIT_AREA'); const bs = num(g('bsmtSf')), bf = num(g('bsmtFin'));
  XV(ar, 'UnitBelowGradeUnfinishedAreaMeasure', bs && bs > (bf || 0) ? bs - (bf || 0) : (num(CF.bsmtUnf) || 0), SQFT);   /* A-1 1800.0394: always for the dwelling – 0 when there is none (D-1 sends it) */
  XV(ar, 'UnitStandardAboveGradeFinishedAreaMeasure', gla, SQFT); XV(ar, 'UnitStandardBelowGradeFinishedAreaMeasure', bs ? (bf || 0) : (gla ? 0 : null), SQFT);
  const ud = X(pu, 'PROPERTY_UNIT_DETAIL'); XV(ud, 'AccessoryDwellingUnitIndicator', 'false'); XV(ud, 'BedroomCount', g('beds'));
  const stru = uadStructure(CF.structure), isAtt = /attach/i.test(String(g('attach') || '')) && !/detach/i.test(String(g('attach') || ''));
  if (mode === 'condo' && /rise/.test(stru || '') && !blank(CF.unitPos)) XV(ud, 'CornerUnitIndicator', /corner|end/i.test(CF.unitPos) ? 'true' : 'false'); if (mode === 'condo' && !blank(CF.floor)) XV(ud, 'FloorIdentifier', String(CF.floor).slice(0, 10)); XV(ud, 'FullBathroomCount', g('full')); XV(ud, 'HalfBathroomCount', g('half')); if (!blank(CF.levels)) XV(ud, 'LevelCount', CF.levels);
  { const R = compQC(CF); XV(ud, 'InteriorConditionRatingCode', R.intC); XV(ud, 'InteriorQualityRatingCode', R.intQ); if (aduHere) XV(ud, 'UnitIdentifier', `Comp${n} Primary`); }   /* A-1 1800.0157 / .0158: interior Q and C for every comp – her own if typed, else the overall ratings */
  const st = X(imp, 'STRUCTURE'); { const K = typeof PICK !== 'undefined' && CF.constr ? pkParse(PICK.constr, String(CF.constr)) : null; if (K && K.ok && K.vals[0]) { const cm = X(X(st, 'CONSTRUCTION_METHODS'), 'CONSTRUCTION_METHOD'); XV(cm, 'ConstructionMethodType', K.vals[0]); if (K.vals[0] === 'Other') XV(cm, 'ConstructionMethodTypeOtherDescription', (K.other || 'Other').slice(0, 33)); } } const sty = uadStyle(g('style')); if (sty) { const a = X(st, 'ARCHITECTURAL_DESIGN'); XV(a, 'ArchitecturalDesignCategoryType', sty.t); if (sty.other) XV(a, 'ArchitecturalDesignCategoryTypeOtherDescription', sty.other); }
  if (isAtt && stru) { const a = st.kids.find(k => k.tag === 'ARCHITECTURAL_DESIGN') || X(st, 'ARCHITECTURAL_DESIGN'); XV(a, 'StructuralDesignType', stru); }
  /* roof and exterior walls from the MLS (D-1 sends them for every comp) – only what the MLS says, mapped to the 3.6 lists */
  { const roof = uadRoof(g('roof')), wall = uadWall(g('exterior')); if (roof.length || wall.length) { const SC = X(st, 'STRUCTURE_COMPONENTS');
      if (wall.length) { const C = X(SC, 'STRUCTURE_COMPONENT'); const EW = X(C, 'EXTERIOR_WALLS'); wall.forEach(w => { const e = X(EW, 'EXTERIOR_WALL'); XV(e, 'WallMaterialType', w.t); if (w.t === 'Other') XV(e, 'WallMaterialTypeOtherDescription', w.o); }); XV(X(C, 'STRUCTURE_COMPONENT_DETAIL'), 'ImprovementComponentType', 'ExteriorWallsAndTrim'); }
      if (roof.length) { const C = X(SC, 'STRUCTURE_COMPONENT'); const RM = X(X(C, 'ROOF'), 'ROOF_MATERIALS'); roof.forEach(w => { const e = X(RM, 'ROOF_MATERIAL'); XV(e, 'RoofMaterialType', w.t); if (w.t === 'Other') XV(e, 'RoofMaterialTypeOtherDescription', w.o); }); XV(X(C, 'STRUCTURE_COMPONENT_DETAIL'), 'ImprovementComponentType', 'Roof'); } } }
  { const sd = X(st, 'STRUCTURE_DETAIL'); if (mode !== 'condo') { const R = compQC(CF); XV(sd, 'ExteriorConditionRatingCode', R.extC); XV(sd, 'ExteriorQualityRatingCode', R.extQ); } XV(sd, 'LivingUnitCount', 1); if (stru === 'RowhouseTownhouse' && !blank(CF.unitPos)) XV(sd, 'RowhouseTownhouseEndUnitIndicator', /end|corner/i.test(CF.unitPos) ? 'true' : 'false'); if (!blank(CF.levels)) XV(sd, 'StoriesCount', CF.levels); }
  if (lineOn('sameBuilder', job)) { const v = qcdPick('sameBuilder', CF.sameBuilder); if (v) XV(cd, 'SameBuilderAsSubjectIndicator', v === 'Yes' ? 'true' : 'false'); }   // F-1 22.01.47
  qcdCompXML(job, CF, pu, ud, st);   // her optional quality and condition detail lines (F-1 22.08 / 22.09)
  if (mode !== 'house' && !blank(CF.project)) { const sp = subjFacts(job).project, nm = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (!blank(sp)) XV(cd, 'SameProjectAsSubjectIndicator', nm(sp) === nm(CF.project) ? 'true' : 'false'); }   // F-1 22.02.06: worked out from the two project names on her grid
  const heats = CFx.heat && typeof PICK !== 'undefined' && pkParse(PICK.heat, CFx.heat).ok ? pkParse(PICK.heat, CFx.heat).vals.filter(v => v !== 'None') : uadHeat(g('heatCool')); if (heats.length || cool) { const sy = X(imp, 'SYSTEM');
    if (cool && cool.exists) { const ce = X(X(sy, 'COOLING_SYSTEMS'), 'COOLING_SYSTEM'); XV(ce, 'CoolingSystemType', cool.type); if (cool.type === 'Other') XV(ce, 'CoolingSystemTypeOtherDescription', ((typeof PICK !== 'undefined' && pkParse(PICK.cool, CFx.cool).other) || 'Other').slice(0, 19)); }
    if (heats.length) { const hs = X(sy, 'HEATING_SYSTEMS'); heats.forEach(h => { const e = X(hs, 'HEATING_SYSTEM'); XV(e, 'HeatingFuelType', uadFuel(g('heatCool')) || null); XV(e, 'HeatingSystemType', h); if (h === 'Other') XV(e, 'HeatingSystemTypeOtherDescription', ((CFx.heat && typeof PICK !== 'undefined' && pkParse(PICK.heat, CFx.heat).other) || 'Wall heater').slice(0, 19)); }); } }
  /* her ADUs and outbuildings (Oct 20 2026; A-1 1800.07xx, F-1 22.07 / 22.14): one IMPROVEMENT per building – Outbuilding, real property, its 3.6 type;
     an ADU (Standalone ADU, ADU/Garage) also carries its own PROPERTY_UNIT (ADU indicator, finished sq ft, baths, Q / C, "ADU 1" like the iPad's subject);
     other living buildings their finished sq ft and bath counts */
  if (typeof obParse === 'function') { let na = 0; obParse(CF.adu).items.forEach((o, k) => { const im = X(IMPS, 'IMPROVEMENT', { 'xlink:label': `IMPROVEMENT_OUTBUILDING_SalesComp${n}_${k + 1}` }); const dt = X(im, 'IMPROVEMENT_DETAIL');
    const isAdu = OB_ADU.includes(o.t); XV(dt, 'ImprovementType', 'Outbuilding'); XV(dt, 'OutbuildingRealPropertyIndicator', 'true');
    const T = OB_UAD[o.t]; XV(dt, 'OutbuildingType', T || 'Other'); if (!T) XV(dt, 'OutbuildingTypeOtherDescription', (o.t === 'ADU/Garage' ? 'ADUGarage' : (o.other || o.t)).slice(0, 21));
    if (o.u && o.u.length) { const us = X(X(im, 'OUTBUILDING'), 'OUTBUILDING_UTILITIES'); o.u.forEach(v => XV(X(us, 'OUTBUILDING_UTILITY'), 'UtilityType', v)); }   // A-1 1800.0132
    if (isAdu) { na++; const pu = X(X(im, 'PROPERTY_UNITS'), 'PROPERTY_UNIT', { 'xlink:label': `PROPERTY_UNIT_SalesComp${n}_ADU${na}` }); { const A = X(pu, 'PROPERTY_UNIT_AREA'); XV(A, 'UnitBelowGradeUnfinishedAreaMeasure', 0, SQFT); if (+o.sf) XV(A, 'UnitStandardAboveGradeFinishedAreaMeasure', +o.sf, SQFT); XV(A, 'UnitStandardBelowGradeFinishedAreaMeasure', 0, SQFT); }
      const d = X(pu, 'PROPERTY_UNIT_DETAIL'); XV(d, 'AccessoryDwellingUnitIndicator', 'true'); if (o.full !== '') XV(d, 'FullBathroomCount', +o.full || 0); if (o.full !== '' || o.half !== '') XV(d, 'HalfBathroomCount', +o.half || 0);
      { const R = compQC(CF); XV(d, 'InteriorConditionRatingCode', o.c || R.intC); XV(d, 'InteriorQualityRatingCode', o.q || R.intQ); } XV(d, 'UnitIdentifier', aduUnitId(n, na)); }
    else { if (+o.full || +o.half) { const R = X(X(im, 'INTERIOR'), 'INTERIOR_ROOM_SUMMARIES'); [['FullBathroom', +o.full], ['HalfBathroom', +o.half]].forEach(([t, v]) => { if (!v) return; const e = X(R, 'INTERIOR_ROOM_SUMMARY'); XV(e, 'RoomType', t); XV(e, 'TotalRoomCount', v); }); } }
    const sd = X(X(im, 'STRUCTURE'), 'STRUCTURE_DETAIL'); XV(sd, 'LivingUnitCount', isAdu ? 1 : 0); if (+o.sf) { XV(sd, 'StructureAreaMeasure', +o.sf, SQFT); XV(sd, 'StructureExcludingVehicleStorageAndADUFinishedAreaMeasure', isAdu ? 0 : +o.sf, SQFT); XV(sd, 'StructureExcludingVehicleStorageAndADUUnfinishedAreaMeasure', 0, SQFT); } }); }   /* A-1 1800.0387 / .0344 / .0380: a real-property outbuilding's area */
  // INSPECTIONS (front photo)
  if (c.front) { const im = X(X(X(X(P, 'INSPECTIONS'), 'INSPECTION'), 'IMAGES'), 'IMAGE'); XV(im, 'ImageCategoryType', 'PropertyPhoto'); XV(im, 'ImageFileLocationIdentifier', '\\\\Images\\' + photoName(c)); XV(im, 'MIMETypeIdentifier', 'image/jpeg'); }
  // LISTING_INFORMATIONS
  const li = X(X(X(P, 'LISTING_INFORMATIONS'), 'LISTING_INFORMATION'), 'LISTING_INFORMATION_DETAIL'); XV(li, 'DaysOnMarketCount', blank(g('dom')) ? (CF.offMls ? 0 : null) : g('dom')); XV(li, 'FinalListPriceAmount', list); XV(li, 'ListingStatusType', status);
  // LOCATION
  if (!blank(g('lat')) && !blank(g('lon'))) { const gi = X(X(P, 'LOCATION_IDENTIFIER'), 'GEOSPATIAL_INFORMATION'); XV(gi, 'LatitudeIdentifier', (+g('lat')).toFixed(6)); XV(gi, 'LongitudeIdentifier', (+g('lon')).toFixed(6)); }
  XV(X(X(P, 'NEIGHBORHOOD'), 'NEIGHBORHOOD_DETAIL'), 'NeighborhoodName', g('nbhd'));
  // PROPERTY_AMENITY
  const cats = {}; const addA = (cat, t) => { (cats[cat] = cats[cat] || []).push(t); };
  if (yes(g('pool'))) addA('WaterFeatures', 'IngroundPool'); if (yes(g('spa'))) addA('WaterFeatures', 'IngroundSpa');
  if (yes(g('tennis')) || yes(g('sport'))) addA('OutdoorAccessories', 'SportsCourt'); if (yes(g('horse'))) addA('OutdoorAccessories', 'OutdoorRidingRing');
  const por = String(g('porch') || ''); [['Patio', /patio|terrace|loggia|lgga|trrc/i], ['Porch', /porch/i], ['Deck', /deck/i], ['Balcony', /balcon/i], ['Gazebo', /gazebo/i]].forEach(([t, re]) => { if (re.test(por)) addA('OutdoorLiving', t); });
  const catKeys = Object.keys(cats);
  if (mode !== 'house' && (CF.project || CF.hoaAmen)) { const PJ = X(P, 'PROJECT'); const am = uadProjAmen(CF.hoaAmen); if (am.length) { const PA = X(PJ, 'PROJECT_AMENITIES'); am.forEach(a => { const e = X(PA, 'PROJECT_AMENITY'); XV(e, 'AmenityType', a.t); if (a.other) XV(e, 'AmenityTypeOtherDescription', a.other); }); } if (CF.project) XV(X(PJ, 'PROJECT_DETAIL'), 'ProjectName', String(CF.project).slice(0, 100)); }
  if (catKeys.length) { const AC = X(X(P, 'PROPERTY_AMENITY'), 'AMENITY_CATEGORIES'); catKeys.forEach(k => { const cat = X(AC, 'AMENITY_CATEGORY'); const A = X(cat, 'AMENITIES'); cats[k].forEach(t => XV(X(X(A, 'AMENITY'), 'AMENITY_DETAIL'), 'AmenityType', t)); XV(X(cat, 'AMENITY_CATEGORY_DETAIL'), 'AmenityCategoryType', k); }); }
  // PROPERTY_DETAIL
  const pd = X(P, 'PROPERTY_DETAIL'); const aduTxt = String(CF.adu || g('adu') || '');   /* her ▾ pick on the grid first */ const aduN = typeof obParse === 'function' && obParse(aduTxt).items.length ? obParse(aduTxt).items.filter(x => OB_ADU.includes(x.t)).length : /2 ADUs/.test(aduTxt) ? 2 : /^ADU/i.test(aduTxt) ? 1 : 0;
  XV(pd, 'AccessoryDwellingUnitTotalCount', aduN); XV(pd, 'AttachmentType', /attach|row|semi|mid-rise|garden/i.test(g('attach') || '') && !/detach/i.test(g('attach')) ? 'Attached' : g('attach') ? 'Detached' : null);
  XV(pd, 'DwellingCount', 1); XV(pd, 'HomeownerResponsibleForExteriorMaintenanceIndicator', mode === 'condo' ? 'false' : 'true'); XV(pd, 'LivingUnitExcludingADUCount', 1);   /* A-1 1800.0364: every comp – a house owner keeps up the outside; a condo's association does */
  const cond = String(g('condition') || '').match(/C[1-6]/), qual = String(g('quality') || '').match(/Q[1-6]/);
  XV(pd, 'OverallConditionRatingCode', cond && cond[0]); XV(pd, 'OverallQualityRatingCode', qual && qual[0]);
  const prior = priorSales(c).filter(s => s.monthsBefore > 0 && s.monthsBefore <= 12 && s.type === 'Sale');
  XV(pd, 'PriorSalesOrTransfersIndicator', prior.length ? 'true' : 'false', prior.length ? undefined : { 'xlink:label': `PriorSalesOrTransfersIndicator_SalesComp${n}NoPriorSales` }); XV(pd, 'PropertyAmenityExistsIndicator', catKeys.length ? 'true' : 'false');
  const inProj = !blank(g('hoa')) && +g('hoa') > 0; XV(pd, 'PropertyEstateType', 'FeeSimple'); XV(pd, 'PropertyInProjectIndicator', inProj || mode !== 'house' ? 'true' : 'false'); XV(pd, 'PUDIndicator', inProj && /detach/i.test(g('attach') || '') ? 'true' : 'false');
  // SALES_CONTRACTS
  const sc = X(X(X(P, 'SALES_CONTRACTS'), 'SALES_CONTRACT'), 'SALES_CONTRACT_DETAIL'); const conc = num(g('concessions'));
  if (status === 'SettledSale') { if (conc !== null) { if (conc > 0) XV(sc, 'SalesConcessionAmountKnownIndicator', 'true'); XV(sc, 'SalesConcessionIndicator', conc > 0 ? 'true' : 'false'); }   /* F-1: amount known only asked when there are concessions */ else if (/^yes/i.test(g('concessionsYN') || '')) { XV(sc, 'SalesConcessionAmountKnownIndicator', 'false'); XV(sc, 'SalesConcessionIndicator', 'true'); } else if (/^no/i.test(g('concessionsYN') || '')) XV(sc, 'SalesConcessionIndicator', 'false'); }
  if (status === 'Pending' && price) XV(sc, 'SalesContractAmount', price);
  XV(sc, 'SalesContractDate', isoDate(g('contractDate')).length === 10 ? isoDate(g('contractDate')) : null);
  if (conc) XV(sc, 'TotalSalesConcessionAmount', conc);
  // SALES_HISTORIES: this sale, then prior sales within 12 months
  const SH = X(P, 'SALES_HISTORIES');
  if (status === 'SettledSale') { const h = X(SH, 'SALES_HISTORY'); XV(h, 'OwnershipTransferDate', isoDate(g('saleDate')).length === 10 ? isoDate(g('saleDate')) : null); XV(h, 'OwnershipTransferTransactionAmount', price); XV(h, 'OwnershipTransferTransactionType', 'Sale'); XV(h, 'SaleType', (() => { const t = compFacts(c, job).xferTerms; const p = t && typeof PICK !== 'undefined' ? pkParse(PICK.xferTerms, t) : null; return p && p.ok && p.vals[0] ? p.vals[0] : uadSaleType(g('saleType')); })()); { const t = String(compFacts(c, job).xferTerms || g('saleType') || ''); const m = t.match(/^Other:\s*(.+)$/i); if (m) XV(h, 'SaleTypeOtherDescription', m[1].slice(0, 33)); }; }
  prior.forEach((s, k) => { const h = X(SH, 'SALES_HISTORY', { 'xlink:label': `SALES_HISTORY_SalesComp${n}_PriorSales${prior.length > 1 ? k + 1 : ''}` }); XV(h, 'OwnershipTransferDate', s.date); XV(h, 'OwnershipTransferTransactionAmount', s.price); if (!s.price) XV(h, 'OwnershipTransferAmountNotAvailableReasonType', 'NotDisclosed'); XV(h, 'OwnershipTransferTransactionType', 'Sale'); XV(h, 'SaleType', 'TypicallyMotivated'); });
  // SITE
  const SI = X(P, 'SITE'); const fz = String(V(c, 'fema') || '');
  const pk = (id) => { const t = CF[id]; if (!t || typeof PICK === 'undefined' || !PICK[id]) return null; const P = pkParse(PICK[id], String(t)); return P.ok && P.vals.length ? P : null; };   // her ▾ pick answers on the rarer lines (Oct 20 2026)
  { const H = pk('hazard'); if (H) { const HZ = X(SI, 'HAZARD_ZONES'); H.vals.forEach(v => { const e = X(HZ, 'HAZARD_ZONE'); XV(e, 'HazardZoneType', v); if (v === 'Other') XV(e, 'HazardZoneTypeOtherDescription', (H.other || 'Other').slice(0, 33)); }); }
    else if (fz) XV(X(X(SI, 'HAZARD_ZONES'), 'HAZARD_ZONE'), 'HazardZoneType', /^(A|V)/.test(fz) ? 'FEMASpecialFloodHazardArea' : 'None'); }
  { const Z = pk('zoning'); if (Z) XV(X(X(SI, 'SITE_ZONING'), 'SITE_ZONING_DETAIL'), 'SiteZoningComplianceType', Z.vals[0]); }
  const XG = (p, tag) => p.kids.find(k => k.tag === tag) || X(p, tag);   // one PROPERTY_ACCESS / SITE_FEATURES per site
  { const A = pk('streetAccess'); if (A) { const e = X(X(XG(SI, 'PROPERTY_ACCESS'), 'ACCESS_STREETS'), 'ACCESS_STREET'); if (A.surf) { const sv = PICK.streetAccess.surface.includes(A.surf) ? A.surf : 'Other'; XV(e, 'ImprovedSurfaceMaterialType', sv); if (sv === 'Other') XV(e, 'ImprovedSurfaceMaterialTypeOtherDescription', A.surf === 'Other' ? 'Other' : A.surf.slice(0, 12)); } XV(e, 'StreetAccessType', A.vals[0]); if (A.vals[0] === 'Other') XV(e, 'StreetAccessTypeOtherDescription', (A.other || 'Other').slice(0, 33)); } }
  { const A = pk('primaryAccess'); if (A) { const d = XG(XG(SI, 'PROPERTY_ACCESS'), 'PROPERTY_ACCESS_DETAIL'); XV(d, 'PropertyPrimaryEntryExitMethodType', A.vals[0]); if (A.vals[0] === 'Other') XV(d, 'PropertyPrimaryEntryExitMethodTypeOtherDescription', (A.other || 'Other').slice(0, 33)); } }
  { const F = pk('siteChar'); if (F) { const SF = XG(SI, 'SITE_FEATURES'); F.vals.filter(v => v !== 'Topography' || !pk('topo')).forEach(v => { const fd = X(X(SF, 'SITE_FEATURE'), 'SITE_FEATURE_DETAIL'); XV(fd, 'SiteFeatureType', v); if (v === 'Other') XV(fd, 'SiteFeatureTypeOtherDescription', (F.other || 'Other').slice(0, 45)); if (v !== 'None') XV(fd, 'ValueMarketabilityImpactType', 'Neutral'); }); } }
  { const T = pk('topo'); if (T) { const f = X(XG(SI, 'SITE_FEATURES'), 'SITE_FEATURE'); const fd = X(f, 'SITE_FEATURE_DETAIL'); XV(fd, 'SiteFeatureType', 'Topography'); XV(fd, 'ValueMarketabilityImpactType', 'Neutral'); const tp = X(f, 'TOPOGRAPHIES'); T.vals.forEach(v => { const e = X(tp, 'TOPOGRAPHY'); XV(e, 'TopographyType', v); if (v === 'Other') XV(e, 'TopographyTypeOtherDescription', String(T.other || 'Other').slice(0, 33)); }); } }
  { const E = pk('easement'), R = pk('restrict'); if (E || R) { const ens = X(P, 'ENCUMBRANCES');   // one ENCUMBRANCE per kind, with its EncumbranceType
      if (R) { const en = X(ens, 'ENCUMBRANCE'); XV(X(en, 'ENCUMBRANCE_DETAIL'), 'EncumbranceType', 'ConditionsCovenantsRestrictions'); const rs = X(en, 'CONDITION_COVENANT_RESTRICTIONS'); R.vals.forEach(v => { const e = X(rs, 'CONDITION_COVENANT_RESTRICTION'); XV(e, 'RestrictionType', v); if (v === 'Other') XV(e, 'RestrictionTypeOtherDescription', (R.other || 'Other').slice(0, 33)); }); }
      if (E) { const en = X(ens, 'ENCUMBRANCE'); XV(X(en, 'ENCUMBRANCE_DETAIL'), 'EncumbranceType', 'Easement'); const es = X(en, 'EASEMENTS'); E.vals.forEach(v => { const e = X(es, 'EASEMENT'); XV(e, 'EasementType', v); if (v === 'Other') XV(e, 'EasementTypeOtherDescription', (E.other || 'Other').slice(0, 33)); }); } } }
  XV(X(SI, 'SITE_DETAIL'), 'LandOwnedInCommonIndicator', CF._own ? 'false' : 'true');
  /* her Oct 22 ask (the six lines not sent yet): drainage reasons, environmental conditions, disaster mitigation for comps (A-1 1800.0220 / 0116 / 0104) */
  { const D = pk('drain'); if (D) { const SF = XG(SI, 'SITE_FEATURES'); let f = SF.kids.find(k => k.tag === 'SITE_FEATURE' && k.kids.some(d => d.tag === 'SITE_FEATURE_DETAIL' && d.kids.some(x => x.tag === 'SiteFeatureType' && x.text === 'Drainage')));
    if (!f) { f = X(SF, 'SITE_FEATURE'); const fd = X(f, 'SITE_FEATURE_DETAIL'); XV(fd, 'SiteFeatureType', 'Drainage'); XV(fd, 'ValueMarketabilityImpactType', 'Neutral'); }
    const rs = X(f, 'DRAINAGE_IMPACT_REASONS'); D.vals.forEach(v => { const e = X(rs, 'DRAINAGE_IMPACT_REASON'); XV(e, 'SiteDrainageReasonType', v); if (v === 'Other') XV(e, 'SiteDrainageReasonTypeOtherDescription', (D.other || 'Other').slice(0, 33)); }); } }
  { const E = pk('envCond'); if (E && E.vals.some(v => v !== 'None')) { const es = X(P, 'ENVIRONMENTAL_CONDITIONS'); E.vals.filter(v => v !== 'None').forEach(v => { const e = X(es, 'ENVIRONMENTAL_CONDITION'); XV(e, 'EnvironmentalConditionType', v); if (v === 'Other') XV(e, 'EnvironmentalConditionTypeOtherDescription', (E.other || 'Other').slice(0, 45)); }); } }
  { const A = pk('accessib'); if (A && A.vals.some(v => v !== 'None')) { const af = X(pu, 'ACCESSIBILITY_FEATURES'); A.vals.filter(v => v !== 'None').forEach(v => { const x = X(af, 'ACCESSIBILITY_FEATURE'); XV(x, 'AccessibilityFeatureType', v); if (v === 'Other') XV(x, 'AccessibilityFeatureTypeOtherDescription', (A.other || 'Other').slice(0, 33)); }); } }   // A-1 1800.0134
  { const W = wfParse(CF.waterFront); if (W.length) { const SIs = SI.kids.find(k => k.tag === 'SITE_INFLUENCES') || X(SI, 'SITE_INFLUENCES');   // A-1 1800.0227–.0238: water frontage with private access
      W.forEach(w => { let inf = SIs.kids.find(k => k.tag === 'SITE_INFLUENCE' && k.kids.some(d => d.tag === 'SITE_INFLUENCE_DETAIL' && d.kids.some(x => x.tag === 'SiteInfluenceType' && x.text === 'BodyOfWater')) && !k.kids.some(b => b.tag === 'BODIES_OF_WATER'));
        if (!inf) { inf = X(SIs, 'SITE_INFLUENCE'); XV(X(inf, 'SITE_INFLUENCE_DETAIL'), 'SiteInfluenceType', 'BodyOfWater'); }
        const det = inf.kids.find(k => k.tag === 'SITE_INFLUENCE_DETAIL'); const bw = X(inf, 'BODIES_OF_WATER'); const b = X(bw, 'BODY_OF_WATER');
        XV(b, 'BodyOfWaterName', w.name); XV(b, 'BodyOfWaterType', w.type); if (w.type === 'Other') XV(b, 'BodyOfWaterTypeOtherDescription', (w.other || 'Other').slice(0, 33)); XV(b, 'PrivateAccessIndicator', w.priv ? 'true' : 'false');
        if (w.priv) { XV(b, 'WaterAccessDepthType', w.depth); const wf = X(bw, 'WATER_FRONT_FEATURES'); (w.feats.length ? w.feats : []).forEach(f => XV(X(wf, 'WATER_FRONT_FEATURE'), 'WaterfrontFeatureType', f)); if (w.ft) XV(det, 'WaterFrontageTotalLengthLinearMeasure', w.ft, { LinearUnitOfMeasureType: 'Feet' }); } }); } }
  { const M = pk('disaster'); if (M) { const ms = X(P, 'DISASTER_MITIGATION_FEATURES'); (M.vals.some(v => v !== 'None') ? M.vals.filter(v => v !== 'None') : ['None']).forEach(v => { const e = X(ms, 'DISASTER_MITIGATION_FEATURE'); XV(e, 'DisasterMitigationFeatureType', v); if (v === 'Other') XV(e, 'DisasterMitigationFeatureTypeOtherDescription', (M.other || 'Other').slice(0, 33)); }); } }

  { const L = siParse(CF.loc); if (L.length) { const S = X(SI, 'SITE_INFLUENCES'); L.forEach(i => { const d = X(X(S, 'SITE_INFLUENCE'), 'SITE_INFLUENCE_DETAIL'); siXV(d, i, XV); }); } }   // each influence with its impact and proximity (her ▾ pick)
  const site = num(g('siteSf')); if (site) XV(X(SI, 'SITE_SIZE_LAYOUT'), 'LotSizeAreaMeasure', site >= 43560 ? (site / 43560).toFixed(2) : Math.round(site), { AreaUnitOfMeasureType: site >= 43560 ? 'Acres' : 'SquareFeet' });
  { const L = typeof vwParse === 'function' ? vwParse(CF.view) : []; if (L.length) { const SV = X(SI, 'SITE_VIEWS'); L.forEach((v, i) => { const e = X(SV, 'SITE_VIEW'); XV(e, 'ValueMarketabilityImpactType', v.impact); XV(e, 'ViewPrimaryIndicator', i === 0 ? 'true' : 'false'); XV(e, 'ViewRangeType', v.range || null); XV(e, 'ViewType', v.type); if (v.type === 'Other') XV(e, 'ViewTypeOtherDescription', (v.other || 'Other').slice(0, 33)); }); } }   // each view with its impact and range (her ▾ pick)
  // DATA_SOURCES
  const rel = (arc, from, to) => { X(RELS, 'RELATIONSHIP', { 'xlink:arcrole': 'urn:fdc:mismo.org:2009:residential/DATA_SOURCE_IsDataSourceFor_' + arc, 'xlink:from': from, 'xlink:to': to }).selfClose = true; };
  const made = {}; const ds = (type, id, name) => { const l = `DATA_SOURCE_${type}SalesComp${n}`; made[type] = l; const e = X(DSS, 'DATA_SOURCE', { 'xlink:label': l }); XV(e, 'DataSourceName', name || DS_NAME[type] || type); XV(e, 'DataSourceIdentifier', id); XV(e, 'DataSourceType', type); rel('PROPERTY', l, lab); return l; };
  const src = [];
  if (g('mls') && (c.src.mls || c.src.pdf || /MLS/i.test(g('verification') || ''))) src.push(ds('MLS', g('mls')));
  /* the recorded document number of the sale (CRS or CORT; her rule Oct 20 2026: the date is the Sale date line's). A-1 22.01.18 and SFREP's
     Data Source list have no "Deed" (her Oct 21 import showed it blank and red), so it is the identifier of the public-record source */
  const DN = docNoOf(c), doc = DN ? '#' + docShort(DN.doc) : c.src.cort.length ? c.src.cort[c.cortPick || 0].doc || null : null;
  const pub = c.src.crs || doc ? ds('AssessorRecord', doc, c.src.crs ? DS_NAME.AssessorRecord : 'County recorder') : null;
  if (c.src.arch.length) src.push(ds('PreviousAppraisalFile', null));
  /* the comp's transfer history (F-1 21.011): its data source, linked to each prior sale or to "no prior sales" (D-1 SF1) */
  /* where the comp's living area came from (A-1 0700.0125 Area Data Source; her Oct 21 import showed it red) */
  { const gs = (val(c, 'gla') || {}).src; const want = { mls: 'MLS', pdf: 'MLS', crs: 'AssessorRecord', arch: 'PreviousAppraisalFile' }[gs]; const from = (want && made[want]) || made.MLS || made.AssessorRecord || made.PreviousAppraisalFile;
    if (from && ar.kids.length) { ar.attrs['xlink:label'] = `PROPERTY_UNIT_AREA_SalesComp${n}`; rel('PROPERTY_UNIT_AREA', from, ar.attrs['xlink:label']); } }
  const th = pub || src[0]; if (th) { if (prior.length) prior.forEach((s, k) => rel('SALES_HISTORY', th, `SALES_HISTORY_SalesComp${n}_PriorSales${prior.length > 1 ? k + 1 : ''}`)); else rel('PriorSalesOrTransfersIndicator', th, `PriorSalesOrTransfersIndicator_SalesComp${n}NoPriorSales`); }
}
/* A-1: DataSourceName is required (33 characters) */
/* a comp's interior / exterior quality and condition (A-1 1800.0157 / .0158 / .0185 / .0186): her own entry on the grid line, else the overall rating */
/* quality and condition details for a comp (Oct 21 2026): only the lines she ticked; text up to 70 characters, statuses from the ▾ lists */
/* green certifications and efficiency ratings from her words in the energy line's Other (Oct 21 2026): "HERS 55", "Home Energy Score 8", "LEED Gold",
   "GreenPoint Rated", "Energy Star", "NGBS Silver", "Zero Energy Ready", "Passive House". Anything else that sounds like one is flagged by the pre-check. */
function greenParse(t) { t = String(t || ''); const certs = [], ratings = [];
  let m; if ((m = t.match(/\bHERS(?:\s*index)?\s*(?:score\s*)?[:#]?\s*(\d{1,3})\b/i))) ratings.push({ name: 'HERS Index', score: m[1] });
  if ((m = t.match(/\bhome energy score\s*[:#]?\s*(\d{1,2})\b/i))) ratings.push({ name: 'Home Energy Score', score: m[1] });
  if ((m = t.match(/\bLEED(?:\s+for\s+homes)?(?:\s+(certified|silver|gold|platinum))?\b/i))) certs.push({ name: 'LEED', level: m[1] ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : '' });
  if ((m = t.match(/\bgreen\s*point\s*rated(?:\s*(\d{2,3}))?/i))) certs.push({ name: 'GreenPoint Rated', level: m[1] || '' });
  if (/\benergy\s*star\b/i.test(t)) certs.push({ name: 'ENERGY STAR', level: '' });
  if ((m = t.match(/\bNGBS(?:\s+green)?(?:\s+(bronze|silver|gold|emerald))?\b/i))) certs.push({ name: 'NGBS Green', level: m[1] ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : '' });
  if (/\bzero energy ready\b|\bZERH\b/i.test(t)) certs.push({ name: 'DOE Zero Energy Ready Home', level: '' });
  if (/\bpassive\s*house\b|\bPHIUS\b/i.test(t)) certs.push({ name: 'PHIUS Passive House', level: '' });
  const unread = !certs.length && !ratings.length && /certif|rating|rated|\bhers\b|leed|score/i.test(t);
  return { certs, ratings, unread }; }
function qcdPick(id, v) { if (blank(v)) return null; const r = pkParse(PICK[id], String(v)); return r.ok ? r.vals[0] : null; }
function qcdCompXML(J, F, pu, ud, st) { const on = new Set(QCD_IDS.filter(id => lineOn(id, J))); if (!on.size) return;
  const t = id => on.has(id) && !blank(F[id]) && String(F[id]).trim() ? String(F[id]).trim().slice(0, 70) : null, p = id => on.has(id) ? qcdPick(id, F[id]) : null;
  if (t('kitQ') || p('kitUpd')) { const d = X(X(X(pu, 'ROOMS'), 'ROOM'), 'ROOM_DETAIL'); XV(d, 'RoomQualitySummaryDescription', t('kitQ')); XV(d, 'RoomType', 'Kitchen'); XV(d, 'RoomUpdateStatusType', p('kitUpd')); }
  XV(ud, 'OverallBathroomsQualityDescription', t('bathQ')); XV(ud, 'OverallBathroomsUpdateStatusType', p('bathUpd'));
  let IC = null; const ic = () => IC || (IC = X(pu, 'INTERIOR_COMPONENTS'));
  if (t('floorQ') || p('floorUpd')) { const d = X(X(ic(), 'INTERIOR_COMPONENT'), 'INTERIOR_COMPONENT_DETAIL'); XV(d, 'ImprovementComponentQualitySummaryDescription', t('floorQ')); XV(d, 'ImprovementComponentType', 'Flooring'); XV(d, 'OverallFlooringUpdateStatusType', p('floorUpd')); }
  if (t('wallQ') || p('wallCnd')) { const d = X(X(ic(), 'INTERIOR_COMPONENT'), 'INTERIOR_COMPONENT_DETAIL'); XV(d, 'ImprovementComponentConditionStatusType', p('wallCnd')); XV(d, 'ImprovementComponentQualitySummaryDescription', t('wallQ')); XV(d, 'ImprovementComponentType', 'WallsAndCeiling'); }
  const SC = () => st.kids.find(k => k.tag === 'STRUCTURE_COMPONENTS') || X(st, 'STRUCTURE_COMPONENTS');
  const comp = type => { const S = SC(); let c = S.kids.find(k => k.kids.some(d => d.tag === 'STRUCTURE_COMPONENT_DETAIL' && d.kids.some(x => x.tag === 'ImprovementComponentType' && x.text === type)));
    if (!c) { c = X(S, 'STRUCTURE_COMPONENT'); XV(X(c, 'STRUCTURE_COMPONENT_DETAIL'), 'ImprovementComponentType', type); } return { c, d: c.kids.find(k => k.tag === 'STRUCTURE_COMPONENT_DETAIL') }; };
  if (p('extWallCnd')) XV(comp('ExteriorWallsAndTrim').d, 'ImprovementComponentConditionStatusType', p('extWallCnd'));
  if (p('fndCnd')) XV(comp('Foundation').d, 'ImprovementComponentConditionStatusType', p('fndCnd'));
  if (p('roofCnd')) { const R = comp('Roof'); const rf = R.c.kids.find(k => k.tag === 'ROOF') || X(R.c, 'ROOF'); XV(X(rf, 'ROOF_DETAIL'), 'RoofObservableIndicator', p('roofCnd') === 'Unobservable' ? 'false' : 'true'); if (p('roofCnd') !== 'Unobservable') XV(R.d, 'ImprovementComponentConditionStatusType', p('roofCnd')); }
  if (t('winQ') || p('winCnd')) { const W = comp('Windows'); XV(W.d, 'ImprovementComponentConditionStatusType', p('winCnd')); XV(W.d, 'ImprovementComponentQualitySummaryDescription', t('winQ')); } }
function compQC(F) { const r = (v, L) => { const m = String(v || '').match(L === 'Q' ? /Q[1-6]/i : /C[1-6]/i); return m ? m[0].toUpperCase() : null; };
  return { intQ: r(F.intQ, 'Q') || r(F.q, 'Q'), intC: r(F.intC, 'C') || r(F.c, 'C'), extQ: r(F.extQ, 'Q') || r(F.q, 'Q'), extC: r(F.extC, 'C') || r(F.c, 'C') }; }
const aduUnitId = (n, k) => `Comp${n} ADU${k > 1 ? ' ' + k : ''}`;   // D-1 SF3: "Comp1 Primary" / "Comp1 ADU"
const DS_NAME = { MLS: 'Santa Barbara MLS (Flexmls)', AssessorRecord: 'CRS Data', Deed: 'Recorded deed (county recorder)', PreviousAppraisalFile: 'Appraiser files' };
function buildCompsMISMO(job, comps) { if (!RC) return rcRun(() => buildCompsMISMO(job, comps));
  const root = X(null, 'MESSAGE', { 'xmlns:xlink': 'http://www.w3.org/1999/xlink', xmlns: 'http://www.mismo.org/residential/2009/schemas', 'xmlns:gse': 'http://www.datamodelextension.org', MISMOReferenceModelIdentifier: '3.6.0366' });
  const doc = X(X(X(X(root, 'DOCUMENT_SETS'), 'DOCUMENT_SET'), 'DOCUMENTS'), 'DOCUMENT');
  XV(X(X(doc, 'ABOUT_VERSIONS'), 'ABOUT_VERSION'), 'AboutVersionIdentifier', '1');
  const svc = X(X(X(X(X(X(doc, 'DEAL_SETS'), 'DEAL_SET'), 'DEALS'), 'DEAL'), 'SERVICES'), 'SERVICE');
  const RELS = X(svc, 'RELATIONSHIPS');
  const va = X(X(X(X(svc, 'VALUATION'), 'VALUATION_RESPONSE'), 'VALUATION_ANALYSES'), 'VALUATION_ANALYSIS');
  const DSS = X(va, 'DATA_SOURCES');
  const PROPS = X(va, 'PROPERTIES');
  comps.forEach((c, i) => buildCompXML(PROPS, RELS, DSS, c, i + 1, job));
  notUsedXML(PROPS, job);   // analyzed – not used (UAD 22.17)
  svc.kids = [...svc.kids.filter(k => k !== RELS), RELS]; // UAD order: VALUATION, then RELATIONSHIPS
  { const vs = X(X(X(va, 'VALUATION_REPORT'), 'VALUATION_SOFTWARE_SYSTEMS'), 'VALUATION_SOFTWARE_SYSTEM'); XV(vs, 'ValuationSoftwareProductName', 'Octopus Appraisal Assistant – OctoSleuth'); XV(vs, 'ValuationSoftwareProductVersionIdentifier', typeof BUILD !== 'undefined' ? BUILD : '1'); XV(vs, 'ValuationSoftwareVendorName', 'Jennifer Heath, LLC (in-house)'); }   // schema: name + version (or vendor)
  const dc = X(doc, 'DOCUMENT_CLASSIFICATION'); XV(X(X(dc, 'DOCUMENT_CLASSES'), 'DOCUMENT_CLASS'), 'DocumentType', 'AppraisalReport');
  const dcd = X(dc, 'DOCUMENT_CLASSIFICATION_DETAIL'); XV(dcd, 'DocumentFormIssuingEntityNameType', 'FNM_FRE'); XV(dcd, 'DocumentFormIssuingEntityVersionIdentifier', 'September 2024');
  return xsdSortXML('<?xml version="1.0" encoding="UTF-8"?>\n<!--Sales comparables exported by OctoSleuth for import into Appraise-It Pro (Home > Import Forms). Adjustments are yours, from OctoSleuth grid.-->\n' + xmlOut(root));   // schema (XSD) element order
}

/* ---- comps table ---- */
function compsCSV(job, comps) {
  const cols = [['use', 'Comp #'], ['title', 'Address'], ...FIELDS.filter(f => f.k !== 'addr').map(f => [f.k, f.l]), ['prox', 'Proximity (mi)'], ['dir', 'Direction'], ['flags', 'Flags'], ['sources', 'Sources']];
  const rows = [cols.map(c => csvCell(c[1])).join(',')];
  comps.forEach(c => { const px = proximity(c, job); rows.push(cols.map(([k]) => {
    if (k === 'use') return c.use || ''; if (k === 'title') return csvCell(compTitle(c)); if (k === 'prox') return px ? px.mi.toFixed(2) : ''; if (k === 'dir') return px ? px.dir : '';
    if (k === 'flags') return csvCell(compFlags(c, job).map(f => f.t).join(' | ')); if (k === 'sources') return csvCell(sourcesOf(c).join(' '));
    const f = FIELD[k], v = V(c, k); return csvCell(f.t === 'date' ? showDate(v) : blank(v) ? '' : v);
  }).join(',')); });
  return '﻿' + rows.join('\r\n');
}
function sourcesOf(c) { const s = []; if (c.src.arch.length) s.push('Archive×' + c.src.arch.length); if (c.src.mls) s.push('MLS'); if (c.src.pdf) s.push('Printout'); if (c.src.crs) s.push('CRS'); if (c.src.cort.length) s.push('CORT'); return s; }
