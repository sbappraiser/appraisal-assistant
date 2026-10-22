/* =====================================================================
   Read all permit records together with Claude (her request, Oct 19 2026)
   "It would need to analyze all of the permits at the same time … to create a timeline, status, etc."
   Every Permit records / County permit history document in the order goes in ONE request:
   readable pages as text (cheap), scanned pages as pictures. More than PB_MAX_IMG pictures are sent in
   rounds, and a last text-only round merges the rounds into one timeline.
   Rules: only when the order's AI use is Yes or Redacted and her key is saved; she sees the plan and the
   pictures first; Redacted = names/phones/emails/numbers removed from the text, and scanned pages of
   files that are not a "- REDACTED" copy are NOT sent (their words cannot be found to black out).
   Result: cur.permitTimeline {at, model, files, permits[], flags[], comment}; nothing goes into the
   report by itself – she reads it, copies what she wants.
   ===================================================================== */
const PB_TYPES = ['permitsPdf', 'permitsCounty'];
const PB_MAX_IMG = 14, PB_MAX_TEXT = 350000;
const PB = { plan: null, busy: false, show: false };
const pbDocs = () => ((cur && cur.docs) || []).filter(d => PB_TYPES.includes(d.type));

function redactText(t) {
  const terms = sensitiveTerms(); String(cur.redactNames || '').split(',').forEach(w => { w = w.trim().toLowerCase(); if (w.length >= 3) terms.add(w); });
  return String(t || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+|\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b|\b(?:loan|escrow|account|acct)\s*(?:no\.?|number|#)?:?\s*[\w-]*\d[\w-]{3,}/gi, '[removed]') /* permit and case numbers stay: they are the point */ .replace(/[A-Za-z0-9@.'’-]{3,}/g, w => terms.has(w.replace(/[.'’]+$/, '').toLowerCase()) ? '[removed]' : w);
}
async function pbPageJpeg(pdf, n) {
  const pg = await pdf.getPage(n); const v0 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: Math.min(2, 1400 / Math.max(v0.width, v0.height)) });
  const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  await pg.render({ canvasContext: g, viewport: vp }).promise; return cv;
}
async function pbMakePlan(docsIn) {   // what would be sent, file by file (the permit files, or the contract packet's files)
  const pubOk = !docsIn && cur.aiPublic;   /* her rule (Oct 22 2026): public permit records may go as they are when she ticks it on the order */
  const red = cur.aiUse === 'Redacted' && !pubOk; const files = [];
  const docs = docsIn || pbDocs(); const redactedCopies = docs.filter(d => /- REDACTED\.pdf$/i.test(d.name)).map(d => d.name.replace(/ - REDACTED\.pdf$/i, '').toLowerCase());
  for (const d of docs) {
    const base = d.name.replace(/\.pdf$/i, '').toLowerCase(); if (!/- REDACTED\.pdf$/i.test(d.name) && redactedCopies.includes(base)) { files.push({ d, skip: 'a redacted copy is sent instead' }); continue; }
    const r = await docPages(d.id); if (!r) { files.push({ d, skip: 'not stored' }); continue; }
    const P = r.pagesText || []; const scans = new Set(r.scanPages || []); const isCopy = /- REDACTED\.pdf$/i.test(d.name);
    const f = { d, pages: P.length, text: [], imgs: [], held: [] };
    P.forEach((t, i) => { const n = i + 1; if (!scans.has(n)) f.text.push({ n, t: red && !isCopy ? redactText(t) : t }); else if (red && !isCopy) f.held.push(n); else f.imgs.push(n); });
    if (!P.length && isImg({ name: d.name, type: d.mime || '' })) { if (red) f.held.push(1); else f.imgImage = true; }
    files.push(f);
  }
  return files;
}
function pbSubjectText() {
  const f = readForm(), c = cur.crs || {}, P = cur.permits;
  const lines = [`Subject: ${[f.address].filter(Boolean).join('') || '(address not entered)'}${f.apn ? ' · APN ' + f.apn : ''}${f.jurisdiction ? ' · ' + f.jurisdiction : ''}`];
  const pr = [['year built', c.yearBuilt], ['living area', c.sqft && c.sqft + ' sq. ft.'], ['bedrooms', c.beds], ['baths', c.baths], ['lot', c.lotSf && c.lotSf + ' sq. ft.'], ['zoning', c.zoning]].filter(x => x[1]);
  if (pr.length) lines.push('Public record (assessor, may be out of date): ' + pr.map(x => x[0] + ' ' + x[1]).join(', '));
  const own = f.owner || c.owner; if (own) lines.push('Current owner of record: ' + own);
  if ((c.sales || []).length) lines.push('Sales/transfer history (closing = date recorded):\n' + c.sales.slice(0, 8).map(x => `- ${x.date || ''} ${x.amount || ''} ${x.instrument || ''} to ${x.buyer || x.names || '?'}${x.seller ? ' from ' + x.seller : ''}`).join('\n'));
  if (P && G.permitItems) { const L = G.permitItems(P); if (L.length) lines.push('County permit history list already read (for matching):\n' + L.map(x => `- ${x.date || x.year || ''} ${x.num ? '#' + x.num + ' ' : ''}${x.what}${x.status ? ' (' + x.status + ')' : ''}${x.dept ? ' – ' + x.dept : ''}`).join('\n')); }
  return lines.join('\n');
}
const PB_SHAPE = `{"permits":[{"number":"permit or case number","agency":"City of …, County of Santa Barbara, …","kind":"Building|Electrical|Plumbing|Mechanical|Grading|Demolition|Solar|Pool/spa|ADU|Planning/zoning|Code enforcement|Fire|Other","work":"short description of the work","sqft":"square feet added or converted, if stated, else empty","applied":"YYYY-MM-DD or empty","issued":"YYYY-MM-DD or empty","finaled":"YYYY-MM-DD or empty","status":"Finaled|Issued – no final|Expired|Withdrawn/void|Applied only|Unknown","conditions":"conditions or restrictions written on it (e.g. no kitchen, not a separate dwelling unit, guest house, deed restriction, plumbing limits) – short quotes, else empty","file":"file name","page":1,"quote":"the words you read it from"}],"summary":"5–10 plain sentences for the appraiser: what was built or changed, when, what was finaled, conversions, second units, kitchens/wet bars, restrictions, open items","flags":[{"text":"what the appraiser should look at","file":"file name","page":1}],"comment":"a short factual permit-history paragraph for the appraisal (under 1,000 characters)"}`;
const PB_RULES = `Rules: report only what the documents say – never guess a date, status or size. Treat the same permit number in several files as ONE permit and combine what each file says. Sort the permits oldest first. A permit with an issue date but no final inspection is "Issued – no final". Flags: permits never finaled or expired; living area added or converted (garage, ADU, addition) and how it compares with the public-record living area; code-enforcement cases; work for a different address or parcel; anything that conflicts between files. The comment follows the appraiser's own style (her example: "According to the County permit history, the current owner completed a garage re-roof in 2025 (25CNP-00019), an interior remodel and a bathroom upgrade in 2010 (10BDP-01201, 10PLM-00088), permitted the rear storage shed in 2009 (09EXE-00405), and completed an addition and remodel in 2008 (08BDP-01440). The owner reported recent upgrades include: ___ (based on interview). The permit history also reflects that a prior owner completed a kitchen remodel in 2005 (05BDP-00837) and a main house re-roof in 2003 (03CNP-00167)."): plain words, one sentence for the current owner's work newest first, then the owner-interview sentence with the blank ___ left for her, then a sentence for prior owners' work newest first. Tell current from prior owners by the owner name and sale date in the public-record facts and the names in the case titles; if you cannot tell, say "the permit history reflects". Use the short permit number in brackets (drop the OOOOO- filler). Describe each item by what was done (garage re-roof, bathroom upgrade), not by case type; a Closed case is described as completed. Leave out enforcement cases, open questions, missing finals and square-footage comparisons – those belong in flags, not the comment. Facts only, no value opinion.`;

