/* Appraisal Assistant – orders: intake form, documents, engagement letter, clients, hand-off to the other modules.
   Forked from the Engagement Letter Writer; the letter wording still comes from engagement-letter-writer/src. */
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('el.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('el.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CLIENT_KEYS = ['name', 'company', 'addr1', 'addr2', 'phone', 'email'];
let contacts = store.get('contacts', []);
let letters = [];        // every order (kept in IndexedDB 'aa-orders')
let aiText = store.get('aiText', null);
let cur = null;           // the letter being edited
let clientCount = 1;

const NEW_FIELDS = { street: '', city: '', state: 'CA', zip: '', zip4: '', stage: 'New', inspDate: '', inspTime: '', effDate: '', unit: '', apn: '', county: '', lat: '', lon: '', owner: '', legal: '', borrower: '',
  lenderDiff: false, govAgency: '', investorId: '', reportForm: '', lenderCo: '', lenderAddr1: '', lenderAddr2: '', loanNo: '', amcUsed: false, amcCo: '', amcAddr1: '', amcAddr2: '', amcLic: '', amcState: 'CA', amcExp: '', amcFee: '', amcRef: '', notes: '', todos: '' };
function blankLetter() {
  return { ...NEW_FIELDS, docs: [], crs: null, listings: [], permits: null, created: new Date().toISOString(), id: uid(), status: 'Client letter', reportForm: 'uad36', fileNo: '', orderDate: todayISO(), dueDate: '', aiUse: '', orderDoc: null, agreeDate: todayISO(), type: 'uadPurchase', clients: [{}], address: '', propType: 'sfr', propTypeOther: '',
    interest: '', decedent: '', dod: '', otherUsers: '', inspection: 'interior', apSales: true, apCost: true, apIncome: false, format: '',
    listing: 'omit', listingDetail: '', ea: '', hc: '', accessName: '', accessRel: '', accessPhone: '', fee: '', retainer: '', payDue: '', payWhen: 'inspection', deliveryN: '14', deliveryUnit: 'days', deliveryFrom: 'either', userText: '', delivery: '', ai: true, extra: '', premise: 'asis', completion: '', plans: '', purpose: '', joint: true, rent: false, rentFee: '', testimony: false, tRate: '250', tDecl: '350', tRetainer: '2500', tCancel: '250', ...store.get('rates', {}) };
}

/* ---------- form <-> object ---------- */
const FIELDS = ['fileNo', 'orderDate', 'dueDate', 'agreeDate', 'type', 'status', 'address', 'propType', 'propTypeOther', 'interest', 'decedent', 'dod', 'otherUsers', 'inspection', 'apSales', 'apCost', 'apIncome',
  'format', 'listing', 'listingDetail', 'ea', 'hc', 'accessName', 'accessRel', 'accessPhone', 'fee', 'retainer', 'payDue', 'payWhen', 'deliveryN', 'deliveryUnit', 'deliveryFrom', 'userText', 'extra', 'premise', 'completion', 'plans', 'purpose', 'joint', 'rent', 'rentFee', 'testimony', 'tRate', 'tDecl', 'tRetainer', 'tCancel',
  ...Object.keys(NEW_FIELDS)];
function readForm() {
  const f = { ...cur };
  FIELDS.forEach(k => { const el = $('#f_' + k); if (!el) return; f[k] = el.type === 'checkbox' ? el.checked : el.value; });
  f.clients = [];
  for (let i = 0; i < clientCount; i++) { const c = {}; CLIENT_KEYS.forEach(k => { c[k] = $(`#c${i}_${k}`).value; }); f.clients.push(c); }
  const r = document.querySelector('input[name=aiUse]:checked'); f.aiUse = r ? r.value : '';
  f.ai = f.aiUse !== 'No';
  f.aiText = aiText || AI_DEFAULT;
  return f;
}
function writeForm(f) {
  if (!f.payWhen) f.payWhen = (f.payDue || '').trim() ? 'other' : 'inspection';
  if (!f.deliveryN) { const dp = deliveryParts(f, TYPES[f.type] || TYPES.dod); f.deliveryN = dp.n; f.deliveryUnit = dp.unit; f.deliveryFrom = f.deliveryFrom || 'either'; }
  loadOrderAddr(f);
  FIELDS.forEach(k => { if (ADDR_KEYS.includes(k) || k === 'address') return; const el = $('#f_' + k); if (!el) return; if (el.type === 'checkbox') el.checked = f[k] !== false && !!f[k]; else el.value = f[k] ?? ''; });
  clientCount = Math.max(1, Math.min(3, (f.clients || []).length || 1));
  renderClients(f.clients || [{}]);
  document.querySelectorAll('input[name=aiUse]').forEach(r => { r.checked = r.value === f.aiUse; });
  renderScan(f.orderDoc);
  renderDocs(); renderSubject(); renderLinks();
  syncVisibility();
}

function renderClients(list) {
  const box = $('#clients'); box.innerHTML = '';
  for (let i = 0; i < clientCount; i++) {
    const c = list[i] || {};
    const d = document.createElement('div'); d.className = 'client';
    d.innerHTML = `<div class="client-head"><span class="eyebrow">${clientCount > 1 ? 'Client ' + (i + 1) : 'Client'}</span>
      <div class="client-actions"><select id="c${i}_pick" aria-label="Pick a saved client"><option value="">Pick a saved client…</option>${contacts.map((x, j) => `<option value="${j}">${hesc(x.name || x.company || 'Unnamed')}</option>`).join('')}</select>
${i > 0 ? `<button type="button" class="btn ghost small" id="c${i}_rm">Remove</button>` : ''}</div></div>
      <div class="grid2">
        <label>Name<input id="c${i}_name" autocomplete="off" placeholder="Margaret A. Ellison, Successor Trustee"></label>
        <label>Company or firm <span class="opt">optional</span><input id="c${i}_company" autocomplete="off"></label>
        <label>Street address<input id="c${i}_addr1" autocomplete="off"></label>
        <label>City, state, ZIP<input id="c${i}_addr2" autocomplete="off" placeholder="Santa Barbara, CA 93108"></label>
        <label>Phone<input id="c${i}_phone" autocomplete="off"></label>
        <label>Email<input id="c${i}_email" type="email" autocomplete="off"></label>
      </div>`;
    box.appendChild(d);
    CLIENT_KEYS.forEach(k => { $(`#c${i}_${k}`).value = c[k] || ''; });
    $(`#c${i}_pick`).onchange = e => { const x = contacts[e.target.value]; if (x) { CLIENT_KEYS.forEach(k => { $(`#c${i}_${k}`).value = x[k] || ''; }); update(); } e.target.value = ''; };
    if (i > 0) $(`#c${i}_rm`).onclick = () => { const f = readForm(); f.clients.splice(i, 1); clientCount--; renderClients(f.clients); update(); };
  }
  $('#addClient').hidden = clientCount >= 3;
  box.querySelectorAll('input').forEach(el => el.addEventListener('input', update));
}

function syncVisibility() {
  const t = TYPES[$('#f_type').value]; $('#dodBox').hidden = !t.retro;
  const L = t.dateLabels || ['Name of decedent', 'Date of death']; $('#lblWho').textContent = L[0]; $('#lblDate').textContent = L[1];
  $('#f_decedent').placeholder = t.dateLabels && t.dateLabels[2] && t.dateLabels[0] !== t.dateLabels[2] ? t.dateLabels[2] : '';
  const ou = $('#f_otherUsers').value.trim(); const un = $('#usersNote');
  if (/^(no|none|n\/?a|nil|-+)\b/i.test(ou)) { un.hidden = false; un.textContent = 'Read as no other intended users. The letter says the Client is the sole intended user.'; }
  else if (ou && !$('#f_userText').value.trim() && (/intended user/i.test(ou) || /[.!]\s+[A-Z]/.test(ou))) { un.hidden = false; un.textContent = 'This reads as a full sentence, so it prints as your own wording for Intended User. Move it to the box below to keep this box for names.'; }
  else un.hidden = true;
  $('#payOtherBox').hidden = $('#f_payWhen').value !== 'other';
  $('#deliveryNote').textContent = $('#f_payWhen').value === 'report' ? 'Payment is due on delivery, so delivery is usually counted from the inspection.' : '';
  $('#purposeBox').hidden = !t.purpose; $('#premiseBox').hidden = !t.premise || t.retro;
  const pm = $('#f_premise').value; $('#completionBox').hidden = !['prospective', 'both'].includes(pm); $('#plansBox').hidden = pm === 'asis' && !['proposed', 'renovation'].includes($('#f_propType').value);
  $('#jointBox').hidden = !t.divorce; $('#rentFeeBox').hidden = !$('#f_rent').checked; $('#testimonyBox').hidden = !$('#f_testimony').checked;
  $('#f_propTypeOther').closest('label').hidden = $('#f_propType').value !== 'other';
  $('#listingDetailBox').hidden = !['listed', 'contract'].includes($('#f_listing').value);
  const pt = PROPERTY_TYPES.find(p => p[0] === $('#f_propType').value);
  $('#f_format').placeholder = t.formatDefault || (pt ? pt[2] : ''); $('#f_interest').placeholder = (pt && pt[3]) || 'Fee Simple';
  $('#f_ea').placeholder = t.ea; $('#f_hc').placeholder = t.hc;
  const ai = (document.querySelector('input[name=aiUse]:checked') || {}).value;
  $('#aiNote').textContent = ai === 'Yes' ? 'AI may be used. The AI-use paragraph is in the letter.' : ai === 'Redacted' ? 'AI only on documents with names and personal information removed. The AI-use paragraph is in the letter.' : ai === 'No' ? 'No AI on this job. The AI-use paragraph is left out of the letter.' : 'Not chosen yet. The letter includes the AI-use paragraph until you choose No AI.';
  if (!$('#f_reportForm').value) $('#f_reportForm').value = defaultForm($('#f_type').value, $('#f_propType').value);
  const rf = $('#f_reportForm').value;
  syncFormSel();
  $('#formNote').textContent = rf === 'uad26' ? 'UAD 2.6 (legacy 1004 / 1073 / 1025) – for clients that still order it.' : rf === 'uad36' ? 'UAD 3.6 (new URAR): the inspection app and SFREP export are built for this.' : '';
  $('#gseBox').hidden = !t.uad; $('#lenderBox').hidden = !$('#f_lenderDiff').checked; $('#amcBox').hidden = !$('#f_amcUsed').checked;
  const eff = $('#f_effDate').value || (t.retro ? $('#f_dod').value : $('#f_inspDate').value);
  $('#effNote').textContent = eff ? 'Effective date: ' + longDate(eff) + ($('#f_effDate').value ? ' (typed in)' : t.retro ? ' (the ' + (t.dateLabels ? t.dateLabels[1].toLowerCase() : 'date of death') + ')' : ' (the inspection date)') : t.retro ? 'Effective date: fill in the ' + (t.dateLabels ? t.dateLabels[1].toLowerCase() : 'date of death') + ' below.' : 'Effective date: the inspection date, once it is set.';
  $('#typeNote').textContent = (t.retro ? 'Retrospective value as of the ' + (t.dateLabels ? t.dateLabels[1].toLowerCase() : 'effective date') + '.' : 'Current value as of the inspection date.') + (t.draft ? ' This letter type is a draft – review its wording before you send it.' : '');
}

function applyTypeDefaults() {
  const t = TYPES[$('#f_type').value];
  const dp = deliveryParts({}, t); $('#f_deliveryN').value = dp.unit === 'weeks' ? String(+dp.n * 7) : dp.n; $('#f_deliveryUnit').value = 'days';
  $('#f_listing').value = t.listingDefault ? 'notListed' : 'omit';
  $('#f_premise').value = t.premiseDefault || (['proposed', 'renovation'].includes($('#f_propType').value) ? 'both' : 'asis');
}
function applyPropDefaults() {
  const condo = $('#f_propType').value === 'condo';
  $('#f_apCost').checked = !condo;
  $('#f_apIncome').checked = $('#f_propType').value === 'multi';
  const pt = $('#f_propType').value; if (pt === 'land') $('#f_apCost').checked = false; if (['proposed', 'renovation'].includes(pt)) { $('#f_apCost').checked = true; if ($('#f_premise').value === 'asis') $('#f_premise').value = 'both'; }
}

/* ---------- preview ---------- */
let tmr = null;
function update() { clearTimeout(tmr); tmr = setTimeout(render, 60); }
function render() {
  const f = readForm(); cur = f;
  const theirs = f.status === 'Client letter';
  const mine = !theirs && (f.letterMode === 'mine' || f.letterMade || ['Sent', 'Signed'].includes(f.status) || (!f.wizard && String(f.created || '') < '2026-10-16'));
  $('#paperWrap').hidden = !mine; $('#btnDocx').hidden = !mine; $('#missing').hidden = !mine; $('#clientView').hidden = !theirs; $('#orderSummary').hidden = theirs || mine;
  if (theirs) renderClientView(f); else if (!mine) renderOrderSummary(f);
  $('#sheet').innerHTML = previewHTML(buildLetter(f));
  $('#fileName').textContent = fileName(f);
  const missing = [];
  if (!f.aiUse) missing.push('AI use');
  if (!(f.clients[0].name || '').trim()) missing.push('client name');
  if (!f.address.trim()) missing.push('property address');
  if (!String(f.fee).trim()) missing.push('fee');
  const DL = TYPES[f.type].dateLabels || ['decedent', 'date of death'];
  if (TYPES[f.type].retro && !f.decedent.trim() && !['divorceRetro', 'otherRetro', 'taxAppeal'].includes(f.type)) missing.push(DL[0].toLowerCase());
  if (TYPES[f.type].retro && !f.dod) missing.push(DL[1].toLowerCase());
  if (TYPES[f.type].purpose && !f.purpose.trim()) missing.push('purpose');
  if (['prospective', 'both'].includes(f.premise) && TYPES[f.type].premise && !f.completion) missing.push('completion date');
  $('#missing').textContent = missing.length ? 'Still blank: ' + missing.join(', ') + '. Blanks print as lines to fill by hand.' : 'Every main field is filled in.';
  $('#missing').className = missing.length ? 'missing warn' : 'missing ok';
  if (hasContent(f)) { clearTimeout(autoT); autoT = setTimeout(() => saveLetter(true, true), 700); }
  try { localStorage.setItem('aa.curOrder', f.id); } catch (e) {}
  renderLinks();
}
let autoT = null;
const hasContent = f => !!(f.fileNo || (f.address || '').trim() || (f.docs || []).length || ((f.clients || [])[0] || {}).name || ((f.clients || [])[0] || {}).company || letters.some(x => x.id === f.id));
const street = f => (f.address || '').split(',')[0].trim();
const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
const fileName = f => safe(`${f.fileNo ? f.fileNo + ' ' : ''}${street(f) || 'No address yet'} - Engagement Letter`) + '.docx';

/* ---------- actions ---------- */
function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, ms || 2600); }
function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 3000);
}
function upsertClients(f) { // the client list grows with every saved letter
  let n = 0;
  (f.clients || []).forEach(c => {
    const x = {}; CLIENT_KEYS.forEach(k => { x[k] = (c[k] || '').trim(); }); if (!x.name && !x.company) return;
    const key = o => ((o.email || '') ? 'e:' + o.email.toLowerCase() : 'n:' + (o.name || '').toLowerCase() + '|' + (o.company || '').toLowerCase());
    let j = contacts.findIndex(o => key(o) === key(x)); if (j < 0) j = contacts.findIndex(o => (o.name || '').toLowerCase() === (x.name || '').toLowerCase() && x.name);
    const job = f.fileNo || street(f) || '';
    if (j >= 0) { const o = contacts[j]; CLIENT_KEYS.forEach(k => { if (x[k]) o[k] = x[k]; }); o.jobs = [...new Set([...(o.jobs || []), job].filter(Boolean))]; o.lastLetter = f.agreeDate; }
    else { contacts.push({ ...x, jobs: job ? [job] : [], lastLetter: f.agreeDate, added: todayISO() }); n++; }
  });
  contacts.sort((a, b) => (a.name || a.company || '').localeCompare(b.name || b.company || ''));
  store.set('contacts', contacts); renderContacts(); return n;
}
function saveLetter(quiet, auto) { // auto = the quiet save while typing (clients are added on a real save, so half-typed names never land in the list)
  clearTimeout(autoT);
  const f = readForm(); f.saved = new Date().toISOString(); f.effective = effectiveDate(f); const added = auto ? 0 : upsertClients(f); cur = f;
  const i = letters.findIndex(x => x.id === f.id); if (i >= 0) letters[i] = f; else letters.unshift(f);
  ODB.put('orders', f).then(() => { if (!quiet) toast('Order saved' + (added ? ' · ' + added + ' new client' + (added > 1 ? 's' : '') + ' added' : '')); })
    .catch(e => toast('Could not save in this browser (' + (e.message || e) + ') – use Back up to keep a copy'));
  renderLetters();
}
function downloadDocx() {
  const f = readForm();
  download(makeDocx(buildLetter(f), { title: `Engagement Letter – ${f.address || ''}`, footer: f.fileNo ? `File ${f.fileNo} · ` : '' }), fileName(f),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  cur.letterMade = true; saveLetter(true); toast('Saved ' + fileName(f) + ' to Downloads');
}
let clShown = '';
function renderClientView(f) {
  const box = $('#clientView'); const L = (f.docs || []).filter(d => d.type === 'clientLetter');
  const key = L.map(d => d.id).join(',') + '|' + (f.facts || []).length + '|' + ((f.orderDoc || {}).verdict || '');
  if (key === clShown && box.innerHTML) return; clShown = key;
  const req = (f.facts || []).filter(x => L.some(d => d.id === x.docId));
  const V = { stop: 'AI not allowed by this letter.', look: 'AI only with confidential information removed – read the marked paragraphs on the left.', clear: 'No AI or confidentiality restriction found.' };
  box.innerHTML = `<h3>Client’s engagement letter</h3>
    ${L.length ? `${L.map(d => `<div class="row"><b>${h(d.name)}</b><span class="grow"></span><button type="button" class="btn small" data-clread="${d.id}">Read and list requirements</button><button type="button" class="btn ghost small" data-clopen="${d.id}">Open</button></div>`).join('')}
      ${f.orderDoc && f.orderDoc.verdict ? `<p class="help"><b>AI check:</b> ${h(V[f.orderDoc.verdict] || '')}</p>` : ''}
      ${req.length ? `<table class="facts">${req.map(x => `<tr><th>${h(x.label)}</th><td>${h(x.value)}${x.page ? ' <small class="muted">p. ' + x.page + '</small>' : ''}</td></tr>`).join('')}</table>` : '<p class="help">Click <b>Read and list requirements</b> to note the report form, addenda, photo rules, due date, fee and inspection to-dos from it.</p>'}
      <div class="clpages" id="clPages"></div>`
    : '<p class="help">Drop the client’s engagement letter or order into <b>Documents</b> on the left. It shows here instead of your letter.</p>'}
    <div class="row"><button type="button" class="btn ghost small" id="clMine">Write my own letter instead</button></div>`;
  box.querySelectorAll('[data-clread]').forEach(b => b.onclick = () => { saveLetter(true, true); openReader(b.dataset.clread); });
  box.querySelectorAll('[data-clopen]').forEach(b => b.onclick = () => openDoc(b.dataset.clopen));
  $('#clMine').onclick = () => { $('#f_status').value = 'Drafted'; clShown = ''; update(); };
  if (L.length) showClientPages(L[0].id);
}
async function showClientPages(id) {
  const out = $('#clPages'); if (!out) return; const rec = await ODB.get('docs', id); if (!rec) return;
  if (!/pdf/i.test(rec.mime || '') && !/\.pdf$/i.test(rec.name)) { const r = await docPages(id); out.innerHTML = `<pre style="white-space:pre-wrap">${h((r.pagesText || []).join('\n\n'))}</pre>`; return; }
  const pdfjs = await loadPdfJs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
  for (let n = 1; n <= Math.min(doc.numPages, 12); n++) { if (!out.isConnected) return; const pg = await doc.getPage(n); const vp0 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: 900 / vp0.width });
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); out.appendChild(cv); await pg.render({ canvasContext: g, viewport: vp }).promise; }
  if (doc.numPages > 12) out.insertAdjacentHTML('beforeend', `<p class="help">${doc.numPages - 12} more pages – click Open to see them all.</p>`);
}
function saveContact(i) {
  const c = {}; CLIENT_KEYS.forEach(k => { c[k] = $(`#c${i}_${k}`).value.trim(); });
  if (!c.name && !c.company) { toast('Type a name first'); return; }
  const j = contacts.findIndex(x => (x.name || '').toLowerCase() === (c.name || '').toLowerCase() && (x.company || '') === (c.company || ''));
  if (j >= 0) contacts[j] = { ...contacts[j], ...c }; else contacts.push(c);
  contacts.sort((a, b) => (a.name || a.company || '').localeCompare(b.name || b.company || ''));
  store.set('contacts', contacts); renderContacts(); renderClients(readForm().clients); toast((c.name || c.company) + ' saved to contacts');
}
function openLetter(id, copy) {
  if (cur && cur.id !== id && hasContent(readForm())) saveLetter(true);
  const f = letters.find(x => x.id === id); if (!f) return;
  cur = copy ? { ...JSON.parse(JSON.stringify(f)), ...NEW_FIELDS, notes: '', todos: '', docs: [], crs: null, listings: [], permits: null, created: new Date().toISOString(), id: uid(), status: 'Drafted', agreeDate: todayISO(), orderDate: todayISO(), dueDate: '', fileNo: '', address: '', decedent: '', dod: '', aiUse: '', orderDoc: null, saved: null,
    lenderDiff: f.lenderDiff, lenderCo: f.lenderCo, lenderAddr1: f.lenderAddr1, lenderAddr2: f.lenderAddr2, amcUsed: f.amcUsed, amcCo: f.amcCo, amcAddr1: f.amcAddr1, amcAddr2: f.amcAddr2, amcLic: f.amcLic, amcState: f.amcState, amcExp: f.amcExp } : { ...NEW_FIELDS, ...JSON.parse(JSON.stringify(f)) };
  if (!copy) dedupeDocs(cur).then(n => { if (n) { renderDocs(); saveLetter(true); toast(n + ' duplicate document' + (n > 1 ? 's' : '') + ' removed (the same file was uploaded twice)', 5000); } });
  writeForm(cur); render(); showTab('letter'); window.scrollTo(0, 0); toast(copy ? 'Copied the client and terms – fill in the new job' : 'Opened ' + (f.fileNo || street(f) || 'the order'));
}
function newLetter() { cur = blankLetter(); writeForm(cur); render(); showTab('letter'); window.scrollTo(0, 0); $('#f_fileNo').focus(); }

