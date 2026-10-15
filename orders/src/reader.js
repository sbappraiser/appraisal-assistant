/* =====================================================================
   Document reader
   Layer 1 (every order, no AI): page viewer, text search across the order's documents,
   a checklist per kind of document, the preliminary title report read automatically from
   its text, and an approval queue – nothing reaches the order's facts until she accepts it.
   Layer 2 (only when the order's AI use is Yes or Redacted, with her own Claude API key):
   "Read with Claude" sends page PICTURES rendered here. Redacted = names, phones, emails,
   file/loan/case numbers and any boxes she draws are painted out of the pixels before
   anything is sent; she sees every page first. "No AI" = the button is locked.
   Note: C.A.R. forms (purchase agreement, counters, RLAS) use scrambled fonts – only the
   typed-in entries come out as text, so their checklist is filled by her or by Claude.
   ===================================================================== */
const CHECK = {
  contract: { title: 'Purchase contract', items: [['price', 'Final negotiated sales price (after counters)'], ['acceptDate', 'Acceptance date'], ['personal', 'Personal property included'], ['leaseback', 'Leaseback / rent-back'], ['credits', 'Credits / concessions to the buyer'], ['buyerBroker', 'Buyer’s broker: who pays, % or amount'], ['addenda', 'Counters and addenda – summary'], ['loanCont', 'Loan contingency (Yes / No)'], ['apprCont', 'Appraisal contingency (Yes / No)'], ['entity', 'Signing for an entity: who, and which entity'], ['special', 'Court-ordered, estate, trust, trustee or atypical terms'], ['written', 'Terms written in (not pre-printed on the form)']] },
  counter: { title: 'Counter offer', items: [['price', 'Price in the counter'], ['date', 'Date'], ['terms', 'Terms changed']] },
  addendum: { title: 'Addendum', items: [['date', 'Date'], ['terms', 'Terms changed']] },
  leaseback: { title: 'Leaseback / rent-back', items: [['rent', 'Rent (amount and period)'], ['term', 'Term (start and end)'], ['deposit', 'Security deposit'], ['furnished', 'Furnished / what the seller keeps'], ['terms', 'Other terms']] },
  prelim: { title: 'Preliminary title report', items: [['dated', 'Dated as of'], ['easements', 'Easements'], ['restrictions', 'Restrictions, CC&Rs, covenants, reservations'], ['minerals', 'Oil, gas, minerals, wells'], ['encroach', 'Encroachments, boundary or survey matters'], ['clear', 'May need to be cleared before a transfer (judgments, liens, delinquent taxes)'], ['other', 'Other exceptions worth mentioning']] },
  legal: { title: 'Legal description', items: [['legal', 'Legal description']] },
  condoQ: { title: 'Condo questionnaire', items: [['dues', 'HOA dues'], ['special', 'Special assessments'], ['litigation', 'Litigation'], ['reserves', 'Reserves'], ['rentals', 'Rental restrictions / owner occupancy'], ['insurance', 'Master insurance'], ['other', 'Other']] },
  hoaBudget: { title: 'HOA budget', items: [['dues', 'HOA dues'], ['reserves', 'Reserves'], ['special', 'Special assessments'], ['other', 'Other']] },
  ccrs: { title: 'CC&Rs', items: [['restrictions', 'Use restrictions'], ['age', 'Age restriction (55+)'], ['rentals', 'Rental restrictions'], ['other', 'Other']] },
  bylaws: { title: 'HOA bylaws', items: [['other', 'Notes']] },
  minutes: { title: 'HOA minutes', items: [['special', 'Special assessments discussed'], ['litigation', 'Litigation'], ['repairs', 'Major repairs'], ['other', 'Other']] },
  disclosures: { title: 'Disclosures', items: [['defects', 'Defects and repairs disclosed'], ['permits', 'Unpermitted work / additions'], ['hazards', 'Natural hazards (flood, fire, fault)'], ['other', 'Other']] },
  budget: { title: 'Construction budget', items: [['total', 'Total budget'], ['hard', 'Hard costs'], ['soft', 'Soft costs / fees'], ['site', 'Site work, pool, landscaping'], ['other', 'Other']] },
  plans: { title: 'Plans', items: [['gla', 'Living area per the plans'], ['rooms', 'Rooms / layout'], ['other', 'Other']] },
  specs: { title: 'Specifications', items: [['quality', 'Quality of finishes'], ['other', 'Other']] },
  permitsPdf: { title: 'Permit records', items: [['permits', 'Permits'], ['other', 'Other']] },
  clientLetter: { title: 'Client’s engagement letter', items: [['client', 'Client / lender'], ['form', 'Report form and addenda required'], ['due', 'Due date'], ['fee', 'Fee'], ['photos', 'Photo requirements'], ['scope', 'Scope items / special instructions'], ['todos', 'Inspection to-dos for the iPad']] },
};
const checkFor = t => CHECK[t] || { title: DOC_LABEL[t] || 'Document', items: [['notes', 'Notes']] };

