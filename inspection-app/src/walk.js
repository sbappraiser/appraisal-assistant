/* =====================================================================
   🚶 Walk-through tab (6w, Oct 2026) – her request: say the place ("Driveway:"), take the photos, say the notes,
   sketch, and never stop to label anything. One place at a time; every photo and note goes to the place she is in.
   - Places follow her route (property access → yards → driveway → garage → front → around the house while
     sketching → rear → yards, patios, pool, site, view → ADU / outbuildings → rooms by level → attic, systems,
     detectors → interview → before you leave). She can tap any place, or say it with a colon.
   - Photos: camera inside the app (stays open; tap the shutter as often as she likes); each photo goes to that
     place's UAD photo slot (Dwelling Front, Dwelling Rear, Property Access (Street Scene) …).
   - Notes: kept per place; "Sort my notes" puts them in the Dictate box with the place as a heading, so her tuned
     Dictate sorting fills the fields (nothing new to learn, nothing filled without her review).
   - Checklist per place: required photos and the UAD answers still needed there; ✓ heard when her notes answer it.
   Data: ins.walk = { place, level, notes: {key: text}, sentLen: {key: n}, shot: {key: slotKey} }.
   ===================================================================== */
const WK = { cam: false, listen: false, editing: null };
function wkData(ins) { const w = ins.walk = ins.walk || {}; w.notes = w.notes || {}; w.sentLen = w.sentLen || {}; w.shot = w.shot || {}; w.place = w.place || 'access'; w.level = w.level || 'LevelOne'; return w; }

/* ---------- the places ---------- */
const WKF = (sec, base) => ({ kind: 'field', sec, base });
const WK_PLACES = [
  { key: 'access', g: 'Outside', t: 'Property access (street)', say: ['property access', 'street scene', 'street', 'road'], head: 'Street', shots: [{ k: 'st', t: 'Street scene', tg: WKF('street', 'photoStreet') }], iss: x => x.tab === 'street', hint: 'Public street, local road, asphalt, curbs, gutters, street lights, sidewalks. Access typical for the market?' },
  { key: 'frontyard', g: 'Outside', t: 'Front yard', say: ['front yard', 'front yards'], head: 'Front yard', shots: [{ k: 'ld', t: 'Front yard', tg: WKF('amenities', 'photoLand'), lab: 'Front yard' }], iss: x => x.tab === 'amenities' && x.group === 'land', hint: 'Landscaping, walkways, fencing, walls, irrigation, lighting.' },
  { key: 'driveway', g: 'Outside', t: 'Driveway', say: ['driveway', 'drive way'], head: 'Driveway', shots: [{ k: 'dr', t: 'Driveway', tg: WKF('driveway', 'photoDrive') }], iss: x => x.tab === 'driveway', hint: 'Surface, how many cars, shared driveway?' },
  { key: 'garage', g: 'Outside', t: 'Garage', say: ['garage exterior', 'garage interior', 'inside the garage', 'garage', 'carport'], head: 'Garage', shots: [{ k: 'ext', t: 'Garage', tg: WKF('garage', 'photoGarage') }, { k: 'int', t: 'Garage interior', tg: WKF('garage', 'photoGarageInt') }], iss: x => x.tab === 'garage', hint: '2 car attached garage, opener, finished, epoxy floor, EV charger.' },
  { key: 'front', g: 'Outside', t: 'Front of dwelling', say: ['front of dwelling', 'front of the dwelling', 'front of house', 'front of the house', 'front of residence', 'front elevation', 'dwelling front', 'dwelling', 'residence', 'front'], head: 'Dwelling', shots: [{ k: 'fr', t: 'Dwelling front', tg: WKF('front', 'photoFront') }], iss: x => x.tab === 'front', hint: 'Style, stories, exterior walls, roof, windows, foundation, gutters, front door height, quality and condition.' },
  { key: 'exterior', g: 'Outside', t: 'Exterior of dwelling', say: ['exterior of dwelling', 'exterior of the dwelling', 'exterior of house', 'exterior', 'side of dwelling', 'side of house'], head: 'Exterior', shots: [{ k: 'ex', t: 'Exterior of dwelling', ext: true }], iss: x => x.tab === 'exterior' && !/Rear/i.test(x.label), hint: 'Photos as you sketch around the house. Walls, windows, foundation, doors, anything worth noting.', sketch: true },
  { key: 'rear', g: 'Outside', t: 'Rear of dwelling', say: ['rear of dwelling', 'rear of the dwelling', 'rear of house', 'rear of the house', 'rear elevation', 'back of house', 'dwelling rear', 'rear'], head: 'Rear', shots: [{ k: 'rr', t: 'Dwelling rear', tg: WKF('exterior', 'photoRear') }], iss: x => x.tab === 'exterior' && /Rear/i.test(x.label), hint: 'Rear of the house, decks or balconies off it, defects.' },
  { key: 'yards', g: 'Outside', t: 'Side & rear yards', say: ['side yard', 'side yards', 'rear yard', 'rear yards', 'back yard', 'backyard', 'yards', 'yard'], head: 'Rear yard', shots: [{ k: 'ld', t: 'Yard', tg: WKF('amenities', 'photoLand'), lab: 'Rear yard' }, { k: 'sd', t: 'Side yard', tg: WKF('site', 'photoSite'), lab: 'Side yard' }], iss: () => false, hint: 'Lawn, trees, walkways, fencing, retaining walls, drainage.' },
  { key: 'outdoor', g: 'Outside', t: 'Patios, porches & decks', chooser: 'outdoorLiving', head: 'Outdoor', hint: 'Start with what it is: “Patio colon covered flagstone patio…”, “Deck colon…”. A new one is added for you.', iss: x => x.tab === 'amenities' && x.group === 'olv' },
  { key: 'water', g: 'Outside', t: 'Pool, spa & water features', chooser: 'waterFeatures', head: 'Outdoor', hint: 'Start with what it is: “Pool colon gunite, heated, automatic cover…”, “Spa colon…”. A new one is added for you.', iss: x => x.tab === 'amenities' && x.group === 'wf' },
  { key: 'site', g: 'Outside', t: 'Site, landscaping & drainage', say: ['site', 'landscaping', 'landscape', 'drainage', 'irrigation', 'hardscape', 'topography'], head: 'Site', shots: [{ k: 'si', t: 'Site', tg: WKF('site', 'photoSite') }, { k: 'ld', t: 'Landscaping', tg: WKF('amenities', 'photoLand') }], iss: x => (x.tab === 'site' && x.group !== 'view') || (x.tab === 'amenities' && (x.group === 'land' || x.group === 'rec')), hint: 'Topography, drainage, irrigation, landscaping (how much, what quality), retaining walls, sport court, solar.' },
  { key: 'view', g: 'Outside', t: 'View', say: ['view', 'views'], head: 'View', shots: [{ k: 'vw', t: 'View', tg: WKF('site', 'photoView') }], iss: x => x.tab === 'site' && x.group === 'view', hint: 'Ocean, mountain, city lights; full or partial; beneficial, neutral or adverse.' },
  { key: 'buildings', g: 'Other buildings', t: 'ADU & outbuildings', chooser: 'buildings', head: 'Outbuilding', hint: 'Start with the building: “ADU colon…”, “Guest house colon…”, “Shed colon…”.', iss: x => x.tab === 'buildings' },
  { key: 'rooms', g: 'Inside', t: 'Rooms', chooser: 'rooms', head: 'Interior', hint: 'Start with the room: “Bedroom 2 colon carpet…”, “Kitchen colon…”, “Level 2 colon” to change floors.', iss: x => x.tab === 'interior' && ['rooms', 'beds', 'baths', 'kitchens', 'wetbars', 'levels'].includes(x.group) },
  { key: 'interiorAll', g: 'Inside', t: 'Whole house (ceilings, floors, features)', say: ['whole house', 'throughout', 'interior'], head: 'Interior', shots: [{ k: 'in', t: 'Interior', extra: 'interior' }], iss: x => x.tab === 'interior' && ['unit', 'finish', 'feat', 'noncont'].includes(x.group), hint: 'Ceiling heights, flooring, recessed lighting, crown molding, fireplaces, quality and condition.' },
  { key: 'attic', g: 'Inside', t: 'Attic', say: ['attic'], head: 'Attic', shots: [{ k: 'at', t: 'Attic', tg: WKF('interior', 'photoAttic') }], iss: x => x.tab === 'interior' && x.group === 'attic', hint: 'Access, finished or unfinished, insulation.' },
  { key: 'systems', g: 'Inside', t: 'Water heater & systems', say: ['water heater', 'systems', 'heating', 'furnace', 'hvac', 'electrical panel', 'solar panels', 'solar'], head: 'Systems', shots: [{ k: 'wh', t: 'Water heater', tg: WKF('systems', 'photoWH') }, { k: 'so', t: 'Solar', tg: WKF('systems', 'photoSolar') }], iss: x => x.tab === 'systems', hint: 'Water heater (strapped?), heating type and fuel, central air, solar owned or leased.' },
  { key: 'safety', g: 'Inside', t: 'Smoke & CO detectors', say: ['smoke detectors', 'smoke detector', 'carbon monoxide', 'co detector', 'detectors'], head: 'Interior', shots: [{ k: 'sm', t: 'Smoke detector', tg: WKF('interior', 'photoSmoke') }, { k: 'co', t: 'CO detector', tg: WKF('interior', 'photoCO') }], iss: x => x.tab === 'interior' && x.group === 'safety', hint: 'Smoke and carbon monoxide detectors present.' },
  { key: 'interview', g: 'Wrap-up', t: 'Interview with the owner', say: ['interview', 'owner reports', 'owner reported'], head: 'Owner reports', shots: [], iss: x => x.tab === 'interview', hint: 'Recent upgrades, remodels, roof, repairs. Pause listening during the conversation unless they agree to be recorded – then say a short summary ("Owner reports kitchen remodeled 2019…").', interview: true },
  { key: 'leave', g: 'Wrap-up', t: 'Before you leave', leave: true, iss: () => false }];
