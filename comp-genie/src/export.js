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
function uadSaleType(s) { return ({ ArmLth: 'TypicallyMotivated', Listing: 'TypicallyMotivated', REO: 'REOSale', Short: 'ShortSale', Estate: 'EstateSale', CrtOrd: 'CourtOrderedNonForeclosureSale', NonArm: 'SaleBetweenRelatedParties', Relo: 'RelocationSale', Trust: 'EstateSale' })[s] || (s ? 'Other' : 'TypicallyMotivated'); }
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
function uadFuel(s) { return /propane/i.test(s) ? 'Propane' : /electric|elect/i.test(s) ? 'Electric' : /gas/i.test(s) ? 'NaturalGas' : ''; }
function uadCool(s) {
  const t = String(s || ''); const part = t.includes('/') ? t.split('/').slice(1).join('/') : t;
  if (/no cooling|none/i.test(part) && !/central|C\/Air|A\/C/i.test(part)) return { exists: false };
  if (/central|C\/Air|A\/C|heat pump/i.test(t)) return { exists: true, type: 'Centralized' };
  if (/window|ductless|mini|wall unit|individual/i.test(t)) return { exists: true, type: 'Individual' };
  return null;
}
const VIEW_MAP = [[/ocean|water|coast|harbor|beach|island/i, 'Ocean'], [/mountain/i, 'Mountain'], [/skyline|city(?! street)/i, 'Skyline'], [/city street/i, 'CityStreet'], [/golf/i, 'GolfCourse'], [/wood/i, 'Woods'], [/park|greenbelt/i, 'Park'], [/pastoral/i, 'Pastoral'], [/canyon|valley/i, 'Valley'], [/lake/i, 'Lake'], [/creek/i, 'Creek'], [/residential|garden|setting/i, 'Residential']];
function uadViews(s) { const out = []; String(s || '').split(/;\s*/).filter(Boolean).forEach(p => { if (/panoramic|partial|filtered|other/i.test(p)) return; const m = VIEW_MAP.find(([re]) => re.test(p)); const t = m ? m[1] : 'Other'; if (!out.some(o => o.t === t)) out.push({ t, other: t === 'Other' ? p.slice(0, 33) : '' }); }); return out; }
const INFL_MAP = [[/busy road|freeway/i, 'BusyRoadway'], [/^residential$/i, 'Residential'], [/waterfront|near water/i, 'BodyOfWater'], [/commercial/i, 'CommercialArea'], [/train/i, 'RailLine'], [/school/i, 'School'], [/park/i, 'Park'], [/golf/i, 'GolfCourse']];
/* one UAD 3.6 site influence, elements in schema (alphabetical) order */
function siXV(d, i, put) { put(d, 'SiteInfluenceProximityType', i.prox || null); put(d, 'SiteInfluenceType', i.type); if (i.type === 'Other') put(d, 'SiteInfluenceTypeOtherDescription', String(i.other || 'Other').slice(0, 45)); put(d, 'ValueMarketabilityImpactType', i.impact || 'Neutral'); }
function funcIssues(t) { t = String(t || '').trim(); if (!t) return []; const out = [];
  t.split(/;|,/).map(x => x.trim()).filter(Boolean).forEach(p => { const ty = /^none/i.test(p) ? 'None' : /ceiling/i.test(p) ? 'CeilingHeight' : /floor ?plan|layout|tandem|access/i.test(p) ? 'FloorPlan' : /non.?conform/i.test(p) ? 'NonConformity' : /over.?improv/i.test(p) ? 'Overimprovement' : /under.?improv/i.test(p) ? 'Underimprovement' : 'Other';
    if (!out.some(o => o.t === ty && ty !== 'Other')) out.push({ t: ty, other: ty === 'Other' ? p.slice(0, 33) : '' }); });
  return out.some(o => o.t !== 'None') ? out.filter(o => o.t !== 'None') : out; }
