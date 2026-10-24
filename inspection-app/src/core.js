/* ---------------- Utilities ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const isEmpty = v => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const optsOf = (f, d, ins) => (typeof f.o === 'function' ? f.o(d || {}, ins || (typeof app !== 'undefined' ? app.ins : null)) : f.o) || [];
const labelFor = (f, v, d) => { const o = optsOf(f, d).find(x => x[0] === v); return o ? o[1] : v; };
const applText = v => Object.entries(v || {}).map(([k, s]) => { const a = APPLIANCES.find(x => x.k === k); return a ? `${a.l}${s.brand ? ' (' + s.brand + ')' : ''}${s.qty > 1 ? ' ×' + s.qty : ''}` : k; }).join(', ');
const valText = (f, v, d) => {
  if (f.t === 'appliances') return applText(v);
  if (isEmpty(v)) return '';
  if (f.t === 'yn') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(x => labelFor(f, x, d)).join(', ');
  if (f.t === 'money') return '$' + Number(v).toLocaleString();
  return String(labelFor(f, v, d));
};
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

/* ---------------- Storage (IndexedDB with memory fallback) ---------------- */
const DB = (() => {
  let db = null, closed = false; const mem = { inspections: new Map(), photos: new Map(), sketches: new Map() };
  const DB_NAME = (typeof APP_CFG !== 'undefined' && APP_CFG.db) || 'uad36-inspect';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // one attempt to open; resolves null if the iPad does not answer within ms
  const openOnce = ms => new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    setTimeout(() => fin(null), ms);
    try {
      const r = indexedDB.open(DB_NAME, 2);
      r.onupgradeneeded = () => { const d = r.result; const has = n => d.objectStoreNames.contains(n);
        if (!has('inspections')) d.createObjectStore('inspections', { keyPath: 'id' });
        if (!has('photos')) { const p = d.createObjectStore('photos', { keyPath: 'id' }); p.createIndex('ins', 'insId'); }
        if (!has('sketches')) d.createObjectStore('sketches', { keyPath: 'id' }); };
      r.onsuccess = () => { if (done) { try { r.result.close(); } catch (e) {} return; } const d = r.result; d.onversionchange = () => { try { d.close(); } catch (e) {} }; fin(d); };
      r.onerror = () => fin(null); r.onblocked = () => {};
    } catch (e) { fin(null); }
  });
  const open = async () => {
    // Safari sometimes does not answer the first request after a page change: wake it up, then retry a few times
    try { if (indexedDB.databases) await Promise.race([indexedDB.databases(), wait(1500)]); } catch (e) {}
    for (let i = 0; i < 4 && !db; i++) { db = await openOnce(i ? 3000 : 2500); if (!db) await wait(300); }
    DB.step = db ? 'open' : 'open failed'; return !!db;
  };
  // every request has a time limit so a stuck request can never freeze the page
  const tx = (store, mode, fn, ms = 6000) => new Promise((res, rej) => {
    if (closed) { rej(new Error('storage closed while leaving the page')); return; }
    if (!db) { res(fn(null)); return; }
    let t; try { t = db.transaction(store, mode); } catch (e) { rej(e); return; }
    const s = t.objectStore(store); let out; const r = fn(s);
    const timer = setTimeout(() => rej(new Error('storage did not answer (' + store + ')')), ms);
    if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => { clearTimeout(timer); res(out); }; t.onerror = () => { clearTimeout(timer); rej(t.error); }; t.onabort = () => { clearTimeout(timer); rej(t.error); };
  });
  const DB = {
    step: 'starting',
    ready: null,
    get persistent() { return !!db; },
    // finish and close before switching pages, so the page being left cannot hold the storage
    close() { closed = true; try { if (db) db.close(); } catch (e) {} },
    async put(store, obj) { if (!db && !closed) { mem[store].set(obj.id, obj); return; } return tx(store, 'readwrite', s => s.put(obj)); },
    async get(store, id) { if (!db && !closed) return mem[store].get(id); return tx(store, 'readonly', s => s.get(id)); },
    async del(store, id) { if (!db && !closed) { mem[store].delete(id); return; } return tx(store, 'readwrite', s => s.delete(id)); },
    async all(store) { if (!db && !closed) return [...mem[store].values()]; return tx(store, 'readonly', s => s.getAll()); },
    async photosFor(insId) {
      if (!db && !closed) return [...mem.photos.values()].filter(p => p.insId === insId);
      return tx('photos', 'readonly', s => s.index('ins').getAll(insId));
    },
  };
  DB.ready = open();
  return DB;
})();