const WK_ORDER = WK_PLACES.map(p => p.key);
const WK_OUTLIV = ['Patio', 'Porch', 'Deck', 'Balcony', 'Loggia', 'Terrace', 'Courtyard', 'Portico', 'Veranda', 'Roof Deck'];
const WK_BLD = [['adu', 'ADU'], ['Guest House', 'Guest house'], ['Guest Quarters', 'Guest quarters'], ['Studio', 'Studio'], ['Pool House', 'Pool house'], ['Office', 'Office'], ['Gym', 'Gym'], ['Workshop', 'Workshop'], ['Shed', 'Shed'], ['Barn', 'Barn'], ['Greenhouse', 'Greenhouse'], ['Storage', 'Storage']];
const WK_ROOMS = [['rooms', 'Entry'], ['rooms', 'Living Room'], ['rooms', 'Family Room'], ['rooms', 'Dining Room'], ['rooms', 'Dining Area'], ['kitchens', 'Kitchen'], ['bedrooms', 'Bedroom'], ['baths', 'Bath'], ['baths', 'Half Bath'], ['rooms', 'Den'], ['rooms', 'Office'], ['rooms', 'Laundry Room'], ['wetbars', 'Wet bar']];
const WK_LEVELS = [['LevelOne', 'Level 1'], ['LevelTwo', 'Level 2'], ['LevelThree', 'Level 3'], ['BelowGradeOne', 'Basement']];
const wkLevelName = v => (WK_LEVELS.find(x => x[0] === v) || LEVELS_ALL.find(x => x[0] === v) || [v, v])[1];

