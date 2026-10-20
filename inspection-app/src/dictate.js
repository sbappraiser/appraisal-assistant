/* =====================================================================
   Dictate (6h, Oct 2026): she speaks her notes the way she walks the property,
   e.g. "street asphalt curbs sidewalks street lights. dwelling cottage stucco
   composition shingle roof vinyl clad windows casement windows crawlspace.
   site concrete walkways ... inground pool with an attached spa ..."
   The words are matched to the app's own choices (same fields, same SFREP
   export). Nothing is filled until she has seen the list and tapped Save to appraisal file.
   Words it does not understand are shown, never guessed.
   ===================================================================== */

/* ---- words ---- */
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ORDW = { first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th' };
const tfOf = n => n < 1 ? 'tflt1' : n <= 5 ? 'tf1to5' : n <= 10 ? 'tf5to10' : 'tf10plus';
const DICT_HEAR = [ // 6k: what the iPad heard → what she said (from her Oct 2026 inspection)
  [/\s*\b(?:colin|colon)\b/g, ':'], [/\bpaper (patio|walkway|walk|driveway|path)/g, 'paver $1'], [/(^|[.\n]\s*)then\s*:/g, '$1den:'], [/\bvaulted would be\b/g, 'vaulted wood beam'],
  [/\bfor (?:micah|mica|mika)\b(?! desk)/g, 'formica'], [/\b(?:bolted|altered|vaulter|volted|faulted|halted)\b(?=\s+(?:wood\s+)?(?:beam|ceiling))/g, 'vaulted'], [/\bted ceilings?\b/g, 'vaulted ceilings'],
  [/\b(?:to|too) (showerheads?|shower heads?|sinks|vanities|sliders|sliding glass doors|islands|fireplaces|water heaters|ovens)\b/g, '2 $1'], [/\bcaptain ?trees?\b/g, 'cabinetry'], [/\bcabinet tree\b/g, 'cabinetry'],
  [/\bbedroom,? (?:floor|for|fore)\b/g, 'bedroom 4'], [/\bfrench (?:strains?|trains?|drains?)\b/g, 'french drain'], [/\bic\s*-?\s*([1-6])\b/g, 'high c$1'], [/\bcentral,? warm,? air\b/g, 'forced air'], [/\bcentral (?:heat|heating)\b/g, 'forced air'],
  [/\bair[ -]condition(?:ing|er|ed)?\b/g, 'ac'], [/\b(curbs?)(,?\s*(?:and\s+)?)gutters?\b/g, '$1$2streetgutters'], [/\bgravel beds?\b/g, 'gravelbeds'], [/\b(?:one|1|single) level\b/g, 'stories1'], [/\btrailer patio\b/g, 'trellis covered patio'], [/\btrellised\b/g, 'trellis'],
  [/\b(?:mealie|mealy|millie|milly|miley|meili)\b/g, 'miele'], [/\bmiele(\d)/g, 'miele $1'], [/\btough sheds?\b/g, 'tuff shed'], [/\btuff sheds\b/g, 'tuff shed'], [/\bcarr\b/g, 'car'], [/\b(?:attached|detached) (?:to|too) car\b/g, m => m.split(' ')[0] + ' 2 car'], [/\b(?:to|too) car\b/g, '2 car'],
  [/\b(?:solar tubes?|solitude|sola tubes?|solatubes|solar tubs?)\b/g, 'solatube'], [/\b(?:to|two|2) pay for\b/g, 'paver'], [/\b(rear|front)\s+inside\s+yards?\b/g, '$1 and side yards'],
  [/\bwindows or\b/g, 'windows are'], [/\bwindows are insulated\b/g, 'windows are dual pane'], [/\binsulated (?:glass|windows?)\b/g, 'dual pane windows'], [/\bfloor ?plans?\b/g, 'floorplan'], [/\bhook ?ups?\b/g, 'hookups'], [/\bstorage left\b/g, 'storage loft'],
  [/\bshower ?heads?\b/g, 'showerhead'], [/\bmirrored\b/g, 'mirror'], [/\bbuilt[ -]?in for (?:a |micah |mica |my )?desk\b/g, 'builtin desk'], [/\bcurbs? and gutters?\b/g, 'curbs streetgutters'],
  [/\bhot (?:and|&) cold (?:water )?filter(?:ed)?,? (?:drinking )?water(?: tap| dispenser| faucet)?\b/g, 'hotwaterfilter coldwaterfilter'], [/\bmid[ -]?century\b/g, 'midcentury'], [/\blow[ -]profile\b/g, 'lowprofile'], [/\bhard ?scape\b/g, 'hardscape']];
// a count only when it really is the house count – not "bedroom 2", "addition of 2 bedrooms", "bathroom 1 full bathroom"
const dkCount = tok => (m, n, off, s) => /\b(?:of|added|addition|bedroom|bathroom|bath|number|no|both|the|these|those|new|extra|additional)\s*$/.test(s.slice(Math.max(0, off - 16), off)) ? m : tok + n;
const DICT_PRE = [ // numbers, ratings, levels, counts – turned into one word each so they cannot be misread
  [/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (m, w) => String(NUMW[w])], [/\b(first|second|third|fourth|fifth)\b/g, (m, w) => ORDW[w]],
  [/\b(\d)\.5\s+bath(?:room)?s?\b/g, 'bathcount$1 halfcount1'], [/\b(\d)\s+and a half\s+bath(?:room)?s?\b/g, 'bathcount$1 halfcount1'],
  [/\b([1-9])\s+half\s+bath(?:room)?s?\b/g, dkCount('halfcount')], [/\b([1-9])\s+(?:full\s+)?bath(?:room)?s\b/g, dkCount('bathcount')], [/\b(1)\s+(?:full\s+)?bath(?:room)?\b(?=\s*(?:and|,|$|\.))/g, dkCount('bathcount')], [/\b([1-9])\s+bedrooms?\b/g, dkCount('bedcount')],
  [/\b(?:front door|front entry|entry door|front entrance|threshold|entry)\b(?:\s+(?:is|sits|elevation|height|threshold|about|approximately|around|roughly|at|less than|under|below|just))*\s+(\d+(?:\.\d+)?|a)(?:\s+\1)?\s*(feet|foot|ft|inches|inch)\b(?:\s+(?:above|off|from)\s+(?:the\s+)?(?:grade|ground|finished grade))?/g, (m, n, u) => 'frontelev' + Math.round((n === 'a' ? 1 : +n) * (/^in/.test(u) ? 1 : 12))],
  [/\b(\d{1,2})\s+steps?\s+(?:up\s+)?(?:to\s+)?(?:the\s+)?(?:front door|entry|front entry|threshold)\b/g, (m, n) => 'frontelev' + (+n * 7)],
  [/\b(?:front door|front entry|entry door|threshold|entry)\b(?:\s+(?:is|sits|at))*\s+(?:at\s+)?(?:ground level|grade level|grade|ground)\b/g, 'frontelev0'],
  [/\b(\d{1,2})\s*(?:foot|feet|ft)\s+(?:high\s+|tall\s+)?((?:(?:vaulted|beamed|beam|coffered|tray|open|flat|wood|tongue and groove)\s+){1,3})ceilings?\b/g, 'ceilht$1 $2ceiling'],
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
const DICT_FILLER = new Set('or rating public center quality condition overall detector detectors appliance appliances ceiling ceilings floor floors flooring counters counter countertop countertops cabinets cabinet combo a an the and with has have had of in on at to for is are was were it its this that there some lots lot of various abundance plenty several many few all also plus very nice typical including include includes amenity amenities area areas featuring features feature has having be been by from into around side yard rear front left right back'.split(' '));
const stemW = w => { w = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'; if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2); if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1); return w; };
const dictTokens = text => { let t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[–—]/g, ' ') + ' '; DICT_HEAR.forEach(([r, s]) => t = t.replace(r, s)); DICT_PRE.forEach(([r, s]) => t = t.replace(r, s)); DICT_FIX.forEach(([r, s]) => t = t.replace(r, s));
  const out = []; t.split(/(\s+|[.,;:!?()]+)/).forEach(p => { if (!p || /^\s+$/.test(p)) return; if (/^[.,;:!?()]+$/.test(p)) { if (/[.;!?]/.test(p)) out.push({ br: true }); else if (out.length) out[out.length - 1].cm = true; return; } p.split('/').forEach((w, wi) => { const st = stemW(w); if (st) out.push({ w, s: st, sl: wi > 0 }); }); }); return out; };
const phraseOf = s => dictTokens(s).filter(t => !t.br).map(t => t.s);

/* ---- where she is (section words) ---- */
const DICT_CTX = [ // spoken word → tabs to try first
  ['street', ['street']], ['road', ['street']], ['driveway', ['driveway']],
  ['dwelling', ['front']], ['house', ['front']], ['home', ['front']], ['residence', ['front']], ['structure', ['front']], ['exterior', ['front']], ['roof', ['front']],
  ['garage', ['garage']], ['site', ['site', 'amenities']], ['lot', ['site', 'amenities']], ['yard', ['amenities', 'site']], ['backyard', ['amenities', 'site']], ['grounds', ['amenities', 'site']],
  ['landscaping', ['amenities', 'site']], ['landscape', ['amenities', 'site']], ['outdoor', ['amenities']], ['pool', ['amenities']],
  ['interior', ['interior']], ['inside', ['interior']], ['hallway', ['interior']], ['hall', ['interior']], ['systems', ['systems']], ['mechanical', ['systems']], ['energy', ['systems']],
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
  ['vinyl clad', 'front.windows', 'Vinyl'], ['wood clad', 'front.windows', 'Clad Wood'], ['aluminum clad', 'front.windows', 'Clad Wood'], ['dual pane', 'front.windows', 'Dual Pane'], ['single pane', 'front.windows', 'Single Pane'], ['double hung', 'front.windows', 'Double Hung'], ['sliding window', 'front.windows', 'Sliding'], ['slider window', 'front.windows', 'Sliding'], ['slider', 'interior.extDoors', 'Sliding Glass Doors'], ['slider', 'L:rooms.feat', 'Sliding Doors to Patio'], ['sliding door', 'interior.extDoors', 'Sliding Glass Doors'], ['divided light', 'front.windows', 'Divided Lite'],
  ['composition shingle', 'front.roofMat', 'Composition'], ['composition', 'front.roofMat', 'Composition'], ['asphalt shingle', 'front.roofMat', 'Asphalt'], ['spanish tile', 'front.roofMat', 'Clay'], ['clay tile', 'front.roofMat', 'Clay'], ['concrete tile', 'front.roofMat', 'Concrete'], ['standing seam', 'front.roofMat', 'Metal'], ['wood shake', 'front.roofMat', 'Wood'], ['shake', 'front.roofMat', 'Wood'], ['tar and gravel', 'front.roofMat', 'TarAndGravel'], ['built up', 'front.roofMat', 'TarAndGravel'],
  ['stucco', 'front.walls', 'Stucco'], ['stucco wall', 'front.walls', 'Stucco'], ['stucco exterior', 'front.walls', 'Stucco'], ['plaster', 'front.walls', 'Stucco'], ['cement board', 'front.walls', 'CementBoard'], ['board and batten', 'front.walls', 'Wood'], ['lap siding', 'front.walls', 'Wood'], ['wood siding', 'front.walls', 'Wood'], ['shingle siding', 'front.walls', 'Wood'], ['stone veneer', 'front.walls', 'SyntheticStone'],
  ['crawlspace', 'front.foundType', 'CrawlSpace'], ['raised foundation', 'front.foundType', 'ConcretePerimeter'], ['concrete perimeter', 'front.foundType', 'ConcretePerimeter'], ['raised floor', 'front.foundType', 'ConcretePerimeter'], ['slab', 'front.foundType', 'Slab'], ['post and pier', 'front.foundType', 'PostAndPier'], ['basement', 'front.foundType', 'Basement'],
  ['flagstone', 'amenities.walks', 'Flagstone'], ['dg', 'amenities.walks', 'Decomposed Granite'],
  ['irrigation', 'amenities.landSys', 'Automatic Irrigation'], ['sprinkler', 'amenities.landSys', 'Automatic Irrigation'], ['drip', 'amenities.landSys', 'Drip Irrigation'], ['drainage', 'amenities.landSys', 'Drainage System'], ['site drainage', 'amenities.landSys', 'Drainage System'], ['french drain', 'amenities.landSys', 'Subsurface Drains'], ['landscape lighting', 'amenities.landSys', 'Landscape Lighting'], ['landscape light', 'amenities.landSys', 'Landscape Lighting'], ['garden lighting', 'amenities.landSys', 'Landscape Lighting'],
  ['retaining wall', 'amenities.hardscape', 'Retaining Walls'], ['terrace', 'amenities.hardscape', 'Terraces'], ['terracing', 'amenities.hardscape', 'Terraces'], ['garden wall', 'amenities.hardscape', 'Garden Walls'], ['stone step', 'amenities.hardscape', 'Stone Steps'], ['perimeter wall', 'amenities.hardscape', 'Perimeter Walls'],
  ['tree', 'amenities.landFeat', 'Established Trees'], ['palm', 'amenities.landFeat', 'Established Trees'], ['oak', 'amenities.landFeat', 'Established Trees'], ['shrub', 'amenities.landFeat', 'Shrubs'], ['bush', 'amenities.landFeat', 'Bushes'], ['hedge', 'amenities.landFeat', 'Hedges'], ['groundcover', 'amenities.landFeat', 'Ground Cover'],
  ['succulent', 'amenities.landFeat', 'Succulents'], ['cactus', 'amenities.landFeat', 'Succulents'], ['lawn', 'amenities.landFeat', 'Lawn'], ['grass', 'amenities.landFeat', 'Lawn'], ['artificial turf', 'amenities.landFeat', 'Artificial Turf'], ['synthetic turf', 'amenities.landFeat', 'Artificial Turf'], ['fruit tree', 'amenities.landFeat', 'Fruit Trees'], ['citrus', 'amenities.landFeat', 'Citrus Trees'], ['avocado', 'amenities.landFeat', 'Avocado Trees'], ['flower', 'amenities.landFeat', 'Flower Beds'], ['rose', 'amenities.landFeat', 'Rose Garden'], ['native plant', 'amenities.landFeat', 'Native Plants'], ['vegetable garden', 'amenities.landFeat', 'Vegetable Garden'], ['raised bed', 'amenities.landFeat', 'Raised Beds'],
  ['fire pit', 'amenities.outdoor', 'Fire Pit'], ['firepit', 'amenities.outdoor', 'Fire Pit'], ['bbq', 'amenities.outdoor', 'Built-in BBQ Area'], ['builtin bbq', 'amenities.outdoor', 'Built-in BBQ Area'], ['builtin barbecue', 'amenities.outdoor', 'Built-in BBQ Area'], ['barbecue', 'amenities.outdoor', 'Built-in BBQ Area'], ['outdoor kitchen', 'amenities.outdoor', 'Outdoor Kitchen'], ['pergola', 'amenities.outdoor', 'Pergola'], ['trellis', 'amenities.outdoor', 'Trellis'], ['gazebo', 'amenities.outdoor', 'Gazebo'],
  ['solar', 'systems.renew', 'Solar'], ['solatube', 'interior.intFeat', 'Solatubes'], ['ceiling fan', 'interior.intFeat', 'Ceiling Fans'],
  ['streetgutter', 'street.streetFeat', 'Gutters'], ['local street', 'street.streetType', 'Local'], ['local road', 'street.streetType', 'Local'], ['bar seat', 'L:kitchens.islandSeat', true], ['bar seating', 'L:kitchens.islandSeat', true], ['midcentury modern', 'front.design', 'Modern'], ['midcentury', 'front.design', 'Modern'], ['lowprofile', 'front.roofStyle', 'Low Pitch'], ['lowprofile roof', 'front.roofStyle', 'Low Pitch'], ['shed roof', 'front.roofStyle', 'Shed'], ['roses', 'amenities.landFeat', 'Rose Garden'],
  ['drywall', 'garage.garFinish', 'Finished'], ['drywall on wall', 'garage.garFinish', 'Finished'], ['builtin workbench', 'garage.garFeat', 'Workbench'], ['laundry hookup', 'interior.laundry', 'In Garage'],
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
  ['wood flooring', 'L:*.flooring', 'Hardwood'], ['hardwood flooring', 'L:*.flooring', 'Hardwood'], ['hardwood floor', 'L:*.flooring', 'Hardwood'], ['vaulted', 'L:*.ceilS', 'Vaulted'], ['beamed', 'L:*.ceilS', 'Beams'], ['exposed beam', 'L:*.ceilS', 'Beams'],
  ['remodeled', 'L:*.upd', 'FullyUpdated'], ['updated', 'L:*.upd', 'FullyUpdated'], ['partially remodeled', 'L:*.upd', 'PartiallyUpdated'], ['original', 'L:*.upd', 'NotUpdated'], ['dated', 'L:*.upd', 'NotUpdated'],
  ['tflt1', 'L:*.time', 'LessThanOneYear'], ['tf1to5', 'L:*.time', 'OneToFiveYears'], ['tf5to10', 'L:*.time', 'FiveToTenYears'], ['tf10plus', 'L:*.time', 'TenOrMoreYears'],
  ['like new', 'L:*.condStat', 'NewOrLikeNew'], ['wear and tear', 'L:*.condStat', 'TypicalWearAndTear'], ['typical wear', 'L:*.condStat', 'TypicalWearAndTear'],
  ['shaker', 'L:*.cab', 'Shaker'], ['custom', 'L:*.cab', 'Custom Built'], ['match grain', 'L:*.cab', 'Matched Grain Laminate'], ['matched grain', 'L:*.cab', 'Matched Grain Laminate'], ['match grain wood laminate', 'L:*.cab', 'Matched Grain Laminate'], ['custom wood', 'L:*.cab', 'Custom Built'], ['custom', 'L:*.vanMat', 'Custom Built'], ['custom wood', 'L:*.vanMat', 'Custom Built'], ['custom vanity', 'L:*.vanMat', 'Custom Built'], ['wood vanity', 'L:*.vanMat', 'Solid Wood'], ['custom cabinet', 'L:*.cab', 'Custom Built'], ['painted', 'L:*.cab', 'Painted Wood'],
  ['chrome', 'L:*.finish', 'Polished Chrome'], ['black', 'L:*.finish', 'Matte Black'], ['bronze', 'L:*.finish', 'Oil-rubbed Bronze'], ['nickel', 'L:*.finish', 'Brushed Nickel'],
  ['walkin closet', 'L:bedrooms.closet', 'Walk-in'], ['reachin closet', 'L:bedrooms.closet', 'Reach-in'], ['walkin', 'L:bedrooms.closet', 'Walk-in'], ['ensuite', 'L:bedrooms.ensuite', true], ['smoke detector', 'L:bedrooms.smoke', true], ['ceiling fan', 'L:bedrooms.feat', 'Ceiling Fan'],
  ['freestanding tub', 'L:baths.tubFree', true], ['soaking tub', 'L:baths.tubFree', true], ['tub shower', 'L:baths.tubShower', true], ['shower over tub', 'L:baths.tubShower', true], ['tub and shower', 'L:baths.tubShower', true], ['tub shower combo', 'L:baths.tubShower', true], ['tub shower combination', 'L:baths.tubShower', true],
  ['separate shower', 'L:baths.shower', true], ['stall shower', 'L:baths.shower', true], ['walkin shower', 'L:baths.shower', true], ['frameless', 'L:baths.feat', 'Frameless Glass'], ['niche', 'L:baths.feat', 'Shower Niche'], ['niches', 'L:baths.feat', 'Shower Niche'], ['2 showerhead', 'L:baths.feat', 'Multiple Shower Heads'], ['dual showerhead', 'L:baths.feat', 'Multiple Shower Heads'], ['double showerhead', 'L:baths.feat', 'Multiple Shower Heads'], ['rain shower', 'L:baths.feat', 'Rain Shower Head'], ['heated floor', 'L:baths.feat', 'Heated Floors'],
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
  ['range hood', 'hood'], ['vent hood', 'hood'], ['wine refrigerator', 'wine'], ['wine cooler', 'wine'], ['beverage refrigerator', 'bev'], ['espresso machine', 'coffee'], ['coffee maker', 'coffee'], ['garbage disposal', 'disposal'], ['instant hot', 'waterHot'], ['hotwaterfilter', 'waterHot'], ['coldwaterfilter', 'waterCold'], ['filtered water', 'waterCold'], ['filtered drinking water', 'waterCold']];
const BRAND_SYN = [['subzero', 'Sub-Zero'], ['fisherpaykel', 'Fisher & Paykel'], ['jennair', 'JennAir'], ['kitchenaid', 'KitchenAid'], ['bluestar', 'BlueStar'], ['gecafe', 'GE Café'], ['monogram', 'GE Monogram']];


/* ---- things that are a list entry (deck, pool, spa …) ---- */
const DICT_ITEMS = [
  ['roof deck', 'outdoorLiving', 'Roof Deck'], ['deck', 'outdoorLiving', 'Deck'], ['decking', 'outdoorLiving', 'Deck'], ['patio', 'outdoorLiving', 'Patio'], ['porch', 'outdoorLiving', 'Porch'], ['balcony', 'outdoorLiving', 'Balcony'], ['veranda', 'outdoorLiving', 'Veranda'], ['portico', 'outdoorLiving', 'Portico'], ['loggia', 'outdoorLiving', 'Loggia'], ['courtyard', 'outdoorLiving', 'Courtyard'],
  ['pool', 'waterFeatures', 'pool'], ['swimming pool', 'waterFeatures', 'pool'], ['spa', 'waterFeatures', 'spa'], ['hottub', 'waterFeatures', 'Above-ground Spa / Hot Tub'], ['fountain', 'waterFeatures', 'Fountain'], ['koi pond', 'waterFeatures', 'Koi Pond'], ['pond', 'waterFeatures', 'Pond'], ['waterfall', 'waterFeatures', 'Waterfall'], ['outdoor shower', 'waterFeatures', 'OutdoorShower'], ['sauna', 'waterFeatures', 'Sauna'], ['cold plunge', 'waterFeatures', 'Cold Plunge'],
  ['shed', 'outbuildings', 'Shed'], ['tuff shed', 'outbuildings', 'Shed'], ['storage shed', 'outbuildings', 'Shed'], ['garden shed', 'outbuildings', 'Shed'], ['greenhouse', 'outbuildings', 'Greenhouse']];
const ITEM_MAT = [['wood', 'Wood'], ['wooden', 'Wood'], ['composite', 'Composite'], ['concrete', 'Concrete'], ['stamped concrete', 'Concrete'], ['paver', 'Pavers'], ['brick', 'Brick'], ['flagstone', 'NaturalStone'], ['stone', 'NaturalStone'], ['slate', 'NaturalStone'], ['vinyl', 'Vinyl'], ['metal', 'Metal'], ['fiberglass', 'Fiberglass']];
const POOL_FEAT = [['heated', 'Heated'], ['solar heated', 'Solar Heated'], ['saltwater', 'Salt Water'], ['autocover', 'Automatic Cover'], ['safety fence', 'Safety Fence'], ['spillover', 'Spa Spillover'], ['slide', 'Water Slide'], ['diving board', 'Diving Board'], ['baja shelf', 'Baja Shelf']];
const POOL_MAT = [['gunite', 'Gunite / Plaster'], ['plaster', 'Gunite / Plaster'], ['pebble', 'Pebble Finish'], ['pebble tec', 'Pebble Finish'], ['tile', 'Tile'], ['fiberglass', 'Fiberglass'], ['vinyl', 'Vinyl Liner']];
const OL_FEAT = [['covered', 'Covered'], ['partially covered', 'Partially Covered'], ['screened', 'Screened'], ['enclosed', 'Enclosed'], ['heated', 'Heated'], ['ceiling fan', 'Ceiling Fans'], ['lighting', 'Lighting'], ['builtin seating', 'Built-in Seating'], ['awning', 'Retractable Awning']];

/* ---- words that only count with the right word in the same sentence (6k) ----
   [field, values (null = any), words one of which must be in the sentence, or the area she is in, synonyms too?] */
const DICT_NEED = [
  ['systems.heatFuel', ['Wood', 'Solar', 'Electric', 'Propane', 'Geothermal'], ['heat', 'heating', 'heater', 'furnace', 'fireplace', 'stove', 'fuel'], 'systems', false],
  ['systems.heat', ['Baseboard', 'Fireplace', 'Stove', 'Radiators', 'Radiant', 'PassiveSolar'], ['heat', 'heating', 'heater', 'furnace', 'warm'], 'systems', true],
  ['front.roofMat', ['Wood', 'Copper', 'Metal', 'Concrete', 'Slate', 'Clay', 'Asphalt', 'Rubber', 'Synthetic', 'CeramicTile', 'TarAndGravel'], ['roof', 'roofing', 'shingle', 'shake', 'reroof'], null, false],
  ['front.roofStyle', null, ['roof', 'roofline', 'lowprofile'], null, false],
  ['front.walls', ['Glass', 'Wood', 'Brick', 'Stone', 'Aluminum', 'Vinyl', 'Steel', 'Log', 'ConcreteBlock', 'PouredConcrete', 'Adobe', 'EngineeredWood'], ['wall', 'siding', 'exterior', 'clad', 'veneer', 'sided'], null, false],
  ['front.windows', ['Wood', 'Aluminum', 'Vinyl', 'Steel', 'Bronze', 'Fiberglass', 'Picture'], ['window'], null, false],
  ['front.frontDoor', null, ['door', 'entry'], null, false], ['interior.intDoors', null, ['door'], null, true], ['interior.extDoors', null, ['door'], null, false],
  ['interior.atticObs', null, ['attic'], null, true], ['interior.atticAccess', null, ['attic'], null, true], ['interior.atticFinish', null, ['attic'], null, true],
  ['interior.areaSource', null, ['area', 'source', 'measured', 'record', 'assessor', 'square'], null, true],
  ['garage.*', null, ['garage', 'carport'], 'garage', true], ['interior.laundry', ['In Garage'], ['laundry', 'washer', 'dryer', 'hookup'], null, true], ['front.foundType', ['ConcretePerimeter'], ['foundation', 'raised', 'crawlspace'], null, true],
  ['amenities.walks', null, ['walk', 'walkway', 'path', 'pathway', 'walking'], null, false], ['amenities.fenceMat', null, ['fence', 'fencing'], null, false],
  ['site.view', null, ['view', 'views', 'overlook', 'vista'], null, false], ['site.viewMore', null, ['view', 'views', 'overlook', 'vista'], null, false],
  ['street.*', null, ['street', 'road'], 'street', false], ['driveway.*', null, ['driveway', 'drive'], 'driveway', false]];
const OUTSIDE_TABS = new Set(['street', 'driveway', 'front', 'garage', 'exterior', 'site', 'amenities']);
const STRICT_CUE = new Set(['interior.intDoors', 'interior.extDoors', 'front.frontDoor']);
const NOTE_KEY = { street: 'street.note', driveway: 'driveway.note', front: 'front.note', garage: 'garage.note', exterior: 'exterior.note', site: 'site.note', amenities: 'amenities.note', interior: 'interior.note', systems: 'systems.note' };
const NOTE_NOISE = new Set('both large new time along line perimeter number also there here rooms room left right inside outside just about around approximately really pretty good great well'.split(' '));
const REPORT_RX = /\b(?:owner|owners|seller|sellers|occupant|tenant|borrower|agent|listing agent)\s+(?:reports?|reported|said|says|states?|stated|mentioned|indicated|told me)\b|\bper (?:the )?(?:owner|seller|agent)\b|\baccording to (?:the )?(?:owner|seller|agent)\b/;
const UPDATE_RX = /\b(?:remodel\w*|renovat\w*|reconfigur\w*|replaced|installed|painted|added|addition|upgrade\w*|updated|new|repiped|rebuilt|reroofed|redone|gutted)\b|\b(?:19|20)\d\d\b/;
const RECENT15 = [[/interior doors?/, 'Interior Doors'], [/exterior doors?/, 'Exterior Doors'], [/landscap/, 'Landscaping'], [/hardscape|driveway/, 'Driveway / Hardscape'], [/insulation/, 'Insulation'], [/windows?/, 'Windows'], [/water heater/, 'Water Heater'],
  [/furnace|hvac|heating/, 'HVAC / Furnace'], [/air condition|\bac\b/, 'Air Conditioning'], [/flooring|floors/, 'Flooring'], [/fenc|gates?/, 'Fencing / Gates'], [/electrical|panel/, 'Electrical / Panel'], [/plumbing|repipe/, 'Plumbing / Repipe'], [/gutters?/, 'Gutters'],
  [/garage door/, 'Garage Door'], [/appliances?/, 'Appliances'], [/stucco|siding/, 'Stucco / Siding'], [/sewer lateral/, 'Sewer Lateral'], [/pool|spa equipment/, 'Pool / Spa Equipment'], [/foundation/, 'Foundation Work']];
const dkTime = yrs => yrs < 1 ? 'LessThanOneYear' : yrs <= 5 ? 'OneToFiveYears' : yrs <= 10 ? 'FiveToTenYears' : 'TenOrMoreYears';
const dkSentence = s => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? '' : '.') : ''; };

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
    if (!v.key.startsWith('L:') && !v.syn && (v.ph.length > 1 && v.ph.some(w => itemWords.has(w)) || v.ph.length === 1 && itemWords.has(v.ph[0]))) vals.splice(i, 1); }
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
/* ---- her inspection notes offered next to the matching comment box on the Summaries tab (6r); nothing is added until she taps it ---- */
const DK_NOTE_MAP = { exterior: ['front.note', 'exterior.note'], interior: ['interior.note', 'systems.note', 'L:rooms', 'L:bedrooms', 'L:baths', 'L:kitchens', 'L:wetbars'],
  vehicle: ['garage.note', 'driveway.note'], amenities: ['amenities.note', 'L:outdoorLiving', 'L:waterFeatures'], siteFeatures: ['site.note', 'street.note'], outbuilding: ['L:outbuildings'], adu: ['L:adus'] };
