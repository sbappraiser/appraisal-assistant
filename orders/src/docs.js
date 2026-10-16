/* =====================================================================
   Documents: one upload per order. Each file is kept in this browser (IndexedDB),
   typed, and – for the kinds the assistant can read – turned into order facts.
   SUBJECT RULE: beds, baths and square footage from CRS/MLS are never carried
   into the order's subject facts or sent to the iPad. She counts and measures on site.
   ===================================================================== */
const h = s => hesc(s ?? '');
const DOC_TYPES = [
  ['Order and client', [['clientLetter', 'Client’s engagement letter / order'], ['myLetter', 'My engagement letter (signed)'], ['invoice', 'Invoice / payment']]],
  ['Public record', [['crs', 'CRS property report'], ['permitsCounty', 'Permit history by parcel (County)'], ['permitsPdf', 'Permit records'], ['legal', 'Legal description'], ['prelim', 'Preliminary title report']]],
  ['MLS and market', [['mls', 'MLS listing (subject)'], ['marketSearch', 'MLS market-area search'], ['mlsStats', 'SBMLS monthly statistics'], ['zillow', 'Zillow market page']]],
  ['Plans and construction', [['floorplan', 'Floor plan (to trace in the sketch)'], ['plans', 'Plans'], ['specs', 'Specifications'], ['budget', 'Construction budget']]],
  ['HOA', [['condoQ', 'Condo questionnaire'], ['ccrs', 'CC&Rs'], ['hoaBudget', 'HOA budget'], ['bylaws', 'HOA bylaws'], ['minutes', 'HOA minutes']]],
  ['Sale', [['contract', 'Purchase contract'], ['counter', 'Counter offer'], ['addendum', 'Addendum'], ['disclosures', 'Disclosures'], ['leaseback', 'Leaseback / rent-back']]],
  ['Other', [['photo', 'Photo'], ['other', 'Other']]],
];
const DOC_LABEL = Object.fromEntries(DOC_TYPES.flatMap(g => g[1]));
const READS = { crs: 'read for the subject facts', mls: 'read for the subject’s listing history', permitsCounty: 'read for the permit list', clientLetter: 'checked for AI and confidentiality wording', floorplan: 'ready to trace on the iPad' };

