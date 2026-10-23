/* =====================================================================
   Start page and the New order steps (her workflow, Oct 16 2026)
   Home: New order · Open an order · All files.
   New order: 1) file number, address, who writes the letter, purchase?, listed?
              2) upload by slot (client's letter, CRS, legal, MLS with history, contract packet, prelim, other)
              3) what was read and filled in, alerts (AI use, wrong address), then the letter or the order.
   ===================================================================== */
const WZ = { step: 1 };
let HOME_VIEW = 'recent';
const realOrder = o => !!(o.fileNo || (street(o) && !/^[A-Z]{2}$/.test(street(o))) || (o.docs || []).length || ((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name || o.borrower);
const clientOf = o => ((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name || '';
function homeRows(list, empty) {
  return list.length ? `<div class="tableWrap"><table class="hmtable"><thead><tr><th>File #</th><th>Address</th><th>Borrower</th><th>Client</th><th>Status</th><th>Due</th><th></th></tr></thead><tbody>${list.map(o => `<tr data-hopen="${o.id}" tabindex="0"><td class="num"><b>${h(o.fileNo || '—')}</b></td><td>${h(street(o) || '(no address yet)')}</td><td>${h(o.borrower || '')}</td><td>${h(clientOf(o))}</td><td><span class="pill">${h(o.stage || 'New')}</span></td><td class="num">${h(o.dueDate ? longDate(o.dueDate) : '')}</td><td class="acts"><button type="button" class="btn ghost small danger" data-hdel="${o.id}" aria-label="Delete ${h(o.fileNo || street(o) || 'this order')}">Delete</button></td></tr>`).join('')}</tbody></table></div>`
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
    <div class="hmpanel" id="hmPanel"></div>${letters.some(o => o.invDate || o.paidDate || (o.stage || '') === 'Delivered') ? '<div class="hmpanel" id="hmUnpaid"></div>' : ''}<div class="hmpanel" id="abCard"></div>`;
  if (typeof abRender === 'function') abRender();
  { const u = $('#hmUnpaid'); if (u) { u.innerHTML = unpaidHTML(); wireUnpaid(u); } }
  $('#hmNew').onclick = () => startNewOrder();
  $('#hmOpen').onclick = () => { HOME_VIEW = 'recent'; renderHome(); };
  $('#hmFind').onclick = () => { HOME_VIEW = 'find'; renderHome(); setTimeout(() => $('#hfFile') && $('#hfFile').focus(), 30); };
  const panel = $('#hmPanel'); const wire = () => { panel.querySelectorAll('[data-hopen]').forEach(r => { r.onclick = () => openLetter(r.dataset.hopen); r.onkeydown = e => { if (e.key === 'Enter' && e.target === r) openLetter(r.dataset.hopen); }; });
    panel.querySelectorAll('[data-hdel]').forEach(b => b.onclick = e => { e.stopPropagation(); armDelete(b, () => deleteOrder(b.dataset.hdel)); }); };
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
function reopenSteps() {   // her request, Oct 22 2026: a way back to the beginning of the New order steps for the order that is open
  if (!cur) return; cur = readForm(); const w = cur.wizard = cur.wizard || {};
  if (!w.letter) w.letter = $('#f_status').value === 'Client letter' ? 'client' : 'mine';
  if (!w.form) w.form = $('#f_reportForm').value;
  WZ.step = 1; WZ.shown = 0; showTab('new'); renderWizard();
}
function startNewOrder() {
  if (cur && hasContent(readForm())) saveLetter(true);
  cur = blankLetter(); cur.wizard = { letter: '', purchase: '', listed: '' }; writeForm(cur); render(); WZ.step = 1; showTab('new'); renderWizard(); setTimeout(() => $('#wzFile') && $('#wzFile').focus(), 50);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-wzdel]'); if (!b) return; e.preventDefault();   // remove a file right in the new-order steps (her request, Oct 19 2026)
  if (!b.dataset.armed) { b.dataset.armed = '1'; const t = b.textContent; b.textContent = 'Click again to remove'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t; } }, 3000); return; }
  removeDoc(b.dataset.wzdel).then(() => { if (typeof renderWizard === 'function' && document.getElementById('newBody') && !document.getElementById('newBody').closest('[hidden]')) renderWizard(); }); });
const SLOTS = [
  ['clientLetter', 'Client’s engagement letter or order', 'Read for the client, loan, due date, fee, form and AI wording.', w => w.letter === 'client'],
  ['crs', 'CRS Data property report', 'Fills the APN, owner, location and public-record facts (never beds, baths or square feet).', () => true],
  ['permitsCounty', 'County permit history (by parcel)', 'The CrystalViewer “Permit History by Parcel” printout: permits, zoning and parcel facts are read from it.', () => true],
  ['legal', 'Legal description', 'Only if it is a separate file – the prelim usually has it.', () => true],
  ['plat', 'Plat map (assessor parcel map)', 'An exhibit only – it goes into the report’s Site section (not read).', () => true],
  ['mls', 'MLS listing with its history', 'The subject’s listing and listing history (CSV export or printout).', w => w.listed === 'yes'],
  ['contract', 'Purchase contract, counter offers and addenda', 'Add every file – packets often come in several PDFs.', w => w.purchase === 'yes'],
  ['prelim', 'Preliminary title report', 'Easements, CC&R’s and the legal description are read from it.', () => true],
  ['deed', 'Deed (grant deed, trust transfer, quitclaim)', 'Vesting, the legal description and any rights not appraised (oil, gas, minerals) are read from it.', () => true],
  ['other', 'Other documents', 'Plans, permits, HOA documents, disclosures, leaseback … each is sorted by kind.', () => true],
];
function renderWizard() {
  const box = $('#newBody'); if (!box || !cur) return; const w = cur.wizard = cur.wizard || {}; const f = readForm();
  const steps = ['Order', 'Documents', 'Check'];
  const head = `<ol class="wzsteps">${steps.map((s, i) => `<li class="${WZ.step === i + 1 ? 'on' : WZ.step > i + 1 ? 'done' : ''}">${WZ.step > i + 1 ? `<button type="button" class="lnk" data-wzgo="${i + 1}" title="Go back to this step">${i + 1} · ${s}</button>` : `${i + 1} · ${s}`}</li>`).join('')}</ol>`;
  if (WZ.shown !== WZ.step) { WZ.shown = WZ.step; setTimeout(() => window.scrollTo(0, 0), 0); }   // each step opens at the top (Oct 22 2026 – step 2 opened scrolled down and looked empty)
  setTimeout(() => box.querySelectorAll('[data-wzgo]').forEach(b => b.onclick = () => { WZ.step = +b.dataset.wzgo; saveLetter(true); renderWizard(); }), 0);
  if (WZ.step === 1) {
    box.innerHTML = head + `<section class="mkcard"><div class="grid3"><label>File number<input id="wzFile" value="${h(f.fileNo)}" placeholder="your file number"></label>
</div>${addrRowHTML('wz_', readAddr('f_'))}
      <p class="help" id="wzFileNote"></p>
      <p class="help">Type the street address (with the unit, e.g. #3). City and ZIP: pick them, or leave them for the CRS report to fill in the USPS form with the ZIP+4. The address is used to check that every document you upload is for this property.</p>
      ${q('letter', 'Engagement letter', [['client', 'The client sent one (lender / AMC order)'], ['mine', 'I will write one']])}
      ${w.letter === 'mine' ? wzMineHTML() : ''}
      ${q('form', 'Report form format', [['uad36', 'UAD 3.6 (Traditional)'], ['uad26', 'UAD 2.6 (Legacy)'], ['gpar', 'GPAR'], ['other', 'Other']])}
      ${w.letter === 'mine' && !(TYPES[$('#f_type').value] || {}).uad ? '' : q('purchase', 'Is this a purchase?', [['yes', 'Yes'], ['no', 'No']])}
      ${q('listed', 'Is the property listed now, or was it in the last 12 months?', [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']])}
      <div class="row"><button type="button" class="btn primary" id="wzNext1">Next: documents →</button><button type="button" class="btn ghost" id="wzCancel">Cancel</button><span class="warnTxt" id="wzNeed1" role="alert"></span></div></section>`;
    const sync = () => { $('#f_fileNo').value = $('#wzFile').value; { const v = readAddr('wz_'); writeAddr('f_', v); $('#f_address').value = joinAddr(v); } update(); };
    $('#wzFile').oninput = () => { w.fileTyped = true; sync(); };
    const addrIn = () => { if (!w.fileTyped || !$('#wzFile').value.trim()) { const sug = suggestFileNo($('#wz_street').value); $('#wzFile').value = sug; $('#wzFileNote').textContent = sug ? 'Made from your rule: street letters + house number' + (/-[2-9]\d*$/.test(sug) ? ' – you have appraised this property before in the assistant, so this is report ' + sug.split('-').pop() : '') + '. Change it if needed.' : ''; } sync(); };
    wireAddr('wz_', () => { addrIn(); });
    box.querySelectorAll('[data-wq]').forEach(b => b.onclick = () => { w[b.dataset.wq] = b.dataset.v; if (b.dataset.wq === 'form') { $('#f_reportForm').value = b.dataset.v; cur.formPicked = true; cur.formNamePicked = false; syncVisibility(); } renderWizard(); });
    if (w.letter === 'mine') wzMineWire();
    $('#wzCancel').onclick = () => { showTab('home'); renderHome(); };
    $('#wzNext1').onclick = () => { if (!w.letter) { $('#wzNeed1').textContent = '↑ First choose who writes the engagement letter: “The client sent one” or “I will write one”.'; toast('Choose who writes the engagement letter'); return; }
      if (w.letter === 'client') { $('#f_status').value = 'Client letter'; } else { $('#f_status').value = 'Drafted'; cur.letterMode = 'mine'; }
      if (w.purchase === 'no' && $('#f_type').value === 'uadPurchase') { $('#f_type').value = 'uadOther'; applyTypeDefaults(); }
      if (w.listed === 'yes' && $('#f_listing').value === 'omit') $('#f_listing').value = 'listed';
      update(); saveLetter(true, true); WZ.step = 2; renderWizard(); };
    return;
  }
  if (WZ.step === 2) {
    const docs = f.docs || [];
    box.innerHTML = head + `<section class="mkcard"><h3>${h([f.fileNo, street(f)].filter(Boolean).join(' – ') || 'New order')}</h3>
      <div class="drop big wzAll" id="wzAll"><div><span class="eyebrow">Drop everything here</span><p class="help">You do not need a box for each file: drop them all at once and each one is sorted by what its first page says. The boxes below are your checklist – each shows what arrived. Everything is kept in this browser on this computer.</p></div><label class="btn primary">Choose files<input type="file" multiple id="wzAllFile" hidden></label></div>
      <div class="slots">${SLOTS.filter(([, , , show]) => show(w)).map(([k, title, help]) => { const mine = docs.filter(d => k === 'other' ? !SLOTS.some(s => s[0] !== 'other' && s[0] === d.type) : d.type === k);
        return `<div class="slot" data-slot="${k}"><div><b>${h(title)}</b><small>${h(help)}</small>${mine.length ? `<ul>${mine.map(d => `<li>${h(d.name)}${d.note ? ' – ' + h(d.note) : ''}${d.warn ? ` <span class="warnTxt">⚠ ${h(d.warn)}</span>` : ''} <button type="button" class="lnk danger" data-wzdel="${d.id}" title="Take this file out of the order">Remove</button></li>`).join('')}</ul>` : ''}</div>
          <label class="btn small">${mine.length ? 'Add more' : 'Choose files'}<input type="file" multiple data-slotfile="${k}" hidden></label></div>`; }).join('')}</div>
      <p class="help pre" id="wzStatus"></p>
      <div class="row"><button type="button" class="btn ghost" id="wzBack2">← Back</button><button type="button" class="btn primary" id="wzNext2">Next: check what was filled in →</button></div></section>`;
    box.querySelectorAll('[data-slot]').forEach(el => { const k = el.dataset.slot;
      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); }); el.addEventListener('dragleave', () => el.classList.remove('over'));
      el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); wzAdd(k, e.dataTransfer.files); }); });
    { const z = $('#wzAll'); ['dragover', 'dragleave', 'drop'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.toggle('over', ev === 'dragover'); if (ev === 'drop') wzAdd('other', e.dataTransfer.files); }));
      $('#wzAllFile').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; wzAdd('other', fs); }; }
    box.querySelectorAll('[data-slotfile]').forEach(i => i.onchange = () => { const fs = [...i.files]; i.value = ''; wzAdd(i.dataset.slotfile, fs); });
    $('#wzBack2').onclick = () => { WZ.step = 1; renderWizard(); };
    $('#wzNext2').onclick = () => { WZ.step = 3; saveLetter(true); renderWizard(); };
    return;
  }
  // step 3: what was found
  const fill = f.letterFill || []; const al = [];
  const V = { stop: ['No AI on this job', 'The client’s letter restricts AI (for example “no AI without prior authorization”), so this order is set to <b>No AI</b>. Nothing will be sent anywhere.'], look: ['AI only with confidential information removed', 'The letter limits sharing confidential or personal information but does not ban AI, so this order is set to <b>Yes – only with confidential information removed</b>.'], clear: ['AI allowed', 'Nothing in the letter limits AI or sharing of information, so this order is set to <b>Yes – no restriction</b>.'] };
  if (f.orderDoc && f.orderDoc.verdict) { const v = V[f.orderDoc.verdict];   /* her ask Oct 23 2026: show WHY, and let her answer right here */
    const hl = t => h(t).replace(new RegExp('\\b(' + ['confidential\\w*', 'non-?public', 'privacy', 'personal(?:ly)? identif\\w*', 'NPI', 'PII', 'third part\\w*', 'disclos\\w*', 'shall not', 'may not', 'must not', 'will not', 'without (?:the )?(?:prior )?(?:written )?consent', 'artificial intelligence', 'AI', 'machine learning', 'automated'].join('|') + ')\\b', 'gi'), '<mark>$1</mark>');
    const hits = (f.orderDoc.hits || []).slice(0, 3);
    const cur3 = f.aiUse === 'Yes' ? 'Yes – no restriction' : f.aiUse === 'No' ? 'No AI on this job' : f.aiUse === 'Redacted' ? 'Yes – only with confidential information removed' : 'not set';
    al.push(`<div class="alert ${f.orderDoc.verdict}"><b>${v[0]}</b><p>${v[1]}</p>${hits.length ? `<p><b>The wording that set it</b> (from ${h(f.orderDoc.name || 'the letter')}):</p>${hits.map(x => `<blockquote class="wzq-hit">${hl(x.t.length > 600 ? x.t.slice(0, 600) + '…' : x.t)}</blockquote>`).join('')}${(f.orderDoc.hits || []).length > 3 ? `<p class="help">${f.orderDoc.hits.length - 3} more marked on the order page.</p>` : ''}` : ''}
      <p><b>Your answer</b> (now: ${h(cur3)}):</p><div class="row"><button type="button" class="btn small${f.aiUse === 'Yes' ? ' primary' : ''}" data-wzai="Yes">Yes – no restriction (ordinary confidentiality wording)</button><button type="button" class="btn small${f.aiUse === 'Redacted' ? ' primary' : ''}" data-wzai="Redacted">Only with confidential information removed</button><button type="button" class="btn small${f.aiUse === 'No' ? ' primary' : ''}" data-wzai="No">No AI on this job</button></div></div>`); }
  (f.docs || []).filter(d => d.warn).forEach(d => al.push(`<div class="alert stop"><b>Check the property</b><p>${h(d.name)}: ${h(d.warn)}</p><p><button type="button" class="btn small danger" data-wzdel="${d.id}">Remove this file from the order</button> <small>if it belongs to another property or was added by mistake</small></p></div>`));
  const facts = [['File number', f.fileNo], ['Property', f.address], ['APN', f.apn], ['Owner of record', f.owner], ['Client', ((f.clients || [])[0] || {}).company || ((f.clients || [])[0] || {}).name], ['Assignment type', (TYPES[f.type] || {}).label], [((TYPES[f.type] || {}).dateLabels || ['Name of decedent'])[0], (TYPES[f.type] || {}).retro && f.decedent], [((TYPES[f.type] || {}).dateLabels || ['', 'Date of death'])[1], (TYPES[f.type] || {}).retro && f.dod && longDate(f.dod)], ['Purpose', (TYPES[f.type] || {}).purpose && f.purpose], ['Report due', f.dueDate && longDate(f.dueDate)], ['Fee', f.fee && '$' + f.fee], ['Loan number', f.loanNo], ['Borrower', f.borrower]].filter(r => r[1]);
  const need = []; if (!f.address) need.push('the property address'); if (w.letter === 'client' && !(f.docs || []).some(d => d.type === 'clientLetter')) need.push('the client’s engagement letter');
  if (!(f.docs || []).some(d => d.type === 'crs')) need.push('the CRS report'); if (w.purchase === 'yes' && !(f.docs || []).some(d => d.type === 'contract')) need.push('the purchase contract'); if (w.listed === 'yes' && !(f.docs || []).some(d => d.type === 'mls')) need.push('the MLS listing with history');
  { const T = TYPES[f.type] || {}; if (T.retro && !f.dod) need.push(((T.dateLabels || ['', 'Date of death'])[1]).toLowerCase()); if (w.letter === 'mine' && !((f.clients || [])[0] || {}).name && !((f.clients || [])[0] || {}).company) need.push('the client'); }
  if (!f.inspDate) need.push('the inspection date'); if (!f.aiUse) need.push('AI use on this job');
  const toRead = (f.docs || []).filter(d => ['contract', 'prelim', 'counter', 'addendum', 'leaseback', 'permitsPdf', 'condoQ', 'ccrs', 'hoaBudget', 'disclosures', 'budget'].includes(d.type));
  box.innerHTML = head + `<section class="mkcard"><h3>${h([f.fileNo, street(f)].filter(Boolean).join(' – ') || 'New order')}</h3>${al.join('')}
    <h4>Filled in</h4><table class="facts">${facts.map(r => (/⚠|not the same/.test(r[0] + r[1]) ? `<tr class="warnTxt"><th class="warnTxt">${h(r[0].includes('⚠') ? r[0] : '⚠ ' + r[0])}</th><td>${h(r[1])}</td></tr>` : `<tr><th><b class="ck">✓</b> ${h(r[0])}</th><td>${h(r[1])}</td></tr>`)).join('')}${fill.filter(x => !facts.some(r => r[0] === x[0])).map(x => (/⚠|not the same/.test(x[0] + x[1]) ? `<tr class="warnTxt"><th class="warnTxt">${h(String(x[0]).includes('⚠') ? x[0] : '⚠ ' + x[0])}</th><td>${h(String(x[1]))}</td></tr>` : `<tr><th><b class="ck">✓</b> ${h(x[0])}</th><td>${h(String(x[1]))}</td></tr>`)).join('')}</table>
    ${need.length ? `<p class="help warnTxt"><b>Still needed:</b> ${h(need.join(', '))}.</p>` : ''}
    ${toRead.length ? `<h4>Documents to read and summarize</h4><ul class="toread">${toRead.map(d => `<li>${h(DOC_LABEL[d.type] || d.type)}: ${h(d.name)} <button type="button" class="btn small" data-wzread="${d.id}">Read</button></li>`).join('')}</ul><p class="help">Prelims are summarized from their text; purchase contracts need you or Claude (C.A.R. forms cannot be read as text).</p>` : ''}
    <div class="row"><button type="button" class="btn ghost" id="wzBack3">← Back to documents</button>${w.letter === 'mine' ? '<button type="button" class="btn primary" id="wzLetter">Next: write my engagement letter →</button>' : ''}<button type="button" class="btn ${w.letter === 'mine' ? 'ghost' : 'primary'}" id="wzDone">Open the order</button></div></section>`;
  $('#wzBack3').onclick = () => { WZ.step = 2; renderWizard(); };
  box.querySelectorAll('[data-wzai]').forEach(b => b.onclick = () => { const v = b.dataset.wzai; document.querySelectorAll('input[name=aiUse]').forEach(r => { r.checked = r.value === v; }); cur = readForm(); cur.aiUse = v; cur.aiAuto = null; update(); saveLetter(true); renderWizard(); toast('AI use on this job: ' + b.textContent); });
  $('#wzDone').onclick = () => { saveLetter(true); showTab('letter'); window.scrollTo(0, 0); };
  const wl = $('#wzLetter'); if (wl) wl.onclick = () => { cur.letterMode = 'mine'; saveLetter(true); showTab('letter'); update(); setTimeout(() => { const c = document.querySelector('#clients'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }, 80); };
  box.querySelectorAll('[data-wzread]').forEach(b => b.onclick = () => openReader(b.dataset.wzread));
}
/* "I will write one": ask the assignment type, the dates it needs, the purpose and the client right here (her request, Oct 22 2026 –
   a date-of-death order went through the steps without asking for the client or the decedent). Each box writes straight into the order form. */
function wzMineHTML() {
  const T = TYPES[$('#f_type').value] || {}; const L = T.dateLabels || ['Name of decedent', 'Date of death'];
  const v = id => h(($('#' + id) || {}).value || '');
  return `<div class="wzmine"><label>Assignment type<select id="wz_type">${$('#f_type').innerHTML}</select></label>
    ${T.retro ? `<div class="grid2"><label>${h(L[0])}${['divorceRetro', 'otherRetro', 'taxAppeal'].includes($('#f_type').value) ? ' <span class="opt">optional</span>' : ''}<input id="wz_decedent" value="${v('f_decedent')}"></label><label>${h(L[1])}<input id="wz_dod" type="date" value="${v('f_dod')}"></label></div><p class="help">The effective date of value is the ${h(L[1].toLowerCase())}.</p>` : ''}
    ${T.purpose ? `<label>Purpose, in your words <span class="opt">finishes “to assist the Client in …”</span><input id="wz_purpose" value="${v('f_purpose')}"></label>` : ''}
    <span class="eyebrow">Client</span>
    <div class="grid2"><label>Name<input id="wz_c_name" list="clientNames" autocomplete="off" value="${v('c0_name')}" placeholder="start typing – saved clients pop up"></label><label>Company or firm <span class="opt">optional</span><input id="wz_c_company" list="clientCos" autocomplete="off" value="${v('c0_company')}"></label>
      <label>Street address<input id="wz_c_addr1" autocomplete="off" value="${v('c0_addr1')}"></label><label>City, state, ZIP<input id="wz_c_addr2" autocomplete="off" value="${v('c0_addr2')}"></label>
      <label>Phone<input id="wz_c_phone" autocomplete="off" value="${v('c0_phone')}"></label><label>Email<input id="wz_c_email" type="email" autocomplete="off" value="${v('c0_email')}"></label></div>
    <p class="help">Co-trustees, siblings and other intended users: add them on the Engagement letter page (+ Add another client).</p></div>`;
}
function wzMineWire() {
  const sel = $('#wz_type'); sel.value = $('#f_type').value;
  sel.onchange = () => { $('#f_type').value = sel.value; $('#f_type').dispatchEvent(new Event('change')); if ($('#f_status').value === 'Client letter') $('#f_status').value = 'Drafted'; cur.letterMode = 'mine'; renderWizard(); };
  [['wz_decedent', 'f_decedent'], ['wz_dod', 'f_dod'], ['wz_purpose', 'f_purpose'], ...CLIENT_KEYS.map(k => ['wz_c_' + k, 'c0_' + k])].forEach(([a, b]) => { const el = $('#' + a), to = $('#' + b); if (!el || !to) return;
    el.addEventListener('input', () => { to.value = el.value; update(); });
    el.addEventListener('change', () => { if (a === 'wz_c_name' || a === 'wz_c_company') { const x = contacts.find(c => (c[a.slice(5)] || '').trim().toLowerCase() === el.value.trim().toLowerCase()); if (x) { CLIENT_KEYS.forEach(k => { const t = $('#c0_' + k), s2 = $('#wz_c_' + k); if (t) t.value = x[k] || ''; if (s2) s2.value = x[k] || ''; }); } } to.value = el.value; update(); }); });
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
