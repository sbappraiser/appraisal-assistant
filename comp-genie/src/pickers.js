/* =====================================================================
   UAD 3.6 compliance pickers on the grid (her request, Oct 20 2026 – like ACI's "UAD Compliance" boxes).
   Every grid line whose 3.6 field is a fixed list gets ▾ pick: only the allowed answers (A-1 / GSE UAD 3.6 schema),
   "Other – describe" where 3.6 allows it, and short UAD guidance. A typed entry that is not an allowed answer turns red.
   Answers are written in the official words, so the SFREP file always gets a valid value.
   ===================================================================== */
const camelWords = t => t === 'OffMarket' ? 'Off market' : t === 'SettledSale' ? 'Settled sale' : t.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/ (\w)/g, (m, a) => ' ' + a.toLowerCase());
const Q_HELP = { Q1: 'Unique, architect-designed for a specific user; exceptionally high-grade workmanship and materials throughout.', Q2: 'Often custom designed; or high-quality tract homes from individual / highly modified plans; high or very high quality finishes.',
  Q3: 'Higher quality from individual or readily available designer plans; above-standard; many materials and finishes upgraded from stock.', Q4: 'Meets or exceeds code; standard or modified standard plans; stock or builder grade with some upgrades.',
  Q5: 'Economy of construction and basic functionality; plain design; inexpensive stock materials with limited refinements.', Q6: 'Basic quality and lower cost; may not be suitable for year-round occupancy; lowest quality materials.' };
const C_HELP = { C1: 'Very recently built, not previously occupied; no physical depreciation.', C2: 'No deferred maintenance, little or no depreciation, no repairs needed; virtually all components new or recently rehabilitated.',
  C3: 'Well maintained; limited depreciation from normal wear and tear; some components updated or recently rehabilitated.', C4: 'Some minor deferred maintenance and physical deterioration; adequately maintained; only minimal repairs needed.',
  C5: 'Obvious deferred maintenance; needs some significant repairs; functional utility and livability somewhat diminished.', C6: 'Substantial damage or deferred maintenance; deficiencies affect safety, soundness or structural integrity.' };
