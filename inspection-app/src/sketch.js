/* ============================================================
   Sketch page (stage 1): walls by keypad (0.1 ft), arrows and angles,
   backspace, auto-close, tap a wall to change its length, tap an area
   for its properties, rotate one or all, areas inside an area are
   subtracted, levels L1–L10 / B1–B5, labels, totals by UAD 3.6 bucket,
   undo, saved versions, sketch image into the inspection.
   Runs on its own page so it can never take the inspection page down.
   ============================================================ */
const SK = { ins: null, sk: null, lib: null, mode: 'select', drawId: null, sel: null, entry: '', angle: null, view: { ox: 0, oy: 0, s: 14 }, level: 'L1', undo: [], redo: [], dirty: false, pendingLabel: null, retTab: 'interior' };

/* ---------- UAD 3.6 buckets and area types ---------- */
const BUCKETS = {
  LIV:  { l: 'Finished (living) area', fill: 'rgba(255,214,153,.35)' },
  LIVN: { l: 'Finished – nonstandard (e.g. ceiling under 7 ft)', fill: 'rgba(255,190,120,.35)' },
  UNF:  { l: 'Unfinished area', fill: 'rgba(200,200,200,.35)' },
  GAR:  { l: 'Garage / carport', fill: 'rgba(170,190,215,.40)' },
  OUT:  { l: 'Outdoor living (patio, porch, deck, balcony)', fill: 'rgba(170,220,170,.35)' },
  OB:   { l: 'Outbuilding (gross building area)', fill: 'rgba(205,185,240,.35)' },
  ADU:  { l: 'ADU', fill: 'rgba(250,200,220,.40)' },
  AMEN: { l: 'Amenity (pool, spa, court)', fill: 'rgba(160,215,235,.40)' },
  NCA:  { l: 'Not calculated', fill: 'rgba(240,240,240,.30)' },
};
const D = (code, name, bucket, grp) => ({ id: (code + '-' + name).replace(/[^A-Za-z0-9]+/g, '_'), code, name, bucket, grp });
const DEFAULT_DEFS = [
  D('FIN', 'Finished Area', 'LIV', 'Living area'), D('FIN', 'Finished – Nonstandard', 'LIVN', 'Living area'),
  D('UNF', 'Unfinished Area', 'UNF', 'Living area'), D('UNF', 'Attic – Unfinished', 'UNF', 'Living area'), D('UNF', 'Incomplete Finished Basement', 'UNF', 'Living area'),
  D('GAR', 'Garage', 'GAR', 'Garage / carport'), D('GAR', '1 Car Garage', 'GAR', 'Garage / carport'), D('GAR', '2 Car Garage', 'GAR', 'Garage / carport'), D('GAR', '3 Car Garage', 'GAR', 'Garage / carport'), D('GAR', '4 Car Garage', 'GAR', 'Garage / carport'), D('GAR', 'Carport', 'GAR', 'Garage / carport'),
  D('P/P', 'Patio', 'OUT', 'Patio / porch'), D('P/P', 'Covered Patio', 'OUT', 'Patio / porch'), D('P/P', 'Enclosed Patio', 'OUT', 'Patio / porch'), D('P/P', 'Porch', 'OUT', 'Patio / porch'), D('P/P', 'Patio/Porch', 'OUT', 'Patio / porch'),
  D('P/P', 'Wood Deck', 'OUT', 'Patio / porch'), D('P/P', 'Deck', 'OUT', 'Patio / porch'), D('P/P', 'Balcony', 'OUT', 'Patio / porch'), D('P/P', 'Loggia', 'OUT', 'Patio / porch'), D('P/P', 'Gazebo', 'OUT', 'Patio / porch'), D('P/P', 'Portico', 'OUT', 'Patio / porch'),
  ...['Guest House','Guest Quarters','Guest Studio','Studio','Pool House','Cabana','Office','Workshop','Barn','Stable','Shed','Storage','Pool Equip','Changing','Yoga Pavilion','Tennis Pavilion','Wellness Center','Salon/Massage','Spa/Sauna','Gym'].map(n => D('OTH', n, 'OB', 'Outbuilding')),
  D('ADU', 'ADU', 'ADU', 'ADU'), D('ADU', 'JADU', 'ADU', 'ADU'), D('ADU', 'Guest Apartment', 'ADU', 'ADU'),
  D('AMN', 'Pool', 'AMEN', 'Amenity'), D('AMN', 'Spa', 'AMEN', 'Amenity'), D('AMN', 'Tennis Court', 'AMEN', 'Amenity'), D('AMN', 'Sports Court', 'AMEN', 'Amenity'), D('AMN', 'Hot Walker (Horse)', 'AMEN', 'Amenity'),
  D('NCA', 'Non-Calculated Area', 'NCA', 'Not calculated'), D('UND', 'Undefined Area', 'NCA', 'Not calculated'),
];
const DEFAULT_LABELS = ['1 Car','1 Car Garage','1/2','1/2 Bath','2 Car','2 Car Garage','3 Car','3 Car Garage','4 Car','4 Car Garage','Finished Above Grade','Area','Atrium','B-Fast','Balcony','Bath','Bath 1','Bath 2','Bath 3','Bath 4','Bath 5','Bed','Bedroom','Bedroom 1','Bedroom 2','Bedroom 3','Bedroom 4','Bedroom 5','Breakfast','Butler\'s','Carport','Cls','Deck','Den','Dining','Dining Room','Dressing','Elev.','Entrance','Entry','Family','Family Room','Finished','Foyer','Gallery','Garage','Gym','Hallway','Kitchen','Laundry','Library','Living','Living Room','Lndry','Loft','Loggia','Mech.','Mechanical','Media','Mud Room','Office','Pantry','Patio','Pntry','Pool','Pool Bath','Porch','Primary','Primary Bath','Primary Suite','Rec.','Recreation','Recreation Room','Room','Sauna','Shower','Sitting','Spa','Stable','Stairs','Stg','Storage','Stove','Study','Suite','Tack Room','Tennis','Unfin.','Utilities','Wet Bar','Wood','Wood Deck','Media Room','Changing'];
const LEVELS = ['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','B1','B2','B3','B4','B5'];
const LEVEL_NAME = l => l[0] === 'B' ? 'Level B' + l.slice(1) : 'Level ' + l.slice(1);
const LEVEL_UAD = { L1: 'LevelOne', L2: 'LevelTwo', L3: 'LevelThree', L4: 'LevelFour', L5: 'LevelFive', L6: 'LevelSix', L7: 'LevelSeven', L8: 'LevelEight', L9: 'LevelNine', L10: 'LevelTen', B1: 'BelowGradeOne', B2: 'BelowGradeTwo', B3: 'BelowGradeThree', B4: 'BelowGradeFour', B5: 'BelowGradeFive' };
const below = l => l[0] === 'B';