/* ---------------- Inspection model ---------------- */
function newInspection(fileName, addr) {
  const ins = {
    id: uid(), created: Date.now(), updated: Date.now(), v: 1,
    data: {}, lists: {}, photos: [], overrides: {}, comments: {}, finals: {},
  };
  SECTIONS.forEach(s => { ins.data[s.id] = {}; });
  Object.keys(LISTS).forEach(k => { if (LISTS[k]) ins.lists[k] = []; });
  const p = ins.data.property;
  p.fileName = fileName; p.addr = addr; p.state = 'CA'; p.county = 'Santa Barbara';
  p.inspDate = todayISO(); ins.data.interview.date = todayISO();
  p.units = 1; ins.data.front.constr = 'SiteBuilt';
  p.extMethod = 'Physical'; p.intMethod = 'Physical'; p.attach = 'Detached';
  ins.lists.levels.push({ id: uid(), level: 'LevelOne', grade: 'AboveGrade' });
  ins.lists.kitchens.push({ id: uid(), level: 'LevelOne' }); // the main kitchen is always there
  return ins;
}
function normalize(ins) {
  ins.data = ins.data || {}; ins.lists = ins.lists || {}; ins.photos = ins.photos || [];
  if (!ins.data.property) ins.data.property = {};
  ins.overrides = ins.overrides || {}; ins.comments = ins.comments || {}; ins.finals = ins.finals || {}; ins.reviewed = ins.reviewed || {};
  SECTIONS.forEach(s => { ins.data[s.id] = ins.data[s.id] || {}; });
  Object.keys(LISTS).forEach(k => { ins.lists[k] = (Array.isArray(ins.lists[k]) ? ins.lists[k] : []).filter(x => x && typeof x === 'object'); ins.lists[k].forEach(x => { if (!x.id) x.id = uid(); }); });
  if (!Array.isArray(ins.photos)) ins.photos = []; ins.photos = ins.photos.filter(x => x && x.id);
  if (!ins.updated) ins.updated = ins.created || Date.now();
  // carry older test inspections forward
  { const pj = ins.data.project; if (pj && !pj._v6c) { pj._v6c = true;   // 6c: positive HOA-contact question, common areas merged into amenities
    if (pj.hoaHasContact === undefined) { if (pj.hoaNoContact === true) pj.hoaHasContact = false; else if (pj.hoaName || pj.hoaContactName || pj.hoaPhone || pj.hoaEmail) pj.hoaHasContact = true; }
    delete pj.hoaNoContact;
    const MAP = { 'Lobby': 'Lobby', 'Elevator': 'Elevator', 'Gated Entry': 'GatedCommunity', 'Laundry Room': 'SharedLaundryFacilities', 'Pool Area': 'IngroundPool', 'Clubhouse': 'Clubhouse', 'Gym': 'FitnessArea', 'Tennis / Pickleball': 'SportsCourt', 'Ocean / Beach Access': 'Beach', 'Golf Course Access': 'Other:Golf Course', 'Storage Lockers': 'UnitStorage', 'Security': 'Other:Security Patrol' };
    const keep = new Set(PROJ_AMEN.map(x => x[0]));
    let am = (pj.projAmen || []).map(x => x === 'BuiltInPool' ? 'IngroundPool' : x);
    (pj.projCommon || []).forEach(n => am.push(MAP[n] || 'Other:' + n));
    am = [...new Set(am)].filter(x => keep.has(x)); if (am.length > 1) am = am.filter(x => x !== 'None');
    if (pj.projAmen || pj.projCommon) pj.projAmen = am; delete pj.projCommon;
    if (pj.grAmt && pj.grMonthly === undefined) pj.grMonthly = Math.round(pj.grAmt / 12); } }
  if (ins.data.exterior.disaster && !ins.data.interview.disaster) { ins.data.interview.disaster = ins.data.exterior.disaster; delete ins.data.exterior.disaster; }
  { const iv = ins.data.interview, pj = ins.data.project;   // v5: interview HOA block moved to the Project / HOA tab
    if (iv && pj && (iv.hoaName || iv.hoaContact || iv.hoaPhone || iv.hoaFee !== undefined || iv.hoaDev) && !pj._hoaMoved) {
      if (iv.hoaDev && !pj.projName) pj.projName = iv.hoaDev; if (iv.hoaName && !pj.hoaName) pj.hoaName = iv.hoaName;
      if (iv.hoaContact && !pj.hoaContactName) pj.hoaContactName = iv.hoaContact; if (iv.hoaPhone && !pj.hoaPhone) pj.hoaPhone = iv.hoaPhone;
      if (iv.hoaFee !== undefined && pj.dues === undefined) { pj.dues = iv.hoaFee; pj.duesFreq = iv.hoaFreq || 'Monthly'; }
      if (iv.hoaSpecial === true && !pj.specAssess) { pj.specAssess = 'Existing'; pj.specDesc = iv.hoaSpecialNote; } else if (iv.hoaSpecial === false && !pj.specAssess) pj.specAssess = 'None';
      if (iv.hoaLit) pj.hoaNote = [pj.hoaNote, 'Owner reported pending litigation' + (iv.hoaLitNote ? ': ' + iv.hoaLitNote : '')].filter(Boolean).join('\n');
      pj._hoaMoved = true; } }
  if (ins.data.condition.eq && !ins.data.front.eq) { ins.data.front.eq = ins.data.condition.eq; ins.data.front.ec = ins.data.condition.ec; }
  if (typeof ins.data.site.hazard === 'string') ins.data.site.hazard = [ins.data.site.hazard];
  if (!ins.lists.kitchens.length) ins.lists.kitchens.push({ id: uid(), level: 'LevelOne' });
  if (!ins.data.property.state) ins.data.property.state = 'CA';
  if (!ins.data.property.estate) ins.data.property.estate = 'FeeSimple';
  propDefaults(ins.data.property); if (typeof gateFix === 'function') gateFix(ins); if (typeof strapSync === 'function') try { strapSync(ins); } catch (e) {}
  { const I = ins.data.interior; if (I) { if (I.atticAcc === undefined && I.attic !== undefined) I.atticAcc = I.attic === true ? I.atticAccess !== 'None / Sealed' : false;   // older inspections (before Oct 23 2026)
    if (I.atticAcc === true) { I.attic = true; I._atticAuto = true; } } }
  if (!ins.data.site.apnDesc) ins.data.site.apnDesc = 'LandWithDwelling';
  // v3 interview: old per-item "year" boxes become the 15-year checklist; free-typed years become picker values
  { const iv = ins.data.interview; const now = new Date().getFullYear();
    const map = { hvacYear: 'HVAC / Furnace', whYear: 'Water Heater', plumbYear: 'Plumbing / Repipe', elecYear: 'Electrical / Panel', winYear: 'Windows', floorYear: 'Flooring', paintYear: 'Interior Paint' };
    Object.entries(map).forEach(([k, lab]) => { const y = parseInt(String(iv[k] || '').match(/\d{4}/) || '', 10); if (y && now - y <= 15) { iv.recent15 = iv.recent15 || []; if (!iv.recent15.includes(lab)) iv.recent15.push(lab); } if (iv[k] !== undefined) { iv.oldYears = (iv.oldYears ? iv.oldYears + '; ' : '') + lab + ': ' + iv[k]; delete iv[k]; } });
    ['kitYear', 'bathYear', 'roofYear'].forEach(k => { if (iv[k] !== undefined && typeof iv[k] !== 'string') iv[k] = String(iv[k]); const m = String(iv[k] || '').match(/^\s*(\d{4})\s*$/); if (iv[k] && !m && !/^(Before|Original|Unknown)/.test(iv[k])) { iv.oldYears = (iv.oldYears ? iv.oldYears + '; ' : '') + k + ': ' + iv[k]; delete iv[k]; } else if (m) iv[k] = m[1]; });
    if (iv.oldYears) { iv.asked = [iv.asked, 'Earlier year entries: ' + iv.oldYears].filter(Boolean).join('\n'); delete iv.oldYears; } }
  // renamed options (neutral wording); carry old answers forward
  { const RN = { 'Frameless (European)': 'Frameless (Full Overlay)', 'French Doors': 'Glass Double Doors', 'French Drains': 'Subsurface Drains', 'French': 'Glass Double' };
    const fixv = o => { if (!o) return; Object.keys(o).forEach(k => { const v = o[k]; if (Array.isArray(v)) o[k] = v.map(z => RN[z] || z); else if (typeof v === 'string' && RN[v] && k !== 'label' && k !== 'note') o[k] = RN[v]; }); };
    Object.values(ins.data).forEach(fixv); Object.values(ins.lists).forEach(l => l.forEach(fixv)); }
  // old counter / stone names became "Stone Slab"; drop options that no longer exist so nothing hidden reaches the comments
  { const STONE = new Set(['Quartzite','Quartz','Granite','Marble','Soapstone','Limestone Slab','Engineered Stone']);
    const fixc = it => ['counter','vanCounter'].forEach(k => { if (Array.isArray(it[k])) it[k] = [...new Set(it[k].map(v => STONE.has(v) ? 'Stone Slab' : v))]; });
    ['kitchens','baths','wetbars'].forEach(k => (ins.lists[k] || []).forEach(fixc)); }
  // 6g (Oct 16 2026): "mature" is treated as biased wording – landscape option renamed; CRS room counts and sq ft never kept for the subject
  { const D = ins.data; if (!D._v6g) { D._v6g = true; const S = D.site || {};
    ['landFeat'].forEach(k => { Object.values(D).forEach(sec => { if (sec && Array.isArray(sec[k])) sec[k] = sec[k].map(v => v === 'Mature Trees' ? 'Established Trees' : v); }); });
    const c = D.property && D.property.crs; if (c) ['beds', 'bedsMls', 'baths', 'bathsMls', 'sqft', 'sqftAssessor', 'sqftMls', 'rooms', 'roomsMls'].forEach(k => delete c[k]); } }
  // 6f (Oct 2026): duplicate questions merged – carry answers to the one place they are asked now
  { const D = ins.data, L = ins.lists; if (!D._v6f) { D._v6f = true;
    const has = (o, k, v) => Array.isArray(o[k]) && o[k].includes(v), take = (o, k, v) => { if (has(o, k, v)) o[k] = o[k].filter(x => x !== v); };
    const addWF = t => { if (!L.waterFeatures.some(w => w.type === t)) L.waterFeatures.push({ id: uid(), type: t }); };
    const addOL = t => { if (!L.outdoorLiving.some(w => w.type === t)) L.outdoorLiving.push({ id: uid(), type: t }); };
    const A = D.amenities, F = D.front, G = D.garage, I = D.interior, S = D.systems, V = D.interview, P = D.project, SI = D.site;
    [['Sauna', 'Sauna'], ['Cold Plunge', 'Cold Plunge'], ['Outdoor Shower', 'OutdoorShower']].forEach(([o, t]) => { if (has(A, 'outdoor', o)) { addWF(t); take(A, 'outdoor', o); } });
    ['Gazebo', 'Trellis', 'Pergola'].forEach(o => { if (has(A, 'hardscape', o)) { A.outdoor = [...new Set([...(A.outdoor || []), o])]; take(A, 'hardscape', o); } });
    if (has(F, 'extFeat', 'Front Porch')) addOL('Porch'); if (has(F, 'extFeat', 'Balcony')) addOL('Balcony');
    if (has(G, 'garFeat', 'EV Charger')) S.eff = [...new Set([...(S.eff || []), 'EV Charging'])];
    if (has(I, 'intFeat', 'Radiant Floors') && !has(S, 'heat', 'Radiant')) S.heat = [...new Set([...(S.heat || []), 'Radiant'])];
    if (Array.isArray(F.gutters)) { const g = F.gutters; F.gutterMat = [...new Set([...(F.gutterMat || []), ...(g.includes('Copper Gutters') ? ['Copper'] : []), ...(g.includes('None') ? ['None'] : [])])];
      F.gutters = [...new Set(g.map(x => ({ 'Seamless Gutters': 'Seamless', 'Downspouts': 'Downspouts', 'Rain Chains': 'Rain Chains', 'Gutter Guards': 'Gutter Guards' })[x]).filter(Boolean))]; }
    if (P && P.ageRestr !== undefined && SI.ageRestr === undefined) { SI.ageRestr = P.ageRestr; SI.ageDesc = P.ageDesc; SI.ageImpact = P.ageImpact; delete P.ageRestr; delete P.ageDesc; delete P.ageImpact; }
    if (has(I, 'unitPos', 'Corner Unit')) { if (I.corner === undefined) I.corner = true; take(I, 'unitPos', 'Corner Unit'); }
    if (I.floorNum !== undefined) I.floorNum = String(I.floorNum).replace(/\D/g, '') || undefined;
    if (Array.isArray(V.sys) && V.sys.length) V.otherSys = [V.otherSys, 'Also mentioned: ' + V.sys.join(', ') + (V.solarInfo ? ' (solar: ' + V.solarInfo + ')' : '')].filter(Boolean).join('\n');
    delete V.sys; delete V.solarInfo;
    if (V.wellInfo) { V.utilNote = [V.utilNote, 'Well: ' + V.wellInfo].filter(Boolean).join('\n'); delete V.wellInfo; }
    [...(L.baths || []), ...(L.kitchens || []), ...(L.outbuildings || [])].forEach(it => { delete it.q; delete it.c; }); (L.kitchens || []).forEach(it => delete it.remodel);
    if (P && P.grExp && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(P.grExp)) { const [m, d, y] = P.grExp.split('/'); P.grExp = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; } } }
  // 6x (her ask, Oct 20 2026): one "Gutters" list; seamless / half-round / K-style / box / gutter guards dropped, downspouts, rain chains and underground drains kept
  { const F = ins.data.front; if (F && Array.isArray(F.gutters)) { const keep = F.gutters.filter(x => ['Downspouts', 'Rain Chains', 'Underground Drains'].includes(x)); if (keep.length) F.gutterMat = [...new Set([...(F.gutterMat || []), ...keep])]; delete F.gutters; } }
  // field types changed between versions (e.g. single choice -> multiple): repair stored values to match
  const fix = (f, d) => {
    if (!d || !f || !f.k) return; const v = d[f.k]; if (v === undefined || v === null) return;
    if (f.t === 'multi' && !Array.isArray(v)) d[f.k] = v === '' ? [] : [v];
    if (f.t === 'multi' && Array.isArray(d[f.k]) && Array.isArray(f.o)) { const ok = new Set(f.o.map(o => o[0])); d[f.k] = d[f.k].filter(z => ok.has(z)); }
    else if ((f.t === 'one' || f.t === 'sel') && Array.isArray(v)) d[f.k] = v.length ? v[0] : undefined;
    else if (f.t === 'appliances' && (typeof v !== 'object' || Array.isArray(v))) d[f.k] = {};
  };
  SECTIONS.forEach(sec => sec.groups.forEach(g => g.fields.forEach(f => { if (!f.link) fix(f, ins.data[sec.id]); })));
  Object.keys(LISTS).forEach(k => ins.lists[k].forEach(it => LISTS[k].fields.forEach(f => fix(f, it))));
  return ins;
}
const insTitle = ins => ins.data.property.fileName || 'Untitled';
const cityOf = p => p.city === 'Other' ? p.cityOther : p.city;
const zipOf = p => p.zip === 'Other' ? p.zipOther : p.zip;
const countyOf = p => p.county === 'Other' ? p.countyOther : p.county;
const insAddr = ins => { const p = ins.data.property; return [p.addr, cityOf(p)].filter(Boolean).join(', '); };

