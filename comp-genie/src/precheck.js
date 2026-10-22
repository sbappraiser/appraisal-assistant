/* =====================================================================
   Pre-check before export (Oct 2026).
   1. The full-report file against Fannie Mae Appendix A-1: allowed values,
      number / date formats, text lengths, empty fields, names not in the spec.
   2. Her grid: value, comment, weights, open review flags, measure-it blanks…
   3. Her revision log: every reviewer request she logs becomes a check on
      every later report (a word to look for, or a tick).
   Nothing is changed for her – it lists what to fix, and she can export anyway.
   ===================================================================== */
const PRE_NS = 'http://www.mismo.org/residential/2009/schemas';
function a1Num(v, f) {   // "+6.0" = not negative, up to 6 digits, no decimals; "±2.6" may be negative
  if (!/^-?\d+(\.\d+)?$/.test(v)) return 'is not a plain number';
  const m = String(f || '').match(/^([+±])(\d+)\.(\d+)$/); if (!m) return '';
  if (m[1] === '+' && v.startsWith('-')) return 'cannot be negative';
  const [i, d = ''] = v.replace('-', '').split('.'); if (i.length > +m[2]) return `has more than ${m[2]} digits`; if (d.length > +m[3]) return +m[3] ? `has more than ${m[3]} decimals` : 'must be a whole number';
  return '';
}
function a1Date(v, f) { const rx = { 'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM': /^\d{4}-\d{2}$/, YYYY: /^\d{4}$/, 'YYYY-MM-DDThh:mm:ssZ': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/ }[f || 'YYYY-MM-DD'];
  return rx && !rx.test(v) ? `should be written ${f || 'YYYY-MM-DD'}` : ''; }
