/* =====================================================================
   Start page and the New order steps (her workflow, Oct 16 2026)
   Home: New order · Open an order · All files.
   New order: 1) file number, address, who writes the letter, purchase?, listed?
              2) upload by slot (client's letter, CRS, legal, MLS with history, contract packet, prelim, other)
              3) what was read and filled in, alerts (AI use, wrong address), then the letter or the order.
   ===================================================================== */
const WZ = { step: 1 };
let HOME_VIEW = 'recent';
const realOrder = o => !!(o.fileNo || street(o) || (o.docs || []).length || ((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name || o.borrower);
const clientOf = o => ((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name || '';
function homeRows(list, empty) {
  return list.length ? `<div class="tableWrap"><table class="hmtable"><thead><tr><th>File #</th><th>Address</th><th>Borrower</th><th>Client</th><th>Status</th><th>Due</th></tr></thead><tbody>${list.map(o => `<tr data-hopen="${o.id}" tabindex="0"><td class="num"><b>${h(o.fileNo || '—')}</b></td><td>${h(street(o) || '(no address yet)')}</td><td>${h(o.borrower || '')}</td><td>${h(clientOf(o))}</td><td><span class="pill">${h(o.stage || 'New')}</span></td><td class="num">${h(o.dueDate ? longDate(o.dueDate) : '')}</td></tr>`).join('')}</tbody></table></div>`
    : `<p class="help">${empty}</p>`;
}
function renderHome() {
  const box = $('#homeBody'); if (!box) return;
  const all = letters.filter(realOrder);
  const tile = (id, icon, title, sub, on) => `<button type="button" class="hmtile${id === 'hmNew' ? ' primary' : ''}${on ? ' on' : ''}" id="${id}"><span class="hmicon" aria-hidden="true">${icon}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
  box.innerHTML = `<div class="hmtiles">
      ${tile('hmNew', '+', 'New order', 'Upload documents, fill in', false)}
      ${tile('hmOpen', '↻', 'Open an order', 'Your last 10 orders', HOME_VIEW === 'recent')}
      ${tile('hmFind', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>', 'All files', 'Search every order', HOME_VIEW === 'find')}
    </div>
    <div class="hmpanel" id="hmPanel"></div>`;
  $('#hmNew').onclick = () => startNewOrder();
  $('#hmOpen').onclick = () => { HOME_VIEW = 'recent'; renderHome(); };
  $('#hmFind').onclick = () => { HOME_VIEW = 'find'; renderHome(); setTimeout(() => $('#hfFile') && $('#hfFile').focus(), 30); };
  const panel = $('#hmPanel'); const wire = () => panel.querySelectorAll('[data-hopen]').forEach(r => { r.onclick = () => openLetter(r.dataset.hopen); r.onkeydown = e => { if (e.key === 'Enter') openLetter(r.dataset.hopen); }; });
  if (HOME_VIEW === 'recent') {
    const recent = all.slice().sort((a, b) => String(b.saved || b.created || '').localeCompare(String(a.saved || a.created || ''))).slice(0, 10);
    panel.innerHTML = `<h3>Last 10 orders</h3><p class="help">Most recently worked on first. Click a row to open it.</p>${homeRows(recent, 'No orders yet. Click <b>New order</b> to start one.')}`;
  } else {
    panel.innerHTML = `<h3>Search all files</h3>
      <form class="hmfind" id="hmFindForm"><label>File number<input id="hfFile" type="search" placeholder="e.g. Bath1729"></label><label>Address<input id="hfAddr" type="search" placeholder="e.g. 1729 Bath"></label><label>Borrower<input id="hfBorr" type="search" placeholder="last name"></label><button type="submit" class="btn primary">Search</button></form>
      <p class="help">Fill in one, two or all three boxes – an order has to match every box you fill. Leave them all empty and click Search to list every order. Delivered and closed orders are included.</p><div id="hfOut"></div>`;
    const go = e => { if (e) e.preventDefault();
      const norm = v => String(v || '').toLowerCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
      const qf = norm($('#hfFile').value), qa = norm($('#hfAddr').value), qb = norm($('#hfBorr').value);
      const hits = all.filter(o => (!qf || norm(o.fileNo).replace(/\s/g, '').includes(qf.replace(/\s/g, ''))) && (!qa || norm(o.address).includes(qa)) && (!qb || norm(o.borrower).includes(qb)))
        .sort((a, b) => String(b.orderDate || b.created || '').localeCompare(String(a.orderDate || a.created || '')));
      $('#hfOut').innerHTML = `<p class="help"><b>${hits.length}</b> order${hits.length === 1 ? '' : 's'} found.</p>` + homeRows(hits, 'No order matches. Check the spelling, or fill in fewer boxes.'); wire(); };
    $('#hmFindForm').onsubmit = go;
  }
  wire();
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
</div>${addrRowHTML('wz_', readAddr('f_'))}
      <p class="help" id="wzFileNote"></p>
      <p class="help">Type the street address (with the unit, e.g. #3). City and ZIP: pick them, or leave them for the CRS report to fill in the USPS form with the ZIP+4. The address is used to check that every document you upload is for this property.</p>
      ${q('letter', 'Engagement letter', [['client', 'The client sent one (lender / AMC order)'], ['mine', 'I will write one']])}
      ${q('form', 'Report form', [['uad36', 'UAD 3.6 (Traditional)'], ['uad26', 'UAD 2.6'], ['gpar', 'GPAR'], ['other', 'Other']])}
      ${q('purchase', 'Is this a purchase?', [['yes', 'Yes'], ['no', 'No']])}
      ${q('listed', 'Is the property listed now, or was it in the last 12 months?', [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']])}
      <div class="row"><button type="button" class="btn primary" id="wzNext1">Next: documents →</button><button type="button" class="btn ghost" id="wzCancel">Cancel</button></div></section>`;
    const sync = () => { $('#f_fileNo').value = $('#wzFile').value; { const v = readAddr('wz_'); writeAddr('f_', v); $('#f_address').value = joinAddr(v); } update(); };
    $('#wzFile').oninput = () => { w.fileTyped = true; sync(); };
    const addrIn = () => { if (!w.fileTyped || !$('#wzFile').value.trim()) { const sug = suggestFileNo($('#wz_street').value); $('#wzFile').value = sug; $('#wzFileNote').textContent = sug ? 'Made from your rule: street letters + house number' + (/-[2-9]\d*$/.test(sug) ? ' – you have appraised this property before in the assistant, so this is report ' + sug.split('-').pop() : '') + '. Change it if needed.' : ''; } sync(); };
    wireAddr('wz_', () => { addrIn(); });
    box.querySelectorAll('[data-wq]').forEach(b => b.onclick = () => { w[b.dataset.wq] = b.dataset.v; if (b.dataset.wq === 'form') { $('#f_reportForm').value = b.dataset.v; cur.formPicked = true; syncVisibility(); } renderWizard(); });
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
    <h4>Filled in</h4><table class="facts">${facts.map(r => (/⚠|not the same/.test(r[0] + r[1]) ? `<tr class="warnTxt"><th class="warnTxt">${h(r[0].includes('⚠') ? r[0] : '⚠ ' + r[0])}</th><td>${h(r[1])}</td></tr>` : `<tr><th><b class="ck">✓</b> ${h(r[0])}</th><td>${h(r[1])}</td></tr>`)).join('')}${fill.filter(x => !facts.some(r => r[0] === x[0])).map(x => (/⚠|not the same/.test(x[0] + x[1]) ? `<tr class="warnTxt"><th class="warnTxt">${h(String(x[0]).includes('⚠') ? x[0] : '⚠ ' + x[0])}</th><td>${h(String(x[1]))}</td></tr>` : `<tr><th><b class="ck">✓</b> ${h(x[0])}</th><td>${h(String(x[1]))}</td></tr>`)).join('')}</table>
    ${need.length ? `<p class="help warnTxt"><b>Still needed:</b> ${h(need.join(', '))}.</p>` : ''}
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