/* one careful call to Claude, shared by the permit and contract readers (Oct 22 2026, after "it asks me to try again"):
   waits and tries again when her API plan's per-minute limit is reached (429) or Claude is busy (529), gives the answer room,
   asks once for a shorter answer when it was cut off, and says plainly what went wrong. */
async function aiCall(content, system, opts) {
  opts = opts || {}; const say = opts.say || (() => {}); const wait = ms => new Promise(r => setTimeout(r, ms));
  const call = async (c, max) => { for (let tryN = 0; ; tryN++) {
      let res; try { res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: aiModel(), max_tokens: max, system, messages: [{ role: 'user', content: c }] }) }); } catch (e) { if (tryN < 2) { say('No answer from Claude – trying again…'); await wait(5000); continue; } throw new Error('Claude could not be reached (internet?)'); }
      let j = null; try { j = await res.json(); } catch (e) {}
      if ((res.status === 429 || res.status === 529 || res.status === 503) && tryN < 4) { const ra = +(res.headers.get('retry-after') || 0); const ms = Math.min(90000, Math.max(ra * 1000, [20000, 40000, 60000, 60000][tryN])); say(`Your Claude plan's per-minute limit was reached – waiting ${Math.round(ms / 1000)} seconds, then going on…`); await wait(ms); continue; }
      if (!res.ok) { const m = (j && j.error && j.error.message) || ''; throw new Error(res.status === 413 ? 'too many pages in one request' : res.status === 401 ? 'the Claude API key was not accepted – check it in Settings' : res.status === 429 ? 'your Claude plan’s per-minute limit is still reached – wait a few minutes and try again' : (m || 'Claude answered with an error (' + res.status + ')')); }
      return { txt: (j.content || []).filter(x => x.type === 'text').map(x => x.text).join(''), cut: j.stop_reason === 'max_tokens' }; } };
  const parse = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  let r = await call(content, opts.max || 16000); try { if (!r.cut) return parse(r.txt); } catch (e) {}
  say('The answer was too long – asking Claude for a shorter one…');
  r = await call([...content, { type: 'text', text: 'Your last answer was too long and was cut off. Answer again, shorter (short descriptions, no repeats). JSON only.' }], opts.max || 16000);
  try { return parse(r.txt); } catch (e) { throw new Error('Claude’s answer could not be read (cut off or not in the expected form) – try again'); } }
