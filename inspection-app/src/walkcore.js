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
  s = s.replace(/\b(?:hi|high|upper)\s+([QqCc])\s*-?\s*([1-6])\b/g, (m, l, d) => l.toUpperCase() + d + '+').replace(/\b(?:low|lower)\s+([QqCc])\s*-?\s*([1-6])\b/g, (m, l, d) => l.toUpperCase() + d + '-')
    .replace(/\b([QqCc])\s*([1-6])\s+plus\b/g, (m, l, d) => l.toUpperCase() + d + '+').replace(/\b([QqCc])\s*([1-6])\s+minus\b/g, (m, l, d) => l.toUpperCase() + d + '-').replace(/\b(?:mille|millie|mealie|milley|mielle|mila|milla|meela|meila|myla)\b/gi, 'Miele').replace(/\b(?:(?:wind|wine|wayne|wane|wain|whine) ?scot(?:t)?ing|wind coating|wine coating|wayne coating|wane coating|wainscotting)\b/gi, 'wainscoting').replace(/(^|[^0-9 ] *| )voltage\b(?! (?:panel|outlet|outlets|wiring|service|line|lines|meter))/gi, '$1vaulted');
  s = s.replace(/\bhard\s+would\b/gi, 'hardwood').replace(/\b(engineered|vaulted|natural|stained|painted|exposed|reclaimed|solid|real)\s+would\b/gi, '$1 wood').replace(/\bwould(?=[ ,]+(?:floor|floors|flooring|beams?|deck|decking|fence|fencing|siding|cabinets?|cabinetry|windows?|stove|burning|paneling|panelling|shingles?|shakes?|trim|ceilings?|frame|framed|doors?|stairs|railings?|pergola|trellis|planks?|look|grain|tones?|tile|laminate|burning)\b)/gi, m => m[0] === 'W' ? 'Wood' : 'wood');
  s = wkVocab(s);
  try { if (typeof dkCommaFix === 'function') s = dkCommaFix(s); } catch (e) {}
  return s.replace(WK_COLON, ': ').replace(/\s+:/g, ':').replace(/:\s*/g, ': ').replace(/\s{2,}/g, ' ').trim();
}

/* ---------------- camera ----------------
   Oct 20 2026: photos from the in-app camera are a frame of the live video (no tap-to-focus, no HDR) and looked fuzzy,
   so the iPad's own camera is the default; the in-app camera (stays open, many shots) is a choice. */
function wkCamMode() { try { return localStorage.getItem('uad-wk-cam') || 'ipad'; } catch (e) { return 'ipad'; } }
function wkSetCamMode(m) { try { localStorage.setItem('uad-wk-cam', m); } catch (e) {} }
function wkNativeShot(onFile) {   // must run inside the tap
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.style.display = 'none';
  inp.onchange = async () => { const f = inp.files && inp.files[0]; inp.remove(); if (f) { try { await onFile(f); } catch (e) { toast('Photo not saved: ' + (e.message || e)); } } };
  document.body.appendChild(inp); inp.click();
}
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
      <div class="wcam-right"><button class="wcam-shut" aria-label="Take the photo"><span></span></button>
      <button class="btn primary wcam-done">Done <small class="wcam-n"></small></button></div>
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

/* her Oct 24 2026: appraisal words the iPhone / iPad speech often mishears, and "number two" → "#2".
   Apple's speech recognition cannot be given a vocabulary, so the app fixes the words after it hears them.
   Her own fixes (Teach) still run first and win. */
const WK_NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const WK_VOCAB = [
  [/\bnumber\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi, (m, w) => '#' + WK_NUMW[w.toLowerCase()]],
  [/\bnumber\s+(\d{1,4})\b/gi, '#$1'], [/\bpound sign\s+(\d{1,4})\b/gi, '#$1'],
  [/\bsub[ -]?zero\b/gi, 'Sub-Zero'], [/\b(?:thermo[ -]?door|thermador|therma door)\b/gi, 'Thermador'], [/\b(?:gag(?:g)?(?:a|e|i)n(?:a|e)?u|gaggenau|gag in now|gag and now|gag a now)\b/gi, 'Gaggenau'],
  [/\bla (?:corn(?:ue|ew|e|u)|cornu)\b/gi, 'La Cornue'], [/\b(?:fisher (?:and|&) (?:paykel|pay kel|pickle|paicle))\b/gi, 'Fisher & Paykel'], [/\b(?:jenn?[ -]?air)\b/gi, 'JennAir'],
  [/\bblue ?star\b/gi, 'BlueStar'], [/\blieb(?:herr|her|hair)\b/gi, 'Liebherr'], [/\b(?:da ?core|dacor)\b/gi, 'Dacor'],
  [/\b(?:seizure|caesar|caesars|ceasar) ?stone\b/gi, 'Caesarstone'], [/\bsilo ?stone\b/gi, 'Silestone'], [/\b(?:calcutta|kalakata|calicata|calacata)\b/gi, 'Calacatta'], [/\b(?:car(?:r)?ara|kerrara)\b/gi, 'Carrara'],
  [/\b(?:salty ?o|sal ?tio|saltio|salt e o)\b/gi, 'Saltillo'], [/\b(?:tad[ae]? ?lak(?:t)?|tadalac|tada lock|taddle act)\b/gi, 'Tadelakt'], [/\btravertine\b/gi, 'travertine'],
  [/\b(?:lou ?tron|lutron)\b/gi, 'Lutron'], [/\bcontrol (?:four|for|4)\b/gi, 'Control4'], [/\b(?:cress ?tron|crestron)\b/gi, 'Crestron'], [/\bsonos\b/gi, 'Sonos'],
  [/\b(?:toto|tow tow)\s+(toilet|toilets|washlet)\b/gi, 'TOTO $1'], [/\bwater ?works\b/gi, 'Waterworks'], [/\btrex\s+(deck|decking)\b/gi, 'Trex $1'],
  [/\b(?:quarts|quartz?)\s+(counter|counters|countertops?)\b/gi, 'quartz $1'], [/\b(?:porte?[ -]?co(?:ch|sh)(?:ere|air|er))\b/gi, 'porte-cochère'], [/\bloggia\b/gi, 'loggia'], [/\b(?:log ?ia|lodge ?ia|lojia)\b/gi, 'loggia'],
  [/\b(?:palapa|pa lapa)\b/gi, 'palapa'], [/\b(?:pergola|per ?gola)\b/gi, 'pergola'], [/\b(?:corbel|cor bell)s?\b/gi, m => /s$/i.test(m) ? 'corbels' : 'corbel'],
];
function wkVocab(s) { WK_VOCAB.forEach(([rx, r]) => { s = s.replace(rx, r); }); return s; }