function uadInfluences(s) { const out = []; String(s || '').split(/;\s*/).filter(Boolean).forEach(p => { const m = INFL_MAP.find(([re]) => re.test(p)); const t = m ? m[1] : 'Other'; if (!out.some(o => o.t === t && t !== 'Other')) out.push({ t, other: t === 'Other' ? p.slice(0, 33) : '' }); }); return out; }
const yes = v => /^(yes|y|true|1)/i.test(String(v || '')) || (typeof v === 'string' && /guest|adu/i.test(v) && !/^none|^no$/i.test(v));

function photoName(c) { return safeName(compTitle(c)).replace(/[^A-Za-z0-9.()-]+/g, '_') + '.jpg'; }

/* ---- one comparable ---- */
function buildCompXML(PROPS, RELS, DSS, c, n, job) {
  const lab = 'PROPERTY_SALESCOMP' + n;
  const P = X(PROPS, 'PROPERTY', { ValuationUseType: 'SalesComparable', 'xlink:label': lab });
  const g = k => V(c, k);
  // ADDRESS
  const ad = X(P, 'ADDRESS'); XV(ad, 'AddressLineText', g('addr')); if (g('unit')) { XV(ad, 'AddressUnitDesignatorType', 'Unit'); XV(ad, 'AddressUnitIdentifier', g('unit')); }
  XV(ad, 'CityName', g('city') || ARCH.zipCity[g('zip')] || ''); XV(ad, 'PostalCode', zip9(c)); XV(ad, 'StateCode', 'CA');
  // CAR_STORAGES
  const cs = X(P, 'CAR_STORAGES'); let any = false;
  const gar = num(g('garage')); if (gar) { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); const gt = String(g('garageType') || ''); XV(d, 'CarStorageAttachmentType', /built/i.test(gt) ? 'BuiltIn' : /detach/i.test(gt) ? 'Detached' : /attach/i.test(gt) ? 'Attached' : null); XV(d, 'CarStorageType', 'Garage'); XV(d, 'ParkingSpacesCount', gar); }
  const cp = num(g('carport')); if (cp) { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); XV(d, 'CarStorageType', 'Carport'); XV(d, 'ParkingSpacesCount', cp); }
  const dw = num(g('driveway')); if (dw) { any = true; const d = X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'); XV(d, 'CarStorageType', 'Driveway'); XV(d, 'ParkingSpacesCount', dw); XV(d, 'TenOrMoreParkingSpacesIndicator', dw >= 10 ? 'true' : 'false'); }
  if (!any && gar === 0) XV(X(X(cs, 'CAR_STORAGE'), 'CAR_STORAGE_DETAIL'), 'CarStorageType', 'None');
  // COMPARABLE: your adjustments from the grid (if any), then the detail
  const CMP = X(P, 'COMPARABLE'); const gt = gridAdjustXML(CMP, c, job);
  const cd = X(CMP, 'COMPARABLE_DETAIL'); const px = proximity(c, job);
  if (gt && gt.lines) { XV(cd, 'AdjustedSalesPriceAmount', Math.round(gt.adj)); XV(cd, 'SalePriceNetTotalAdjustmentAmount', Math.round(gt.net)); }
  if (job.grid && job.grid.weights && job.grid.weights[c.id]) XV(cd, 'ComparableWeightType', job.grid.weights[c.id]);
  const price = num(g('salePrice')), list = num(g('listPrice')), gla = num(g('gla')); const status = uadStatus(g('status') || (currentSale(c) || {}).status);
  if (px) XV(cd, 'ComparableToSubjectDirectionType', px.dir);
  if (status === 'Pending') XV(cd, 'ContractAmountUnknownIndicator', price ? 'false' : 'true');
  XV(cd, 'ContractDateUnknownIndicator', g('contractDate') ? 'false' : 'true');
  const fin = uadFinancing(g('financing')); if (status === 'SettledSale') { if (fin.type) { XV(cd, 'MortgageType', fin.type); if (fin.other) XV(cd, 'MortgageTypeOtherDescription', fin.other); } if (fin.none || fin.type) XV(cd, 'NoFinancingTransactionIndicator', fin.none ? 'true' : 'false'); }
  if (price && gla) XV(cd, 'PricePerTotalStandardAboveGradeFinishedAreaAmount', Math.round(price / gla));
  XV(cd, 'PropertyOrdinalNumber', n);
  if (px) XV(cd, 'ProximityToSubjectDistanceLinearMeasure', px.mi.toFixed(2), { LinearUnitOfMeasureType: 'Miles' });
  if (price && list && status !== 'SettledSale') XV(cd, 'SaleToListPriceRatioPercent', (price / list * 100).toFixed(2));
  cd.kids.sort((a, b) => a.tag.localeCompare(b.tag)); // UAD order is alphabetical inside COMPARABLE_DETAIL
  // ENERGY_EFFICIENCY_AND_GREEN
  const en = String(g('energy') || ''); if (/solar|photovolt|geotherm|wind\s*(turbine|power|generator|mill)/i.test(en)) { const e = X(P, 'ENERGY_EFFICIENCY_AND_GREEN'); XV(X(e, 'ENERGY_EFFICIENCY_AND_GREEN_DETAIL'), 'RenewableEnergyComponentExistsIndicator', 'true'); XV(X(X(e, 'RENEWABLE_ENERGY_COMPONENTS'), 'RENEWABLE_ENERGY_COMPONENT'), 'RenewableEnergyComponentType', /geotherm/i.test(en) ? 'Geothermal' : /wind\s*(turbine|power|generator|mill)/i.test(en) ? 'WindTurbine' : 'Solar'); }
  // HAZARD (from CRS flood zone) goes in SITE below
  // IMPROVEMENTS
  const mode = gridMode(job), CF = compFacts(c, job);   /* condo / PUD facts from her grid */
  { const fx = funcIssues(CF.func); if (fx.length) { const FI = X(P, 'FUNCTIONAL_ISSUES'); fx.forEach(f => { const e = X(FI, 'FUNCTIONAL_ISSUE'); XV(e, 'FunctionalIssueType', f.t); if (f.other) XV(e, 'FunctionalIssueTypeOtherDescription', f.other); }); } }   // her Functional utility line
  if (mode !== 'house' && num(CF.hoa)) { const d = X(X(X(X(P, 'HOMEOWNERS_ASSOCIATIONS'), 'HOMEOWNERS_ASSOCIATION'), 'ASSOCIATION_CHARGES'), 'ASSOCIATION_CHARGE'); const dd = X(d, 'ASSOCIATION_CHARGE_DETAIL'); XV(dd, 'AssociationChargeAmount', Math.round(num(CF.hoa))); XV(dd, 'AssociationChargeType', 'AssociationDues'); }
  const imp = X(X(P, 'IMPROVEMENTS'), 'IMPROVEMENT'); const idt = X(imp, 'IMPROVEMENT_DETAIL'); const CFx = compFacts(c, job); const cool = CFx.cool && typeof PICK !== 'undefined' && pkParse(PICK.cool, CFx.cool).ok ? (/^none/i.test(CFx.cool) ? { exists: false } : { exists: true, type: pkParse(PICK.cool, CFx.cool).vals[0] }) : uadCool(g('heatCool'));   // her ▾ pick first
  if (cool) XV(idt, 'CoolingSystemExistsIndicator', cool.exists ? 'true' : 'false');
  XV(idt, 'ImprovementType', 'Dwelling'); if (num(g('yearBuilt')) >= 1700) { XV(idt, 'PropertyStructureBuiltYear', g('yearBuilt')); XV(idt, 'PropertyStructureBuiltYearEstimatedIndicator', 'false'); }   // a 0 from the MLS is no year (schema minimum 0001)
  const pu = X(X(imp, 'PROPERTY_UNITS'), 'PROPERTY_UNIT');
  const ar = X(pu, 'PROPERTY_UNIT_AREA'); const bs = num(g('bsmtSf')), bf = num(g('bsmtFin'));
  if (bs && bs > (bf || 0)) XV(ar, 'UnitBelowGradeUnfinishedAreaMeasure', bs - (bf || 0), SQFT);
  XV(ar, 'UnitStandardAboveGradeFinishedAreaMeasure', gla, SQFT); XV(ar, 'UnitStandardBelowGradeFinishedAreaMeasure', bs ? (bf || 0) : (gla ? 0 : null), SQFT);
  const ud = X(pu, 'PROPERTY_UNIT_DETAIL'); XV(ud, 'AccessoryDwellingUnitIndicator', 'false'); XV(ud, 'BedroomCount', g('beds'));
  const stru = uadStructure(CF.structure), isAtt = /attach/i.test(String(g('attach') || '')) && !/detach/i.test(String(g('attach') || ''));
  if (mode === 'condo' && /rise/.test(stru || '') && !blank(CF.unitPos)) XV(ud, 'CornerUnitIndicator', /corner|end/i.test(CF.unitPos) ? 'true' : 'false'); if (mode === 'condo' && !blank(CF.floor)) XV(ud, 'FloorIdentifier', String(CF.floor).slice(0, 10)); XV(ud, 'FullBathroomCount', g('full')); XV(ud, 'HalfBathroomCount', g('half')); if (!blank(CF.levels)) XV(ud, 'LevelCount', CF.levels);
  const st = X(imp, 'STRUCTURE'); { const K = typeof PICK !== 'undefined' && CF.constr ? pkParse(PICK.constr, String(CF.constr)) : null; if (K && K.ok && K.vals[0]) { const cm = X(X(st, 'CONSTRUCTION_METHODS'), 'CONSTRUCTION_METHOD'); XV(cm, 'ConstructionMethodType', K.vals[0]); if (K.vals[0] === 'Other') XV(cm, 'ConstructionMethodTypeOtherDescription', (K.other || 'Other').slice(0, 33)); } } const sty = uadStyle(g('style')); if (sty) { const a = X(st, 'ARCHITECTURAL_DESIGN'); XV(a, 'ArchitecturalDesignCategoryType', sty.t); if (sty.other) XV(a, 'ArchitecturalDesignCategoryTypeOtherDescription', sty.other); }
  if (isAtt && stru) { const a = st.kids.find(k => k.tag === 'ARCHITECTURAL_DESIGN') || X(st, 'ARCHITECTURAL_DESIGN'); XV(a, 'StructuralDesignType', stru); }
  { const sd = X(st, 'STRUCTURE_DETAIL'); XV(sd, 'LivingUnitCount', 1); if (stru === 'RowhouseTownhouse' && !blank(CF.unitPos)) XV(sd, 'RowhouseTownhouseEndUnitIndicator', /end|corner/i.test(CF.unitPos) ? 'true' : 'false'); if (!blank(CF.levels)) XV(sd, 'StoriesCount', CF.levels); }
  const heats = CFx.heat && typeof PICK !== 'undefined' && pkParse(PICK.heat, CFx.heat).ok ? pkParse(PICK.heat, CFx.heat).vals.filter(v => v !== 'None') : uadHeat(g('heatCool')); if (heats.length || cool) { const sy = X(imp, 'SYSTEM');
    if (cool && cool.exists) XV(X(X(sy, 'COOLING_SYSTEMS'), 'COOLING_SYSTEM'), 'CoolingSystemType', cool.type);
    if (heats.length) { const hs = X(sy, 'HEATING_SYSTEMS'); heats.forEach(h => { const e = X(hs, 'HEATING_SYSTEM'); XV(e, 'HeatingFuelType', uadFuel(g('heatCool')) || null); XV(e, 'HeatingSystemType', h); if (h === 'Other') XV(e, 'HeatingSystemTypeOtherDescription', 'Wall furnace'); }); } }
  // INSPECTIONS (front photo)
  if (c.front) { const im = X(X(X(X(P, 'INSPECTIONS'), 'INSPECTION'), 'IMAGES'), 'IMAGE'); XV(im, 'ImageCategoryType', 'PropertyPhoto'); XV(im, 'ImageFileLocationIdentifier', '\\\\Images\\' + photoName(c)); XV(im, 'MIMETypeIdentifier', 'image/jpeg'); }
  // LISTING_INFORMATIONS
  const li = X(X(X(P, 'LISTING_INFORMATIONS'), 'LISTING_INFORMATION'), 'LISTING_INFORMATION_DETAIL'); XV(li, 'DaysOnMarketCount', g('dom')); XV(li, 'FinalListPriceAmount', list); XV(li, 'ListingStatusType', status);
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
  const pd = X(P, 'PROPERTY_DETAIL'); const aduTxt = String(g('adu') || ''); const aduN = /2 ADUs/.test(aduTxt) ? 2 : /^ADU/i.test(aduTxt) ? 1 : 0;
  XV(pd, 'AccessoryDwellingUnitTotalCount', aduN); XV(pd, 'AttachmentType', /attach|row|semi|mid-rise|garden/i.test(g('attach') || '') && !/detach/i.test(g('attach')) ? 'Attached' : g('attach') ? 'Detached' : null);
  XV(pd, 'DwellingCount', 1); XV(pd, 'LivingUnitExcludingADUCount', 1);
  const cond = String(g('condition') || '').match(/C[1-6]/), qual = String(g('quality') || '').match(/Q[1-6]/);
  XV(pd, 'OverallConditionRatingCode', cond && cond[0]); XV(pd, 'OverallQualityRatingCode', qual && qual[0]);
  const prior = priorSales(c).filter(s => s.monthsBefore > 0 && s.monthsBefore <= 12 && s.type === 'Sale');
  XV(pd, 'PriorSalesOrTransfersIndicator', prior.length ? 'true' : 'false'); XV(pd, 'PropertyAmenityExistsIndicator', catKeys.length ? 'true' : 'false');
  const inProj = !blank(g('hoa')) && +g('hoa') > 0; XV(pd, 'PropertyEstateType', 'FeeSimple'); XV(pd, 'PropertyInProjectIndicator', inProj || mode !== 'house' ? 'true' : 'false'); XV(pd, 'PUDIndicator', inProj && /detach/i.test(g('attach') || '') ? 'true' : 'false');
  // SALES_CONTRACTS
  const sc = X(X(X(P, 'SALES_CONTRACTS'), 'SALES_CONTRACT'), 'SALES_CONTRACT_DETAIL'); const conc = num(g('concessions'));
  if (status === 'SettledSale') { if (conc !== null) { XV(sc, 'SalesConcessionAmountKnownIndicator', 'true'); XV(sc, 'SalesConcessionIndicator', conc > 0 ? 'true' : 'false'); } else if (/^yes/i.test(g('concessionsYN') || '')) { XV(sc, 'SalesConcessionAmountKnownIndicator', 'false'); XV(sc, 'SalesConcessionIndicator', 'true'); } }
  if (status === 'Pending' && price) XV(sc, 'SalesContractAmount', price);
  XV(sc, 'SalesContractDate', isoDate(g('contractDate')).length === 10 ? isoDate(g('contractDate')) : null);
  if (conc) XV(sc, 'TotalSalesConcessionAmount', conc);
  // SALES_HISTORIES: this sale, then prior sales within 12 months
  const SH = X(P, 'SALES_HISTORIES');
  if (status === 'SettledSale') { const h = X(SH, 'SALES_HISTORY'); XV(h, 'OwnershipTransferDate', isoDate(g('saleDate')).length === 10 ? isoDate(g('saleDate')) : null); XV(h, 'OwnershipTransferTransactionAmount', price); XV(h, 'OwnershipTransferTransactionType', 'Sale'); XV(h, 'SaleType', (() => { const t = compFacts(c, job).xferTerms; const p = t && typeof PICK !== 'undefined' ? pkParse(PICK.xferTerms, t) : null; return p && p.ok && p.vals[0] ? p.vals[0] : uadSaleType(g('saleType')); })()); }
  prior.forEach(s => { const h = X(SH, 'SALES_HISTORY', { 'xlink:label': `SALES_HISTORY_SalesComp${n}_PriorSales` }); XV(h, 'OwnershipTransferDate', s.date); XV(h, 'OwnershipTransferTransactionAmount', s.price); if (!s.price) XV(h, 'OwnershipTransferAmountNotAvailableReasonType', 'NotDisclosed'); XV(h, 'OwnershipTransferTransactionType', 'Sale'); XV(h, 'SaleType', 'TypicallyMotivated'); });
  // SITE
  const SI = X(P, 'SITE'); const fz = String(V(c, 'fema') || '');
  const pk = (id) => { const t = CF[id]; if (!t || typeof PICK === 'undefined' || !PICK[id]) return null; const P = pkParse(PICK[id], String(t)); return P.ok && P.vals.length ? P : null; };   // her ▾ pick answers on the rarer lines (Oct 20 2026)
  { const H = pk('hazard'); if (H) { const HZ = X(SI, 'HAZARD_ZONES'); H.vals.forEach(v => { const e = X(HZ, 'HAZARD_ZONE'); XV(e, 'HazardZoneType', v); if (v === 'Other') XV(e, 'HazardZoneTypeOtherDescription', (H.other || 'Other').slice(0, 33)); }); }
    else if (fz) XV(X(X(SI, 'HAZARD_ZONES'), 'HAZARD_ZONE'), 'HazardZoneType', /^(A|V)/.test(fz) ? 'FEMASpecialFloodHazardArea' : 'None'); }
  { const Z = pk('zoning'); if (Z) XV(X(X(SI, 'SITE_ZONING'), 'SITE_ZONING_DETAIL'), 'SiteZoningComplianceType', Z.vals[0]); }
  { const A = pk('streetAccess'); if (A) { const e = X(X(X(SI, 'PROPERTY_ACCESS'), 'ACCESS_STREETS'), 'ACCESS_STREET'); XV(e, 'StreetAccessType', A.vals[0]); if (A.vals[0] === 'Other') XV(e, 'StreetAccessTypeOtherDescription', (A.other || 'Other').slice(0, 33)); } }
  { const T = pk('topo'); if (T) { const f = X(X(SI, 'SITE_FEATURES'), 'SITE_FEATURE'); const fd = X(f, 'SITE_FEATURE_DETAIL'); XV(fd, 'SiteFeatureType', 'Topography'); XV(fd, 'ValueMarketabilityImpactType', 'Neutral'); const tp = X(f, 'TOPOGRAPHIES'); T.vals.forEach(v => XV(X(tp, 'TOPOGRAPHY'), 'TopographyType', v)); } }
  { const E = pk('easement'), R = pk('restrict'); if (E || R) { const ens = X(P, 'ENCUMBRANCES');   // one ENCUMBRANCE per kind, with its EncumbranceType
      if (R) { const en = X(ens, 'ENCUMBRANCE'); XV(X(en, 'ENCUMBRANCE_DETAIL'), 'EncumbranceType', 'ConditionsCovenantsRestrictions'); const rs = X(en, 'CONDITION_COVENANT_RESTRICTIONS'); R.vals.forEach(v => { const e = X(rs, 'CONDITION_COVENANT_RESTRICTION'); XV(e, 'RestrictionType', v); if (v === 'Other') XV(e, 'RestrictionTypeOtherDescription', (R.other || 'Other').slice(0, 33)); }); }
      if (E) { const en = X(ens, 'ENCUMBRANCE'); XV(X(en, 'ENCUMBRANCE_DETAIL'), 'EncumbranceType', 'Easement'); const es = X(en, 'EASEMENTS'); E.vals.forEach(v => { const e = X(es, 'EASEMENT'); XV(e, 'EasementType', v); if (v === 'Other') XV(e, 'EasementTypeOtherDescription', (E.other || 'Other').slice(0, 33)); }); } } }
  XV(X(SI, 'SITE_DETAIL'), 'LandOwnedInCommonIndicator', CF._own ? 'false' : 'true');
  { const L = siParse(CF.loc); if (L.length) { const S = X(SI, 'SITE_INFLUENCES'); L.forEach(i => { const d = X(X(S, 'SITE_INFLUENCE'), 'SITE_INFLUENCE_DETAIL'); siXV(d, i, XV); }); } }   // each influence with its impact and proximity (her ▾ pick)
  const site = num(g('siteSf')); if (site) XV(X(SI, 'SITE_SIZE_LAYOUT'), 'LotSizeAreaMeasure', site >= 43560 ? (site / 43560).toFixed(2) : Math.round(site), { AreaUnitOfMeasureType: site >= 43560 ? 'Acres' : 'SquareFeet' });
  { const L = typeof vwParse === 'function' ? vwParse(CF.view) : []; if (L.length) { const SV = X(SI, 'SITE_VIEWS'); L.forEach((v, i) => { const e = X(SV, 'SITE_VIEW'); XV(e, 'ValueMarketabilityImpactType', v.impact); XV(e, 'ViewPrimaryIndicator', i === 0 ? 'true' : 'false'); XV(e, 'ViewRangeType', v.range || null); XV(e, 'ViewType', v.type); if (v.type === 'Other') XV(e, 'ViewTypeOtherDescription', (v.other || 'Other').slice(0, 33)); }); } }   // each view with its impact and range (her ▾ pick)
  // DATA_SOURCES
  const ds = (type, id) => { const l = `DATA_SOURCE_${type}SalesComp${n}`; const e = X(DSS, 'DATA_SOURCE', { 'xlink:label': l }); XV(e, 'DataSourceName', DS_NAME[type] || type); XV(e, 'DataSourceIdentifier', id); XV(e, 'DataSourceType', type); X(RELS, 'RELATIONSHIP', { 'xlink:arcrole': 'urn:fdc:mismo.org:2009:residential/DATA_SOURCE_IsDataSourceFor_PROPERTY', 'xlink:from': l, 'xlink:to': lab }).selfClose = true; };
  if (g('mls') && (c.src.mls || c.src.pdf || /MLS/i.test(g('verification') || ''))) ds('MLS', g('mls'));
  if (c.src.crs) ds('AssessorRecord', null);
  if (c.src.cort.length) ds('Deed', c.src.cort[c.cortPick || 0].doc || null);
  if (c.src.arch.length) ds('PreviousAppraisalFile', null);
}
/* A-1: DataSourceName is required (33 characters) */
const DS_NAME = { MLS: 'Santa Barbara MLS (Flexmls)', AssessorRecord: 'CRS Data', Deed: 'CORT recorded deeds', PreviousAppraisalFile: 'Appraiser files' };
function buildCompsMISMO(job, comps) {
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
  { const vs = X(X(X(va, 'VALUATION_REPORT'), 'VALUATION_SOFTWARE_SYSTEMS'), 'VALUATION_SOFTWARE_SYSTEM'); XV(vs, 'ValuationSoftwareProductName', 'Appraisal Assistant – Comp Genie'); XV(vs, 'ValuationSoftwareProductVersionIdentifier', typeof BUILD !== 'undefined' ? BUILD : '1'); XV(vs, 'ValuationSoftwareVendorName', 'Jennifer Heath, LLC (in-house)'); }   // schema: name + version (or vendor)
  const dc = X(doc, 'DOCUMENT_CLASSIFICATION'); XV(X(X(dc, 'DOCUMENT_CLASSES'), 'DOCUMENT_CLASS'), 'DocumentType', 'AppraisalReport');
  const dcd = X(dc, 'DOCUMENT_CLASSIFICATION_DETAIL'); XV(dcd, 'DocumentFormIssuingEntityNameType', 'FNM_FRE'); XV(dcd, 'DocumentFormIssuingEntityVersionIdentifier', 'September 2024');
  return xsdSortXML('<?xml version="1.0" encoding="UTF-8"?>\n<!--Sales comparables exported by Comp Genie for import into Appraise-It Pro (Home > Import Forms). Adjustments are yours, from the Comp Genie grid.-->\n' + xmlOut(root));   // schema (XSD) element order
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
