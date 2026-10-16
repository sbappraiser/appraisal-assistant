/* =====================================================================
   Dictate (6h, Oct 2026): she speaks her notes the way she walks the property,
   e.g. "street asphalt curbs sidewalks street lights. dwelling cottage stucco
   composition shingle roof vinyl clad windows casement windows crawlspace.
   site concrete walkways ... inground pool with an attached spa ..."
   The words are matched to the app's own choices (same fields, same SFREP
   export). Nothing is filled until she has seen the list and tapped Fill in.
   Words it does not understand are shown, never guessed.
   ===================================================================== */

/* ---- words ---- */
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ORDW = { first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th' };
const tfOf = n => n < 1 ? 'tflt1' : n <= 5 ? 'tf1to5' : n <= 10 ? 'tf5to10' : 'tf10plus';
const DICT_PRE = [ // numbers, ratings, levels, counts – turned into one word each so they cannot be misread
  [/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (m, w) => String(NUMW[w])], [/\b(first|second|third|fourth|fifth)\b/g, (m, w) => ORDW[w]],
  [/\b(\d)\.5\s+bath(?:room)?s?\b/g, 'bathcount$1 halfcount1'], [/\b(\d)\s+and a half\s+bath(?:room)?s?\b/g, 'bathcount$1 halfcount1'],
  [/\b([1-9])\s+half\s+bath(?:room)?s?\b/g, 'halfcount$1'], [/\b([1-9])\s+(?:full\s+)?bath(?:room)?s\b/g, 'bathcount$1'], [/\b1\s+(?:full\s+)?bath(?:room)?\b(?=\s*(?:and|,|$|\.))/g, 'bathcount1'], [/\b([1-9])\s+bedrooms?\b/g, 'bedcount$1'],
  [/\b([qc])\.\s*(\d)/g, '$1$2'], [/\b(?:q|queue|cue|kyu|que)\s*-?\s*([1-6])\b/g, 'qrate$1'], [/\bc\s*-?\s*([1-6])\b/g, 'crate$1'],
  [/\bquality\s+(?:rating\s+)?(?:of\s+|is\s+)?([1-6])\b/g, 'quality qrate$1'], [/\bcondition\s+(?:rating\s+)?(?:of\s+|is\s+)?([1-6])\b/g, 'condition crate$1'],
  [/\b(qrate\d|quality|condition|exterior|interior|overall)\s+(?:see|sea|cee)\s*-?\s*([1-6])\b/g, '$1 crate$2'],
  [/\b(?:2|double)[ -]?(?:stor(?:y|ies)|height|volume)\s+ceilings?\b/g, 'ceilht2story'], [/\b(\d{1,2})\s*(?:foot|feet|ft)?\s+(?:high\s+|tall\s+)?ceilings?\b/g, 'ceilht$1'],
  [/\b([1-4])[ -]?stor(?:y|ies|ey)\b/g, 'stories$1'], [/\bsingle[ -]stor(?:y|ies)\b/g, 'stories1'],
  [/\b([1-9])[ -]?car\b/g, 'garcar$1'], [/\b([1-9])\s+islands?\b/g, 'islands$1'], [/\b([1-9])\s+fireplaces?\b/g, 'fpcount$1 fireplace'],
  [/\b(?:less than|under)\s+(?:a|1)\s+years?(?:\s+ago)?\b/g, 'tflt1'], [/\b1\s*(?:to|-|through)\s*5\s+years?(?:\s+ago)?\b/g, 'tf1to5'], [/\b5\s*(?:to|-|through)\s*10\s+years?(?:\s+ago)?\b/g, 'tf5to10'],
  [/\b(?:over\s+10|more than\s+10|10\s+plus|10\s+or more)\s+years?(?:\s+ago)?\b/g, 'tf10plus'], [/\b(\d{1,2})\s+years?\s+ago\b/g, (m, n) => tfOf(+n)], [/\b(?:about|around|approximately)\s+(tf\w+)/g, '$1'],
  [/\b(?:level|floor)\s+([1-9])\b/g, 'lvl$1'], [/\b([1-9])(?:st|nd|rd|th)\s+(?:floor|level|story)\b/g, 'lvl$1'], [/\b(?:upstairs|up stairs|upper level|upper floor)\b/g, 'lvl2'],
  [/\b(?:downstairs|down stairs|main level|main floor|ground floor|ground level|entry level)\b/g, 'lvl1'], [/\b(?:lower level|basement level)\b/g, 'lvlb1'],
  [/\bmaster\b/g, 'primary'], [/\b(?:en|on|in)[ -]?suite\b/g, 'ensuite'], [/\bwalk[ -]in\b/g, 'walkin'], [/\breach[ -]in\b/g, 'reachin'], [/\bjack (?:and|&) jill\b/g, 'jackandjill'],
  [/\bstainless steel\b/g, 'stainless'], [/\bsub[ -]?zero\b/g, 'subzero'], [/\bfisher (?:and |& )?paykel\b/g, 'fisherpaykel'], [/\bjenn[ -]?air\b/g, 'jennair'], [/\bkitchen[ -]?aid\b/g, 'kitchenaid'], [/\bblue[ -]?star\b/g, 'bluestar'], [/\bge cafe\b/g, 'gecafe'],
  [/\bmini[ -]split\b/g, 'mini split'], [/\bair condition(?:ing|er)\b/g, 'ac'], [/\bpowder room\b/g, 'powder room'], [/\bwine fridge\b/g, 'wine refrigerator']];
const DICT_FIX = [ // what iPad dictation tends to hear → what she said
  [/\bclyde\b/g, 'clad'], [/\bclad\s+windows?\b/g, 'clad windows'], [/\bin ground\b/g, 'inground'], [/\bin-ground\b/g, 'inground'], [/\babove ground\b/g, 'aboveground'], [/\babove-ground\b/g, 'aboveground'],
  [/\bcrawl space\b/g, 'crawlspace'], [/\bground cover\b/g, 'groundcover'], [/\bstreet lights?\b/g, 'streetlights'], [/\bstreetlight\b/g, 'streetlights'], [/\bside walks?\b/g, 'sidewalks'],
  [/\bwalk ways?\b/g, 'walkways'], [/\bdrive way\b/g, 'driveway'], [/\bhot tub\b/g, 'hottub'], [/\bjacuzzi\b/g, 'hottub'], [/\bsolar panels?\b/g, 'solar'], [/\bphotovoltaic\b/g, 'solar'], [/\bpv system\b/g, 'solar'],
  [/\bduel pane\b/g, 'dual pane'], [/\bdouble pane\b/g, 'dual pane'], [/\bcomp shingles?\b/g, 'composition shingle'], [/\bhardy ?(board|plank)?\b/g, 'cement board'], [/\bhardie ?(board|plank)?\b/g, 'cement board'],
  [/\btrex\b/g, 'composite'], [/\bbuilt[ -]in\b/g, 'builtin'], [/\bcacti\b/g, 'cactus'], [/\bsalt water\b/g, 'saltwater'], [/\bautomatic cover\b/g, 'autocover'], [/\bauto cover\b/g, 'autocover']];
const DICT_FILLER = new Set('quality condition overall detector detectors appliance appliances ceiling ceilings floor floors flooring counters counter countertop countertops cabinets cabinet combo a an the and with has have had of in on at to for is are was were it its this that there some lots lot of various abundance plenty several many few all also plus very nice typical including include includes amenity amenities area areas featuring features feature has having be been by from into around side yard rear front left right back'.split(' '));
const stemW = w => { w = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'; if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2); if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1); return w; };
const dictTokens = text => { let t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[–—]/g, ' ') + ' '; DICT_PRE.forEach(([r, s]) => t = t.replace(r, s)); DICT_FIX.forEach(([r, s]) => t = t.replace(r, s));
  const out = []; t.split(/(\s+|[.,;:!?()]+)/).forEach(p => { if (!p || /^\s+$/.test(p)) return; if (/^[.,;:!?()]+$/.test(p)) { if (/[.;!?]/.test(p)) out.push({ br: true }); else if (out.length) out[out.length - 1].cm = true; return; } p.split('/').forEach(w => { const st = stemW(w); if (st) out.push({ w, s: st }); }); }); return out; };
const phraseOf = s => dictTokens(s).filter(t => !t.br).map(t => t.s);

/* ---- where she is (section words) ---- */
const DICT_CTX = [ // spoken word → tabs to try first
  ['street', ['street']], ['road', ['street']], ['driveway', ['driveway']],
  ['dwelling', ['front']], ['house', ['front']], ['home', ['front']], ['residence', ['front']], ['structure', ['front']], ['exterior', ['front']], ['roof', ['front']],
  ['garage', ['garage']], ['site', ['site', 'amenities']], ['lot', ['site', 'amenities']], ['yard', ['amenities', 'site']], ['backyard', ['amenities', 'site']], ['grounds', ['amenities', 'site']],
  ['landscaping', ['amenities', 'site']], ['landscape', ['amenities', 'site']], ['outdoor', ['amenities']], ['pool', ['amenities']],
  ['interior', ['interior']], ['inside', ['interior']], ['systems', ['systems']], ['mechanical', ['systems']], ['energy', ['systems']],
  ['view', ['site'], ['site.view']], ['views', ['site'], ['site.view']], ['topography', ['site'], ['site.topo']], ['topo', ['site'], ['site.topo']],
  ['heating', ['systems'], ['systems.heat']], ['cooling', ['systems'], ['systems.cool']], ['hvac', ['systems']], ['water heater', ['systems'], ['systems.wh']], ['carport', ['garage'], ['garage.carport']]];

/* ---- cue words: say which field a material belongs to ---- */
const DICT_CUE = [
  ['walkway', 'amenities.walks'], ['walk', 'amenities.walks'], ['pathway', 'amenities.walks'], ['path', 'amenities.walks'],
  ['fence', 'amenities.fenceMat'], ['fencing', 'amenities.fenceMat'], ['window', 'front.windows'], ['roof', 'front.roofMat'], ['roofing', 'front.roofMat'], ['shingle', 'front.roofMat'], ['tile roof', 'front.roofMat'],
  ['siding', 'front.walls'], ['exterior wall', 'front.walls'], ['wall', 'front.walls'], ['foundation', 'front.foundType front.foundMat'], ['driveway', 'driveway.driveMat'], ['street', 'street.streetSurface'],
  ['gutter', 'front.gutterMat'], ['downspout', 'front.gutterMat'], ['door', 'front.frontDoor'], ['front door', 'front.frontDoor'], ['entry door', 'front.frontDoor'],
  ['view', 'site.view site.viewRange site.viewImpact'], ['topography', 'site.topo site.topoMore'], ['style', 'front.design'], ['design', 'front.design'], ['architecture', 'front.design'],
  ['heat', 'systems.heat'], ['heating', 'systems.heat systems.heatFuel'], ['furnace', 'systems.heat systems.heatFuel'], ['cooling', 'systems.cool'], ['water heater', 'systems.wh systems.whStrap'], ['garage', 'garage.garAttach garage.garFinish garage.garFeat'],
  ['interior door', 'interior.intDoors'], ['exterior door', 'interior.extDoors'], ['window covering', 'interior.winCover'],
  ['floor', 'L:*.flooring'], ['flooring', 'L:*.flooring'], ['ceiling', 'L:*.ceilS'], ['counter', 'L:*.counter'], ['countertop', 'L:*.counter'], ['cabinet', 'L:*.cab L:*.vanMat'], ['cabinetry', 'L:*.cab L:*.vanMat'],
  ['vanity', 'L:*.vanMat L:*.vanity'], ['shower', 'L:*.showerMat'], ['tub', 'L:*.tubShowerMat L:*.tubFreeMat'], ['surround', 'L:*.tubShowerMat'], ['closet', 'L:*.closet'], ['fixture', 'L:*.finish'], ['faucet', 'L:*.finish'], ['hardware', 'L:*.finish']];

/* ---- extra ways of saying a choice ---- */
const DICT_SYN = [
  ['streetlights', 'street.streetFeat', 'Street Lights'], ['curb', 'street.streetFeat', 'Curbs'], ['sidewalk', 'street.streetFeat', 'Sidewalks'], ['storm drain', 'street.streetFeat', 'Storm Drains'], ['no sidewalk', 'street.streetFeat', 'No Sidewalks'],
  ['blacktop', 'street.streetSurface', 'Asphalt'], ['paved', 'street.streetSurface', 'Asphalt'],
  ['vinyl clad', 'front.windows', 'Vinyl'], ['wood clad', 'front.windows', 'Clad Wood'], ['aluminum clad', 'front.windows', 'Clad Wood'], ['dual pane', 'front.windows', 'Dual Pane'], ['single pane', 'front.windows', 'Single Pane'], ['double hung', 'front.windows', 'Double Hung'], ['slider', 'front.windows', 'Sliding'], ['divided light', 'front.windows', 'Divided Lite'],
  ['composition shingle', 'front.roofMat', 'Composition'], ['composition', 'front.roofMat', 'Composition'], ['asphalt shingle', 'front.roofMat', 'Asphalt'], ['spanish tile', 'front.roofMat', 'Clay'], ['clay tile', 'front.roofMat', 'Clay'], ['concrete tile', 'front.roofMat', 'Concrete'], ['standing seam', 'front.roofMat', 'Metal'], ['wood shake', 'front.roofMat', 'Wood'], ['shake', 'front.roofMat', 'Wood'], ['tar and gravel', 'front.roofMat', 'TarAndGravel'], ['built up', 'front.roofMat', 'TarAndGravel'],
  ['stucco', 'front.walls', 'Stucco'], ['stucco wall', 'front.walls', 'Stucco'], ['stucco exterior', 'front.walls', 'Stucco'], ['plaster', 'front.walls', 'Stucco'], ['cement board', 'front.walls', 'CementBoard'], ['board and batten', 'front.walls', 'Wood'], ['lap siding', 'front.walls', 'Wood'], ['wood siding', 'front.walls', 'Wood'], ['shingle siding', 'front.walls', 'Wood'], ['stone veneer', 'front.walls', 'SyntheticStone'],
  ['crawlspace', 'front.foundType', 'CrawlSpace'], ['raised foundation', 'front.foundType', 'ConcretePerimeter'], ['concrete perimeter', 'front.foundType', 'ConcretePerimeter'], ['raised floor', 'front.foundType', 'ConcretePerimeter'], ['slab', 'front.foundType', 'Slab'], ['post and pier', 'front.foundType', 'PostAndPier'], ['basement', 'front.foundType', 'Basement'],
  ['flagstone', 'amenities.walks', 'Flagstone'], ['dg', 'amenities.walks', 'Decomposed Granite'],
  ['irrigation', 'amenities.landSys', 'Automatic Irrigation'], ['sprinkler', 'amenities.landSys', 'Automatic Irrigation'], ['drip', 'amenities.landSys', 'Drip Irrigation'], ['drainage', 'amenities.landSys', 'Drainage System'], ['site drainage', 'amenities.landSys', 'Drainage System'], ['french drain', 'amenities.landSys', 'Subsurface Drains'], ['landscape lighting', 'amenities.landSys', 'Landscape Lighting'], ['landscape light', 'amenities.landSys', 'Landscape Lighting'], ['garden lighting', 'amenities.landSys', 'Landscape Lighting'],
  ['retaining wall', 'amenities.hardscape', 'Retaining Walls'], ['terrace', 'amenities.hardscape', 'Terraces'], ['terracing', 'amenities.hardscape', 'Terraces'], ['garden wall', 'amenities.hardscape', 'Garden Walls'], ['stone step', 'amenities.hardscape', 'Stone Steps'], ['perimeter wall', 'amenities.hardscape', 'Perimeter Walls'],
  ['tree', 'amenities.landFeat', 'Established Trees'], ['palm', 'amenities.landFeat', 'Established Trees'], ['oak', 'amenities.landFeat', 'Established Trees'], ['shrub', 'amenities.landFeat', 'Shrubs'], ['bush', 'amenities.landFeat', 'Bushes'], ['hedge', 'amenities.landFeat', 'Hedges'], ['groundcover', 'amenities.landFeat', 'Ground Cover'],
  ['succulent', 'amenities.landFeat', 'Succulents'], ['cactus', 'amenities.landFeat', 'Succulents'], ['lawn', 'amenities.landFeat', 'Lawn'], ['grass', 'amenities.landFeat', 'Lawn'], ['artificial turf', 'amenities.landFeat', 'Artificial Turf'], ['synthetic turf', 'amenities.landFeat', 'Artificial Turf'], ['fruit tree', 'amenities.landFeat', 'Fruit Trees'], ['citrus', 'amenities.landFeat', 'Citrus Trees'], ['avocado', 'amenities.landFeat', 'Avocado Trees'], ['flower', 'amenities.landFeat', 'Flower Beds'], ['rose', 'amenities.landFeat', 'Rose Garden'], ['native plant', 'amenities.landFeat', 'Native Plants'], ['vegetable garden', 'amenities.landFeat', 'Vegetable Garden'], ['raised bed', 'amenities.landFeat', 'Raised Beds'],
  ['fire pit', 'amenities.outdoor', 'Fire Pit'], ['firepit', 'amenities.outdoor', 'Fire Pit'], ['bbq', 'amenities.outdoor', 'Built-in BBQ Area'], ['builtin bbq', 'amenities.outdoor', 'Built-in BBQ Area'], ['builtin barbecue', 'amenities.outdoor', 'Built-in BBQ Area'], ['barbecue', 'amenities.outdoor', 'Built-in BBQ Area'], ['outdoor kitchen', 'amenities.outdoor', 'Outdoor Kitchen'], ['pergola', 'amenities.outdoor', 'Pergola'], ['trellis', 'amenities.outdoor', 'Trellis'], ['gazebo', 'amenities.outdoor', 'Gazebo'],
  ['solar', 'systems.renew', 'Solar'],
  // view, topography
  ['neutral', 'site.viewImpact', 'Neutral', 'site.view'], ['beneficial', 'site.viewImpact', 'Beneficial', 'site.view'], ['adverse', 'site.viewImpact', 'Adverse', 'site.view'],
  ['level lot', 'site.topo', 'Flat'], ['flat lot', 'site.topo', 'Flat'], ['level', 'site.topo', 'Flat', 'site.topo'], ['slope', 'site.topo', 'Sloping'], ['sloped', 'site.topo', 'Sloping'], ['hillside', 'site.topoMore', 'Hillside'],
  ['neighborhood', 'site.view', 'Residential', 'site.view'], ['garden', 'site.view', 'Garden Setting', 'site.view'], ['hill', 'site.view', 'Mountain', 'site.view'], ['foothill', 'site.viewMore', 'Foothills'], ['ocean', 'site.view', 'Ocean'], ['mountain', 'site.view', 'Mountain'], ['island', 'site.viewMore', 'Island', 'site.view'],
  // systems
  ['forced air', 'systems.heat', 'Forced Warm Air'], ['fau', 'systems.heat', 'Forced Warm Air'], ['furnace', 'systems.heat', 'Forced Warm Air'], ['wall heater', 'systems.heat', 'Other'], ['radiant floor', 'systems.heat', 'Radiant'], ['radiant heat', 'systems.heat', 'Radiant'],
  ['gas', 'systems.heatFuel', 'Natural Gas', 'systems.heat'], ['central ac', 'systems.cool', 'Central Air'], ['central air', 'systems.cool', 'Central Air'], ['ac', 'systems.cool', 'Central Air'], ['no ac', 'systems.cool', 'None'], ['window unit', 'systems.cool', 'Individual Units'],
  ['tankless', 'systems.wh', 'Tankless – Gas'], ['gas water heater', 'systems.wh', 'Tank – Gas'], ['tank water heater', 'systems.wh', 'Tank – Gas'], ['strapped', 'systems.whStrap', 'Double Strapped'],
  ['ev charger', 'systems.eff', 'EV Charging'], ['ev charging', 'systems.eff', 'EV Charging'], ['powerwall', 'systems.eff', 'Backup Battery System'], ['battery', 'systems.eff', 'Backup Battery System'], ['smart thermostat', 'systems.smart', 'Smart Thermostats'], ['alarm', 'systems.security', 'Security System'], ['cameras', 'systems.security', 'Security Cameras'],
  // interior, whole house
  ['recessed lighting', 'interior.intFeat', 'Recessed LED Lighting'], ['recessed light', 'interior.intFeat', 'Recessed LED Lighting'], ['can light', 'interior.intFeat', 'Recessed LED Lighting'], ['skylight', 'interior.intFeat', 'Skylights'], ['crown molding', 'interior.intFeat', 'Crown Molding'], ['crown moulding', 'interior.intFeat', 'Crown Molding'],
  ['smoke detector', 'interior.smoke', true], ['carbon monoxide', 'interior.co', true], ['carbon monoxide detector', 'interior.co', true], ['co detector', 'interior.co', true], ['shutter', 'interior.winCover', 'Plantation Shutters'],
  ['gas fireplace', 'interior.fpType', 'Gas'], ['wood burning', 'interior.fpType', 'Wood Burning'], ['wood stove', 'interior.fpType', 'Wood Stove'],
  // garage
  ['opener', 'garage.garFeat', 'Automatic Door Opener'], ['garage door opener', 'garage.garFeat', 'Automatic Door Opener'], ['epoxy', 'garage.garFeat', 'Epoxy Floor'], ['drywalled', 'garage.garFinish', 'Finished'], ['finished garage', 'garage.garFinish', 'Finished'],
  // rooms (L:* = the room she is in)
  ['granite', 'L:*.counter', 'Stone Slab'], ['quartz', 'L:*.counter', 'Stone Slab'], ['quartzite', 'L:*.counter', 'Stone Slab'], ['marble', 'L:*.counter', 'Stone Slab'], ['marble', 'L:*.flooring', 'Stone Tile'], ['soapstone', 'L:*.counter', 'Stone Slab'], ['cultured marble', 'L:*.counter', { note: 'Cultured marble counters' }], ['cultured marble counter', 'L:*.counter', { note: 'Cultured marble counters' }], ['tile counter', 'L:*.counter', 'Tile'], ['stone counter', 'L:*.counter', 'Stone Slab'],
  ['travertine', 'L:*.flooring', 'Stone Tile'], ['limestone', 'L:*.flooring', 'Stone Tile'], ['porcelain', 'L:*.flooring', 'Tile'], ['ceramic', 'L:*.flooring', 'Tile'], ['saltillo', 'L:*.flooring', 'Tile'], ['carpeting', 'L:*.flooring', 'Carpet'], ['wood floor', 'L:*.flooring', 'Hardwood'],
  ['luxury vinyl', 'L:*.flooring', 'LVP'], ['vinyl plank', 'L:*.flooring', 'LVP'], ['lvp', 'L:*.flooring', 'LVP'], ['engineered', 'L:*.flooring', 'EngineeredWood'], ['engineered hardwood', 'L:*.flooring', 'EngineeredWood'], ['polished concrete', 'L:*.flooring', 'FinishedConcrete'],
  ['vaulted', 'L:*.ceilS', 'Vaulted'], ['beamed', 'L:*.ceilS', 'Beams'], ['exposed beam', 'L:*.ceilS', 'Beams'],
  ['remodeled', 'L:*.upd', 'FullyUpdated'], ['updated', 'L:*.upd', 'FullyUpdated'], ['partially remodeled', 'L:*.upd', 'PartiallyUpdated'], ['original', 'L:*.upd', 'NotUpdated'], ['dated', 'L:*.upd', 'NotUpdated'],
  ['tflt1', 'L:*.time', 'LessThanOneYear'], ['tf1to5', 'L:*.time', 'OneToFiveYears'], ['tf5to10', 'L:*.time', 'FiveToTenYears'], ['tf10plus', 'L:*.time', 'TenOrMoreYears'],
  ['like new', 'L:*.condStat', 'NewOrLikeNew'], ['wear and tear', 'L:*.condStat', 'TypicalWearAndTear'], ['typical wear', 'L:*.condStat', 'TypicalWearAndTear'],
  ['shaker', 'L:*.cab', 'Shaker'], ['custom cabinet', 'L:*.cab', 'Custom Built'], ['painted', 'L:*.cab', 'Painted Wood'],
  ['chrome', 'L:*.finish', 'Polished Chrome'], ['black', 'L:*.finish', 'Matte Black'], ['bronze', 'L:*.finish', 'Oil-rubbed Bronze'], ['nickel', 'L:*.finish', 'Brushed Nickel'],
  ['walkin closet', 'L:bedrooms.closet', 'Walk-in'], ['reachin closet', 'L:bedrooms.closet', 'Reach-in'], ['walkin', 'L:bedrooms.closet', 'Walk-in'], ['ensuite', 'L:bedrooms.ensuite', true], ['smoke detector', 'L:bedrooms.smoke', true], ['ceiling fan', 'L:bedrooms.feat', 'Ceiling Fan'],
  ['freestanding tub', 'L:baths.tubFree', true], ['soaking tub', 'L:baths.tubFree', true], ['tub shower', 'L:baths.tubShower', true], ['shower over tub', 'L:baths.tubShower', true], ['tub and shower', 'L:baths.tubShower', true], ['tub shower combo', 'L:baths.tubShower', true], ['tub shower combination', 'L:baths.tubShower', true],
  ['separate shower', 'L:baths.shower', true], ['stall shower', 'L:baths.shower', true], ['walkin shower', 'L:baths.shower', true], ['frameless', 'L:baths.feat', 'Frameless Glass'], ['rain shower', 'L:baths.feat', 'Rain Shower Head'], ['heated floor', 'L:baths.feat', 'Heated Floors'],
  ['double sink', 'L:baths.vanity', 'Dual Sinks'], ['dual sink', 'L:baths.vanity', 'Dual Sinks'], ['double vanity', 'L:baths.vanity', 'Dual Sinks'], ['dual vanity', 'L:baths.vanity', 'Dual Sinks'],
  ['island', 'L:kitchens.islands', 1], ['bar seating', 'L:kitchens.islandSeat', true], ['seating', 'L:kitchens.islandSeat', true], ['pantry', 'L:kitchens.amen', 'Pantry'], ['breakfast bar', 'L:kitchens.amen', 'Breakfast Bar']];

/* ---- rooms: starting words ---- */
const ROOM_START = [ // [what she says, list, details, only when she is inside]
  ['kitchen', 'kitchens', {}], ['kitchenette', 'kitchens', { style: 'Kitchenette' }], ['2nd kitchen', 'kitchens', { style: 'Second Kitchen' }], ['catering kitchen', 'kitchens', { style: 'Catering / Prep Kitchen' }], ['prep kitchen', 'kitchens', { style: 'Catering / Prep Kitchen' }],
  ['wet bar', 'wetbars', {}],
  ['bedroom', 'bedrooms', {}], ['primary bedroom', 'bedrooms', { label: 'Bedroom 1' }], ['primary suite', 'bedrooms', { label: 'Bedroom 1' }], ['guest bedroom', 'bedrooms', { label: 'Guest Bedroom' }], ['guest room', 'bedrooms', { label: 'Guest Bedroom' }],
  ['bath', 'baths', { kind: 'FullBathroom' }], ['bathroom', 'baths', { kind: 'FullBathroom' }], ['full bath', 'baths', { kind: 'FullBathroom' }], ['full bathroom', 'baths', { kind: 'FullBathroom' }], ['3 quarter bath', 'baths', { kind: 'FullBathroom' }],
  ['half bath', 'baths', { kind: 'HalfBathroom' }], ['half bathroom', 'baths', { kind: 'HalfBathroom' }], ['powder room', 'baths', { kind: 'HalfBathroom', label: 'Powder Room' }], ['powder', 'baths', { kind: 'HalfBathroom', label: 'Powder Room' }],
  ['primary bath', 'baths', { kind: 'FullBathroom', label: 'Bath 1' }], ['primary bathroom', 'baths', { kind: 'FullBathroom', label: 'Bath 1' }], ['hall bath', 'baths', { kind: 'FullBathroom', label: 'Hall Bath' }], ['hallway bath', 'baths', { kind: 'FullBathroom', label: 'Hall Bath' }],
  ['guest bath', 'baths', { kind: 'FullBathroom', label: 'Guest Bath' }], ['jackandjill bath', 'baths', { kind: 'FullBathroom', label: 'Jack and Jill Bath' }],
  ['sitting room', 'rooms', { type: 'Sitting Room / Area' }], ['sitting area', 'rooms', { type: 'Sitting Room / Area' }], ['music room', 'rooms', { type: 'Music Room / Studio' }], ['glam room', 'rooms', { type: 'Stylist / Glam Room' }],
  ['laundry room', 'rooms', { type: 'Laundry Room' }], ['laundry', 'rooms', { type: 'Laundry Room' }, true], ['breakfast nook', 'rooms', { type: 'Nook' }], ['home office', 'rooms', { type: 'Office' }],
  ...ROOM_TYPES.filter(t => !/\/|^(Other|Hall|Storage|Mechanical)$/.test(t)).map(t => [t, 'rooms', { type: t }, !/\s/.test(t)])];
const ROOM_FILL = ['rooms', 'bedrooms', 'baths', 'kitchens', 'wetbars'];
const ROOM_TITLE = { rooms: 'Room', bedrooms: 'Bedroom', baths: 'Bath', kitchens: 'Kitchen', wetbars: 'Wet bar' };
const APPL_SYN = [['fridge', 'refFrz'], ['refrigerator', 'refFrz'], ['refrigerator freezer', 'refFrz'], ['column refrigerator', 'ref'], ['column freezer', 'frz'], ['stove', 'range'], ['gas range', 'range'], ['oven', 'wallOven'], ['double oven', 'wallOven', 2], ['double wall oven', 'wallOven', 2],
  ['range hood', 'hood'], ['vent hood', 'hood'], ['wine refrigerator', 'wine'], ['wine cooler', 'wine'], ['beverage refrigerator', 'bev'], ['espresso machine', 'coffee'], ['coffee maker', 'coffee'], ['garbage disposal', 'disposal'], ['instant hot', 'waterHot']];
const BRAND_SYN = [['subzero', 'Sub-Zero'], ['fisherpaykel', 'Fisher & Paykel'], ['jennair', 'JennAir'], ['kitchenaid', 'KitchenAid'], ['bluestar', 'BlueStar'], ['gecafe', 'GE Café'], ['monogram', 'GE Monogram']];


/* ---- things that are a list entry (deck, pool, spa …) ---- */
const DICT_ITEMS = [
  ['roof deck', 'outdoorLiving', 'Roof Deck'], ['deck', 'outdoorLiving', 'Deck'], ['decking', 'outdoorLiving', 'Deck'], ['patio', 'outdoorLiving', 'Patio'], ['porch', 'outdoorLiving', 'Porch'], ['balcony', 'outdoorLiving', 'Balcony'], ['veranda', 'outdoorLiving', 'Veranda'], ['portico', 'outdoorLiving', 'Portico'], ['loggia', 'outdoorLiving', 'Loggia'], ['courtyard', 'outdoorLiving', 'Courtyard'],
  ['pool', 'waterFeatures', 'pool'], ['swimming pool', 'waterFeatures', 'pool'], ['spa', 'waterFeatures', 'spa'], ['hottub', 'waterFeatures', 'Above-ground Spa / Hot Tub'], ['fountain', 'waterFeatures', 'Fountain'], ['koi pond', 'waterFeatures', 'Koi Pond'], ['pond', 'waterFeatures', 'Pond'], ['waterfall', 'waterFeatures', 'Waterfall'], ['outdoor shower', 'waterFeatures', 'OutdoorShower'], ['sauna', 'waterFeatures', 'Sauna'], ['cold plunge', 'waterFeatures', 'Cold Plunge']];
const ITEM_MAT = [['wood', 'Wood'], ['wooden', 'Wood'], ['composite', 'Composite'], ['concrete', 'Concrete'], ['stamped concrete', 'Concrete'], ['paver', 'Pavers'], ['brick', 'Brick'], ['flagstone', 'NaturalStone'], ['stone', 'NaturalStone'], ['slate', 'NaturalStone'], ['vinyl', 'Vinyl'], ['metal', 'Metal'], ['fiberglass', 'Fiberglass']];
const POOL_FEAT = [['heated', 'Heated'], ['solar heated', 'Solar Heated'], ['saltwater', 'Salt Water'], ['autocover', 'Automatic Cover'], ['safety fence', 'Safety Fence'], ['spillover', 'Spa Spillover'], ['slide', 'Water Slide'], ['diving board', 'Diving Board'], ['baja shelf', 'Baja Shelf']];
const POOL_MAT = [['gunite', 'Gunite / Plaster'], ['plaster', 'Gunite / Plaster'], ['pebble', 'Pebble Finish'], ['pebble tec', 'Pebble Finish'], ['tile', 'Tile'], ['fiberglass', 'Fiberglass'], ['vinyl', 'Vinyl Liner']];
const OL_FEAT = [['covered', 'Covered'], ['partially covered', 'Partially Covered'], ['screened', 'Screened'], ['enclosed', 'Enclosed'], ['heated', 'Heated'], ['ceiling fan', 'Ceiling Fans'], ['lighting', 'Lighting'], ['builtin seating', 'Built-in Seating'], ['awning', 'Retractable Awning']];

/* ---- index of the app's own choices ---- */
let DICT_IX = null;
const DICT_TABS = ['street', 'driveway', 'front', 'garage', 'exterior', 'site', 'amenities', 'interior', 'systems'];   // tabs dictation can fill
const SKIP_FIELD = f => !['one', 'multi'].includes(f.t) || ['access', 'unitPos', 'apnDesc', 'zoneComp', 'primaryAccess'].includes(f.k) || /cond$|impact|^eq$|^ec$|^iq$|^ic$|^oq$|^oc$/i.test(f.k) || /condition|impact|rating|quality/i.test(f.l || '');
const ROOM_SKIP = new Set(['level', 'kind', 'type', 'style', 'label']);
function dictIndex() {
  if (DICT_IX) return DICT_IX;
  const vals = []; // {ph:[stems], key:'sec.k' | 'L:list.k', v, syn, pref}
  const add = (ph, key, v, syn, pref) => { const p = phraseOf(ph); if (!p.length) return; vals.push({ ph: p, key, v, syn, pref }); if (p.length > 1) vals.push({ ph: [p.join('')], key, v, syn, pref }); };
  const fromOpts = (o, key) => o.forEach(([v, l]) => { if (/^(other|none|yes|no|unknown)$/i.test(v) || /^other/i.test(l)) return; String(l).replace(/\(.*?\)/g, '').split(/\/| – /).forEach(part => add(part.trim(), key, v)); if (/^[A-Z][a-z]+[A-Z]/.test(v)) add(v.replace(/([a-z])([A-Z])/g, '$1 $2'), key, v); });
  SECTIONS.filter(sec => DICT_TABS.includes(sec.id)).forEach(sec => sec.groups.forEach(g => g.fields.forEach(f => { if (SKIP_FIELD(f)) return; let o; try { o = optsOf(f, {}, null); } catch (e) { o = []; } fromOpts(o, sec.id + '.' + f.k); })));
  ROOM_FILL.forEach(L => LISTS[L].fields.forEach(f => { if (ROOM_SKIP.has(f.k) || !['one', 'multi'].includes(f.t)) return; let o; try { o = optsOf(f, {}, null); } catch (e) { o = []; } fromOpts(o, 'L:' + L + '.' + f.k); }));
  DICT_SYN.forEach(([ph, key, v, pref]) => { if (key.startsWith('L:*.')) { const k = key.slice(4); ROOM_FILL.forEach(L => { if (LISTS[L].fields.some(f => f.k === k)) add(ph, 'L:' + L + '.' + k, v, true, pref); }); } else add(ph, key, v, true, pref); });
  const itemWords = new Set(DICT_ITEMS.flatMap(x => phraseOf(x[0])).filter(w => w.length > 2)); ['roof', 'outdoor', 'swimming'].forEach(w => itemWords.delete(w));
  for (let i = vals.length - 1; i >= 0; i--) { const v = vals[i]; if (v.key.startsWith('L:') && !v.syn && v.ph.length === 1 && itemWords.has(v.ph[0])) continue;   // "balcony" can be a bedroom feature
    if (!v.key.startsWith('L:') && (v.ph.length > 1 && v.ph.some(w => itemWords.has(w)) || v.ph.length === 1 && itemWords.has(v.ph[0]))) vals.splice(i, 1); }
  const mk = list => list.map(([ph, a, b, c]) => ({ ph: phraseOf(ph), a, b, c }));
  const appl = []; APPLIANCES.forEach(a => String(a.l).replace(/\(.*?\)/g, '').split('/').forEach(p => { const ph = phraseOf(p.trim()); if (ph.length) appl.push({ ph, k: a.k }); })); APPL_SYN.forEach(([w, k, q]) => appl.push({ ph: phraseOf(w), k, q }));
  const brands = BRANDS.filter(b => b !== 'Other').map(b => ({ ph: phraseOf(b), b })).concat(BRAND_SYN.map(([w, b]) => ({ ph: phraseOf(w), b })));
  DICT_IX = { vals, ctx: mk(DICT_CTX).map(c => ({ ...c, pref: c.b || [] })), cue: mk(DICT_CUE).map(c => ({ ...c, keys: c.a.split(' ') })), items: mk(DICT_ITEMS), rooms: mk(ROOM_START), appl, brands };
  return DICT_IX;
}
const dkField = key => { if (key.startsWith('L:')) { const [L, k] = key.slice(2).split('.'); const f = (LISTS[L] || { fields: [] }).fields.find(x => x.k === k); return f ? { list: L, f } : null; }
  const [s, k] = key.split('.'); const sec = SECTIONS.find(x => x.id === s); for (const g of (sec ? sec.groups : [])) for (const f of g.fields) if (f.k === k) return { sec, g, f }; return null; };
const dkLabel = (key, v) => { if (typeof v === 'boolean') return v ? 'Yes' : 'No'; if (typeof v === 'number') return String(v); const F = dkField(key); if (!F) return v; let o = []; try { o = optsOf(F.f, {}, null); } catch (e) {} const x = o.find(p => p[0] === v); return x ? x[1] : v; };
const LVL_CODE = { '1': 'LevelOne', '2': 'LevelTwo', '3': 'LevelThree', '4': 'LevelFour', b1: 'BelowGradeOne' };
const CEIL_CODE = n => n === '2story' ? 'TwoOrMoreStories' : +n < 7 ? 'LessThanSevenFeet' : +n === 7 ? 'SevenFeet' : +n === 8 ? 'EightFeet' : +n === 9 ? 'NineFeet' : 'TenFeetAndAbove';
const roomName = r => r.label || (r.list === 'rooms' ? r.type : r.list === 'kitchens' ? (r.style || 'Kitchen') : r.list === 'baths' ? (r.kind === 'HalfBathroom' ? 'Half bath' : 'Bath') : ROOM_TITLE[r.list]);

/* ---- read what she said ---- */
function dictParse(text, ins) {
  const IX = dictIndex(); const T = dictTokens(text); const n = T.length;
  const at = (i, ph) => { for (let j = 0; j < ph.length; j++) { const t = T[i + j]; if (!t || t.br || t.s !== ph[j]) return false; } return true; };
  const longest = (i, list) => { let best = null; list.forEach(e => { if ((!best || e.ph.length > best.ph.length) && at(i, e.ph)) best = e; }); return best; };
  const SPECIAL = /^(qrate|crate)[1-6]$|^ceilht(\d+|2story)$|^stories[1-4]$|^garcar[1-9]$|^islands[1-9]$|^fpcount[1-9]$|^bedcount[1-9]$|^bathcount[1-9]$|^halfcount[1-9]$|^lvl(\d|b1)$|^fireplace$/;
  // pass 1: longest match wins; on a tie: room > item > area > cue > value
  const marks = []; let tabs = [], pref = [], inside = false;
  for (let i = 0; i < n; i++) { const t = T[i]; if (t.br) continue;
    if (SPECIAL.test(t.s)) { marks.push({ i, len: 1, kind: 'sp', s: t.s, tabs: [...tabs] }); continue; }
    const r = longest(i, IX.rooms.filter(x => !x.c || inside)), it = longest(i, IX.items), c = longest(i, IX.ctx), q = longest(i, IX.cue), ap = longest(i, IX.appl), br = longest(i, IX.brands);
    const vv = IX.vals.filter(e => at(i, e.ph)); const vlen = vv.reduce((m, e) => Math.max(m, e.ph.length), 0); const vals = vv.filter(e => e.ph.length === vlen);
    const len = x => x ? x.ph.length : 0; const L = Math.max(len(r), len(it), len(c), len(q), len(ap), len(br), vlen); if (!L) continue;
    let m;
    if (len(r) === L) { m = { kind: 'room', list: r.a, props: r.b }; inside = true; tabs = ['interior']; pref = []; const nx = T[i + L]; if (nx && /^\d$/.test(nx.s)) { m.num = nx.s; marks.push({ i, len: L + 1, ...m, tabs: [...tabs] }); i += L; continue; } }
    else if (len(it) === L) m = { kind: 'item', list: it.a, type: it.b, val: vals.find(v => v.key.startsWith('L:')) ? vals : null };
    else if (len(c) === L) { tabs = c.a; pref = c.pref; inside = c.a.includes('interior') || (inside && c.a.every(x => x === 'systems')); m = { kind: 'ctx', cue: len(q) === L ? q.keys : null, tabs: c.a }; }
    else if (len(q) === L) m = { kind: 'cue', keys: q.keys };
    else if (len(ap) === L) m = { kind: 'appl', k: ap.k, q: ap.q };
    else if (len(br) === L) m = { kind: 'brand', b: br.b };
    else { const syn = vals.filter(v => v.syn); m = { kind: 'val', vals: syn.length && new Set(syn.map(v => v.key)).size === 1 ? syn : vals }; }
    marks.push({ i, len: L, ...m, tabs: [...tabs], pref: [...pref] }); i += L - 1; }

  const cueMatch = (k, x) => k === x || (k.startsWith('L:*.') && x.startsWith('L:') && x.endsWith('.' + k.slice(4)));
  const cueNear = (m, keys) => { const idx = marks.indexOf(m); let best = null, bd = 99;
    for (let d = 1; d <= 3; d++) [idx + d, idx - d].forEach(j => { const o = marks[j]; if (!o) return; const k = o.kind === 'cue' ? o.keys : o.kind === 'ctx' && o.cue ? o.cue : null; if (!k) return;
      if (j < idx && T.slice(o.i, m.i).some(t => t.br)) return;   // a cue before a full stop belongs to the sentence before
      const hit = keys.find(x => k.some(y => cueMatch(y, x))); if (hit && d < bd) { best = hit; bd = d; } }); return best; };
  const sameSentence = (a, b) => !T.slice(Math.min(a, b), Math.max(a, b)).some(t => t.br || t.cm);
  const rooms = []; let room = null, ctxLevel = null, fpMentions = 0, roomBreak = false;
  const changes = new Map(); const items = []; const unclear = [];
  const DK = { dkBeds: 'Bedrooms in the house', dkBaths: 'Full baths in the house', dkHalf: 'Half baths in the house' };
  const put = (key, v, ri) => { const pk = key.split('.')[1]; const F = DK[pk] ? { sec: SECTIONS.find(x => x.id === 'interior'), f: { k: pk, t: 'count', l: DK[pk] } } : dkField(key); if (!F) return; const id = (ri !== undefined ? 'R' + ri + ':' : '') + key; const c = changes.get(id) || { key, room: ri, sec: F.sec, list: F.list, f: F.f, vals: [] };
    if (typeof v === 'number' || typeof v === 'boolean') c.vals = [v]; else if (!c.vals.includes(v)) c.vals.push(v); changes.set(id, c); };
  const roomKey = r => r.list + '|' + (r.label || r.type || r.style || (r.num ? '#' + r.num : '')) + (r.list === 'baths' && !r.label && !r.num ? '|' + r.kind + '|' + rooms.length : '') + (r.list === 'bedrooms' && !r.label && !r.num ? '|' + rooms.length : '');
  const startRoom = m => { const r = { list: m.list, ...m.props, at: m.i }; if (m.num) { r.num = m.num; r.label = (m.list === 'bedrooms' ? 'Bedroom ' : m.list === 'baths' ? (r.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') : '') + m.num; }
    if (m.list === 'kitchens' && !r.style) r.label = r.label || null;
    const key = roomKey(r); let idx = rooms.findIndex(x => x.key === key);
    if (idx < 0) { r.key = key; if (ctxLevel) r.level = ctxLevel; rooms.push(r); idx = rooms.length - 1; }
    room = idx; roomBreak = false; return idx; };
  const ITEM_WORDS = new Set([...ITEM_MAT, ...POOL_MAT, ...POOL_FEAT, ...OL_FEAT, ['attached'], ['cover']].map(x => phraseOf(x[0]).join(' ')));
  const nearestItem = j => { let best = null, bd = 99; marks.forEach(o => { if (o.kind !== 'item' || o.asVal) return; const d = j < o.i ? o.i - j : j - (o.i + o.len - 1); if (d <= 6 && d < bd && sameSentence(j, o.i)) { best = o; bd = d; } }); return best; };
  const resolve = (m, keys) => {   // which field a word belongs to
    if (room !== null) { const L = rooms[room].list; const rk = keys.filter(k => k.startsWith('L:' + L + '.'));
      if (rk.length) return rk.length === 1 ? rk[0] : (cueNear(m, rk) || 'unclear'); }
    const okPref = k => { const pr = m.vals.find(v => v.key === k).pref; return !pr || m.pref.some(p => pr.startsWith(p) || p.startsWith(pr)) || cueNear(m, [k]) === k; };
    const sk = keys.filter(k => !k.startsWith('L:') && okPref(k));
    if (!sk.length) return null; if (sk.length === 1) return sk[0];
    const cq = cueNear(m, sk); if (cq) return cq;
    for (const p of m.pref) { const k = sk.find(x => x.startsWith(p)); if (k) return k; }
    for (const s of m.tabs) { const k = sk.find(x => x.startsWith(s + '.')); if (k) return k; }
    return null; };
  let applLast = null;
  marks.forEach((m, mi) => {
    if (m.kind === 'room') { startRoom(m); return; }
    if (m.kind === 'ctx') { if (!m.tabs.includes('interior') || room !== null) { room = null; } if (!m.tabs.includes('interior')) ctxLevel = null; return; }
    if (m.kind === 'sp') { const s = m.s, num = s.replace(/^\D+/, '');
      if (/^lvl/.test(s)) { const code = LVL_CODE[s.slice(3)]; if (room !== null && sameSentence(rooms[room].at, m.i) && rooms[room].at < m.i && !rooms[room].levelSaid) { rooms[room].level = code; rooms[room].levelSaid = true; } else { ctxLevel = code; room = null; } return; }
      if (/^[qc]rate/.test(s)) { const back = T.slice(Math.max(0, m.i - 5), m.i).map(t => t.s); const lastOf = w => back.lastIndexOf(w);
        const e = lastOf('exterior'), it = lastOf('interior'), ov = lastOf('overall'); const top = Math.max(e, it, ov);
        const where = top < 0 ? (room !== null || m.tabs.includes('interior') ? 'int' : m.tabs.includes('front') ? 'ext' : 'all') : top === e ? 'ext' : top === it ? 'int' : 'all';
        const key = { ext: s[0] === 'q' ? 'front.eq' : 'front.ec', int: s[0] === 'q' ? 'interior.iq' : 'interior.ic', all: s[0] === 'q' ? 'condition.oq' : 'condition.oc' }[where];
        put(key, (s[0] === 'q' ? 'Q' : 'C') + num); return; }
      if (/^ceilht/.test(s)) { put('interior.ceilH', CEIL_CODE(s.slice(6))); return; }
      if (/^stories/.test(s)) { put('front.stories', +num); return; }
      if (/^garcar/.test(s)) { const nx = T.slice(m.i + 1, m.i + 3).map(t => t.s); if (nx.includes('carport')) put('garage.carport', +num); else { put('garage.hasGarage', true); put('garage.garSpaces', +num); } return; }
      if (/^islands/.test(s)) { const ri = room !== null && rooms[room].list === 'kitchens' ? room : startRoom({ list: 'kitchens', props: {}, i: m.i }); put('L:kitchens.islands', +num, ri); return; }
      if (/^fpcount/.test(s)) { fpMentions = Math.max(fpMentions, +num) - 1; return; }
      if (s === 'fireplace') { fpMentions++; marks.filter(o => o.kind === 'val' && o.i > m.i && o.i <= m.i + 2 && sameSentence(o.i, m.i)).forEach(o => { const st = T.slice(o.i, o.i + o.len).map(t => t.s).join(' '); if (st === 'gas') { put('interior.fpType', 'Gas'); o.skip = true; } if (/^wood( burning)?$/.test(st)) { put('interior.fpType', 'Wood Burning'); o.skip = true; } }); if (room !== null && LISTS[rooms[room].list].fields.some(f => f.k === 'feat' && optsOf(f, {}, null).some(o => o[0] === 'Fireplace'))) { put('L:' + rooms[room].list + '.feat', 'Fireplace', room); put('L:' + rooms[room].list + '.hasFeat', true, room); } return; }
      if (/^bedcount/.test(s)) { put('interior.dkBeds', +num); return; }
      if (/^bathcount/.test(s)) { put('interior.dkBaths', +num); return; }
      if (/^halfcount/.test(s)) { put('interior.dkHalf', +num); return; }
      return; }
    if (m.kind === 'appl' || m.kind === 'brand') { const ri = room !== null && rooms[room].list === 'kitchens' ? room : (m.kind === 'appl' && m.tabs.includes('interior') ? startRoom({ list: 'kitchens', props: {}, i: m.i }) : null);
      if (ri === null) { unclear.push(T.slice(m.i, m.i + m.len).map(t => t.w).join(' ')); return; }
      const r = rooms[ri]; r.appl = r.appl || {};
      if (m.kind === 'appl') { const a = r.appl[m.k] = r.appl[m.k] || {}; const prev = marks[mi - 1], prev2 = marks[mi - 2]; const bm = [prev, prev2].find(o => o && o.kind === 'brand' && m.i - o.i <= 3 && sameSentence(o.i, m.i));
        if (bm) a.brand = bm.b; const qn = T[m.i - 1] && /^\d$/.test(T[m.i - 1].s) ? +T[m.i - 1].s : m.q; if (qn) a.qty = qn; applLast = m.k; }
      else { const nx = marks[mi + 1]; if (!(nx && nx.kind === 'appl' && nx.i - m.i <= 3)) { r.brandsSaid = [...new Set([...(r.brandsSaid || []), m.b])]; } }
      return; }
    if (m.kind === 'item') { if (room !== null && m.val) { const rk = m.val.filter(v => v.key.startsWith('L:' + rooms[room].list + '.')); if (rk.length) { m.asVal = true; put(rk[0].key, rk[0].v, room); if (rk[0].key.endsWith('.feat')) put('L:' + rooms[room].list + '.hasFeat', true, room); return; } }
      room = null; m.words = []; items.push(m); return; }
    if (m.kind === 'val' && m.skip) return;
    if (m.kind === 'val') { const keys = [...new Set(m.vals.map(v => v.key))];
      const stems = T.slice(m.i, m.i + m.len).map(t => t.s).join(' '), word = T.slice(m.i, m.i + m.len).map(t => t.w).join(' ');
      if (room === null) { const nb = [marks[mi - 1], marks[mi + 1]].filter(o => o && o.kind === 'item' && Math.abs(o.i - m.i) <= 3 && sameSentence(o.i, m.i)).sort((a, b) => Math.abs(a.i - m.i) - Math.abs(b.i - m.i))[0];
        if (nb && ITEM_WORDS.has(stems)) { m.taken = nb; return; } }   // "wood decking", "pebble pool"
      if (stems === 'stainles' || stems === 'stainless') { const ri = room !== null && rooms[room].list === 'kitchens' ? room : null; if (ri !== null) { rooms[ri].stainless = true; return; } }
      const key = resolve(m, keys);
      if (!key || key === 'unclear') { unclear.push(word + (room !== null && key === 'unclear' ? ' (' + roomName(rooms[room]) + ')' : '')); return; }
      const v = m.vals.find(x => x.key === key).v; const ri = key.startsWith('L:') ? room : undefined;
      if (v && typeof v === 'object' && v.note) { if (room !== null) rooms[room].notes = [...(rooms[room].notes || []), v.note]; else unclear.push(word); return; }
      put(key, v, ri);
      if (key === 'interior.fpType') { fpMentions++; if (room !== null && LISTS[rooms[room].list].fields.some(f => f.k === 'feat' && optsOf(f, {}, null).some(o => o[0] === 'Fireplace'))) { put('L:' + rooms[room].list + '.feat', 'Fireplace', room); put('L:' + rooms[room].list + '.hasFeat', true, room); } }
      if (ri !== undefined) { const L = rooms[ri].list; if (key.endsWith('.feat') && LISTS[L].fields.some(f => f.k === 'hasFeat')) put('L:' + L + '.hasFeat', true, ri);
        if (key === 'L:baths.showerMat') put('L:baths.shower', true, ri); if (key === 'L:baths.tubShowerMat') put('L:baths.tubShower', true, ri); if (key === 'L:baths.tubFreeMat') put('L:baths.tubFree', true, ri); }
      if (key === 'systems.renew') { const win = T.slice(Math.max(0, m.i - 2), m.i + m.len + 2); const near = win.map(t => t.s).join(' '); win.forEach(t => { if (/^(own|owned|leased?|ppa)$/.test(t.s)) t.item = true; });
        if (/\b(own|owned)\b/.test(near)) put('systems.solarOwn', 'Owned'); else if (/\bleas(e|ed)\b/.test(near)) put('systems.solarOwn', 'Leased'); else if (/\bppa\b|power purchase/.test(near)) put('systems.solarOwn', 'PowerPurchaseAgreement'); } }
  });
  if (fpMentions > 0) put('interior.fireplaces', fpMentions);
  // words around a pool / spa / deck (same sentence, up to the next comma)
  T.forEach((t, j) => { if (t.br) return; const mk = marks.find(o => j >= o.i && j < o.i + o.len); if (mk && !(mk.kind === 'val' && mk.taken)) return;
    const o = mk && mk.taken ? mk.taken : nearestItem(j); if (o) { o.words.push(t.w); t.item = true; } });
  const out = items.map(m => dictItem(m));
  if ([...changes.values()].some(c => c.key === 'amenities.fenceMat')) put('amenities.hardscape', 'Fencing');
  // the rooms as they are in the inspection now
  if (ins) rooms.forEach(r => { const L = ins.lists[r.list] || [];
    let ex = null;
    if (r.list === 'kitchens') ex = r.style ? L.find(k => k.style === r.style) : L[0];
    else if (r.list === 'wetbars') ex = L[0];
    else if (r.list === 'rooms') ex = L.find(x => x.type === r.type);
    else if (r.label) ex = L.find(x => String(x.label || '').toLowerCase() === r.label.toLowerCase()) || (r.list === 'bedrooms' && r.label === 'Bedroom 1' ? L[0] : null) || (r.list === 'baths' && r.label === 'Bath 1' ? L.find(b => b.kind === 'FullBathroom') : null);
    if (ex) { r.existingId = ex.id; r.name = LISTS[r.list].name(ex, L.indexOf(ex), L); } });
  // leftovers: words not used and not filler
  const left = []; let run = [];
  T.forEach((t, j) => { const mk = marks.find(m => j >= m.i && j < m.i + m.len); const inMark = t.item || (mk && !(mk.kind === 'val' && !mk.taken && unclear.some(u => u.startsWith(T.slice(mk.i, mk.i + mk.len).map(x => x.w).join(' ')))));
    if (t.br || inMark || DICT_FILLER.has(t.s) || DICT_FILLER.has(t.w)) { if (run.length) left.push(run.join(' ')); run = []; return; } run.push(t.w); });
  if (run.length) left.push(run.join(' '));
  return { changes: [...changes.values()], rooms, items: out, unclear: [...new Set(unclear)], left: [...new Set(left)] };
}
function dictItem(m) {
  const S = phraseOf((m.words || []).join(' ')).join(' '); const has = w => (' ' + S + ' ').includes(' ' + phraseOf(w).join(' ') + ' ');
  const it = { list: m.list, note: [] };
  if (m.list === 'waterFeatures') {
    let type = m.type;
    if (type === 'pool') type = has('lap') ? 'Lap Pool' : has('infinity') || has('infinity edge') ? 'Infinity Edge Pool' : has('plunge') ? 'Plunge Pool' : has('aboveground') ? 'Above-ground Pool' : 'IngroundPool';
    if (type === 'spa') type = has('aboveground') || has('portable') ? 'Above-ground Spa / Hot Tub' : 'IngroundSpa';
    it.type = type; it.feat = POOL_FEAT.filter(([w]) => has(w)).map(x => x[1]); const pm = POOL_MAT.find(([w]) => has(w)); if (pm && /Pool/.test(type)) it.mat = pm[1];
    if (has('attached')) it.note.push('Attached to the pool'); if (has('cover') && !it.feat.includes('Automatic Cover')) it.note.push('Has a cover');
  } else { it.type = m.type; const mt = ITEM_MAT.slice().sort((a, b) => b[0].length - a[0].length).find(([w]) => has(w)); if (mt) it.material = mt[1]; it.feat = OL_FEAT.filter(([w]) => has(w)).map(x => x[1]); }
  it.note = it.note.join('; '); return it;
}

/* ---- put it into the inspection ---- */
function dictNewItem(ins, r) {   // same starting values as "Add …" on the tab
  const list = ins.lists[r.list]; const it = { id: uid() };
  if (r.list === 'bedrooms') { it.label = r.label || 'Bedroom ' + (list.length + 1); it.level = r.level || 'LevelOne'; }
  else if (r.list === 'baths') { it.kind = r.kind || 'FullBathroom'; const k = list.filter(b => b.kind === it.kind).length + 1; it.label = r.label || (it.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') + k; it.level = r.level || 'LevelOne'; }
  else if (r.list === 'kitchens') { it.level = r.level || 'LevelOne'; if (r.style && list.length) it.style = r.style; if (r.label) it.label = r.label; }
  else if (r.list === 'rooms') { it.type = r.type; it.level = r.level || 'LevelOne'; }
  else if (r.list === 'wetbars') { it.level = r.level || 'LevelOne'; }
  list.push(it); return it;
}
function dictApply(ins, res, pick) {
  const target = res.rooms.map((r, ri) => { if (pick.r[ri] === false) return null; const L = ins.lists[r.list]; let it = r.existingId ? L.find(x => x.id === r.existingId) : null;
    if (!it) it = dictNewItem(ins, r); else if (r.levelSaid && r.level) it.level = r.level;
    if (r.appl) { it.appl = it.appl || {}; Object.entries(r.appl).forEach(([k, a]) => { it.appl[k] = { ...(it.appl[k] || {}), ...a }; if (!it.appl[k].qty && APPLIANCES.find(x => x.k === k).qty) it.appl[k].qty = 1; }); }
    const notes = [...(r.notes || [])]; if (r.stainless) notes.push('Stainless steel appliances'); if ((r.brandsSaid || []).length) notes.push(r.brandsSaid.join(', ') + ' appliances');
    if (notes.length) it.note = [it.note, notes.join('; ')].filter(Boolean).join('. ');
    return it; });
  res.changes.forEach((c, i) => { if (!pick.c[i]) return;
    let d; if (c.room !== undefined) { d = target[c.room]; if (!d) return; } else d = ins.data[c.sec.id];
    if (c.key === 'interior.dkBeds' || c.key === 'interior.dkBaths' || c.key === 'interior.dkHalf') { const L = c.key === 'interior.dkBeds' ? 'bedrooms' : 'baths'; const kind = c.key === 'interior.dkHalf' ? 'HalfBathroom' : 'FullBathroom';
      const have = ins.lists[L].filter(x => L === 'bedrooms' || x.kind === kind).length; for (let k = have; k < c.vals[0]; k++) dictNewItem(ins, { list: L, kind }); return; }
    if (c.f.t === 'multi') d[c.f.k] = [...new Set([...(Array.isArray(d[c.f.k]) ? d[c.f.k].filter(x => x !== 'None') : []), ...c.vals])];
    else d[c.f.k] = (pick.v && pick.v[i] !== undefined ? pick.v[i] : c.vals[0]); });
  if (res.changes.some((c, i) => pick.c[i] && c.key === 'driveway.driveMat')) ins.data.driveway.hasDrive = true;
  if (res.changes.some((c, i) => pick.c[i] && c.key === 'interior.fpType') && !(ins.data.interior.fireplaces > 0)) ins.data.interior.fireplaces = 1;
  res.items.forEach((it, i) => { if (!pick.i[i]) return; const L = ins.lists[it.list]; const o = { id: uid(), type: it.type };
    if (it.list === 'waterFeatures') { if (it.mat) o.mat = it.mat; if (it.feat.length) o.feat = it.feat; if (it.note) o.note = it.note; }
    else { if (it.material) o.material = it.material; if (it.feat.length) o.feat = it.feat; if (it.note) o.note = it.note; }
    L.push(o); });
}

/* ---- the Dictate page ---- */
const DICT_SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
function renderDictate() {
  const ins = app.ins; const log = ins.dictLog || []; const R = app.dict && app.dict.res; const P = app.dict ? app.dict.pick : { c: {}, i: {}, v: {}, r: {} };
  const row = (on, attr, where, what, note, cls) => `<label class="dk-row ${cls || ''}"><input type="checkbox" ${attr} ${on ? 'checked' : ''}><span class="dk-where">${esc(where)}</span><span class="dk-what">${what}</span>${note ? `<small>${esc(note)}</small>` : ''}</label>`;
  const HIDE = /\.(hasFeat|hasGarage)$/;
  const changeRow = (c, i, where, curObj, cls) => { if (HIDE.test(c.key)) return '';
    const cur = curObj ? curObj[c.f.k] : undefined; const curL = Array.isArray(cur) ? cur.map(v => dkLabel(c.key, v)).join(', ') : cur != null && cur !== '' && typeof cur !== 'object' ? dkLabel(c.key, cur) : '';
    const what = c.vals.map(v => '<b>' + esc(dkLabel(c.key, v)) + '</b>').join(', ');
    const note = c.f.t !== 'multi' && curL && curL !== dkLabel(c.key, c.vals[0]) ? 'replaces ' + curL : c.f.t === 'multi' && curL ? 'added to ' + curL : '';
    const choose = c.f.t === 'one' && c.vals.length > 1 ? `<span class="dk-pick">${c.vals.map(v => `<label><input type="radio" name="dkv${i}" data-dkv="${i}" value="${esc(v)}" ${(P.v[i] ?? c.vals[0]) === v ? 'checked' : ''}>${esc(dkLabel(c.key, v))}</label>`).join('')}</span>` : null;
    return row(P.c[i] !== false, `data-dkc="${i}"`, where, choose || what, choose ? 'one answer – pick it' : note, cls); };
  const secRows = R ? R.changes.map((c, i) => c.room === undefined ? changeRow(c, i, (c.sec ? c.sec.title : '') + ' › ' + c.f.l, ins.data[c.sec.id]) : '').join('') : '';
  const roomRows = R ? R.rooms.map((r, ri) => { const L = ins.lists[r.list]; const ex = r.existingId ? L.find(x => x.id === r.existingId) : null;
    const head = row(P.r[ri] !== false, `data-dkr="${ri}"`, ex ? 'Update' : 'New ' + ROOM_TITLE[r.list].toLowerCase(), '<b>' + esc(ex ? r.name : roomName(r)) + '</b>' + (r.level ? ' · ' + esc(labelOf(LEVELS_ALL, r.level)) : ''), '', 'dk-room');
    const appl = r.appl ? Object.entries(r.appl).map(([k, a]) => esc(APPLIANCES.find(x => x.k === k).l) + (a.brand ? ' – ' + esc(a.brand) : '') + (a.qty > 1 ? ' ×' + a.qty : '')).join(', ') : '';
    const notes = [...(r.notes || []), r.stainless ? 'Stainless steel appliances' : '', (r.brandsSaid || []).length ? r.brandsSaid.join(', ') + ' appliances' : ''].filter(Boolean).join('; ');
    return `<div class="dk-roomBox">${head}${R.changes.map((c, i) => c.room === ri ? changeRow(c, i, c.f.l, ex, 'dk-sub') : '').join('')}${appl ? `<div class="dk-sub dk-info">Appliances: <b>${appl}</b></div>` : ''}${notes ? `<div class="dk-sub dk-info">Note: ${esc(notes)}</div>` : ''}</div>`; }).join('') : '';
  const itemRows = R ? R.items.map((it, i) => row(P.i[i] !== false, `data-dki="${i}"`, (it.list === 'waterFeatures' ? 'Pool, spa & water features' : 'Porches, patios & decks') + ' › new',
    '<b>' + esc(labelOf(LISTS[it.list].fields[0].o, it.type) || it.type) + '</b>' + [it.material ? ' · ' + esc(labelOf(LISTS.outdoorLiving.fields[2].o, it.material) || it.material) : '', it.mat ? ' · ' + esc(it.mat) : '', it.feat.length ? ' · ' + esc(it.feat.join(', ')) : '', it.note ? ' · ' + esc(it.note) : ''].join(''), '')).join('') : '';
  const any = R && (R.changes.length || R.items.length || R.rooms.length);
  return `<section class="group open"><div class="ghead static"><span class="gtitle">Dictate your notes</span></div><div class="exp">
    <p class="help">Say the area or room first, then what you see, the way you walk it. For example: <i>“Exterior 2 story Spanish stucco clay tile roof copper gutters wood clad dual pane windows slab foundation. Exterior quality Q4 condition C3. 2 car attached garage. View residential full neutral. Topography level lot. Interior 9 foot ceilings recessed lighting. Forced air gas heating, central air, tankless water heater. Living room hardwood floors vaulted ceiling gas fireplace. Kitchen remodeled 5 to 10 years ago granite counters shaker cabinets Wolf range Sub-Zero refrigerator island with seating. Upstairs primary bedroom carpet walk-in closet. Primary bath double sink freestanding tub separate shower frameless glass. Bedroom 2 carpet. Hall bath tub shower combo tile surround. Interior quality Q3 condition C2. Overall quality Q4 condition C3.”</i></p>
    <p class="help">Tap in the box, then the <b>microphone on the iPad keyboard</b>, and talk.${DICT_SR ? ' Or use Listen.' : ''} You can dictate a little at a time: read it, fill it in, then dictate the next part. Say “upstairs” or “level 2” before the rooms on that floor. Nothing is filled until you check the list and tap <b>Fill in</b>.</p>
    <textarea class="txt dk-box" id="dkText" rows="7" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="Tap here, then the microphone on the keyboard">${esc((app.dict && app.dict.text) || '')}</textarea>
    <div class="row">${DICT_SR ? `<button class="btn" id="dkListen">${app.dict && app.dict.listening ? '■ Stop' : '🎤 Listen'}</button>` : ''}<button class="btn primary" id="dkRead">Read it</button><button class="btn ghost" id="dkClear">Clear</button></div>
    ${R ? `<h3 class="dk-h">What I heard</h3>
      ${any ? '' : '<p class="help">Nothing I recognize yet.</p>'}
      ${secRows}${roomRows ? `<h4 class="dk-h4">Rooms</h4>${roomRows}` : ''}${itemRows ? `<h4 class="dk-h4">Outdoor</h4>${itemRows}` : ''}
      ${R.unclear.length ? `<p class="dk-warn">Not sure where these go – tap the field yourself: <b>${R.unclear.map(esc).join(', ')}</b></p>` : ''}
      ${R.left.length ? `<p class="dk-left">Words not used: ${R.left.map(w => '“' + esc(w) + '”').join(', ')}. They stay in your dictation log (workfile only).</p>` : ''}
      ${any ? `<div class="row"><button class="btn primary" id="dkApply">Fill in the ticked items</button></div>` : ''}` : ''}
    ${log.length ? `<details class="dk-log"><summary>Dictation log (${log.length}) – workfile only, not sent to SFREP</summary>${log.slice().reverse().map(x => `<p><small>${esc(new Date(x.t).toLocaleString())}</small><br>${esc(x.text)}</p>`).join('')}</details>` : ''}
  </div></section>`;
}
function bindDictate(root) {
  const box = root.querySelector('#dkText'); if (!box) return; const blank = () => ({ text: '', pick: { c: {}, i: {}, v: {}, r: {} } }); app.dict = app.dict || blank();
  box.oninput = () => { app.dict.text = box.value; };
  root.querySelector('#dkRead').onclick = () => { app.dict.text = box.value; app.dict.res = dictParse(box.value, app.ins); app.dict.pick = { c: {}, i: {}, v: {}, r: {} }; renderTab(); };
  root.querySelector('#dkClear').onclick = () => { app.dict = blank(); renderTab(); };
  root.querySelectorAll('[data-dkc]').forEach(cb => cb.onchange = () => { app.dict.pick.c[cb.dataset.dkc] = cb.checked; });
  root.querySelectorAll('[data-dkr]').forEach(cb => cb.onchange = () => { app.dict.pick.r[cb.dataset.dkr] = cb.checked; const box2 = cb.closest('.dk-roomBox'); if (box2) box2.classList.toggle('off', !cb.checked); });
  root.querySelectorAll('[data-dkv]').forEach(r => r.onchange = () => { app.dict.pick.v[r.dataset.dkv] = r.value; });
  root.querySelectorAll('[data-dki]').forEach(cb => cb.onchange = () => { app.dict.pick.i[cb.dataset.dki] = cb.checked; });
  const ap = root.querySelector('#dkApply'); if (ap) ap.onclick = () => { const R = app.dict.res; const P = app.dict.pick; const pick = { c: {}, i: {}, v: P.v || {}, r: {} };
    R.changes.forEach((c, i) => pick.c[i] = P.c[i] !== false && (c.room === undefined || P.r[c.room] !== false)); R.items.forEach((x, i) => pick.i[i] = P.i[i] !== false); R.rooms.forEach((x, i) => pick.r[i] = P.r[i] !== false);
    dictApply(app.ins, R, pick); app.ins.dictLog = [...(app.ins.dictLog || []), { t: Date.now(), text: app.dict.text }];
    const n = Object.values(pick.c).filter(Boolean).length + Object.values(pick.i).filter(Boolean).length;
    app.dict = blank(); save(); renderTab(); toast(n + ' item' + (n === 1 ? '' : 's') + ' filled in. Check each tab for anything still marked.'); };
  const ls = root.querySelector('#dkListen'); if (ls && DICT_SR) ls.onclick = () => {
    if (app.dict.listening && app.dict.sr) { app.dict.sr.stop(); return; }
    const sr = new DICT_SR(); sr.lang = 'en-US'; sr.continuous = true; sr.interimResults = false; app.dict.sr = sr; app.dict.listening = true;
    sr.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ' '; const b = $('#dkText'); app.dict.text = ((b ? b.value : app.dict.text) + ' ' + t).replace(/\s+/g, ' ').trimStart(); if (b) b.value = app.dict.text; };
    sr.onend = () => { app.dict.listening = false; app.dict.sr = null; renderTab(); }; sr.onerror = () => { app.dict.listening = false; };
    try { sr.start(); renderTab(); } catch (e) { app.dict.listening = false; toast('Use the microphone on the keyboard instead'); } };
}
