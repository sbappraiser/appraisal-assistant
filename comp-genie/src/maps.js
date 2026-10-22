/* =====================================================================
   Maps and exhibits (her request, Oct 20 2026; rebuilt Oct 22 2026 – "the maps in the Berkeley test are basic"):
   - Location map / rental map: subject + grid comps (+ rentals), labeled like her SFREP maps.
   - Market area map (new): subject + the market area / neighborhood boundary she draws, plus her own labels.
   - Aerial close-up of the subject (USGS / USDA NAIP Plus, 1 ft).
   - Flood map: FEMA National Flood Hazard Layer – zones, zone lines, base flood elevations, the FIRM panel outline and
     number, the zone / panel / effective date / LOMR or LOMA at the subject, with a legend.
   - Wildfire map (new): CAL FIRE / OSFM Fire Hazard Severity Zones (SRA effective April 1 2024, LRA map dated
     March 24 2025) drawn over the street map, with the zone at the subject and a legend.
   Every map can use a map style: street, soft street (labels stand out), USGS topo, satellite with labels (USGS),
   or the sharpest satellite (NAIP 1 ft, street names from the USGS transportation layer).
   Edit map (every map she can edit): drag labels and pointers, slide and zoom the map, change the style, change any
   label's words, add her own labels (street names, "Hope Ranch", "Pacific Ocean"), draw / reshape the market area
   boundary, move a dot that is in the wrong place. Save redraws the picture for the report.
   All drawn in her browser from public map services; nothing about the property is sent except the map area.
   A comp without latitude / longitude is looked up by address (OpenStreetMap Nominatim, one per second).
   ===================================================================== */