/* ---------- text per page (kept with the document; read once) ---------- */
async function docPages(id) {
  const rec = await ODB.get('docs', id); if (!rec) return null;
  if (rec.pagesText) return rec;
  const file = new File([rec.blob], rec.name, { type: rec.mime || rec.blob.type });
  let pagesText = [];
  if (isPdf(file)) { const pdfjs = await loadPdfJs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
    for (let n = 1; n <= doc.numPages; n++) { const tc = await (await doc.getPage(n)).getTextContent(); pagesText.push(tc.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ')); } }
  else if (/\.docx$/i.test(file.name)) pagesText = [(await docxParagraphs(file)).join('\n')];
  else if (/\.(txt|csv)$/i.test(file.name)) pagesText = [await G.readText(file)];
  const clean = s => (s.match(/[A-Za-z]{3,}/g) || []).join('').length;
  rec.pagesText = pagesText; rec.scanPages = pagesText.map((t, i) => clean(t) < 40 ? i + 1 : 0).filter(Boolean);
  rec.garbled = pagesText.filter(t => t.length > 200 && clean(t) / t.length < 0.25).length; // C.A.R. scrambled fonts
  await ODB.put('docs', rec); return rec;
}

/* ---------- the preliminary title report, from its text ---------- */
function readPrelim(pages) {
  const S = []; const add = (key, value, page, quote) => { if (value) S.push({ key, value: String(value).replace(/\s+/g, ' ').trim(), page, quote: (quote || '').replace(/\s+/g, ' ').trim().slice(0, 300), by: 'reader' }); };
  const all = pages.map((t, i) => ({ t, p: i + 1 }));
  const find = re => { for (const x of all) { const m = x.t.match(re); if (m) return { m, p: x.p }; } return null; };
  let r = find(/Dated as of:?\s+([A-Z][a-z]+ \d{1,2}, \d{4})/); if (r) add('dated', r.m[1], r.p, r.m[0]);
  // taxes only when delinquent; trust deeds, trust requirements and general printed items are left out (her rule)
  all.forEach(x => { const m = x.t.match(/[^\n]*Installment[^\n]*DELINQUENT[^\n]*/i); if (m) add('clear', 'Delinquent property taxes: ' + m[0], x.p, m[0]); });
  // numbered exceptions: from "exceptions to coverage" to the informational notes
  const joined = all.map(x => x.t.split('\n').map(l => ({ l, p: x.p }))).flat();
  let on = false, curEx = null; const ex = [];
  for (const { l, p } of joined) {
    if (/exceptions to coverage in addition|would be as follows:?\s*$/i.test(l) && !ex.length) { on = true; continue; }
    if (on && /INFORMATIONAL NOTES|^\s*REQUIREMENTS\b|LEGAL DESCRIPTION|END OF EXCEPTIONS|^\s*Req\. No/i.test(l)) { on = false; continue; }
    if (!on) continue;
    const m = l.match(/^\s*(\d{1,2})([a-z]?)\.\s+(.*)$/);
    const last = ex.length ? ex[ex.length - 1].n : 0;
    if (m && (+m[1] === last + 1 || (+m[1] === last && m[2]) || (!ex.length && +m[1] === 1))) { curEx = { n: +m[1], sub: m[2], text: m[3], p }; ex.push(curEx); }
    else if (curEx && !/Page \d+ of \d+|Order Number|Order No\.|Page Number|First American Title|WFG Form|CLTA Preliminary|^\s*$/i.test(l)) curEx.text += ' ' + l.trim();
  }
  const key = lab => /easement/.test(lab) ? 'easements' : /CC&Rs|restriction/.test(lab) ? 'restrictions' : /mineral/.test(lab) ? 'minerals' : /encroach/.test(lab) ? 'encroach' : /judgment|lien|lis pendens|delinquent/.test(lab) ? 'clear' : 'other';
  ex.forEach(e => { const lab = prelimLabel(e.text); if (!lab) return; add(key(lab), lab, e.p, `#${e.n}${e.sub || ''}: ${e.text}`); });
  return S;
}

/* ---------- the reader window ---------- */
const RD = { id: null, rec: null, page: 1, pdf: null, sugg: [], boxes: {}, q: '' };
async function openReader(id, page, q) {
  const meta = (cur.docs || []).find(d => d.id === id); if (!meta) return;
  RD.id = id; RD.page = page || 1; RD.q = q || ''; RD.boxes = {}; RD.pdf = null; RD.extra = null;
  toast('Opening ' + meta.name + '…');
  const rec = await docPages(id); if (!rec) { toast('That file is no longer stored'); return; } RD.rec = rec;
  if (isPdf({ name: rec.name, type: rec.mime })) { const pdfjs = await loadPdfJs(); RD.pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise; }
  cur = readForm(); cur.review = cur.review || {}; const rv = cur.review[id] = cur.review[id] || { sugg: [] };
  const PRELIM_V = 5; // bump when the prelim rules change: suggestions not yet accepted or rejected are made again
  if (meta.type === 'prelim' && (rv.prelimV || 0) < PRELIM_V) { rv.sugg = rv.sugg.filter(s => s.by !== 'reader' || s.state !== 'new'); const seen = new Set(rv.sugg.map(s => s.key + '|' + s.value + '|' + s.page));
    rv.sugg.push(...readPrelim(rec.pagesText).filter(s => !seen.has(s.key + '|' + s.value + '|' + s.page)).map(s => ({ ...s, id: uid(), state: 'new' }))); rv.prelimV = PRELIM_V; saveLetter(true, true); }
  $('#reader').hidden = false; document.body.classList.add('reading'); rdRender(); rdPage();
}
function closeReader() { $('#reader').hidden = true; document.body.classList.remove('reading'); RD.pdf = null; renderDocs(); renderFacts(); }
async function rdPage() {
  const cv = $('#rdCanvas'), box = $('#rdText'); const n = RD.pdf ? RD.pdf.numPages : (RD.rec.pagesText || []).length || 1;
  RD.page = Math.max(1, Math.min(n, RD.page)); $('#rdPg').textContent = `Page ${RD.page} of ${n}`;
  if (RD.task) { try { RD.task.cancel(); } catch (e) {} } const ticket = RD.ticket = (RD.ticket || 0) + 1;
  if (RD.pdf) { cv.hidden = false; box.hidden = true; const pg = await RD.pdf.getPage(RD.page); if (ticket !== RD.ticket) return; const vp0 = pg.getViewport({ scale: 1 }); const sc = Math.min(2, 1100 / vp0.width); const vp = pg.getViewport({ scale: sc });
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); RD.task = pg.render({ canvasContext: g, viewport: vp }); try { await RD.task.promise; } catch (e) { return; } if (ticket !== RD.ticket) return;
    if (RD.q) { const tc = await pg.getTextContent(); g.fillStyle = 'rgba(255,214,0,.45)'; tc.items.forEach(it => { if (it.str.toLowerCase().includes(RD.q.toLowerCase())) { const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]); const hgt = Math.abs(it.transform[3]) * sc; g.fillRect(x, y - hgt, it.width * sc, hgt * 1.2); } }); } }
  else { cv.hidden = true; box.hidden = false; box.textContent = (RD.rec.pagesText || [''])[RD.page - 1] || ''; }
  const sc = RD.rec.scanPages || []; $('#rdNote').innerHTML = sc.includes(RD.page) ? 'This page is a scan with no readable text. To make it searchable, open the file in Acrobat → <b>Scan &amp; OCR → Recognize text</b>, save it, and drop it here again. Claude can still read the picture on AI orders.' : RD.rec.garbled ? 'The printed form text in this file is scrambled (normal for C.A.R. forms); the typed-in entries are readable. Read the page and fill the checklist, or use Read with Claude on an AI order.' : '';
}
function rdRender() {
  const meta = cur.docs.find(d => d.id === RD.id), C = checkFor(meta.type), rv = cur.review[RD.id], facts = cur.facts || [];
  const ai = cur.aiUse; const aiOk = ai === 'Yes' || ai === 'Redacted'; const key = aiKey();
  $('#rdTitle').textContent = `${C.title} – ${meta.name}`;
  const rowFor = ([k, label]) => {
    const got = facts.filter(f => f.docId === RD.id && f.key === k); const sug = rv.sugg.filter(s => s.key === k && s.state === 'new');
    return `<div class="rditem"><div class="rdlab">${h(label)}</div>
      ${got.map(f => `<div class="rdfact"><span>✓ ${h(f.value)}</span>${f.page ? `<button type="button" class="pgchip" data-goto="${f.page}">p. ${f.page}</button>` : ''}<small>${f.by === 'claude' ? 'Claude, accepted by you' : f.by === 'reader' ? 'read from the text, accepted by you' : 'yours'}</small><button type="button" class="lnk" data-unfact="${f.id}">undo</button></div>`).join('')}
      ${sug.map(s => `<div class="rdsug"><textarea data-sugv="${s.id}" rows="${Math.max(1, Math.min(4, Math.ceil(s.value.length / 55)))}">${h(s.value)}</textarea>
        <div class="row">${s.page ? `<button type="button" class="pgchip" data-goto="${s.page}">p. ${s.page}</button>` : ''}<small>${s.by === 'claude' ? 'Claude suggests' : 'read from the text'}</small><span class="grow"></span><button type="button" class="btn small" data-acc="${s.id}">Accept</button><button type="button" class="btn ghost small danger" data-rej="${s.id}">Reject</button></div></div>`).join('')}
      <div class="rdadd"><input data-own="${k}" placeholder="Type it yourself"><button type="button" class="btn ghost small" data-ownadd="${k}">Add (page ${RD.page})</button></div></div>`;
  };
  const nNew = rv.sugg.filter(x => x.state === 'new').length;
  $('#rdSide').innerHTML = `<p class="help">Nothing goes into the order until you accept it. Each entry keeps its page so you can check it later.</p>${nNew > 1 ? `<div class="row"><button type="button" class="btn ghost small" id="rdAccAll">Accept all ${nNew} as shown</button></div>` : ''}
    ${RD.pdf ? `<div class="rdai rdflow"><h4>Remove confidential information, then send to Claude</h4>
      <p class="help">Pages <input id="rdRFrom" value="1" size="2" inputmode="numeric"> to <input id="rdRTo" value="${Math.min(RD.pdf.numPages, aiOk && key ? 20 : RD.pdf.numPages)}" size="2" inputmode="numeric"> of ${RD.pdf.numPages}</p>
      <ol class="steps"><li><b>Redact.</b> Names, phones, emails and numbers are blacked out for you. You add other names, box the signatures and initials, and check every page. You can also save the redacted copy as a PDF.</li>
        <li>${aiOk && key ? '<b>Send to Claude</b> from the same screen. Only the redacted page pictures are sent, up to 30 pages at a time.' : ai === 'No' ? 'This order is set to <b>No AI</b>: you can redact and save a copy, but nothing is sent.' : !aiOk ? 'To send to Claude, choose <b>AI use on this job</b> on the Order &amp; letter tab first. Until then nothing is sent.' : 'To send to Claude, add your API key on <b>Standard wording → AI settings</b>.'}</li>
        <li><b>Accept or reject</b> each thing Claude finds, in the checklist below.</li></ol>
      <div class="row"><button type="button" class="btn primary" id="rdRedact">Redact pages</button>${ai === 'Yes' && key ? '<button type="button" class="btn ghost small" id="rdPrep">Send without redacting</button>' : ''}</div></div>` : ''}
    ${stickiesHtml()}
    ${C.items.map(rowFor).join('')}
    ${rdExtras(meta)}`;
  const side = $('#rdSide');
  side.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { RD.page = +b.dataset.goto; rdPage(); });
  side.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { const s = rv.sugg.find(x => x.id === b.dataset.acc); const v = side.querySelector(`[data-sugv="${s.id}"]`).value.trim(); s.state = 'accepted';
    (cur.facts = cur.facts || []).push({ id: uid(), docId: RD.id, doc: meta.name, type: meta.type, key: s.key, label: (C.items.find(i => i[0] === s.key) || [, s.key])[1], value: v, page: s.page, by: v === s.value ? s.by : 'you', at: new Date().toISOString() }); saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => { rv.sugg.find(x => x.id === b.dataset.rej).state = 'rejected'; saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-unfact]').forEach(b => b.onclick = () => { cur.facts = cur.facts.filter(f => f.id !== b.dataset.unfact); saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-ownadd]').forEach(b => b.onclick = () => { const k = b.dataset.ownadd, i = side.querySelector(`[data-own="${k}"]`); const v = i.value.trim(); if (!v) return;
    (cur.facts = cur.facts || []).push({ id: uid(), docId: RD.id, doc: meta.name, type: meta.type, key: k, label: (C.items.find(x => x[0] === k) || [, k])[1], value: v, page: RD.page, by: 'you', at: new Date().toISOString() }); saveLetter(true, true); rdRender(); });
  const prep = $('#rdPrep'); if (prep) prep.onclick = () => rdPrepare('claude');
  const rc = $('#rdRedact'); if (rc) rc.onclick = () => rdPrepare('copy');
  wireStickies(side); rdWireExtras(side);
  const aa = $('#rdAccAll'); if (aa) aa.onclick = () => { side.querySelectorAll('[data-acc]').forEach(b => b.click()); };
}

