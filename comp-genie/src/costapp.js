/* =====================================================================
   Cost approach (her request, Oct 20 2026). Her cost source is her own database of local contractor budgets
   (indexed with the CCCI), with the BOE Assessors' Handbook 531 as a check; the site value comes from the land
   sales card. Every rate, age and amount is hers – the page only suggests (her medians) and adds up.
   UAD 3.6: APPROACH_TO_VALUE / COST_APPROACH / COST_APPROACH_DETAIL (A-1 fields). The line-by-line cost new and the
   depreciation breakdown go to SFREP when the UAD 3.6 schema shows where they belong (asked her for the subschema).
   ===================================================================== */
const COST_AREA = [['StandardFinishedAreaAboveGrade', 'Living area above grade'], ['StandardFinishedAreaBelowGrade', 'Finished below grade'], ['UnfinishedAreaBelowGrade', 'Unfinished below grade'],
  ['UnfinishedAreaAboveGrade', 'Unfinished above grade'], ['NonStandardFinishedAreaAboveGrade', 'Non-standard finished above grade'], ['NonStandardFinishedAreaBelowGrade', 'Non-standard finished below grade'],
  ['AttachedGarage', 'Attached garage'], ['BuiltInGarage', 'Built-in garage'], ['Carport', 'Carport'], ['Foundation', 'Foundation'], ['Other', 'Other (ADU, guest house, detached garage, outbuilding …)']];
function costMedians() { const C = app.costDb; if (!C) return {}; const P = C.projects.filter(p => !isRemodel(p)); const v = k => median(P.map(p => num(p.s[k])));
  return { bd: v('Building direct $/SF GLA – indexed'), ex: v('Existing-site basis $/SF GLA – indexed'), gar: median(C.projects.map(p => num(p.s['Garage – $/SF garage']))), pool: median(C.projects.map(p => num(p.s['Pool & spa']))), land: median(C.projects.map(p => num(p.s['Landscaping & irrigation']))), n: P.length }; }
