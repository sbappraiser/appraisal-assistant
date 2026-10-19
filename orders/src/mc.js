/* =====================================================================
   1004MC – Market Conditions Addendum (UAD 2.6 / legacy forms), from the Search Criteria search
   (Market tab box 2; box 1 until box 2 is loaded). Same listings she ticked on the Market tab.
   Periods: prior 7–12 months, prior 4–6 months, current 3 months (ending on the effective date).
   Active listings and their DOM are counted as of the END of each period (dates in the export;
   for past period ends DOM = period end − list date). Sale-to-list = sale price ÷ final list price.
   Trend rule (stated on the page): the current 3 months compared with the prior 7–12 months –
   more than 5% higher = Increasing, more than 5% lower = Declining, otherwise Stable; sales counts
   are compared per month. Fewer than 3 sales (or listings) in either period → "few – your call".
   Her rule: price per square foot is NOT a trend measure, so it is not on this page.
   ===================================================================== */
const MC_ROWS = [
  ['sales', 'Total # of comparable sales (settled)', 'n'], ['absorb', 'Absorption rate (total sales / months)', 'r'], ['listings', 'Total # of comparable active listings', 'n'],
  ['supply', 'Months of housing supply (total listings / absorption rate)', 'r'], ['medSale', 'Median comparable sale price', '$'], ['saleDom', 'Median comparable sales days on market', 'n'],
  ['medList', 'Median comparable list price', '$'], ['listDom', 'Median comparable listings days on market', 'n'], ['stl', 'Median sale price as % of list price', '%']];