/* ---------- searching every document in the order ---------- */
async function searchDocs(q) {
  const out = $('#docHits'); q = q.trim(); if (q.length < 3) { out.innerHTML = ''; return; }
  out.innerHTML = '<p class="help">Searching…</p>'; const hits = [];
  for (const d of cur.docs || []) { let rec; try { rec = await docPages(d.id); } catch (e) { continue; } if (!rec || !rec.pagesText) continue;
    rec.pagesText.forEach((t, i) => { const at = t.toLowerCase().indexOf(q.toLowerCase()); if (at >= 0) hits.push({ d, p: i + 1, s: t.slice(Math.max(0, at - 70), at + q.length + 90).replace(/\s+/g, ' ') }); }); }
  const ql = q.toLowerCase();
  (cur.stickies || []).forEach(n => { if (n.text.toLowerCase().includes(ql) || tagName(n.tag).toLowerCase().includes(ql)) hits.unshift({ d: { id: n.docId, name: '📌 ' + n.doc }, p: n.page, s: tagName(n.tag) + ': ' + n.text }); });
  (cur.facts || []).forEach(f => { if ((f.value + ' ' + f.label).toLowerCase().includes(ql)) hits.unshift({ d: { id: f.docId, name: '✓ ' + f.doc }, p: f.page || 1, s: f.label + ': ' + f.value }); });
  out.innerHTML = hits.length ? `<ul class="hits2">${hits.slice(0, 60).map(x => `<li><button type="button" class="lnk" data-hit="${x.d.id}" data-p="${x.p}">${h(x.d.name)} · page ${x.p}</button><small>${h(x.s)}</small></li>`).join('')}</ul>${hits.length > 60 ? `<p class="help">${hits.length - 60} more.</p>` : ''}` : '<p class="help">Not found in the readable text. Scanned pages cannot be searched until they are run through Acrobat’s Recognize Text.</p>';
  out.querySelectorAll('[data-hit]').forEach(b => b.onclick = () => openReader(b.dataset.hit, +b.dataset.p, q));
}
function renderFacts() {
  renderStickies();
  const box = $('#factList'); if (!box) return; const F = (cur && cur.facts) || [];
  box.innerHTML = F.length ? `<h4>Facts accepted from the documents</h4><table class="facts">${F.map(f => `<tr><th>${h(f.label)}</th><td>${h(f.value)} <small class="muted">${h(f.doc)}${f.page ? ', p. ' + f.page : ''}</small></td></tr>`).join('')}</table>` : '';
}

/* ---------- AI settings (stay in this browser) ---------- */
const aiKey = () => { try { return localStorage.getItem('aa.claudeKey') || ''; } catch (e) { return ''; } };
const aiModel = () => { let m = ''; try { m = localStorage.getItem('aa.claudeModel') || ''; } catch (e) {} m = m.trim().toLowerCase().replace(/[\s.]+/g, '-').replace(/-+/g, '-'); return m || 'claude-sonnet-5-5'; }; // "Claude Sonnet 5.5" → claude-sonnet-5-5