function dkNoteSugg(ins, id) {
  const src = DK_NOTE_MAP[id]; if (!src) return '';
  const have = ((ins.comments[id] || '') + ' ' + (ins.finals[id] || '')).toLowerCase(); const out = [];
  const addText = (t, who) => String(t || '').split(/\n+|(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.length > 3 && !/\(report: [QC]\d\)/.test(x)).forEach(x => { if (!have.includes(x.toLowerCase()) && !out.some(o => o.t === x)) out.push({ t: x, who }); });
  src.forEach(k => { if (k.startsWith('L:')) { const L = k.slice(2); (ins.lists[L] || []).forEach((it, i) => it.note && addText(it.note, LISTS[L].name(it, i, ins.lists[L]))); }
    else { const [sec, f] = k.split('.'); const d = ins.data[sec] || {}; if (d[f]) addText(d[f], (SECTIONS.find(x => x.id === sec) || {}).title); } });
  if (!out.length) return '';
  return `<div class="dk-sugg"><div class="flabel"><span class="tag">From your notes</span><span class="lab">Tap a line to add it to your comment – then read it over</span></div>
    ${out.map(o => `<button class="dk-sg" data-addnote="${id}" data-text="${esc(o.t)}"><small>${esc(o.who || '')}</small> ${esc(o.t)}</button>`).join('')}
    ${out.length > 1 ? `<button class="btn sm" data-addallnotes="${id}">Add all ${out.length}</button>` : ''}</div>`;
}

/* ---- walk-through mode (6r): kept on this iPad ---- */
function dkWalk() { try { return localStorage.getItem('uad-dk-walk') === '1'; } catch (e) { return false; } }
function dkSetWalk(on) { try { localStorage.setItem('uad-dk-walk', on ? '1' : '0'); } catch (e) {} }

/* ---- words she has taught it (6q): "when the iPad writes X, I mean Y" – kept on this iPad for every inspection ---- */
const DK_TEACH_KEY = 'uad-dk-teach';
function dkTeachList() { try { const a = JSON.parse(localStorage.getItem(DK_TEACH_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => x && x.heard) : []; } catch (e) { return []; } }
function dkTeachSave(list) { try { localStorage.setItem(DK_TEACH_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
const dkRxEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function dkTeachApply(text) { let t = String(text || '');
  dkTeachList().slice().sort((a, b) => b.heard.length - a.heard.length).forEach(({ heard, meant }) => { const h = heard.trim(); if (!h) return;
    const rx = new RegExp((/^\w/.test(h) ? '\\b' : '') + dkRxEsc(h).replace(/\s+/g, '\\s+') + (/\w$/.test(h) ? '\\b' : ''), 'gi'); t = t.replace(rx, () => meant == null ? '' : meant); });
  return t; }
function dkLines(text) { return String(text || '').replace(/:[ \t]*\n+\s*/g, ': ').replace(/([.!?;])?[ \t]*\n+\s*/g, (m, p) => p ? p + ' ' : '. '); }
function dkSpoken(text) {   // her taught words first; then spoken commands: "accept" ends a sentence, "scratch that" drops the sentence it is in
  return dkTeachApply(text).replace(/[^.!?\n]*\bscratch that\b[.!,]?/gi, '').replace(/\s*\baccept\b[.,!]?/gi, '.').replace(/\.(\s*\.)+/g, '.');
}

/* ---- "<field name> <answer>" and component conditions (6x) ---- */
const dkNorm = x => ' ' + String(x || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/&/g, ' and ').replace(/[’']/g, '').replace(/(\d)\s*-\s*(\d)/g, '$1 to $2').replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const DK_NUMW = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', ten: '10', twenty: '20', fifteen: '15', thirty: '30' };
const dkNum = x => x.replace(/\b(one|two|three|four|five|six|ten|fifteen|twenty|thirty)\b/g, m => DK_NUMW[m]);
const DK_COND = [[/ damaged (?:and |but )?(?:still )?functional /, 'DamagedAndFunctional'], [/ damaged (?:and )?(?:non ?functional|not functional|not working) /, 'DamagedAndNonfunctional'], [/ (?:new or like new|like new|brand new|new condition) /, 'NewOrLikeNew'], [/ no finish /, 'NoFinish'],
  [/ (?:typical|normal|average) wear(?: and tear)? | wear and tear | typical condition | twt /, 'TypicalWearAndTear']];
const DK_PARTS = [['front.roofCond', / roof /], ['front.wallsCond', / (?:exterior walls?|walls?|siding|stucco|trim) /], ['front.winCond', / windows? /], ['front.foundCond', / foundation /]];
let DK_LABELS = null;
function dkLabelFields() {
  if (DK_LABELS) return DK_LABELS; const out = [];
  SECTIONS.forEach(sec => { if (!DICT_TABS.includes(sec.id)) return; sec.groups.forEach(g => g.fields.forEach(f => { if (!['one', 'yn', 'multi', 'count'].includes(f.t) || f.link) return;
    const lab = dkNorm(f.l).trim(); if (lab.length < 8 || /^(material|type|features|notes?|condition)$/.test(lab)) return; out.push({ key: sec.id + '.' + f.k, lab, f, sec: sec.id }); })); });
  return (DK_LABELS = out.sort((a, b) => b.lab.length - a.lab.length));
}
function dkAnswer(f, rest) {
  rest = dkNum(rest).replace(/^ (?:is|are|was|were|equals|of|about|approximately|around) /, ' ');
  if (f.t === 'yn') { if (/^ (?:yes|yeah|yep|true|present|observable|observed|visible|typical) /.test(rest)) return [true]; if (/^ (?:no|none|nope|false|not) /.test(rest)) return [false]; return []; }
  if (f.t === 'count') { const m = /^ (\d{1,2}) /.exec(rest); return m ? [+m[1]] : []; }
  const O = (typeof optsOf === 'function' ? optsOf(f, {}) : f.o) || []; const hits = [];
  if (O.some(o => o[0] === 'TypicalWearAndTear')) { const c = DK_COND.find(([rx]) => rx.test(rest.slice(0, 40))); if (c) return [c[1]]; }
  if (O.some(o => o[0] === 'OneToTenYears')) { const m = / (\d{1,2})(?: to (\d{1,2}))? years?/.exec(rest), lt = / less than (?:a|1) years? | brand new | new roof /.test(rest); if (lt) return ['LessThanOneYear'];
    if (m) { const y = +(m[2] || m[1]); return [y < 1 ? 'LessThanOneYear' : y <= 10 ? 'OneToTenYears' : y <= 20 ? 'TenToTwentyYears' : 'TwentyOrMoreYears']; } if (/ (?:20|twenty) (?:or more|plus)| over 20 /.test(rest)) return ['TwentyOrMoreYears']; }
  const cand = O.map(([v, l]) => ({ v, n: [dkNorm(l), dkNorm(v.replace(/([a-z])([A-Z])/g, '$1 $2'))] })).sort((a, b) => Math.max(...b.n.map(x => x.length)) - Math.max(...a.n.map(x => x.length)));
  let r = rest; for (let k = 0; k < 4; k++) { const c = cand.find(c => c.n.some(n => n.trim() && r.startsWith(n))); if (!c) break; hits.push(c.v); if (f.t !== 'multi') break; const n = c.n.find(n => n.trim() && r.startsWith(n)); r = r.slice(n.length - 1).replace(/^ (?:and|with|plus) /, ' '); }
  return hits;
}
const DK_LBL_STOP = new Set('a an the is are was were and of from to with yes no not none years year old about approximately around roughly typical normal average wear tear condition roof walls wall exterior trim siding stucco windows window foundation components component parts all every visible observable observed viewed street like new damaged but functional nonfunctional non finish brand'.split(' '));
function dkLabelAnswers(text, put) {
  const full = new Set();
  String(text || '').split(/[.;!?\n]+/).forEach(raw => { const sn = dkNorm(raw); if (sn.length < 6) return; const vocab = new Set(DK_LBL_STOP); let any = false;
    const colon = /^\s*([^:]{2,30}):/.exec(raw); if (colon) dkNorm(colon[1]).trim().split(' ').forEach(w => vocab.add(w));
    if (/\b(?:owner|seller|tenant|agent)s? (?:reports?|reported|said|says|states?|mentioned)/.test(sn)) return;
    let used = false;
    dkLabelFields().forEach(L => { const i = sn.indexOf(' ' + L.lab + ' '); if (i < 0) return; const rest = sn.slice(i + L.lab.length + 1); const v = dkAnswer(L.f, rest); if (v.length) { v.forEach(x => put(L.key, x)); used = true; any = true;
      L.lab.split(' ').forEach(w => vocab.add(w)); const O = (typeof optsOf === 'function' ? optsOf(L.f, {}) : L.f.o) || []; v.forEach(x => { const o = O.find(o => o[0] === x); if (o) dkNorm(o[1]).trim().split(' ').forEach(w => vocab.add(w)); String(x).toLowerCase().split(/(?=[a-z])/).forEach(w => vocab.add(w)); vocab.add(String(x).toLowerCase()); }); } });
    const c = DK_COND.find(([rx]) => rx.test(sn)); if (c && !used) { any = true; const all = / (?:all|every) (?:exterior )?(?:components?|parts?)| exterior components? /.test(sn); DK_PARTS.forEach(([k, rx]) => { if (all || rx.test(sn)) put(k, c[1]); }); }
    if (/ roof (?:is |was )?(?:observable|observed|visible|viewed) | roof observed /.test(sn) && !/ roof (?:is |was )?not /.test(sn)) put('front.roofObs', true);
    const ra = / roof (?:is |was )?(?:about |approximately |around |roughly )?(\d{1,2})(?: to (\d{1,2}))? years? old /.exec(dkNum(sn)); if (ra) { any = true; const y = +(ra[2] || ra[1]); put('front.roofAge', y < 1 ? 'LessThanOneYear' : y <= 10 ? 'OneToTenYears' : y <= 20 ? 'TenToTwentyYears' : 'TwentyOrMoreYears'); }
    if (/ roof (?:is |was )?(?:observable|observed|visible|viewed) | roof observed /.test(sn)) any = true;
    if (any && dkNum(sn).trim().split(' ').every(w => !w || vocab.has(w) || /^\d+$/.test(w) || w.length < 2)) full.add(sn); });
  return full;
}
function dictParse(text, ins) {
  text = dkLines(dkSpoken(text));
  const IX = dictIndex(); const T = dictTokens(text); const n = T.length;
  const at = (i, ph) => { for (let j = 0; j < ph.length; j++) { const t = T[i + j]; if (!t || t.br || t.s !== ph[j]) return false; } return true; };
  const longest = (i, list) => { let best = null; list.forEach(e => { if ((!best || e.ph.length > best.ph.length) && at(i, e.ph)) best = e; }); return best; };
  // sentences: which one each word is in, its words, her own wording, and whether it is what the owner told her
  const sentOf = []; const sentW = [[]]; T.forEach((t, j) => { sentOf[j] = sentW.length - 1; if (t.br) sentW.push([]); else sentW[sentW.length - 1].push(t); });
  const rawS = String(text || '').replace(/\b([qc])\.\s*(\d)/gi, '$1$2').replace(/(\d)\.5(?=\s+bath)/gi, '$1 5').replace(/\s*\b(?:colin|colon)\b/gi, ':').replace(/\btrailer patio\b/gi, 'trellised covered patio').replace(/\btough shed/gi, 'Tuff Shed').replace(/\b(?:mealie|millie|miele)(\d?)\b/gi, (m, d) => 'Miele' + (d ? ' ' + d : '')).replace(/\bcarr\b/gi, 'car').replace(/\b(?:solitude|solar tube)\b/gi, 'Solatube').replace(/\b(rear|front)\s+inside\s+yards?\b/gi, '$1 and side yards').replace(/\bwindows or\b/gi, 'windows are').split(/[.;!?]+/);   // her notes read the way she meant them
  const sentText = k => dkSentence(rawS.length === sentW.length ? rawS[k] : sentW[k].map(t => t.w).join(' '));
  const sentStems = sentW.map(ws => new Set(ws.map(t => t.s)));
  const report = new Set(); let inRep = false;
  sentW.forEach((ws, k) => { const w = ws.map(t => t.w).join(' '); if (REPORT_RX.test(w)) inRep = true; else if (inRep && !UPDATE_RX.test(w)) inRep = false; if (inRep && ws.length) report.add(k); });
  T.forEach((t, j) => { if (report.has(sentOf[j])) t.rep = true; });
  const SPECIAL = /^(qrate|crate)[1-6]$|^ceilht(\d+|2story)$|^stories[1-4]$|^garcar[1-9]$|^islands[1-9]$|^fpcount[1-9]$|^bedcount[1-9]$|^bathcount[1-9]$|^halfcount[1-9]$|^lvl(\d|b1)$|^fireplace$|^frontelev\d+$/;
  // pass 1: longest match wins; on a tie: room > item > area > cue > value
  const marks = []; let tabs = [], pref = [], inside = false;
  for (let i = 0; i < n; i++) { const t = T[i]; if (t.br || t.rep) continue;
    if (SPECIAL.test(t.s)) { marks.push({ i, len: 1, kind: 'sp', s: t.s, tabs: [...tabs], pref: [...pref] }); continue; }
    const startOK = i === 0 || T[i - 1].br || /^(interior|inside|lvl\w+)$/.test(T[i - 1].s);
    const r = longest(i, IX.rooms.filter(x => !x.c || startOK)), it = longest(i, IX.items), c = longest(i, IX.ctx), q = longest(i, IX.cue), ap = longest(i, IX.appl), br = longest(i, IX.brands);
    const vv = IX.vals.filter(e => at(i, e.ph)); const vlen = vv.reduce((m, e) => Math.max(m, e.ph.length), 0); const vals = vv.filter(e => e.ph.length === vlen);
    const len = x => x ? x.ph.length : 0; const L = Math.max(len(r), len(it), len(c), len(q), len(ap), len(br), vlen); if (!L) continue;
    let m;
    if (len(r) === L && i > 0 && !T[i - 1].br && (/^(as|like)$/.test(T[i - 1].s) || T.slice(Math.max(0, i - 4), i).some((t, k, A) => t.s === 'same' && !A.slice(k).some(x => x.br)))) { let nx = T[i + L], ex = 0; if (nx && nx.s === 'number') { ex = 1; nx = T[i + L + 1]; }
      if (nx && !nx.br && /^\d$/.test(nx.s)) { marks.push({ i, len: L + 1 + ex, kind: 'roomref', list: r.a, props: r.b, num: nx.s, tabs: [...tabs] }); i += L + ex; continue; } }
    if (len(r) === L) { m = { kind: 'room', list: r.a, props: { ...r.b } }; inside = true; tabs = ['interior']; pref = [];
      let nx = T[i + L], extra = 0; if (nx && !nx.br && nx.s === 'number' && T[i + L + 1] && /^\d$/.test(T[i + L + 1].s)) { extra = 1; nx = T[i + L + 1]; }
      if (nx && !nx.br && /^\d$/.test(nx.s)) { m.num = nx.s; marks.push({ i, len: L + 1 + extra, ...m, tabs: [...tabs] }); i += L + extra; continue; }
      if (['bedrooms', 'baths'].includes(r.a) && /s$/.test(T[i + L - 1].w)) { marks.push({ i, len: L, kind: 'none', unused: true, tabs: [...tabs] }); i += L - 1; continue; }   // "both bathrooms …" is not a new bath
      if (r.a === 'rooms' && T[i + L] && T[i + L].sl) { const r2 = longest(i + L, IX.rooms.filter(x => x.a === 'rooms')); if (r2) { const cap = w => w[0].toUpperCase() + w.slice(1); m.props.label = cap(T[i].w) + '/' + cap(T[i + L].w); marks.push({ i, len: L + r2.ph.length, ...m, tabs: [...tabs] }); i += L + r2.ph.length - 1; continue; } } }
    else if (len(it) === L) m = { kind: 'item', list: it.a, type: it.b, val: vals.find(v => v.key.startsWith('L:')) ? vals : null };
    else if (len(c) === L && /^(street|road)$/.test(c.ph.join(' ')) && i > 0 && !T[i - 1].br && /^(from|the|to|on|of|across|down|up)$/.test(T[i - 1].s)) { i += L - 1; continue; }
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
    if (!m.num && !(m.props || {}).label && ['baths', 'bedrooms'].includes(m.list) && T[m.i + 1] && /^(quality|condition|rating)$/.test(T[m.i + 1].s)) { const last = rooms.map((x, k) => x.list === m.list ? k : -1).filter(k => k >= 0).pop(); if (last !== undefined) { room = last; return last; } }
    if (room !== null && rooms[room].list === m.list && !m.num && !(m.props || {}).label && !T.slice(rooms[room].at, m.i).some(t => t.br)) { if (m.props && m.props.kind) rooms[room].kind = m.props.kind; return room; }
    const key = roomKey(r); let idx = rooms.findIndex(x => x.key === key); if (idx >= 0) rooms[idx].at = m.i;
    if (idx < 0) { r.key = key; if (ctxLevel) r.level = ctxLevel; rooms.push(r); idx = rooms.length - 1; }
    room = idx; roomBreak = false; return idx; };
  const ITEM_WORDS = new Set([...ITEM_MAT, ...POOL_MAT, ...POOL_FEAT, ...OL_FEAT, ['attached'], ['cover']].map(x => phraseOf(x[0]).join(' ')));
  const nearestItem = j => { let best = null, bd = 99; marks.forEach(o => { if (o.kind !== 'item' || o.asVal) return; const d = j < o.i ? o.i - j : j - (o.i + o.len - 1); if (d <= 6 && d < bd && sameSentence(j, o.i)) { best = o; bd = d; } }); return best && (best.alias || best); };
  const needOk = (m, k, v, syn) => { const sec = k.split('.')[0];
    for (const [nk, vals, words, tab, withSyn] of DICT_NEED) { if (!(nk === k || (nk.endsWith('.*') && nk.slice(0, -2) === sec))) continue; if (vals && !vals.includes(v)) continue; if (syn && !withSyn) continue;
      if (tab && room === null && m.tabs[0] === tab) return true; const st = sentStems[sentOf[m.i]]; return words.some(w => st.has(w)); } return true; };
  const resolve = (m, keys) => {   // which field a word belongs to
    if (room !== null) { const L = rooms[room].list; const rk = keys.filter(k => k.startsWith('L:' + L + '.'));
      const idx0 = marks.indexOf(m); const nxq = marks.slice(idx0 + 1, idx0 + 3).find(o => o.kind === 'cue' && sameSentence(o.i, m.i) && o.keys.some(y => y.startsWith('L:')));
      if (rk.length && nxq && nxq.i === m.i + m.len && !m.vals.some(v => v.syn && rk.includes(v.key)) && !rk.some(k => nxq.keys.some(y => cueMatch(y, k)))) return 'unclear';
      if (rk.length) return rk.length === 1 ? rk[0] : (cueNear(m, rk) || 'unclear'); }
    const ent = k => m.vals.find(v => v.key === k) || {};
    const okPref = k => { const pr = ent(k).pref; return !pr || (m.pref || []).some(p => pr.startsWith(p) || p.startsWith(pr)) || cueNear(m, [k]) === k; };
    let sk = keys.filter(k => !k.startsWith('L:') && okPref(k) && needOk(m, k, ent(k).v, ent(k).syn));
    if (room !== null) { const newSent = sentOf[rooms[room].at] !== sentOf[m.i]; sk = sk.filter(k => !OUTSIDE_TABS.has(k.split('.')[0]) || ((k === 'front.windows' || newSent) && cueNear(m, [k]) === k)); }   // "Fencing: wood" after the kitchen is the fence   // in a room: no roof, wall, fence … words
    else if (m.tabs.includes('interior')) sk = sk.filter(k => !OUTSIDE_TABS.has(k.split('.')[0]) || cueNear(m, [k]) === k);   // inside, an outside field needs its word ("roof", "fence" …)
    if (!sk.length) return null;
    const idx = marks.indexOf(m); const strict = marks.slice(Math.max(0, idx - 2), idx + 3).find(o => o !== m && o.kind === 'cue' && o.keys.some(x => STRICT_CUE.has(x)) && !T.slice(Math.min(o.i, m.i), Math.max(o.i, m.i)).some(t => t.br));
    if (strict) return sk.find(k => strict.keys.includes(k)) || null;   // "solid wood interior doors": not an interior-door choice → notes
    if (sk.length === 1) return sk[0];
    const cq = cueNear(m, sk); if (cq) return cq;
    for (const p of m.pref) { const k = sk.find(x => x.startsWith(p)); if (k) return k; }
    for (const s of m.tabs) { const k = sk.find(x => x.startsWith(s + '.')); if (k) return k; }
    return null; };
  let applLast = null;
  const step = (m, mi) => {
    if (m.kind === 'none') return;
    if (m.kind === 'roomref') { if (room !== null && /\bsame\b/.test(sentW[sentOf[m.i]].map(t => t.s).join(' '))) rooms[room].copyFrom = (m.list === 'bedrooms' ? 'Bedroom ' : m.list === 'baths' ? 'Bath ' : '') + m.num; return; }
    if (m.kind === 'room') { startRoom(m); return; }
    if (m.kind === 'ctx') { if (!m.tabs.includes('interior') || room !== null) { room = null; } if (!m.tabs.includes('interior')) ctxLevel = null; return; }
    if (m.kind === 'sp') { const s = m.s, num = s.replace(/^\D+/, '');
      if (/^lvl/.test(s)) { const code = LVL_CODE[s.slice(3)]; if (room !== null && sameSentence(rooms[room].at, m.i) && rooms[room].at < m.i && !rooms[room].levelSaid) { rooms[room].level = code; rooms[room].levelSaid = true; } else { ctxLevel = code; room = null; } return; }
      if (/^[qc]rate/.test(s)) { let b0 = m.i; while (b0 > 0 && !T[b0 - 1].br && m.i - b0 < 10) b0--; const back = T.slice(b0, m.i).map(t => t.s);
        if (!back.some(w => /^(exterior|interior|overall)$/.test(w)) && room !== null && ['kitchens', 'baths'].includes(rooms[room].list)) { const pre = T[m.i - 1]; if (pre && /^(low|high|mid|middle)$/.test(pre.s)) pre.item = true;
          put('L:' + rooms[room].list + '.note', (s[0] === 'q' ? 'Quality ' : 'Condition ') + (pre && /^(low|high|mid|middle)$/.test(pre.s) ? pre.w + ' ' : '') + (s[0] === 'q' ? 'Q' : 'C') + num + '.', room); return; } const lastOf = w => back.lastIndexOf(w);
        const e = lastOf('exterior'), it = lastOf('interior'), ov = lastOf('overall'); const top = Math.max(e, it, ov);
        const where = top < 0 ? (room !== null || m.tabs.includes('interior') ? 'int' : m.tabs.includes('front') ? 'ext' : 'all') : top === e ? 'ext' : top === it ? 'int' : 'all';
        const key = { ext: s[0] === 'q' ? 'front.eq' : 'front.ec', int: s[0] === 'q' ? 'interior.iq' : 'interior.ic', all: s[0] === 'q' ? 'condition.oq' : 'condition.oc' }[where];
        const R = (s[0] === 'q' ? 'Q' : 'C') + num; put(key, R);
        // her fine rating ("low Q4", "high C3", "C3 plus"): the report gets the whole step, the low/high goes in her notes
        const pre = T[m.i - 1], post = T[m.i + 1]; const fine = pre && !pre.br && /^(low|high|mid|middle|solid|strong|weak|upper|lower)$/.test(pre.s) ? pre.w + ' ' + R : post && !post.br && /^(plus|minus)$/.test(post.s) ? R + ' ' + post.w : null;
        if (fine) { (pre && fine.startsWith(pre.w) ? pre : post).item = true; put({ ext: 'front.note', int: 'interior.note', all: 'condition.supp' }[where], { ext: 'Exterior', int: 'Interior', all: 'Overall' }[where] + (s[0] === 'q' ? ' quality ' : ' condition ') + fine + ' (report: ' + R + ').'); }
        return; }
      if (/^frontelev/.test(s)) { const inch = +s.slice(9); const B = ['UpToOneFoot', 'OneToTwoFeet', 'TwoToThreeFeet', 'ThreeToFourFeet', 'FourToFiveFeet', 'FiveToSixFeet', 'SixToSevenFeet', 'SevenToEightFeet', 'EightToNineFeet', 'NineToTenFeet'];
        put('front.frontElev', inch <= 0 ? 'GroundLevel' : inch >= 120 ? 'TenOrMoreFeet' : B[Math.ceil(inch / 12) - 1]); return; }
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
      if (ri === null) { m.unused = true; return; }
      const r = rooms[ri]; r.appl = r.appl || {};
      if (m.kind === 'appl') { const a = r.appl[m.k] = r.appl[m.k] || {}; const prev = marks[mi - 1], prev2 = marks[mi - 2]; const bm = [prev, prev2].find(o => o && o.kind === 'brand' && m.i - o.i <= 3 && sameSentence(o.i, m.i));
        if (bm) a.brand = bm.b; else if (r.sentBrand && r.sentBrand.k === sentOf[m.i] && !a.brand) { a.brand = r.sentBrand.b; r.brandUsed = [...(r.brandUsed || []), r.sentBrand.b]; }   // "all appliances are Miele and include …"
        const qn = T[m.i - 1] && /^\d$/.test(T[m.i - 1].s) ? +T[m.i - 1].s : m.q; if (qn) a.qty = qn; applLast = m.k; }
      else { const nx = marks.slice(mi + 1, mi + 3).find(o => o.kind === 'appl' && o.i - m.i <= 3 && sameSentence(o.i, m.i)); if (!nx) { r.brandsSaid = [...new Set([...(r.brandsSaid || []), m.b])]; r.sentBrand = { b: m.b, k: sentOf[m.i] }; } }
      return; }
    if (m.kind === 'item') { if (room !== null && m.val) { const rk = m.val.filter(v => v.key.startsWith('L:' + rooms[room].list + '.')); if (rk.length) { m.asVal = true; put(rk[0].key, rk[0].v, room); if (rk[0].key.endsWith('.feat')) put('L:' + rooms[room].list + '.hasFeat', true, room); return; } }
      if (m.list === 'outbuildings') { const prevO = items.filter(o => o.list === 'outbuildings').pop(); const pv = T[m.i - 1]; if (prevO && pv && !pv.br && /^(the|that|this)$/.test(pv.s)) { m.alias = prevO; prevO.sks.push(sentOf[m.i]); return; } }   // "the shed has wood stairs" = the same shed
      room = null; m.words = []; m.sks = [sentOf[m.i]]; m.txt = T.slice(m.i, m.i + m.len).map(t => t.s).join(' '); items.push(m); return; }
    if (m.kind === 'val' && m.skip) return;
    if (m.kind === 'val') { const keys = [...new Set(m.vals.map(v => v.key))];
      const stems = T.slice(m.i, m.i + m.len).map(t => t.s).join(' '), word = T.slice(m.i, m.i + m.len).map(t => t.w).join(' ');
      const pv = T[m.i - 1]; if (pv && !pv.br && /^(no|not|without|none|non)$/.test(pv.s)) { m.unused = true; const ss = [...new Set(keys.filter(k => !k.startsWith('L:')).map(k => k.split('.')[0]))]; if (ss.length === 1 && NOTE_KEY[ss[0]]) m.negSec = ss[0]; return; }   // "no solar": nothing ticked, the sentence goes to her notes
      if (room === null) { const nb = [marks[mi - 1], marks[mi + 1]].filter(o => o && o.kind === 'item' && Math.abs(o.i - m.i) <= 3 && sameSentence(o.i, m.i)).sort((a, b) => Math.abs(a.i - m.i) - Math.abs(b.i - m.i))[0];
        const nxc = marks[mi + 1]; const cueAfter = nxc && nxc.kind === 'cue' && nxc.i === m.i + m.len && keys.some(k => nxc.keys.includes(k));
        if (nb && ITEM_WORDS.has(stems) && !cueAfter) { m.taken = nb.alias || nb; return; } }   // "wood decking", "pebble pool"
      if (stems === 'stainles' || stems === 'stainless') { const ri = room !== null && rooms[room].list === 'kitchens' ? room : null; if (ri !== null) { rooms[ri].stainless = true; return; } }
      const key = resolve(m, keys);
      if (!key || key === 'unclear') { m.unused = true; return; }   // not sure where it goes: the sentence goes to the notes
      const v = m.vals.find(x => x.key === key).v; const ri = key.startsWith('L:') ? room : undefined;
      if (v && typeof v === 'object' && v.note) { if (room !== null) rooms[room].notes = [...(rooms[room].notes || []), v.note]; else m.unused = true; return; }
      put(key, v, ri);
      if (key === 'interior.fpType') { fpMentions++; if (room !== null && LISTS[rooms[room].list].fields.some(f => f.k === 'feat' && optsOf(f, {}, null).some(o => o[0] === 'Fireplace'))) { put('L:' + rooms[room].list + '.feat', 'Fireplace', room); put('L:' + rooms[room].list + '.hasFeat', true, room); } }
      if (ri !== undefined) { const L = rooms[ri].list; if (key.endsWith('.feat') && LISTS[L].fields.some(f => f.k === 'hasFeat')) put('L:' + L + '.hasFeat', true, ri);
        if (key === 'L:baths.showerMat') put('L:baths.shower', true, ri); if (key === 'L:baths.tubShowerMat') put('L:baths.tubShower', true, ri); if (key === 'L:baths.tubFreeMat') put('L:baths.tubFree', true, ri); }
      if (key === 'systems.renew') { const win = T.slice(Math.max(0, m.i - 2), m.i + m.len + 2); const near = win.map(t => t.s).join(' '); win.forEach(t => { if (/^(own|owned|leased?|ppa)$/.test(t.s)) t.item = true; });
        if (/\b(own|owned)\b/.test(near)) put('systems.solarOwn', 'Owned'); else if (/\bleas(e|ed)\b/.test(near)) put('systems.solarOwn', 'Leased'); else if (/\bppa\b|power purchase/.test(near)) put('systems.solarOwn', 'PowerPurchaseAgreement'); } }
  };
  marks.forEach((m, mi) => { step(m, mi); m.st = { room, tabs: m.tabs || [] }; });
  // what the owner told her: kitchen / bath / roof years, additions, recent updates → Interview tab; the sentences → "Anything else the interviewee mentioned"
  if (report.size) { const now = new Date().getFullYear(); let lastYr = null; const txts = []; room = null;
    [...report].sort((a, b) => a - b).forEach(k => { const w = sentW[k].map(t => t.w).join(' '); const txt = sentText(k); txts.push(txt);
      const ys = w.match(/\b(?:19|20)\d\d\b/g); let yr = ys ? +ys[ys.length - 1] : null; if (!yr && /\bat that time\b|\bthen\b/.test(w)) yr = lastYr; if (yr) lastYr = yr;
      const upd = /remodel|renovat|updated|upgrade|redone|gutted|reconfigur/.test(w); const yrOpt = (y, min) => y >= min ? String(y) : 'Before ' + min;
      if (/\bkitchens?\b/.test(w) && upd) { let ri = rooms.findIndex(r => r.list === 'kitchens'); if (ri < 0) ri = startRoom({ list: 'kitchens', props: {}, i: T.indexOf(sentW[k][0]) });
        put('L:kitchens.upd', 'FullyUpdated', ri); if (yr) { put('L:kitchens.time', dkTime(now - yr), ri); put('interview.kitYear', yrOpt(yr, 2000)); put('interview.kitScope', 'Remodeled'); } }
      if (/\bbath(?:room)?s?\b/.test(w) && upd) { const all = rooms.map((r, i) => r.list === 'baths' ? i : -1).filter(i => i >= 0); const nm = w.match(/\bbath(?:room)? (\d)\b/);
        const bi = /\b(?:both|all)\b|bath(?:room)?s\b/.test(w) ? all : nm ? all.filter(i => rooms[i].num === nm[1]) : all.length === 1 ? all : [];
        bi.forEach(ri => { put('L:baths.upd', 'FullyUpdated', ri); if (yr) put('L:baths.time', dkTime(now - yr), ri); }); if (yr) { put('interview.bathYear', yrOpt(yr, 2000)); put('interview.bathScope', 'Remodeled'); } }
      if (/\broof\b/.test(w) && /install|replac|\bnew\b|reroof/.test(w) && !/garage|shed|patio|porch|carport/.test(w) && yr) put('interview.roofYear', yrOpt(yr, 1980));
      if (/\baddition\b|\badded\b/.test(w)) put('interview.addDesc', txt.replace(/\.$/, '') + (yr && !txt.includes(String(yr)) ? ' (' + yr + ')' : ''));
      if (!yr || now - yr <= 15) { RECENT15.forEach(([rx, v]) => { if (rx.test(w) && (upd || /replac|install|\bnew\b|upgrade/.test(w))) put('interview.recent15', v); });
        if (/paint/.test(w)) { if (/\binterior\b/.test(w)) put('interview.recent15', 'Interior Paint'); if (/\bexterior\b/.test(w)) put('interview.recent15', 'Exterior Paint'); } }
      if (/\b(?:shed|outbuilding|greenhouse|studio)\b/.test(w)) { const ob = items.filter(o => o.list === 'outbuildings').pop(); if (ob) { if (/unpermitted|not permitted|no permit/.test(w)) ob.permitted = 'No'; else if (/\bpermitted\b/.test(w)) ob.permitted = 'Yes'; ob.repTxt = [...(ob.repTxt || []), txt]; } }
    });
    put('interview.asked', txts.join(' '));
    const allW = txts.join(' ').toLowerCase(); if (/\bowners?\b/.test(allW)) put('interview.who', 'Owner'); if (/\bagent\b/.test(allW)) put('interview.who', 'Agent'); }
  if (fpMentions > 0) put('interior.fireplaces', fpMentions);
  // words around a pool / spa / deck (same sentence, up to the next comma)
  T.forEach((t, j) => { if (t.br) return; const mk = marks.find(o => j >= o.i && j < o.i + o.len); if (mk && !(mk.kind === 'val' && mk.taken)) return;
    if (t.rep) return; const o = mk && mk.taken ? mk.taken : nearestItem(j); if (o) { o.words.push(t.w); (o.wd = o.wd || []).push({ s: t.s, d: Math.abs(j - o.i) }); t.item = true; } });
  // "Bathroom 2 has the same finishes as bathroom 1": copy what was heard for that room
  rooms.forEach((r, ri) => { if (!r.copyFrom) return; const si = rooms.findIndex(x => x.list === r.list && x.label === r.copyFrom); if (si < 0 || si === ri) return;
    [...changes.values()].filter(c => c.room === si && c.f.t !== 'note').forEach(c => { if (!changes.has('R' + ri + ':' + c.key)) c.vals.forEach(v => put(c.key, v, ri)); }); });
  rooms.forEach(r => { if (r.brandUsed && r.brandsSaid) r.brandsSaid = r.brandsSaid.filter(b => !r.brandUsed.includes(b)); });
  items.forEach(m => { const nxt = marks.find(o => o.kind === 'item' && o.i > m.i); let e = m.i; while (e < n && !T[e].br && (!nxt || e < nxt.i)) e++;
    m.pp = /personal propert|no (?:contributory )?value/.test(T.slice(m.i, e).map(t => t.w).join(' ')); });
  const out = items.map(m => dictItem(m, sentText));
  if ([...changes.values()].some(c => c.key === 'amenities.fenceMat')) put('amenities.hardscape', 'Fencing');
  // the rooms as they are in the inspection now
  if (ins) rooms.forEach(r => { const L = ins.lists[r.list] || []; const ex = dkExisting(ins, r);
    if (ex) { r.existingId = ex.id; r.name = LISTS[r.list].name(ex, L.indexOf(ex), L); } });
  // 6x (Oct 20 2026): her way of going down the checklist – "<field name> <answer>" ("Roof estimated age 10 to 20 years",
  // "Roof condition typical wear and tear", "Converted area no", "Exterior quality Q4"), plus component conditions said
  // with the part ("windows and foundation typical wear and tear"). A sentence that is only that does not go to the notes.
  const dkUsed = dkLabelAnswers(text, put);
  // leftovers: a sentence with words that were not used goes, as she said it, into the notes of the room or area she was in – nothing is lost
  const stAt = j => { let st = { room: null, tabs: [] }; for (const o of marks) { if (o.i > j) break; if (o.st) st = o.st; } return st; };
  const sub = t => !DICT_FILLER.has(t.s) && !DICT_FILLER.has(t.w) && !NOTE_NOISE.has(t.s) && !/^\d+$/.test(t.s) && t.s.length >= 3;
  const left = []; const noted = new Set();
  T.forEach((t, j) => { if (t.br || t.rep || t.item) return; const mk = marks.find(m => j >= m.i && j < m.i + m.len); if (mk && !mk.unused) return; if (!sub(t)) return;
    if (dkUsed.has(dkNorm(sentText(sentOf[j])))) return;
    left.push(t.w); const k = sentOf[j]; if (noted.has(k)) return; noted.add(k); const st = stAt(j);
    if (mk && mk.negSec) put(NOTE_KEY[mk.negSec], sentText(k)); else if (st.room !== null && LISTS[rooms[st.room].list].fields.some(f => f.k === 'note')) put('L:' + rooms[st.room].list + '.note', sentText(k), st.room); else put(NOTE_KEY[st.tabs[0]] || 'front.note', sentText(k)); });
  { const fw = T.filter(t => !t.rep && !t.br).map(t => t.s).join(' ');
    if (/\b(?:oceanfront|beachfront|lakefront|creekfront|waterfront|water frontage|ocean frontage|beach frontage|on the (?:ocean|beach|lake|creek))\b/.test(fw)) {
      put('site.influences', 'BodyOfWater'); const wb = /ocean|beach/.test(fw) ? 'Ocean' : /lake/.test(fw) ? 'Lake' : /creek/.test(fw) ? 'Creek' : null; if (wb) put('site.water', wb); put('site.waterPrivate', true);
      if (/\bbeach\b|beachfront/.test(fw)) put('site.waterFeat', 'Beach'); if (/seawall|bulkhead/.test(fw)) put('site.waterFeat', 'SeawallOrBulkhead'); if (/riprap|rip rap/.test(fw)) put('site.waterFeat', 'Riprap'); if (/\bdock\b/.test(fw)) put('site.waterFeat', 'Dock');
      if (/\bdeeded\b/.test(fw)) put('site.waterRights', 'Deeded'); } }
  { const fw = T.filter(t => !t.rep && !t.br).map(t => t.w).join(' ');
    if (/\broof (?:can ?not|could ?not|cannot|is not|isnt|not) (?:be )?(?:seen|visible|observed)|roof (?:was )?not (?:visible|observable)/.test(fw)) put('front.roofObs', false);
    else if (/\broof (?:can|could|is|was)? ?(?:only )?(?:partially |partly |mostly |fully )?(?:be )?(?:seen|visible|observed|observable)/.test(fw)) put('front.roofObs', true);
    // 6w: property access – "public street / private road", "access is typical / not typical"
    if (/\bprivate (?:street|road|lane|drive)\b/.test(fw)) put('street.primaryAccess', 'PrivateStreet'); else if (/\bpublic (?:street|road)\b/.test(fw)) put('street.primaryAccess', 'PublicStreet');
    if (/\baccess (?:is )?(?:not|isnt|is not) typical|\batypical access|\baccess (?:is )?atypical/.test(fw)) put('street.accessTypical', false); else if (/\baccess (?:is )?typical|\btypical access\b/.test(fw)) put('street.accessTypical', true); }

  // her rule (Oct 2026): if she does not say a defect there is no defect → the defect questions are answered No (she can change them in the list)
  const DEFECT_RX = /\b(?:defects?|damaged?|cracks?|cracked|cracking|leaks?|leaking|rot|rotted|rotting|termites?|broken|peeling|deferred maintenance|needs? (?:repair|replacing|replacement)|water stains?|mold|mildew|missing|inoperable|not working)\b/;
  const defectSaid = sentW.some((ws, k) => { if (report.has(k)) return false; const w = ws.map(t => t.w).join(' ').replace(/\bno (?:visible |apparent |observed |known )?(?:defects?|damage|deferred maintenance|deficienc(?:y|ies))(?:[\s,]+(?:or |and )?(?:defects?|damage|deficienc(?:y|ies)|deferred maintenance))*\b/g, '').replace(/\b(?:deferred maintenance|defects?|damage|functional obsolescence)(?:[\s,:]+(?:and\s+)?(?:deferred maintenance|defects?|damage))*[\s,:]*(?:none|no|not observed|none observed|n\/?a)\b/g, ''); return DEFECT_RX.test(w); });
  if (!defectSaid) [['site', 'siteDefects'], ['exterior', 'extDefects'], ['interior', 'intDefects'], ['amenities', 'amenDefects'], ['garage', 'vsDefects']].forEach(([sec, k]) => {
    if (ins && ins.data[sec] && ins.data[sec][k] !== undefined) return; put(sec + '.' + k, false); const c = changes.get(sec + '.' + k); if (c) c.auto = 'You did not mention a defect'; });
  // the same rule for yes/no questions she would only mention when the answer is yes
  { const fw = T.filter(t => !t.rep && !t.br).map(t => t.w).join(' '); const unset = (sec, k) => !(ins && ins.data[sec] && ins.data[sec][k] !== undefined) && !changes.has(sec + '.' + k);
    const no = (sec, k, why) => { if (!unset(sec, k)) return; put(sec + '.' + k, false); const c = changes.get(sec + '.' + k); if (c) c.auto = why; };
    const garage = changes.has('garage.hasGarage') || !!(ins && ins.data.garage && ins.data.garage.hasGarage);
    if (garage && !/convert/i.test(fw)) no('garage', 'garConverted', 'You did not mention a garage conversion');
    if (garage && !/tandem/i.test(fw)) no('garage', 'garTandemYN', 'You did not mention tandem parking');
    if (rooms.length && !/non ?continuous|separate (?:living|unit)|not connected/i.test(fw)) no('interior', 'noncont', 'You did not mention a noncontinuous area');
    if (T.length && !/\b(?:55|age[- ]restrict|senior community)/i.test(fw)) no('site', 'ageRestr', 'You did not mention an age restriction'); }
  // a field she filled implies the yes/no above it (garage features → has a garage); then drop anything the tab would not show
  const has = re => [...changes.values()].some(c => c.room === undefined && re.test(c.key));
  if (has(/^garage\.(garAttach|garFinish|garFeat|garSpaces|garConverted)$/)) put('garage.hasGarage', true);
  if (has(/^interior\.attic(Obs|Access|Finish|Ceil)$/)) put('interior.attic', true);
  if (has(/^driveway\./)) put('driveway.hasDrive', true);
  if (has(/^interview\.addDesc$/) && !(ins && ins.data.interview && ins.data.interview.addPermit)) put('interview.addPermit', 'Unknown');   // she checks the permits; Unknown until then
  const fakeIns = ins || { data: {}, lists: {} };
  [...changes.entries()].forEach(([id, c]) => { if (c.room !== undefined || !c.sec || !c.f.show || DK[c.f.k]) return;
    const d = { ...((ins && ins.data[c.sec.id]) || {}) }; changes.forEach(c2 => { if (c2.room === undefined && c2.sec === c.sec) d[c2.f.k] = c2.f.t === 'multi' ? c2.vals : c2.vals[0]; });
    let ok = true; try { ok = !!c.f.show(d, fakeIns); } catch (e) { ok = true; } if (!ok) changes.delete(id); });
  const order = c => c.f.t === 'note' ? 2 : c.auto ? 1 : 0;   // notes after the choices
  out.forEach(it => { if (it.list === 'outbuildings' && !defectSaid && it.defects === undefined) it.defects = false; });
  return { defectSaid, changes: [...changes.values()].sort((a, b) => order(a) - order(b)), rooms, items: out, unclear: [...new Set(unclear)], left: [...new Set(left)] };
}
function dkExisting(ins, r) {   // the room already in the inspection that she means
  const L = ins.lists[r.list] || []; const same = x => String(x.label || '').toLowerCase() === String(r.label || '').toLowerCase();
  if (r.list === 'kitchens') return r.style ? L.find(k => k.style === r.style) : L[0] || null;
  if (r.list === 'wetbars') return L[0] || null;
  if (r.list === 'rooms') return L.find(x => r.label ? same(x) : x.type === r.type) || L.find(x => x.type === r.type) || null;
  if (r.label) return L.find(same) || (r.list === 'bedrooms' && r.label === 'Bedroom 1' && L[0] && !L[0].label ? L[0] : null) || (r.list === 'baths' && r.label === 'Bath 1' ? L.find(b => b.kind === 'FullBathroom' && !b.label) : null) || null;
  return null;
}

/* ---- photos while dictating (6o): the photo goes to the last room or area she named ---- */
const PHOTO_WORDS = [ // [what she says, tab, photo field (first of its set), only at the start of a sentence?]
  ['street', 'street', 'photoStreet', 1], ['road', 'street', 'photoStreet', 1], ['street scene', 'street', 'photoStreet'], ['driveway', 'driveway', 'photoDrive'],
  ['front', 'front', 'photoFront', 1], ['exterior', 'front', 'photoFront', 1], ['dwelling', 'front', 'photoFront', 1], ['residence', 'front', 'photoFront', 1], ['front of house', 'front', 'photoFront'], ['front elevation', 'front', 'photoFront'], ['front yard', 'amenities', 'photoLand'],
  ['rear', 'exterior', 'photoRear', 1], ['back', 'exterior', 'photoRear', 1], ['rear yard', 'exterior', 'photoRear'], ['backyard', 'exterior', 'photoRear'], ['back yard', 'exterior', 'photoRear'], ['rear elevation', 'exterior', 'photoRear'],
  ['side', 'exterior', 'photoSide', 1], ['side yard', 'exterior', 'photoSide'],
  ['garage', 'garage', 'photoGarage'], ['garage interior', 'garage', 'photoGarageInt'], ['inside the garage', 'garage', 'photoGarageInt'],
  ['site', 'site', 'photoSite', 1], ['view', 'site', 'photoView'], ['views', 'site', 'photoView'], ['landscaping', 'amenities', 'photoLand'], ['landscape', 'amenities', 'photoLand'], ['yard', 'amenities', 'photoLand', 1],
  ['water heater', 'systems', 'photoWH'], ['smoke detector', 'interior', 'photoSmoke'], ['carbon monoxide', 'interior', 'photoCO'], ['co detector', 'interior', 'photoCO'], ['attic', 'interior', 'photoAttic'], ['solar', 'systems', 'photoSolar'],
  ['tennis', 'amenities', 'photoRec'], ['sport court', 'amenities', 'photoRec'], ['pickleball', 'amenities', 'photoRec'], ['putting green', 'amenities', 'photoRec'],
  ['adu', 'adu'], ['accessory dwelling', 'adu'], ['guest house', 'adu'], ['granny unit', 'adu'], ['casita', 'adu']];
function dkPhotoTarget(text) {   // the last room or area named in the text up to where she is
  const T = dictTokens(dkLines(dkSpoken(text))); const IX = dictIndex(); const PW = PHOTO_WORDS.map(([w, sec, f, st]) => ({ ph: phraseOf(w), sec, f, st }));
  const at = (i, ph) => ph.every((x, j) => T[i + j] && !T[i + j].br && T[i + j].s === x);
  const best = (i, list) => list.filter(e => at(i, e.ph)).sort((a, b) => b.ph.length - a.ph.length)[0];
  let last = null;
  for (let i = 0; i < T.length; i++) { if (T[i].br) continue; const start = i === 0 || T[i - 1].br;
    const r = best(i, IX.rooms.filter(x => !x.c || start)), it = best(i, IX.items), w = best(i, PW.filter(x => !x.st || start));
    const len = x => x ? x.ph.length : 0; const L = Math.max(len(r), len(it), len(w)); if (!L) continue;
    if (len(r) === L) { const tg = { kind: 'room', list: r.a, props: { ...r.b } }; let nx = T[i + L], ex = 0; if (nx && !nx.br && nx.s === 'number') { ex = 1; nx = T[i + L + 1]; }
      if (nx && !nx.br && /^\d$/.test(nx.s)) { tg.num = nx.s; i += 1 + ex; } else if (['bedrooms', 'baths'].includes(r.a) && /s$/.test(T[i + L - 1].w)) { i += L - 1; continue; }
      if (r.a === 'rooms' && T[i + L] && T[i + L].sl) { const r2 = best(i + L, IX.rooms.filter(x => x.a === 'rooms')); if (r2) { const cap = x => x[0].toUpperCase() + x.slice(1); tg.props.label = cap(T[i].w) + '/' + cap(T[i + L].w); i += r2.ph.length; } }
      last = tg; }
    else if (len(it) === L) last = { kind: 'item', list: it.a, type: it.b, tuff: T.slice(i, i + L).some(t => t.s === 'tuff') };
    else last = w.sec === 'adu' ? { kind: 'adu' } : { kind: 'field', sec: w.sec, base: w.f };
    i += L - 1; }
  return last;
}
function dkRoomOf(tg) { const r = { list: tg.list, ...tg.props }; if (tg.num) { r.num = tg.num; r.label = (tg.list === 'bedrooms' ? 'Bedroom ' : tg.list === 'baths' ? (r.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') : (r.label || r.type || '') + ' ') + tg.num; } return r; }
// the photo slot for that place; make=true adds the room / pool / shed to the inspection if it is not there yet (Save fills it in later)
function dkPhotoSlot(ins, tg, make) {
  if (!tg) return null;
  if (tg.kind === 'field') { const sec = SECTIONS.find(x => x.id === tg.sec); const fs = []; sec.groups.forEach(g => g.fields.forEach(f => { if (f.t === 'photo' && (f.k === tg.base || (f.k.startsWith(tg.base) && /^\d+$/.test(f.k.slice(tg.base.length))))) fs.push(f); }));
    if (!fs.length) return null; const d = ins.data[tg.sec] || {}; const f = fs.find(x => !photosInSlot(ins, { sec: tg.sec, field: x.k }).length) || fs[fs.length - 1];
    if (make) { if (tg.sec === 'garage' && d.hasGarage === undefined) d.hasGarage = true; if (tg.sec === 'driveway' && d.hasDrive === undefined) d.hasDrive = true; if (f.k === 'photoAttic' && d.attic === undefined) d.attic = true; }
    let req = false; try { req = typeof f.req === 'function' ? !!f.req(d, ins) : !!f.req; } catch (e) {}
    return { sec: tg.sec, field: f.k, label: f.l, cat: f.cat, required: req }; }
  let key, it;
  if (tg.kind === 'room') { const r = dkRoomOf(tg); key = r.list; it = dkExisting(ins, r); if (!it) { if (!make) return { label: roomName(r), pending: true }; it = dictNewItem(ins, r); } }
  else if (tg.kind === 'adu') { key = 'adus'; it = (ins.lists.adus || [])[0]; if (!it) { if (!make) return { label: 'ADU Exterior', pending: true }; it = { id: uid(), dkPhoto: true }; ins.lists.adus.push(it); } }
  else { key = tg.list; const L = ins.lists[key]; const type = tg.type === 'pool' ? 'IngroundPool' : tg.type === 'spa' ? 'IngroundSpa' : tg.type;
    it = L.find(x => x.type === type || (tg.type === 'pool' && /Pool/.test(x.type || '')) || (tg.type === 'spa' && /Spa/.test(x.type || '')));
    if (!it) { const lab = tg.tuff ? 'Tuff Shed' : labelOf(LISTS[key].fields[0].o, type) || type; if (!make) return { label: lab, pending: true }; it = { id: uid(), type, dkPhoto: true }; if (tg.tuff) it.label = 'Tuff Shed'; L.push(it); } }
  const L = ins.lists[key]; const slots = typeof itemPhotoSlots === 'function' ? itemPhotoSlots(key, it, L.indexOf(it), ins) : [];
  return slots[0] || { list: key, item: it.id, slot: 'main', label: LISTS[key].name(it, L.indexOf(it), L), cat: 'SupplementalExhibit' };
}
function dkPhotoChoices(ins) {   // for "somewhere else": every photo spot on the shown tabs and the rooms already there
  const out = [];
  SECTIONS.forEach(sec => { if (typeof tabShown === 'function' && !tabShown(sec, ins)) return; sec.groups.forEach(g => g.fields.forEach(f => { if (f.t !== 'photo' || f.k === 'sketchImg') return; if (typeof isShown === 'function' && !isShown(f, ins.data[sec.id], ins)) return;
    out.push({ g: sec.title, label: f.l, slot: { sec: sec.id, field: f.k, label: f.l, cat: f.cat, required: false } }); })); });
  Object.keys(LISTS).forEach(key => (ins.lists[key] || []).forEach((it, i) => { if (typeof itemPhotoSlots !== 'function') return; itemPhotoSlots(key, it, i, ins).forEach(s => out.push({ g: LISTS[key].title || key, label: s.label, slot: s })); }));
  SECTIONS.forEach(sec => { if (typeof tabShown === 'function' && !tabShown(sec, ins)) return; out.push({ g: 'Extra workfile photos', label: sec.title + ' – workfile', slot: { sec: sec.id, extra: true, label: sec.title + ' – workfile', cat: 'SupplementalExhibit' } }); });
  return out;
}

let DK_KNOWN = null;
function dictItem(m, sentText) {
  const S = phraseOf((m.words || []).join(' ')).join(' '); const has = w => (' ' + S + ' ').includes(' ' + phraseOf(w).join(' ') + ' ');
  if (!DK_KNOWN) DK_KNOWN = new Set([...ITEM_MAT, ...POOL_FEAT, ...POOL_MAT, ...OL_FEAT, ...DICT_ITEMS].flatMap(x => phraseOf(x[0])).concat(['inground', 'attached', 'cover', 'lap', 'infinity', 'edge', 'plunge', 'aboveground', 'portable', 'uncovered']));
  const extra = (m.words || []).filter(w => { const st = stemW(w); return st.length > 2 && !/^\d+$/.test(st) && !DICT_FILLER.has(st) && !DICT_FILLER.has(w) && !NOTE_NOISE.has(st) && !DK_KNOWN.has(st); });
  const said = [...new Set((m.sks || []).map(k => sentText ? sentText(k) : ''))].filter(Boolean);
  const it = { list: m.list, note: [] };
  if (m.list === 'waterFeatures') {
    let type = m.type;
    if (type === 'pool') type = has('lap') ? 'Lap Pool' : has('infinity') || has('infinity edge') ? 'Infinity Edge Pool' : has('plunge') ? 'Plunge Pool' : has('aboveground') ? 'Above-ground Pool' : 'IngroundPool';
    if (type === 'spa') type = has('aboveground') || has('portable') ? 'Above-ground Spa / Hot Tub' : 'IngroundSpa';
    it.type = type; it.feat = POOL_FEAT.filter(([w]) => has(w)).map(x => x[1]); const pm = POOL_MAT.find(([w]) => has(w)); if (pm && /Pool/.test(type)) it.mat = pm[1];
    if (has('attached')) it.note.push('Attached to the pool'); if (has('cover') && !it.feat.includes('Automatic Cover')) it.note.push('Has a cover');
  } else if (m.list === 'outbuildings') { it.type = m.type; it.feat = []; if (/\btuff\b/.test(m.txt || '')) it.label = 'Tuff Shed'; if (m.permitted) it.permitted = m.permitted;
    if (said.length) it.note.push(said.join(' ')); if (m.repTxt) it.note.push('Owner: ' + m.repTxt.join(' '));
    if (m.pp) it.off = 'Personal property – not ticked; tick it if it should be in the report';
    it.note = it.note.join(' '); return it;
  } else { it.type = m.type; const dOf = w => { const f = phraseOf(w)[0]; const h = (m.wd || []).filter(x => x.s === f); return h.length ? Math.min(...h.map(x => x.d)) : 99; };
    const mt = ITEM_MAT.filter(([w]) => has(w)).sort((a, b) => dOf(a[0]) - dOf(b[0]) || b[0].length - a[0].length)[0]; if (mt) it.material = mt[1]; it.feat = OL_FEAT.filter(([w]) => has(w)).map(x => x[1]); }
  if (extra.length && said.length && !it.note.includes(said.join(' '))) it.note.push(said.join(' '));
  if (m.pp) { it.off = 'Personal property – not ticked; tick it if it should be in the report'; if (!it.note.length) it.note.push(said.join(' ')); }   // she said more than there are boxes for: keep her sentence
  it.note = it.note.join('; '); return it;
}

/* ---- put it into the inspection ---- */
function dictNewItem(ins, r) {   // same starting values as "Add …" on the tab
  const list = ins.lists[r.list]; const it = { id: uid() };
  if (r.list === 'bedrooms') { it.label = r.label || 'Bedroom ' + (list.length + 1); it.level = r.level || 'LevelOne'; }
  else if (r.list === 'baths') { it.kind = r.kind || 'FullBathroom'; const k = list.filter(b => b.kind === it.kind).length + 1; it.label = r.label || (it.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') + k; it.level = r.level || 'LevelOne'; }
  else if (r.list === 'kitchens') { it.level = r.level || 'LevelOne'; if (r.style && list.length) it.style = r.style; if (r.label) it.label = r.label; }
  else if (r.list === 'rooms') { it.type = r.type; it.level = r.level || 'LevelOne'; if (r.label) it.label = r.label; }
  else if (r.list === 'wetbars') { it.level = r.level || 'LevelOne'; }
  list.push(it); return it;
}
function dictApply(ins, res, pick) {
  const target = res.rooms.map((r, ri) => { if (pick.r[ri] === false) return null; const L = ins.lists[r.list]; let it = r.existingId ? L.find(x => x.id === r.existingId) : null;
    if (!it) it = dictNewItem(ins, r); else if (r.levelSaid && r.level) it.level = r.level;
    const AP = (pick.ap || {})[ri] || {}; const ak = [...new Set([...Object.keys(r.appl || {}), ...(((pick.apAdd || {})[ri]) || [])])];
    if (ak.length) { it.appl = it.appl || {}; ak.forEach(k => { const a = { ...((r.appl || {})[k] || {}), ...(AP[k] || {}) }; if (a.off) return; delete a.off; if (!a.brand) delete a.brand; it.appl[k] = { ...(it.appl[k] || {}), ...a }; if (!it.appl[k].qty && APPLIANCES.find(x => x.k === k).qty) it.appl[k].qty = 1; }); }
    const notes = [...(r.notes || [])]; if (r.stainless) notes.push('Stainless steel appliances'); if ((r.brandsSaid || []).length) notes.push(r.brandsSaid.join(', ') + ' appliances');
    if (notes.length) it.note = [it.note, notes.join('; ')].filter(Boolean).join('. ');
    return it; });
  res.changes.forEach((c, i) => { if (!pick.c[i]) return;
    let d; if (c.room !== undefined) { d = target[c.room]; if (!d) return; } else d = ins.data[c.sec.id] || (ins.data[c.sec.id] = {});
    const ed = pick.v && pick.v[i] !== undefined ? pick.v[i] : undefined;   // what she changed in the list
    if (c.f.t === 'multi') { const mx = (pick.mx || {})[i] || [], ma = (pick.ma || {})[i] || []; c = { ...c, vals: [...c.vals.filter(v => !mx.includes(v)), ...ma] }; if (!c.vals.length) return; }
    if (c.f.t === 'note' || c.f.t === 'text') { const add = ed !== undefined ? String(ed).trim() : c.vals.join(' '); if (!add) return; const cur = String(d[c.f.k] || ''); if (!cur.includes(add)) d[c.f.k] = cur ? cur + (c.f.t === 'note' ? '\n' : '; ') + add : add; return; }
    if (c.key === 'interior.dkBeds' || c.key === 'interior.dkBaths' || c.key === 'interior.dkHalf') { const L = c.key === 'interior.dkBeds' ? 'bedrooms' : 'baths'; const kind = c.key === 'interior.dkHalf' ? 'HalfBathroom' : 'FullBathroom';
      const have = ins.lists[L].filter(x => L === 'bedrooms' || x.kind === kind).length; for (let k = have; k < (ed !== undefined ? ed : c.vals[0]); k++) dictNewItem(ins, { list: L, kind }); return; }
    if (c.f.t === 'multi') d[c.f.k] = [...new Set([...(Array.isArray(d[c.f.k]) ? d[c.f.k].filter(x => x !== 'None') : []), ...c.vals])];
    else d[c.f.k] = (pick.v && pick.v[i] !== undefined ? pick.v[i] : c.vals[0]); });
  if (res.changes.some((c, i) => pick.c[i] && c.key === 'driveway.driveMat')) ins.data.driveway.hasDrive = true;
  if (res.changes.some((c, i) => pick.c[i] && c.key === 'interior.fpType') && !(ins.data.interior.fireplaces > 0)) ins.data.interior.fireplaces = 1;
  res.items.forEach((it0, i) => { if (!pick.i[i]) return; const E = (pick.it || {})[i] || {}; const it = { ...it0, ...Object.fromEntries(Object.entries(E).filter(([k, v]) => v !== undefined)) };
    const L = ins.lists[it.list]; const o = { id: uid(), type: it.type };
    if (it.list === 'waterFeatures') { if (it.mat) o.mat = it.mat; if (it.feat.length) o.feat = it.feat; if (it.note) o.note = it.note; }
    else if (it.list === 'outbuildings') { if (it.label) o.label = it.label; if (it.permitted) o.permitted = it.permitted; if (it.note) o.note = it.note; if (it.defects === false) o.defects = false; }
    else { if (it.material) o.material = it.material; if (it.feat.length) o.feat = it.feat; if (it.note) o.note = it.note; }
    const made = L.find(x => x.dkPhoto && (x.type === o.type || (/Pool/.test(x.type || '') && /Pool/.test(o.type)) || (/Spa/.test(x.type || '') && /Spa/.test(o.type))));   // the one she photographed while dictating
    if (made) { Object.assign(made, { ...o, id: made.id }); delete made.dkPhoto; } else L.push(o); });
}

function dkSummary(R, ins) {
  const val = c => c.f.t === 'note' || c.f.t === 'text' ? '"' + c.vals.join(' ') + '"' : c.vals.map(v => dkLabel(c.key, v)).join(', ');
  const out = R.changes.filter(c => c.room === undefined && !/\.(hasFeat|hasGarage|hasDrive|attic)$/.test(c.key)).map(c => (c.sec ? c.sec.title : '') + ' > ' + c.f.l + ': ' + val(c));
  R.rooms.forEach((r, ri) => { out.push('ROOM ' + (r.name || roomName(r))); if (r.appl) out.push('   Appliances: ' + Object.entries(r.appl).map(([k, a]) => APPLIANCES.find(x => x.k === k).l + (a.brand ? ' - ' + a.brand : '') + (a.qty > 1 ? ' x' + a.qty : '')).join(', '));
    R.changes.filter(c => c.room === ri && !/\.hasFeat$/.test(c.key)).forEach(c => out.push('   ' + c.f.l + ': ' + val(c))); });
  R.items.forEach(it => out.push('NEW ' + (it.label || it.type) + [it.material, it.mat, (it.feat || []).join(', '), it.permitted ? 'permitted ' + it.permitted : '', it.note].filter(Boolean).map(x => ' · ' + x).join('')));
  return out.join('\n');
}

/* ---- the Dictate page ---- */
const DICT_SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
function renderDictate() {
  const ins = app.ins; const log = ins.dictLog || []; const R = app.dict && app.dict.res; const P = app.dict ? app.dict.pick : { c: {}, i: {}, v: {}, r: {} };
  let rid = 0; const row = (on, attr, where, what, note, cls) => { const id = 'dkcb' + (rid++); return `<div class="dk-row ${cls || ''}"><input type="checkbox" id="${id}" ${attr} ${on ? 'checked' : ''}><label class="dk-where" for="${id}">${esc(where)}</label><span class="dk-what">${what}</span>${note ? `<small>${esc(note)}</small>` : ''}</div>`; };
  const optsFor = c => { try { return optsOf(c.f, {}, null).filter(o => !/^(other|asbestos)$/i.test(o[0])); } catch (e) { return []; } };   // no asbestos in Santa Barbara
  const editor = (c, i) => {   // she can change what was heard before saving (6n)
    const t = c.f.t, ov = P.v[i];
    if (t === 'note' || t === 'text') return `<textarea class="txt dk-edit" rows="${Math.min(6, Math.ceil(c.vals.join(' ').length / 60) + 1)}" data-dkt="${i}">${esc(ov !== undefined ? ov : c.vals.join(' '))}</textarea>`;
    if (typeof c.vals[0] === 'number' || t === 'count' || t === 'num') return `<input type="number" inputmode="numeric" min="0" class="txt dk-num" data-dkn="${i}" value="${esc(ov !== undefined ? ov : c.vals[0])}">`;
    if (typeof c.vals[0] === 'boolean' || t === 'yn') { const v = ov !== undefined ? ov : c.vals[0]; return `<select class="txt dk-sel" data-dkb="${i}"><option value="1" ${v ? 'selected' : ''}>Yes</option><option value="0" ${v ? '' : 'selected'}>No</option></select>`; }
    const O = optsFor(c);
    if (t === 'multi') { const mx = (P.mx || {})[i] || [], ma = (P.ma || {})[i] || []; const all = [...c.vals, ...ma];
      return `<span class="dk-chips">${all.map(v => `<label class="dk-chip"><input type="checkbox" data-dkm="${i}" value="${esc(v)}" ${mx.includes(v) ? '' : 'checked'}>${esc(dkLabel(c.key, v))}</label>`).join('')}${O.length ? `<select class="txt dk-sel dk-add" data-dka="${i}"><option value="">+ add</option>${O.filter(o => !all.includes(o[0])).map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>` : ''}</span>`; }
    if (O.length) { const v = ov !== undefined ? ov : c.vals[0]; const heard = new Set(c.vals);
      return `<select class="txt dk-sel" data-dkv="${i}">${O.slice().sort((a, b) => (heard.has(b[0]) ? 1 : 0) - (heard.has(a[0]) ? 1 : 0)).map(o => `<option value="${esc(o[0])}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}${heard.has(o[0]) && c.vals.length > 1 ? ' (heard)' : ''}</option>`).join('')}</select>`; }
    return c.vals.map(v => '<b>' + esc(dkLabel(c.key, v)) + '</b>').join(', '); };
  const HIDE = /\.(hasFeat|hasGarage|hasDrive|attic)$/;
  const changeRow = (c, i, where, curObj, cls) => { if (HIDE.test(c.key)) return '';
    const cur = curObj ? curObj[c.f.k] : undefined; const curL = Array.isArray(cur) ? cur.map(v => dkLabel(c.key, v)).join(', ') : cur != null && cur !== '' && typeof cur !== 'object' ? dkLabel(c.key, cur) : '';
    const what = c.f.t === 'note' || c.f.t === 'text' ? '<i>“' + esc(c.vals.join(' ')) + '”</i>' : c.vals.map(v => '<b>' + esc(dkLabel(c.key, v)) + '</b>').join(', ');
    const note = c.f.t === 'note' ? (curL ? 'added to what is there' : '') : c.f.t !== 'multi' && curL && curL !== dkLabel(c.key, c.vals[0]) ? 'replaces ' + curL : c.f.t === 'multi' && curL ? 'added to ' + curL : '';
    const two = c.f.t === 'one' && c.vals.length > 1;
    return row(P.c[i] !== false, `data-dkc="${i}"`, where, editor(c, i), two ? 'I heard more than one – pick the right one' : c.auto ? c.auto + ' – change it if there is one' : note, cls); };
  const secRows = R ? R.changes.map((c, i) => c.room === undefined ? changeRow(c, i, (c.sec ? c.sec.title : '') + ' › ' + c.f.l, ins.data[c.sec.id]) : '').join('') : '';
  const roomRows = R ? R.rooms.map((r, ri) => { const L = ins.lists[r.list]; const ex = r.existingId ? L.find(x => x.id === r.existingId) : null;
    const head = row(P.r[ri] !== false, `data-dkr="${ri}"`, ex ? 'Update' : 'New ' + ROOM_TITLE[r.list].toLowerCase(), '<b>' + esc(ex ? r.name : roomName(r)) + '</b>' + (r.level ? ' · ' + esc(labelOf(LEVELS_ALL, r.level)) : ''), '', 'dk-room');
    const AP = (P.ap || {})[ri] || {}; const apKeys = [...Object.keys(r.appl || {}), ...(((P.apAdd || {})[ri]) || [])];
    const brandSel = (k, b) => `<select class="txt dk-sel dk-brand" data-dkab="${ri}|${k}"><option value="">brand…</option>${BRANDS.map(x => `<option ${x === b ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    const appl = apKeys.length ? `<div class="dk-apl">${[...new Set(apKeys)].map(k => { const a = { ...((r.appl || {})[k] || {}), ...(AP[k] || {}) }; const A = APPLIANCES.find(x => x.k === k);
        return `<span class="dk-ap"><label class="dk-chip"><input type="checkbox" data-dkap="${ri}|${k}" ${a.off ? '' : 'checked'}>${esc(A.l)}${a.qty > 1 ? ' ×' + a.qty : ''}</label>${A.brand ? brandSel(k, a.brand) : ''}</span>`; }).join('')}
      <select class="txt dk-sel dk-add" data-dkaa="${ri}"><option value="">+ add appliance</option>${APPLIANCES.filter(x => !apKeys.includes(x.k)).map(x => `<option value="${x.k}">${esc(x.l)}</option>`).join('')}</select></div>` : '';
    const notes = [...(r.notes || []), r.stainless ? 'Stainless steel appliances' : '', (r.brandsSaid || []).length ? r.brandsSaid.join(', ') + ' appliances' : ''].filter(Boolean).join('; ');
    return `<div class="dk-roomBox">${head}${R.changes.map((c, i) => c.room === ri ? changeRow(c, i, c.f.l, ex, 'dk-sub') : '').join('')}${appl ? `<div class="dk-sub dk-info">Appliances (untick one that is wrong, pick or change the brand):${appl}</div>` : ''}${notes ? `<div class="dk-sub dk-info">Note: ${esc(notes)}</div>` : ''}</div>`; }).join('') : '';
  const IT_WHERE = { waterFeatures: 'Pool, spa & water features', outdoorLiving: 'Porches, patios & decks', outbuildings: 'Outbuildings' };
  const itemEd = (it, i) => { const E = (P.it || {})[i] || {}; const fOf = k => LISTS[it.list].fields.find(f => f.k === k); const opt = f => { try { return optsOf(f, {}, null); } catch (e) { return []; } };
    const sel = (k, cur, blank) => { const f = fOf(k); if (!f) return ''; return `<select class="txt dk-sel" data-dkit="${i}|${k}">${blank ? `<option value="">${blank}</option>` : ''}${opt(f).map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; };
    const mk = it.list === 'waterFeatures' ? 'mat' : it.list === 'outdoorLiving' ? 'material' : null; const note = E.note !== undefined ? E.note : it.note || '';
    return `<div class="dk-ited">${sel('type', E.type || it.type)}${mk ? sel(mk, E[mk] !== undefined ? E[mk] : it[mk], 'material…') : ''}${it.list === 'outbuildings' ? sel('permitted', E.permitted !== undefined ? E.permitted : it.permitted, 'permitted?') : ''}
      ${(it.feat || []).length ? `<small>${esc(it.feat.join(', '))}</small>` : ''}<textarea class="txt dk-edit" rows="2" data-dkit="${i}|note" placeholder="note">${esc(note)}</textarea></div>`; };
  const itemRows = R ? R.items.map((it, i) => row(P.i[i] !== undefined ? P.i[i] : !it.off, `data-dki="${i}"`, IT_WHERE[it.list] + ' › new', itemEd(it, i), it.off || '')).join('') : '';
  const any = R && (R.changes.length || R.items.length || R.rooms.length);
  return `<section class="group open"><div class="ghead static"><span class="gtitle">Dictate your notes</span></div><div class="exp">
    <label class="dk-walk"><input type="checkbox" id="dkWalk" ${dkWalk() ? 'checked' : ''}> <b>Walk-through mode</b> – show only Dictate, Photos and Needs Attention while I walk the property</label>
    <details class="dk-how"><summary>How to dictate (tap to open)</summary>
    <p class="help">Say the area or room first, then what you see, the way you walk it. For example: <i>“Exterior 2 story Spanish stucco clay tile roof copper gutters wood clad dual pane windows slab foundation. Exterior quality Q4 condition C3. 2 car attached garage. View residential full neutral. Topography level lot. Interior 9 foot ceilings recessed lighting. Forced air gas heating, central air, tankless water heater. Living room hardwood floors vaulted ceiling gas fireplace. Kitchen remodeled 5 to 10 years ago granite counters shaker cabinets Wolf range Sub-Zero refrigerator island with seating. Upstairs primary bedroom carpet walk-in closet. Primary bath double sink freestanding tub separate shower frameless glass. Bedroom 2 carpet. Hall bath tub shower combo tile surround. Interior quality Q3 condition C2. Overall quality Q4 condition C3.”</i></p>
    <p class="help">Tap in the box, then the <b>microphone on the iPad keyboard</b>, and talk.${DICT_SR ? ' Or use Listen.' : ''} You can dictate a little at a time: check it, save it to the appraisal file, then dictate the next part. Say “upstairs” or “level 2” before the rooms on that floor. When you finish, tap <b>1. Sort my notes</b> to see where each thing will go, then <b>2. Save to appraisal file</b>. Nothing is saved into the tabs until you tap Save.</p>
    <p class="help"><b>Photos:</b> say the room or area, then tap <b>Take photo</b> – it is labeled for the last room or area you named (shown next to the button; pick another place if it is wrong). <b>If you do not mention a defect, the defect questions are answered No</b>; if you do not mention a pool, spa, court, ADU or outbuilding, none is added.</p>
    <p class="help"><b>Accept:</b> after each area or room, say <b>“accept”</b> or tap <b>✓ Accept</b> – that ends the sentence and shows what I heard. Say <b>“scratch that”</b> to drop the sentence you are on.</p>
    <p class="help"><b>Easy to forget:</b> front door height – say “front door 2 feet above grade”, “3 steps up to the front door” or “entry at ground level”. Water – say “oceanfront with a beach and seawall, deeded access”; measure the frontage at the office from the plat or satellite. After you save, the orange <b>Before you leave</b> box lists what UAD still needs from the property.</p></details>
    <textarea class="txt dk-box" id="dkText" rows="7" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="Tap here, then the microphone on the keyboard">${esc((app.dict && app.dict.text) || ins.dictDraft || '')}</textarea>
    <div class="dk-bar"><button class="btn primary" id="dkAccept">✓ Accept</button><button class="btn" id="dkBkW">⌫ Word</button><button class="btn" id="dkBkS">⌫ Sentence</button><button class="btn" id="dkTeach">🎓 Teach</button></div>
    <div class="dk-teach" id="dkTeachBox" hidden>${dkTeachHtml()}</div>
    <div id="dkFeed">${dkFeedHtml()}</div>
    <p class="help dk-saved">What you dictate is kept with this inspection until you tap Save to appraisal file or Clear, even if you close the app.</p>
    <div class="row">${DICT_SR ? `<button class="btn" id="dkListen">${app.dict && app.dict.listening ? '■ Stop' : '🎤 Listen'}</button>` : ''}<button class="btn primary" id="dkRead">1. Sort my notes</button><button class="btn" id="dkCopy">Copy text</button><button class="btn" id="dkMail">Email it</button><button class="btn ghost" id="dkClear">Clear</button></div>
    <div class="dk-cam" id="dkCamBar">${dkCamBar()}</div>
    ${R ? '' : `<div id="dkLeaveBox">${dkLeaveHtml(ins)}</div>`}
    ${R ? `<h3 class="dk-h">What I heard</h3>
      ${any ? '' : '<p class="help">Nothing I recognize yet.</p>'}
      ${secRows}${roomRows ? `<h4 class="dk-h4">Rooms</h4>${roomRows}` : ''}${itemRows ? `<h4 class="dk-h4">Outdoor</h4>${itemRows}` : ''}
      ${R.defectSaid ? '<p class="dk-warn">You mentioned a defect or damage, so I did not answer the “defects present?” questions. Answer them on the Defects tab.</p>' : ''}
      ${any ? '<p class="dk-left">Anything I could not put in a box is kept, in your own words, in the notes of the room or area you were in (the rows in quotes). Untick a row to leave it out.</p>' : ''}
      ${any ? `<div class="row"><button class="btn primary" id="dkApply">2. Save to appraisal file</button><span class="help"> – saves the ticked items into the tabs</span></div>` : ''}` : ''}
    ${log.length ? `<details class="dk-log"><summary>Dictation log (${log.length}) – workfile only, not sent to SFREP</summary>${log.slice().reverse().map(x => `<p><small>${esc(new Date(x.t).toLocaleString())}</small><br>${esc(x.text)}</p>`).join('')}</details>` : ''}
  </div></section>`;
}
function dkTeachHtml() {
  const L = dkTeachList();
  return `<p class="help">Select the wrong word in the box (or it uses the last word), then type what you meant. From now on it reads it your way, on every inspection on this iPad.</p>
    <div class="dk-trow"><label>When the iPad writes<input class="txt" id="dkTh" autocapitalize="none" autocorrect="off"></label><label>I mean<input class="txt" id="dkTm" autocapitalize="none" autocorrect="off" placeholder="e.g. : or Tuff Shed"></label><button class="btn primary" id="dkTsave">Save</button></div>
    ${L.length ? `<div class="dk-tlist"><b>Your words (${L.length})</b>${L.map((x, i) => `<div class="dk-titem"><span>“${esc(x.heard)}” → “${esc(x.meant)}”</span><button class="btn sm ghost" data-dktdel="${i}">✕</button></div>`).join('')}</div>` : ''}`;
}
/* ---- before you leave (6r): what UAD still needs, split into "at the property" and "can wait for the office" ---- */
const DK_OFFICE_TABS = new Set(['property', 'project', 'condition', 'summaries', 'export']);
const dkOffice = x => DK_OFFICE_TABS.has(x.tab) || /^(word:|lim:|hold:|enf:|condotel|vc:|ea:|skimg)/.test(x.key) || /zoning|flood|census|parcel|legal description|water frontage|plat/i.test(x.label);
function dkLeaveHtml(ins) {
  if (typeof computeIssues !== 'function') return '';
  const all = computeIssues(ins).filter(x => !ins.overrides[x.key] && (x.sev === 'Required' || x.sev === 'Photo' || /^measure:/.test(x.key)));
  const here = all.filter(x => !dkOffice(x)), office = all.filter(x => dkOffice(x));
  const title = id => { const t = ALL_TABS_FULL().find(t => t.id === id) || SECTIONS.find(s => s.id === id); return t ? t.title.replace(/^🎤 /, '') : id; };
  const groups = list => { const by = new Map(); list.forEach(x => { const k = x.tab; if (!by.has(k)) by.set(k, []); by.get(k).push(x); }); return [...by.entries()]; };
  const line = x => `<button class="dk-lv ${x.photo ? 'ph' : ''}" data-lvtab="${esc(x.tab)}" data-lvanchor="${esc(x.anchor || '')}" data-lvgroup="${esc(x.group || '')}">${x.photo ? '📷 ' : /^measure:/.test(x.key) ? '📏 ' : '• '}${esc(x.label.replace(/^Measure for SFREP: /, 'Measure: '))}</button>`;
  const block = list => groups(list).map(([tab, xs]) => `<div class="dk-lvg"><b>${esc(title(tab))}</b> <small>(${xs.length})</small><div>${xs.slice(0, 12).map(line).join('')}${xs.length > 12 ? `<button class="dk-lv more" data-lvtab="${esc(tab)}">+ ${xs.length - 12} more on that tab</button>` : ''}</div></div>`).join('');
  return `<section class="dk-leave" id="dkLeave"><h3 class="dk-h">${here.length ? `Before you leave: ${here.length} still needed here` : '✓ Nothing left that needs the property'}</h3>
    ${here.length ? `<p class="help">Tap one to go to it. 📷 = photo, 📏 = measure, • = a question.</p>${block(here)}` : '<p class="help">Everything that needs you on site is done. Recheck after any change.</p>'}
    ${office.length ? `<details class="dk-office"><summary>Can wait for the office: ${office.length} (assignment, zoning, water frontage from the plat or satellite, comments…)</summary>${block(office)}</details>` : ''}
    <div class="row"><button class="btn" id="dkLvRefresh">↻ Check again</button><button class="btn" data-lvtab="attention">Open Needs Attention</button></div></section>`;
}
function dkFeedHtml() {
  const F = (app.dict && app.dict.feed) || []; if (!F.length) return '';
  return `<div class="dk-feed">${F.slice(-3).reverse().map((f, k) => `<div class="dk-fd ${k ? 'old' : ''}"><span class="dk-fs">“${esc(f.text)}”</span><span class="dk-fh">${f.heard.length ? '✓ ' + f.heard.map(esc).join(' · ') : '<i>Nothing I recognize – it will go in the notes.</i>'}</span></div>`).join('')}</div>`;
}
function dkHeardShort(sentence, ins) {   // a quick one-line look at what one sentence fills
  const R = dictParse(sentence, ins); const out = [];
  R.changes.filter(c => !c.auto && !/\.(hasFeat|hasGarage|hasDrive|attic)$/.test(c.key)).forEach(c => { if (c.f.t === 'note') return; const v = c.vals.map(v => dkLabel(c.key, v)).join(', ');
    out.push((c.room !== undefined ? roomName(R.rooms[c.room]) + ' ' : '') + c.f.l.replace(/\s*\(.*?\)/g, '') + ': ' + v); });
  R.rooms.forEach((r, i) => { if (!R.changes.some(c => c.room === i && c.f.t !== 'note')) out.push(roomName(r)); });
  R.items.forEach(it => out.push(it.label || labelOf(LISTS[it.list].fields[0].o, it.type) || it.type));
  if (R.changes.some(c => c.f.t === 'note')) out.push('rest in notes');
  return out;
}
function dkCamBar() {
  const ins = app.ins; const text = (app.dict && app.dict.text) || ins.dictDraft || ''; const upto = app.dict && app.dict.cur != null ? text.slice(0, app.dict.cur) : text;
  const man = app.dict && app.dict.camSlot; const auto = dkPhotoSlot(ins, dkPhotoTarget(upto), false);
  const to = man ? man.label : auto ? auto.label : 'Extra photos (say the room or area first)';
  const recent = ins.photos.slice().sort((a, b) => b.ts - a.ts).slice(0, 6);
  const ch = dkPhotoChoices(ins); const groups = [...new Set(ch.map(c => c.g))];
  return `<div class="dk-camrow"><label class="cam">${CAM_SVG}Take photo<input type="file" accept="image/*" capture="environment" id="dkCam"></label><label class="cam lib">${LIB_SVG}From library<input type="file" accept="image/*" multiple id="dkCamLib"></label>
    <div class="dk-camto">Photo goes to: <b id="dkCamTo">${esc(to)}</b>${man ? ' <small>(you picked it)</small>' : ''}<br><select class="txt dk-sel" id="dkCamPick"><option value="">${man ? '← back to where I last said' : 'Somewhere else? Pick it…'}</option>${groups.map(g => `<optgroup label="${esc(g)}">${ch.map((c, i) => c.g === g ? `<option value="${i}">${esc(c.label)}</option>` : '').join('')}</optgroup>`).join('')}</select></div></div>
    ${recent.length ? `<div class="dk-strip">${recent.map(p => `<button class="thumb ${p.required ? 'req' : ''}" data-view="${p.id}"><img data-pid="${p.id}" alt=""><span>${esc(p.label)}</span></button>`).join('')}</div>` : ''}`;
}
function bindDictate(root) {
  const box = root.querySelector('#dkText'); if (!box) return; const blank = () => ({ text: '', pick: { c: {}, i: {}, v: {}, r: {}, mx: {}, ma: {} } }); app.dict = app.dict || blank();
  if (!app.dict.text && app.ins.dictDraft) app.dict.text = app.ins.dictDraft;
  const keep = () => { if ((app.ins.dictDraft || '') !== app.dict.text) { app.ins.dictDraft = app.dict.text; save(); } };
  box.oninput = () => { app.dict.text = box.value; clearTimeout(app.dict.kt); app.dict.kt = setTimeout(keep, 1200); }; box.onblur = () => { app.dict.text = box.value; keep(); };
  // Accept / backspace (6p): she ends each area with Accept; the last words or sentence can be taken back
  const setText = v => { box.value = v; app.dict.text = v; app.dict.cur = v.length; keep(); where(); };
  const lastSentenceStart = v => { const m = v.replace(/[.!?]\s*$/, '').match(/^[\s\S]*[.!?\n]/); return m ? m[0].length : 0; };
  box.addEventListener('focus', () => setTimeout(() => { const r = box.getBoundingClientRect(); if (r.top < 140 || r.top > window.innerHeight * 0.4) window.scrollBy(0, r.top - 150); }, 350));   // keep the box and buttons above the keyboard
  root.querySelector('#dkAccept').onclick = () => { let v = dkSpoken(box.value).replace(/\s+$/, ''); if (!v) return toast('Say something first');
    if (!/[.!?]$/.test(v)) v += '.'; const st = lastSentenceStart(v); const sent = v.slice(st).trim();
    const F = app.dict.feed || []; if (sent && !(F.length && F[F.length - 1].text === sent)) app.dict.feed = [...F, { text: sent, heard: dkHeardShort(sent, app.ins) }].slice(-20); setText(v + ' ');
    const fd = root.querySelector('#dkFeed'); if (fd) fd.innerHTML = dkFeedHtml(); box.focus(); try { box.setSelectionRange(box.value.length, box.value.length); } catch (e) {} };
  root.querySelector('#dkBkW').onclick = () => { setText(box.value.replace(/\s*\S+\s*$/, '')); box.focus(); };
  root.querySelector('#dkBkS').onclick = () => { const v = box.value.replace(/\s+$/, ''); setText(v.slice(0, lastSentenceStart(v)).replace(/\s+$/, '') + (lastSentenceStart(v) ? ' ' : '')); box.focus(); };
  // Teach: her own corrections
  const teachBind = () => { const tb = root.querySelector('#dkTeachBox'); if (!tb) return;
    const sv = tb.querySelector('#dkTsave'); if (sv) sv.onclick = () => { const h = tb.querySelector('#dkTh').value.trim(), m = tb.querySelector('#dkTm').value; if (!h) return toast('Type what the iPad writes');
      if (h.length < 2) return toast('Use at least 2 letters'); const L = dkTeachList().filter(x => x.heard.toLowerCase() !== h.toLowerCase()); L.push({ heard: h, meant: m.trim(), t: Date.now() });
      if (!dkTeachSave(L)) return toast('Could not save on this iPad'); const nv = dkTeachApply(box.value); if (nv !== box.value) setText(nv);
      toast('Learned: “' + h + '” means “' + m.trim() + '”'); tb.innerHTML = dkTeachHtml(); teachBind(); };
    tb.querySelectorAll('[data-dktdel]').forEach(b => b.onclick = () => { const L = dkTeachList(); const x = L[+b.dataset.dktdel]; if (!x || !confirm('Forget “' + x.heard + '” → “' + x.meant + '”?')) return; L.splice(+b.dataset.dktdel, 1); dkTeachSave(L); tb.innerHTML = dkTeachHtml(); teachBind(); }); };
  root.querySelector('#dkTeach').onclick = () => { const tb = root.querySelector('#dkTeachBox'); const st = box.selectionStart, en = box.selectionEnd;
    const sel = st != null && en > st ? box.value.slice(st, en).trim() : (box.value.replace(/[.,;:!?\s]+$/, '').match(/(\S+)$/) || [, ''])[1];
    const open = tb.hidden || (!!sel && tb.querySelector('#dkTh').value !== sel.replace(/[.,;:!?]+$/, '')); tb.hidden = !open; if (!tb.hidden) { tb.querySelector('#dkTh').value = sel.replace(/[.,;:!?]+$/, ''); tb.querySelector('#dkTm').focus(); } };
  teachBind();
  // camera: the photo is labeled for the last room or area named before the cursor
  const camRefresh = () => { const bar = root.querySelector('#dkCamBar'); if (!bar) return; bar.innerHTML = dkCamBar(); bindCam(); fillThumbs(bar); };
  const where = () => { app.dict.text = box.value; app.dict.cur = box.selectionEnd != null ? box.selectionEnd : box.value.length; const el = root.querySelector('#dkCamTo'); if (el && !app.dict.camSlot) { const a = dkPhotoSlot(app.ins, dkPhotoTarget(box.value.slice(0, app.dict.cur)), false); el.textContent = a ? a.label : 'Extra photos (say the room or area first)'; } };
  ['keyup', 'click', 'select'].forEach(ev => box.addEventListener(ev, where)); box.addEventListener('input', () => { clearTimeout(app.dict.wt); app.dict.wt = setTimeout(where, 300); });
  const bindCam = () => {
    const pick = root.querySelector('#dkCamPick'); if (pick) pick.onchange = () => { const ch = dkPhotoChoices(app.ins); app.dict.camSlot = pick.value === '' ? null : ch[+pick.value].slot; camRefresh(); };
    root.querySelectorAll('#dkCamBar [data-view]').forEach(b => b.onclick = () => openViewer(b.dataset.view));
    ['#dkCam', '#dkCamLib'].forEach(sel => { const inp = root.querySelector(sel); if (!inp) return; inp.onchange = async () => { const files = [...inp.files]; if (!files.length) return;
      app.dict.text = box.value; keep(); const upto = box.value.slice(0, app.dict.cur != null ? app.dict.cur : box.value.length);
      const slot = app.dict.camSlot || dkPhotoSlot(app.ins, dkPhotoTarget(upto), true) || { sec: 'property', extra: true, label: 'Dictation photo', cat: 'SupplementalExhibit' };
      toast(files.length > 1 ? `Adding ${files.length} photos…` : 'Adding photo…');
      try { let last; for (const f of files) last = await addPhoto(app.ins, slot, f); await saveNow(); toast((files.length > 1 ? files.length + ' photos saved: ' : 'Photo saved: ') + last.label); }
      catch (e) { toast('Could not save that photo. Try again.'); }
      app.dict.camSlot = null; camRefresh(); }; }); };
  bindCam();
  const bindLeave = () => { root.querySelectorAll('[data-lvtab]').forEach(b => b.onclick = () => goTab(b.dataset.lvtab, b.dataset.lvanchor || undefined, b.dataset.lvgroup || undefined));
    const rf = root.querySelector('#dkLvRefresh'); if (rf) rf.onclick = () => { const bx = root.querySelector('#dkLeaveBox'); if (bx) { bx.innerHTML = dkLeaveHtml(app.ins); bindLeave(); } toast('Checked'); }; };
  bindLeave();
  // walk-through mode: only Dictate, Photos and Needs Attention tabs show
  const wk = root.querySelector('#dkWalk'); if (wk) wk.onchange = () => { dkSetWalk(wk.checked); refreshChrome(); toast(wk.checked ? 'Walk-through mode on – only Dictate, Photos and Needs Attention show' : 'All tabs are back'); };
  const bodyText = () => { const t = box.value.trim(); const R = app.dict.res; const TL = dkTeachList(); return t + (R ? '\n\n--- What the app heard ---\n' + dkSummary(R, app.ins) : '') + (TL.length ? '\n\n--- Words I taught it ---\n' + TL.map(x => x.heard + ' => ' + x.meant).join('\n') : ''); };
  root.querySelector('#dkCopy').onclick = async () => { const t = bodyText(); if (!t) return toast('Nothing to copy yet');
    try { await navigator.clipboard.writeText(t); toast('Copied – paste it into an email or a message'); } catch (e) { box.focus(); box.select(); toast('Tap Copy on the menu that appears'); } };
  root.querySelector('#dkMail').onclick = async () => { const t = bodyText(); if (!t) return toast('Nothing to send yet'); const addr = ((app.ins.data.property || {}).addr || app.ins.name || '').trim(); const subj = 'Dictation' + (addr ? ' – ' + addr : '');
    if (navigator.share) { try { await navigator.share({ title: subj, text: t }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    location.href = 'mailto:?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(t); };
  root.querySelector('#dkRead').onclick = () => { app.dict.text = box.value; keep(); app.dict.res = dictParse(box.value, app.ins); app.dict.pick = { c: {}, i: {}, v: {}, r: {}, mx: {}, ma: {} }; renderTab(); };
  root.querySelector('#dkClear').onclick = () => { if (box.value.trim() && !confirm('Clear the dictation box? (Anything you already saved stays, and it is in the dictation log.)')) return; app.dict = blank(); app.ins.dictDraft = ''; save(); renderTab(); };
  root.querySelectorAll('[data-dkc]').forEach(cb => cb.onchange = () => { app.dict.pick.c[cb.dataset.dkc] = cb.checked; });
  root.querySelectorAll('[data-dkr]').forEach(cb => cb.onchange = () => { app.dict.pick.r[cb.dataset.dkr] = cb.checked; const box2 = cb.closest('.dk-roomBox'); if (box2) box2.classList.toggle('off', !cb.checked); });
  const PK = () => { const p = app.dict.pick; p.v = p.v || {}; p.mx = p.mx || {}; p.ma = p.ma || {}; return p; };
  const tick = el => { const cb = el.closest('.dk-row') && el.closest('.dk-row').querySelector('[data-dkc]'); if (cb && !cb.checked) { cb.checked = true; PK().c[cb.dataset.dkc] = true; } };   // changing a row means she wants it
  root.querySelectorAll('[data-dkv]').forEach(r => r.onchange = () => { PK().v[r.dataset.dkv] = r.value; tick(r); });
  root.querySelectorAll('[data-dkt]').forEach(r => r.oninput = () => { PK().v[r.dataset.dkt] = r.value; });
  root.querySelectorAll('[data-dkn]').forEach(r => r.oninput = () => { const n = parseInt(r.value, 10); if (!isNaN(n)) { PK().v[r.dataset.dkn] = n; tick(r); } });
  root.querySelectorAll('[data-dkb]').forEach(r => r.onchange = () => { PK().v[r.dataset.dkb] = r.value === '1'; tick(r); });
  const bindChip = cb => cb.onchange = () => { const i = cb.dataset.dkm, mx = PK().mx[i] = (PK().mx[i] || []).filter(v => v !== cb.value); if (!cb.checked) mx.push(cb.value); };
  root.querySelectorAll('[data-dkm]').forEach(bindChip);
  root.querySelectorAll('[data-dka]').forEach(sel => sel.onchange = () => { const v = sel.value; if (!v) return; const i = sel.dataset.dka; PK().ma[i] = [...(PK().ma[i] || []), v];
    const lab = document.createElement('label'); lab.className = 'dk-chip'; lab.innerHTML = `<input type="checkbox" data-dkm="${i}" value="${esc(v)}" checked>${esc(sel.options[sel.selectedIndex].text)}`; sel.before(lab); bindChip(lab.querySelector('input')); sel.options[sel.selectedIndex].remove(); sel.value = ''; tick(sel); });
  root.querySelectorAll('[data-dki]').forEach(cb => cb.onchange = () => { app.dict.pick.i[cb.dataset.dki] = cb.checked; });
  const PP = () => { const p = app.dict.pick; p.ap = p.ap || {}; p.apAdd = p.apAdd || {}; p.it = p.it || {}; return p; };
  root.querySelectorAll('[data-dkit]').forEach(el => { const [i, k] = el.dataset.dkit.split('|'); const set = () => { const E = PP().it[i] = PP().it[i] || {}; E[k] = el.value; tick(el); };
    if (el.tagName === 'TEXTAREA') el.oninput = () => { (PP().it[i] = PP().it[i] || {})[k] = el.value; }; else el.onchange = set; });
  root.querySelectorAll('[data-dkap]').forEach(cb => cb.onchange = () => { const [ri, k] = cb.dataset.dkap.split('|'); const A = PP().ap[ri] = PP().ap[ri] || {}; A[k] = { ...(A[k] || {}), off: !cb.checked }; });
  root.querySelectorAll('[data-dkab]').forEach(sl => sl.onchange = () => { const [ri, k] = sl.dataset.dkab.split('|'); const A = PP().ap[ri] = PP().ap[ri] || {}; A[k] = { ...(A[k] || {}), brand: sl.value || undefined, off: false }; const cb = root.querySelector(`[data-dkap="${ri}|${k}"]`); if (cb) cb.checked = true; });
  root.querySelectorAll('[data-dkaa]').forEach(sl => sl.onchange = () => { if (!sl.value) return; const ri = sl.dataset.dkaa; PP().apAdd[ri] = [...(PP().apAdd[ri] || []), sl.value]; const y = window.scrollY; renderTab(); window.scrollTo(0, y); });
  const ap = root.querySelector('#dkApply'); if (ap) ap.onclick = () => { const R = app.dict.res; const P = app.dict.pick; const pick = { c: {}, i: {}, v: P.v || {}, r: {}, mx: P.mx || {}, ma: P.ma || {}, ap: P.ap || {}, apAdd: P.apAdd || {}, it: P.it || {} };
    R.changes.forEach((c, i) => pick.c[i] = P.c[i] !== false && (c.room === undefined || P.r[c.room] !== false)); R.items.forEach((x, i) => pick.i[i] = P.i[i] !== undefined ? P.i[i] : !x.off); R.rooms.forEach((x, i) => pick.r[i] = P.r[i] !== false);
    dictApply(app.ins, R, pick); app.ins.dictLog = [...(app.ins.dictLog || []), { t: Date.now(), text: app.dict.text }];
    const n = Object.values(pick.c).filter(Boolean).length + Object.values(pick.i).filter(Boolean).length;
    app.dict = blank(); app.ins.dictDraft = ''; save(); renderTab(); setTimeout(() => { const lv = document.getElementById('dkLeave'); if (lv) lv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150); toast(n + ' item' + (n === 1 ? '' : 's') + ' saved to the appraisal file. Check each tab for anything still marked.'); };
  const ls = root.querySelector('#dkListen'); if (ls && DICT_SR) ls.onclick = () => {
    if (app.dict.listening && app.dict.sr) { app.dict.sr.stop(); return; }
    const sr = new DICT_SR(); sr.lang = 'en-US'; sr.continuous = true; sr.interimResults = false; app.dict.sr = sr; app.dict.listening = true;
    sr.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ' '; const b = $('#dkText'); app.dict.text = ((b ? b.value : app.dict.text) + ' ' + t).replace(/\s+/g, ' ').trimStart(); if (b) b.value = app.dict.text; };
    sr.onend = () => { app.dict.listening = false; app.dict.sr = null; renderTab(); }; sr.onerror = () => { app.dict.listening = false; };
    try { sr.start(); renderTab(); } catch (e) { app.dict.listening = false; toast('Use the microphone on the keyboard instead'); } };
}