function precheckXML(xml) {
  const out = []; const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return [{ sev: 'Must fix', msg: 'The report file is not readable XML: ' + doc.getElementsByTagName('parsererror')[0].textContent.slice(0, 200) }];
  const unknown = new Map();
  const where = el => { // a short, readable location: the property and the containers above
    const chain = []; let e = el; let prop = '';
    while (e && e.nodeType === 1) { if (e.localName === 'PROPERTY' && !prop) { const t = e.getAttribute('ValuationUseType'); const L = e.getAttributeNS('http://www.w3.org/1999/xlink', 'label') || ''; prop = t === 'SubjectProperty' ? 'Subject' : (t || 'Property') + (L ? ' ' + L.replace(/^PROPERTY_?/, '#') : ''); }
      chain.unshift(e.localName); e = e.parentElement; }
    return (prop ? prop + ' · ' : '') + chain.slice(-3).join(' › ');
  };
  const walk = el => {
    const parent = el.parentElement; const key = (parent ? parent.localName : '') + '/' + el.localName; const kids = [...el.children];
    for (const a of el.attributes) { if (/^xmlns|^xsi:|^xlink:/.test(a.name) || a.prefix === 'xlink' || a.prefix === 'xmlns') continue;
      const s = A1[el.localName + '/@' + a.name]; if (s && s.e && !s.e.includes(a.value)) out.push({ sev: 'Must fix', msg: `${where(el)}: ${a.name} "${a.value}" is not an allowed value`, hint: 'Allowed: ' + s.e.slice(0, 12).join(', ') + (s.e.length > 12 ? '…' : '') }); }
    if (el.localName === 'EXTENSION' || el.localName === 'EXTENSION_SECTION') return;   // software extensions are outside the spec
    if (kids.length) { if (!A1[el.localName + '/'] && !A1[key] && el.namespaceURI === PRE_NS) unknown.set(el.localName, (unknown.get(el.localName) || 0) + 1); kids.forEach(walk); return; }
    const s = A1[key]; const v = (el.textContent || '').trim();
    if (!s) { if (A1[el.localName + '/'] || /^IMAGE\/Image(Improvement|PropertyUnit)$/.test(key)) return;   /* RELATIONSHIP carries only xlink attributes (a container in A-1); the iPad's ImageImprovement / ImagePropertyUnit photo links imported fine in SFREP (Oct 15 2026) */
      if (el.namespaceURI === PRE_NS) unknown.set(key, (unknown.get(key) || 0) + 1); return; }
    if (v === '') { out.push({ sev: 'Must fix', msg: `${where(el)}: ${el.localName} is empty`, hint: 'Leave the field out or fill it in.' }); return; }
    let bad = '';
    /* A-1 lists "Garage" as the only Other description for an OUTBUILDING's cost line; the dwelling's Other line is free-form (rows 2466 / 2495) */
    let dwOther = false; if (el.localName === 'ReplacementOrReproductionCostAreaTypeOtherDescription') { let a = el.parentElement; while (a && a.localName !== 'IMPROVEMENT_COST_AND_DEPRECIATED_VALUE') a = a.parentElement; dwOther = !a || !/OUTBUILDING|ADU/i.test(a.getAttributeNS('http://www.w3.org/1999/xlink', 'label') || ''); }
    if (s.e && !dwOther) { if (!s.e.includes(v)) bad = `"${v.slice(0, 60)}" is not an allowed value`; }
    else if (s.t === 'Numeric' || s.t === 'Amount') bad = a1Num(v, s.f);
    else if (s.t === 'Date' || s.t === 'Datetime') bad = a1Date(v, s.f);
    else if (s.t === 'Boolean') bad = /^(true|false)$/.test(v) ? '' : 'must be true or false';
    else if (s.t === 'String' && s.len && v.length > s.len) bad = `is ${v.length} characters (the limit is ${s.len})`;
    if (bad) out.push({ sev: 'Must fix', msg: `${where(el)}: ${el.localName} ${bad}`, hint: s.e ? 'Allowed: ' + s.e.slice(0, 12).join(', ') + (s.e.length > 12 ? '…' : '') : '' });
  };
  walk(doc.documentElement);
  unknown.forEach((n, k) => out.push({ sev: 'Check', msg: `${k} is not in the UAD 3.6 delivery spec (A-1)${n > 1 ? ` – ${n} times` : ''}`, hint: 'The import may ignore or reject it.' }));
  return out;
}
function precheckGrid(J) { if (!RC) return rcRun(() => precheckGrid(J));
  const out = []; const G = G0(J); const used = usedComps(J); const S = subjFacts(J);
  if (used.length < 3) out.push({ sev: 'Check', msg: `Only ${used.length} comp${used.length === 1 ? '' : 's'} on the grid – most clients expect at least 3 closed sales.` });
  if (blank(G.value)) out.push({ sev: 'Must fix', msg: 'No indicated value from the sales comparison approach on the grid.' });
  if (!String(G.note || '').trim()) out.push({ sev: 'Check', msg: 'The sales comparison comment is empty.' });
  if (String(G.note || '').length > 10000) out.push({ sev: 'Must fix', msg: `The sales comparison comment is ${G.note.length.toLocaleString()} characters – UAD 3.6 allows 10,000; only the first 10,000 are sent. Move the standard rate paragraphs to a general commentary section.` });
  if (!J.subject.eff) out.push({ sev: 'Must fix', msg: 'No effective date on the assignment.' });
  { const R = (J.report || {}), rn = typeof rv === 'function' ? rv(J, 'rightsNot') : R.rightsNot;
    if (R.allRights === 'false' && !String(rn || '').trim()) out.push({ sev: 'Must fix', msg: 'You answered No to "All rights included in the appraisal?" – describe the rights not included (report section, 540 characters).' });
    if (R.allRights === 'false' && R.rightsType === 'Other' && !String(R.rightsOther || '').trim()) out.push({ sev: 'Must fix', msg: 'Kind of rights not included is Other – describe it (33 characters) in the report section.' });
    if (R.allRights !== 'false' && String(rn || '').trim()) out.push({ sev: 'Check', msg: 'The order lists rights not appraised (from the deed), but "All rights included in the appraisal?" is Yes, so they are not reported. Answer No if those rights are not part of what you appraised.' }); }
  { const R = J.report || {}; const F = reportFrom(J);
    if (R.priorSvc !== 'true' && R.priorSvc !== 'false') out.push({ sev: 'Must fix', msg: 'Prior services: answer whether you performed services on this property in the past three years (Report details › Prior services).' + (F.priorHits.length ? ' Your records show: ' + F.priorHits.join('; ') + '.' : '') });
    if (R.priorSvc === 'true' && !String(R.priorSvcText || '').trim()) out.push({ sev: 'Must fix', msg: 'Prior services is Yes – describe the services (Report details).' });
    if (R.listedYear !== 'true' && R.listedYear !== 'false' && F.listedYear === undefined) out.push({ sev: 'Must fix', msg: 'Answer "Subject listed for sale in the past year?" (Report details › Prior services and certifications).' });
    [['sowCost', 'Cost approach developed?'], ['sowIncome', 'Income approach developed?'], ['sowRent', 'Rent schedule included?'], ['sowAddlUser', 'Intended users besides the client?']].forEach(([k, l]) => { if (R[k] !== 'true' && R[k] !== 'false' && F[k] === undefined) out.push({ sev: 'Must fix', msg: `Scope of work: answer "${l}" (Report details).` }); });
    if (blank(num(String(R.opinion || '').replace(/[$,\s]/g, '')))) out.push({ sev: 'Must fix', msg: 'Opinion of market value is blank (Report details › Value and reconciliation) – it is the value on page 1 of the report.', hint: blank(G.value) ? '' : 'The grey ' + money(G.value) + ' there is only your sales comparison value as a hint – type your final value.' });   /* her Oct 21 import: page 1 Opinion of Market Value was blank */
    if (blank(String(R.reconNote || '').trim())) out.push({ sev: 'Must fix', msg: 'Reconciliation comment is blank (Report details › Value and reconciliation) – 3.6 requires it (Reconciliation of Market Value).' });
    const RX = typeof RE === 'function' ? RE(J) : R;
    if (sowLen(RX) > 2500) out.push({ sev: 'Must fix', msg: `Additional scope of work is ${sowLen(RX).toLocaleString()} characters – 3.6 allows 2,500 for the scope, extraordinary assumptions and hypothetical conditions together (Report details).` });
    if (R.addlCert === 'true' && !certList(R).length) out.push({ sev: 'Must fix', msg: 'Additional appraiser certifications is Yes but none are typed (Report details › Prior services and certifications) – type them, or answer No.' });
    certList(R).forEach((t, i) => { if (t.length > CERT_MAX) out.push({ sev: 'Must fix', msg: `Additional certification ${i + 1} is ${t.length} characters – 3.6 allows ${CERT_MAX} each (Report details › Prior services and certifications); split it into two.` }); });
    { const vc = R.vcond || 'AsIs', ea = String(RX.eaNote || '').trim(), hc = String(RX.hcNote || '').trim();
      if (vc === 'AsIs' && (ea || hc)) out.push({ sev: 'Check', msg: `Market value condition is As is, but you have ${ea && hc ? 'extraordinary assumptions and hypothetical conditions' : ea ? 'an extraordinary assumption' : 'a hypothetical condition'} – Fannie's guide (26.009) says As is means none were used. Choose Subject to repair / inspection / completion per plans, or check the wording (Report details › Value and reconciliation).` });
      if ((vc === 'SubjectToRepair' || vc === 'SubjectToCompletionPerPlans') && !hc) out.push({ sev: 'Check', msg: 'Market value condition is subject to ' + (vc === 'SubjectToRepair' ? 'repair' : 'completion per plans') + ' – that is a hypothetical condition. SFREP prints the standard wording; add the specifics (which repairs, which plans) under Hypothetical conditions (Report details › Scope of work).' });
      if (vc === 'SubjectToInspection' && !ea) out.push({ sev: 'Check', msg: 'Market value condition is subject to inspection – that is an extraordinary assumption. Add which inspections and what is assumed under Extraordinary assumptions (Report details › Scope of work).' }); }
    if (R.sowAddlScope === 'true' && !sowAny(RX)) out.push({ sev: 'Must fix', msg: 'Additional scope of work is Yes but its text is blank (Report details › Scope of work) – type your extraordinary assumptions, hypothetical conditions or added scope, or answer No.' });
    { const N = typeof clientNeeds === 'function' ? clientNeeds(J) : []; const has = k => N.some(x => x.k === k);   /* the client's letter (her ask Oct 21 2026) */
      const cost = R.sowCost === 'true' || (blank(R.sowCost) && F.sowCost === true), inc = R.sowIncome === 'true' || (blank(R.sowIncome) && F.sowIncome === true), rent = R.sowRent === 'true' || (blank(R.sowRent) && F.sowRent === true);
      if (has('cost') && !cost) out.push({ sev: 'Must fix', msg: 'The client asks for the cost approach, but Cost approach developed is not Yes (Report details › Scope of work).' });
      if ((has('rcn') || has('rcnEach')) && !cost) out.push({ sev: 'Check', msg: 'The client asks for replacement cost new, but the cost approach is not developed – give it in the cost approach, or answer their request in a comment.' });
      if (has('noCost') && cost) out.push({ sev: 'Check', msg: 'The client says the cost approach is not required – you are developing it anyway (fine; or answer No in Report details › Scope of work).' });
      if (has('rcnEach')) out.push({ sev: 'Check', msg: 'The client asks for replacement cost new of EACH building – show each building on its own cost line and say so in the cost comment.' });
      if (has('acn')) out.push({ sev: 'Check', msg: 'The client asks for ACN (actual cash value) – state it in the cost approach comment (replacement cost new less depreciation).' });
      if (has('rent') && !rent) out.push({ sev: 'Must fix', msg: 'The client asks for a rent survey / rent schedule, but Rent schedule included is not Yes (Report details › Scope of work).' });
      if (has('ops') && !inc) out.push({ sev: 'Check', msg: 'The client asks for an operating income statement (216) – Income approach developed is not Yes (Report details › Scope of work).' });
      const d = N.find(x => x.k === 'docs'); if (d) out.push({ sev: 'Check', msg: 'The client asks you to ' + d.t.replace(/^Review \/ comment on/, 'review and comment on') + ' – say so in the report.' });
      const q = N.find(x => x.k === 'reqs'); if (q) out.push({ sev: 'Check', msg: q.t.replace(/^(\d+)/, '$1') + '.' }); }
    if (blank(rv(J, 'legal'))) out.push({ sev: 'Must fix', msg: 'Legal description is blank (Report details › Legal description) – 3.6 needs the text or an image of it; SFREP showed Text / Image red.' });
    if (blank(R.expLow) && blank(R.expHigh)) out.push({ sev: 'Check', msg: 'No reasonable exposure time entered (Report details › Value and reconciliation).' }); }
  const tot = used.map(c => compTotals(J, c)).filter(t => t.price); const adj = tot.map(t => t.adj);
  if (!blank(G.value) && adj.length) { const v = num(G.value), lo = Math.min(...adj), hi = Math.max(...adj); if (v < lo || v > hi) out.push({ sev: 'Check', msg: `Your value ${money(v)} is outside the adjusted range ${money(lo)} – ${money(hi)}.`, hint: 'Explain it in the comment, or look again at the adjustments.' }); }
  used.forEach(c => { const C = compFacts(c, J); const miss = [...(C.listing ? [['list price', C.listPrice]] : [['sale price', C.price], ['sale date', C.sale]]), ['living area', C.gla], ['quality', C.q], ['condition', C.c]].filter(x => blank(x[1])).map(x => x[0]);   /* a listing has no sale price or date yet */
    if (miss.length) out.push({ sev: 'Must fix', msg: `Comp ${c.use} (${compTitle(c)}): no ${miss.join(', ')}.` });
    ['q', 'c'].forEach(k => { if (C[k] && !/^[QC][1-6]$/i.test(String(C[k]).trim())) out.push({ sev: 'Must fix', msg: `Comp ${c.use}: ${k === 'q' ? 'quality' : 'condition'} "${C[k]}" is not a whole UAD rating – the low / mid / high tier stays on your grid, not in the UAD field.` }); });
    if (!/attach/i.test(String(C.attach || '')) || /detach/i.test(String(C.attach || ''))) { if (blank(C.constr)) out.push({ sev: 'Must fix', msg: `Comp ${c.use}: Construction method is blank – 3.6 requires it for a detached dwelling (Site built, Modular, Manufactured …). Type = in the box to copy the subject's.` }); }   /* her Oct 21 import showed "—" */
    /* her Oct 21 SFREP import (red boxes) and A-1: what 3.6 requires for every comp that only she can answer */
    { const A = C.streetAccess && typeof PICK !== 'undefined' ? pkParse(PICK.streetAccess, String(C.streetAccess)) : null; if (A && A.ok && A.vals.length && !A.surf) out.push({ sev: 'Must fix', msg: `Comp ${c.use}: Street surface is blank – 3.6 requires it with the street type (A-1 1800.0214). ▾ pick it on the Street access line, or type = to copy the subject's.` }); }
    { const L = typeof vwParse === 'function' ? vwParse(C.view) : []; if (L.length && L.some(v => !v.range)) out.push({ sev: 'Must fix', msg: `Comp ${c.use}: View range is blank (Full, Partial or Seasonal) – 3.6 requires it for each view (A-1 1800.0242). ▾ pick it on the View line, or type = to copy the subject's.` }); }
    { const E = String(C.energy || '').trim(); if (!E) out.push({ sev: 'Must fix', msg: `Comp ${c.use}: Energy efficient features is blank – 3.6 asks Yes / No for renewable energy, efficiency rating and green certification on every comp (A-1 1800.0106-0108). ▾ pick None, or what it has.` }); }
    ['extQ', 'extC', 'intQ', 'intC'].forEach(k => { const v = String(C[k] || '').trim(); if (v && !(k.endsWith('Q') ? /^Q[1-6]$/i : /^C[1-6]$/i).test(v)) out.push({ sev: 'Must fix', msg: `Comp ${c.use}: ${{ extQ: 'exterior quality', extC: 'exterior condition', intQ: 'interior quality', intC: 'interior condition' }[k]} "${v}" is not a UAD rating (${k.endsWith('Q') ? 'Q1–Q6' : 'C1–C6'}) – or leave it blank to send the overall rating.` }); });
    if (blank(C.usable) && !blank(S.usable)) out.push({ sev: 'Check', msg: `Comp ${c.use}: usable lot area is blank – measure it.` });
    if (!G.weights[c.id]) out.push({ sev: 'Check', msg: `Comp ${c.use}: no weight chosen for reconciliation.` }); });
  ['q', 'c'].forEach(k => { if (S[k] && !/^[QC][1-6]$/i.test(String(S[k]).trim())) out.push({ sev: 'Must fix', msg: `Subject ${k === 'q' ? 'quality' : 'condition'} "${S[k]}" is not a whole UAD rating.` }); });
  const open = gridReview(J).filter(f => !f.ok); if (open.length) out.push({ sev: 'Check', msg: `${open.length} grid review flag${open.length === 1 ? ' is' : 's are'} not marked OK yet.`, hint: open.slice(0, 3).map(f => f.msg).join(' · ') + (open.length > 3 ? ' …' : '') });
  J.comps.filter(c => c.notUsed && !c.use && c.notUsed.report && !(c.notUsed.reasons || []).length).forEach(c => out.push({ sev: 'Must fix', msg: `Considered, not used: ${compTitle(c)} has no reason chosen.` }));
  return out;
}
/* her revision log – reviewer requests that become checks */
let REVLOG = null;
async function revLoad() { if (REVLOG) return REVLOG; const r = await DB.get('kv', 'revlog'); REVLOG = (r && r.list) || []; return REVLOG; }
async function revSave() { await DB.put('kv', { id: 'revlog', list: REVLOG }); }
function precheckRev(J, xml) {
  const out = []; const cm = xml ? [...new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('*')].filter(e => /Comment/.test(e.localName) && !e.children.length).map(e => e.textContent).join(' ') : '';
  const text = (String(G0(J).note || '') + ' ' + cm).toLowerCase(); const done = J.revDone || {};   // her comments only, not every field value
  const R0 = reportFrom(J); const who = [R0.client, R0.lender, R0.amc].join(' ').toLowerCase();
  (REVLOG || []).filter(r => r.on !== false && (!r.client || who.includes(r.client.toLowerCase()))).forEach(r => {   // a request from one client only checks that client's reports
    if (r.word) { if (!text.includes(r.word.toLowerCase())) out.push({ sev: 'Check', msg: `Revision log: ${r.text}`, hint: `“${r.word}” is not in the report yet.`, rev: r.id }); }
    else if (!done[r.id]) out.push({ sev: 'Check', msg: `Revision log: ${r.text}`, hint: 'Tick it once it is handled in this report.', rev: r.id, tick: true });
  });
  return out;
}
function precheckHTML(J) {
  const T = app.pre && app.pre.job === J.id ? app.pre : null; const L = REVLOG || [];
  const list = T ? T.items : [];
  const must = list.filter(x => x.sev === 'Must fix'), chk = list.filter(x => x.sev !== 'Must fix');
  const row = (x, i) => { const g = preGo(J, x); return `<div class="rv${g ? ' rvgo' : ''}"${g ? ` data-prego="${i}" title="Click to go there"` : ''}><span class="rvs rv-${x.sev === 'Must fix' ? 'Mustfix' : 'Check'}">${esc(x.sev)}</span><span class="rvm">${esc(x.msg)}${x.hint ? `<br><small>${esc(x.hint)}</small>` : ''}${g ? ` <span class="rvlink">→ ${esc(g.label)}</span>` : ''}</span>${x.tick ? `<label class="tick"><input type="checkbox" data-revdone="${esc(x.rev)}"> Done in this report</label>` : ''}</div>`; };
  return `<h2>Pre-check <small>before you export</small></h2>
    <p class="help">Checks the full-report file against Fannie Mae's UAD 3.6 delivery spec (Appendix A-1: allowed values, number and date formats, lengths, empty fields), then your grid, then your revision log. Nothing is changed for you.</p>
    <div class="row"><button class="btn primary" data-act="pre-run">${T ? 'Check again' : 'Run the pre-check'}</button>${T ? `<small>${must.length} must fix · ${chk.length} to check${T.xmlErr ? ' · ' + esc(T.xmlErr) : ''}</small>` : ''}</div>
    ${T ? (list.length ? must.map(x => row(x, list.indexOf(x))).join('') + chk.map(x => row(x, list.indexOf(x))).join('') : '<p class="ok">Nothing found. Ready to export.</p>') : ''}
    ${T && T.wantExport ? `<div class="row"><button class="btn" data-act="x-full-anyway">${must.length ? 'Export anyway (I will fix it in SFREP)' : 'Export now'}</button></div>` : ''}
    <details class="revlog"${L.length && !app.revOpen ? '' : ' open'} data-revopen="1"><summary>Your revision log (${L.length}) – reviewer requests that become checks</summary>
      <p class="help">When a client or reviewer asks for a change, log it here. From then on every pre-check reminds you. If you give a word or phrase, I look for it in the report's comments; otherwise you tick it per report.</p>
      ${L.map(r => `<div class="rev"><label><input type="checkbox" data-revon="${esc(r.id)}" ${r.on !== false ? 'checked' : ''}> ${esc(r.text)}</label>${r.word ? ` <small>looks for “${esc(r.word)}”</small>` : ''}${r.client ? ` <small>· ${esc(r.client)}</small>` : ''} <small>${esc(r.added || '')}</small> <button class="btn sm" data-revdel="${esc(r.id)}">Remove</button></div>`).join('')}
      <div class="row"><input class="txt" id="revText" placeholder="What they asked, e.g. Explain why the view adjustment is over 10%"><input class="txt sm" id="revWord" placeholder="Word to look for (optional)"><input class="txt sm" id="revClient" placeholder="Only for this client (optional)"><button class="btn" data-act="rev-add">Add</button></div>
    </details>`;
}
async function precheckRun(J, wantExport) {
  await revLoad(); let items = [], xmlErr = '', xml = '';
  try { const r = await buildFullReport(J); if (r.err) xmlErr = r.err; else { xml = r.xml; items = items.concat(precheckXML(xml)); } } catch (e) { xmlErr = 'Could not build the report file: ' + e.message; }
  items = items.concat(precheckGrid(J), precheckRev(J, xml));
  if (xmlErr) items.unshift({ sev: 'Must fix', msg: xmlErr });
  app.pre = { job: J.id, items, xmlErr, wantExport: !!wantExport, at: Date.now() };
  return app.pre;
}

