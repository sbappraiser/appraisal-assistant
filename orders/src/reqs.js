/* =====================================================================
   Client requirements (her request, Oct 18 2026)
   The client's engagement letter / order is read on this computer by rules (no AI, so it works
   on "No AI" jobs): each sentence that asks for something (photos, comparables, addenda,
   approaches, comments, inspection rules, invoicing) becomes a checklist item with its page.
   She ticks, edits, adds and removes items. Items marked "iPad" go to the iPad as inspection
   to-dos (order.todos on the iPad: plain lines) until they are ticked done.
   Stored on the order: reqs [{id, docId, doc, page, cat, text, quote, done, ipad, by, edited}], reqsRead {docId: version}.
   ===================================================================== */
const REQ_V = 3;   // bump when the rules change: not-yet-edited items are read again
const REQ_CATS = ['Before you accept', 'Inspection', 'Photos', 'Comparables', 'Approaches to value', 'Report and addenda', 'Comments to include', 'Before you deliver', 'Delivery and invoice', 'Other'];
// first rule that matches wins; ipad: true / a regex on the sentence / false
const REQ_RULES = [
  { cat: 'Report and addenda', re: /^(Special (Assignment )?(Conditions|Instructions)|Additional Instructions)/i, ipad: false },
  { cat: 'Report and addenda', key: 'gar', re: /General Appraisal Requirements/i, text: 'Follow the client’s General Appraisal Requirements (the report must pass their review before payment). Ask them for a copy if you need it.' },
  { cat: 'Inspection', re: /potential violation of (local|state|federal)|(description|pictures) of any onsite activit/i, ipad: true },
  { cat: 'Approaches to value', re: /insurable value/i, text: 'If the cost approach is not warranted, provide the insurable value of the improvements.' },
  { cat: 'Before you accept', re: /prior services|time of your bid|(any|the) prior (appraisal|report|service)|within the (past|prior|last) (three|3) years/i },
  { cat: 'Before you deliver', re: /do not (complete|deliver|submit)|unless or until|executed purchase|purchase (sale |and sale )?(agreement|contract).{0,60}(review|supplied|provided)|must (receive|review) the (purchase|sales) (contract|agreement)/i },
  { cat: 'Inspection', key: 'conduct', re: /attend the appointment alone|firearms|business card|dress professionally|on time for each appointment|announce your departure|do not state your value|pets should never/i, ipad: true,
    text: 'Professional conduct at the inspection: be on time, attend alone (no children, friends or pets), show ID if asked, no value talk with the contact, no firearms, announce when you leave.' },
  { cat: 'Inspection', re: /\bANSI\b|measur(e|ing|ement)s? .{0,40}(GLA|gross living|square f)/i, ipad: true },
  { cat: 'Inspection', re: /arrange the inspection|inspection (within|date)|schedule (the )?inspection|enter the inspection date|lock ?box|key ?box|gate code|contact (the )?(borrower|owner|agent|occupant).{0,40}(inspect|schedul|appoint)|appointment/i, ipad: /lock ?box|key ?box|gate code/i },
  { cat: 'Report and addenda', re: /location map|plat map|aerial|flood map|floor ?plan|sketch/i },
  { cat: 'Photos', re: /photo(?!cop)/i, ipad: s => !/^(photos? of )?(the )?comparable|comparable (sales|rents|listings)\b.{0,20}photo|photos? of (the )?comp/i.test(s) || /subject|interior|exterior|street|front|rear|room|bath|kitchen|amenit|pool|structure/i.test(s) },
  { cat: 'Comparables', re: /comparable (sales|listings|rents)|minimum of (\d+|two|three|four|five|six)\b|(settled|closed|sold) within|within \d+ (months|miles)|bracket/i },
  { cat: 'Approaches to value', re: /\bACN\b|actual cash value/i },
  { cat: 'Approaches to value', re: /operating (income )?statement|\bops? statement|\b216\b|rent (survey|roll)/i },
  { cat: 'Report and addenda', re: /\b(review|analy[sz]e|comment on|reconcile|summari[sz]e)\b[^.]{0,40}\b(purchase (contract|agreement)|sales? contract|plans|specifications|budget|leases?|rent roll|HOA (documents|budget)|CC&Rs|preliminary title|title report|prior appraisals?|permits?|inspection reports?)/i },
  { cat: 'Approaches to value', re: /cost approach|income approach|sales comparison approach|replacement cost|\bRCN\b|land value|approach(es)? to value/i },
  { cat: 'Report and addenda', re: /\b1004MC\b|\b1007\b|rent schedule|\b1004D\b|\b216\b|addend|exhibit|client file ?#|document id ?#|USPAP and FIRREA|certified appraiser|license|E&O|errors and omissions|signatory|trainee|supervisory|report form|this (appraisal )?form is not to be used/i },
  { cat: 'Comments to include', re: /highest and best use|zoning|exposure time|marketing time|USPS|non-?conforming|external (issues|obsolescence)|railroad|climate|extraordinary assumption|cost to cure|repairs? noted|commentary|comment on|please comment|explain|value to be reported|\bas is.{0,6}market value|\bas[ -]complete\b/i },
  { cat: 'Delivery and invoice', re: /invoice|sales tax|payable upon|rush|due (date|by)|late (fee|penalt)|revision(s)? (request|within)/i },
];
const REQ_SKIP = /regulated institution|supplemental standards|Be based upon the definition of market value|Be performed by a state licensed|Analyze and report appropriate deductions|Be written and contain sufficient|^CONTACT INFORMATION|marital status|guidelines (has|have) been provided|incorporated (by reference|into this)|appraiser independence|artificial intelligence|code of conduct|^firefox\b|https?:\/\/|subject to the rules and regulations|you represent to/i;   // boilerplate (AI wording is checked separately)
function reqFix(t) {   // ligature characters in client PDFs: Ɵ = ti, Ʃ = tt
  return String(t || '').replace(/Ɵ/g, 'ti').replace(/Ʃ/g, 'tt').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff').replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/[ \t]+/g, ' ');
}
async function reqPdfPages(rec) {   // the text again, with pieces that touch joined without a space (ligatures "ti", "fi", "tt" are separate pieces in these PDFs)
  const pdfjs = await loadPdfJs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise; const out = [];
  for (let n = 1; n <= doc.numPages; n++) { const tc = await (await doc.getPage(n)).getTextContent(); let s = '', last = null;
    tc.items.forEach(it => { if (!it.str && !it.hasEOL) return; const x = it.transform[4], y = it.transform[5], fs = Math.abs(it.transform[0]) || 10;
      if (last) { if (Math.abs(y - last.y) > fs * 0.5) s += '\n'; else if (x - last.end > fs * 0.12 && !/\s$/.test(s) && !/^\s/.test(it.str)) s += ' '; }
      s += it.str; last = { y, end: x + (it.width || 0) }; if (it.hasEOL) { s += '\n'; last = null; } });
    out.push(s); }
  return out;
}
function reqSentences(pageText) {
  const lines = reqFix(pageText).split('\n').map(l => l.trim()).filter(Boolean)
    .filter(l => !/^[A-Z][\w #'’/()&.-]{1,40}:$/.test(l))   // a label with nothing after it
    .map(l => /^[A-Z][\w #'’/()&.-]{1,30}:\s*[^:]{1,50}$/.test(l) && !/[.!?]$/.test(l) && !/\.\s/.test(l) ? l + '.' : l);   // short "Label: value" rows are their own sentence
  const t = lines.join(' ').replace(/[•▪●◦]\s*/g, '. ').replace(/(^|\s)((?:[A-Z]{3,}\s){0,3}[A-Z]{5,}:?)(?=\s+[A-Z][a-z])/g, '$1. $2. ').replace(/\s+/g, ' ');   // headings in capitals start a new sentence
  return t.split(/(?<=[.!?])\s+(?=[A-Z“"(*])|\*{3,}/).map(s => s.replace(/^[\s*.]+|\s+$/g, '').trim()).filter(s => s.length > 12);
}
async function readReqs(docId) {   // → items for one client letter
  const rec = await docPages(docId); if (!rec || !rec.pagesText) return [];
  const meta = (cur.docs || []).find(d => d.id === docId) || { name: rec.name }; const out = []; const seen = new Set(); const once = new Set();
  let pages = rec.pagesText; if (isPdf({ name: rec.name, type: rec.mime || '' })) { try { pages = await reqPdfPages(rec); } catch (e) { console.warn('requirement text', e); } }
  pages.forEach((pt, i) => reqSentences(pt).forEach(s0 => {
    if (REQ_SKIP.test(s0)) return;
    const rule = REQ_RULES.find(r => r.re.test(s0)); if (!rule) return;
    if (/:\s*(n\/?a|no|none)\.?\s*$/i.test(s0) || !/[a-z]/.test(s0)) return;   // "Requires 1004MC: NO"; headings in capitals   // "Requires 1004MC: NO"
    if (rule.key) { if (once.has(rule.key)) return; once.add(rule.key); }
    let s = (rule.text || s0).replace(/\*{2,}/g, '').replace(/\s+/g, ' ').trim(); if (s.length > 320) { const m = s.match(rule.re); const at = m ? Math.max(0, m.index - 120) : 0; s = (at ? '… ' : '') + s.slice(at, at + 300).trim() + ' …'; }
    const k = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (seen.has(k)) return; seen.add(k);
    const ipad = typeof rule.ipad === 'function' ? rule.ipad(s0) : rule.ipad instanceof RegExp ? rule.ipad.test(s0) : !!rule.ipad;
    out.push({ id: uid(), docId, doc: meta.name, page: i + 1, cat: rule.cat, text: s, quote: s0.slice(0, 400), done: false, ipad, by: 'reader' }); }));
  // the order's own boxes (label: value rows) read by the client-letter reader
  const F = cur.letterFields || {}; const pageOf = v => { v = String(v || '').toLowerCase().slice(0, 20); const i = v ? pages.findIndex(t => reqFix(t).toLowerCase().includes(v)) : -1; return i >= 0 ? i + 1 : null; };
  const add = (cat, text, v, ipad) => { if (!out.some(x => x.text === text)) out.unshift({ id: uid(), docId, doc: meta.name, page: pageOf(v), cat, text, quote: String(v || ''), done: false, ipad: !!ipad, by: 'reader' }); };
  if (F.due) add('Delivery and invoice', 'Report due: ' + F.due, F.due);
  if (F.fee) add('Delivery and invoice', 'Fee: ' + F.fee, F.fee);
  if (F.mc) add('Report and addenda', '1004MC (market conditions addendum) required', '1004MC');
  if (F.rent) add('Report and addenda', 'Rent survey / rent schedule (1007) requested', F.rentWord || '1007');
  if (F.exterior) add('Inspection', 'Exterior-only inspection', 'exterior', true);
  if (F.form) add('Report and addenda', 'Report form: ' + F.form, F.form);
  if (F.approaches) add('Approaches to value', 'Approaches requested: ' + F.approaches.map(x => x.replace(/\b\w/g, c => c.toUpperCase())).join(', '), 'Value Determination');
  if (F.ops) add('Report and addenda', 'Operating (ops) statement requested', 'Ops statement');
  if (F.interest) add('Report and addenda', 'Interest appraised: ' + F.interest, F.interest);
  return out.slice(0, 60);
}
async function runReqs(docIds, quiet) {   // reads the client letters again; her own and edited items stay; ticks carry over
  cur = cur || readForm(); docIds = docIds || (cur.docs || []).filter(d => d.type === 'clientLetter').map(d => d.id);
  if (!docIds.length) { if (!quiet) toast('No client letter in this order’s documents'); return 0; }
  const old = cur.reqs || []; let fresh = [];
  for (const id of docIds) { try { fresh = fresh.concat(await readReqs(id)); } catch (e) { console.warn('requirements', e); } }
  const key = x => x.docId + '|' + x.text;
  fresh.forEach(x => { const o = old.find(y => y.by === 'reader' && !y.edited && key(y) === key(x)); if (o) { x.id = o.id; x.done = o.done; x.ipad = o.ipad; } });
  const keep = old.filter(y => y.by !== 'reader' || y.edited || !docIds.includes(y.docId));
  cur.reqs = [...keep.filter(y => !fresh.some(x => key(x) === key(y))), ...fresh];
  cur.reqsRead = { ...(cur.reqsRead || {}) }; docIds.forEach(id => { cur.reqsRead[id] = REQ_V; });
  renderReqs(); if (!quiet) toast(fresh.length + ' requirement' + (fresh.length === 1 ? '' : 's') + ' found in the client’s letter – check them'); saveLetter(true, true);
  return fresh.length;
}
/* a client's standing requirements (her request, Oct 19 2026): tick "Always" and every order for that client gets the item */
let CLIENT_REQS = {};   // kv 'reqs:client' = { clientKey: [{cat, text, ipad}] }; in Back up / Restore
const clientKeyOf = o => { const c = ((o && o.clients) || [])[0] || {}; return String(c.company || c.name || '').toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim(); };
const clientNameOf = o => { const c = ((o && o.clients) || [])[0] || {}; return c.company || c.name || ''; };
async function crLoad() { const r = await ODB.get('kv', 'reqs:client'); CLIENT_REQS = (r && r.v) || {}; }
function crSave() { return ODB.put('kv', { id: 'reqs:client', v: CLIENT_REQS }); }
const crList = o => CLIENT_REQS[clientKeyOf(o)] || [];
const crHas = (o, text) => crList(o).some(x => x.text === text);
function crSet(o, x, on, oldText) { const k = clientKeyOf(o); if (!k) return;
  const L = (CLIENT_REQS[k] || []).filter(y => y.text !== x.text && y.text !== oldText); if (on) L.push({ cat: x.cat, text: x.text, ipad: !!x.ipad });
  if (L.length) CLIENT_REQS[k] = L; else delete CLIENT_REQS[k]; crSave(); }
function crApply(o) {   // this client's standing items that the order does not have yet (and she has not removed from it)
  let n = 0; o.reqs = o.reqs || []; const gone = o.reqsGone || [];
  crList(o).forEach(x => { if (!o.reqs.some(y => y.text === x.text) && !gone.includes(x.text)) { o.reqs.push({ id: uid(), docId: null, doc: '', page: null, cat: x.cat, text: x.text, quote: '', done: false, ipad: x.ipad, by: 'client' }); n++; } });
  return n;
}
let reqAutoBusy = false;
function renderReqs() {
  const box = $('#reqBox'); if (!box || !cur) return;
  { const n = crApply(cur); if (n) { saveLetter(true, true); toast(n + ' standing requirement' + (n === 1 ? '' : 's') + ' for ' + clientNameOf(cur) + ' added to this order', 5000); } }
  const R = cur.reqs || []; const ck = clientKeyOf(cur), cn = clientNameOf(cur); const letters = (cur.docs || []).filter(d => d.type === 'clientLetter');
  const unread = letters.filter(d => (cur.reqsRead || {})[d.id] !== REQ_V);
  if (unread.length && !reqAutoBusy) { reqAutoBusy = true; setTimeout(() => runReqs(unread.map(d => d.id), true).finally(() => { reqAutoBusy = false; }), 0); }
  const nOpen = R.filter(x => !x.done).length, nPad = R.filter(x => x.ipad && !x.done).length;
  const groups = REQ_CATS.map(c => [c, R.filter(x => (REQ_CATS.includes(x.cat) ? x.cat : 'Other') === c)]).filter(g => g[1].length);
  box.innerHTML = `<p class="help">${letters.length ? 'Read from the client’s letter on this computer (no AI). Tick each one when it is done; edit the wording, add your own, or remove any. Items marked <b>iPad</b> go to the iPad as inspection to-dos until you tick them.' : 'When the client’s engagement letter or order is in Documents, its requirements (photos, comparables, addenda, approaches, comments, invoicing) are listed here.'}</p>
    ${R.length ? `<p class="help"><b>${nOpen}</b> of ${R.length} still open · ${nPad} go${nPad === 1 ? 'es' : ''} to the iPad</p>` : ''}
    ${groups.map(([c, list]) => `<h4>${h(c)}</h4>${list.map(x => `<div class="req${x.done ? ' done' : ''}">
      <input type="checkbox" data-rqdone="${x.id}" ${x.done ? 'checked' : ''} aria-label="Done">
      <textarea data-rqtext="${x.id}" rows="${Math.max(1, Math.min(4, Math.ceil(x.text.length / 55)))}" aria-label="Requirement">${h(x.text)}</textarea>
      <span class="reqacts">${x.page ? `<button type="button" class="pgchip" data-rqpage="${x.id}" title="Open the letter at this page">p. ${x.page}</button>` : ''}<label class="check" title="Send to the iPad as an inspection to-do"><input type="checkbox" data-rqipad="${x.id}" ${x.ipad ? 'checked' : ''}>iPad</label>${ck ? `<label class="check" title="Add this to every order for ${h(cn)}"><input type="checkbox" data-rqalways="${x.id}" ${crHas(cur, x.text) ? 'checked' : ''}>Always</label>` : ''}<button type="button" class="lnk" data-rqdel="${x.id}" aria-label="Remove">remove</button></span></div>`).join('')}`).join('')}
    <div class="row reqadd"><select id="rqCat">${REQ_CATS.map(c => `<option>${h(c)}</option>`).join('')}</select><input id="rqNew" placeholder="Add a requirement yourself"><label class="check"><input type="checkbox" id="rqNewPad">iPad</label>${ck ? `<label class="check" title="Add this to every order for ${h(cn)}"><input type="checkbox" id="rqNewAlways">Always for ${h(cn.length > 28 ? cn.slice(0, 26) + '…' : cn)}</label>` : ''}<button type="button" class="btn ghost small" id="rqAdd">Add</button></div>
    <div class="row">${letters.length ? '<button type="button" class="btn ghost small" id="rqRead">Read the client’s letter again</button>' : ''}${R.length ? '<button type="button" class="btn ghost small" id="rqCopy">Copy the list</button>' : ''}</div>`;
  const fit = t => { if (!t.offsetParent) return; t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
  box.querySelectorAll('textarea[data-rqtext]').forEach(t => { fit(t); t.addEventListener('input', () => fit(t)); });
  const find = id => R.find(x => x.id === id);
  box.querySelectorAll('[data-rqdone]').forEach(c => c.onchange = () => { find(c.dataset.rqdone).done = c.checked; saveLetter(true, true); renderReqs(); });
  box.querySelectorAll('[data-rqipad]').forEach(c => c.onchange = () => { find(c.dataset.rqipad).ipad = c.checked; saveLetter(true, true); renderReqs(); });
  box.querySelectorAll('[data-rqtext]').forEach(t => t.onchange = () => { const x = find(t.dataset.rqtext); const v = t.value.trim(); if (!v) return; if (v !== x.text) { const was = x.text, al = crHas(cur, was); x.text = v; x.edited = true; if (al) crSet(cur, x, true, was); saveLetter(true, true); } });
  box.querySelectorAll('[data-rqdel]').forEach(b => b.onclick = () => { const x = find(b.dataset.rqdel); if (x && crHas(cur, x.text)) cur.reqsGone = [...(cur.reqsGone || []), x.text]; cur.reqs = R.filter(y => y.id !== b.dataset.rqdel); saveLetter(true, true); renderReqs(); });
  box.querySelectorAll('[data-rqalways]').forEach(c => c.onchange = () => { const x = find(c.dataset.rqalways); crSet(cur, x, c.checked); toast(c.checked ? 'Every new order for ' + cn + ' will get this' : 'No longer added for ' + cn); });
  box.querySelectorAll('[data-rqpage]').forEach(b => b.onclick = () => { const x = find(b.dataset.rqpage); if ((cur.docs || []).some(d => d.id === x.docId)) { saveLetter(true, true); openReader(x.docId, x.page); } else toast('That document is no longer in this order'); });
  $('#rqAdd').onclick = () => { const v = $('#rqNew').value.trim(); if (!v) { $('#rqNew').focus(); return; } (cur.reqs = cur.reqs || []).push({ id: uid(), docId: null, doc: '', page: null, cat: $('#rqCat').value, text: v, quote: '', done: false, ipad: $('#rqNewPad').checked, by: 'you' }); const al = $('#rqNewAlways'); if (al && al.checked) { crSet(cur, cur.reqs[cur.reqs.length - 1], true); toast('Every new order for ' + cn + ' will get this'); } saveLetter(true, true); renderReqs(); };
  $('#rqNew').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#rqAdd').click(); } };
  const rr = $('#rqRead'); if (rr) rr.onclick = () => runReqs();
  const rc = $('#rqCopy'); if (rc) rc.onclick = async () => { const txt = groups.map(([c, list]) => c + '\n' + list.map(x => (x.done ? '[x] ' : '[ ] ') + x.text + (x.page ? ' (p. ' + x.page + ')' : '')).join('\n')).join('\n\n'); try { await navigator.clipboard.writeText(txt); toast('Copied'); } catch (e) { toast('Could not copy'); } };
}
// the iPad's to-do lines: her own to-dos first, then the open client requirements marked iPad
const reqTodos = o => (o.reqs || []).filter(x => x.ipad && !x.done).map(x => 'Client: ' + x.text);
