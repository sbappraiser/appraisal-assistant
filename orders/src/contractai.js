/* =====================================================================
   Read the whole contract packet together with Claude (her request, Oct 22 2026)
   "It would need to read them all together to follow the negotiations, final sales price, final signature,
   combined page count over 3 documents."
   Every Purchase contract / Counter offer / Addendum / Leaseback document in the order goes in ONE request
   (the same plan, redaction and picture rules as the permit reader – pbMakePlan / pbClaude in permitsai.js).
   Result: cur.contractPacket {at, model, files, mode, docs[], steps[], final{}, flags[], summary, totalPages}.
   Nothing goes into the report by itself: she clicks Accept on each final term (it becomes an accepted fact
   on the purchase contract, like any other), "Use these parts" for the parts sentence, and "Use as 20.011".
   ===================================================================== */
const CB_TYPES = ['contract', 'counter', 'addendum', 'leaseback'];
const CB = { plan: null, busy: false, show: true };
const cbDocs = () => ((cur && cur.docs) || []).filter(d => CB_TYPES.includes(d.type));
const cbMain = () => { const L = cbDocs(); return L.find(d => d.type === 'contract') || L[0] || null; };
const CB_KIND = { contract: 'Purchase agreement', counter: 'Seller counter offer', addendum: 'Addendum', leaseback: 'Lease agreement' };
const CB_FINAL = [['price', 'Final negotiated sales price'], ['acceptDate', 'Acceptance date (last signature)'], ['coe', 'Close of escrow'], ['credits', 'Credits / concessions to the buyer'],
  ['personal', 'Personal property included'], ['excluded', 'Excluded items'], ['leaseback', 'Leaseback / rent-back'], ['loanCont', 'Loan contingency'], ['apprCont', 'Appraisal contingency'],
  ['buyerBroker', 'Buyer’s broker: who pays, % or amount'], ['exch1031', '1031 exchange'], ['entity', 'Signing for an entity'], ['special', 'Court-ordered, estate, trust or atypical terms'],
  ['written', 'Terms written in'], ['addenda', 'Counters and addenda – summary']];
const CB_SHAPE = `{"documents":[{"file":"file name","firstPage":1,"lastPage":17,"kind":"Purchase agreement|Seller counter offer|Buyer counter offer|Addendum|Lease agreement|1031 exchange agreement|Agent/broker disclosures|Other disclosures|Other","number":"e.g. SCO #1, BCO #1, Addendum #2 or empty","date":"YYYY-MM-DD or empty","from":"Buyer|Seller|Both|","price":"price stated in it, or empty","changes":"what it changes, short","signedBy":"Buyer|Seller|Both|Not signed","signedDates":"the signature dates as written","accepted":"Yes|No|Not stated"}],
"steps":[{"date":"YYYY-MM-DD or as written","who":"Buyer|Seller","what":"offer / counter / acceptance / addendum – short","price":"","file":"","page":1}],
"final":{"price":{"v":"","file":"","page":1},"acceptDate":{"v":"","file":"","page":1},"coe":{"v":"","file":"","page":1},"credits":{"v":"","file":"","page":1},"personal":{"v":"","file":"","page":1},"excluded":{"v":"","file":"","page":1},"leaseback":{"v":"","file":"","page":1},"loanCont":{"v":"Yes – … / No","file":"","page":1},"apprCont":{"v":"","file":"","page":1},"buyerBroker":{"v":"","file":"","page":1},"exch1031":{"v":"","file":"","page":1},"entity":{"v":"","file":"","page":1},"special":{"v":"","file":"","page":1},"written":{"v":"","file":"","page":1},"addenda":{"v":"one sentence: each counter and addendum in order and what it changed","file":"","page":1}},
"totalPages":0,"flags":[{"text":"","file":"","page":1}],"summary":""}`;
const CB_RULES = `Rules: read every file together as ONE purchase packet and follow the negotiation in date order: the offer, each seller and buyer counter offer, each addendum, and which one was finally accepted and signed by both sides.
- The final negotiated price is the price in the last document both sides signed (a later counter replaces an earlier price). Say which file and page.
- The acceptance date is the date of the LAST signature that made the agreement binding (the final acceptance), not the offer date.
- Count the pages of every file; totalPages is the sum. List the documents in the packet in order, with their first and last page in their own file.
- Report only what the pages say – never guess. Leave a value empty when it is not stated. Money as $1,234,000. Dates as YYYY-MM-DD when the date is clear.
- Flags: anything the appraiser must check – a counter not signed by both sides, price or terms that conflict between documents, missing pages or signatures, seller credits, personal property, leaseback, non-arm's-length signs, entity or trust signers, a different property address.
- summary: a draft for the appraiser in this layout, plain sentences, about 120–220 words: "ANALYSIS OF THE SALES CONTRACT" then "The client uploaded a [N]-page document which contains a purchase contract, [n] seller counter offers, [n] buyer counter offers and [n] addendums." Then the negotiation in one or two sentences, the final negotiated sales price and acceptance date, contingencies, close of escrow, personal property, credits, leaseback and other terms, and end with "All other terms appear to be fairly typical." Use [brackets] for anything the appraiser must fill in.`;