function costJob(J) {
  if (J.cost) return J.cost; const S = subjFacts(J), I = J.subject.insp || {}, K = I.sk || {}; const yr = num(S.year); const age = yr ? Math.max(0, new Date().getFullYear() - yr) : null;
  const L = [{ id: uid(), t: 'StandardFinishedAreaAboveGrade', label: 'Living area above grade', area: num(S.gla) || null, rate: null, dw: true }];
  if (num(S.bsmt)) L.push({ id: uid(), t: 'StandardFinishedAreaBelowGrade', label: 'Finished below grade', area: num(S.bsmt), rate: null, dw: true });
  if (num(S.bsmtUnf)) L.push({ id: uid(), t: 'UnfinishedAreaBelowGrade', label: 'Unfinished below grade', area: num(S.bsmtUnf), rate: null, dw: true });
  (K.gar || []).forEach(g => L.push({ id: uid(), t: /carport/i.test(g.name) ? 'Carport' : /detach/i.test(g.name) ? 'Other' : 'AttachedGarage', label: g.name || 'Garage', area: num(g.sf), rate: null, dw: !/detach/i.test(g.name) }));
  if (!(K.gar || []).length && num(S.garage)) L.push({ id: uid(), t: 'AttachedGarage', label: 'Garage (' + S.garage + ' spaces) – type its sq ft', area: null, rate: null, dw: true });
  (K.adu || []).forEach(a => L.push({ id: uid(), t: 'Other', label: a.name || 'ADU', area: num(a.sf), rate: null, dw: false }));
  (K.ob || []).forEach(a => L.push({ id: uid(), t: 'Other', label: a.name || 'Outbuilding', area: num(a.sf), rate: null, dw: false }));
  const site = []; if (/pool/i.test(String(S.pool || ''))) site.push({ id: uid(), desc: 'Pool and spa', amt: null }); site.push({ id: uid(), desc: 'Landscaping, hardscape, driveway, fencing', amt: null });
  return (J.cost = { type: 'Replacement', method: 'ComparativeUnit', lines: L, soft: null, effAge: null, actualAge: age, life: 60, physPct: null, funcAmt: 0, extAmt: 0, obPct: null, site, siteMethod: 'SalesComparison', value: null, comment: null });
}
function costCalc(J) {
  const K = costJob(J); const lineCost = l => !blank(l.cost) ? +l.cost : (num(l.area) && num(l.rate) ? num(l.area) * num(l.rate) : 0);
  const dw = K.lines.filter(l => l.dw).reduce((t, l) => t + lineCost(l), 0) + (num(K.soft) || 0), ob = K.lines.filter(l => !l.dw).reduce((t, l) => t + lineCost(l), 0);
  const phys = !blank(K.physPct) ? +K.physPct : (num(K.effAge) !== null && num(K.life) ? Math.min(100, num(K.effAge) / num(K.life) * 100) : 0); const obp = !blank(K.obPct) ? +K.obPct : phys;
  const physAmt = dw * phys / 100, depDw = Math.max(0, dw - physAmt - (num(K.funcAmt) || 0) - (num(K.extAmt) || 0)), depOb = ob * (1 - obp / 100);
  const siteImp = K.site.reduce((t, s) => t + (num(s.amt) || 0), 0); const land = num((J.land || {}).value) || 0;
  const ind = land + depDw + depOb + siteImp; return { dw, ob, phys, obp, physAmt, depDw, depOb, siteImp, land, ind, lineCost, rounded: Math.round(ind / 1000) * 1000 };
}
function costDraft(J) {
  const K = costJob(J), X = costCalc(J), M = costMedians(); const pct = v => (Math.round(v * 10) / 10) + '%';
  let t = `The cost approach was developed using ${K.type === 'Reproduction' ? 'reproduction' : 'replacement'} cost new by the ${({ ComparativeUnit: 'comparative unit', UnitInPlace: 'unit-in-place', QuantitySurvey: 'quantity survey', Other: 'cost' })[K.method]} method.`;
  t += ` Cost new is based on local contractor budgets${M.n ? ` (${M.n} new-construction projects)` : ''} brought to the effective date with the California Construction Cost Index, and checked against the California State Board of Equalization Assessors' Handbook 531.`;
  const liv = K.lines.find(l => l.t === 'StandardFinishedAreaAboveGrade'); if (liv && num(liv.rate)) t += ` The living area is estimated at ${money(liv.rate)} per square foot.`;
  if (X.dw) t += ` Physical depreciation was estimated by the age-life method${num(K.effAge) !== null && num(K.life) ? ` (effective age of ${K.effAge} years and a total economic life of ${K.life} years, ${pct(X.phys)})` : ` (${pct(X.phys)})`}.`;
  t += num(K.funcAmt) ? ` Functional obsolescence of ${money(K.funcAmt)} was deducted.` : ' No functional obsolescence was noted.'; t += num(K.extAmt) ? ` External obsolescence of ${money(K.extAmt)} was deducted.` : ' No external obsolescence was noted.';
  if (X.siteImp) t += ` Site improvements are included at their depreciated (as is) value of ${money(X.siteImp)}.`;
  t += ' The site value is explained in the site value comment. The cost approach is given consideration as support for the sales comparison approach.';
  return t.slice(0, 5000);
}
function costHTML(J) {
  const o = typeof orderOf === 'function' ? orderOf(J) : null; const want = (R0(J) || {}).sowCost; const on = J.costOn ?? (want === 'true' || (o && o.apCost));
  if (!on) return `<div class="row"><h2 style="margin:0">Cost approach</h2><span class="grow"></span><button class="btn sm" data-cost="on">Develop the cost approach</button></div><p class="help">Not developed for this assignment (the order says ${o && o.apCost ? 'it is' : 'it is not'} needed).</p>`;
  const K = costJob(J), X = costCalc(J), M = costMedians(); const LD = landJob(J);
  const nf = v => blank(v) || v === '' ? '' : Math.round(+v).toLocaleString();
  const rows = K.lines.map(l => `<tr><td><select data-cl="${l.id}|t">${COST_AREA.map(([k, n]) => `<option value="${k}" ${l.t === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><input class="txt sm" data-cl="${l.id}|label" value="${esc(l.label || '')}" style="width:16em"></td>
    <td class="r"><input class="txt xs num" data-cl="${l.id}|area" value="${nf(l.area)}" inputmode="numeric" style="width:6em"></td><td class="r"><input class="txt xs num" data-cl="${l.id}|rate" value="${nf(l.rate)}" inputmode="decimal" style="width:6em" placeholder="${l.t === 'StandardFinishedAreaAboveGrade' && M.bd ? Math.round(M.bd) : /Garage|Carport/.test(l.t) && M.gar ? Math.round(M.gar) : ''}"></td>
    <td class="r"><input class="txt xs num" data-cl="${l.id}|cost" value="${nf(l.cost)}" placeholder="${nf(X.lineCost({ ...l, cost: null }) || '')}" inputmode="numeric" style="width:8em"></td><td><label class="check"><input type="checkbox" data-cl="${l.id}|dw" ${l.dw ? 'checked' : ''}> dwelling</label></td><td><button class="btn xs" data-cldel="${l.id}">✕</button></td></tr>`).join('');
  const srow = K.site.map(s => `<tr><td><input class="txt sm" data-cs="${s.id}|desc" value="${esc(s.desc || '')}" style="width:22em" maxlength="96"></td><td class="r"><input class="txt xs num" data-cs="${s.id}|amt" value="${nf(s.amt)}" inputmode="numeric" style="width:8em"></td><td><button class="btn xs" data-csdel="${s.id}">✕</button></td></tr>`).join('');
  const cm = K.comment != null ? K.comment : costDraft(J);
  return `<div class="row"><h2 style="margin:0">Cost approach <small>UAD 3.6 Cost Approach · your rates, ages and amounts</small></h2><span class="grow"></span><button class="btn sm ghost" data-cost="off">Not developed</button></div>
    <div class="row"><label>Cost <select data-ck="type">${['Replacement', 'Reproduction'].map(v => `<option ${K.type === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Method <select data-ck="method">${[['ComparativeUnit', 'Comparative unit ($/sq ft)'], ['UnitInPlace', 'Unit in place'], ['QuantitySurvey', 'Quantity survey'], ['Other', 'Other']].map(([v, n]) => `<option value="${v}" ${K.method === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <span class="help">${M.n ? `Your budgets: median building direct ${money(M.bd)}/sf · existing-site basis ${money(M.ex)}/sf · garage ${money(M.gar)}/sf (${M.n} new-construction projects, CCCI-indexed) – the grey numbers.` : 'Drop your Construction_Cost_Database.xlsx to see your medians.'} BOE check: the Construction costs tab above.</span></div>
    <h3>Site value</h3><div class="row"><label>Site value $<input class="txt num" data-landv="1" value="${LD.value ? Math.round(LD.value).toLocaleString() : ''}" inputmode="numeric" style="width:10em"></label>
      <label>Method <select data-ck="siteMethod">${[['SalesComparison', 'Sales comparison'], ['Extraction', 'Extraction'], ['Allocation', 'Allocation'], ['Other', 'Other']].map(([v, n]) => `<option value="${v}" ${K.siteMethod === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <span class="help">Same value and comment as the land sales card (tick the land sales there).</span></div>
    <h3>Cost new</h3><div class="tablewrap"><table class="tbl cost"><thead><tr><th>Item</th><th class="r">Sq ft</th><th class="r">$ / sq ft</th><th class="r">Cost new</th><th></th><th></th></tr></thead><tbody>${rows}
      <tr><td>Soft costs and fees (permits, design, engineering, utility and school fees)</td><td></td><td></td><td class="r"><input class="txt xs num" data-ck="soft" value="${nf(K.soft)}" inputmode="numeric" style="width:8em"></td><td></td><td></td></tr>
      <tr class="tot"><td><b>Total cost new</b> <small>dwelling ${money(X.dw)} · outbuildings / ADU ${money(X.ob)}</small></td><td></td><td></td><td class="r"><b>${money(X.dw + X.ob)}</b></td><td></td><td></td></tr></tbody></table></div>
    <div class="row"><button class="btn sm" data-cladd="1">+ Add a line</button><span class="help">Untick “dwelling” for an ADU, guest house or outbuilding (it is depreciated with its own percent below).</span></div>
    <h3>Depreciation</h3><div class="row"><label>Effective age <input class="txt xs num" data-ck="effAge" value="${K.effAge ?? ''}" style="width:4em"> years</label>${K.actualAge != null ? `<small class="muted">actual age ${K.actualAge}</small>` : ''}<label>Total economic life <input class="txt xs num" data-ck="life" value="${K.life ?? ''}" style="width:4em"> years</label>
      <label>Physical % <input class="txt xs num" data-ck="physPct" value="${K.physPct ?? ''}" placeholder="${(Math.round(X.phys * 10) / 10)}" style="width:5em"></label><label>Functional $ <input class="txt xs num" data-ck="funcAmt" value="${nf(K.funcAmt)}" style="width:7em"></label><label>External $ <input class="txt xs num" data-ck="extAmt" value="${nf(K.extAmt)}" style="width:7em"></label>
      <label>Outbuildings / ADU physical % <input class="txt xs num" data-ck="obPct" value="${K.obPct ?? ''}" placeholder="${(Math.round(X.obp * 10) / 10)}" style="width:5em"></label></div>
    <p class="help">Age-life: effective age ÷ total economic life (BOE uses a 55–60 year life for single-family homes). Leave Physical % empty to use the age-life figure, or type your own.</p>
    <h3>Site improvements (as is)</h3><table class="tbl"><tbody>${srow}</tbody></table><div class="row"><button class="btn sm" data-csadd="1">+ Add a site improvement</button>${M.pool || M.land ? `<span class="help">Your budgets: pool &amp; spa median ${money(M.pool)} · landscaping &amp; irrigation median ${money(M.land)} (new – depreciate them).</span>` : ''}</div>
    <div class="gsum"><div><span>Site value</span><b>${money(X.land)}</b></div><div><span>Depreciated dwelling</span><b>${money(X.depDw)}</b></div><div><span>Depreciated ADU / outbuildings</span><b>${money(X.depOb)}</b></div><div><span>Site improvements as is</span><b>${money(X.siteImp)}</b></div><div><span>Indicated value</span><b>${money(X.ind)}</b></div>
      <label><span>Your value by the cost approach</span><input class="txt" data-ck="value" value="${nf(K.value)}" placeholder="${X.rounded ? X.rounded.toLocaleString() : '$'}" inputmode="numeric"></label></div>
    <label class="fld"><span>Cost approach comment <small>${cm.length.toLocaleString()} / 5,000 characters – read and edit it</small> ${typeof cmtBtn === 'function' ? cmtBtn('textarea[data-ck=comment]') : ''}</span><textarea class="txt" rows="6" data-ck="comment">${esc(cm)}</textarea></label>
    <div class="row"><button class="btn sm ghost" data-cost="redraft">Write it again from the figures</button></div>
    <p class="help">Goes into the Full report for SFREP: site value, method and comment, cost type and method, depreciated dwelling and outbuildings, site improvements, depreciation method and your value.</p>`;
}
function costRedraw() { const c = $('#costCard'); if (c && app.job) { const y = window.scrollY; c.innerHTML = costHTML(app.job); window.scrollTo(0, y); } }
document.addEventListener('click', e => { const t = e.target.closest('[data-cost],[data-cladd],[data-cldel],[data-csadd],[data-csdel]'); if (!t || !app.job) return; const J = app.job; const K = costJob(J);
  if (t.dataset.cost === 'on') J.costOn = true; else if (t.dataset.cost === 'off') J.costOn = false; else if (t.dataset.cost === 'redraft') K.comment = null;
  else if (t.dataset.cladd) K.lines.push({ id: uid(), t: 'Other', label: '', area: null, rate: null, dw: true }); else if (t.dataset.cldel) K.lines = K.lines.filter(l => l.id !== t.dataset.cldel);
  else if (t.dataset.csadd) K.site.push({ id: uid(), desc: '', amt: null }); else if (t.dataset.csdel) K.site = K.site.filter(s => s.id !== t.dataset.csdel);
  save(); costRedraw(); });
document.addEventListener('change', e => { const t = e.target; if (!app.job || !(t.dataset.ck || t.dataset.cl || t.dataset.cs)) return; const K = costJob(app.job); const n = v => { const x = num(String(v).replace(/[$,%\s]/g, '')); return x; };
  if (t.dataset.ck) { const k = t.dataset.ck; K[k] = ['type', 'method', 'siteMethod', 'comment'].includes(k) ? t.value : (t.value.trim() === '' ? null : n(t.value)); }
  if (t.dataset.cl) { const [id, k] = t.dataset.cl.split('|'); const l = K.lines.find(x => x.id === id); if (l) l[k] = k === 'dw' ? t.checked : ['t', 'label'].includes(k) ? t.value : (t.value.trim() === '' ? null : n(t.value)); }
  if (t.dataset.cs) { const [id, k] = t.dataset.cs.split('|'); const s = K.site.find(x => x.id === id); if (s) s[k] = k === 'desc' ? t.value : (t.value.trim() === '' ? null : n(t.value)); }
  save(); if (t.dataset.ck !== 'comment') costRedraw(); });
/* into the SFREP file (writeReportXML helpers) */
function costXML(J, VR, child, set) {
  if (!(J.costOn ?? false) && !J.cost) return; if (J.costOn === false) return; const K = costJob(J), X = costCalc(J); const LD = landJob(J);
  const CA = child(child(VR, 'APPROACH_TO_VALUE'), 'COST_APPROACH'); [...CA.children].filter(k => k.localName === 'VALUATION_APPROACH_EXCLUSION_REASONS').forEach(k => k.remove());
  const d = child(CA, 'COST_APPROACH_DETAIL'); const cm = K.comment != null ? K.comment : costDraft(J); const site = LD.comment != null ? LD.comment : (LD.lastDraft || '');
  // A-1 order is alphabetical inside COST_APPROACH_DETAIL
  set(d, 'CostAnalysisCommentDescription', cm.slice(0, 5000)); set(d, 'CostAnalysisType', K.type); set(d, 'CostMethodType', K.method);
  if (X.dw) set(d, 'DepreciatedCostDwellingsTotalAmount', Math.round(X.depDw)); if (X.ob) set(d, 'DepreciatedCostOutbuildingsTotalAmount', Math.round(X.depOb));
  set(d, 'DepreciationMethodType', 'EconomicAgeLife'); if (X.land) set(d, 'SiteEstimatedValueAmount', Math.round(X.land)); if (site) set(d, 'SiteEstimatedValueCommentDescription', site.slice(0, 2500));
  if (X.siteImp) set(d, 'SiteOtherImprovementsAsIsAmount', Math.round(X.siteImp)); set(d, 'SiteValuationMethodType', K.siteMethod || 'SalesComparison');
  const v = num(K.value) || X.rounded; if (v) set(d, 'ValueIndicatedByCostApproachAmount', Math.round(v));
}

document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.landv) setTimeout(costRedraw, 50); });