/* ---------- what kind of document is this? (text on page 1, then the file name) ---------- */
const TEXT_RULES = [
  [/CRS Data|APN\/Tax ID|LOCATION PROPERTY SUMMARY/i, 'crs'],
  [/Permit History by Parcel/i, 'permitsCounty'],
  [/Search Statistics|Search Criteria:/i, 'marketSearch'],
  [/Zillow Home Value Index|Housing Market Overview|zillow\.com/i, 'zillow'],
  [/flexmls|MLS #\s?\d/i, 'mls'],
  [/Client hereby engages Appraiser|PARTIES TO AGREEMENT[\s\S]{0,800}Jennifer L\.? Heath/i, 'myLetter'],
  [/ENGAGEMENT LETTER|Letter of Engagement|Engagement Agreement|Appraisal (Order|Request)|Order Detail|Scope of Work/i, 'clientLetter'],
  [/Condominium Questionnaire|Condo Questionnaire|Project Questionnaire|HOA Questionnaire/i, 'condoQ'],
  [/Declaration of (Covenants|Restrictions|CC&Rs)|CC&R/i, 'ccrs'],
  [/\bBylaws\b|By-Laws/i, 'bylaws'],
  [/Minutes of the|Board (of Directors )?Meeting Minutes|\bMinutes\b/i, 'minutes'],
  [/(Association|HOA).{0,40}(Budget|Reserve Study)|Reserve Study|Pro Forma Operating Budget/i, 'hoaBudget'],
  [/PRELIMINARY REPORT|Preliminary Title|Title Product/i, 'prelim'],
  [/Residential Lease After Sale|Seller in Possession|Buyer in Possession|Rent[- ]?Back|Lease[- ]?back/i, 'leaseback'],
  [/COUNTER OFFER/i, 'counter'],
  [/ADDENDUM/i, 'addendum'],
  [/PURCHASE AGREEMENT|Joint Escrow Instructions|Purchase Contract/i, 'contract'],
  [/Transfer Disclosure|Seller Property Questionnaire|Natural Hazard Disclosure|Statewide Buyer and Seller Advisory|DISCLOSURE/i, 'disclosures'],
  [/SHEET INDEX|GREEN BUILDING CODE|ARCHITECT|SITE PLAN|ELEVATIONS?\b/i, 'plans'],
  [/FLOOR ?PLAN/i, 'floorplan'],
  [/Specifications|Outline Spec|Finish Schedule/i, 'specs'],
  [/Budget|Cost Breakdown|Schedule of Values|Construction Cost/i, 'budget'],
  [/Building Permit|Permit (No|Number|#)/i, 'permitsPdf'],
  [/LEGAL DESCRIPTION|EXHIBIT ["“]?A/i, 'legal'],
  [/INVOICE/i, 'invoice'],
];
const STRONG_TYPES = ['myLetter', 'crs', 'permitsCounty', 'marketSearch', 'prelim', 'condoQ', 'ccrs', 'leaseback', 'counter', 'contract'];   // page 1 says so plainly
// documents filed in the wrong box before Oct 16 2026: check them once when the order opens
async function recheckDocTypes(o) { let n = 0;
  for (const d of (o.docs || [])) { if (d.typeChecked2 || !['prelim', 'legal', 'other', 'permitsPdf', 'disclosures', 'clientLetter'].includes(d.type)) continue; d.typeChecked2 = true; d.typeChecked = true;
    try { const f = await docFile(d.id); const said = f && await textDocType(f); if (said && said !== d.type && STRONG_TYPES.includes(said)) { await retypeDoc(d.id, said); n++; } } catch (e) {} }
  if (n) toast(n + ' document' + (n > 1 ? 's were' : ' was') + ' in the wrong kind and ' + (n > 1 ? 'have' : 'has') + ' been corrected (see Documents)', 6000); }
const NAME_RULES = [
  [/zillow/i, 'zillow'], [/\bCRS\b|Property[_ ]Report/i, 'crs'], [/CrystalViewer|permit[_ ]?hist/i, 'permitsCounty'], [/flexmls|\bMLS\b|customexport/i, 'mls'],
  [/engagement|order[_ ]?form|appraisal[_ ]?order/i, 'clientLetter'], [/floor[_ ]?plan|floorplan/i, 'floorplan'], [/plans?\b|drawings|architect/i, 'plans'], [/spec/i, 'specs'],
  [/questionnaire/i, 'condoQ'], [/cc&?rs?\b|declaration/i, 'ccrs'], [/bylaws?/i, 'bylaws'], [/minutes/i, 'minutes'], [/hoa.*budget|reserve/i, 'hoaBudget'], [/budget|cost/i, 'budget'],
  [/prelim|title/i, 'prelim'], [/lease[_ ]?after|lease[_ ]?back|rent[_ ]?back|\bsip\b|\bbip\b/i, 'leaseback'], [/counter/i, 'counter'], [/addend/i, 'addendum'],
  [/purchase|contract|\brpa\b/i, 'contract'], [/disclos|\btds\b|\bspq\b|\bnhd\b/i, 'disclosures'], [/permit/i, 'permitsPdf'], [/legal/i, 'legal'], [/invoice|receipt/i, 'invoice'],
];
const isPdf = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
const isImg = f => /^image\//.test(f.type) || /\.(jpe?g|png|gif|webp|heic)$/i.test(f.name);
async function firstText(file) {
  try {
    if (isPdf(file)) return (await G.pdfFirstText(file)).text || '';
    if (/\.docx$/i.test(file.name)) return (await docxParagraphs(file)).slice(0, 60).join(' ');
    if (/\.(csv|txt)$/i.test(file.name)) return (await file.slice(0, 4000).text());
  } catch (e) { console.warn('could not read', file.name, e); }
  return '';
}
async function textDocType(file) { // what page 1 says it is (null when it does not say)
  const t = await firstText(file); if (!t || /\.csv$/i.test(file.name)) return null;
  for (const [re, k] of TEXT_RULES) if (re.test(t.slice(0, 3000))) return k; return null;
}
async function detectDocType(file) {
  const t = await firstText(file);
  if (/\.csv$/i.test(file.name)) return /Listing Number/i.test(t) ? 'mls' : 'other';
  if (t) { for (const [re, k] of TEXT_RULES) if (re.test(t.slice(0, 3000))) return k; }
  for (const [re, k] of NAME_RULES) if (re.test(file.name.replace(/\.[a-z0-9]+$/i, ''))) return k;
  if (isImg(file)) return 'photo';
  return 'other';
}

/* ---------- add, retype, open, remove ---------- */
let docBusy = false;
async function addDocs(fileList, forcedType) {
  const files = [...fileList]; if (!files.length) return;
  if (docBusy) { toast('Still reading the last files…'); return; }
  docBusy = true; const said = [];
  try {
    const typed = []; const seen = new Map(); files.forEach(f => seen.set(f.name.toLowerCase(), f)); // the same file twice in one drop counts once
    for (const file of seen.values()) { $('#docStatus').textContent = 'Sorting ' + file.name + '…'; let type = forcedType || await detectDocType(file);
      if (forcedType) { const said = await textDocType(file); if (said && said !== forcedType && STRONG_TYPES.includes(said)) { type = said; file._moved = DOC_LABEL[forcedType]; } }   // a County permit history dropped in the prelim box is still a permit history
      typed.push([file, type]); }
    const FIRST = ['crs', 'mls', 'clientLetter']; const rank = t => { const i = FIRST.indexOf(t); return i < 0 ? 9 : i; };
    typed.sort((a, b) => rank(a[1]) - rank(b[1])); // the CRS first, so later files can be checked against the subject's APN
    for (const [file, type] of typed) {
      $('#docStatus').textContent = 'Reading ' + file.name + '…';
      cur = readForm(); const old = (cur.docs || []).find(d => (d.name || '').toLowerCase() === file.name.toLowerCase()); // same file name again → replace it, keep its notes and accepted entries
      const meta = old ? { ...old, type: file._moved ? type : forcedType || old.type || type, size: file.size, mime: file.type || '', added: new Date().toISOString(), note: '' } : { id: uid(), name: file.name, type, size: file.size, mime: file.type || '', added: new Date().toISOString(), note: '' };
      try { await ODB.put('docs', { ...meta, orderId: cur.id, blob: file }); }
      catch (e) { said.push(file.name + ': could not be stored (' + (e.message || e) + ')'); continue; }
      cur.docs = old ? cur.docs.map(d => d.id === old.id ? meta : d) : [...(cur.docs || []), meta];
      await readDoc(meta, file); said.push(file.name + (old ? ' → replaced the earlier copy' : ' → ' + DOC_LABEL[meta.type]) + (file._moved ? ' (dropped in the ' + file._moved + ' box, but page 1 says it is a ' + DOC_LABEL[meta.type] + ')' : '') + (meta.note ? ' · ' + meta.note : ''));
    }
  } finally { docBusy = false; }
  { const nr = said.filter(x => x.includes('replaced the earlier copy')).length; $('#docStatus').textContent = said.length === 1 ? said[0] : (said.length - nr ? (said.length - nr) + ' files added' : '') + (nr ? (said.length - nr ? ', ' : '') + nr + ' replaced (same file name as one already here)' : '') + ' – see each one below.'; }
  renderDocs(); renderSubject(); syncVisibility(); update(); saveLetter(true); if (typeof wzRefresh === 'function') wzRefresh();
}
async function readDoc(meta, file) { // turns the readable kinds into facts; notes what happened
  meta.note = ''; meta.warn = '';
  try {
    if (meta.type === 'crs') {
      const c = G.parseCRS(await G.pdfLines(file)); if (!c.addr && !c.apn) { meta.note = 'no CRS facts found – check the type'; return; }
      c.file = file.name; applyCRS(c); meta.note = meta.warn ? 'not used – different property' : 'subject facts filled';
    } else if (meta.type === 'mls') {
      const rows = /\.csv$/i.test(file.name) ? G.parseMlsCsv(await G.readText(file)) : isPdf(file) ? G.parseMlsPdf(await G.pdfLines(file)) : [];
      const n = applyListings(rows, file.name); meta.note = n ? n + ' subject listing' + (n > 1 ? 's' : '') + ' found' : rows.length ? 'none of its ' + rows.length + ' listings is the subject' : 'no listings found';
    } else if (meta.type === 'permitsCounty') {
      const P = G.parsePermits(await G.pdfLines(file)); if (!P.parcel && !P.accela.length && !P.zoning) { meta.note = 'not a County permit history'; return; }
      P.file = file.name; const apn = G.apnKey($('#f_apn').value);
      if (apn && P.parcel && G.apnKey(P.parcel) !== apn) { meta.note = 'this is for parcel ' + P.parcel + ', not the subject (' + $('#f_apn').value + ') – not used'; return; }
      cur = readForm(); cur.permits = P; meta.note = (G.permitItems ? G.permitItems(P).length : P.accela.length) + ' permits/cases listed';
      if (P.parcel && !$('#f_apn').value) $('#f_apn').value = P.parcel;
    } else if (meta.type === 'clientLetter') {
      if (isPdf(file) || /\.(docx|txt)$/i.test(file.name)) { await scanFile(file); meta.note = cur.orderDoc ? 'checked for AI wording' : '';
        try { const F = await readClientLetter(file); const did = applyClientLetter(F); cur = readForm(); cur.letterFill = did; cur.letterFields = F; if (did.length) meta.note += ' · ' + did.length + ' items filled in'; } catch (e) { console.warn('letter fill', e); } }
      if ($('#f_status').value === 'Drafted' && !cur.letterMade) { $('#f_status').value = 'Client letter'; toast('The client’s letter now shows on the left instead of yours. To write your own, set My letter back to Drafted.', 6000); }
    } else if (meta.type === 'myLetter') {   // her own letter, signed and sent back: it is not the client's letter and is not checked for AI wording
      cur = readForm(); if (cur.orderDoc && cur.orderDoc.name === meta.name) cur.orderDoc = null;
      if (!(cur.docs || []).some(d => d.type === 'clientLetter' && d.id !== meta.id)) { cur.letterMode = 'mine'; if (['Client letter', 'Drafted', 'Sent'].includes($('#f_status').value)) $('#f_status').value = /sign/i.test(meta.name) ? 'Signed' : 'Sent'; }
      meta.note = 'your letter' + ($('#f_status').value === 'Signed' ? ' · marked Signed' : ''); if (typeof renderScan === 'function') renderScan(cur.orderDoc);
    } else if (meta.type === 'floorplan') {
      const prev = await planPreview(file, meta.page || 1); if (prev) { const rec = await ODB.get('docs', meta.id); rec.preview = prev.src; rec.pages = prev.pages; await ODB.put('docs', rec); meta.pages = prev.pages; meta.note = 'ready for the iPad'; }
    }
  } catch (e) { console.error(e); meta.note = 'could not be read: ' + (e.message || e); }
  try { await checkDocAddress(meta, file); } catch (e) {}
}
async function docFile(id) { const r = await ODB.get('docs', id); return r ? new File([r.blob], r.name, { type: r.mime || r.blob.type }) : null; }
async function retypeDoc(id, type) {
  cur = readForm(); const meta = (cur.docs || []).find(d => d.id === id); if (!meta) return; meta.type = type;
  const rec = await ODB.get('docs', id); if (rec) { rec.type = type; await ODB.put('docs', rec); }
  const f = await docFile(id); if (f) await readDoc(meta, f);
  renderDocs(); renderSubject(); update(); saveLetter(true);
}
async function openDoc(id) { const r = await ODB.get('docs', id); if (!r) { toast('That file is no longer stored'); return; } const u = URL.createObjectURL(r.blob); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
async function removeDoc(id) {
  cur = readForm(); cur.docs = (cur.docs || []).filter(d => d.id !== id); await ODB.del('docs', id).catch(() => {});
  renderDocs(); update(); saveLetter(true); toast('File removed from this order');
}
/* the kinds in one small panel, all visible at once, placed so it fits in the window */
function kindPop(btn) {
  let pop = $('#kindPop'); if (pop && pop.dataset.for === btn.dataset.dkind) { pop.remove(); return; } if (pop) pop.remove();
  const id = btn.dataset.dkind; const cur0 = ((cur.docs || []).find(d => d.id === id) || {}).type;
  pop = document.createElement('div'); pop.id = 'kindPop'; pop.dataset.for = id; pop.setAttribute('role', 'menu');
  pop.innerHTML = DOC_TYPES.map(([g, ks]) => `<div class="kpg"><b>${h(g)}</b>${ks.map(([k, l]) => `<button type="button" role="menuitem" data-k="${k}" class="${k === cur0 ? 'on' : ''}">${h(l)}</button>`).join('')}</div>`).join('');
  document.body.appendChild(pop);
  const r = btn.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.min(Math.max(8, r.right - pw), W - pw - 8), top = r.bottom + 6; if (top + ph > H - 8) top = Math.max(8, r.top - ph - 6);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  pop.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { pop.remove(); if (b.dataset.k !== cur0) retypeDoc(id, b.dataset.k); });
  const close = e => { if (!pop.contains(e.target) || e.key === 'Escape') { pop.remove(); document.removeEventListener('click', close); document.removeEventListener('keydown', close); window.removeEventListener('scroll', close, true); } };
  setTimeout(() => { document.addEventListener('click', close); document.addEventListener('keydown', close); window.addEventListener('scroll', close, true); }, 0);
}
function renderDocs() {
  const list = (cur && cur.docs) || []; const box = $('#docList');
  const opts = sel => DOC_TYPES.map(([g, ks]) => `<optgroup label="${h(g)}">${ks.map(([k, l]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${h(l)}</option>`).join('')}</optgroup>`).join('');
  box.innerHTML = list.length ? `<table class="docs"><tbody>${list.map(d => `<tr>
      <td><button type="button" class="lnk" data-dopen="${d.id}" title="Open">${h(d.name)}</button><small>${Math.max(1, Math.round(d.size / 1024)).toLocaleString()} KB${d.note ? ' · ' + h(d.note) : READS[d.type] ? '' : ''}</small>${d.warn ? `<small class="warnTxt">⚠ ${h(d.warn)}</small>` : ''}</td>
      <td><button type="button" class="kindBtn" data-dkind="${d.id}" aria-haspopup="true" title="Change the kind of document">${h(DOC_LABEL[d.type] || 'Other')} ▾</button>${d.type === 'floorplan' && d.pages > 1 ? ` <label class="pg">page <input data-dpage="${d.id}" inputmode="numeric" value="${d.page || 1}" size="2"> of ${d.pages}</label>` : ''}</td>
      <td class="acts"><button type="button" class="btn small" data-dread="${d.id}">Read</button><button type="button" class="btn ghost small danger" data-ddel="${d.id}">Remove</button></td></tr>`).join('')}</tbody></table>`
    : '<p class="help">No documents yet.</p>';
  $('#docCount').textContent = list.length ? list.length + ' file' + (list.length > 1 ? 's' : '') : '';
  box.querySelectorAll('[data-dopen]').forEach(b => b.onclick = () => openDoc(b.dataset.dopen));
  box.querySelectorAll('[data-dread]').forEach(b => b.onclick = () => { saveLetter(true, true); openReader(b.dataset.dread); });
  if (typeof renderFacts === 'function') renderFacts();
  box.querySelectorAll('[data-dkind]').forEach(b => b.onclick = e => { e.stopPropagation(); kindPop(b); });
  box.querySelectorAll('[data-dpage]').forEach(i => i.onchange = async () => { cur = readForm(); const m = cur.docs.find(d => d.id === i.dataset.dpage); m.page = Math.max(1, Math.min(m.pages || 1, parseInt(i.value, 10) || 1)); const f = await docFile(m.id); await readDoc(m, f); renderDocs(); saveLetter(true); toast('Floor plan page ' + m.page + ' will go to the iPad'); });
  box.querySelectorAll('[data-ddel]').forEach(b => b.onclick = () => {
    if (b.dataset.armed) removeDoc(b.dataset.ddel);
    else { b.dataset.armed = '1'; b.textContent = 'Click again to remove'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Remove'; } }, 3000); } });
}

/* ---------- floor plan → picture for the iPad's tracing layer ---------- */
async function planPreview(file, page) {
  let canvas, pages = 1;
  if (isPdf(file)) {
    const pdfjs = await import('./pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise; pages = doc.numPages;
    const pg = await doc.getPage(Math.min(page, pages)); const vp = pg.getViewport({ scale: 1 }); const v2 = pg.getViewport({ scale: Math.min(3, 2400 / Math.max(vp.width, vp.height)) });
    canvas = document.createElement('canvas'); canvas.width = Math.round(v2.width); canvas.height = Math.round(v2.height);
    const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); await pg.render({ canvasContext: g, viewport: v2 }).promise;
  } else if (isImg(file)) {
    const url = URL.createObjectURL(file); const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That picture could not be opened')); i.src = url; });
    const sc = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight)); canvas = document.createElement('canvas'); canvas.width = Math.round(im.naturalWidth * sc); canvas.height = Math.round(im.naturalHeight * sc);
    const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); g.drawImage(im, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
  } else return null;
  return { src: canvas.toDataURL('image/jpeg', 0.85), pages };
}

/* ---------- CRS and MLS facts ---------- */
const NO_SUBJECT_COUNTS = ['beds', 'bedsMls', 'baths', 'bathsMls', 'sqft', 'sqftAssessor', 'sqftMls', 'rooms', 'roomsMls'];
function crsForSubject(c) { const o = { ...(c || {}) }; NO_SUBJECT_COUNTS.forEach(k => delete o[k]); return o; }
function applyCRS(c) {
  { const a0 = ($('#f_address').value || '').split(',')[0].trim(); if (a0 && c.addr && !sameStreet(c.addr, a0) && !(c.apn && G.apnKey(c.apn) === G.apnKey($('#f_apn').value))) {
    toast('This CRS report is for ' + G.titleCase(c.addr) + ', not ' + a0 + ' – nothing was filled in from it.', 7000); const m = (cur.docs || []).find(d => d.name === c.file); if (m) m.warn = 'This CRS report is for ' + G.titleCase(c.addr) + ', not ' + a0 + '. Nothing was filled in from it.'; return; } }
  cur = readForm(); cur.crs = c;
  const set = (id, v) => { if (v) $('#f_' + id).value = v; };
  set('apn', c.apn); set('owner', c.owner); set('legal', c.legal); set('lat', c.lat); set('lon', c.lng);
  set('county', (c.county || '').replace(/,\s*[A-Z]{2}$/, '').replace(/\s+County$/i, ''));
  const line = [G.titleCase(c.addr), [G.titleCase(c.city), [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  const a = $('#f_address');
  if (!a.value.trim() || !c.addr || sameStreet(c.addr, a.value.split(',')[0])) { if (c.addr) setOrderAddr({ street: G.titleCase(c.addr), city: G.titleCase(c.city || ''), state: c.state || '', zip: c.zip || '', zip4: c.zip4 || '' }, true); } // the CRS has the USPS form of the address
  else if (c.addr && G.addrKey(c.addr) !== G.addrKey(a.value.split(',')[0])) { toast('Note: this CRS report is for ' + G.titleCase(c.addr) + ', not ' + a.value.split(',')[0], 6000); const m = (cur.docs || []).find(d => d.name === c.file); if (m) m.warn = 'This CRS report is for ' + G.titleCase(c.addr) + ', not ' + a.value.split(',')[0] + '.'; }
  if (/condo/i.test(c.landUse || '') && $('#f_propType').value === 'sfr') { $('#f_propType').value = 'condo'; applyPropDefaults(); }
}
function isSubjectRow(r) {
  const apn = G.apnKey($('#f_apn').value), street = ($('#f_address').value || '').split(',')[0];
  if (apn && G.apnKey(r.apn) === apn) return true;
  return !!(street && r.addr && G.addrKey(r.addr + (r.unit ? ' #' + r.unit : '')) === G.addrKey(street));
}
function applyListings(rows, fileName) {
  cur = readForm(); let mine = rows.filter(isSubjectRow);
  if (!mine.length && rows.length === 1 && !($('#f_apn').value || $('#f_address').value)) mine = rows; // the subject's own printout on a new order
  if (!mine.length) return 0;
  const keep = r => ({ mls: r.mls, status: r.status, listPrice: r.listPrice, origList: r.origList, listDate: r.listDate, contractDate: r.contractDate, saleDate: r.saleDate, salePrice: r.salePrice, dom: r.dom, cdom: r.cdom,
    priceChanges: r.priceChanges || [], history: r.listings || [], addr: r.addr, apn: r.apn, file: fileName });
  const old = (cur.listings || []).filter(x => !mine.some(r => r.mls === x.mls));
  cur.listings = [...old, ...mine.map(keep)].sort((a, b) => String(b.listDate || '').localeCompare(String(a.listDate || '')));
  const a = $('#f_address'); const r0 = mine[0];
  if (!a.value.trim() && r0.addr) setOrderAddr({ street: r0.addr + (r0.unit && !/#|unit|apt/i.test(r0.addr) ? ' #' + r0.unit : ''), city: r0.city || '', state: 'CA', zip: r0.zip || '' });
  if (!$('#f_apn').value && r0.apn) $('#f_apn').value = r0.apn;
  if (!$('#f_lat').value && r0.lat) { $('#f_lat').value = r0.lat; $('#f_lon').value = r0.lon; }
  // the letter's listing / contract line
  const live = cur.listings.find(x => /Active|Coming/i.test(x.status)) ? 'listed' : cur.listings.find(x => /Pending|Under Contract|Contingent|Backup/i.test(x.status)) ? 'contract' : '';
  if (live) { const L = cur.listings.find(x => live === 'listed' ? /Active|Coming/i.test(x.status) : /Pending|Under Contract|Contingent|Backup/i.test(x.status));
    $('#f_listing').value = live; if (!$('#f_listingDetail').value) $('#f_listingDetail').value = `MLS #${L.mls}, listed ${G.showDate(L.listDate)} at ${G.money(L.listPrice)}` + (live === 'contract' && L.contractDate ? `, under contract ${G.showDate(L.contractDate)}` : ''); }
  return mine.length;
}
function renderSubject() {
  const c = cur && cur.crs, L = (cur && cur.listings) || [], P = cur && cur.permits; const box = $('#subjectFacts');
  const withinYears = (d, n) => { const x = new Date(d); if (isNaN(x)) return false; const lim = new Date(); lim.setFullYear(lim.getFullYear() - n); return x >= lim; };
  const rows = c ? [['Year built (assessor)', c.yearBuilt], ['Lot size', [c.lotSf && Number(c.lotSf).toLocaleString() + ' sq. ft.', c.acres && c.acres + ' ac.'].filter(Boolean).join(' · ')], ['Land use', c.landUse], ['Zoning', c.zoning],
    ['FEMA flood zone', [c.fema, c.femaPanel, c.femaDate].filter(Boolean).join(' · ')], ['Census tract', c.census], ['Tax rate area', c.taxArea],
    ['Last sale', c.sales && c.sales[0] ? [c.sales[0].date, c.sales[0].amount, c.sales[0].instrument].filter(Boolean).join(' · ') : ''],
    ['Transfers in the last 3 years', c.sales ? String(c.sales.filter(s => withinYears(s.date, 3)).length) : '']].filter(r => r[1]) : [];
  box.innerHTML = (c ? `<p class="help">From ${h(c.file || 'the CRS report')}. Beds, baths and square feet are left out on purpose: you count and measure them at the inspection.</p>
      <table class="facts">${rows.map(r => `<tr><th>${h(r[0])}</th><td>${h(r[1])}</td></tr>`).join('')}</table>` : '<p class="help">Drop the CRS report in Documents and the APN, owner, legal description, location and public-record facts fill in here.</p>')
    + (L.length ? `<h4>Subject listing history (MLS)</h4><table class="facts"><tr><th>MLS #</th><th>Status</th><th>Listed</th><th>List price</th><th>Contract</th><th>Sold</th><th>Sale price</th><th>DOM</th></tr>${L.map(x => `<tr><td>${h(x.mls)}</td><td>${h(x.status)}</td><td>${h(G.showDate(x.listDate))}</td><td>${h(G.money(x.listPrice))}</td><td>${h(G.showDate(x.contractDate))}</td><td>${h(G.showDate(x.saleDate))}</td><td>${h(G.money(x.salePrice))}</td><td>${h(x.dom ?? '')}</td></tr>`).join('')}</table>` : '')
    + (P ? `<h4>County permit history</h4><p class="help">Parcel ${h(P.parcel || '')}${P.zoning ? ' · zoning ' + h(P.zoning) : ''} · ${G.permitItems ? G.permitItems(P).length : P.accela.length} permits/cases${P.holds && P.holds.length ? ' · <b>parcel hold: ' + h(P.holds.join(' / ')) + '</b>' : ''}. The list goes to the iPad with the order.</p>` : '');
}

/* ---------- the "Active Orders" file for the iPad ---------- */
const DONE_STAGES = ['Delivered', 'Paid', 'Cancelled'];
async function activeOrdersFile() {
  const list = letters.filter(o => !DONE_STAGES.includes(o.stage || 'New'));
  if (!list.length) { toast('No active orders to send'); return; }
  const out = [];
  for (const o of list) {
    const plans = [];
    for (const d of (o.docs || []).filter(d => d.type === 'floorplan')) { const r = await ODB.get('docs', d.id); if (r && r.preview) plans.push({ name: d.name + (d.page > 1 ? ' (page ' + d.page + ')' : ''), src: r.preview }); }
    const T = TYPES[o.type] || {}; const c0 = (o.clients || [])[0] || {};
    out.push({ id: o.id, fileNo: o.fileNo, address: o.address, unit: o.unit || '', apn: o.apn, county: o.county, lat: o.lat, lon: o.lon, owner: o.owner, legal: o.legal,
      stage: o.stage || 'New', reportForm: ({ uad36: 'UAD 3.6 – new URAR (Traditional)', uad26: 'UAD 2.6 (Legacy)', gpar: 'GPAR', other: 'Other / narrative' })[o.reportForm] || '', formName: o.format || '', inspDate: o.inspDate, inspTime: o.inspTime, effDate: effectiveDate(o), dueDate: o.dueDate, type: T.label || o.type, retro: !!T.retro, propType: o.propType,
      inspection: o.inspection, client: [c0.name, c0.company].filter(Boolean).join(', '), access: { name: o.accessName, rel: o.accessRel, phone: o.accessPhone },
      notes: o.notes || '', todos: String(o.todos || '').split('\n').map(s => s.trim()).filter(Boolean), aiUse: o.aiUse,
      crs: o.crs ? crsForSubject(o.crs) : null, permits: o.permits || null,
      listings: (o.listings || []).map(x => ({ mls: x.mls, status: x.status, listPrice: x.listPrice, origList: x.origList, listDate: x.listDate, contractDate: x.contractDate, saleDate: x.saleDate, salePrice: x.salePrice, dom: x.dom, cdom: x.cdom })),
      docs: (o.docs || []).map(d => ({ name: d.name, type: DOC_LABEL[d.type] || d.type })), plans });
  }
  const data = { app: 'appraisal-assistant', kind: 'active-orders', made: new Date().toISOString(), build: BUILD, orders: out };
  download(new TextEncoder().encode(JSON.stringify(data)), 'Active Orders.json', 'application/json');
  toast(`Saved Active Orders.json (${out.length} order${out.length > 1 ? 's' : ''}) to Downloads`);
}
function effectiveDate(o) { const T = TYPES[o.type] || {}; return o.effDate || (T.retro ? o.dod : o.inspDate) || ''; }

/* ---------- the client's engagement letter / order: label → value, then into the order ---------- */
async function letterPairs(file) { // [{label, value}] from "Label: value" cells, including values printed on the lines above/below a label
  if (!isPdf(file)) { const t = /\.docx$/i.test(file.name) ? (await docxParagraphs(file)).join('\n') : await G.readText(file); return { text: t, pairs: t.split('\n').map(l => l.match(/^\s*([A-Za-z][A-Za-z /#'&().-]{1,40}?)\s*:\s*(.+)$/)).filter(Boolean).map(m => ({ label: m[1].trim(), value: m[2].trim() })) }; }
  const L = await G.pdfLines(file); const rows = L.rows; const pairs = [];
  const isLab = c => /:\s*$/.test(c.s) && c.s.length < 45;
  rows.forEach((cells, r) => cells.forEach((c, k) => { if (!isLab(c)) return;
    const next = cells.slice(k + 1).find(isLab); const x1 = next ? next.x : c.x + 330; const lab = c.s.replace(/\s*:\s*$/, '').trim();
    const same = cells.slice(k + 1).filter(v => !isLab(v) && v.x < x1).map(v => v.s);
    if (same.length) { pairs.push({ label: lab, value: same.join(' ') }); return; }
    const near = [r - 1, r + 1].filter(i => rows[i] && !rows[i].some(v => isLab(v) && v.x < c.x + 40)).flatMap(i => rows[i].filter(v => !isLab(v) && v.x > c.x && v.x < x1).map(v => v.s));
    if (near.length) pairs.push({ label: lab, value: near.join(' ') }); }));
  return { text: L.join('\n'), pairs };
}
const CL_MAP = [['client', /^(client|client name|lender\/client)$/i], ['lender', /^(lender|lender name)$/i], ['loanNo', /^loan\s*(number|#|no\.?)$/i], ['borrower', /^borrower( name)?s?$/i],
  ['due', /^(due date|due|report due|due from service provider|due to client)$/i], ['orderDate', /^(order date|date ordered|assigned date)$/i], ['propAddr', /^(property address|subject address|subject property address|property)$/i],
  ['purpose', /^(loan purpose|transaction type|purpose|loan type|assignment type)$/i], ['price', /^(sales? price|contract price|purchase price)$/i], ['form', /^(service|product|form|form type|report type|appraisal type|product type)$/i],
  ['fee', /^(service provider fee|fee|appraisal fee|vendor fee|appraiser fee|total fee)$/i], ['ref', /^(document id|order id|order number|order #|reference( number)?|client file( number)?|file number)$/i], ['occupancy', /^occupancy$/i], ['ptype', /^property type$/i]];
async function readClientLetter(file) {
  let { text, pairs } = await letterPairs(file); const F = {}; const fix = x => String(x).replace(/\s?Ɵ\s?/g, 'ti').replace(/\s?ﬁ\s?/g, 'fi').replace(/\s?ﬂ\s?/g, 'fl').replace(/\s?ﬀ\s?/g, 'ff'); text = fix(text); pairs = pairs.map(p => ({ label: fix(p.label), value: fix(p.value) }));
  pairs.forEach(({ label, value }) => { const m = CL_MAP.find(([, re]) => re.test(label)); if (m && !F[m[0]] && value && !/^n\/?a$/i.test(value)) F[m[0]] = value.replace(/\s+/g, ' ').trim(); });
  const T = text.replace(/\s+/g, ' ');
  const line = re => { const m = text.split('\n').map(l => l.replace(/\s*\|\s*/g, ' ').trim()).map(l => l.match(re)).find(Boolean); return m ? m[1].trim().replace(/\s{2,}/g, ' ').replace(/\.$/, (x, i, str) => /N\.A$|Inc$|Co$/.test(str.slice(0, -1)) ? '.' : '') : ''; };
  let m; F.clientAs = line(/Client to be [\w ]{0,14}?as:?\s*(.+)$/i);
  F.users = line(/Intended Users? (?:to be [\w ]{0,14}?as|are|is)?\s*:\s*(.+)$/i); F.use = line(/Intended Use (?:to be [\w ]{0,14}?as|is)?\s*:\s*(.+)$/i);
  if (!F.clientAs) delete F.clientAs; if (!F.users) delete F.users; if (!F.use) delete F.use;
  if (/\b1007\b|rent schedule|comparable rent schedule|operating income statement|\b216\b/i.test(T)) F.rent = true;
  if (/requires? 1004MC:?\s*yes|1004MC (is )?required/i.test(T)) F.mc = true;
  if (/exterior[- ]only|\b2055\b|drive[- ]by|exterior inspection only/i.test(T)) F.exterior = true;
  if (/cost approach (is |will be )?(required|must)/i.test(T)) F.cost = true;
  if (/\bPURCHASE appraisal\b/i.test(T) && !F.purpose) F.purpose = 'Purchase';
  return F;
}
function applyClientLetter(F) { // fills only empty boxes (type, form, client always follow the letter); returns what was filled
  const did = []; const set = (id, v, label, always) => { const el = $('#f_' + id); if (!el || v == null || v === '') return; if (el.type === 'checkbox') { if (el.checked !== !!v) { el.checked = !!v; did.push([label, v ? 'Yes' : 'No']); } return; } if (!always && el.value.trim()) return; el.value = v; did.push([label, v]); };
  const p = (F.purpose || '').toLowerCase(); const type = /purch/.test(p) ? 'uadPurchase' : /refi|cash.?out|rate|term/.test(p) ? 'uadRefi' : /equity|heloc|2nd|second/.test(p) ? 'uadHeloc' : /constr/.test(p) ? 'uadConstruction' : p ? 'uadOther' : '';
  if (type) { $('#f_type').value = type; applyTypeDefaults(); did.push(['Assignment type', TYPES[type].label]); }
  if (F.form) { const v = /3\.6|new urar|redesign/i.test(F.form) ? 'uad36' : /1004|1073|1025|2055|1075|urar/i.test(F.form) ? 'uad26' : /traditional/i.test(F.form) ? 'uad36' : ''; if (v && !(cur && cur.formPicked)) { $('#f_reportForm').value = v; const num = (F.form.match(/\b(1004[CD]?|1073|1075|1025|2055|2090|2095)\b/) || [])[1]; if (num && v === 'uad26' && cur) { const hit = FORM_LIST.uad26.find(x => x.startsWith('Form ' + num + ' ')); if (hit) { $('#f_format').value = hit; cur.formNamePicked = true; } } syncFormSel(); did.push(['Report form', F.form]); } }
  const client = F.clientAs || F.client; if (client) { const c0 = $('#c0_company'); if (!c0.value.trim() || c0.value.trim() === (F.client || '')) { c0.value = client; did.push(['Client', client]); } }
  const amc = [F.client, F.lender].find(x => x && /appraisal management|\bAMC\b|valuation (services|management)|lender services|appraisal (nation|link|port)|solidifi|class valuation|clear capital|servicelink|corelogic|reggora|nationwide appraisal/i.test(x));
  if (amc) { set('amcUsed', true, 'Ordered through an AMC'); set('amcCo', amc, 'AMC'); }
  set('loanNo', F.loanNo, 'Loan number'); set('borrower', F.borrower, 'Borrower');
  const d = x => G.isoDate(String(x || '').match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/)?.[0] || ''); set('dueDate', d(F.due), 'Report due'); set('orderDate', d(F.orderDate), 'Order received', true);
  set('fee', F.fee ? Number(String(F.fee).replace(/[^\d.]/g, '')).toLocaleString() : '', 'Fee'); set('amcRef', F.ref, 'Client / AMC reference');
  set('otherUsers', F.users && client && F.users.toLowerCase().includes(client.toLowerCase().slice(0, 12)) ? '' : F.users, 'Other intended users');
  if (F.rent) set('rent', true, 'Rent schedule (1007) requested'); if (F.cost) set('apCost', true, 'Cost approach required'); if (F.exterior) { $('#f_inspection').value = 'exterior'; did.push(['Inspection', 'Exterior only']); }
  if (F.propAddr) { const a = $('#f_address'); if (!a.value.trim()) { setOrderAddr(splitAddr(G.titleCase(F.propAddr).replace(/\b(Ca)\b/, 'CA'))); did.push(['Property address', a.value]); } else if (!sameStreet(F.propAddr, a.value)) did.push(['⚠ Address in the letter', F.propAddr + ' – not the same as the order']); }
  const notes = [F.use && 'Intended use per client: ' + F.use, F.users && 'Intended user per client: ' + F.users, F.price && 'Sales price per order: $' + Number(String(F.price).replace(/[^\d.]/g, '')).toLocaleString(), F.mc && '1004MC required', F.occupancy && 'Occupancy: ' + F.occupancy].filter(Boolean);
  if (notes.length) { const n = $('#f_notes'); const add = notes.filter(x => !n.value.includes(x)); if (add.length) { n.value = (n.value ? n.value + '\n' : '') + add.join('\n'); did.push(['Notes', add.join('; ')]); } }
  return did;
}

async function checkDocAddress(meta, file) { // is this document for the order's property? (street number and street name on its first pages)
  const street = ($('#f_address').value || '').split(',')[0].trim(); if (!street || !isPdf(file) || ['photo', 'floorplan', 'marketSearch', 'mls', 'crs'].includes(meta.type)) return;
  const sp = G.splitAddr(street); const word = (sp.street.split(/\s+/).find(w => w.length > 2 && !/^(north|south|east|west|n|s|e|w)$/i.test(w)) || '').toLowerCase(); if (!sp.no || !word) return;
  const pdfjs = await loadPdfJs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
  let t = ''; for (let n = 1; n <= Math.min(4, doc.numPages); n++) t += ' ' + (await (await doc.getPage(n)).getTextContent()).items.map(i => i.str).join(' ');
  if (t.replace(/\s/g, '').length < 300) return; // a scan: cannot tell
  const T = t.toLowerCase(); if (!(T.includes(sp.no.toLowerCase()) && T.includes(word))) meta.warn = 'The property address was not found on its first pages – check that this is for ' + street + '.';
}

function sameStreet(a, b) { // "526 CROCKER SPERRY DR Montecito, CA" vs "526 Crocker Sperry Dr" → true
  const A = String(a || '').toLowerCase(), sp = G.splitAddr(String(b || '').split(',')[0]); if (!sp.no) return true;
  const w = (sp.street.split(/\s+/).find(x => x.length > 2 && !/^(north|south|east|west|n|s|e|w)$/i.test(x)) || '').toLowerCase();
  return new RegExp('\\b' + sp.no.toLowerCase().replace(/[^\w-]/g, '') + '\\b').test(A) && (!w || A.includes(w));
}

/* orders that already have the same file twice (uploaded before Oct 15 2026): keep one, move its notes and entries over */
async function dedupeDocs(o) {
  const docs = o.docs || []; const keep = new Map(), drop = [];
  docs.forEach(d => { const k = (d.name || '').toLowerCase() + '|' + (d.size || ''); if (keep.has(k)) drop.push([d, keep.get(k)]); else keep.set(k, d); });
  if (!drop.length) return 0;
  const map = Object.fromEntries(drop.map(([d, k]) => [d.id, k.id]));
  Object.keys(o).forEach(key => { if (Array.isArray(o[key])) o[key].forEach(x => { if (x && typeof x === 'object' && map[x.docId]) x.docId = map[x.docId]; }); });
  o.docs = docs.filter(d => !map[d.id]);
  for (const [d] of drop) { try { await ODB.del('docs', d.id); } catch (e) {} }
  return drop.length;
}
