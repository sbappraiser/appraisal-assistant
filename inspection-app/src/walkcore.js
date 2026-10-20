/* =====================================================================
   Walk-through (6w, Oct 2026) – shared by the inspection page and the sketch page.
   WCAM: a camera inside the app (the iPad camera app would take the microphone away), shutter as often as she likes,
         "iPad camera" fallback when the in-app camera is not allowed.
   WSR:  listening. Safari's speech recognition stops after pauses and sometimes never marks a result final, so
         a pause of 2 s commits what was heard and listening restarts by itself while it is on.
   ===================================================================== */
const WK_COLON = /\s*\b(?:colon|colin|collin|cologne|coal in)\b\s*[:.]?/gi;
function wkClean(t) {
  let s = String(t || '');
  try { if (typeof dkTeachApply === 'function') s = dkTeachApply(s); else { const L = JSON.parse(localStorage.getItem('uad-dk-teach') || '[]'); (L || []).forEach(x => { if (x && x.heard) s = s.replace(new RegExp('\\b' + x.heard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), x.meant || ''); }); } } catch (e) {}
  return s.replace(WK_COLON, ': ').replace(/\s+:/g, ':').replace(/:\s*/g, ': ').replace(/\s{2,}/g, ' ').trim();
}

/* ---------------- camera ---------------- */
const WCAM = { stream: null, el: null, o: null, n: 0, busy: false };
const wcamIsOpen = () => !!WCAM.el;
async function wcamOpen(o) {   // o: { to(): label, chips(): [{k, t, on}], onChip(k), onShot(file) -> Promise, onClose() }
  wcamClose(true); WCAM.o = o; WCAM.n = 0;
  const el = document.createElement('div'); el.className = 'wcam'; el.innerHTML = `
    <video playsinline muted autoplay></video>
    <div class="wcam-top"><div class="wcam-to">Photo goes to: <b class="wcam-lbl"></b></div><div class="wcam-chips"></div></div>
    <div class="wcam-msg" hidden></div>
    <div class="wcam-bot">
      <label class="btn wcam-ipad">iPad camera<input type="file" accept="image/*" capture="environment" hidden></label>
      <button class="wcam-shut" aria-label="Take the photo"><span></span></button>
      <button class="btn primary wcam-done">Done <small class="wcam-n"></small></button>
    </div><div class="wcam-flash"></div>`;
  document.body.appendChild(el); WCAM.el = el; wcamLabels();
  el.querySelector('.wcam-done').onclick = () => wcamClose();
  el.querySelector('.wcam-shut').onclick = () => wcamShoot();
  el.querySelector('.wcam-ipad input').onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) { await wcamSave(f); } };
  const msg = t => { const m = el.querySelector('.wcam-msg'); m.hidden = !t; m.innerHTML = t || ''; };
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera here');
    WCAM.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 4032 }, height: { ideal: 3024 } } });
    if (!WCAM.el) { WCAM.stream.getTracks().forEach(t => t.stop()); WCAM.stream = null; return; }
    const v = el.querySelector('video'); v.srcObject = WCAM.stream; try { await v.play(); } catch (e) {}
  } catch (e) {
    el.classList.add('nocam'); msg(`<b>The camera inside the app is not available</b> (${esc(e.name || e.message || e)}).<br>Tap <b>iPad camera</b> below – the photo still goes to the right place. To allow the camera here: iPad Settings › Safari › Camera › Allow.`);
  }
}
function wcamLabels() {
  const el = WCAM.el, o = WCAM.o; if (!el || !o) return;
  el.querySelector('.wcam-lbl').textContent = o.to ? o.to() : '';
  const ch = o.chips ? o.chips() : []; const box = el.querySelector('.wcam-chips');
  box.innerHTML = ch.map(c => `<button class="wchip ${c.on ? 'on' : ''}" data-ck="${esc(c.k)}">${esc(c.t)}</button>`).join('');
  box.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { if (o.onChip) o.onChip(b.dataset.ck); wcamLabels(); });
  el.querySelector('.wcam-n').textContent = WCAM.n ? `(${WCAM.n} taken)` : '';
}
async function wcamShoot() {
  const el = WCAM.el; if (!el || WCAM.busy) return; const v = el.querySelector('video');
  if (!v || !v.videoWidth) { toast('The camera is not ready – tap iPad camera instead'); return; }
  WCAM.busy = true; const fl = el.querySelector('.wcam-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  try { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); await wcamSave(new File([blob], 'photo.jpg', { type: 'image/jpeg' })); }
  catch (e) { toast('Photo not saved: ' + (e.message || e)); }
  WCAM.busy = false;
}
async function wcamSave(file) { if (!WCAM.o || !WCAM.o.onShot) return; await WCAM.o.onShot(file); WCAM.n++; wcamLabels(); }
function wcamClose(quiet) {
  if (WCAM.stream) { try { WCAM.stream.getTracks().forEach(t => t.stop()); } catch (e) {} WCAM.stream = null; }
  if (WCAM.el) { WCAM.el.remove(); WCAM.el = null; }
  const o = WCAM.o; WCAM.o = null; if (!quiet && o && o.onClose) o.onClose();
}

/* ---------------- listening ---------------- */
const WSR = { rec: null, on: false, interim: '', timer: null, sent: '', onText: null, onState: null, err: '' };
const wsrAvail = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
function wsrStart(onText, onState) {
  WSR.onText = onText; WSR.onState = onState; WSR.err = '';
  if (!wsrAvail()) { WSR.err = 'none'; onState && onState(); return false; }
  WSR.on = true; wsrBegin(); onState && onState(); return true;
}
function wsrBegin() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let r;
  try { r = new SR(); } catch (e) { WSR.on = false; WSR.err = String(e.message || e); WSR.onState && WSR.onState(); return; }
  r.lang = 'en-US'; r.continuous = true; r.interimResults = true; WSR.rec = r; WSR.sent = ''; WSR.interim = '';
  r.onresult = e => {
    let fin = '', mid = '';
    for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t + ' '; else mid += t; }
    fin = fin.trim();
    if (fin.length > WSR.sent.length && fin.startsWith(WSR.sent)) { const add = fin.slice(WSR.sent.length).trim(); WSR.sent = fin; if (add) wsrEmit(add); }
    else if (fin && !fin.startsWith(WSR.sent)) { WSR.sent = fin; }
    WSR.interim = mid.trim(); WSR.onState && WSR.onState();
    clearTimeout(WSR.timer); if (WSR.interim) WSR.timer = setTimeout(wsrFlush, 2000);
  };
  r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { WSR.on = false; WSR.err = 'not allowed'; } else if (e.error !== 'no-speech' && e.error !== 'aborted') WSR.err = e.error || 'error'; WSR.onState && WSR.onState(); };
  r.onend = () => { clearTimeout(WSR.timer); if (WSR.interim) { const t = WSR.interim; WSR.interim = ''; wsrEmit(t); }
    WSR.rec = null; if (WSR.on) setTimeout(() => { if (WSR.on && !WSR.rec) wsrBegin(); }, 250); WSR.onState && WSR.onState(); };
  try { r.start(); } catch (e) { WSR.rec = null; if (WSR.on) setTimeout(() => { if (WSR.on && !WSR.rec) wsrBegin(); }, 800); }
}
function wsrFlush() {   // a pause: what was heard counts, then listening starts fresh
  const t = WSR.interim; if (!t) return; WSR.interim = ''; wsrEmit(t); try { WSR.rec && WSR.rec.stop(); } catch (e) {}
}
function wsrEmit(t) { t = String(t || '').trim(); if (t && WSR.onText) WSR.onText(t); }
function wsrStop() { WSR.on = false; clearTimeout(WSR.timer); const t = WSR.interim; WSR.interim = ''; if (t) wsrEmit(t); try { WSR.rec && WSR.rec.stop(); } catch (e) {} WSR.onState && WSR.onState(); }
/* spoken commands inside what she said: "take a photo", "next place", "scratch that", "stop listening" */
const WK_CMD = [[/\b(?:take (?:a |the |another )?(?:photo|picture|pic)|snap(?: it)?|shoot)\b[.!]?/i, 'photo'], [/\bnext place\b[.!]?/i, 'next'], [/\bscratch that\b[.!]?/i, 'scratch'], [/\bstop listening\b[.!]?/i, 'stop']];
function wkCommands(text) { const cmds = []; let t = ' ' + text + ' '; WK_CMD.forEach(([rx, c]) => { const g = new RegExp(rx.source, 'gi'); if (g.test(t)) { cmds.push(c); t = t.replace(g, ' '); } }); return { text: t.replace(/\s{2,}/g, ' ').trim(), cmds }; }