async function cbSend() {
  if (CB.busy) return; CB.busy = true; const btn = $('#cbGo'); const say = t => { if (btn) btn.textContent = t; };
  try {
    const plan = CB.plan; const pdfjs = await loadPdfJs(); const pics = [];
    for (const f of plan) { if (f.skip || !(f.imgs || []).length) continue; const rec = await ODB.get('docs', f.d.id); const pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
      for (const n of f.imgs) { say(`Preparing pictures… ${pics.length + 1}`); const cv = await pbPageJpeg(pdf, n); pics.push({ file: f.d.name, n, data: cv.toDataURL('image/jpeg', 0.72).split(',')[1] }); } }
    const texts = []; let t0 = ''; for (const f of plan) { if (f.skip) continue; t0 += `\n##### FILE: ${f.d.name} (${f.pages || '?'} pages; filed as ${DOC_LABEL[f.d.type] || f.d.type}) #####`; for (const p of f.text) { const block = `\n=== ${f.d.name} – page ${p.n} ===\n${p.t}`; if (t0.length + block.length > PB_MAX_TEXT && t0) { texts.push(t0); t0 = ''; } t0 += block; } } if (t0) texts.push(t0);
    const rounds = []; const n = Math.max(1, Math.ceil(pics.length / PB_MAX_IMG), texts.length);
    for (let i = 0; i < n; i++) rounds.push({ text: texts[i] || '', pics: pics.slice(i * PB_MAX_IMG, (i + 1) * PB_MAX_IMG) });
    const f0 = readForm(); const subj = `Subject property: ${f0.address || '(address not entered)'}${f0.apn ? ' · APN ' + f0.apn : ''}. Files in the packet: ${plan.filter(f => !f.skip).map(f => `${f.d.name} (${f.pages || '?'} pages)`).join('; ')}.`;
    const sys = 'You read California residential purchase contract packets (C.A.R. RPA, counter offers, addenda) for a residential appraiser and report exactly what they say, with file names and page numbers. Reply with JSON only.';
    const results = [];
    for (let i = 0; i < rounds.length; i++) { const R = rounds[i]; say(rounds.length > 1 ? `Claude is reading part ${i + 1} of ${rounds.length}…` : 'Claude is reading the whole packet…');
      const content = [{ type: 'text', text: subj }];
      if (R.text) content.push({ type: 'text', text: 'Contract packet (readable pages):' + R.text });
      R.pics.forEach(p => { content.push({ type: 'text', text: `=== ${p.file} – page ${p.n} (scanned picture) ===` }); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.data } }); });
      content.push({ type: 'text', text: `${rounds.length > 1 ? `This is part ${i + 1} of ${rounds.length} of the packet. ` : 'These are all the files of the purchase packet. '}\n${CB_RULES}\nAnswer with JSON only, in this form: ${CB_SHAPE}` });
      results.push(await pbClaude(content, 8000, sys)); }
    let out = results[0] || {};
    if (results.length > 1) { say('Claude is putting the parts together…');
      out = await pbClaude([{ type: 'text', text: `${subj}\n\nThe packet was read in ${results.length} parts. Here is what each part found:\n${results.map((r, i) => `--- part ${i + 1} ---\n${JSON.stringify(r)}`).join('\n')}\n\nMerge them into one answer for the whole packet.\n${CB_RULES}\nAnswer with JSON only, in this form: ${CB_SHAPE}` }], 8000, sys); }
    const sentFiles = plan.filter(f => !f.skip && ((f.text || []).length || (f.imgs || []).length)).map(f => f.d.name);
    const pagesSum = plan.filter(f => !f.skip).reduce((a, f) => a + (f.pages || 0), 0);
    cur.contractPacket = { at: new Date().toISOString(), model: aiModel(), files: sentFiles, mode: cur.aiUse === 'Redacted' ? 'redacted' : 'full', rounds: rounds.length,
      docs: (out.documents || []).filter(x => x && (x.file || x.kind)), steps: (out.steps || []).filter(x => x && x.what), final: out.final || {}, flags: (out.flags || []).filter(x => x && x.text),
      summary: String(out.summary || ''), totalPages: pagesSum || +out.totalPages || null, used: {} };
    (cur.aiLog = cur.aiLog || []).push({ at: cur.contractPacket.at, doc: 'Contract packet (' + sentFiles.length + ' files)', pages: [], mode: cur.contractPacket.mode, model: aiModel(), items: cur.contractPacket.docs.length });
    CB.plan = null; CB.show = true; saveLetter(true, true); renderDocs();
    toast(`Claude read the contract packet together: ${sentFiles.length} files, ${cur.contractPacket.totalPages || '?'} pages`, 6000);
  } catch (e) { console.error(e); toast('Not sent or not read: ' + (e.message || e), 7000); say('Try again'); }
  CB.busy = false;
}