const enumOpts = list => list.map(v => [v, camelWords(v)]);
const PICK = {
  attach: { title: 'Attached / detached', one: true, opts: [['Detached', 'Detached'], ['Attached', 'Attached'], ['SemiDetached', 'Semi-detached (end unit, one shared wall)']],
    help: 'Detached: shares no walls, floor or ceiling with another property. Attached: shares walls (row and townhouses, condominiums). For an attached unit, tick the structure design line under ⚙ Grid lines.' },
  style: { title: 'Design (style)', one: true, other: 33, opts: enumOpts(['AFrame', 'Barn', 'BiLevel', 'Bungalow', 'CapeCod', 'Chalet', 'Colonial', 'Contemporary', 'Cottage', 'Craftsman', 'EarthBerm', 'Farmhouse', 'GeodesicDome', 'Georgian', 'Log', 'Mediterranean', 'Modern', 'NeoEclectic', 'RaisedRanch', 'Rambler', 'Ranch', 'Southwest', 'Spanish', 'SplitFoyerOrEntry', 'SplitLevel', 'Stilt', 'Traditional', 'Tudor', 'Victorian', 'Other']).map(([v, l]) => [v, v === 'AFrame' ? 'A-frame' : l]),
    help: 'UAD 3.6 architectural design (style) list. In 3.6 the attachment and the number of stories are their own lines (Attached / detached, Levels) – not "DT2;Ranch".' },
  levels: { title: 'Levels (stories)', one: true, opts: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], help: 'Number of above-grade levels in the unit (whole numbers in 3.6).' },
  q: { title: 'Overall quality', one: true, opts: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map(v => [v, v, Q_HELP[v]]), help: 'One rating – the one that best describes the whole dwelling. Your low / mid / high tier stays in your notes and comments (the drop-down beside it), never in the UAD field.' },
  c: { title: 'Overall condition', one: true, opts: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(v => [v, v, C_HELP[v]]), help: 'One rating for the overall condition. Your low / mid / high tier stays in your notes and comments only.' },
  status: { title: 'Listing status', one: true, opts: [['SettledSale', 'Settled sale'], ['Pending', 'Pending'], ['Active', 'Active'], ['OffMarket', 'Off market (expired, withdrawn, cancelled)']], help: 'UAD 3.6 listing status of the comparable.' },
  terms: { title: 'Transfer terms (financing)', one: true, other: 33, opts: [['Cash', 'Cash (no financing)'], ['Conventional', 'Conventional'], ['FHA', 'FHA'], ['VA', 'VA'], ['USDARuralDevelopment', 'USDA Rural Development'], ['Private', 'Private / seller financing'], ['Other', 'Other']], help: 'How the sale was financed (UAD MortgageType; cash = no financing).' },
  xferTerms: { title: 'Ownership transfer terms (sale type)', one: true, other: 33, opts: enumOpts(['TypicallyMotivated', 'EstateSale', 'SaleBetweenRelatedParties', 'ShortSale', 'REOSale', 'ForeclosureSale', 'CourtOrderedNonForeclosureSale', 'RelocationSale', 'PreSubdivisionSale', 'LandSale', 'Other']).map(([v, l]) => [v, v === 'REOSale' ? 'REO sale' : l]), help: 'UAD 3.6 sale type.' },
  heat: { title: 'Heating', multi: true, other: 33, opts: enumOpts(['ForcedWarmAir', 'Radiant', 'Baseboard', 'Radiators', 'GravityAir', 'MiniSplit', 'Fireplace', 'Stove', 'PassiveSolar', 'None', 'Other']), help: 'One or more heating system types (fuel is part of the subject’s inspection).' },
  cool: { title: 'Cooling (air conditioning)', one: true, other: 33, opts: [['Centralized', 'Centralized (central air)'], ['Individual', 'Individual (wall / window / mini-split units)'], ['None', 'None'], ['Other', 'Other']], help: 'UAD 3.6 cooling system type, or None.' },
  topo: { title: 'Topography', multi: true, other: 33, opts: enumOpts(['Flat', 'Sloping', 'Rolling', 'Rocky', 'Other']), help: 'UAD 3.6 topography (Flat replaces "Level").' },
  constr: { title: 'Construction method', one: true, other: 33, opts: enumOpts(['SiteBuilt', 'Modular', 'Manufactured', 'OnFrameModular', 'Container', 'ThreeDimensionalPrintingTechnology', 'Other']).map(([v, l]) => [v, v === 'ThreeDimensionalPrintingTechnology' ? '3-D printed' : l]), help: 'How the dwelling was built.' },
  func: { title: 'Functional utility (functional issues)', multi: true, other: 33, opts: [['None', 'None'], ['FloorPlan', 'Floor plan'], ['CeilingHeight', 'Ceiling height'], ['NonConformity', 'Non-conformity'], ['Overimprovement', 'Overimprovement'], ['Underimprovement', 'Underimprovement'], ['Other', 'Other']], help: 'UAD 3.6 functional issue types.' },
  sfSource: { title: 'Square footage source', one: true, other: 40, opts: [['MLS floor plan', 'MLS floor plan'], ['MLS', 'MLS (agent’s figure)'], ['Agent', 'Agent (verified with the agent)'], ['Permit', 'Permit / building records'], ['Files', 'Files (your inspection)'], ['Appraiser', 'Appraiser (measured)'], ['Public records', 'Public records (CRS / assessor)'], ['Builder', 'Builder / plans'], ['Seller', 'Seller'], ['Other', 'Other']], help: 'Where the living area on the grid came from – for your records and comments (not a 3.6 field). Say “measured” only when you measured it.' },
  energy: { title: 'Energy efficient and green features', multi: true, other: 60, opts: [['None', 'None'], ['SolarOwned', 'Solar (owned)'], ['SolarLeased', 'Solar (leased)'], ['SolarPPA', 'Solar (power purchase agreement)'], ['Solar', 'Solar (ownership not known)'], ['Geothermal', 'Geothermal'], ['WindTurbine', 'Wind turbine'], ['Other', 'Other (e.g. battery storage, heat pump water heater, efficiency rating)']], help: 'UAD 3.6 renewable energy component (Solar, Geothermal, Wind turbine) with its ownership (Owned, Leased, Power purchase agreement). Other energy-efficient or green features go in the description.' },
  primaryAccess: { title: 'Primary access', one: true, other: 33, opts: [['PublicStreet', 'Public street'], ['PrivateStreet', 'Private street (private road, private lane, shared driveway off a private road)'], ['PedestrianOnlyAccess', 'Pedestrian only access'], ['PrivateAirstrip', 'Private airstrip'], ['Waterway', 'Waterway'], ['Other', 'Other']], help: 'How you get to and from the property (UAD PropertyPrimaryEntryExitMethodType).' },
  siteChar: { title: 'Site characteristics', multi: true, other: 45, opts: [['None', 'None'], ...enumOpts(['Drainage', 'ExcessLand', 'Landlocked', 'RoadFrontage', 'Shape', 'SoilSuitability', 'SurplusLand', 'Topography', 'Wetlands', 'ZeroLotLine', 'CoastalBarrierResourcesSystem']), ['Other', 'Other (e.g. flag lot, interior lot)']], help: 'Landscaping is not listed here – it goes on your own Landscaping line with its rating. Site features that affect value (UAD SiteFeatureType). Topography and drainage also have their own lines.' },
  hazard: { title: 'Hazard zone', multi: true, other: 33, opts: [['None', 'None'], ['FEMASpecialFloodHazardArea', 'FEMA special flood hazard area'], ['USGSLavaFlowZone', 'USGS lava flow zone'], ['Other', 'Other (e.g. very high fire hazard severity zone)']], help: 'The flood zone and panel come from the flood map (Maps card) or CRS.' },
  zoning: { title: 'Zoning compliance', one: true, opts: enumOpts(['Legal', 'LegalNonConforming', 'Illegal', 'NoZoning']), help: 'UAD 3.6 zoning compliance.' },
  streetAccess: { title: 'Street access and surface', one: true, other: 33, opts: [['Local', 'Local road'], ['Collector', 'Collector street'], ['Arterial', 'Arterial street'], ['CulDeSac', 'Cul-de-sac'], ['DeadEnd', 'Dead end'], ['Alley', 'Alley'], ['Rural', 'Rural road'], ['Other', 'Other']], surface: ['Asphalt', 'Brick', 'Cobblestone', 'Concrete', 'Dirt', 'Gravel', 'Other'], help: 'UAD 3.6 street type and its surface (F-1 22.03.07 – the surface is required for each street when the line is on the grid). Local road: serves the homes on it. Collector street: collects local-road traffic and leads it to an arterial. Arterial street: high-capacity through route. A private road: Other – “Private road”. Shows as “Collector street | Asphalt”.' },
  easement: { title: 'Easement', multi: true, other: 33, opts: enumOpts(['IngressOrEgress', 'Utility', 'Drainage', 'Conservation', 'Other']).map(([v, l]) => [v, v === 'IngressOrEgress' ? 'Ingress / egress (driveway, access)' : l]), help: 'UAD 3.6 easement types.' },
  restrict: { title: 'Property restriction', multi: true, other: 33, opts: enumOpts(['Age', 'HistoricPreservation', 'Income', 'LandUse', 'Rental', 'SalePrice', 'Other']), help: 'UAD 3.6 restriction types (deed or covenant).' },
};
/* view: like the site influence picker – each view with its impact and range */
const VIEW_TYPES = ['Residential', 'Mountain', 'Ocean', 'Bay', 'Valley', 'Woods', 'Park', 'Pastoral', 'GolfCourse', 'Skyline', 'CityStreet', 'Lake', 'River', 'Creek', 'Pond', 'Reservoir', 'Canal', 'Cove', 'Gulf', 'Sound', 'Marsh', 'Commercial', 'Industrial', 'HighDensityResidential', 'Highway', 'ParkingLot', 'School', 'TrafficWallBarriers', 'Other'];
/* each view's impact (her rule, Oct 20 2026): Residential (incl. garden setting) is always Neutral; power lines, industrial, highway,
   parking lot, traffic wall are Adverse. Otherwise the impact typed with it, then her 2.6 rating for the line (N / B / A), then Beneficial
   for the scenic views, else Neutral. Text where every view carries its own impact (the ▾ pick form) is taken as it is. */