/* dynamic places: an item in one of the lists (room, patio, pool, ADU, outbuilding) */
function wkItemPlace(ins, key) {
  const m = /^L:([a-zA-Z]+):(.+)$/.exec(key || ''); if (!m) return null; const list = m[1], L = ins.lists[list] || []; const i = L.findIndex(x => x.id === m[2]); if (i < 0) return null;
  const it = L[i], def = LISTS[list]; const name = def.name(it, i, L);
  const base = def.photo ? [{ list, item: it.id, slot: 'main', label: def.photo.label(it, i, L), cat: def.photo.cat, required: !!def.photo.required, roomType: def.photo.roomType || (def.photo.roomTypeFn && def.photo.roomTypeFn(it)) || null }] : [];
  const extra = def.extraPhotos ? def.extraPhotos(it).map(x => ({ list, item: it.id, slot: x.key, label: x.label, cat: x.cat, required: !!x.required && x.show, roomType: x.roomType || null })) : [];
  const parent = ['rooms', 'bedrooms', 'baths', 'kitchens', 'wetbars'].includes(list) ? 'rooms' : list === 'outdoorLiving' ? 'outdoor' : list === 'waterFeatures' ? 'water' : 'buildings';
  const head = list === 'adus' ? 'ADU' : list === 'waterFeatures' ? (/Pool/.test(it.type || '') ? 'Pool' : /Spa/.test(it.type || '') ? 'Spa' : name) : list === 'kitchens' && i === 0 ? 'Kitchen' : name;
  return { key, g: 'item', t: name + (it.level && parent === 'rooms' ? ' · ' + wkLevelName(it.level) : ''), head, list, it, i, parent,
    shots: [...base, ...extra].map(s => ({ k: s.slot, t: s.label, slot: s })), iss: x => x.item === it.id, hint: wkItemHint(list, it) };
}
function wkItemHint(list, it) {
  return { rooms: 'Flooring, ceiling type and height, features, condition.', bedrooms: 'Flooring, closet, en suite, ceiling, features.', baths: 'Shower / tub, vanity, counters, flooring, updated when, condition.',
    kitchens: 'Counters, cabinets, appliances with brands, island, flooring, updated when, condition.', wetbars: 'Sink, counters, refrigerator.', outdoorLiving: 'Material, covered or open, features, condition.',
    waterFeatures: 'Pool or spa material, heated, cover, equipment, condition.', adus: 'Permitted? Kitchen, baths, bedrooms, occupancy, quality and condition.', outbuildings: 'Use, utilities, finished, permitted, condition.' }[list] || '';
}
function wkPlace(ins, key) { return WK_PLACES.find(p => p.key === key) || wkItemPlace(ins, key) || WK_PLACES[0]; }

/* ---------- where a photo goes ---------- */
const WK_EXT_FIELDS = ['photoSide1', 'photoSide2', 'photoRear2'];
function wkSlot(ins, P, shot) {
  if (shot.slot) return shot.slot;
  if (shot.ext) { const f = WK_EXT_FIELDS.find(k => !photosInSlot(ins, { sec: 'exterior', field: k }).length); return f ? { sec: 'exterior', field: f, label: 'Exterior of dwelling', cat: 'DwellingExteriorExhibit' } : { sec: 'exterior', extra: true, label: 'Exterior of dwelling', cat: 'DwellingExteriorExhibit', toReport: true }; }
  if (shot.extra) return { sec: shot.extra, extra: true, label: shot.t, cat: 'UnitInteriorExhibit' };
  const s = dkPhotoSlot(ins, shot.tg, true); if (!s) return { sec: shot.tg.sec, extra: true, label: shot.t, cat: 'SupplementalExhibit' };
  return shot.lab && !s.required ? { ...s, label: shot.lab } : s;
}
function wkShot(ins, P) { const w = wkData(ins); const S = P.shots || []; return S.find(s => s.k === w.shot[P.key]) || S[0] || null; }
async function wkSavePhoto(file) {
  const ins = app.ins, w = wkData(ins), P = wkPlace(ins, w.place), shot = wkShot(ins, P); if (!shot) { toast('Pick a place for the photo first'); return; }
  const slot = wkSlot(ins, P, shot); const meta = await addPhoto(ins, slot, file); meta.walk = P.key; if (slot.toReport) meta.toReport = true;
  save(); wkRefresh(true);
}