const MAPS = { busy: '' };
const TILE = 256;
const MAP_SRC = {
  street: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, max: 19, credit: 'Map data © OpenStreetMap contributors' },
  aerial: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/${z}/${y}/${x}`, max: 16, credit: 'Imagery: USGS The National Map' },
  topo: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/${z}/${y}/${x}`, max: 16, credit: 'Map: USGS The National Map' },
  hybrid: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/${z}/${y}/${x}`, max: 16, credit: 'Imagery and labels: USGS The National Map' },
};
/* map styles she can pick (all free to use in a report with the credit printed on the map) */
const MAP_BASES = {
  street: { name: 'Street map', tile: 'street', credit: MAP_SRC.street.credit },
  soft: { name: 'Soft street map (your labels stand out)', tile: 'street', filter: 'saturate(0.3) brightness(1.07) contrast(0.92)', credit: MAP_SRC.street.credit },
  topo: { name: 'USGS topo (hills and canyons)', tile: 'topo', credit: MAP_SRC.topo.credit },
  hybrid: { name: 'Satellite with street names (USGS)', tile: 'hybrid', credit: MAP_SRC.hybrid.credit },
  sat: { name: 'Satellite, sharpest (USDA 1-ft imagery + street names)', naip: true, credit: 'Imagery: USGS, USDA, The National Map · roads: USGS' },
};
const mapBasePref = () => { try { const v = localStorage.getItem('gnMapBase'); return MAP_BASES[v] ? v : 'street'; } catch (e) { return 'street'; } };
const lon2x = (lon, z) => (lon + 180) / 360 * TILE * 2 ** z;
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TILE * 2 ** z; };
const x2lon = (x, z) => x / (TILE * 2 ** z) * 360 - 180;
const y2lat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (TILE * 2 ** z)))) * 180 / Math.PI;
const WM = 20037508.342789244;   // web mercator half-width (meters)
const px2mx = (x, z) => x / (TILE * 2 ** z) * 2 * WM - WM, px2my = (y, z) => WM - y / (TILE * 2 ** z) * 2 * WM;
const imgLoad = (url, ms) => new Promise(res => { const i = new Image(); let done = false; const fin = v => { if (done) return; done = true; clearTimeout(t); res(v); }; const t = setTimeout(() => { fin(null); try { i.src = ''; } catch (e) {} }, ms || 30000);   // a picture that never comes no longer locks the maps
  i.crossOrigin = 'anonymous'; i.onload = () => fin(i); i.onerror = () => fin(null); i.src = url; });
const fetchT = (u, ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms || 20000); return fetch(u, { signal: ac.signal }).finally(() => clearTimeout(t)); };
async function mapsGet(J) { const r = await DB.get('kv', 'maps:' + J.id); return (r && r.v) || {}; }
async function mapsPut(J, M) { await DB.put('kv', { id: 'maps:' + J.id, v: M }); }
const geoOf = c => { const la = num(V(c, 'lat')), lo = num(V(c, 'lon')); if (la && lo) return { lat: la, lon: lo }; return c.geo && c.geo.lat ? c.geo : null; };

/* ---- comps with no latitude / longitude: look the address up ---- */
async function geocodeMissing(J, list) {
  const need = list.filter(c => !geoOf(c)); let n = 0, miss = [];
  for (const c of need) {
    const q = [V(c, 'addr') || compTitle(c), V(c, 'city') || J.subject.city || 'Santa Barbara', 'CA', V(c, 'zip') || ''].filter(Boolean).join(', ');
    MAPS.busy = `Finding ${compTitle(c)} on the map…`; mapsRender();
    try { const r = await fetchT('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(q)); const a = await r.json();
      if (a && a[0]) { c.geo = { lat: +a[0].lat, lon: +a[0].lon, src: 'address lookup' }; n++; } else miss.push(compTitle(c)); } catch (e) { miss.push(compTitle(c)); }
    await new Promise(r => setTimeout(r, 1100));   // Nominatim: at most one lookup a second
  }
  MAPS.busy = ''; if (n) save(); return { n, miss };
}

/* ---- paint a map style for the pixel box (ox, oy, W, H) at zoom z ---- */
async function paintBase(ctx, W, H, base, z, ox, oy) {
  const B = MAP_BASES[base] || MAP_BASES.street; ctx.fillStyle = '#e8eef2'; ctx.fillRect(0, 0, W, H);
  if (B.naip) {   // one picture for the whole box, then the roads and names on top
    const bb = [px2mx(ox, z), px2my(oy + H, z), px2mx(ox + W, z), px2my(oy, z)].join(',');
    const im = await imgLoad(`${NAIP}?bbox=${bb}&bboxSR=3857&imageSR=3857&size=${W},${H}&format=jpg&f=image`);
    if (im) { ctx.drawImage(im, 0, 0, W, H);
      const rd = await imgLoad(`https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/export?bbox=${bb}&bboxSR=3857&imageSR=3857&size=${W},${H}&format=png32&transparent=true&dpi=144&f=image`, 20000);
      if (rd) ctx.drawImage(rd, 0, 0, W, H);
      return { bad: 0, total: 1, credit: B.credit + (rd ? '' : ' (street names did not load)') }; }
    const r = await paintBase(ctx, W, H, 'hybrid', z, ox, oy); r.credit = MAP_BASES.hybrid.credit + ' (the sharpest imagery did not load)'; return r;
  }
  const S = MAP_SRC[B.tile]; const zt = Math.min(S.max, z), k = 2 ** (z - zt), T = TILE * k;   // past the style's closest zoom, the tiles are enlarged
  const t0x = Math.floor(ox / T), t1x = Math.floor((ox + W) / T), t0y = Math.floor(oy / T), t1y = Math.floor((oy + H) / T);
  let bad = 0; const jobs = [];
  if (B.filter) ctx.filter = B.filter;
  for (let tx = t0x; tx <= t1x; tx++) for (let ty = t0y; ty <= t1y; ty++) jobs.push(imgLoad(S.url(zt, ((tx % 2 ** zt) + 2 ** zt) % 2 ** zt, ty)).then(im => { if (im) ctx.drawImage(im, tx * T - ox, ty * T - oy, T, T); else bad++; }));
  await Promise.all(jobs); ctx.filter = 'none';
  return { bad, total: jobs.length, credit: B.credit };
}
/* ---- draw a map that fits a set of points ---- */
async function drawBase(ctx, W, H, pts, base, pad, maxZ) {
  let z = maxZ || 18;
  const fits = zz => { const xs = pts.map(p => lon2x(p.lon, zz)), ys = pts.map(p => lat2y(p.lat, zz)); return Math.max(...xs) - Math.min(...xs) <= W - 2 * pad.x && Math.max(...ys) - Math.min(...ys) <= H - 2 * pad.y; };
  while (z > 3 && !fits(z)) z--;
  const xs = pts.map(p => lon2x(p.lon, z)), ys = pts.map(p => lat2y(p.lat, z));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2; const ox = cx - W / 2, oy = cy - H / 2;
  const r = await paintBase(ctx, W, H, MAP_BASES[base] ? base : 'street', z, ox, oy);
  return { z, xy: p => [lon2x(p.lon, z) - ox, lat2y(p.lat, z) - oy], bad: r.bad, total: r.total, credit: r.credit, ox, oy };
}
async function drawBaseAt(ctx, W, H, base, z, center) {
  z = Math.max(3, Math.min(20, z)); const ox = lon2x(center.lon, z) - W / 2, oy = lat2y(center.lat, z) - H / 2;
  const r = await paintBase(ctx, W, H, MAP_BASES[base] ? base : 'street', z, ox, oy);
  return { z, ox, oy, credit: r.credit, bad: r.bad, total: r.total, xy: p => [lon2x(p.lon, z) - ox, lat2y(p.lat, z) - oy] };
}
function credit(ctx, W, H, text) { ctx.font = '600 15px Arial'; const w = ctx.measureText(text).width + 14; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(W - w - 6, H - 28, w, 22); ctx.fillStyle = '#333'; ctx.fillText(text, W - w + 1, H - 12); }
function northArrow(ctx, W) { const x = W - 60, y = 70; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.arc(x, y, 38, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + 13, y + 8); ctx.lineTo(x, y); ctx.lineTo(x - 13, y + 8); ctx.closePath(); ctx.fill(); ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('N', x, y + 30); ctx.restore(); }
function scaleBar(ctx, H, z, lat) { const mPerPx = 156543.03392 * Math.cos(lat * Math.PI / 180) / 2 ** z; const ftPerPx = mPerPx * 3.28084;
  const nice = [50, 100, 200, 250, 500, 1000, 2000, 2640, 5280, 10560, 26400]; let ft = nice.find(f => f / ftPerPx >= 140) || 26400; const w = ft / ftPerPx;
  const lab = ft >= 2640 ? (ft / 5280).toString().replace(/\.0+$/, '') + (ft === 5280 ? ' mile' : ' miles') : ft + ' ft';
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(16, H - 74, w + 34, 46); ctx.fillStyle = '#111'; ctx.fillRect(32, H - 44, w, 8); ctx.fillRect(32, H - 52, 3, 16); ctx.fillRect(32 + w - 3, H - 52, 3, 16); ctx.font = '600 18px Arial'; ctx.fillText(lab, 32, H - 54); ctx.restore(); }

/* ---- labeled callouts that do not overlap (her SFREP map style) ---- */
function callouts(ctx, W, H, items) {
  const F = 27, LH = 32; const boxes = [];
  const over = (a, b) => a.x < b.x + b.w + 10 && a.x + a.w + 10 > b.x && a.y < b.y + b.h + 10 && a.y + a.h + 10 > b.y;
  const segHits = (x1, y1, x2, y2, r) => { // does the pointer line cross box r?
    for (let t = 0.08; t <= 0.92; t += 0.04) { const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true; } return false; };
  const cx0 = items.reduce((t, i) => t + i.px[0], 0) / items.length, cy0 = items.reduce((t, i) => t + i.px[1], 0) / items.length;
  // labels go outward from the middle of the group, like her SFREP maps; the subject first
  const order = items.slice().sort((a, b) => (b.kind === 'subj') - (a.kind === 'subj'));
  for (const it of order) {
    const lw = Math.max(...it.lines.map((l, i) => { ctx.font = (i === 0 ? 'bold ' : '') + F + 'px Arial'; return ctx.measureText(l).width; }));
    const w = Math.ceil(lw + 34), h = it.lines.length * LH + 20; let best = null, bestScore = 1e9;
    const base = Math.atan2(it.px[1] - cy0, it.px[0] - cx0) || -Math.PI / 2;
    for (let r = 110; r < 900; r += 40) for (let k = 0; k < 24; k++) {
      const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12); const ang = base + off; const cx = it.px[0] + Math.cos(ang) * r, cy = it.px[1] + Math.sin(ang) * r;
      const a = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h };
      if (a.x < 10 || a.y < 10 || a.x + w > W - 10 || a.y + h > H - 40) continue;
      if (boxes.some(bx => over(a, bx))) continue;
      if (items.some(o => o.px[0] > a.x - 12 && o.px[0] < a.x + a.w + 12 && o.px[1] > a.y - 12 && o.px[1] < a.y + a.h + 12)) continue;
      const cross = boxes.filter(bx => segHits(it.px[0], it.px[1], cx, cy, bx)).length + boxes.filter(bx => bx.it && segHits(bx.it.px[0], bx.it.px[1], bx.x + bx.w / 2, bx.y + bx.h / 2, a)).length;
      const score = r + Math.abs(off) * 120 + cross * 2000; if (score < bestScore) { bestScore = score; best = a; }
      if (cross === 0 && Math.abs(off) < 0.3) break; }
    if (!best) best = { x: Math.min(Math.max(10, it.px[0] - w / 2), W - w - 10), y: Math.min(Math.max(10, it.px[1] - h - 60), H - h - 40), w, h };
    best.it = it; boxes.push(best); it.box = best;
  }
  paintCallouts(ctx, order);
}
const calloutCol = it => it.kind === 'subj' ? '#c00000' : it.kind === 'rent' ? '#0a7a35' : it.kind === 'land' ? '#b8860b' : '#1565d8';
function calloutSize(ctx, it) { const F = 27, LH = 32; const lw = Math.max(...it.lines.map((l, i) => { ctx.font = (i === 0 ? 'bold ' : '') + F + 'px Arial'; return ctx.measureText(l).width; })); return { w: Math.ceil(lw + 34), h: it.lines.length * LH + 20 }; }
function paintCallouts(ctx, order) { const F = 27, LH = 32; const col = calloutCol;
  for (const it of order) { if (!it.box || !it.lines.length) continue; const b = it.box; const c = col(it); const bx = b.x + b.w / 2, by = b.y + b.h / 2;   // wedge pointer from the box middle to the pin
    const ang = Math.atan2(it.px[1] - by, it.px[0] - bx), nx = Math.cos(ang + Math.PI / 2) * 13, ny = Math.sin(ang + Math.PI / 2) * 13;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx + nx, by + ny); ctx.lineTo(bx - nx, by - ny); ctx.lineTo(it.px[0], it.px[1]); ctx.closePath(); ctx.fill(); }
  for (const it of order) { if (!it.box || !it.lines.length) continue; const b = it.box; const c = col(it);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; it.lines.forEach((l, i) => { ctx.font = (i === 0 ? 'bold ' : '') + F + 'px Arial'; ctx.fillText(l, b.x + b.w / 2, b.y + 34 + i * LH); }); ctx.textAlign = 'left'; }
  for (const it of order) { ctx.beginPath(); ctx.arc(it.px[0], it.px[1], 9, 0, 2 * Math.PI); ctx.fillStyle = col(it); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
}
/* ---- her market area boundary and her own labels ---- */
const NOTE_PX = { S: 24, M: 32, L: 44 };
function paintExtras(ctx, L, xy) {
  const nb = L.showNb === false ? null : L.nb;
  if (nb && nb.length > 1) { const P = nb.map(xy); ctx.save(); ctx.beginPath(); P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (L.nbClosed !== false && nb.length > 2) { ctx.closePath(); ctx.fillStyle = 'rgba(123,44,191,.08)'; ctx.fill(); }
    ctx.setLineDash([24, 12]); ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#7b2cbf'; ctx.stroke(); ctx.restore(); }
  (L.notes || []).forEach(n => { const [x, y] = xy(n.p); const fs = NOTE_PX[n.size] || NOTE_PX.M; const lines = String(n.text || '').split('\n'); ctx.save(); ctx.font = `bold ${fs}px Arial`; ctx.textAlign = 'center';
    if (n.box) { const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 28, h = lines.length * fs * 1.2 + 16; ctx.fillStyle = '#fff'; ctx.strokeStyle = n.col || '#222'; ctx.lineWidth = 3; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeRect(x - w / 2, y - h / 2, w, h); }
    lines.forEach((l, i) => { const yy = y + (i - (lines.length - 1) / 2) * fs * 1.2 + fs * 0.35; if (!n.box) { ctx.lineWidth = Math.max(5, fs / 4); ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineJoin = 'round'; ctx.strokeText(l, x, yy); } ctx.fillStyle = n.col || '#222'; ctx.fillText(l, x, yy); });
    ctx.restore(); });
}
function noteBox(ctx, n, xy) { const [x, y] = xy(n.p); const fs = NOTE_PX[n.size] || NOTE_PX.M; const lines = String(n.text || '').split('\n'); ctx.font = `bold ${fs}px Arial`; const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 28, h = lines.length * fs * 1.2 + 16; return { x: x - w / 2, y: y - h / 2, w, h }; }
const dirShort = d => ({ North: 'N', South: 'S', East: 'E', West: 'W', NorthEast: 'NE', NorthWest: 'NW', SouthEast: 'SE', SouthWest: 'SW' }[String(d || '').replace(/\s/g, '')] || d);
const toJpeg = cv => new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
function addrLines(addr, city, zip) { return [addr, [city, 'CA', zip].filter(Boolean).join(' ').replace(' CA', ', CA')]; }
const nbOf = J => (J.nbhd && J.nbhd.pts && J.nbhd.pts.length ? J.nbhd : null);

/* ---- the location map: subject + grid comps (+ rentals she ticked) ---- */
async function makeLocationMap(J, kind) {
  const S = J.subject; const sp = { lat: num(S.lat), lon: num(S.lon) };
  if (!sp.lat || !sp.lon) { toast('The subject has no latitude / longitude yet – drop the subject’s CRS report (or your iPad workfile) first', 7000); return; }
  const list = kind === 'rent' ? (J.rentals || []).filter(r => r.use) : usedComps(J);
  if (!list.length) { toast(kind === 'rent' ? 'Add the rentals first (Income approach)' : 'Put comps on the grid first'); return; }
  if (kind === 'rent') { MAPS.busy = 'Finding the rentals on the map…'; mapsRender(); const miss = await geocodeRentals(J); if (miss.length) toast('Not found on the map: ' + miss.join(', '), 8000); }
  if (kind !== 'rent') { const g = await geocodeMissing(J, list); if (g.miss.length) toast('Not found on the map: ' + g.miss.join(', ') + ' – add its latitude / longitude (CRS report) and make the map again', 8000); }
  const W = 1700, H = 2200; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const items = [{ kind: 'subj', p: sp, lines: ['Subject', ...addrLines(S.addr + (S.unit ? ' #' + S.unit : ''), S.city, S.zip)] }];
  list.forEach((c, i) => { const p = kind === 'rent' ? (c.lat ? { lat: c.lat, lon: c.lon } : null) : geoOf(c); if (!p) return;
    const mi = milesBetween(sp, p), dir = directionOf(sp, p);
    items.push({ cid: kind === 'rent' ? null : c.id, kind: kind === 'rent' ? 'rent' : 'comp', p, lines: [kind === 'rent' ? 'Comparable Rental ' + (i + 1) : 'Comparable Sale ' + c.use, ...(kind === 'rent' ? addrLines(c.addr, c.city, c.zip) : addrLines(V(c, 'addr') || compTitle(c), V(c, 'city') || '', V(c, 'zip') || '')), mi != null ? `${mi.toFixed(2)} miles ${dirShort(dir)}` : ''].filter(Boolean) }); });
  MAPS.busy = 'Drawing the map…'; mapsRender();
  const M0 = await mapsGet(J); const old = M0[kind === 'rent' ? 'rent' : 'loc']; const base = (old && old.layout && old.layout.base) || mapBasePref();
  const pts = items.map(x => x.p); const B = await drawBase(ctx, W, H, pts, base, { x: 420, y: 330 }, 17);
  const NB = nbOf(J); const L0 = { nb: NB ? NB.pts : [], notes: (old && old.layout && old.layout.notes) || [], showNb: old && old.layout ? old.layout.showNb : !!NB };
  paintExtras(ctx, L0, B.xy);
  items.forEach(it => { it.px = B.xy(it.p); }); callouts(ctx, W, H, items); northArrow(ctx, W); scaleBar(ctx, H, B.z, sp.lat); credit(ctx, W, H, B.credit);
  MAPS.busy = ''; if (B.bad === B.total) { toast('The map would not load (no internet, or the map server is busy) – try again in a minute, or pick another map style', 7000); mapsRender(); return; }
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the map picture: ' + (e.message || e), 7000); mapsRender(); return; }
  const layout = { kind, W, H, z: B.z, base, center: { lon: x2lon(B.ox + W / 2, B.z), lat: y2lat(B.oy + H / 2, B.z) }, nb: L0.nb, showNb: L0.showNb, notes: L0.notes,
    items: items.map(it => ({ kind: it.kind, p: it.p, lines: it.lines, cid: it.cid || null, off: [it.box.x - it.px[0], it.box.y - it.px[1]] })) };
  const M = await mapsGet(J); M[kind === 'rent' ? 'rent' : 'loc'] = { blob, at: Date.now(), n: items.length - 1, use: true, layout, src: MAP_BASES[base].name }; await mapsPut(J, M);
  toast(`${kind === 'rent' ? 'Rental' : 'Location'} map made – subject and ${items.length - 1} ${kind === 'rent' ? 'rental' : 'comp'}${items.length > 2 ? 's' : ''}`); mapsRender();
}

/* ---- the market area map (her ask Oct 22 2026): the subject and the boundary she draws ---- */
async function makeMarketMap(J) {
  const S = J.subject; const sp = { lat: num(S.lat), lon: num(S.lon) }; if (!sp.lat) { toast('The subject has no latitude / longitude yet'); return; }
  const M0 = await mapsGet(J); const old = M0.nbhd && M0.nbhd.layout; const NB = nbOf(J); const W = 1700, H = 1700;
  let z = 15, center = sp;
  if (NB && NB.pts.length > 1) { const pts = [sp, ...NB.pts]; z = 17; const fits = zz => { const xs = pts.map(p => lon2x(p.lon, zz)), ys = pts.map(p => lat2y(p.lat, zz)); return Math.max(...xs) - Math.min(...xs) <= W - 240 && Math.max(...ys) - Math.min(...ys) <= H - 240; };
    while (z > 8 && !fits(z)) z--; const xs = pts.map(p => lon2x(p.lon, z)), ys = pts.map(p => lat2y(p.lat, z)); center = { lon: x2lon((Math.max(...xs) + Math.min(...xs)) / 2, z), lat: y2lat((Math.max(...ys) + Math.min(...ys)) / 2, z) }; }
  const L = old ? { ...old, nb: NB ? NB.pts : [], notes: NB && NB.notes ? NB.notes : old.notes || [] } : { kind: 'nbhd', W, H, z, center, base: mapBasePref(), nb: NB ? NB.pts : [], notes: NB && NB.notes ? NB.notes : [], showNb: true,
    items: [{ kind: 'subj', p: sp, lines: ['Subject', ...addrLines(S.addr + (S.unit ? ' #' + S.unit : ''), S.city, S.zip)], off: [60, -190] }] };
  if (!old) { L.z = z; L.center = center; }
  MAPS.busy = 'Drawing the market area map…'; mapsRender();
  const r = await renderLayout(L); MAPS.busy = '';
  if (!r) { mapsRender(); return; }
  const M = await mapsGet(J); M.nbhd = { blob: r.blob, at: Date.now(), use: true, layout: L, src: MAP_BASES[L.base || 'street'].name }; await mapsPut(J, M); mapsRender();
  if (!NB) { toast('Now draw the market area boundary: click ✏ Draw boundary, then click around the area on the map', 9000); mapEdit(J, 'nbhd', 'draw'); }
  else toast('Market area map made');
}
/* draw a saved layout to a picture (used by the market area map and by Save in the editor) */
async function renderLayout(L) {
  const cv = document.createElement('canvas'); cv.width = L.W; cv.height = L.H; const ctx = cv.getContext('2d');
  const B = await drawBaseAt(ctx, L.W, L.H, L.base || 'street', L.z, L.center); L.z = B.z;
  if (B.bad === B.total) { toast('The map would not load (no internet, or the map server is busy) – try again in a minute, or pick another map style', 7000); return null; }
  paintExtras(ctx, L, B.xy);
  L.items.forEach(it => { it.px = B.xy(it.p); const sz = calloutSize(ctx, it); it.box = { x: Math.round(it.px[0] + it.off[0]), y: Math.round(it.px[1] + it.off[1]), w: sz.w, h: sz.h }; });
  paintCallouts(ctx, L.items); L.items.forEach(it => { delete it.px; delete it.box; });
  northArrow(ctx, L.W); scaleBar(ctx, L.H, B.z, L.center.lat); credit(ctx, L.W, L.H, B.credit);
  try { return { blob: await toJpeg(cv) }; } catch (e) { toast('Chrome would not save the map picture: ' + (e.message || e), 7000); return null; }
}

/* ---- aerial view of the subject, close up (her ask Oct 20 2026): USGS NAIP Plus orthoimagery (USGS / USDA, The National Map –
   1-foot imagery in most urban areas) drawn for a set ground width; red outline + arrow at the subject. Falls back to the
   USGS imagery tiles (to about 1:9,000) when NAIP Plus will not load. ---- */
const NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage';
const merc = p => [p.lon * 20037508.34 / 180, Math.log(Math.tan((90 + p.lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180];
async function makeAerial(J, widthM) {
  const S = J.subject; const sp = { lat: num(S.lat), lon: num(S.lon) }; if (!sp.lat) { toast('The subject has no latitude / longitude yet'); return; }
  const M0 = await mapsGet(J); widthM = widthM || (M0.aerial && M0.aerial.width) || 220;
  MAPS.busy = 'Drawing the aerial view…'; mapsRender();
  const W = 1600, H = 1200; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const k = 1 / Math.cos(sp.lat * Math.PI / 180); const [mx, my] = merc(sp); const hw = widthM * k / 2, hh = hw * H / W;
  const url = `${NAIP}?bbox=${mx - hw},${my - hh},${mx + hw},${my + hh}&bboxSR=3857&imageSR=3857&size=${W},${H}&format=jpg&f=image`;
  let im = await imgLoad(url), src = 'USGS / USDA NAIP Plus';
  if (im) ctx.drawImage(im, 0, 0, W, H);
  else {   // the older USGS imagery tiles, scaled up
    src = 'USGS'; const z = MAP_SRC.aerial.max; const half = { x: W / 4, y: H / 4 }; const cx = lon2x(sp.lon, z), cy = lat2y(sp.lat, z); const ox = cx - half.x, oy = cy - half.y;
    const off = document.createElement('canvas'); off.width = W / 2; off.height = H / 2; const oc = off.getContext('2d'); oc.fillStyle = '#ccc'; oc.fillRect(0, 0, off.width, off.height); let bad = 0, tot = 0; const jobs = [];
    for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + off.width) / TILE); tx++) for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + off.height) / TILE); ty++) { tot++; jobs.push(imgLoad(MAP_SRC.aerial.url(z, tx, ty)).then(i2 => { if (i2) oc.drawImage(i2, tx * TILE - ox, ty * TILE - oy); else bad++; })); }
    await Promise.all(jobs); if (bad === tot) { MAPS.busy = ''; toast('The aerial imagery would not load – use the aerial picture from the CRS Property Report instead (Use my own picture)', 8000); mapsRender(); return; }
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H); widthM = null; }
  MAPS.busy = '';
  // red outline round the site (about a lot's size at this scale) and an arrow from the label to it
  const pxPerM = widthM ? W / widthM : 3; const r = Math.max(46, Math.min(220, 18 * pxPerM)); const X = W / 2, Y = H / 2;
  ctx.lineWidth = 7; ctx.strokeStyle = '#ff1f1f'; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(X, Y, r, 0, 2 * Math.PI); ctx.stroke();
  const lab = 'Subject – ' + (S.addr || ''); ctx.font = 'bold 40px Arial'; const lw = ctx.measureText(lab).width + 40, lh = 64; const bx = Math.max(24, X - r - lw - 40), by = Math.max(24, Y - r - lh - 110);
  const ax0 = bx + lw * 0.75, ay0 = by + lh, ang = Math.atan2(Y - ay0, X - ax0), tipX = X - Math.cos(ang) * (r + 8), tipY = Y - Math.sin(ang) * (r + 8);
  ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(tipX - Math.cos(ang) * 30, tipY - Math.sin(ang) * 30); ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX - Math.cos(ang - 0.45) * 56, tipY - Math.sin(ang - 0.45) * 56); ctx.lineTo(tipX - Math.cos(ang + 0.45) * 56, tipY - Math.sin(ang + 0.45) * 56); ctx.closePath(); ctx.fillStyle = '#ff1f1f'; ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, lw, lh); ctx.lineWidth = 5; ctx.strokeStyle = '#c00000'; ctx.strokeRect(bx, by, lw, lh); ctx.fillStyle = '#c00000'; ctx.textAlign = 'left'; ctx.fillText(lab, bx + 20, by + 45);
  if (widthM) { const bar = Math.round(widthM / 8 / 10) * 10 || 10, bp = bar * pxPerM; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(20, H - 70, bp + 30, 44); ctx.fillStyle = '#111'; ctx.fillRect(35, H - 44, bp, 8); ctx.font = '600 18px Arial'; ctx.fillText(`${bar} m (${Math.round(bar * 3.281)} ft)`, 35, H - 52); }
  northArrow(ctx, W);
  credit(ctx, W, H, (src === 'USGS' ? MAP_SRC.aerial.credit : 'Imagery: USGS, USDA, The National Map') + ' · approximate location, not a survey');
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the aerial picture – use your own picture from CRS', 7000); mapsRender(); return; }
  const M = await mapsGet(J); M.aerial = { blob, at: Date.now(), src, use: true, width: widthM }; await mapsPut(J, M); toast('Aerial view made' + (widthM ? ` – about ${Math.round(widthM * 3.281)} ft across` : ' (closer imagery would not load)')); mapsRender();
}

/* ---- flood map: FEMA National Flood Hazard Layer (public) ---- */
const NFHL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer';
const NFHL_L = { zones: 28, lines: 27, bfe: 16, panels: 3, lomr: 1, loma: 34 };
async function nfhlAt(layer, p, fields, geom) {
  const u = `${NFHL}/${layer}/query?geometry=${p.lon},${p.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${fields || '*'}&returnGeometry=${geom ? 'true&outSR=4326&geometryPrecision=6' : 'false'}&f=json`;
  const r = await (await fetchT(u)).json(); if (r && r.error) throw new Error(r.error.message || 'FEMA error'); return (r && r.features) || []; }
async function femaZoneAt(p) {   // Flood Hazard Zones layer (28)
  try { const f = await nfhlAt(NFHL_L.zones, p, 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DEPTH,DFIRM_ID'); const a = f[0] && f[0].attributes; if (!a) return { none: true };
    return { zone: a.FLD_ZONE, sub: a.ZONE_SUBTY || '', sfha: a.SFHA_TF === 'T', dfirm: a.DFIRM_ID || '', bfe: a.STATIC_BFE != null && a.STATIC_BFE > -9000 ? a.STATIC_BFE : null, depth: a.DEPTH != null && a.DEPTH > -9000 ? a.DEPTH : null }; } catch (e) { return null; } }
async function femaPanelAt(p) {   // FIRM Panels layer (3) – with the panel outline
  try { const f = await nfhlAt(NFHL_L.panels, p, '*', true); const ft = f[0]; const a = ft && ft.attributes; if (!a) return null;
    const pan = a.FIRM_PAN && String(a.FIRM_PAN).length >= 10 ? String(a.FIRM_PAN) : [a.DFIRM_ID, a.PANEL, a.SUFFIX].filter(Boolean).join('') || String(a.FIRM_PAN || '');
    return { panel: pan, date: a.EFF_DATE ? new Date(a.EFF_DATE).toISOString().slice(0, 10) : '', type: a.PANEL_TYP || '', rings: ft.geometry && ft.geometry.rings || null }; } catch (e) { return null; } }
async function femaLetters(p) {   // LOMR (1) and LOMA (34) at the subject
  const out = []; for (const [k, l] of [['LOMR', NFHL_L.lomr], ['LOMA', NFHL_L.loma]]) { try { const f = await nfhlAt(l, p, '*'); f.forEach(x => { const a = x.attributes || {}; out.push({ kind: k, case: a.CASE_NO || a.CASE_NUMBER || '', date: a.EFF_DATE ? new Date(a.EFF_DATE).toISOString().slice(0, 10) : '' }); }); } catch (e) {} } return out; }
function infoBox(ctx, x, y, lines, col) {   // [ [text, bold?], ... ]
  ctx.save(); const w = Math.max(...lines.map(([t, b]) => { ctx.font = (b ? 'bold ' : '') + '25px Arial'; return ctx.measureText(t).width; })) + 36, h = lines.length * 34 + 22;
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = col || '#1565d8'; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#111'; lines.forEach(([t, b], i) => { ctx.font = (b ? 'bold ' : '') + '25px Arial'; ctx.fillText(t, x + 18, y + 40 + i * 34); }); ctx.restore(); return h; }
function legendBox(ctx, x, y, rows, title) {   // rows: [fill, stroke, text, dash?]
  ctx.save(); ctx.font = '21px Arial'; const w = Math.max(ctx.measureText(title).width + 10, ...rows.map(r => ctx.measureText(r[2]).width)) + 80, h = rows.length * 32 + 48;
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x, y - h, w, h); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.strokeRect(x, y - h, w, h);
  ctx.fillStyle = '#111'; ctx.font = 'bold 21px Arial'; ctx.fillText(title, x + 14, y - h + 30);
  rows.forEach(([f, s, t, dash], i) => { const yy = y - h + 46 + i * 32; ctx.fillStyle = f; ctx.fillRect(x + 14, yy, 40, 22); ctx.strokeStyle = s; ctx.lineWidth = 3; if (dash) ctx.setLineDash([8, 5]); ctx.strokeRect(x + 14, yy, 40, 22); ctx.setLineDash([]); ctx.fillStyle = '#111'; ctx.font = '21px Arial'; ctx.fillText(t, x + 64, yy + 18); });
  ctx.restore(); }
async function makeFloodMap(J) {
  const S = J.subject; const sp = { lat: num(S.lat), lon: num(S.lon) }; if (!sp.lat) { toast('The subject has no latitude / longitude yet'); return; }
  MAPS.busy = 'Drawing the flood map…'; mapsRender();
  const W = 1600, H = 1300; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const M0 = await mapsGet(J); const base = (M0.flood && M0.flood.base) || (mapBasePref() === 'street' ? 'soft' : mapBasePref());
  const B = await drawBase(ctx, W, H, [{ lat: sp.lat + 0.006, lon: sp.lon - 0.008 }, { lat: sp.lat - 0.006, lon: sp.lon + 0.008 }], base, { x: 10, y: 10 }, 17);
  const bb = [px2mx(B.ox, B.z), px2my(B.oy + H, B.z), px2mx(B.ox + W, B.z), px2my(B.oy, B.z)].join(',');
  const [ov, zone, panel, letters] = await Promise.all([
    imgLoad(`${NFHL}/export?bbox=${bb}&bboxSR=3857&imageSR=3857&size=${W},${H}&format=png32&transparent=true&dpi=120&layers=show:${NFHL_L.zones},${NFHL_L.lines},${NFHL_L.bfe}&f=image`),
    femaZoneAt(sp), femaPanelAt(sp), femaLetters(sp)]);
  if (ov) { ctx.globalAlpha = 0.8; ctx.drawImage(ov, 0, 0, W, H); ctx.globalAlpha = 1; }
  if (panel && panel.rings) { ctx.save(); ctx.strokeStyle = '#d4005a'; ctx.lineWidth = 5; ctx.setLineDash([18, 10]); panel.rings.forEach(rg => { ctx.beginPath(); rg.forEach(([lo, la], i) => { const [x, y] = B.xy({ lat: la, lon: lo }); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }); ctx.restore(); }
  const [px, py] = B.xy(sp); ctx.beginPath(); ctx.arc(px, py, 13, 0, 2 * Math.PI); ctx.fillStyle = '#c00000'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.save(); ctx.font = 'bold 26px Arial'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineJoin = 'round'; ctx.strokeText('Subject', px + 20, py - 14); ctx.fillStyle = '#c00000'; ctx.fillText('Subject', px + 20, py - 14); ctx.restore();
  const crsZone = (S.crs && S.crs.fema) || '';
  const zl = zone && zone.zone ? `FEMA flood zone ${zone.zone}${zone.sub ? ' (' + zone.sub.toLowerCase() + ')' : ''}` : zone && zone.none ? 'No FEMA flood zone mapped at this spot' : crsZone ? 'Flood zone (from CRS): ' + crsZone : 'Flood zone: FEMA did not answer – see the CRS report';
  const lines = [['Subject – ' + (S.addr || ''), 1], [zl, 1]];
  if (zone && zone.zone) lines.push([zone.sfha ? 'In a Special Flood Hazard Area (1% annual chance)' : 'Not in a Special Flood Hazard Area', 0]);
  if (zone && zone.bfe != null) lines.push([`Base flood elevation ${zone.bfe} ft`, 0]);
  if (panel) lines.push([`FIRM panel (map number) ${panel.panel}`, 1], [panel.date ? `Panel effective ${showDate(panel.date)}` : 'Panel effective date: see FEMA', 0]);
  (letters || []).forEach(l => lines.push([`${l.kind} ${l.case}${l.date ? ', effective ' + showDate(l.date) : ''} at this spot`, 0]));
  infoBox(ctx, 20, 20, lines, '#1565d8');
  legendBox(ctx, 20, H - 90, [['rgba(60,140,255,.45)', '#1565d8', 'Special Flood Hazard Area (A, AE, AO, VE…)'], ['rgba(255,165,0,.45)', '#e07b00', 'Zone X shaded (0.2% annual chance)'], ['rgba(0,0,0,0)', '#d4005a', 'FIRM panel edge', 1], ['#c00000', '#fff', 'Subject']], 'Flood map key');
  northArrow(ctx, W); credit(ctx, W, H, 'Flood hazard: FEMA National Flood Hazard Layer · ' + B.credit + ' · approximate location');
  MAPS.busy = '';
  if (!ov && !zone) toast('FEMA’s flood map server did not answer – the map shows the zone from CRS only. You can use the CRS flood map picture instead.', 8000);
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the flood map – use the CRS flood map picture (Use my own picture)', 8000); mapsRender(); return; }
  const M = await mapsGet(J); M.flood = { blob, at: Date.now(), src: ov ? 'FEMA' : 'street map + CRS zone', zone: zone && zone.zone ? zone : null, panel: panel ? { panel: panel.panel, date: panel.date } : null, letters, base, use: true }; await mapsPut(J, M);
  if (zone && zone.zone && !J.subject.femaZone) { J.subject.femaZone = zone.zone; J.subject.femaPanel = panel ? panel.panel : ''; J.subject.femaDate = panel ? panel.date : ''; save(); }
  toast(zone && zone.zone ? `Flood map made – zone ${zone.zone}${panel ? ', panel ' + panel.panel : ''}` : 'Flood map made'); mapsRender();
}

/* ---- wildfire map (her ask Oct 22 2026): CAL FIRE / OSFM Fire Hazard Severity Zones ---- */
const FHSZ_HOST = 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/';
const FHSZ_SRC = [   // CAL FIRE's public layers only (no sign-in layers), tried in order; the first that answers for each area wins
  { ra: 'SRA', url: FHSZ_HOST + 'FHSZSRA_23_3/FeatureServer/0', map: 'SRA map effective April 1, 2024' },
  { ra: 'LRA', url: FHSZ_HOST + 'FHSALRA25_v1_All/FeatureServer/0', map: 'LRA map dated March 24, 2025' },
  { ra: 'LRA', url: FHSZ_HOST + 'FHSZLRA25_v1_All/FeatureServer/0', map: 'LRA map dated March 24, 2025' },
];
const FHSZ_VIEW = { SRA: 'https://experience.arcgis.com/experience/5065c998b4b0462f9ec3c6c226c610a9', LRA: 'https://experience.arcgis.com/experience/6a9cb66bb1824cd98756812af41292a0' };
const FHSZ_COL = { 'Very High': ['rgba(220,30,30,.42)', '#b00000'], High: ['rgba(255,140,0,.42)', '#c96000'], Moderate: ['rgba(255,220,0,.42)', '#a08a00'] };
function fhszClass(a) {   // the field names differ between CAL FIRE's layers – read whichever is there
  const k = Object.keys(a || {}); const get = re => { const f = k.find(x => re.test(x)); return f ? a[f] : null; };
  let v = get(/^(haz_?class|fhsz_?desc\w*|fhsz9|hazard_?class)$/i); if (v == null) v = get(/^(fhsz|haz_?code|hazard_?code|haz)$/i);
  const s = String(v == null ? '' : v).trim();
  if (/very\s*high|^3$|vh/i.test(s)) return 'Very High'; if (/^high|^2$/i.test(s)) return 'High'; if (/moderate|^1$/i.test(s)) return 'Moderate';
  if (/non|^-3$|^0$|unzoned/i.test(s)) return 'Not zoned'; return s || null; }
const fhszRA = (a, dflt) => { const k = Object.keys(a || {}).find(x => /^(sra|resp\w*|ra)$/i.test(x)); const v = k ? String(a[k] || '').toUpperCase() : ''; return /LRA/.test(v) ? 'LRA' : /SRA/.test(v) ? 'SRA' : /FRA/.test(v) ? 'FRA' : dflt; };
async function fhszQuery(src, geom, gtype, withGeom) {
  const u = `${src.url}/query?geometry=${encodeURIComponent(geom)}&geometryType=${gtype}&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=${withGeom ? 'true&outSR=4326&geometryPrecision=5&maxAllowableOffset=0.00004' : 'false'}&resultRecordCount=1500&f=json`;
  const r = await (await fetchT(u, 25000)).json(); if (!r || r.error) throw new Error((r && r.error && r.error.message) || 'no answer'); return r.features || []; }
async function fhszLook(sp, env) {   // zone at the subject + the zone shapes in the map area
  const res = { at: [], shapes: [], answered: [], failed: [] }; const done = new Set();
  for (const src of FHSZ_SRC) { if (src.ra && done.has(src.ra)) continue; if (!src.ra && res.answered.length) continue;
    try { const at = await fhszQuery(src, `${sp.lon},${sp.lat}`, 'esriGeometryPoint', false); const sh = await fhszQuery(src, env.join(','), 'esriGeometryEnvelope', true);
      res.answered.push(src); if (src.ra) done.add(src.ra);
      at.forEach(f => { const c = fhszClass(f.attributes); if (c) res.at.push({ cls: c, ra: fhszRA(f.attributes, src.ra), map: src.map }); });
      sh.forEach(f => { const c = fhszClass(f.attributes); if (c && FHSZ_COL[c] && f.geometry && f.geometry.rings) res.shapes.push({ cls: c, rings: f.geometry.rings }); });
    } catch (e) { res.failed.push(src); } }
  return res; }
const FHSZ_RANK = { 'Very High': 3, High: 2, Moderate: 1 };
async function makeFireMap(J) {
  const S = J.subject; const sp = { lat: num(S.lat), lon: num(S.lon) }; if (!sp.lat) { toast('The subject has no latitude / longitude yet'); return; }
  MAPS.busy = 'Drawing the wildfire map…'; mapsRender();
  const W = 1600, H = 1300; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const M0 = await mapsGet(J); const base = (M0.fire && M0.fire.base) || (mapBasePref() === 'street' ? 'soft' : mapBasePref());
  const B = await drawBase(ctx, W, H, [{ lat: sp.lat + 0.011, lon: sp.lon - 0.015 }, { lat: sp.lat - 0.011, lon: sp.lon + 0.015 }], base, { x: 10, y: 10 }, 16);
  const env = [x2lon(B.ox, B.z), y2lat(B.oy + H, B.z), x2lon(B.ox + W, B.z), y2lat(B.oy, B.z)];
  const F = await fhszLook(sp, env);
  ['Moderate', 'High', 'Very High'].forEach(cls => F.shapes.filter(s => s.cls === cls).forEach(s => { const [fill, line] = FHSZ_COL[cls]; ctx.beginPath(); s.rings.forEach(rg => rg.forEach(([lo, la], i) => { const [x, y] = B.xy({ lat: la, lon: lo }); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); })); ctx.fillStyle = fill; ctx.fill('evenodd'); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke(); }));
  const [px, py] = B.xy(sp); ctx.beginPath(); ctx.arc(px, py, 13, 0, 2 * Math.PI); ctx.fillStyle = '#111'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.save(); ctx.font = 'bold 26px Arial'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineJoin = 'round'; ctx.strokeText('Subject', px + 20, py - 14); ctx.fillStyle = '#111'; ctx.fillText('Subject', px + 20, py - 14); ctx.restore();
  const top = F.at.filter(a => FHSZ_RANK[a.cls]).sort((a, b) => FHSZ_RANK[b.cls] - FHSZ_RANK[a.cls])[0];
  let zoneTxt, result;
  if (top) { zoneTxt = `${top.cls} Fire Hazard Severity Zone${top.ra ? ' (' + top.ra + ')' : ''}`; result = { cls: top.cls, ra: top.ra, map: top.map }; }
  else if (F.answered.length && !F.failed.some(f => f.ra === 'LRA' || f.ra === 'SRA') ) { zoneTxt = 'Not in a mapped Fire Hazard Severity Zone'; result = { cls: 'None', ra: (F.at[0] && F.at[0].ra) || '', map: F.answered.map(s => s.map).join('; ') }; }
  else if (F.answered.length) { zoneTxt = 'No zone found in the maps that answered – check the CAL FIRE viewer'; result = { cls: 'Unknown', map: F.answered.map(s => s.map).join('; ') }; }
  else { zoneTxt = 'CAL FIRE’s map server did not answer'; result = null; }
  const lines = [['Subject – ' + (S.addr || ''), 1], ['CAL FIRE: ' + zoneTxt, 1]];
  if (result && result.map) lines.push(['Source: ' + (top ? top.map : result.map), 0]);
  if (top && top.ra === 'LRA') lines.push(['Local (LRA) zones apply once the city or county adopts them', 0]);
  infoBox(ctx, 20, 20, lines, top ? FHSZ_COL[top.cls][1] : '#555');
  legendBox(ctx, 20, H - 90, [[FHSZ_COL['Very High'][0], FHSZ_COL['Very High'][1], 'Very High'], [FHSZ_COL.High[0], FHSZ_COL.High[1], 'High'], [FHSZ_COL.Moderate[0], FHSZ_COL.Moderate[1], 'Moderate']], 'Fire Hazard Severity Zone');
  northArrow(ctx, W); scaleBar(ctx, H - 240, B.z, sp.lat); credit(ctx, W, H, 'Fire Hazard Severity Zones: CAL FIRE / OSFM · ' + B.credit + ' · approximate location');
  MAPS.busy = '';
  if (!result) { toast('CAL FIRE’s map server did not answer. Open the CAL FIRE viewer (link on the card), take a screenshot, and use it with “Use my own picture”.', 10000); mapsRender(); return; }
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the wildfire map – use a screenshot of the CAL FIRE viewer (Use my own picture)', 8000); mapsRender(); return; }
  const M = await mapsGet(J); M.fire = { blob, at: Date.now(), src: 'CAL FIRE / OSFM', zone: result, base, use: true }; await mapsPut(J, M);
  J.subject.fhsz = { ...result, at: Date.now() }; save();   // what the map found – your iPad answer is never changed
  toast('Wildfire map made – ' + zoneTxt); mapsRender();
}
/* her iPad answer vs what the CAL FIRE map shows (for the card and the pre-check – she decides) */
function fireCheck(J) { const f = J.subject && J.subject.fhsz; const ip = (J.subject && J.subject.insp && J.subject.insp.fire) || ''; if (!f || !ip || !/Very High|High|Moderate|None/.test(f.cls)) return null;
  const ipCls = /Very High/.test(ip) ? 'Very High' : /High Fire/.test(ip) ? 'High' : /Moderate/.test(ip) ? 'Moderate' : /No Fire Hazard/.test(ip) ? 'None' : null; if (!ipCls || ipCls === f.cls) return null;
  return `Your iPad answer for the fire hazard zone is “${ip}”, but the CAL FIRE map shows ${f.cls === 'None' ? 'no mapped zone' : f.cls + (f.ra ? ' (' + f.ra + ')' : '')} at the subject. Check it and correct whichever is wrong.`; }

/* ---- her own picture instead (CRS aerial, CRS flood map, CAL FIRE viewer screenshot, a map she made) ---- */
async function mapOwnPicture(J, key, file) {
  if (!file) return; let blob = file;
  if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) { toast('Use a picture: in the CRS report, snip the map (Windows key + Shift + S) and save it, or save the page as a picture', 8000); return; }
  if (!/^image\/jpe?g$/i.test(file.type)) { const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = URL.createObjectURL(file); }); if (!im) { toast('That picture could not be read'); return; }
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0); blob = await toJpeg(cv); }
  const M = await mapsGet(J); M[key] = { ...(M[key] && key === 'fire' ? { zone: M[key].zone } : {}), blob, at: Date.now(), src: 'your picture: ' + file.name, use: true }; await mapsPut(J, M); toast('Your picture is used for the ' + MAP_LABEL[key].toLowerCase()); mapsRender();
}

const MAP_LABEL = { loc: 'Location map', rent: 'Rental map', nbhd: 'Market area map', aerial: 'Aerial view', flood: 'Flood map', fire: 'Wildfire map' };
const MAP_IMG = { loc: ['SalesComparableMap', 'Location map – subject and comparable sales', 'Location Map.jpg'], rent: ['RentalComparableMap', 'Rental map – subject and comparable rentals', 'Rental Map.jpg'],
  nbhd: ['MarketAnalysisExhibit', 'Market area map – subject and market area boundary', 'Market Area Map.jpg'],
  aerial: ['SiteExhibit', 'Aerial view of the subject', 'Aerial View.jpg'], flood: ['SiteExhibit', 'Flood map', 'Flood Map.jpg'], fire: ['SiteExhibit', 'Fire hazard severity zone map', 'Wildfire Map.jpg'] };
function mapCaption(k, m) {
  if (k === 'flood' && m.zone) return `Flood map – FEMA zone ${m.zone.zone}${m.panel ? ', FIRM panel ' + m.panel.panel + (m.panel.date ? ' effective ' + showDate(m.panel.date) : '') : ''}`;
  if (k === 'fire' && m.zone && m.zone.cls && m.zone.cls !== 'Unknown') return m.zone.cls === 'None' ? 'Fire hazard map – not in a mapped CAL FIRE Fire Hazard Severity Zone' : `Fire hazard map – CAL FIRE ${m.zone.cls} Fire Hazard Severity Zone${m.zone.ra ? ' (' + m.zone.ra + ')' : ''}`;
  return MAP_IMG[k][1]; }
let MAPS_CACHE = { job: null, M: {} }; const MAP_URL = {};
const MAP_EDITABLE = k => ['loc', 'rent', 'nbhd'].includes(k);
async function mapsRender() {
  const box = document.getElementById('mapCard'); if (!box || !app.job) return; const J = app.job;
  if (MAPS_CACHE.job !== J.id) MAPS_CACHE = { job: J.id, M: await mapsGet(J) }; else MAPS_CACHE.M = await mapsGet(J); const M = MAPS_CACHE.M;
  const used = usedComps(J); const noGeo = used.filter(c => !geoOf(c)); const sOk = num(J.subject.lat) && num(J.subject.lon);
  const make = { loc: 'Make the location map', rent: 'Make the rental map', nbhd: 'Make the market area map', aerial: 'Make the aerial view', flood: 'Make the flood map', fire: 'Make the wildfire map' };
  const card = k => { const m = M[k]; if (m && m.blob) { if (MAP_URL[k]) URL.revokeObjectURL(MAP_URL[k]); MAP_URL[k] = URL.createObjectURL(m.blob); }
    const btn = `<button class="btn sm primary" data-map="${k}">${m ? 'Make it again' : make[k]}</button>`;
    const own = `<label class="btn sm">Use my own picture<input type="file" accept="image/*" data-mapown="${k}" hidden></label>`;
    const styleSel = ['flood', 'fire'].includes(k) ? `<label class="inl small">Style <select data-mapbase="${k}">${Object.entries(MAP_BASES).filter(([b]) => b !== 'sat').map(([b, x]) => `<option value="${b}" ${((m && m.base) || (mapBasePref() === 'street' ? 'soft' : mapBasePref())) === b ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : '';
    const info = k === 'flood' && m && m.zone ? `<small>FEMA zone <b>${esc(m.zone.zone)}</b>${m.zone.sfha ? ' (Special Flood Hazard Area)' : ''}${m.panel ? ` · FIRM panel <b>${esc(m.panel.panel)}</b>${m.panel.date ? ' · effective ' + esc(showDate(m.panel.date)) : ''}` : ''}${(m.letters || []).length ? ' · ' + m.letters.map(l => esc(l.kind + ' ' + l.case)).join(', ') : ''}</small>`
      : k === 'fire' ? `${m && m.zone ? `<small>CAL FIRE: <b>${esc(m.zone.cls === 'None' ? 'not in a mapped zone' : m.zone.cls === 'Unknown' ? 'not found – check the viewer' : m.zone.cls + ' zone' + (m.zone.ra ? ' (' + m.zone.ra + ')' : ''))}</b></small>` : ''}${fireCheck(J) ? `<small class="warnTxt">${esc(fireCheck(J))}</small>` : ''}<small>Check it: <a href="${FHSZ_VIEW.SRA}" target="_blank" rel="noopener">CAL FIRE state (SRA) viewer</a> · <a href="${FHSZ_VIEW.LRA}" target="_blank" rel="noopener">local (LRA) viewer</a></small>`
      : k === 'nbhd' ? `<small>${nbOf(J) ? `Boundary drawn (${nbOf(J).pts.length} points). It also shows on the location map when you tick it in Edit map.` : 'Draw the boundary after you make the map (Edit map › ✏ Draw boundary).'}</small>` : '';
    return `<div class="mapbox"><b>${MAP_LABEL[k]}</b>${m ? `<a href="${MAP_URL[k]}" target="_blank" title="Open full size"><img src="${MAP_URL[k]}" alt="${MAP_LABEL[k]}"></a><small class="muted">${esc(m.src || (m.n ? 'subject + ' + m.n : ''))} · ${new Date(m.at).toLocaleString()}</small>
      <label class="check"><input type="checkbox" data-mapuse="${k}" ${m.use !== false ? 'checked' : ''}> Put it in the SFREP report</label>` : '<div class="mapempty">not made yet</div>'}
      <div class="row">${btn}${['aerial', 'flood', 'fire', 'nbhd'].includes(k) ? own : ''}${m && m.layout ? `<button class="btn sm" data-mapedit="${k}">Edit map</button>` : ''}${k === 'aerial' && m && m.width ? `<button class="btn sm" data-aerialw="${Math.max(60, Math.round(m.width / 1.6))}">Closer</button><button class="btn sm" data-aerialw="${Math.min(2000, Math.round(m.width * 1.6))}">Farther</button>` : ''}${m ? `<a class="btn sm" href="${MAP_URL[k]}" download="${MAP_IMG[k][2]}">Save picture</a><button class="btn sm" data-mapdel="${k}">✕</button>` : ''}</div>
      ${styleSel}${info}</div>`; };
  box.innerHTML = `<h2>Maps and exhibits <small>location, market area, aerial, flood and wildfire maps – they go into the SFREP report</small></h2>
    ${MAPS.busy ? `<p class="help"><b>${esc(MAPS.busy)}</b></p>` : ''}
    ${!sOk ? '<p class="help warnTxt">The subject has no latitude / longitude yet – drop the subject’s CRS report (Add comps) or your iPad workfile.</p>' : ''}
    ${noGeo.length ? `<p class="help">${noGeo.length} comp${noGeo.length > 1 ? 's' : ''} on the grid ha${noGeo.length > 1 ? 've' : 's'} no latitude / longitude (${noGeo.map(c => esc(compTitle(c))).join(', ')}) – the map looks ${noGeo.length > 1 ? 'them' : 'it'} up by address. The comp's CRS report gives the exact spot.</p>` : ''}
    <p class="row"><label class="inl">Map style for new maps <select data-mapbasepref>${Object.entries(MAP_BASES).map(([b, x]) => `<option value="${b}" ${mapBasePref() === b ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label><span class="help">You can change the style of each map in Edit map.</span></p>
    <div class="maps">${card('loc')}${(J.rentals || []).some(r => r.use) || M.rent ? card('rent') : ''}${card('nbhd')}${card('aerial')}${card('flood')}${card('fire')}</div>
    <p class="help">Street map © OpenStreetMap contributors · USGS The National Map (topo, imagery, roads) · USDA NAIP imagery · flood zones from FEMA’s National Flood Hazard Layer · fire zones from CAL FIRE / OSFM. Pins are placed from latitude / longitude (approximate). Check each map before the report goes out.</p>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-map],[data-mapdel]'); if (!b || !app.job) return; const J = app.job;
  if (b.dataset.mapdel) { const M = await mapsGet(J); delete M[b.dataset.mapdel]; await mapsPut(J, M); mapsRender(); return; }
  if (MAPS.busy && Date.now() - (MAPS.since || 0) < 90000) { toast('Still working on the last map – ' + MAPS.busy); return; }
  const k = b.dataset.map; MAPS.since = Date.now(); b.disabled = true; const was = b.textContent; b.textContent = 'Working…';
  try { if (k === 'loc' || k === 'rent') await makeLocationMap(J, k); else if (k === 'nbhd') await makeMarketMap(J); else if (k === 'aerial') await makeAerial(J); else if (k === 'flood') await makeFloodMap(J); else if (k === 'fire') await makeFireMap(J); }
  catch (x) { console.warn('map', x); toast('That map could not be made: ' + (x.message || x) + ' – try again in a minute, or use your own picture', 9000); }
  finally { MAPS.busy = ''; MAPS.since = 0; b.disabled = false; b.textContent = was; mapsRender(); }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!app.job) return;
  if (t.dataset.mapown) { await mapOwnPicture(app.job, t.dataset.mapown, t.files[0]); t.value = ''; }
  if (t.dataset.mapuse) { const M = await mapsGet(app.job); if (M[t.dataset.mapuse]) { M[t.dataset.mapuse].use = t.checked; await mapsPut(app.job, M); } }
  if (t.matches && t.matches('[data-mapbasepref]')) { try { localStorage.setItem('gnMapBase', t.value); } catch (x) {} toast('New maps use: ' + MAP_BASES[t.value].name); }
  if (t.dataset.mapbase) { const M = await mapsGet(app.job); const k = t.dataset.mapbase; M[k] = { ...(M[k] || {}), base: t.value }; if (!M[k].blob) delete M[k].blob; await mapsPut(app.job, M);
    if (M[k].blob) toast('Click “Make it again” to redraw the ' + MAP_LABEL[k].toLowerCase() + ' in this style'); }
});
/* for the full report: the pictures she kept ticked */
async function mapsForReport(J) { const M = await mapsGet(J); return Object.keys(MAP_IMG).filter(k => M[k] && M[k].blob && M[k].use !== false).map(k => ({ k, blob: M[k].blob, cat: MAP_IMG[k][0], cap: mapCaption(k, M[k]), file: MAP_IMG[k][2] })); }

/* ---- her ask (Oct 20 + Oct 22 2026): fix a map by hand – drag a label, drag the map, zoom, change the style, change a
   label's words, add her own labels, draw the market area boundary, move a dot that is in the wrong place;
   Save redraws the picture for the report ---- */
async function mapEdit(J, key, startMode) {
  const M = await mapsGet(J); const m = M[key]; if (!m || !m.layout) { toast('Make the map again first – maps made before this update cannot be edited'); return; }
  const L = JSON.parse(JSON.stringify(m.layout)); const W = L.W, H = L.H;
  L.base = L.base || 'street'; L.notes = L.notes || []; const NB = nbOf(J); if (!L.nb || !L.nb.length) L.nb = NB ? JSON.parse(JSON.stringify(NB.pts)) : []; if (L.showNb === undefined) L.showNb = key === 'nbhd' || !!NB;
  const undo = [];
  const snap = () => { undo.push(JSON.stringify({ nb: L.nb, notes: L.notes, items: L.items.map(i => ({ p: i.p, off: i.off, lines: i.lines })) })); if (undo.length > 40) undo.shift(); };
  const bg = document.createElement('div'); bg.className = 'sheet-bg mapedit';
  const sideHTML = () => `<h3>Labels</h3>${L.items.map((it, i) => `<label class="fld"><span>${it.kind === 'subj' ? 'Subject' : esc(it.lines[0] || 'Label')}</span><textarea rows="${Math.max(1, it.lines.length)}" data-mel="${i}">${esc(it.lines.join('\n'))}</textarea></label>`).join('')}
    <h3>Your labels <small>street names, areas, landmarks</small></h3>${L.notes.length ? '' : '<p class="help">Click ＋ Add a label, then drag it into place.</p>'}
    ${L.notes.map((n, i) => `<div class="menote"><textarea rows="${String(n.text).split('\n').length}" data-men="${i}">${esc(n.text)}</textarea><span class="row"><select data-mens="${i}">${['S', 'M', 'L'].map(s => `<option value="${s}" ${(n.size || 'M') === s ? 'selected' : ''}>${{ S: 'Small', M: 'Medium', L: 'Large' }[s]}</option>`).join('')}</select>
      <select data-menc="${i}">${[['#222', 'Black'], ['#c00000', 'Red'], ['#1565d8', 'Blue'], ['#7b2cbf', 'Purple'], ['#0a7a35', 'Green']].map(([c, t]) => `<option value="${c}" ${(n.col || '#222') === c ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" data-menb="${i}" ${n.box ? 'checked' : ''}> box</label><button class="btn sm" data-me="delnote" data-i="${i}">✕</button></span></div>`).join('')}
    <h3>Market area boundary</h3><p class="help">${L.nb.length ? `${L.nb.length} points. Drag a purple corner to reshape it; click on a boundary line (✏ mode) to add a corner there.` : 'None yet – click ✏ Draw boundary, then click around the area.'}</p>
    ${key !== 'nbhd' ? `<label class="check"><input type="checkbox" data-menbshow ${L.showNb ? 'checked' : ''}> Show the boundary on this map</label>` : ''}`;
  bg.innerHTML = `<div class="sheet mapsheet"><div class="mehead"><h2>Edit the ${esc(MAP_LABEL[key].toLowerCase())}</h2>
    <span class="row"><button class="btn sm" data-me="in">＋ Zoom in</button><button class="btn sm" data-me="out">－ Zoom out</button>
      <select data-mebase>${Object.entries(MAP_BASES).map(([b, x]) => `<option value="${b}" ${L.base === b ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <button class="btn sm" data-me="note">＋ Add a label</button><button class="btn sm" data-me="draw">✏ Draw boundary</button><button class="btn sm" data-me="clearnb">Clear boundary</button>
      ${L.items.length > 1 ? '<button class="btn sm" data-me="auto">Place labels for me</button>' : ''}<button class="btn sm" data-me="undo">↶ Undo</button>
      <span class="grow"></span><button class="btn primary" data-me="save">Save the map</button><button class="btn" data-me="cancel">Cancel</button></span></div>
    <p class="help memode"></p>
    <div class="mebody"><div class="mecv"><canvas></canvas><div class="mebusy" hidden>Loading the map…</div></div><div class="meside"></div></div></div>`;
  document.body.appendChild(bg);
  const side = bg.querySelector('.meside'); const drawSide = () => { side.innerHTML = sideHTML(); };
  const cv = bg.querySelector('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = W; base.height = H; const bctx = base.getContext('2d'); let B = null, panDx = 0, panDy = 0;
  let mode = startMode === 'draw' ? 'draw' : 'move';
  const modeTxt = () => { bg.querySelector('.memode').innerHTML = mode === 'draw' ? '<b>✏ Drawing the boundary:</b> click on the map to add each corner, going around the area. Click the first corner (or ✓ Done) to close it. Drag a corner to move it. Right-click a corner to remove it. <button class="btn sm primary" data-me="drawdone">✓ Done</button>'
      : 'Drag a <b>label</b> to move it (its pointer follows). Drag the <b>map</b> to slide it. Drag a <b>purple corner</b> to reshape the boundary. Drag a <b>dot</b> only if the house is in the wrong place – that corrects its location and distance. Change the words on the right.';
    bg.querySelector('[data-me="draw"]').classList.toggle('primary', mode === 'draw'); };
  const busy = on => { bg.querySelector('.mebusy').hidden = !on; };
  const xy = p => { const [x, y] = B.xy(p); return [x + panDx, y + panDy]; };
  const toP = (x, y) => ({ lat: y2lat(B.oy + y - panDy, B.z), lon: x2lon(B.ox + x - panDx, B.z) });
  const place = () => L.items.forEach(it => { it.px = B.xy(it.p); const sz = calloutSize(ctx, it); it.box = { x: Math.round(it.px[0] + it.off[0]), y: Math.round(it.px[1] + it.off[1]), w: sz.w, h: sz.h }; });
  const paint = (clean) => { ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#e8eef2'; ctx.fillRect(0, 0, W, H); ctx.drawImage(base, panDx, panDy);
    paintExtras(ctx, L, xy);
    if (!clean && (L.showNb || mode === 'draw')) L.nb.forEach((p, i) => { const [x, y] = xy(p); ctx.beginPath(); ctx.arc(x, y, i === 0 && mode === 'draw' ? 16 : 11, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#7b2cbf'; ctx.stroke(); });
    if (panDx || panDy) { ctx.save(); ctx.translate(panDx, panDy); } paintCallouts(ctx, L.items); if (panDx || panDy) ctx.restore();
    northArrow(ctx, W); credit(ctx, W, H, B.credit); };
  const loadBase = async () => { busy(true); B = await drawBaseAt(bctx, W, H, L.base, L.z, L.center); L.z = B.z; busy(false); place(); paint(); };
  drawSide(); modeTxt(); await loadBase();
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  const hitV = (x, y) => (L.showNb || mode === 'draw') ? L.nb.findIndex(p => { const [a, b] = xy(p); return Math.hypot(a - x, b - y) < 20; }) : -1;
  const hitN = (x, y) => { for (let i = L.notes.length - 1; i >= 0; i--) { const bx = noteBox(ctx, L.notes[i], xy); if (x >= bx.x && x <= bx.x + bx.w && y >= bx.y && y <= bx.y + bx.h) return i; } return -1; };
  const segAt = (x, y) => { if (L.nb.length < 2) return -1; let best = -1, bd = 16; const n = L.nb.length, closed = L.nbClosed !== false && n > 2;
    for (let i = 0; i < (closed ? n : n - 1); i++) { const [x1, y1] = xy(L.nb[i]), [x2, y2] = xy(L.nb[(i + 1) % n]); const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1))); const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)); if (d < bd) { bd = d; best = i; } } return best; };
  let drag = null;
  cv.addEventListener('contextmenu', e => { const [x, y] = at(e); const v = hitV(x, y); if (v >= 0) { e.preventDefault(); snap(); L.nb.splice(v, 1); drawSide(); paint(); } });
  cv.addEventListener('pointerdown', e => { if (e.button === 2) return; const [x, y] = at(e); cv.setPointerCapture(e.pointerId);
    const v = hitV(x, y); if (v >= 0) { if (mode === 'draw' && v === 0 && L.nb.length > 2) { mode = 'move'; L.nbClosed = true; modeTxt(); drawSide(); paint(); return; } snap(); drag = { t: 'vert', i: v, x, y }; return; }
    if (mode === 'draw') { snap(); const s = L.nb.length > 2 ? segAt(x, y) : -1; if (s >= 0 && s < L.nb.length - 1) L.nb.splice(s + 1, 0, toP(x, y)); else L.nb.push(toP(x, y)); L.nbClosed = true; drawSide(); paint(); return; }
    const ni = hitN(x, y); if (ni >= 0) { snap(); drag = { t: 'note', i: ni, x, y }; return; }
    const dot = L.items.slice().reverse().find(it => Math.hypot(it.px[0] + panDx - x, it.px[1] + panDy - y) < 22);
    const box = L.items.slice().reverse().find(it => x >= it.box.x + panDx && x <= it.box.x + it.box.w + panDx && y >= it.box.y + panDy && y <= it.box.y + it.box.h + panDy);
    if (dot || box) snap();
    drag = dot ? { t: 'dot', it: dot, x, y } : box ? { t: 'box', it: box, x, y } : { t: 'pan', x, y }; });
  cv.addEventListener('pointermove', e => { const [x, y] = at(e); if (!drag) { cv.style.cursor = mode === 'draw' ? 'crosshair' : hitV(x, y) >= 0 || hitN(x, y) >= 0 ? 'move' : L.items.some(it => Math.hypot(it.px[0] - x, it.px[1] - y) < 22) ? 'crosshair' : L.items.some(it => x >= it.box.x && x <= it.box.x + it.box.w && y >= it.box.y && y <= it.box.y + it.box.h) ? 'move' : 'grab'; return; }
    const dx = x - drag.x, dy = y - drag.y; drag.x = x; drag.y = y;
    if (drag.t === 'vert') L.nb[drag.i] = toP(x, y);
    else if (drag.t === 'note') { const n = L.notes[drag.i]; const [a, b] = xy(n.p); n.p = toP(a + dx, b + dy); }
    else if (drag.t === 'box') { drag.it.box.x += dx; drag.it.box.y += dy; drag.it.off = [drag.it.box.x - drag.it.px[0], drag.it.box.y - drag.it.px[1]]; }
    else if (drag.t === 'dot') { drag.it.px = [drag.it.px[0] + dx, drag.it.px[1] + dy]; drag.it.off = [drag.it.box.x - drag.it.px[0], drag.it.box.y - drag.it.px[1]]; drag.it.moved = true; }
    else { panDx += dx; panDy += dy; }
    paint(); });
  cv.addEventListener('pointerup', async () => { const d = drag; drag = null; if (!d) return;
    if (d.t === 'vert') drawSide();
    if (d.t === 'dot') { const it = d.it; it.p = { lat: y2lat(B.oy + it.px[1], B.z), lon: x2lon(B.ox + it.px[0], B.z) };
      const sp = L.items.find(x => x.kind === 'subj'); if (it.kind !== 'subj' && sp) { const mi = milesBetween(sp.p, it.p), dir = directionOf(sp.p, it.p); const k = it.lines.findIndex(l => /miles/.test(l)); if (k >= 0 && mi != null) { it.lines[k] = `${mi.toFixed(2)} miles ${dirShort(dir)}`; const ta = bg.querySelector(`[data-mel="${L.items.indexOf(it)}"]`); if (ta) ta.value = it.lines.join('\n'); } }
      place(); paint(); }
    if (d.t === 'pan' && (panDx || panDy)) { L.center = { lon: x2lon(B.ox + W / 2 - panDx, B.z), lat: y2lat(B.oy + H / 2 - panDy, B.z) }; panDx = 0; panDy = 0; await loadBase(); } });
  bg.addEventListener('input', e => { const t = e.target;
    if (t.dataset.mel !== undefined) { L.items[+t.dataset.mel].lines = t.value.split('\n').filter(x => x.trim() !== ''); place(); paint(); }
    if (t.dataset.men !== undefined) { L.notes[+t.dataset.men].text = t.value; paint(); } });
  bg.addEventListener('change', async e => { const t = e.target;
    if (t.matches('[data-mebase]')) { L.base = t.value; await loadBase(); }
    if (t.dataset.mens !== undefined) { L.notes[+t.dataset.mens].size = t.value; paint(); }
    if (t.dataset.menc !== undefined) { L.notes[+t.dataset.menc].col = t.value; paint(); }
    if (t.dataset.menb !== undefined) { L.notes[+t.dataset.menb].box = t.checked; paint(); }
    if (t.matches('[data-menbshow]')) { L.showNb = t.checked; paint(); } });
  const close = () => bg.remove();
  bg.addEventListener('click', async e => { const b = e.target.closest('[data-me]'); if (!b) return; const a = b.dataset.me;
    if (a === 'cancel') close();
    else if (a === 'in' || a === 'out') { L.z += a === 'in' ? 1 : -1; L.z = Math.max(5, Math.min(20, L.z)); await loadBase(); }
    else if (a === 'note') { snap(); L.notes.push({ p: toP(W / 2, H / 2), text: 'Label', size: 'M', col: '#222' }); drawSide(); paint(); const ta = side.querySelector(`[data-men="${L.notes.length - 1}"]`); if (ta) { ta.focus(); ta.select(); } }
    else if (a === 'delnote') { snap(); L.notes.splice(+b.dataset.i, 1); drawSide(); paint(); }
    else if (a === 'draw') { mode = mode === 'draw' ? 'move' : 'draw'; if (mode === 'draw') L.showNb = true; modeTxt(); drawSide(); paint(); }
    else if (a === 'drawdone') { mode = 'move'; modeTxt(); drawSide(); paint(); }
    else if (a === 'clearnb') { if (!L.nb.length) return; snap(); L.nb = []; drawSide(); paint(); toast('Boundary cleared – ↶ Undo brings it back'); }
    else if (a === 'undo') { const s = undo.pop(); if (!s) { toast('Nothing to undo'); return; } const o = JSON.parse(s); L.nb = o.nb; L.notes = o.notes; o.items.forEach((x, i) => { if (L.items[i]) Object.assign(L.items[i], x); }); drawSide(); place(); paint(); }
    else if (a === 'auto') { L.items.forEach(it => { delete it.box; }); const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d'); L.items.forEach(it => { it.px = B.xy(it.p); }); callouts(tctx, W, H, L.items); L.items.forEach(it => { it.off = [it.box.x - it.px[0], it.box.y - it.px[1]]; }); paint(); }
    else if (a === 'save') { mode = 'move'; paint(true); scaleBar(ctx, H, B.z, L.center.lat); let blob; try { blob = await toJpeg(cv); } catch (x) { toast('Chrome would not save the map picture: ' + (x.message || x), 7000); return; }
      L.items.forEach(it => { if (it.moved && it.kind === 'subj') { J.subject.lat = +it.p.lat.toFixed(6); J.subject.lon = +it.p.lon.toFixed(6); }
        if (it.moved && it.cid) { const c = J.comps.find(x => x.id === it.cid); if (c) { c.edit = c.edit || {}; c.edit.lat = +it.p.lat.toFixed(6); c.edit.lon = +it.p.lon.toFixed(6); c.geo = { lat: it.p.lat, lon: it.p.lon, src: 'moved on the map' }; } } delete it.moved; delete it.px; delete it.box; });
      const nbChanged = JSON.stringify(L.nb) !== JSON.stringify((nbOf(J) || { pts: [] }).pts);
      if (L.nb.length > 2 || key === 'nbhd') J.nbhd = { pts: L.nb, notes: key === 'nbhd' ? L.notes : (J.nbhd && J.nbhd.notes) || [], at: Date.now() };
      const M2 = await mapsGet(J); M2[key] = { ...(M2[key] || {}), blob, at: Date.now(), layout: L, src: MAP_BASES[L.base].name, use: M2[key] ? M2[key].use !== false : true }; await mapsPut(J, M2); save(); close(); render(); mapsRender();
      const others = ['loc', 'rent', 'nbhd'].filter(k => k !== key && M2[k] && M2[k].layout && M2[k].layout.showNb !== false);
      toast(nbChanged && others.length ? `Map saved. The boundary changed – open Edit map › Save on the ${others.map(k => MAP_LABEL[k].toLowerCase()).join(' and ')} to show it there too.` : 'Map saved', nbChanged && others.length ? 9000 : 3000); } });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-mapedit]'); if (b && app.job) mapEdit(app.job, b.dataset.mapedit); const a = e.target.closest('[data-aerialw]'); if (a && app.job) { if (MAPS.busy && Date.now() - (MAPS.since || 0) < 90000) { toast('Still working on the last map'); return; } MAPS.since = Date.now(); makeAerial(app.job, +a.dataset.aerialw).catch(x => toast('The aerial could not be made: ' + (x.message || x), 8000)).finally(() => { MAPS.busy = ''; MAPS.since = 0; mapsRender(); }); } });
