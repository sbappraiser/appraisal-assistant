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
const DICT_FIX = [ // what iPad dictation tends to hear → what she said
  [/\bclyde\b/g, 'clad'], [/\bclad\s+windows?\b/g, 'clad windows'], [/\bin ground\b/g, 'inground'], [/\bin-ground\b/g, 'inground'], [/\babove ground\b/g, 'aboveground'], [/\babove-ground\b/g, 'aboveground'],
  [/\bcrawl space\b/g, 'crawlspace'], [/\bground cover\b/g, 'groundcover'], [/\bstreet lights?\b/g, 'streetlights'], [/\bstreetlight\b/g, 'streetlights'], [/\bside walks?\b/g, 'sidewalks'],
  [/\bwalk ways?\b/g, 'walkways'], [/\bdrive way\b/g, 'driveway'], [/\bhot tub\b/g, 'hottub'], [/\bjacuzzi\b/g, 'hottub'], [/\bsolar panels?\b/g, 'solar'], [/\bphotovoltaic\b/g, 'solar'], [/\bpv system\b/g, 'solar'],
  [/\bduel pane\b/g, 'dual pane'], [/\bdouble pane\b/g, 'dual pane'], [/\bcomp shingles?\b/g, 'composition shingle'], [/\bhardy ?(board|plank)?\b/g, 'cement board'], [/\bhardie ?(board|plank)?\b/g, 'cement board'],
  [/\btrex\b/g, 'composite'], [/\bbuilt[ -]in\b/g, 'builtin'], [/\bcacti\b/g, 'cactus'], [/\bsalt water\b/g, 'saltwater'], [/\bautomatic cover\b/g, 'autocover'], [/\bauto cover\b/g, 'autocover']];
const DICT_FILLER = new Set('a an the and with has have had of in on at to for is are was were it its this that there some lots lot of various abundance plenty several many few all also plus very nice typical including include includes amenity amenities area areas featuring features feature has having be been by from into around side yard rear front left right back'.split(' '));
const stemW = w => { w = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'; if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2); if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1); return w; };
const dictTokens = text => { let t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[–—]/g, ' ') + ' '; DICT_FIX.forEach(([r, s]) => t = t.replace(r, s));
  const out = []; t.split(/(\s+|[.,;:!?()]+)/).forEach(p => { if (!p || /^\s+$/.test(p)) return; if (/^[.,;:!?()]+$/.test(p)) { if (/[.;!?]/.test(p)) out.push({ br: true }); else if (out.length) out[out.length - 1].cm = true; return; } p.split('/').forEach(w => w && out.push({ w, s: stemW(w) })); }); return out; };
const phraseOf = s => dictTokens(s).filter(t => !t.br).map(t => t.s);

/* ---- where she is (section words) ---- */
const DICT_CTX = [ // spoken word → tabs to try first
  ['street', ['street']], ['road', ['street']], ['driveway', ['driveway']],
  ['dwelling', ['front']], ['house', ['front']], ['home', ['front']], ['residence', ['front']], ['structure', ['front']], ['exterior', ['front']], ['roof', ['front']],
  ['garage', ['garage']], ['site', ['site', 'amenities']], ['lot', ['site', 'amenities']], ['yard', ['amenities', 'site']], ['backyard', ['amenities', 'site']], ['grounds', ['amenities', 'site']],
  ['landscaping', ['amenities', 'site']], ['landscape', ['amenities', 'site']], ['outdoor', ['amenities']], ['pool', ['amenities']],
  ['interior', ['interior']], ['inside', ['interior']], ['systems', ['systems']], ['mechanical', ['systems']], ['energy', ['systems']]];

/* ---- cue words: say which field a material belongs to ---- */
const DICT_CUE = [
  ['walkway', 'amenities.walks'], ['walk', 'amenities.walks'], ['pathway', 'amenities.walks'], ['path', 'amenities.walks'],
  ['fence', 'amenities.fenceMat'], ['fencing', 'amenities.fenceMat'], ['window', 'front.windows'], ['roof', 'front.roofMat'], ['roofing', 'front.roofMat'], ['shingle', 'front.roofMat'], ['tile roof', 'front.roofMat'],
  ['siding', 'front.walls'], ['exterior wall', 'front.walls'], ['wall', 'front.walls'], ['foundation', 'front.foundType front.foundMat'], ['driveway', 'driveway.driveMat'], ['street', 'street.streetSurface'],
  ['gutter', 'front.gutterMat'], ['downspout', 'front.gutterMat'], ['door', 'front.frontDoor'], ['front door', 'front.frontDoor'], ['entry door', 'front.frontDoor']];

