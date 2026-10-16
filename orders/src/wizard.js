/* =====================================================================
   Start page and the New order steps (her workflow, Oct 16 2026)
   Home: New order · Open an order · All files.
   New order: 1) file number, address, who writes the letter, purchase?, listed?
              2) upload by slot (client's letter, CRS, legal, MLS with history, contract packet, prelim, other)
              3) what was read and filled in, alerts (AI use, wrong address), then the letter or the order.
   ===================================================================== */
const WZ = { step: 1 };
function renderHome() {
  const box = $('#homeBody'); if (!box) return;
  const act = letters.filter(o => !DONE_STAGES.includes(o.stage || 'New')).sort((a, b) => String(b.saved || b.created || '').localeCompare(String(a.saved || a.created || ''))).slice(0, 8);
  box.innerHTML = `<div class="homegrid">
    <button type="button" class="homecard primary" id="hmNew"><b>New order</b><span>Start an order: upload its documents once and let the assistant fill in what it can.</span></button>
    <div class="homecard"><b>Open an order</b><input id="hmSearch" type="search" placeholder="File number, street, client…"><div id="hmList">${act.map(o => `<button type="button" class="hmrow" data-hopen="${o.id}"><span>${h(o.fileNo || '—')}</span><span>${h(street(o) || '(no address)')}</span><small>${h(o.stage || 'New')}</small></button>`).join('') || '<p class="help">No active orders yet.</p>'}</div></div>
    <button type="button" class="homecard" id="hmFiles"><b>All files</b><span>The file list: every order, with search and status.</span></button>
  </div>`;
  $('#hmNew').onclick = () => startNewOrder();
  $('#hmFiles').onclick = () => showTab('saved');
  box.querySelectorAll('[data-hopen]').forEach(b => b.onclick = () => openLetter(b.dataset.hopen));
  $('#hmSearch').oninput = e => { const q = e.target.value.toLowerCase().trim(); const hits = letters.filter(o => !q || [o.fileNo, o.address, o.apn, ((o.clients || [])[0] || {}).name, ((o.clients || [])[0] || {}).company, o.borrower].join(' ').toLowerCase().includes(q)).slice(0, 12);
    $('#hmList').innerHTML = hits.map(o => `<button type="button" class="hmrow" data-hopen="${o.id}"><span>${h(o.fileNo || '—')}</span><span>${h(street(o) || '(no address)')}</span><small>${h(o.stage || 'New')}</small></button>`).join('') || '<p class="help">No order matches.</p>';
    $('#hmList').querySelectorAll('[data-hopen]').forEach(b => b.onclick = () => openLetter(b.dataset.hopen)); };
}
function startNewOrder() {
  if (cur && hasContent(readForm())) saveLetter(true);
  cur = blankLetter(); cur.wizard = { letter: '', purchase: '', listed: '' }; writeForm(cur); render(); WZ.step = 1; showTab('new'); renderWizard(); setTimeout(() => $('#wzFile') && $('#wzFile').focus(), 50);
}
const SLOTS = [
  ['clientLetter', 'Client’s engagement letter or order', 'Read for the client, loan, due date, fee, form and AI wording.', w => w.letter === 'client'],
  ['crs', 'CRS Data property report', 'Fills the APN, owner, location and public-record facts (never beds, baths or square feet).', () => true],
  ['legal', 'Legal description', 'Only if it is a separate file – the prelim usually has it.', () => true],
  ['mls', 'MLS listing with its history', 'The subject’s listing and listing history (CSV export or printout).', w => w.listed === 'yes'],
  ['contract', 'Purchase contract, counter offers and addenda', 'Add every file – packets often come in several PDFs.', w => w.purchase === 'yes'],
  ['prelim', 'Preliminary title report', 'Easements, CC&R’s and the legal description are read from it.', () => true],
  ['other', 'Other documents', 'Plans, permits, HOA documents, disclosures, leaseback, plat map … each is sorted by kind.', () => true],
];
function renderWizard() {
  const box = $('#newBody'); if (!box || !cur) return; const w = cur.wizard = cur.wizard || {}; const f = readForm();
  const steps = ['Order', 'Documents', 'Check'];
  const head = `<ol class="wzsteps">${steps.map((s, i) => `<li class="${WZ.step === i + 1 ? 'on' : WZ.step > i + 1 ? 'done' : ''}">${i + 1} · ${s}</li>`).join('')}</ol>`;
  if (WZ.step === 1) {
    box.innerHTML = head + `<section class="mkcard"><div class="grid3"><label>File number<input id="wzFile" value="${h(f.fileNo)}" placeholder="your file number"></label>
      <label style="grid-column:span 2">Property address<input id="wzAddr" value="${h(f.address)}" placeholder="1136 Hill Road, Santa Barbara, CA 93108"></label></div>
      <p class="help" id="wzFileNote"></p>
      <p class="help">The address is used to check that every document you upload is for this property. If you are not sure of it, leave it blank: the CRS report fills it in.</p>
      ${q('letter', 'Engagement letter', [['client', 'The client sent one (lender / AMC order)'], ['mine', 'I will write one']])}
      ${q('purchase', 'Is this a purchase?', [['yes', 'Yes'], ['no', 'No']])}
      ${q('listed', 'Is the property listed now, or was it in the last 12 months?', [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']])}
      <div class="row"><button type="button" class="btn primary" id="wzNext1">Next: documents →</button><button type="button" class="btn ghost" id="wzCancel">Cancel</button></div></section>`;
    const sync = () => { $('#f_fileNo').value = $('#wzFile').value; $('#f_address').value = $('#wzAddr').value; update(); };
    $('#wzFile').oninput = () => { w.fileTyped = true; sync(); };
    $('#wzAddr').oninput = () => { if (!w.fileTyped || !$('#wzFile').value.trim()) { const sug = suggestFileNo($('#wzAddr').value); $('#wzFile').value = sug; $('#wzFileNote').textContent = sug ? 'Made from your rule: street letters + house number' + (/-[2-9]\d*$/.test(sug) ? ' – you have appraised this property before in the assistant, so this is report ' + sug.split('-').pop() : '') + '. Change it if needed.' : ''; } sync(); };
    box.querySelectorAll('[data-wq]').forEach(b => b.onclick = () => { w[b.dataset.wq] = b.dataset.v; renderWizard(); });
    $('#wzCancel').onclick = () => { showTab('home'); renderHome(); };
    $('#wzNext1').onclick = () => { if (!w.letter) { toast('Choose who writes the engagement letter'); return; }
      if (w.letter === 'client') { $('#f_status').value = 'Client letter'; } else { $('#f_status').value = 'Drafted'; cur.letterMode = 'mine'; }
      if (w.purchase === 'no' && $('#f_type').value === 'uadPurchase') { $('#f_type').value = 'uadOther'; applyTypeDefaults(); }
      if (w.listed === 'yes' && $('#f_listing').value === 'omit') $('#f_listing').value = 'listed';
      update(); saveLetter(true, true); WZ.step = 2; renderWizard(); };
    return;
  }
  if (WZ.step === 2) {
    const docs = f.docs || [];
    box.innerHTML = head + `<section class="mkcard"><h3>${h([f.fileNo, street(f)].filter(Boolean).join(' – ') || 'New order')}</h3>
      <p class="help">Drop each file in its box (or click the box). You can add several files to any box. Everything is kept in this browser on this computer.</p>
      <div class="slots">${SLOTS.filter(([, , , show]) => show(w)).map(([k, title, help]) => { const mine = docs.filter(d => k === 'other' ? !SLOTS.slice(0, 6).some(s => s[0] === d.type) : d.type === k);
        return `<div class="slot" data-slot="${k}"><div><b>${h(title)}</b><small>${h(help)}</small>${mine.length ? `<ul>${mine.map(d => `<li>${h(d.name)}${d.note ? ' – ' + h(d.note) : ''}${d.warn ? ` <span class="warnTxt">⚠ ${h(d.warn)}</span>` : ''}</li>`).join('')}</ul>` : ''}</div>
          <label class="btn small">${mine.length ? 'Add more' : 'Choose files'}<input type="file" multiple data-slotfile="${k}" hidden></label></div>`; }).join('')}</div>
      <p class="help pre" id="wzStatus"></p>
      <div class="row"><button type="button" class="btn ghost" id="wzBack2">← Back</button><button type="button" class="btn primary" id="wzNext2">Next: check what was filled in →</button></div></section>`;
    box.querySelectorAll('[data-slot]').forEach(el => { const k = el.dataset.slot;
      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); }); el.addEventListener('dragleave', () => el.classList.remove('over'));
      el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); wzAdd(k, e.dataTransfer.files); }); });
    box.querySelectorAll('[data-slotfile]').forEach(i => i.onchange = () => { const fs = [...i.files]; i.value = ''; wzAdd(i.dataset.slotfile, fs); });
    $('#wzBack2').onclick = () => { WZ.step = 1; renderWizard(); };
    $('#wzNext2').onclick = () => { WZ.step = 3; saveLetter(true); renderWizard(); };
    return;
  }
  // step 3: what was found
  const fill = f.letterFill || []; const al = [];
  const V = { stop: ['No AI on this job', 'The client’s letter restricts AI (for example “no AI without prior authorization”), so this order is set to <b>No AI</b>. Nothing will be sent anywhere.'], look: ['AI only with confidential information removed', 'The letter limits sharing confidential or personal information but does not ban AI, so this order is set to <b>Yes – only with confidential information removed</b>.'], clear: ['AI allowed', 'Nothing in the letter limits AI or sharing of information, so this order is set to <b>Yes – no restriction</b>.'] };
  if (f.orderDoc && f.orderDoc.verdict) { const v = V[f.orderDoc.verdict]; al.push(`<div class="alert ${f.orderDoc.verdict}"><b>${v[0]}</b><p>${v[1]} Check the marked paragraphs on the order page; you can change the setting there.</p></div>`); }
  (f.docs || []).filter(d => d.warn).forEach(d => al.push(`<div class="alert stop"><b>Check the property</b><p>${h(d.name)}: ${h(d.warn)}</p></div>`));
  const facts = [['File number', f.fileNo], ['Property', f.address], ['APN', f.apn], ['Owner of record', f.owner], ['Client', ((f.clients || [])[0] || {}).company || ((f.clients || [])[0] || {}).name], ['Assignment type', (TYPES[f.type] || {}).label], ['Report due', f.dueDate && longDate(f.dueDate)], ['Fee', f.fee && '$' + f.fee], ['Loan number', f.loanNo], ['Borrower', f.borrower]].filter(r => r[1]);
  const need = []; if (!f.address) need.push('the property address'); if (w.letter === 'client' && !(f.docs || []).some(d => d.type === 'clientLetter')) need.push('the client’s engagement letter');
  if (!(f.docs || []).some(d => d.type === 'crs')) need.push('the CRS report'); if (w.purchase === 'yes' && !(f.docs || []).some(d => d.type === 'contract')) need.push('the purchase contract'); if (w.listed === 'yes' && !(f.docs || []).some(d => d.type === 'mls')) need.push('the MLS listing with history');
  if (!f.inspDate) need.push('the inspection date'); if (!f.aiUse) need.push('AI use on this job');
  const toRead = (f.docs || []).filter(d => ['contract', 'prelim', 'counter', 'addendum', 'leaseback', 'permitsPdf', 'condoQ', 'ccrs', 'hoaBudget', 'disclosures', 'budget'].includes(d.type));
  box.innerHTML = head + `<section class="mkcard"><h3>${h([f.fileNo, street(f)].filter(Boolean).join(' – ') || 'New order')}</h3>${al.join('')}
    <h4>Filled in</h4><table class="facts">${facts.map(r => `<tr><th>${h(r[0])}</th><td>${h(r[1])}</td></tr>`).join('')}${fill.filter(x => !facts.some(r => r[0] === x[0])).map(x => `<tr><th>${h(x[0])}</th><td>${h(String(x[1]))}</td></tr>`).join('')}</table>
    ${need.length ? `<p class="help"><b>Still needed:</b> ${h(need.join(', '))}.</p>` : ''}
    ${toRead.length ? `<h4>Documents to read and summarize</h4><ul class="toread">${toRead.map(d => `<li>${h(DOC_LABEL[d.type] || d.type)}: ${h(d.name)} <button type="button" class="btn small" data-wzread="${d.id}">Read</button></li>`).join('')}</ul><p class="help">Prelims are summarized from their text; purchase contracts need you or Claude (C.A.R. forms cannot be read as text).</p>` : ''}
    <div class="row"><button type="button" class="btn ghost" id="wzBack3">← Back to documents</button>${w.letter === 'mine' ? '<button type="button" class="btn primary" id="wzLetter">Next: write my engagement letter →</button>' : ''}<button type="button" class="btn ${w.letter === 'mine' ? 'ghost' : 'primary'}" id="wzDone">Open the order</button></div></section>`;
  $('#wzBack3').onclick = () => { WZ.step = 2; renderWizard(); };
  $('#wzDone').onclick = () => { saveLetter(true); showTab('letter'); window.scrollTo(0, 0); };
  const wl = $('#wzLetter'); if (wl) wl.onclick = () => { cur.letterMode = 'mine'; saveLetter(true); showTab('letter'); update(); setTimeout(() => { const c = document.querySelector('#clients'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }, 80); };
  box.querySelectorAll('[data-wzread]').forEach(b => b.onclick = () => openReader(b.dataset.wzread));
}
function q(key, label, opts) { const v = (cur.wizard || {})[key]; return `<div class="wzq"><span>${h(label)}</span><div class="seg2">${opts.map(([k, l]) => `<button type="button" data-wq="${key}" data-v="${k}" aria-pressed="${v === k}">${h(l)}</button>`).join('')}</div></div>`; }
async function wzAdd(slot, files) { files = [...files]; if (!files.length) return; const st = $('#wzStatus'); if (st) st.textContent = 'Reading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…'; await addDocs(files, slot === 'other' ? undefined : slot); }
function wzRefresh() { if (!$('#panel-new').hidden && WZ.step === 2) renderWizard(); }