/* ---------- redaction and sending ---------- */
function sensitiveTerms() {
  const f = readForm(); const words = new Set(); const add = s => String(s || '').split(/[\s,;&/()]+/).forEach(w => { w = w.replace(/[.'’]+$/g, ''); if (w.length >= 3 && !/^(the|and|trust|family|living|revocable|llc|inc|lp|llp|co|corp|company|estate|of|mr|mrs|ms|dr|jr|sr|successor|trustee|trustees|bank|title|escrow|realty|real|properties|group|santa|barbara|montecito|road|drive|lane|street|avenue)$/i.test(w)) words.add(w.toLowerCase()); });
  (f.clients || []).forEach(c => { add(c.name); add(c.company); add(c.email); add(c.phone); });
  [f.borrower, f.owner, f.decedent, f.accessName, f.lenderCo, f.amcCo, f.fileNo, f.loanNo, f.amcRef].forEach(add);
  (cur.facts || []).filter(x => ['buyers', 'sellers', 'vesting'].includes(x.key)).forEach(x => add(x.value));
  String(RD.extra || '').split(',').forEach(add);
  return words;
}
const PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+|\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b|\b[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\b|\b\d{2,4}-\d{5,}\b|\b(?:loan|case|escrow|order|file|account|acct)\s*(?:no\.?|number|#)?:?\s*[\w-]*\d[\w-]{3,}/gi;
async function redactPage(n, redact) { // → canvas with the page painted, sensitive parts blacked out in the pixels
  const pg = await RD.pdf.getPage(n); const vp0 = pg.getViewport({ scale: 1 }); const sc = Math.min(2, 1600 / Math.max(vp0.width, vp0.height)); const vp = pg.getViewport({ scale: sc });
  const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  await pg.render({ canvasContext: g, viewport: vp }).promise; let hits = 0;
  if (redact) { const terms = sensitiveTerms(); const tc = await pg.getTextContent(); g.fillStyle = '#000';
    tc.items.forEach(it => { const s = it.str; if (!s.trim()) return; const per = it.width / Math.max(1, s.length); const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]); const hgt = Math.max(8, Math.abs(it.transform[3]) * sc);
      const spans = []; s.replace(PATTERN, (m, off) => { spans.push([off, m.length]); return m; });
      s.replace(/[A-Za-z0-9@.'’-]{3,}/g, (w, off) => { if (terms.has(w.replace(/[.'’]+$/, '').toLowerCase())) spans.push([off, w.length]); return w; });
      spans.forEach(([o, l]) => { g.fillRect(x + (o - 1) * per * sc - 2, y - hgt - 1, (l + 2) * per * sc + 4, hgt * 1.3 + 2); hits++; }); }); }
  (RD.boxes[n] || []).forEach(b => { const X = b.x * cv.width, Y = b.y * cv.height, W = Math.max(2, b.w * cv.width), H = Math.max(2, b.h * cv.height);
    if (b.mode === 'blur') { pixelate(g, X, Y, W, H); } else { g.fillStyle = '#000'; g.fillRect(X, Y, W, H); } hits++; });
  return { cv, hits };
}
async function rdPrepare(mode) { // mode 'claude' = to send; 'copy' = a redacted copy for the workfile or to send yourself
  if (!RD.pdf) { toast('This works on PDF files'); return; }
  if (mode) { RD.prepMode = mode; const fi = '#rdRFrom', ti = '#rdRTo'; RD.prepFrom = parseInt($(fi).value, 10) || 1; RD.prepTo = parseInt($(ti).value, 10) || RD.prepFrom; }
  mode = RD.prepMode;
  const from = Math.max(1, Math.min(RD.pdf.numPages, RD.prepFrom)), to = Math.min(RD.pdf.numPages, Math.max(from, RD.prepTo), from + (mode === 'copy' ? 199 : 29));
  const red = mode === 'copy' || cur.aiUse === 'Redacted'; const pane = $('#rdSend'); pane.hidden = false; if (RD.extra == null) RD.extra = cur.redactNames || '';
  const canSend = (cur.aiUse === 'Yes' || cur.aiUse === 'Redacted') && aiKey();
  pane.innerHTML = `<div class="rdsendbar"><b>${red ? 'Redacted pages' : 'Pages'} ${from}–${to}: check every page.</b> ${red ? 'Black boxes are painted into the picture itself, so the hidden words are gone. Drag on a page to black out anything else (signatures, account numbers).' : ''}
    ${red ? `<label>Also remove these names <span class="opt">separate with commas – buyers, sellers, agents, anyone else on the pages</span><input id="rdExtra" value="${h(RD.extra || '')}" placeholder="Broadway Warehouse, Colleen Casey"></label><p class="help">Signatures and initials are pictures, not text: drag a box over each one.</p>
      <div class="row"><span>Drag to:</span><div class="seg2"><button type="button" data-dm="black" aria-pressed="${(RD.drawMode || 'black') === 'black'}">Black box</button><button type="button" data-dm="blur" aria-pressed="${RD.drawMode === 'blur'}">Blur</button></div><button type="button" class="btn ghost small" id="rdUndoBox">Undo last box</button></div>
      <p class="help">Blur scrambles the pixels so nothing underneath can be read back; it looks softer than a black box (good for photos and logos). Names and numbers found in the text are always blacked out.</p>` : ''}
    <span class="row">${mode === 'copy' ? `<button type="button" class="btn${canSend ? ' ghost' : ' primary'}" id="rdSavePdf">Save redacted PDF</button>` : ''}${canSend && (mode === 'claude' || to - from < 30) ? `<button type="button" class="btn primary" id="rdGo">Send these ${to - from + 1} ${red ? 'redacted ' : ''}pages to Claude</button>` : canSend ? '<span class="help">Claude reads up to 30 pages at a time: close this and set fewer pages to send.</span>' : ''}<button type="button" class="btn ghost" id="rdCancel">${mode === 'copy' ? 'Close' : 'Cancel'}</button></span></div><div id="rdThumbs" class="rdthumbs"></div>`;
  const th = $('#rdThumbs'); RD.prepared = [];
  for (let n = from; n <= to; n++) { const { cv, hits } = await redactPage(n, red); cv.dataset.n = n; const wrap = document.createElement('figure'); wrap.innerHTML = `<figcaption>Page ${n}${red ? ` · ${hits} item${hits === 1 ? '' : 's'} blacked out` : ''}</figcaption>`; wrap.prepend(cv); th.appendChild(wrap); RD.prepared.push(n);
    if (red) { let st = null; cv.onpointerdown = e => { const r = cv.getBoundingClientRect(); st = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; cv.setPointerCapture(e.pointerId); };
      cv.onpointerup = async e => { if (!st) return; const r = cv.getBoundingClientRect(); const en = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; const b = { x: Math.min(st[0], en[0]), y: Math.min(st[1], en[1]), w: Math.abs(en[0] - st[0]), h: Math.abs(en[1] - st[1]) }; st = null; if (b.w < 0.01 || b.h < 0.005) return;
        b.mode = RD.drawMode || 'black'; b.t = Date.now(); (RD.boxes[n] = RD.boxes[n] || []).push(b); const { cv: nv, hits: nh } = await redactPage(n, true); cv.getContext('2d').drawImage(nv, 0, 0); wrap.querySelector('figcaption').textContent = `Page ${n} · ${nh} items blacked out`; }; } }
  $('#rdCancel').onclick = () => { pane.hidden = true; pane.innerHTML = ''; };
  document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => { RD.drawMode = b.dataset.dm; document.querySelectorAll('[data-dm]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  const ub = $('#rdUndoBox'); if (ub) ub.onclick = () => { const ns = Object.keys(RD.boxes).filter(k => RD.boxes[k].length).map(Number); if (!ns.length) return; const last = ns.reduce((a, k) => (RD.boxes[k].at(-1).t || 0) > (RD.boxes[a].at(-1).t || 0) ? k : a, ns[0]); RD.boxes[last].pop(); rdPrepare(); };
  const ex = $('#rdExtra'); if (ex) ex.onchange = () => { RD.extra = ex.value; cur.redactNames = ex.value; saveLetter(true, true); rdPrepare(); };
  const go = $('#rdGo'); if (go) go.onclick = () => rdSend(red);
  const sp = $('#rdSavePdf'); if (sp) sp.onclick = () => saveRedactedPdf();
}
async function saveRedactedPdf() {
  const meta = cur.docs.find(d => d.id === RD.id); const b = $('#rdSavePdf'); b.disabled = true; b.textContent = 'Making the PDF…';
  try {
    const pages = []; for (const cv of document.querySelectorAll('#rdThumbs canvas')) { const bin = atob(cv.toDataURL('image/jpeg', 0.85).split(',')[1]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); pages.push({ jpg: u8, w: cv.width, h: cv.height }); }
    const blob = jpegPdf(pages); const name = meta.name.replace(/\.pdf$/i, '') + ' - REDACTED.pdf'; const file = new File([blob], name, { type: 'application/pdf' });
    download(new Uint8Array(await blob.arrayBuffer()), name, 'application/pdf');
    const m2 = { id: uid(), name, type: meta.type, size: blob.size, mime: 'application/pdf', added: new Date().toISOString(), note: 'redacted copy – pictures only, no hidden text' };
    await ODB.put('docs', { ...m2, orderId: cur.id, blob: file }); cur.docs.push(m2); saveLetter(true, true);
    toast('Saved ' + name + ' to Downloads and to this order’s documents', 5000);
  } catch (e) { console.error(e); toast('Could not make the PDF: ' + (e.message || e)); }
  b.disabled = false; b.textContent = 'Save redacted PDF';
}
function jpegPdf(pages) { // a PDF made only of page pictures: no text layer, no hidden data from the original
  const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0; const push = x => { const u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); len += u.length; };
  const n = pages.length; const obj = (i, body) => { offs[i] = len; push(`${i} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`));
  pages.forEach((pg, i) => { const pw = 612, ph = Math.round(612 * pg.h / pg.w); const P = 3 + i * 3, I = P + 1, C = P + 2;
    obj(P, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${I} 0 R >> >> /Contents ${C} 0 R >>`));
    obj(I, () => { push(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpg.length} >>\nstream\n`); push(pg.jpg); push('\nendstream'); });
    const cs = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`; obj(C, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`)); });
  const xref = len; const total = 3 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n` + Array.from({ length: total - 1 }, (_, k) => String(offs[k + 1]).padStart(10, '0') + ' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
async function rdSend(red) {
  const meta = cur.docs.find(d => d.id === RD.id), C = checkFor(meta.type); const go = $('#rdGo'); go.disabled = true; go.textContent = 'Claude is reading…';
  try {
    const imgs = []; for (const cv of document.querySelectorAll('#rdThumbs canvas')) { const data = cv.toDataURL('image/jpeg', 0.82).split(',')[1]; imgs.push({ n: +cv.dataset.n, data }); }
    const content = [];
    imgs.forEach(im => { content.push({ type: 'text', text: `Page ${im.n}:` }); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: im.data } }); });
    content.push({ type: 'text', text: `This is a ${C.title.toLowerCase()} for a residential appraisal of ${street(readForm()) || 'a property'} in California. Read the pages above and fill this checklist:\n${C.items.map(([k, l]) => `- ${k}: ${l}`).join('\n')}\n\nAnswer with JSON only, in this form: {"items":[{"key":"<checklist key>","value":"<what the document says, short>","page":<page number>,"quote":"<the words you read it from>"}]}. ${meta.type === 'contract' ? 'Also list the parts of the document as "parts":[{"kind":"Purchase agreement|Seller counter offer|Buyer counter offer|Addendum|Lease agreement|1031 exchange agreement|Agent/broker disclosures|Other disclosures|Other","pages":"first-last"}]. Report only terms written or typed in, not the pre-printed wording. ' : ''}${meta.type === 'prelim' ? 'Leave out deeds of trust, trust requirements, general printed exceptions and tax installments that are paid. Give each exception as a short label only, with no dates, names or instrument numbers: "road easement" (for ingress/egress or road), "utility easement" (gas, electric, sewer, water, telephone), "drainage easement", "conservation easement", "unknown easement" (purpose not stated, or matters contained in a document), "CC&Rs", "deed restriction", "oil, gas and mineral rights", "encroachment / boundary matters", "judgment", "lien", "delinquent property taxes". Put the exception number in quote. ' : ''}Use only what the pages show; leave a key out when the pages do not cover it. Black boxes are redactions: do not guess what is under them. Do not give an opinion of value.` });
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: aiModel(), max_tokens: 4000, system: 'You read real estate documents for a residential appraiser and report exactly what they say, with page numbers. Reply with JSON only.', messages: [{ role: 'user', content }] }) });
    const j = await res.json(); if (!res.ok) throw new Error((j.error && j.error.message) || 'Claude answered with an error (' + res.status + ')');
    const txt = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''); const js = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
    const parsed = JSON.parse(js); const items = (parsed.items || []).filter(x => x && x.key && x.value);
    if (Array.isArray(parsed.parts) && parsed.parts.length) { const rv0 = cur.review[RD.id]; if (!(rv0.parts || []).length) rv0.parts = parsed.parts.map(x => ({ kind: PART_KINDS.includes(x.kind) ? x.kind : 'Other', pages: String(x.pages || '') })); }
    const rv = cur.review[RD.id]; items.forEach(x => rv.sugg.push({ id: uid(), key: C.items.some(i => i[0] === x.key) ? x.key : C.items[C.items.length - 1][0], value: String(x.value), page: +x.page || null, quote: String(x.quote || ''), by: 'claude', state: 'new' }));
    (cur.aiLog = cur.aiLog || []).push({ at: new Date().toISOString(), doc: meta.name, pages: imgs.map(i => i.n), mode: red ? 'redacted' : 'full', model: aiModel(), items: items.length });
    saveLetter(true, true); $('#rdSend').hidden = true; rdRender(); toast(`Claude read ${imgs.length} pages and suggested ${items.length} entries – accept or reject each one`, 5000);
  } catch (e) { console.error(e); toast('Not sent or not read: ' + (e.message || e), 6000); go.disabled = false; go.textContent = 'Try again'; }
}

function pixelate(g, X, Y, W, H) { // strong mosaic: 1 colour per 18-px block, then a soft pass – the original pixels are gone
  const bs = 18; const img = g.getImageData(X, Y, W, H), d = img.data;
  for (let by = 0; by < H; by += bs) for (let bx = 0; bx < W; bx += bs) { let r = 0, gg = 0, b = 0, n = 0;
    for (let y = by; y < Math.min(H, by + bs); y++) for (let x = bx; x < Math.min(W, bx + bs); x++) { const i = (y * W + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    r /= n; gg /= n; b /= n; for (let y = by; y < Math.min(H, by + bs); y++) for (let x = bx; x < Math.min(W, bx + bs); x++) { const i = (y * W + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; } }
  g.putImageData(img, X, Y); g.save(); g.filter = 'blur(6px)'; g.drawImage(g.canvas, X, Y, W, H, X, Y, W, H); g.restore();
}

/* ---------- parts of a contract packet, UAD 3.6 entries, drafted summaries ---------- */
const PART_KINDS = ['Purchase agreement', 'Seller counter offer', 'Buyer counter offer', 'Addendum', 'Lease agreement', '1031 exchange agreement', 'Agent/broker disclosures', 'Other disclosures', 'Other'];
const SALE_TYPES = [['TypicallyMotivated', 'Typically motivated'], ['EstateSale', 'Estate sale'], ['CourtOrderedNonForeclosureSale', 'Court-ordered (non-foreclosure)'], ['SaleBetweenRelatedParties', 'Sale between related parties'], ['RelocationSale', 'Relocation sale'], ['REOSale', 'REO sale'], ['ShortSale', 'Short sale'], ['ForeclosureSale', 'Foreclosure sale'], ['LandSale', 'Land sale'], ['PreSubdivisionSale', 'Pre-subdivision sale']];
const EASE_TYPES = [['IngressOrEgress', 'Ingress / egress'], ['Utility', 'Utility'], ['Drainage', 'Drainage'], ['Conservation', 'Conservation'], ['Other', 'Other']];
const REST_TYPES = [['Age', 'Age'], ['HistoricPreservation', 'Historic preservation'], ['Income', 'Income'], ['LandUse', 'Land use'], ['Rental', 'Rental'], ['SalePrice', 'Sale price'], ['Other', 'Other']];
const fval = (docId, key) => (cur.facts || []).filter(f => f.docId === docId && f.key === key).map(f => f.value);
const nWord = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
function partsSentence(parts, total) {
  const cnt = {}; parts.forEach(x => { cnt[x.kind] = cnt[x.kind] || []; cnt[x.kind].push(x); });
  const pageCount = x => { const m = String(x.pages || '').match(/(\d+)\s*[-–]\s*(\d+)/); return m ? +m[2] - +m[1] + 1 : /^\d+$/.test(String(x.pages || '').trim()) ? 1 : null; };
  const phrase = (k, list) => { const n = list.length; const pc = n === 1 && k === 'Purchase agreement' ? pageCount(list[0]) : null; const many = n > 1 || (pageCount(list[0]) || 1) > 1;
    const name = { 'Purchase agreement': 'purchase contract', 'Seller counter offer': 'seller counter offer', 'Buyer counter offer': 'buyer counter offer', 'Addendum': 'addendum', 'Lease agreement': 'lease agreement', '1031 exchange agreement': '1031 exchange agreement', 'Agent/broker disclosures': 'agent/broker disclosures', 'Other disclosures': 'other disclosures', 'Other': 'other documents' }[k];
    if (/disclosures|other documents/.test(name)) return (many ? 'multiple ' : '') + name;
    return n === 1 ? (pc ? `a ${pc}-page ${name}` : (/^[aeiou]/.test(name) ? 'an ' : 'a ') + name) : `${n} ${name === 'addendum' ? 'addendums' : name + 's'}`; };
  const bits = PART_KINDS.filter(k => cnt[k]).map(k => phrase(k, cnt[k]));
  if (!bits.length) return '';
  const list = bits.length > 1 ? bits.slice(0, -1).join(', ') + ', and ' + bits.at(-1) : bits[0];
  return `I received a ${total ? total + '-page ' : ''}document which contains ${list}.`;
}
function contractDraft(docId) {
  const rv = cur.review[docId], total = RD.pdf ? RD.pdf.numPages : null; const v = k => fval(docId, k).join('; ');
  const out = []; const ps = partsSentence(rv.parts || [], total); if (ps) out.push(ps);
  if (v('price')) out.push(`The final negotiated sales price is ${v('price')}${v('acceptDate') ? ', with an acceptance date of ' + v('acceptDate') : ''}.`); else if (v('acceptDate')) out.push(`The acceptance date is ${v('acceptDate')}.`);
  if (v('personal')) out.push(`Personal property included: ${v('personal')}.`);
  if (v('leaseback')) out.push(`Leaseback: ${v('leaseback')}.`);
  if (v('credits')) out.push(`Credits/concessions: ${v('credits')}.`);
  if (v('buyerBroker')) out.push(`Buyer's broker compensation: ${v('buyerBroker')}.`);
  if (v('addenda')) out.push(`Counter offers and addenda: ${v('addenda')}.`);
  if (v('loanCont') || v('apprCont')) out.push([v('loanCont') && `Loan contingency: ${v('loanCont')}.`, v('apprCont') && `Appraisal contingency: ${v('apprCont')}.`].filter(Boolean).join(' '));
  if (v('entity')) out.push(`${v('entity')}.`);
  if (v('special')) out.push(`${v('special')}.`);
  if (v('written')) out.push(`Other terms written into the agreement: ${v('written')}.`);
  return out.join(' ').replace(/\.\./g, '.').slice(0, 5000);
}
function prelimDraft(docId) {
  const v = k => fval(docId, k); const dated = v('dated')[0];
  const items = ['easements', 'restrictions', 'minerals', 'encroach', 'clear', 'other'].flatMap(k => v(k));
  return `A preliminary title report${dated ? ' dated ' + dated : ''} was provided and reviewed.` + (items.length ? ` Exceptions of note include ${joinLabels(items)}.` : ' No exceptions of note were observed.')
    + (v('clear').length ? ' Some items may need to be cleared prior to a transfer.' : '')
    + ` The appraiser is not a title expert. This is a brief summary only; the appraisal assumes the title is marketable and free of adverse encumbrances other than those noted. The client should consult a title officer regarding any title concerns.`;
}
function rdExtras(meta) {
  const rv = cur.review[RD.id]; cur.uad = cur.uad || {}; const U = cur.uad; const opt = (list, v) => '<option value="">—</option>' + list.map(([k, l]) => `<option value="${k}"${v === k ? ' selected' : ''}>${l}</option>`).join('');
  const yn = (k) => `<select data-uad="${k}">${[['', '—'], ['true', 'Yes'], ['false', 'No']].map(([x, l]) => `<option value="${x}"${String(U[k] ?? '') === x ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  if (meta.type === 'contract') { rv.parts = rv.parts || [];
    return `<div class="rdx"><h4>Parts of this ${RD.pdf ? RD.pdf.numPages + '-page ' : ''}document</h4>
      ${rv.parts.map((x, i) => `<div class="row"><select data-pk="${i}">${PART_KINDS.map(k => `<option${x.kind === k ? ' selected' : ''}>${k}</option>`).join('')}</select><input data-pp="${i}" value="${h(x.pages)}" placeholder="pages, e.g. 1-17" size="8"><button type="button" class="lnk" data-pdel="${i}">remove</button></div>`).join('')}
      <div class="row"><button type="button" class="btn ghost small" id="rdPartAdd">+ Add a part (starting on page ${RD.page})</button></div>
      <p class="help">${h(partsSentence(rv.parts, RD.pdf ? RD.pdf.numPages : null)) || 'Add each part (purchase agreement, counters, addenda, lease, 1031 agreement, disclosures) to build the sentence for the report.'}</p></div>
    <div class="rdx"><h4>UAD 3.6 sales contract</h4><table class="facts uadm">
      <tr><th>20.004 Contract price</th><td><input data-uad="price" value="${h(U.price ?? (fval(RD.id, 'price')[0] || ''))}"></td></tr>
      <tr><th>20.005 Contract date</th><td><input data-uad="cdate" value="${h(U.cdate ?? (fval(RD.id, 'acceptDate')[0] || ''))}" placeholder="MM/DD/YYYY"></td></tr>
      <tr><th>20.006 Transfer terms</th><td><select data-uad="saleType">${opt(SALE_TYPES, U.saleType)}</select></td></tr>
      <tr><th>20.002 Arm's length?</th><td>${yn('arms')}</td></tr>
      <tr><th>20.007 Personal property conveyed?</th><td>${yn('pp')}</td></tr>
      <tr><th>20.008 Sales concessions?</th><td>${yn('conc')}</td></tr>
      <tr><th>20.009 Total concessions ($)</th><td><input data-uad="concAmt" value="${h(U.concAmt || '')}" inputmode="decimal"></td></tr>
      <tr><th>20.010 Typical for the market?</th><td>${yn('concTyp')}</td></tr></table>
      <h4>20.011 Sales contract analysis <small class="muted">5,000 characters</small></h4><textarea data-uad="cmt" rows="8">${h(U.cmt ?? contractDraft(RD.id))}</textarea>
      <div class="row"><button type="button" class="btn ghost small" data-redo="contract">Draft again from the accepted entries</button><button type="button" class="btn ghost small" data-copyuad="cmt">Copy</button></div></div>`; }
  if (meta.type === 'prelim') {
    return `<div class="rdx"><h4>UAD 3.6 site – encumbrances</h4><table class="facts uadm">
      <tr><th>4.050 Easement noted</th><td>${yn('encEase')}</td></tr><tr><th>4.055 Easement type</th><td><select data-uad="easeType">${opt(EASE_TYPES, U.easeType)}</select></td></tr>
      <tr><th>4.068 Improvement within an easement?</th><td>${yn('impInEase')}</td></tr>
      <tr><th>4.050 Property restrictions (CC&Rs)</th><td>${yn('encCcr')}</td></tr><tr><th>4.051 Restriction type</th><td><select data-uad="restType">${opt(REST_TYPES, U.restType)}</select></td></tr>
      <tr><th>4.050 Encroachment</th><td>${yn('encEncr')}</td></tr><tr><th>3.029 Mineral rights leased?</th><td>${yn('mineral')}</td></tr></table>
      <p class="help">You decide how each easement or restriction affects market appeal and marketability; say so in the comments.</p>
      <h4>Title summary for the report</h4><textarea data-uad="title" rows="7">${h(U.title ?? prelimDraft(RD.id))}</textarea>
      <div class="row"><button type="button" class="btn ghost small" data-redo="prelim">Draft again from the accepted entries</button><button type="button" class="btn ghost small" data-copyuad="title">Copy</button></div></div>`; }
  return '';
}
function rdWireExtras(side) {
  const rv = cur.review[RD.id];
  side.querySelectorAll('[data-uad]').forEach(el => el.onchange = el.oninput = () => { cur.uad[el.dataset.uad] = el.value; saveLetter(true, true); });
  side.querySelectorAll('[data-redo]').forEach(b => b.onclick = () => { const k = b.dataset.redo === 'contract' ? 'cmt' : 'title'; cur.uad[k] = b.dataset.redo === 'contract' ? contractDraft(RD.id) : prelimDraft(RD.id); saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-copyuad]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(cur.uad[b.dataset.copyuad] ?? side.querySelector(`[data-uad="${b.dataset.copyuad}"]`).value); toast('Copied – paste it into SFREP'); } catch (e) { toast('Select the text and press Ctrl+C'); } });
  side.querySelectorAll('[data-pk]').forEach(s => s.onchange = () => { rv.parts[+s.dataset.pk].kind = s.value; saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-pp]').forEach(i => i.onchange = () => { rv.parts[+i.dataset.pp].pages = i.value; saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => { rv.parts.splice(+b.dataset.pdel, 1); saveLetter(true, true); rdRender(); });
  const pa = side.querySelector('#rdPartAdd'); if (pa) pa.onclick = () => { rv.parts.push({ kind: rv.parts.length ? 'Addendum' : 'Purchase agreement', pages: String(RD.page) }); saveLetter(true, true); rdRender(); };
}