const VW_FIXED = { Residential: 'Neutral', Industrial: 'Adverse', Highway: 'Adverse', ParkingLot: 'Adverse', TrafficWallBarriers: 'Adverse' };
const VW_SCENIC = ['Mountain', 'Ocean', 'Bay', 'Valley', 'Woods', 'Park', 'Pastoral', 'GolfCourse', 'Skyline', 'Lake', 'River', 'Creek', 'Pond', 'Reservoir', 'Canal', 'Cove', 'Gulf', 'Sound', 'Marsh'];
const IMP_WORD = w => { const x = String(w || '').toLowerCase(); return x === 'n' || x === 'neutral' ? 'Neutral' : x === 'b' || x === 'beneficial' ? 'Beneficial' : x === 'a' || x === 'adverse' ? 'Adverse' : ''; };
/* split a view / location text into tokens, each with the impact written on it (own) */
function impTokens(text, trust) {
  const out = []; String(text || '').split(/;|,(?![^(]*\))/).map(x => x.trim()).filter(Boolean).forEach(tok => {
    if (/^[NBA]$/i.test(tok)) { out.push({ rating: IMP_WORD(tok) }); return; }   // her 2.6 "N;" / "B;" / "A;" on its own
    let rest = tok, own = ''; const m = tok.match(/^(Adverse|Beneficial|Neutral|[NBA](?=\s*:))\b\s*[:–-]?\s*(.*)$/i); if (m) { own = IMP_WORD(m[1]); rest = m[2]; }
    const tail = rest.match(/\s*[–-]\s*(Adverse|Beneficial|Neutral)\s*$/i); if (tail) { own = IMP_WORD(tail[1]); rest = rest.slice(0, tail.index); }
    out.push({ own, rest: rest.trim() }); });
  const items = out.filter(x => !x.rating && x.rest); const pickForm = items.length > 0 && items.every(x => x.own) && (trust || items.length > 1);   // one item with an impact may be her 2.6 rating (B;Res;) – trusted only when it is her ▾ pick
  let carried = ''; out.forEach(x => { if (x.rating) carried = x.rating; else { x.carried = carried; if (x.own) carried = x.own; } });
  return { items, pickForm };
}
function vwParse(text, trust) { const out = []; const T = impTokens(text, trust);
  T.items.forEach(x => { let rest = x.rest;
    const rm = rest.match(/\((Full|Partial|Seasonal|Panoramic|Limited|Filtered)\)/i) || rest.match(/\b(panoramic|partial|limited|filtered|seasonal|ltd ?sght|ltd|unobstructed)\b/i); const range = rm ? ({ panoramic: 'Full', unobstructed: 'Full', limited: 'Partial', filtered: 'Partial', ltdsght: 'Partial', 'ltd sght': 'Partial', ltd: 'Partial' }[rm[1].toLowerCase()] || rm[1][0].toUpperCase() + rm[1].slice(1).toLowerCase()) : '';
    rest = rest.replace(/\((Full|Partial|Seasonal|Panoramic|Limited|Filtered)\)/i, '').replace(/\b(panoramic|partial|limited|filtered|seasonal|ltd ?sght|ltd|unobstructed)\b/ig, '').replace(/\s+/g, ' ').trim();
    if (!rest) { if (range && out.length && !out[out.length - 1].range) out[out.length - 1].range = range; return; }   // her 2.6 "LtdSght" on its own: the range of the view before it
    const key = rest.toLowerCase().replace(/[^a-z]/g, ''); let ty = VIEW_TYPES.find(t => t.toLowerCase() === key || camelWords(t).toLowerCase().replace(/[^a-z]/g, '') === key);
    if (!ty) { const m2 = VIEW_MAP.find(([re]) => re.test(rest)); ty = m2 ? m2[1] : 'Other'; }
    const fixedOther = ty === 'Other' && /power|wire|pwr/i.test(rest) ? 'Adverse' : '';
    const impact = T.pickForm ? x.own : (VW_FIXED[ty] || fixedOther || x.own || x.carried || (VW_SCENIC.includes(ty) ? 'Beneficial' : 'Neutral'));
    out.push({ type: ty, impact, range, other: ty === 'Other' ? rest.slice(0, 33) : '' }); });
  return out; }