const MC_TREND = ['Increasing', 'Stable', 'Declining'];
function mcSrc() { const mi = MI(); return (mi.rows || []).length ? mi : M(); }
function mcCompute() {
  const src = mcSrc(), eff = mkEff(), nearToday = daysBetween(eff, todayISO()) <= 3;
  const use = r => !(src.exclude || {})[r.mls] && (!src.types || src.types.includes(r.typ));
  const rows = (src.rows || []).filter(use);
  const P = [['p1', 'Prior 7–12 months', isoAddMonths(eff, -12), isoAddMonths(eff, -6), 6], ['p2', 'Prior 4–6 months', isoAddMonths(eff, -6), isoAddMonths(eff, -3), 3], ['p3', 'Current – 3 months', isoAddMonths(eff, -3), eff, 3]];
  const per = P.map(([k, label, from, to, mo]) => {
    const S = rows.filter(r => r.saleDate && r.saleDate > from && r.saleDate <= to && r.salePrice);
    const A = rows.filter(r => statusAt(r, to) === 'active');
    const aDom = A.map(r => to === eff && nearToday && r.dom != null ? r.dom : r.listDate ? daysBetween(r.listDate, to) : null);
    const ratio = S.filter(r => r.listPrice).map(r => r.salePrice / r.listPrice);
    const cKnown = S.filter(r => r.conc === 'Y' || r.conc === 'N');
    const v = { sales: S.length, absorb: S.length / mo, listings: A.length, medSale: median(S.map(r => r.salePrice)), saleDom: median(S.map(r => r.cdom ?? r.dom)), medList: median(A.map(r => r.listPrice)), listDom: median(aDom), stl: ratio.length ? median(ratio) * 100 : null };
    v.supply = v.absorb > 0 ? v.listings / v.absorb : null;
    return { k, label, from, to, mo, v, nS: S.length, nA: A.length, conc: cKnown.filter(r => r.conc === 'Y').length, concKnown: cKnown.length, reo: S.filter(r => r.distressed).length, reoA: A.filter(r => r.distressed).length };
  });
  const trend = {}; const [a, , c] = per;
  MC_ROWS.forEach(([key]) => { const x = a.v[key], y = c.v[key];
    const nBase = ['listings', 'medList', 'listDom'].includes(key) ? Math.min(a.nA, c.nA) : ['supply'].includes(key) ? Math.min(a.nS, c.nS, a.nA, c.nA) : Math.min(a.nS, c.nS);
    let t = '', why = '';
    if (x == null || y == null) { why = 'not enough data'; }
    else { const ch = key === 'stl' ? y - x : x === 0 ? (y > 0 ? 100 : 0) : (y / x - 1) * 100; const lim = 5; t = ch > lim ? 'Increasing' : ch < -lim ? 'Declining' : 'Stable'; why = key === 'stl' ? (ch >= 0 ? '+' : '') + Math.round(ch * 10) / 10 + ' points' : (ch >= 0 ? '+' : '') + Math.round(ch) + '%'; }
    if (nBase < 3) why = (why ? why + ' · ' : '') + 'few – your call';
    trend[key] = { t: t || 'Stable', why, few: nBase < 3 || x == null || y == null }; });
  // the 2.6 one-liners (market area / top of the Sales Comparison Approach): actives on the effective date, sales in the past 12 months
  const act = rows.filter(r => statusAt(r, eff) === 'active' && r.listPrice), sold12 = rows.filter(r => r.saleDate && r.saleDate > isoAddMonths(eff, -12) && r.saleDate <= eff && r.salePrice);
  const allS = per.reduce((s, p) => s + p.nS, 0), conc = per.reduce((s, p) => s + p.conc, 0), concKnown = per.reduce((s, p) => s + p.concKnown, 0), reo = per.reduce((s, p) => s + p.reo, 0);
  return { eff, per, trend, act, sold12, allS, conc, concKnown, reo, file: src.file || '', micro: src === MI() };
}
const mcFmt = (v, t) => v == null ? '—' : t === '$' ? $m(v) : t === '%' ? (Math.round(v * 10) / 10) + '%' : t === 'r' ? (Math.round(v * 100) / 100).toFixed(2) : String(Math.round(v));
function mcLines(C) {
  const lo = a => a.length ? Math.min(...a) : null, hi = a => a.length ? Math.max(...a) : null; const lp = C.act.map(r => r.listPrice), sp = C.sold12.map(r => r.salePrice);
  return [`There are ${C.act.length} comparable propert${C.act.length === 1 ? 'y' : 'ies'} currently offered for sale in the subject market area` + (C.act.length ? ` ranging in price from ${$m(lo(lp))} to ${$m(hi(lp))}.` : '.'),
    `There are ${C.sold12.length} comparable sale${C.sold12.length === 1 ? '' : 's'} in the subject market area within the past twelve months` + (C.sold12.length ? ` ranging in sale price from ${$m(lo(sp))} to ${$m(hi(sp))}.` : '.')];
}
function mcSummaryDraft(C) {
  const m = M(), [a, , c] = C.per, pick = k => (m.mc && m.mc.trend && m.mc.trend[k]) || C.trend[k].t; const out = [];
  out.push(`The data are from an SBMLS search of comparable properties competing with the subject (see the search criteria), as of the effective date of ${shortDate(C.eff)}.`);
  out.push(`There were ${C.allS} comparable sale${C.allS === 1 ? '' : 's'} in the past 12 months: ${a.nS} in the prior 7–12 months, ${C.per[1].nS} in the prior 4–6 months and ${c.nS} in the current 3 months; absorption is considered ${pick('absorb').toLowerCase()}.`);
  out.push(c.v.supply != null ? `There ${c.nA === 1 ? 'is' : 'are'} ${c.nA} active comparable listing${c.nA === 1 ? '' : 's'}, about ${(Math.round(c.v.supply * 10) / 10).toFixed(1)} month${Math.round(c.v.supply * 10) === 10 ? '' : 's'} of supply in the current period (${pick('supply').toLowerCase()}).` : `There ${c.nA === 1 ? 'is' : 'are'} ${c.nA} active comparable listing${c.nA === 1 ? '' : 's'}; with no sales in the current 3 months, months of supply cannot be measured.`);
  if (a.v.medSale != null && c.v.medSale != null) out.push(`The median comparable sale price was ${$m(a.v.medSale)} in the prior 7–12 months and ${$m(c.v.medSale)} in the current 3 months. Medians of a small number of sales reflect the mix of properties sold rather than a change in value, and price per square foot is not a reliable trend measure (it does not account for differences in lot utility, quality, condition, bathrooms, features, view and other amenities).`);
  if (C.concKnown) out.push(`${C.conc} of ${C.concKnown} sales reported seller concessions in MLS.`);
  out.push(C.reo ? `${C.reo} of the sales ${C.reo === 1 ? 'was a' : 'were'} REO / short sale${C.reo === 1 ? '' : 's'}.` : 'No REO or short sales were found among the comparable sales.');
  const TC = { increasing: 'increasing', stable: 'stable', declining: 'declining' }[m.trendConcl]; if (TC) out.push(`Overall, market values are considered ${TC} as of the effective date.`);
  return out.join(' ');
}
function mcHTML(C) {
  const m = M(); m.mc = m.mc || { trend: {} }; const T = m.mc.trend || {};
  const sel = (k, opts, sug) => `<select data-mct="${k}">${opts.map(o => `<option${(T[k] || sug) === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  const concPct = C.concKnown ? Math.round(C.conc / C.concKnown * 100) : null;
  return `<summary><b>1004MC – Market Conditions Addendum (UAD 2.6)</b> <small class="muted">from the ${C.micro ? 'Search Criteria search (box 2)' : '<span class="warnTxt">Market Area Boundary search (box 1) – load box 2 for the comparable search</span>'}</small></summary>
    <p class="help">Periods end on the effective date (${h(shortDate(C.eff))}). Active listings are counted as of the end of each period. <b>Trend rule:</b> the current 3 months compared with the prior 7–12 months – more than 5% higher is Increasing, more than 5% lower is Declining, otherwise Stable (sales are compared per month). With fewer than 3 sales or listings in a period the suggestion says “few – your call”. Price per square foot is not used as a trend measure.</p>
    <div class="tableWrap"><table class="facts"><tr><th>Inventory analysis</th>${C.per.map(p => `<th class="t">${h(p.label)}<small class="sug">${h(shortDate(isoAddMonths(p.from, 0)))} – ${h(shortDate(p.to))}</small></th>`).join('')}<th>Overall trend</th></tr>
      ${MC_ROWS.map(([k, label, t], i) => `${i === 4 ? `<tr><th colspan="5">Median sale &amp; list price, DOM, sale/list %</th></tr>` : ''}<tr><td>${h(label)}</td>${C.per.map(p => `<td class="t">${mcFmt(p.v[k], t)}</td>`).join('')}<td>${sel(k, MC_TREND, C.trend[k].t)}<small class="sug${T[k] && T[k] !== C.trend[k].t ? ' warnTxt' : ''}">suggested ${C.trend[k].t}${C.trend[k].why ? ' (' + h(C.trend[k].why) + ')' : ''}</small></td></tr>`).join('')}
      <tr><td>Seller concessions reported in MLS (sales)</td>${C.per.map(p => `<td class="t">${p.concKnown ? p.conc + ' of ' + p.concKnown : '—'}</td>`).join('')}<td>${sel('conc', MC_TREND, 'Stable')}</td></tr>
      <tr><td>REO / short sales (sales)</td>${C.per.map(p => `<td class="t">${p.reo}${p.reoA ? ' · ' + p.reoA + ' listed' : ''}</td>`).join('')}<td></td></tr></table></div>
    <table class="facts"><tr><th>Seller-(developer, builder, etc.) paid financial assistance prevalent?</th><td>${sel('concYN', ['', 'Yes', 'No'], '')} <small class="muted">${concPct == null ? 'concessions not in this export' : concPct + '% of the sales with an answer reported concessions'}</small></td></tr>
      <tr><th>Are foreclosure sales (REO sales) a factor in the market?</th><td>${sel('reoYN', ['', 'Yes', 'No'], C.reo ? '' : 'No')} <small class="muted">${C.reo} REO / short sale${C.reo === 1 ? '' : 's'} in the past 12 months</small></td></tr>
      <tr><th>Cite data sources for the above information</th><td><input data-mcx="sources" value="${h(m.mc.sources ?? 'SBMLS')}"></td></tr>
      <tr><th>Summarize the above as support for your conclusions</th><td><textarea data-mcx="summary" rows="6">${h(m.mc.summary ?? mcSummaryDraft(C))}</textarea><div class="row"><button type="button" class="btn ghost small" id="mcRedo">Draft again</button></div></td></tr></table>
    <h4>For the 2.6 report (Sales Comparison Approach, top lines)</h4><p>${mcLines(C).map(h).join('<br>')}</p>
    <div class="row"><button type="button" class="btn ghost small" id="mcCopy">Copy the grid</button><button type="button" class="btn ghost small" id="mcPrint">Print / Save as PDF</button></div>`;
}
function mcText(C) {
  const m = M(), T = (m.mc && m.mc.trend) || {}; const L = ['Inventory analysis\t' + C.per.map(p => p.label).join('\t') + '\tOverall trend'];
  MC_ROWS.forEach(([k, label, t]) => L.push([label, ...C.per.map(p => mcFmt(p.v[k], t)), T[k] || C.trend[k].t].join('\t')));
  L.push('', mcLines(C).join('\n'), '', 'Summary: ' + ((m.mc && m.mc.summary) ?? mcSummaryDraft(C)), 'Data source: ' + ((m.mc && m.mc.sources) ?? 'SBMLS'));
  return L.join('\n');
}
function mcPrintHTML(C) {
  const m = M(), T = (m.mc && m.mc.trend) || {}; const f = readForm();
  return `<!doctype html><html><head><meta charset="utf-8"><title>1004MC ${hesc([f.fileNo, street(f)].filter(Boolean).join(' '))}</title><style>@page { size: letter; margin: 0.6in; } body { font: 12.5px/1.4 Arial, sans-serif; margin: 20px; color: #111; } h1 { font-size: 18px; margin: 0; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; } td.n { text-align: right; } @media print { .noprint { display: none; } }</style></head><body>
    <p class="noprint" style="background:#fff3e0;border:1px solid #ff8a00;padding:8px 12px;border-radius:8px">In the print window choose <b>Destination: Save as PDF</b>.</p>
    <h1>Market Conditions Addendum – ${hesc(f.address || '')}</h1><div>File ${hesc(f.fileNo || '')} · effective date ${hesc(shortDate(C.eff))} · data source: ${hesc((m.mc && m.mc.sources) ?? 'SBMLS')}</div>
    <table><tr><th>Inventory analysis</th>${C.per.map(p => `<th>${hesc(p.label)}</th>`).join('')}<th>Overall trend</th></tr>${MC_ROWS.map(([k, label, t]) => `<tr><td>${hesc(label)}</td>${C.per.map(p => `<td class="n">${mcFmt(p.v[k], t)}</td>`).join('')}<td>${hesc(T[k] || C.trend[k].t)}</td></tr>`).join('')}</table>
    <table><tr><th style="width:45%">Seller-paid financial assistance prevalent?</th><td>${hesc(T.concYN || '')} ${C.concKnown ? `(${C.conc} of ${C.concKnown} sales reported concessions; trend ${hesc(T.conc || 'Stable')})` : ''}</td></tr><tr><th>Foreclosure (REO) sales a factor?</th><td>${hesc(T.reoYN || (C.reo ? '' : 'No'))} (${C.reo} in the past 12 months)</td></tr><tr><th>Summary</th><td>${hesc((m.mc && m.mc.summary) ?? mcSummaryDraft(C))}</td></tr></table>
    <p>${mcLines(C).map(hesc).join('<br>')}</p></body></html>`;
}
function mcMount() {
  const body = $('#mkBody'); if (!body) return; const m = M(); const src = mcSrc(); if (!(src.rows || []).length) return;
  const C = mcCompute(); const d = document.createElement('details'); d.className = 'mkcard mc'; d.id = 'mcBox';
  d.open = m.mcOpen != null ? m.mcOpen : readForm().reportForm === 'uad26'; d.innerHTML = mcHTML(C);
  const secs = body.querySelectorAll('.mkgrid > section'); (secs[2] || secs[secs.length - 1]).after(d);
  d.addEventListener('toggle', () => { m.mcOpen = d.open; mkChanged(); });
  d.querySelectorAll('[data-mct]').forEach(s => s.onchange = () => { m.mc.trend = m.mc.trend || {}; m.mc.trend[s.dataset.mct] = s.value; mkChanged(); });
  d.querySelectorAll('[data-mcx]').forEach(t => t.oninput = () => { m.mc[t.dataset.mcx] = t.value; mkChanged(); });
  $('#mcRedo').onclick = () => { m.mc.summary = mcSummaryDraft(C); d.querySelector('[data-mcx=summary]').value = m.mc.summary; mkChanged(); toast('Drafted again'); };
  $('#mcCopy').onclick = async () => { try { await navigator.clipboard.writeText(mcText(C)); toast('Copied – paste it into your report software or a spreadsheet'); } catch (e) { toast('Could not copy'); } };
  $('#mcPrint').onclick = () => printWindow(mcPrintHTML(C), 'The 1004MC');
}
