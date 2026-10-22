/* =====================================================================
   Drafts for SFREP's empty comment boxes (her ask Oct 21 2026): Analysis of Prior Sale and Transfer History (subject
   and comps), Site commentary, Subject property commentary, Market commentary. Built only from her data (iPad, CRS,
   CORT, MLS, the order's Market tab); [brackets] are hers to fill. She edits or rewrites them – nothing is sent
   until it is in the box.
   ===================================================================== */
const CMT_BOXES = [
  ['cAssign', 'Assignment', 'Assignment information and scope of work commentary', 5000],   // SFREP's box under Assignment Information (her inspection-limits paragraph); from My comments – nothing to draft
  ['cSubjPrior', 'SubjectPriorSalesAndTransferHistory', 'Analysis of prior sale and transfer history – subject', 4000],
  ['cCompPrior', 'ComparablesPriorSalesAndTransferHistory', 'Analysis of prior sale and transfer history – comparable sales', 4000],
  ['cSite', 'Site', 'Site commentary', 4000],
  ['cSubject', 'SubjectProperty', 'Subject property commentary', 4000],
  ['cMarket', 'Market', 'Market commentary', 4000]];
/* her view line in words, each view once: "a partial residential view (neutral)" */
function cmtView(v) { if (!v) return ''; let L = []; try { L = vwParse(v); } catch (e) {} const seen = new Set(); L = L.filter(x => { const k = x.type + '|' + x.range + '|' + x.impact; if (seen.has(k)) return false; seen.add(k); return true; });
  if (!L.length) return 'view: ' + v; return 'the view is ' + L.map(x => `${x.range ? x.range.toLowerCase() + ' ' : ''}${x.type === 'Other' ? (x.other || 'other') : words(x.type)} (${String(x.impact || '').toLowerCase()})`).join(' and '); }
