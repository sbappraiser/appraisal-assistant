/* =====================================================================
   Adjustment grid (UAD 3.6 sales comparison), Oct 2026.
   She makes every adjustment.  The grid only does the arithmetic she asks for:
   type an amount in any cell, or type a rate once (per sq ft, per usable acre,
   per bath, per space, % per month) and the cells without your own amount use it.
   Usable Lot Area/Utility: only from her archive or her own measurement.
   ===================================================================== */
const ADJ_ROWS = [
  // [id, label, section, UAD adjustment line (null = no adjustment), rate key]
  ['price', 'Sale price', 'Sales and listing', null],
  ['ppsf', 'Price per sq ft (living area)', 'Sales and listing', null],
  ['src', 'Data source', 'Sales and listing', null],
  ['prox', 'Proximity to subject', 'Sales and listing', null],
  ['status', 'Listing status', 'Sales and listing', null],
  ['listPrice', 'List price (final)', 'Sales and listing', null],
  ['origList', 'Original list price', 'Sales and listing', null],
  ['listDate', 'Listing date', 'Sales and listing', null],
  ['terms', 'Transfer terms (financing)', 'Sales and listing', 'FinancingMethod'],
  ['conc', 'Known sales concessions', 'Sales and listing', 'SalesConcessions'],
  ['contract', 'Contract date', 'Sales and listing', 'ContractDate'],
  ['sale', 'Sale date (market conditions)', 'Sales and listing', 'SaleDate', 'timePct'],
  ['dom', 'Days on market', 'Sales and listing', null],
  ['stl', 'Sale-to-list price ratio', 'Sales and listing', 'SaleToListPriceRatio'],
  ['rights', 'Property rights appraised', 'Sales and listing', 'PropertyRightsAppraised'],
  ['ownRights', 'Ownership rights conveyed', 'Sales and listing', 'OwnershipRightsConveyed'],
  ['xferTerms', 'Ownership transfer terms', 'Sales and listing', 'PropertyOwnershipTransferTerms'],
  ['cdom', 'Cumulative days on market', 'Sales and listing', null],
  ['lastRed', 'Last price reduction', 'Sales and listing', null],
  ['project', 'Project name', 'Project (HOA)', null],
  ['hoa', 'HOA fee ($ / month)', 'Project (HOA)', null],
  ['hoaAmen', 'HOA amenities (common area)', 'Project (HOA)', 'ProjectInformation'],
  ['landCommon', 'Site owned in common (no land owned)', 'Site', 'LandOwnedInCommon'],
  ['site', 'Site size', 'Site', 'SiteSize'],
  ['nbhd', 'Market area name', 'Site', 'NeighborhoodName'],
  ['loc', 'Location (site influence)', 'Site', 'SiteInfluence'],
  ['view', 'View', 'Site', 'View', ['viewStep', 'viewPct']],
  ['usable', 'Usable Lot Area/Utility', 'Site', 'OTHER', 'usableAc', 'Usable Lot Area/Utility'],
  ['land', 'Landscaping', 'Site', 'OTHER', ['landStep'], 'Landscaping'],   // her SFREP template needs an Add Other row named exactly "Landscaping"
  ['topo', 'Topography', 'Site', 'Topography'],
  ['siteChar', 'Site characteristics', 'Site', 'SiteCharacteristic'],
  ['drain', 'Site drainage', 'Site', 'SiteDrainage'],
  ['waterFront', 'Water frontage', 'Site', 'WaterFrontage'],
  ['streetAccess', 'Street access and surface', 'Site', 'PropertyStreetAccessAndSurface'],
  ['primaryAccess', 'Primary access', 'Site', 'PropertyPrimaryAccess'],
  ['easement', 'Easement', 'Site', 'Easement'],
  ['hazard', 'Hazard zone', 'Site', 'HazardZone'],
  ['zoning', 'Zoning compliance', 'Site', 'ZoningCompliance'],
  ['envCond', 'Apparent environmental condition', 'Site', 'ApparentEnvironmentalCondition'],
  ['restrict', 'Property restriction', 'Site', 'PropertyRestriction'],
  ['native', 'Native American lands', 'Site', 'NativeAmericanLands'],
  ['year', 'Year built', 'Dwelling', 'YearBuilt'],
  ['style', 'Design (style)', 'Dwelling', 'DwellingStyle'],
  ['attach', 'Attached / detached', 'Dwelling', 'AttachedOrDetached', 'attach'],
  ['levels', 'Levels (stories)', 'Dwelling', 'LivingUnitLevelCount'],   // her note (Oct 20 2026): on the 3.6 grid; MLS story tag, or her 2.6 Design line (DT1, DT2, AT2 …) in the archive
  ['structure', 'Structure (low-rise, mid-rise, townhouse…)', 'Dwelling', null],
  ['unitPos', 'Unit location (interior / corner / end)', 'Dwelling', 'CornerUnit', 'unitPos'],
  ['floor', 'Floor (unit level)', 'Dwelling', 'LivingUnitFloorNumber'],
  ['energy', 'Energy efficient features', 'Dwelling', 'EnergyEfficientAndGreenFeatures'],
  ['constr', 'Construction method', 'Dwelling', 'ConstructionMethod'],
  ['disaster', 'Disaster mitigation features', 'Dwelling', 'DisasterMitigationFeatures'],
  ['heat', 'Heating', 'Dwelling', 'HeatingSystem'],
  ['cool', 'Cooling (air conditioning)', 'Dwelling', 'CoolingSystem', 'cool'],
  ['beds', 'Bedrooms', 'Dwelling', 'LivingUnitBedroomCount', 'bed'],
  ['baths', 'Baths (full / half)', 'Dwelling', 'LivingUnitBathroomCount', 'bath'],
  ['gla', 'Living area above grade (sq ft)', 'Dwelling', 'LivingUnitStandardFinishedAreaAboveGrade', 'gla'],
  ['bsmt', 'Below grade finished (sq ft)', 'Dwelling', 'LivingUnitStandardFinishedAreaBelowGrade', 'bsmtFin'],
  ['bsmtUnf', 'Below grade unfinished (sq ft)', 'Dwelling', 'LivingUnitUnfinishedAreaBelowGrade', 'bsmtUnf'],
  ['agUnf', 'Above grade unfinished (sq ft)', 'Dwelling', 'LivingUnitUnfinishedAreaAboveGrade', 'agUnf'],
  ['nsAbove', 'Non-standard finished above grade (sq ft)', 'Dwelling', 'LivingUnitNonStandardFinishedAreaAboveGrade', 'nsAbove'],
  ['nsBelow', 'Non-standard finished below grade (sq ft)', 'Dwelling', 'LivingUnitNonStandardFinishedAreaBelowGrade', 'nsBelow'],
  ['nonCont', 'Non-continuous finished area', 'Dwelling', 'NonContinuousFinishedArea', 'nonCont'],
  ['gba', 'Gross building finished area', 'Dwelling', 'GrossBuildingFinishedArea'],
  ['disab', 'Features for individuals with disabilities', 'Dwelling', 'LivingUnitFeaturesForIndividualsWithDisabilities'],
  ['window', 'Window surface area', 'Dwelling', 'WindowSurfaceArea'],
  ['volume', 'Total dwelling volume', 'Dwelling', 'TotalDwellingVolume'],
  ['mhWidth', 'Manufactured home width', 'Dwelling', 'ManufacturedHomeWidth'],
  ['backToBack', 'Rowhouse / townhouse back-to-back', 'Dwelling', 'RowhouseTownhouseBackToBack'],
  ['rowLoc', 'Rowhouse / townhouse location', 'Dwelling', 'RowhouseTownhouseLocation'],
  ['q', 'Overall quality', 'Dwelling', 'OverallQualityRating', ['qStep', 'qPct']],
  ['c', 'Overall condition', 'Dwelling', 'OverallConditionRating', ['cStep', 'cPct']],
  ['func', 'Functional utility (functional issues)', 'Dwelling', 'FunctionalIssues'],
  ['porch', 'Porch / patio / deck', 'Amenities', 'OutdoorLivingAmenity'],
  ['pool', 'Water features (pool / spa / pond / lake)', 'Amenities', 'WaterFeaturesAmenity', ['pool', 'spa', 'pond', 'lake']],
  ['courts', 'Tennis / sport court', 'Amenities', 'OutdoorAccessoryAmenity', ['tennis', 'sport']],
  ['adu', 'ADU / guest house / outbuildings', 'Amenities', 'Outbuilding', ['aduSf', 'aduBath', 'aduHalf']],
  ['aduLoc', 'ADU location', 'Amenities', 'AccessoryDwellingUnitLocation'],
  ['wholeHome', 'Whole home amenities', 'Amenities', 'WholeHomeAmenity'],
  ['other', 'Other amenities', 'Amenities', 'MiscellaneousAmenity'],
  ['garage', 'Vehicle storage – garage spaces', 'Amenities', 'VehicleStorage', 'space'],
  ['carport', 'Vehicle storage – carport spaces', 'Amenities', 'VehicleStorage', 'cpSpace'],
];
const LOT_UTILITY = 'Usable Lot Area/Utility';      // her exact SFREP template "Add Other" row name (must match letter for letter)
const RATES = { gla: ['$ per sq ft', 'subject − comp sq ft × rate'], agUnf: ['$ per sq ft', 'subject − comp unfinished above-grade sq ft × rate'], nsAbove: ['$ per sq ft', 'subject − comp non-standard above-grade sq ft × rate'], nsBelow: ['$ per sq ft', 'subject − comp non-standard below-grade sq ft × rate'], nonCont: ['$ per sq ft', 'subject − comp non-continuous sq ft × rate'], usableAc: ['$ per usable acre', 'subject − comp usable acres × rate'], bed: ['$ per bedroom', 'bedroom difference × rate'],
  bath: ['$ per full bath', 'full-bath difference × rate (half baths at half the rate)'], space: ['$ per garage space', 'space difference × rate'], timePct: ['% per month', 'months from sale to effective date × % × price'],
  pool: ['$ pool', 'has / has not'], spa: ['$ spa', 'has / has not'], pond: ['$ pond', 'has / has not'], lake: ['$ lake', 'has / has not'], tennis: ['$ tennis court', 'has / has not'], sport: ['$ sport court', 'has / has not'] };
Object.assign(RATES, { qStep: ['$ per quality step', 'whole steps, thirds for low / mid / high'], qPct: ['% of price per quality step', 'whole steps, thirds for low / mid / high'],
  cStep: ['$ per condition step', 'whole steps, thirds for low / mid / high'], cPct: ['% of price per condition step', 'whole steps, thirds for low / mid / high'],
  viewStep: ['$ per view tier', 'adverse · neutral · beneficial limited · average · excellent / panoramic'], viewPct: ['% of price per view tier', 'adverse · neutral · beneficial limited · average · excellent / panoramic'],
  landStep: ['$ per landscaping step', 'minimal · fair · avg-fair · average · avg-good · good · very good · excellent'],
  aduSf: ['$ per ADU / guest sq ft', 'finished ADU, guest house and other living outbuildings (not storage)'], aduBath: ['$ per ADU / guest bath', 'baths in the ADU / guest house / outbuildings – set it for this property'] });
const FINE = { low: -1 / 3, mid: 0, high: 1 / 3 };
const fineOf = (J, who, k) => ((G0(J).fine || {})[who] || {})[k] || fineArch(J, who, k) || 'mid';
// a tier from her archive note counts only while the comp still carries that same rating (e.g. "C3|high" with condition C3)
function fineArch(J, who, k) { if (who === 'subj') return ''; const c = (J.comps || []).find(x => x.id === who); if (!c) return '';
  const t = String(V(c, k + 'Tier') || ''), r = String(V(c, k === 'q' ? 'quality' : 'condition') || '').toUpperCase().match(/[QC]\d/); return t && r && t.split('|')[0] === r[0] ? t.split('|')[1] : ''; }
const ratingPos = (v, fine) => { const m = String(v || '').match(/(\d)/); return m ? -(+m[1]) + (FINE[fine] || 0) : null; };   // higher = better; Q2 > Q4; high C3 > low C3
const viewTier = v => { const t = String(v || '').toLowerCase(); if (!t.trim()) return null; if (/adverse/.test(t)) return -1; if (/neutral/.test(t)) return 0;
  if (/beneficial|ocean|mountain|city|lake|golf|canyon|panoram/.test(t)) return /panoram|excellent/.test(t) ? 3 : /limited/.test(t) ? 1 : 2; return null; };
/* her view tier for each column (Oct 19 2026): the tier read from the view text is only a starting point – "Golf" alone reads as beneficial average, two tiers above neutral; she picks the tier */
const VIEW_TIERS = [[-1, 'Adverse'], [0, 'Neutral'], [1, 'Beneficial – limited'], [2, 'Beneficial – average'], [3, 'Beneficial – excellent / panoramic']];
// her own view tiers, kept by address for the next assignment (kv 'viewTiers' = {addrKey: {t, at}}) – her ACI archive has no view grade
let MYVT = {}; DB.get('kv', 'viewTiers').then(r => { MYVT = (r && r.v) || {}; }).catch(() => {});
const vtKey = (J, who) => { if (who === 'subj') { const S = J.subject || {}; return S.addr ? addrKey((S.addr || '') + (S.unit ? ' #' + S.unit : '')) : ''; } const c = (J.comps || []).find(x => x.id === who); return c ? addrKey(compTitle(c)) : ''; };
function vtInfo(J, who, text) { const o = ((G0(J).viewT || {})[who]); if (!(o === undefined || o === null || o === '')) return { t: +o, src: 'yours' };
  const k = vtKey(J, who), m = k && MYVT[k]; if (m && m.t !== undefined) return { t: +m.t, src: 'saved', at: m.at };
  const t = viewTier(text); return { t, src: t === null ? null : 'read' }; }
const vtOf = (J, who, text) => vtInfo(J, who, text).t;
function vtRemember(J, who, t) { const k = vtKey(J, who); if (!k) return; if (t === null) delete MYVT[k]; else MYVT[k] = { t, at: todayISO() }; DB.put('kv', { id: 'viewTiers', v: MYVT }); }
function vtSel(who, J, text) { const I = vtInfo(J, who, text); const lab = t => (VIEW_TIERS.find(x => x[0] === t) || [, ''])[1];
  const first = I.src === 'yours' ? '' : I.src === 'saved' ? lab(I.t) + ' (yours, ' + showDate(I.at) + ')' : I.t === null ? 'tier?' : lab(I.t) + ' (read – check it)';
  return ` <select class="fine${I.src === 'yours' || I.src === 'saved' ? '' : ' arch'}" data-gvt="${who}" title="The degree of view used for the view adjustment (one step per tier). ${I.src === 'yours' ? 'Your choice for this assignment.' : I.src === 'saved' ? 'Your tier for this address from an earlier assignment.' : 'Only read from the words – decide the degree of view and pick it.'}"><option value="">${first || 'clear'}</option>${VIEW_TIERS.map(([n, l]) => `<option value="${n}" ${I.src === 'yours' && I.t === n ? 'selected' : ''}>${l}</option>`).join('')}</select>`; }
const aduNums = F => { if (F.aduSf !== undefined && F.aduSf !== null && F.aduSf !== '') return { sf: +F.aduSf || 0, baths: +F.aduBaths || 0 };
  const t = String(F.adu || ''); if (!t.trim() || /^(no|none)$/i.test(t.trim())) return { sf: 0, baths: 0 };
  const sf = t.match(/([\d,]{2,})\s*(?:sf|sq|square)/i), ba = t.match(/(\d+(?:\.\d)?)\s*(?:full\s*)?ba/i); return { sf: sf ? +sf[1].replace(/,/g, '') : null, baths: ba ? +ba[1] : 0 }; };
RATES.halfBath = ['$ per half bath', 'half-bath difference × rate (blank = half the full-bath rate)'];

/* ---------------- her starting points by market segment and value tier (Oct 18 2026) ----------------
   A general starting point only – she decides on every property. Kept on this computer (kv 'starts'). */