/* ---- extra ways of saying a choice ---- */
const DICT_SYN = [
  ['streetlights', 'street.streetFeat', 'Street Lights'], ['curb', 'street.streetFeat', 'Curbs'], ['sidewalk', 'street.streetFeat', 'Sidewalks'], ['storm drain', 'street.streetFeat', 'Storm Drains'], ['no sidewalk', 'street.streetFeat', 'No Sidewalks'],
  ['blacktop', 'street.streetSurface', 'Asphalt'], ['paved', 'street.streetSurface', 'Asphalt'],
  ['vinyl clad', 'front.windows', 'Vinyl'], ['wood clad', 'front.windows', 'Clad Wood'], ['aluminum clad', 'front.windows', 'Clad Wood'], ['dual pane', 'front.windows', 'Dual Pane'], ['single pane', 'front.windows', 'Single Pane'], ['double hung', 'front.windows', 'Double Hung'], ['slider', 'front.windows', 'Sliding'], ['divided light', 'front.windows', 'Divided Lite'],
  ['composition shingle', 'front.roofMat', 'Composition'], ['composition', 'front.roofMat', 'Composition'], ['asphalt shingle', 'front.roofMat', 'Asphalt'], ['spanish tile', 'front.roofMat', 'Clay'], ['clay tile', 'front.roofMat', 'Clay'], ['concrete tile', 'front.roofMat', 'Concrete'], ['standing seam', 'front.roofMat', 'Metal'], ['wood shake', 'front.roofMat', 'Wood'], ['shake', 'front.roofMat', 'Wood'], ['tar and gravel', 'front.roofMat', 'TarAndGravel'], ['built up', 'front.roofMat', 'TarAndGravel'],
  ['stucco', 'front.walls', 'Stucco'], ['plaster', 'front.walls', 'Stucco'], ['cement board', 'front.walls', 'CementBoard'], ['board and batten', 'front.walls', 'Wood'], ['lap siding', 'front.walls', 'Wood'], ['wood siding', 'front.walls', 'Wood'], ['shingle siding', 'front.walls', 'Wood'], ['stone veneer', 'front.walls', 'SyntheticStone'],
  ['crawlspace', 'front.foundType', 'CrawlSpace'], ['raised foundation', 'front.foundType', 'ConcretePerimeter'], ['concrete perimeter', 'front.foundType', 'ConcretePerimeter'], ['raised floor', 'front.foundType', 'ConcretePerimeter'], ['slab', 'front.foundType', 'Slab'], ['post and pier', 'front.foundType', 'PostAndPier'], ['basement', 'front.foundType', 'Basement'],
  ['flagstone', 'amenities.walks', 'Flagstone'], ['dg', 'amenities.walks', 'Decomposed Granite'],
  ['irrigation', 'amenities.landSys', 'Automatic Irrigation'], ['sprinkler', 'amenities.landSys', 'Automatic Irrigation'], ['drip', 'amenities.landSys', 'Drip Irrigation'], ['drainage', 'amenities.landSys', 'Drainage System'], ['site drainage', 'amenities.landSys', 'Drainage System'], ['french drain', 'amenities.landSys', 'Subsurface Drains'], ['landscape lighting', 'amenities.landSys', 'Landscape Lighting'], ['landscape light', 'amenities.landSys', 'Landscape Lighting'], ['garden lighting', 'amenities.landSys', 'Landscape Lighting'],
  ['retaining wall', 'amenities.hardscape', 'Retaining Walls'], ['terrace', 'amenities.hardscape', 'Terraces'], ['terracing', 'amenities.hardscape', 'Terraces'], ['garden wall', 'amenities.hardscape', 'Garden Walls'], ['stone step', 'amenities.hardscape', 'Stone Steps'], ['perimeter wall', 'amenities.hardscape', 'Perimeter Walls'],
  ['tree', 'amenities.landFeat', 'Established Trees'], ['palm', 'amenities.landFeat', 'Established Trees'], ['oak', 'amenities.landFeat', 'Established Trees'], ['shrub', 'amenities.landFeat', 'Shrubs'], ['bush', 'amenities.landFeat', 'Bushes'], ['hedge', 'amenities.landFeat', 'Hedges'], ['groundcover', 'amenities.landFeat', 'Ground Cover'],
  ['succulent', 'amenities.landFeat', 'Succulents'], ['cactus', 'amenities.landFeat', 'Succulents'], ['lawn', 'amenities.landFeat', 'Lawn'], ['grass', 'amenities.landFeat', 'Lawn'], ['artificial turf', 'amenities.landFeat', 'Artificial Turf'], ['synthetic turf', 'amenities.landFeat', 'Artificial Turf'], ['fruit tree', 'amenities.landFeat', 'Fruit Trees'], ['citrus', 'amenities.landFeat', 'Citrus Trees'], ['avocado', 'amenities.landFeat', 'Avocado Trees'], ['flower', 'amenities.landFeat', 'Flower Beds'], ['rose', 'amenities.landFeat', 'Rose Garden'], ['native plant', 'amenities.landFeat', 'Native Plants'], ['vegetable garden', 'amenities.landFeat', 'Vegetable Garden'], ['raised bed', 'amenities.landFeat', 'Raised Beds'],
  ['fire pit', 'amenities.outdoor', 'Fire Pit'], ['firepit', 'amenities.outdoor', 'Fire Pit'], ['bbq', 'amenities.outdoor', 'Built-in BBQ Area'], ['builtin bbq', 'amenities.outdoor', 'Built-in BBQ Area'], ['builtin barbecue', 'amenities.outdoor', 'Built-in BBQ Area'], ['barbecue', 'amenities.outdoor', 'Built-in BBQ Area'], ['outdoor kitchen', 'amenities.outdoor', 'Outdoor Kitchen'], ['pergola', 'amenities.outdoor', 'Pergola'], ['trellis', 'amenities.outdoor', 'Trellis'], ['gazebo', 'amenities.outdoor', 'Gazebo'],
  ['solar', 'systems.renew', 'Solar']];

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
const SKIP_FIELD = f => !['one', 'multi'].includes(f.t) || /cond$|impact|^eq$|^ec$|^iq$|^ic$|^oq$|^oc$/i.test(f.k) || /condition|impact|rating|quality/i.test(f.l || '');
function dictIndex() {
  if (DICT_IX) return DICT_IX;
  const vals = []; // {ph:[stems], key:'sec.k', v, sec, f}
  const add = (ph, key, v, syn) => { const p = phraseOf(ph); if (p.length) vals.push({ ph: p, key, v, syn }); const j = p.join(''); if (p.length > 1) vals.push({ ph: [j], key, v, syn }); };
  SECTIONS.filter(sec => DICT_TABS.includes(sec.id)).forEach(sec => sec.groups.forEach(g => g.fields.forEach(f => { if (SKIP_FIELD(f)) return; let o; try { o = optsOf(f, {}, null); } catch (e) { o = []; }
    o.forEach(([v, l]) => { if (/^(other|none|yes|no|unknown)$/i.test(v) || /^other/i.test(l)) return; String(l).replace(/\(.*?\)/g, '').split('/').forEach(part => add(part.trim(), sec.id + '.' + f.k, v)); if (/^[A-Z][a-z]+[A-Z]/.test(v)) add(v.replace(/([a-z])([A-Z])/g, '$1 $2'), sec.id + '.' + f.k, v); }); })));
  DICT_SYN.forEach(([ph, key, v]) => add(ph, key, v, true));
  const itemWords = new Set(DICT_ITEMS.flatMap(x => phraseOf(x[0])).filter(w => w.length > 2)); itemWords.delete('roof'); itemWords.delete('outdoor'); itemWords.delete('swimming');
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i].ph.length > 1 && vals[i].ph.some(w => itemWords.has(w)) || vals[i].ph.length === 1 && itemWords.has(vals[i].ph[0])) vals.splice(i, 1);
  const mk = list => list.map(([ph, a, b]) => ({ ph: phraseOf(ph), a, b }));
  DICT_IX = { vals, ctx: mk(DICT_CTX), cue: mk(DICT_CUE).map(c => ({ ...c, keys: c.a.split(' ') })), items: mk(DICT_ITEMS) };
  return DICT_IX;
}
const dkField = key => { const [s, k] = key.split('.'); const sec = SECTIONS.find(x => x.id === s); for (const g of (sec ? sec.groups : [])) for (const f of g.fields) if (f.k === k) return { sec, g, f }; return null; };
const dkLabel = (key, v) => { const F = dkField(key); if (!F) return v; let o = []; try { o = optsOf(F.f, {}, null); } catch (e) {} const x = o.find(p => p[0] === v); return x ? x[1] : v; };

