/* =====================================================================
   Maps and exhibits (her request, Oct 20 2026): a location map of the subject and every comp on the grid (and rentals,
   when there is a rent survey), labeled like her SFREP maps; an aerial view of the subject; a flood map.
   Drawn in the browser from public map tiles and saved as JPEG pictures; the full report puts them in SFREP as
   Sales Comparable Map / Rental Comparable Map / Site exhibits.
   - Street map: OpenStreetMap (© OpenStreetMap contributors – the credit is printed on the map).
   - Aerial: USGS National Map imagery (public domain). Or her own picture (CRS Property Report).
   - Flood: FEMA National Flood Hazard Layer (public). Or her own picture (CRS flood map).
   A comp without latitude / longitude is looked up by address (OpenStreetMap Nominatim, one per second).
   ===================================================================== */
const MAPS = { busy: '' };
const TILE = 256;
const MAP_SRC = {
  street: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, max: 19, credit: 'Map data © OpenStreetMap contributors' },
  aerial: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/${z}/${y}/${x}`, max: 16, credit: 'Imagery: USGS The National Map' },
};
const lon2x = (lon, z) => (lon + 180) / 360 * TILE * 2 ** z;
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TILE * 2 ** z; };
const x2lon = (x, z) => x / (TILE * 2 ** z) * 360 - 180;
const y2lat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (TILE * 2 ** z)))) * 180 / Math.PI;
const imgLoad = url => new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
async function mapsGet(J) { const r = await DB.get('kv', 'maps:' + J.id); return (r && r.v) || {}; }
async function mapsPut(J, M) { await DB.put('kv', { id: 'maps:' + J.id, v: M }); }
const geoOf = c => { const la = num(V(c, 'lat')), lo = num(V(c, 'lon')); if (la && lo) return { lat: la, lon: lo }; return c.geo && c.geo.lat ? c.geo : null; };

/* ---- comps with no latitude / longitude: look the address up ---- */
async function geocodeMissing(J, list) {
  const need = list.filter(c => !geoOf(c)); let n = 0, miss = [];
  for (const c of need) {
    const q = [V(c, 'addr') || compTitle(c), V(c, 'city') || J.subject.city || 'Santa Barbara', 'CA', V(c, 'zip') || ''].filter(Boolean).join(', ');
    MAPS.busy = `Finding ${compTitle(c)} on the map…`; mapsRender();
    try { const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(q)); const a = await r.json();
      if (a && a[0]) { c.geo = { lat: +a[0].lat, lon: +a[0].lon, src: 'address lookup' }; n++; } else miss.push(compTitle(c)); } catch (e) { miss.push(compTitle(c)); }
    await new Promise(r => setTimeout(r, 1100));   // Nominatim: at most one lookup a second
  }
  MAPS.busy = ''; if (n) save(); return { n, miss };
}

/* ---- draw tiles for a box of points on a canvas ---- */
async function drawBase(ctx, W, H, pts, src, pad, maxZ) {
  const S = MAP_SRC[src]; let z = Math.min(S.max, maxZ || S.max);
  const fits = zz => { const xs = pts.map(p => lon2x(p.lon, zz)), ys = pts.map(p => lat2y(p.lat, zz)); return Math.max(...xs) - Math.min(...xs) <= W - 2 * pad.x && Math.max(...ys) - Math.min(...ys) <= H - 2 * pad.y; };
  while (z > 3 && !fits(z)) z--;
  const xs = pts.map(p => lon2x(p.lon, z)), ys = pts.map(p => lat2y(p.lat, z));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2; const ox = cx - W / 2, oy = cy - H / 2;
  const t0x = Math.floor(ox / TILE), t1x = Math.floor((ox + W) / TILE), t0y = Math.floor(oy / TILE), t1y = Math.floor((oy + H) / TILE);
  ctx.fillStyle = '#e8eef2'; ctx.fillRect(0, 0, W, H); let bad = 0; const jobs = [];
  for (let tx = t0x; tx <= t1x; tx++) for (let ty = t0y; ty <= t1y; ty++) jobs.push(imgLoad(S.url(z, ((tx % 2 ** z) + 2 ** z) % 2 ** z, ty)).then(im => { if (im) ctx.drawImage(im, tx * TILE - ox, ty * TILE - oy); else bad++; }));
  await Promise.all(jobs);
  return { z, xy: p => [lon2x(p.lon, z) - ox, lat2y(p.lat, z) - oy], bad, total: jobs.length, ox, oy };
}
function credit(ctx, W, H, text) { ctx.font = '600 15px Arial'; const w = ctx.measureText(text).width + 14; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(W - w - 6, H - 28, w, 22); ctx.fillStyle = '#333'; ctx.fillText(text, W - w + 1, H - 12); }

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
  for (const it of order) { const b = it.box; const c = col(it); const bx = b.x + b.w / 2, by = b.y + b.h / 2;   // wedge pointer from the box middle to the pin
    const ang = Math.atan2(it.px[1] - by, it.px[0] - bx), nx = Math.cos(ang + Math.PI / 2) * 13, ny = Math.sin(ang + Math.PI / 2) * 13;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx + nx, by + ny); ctx.lineTo(bx - nx, by - ny); ctx.lineTo(it.px[0], it.px[1]); ctx.closePath(); ctx.fill(); }
  for (const it of order) { const b = it.box; const c = col(it);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; it.lines.forEach((l, i) => { ctx.font = (i === 0 ? 'bold ' : '') + F + 'px Arial'; ctx.fillText(l, b.x + b.w / 2, b.y + 34 + i * LH); }); ctx.textAlign = 'left'; }
  for (const it of order) { ctx.beginPath(); ctx.arc(it.px[0], it.px[1], 9, 0, 2 * Math.PI); ctx.fillStyle = col(it); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
}
const dirShort = d => ({ North: 'N', South: 'S', East: 'E', West: 'W', NorthEast: 'NE', NorthWest: 'NW', SouthEast: 'SE', SouthWest: 'SW' }[String(d || '').replace(/\s/g, '')] || d);
const toJpeg = cv => new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
function addrLines(addr, city, zip) { return [addr, [city, 'CA', zip].filter(Boolean).join(' ').replace(' CA', ', CA')]; }

/* ---- the location map: subject + grid comps (+ rentals / land sales she ticked) ---- */
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
  const pts = items.map(x => x.p); const B = await drawBase(ctx, W, H, pts, 'street', { x: 420, y: 330 });
  items.forEach(it => { it.px = B.xy(it.p); }); callouts(ctx, W, H, items); credit(ctx, W, H, MAP_SRC.street.credit);
  MAPS.busy = ''; if (B.bad === B.total) { toast('The street map would not load (no internet, or the map server is busy) – try again in a minute', 7000); mapsRender(); return; }
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the map picture: ' + (e.message || e), 7000); mapsRender(); return; }
  const layout = { kind, W, H, z: B.z, center: { lon: x2lon(B.ox + W / 2, B.z), lat: y2lat(B.oy + H / 2, B.z) }, items: items.map(it => ({ kind: it.kind, p: it.p, lines: it.lines, cid: it.cid || null, off: [it.box.x - it.px[0], it.box.y - it.px[1]] })) };
  const M = await mapsGet(J); M[kind === 'rent' ? 'rent' : 'loc'] = { blob, at: Date.now(), n: items.length - 1, use: true, layout }; await mapsPut(J, M);
  toast(`${kind === 'rent' ? 'Rental' : 'Location'} map made – subject and ${items.length - 1} ${kind === 'rent' ? 'rental' : 'comp'}${items.length > 2 ? 's' : ''}`); mapsRender();
}

/* ---- aerial view of the subject (USGS imagery, public domain) ---- */
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
  credit(ctx, W, H, (src === 'USGS' ? MAP_SRC.aerial.credit : 'Imagery: USGS, USDA, The National Map') + ' · approximate location, not a survey');
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the aerial picture – use your own picture from CRS', 7000); mapsRender(); return; }
  const M = await mapsGet(J); M.aerial = { blob, at: Date.now(), src, use: true, width: widthM }; await mapsPut(J, M); toast('Aerial view made' + (widthM ? ` – about ${Math.round(widthM * 3.281)} ft across` : ' (closer imagery would not load)')); mapsRender();
}

/* ---- flood map: FEMA flood hazard zones over the street map, with the zone at the subject ---- */
const NFHL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer';
async function femaZoneAt(p) {   // Flood Hazard Zones layer (28)
  try { const u = `${NFHL}/28/query?geometry=${p.lon},${p.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID&returnGeometry=false&f=json`;
    const r = await (await fetch(u)).json(); const a = r && r.features && r.features[0] && r.features[0].attributes; if (!a) return null;
    return { zone: a.FLD_ZONE, sub: a.ZONE_SUBTY || '', sfha: a.SFHA_TF === 'T', dfirm: a.DFIRM_ID || '' }; } catch (e) { return null; } }
async function femaPanelAt(p) {   // FIRM Panels layer (3)
  try { const u = `${NFHL}/3/query?geometry=${p.lon},${p.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FIRM_PAN,EFF_DATE,PANEL_TYP&returnGeometry=false&f=json`;
    const r = await (await fetch(u)).json(); const a = r && r.features && r.features[0] && r.features[0].attributes; if (!a) return null;
    return { panel: a.FIRM_PAN, date: a.EFF_DATE ? new Date(a.EFF_DATE).toISOString().slice(0, 10) : '' }; } catch (e) { return null; } }
async function makeFloodMap(J) {
  const S = J.subject; const sp = { lat: num(S.lat), lon: num(S.lon) }; if (!sp.lat) { toast('The subject has no latitude / longitude yet'); return; }
  MAPS.busy = 'Drawing the flood map…'; mapsRender();
  const W = 1600, H = 1300; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  // about a half-mile around the subject
  const B = await drawBase(ctx, W, H, [{ lat: sp.lat + 0.006, lon: sp.lon - 0.008 }, { lat: sp.lat - 0.006, lon: sp.lon + 0.008 }], 'street', { x: 10, y: 10 });
  const [x0, y0] = [B.ox, B.oy]; const z = B.z; const tile2lon = x => x / (TILE * 2 ** z) * 360 - 180; const tile2lat = y => { const n = Math.PI - 2 * Math.PI * y / (TILE * 2 ** z); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };
  const bbox = [tile2lon(x0), tile2lat(y0 + H), tile2lon(x0 + W), tile2lat(y0)].join(',');
  const ov = await imgLoad(`${NFHL}/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=${W},${H}&format=png32&transparent=true&layers=show:28&f=image`);
  const [zone, panel] = await Promise.all([femaZoneAt(sp), femaPanelAt(sp)]);
  if (ov) { ctx.globalAlpha = 0.75; ctx.drawImage(ov, 0, 0, W, H); ctx.globalAlpha = 1; }
  const [px, py] = B.xy(sp); ctx.beginPath(); ctx.arc(px, py, 12, 0, 2 * Math.PI); ctx.fillStyle = '#c00000'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  const crsZone = (S.crs && S.crs.fema) || '';
  const lines = ['Subject – ' + (S.addr || ''), zone ? `FEMA flood zone ${zone.zone}${zone.sub ? ' (' + zone.sub.toLowerCase() + ')' : ''}${zone.sfha ? ' – Special Flood Hazard Area' : ' – not a Special Flood Hazard Area'}` : crsZone ? 'Flood zone (CRS): ' + crsZone : 'Flood zone: see FEMA',
    panel ? `FIRM panel ${panel.panel}${panel.date ? ', effective ' + showDate(panel.date) : ''}` : ''].filter(Boolean);
  ctx.font = 'bold 24px Arial'; const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 30; ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fillRect(20, 20, w, lines.length * 32 + 20); ctx.strokeStyle = '#1565d8'; ctx.lineWidth = 3; ctx.strokeRect(20, 20, w, lines.length * 32 + 20);
  ctx.fillStyle = '#111'; lines.forEach((l, i) => { ctx.font = (i === 0 ? 'bold ' : '') + '22px Arial'; ctx.fillText(l, 36, 52 + i * 32); });
  credit(ctx, W, H, 'Flood hazard: FEMA National Flood Hazard Layer · ' + MAP_SRC.street.credit);
  MAPS.busy = '';
  if (!ov && !zone) toast('FEMA’s flood map server did not answer – the map shows the zone from CRS only. You can use the CRS flood map picture instead.', 8000);
  let blob; try { blob = await toJpeg(cv); } catch (e) { toast('Chrome would not save the flood map – use the CRS flood map picture (Use my own picture)', 8000); mapsRender(); return; }
  const M = await mapsGet(J); M.flood = { blob, at: Date.now(), src: ov ? 'FEMA' : 'street map + CRS zone', zone, panel, use: true }; await mapsPut(J, M);
  if (zone && !J.subject.femaZone) { J.subject.femaZone = zone.zone; J.subject.femaPanel = panel ? panel.panel : ''; J.subject.femaDate = panel ? panel.date : ''; save(); }
  toast(zone ? `Flood map made – zone ${zone.zone}${panel ? ', panel ' + panel.panel : ''}` : 'Flood map made'); mapsRender();
}

/* ---- her own picture instead (CRS aerial, CRS flood map, a map she made) ---- */
async function mapOwnPicture(J, key, file) {
  if (!file) return; let blob = file;
  if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) { toast('Use a picture: in the CRS report, snip the map (Windows key + Shift + S) and save it, or save the page as a picture', 8000); return; }
  if (!/^image\/jpe?g$/i.test(file.type)) { const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = URL.createObjectURL(file); }); if (!im) { toast('That picture could not be read'); return; }
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0); blob = await toJpeg(cv); }
  const M = await mapsGet(J); M[key] = { blob, at: Date.now(), src: 'your picture: ' + file.name, use: true }; await mapsPut(J, M); toast('Your picture is used for the ' + MAP_LABEL[key].toLowerCase()); mapsRender();
}

const MAP_LABEL = { loc: 'Location map', rent: 'Rental map', aerial: 'Aerial view', flood: 'Flood map' };
const MAP_IMG = { loc: ['SalesComparableMap', 'Location map – subject and comparable sales', 'Location Map.jpg'], rent: ['RentalComparableMap', 'Rental map – subject and comparable rentals', 'Rental Map.jpg'],
  aerial: ['SiteExhibit', 'Aerial view of the subject', 'Aerial View.jpg'], flood: ['SiteExhibit', 'Flood map', 'Flood Map.jpg'] };
let MAPS_CACHE = { job: null, M: {} }; const MAP_URL = {};
async function mapsRender() {
  const box = document.getElementById('mapCard'); if (!box || !app.job) return; const J = app.job;
  if (MAPS_CACHE.job !== J.id) MAPS_CACHE = { job: J.id, M: await mapsGet(J) }; else MAPS_CACHE.M = await mapsGet(J); const M = MAPS_CACHE.M;
  const used = usedComps(J); const noGeo = used.filter(c => !geoOf(c)); const sOk = num(J.subject.lat) && num(J.subject.lon);
  const card = k => { const m = M[k]; if (m && m.blob) { if (MAP_URL[k]) URL.revokeObjectURL(MAP_URL[k]); MAP_URL[k] = URL.createObjectURL(m.blob); }
    const btn = { loc: `<button class="btn sm primary" data-map="loc">${m ? 'Make it again' : 'Make the location map'}</button>`, rent: `<button class="btn sm primary" data-map="rent">${m ? 'Make it again' : 'Make the rental map'}</button>`,
      aerial: `<button class="btn sm primary" data-map="aerial">${m ? 'Make it again' : 'Make the aerial view'}</button>`, flood: `<button class="btn sm primary" data-map="flood">${m ? 'Make it again' : 'Make the flood map'}</button>` }[k];
    const own = `<label class="btn sm">Use my own picture<input type="file" accept="image/*" data-mapown="${k}" hidden></label>`;
    return `<div class="mapbox"><b>${MAP_LABEL[k]}</b>${m ? `<a href="${MAP_URL[k]}" target="_blank" title="Open full size"><img src="${MAP_URL[k]}" alt="${MAP_LABEL[k]}"></a><small class="muted">${esc(m.src || (m.n ? 'subject + ' + m.n : ''))} · ${new Date(m.at).toLocaleString()}</small>
      <label class="check"><input type="checkbox" data-mapuse="${k}" ${m.use !== false ? 'checked' : ''}> Put it in the SFREP report</label>` : '<div class="mapempty">not made yet</div>'}
      <div class="row">${btn}${k === 'aerial' || k === 'flood' ? own : ''}${m && m.layout ? `<button class="btn sm" data-mapedit="${k}">Edit map</button>` : ''}${k === 'aerial' && m && m.width ? `<button class="btn sm" data-aerialw="${Math.max(60, Math.round(m.width / 1.6))}">Closer</button><button class="btn sm" data-aerialw="${Math.min(2000, Math.round(m.width * 1.6))}">Farther</button>` : ''}${m ? `<a class="btn sm" href="${MAP_URL[k]}" download="${MAP_IMG[k][2]}">Save picture</a><button class="btn sm" data-mapdel="${k}">✕</button>` : ''}</div>
      ${k === 'flood' && m && m.zone ? `<small>FEMA zone <b>${esc(m.zone.zone)}</b>${m.panel ? ` · panel ${esc(m.panel.panel)}${m.panel.date ? ' · effective ' + esc(showDate(m.panel.date)) : ''}` : ''}</small>` : ''}</div>`; };
  box.innerHTML = `<h2>Maps and exhibits <small>location map, aerial view, flood map – they go into the SFREP report</small></h2>
    ${MAPS.busy ? `<p class="help"><b>${esc(MAPS.busy)}</b></p>` : ''}
    ${!sOk ? '<p class="help warnTxt">The subject has no latitude / longitude yet – drop the subject’s CRS report (Add comps) or your iPad workfile.</p>' : ''}
    ${noGeo.length ? `<p class="help">${noGeo.length} comp${noGeo.length > 1 ? 's' : ''} on the grid ha${noGeo.length > 1 ? 've' : 's'} no latitude / longitude (${noGeo.map(c => esc(compTitle(c))).join(', ')}) – the map looks ${noGeo.length > 1 ? 'them' : 'it'} up by address. The comp's CRS report gives the exact spot.</p>` : ''}
    <div class="maps">${card('loc')}${(J.rentals || []).some(r => r.use) || M.rent ? card('rent') : ''}${card('aerial')}${card('flood')}</div>
    <p class="help">Street map © OpenStreetMap contributors · aerial imagery from the USGS National Map · flood zones from FEMA’s National Flood Hazard Layer. Pins are placed from latitude / longitude (approximate). Check each map before the report goes out.</p>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-map],[data-mapdel]'); if (!b || !app.job) return; const J = app.job;
  if (b.dataset.mapdel) { const M = await mapsGet(J); delete M[b.dataset.mapdel]; await mapsPut(J, M); mapsRender(); return; }
  if (MAPS.busy) { toast('Still working on the last map…'); return; }
  const k = b.dataset.map; if (k === 'loc' || k === 'rent') await makeLocationMap(J, k); else if (k === 'aerial') await makeAerial(J); else if (k === 'flood') await makeFloodMap(J);
});
document.addEventListener('change', async e => {
  const t = e.target; if (!app.job) return;
  if (t.dataset.mapown) { await mapOwnPicture(app.job, t.dataset.mapown, t.files[0]); t.value = ''; }
  if (t.dataset.mapuse) { const M = await mapsGet(app.job); if (M[t.dataset.mapuse]) { M[t.dataset.mapuse].use = t.checked; await mapsPut(app.job, M); } }
});
/* for the full report: the pictures she kept ticked */
async function mapsForReport(J) { const M = await mapsGet(J); return Object.keys(MAP_IMG).filter(k => M[k] && M[k].blob && M[k].use !== false).map(k => ({ k, blob: M[k].blob, cat: MAP_IMG[k][0], cap: MAP_IMG[k][1], file: MAP_IMG[k][2] })); }