/* ---------- heading words: "Driveway:", "Bedroom 2:", "Patio:" ---------- */
function wkHeadIndex(ins) {
  const out = [];
  WK_PLACES.forEach(p => (p.say || []).forEach(s => out.push({ s, key: p.key })));
  WK_OUTLIV.forEach(t => out.push({ s: t.toLowerCase(), make: { list: 'outdoorLiving', type: t } }));
  [['pool', 'IngroundPool'], ['swimming pool', 'IngroundPool'], ['spa', 'IngroundSpa'], ['hot tub', 'Above-ground Spa / Hot Tub'], ['fountain', 'Fountain'], ['pond', 'Pond'], ['koi pond', 'Koi Pond'], ['outdoor shower', 'OutdoorShower'], ['sauna', 'Sauna'], ['cold plunge', 'Cold Plunge']].forEach(([s, t]) => out.push({ s, make: { list: 'waterFeatures', type: t } }));
  WK_BLD.forEach(([t, l]) => out.push({ s: l.toLowerCase(), make: t === 'adu' ? { list: 'adus' } : { list: 'outbuildings', type: t } }));
  out.push({ s: 'accessory dwelling unit', make: { list: 'adus' } }, { s: 'guest unit', make: { list: 'adus' } });
  WK_LEVELS.forEach(([v, l]) => out.push({ s: l.toLowerCase(), level: v })); [['upstairs', 'LevelTwo'], ['second floor', 'LevelTwo'], ['2nd floor', 'LevelTwo'], ['main level', 'LevelOne'], ['first floor', 'LevelOne'], ['downstairs', 'LevelOne'], ['lower level', 'BelowGradeOne']].forEach(([s, v]) => out.push({ s, level: v }));
  ['rooms', 'bedrooms', 'baths', 'kitchens', 'wetbars', 'outdoorLiving', 'waterFeatures', 'adus', 'outbuildings'].forEach(list => (ins.lists[list] || []).forEach((it, i, L) => { const n = LISTS[list].name(it, i, L); if (n) out.push({ s: n.toLowerCase(), key: 'L:' + list + ':' + it.id }); }));
  ROOM_TYPES.filter(t => !/^(Other|Hall|Storage|Mechanical)$/.test(t)).forEach(t => out.push({ s: t.toLowerCase().replace(/ \/.*$/, ''), make: { list: 'rooms', type: t } }));
  [['kitchen', 'kitchens'], ['bedroom', 'bedrooms'], ['primary bedroom', 'bedrooms'], ['bathroom', 'baths'], ['bath', 'baths'], ['full bath', 'baths'], ['half bath', 'baths', 'HalfBathroom'], ['powder room', 'baths', 'HalfBathroom'], ['wet bar', 'wetbars']].forEach(([s, list, kind]) => out.push({ s, make: { list, kind } }));
  return out.sort((a, b) => b.s.length - a.s.length);
}
/* "bedroom 2" → the existing Bedroom 2, or a new one; "bedroom" alone → a new bedroom */
function wkResolveHead(ins, h, num) {
  const w = wkData(ins);
  if (h.level) { w.level = h.level; return null; }
  if (h.key) return h.key;
  const m = h.make; const L = ins.lists[m.list];
  if (num && (m.list === 'bedrooms' || m.list === 'baths')) { const lab = (m.list === 'bedrooms' ? 'Bedroom ' : m.kind === 'HalfBathroom' ? 'Half Bath ' : 'Bath ') + num; const ex = L.find(x => x.label === lab); if (ex) return 'L:' + m.list + ':' + ex.id; return 'L:' + m.list + ':' + wkMake(ins, { ...m, label: lab }).id; }
  if (m.list === 'kitchens' && L.length && !L.some(x => x.walkUsed)) { L[0].walkUsed = true; return 'L:kitchens:' + L[0].id; }
  if (m.list === 'adus' && L.length) return 'L:adus:' + L[0].id;
  if (['outdoorLiving', 'waterFeatures', 'outbuildings'].includes(m.list)) { const ex = L.find(x => x.type === m.type); if (ex) return 'L:' + m.list + ':' + ex.id; }
  if (m.list === 'rooms') { const ex = L.find(x => x.type === m.type && x.level === w.level); if (ex) return 'L:rooms:' + ex.id; }
  return 'L:' + m.list + ':' + wkMake(ins, m).id;
}
function wkMake(ins, m) {
  const w = wkData(ins); let it;
  if (['rooms', 'bedrooms', 'baths', 'kitchens', 'wetbars'].includes(m.list)) it = dictNewItem(ins, { list: m.list, type: m.type, kind: m.kind, label: m.label, level: w.level });
  else { it = { id: uid(), dkPhoto: true }; if (m.type) it.type = m.type; ins.lists[m.list].push(it); }
  if (m.list === 'kitchens') it.walkUsed = true;
  return it;
}
/* split what she said at place headings ("… gutters. Driveway: concrete …") and file each part */
function wkFile(ins, text) {
  const w = wkData(ins); const IX = wkHeadIndex(ins); let cur = w.place; const parts = []; let buf = '';
  const words = text.replace(/:\s*/g, ': ').split(/\s+/).filter(Boolean);
  const isHeadAt = (j) => {   // words[..j] ends with "xxx:"
    const wj = words[j]; if (!/:$/.test(wj)) return null;
    for (let n = Math.min(5, j + 1); n >= 1; n--) { const ph = words.slice(j - n + 1, j + 1).join(' ').replace(/:$/, '').toLowerCase().replace(/[.,!?]/g, '').trim(); let num = null; let phr = ph;
      const mm = /^(.*?)\s*(?:number\s*)?(\d|one|two|three|four|five|six)$/.exec(ph); if (mm && mm[1]) { phr = mm[1]; num = String(NUMW[mm[2]] || mm[2]); }
      const h = IX.find(x => x.s === phr) || IX.find(x => x.s === ph); if (h) return { n, h, num: h.s === ph ? null : num }; }
    return null; };
  for (let j = 0; j < words.length; j++) { const hd = isHeadAt(j);
    if (hd) { const keep = buf.split(' ').filter(Boolean); keep.splice(Math.max(0, keep.length - (hd.n - 1)), hd.n - 1); const before = keep.join(' ').trim(); if (before) parts.push([cur, before]); buf = '';
      const k = wkResolveHead(ins, hd.h, hd.num); if (k) cur = k; continue; }
    buf += (buf ? ' ' : '') + words[j]; }
  if (buf.trim()) parts.push([cur, buf.trim()]);
  parts.forEach(([k, t]) => { const old = w.notes[k] || ''; w.notes[k] = old ? old.replace(/\s*$/, '') + (/[.!?]$/.test(old.trim()) ? ' ' : '. ') + t : t; w.lastAdd = { key: k, len: old.length }; });
  if (cur !== w.place) wkGo(cur, true);
  return parts.length;
}
function wkHear(t) {
  const ins = app.ins; if (!ins || app.tab !== 'walk') return; const { text, cmds } = wkCommands(wkClean(t)); const w = wkData(ins);
  if (text) wkFile(ins, text);
  cmds.forEach(c => { if (c === 'photo' && wcamIsOpen()) wcamShoot(); else if (c === 'next') wkNext(); else if (c === 'stop') wkListen(false);
    else if (c === 'scratch' && w.lastAdd && w.notes[w.lastAdd.key] != null) { w.notes[w.lastAdd.key] = w.notes[w.lastAdd.key].slice(0, w.lastAdd.len); w.lastAdd = null; toast('Removed what you just said'); } });
  save(); wkRefresh(true); if (wcamIsOpen()) wcamLabels();
}

/* ---------- moving between places ---------- */
function wkGo(key, quiet) { const ins = app.ins, w = wkData(ins); w.place = key; if (!quiet) { save(); wkRefresh(); window.scrollTo(0, 0); } if (wcamIsOpen()) wcamLabels(); }
function wkNext() { const ins = app.ins, w = wkData(ins); const P = wkPlace(ins, w.place); const k = P.parent || P.key; const i = WK_ORDER.indexOf(k); wkGo(WK_ORDER[Math.min(WK_ORDER.length - 1, i + 1)]); }
function wkMode() { try { return localStorage.getItem('uad-wk-talk') || 'keyboard'; } catch (e) { return 'keyboard'; } }
function wkSetMode(m) { try { localStorage.setItem('uad-wk-talk', m); } catch (e) {} if (m === 'keyboard' && WSR.on) wsrStop(); }
function wkTalk() { if (WSR.on) return wkListen(false); if (wkMode() === 'listen') return wkListen(true);
  const ta = document.getElementById('wkNote'); if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} toast('Now tap the 🎤 on the keyboard and talk. Tap Done on the keyboard when you finish.'); } }