/* ---- read what she said ---- */
function dictParse(text) {
  const IX = dictIndex(); const T = dictTokens(text); const n = T.length;
  const at = (i, ph) => { for (let j = 0; j < ph.length; j++) { const t = T[i + j]; if (!t || t.br || t.s !== ph[j]) return false; } return true; };
  const longest = (i, list) => { let best = null; list.forEach(e => { if ((!best || e.ph.length > best.ph.length) && at(i, e.ph)) best = e; }); return best; };
  // pass 1: mark section words, cues, list items and values (longest match wins)
  const marks = []; let ctx = []; const used = new Array(n).fill(false);
  for (let i = 0; i < n; i++) { if (T[i].br || used[i]) continue;
    const c = longest(i, IX.ctx), q = longest(i, IX.cue), it = longest(i, IX.items);
    const vv = IX.vals.filter(e => at(i, e.ph)); const vlen = vv.reduce((m, e) => Math.max(m, e.ph.length), 0); const vals = vv.filter(e => e.ph.length === vlen);
    const L = Math.max(c ? c.ph.length : 0, q ? q.ph.length : 0, it ? it.ph.length : 0, vlen); if (!L) continue;
    if (it && it.ph.length === L) { marks.push({ i, len: L, kind: 'item', list: it.a, type: it.b, ctx: [...ctx] }); }
    else if (c && c.ph.length === L) { ctx = c.a; marks.push({ i, len: L, kind: 'ctx' }); if (q && q.ph.length === L) marks[marks.length - 1].cue = q.keys; }
    else if (q && q.ph.length === L) marks.push({ i, len: L, kind: 'cue', keys: q.keys });
    else if (vlen === L && vals.length) { const syn = vals.filter(v => v.syn); marks.push({ i, len: L, kind: 'val', vals: syn.length && new Set(syn.map(v => v.key)).size === 1 ? syn : vals, ctx: [...ctx] }); }
    for (let j = i; j < i + L; j++) used[j] = true; i += L - 1; }
  // a section word can also be a cue ("street asphalt", "roof composition")
  const cueNear = (m, keys) => { const idx = marks.indexOf(m); let best = null, bd = 99;
    for (let d = 1; d <= 3; d++) [idx - d, idx + d].forEach(j => { const o = marks[j]; if (!o) return; const k = o.kind === 'cue' ? o.keys : o.kind === 'ctx' && o.cue ? o.cue : null; if (!k) return;
      const br = T.slice(Math.min(o.i, m.i), Math.max(o.i, m.i)).some(t => t.br); if (br && j < idx) return; // a cue before a full stop belongs to the sentence before
      const hit = keys.find(x => k.includes(x)); if (hit && d < bd) { best = hit; bd = d; } }); return best; };
  const changes = new Map(); const items = []; const unclear = [];
  const put = (key, v) => { const F = dkField(key); if (!F) return; const c = changes.get(key) || { key, sec: F.sec, f: F.f, vals: [] }; if (!c.vals.includes(v)) c.vals.push(v); changes.set(key, c); };
  const ITEM_WORDS = new Set([...ITEM_MAT, ...POOL_MAT, ...POOL_FEAT, ...OL_FEAT, ['attached'], ['cover']].map(x => phraseOf(x[0]).join(' ')));
  const sameSentence = (a, b) => !T.slice(Math.min(a, b), Math.max(a, b)).some(t => t.br || t.cm);   // a comma or full stop ends what belongs to a deck, pool …
  const nearestItem = j => { let best = null, bd = 99; marks.forEach(o => { if (o.kind !== 'item') return; const d = j < o.i ? o.i - j : j - (o.i + o.len - 1); if (d <= 6 && d < bd && sameSentence(j, o.i)) { best = o; bd = d; } }); return best; };
  marks.forEach((m, mi) => {
    if (m.kind === 'val') { const keys = [...new Set(m.vals.map(v => v.key))];
      const stems = T.slice(m.i, m.i + m.len).map(t => t.s).join(' '), word = T.slice(m.i, m.i + m.len).map(t => t.w).join(' ');
      const nb = [marks[mi - 1], marks[mi + 1]].filter(o => o && o.kind === 'item' && Math.abs(o.i - m.i) <= 3 && sameSentence(o.i, m.i)).sort((a, b) => Math.abs(a.i - m.i) - Math.abs(b.i - m.i))[0];
      if (nb && ITEM_WORDS.has(stems)) { m.taken = nb; return; }   // "wood decking", "pebble pool"
      let key = keys.length === 1 ? keys[0] : cueNear(m, keys);
      if (!key && m.ctx.length) { for (const s of m.ctx) { const k = keys.find(x => x.startsWith(s + '.')); if (k) { key = k; break; } } }
      if (!key) { unclear.push(word); return; }
      put(key, m.vals.find(v => v.key === key).v);
      if (key === 'systems.renew') { const near = T.slice(Math.max(0, m.i - 2), m.i + m.len + 2).map(t => t.s).join(' ');   // "own solar", "leased solar"
        T.slice(Math.max(0, m.i - 2), m.i + m.len + 2).forEach(t => { if (/^(own|owned|leased?|ppa)$/.test(t.s)) t.item = true; }); if (/\b(own|owned)\b/.test(near)) put('systems.solarOwn', 'Owned'); else if (/\bleas(e|ed)\b/.test(near)) put('systems.solarOwn', 'Leased'); else if (/\bppa\b|power purchase/.test(near)) put('systems.solarOwn', 'PowerPurchaseAgreement'); } }
    if (m.kind === 'item') { m.words = []; items.push(m); }
  });
  // every other word goes to the nearest pool / spa / deck in the same sentence
  T.forEach((t, j) => { if (t.br) return; const mk = marks.find(o => j >= o.i && j < o.i + o.len); if (mk && !(mk.kind === 'val' && mk.taken)) { return; }
    const o = mk && mk.taken ? mk.taken : nearestItem(j); if (o) { o.words.push(t.w); t.item = true; } });
  const out = items.map(m => dictItem(m));
  // solar ownership said with it ("own solar", "leased solar")
  if (changes.has('amenities.fenceMat')) put('amenities.hardscape', 'Fencing');
  // leftovers: words that were not used and are not filler
  const left = []; let run = [];
  T.forEach((t, j) => { const inMark = t.item || marks.some(m => j >= m.i && j < m.i + m.len && !(m.kind === 'val' && m.taken === undefined && unclear.includes(T.slice(m.i, m.i + m.len).map(x => x.w).join(' '))));
    if (t.br || inMark || DICT_FILLER.has(t.s) || DICT_FILLER.has(t.w)) { if (run.length) left.push(run.join(' ')); run = []; return; } run.push(t.w); });
  if (run.length) left.push(run.join(' '));
  return { changes: [...changes.values()], items: out, unclear: [...new Set(unclear)], left: [...new Set(left)] };
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
function dictApply(ins, res, pick) {
  res.changes.forEach((c, i) => { if (!pick.c[i]) return; const d = ins.data[c.sec.id];
    if (c.f.t === 'multi') d[c.f.k] = [...new Set([...(Array.isArray(d[c.f.k]) ? d[c.f.k].filter(x => x !== 'None') : []), ...c.vals])];
    else d[c.f.k] = (pick.v && pick.v[i]) || c.vals[0]; });
  if (res.changes.some((c, i) => pick.c[i] && c.key === 'driveway.driveMat')) ins.data.driveway.hasDrive = true;
  res.items.forEach((it, i) => { if (!pick.i[i]) return; const L = ins.lists[it.list]; const o = { id: uid(), type: it.type };
    if (it.list === 'waterFeatures') { if (it.mat) o.mat = it.mat; if (it.feat.length) o.feat = it.feat; if (it.note) o.note = it.note; }
    else { if (it.material) o.material = it.material; if (it.feat.length) o.feat = it.feat; if (it.note) o.note = it.note; }
    L.push(o); });
}

/* ---- the Dictate page ---- */
const DICT_SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
function renderDictate() {
  const ins = app.ins; const log = ins.dictLog || []; const R = app.dict && app.dict.res;
  const row = (on, attr, where, what, note) => `<label class="dk-row"><input type="checkbox" ${attr} ${on ? 'checked' : ''}><span class="dk-where">${esc(where)}</span><span class="dk-what">${what}</span>${note ? `<small>${esc(note)}</small>` : ''}</label>`;
  return `<section class="group open"><div class="ghead static"><span class="gtitle">Dictate your notes</span></div><div class="exp">
    <p class="help">Say the area first, then what you see, the way you walk it: <i>“Street asphalt curbs sidewalks street lights. Dwelling cottage stucco composition shingle roof vinyl clad windows casement windows crawlspace. Site concrete walkways paver walkways wood fencing wood decking terraces retaining walls drainage irrigation landscape lighting inground pool with an attached spa. Owned solar. Landscaping trees shrubs hedges groundcover succulents.”</i></p>
    <p class="help">Tap in the box, then tap the <b>microphone on the iPad keyboard</b> and talk.${DICT_SR ? ' Or use the Listen button.' : ''} Say “period” between areas if you like. Nothing is filled until you check the list and tap <b>Fill in</b>.</p>
    <textarea class="txt dk-box" id="dkText" rows="7" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="Tap here, then the microphone on the keyboard">${esc((app.dict && app.dict.text) || '')}</textarea>
    <div class="row">${DICT_SR ? `<button class="btn" id="dkListen">${app.dict && app.dict.listening ? '■ Stop' : '🎤 Listen'}</button>` : ''}<button class="btn primary" id="dkRead">Read it</button><button class="btn ghost" id="dkClear">Clear</button></div>
    ${R ? `<h3 class="dk-h">What I heard</h3>
      ${R.changes.length || R.items.length ? '' : '<p class="help">Nothing I recognize yet.</p>'}
      ${R.changes.map((c, i) => { const cur = ins.data[c.sec.id][c.f.k]; const curL = Array.isArray(cur) ? cur.map(v => dkLabel(c.key, v)).join(', ') : cur != null && cur !== '' && typeof cur !== 'boolean' ? dkLabel(c.key, cur) : '';
        const what = c.vals.map(v => '<b>' + esc(dkLabel(c.key, v)) + '</b>').join(', ');
        const note = c.f.t === 'one' && curL && curL !== dkLabel(c.key, c.vals[c.vals.length - 1]) ? 'replaces ' + curL : c.f.t === 'multi' && curL ? 'added to ' + curL : '';
        const choose = c.f.t === 'one' && c.vals.length > 1 ? `<span class="dk-pick">${c.vals.map((v, j) => `<label><input type="radio" name="dkv${i}" data-dkv="${i}" value="${esc(v)}" ${(app.dict.pick.v[i] ?? c.vals[0]) === v ? 'checked' : ''}>${esc(dkLabel(c.key, v))}</label>`).join('')}</span>` : null;
        return typeof c.vals[0] === 'boolean' ? '' : row(app.dict.pick.c[i] !== false, `data-dkc="${i}"`, c.sec.title + ' › ' + c.f.l, choose || what, choose ? 'one choice – pick it' : note); }).join('')}
      ${R.items.map((it, i) => row(app.dict.pick.i[i] !== false, `data-dki="${i}"`, (it.list === 'waterFeatures' ? 'Pool, spa & water features' : 'Porches, patios & decks') + ' › new',
        '<b>' + esc(labelOf(LISTS[it.list].fields[0].o, it.type) || it.type) + '</b>' + [it.material ? ' · ' + esc(labelOf(LISTS.outdoorLiving.fields[2].o, it.material) || it.material) : '', it.mat ? ' · ' + esc(it.mat) : '', it.feat.length ? ' · ' + esc(it.feat.join(', ')) : '', it.note ? ' · ' + esc(it.note) : ''].join(''), '')).join('')}
      ${R.unclear.length ? `<p class="dk-warn">Not sure where these go – tap the field yourself: <b>${R.unclear.map(esc).join(', ')}</b></p>` : ''}
      ${R.left.length ? `<p class="dk-left">Words not used: ${R.left.map(w => '“' + esc(w) + '”').join(', ')}. They stay in your dictation log (workfile only).</p>` : ''}
      ${R.changes.length || R.items.length ? `<div class="row"><button class="btn primary" id="dkApply">Fill in the ticked items</button></div>` : ''}` : ''}
    ${log.length ? `<details class="dk-log"><summary>Dictation log (${log.length}) – workfile only, not sent to SFREP</summary>${log.slice().reverse().map(x => `<p><small>${esc(new Date(x.t).toLocaleString())}</small><br>${esc(x.text)}</p>`).join('')}</details>` : ''}
  </div></section>`;
}
function bindDictate(root) {
  const box = root.querySelector('#dkText'); if (!box) return; app.dict = app.dict || { text: '', pick: { c: {}, i: {}, v: {} } };
  box.oninput = () => { app.dict.text = box.value; };
  const read = () => { app.dict.text = box.value; app.dict.res = dictParse(box.value); app.dict.pick = { c: {}, i: {}, v: {} }; renderTab(); };
  root.querySelector('#dkRead').onclick = read;
  root.querySelector('#dkClear').onclick = () => { app.dict = { text: '', pick: { c: {}, i: {}, v: {} } }; renderTab(); };
  root.querySelectorAll('[data-dkc]').forEach(cb => cb.onchange = () => { app.dict.pick.c[cb.dataset.dkc] = cb.checked; });
  root.querySelectorAll('[data-dkv]').forEach(r => r.onchange = () => { app.dict.pick.v[r.dataset.dkv] = r.value; });
  root.querySelectorAll('[data-dki]').forEach(cb => cb.onchange = () => { app.dict.pick.i[cb.dataset.dki] = cb.checked; });
  const ap = root.querySelector('#dkApply'); if (ap) ap.onclick = () => { const R = app.dict.res; const pick = { c: {}, i: {}, v: app.dict.pick.v || {} };
    R.changes.forEach((c, i) => pick.c[i] = app.dict.pick.c[i] !== false); R.items.forEach((x, i) => pick.i[i] = app.dict.pick.i[i] !== false);
    dictApply(app.ins, R, pick); app.ins.dictLog = [...(app.ins.dictLog || []), { t: Date.now(), text: app.dict.text }];
    const n = Object.values(pick.c).filter(Boolean).length + Object.values(pick.i).filter(Boolean).length;
    app.dict = { text: '', pick: { c: {}, i: {}, v: {} } }; save(); renderTab(); toast(n + ' item' + (n === 1 ? '' : 's') + ' filled in. Check the tabs for anything still marked.'); };
  const ls = root.querySelector('#dkListen'); if (ls && DICT_SR) ls.onclick = () => {
    if (app.dict.listening && app.dict.sr) { app.dict.sr.stop(); return; }
    const sr = new DICT_SR(); sr.lang = 'en-US'; sr.continuous = true; sr.interimResults = false; app.dict.sr = sr; app.dict.listening = true;
    sr.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ' '; const b = $('#dkText'); app.dict.text = ((b ? b.value : app.dict.text) + ' ' + t).replace(/\s+/g, ' ').trimStart(); if (b) b.value = app.dict.text; };
    sr.onend = () => { app.dict.listening = false; app.dict.sr = null; renderTab(); }; sr.onerror = () => { app.dict.listening = false; };
    try { sr.start(); renderTab(); } catch (e) { app.dict.listening = false; toast('Use the microphone on the keyboard instead'); } };
}