/* ---------- sticky notes ---------- */
const TAGS = [['important', 'Important'], ['market', 'Affects market appeal / marketability'], ['clear', 'Clear before transfer'], ['ask', 'Ask the client / agent'], ['report', 'Put in the report'], ['follow', 'Follow up']];
const tagName = k => (TAGS.find(t => t[0] === k) || [, 'Note'])[1];
function stickiesHtml() {
  const S = (cur.stickies || []).filter(x => x.docId === RD.id).sort((a, b) => a.page - b.page);
  return `<div class="rdx sticky-box"><div class="row"><h4>Sticky notes</h4><span class="grow"></span><button type="button" class="btn small" id="rdStick">+ Sticky note on page ${RD.page}</button></div>
    <div id="rdStickForm" hidden><select id="rdStickTag">${TAGS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><textarea id="rdStickTxt" rows="2" placeholder="What to remember about this page"></textarea><div class="row"><button type="button" class="btn small primary" id="rdStickSave">Save note</button><button type="button" class="btn ghost small" id="rdStickCancel">Cancel</button></div></div>
    ${S.map(n => `<div class="sticky tag-${n.tag}${n.done ? ' done' : ''}"><div class="row"><b>${h(tagName(n.tag))}</b><button type="button" class="pgchip" data-goto="${n.page}">p. ${n.page}</button><span class="grow"></span><label class="check"><input type="checkbox" data-sdone="${n.id}" ${n.done ? 'checked' : ''}>done</label><button type="button" class="lnk" data-sdel="${n.id}">delete</button></div><div>${h(n.text)}</div></div>`).join('') || '<p class="help">None yet. Tag anything important so you can find it again.</p>'}</div>`;
}
function wireStickies(side) {
  const f = side.querySelector('#rdStickForm');
  side.querySelector('#rdStick').onclick = () => { f.hidden = false; side.querySelector('#rdStickTxt').focus(); };
  side.querySelector('#rdStickCancel').onclick = () => { f.hidden = true; };
  side.querySelector('#rdStickSave').onclick = () => { const t = side.querySelector('#rdStickTxt').value.trim(); if (!t) return; const meta = cur.docs.find(d => d.id === RD.id);
    (cur.stickies = cur.stickies || []).push({ id: uid(), docId: RD.id, doc: meta.name, page: RD.page, tag: side.querySelector('#rdStickTag').value, text: t, at: new Date().toISOString() }); saveLetter(true, true); rdRender(); toast('Sticky note saved on page ' + RD.page); };
  side.querySelectorAll('[data-sdone]').forEach(c => c.onchange = () => { cur.stickies.find(x => x.id === c.dataset.sdone).done = c.checked; saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-sdel]').forEach(b => b.onclick = () => { cur.stickies = cur.stickies.filter(x => x.id !== b.dataset.sdel); saveLetter(true, true); rdRender(); });
}
function renderStickies() {
  const box = $('#stickyList'); if (!box) return; const all = (cur && cur.stickies) || []; const flt = box.dataset.tag || '';
  const S = all.filter(x => !flt || x.tag === flt);
  box.innerHTML = all.length ? `<div class="row"><h4>Sticky notes</h4><select id="stickyTag"><option value="">All (${all.length})</option>${TAGS.filter(([k]) => all.some(x => x.tag === k)).map(([k, l]) => `<option value="${k}"${flt === k ? ' selected' : ''}>${l} (${all.filter(x => x.tag === k).length})</option>`).join('')}</select></div>
    ${S.map(n => `<div class="sticky tag-${n.tag}${n.done ? ' done' : ''}"><div class="row"><b>${h(tagName(n.tag))}</b><button type="button" class="lnk" data-sopen="${n.docId}" data-p="${n.page}">${h(n.doc)}, page ${n.page}</button></div><div>${h(n.text)}</div></div>`).join('')}` : '';
  const sel = box.querySelector('#stickyTag'); if (sel) sel.onchange = () => { box.dataset.tag = sel.value; renderStickies(); };
  box.querySelectorAll('[data-sopen]').forEach(b => b.onclick = () => openReader(b.dataset.sopen, +b.dataset.p));
}

function shortEx(x) { // one short phrase per exception for the report: no instrument numbers, case numbers or names
  let t = x.replace(/^#\d+:\s*/, '').replace(/…$/, '');
  t = t.split(/\.\s+(?=[A-Z])/)[0].replace(/,?\s*a certified copy of which/i, '').replace(/\s+as\s+INSTRUMENT NO\.?.*$/i, '').replace(/\s+in Book\s+\d+.*$/i, '').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b(recorded)\s+([A-Z]+)\s+(\d{1,2}),\s+(\d{4})/g, (m, r, mo, d, y) => `${r} ${mo[0] + mo.slice(1).toLowerCase()} ${d}, ${y}`);
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/* her prelim wording: a short label per exception – no dates, names or instrument numbers */
const PRELIM_SKIP = /^(General and special|General and Special City|The lien of supplemental|Assessments, for community|Assessments for community|The liens? of bonds|A deed of trust|An assignment of|Rights of the public|Water rights|The new lender|An Owner.s Certification|With respect to|Please be advised|Any rights, interests or claims of parties in possession|Rights or claims of parties in possession|The requirement that|Matters which may be disclosed by an inspection|Any facts, rights, interests|Statements? of information)/i;
const PRELIM_GENERAL = [/not shown by the public records/i, /not shown as existing liens/i, /unpatented mining claims/i, /reservations or exceptions in patents/i, /correct survey|accurate survey|inspection of the land/i,
  /discrepancies,? conflicts in boundary|shortage in area/i, /lien,? or right to a lien,? for services, labor/i, /water rights|claims or title to water/i, /escaped assessments|supplemental/i, /parties in possession|persons in possession/i,
  /proceedings by a public agency/i, /^any (facts|rights|easements|liens|encroachment|claim)/i, /if any,? (pursuant|assessed|created|shown)/i, /lies within the boundaries of|within the boundaries of the .* district|affidavit|statement of information|owner.s certification|non-institutional lender|deed of trust|reconveyance|open deeds? of trust/i];
function prelimLabel(t) {
  t = String(t).replace(/\s+/g, ' ').trim(); if (PRELIM_SKIP.test(t)) return '';
  if (PRELIM_GENERAL.some(re => re.test(t))) return ''; // the standard printed exceptions every policy has
  if (/\btax(es)?\b|assessments? (collected|levied)|bonds? and assessments|community facilit|Mello[- ]Roos/i.test(t) && !/delinquent|default|unpaid|tax lien/i.test(t)) return ''; // taxes only when delinquent
  if (/delinquent/i.test(t) && /tax/i.test(t)) return 'delinquent property taxes';
  if (/(oil|gas|mineral|hydrocarbon|subsurface)/i.test(t) && /reserv|lease|rights? to|excepting|claims?/i.test(t) && !/gas (line|main|pipe)|utilit|easement for/i.test(t)) return 'oil, gas and mineral rights';
  if (/covenants,? conditions|conditions,? (and )?restrictions|CC&R|declaration of (covenants|restrictions)/i.test(t)) return 'CC&Rs';
  if (/^matters contained/i.test(t) && !/notice (to|of) (the )?property owner/i.test(t)) return 'unknown easement';
  if (/easement/i.test(t)) {
    if (/ingress|egress|road|street|highway|access|driveway|right[- ]of[- ]way/i.test(t)) return 'road easement';
    if (/utilit|electric|\bgas\b|sewer|water (line|pipe|main|purposes)|pole|telephone|communication|cable|pipeline|power|transmission/i.test(t)) return 'utility easement';
    if (/drainage|storm|flood control/i.test(t)) return 'drainage easement';
    if (/conservation|open space|scenic|habitat/i.test(t)) return 'conservation easement';
    if (/slope/i.test(t)) return 'slope easement';
    if (/affecting (the )?easement parcel|easements? parcel/i.test(t)) return 'easements affecting the easement parcels';
    return 'unknown easement';
  }
  if (/covenants,? conditions|conditions,? (and )?restrictions|CC&R|declaration of (covenants|restrictions)/i.test(t)) return 'CC&Rs';
  if (/restrict|prohibit/i.test(t)) return 'deed restriction';
  if (/encroach|lot line adjustment|boundary/i.test(t)) return 'encroachment / boundary matters';
  if (/judgment/i.test(t)) return 'judgment';
  if (/lis pendens/i.test(t)) return 'lis pendens';
  if (/mechanic|lien/i.test(t)) return 'lien';
  if (/notice (to|of) (the )?property owner/i.test(t)) return 'notice to property owner';
  if (/matters contained|terms,? (conditions|provisions)|contained in (the|a) document/i.test(t)) { const m = t.match(/entitled:?\s+"?([^,"]{3,60})/i); return m ? 'recorded document: ' + m[1].trim().replace(/\s+recorded.*$/i, '').toLowerCase() : 'unknown easement'; }
  return 'other: ' + t.split(/[,.;]/)[0].slice(0, 60).toLowerCase();
}
function joinLabels(vals) { // "utility easement" ×2 → "utility easements"; keeps her order of importance
  const ORDER = ['road easement', 'utility easement', 'drainage easement', 'conservation easement', 'slope easement', 'unknown easement', 'easements affecting the easement parcels', 'CC&Rs', 'deed restriction', 'oil, gas and mineral rights', 'encroachment / boundary matters', 'judgment', 'lien', 'lis pendens', 'delinquent property taxes'];
  const n = {}; vals.forEach(v => { v = v.replace(/^#\d+[a-z]?:\s*/, '').trim(); n[v] = (n[v] || 0) + 1; });
  const keys = Object.keys(n).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  const out = keys.map(k => n[k] < 2 ? k : /easement$|judgment$|lien$|restriction$/.test(k) ? k + 's' : k === 'notice to property owner' ? 'notices to property owner' : k);
  return out.length > 1 ? out.slice(0, -1).join(', ') + ' and ' + out.at(-1) : out[0] || '';
}