const vwText = L => L.map(x => `${x.impact}: ${x.type === 'Other' ? (x.other || 'Other') : camelWords(x.type)}${x.range ? ` (${x.range})` : ''}`).join('; ');
/* the answer as text, and back: official labels joined by "; " (Other: her words) */
const pkText = (spec, vals, other) => vals.map(v => v === 'Other' && other ? other : (spec.opts.find(o => o[0] === v) || [v, v])[1].replace(/ \(.*\)$/, '')).join('; ');
/* everyday words that mean an allowed answer (MLS, her archive) – they are read as that answer, not flagged */
const PK_ALIAS = { status: { closed: 'SettledSale', sold: 'SettledSale', settled: 'SettledSale', expired: 'OffMarket', withdrawn: 'OffMarket', cancelled: 'OffMarket', canceled: 'OffMarket', undercontract: 'Pending', contingent: 'Pending', comingsoon: 'Active' },
  cool: { centralair: 'Centralized', central: 'Centralized', ac: 'Centralized', heatpump: 'Centralized', nocoolinglisted: 'None', nocooling: 'None', none: 'None', ductless: 'Individual', minisplit: 'Individual', wallunit: 'Individual', windowunit: 'Individual' },
  heat: { forcedair: 'ForcedWarmAir', fau: 'ForcedWarmAir', fwa: 'ForcedWarmAir', forcedairnaturalgas: 'ForcedWarmAir', wallfurnace: 'Other', floorfurnace: 'GravityAir', gravity: 'GravityAir', ductless: 'MiniSplit', heatpump: 'Other', radiantfloor: 'Radiant', naturalgas: '', gas: '', electric: '', propane: '', energystarqualifiedequipment: '', baseboard: 'Baseboard', hwbb: 'Baseboard', woodstove: 'Stove' },
  topo: { level: 'Flat', flat: 'Flat', gentleslope: 'Sloping', slope: 'Sloping', sloped: 'Sloping', hillside: 'Sloping' },
  attach: { det: 'Detached', att: 'Attached', semidetached: 'SemiDetached', sd: 'SemiDetached' },
  terms: { conv: 'Conventional', conventional: 'Conventional', cash: 'Cash', usda: 'USDARuralDevelopment', seller: 'Private', sellerfinancing: 'Private' },
  xferTerms: { armlth: 'TypicallyMotivated', armslength: 'TypicallyMotivated', reo: 'REOSale', short: 'ShortSale', estate: 'EstateSale', trust: 'EstateSale', relo: 'RelocationSale', crtord: 'CourtOrderedNonForeclosureSale', nonarm: 'SaleBetweenRelatedParties' },
  energy: { solarowned: 'SolarOwned', ownedsolar: 'SolarOwned', solarpanelsowned: 'SolarOwned', solarleased: 'SolarLeased', leasedsolar: 'SolarLeased', solarppa: 'SolarPPA', solarpanels: 'Solar', solar: 'Solar', photovoltaic: 'Solar', windturbine: 'WindTurbine', wind: 'WindTurbine', geothermal: 'Geothermal', none: 'None' },
  primaryAccess: { public: 'PublicStreet', publicstreet: 'PublicStreet', publicroad: 'PublicStreet', private: 'PrivateStreet', privatestreet: 'PrivateStreet', privateroad: 'PrivateStreet', privatelane: 'PrivateStreet' },
  hazard: { none: 'None', nohazardzonenoted: 'None', floodzone: 'FEMASpecialFloodHazardArea', fema: 'FEMASpecialFloodHazardArea', sfha: 'FEMASpecialFloodHazardArea', floodway: 'FEMASpecialFloodHazardArea' },
  zoning: { legal: 'Legal', legalnonconforming: 'LegalNonConforming', nonconforming: 'LegalNonConforming' } };