/* Section data access; fields with link: read/write another section */
function secData(ins, secId, f) { return ins.data[(f && f.link) || secId]; }

/* ---------------- Photos ---------------- */
async function processImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const draw = (max, q) => {
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c;
    };
    const big = draw(2400, 0.86);
    const blob = await new Promise(res => big.toBlob(res, 'image/jpeg', 0.86));
    const thumb = draw(360).toDataURL('image/jpeg', 0.72);
    return { blob, thumb, w: big.width, h: big.height };
  } finally { URL.revokeObjectURL(url); }
}

/* Photo "slot" identity: section field  -> {sec, field}
                          list item     -> {list, item, slot}
                          extra photo   -> {sec, extra:true}                */
const nz = v => (v === undefined || v === '' ? null : v);
function photosInSlot(ins, slot) {
  return ins.photos.filter(p => nz(p.sec) === nz(slot.sec) && nz(p.field) === nz(slot.field) && nz(p.list) === nz(slot.list) && nz(p.item) === nz(slot.item) && nz(p.slot) === nz(slot.slot) && !!p.extra === !!slot.extra);
}
async function addPhoto(ins, slot, file) {
  const { blob, thumb, w, h } = await processImage(file);
  const existing = photosInSlot(ins, slot).length;
  const id = uid();
  const label = slot.label + (existing ? ' ' + (existing + 1) : '');
  const meta = { id, sec: slot.sec || null, field: slot.field || null, list: slot.list || null, item: slot.item || null, slot: slot.slot || null, extra: !!slot.extra,
    label, cat: slot.cat || 'SupplementalExhibit', roomType: slot.roomType || null, required: !!slot.required && existing === 0, ts: Date.now(), w, h, autoLabel: true };
  await DB.put('photos', { id, insId: ins.id, blob, thumb });
  ins.photos.push(meta);
  thumbCache.set(id, thumb);
  return meta;
}
const thumbCache = new Map();
async function thumbFor(id) {
  if (thumbCache.has(id)) return thumbCache.get(id);
  const p = await DB.get('photos', id); const t = p ? p.thumb : ''; thumbCache.set(id, t); return t;
}