/* her click: one final term → an accepted fact on the purchase contract (fills the UAD 3.6 sales contract boxes and the 20.011 draft) */
function cbAccept(key, value) {
  const P = cur.contractPacket, m = cbMain(); if (!m || !value) return; const F = P.final[key] || {}; const C = checkFor('contract');
  /* her packet answer replaces what was accepted for this line from reading the contract alone (e.g. the offer price) */
  const old = (cur.facts || []).filter(f => f.docId === m.id && f.key === key); cur.facts = (cur.facts || []).filter(f => !old.includes(f));
  P.replaced = P.replaced || {}; const was = old.filter(f => f.by !== 'packet' && f.value !== value).map(f => f.value); if (was.length) P.replaced[key] = was;
  const U = cur.uad = cur.uad || {}; ({ price: ['price'], acceptDate: ['cdate'], personal: ['pp'], credits: ['conc', 'concAmt'] }[key] || []).forEach(k => { delete U[k]; });
  const f = { id: uid(), docId: m.id, doc: m.name, type: 'contract', key, label: (C.items.find(x => x[0] === key) || [, key])[1], value, page: F.page || null, by: 'packet', from: F.file || '', at: new Date().toISOString() };
  cur.facts.push(f); markFilled(f, 'contract', key, value); P.used[key] = value; saveLetter(true, true);
}
function cbUseParts() {
  const P = cur.contractPacket, m = cbMain(); if (!m) return; cur.review = cur.review || {}; const rv = cur.review[m.id] = cur.review[m.id] || { sugg: [] };
  const kinds = new Set(PART_KINDS); rv.parts = (P.docs || []).map(d => ({ kind: kinds.has(d.kind) ? d.kind : 'Other', pages: d.firstPage && d.lastPage ? `${d.firstPage}-${d.lastPage}` : '', file: d.file || '' }));
  rv.packetTotal = P.totalPages || null; saveLetter(true, true);
  toast(partsSentence(rv.parts, rv.packetTotal) || 'Parts saved on the purchase contract', 8000);
}

