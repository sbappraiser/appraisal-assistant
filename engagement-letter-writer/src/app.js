/* Engagement Letter Writer – form, contacts, saved letters, preview, Word download. */
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('el.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('el.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CLIENT_KEYS = ['name', 'company', 'addr1', 'addr2', 'phone', 'email'];
let contacts = store.get('contacts', []);
let letters = store.get('letters', []);
let aiText = store.get('aiText', null);
let cur = null;           // the letter being edited
let clientCount = 1;

function blankLetter() {
  return { id: uid(), status: 'Drafted', fileNo: '', orderDate: todayISO(), dueDate: '', aiUse: '', orderDoc: null, agreeDate: todayISO(), type: 'dod', clients: [{}], address: '', propType: 'sfr', propTypeOther: '',
    interest: '', decedent: '', dod: '', otherUsers: '', inspection: 'interior', apSales: true, apCost: true, apIncome: false, format: '',
    listing: 'omit', listingDetail: '', ea: '', hc: '', accessName: '', accessRel: '', accessPhone: '', fee: '', retainer: '', payDue: '', payWhen: 'inspection', deliveryN: '14', deliveryUnit: 'days', deliveryFrom: 'either', userText: '', delivery: '', ai: true, extra: '', premise: 'asis', completion: '', plans: '', purpose: '', joint: true, rent: false, rentFee: '', testimony: false, tRate: '250', tDecl: '350', tRetainer: '2500', tCancel: '250', ...store.get('rates', {}) };
}

/* ---------- form <-> object ---------- */
const FIELDS = ['fileNo', 'orderDate', 'dueDate', 'agreeDate', 'type', 'status', 'address', 'propType', 'propTypeOther', 'interest', 'decedent', 'dod', 'otherUsers', 'inspection', 'apSales', 'apCost', 'apIncome',
  'format', 'listing', 'listingDetail', 'ea', 'hc', 'accessName', 'accessRel', 'accessPhone', 'fee', 'retainer', 'payDue', 'payWhen', 'deliveryN', 'deliveryUnit', 'deliveryFrom', 'userText', 'extra', 'premise', 'completion', 'plans', 'purpose', 'joint', 'rent', 'rentFee', 'testimony', 'tRate', 'tDecl', 'tRetainer', 'tCancel'];
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
  FIELDS.forEach(k => { const el = $('#f_' + k); if (!el) return; if (el.type === 'checkbox') el.checked = f[k] !== false && !!f[k]; else el.value = f[k] ?? ''; });
  clientCount = Math.max(1, Math.min(3, (f.clients || []).length || 1));
  renderClients(f.clients || [{}]);
  document.querySelectorAll('input[name=aiUse]').forEach(r => { r.checked = r.value === f.aiUse; });
  renderScan(f.orderDoc);
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
  store.set('draft', f);
}
const street = f => (f.address || '').split(',')[0].trim();
const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
const fileName = f => safe(`${street(f) || 'No address yet'} - Engagement Letter`) + '.docx';