function pkParse(spec, text) { let t = String(text || '').trim(); if (!t) return { vals: [], other: '', ok: true };
  let surf = '', surfOk = true; if (spec.surface) { const m = t.match(/^(.*?)\s*\|\s*(.*)$/); if (m) { t = m[1].trim(); const w = m[2].trim(); const hit = spec.surface.find(x => x.toLowerCase() === w.toLowerCase()); surf = hit || w; surfOk = !w || !!hit; } }   // "Collector street | Asphalt"
  const R = pkParse0(spec, t); R.surf = surf; if (!surfOk) R.ok = false; return R; }
function pkParse0(spec, t) { if (!t) return { vals: [], other: '', ok: true };
  const parts = spec.multi ? t.split(/;\s*|,\s*/) : [t]; const vals = []; let other = '', ok = true;
  const al = PK_ALIAS[Object.keys(PICK).find(k => PICK[k] === spec || PICK[k].title === spec.title)] || {};
  parts.forEach(p => { const om = p.match(/^other\s*:\s*(.+)$/i); if (om && spec.opts.some(o => o[0] === 'Other')) { vals.push('Other'); other = (other ? other + ', ' : '') + om[1].trim(); return; }   // "Other: Wall heater" (her 2.6 shorthand read into 3.6)
    const k = p.toLowerCase().replace(/[^a-z0-9]/g, ''); if (al[k] === '') return; const hit = (al[k] && spec.opts.find(o => o[0] === al[k])) || spec.opts.find(([v, l]) => v.toLowerCase() === k || l.toLowerCase().replace(/ \(.*\)$/, '').replace(/[^a-z0-9]/g, '') === k || l.toLowerCase().replace(/[^a-z0-9]/g, '') === k);
    if (hit) vals.push(hit[0]); else if (spec.other) { vals.push('Other'); other = (other ? other + ', ' : '') + p; } else ok = false; });
  return { vals, other, ok }; }
/* valid = empty, or every part is an allowed answer; "Other" words count only when they came from ▾ pick (marker), so a 2.6 code like DT2;Ranch turns red */
function pkValid(id, text, marker) { const t = String(text || '').trim(); if (!t || (marker && marker === t)) return true;
  if (id === 'view') return vwParse(t).every(x => x.type !== 'Other'); const S = PICK[id]; if (!S) return true; const P = pkParse({ ...S, other: 0 }, t); return P.ok; }