const words = v => String(v || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\bAnd\b/g, 'and').toLowerCase();
function cmtDraft(J, k) { const S = subjFacts(J), F = reportFrom(J), o = orderOf(J) || {}, eff = J.subject.eff || F.eff; const d = x => showDate(x);
  if (k === 'cSubjPrior') { const crs = J.subject.crs || {}; const L = (crs.priorSales || []).filter(s => s.date && eff && monthsBetween(s.date, eff) >= 0 && monthsBetween(s.date, eff) <= 36);
    const src = crs.priorSales ? 'public records (CRS Data)' : '[source: CRS Data / MLS / county records]';
    let t = L.length ? `According to ${src}, the subject transferred ${L.length === 1 ? '' : L.length + ' times '}in the three years before the effective date: ${L.map(s => `${d(s.date)}${s.price ? ' for ' + money(s.price) : ' (no price disclosed)'}`).join('; ')}. [Explain each transfer – arm's length or not, and how it relates to the current value.]`
      : `According to ${src}, there were no sales or transfers of the subject in the three years before the effective date${eff ? ' of ' + d(eff) : ''}.`;
    t += o.listing === 'listed' ? ` The subject is currently listed for sale [MLS #, list price, days on market].` : o.listing === 'contract' ? ` The subject is under contract; the contract is analyzed in the Sales Contract section.` : o.listing === 'notListed' ? ' The subject is not currently listed for sale and was not listed in the past 12 months [confirm in the MLS].' : '';
    return t; }
  if (k === 'cCompPrior') { const U = usedComps(J); if (!U.length) return '';   // her wording (Oct 22 2026): one sentence for all, then only the comps that did transfer
    const hits = U.map(c => [c, priorSales(c).filter(s => s.monthsBefore > 0 && s.monthsBefore <= 12)]).filter(([, P]) => P.length);
    if (!hits.length) return 'According to CRS Data, the comparable sales have not transferred within the 12 months prior to their sale dates, other than the sales reported in this appraisal.';
    const one = ([c, P]) => `Comp ${c.use} (${compTitle(c)}) ${P.map(s => `${s.type === 'Sale' ? 'sold' : 'transferred'} ${d(s.date)}${s.price ? ' for ' + money(s.price) : ''}`).join(' and ')} [explain – e.g. flip after renovation, non-arm's length transfer]`;
    return `According to CRS Data, the comparable sales have not transferred within the 12 months prior to their sale dates, other than the sales reported in this appraisal, except: ${hits.map(one).join('; ')}.`; }
  if (k === 'cSite') { const sf = num(S.site), us = num(S.usable); const zone = F.zone, zd = F.zoneDesc;
    const bits = [sf ? `The site is ${int(sf)} sq ft (${(sf / 43560).toFixed(2)} acre)${us ? `, with about ${(+us).toFixed(2)} acre usable` : ''}` : 'The site is [size]',
      S.topo ? `topography is ${String(S.topo).toLowerCase()}` : '', cmtView(S.view), S.loc ? `the location is ${[...new Set(String(S.loc).split(/;\s*/).filter(Boolean))].map(x => x.replace(/^(\w+):\s*(.*)$/, (m0, i, w) => `${w.toLowerCase()} (${i.toLowerCase()})`)).join(', ')}` : ''].filter(Boolean);
    return `${bits.join('; ')}.${zone ? ` It is zoned ${zone}${zd ? ' (' + zd + ')' : ''}, and the present use is a legal, conforming use [confirm].` : ''} Utilities are public [confirm]. [Note any easements, encroachments or adverse site conditions observed, or state that none were observed.]`; }
  if (k === 'cSubject') { const bits = [];
    bits.push(`The subject is a${/^[aeiou]/i.test(String(S.style || '')) ? 'n' : ''} ${S.style ? String(S.style).toLowerCase() + ' ' : ''}${num(S.levels) ? num(S.levels) + '-story ' : ''}${/attach/i.test(String(S.attach || '')) && !/detach/i.test(String(S.attach || '')) ? 'attached' : 'detached'} single-family residence${num(S.year) ? ' built in ' + num(S.year) : ''}`);
    const rm = [num(S.gla) ? int(num(S.gla)) + ' sq ft above grade' : '', num(S.beds) ? num(S.beds) + ' bedrooms' : '', num(S.full) ? num(S.full) + ' full bath' + (num(S.full) > 1 ? 's' : '') + (num(S.half) ? ' and ' + num(S.half) + ' half bath' + (num(S.half) > 1 ? 's' : '') : '') : ''].filter(Boolean);
    let t = bits[0] + (rm.length ? ', with ' + rm.join(', ') : '') + '.';
    if (num(S.garage)) t += ` It has a ${num(S.garage)}-car garage.`;
    if (S.q || S.c) t += ` Overall quality ${String(S.q || '[Q]').match(/Q\d|\[Q\]/)[0]} and condition ${String(S.c || '[C]').match(/C\d|\[C\]/)[0]} (see the Quality and Condition section).`;
    return t + ' [Add anything a reader should know about the subject that is not shown elsewhere – e.g. recent work, unusual features.]'; }
  if (k === 'cMarket') { const M = F.market; if (!M) return 'Market conditions are analyzed in the Market section above. [Add demand / supply, marketing time and any other factors affecting this market.]';
    const t = [M.supply ? `housing is ${({ Shortage: 'in short supply', InBalance: 'in balance', OverSupply: 'over-supplied', Oversupply: 'over-supplied' })[M.supply] || words(M.supply)}` : '', M.mktime ? `typical marketing time is ${words(M.mktime)}` : '', M.salesN ? `${M.salesN} competing sales in the last ${M.L || '[n]'} months ranged from ${money(M.saleLow)} to ${money(M.saleHigh)} (median ${money(M.saleMed)})` : '', !blank(M.activeN) ? `there ${M.activeN === 1 ? 'is' : 'are'} ${M.activeN} active listing${M.activeN === 1 ? '' : 's'}${!blank(M.pendingN) ? ' and ' + M.pendingN + ' pending' : ''}` : '', M.distress === 'false' || M.distress === false ? 'distressed sales are not a factor' : M.distress ? 'distressed sales are present [describe their effect]' : ''].filter(Boolean);
    return (t.length ? t.join('; ').replace(/^./, x => x.toUpperCase()) + '.' : '') + ' [Add interest rates, financing and any other factor affecting this market.]'; }
  return ''; }
function cmtBoxesHTML(J) { const R = R0(J);
  return `<section><h3>Comments for SFREP <small>boxes that came in empty – draft from your data, then edit</small></h3>
    ${CMT_BOXES.map(([k, , l, max]) => `<label class="fld"><span>${l} ${k === 'cAssign' ? '<small class="muted">use 📋 My comments below</small>' : `<button type="button" class="btn sm" data-cmtdraft="${k}">Draft it</button>`}</span><textarea class="txt" rows="3" maxlength="${max}" data-rpt="${k}">${esc(R[k] || '')}</textarea></label>`).join('')}</section>`; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cmtdraft]'); if (!b || !app.job) return; const k = b.dataset.cmtdraft; const R = R0(app.job);
  if (R[k] && !confirm('Replace your text in this box with a new draft?')) return; R[k] = cmtDraft(app.job, k); save(); const c = document.getElementById('reportCard'); if (c) c.innerHTML = reportHTML(app.job); });