function wkListen(on) {
  WK.listen = on;
  if (on) { if (!wsrStart(wkHear, wkMicState)) { WK.listen = false; const ta = document.getElementById('wkNote'); if (ta) { ta.focus(); toast('Tap the microphone on the keyboard and talk – your words go to this place'); } } }
  else wsrStop(); wkMicState();
}
function wkMicState() {
  const b = document.getElementById('wkMic'), it = document.getElementById('wkInterim'); if (b) { b.classList.toggle('on', !!WSR.on); b.querySelector('b').textContent = WSR.on ? 'Listening… tap to stop' : wkMode() === 'keyboard' ? 'Talk (keyboard 🎤)' : 'Talk'; }
  if (it) { it.textContent = WSR.on ? (WSR.interim || 'Say a place and "colon" to move: "Driveway colon concrete, 2 cars"…') : WSR.err === 'not allowed' ? 'Listening is not allowed – iPad Settings › Safari › Microphone › Allow (and Siri & Dictation on). Or use the keyboard microphone in the box below.' : ''; it.hidden = !it.textContent; }
}
function wkOpenCam() {
  const ins = app.ins;
  wcamOpen({ to: () => { const P = wkPlace(ins, wkData(ins).place), s = wkShot(ins, P); return s ? (P.g === 'item' ? '' : P.t + ' › ') + s.t : P.t + ' (pick what the photo is)'; },
    chips: () => { const P = wkPlace(ins, wkData(ins).place), s = wkShot(ins, P); return (P.shots || []).length > 1 ? P.shots.map(x => ({ k: x.k, t: x.t, on: s && s.k === x.k })) : []; },
    onChip: k => { const w = wkData(ins); w.shot[w.place] = k; save(); },
    onShot: wkSavePhoto, onClose: () => wkRefresh() });
}
async function wkOpenSketch() { const b = document.getElementById('wkSketch'); if (b) b.textContent = 'Opening…'; wsrStop(); const w = wkData(app.ins); const url = 'sketch.html?ins=' + encodeURIComponent(app.ins.id) + '&tab=walk&walk=1&place=' + encodeURIComponent(w.place); try { await saveNow(); } catch (e) {} app.leaving = true; clearTimeout(app.saving); DB.close(); location.href = url; }

/* ---------- what is still needed at a place ---------- */
function wkIssues(ins, P) { return computeIssues(ins).filter(x => !ins.overrides[x.key] && (x.sev === 'Required' || x.sev === 'Photo' || (x.sev === 'Recommended' && x.photo)) && P.iss && P.iss(x)); }
function wkHeard(ins, P) {   // what her notes for this place would fill (not saved until Sort → Save)
  const t = (wkData(ins).notes[P.key] || '').trim(); if (!t || !P.head) return { keys: new Set(), short: [] };
  let R = null; const cp = JSON.parse(JSON.stringify(ins)); try { R = dictParse(P.head + ': ' + t, cp); } catch (e) { return { keys: new Set(), short: [] }; }
  const keys = new Set(R.changes.filter(c => c.room === undefined).map(c => c.key.replace('.', ':')));
  let short = []; try { short = dkHeardShort(P.head + ': ' + t, cp); } catch (e) {}
  return { keys, short };
}
function wkStatus(ins, P) { const w = wkData(ins); const iss = wkIssues(ins, P).filter(x => x.sev !== 'Recommended'); const has = (w.notes[P.key] || '').trim() || ins.photos.some(p => p.walk === P.key) || (P.chooser && wkKids(ins, P).length);
  return !has ? '' : iss.length ? 'part' : 'done'; }
function wkKids(ins, P) { const lists = P.chooser === 'rooms' ? ['rooms', 'bedrooms', 'baths', 'kitchens', 'wetbars'] : P.chooser === 'buildings' ? ['adus', 'outbuildings'] : [P.chooser];
  return lists.flatMap(list => (ins.lists[list] || []).map(it => wkItemPlace(ins, 'L:' + list + ':' + it.id)).filter(Boolean)); }