const pkBtn = (who, id) => (PICK[id] || id === 'view') ? ` <button type="button" class="btn xs" data-uadpick="${who}|${id}" title="Pick from the UAD 3.6 list">▾ pick</button>` : '';
function pkSave(J, who, id, txt) { const c = who === 'subj' ? null : J.comps.find(x => x.id === who); const G = G0(J);
  if (c) { wbFactSet(J, c, id, txt); c.edit = c.edit || {}; if (txt) c.edit['pk_' + id] = txt; else delete c.edit['pk_' + id];
    if (id === 'sfSource') { if (txt) c.edit.sfSource = txt; else delete c.edit.sfSource; }
    if (id === 'xferTerms') { const P = txt ? pkParse(PICK.xferTerms, txt) : null; if (P && P.vals[0]) c.edit.saleType = P.vals[0] === 'Other' ? 'Other: ' + (P.other || 'Other') : P.vals[0]; else delete c.edit.saleType; } /* the comp's Sale type line shows the same answer */ } else { if (txt) { G.subj[id] = txt; G.subj['pk_' + id] = txt; } else { delete G.subj[id]; delete G.subj['pk_' + id]; } } save(); render(); toast((PICK[id] ? PICK[id].title : id === 'adu' ? 'Outbuildings' : 'View') + ': ' + (txt || 'cleared')); }