const allDefs = () => [...DEFAULT_DEFS, ...((SK.lib && SK.lib.defs) || [])].filter(d => !((SK.lib && SK.lib.hidden) || []).includes(d.id));
const defOf = id => [...DEFAULT_DEFS, ...((SK.lib && SK.lib.defs) || [])].find(d => d.id === id) || DEFAULT_DEFS[0];
const allLabels = () => [...new Set([...DEFAULT_LABELS, ...((SK.lib && SK.lib.labels) || [])])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

/* ---------- display settings (saved with your labels): text size, dimension size, colors ---------- */
const TS = () => (SK.lib && SK.lib.textScale) || 1, DS = () => (SK.lib && SK.lib.dimScale) || 1;
const FILL = a => (SK.lib && SK.lib.fills === false) ? null : BUCKETS[defOf(a.def).bucket].fill;
/* ---------- symbols: fireplaces, wood stove, stairs, elevator (sizes in feet, resizable) ---------- */
const SYMBOLS = { fireplace: { n: 'Fireplace', w: 5, h: 2 }, cornerfp: { n: 'Corner fireplace', w: 4, h: 4 }, dblfp: { n: 'Double-sided fireplace', w: 5, h: 2.5 },
  woodstove: { n: 'Wood stove', w: 2.5, h: 2.5 }, stairs: { n: 'Stairs', w: 3.5, h: 10 }, stairsL: { n: 'L-shaped stairs', w: 7, h: 7 }, spiral: { n: 'Spiral stairs', w: 5, h: 5 }, elevator: { n: 'Elevator', w: 5, h: 5 },
  door: { n: 'Door', w: 3, h: 3, door: true }, dbldoor: { n: 'Double door', w: 5, h: 2.5, door: true }, slider: { n: 'Sliding door', w: 6, h: 1, door: true }, opening: { n: 'Open doorway', w: 4, h: 1, door: true }, entry: { n: 'Exterior entry', w: 3, h: 3, door: true } };
const DOORISH = t => !!(SYMBOLS[t] && SYMBOLS[t].door);
const WALL_Y = y => (y.type === 'door' || y.type === 'entry' || y.type === 'dbldoor') ? y.h / 2 : 0; // where the wall line sits inside the symbol box
function drawSymbol(g, sym, T, s, hi) { // T: feet -> screen; s: px per foot
  const [cx, cy] = T([sym.x, sym.y]); const w = sym.w * s, h = sym.h * s; g.save(); g.translate(cx, cy); g.rotate(-(sym.rot || 0) * Math.PI / 180);
  g.strokeStyle = hi ? '#ff7a00' : '#000'; g.lineWidth = hi ? 3 : 1.6; g.fillStyle = '#fff'; const R = (x, y, a, b) => { g.fillRect(x, y, a, b); g.strokeRect(x, y, a, b); };
  const trap = (sgn) => { g.beginPath(); g.moveTo(-w * 0.32, sgn * h / 2); g.lineTo(w * 0.32, sgn * h / 2); g.lineTo(w * 0.2, sgn * h * 0.05); g.lineTo(-w * 0.2, sgn * h * 0.05); g.closePath(); g.stroke(); };
  if (sym.type === 'fireplace') { R(-w / 2, -h / 2, w, h); trap(1); }
  else if (sym.type === 'dblfp') { R(-w / 2, -h / 2, w, h); trap(1); trap(-1); }
  else if (sym.type === 'cornerfp') { g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 2); g.lineTo(-w / 2, h / 2); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-w * 0.05, -h * 0.05); g.lineTo(w * 0.28, -h / 2 + h * 0.08); g.moveTo(-w * 0.05, -h * 0.05); g.lineTo(-w / 2 + w * 0.08, h * 0.28); g.stroke(); }
  else if (sym.type === 'woodstove') { R(-w / 2, -h / 2, w, h); g.beginPath(); g.arc(0, -h * 0.22, Math.min(w, h) * 0.16, 0, 7); g.stroke(); g.fillStyle = '#000'; g.font = `700 ${Math.max(8, Math.min(w, h) * 0.3)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WS', 0, h * 0.2); }
  else if (sym.type === 'stairs') { R(-w / 2, -h / 2, w, h); const n = Math.max(2, Math.round(sym.h / 0.9)); g.beginPath(); for (let i = 1; i < n; i++) { const y = -h / 2 + h * i / n; g.moveTo(-w / 2, y); g.lineTo(w / 2, y); } g.stroke();
    g.lineWidth = hi ? 3 : 1.8; g.beginPath(); g.moveTo(0, h / 2 - h * 0.08); g.lineTo(0, -h / 2 + h * 0.1); g.moveTo(-w * 0.18, -h / 2 + h * 0.1 + w * 0.22); g.lineTo(0, -h / 2 + h * 0.1); g.lineTo(w * 0.18, -h / 2 + h * 0.1 + w * 0.22); g.stroke(); }
  else if (sym.type === 'spiral') { const r = Math.min(w, h) / 2; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.15, 0, 7); g.stroke(); g.beginPath(); for (let i = 0; i < 10; i++) { const t = i * Math.PI / 5; g.moveTo(Math.cos(t) * r * 0.15, Math.sin(t) * r * 0.15); g.lineTo(Math.cos(t) * r, Math.sin(t) * r); } g.stroke(); }
  else if (sym.type === 'elevator') { R(-w / 2, -h / 2, w, h); g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, h / 2); g.moveTo(w / 2, -h / 2); g.lineTo(-w / 2, h / 2); g.stroke(); }
  else if (sym.type === 'stairsL') { const r = Math.min(w, h) * 0.42; g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 2); g.lineTo(w / 2, -h / 2 + r); g.lineTo(-w / 2 + r, -h / 2 + r); g.lineTo(-w / 2 + r, h / 2); g.lineTo(-w / 2, h / 2); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); const n1 = Math.max(2, Math.round((w - r) / s / 0.9)); for (let i = 1; i < n1; i++) { const x = -w / 2 + r + (w - r) * i / n1; g.moveTo(x, -h / 2); g.lineTo(x, -h / 2 + r); }
    const n2 = Math.max(2, Math.round((h - r) / s / 0.9)); for (let i = 1; i < n2; i++) { const y = -h / 2 + r + (h - r) * i / n2; g.moveTo(-w / 2, y); g.lineTo(-w / 2 + r, y); } g.moveTo(-w / 2, -h / 2 + r); g.lineTo(-w / 2 + r, -h / 2 + r); g.stroke();
    g.lineWidth = hi ? 3 : 1.8; g.beginPath(); g.moveTo(-w / 2 + r / 2, h / 2 - r * 0.3); g.lineTo(-w / 2 + r / 2, -h / 2 + r / 2); g.lineTo(w / 2 - r * 0.3, -h / 2 + r / 2); g.moveTo(w / 2 - r * 0.3 - r * 0.25, -h / 2 + r / 2 - r * 0.22); g.lineTo(w / 2 - r * 0.3, -h / 2 + r / 2); g.lineTo(w / 2 - r * 0.3 - r * 0.25, -h / 2 + r / 2 + r * 0.22); g.stroke(); }
  else if (DOORISH(sym.type)) { // the opening is cut out of the wall (white), then the door is drawn
    const wy = WALL_Y({ type: sym.type, h }); const wt = Math.max(3, s * 0.45); if (sym.flip) g.scale(-1, 1);
    g.fillStyle = '#fff'; g.fillRect(-w / 2, wy - wt, w, wt * 2); { const f = gapFill(sym); if (f) { g.fillStyle = f; g.fillRect(-w / 2, wy - wt, w, wt * 2); } } g.lineWidth = hi ? 3 : 1.6;
    g.beginPath(); g.moveTo(-w / 2, wy - wt); g.lineTo(-w / 2, wy + wt); g.moveTo(w / 2, wy - wt); g.lineTo(w / 2, wy + wt); g.stroke(); // jambs
    if (sym.type === 'door' || sym.type === 'entry') { g.beginPath(); g.moveTo(-w / 2, wy); g.lineTo(-w / 2, wy - w); g.stroke(); g.save(); g.setLineDash([4, 3]); g.lineWidth = 1; g.beginPath(); g.arc(-w / 2, wy, w, -Math.PI / 2, 0); g.stroke(); g.restore();
      if (sym.type === 'entry') { const L = Math.max(14, w * 0.8); g.lineWidth = hi ? 3 : 2; g.beginPath(); g.moveTo(0, wy + wt + L); g.lineTo(0, wy + wt + 3); g.moveTo(-6, wy + wt + 10); g.lineTo(0, wy + wt + 3); g.lineTo(6, wy + wt + 10); g.stroke(); } }
    else if (sym.type === 'dbldoor') { const lf = w / 2; g.beginPath(); g.moveTo(-w / 2, wy); g.lineTo(-w / 2, wy - lf); g.moveTo(w / 2, wy); g.lineTo(w / 2, wy - lf); g.stroke(); g.save(); g.setLineDash([4, 3]); g.lineWidth = 1; g.beginPath(); g.arc(-w / 2, wy, lf, -Math.PI / 2, 0); g.moveTo(w / 2, wy - lf); g.arc(w / 2, wy, lf, -Math.PI / 2, -Math.PI, true); g.stroke(); g.restore(); }
    else if (sym.type === 'slider') { const o = Math.max(2, wt * 0.45); g.beginPath(); g.moveTo(-w / 2, wy - o); g.lineTo(w * 0.08, wy - o); g.moveTo(-w * 0.08, wy + o); g.lineTo(w / 2, wy + o); g.stroke(); }
  }
  g.restore();
}
function hitSymbol(ft) { const tol = 10 / SK.view.s; return (SK.sk.symbols || []).filter(x => here(x)).find(x => { const t = (x.rot || 0) * Math.PI / 180, dx = ft[0] - x.x, dy = ft[1] - x.y;
  const lx = dx * Math.cos(t) - dy * Math.sin(t), ly = dx * Math.sin(t) + dy * Math.cos(t); return Math.abs(lx) <= x.w / 2 + tol && Math.abs(ly) <= x.h / 2 + tol; }) || null; }

/* ---------- interior walls: thin lines drawn inside the outline; they never change the square footage ---------- */
const IW = () => (SK.sk.iwalls = SK.sk.iwalls || []);
const projOn = (pt, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; let t = L ? ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return [a[0] + t * dx, a[1] + t * dy]; };
const segsHere = () => [...SK.sk.areas.filter(a => here(a)).flatMap(a => walls(a).map(([i, p, q]) => ({ p, q, a }))), ...IW().filter(w => here(w)).map(w => ({ p: w.a, q: w.b, iw: w }))];
function iwSnap(ft, from) { // a corner, then a point on a wall, then the 0.5 ft grid (square to the start when close)
  const tol = 16 / SK.view.s; let best = null;
  [...cornersHere(), ...IW().filter(w => here(w)).flatMap(w => [w.a, w.b])].forEach(p => { const d = Math.hypot(p[0] - ft[0], p[1] - ft[1]); if (d < tol && (!best || d < best.d)) best = { d, p: [...p], how: 'corner' }; });
  if (best) return best;
  segsHere().forEach(({ p, q }) => { let P = projOn(ft, p, q); if (from) { // prefer the point on this wall that keeps the new wall square
      const ux = q[0] - p[0], uy = q[1] - p[1], L = Math.hypot(ux, uy) || 1; [[1, 0], [0, 1]].forEach(([ax, ay]) => { const den = ax * uy - ay * ux; if (Math.abs(den) < 1e-9) return; const tt = ((p[0] - from[0]) * uy - (p[1] - from[1]) * ux) / den; const X = [from[0] + ax * tt, from[1] + ay * tt]; if (Math.hypot(X[0] - ft[0], X[1] - ft[1]) < tol * 1.5 && segDist(X, p, q) < 0.05) P = X; }); }
    const d = Math.hypot(P[0] - ft[0], P[1] - ft[1]); if (d < tol && (!best || d < best.d)) best = { d, p: P, how: 'wall' }; });
  if (best) return { p: [r3(best.p[0]), r3(best.p[1])], how: 'wall' };
  let p = [Math.round(ft[0] * 2) / 2, Math.round(ft[1] * 2) / 2];
  if (from) { const dx = ft[0] - from[0], dy = ft[1] - from[1]; const ang = Math.atan2(dy, dx), a45 = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4); if (Math.abs(ang - a45) < 0.14) { const L2 = Math.round(Math.hypot(dx, dy) * 2) / 2; p = [r3(from[0] + Math.cos(a45) * L2), r3(from[1] + Math.sin(a45) * L2)]; } }
  return { p, how: 'grid' };
}
function hitIWall(ft) { const tol = 12 / SK.view.s; let best = null; IW().filter(w => here(w)).forEach(w => { const d = segDist(ft, w.a, w.b); if (d < tol && (!best || d < best.d)) best = { d, w }; }); return best ? best.w : null; }
function addIWall(a, b) { if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) return false; pushUndo(); IW().push({ id: uid(), a: [r3(a[0]), r3(a[1])], b: [r3(b[0]), r3(b[1])], level: SK.level, pg: SK.pg }); markDirty(); return true; }
function drawIWalls(g, T, s, list, selId) { list.forEach(w => { const [X1, Y1] = T(w.a), [X2, Y2] = T(w.b); g.strokeStyle = w.id === selId ? '#ff7a00' : '#222'; g.lineWidth = w.id === selId ? 4 : Math.max(1.3, Math.min(3, s * 0.12)); g.lineCap = 'round'; g.beginPath(); g.moveTo(X1, Y1); g.lineTo(X2, Y2); g.stroke(); g.lineCap = 'butt'; }); }
/* a door dropped near a wall lines up on it, opening into the room */
function seatDoor(y, pt) {
  let best = null; segsHere().forEach(sg => { const P = projOn(pt, sg.p, sg.q); const d = Math.hypot(P[0] - pt[0], P[1] - pt[1]); if (d < 3 && (!best || d < best.d)) best = { d, P, ...sg }; });
  if (!best) return false;
  const th = Math.atan2(best.q[1] - best.p[1], best.q[0] - best.p[0]); const place = rot => { const ph = -rot * Math.PI / 180, off = WALL_Y(y); y.rot = norm360(rot); y.x = r3(best.P[0] + off * Math.sin(ph)); y.y = r3(best.P[1] - off * Math.cos(ph)); return [Math.sin(ph), -Math.cos(ph)]; };
  const into = place(-th * 180 / Math.PI); // swing side = local −y
  if (best.a && best.a.closed) { const tp = [best.P[0] + into[0] * 1.2, best.P[1] + into[1] * 1.2]; if (!inPoly(tp, shape(best.a))) place(-th * 180 / Math.PI + 180); }
  return true;
}
function gapFill(y) { // the opening takes the colour of the room it opens into
  if (!y || y.x === undefined || typeof FILL !== 'function' || !SK.sk) return null; const ph = -(y.rot || 0) * Math.PI / 180, off = WALL_Y(y); const P = [y.x - off * Math.sin(ph) + Math.sin(ph) * 0.6, y.y + off * Math.cos(ph) - Math.cos(ph) * 0.6];
  const c = SK.sk.areas.filter(a => a.closed && a.level === y.level && PG(a) === PG(y) && a.pts.length > 2 && inPoly(P, shape(a))).sort((a, b) => polyArea(shape(a)) - polyArea(shape(b)))[0]; return c ? FILL(c) : null; }
function flipSwing(y) { const ph = -(y.rot || 0) * Math.PI / 180, off = WALL_Y(y); const P = [y.x - off * Math.sin(ph), y.y + off * Math.cos(ph)]; y.rot = norm360((y.rot || 0) + 180); const ph2 = -y.rot * Math.PI / 180; y.x = r3(P[0] + off * Math.sin(ph2)); y.y = r3(P[1] - off * Math.cos(ph2)); y.flip = !y.flip; }

/* ---------- floor plan underlay: a picture or PDF page to trace over (shown faintly, never printed) ---------- */
const UL = () => (SK.sk.under = SK.sk.under || []);
const ulImgs = new Map();
function ulImage(u) { if (ulImgs.has(u.id)) return ulImgs.get(u.id); const im = new Image(); ulImgs.set(u.id, im); DB.get('sketches', 'under:' + u.id).then(r => { if (r && r.src) { im.onload = () => draw(); im.src = r.src; } }).catch(() => {}); return im; }
function drawUnder() { UL().filter(u => here(u) && !u.hide).forEach(u => { const im = ulImage(u); if (!im.complete || !im.naturalWidth) return; const [X, Y] = toScr([u.x, u.y]); const s = SK.view.s;
  ctx.save(); ctx.globalAlpha = u.op ?? 0.35; ctx.translate(X, Y); ctx.rotate((u.rot || 0) * Math.PI / 180); ctx.drawImage(im, 0, 0, u.iw * u.k * s, u.ih * u.k * s); ctx.restore(); });
  if (SK.mode === 'uscale' && SK.us && SK.us.a) { const [X, Y] = toScr(SK.us.a); ctx.strokeStyle = '#d00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 9, 0, 7); ctx.moveTo(X - 14, Y); ctx.lineTo(X + 14, Y); ctx.moveTo(X, Y - 14); ctx.lineTo(X, Y + 14); ctx.stroke(); } }
const ulHere = () => UL().find(u => here(u)) || null;
async function ulLoad(file) {
  let canvas; toast('Opening the floor plan…');
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const pdfjs = await import('./pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
    let pn = 1; if (doc.numPages > 1) { pn = await new Promise(res => askNumber(`Which page? (1–${doc.numPages})`, 'The page of the PDF with the floor plan for this level.', '1', v => res(Math.max(1, Math.min(doc.numPages, Math.round(v)))))); }
    const pg = await doc.getPage(pn); const vp = pg.getViewport({ scale: 1 }); const v2 = pg.getViewport({ scale: Math.min(3, 2400 / Math.max(vp.width, vp.height)) });
    canvas = document.createElement('canvas'); canvas.width = Math.round(v2.width); canvas.height = Math.round(v2.height); const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); await pg.render({ canvasContext: g, viewport: v2 }).promise;
  } else {
    const url = URL.createObjectURL(file); const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That picture could not be opened')); i.src = url; });
    const sc = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight)); canvas = document.createElement('canvas'); canvas.width = Math.round(im.naturalWidth * sc); canvas.height = Math.round(im.naturalHeight * sc); canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
  }
  const src = canvas.toDataURL('image/jpeg', 0.85); const id = uid(); await DB.put('sketches', { id: 'under:' + id, src });
  UL().filter(u => here(u)).forEach(u => { u.hide = true; });
  const W = cv.clientWidth, H = cv.clientHeight, k = 60 / canvas.width, c = toFt(W / 2, H / 2);
  UL().push({ id, level: SK.level, pg: SK.pg, iw: canvas.width, ih: canvas.height, k, x: r3(c[0] - canvas.width * k / 2), y: r3(c[1] - canvas.height * k / 2), op: 0.35, rot: 0, name: file.name });
  markDirty(); draw(); SK.mode = 'uscale'; SK.us = { a: null }; SK.sel = null; renderPanel(); toast('Now set the scale: tap the two ends of the scale bar or of a wall with a known length');
}
function ulScale(u, a, b, feet) { const m = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!(m > 0.01) || !(feet > 0)) return; const r = feet / m; u.k *= r; u.x = r3(a[0] + (u.x - a[0]) * r); u.y = r3(a[1] + (u.y - a[1]) * r); markDirty(); draw(); }
function openUnderlay() {
  const u = ulHere();
  openSheet(`<h3>Floor plan underlay</h3><p class="help">Put a floor plan picture or a PDF page under this level (${esc(LEVEL_NAME(SK.level))}) and trace over it. It shows faintly on screen only and is never printed or sent to SFREP. Your measured wall lengths always set the square footage.</p>
    <div class="grid-btns col">${(((SK.ins.data.property || {}).order || {}).plans || []).map(pl => `<button class="btn" data-oplan="${esc(pl.key)}">From the order: ${esc(pl.name)}</button>`).join('')}<label class="btn">${u ? 'Replace with another plan…' : 'Choose a floor plan (picture or PDF)…'}<input type="file" id="ulFile" accept="image/*,application/pdf" hidden></label>
    ${u ? `${u.lock ? '<div class="help"><b>Locked</b> – it cannot be moved, turned or re-scaled by accident. Unlock it to change those.</div>' : `<button class="btn" id="ulScale">Set the scale (tap two points)</button><button class="btn" id="ulMove">Move it to line it up</button>`}
    <div class="lrow"><span><b>Strength</b> ${Math.round((u.op ?? 0.35) * 100)}%</span><span><button class="btn sm" data-op="-0.1">Lighter</button> <button class="btn sm" data-op="0.1">Darker</button></span></div>
    ${u.lock ? '' : `<div class="lrow"><span><b>Turn</b></span><span><button class="btn sm" data-ur="-90">↺ 90°</button> <button class="btn sm" data-ur="90">↻ 90°</button></span></div>`}
    <button class="btn" id="ulLock">${u.lock ? '🔓 Unlock it' : '🔒 Lock it in place'}</button><button class="btn" id="ulHide">${u.hide ? 'Show it' : 'Hide it'}</button><button class="btn danger" id="ulDel">Remove it</button>` : ''}</div>
    <div class="row"><button class="btn" data-close>Close</button></div>`, sh => {
      sh.querySelectorAll('[data-oplan]').forEach(b => b.onclick = async () => { closeSheet(); try { const r = await DB.get('sketches', b.dataset.oplan); if (!r || !r.src) throw new Error('it is not on this iPad any more – get the orders file again'); const bl = await (await fetch(r.src)).blob(); await ulLoad(new File([bl], (r.name || 'floor plan') + '.jpg', { type: 'image/jpeg' })); } catch (err) { toast('Could not open that plan: ' + (err.message || err)); } });
      sh.querySelector('#ulFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; closeSheet(); try { await ulLoad(f); } catch (err) { toast('Could not open that plan: ' + (err.message || err)); } };
      if (!u) return;
      sh.querySelector('#ulLock').onclick = () => { u.lock = !u.lock; if (u.lock && (SK.mode === 'umove' || SK.mode === 'uscale')) SK.mode = 'select'; markDirty(); draw(); renderPanel(); openUnderlay(); toast(u.lock ? 'Floor plan locked' : 'Floor plan unlocked'); };
      if (!u.lock) sh.querySelector('#ulScale').onclick = () => { closeSheet(); u.hide = false; SK.mode = 'uscale'; SK.us = { a: null }; SK.sel = null; draw(); renderPanel(); };
      if (!u.lock) sh.querySelector('#ulMove').onclick = () => { closeSheet(); u.hide = false; SK.mode = 'umove'; SK.sel = null; draw(); renderPanel(); };
      sh.querySelectorAll('[data-op]').forEach(b => b.onclick = () => { u.op = Math.max(0.1, Math.min(0.9, Math.round(((u.op ?? 0.35) + +b.dataset.op) * 10) / 10)); markDirty(); draw(); openUnderlay(); });
      sh.querySelectorAll('[data-ur]').forEach(b => b.onclick = () => { const c = [u.x + u.iw * u.k / 2, u.y + u.ih * u.k / 2]; u.rot = norm360((u.rot || 0) + +b.dataset.ur); const t = u.rot * Math.PI / 180, cx = u.iw * u.k / 2, cy = u.ih * u.k / 2; u.x = r3(c[0] - (cx * Math.cos(t) - cy * Math.sin(t))); u.y = r3(c[1] - (cx * Math.sin(t) + cy * Math.cos(t))); markDirty(); draw(); });
      sh.querySelector('#ulHide').onclick = () => { u.hide = !u.hide; markDirty(); draw(); openUnderlay(); };
      sh.querySelector('#ulDel').onclick = () => { SK.sk.under = UL().filter(x => x !== u); DB.del('sketches', 'under:' + u.id).catch(() => {}); ulImgs.delete(u.id); closeSheet(); markDirty(); draw(); toast('Underlay removed'); };
    });
}

/* ---------- sketch pages: the main house on one page, guest house / garage / pool house on others (each prints on its own sheet) ---------- */
const PG = o => (o && o.pg) || 1; const here = o => o.level === SK.level && PG(o) === SK.pg; const sameSpot = (o, a) => o.level === a.level && PG(o) === PG(a);
const pageList = () => (SK.sk.pages && SK.sk.pages.length ? SK.sk.pages : [{ n: 1, name: 'Page 1' }]);
const pageName = n => (pageList().find(x => x.n === n) || {}).name || 'Page ' + n;
/* ---------- geometry ---------- */
const r1 = n => Math.round(n * 10) / 10;
const polyArea = p => { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };
const centroid = p => { let a = 0, cx = 0, cy = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f; } if (Math.abs(a) < 1e-9) { const n = p.length || 1; return [p.reduce((t, q) => t + q[0], 0) / n, p.reduce((t, q) => t + q[1], 0) / n]; } return [cx / (3 * a), cy / (3 * a)]; };
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const L = dx * dx + dy * dy; let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); };
function inPoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; }
const onEdge = (pt, poly) => poly.some((a, i) => segDist(pt, a, poly[(i + 1) % poly.length]) < 0.02);
const insideOrOn = (pt, poly) => inPoly(pt, poly) || onEdge(pt, poly);
const walls = a => { const n = a.pts.length, out = []; for (let i = 0; i < n - 1; i++) out.push([i, a.pts[i], a.pts[i + 1]]); if (a.closed && n > 2) out.push([n - 1, a.pts[n - 1], a.pts[0]]); return out; };
const wallLen = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
/* curved walls: a wall i can carry a bow {h: depth in ft at the middle, side: 'L'|'R'} */
const arcOf = (a, i) => a.arcs && a.arcs[i] && a.arcs[i].h > 0.04 ? a.arcs[i] : null;
function arcGeom(p, q, h, side) {
  const dx = q[0] - p[0], dy = q[1] - p[1], c = Math.hypot(dx, dy); if (c < 1e-6 || !(h > 0)) return null;
  const n = side === 'L' ? [dy / c, -dx / c] : [-dy / c, dx / c];
  const R = (c * c / 4 + h * h) / (2 * h), M = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const C = [M[0] - n[0] * (R - h), M[1] - n[1] * (R - h)], B = [M[0] + n[0] * h, M[1] + n[1] * h];
  const A = v => Math.atan2(v[1] - C[1], v[0] - C[0]); const TWO = Math.PI * 2; const nrm = x => ((x % TWO) + TWO) % TWO;
  const a0 = A(p), s1 = nrm(A(q) - a0), sb = nrm(A(B) - a0); const sweep = sb < s1 ? s1 : -(TWO - s1);
  const N = Math.max(8, Math.min(48, Math.ceil(Math.abs(sweep) * 12)));
  const mids = []; for (let k = 1; k < N; k++) { const t = a0 + sweep * k / N; mids.push([C[0] + R * Math.cos(t), C[1] + R * Math.sin(t)]); }
  return { mids, R, B, len: R * Math.abs(sweep), chord: c, h };
}
function shape(a) { // the outline with curved walls turned into many short pieces
  if (!a.arcs || !Object.keys(a.arcs).length) return a.pts;
  const out = [a.pts[0]]; walls(a).forEach(([i, p, q]) => { const ar = arcOf(a, i); if (ar) { const g = arcGeom(p, q, ar.h, ar.side); if (g) out.push(...g.mids); } if (!(a.closed && i === a.pts.length - 1)) out.push(q); });
  return out;
}
const wallPath = (a, i, p, q) => { const ar = arcOf(a, i); const g = ar && arcGeom(p, q, ar.h, ar.side); return g ? [p, ...g.mids, q] : [p, q]; };
const pathDist = (pt, path) => Math.min(...path.slice(1).map((q, k) => segDist(pt, path[k], q)));
function rotatePts(pts, deg, c) { const t = -deg * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t); return pts.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; return [r3(c[0] + dx * cs - dy * sn), r3(c[1] + dx * sn + dy * cs)]; }); }
const r3 = n => Math.round(n * 1000) / 1000;

/* ---------- area calculations (Apex style): how each area is derived ---------- */
function cleanPts(pts) { // drop repeated corners and corners in the middle of a straight wall
  let p = pts.filter((v, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(v[0] - q[0], v[1] - q[1]) > 0.005; });
  let changed = true; while (changed && p.length > 3) { changed = false; for (let i = 0; i < p.length; i++) { const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
    if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 0.002 * Math.max(1, wallLen(a, c))) { p.splice(i, 1); changed = true; break; } } }
  return p;
}
function arcSegs(a) { // signed circular-segment areas of the curved walls (+ bulges out, − bulges in)
  if (!a.arcs || !a.closed) return [];
  return walls(a).map(([i, p, q]) => { const ar = arcOf(a, i); if (!ar) return null; const g = arcGeom(p, q, ar.h, ar.side); if (!g) return null;
    const th = g.len / g.R; const seg = g.R * g.R / 2 * (th - Math.sin(th)); const sign = inPoly(g.B, a.pts) ? -1 : 1; return { g, area: sign * seg }; }).filter(Boolean);
}
const exactArea = a => polyArea(cleanPts(a.pts)) + arcSegs(a).reduce((t, x) => t + x.area, 0);
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
function slicePieces(pts, th) { // turn by -th, cut into horizontal strips, merge stacked same-width rectangles
  const cs = Math.cos(-th), sn = Math.sin(-th); const R = pts.map(([x, y]) => [Math.round((x * cs - y * sn) * 1000) / 1000, Math.round((x * sn + y * cs) * 1000) / 1000]);
  const ys = [...new Set(R.map(p => p[1]))].sort((u, v) => u - v); const pieces = [];
  for (let k = 0; k < ys.length - 1; k++) { const y0 = ys[k], y1 = ys[k + 1], h = y1 - y0; if (h < 0.005) continue; const ym = (y0 + y1) / 2;
    const xs = []; R.forEach((p, i) => { const q = R[(i + 1) % R.length]; if ((p[1] <= ym) !== (q[1] <= ym)) { const xAt = y => p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]); xs.push({ x0: xAt(y0), x1: xAt(y1), xm: xAt(ym), vert: Math.abs(q[0] - p[0]) < 0.005 }); } });
    xs.sort((u, v) => u.xm - v.xm);
    for (let j = 0; j + 1 < xs.length; j += 2) { const L = xs[j], Rr = xs[j + 1]; pieces.push({ y0, y1, h, top: Rr.x0 - L.x0, bot: Rr.x1 - L.x1, rect: L.vert && Rr.vert, l0: L.x0, r0: Rr.x0, l1: L.x1, r1: Rr.x1 }); } }
  const merged = []; pieces.forEach(pc => { const m = merged.find(x => x.rect && pc.rect && Math.abs(x.l1 - pc.l0) < 0.01 && Math.abs(x.r1 - pc.r0) < 0.01 && Math.abs(x.y1 - pc.y0) < 0.01); if (m) { m.y1 = pc.y1; m.h += pc.h; } else merged.push({ ...pc }); });
  return merged;
}
function calcBreakdown(a) {
  const pts = cleanPts(a.pts); const lines = [];
  if (pts.length >= 3) {
    // try each wall direction as "level" and keep the one that needs the fewest, simplest pieces (square to the grid wins ties)
    const angs = [0]; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; let t = Math.atan2(q[1] - p[1], q[0] - p[0]); t = ((t % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); if (!angs.some(x => Math.abs(x - t) < 0.002)) angs.push(t); });
    let best = null; angs.forEach(t => { const pc = slicePieces(pts, t); const score = pc.length + pc.filter(x => !x.rect).length * 0.5; if (!best || score < best.score - 1e-9) best = { pc, score }; });
    best.pc.forEach(pc => { if (Math.abs(pc.top - pc.bot) < 0.01) lines.push({ t: `${f1(pc.top)} × ${f1(pc.h)}`, a: pc.top * pc.h });
      else if (pc.top < 0.01 || pc.bot < 0.01) lines.push({ t: `½ × ${f1(Math.max(pc.top, pc.bot))} × ${f1(pc.h)}`, a: Math.max(pc.top, pc.bot) * pc.h / 2 });
      else lines.push({ t: `½ × (${f1(pc.top)} + ${f1(pc.bot)}) × ${f1(pc.h)}`, a: (pc.top + pc.bot) * pc.h / 2 }); });
  }
  arcSegs(a).forEach(x => lines.push({ t: `${x.area < 0 ? 'less ' : ''}curve: chord ${f1(x.g.chord)}, depth ${f1(x.g.h)}, radius ${f1(x.g.R)}`, a: x.area }));
  return lines;
}
function calcAll() { // every closed area with its pieces, what is subtracted, gross and net
  const C = computeAreas(); const kids = id => [...C.parent.entries()].filter(([, p]) => p === id).map(([c]) => SK.sk.areas.find(x => x.id === c));
  const order = { LIV: 0, LIVN: 1, UNF: 2, GAR: 3, OUT: 4, OB: 5, ADU: 6, AMEN: 7, NCA: 8 };
  return C.list.slice().sort((a, b) => (LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)) || (order[defOf(a.def).bucket] - order[defOf(b.def).bucket])).map(a => ({
    id: a.id, name: a.name || defOf(a.def).name, code: defOf(a.def).code, level: a.level, bucket: defOf(a.def).bucket,
    lines: calcBreakdown(a).map(l => ({ t: l.t, a: Math.round(l.a * 10) / 10 })), gross: Math.round(C.gross.get(a.id) * 10) / 10,
    less: kids(a.id).map(k => ({ name: k.name || defOf(k.def).name, a: Math.round(C.gross.get(k.id) * 10) / 10 })), net: Math.round(C.net.get(a.id)) }));
}
/* where to print an area's name: the roomiest spot inside it that is not inside an area drawn within it */
function labelPoint(a, C, sc, px) { // sc = pixels per foot where it will be drawn, px = name font size in pixels
  sc = sc || 12; px = px || 16;
  const kids = [...C.parent.entries()].filter(([, pid]) => pid === a.id).map(([cid]) => SK.sk.areas.find(x => x.id === cid)).filter(Boolean);
  const sh = shape(a); const c0 = centroid(sh); const labs = SK.sk.labels.filter(l => sameSpot(l, a) && inPoly([l.x, l.y], sh)); const syms = (SK.sk.symbols || []).filter(y => sameSpot(y, a) && inPoly([y.x, y.y], sh));
  const nm = String(a.name || defOf(a.def).name || ''); const nW = Math.max(nm.length, 10) * px * 0.6; // name or "1,234 sf" line, whichever is wider
  const clear = pt => !labs.some(l => { const lW = String(l.text || '').length * px * 0.58;
    return Math.abs(pt[0] - l.x) * sc < (nW + lW) / 2 + 10 && Math.abs(pt[1] - l.y) * sc < px * 2.6; })
    && !syms.some(y => { const r = Math.max(y.w, y.h) / 2 * sc; return Math.abs(pt[0] - y.x) * sc < nW / 2 + r + 6 && Math.abs(pt[1] - y.y) * sc < px * 1.8 + r; });
  if (!kids.length && inPoly(c0, sh) && clear(c0)) return c0;
  const xs = sh.map(p => p[0]), ys = sh.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const segs = [...walls(a), ...kids.flatMap(walls)];
  const pick = strict => { let best = null, bd = -1;
    for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) { const pt = [x0 + (x1 - x0) * i / 20, y0 + (y1 - y0) * j / 20];
      if (!inPoly(pt, sh) || kids.some(k => inPoly(pt, shape(k))) || (strict && !clear(pt))) continue;
      const d = Math.min(...segs.map(([, p, q]) => segDist(pt, p, q))); if (d > bd) { bd = d; best = pt; } }
    return best; };
  return pick(true) || pick(false) || c0;
}
/* where the area's name goes: automatic inside (a.nameAt unset), 'above' | 'below' | 'left' | 'right' of the building, or dragged {x, y} */
function namePt(a, C, sc, px) { const p = a.nameAt; sc = sc || 12; px = px || 16;
  if (p && typeof p === 'object') return [p.x, p.y];
  if (!p) return labelPoint(a, C, sc, px);
  const sh = shape(a); const xs = sh.map(q => q[0]), ys = sh.map(q => q[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dim = 21 + 12 * DS(); const nW = Math.max(String(a.name || defOf(a.def).name || '').length, 10) * px * 0.6;
  if (p === 'above') return [cx, y0 - (dim + 26) / sc];
  if (p === 'below') return [cx, y1 + (dim + px + 4) / sc];
  if (p === 'left') return [x0 - (dim + nW / 2) / sc, cy];
  if (p === 'right') return [x1 + (dim + nW / 2) / sc, cy];
  return labelPoint(a, C, sc, px);
}
const NAME_PX = () => Math.max(11, Math.min(17, SK.view.s * 0.9)) * TS();
function hitName(ft) { const C = computeAreas(), s = SK.view.s, px = NAME_PX(); const [X, Y] = toScr(ft);
  return SK.sk.areas.filter(a => here(a) && a.closed && a.pts.length > 2).reverse().find(a => { const [nx, ny] = toScr(namePt(a, C, s, px)); const w = Math.max(String(a.name || defOf(a.def).name).length, 8) * px * 0.6;
    return Math.abs(X - nx) < w / 2 + 6 && Y > ny - px - 10 && Y < ny + 20; }) || null; }
/* ---------- areas: net of areas drawn inside them ---------- */
function computeAreas() {
  const A = SK.sk.areas.filter(a => a.closed && a.pts.length > 2);
  const SH = new Map(A.map(a => [a.id, shape(a)])); const gross = new Map(A.map(a => [a.id, exactArea(a)]));
  const parent = new Map();
  A.forEach(c => {
    let best = null;
    A.forEach(p => { if (p === c || !sameSpot(p, c)) return; if (gross.get(p.id) <= gross.get(c.id)) return;
      if (SH.get(c.id).every(v => insideOrOn(v, SH.get(p.id))) && inPoly(centroid(SH.get(c.id)), SH.get(p.id))) { if (!best || gross.get(p.id) < gross.get(best.id)) best = p; } });
    if (best) parent.set(c.id, best.id);
  });
  const net = new Map(gross);
  parent.forEach((pid, cid) => net.set(pid, net.get(pid) - gross.get(cid)));
  return { gross, net, parent, list: A };
}
function totals() {
  const { net, list } = computeAreas(); const T = { levels: {}, agFin: 0, agNon: 0, agUnf: 0, bgFin: 0, bgNon: 0, bgUnf: 0, gar: [], out: [], ob: [], adu: [], amen: [] };
  list.forEach(a => { const d = defOf(a.def), sf = net.get(a.id), nm = a.name || d.name, lv = a.level;
    const L = T.levels[lv] = T.levels[lv] || { fin: 0, non: 0, unf: 0 };
    if (d.bucket === 'LIV') { L.fin += sf; below(lv) ? T.bgFin += sf : T.agFin += sf; }
    else if (d.bucket === 'LIVN') { L.non += sf; below(lv) ? T.bgNon += sf : T.agNon += sf; }
    else if (d.bucket === 'UNF') { L.unf += sf; below(lv) ? T.bgUnf += sf : T.agUnf += sf; }
    else if (d.bucket === 'GAR') T.gar.push({ name: nm, sf, id: a.id });
    else if (d.bucket === 'OUT') T.out.push({ name: nm, sf, id: a.id });
    else if (d.bucket === 'OB') T.ob.push({ name: nm, sf, id: a.id, level: lv });
    else if (d.bucket === 'ADU') T.adu.push({ name: nm, sf, id: a.id, level: lv });
    else if (d.bucket === 'AMEN') T.amen.push({ name: nm, sf, id: a.id }); });
  const R = n => Math.round(n);
  ['agFin', 'agNon', 'agUnf', 'bgFin', 'bgNon', 'bgUnf'].forEach(k => T[k] = R(T[k]));
  Object.values(T.levels).forEach(L => { L.fin = R(L.fin); L.non = R(L.non); L.unf = R(L.unf); });
  ['gar', 'out', 'ob', 'adu', 'amen'].forEach(k => T[k].forEach(x => x.sf = R(x.sf)));
  return T;
}

/* ---------- storage ---------- */
let saveTimer = null;
function markDirty() { SK.dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveSketch, 500); renderInfo(); setSendBtn(false); }
/* The "Save to inspection" button: grey until you press it, green once the totals and image are in the inspection,
   grey again as soon as the sketch changes. */
function setSendBtn(sent, busy) { SK.sentClean = sent; const b = document.getElementById('skSend'); if (!b) return; b.classList.toggle('sent', !!sent); b.disabled = !!busy; b.textContent = busy ? 'Saving…' : sent ? 'Saved to inspection ✓' : 'Save to inspection'; }
async function sendNow() { setSendBtn(false, true); try { await pushToInspection(true); setSendBtn(true); toast('Sketch image and totals saved to the inspection'); } catch (e) { setSendBtn(false); toast('Could not save to the inspection – try again'); } }
async function saveSketch() {
  clearTimeout(saveTimer); if (!SK.sk || SK.leaving) return;
  SK.sk.updated = Date.now(); SK.sk.view = SK.view; SK.sk.level = SK.level; SK.sk.pg = SK.pg;
  try { await DB.put('sketches', JSON.parse(JSON.stringify(SK.sk))); SK.dirty = false; setSaved(true); } catch (e) { setSaved(false); return; }
  try { await pushTotals(); } catch (e) {}
}
async function pushTotals() { // keep the inspection's area totals current after every change
  const ins = await DB.get('inspections', SK.ins.id); if (!ins) return;
  const linked = syncRooms(ins);
  ins.sketch = Object.assign({}, ins.sketch || {}, { updated: Date.now(), totals: totals(), calcs: calcAll().map(x => ({ ...x, levelName: LEVEL_NAME(x.level) })), areaCount: SK.sk.areas.filter(a => a.closed).length, labelIds: SK.sk.labels.map(l => l.id) });
  ins.updated = Date.now(); await DB.put('inspections', ins); SK.ins = ins;
  if (linked) { await DB.put('sketches', JSON.parse(JSON.stringify(SK.sk))); draw(); renderPanel(); }
}
function snapshotVersion(why) {
  const v = SK.sk.versions = SK.sk.versions || [];
  const last = v[v.length - 1]; const now = Date.now();
  if (last && now - last.ts < 60000 && why === 'auto') return;
  v.push({ ts: now, why, areas: JSON.parse(JSON.stringify(SK.sk.areas)), labels: JSON.parse(JSON.stringify(SK.sk.labels)), symbols: JSON.parse(JSON.stringify(SK.sk.symbols || [])), iwalls: JSON.parse(JSON.stringify(SK.sk.iwalls || [])) });
  if (v.length > 25) v.splice(0, v.length - 25);
}
async function saveLib() { try { await DB.put('sketches', SK.lib); } catch (e) {} }
// write the totals (and optionally the sketch image) into the inspection record
async function pushToInspection(withImage) {
  await saveSketch();
  const ins = await DB.get('inspections', SK.ins.id); if (!ins) return;
  const T = totals(); syncRooms(ins);
  ins.sketch = Object.assign({}, ins.sketch || {}, { labelIds: SK.sk.labels.map(l => l.id), updated: Date.now(), totals: T, areaCount: SK.sk.areas.filter(a => a.closed).length });
  if (withImage) {
    const pages = await sketchPages(); if (pages.length) {
      const old = (ins.photos || []).filter(p => p.sec === 'interior' && p.field === 'sketchImg');
      for (const p of old) await DB.del('photos', p.id);
      ins.photos = (ins.photos || []).filter(p => !(p.sec === 'interior' && p.field === 'sketchImg'));
      for (let i = 0; i < pages.length; i++) { const pg = pages[i]; const thumb = await blobThumb(pg.blob); const id = uid(); await DB.put('photos', { id, insId: ins.id, blob: pg.blob, thumb });
        ins.photos.push({ id, sec: 'interior', field: 'sketchImg', list: null, item: null, slot: null, extra: false, label: pages.length > 1 ? `Sketch page ${i + 1} of ${pages.length}` : 'Sketch', cat: 'SubjectPropertyImprovementSketch', roomType: null, required: false, ts: Date.now() + i, w: pg.w, h: pg.h, autoLabel: true }); }
      ins.sketch.imageAt = Date.now(); ins.sketch.pages = pages.length;
    }
  }
  ins.updated = Date.now();
  await DB.put('inspections', ins); SK.ins = ins;
}
function setSaved(ok) { const s = document.getElementById('skSaved'); if (s) { s.textContent = !DB.persistent ? 'NOT SAVED – storage closed' : ok ? 'Saved ✓ ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not saved!'; s.classList.toggle('bad', !ok || !DB.persistent); } }

/* ---------- undo ---------- */
function pushUndo() { SK.undo.push(JSON.stringify({ a: SK.sk.areas, l: SK.sk.labels, y: SK.sk.symbols || [], p: SK.sk.pages || null, w: SK.sk.iwalls || [] })); if (SK.undo.length > 60) SK.undo.shift(); SK.redo = []; }
function doUndo() { if (!SK.undo.length) return toast('Nothing to undo'); SK.redo.push(JSON.stringify({ a: SK.sk.areas, l: SK.sk.labels, y: SK.sk.symbols || [], p: SK.sk.pages || null, w: SK.sk.iwalls || [] })); const s = JSON.parse(SK.undo.pop()); SK.sk.areas = s.a; SK.sk.labels = s.l; SK.sk.symbols = s.y || []; SK.sk.pages = s.p || undefined; SK.sk.iwalls = s.w || []; if (!pageList().some(x => x.n === SK.pg)) SK.pg = 1; renderLevels(); if (SK.drawId && !SK.sk.areas.find(a => a.id === SK.drawId)) { SK.drawId = null; SK.mode = 'select'; } SK.sel = null; markDirty(); draw(); renderPanel(); }
function doRedo() { if (!SK.redo.length) return toast('Nothing to redo'); SK.undo.push(JSON.stringify({ a: SK.sk.areas, l: SK.sk.labels, y: SK.sk.symbols || [], p: SK.sk.pages || null, w: SK.sk.iwalls || [] })); const s = JSON.parse(SK.redo.pop()); SK.sk.areas = s.a; SK.sk.labels = s.l; SK.sk.symbols = s.y || []; SK.sk.pages = s.p || undefined; SK.sk.iwalls = s.w || []; if (!pageList().some(x => x.n === SK.pg)) SK.pg = 1; renderLevels(); SK.sel = null; markDirty(); draw(); renderPanel(); }

/* ---------- view transforms ---------- */
let cv, ctx, dpr = 1;
const toScr = ([x, y]) => [x * SK.view.s + SK.view.ox, y * SK.view.s + SK.view.oy];
const toFt = (px, py) => [(px - SK.view.ox) / SK.view.s, (py - SK.view.oy) / SK.view.s];
function fitView() {
  const pts = SK.sk.areas.filter(a => here(a)).flatMap(a => a.pts);
  const { W, H } = viewBox();
  if (!pts.length) { SK.view = { s: 14, ox: W / 2, oy: H / 2 }; return; }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const w = Math.max(10, Math.max(...xs) - Math.min(...xs)), h = Math.max(10, Math.max(...ys) - Math.min(...ys));
  const s = Math.max(2, Math.min(60, Math.min((W - 120) / w, (H - 120) / h)));
  SK.view = { s, ox: W / 2 - (Math.min(...xs) + w / 2) * s, oy: H / 2 - (Math.min(...ys) + h / 2) * s };
}

/* ---------- drawing ---------- */
function draw() {
  if (!ctx) return; const W = cv.clientWidth, H = cv.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  // grid: 1 ft minor (when zoomed in), 5 / 10 ft major
  const s = SK.view.s; const step = s >= 8 ? 1 : s >= 3 ? 5 : 10;
  const [fx0, fy0] = toFt(0, 0), [fx1, fy1] = toFt(W, H);
  for (let x = Math.floor(fx0 / step) * step; x <= fx1; x += step) { const X = toScr([x, 0])[0]; ctx.strokeStyle = x % 10 === 0 ? '#cfd6de' : x % 5 === 0 ? '#e1e6eb' : '#f0f2f4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke(); }
  for (let y = Math.floor(fy0 / step) * step; y <= fy1; y += step) { const Y = toScr([0, y])[1]; ctx.strokeStyle = y % 10 === 0 ? '#cfd6de' : y % 5 === 0 ? '#e1e6eb' : '#f0f2f4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke(); }
  drawUnder();
  const C = computeAreas();
  // other levels as faint outlines for lining up floors
  SK.sk.areas.filter(a => PG(a) === SK.pg && a.level !== SK.level && a.pts.length > 1).forEach(a => { ctx.strokeStyle = 'rgba(70,80,120,.55)'; ctx.lineWidth = 1.6; pathOf(a); ctx.stroke();
    if (a.closed && a.pts.length > 2) { const sh = shape(a); const [X, Y] = toScr([Math.min(...sh.map(q => q[0])), Math.min(...sh.map(q => q[1]))]); ctx.fillStyle = 'rgba(70,80,120,.75)'; ctx.font = `700 ${11 * TS()}px system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.fillText(LEVEL_NAME(a.level), X + 5, Y + 14 * TS()); } });
  const mine = SK.sk.areas.filter(a => here(a));
  // fills (largest first so inner areas show on top)
  [...mine].filter(a => a.closed).sort((a, b) => polyArea(shape(b)) - polyArea(shape(a))).forEach(a => { const f = FILL(a); if (!f) return; ctx.fillStyle = f; pathOf(a); ctx.fill(); });
  mine.forEach(a => {
    const selA = SK.sel && SK.sel.type === 'area' && SK.sel.id === a.id, drawing = SK.drawId === a.id;
    ctx.strokeStyle = selA ? '#ff7a00' : '#111'; ctx.lineWidth = selA ? 4 : drawing ? 3 : 2.2; pathOf(a); ctx.stroke();
    walls(a).forEach(([i, p, q]) => { const selW = SK.sel && SK.sel.type === 'wall' && SK.sel.id === a.id && SK.sel.i === i;
      if (selW) { ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = 6; ctx.beginPath(); wallPath(a, i, p, q).forEach((v, k) => k ? ctx.lineTo(...toScr(v)) : ctx.moveTo(...toScr(v))); ctx.stroke(); }
      dimText(a, p, q, selW, i); });
    if (a.closed && a.pts.length > 2) { const [cx, cy] = toScr(namePt(a, C, s, NAME_PX())); const d = defOf(a.def); const sf = Math.round(C.net.get(a.id) || 0);
      const npx = Math.max(11, Math.min(17, s * 0.9)) * TS();
      if (selA) { ctx.font = `700 ${npx}px system-ui,sans-serif`; const w = Math.max(ctx.measureText(a.name || d.name).width, 60) + 16; ctx.fillStyle = SK.grabbed === a.id ? 'rgba(255,122,0,.45)' : 'rgba(255,190,120,.45)'; ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = SK.grabbed === a.id ? 2.5 : 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - w / 2, cy - 4 - npx - 4, w, npx + 30, 6) : ctx.rect(cx - w / 2, cy - 4 - npx - 4, w, npx + 30); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.font = `700 ${npx}px system-ui,sans-serif`; ctx.fillText(a.name || d.name, cx, cy - 4);
      ctx.font = `${Math.max(10, Math.min(15, s * 0.8)) * TS()}px system-ui,sans-serif`; ctx.fillText(sf.toLocaleString() + ' sf' + (C.net.get(a.id) !== C.gross.get(a.id) ? ' net' : ''), cx, cy + 14); }
    if (drawing) { a.pts.forEach((p, i) => { const [X, Y] = toScr(p); ctx.fillStyle = i === 0 ? '#0fa84a' : '#111'; ctx.beginPath(); ctx.arc(X, Y, i === 0 ? 7 : 4, 0, 7); ctx.fill(); });
      const last = a.pts[a.pts.length - 1]; if (last) { const [X, Y] = toScr(last); ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 11, 0, 7); ctx.stroke(); } }
  });
  if (SK.dial && curArea() && curArea().pts.length) { const last = curArea().pts[curArea().pts.length - 1]; const L = parseFloat(SK.entry) || 6; const t = SK.dial.ang * Math.PI / 180;
    const [X1, Y1] = toScr(last), [X2, Y2] = toScr([last[0] + Math.cos(t) * L, last[1] - Math.sin(t) * L]); ctx.setLineDash([10, 6]); ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#c75b00'; ctx.font = '700 14px system-ui'; ctx.textAlign = 'left'; ctx.fillText((parseFloat(SK.entry) ? L.toFixed(1) + "' @ " : '') + SK.dial.ang.toFixed(1) + '°', X2 + 8, Y2 - 8); }
  SK._dots = SK.mode === 'draw' || SK.mode === 'iwall' ? alignDots() : []; if (!SK.dragPrev) SK._dotsDrag = SK._dots;
  SK._dots.forEach(d => { const [X, Y] = toScr(d.pt); const [FX, FY] = toScr(d.from);
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(30,110,220,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(FX, FY); ctx.lineTo(X, Y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = d.closes ? '#0fa84a' : '#1e6edc'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 8, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; const t = r1(d.L).toFixed(1) + "'"; const w = ctx.measureText(t).width; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(X - w / 2 - 2, Y - 25, w + 4, 15); ctx.fillStyle = d.closes ? '#0a7a35' : '#1e4fa0'; ctx.fillText(t, X, Y - 13); });
  if (SK.dragPrev && SK.dragPrev.guide) { const [GX, GY] = toScr(SK.dragPrev.guide), [EX, EY] = toScr(SK.dragPrev.pt); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#1e6edc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(GX, GY); ctx.lineTo(EX, EY); ctx.stroke(); ctx.setLineDash([]); }
  if (SK.dragPrev) { const d = SK.dragPrev; const [X1, Y1] = toScr(d.from), [X2, Y2] = toScr(d.pt); ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke();
    const L = wallLen(d.from, d.pt); ctx.font = '700 20px system-ui'; ctx.textAlign = 'left'; const t = `${r1(L).toFixed(1)}'${d.snap === 'corner' ? ' → corner' : d.snap === 'dot' ? ' · on dot' : d.snap === 'align' ? ' · lined up' : d.snap === '45' ? ' · ' + Math.round(d.ang) + '°' : ''}`; const w = ctx.measureText(t).width;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(X2 + 12, Y2 - 34, w + 12, 28); ctx.fillStyle = '#c75b00'; ctx.fillText(t, X2 + 18, Y2 - 13); }
  if (SK.cursor) { const [X, Y] = toScr(SK.cursor); ctx.strokeStyle = '#d00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X - 16, Y); ctx.lineTo(X + 16, Y); ctx.moveTo(X, Y - 16); ctx.lineTo(X, Y + 16); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, 8, 0, 7); ctx.stroke(); }
  drawIWalls(ctx, toScr, s, IW().filter(w => here(w)), SK.sel && SK.sel.type === 'iwall' ? SK.sel.id : null);
  if (SK.sel && SK.sel.type === 'iwall') { const w = IW().find(x => x.id === SK.sel.id); if (w) { const [X1, Y1] = toScr(w.a), [X2, Y2] = toScr(w.b); ctx.font = '700 14px system-ui'; ctx.fillStyle = '#c75b00'; ctx.textAlign = 'center'; ctx.fillText(r1(wallLen(w.a, w.b)).toFixed(1) + "'", (X1 + X2) / 2, (Y1 + Y2) / 2 - 8); } }
  if (SK.mode === 'iwall' && SK.iw && SK.iw.start) { const [X, Y] = toScr(SK.iw.start); ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.arc(X, Y, 7, 0, 7); ctx.fill(); }
  (SK.sk.symbols || []).filter(x => here(x)).forEach(x => drawSymbol(ctx, x, toScr, SK.view.s, SK.sel && SK.sel.type === 'symbol' && SK.sel.id === x.id));
  // labels
  SK.sk.labels.filter(l => here(l)).forEach(l => { const [X, Y] = toScr([l.x, l.y]); const sel = SK.sel && SK.sel.type === 'label' && SK.sel.id === l.id;
    ctx.font = `600 ${Math.max(11, Math.min(16, s * 0.85)) * TS()}px system-ui,sans-serif`; ctx.textAlign = 'center'; const w = ctx.measureText(l.text).width;
    if (sel) { ctx.fillStyle = 'rgba(255,122,0,.18)'; ctx.fillRect(X - w / 2 - 6, Y - 14, w + 12, 22); }
    ctx.fillStyle = l.room ? (l.room.gone ? '#999' : '#1a3a8a') : '#555'; if (!l.room) ctx.font = `italic 500 ${Math.max(11, Math.min(15, s * 0.8)) * TS()}px system-ui,sans-serif`; ctx.fillText(l.text + (l.room && l.room.gone ? ' (removed)' : ''), X, Y + 2); });
  // north arrow + scale
  ctx.fillStyle = '#111'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`Grid ${step} ft · ${LEVEL_NAME(SK.level)}`, 12, H - 12);
}
function pathOf(a) { ctx.beginPath(); shape(a).forEach((p, i) => { const [X, Y] = toScr(p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); if (a.closed) ctx.closePath(); }
/* a wall length printed outside an area should not land inside a neighbouring building (two buildings a foot apart) */
function inNeighbour(a, pt) { const c = centroid(shape(a)); return SK.sk.areas.some(b => b !== a && b.closed && sameSpot(b, a) && b.pts.length > 2 && !inPoly(c, shape(b)) && inPoly(pt, shape(b))); }
function dimText(a, p, q, hi, i) {
  const L = wallLen(p, q); if (L < 0.05) return; const [X1, Y1] = toScr(p), [X2, Y2] = toScr(q); const px = Math.hypot(X2 - X1, Y2 - Y1); if (px < 28 && !hi) return;
  const ar = i !== undefined && arcOf(a, i), g = ar && arcGeom(p, q, ar.h, ar.side);
  if (g) { const [bx, by] = toScr(g.B); ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${hi ? 700 : 500} ${(hi ? 15 : 12) * DS()}px system-ui,sans-serif`; ctx.fillStyle = hi ? '#c75b00' : '#333'; const t = '⌒ ' + r1(g.len).toFixed(1) + "'"; const w = ctx.measureText(t).width; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bx - w / 2 - 3, by - 9, w + 6, 18); ctx.fillStyle = hi ? '#c75b00' : '#333'; ctx.fillText(t, bx, by); ctx.restore(); return; }
  let nx = -(Y2 - Y1) / px, ny = (X2 - X1) / px; // left normal; push the text outside the area
  const mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2;
  if (a.closed && a.pts.length > 2) { const tp = toFt(mx + nx * 6, my + ny * 6); if (inPoly(tp, shape(a))) { nx = -nx; ny = -ny; } if ([10, 18, 26].some(k => inNeighbour(a, toFt(mx + nx * k, my + ny * k)))) { nx = -nx; ny = -ny; } }
  let ang = Math.atan2(Y2 - Y1, X2 - X1); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
  const calc = a.calc && a.calc[i], ins = a.inside && a.inside[i];
  ctx.font = `${hi ? 700 : 500} ${(hi ? 15 : 12) * DS()}px system-ui,sans-serif`; const tw = ctx.measureText((calc ? '≈ ' : '') + r1(L).toFixed(1) + "'" + (calc ? ' calc' : '') + (ins ? ' (in)' : '')).width;
  const off = 7 + Math.abs(nx) * tw / 2 + Math.abs(ny) * 7 * DS();   // text level (side to side), pushed clear of the wall
  ctx.save(); ctx.translate(mx + nx * off, my + ny * off); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = hi ? '#c75b00' : calc ? '#1e5bd8' : '#333'; ctx.fillText((calc ? '≈ ' : '') + r1(L).toFixed(1) + "'" + (calc ? ' calc' : '') + (ins ? ' (in)' : ''), 0, 0); ctx.restore();
  if (calc) { ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#1e5bd8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke(); ctx.restore(); }
}

/* ---------- hit testing ---------- */
function hitWall(ft) { const tol = 16 / SK.view.s; let best = null;
  SK.sk.areas.filter(a => here(a)).forEach(a => walls(a).forEach(([i, p, q]) => { const d = pathDist(ft, wallPath(a, i, p, q)); if (d < tol && (!best || d < best.d)) best = { d, id: a.id, i }; })); return best; }
function hitArea(ft) { const cand = SK.sk.areas.filter(a => here(a) && a.closed && a.pts.length > 2 && inPoly(ft, shape(a))); cand.sort((a, b) => polyArea(shape(a)) - polyArea(shape(b))); return cand[0] || null; }
function hitLabel(ft) { const tol = 22 / SK.view.s; return SK.sk.labels.find(l => here(l) && Math.abs(l.x - ft[0]) < tol * 2 && Math.abs(l.y - ft[1]) < tol) || null; }
function snapPoint(ft) { // existing corners first, then the 0.5 ft grid
  const tol = 18 / SK.view.s; let best = null;
  SK.sk.areas.filter(a => here(a)).forEach(a => a.pts.forEach(p => { const d = Math.hypot(p[0] - ft[0], p[1] - ft[1]); if (d < tol && (!best || d < best.d)) best = { d, p }; }));
  if (best) return [...best.p];
  return [Math.round(ft[0] * 2) / 2, Math.round(ft[1] * 2) / 2];
}

/* ---------- corners, cursor and centring ---------- */
const cornersHere = () => SK.sk.areas.filter(a => here(a)).flatMap(a => a.pts);
function nearCorner(ft, px) { const tol = px / SK.view.s; let best = null; cornersHere().forEach(p => { const d = Math.hypot(p[0] - ft[0], p[1] - ft[1]); if (d < tol && (!best || d < best.d)) best = { d, p }; }); return best && best.p; }
function jumpCorner() { // nearest corner to the cursor; press again for the next nearest
  if (!SK.cursor) return toast('Tap the sketch to drop the cursor first');
  const from = SK.cursorOrig || SK.cursor; const list = [...new Map(cornersHere().map(p => [p[0] + ',' + p[1], p])).values()].sort((a, b) => Math.hypot(a[0] - from[0], a[1] - from[1]) - Math.hypot(b[0] - from[0], b[1] - from[1]));
  if (!list.length) return toast('No corners on this level yet');
  SK.cursorOrig = from; SK.jumpIdx = SK.cursorJumped ? (SK.jumpIdx + 1) % Math.min(list.length, 6) : 0; SK.cursorJumped = true;
  SK.cursor = [...list[SK.jumpIdx]]; ensureVisible(SK.cursor); draw(); renderPanel();
}
function setCursor(ft) { SK.cursor = [Math.round(ft[0] * 10) / 10, Math.round(ft[1] * 10) / 10]; SK.cursorOrig = null; SK.cursorJumped = false; SK.jumpIdx = 0; }
function ensureVisible(pt) { const [X, Y] = toScr(pt); const { W, H } = viewBox(); if (X < 40 || Y < 40 || X > W - 40 || Y > H - 40) centreOn(pt); }
function centreOn(pt) { const { W, H } = viewBox(); SK.view = { ...SK.view, ox: W / 2 - pt[0] * SK.view.s, oy: H / 2 - pt[1] * SK.view.s }; saveViewSoon(); draw(); }
function viewBox() { const r = cv.parentElement.getBoundingClientRect(); const P = document.getElementById('skPanel'); const ph = P ? P.getBoundingClientRect().height : 0; return { W: r.width || cv.clientWidth, H: Math.max(120, (r.height || cv.clientHeight) - ph) }; }
function centreNow() {   // her ask (Oct 22): center what you are drawing, else all your areas on this level, in the visible drawing space
  sizeCanvas(); const { W, H } = viewBox(); const top = 56;   // keep clear of the totals box
  const fit = (pts, zoomOutOnly) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0); const fitS = Math.max(2, Math.min(60, Math.min((W - 80) / w, (H - top - 60) / h)));
    const s = zoomOutOnly ? Math.min(SK.view.s, fitS) : fitS; SK.view = { s, ox: W / 2 - (x0 + w / 2) * s, oy: top + (H - top) / 2 - (y0 + h / 2) * s }; saveViewSoon(); draw(); };
  const a = curArea(); if (a && a.pts.length) return fit(a.pts.length > 1 ? shape(a) : a.pts, true);
  if (SK.sel && (SK.sel.type === 'area' || SK.sel.type === 'wall')) { const ar = SK.sk.areas.find(x => x.id === SK.sel.id); if (ar) return fit(shape(ar), true); }
  if (SK.mode === 'iwall') { const w = [...IW().filter(here).flatMap(x => [x.a, x.b]), ...(SK.iw && SK.iw.start ? [SK.iw.start] : [])]; if (w.length) return fit(w, true); }
  const all = [...SK.sk.areas.filter(x => here(x) && x.pts.length).flatMap(x => x.pts.length > 1 ? shape(x) : x.pts), ...IW().filter(here).flatMap(x => [x.a, x.b]), ...SK.sk.labels.filter(here).map(l => [l.x, l.y]), ...(SK.sk.symbols || []).filter(here).map(y => [y.x, y.y])];
  if (all.length) return fit(all, false);
  if (SK.cursor) return centreOn(SK.cursor);
  fitView(); draw();
}
/* alignment dots: from the pen point, the places (right / left / up / down) where the next wall lines up with another corner */
function alignDots() {   // also for interior walls (her ask, Oct 22: the dots should always be there)
  if (SK.showDots === false) return [];
  const iw = SK.mode === 'iwall' && SK.iw && SK.iw.start; const a = iw ? null : curArea(); if (!iw && (!a || !a.pts.length)) return [];
  const pen = iw ? SK.iw.start : a.pts[a.pts.length - 1], start = iw ? [1e9, 1e9] : a.pts[0];
  const src = [...SK.sk.areas.filter(x => here(x)).flatMap(x => x.pts), ...SK.sk.areas.filter(x => PG(x) === SK.pg && x.level !== SK.level).flatMap(x => x.pts), ...IW().filter(w => here(w)).flatMap(w => [w.a, w.b])]; // other floors help stack levels
  const key = v => Math.round(v * 20) / 20;
  const xs = new Map(), ys = new Map(); src.forEach(p => { if (!xs.has(key(p[0]))) xs.set(key(p[0]), p); if (!ys.has(key(p[1]))) ys.set(key(p[1]), p); });
  const out = []; const W = cv.clientWidth, H = cv.clientHeight; const vis = pt => { const [X, Y] = toScr(pt); return X > -10 && Y > -10 && X < W + 10 && Y < H + 10; };
  [[1, 0], [-1, 0]].forEach(([d]) => { [...xs.entries()].map(([x, from]) => ({ pt: [x, pen[1]], L: (x - pen[0]) * d, from })).filter(o => o.L > 0.05).sort((p, q) => p.L - q.L).slice(0, 8).forEach(o => vis(o.pt) && out.push(o)); });
  [[0, 1], [0, -1]].forEach(([, d]) => { [...ys.entries()].map(([y, from]) => ({ pt: [pen[0], y], L: (y - pen[1]) * d, from })).filter(o => o.L > 0.05).sort((p, q) => p.L - q.L).slice(0, 8).forEach(o => vis(o.pt) && out.push(o)); });
  // the green start point is always a target when it lines up, so the last wall closes the area
  const prev = iw ? (SK.iw.prev || null) : a.pts.length > 1 ? a.pts[a.pts.length - 2] : null; const back = prev ? [(prev[0] - pen[0]) / (wallLen(prev, pen) || 1), (prev[1] - pen[1]) / (wallLen(prev, pen) || 1)] : null;
  const fwd = o => { if (!back) return true; const d = [(o.pt[0] - pen[0]) / o.L, (o.pt[1] - pen[1]) / o.L]; return d[0] * back[0] + d[1] * back[1] < 0.99; }; // no dots back along the wall just drawn
  return out.filter(fwd).map(o => ({ ...o, closes: !iw && Math.hypot(o.pt[0] - start[0], o.pt[1] - start[1]) < 0.06 && a.pts.length >= 3 }));
}
function hitDot(px, py) { return (SK._dots || []).find(d => { const [X, Y] = toScr(d.pt); return Math.hypot(X - px, Y - py) < 22; }) || null; }
function dragEnd(from, ft) { // where a dragged wall ends: line-up dots, corners, then 45° directions, lengths to 0.1 ft
  const [fx, fy] = toScr(ft); const dot = (SK._dotsDrag || []).find(d => { const [X, Y] = toScr(d.pt); return Math.hypot(X - fx, Y - fy) < 24; });
  if (dot) return { pt: [...dot.pt], L: dot.L, snap: 'dot', guide: dot.from };
  const c = nearCorner(ft, 16); if (c && (c[0] !== from[0] || c[1] !== from[1])) return { pt: [...c], snap: 'corner' };
  const dx = ft[0] - from[0], dy = ft[1] - from[1]; let L = Math.round(Math.hypot(dx, dy) * 10) / 10; let ang = Math.atan2(-dy, dx) * 180 / Math.PI;
  const m = Math.round(ang / 45) * 45; let snap = ''; if (Math.abs(ang - m) < 4) { ang = m; snap = '45'; }
  const t = ang * Math.PI / 180; let pt = [from[0] + Math.cos(t) * L, from[1] - Math.sin(t) * L], guide = null;
  if (snap === '45' && norm360(ang) % 90 === 0) { const horiz = norm360(ang) % 180 === 0; const tol = 12 / SK.view.s; let best = null;
    SK.sk.areas.filter(x => here(x)).flatMap(x => x.pts).forEach(p => { const d = horiz ? Math.abs(p[0] - pt[0]) : Math.abs(p[1] - pt[1]); if (d < tol && (!best || d < best.d)) best = { d, p }; });
    if (best) { pt = horiz ? [best.p[0], from[1]] : [from[0], best.p[1]]; L = Math.round(wallLen(from, pt) * 100) / 100; guide = best.p; snap = 'align'; } }
  return { pt, L, ang: norm360(ang), snap, guide };
}

/* ---------- actions ---------- */
const curArea = () => SK.sk.areas.find(a => a.id === SK.drawId);
function startArea(defId) { SK.mode = 'start'; SK.pendingDef = defId; SK.sel = null; SK.cursor = null; renderPanel(); draw(); }
function placeStart(ft, exact) { pushUndo(); const p = exact ? [r3(ft[0]), r3(ft[1])] : snapPoint(ft); SK.lastDef = SK.pendingDef; SK.cursor = null; const a = { id: uid(), def: SK.pendingDef, level: SK.level, pg: SK.pg, pts: [p], closed: false }; SK.sk.areas.push(a); SK.drawId = a.id; SK.mode = 'draw'; markDirty(); draw(); renderPanel(); }
function addWallTo(pt) {
  const a = curArea(); if (!a) return; pushUndo(); a.pts.push([r3(pt[0]), r3(pt[1])]); SK.entry = '';
  if (a.pts.length >= 4 && Math.hypot(a.pts[a.pts.length - 1][0] - a.pts[0][0], a.pts[a.pts.length - 1][1] - a.pts[0][1]) < 0.06) { a.pts.pop(); finishArea(true); return; }
  markDirty(); draw(); renderPanel();
}
function addWall(dx, dy) {
  const a = curArea(); if (!a) return toast('Tap “New area” first');
  const L = parseFloat(SK.entry); if (!(L > 0)) return toast('Type the wall length first');
  const len = Math.hypot(dx, dy); const last = a.pts[a.pts.length - 1];
  pushUndo(); const add = SK.insideOn ? 2 * wallT() : 0; if (add) { a.inside = a.inside || {}; a.inside[a.pts.length - 1] = true; }
  a.pts.push([r3(last[0] + dx / len * (L + add)), r3(last[1] + dy / len * (L + add))]); SK.entry = ''; SK.angle = null;
  if (add) toast(`Measured inside ${L.toFixed(1)}' + 2 walls of ${Math.round(wallT() * 12)} in = ${(L + add).toFixed(1)}'`);
  if (a.pts.length >= 4 && Math.hypot(a.pts[a.pts.length - 1][0] - a.pts[0][0], a.pts[a.pts.length - 1][1] - a.pts[0][1]) < 0.06) { a.pts.pop(); finishArea(true); return; }
  markDirty(); draw(); renderPanel();
}
function angleWall() { const deg = SK.angle; if (deg === null || isNaN(deg)) return; const t = deg * Math.PI / 180; addWall(Math.cos(t), -Math.sin(t)); }
function closeArea() { const a = curArea(); if (!a) return; if (a.pts.length < 3) return toast('Draw at least two walls first'); pushUndo();
  const f = a.pts[0], l = a.pts[a.pts.length - 1]; if (Math.hypot(f[0] - l[0], f[1] - l[1]) > 0.05) { a.calc = a.calc || {}; a.calc[a.pts.length - 1] = true; }
  finishArea(true); }
const wallT = () => (SK.lib && SK.lib.wallT) || 0.5;   // her exterior wall thickness in feet (6 in. unless she changes it)
/* the last one or two walls she could not measure (gate, wall, hedge): square corner + closing wall, both marked "calculated" */
function closeSquare() { const a = curArea(); if (!a) return; if (a.pts.length < 3) return toast('Draw at least two walls first');
  const n = a.pts.length, f = a.pts[0], l = a.pts[n - 1], p = a.pts[n - 2]; const dx = f[0] - l[0], dy = f[1] - l[1];
  if (Math.hypot(dx, dy) < 0.05) return closeArea();
  pushUndo(); a.calc = a.calc || {};
  if (Math.abs(dx) < 0.05 || Math.abs(dy) < 0.05) { a.calc[n - 1] = true; setTimeout(() => toast('One wall filled in – marked “calc”. Check it with your tape.'), 2700); return finishArea(true); }
  const lastHoriz = Math.abs(l[0] - p[0]) >= Math.abs(l[1] - p[1]);   // turn 90° from the last wall …
  const back = (u, v) => { const cr = u[0] * v[1] - u[1] * v[0], dt = u[0] * v[0] + u[1] * v[1]; return Math.abs(cr) < 1e-6 * (Math.hypot(...u) * Math.hypot(...v) + 1) && dt < 0; };
  const sub = (x, y) => [x[0] - y[0], x[1] - y[1]], f1 = a.pts[1];
  const ok = c => !back(sub(c, l), sub(l, p)) && !back(sub(f, c), sub(f1, f));   // … unless that doubles back along a wall already drawn
  const cA = lastHoriz ? [l[0], f[1]] : [f[0], l[1]], cB = lastHoriz ? [f[0], l[1]] : [l[0], f[1]];
  const c = ok(cA) || !ok(cB) ? cA : cB;
  const k = a.pts.length; a.pts.push([r3(c[0]), r3(c[1])]); a.calc[k - 1] = true; a.calc[k] = true;
  setTimeout(() => toast('Two walls filled in at a square corner – marked “calc”. Check them with your tape.'), 2700); finishArea(true); }
/* tap a wall › Remove: a closed area opens at that wall (drawing continues from one end of the gap);
   an open area loses an end wall (a middle wall cannot go – the outline would split in two) */
function removeWall(a, i) {
  if (!a) return; const n = a.pts.length; const map = (o, f) => { if (!o) return o; const r = {}; Object.keys(o).forEach(k => { const j = f(+k); if (j !== null) r[j] = o[k]; }); return r; };
  if (a.closed) { pushUndo(); const sh = k => k === i ? null : ((k - (i + 1)) % n + n) % n;
    a.pts = [...a.pts.slice(i + 1), ...a.pts.slice(0, i + 1)]; a.arcs = map(a.arcs, sh); a.calc = map(a.calc, sh); a.inside = map(a.inside, sh); a.closed = false;
    SK.drawId = a.id; SK.mode = 'draw'; SK.sel = null; toast('Wall removed – the area is open. Draw from the orange end, or ⇄ Other end, then close it.'); markDirty(); draw(); renderPanel(); return; }
  if (i === n - 2) { pushUndo(); a.pts.pop(); ['arcs', 'calc', 'inside'].forEach(k => { if (a[k]) delete a[k][i]; }); }
  else if (i === 0) { pushUndo(); a.pts.shift(); const sh = k => k === 0 ? null : k - 1; a.arcs = map(a.arcs, sh); a.calc = map(a.calc, sh); a.inside = map(a.inside, sh); }
  else return toast('Remove walls from either end of an open outline (tap the first or last wall)');
  if (a.pts.length < 2) { SK.sk.areas = SK.sk.areas.filter(x => x !== a); SK.drawId = null; SK.mode = 'select'; SK.sel = null; toast('Area removed'); }
  else { SK.drawId = a.id; SK.mode = 'draw'; SK.sel = null; toast('Wall removed – keep drawing'); }
  markDirty(); draw(); renderPanel(); }
/* she hit a gate: keep drawing from the corner where she started */
function flipEnds() { const a = curArea(); if (!a || a.pts.length < 2) return toast('Draw a wall first'); pushUndo(); const n = a.pts.length; a.pts.reverse();
  const remap = o => { if (!o) return o; const r = {}; Object.keys(o).forEach(i => { const j = n - 2 - +i; if (j >= 0) r[j] = o[i]; }); return r; };
  if (a.arcs) { const r = remap(a.arcs); Object.values(r).forEach(v => { if (v && v.side) v.side = v.side === 'L' ? 'R' : 'L'; }); a.arcs = r; }
  a.calc = remap(a.calc); a.inside = remap(a.inside); SK.entry = ''; SK.dial = null;
  toast('Now drawing from your starting corner – go the other way'); markDirty(); draw(); renderPanel(); }
function finishArea(closed) {
  const a = curArea(); if (!a) return; a.closed = closed && a.pts.length >= 3;
  if (a.pts.length < 2) SK.sk.areas = SK.sk.areas.filter(x => x !== a);
  const sf = a.closed ? Math.round(computeAreas().net.get(a.id) || polyArea(shape(a))) : 0;
  SK.drawId = null; SK.mode = 'select'; SK.sel = a.closed ? { type: 'area', id: a.id } : null; SK.entry = ''; SK.dial = null; SK.curve = null;
  if (a.closed) { toast(`${a.name || defOf(a.def).name} closed: ${sf.toLocaleString()} sf`); snapshotVersion('area'); }
  markDirty(); draw(); renderPanel();
}
function backspace() {
  if (SK.entry) { SK.entry = SK.entry.slice(0, -1); renderPanel(); return; }
  if (curArea()) return backspaceWall();   // drawing: take off the last wall (↶ Undo is its own button – her Oct 22 call)
  return toast('Nothing to erase – use ↶ Undo to undo the last step');
}
function backspaceWall() {
  let a = curArea();
  if (!a && SK.sel && SK.sel.type === 'area') { a = SK.sk.areas.find(x => x.id === SK.sel.id); if (a) { pushUndo(); a.closed = false; SK.drawId = a.id; SK.mode = 'draw'; SK.sel = null; toast('Area reopened – keep pressing ⌫ to remove walls'); markDirty(); draw(); renderPanel(); return; } }
  if (!a) return toast('Nothing to remove');
  pushUndo();
  if (a.closed) a.closed = false; else if (a.pts.length > 1) { a.pts.pop(); ['arcs', 'calc', 'inside'].forEach(k => { if (a[k]) { delete a[k][a.pts.length - 1]; delete a[k][a.pts.length]; } }); } else { SK.sk.areas = SK.sk.areas.filter(x => x !== a); SK.drawId = null; SK.mode = 'select'; toast('Area removed'); }
  markDirty(); draw(); renderPanel();
}
function setWallLength(a, i, L) {
  const n = a.pts.length; if (a.closed && i === n - 1) return toast('The closing wall adjusts by itself – change the other walls');
  const p = a.pts[i], q = a.pts[i + 1]; const cur = wallLen(p, q); if (!(L > 0) || cur < 1e-6) return;
  pushUndo(); if (a.calc) delete a.calc[i]; const dx = (q[0] - p[0]) * (L / cur - 1), dy = (q[1] - p[1]) * (L / cur - 1);
  for (let j = i + 1; j < n; j++) a.pts[j] = [r3(a.pts[j][0] + dx), r3(a.pts[j][1] + dy)];
  markDirty(); draw(); renderPanel();
}
function rotateArea(a, deg) { pushUndo(); const c0 = centroid(shape(a)); a.pts = rotatePts(a.pts, deg, c0); if (a.nameAt && typeof a.nameAt === 'object') { const [q] = rotatePts([[a.nameAt.x, a.nameAt.y]], deg, c0); a.nameAt = { x: r3(q[0]), y: r3(q[1]) }; } SK.sk.labels.filter(l => l.level === a.level && a.closed && inPoly([l.x, l.y], a.pts)).forEach(() => {}); markDirty(); draw(); }
/* tap-to-rotate: ↺ / ↻ turn the selection by the step (remembered; default 30° so 6 taps = upside down) */
const ROT_STEPS = [90, 45, 30, 15, 5, 1]; const rotStep = () => SK.lib.rotStep || 30;
function rotBar(key) { if (SK.rotKey !== key) { SK.rotKey = key; SK.rotTurned = 0; }
  const t = SK.rotTurned || 0; const shown = ((t % 360) + 360) % 360;
  return `<span class="rotbar"><button class="btn rotb" data-rot="1" title="Turn left">↺</button><button class="btn rotb" data-rot="-1" title="Turn right">↻</button>
    <select id="rotStep" class="txt">${ROT_STEPS.map(v => `<option value="${v}" ${v === rotStep() ? 'selected' : ''}>${v}° per tap</option>`).join('')}</select>
    <span class="help">${!t ? 'tap to turn' : shown === 0 ? 'back where it started' : shown === 180 ? 'turned 180° (upside down)' : `turned ${shown > 180 ? (360 - shown) + '° right' : shown + '° left'}`}</span><button class="btn sm" id="rotExact">Exact…</button></span>`; }
function rotateSel(deg) { const sel = SK.sel; if (!sel) return;
  if (sel.type === 'area') rotateArea(SK.sk.areas.find(x => x.id === sel.id), deg);
  else if (sel.type === 'symbol') { const y = SK.sk.symbols.find(x => x.id === sel.id); pushUndo(); y.rot = norm360((y.rot || 0) + deg); markDirty(); draw(); }
  else if (sel.type === 'all') rotateAll(deg, true);
  SK.rotTurned = (SK.rotTurned || 0) + deg; renderPanel(); }
function rotateAll(deg, quiet) {
  if (!SK.sk.areas.length) return; pushUndo(); const pts = SK.sk.areas.flatMap(a => a.pts).concat(SK.sk.labels.map(l => [l.x, l.y]));
  const c = quiet && SK.rotC ? SK.rotC : [(Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2, (Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))) / 2]; if (quiet) SK.rotC = c;
  SK.sk.areas.forEach(a => a.pts = rotatePts(a.pts, deg, c)); SK.sk.labels.forEach(l => { const [p] = rotatePts([[l.x, l.y]], deg, c); l.x = p[0]; l.y = p[1]; });
  (SK.sk.symbols || []).forEach(y => { const [p] = rotatePts([[y.x, y.y]], deg, c); y.x = r3(p[0]); y.y = r3(p[1]); y.rot = norm360((y.rot || 0) + deg); });
  IW().forEach(w => { const [a, b] = rotatePts([w.a, w.b], deg, c); w.a = [r3(a[0]), r3(a[1])]; w.b = [r3(b[0]), r3(b[1])]; });
  SK.sk.areas.forEach(a => { if (a.nameAt && typeof a.nameAt === 'object') { const [p] = rotatePts([[a.nameAt.x, a.nameAt.y]], deg, c); a.nameAt = { x: r3(p[0]), y: r3(p[1]) }; } });
  if (!quiet) { snapshotVersion('rotate'); fitView(); } markDirty(); draw();
}
function deleteSel() {
  if (!SK.sel) return; pushUndo();
  if (SK.sel.type === 'area' || SK.sel.type === 'wall') SK.sk.areas = SK.sk.areas.filter(a => a.id !== SK.sel.id);
  if (SK.sel.type === 'label') SK.sk.labels = SK.sk.labels.filter(l => l.id !== SK.sel.id);
  if (SK.sel.type === 'symbol') SK.sk.symbols = (SK.sk.symbols || []).filter(l => l.id !== SK.sel.id);
  if (SK.sel.type === 'iwall') SK.sk.iwalls = IW().filter(w => w.id !== SK.sel.id);
  SK.sel = null; snapshotVersion('delete'); markDirty(); draw(); renderPanel();
}

/* ---------- pointer handling: tap, drag, pinch ---------- */
const ptrs = new Map(); let gest = null;
function onDown(e) {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { type: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v: { ...SK.view } }; return; }
  const ft = toFt(e.offsetX, e.offsetY);
  const pen = e.pointerType === 'pen';
  // drawing: press on the orange pen point (or anywhere with the Pencil) and drag to draw a wall
  const cur = curArea();
  if (SK.mode === 'draw' && cur) { const dot = hitDot(e.offsetX, e.offsetY); const st = cur.pts[0]; const [SX, SY] = toScr(st);
    if (dot) { gest = { type: 'dottap', pt: dot.pt, x: e.offsetX, y: e.offsetY, moved: false, v: { ...SK.view } }; return; }
    if (cur.pts.length >= 3 && Math.hypot(e.offsetX - SX, e.offsetY - SY) < 22) { gest = { type: 'dottap', pt: st, x: e.offsetX, y: e.offsetY, moved: false, v: { ...SK.view } }; return; }
    const last = cur.pts[cur.pts.length - 1]; const [LX, LY] = toScr(last);
    if (pen || Math.hypot(e.offsetX - LX, e.offsetY - LY) < 34) { gest = { type: 'drawdrag', from: last, x: e.offsetX, y: e.offsetY, moved: false }; return; } }
  if (SK.mode === 'start') { const c = nearCorner(ft, 22); if (c || pen) { gest = { type: 'startdrag', at: c ? [...c] : snapPoint(ft), x: e.offsetX, y: e.offsetY, moved: false }; return; } }
  if (SK.mode === 'select' && !pen) { const lb = hitLabel(ft), sy = lb ? null : hitSymbol(ft), an = lb || sy ? null : hitName(ft);
    const already = SK.sel && ((lb && SK.sel.type === 'label' && SK.sel.id === lb.id) || (sy && SK.sel.type === 'symbol' && SK.sel.id === sy.id) || (an && SK.sel.type === 'area' && SK.sel.id === an.id));
    if ((lb || sy || an) && !already) { const g = { type: 'tap', x: e.offsetX, y: e.offsetY, t: Date.now(), moved: false, v: { ...SK.view }, drag: null, undoPushed: false };
      g.hold = setTimeout(() => { if (gest !== g || g.moved) return;
        if (lb) { SK.sel = { type: 'label', id: lb.id }; g.drag = { kind: 'label', l: lb, start: ft, orig: [lb.x, lb.y] }; }
        else if (sy) { SK.sel = { type: 'symbol', id: sy.id }; g.drag = { kind: 'label', l: sy, start: ft, orig: [sy.x, sy.y] }; }
        else { SK.sel = { type: 'area', id: an.id }; SK.grabbed = an.id; g.drag = { kind: 'name', a: an, start: ft, orig: namePt(an, computeAreas(), SK.view.s, NAME_PX()) }; }
        SK.cursor = null; try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} draw(); renderPanel(); }, 320);
      gest = g; return; } }
  if (SK.mode === 'select') { const c = nearCorner(ft, 18); if (c) { const g = { type: 'tap', x: e.offsetX, y: e.offsetY, t: Date.now(), moved: false, v: { ...SK.view }, drag: null, corner: [...c] };
      g.hold = setTimeout(() => { if (gest === g && !g.moved) { gest = { type: 'startdrag', at: g.corner, x: g.x, y: g.y, moved: false, held: true }; longPressStart(g.corner); } }, 450); gest = g; return; } }
  let drag = null;
  if (SK.mode === 'umove') { const u = ulHere(); if (u && !u.lock) drag = { kind: 'under', u, start: ft, orig: [u.x, u.y] }; }
  if (SK.mode === 'select' && SK.sel) {
    if (SK.sel.type === 'area') { const a = SK.sk.areas.find(x => x.id === SK.sel.id); if (a && a.closed && hitName(ft) === a) SK.grabbed = a.id, drag = { kind: 'name', a, start: ft, orig: namePt(a, computeAreas(), SK.view.s, NAME_PX()) };
      else if (a && a.closed && inPoly(ft, shape(a))) { const sh0 = shape(a), inA = p => insideOrOn(p, sh0);
        drag = { kind: 'area', a, start: ft, orig: a.pts.map(p => [...p]), nameOrig: a.nameAt && typeof a.nameAt === 'object' ? [a.nameAt.x, a.nameAt.y] : null,
          inner: IW().filter(w => sameSpot(w, a) && inA(w.a) && inA(w.b)).map(w => ({ w, a0: [...w.a], b0: [...w.b] })),
          things: [...(SK.sk.symbols || []), ...SK.sk.labels].filter(o => sameSpot(o, a) && inA([o.x, o.y]) && !SK.sk.areas.some(b => b !== a && sameSpot(b, a) && b.closed && polyArea(shape(b)) < polyArea(sh0) && inPoly([o.x, o.y], shape(b)) && !inA(centroid(shape(b))) )).map(o => ({ o, x0: o.x, y0: o.y })) }; } }
    if (SK.sel.type === 'symbol') { const y = (SK.sk.symbols || []).find(x => x.id === SK.sel.id); if (y && hitSymbol(ft) === y) drag = { kind: 'label', l: y, start: ft, orig: [y.x, y.y] }; }
    if (SK.sel.type === 'label') { const l = SK.sk.labels.find(x => x.id === SK.sel.id); if (l && hitLabel(ft) === l) drag = { kind: 'label', l, start: ft, orig: [l.x, l.y] }; }
  }
  gest = { type: 'tap', x: e.offsetX, y: e.offsetY, t: Date.now(), moved: false, v: { ...SK.view }, drag, undoPushed: false };
}
function onMove(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (gest && gest.type === 'pinch' && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = Math.max(1.5, Math.min(120, gest.v.s * d / gest.d)); const k = s / gest.v.s;
    SK.view = { s, ox: c[0] - (gest.c[0] - gest.v.ox) * k, oy: c[1] - (gest.c[1] - gest.v.oy) * k }; draw(); return; }
  if (gest && gest.type === 'dottap') { if (Math.hypot(e.offsetX - gest.x, e.offsetY - gest.y) > 10) { gest.moved = true; SK.view = { ...gest.v, ox: gest.v.ox + e.offsetX - gest.x, oy: gest.v.oy + e.offsetY - gest.y }; draw(); } return; }
  if (gest && (gest.type === 'drawdrag' || gest.type === 'startdrag')) {
    if (!gest.moved && Math.hypot(e.offsetX - gest.x, e.offsetY - gest.y) < 6) return;
    if (gest.type === 'startdrag' && !gest.started) { if (!SK.pendingDef) return; placeStart(gest.at, true); gest.started = true; gest.from = gest.at; }
    gest.moved = true; const r = dragEnd(gest.from, toFt(e.offsetX, e.offsetY)); SK.dragPrev = { from: gest.from, ...r }; draw(); return; }
  if (!gest || gest.type !== 'tap') return;
  const dx = e.offsetX - gest.x, dy = e.offsetY - gest.y; if (!gest.moved && Math.hypot(dx, dy) < 8) return; gest.moved = true; if (gest.hold) clearTimeout(gest.hold);
  if (gest.drag) { const ft = toFt(e.offsetX, e.offsetY); const ddx = Math.round((ft[0] - gest.drag.start[0]) * 10) / 10, ddy = Math.round((ft[1] - gest.drag.start[1]) * 10) / 10;
    if (!gest.undoPushed && gest.drag.kind !== 'under') { pushUndo(); gest.undoPushed = true; }
    if (gest.drag.kind === 'under') { gest.drag.u.x = r3(gest.drag.orig[0] + (ft[0] - gest.drag.start[0])); gest.drag.u.y = r3(gest.drag.orig[1] + (ft[1] - gest.drag.start[1])); draw(); return; }
    if (gest.drag.kind === 'area') { gest.drag.a.pts = gest.drag.orig.map(([x, y]) => [r3(x + ddx), r3(y + ddy)]); if (gest.drag.nameOrig) gest.drag.a.nameAt = { x: r3(gest.drag.nameOrig[0] + ddx), y: r3(gest.drag.nameOrig[1] + ddy) };
      (gest.drag.inner || []).forEach(r => { r.w.a = [r3(r.a0[0] + ddx), r3(r.a0[1] + ddy)]; r.w.b = [r3(r.b0[0] + ddx), r3(r.b0[1] + ddy)]; }); (gest.drag.things || []).forEach(r => { r.o.x = r3(r.x0 + ddx); r.o.y = r3(r.y0 + ddy); }); }
    else if (gest.drag.kind === 'name') gest.drag.a.nameAt = { x: r3(gest.drag.orig[0] + ddx), y: r3(gest.drag.orig[1] + ddy) }; else { gest.drag.l.x = r3(gest.drag.orig[0] + ddx); gest.drag.l.y = r3(gest.drag.orig[1] + ddy); }
    draw(); return; }
  SK.view = { ...gest.v, ox: gest.v.ox + dx, oy: gest.v.oy + dy }; draw();
}
function onUp(e) {
  ptrs.delete(e.pointerId);
  if (gest && gest.type === 'pinch') { if (!ptrs.size) gest = null; saveViewSoon(); return; }
  if (gest && gest.type === 'dottap') { const g = gest; gest = null; if (!g.moved) addWallTo(g.pt); else saveViewSoon(); return; }
  if (gest && (gest.type === 'drawdrag' || gest.type === 'startdrag')) { const g = gest; gest = null; const pv = SK.dragPrev; SK.dragPrev = null;
    if (g.moved && pv && Math.hypot(pv.pt[0] - g.from[0], pv.pt[1] - g.from[1]) >= 0.3) { addWallTo(pv.pt); return; }
    if (g.type === 'startdrag' && !g.started && !g.held) { setCursor(g.at); SK.cursor = [...g.at]; draw(); renderPanel(); return; } // tap on a corner in start mode = cursor on that corner
    draw(); return; }
  if (!gest || gest.type !== 'tap') return; const g = gest; gest = null; if (g.hold) clearTimeout(g.hold); if (SK.grabbed) { SK.grabbed = null; draw(); }
  if (g.moved) { if (g.drag) { snapAfterDrag(g.drag); markDirty(); renderPanel(); } else saveViewSoon(); draw(); return; }
  tapAt(toFt(g.x, g.y));
}
function snapAfterDrag(dr) { // a moved area snaps its corners onto a nearby corner of another area
  if (dr.kind !== 'area') return; const tol = 14 / SK.view.s; let best = null;
  SK.sk.areas.filter(o => o !== dr.a && sameSpot(o, dr.a)).forEach(o => o.pts.forEach(q => dr.a.pts.forEach(p => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < tol && (!best || d < best.d)) best = { d, dx: q[0] - p[0], dy: q[1] - p[1] }; })));
  if (best) { dr.a.pts = dr.a.pts.map(([x, y]) => [r3(x + best.dx), r3(y + best.dy)]); if (dr.a.nameAt && typeof dr.a.nameAt === 'object') dr.a.nameAt = { x: r3(dr.a.nameAt.x + best.dx), y: r3(dr.a.nameAt.y + best.dy) }; }
}
let viewTimer = null; function saveViewSoon() { clearTimeout(viewTimer); viewTimer = setTimeout(() => { SK.sk.view = SK.view; DB.put('sketches', JSON.parse(JSON.stringify(SK.sk))).catch(() => {}); }, 800); }
function longPressStart(corner) { // hold a corner: new area of the last type starts there; drag to draw the first wall
  if (SK.lastDef) { SK.pendingDef = SK.lastDef; SK.mode = 'start'; SK.sel = null; toast(`New ${defOf(SK.lastDef).name} from this corner – drag to draw`); renderPanel(); }
  else { gest = null; setCursor(corner); SK.cursor = [...corner]; openDefs(true); }
}
function tapAt(ft) {
  if (SK.mode === 'start') { setCursor(snapPoint(ft)); draw(); renderPanel(); return; }
  if (SK.mode === 'label') { placeLabel(SK.pendingLabel.text, SK.pendingLabel.room, ft); return; }
  if (SK.mode === 'symbol') { placeSymbol(SK.pendingSym, ft); return; }
  if (SK.mode === 'iwall') { const [sx, sy] = toScr(ft); const dot = SK.iw.start ? hitDot(sx, sy) : null; const r = dot ? { p: [r3(dot.pt[0]), r3(dot.pt[1])] } : iwSnap(ft, SK.iw && SK.iw.start); if (!SK.iw.start) SK.iw.start = r.p; else { const from = SK.iw.start; if (addIWall(from, r.p)) { SK.iw.prev = from; SK.iw.start = r.p; } } draw(); renderPanel(); return; }
  if (SK.mode === 'uscale') { if (!SK.us.a) { SK.us.a = ft; draw(); renderPanel(); return; } const a = SK.us.a, b = ft, u = ulHere(); SK.us = { a: null };
    askNumber('How long is that, in feet?', 'The real length between the two points you tapped: the scale bar, or a dimension printed on the plan.', '', v => { if (u) ulScale(u, a, b, v); SK.mode = 'select'; renderPanel(); toast('Scale set – trace over the plan'); }); return; }
  if (SK.mode === 'umove') return;
  if (SK.mode === 'draw') return; // while drawing, taps do nothing (walls come from the keypad)
  SK.curve = null;
  const l = hitLabel(ft); if (l) { SK.sel = { type: 'label', id: l.id }; draw(); renderPanel(); return; }
  const sy = hitSymbol(ft); if (sy) { SK.sel = { type: 'symbol', id: sy.id }; SK.cursor = null; draw(); renderPanel(); return; }
  const an = hitName(ft); if (an) { SK.sel = { type: 'area', id: an.id }; SK.cursor = null; draw(); renderPanel(); return; }
  const iw = hitIWall(ft); if (iw) { SK.sel = { type: 'iwall', id: iw.id }; SK.cursor = null; draw(); renderPanel(); return; }
  const w = hitWall(ft); if (w) { SK.sel = { type: 'wall', id: w.id, i: w.i }; draw(); renderPanel(); return; }
  const a = hitArea(ft); SK.sel = a ? { type: 'area', id: a.id } : null; if (a) SK.cursor = null; else setCursor(ft); draw(); renderPanel();
}

/* ---------- angle dial ---------- */
const norm360 = d => ((d % 360) + 360) % 360, norm180 = d => { d = norm360(d); return d > 180 ? d - 360 : d; };
function lastDir() { const a = curArea(); if (!a || a.pts.length < 2) return null; const p = a.pts[a.pts.length - 2], q = a.pts[a.pts.length - 1]; return norm360(Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180 / Math.PI); }
function dialSvg() {
  const R = 92, c = 105; let t = '';
  for (let d = 0; d < 360; d += 15) { const r0 = d % 45 === 0 ? R - 16 : R - 9, a = d * Math.PI / 180; t += `<line x1="${c + r0 * Math.cos(a)}" y1="${c - r0 * Math.sin(a)}" x2="${c + R * Math.cos(a)}" y2="${c - R * Math.sin(a)}" stroke="#000" stroke-width="${d % 90 === 0 ? 3 : d % 45 === 0 ? 2 : 1}"/>`; }
  const lab = [[0, '→'], [90, '↑'], [180, '←'], [270, '↓'], [45, '45'], [135, '135'], [225, '225'], [315, '315']].map(([d, l]) => { const a = d * Math.PI / 180, r = R - 30; return `<text x="${c + r * Math.cos(a)}" y="${c - r * Math.sin(a) + 6}" text-anchor="middle" font-size="${l.length > 1 ? 13 : 18}" font-weight="700">${l}</text>`; }).join('');
  return `<svg id="skDial" viewBox="0 0 210 210" width="180" height="180" style="touch-action:none"><circle cx="${c}" cy="${c}" r="${R}" fill="#fff" stroke="#000" stroke-width="3"/>${t}${lab}
    <line id="dlLast" x1="${c}" y1="${c}" x2="${c}" y2="${c}" stroke="#888" stroke-width="3" stroke-dasharray="6 5"/>
    <line id="dlNeedle" x1="${c}" y1="${c}" x2="${c}" y2="${c}" stroke="#ff7a00" stroke-width="5" stroke-linecap="round"/><circle id="dlKnob" r="13" fill="#ff7a00" stroke="#000" stroke-width="2"/><circle cx="${c}" cy="${c}" r="5" fill="#000"/></svg>`;
}
function dialUpdate() {
  const d = SK.dial; if (!d) return; const c = 105, R = 92, a = d.ang * Math.PI / 180; const n = document.getElementById('dlNeedle'), k = document.getElementById('dlKnob'), l = document.getElementById('dlLast'), o = document.getElementById('dlRead');
  if (n) { n.setAttribute('x2', c + (R - 8) * Math.cos(a)); n.setAttribute('y2', c - (R - 8) * Math.sin(a)); k.setAttribute('cx', c + (R - 8) * Math.cos(a)); k.setAttribute('cy', c - (R - 8) * Math.sin(a)); }
  const ld = lastDir(); if (l) { if (ld === null) { l.setAttribute('x2', c); l.setAttribute('y2', c); } else { const b = ld * Math.PI / 180; l.setAttribute('x2', c + 60 * Math.cos(b)); l.setAttribute('y2', c - 60 * Math.sin(b)); } }
  if (o) { const rel = ld === null ? null : norm180(d.ang - ld); o.innerHTML = `<b>${(Math.round(d.ang * 10) / 10).toFixed(1)}°</b>${rel === null ? '' : `<span>${Math.abs(rel) < 0.05 ? 'straight on' : `turn ${Math.abs(Math.round(rel * 10) / 10)}° ${rel > 0 ? 'left' : 'right'}`}</span>`}`; }
  draw();
}
function dialSet(ang) { SK.dial.ang = Math.round(norm360(ang) * 2) / 2; SK.lastAngle = SK.dial.ang; dialUpdate(); }
function wireDial(root) {
  const svg = root.querySelector('#skDial'); if (!svg) return; let down = false;
  const at = e => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 210 - 105, y = (e.clientY - r.top) / r.height * 210 - 105; let d = norm360(Math.atan2(-y, x) * 180 / Math.PI); const m = Math.round(d / 45) * 45; if (Math.abs(d - m) < 1.5) d = m; dialSet(d); };
  svg.addEventListener('pointerdown', e => { down = true; svg.setPointerCapture(e.pointerId); at(e); }); svg.addEventListener('pointermove', e => { if (down) at(e); }); svg.addEventListener('pointerup', () => { down = false; }); svg.addEventListener('pointercancel', () => { down = false; });
  root.querySelectorAll('[data-dstep]').forEach(b => b.onclick = () => dialSet(SK.dial.ang + +b.dataset.dstep));
  root.querySelectorAll('[data-dturn]').forEach(b => b.onclick = () => { const ld = lastDir(); if (ld === null) return toast('Draw one wall first – turns are measured from the last wall'); dialSet(ld + +b.dataset.dturn); });
  const go = root.querySelector('#dlDraw'); if (go) go.onclick = () => { const t = SK.dial.ang * Math.PI / 180; addWall(Math.cos(t), -Math.sin(t)); };
  const cl = root.querySelector('#dlClose'); if (cl) cl.onclick = () => { SK.dial = null; renderPanel(); draw(); };
  dialUpdate();
}
/* ---------- curved wall editing (live, on the panel) ---------- */
function startCurve(a, i) {
  const n = a.pts.length; const q = i === n - 1 ? a.pts[0] : a.pts[i + 1]; if (!q) return;
  pushUndo(); a.arcs = a.arcs || {};
  if (!a.arcs[i]) { const p = a.pts[i], c = wallLen(p, q); const h = Math.round(Math.min(c / 4, 4) * 10) / 10 || 1;
    let side = 'L'; if (a.pts.length >= 3) { const g = arcGeom(p, q, h, 'L'); if (g && inPoly(g.B, a.pts)) side = 'R'; } a.arcs[i] = { h, side }; }
  SK.curve = { id: a.id, i }; SK.sel = { type: 'wall', id: a.id, i }; markDirty(); renderPanel(); draw();
}
function curveCtx() {
  const a = SK.sk.areas.find(x => x.id === SK.curve.id); const i = SK.curve.i; const ar = a && a.arcs && a.arcs[i]; if (!ar) { SK.curve = null; return ''; }
  const p = a.pts[i], q = i === a.pts.length - 1 ? a.pts[0] : a.pts[i + 1]; const g = arcGeom(p, q, ar.h, ar.side);
  return `<div class="ctx curve"><b>Curved wall</b> · straight distance end to end ${r1(wallLen(p, q)).toFixed(1)}' · bow depth at the middle
    <button class="btn sm" data-cstep="-0.5">−0.5</button><button class="btn sm" data-cstep="-0.1">−0.1</button><input id="cvH" class="txt num" inputmode="decimal" value="${ar.h.toFixed(1)}"><button class="btn sm" data-cstep="0.1">+0.1</button><button class="btn sm" data-cstep="0.5">+0.5</button> ft
    <button class="btn sm" id="cvFlip">⇄ Bulge other way</button><button class="btn sm" id="cvHalf">Half circle</button><button class="btn sm" id="cvStraight">Make straight</button><button class="btn primary sm" id="cvDone">Done</button>
    <span class="help">Arc length ${g ? r1(g.len).toFixed(1) : '–'}' · radius ${g ? r1(g.R).toFixed(1) : '–'}'</span></div>`;
}
function wireCurve(root) {
  const a = SK.sk.areas.find(x => x.id === SK.curve.id); if (!a) return; const i = SK.curve.i; const ar = a.arcs[i];
  const p = a.pts[i], q = i === a.pts.length - 1 ? a.pts[0] : a.pts[i + 1]; const set = h => { ar.h = Math.max(0.1, Math.round(h * 10) / 10); markDirty(); renderPanel(); draw(); };
  root.querySelectorAll('[data-cstep]').forEach(b => b.onclick = () => set(ar.h + +b.dataset.cstep));
  const inp = root.querySelector('#cvH'); inp.onchange = () => { const v = parseFloat(inp.value); if (v > 0) set(v); };
  root.querySelector('#cvFlip').onclick = () => { ar.side = ar.side === 'L' ? 'R' : 'L'; markDirty(); renderPanel(); draw(); };
  root.querySelector('#cvHalf').onclick = () => set(wallLen(p, q) / 2);
  root.querySelector('#cvStraight').onclick = () => { delete a.arcs[i]; SK.curve = null; markDirty(); renderPanel(); draw(); };
  root.querySelector('#cvDone').onclick = () => { SK.curve = null; renderPanel(); draw(); };
}

/* ---------- UI ---------- */
const H = s => s; // template marker
function renderShell() {
  const p = SK.ins.data.property || {};
  document.getElementById('app').innerHTML = `
  <header class="skbar">
    <button class="btn" id="skBack">‹ Back</button>
    <div class="sktitle"><b>${esc(p.fileName || 'Sketch')}</b><span>${esc([p.addr, p.unit].filter(Boolean).join(' '))}</span></div>
    <span class="saved" id="skSaved">Saved ✓</span>
    <button class="btn icon" id="skInfoBtn" title="How to use the sketch" aria-label="How to use the sketch">ⓘ</button>
    <button class="btn icon" id="skMenu" aria-label="Menu">☰</button>
  </header>
  <div class="sklevels" id="skLevels"></div>
  <div class="skwrap"><canvas id="skCanvas"></canvas><div class="skinfo" id="skInfo"></div><section class="skpanel float" id="skPanel"></section></div>
  <div class="sheet-bg" id="skSheetBg" hidden><div class="sheet" id="skSheet"></div></div>`;
  cv = document.getElementById('skCanvas'); ctx = cv.getContext('2d');
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('wheel', e => { e.preventDefault(); const k = e.deltaY < 0 ? 1.1 : 1 / 1.1; const s = Math.max(1.5, Math.min(120, SK.view.s * k)); const kk = s / SK.view.s; SK.view = { s, ox: e.offsetX - (e.offsetX - SK.view.ox) * kk, oy: e.offsetY - (e.offsetY - SK.view.oy) * kk }; draw(); }, { passive: false });
  document.getElementById('skBack').onclick = goBack;
  document.getElementById('skMenu').onclick = openMenu; document.getElementById('skInfoBtn').onclick = openHelp;
  document.body.classList.remove('padmin');
  document.getElementById('skSheetBg').addEventListener('click', e => { if (e.target.id === 'skSheetBg') closeSheet(); });
  renderLevels(); renderPanel(); renderInfo();
  window.addEventListener('resize', sizeCanvas); try { new ResizeObserver(() => sizeCanvas()).observe(cv.parentElement); } catch (e) {} sizeCanvas();
}
function sizeCanvas() { if (!cv) return; dpr = window.devicePixelRatio || 1; const r = cv.parentElement.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return; if (Math.round(r.width * dpr) === cv.width && Math.round(r.height * dpr) === cv.height) return draw(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; draw(); }
function renderLevels() {
  const used = [...new Set([...SK.sk.areas.filter(a => PG(a) === SK.pg).map(a => a.level), SK.level, 'L1'])].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b));
  const pages = pageList(); const many = pages.length > 1 || SK.sk.pages;
  document.getElementById('skLevels').innerHTML = `<span class="pgs">${pages.length < 2 ? '' : pages.map(p => `<button class="chip pg ${p.n === SK.pg ? 'on' : ''}" data-pg="${p.n}">📄 ${esc(p.name)}</button>`).join('')}<button class="chip pg add" id="skAddPg">${pages.length < 2 ? '+ 2nd page' : '+ Page'}</button></span><span class="lvs">`
    + used.map(l => `<button class="chip lv ${l === SK.level ? 'on' : ''}" data-lv="${l}">${LEVEL_NAME(l)}${below(l) ? ' <small>below grade</small>' : ''}</button>`).join('') + `<button class="chip lv add" id="skAddLv">+ Level</button><button class="chip lv dots ${SK.showDots === false ? '' : 'on'}" id="skDots">• Line-up dots ${SK.showDots === false ? 'off' : 'on'}</button></span>`;
  const busy = () => { if (SK.drawId) { toast('Finish or close the area you are drawing first'); return true; } return false; };
  document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { if (busy()) return; SK.level = b.dataset.lv; SK.sel = null; renderLevels(); renderPanel(); draw(); markDirty(); });
  document.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { if (busy()) return; const n = +b.dataset.pg; if (n === SK.pg) return openPage(n); goPage(n); });
  document.getElementById('skAddPg').onclick = () => { if (busy()) return; askText('New sketch page', 'What goes on this page? e.g. Guest house, Garage & pool house, Barn', '', name => {
    const L = pageList().slice(); const n = Math.max(...L.map(x => x.n)) + 1; L.push({ n, name: name || 'Page ' + n }); pushUndo(); SK.sk.pages = L; goPage(n); toast(`Page “${name || 'Page ' + n}” added – it prints on its own sheet`); }); };
  document.getElementById('skDots').onclick = () => { SK.showDots = SK.showDots === false; try { localStorage.setItem('skDots', SK.showDots ? '1' : '0'); } catch (e) {} renderLevels(); draw(); };
  document.getElementById('skAddLv').onclick = () => openSheet(`<h3>Add a level</h3><p class="help">Levels B1–B5 are below grade (a level that is even partly below grade counts as below grade). The other levels on this page stay visible as grey outlines so you can line up the floors.</p>
    <div class="grid-btns">${LEVELS.map(l => `<button class="btn ${used.includes(l) ? 'dim' : ''}" data-newlv="${l}">${LEVEL_NAME(l)}</button>`).join('')}</div><div class="row"><button class="btn" data-close>Cancel</button></div>`, sh => sh.querySelectorAll('[data-newlv]').forEach(b => b.onclick = () => {
      const from = SK.level, to = b.dataset.newlv; closeSheet(); SK.level = to; SK.sel = null; renderLevels(); renderPanel(); draw(); markDirty();
      const src = SK.sk.areas.filter(a => a.level === from && PG(a) === SK.pg && a.closed && ['LIV', 'LIVN', 'UNF'].includes(defOf(a.def).bucket));
      if (to !== from && src.length && !SK.sk.areas.some(here)) openSheet(`<h3>Same outline as ${LEVEL_NAME(from)}?</h3><p class="help">Copy the outline of ${LEVEL_NAME(from)} (${src.map(a => esc(a.name || defOf(a.def).name)).join(', ')}) onto ${LEVEL_NAME(to)}. You can change any wall afterwards.</p>
        <div class="grid-btns col"><button class="btn primary" id="cpYes">Copy the outline</button><button class="btn" data-close>Start blank</button></div>`, s2 => s2.querySelector('#cpYes').onclick = () => { closeSheet(); copyAreas(src, to); });
    }));
}
function goPage(n) { SK.pg = n; const lv = SK.sk.areas.filter(a => PG(a) === n).map(a => a.level); SK.level = lv.includes(SK.level) ? SK.level : (lv.includes('L1') ? 'L1' : lv[0] || 'L1'); SK.sel = null; SK.cursor = null; renderLevels(); renderPanel(); if (SK.sk.areas.some(here)) fitView(); draw(); markDirty(); }
function openPage(n) { const p = pageList().find(x => x.n === n); const items = SK.sk.areas.filter(a => PG(a) === n).length;
  openSheet(`<h3>Sketch page: ${esc(p.name)}</h3><p class="help">Each page prints on its own sheet; the area calculations cover every page.</p><div class="grid-btns col"><button class="btn" id="pgRen">Rename</button>${pageList().length > 1 ? `<button class="btn danger" id="pgDel">Delete this page${items ? ` and its ${items} area${items > 1 ? 's' : ''}` : ''}</button>` : ''}</div><div class="row"><button class="btn" data-close>Close</button></div>`, sh => {
    sh.querySelector('#pgRen').onclick = () => askText('Rename page', '', p.name, v => { if (!v) return; pushUndo(); SK.sk.pages = pageList().map(x => x.n === n ? { ...x, name: v } : x); renderLevels(); markDirty(); });
    const d = sh.querySelector('#pgDel'); if (d) d.onclick = () => { if (items && !confirm(`Delete “${p.name}” and everything drawn on it?`)) return; pushUndo(); closeSheet();
      SK.sk.areas = SK.sk.areas.filter(a => PG(a) !== n); SK.sk.labels = SK.sk.labels.filter(a => PG(a) !== n); SK.sk.symbols = (SK.sk.symbols || []).filter(a => PG(a) !== n);
      SK.sk.pages = pageList().filter(x => x.n !== n); goPage(SK.sk.pages[0].n); }; }); }
function copyAreas(src, to) { pushUndo(); const made = src.map(a => { const c = JSON.parse(JSON.stringify(a)); c.id = uid(); c.level = to; c.pg = PG(a); if (c.nameAt && typeof c.nameAt === 'object') delete c.nameAt; SK.sk.areas.push(c); return c; });
  SK.level = to; SK.pg = PG(made[0]); SK.sel = made.length === 1 ? { type: 'area', id: made[0].id } : null; snapshotVersion('copy level'); markDirty(); renderLevels(); renderPanel(); draw(); toast(`Copied to ${LEVEL_NAME(to)} – change any wall that differs`); }
function fitViewIfEmpty() { if (!SK.sk.areas.some(a => here(a))) { /* keep the view where it is so floors line up */ } }
function renderInfo() {
  const el = document.getElementById('skInfo'); if (!el) return; const T = totals();
  const fmt = n => n ? n.toLocaleString() : '0';
  el.innerHTML = `<b>Finished above grade ${fmt(T.agFin)} sf</b>${T.agNon ? ` · nonstandard ${fmt(T.agNon)}` : ''}${T.bgFin || T.bgNon ? ` · below grade ${fmt(T.bgFin + T.bgNon)}` : ''}${T.gar.length ? ` · garage ${fmt(T.gar.reduce((t, x) => t + x.sf, 0))}` : ''} <button class="btn sm" id="skTotals">Totals</button>`;
  document.getElementById('skTotals').onclick = openTotals;
}
/* her ask (Oct 22 2026): two pinnable tool trays – ✏ Walls (keypad, arrows / angle circle, curve, center, back, undo)
   and Aa Labels & symbols (label, symbol, door, interior wall, rotate, new area). Tap the pinned one to unpin it and
   give the drawing the whole screen. The directions moved to ⓘ; send, save, redo and clone-a-level are in ☰. */
function skTray() { if (SK.tray === undefined) { let v = null; try { v = localStorage.getItem('skTray'); } catch (e) {} SK.tray = v === null ? 'draw' : v; } return SK.tray; }
function setTray(t) { SK.tray = t; try { localStorage.setItem('skTray', t); } catch (e) {} }
function openHelp() { openSheet(`<h3>How to use the sketch</h3><div class="calc">
  <p><b>Tools at the bottom.</b> When you are not drawing: ＋ New area, Aa Label, ◫ Symbol, ◜ Door, ┼ Interior wall, ⟳ Rotate, ⌖ Center and ↶ Undo. Press <b>＋</b>, pick the area type and tap where it starts – the drawing pad comes up: keypad, arrows (∠ Angle opens the angle circle), ✓ Save (closes the area), 🛑 Stop (leaves it open), ⌒ Curve and ⌖ Center. Save or Stop brings back the main bar.</p>
  <p><b>Drawing walls:</b> + New area, tap where it starts (or press and hold a corner and drag), type a length and tap an arrow. ∠ Angle opens the angle circle. Tap the green start to close. ⌫ removes the last digit, then the last wall. ↶ Undo undoes the last step (↷ Redo is in ☰).</p>
  <p><b>Changing things:</b> tap a wall to change its length or curve it; tap an area to change its type (Properties), turn, copy or delete it; drag a label to move it; tap empty space for the cursor. Drag an area, label or symbol to move it.</p>
  <p><b>Moving around:</b> two fingers to zoom and move. ◎ centers on what you are working on. Blue dots line up with other corners (☰ › Line-up dots).</p>
  <p><b>☰ menu:</b> save to the inspection, redo, add a level or page, copy this level to another level (a second story you can still change), text size, underlay, versions.</p>
  <p class="help">While you draw an area, the level buttons and address hide to give you more room.</p></div><div class="row"><button class="btn" data-close>Close</button></div>`); }
function iwToArea(id) {   // her Oct 22 sketch: the outline was drawn as interior walls – turn the connected walls into an area and keep going
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.06; const all = IW().filter(here); const w0 = all.find(x => x.id === id); if (!w0) return;
  const used = new Set([w0]); let pts = [w0.a, w0.b]; let grew = true;
  while (grew) { grew = false; for (const x of all) { if (used.has(x)) continue; const head = pts[0], tail = pts[pts.length - 1];
      if (near(x.a, tail)) { pts.push(x.b); } else if (near(x.b, tail)) { pts.push(x.a); } else if (near(x.a, head)) { pts.unshift(x.b); } else if (near(x.b, head)) { pts.unshift(x.a); } else continue; used.add(x); grew = true; } }
  const closed = pts.length > 3 && near(pts[0], pts[pts.length - 1]); if (closed) pts.pop();
  const def = (SK.lastDef && defOf(SK.lastDef).id) || ([...DEFAULT_DEFS, ...(SK.lib.defs || [])].find(d => d.bucket === 'LIV') || DEFAULT_DEFS[0]).id;
  pushUndo(); SK.sk.iwalls = IW().filter(x => !used.has(x)); const a = { id: uid(), def, level: SK.level, pg: SK.pg, pts: pts.map(p => [r3(p[0]), r3(p[1])]), closed };
  SK.sk.areas.push(a); SK.sel = null; SK.mode = closed ? 'select' : 'draw'; SK.drawId = closed ? null : a.id; markDirty(); draw(); renderPanel(); centreNow();
  toast(closed ? `${used.size} walls made into a ${defOf(def).name} – tap it › Properties to change the type` : `${used.size} walls are now a ${defOf(def).name} – keep drawing from the orange point and tap the green start to close it (tap the area later › Properties to change the type)`, 9000); }
function renderPanel() {
  const el = document.getElementById('skPanel'); if (!el) return;
  const a = curArea(); const sel = SK.sel;
  let ctxHtml = '';
  if (SK.curve) ctxHtml = curveCtx();
  if (ctxHtml) {} else if (SK.mode === 'start') ctxHtml = `<div class="ctx"><b>Starting corner for the ${esc(defOf(SK.pendingDef).name)}:</b> ${SK.cursor ? 'cursor dropped –' : 'tap to drop the cursor, or press on a corner and drag to draw the first wall.'}
      ${SK.cursor ? `<button class="btn sm" id="skJump">⤓ Jump to nearest corner</button><button class="btn primary sm" id="skStartHere">Start here</button>` : ''}<button class="btn sm" id="skCancelStart">Cancel</button></div>`;
  else if (SK.mode === 'symbol') ctxHtml = `<div class="ctx"><b>Tap where the ${esc(SYMBOLS[SK.pendingSym].n.toLowerCase())} goes.</b> <button class="btn sm" id="skCancelLabel">Cancel</button></div>`;
  else if (SK.mode === 'iwall') ctxHtml = `<div class="ctx"><b>Interior walls:</b> ${SK.iw && SK.iw.start ? 'tap where this wall ends (it snaps to walls and corners), or type a length and press an arrow. Keep tapping to continue the wall.' : 'tap where the wall starts – on an outside wall, a corner, or anywhere.'} <button class="btn sm" id="iwBreak" ${SK.iw && SK.iw.start ? '' : 'disabled'}>Start a separate wall</button><button class="btn primary sm" id="iwDone">Done</button></div>`;
  else if (SK.mode === 'uscale') ctxHtml = `<div class="ctx"><b>Set the scale:</b> ${SK.us && SK.us.a ? 'now tap the other end.' : 'tap one end of the scale bar, or of a wall whose length is printed on the plan.'} <button class="btn sm" id="skCancelLabel">Cancel</button></div>`;
  else if (SK.mode === 'umove') ctxHtml = `<div class="ctx"><b>Move the floor plan:</b> drag it until it lines up with your walls. <button class="btn primary sm" id="skCancelLabel">Done</button></div>`;
  else if (SK.mode === 'label') ctxHtml = `<div class="ctx"><b>Tap where “${esc(SK.pendingLabel.text)}” goes.</b> <button class="btn sm" id="skCancelLabel">Cancel</button></div>`;
  else if (a) ctxHtml = `<div class="ctx"><b>Drawing: ${esc(a.name || defOf(a.def).name)}</b> · ${a.pts.length - 1} wall${a.pts.length === 2 ? '' : 's'}<span class="hint"> · type a length + arrow, drag from the orange point, or tap a blue dot to line up with another corner. Tap the green start to close.</span>${a.pts.length >= 2 ? ' <button class="btn sm" id="skFlip" title="Blocked by a gate or wall? Keep going from your starting corner">⇄ Other end</button>' : ''}${a.pts.length >= 3 ? ' <button class="btn sm" id="skSquare" title="Fill the last one or two walls you could not measure (square corner)">⌐ Fill missing walls</button>' : ''}
      <button class="btn sm ${SK.insideOn ? 'primary' : ''}" id="skInside" title="The next walls were measured inside: two wall thicknesses are added">${SK.insideOn ? `✓ Measured inside (+${Math.round(wallT() * 12)} in × 2)` : 'Measured inside?'}</button>${SK.insideOn ? '<button class="btn sm" id="skWallT">wall thickness</button>' : ''}</div>`;
  else if (sel && sel.type === 'wall') { const ar = SK.sk.areas.find(x => x.id === sel.id); const ws = walls(ar).find(w => w[0] === sel.i); const L = ws ? r1(wallLen(ws[1], ws[2])) : 0; const closing = ar.closed && sel.i === ar.pts.length - 1;
    ctxHtml = `<div class="ctx"><b>Wall: ${L.toFixed(1)} ft</b>${closing ? ' · closing wall (adjusts by itself)' : ''} of ${esc(ar.name || defOf(ar.def).name)}
      ${closing ? '' : `<label class="inl">New length <input id="skWallLen" class="txt num" inputmode="decimal" value="${L.toFixed(1)}"></label><button class="btn primary sm" id="skWallSet">Apply</button>`}
      <button class="btn sm" id="skCurve">⌒ ${ar.arcs && ar.arcs[sel.i] ? 'Edit curve' : 'Curve this wall'}</button><button class="btn sm" id="skWallArea">Select the area</button>${ar.closed ? '' : '<button class="btn primary sm" id="skContinue">✎ Continue drawing this area</button>'}<button class="btn sm danger" id="skWallDel">✂ Remove this wall${ar.closed ? ' (opens the area here)' : ''}</button>
      ${ar.calc && ar.calc[sel.i] ? '<span class="help">≈ calculated, not measured. <button class="btn sm" id="skCalcOk">I measured it</button></span>' : ''}</div>`; }
  else if (sel && sel.type === 'all') ctxHtml = `<div class="ctx"><b>Turn the whole sketch</b> (all levels, labels and symbols) <div class="nmpos">${rotBar('all')}<button class="btn primary sm" id="rotDone">Done</button></div></div>`;
  else if (sel && sel.type === 'area') { const ar = SK.sk.areas.find(x => x.id === sel.id); const C = computeAreas(); const d = defOf(ar.def);
    ctxHtml = `<div class="ctx"><b>${esc(ar.name || d.name)}</b> · ${Math.round(C.net.get(ar.id) || 0).toLocaleString()} sf${C.net.get(ar.id) !== C.gross.get(ar.id) ? ` net (${Math.round(C.gross.get(ar.id)).toLocaleString()} gross)` : ''} · ${esc(BUCKETS[d.bucket].l)}
      <button class="btn sm" id="skAreaProps">Properties</button><button class="btn sm" id="skReopen">Edit walls</button><button class="btn sm" id="skCopyLv">⧉ Copy to level</button><button class="btn sm" id="skMovePg">Move to page</button><button class="btn sm danger" id="skDel">Delete</button>
      <div class="nmpos"><b>Turn</b> ${rotBar('a' + ar.id)}</div>
      ${ar.nameAt ? '<button class="btn sm" data-np="">Put the name back inside</button>' : ''}
      <span class="help">Drag the area to move it · drag its name to put the name anywhere.</span></div>`; }
  else if (sel && sel.type === 'symbol') { const y = (SK.sk.symbols || []).find(x => x.id === sel.id);
    ctxHtml = `<div class="ctx"><b>${esc(SYMBOLS[y.type].n)}</b> · width <button class="btn sm" data-sz="w:-0.5">−</button><input class="txt num sz" id="syW" inputmode="decimal" value="${y.w.toFixed(1)}"><button class="btn sm" data-sz="w:0.5">+</button>
      ${y.type === 'spiral' || DOORISH(y.type) ? '' : `length <button class="btn sm" data-sz="h:-0.5">−</button><input class="txt num sz" id="syH" inputmode="decimal" value="${y.h.toFixed(1)}"><button class="btn sm" data-sz="h:0.5">+</button>`} ft
      ${y.type === 'door' || y.type === 'entry' ? '<button class="btn sm" id="syHinge">⇄ Hinge side</button><button class="btn sm" id="sySwing">⇅ Swing in / out</button>' : y.type === 'dbldoor' ? '<button class="btn sm" id="sySwing">⇅ Swing in / out</button>' : ''}
      <button class="btn sm danger" id="skDel">Delete</button><div class="nmpos"><b>Turn</b> ${rotBar('s' + y.id)}</div><span class="help">Drag it to move it.</span></div>`; }
  else if (sel && sel.type === 'iwall') { const w = IW().find(x => x.id === sel.id); const L = w ? r1(wallLen(w.a, w.b)) : 0;
    ctxHtml = `<div class="ctx"><b>Interior wall: ${L.toFixed(1)} ft</b> <label class="inl">New length <input id="iwLen" class="txt num" inputmode="decimal" value="${L.toFixed(1)}"></label><button class="btn primary sm" id="iwSet">Apply</button><button class="btn sm primary" id="iwMore">✎ Keep drawing from here</button><button class="btn sm" id="iwArea">⬠ Make these walls an area</button><button class="btn sm danger" id="skDel">Delete</button><span class="help">Interior walls never change the square footage – the outline of a room or the house is an area.</span></div>`; }
  else if (sel && sel.type === 'label') { const l = SK.sk.labels.find(x => x.id === sel.id);
    const lk = l.room && l.room.id && ((SK.ins.lists || {})[l.room.list] || []).find(x => x.id === l.room.id);
    ctxHtml = `<div class="ctx"><b>${esc(l.text)}</b> · ${l.room ? (l.room.gone ? 'room was removed on the Interior tab' : lk ? 'linked to ' + esc(itemName(l.room.list, lk)) + ' on the Interior tab' : esc(roomWord(l.room)) + ' – added to the Interior tab when saved') : 'label only'} <button class="btn sm" id="skLblEdit">Change</button><button class="btn sm danger" id="skDel">Delete</button><span class="help">Drag it to move it.</span></div>`; }
  else if (SK.cursor) ctxHtml = `<div class="ctx"><b>Cursor</b> <button class="btn sm" id="skJump">⤓ Jump to nearest corner</button><button class="btn sm" id="skNewHere">+ New area here</button><button class="btn sm" id="skLabelHere">Aa Label here</button><button class="btn sm" id="skCurOff">✕</button>
      <span class="help">Press and hold a corner to start a new area there and drag the first wall.</span></div>`;
  else ctxHtml = '';
  const ent = SK.entry || '';
  /* her ask (Oct 22, 2nd idea): the tools follow what you are doing – the main bar when you are not drawing; press ＋ and the
     drawing pad comes up (keypad, arrows / angle, ✓ Save, 🛑 Stop, ⌒ Curve, ⌖ Center); Save or Stop takes you back */
  const drawPad = !!a || SK.mode === 'start' || SK.mode === 'iwall';
  document.body.classList.toggle('working', drawPad);
  const curveOk = (a && a.pts.length >= 2) || (sel && sel.type === 'wall');
  el.innerHTML = ctxHtml + `
  ${drawPad ? '' : `<div class="mainbar">
    <button class="btn primary big ico" id="skNew" title="New area"><span>＋</span><small>New area</small></button><button class="btn big ico" id="skLabel" title="Labels"><span>Aa</span><small>Label</small></button><button class="btn big ico" id="skSym" title="Symbols"><span>◫</span><small>Symbol</small></button><button class="btn big ico" id="skDoor" title="Doors"><span>◜</span><small>Door</small></button>
    <button class="btn big ico" id="skIWall" title="Interior wall"><span>┼</span><small>Int. wall</small></button><button class="btn big ico" id="skRotT" title="Turn the whole sketch"><span>⟳</span><small>Rotate</small></button><button class="btn big ico" id="skCenter" title="Center all your areas"><span>⌖</span><small>Center</small></button><button class="btn big ico" id="skUndo" title="Undo (Redo is in ☰)"><span>↶</span><small>Undo</small></button></div>`}
  ${drawPad ? `<div class="pad">
    <div class="keys">
      <div class="entry" id="skEntry">${ent ? esc(ent) + ' ft' : 'length'}</div>
      ${['7','8','9','4','5','6','1','2','3','.','0'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}<button class="key bs" id="skBs" title="Backspace: the last digit, then the last wall">⌫</button>
    </div>
    ${SK.dial ? `<div class="dialbox">${dialSvg()}<div class="dlread" id="dlRead"></div>
      <div class="dlrow"><button class="btn primary" id="dlDraw">Draw wall</button><button class="btn" id="dlClose">Arrows</button></div>
      <div class="dlrow"><button class="btn sm" data-dstep="-1">−1°</button><button class="btn sm" data-dstep="-0.5">−½°</button><button class="btn sm" data-dstep="0.5">+½°</button><button class="btn sm" data-dstep="1">+1°</button></div>
      <div class="dlrow turns"><span class="help">Turn left</span><button class="btn sm" data-dturn="22.5">22.5</button><button class="btn sm" data-dturn="45">45</button><button class="btn sm" data-dturn="90">90</button></div>
      <div class="dlrow turns"><span class="help">Turn right</span><button class="btn sm" data-dturn="-22.5">22.5</button><button class="btn sm" data-dturn="-45">45</button><button class="btn sm" data-dturn="-90">90</button></div></div>` : `<div class="arrows">
      ${[['↖', -1, -1], ['↑', 0, -1], ['↗', 1, -1], ['←', -1, 0], ['ang'], ['→', 1, 0], ['↙', -1, 1], ['↓', 0, 1], ['↘', 1, 1]].map(x => x[0] === 'ang' ? `<button class="key arr angle" id="skAngle">∠ Angle</button>` : `<button class="key arr" data-dx="${x[1]}" data-dy="${x[2]}">${x[0]}</button>`).join('')}
    </div>`}
    <div class="acts">
      ${SK.mode === 'iwall' ? '' : SK.mode === 'start' ? `<button class="btn primary big ico" id="skStartHere2" ${SK.cursor ? '' : 'disabled'} title="Start the area here"><span>📍</span><small>Start</small></button>` : ''}
      ${SK.mode === 'iwall' ? '<button class="btn big ico save" id="iwDone2" title="Done with interior walls"><span>✓</span><small>Done</small></button>' : `<button class="btn big ico save" id="skClose" ${a ? '' : 'disabled'} title="Save – close the area and go back"><span>✓</span><small>Save</small></button>
      <button class="btn big ico" id="${a ? 'skDone' : 'skCancelStart'}" title="${a ? 'Stop – leave the area open and go back' : 'Cancel – go back'}"><span class="stopsign"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><polygon points="7,1 17,1 23,7 23,17 17,23 7,23 1,17 1,7" fill="#d40000" stroke="#fff" stroke-width="1.6"/><polygon points="7,1 17,1 23,7 23,17 17,23 7,23 1,17 1,7" fill="none" stroke="#000" stroke-width=".8"/><text x="12" y="15.2" text-anchor="middle" font-size="6.6" font-weight="700" font-family="Arial,sans-serif" fill="#fff">STOP</text></svg></span><small>Stop</small></button>`}
      <button class="btn big ico" id="skUndoD" title="Undo the last step (Redo is in ☰)"><span>↶</span><small>Undo</small></button><button class="btn big ico" id="skCurveT" ${curveOk ? '' : 'disabled'} title="Curve the last wall (or the wall you tapped)"><span>⌒</span><small>Curve</small></button><button class="btn big ico" id="skCenter" title="Center what you are drawing, or all your areas"><span>⌖</span><small>Center</small></button>
    </div>
  </div>` : ''}`;
  { const d2 = document.getElementById('iwDone2'); if (d2) d2.onclick = () => { SK.mode = 'select'; SK.iw = null; draw(); renderPanel(); }; }
  { const u = document.getElementById('skUndo'); if (u) u.onclick = doUndo; const u2 = document.getElementById('skUndoD'); if (u2) u2.onclick = doUndo; }
  { const ct = document.getElementById('skCurveT'); if (ct) ct.onclick = () => { const ca = curArea(); if (ca && ca.pts.length >= 2) return startCurve(ca, ca.pts.length - 2); if (sel && sel.type === 'wall') return startCurve(SK.sk.areas.find(x => x.id === sel.id), sel.i); toast('Tap a wall first, or draw one'); }; }
  { const rt = document.getElementById('skRotT'); if (rt) rt.onclick = () => { if (sel && (sel.type === 'area' || sel.type === 'symbol')) return toast('Use Turn above to turn the selected item'); if (!SK.sk.areas.length) return toast('Nothing drawn yet'); SK.rotC = null; SK.sel = { type: 'all' }; SK.cursor = null; renderPanel(); }; }
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  // digits act on finger-down and only change the length box, so a quick tap is never missed or doubled
  const showEntry = () => { const en = document.getElementById('skEntry'); if (en) en.textContent = SK.entry ? SK.entry + ' ft' : 'length'; };
  el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); const k = b.dataset.k;
    b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120);
    if (k === '.' && SK.entry.includes('.')) return; if (SK.entry.includes('.') && SK.entry.split('.')[1].length >= 1) return toast('Lengths are to 0.1 ft'); SK.entry += k; showEntry(); }));
  el.querySelectorAll('[data-dx]').forEach(b => b.onclick = () => { if (SK.mode === 'iwall') { const L = parseFloat(SK.entry); if (!SK.iw.start) return toast('Tap where the wall starts first'); if (!(L > 0)) return toast('Type the length first'); const dx = +b.dataset.dx, dy = +b.dataset.dy, n = Math.hypot(dx, dy); const e = [SK.iw.start[0] + dx / n * L, SK.iw.start[1] + dy / n * L]; if (addIWall(SK.iw.start, e)) { SK.iw.prev = SK.iw.start; SK.iw.start = [r3(e[0]), r3(e[1])]; } SK.entry = ''; draw(); renderPanel(); return; } addWall(+b.dataset.dx, +b.dataset.dy); });
  on('skBs', backspace);
  on('skAngle', () => { if (!curArea()) return toast('Start an area first'); const ld = lastDir(); SK.dial = { ang: SK.lastAngle ?? (ld ?? 0) }; renderPanel(); });
  on('skNew', openDefs); on('skClose', closeArea); on('skDone', () => finishArea(false)); on('skLabel', () => openLabels()); on('skFit', () => { fitView(); draw(); }); on('skCenter', centreNow);
  on('skJump', jumpCorner); on('skStartHere', () => placeStart(SK.cursor, true)); on('skStartHere2', () => placeStart(SK.cursor, true)); on('skCurOff', () => { SK.cursor = null; draw(); renderPanel(); });
  on('skNewHere', () => openDefs(true)); on('skLabelHere', () => openLabels(null, SK.cursor));
  on('skCancelStart', () => { SK.mode = 'select'; SK.cursor = null; renderPanel(); draw(); }); on('skCancelLabel', () => { SK.mode = 'select'; renderPanel(); });
  on('skWallSet', () => { const v = parseFloat(document.getElementById('skWallLen').value); const ar = SK.sk.areas.find(x => x.id === sel.id); setWallLength(ar, sel.i, Math.round(v * 10) / 10); });
  on('skWallArea', () => { SK.sel = { type: 'area', id: sel.id }; draw(); renderPanel(); });
  on('skAreaProps', () => openAreaProps(SK.sk.areas.find(x => x.id === sel.id)));
  on('skCopyLv', () => { const a = SK.sk.areas.find(x => x.id === sel.id); openSheet(`<h3>Copy “${esc(a.name || defOf(a.def).name)}” to which level?</h3><p class="help">Same shape, same spot, on the level you pick (this page). Then change any wall that differs.</p><div class="grid-btns">${LEVELS.filter(l => l !== a.level).map(l => `<button class="btn" data-cp="${l}">${LEVEL_NAME(l)}</button>`).join('')}</div><div class="row"><button class="btn" data-close>Cancel</button></div>`, sh => sh.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { closeSheet(); copyAreas([a], b.dataset.cp); })); });
  on('skMovePg', () => { const a = SK.sk.areas.find(x => x.id === sel.id); const L = pageList().filter(x => x.n !== PG(a));
    openSheet(`<h3>Move “${esc(a.name || defOf(a.def).name)}” to another page</h3><p class="help">Labels and symbols inside it go with it.</p><div class="grid-btns col">${L.map(x => `<button class="btn" data-mp="${x.n}">📄 ${esc(x.name)}</button>`).join('')}<button class="btn" data-mp="new">＋ A new page…</button></div><div class="row"><button class="btn" data-close>Cancel</button></div>`, sh => sh.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => {
      const go = n => { pushUndo(); const sh0 = shape(a), from = PG(a); [...SK.sk.labels, ...(SK.sk.symbols || [])].filter(o => o.level === a.level && PG(o) === from && inPoly([o.x, o.y], sh0)).forEach(o => o.pg = n);
        SK.sk.areas.filter(o => o !== a && sameSpot(o, a) && o.pts.every(q => insideOrOn(q, sh0))).forEach(o => o.pg = n); a.pg = n; closeSheet(); goPage(n); SK.sel = { type: 'area', id: a.id }; renderPanel(); draw(); };
      if (b.dataset.mp !== 'new') return go(+b.dataset.mp);
      closeSheet(); askText('New sketch page', 'e.g. Guest house', a.name || defOf(a.def).name, name => { const P = pageList().slice(); const n = Math.max(...P.map(x => x.n)) + 1; P.push({ n, name: name || 'Page ' + n }); SK.sk.pages = P; go(n); }); })); });
  el.querySelectorAll('[data-np]').forEach(b => b.onclick = () => { const a = SK.sk.areas.find(x => x.id === sel.id); pushUndo(); if (b.dataset.np) a.nameAt = b.dataset.np; else delete a.nameAt; markDirty(); draw(); renderPanel(); });
  el.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => rotateSel(+b.dataset.rot * rotStep()));
  const rs = el.querySelector('#rotStep'); if (rs) rs.onchange = () => { SK.lib.rotStep = +rs.value; saveLib(); renderPanel(); };
  on('rotExact', () => askNumber('Turn by how many degrees?', 'Positive turns left (counter-clockwise), negative turns right', '', v => rotateSel(v)));
  on('rotDone', () => { SK.sel = null; SK.rotC = null; snapshotVersion('rotate'); fitView(); draw(); renderPanel(); });
  on('skReopen', () => { const ar = SK.sk.areas.find(x => x.id === sel.id); pushUndo(); ar.closed = false; SK.drawId = ar.id; SK.mode = 'draw'; SK.sel = null; toast('Press ⌫ to remove walls, or add walls with the keypad'); markDirty(); draw(); renderPanel(); });
  on('skDel', () => { if (sel.type === 'label' || sel.type === 'symbol') { deleteSel(); toast((sel.type === 'label' ? 'Label' : 'Symbol') + ' deleted – Undo brings it back'); } else if (confirm('Delete this area?')) deleteSel(); });
  on('skLblEdit', () => openLabels(SK.sk.labels.find(x => x.id === sel.id)));
  on('skSym', () => openSymbols(SK.cursor ? [...SK.cursor] : null));
  on('skDoor', () => openSymbols(null, true));
  on('skIWall', () => { if (curArea()) return toast('Close or stop the current area first'); SK.mode = SK.mode === 'iwall' ? 'select' : 'iwall'; SK.iw = { start: SK.cursor ? [...SK.cursor] : null }; SK.sel = null; SK.cursor = null; draw(); renderPanel(); });
  on('iwDone', () => { SK.mode = 'select'; SK.iw = null; draw(); renderPanel(); }); on('iwBreak', () => { SK.iw.start = null; draw(); renderPanel(); });
  on('iwMore', () => { const w = IW().find(x => x.id === sel.id); if (!w) return; const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.06; const others = IW().filter(x => x !== w && here(x));
    const free = !others.some(x => near(x.a, w.b) || near(x.b, w.b)) ? w.b : !others.some(x => near(x.a, w.a) || near(x.b, w.a)) ? w.a : w.b;   // the open end
    SK.mode = 'iwall'; SK.iw = { start: [...free], prev: free === w.b ? w.a : w.b }; SK.sel = null; draw(); renderPanel(); centreNow(); toast('Keep drawing from the orange point – type a length and tap an arrow, or tap a blue dot'); });
  on('iwArea', () => iwToArea(sel.id));
  on('iwSet', () => { const w = IW().find(x => x.id === sel.id); const v = parseFloat(document.getElementById('iwLen').value); const L = wallLen(w.a, w.b); if (!(v > 0.2) || !L) return; pushUndo(); w.b = [r3(w.a[0] + (w.b[0] - w.a[0]) * v / L), r3(w.a[1] + (w.b[1] - w.a[1]) * v / L)]; markDirty(); draw(); renderPanel(); });
  if (sel && sel.type === 'symbol') { const y = SK.sk.symbols.find(x => x.id === sel.id); const setSz = (k, v) => { if (!(v > 0.4)) return; pushUndo(); y[k] = Math.round(v * 10) / 10; if (y.type === 'spiral') y.h = y.w; if (y.type === 'door' || y.type === 'entry') y.h = y.w; if (y.type === 'dbldoor') y.h = y.w / 2; markDirty(); draw(); renderPanel(); };
    on('syHinge', () => { pushUndo(); y.flip = !y.flip; markDirty(); draw(); }); on('sySwing', () => { pushUndo(); flipSwing(y); markDirty(); draw(); });
    el.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.sz.split(':'); setSz(k, y[k] + +d); });
    const iw = el.querySelector('#syW'); if (iw) iw.onchange = () => setSz('w', parseFloat(iw.value)); const ih = el.querySelector('#syH'); if (ih) ih.onchange = () => setSz('h', parseFloat(ih.value));
    }
  on('skCurve', () => startCurve(SK.sk.areas.find(x => x.id === sel.id), sel.i));
  on('skCurveLast', () => { const ca = curArea(); startCurve(ca, ca.pts.length - 2); });
  on('skFlip', flipEnds); on('skSquare', closeSquare);
  on('skInside', () => { SK.insideOn = !SK.insideOn; renderPanel(); toast(SK.insideOn ? `Inside measurements: ${Math.round(wallT() * 24)} in added to each wall until you turn it off` : 'Back to outside measurements'); });
  on('skWallT', () => askNumber('Wall thickness (inches)', 'Added at each end of a wall you measured inside. Stucco on wood frame is about 6 in.', String(Math.round(wallT() * 12)), v => { if (v > 0 && v < 30) { SK.lib.wallT = v / 12; saveLib(); renderPanel(); } }));
  on('skWallDel', () => removeWall(SK.sk.areas.find(x => x.id === sel.id), sel.i));
  on('skContinue', () => { const ar = SK.sk.areas.find(x => x.id === sel.id); SK.drawId = ar.id; SK.mode = 'draw'; SK.sel = null; toast('Keep drawing from the orange end – ⇄ Other end switches ends'); draw(); renderPanel(); });
  on('skCalcOk', () => { const ar = SK.sk.areas.find(x => x.id === sel.id); pushUndo(); delete ar.calc[sel.i]; markDirty(); draw(); renderPanel(); });
  if (SK.dial) wireDial(el); if (SK.curve) wireCurve(el);
  renderLevels();
}

/* ---------- sheets ---------- */
function openSheet(html, wire) { const bg = document.getElementById('skSheetBg'), sh = document.getElementById('skSheet'); sh.innerHTML = html; bg.hidden = false; sh.querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet); if (wire) wire(sh); }
function closeSheet() { document.getElementById('skSheetBg').hidden = true; }
function askText(title, help, val, fn) {
  openSheet(`<h3>${esc(title)}</h3>${help ? `<p class="help">${esc(help)}</p>` : ''}<input class="txt" id="skTxt" value="${esc(val || '')}" autocomplete="off"><div class="row"><button class="btn primary" id="skTxtOk">OK</button><button class="btn" data-close>Cancel</button></div>`,
    sh => { const i = sh.querySelector('#skTxt'); setTimeout(() => i.focus(), 50); const ok = () => { closeSheet(); fn(i.value.trim()); }; sh.querySelector('#skTxtOk').onclick = ok; i.onkeydown = e => { if (e.key === 'Enter') ok(); }; });
}
function askNumber(title, help, val, fn) {
  openSheet(`<h3>${esc(title)}</h3><p class="help">${esc(help)}</p><input class="txt" id="skNum" inputmode="decimal" value="${esc(val)}"><div class="row"><button class="btn primary" id="skNumOk">OK</button><button class="btn" data-close>Cancel</button></div>`,
    sh => { const i = sh.querySelector('#skNum'); i.focus(); sh.querySelector('#skNumOk').onclick = () => { const v = parseFloat(i.value); if (isNaN(v)) return toast('Enter a number'); closeSheet(); fn(v); }; });
}
function defsHtml(q, pickAttr) {
  const groups = {}; allDefs().filter(d => !q || (d.name + ' ' + d.code).toLowerCase().includes(q)).forEach(d => (groups[d.grp] = groups[d.grp] || []).push(d));
  return Object.entries(groups).map(([g, ds]) => `<h4>${esc(g)}</h4><div class="grid-btns">${ds.map(d => `<button class="btn" ${pickAttr}="${esc(d.id)}"><small>${esc(d.code)}</small> ${esc(d.name)}</button>`).join('')}</div>`).join('') || '<p class="help">No match – add it as a new area type.</p>';
}
function openDefs(atCursor) {
  if (curArea()) return toast('Close or stop the current area first');
  const at = atCursor === true && SK.cursor ? [...SK.cursor] : null;
  openSheet(`<h3>New area – what is it?</h3><p class="help">Living areas count as above or below grade from the level you are on (${LEVEL_NAME(SK.level)}).</p>
    <input class="txt" id="skDefQ" placeholder="Search area types" autocomplete="off"><div id="skDefList">${defsHtml('', 'data-def')}</div>
    <div class="row"><button class="btn" id="skNewDef">+ New area type</button><button class="btn" data-close>Cancel</button></div>`, sh => {
      const go = id => { if (at) { SK.pendingDef = id; placeStart(at, true); toast('Started at the cursor – type a length and an arrow, or drag from the orange point'); } else startArea(id); };
      const wire = () => sh.querySelectorAll('[data-def]').forEach(b => b.onclick = () => { closeSheet(); go(b.dataset.def); });
      sh.querySelector('#skDefQ').oninput = e => { sh.querySelector('#skDefList').innerHTML = defsHtml(e.target.value.trim().toLowerCase(), 'data-def'); wire(); }; wire();
      sh.querySelector('#skNewDef').onclick = () => newDefSheet(id => go(id)); });
}
function newDefSheet(then, preset) {
  openSheet(`<h3>New area type</h3><p class="help">Your name is printed on the sketch. The bucket decides which UAD total the square footage goes into.</p>
    <label>Name <input class="txt" id="ndName" value="${esc(preset || '')}" placeholder="e.g. Meditation Pavilion"></label>
    <label>Short code <input class="txt" id="ndCode" maxlength="5" placeholder="e.g. OTH"></label>
    <h4>Counts toward</h4><div class="grid-btns">${Object.entries(BUCKETS).map(([k, b]) => `<button class="btn" data-bk="${k}">${esc(b.l)}</button>`).join('')}</div>
    <div class="row"><button class="btn" data-close>Cancel</button></div>`, sh => sh.querySelectorAll('[data-bk]').forEach(b => b.onclick = async () => {
      const name = sh.querySelector('#ndName').value.trim(); if (!name) return toast('Type a name first');
      const bk = b.dataset.bk; const code = sh.querySelector('#ndCode').value.trim().toUpperCase() || { LIV: 'FIN', LIVN: 'FIN', UNF: 'UNF', GAR: 'GAR', OUT: 'P/P', OB: 'OTH', ADU: 'ADU', AMEN: 'AMN', NCA: 'NCA' }[bk];
      const grp = { LIV: 'Living area', LIVN: 'Living area', UNF: 'Living area', GAR: 'Garage / carport', OUT: 'Patio / porch', OB: 'Outbuilding', ADU: 'ADU', AMEN: 'Amenity', NCA: 'Not calculated' }[bk];
      const d = { id: 'c_' + uid(), code, name, bucket: bk, grp, custom: true }; SK.lib.defs.push(d); await saveLib(); closeSheet(); toast(`“${name}” saved to your area types`); then(d.id); }));
}
function openAreaProps(a) {
  const d = defOf(a.def);
  openSheet(`<h3>Area properties</h3>
    <label>Name on the sketch <input class="txt" id="apName" value="${esc(a.name || '')}" placeholder="${esc(d.name)}"></label>
    <p><b>Type:</b> ${esc(d.code)} – ${esc(d.name)} · <span class="help">${esc(BUCKETS[d.bucket].l)}</span></p>
    <h4>Change type</h4><input class="txt" id="apQ" placeholder="Search area types"><div id="apList" class="scrolly">${defsHtml('', 'data-apdef')}</div>
    <h4>Level</h4><div class="grid-btns">${LEVELS.map(l => `<button class="btn ${l === a.level ? 'primary' : ''}" data-aplv="${l}">${LEVEL_NAME(l)}</button>`).join('')}</div>
    <div class="row"><button class="btn primary" id="apSave">Save</button><button class="btn" id="apNewDef">+ New area type</button><button class="btn" data-close>Cancel</button></div>`, sh => {
      let pick = a.def, lv = a.level;
      const wire = () => sh.querySelectorAll('[data-apdef]').forEach(b => b.onclick = () => { pick = b.dataset.apdef; sh.querySelectorAll('[data-apdef]').forEach(x => x.classList.toggle('primary', x === b)); });
      sh.querySelector('#apQ').oninput = e => { sh.querySelector('#apList').innerHTML = defsHtml(e.target.value.trim().toLowerCase(), 'data-apdef'); wire(); }; wire();
      sh.querySelectorAll('[data-aplv]').forEach(b => b.onclick = () => { lv = b.dataset.aplv; sh.querySelectorAll('[data-aplv]').forEach(x => x.classList.toggle('primary', x === b)); });
      sh.querySelector('#apNewDef').onclick = () => newDefSheet(id => { pushUndo(); a.def = id; markDirty(); draw(); renderPanel(); });
      sh.querySelector('#apSave').onclick = () => { pushUndo(); a.name = sh.querySelector('#apName').value.trim() || undefined; a.def = pick; if (lv !== a.level) { a.level = lv; SK.level = lv; } closeSheet(); markDirty(); draw(); renderPanel(); };
    });
}
/* ---------- room labels: the same rooms as the inspection's Interior tab ---------- */
const ROOM_WORDS = [
  [/^(bed|bedroom|bedroom \d+|primary|primary suite|primary bedroom|guest suite|suite|guest room)$/i, { list: 'bedrooms' }],
  [/^(1\/2|1\/2 bath|half bath|half bath \d+|powder|powder room|powder room \d+)$/i, { list: 'baths', kind: 'HalfBathroom' }],
  [/^(bath|bath \d+|full bath|full bath \d+|primary bath|pool bath|guest bath)$/i, { list: 'baths', kind: 'FullBathroom' }],
  [/^kitchen( \d+)?$/i, { list: 'kitchens' }], [/^wet bar$/i, { list: 'wetbars' }],
  [/^(living|living room)$/i, { list: 'rooms', type: 'Living Room' }], [/^(family|family room)$/i, { list: 'rooms', type: 'Family Room' }],
  [/^(dining|dining room)$/i, { list: 'rooms', type: 'Dining Room' }], [/^(b-fast|breakfast|breakfast room|nook)$/i, { list: 'rooms', type: 'Breakfast Room' }],
  [/^(rec\.?|recreation|recreation room|game room)$/i, { list: 'rooms', type: 'Recreation Room' }], [/^(media|media room|theater)$/i, { list: 'rooms', type: 'Media Room' }],
  [/^(laundry|lndry|laundry room)$/i, { list: 'rooms', type: 'Laundry Room' }], [/^(mud room|mudroom)$/i, { list: 'rooms', type: 'Mudroom' }],
  [/^(pantry|pntry|walk-in pantry)$/i, { list: 'rooms', type: 'Walk-In Pantry' }], [/^butler'?s( pantry)?$/i, { list: 'rooms', type: "Butler's Pantry" }],
  [/^(sitting|sitting room)$/i, { list: 'rooms', type: 'Sitting Room / Area' }], [/^gym$/i, { list: 'rooms', type: 'Gym' }], [/^loft$/i, { list: 'rooms', type: 'Loft' }],
  [/^den$/i, { list: 'rooms', type: 'Den' }], [/^office$/i, { list: 'rooms', type: 'Office' }], [/^study$/i, { list: 'rooms', type: 'Study' }], [/^library$/i, { list: 'rooms', type: 'Library' }],
];
const ROOM_KINDS = () => [['Bedroom', { list: 'bedrooms' }], ['Full Bath', { list: 'baths', kind: 'FullBathroom' }], ['Half Bath', { list: 'baths', kind: 'HalfBathroom' }], ['Kitchen', { list: 'kitchens' }], ['Wet Bar', { list: 'wetbars' }],
  ...ROOM_TYPES.filter(t => t !== 'Other').map(t => [t, { list: 'rooms', type: t }]), ...((SK.lib.customRooms || []).map(t => [t, { list: 'rooms', type: 'Other', name: t }]))];
function roomFor(text) {
  const k = (SK.lib.labelKinds || {})[text]; if (k === 'label') return null; if (k) return { ...k };
  const hit = ROOM_WORDS.find(([rx]) => rx.test(text.trim())); if (hit) return { ...hit[1] };
  const t = ROOM_TYPES.find(x => x !== 'Other' && x.toLowerCase() === text.trim().toLowerCase()); if (t) return { list: 'rooms', type: t };
  if ((SK.lib.customRooms || []).includes(text)) return { list: 'rooms', type: 'Other', name: text };
  return null;
}
const roomWord = r => !r ? 'label only' : r.list === 'bedrooms' ? 'bedroom' : r.list === 'baths' ? (r.kind === 'HalfBathroom' ? 'half bath' : 'full bath') : r.list === 'kitchens' ? 'kitchen' : r.list === 'wetbars' ? 'wet bar' : (r.type === 'Other' ? (r.name || 'room') : r.type).toLowerCase();
/* Bedroom 1, Bedroom 2… Bath 1, Bath 2… Half Bath 1… numbered in the order you add them */
function numberedRoom(text, room) {
  if (!/^(bed|bedroom|bath|full bath|half bath|1\/2|1\/2 bath|powder|powder room)$/i.test(String(text).trim())) return text;
  if (!['bedrooms', 'baths'].includes(room.list)) return text;
  const n = SK.sk.labels.filter(l => l.room && !l.room.gone && l.room.list === room.list && (room.list !== 'baths' || l.room.kind === room.kind)).length + 1;
  const word = room.list === 'bedrooms' ? 'Bedroom' : room.kind === 'HalfBathroom' ? (/^powder/i.test(text) ? 'Powder Room' : 'Half Bath') : 'Bath';
  return word + ' ' + n;
}
/* Capitalize each word except the small ones (a, an, the, and, are, for, but…); the first word is always capitalized */
const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'for', 'of', 'on', 'in', 'at', 'to', 'by', 'with', 'are', 'is', 'as', 'per', 'from', 'into', 'via']);
function titleWords(s) { return String(s || '').split(/(\s+)/).map((w, i) => { if (/^\s+$/.test(w) || !w) return w; const lw = w.toLowerCase(); if (i > 0 && SMALL_WORDS.has(lw)) return lw; return w.charAt(0).toUpperCase() + w.slice(1); }).join(''); }
const LABEL_WORDS = ['Approximate', 'Measurements', 'Not', 'Scale', 'To', 'Primary', 'Guest', 'Suite', 'Closet', 'Walk-In', 'Storage', 'Laundry', 'Pantry', "Butler's", 'Mudroom', 'Entry', 'Foyer', 'Hall', 'Hallway', 'Stairs', 'Landing', 'Office', 'Study', 'Library', 'Den', 'Bonus', 'Room', 'Sitting', 'Area', 'Sun', 'Family', 'Living', 'Dining', 'Breakfast', 'Nook', 'Kitchen', 'Bar', 'Wine', 'Cellar', 'Gym', 'Media', 'Theater', 'Game', 'Recreation', 'Studio', 'Workshop', 'Mechanical', 'Utility', 'Garage', 'Carport', 'Deck', 'Patio', 'Porch', 'Balcony', 'Terrace', 'Loggia', 'Courtyard', 'Pool', 'Cabana', 'Spa', 'Shower', 'Powder', 'Bath', 'Bedroom', 'Dressing', 'Nursery', 'Loft', 'Attic', 'Basement', 'Crawl', 'Space', 'Unfinished', 'Finished', 'Converted', 'Addition', 'Upper', 'Lower', 'Level', 'Main', 'Second', 'Third', 'Detached', 'Attached', 'ADU', 'JADU', 'Guest House', 'Pool House', 'Barn', 'Stable', 'Tack', 'Greenhouse', 'Shed', 'Scullery', 'Gift', 'Wrap', 'Craft', 'Sewing', 'Music', 'Art', 'Elevator', 'Vestibule', 'Gallery', 'Great'];
function wireSuggest(inp, box) {
  const vocab = () => [...new Set([...allLabels(), ...ROOM_KINDS().map(([n]) => n), ...LABEL_WORDS])];
  const show = () => {
    const v = inp.value; const low = v.trim().toLowerCase(); if (!low) { box.innerHTML = ''; return; }
    const whole = vocab().filter(w => w.toLowerCase().startsWith(low) && w.toLowerCase() !== low).slice(0, 5);
    const m = v.match(/^(.*?)(\S+)$/); const words = [];
    if (m && m[1]) { const part = m[2].toLowerCase(); LABEL_WORDS.concat(allLabels()).filter(w => !/\s/.test(w) && w.toLowerCase().startsWith(part) && w.toLowerCase() !== part).slice(0, 5).forEach(w => words.push(titleWords(m[1] + w))); }
    const list = [...new Set([...whole, ...words])].slice(0, 8);
    box.innerHTML = list.map(s => `<button type="button" class="btn sm sug" data-sug="${esc(s)}">${esc(s)}</button>`).join('');
    box.querySelectorAll('[data-sug]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); inp.value = b.dataset.sug + ' '; inp.focus(); show(); }));
  };
  inp.addEventListener('input', () => { const pos = inp.selectionStart, before = inp.value; const tc = titleWords(before); if (tc !== before) { inp.value = tc; try { inp.setSelectionRange(pos, pos); } catch (e) {} } show(); });
  show();
}
function itemName(list, it) { const L = (SK.ins.lists || {})[list] || []; const i = L.indexOf(it); try { return LISTS[list].name(it, i, L); } catch (e) { return it.label || list; } }
function unplacedItems() { // rooms already in the inspection that are not on the sketch yet
  const linked = new Set(SK.sk.labels.filter(l => l.room && l.room.id).map(l => l.room.id)); const out = [];
  const pendingKitchen = SK.sk.labels.some(l => l.room && !l.room.id && l.room.list === 'kitchens');
  ['bedrooms', 'baths', 'kitchens', 'wetbars', 'rooms'].forEach(list => ((SK.ins.lists || {})[list] || []).forEach(it => { if (!linked.has(it.id) && !(list === 'rooms' && !it.type) && !(pendingKitchen && list === 'kitchens' && !it.fromSketch)) out.push({ list, it, name: itemName(list, it), lv: it.level }); }));
  return out;
}
function openLabels(editing, at) {
  openSheet(`<h3>${editing ? 'Change label' : 'Add a label or room'}</h3><div class="row"><input class="txt" id="lbQ" placeholder="Search" autocomplete="off" style="flex:1"><button class="btn primary" id="lbNew">＋ New label or room</button></div>
    <div id="lbList" class="scrolly tall"></div><div class="row"><button class="btn" id="lbUse">Use what I typed…</button>${editing ? '<button class="btn" id="lbPlain">Make this a label only</button>' : ''}<button class="btn" data-close>Cancel</button></div>`, sh => {
      const q = sh.querySelector('#lbQ');
      const lvName = l => { const e = Object.entries(LEVEL_UAD).find(([, u]) => u === l); return e ? LEVEL_NAME(e[0]) : ''; };
      const list = () => { const t = q.value.trim().toLowerCase(); const m = x => !t || x.toLowerCase().includes(t);
        const un = unplacedItems().filter(x => m(x.name)); const rk = ROOM_KINDS().filter(([n]) => m(n)); const lb = allLabels().filter(m);
        sh.querySelector('#lbList').innerHTML =
          (un.length ? `<h4>Already in this inspection – put on the sketch</h4><div class="grid-btns">${un.map((x, i) => `<button class="btn room" data-un="${i}">${esc(x.name)}${x.lv ? ` <small>${esc(lvName(x.lv))}</small>` : ''}</button>`).join('')}</div>` : '') +
          (rk.length ? `<h4>Add a room (creates it on the Interior tab)</h4><div class="grid-btns">${rk.map(([n], i) => `<button class="btn room" data-rk="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : '') +
          (lb.length ? `<h4>My labels</h4><div class="grid-btns">${lb.map(l => { const r = roomFor(l); return `<button class="btn ${r ? 'room' : ''}" data-lb="${esc(l)}">${esc(l)}${r ? ` <small>${esc(roomWord(r))}</small>` : ''}</button>`; }).join('')}</div>` : '');
        sh.querySelectorAll('[data-un]').forEach(b => b.onclick = () => { const x = un[+b.dataset.un]; use(x.name, { list: x.list, id: x.it.id, kind: x.it.kind, type: x.it.type }); });
        sh.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { const r = ROOM_KINDS().find(([n]) => n === b.dataset.rk); use(b.dataset.rk, { ...r[1] }); });
        sh.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => use(b.dataset.lb, roomFor(b.dataset.lb))); };
      const use = (text, room) => { closeSheet(); if (/^master\b/i.test(text)) toast('Tip: “Master” is flagged as bias wording – “Primary” is suggested');
        if (!editing && room) text = numberedRoom(text, room);
        if (editing) { pushUndo(); editing.text = text; editing.room = room || null; markDirty(); draw(); renderPanel(); return; }
        if (at) { placeLabel(text, room, at); return; }
        SK.pendingLabel = { text, room }; SK.mode = 'label'; SK.sel = null; renderPanel(); };
      q.oninput = list; list();
      const pl = sh.querySelector('#lbPlain'); if (pl) pl.onclick = () => { closeSheet(); pushUndo(); editing.room = null; markDirty(); draw(); renderPanel(); };
      const newOne = pre => { const t0 = (pre || '').trim();
        openSheet(`<h3>New label or room</h3><label>Name <input class="txt" id="ntName" value="${esc(titleWords(t0))}" placeholder="e.g. Scullery, Gift Wrap Room, Wine Grotto" autocomplete="off" autocapitalize="words" autocorrect="on" spellcheck="true"></label><div class="sugs" id="ntSug"></div><p class="help">What is it? Rooms are added to the Interior tab. The app remembers your answer for next time.</p>
          <div class="grid-btns col"><button class="btn room" id="ntRoom">A room – add it to the Interior tab</button><button class="btn room" id="ntBed">A bedroom</button><button class="btn room" id="ntFull">A full bath</button><button class="btn room" id="ntHalf">A half bath</button><button class="btn" id="ntLabel">Just a label on the drawing</button></div><div class="row"><button class="btn" data-close>Cancel</button></div>`, sh2 => {
            const nameOf = () => titleWords(sh2.querySelector('#ntName').value.trim()); setTimeout(() => sh2.querySelector('#ntName').focus(), 50);
            wireSuggest(sh2.querySelector('#ntName'), sh2.querySelector('#ntSug'));
            const save = kind => { const t = nameOf(); if (!allLabels().includes(t)) SK.lib.labels.push(t); SK.lib.labelKinds = SK.lib.labelKinds || {}; SK.lib.labelKinds[t] = kind || 'label'; if (kind && kind.type === 'Other') { SK.lib.customRooms = SK.lib.customRooms || []; if (!SK.lib.customRooms.includes(t)) SK.lib.customRooms.push(t); } saveLib(); };
            const go = k => { const t = nameOf(); if (!t) return toast('Type the name first'); save(k); use(t, k ? { ...k } : null); };
            sh2.querySelector('#ntRoom').onclick = () => go({ list: 'rooms', type: 'Other', name: nameOf() });
            sh2.querySelector('#ntBed').onclick = () => go({ list: 'bedrooms' }); sh2.querySelector('#ntFull').onclick = () => go({ list: 'baths', kind: 'FullBathroom' }); sh2.querySelector('#ntHalf').onclick = () => go({ list: 'baths', kind: 'HalfBathroom' });
            sh2.querySelector('#ntLabel').onclick = () => go(null); }); };
      sh.querySelector('#lbNew').onclick = () => newOne(q.value); sh.querySelector('#lbUse').onclick = () => newOne(q.value);
    });
}
function placeSymbol(type, pt) { const d = SYMBOLS[type]; pushUndo(); const y = { id: uid(), type, x: r3(pt[0]), y: r3(pt[1]), w: d.w, h: d.h, rot: 0, level: SK.level, pg: SK.pg }; if (DOORISH(type) && !seatDoor(y, pt)) toast('Tip: drop a door right on a wall and it lines up by itself'); SK.sk.symbols = SK.sk.symbols || []; SK.sk.symbols.push(y); SK.mode = 'select'; SK.cursor = null; SK.sel = { type: 'symbol', id: y.id }; markDirty(); draw(); renderPanel(); }
function openSymbols(at, doors) {
  openSheet(`<h3>${doors ? 'Add a door or opening' : 'Add a symbol'}</h3><p class="help">${doors ? 'Tap one, then tap on the wall where it goes; it lines up with the wall and opens into the room. Change the width, hinge side and swing afterwards.' : 'Tap one, then tap where it goes. You can resize and rotate it afterwards.'}</p><div class="grid-btns">${Object.entries(SYMBOLS).filter(([k]) => doors ? DOORISH(k) : !DOORISH(k)).map(([k, d]) => `<button class="btn symb" data-sym="${k}"><canvas width="64" height="48" data-prev="${k}"></canvas>${esc(d.n)}</button>`).join('')}</div><div class="row"><button class="btn" data-close>Cancel</button></div>`, sh => {
    sh.querySelectorAll('[data-prev]').forEach(c => { const d = SYMBOLS[c.dataset.prev]; const k = Math.min(56 / d.w, 40 / d.h); drawSymbol(c.getContext('2d'), { type: c.dataset.prev, x: 0, y: 0, w: d.w, h: d.h, rot: 0 }, () => [32, 24], k, false); });
    sh.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => { closeSheet(); if (at) return placeSymbol(b.dataset.sym, at); SK.pendingSym = b.dataset.sym; SK.mode = 'symbol'; SK.sel = null; renderPanel(); }); });
}
function placeLabel(text, room, pt) { pushUndo(); const l = { id: uid(), text, room: room || null, x: r3(pt[0]), y: r3(pt[1]), level: SK.level, pg: SK.pg }; SK.sk.labels.push(l); SK.mode = 'select'; SK.cursor = null; SK.sel = { type: 'label', id: l.id }; draw(); renderPanel(); if (room) saveSketch(); else markDirty(); }
/* keep the inspection's rooms and levels in step with the sketch (called on every save) */
function syncRooms(ins) {
  let changed = false; const U = LEVEL_UAD; ins.lists = ins.lists || {};
  const linkedIds = new Set(SK.sk.labels.filter(l => l.room && l.room.id).map(l => l.room.id));
  SK.sk.labels.forEach(l => { const r = l.room; if (!r) return; const L = ins.lists[r.list] = ins.lists[r.list] || []; const lv = U[l.level];
    if (r.id) { const it = L.find(x => x.id === r.id); if (it) { if (it.fromSketch === l.id && it.level !== lv) { it.level = lv; } r.gone = false; } else if (!r.gone) { r.gone = true; changed = true; } return; }
    const generic = /^(bed|bedroom|bath|1\/2|1\/2 bath|kitchen|wet bar|half bath|full bath|powder room)( \d+)?$/i.test(l.text.trim());
    const same = it => !linkedIds.has(it.id) && (r.list !== 'baths' || it.kind === r.kind) && (r.list !== 'rooms' || (it.type === r.type && (r.type !== 'Other' || it.label === r.name)));
    let it = r.list === 'kitchens' ? L.find(x => same(x) && !x.fromSketch) : L.find(x => same(x) && x.level === lv && (generic || !x.label || x.label === l.text));
    if (!it) { it = { id: uid(), level: lv, fromSketch: l.id };
      if (r.list === 'rooms') { it.type = r.type; if (r.type === 'Other') it.label = r.name || l.text; else if (l.text.toLowerCase() !== r.type.toLowerCase() && !ROOM_WORDS.some(([rx, k]) => rx.test(l.text) && k.type === r.type)) it.label = l.text; }
      if (r.list === 'baths') it.kind = r.kind; if (!generic && r.list !== 'rooms') it.label = l.text; L.push(it); }
    else if (!it.level) it.level = lv;
    r.id = it.id; linkedIds.add(it.id); changed = true; });
  // levels used by living areas and rooms appear in the inspection's Levels list
  const used = new Set([...SK.sk.areas.filter(a => a.closed && ['LIV', 'LIVN', 'UNF'].includes(defOf(a.def).bucket)).map(a => a.level), ...SK.sk.labels.filter(l => l.room).map(l => l.level)]);
  const have = new Set((ins.lists.levels = ins.lists.levels || []).map(x => x.level));
  used.forEach(lv => { if (!have.has(U[lv])) { ins.lists.levels.push({ id: uid(), level: U[lv], grade: below(lv) ? undefined : 'AboveGrade', fromSketch: true }); } });
  ins.sketch = ins.sketch || {}; ins.sketch.labelIds = SK.sk.labels.map(l => l.id);
  return changed;
}
function openTotals() {
  const T = totals(); const f = n => (n || 0).toLocaleString();
  const lv = Object.entries(T.levels).sort((a, b) => LEVELS.indexOf(a[0]) - LEVELS.indexOf(b[0]));
  const row = (l, v) => `<tr><td>${esc(l)}</td><td class="n">${f(v)}</td></tr>`;
  openSheet(`<h3>Area totals (UAD 3.6)</h3><table class="tot"><tbody>
    ${row('Finished above grade', T.agFin)}${T.agNon ? row('Finished above grade – nonstandard', T.agNon) : ''}${row('Unfinished above grade', T.agUnf)}
    ${row('Finished below grade', T.bgFin)}${T.bgNon ? row('Finished below grade – nonstandard', T.bgNon) : ''}${row('Unfinished below grade', T.bgUnf)}</tbody></table>
    <h4>By level</h4><table class="tot"><thead><tr><th>Level</th><th class="n">Finished</th><th class="n">Nonstd.</th><th class="n">Unfinished</th></tr></thead><tbody>
    ${lv.map(([l, v]) => `<tr><td>${LEVEL_NAME(l)}${below(l) ? ' (below grade)' : ''}</td><td class="n">${f(v.fin)}</td><td class="n">${f(v.non)}</td><td class="n">${f(v.unf)}</td></tr>`).join('') || '<tr><td colspan="4">No living areas yet</td></tr>'}</tbody></table>
    ${[['Garage / carport', T.gar], ['Outdoor living', T.out], ['Outbuildings', T.ob], ['ADUs', T.adu], ['Amenities', T.amen]].filter(([, a]) => a.length).map(([h, a]) => `<h4>${h}</h4><table class="tot"><tbody>${a.map(x => row(x.name, x.sf)).join('')}</tbody></table>`).join('')}
    <details><summary><b>Show the calculations</b> (as printed on the sketch image)</summary>${calcAll().map(x => `<p class="calc"><b>${esc(x.code)} ${esc(x.name)} · ${esc(LEVEL_NAME(x.level))}</b><br>${x.lines.map(l => `${esc(l.t)} = ${l.a.toFixed(1)}`).join('<br>')}${x.less.map(k => `<br>less ${esc(k.name)} = −${k.a.toFixed(1)}`).join('')}<br><b>= ${x.net.toLocaleString()} sf</b></p>`).join('')}</details>
    <h4>Rooms on the sketch</h4><p>${(() => { const r = SK.sk.labels.filter(l => l.room && !l.room.gone); const c = k => r.filter(k).length; return `${c(l => l.room.list === 'bedrooms')} bedrooms · ${c(l => l.room.list === 'baths' && l.room.kind === 'FullBathroom')} full baths · ${c(l => l.room.list === 'baths' && l.room.kind === 'HalfBathroom')} half baths · ${c(l => l.room.list === 'kitchens')} kitchen(s) · ${c(l => l.room.list === 'rooms')} other rooms`; })()}</p>
    <p class="help">Areas drawn inside another area on the same level (for example a garage inside the house outline) are subtracted from it. Totals go to the inspection when you press Back or Save to inspection.</p>
    <div class="row"><button class="btn primary" id="tSend">Save totals + sketch image to inspection</button><button class="btn" data-close>Close</button></div>`, sh => sh.querySelector('#tSend').onclick = () => { closeSheet(); sendNow(); });
}
function openMenu() {
  openSheet(`<h3>Menu</h3><div class="grid-btns col">
    <button class="btn primary" id="mSend">${SK.sentClean ? 'Saved to inspection ✓ – save again' : 'Send: save totals + sketch image to the inspection'}</button>
    <button class="btn" id="mSave">Save now</button>
    <button class="btn" id="mRedo">↷ Redo</button>
    <button class="btn" id="mClone">⧉ Clone this level for another story…</button>
    <button class="btn" id="mLevel">+ Add a level</button>
    <button class="btn" id="mPage">+ Add a sketch page</button>
    <button class="btn" id="mDots">Line-up dots: ${SK.showDots === false ? 'off – turn on' : 'on – turn off'}</button>
    <button class="btn" id="mFit">Fit the whole sketch on screen</button>
    <div class="lrow"><span><b>Text size</b> (area names, labels) ${Math.round(TS() * 100)}%</span><span><button class="btn sm" data-ts="-0.1">A−</button> <button class="btn sm" data-ts="0.1">A+</button></span></div>
    <div class="lrow"><span><b>Dimension size</b> (wall lengths) ${Math.round(DS() * 100)}%</span><span><button class="btn sm" data-ds="-0.1">A−</button> <button class="btn sm" data-ds="0.1">A+</button></span></div>
    <div class="lrow"><span><b>Area colors</b> (on screen and printed) – ${SK.lib.fills === false ? 'off' : 'on'}</span><button class="btn sm" id="mFills">${SK.lib.fills === false ? 'Turn on' : 'Turn off'}</button></div>
    <button class="btn" id="mUnder">Floor plan underlay (trace over a plan)…</button>
    <button class="btn" id="mRotAll">Turn the whole sketch</button>
    <button class="btn" id="mVers">Saved versions (restore)</button>
    <button class="btn" id="mTypes">My area types and labels</button>
    <button class="btn" id="mExport">Export my area types and labels</button>
    <label class="btn">Import area types and labels<input type="file" id="mImport" accept=".json,application/json" hidden></label>
    </div><p class="help">Version ${typeof BUILD !== 'undefined' ? BUILD : '?'}</p><div class="row"><button class="btn" data-close>Close</button></div>`, sh => {
      sh.querySelector('#mSend').onclick = () => { closeSheet(); sendNow(); };
      sh.querySelector('#mSave').onclick = async () => { closeSheet(); clearTimeout(saveTimer); await saveSketch(); toast('Saved'); };
      sh.querySelector('#mRedo').onclick = () => { closeSheet(); doRedo(); };
      sh.querySelector('#mLevel').onclick = () => { closeSheet(); const b = document.getElementById('skAddLv'); if (b) b.click(); };
      sh.querySelector('#mPage').onclick = () => { closeSheet(); const b = document.getElementById('skAddPg'); if (b) b.click(); };
      sh.querySelector('#mDots').onclick = () => { closeSheet(); const b = document.getElementById('skDots'); if (b) b.click(); };
      sh.querySelector('#mFit').onclick = () => { closeSheet(); fitView(); draw(); };
      sh.querySelector('#mClone').onclick = () => { if (SK.drawId) { closeSheet(); return toast('Finish or close the area you are drawing first'); }
        const src = SK.sk.areas.filter(a => here(a) && a.closed); if (!src.length) { closeSheet(); return toast('Nothing closed on ' + LEVEL_NAME(SK.level) + ' to clone yet'); }
        const used = new Set(SK.sk.areas.filter(a => PG(a) === SK.pg).map(a => a.level));
        openSheet(`<h3>Clone ${LEVEL_NAME(SK.level)} for another story</h3><p class="help">Copies every closed area on ${LEVEL_NAME(SK.level)} (${src.map(a => esc(a.name || defOf(a.def).name)).join(', ')}) to the level you pick, in the same spot. Each copy is an ordinary area: tap it › Edit walls to change the walls that differ, or delete the ones that are not on that floor (a garage, a porch).</p>
          <div class="grid-btns">${LEVELS.filter(l => l !== SK.level).map(l => `<button class="btn ${used.has(l) ? 'dim' : ''}" data-cl="${l}">${LEVEL_NAME(l)}${used.has(l) ? ' <small>has areas</small>' : ''}</button>`).join('')}</div><div class="row"><button class="btn" data-close>Cancel</button></div>`,
          s2 => s2.querySelectorAll('[data-cl]').forEach(b => b.onclick = () => { const to = b.dataset.cl; if (used.has(to) && !confirm(LEVEL_NAME(to) + ' already has areas. Add the copies on top of them?')) return; closeSheet(); copyAreas(src, to); })); };
      const sc = (k, d) => { SK.lib[k] = Math.max(0.6, Math.min(2.5, Math.round(((SK.lib[k] || 1) + d) * 10) / 10)); saveLib(); draw(); openMenu(); };
      sh.querySelectorAll('[data-ts]').forEach(b => b.onclick = () => sc('textScale', +b.dataset.ts)); sh.querySelectorAll('[data-ds]').forEach(b => b.onclick = () => sc('dimScale', +b.dataset.ds));
      sh.querySelector('#mFills').onclick = () => { SK.lib.fills = SK.lib.fills === false; saveLib(); draw(); openMenu(); };
      sh.querySelector('#mUnder').onclick = () => { closeSheet(); openUnderlay(); };
      sh.querySelector('#mRotAll').onclick = () => { closeSheet(); if (!SK.sk.areas.length) return toast('Nothing drawn yet'); SK.rotC = null; SK.sel = { type: 'all' }; SK.cursor = null; renderPanel(); };
      sh.querySelector('#mVers').onclick = openVersions;
      sh.querySelector('#mTypes').onclick = openMyTypes;
      sh.querySelector('#mExport').onclick = () => { const b = new Blob([JSON.stringify({ kind: 'sketch-library', defs: SK.lib.defs, labels: SK.lib.labels, hidden: SK.lib.hidden }, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'sketch-area-types-and-labels.json'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
      sh.querySelector('#mImport').onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); if (j.kind !== 'sketch-library') throw 0; const ids = new Set(SK.lib.defs.map(d => d.id)); (j.defs || []).forEach(d => { if (!ids.has(d.id)) SK.lib.defs.push(d); }); SK.lib.labels = [...new Set([...SK.lib.labels, ...(j.labels || [])])]; await saveLib(); closeSheet(); toast('Imported'); } catch (x) { toast('That is not a sketch library file'); } };
    });
}
function openVersions() {
  const v = (SK.sk.versions || []).slice().reverse();
  openSheet(`<h3>Saved versions</h3><p class="help">A version is kept each time you close an area, delete, or rotate (and about once a minute while you work). Restoring keeps your current drawing as a version too.</p>
    <div class="grid-btns col">${v.map((x, i) => `<button class="btn" data-ver="${v.length - 1 - i}">${new Date(x.ts).toLocaleString()} · ${x.areas.length} area${x.areas.length === 1 ? '' : 's'} · ${esc(x.why)}</button>`).join('') || '<p class="help">No versions yet.</p>'}</div>
    <div class="row"><button class="btn" data-close>Close</button></div>`, sh => sh.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { const x = SK.sk.versions[+b.dataset.ver]; snapshotVersion('before restore'); pushUndo(); SK.sk.areas = JSON.parse(JSON.stringify(x.areas)); SK.sk.labels = JSON.parse(JSON.stringify(x.labels)); SK.sk.symbols = JSON.parse(JSON.stringify(x.symbols || [])); SK.sk.iwalls = JSON.parse(JSON.stringify(x.iwalls || [])); SK.sel = null; closeSheet(); markDirty(); renderLevels(); fitView(); draw(); renderPanel(); toast('Version restored'); }));
}
function openMyTypes() {
  openSheet(`<h3>My area types and labels</h3><h4>Area types I added</h4>
    <div class="grid-btns col">${SK.lib.defs.map(d => `<div class="lrow"><span><small>${esc(d.code)}</small> ${esc(d.name)} – ${esc(BUCKETS[d.bucket].l)}</span><button class="btn sm danger" data-rmdef="${esc(d.id)}">Remove</button></div>`).join('') || '<p class="help">None yet. Use “+ New area type”.</p>'}</div>
    <h4>Labels I added</h4><div class="grid-btns col">${SK.lib.labels.map(l => `<div class="lrow"><span>${esc(l)}</span><button class="btn sm danger" data-rmlb="${esc(l)}">Remove</button></div>`).join('') || '<p class="help">None yet.</p>'}</div>
    <p class="help">Removing a type does not change areas already drawn with it.</p><div class="row"><button class="btn" data-close>Close</button></div>`, sh => {
      sh.querySelectorAll('[data-rmdef]').forEach(b => b.onclick = async () => { SK.lib.defs = SK.lib.defs.filter(d => d.id !== b.dataset.rmdef); SK.lib.hidden = SK.lib.hidden || []; await saveLib(); openMyTypes(); });
      sh.querySelectorAll('[data-rmlb]').forEach(b => b.onclick = async () => { SK.lib.labels = SK.lib.labels.filter(l => l !== b.dataset.rmlb); await saveLib(); openMyTypes(); });
    });
}

/* ---------- sketch image (all levels side by side + area table) ---------- */
/* ---------- sketch pages (Apex-style, letter size, as many pages as needed) ---------- */
const PAGE_SIZE = { W: 1700, H: 2200, M: 70 };   // 8.5 x 11 in at 200 dpi
const perim = a => walls(a).reduce((t, [i, p, q]) => { const ar = arcOf(a, i); const g = ar && arcGeom(p, q, ar.h, ar.side); return t + (g ? g.len : wallLen(p, q)); }, 0);
function summaryRows() { // Apex "Area Calculations Summary": living by level, then every other area
  const C = computeAreas(); const rows = []; const lvls = [...new Set(C.list.map(a => a.level))].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b));
  const lvCode = lv => lv.replace('L', '');
  [['LIV', 'FIN', 'finished'], ['LIVN', 'NST', 'finished – nonstandard'], ['UNF', 'UNF', 'unfinished']].forEach(([bk, code, word]) => lvls.forEach(lv => {
    const A = C.list.filter(a => a.level === lv && defOf(a.def).bucket === bk); if (!A.length) return;
    const net = A.reduce((t, a) => t + C.net.get(a.id), 0); rows.push({ code: code + lvCode(lv), desc: `${LEVEL_NAME(lv)} ${word}${below(lv) ? ' (below grade)' : ''}`, size: net, per: A.reduce((t, a) => t + perim(a), 0), bk, lv }); }));
  C.list.filter(a => !['LIV', 'LIVN', 'UNF'].includes(defOf(a.def).bucket)).forEach(a => rows.push({ code: defOf(a.def).code, desc: (a.name || defOf(a.def).name) + (a.level !== 'L1' ? ' · ' + LEVEL_NAME(a.level) : ''), size: C.net.get(a.id), per: perim(a), bk: defOf(a.def).bucket }));
  return rows;
}
function breakdownRows() { // Apex "Area Calculations Breakdown": finished above grade first (adds to the total), then other areas
  const rowsFor = x => { const out = []; let first = true; const nm = () => { const t = first ? `${x.name} · ${LEVEL_NAME(x.level)}` : ''; first = false; return t; };
    calcBreakdown(SK.sk.areas.find(a => a.id === x.id)).forEach(l => { let m;
      if ((m = l.t.match(/^½ × \((\S+) \+ (\S+)\) × (\S+)$/))) out.push([nm(), '0.5', m[3], f1(+m[1] + +m[2]), l.a]);
      else if ((m = l.t.match(/^½ × (\S+) × (\S+)$/))) out.push([nm(), '0.5', m[2], m[1], l.a]);
      else if ((m = l.t.match(/^(\S+) × (\S+)$/))) out.push([nm(), '', m[2], m[1], l.a]);
      else out.push([nm(), '', l.t.replace(/^(less )?curve: /, '$1curve ').replace(', radius', ' · r'), '', l.a]); });
    x.less.forEach(k => out.push([nm(), '', `less ${k.name}`, '', -k.a])); return out; };
  const all = calcAll(); const main = all.filter(x => x.bucket === 'LIV' && !below(x.level)), rest = all.filter(x => !(x.bucket === 'LIV' && !below(x.level)));
  const rows = main.flatMap(rowsFor); rows.mainCount = rows.length;
  if (rest.length) { rows.push(['— Other areas (not in the total) —', '', '', '', null]); rest.forEach(x => rows.push(...rowsFor(x))); }
  return rows;
}
function drawLevelBlock(g, k, X0, Y0, s, bb, C) { // one level's drawing at scale s with its top-left at X0,Y0
  const T = ([x, y]) => [X0 + (x - bb.x0) * s, Y0 + (y - bb.y0) * s]; const fs = n => Math.round(n * TS()) + 'px system-ui,sans-serif', fd = n => Math.round(n * DS()) + 'px system-ui,sans-serif';
  SK.sk.areas.filter(a => inBlk(a, k) && a.closed).sort((a, b) => polyArea(shape(b)) - polyArea(shape(a))).forEach(a => { const f = FILL(a); if (!f) return; g.fillStyle = f; g.beginPath(); shape(a).forEach((p, i) => i ? g.lineTo(...T(p)) : g.moveTo(...T(p))); g.closePath(); g.fill(); });
  SK.sk.areas.filter(a => inBlk(a, k)).forEach(a => { g.strokeStyle = '#000'; g.lineWidth = 2.5; g.beginPath(); shape(a).forEach((p, i) => i ? g.lineTo(...T(p)) : g.moveTo(...T(p))); if (a.closed) g.closePath(); g.stroke();
    walls(a).forEach(([wi, p, q]) => { const L = wallLen(p, q); if (L * s < 34) return; const ar = arcOf(a, wi), ag = ar && arcGeom(p, q, ar.h, ar.side);
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 ' + fd(15); g.fillStyle = '#000';
      if (ag) { const [bx, by] = T(ag.B); g.fillText('⌒ ' + f1(ag.len) + "'", bx, by); g.restore(); return; }
      const [X1, Y1] = T(p), [X2, Y2] = T(q); const px = Math.hypot(X2 - X1, Y2 - Y1); let nx = -(Y2 - Y1) / px, ny = (X2 - X1) / px; const mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2;
      if (a.closed) { const ft = k => [bb.x0 + (mx + nx * k - X0) / s, bb.y0 + (my + ny * k - Y0) / s]; if (inPoly(ft(6), shape(a))) { nx = -nx; ny = -ny; } if ([10, 18, 26].some(k => inNeighbour(a, ft(k)))) { nx = -nx; ny = -ny; } }
      const tw = g.measureText(f1(L) + "'").width, off = 8 + Math.abs(nx) * tw / 2 + Math.abs(ny) * 9 * DS(); g.translate(mx + nx * off, my + ny * off); g.fillText(f1(L) + "'", 0, 0); g.restore(); });
    if (a.closed && defOf(a.def).bucket !== 'LIV') { const [cx, cy] = T(namePt(a, C, s, 16 * TS())); g.textAlign = 'center'; g.fillStyle = '#000'; g.font = '600 ' + fs(16); g.fillText(a.name || defOf(a.def).name, cx, cy - 2); g.font = fs(15); g.fillText(f1(C.net.get(a.id)) + ' sf', cx, cy + 18); } });
  drawIWalls(g, T, s, IW().filter(w => inBlk(w, k)), null);
  (SK.sk.symbols || []).filter(x => inBlk(x, k)).forEach(x => drawSymbol(g, x, T, s, false));
  SK.sk.labels.filter(l => inBlk(l, k)).forEach(l => { const [X, Y] = T([l.x, l.y]); g.textAlign = 'center'; g.font = (l.room ? '600 ' : 'italic ') + fs(15); g.fillStyle = '#000'; g.fillText(l.text, X, Y + 5); });
}
const inBlk = (o, k) => o.level === k.lv && PG(o) === k.pg;
async function sketchPages() {
  const C = computeAreas(); const P = PAGE_SIZE;
  // blocks: each sketch page (main house first), its levels top floor first, basement last (like Apex)
  const rank = l => below(l) ? -LEVELS.indexOf(l) : LEVELS.indexOf(l);
  const pgs = pageList().map(x => x.n).filter(n => SK.sk.areas.some(a => PG(a) === n && a.pts.length > 1));
  SK.sk.areas.forEach(a => { if (a.pts.length > 1 && !pgs.includes(PG(a))) pgs.push(PG(a)); });
  const used = pgs.flatMap(n => [...new Set(SK.sk.areas.filter(a => PG(a) === n && a.pts.length > 1).map(a => a.level))].sort((a, b) => rank(b) - rank(a)).map(lv => ({ pg: n, lv })));
  if (!used.length) return [];
  const titled = pgs.length > 1; const multiLv = n => used.filter(k => k.pg === n).length > 1;
  const nameBoxes = (k, sc) => SK.sk.areas.filter(a => inBlk(a, k) && a.closed && a.pts.length > 2 && a.nameAt && defOf(a.def).bucket !== 'LIV').flatMap(a => { const [x, y] = namePt(a, C, sc, 16 * TS()); const w = Math.max(String(a.name || defOf(a.def).name).length, 10) * 16 * TS() * 0.32 / sc, h = 26 * TS() / sc; return [[x - w, y - h], [x + w, y + h]]; });
  const bbOf = (k, sc) => { const p = SK.sk.areas.filter(a => inBlk(a, k)).flatMap(a => shape(a)).concat(sc ? nameBoxes(k, sc) : [], SK.sk.labels.filter(l => inBlk(l, k)).map(l => [l.x, l.y]), (SK.sk.symbols || []).filter(x => inBlk(x, k)).flatMap(x => [[x.x - x.w / 2, x.y - x.h / 2], [x.x + x.w / 2, x.y + x.h / 2]])); const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), w: Math.max(1, Math.max(...xs) - Math.min(...xs)), h: Math.max(1, Math.max(...ys) - Math.min(...ys)) }; };
  const drawW = P.W - P.M * 2 - 330, maxBlockH = P.H - P.M * 2 - 220; const fitS = bx => Math.min(drawW / Math.max(...bx.map(b => b.w)), maxBlockH / Math.max(...bx.map(b => b.h)), 30);
  let boxes = used.map(k => bbOf(k)); boxes = used.map(k => bbOf(k, fitS(boxes)));
  const sMax = fitS(boxes); // one scale for every level and page
  const tableH = 100 + 27 * (Math.max(summaryRows().length, breakdownRows().length) + 2);
  const head = titled ? 50 : 0;
  const pagesAt = sc => { let n = 1, yy = P.M + 20, cur = null; used.forEach((k, i) => { const b = boxes[i]; const h = b.h * sc + 70; if (cur !== null && k.pg !== cur) { n++; yy = P.M + 20; } if (k.pg !== cur) yy += head; cur = k.pg; if (yy + h > P.H - P.M - 40 && yy > P.M + 40 + head) { n++; yy = P.M + 20 + head; } yy += h + 30; }); if (P.H - P.M - yy < Math.min(tableH, 420)) n++; return n; };
  // shrink a little (never below about 60% or 6 px per foot) when it saves a page
  let s = sMax, best = pagesAt(sMax); for (let f = 0.95; f >= 0.6; f -= 0.05) { const sc = sMax * f; if (sc < 6) break; const n = pagesAt(sc); if (n < best) { best = n; s = sc; } }
  boxes = used.map(k => bbOf(k, s)); s = Math.min(s, fitS(boxes)); // names placed outside a building at the final scale
  const pages = []; let g, y;
  const newPage = () => { const c = document.createElement('canvas'); c.width = P.W; c.height = P.H; g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, P.W, P.H); pages.push(c); y = P.M + 20; };
  const title = (n, cont) => { if (!titled) return; g.textAlign = 'left'; g.fillStyle = '#000'; g.font = '700 30px system-ui,sans-serif'; g.fillText(pageName(n) + (cont ? ' (cont.)' : ''), P.M, y + 24); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(P.M, y + 38); g.lineTo(P.W - P.M, y + 38); g.stroke(); y += head; };
  let cur = null;
  used.forEach((k, i) => { const b = boxes[i]; const h = b.h * s + 70;
    if (k.pg !== cur) { if (cur !== null) newPage(); else if (!pages.length) newPage(); cur = k.pg; title(k.pg, false); }
    if (y + h > P.H - P.M - 40 && y > P.M + 40 + head) { newPage(); title(k.pg, true); }
    const X0 = P.M + 30 + (drawW - b.w * s) / 2; drawLevelBlock(g, k, X0, y + 30, s, b, C);
    const A = C.list.filter(a => inBlk(a, k) && defOf(a.def).bucket === 'LIV'); const fin = A.reduce((t, a) => t + C.net.get(a.id), 0);
    if (fin || multiLv(k.pg)) { g.textAlign = 'left'; g.fillStyle = '#000'; g.font = '700 20px system-ui,sans-serif'; const lx = P.W - P.M - 235, ly = y + 30 + b.h * s / 2;
      g.fillText(LEVEL_NAME(k.lv) + (below(k.lv) ? ' (below grade)' : ''), lx, ly); if (fin) { g.font = '18px system-ui,sans-serif'; g.fillText(f1(fin) + ' sf finished', lx, ly + 26); } }
    y += h + 30; });
  // the two calculation boxes (summary | breakdown), continued on more pages if long
  const SR = summaryRows(), BR = breakdownRows(), Tt = totals(); const rowH = 27, half = (P.W - P.M * 2) / 2;
  const footer = 2; let si = 0, bi = 0;
  while (si < SR.length || bi < BR.length || !pages._tables) {
    const need = 120 + rowH * (Math.min(Math.max(SR.length - si, BR.length - bi), 40) + footer);
    if (P.H - P.M - y < Math.min(need, 420)) newPage();
    const top = Math.max(y, P.M + 20), avail = Math.floor((P.H - P.M - top - 110) / rowH) - footer; const box = { x: P.M, y: top, w: P.W - P.M * 2 };
    const nS = Math.max(0, Math.min(SR.length - si, avail)), nB = Math.max(0, Math.min(BR.length - bi, avail)); const rows = Math.max(nS, nB) + footer;
    const H = 100 + rows * rowH; g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(box.x, box.y, box.w, H); g.beginPath(); g.moveTo(box.x + half, box.y); g.lineTo(box.x + half, box.y + H); g.stroke();
    g.fillStyle = '#e6e6e6'; g.fillRect(box.x + 1, box.y + 1, box.w - 2, 36); g.fillStyle = '#000'; g.font = '700 21px system-ui,sans-serif'; g.textAlign = 'center';
    g.fillText('AREA CALCULATIONS SUMMARY' + (si ? ' (cont.)' : ''), box.x + half / 2, box.y + 26); g.fillText('AREA CALCULATIONS BREAKDOWN' + (bi ? ' (cont.)' : ''), box.x + half * 1.5, box.y + 26);
    const cols1 = [[8, 'Code', 'left'], [95, 'Description', 'left'], [420, 'Factor', 'right'], [535, 'Net Size', 'right'], [650, 'Perimeter', 'right'], [half - 10, 'Net Totals', 'right']];
    const cols2 = [[8, 'Name', 'left'], [400, 'Base x', 'right'], [520, 'Height x', 'right'], [640, 'Width =', 'right'], [half - 10, 'Area', 'right']];
    g.font = '700 18px system-ui,sans-serif'; cols1.forEach(([x, t, al]) => { g.textAlign = al; g.fillText(t, box.x + x, box.y + 62); }); cols2.forEach(([x, t, al]) => { g.textAlign = al; g.fillText(t, box.x + half + x, box.y + 62); });
    g.font = '17px system-ui,sans-serif'; let ry = box.y + 62 + rowH;
    for (let i = 0; i < nS; i++, si++) { const r = SR[si]; const v = [r.code, r.desc.length > 30 ? r.desc.slice(0, 29) + '…' : r.desc, '1.0', f1(r.size), f1(r.per), f1(r.size)]; cols1.forEach(([x, , al], j) => { g.textAlign = al; g.fillText(v[j], box.x + x, ry); }); ry += rowH; }
    ry = box.y + 62 + rowH;
    for (let i = 0; i < nB; i++, bi++) { const r = BR[bi]; const nm = r[0].length > 34 ? r[0].slice(0, 33) + '…' : r[0]; if (r[4] === null) { g.font = 'italic 17px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText(r[0], box.x + half + 8, ry); g.font = '17px system-ui,sans-serif'; ry += rowH; continue; }
      const v = [nm, r[1] ? r[1] + ' x' : '', r[2] ? r[2] + (r[3] ? ' x' : '') : '', r[3] ? r[3] + ' =' : '', (r[4] < 0 ? '−' : '') + Math.abs(r[4]).toFixed(1)];
      cols2.forEach(([x, , al], j) => { g.textAlign = al; g.fillText(v[j], box.x + half + x, ry); }); ry += rowH; }
    if (si >= SR.length && bi >= BR.length) { // footers: UAD totals, rounded
      const fy = box.y + H - 22 - rowH; g.font = '700 18px system-ui,sans-serif';
      const livRows = SR.filter(r => r.bk === 'LIV' && !below(r.lv)).length;
      g.textAlign = 'left'; g.fillText('Finished Above Grade', box.x + 110, fy); g.textAlign = 'right'; g.fillText('cnt  ' + livRows, box.x + 480, fy); g.fillText('(rounded)', box.x + 700, fy); g.fillText(Tt.agFin.toLocaleString(), box.x + half - 10, fy);
      if (Tt.bgFin || Tt.agNon || Tt.bgNon) { g.font = '17px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText([Tt.agNon ? `Nonstd. above ${Tt.agNon.toLocaleString()}` : '', Tt.bgFin ? `Finished below grade ${Tt.bgFin.toLocaleString()}` : '', Tt.bgNon ? `Nonstd. below ${Tt.bgNon.toLocaleString()}` : ''].filter(Boolean).join(' · '), box.x + 110, fy + rowH); }
      g.font = '700 18px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText((BR.mainCount ?? BR.length) + ' total items', box.x + half + 8, fy); g.textAlign = 'right'; g.fillText('(rounded)', box.x + half + 640, fy); g.fillText(Tt.agFin.toLocaleString(), box.x + box.w - 10, fy); }
    y = box.y + H + 20; pages._tables = true; if (si >= SR.length && bi >= BR.length) break; newPage(); }
  // page footer
  const p = SK.ins.data && SK.ins.data.property || {};
  pages.forEach((c, i) => { const x = c.getContext('2d'); x.fillStyle = '#555'; x.font = '16px system-ui,sans-serif'; x.textAlign = 'left'; x.fillText([p.fileName, [p.addr, p.unit].filter(Boolean).join(' ')].filter(Boolean).join(' · ') + ' · measured per ANSI Z765-2021', P.M, P.H - 30); x.textAlign = 'right'; x.fillText(`Sketch page ${i + 1} of ${pages.length}`, P.W - P.M, P.H - 30); });
  return Promise.all(pages.map(c => new Promise(res => c.toBlob(b => res({ blob: b, w: c.width, h: c.height }), 'image/jpeg', 0.92))));
}
async function sketchImageBlob() { const p = await sketchPages(); return p.length ? p[0].blob : null; }
async function blobThumb(blob) { const u = URL.createObjectURL(blob); try { const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; }); const k = 360 / Math.max(img.width, img.height); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); } finally { URL.revokeObjectURL(u); } }

/* ---------- leaving ---------- */
async function goBack() { const b = document.getElementById('skBack'); if (b) b.textContent = 'Saving…'; clearTimeout(saveTimer); try { await pushToInspection(SK.sk.areas.some(a => a.closed)); } catch (e) {} SK.leaving = true; DB.close(); location.href = 'index.html?open=' + encodeURIComponent(SK.ins.id) + '&tab=' + encodeURIComponent(SK.retTab); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && SK.sk && !SK.leaving) saveSketch(); });
window.addEventListener('pagehide', () => { if (SK.sk && !SK.leaving) saveSketch(); });
window.addEventListener('pageshow', e => { if (e.persisted && SK.leaving) location.reload(); });

/* ---------- boot ---------- */
function skFatal(msg) { const el = document.getElementById('app'); el.innerHTML = `<div class="fatal"><h2>The sketch could not open</h2><p>Your inspection is not affected.</p><p class="fatal-msg">${esc(msg)}</p><p class="help">Version ${typeof BUILD !== 'undefined' ? BUILD : '?'} · take a screenshot of this and send it to Claude.</p><div class="row"><a class="btn primary" href="index.html${SK.ins ? '?open=' + encodeURIComponent(SK.ins.id) : ''}">Back to the inspection</a><button class="btn" onclick="location.reload()">Try again</button></div></div>`; }
window.addEventListener('error', e => { if (!e.message || /ResizeObserver|Script error/.test(e.message)) return; try { saveSketch(); } catch (x) {} toast('Sketch error: ' + e.message); });
SK.step = 'starting';
const skWatch = setTimeout(() => { if (!document.getElementById('skCanvas')) skFatal('The sketch is taking too long to open. Stuck at: ' + SK.step + ' (storage: ' + DB.step + '). Close the app fully (swipe it away) and open it again.'); }, 15000);
(async function skBoot() {
  const q = new URLSearchParams(location.search); const id = q.get('ins'); SK.retTab = q.get('tab') || 'interior';
  SK.step = 'opening storage'; const ok = await Promise.race([DB.ready, new Promise(r => setTimeout(() => r('timeout'), 14000))]);
  if (ok !== true) return skFatal('The iPad storage did not open (' + DB.step + '). Close the app fully (swipe it away) and open it again.');
  if (!id) return skFatal('No inspection was chosen. Open the sketch from an inspection.');
  SK.step = 'reading the inspection'; SK.ins = await DB.get('inspections', id); if (!SK.ins) return skFatal('That inspection was not found on this iPad.');
  SK.step = 'reading your labels'; SK.lib = (await DB.get('sketches', '_library')) || { id: '_library', defs: [], labels: [], hidden: [] };
  SK.step = 'reading the sketch'; SK.sk = (await DB.get('sketches', id)) || { id, insId: id, created: Date.now(), areas: [], labels: [], versions: [] };
  SK.sk.areas = (SK.sk.areas || []).filter(a => a && Array.isArray(a.pts)); SK.sk.labels = SK.sk.labels || []; SK.sk.symbols = SK.sk.symbols || [];
  SK.level = SK.sk.level || 'L1'; SK.pg = SK.sk.pg || 1; if (!pageList().some(x => x.n === SK.pg)) SK.pg = 1; try { SK.showDots = localStorage.getItem('skDots') !== '0'; } catch (e) {}
  document.title = 'Sketch – ' + ((SK.ins.data && SK.ins.data.property && SK.ins.data.property.fileName) || 'Inspection');
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
  SK.step = 'drawing the screen'; renderShell(); setSaved(true); SK.step = 'open';
  if (!DB.persistent) toast('Warning: this page cannot save to the iPad. Open the app from its Home Screen icon.');
  if (SK.sk.view && SK.sk.view.s) { SK.view = SK.sk.view; draw(); } else { fitView(); draw(); }
})().catch(e => skFatal(e.message || String(e)));
