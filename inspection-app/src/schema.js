/* ============================================================
   Field schema for the UAD 3.6 inspection app (v2).
   k = key, l = label, t = type, o = options, req = required (bool | fn),
   uad = MISMO data point, fid = URAR field ID, show = visibility fn,
   lim = character limit, remind = reminder text shown when visible.
   Types: yn, one, multi, sel, num, text, date, year, money, note, photo,
          count, calc, info, appliances, city, zip
   ============================================================ */

const opts = (...a) => a.map(x => Array.isArray(x) ? x : [x, x]);
const UN = k => UAD[k];
const U = k => UAD[k].filter(([c]) => c !== 'None');
const noneFirst = (list, label) => { const n = list.find(x => x[0] === 'None'); const rest = list.filter(x => x[0] !== 'None'); return [['None', label || (n ? n[1] : 'None')], ...rest]; };
const twtFirst = list => [...list.filter(x => x[0] === 'TypicalWearAndTear'), ...list.filter(x => x[0] !== 'TypicalWearAndTear')];
const order = (list, first) => [...first.map(c => list.find(x => x[0] === c)).filter(Boolean), ...list.filter(x => !first.includes(x[0]))];

const QR = opts('Q1','Q2','Q3','Q4','Q5','Q6');
const CR = opts('C1','C2','C3','C4','C5','C6');
const COMP_COND = twtFirst(UN('ImprovementComponentConditionStatusType'));
const COND_STATUS = twtFirst(UN('RoomConditionStatusType'));
const UPDATE = order(UN('RoomUpdateStatusType'), ['FullyUpdated','PartiallyUpdated','NotUpdated']);
const TIMEFRAME = order(UN('RoomUpdatedTimeframeType'), ['LessThanOneYear','OneToFiveYears','FiveToTenYears','TenOrMoreYears']);
const CEIL_H = order(UN('ApproximateCeilingHeightType'), ['LessThanSevenFeet','SevenFeet','EightFeet','NineFeet','TenFeetAndAbove','TwoOrMoreStories']);
const CEIL_S = opts(['Flat','Flat'],['Vaulted','Vaulted'],['Cathedral','Cathedral'],['Beams','Beams'],['Coffered','Coffered'],['Tray','Tray'],['Barrel','Barrel'],['Drop','Drop'],
  'Groin Vaulted','Coved','Paneled','Copper','Decorative','Mural','Tongue & Groove Flat','Tongue & Groove Wood Beam','Tongue & Groove Vaulted','Tower',['Other','Other']);
const FLOORING = opts('Tile','Stone Tile','Stone Slab',['Hardwood','Hardwood'],['EngineeredWood','Engineered Wood'],'Bamboo',['Laminate','Laminate'],'LVP','Vinyl Tile','Vinyl Sheet',['Carpet','Carpet'],['FinishedConcrete','Finished Concrete'],'Plywood','None',['Microcement / Plaster','Other','Other']);
const COUNTERS = opts('Stone Slab','Tile','Corian / Solid Surface','Butcher Block','Concrete','Stainless Steel','Porcelain Slab','Laminate','Microcement / Plaster','Other');
const CABINETS = opts('Custom Built','Semi-Custom','Stock','Solid Wood','Painted Wood','Stained Wood','Matched Grain Laminate','Lacquer / High Gloss','Thermofoil','Laminate','MDF','Metal','Glass Front','Inset','Frameless (Full Overlay)','Slab / Flat Panel','Shaker','Raised Panel','White Oak','Rift-sawn Oak','Walnut','Panel-ready Appliance Fronts','Other');
const FIXTURE_FIN = opts('Polished Chrome','Brushed Nickel','Polished Nickel','Stainless','Unlacquered Brass',['Polished Gold Tone','Gold tone – polished'],['Brushed Brass / Gold','Gold tone – brushed / satin'],'Matte Black','Oil-rubbed Bronze','Mixed Metals');
const BATH_MAT = opts('Stone Tile','Stone Slab','Tile','Corian','Glass Tile','Acrylic / Fiberglass','Cast Iron','Enameled Steel','Copper','Concrete','Waterproof Plaster (Tadelakt / Microcement)','Other');
const REMODEL = opts('Gutted and Remodeled','Remodeled','Updated','Partially Updated','Older Remodel','Dated','Original','New Construction');
const BRANDS = ['Wolf','Viking','Miele','Sub-Zero','Thermador','Dacor','Bosch','GE Profile','GE Monogram','GE Café','KitchenAid','La Cornue','Bertazzoni','Gaggenau','JennAir','Fisher & Paykel','Sharp','LG','Samsung','Maytag','Kenmore','Frigidaire','Whirlpool','Asko','BlueStar','O\'Keefe & Merritt','Other'];
/* Kitchen appliances: tap one, pick brand (and quantity where it applies), it folds closed */
const APPLIANCES = [
  { k: 'refFrz', l: 'Refrigerator / Freezer', qty: true, brand: true },
  { k: 'ref', l: 'Refrigerator (column)', qty: true, brand: true },
  { k: 'frz', l: 'Freezer (column)', qty: true, brand: true },
  { k: 'refDrw', l: 'Refrigerator Drawers', qty: true, brand: true },
  { k: 'frzDrw', l: 'Freezer Drawers', qty: true, brand: true },
  { k: 'dw', l: 'Dishwasher', qty: true, brand: true },
  { k: 'range', l: 'Range', brand: true },
  { k: 'proRange', l: 'Professional Range', brand: true },
  { k: 'cooktop', l: 'Cooktop', brand: true },
  { k: 'induction', l: 'Induction Cooktop', brand: true },
  { k: 'wallOven', l: 'Wall Oven', qty: true, brand: true },
  { k: 'steam', l: 'Steam Oven', brand: true },
  { k: 'micro', l: 'Microwave', brand: true },
  { k: 'microDrw', l: 'Microwave Drawer', brand: true },
  { k: 'warming', l: 'Warming Drawer', brand: true },
  { k: 'hood', l: 'Hood / Vent', brand: true },
  { k: 'wine', l: 'Wine Refrigerator', qty: true, brand: true },
  { k: 'bev', l: 'Beverage Center', brand: true },
  { k: 'ucRef', l: 'Under-counter Refrigerator', brand: true },
  { k: 'ice', l: 'Ice Maker', brand: true },
  { k: 'coffee', l: 'Espresso / Coffee Station', brand: true },
  { k: 'compactor', l: 'Trash Compactor', brand: true },
  { k: 'disposal', l: 'Disposal' },
  { k: 'potFiller', l: 'Pot Filler' },
  { k: 'waterHot', l: 'Filtered Water (Hot)' },
  { k: 'waterCold', l: 'Filtered Water (Cold)' },
];
const CITIES = opts('Santa Barbara','Goleta','Carpinteria','Summerland','Other');
const ZIPS = ['93101','93103','93105','93108','93109','93110','93111','93117','93013','93067','Other'];
const LEVELS_ALL = opts(['LevelOne','Level 1'],['LevelTwo','Level 2'],['LevelThree','Level 3'],['LevelFour','Level 4'],['LevelFive','Level 5'],['LevelSix','Level 6'],['LevelSeven','Level 7'],['LevelEight','Level 8'],['LevelNine','Level 9'],['LevelTen','Level 10'],['BelowGradeOne','Level B1'],['BelowGradeTwo','Level B2'],['BelowGradeThree','Level B3'],['BelowGradeFour','Level B4'],['BelowGradeFive','Level B5']);
const ROOM_TYPES = ['Entry','Foyer','Living Room','Great Room','Family Room','Dining Room','Dining Area','Breakfast Room','Nook','Sitting Room / Area','Den','Office','Study','Library',
  'Recreation Room','Game Room','Media Room','Theater','Music Room / Studio','Art Studio','Butler\'s Pantry','Walk-In Pantry','China Room','Flower Room','Wrapping Room','Laundry Room','Mudroom',
  'Dog Grooming Room','Stylist / Glam Room','Massage Room','Spa Room','Gym','Sunroom','Loft','Bonus Room','Wine Cellar','Wine Room','Workshop','Storage','Mechanical','Utility Room','Hall','Other'];
const MAIN_ROOMS = ['Entry','Foyer','Living Room','Great Room','Family Room','Dining Room','Den','Office','Study','Library','Media Room','Theater','Recreation Room','Game Room'];
const ROOM_FEATURES = opts('Fireplace','Built-in Shelving','Built-in Cabinetry','Built-in Desk','Wet Bar','Loft','Wainscoting','Crown Molding','Wood Paneling','Wallpaper','Glass Double Doors','Sliding Doors to Patio','Window Seat','View','Sound System','Projector / Screen','Acoustic Panels','Sink','Counters','Mirrors','Rubber Flooring');
const MEASURE = { Deck: 'deck', Balcony: 'balcony', Portico: 'portico', Porch: 'porch', Patio: 'patio', Gazebo: 'gazebo' };

/* ---------------- Repeatable lists ---------------- */

/* ---------- Condo / co-op / PUD helpers ---------- */
const PRP = ins => (ins && ins.data && ins.data.property) || {};
const IS_PROJ = ins => PRP(ins).project === true;                         // condominium / cooperative / condop
const IS_PUD = ins => PRP(ins).pud === true;
const IS_HOA = ins => IS_PROJ(ins) || IS_PUD(ins);
const IS_COOP = ins => IS_PROJ(ins) && ['Cooperative','Condop'].includes(PRP(ins).legal);
const IS_CONDO = ins => IS_PROJ(ins) && PRP(ins).legal === 'Condominium';
const HO_EXT = ins => PRP(ins).hoExt !== false;                           // false = HOA maintains the exterior
const RISE = ins => PRP(ins).attach === 'Attached' && ['Lowrise','Midrise','Highrise'].includes(PRP(ins).structDesign);
const IMPACT = opts('Neutral','Adverse','Beneficial');
const ASSIGN = opts('Assigned','Unassigned','Owned');
const PROJ_EXTRA = ['Golf Course (Pitch & Putt)','Golf Course','Landscaped Grounds','Courtyard','Walkways','Greenbelt','Guest Parking','Parking Garage','Carports','Open Parking','Security Patrol','Mail Room','Package Room','Trash Enclosure','Bike Storage','Hallways','Stairwells'];
const PROJ_AMEN = [['None','None'], ...['Beach','BuildingMaintenance','BusinessCenter','CaregiverServices','Clubhouse','ClubMembership','ConciergeServiceCoordination','Cooling','Deck','ElectricVehicleChargingStation','Elevator','FitnessArea','GatedCommunity','GroundsMaintenance','Heating','IngroundPool','IngroundSpa','Lobby','OngoingCleaningServices','Patio','Playground','RecreationArea','Sauna','SharedLaundryFacilities','ShortTermRentalServices','SportsCourt','TelevisionOrInternetServices','TrashRemoval','UnitStorage','WaterAccess','WaterFrontage'].map(c => (UAD.AmenityType.find(x => x[0] === c) || [c, c])),
  // your own common-area choices: each one goes to SFREP as amenity "Other" with its name as the description
  ...PROJ_EXTRA.map(n => ['Other:' + n, n]), ['Other', 'Other (type it)']];
const PROJ_SRC = opts(['CondominiumQuestionnaire','Condominium Questionnaire'],['HomeownersAssociation','Homeowners Association'],['PropertyManagementCompany','Property Management Company'],['PropertyOwner','Property Owner'],['RealEstateAgent','Real Estate Agent'],['MLS','MLS'],['AssessorRecord','Assessor Record'],['PropertyDataReport','Property Data Report'],['BuilderOrDeveloper','Builder / Developer'],['CooperativeQuestionnaire','Co-op Questionnaire'],['CooperativeBoard','Co-op Board'],['PreviousAppraisalFile','Previous Appraisal File'],['PlatMap','Plat Map'],['LandSurvey','Land Survey'],['DataAggregator','Data Aggregator'],['PropertyTenant','Property Tenant'],['Other','Other']);