function cbHTML(P) {
  const d = x => x ? h(/^\d{4}-\d\d-\d\d$/.test(x) && G.showDate ? G.showDate(x) : x) : '';
  const src = o => o && o.file ? `<small class="muted">${h(o.file)}${o.page ? ', p. ' + h(o.page) : ''}</small>` : '';
  const m = cbMain(); const rv = m && cur.review && cur.review[m.id];
  const ps = partsSentence((P.docs || []).map(x => ({ kind: PART_KINDS.includes(x.kind) ? x.kind : 'Other', pages: x.firstPage && x.lastPage ? `${x.firstPage}-${x.lastPage}` : '' })), P.totalPages);
  return `<h4>Contract packet <span class="opt">read together by Claude ${h(new Date(P.at).toLocaleDateString())} – ${P.files.length} file${P.files.length === 1 ? '' : 's'}, ${P.totalPages || '?'} pages${P.mode === 'redacted' ? ' (redacted)' : ''} – check it against the documents</span></h4>
    <div class="tableWrap"><table class="facts cbt"><tr><th>Document</th><th>Date</th><th>From</th><th>Price</th><th>What it changes</th><th>Signed</th><th>Pages</th></tr>
    ${(P.docs || []).map(x => `<tr class="${/not signed/i.test(x.signedBy || '') || /^No$/i.test(x.accepted || '') ? 'warnRow' : ''}"><td><b>${h(x.kind || '')}</b>${x.number ? ' ' + h(x.number) : ''}<br><small class="muted">${h(x.file || '')}</small></td><td>${d(x.date)}</td><td>${h(x.from || '')}</td><td>${h(x.price || '')}</td><td>${h(x.changes || '')}</td><td>${h(x.signedBy || '')}${x.signedDates ? '<br><small>' + h(x.signedDates) + '</small>' : ''}</td><td>${x.firstPage ? h(x.firstPage) + '–' + h(x.lastPage || '') : ''}</td></tr>`).join('')}</table></div>
    <p class="help">${h(ps)} <button type="button" class="btn ghost small" id="cbParts">Use these parts</button>${rv && rv.packetTotal ? ' <span class="chip ok">✓ parts used on the purchase contract</span>' : ''}</p>
    ${(P.steps || []).length ? `<h4>The negotiation</h4><ol class="cbsteps">${P.steps.map(s => `<li><b>${d(s.date)}</b> ${h(s.who || '')}: ${h(s.what || '')}${s.price ? ' – ' + h(s.price) : ''} ${src(s)}</li>`).join('')}</ol>` : ''}
    <h4>Final terms <span class="opt">Accept puts it on the purchase contract (UAD 3.6 sales contract boxes and the 20.011 draft) – edit first if needed</span></h4>
    <table class="facts cbfinal">${CB_FINAL.map(([k, l]) => { const o = P.final[k] || {}; const v = String(o.v || '').trim(); if (!v) return ''; const used = P.used && P.used[k];
      const rep = P.replaced && P.replaced[k] ? `<br><small class="muted">replaced what you had accepted before: ${h(P.replaced[k].join('; '))}</small>` : '';
      return `<tr><th>${h(l)}</th><td><input data-cbv="${k}" value="${h(used || v)}"> ${src(o)}${rep}</td><td>${used ? '<span class="chip ok">✓ accepted</span>' : ''}<button type="button" class="btn small" data-cbacc="${k}">${used ? 'Accept again' : 'Accept'}</button></td></tr>`; }).join('')}</table>
    ${P.flags.length ? `<h4>To check</h4><ul>${P.flags.map(f => `<li>${h(f.text)} ${src(f)}</li>`).join('')}</ul>` : ''}
    ${P.summary ? `<label>Draft 20.011 Sales contract analysis <span class="opt">Claude's wording – read and edit it; ${P.summary.length.toLocaleString()} of 5,000 characters</span><textarea id="cbSum" rows="7">${h(P.summary)}</textarea></label>
      <div class="row"><button type="button" class="btn small" id="cbUseSum">Use as 20.011</button><button type="button" class="btn ghost small" id="cbCopy">Copy</button><button type="button" class="btn ghost small" id="cbHide">Hide</button></div>` : '<div class="row"><button type="button" class="btn ghost small" id="cbHide">Hide</button></div>'}`;
}
async function renderCtBatch() {
  const box = $('#ctBatch'); if (!box || !cur) return; const docs = cbDocs(); const P = cur.contractPacket;
  if (!docs.length && !P) { box.innerHTML = ''; return; }
  const ai = cur.aiUse, ok = ai === 'Yes' || ai === 'Redacted', key = aiKey();
  const fresh = docs.filter(d => !(P && (P.files || []).includes(d.name)));
  let html = `<div class="permbatch"><b>Contract packet: ${docs.length} file${docs.length === 1 ? '' : 's'}</b> (${docs.map(d => h(DOC_LABEL[d.type] || d.type)).join(', ')}). `
    + (P ? `<span class="chip ok">✓ read together · ${h(new Date(P.at).toLocaleDateString())}</span>` : '') + (P && fresh.length ? `<span class="chip warn">${fresh.length} new file${fresh.length === 1 ? '' : 's'} not read yet – read the packet again</span>` : '') + ' ';
  if (!docs.length) html += '';
  else if (!ok) html += `To have Claude read the contract, counters and addenda together (negotiation, final price, last signature, total pages), set <b>AI use</b> on this order to Yes or Redacted (it is <b>${h(ai || 'not set')}</b>). Each file can still be read on its own with <b>Read</b>.`;
  else if (!key) html += 'Claude can read them together, but no Claude API key is saved yet: <b>Settings → Claude</b>.';
  else html += `<button type="button" class="btn small" id="cbPlan">${P ? 'Read the packet again' : 'Read the contract packet together with Claude'}</button> <span class="help">one request with the contract, every counter offer and addendum, so Claude can follow the negotiation</span>`;
  if (P && !CB.show) html += ` <button type="button" class="btn ghost small" id="cbShow">Show the contract packet</button>`;
  html += '</div>';
  if (CB.plan) { const L = CB.plan; const nT = L.reduce((a, f) => a + ((f.text || []).length), 0), nI = L.reduce((a, f) => a + ((f.imgs || []).length), 0), nH = L.reduce((a, f) => a + ((f.held || []).length), 0);
    html += `<div class="rdsendbar"><b>This is what goes to Claude${ai === 'Redacted' ? ' (redacted)' : ''}:</b>
      <table class="facts"><tr><th>File</th><th>Pages</th><th>As text</th><th>As pictures</th><th>Not sent</th></tr>${L.map(f => `<tr><td>${h(f.d.name)}</td><td>${f.pages || ''}</td><td>${f.skip ? '' : (f.text || []).length}</td><td>${f.skip ? '' : (f.imgs || []).length}</td><td>${f.skip ? h(f.skip) : (f.held || []).length ? 'scanned p. ' + f.held.join(', ') : ''}</td></tr>`).join('')}</table>
      ${nH ? `<p class="help"><b>${nH} scanned page${nH === 1 ? ' is' : 's are'} not sent</b>: on a Redacted order only the "- REDACTED" copy of a scanned file can go. C.A.R. forms often print as scrambled text – those pages are read best as pictures on a Yes order.</p>` : ''}
      <div class="row">${nT + nI ? `<button type="button" class="btn primary" id="cbGo">Send ${nT + nI} page${nT + nI === 1 ? '' : 's'} to Claude</button>` : '<span class="help">Nothing can be sent.</span>'}<button type="button" class="btn ghost" id="cbCancel">Cancel</button></div></div>`; }
  if (P && CB.show) html += cbHTML(P);
  box.innerHTML = html;
  const pl = $('#cbPlan'); if (pl) pl.onclick = async () => { pl.disabled = true; pl.textContent = 'Looking at the files…'; try { saveLetter(true, true); CB.plan = await pbMakePlan(cbDocs()); } catch (e) { console.error(e); toast('Could not open the contract files: ' + (e.message || e)); } renderCtBatch(); };
  const go = $('#cbGo'); if (go) go.onclick = () => cbSend();
  const cc = $('#cbCancel'); if (cc) cc.onclick = () => { CB.plan = null; renderCtBatch(); };
  const sh = $('#cbShow'); if (sh) sh.onclick = () => { CB.show = true; renderCtBatch(); };
  const hd = $('#cbHide'); if (hd) hd.onclick = () => { CB.show = false; renderCtBatch(); };
  const pa = $('#cbParts'); if (pa) pa.onclick = () => { cbUseParts(); renderCtBatch(); };
  box.querySelectorAll('[data-cbacc]').forEach(b => b.onclick = () => { const k = b.dataset.cbacc; const v = box.querySelector(`[data-cbv="${k}"]`).value.trim(); if (!v) { toast('Nothing to accept'); return; } cbAccept(k, v); renderFacts(); renderCtBatch(); toast('Accepted on the purchase contract'); });
  const sm = $('#cbSum'); if (sm) sm.onchange = () => { cur.contractPacket.summary = sm.value; saveLetter(true, true); };
  const us = $('#cbUseSum'); if (us) us.onclick = () => { cur.uad = cur.uad || {}; if (String(cur.uad.cmt || '').trim() && !confirm('Replace the 20.011 Sales contract analysis you already have with this draft?')) return; cur.uad.cmt = $('#cbSum').value; saveLetter(true, true); toast('It is the 20.011 Sales contract analysis now (open the purchase contract with Read to see or edit it)', 7000); };
  const cp = $('#cbCopy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText($('#cbSum').value); toast('Copied'); } catch (e) { toast('Could not copy'); } };
}
