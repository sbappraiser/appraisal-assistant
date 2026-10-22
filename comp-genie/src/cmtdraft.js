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
    const what = s => `${s.type === 'Sale' ? 'sold' : 'transferred'} ${d(s.date)}${s.price ? ' for ' + money(s.price) : ''}`;
    const hits = U.map(c => [c, priorSales(c).filter(s => s.monthsBefore > 0 && s.monthsBefore <= 12)]).filter(([, P]) => P.length);
    const later = U.map(c => [c, laterSales(c, eff)]).filter(([, P]) => P.length);
    let t = 'According to CRS Data, the comparable sales have not transferred within the 12 months prior to their sale dates, other than the sales reported in this appraisal'
      + (hits.length ? `, except: ${hits.map(([c, P]) => `Comp ${c.use} (${compTitle(c)}) ${P.map(what).join(' and ')} [explain – e.g. flip after renovation, non-arm's length transfer]`).join('; ')}.` : '.');
    if (later.length) t += ` ${later.map(([c, P]) => `Since the sale used in this report, Comp ${c.use} (${compTitle(c)}) ${P.map(what).join(' and ')}`).join('; ')}. [Explain – e.g. the later sale supports / was considered but not used because…]`;
    return t; }
  /* Site, Subject property and Market: the fields already carry size, topography, view, location, zoning, rooms, ratings and market numbers – the
     commentary adds only what they cannot show (her note Oct 22 2026), so no repeating */
  if (k === 'cSite') return 'No adverse easements, encroachments or site conditions were apparent from the inspection or the documents reviewed [plat map / preliminary title report / CRS]. [Add only what the Site fields do not show – e.g. shared driveway or road, excess or surplus land, drainage, slope stability, off-site influences.]';
  if (k === 'cSubject') return '[Add only what the Improvements fields do not show – e.g. the scope and quality of recent work, permits, unusual features or layout, deferred maintenance.]';
  if (k === 'cMarket') return '[Add what the market numbers do not show – e.g. what is driving demand, financing and interest rates, seasonality, how this property type is selling in this market.]';
  return ''; }
function cmtBoxesHTML(J) { const R = R0(J);
  return `<section><h3>Comments for SFREP <small>boxes that came in empty – draft from your data, then edit</small></h3>
    <p class="help">Write only what the fields above cannot show – Fannie Mae’s reviewers read the fields, so repeating them only uses up the box. Your standard paragraphs are under 📋 My comments.</p>
    ${CMT_BOXES.map(([k, , l, max]) => `<label class="fld"><span>${l} ${k === 'cAssign' ? '<small class="muted">use 📋 My comments below</small>' : `<button type="button" class="btn sm" data-cmtdraft="${k}">Draft it</button>`}</span><textarea class="txt" rows="3" maxlength="${max}" data-rpt="${k}">${esc(R[k] || '')}</textarea></label>`).join('')}</section>`; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cmtdraft]'); if (!b || !app.job) return; const k = b.dataset.cmtdraft; const R = R0(app.job);
  if (R[k] && !confirm('Replace your text in this box with a new draft?')) return; R[k] = cmtDraft(app.job, k); save(); const c = document.getElementById('reportCard'); if (c) c.innerHTML = reportHTML(app.job); });