const LISTS = {
  outdoorLiving: {
    title: 'Porches, Patios, Decks & Balconies', addLabel: 'Add porch / patio / deck', quickAdd: { k: 'type', o: ['Patio','Porch','Deck','Balcony','Portico','Veranda','Terrace','Loggia','Courtyard','Roof Deck'] },
    name: (it, i) => it.type || ('Outdoor area ' + (i + 1)),
    fields: [
      { k: 'type', l: 'Type', t: 'one', req: true, o: opts('Patio','Porch','Deck','Balcony','Portico','Veranda','Terrace','Loggia','Courtyard','Roof Deck'), uad: 'AmenityType' },
      { k: 'measure', t: 'info', l: 'Measure it: SFREP requires the area of this item. You will enter it in SFREP from your sketch.', show: it => ['Deck','Balcony','Portico','Porch','Veranda','Roof Deck'].includes(it.type) },
      { k: 'material', l: 'Material', t: 'one', req: it => !!it.type, o: twtFirst(UN('AmenityMaterialType')), uad: 'AmenityMaterialType', show: it => !!it.type },
      { k: 'feat', l: 'Features', t: 'multi', show: it => !!it.type, o: it => opts(...(it.type === 'Patio' ? ['Covered','Trellis Covered','Partially Covered'] : ['Covered','Partially Covered']), 'Screened','Enclosed','Heated','Ceiling Fans','Lighting','Built-in Seating','Retractable Awning','Motorized Screens','Outdoor TV','Speakers','Off Primary Bedroom','Off Living Area') },
      { k: 'cond', l: 'Condition', t: 'one', o: COMP_COND, show: it => !!it.type },
      { k: 'note', l: 'Notes', t: 'note', show: it => !!it.type },
    ],
    photo: { label: it => it.type || 'Outdoor Living', cat: 'SubjectPropertyAmenitiesExhibit' },
  },

  waterFeatures: {
    title: 'Pool, Spa & Water Features', addLabel: 'Add pool / spa / water feature',
    name: (it, i) => labelOf(LISTS.waterFeatures.fields[0].o, it.type) || ('Water feature ' + (i + 1)),
    fields: [
      { k: 'type', l: 'Type', t: 'one', req: true, o: opts(['IngroundPool','In-ground Pool'],'Above-ground Pool',['IngroundSpa','In-ground Spa'],'Above-ground Spa / Hot Tub','Lap Pool','Infinity Edge Pool','Plunge Pool','Cold Plunge',['OutdoorShower','Outdoor Shower'],['Sauna','Sauna'],'Pond','Koi Pond','Fountain','Waterfall','Stream','Reflecting Pool','Splash Pad','Other') },
      { k: 'mat', l: 'Material / finish', t: 'one', o: opts('Gunite / Plaster','Pebble Finish','Tile','Fiberglass','Vinyl Liner','Concrete','Natural Stone','Other'), req: it => it.type === 'IngroundPool' },
      { k: 'feat', l: 'Features', t: 'multi', o: opts('Heated','Solar Heated','Salt Water','Automatic Cover','Safety Fence','Caged','Spa Spillover','Water Slide','Diving Board','Baja Shelf','Lighting','Automation','Indoor') },
      { k: 'cond', l: 'Condition', t: 'one', o: COMP_COND },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: it => labelOf(LISTS.waterFeatures.fields[0].o, it.type) || 'Pool', cat: 'SubjectPropertyAmenitiesExhibit', recommended: true },
  },

  eas: {
    title: 'Extraordinary assumptions & hypothetical conditions', addLabel: 'Add an assumption',
    name: (it, i) => (it.type === 'HC' ? 'Hypothetical condition' : 'Extraordinary assumption') + (it.topic ? ' – ' + it.topic : ' ' + (i + 1)),
    fields: [
      { k: 'topic', l: 'About', t: 'one', req: true, o: opts('Permits','Measurements / floor plan','Defect / condition','Lot lines / boundaries','Easement / encroachment','Proposed construction / plans','Repairs to be completed','Project / HOA data','Well / septic / private utilities','Areas not observed','Year built / age','Other') },
      { k: 'type', l: 'Type', t: 'one', req: true, o: opts(['EA','Extraordinary assumption'],['HC','Hypothetical condition']), help: 'Extraordinary assumption = uncertain but presumed true. Hypothetical condition = known to be untrue as of the effective date (e.g. proposed construction, repairs not yet done).' },
      { k: 'detail', l: 'What it applies to', t: 'text', help: 'e.g. "the 2019 garage conversion", "the 2nd-floor living area", "the north property line"' },
      { k: 'custom', l: 'Your own wording (leave blank to use the standard wording)', t: 'note', lim: 1000 },
      { k: 'note', l: 'Workfile note (support, who said what)', t: 'note' },
    ],
  },
  roofs2: {
    title: 'Other roofs', addLabel: 'Add another roof',
    name: (it, i) => it.where ? (it.where === 'Other' && it.whereOther ? it.whereOther : it.where) + ' roof' : 'Roof ' + (i + 2),
    fields: [
      { k: 'where', l: 'Which roof?', t: 'one', req: true, o: opts('Garage','Addition','ADU / Guest House','Outbuilding','Patio Cover','Porch','Carport','Other') },
      { k: 'whereOther', l: 'Describe', t: 'text', show: it => it.where === 'Other' },
      { k: 'mat', l: 'Material', t: 'one', o: opts('Membrane / Torch-down','Built-up','Composition Shingle','Concrete Tile','Clay Tile','Metal','Wood Shake','Slate','Rolled','Other') },
      { k: 'year', l: 'Installed / replaced (year)', t: 'sel', o: () => yearOpts(1980, false) },
      { k: 'src', l: 'Year per', t: 'one', o: opts('Owner','Permit','Observed','Estimated') },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
  },
  outbuildings: {
    title: 'Outbuildings', addLabel: 'Add outbuilding',
    name: it => it.label || it.type || 'Outbuilding',
    fields: [
      { k: 'type', l: 'Building type', t: 'one', req: true, o: opts('Guest House','Guest Quarters','Studio','Art Studio','Pool House','Cabana','Gym','Office','Recreation','Spa','Sauna','Pavilion','Barn','Stable','Shed','Storage','Workshop','Greenhouse','Boathouse','Bunkhouse','Kennel','Indoor Riding Arena','Wine Cellar','Other'), uad: 'OutbuildingType' },
      { k: 'label', l: 'Name used in report (optional)', t: 'text' },
      { k: 'measure', t: 'info', l: 'Measure it: SFREP requires the gross building area. You will enter it in SFREP from your sketch.' },
      { k: 'real', l: 'Real property (permanently attached)?', t: 'yn', req: true, uad: 'OutbuildingRealPropertyIndicator' },
      { k: 'year', l: 'Year built', t: 'year' },
      { k: 'util', l: 'Utilities', t: 'multi', o: opts('None','Electricity','Gas','Water','Sanitary Sewer','Septic'), uad: 'UtilityType' },
      { k: 'feat', l: 'Features', t: 'multi', o: opts('Heated','Cooled','Finished Interior','Plumbing','Half Bath','Full Bath','Kitchenette','Loft','Fireplace','Wood Floors','Concrete Floor','Insulated','Rubber Flooring','Mirrors','Stalls','Tack Room','Wash Rack','Hay Storage') },
      { k: 'living', l: 'Living quarters (bedroom, bath, or kitchen)?', t: 'yn', show: it => /Guest|Studio|Pool House|Bunkhouse|Cabana/.test(it.type || ''), req: it => /Guest|Studio|Pool House|Bunkhouse|Cabana/.test(it.type || '') },
      { k: 'permitted', l: 'Structure permitted?', t: 'one', o: opts('Yes','No','Unknown'), req: true },
      { k: 'permKitchen', l: 'Kitchen permitted?', t: 'one', o: opts('Yes','No','Unknown','No Kitchen'), show: it => it.living === true, req: it => it.living === true },
      { k: 'permBath', l: 'Bath permitted?', t: 'one', o: opts('Yes','No','Unknown','No Bath'), show: it => it.living === true, req: it => it.living === true },
      { k: 'permSleep', l: 'Sleeping area permitted?', t: 'one', o: opts('Yes','No','Unknown','No Sleeping Area'), show: it => it.living === true, req: it => it.living === true },
      { k: 'beds', l: 'Bedrooms', t: 'count', show: it => it.living === true, req: it => it.living === true },
      { k: 'fullBaths', l: 'Full baths', t: 'count', show: it => it.living === true, req: it => it.living === true },
      { k: 'halfBaths', l: 'Half baths', t: 'count', show: it => it.living === true, req: it => it.living === true },
      { k: 'kitchen', l: 'Kitchen', t: 'one', o: opts('Full Kitchen','Kitchenette','Wet Bar Only','None'), show: it => it.living === true, req: it => it.living === true },
      { k: 'defects', l: 'Outbuilding defects present?', t: 'yn', req: true, uad: 'OutbuildingDefectsExistIndicator' },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: it => (it.label || it.type || 'Outbuilding') + ' Exterior', cat: 'OutbuildingExhibit', required: true },
    extraPhotos: it => it.living === true ? [
      { key: 'kit', label: (it.label || it.type) + ' Kitchen', show: it.kitchen && it.kitchen !== 'None', required: true, cat: 'UnitInteriorExhibit' },
      { key: 'bath', label: (it.label || it.type) + ' Bath', show: (it.fullBaths || 0) + (it.halfBaths || 0) > 0, required: true, cat: 'UnitInteriorExhibit' },
      { key: 'int', label: (it.label || it.type) + ' Interior', show: true, required: false, cat: 'UnitInteriorExhibit' },
    ] : [{ key: 'int', label: (it.label || it.type || 'Outbuilding') + ' Interior', show: true, required: false, cat: 'OutbuildingExhibit' }],
  },

  adus: {
    title: 'Accessory Dwelling Units (ADU)', addLabel: 'Add ADU',
    name: (it, i) => it.ident || ('ADU ' + (i + 1)),
    fields: [
      { k: 'ident', l: 'ADU name / identifier', t: 'text', req: true, uad: 'UnitIdentifier', lim: 25, help: 'e.g. Cottage, Guest Unit, ADU' },
      { k: 'loc', l: 'Location of ADU', t: 'one', req: true, o: opts(['Dwelling','Within main dwelling'],['Outbuilding','Standalone (separate building)'],['Garage','Above / within detached garage']), uad: 'ImprovementType', fid: '22.07.02' },
      { k: 'measure', t: 'info', l: 'Measure it: SFREP requires the ADU finished area. You will enter it in SFREP from your sketch.' },
      { k: 'permitted', l: 'ADU permitted?', t: 'one', req: true, o: opts('Yes','No','Unknown') },
      { k: 'permKitchen', l: 'Kitchen permitted?', t: 'one', req: true, o: opts('Yes','No','Unknown','No Kitchen') },
      { k: 'permBath', l: 'Bath permitted?', t: 'one', req: true, o: opts('Yes','No','Unknown','No Bath') },
      { k: 'permSleep', l: 'Sleeping area permitted?', t: 'one', req: true, o: opts('Yes','No','Unknown','No Sleeping Area') },
      { k: 'rentable', l: 'Legally rentable', t: 'yn', req: true, uad: 'AccessoryDwellingUnitLegallyRentableIndicator' },
      { k: 'typical', l: 'Typical for market', t: 'yn', req: true, uad: 'AccessoryDwellingUnitTypicalToMarketIndicator' },
      { k: 'access', l: 'Ingress / egress', t: 'one', req: true, o: UN('AccessType'), uad: 'AccessType' },
      { k: 'postal', l: 'Separate postal address', t: 'yn', req: true, uad: 'SeparatePostalAddressIndicator' },
      { k: 'metered', l: 'Utilities separately metered', t: 'yn', req: true, uad: 'UtilitiesMeteredSeparatelyIndicator' },
      { k: 'occ', l: 'Occupancy', t: 'one', req: true, o: UN('UnitOccupancyType'), uad: 'UnitOccupancyType' },
      { k: 'levels', l: 'Levels in unit', t: 'count', req: true, uad: 'LevelCount' },
      { k: 'level', l: 'Level of unit', t: 'one', o: LEVELS_ALL, uad: 'LevelType' },
      { k: 'beds', l: 'Bedrooms', t: 'count', req: true, uad: 'BedroomCount' },
      { k: 'fullBaths', l: 'Full baths', t: 'count', req: true, uad: 'FullBathroomCount' },
      { k: 'halfBaths', l: 'Half baths', t: 'count', req: true, uad: 'HalfBathroomCount' },
      { k: 'kitchen', l: 'Kitchen', t: 'one', req: true, o: opts('Full Kitchen','Kitchenette','None') },
      { k: 'flooring', l: 'Flooring', t: 'multi', req: true, o: FLOORING, uad: 'FlooringType' },
      { k: 'floorUpd', l: 'Overall flooring update status', t: 'one', req: true, o: UN('OverallFlooringUpdateStatusType'), uad: 'OverallFlooringUpdateStatusType' },
      { k: 'ceilH', l: 'Ceiling height (ADU)', t: 'multi', req: true, o: CEIL_H, uad: 'ApproximateCeilingHeightType', help: 'The ADU is a separate unit, so UAD asks for its own ceiling height.' },
      { k: 'ceilS', l: 'Ceiling type (ADU)', t: 'multi', req: true, o: CEIL_S, uad: 'CeilingStyleType' },
      { k: 'kitUpd', l: 'Kitchen update status', t: 'one', o: UPDATE, show: it => it.kitchen && it.kitchen !== 'None', req: it => it.kitchen && it.kitchen !== 'None', uad: 'RoomUpdateStatusType' },
      { k: 'kitTime', l: 'Kitchen update time frame', t: 'one', o: TIMEFRAME, show: it => it.kitUpd && it.kitUpd !== 'NotUpdated', req: it => it.kitUpd && it.kitUpd !== 'NotUpdated', uad: 'RoomUpdatedTimeframeType' },
      { k: 'bathUpd', l: 'Overall bathroom update status', t: 'one', o: UN('OverallBathroomsUpdateStatusType'), req: it => (it.fullBaths || 0) + (it.halfBaths || 0) > 0, uad: 'OverallBathroomsUpdateStatusType' },
      { k: 'iq', l: 'Interior quality', t: 'one', req: true, o: QR, uad: 'InteriorQualityRatingCode' },
      { k: 'ic', l: 'Interior condition', t: 'one', req: true, o: CR, uad: 'InteriorConditionRatingCode' },
      { k: 'features', l: 'Features', t: 'multi', o: opts('Private Entrance','Private Patio / Yard','Laundry','Fireplace','Loft','Vaulted Ceilings','Mini Split','Furnished','Separate Parking','View') },
      { k: 'defects', l: 'ADU interior defects present?', t: 'yn', req: true, uad: 'UnitInteriorDefectsExistIndicator' },
      { k: 'note', l: 'ADU notes', t: 'note' },
    ],
    photo: { label: it => (it.ident || 'ADU') + ' Exterior', cat: 'OutbuildingExhibit', required: true },
    extraPhotos: it => [
      { key: 'kit', label: (it.ident || 'ADU') + ' Kitchen', show: it.kitchen && it.kitchen !== 'None', required: true, cat: 'UnitInteriorExhibit', roomType: 'Kitchen' },
      { key: 'bath', label: (it.ident || 'ADU') + ' Bath', show: (it.fullBaths || 0) > 0, required: true, cat: 'UnitInteriorExhibit', roomType: 'FullBathroom' },
      { key: 'half', label: (it.ident || 'ADU') + ' Half Bath', show: (it.halfBaths || 0) > 0, required: true, cat: 'UnitInteriorExhibit', roomType: 'HalfBathroom' },
      { key: 'living', label: (it.ident || 'ADU') + ' Living Area', show: true, required: false, cat: 'UnitInteriorExhibit' },
      { key: 'bed', label: (it.ident || 'ADU') + ' Bedroom', show: (it.beds || 0) > 0, required: false, cat: 'UnitInteriorExhibit', roomType: 'Bedroom' },
    ],
  },

  levels: {
    title: 'Levels', addLabel: 'Add level',
    name: (it, i) => labelOf(LEVELS_ALL, it.level) || ('Level ' + (i + 1)),
    fields: [
      { k: 'level', l: 'Level', t: 'one', req: true, o: LEVELS_ALL, uad: 'LevelType' },
      { k: 'grade', l: 'Grade level', t: 'one', req: true, o: UN('GradeLevelType'), uad: 'GradeLevelType' },
      { k: 'access', l: 'Access', t: 'one', o: UN('AccessType'), show: it => it.grade && it.grade !== 'AboveGrade', req: it => it.grade && it.grade !== 'AboveGrade', uad: 'AccessType' },
      { k: 'bgAccess', l: 'Below grade exterior access', t: 'one', o: U('BelowGradeExteriorAccessType'), show: it => it.grade && it.grade !== 'AboveGrade' && it.access && it.access !== 'InteriorAccessOnly', req: it => it.grade && it.grade !== 'AboveGrade' && it.access && it.access !== 'InteriorAccessOnly', uad: 'BelowGradeExteriorAccessType' },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
  },

  stairs: {
    title: 'Stairs', addLabel: 'Add staircase',
    name: (it, i) => (it.shape || 'Staircase') + (it.where ? ' – ' + it.where : ''),
    fields: [
      { k: 'shape', l: 'Shape', t: 'one', o: opts('Straight','L-Shape','U-Shape','Curved','Spiral','Floating','Split','Winder','Ladder','Other') },
      { k: 'where', l: 'Location', t: 'text', help: 'e.g. Entry to Level 2' },
      { k: 'mat', l: 'Treads', t: 'multi', o: opts('Wood','Carpet','Stone','Tile','Concrete','Metal','Glass') },
      { k: 'rail', l: 'Railing', t: 'multi', o: opts('Wood','Iron','Metal','Glass','Cable','Stone / Wall','None') },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: it => 'Stairs' + (it.where ? ' – ' + it.where : ''), cat: 'UnitInteriorExhibit' },
  },

  rooms: {
    title: 'Rooms', addLabel: 'Add room', pickFirst: 'type',
    name: (it, i) => it.label || it.type || 'New room – choose a type',
    fields: [
      { k: 'type', l: 'Which room?', t: 'one', req: true, o: opts(...ROOM_TYPES) },
      { k: 'label', l: 'Custom name (optional)', t: 'text', help: 'e.g. "Upstairs Family Room"', show: it => !!it.type },
      { k: 'level', l: 'Level', t: 'one', req: it => !!it.type, o: LEVELS_ALL, uad: 'LevelType', show: it => !!it.type },
      { k: 'flooring', l: 'Flooring', t: 'multi', o: FLOORING, show: it => !!it.type },
      { k: 'ceilS', l: 'Ceiling type', t: 'multi', o: CEIL_S, show: it => !!it.type },
      { k: 'hasFeat', l: 'Any room features?', t: 'yn', show: it => !!it.type },
      { k: 'feat', l: 'Room features', t: 'multi', o: ROOM_FEATURES, show: it => it.hasFeat === true },
      { k: 'note', l: 'Notes', t: 'note', show: it => !!it.type },
    ],
    photo: { label: it => it.label || it.type || 'Room', cat: 'UnitInteriorExhibit', recommendedIf: it => MAIN_ROOMS.includes(it.type), showIf: it => !!it.type },
  },

  bedrooms: {
    title: 'Bedrooms', addLabel: 'Add bedroom', counted: true,
    name: (it, i) => it.label || ('Bedroom ' + (i + 1)),
    fields: [
      { k: 'label', l: 'Name', t: 'text', help: 'Bedroom 1 is the primary bedroom' },
      { k: 'level', l: 'Level', t: 'one', req: true, o: LEVELS_ALL, uad: 'LevelType' },
      { k: 'smoke', l: 'Smoke detector in room', t: 'yn', req: true },
      { k: 'ensuite', l: 'En suite bath', t: 'yn' },
      { k: 'closet', l: 'Closet', t: 'multi', o: opts('Walk-in','Reach-in','His & Hers','Dressing Room','Built-in Wardrobe','No Closet') },
      { k: 'flooring', l: 'Flooring', t: 'multi', o: FLOORING },
      { k: 'ceilS', l: 'Ceiling type', t: 'multi', o: CEIL_S },
      { k: 'hasFeat', l: 'Any room features?', t: 'yn' },
      { k: 'feat', l: 'Features', t: 'multi', show: it => it.hasFeat === true, o: opts('Sitting Area','Fireplace','Balcony','Patio Access','View','Ceiling Fan','Built-ins','Egress Window','Loft','Tandem (access through another bedroom)') },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: (it, i) => it.label || ('Bedroom ' + (i + 1)), cat: 'UnitInteriorExhibit', recommended: true, roomType: 'Bedroom' },
  },

  baths: {
    title: 'Bathrooms', addLabel: 'Add full bath', counted: true,
    name: (it, i, list) => it.label || bathAutoName(it, i, list),
    fields: [
      { k: 'kind', l: 'Bath type', t: 'one', req: true, o: opts(['FullBathroom','Full Bath'],['HalfBathroom','Half Bath']), uad: 'RoomType' },
      { k: 'label', l: 'Name', t: 'text', help: 'Bath 1 is the primary bath' },
      { k: 'level', l: 'Level', t: 'one', req: true, o: LEVELS_ALL, uad: 'LevelType' },
      { k: 'flooring', l: 'Flooring', t: 'multi', o: FLOORING },
      { k: 'vanity', l: 'Vanity', t: 'multi', o: opts('Built-in','Pedestal','Floating','Furniture Style','Console','Dual Sinks','Makeup Vanity','Wall-hung','Built-in Plaster / Concrete','Live Edge / Natural Wood','Trough Sink','Integrated Sink','Vessel Sinks') },
      { k: 'vanQty', l: 'Vanity quantity', t: 'count' },
      { k: 'vanMat', l: 'Vanity material', t: 'multi', o: CABINETS },
      { k: 'counter', l: 'Counter material', t: 'multi', o: COUNTERS },
      { k: 'tubFree', l: 'Freestanding tub', t: 'yn', show: it => it.kind === 'FullBathroom' },
      { k: 'tubFreeMat', l: 'Freestanding tub material', t: 'multi', o: BATH_MAT, show: it => it.tubFree === true },
      { k: 'tubShower', l: 'Tub / shower combination', t: 'yn', show: it => it.kind === 'FullBathroom' },
      { k: 'tubShowerMat', l: 'Tub / shower surround material', t: 'multi', o: BATH_MAT, show: it => it.tubShower === true },
      { k: 'shower', l: 'Separate shower', t: 'yn', show: it => it.kind === 'FullBathroom' },
      { k: 'showerMat', l: 'Shower material', t: 'multi', o: BATH_MAT, show: it => it.shower === true },
      { k: 'finish', l: 'Fixture finish', t: 'multi', o: FIXTURE_FIN },
      { k: 'feat', l: 'Features', t: 'multi', o: opts('Frameless Glass','Steam Shower','Rain Shower Head','Multiple Shower Heads','Body Sprays','Jetted Tub','Heated Floors','Towel Warmer','Bidet','Smart Toilet','Water Closet','Wainscoting','Window','Walk-in Closet Access','Curbless / Walk-in Shower','Wet Room (open shower and tub)','Built-in Shower Bench','Shower Niche','Handheld Shower','Thermostatic Valve','Freestanding Soaking Tub','Floor-mounted Tub Filler','Wall-mount Faucets','Bidet Seat','Waterproof Plaster Walls','Wheelchair Accessible','Grab Bars','Linen Closet','Exhaust Fan') },
      { k: 'upd', l: 'Update status', t: 'one', req: true, o: UPDATE, uad: 'RoomUpdateStatusType' },
      { k: 'time', l: 'Update time frame', t: 'one', o: TIMEFRAME, show: it => it.upd && it.upd !== 'NotUpdated', req: it => it.upd && it.upd !== 'NotUpdated', uad: 'RoomUpdatedTimeframeType' },
      { k: 'condStat', l: 'Condition status', t: 'one', req: true, o: COND_STATUS, uad: 'RoomConditionStatusType' },
      { k: 'condNote', l: 'Condition comment', t: 'note', lim: 120, uad: 'RoomConditionAdditionalDescription', fid: '10.042', show: it => it.condStat && it.condStat.startsWith('Damaged'), req: it => it.condStat && it.condStat.startsWith('Damaged') },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: (it, i, list) => it.label || bathAutoName(it, i, list), cat: 'UnitInteriorExhibit', required: true, roomTypeFn: it => it.kind },
  },

  kitchens: {
    title: 'Kitchens', addLabel: 'Add another kitchen', keepFirst: true,
    name: (it, i) => it.label || (i === 0 ? 'Kitchen' : (it.style || 'Kitchen ' + (i + 1))),
    fields: [
      { k: 'label', l: 'Name', t: 'text', help: 'e.g. Kitchen, Chef Kitchen' },
      { k: 'style', l: 'Kitchen type', t: 'one', o: opts('Second Kitchen','Chef Kitchen','Catering / Prep Kitchen','Kitchenette','Outdoor-connected Kitchen'), show: (it, ins) => ins && ins.lists.kitchens[0] !== it, req: (it, ins) => ins && ins.lists.kitchens[0] !== it },
      { k: 'level', l: 'Level', t: 'one', req: true, o: LEVELS_ALL, uad: 'LevelType' },
      { k: 'flooring', l: 'Flooring', t: 'multi', o: FLOORING },
      { k: 'cab', l: 'Cabinet material', t: 'multi', o: CABINETS },
      { k: 'counter', l: 'Counter material', t: 'multi', o: COUNTERS },
      { k: 'appl', l: 'Appliances (tap one, pick the brand)', t: 'appliances' },
      { k: 'islands', l: 'Islands', t: 'count' },
      { k: 'islandSeat', l: 'Island bar seating', t: 'yn', show: it => (it.islands || 0) > 0 },
      { k: 'finish', l: 'Fixture finish', t: 'multi', o: FIXTURE_FIN },
      { k: 'amen', l: 'Amenities', t: 'multi', o: opts('Waterfall Counter Edge','Peninsula','Breakfast Bar','Eat-in Area','Dual Waterfall Island','Mitered Counter Edge','Floating Shelves','No Upper Cabinets','Full-height Cabinet Wall','Panel-ready / Integrated Appliances','Plaster Range Hood','Pantry','Walk-in Pantry','Butler\'s Pantry','Cabinet Organizers / Pull-outs','Under-cabinet Lighting','Pendant Lighting','Prep Sink','Farmhouse Sink','Double Sink','Desk Area','Glass-front Cabinets','Open Shelving','Tile Backsplash','Slab Backsplash') },
      { k: 'upd', l: 'Update status', t: 'one', req: true, o: UPDATE, uad: 'RoomUpdateStatusType' },
      { k: 'time', l: 'Update time frame', t: 'one', o: TIMEFRAME, show: it => it.upd && it.upd !== 'NotUpdated', req: it => it.upd && it.upd !== 'NotUpdated', uad: 'RoomUpdatedTimeframeType' },
      { k: 'condStat', l: 'Condition status', t: 'one', req: true, o: COND_STATUS, uad: 'RoomConditionStatusType' },
      { k: 'condNote', l: 'Condition comment', t: 'note', lim: 120, uad: 'RoomConditionAdditionalDescription', show: it => it.condStat && it.condStat.startsWith('Damaged'), req: it => it.condStat && it.condStat.startsWith('Damaged') },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: (it, i) => it.label || (i === 0 ? 'Kitchen' : (it.style || 'Kitchen ' + (i + 1))), cat: 'UnitInteriorExhibit', required: true, roomType: 'Kitchen' },
  },

  wetbars: {
    title: 'Wet Bars', addLabel: 'Add wet bar',
    name: (it, i) => it.label || ('Wet Bar ' + (i + 1)),
    fields: [
      { k: 'label', l: 'Name / location', t: 'text', help: 'e.g. Family Room Wet Bar' },
      { k: 'level', l: 'Level', t: 'one', o: LEVELS_ALL },
      { k: 'feat', l: 'Features', t: 'multi', o: opts('Sink','Beverage Refrigerator','Wine Refrigerator','Ice Maker','Dishwasher Drawer','Wine Storage','Glass-front Cabinets','Seating') },
      { k: 'cab', l: 'Cabinets', t: 'multi', o: CABINETS },
      { k: 'counter', l: 'Counter', t: 'multi', o: COUNTERS },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: (it, i) => it.label || ('Wet Bar ' + (i + 1)), cat: 'UnitInteriorExhibit', required: true },
  },

  noncont: {
    title: 'Noncontinuous Finished Area', addLabel: 'Add noncontinuous area',
    name: (it, i) => it.label || ('Noncontinuous Area ' + (i + 1)),
    fields: [
      { k: 'label', l: 'Description / location', t: 'text', req: true, help: 'e.g. Room over garage, reached only by exterior stairs' },
      { k: 'measure', t: 'info', l: 'Measure it: SFREP requires the noncontinuous finished area. Enter it in SFREP from your sketch.' },
      { k: 'grade', l: 'Grade level', t: 'one', o: UN('GradeLevelType'), req: true },
      { k: 'access', l: 'Access', t: 'one', o: opts('Exterior Only','Through Garage','Through Unfinished Area','Other'), req: true },
      { k: 'feat', l: 'Features', t: 'multi', o: opts('Heated','Cooled','Finished Walls','Flooring','Bath','Closet') },
      { k: 'note', l: 'Notes', t: 'note' },
    ],
    photo: { label: it => it.label || 'Noncontinuous Area', cat: 'NoncontinuousArea', recommended: true },
  },

  defects: {
    title: 'Defects & Deficiencies', addLabel: 'Add defect',
    name: it => (it.component || 'Defect') + (it.obs && it.obs.length ? ' – ' + it.obs[0] : ''),
    fields: [
      { k: 'area', l: 'Report area', t: 'one', req: true, o: opts('Site','Dwelling Exterior','Unit Interior','Subject Property Amenities','Vehicle Storage','Outbuilding','ADU') },
      { k: 'component', l: 'Location / component', t: 'one', req: true, o: opts('Site','Water Feature','Landscaping','Roof','Foundation','Exterior Walls and Trim','Windows','Eaves','Mechanical System','Interior Walls','Interior Ceilings','Flooring','Kitchen','Full Bathroom','Half Bathroom','Garage','Outbuilding','ADU','Other'), uad: 'DefectComponentLabelType' },
      { k: 'obs', l: 'Observed condition', t: 'multi', req: true, o: opts('Water Damage','Pest Damage / Wood Rot','Apparent Mold / Mildew','Evidence of Unstable Soil','Cracking','Lifting','Uneven Flooring / Surfaces','Sagging Floor / Deck','Drainage Issues','Erosion','Water Intrusion','Fire Damage','Missing Component','Inoperable','Peeling Paint','Broken Seal / Glass','Other') },
      { k: 'where', l: 'Specific location', t: 'text', req: true, lim: 31, uad: 'DefectItemLocationTypeOtherDescription', help: 'Max 31 characters, e.g. "Primary bedroom ceiling"' },
      { k: 'desc', l: 'Description', t: 'note', req: true, lim: 520, uad: 'DefectItemDescription' },
      { k: 'struct', l: 'Affects soundness or structural integrity', t: 'yn', req: true, uad: 'DefectItemAffectsSoundnessStructuralIntegrityIndicator' },
      { k: 'action', l: 'Recommended action', t: 'one', req: true, o: UN('DefectItemRecommendedActionType'), uad: 'DefectItemRecommendedActionType' },
      { k: 'source', l: 'Information source', t: 'one', req: true, o: opts('Appraiser Observed','Owner Reported','Agent Reported','Inspection Report','Other') },
      { k: 'cost', l: 'Estimated cost to cure ($)', t: 'money', uad: 'DefectItemEstimatedCostToRepairAmount' },
      { k: 'costSrc', l: 'Estimate source', t: 'text', show: it => it.cost },
      { k: 'costDate', l: 'Estimate date', t: 'date', show: it => it.cost },
      { k: 'costNote', l: 'Cost-to-cure comments', t: 'note', show: it => it.cost },
    ],
    photo: { label: it => 'Defect – ' + (it.component || '') + (it.where ? ' – ' + it.where : ''), cat: 'Defect', required: true },
  },
};

function labelOf(options, v) { const o = (typeof options === 'function' ? options({}) : options).find(x => x[0] === v); return o ? o[1] : v; }
function bathAutoName(it, i, list) {
  list = list || [];
  const n = list.filter(b => b.kind === it.kind).indexOf(it) + 1 || 1;
  return (it.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') + n;
}

/* ---------------- Interview helpers ---------------- */
// Year pickers count back from the current year, so the list stays current every year
function yearOpts(from, remodel) {
  const now = new Date().getFullYear(); const out = [];
  for (let y = now; y >= from; y--) out.push([String(y), String(y)]);
  out.push(['Before ' + from, 'Before ' + from]);
  if (remodel) out.push(['Original', 'Original / never remodeled']);
  out.push(['Unknown', 'Unknown']); return out;
}
const saleOn = d => d.saleStatus === 'Listed for Sale' || d.saleStatus === 'In Escrow';
// Rooms counted in the room total: main living rooms only (no entries, foyers, pantries, nooks, halls, utility spaces)
const COUNT_ROOMS = ['Living Room','Great Room','Family Room','Dining Room','Den','Office','Study','Library','Recreation Room','Game Room','Media Room','Theater','Music Room / Studio','Art Studio','Gym','Sunroom','Loft','Bonus Room'];
function reviewItems(ins, rows) {
  return rows.map(([label, sec, k]) => {
    const { f, g } = findFieldIn(sec, k); const d = ins.data[sec] || {};
    if (!f || !isShown(f, d, ins)) return null;
    const value = valText(f, d[k], d); if (!value && !isReq(f, d, ins)) return null; // skip optional items left blank
    return { label, value, go: `${sec}|f-${sec}-${k}||${g ? g.id : ''}` };
  }).filter(Boolean);
}
function findFieldIn(secId, k) { const sec = SECTIONS.find(s => s.id === secId); if (sec) for (const g of sec.groups) for (const f of g.fields) if (f.k === k) return { f, g }; return {}; }
function pubrecItems(ins) {
  const c = ins.data.property.crs || {}; const L = ins.lists; const n = v => v ? Number(v).toLocaleString() : '—';
  const fb = L.baths.filter(b => b.kind === 'FullBathroom').length, hb = L.baths.filter(b => b.kind === 'HalfBathroom').length;
  return [
    { label: 'Living area (sq. ft.)', value: `Assessor ${n(c.sqftAssessor || c.sqft)} · MLS ${n(c.sqftMls)}` },
    { label: 'Year built', value: `Assessor ${c.yearBuilt || '—'} · MLS ${c.yearBuiltMls || '—'}` },
    { label: 'Bedrooms', value: `Assessor ${c.beds || '—'} · MLS ${c.bedsMls || '—'} · Your count ${L.bedrooms.length}` },
    { label: 'Baths', value: `Assessor ${c.baths || '—'} · MLS ${c.bathsMls || '—'} · Your count ${fb} full${hb ? ', ' + hb + ' half' : ''}` },
  ].concat(c.rooms || c.roomsMls ? [{ label: 'Total rooms', value: `Assessor ${c.rooms || '—'} · MLS ${c.roomsMls || '—'}` }] : []);
}
function sketchItems(ins) {
  const S = ins && ins.sketch; if (!S || !S.totals) return [{ label: 'Sketch', value: '' }];
  const T = S.totals, f = n => (n || 0).toLocaleString() + ' sf', out = [];
  out.push({ label: 'Finished above grade', value: f(T.agFin) });
  if (T.agNon) out.push({ label: 'Finished above grade – nonstandard', value: f(T.agNon) });
  if (T.agUnf) out.push({ label: 'Unfinished above grade', value: f(T.agUnf) });
  if (T.bgFin || T.bgNon || T.bgUnf) out.push({ label: 'Below grade (finished / nonstd. / unfinished)', value: [T.bgFin, T.bgNon, T.bgUnf].map(n => (n || 0).toLocaleString()).join(' / ') + ' sf' });
  [...(T.gar || []), ...(T.out || []), ...(T.ob || []), ...(T.adu || []), ...(T.amen || [])].forEach(x => out.push({ label: x.name, value: f(x.sf) }));
  out.push({ label: 'Sketch updated', value: new Date(S.updated).toLocaleString() });
  out.push({ label: 'Sketch image', value: !S.imageAt ? 'Not made yet – open the sketch and tap Back to inspection' : S.imageAt + 5000 < S.updated ? 'Older than the drawing – open the sketch and tap Back to refresh it' : 'Up to date' });
  return out;
}
function countItems(ins) {
  const L = ins.lists; const main = L.rooms.filter(r => COUNT_ROOMS.includes(r.type));
  const beds = L.bedrooms.length, fb = L.baths.filter(b => b.kind === 'FullBathroom').length, hb = L.baths.filter(b => b.kind === 'HalfBathroom').length;
  const kit = Math.min(1, L.kitchens.length); const total = main.length + kit + beds;
  const out = [
    { label: 'Dwelling – total rooms', value: `${total}  (${main.length} main room${main.length === 1 ? '' : 's'}${main.length ? ': ' + main.map(r => r.label || r.type).join(', ') : ''}; ${kit} kitchen; ${beds} bedroom${beds === 1 ? '' : 's'})`, go: 'interior|grp-rooms||rooms' },
    { label: 'Dwelling – bedrooms', value: String(beds), go: 'interior|grp-beds||beds' },
    { label: 'Dwelling – baths', value: `${fb} full${hb ? ', ' + hb + ' half' : ''}`, go: 'interior|grp-baths||baths' },
  ];
  L.adus.forEach((a, i) => out.push({ label: LISTS.adus.name(a, i), value: `${a.beds || 0} bedroom${a.beds === 1 ? '' : 's'}, ${a.fullBaths || 0} full bath${a.fullBaths === 1 ? '' : 's'}${a.halfBaths ? ', ' + a.halfBaths + ' half' : ''}${a.kitchen ? ', ' + a.kitchen.toLowerCase() : ''}`, go: 'buildings|item-' + a.id + '|' + a.id + '|adu' }));
  L.outbuildings.filter(o => o.living).forEach((o, i) => out.push({ label: LISTS.outbuildings.name(o, i), value: `${o.beds || 0} bedroom${o.beds === 1 ? '' : 's'}, ${o.fullBaths || 0} full bath${o.fullBaths === 1 ? '' : 's'}${o.halfBaths ? ', ' + o.halfBaths + ' half' : ''}`, go: 'buildings|item-' + o.id + '|' + o.id + '|outb' }));
  return out;
}

/* ---------------- Sections (tabs) in walk-through order ---------------- */
const VIEW_OPTS = (() => { const all = U('ViewType').filter(([c]) => !['Bay','Canal','Cove','Gulf','River','Sound'].includes(c)); return [...order(all, ['Residential','Ocean','Skyline','Mountain']).slice(0, 4), ['Garden Setting','Garden Setting'], ...order(all, ['Residential','Ocean','Skyline','Mountain']).slice(4)]; })();

const SECTIONS = [
  { id: 'property', title: 'Property', groups: [
    { id: 'crs', title: 'Public record (CRS Data)', fields: [
      { k: 'orderBox', l: 'From the order', t: 'order', show: (d, ins) => !!(ins && ins.data.property.order) },
      { k: 'crsLoad', l: 'Load a CRS Property Report (PDF) before you leave the office', t: 'crs' },
      { k: 'permitLoad', l: 'County permit history (optional)', t: 'permits' },
    ]},
    { id: 'pubrec', title: 'Public record vs. MLS', showGroup: (d, ins) => !!(ins && ins.data.property.crs), fields: [
      { k: 'pubRev', l: 'From the CRS report (verify; usually not accurate)', t: 'review', items: pubrecItems },
      { k: 'measuredGla', l: 'Your measured living area (sq. ft.) for the comment – optional', t: 'num', help: 'Leave blank to fill it in SFREP. The comment will say "the appraiser\'s measured gross living area".' },
      { k: 'pubCmt', l: 'Add the public record / MLS explanation to the Unit Interior commentary', t: 'yn' },
    ]},
    { id: 'assign', title: 'Address & assignment', fields: [
      { k: 'fileName', l: 'File name', t: 'text', req: true },
      { k: 'estate', l: 'Property rights appraised', t: 'one', req: true, o: opts(['FeeSimple','Fee Simple'],['Leasehold','Leasehold'],['Other','Other (e.g. leased fee)']), uad: 'PropertyEstateType', fid: '3.019' },
      { k: 'estateOther', l: 'Describe property rights', t: 'text', show: d => d.estate === 'Other', req: d => d.estate === 'Other' },
      { k: 'addr', l: 'Street address', t: 'text', req: true, uad: 'AddressLineText', fid: '3.000', lim: 100 },
      { k: 'unit', l: 'Unit #', t: 'text', lim: 12 },
      { k: 'city', l: 'City', t: 'one', req: true, o: CITIES, uad: 'CityName' },
      { k: 'cityOther', l: 'City name', t: 'text', show: d => d.city === 'Other', req: d => d.city === 'Other' },
      { k: 'zip', l: 'ZIP code', t: 'one', req: true, o: opts(...ZIPS), uad: 'PostalCode' },
      { k: 'zipOther', l: 'ZIP code', t: 'text', show: d => d.zip === 'Other', req: d => d.zip === 'Other', lim: 5 },
      { k: 'zip4', l: 'ZIP+4 extension', t: 'text', lim: 4, help: 'Filled automatically from the CRS report' },
      { k: 'county', l: 'County', t: 'one', req: true, o: opts('Santa Barbara','Ventura','Other'), uad: 'CountyName' },
      { k: 'countyOther', l: 'County name', t: 'text', show: d => d.county === 'Other', req: d => d.county === 'Other' },
      { k: 'inspDate', l: 'Inspection date', t: 'date', req: true, uad: 'InspectionDate' },
      { k: 'extMethod', l: 'Exterior inspection', t: 'one', req: true, o: opts('Physical','Virtual',['NoInspection','No Inspection']), uad: 'PropertyExteriorInspectionMethodType', fid: '2.058' },
      { k: 'intMethod', l: 'Interior inspection', t: 'one', req: true, o: opts('Physical','Virtual',['NoInspection','No Inspection']), uad: 'PropertyInteriorInspectionMethodType', fid: '2.059' },
      { k: 'present', l: 'Present at inspection', t: 'multi', o: opts('Owner','Borrower','Listing Agent','Buyer\'s Agent','Tenant','Occupant','Contractor','Nobody / Lockbox') },
      { k: 'occ', l: 'Occupancy', t: 'one', req: true, o: UN('UnitOccupancyType'), uad: 'UnitOccupancyType' },
    ]},
    { id: 'ptype', title: 'Property type', fields: [
      { k: 'attach', l: 'Attachment type', t: 'one', req: true, o: UN('AttachmentType'), uad: 'AttachmentType', fid: '3.004' },
      { k: 'structDesign', l: 'Structure design (attached)', t: 'one', show: d => d.attach === 'Attached', req: d => d.attach === 'Attached', o: opts(['RowhouseTownhouse','Rowhouse / Townhouse'],['SemiDetached','Semi-Detached'],['Lowrise','Low-rise (1–4 floors)'],['Midrise','Mid-rise (5–8 floors)'],['Highrise','High-rise (9+ floors)'],['Other','Other']), uad: 'StructuralDesignType', fid: '1.014' },
      { k: 'structOther', l: 'Describe structure design', t: 'text', lim: 33, show: d => d.attach === 'Attached' && d.structDesign === 'Other', req: d => d.attach === 'Attached' && d.structDesign === 'Other' },
      { k: 'thEnd', l: 'Townhouse: end unit', t: 'yn', show: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse', req: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse', uad: 'RowhouseTownhouseEndUnitIndicator', fid: '8.006' },
      { k: 'thBack', l: 'Townhouse: back to back (shares a rear wall)', t: 'yn', show: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse', req: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse', uad: 'RowhouseTownhouseBackToBackIndicator', fid: '8.007' },
      { k: 'thStacked', l: 'Townhouse: units above or below', t: 'yn', show: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse', req: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse', uad: 'RowhouseTownhouseStackedIndicator', fid: '8.008' },
      { k: 'thLoc', l: 'Townhouse location', t: 'one', o: opts(['TopUnit','Top Unit'],['MiddleUnit','Middle Unit'],['BottomUnit','Bottom Unit']), show: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse' && d.thStacked === true, req: d => d.attach === 'Attached' && d.structDesign === 'RowhouseTownhouse' && d.thStacked === true, uad: 'RowhouseTownhouseLocationType', fid: '8.009' },
      { k: 'units', l: 'Units excluding ADUs', t: 'count', req: true, uad: 'LivingUnitExcludingADUCount', fid: '3.005' },
      { k: 'pud', l: 'Planned Unit Development (PUD)', t: 'yn', req: true, uad: 'PUDIndicator' },
      { k: 'project', l: 'Condominium / Cooperative', t: 'yn', req: true, uad: 'PropertyInProjectIndicator' },
      { k: 'legal', l: 'Project legal structure', t: 'one', o: opts('Condominium','Cooperative','Condop'), show: d => d.project === true, req: d => d.project === true, uad: 'ProjectLegalStructureType', fid: '1.016' },
      { k: 'condotel', l: 'Condotel (front desk / hotel rental program)', t: 'yn', show: d => d.project === true, help: 'There is no separate UAD type: it goes to SFREP as a condominium. Most lenders treat condotels as ineligible, so it is flagged in Needs Attention and your notes.' },
      { k: 'projInfo', t: 'info', l: 'A "Project / HOA" tab is now showing for the project and HOA questions.', show: d => d.project === true || d.pud === true },
      { k: 'siteCommon', l: 'Subject site owned in common', t: 'yn', req: true, uad: 'LandOwnedInCommonIndicator' },
      { k: 'hoExt', l: 'Homeowner responsible for all exterior maintenance', t: 'yn', req: true, uad: 'HomeownerResponsibleForExteriorMaintenanceIndicator' },
      { k: 'newCon', l: 'New construction', t: 'yn', req: true, uad: 'NewConstructionIndicator' },
      { k: 'native', l: 'Property on Native American lands', t: 'yn', req: true, uad: 'NativeAmericanLandsIndicator' },
      { k: 'mixed', l: 'Any non-residential use (home business, farm, etc.)?', t: 'yn', show: d => d.siteCommon !== true, req: d => d.siteCommon !== true, uad: 'PropertyMixedUsageIndicator' },
      { k: 'mixedDesc', l: 'Describe non-residential use / modification', t: 'note', lim: 1250, show: d => d.siteCommon !== true && d.mixed === true, req: d => d.siteCommon !== true && d.mixed === true, uad: 'NonResidentialUseDescription', fid: '4.019' },
      { k: 'specialTax', l: 'Special tax assessments (Mello-Roos, CFD, assessment district bonds)', t: 'yn', req: true, uad: 'SpecialTaxAssessmentsIndicator', help: 'Check the tax bill / CRS report for direct assessments.' },
      { k: 'specialTaxDesc', l: 'Special tax notes (district, annual amount, payoff year)', t: 'note', show: d => d.specialTax === true },
    ]},
  ]},

  { id: 'project', title: 'Project / HOA', showTab: ins => IS_HOA(ins) || (ins && ins.data.interview.hoa === true), groups: [
    { id: 'projSee', title: 'Project – what you see on site', showGroup: (d, ins) => IS_HOA(ins), fields: [
      { k: 'projName', l: 'Project name', t: 'text', lim: 100, req: (d, ins) => IS_PROJ(ins), uad: 'ProjectName', fid: '18.004' },
      { k: 'photoProj', l: 'Project / building exterior', t: 'photo', cat: 'ProjectExhibit', recommended: true },
      { k: 'photoProj2', l: 'Project entry / lobby', t: 'photo', cat: 'ProjectExhibit' },
      { k: 'projAmen', l: 'Common amenities / services included', t: 'multi', req: true, o: PROJ_AMEN, uad: 'AmenityType', fid: '18.012', help: 'Amenities of the project or PUD, not the unit.' },
      { k: 'projAmenOther', l: 'Other amenity', t: 'text', lim: 33, show: d => (d.projAmen || []).includes('Other'), req: d => (d.projAmen || []).includes('Other') },
      { k: 'storageOwn', l: 'Unit storage is', t: 'one', o: opts('Assigned','Owned','Unassigned','Other'), show: d => (d.projAmen || []).includes('UnitStorage'), req: d => (d.projAmen || []).includes('UnitStorage'), uad: 'AmenityOwnershipType' },
      { k: 'storageOther', l: 'Describe storage ownership', t: 'text', lim: 33, show: d => d.storageOwn === 'Other' && (d.projAmen || []).includes('UnitStorage'), req: d => d.storageOwn === 'Other' && (d.projAmen || []).includes('UnitStorage') },
      { k: 'slipOwn', l: 'Boat slip is', t: 'one', o: opts('Assigned','Owned','Unassigned','Other'), show: d => (d.projAmen || []).includes('BoatSlip'), req: d => (d.projAmen || []).includes('BoatSlip'), uad: 'AmenityOwnershipType' },
      { k: 'slipOther', l: 'Describe boat slip ownership', t: 'text', lim: 33, show: d => d.slipOwn === 'Other' && (d.projAmen || []).includes('BoatSlip'), req: d => d.slipOwn === 'Other' && (d.projAmen || []).includes('BoatSlip') },
      { k: 'photoAmen', l: 'Project amenity', t: 'photo', cat: 'ProjectAmenity', show: d => (d.projAmen || []).some(x => x !== 'None'), recommended: true },
      { k: 'photoAmen2', l: 'Project amenity 2', t: 'photo', cat: 'ProjectAmenity', show: d => (d.projAmen || []).some(x => x !== 'None') },
      { k: 'photoAmen3', l: 'Project amenity 3', t: 'photo', cat: 'ProjectAmenity', show: d => (d.projAmen || []).some(x => x !== 'None') },
      { k: 'photoAmen4', l: 'Project amenity 4', t: 'photo', cat: 'ProjectAmenity', show: d => (d.projAmen || []).some(x => x !== 'None') },
      { k: 'projDef', l: 'Deficiencies observed in the project (common areas, buildings)', t: 'yn', req: (d, ins) => IS_PROJ(ins), uad: 'ProjectDeficiencyObservedIndicator', fid: '1.019' },
      { k: 'projDefDesc', l: 'Describe the deficiencies', t: 'note', lim: 2500, show: d => d.projDef === true, req: d => d.projDef === true, uad: 'ProjectConditionAndQualityDescription', fid: '18.015' },
      { k: 'photoProjDef', l: 'Project deficiency', t: 'photo', cat: 'ProjectDeficiency', show: d => d.projDef === true, recommended: true },
      { k: 'photoProjDef2', l: 'Project deficiency 2', t: 'photo', cat: 'ProjectDeficiency', show: d => d.projDef === true },
      { k: 'projCond', l: 'Common area condition', t: 'one', o: opts(['Well Kept','Adequately Maintained'],'Typical Wear and Tear','Deferred Maintenance','Under Renovation'), help: 'Your notes for the project comment; not a UAD rating.' },
      { k: 'projComplete', l: 'Units, common areas and amenities complete', t: 'yn', req: (d, ins) => IS_PROJ(ins), uad: 'ProjectCompletedIndicator', fid: '18.016' },
      { k: 'projIncomplete', l: 'Incomplete project elements', t: 'multi', o: opts(['Amenities','Amenities'],['CommonAreas','Common Areas'],['Units','Units (incl. buildings & phases)'],['Other','Other']), show: d => d.projComplete === false, req: d => d.projComplete === false, uad: 'ProjectComponentCategoryType', fid: '18.065' },
      { k: 'projIncOther', l: 'Describe other incomplete element', t: 'text', lim: 33, show: d => d.projComplete === false && (d.projIncomplete || []).includes('Other'), req: d => d.projComplete === false && (d.projIncomplete || []).includes('Other') },
      { k: 'subjBldgComplete', l: 'Subject unit\'s building complete', t: 'yn', show: d => d.projComplete === false, req: d => d.projComplete === false, uad: 'SubjectBuildingCompletedIndicator', fid: '18.017' },
      { k: 'commercial', l: 'Commercial space in the project', t: 'yn', req: (d, ins) => IS_PROJ(ins), uad: 'ProjectCommercialSpaceIndicator', fid: '18.069' },
      { k: 'commercialPct', l: 'Commercial space – estimated %', t: 'num', show: d => d.commercial === true, req: d => d.commercial === true, uad: 'ProjectCommercialSpacePercent' },
      { k: 'commercialDesc', l: 'Commercial space – what is it?', t: 'text', show: d => d.commercial === true },
      { k: 'stories', t: 'info', l: 'Floors in building, structure design, floor number and corner unit are on the Property, Front and Interior tabs.', show: (d, ins) => IS_PROJ(ins) },
      { k: 'projNote', l: 'Project notes (workfile)', t: 'note' },
    ]},
    { id: 'projHOA', title: 'HOA – ask the owner', fields: [
      { k: 'hoaInfo', t: 'info', l: 'Only what the owner can tell you today. Unit counts, budget, questionnaire, legal and co-op items come from the HOA documents and are entered in SFREP when you receive them.' },
      { k: 'hoaHasContact', l: 'Does the owner have an HOA contact?', t: 'yn', req: true, help: 'No = follow up from the MLS, title or escrow; the contact is then not counted as missing.' },
      { k: 'hoaName', l: 'HOA / management company', t: 'text', show: d => d.hoaHasContact !== false, req: d => d.hoaHasContact === true },
      { k: 'hoaContactName', l: 'HOA contact name', t: 'text', show: d => d.hoaHasContact !== false, req: d => d.hoaHasContact === true },
      { k: 'hoaPhone', l: 'HOA contact phone', t: 'phone', show: d => d.hoaHasContact !== false, req: d => d.hoaHasContact === true && !d.hoaEmail, help: 'Phone or email is enough.' },
      { k: 'hoaEmail', l: 'HOA contact email', t: 'text', show: d => d.hoaHasContact !== false },
      { k: 'dues', l: 'HOA dues ($), per owner', t: 'money', uad: 'AssociationChargeAmount', fid: '18.011', help: 'Leave blank if the owner does not know.' },
      { k: 'duesFreq', l: 'Dues are paid', t: 'one', o: opts('Monthly','Quarterly','Semi-annually','Annually'), show: d => d.dues !== undefined, help: 'Sent to SFREP as a monthly amount.' },
      { k: 'duesUtil', l: 'Utilities included in the dues, per owner', t: 'multi', o: opts(['None','None'],['Electricity','Electricity'],['Gas','Gas'],['SanitarySewer','Sanitary Sewer'],['Water','Water'],['Other','Other']), uad: 'AssociationChargeIncludesUtilityType', fid: '18.013' },
      { k: 'duesUtilOtherPick', l: 'Other utilities included', t: 'multi', o: opts('Trash','Cable / Internet','Common Area Utilities','Hot Water','Propane','Recycled Water'), show: d => (d.duesUtil || []).includes('Other'), help: 'Sent to SFREP as “Other” with these names (33 characters).' },
      { k: 'duesUtilOther', l: 'Other utility (type it)', t: 'text', lim: 33, show: d => (d.duesUtil || []).includes('Other') },
      { k: 'duesIncl', l: 'Dues also cover, per owner', t: 'multi', o: opts('Master Insurance Policy','Earthquake Insurance','Roof','Exterior Maintenance','Exterior Paint','Landscaping','Reserves','Management','Pest Control'), help: 'Pool / spa, elevator, security gate and concierge are under Common amenities on the Project tab.' },
      { k: 'clubReq', l: 'Mandatory club membership (golf, beach or social club)', t: 'yn', help: 'Membership required to own here. Adds “Club Membership” to the common amenities.' },
      { k: 'clubName', l: 'Club name', t: 'text', show: d => d.clubReq === true },
      { k: 'clubInit', l: 'Club initiation / membership fee ($, one time)', t: 'money', show: d => d.clubReq === true, help: 'e.g. 175000' },
      { k: 'clubDues', l: 'Club dues ($ per month)', t: 'money', show: d => d.clubReq === true },
      { k: 'groundRent', l: 'On leased land (land lease / ground rent)', t: 'yn', uad: 'ProjectAnalysisGroundRentIndicator', fid: '18.019' },
      { k: 'grMonthly', l: 'Land lease fee ($ per month)', t: 'money', show: d => d.groundRent === true, help: 'Sent to SFREP as the annual amount (× 12), separate from the HOA dues.', uad: 'ProjectAnalysisGroundRentAmount', fid: '18.020' },
      { k: 'grExp', l: 'Land lease expires', t: 'date', show: d => d.groundRent === true, help: 'If the owner knows.', uad: 'ProjectAnalysisGroundRentExpirationDate', fid: '18.021' },
      { k: 'grDesc', l: 'Land lease notes (lessor, renewal, rent increases)', t: 'text', lim: 250, show: d => d.groundRent === true, uad: 'ProjectAnalysisGroundRentDescription', fid: '18.022' },
      { k: 'specAssess', l: 'Special assessment the owner knows of', t: 'one', o: opts(['None','None known'],['Existing','Existing'],['Proposed','Proposed'],['Unknown','Owner not sure']), uad: 'AssociationSpecialAssessmentStatusType' },
      { k: 'specDesc', l: 'Special assessment – what the owner said (purpose, amount)', t: 'text', show: d => ['Existing','Proposed'].includes(d.specAssess) },
      { k: 'hoaNote', l: 'HOA notes (workfile)', t: 'note' },
    ]},
  ]},

  { id: 'street', title: 'Street', groups: [
    { id: 'streetPh', title: 'Street scene photos', fields: [
      { k: 'photoStreet', l: 'Street scene', t: 'photo', req: true, cat: 'PropertyAccess', fid: 'UAD required' },
      { k: 'photoStreet2', l: 'Street view 2', t: 'photo', cat: 'SiteExhibit' },
      { k: 'photoStreet3', l: 'Street view 3', t: 'photo', cat: 'SiteExhibit' },
      { k: 'photoStreet4', l: 'Street view 4', t: 'photo', cat: 'SiteExhibit' },
    ]},
    { id: 'access', title: 'Street & access', fields: [
      { k: 'primaryAccess', l: 'Primary access', t: 'one', req: true, o: U('PropertyPrimaryEntryExitMethodType'), uad: 'PropertyPrimaryEntryExitMethodType', fid: '4.020' },
      { k: 'streetType', l: 'Street type', t: 'one', req: true, o: U('StreetAccessType'), uad: 'StreetAccessType' },
      { k: 'streetSurface', l: 'Street surface', t: 'one', req: true, o: U('ImprovedSurfaceMaterialType'), uad: 'ImprovedSurfaceMaterialType' },
      { k: 'accessTypical', l: 'Access typical for market', t: 'yn', req: true, uad: 'PropertyAccessTypicalToMarketIndicator', fid: '4.023' },
      { k: 'accessDesc', l: 'Description of property access', t: 'note', lim: 300, show: d => d.accessTypical === false, req: d => d.accessTypical === false, uad: 'PropertyAccessDescription', fid: '4.024' },
      { k: 'streetFeat', l: 'Street features', t: 'multi', o: opts('Curbs','Gutters','Sidewalks','Street Lights','Storm Drains','Speed Bumps','Gated Street','Private Road Maintenance Agreement','No Sidewalks','Heavy Traffic','Light Traffic','Street Parking','Cul-de-sac','Hillside Road','Narrow Road','Unpaved Section') },
      { k: 'note', l: 'Street notes', t: 'note' },
    ]},
  ]},

  { id: 'driveway', title: 'Driveway', groups: [
    { id: 'drive', title: 'Driveway', fields: [
      { k: 'hasDrive', l: 'Driveway present', t: 'yn', req: true },
      { k: 'driveMat', l: 'Material', t: 'one', req: d => d.hasDrive === true, show: d => d.hasDrive === true, o: opts(['Asphalt','Asphalt'],['Concrete','Concrete'],'Pavers',['Brick','Brick'],['Cobblestone','Cobblestone'],'Stamped Concrete','Decomposed Granite',['Gravel','Gravel'],['Dirt','Dirt'],'Exposed Aggregate','Other'), uad: 'ImprovedSurfaceMaterialType' },
      { k: 'driveSpaces', l: 'Cars that can park in driveway', t: 'count', req: d => d.hasDrive === true, show: d => d.hasDrive === true, uad: 'ParkingSpacesCount', fid: '13.002' },
      { k: 'driveShared', l: 'Shared driveway', t: 'yn', req: d => d.hasDrive === true, show: d => d.hasDrive === true },
      { k: 'driveFeat', l: 'Features', t: 'multi', show: d => d.hasDrive === true, o: opts('Motor Court','Circular','Gated','Automatic Gate','Long Private Drive','Steep','Turnaround','Guest Parking','RV / Boat Parking','Heated','Lighting','Apron','Tandem Parking') },
      { k: 'photoDrive', l: 'Driveway', t: 'photo', cat: 'VehicleStorageExhibit', show: d => d.hasDrive === true },
      { k: 'photoDrive2', l: 'Driveway 2', t: 'photo', cat: 'VehicleStorageExhibit', show: d => d.hasDrive === true },
      { k: 'note', l: 'Driveway notes', t: 'note' },
    ]},
  ]},

  { id: 'front', title: 'Front', groups: [
    { id: 'frontPh', title: 'Front of dwelling photos', fields: [
      { k: 'photoFront', l: 'Dwelling front', t: 'photo', req: true, cat: 'DwellingFront', fid: 'UAD required' },
      { k: 'photoFront2', l: 'Front – angle', t: 'photo', cat: 'DwellingExteriorExhibit' },
      { k: 'photoFront3', l: 'Front – angle 2', t: 'photo', cat: 'DwellingExteriorExhibit' },
    ]},
    { id: 'design', title: 'Design & construction', fields: [
      { k: 'design', l: 'Design (style)', t: 'one', req: true, o: U('ArchitecturalDesignCategoryType'), uad: 'ArchitecturalDesignCategoryType' },
      { k: 'stories', l: 'Floors in building', t: 'count', req: true, uad: 'StoriesCount', fid: '8.003' },
      { k: 'constr', l: 'Construction method', t: 'one', req: true, o: U('ConstructionMethodType'), uad: 'ConstructionMethodType' },
      { k: 'yearBuilt', l: 'Year built', t: 'year', req: true, uad: 'PropertyStructureBuiltYear', help: 'Filled from the CRS report when loaded' },
      { k: 'yearEst', l: 'Year built is estimated', t: 'yn', uad: 'PropertyStructureBuiltYearEstimatedIndicator' },
      { k: 'frontElev', l: 'Front door elevation', t: 'one', req: true, o: order(UN('FrontDoorApproximateElevationRangeType'), ['GroundLevel','UpToOneFoot','OneToTwoFeet','TwoToThreeFeet','ThreeToFourFeet','FourToFiveFeet','FiveToSixFeet','SixToSevenFeet','SevenToEightFeet','EightToNineFeet','NineToTenFeet','TenOrMoreFeet']), uad: 'FrontDoorApproximateElevationRangeType' },
      { k: 'frontDoor', l: 'Front door', t: 'multi', o: opts('Solid Wood','Custom','Pivot','Double Doors','Glass Panel','Iron & Glass','Iron','Metal','Fiberglass','Sidelights','Transom') },
    ]},
    { id: 'roof', title: 'Roof', fields: [
      { k: 'hoaExt1', t: 'info', l: 'The HOA maintains the exterior, so UAD does not require exterior component conditions or exterior quality/condition ratings and they are not sent to SFREP. Fill in what you want for your comments and workfile.', show: (d, ins) => !HO_EXT(ins) },
      { k: 'roofObs', l: 'Roof observable', t: 'yn', req: (d, ins) => HO_EXT(ins), uad: 'RoofObservableIndicator' },
      { k: 'roofMat', l: 'Roof material', t: 'multi', req: (d, ins) => HO_EXT(ins), o: U('RoofMaterialType'), uad: 'RoofMaterialType' },
      { k: 'roofStyle', l: 'Roof style (your notes – not a UAD field)', t: 'multi', icons: 'roof', o: opts('Gable','Hip','Flat','Shed','Mansard','Gambrel','Dutch Gable','Butterfly','Multiple Ridges','Steep Pitch','Low Pitch','Dormers') },
      { k: 'roofAge', l: 'Roof estimated age', t: 'one', req: (d, ins) => HO_EXT(ins), o: order(U('RoofEstimatedAgeRangeType'), ['LessThanOneYear','OneToTenYears','TenToTwentyYears','TwentyOrMoreYears']), uad: 'RoofEstimatedAgeRangeType' },
      { k: 'roofCond', l: 'Roof condition', t: 'one', show: d => d.roofObs !== false, req: (d, ins) => d.roofObs !== false && HO_EXT(ins), o: COMP_COND, uad: 'ImprovementComponentConditionStatusType' },
      { k: 'roofMoreInfo', t: 'info', l: 'Other roofs (garage, addition, ADU, patio cover…): add them below. They go into the exterior comment; the main roof stays in the UAD roof fields.' },
      { k: 'gutterMat', l: 'Gutter material (your notes – not a UAD field)', t: 'multi', o: opts('None','Aluminum','Copper','Galvanized Steel','Zinc','Vinyl','Stainless Steel','Painted Steel','Wood') },
      { k: 'gutters', l: 'Gutters & downspouts', t: 'multi', show: d => !(d.gutterMat || []).includes('None'), o: opts('Seamless','Half-round','K-style (ogee)','Box Gutters','Downspouts','Rain Chains','Gutter Guards','Underground Drains') },
    ], list: 'roofs2' },
    { id: 'walls', title: 'Exterior walls, windows & foundation', fields: [
      { k: 'hoaExt2', t: 'info', l: 'The HOA maintains the exterior, so UAD does not require exterior component conditions or exterior quality/condition ratings and they are not sent to SFREP. Fill in what you want for your comments and workfile.', show: (d, ins) => !HO_EXT(ins) },
      { k: 'walls', l: 'Exterior walls', t: 'multi', req: (d, ins) => HO_EXT(ins), o: U('WallMaterialType').filter(x => x[0] !== 'Asbestos').map(x => x[0] === 'Stucco' ? ['Stucco', 'Stucco / cement plaster (incl. color coat)'] : x), uad: 'WallMaterialType' },
      { k: 'wallsCond', l: 'Exterior walls & trim condition', t: 'one', req: (d, ins) => HO_EXT(ins), o: COMP_COND, uad: 'ImprovementComponentConditionStatusType' },
      { k: 'windows', l: 'Windows', t: 'multi', req: (d, ins) => HO_EXT(ins), o: opts('Dual Pane','Single Pane','Triple Pane','Low-E','Vinyl','Wood','Aluminum','Clad Wood','Fiberglass','Steel','Bronze','Casement','Double Hung','Sliding','Picture','Bay / Bow','Divided Lite','Impact Glass') },
      { k: 'winCond', l: 'Windows condition', t: 'one', req: (d, ins) => HO_EXT(ins), o: COMP_COND, uad: 'ImprovementComponentConditionStatusType' },
      { k: 'foundType', l: 'Foundation type', t: 'multi', req: (d, ins) => HO_EXT(ins), o: [...U('FoundationType').filter(x => x[0] !== 'Other'), ['ConcretePerimeter', 'Concrete perimeter (raised floor)'], ...U('FoundationType').filter(x => x[0] === 'Other')], uad: 'FoundationType', help: 'Concrete perimeter goes to SFREP as crawl space with poured concrete.' },
      { k: 'foundMat', l: 'Foundation material', t: 'multi', req: (d, ins) => HO_EXT(ins), o: U('FoundationMaterialType'), uad: 'FoundationMaterialType' },
      { k: 'foundCond', l: 'Foundation condition', t: 'one', req: (d, ins) => HO_EXT(ins), o: COMP_COND, uad: 'ImprovementComponentConditionStatusType' },
      { k: 'extFeat', l: 'Exterior features', t: 'multi', help: 'Porches, patios, decks and balconies are on the Outdoor tab; solar is on the Systems tab.', o: opts('Covered Entry','Courtyard Entry','Shutters','Columns','Exterior Lighting','Exterior Speakers','Palapa / Thatch Shade','Cable / Wire Mesh Rails','Exposed Rafter Tails','Chimney') },
      { k: 'converted', l: 'Converted area (garage, porch, patio)?', t: 'yn', req: true, uad: 'ConvertedAreaExistsIndicator', fid: '8.012' },
      { k: 'convFrom', l: 'Converted from', t: 'one', o: U('ConvertedAreaOriginalUseType'), show: d => d.converted === true, req: d => d.converted === true, uad: 'ConvertedAreaOriginalUseType' },
      { k: 'convSim', l: 'Converted area vs. rest of living area', t: 'one', o: UN('ConvertedAreaFinishComparisonType'), show: d => d.converted === true, req: d => d.converted === true, uad: 'ConvertedAreaFinishComparisonType' },
      { k: 'note', l: 'Front / exterior notes', t: 'note' },
    ]},
    { id: 'extQC', title: 'Exterior quality & condition', fields: [
      { k: 'eq', l: 'Exterior quality', t: 'one', req: true, o: QR, uad: 'ExteriorQualityRatingCode' },
      { k: 'ec', l: 'Exterior condition', t: 'one', req: true, o: CR, uad: 'ExteriorConditionRatingCode' },
    ], showGroup: (d, ins) => HO_EXT(ins) },
  ]},

  { id: 'garage', title: 'Garage', groups: [
    { id: 'vs', title: 'Vehicle storage', fields: [
      { k: 'garShared', l: 'Is the garage shared with other units (a common parking garage)?', t: 'yn', show: (d, ins) => IS_HOA(ins), req: (d, ins) => IS_PROJ(ins), help: 'Yes = enter the unit\'s spaces under Parking garage spaces below. No = the unit has its own private garage.' },
      { k: 'hasGarage', l: 'Private garage (the unit\'s own)', t: 'yn', req: d => d.garShared !== true, show: d => d.garShared !== true },
      { k: 'garAttach', l: 'Garage attachment', t: 'one', o: U('CarStorageAttachmentType'), show: d => d.hasGarage === true, req: d => d.hasGarage === true, uad: 'CarStorageAttachmentType' },
      { k: 'garSpaces', l: 'Vehicle spaces', t: 'count', show: d => d.hasGarage === true, req: d => d.hasGarage === true, uad: 'ParkingSpacesCount' },
      { k: 'garTandemYN', l: 'Any tandem spaces?', t: 'yn', show: d => d.hasGarage === true, req: d => d.hasGarage === true },
      { k: 'garTandem', l: 'How many tandem spaces (included above)?', t: 'count', show: d => d.garTandemYN === true, req: d => d.garTandemYN === true },
      { k: 'measure', t: 'info', l: 'Measure it: SFREP requires the garage area. Enter it in SFREP from your sketch.', show: d => d.hasGarage === true },
      { k: 'garFinish', l: 'Finish status', t: 'one', show: d => d.hasGarage === true, req: d => d.hasGarage === true, o: opts('Finished','Partially Finished','Unfinished','Drywall Unpainted','Fully Finished with Flooring') },
      { k: 'garConverted', l: 'Garage converted?', t: 'yn', show: d => d.hasGarage === true, req: d => d.hasGarage === true },
      { k: 'garConvPermit', l: 'Conversion permitted?', t: 'one', o: opts('Permitted','Unpermitted','Unknown'), show: d => d.garConverted === true, req: d => d.garConverted === true },
      { k: 'garFeat', l: 'Garage features', t: 'multi', show: d => d.hasGarage === true, o: opts('Automatic Door Opener','Loft','Cabinetry','Epoxy Floor','Workshop Area','Sink','Storage Racks','Heated','Cooled','Insulated','Windows','Side Door','Car Lift','Workbench','Second Refrigerator','Other') },
      { k: 'carport', l: 'Carport spaces (private)', t: 'count' },
      { k: 'carportAttach', l: 'Carport attachment', t: 'one', o: U('CarStorageAttachmentType'), show: d => (d.carport || 0) > 0, req: d => (d.carport || 0) > 0, uad: 'CarStorageAttachmentType' },
      { k: 'projPark', t: 'info', l: 'Project parking: enter the spaces this unit has the right to use, and how they are held.', show: (d, ins) => IS_HOA(ins) },
      { k: 'pgSpaces', l: 'Parking garage spaces', t: 'count', show: (d, ins) => IS_HOA(ins), req: d => d.garShared === true, uad: 'ParkingSpacesCount', fid: '13.002' },
      { k: 'pgAssign', l: 'Parking garage spaces are', t: 'one', o: ASSIGN, show: (d, ins) => IS_HOA(ins) && (d.pgSpaces || 0) > 0, req: (d, ins) => IS_HOA(ins) && (d.pgSpaces || 0) > 0, uad: 'ProjectParkingSpaceAssignmentType' },
      { k: 'ccSpaces', l: 'Common carport spaces', t: 'count', show: (d, ins) => IS_HOA(ins), uad: 'ParkingSpacesCount' },
      { k: 'ccAssign', l: 'Common carport spaces are', t: 'one', o: ASSIGN, show: (d, ins) => IS_HOA(ins) && (d.ccSpaces || 0) > 0, req: (d, ins) => IS_HOA(ins) && (d.ccSpaces || 0) > 0, uad: 'ProjectParkingSpaceAssignmentType' },
      { k: 'olSpaces', l: 'Open lot spaces', t: 'count', show: (d, ins) => IS_HOA(ins), uad: 'ParkingSpacesCount' },
      { k: 'olAssign', l: 'Open lot spaces are', t: 'one', o: ASSIGN, show: (d, ins) => IS_HOA(ins) && (d.olSpaces || 0) > 0, req: (d, ins) => IS_HOA(ins) && (d.olSpaces || 0) > 0, uad: 'ProjectParkingSpaceAssignmentType' },
      { k: 'spaceIds', l: 'Space / stall numbers, guest parking, EV charging', t: 'text', show: (d, ins) => IS_HOA(ins) },
      { k: 'otherPark', l: 'Other parking', t: 'multi', o: opts('RV Parking','Boat Parking','Street Parking','Guest Parking','Covered Parking','Open Lot') },
      { k: 'photoGarage', l: 'Garage', t: 'photo', cat: 'VehicleStorageExhibit', show: d => d.hasGarage === true, recommended: true },
      { k: 'photoGarageInt', l: 'Garage interior', t: 'photo', cat: 'VehicleStorageExhibit', show: d => d.hasGarage === true, recommended: true },
      { k: 'vsDefects', l: 'Vehicle storage defects present?', t: 'yn', req: true, uad: 'VehicleStorageDefectsExistIndicator' },
      { k: 'note', l: 'Garage notes', t: 'note' },
    ]},
  ]},

  { id: 'exterior', title: 'Rear & Sides', groups: [
    { id: 'rearPh', title: 'Rear & side photos', fields: [
      { k: 'photoRear', l: 'Dwelling rear', t: 'photo', req: true, cat: 'DwellingRear', fid: 'UAD required' },
      { k: 'photoSide1', l: 'Side 1', t: 'photo', cat: 'DwellingExteriorExhibit', recommended: true },
      { k: 'photoSide2', l: 'Side 2', t: 'photo', cat: 'DwellingExteriorExhibit', recommended: true },
      { k: 'photoRear2', l: 'Rear – angle', t: 'photo', cat: 'DwellingExteriorExhibit' },
    ]},
    { id: 'extDef', title: 'Dwelling exterior', fields: [
      { k: 'extDefects', l: 'Dwelling exterior defects present?', t: 'yn', req: true, uad: 'DwellingExteriorDefectsExistIndicator', help: 'Add details on the Defects tab' },
      { k: 'note', l: 'Rear / side notes', t: 'note' },
    ]},
  ]},

  { id: 'site', title: 'Site & View', groups: [
    { id: 'siteMain', title: 'Site', fields: [
      { k: 'topo', l: 'Topography', t: 'multi', req: true, o: U('TopographyType'), uad: 'TopographyType' },
      { k: 'topoMore', l: 'Topography detail', t: 'multi', o: opts('Level Pad','Gentle Slope','Steep Slope','Upslope','Downslope','Terraced','Hillside','Bluff Top','Canyon','Knoll','Multiple Pads') },
      { k: 'apnDesc', l: 'APN description', t: 'one', req: true, o: opts(['LandWithDwelling','Land with Dwelling'],['CondominiumUnit','Condominium Unit'],['LandWithImprovement','Land with Improvement'],['VacantLand','Vacant Land'],['Other','Other']), uad: 'ParcelDescriptionClassificationType', fid: '4.006' },
      { k: 'apnOther', l: 'Describe APN', t: 'text', show: d => d.apnDesc === 'Other', req: d => d.apnDesc === 'Other' },
      { k: 'zoneCode', l: 'Zoning code', t: 'text', help: 'Filled from the County permit history or CRS report when loaded', uad: 'SiteZoningClassificationIdentifier' },
      { k: 'zoneDesc', l: 'Zoning description', t: 'text', help: 'e.g. Single-family residential, 10,000 sq. ft. minimum lot', uad: 'SiteZoningClassificationDescription' },
      { k: 'zoneComp', l: 'Zoning compliance', t: 'one', req: true, o: opts(['Legal','Legal'],['LegalNonConforming','Legal Nonconforming'],['Illegal','Illegal'],['NoZoning','No Zoning']), uad: 'SiteZoningComplianceType' },
      { k: 'usable', l: 'Usable lot area', t: 'one', show: (d, ins) => !IS_PROJ(ins), o: opts('All Usable','Mostly Usable','Partially Usable','Limited Usable Area') },
      { k: 'siteFeat', l: 'Site characteristics affecting value', t: 'multi', req: true, o: noneFirst(UN('SiteFeatureType')), uad: 'SiteFeatureType' },
      { k: 'siteFeatImpact', l: 'Impact of site characteristics', t: 'one', o: UN('ValueMarketabilityImpactType'), show: d => (d.siteFeat || []).some(x => x !== 'None'), req: d => (d.siteFeat || []).some(x => x !== 'None') },
      { k: 'siteFeatDesc', l: 'Site characteristic comment', t: 'note', lim: 140, show: d => (d.siteFeat || []).some(x => x !== 'None'), req: d => d.siteFeatImpact && d.siteFeatImpact !== 'Neutral', uad: 'SiteFeatureDescription', fid: '4.065' },
      { k: 'drainage', l: 'Drainage concerns', t: 'multi', o: U('SiteDrainageReasonType'), show: d => (d.siteFeat || []).includes('Drainage') },
      { k: 'photoSite', l: 'Site', t: 'photo', cat: 'SiteCharacteristic', recommended: true },
      { k: 'photoSite2', l: 'Site 2', t: 'photo', cat: 'SiteCharacteristic' },
      { k: 'photoSite3', l: 'Site 3', t: 'photo', cat: 'SiteCharacteristic' },
    ]},
    { id: 'restr', title: 'Restrictions', fields: [
      { k: 'ageRestr', l: 'Age-restricted (55+)?', t: 'yn', req: true, help: 'An owner or occupant must meet an age requirement (CC&Rs / deed). Sent to SFREP as a property restriction (Age).', uad: 'RestrictionType', fid: '4.051' },
      { k: 'ageDesc', l: 'Age restriction – what it requires', t: 'text', lim: 250, show: d => d.ageRestr === true, help: 'e.g. At least one owner must be 55 or older.', uad: 'RestrictionDescription', fid: '4.053' },
      { k: 'ageImpact', l: 'Effect of the age restriction on value / marketability', t: 'one', o: IMPACT, show: d => d.ageRestr === true, req: d => d.ageRestr === true, uad: 'ValueMarketabilityImpactType', fid: '4.052' },
    ]},
    { id: 'infl', title: 'Site influences', fields: [
      { k: 'influences', l: 'Site influences', t: 'multi', req: true, o: [['Residential','Residential']].concat(U('SiteInfluenceType').filter(x => x[0] !== 'Residential' && x[0] !== 'BodyOfWater' && x[0] !== 'Other')).concat([['BodyOfWater','Body of Water'],['Other','Other']]), uad: 'SiteInfluenceType' },
      { k: 'inflProx', l: 'Proximity', t: 'one', o: UN('SiteInfluenceProximityType'), req: true, uad: 'SiteInfluenceProximityType' },
      { k: 'inflImpact', l: 'Impact', t: 'one', o: UN('ValueMarketabilityImpactType'), req: true, uad: 'ValueMarketabilityImpactType' },
      { k: 'inflDesc', l: 'Site influence comment', t: 'note', lim: 180, req: d => d.inflImpact && d.inflImpact !== 'Neutral', uad: 'SiteInfluenceDescription', fid: '4.029' },
      { k: 'water', l: 'Body of water', t: 'one', o: U('BodyOfWaterType').filter(x => !['Bay','Canal','Cove','Gulf','River','Sound'].includes(x[0])), show: d => (d.influences || []).includes('BodyOfWater'), req: d => (d.influences || []).includes('BodyOfWater'), uad: 'BodyOfWaterType' },
      { k: 'waterPrivate', l: 'Private water access', t: 'yn', show: d => (d.influences || []).includes('BodyOfWater'), req: d => (d.influences || []).includes('BodyOfWater'), uad: 'PrivateAccessIndicator' },
      { k: 'waterMeasure', t: 'info', l: 'Measure it: SFREP requires the water frontage length. Enter it in SFREP.', show: d => d.waterPrivate === true },
      { k: 'waterRights', l: 'Waterfront access rights', t: 'one', o: U('WaterAccessRightType'), show: d => d.waterPrivate === true, req: d => d.waterPrivate === true },
      { k: 'waterDepth', l: 'Access depth', t: 'one', o: U('WaterAccessDepthType'), show: d => d.waterPrivate === true, req: d => d.waterPrivate === true },
      { k: 'waterFeat', l: 'Permanent waterfront features', t: 'multi', o: noneFirst(UN('WaterfrontFeatureType')), show: d => d.waterPrivate === true, req: d => d.waterPrivate === true },
      { k: 'photoWater', l: 'Water frontage', t: 'photo', cat: 'WaterFrontage', show: d => d.waterPrivate === true, req: d => d.waterPrivate === true },
      { k: 'envCond', l: 'Apparent environmental conditions', t: 'multi', req: true, o: noneFirst(UN('EnvironmentalConditionType')), uad: 'EnvironmentalConditionType', fid: '4.027' },
      { k: 'envProx', l: 'Environmental condition proximity', t: 'one', o: opts(['Onsite','On Site'],['Bordering','Bordering'],['Offsite','Off Site']), show: d => (d.envCond || []).some(x => x !== 'None'), req: d => (d.envCond || []).some(x => x !== 'None'), uad: 'EnvironmentalConditionProximityType' },
      { k: 'envDesc', l: 'Environmental condition comment', t: 'note', lim: 180, show: d => (d.envCond || []).some(x => x !== 'None'), req: d => (d.envCond || []).some(x => x !== 'None'), uad: 'EnvironmentalConditionIdentifiedDescription' },
      { k: 'photoInfl', l: 'Site influence', t: 'photo', cat: 'SiteInfluence', show: d => (d.influences || []).some(x => x !== 'Residential') },
    ]},
    { id: 'view', title: 'View', fields: [
      { k: 'view', l: 'View(s)', t: 'multi', req: true, o: VIEW_OPTS, uad: 'ViewType' },
      { k: 'viewPrimary', l: 'Predominant view', t: 'one', req: d => (d.view || []).length > 1, show: d => (d.view || []).length > 1, o: d => VIEW_OPTS.filter(x => (d.view || []).includes(x[0])), uad: 'ViewPrimaryIndicator' },
      { k: 'viewRange', l: 'Range of view', t: 'one', req: true, o: U('ViewRangeType'), uad: 'ViewRangeType' },
      { k: 'viewImpact', l: 'Impact', t: 'one', req: true, o: UN('ValueMarketabilityImpactType'), uad: 'ValueMarketabilityImpactType' },
      { k: 'viewMore', l: 'View detail', t: 'multi', o: opts('Panoramic','Unobstructed','Partially Obstructed','From Most Rooms','From Primary Bedroom','From Living Areas','From Yard Only','Sunset','City Lights','Island','Coastline','Harbor','Canyon','Foothills','Vineyard','Orchard','Protected / Permanent','Could Be Obstructed') },
      { k: 'photoView', l: 'View', t: 'photo', cat: 'View', recommended: true },
      { k: 'photoView2', l: 'View 2', t: 'photo', cat: 'View' },
      { k: 'photoView3', l: 'View 3', t: 'photo', cat: 'View' },
    ]},
    { id: 'hazard', title: 'Hazards & utilities', fields: [
      { k: 'hazard', l: 'Hazard zone(s)', t: 'multi', req: true, o: [['None','No Hazard Zone Noted'],['FEMASpecialFloodHazardArea','FEMA Special Flood Hazard Area'],['Debris Flow Area','Debris Flow Area'],['Storm Impact Parcel','Storm Impact Parcel'],['Other','Other']], uad: 'HazardZoneType', fid: '4.047', help: 'Filled from the CRS FEMA flood zone when loaded' },
      { k: 'hazardOther', l: 'Other hazard zone', t: 'text', show: d => (d.hazard || []).includes('Other'), req: d => (d.hazard || []).includes('Other') },
      { k: 'fire', l: 'Fire hazard zone', t: 'multi', req: true, o: opts('No Fire Hazard Zone','Very High Fire Hazard Severity Zone','High Fire Hazard Severity Zone','Moderate Fire Hazard Severity Zone','Defensible Space Maintained','Brush Clearance Needed','Other') },
      { k: 'elec', l: 'Electricity', t: 'one', req: true, o: opts(['Public','Public'],['NonPublic','Private']), uad: 'SiteUtilityOwnershipType' },
      { k: 'gas', l: 'Gas', t: 'one', req: true, o: opts(['Public','Public'],['NonPublic','Private (propane)'],['None','None']), uad: 'SiteUtilityOwnershipType' },
      { k: 'waterUtil', l: 'Water', t: 'one', req: true, o: opts(['Public','Public'],['NonPublic','Private'],['Both','Public and Private']), uad: 'SiteUtilityOwnershipType' },
      { k: 'waterSrc', l: 'Private water source', t: 'one', o: U('WaterSourceType'), show: d => ['NonPublic','Both'].includes(d.waterUtil), req: d => ['NonPublic','Both'].includes(d.waterUtil), uad: 'WaterSourceType' },
      { k: 'well', l: 'Well use', t: 'one', o: opts('Domestic','Irrigation Only','Domestic and Irrigation','Unknown'), show: d => d.waterSrc === 'Well' },
      { k: 'wellShared', l: 'Well', t: 'one', o: opts('Private','Shared','Unknown'), show: d => d.waterSrc === 'Well' },
      { k: 'sewer', l: 'Sanitary sewer', t: 'one', req: true, o: opts(['Public','Public'],['NonPublic','Private']), uad: 'SiteUtilityOwnershipType' },
      { k: 'sewerType', l: 'Private wastewater system', t: 'one', o: opts(['Septic','Septic'],['Cesspool','Cesspool'],'Alternative / Engineered Septic','Holding Tank',['Other','Other']), show: d => d.sewer === 'NonPublic', req: d => d.sewer === 'NonPublic', uad: 'SewerSystemType' },
      { k: 'utilImpact', l: 'Private utility impact', t: 'one', o: UN('ValueMarketabilityImpactType'), show: d => [d.elec, d.gas, d.waterUtil, d.sewer].some(x => x === 'NonPublic' || x === 'Both'), req: d => [d.elec, d.gas, d.waterUtil, d.sewer].some(x => x === 'NonPublic' || x === 'Both') },
      { k: 'utilDesc', l: 'Private utility comment', t: 'note', lim: 150, show: d => [d.elec, d.gas, d.waterUtil, d.sewer].some(x => x === 'NonPublic' || x === 'Both'), req: d => d.utilImpact === 'Adverse', uad: 'SiteUtilityDescription', fid: '4.074' },
      { k: 'broadband', l: 'Broadband internet available', t: 'yn', req: true, uad: 'BroadbandInternetAvailableIndicator', fid: '4.067' },
      { k: 'siteDefects', l: 'Site defects present?', t: 'yn', req: true, uad: 'SiteDefectsExistIndicator' },
      { k: 'note', l: 'Site notes', t: 'note' },
    ]},
  ]},

  { id: 'buildings', title: 'ADU & Buildings', groups: [
    { id: 'adu', title: 'Accessory dwelling units', fields: [
      { k: 'aduCount', l: 'Accessory dwelling units', t: 'calc', calc: ins => (ins.lists.adus || []).length, uad: 'AccessoryDwellingUnitTotalCount', fid: '3.006' },
    ], list: 'adus' },
    { id: 'outb', title: 'Outbuildings', fields: [], list: 'outbuildings' },
  ]},

  { id: 'amenities', title: 'Outdoor', groups: [
    { id: 'yard', title: 'The unit\'s own outdoor space', showGroup: (d, ins) => IS_PROJ(ins), fields: [
      { k: 'ownYard', l: 'Does the unit have its own yard (exclusive use, not common area)?', t: 'yn', req: (d, ins) => IS_PROJ(ins), help: 'Common pool, spa, landscaping and recreation belong on the Project / HOA tab (common amenities). Answer Yes only if this unit has its own yard; then its pool, landscaping and outdoor items are asked here.' },
    ]},
    { id: 'olv', title: 'Porches, patios, decks & balconies', fields: [], list: 'outdoorLiving' },
    { id: 'wf', title: 'Pool, spa & water features', fields: [], list: 'waterFeatures', showGroup: (d, ins) => !IS_PROJ(ins) || d.ownYard === true },
    { id: 'land', title: 'Landscaping', showGroup: (d, ins) => !IS_PROJ(ins) || d.ownYard === true, fields: [
      { k: 'landArea', l: 'Landscaped area', t: 'one', o: opts('Fully Landscaped','Usable Lot Area Fully Landscaped','Mostly Landscaped','Partially Landscaped','Minimal Landscaping','Natural / Native','Drought Tolerant','Overgrown','None') },
      { k: 'landFeat', l: 'Landscape features', t: 'multi', o: opts('Lawn','Established Trees','Specimen Trees','Shrubs','Bushes','Hedges','Ground Cover','Flower Beds','Rose Garden','Vegetable Garden','Raised Beds','Orchard','Fruit Trees','Citrus Trees','Avocado Trees','Vineyard','Wooded','Boulders / Rocky','Native Plants','Succulents','Drought Tolerant','Artificial Turf','Meadow') },
      { k: 'landSys', l: 'Systems', t: 'multi', o: opts('Automatic Irrigation','Drip Irrigation','Manual Irrigation','Drainage System','Subsurface Drains','Landscape Lighting','Outdoor Speakers') },
      { k: 'hardscape', l: 'Hardscape & structures', t: 'multi', o: opts('Perimeter Walls','Fencing','Retaining Walls','Terraces','Garden Walls','Stone Steps','Pathways','Bridge','Arbor','Other') },
      { k: 'fenceMat', l: 'Fencing material', t: 'multi', show: d => (d.hardscape || []).includes('Fencing'), o: opts('Wood','Wrought Iron','Vinyl','Chain Link','Block / Masonry','Stucco Wall','Split Rail','Hedge') },
      { k: 'walks', l: 'Walks', t: 'multi', o: opts('Concrete','Pavers','Flagstone','Brick','Decomposed Granite','Gravel','Stamped Concrete','Wood','Stone') },
      { k: 'photoLand', l: 'Landscape', t: 'photo', cat: 'SubjectPropertyAmenitiesExhibit', recommended: true },
      { k: 'photoLand2', l: 'Landscape 2', t: 'photo', cat: 'SubjectPropertyAmenitiesExhibit' },
      { k: 'photoLand3', l: 'Landscape 3', t: 'photo', cat: 'SubjectPropertyAmenitiesExhibit' },
    ]},
    { id: 'rec', title: 'Recreation & outdoor living', showGroup: (d, ins) => !IS_PROJ(ins) || d.ownYard === true, fields: [
      { k: 'rec', l: 'Recreation', t: 'multi', o: opts('Tennis Court','Sport Court','Pickleball Court','Basketball Court','Bocce Court','Putting Green','Playground','Play Structure','Trampoline (in-ground)','Skate Ramp','Volleyball','Batting Cage') },
      { k: 'outdoor', l: 'Outdoor living', t: 'multi', o: opts('Outdoor Dining','Outdoor Kitchen','Built-in BBQ Area','Pizza Oven','Outdoor Bar','Outdoor Fireplace','Fire Pit','Gazebo','Trellis','Pergola','Outdoor TV','Hammock Area','Dog Run','Chicken Coop','Other') },
      { k: 'gazeboMeasure', t: 'info', l: 'Measure it: SFREP requires the gazebo area. Enter it in SFREP from your sketch.', show: d => (d.outdoor || []).includes('Gazebo') },
      { k: 'equestrian', l: 'Equestrian', t: 'yn' },
      { k: 'equine', l: 'Horse amenities', t: 'multi', show: d => d.equestrian === true, o: opts('Barn','Stable','Stalls','Paddocks','Pasture','Corrals','Pens','Arena','Covered Arena','Round Pen','Riding Ring','Hot Walker','Wash Rack','Tack Room','Hay Barn','Manure Area','Trail Access','Fencing','Water Troughs','Horse Trailer Parking') },
      { k: 'stalls', l: 'Number of stalls', t: 'count', show: d => d.equestrian === true },
      { k: 'photoRec', l: 'Recreation', t: 'photo', cat: 'SubjectPropertyAmenitiesExhibit' },
      { k: 'photoOutdoor', l: 'Outdoor living', t: 'photo', cat: 'SubjectPropertyAmenitiesExhibit' },
      { k: 'photoEquine', l: 'Equestrian', t: 'photo', cat: 'SubjectPropertyAmenitiesExhibit', show: d => d.equestrian === true },
      { k: 'amenDefects', l: 'Amenity defects present?', t: 'yn', req: true, uad: 'SubjectPropertyAmenitiesDefectsExistIndicator' },
      { k: 'note', l: 'Outdoor notes', t: 'note' },
    ]},
  ]},

  { id: 'interior', title: 'Interior', groups: [
    { id: 'unit', title: 'Unit summary', fields: [
      { k: 'beds', l: 'Total bedrooms', t: 'calc', calc: ins => (ins.lists.bedrooms || []).length, uad: 'BedroomCount' },
      { k: 'fullBaths', l: 'Total full baths', t: 'calc', calc: ins => (ins.lists.baths || []).filter(b => b.kind === 'FullBathroom').length, uad: 'FullBathroomCount' },
      { k: 'halfBaths', l: 'Total half baths', t: 'calc', calc: ins => (ins.lists.baths || []).filter(b => b.kind === 'HalfBathroom').length, uad: 'HalfBathroomCount' },
      { k: 'levelCount', l: 'Levels in unit', t: 'calc', calc: ins => (ins.lists.levels || []).length, uad: 'LevelCount' },
      { k: 'bgCompare', l: 'Below-grade finish compared to above grade', t: 'one', o: opts('Superior','Similar','Inferior'), show: (d, ins) => (ins.lists.levels || []).some(l => l.grade && l.grade !== 'AboveGrade'), req: (d, ins) => (ins.lists.levels || []).some(l => l.grade && l.grade !== 'AboveGrade'), uad: 'UnitBelowGradeFinishComparisonType', fid: '10.010', help: 'Required when there is finished below-grade area.' },
      { k: 'floorNum', l: 'Floor number of the unit', t: 'sel', o: Array.from({ length: 40 }, (_, i) => [String(i + 1), String(i + 1)]), show: (d, ins) => RISE(ins), req: (d, ins) => RISE(ins), uad: 'FloorIdentifier', fid: '10.018', help: 'The floor of the unit\'s main entry level, e.g. 3' },
      { k: 'corner', l: 'Corner unit', t: 'yn', show: (d, ins) => RISE(ins), req: (d, ins) => RISE(ins), uad: 'CornerUnitIndicator', fid: '10.019' },
      { k: 'unitMixed', l: 'Non-residential use in the unit', t: 'yn', show: (d, ins) => PRP(ins).siteCommon === true, req: (d, ins) => PRP(ins).siteCommon === true, uad: 'UnitMixedUsageIndicator', fid: '10.026' },
      { k: 'liveWork', l: 'Live/work space available within the unit', t: 'yn', show: (d, ins) => PRP(ins).siteCommon === true, req: (d, ins) => PRP(ins).siteCommon === true, uad: 'AllowableLiveWorkSpaceIndicator', fid: '10.027' },
      { k: 'liveWorkInfo', t: 'info', l: 'Enter the allowable work space (sq. ft.) in SFREP from your sketch.', show: d => d.liveWork === true },
      { k: 'unitPos', l: 'Unit location / exposure', t: 'multi', show: (d, ins) => IS_HOA(ins) || PRP(ins).attach === 'Attached', o: (d, ins) => opts('Ground Floor','Top Floor','Penthouse', ...(PRP(ins).structDesign === 'RowhouseTownhouse' ? [] : ['End Unit']),'Interior Unit','Faces Street','Faces Courtyard','Faces Pool','Faces Parking','Ocean Facing','Mountain Facing','Near Elevator','Near Trash / Mechanical','Private Entry','Private Yard / Patio','Shared Walls: One Side','Shared Walls: Two Sides','Units Above','Units Below','No Units Above','Elevator Access to Unit','Stairs Only') },
      { k: 'sketchRev', l: 'Area from the sketch (tap ✏️ Sketch at the top to draw or change it)', t: 'review', items: ins => sketchItems(ins) },
      { k: 'measure', t: 'info', l: 'No sketch yet: square footage will be entered in SFREP from your sketch.', show: (d, ins) => !(ins && ins.sketch && ins.sketch.areaCount) },
      { k: 'sketchImg', l: 'Sketch image (made by the sketch page)', t: 'photo', cat: 'SubjectPropertyImprovementSketch' },
      { k: 'areaSource', l: 'Area data source', t: 'one', req: true, o: opts(['PhysicalMeasurement','Physical Measurement'],['PlansAndSpecifications','Plans'],['PublicRecords','Public Record'],['PropertyDataReport','Property Data Report'],['Other','Other']), uad: 'DataSourceType', fid: '10.009' },
      { k: 'ansi', l: 'Measured per ANSI Z765-2021', t: 'yn', req: true },
    ]},
    { id: 'levels', title: 'Levels', fields: [], list: 'levels' },
    { id: 'stairs', title: 'Stairs', fields: [], list: 'stairs', listShow: (d, ins) => (ins.lists.levels || []).length > 1, showGroup: (d, ins) => (ins.lists.levels || []).length > 1 },
    { id: 'rooms', title: 'Rooms', fields: [], list: 'rooms' },
    { id: 'beds', title: 'Bedrooms', fields: [], list: 'bedrooms' },
    { id: 'baths', title: 'Bathrooms', fields: [], list: 'baths' },
    { id: 'kitchens', title: 'Kitchens', fields: [], list: 'kitchens' },
    { id: 'wetbars', title: 'Wet bars', fields: [], list: 'wetbars' },
    { id: 'finish', title: 'Ceilings, flooring & walls (whole house)', fields: [
      { k: 'ceilH', l: 'Ceiling heights (all that apply)', t: 'multi', req: true, o: CEIL_H, uad: 'ApproximateCeilingHeightType', fid: '10.045' },
      { k: 'ceilAll', l: 'Ceiling types (from your rooms)', t: 'calc', calc: ins => unitList(ins, 'ceilS').map(c => labelOf(CEIL_S, c)).join(', ') || 'None yet. Add ceiling types in Rooms.' },
      { k: 'floorAll', l: 'Flooring types (from your rooms)', t: 'calc', calc: ins => unitList(ins, 'flooring').map(c => labelOf(FLOORING, c)).join(', ') || 'None yet. Add flooring in Rooms, Bedrooms, Baths and Kitchens.' },
      { k: 'floorUpd', l: 'Overall flooring update status', t: 'one', req: true, o: UN('OverallFlooringUpdateStatusType'), uad: 'OverallFlooringUpdateStatusType' },
      { k: 'floorCond', l: 'Flooring condition', t: 'one', req: true, o: COMP_COND },
      { k: 'wallCond', l: 'Walls & ceilings condition', t: 'one', req: true, o: COMP_COND },
      { k: 'bathUpd', l: 'Overall bathrooms update status', t: 'one', req: true, o: UN('OverallBathroomsUpdateStatusType'), uad: 'OverallBathroomsUpdateStatusType' },
    ]},
    { id: 'feat', title: 'Interior features, windows & doors', fields: [
      { k: 'intFeat', l: 'Interior features', t: 'multi', o: opts('Ceiling Fans','Plaster Walls (Venetian / Lime / Tadelakt)','Exposed Beams','Wood Plank Ceilings','Wallpaper','Wood Paneling','Built-in Shelving','Built-in Hutch','Built-in Desk','Crown Molding','Wainscoting','Skylights','Solatubes','Clerestory Windows','Pocket Doors','Recessed LED Lighting','Custom Light Fixtures','Chandeliers','Dimmers','Elevator','Dumbwaiter','Laundry Chute','Wine Storage','Safe Room','Hidden Room','Fire Sprinklers') },
      { k: 'fireplaces', l: 'Fireplaces', t: 'count' },
      { k: 'fpType', l: 'Fireplace type', t: 'multi', show: d => (d.fireplaces || 0) > 0, o: opts('Wood Burning','Gas','Gas Insert','Electric','Pellet Stove','Wood Stove','See-through') },
      { k: 'winCover', l: 'Window coverings', t: 'multi', o: opts('None','Drapes','Curtains','Plantation Shutters','Blinds','Wood Blinds','Automatic / Motorized Shades','Roman Shades','Roller Shades','Blackout Shades','Solar Shades','Sheers') },
      { k: 'intDoors', l: 'Interior doors', t: 'multi', o: opts('Solid Core','Hollow Core','Painted','Stained Wood','Glass Panel','Glass','Metal','Custom','Tall (8 ft+)','Arched','Raised Panel','Flat Panel','Pocket','Barn','Glass Double') },
      { k: 'extDoors', l: 'Exterior doors', t: 'multi', o: opts('Solid Wood','Custom','Glass Panel','Iron & Glass','Metal','Fiberglass','Glass Double Doors','Sliding Glass Doors','Shoji Door','Dutch Door','Bi-folding Door','Multi-panel Bi-folding Doors','Walls of Glass','Floor-to-ceiling Glass Doors','Accordion Doors','Pivot Door') },
      { k: 'laundry', l: 'Laundry', t: 'multi', o: opts('None','Laundry Room','Laundry Closet','In Garage','Upstairs','Second Laundry','Sink','Cabinets') },
      { k: 'access', l: 'Accessibility features', t: 'multi', req: true, o: noneFirst(UN('AccessibilityFeatureType')), uad: 'AccessibilityFeatureType' },
      { k: 'accessDesc', l: 'Accessibility modification comment', t: 'note', lim: 296, show: d => (d.access || []).some(x => x !== 'None'), uad: 'AccessibilityModificationDescription', fid: '10.051' },
    ]},
    { id: 'safety', title: 'Smoke & carbon monoxide detectors', fields: [
      { k: 'smoke', l: 'Smoke detectors observed (hallways / common areas)', t: 'yn', req: true },
      { k: 'photoSmoke', l: 'Smoke detector', t: 'photo', cat: 'UnitInteriorExhibit', req: d => d.smoke === true },
      { k: 'co', l: 'Carbon monoxide detector observed', t: 'yn', req: true },
      { k: 'photoCO', l: 'Carbon monoxide detector', t: 'photo', cat: 'UnitInteriorExhibit', req: true },
      { k: 'coNote', l: 'Smoke / CO detector comment', t: 'note', req: true },
    ]},
    { id: 'noncont', title: 'Noncontinuous finished area', fields: [
      { k: 'noncont', l: 'Noncontinuous finished area present?', t: 'yn', req: true, uad: 'NonContinuousFinishedAreaIndicator' },
    ], list: 'noncont', listShow: d => d.noncont === true },
    { id: 'attic', title: 'Attic', fields: [
      { k: 'attic', l: 'Attic', t: 'yn', req: true, uad: 'AtticExistsIndicator', fid: '8.017' },
      { k: 'atticAccess', l: 'Access', t: 'one', o: opts('Scuttle','Pull-down Stairs','Walk-up Stairs','Door','None / Sealed'), show: d => d.attic === true, req: d => d.attic === true },
      { k: 'atticFinish', l: 'Finish', t: 'one', o: opts('Unfinished','Partially Finished','Finished'), show: d => d.attic === true, req: d => d.attic === true },
      { k: 'atticCeil', l: 'Ceiling height range', t: 'one', o: opts('Under 5 ft','5–7 ft','7 ft or more','Varies','Not Measured'), show: d => d.attic === true },
      { k: 'attic5', l: 'Area with ceiling height at least 5 ft', t: 'one', o: opts('All','Partial','None','Not Measured'), show: d => d.attic === true, req: d => d.atticFinish && d.atticFinish !== 'Unfinished' },
      { k: 'atticHVAC', l: 'Heated / cooled', t: 'yn', show: d => d.attic === true },
      { k: 'atticEgress', l: 'Egress window / door', t: 'yn', show: d => d.attic === true },
      { k: 'atticObs', l: 'Observed', t: 'multi', show: d => d.attic === true, o: opts('Insulation','Ventilation','Storage','Flooring','HVAC Equipment','Not Entered (head and shoulders only)','Not Accessible') },
      { k: 'photoAttic', l: 'Attic', t: 'photo', cat: 'UnitInteriorExhibit', show: d => d.attic === true },
    ]},
    { id: 'intQC', title: 'Interior quality, condition & defects', fields: [
      { k: 'iq', l: 'Interior quality', t: 'one', req: true, o: QR, uad: 'InteriorQualityRatingCode' },
      { k: 'ic', l: 'Interior condition', t: 'one', req: true, o: CR, uad: 'InteriorConditionRatingCode' },
      { k: 'intDefects', l: 'Dwelling interior defects present?', t: 'yn', req: true, uad: 'UnitInteriorDefectsExistIndicator' },
      { k: 'note', l: 'Interior notes', t: 'note' },
    ]},
  ]},

  { id: 'systems', title: 'Systems', groups: [
    { id: 'hvac', title: 'Heating & cooling', fields: [
      { k: 'heat', l: 'Heating system', t: 'multi', req: true, o: [['None','None'], ...U('HeatingSystemType').filter(x => x[0] !== 'Other'), ['Heat Pump','Heat Pump'], ['Other','Other']], uad: 'HeatingSystemType' },
      { k: 'heatFuel', l: 'Heating fuel', t: 'multi', req: d => (d.heat || []).some(x => x !== 'None'), o: U('HeatingFuelType').filter(x => !['Coal','Oil'].includes(x[0])), uad: 'HeatingFuelType' },
      { k: 'heatZones', l: 'Heating / cooling zones', t: 'count', help: '2 or more = multi-zone HVAC' },
      { k: 'heatBelow', l: 'Core heating system below grade', t: 'yn', req: true, uad: 'CoreHeatingSystemBelowGradeIndicator' },
      { k: 'cool', l: 'Cooling', t: 'multi', req: true, o: opts('None',['Centralized','Central Air'],['Individual','Individual Units'],'Heat Pump','Mini Split','Evaporative','Whole House Fan',['Other','Other']), uad: 'CoolingSystemType' },
    ]},
    { id: 'wh', title: 'Water heater', fields: [
      { k: 'wh', l: 'Water heater type (all that apply)', t: 'multi', req: true, o: opts('Tank – Gas','Tank – Electric','Tankless – Gas','Tankless – Electric','Heat Pump Water Heater','Solar Water Heater','Boiler / Indirect') },
      { k: 'whCount', l: 'Number of water heaters', t: 'count', req: true },
      { k: 'whStrap', l: 'Strapping', t: 'multi', req: true, o: opts('Double Strapped','Single Strapped','Not Strapped','Tankless / Wall Mounted','Not Observed') },
      { k: 'whRecirc', l: 'Recirculating pump', t: 'yn' },
      { k: 'photoWH', l: 'Water heater', t: 'photo', cat: 'UnitInteriorExhibit', req: true },
      { k: 'whNote', l: 'Water heater comment', t: 'note', req: true },
    ]},
    { id: 'mech', title: 'Other mechanical & water systems', fields: [
      { k: 'mech', l: 'Mechanical systems', t: 'multi', o: opts(['SumpPump','Sump Pump'],['RadonMitigation','Radon Mitigation'],['WholeHouseWaterTreatment','Whole House Water Treatment'],'Water Softener','Water Filtration','Reverse Osmosis','UV Treatment','Graywater System','Rainwater Collection','Booster Pump','Pressure Tank','Whole House Ventilation','Central Vacuum'), uad: 'MechanicalSystemType' },
      { k: 'tanks', l: 'Water storage tanks', t: 'count' },
      { k: 'tankGal', l: 'Gallons (each / total)', t: 'text', show: d => (d.tanks || 0) > 0 },
    ]},
    { id: 'energy', title: 'Energy efficiency', fields: [
      { k: 'renew', l: 'Renewable energy', t: 'multi', o: [['None','None'], ...U('RenewableEnergyComponentType')], req: true, uad: 'RenewableEnergyComponentType' },
      { k: 'solarOwn', l: 'Solar ownership', t: 'one', o: U('RenewableEnergyComponentOwnershipType'), show: d => (d.renew || []).includes('Solar'), req: d => (d.renew || []).includes('Solar'), uad: 'RenewableEnergyComponentOwnershipType' },
      { k: 'solarFin', l: 'Solar financed', t: 'yn', show: d => (d.renew || []).includes('Solar'), req: d => (d.renew || []).includes('Solar'), uad: 'RenewableEnergyComponentFinancedIndicator' },
      { k: 'solarKw', l: 'Solar size (kW)', t: 'num', show: d => (d.renew || []).includes('Solar') },
      { k: 'solarYear', l: 'Year installed', t: 'year', show: d => (d.renew || []).includes('Solar') },
      { k: 'solarCost', l: 'Cost ($)', t: 'money', show: d => d.solarOwn === 'Owned' },
      { k: 'eff', l: 'Efficiency items', t: 'multi', o: opts('Backup Battery System','Generator – Natural Gas','Generator – Propane','Generator – Diesel','Geothermal','Insulation Improvements','Efficient Windows','EV Charging','Cool Roof','Radiant Barrier') },
      { k: 'battery', l: 'Battery (brand / kWh)', t: 'text', show: d => (d.eff || []).includes('Backup Battery System') },
      { k: 'certs', l: 'Known building certifications', t: 'multi', req: true, o: opts('None','LEED','ENERGY STAR','Passive House','NGBS','Zero Energy Ready','Other'), uad: 'GreenCertificationExistsIndicator' },
      { k: 'ratings', l: 'Known efficiency ratings', t: 'multi', req: true, o: opts('None','HERS','Home Energy Score','Other'), uad: 'EfficiencyRatingExistsIndicator' },
      { k: 'effImpact', l: 'Energy features impact', t: 'one', o: UN('ValueMarketabilityImpactType'), show: d => (d.renew || []).some(x => x !== 'None') || (d.certs || []).some(x => x !== 'None') || (d.ratings || []).some(x => x !== 'None'), req: d => (d.renew || []).some(x => x !== 'None') || (d.certs || []).some(x => x !== 'None') || (d.ratings || []).some(x => x !== 'None') },
      { k: 'photoSolar', l: 'Solar / energy', t: 'photo', cat: 'EnergyEfficientAndGreenFeaturesExhibit', show: d => (d.renew || []).some(x => x !== 'None') },
    ]},
    { id: 'smart', title: 'Home automation, security & technology', fields: [
      { k: 'smart', l: 'Smart home', t: 'multi', o: opts('Smart Home System','Control4','Savant','Crestron','Lutron Lighting','Smart Thermostats','Smart Locks','Video Doorbell','Whole House Audio','Built-in Speakers','Home Theater System','Smart Irrigation','Smart Garage Openers','Voice Control','Remote Monitoring') },
      { k: 'security', l: 'Security', t: 'multi', o: opts('Security System','Monitored Alarm','Security Cameras','Gated Entry','Intercom','Video Intercom','Motion Lighting','Fire Alarm Monitoring') },
      { k: 'tech', l: 'Technology', t: 'multi', o: opts('Wi-Fi / Mesh Network','Hardwired Ethernet','Fiber Internet','Structured Wiring','Satellite') },
      { k: 'note', l: 'Systems notes', t: 'note' },
    ]},
  ]},

  { id: 'defects', title: 'Defects', groups: [
    { id: 'defInd', title: 'Defects present by area', fields: [
      { k: 'info', l: 'These mirror the defect questions on other tabs. Changing one changes both.', t: 'info' },
      { k: 'siteDefects', l: 'Site defects present?', t: 'yn', req: true, link: 'site' },
      { k: 'extDefects', l: 'Dwelling exterior defects present?', t: 'yn', req: true, link: 'exterior' },
      { k: 'intDefects', l: 'Dwelling interior defects present?', t: 'yn', req: true, link: 'interior' },
      { k: 'amenDefects', l: 'Amenity defects present?', t: 'yn', req: true, link: 'amenities' },
      { k: 'vsDefects', l: 'Vehicle storage defects present?', t: 'yn', req: true, link: 'garage' },
    ]},
    { id: 'defList', title: 'Defect observations', fields: [], list: 'defects' },
  ]},

  { id: 'interview', title: 'Interview', groups: [
    { id: 'updates', title: 'Updates, remodels & repairs', fields: [
      { k: 'permitImport', l: 'County permit history', t: 'permits', compact: true },
      { k: 'permitRev', l: 'County permit history (file dates – go over with the property contact)', t: 'review', show: (d, ins) => !!(ins && ins.data.property.permits), items: ins => permitItems(ins.data.property.permits).map(p => ({ label: p.year || '—', value: p.what + ' (' + p.dept + (p.status ? ', ' + p.status : '') + ')' })) },
      { k: 'kitYear', l: 'Kitchen remodeled (year)', t: 'sel', o: () => yearOpts(2000, true) },
      { k: 'kitScope', l: 'Kitchen work', t: 'one', o: REMODEL, show: d => !!d.kitYear && !['Unknown'].includes(d.kitYear) },
      { k: 'bathYear', l: 'Bathroom(s) remodeled (year)', t: 'sel', o: () => yearOpts(2000, true) },
      { k: 'bathScope', l: 'Bathroom work', t: 'one', o: REMODEL, show: d => !!d.bathYear && !['Unknown'].includes(d.bathYear) },
      { k: 'roofYear', l: 'Roof installed / replaced (year)', t: 'sel', o: () => yearOpts(1980, false) },
      { k: 'recent15', l: 'Replaced or remodeled within the last 15 years', t: 'multi', o: opts('HVAC / Furnace','Air Conditioning','Water Heater','Plumbing / Repipe','Sewer Lateral','Electrical / Panel','Windows','Exterior Doors','Interior Doors','Flooring','Interior Paint','Exterior Paint','Stucco / Siding','Insulation','Garage Door','Driveway / Hardscape','Landscaping','Fencing / Gates','Pool / Spa Equipment','Appliances','Foundation Work','Gutters') },
      { k: 'repairs', l: 'Major repairs (what, when)', t: 'note' },
      { k: 'planned', l: 'Planned or needed repairs', t: 'note' },
    ]},
    { id: 'disaster', title: 'Disaster mitigation', fields: [
      { k: 'disaster', l: 'Disaster mitigation features (all that apply)', t: 'multi', req: true, o: noneFirst(UN('DisasterMitigationFeatureType')), uad: 'DisasterMitigationFeatureType', fid: '5.000' },
      { k: 'disasterNote', l: 'Disaster mitigation notes', t: 'note', show: d => (d.disaster || []).some(x => x !== 'None') },
    ]},
    { id: 'sysConf', title: 'Systems confirmed', fields: [
      { k: 'sysRev', l: 'What you entered on the Systems tab', t: 'review', items: ins => reviewItems(ins, [
        ['Heating', 'systems', 'heat'], ['Heating fuel', 'systems', 'heatFuel'], ['Cooling', 'systems', 'cool'], ['HVAC zones', 'systems', 'heatZones'],
        ['Water heater', 'systems', 'wh'], ['Number of water heaters', 'systems', 'whCount'], ['Recirculating pump', 'systems', 'whRecirc'],
        ['Mechanical / water systems', 'systems', 'mech'], ['Renewable energy', 'systems', 'renew'], ['Solar ownership', 'systems', 'solarOwn'],
        ['Efficiency items', 'systems', 'eff'], ['Smart home', 'systems', 'smart'], ['Security', 'systems', 'security'], ['Technology', 'systems', 'tech']]) },
      { k: 'sysOk', l: 'Systems confirmed with interviewee', t: 'yn' },
      { k: 'otherSys', l: 'Systems notes', t: 'note' },
    ]},
    { id: 'utilConf', title: 'Utilities confirmed', fields: [
      { k: 'utilRev', l: 'What you entered on the Site tab', t: 'review', items: ins => reviewItems(ins, [
        ['Electricity', 'site', 'elec'], ['Gas', 'site', 'gas'], ['Water', 'site', 'waterUtil'], ['Sanitary sewer', 'site', 'sewer'], ['Private wastewater', 'site', 'sewerType']])
        .concat(ins.lists.adus.map((a, i) => ({ label: LISTS.adus.name(a, i) + ' – separately metered', value: a.metered === undefined ? '' : (a.metered ? 'Yes' : 'No'), go: 'buildings|item-' + a.id + '|' + a.id + '|adu' })))
        .concat(ins.lists.outbuildings.filter(o => (o.util || []).length).map((o, i) => ({ label: LISTS.outbuildings.name(o, i) + ' – utilities', value: valText(LISTS.outbuildings.fields.find(f => f.k === 'util'), o.util, o), go: 'buildings|item-' + o.id + '|' + o.id + '|outb' }))) },
      { k: 'utilOk', l: 'Utilities confirmed with interviewee', t: 'yn' },
      { k: 'utilMore', l: 'Utility details', t: 'multi', o: opts('Mutual Water Company','Propane Tank – Owned','Propane Tank – Leased','Septic Recently Pumped / Inspected','Sewer Lateral Replaced','Underground Utilities','Fiber Internet Available') },
      { k: 'utilNote', l: 'Utilities notes', t: 'note' },
    ]},
    { id: 'ea', title: 'Extraordinary assumptions & hypothetical conditions', fields: [
      { k: 'eaInfo', t: 'info', l: 'UAD 3.6 has no separate field for these. They are written into the Assignment Information and Scope of Work Commentary (2.061) with the required USPAP statement. Add one for each item you are relying on.' },
    ], list: 'eas' },
    { id: 'confirm', title: 'Confirmed with interviewee', fields: [
      { k: 'holdRev', l: 'Parcel hold on record (County) – ask about it', t: 'review', show: (d, ins) => !!(ins && ins.data.property.permits && ins.data.property.permits.holds.length), items: ins => ins.data.property.permits.holds.map(h => ({ label: 'Hold', value: h, go: 'property|grp-crs||crs' })) },
            { k: 'countRev', l: 'Room, bedroom & bath counts', t: 'review', items: countItems },
      { k: 'countsOk', l: 'Counts confirmed with interviewee', t: 'yn' },
      { k: 'addPermit', l: 'Additions permitted?', t: 'one', o: opts('Yes','No','No Additions','Unknown') },
      { k: 'addDesc', l: 'Describe additions / conversions', t: 'text', help: 'e.g. 2-bedroom addition; one bedroom converted to a den', show: d => d.addPermit && d.addPermit !== 'No Additions' },
      { k: 'additions', l: 'Additions comment', t: 'note', show: d => d.addPermit === 'No' || d.addPermit === 'Unknown' || (!d.addPermit && !!d.additions), req: d => d.addPermit === 'No' },
      { k: 'knownDef', l: 'Known defects?', t: 'yn' },
      { k: 'knownDefNote', l: 'Known defects comment', t: 'note', show: d => d.knownDef === true, req: d => d.knownDef === true },
      { k: 'saleStatus', l: 'Sale / listing status', t: 'one', o: opts('Not Listed','Listed for Sale','In Escrow','Recently Sold','Unknown') },
      { k: 'listPrice', l: 'List price', t: 'money', show: saleOn },
      { k: 'salePrice', l: 'Contract / sale price', t: 'money', show: d => d.saleStatus === 'In Escrow' || d.saleStatus === 'Recently Sold' },
      { k: 'offers', l: 'Offers received', t: 'count', show: saleOn },
      { k: 'multiOffers', l: 'Multiple offers?', t: 'yn', show: saleOn },
      { k: 'priceRed', l: 'Price reductions?', t: 'yn', show: saleOn },
      { k: 'priceRedNote', l: 'Price reductions (dates / amounts)', t: 'text', show: d => saleOn(d) && d.priceRed === true },
      { k: 'conc', l: 'Concessions or credits?', t: 'yn', show: saleOn },
      { k: 'concNote', l: 'Concessions / credits (amount, what for)', t: 'text', show: d => saleOn(d) && d.conc === true },
      { k: 'persProp', l: 'Personal property included?', t: 'yn', show: saleOn },
      { k: 'persPropNote', l: 'Personal property (what, value)', t: 'text', show: d => saleOn(d) && d.persProp === true },
      { k: 'terms', l: 'Special terms', t: 'multi', show: saleOn, o: opts('None','Lease Back','Seller Financing','Contingent on Buyer’s Sale','1031 Exchange','As-Is','Short Sale','REO / Bank Owned','Trust / Probate','Relocation','Non-Arm’s Length','Other') },
      { k: 'termsNote', l: 'Sale / listing notes', t: 'note', show: saleOn },
      { k: 'priorRev', l: 'Public record (CRS)', t: 'review', show: (d, ins) => !!(ins && ins.data.property.crs && (ins.data.property.crs.sales || []).length), items: ins => { const ss = ins.data.property.crs.sales || []; const txt = s => [s.date, s.amount || 'no price shown', s.instrument, s.buyer ? 'to ' + s.buyer : ''].filter(Boolean).join(' · ');
        const out = [{ label: 'Most recent recorded transfer', value: txt(ss[0]) }]; const priced = ss.find(s => s.amount);
        if (priced && priced !== ss[0]) out.push({ label: 'Most recent sale with a price', value: txt(priced) }); return out; } },
      { k: 'priorDate', l: 'Owner’s purchase date', t: 'date' },
      { k: 'priorPrice', l: 'Owner’s purchase price', t: 'money' },
      { k: 'hoa', l: 'HOA or road association?', t: 'yn', show: (d, ins) => !IS_HOA(ins), help: 'Yes opens the Project / HOA tab for the contact and dues.' },
      { k: 'hoaGo', t: 'info', l: 'HOA contact, dues and special assessments are on the Project / HOA tab.', show: (d, ins) => IS_HOA(ins) || d.hoa === true },
      { k: 'rented', l: 'Rented?', t: 'yn' },
      { k: 'rentType', l: 'Rental type', t: 'multi', o: opts('1-Year Lease','Month-to-Month','Seasonal','Short-Term Rental','Vacation Rental'), show: d => d.rented === true },
      { k: 'rentAmt', l: 'Monthly rent ($)', t: 'money', show: d => d.rented === true },
      { k: 'furnished', l: 'Furnished?', t: 'yn', show: d => d.rented === true },
      { k: 'rentUtil', l: 'Utilities included?', t: 'yn', show: d => d.rented === true },
      { k: 'rentNote', l: 'Rental notes', t: 'text', show: d => d.rented === true },
      { k: 'who', l: 'Interview source', t: 'multi', req: true, o: opts('Owner','Borrower','Agent','Occupant','Other') },
      { k: 'whoName', l: 'Name(s)', t: 'text' },
      { k: 'date', l: 'Interview date', t: 'date', req: true },
      { k: 'asked', l: 'Anything else the interviewee mentioned', t: 'note' },
    ]},
  ]},

  { id: 'condition', title: 'Wrap-up', groups: [
    { id: 'overall', title: 'Overall quality & condition', fields: [
      { k: 'oq', l: 'Overall quality', t: 'one', req: true, o: QR, uad: 'OverallQualityRatingCode', fid: '15.000' },
      { k: 'oc', l: 'Overall condition', t: 'one', req: true, o: CR, uad: 'OverallConditionRatingCode', fid: '15.005' },
      { k: 'valCond', l: 'Market value condition', t: 'multi', req: true, o: opts(['AsIs','As Is'],['SubjectToCompletionPerPlans','Subject to Completion per Plans'],['SubjectToRepair','Subject to Repair'],['SubjectToInspection','Subject to Inspection']), uad: 'PropertyValuationConditionalConclusionType', fid: '1.009', help: 'As Is cannot be combined with the others, and cannot be used when a defect recommends completion, repair or inspection.' },
      { k: 'overallUpd', l: 'Overall update level of the whole dwelling', t: 'one', o: REMODEL, help: 'For the whole house. Kitchen and bath remodels are entered on the Interview tab.' },
    ]},
    { id: 'func', title: 'Functional obsolescence', fields: [
      { k: 'func', l: 'Functional issues', t: 'multi', req: true, o: opts(['None','None Observed'],'Tandem Bedrooms','Tandem Garage Spaces','Access / Layout Issues',['CeilingHeight','Ceiling Height'],['FloorPlan','Floor Plan'],['NonConformity','Non-conformity'],['Overimprovement','Overimprovement'],['Underimprovement','Underimprovement'],['Other','Other']), uad: 'FunctionalIssueType', fid: '11.000' },
      { k: 'cure', l: 'Curability', t: 'one', o: opts('Curable','Incurable','Undetermined'), show: d => (d.func || []).some(x => x !== 'None'), req: d => (d.func || []).some(x => x !== 'None') },
      { k: 'funcNote', l: 'Functional obsolescence notes', t: 'note', show: d => (d.func || []).some(x => x !== 'None') },
      { k: 'photoFunc', l: 'Functional issue', t: 'photo', cat: 'FunctionalObsolescenceExhibit', show: d => (d.func || []).some(x => x !== 'None') },
    ]},
    { id: 'supp', title: 'Supplemental notes', fields: [
      { k: 'supp', l: 'Supplemental notes (workfile only)', t: 'note' },
    ]},
  ]},
];

/* Unit-level lists built from every room so nothing is entered twice */
function unitList(ins, key) {
  const s = new Set();
  ['rooms', 'bedrooms', 'baths', 'kitchens'].forEach(l => (ins.lists[l] || []).forEach(it => (it[key] || []).forEach(v => s.add(v))));
  return [...s];
}

/* UAD commentary targets: generated summaries flow into these */
const COMMENT_TARGETS = [
  { id: 'accessDesc', title: 'Description of Property Access', fid: '4.024', lim: 300, uad: 'PropertyAccessDescription' },
  { id: 'siteFeatures', title: 'Site Features Commentary', fid: '4.066', lim: 2500, uad: 'ValuationCommentText' },
  { id: 'siteInfluence', title: 'Site Influence Commentary', fid: '4.030', lim: 2500, uad: 'ValuationCommentText' },
  { id: 'view', title: 'View Commentary', fid: '4.042', lim: 2500, uad: 'ValuationCommentText' },
  { id: 'disaster', title: 'Disaster Mitigation Commentary', fid: '5.001', lim: 5000, uad: 'ValuationCommentText' },
  { id: 'energy', title: 'Energy Efficient and Green Features Commentary', fid: '6.016', lim: 5000, uad: 'ValuationCommentText' },
  { id: 'exterior', title: 'Dwelling Exterior Commentary', fid: '8.061', lim: 5000, uad: 'StructureValuationCommentText' },
  { id: 'interior', title: 'Unit Interior Commentary', fid: '10.061', lim: 5000, uad: 'UnitValuationCommentText' },
  { id: 'adu', title: 'Unit Interior Commentary – ADU', fid: '10.061', lim: 5000, uad: 'UnitValuationCommentText' },
  { id: 'outbuilding', title: 'Outbuilding Commentary', fid: '12.025', lim: 5000, uad: 'StructureValuationCommentText' },
  { id: 'functional', title: 'Functional Obsolescence Commentary', fid: '11.001', lim: 5000, uad: 'FunctionalIssueDescription' },
  { id: 'vehicle', title: 'Vehicle Storage Commentary', fid: '13.010', lim: 5000, uad: 'ValuationCommentText' },
  { id: 'amenities', title: 'Subject Property Amenities Commentary', fid: '14.011', lim: 5000, uad: 'ValuationCommentText' },
  { id: 'assignment', title: 'Assignment Information and Scope of Work Commentary', fid: '2.061', lim: 2500, uad: 'ValuationCommentText' },
  { id: 'project', title: 'Project Commentary (condo / co-op / PUD)', fid: '18.0xx', lim: 2500, uad: 'ValuationCommentText' },
  { id: 'qc', title: 'Reconciliation of Overall Quality and Condition', fid: '15.010', lim: 5000, uad: 'ValuationCommentText' },
];
