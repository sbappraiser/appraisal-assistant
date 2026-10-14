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
  contract: { title: 'Purchase contract', items: [['price', 'Purchase price'], ['acceptDate', 'Date of acceptance (contract date)'], ['coe', 'Close of escrow'], ['financing', 'Financing (all cash, loan amount, down payment)'], ['sellerCredit', 'Seller credit / concessions to the buyer'], ['buyerBroker', 'Buyer’s broker compensation and who pays it'], ['personal', 'Personal property included'], ['leaseback', 'Seller rent-back / leaseback'], ['exchange', '1031 exchange'], ['apprCont', 'Appraisal contingency'], ['loanCont', 'Loan contingency'], ['buyers', 'Buyer (individuals, LLC, trust)'], ['sellers', 'Seller (individuals, trust, estate, trustee)'], ['changes', 'Changes from the printed form / unusual terms']] },
  counter: { title: 'Counter offer', items: [['price', 'Price in the counter'], ['date', 'Date'], ['terms', 'Terms changed']] },
  addendum: { title: 'Addendum', items: [['date', 'Date'], ['terms', 'Terms changed']] },
  leaseback: { title: 'Leaseback / rent-back', items: [['rent', 'Rent (amount and period)'], ['term', 'Term (start and end)'], ['deposit', 'Security deposit'], ['furnished', 'Furnished / what the seller keeps'], ['terms', 'Other terms']] },
  prelim: { title: 'Preliminary title report', items: [['dated', 'Dated as of'], ['vesting', 'Vested in'], ['estate', 'Estate or interest'], ['apn', 'APN'], ['taxes', 'Property taxes'], ['transfers', 'Transfers in the last 24 months'], ['easements', 'Easements'], ['ccrs', 'CC&Rs and agreements'], ['liens', 'Deeds of trust, judgments and liens'], ['other', 'Other exceptions']] },
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
  if (isPdf(file)) { const pdfjs = await loadPdfJs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
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
  let r = find(/Dated as of\s+([A-Z][a-z]+ \d{1,2}, \d{4})/); if (r) add('dated', r.m[1], r.p, r.m[0]);
  r = find(/vested in:?\s*([\s\S]{3,300}?)\n\s*(?:The estate|SUBJECT TO|$)/i); if (r) add('vesting', r.m[1], r.p, r.m[0]);
  r = find(/covered by this (?:Report|Commitment) is:?\s*([A-Z][A-Za-z ]{2,40})/i); if (r) add('estate', r.m[1], r.p, r.m[0]);
  r = find(/A\.?\s?P\.?\s?N?o?\.?:?\s*(\d{3}-\d{3}-\d{3})/); if (r) add('apn', r.m[1], r.p, r.m[0]);
  r = find(/(First Installment:?\s*\$[\d,.]+[^\n]*)[\s\S]{0,120}?(Second Installment:?\s*\$[\d,.]+[^\n]*)/i); if (r) add('taxes', r.m[1] + '; ' + r.m[2], r.p, r.m[0]);
  r = find(/no conveyance of the land within a period of\s+(\w+(?:-\s?\w+)?) months[\s\S]{0,80}?except as follows:\s*([^\n]+)/i); if (r) add('transfers', r.m[2], r.p, r.m[0]);
  // numbered exceptions: from "exceptions to coverage" to the informational notes
  const joined = all.map(x => x.t.split('\n').map(l => ({ l, p: x.p }))).flat();
  let on = false, curEx = null; const ex = [];
  for (const { l, p } of joined) {
    if (/exceptions to coverage in addition/i.test(l)) { on = true; continue; }
    if (on && /INFORMATIONAL NOTES|^\s*REQUIREMENTS\b|LEGAL DESCRIPTION/i.test(l)) { on = false; continue; }
    if (!on) continue;
    const m = l.match(/^\s*(\d{1,2})\.\s+(.*)$/);
    if (m && +m[1] === ex.length + 1) { curEx = { n: +m[1], text: m[2], p }; ex.push(curEx); }
    else if (curEx && !/Page \d+ of \d+|Order Number|Page Number|First American Title|^\s*$/i.test(l)) curEx.text += ' ' + l.trim();
  }
  const kind = e => /^(General and special taxes|The lien of supplemental taxes|Assessments)/i.test(e.text) ? 'taxes' : /easement/i.test(e.text) ? 'easements' : /covenants|conditions and restrictions|CC&R|agreement|declaration/i.test(e.text) ? 'ccrs' : /deed of trust to secure|judgment|mechanic|lis pendens|abstract of|tax lien|notice of (default|lien)/i.test(e.text) ? 'liens' : 'other';
  ex.forEach(e => { const k = kind(e); const amt = (e.text.match(/\$[\d,]+(?:\.\d\d)?/) || [''])[0]; add(k, `#${e.n}: ${e.text.slice(0, 220)}${e.text.length > 220 ? '…' : ''}`, e.p, e.text.slice(0, 300)); });
  return S;
}