/* ---------- lists ---------- */
const STAGES = ['New', 'Letter sent', 'Accepted', 'Inspection set', 'Inspected', 'Writing', 'Delivered', 'Paid', 'On hold', 'Cancelled'];
let listFilter = 'active';
function renderLetters() {
  const q = ($('#letterSearch').value || '').toLowerCase();
  const inFilter = f => listFilter === 'all' || (listFilter === 'active' ? !DONE_STAGES.includes(f.stage || 'New') : DONE_STAGES.includes(f.stage || 'New'));
  const rows = letters.filter(f => inFilter(f) && (!q || [f.fileNo, f.address, f.apn, f.owner, f.borrower, f.decedent, f.notes, f.amcCo, f.lenderCo, (f.clients || []).map(c => [c.name, c.company].join(' ')).join(' '), (TYPES[f.type] || {}).label].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || '')) || String(b.fileNo || '').localeCompare(String(a.fileNo || '')));
  const nAct = letters.filter(f => !DONE_STAGES.includes(f.stage || 'New')).length;
  $('#letterCount').textContent = letters.length ? `${nAct} active · ${letters.length} in all` : '';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === listFilter));
  $('#letterList').innerHTML = rows.length ? rows.map(f => `<tr>
      <td class="num">${hesc(f.fileNo || '—')}</td><td><button class="lnk" data-open="${f.id}">${hesc(street(f) || '(no address yet)')}</button></td><td>${hesc((f.clients[0] || {}).name || (f.clients[0] || {}).company || '—')}</td><td>${hesc((TYPES[f.type] || {}).label || '')}</td>
      <td><select data-stage="${f.id}" aria-label="Order status">${STAGES.map(s => `<option${(f.stage || 'New') === s ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
      <td class="num">${hesc(f.dueDate ? longDate(f.dueDate) : '')}</td><td class="num">${hesc(f.inspDate ? longDate(f.inspDate) + (f.inspTime ? ' ' + f.inspTime : '') : '')}</td>
      <td>${f.aiUse ? `<span class="pill ${f.aiUse === 'No' ? 'no' : 'yes'}">${{ Yes: 'Yes', Redacted: 'Redacted', No: 'No AI' }[f.aiUse]}</span>` : '<span class="pill">?</span>'}</td>
      <td>${hesc(f.status || '')}</td><td class="num">${(f.docs || []).length || ''}</td>
      <td class="acts"><button class="btn small" data-open="${f.id}">Open</button><a class="btn ghost small" href="${genieURL(f)}" target="aa-genie">Comp genie</a><button class="btn ghost small" data-copy="${f.id}">Copy as new</button><button class="btn ghost small danger" data-del="${f.id}">Delete</button></td></tr>`).join('')
    : `<tr><td colspan="11" class="empty">${letters.length ? 'No order matches.' : 'No orders yet. Press New order to start one.'}</td></tr>`;
  $('#letterList').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openLetter(b.dataset.open));
  $('#letterList').querySelectorAll('[data-copy]').forEach(b => b.onclick = () => openLetter(b.dataset.copy, true));
  $('#letterList').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (b.dataset.armed) { const id = b.dataset.del; const f = letters.find(x => x.id === id); letters = letters.filter(x => x.id !== id);
      await ODB.del('orders', id).catch(() => {}); for (const d of (f && f.docs) || []) await ODB.del('docs', d.id).catch(() => {});
      if (cur && cur.id === id) { cur = blankLetter(); writeForm(cur); render(); } renderLetters(); toast('Order and its documents deleted'); }
    else { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete'; } }, 3000); } });
  $('#letterList').querySelectorAll('[data-stage]').forEach(s => s.onchange = () => { const f = letters.find(x => x.id === s.dataset.stage); f.stage = s.value; ODB.put('orders', f); if (cur && cur.id === f.id) { $('#f_stage').value = s.value; cur.stage = s.value; } renderLetters(); });
}
const genieURL = f => '../comp-genie/?order=' + encodeURIComponent(f.id);
function renderLinks() { const a = $('#genieLink'); if (a && cur) a.href = genieURL(cur); }
function renderContacts() {
  const q = (($('#contactSearch') || {}).value || '').toLowerCase();
  const list = contacts.map((c, j) => [c, j]).filter(([c]) => !q || [c.name, c.company, c.email, c.addr1, c.addr2].join(' ').toLowerCase().includes(q));
  $('#contactCount').textContent = contacts.length ? `${contacts.length} clients · added automatically from each saved letter` : '';
  $('#contactList').innerHTML = list.length ? list.map(([c, j]) => `<tr><td>${hesc(c.name || '')}</td><td>${hesc(c.company || '')}</td><td>${hesc([c.addr1, c.addr2].filter(Boolean).join(', '))}</td><td class="num">${hesc(c.phone || '')}</td><td>${hesc(c.email || '')}</td>
    <td class="num" title="${hesc((c.jobs || []).join(', '))}">${(c.jobs || []).length || ''}</td><td class="num">${hesc(longDate(c.lastLetter || ''))}</td>
    <td class="acts"><button class="btn small" data-use="${j}">Use in a new letter</button><button class="btn ghost small danger" data-cdel="${j}">Delete</button></td></tr>`).join('')
    : `<tr><td colspan="8" class="empty">${contacts.length ? 'No client matches that search.' : 'No clients yet. Each client is added here the first time you save or download a letter for them.'}</td></tr>`;
  $('#contactList').querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const x = contacts[b.dataset.use]; newLetter(); CLIENT_KEYS.forEach(k => { $('#c0_' + k).value = x[k] || ''; }); update(); });
  $('#contactList').querySelectorAll('[data-cdel]').forEach(b => b.onclick = () => {
    if (b.dataset.armed) { contacts.splice(+b.dataset.cdel, 1); store.set('contacts', contacts); renderContacts(); renderClients(readForm().clients); toast('Client deleted'); }
    else { b.dataset.armed = '1'; b.textContent = 'Tap again to delete'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete'; } }, 3000); } });
}

/* ---------- client's letter: local scan for AI / confidentiality wording (no AI) ---------- */
const SCAN_AI = /\b(artificial[\s-]+intelligence|A\.?I\.?(?=[\s,;:)\-]|$)|machine[\s-]+learning|generative|large[\s-]+language|chat\s?gpt|automated (valuation|tools?|systems?|decision)|algorithm\w*)\b/g;
const SCAN_CONF = /\b(confidential\w*|non-?public|personal(ly)? identif\w*|NPI|PII|Gramm|GLBA|third[\s-]+part(y|ies)|vendor\w*|subcontract\w*|disclos\w*|data (security|privacy|protection)|cloud|offshore|outside the United States)\b/gi;
const COND = /\b(redact\w*|anonymi[sz]\w*|de-?identif\w*|remov\w* (all )?(personal|identif|borrower|client)|encrypt\w*|secure\w*|approved (vendor|tool|provider)s?|provided that|so long as|as long as|only if|confidential\w*|non-?public|NPI|PII|personal(ly)? identif\w*|safeguard\w*)\b/i;
const BAN = /\b(prohibit\w*|shall not|may not|must not|will not|not (be )?(permitted|allowed|authorized)|without (the )?(prior )?(express )?(written )?(consent|approval|authorization|permission)|prior (written )?(consent|approval|authorization)|strictly)\b/i;
async function inflateRaw(u8) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
async function docxParagraphs(file) {
  const buf = new Uint8Array(await file.arrayBuffer()); const dv = new DataView(buf.buffer);
  let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('That Word file could not be opened.');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loff = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    if (name === 'word/document.xml') {
      const ls = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true); let data = buf.subarray(ls, ls + csize);
      if (method === 8) data = await inflateRaw(data);
      const xml = dec.decode(data);
      return xml.split(/<\/w:p>/).map(px => px.replace(/<w:tab\/>/g, ' ').replace(/<w:br\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/\s+/g, ' ').trim()).filter(Boolean);
    }
    p += 46 + nlen + xlen + clen;
  }
  throw new Error('No text found in that Word file.');
}
let pdfjsReady = null; // the PDF reader sits next to this page, so it works offline too
function loadPdfJs() {
  if (!pdfjsReady) pdfjsReady = import('./pdf.min.mjs').then(m => { m.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs'; return m; });
  pdfjsReady.catch(() => { pdfjsReady = null; });
  return pdfjsReady;
}
async function pdfParagraphs(file) {
  const lib = await loadPdfJs(); const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise; const paras = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent(); let cur = '', lastY = null;
    tc.items.forEach(it => { const y = it.transform[5]; if (lastY !== null && Math.abs(lastY - y) > 18 && cur) { paras.push(cur.trim()); cur = ''; } cur += it.str + (it.hasEOL ? ' ' : ''); lastY = y; });
    if (cur.trim()) paras.push(cur.trim());
  }
  const joined = paras.join(' ').trim(); if (joined.length < 40) throw new Error('This PDF has no readable text (it is probably a scan). Open it and read the confidentiality terms yourself, or ask the client for the Word version.');
  // merge lines into paragraphs: a line ending without a period continues the paragraph
  const out = []; paras.forEach(l => { if (out.length && !/[.:;!?]$/.test(out.at(-1)) && l.length > 0) out[out.length - 1] += ' ' + l; else out.push(l); });
  return out;
}
async function scanFile(file) {
  $('#docName').textContent = 'Reading ' + file.name + '…';
  try {
    const paras = /\.pdf$/i.test(file.name) ? await pdfParagraphs(file) : /\.docx$/i.test(file.name) ? await docxParagraphs(file) : (await file.text()).split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const hits = [];
    paras.forEach(t => { const ai = (t.match(SCAN_AI) || []).length, cf = (t.match(SCAN_CONF) || []).length;
      if (ai || cf) hits.push({ t: t.slice(0, 1500), ai: ai > 0, ban: ai > 0 && BAN.test(t), cond: COND.test(t), strict: !ai && BAN.test(t) }); });
    // three answers: not allowed | OK if confidential information is removed | no restriction found
    const verdict = hits.some(h => h.ban) ? 'stop' : (hits.some(h => h.ai) || hits.some(h => h.strict || h.cond)) ? 'look' : 'clear';
    cur = readForm(); cur.orderDoc = { name: file.name, read: new Date().toISOString(), paragraphs: paras.length, hits, verdict };
    // set AI use from the letter (she can change it): ban → No AI; confidentiality only → redacted; nothing → Yes
    if (!cur.aiUse || cur.aiAuto) { const pick = { stop: 'No', look: 'Redacted', clear: 'Yes' }[verdict]; document.querySelectorAll('input[name=aiUse]').forEach(r => { r.checked = r.value === pick; }); cur.aiUse = pick; cur.aiAuto = { verdict, file: file.name, at: new Date().toISOString() }; }
    cur.letterText = paras.join('\n');
    renderScan(cur.orderDoc); syncVisibility(); update(); saveLetter(true);
  } catch (e) { $('#docName').textContent = e.message || 'Could not read that file.'; }
}
function renderScan(d) {
  const box = $('#scanBox');
  if (!d) { box.hidden = true; box.innerHTML = ''; $('#docName').textContent = 'Upload it here (Word or PDF). It is read on this computer only, with no AI, for any wording about AI, confidentiality or third parties.'; return; }
  $('#docName').textContent = `${d.name} · ${d.paragraphs} paragraphs read`;
  const V = { stop: 'AI not allowed. This letter restricts AI tools. Choose No AI unless the client approves AI in writing.',
    look: 'AI OK if confidential information is removed. The letter limits sharing of confidential or personal information' + (d.hits.some(h => h.ai) ? ' and mentions AI' : '') + '. Read the marked paragraphs, then choose.',
    clear: 'No restriction found. Nothing in this letter limits AI tools or sharing of information. Choose AI use below.' };
  const markUp = t => hesc(t).replace(new RegExp(SCAN_AI.source, 'g'), m => `<mark>${m}</mark>`).replace(new RegExp(SCAN_CONF.source, 'gi'), m => `<mark>${m}</mark>`);
  const list = [...d.hits].sort((a, b) => (b.ban - a.ban) || (b.ai - a.ai));
  box.innerHTML = `<div class="scan"><div class="verdict ${d.verdict}">${V[d.verdict]}</div>${list.length ? `<div class="hits">${list.map(h => `<div class="hit${h.ai ? ' ai' : ''}"><span class="tag">${h.ban ? 'AI – not allowed' : h.ai ? 'Mentions AI' : h.strict ? 'Confidentiality – restriction' : 'Confidentiality / third parties'}</span>${markUp(h.t)}</div>`).join('')}</div>` : ''}
    <div><button type="button" class="btn ghost small" id="scanClear">Remove this letter from the order</button></div></div>`;
  box.hidden = false;
  $('#scanClear').onclick = () => { cur = readForm(); cur.orderDoc = null; renderScan(null); update(); };
}
function renderOrderSummary(f) {
  const box = $('#orderSummary'); const docs = f.docs || [];
  box.innerHTML = `<h3>No engagement letter yet</h3><p class="help">Your letter shows here once you choose to write one; the client’s letter shows here once it is uploaded.</p>
    <div class="row"><button type="button" class="btn primary" id="osMine">Write my engagement letter</button><button type="button" class="btn ghost" id="osTheirs">The client sent one</button></div>
    ${docs.length ? `<h3>Documents</h3><ul class="toread">${docs.map(d => `<li><b>${hesc(DOC_LABEL[d.type] || d.type)}</b>: ${hesc(d.name)}${d.note ? ' – ' + hesc(d.note) : ''}${d.warn ? ` <span class="warnTxt">⚠ ${hesc(d.warn)}</span>` : ''}</li>`).join('')}</ul>` : ''}`;
  $('#osMine').onclick = () => { cur = readForm(); cur.letterMode = 'mine'; $('#f_status').value = 'Drafted'; update(); };
  $('#osTheirs').onclick = () => { $('#f_status').value = 'Client letter'; update(); document.getElementById('docsSet').scrollIntoView({ behavior: 'smooth' }); };
}
function showTab(t) {
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + t; });
  if (t === 'home') renderHome();
  if (t === 'market') { $('#mkTitle').textContent = 'Market conditions' + (cur && (cur.fileNo || street(cur)) ? ' – ' + [cur.fileNo, street(cur)].filter(Boolean).join(' ') : ''); mkRender(); }
}

/* ---------- backup: one zip with every order, client, and document ---------- */
async function backup() {
  saveLetter(true, true); toast('Making the backup…');
  const docs = await ODB.all('docs'); const enc = new TextEncoder();
  const meta = docs.map(d => ({ id: d.id, orderId: d.orderId, name: d.name, type: d.type, size: d.size, mime: d.mime, added: d.added, note: d.note, page: d.page, pages: d.pages, preview: d.preview, file: 'documents/' + d.id + '-' + G.safeName(d.name) }));
  const data = { app: 'appraisal-assistant', version: 1, saved: new Date().toISOString(), contacts, letters, aiText, rates: store.get('rates', {}), docs: meta };
  const entries = [{ name: 'orders.json', data: enc.encode(JSON.stringify(data, null, 1)) }];
  for (const d of docs) entries.push({ name: meta.find(m => m.id === d.id).file, data: new Uint8Array(await d.blob.arrayBuffer()) });
  const zip = await G.makeZip(entries);
  download(zip instanceof Blob ? new Uint8Array(await zip.arrayBuffer()) : zip, `Appraisal Assistant backup ${todayISO()}.zip`, 'application/zip');
  toast(`Backup saved to Downloads: ${letters.length} orders, ${contacts.length} clients, ${docs.length} documents`);
}
async function restore(file) {
  try {
    let d, files = null;
    if (/\.zip$/i.test(file.name)) { files = await G.readZip(file); const j = files.get('orders.json'); if (!j) throw new Error('That zip is not an Appraisal Assistant backup.'); d = JSON.parse(new TextDecoder().decode(j)); }
    else d = JSON.parse(await file.text());
    if (!['engagement-letter-writer', 'appraisal-assistant'].includes(d.app)) throw new Error('That file is not an Appraisal Assistant or letter-writer backup.');
    const ids = new Set(letters.map(x => x.id)); let nl = 0, nc = 0, nd = 0; const add = [];
    (d.letters || []).forEach(x => { if (!ids.has(x.id)) { const o = { ...NEW_FIELDS, docs: [], ...x }; if (d.app === 'engagement-letter-writer' && !x.stage) o.stage = x.status === 'Signed' ? 'Accepted' : x.status === 'Sent' ? 'Letter sent' : 'New'; letters.push(o); add.push(o); nl++; } });
    (d.contacts || []).forEach(c => { if (!contacts.some(x => x.name === c.name && x.company === c.company)) { contacts.push(c); nc++; } });
    if (d.aiText && !aiText) aiText = d.aiText;
    if (d.rates && !Object.keys(store.get('rates', {})).length) store.set('rates', d.rates);
    if (add.length) await ODB.putMany('orders', add);
    if (files && d.docs) { const have = new Set((await ODB.all('docs')).map(x => x.id));
      for (const m of d.docs) { if (have.has(m.id)) continue; const u8 = files.get(m.file); if (!u8) continue; const { file: _f, ...rest } = m; await ODB.put('docs', { ...rest, blob: new Blob([u8], { type: m.mime || '' }) }); nd++; } }
    contacts.sort((a, b) => (a.name || a.company || '').localeCompare(b.name || b.company || ''));
    store.set('contacts', contacts); store.set('aiText', aiText); renderLetters(); renderContacts();
    toast(`Restored ${nl} orders, ${nc} clients` + (files ? `, ${nd} documents` : ''));
  } catch (e) { console.error(e); toast(e.message || 'Could not read that file'); }
}

/* ---------- start ---------- */
async function start() {
  try { await ODB.init(); } catch (e) { document.body.insertAdjacentHTML('afterbegin', `<p class="fatal">${hesc(e.message || String(e))}</p>`); return; }
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {} // ask Chrome never to clear this data
  letters = (await ODB.all('orders')) || []; await mkLoad();
  const old = store.get('letters', null); // orders saved by the old letter writer on this same site
  if (Array.isArray(old) && old.length) { const ids = new Set(letters.map(x => x.id)); const add = old.filter(x => !ids.has(x.id)).map(x => ({ ...NEW_FIELDS, docs: [], ...x })); if (add.length) { await ODB.putMany('orders', add); letters.push(...add); } try { localStorage.removeItem('el.letters'); } catch (e) {} }
  const GROUPS = [['Lender or AMC order', ['uadPurchase', 'uadRefi', 'uadHeloc', 'uadConstruction', 'uadOther']], ['Private lending', ['lending', 'construction']],
    ['Estate, trust and gift', ['dod', 'altValuation', 'parentChild', 'trust', 'gift']], ['Divorce and co-owners', ['divorce', 'divorceRetro', 'buyout']],
    ['Buying and selling', ['purchase', 'preListing']], ['Tax', ['taxAppeal', 'donation']], ['Other purposes', ['otherCurrent', 'otherRetro']]];
  const listed = new Set(GROUPS.flatMap(g => g[1]));
  $('#f_type').innerHTML = GROUPS.map(([g, ks]) => `<optgroup label="${hesc(g)}">${ks.filter(k => TYPES[k]).map(k => `<option value="${k}">${hesc(TYPES[k].label)}</option>`).join('')}</optgroup>`).join('')
    + Object.keys(TYPES).filter(k => !listed.has(k)).map(k => `<option value="${k}">${hesc(TYPES[k].label)}</option>`).join('');
  $('#f_propType').innerHTML = PROPERTY_TYPES.map(p => `<option value="${p[0]}">${hesc(p[1])}</option>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $('#letterForm').addEventListener('input', update); ['#f_otherUsers', '#f_userText'].forEach(id => $(id).addEventListener('input', syncVisibility)); $('#letterForm').addEventListener('change', update);
  $('#letterForm').addEventListener('submit', e => e.preventDefault());
  $('#f_reportForm').addEventListener('change', () => { if (cur) cur.formPicked = true; syncVisibility(); });
  $('#f_type').addEventListener('change', () => { applyTypeDefaults(); if (!(cur && cur.formPicked)) $('#f_reportForm').value = defaultForm($('#f_type').value, $('#f_propType').value); const T = TYPES[$('#f_type').value] || {}; if (T.uad && $('#f_status').value === 'Drafted') { $('#f_status').value = 'Client letter'; toast('Lender and AMC orders usually come with their own engagement letter – My letter is set to “Not needed”. Change it if you write one.', 6000); } syncVisibility(); update(); });
  $('#f_propType').addEventListener('change', () => { applyPropDefaults(); syncVisibility(); update(); });
  $('#f_listing').addEventListener('change', syncVisibility);
  $('#f_payWhen').addEventListener('change', () => { const w = $('#f_payWhen').value; $('#f_deliveryFrom').value = w === 'report' ? 'inspection' : 'either'; syncVisibility(); update(); }); $('#f_premise').addEventListener('change', syncVisibility); ['#f_rent', '#f_testimony'].forEach(id => $(id).addEventListener('change', syncVisibility));
  ['tRate', 'tDecl', 'tRetainer', 'tCancel'].forEach(k => $('#f_' + k).addEventListener('change', () => { const r = store.get('rates', {}); r[k] = $('#f_' + k).value; store.set('rates', r); }));
  $('#addClient').onclick = () => { const f = readForm(); clientCount++; f.clients.push({}); renderClients(f.clients); update(); };
  $('#btnDocx').onclick = downloadDocx; $('#btnSave').onclick = () => saveLetter(false); $('#btnNew').onclick = newLetter;
  $('#letterSearch').oninput = renderLetters; $('#contactSearch').oninput = renderContacts;
  $('#docFile').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; addDocs(fs); };
  const dz = $('#dropZone'); dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); }); dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); addDocs(e.dataTransfer.files); });
  window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault()); // a file dropped beside the box is not opened by Chrome
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { listFilter = b.dataset.filter; renderLetters(); });
  $('#btnNew2').onclick = () => startNewOrder(); $('#btnNew').onclick = () => startNewOrder();
  $('#btnIpad').onclick = () => { saveLetter(true); activeOrdersFile(); };
  $('#genieLink').addEventListener('click', () => saveLetter(true));
  ['#f_lenderDiff', '#f_amcUsed', '#f_inspDate', '#f_effDate', '#f_dod'].forEach(id => $(id).addEventListener('change', syncVisibility));
  $('#f_stage').addEventListener('change', () => { cur = readForm(); renderLetters(); });
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab !== 'letter' && cur && hasContent(readForm())) saveLetter(true); }));
  document.querySelectorAll('input[name=aiUse]').forEach(r => r.addEventListener('change', () => { syncVisibility(); update(); }));
  $('#btnBackup').onclick = backup; $('#restoreFile').onchange = e => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ''; };
  $('#aiTextBox').value = aiText || AI_DEFAULT;
  $('#aiSave').onclick = () => { aiText = $('#aiTextBox').value.trim() || null; store.set('aiText', aiText); update(); toast('AI wording saved for future letters'); };
  $('#aiReset').onclick = () => { aiText = null; store.set('aiText', null); $('#aiTextBox').value = AI_DEFAULT; update(); toast('AI wording reset to the draft'); };
  let curId = null; try { curId = localStorage.getItem('aa.curOrder'); } catch (e) {}
  const q = new URLSearchParams(location.search).get('order'); const pick = letters.find(x => x.id === (q || curId));
  const draft = store.get('draft', null); // an unsaved letter left in the old letter writer
  cur = pick ? { ...NEW_FIELDS, ...JSON.parse(JSON.stringify(pick)) } : (!letters.length && draft && draft.id) ? { ...blankLetter(), ...draft } : blankLetter();
  writeForm(cur); render(); renderLetters(); renderContacts();
  showTab(q && pick ? 'letter' : 'home');
  $('#build').textContent = 'Version ' + BUILD; $('#rdBuild').textContent = BUILD;
  $('#helpSearch').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('.help-page details').forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; d.open = !!q && hit; }); });
  $('#rdClose').onclick = closeReader; $('#rdPrev').onclick = () => { RD.page--; rdPage(); }; $('#rdNext').onclick = () => { RD.page++; rdPage(); }; $('#rdOpen').onclick = () => openDoc(RD.id);
  document.addEventListener('keydown', e => { if ($('#reader').hidden || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') { RD.page++; rdPage(); } if (e.key === 'ArrowLeft') { RD.page--; rdPage(); } if (e.key === 'Escape') closeReader(); });
  let st = null; $('#docSearch').addEventListener('input', e => { clearTimeout(st); st = setTimeout(() => searchDocs(e.target.value), 350); }); $('#docSearchBtn').onclick = () => searchDocs($('#docSearch').value); $('#docSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchDocs(e.target.value); } });
  $('#aiKeyBox').value = aiKey(); $('#aiModelBox').value = aiModel();
  $('#aiKeySave').onclick = () => { try { localStorage.setItem('aa.claudeKey', $('#aiKeyBox').value.trim()); const mdl = ($('#aiModelBox').value.trim() || 'claude-sonnet-5-5').toLowerCase().replace(/[\s.]+/g, '-').replace(/-+/g, '-'); $('#aiModelBox').value = mdl; localStorage.setItem('aa.claudeModel', mdl); toast('AI settings saved in this browser'); } catch (e) { toast('Could not save'); } };
  $('#aiKeyClear').onclick = () => { try { localStorage.removeItem('aa.claudeKey'); } catch (e) {} $('#aiKeyBox').value = ''; toast('Key removed'); };
}
document.addEventListener('DOMContentLoaded', start);

function defaultForm(type, propType) { // which report form an order starts with; she can change it
  const T = TYPES[type] || {}; if (T.uad) return 'uad36';
  return 'gpar';
}


/* the form within the report form format (her request): UAD 2.6 forms by number, UAD 3.6 URAR kinds, GPAR forms; "Other – type it" for anything else */
const FORM_LIST = {
  uad36: ['Uniform Residential Appraisal Report (URAR)', 'URAR – Exterior-only inspection', 'URAR – Desktop', 'URAR – Hybrid', 'Appraisal Update and/or Completion Report (Form 1004D)'],
  uad26: ['Form 1004 – Uniform Residential Appraisal Report', 'Form 1073 – Individual Condominium Unit Appraisal Report', 'Form 1025 – Small Residential Income Property Appraisal Report', 'Form 2055 – Exterior-Only Inspection Residential Appraisal Report',
    'Form 1075 – Exterior-Only Inspection Individual Condominium Unit Appraisal Report', 'Form 1004C – Manufactured Home Appraisal Report', 'Form 2090 – Individual Cooperative Interest Appraisal Report', 'Form 2095 – Exterior-Only Individual Cooperative Interest Appraisal Report',
    'Form 1004 Desktop – Desktop Appraisal', 'Form 1004D – Appraisal Update and/or Completion Report'],
  gpar: ['GPAR form report', 'GPAR Condominium form report', 'GPAR Small Residential Income form report', 'GPAR Land form report'],
  other: [] };
function suggestFormName(rf, pt, insp) {
  const L = FORM_LIST[rf] || []; if (!L.length) return '';
  if (rf === 'uad26') { const ext = insp === 'exterior'; return pt === 'condo' ? L[ext ? 4 : 1] : pt === 'multi' ? L[2] : pt === 'coop' ? L[ext ? 7 : 6] : ext ? L[3] : L[0]; }
  if (rf === 'uad36') return insp === 'exterior' ? L[1] : L[0];
  return pt === 'condo' ? L[1] : pt === 'multi' ? L[2] : pt === 'land' ? L[3] : L[0];
}
function syncFormSel() {
  const sel = $('#f_formSel'), inp = $('#f_format'); if (!sel) return; const rf = $('#f_reportForm').value; const L = FORM_LIST[rf] || [];
  if (!(cur && cur.formNamePicked)) { const s = suggestFormName(rf, $('#f_propType').value, $('#f_inspection').value); if (s) inp.value = s; else if (!L.length && L.indexOf(inp.value) < 0 && Object.values(FORM_LIST).flat().includes(inp.value)) inp.value = ''; }
  sel.innerHTML = `<option value="">—</option>${L.map(x => `<option>${hesc(x)}</option>`).join('')}<option value="__other">Other – type it</option>`;
  const v = inp.value.trim(); if (!v) { sel.value = L.length ? '' : '__other'; inp.hidden = !!L.length; } else if (L.includes(v)) { sel.value = v; inp.hidden = true; } else { sel.value = '__other'; inp.hidden = false; }
}
document.addEventListener('DOMContentLoaded', () => {});
(function wireFormSel() { const sel = document.getElementById('f_formSel'); if (!sel) return setTimeout(wireFormSel, 50);
  sel.addEventListener('change', () => { const inp = $('#f_format'); if (cur) cur.formNamePicked = true; if (sel.value === '__other') { inp.hidden = false; inp.value = ''; inp.focus(); } else { inp.value = sel.value; inp.hidden = true; } update(); });
  $('#f_format').addEventListener('input', () => { if (cur) cur.formNamePicked = true; });
  $('#f_reportForm').addEventListener('change', () => { if (cur) cur.formNamePicked = false; }, true);
  ['#f_reportForm', '#f_propType', '#f_inspection'].forEach(id => $(id).addEventListener('change', () => { syncFormSel(); update(); })); })();