/* ---------- the tab ---------- */
function renderWalk() {
  const ins = app.ins, w = wkData(ins), P = wkPlace(ins, w.place);
  const route = WK_PLACES.map(p => { const st = wkStatus(ins, p); const on = p.key === w.place || p.key === P.parent; return `<button class="wk-stop ${on ? 'on' : ''} ${st}" data-wkgo="${p.key}">${st === 'done' ? '✓ ' : ''}${esc(p.t)}</button>`; }).join('');
  return `<section class="wk">
    <details class="wk-how"><summary>How the walk-through works</summary><ol>
      <li><b>Say where you are, then a colon</b>: “Driveway colon concrete, 2 cars…”. Or tap the place above. Everything after that goes to that place until you name another one.</li>
      <li><b>Photo</b> opens the camera inside the app. Tap the big white button as often as you like; each photo is filed for the place you are in (Dwelling front, Dwelling rear, Property Access street scene…). Say “take a photo” to snap while it is open. <b>Done</b> closes it.</li>
      <li><b>Talk</b> listens until you tap it again. Pause as long as you like. “Scratch that” removes what you just said; “next place” moves on.</li>
      <li><b>Sketch</b>: photo and talk buttons stay on the sketch. Starting a new area for an ADU or outbuilding moves you to that building. Blocked by a gate? <b>⇄ Other end</b>. Couldn't measure the last walls? <b>⌐ Fill missing walls</b> (marked “calc”).</li>
      <li>Rooms: pick the <b>level</b>, then say “Bedroom 2 colon …”, “Kitchen colon …”. A new bedroom or bath is added for you.</li>
      <li>When you are done (or any time): <b>Sort my notes</b> → 🎤 Dictate → “1. Sort my notes” → check → “2. Save to appraisal file”. Nothing is filled in until you save.</li></ol></details>
    <div class="wk-route" id="wkRoute">${route}</div>
    <div class="wk-head"><div><small>${esc(P.g === 'item' ? (wkPlace(ins, P.parent).t) : P.g)}</small><h2 id="wkTitle">${esc(P.t)}</h2></div><button class="btn" id="wkNext">Next place ›</button></div>
    <div class="wk-big">
      <button class="wk-b cam" id="wkCam">${CAM_SVG}<b>Photo</b></button>
      <button class="wk-b mic ${WSR.on ? 'on' : ''}" id="wkMic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><b>${WSR.on ? 'Listening… tap to stop' : wkMode() === 'keyboard' ? 'Talk (keyboard 🎤)' : 'Talk'}</b></button>
      <button class="wk-b sk" id="wkSketch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M4 20V8l8-4 8 4v12z"/><path d="M4 20h16"/></svg><b>Sketch</b></button>
    </div>
    <div class="wk-mode"><span>Talk uses:</span><button class="wchip sm ${wkMode() === 'keyboard' ? 'on' : ''}" data-wkmode="keyboard">Keyboard microphone (more accurate)</button><button class="wchip sm ${wkMode() === 'listen' ? 'on' : ''}" data-wkmode="listen">Hands-free listening</button></div>
    <p class="wk-interim" id="wkInterim" hidden></p>
    <div id="wkBody">${wkBodyHtml(ins, P)}</div>
    <div class="wk-foot"><button class="btn primary" id="wkSort">Sort my notes into the inspection ›</button><span class="help">Your notes go to the 🎤 Dictate tab with each place as a heading: tap “1. Sort my notes”, check the list, then “2. Save to appraisal file”.</span></div>
  </section>`;
}
function wkBodyHtml(ins, P) {
  const w = wkData(ins);
  if (P.leave) { const un = Object.keys(w.notes).filter(k => (w.notes[k] || '').trim().length > (w.sentLen[k] || 0)).length;
    return (un ? `<p class="warn-box">You have notes for ${un} place${un > 1 ? 's' : ''} that are not sorted yet, so this list still counts them as missing. Tap <b>Sort my notes</b> at the bottom, save them on the Dictate tab, then come back here.</p>` : '') + (typeof dkLeaveHtml === 'function' ? dkLeaveHtml(ins) : '') + wkNotesHtml(ins, P); }
  if (P.chooser) return wkChooserHtml(ins, P);
  const shot = wkShot(ins, P); const iss = wkIssues(ins, P); const heard = wkHeard(ins, P);
  const photos = ins.photos.filter(p => p.walk === P.key).sort((a, b) => b.ts - a.ts);
  const need = iss.filter(x => !(x.sev === 'Required' && heard.keys.has(x.key)));
  const got = iss.filter(x => x.sev === 'Required' && heard.keys.has(x.key));
  return `${P.parent ? `<button class="btn sm wk-back" data-wkgo="${P.parent}">‹ ${esc(wkPlace(ins, P.parent).t)}</button>` : ''}
    ${(P.shots || []).length > 1 ? `<div class="wk-shots"><span>Photo of:</span>${P.shots.map(s => `<button class="wchip ${shot && s.k === shot.k ? 'on' : ''}" data-wkshot="${esc(s.k)}">${esc(s.t)}</button>`).join('')}</div>` : ''}
    ${photos.length ? `<div class="dk-strip wk-strip">${photos.map(p => `<button class="thumb ${p.required ? 'req' : ''}" data-view="${p.id}"><img data-pid="${p.id}" alt=""><span>${esc(p.label)}</span></button>`).join('')}</div>` : ''}
    <div class="wk-check">${need.length || got.length ? `<b>Needed here</b>${need.map(x => wkNeedHtml(ins, x)).join('')}${got.map(x => `<div class="wk-need ok">✓ ${esc(x.label)} <small>heard</small></div>`).join('')}` : `<div class="wk-need ok">✓ Nothing required is missing here${P.key === 'access' || P.key === 'front' || P.key === 'rear' ? '' : ''}</div>`}</div>
    ${wkNotesHtml(ins, P, heard)}
    ${P.interview ? `<div class="row"><button class="btn" data-wktab="interview">Open the Interview tab</button></div>` : ''}
    ${P.sketch ? `<p class="help">Sketching around the house? Tap <b>Sketch</b>: the photo and talk buttons stay on the sketch, and the photos are labeled “Exterior of dwelling” (or Front / Rear – tap the label on the camera).</p>` : ''}`;
}
function wkNotesHtml(ins, P, heard) {
  const w = wkData(ins); const t = w.notes[P.key] || '';
  return `<div class="wk-notes"><label><b>Notes for ${esc(P.t)}</b>${P.hint ? `<span class="help">${esc(P.hint)}</span>` : ''}
    <textarea class="txt" id="wkNote" rows="4" placeholder="Talk, or tap here and use the keyboard microphone">${esc(t)}</textarea></label>
    ${heard && heard.short.length ? `<div class="wk-heard"><b>I heard:</b> ${heard.short.map(esc).join(' · ')}</div>` : ''}</div>`;
}
/* a checklist line; a question can be answered right here with one tap (no dictation needed) */
function wkFieldOf(ins, x) { const m = /^([a-z]+):([A-Za-z0-9]+)$/.exec(x.key || ''); if (m) { const sec = SECTIONS.find(s => s.id === m[1]); if (!sec) return null; for (const g of sec.groups) for (const f of g.fields) if (f.k === m[2]) return { f, d: ins.data[m[1]], sec: m[1] }; return null; }
  const n = /^([a-zA-Z]+):([^:]+):([A-Za-z0-9]+)$/.exec(x.key || ''); if (n && LISTS[n[1]]) { const it = (ins.lists[n[1]] || []).find(i => i.id === n[2]); const f = it && LISTS[n[1]].fields.find(f => f.k === n[3]); if (f) return { f, d: it, list: n[1] }; } return null; }