const STARTS_DEFAULT = {
  lowBelow: 3000000, highFrom: 10000000,
  usableAc: { 'Montecito': 1500000, 'Hope Ranch': 1250000, 'Santa Barbara / Goleta': 1000000 },
  tiers: {
    high: { bath: 100000, halfBath: 50000, pool: 200000, spa: 50000, tennis: 250000, sport: 100000, aduSf: 500, aduBath: 50000, aduHalf: 25000, attach: null },
    middle: { bath: 50000, halfBath: 25000, pool: 125000, spa: 25000, tennis: 200000, sport: 50000, aduSf: 400, aduBath: 25000, aduHalf: 12500, attach: null },
    low: { bath: 40000, halfBath: 20000, pool: 85000, spa: 25000, tennis: null, sport: 50000, aduSf: 350, aduBath: 15000, aduHalf: 7500, attach: null },
    condo: { bath: 30000, halfBath: 15000, pool: null, spa: null, tennis: null, sport: null, aduSf: null, aduBath: null, aduHalf: null, attach: 30000 } },   // her condo column (Oct 19 2026): no pool/spa/courts (common area), no usable acre, no ADU
  notes: 'Bedroom: you choose it on each property (the grid asks when a comp has fewer than 3 bedrooms). Quality, design and view: set on each property, usually a % of the sale price across the grid.' };
const ST_KEYS = [['bath', 'Full bath'], ['halfBath', 'Half bath'], ['attach', 'Detached over attached'], ['pool', 'Pool'], ['spa', 'Spa'], ['tennis', 'Tennis court'], ['sport', 'Sport court'], ['aduSf', 'ADU $ per sq ft'], ['aduBath', 'ADU full bath'], ['aduHalf', 'ADU half bath']];
const ST_TIERS = ['high', 'middle', 'low', 'condo'];
let STARTS = null; DB.get('kv', 'starts').then(r => { STARTS = (r && r.v) || JSON.parse(JSON.stringify(STARTS_DEFAULT));
  if (STARTS.usableAc && STARTS.usableAc['Hope Ranch'] === 1275000) STARTS.usableAc['Hope Ranch'] = 1250000;   // her correction Oct 18
  STARTS.tiers = STARTS.tiers || {}; Object.entries(STARTS_DEFAULT.tiers).forEach(([t, d]) => { STARTS.tiers[t] = { ...d, ...(STARTS.tiers[t] || {}) }; Object.keys(d).forEach(k => { if (!(k in (STARTS.tiers[t] || {}))) STARTS.tiers[t][k] = d[k]; }); });   /* her new lines and the condo column join a saved list */
  Object.values(STARTS.tiers || {}).forEach(t => { delete t.bed; }); STARTS.notes = STARTS_DEFAULT.notes; }).catch(() => { STARTS = JSON.parse(JSON.stringify(STARTS_DEFAULT)); });
const startsNow = () => STARTS || STARTS_DEFAULT;
function segGuess(J) { const S = subjFacts(J); const t = [J.subject.addr, J.subject.city, J.subject.zip, S.nbhd, J.name].join(' ');
  return /93108|montecito/i.test(t) ? 'Montecito' : /hope ranch/i.test(t) ? 'Hope Ranch' : 'Santa Barbara / Goleta'; }
function tierGuess(J) { const G = G0(J); const P = startsNow(); { const o = typeof orderOf === 'function' ? orderOf(J) : null; if ((o && /condo/i.test(String(o.propType || ''))) || (J.subject && J.subject.unit)) return 'condo'; } let v = num(G.value); if (!v) { const ps = usedComps(J).map(c => compFacts(c, J).price).filter(Boolean).sort((a, b) => a - b); v = ps.length ? ps[Math.floor((ps.length - 1) / 2)] : null; }
  return v === null ? 'middle' : v >= P.highFrom ? 'high' : v < P.lowBelow ? 'low' : 'middle'; }