/* ---- her ask (Oct 20 2026): fix the location map by hand – drag a label, drag the map, zoom, change a label's words,
   move a dot that is in the wrong place; Save redraws the picture for the report ---- */
async function drawBaseAt(ctx, W, H, src, z, center) {
  const S = MAP_SRC[src]; z = Math.max(3, Math.min(S.max, z)); const ox = lon2x(center.lon, z) - W / 2, oy = lat2y(center.lat, z) - H / 2;
  const t0x = Math.floor(ox / TILE), t1x = Math.floor((ox + W) / TILE), t0y = Math.floor(oy / TILE), t1y = Math.floor((oy + H) / TILE);
  ctx.fillStyle = '#e8eef2'; ctx.fillRect(0, 0, W, H); const jobs = [];
  for (let tx = t0x; tx <= t1x; tx++) for (let ty = t0y; ty <= t1y; ty++) jobs.push(imgLoad(S.url(z, ((tx % 2 ** z) + 2 ** z) % 2 ** z, ty)).then(im => { if (im) ctx.drawImage(im, tx * TILE - ox, ty * TILE - oy); }));
  await Promise.all(jobs); return { z, ox, oy, xy: p => [lon2x(p.lon, z) - ox, lat2y(p.lat, z) - oy] };
}
async function mapEdit(J, key) {
  const M = await mapsGet(J); const m = M[key]; if (!m || !m.layout) { toast('Make the map again first – maps made before this update cannot be edited'); return; }
  const L = JSON.parse(JSON.stringify(m.layout)); const W = L.W, H = L.H;
  const bg = document.createElement('div'); bg.className = 'sheet-bg mapedit';
  bg.innerHTML = `<div class="sheet mapsheet"><div class="mehead"><h2>Edit the map</h2>
    <span class="row"><button class="btn sm" data-me="in">＋ Zoom in</button><button class="btn sm" data-me="out">－ Zoom out</button><button class="btn sm" data-me="auto">Place labels for me</button>
    <span class="grow"></span><button class="btn primary" data-me="save">Save the map</button><button class="btn" data-me="cancel">Cancel</button></span></div>
    <p class="help">Drag a <b>label</b> to move it (its pointer follows). Drag the <b>map</b> to slide it. Drag a <b>dot</b> only if the house is in the wrong place – that corrects its location and distance. Change the words on the right.</p>
    <div class="mebody"><div class="mecv"><canvas></canvas><div class="mebusy" hidden>Loading the map…</div></div><div class="meside">${L.items.map((it, i) => `<label class="fld"><span>${it.kind === 'subj' ? 'Subject' : it.lines[0]}</span><textarea rows="${it.lines.length}" data-mel="${i}">${esc(it.lines.join('\n'))}</textarea></label>`).join('')}</div></div></div>`;
  document.body.appendChild(bg);
  const cv = bg.querySelector('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = W; base.height = H; const bctx = base.getContext('2d'); let B = null, panDx = 0, panDy = 0;
  const busy = on => { bg.querySelector('.mebusy').hidden = !on; };
  const place = () => L.items.forEach(it => { it.px = B.xy(it.p); const sz = calloutSize(ctx, it); it.box = { x: Math.round(it.px[0] + it.off[0]), y: Math.round(it.px[1] + it.off[1]), w: sz.w, h: sz.h }; });
  const paint = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(base, panDx, panDy); if (panDx || panDy) { ctx.save(); ctx.translate(panDx, panDy); } paintCallouts(ctx, L.items); if (panDx || panDy) ctx.restore(); credit(ctx, W, H, MAP_SRC.street.credit); };
  const loadBase = async () => { busy(true); B = await drawBaseAt(bctx, W, H, 'street', L.z, L.center); L.z = B.z; busy(false); place(); paint(); };
  await loadBase();
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  let drag = null;
  cv.addEventListener('pointerdown', e => { const [x, y] = at(e); cv.setPointerCapture(e.pointerId);
    const dot = L.items.slice().reverse().find(it => Math.hypot(it.px[0] - x, it.px[1] - y) < 22);
    const box = L.items.slice().reverse().find(it => x >= it.box.x && x <= it.box.x + it.box.w && y >= it.box.y && y <= it.box.y + it.box.h);
    drag = dot ? { t: 'dot', it: dot, x, y } : box ? { t: 'box', it: box, x, y } : { t: 'pan', x, y }; });
  cv.addEventListener('pointermove', e => { if (!drag) { const [x, y] = at(e); const onDot = L.items.some(it => Math.hypot(it.px[0] - x, it.px[1] - y) < 22), onBox = L.items.some(it => x >= it.box.x && x <= it.box.x + it.box.w && y >= it.box.y && y <= it.box.y + it.box.h); cv.style.cursor = onDot ? 'crosshair' : onBox ? 'move' : 'grab'; return; }
    const [x, y] = at(e); const dx = x - drag.x, dy = y - drag.y; drag.x = x; drag.y = y;
    if (drag.t === 'box') { drag.it.box.x += dx; drag.it.box.y += dy; drag.it.off = [drag.it.box.x - drag.it.px[0], drag.it.box.y - drag.it.px[1]]; }
    else if (drag.t === 'dot') { drag.it.px = [drag.it.px[0] + dx, drag.it.px[1] + dy]; drag.it.off = [drag.it.box.x - drag.it.px[0], drag.it.box.y - drag.it.px[1]]; drag.it.moved = true; }
    else { panDx += dx; panDy += dy; }
    paint(); });
  cv.addEventListener('pointerup', async () => { const d = drag; drag = null; if (!d) return;
    if (d.t === 'dot') { const it = d.it; it.p = { lat: y2lat(B.oy + it.px[1], B.z), lon: x2lon(B.ox + it.px[0], B.z) };
      const sp = L.items.find(x => x.kind === 'subj'); if (it.kind !== 'subj' && sp) { const mi = milesBetween(sp.p, it.p), dir = directionOf(sp.p, it.p); const k = it.lines.findIndex(l => /miles/.test(l)); if (k >= 0 && mi != null) { it.lines[k] = `${mi.toFixed(2)} miles ${dirShort(dir)}`; const ta = bg.querySelector(`[data-mel="${L.items.indexOf(it)}"]`); if (ta) ta.value = it.lines.join('\n'); } }
      place(); paint(); }
    if (d.t === 'pan' && (panDx || panDy)) { L.center = { lon: x2lon(B.ox + W / 2 - panDx, B.z), lat: y2lat(B.oy + H / 2 - panDy, B.z) }; panDx = 0; panDy = 0; await loadBase(); } });
  bg.addEventListener('input', e => { const i = e.target.dataset.mel; if (i === undefined) return; L.items[+i].lines = e.target.value.split('\n').filter(x => x.trim() !== ''); place(); paint(); });
  const close = () => bg.remove();
  bg.addEventListener('click', async e => { const b = e.target.closest('[data-me]'); if (!b) return; const a = b.dataset.me;
    if (a === 'cancel') close();
    else if (a === 'in' || a === 'out') { L.z += a === 'in' ? 1 : -1; const k = a === 'in' ? 2 : 0.5; L.items.forEach(it => { if (it.kind) {} }); await loadBase(); }
    else if (a === 'auto') { L.items.forEach(it => { delete it.box; }); const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d'); L.items.forEach(it => { it.px = B.xy(it.p); }); callouts(tctx, W, H, L.items); L.items.forEach(it => { it.off = [it.box.x - it.px[0], it.box.y - it.px[1]]; }); paint(); }
    else if (a === 'save') { paint(); let blob; try { blob = await toJpeg(cv); } catch (x) { toast('Chrome would not save the map picture: ' + (x.message || x), 7000); return; }
      L.items.forEach(it => { if (it.moved && it.kind === 'subj') { J.subject.lat = +it.p.lat.toFixed(6); J.subject.lon = +it.p.lon.toFixed(6); }
        if (it.moved && it.cid) { const c = J.comps.find(x => x.id === it.cid); if (c) { c.edit = c.edit || {}; c.edit.lat = +it.p.lat.toFixed(6); c.edit.lon = +it.p.lon.toFixed(6); c.geo = { lat: it.p.lat, lon: it.p.lon, src: 'moved on the map' }; } } delete it.moved; delete it.px; delete it.box; });
      const M2 = await mapsGet(J); M2[key] = { ...(M2[key] || {}), blob, at: Date.now(), layout: L, use: M2[key] ? M2[key].use : true }; await mapsPut(J, M2); save(); close(); render(); mapsRender(); toast('Map saved'); } });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-mapedit]'); if (b && app.job) mapEdit(app.job, b.dataset.mapedit); const a = e.target.closest('[data-aerialw]'); if (a && app.job && !MAPS.busy) makeAerial(app.job, +a.dataset.aerialw); });