function uadPick(who, id) {
  const J = app.job; const c = who === 'subj' ? null : J.comps.find(x => x.id === who); const F = c ? compFacts(c, J) : subjFacts(J); const name = c ? 'Comp ' + (c.use || '') + ' ' + compTitle(c) : 'Subject';
  const bg = document.createElement('div'); bg.className = 'sheetbg';
  if (id === 'view') { let L = vwParse(F.view); if (!L.length) L = [{ type: 'Residential', impact: 'Neutral', range: '', other: '' }];
    const draw = () => { bg.innerHTML = `<div class="sheet"><h2>View – ${esc(name)}</h2><p class="help">UAD 3.6 view types, each with its impact and range (Full, Partial, Seasonal). Add as many as apply; the first is the primary view.</p>
      <table class="mini si">${L.map((x, i) => `<tr><td><select data-vw="${i}|type">${VIEW_TYPES.map(t => `<option value="${t}" ${x.type === t ? 'selected' : ''}>${esc(camelWords(t))}</option>`).join('')}</select>${x.type === 'Other' ? `<input class="txt sm" data-vw="${i}|other" maxlength="33" placeholder="Describe (33)" value="${esc(x.other)}">` : ''}</td>
        <td><select data-vw="${i}|impact">${['Neutral', 'Beneficial', 'Adverse'].map(t => `<option ${x.impact === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td><select data-vw="${i}|range"><option value="">range –</option>${['Full', 'Partial', 'Seasonal'].map(t => `<option ${x.range === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td><button class="btn xs" data-vwdel="${i}">✕</button></td></tr>`).join('')}</table>
      <div class="row"><button class="btn sm" data-vwadd="1">+ Add a view</button><span class="grow"></span><button class="btn primary" data-pksave="1">Use these</button><button class="btn" data-pkclose="1">Cancel</button></div><p class="help">Shows as: <b>${esc(vwText(L))}</b></p></div>`; };
    draw(); document.body.appendChild(bg);
    bg.addEventListener('change', e => { const d = e.target.dataset.vw; if (!d) return; const [i, k] = d.split('|'); L[+i][k] = e.target.value; draw(); });
    bg.addEventListener('click', e => { const t = e.target; if (t.dataset.vwadd) { L.push({ type: 'Mountain', impact: 'Beneficial', range: 'Partial', other: '' }); draw(); } else if (t.dataset.vwdel) { L.splice(+t.dataset.vwdel, 1); draw(); }
      else if (t.dataset.pkclose || t === bg) bg.remove(); else if (t.dataset.pksave) { bg.remove(); pkSave(J, who, 'view', vwText(L)); } });
    return; }
  const S = PICK[id]; const now = F[id] != null ? String(F[id]) : ''; const mk = c ? (c.edit || {})['pk_' + id] : (G0(J).subj || {})['pk_' + id]; const strict = pkParse({ ...S, other: 0 }, now); const cur = mk === now ? pkParse(S, now) : { ...strict, vals: strict.ok ? strict.vals : [], other: '' }; let vals = cur.vals.slice(), other = cur.other, surf = cur.surf || strict.surf || '';
  // the CRS mortgage history only says whether a loan was recorded – suggest, she confirms the type
  let sugg = ''; if (id === 'terms' && !strict.ok && !vals.length) { if (/no loan/i.test(now)) { vals = ['Cash']; sugg = 'No loan was recorded with the deed (CRS mortgage history) – usually a cash sale. Confirm, or pick the financing if the MLS or agent says otherwise.'; }
    else if (/loan:/i.test(now)) { vals = ['Conventional']; sugg = 'A loan was recorded (CRS mortgage history: ' + now.replace(/^Loan:\s*/i, '') + '). The deed does not say the loan type – Conventional is suggested; pick FHA, VA … if the MLS or agent says so.'; } }
  const draw = () => { bg.innerHTML = `<div class="sheet uadpick"><h2>${esc(S.title)} – ${esc(name)}</h2>${!cur.ok || (!strict.ok && now) ? `<p class="help warnTxt">Now: “${esc(now)}” – not a UAD 3.6 answer. ${sugg ? esc(sugg) : 'Pick one.'}</p>` : ''}
    <div class="pkgrid"><div class="pkopts">${S.opts.map(([v, l, hlp]) => `<label class="check pk"><input type="${S.multi ? 'checkbox' : 'radio'}" name="pk" value="${esc(v)}" ${vals.includes(v) ? 'checked' : ''}> <b>${esc(l)}</b>${hlp ? `<small>${esc(hlp)}</small>` : ''}</label>`).join('')}
      ${S.surface ? `<label class="fld"><span>Surface (required with the street type)</span><select data-pksurf="1"><option value="">pick…</option>${S.surface.map(x => `<option ${x === surf ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
      ${S.other ? `<label class="fld" ${vals.includes('Other') ? '' : 'hidden'} id="pkOther"><span>Other – describe (up to ${S.other} characters)</span><input class="txt" maxlength="${S.other}" value="${esc(other)}" data-pkother="1"></label>` : ''}</div>
      <div class="pkguide"><b>UAD guidance</b><p>${esc(S.help || '')}</p></div></div>
    <div class="row"><button class="btn ghost" data-pkclear="1">Clear</button><span class="grow"></span><button class="btn primary" data-pksave="1">OK</button><button class="btn" data-pkclose="1">Cancel</button></div></div>`; };
  draw(); document.body.appendChild(bg);
  bg.addEventListener('change', e => { const t = e.target; if (t.name === 'pk') { vals = S.multi ? [...bg.querySelectorAll('input[name=pk]:checked')].map(x => x.value) : [t.value]; if (S.multi && vals.includes('None') && vals.length > 1) vals = t.value === 'None' ? ['None'] : vals.filter(v => v !== 'None');
      bg.querySelectorAll('input[name=pk]').forEach(x => { x.checked = vals.includes(x.value); }); const o = bg.querySelector('#pkOther'); if (o) o.hidden = !vals.includes('Other'); } if (t.dataset.pkother) other = t.value.trim(); if (t.dataset.pksurf) surf = t.value; });
  bg.addEventListener('click', e => { const t = e.target; if (t.dataset.pkclose || t === bg) bg.remove(); else if (t.dataset.pkclear) { bg.remove(); pkSave(J, who, id, ''); }
    else if (t.dataset.pksave) { if (vals.includes('Other') && !other) { toast('Describe “Other” first'); return; } bg.remove(); pkSave(J, who, id, pkText(S, vals, other) + (S.surface && surf && vals.length ? ' | ' + surf : '')); } });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-uadpick]'); if (!b || !app.job) return; e.stopPropagation(); const [who, id] = b.dataset.uadpick.split('|'); uadPick(who, id); }, true);
/* ---- vehicle storage (ACI's Garage/Carport box, in 3.6 terms): None, or up to 5 lines of spaces + type (+ attached / detached / built-in) ---- */
const VS_TYPES = [['Garage', 'Garage'], ['Carport', 'Carport'], ['Driveway', 'Driveway'], ['SharedDriveway', 'Shared driveway'], ['ParkingGarage', 'Parking garage'], ['CommonCarport', 'Common carport'], ['OpenLot', 'Open lot'], ['Other', 'Other']];
function vsPick(who) {
  const J = app.job; const c = who === 'subj' ? null : J.comps.find(x => x.id === who); const F = c ? compFacts(c, J) : subjFacts(J); const name = c ? 'Comp ' + (c.use || '') + ' ' + compTitle(c) : 'Subject';
  const g = k => c ? V(c, k) : null; let L = [];
  if (c && c.edit && Array.isArray(c.edit.vs)) L = c.edit.vs.map(x => ({ ...x })); else if (!c && Array.isArray(G0(J).subj.vs)) L = G0(J).subj.vs.map(x => ({ ...x }));
  else { const gt = String((c ? g('garageType') : '') || ''); if (+F.garage > 0) L.push({ n: +F.garage, t: 'Garage', a: /built/i.test(gt) ? 'BuiltIn' : /detach/i.test(gt) ? 'Detached' : /attach/i.test(gt) ? 'Attached' : '' }); if (+F.carport > 0) L.push({ n: +F.carport, t: 'Carport', a: '' }); const dw = c ? num(g('driveway')) : null; if (dw) L.push({ n: dw, t: 'Driveway', a: '' }); }
  let none = !L.length && (c ? (c.edit || {}).vsNone : G0(J).subj.vsNone) === true;
  while (L.length < 5) L.push({ n: '', t: '', a: '' });
  const bg = document.createElement('div'); bg.className = 'sheetbg';
  const draw = () => { bg.innerHTML = `<div class="sheet uadpick"><h2>Vehicle storage – ${esc(name)}</h2><div class="pkgrid"><div>
    <label class="check"><input type="checkbox" data-vsnone="1" ${none ? 'checked' : ''}> None</label>
    <table class="mini"><tr><th># of spaces</th><th>Attached / detached / built-in<br><small>(driveway: surface)</small></th><th>Type</th></tr>${L.map((x, i) => { const att = !x.t || ['Garage', 'Carport'].includes(x.t); return `<tr><td><input class="txt xs num" data-vs="${i}|n" value="${esc(x.n ?? '')}" style="width:4em" ${none ? 'disabled' : ''}></td>
      <td>${['Driveway', 'SharedDriveway'].includes(x.t) ? `<select data-vs="${i}|s" title="Driveway surface"><option value="">surface –</option>${['Asphalt', 'Brick', 'Concrete', 'Cobblestone', 'Dirt', 'Gravel', 'Other'].map(v => `<option ${x.s === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : `<select data-vs="${i}|a" ${none || !att ? 'disabled' : ''} title="For a garage or carport"><option value="">–</option>${[['Attached', 'Attached'], ['Detached', 'Detached'], ['BuiltIn', 'Built-in']].map(([v, l]) => `<option value="${v}" ${x.a === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`}</td>
      <td><select data-vs="${i}|t" ${none ? 'disabled' : ''}><option value="">–</option>${VS_TYPES.map(([v, l]) => `<option value="${v}" ${x.t === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
</tr>`; }).join('')}</table></div>
    <div class="pkguide"><b>UAD guidance</b><p>Give the type of parking and the number of spaces for each type (3.6 Vehicle Storage: Type | Spaces | Detail). A garage or carport also gets its attachment (attached, detached, built-in); a driveway its surface (Asphalt, Concrete, Gravel …) and spaces (10 or more = “10 or More”). The 3.6 line is always required – list every type the property has (Fannie’s samples list the driveway with the garage).</p></div></div>
    <div class="row"><span class="grow"></span><button class="btn primary" data-vssave="1">OK</button><button class="btn" data-vsclose="1">Cancel</button></div></div>`; };
  draw(); document.body.appendChild(bg);
  bg.addEventListener('change', e => { const t = e.target; if (t.dataset.vsnone) { none = t.checked; draw(); return; } const d = t.dataset.vs; if (!d) return; const [i, k] = d.split('|'); L[+i][k] = k === 'n' ? (t.value.trim() === '' ? '' : Math.max(0, Math.round(+t.value) || 0)) : t.value; if (k === 't') draw(); });
  bg.addEventListener('click', e => { const t = e.target; if (t.dataset.vsclose || t === bg) { bg.remove(); return; } if (!t.dataset.vssave) return;
    const rows = none ? [] : L.filter(x => x.t && +x.n > 0); const sum = ty => rows.filter(x => x.t === ty).reduce((s, x) => s + +x.n, 0);
    const gar = sum('Garage'), cpt = sum('Carport') + sum('CommonCarport'), dw = sum('Driveway') + sum('SharedDriveway'); const ga = (rows.find(x => x.t === 'Garage') || {}).a || '';
    const txt = none ? 'None' : rows.map(x => `${x.n} ${['Garage', 'Carport'].includes(x.t) && x.a ? x.a.replace('BuiltIn', 'built-in').toLowerCase() + ' ' : ''}${(VS_TYPES.find(v => v[0] === x.t) || [, x.t])[1].toLowerCase()}${x.s ? ' (' + x.s.toLowerCase() + ')' : ''}`).join(', ');   // her order: 2 attached garage
    if (c) { const E = c.edit = c.edit || {}; E.garage = none ? 0 : gar; E.carport = none ? 0 : cpt; E.driveway = none ? 0 : dw; E.garageType = ga === 'BuiltIn' ? 'Built-in' : ga; E.vs = rows; E.vsNone = none; E.grid_vsText = txt; }
    else { const S = G0(J).subj; S.garage = none ? 0 : gar; S.carport = none ? 0 : cpt; S.vs = rows; S.vsNone = none; S.vsText = txt; }
    bg.remove(); save(); render(); toast('Vehicle storage: ' + (txt || 'cleared')); });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-vspick]'); if (!b || !app.job) return; e.stopPropagation(); vsPick(b.dataset.vspick); }, true);