/* her file numbers: first letter of the street name + its next consonants (4 letters), house number, unit, report count
   1729 Bath St → Bath1729-1 (short names use their first 4 letters); 223 W. Arrellaga St #3 → Arrl223-3-1; unit B → Bath1729-b-1; 2nd report → -2 */
function fileCode(address) {
  const sp = G.splitAddr(String(address || '').split(',')[0].replace(/\./g, '')); if (!sp.no) return '';
  const words = sp.street.split(/\s+/).filter(Boolean); const DIR = /^(n|s|e|w|ne|nw|se|sw|north|south|east|west)$/i;
  while (words.length > 1 && DIR.test(words[0])) words.shift();
  const name = (words[0] || '').replace(/[^A-Za-z]/g, ''); if (!name) return '';
  let code = name[0]; for (const ch of name.slice(1)) { if (code.length >= 4) break; if (!/[aeiou]/i.test(ch)) code += ch; }
  if (code.length < 4) code = name.slice(0, 4);
  code = code[0].toUpperCase() + code.slice(1).toLowerCase();
  return code + sp.no.replace(/[^\w]/g, '') + (sp.unit ? '-' + sp.unit.toLowerCase() : '');
}
function suggestFileNo(address) {
  const base = fileCode(address); if (!base) return '';
  const re = new RegExp('^' + base.replace(/[-]/g, '\\-') + '-(\\d+)$', 'i'); let n = 0;
  const old = new RegExp('^' + base.replace(/[-]/g, '\\-') + '-?([a-z])$', 'i');   // old ACI style: Bath1729a, b, c… (d = 1004D, clones took the next letter)
  letters.forEach(o => { if (cur && o.id === cur.id) return; const f = String(o.fileNo || '').trim(); let m = f.match(re); if (m) n = Math.max(n, +m[1]); else if ((m = f.match(old))) n = Math.max(n, m[1].toLowerCase().charCodeAt(0) - 96); });
  return base + '-' + (n + 1);
}