/* ---------------- Minimal ZIP writer / reader (store method) ---------------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
/* letter-size PDF from JPEG pages (one picture per page) */
function makePdf(pages) { // pages: [{bytes: Uint8Array (JPEG), w, h}]
  const enc = new TextEncoder(); const parts = []; let len = 0; const offs = [];
  const add = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; add(`${n} 0 obj\n`); body(); add('\nendobj\n'); };
  add('%PDF-1.4\n%\xE2\xE3\n'); const n = pages.length; const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>')); obj(2, () => add(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  pages.forEach((pg, i) => { const P = 3 + i * 3, Cn = P + 1, Im = P + 2; const W = 612, H = Math.round(612 * pg.h / pg.w);
    obj(P, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${Im} 0 R >> >> /Contents ${Cn} 0 R >>`));
    const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`; obj(Cn, () => add(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(Im, () => { add(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.bytes.length} >>\nstream\n`); add(pg.bytes); add('\nendstream'); }); });
  const xref = len; const total = 3 + n * 3; let x = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  add(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let o = 0; parts.forEach(b => { out.set(b, o); o += b.length; }); return out;
}
async function makeZip(entries) { // entries: [{name, data: Uint8Array|string|Blob}]
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const d = new Date(); const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const e of entries) {
    let data = e.data;
    if (typeof data === 'string') data = enc.encode(data);
    else if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
    const name = enc.encode(e.name); const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
async function readZip(blob) { // returns Map name -> Uint8Array (stored or deflated)
  const buf = new Uint8Array(await blob.arrayBuffer()); const dv = new DataView(buf.buffer); const out = new Map();
  let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Not a zip file');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loff = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    const lstart = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
    let data = buf.subarray(lstart, lstart + csize);
    if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    out.set(name, data); p += 46 + nlen + xlen + clen;
  }
  return out;
}

/* ---------------- Deliver a file (share sheet on iPad, download elsewhere) ---------------- */
/* iPad fixes (6b): the share sheet is opened from its own tap on a "file is ready" box (building a big zip uses up
   Safari's tap permission), only the file is shared (with a title, Save to Files can quietly save nothing), the file
   is one solid block of bytes, and the name is plain ASCII. "Open the file" is the fallback. */
async function deliver(blob, name) {
  name = String(name).replace(/[–—]/g, '-').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim() || 'Inspection.zip';
  const type = blob.type || 'application/octet-stream';
  const solid = new Blob([await blob.arrayBuffer()], { type });
  const file = new File([solid], name, { type });
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const mb = (solid.size / 1048576).toFixed(1);
  return new Promise(resolve => {
    const url = URL.createObjectURL(solid);
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet"><div class="body"><h2 style="margin:0">Your file is ready</h2>
      <p style="margin:0"><b>${esc(name)}</b> · ${mb} MB</p>
      ${canShare ? `<p class="help" style="margin:0">Tap <b>Save to Files</b>, choose <b>Save to Files</b> in the list, pick your folder, then tap <b>Save</b> at the top right.</p>` : ''}
      <div class="row">${canShare ? '<button class="btn primary" id="dlShare">Save to Files / Share</button>' : ''}
        <a class="btn${canShare ? '' : ' primary'}" id="dlOpen" style="text-decoration:none" href="${url}" download="${esc(name)}" target="_blank" rel="noopener">${canShare ? 'Open the file instead' : 'Download the file'}</a>
        <button class="btn" id="dlClose">Close</button></div>
      <p class="help" id="dlMsg" style="margin:0"></p></div></div>`;
    document.body.appendChild(bg);
    let result = 'cancelled';
    const done = () => { bg.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); resolve(result); };
    const msg = t => { bg.querySelector('#dlMsg').textContent = t; };
    const sh = bg.querySelector('#dlShare');
    if (sh) sh.onclick = async () => {
      try { await navigator.share({ files: [file] }); result = 'shared'; msg('Sent. If it is not in your folder, tap "Open the file instead".'); }
      catch (e) { if (e && e.name === 'AbortError') msg('Cancelled – tap again when ready.'); else msg('The share sheet did not open (' + (e.name || e) + '). Tap "Open the file instead".'); }
    };
    bg.querySelector('#dlOpen').onclick = () => { result = 'downloaded'; msg('Opening… In the preview, tap the share button and choose Save to Files.'); };
    bg.querySelector('#dlClose').onclick = done;
  });
}
const safeName = s => String(s || '').replace(/[\\/:*?"<>|#%]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Inspection';

/* her defaults (Oct 21 2026): Native American lands No (none in her area); homeowner responsible for all exterior maintenance Yes once the
   property is Detached, not a PUD and not a condominium / cooperative – only while those are unanswered, so her own answer always stays */
function propDefaults(p) { if (!p) return; if (p.native === undefined) p.native = false; if (p.specialTax === undefined) p.specialTax = false;   // her Oct 24 2026: Mello-Roos / special tax defaults to No (her answer stays)
  splitAddr(p); cityFix(p);
  /* her rule (Oct 23 2026): not a condo, PUD or co-op → site owned in common = No and owner responsible for all exterior maintenance = Yes.
     Only fills blanks – her own answer always stays. */
  if (p.pud === false && p.project === false) { if (p.siteCommon === undefined) p.siteCommon = false; if (p.hoExt === undefined) p.hoExt = true; } }

/* the same app on her iPhone (Oct 22 2026): say iPhone instead of iPad in what she reads */
const DEVICE = /iPhone/.test(navigator.userAgent) ? 'iPhone' : 'iPad';
if (DEVICE === 'iPhone') { const fix = n => { if (n.nodeType === 3) { if (n.nodeValue.includes('iPad') && !(n.parentNode && n.parentNode.closest && n.parentNode.closest('[data-keep]'))) n.nodeValue = n.nodeValue.replace(/iPad/g, 'iPhone'); return; } if (n.nodeType === 1 && !/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(n.nodeName) && !(n.hasAttribute && n.hasAttribute('data-keep'))) { n.childNodes.forEach(fix); ['title', 'placeholder', 'aria-label'].forEach(a => { const v = n.getAttribute && n.getAttribute(a); if (v && v.includes('iPad')) n.setAttribute(a, v.replace(/iPad/g, 'iPhone')); }); } };
  const start = () => { fix(document.body); new MutationObserver(L => L.forEach(m => { m.addedNodes.forEach(fix); if (m.type === 'characterData') fix(m.target); })).observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start); }

/* her Oct 24 2026: a whole address typed or imported into Street ("112 State Street, Santa Barbara, CA 93101")
   is split – the street stays, the city and ZIP go to their own answers (only when blank or the same). */
function splitAddr(p) {
  const m = String(p.addr || '').match(/^\s*([^,]+?)\s*,\s*([^,]+?)\s*(?:,\s*)?(?:\b(CA|California)\b\.?\s*)?,?\s*(\d{5})?(?:-(\d{4}))?\s*$/i);
  if (!m || !/\d/.test(m[1]) || !(m[3] || m[4])) return;
  const said = m[2].replace(/\s+(CA|California)$/i, '').trim(), city = uspsCity(said), zip = m[4] || '';
  if (city !== said && !p.nbhd) p.nbhd = said.replace(/\b\w/g, x => x.toUpperCase());   // her Oct 24 2026: Montecito is the neighborhood
  const cities = ['Santa Barbara', 'Goleta', 'Carpinteria', 'Summerland'];
  const c = cities.find(x => x.toLowerCase() === city.toLowerCase());
  if (c) { if (!p.city || p.city === c) p.city = c; }
  else if (city && (!p.city || (p.city === 'Other' && !p.cityOther))) { p.city = 'Other'; p.cityOther = city.replace(/\b\w/g, x => x.toUpperCase()); }
  if (zip) { const known = ['93101','93103','93105','93108','93109','93110','93111','93117','93013','93067'];
    if (!p.zip || p.zip === zip || (p.zip === 'Other' && (!p.zipOther || p.zipOther === zip))) { if (known.includes(zip)) { p.zip = zip; delete p.zipOther; } else { p.zip = 'Other'; p.zipOther = zip; } }
    if (m[5] && !p.zip4) p.zip4 = m[5]; }
  p.addr = m[1].trim();
}

/* her Oct 24 2026: Montecito is not a USPS city – mail goes to Santa Barbara (Hope Ranch too); Isla Vista mail is Goleta */
const USPS_CITY = { montecito: 'Santa Barbara', 'hope ranch': 'Santa Barbara', 'mission canyon': 'Santa Barbara', 'isla vista': 'Goleta' };
function uspsCity(c) { return USPS_CITY[String(c || '').trim().toLowerCase()] || c; }
function cityFix(p) { if (p && p.city === 'Other' && p.cityOther && USPS_CITY[p.cityOther.trim().toLowerCase()]) { if (!p.nbhd) p.nbhd = p.cityOther.trim(); p.city = USPS_CITY[p.cityOther.trim().toLowerCase()]; delete p.cityOther; } }