function startsFor(J) { const G = G0(J); const P = startsNow(); const seg = G.seg || segGuess(J), tier = G.tier || tierGuess(J); const out = { ...(P.tiers[tier] || {}) }; out.usableAc = tier === 'condo' ? null : (P.usableAc || {})[seg]; return { seg, tier, rates: out }; }
function startsBar(J) { const G = G0(J); const st = startsFor(J); const P = startsNow(); const tl = { high: `High (from ${money(P.highFrom)})`, middle: 'Middle', low: `Low (under ${money(P.lowBelow)})`, condo: 'Condo' };
  const gm = gridMode(J);
  return `<div class="starts"><label><b>Property type</b> <select data-gmode="1">${[['house', 'House'], ['condo', 'Condo'], ['pud', 'PUD']].map(([v, l]) => `<option value="${v}" ${v === gm ? 'selected' : ''}>${l}</option>`).join('')}</select></label> <b>My starting points</b>
    <select data-gseg="1">${Object.keys(P.usableAc).map(s => `<option ${s === st.seg ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
    <select data-gtier="1">${ST_TIERS.map(t => `<option value="${t}" ${t === st.tier ? 'selected' : ''}>${esc(tl[t])}</option>`).join('')}</select>
    <button class="btn sm primary" data-act="starts-use">Use my starting points</button> <button class="btn sm" data-act="starts-edit">${app.startsEdit ? 'Close' : 'Edit my starting points'}</button>
    <small>Fills only the rates you have not typed. ${esc(P.notes || '')}</small>${app.startsEdit ? startsEditor() : ''}</div>`; }
function startsEditor() { const P = startsNow(); const inp = (path, v) => `<input class="txt xs" data-st="${path}" value="${blank(v) ? '' : v}" inputmode="decimal">`;
  return `<div class="stedit"><table><tr><th>$ per usable acre</th>${Object.keys(P.usableAc).map(s => `<td>${esc(s)}<br>${inp('usableAc.' + s, P.usableAc[s])}</td>`).join('')}</tr></table>
    <table><tr><th></th><th>High (from ${inp('highFrom', P.highFrom)})</th><th>Middle</th><th>Low (under ${inp('lowBelow', P.lowBelow)})</th><th>Condo<br><small>no usable acre</small></th></tr>
    ${ST_KEYS.map(([k, l]) => `<tr><th>${esc(l)}</th>${ST_TIERS.map(t => `<td>${inp('tiers.' + t + '.' + k, (P.tiers[t] || {})[k])}</td>`).join('')}</tr>`).join('')}</table>
    <label class="fld"><span>Notes</span><textarea class="txt" rows="2" data-st="notes">${esc(P.notes || '')}</textarea></label>
    <div class="row"><button class="btn sm" data-act="starts-file">Save my starting points to a file</button> <label class="btn sm">Load from a file<input type="file" accept=".json" data-act="starts-load" hidden></label> <button class="btn sm" data-act="starts-reset">Back to the original list</button></div></div>`; }
function startsUse(J) { const G = G0(J); const st = startsFor(J); G.rateFrom = G.rateFrom || {}; let n = 0;
  Object.entries(st.rates).forEach(([k, v]) => { if (blank(v) || !blank(G.rates[k])) return; G.rates[k] = v; G.rateFrom[k] = `${st.seg} · ${st.tier}`; n++; });
  return n; }

RATES.aduHalf = ['$ per ADU / guest half bath', 'half baths in the ADU / guest house (1.5 baths = 1 full + 1 half)']; RATES.attach = ['$ detached over attached', 'a detached unit is one step above an attached one'];
RATES.cool = ['$ cooling over none', 'a comp with air conditioning when the subject has none (or the reverse) – one step'];
RATES.bsmtUnf = ['$ per unfinished below-grade sq ft', 'subject − comp unfinished below-grade sq ft × rate'];
RATES.bsmtFin = ['$ per finished below-grade sq ft', 'subject − comp finished below-grade sq ft × rate'];
RATES.cpSpace = ['$ per carport space', 'carport space difference × rate'];
RATES.unitPos = ['$ corner / end unit over interior', 'a corner or end unit is one step above an interior unit'];
/* ---- property type of the grid (her request, Oct 19 2026): condo and PUD lines; info lines she checks before UAD 3.6 is filled ---- */
const GRID_INFO = { status: 'UAD 3.6', listPrice: 'UAD 3.6', dom: 'UAD 3.6', origList: 'not in UAD 3.6 – for your check', listDate: 'not in UAD 3.6 – for your check', lastRed: 'not in UAD 3.6 – for your exposure time · from the MLS printout History · days to pending below the date', cdom: 'not in UAD 3.6 – for your check', project: 'UAD 3.6', hoa: 'UAD 3.6 (monthly fee)', nbhd: 'UAD 3.6 Neighborhood Name – the same field as the 2.6 neighborhood', loc: 'UAD SiteInfluence – ▾ pick: busy roadway, school, park, commercial, water … each with its impact (flood zone, easement, private road have their own lines)' };
const STRUCTURES = ['Low-rise', 'Mid-rise', 'High-rise', 'Townhouse / rowhouse', 'Semi-detached'];
function gridMode(J) { const G = G0(J); if (G.mode) return G.mode; const o = typeof orderOf === 'function' ? orderOf(J) : null; const pt = String((o && o.propType) || '');
  if (/condo/i.test(pt)) return 'condo'; if (/pud/i.test(pt)) return 'pud'; if (G.tier === 'condo' || (J.subject && J.subject.unit)) return 'condo'; return 'house'; }
const landOwned = (J, F) => { const v = String(F.landCommon || '').trim(); if (v) return /^n/i.test(v); return gridMode(J) !== 'condo'; };   /* condo: site owned in common unless she says the unit owns land */
function rowShown(row, J) { return rowShownMode(row, J) && lineOn(row[0], J); }
function rowShownMode(row, J) { const id = row[0], m = gridMode(J);
  if (['backToBack', 'rowLoc'].includes(id)) return m !== 'house';
  if (['project', 'hoa', 'hoaAmen'].includes(id)) return m !== 'house';
  if (id === 'landCommon') return m !== 'house';
  if (['structure', 'unitPos', 'floor'].includes(id)) return m === 'condo';
  if (m === 'condo') { if (['topo', 'pool', 'courts', 'adu', 'land'].includes(id)) return false;
    if (['usable', 'site'].includes(id)) { const all = [subjFacts(J), ...usedComps(J).map(c => compFacts(c, J))]; return all.some(F => landOwned(J, F)); } }
  return true; }
RATES.bed = ['$ per bedroom (up to 3)', 'bedrooms above + below grade; a difference counts only up to 3 – buyers pay for a 3rd bedroom, not for more (living area covers the rest)'];
const BED_CAP = 3;
const capBeds = v => blank(v) ? null : Math.min(+v, BED_CAP);
const hasFeat = (F, k) => { const t = k === 'tennis' || k === 'sport' ? String(F.courts || '') : String(F.pool || ''); const rx = { pool: /pool/i, spa: /spa|hot ?tub|jacuzzi/i, pond: /pond/i, lake: /lake/i, tennis: /tennis/i, sport: /sport|pickleball|basketball|court(?!.*tennis)/i }[k];
  if (!t.trim() || /^(no|none)$/i.test(t.trim())) return 0; return rx.test(t) ? 1 : 0; };   // nothing entered = none (her rule)

/* days from the last price reduction to the contract (pending / contingent) date – her exposure-time measure */
const redDaysOf = C => { const a = isoDate(C.lastRed), b = isoDate(C.contract); return a && b && b >= a ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null; };
const G0 = J => { if (!J.grid) { J.grid = { rates: {}, cells: {}, weights: {}, subj: {}, value: null, note: '' }; if (typeof GRID_DEFAULT !== 'undefined' && GRID_DEFAULT && GRID_DEFAULT.custom) J.grid.custom = GRID_DEFAULT.custom.map(x => ({ ...x })); } return J.grid; };
/* ---- Location (site influence) picker: UAD 3.6 SiteInfluenceType, each with its own impact and proximity (her request, Oct 20 2026) ----
   Saved as text the grid already reads: "Neutral: Residential; Adverse: Busy roadway (Bordering)". Her 2.6 codes (BusyRd, AdjPrk, Schl …) are read too.
   Flood zone, easements and private roads are not site influences in 3.6 – they have their own lines (Hazard zone, Easement, Street access). */
const SI_TYPES = ['Residential', 'BusyRoadway', 'CommercialArea', 'IndustrialArea', 'HighDensityResidential', 'School', 'Park', 'GreenSpace', 'GolfCourse', 'BodyOfWater', 'Agricultural', 'Airport', 'RailLine', 'PublicTransportationHub',
  'OverheadElectricPowerTransmissionLine', 'LocalDistributionLine', 'HighPressureGasLine', 'OilOrGasWell', 'StormwaterRetention', 'HistoricDistrict', 'Other'];
const siLabel = t => t === 'OverheadElectricPowerTransmissionLine' ? 'Overhead power transmission line' : t.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/ (\w)/g, (m, a) => ' ' + a.toLowerCase()).replace('Or gas', 'or gas');
const SI_OLD = { res: 'Residential', residential: 'Residential', busyrd: 'BusyRoadway', busyroad: 'BusyRoadway', busyroadway: 'BusyRoadway', fwynse: 'BusyRoadway', comm: 'CommercialArea', commercial: 'CommercialArea', schl: 'School', school: 'School', adjschl: 'School',
  adjprk: 'Park', park: 'Park', nearpark: 'Park', golf: 'GolfCourse', wtrfr: 'BodyOfWater', nrwtr: 'BodyOfWater', train: 'RailLine', rail: 'RailLine', ind: 'IndustrialArea', industrial: 'IndustrialArea', powerline: 'OverheadElectricPowerTransmissionLine', pwrln: 'OverheadElectricPowerTransmissionLine' };
function siParse(text) { const out = []; let imp = '';
  String(text || '').split(/;|,(?![^(]*\))/).map(x => x.trim()).filter(Boolean).forEach(tok => { let m = tok.match(/^(Adverse|Beneficial|Neutral)\b\s*[:–-]?\s*(.*)$/i); let rest = tok; if (m) { imp = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(); rest = m[2]; }
    const tail = rest.match(/\s*[–-]\s*(Adverse|Beneficial|Neutral)\s*$/i); if (tail) { imp = tail[1][0].toUpperCase() + tail[1].slice(1).toLowerCase(); rest = rest.slice(0, tail.index); }
    if (!rest) return; const pm = rest.match(/\((Bordering|Offsite|Onsite)\)/i); const prox = pm ? pm[1][0].toUpperCase() + pm[1].slice(1).toLowerCase() : ''; rest = rest.replace(/\((Bordering|Offsite|Onsite)\)/i, '').trim();
    const key = rest.toLowerCase().replace(/[^a-z]/g, ''); const ty = SI_TYPES.find(t => t.toLowerCase() === key || siLabel(t).toLowerCase().replace(/[^a-z]/g, '') === key) || SI_OLD[key] || 'Other';
    out.push({ type: ty, impact: imp || 'Neutral', prox, other: ty === 'Other' ? rest : '' }); });
  return out; }
const siText = L => L.map(x => `${x.impact}: ${x.type === 'Other' ? (x.other || 'Other') : siLabel(x.type)}${x.prox ? ` (${x.prox})` : ''}`).join('; ');
const locBtn = who => ` <button type="button" class="btn xs" data-locpick="${who}" title="Pick the site influences (UAD 3.6 list) with their impact">▾ pick</button>`;
function locPick(who) {
  const J = app.job; const G = G0(J); const c = who === 'subj' ? null : J.comps.find(x => x.id === who); const F = c ? compFacts(c, J) : subjFacts(J);
  let L = siParse(F.loc); if (!L.length) L = [{ type: 'Residential', impact: 'Neutral', prox: '', other: '' }];
  const bg = document.createElement('div'); bg.className = 'sheetbg';
  const draw = () => { bg.innerHTML = `<div class="sheet"><h2>Location (site influence) – ${esc(c ? 'Comp ' + (c.use || '') + ' ' + compTitle(c) : 'Subject')}</h2>
    <p class="help">UAD 3.6 site influences, each with its impact. Add as many as apply. Flood zone, easements and private roads have their own lines (Hazard zone, Easement, Street access) – tick them under ⚙ Grid lines.</p>
    <table class="mini si">${L.map((x, i) => `<tr><td><select data-si="${i}|type">${SI_TYPES.map(t => `<option value="${t}" ${x.type === t ? 'selected' : ''}>${esc(siLabel(t))}</option>`).join('')}</select>${x.type === 'Other' ? `<input class="txt sm" data-si="${i}|other" maxlength="45" placeholder="Describe (45 characters)" value="${esc(x.other)}">` : ''}</td>
      <td><select data-si="${i}|impact">${['Neutral', 'Beneficial', 'Adverse'].map(t => `<option ${x.impact === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
      <td><select data-si="${i}|prox"><option value="">proximity –</option>${['Onsite', 'Bordering', 'Offsite'].map(t => `<option ${x.prox === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td><button class="btn xs" data-sidel="${i}">✕</button></td></tr>`).join('')}</table>
    <div class="row"><button class="btn sm" data-siadd="1">+ Add an influence</button><span class="grow"></span><button class="btn primary" data-sisave="1">Use these</button><button class="btn" data-siclose="1">Cancel</button></div>
    <p class="help">Shows on the grid as: <b>${esc(siText(L))}</b></p></div>`; };
  draw(); document.body.appendChild(bg);
  bg.addEventListener('change', e => { const d = e.target.dataset.si; if (!d) return; const [i, k] = d.split('|'); L[+i][k] = e.target.value; if (k === 'type') draw(); else bg.querySelector('.help b').textContent = siText(L); });
  bg.addEventListener('click', e => { const t = e.target;
    if (t.dataset.siadd) { L.push({ type: 'BusyRoadway', impact: 'Adverse', prox: '', other: '' }); draw(); }
    else if (t.dataset.sidel) { L.splice(+t.dataset.sidel, 1); draw(); }
    else if (t.dataset.siclose || t === bg) bg.remove();
    else if (t.dataset.sisave) { const txt = siText(L); if (c) wbFactSet(J, c, 'loc', txt); else { if (txt) G.subj.loc = txt; else delete G.subj.loc; } bg.remove(); save(); render(); toast('Location (site influence) set: ' + (txt || 'none')); } });
}
/* ---- her 2.6 archive location (N/B/A + factors: Res, BsyRd, ShrDrv, PrvtLn, InterLot, FldZne …) → UAD 3.6 (Oct 20 2026) ----
   Site influences get their own impact (the 2.6 rating goes to the first factor; traffic/noise/power lines are adverse, water / gated beneficial,
   Residential neutral when it is not first). Shared drive, private road, easement, flood zone and lot shape are not site influences in 3.6 –
   they go to their own lines (Primary access, Street access, Easement, Hazard zone, Site characteristics). Her own entries always win. */
const ARCH_SI = [[/^res(idential)?$/, 'Residential'], [/^(bsyrd|busy ?road|some ?tr(a|f)+ic|sometrfc|sometrffc|bckstrfc|trfcnse|traffic|fwynse|freeway)/, 'BusyRoadway'], [/^comm/, 'CommercialArea'], [/^ind/, 'IndustrialArea'],
  [/^(wtrfr|waterfront|nrwtr|near water|ocean|lake|creek)/, 'BodyOfWater'], [/^(adjprk|prklnd|park|adjacent park|nearpark)/, 'Park'], [/^(glfcse|golf)/, 'GolfCourse'], [/^(adjpwr|pwrln|power)/, 'OverheadElectricPowerTransmissionLine'],
  [/^(pubtrn|transit)/, 'PublicTransportationHub'], [/^(train|rail)/, 'RailLine'], [/^(schl|school|adjschl)/, 'School'], [/^(agri|farm)/, 'Agricultural'], [/^airport/, 'Airport'], [/^(hidens|high density|apts|apartments)/, 'HighDensityResidential']];
const ARCH_LINE = [[/^(shrdrv|shared ?dr)/, 'primaryAccess', 'Shared driveway'], [/^(prvtln|private ?lane|pvtln)/, 'streetAccess', 'Private lane'], [/^(prvtrd|private ?road|pvtrd)/, 'streetAccess', 'Private road'],
  [/^(drvesmn?t|driveway easement)/, 'easement', 'Driveway easement'], [/^(esmt|easement)/, 'easement', 'Easement'], [/^(fldzne?|fldzn|flood ?zone|fldwy|fldway|floodway)/, 'hazard', 'FEMA special flood hazard area'],
  [/^(interlot|interior lot)/, 'siteChar', 'Other: Interior lot'], [/^(flaglot|flag lot)/, 'siteChar', 'Other: Flag lot'], [/^(secondrow|second row)/, 'siteChar', 'Other: Second row'], [/^(lotstoamenity)/, 'siteChar', 'Other: Lots to amenity']];
const SI_BAD = new Set(['BusyRoadway', 'IndustrialArea', 'OverheadElectricPowerTransmissionLine', 'RailLine', 'Airport', 'HighPressureGasLine', 'OilOrGasWell']), SI_GOOD = new Set(['BodyOfWater', 'GolfCourse', 'Park', 'GreenSpace']);
function archLoc36(rating, factors) {
  const imp0 = /^b/i.test(rating) ? 'Beneficial' : /^a/i.test(rating) ? 'Adverse' : 'Neutral'; const L = [], lines = {};
  String(factors || '').split(/;\s*/).map(x => x.trim()).filter(Boolean).forEach((f, i) => { const k = f.toLowerCase().replace(/[^a-z ]/g, '').trim();
    const ln = ARCH_LINE.find(([re]) => re.test(k)); if (ln) { lines[ln[1]] = lines[ln[1]] ? lines[ln[1]] + '; ' + ln[2] : ln[2]; return; }
    const si = ARCH_SI.find(([re]) => re.test(k)); const type = si ? si[1] : 'Other';
    const impact = i === 0 ? imp0 : type === 'Residential' ? 'Neutral' : SI_BAD.has(type) ? 'Adverse' : SI_GOOD.has(type) || /gated/i.test(k) ? 'Beneficial' : imp0;
    L.push({ type, impact, prox: '', other: type === 'Other' ? (/gated/i.test(k) ? 'Gated community' : /noise/i.test(k) ? 'Noise exposure' : /rural/i.test(k) ? 'Rural' : f).slice(0, 45) : '' }); });
  if (!L.length && Object.keys(lines).length) L.push({ type: 'Residential', impact: 'Neutral', prox: '', other: '' });
  return { loc: siText(L), lines };
}
/* ---- cooling from the MLS / archive heating-cooling text ---- */
function coolText(t) { t = String(t || ''); if (!t.trim()) return ''; if (/no cooling|cooling: none|\/\s*none\b|\bno a\/?c\b/i.test(t)) return 'None';
  const m = t.match(/central air|central|\bCAC\b|\bA\/?C\b|air condition\w*|heat pump|mini[- ]?split|ductless|evaporative|swamp|wall unit|window unit/i); return m ? m[0].replace(/^CAC$/i, 'Central air').replace(/^central$/i, 'Central air') : ''; }
function coolHas(t) { t = String(t || '').trim(); if (!t) return null; if (/^(none|no)\b/i.test(t) || /none listed/i.test(t)) return 0; return 1; }
/* ---- which lines this grid shows (her field picker, Oct 20 2026) ----
   Every UAD 3.6 comparable adjustment line is in ADJ_ROWS; she ticks the ones this report needs. Her own "Add Other" lines
   (Landscaping, Usable Lot Area/Utility, and any she adds) go to SFREP as Additional Comparison Line Items under her name for the line. */
const GRID_BASE = new Set(['price', 'ppsf', 'src', 'prox', 'status', 'listPrice', 'origList', 'listDate', 'terms', 'conc', 'contract', 'sale', 'dom', 'cdom', 'lastRed', 'project', 'hoa', 'hoaAmen', 'landCommon',
  'site', 'nbhd', 'loc', 'view', 'usable', 'land', 'topo', 'year', 'style', 'attach', 'levels', 'structure', 'unitPos', 'floor', 'energy', 'heat', 'cool', 'beds', 'baths', 'gla', 'bsmt', 'q', 'c', 'func', 'porch', 'pool', 'courts', 'adu', 'other', 'garage']);
const GRID_EX = {"price": "$2,075,000", "ppsf": "$1,054 (worked out)", "src": "MLS 26-2106 · CRS", "prox": "0.24 mi East", "status": "Closed", "listPrice": "$2,195,000", "origList": "$2,395,000", "listDate": "06/25/2026", "terms": "Conventional · Cash · VA", "conc": "$13,000 closing costs", "contract": "09/21/2026", "sale": "10/14/2026 (market conditions)", "dom": "89", "stl": "98.4%", "rights": "Fee simple · Leasehold", "ownRights": "Fee simple", "xferTerms": "Arm’s length · REO · Short sale", "cdom": "89", "lastRed": "09/02/2026", "project": "Encina Royale", "hoa": "$450 / month", "hoaAmen": "Pool, clubhouse, tennis", "landCommon": "Yes / No", "site": "7,840 sf", "nbhd": "Goleta North", "loc": "Neutral: Residential; Adverse: Busy roadway", "view": "Neutral: Residential · Beneficial: Mountain", "usable": "0.18 ac", "land": "Average · Good", "topo": "Level · Gentle slope", "siteChar": "Corner lot · Flag lot · Cul-de-sac", "drain": "Adequate · Poor drainage", "waterFront": "Ocean frontage 60 ft", "streetAccess": "Public, paved · Private, gravel", "primaryAccess": "Shared driveway · Private road", "easement": "Driveway easement · Utility easement", "hazard": "Flood zone AE · Fire hazard (VHFHSZ)", "zoning": "Legal · Legal non-conforming", "envCond": "None apparent · Oil well nearby", "restrict": "Deed restriction · Age 55+", "native": "Yes / No", "year": "1963", "style": "Ranch · Contemporary · Spanish", "attach": "Detached · Attached", "levels": "1 · 2", "structure": "Low-rise · Townhouse", "unitPos": "Interior · Corner · End", "floor": "2nd floor", "energy": "Solar (owned) · Heat pump water heater", "constr": "Site built · Modular · Manufactured", "disaster": "Seismic retrofit · Fire-resistant roof", "heat": "Forced air · Wall furnace · Radiant", "cool": "Central air · Mini split · None", "beds": "3 (4 = 3 + 1 below grade)", "baths": "2 / 1 (full / half)", "gla": "1,780 sq ft", "bsmt": "400 sq ft finished below grade", "bsmtUnf": "600 sq ft unfinished basement", "agUnf": "250 sq ft unfinished attic room", "nsAbove": "Converted garage 300 sq ft (non-standard)", "nsBelow": "Non-standard finished basement 200 sq ft", "nonCont": "Finished studio over garage, not connected", "gba": "Gross building area (2–4 units)", "disab": "Ramp · Wide doors · Grab bars", "window": "Large glass walls (luxury homes)", "volume": "Cubic feet (unusual ceilings)", "mhWidth": "Single · Double · Triple wide", "backToBack": "Yes / No", "rowLoc": "End · Interior", "q": "Q4 (low / mid / high)", "c": "C3 (low / mid / high)", "func": "Tandem bedroom · Low ceilings · Poor layout · None", "porch": "Patio, porch · Deck 300 sf", "pool": "Pool · Spa · None", "courts": "Tennis court · Sport court", "adu": "Guest house 450 sf 1 bath · Barn", "aduLoc": "Detached · Attached · Interior", "wholeHome": "Elevator · Whole-house generator · Smart home", "other": "Horse facilities · Wine cellar · Outdoor kitchen", "garage": "2 (garage spaces)", "carport": "1 (carport spaces)"};   // what an entry looks like, shown in the ⚙ Grid lines picker
const REQ_STAR = '<span class="req" title="Required – the UAD 3.6 grid always shows this line (Appendix F-1)">*</span>';   // her ask Oct 20 2026: blue asterisk left of required lines
const GRID_KEEP = new Set(['price', 'src', 'prox', 'listPrice', 'status', 'terms', 'conc', 'contract', 'sale', 'dom', 'attach', 'loc', 'view', 'year', 'heat', 'beds', 'baths', 'gla', 'bsmt', 'bsmtUnf', 'q', 'c', 'garage']);   // F-1 (Summary of Rows in Comparable Grids v1.3): rows that always display on the 3.6 sales grid
let GRID_DEFAULT = null;   // her saved default (kv 'gridLines'): { on: {id: true/false}, custom: [{id, name, section}] }
function customRows(J) { const G = G0(J); return (G.custom || []).map(x => [x.id, x.name, x.section || 'Your own lines', 'OTHER', null, x.name]); }
function adjRows(J) { return J ? ADJ_ROWS.concat(customRows(J)) : ADJ_ROWS; }
function lineOn(id, J) { const G = G0(J); if (GRID_KEEP.has(id)) return true; if (G.lines && id in G.lines) return !!G.lines[id];
  if (GRID_DEFAULT && GRID_DEFAULT.on && id in GRID_DEFAULT.on) return !!GRID_DEFAULT.on[id];
  if (/^cx_/.test(id)) return true;
  if (id === 'hazard') return [subjFacts(J), ...usedComps(J).map(c => compFacts(c, J))].some(F => F.hazard && !/^none$/i.test(String(F.hazard).trim()));   // F-1: shows when the subject or any comp is in a hazard zone
  if (id === 'xferTerms') return usedComps(J).some(c => { const t = compFacts(c, J).xferTerms; return t && !/typically/i.test(t); });   // shows itself when a comp is REO, estate, short sale …
  if (id === 'carport') return [subjFacts(J), ...usedComps(J).map(c => compFacts(c, J))].some(F => +F.carport > 0);
  if (id === 'bsmtUnf') return [subjFacts(J), ...usedComps(J).map(c => compFacts(c, J))].some(F => +F.bsmtUnf > 0);
  return GRID_BASE.has(id); }
function gridLinesHTML(J) {
  const G = G0(J); const rows = adjRows(J).filter(r => rowShownMode(r, J)); let sec = ''; const on = rows.filter(r => lineOn(r[0], J)).length;
  const items = rows.map(r => { const head = r[2] !== sec ? `</div><div class="glsec"><b>${esc(r[2])}</b>` : ''; sec = r[2]; const lock = GRID_KEEP.has(r[0]);
    const uad = r[3] === 'OTHER' ? `your own line – SFREP “Add Other” named “${esc(r[5])}”` : r[3] ? 'UAD ' + esc(r[3]) : 'information only (not a UAD adjustment line)';
    return head + `<label class="check gl" title="${uad}"><input type="checkbox" data-gline="${r[0]}" ${lineOn(r[0], J) ? 'checked' : ''} ${lock ? 'disabled' : ''}> ${GRID_KEEP.has(r[0]) ? REQ_STAR : ''}${esc(r[1])}${/^cx_/.test(r[0]) ? ` <button type="button" class="lnk" data-glinedel="${r[0]}" title="Delete this line">✕</button>` : ''}<small>${r[3] === 'OTHER' ? 'your own line' : r[3] ? esc(r[3]) : 'info only'}</small>${GRID_EX[r[0]] || r[0] === 'usable' || r[0] === 'land' ? `<i class="glex">e.g. ${esc(GRID_EX[r[0]] || '')}</i>` : ''}</label>`; }).join('');
  return `<details class="glines"${app.glOpen ? ' open' : ''}><summary data-act="glopen">⚙ Grid lines – pick the lines this report needs <small>(${on} of ${rows.length} shown)</small></summary>
    <p class="help">Every UAD 3.6 adjustment line is here, under the UAD name it goes to in SFREP. Tick the ones this report needs; the rest stay hidden (and add nothing to the totals). Lines the 3.6 grid always shows (Appendix F-1) are always ticked: sale price, data source, proximity, list price, status, transfer terms, concessions, contract and sale dates, days on market, attached/detached, location, view, year built, heating, bedrooms, baths, living area, below grade finished and unfinished, quality, condition and vehicle storage.</p>
    <div class="glgrid"><div>${items}</div></div>
    <div class="row"><input class="txt sm" id="glNew" maxlength="36" placeholder="Your own line, e.g. Workshop"><select id="glSec">${['Site', 'Dwelling', 'Amenities'].map(x => `<option>${x}</option>`).join('')}</select><button class="btn sm" data-act="gladd">+ Add your own line</button>
      <span class="grow"></span><button class="btn sm" data-act="glsave" title="New assignments start with these lines ticked">Save as my default</button><button class="btn sm" data-act="glreset">Back to my default</button></div>
    <p class="help">Your own lines go to SFREP as an “Add Other” line under the name you type (up to 36 characters); each comp's entry on it is up to 21 characters.</p></details>`;
}

const usedComps = J => J.comps.filter(c => c.use).sort((a, b) => a.use - b.use);
const acOf = sf => sf ? Math.round(sf / 43560 * 100) / 100 : null;

/* subject facts: what she typed in the grid, else her inspection (workfile), else the order / CRS */
function subjFacts(J) {
  const I = J.subject.insp || {}, T = G0(J).subj, crs = J.subject.crs || {};
  const f = { price: '', ppsf: '', src: 'Inspection ' + (I.inspDate ? showDate(I.inspDate) : ''), prox: '', terms: '', conc: '', contract: '', sale: '', dom: '',
    site: I.siteSf || num(crs.lotSf) || null, usable: I.usableAc ?? null, loc: I.loc || '', view: I.view || '', topo: I.topo || '', nbhd: I.nbhd || '', land: I.land || '',
    style: I.style || '', attach: I.attach || '', levels: I.levels ?? null, status: '', listPrice: '', origList: '', listDate: '', lastRed: '', redDays: '', cdom: '', project: I.project || '', hoa: I.hoa ?? null, hoaAmen: I.hoaAmen || '', landCommon: '', structure: I.structure || '', unitPos: I.unitPos || '', floor: I.floor ?? null, year: I.year || num(crs.yearBuilt) || null, q: I.q || '', c: I.c || '', rooms: I.rooms ?? null, beds: I.beds ?? null, full: I.full ?? null, half: I.half ?? null,
    gla: I.gla ?? null, bsmt: I.bsmt ?? null, bsmtUnf: I.bsmtUnf ?? null, garage: I.garage ?? null, carport: I.carport ?? null, heat: I.heat || '', cool: I.cool || '', func: I.func || '', constr: I.constr || '', energy: I.energy || '', pool: I.pool || '', courts: I.courts || '', porch: I.porch || '', adu: I.adu || '', other: I.other || '', agUnf: I.agUnf || null, nsAbove: (I.sk && I.sk.agNon) || null, nsBelow: (I.sk && I.sk.bgNon) || null, primaryAccess: I.primaryAccess || '', siteChar: I.siteChar || '', hazard: I.hazard || (J.subject.femaZone ? (/^(A|V)/i.test(J.subject.femaZone) ? 'FEMA special flood hazard area' : 'None') : (crs.fema ? (/^(A|V)/i.test(crs.fema) ? 'FEMA special flood hazard area' : 'None') : '')) };
  Object.entries(T).forEach(([k, v]) => { if (!blank(v)) f[k] = v; });
  f._fine = { q: fineOf(J, 'subj', 'q'), c: fineOf(J, 'subj', 'c') };
  f._own = landOwned(J, f); if (blank(f.landCommon)) f.landCommon = f._own ? 'No' : 'Yes';
  return f;
}
function compFacts(c, J) {
  const g = k => V(c, k); const px = proximity(c, J);
  const F0 = { price: num(g('salePrice')), src: g('mls') ? 'MLS ' + g('mls') : (c.src.cort.length ? 'CORT' : c.src.arch.length ? 'Your archive' : ''), prox: px ? px.mi.toFixed(2) + ' mi ' + px.dir.replace(/([a-z])([A-Z])/, '$1 $2') : '',
    terms: termsText(g('financing')), xferTerms: g('saleType') && typeof PICK !== 'undefined' ? ((PICK.xferTerms.opts.find(o => o[0] === uadSaleType(g('saleType'))) || [])[1] || '') : '', conc: num(g('concessions')), contract: g('contractDate') || '', sale: g('saleDate') || '', dom: g('dom'),
    site: num(g('siteSf')), usable: acOf(num(g('usableSf'))), loc: [g('locRating'), g('locFactors')].filter(Boolean).join(': '), view: [g('viewRating'), g('viewTypes')].filter(Boolean).join(': '),
    topo: g('topo') || '', nbhd: g('nbhd') || '', land: g('landscaping') || '', style: g('style') || '', attach: g('attach') || '', levels: num(g('stories')), status: statusText(g('status')), listPrice: num(g('listPrice')), origList: num(g('origList')), listDate: g('listDate') || '', lastRed: g('lastRed') || '', cdom: num(g('cdom')), project: g('project') || '', hoa: num(g('hoa')), hoaAmen: g('hoaAmen') || '', landCommon: g('landCommon') || '', structure: g('structure') || '', unitPos: g('unitPos') || '', floor: g('floor') ?? null, year: num(g('yearBuilt')), q: g('quality') || '', c: g('condition') || '',
    rooms: num(g('rooms')), beds: num(g('beds')), full: num(g('full')), half: num(g('half')), gla: num(g('gla')), bsmt: num(g('bsmtFin')), garage: num(g('garage')), energy: g('energy') || '',
    pool: [yes(g('pool')) ? 'Pool' : '', yes(g('spa')) ? 'Spa' : ''].filter(Boolean).join(', ') || (g('pool') && !yes(g('pool')) ? 'None' : ''), courts: [yes(g('tennis')) ? 'Tennis court' : '', yes(g('sport')) ? 'Sport court' : ''].filter(Boolean).join(', '), porch: g('porch') || '', adu: [g('adu'), g('guest'), g('accessory')].filter(Boolean).join('; '),
    other: g('other') || [yes(g('horse')) ? 'Horse facilities' : ''].filter(Boolean).join(', '), _id: c.id, aduSf: g('aduSf'), aduBaths: g('aduBaths'),   // horse: the MLS says 'No' when the box is not ticked (it showed "Horse facilities" for every MLS comp)
    carport: num(g('carport')), bsmtUnf: !blank(g('bsmtSf')) ? Math.max(0, (+g('bsmtSf')) - (+(g('bsmtFin') || 0))) : null,
    heat: String(g('heating') || '').trim() || (String(g('heatCool') || '').includes(' / ') ? String(g('heatCool')).split(' / ')[0].trim() : (/cool/i.test(g('heatCool') || '') ? '' : String(g('heatCool') || '').trim())), cool: coolText(g('cooling') || g('heatCool')) || (/no cooling listed/i.test(g('heatCool') || '') ? 'None listed' : '') };
  { const hc = val(c, 'heatCool'); if (hc.v && (hc.src === 'arch' || hc.src === 'edit') && !/ \/ /.test(String(hc.v))) { const A = archHC(hc.v); if (A.heat) F0.heat = A.heat; else if (!F0.heat) F0.heat = String(hc.v); if (A.cool) F0.cool = A.cool; } }   // her 2.6 Heating/Cooling line (FWA C/Air …) split into the 3.6 heating and cooling fields
  { const lr = val(c, 'locRating'); const E = c.edit || {}; if (lr.src === 'arch' && blank(E.locRating) && blank(E.locFactors)) { const A = archLoc36(g('locRating'), g('locFactors')); if (A.loc) F0.loc = A.loc; Object.entries(A.lines).forEach(([k, v]) => { if (blank(F0[k])) F0[k] = v; }); } }   // her 2.6 archive location in 3.6 terms
  { if (blank(F0.hazard)) F0.hazard = hazardOf(c); }
  { const fu = archFU(c); if (fu.func && blank(F0.func)) F0.func = fu.func; if (fu.tandem) F0.tandem = fu.tandem; }   // her 2.6 Functional utility line: floor plan / tandem bedrooms → Functional utility, tandem garage → vehicle storage   // her note Oct 20 2026: FldZne / FldZn / FldWy / Fldway in her archive, or the CRS FEMA zone (X = none)
  adjRows(J).forEach(r => { const e = (c.edit || {})['grid_' + r[0]]; if (!blank(e)) F0[r[0]] = e; });   // her entries on lines with no source
  F0._fine = { q: fineOf(J, c.id, 'q'), c: fineOf(J, c.id, 'c') };
  if (g('viewRange') && F0.view && !/limited|panoram/i.test(F0.view)) F0.view += ' – ' + g('viewRange');
  if (!blank(F0.aduSf) && F0.aduSf > 0) F0.adu = [F0.adu && F0.adu !== 'None' ? F0.adu : 'Living outbuilding', int(F0.aduSf) + ' sf', F0.aduBaths ? F0.aduBaths + ' bath' : ''].filter(Boolean).join(', ');
  F0.beds = blank(F0.beds) ? null : (+F0.beds) + (+(g('bgBeds') || 0)); F0.bedsBg = +(g('bgBeds') || 0);
  F0._own = landOwned(J, F0); if (blank(F0.landCommon)) F0.landCommon = F0._own ? 'No' : 'Yes';
  return F0;
}
function showFact(k, v) {
  if (blank(v) || v === '') return '';
  if (['price', 'conc', 'listPrice', 'origList', 'hoa'].includes(k)) return money(v);
  if (['contract', 'sale', 'listDate', 'lastRed'].includes(k)) return showDate(v);
  if (k === 'site') return fmt(FIELD.siteSf, v);
  if (k === 'usable') return (+v).toFixed(2) + ' ac';
  if (['gla', 'bsmt', 'bsmtUnf', 'agUnf', 'nsAbove', 'nsBelow'].includes(k)) return int(v);
  return String(v);
}
/* the amount the rate gives, or null */
function rateAmount(row, S, C, J) {
  const R = G0(J).rates; const key = row[4];
  if (Array.isArray(key)) { let tot = 0, any = false; key.forEach(k => { const r = num(R[k]); if (!r) return; let x = null;
      if (['pool', 'spa', 'pond', 'lake', 'tennis', 'sport'].includes(k)) { const a = hasFeat(S, k), b = hasFeat(C, k); if (a !== null && b !== null) x = (a - b) * r; }
      else if (k === 'qStep' || k === 'qPct' || k === 'cStep' || k === 'cPct') { const f = k[0]; const a = ratingPos(S[f], fineOf(J, 'subj', f)), b = ratingPos(C[f], fineOf(J, C._id, f)); if (a !== null && b !== null) x = (a - b) * (k.endsWith('Pct') ? r / 100 * (C.price || 0) : r); }
      else if (k === 'viewStep' || k === 'viewPct') { const a = vtOf(J, 'subj', S.view), b = vtOf(J, C._id, C.view); if (a !== null && b !== null) x = (a - b) * (k === 'viewPct' ? r / 100 * (C.price || 0) : r); }
      else if (k === 'landStep') { const a = goodness('land', S), b = goodness('land', C); if (a !== null && b !== null) x = (a - b) * r; }
      else if (k === 'aduSf' || k === 'aduBath' || k === 'aduHalf') { const a = aduNums(S), b = aduNums(C); const fb = n => n === null ? null : Math.floor(+n), hb = n => n === null ? null : ((+n) - Math.floor(+n) >= 0.5 ? 1 : 0); const v = k === 'aduSf' ? [a.sf, b.sf] : k === 'aduBath' ? [fb(a.baths), fb(b.baths)] : [hb(a.baths), hb(b.baths)]; if (v[0] !== null && v[1] !== null) x = (v[0] - v[1]) * r; }
      if (x !== null) { tot += x; any = true; } }); return any ? Math.round(tot / 500) * 500 : null; }
  const r = num(R[key]); if (!key || !r) return null;
  const d = (a, b) => (blank(a) || blank(b)) ? null : (+a) - (+b);
  let x = null;
  if (key === 'gla') { const dd = d(S.gla, C.gla); x = dd === null ? null : Math.abs(dd) < 100 ? 0 : dd * r; }   // her rule: no adjustment under 100 sq ft
  if (key === 'usableAc') { const dd = d(S.usable, C.usable); x = dd === null ? null : dd * r; }
  if (key === 'bed') { const dd = d(capBeds(S.beds), capBeds(C.beds)); x = dd === null ? null : dd * r; }
  if (key === 'bath') { const df = d(S.full, C.full), dh = d(S.half || 0, C.half || 0); const rh = num(R.halfBath); x = df === null ? null : df * r + (dh || 0) * (rh || r / 2); }
  if (key === 'unitPos') { const a = goodness('unitPos', S), b = goodness('unitPos', C); x = a === null || b === null ? null : (a - b) * r; }
  if (key === 'attach') { const a = goodness('attach', S), b = goodness('attach', C); x = a === null || b === null ? null : (a - b) * r; }
  if (key === 'space') { const dd = d(S.garage, C.garage); x = dd === null ? null : dd * r; }
  if (key === 'cpSpace') { const dd = d(S.carport || 0, C.carport); x = dd === null ? null : dd * r; }
  if (key === 'bsmtFin') { const dd = d(S.bsmt || 0, C.bsmt); x = dd === null ? null : dd * r; }
  if (key === 'bsmtUnf') { const dd = d(S.bsmtUnf || 0, C.bsmtUnf); x = dd === null ? null : dd * r; }
  if (['agUnf', 'nsAbove', 'nsBelow', 'nonCont'].includes(key)) { const n = v => blank(v) ? null : num(String(v).replace(/[^0-9.]/g, '')); const dd = d(n(S[key]) || 0, n(C[key])); x = dd === null ? null : dd * r; }   // her ask Oct 20 2026: a $ per sq ft rate on these lines too
  if (key === 'cool') { const a = coolHas(S.cool), b = coolHas(C.cool); x = a === null || b === null ? null : (a - b) * r; }
  if (key === 'timePct') { const eff = J.subject.eff; if (!C.sale || !eff || !C.price) return null; const m = monthsBetween(C.sale, eff); x = m === null ? null : C.price * r / 100 * m; }
  return x === null ? null : Math.round(x / 500) * 500;
}
function cellAmount(J, c, row) {
  const v = ((G0(J).cells[c.id] || {})[row[0]]); if (!blank(v)) return { v: +v, own: true };
  const S = subjFacts(J), C = compFacts(c, J); const a = rateAmount(row, S, C, J); return { v: a, own: false };
}
function compTotals(J, c) {
  const C = compFacts(c, J); let net = 0, gross = 0, lines = 0;
  // order as on the 3.6 grid (D-1 sample): Add Other rows first, then site, dwelling, units, quality/condition, amenities
  adjRows(J).filter(r => r[3] && rowShown(r, J)).sort((x, y) => (y[3] === 'OTHER') - (x[3] === 'OTHER')).forEach(r => { const a = cellAmount(J, c, r).v; if (a) { net += a; gross += Math.abs(a); lines++; } });
  const price = C.price || 0; return { price, net, gross, lines, adj: price + net, netPct: price ? net / price * 100 : 0, grossPct: price ? gross / price * 100 : 0, adjPsf: C.gla ? (price + net) / C.gla : null };
}

/* ---------------- the grid card ---------------- */
const classicOn = () => { try { return localStorage.getItem('genie.classic') === '1'; } catch (e) { return false; } };
function gridHTML(J) {
  const usedAll = usedComps(J); if (!usedAll.length) return '<h2>Adjustment grid</h2><p class="help">Pick comps with “Use as” in the list above; they line up here in grid order.</p>';
  const used = wbSlice(usedAll); const lean = wbLean();
  const G = G0(J), S = subjFacts(J); const tot = used.map(c => compTotals(J, c)); const totAll = usedAll.map(c => compTotals(J, c));
  const inspNote = J.subject.insp ? `Subject from your inspection (${esc(J.subject.insp.file || 'workfile')}).` : 'Subject: drop your iPad <b>Workfile package</b> (.zip) on this page to fill the subject column from your inspection, or type the subject values in the grid.';
  let sec = '';
  const rows = adjRows(J).filter(WB_ROWS).filter(r => rowShown(r, J)).map(row => {
    const [id, label, section, type] = row; const head = section !== sec ? `<tr class="grp"><th colspan="${2 + used.length}">${esc(section)}</th></tr>` : ''; sec = section;
    const sv = id === 'baths' ? [S.full, S.half].every(blank) ? '' : `${S.full ?? '–'} / ${S.half ?? 0}` : showFact(id, S[id]);
    const subjCell = ['price', 'ppsf', 'src', 'prox', 'dom', 'terms', 'conc', 'contract', 'sale', 'status', 'listPrice', 'origList', 'listDate', 'lastRed', 'redDays', 'cdom'].includes(id) ? `<td class="subj">${esc(sv)}</td>`
      : `<td class="subj"><input class="txt sm${(PICK[id] || id === 'view') && !blank(G.subj[id]) && !pkValid(id, G.subj[id], G.subj['pk_' + id]) ? ' bad' : ''}" data-gsubj="${id}" value="${esc(blank(G.subj[id]) ? '' : G.subj[id])}" placeholder="${esc(sv || (id === 'usable' ? 'Measure it' : id === 'adu' ? 'e.g. Guest house 450 sf 1 bath' : ''))}">${id === 'garage' ? `${G.subj.vsText ? `<small class="vsx">${esc(G.subj.vsText)}</small>` : ''} <button type="button" class="btn xs" data-vspick="subj">▾ pick</button>` : id === 'q' || id === 'c' ? fineSel('subj', id, J) + pkBtn('subj', id) : id === 'loc' ? locBtn('subj') : id === 'view' ? vtSel('subj', J, S.view) + pkBtn('subj', 'view') : PICK[id] ? pkBtn('subj', id) : ''}</td>`;
    const cells = used.map(c => { const C = compFacts(c, J);
      let shown = id === 'beds' && C.bedsBg ? `${C.beds} (${C.bedsBg} below grade)` : id === 'baths' ? ([C.full, C.half].every(blank) ? '' : `${C.full ?? '–'} / ${C.half ?? 0}`) : id === 'ppsf' ? (C.price && C.gla ? money(C.price / C.gla) : '') : showFact(id, C[id]);
      if (!WB_NOEDIT.includes(id)) { /* she can change any comp fact right on the grid (Oct 19 2026), not only in Workbook view */ const raw = id === 'usable' ? (blank(C.usable) ? '' : String(C.usable)) : wbFactText(id, C);
        shown = `<input class="txt sm fact${(PICK[id] || id === 'view') && !pkValid(id, raw, (c.edit || {})['pk_' + id]) ? ' bad' : ''}" data-gfact="${c.id}|${id}" value="${esc(raw)}" placeholder="${id === 'usable' ? 'Measure it (ac)' : ''}" title="Type the comp's entry · = copies the subject · =2 copies comp 2">`; }
      else if (id === 'usable' && blank(C.usable)) shown = '<span class="measure">Measure it</span>'; else shown = esc(shown);
      if (id === 'lastRed') { const d = redDaysOf(C); shown += d !== null ? `<small class="muted rdays">${d} day${d === 1 ? '' : 's'} to pending</small>` : (C.lastRed ? '<small class="muted rdays">no contract date</small>' : ''); }
      if (id === 'q' || id === 'c') shown += fineSel(c.id, id, J); if (id === 'view') shown += vtSel(c.id, J, C.view); if (id === 'loc') shown += locBtn(c.id); else if (id === 'garage') shown += `${C.tandem ? `<small class="vsx" title="From your 2.6 Functional utility line – 3.6 has no tandem field; mention it in your comment">${esc(C.tandem)}</small>` : ''}${(c.edit || {}).grid_vsText ? `<small class="vsx">${esc(c.edit.grid_vsText)}</small>` : ''} <button type="button" class="btn xs" data-vspick="${c.id}" title="Type | spaces | attachment (UAD 3.6 vehicle storage)">▾ pick</button>`; else shown += pkBtn(c.id, id);
      if (!type) return `<td>${shown}</td>`;
      const a = cellAmount(J, c, row);
      return `<td><div class="gval">${shown}</div><input class="txt sm adj ${a.own ? 'own' : a.v !== null ? 'auto' : ''}" data-gadj="${c.id}|${id}" value="${a.own ? a.v : ''}" placeholder="${a.v !== null && !a.own ? (a.v >= 0 ? '+' : '') + a.v.toLocaleString() : '$ adj'}" inputmode="decimal" title="${a.own ? 'Your amount – clear it to use the rate' : a.v !== null ? 'From your rate – type to override' : 'Type the adjustment'}"></td>`; }).join('');
    const bedAsk = id === 'beds' && blank(G.rates.bed) ? used.filter(c => { const C = compFacts(c, J); const a = capBeds(S.beds), b = capBeds(C.beds); return a !== null && b !== null && a !== b && blank((G.cells[c.id] || {}).beds); }) : [];
    const rk = row[4]; const rate = rk ? [].concat(rk === 'bath' ? ['bath', 'halfBath'] : rk).map(k => `<div class="grate"><label title="${esc(RATES[k][1])}">${esc(RATES[k][0])} <input class="txt xs" data-grate="${k}" value="${esc(blank(G.rates[k]) ? '' : G.rates[k])}" inputmode="decimal"></label>${G.rateFrom && G.rateFrom[k] && !blank(G.rates[k]) ? `<small class="from">${/ · /.test(G.rateFrom[k]) ? `from your starting points (${esc(G.rateFrom[k])})` : 'from ' + esc(G.rateFrom[k])}</small>` : ''}</div>`).join('') : '';
    const ask = bedAsk.length ? `<div class="bedask">${bedAsk.map(c => `Comp ${c.use} has ${compFacts(c, J).beds} bedroom${compFacts(c, J).beds === 1 ? '' : 's'}`).join(', ')} – what bedroom adjustment do you want? Type it per bedroom above, or in the comp's box.</div>` : '';
    return head + `<tr class="${[ask ? 'asking' : '', GRID_INFO[id] ? 'info' : '', GRID_KEEP.has(id) ? 'reqrow' : 'optrow'].filter(Boolean).join(' ')}"><th>${GRID_KEEP.has(id) ? REQ_STAR : ''}${esc(label)}${type && type !== 'OTHER' && !GRID_INFO[id] ? `<br><small class="uadn" title="The UAD 3.6 line this goes to in SFREP">${esc(type)}</small>` : type === 'OTHER' ? `<br><small class="uadn">Add Other: “${esc(row[5])}”</small>` : ''}${GRID_INFO[id] ? `<br><small class="muted">${esc(GRID_INFO[id])}</small>` : ''}${id === 'structure' ? '<br><small class="muted">' + STRUCTURES.join(' · ') + '</small>' : id === 'unitPos' ? '<br><small class="muted">Interior · Corner · End</small>' : id === 'landCommon' ? '<br><small class="muted">Yes = no land owned · No = the unit owns land</small>' : ''}${rate}${ask}</th>${subjCell}${cells}</tr>`;
  }).join('');
  const sumRow = (label, fn, cls = '') => `<tr class="tot ${cls}"><th>${label}</th><td></td>${used.map((c, i) => `<td>${fn(tot[i], c)}</td>`).join('')}</tr>`;
  const adjs = totAll.map(t => t.adj).filter(Boolean); const lo = Math.min(...adjs), hi = Math.max(...adjs);
  const med = adjs.length ? [...adjs].sort((a, b) => a - b)[Math.floor((adjs.length - 1) / 2)] : null;
  if (POP) return `<div class="tablewrap"><table class="grid${lean ? ' wb' : ''}"><thead><tr><th></th><th>Subject<br><span class="gaddr">${esc(J.subject.addr || '')}</span></th>${used.map(c => `<th data-wbcol="${c.id}" class="${WB.cur === c.id ? 'cur' : ''}">Comp ${c.use}<br><span class="gaddr">${esc(compTitle(c))}</span>${gridMlsLink(c)}</th>`).join('')}</thead><tbody>${rows}
    ${sumRow('Net adjustment', t => `${t.net >= 0 ? '+' : '−'}${money(Math.abs(t.net))} <small class="${Math.abs(t.netPct) > GRID_LIMITS.net ? 'over' : ''}">${t.netPct.toFixed(1)}%</small>`)}
    ${sumRow('Gross adjustment', t => `${money(t.gross)} <small class="${t.grossPct > GRID_LIMITS.gross ? 'over' : ''}">${t.grossPct.toFixed(1)}%</small>`)}
    ${sumRow('Adjusted sale price', t => `<b>${money(t.adj)}</b>${t.adjPsf ? `<br><small>${money(t.adjPsf)} / sq ft</small>` : ''}`, 'big')}</tbody></table></div>
    <div class="gsum"><div><span>Adjusted range (all comps)</span><b>${adjs.length ? money(lo) + ' – ' + money(hi) : '–'}</b></div><div><span>Median</span><b>${med ? money(med) : '–'}</b></div><div><span>Your value</span><b>${blank(G.value) ? '–' : money(G.value)}</b></div></div>`;
  return `<div class="row"><h2 style="margin:0">Adjustment grid <small>UAD 3.6 lines · your amounts</small></h2><span class="grow"></span><label class="check" title="Grey boxes, thin black lines and compact rows, like your ACI forms"><input type="checkbox" data-classic="1" ${classicOn() ? 'checked' : ''}> Classic (ACI) look</label></div>${startsBar(J)}${gridLinesHTML(J)}${wbBar(J, usedAll)}
    <p class="help">${inspNote} Type an amount in any cell (minus for a downward adjustment). Or type a rate once beside a line; cells without your own amount then use it (shown in grey). Clear a cell to go back to the rate. Usable Lot Area/Utility comes only from your archive or your measurement – blank comps say <span class="measure">Measure it</span>.</p>
    <div class="tablewrap"><table class="grid${lean ? ' wb' : ''}"><thead><tr><th></th><th>Subject<br><span class="gaddr">${esc(J.subject.addr || '')}</span></th>${used.map(c => `<th data-wbcol="${c.id}" class="${WB.cur === c.id ? 'cur' : ''}" title="Click to pick this comp for Ctrl+Shift+number or Ctrl+Z">Comp ${c.use}<br><span class="gaddr">${esc(compTitle(c))}</span>${gridMlsLink(c)}</th>`).join('')}</tr></thead>
    <tbody>${rows}
    ${sumRow('Net adjustment', t => `${t.net >= 0 ? '+' : '−'}${money(Math.abs(t.net))} <small class="${Math.abs(t.netPct) > GRID_LIMITS.net ? 'over' : ''}">${t.netPct.toFixed(1)}%</small>`)}
    ${sumRow('Gross adjustment', t => `${money(t.gross)} <small class="${t.grossPct > GRID_LIMITS.gross ? 'over' : ''}">${t.grossPct.toFixed(1)}%</small>`)}
    ${sumRow('Adjusted sale price', t => `<b>${money(t.adj)}</b>${t.adjPsf ? `<br><small>${money(t.adjPsf)} / sq ft</small>` : ''}`, 'big')}
    ${sumRow('Weight in reconciliation', (t, c) => `<select data-gweight="${c.id}"><option value="">–</option>${[['Most', 'Most weight'], ['Less', 'Less weight'], ['NoWeight', 'No weight']].map(([v, l]) => `<option value="${v}" ${G.weights[c.id] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
    </tbody></table></div>
    <div class="gsum"><div><span>Adjusted range</span><b>${adjs.length ? money(lo) + ' – ' + money(hi) : '–'}</b></div><div><span>Spread</span><b>${adjs.length > 1 ? money(hi - lo) + ' (' + ((hi - lo) / lo * 100).toFixed(1) + '%)' : '–'}</b></div><div><span>Median</span><b>${med ? money(med) : '–'}</b></div>
      <label><span>Your indicated value (sales comparison)</span><input class="txt" data-gvalue="1" value="${esc(blank(G.value) ? '' : G.value)}" placeholder="$" inputmode="decimal"></label></div>
    <label class="fld"><span>Sales comparison comment (your words) ${cmtBtn('textarea[data-gnote]')}</span><textarea class="txt" rows="3" data-gnote="1">${esc(G.note || '')}</textarea></label><div class="charct" id="gnoteCt">${scCount(G.note)}</div>
    ${draftHTML(J)}
    <div class="row"><button class="btn sm" data-gtiers="1">Add the low / mid / high rating tiers to the comment</button><button class="btn sm" data-act="savealldb">Save these comps to my comp database (with your tiers)</button></div>
    ${reviewHTML(J)}${sensHTML(J)}`;
}

const scCount = t => { const n = String(t || '').length; return `${n.toLocaleString()} of 10,000 characters (UAD 3.6 limit)${n > 10000 ? ` – <b class="over">${(n - 10000).toLocaleString()} over</b>` : ''}`; };
/* low / mid / high within a UAD rating – on her grid and in her comments, never in the UAD fields */
function gridMlsLink(c) { const n = String(V(c, 'mls') || '').trim(); if (!n) return '';   /* the MLS listing in a window of its own (her logged-in MLS) */
  if (typeof MLSLINK === 'undefined' || !MLSLINK) return `<br><button class="lnk sm" data-act="mlsgo" data-n="${esc(n)}" title="Copies the MLS number and brings up your MLS window (opens the MLS sign-in the first time) – paste it in the MLS search box">MLS ${esc(n)} ↗</button>`;
  const u = MLSLINK.replace('{mls}', encodeURIComponent(n)).replace('{mlsnodash}', encodeURIComponent(n.replace(/-/g, '')));
  return `<br><button class="lnk sm" data-act="mlswin" data-u="${esc(u)}" title="Open MLS ${esc(n)} in a window you can move to another screen">MLS ${esc(n)} ↗</button>`; }
function fineSel(who, k, J) { const v = fineOf(J, who, k); const set = ((G0(J).fine || {})[who] || {})[k], fromA = !set && fineArch(J, who, k); return ` <select class="fine${fromA ? ' arch' : ''}" data-gfine="${who}|${k}" title="${fromA ? 'From your archive note – change it if you see it differently' : 'Where it sits within the UAD rating'}">${['low', 'mid', 'high'].map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${x}</option>`).join('')}</select>`; }
function tiersText(J) { const S = subjFacts(J); const one = (F, who) => ['q', 'c'].filter(k => F[k]).map(k => `${fineOf(J, who, k)} ${String(F[k]).match(/[QC]\d/i) ? String(F[k]).match(/[QC]\d/i)[0].toUpperCase() : F[k]}`).join(' / ');
  const parts = usedComps(J).map(c => { const t = one(compFacts(c, J), c.id); return t ? `Comparable ${c.use} ${t}` : ''; }).filter(Boolean);
  const st = one(S, 'subj'); if (!st && !parts.length) return '';
  return `Within the UAD quality and condition ratings, the subject is rated ${st || 'as shown'}${parts.length ? '; ' + parts.join('; ') : ''}. Quality and condition adjustments reflect these positions within each rating.`; }

/* ---------------- analyzed – not used (UAD 22.17) and her comp database ---------------- */
const NOTUSED_REASONS = [['AccessoryDwellingUnit', 'ADU'], ['Age', 'Age'], ['Amenities', 'Amenities'], ['AreaBelowGrade', 'Below-grade area'], ['BathroomCount', 'Baths'], ['BedroomCount', 'Bedrooms'], ['Condition', 'Condition'], ['DatedSale', 'Dated sale'],
  ['DesignOrStyleVariance', 'Design / style'], ['GrossBuildingArea', 'Gross building area'], ['GrossLivingArea', 'Living area'], ['LotSize', 'Lot size / usable area'], ['Outbuildings', 'Outbuildings'], ['Proximity', 'Proximity'], ['Quality', 'Quality'],
  ['SaleOrTransferType', 'Sale / transfer type'], ['SiteInfluence', 'Location (site influence)'], ['Other', 'Other']];
const markNotUsed = c => { c.notUsed = c.notUsed || { reasons: [], text: '', report: true }; c.use = null; };
function notUsedHTML(J) { const L = J.comps.filter(c => c.notUsed && !c.use); if (!L.length && !app.nuAsk) return '';
  const ask = app.nuAsk && J.comps.find(c => c.id === app.nuAsk);
  return `<h2>Analyzed – not used <small>${L.filter(c => c.notUsed.report).length} go in the report (UAD “Additional properties analyzed not used”)</small></h2>
    ${ask ? `<div class="nuask"><b>${esc(compTitle(ask))}</b> is off the grid and kept here as analyzed – not used. Pick the reason(s) below. <button class="btn sm" data-savedb="${ask.id}">Save it to my comp database</button> <button class="btn sm" data-act="nuok">OK</button></div>` : ''}
    ${L.map(c => { const N = c.notUsed; const st = V(c, 'status') || ''; return `<div class="nu"><div class="nuh"><b>${esc(compTitle(c))}</b> <small>${esc([st, money(V(c, 'salePrice') || V(c, 'listPrice')), showDate(V(c, 'saleDate') || V(c, 'contractDate'))].filter(Boolean).join(' · '))}</small>
      <label class="inl"><input type="checkbox" data-nu="${c.id}|report" ${N.report ? 'checked' : ''}> show in the report</label> <label class="inl"><input type="checkbox" data-nu="${c.id}|client" ${N.client ? 'checked' : ''}> client asked me to consider it</label>
      <button class="btn sm" data-savedb="${c.id}">Save to my comp database</button> <button class="btn sm" data-nuback="${c.id}">Back to the grid list</button></div>
      <div class="nur">${NOTUSED_REASONS.map(([v, l]) => `<label class="chip2"><input type="checkbox" data-nur="${c.id}|${v}" ${N.reasons.includes(v) ? 'checked' : ''}>${esc(l)}</label>`).join('')}
      ${N.reasons.includes('Other') ? `<input class="txt sm" data-nu="${c.id}|other" maxlength="27" value="${esc(N.other || '')}" placeholder="Other reason (27 characters)">` : ''}</div>
      <input class="txt" data-nu="${c.id}|text" maxlength="360" value="${esc(N.text || '')}" placeholder="Comment, e.g. Superior quality and located further from the subject (360 characters)"></div>`; }).join('')}`; }
function notUsedXML(PROPS, job) { let k = 0;
  job.comps.filter(c => c.notUsed && c.notUsed.report && !c.use).forEach(c => { const N = c.notUsed; const g = x => V(c, x); k++;
    const P = X(PROPS, 'PROPERTY', { ValuationUseType: 'PropertyAnalyzedNotUsed' });
    const ad = X(P, 'ADDRESS'); XV(ad, 'AddressLineText', g('addr')); if (g('unit')) { XV(ad, 'AddressUnitDesignatorType', 'Unit'); XV(ad, 'AddressUnitIdentifier', g('unit')); }
    XV(ad, 'CityName', g('city') || ARCH.zipCity[g('zip')] || ''); XV(ad, 'PostalCode', zip9(c)); XV(ad, 'StateCode', 'CA');
    XV(X(X(P, 'COMPARABLE'), 'COMPARABLE_DETAIL'), 'PropertyOrdinalNumber', k);
    const s = String(g('status') || (g('salePrice') ? 'Closed' : '')); const lst = /closed|sold|settled/i.test(s) ? 'SettledSale' : /pending|escrow|contingent/i.test(s) ? 'Pending' : /active|coming/i.test(s) ? 'Active' : s ? 'OffMarket' : null;
    if (lst) XV(X(X(X(P, 'LISTING_INFORMATIONS'), 'LISTING_INFORMATION'), 'LISTING_INFORMATION_DETAIL'), 'ListingStatusType', lst);
    const PN = X(P, 'PROPERTY_NOT_USED'); const det = X(PN, 'PROPERTY_NOT_USED_DETAIL'); XV(det, 'AdditionalPropertyAnalyzedNotUsedText', (N.text || '').slice(0, 360)); XV(det, 'ConsiderationRequestedIndicator', N.client ? 'true' : 'false');
    if (N.reasons.length) { const RS = X(PN, 'PROPERTY_NOT_USED_REASONS'); N.reasons.forEach(r => { const e = X(RS, 'PROPERTY_NOT_USED_REASON'); XV(e, 'ReasonPropertyNotUsedType', r); if (r === 'Other') XV(e, 'ReasonPropertyNotUsedTypeOtherDescription', (N.other || 'Other').slice(0, 27)); }); }
    const sd = g('saleDate'); if (lst === 'SettledSale' && sd && String(sd).length === 10) { const h = X(X(P, 'SALES_HISTORIES'), 'SALES_HISTORY'); XV(h, 'OwnershipTransferDate', sd); XV(h, 'OwnershipTransferTransactionType', 'Sale'); }
  }); }
async function saveToMyDb(c) {   // her own comp database: kept on this computer, merged into the archive at the next rebuild
  const rec = await DB.get('kv', 'mycomps'); const list = (rec && rec.v) || []; const J = app.job;
  const values = Object.fromEntries(FIELDS.map(f => [f.k, V(c, f.k)]).filter(([, v]) => !blank(v)));
  const key = (values.addr || compTitle(c)) + '|' + (values.saleDate || values.contractDate || '');
  const row = { key, saved: Date.now(), job: J.name, title: compTitle(c), values, sources: sourcesOf(c), notUsed: c.notUsed || null, adjustments: J.grid && J.grid.cells ? J.grid.cells[c.id] || null : null,
    tiers: { q: fineOf(J, c.id, 'q'), c: fineOf(J, c.id, 'c') }, landscaping: values.landscaping || null, compNo: c.use || null };   // her low / mid / high tiers: her database only, never UAD
  // her rule (Oct 19 2026): no duplicate entries – the same comp, only more aged or with the prior sales re-checked, replaces the saved one; anything else is kept as a new version
  const fam = x => x.key === key || String(x.key).startsWith(key + '|v');
  let same = list.findIndex(x => fam(x) && x.job === J.name);   // saved again from the same assignment: that version is updated
  if (same < 0) same = list.findIndex(x => fam(x) && sameButAged(x.values || {}, values));
  if (same >= 0) { row.key = list[same].key; row.jobs = [...new Set([...(list[same].jobs || [list[same].job]), J.name])]; list[same] = row; }
  else { const n = list.filter(fam).length; if (n) row.key = key + '|v' + (n + 1); row.jobs = [J.name]; list.push(row); }
  await DB.put('kv', { id: 'mycomps', v: list }); return list.length; }

/* text for an Add Other row (subject or comp) */
function otherDesc(r, F) {
  if (r[0] === 'usable') return blank(F.usable) ? '' : (+F.usable).toFixed(2) + ' ac';
  return String(F[r[0]] || '').trim();
}

/* ---------------- review: direction, math, consistency, missing, bracketing, limits (Oct 2026) ----------------
   Every flag can be marked OK with her reason; nothing is changed for her. */
const LAND_SCALE = ['none', 'minimal', 'fair', 'avg-fair', 'average', 'avg-good', 'good', 'very good', 'excellent'];
const GRID_LIMITS = { gross: 25, net: 15, line: 10 };
const LIMIT_TEXT = 'Adjustments for some comparables exceed typical guidelines (25% gross, 15% net, 10% for a single line). This is expected given the lack of more similar sales and the non-conforming nature of this market segment; the comparables used are the most similar sales available and were weighted accordingly.';
function goodness(k, F) {   // a number where higher = better, or null when it cannot be told
  const n = v => blank(v) || v === '' ? null : num(v);
  const rating = v => { const m = String(v || '').match(/(\d)/); return m ? -(+m[1]) : null; };   // Q2 is better than Q4
  switch (k) {
    case 'gla': case 'bsmt': case 'site': case 'garage': return n(F[k]);
    case 'beds': return capBeds(F.beds);   // up to 3: more bedrooms are covered by living area
    case 'usable': return n(F.usable);
    case 'landCommon': return F._own === undefined ? null : (F._own ? 1 : 0);   /* owned land is one step above land in common */
    case 'unitPos': { const t = String(F.unitPos || ''); if (!t.trim()) return null; return /corner|end/i.test(t) ? 1 : /interior|inside|middle/i.test(t) ? 0 : null; }
    case 'attach': { const t = String(F.attach || ''); if (!t.trim()) return null; return /detach/i.test(t) ? 1 : /attach|row|semi|town/i.test(t) ? 0 : null; }
    case 'baths': return blank(F.full) ? null : (+F.full) + (+F.half || 0) / 2;
    case 'q': return ratingPos(F.q, F._fine ? F._fine.q : 'mid'); case 'c': return ratingPos(F.c, F._fine ? F._fine.c : 'mid');
    case 'view': return viewTier(F.view);
    case 'land': { const t = String(F.land || '').toLowerCase().replace(/\bv(ery)?[-. ]?good\b/, 'very good').replace(/average[- ]good|avg[- ]good/, 'avg-good').replace(/average[- ]fair|avg[- ]fair/, 'avg-fair').replace(/^avg$/, 'average');
      const i = LAND_SCALE.findIndex(x => t.startsWith(x)); return i < 0 ? null : i; }
    case 'pool': { const v = ['pool', 'spa', 'pond', 'lake'].map(x => hasFeat(F, x)); return v.every(x => x === null) ? null : v.reduce((a, b) => a + (b || 0), 0); }
    case 'courts': { const v = ['tennis', 'sport'].map(x => hasFeat(F, x)); return v.every(x => x === null) ? null : v.reduce((a, b) => a + (b || 0), 0); }
    case 'adu': { const A = aduNums(F); if (A.sf) return A.sf + A.baths * 200; const t = String(F[k] || '').trim(); if (!t) return null; return /^(no|none)$/i.test(t) ? 0 : 1; }
    default: return null;
  }
}
const REVIEW_ROWS = { gla: 'sq ft', bsmt: 'sq ft', usable: 'acre', beds: 'bedroom', baths: 'bath', garage: 'space', q: 'quality step', c: 'condition step', view: 'view tier', land: 'landscaping step', pool: '', courts: '', adu: '', site: 'sq ft' };
const SMALL = { gla: 100, bsmt: 100, usable: 0.05, site: 2000 };   // differences this small are often not adjusted
const sgn = a => (a < 0 ? '−' : '+') + money(Math.abs(a));
const factText = (id, F) => id === 'baths' ? (blank(F.full) ? '?' : F.full + '/' + (F.half || 0)) : (showFact(id, F[id]) || '?');
function gridReview(J) {
  const used = usedComps(J); const S = subjFacts(J); const G = G0(J); const out = []; const add = (key, sev, msg, extra) => out.push({ key, sev, msg, ok: G.ok && G.ok[key], ...(extra || {}) });
  const rowOf = id => adjRows(J).find(r => r[0] === id);
  Object.keys(REVIEW_ROWS).forEach(id => { const row = rowOf(id); if (!row) return; const per = [];
    used.forEach(c => { const C = compFacts(c, J); const gs = goodness(id, S), gc = goodness(id, C); const a = cellAmount(J, c, row).v; const name = 'Comp ' + c.use;
      if (gs === null || gc === null) { if (a) per.push(null); return; }
      const d = gs - gc;   // > 0: the subject is better, so the comp is adjusted up (+)
      if (d > 0 && a < 0) add(`dir:${c.id}:${id}`, 'Direction', `${name} – ${row[1]}: the comp is inferior to the subject, so the adjustment is usually plus (+), but it is ${sgn(a)}.`);
      else if (d < 0 && a > 0) add(`dir:${c.id}:${id}`, 'Direction', `${name} – ${row[1]}: the comp is superior to the subject, so the adjustment is usually minus (−), but it is +${money(a)}.`);
      const small = SMALL[id] !== undefined && Math.abs(d) < SMALL[id];
      if (d !== 0 && !small && !a && id !== 'site') add(`miss:${c.id}:${id}`, 'Not adjusted', `${name} – ${row[1]}: the comp differs from the subject (${factText(id, S)} vs ${factText(id, C)}) but has no adjustment.`);
      if (id === 'gla' && d !== 0 && Math.abs(d) < 100 && a) add(`gla100:${c.id}`, 'Check', `${name} – living area differs by only ${Math.abs(d)} sq ft; your rule is no adjustment under 100 sq ft, but it is ${sgn(a)}.`);
      if (d === 0 && a && ['gla', 'beds', 'baths', 'garage', 'q', 'c', 'land', 'usable'].includes(id)) add(`eq:${c.id}:${id}`, 'Check', `${name} – ${row[1]}: same as the subject, but adjusted ${sgn(a)}.`);
      if (d !== 0 && a && REVIEW_ROWS[id]) per.push({ name, rate: a / d });
      // math: her own amount against the rate she set
      const own = cellAmount(J, c, row).own; if (own && row[4]) { const ra = rateAmount(row, S, C, J); if (ra !== null && Math.abs(ra - a) > Math.max(1000, Math.abs(ra) * 0.05)) add(`math:${c.id}:${id}`, 'Math', `${name} – ${row[1]}: you typed ${sgn(a)}; your rate × the difference gives ${sgn(ra)}.`); }
    });
    const rs = per.filter(Boolean); if (rs.length > 1) { const v = rs.map(x => Math.abs(x.rate)); const lo = Math.min(...v), hi = Math.max(...v);
      if (lo > 0 && hi / lo > 1.5) add(`cons:${id}`, 'Consistency', `${row[1]}: the amount per ${REVIEW_ROWS[id]} differs between comps (${rs.map(x => x.name + ' ' + money(Math.abs(x.rate))).join(', ')}). Fine if the comps differ in a way that explains it – say why.`); }
  });
  if (gridMode(J) === 'condo' && blank(G.subj.landCommon)) add('condo:land', 'Check', 'Condo: the subject is set as site owned in common (no land owned), as for almost all condos here. If this unit owns land, type No on the "Site owned in common" line – the site size and usable lot lines then show.');
  if (gridMode(J) === 'condo') [['subj', 'Subject', S], ...used.map(c => [c.id, 'Comp ' + c.use, compFacts(c, J)])].forEach(([who, name, F]) => { if (/attach/i.test(String(F.attach || '')) && !/detach/i.test(String(F.attach || '')) && blank(F.structure)) add(`struct:${who}`, 'Check', `${name}: attached – type its structure (low-rise, mid-rise, high-rise, townhouse or semi-detached). UAD 3.6 asks for it on attached units.`); });
  // view: a tier only read from the words (her ACI archive and UAD 2.6 have no view grade) – she decides the degree of view
  [['subj', 'Subject', S.view], ...used.map(c => [c.id, 'Comp ' + c.use, compFacts(c, J).view])].forEach(([who, name, v]) => { if (blank(v)) return; const I = vtInfo(J, who, v);
    if (I.src === null || (I.src === 'read' && I.t > 0)) add(`vt:${who}`, 'View tier', `${name} – view "${v}": the degree of view is only ${I.src === null ? 'unknown' : 'read from the words (' + (VIEW_TIERS.find(x => x[0] === I.t) || [, ''])[1] + ')'}. Decide it (limited, average or excellent/panoramic) and pick it in the box under View – it is kept for this address next time.`); });
  // bracketing on the main features
  [['gla', 'living area'], ['usable', 'usable lot area'], ['q', 'quality'], ['view', 'view'], ['land', 'landscaping']].forEach(([id, l]) => {
    const gs = goodness(id, S); if (gs === null) return; const gc = used.map(c => goodness(id, compFacts(c, J))).filter(x => x !== null); if (gc.length < 2) return;
    if (gs > Math.max(...gc)) add(`br:${id}`, 'Bracketing', `The subject's ${l} is better than every comp – none bracket it from above.`);
    if (gs < Math.min(...gc)) add(`br:${id}`, 'Bracketing', `The subject's ${l} is below every comp – none bracket it from below.`);
  });
  // limits: 25% gross, 15% net, 10% a line
  used.forEach(c => { const t = compTotals(J, c); const name = 'Comp ' + c.use; if (!t.price) return;
    if (t.grossPct > GRID_LIMITS.gross) add(`lim:g:${c.id}`, 'Limit', `${name}: gross adjustment ${t.grossPct.toFixed(1)}% is over ${GRID_LIMITS.gross}%.`, { limit: true });
    if (Math.abs(t.netPct) > GRID_LIMITS.net) add(`lim:n:${c.id}`, 'Limit', `${name}: net adjustment ${t.netPct.toFixed(1)}% is over ${GRID_LIMITS.net}%.`, { limit: true });
    adjRows(J).filter(r => r[3] && rowShown(r, J)).forEach(r => { const a = cellAmount(J, c, r).v; if (a && Math.abs(a) / t.price * 100 > GRID_LIMITS.line) add(`lim:l:${c.id}:${r[0]}`, 'Limit', `${name} – ${r[1]}: ${money(Math.abs(a))} is ${(Math.abs(a) / t.price * 100).toFixed(1)}% of the sale price (over ${GRID_LIMITS.line}%).`, { limit: true }); });
  });
  return out;
}
function reviewHTML(J) {
  if (!usedComps(J).length) return ''; const F = gridReview(J); const open = F.filter(f => !f.ok); const G = G0(J);
  const anyLimit = F.some(f => f.limit); const noted = (G.note || '').includes(LIMIT_TEXT.slice(0, 60));
  return `<div class="review"><h3>Review <small>${F.length ? `${open.length} to check · ${F.length - open.length} marked OK` : 'nothing to flag'}</small></h3>
    <p class="help">Checks your grid for direction (+/−), math, consistency, missing adjustments, bracketing and the 25% gross / 15% net / 10% line guidelines. Nothing is changed for you – mark a flag OK and say why; your reason goes in the workfile.</p>
    ${F.map(f => `<div class="rv ${f.ok ? 'ok' : ''}"><span class="rvs rv-${f.sev.replace(/\s/g, '')}">${esc(f.sev)}</span><span class="rvm">${esc(f.msg)}</span>
      <input class="txt sm" data-gok="${esc(f.key)}" value="${esc(f.ok || '')}" placeholder="OK because…">${f.limit && !f.ok ? `<button class="btn sm" data-gokstd="${esc(f.key)}">Use my standard reason</button>` : ''}</div>`).join('')}
    ${anyLimit && !noted ? `<div class="row"><button class="btn" data-glimnote="1">Add the guideline explanation to the sales comparison comment</button></div><p class="help"><i>${esc(LIMIT_TEXT)}</i></p>` : ''}</div>`;
}

/* ---------------- the subject from her iPad workfile package ---------------- */
async function ingestInspection(files, name) {
  const b = files.get('inspection-backup.json'); const ins = JSON.parse(new TextDecoder().decode(b)).inspection;
  const D = ins.data || {}, L = ins.lists || {}, T = (ins.sketch && ins.sketch.totals) || {}, crs = (D.property && D.property.crs) || {};
  const xmlName = [...files.keys()].find(k => /^SFREP\/[^/]+\.xml$/i.test(k));
  const site = num(crs.lotSf) || null;
  const s = app.job.subject;
  { const TM = { Low: 'low', Middle: 'mid', High: 'high' }, g = G0(app.job); g.fine = g.fine || {}; g.fine.subj = g.fine.subj || {};   // her low / middle / high from the iPad (Oct 20 2026) – only when she has not picked one here
    const C = D.condition || {}; if (C.oqTier && !g.fine.subj.q) g.fine.subj.q = TM[C.oqTier]; if (C.ocTier && !g.fine.subj.c) g.fine.subj.c = TM[C.ocTier]; }
  s.insp = { file: name, inspDate: D.property.inspDate, gla: T.agFin || null, bsmt: T.bgFin || 0, beds: (L.bedrooms || []).length, full: (L.baths || []).filter(x => x.kind === 'FullBathroom').length,
    half: (L.baths || []).filter(x => x.kind === 'HalfBathroom').length, year: num(D.front.yearBuilt), q: D.condition.oq || '', c: D.condition.oc || '', style: D.front.design || '', levels: (L.levels || []).filter(x => !x.grade || /Above/i.test(x.grade)).length || num(D.front.stories),
    siteSf: site, usableAc: D.site.usable === 'All Usable' && site ? acOf(site) : null, garage: D.garage.garShared ? 0 : (D.garage.hasGarage ? num(D.garage.garSpaces) : 0), carport: num(D.garage.carport) || 0, bsmtUnf: T.bgUnf || 0, agUnf: T.agUnf || 0,
    heat: (D.systems.heat || []).filter(x => x !== 'None').join(', ') || ((D.systems.heat || []).includes('None') ? 'None' : ''), cool: (D.systems.cool || []).filter(x => x !== 'None').join(', ') || ((D.systems.cool || []).includes('None') ? 'None' : ''),
    func: ((D.condition || {}).func || []).filter(x => x !== 'None').join(', ') || (((D.condition || {}).func || []).includes('None') ? 'None observed' : ''), constr: D.front.constr || '',
    view: [(D.site.view || []).join(', '), D.site.viewImpact].filter(Boolean).join(' – '), loc: [(D.site.influences || []).join(', '), D.site.inflImpact].filter(Boolean).join(' – '),
    topo: (D.site.topo || []).join(', '), energy: (D.systems.renew || []).filter(x => x !== 'None').join(', '),
    pool: (L.waterFeatures || []).map(w => w.type).filter(Boolean).join(', ') || 'None', courts: (D.amenities.rec || []).filter(x => /court/i.test(x)).join(', '), porch: (L.outdoorLiving || []).map(o => o.type).filter(Boolean).join(', '),
    adu: [...(L.adus || []).map(a => a.ident || 'ADU'), ...(L.outbuildings || []).filter(o => o.real !== false).map(o => o.label || o.type)].filter(Boolean).join(', '), hasXml: !!xmlName,
    primaryAccess: (() => { const v = (D.street || {}).primaryAccess; const o = typeof PICK !== 'undefined' && PICK.primaryAccess.opts.find(x => x[0] === v); return o ? o[1].replace(/ \(.*\)$/, '') : (v || ''); })(),
    siteChar: ((D.site || {}).siteFeat || []).map(v => { const o = typeof PICK !== 'undefined' && PICK.siteChar.opts.find(x => x[0] === v); return o ? o[1].replace(/ \(.*\)$/, '') : v; }).join('; '),
    hazard: ((D.site || {}).hazard || []).map(v => v === 'None' ? 'None' : v === 'FEMASpecialFloodHazardArea' ? 'FEMA special flood hazard area' : 'Other: ' + (v === 'Other' ? (D.site.hazardOther || 'Other') : v)).join('; '),
    sk: { gar: (T.gar || []).map(x => ({ name: x.name, sf: x.sf })), adu: (T.adu || []).map(x => ({ name: x.name, sf: x.sf })), ob: (T.ob || []).map(x => ({ name: x.name, sf: x.sf })), agNon: T.agNon || 0, bgNon: T.bgNon || 0 } };
  if (!s.addr && D.property.addr) s.addr = D.property.addr;
  if (!s.lat && crs.lat) { s.lat = crs.lat; s.lon = crs.lng; }
  if (!s.apn && crs.apn) s.apn = crs.apn;
  // keep the workfile itself so the full-report export can use its SFREP subject file and photos
  await DB.put('kv', { id: 'insp:' + app.job.id, name, blob: new Blob([await makeZip([...files].filter(([k]) => /^SFREP\//i.test(k)).map(([k, v]) => ({ name: k, data: v })))]) });
  logFile(name, 'Inspection (subject)', 1);
  return `${name}: subject filled from your inspection – ${s.insp.gla ? int(s.insp.gla) + ' sq ft, ' : ''}${s.insp.beds} bedrooms, ${s.insp.full} full / ${s.insp.half} half baths${s.insp.q ? ', ' + s.insp.q + '/' + s.insp.c : ''}.${s.insp.usableAc === null ? ' Usable lot area: measure it.' : ''}`;
}

/* ---------------- adjustments into the SFREP file ---------------- */
function gridAdjustXML(CMP, c, job) {
  const G = job.grid; if (!G) return null; const box = X(CMP, 'COMPARABLE_ADJUSTMENTS'); const C = compFacts(c, job); let any = false;
  // order as on the 3.6 grid (D-1 sample): Add Other rows first, then site, dwelling, units, quality/condition, amenities
  adjRows(job).filter(r => r[3] && rowShown(r, job)).sort((x, y) => (y[3] === 'OTHER') - (x[3] === 'OTHER')).forEach(r => { const a = cellAmount(job, c, r).v;
    if (r[3] === 'OTHER') { const desc = otherDesc(r, C); if (!desc && !a) return; const e = X(box, 'COMPARABLE_ADJUSTMENT'); XV(e, 'AdditionalComparisonLineItemDescription', desc || null); XV(e, 'AdditionalComparisonLineItemIdentifier', r[5]); XV(e, 'ComparableAdjustmentAmount', a || 0); XV(e, 'ComparableAdjustmentType', 'SalesComparableAdditionalAdjustableComparisonItem'); any = true; return; }
    if (a === null || a === undefined) return; const ty = r[0] === 'unitPos' && /town|row/i.test(String(C.structure || '') + String(subjFacts(job).structure || '')) ? 'RowhouseTownhouseEndUnit' : r[3];
    const was = box.kids.find(k => k.tag === 'COMPARABLE_ADJUSTMENT' && k.kids.some(x => x.tag === 'ComparableAdjustmentType' && x.text === ty));   // one UAD line per type: garage + carport = Vehicle Storage
    if (was) { const amt = was.kids.find(x => x.tag === 'ComparableAdjustmentAmount'); if (amt) amt.text = String(Math.round(num(amt.text) + a)); return; }
    const e = X(box, 'COMPARABLE_ADJUSTMENT'); XV(e, 'ComparableAdjustmentAmount', Math.round(a)); XV(e, 'ComparableAdjustmentType', ty); any = true; });
  if (!any) CMP.kids = CMP.kids.filter(k => k !== box);
  return compTotals(job, c);
}

/* full report: her iPad subject file + the comps with your grid, value and Usable Lot Area/Utility row; photos from both */
async function exportFullReport(anyway) {   // the pre-check runs first; "Export anyway" skips it
  const J = app.job;
  if (!anyway) { const T = await precheckRun(J, true); const must = T.items.filter(x => x.sev === 'Must fix').length;
    if (must || T.items.length) { renderKeepFocus(); const c = $('#preCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(must ? `Pre-check: ${must} to fix before export` : `Pre-check: ${T.items.length} to look at – then press Export now`); return; } }
  const r = await buildFullReport(J); if (r.err) { toast(r.err); return; }
  const zip = await makeZip(r.entries); const mb = b => (b / 1048576).toFixed(1) + ' MB'; const zs = zip.size || zip.byteLength || 0;
  download(zip, jobBase() + ' - Full report SFREP.zip'); if (r.fit && r.fit.shrunk) toast(`The photos made the report ${mb(r.fit.before)}; ${r.fit.shrunk} report photos were made smaller so it is ${mb(zs)} (UCDP allows 60 MB). Your workfile keeps the full-size photos.`, 10000);
  else if (zs > 60 * 1048576) toast(`The report file is ${mb(zs)} – over UCDP’s 60 MB. Untick some extra photos (Send to SFREP) on the iPad and export again.`, 12000);
  if (!(r.fit && r.fit.shrunk) && zs <= 60 * 1048576) toast('Saved to your Downloads folder (' + mb(zs) + ')' + (r.charts ? ` – with ${r.charts} market chart${r.charts > 1 ? 's' : ''}` : ' – no market charts (open the order’s Market tab once so they are kept)'), 6000);
}
/* UCDP: a UAD 3.6 ZIP may not be over 60 MB (FAQ, Uniform Collateral Data Portal). When the photos push the report over
   about 55 MB, the report copies of the photos are made smaller (her workfile keeps the full-size ones); maps and charts stay as they are. */
const REPORT_MAX = 55 * 1024 * 1024;
const entrySize = e => e.data instanceof Blob ? e.data.size : e.data && e.data.byteLength != null ? e.data.byteLength : new Blob([e.data]).size;
async function shrinkJpeg(data, max, q) { const blob = data instanceof Blob ? data : new Blob([data], { type: 'image/jpeg' }); let bm; try { bm = await createImageBitmap(blob); } catch (e) { return null; }
  const s = Math.min(1, max / Math.max(bm.width, bm.height)); if (s >= 1 && blob.size < 400000) return null; const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * s); cv.height = Math.round(bm.height * s);
  cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height); const out = await new Promise(r => cv.toBlob(r, 'image/jpeg', q)); return out && out.size < blob.size ? out : null; }
async function fitReportSize(entries) {
  const total = () => entries.reduce((t, e) => t + entrySize(e), 0); const before = total(); if (before <= REPORT_MAX) return { before, after: before, shrunk: 0 };
  let shrunk = 0; const keep = /Images\/(Location Map|Rental Map|Aerial View|Flood Map|Market )/i;
  for (const [max, q] of [[1800, 0.82], [1400, 0.78], [1100, 0.74], [900, 0.7]]) {
    for (const e of entries) { if (!/^Images\/.*\.jpe?g$/i.test(e.name) || keep.test(e.name)) continue; const sm = await shrinkJpeg(e.data, max, q); if (sm) { e.data = sm; shrunk++; } }
    if (total() <= REPORT_MAX) break; }
  return { before, after: total(), shrunk };
}
async function buildFullReport(J) {
  const used = usedComps(J); if (!used.length) return { err: 'Pick comps first' };
  const rec = await DB.get('kv', 'insp:' + J.id); if (!rec) return { err: 'Drop your iPad Workfile package on this page first' };
  const files = await readZip(rec.blob); const xmlName = [...files.keys()].find(k => /^SFREP\/[^/]+\.xml$/i.test(k)); if (!xmlName) return { err: 'That workfile has no SFREP file' };
  const NS = 'http://www.mismo.org/residential/2009/schemas', XL = 'http://www.w3.org/1999/xlink';
  const P = new DOMParser(); const sub = P.parseFromString(new TextDecoder().decode(files.get(xmlName)), 'application/xml');
  const cmp = P.parseFromString(buildCompsMISMO(J, used), 'application/xml');
  const q1 = (d, tag) => d.getElementsByTagNameNS(NS, tag)[0];
  const ORDER = { PROPERTY: ['ADDRESS', 'CAR_STORAGES', 'COMPARABLE', 'DISASTER_MITIGATION_FEATURES', 'ENCUMBRANCES', 'ENERGY_EFFICIENCY_AND_GREEN', 'ENVIRONMENTAL_CONDITIONS', 'FUNCTIONAL_ISSUES', 'HOMEOWNERS_ASSOCIATIONS', 'IMPROVEMENTS', 'INSPECTIONS', 'LISTING_INFORMATION_SUMMARY', 'LISTING_INFORMATIONS', 'LOCATION_IDENTIFIER', 'MARKET', 'NEIGHBORHOOD', 'PARCEL_SUMMARY', 'PARCELS', 'PROJECT', 'PROPERTY_AMENITY', 'PROPERTY_DEFECT', 'PROPERTY_DETAIL', 'PROPERTY_TAXES', 'PROPERTY_USE_SUMMARY', 'PROPERTY_VALUATIONS', 'SALES_CONTRACTS', 'SITE', 'SALES_HISTORIES'],
    VALUATION_ANALYSIS: ['DATA_SOURCES', 'PROPERTIES', 'VALUATION_REPORT'], SERVICE: ['VALUATION', 'PARTIES', 'RELATIONSHIPS', 'SERVICE_DETAIL'],
    VALUATION_REPORT: ['ADDITIONAL_IDENTIFIERS', 'APPROACH_TO_VALUE', 'SCOPE_OF_WORK', 'VALUATION_COMMENTARIES', 'VALUATION_RECONCILIATION', 'VALUATION_REPORT_DETAIL', 'VALUATION_SOFTWARE_SYSTEMS'] };
  const child = (parent, tag) => { for (const k of parent.children) if (k.localName === tag) return k; const e = sub.createElementNS(NS, tag); const seq = D1_ORDER[parent.localName] || ORDER[parent.localName] || []; const r = seq.indexOf(tag);
    const after = [...parent.children].find(k => seq.indexOf(k.localName) > r && r >= 0); parent.insertBefore(e, after || null); return e; };
  const leaf = (parent, tag, text, attrs) => { const e = sub.createElementNS(NS, tag); e.textContent = String(text); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
  const VA = q1(sub, 'VALUATION_ANALYSIS'), PROPS = q1(sub, 'PROPERTIES'), SUBJ = [...PROPS.children].find(p => p.getAttribute('ValuationUseType') === 'SubjectProperty'), SVC = q1(sub, 'SERVICE');
  { const crs = J.subject.crs || {}; const pc = SUBJ && [...SUBJ.children].find(e => e.localName === 'ADDRESS'); const pe = pc && [...pc.children].find(e => e.localName === 'PostalCode');   // subject ZIP+4 from the subject's CRS report
    if (pe && /^\d{4}$/.test(crs.zip4 || '') && pe.textContent.trim() === String(crs.zip || '').slice(0, 5)) pe.textContent = pe.textContent.trim() + '-' + crs.zip4; }
  // comps after the subject; their data sources and relationships
  [...q1(cmp, 'PROPERTIES').children].forEach(p => PROPS.appendChild(sub.importNode(p, true)));
  const DS = child(VA, 'DATA_SOURCES'); [...(q1(cmp, 'DATA_SOURCES') || { children: [] }).children].forEach(d => DS.appendChild(sub.importNode(d, true)));
  if (!DS.children.length) DS.remove();
  const RL = child(SVC, 'RELATIONSHIPS'); [...(q1(cmp, 'RELATIONSHIPS') || { children: [] }).children].forEach(r => RL.appendChild(sub.importNode(r, true)));
  if (!RL.children.length) RL.remove();
  // subject's Usable Lot Area/Utility row
  const S = subjFacts(J);
  adjRows(J).filter(r => r[3] === 'OTHER' && rowShown(r, J)).forEach(r => { const desc = otherDesc(r, S); if (!desc) return; const CM = child(SUBJ, 'COMPARABLE'); const AS = child(CM, 'COMPARABLE_ADJUSTMENTS'); const a = sub.createElementNS(NS, 'COMPARABLE_ADJUSTMENT'); AS.appendChild(a);
    leaf(a, 'AdditionalComparisonLineItemDescription', desc); leaf(a, 'AdditionalComparisonLineItemIdentifier', r[5]); leaf(a, 'ComparableAdjustmentType', 'SalesComparableAdditionalAdjustableComparisonItem'); });
  // the subject's site influences when she changed them on the grid (▾ pick); otherwise the iPad's stay as they are
  if (!blank(G0(J).subj.loc)) { const L = siParse(G0(J).subj.loc); const SITE = child(SUBJ, 'SITE'); [...SITE.children].filter(k => k.localName === 'SITE_INFLUENCES').forEach(k => k.remove());
    if (L.length) { const SIS = child(SITE, 'SITE_INFLUENCES'); L.forEach(i => { const si = sub.createElementNS(NS, 'SITE_INFLUENCE'); SIS.appendChild(si); const d = sub.createElementNS(NS, 'SITE_INFLUENCE_DETAIL'); si.appendChild(d); siXV(d, i, (el, tag, v) => { if (!blank(v)) leaf(el, tag, v); }); }); } }
  // value and comment
  const G = G0(J); const VR = child(VA, 'VALUATION_REPORT');
  if (!blank(G.value) || G.note) { const sca = child(child(VR, 'APPROACH_TO_VALUE'), 'SALES_COMPARISON_APPROACH'); const det = child(sca, 'SALES_COMPARISON_APPROACH_DETAIL');
    if (G.note) leaf(det, 'SalesComparisonCommentDescription', G.note.slice(0, 10000)); if (!blank(G.value)) leaf(det, 'ValueIndicatedBySalesComparisonAmount', Math.round(num(G.value))); }
  writeReportXML(sub, NS, J, SUBJ, VA, SVC);   // assignment, legal, zoning, H&BU, market, contract, value (report.js)
  // market charts from the order's Market tab → subject exhibits (UAD image types Price Trend Graph, Absorption Rate Graph)
  const chartFiles = []; { const o = typeof orderOf === 'function' ? orderOf(J) : null; const CH = o && o.market && o.market.charts;
    if (CH && (CH.trend || CH.absorb)) { const IMS = child(child(child(SUBJ, 'INSPECTIONS'), 'INSPECTION'), 'IMAGES');
      [['trend', 'PriceTrendGraph', 'Price trend – market area and competing sales', 'Market Price Trend.jpg'], ['absorb', 'AbsorptionRateGraph', 'Absorption rate – competing sales', 'Market Absorption Rate.jpg']].forEach(([k, cat, cap, fn]) => {
        const d = CH[k]; if (!d || !/^data:image\/jpeg;base64,/.test(d)) return; const im = sub.createElementNS(NS, 'IMAGE'); IMS.appendChild(im);
        leaf(im, 'ImageCaptionCommentDescription', cap); leaf(im, 'ImageCategoryType', cat); leaf(im, 'ImageFileLocationIdentifier', '\\\\Images\\' + fn); leaf(im, 'MIMETypeIdentifier', 'image/jpeg');
        const bin = atob(d.split(',')[1]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); chartFiles.push({ name: 'Images/' + fn, data: u8 }); }); } }
  // her maps and exhibits (Maps card): location map, rental map, aerial view, flood map
  const mapFiles = []; { const L = typeof mapsForReport === 'function' ? await mapsForReport(J) : []; if (L.length) { const IMS = child(child(child(SUBJ, 'INSPECTIONS'), 'INSPECTION'), 'IMAGES');
    for (const m of L) { const im = sub.createElementNS(NS, 'IMAGE'); IMS.appendChild(im); leaf(im, 'ImageCaptionCommentDescription', m.cap); leaf(im, 'ImageCategoryType', m.cat); leaf(im, 'ImageFileLocationIdentifier', '\\\\Images\\' + m.file); leaf(im, 'MIMETypeIdentifier', 'image/jpeg');
      mapFiles.push({ name: 'Images/' + m.file, data: m.blob }); } } }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<!--Subject from the UAD Field Inspection app, comps and adjustment grid from Comp Genie, for import into Appraise-It Pro (Home > Import Forms).-->\n' + (xsdSort(sub.documentElement), new XMLSerializer().serializeToString(sub.documentElement));   // schema (XSD) element order
  const entries = [{ name: jobBase() + ' - Full report.xml', data: xml }];
  for (const [k, v] of files) if (/^SFREP\/Images\//i.test(k)) entries.push({ name: k.replace(/^SFREP\//i, ''), data: v });
  for (const c of used) { const fr = frontOf(c); if (fr) { const r = await DB.get('photos', fr.id); if (r) entries.push({ name: 'Images/' + photoName(c), data: r.blob }); } }
  entries.push(...chartFiles, ...mapFiles);
  const fit = await fitReportSize(entries);
  return { xml, entries, charts: chartFiles.length, maps: mapFiles.length, fit };
}

/* her note (Oct 20 2026): no loan recorded with the deed = cash (Santa Barbara has many cash sales); a recorded loan stays as the CRS text until she picks the type */
function termsText(f) { f = String(f || '').trim(); if (!f) return ''; if (/no loan|\(cash\?\)|^cash\b/i.test(f)) return 'Cash';
  if (/^loan:/i.test(f)) return /\bFHA\b/i.test(f) ? 'FHA' : /\bVA\b/.test(f) ? 'VA' : /USDA|rural/i.test(f) ? 'USDA Rural Development' : 'Conventional';   // a recorded loan (CRS / CORT lender) – the deed doesn't name the type; Conventional unless the lender line says FHA / VA
  if (/\(agent remarks/i.test(f)) return termsText(f.replace(/\s*\(agent remarks.*$/i, '').replace(/^Seller financing$/i, 'Seller'));   // she clicked the MLS remarks value
  if (/^seller/i.test(f)) return 'Private';
  const m = f.match(/^(Conv|FHA|VA|USDA|Cash|Seller)\s*;\s*\d*/i); if (m) return termsText(m[1]);   // a 2.6 archive entry like Conv;0
  return f; }
/* her 2.6 Heating/Cooling line → the 3.6 heating and cooling fields (her shorthand, Oct 20 2026):
   FWA C/Air = forced warm air + central air · HeatPmp = heat pump (heats and cools) · Rdnt = radiant · Split = split system (heats and cools)
   Wall = wall heater · BB / HWBB = baseboard · Indiv / Ind/Air = individual a/c · Gravity / Floor = gravity (floor furnace) · None = no cooling */
function archHC(raw) {
  const t0 = String(raw || '').replace(/ /g, ' ').replace(/^['"0]+/, '').trim(); const t = t0.toLowerCase(); if (!t) return { heat: '', cool: '' };
  const H = []; const add = (k, re) => { const m = t.match(re); if (m && !H.some(h => h.k === k)) H.push({ k, i: m.index }); };
  add('ForcedWarmAir', /fwa|\bfau\b|\bfag\b|\bfaw\b|forced (?:air|warm|solar)|hvac|central heat|gas fwa/);
  add('Radiant', /radi(?!ator)|rdnt|rndt|rdmt|rdiant|radnt|randiant|hydronic|rdnt flr|radiant floor/);
  add('Baseboard', /hwbb|\bbb\b|baseboard|bsbrd|bsbrd/);
  add('Radiators', /radiator|boiler|\bhw\b|frcdh20/);
  add('GravityAir', /grav|grvty|\bfloor\b(?! heat)/);
  add('Other:Wall heater', /\bwall\b|\bwll\b|\bwal\b/);
  add('Other:Heat pump', /heat ?pu?mp|htpmp|heatpump|heat pmp|\bhp\b/);
  add('MiniSplit', /split|splt/);
  add('Stove', /stove/); add('Fireplace', /fireplace/);
  if (!H.length && /solar/.test(t)) H.push({ k: 'PassiveSolar', i: 0 });
  if (!H.length && /^(elect|elec|electric)\b/.test(t)) H.push({ k: 'Other:Electric heat', i: 0 });
  if (/radiant floor|rdnt flr|floor heat/.test(t)) { const g = H.findIndex(h => h.k === 'GravityAir'); if (g >= 0 && !/grav|grvty/.test(t)) H.splice(g, 1); }
  H.sort((a, b) => a.i - b.i);
  const LBL = { ForcedWarmAir: 'Forced warm air', Radiant: 'Radiant', Baseboard: 'Baseboard', Radiators: 'Radiators', GravityAir: 'Gravity air', MiniSplit: 'Mini split', Stove: 'Stove', Fireplace: 'Fireplace', PassiveSolar: 'Passive solar' };
  const heat = H.length ? H.map(h => /^Other:/.test(h.k) ? 'Other: ' + h.k.slice(6) : LBL[h.k]).join('; ') : (/^(none|no heat)\b/.test(t) ? 'None' : '');
  let cool = '';
  if (/ind\/air|indiv|individual|window/.test(t)) cool = 'Individual';
  const central = /c\s*\/\s*a+i?r|c\.air|\bcair\b|c\/ar\b|central(?! heat)|\bcac\b|hvac|fwa \/air|heat ?pu?mp|htpmp|heatpump|heat pmp|\bhp\b/.test(t), generic = /a\/c|\bac\b|a\/cir|cooling|\bair\b/.test(t), split = /split|splt/.test(t);
  if (central) cool = 'Centralized';   // a heat pump cools through the ducts
  else if (split && !cool) cool = 'Individual';   // a split / mini-split system cools room by room ("Split Heat/A/C" too)
  else if (generic && !cool) cool = 'Centralized';
  if (!cool && /evap/.test(t)) cool = 'Other: Evaporative';
  if (!cool && /\bnone\b|noine|noen|none$|heat only|heating only|\bfans\b|ventltn|no heat/.test(t)) cool = 'None';
  if (!cool && (H.length || /^heat(ing)?$/.test(t)) && !/unk|\byes\b|other|mixed/.test(t)) cool = 'None';   // her rule (Oct 20 2026): only a heater listed (Wall Gas, Radiant, FWA) = no cooling
  return { heat, cool, known: !!(heat || cool) };
}

/* hazard zone for a comp: her 2.6 archive words first (location factors, verification source), then the CRS FEMA zone (A… / V… = special flood hazard area, X / B / C / D = none) */
const FLOOD_WORDS = /\b(fld ?zne?|fldzn|fld ?wy|fldway|flood ?zone|flood ?way|floodway|fema flood|sfha)\b/i;
const FIRE_WORDS = /\b(fire ?zne?|fire ?zone|vhfhsz|fire hazard|hi fire|high fire)\b/i;
function hazardOf(c) {
  const a = archChosen(c) || (c.src.arch || [])[0]; const words = a && a.v ? [a.v.locRating, a.v.locFactors, a.v.verification].filter(Boolean).join(' ; ') : '';
  const out = [];
  if (FLOOD_WORDS.test(words)) out.push('FEMA special flood hazard area');
  if (FIRE_WORDS.test(words)) out.push('Other: Very high fire hazard severity zone');
  const fz = String(V(c, 'fema') || '').trim().toUpperCase();
  if (!out.length && fz) out.push(/^(A|V)/.test(fz) ? 'FEMA special flood hazard area' : 'None');
  return out.join('; ');
}

/* her 2.6 "Functional utility" line (aci FunctionalUtility, kept as the archive's remodel text) – her rules (Oct 20 2026):
   Floorplan / Flrpln / Flr pln → Functional utility: Floor plan · TndmBr / tandem bedroom → Functional utility: Other: Tandem bedrooms
   Tandem / TndmGar / tandem bay / tandem parking → the vehicle storage line (3.6 has no tandem field – it shows with the garage and in her notes)
   Low ceilings → Ceiling height · Over improvement → Overimprovement · everything else (remodel years, dated, C3+, 2 lots …) goes to the comp's notes */
function archFU(c) {
  const a = archChosen(c) || (c.src.arch || [])[0]; const t = String(a && a.v ? a.v.remodel || '' : '').trim(); if (!t) return { func: '', tandem: '', raw: '' };
  const L = t.toLowerCase(); const F = [];
  if (/fl\w{0,3}r\s*\.?\s*pl|flrpl|floorpl|flr\s*pln|dysfnctnl|funct\w*\.?\s*obsol|layout(?!\/terr)/.test(L)) F.push('Floor plan');
  if (/low\s*ceil|ceiling height|slpd\s*ceil/.test(L)) F.push('Ceiling height');
  if (/over\s*-?\s*improv/.test(L)) F.push('Overimprovement');
  const bed = /tndm\s*b(d|r|ed)|tandem\s*b(d|r|ed)/.test(L); if (bed) F.push('Other: Tandem bedrooms');
  const gar = !bed && /tndm|tandem/.test(L) || /tndm\s*ga|tandem\s*ga|tndmgar|tndmgrg|tandem\s*(bay|park)/.test(L);
  const m = t.match(/(\d+)\s*[- ]?\s*(tndm|tandem)/i);
  return { func: F.join('; '), tandem: gar ? (m ? m[1] + ' tandem space' + (+m[1] === 1 ? '' : 's') : 'Tandem') : '', raw: t };
}

/* her note (Oct 20 2026): 3.6 says "Settled sale" – the MLS "Closed" / "Sold" shows that way (also Under contract → Pending, Expired / Withdrawn / Cancelled → Off market) */
function statusText(s) { s = String(s || '').trim(); if (!s) return ''; if (/^(closed|sold|settled)/i.test(s)) return 'Settled sale'; if (/^(pending|under contract|contingent|escrow)/i.test(s)) return 'Pending';
  if (/^active|^coming/i.test(s)) return 'Active'; if (/^(expired|withdrawn|cancel+ed|off ?market|temp)/i.test(s)) return 'Off market'; return s; }