async function pbClaude(content, maxTokens, system, say) {
  return aiCall(content, system || 'You read building permit records for a residential appraiser in California and report exactly what they say, with file names and page numbers. Reply with JSON only.', { say, max: Math.max(maxTokens || 0, 16000) }); }
async function pbSend(pre) {   // pre = { plan, pics } from the one-screen redaction (redacted pictures only)
  if (PB.busy) return; PB.busy = true; const btn = $(pre ? '#cbRedGo' : '#pbGo'); const say = t => { if (btn) btn.textContent = t; };
  try {
    const plan = pre ? pre.plan : PB.plan; const pdfjs = pre ? null : await loadPdfJs();
    // the pictures, in rounds of PB_MAX_IMG; all the text goes with the first round (split if very long)
    const pics = pre ? pre.pics : []; if (!pre) for (const f of plan) { if (f.skip || !(f.imgs || []).length) continue; const rec = await ODB.get('docs', f.d.id); const pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
      for (const n of f.imgs) { say(`Preparing pictures… ${pics.length + 1}`); const cv = await pbPageJpeg(pdf, n); pics.push({ file: f.d.name, n, data: cv.toDataURL('image/jpeg', 0.72).split(',')[1] }); } }
    if (!pre) for (const f of plan) if (f.imgImage) { const rec = await ODB.get('docs', f.d.id); const bm = await createImageBitmap(rec.blob); const sc = Math.min(1, 1400 / Math.max(bm.width, bm.height)); const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * sc); cv.height = Math.round(bm.height * sc); cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height); pics.push({ file: f.d.name, n: 1, data: cv.toDataURL('image/jpeg', 0.72).split(',')[1] }); }
    const texts = []; let cur0 = ''; for (const f of plan) { if (f.skip) continue; for (const p of f.text) { const block = `\n=== ${f.d.name} – page ${p.n} ===\n${p.t}`; if (cur0.length + block.length > PB_MAX_TEXT && cur0) { texts.push(cur0); cur0 = ''; } cur0 += block; } } if (cur0) texts.push(cur0);
    const rounds = []; const nImgRounds = Math.ceil(pics.length / PB_MAX_IMG); const n = Math.max(1, nImgRounds, texts.length);
    for (let i = 0; i < n; i++) rounds.push({ text: texts[i] || '', pics: pics.slice(i * PB_MAX_IMG, (i + 1) * PB_MAX_IMG) });
    const subj = pbSubjectText(); const results = [];
    for (let i = 0; i < rounds.length; i++) { const R = rounds[i]; say(rounds.length > 1 ? `Claude is reading part ${i + 1} of ${rounds.length}…` : 'Claude is reading all the permits…');
      const content = [{ type: 'text', text: subj }];
      if (R.text) content.push({ type: 'text', text: 'Permit records (readable pages):' + R.text });
      R.pics.forEach(p => { content.push({ type: 'text', text: `=== ${p.file} – page ${p.n} (scanned picture) ===` }); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.data } }); });
      content.push({ type: 'text', text: `${rounds.length > 1 ? `This is part ${i + 1} of ${rounds.length} of the permit records for this property. ` : 'These are all the permit records for this property. '}Read every page above together and build one permit timeline.\n${PB_RULES}\nAnswer with JSON only, in this form: ${PB_SHAPE}` });
      results.push(await pbClaude(content, 16000, null, say)); }
    let out = results[0] || {};
    if (results.length > 1) { say('Claude is putting the parts together…');
      out = await pbClaude([{ type: 'text', text: `${subj}\n\nThe permit records for this property were read in ${results.length} parts. Here is what each part found:\n${results.map((r, i) => `--- part ${i + 1} ---\n${JSON.stringify(r)}`).join('\n')}\n\nMerge them into one timeline (the same permit number is one permit).\n${PB_RULES}\nAnswer with JSON only, in this form: ${PB_SHAPE}` }]); }
    try { await ODB.put('kv', { id: 'pbpics:' + cur.id, v: pics.map(x => ({ file: x.file, n: x.n, data: x.data })), at: Date.now() }); } catch (e) { console.warn('keep pictures', e); }
    const sentFiles = plan.filter(f => !f.skip && ((f.text || []).length || (f.imgs || []).length || f.imgImage)).map(f => f.d.name);
    cur.permitTimeline = { at: new Date().toISOString(), model: aiModel(), files: sentFiles, rounds: rounds.length, mode: cur.aiUse === 'Redacted' && !(pre ? false : cur.aiPublic) ? 'redacted' : cur.aiUse === 'Redacted' ? 'public records as they are' : 'full',
      summary: String(out.summary || ''), permits: (out.permits || []).filter(x => x && (x.work || x.number)), flags: (out.flags || []).filter(x => x && x.text), comment: String(out.comment || '') };
    (cur.aiLog = cur.aiLog || []).push({ at: cur.permitTimeline.at, doc: 'All permit records (' + sentFiles.length + ' files)', pages: [], mode: cur.permitTimeline.mode, model: aiModel(), items: cur.permitTimeline.permits.length });
    PB.plan = null; PB.show = true; if (pre && typeof cbRedClose === 'function') cbRedClose(); saveLetter(true, true); renderDocs();
    toast(`Claude read ${sentFiles.length} permit files together: ${cur.permitTimeline.permits.length} permits, ${cur.permitTimeline.flags.length} things to check`, 6000);
  } catch (e) { console.error(e); const m = 'Not sent or not read: ' + (e.message || e); toast(m, 9000); say('Try again'); const eb = document.getElementById('cbRedErr'); if (eb) eb.textContent = m; }
  PB.busy = false;
}
/* newest permit first (her request, Oct 19 2026): by the latest of final, issued and applied dates; undated ones last */
const pbDateKey = x => { x = String(x || '').trim(); let m = x.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + m[2] + m[3]; m = x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { const y = m[3].length === 2 ? (+m[3] > 50 ? '19' : '20') + m[3] : m[3]; return y + m[1].padStart(2, '0') + m[2].padStart(2, '0'); } m = x.match(/(\d{4})/); return m ? m[1] + '0000' : ''; };
const pbSorted = L => [...(L || [])].sort((a, b) => { const ka = [a.finaled, a.issued, a.applied].map(pbDateKey).sort().pop() || '', kb = [b.finaled, b.issued, b.applied].map(pbDateKey).sort().pop() || ''; return kb.localeCompare(ka); });
function pbTimelineHTML(T) {
  const d = x => x ? h(G.showDate ? G.showDate(x) : x) : '';
  return `<h4>Permit timeline <span class="opt">read by Claude ${h(new Date(T.at).toLocaleDateString())} from ${T.files.length} file${T.files.length === 1 ? '' : 's'}${T.mode === 'redacted' ? ' (redacted)' : ''} – check it against the records</span></h4>
    <div class="tableWrap"><table class="facts pbt"><tr><th>Permit</th><th>Work</th><th>Sq. ft.</th><th>Applied</th><th>Issued</th><th>Final</th><th>Status</th><th>Where</th></tr>
    ${pbSorted(T.permits).map(p => `<tr class="${/no final|expired/i.test(p.status || '') ? 'warnRow' : ''}"><td>${h(p.number || '')}<br><small class="muted">${h([p.kind, p.agency].filter(Boolean).join(' · '))}</small></td><td>${h(p.work || '')}${p.conditions ? `<br><small class="warnTxt">${h(p.conditions)}</small>` : ''}</td><td>${h(p.sqft || '')}</td><td>${d(p.applied)}</td><td>${d(p.issued)}</td><td>${d(p.finaled)}</td><td>${h(p.status || '')}</td><td><small>${h(p.file || '')}${p.page ? ', p. ' + h(p.page) : ''}</small></td></tr>`).join('')}</table></div>
    ${T.flags.length ? `<h4>To check</h4><ul>${T.flags.map(f => `<li>${h(f.text)}${f.file ? ` <small class="muted">${h(f.file)}${f.page ? ', p. ' + h(f.page) : ''}</small>` : ''}</li>`).join('')}</ul>` : ''}
    ${T.comment ? `<label>Draft permit comment <span class="opt">Claude's wording – read and edit it before you use it; ${T.comment.length.toLocaleString()} characters</span><textarea id="pbComment" rows="5">${h(T.comment)}</textarea></label>` : ''}
    <div class="row"><button type="button" class="btn ghost small" id="pbCopy">Copy the timeline</button>${T.comment ? '<button type="button" class="btn ghost small" id="pbCopyC">Copy the comment</button>' : ''}<button type="button" class="btn ghost small" id="pbHide">Hide</button></div>`;
}
async function renderPermBatch() {
  const box = $('#permBatch'); if (!box || !cur) return; const docs = pbDocs(); const T = cur.permitTimeline;
  if (!docs.length && !T) { box.innerHTML = ''; return; }
  const ai = cur.aiUse, ok = ai === 'Yes' || ai === 'Redacted', key = aiKey();
  const inT = d => !!(T && (T.files || []).includes(d.name)); const fresh = docs.filter(d => !inT(d)); const scans = fresh.filter(d => /^(scan|part:)/.test(d.textState || ''));
  const chips = (T ? `<span class="chip ok" title="Claude read these together on ${h(new Date(T.at).toLocaleString())}">✓ read by Claude · ${h(new Date(T.at).toLocaleDateString())}</span><span class="chip done" title="The permit timeline is below (Show the permit timeline)">✓ done · ${T.permits.length} permit${T.permits.length === 1 ? '' : 's'} in the timeline</span>` : '')
    + (fresh.length && T ? `<span class="chip warn" title="${h(fresh.map(d => d.name).join(', '))}">${fresh.length} new file${fresh.length === 1 ? '' : 's'} not read yet – read them all again</span>` : '')
    + (scans.length ? `<span class="chip warn" title="${h(scans.map(d => d.name).join(', '))}: pictures of pages – only Claude (or Acrobat Recognize text) can read them">scan – needs Claude or Acrobat (${scans.length} file${scans.length === 1 ? '' : 's'})</span>` : '')
    + (!T && docs.length && !scans.length ? '<span class="chip">text – ready to send</span>' : '');
  let html = `<div class="permbatch"><b>Permit records: ${docs.length} file${docs.length === 1 ? '' : 's'}.</b> ${chips ? '<div>' + chips + '</div>' : ''}`;
  if (!docs.length) html += '';
  else if (!ok) html += `To have Claude read them all together and build one timeline, set <b>AI use</b> on this order to Yes or Redacted (it is <b>${h(ai || 'not set')}</b>).`;
  else if (!key) html += 'Claude can read them all together, but no Claude API key is saved yet: <b>Standard wording → AI settings</b>.';
  else if (ai === 'Redacted' && !cur.aiPublic) html += `<button type="button" class="btn small" id="pbRed">${T ? 'Redact and read all the permits again' : 'Redact all the permit files, then read them with Claude'}</button> <span class="help">every page on one screen – names, phones and other addresses are blacked out by themselves (scans are read on this computer first); check them, then only the pictures go</span>`;
  else html += `<button type="button" class="btn small" id="pbPlan">${T ? 'Read all the permits again' : 'Read all the permits together with Claude'}</button> <span class="help">one request with every permit file, so Claude can build one timeline${T ? '' : ''}</span>`;
  if (T && !PB.show) html += ` <button type="button" class="btn ghost small" id="pbShow">Show the permit timeline (${T.permits.length})</button>`;
  html += '</div>';
  if (PB.plan) { const P = PB.plan; const nT = P.reduce((a, f) => a + ((f.text || []).length), 0), nI = P.reduce((a, f) => a + ((f.imgs || []).length) + (f.imgImage ? 1 : 0), 0), nH = P.reduce((a, f) => a + ((f.held || []).length), 0);
    const rounds = Math.max(1, Math.ceil(nI / PB_MAX_IMG));
    html += `<div class="rdsendbar"><b>This is what goes to Claude${ai === 'Redacted' ? (cur.aiPublic ? ' (public records, as they are – you ticked that on the order)' : ' (redacted)') : ''}:</b>
      <table class="facts"><tr><th>File</th><th>Pages</th><th>As text</th><th>As pictures</th><th>Not sent</th></tr>${P.map(f => `<tr><td>${h(f.d.name)}</td><td>${f.pages || ''}</td><td>${f.skip ? '' : (f.text || []).length}</td><td>${f.skip ? '' : (f.imgs || []).length + (f.imgImage ? 1 : 0)}</td><td>${f.skip ? h(f.skip) : (f.held || []).length ? 'scanned p. ' + f.held.join(', ') : ''}</td></tr>`).join('')}</table>
      <p class="help">Also sent: the address, APN and the public-record facts (year built, living area, beds/baths, lot, zoning) so Claude can compare, and the County permit list if you uploaded it.${ai === 'Redacted' ? ' Names, phone numbers, emails and file/loan numbers are removed from the text first.' : ''}${nH ? ` <b>${nH} scanned page${nH === 1 ? ' is' : 's are'} not sent</b>: on a Redacted order the words on a scan cannot be found to black them out. Open that file, click <b>Read › Redacted copy</b>, black out the names, save the copy, then come back here – the copy is sent instead.` : ''}${rounds > 1 ? ` There are ${nI} pictures, so Claude reads them in ${rounds} parts and then puts the parts together.` : ''}</p>
      <div id="pbThumbs" class="rdthumbs"></div>
      <div class="row">${nT + nI ? `<button type="button" class="btn primary" id="pbGo">Send ${nT + nI} page${nT + nI === 1 ? '' : 's'} to Claude</button>` : '<span class="help">Nothing can be sent.</span>'}<button type="button" class="btn ghost" id="pbCancel">Cancel</button></div></div>`; }
  if (T && PB.show) html += pbTimelineHTML(T) + pbAskHTML(T);
  box.innerHTML = html;
  const pl = $('#pbPlan'); if (pl) pl.onclick = async () => { pl.disabled = true; pl.textContent = 'Looking at the files…'; try { saveLetter(true, true); PB.plan = await pbMakePlan(); } catch (e) { console.error(e); toast('Could not open the permit files: ' + (e.message || e)); } renderPermBatch(); };
  const sh = $('#pbShow'); if (sh) sh.onclick = () => { PB.show = true; renderPermBatch(); };
  const hd = $('#pbHide'); if (hd) hd.onclick = () => { PB.show = false; renderPermBatch(); };
  const cc = $('#pbCancel'); if (cc) cc.onclick = () => { PB.plan = null; renderPermBatch(); };
  const go = $('#pbGo'); if (go) go.onclick = () => pbSend();
  const pr = $('#pbRed'); if (pr) pr.onclick = () => cbRedOpen({ docs: pbDocs, title: 'All the permit records', send: pbSend, max: 72 });
  const ta = $('#pbComment'); if (ta) ta.onchange = () => { cur.permitTimeline.comment = ta.value; saveLetter(true, true); };
  const cp = $('#pbCopy'); if (cp) cp.onclick = async () => { const t = pbSorted(T.permits).map(p => [p.number, p.work, p.sqft && p.sqft + ' sq. ft.', p.applied && 'applied ' + p.applied, p.issued && 'issued ' + p.issued, p.finaled && 'final ' + p.finaled, p.status].filter(Boolean).join(' · ')).join('\n') + (T.flags.length ? '\n\nTo check:\n' + T.flags.map(f => '- ' + f.text).join('\n') : ''); try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast('Could not copy'); } };
  const c2 = $('#pbCopyC'); if (c2) c2.onclick = async () => { try { await navigator.clipboard.writeText($('#pbComment').value); toast('Copied'); } catch (e) { toast('Could not copy'); } };
  // the pictures she is about to send, small, so she sees them first
  const th = $('#pbThumbs'); if (th && PB.plan) { const pdfjs = await loadPdfJs(); let shown = 0;
    for (const f of PB.plan) { if (f.skip || !(f.imgs || []).length) continue; const rec = await ODB.get('docs', f.d.id); const pdf = await pdfjs.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
      for (const n of f.imgs) { if (!th.isConnected) return; const cv = await pbPageJpeg(pdf, n); cv.style.width = '120px'; cv.style.height = 'auto'; const fig = document.createElement('figure'); fig.innerHTML = `<figcaption>${h(f.d.name.slice(0, 24))} p. ${n}</figcaption>`; fig.prepend(cv); th.appendChild(fig); if (++shown >= 60) return; } } }
}

/* a whole folder dropped or chosen: every file inside it (the folder name "permits" marks them as permit records) */
async function droppedFiles(dt) {
  const items = [...(dt.items || [])]; const ents = items.map(it => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  if (!ents.some(e => e.isDirectory)) return [...dt.files];
  const out = []; const walk = async (e, path) => { if (e.isFile) { const f = await new Promise((ok, no) => e.file(ok, no)); f._dir = path; out.push(f); return; }
    const rd = e.createReader(); let batch; do { batch = await new Promise((ok, no) => rd.readEntries(ok, no)); for (const c of batch) await walk(c, path + '/' + e.name); } while (batch.length); };
  for (const e of ents) await walk(e, ''); return out.filter(f => !/^\./.test(f.name) && !/^(thumbs\.db|desktop\.ini)$/i.test(f.name));
}

/* ===== her ask (Oct 22 2026): "summarize them and then I want to ask it a question – how is the garage conversion permitted? can it
   be a separate unit? is the wet bar permitted? the door from the hallway was removed … I will want help writing a comment".
   Questions go to Claude with the permit timeline, her inspection notes and the earlier questions; she can also let Claude look
   at the pages of chosen files again (the same pictures that were sent – redacted ones on a Redacted order). Nothing goes into
   the report by itself. ===== */
function pbAskHTML(T) {
  const Q = cur.permitQA = cur.permitQA || { obs: '', list: [], draft: '' }; const files = T.files || [];
  return `<div class="pbask"><h4>Ask Claude about the permits</h4>
    ${T.summary ? `<p><b>Summary:</b> ${h(T.summary)}</p>` : '<p class="help">Read the permits again to get a summary at the top (new).</p>'}
    <label>What you saw at the inspection <span class="opt">Claude uses this with the permits – e.g. “The hallway door by the bath was removed; the converted garage now has only an exterior entrance. Wet bar with sink in the family room.”</span><textarea id="pbObs" rows="3">${h(Q.obs || '')}</textarea></label>
    ${(Q.list || []).map(x => `<div class="pbqa"><div class="q"><b>You:</b> ${h(x.q)}</div><div class="a"><b>Claude:</b> ${h(x.a).replace(/\n/g, '<br>')}</div></div>`).join('')}
    <label>Your question <textarea id="pbQ" rows="2" placeholder="How is the garage conversion permitted? Can it be a separate unit? Is the wet bar permitted?"></textarea></label>
    ${files.length ? `<details><summary class="help">Let Claude look at the pages again (slower) – tick the files</summary><div class="row">${files.map((f, i) => `<label class="check"><input type="checkbox" data-pbqf="${i}"> ${h(f)}</label>`).join('')}</div></details>` : ''}
    <div class="row"><button type="button" class="btn small" id="pbAsk">Ask</button><button type="button" class="btn ghost small" id="pbDraft">Draft a permit comment from this</button>${(Q.list || []).length ? '<button type="button" class="btn ghost small danger" id="pbQClear">Clear the questions</button>' : ''}</div>
    ${Q.draft ? `<label>Draft permit comment <span class="opt">Claude's wording in your style – edit it; ${Q.draft.length.toLocaleString()} characters</span><textarea id="pbQDraft" rows="6">${h(Q.draft)}</textarea></label>
      <div class="row"><button type="button" class="btn small" id="pbQUse">Add to Subject property commentary</button><button type="button" class="btn ghost small" id="pbQCopy">Copy</button></div>` : ''}
    <p class="help warnTxt" id="pbAskErr"></p></div>`;
}
function pbAskCtx(T) {
  const Q = cur.permitQA || {}; const red = cur.aiUse === 'Redacted' && !cur.aiPublic; const R = t => red ? redactText(t) : t;
  return [pbSubjectText(), 'Permit timeline already read from the records (JSON):\n' + JSON.stringify({ summary: T.summary, permits: T.permits, flags: T.flags }),
    Q.obs ? 'The appraiser\'s own observations at the inspection:\n' + R(Q.obs) : '', (Q.list || []).length ? 'Earlier questions and answers:\n' + Q.list.slice(-6).map(x => `Q: ${x.q}\nA: ${x.a}`).join('\n') : ''].filter(Boolean).join('\n\n');
}
const PB_ASK_SYS = 'You help a California residential appraiser understand the permit history of the property she is appraising. Answer from the permit records and her observations only. Say clearly what the records show, what they do not show, and what she should verify with the County or City (for example the permit file, a planner, or an ADU/JADU or guest house rule). Do not give legal conclusions about whether something is legal; describe what is permitted on paper versus what she observed. Plain words, short paragraphs.';
document.addEventListener('click', async e => {
  const t = e.target; if (!t || !t.id || !/^pb(Ask|Draft|QClear|QUse|QCopy)$/.test(t.id)) return; const T = cur && cur.permitTimeline; if (!T) return;
  const Q = cur.permitQA = cur.permitQA || { obs: '', list: [], draft: '' }; const obs = document.getElementById('pbObs'); if (obs) Q.obs = obs.value;
  const err = document.getElementById('pbAskErr'); const busy = (b, txt) => { t.disabled = b; if (txt) t.textContent = txt; };
  if (t.id === 'pbQClear') { if (!confirm('Clear the questions and answers?')) return; Q.list = []; saveLetter(true, true); renderPermBatch(); return; }
  if (t.id === 'pbQCopy') { try { await navigator.clipboard.writeText(document.getElementById('pbQDraft').value); toast('Copied'); } catch (x) { toast('Could not copy'); } return; }
  if (t.id === 'pbQUse') { const v = document.getElementById('pbQDraft').value.trim(); if (!v) return; Q.draft = v;
    (cur.facts = cur.facts || []).push({ id: uid(), docId: '', doc: 'Permit questions', type: 'permitsPdf', key: 'notes', label: 'Permit comment', value: v, by: 'you', at: new Date().toISOString(), sent: { to: 'cSubject', text: v, at: Date.now() } });
    saveLetter(true, true); renderFacts(); toast('Added – it goes into Subject property commentary in the Comp genie (once); edit it there', 7000); return; }
  if (cur.aiUse !== 'Yes' && cur.aiUse !== 'Redacted') { toast('AI use on this order is ' + (cur.aiUse || 'not set')); return; }
  const pics = []; if (t.id === 'pbAsk') { const want = [...document.querySelectorAll('[data-pbqf]:checked')].map(x => (T.files || [])[+x.dataset.pbqf]);
    if (want.length) { const r = await ODB.get('kv', 'pbpics:' + cur.id); const all = (r && r.v) || []; all.filter(p => want.includes(p.file)).slice(0, PB_MAX_IMG).forEach(p => pics.push(p)); if (!pics.length) toast('The pages were not kept from the last reading – read the permits again first'); } }
  const q = t.id === 'pbAsk' ? (document.getElementById('pbQ').value || '').trim() : ''; if (t.id === 'pbAsk' && !q) { toast('Type your question first'); return; }
  const content = [{ type: 'text', text: pbAskCtx(T) }];
  pics.forEach(p => { content.push({ type: 'text', text: `=== ${p.file} – page ${p.n} ===` }); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.data } }); });
  if (t.id === 'pbAsk') content.push({ type: 'text', text: 'Her question: ' + q + '\nAnswer in plain text (no JSON), at most about 200 words. Reply as JSON {"answer":"…"}.' });
  else content.push({ type: 'text', text: 'Write the permit comment for her appraisal report (UAD 3.6 Subject property / improvements commentary). Her style: short factual sentences, no play-by-play; what is permitted and finaled, what was observed that is not shown in the permits (for example a converted area, a removed interior door, a wet bar), how it was treated in the appraisal ([included / not included] in the living area, [given contributory value / no contributory value]), and that no opinion is given on legality – verified with [County / City] as noted. Use [brackets] for what she must decide. Under 900 characters. Reply as JSON {"comment":"…"}.' });
  busy(true, t.id === 'pbAsk' ? 'Asking…' : 'Drafting…'); if (err) err.textContent = '';
  try { const out = await aiCall(content, PB_ASK_SYS, { say: m => { t.textContent = m; }, max: 4000 });
    if (t.id === 'pbAsk') { Q.list = (Q.list || []).concat([{ q, a: String(out.answer || '').trim() || '(no answer)', at: Date.now(), pages: pics.length }]); }
    else Q.draft = String(out.comment || '').trim();
    (cur.aiLog = cur.aiLog || []).push({ at: new Date().toISOString(), doc: t.id === 'pbAsk' ? 'Permit question' : 'Permit comment draft', pages: pics.map(p => p.file + ' p.' + p.n), mode: cur.aiUse === 'Redacted' && !cur.aiPublic ? 'redacted' : 'full', model: aiModel(), items: 1 });
    saveLetter(true, true); renderPermBatch(); }
  catch (x) { if (err) err.textContent = 'Not answered: ' + (x.message || x); busy(false, t.id === 'pbAsk' ? 'Ask' : 'Draft a permit comment from this'); }
});
document.addEventListener('change', e => { if (e.target && e.target.id === 'pbObs' && cur) { cur.permitQA = cur.permitQA || { list: [] }; cur.permitQA.obs = e.target.value; saveLetter(true, true); }
  if (e.target && e.target.id === 'pbQDraft' && cur && cur.permitQA) { cur.permitQA.draft = e.target.value; saveLetter(true, true); } });