/* ---------- actions ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 2600); }
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
function saveLetter(quiet) {
  const f = readForm(); f.saved = new Date().toISOString(); const added = upsertClients(f);
  const i = letters.findIndex(x => x.id === f.id); if (i >= 0) letters[i] = f; else letters.unshift(f);
  const ok = store.set('letters', letters); renderLetters();
  if (!quiet) toast(ok ? 'Order saved' + (added ? ' · ' + added + ' new client' + (added > 1 ? 's' : '') + ' added' : '') : 'Could not save in this browser – use Back up to keep a copy');
}
function downloadDocx() {
  const f = readForm();
  download(makeDocx(buildLetter(f), { title: `Engagement Letter – ${f.address || ''}`, footer: f.fileNo ? `File ${f.fileNo} · ` : '' }), fileName(f),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  saveLetter(true); toast('Saved ' + fileName(f) + ' to Downloads');
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
  const f = letters.find(x => x.id === id); if (!f) return;
  cur = copy ? { ...JSON.parse(JSON.stringify(f)), id: uid(), status: 'Drafted', agreeDate: todayISO(), orderDate: todayISO(), dueDate: '', fileNo: '', address: '', decedent: '', dod: '', aiUse: '', orderDoc: null, saved: null } : JSON.parse(JSON.stringify(f));
  writeForm(cur); render(); showTab('letter'); toast(copy ? 'Copied – fill in the new job' : 'Opened ' + (f.fileNo || 'letter'));
}
function newLetter() { cur = blankLetter(); writeForm(cur); render(); showTab('letter'); }

/* ---------- lists ---------- */
function renderLetters() {
  const q = ($('#letterSearch').value || '').toLowerCase();
  const rows = letters.filter(f => !q || [f.fileNo, f.address, (f.clients || []).map(c => [c.name, c.company].join(' ')).join(' '), TYPES[f.type].label].join(' ').toLowerCase().includes(q));
  $('#letterCount').textContent = letters.length ? `${letters.length} saved` : '';
  $('#letterList').innerHTML = rows.length ? rows.map(f => `<tr>
      <td class="num">${hesc(f.fileNo || '—')}</td><td>${hesc(street(f) || '—')}</td><td>${hesc((f.clients[0] || {}).name || (f.clients[0] || {}).company || '—')}</td><td>${hesc(TYPES[f.type].label)}</td>
      <td>${f.aiUse ? `<span class="pill ${f.aiUse === 'No' ? 'no' : 'yes'}">${{ Yes: 'Yes', Redacted: 'Redacted', No: 'No AI' }[f.aiUse]}</span>` : '<span class="pill">?</span>'}</td>
      <td class="num">${hesc(longDate(f.agreeDate))}</td>
      <td><select data-status="${f.id}" aria-label="Status">${['Drafted', 'Sent', 'Signed'].map(s => `<option${f.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
      <td class="acts"><button class="btn small" data-open="${f.id}">Open</button><button class="btn ghost small" data-copy="${f.id}">Copy as new</button><button class="btn ghost small danger" data-del="${f.id}">Delete</button></td></tr>`).join('')
    : `<tr><td colspan="8" class="empty">${letters.length ? 'No order matches that search.' : 'No orders yet. An order is saved here each time you download its letter or press Save letter.'}</td></tr>`;
  $('#letterList').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openLetter(b.dataset.open));
  $('#letterList').querySelectorAll('[data-copy]').forEach(b => b.onclick = () => openLetter(b.dataset.copy, true));
  $('#letterList').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (b.dataset.armed) { letters = letters.filter(x => x.id !== b.dataset.del); store.set('letters', letters); renderLetters(); toast('Letter deleted'); }
    else { b.dataset.armed = '1'; b.textContent = 'Tap again to delete'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete'; } }, 3000); } });
  $('#letterList').querySelectorAll('[data-status]').forEach(s => s.onchange = () => { const f = letters.find(x => x.id === s.dataset.status); f.status = s.value; store.set('letters', letters); if (cur && cur.id === f.id) $('#f_status').value = s.value; });
}
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
const BAN = /\b(prohibit\w*|shall not|may not|must not|will not|not (be )?(permitted|allowed|authorized)|without (the )?(prior )?(express )?written (consent|approval|authorization)|strictly)\b/i;
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
let pdfjsReady = null;
function loadPdfJs() {
  if (pdfjsReady) return pdfjsReady;
  const V = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  pdfjsReady = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = V + 'pdf.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('The PDF reader needs an internet connection the first time. Try again online, or upload the Word version.')); document.head.appendChild(sc); })
    .then(async () => { const w = await fetch(V + 'pdf.worker.min.js').then(r => r.text()); window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([w], { type: 'text/javascript' })); return window.pdfjsLib; });
  pdfjsReady.catch(() => { pdfjsReady = null; });
  return pdfjsReady;
}
async function pdfParagraphs(file) {
  const lib = await loadPdfJs(); const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; const paras = [];
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
function showTab(t) {
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + t; });
}

/* ---------- backup ---------- */
function backup() {
  const data = { app: 'engagement-letter-writer', version: 1, saved: new Date().toISOString(), contacts, letters, aiText };
  download(new TextEncoder().encode(JSON.stringify(data, null, 1)), `Engagement letters backup ${todayISO()}.json`, 'application/json'); toast('Backup saved to Downloads');
}
async function restore(file) {
  try {
    const d = JSON.parse(await file.text()); if (d.app !== 'engagement-letter-writer') throw new Error('That file is not a letter-writer backup.');
    const ids = new Set(letters.map(x => x.id)); let nl = 0, nc = 0;
    (d.letters || []).forEach(x => { if (!ids.has(x.id)) { letters.push(x); nl++; } });
    (d.contacts || []).forEach(c => { if (!contacts.some(x => x.name === c.name && x.company === c.company)) { contacts.push(c); nc++; } });
    if (d.aiText && !aiText) aiText = d.aiText;
    store.set('letters', letters); store.set('contacts', contacts); store.set('aiText', aiText); renderLetters(); renderContacts();
    toast(`Restored ${nl} letters and ${nc} contacts`);
  } catch (e) { toast(e.message || 'Could not read that file'); }
}

/* ---------- start ---------- */
function start() {
  const GROUPS = [['Estate, trust and gift', ['dod', 'altValuation', 'parentChild', 'trust', 'gift']], ['Divorce and co-owners', ['divorce', 'divorceRetro', 'buyout']],
    ['Buying and selling', ['purchase', 'preListing']], ['Lending', ['lending', 'construction']], ['Tax', ['taxAppeal', 'donation']], ['Other purposes', ['otherCurrent', 'otherRetro']]];
  const listed = new Set(GROUPS.flatMap(g => g[1]));
  $('#f_type').innerHTML = GROUPS.map(([g, ks]) => `<optgroup label="${hesc(g)}">${ks.filter(k => TYPES[k]).map(k => `<option value="${k}">${hesc(TYPES[k].label)}</option>`).join('')}</optgroup>`).join('')
    + Object.keys(TYPES).filter(k => !listed.has(k)).map(k => `<option value="${k}">${hesc(TYPES[k].label)}</option>`).join('');
  $('#f_propType').innerHTML = PROPERTY_TYPES.map(p => `<option value="${p[0]}">${hesc(p[1])}</option>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $('#letterForm').addEventListener('input', update); ['#f_otherUsers', '#f_userText'].forEach(id => $(id).addEventListener('input', syncVisibility)); $('#letterForm').addEventListener('change', update);
  $('#letterForm').addEventListener('submit', e => e.preventDefault());
  $('#f_type').addEventListener('change', () => { applyTypeDefaults(); syncVisibility(); update(); });
  $('#f_propType').addEventListener('change', () => { applyPropDefaults(); syncVisibility(); update(); });
  $('#f_listing').addEventListener('change', syncVisibility);
  $('#f_payWhen').addEventListener('change', () => { const w = $('#f_payWhen').value; $('#f_deliveryFrom').value = w === 'report' ? 'inspection' : 'either'; syncVisibility(); update(); }); $('#f_premise').addEventListener('change', syncVisibility); ['#f_rent', '#f_testimony'].forEach(id => $(id).addEventListener('change', syncVisibility));
  ['tRate', 'tDecl', 'tRetainer', 'tCancel'].forEach(k => $('#f_' + k).addEventListener('change', () => { const r = store.get('rates', {}); r[k] = $('#f_' + k).value; store.set('rates', r); }));
  $('#addClient').onclick = () => { const f = readForm(); clientCount++; f.clients.push({}); renderClients(f.clients); update(); };
  $('#btnDocx').onclick = downloadDocx; $('#btnSave').onclick = () => saveLetter(false); $('#btnNew').onclick = newLetter;
  $('#letterSearch').oninput = renderLetters; $('#contactSearch').oninput = renderContacts;
  $('#orderFile').onchange = e => { if (e.target.files[0]) scanFile(e.target.files[0]); e.target.value = ''; };
  const dz = $('#dropZone'); dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); }); dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); const fl = e.dataTransfer.files[0]; if (fl) scanFile(fl); });
  document.querySelectorAll('input[name=aiUse]').forEach(r => r.addEventListener('change', () => { syncVisibility(); update(); }));
  $('#btnBackup').onclick = backup; $('#restoreFile').onchange = e => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ''; };
  $('#aiTextBox').value = aiText || AI_DEFAULT;
  $('#aiSave').onclick = () => { aiText = $('#aiTextBox').value.trim() || null; store.set('aiText', aiText); update(); toast('AI wording saved for future letters'); };
  $('#aiReset').onclick = () => { aiText = null; store.set('aiText', null); $('#aiTextBox').value = AI_DEFAULT; update(); toast('AI wording reset to the draft'); };
  const draft = store.get('draft', null);
  cur = draft && draft.id ? { ...blankLetter(), ...draft } : blankLetter();
  writeForm(cur); render(); renderLetters(); renderContacts();
}
document.addEventListener('DOMContentLoaded', start);
