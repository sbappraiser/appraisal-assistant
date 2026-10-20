/* =====================================================================
   Walk-through on the sketch page (6w): when the sketch is opened from the 🚶 Walk-through tab, a photo button,
   a talk button and the place she is in float over the drawing, so she can draw, photograph and talk without
   leaving the sketch. Starting a new area of an ADU / outbuilding / garage type moves her to that building.
   Photos are saved here with the place; the inspection page files them in their UAD photo slot when she goes back.
   ===================================================================== */
const WSK = { on: false, place: 'exterior', shot: null };
const WSK_OUT = [['front', 'Front of dwelling', 'fr'], ['exterior', 'Exterior of dwelling', 'ex'], ['rear', 'Rear of dwelling', 'rr'], ['garage', 'Garage', 'ext']];
function wskPlaces() {
  const ins = SK.ins || {}; const L = ins.lists || {}; const out = WSK_OUT.map(([k, t, s]) => ({ k, t, s }));
  (L.adus || []).forEach((it, i) => out.push({ k: 'L:adus:' + it.id, t: (it.ident || 'ADU ' + (i + 1)) + ' – exterior', s: 'main' }));
  (L.outbuildings || []).forEach(it => out.push({ k: 'L:outbuildings:' + it.id, t: (it.label || it.type || 'Outbuilding') + ' – exterior', s: 'main' }));
  return out;
}
function wskTitle() { const p = wskPlaces().find(x => x.k === WSK.place); return p ? p.t : 'Exterior of dwelling'; }
function wskMount() {
  if (!WSK.on || document.getElementById('wskBar')) return;
  const wrap = document.querySelector('.skwrap'); if (!wrap) return;
  const bar = document.createElement('div'); bar.id = 'wskBar'; bar.className = 'wsk-bar';
  bar.innerHTML = `<button class="wsk-b" id="wskCam" aria-label="Photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Photo</span></button>
    <button class="wsk-b" id="wskMic" aria-label="Talk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><span>Talk</span></button>
    <button class="wsk-place" id="wskPlace"></button><div class="wsk-interim" id="wskInterim" hidden></div>`;
  wrap.appendChild(bar);
  document.getElementById('wskCam').onclick = wskCam; document.getElementById('wskMic').onclick = () => { if (WSR.on) wsrStop(); else if (!wsrStart(wskHear, wskState)) wskType(); wskState(); };
  document.getElementById('wskPlace').onclick = wskPick; wskState();
}
function wskState() {
  const p = document.getElementById('wskPlace'); if (p) p.innerHTML = `📍 <b>${esc(wskTitle())}</b> ▾`;
  const m = document.getElementById('wskMic'); if (m) { m.classList.toggle('on', !!WSR.on); m.querySelector('span').textContent = WSR.on ? 'Listening' : 'Talk'; }
  const it = document.getElementById('wskInterim'); if (it) { it.textContent = WSR.on ? (WSR.interim || '…') : ''; it.hidden = !WSR.on; }
}
function wskPick() {
  openSheet(`<h3>Where are you?</h3><p class="help">Photos and notes go here until you pick another place.</p><div class="grid-btns col">${wskPlaces().map(p => `<button class="btn ${p.k === WSK.place ? 'primary' : ''}" data-wp="${esc(p.k)}">${esc(p.t)}</button>`).join('')}</div><div class="row"><button class="btn" data-close>Close</button></div>`,
    sh => sh.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { WSK.place = b.dataset.wp; closeSheet(); wskState(); if (wcamIsOpen()) wcamLabels(); }));
}
/* fresh copy of the inspection, change it, save; checked once more because the sketch saves the inspection too */
async function wskUpdate(fn) {
  for (let k = 0; k < 3; k++) { const ins = await DB.get('inspections', SK.ins.id); if (!ins) return; const tag = fn(ins); ins.updated = Date.now(); await DB.put('inspections', ins); SK.ins = ins;
    await new Promise(r => setTimeout(r, 700)); const chk = await DB.get('inspections', SK.ins.id); if (!tag || !tag.check || tag.check(chk)) { SK.ins = chk || ins; return; } }
}
async function wskShot(file) {
  const { blob, thumb, w, h } = await processImage(file); const id = uid(); const p = wskPlaces().find(x => x.k === WSK.place) || { k: 'exterior', t: 'Exterior of dwelling', s: 'ex' };
  await DB.put('photos', { id, insId: SK.ins.id, blob, thumb });
  const meta = { id, sec: 'exterior', field: null, list: null, item: null, slot: null, extra: true, label: p.t, cat: 'DwellingExteriorExhibit', roomType: null, required: false, ts: Date.now(), w, h, autoLabel: true, walkPend: p.k, walkShot: p.s };
  await wskUpdate(ins => { ins.photos = ins.photos || []; if (!ins.photos.some(x => x.id === id)) ins.photos.push(meta); return { check: c => c && (c.photos || []).some(x => x.id === id) }; });
  toast('Photo saved – ' + p.t);
}
function wskCam() {
  wcamOpen({ to: () => wskTitle(), chips: () => wskPlaces().slice(0, 4).map(p => ({ k: p.k, t: p.t.replace(' of dwelling', ''), on: p.k === WSK.place })),
    onChip: k => { WSK.place = k; wskState(); }, onShot: wskShot, onClose: () => wskState() });
}
function wskHear(t) {
  const { text, cmds } = wkCommands(wkClean(t));
  if (cmds.includes('photo') && wcamIsOpen()) wcamShoot(); if (cmds.includes('stop')) wsrStop();
  let place = WSK.place, body = text; const m = /^\s*([a-z ]{3,40}):\s*(.*)$/i.exec(text);
  if (m) { const h = m[1].toLowerCase().trim(); const hit = wskPlaces().find(p => p.t.toLowerCase().startsWith(h) || p.t.toLowerCase().replace(' – exterior', '') === h) || (/^(rear|back)/.test(h) ? { k: 'rear' } : /^front/.test(h) ? { k: 'front' } : /^(exterior|side)/.test(h) ? { k: 'exterior' } : /^garage/.test(h) ? { k: 'garage' } : null);
    if (hit) { place = WSK.place = hit.k; body = m[2]; wskState(); } }
  if (body) wskNote(place, body); wskState();
}
async function wskNote(place, body) {
  await wskUpdate(ins => { const w = ins.walk = ins.walk || {}; w.notes = w.notes || {}; const old = w.notes[place] || ''; const add = body.trim(); w.notes[place] = old ? old.replace(/\s*$/, '') + (/[.!?]$/.test(old.trim()) ? ' ' : '. ') + add : add; const want = w.notes[place];
    return { check: c => c && c.walk && c.walk.notes && c.walk.notes[place] === want }; });
  toast('Note saved – ' + wskTitle());
}
function wskType() {   // no listening in this browser: a box for the keyboard microphone
  openSheet(`<h3>Note – ${esc(wskTitle())}</h3><p class="help">Tap the microphone on the keyboard and talk.</p><textarea class="txt" id="wskTxt" rows="4" style="width:100%"></textarea><div class="row"><button class="btn primary" id="wskSave">Save note</button><button class="btn" data-close>Cancel</button></div>`,
    sh => { const ta = sh.querySelector('#wskTxt'); setTimeout(() => ta.focus(), 50); sh.querySelector('#wskSave').onclick = () => { const v = ta.value.trim(); closeSheet(); if (v) wskHear(v); }; });
}
/* a new area of a building type moves her to that building (creates it in the inspection if it is new) */
function wskAreaPlace(defId) {
  const d = defOf(defId); if (!d) return; const ins = SK.ins; const L = ins.lists || {};
  if (d.bucket === 'ADU') { let it = (L.adus || [])[0]; if (!it) { it = { id: uid(), dkPhoto: true }; wskNewItem('adus', it); } WSK.place = 'L:adus:' + it.id; }
  else if (d.bucket === 'OB') { const types = (LISTS.outbuildings.fields[0].o || []).map(x => x[0]); const type = types.includes(d.name) ? d.name : types.find(t => d.name.startsWith(t)) || null;
    let it = (L.outbuildings || []).find(x => (x.type && x.type === type) || x.label === d.name); if (!it) { it = { id: uid(), dkPhoto: true }; if (type) it.type = type; else it.label = d.name; wskNewItem('outbuildings', it); } WSK.place = 'L:outbuildings:' + it.id; }
  else if (d.bucket === 'GAR') WSK.place = 'garage';
  else if (['LIV', 'LIVN', 'UNF'].includes(d.bucket)) WSK.place = 'exterior';
  wskState();
}
function wskNewItem(list, it) { SK.ins.lists = SK.ins.lists || {}; (SK.ins.lists[list] = SK.ins.lists[list] || []).push(it);
  wskUpdate(ins => { ins.lists[list] = ins.lists[list] || []; if (!ins.lists[list].some(x => x.id === it.id)) ins.lists[list].push(it); return { check: c => c && (c.lists[list] || []).some(x => x.id === it.id) }; }); }
(function wskInit() {
  const q = new URLSearchParams(location.search); if (!q.get('walk')) return; WSK.on = true; WSK.place = q.get('place') || 'exterior';
  if (!/^(front|exterior|rear|garage|L:(adus|outbuildings):)/.test(WSK.place)) WSK.place = 'exterior';
  const rs = renderShell; renderShell = function () { rs(); wskMount(); };
  const ps = placeStart; placeStart = function (ft, exact) { const def = SK.pendingDef; ps(ft, exact); try { wskAreaPlace(def); } catch (e) {} };
  const back = WSK.place0 = q.get('place') || ''; const gb = goBack;
  goBack = async function () { wsrStop(); wcamClose(true); if (back) { try { await wskUpdate(ins => { ins.walk = ins.walk || {}; ins.walk.place = back; return { check: c => c && c.walk && c.walk.place === back }; }); } catch (e) {} } return gb(); };
})();