/* her ask (Oct 21 2026): each pre-check line takes her to the place to fix it – the step, then the box (scrolled to and outlined) */
function preGo(J, x) { const m = String(x.msg || ''); const byUse = n => usedComps(J).find(c => +c.use === +n);
  let r;
  if ((r = m.match(/^Comp (\d+): Construction method/))) { const c = byUse(r[1]); if (c) return { stage: 'workbook', sel: `[data-gfact="${c.id}|constr"]`, label: 'comp ' + c.use + ' construction method' }; }
  if ((r = m.match(/^Comp (\d+): (Street surface|View range|Energy efficient|exterior quality|exterior condition|interior quality|interior condition)/))) { const c = byUse(r[1]); const id = { 'Street surface': 'streetAccess', 'View range': 'view', 'Energy efficient': 'energy', 'exterior quality': 'extQ', 'exterior condition': 'extC', 'interior quality': 'intQ', 'interior condition': 'intC' }[r[2]]; if (c) return { stage: 'workbook', sel: `[data-gfact="${c.id}|${id}"]`, show: id, label: 'comp ' + c.use + ' ' + r[2].toLowerCase() }; }
  if ((r = m.match(/^Comp (\d+)\b/))) { const c = byUse(r[1]); if (!c) return null;
    if (/weight/i.test(m)) return { stage: 'workbook', sel: `[data-gweight="${c.id}"]`, label: 'weight, Workbook grid' };
    if (/usable lot/i.test(m)) return { stage: 'workbook', sel: `[data-gfact="${c.id}|usable"]`, label: 'comp ' + c.use + ' usable lot, Workbook grid' };
    if (/quality/i.test(m) && !/no /i.test(m)) return { stage: 'workbook', sel: `[data-gfact="${c.id}|q"]`, label: 'comp ' + c.use + ' quality' };
    if (/condition/i.test(m) && !/no /i.test(m)) return { stage: 'workbook', sel: `[data-gfact="${c.id}|c"]`, label: 'comp ' + c.use + ' condition' };
    return { stage: 'workbook', comp: c.id, label: 'comp ' + c.use + ' in the Workbook' }; }
  if ((r = m.match(/SALESCOMP(\d+)/))) { const c = byUse(r[1]); if (c) return { stage: 'workbook', comp: c.id, label: 'comp ' + c.use + ' in the Workbook' }; }
  if ((r = m.match(/^Considered, not used: (.+) has no reason/))) { const c = J.comps.find(k => compTitle(k) === r[1]); return { stage: 'final', sel: c ? `[data-nu="${c.id}|report"]` : '#nuCard', up: '.nu', label: 'its reasons (Analyzed – not used)' }; }
  if (/grid review flag/i.test(m)) return { stage: 'workbook', sel: '#gridCard .review', label: 'Review list under the grid' };
  if (/sales comparison comment|indicated value from the sales comparison|is outside the adjusted range/i.test(m)) return { stage: 'workbook', sel: /comment/i.test(m) ? 'textarea[data-gnote]' : '[data-gvalue]', label: 'under the Workbook grid' };
  if (/All rights included|Kind of rights|rights not appraised/i.test(m)) return { stage: 'final', text: 'All rights included', label: 'Report details' };
  if (/Additional appraiser certifications|Additional certification \d/i.test(m)) return { stage: 'final', text: 'Prior services and certifications', label: 'Report details' };
  if (/^Market value condition is/i.test(m)) return { stage: 'final', text: /Hypothetical conditions|Extraordinary assumptions \(/.test(m) ? 'Scope of work' : 'Value and reconciliation', label: 'Report details' };
  if (/Prior services|listed for sale in the past year/i.test(m)) return { stage: 'final', text: 'Prior services and certifications', label: 'Report details' };
  if (/Scope of work/i.test(m)) return { stage: 'final', text: 'Scope of work', label: 'Report details' };
  if (/^The client (asks|says)/i.test(m)) return { stage: 'final', text: 'Scope of work', label: 'Report details' };
  if (/Reconciliation comment is blank/i.test(m)) return { stage: 'final', text: 'Reconciliation comment', label: 'Report details' };
  if (/Additional scope of work is Yes/i.test(m)) return { stage: 'final', text: 'Additional scope of work – text', label: 'Report details' };
  if (/Legal description is blank/i.test(m)) return { stage: 'final', text: 'Legal description', label: 'Report details' };
  if (/Opinion of market value/i.test(m)) return { stage: 'final', text: 'Opinion of market value', label: 'Report details' };
  if ((r = m.match(/^Comp (\d+): Construction method/))) { const c = byUse(r[1]); if (c) return { stage: 'workbook', sel: `[data-gfact="${c.id}|constr"]`, label: 'comp ' + c.use + ' construction method' }; }
  if (/exposure time/i.test(m)) return { stage: 'final', text: 'Value and reconciliation', label: 'Report details' };
  if (/Workfile package/i.test(m)) return { stage: 'micro', sel: '#drop', label: 'drop it here (Comps considered)' };
  if (/effective date/i.test(m)) return { stage: 'micro', sel: '[data-subj="eff"]', label: 'Subject card' };
  if (/COST_APPROACH|REPLACEMENT_REPRODUCTION|IMPROVEMENT_COST|SiteEstimated|Cost approach/i.test(m)) return { stage: 'cost', sel: '#costCard', label: 'Cost approach' };
  if (/^Subject ·/.test(m)) return { stage: 'final', sel: '#reportCard', label: 'Report details (or fix it on the iPad)' };
  return null; }
document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-prego]'); if (!el || !app.job || e.target.closest('input,label,button')) return;
  const J = app.job, x = ((app.pre || {}).items || [])[+el.dataset.prego]; const g = x && preGo(J, x); if (!g) return;
  J.stage = g.stage; if (g.comp) WB.cur = g.comp; if (g.show && !lineOn(g.show, J)) { const G = G0(J); G.lines = G.lines || {}; G.lines[g.show] = true; }   /* the line it points to may be hidden – show it */ save(); render.top = true; render();
  setTimeout(() => { let t = null;
    if (g.comp) t = document.querySelector(`#gridCard thead th[data-wbcol="${g.comp}"]`);
    if (!t && g.sel) t = document.querySelector(g.sel); if (t && g.up && t.closest(g.up)) t = t.closest(g.up);
    if (!t && g.text) t = [...document.querySelectorAll('#reportCard h3, #reportCard summary, #reportCard label, #reportCard span')].find(e => e.textContent.trim().startsWith(g.text));
    if (!t) return; const d = t.closest('details'); if (d) d.open = true;
    if (g.comp && typeof wbReveal === 'function') { try { wbReveal(t); } catch (er) {} }   /* slide the grid sideways to that comp */
    t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('goflash'); setTimeout(() => t.classList.remove('goflash'), 2600);
    const f = t.matches('input,select,textarea') ? t : t.querySelector && t.querySelector('input,select,textarea'); if (f && !g.comp) setTimeout(() => f.focus({ preventScroll: true }), 500); }, 120); });