function wkNeedHtml(ins, x) {
  const lab = esc(x.label.replace(/ photo$/, '')); const head = `${x.photo ? '📷' : '•'} ${lab}${x.sev === 'Recommended' ? ' <small>(suggested)</small>' : ''}`;
  if (x.photo || x.sev !== 'Required') return `<div class="wk-need ${x.photo ? 'ph' : ''}">${head}</div>`;
  const F = wkFieldOf(ins, x); if (!F) return `<div class="wk-need">${head}</div>`; const f = F.f;
  let O = f.t === 'yn' ? [['__y', 'Yes'], ['__n', 'No']] : ['one', 'multi', 'sel'].includes(f.t) ? optsOf(f, F.d, ins) : null;
  if (!O) return `<div class="wk-need">${head}</div>`;
  const btns = O.length <= 9 ? O.map(([v, l]) => `<button class="wchip sm" data-wkans="${esc(x.key)}" data-v="${esc(v)}">${esc(l)}</button>`).join('')
    : `<select class="txt" data-wkans="${esc(x.key)}"><option value="">Pick…</option>${O.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`;
  return `<div class="wk-need q"><div>${head}</div><div class="wk-ans">${btns}</div></div>`;
}
function wkAnswer(ins, key, v) {
  const F = wkFieldOf(ins, { key }); if (!F) return; const f = F.f; let val = v === '__y' ? true : v === '__n' ? false : v;
  if (f.t === 'multi') { const cur = Array.isArray(F.d[f.k]) ? F.d[f.k] : []; F.d[f.k] = cur.includes(val) ? cur.filter(z => z !== val) : [...cur, val]; } else F.d[f.k] = val;
  save(); wkRefresh(); toast(f.l + ': ' + (val === true ? 'Yes' : val === false ? 'No' : labelFor(f, val, F.d)));
}
function wkChooserHtml(ins, P) {
  const w = wkData(ins); const kids = wkKids(ins, P);
  let add = '';
  if (P.chooser === 'rooms') add = `<div class="wk-lv"><span>Level:</span>${WK_LEVELS.map(([v, l]) => `<button class="wchip ${w.level === v ? 'on' : ''}" data-wklv="${v}">${l}</button>`).join('')}</div>
      <div class="wk-add">${WK_ROOMS.map(([list, t], i) => `<button class="btn" data-wkadd="r${i}">+ ${esc(t)}</button>`).join('')}<select class="txt" id="wkMoreRoom"><option value="">+ another room…</option>${ROOM_TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select></div>`;
  else if (P.chooser === 'buildings') add = `<div class="wk-add">${WK_BLD.map(([t, l], i) => `<button class="btn" data-wkadd="b${i}">+ ${esc(l)}</button>`).join('')}</div><p class="help">Measure each building on the sketch: <b>+ New area</b> with its type (ADU, Guest House…) – start a new sketch page for it if you like.</p>`;
  else if (P.chooser === 'outdoorLiving') add = `<div class="wk-add">${WK_OUTLIV.map((t, i) => `<button class="btn" data-wkadd="o${i}">+ ${esc(t)}</button>`).join('')}</div>`;
  else if (P.chooser === 'waterFeatures') { const O = LISTS.waterFeatures.fields[0].o; add = `<div class="wk-add">${O.slice(0, 14).map(([v, l], i) => `<button class="btn" data-wkadd="w${i}">+ ${esc(l)}</button>`).join('')}</div>`; }
  const iss = wkIssues(ins, P);
  return `${kids.length ? `<div class="wk-kids">${kids.map(k => { const st = wkStatus(ins, k); return `<button class="wk-stop ${st}" data-wkgo="${esc(k.key)}">${st === 'done' ? '✓ ' : ''}${esc(k.t)}</button>`; }).join('')}</div>` : ''}
    <p class="help">${kids.length ? 'Tap one to go back to it, or add another:' : 'Tap what you are looking at (or say it with a colon: “Patio colon…”):'}</p>${add}
    ${iss.length ? `<div class="wk-check"><b>Still needed</b>${iss.slice(0, 10).map(x => wkNeedHtml(ins, x)).join('')}${iss.length > 10 ? `<div class="wk-need">+ ${iss.length - 10} more</div>` : ''}</div>` : ''}
    ${wkNotesHtml(ins, P)}`;
}
/* never redraw while her finger is down: the redraw would swallow the tap (a tab or place she is tapping) */
const WKP = { down: false, pend: null };
document.addEventListener('pointerdown', () => { WKP.down = true; }, true);
const wkUp = () => { setTimeout(() => { WKP.down = false; if (WKP.pend) { const l = WKP.pend; WKP.pend = null; setTimeout(() => wkRefresh(l === 'light'), 350); } }, 0); };
document.addEventListener('pointerup', wkUp, true); document.addEventListener('pointercancel', wkUp, true);
function wkRefresh(light) {
  if (app.tab !== 'walk') return;
  if (WKP.down) { WKP.pend = WKP.pend === 'full' || !light ? 'full' : 'light'; return; } const main = $('#main'); if (!main) return;
  const a = document.activeElement; if (light && a && a.id === 'wkNote') { const b = document.getElementById('wkBody'); const ins = app.ins; const P = wkPlace(ins, wkData(ins).place); if (a.value !== (wkData(ins).notes[P.key] || '')) a.value = wkData(ins).notes[P.key] || ''; return; }
  main.innerHTML = renderWalk(); bindWalk(main); fillThumbs(main); wkMicState(); refreshChrome();
}
function bindWalk(root) {
  const ins = app.ins, w = wkData(ins);
  { const rt = root.querySelector('#wkRoute'), on = rt && rt.querySelector('.wk-stop.on'); if (on) { const c = () => { rt.scrollLeft = on.offsetLeft - rt.clientWidth / 2 + on.offsetWidth / 2; }; c(); requestAnimationFrame(c); } }   // the place she is in stays highlighted in the middle
  const on = (id, fn) => { const b = root.querySelector('#' + id); if (b) b.onclick = fn; };
  on('wkCam', wkOpenCam); on('wkMic', wkTalk); on('wkSketch', wkOpenSketch); on('wkNext', wkNext); on('wkSort', wkSort);
  root.querySelectorAll('[data-wkgo]').forEach(b => b.onclick = () => wkGo(b.dataset.wkgo));
  root.querySelectorAll('[data-wkshot]').forEach(b => b.onclick = () => { w.shot[w.place] = b.dataset.wkshot; save(); wkRefresh(); });
  root.querySelectorAll('[data-wklv]').forEach(b => b.onclick = () => { w.level = b.dataset.wklv; save(); wkRefresh(); });
  root.querySelectorAll('[data-wktab]').forEach(b => b.onclick = () => goTab(b.dataset.wktab));
  root.querySelectorAll('button[data-wkans]').forEach(b => b.onclick = () => wkAnswer(ins, b.dataset.wkans, b.dataset.v));
  root.querySelectorAll('select[data-wkans]').forEach(b => b.onchange = () => { if (b.value) wkAnswer(ins, b.dataset.wkans, b.value); });
  root.querySelectorAll('[data-wkmode]').forEach(b => b.onclick = () => { wkSetMode(b.dataset.wkmode); wkRefresh(); });
  root.querySelectorAll('[data-lvtab]').forEach(b => b.onclick = () => { if (b.dataset.lvtab === 'attention') return goTab('attention'); goTab(b.dataset.lvtab, b.dataset.lvanchor || null, b.dataset.lvgroup || null); });
  const rf = root.querySelector('#dkLvRefresh'); if (rf) rf.onclick = () => wkRefresh();
  root.querySelectorAll('[data-wkadd]').forEach(b => b.onclick = () => { const c = b.dataset.wkadd, i = +c.slice(1); let key;
    if (c[0] === 'r') { const [list, t] = WK_ROOMS[i]; key = 'L:' + list + ':' + wkMake(ins, list === 'rooms' ? { list, type: t } : list === 'baths' ? { list, kind: t === 'Half Bath' ? 'HalfBathroom' : 'FullBathroom' } : { list }).id; }
    else if (c[0] === 'b') { const [t] = WK_BLD[i]; key = 'L:' + (t === 'adu' ? 'adus' : 'outbuildings') + ':' + wkMake(ins, t === 'adu' ? { list: 'adus' } : { list: 'outbuildings', type: t }).id; }
    else if (c[0] === 'o') key = 'L:outdoorLiving:' + wkMake(ins, { list: 'outdoorLiving', type: WK_OUTLIV[i] }).id;
    else if (c[0] === 'w') key = 'L:waterFeatures:' + wkMake(ins, { list: 'waterFeatures', type: LISTS.waterFeatures.fields[0].o[i][0] }).id;
    save(); wkGo(key); });
  const mr = root.querySelector('#wkMoreRoom'); if (mr) mr.onchange = () => { if (!mr.value) return; const it = wkMake(ins, { list: 'rooms', type: mr.value }); save(); wkGo('L:rooms:' + it.id); };
  const ta = root.querySelector('#wkNote'); if (ta) { ta.oninput = () => { w.notes[w.place] = ta.value; save(); }; ta.onblur = () => { const v = wkClean(ta.value); w.notes[w.place] = v; const P = wkPlace(ins, w.place);
    if (/:/.test(v) && !(P.head && new RegExp('^\\s*' + P.head + ':', 'i').test(v))) { w.notes[w.place] = ''; wkFile(ins, v); } save(); setTimeout(() => wkRefresh(), 400); }; }
}
/* notes → the Dictate box, place by place, only what was not sent before */
function wkSort() {
  const ins = app.ins, w = wkData(ins); const keys = Object.keys(w.notes).filter(k => (w.notes[k] || '').trim().length > (w.sentLen[k] || 0));
  if (!keys.length) { toast('No new notes to sort'); return; }
  const rank = k => { const P = wkPlace(ins, k); const i = WK_ORDER.indexOf(P.parent || P.key); return i < 0 ? 99 : i; };
  keys.sort((a, b) => rank(a) - rank(b));
  const lines = []; let lv = null;
  keys.forEach(k => { const P = wkPlace(ins, k); const t = (w.notes[k] || '').slice(w.sentLen[k] || 0).replace(/^[\s.]+/, '').trim(); if (!t) return;
    if (P.parent === 'rooms' && P.it.level && P.it.level !== lv) { lv = P.it.level; lines.push(wkLevelName(lv) + '.'); }
    lines.push((P.head || P.t) + ': ' + t + (/[.!?]$/.test(t) ? '' : '.')); w.sentLen[k] = (w.notes[k] || '').length; });
  ins.dictDraft = [ins.dictDraft, lines.join('\n')].filter(x => x && x.trim()).join('\n');
  if (app.dict) app.dict.text = ins.dictDraft;
  save(); goTab('dictate'); toast('Your notes are in the Dictate box – tap “1. Sort my notes”');
}
/* photos taken on the sketch page are filed here (the sketch page does not know the UAD photo slots) */
function wkResolvePending(ins) {
  let n = 0; const w = wkData(ins);
  (ins.photos || []).filter(p => p.walkPend).forEach(p => { const P = wkPlace(ins, p.walkPend); const shot = (P.shots || []).find(s => s.k === p.walkShot) || (P.shots || [])[0];
    if (!shot) { delete p.walkPend; return; }
    const slot = wkSlot(ins, P, shot); Object.assign(p, { sec: slot.sec || null, field: slot.field || null, list: slot.list || null, item: slot.item || null, slot: slot.slot || null, extra: !!slot.extra, cat: slot.cat || 'SupplementalExhibit', roomType: slot.roomType || null });
    const same = photosInSlot(ins, slot).filter(x => x.id !== p.id).length; p.label = slot.label + (same ? ' ' + (same + 1) : ''); p.required = !!slot.required && same === 0; if (slot.toReport) p.toReport = true;
    p.walk = P.key; delete p.walkPend; delete p.walkShot; n++; });
  (w.pendItems || []).forEach(m => { if (!(ins.lists[m.list] || []).some(x => x.id === m.id)) { const it = { id: m.id, dkPhoto: true }; if (m.type) it.type = m.type; ins.lists[m.list].push(it); } }); delete w.pendItems;
  return n;
}
