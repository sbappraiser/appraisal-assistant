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
const CB_ST = [['open', 'Still to check'], ['ok', 'Checked – fine'], ['asked', 'Asked the agent / escrow'], ['report', 'Addressed in the report'], ['na', 'Not an issue']];
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
"final":{"price":{"v":"","file":"","page":1},"acceptDate":{"v":"","file":"","page":1},"coe":{"v":"","file":"","page":1},"credits":{"v":"","file":"","page":1},"personal":{"v":"EVERY item included in the sale, comma-separated – each checked box and each written-in item","file":"","page":1},"excluded":{"v":"EVERY item excluded, comma-separated","file":"","page":1},"leaseback":{"v":"","file":"","page":1},"loanCont":{"v":"Yes – … / No","file":"","page":1},"apprCont":{"v":"","file":"","page":1},"buyerBroker":{"v":"","file":"","page":1},"exch1031":{"v":"","file":"","page":1},"entity":{"v":"","file":"","page":1},"special":{"v":"","file":"","page":1},"written":{"v":"","file":"","page":1},"addenda":{"v":"one sentence: each counter and addendum in order and what it changed","file":"","page":1}},
"totalPages":0,"flags":[{"text":"","file":"","page":1}],"summary":""}`;
const CB_RULES = `Rules: read every file together as ONE purchase packet and follow the negotiation in date order: the offer, each seller and buyer counter offer, each addendum, and which one was finally accepted and signed by both sides.
- The final negotiated price is the price in the last document both sides signed (a later counter replaces an earlier price). Say which file and page.
- The acceptance date is the date of the LAST signature that made the agreement binding (the final acceptance), not the offer date.
- Count the pages of every file; totalPages is the sum. List the documents in the packet in order, with their first and last page in their own file.
- Items included and excluded (on the C.A.R. RPA the "Items included in and excluded from sale" paragraph, plus any counter offer or addendum that adds or removes items): look at the page PICTURES – list EVERY box that is checked (X or ✓) and every item written in, one by one, and nothing that is not checked. Do the same for the excluded items. A later counter or addendum changes the list.
- Report only what the pages say – never guess. Leave a value empty when it is not stated. Money as $1,234,000. Dates as YYYY-MM-DD when the date is clear.
- Flags: anything the appraiser must check – a counter not signed by both sides, price or terms that conflict between documents, missing pages or signatures, seller credits, personal property, leaseback, non-arm's-length signs, entity or trust signers, a different property address.
- summary: the appraiser's own style (her rule, Oct 22 2026): NO play-by-play of the negotiation – only the final numbers, the final terms and the items changed from the pre-printed terms. Plain sentences, about 90–170 words, in this order:
  1. "The client uploaded a [N]-page document which contains a purchase contract, [n] seller counter offer(s) (say "seller multiple counter offer" when it is one), [n] buyer counter offer(s) and [n] addendums."
  2. "The final negotiated sales price is $[price]. The contract was signed on [date of the last signature]." (add "[confirm acceptance was within the expiration time]" only when the timing is in doubt)
  3. The final terms that differ from the pre-printed form, short: close of escrow, possession / rent-back, contingencies (loan, appraisal, investigation – with days), and anything written in.
  4. "Personal property included: [every item]." then always "Personal property is not included in this appraisal." (or "No personal property is included." when none).
  5. Credits: "There are no reported seller credits to the buyer;" or the amount; then who pays the buyer's broker.
  6. A leaseback or rent-back with its days and rent, and whether the RLAS form was received, e.g. "Seller leaseback is 59 days after close of escrow, however a RLAS form was not received."
  7. End with "All other terms appear to be fairly typical."
  Her model (match its tone and length): "The client uploaded a 29-page document which contains a purchase contract, 1 seller multiple counter offer, 1 buyer counter offer and 0 addendums. The final negotiated sales price is $1,655,000. The contract was signed on 10/13/2026. Escrow at 21 days but the seller can stay 59 days after close of escrow at no charge. There is no loan contingency (80% conventional loan in the RPA); there is a 14-day appraisal contingency at purchase price and a 7-day investigation contingency. Personal property included: the appliances (stove/oven, refrigerator, wine refrigerator, washer, dryer, dishwasher, microwave), video doorbell, security cameras and security system, smart home devices, wall-mounted brackets, bathroom mirrors, EV charging equipment and potted trees/shrubs, with only existing items conveying. Personal property is not included in this appraisal. There are no reported seller credits to the buyer; the seller pays the buyer's broker 2.5%. Seller leaseback is 59 days after close of escrow, however a RLAS form was not received. All other terms appear to be fairly typical."
  Use [brackets] only for what the appraiser must still confirm.`;

const cbScrambled = t => { t = String(t || ''); return t.length > 200 && (t.match(/[A-Za-z]{3,}/g) || []).join('').length / t.length < 0.25; };   // C.A.R. form fonts print as scrambled text
async function cbClaude(content, system) {
  const call = async (c, max) => { const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: aiModel(), max_tokens: max, system, messages: [{ role: 'user', content: c }] }) });
    let j = null; try { j = await res.json(); } catch (e) {} if (!res.ok) throw new Error((j && j.error && j.error.message) || 'Claude answered with an error (' + res.status + (res.status === 413 ? ' – too many pages at once' : '') + ')');
    return { txt: (j.content || []).filter(x => x.type === 'text').map(x => x.text).join(''), cut: j.stop_reason === 'max_tokens' }; };
  const parse = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  let r = await call(content, 16000); try { if (!r.cut) return parse(r.txt); } catch (e) {}
  r = await call([...content, { type: 'text', text: 'Your last answer was too long and was cut off. Answer again with shorter "changes" and "what" text and a summary under 200 words. JSON only.' }], 16000);
  try { return parse(r.txt); } catch (e) { throw new Error('Claude’s answer could not be read (it was cut off or not in the expected form). Try again; if it happens again, tell Claude in the chat.'); } }
async function cbSend(pre) {   // pre = { plan, pics } from the packet redaction screen (redacted pictures only)
  if (CB.busy) return; CB.busy = true; const btn = $(pre ? '#cbRedGo' : '#cbGo'); const say = t => { if (btn) btn.textContent = t; };
  try {
    const plan = pre ? pre.plan : CB.plan; const pics = pre ? pre.pics : []; const pdfjs = pre ? null : await loadPdfJs();
    if (!pre) for (const f of plan) { if (f.skip || !(f.imgs || []).length) continue; const rec = await ODB.get('docs', f.d.id); const pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
      for (const n of f.imgs) { say(`Preparing pictures… ${pics.length + 1}`); const cv = await pbPageJpeg(pdf, n); pics.push({ file: f.d.name, n, data: cv.toDataURL('image/jpeg', 0.72).split(',')[1] }); } }
    const texts = []; let t0 = ''; for (const f of plan) { if (f.skip) continue; t0 += `\n##### FILE: ${f.d.name} (${f.pages || '?'} pages; filed as ${DOC_LABEL[f.d.type] || f.d.type}) #####`; for (const p of f.text) { if (cbScrambled(p.t) && (f.imgs || []).includes(p.n)) continue; const block = `\n=== ${f.d.name} – page ${p.n} ===\n${p.t}`; if (t0.length + block.length > PB_MAX_TEXT && t0) { texts.push(t0); t0 = ''; } t0 += block; } } if (t0) texts.push(t0);
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
      results.push(await cbClaude(content, sys)); }
    let out = results[0] || {};
    if (results.length > 1) { say('Claude is putting the parts together…');
      out = await pbClaude([{ type: 'text', text: `${subj}\n\nThe packet was read in ${results.length} parts. Here is what each part found:\n${results.map((r, i) => `--- part ${i + 1} ---\n${JSON.stringify(r)}`).join('\n')}\n\nMerge them into one answer for the whole packet.\n${CB_RULES}\nAnswer with JSON only, in this form: ${CB_SHAPE}` }], sys); }
    const sentFiles = plan.filter(f => !f.skip && ((f.text || []).length || (f.imgs || []).length)).map(f => f.d.name);
    const pagesSum = plan.filter(f => !f.skip).reduce((a, f) => a + (f.pages || 0), 0);
    cur.contractPacket = { at: new Date().toISOString(), model: aiModel(), files: sentFiles, mode: cur.aiUse === 'Redacted' ? 'redacted' : 'full', rounds: rounds.length,
      docs: (out.documents || []).filter(x => x && (x.file || x.kind)), steps: (out.steps || []).filter(x => x && x.what), final: out.final || {}, flags: (out.flags || []).filter(x => x && x.text),
      summary: String(out.summary || ''), totalPages: pagesSum || +out.totalPages || null, used: {} };
    (cur.aiLog = cur.aiLog || []).push({ at: cur.contractPacket.at, doc: 'Contract packet (' + sentFiles.length + ' files)', pages: [], mode: cur.contractPacket.mode, model: aiModel(), items: cur.contractPacket.docs.length });
    CB.plan = null; CB.show = true; CB.err = ''; if (pre) cbRedClose(); saveLetter(true, true); renderDocs();
    toast(`Claude read the contract packet together: ${sentFiles.length} files, ${cur.contractPacket.totalPages || '?'} pages`, 6000);
  } catch (e) { console.error(e); CB.err = String(e.message || e); toast('Not sent or not read: ' + CB.err, 9000); say('Try again'); renderCtBatch(); }
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
      return `<tr><th>${h(l)}</th><td>${(used || v).length > 60 ? `<textarea data-cbv="${k}" rows="${Math.min(6, 1 + Math.ceil((used || v).length / 70))}">${h(used || v)}</textarea>` : `<input data-cbv="${k}" value="${h(used || v)}">`} ${src(o)}${rep}</td><td>${used ? '<span class="chip ok">✓ accepted</span>' : ''}<button type="button" class="btn small" data-cbacc="${k}">${used ? 'Accept again' : 'Accept'}</button></td></tr>`; }).join('')}</table>
    ${P.flags.length ? `<h4>To check <span class="opt">answer each one – your notes stay with the order; “Add to 20.011” puts your answer at the end of the draft below</span></h4><ol class="cbflags">${P.flags.map((f, i) => { const a = (P.answers || {})[i] || {};
      return `<li class="${a.st && a.st !== 'open' ? 'done' : ''}"><div>${h(f.text)} ${src(f)}</div><div class="row"><select data-cbst="${i}">${CB_ST.map(([k, l]) => `<option value="${k}" ${(a.st || 'open') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <textarea data-cbans="${i}" rows="2" placeholder="Your answer or what you found (for example: verified with the listing agent – COE is 21 days; seller rent-back is free, no RLAS)">${h(a.t || '')}</textarea><button type="button" class="btn ghost small" data-cbadd="${i}">Add to 20.011</button></div></li>`; }).join('')}</ol>` : ''}
    ${P.summary ? `<label>Draft 20.011 Sales contract analysis <span class="opt">Claude's wording – read and edit it; ${P.summary.length.toLocaleString()} of 5,000 characters</span><textarea id="cbSum" rows="7">${h(P.summary)}</textarea></label>
      <div class="row"><button type="button" class="btn small" id="cbUseSum">Use as 20.011</button><button type="button" class="btn ghost small" id="cbCopy">Copy</button><button type="button" class="btn ghost small" id="cbHide">Hide</button></div>` : '<div class="row"><button type="button" class="btn ghost small" id="cbHide">Hide</button></div>'}`;
}
async function renderCtBatch() {
  const box = $('#ctBatch'); if (!box || !cur) return; const docs = cbDocs(); const P = cur.contractPacket;
  if (!docs.length && !P) { box.innerHTML = ''; return; }
  const ai = cur.aiUse, ok = ai === 'Yes' || ai === 'Redacted', key = aiKey();
  const base = n => String(n || '').replace(/ - REDACTED\.pdf$/i, '.pdf').toLowerCase(); const sent = new Set(((P && P.files) || []).map(base));
  const fresh = [...new Map(docs.filter(d => !sent.has(base(d.name))).map(d => [base(d.name), d])).values()];
  const uniq = [...new Map(docs.map(d => [base(d.name), d])).values()];
  let html = `<div class="permbatch"><b>Contract packet: ${uniq.length} file${uniq.length === 1 ? '' : 's'}</b> (${uniq.map(d => h(DOC_LABEL[d.type] || d.type)).join(', ')}${docs.length > uniq.length ? ' – with your redacted copies' : ''}). `
    + (P ? `<span class="chip ok">✓ read together · ${h(new Date(P.at).toLocaleDateString())}</span>` : '') + (P && fresh.length ? `<span class="chip warn">${fresh.length} new file${fresh.length === 1 ? '' : 's'} not read yet – read the packet again</span>` : '') + ' ';
  if (!docs.length) html += '';
  else if (!ok) html += `To have Claude read the contract, counters and addenda together (negotiation, final price, last signature, total pages), set <b>AI use</b> on this order to Yes or Redacted (it is <b>${h(ai || 'not set')}</b>). Each file can still be read on its own with <b>Read</b>.`;
  else if (!key) html += 'Claude can read them together, but no Claude API key is saved yet: <b>Settings → Claude</b>.';
  else if (ai === 'Redacted') html += `<button type="button" class="btn small" id="cbRed">${P ? 'Redact and read the packet again' : 'Redact the whole packet, then read it with Claude'}</button> <span class="help">all ${docs.length} files on one screen: check the black boxes, add your own, then send only the redacted pictures</span>`;
  else html += `<button type="button" class="btn small" id="cbPlan">${P ? 'Read the packet again' : 'Read the contract packet together with Claude'}</button> <span class="help">one request with the contract, every counter offer and addendum, so Claude can follow the negotiation</span>`;
  if (P && !CB.show) html += ` <button type="button" class="btn ghost small" id="cbShow">Show the contract packet</button>`;
  html += '</div>';
  if (CB.plan) { const L = CB.plan; const nT = L.reduce((a, f) => a + ((f.text || []).length), 0), nI = L.reduce((a, f) => a + ((f.imgs || []).length), 0), nH = L.reduce((a, f) => a + ((f.held || []).length), 0);
    html += `<div class="rdsendbar"><b>This is what goes to Claude${ai === 'Redacted' ? ' (redacted)' : ''}:</b>
      <table class="facts"><tr><th>File</th><th>Pages</th><th>As text</th><th>As pictures</th><th>Not sent</th></tr>${L.map(f => `<tr><td>${h(f.d.name)}</td><td>${f.pages || ''}</td><td>${f.skip ? '' : (f.text || []).length}</td><td>${f.skip ? '' : (f.imgs || []).length}</td><td>${f.skip ? h(f.skip) : (f.held || []).length ? 'scanned p. ' + f.held.join(', ') : ''}${f.noPics ? `<div class="warnTxt">Only its text can go – on C.A.R. forms that is scrambled, and check boxes and signatures cannot be seen. <button type="button" class="btn small" data-cbcopy="${f.d.id}">Make a redacted copy</button></div>` : ''}</td></tr>`).join('')}</table>
      ${L.some(f => f.noPics) ? `<p class="help"><b>Redacted order:</b> Claude can only look at the pages of a file you saved as a redacted copy (“… - REDACTED.pdf”). Click <b>Make a redacted copy</b> for each file, check the black boxes, click <b>Save redacted PDF</b>, then come back and click <b>Read the packet again</b> – the copies go as pictures instead of the originals.</p>` : ''}
      ${nH ? `<p class="help"><b>${nH} scanned page${nH === 1 ? ' is' : 's are'} not sent</b>: on a Redacted order only the "- REDACTED" copy of a scanned file can go. C.A.R. forms often print as scrambled text – those pages are read best as pictures on a Yes order.</p>` : ''}
      <div class="row">${nT + nI ? `<button type="button" class="btn primary" id="cbGo">Send ${nT + nI} page${nT + nI === 1 ? '' : 's'} to Claude</button>` : '<span class="help">Nothing can be sent.</span>'}<button type="button" class="btn ghost" id="cbCancel">Cancel</button></div></div>`; }
  if (CB.err) html += `<p class="help warnTxt"><b>The last try did not work:</b> ${h(CB.err)}</p>`;
  if (P && CB.show) html += cbHTML(P);
  box.innerHTML = html;
  const pl = $('#cbPlan'); if (pl) pl.onclick = async () => { pl.disabled = true; pl.textContent = 'Looking at the files…'; try { saveLetter(true, true); CB.plan = await pbMakePlan(cbDocs());
    /* her ask (Oct 22 2026): check boxes (items included, contingencies) are not in the text – every page that may be sent also goes as a picture */
    CB.plan.forEach(f => { if (f.skip || !f.text) return; const red = cur.aiUse === 'Redacted' && !/- REDACTED\.pdf$/i.test(f.d.name); if (red) { f.noPics = true; return; }
      const all = new Set([...(f.imgs || []), ...f.text.map(p => p.n)]); f.imgs = [...all].sort((a, b) => a - b); }); } catch (e) { console.error(e); toast('Could not open the contract files: ' + (e.message || e)); } renderCtBatch(); };
  const go = $('#cbGo'); if (go) go.onclick = () => cbSend();
  const rb = $('#cbRed'); if (rb) rb.onclick = () => cbRedOpen();
  box.querySelectorAll('[data-cbcopy]').forEach(b => b.onclick = async () => { CB.plan = null; await openReader(b.dataset.cbcopy); for (let i = 0; i < 40 && !RD.pdf; i++) await new Promise(r => setTimeout(r, 150)); if (!RD.pdf) return;
    RD.prepMode = 'copy'; RD.prepFrom = 1; RD.prepTo = RD.pdf.numPages; rdPrepare(); });
  const cc = $('#cbCancel'); if (cc) cc.onclick = () => { CB.plan = null; renderCtBatch(); };
  const sh = $('#cbShow'); if (sh) sh.onclick = () => { CB.show = true; renderCtBatch(); };
  const hd = $('#cbHide'); if (hd) hd.onclick = () => { CB.show = false; renderCtBatch(); };
  const pa = $('#cbParts'); if (pa) pa.onclick = () => { cbUseParts(); renderCtBatch(); };
  box.querySelectorAll('[data-cbacc]').forEach(b => b.onclick = () => { const k = b.dataset.cbacc; const v = box.querySelector(`[data-cbv="${k}"]`).value.trim(); if (!v) { toast('Nothing to accept'); return; } cbAccept(k, v); renderFacts(); renderCtBatch(); toast('Accepted on the purchase contract'); });
  const ans = i => { const P2 = cur.contractPacket; P2.answers = P2.answers || {}; return P2.answers[i] = P2.answers[i] || {}; };
  box.querySelectorAll('[data-cbst]').forEach(e => e.onchange = () => { ans(e.dataset.cbst).st = e.value; saveLetter(true, true); e.closest('li').classList.toggle('done', e.value !== 'open'); });
  box.querySelectorAll('[data-cbans]').forEach(e => e.onchange = () => { ans(e.dataset.cbans).t = e.value; saveLetter(true, true); });
  box.querySelectorAll('[data-cbadd]').forEach(b => b.onclick = () => { const i = b.dataset.cbadd; const t = box.querySelector(`[data-cbans="${i}"]`).value.trim(); if (!t) { toast('Type your answer first'); return; }
    const sm2 = $('#cbSum'); if (sm2) { sm2.value = sm2.value.trim() + (sm2.value.trim() ? ' ' : '') + t; cur.contractPacket.summary = sm2.value; } ans(i).t = t; if ((ans(i).st || 'open') === 'open') ans(i).st = 'report'; saveLetter(true, true); renderCtBatch(); toast('Added to the end of the draft – click “Use as 20.011” when the draft is ready'); });
  const sm = $('#cbSum'); if (sm) sm.onchange = () => { cur.contractPacket.summary = sm.value; saveLetter(true, true); };
  const us = $('#cbUseSum'); if (us) us.onclick = () => { cur.uad = cur.uad || {}; if (String(cur.uad.cmt || '').trim() && !confirm('Replace the 20.011 Sales contract analysis you already have with this draft?')) return; cur.uad.cmt = $('#cbSum').value; saveLetter(true, true); toast('It is the 20.011 Sales contract analysis now (open the purchase contract with Read to see or edit it)', 7000); };
  const cp = $('#cbCopy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText($('#cbSum').value); toast('Copied'); } catch (e) { toast('Could not copy'); } };
}

/* her ask (Oct 22 2026): "I should be able to redact when all three can be read at the same time" – one screen with every page of
   every packet file, blacked out on this computer (the same rules and boxes as one document), then only these pictures go to Claude. */
const CBR = { docs: [], boxes: {}, mode: 'black' };
async function cbRedPage(x, n) {   // the redaction of one page of one packet file, using the reader's redactPage
  const keep = { pdf: RD.pdf, boxes: RD.boxes, extra: RD.extra };
  RD.pdf = x.pdf; RD.boxes = CBR.boxes[x.d.id] = CBR.boxes[x.d.id] || {}; RD.extra = cur.redactNames || '';
  try { return await redactPage(n, !x.copy); } finally { RD.pdf = keep.pdf; RD.boxes = keep.boxes; RD.extra = keep.extra; } }
function cbRedClose() { const o = $('#cbRedPane'); if (o) o.remove(); }
async function cbRedOpen() {
  cbRedClose(); const pdfjs = await loadPdfJs(); const all = cbDocs();
  const copies = all.filter(d => /- REDACTED\.pdf$/i.test(d.name)).map(d => d.name.replace(/ - REDACTED\.pdf$/i, '').toLowerCase());
  CBR.docs = [];
  for (const d of all) { const isCopy = /- REDACTED\.pdf$/i.test(d.name); if (!isCopy && copies.includes(d.name.replace(/\.pdf$/i, '').toLowerCase())) continue;
    const rec = await ODB.get('docs', d.id); if (!rec || !rec.blob || !/pdf/i.test(rec.mime || rec.blob.type || d.name)) continue;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
    CBR.docs.push({ d, pdf, copy: isCopy }); }
  const total = CBR.docs.reduce((a, x) => a + x.pdf.numPages, 0);
  const pane = document.createElement('div'); pane.id = 'cbRedPane'; pane.className = 'cbredpane'; document.body.appendChild(pane);
  const canSend = total <= 60;
  pane.innerHTML = `<div class="rdsendbar"><b>The whole contract packet, redacted: ${CBR.docs.length} files, ${total} pages – check every page.</b> <span class="rddir">This is exactly what Claude will see: black boxes are painted into the pictures, and no text is sent. Drag on a page to black out anything else (signatures, initials, account numbers).</span>
    <label>Also remove these names <span class="opt">separate with commas – buyers, sellers, agents, escrow, anyone else</span><input id="cbRedNames" value="${h(cur.redactNames || '')}"></label>
    <div class="row"><span>Drag to:</span><div class="seg2"><button type="button" data-cbdm="black" aria-pressed="true">Black box</button><button type="button" data-cbdm="blur" aria-pressed="false">Blur</button></div><button type="button" class="btn ghost small" id="cbRedUndo">Undo last box</button></div>
    <span class="row">${canSend ? `<button type="button" class="btn primary" id="cbRedGo">Send these ${total} redacted pages to Claude</button>` : '<span class="help warnTxt">More than 60 pages – remove the disclosures from the packet first.</span>'}<button type="button" class="btn ghost" id="cbRedSave">Also save redacted copies (PDF)</button><button type="button" class="btn ghost" id="cbRedClose">Close</button></span>
    <span class="row rdzoom"><span>Page size:</span><button type="button" class="btn ghost small" data-cbz="-" aria-label="Smaller pages">−</button><button type="button" class="btn ghost small" data-cbz="1">One page across</button><button type="button" class="btn ghost small" data-cbz="+" aria-label="Bigger pages">＋</button><button type="button" class="btn ghost small" data-cbz="mini">▴ Hide the directions</button></span></div>
    <div id="cbRedThumbs" class="rdthumbs"></div>`;
  const th = $('#cbRedThumbs'); const bar = pane.querySelector('.rdsendbar');
  const zoomTo = w => { CBR.zoom = Math.max(200, Math.min(2600, Math.round(w))); th.style.gridTemplateColumns = `repeat(auto-fill, minmax(${Math.min(CBR.zoom, th.clientWidth || CBR.zoom)}px, 1fr))`; }; zoomTo(CBR.zoom || 320);
  pane.querySelectorAll('[data-cbz]').forEach(b => b.onclick = () => { const k = b.dataset.cbz; if (k === 'mini') { const m = bar.classList.toggle('mini'); b.textContent = m ? '▾ Show the directions' : '▴ Hide the directions'; return; } if (k === '1') zoomTo(th.clientWidth || 1200); else zoomTo((CBR.zoom || 320) * (k === '+' ? 1.3 : 1 / 1.3)); });
  pane.addEventListener('wheel', e => { if (!e.ctrlKey || !e.target.closest('#cbRedThumbs')) return; e.preventDefault(); zoomTo((CBR.zoom || 320) * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
  pane.querySelectorAll('[data-cbdm]').forEach(b => b.onclick = () => { CBR.mode = b.dataset.cbdm; pane.querySelectorAll('[data-cbdm]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#cbRedClose').onclick = cbRedClose;
  $('#cbRedNames').onchange = e => { cur.redactNames = e.target.value; saveLetter(true, true); cbRedOpen(); };
  const draw = async (x, n, cv, cap) => { const { cv: nv, hits } = await cbRedPage(x, n); cv.getContext('2d').drawImage(nv, 0, 0); cap.textContent = `${x.d.name} – page ${n}${x.copy ? ' (your redacted copy)' : ` · ${hits} item${hits === 1 ? '' : 's'} blacked out`}`; };
  for (const x of CBR.docs) for (let n = 1; n <= x.pdf.numPages; n++) {
    const { cv, hits } = await cbRedPage(x, n); if (!pane.isConnected) return; cv.dataset.doc = x.d.id; cv.dataset.n = n;
    const fig = document.createElement('figure'); fig.innerHTML = `<figcaption>${h(x.d.name)} – page ${n}${x.copy ? ' (your redacted copy)' : ` · ${hits} item${hits === 1 ? '' : 's'} blacked out`}</figcaption>`; fig.prepend(cv); th.appendChild(fig);
    let st = null; cv.onpointerdown = e => { const r = cv.getBoundingClientRect(); st = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; cv.setPointerCapture(e.pointerId); };
    cv.onpointerup = async e => { if (!st) return; const r = cv.getBoundingClientRect(); const en = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; const b = { x: Math.min(st[0], en[0]), y: Math.min(st[1], en[1]), w: Math.abs(en[0] - st[0]), h: Math.abs(en[1] - st[1]), mode: CBR.mode, t: Date.now() }; st = null;
      if (b.w < 0.01 || b.h < 0.005) return; const B = CBR.boxes[x.d.id] = CBR.boxes[x.d.id] || {}; (B[n] = B[n] || []).push(b); await draw(x, n, cv, fig.querySelector('figcaption')); }; }
  $('#cbRedUndo').onclick = async () => { let last = null; for (const x of CBR.docs) { const B = CBR.boxes[x.d.id] || {}; for (const n in B) { const b = (B[n] || []).at(-1); if (b && (!last || b.t > last.b.t)) last = { x, n: +n, b }; } }
    if (!last) return; CBR.boxes[last.x.d.id][last.n].pop(); const cv = th.querySelector(`canvas[data-doc="${last.x.d.id}"][data-n="${last.n}"]`); if (cv) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); await draw(last.x, last.n, cv, cv.parentNode.querySelector('figcaption')); } };
  const sv = $('#cbRedSave'); sv.onclick = async () => { sv.disabled = true; sv.textContent = 'Saving…';
    try { for (const x of CBR.docs) { if (x.copy) continue; const pages = []; for (const cv of th.querySelectorAll(`canvas[data-doc="${x.d.id}"]`)) { const bin = atob(cv.toDataURL('image/jpeg', 0.85).split(',')[1]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); pages.push({ jpg: u8, w: cv.width, h: cv.height }); }
        const blob = jpegPdf(pages); const name = x.d.name.replace(/\.pdf$/i, '') + ' - REDACTED.pdf'; const m2 = { id: uid(), name, type: x.d.type, size: blob.size, mime: 'application/pdf', added: new Date().toISOString(), note: 'redacted copy – pictures only, no hidden text' };
        await ODB.put('docs', { ...m2, orderId: cur.id, blob: new File([blob], name, { type: 'application/pdf' }) }); cur.docs.push(m2); }
      saveLetter(true, true); toast('Saved a redacted copy of each file to this order’s documents', 6000); renderDocs(); } catch (e) { toast('Could not save: ' + (e.message || e)); }
    sv.textContent = 'Saved'; };
  const go = $('#cbRedGo'); if (go) go.onclick = () => { const pics = [], plan = [];
    for (const x of CBR.docs) { const cvs = [...th.querySelectorAll(`canvas[data-doc="${x.d.id}"]`)]; cvs.forEach(cv => { const sc = Math.min(1, 1400 / Math.max(cv.width, cv.height)); let c2 = cv; if (sc < 1) { c2 = document.createElement('canvas'); c2.width = Math.round(cv.width * sc); c2.height = Math.round(cv.height * sc); c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height); }
        pics.push({ file: x.d.name, n: +cv.dataset.n, data: c2.toDataURL('image/jpeg', 0.72).split(',')[1] }); });
      plan.push({ d: x.d, pages: x.pdf.numPages, text: [], imgs: cvs.map(cv => +cv.dataset.n) }); }
    cbSend({ plan, pics }); };
}