/* ---------- the reader window ---------- */
const RD = { id: null, rec: null, page: 1, pdf: null, sugg: [], boxes: {}, q: '' };
async function openReader(id, page, q) {
  const meta = (cur.docs || []).find(d => d.id === id); if (!meta) return;
  RD.id = id; RD.page = page || 1; RD.q = q || ''; RD.boxes = {}; RD.pdf = null; RD.extra = null;
  toast('Opening ' + meta.name + '…');
  const rec = await docPages(id); if (!rec) { toast('That file is no longer stored'); return; } RD.rec = rec;
  if (isPdf({ name: rec.name, type: rec.mime })) { const pdfjs = await loadPdfJs(); RD.pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false }).promise; }
  cur = readForm(); cur.review = cur.review || {}; const rv = cur.review[id] = cur.review[id] || { sugg: [] };
  if (meta.type === 'prelim' && !rv.sugg.some(s => s.by === 'reader')) { rv.sugg.push(...readPrelim(rec.pagesText).map(s => ({ ...s, id: uid(), state: 'new' }))); saveLetter(true, true); }
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
    ${C.items.map(rowFor).join('')}
    <div class="rdai"><h4>Read with Claude</h4>${!aiOk ? `<p class="help">${ai === 'No' ? 'This order is set to <b>No AI</b>, so nothing from it can be sent.' : 'Choose <b>AI use on this job</b> on the Order &amp; letter tab first. Until then nothing is sent.'}</p>`
      : !key ? `<p class="help">Add your Claude API key on the Standard wording tab (AI settings) to use this. It stays in this browser.</p>`
      : `<p class="help">Sends page pictures (not the file) of pages <input id="rdFrom" value="1" size="2" inputmode="numeric"> to <input id="rdTo" value="${Math.min(20, RD.pdf ? RD.pdf.numPages : 1)}" size="2" inputmode="numeric"> to Claude. ${ai === 'Redacted' ? 'Names, phones, emails and numbers are painted out first, and you see every page before it is sent.' : 'This order allows AI without redaction; you still see the pages first.'}</p>
        <button type="button" class="btn" id="rdPrep">${ai === 'Redacted' ? 'Prepare redacted pages' : 'Prepare pages'}</button>`}</div>`;
  const side = $('#rdSide');
  side.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { RD.page = +b.dataset.goto; rdPage(); });
  side.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { const s = rv.sugg.find(x => x.id === b.dataset.acc); const v = side.querySelector(`[data-sugv="${s.id}"]`).value.trim(); s.state = 'accepted';
    (cur.facts = cur.facts || []).push({ id: uid(), docId: RD.id, doc: meta.name, type: meta.type, key: s.key, label: (C.items.find(i => i[0] === s.key) || [, s.key])[1], value: v, page: s.page, by: v === s.value ? s.by : 'you', at: new Date().toISOString() }); saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => { rv.sugg.find(x => x.id === b.dataset.rej).state = 'rejected'; saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-unfact]').forEach(b => b.onclick = () => { cur.facts = cur.facts.filter(f => f.id !== b.dataset.unfact); saveLetter(true, true); rdRender(); });
  side.querySelectorAll('[data-ownadd]').forEach(b => b.onclick = () => { const k = b.dataset.ownadd, i = side.querySelector(`[data-own="${k}"]`); const v = i.value.trim(); if (!v) return;
    (cur.facts = cur.facts || []).push({ id: uid(), docId: RD.id, doc: meta.name, type: meta.type, key: k, label: (C.items.find(x => x[0] === k) || [, k])[1], value: v, page: RD.page, by: 'you', at: new Date().toISOString() }); saveLetter(true, true); rdRender(); });
  const prep = $('#rdPrep'); if (prep) prep.onclick = () => rdPrepare();
  const aa = $('#rdAccAll'); if (aa) aa.onclick = () => { side.querySelectorAll('[data-acc]').forEach(b => b.click()); };
}

/* ---------- searching every document in the order ---------- */
async function searchDocs(q) {
  const out = $('#docHits'); q = q.trim(); if (q.length < 3) { out.innerHTML = ''; return; }
  out.innerHTML = '<p class="help">Searching…</p>'; const hits = [];
  for (const d of cur.docs || []) { let rec; try { rec = await docPages(d.id); } catch (e) { continue; } if (!rec || !rec.pagesText) continue;
    rec.pagesText.forEach((t, i) => { const at = t.toLowerCase().indexOf(q.toLowerCase()); if (at >= 0) hits.push({ d, p: i + 1, s: t.slice(Math.max(0, at - 70), at + q.length + 90).replace(/\s+/g, ' ') }); }); }
  out.innerHTML = hits.length ? `<ul class="hits2">${hits.slice(0, 60).map(x => `<li><button type="button" class="lnk" data-hit="${x.d.id}" data-p="${x.p}">${h(x.d.name)} · page ${x.p}</button><small>${h(x.s)}</small></li>`).join('')}</ul>${hits.length > 60 ? `<p class="help">${hits.length - 60} more.</p>` : ''}` : '<p class="help">Not found in the readable text. Scanned pages cannot be searched until they are run through Acrobat’s Recognize Text.</p>';
  out.querySelectorAll('[data-hit]').forEach(b => b.onclick = () => openReader(b.dataset.hit, +b.dataset.p, q));
}
function renderFacts() {
  const box = $('#factList'); if (!box) return; const F = (cur && cur.facts) || [];
  box.innerHTML = F.length ? `<h4>Facts accepted from the documents</h4><table class="facts">${F.map(f => `<tr><th>${h(f.label)}</th><td>${h(f.value)} <small class="muted">${h(f.doc)}${f.page ? ', p. ' + f.page : ''}</small></td></tr>`).join('')}</table>` : '';
}

/* ---------- AI settings (stay in this browser) ---------- */
const aiKey = () => { try { return localStorage.getItem('aa.claudeKey') || ''; } catch (e) { return ''; } };
const aiModel = () => { try { return localStorage.getItem('aa.claudeModel') || 'claude-sonnet-5-5'; } catch (e) { return 'claude-sonnet-5-5'; } };

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
  (RD.boxes[n] || []).forEach(b => { g.fillStyle = '#000'; g.fillRect(b.x * cv.width, b.y * cv.height, b.w * cv.width, b.h * cv.height); hits++; });
  return { cv, hits };
}
async function rdPrepare() {
  if (!RD.pdf) { toast('Claude reading works on PDF files'); return; }
  const from = Math.max(1, parseInt($('#rdFrom').value, 10) || 1), to = Math.min(RD.pdf.numPages, parseInt($('#rdTo').value, 10) || from, from + 29);
  const red = cur.aiUse === 'Redacted'; const pane = $('#rdSend'); pane.hidden = false; if (RD.extra == null) RD.extra = cur.redactNames || '';
  pane.innerHTML = `<div class="rdsendbar"><b>${red ? 'Redacted pages' : 'Pages'} ${from}–${to}: check every page.</b> ${red ? 'Black boxes are painted into the picture itself, so the hidden words are gone. Drag on a page to black out anything else (signatures, account numbers).' : ''}
    ${red ? `<label>Also remove these names <span class="opt">separate with commas – buyers, sellers, agents, anyone else on the pages</span><input id="rdExtra" value="${h(RD.extra || '')}" placeholder="Broadway Warehouse, Colleen Casey"></label><p class="help">Signatures and initials are pictures, not text: drag a box over each one.</p>` : ''}
    <span class="row"><button type="button" class="btn primary" id="rdGo">Send these ${to - from + 1} pages to Claude</button><button type="button" class="btn ghost" id="rdCancel">Cancel</button></span></div><div id="rdThumbs" class="rdthumbs"></div>`;
  const th = $('#rdThumbs'); RD.prepared = [];
  for (let n = from; n <= to; n++) { const { cv, hits } = await redactPage(n, red); cv.dataset.n = n; const wrap = document.createElement('figure'); wrap.innerHTML = `<figcaption>Page ${n}${red ? ` · ${hits} item${hits === 1 ? '' : 's'} blacked out` : ''}</figcaption>`; wrap.prepend(cv); th.appendChild(wrap); RD.prepared.push(n);
    if (red) { let st = null; cv.onpointerdown = e => { const r = cv.getBoundingClientRect(); st = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; cv.setPointerCapture(e.pointerId); };
      cv.onpointerup = async e => { if (!st) return; const r = cv.getBoundingClientRect(); const en = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; const b = { x: Math.min(st[0], en[0]), y: Math.min(st[1], en[1]), w: Math.abs(en[0] - st[0]), h: Math.abs(en[1] - st[1]) }; st = null; if (b.w < 0.01 || b.h < 0.005) return;
        (RD.boxes[n] = RD.boxes[n] || []).push(b); const { cv: nv, hits: nh } = await redactPage(n, true); cv.getContext('2d').drawImage(nv, 0, 0); wrap.querySelector('figcaption').textContent = `Page ${n} · ${nh} items blacked out`; }; } }
  $('#rdCancel').onclick = () => { pane.hidden = true; pane.innerHTML = ''; };
  const ex = $('#rdExtra'); if (ex) ex.onchange = () => { RD.extra = ex.value; cur.redactNames = ex.value; saveLetter(true, true); rdPrepare(); };
  $('#rdGo').onclick = () => rdSend(red);
}
async function rdSend(red) {
  const meta = cur.docs.find(d => d.id === RD.id), C = checkFor(meta.type); const go = $('#rdGo'); go.disabled = true; go.textContent = 'Claude is reading…';
  try {
    const imgs = []; for (const cv of document.querySelectorAll('#rdThumbs canvas')) { const data = cv.toDataURL('image/jpeg', 0.82).split(',')[1]; imgs.push({ n: +cv.dataset.n, data }); }
    const content = [];
    imgs.forEach(im => { content.push({ type: 'text', text: `Page ${im.n}:` }); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: im.data } }); });
    content.push({ type: 'text', text: `This is a ${C.title.toLowerCase()} for a residential appraisal of ${street(readForm()) || 'a property'} in California. Read the pages above and fill this checklist:\n${C.items.map(([k, l]) => `- ${k}: ${l}`).join('\n')}\n\nAnswer with JSON only, in this form: {"items":[{"key":"<checklist key>","value":"<what the document says, short>","page":<page number>,"quote":"<the words you read it from>"}]}. Use only what the pages show; leave a key out when the pages do not cover it. Black boxes are redactions: do not guess what is under them. Do not give an opinion of value.` });
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: aiModel(), max_tokens: 4000, system: 'You read real estate documents for a residential appraiser and report exactly what they say, with page numbers. Reply with JSON only.', messages: [{ role: 'user', content }] }) });
    const j = await res.json(); if (!res.ok) throw new Error((j.error && j.error.message) || 'Claude answered with an error (' + res.status + ')');
    const txt = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''); const js = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
    const items = (JSON.parse(js).items || []).filter(x => x && x.key && x.value);
    const rv = cur.review[RD.id]; items.forEach(x => rv.sugg.push({ id: uid(), key: C.items.some(i => i[0] === x.key) ? x.key : C.items[C.items.length - 1][0], value: String(x.value), page: +x.page || null, quote: String(x.quote || ''), by: 'claude', state: 'new' }));
    (cur.aiLog = cur.aiLog || []).push({ at: new Date().toISOString(), doc: meta.name, pages: imgs.map(i => i.n), mode: red ? 'redacted' : 'full', model: aiModel(), items: items.length });
    saveLetter(true, true); $('#rdSend').hidden = true; rdRender(); toast(`Claude read ${imgs.length} pages and suggested ${items.length} entries – accept or reject each one`, 5000);
  } catch (e) { console.error(e); toast('Not sent or not read: ' + (e.message || e), 6000); go.disabled = false; go.textContent = 'Try again'; }
}
