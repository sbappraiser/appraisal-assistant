/* =====================================================================
   Drafts for SFREP's empty comment boxes (her ask Oct 21 2026): Analysis of Prior Sale and Transfer History (subject
   and comps), Site commentary, Subject property commentary, Market commentary. Built only from her data (iPad, CRS,
   CORT, MLS, the order's Market tab); [brackets] are hers to fill. She edits or rewrites them – nothing is sent
   until it is in the box.
   ===================================================================== */
const CMT_BOXES = [
  ['cAssign', 'Assignment', 'Assignment information and scope of work commentary', 5000],   // SFREP's box under Assignment Information (her inspection-limits paragraph); from My comments – nothing to draft
  ['cSubjPrior', 'SubjectPriorSalesAndTransferHistory', 'Analysis of prior sale and transfer history – subject', 5000],
  ['cCompPrior', 'ComparablesPriorSalesAndTransferHistory', 'Analysis of prior sale and transfer history – comparable sales', 5000],
  ['cSite', 'Site', 'Site commentary', 5000],
  ['cSubject', 'SubjectProperty', 'Subject property commentary', 5000],
  ['cQC', 'OverallQualityAndCondition', 'Reconciliation of overall quality and condition (always required, F-1 15.010) – blank uses the one from your iPad', 5000],
  ['cMarket', 'Market', 'Market commentary', 5000]];
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
  if (k === 'cQC') { const q = S.q || '[Q]', c = S.c || '[C]'; return `The overall quality rating of ${q} and condition rating of ${c} were reconciled from the exterior and interior ratings and the components observed: [what sets the ratings – e.g. updated kitchen and baths, original windows and roof, deferred maintenance].`; }
  if (k === 'cSubject') return '[Add only what the Improvements fields do not show – e.g. the scope and quality of recent work, permits, unusual features or layout, deferred maintenance.]';
  if (k === 'cMarket') return '[Add what the market numbers do not show – e.g. what is driving demand, financing and interest rates, seasonality, how this property type is selling in this market.]';
  return ''; }
/* one box, placed in its own section of Report details (her ask Oct 22 2026: the site comment belongs with the site, not at the end) */
const cmtCount = (v, max) => `<small class="cmtcnt${v.length > max ? ' warnTxt' : ''}">${v.length.toLocaleString()} / ${max.toLocaleString()} characters</small>`;
function cmtBoxHTML(J, k) { const R = R0(J); const B = CMT_BOXES.find(b => b[0] === k); if (!B) return ''; const [, , l, max] = B; const v = String(R[k] || '');
  return `<label class="fld"><span>${l} ${cmtCount(v, max)} ${k === 'cAssign' ? '' : `<button type="button" class="btn sm" data-cmtdraft="${k}">Draft it</button>`}</span><textarea class="txt" rows="${Math.min(10, 3 + Math.round(v.length / 160))}" maxlength="${max}" data-rpt="${k}">${esc(v)}</textarea>${k === 'cAssign' ? '<small class="muted">Leave it empty to keep the Assignment comment you wrote on the iPad; text here replaces it.</small>' : ''}</label>`; }
function cmtBoxesHTML() { return ''; }   // the boxes now sit in their sections (report.js)
const CMT_TIP = '<p class="help">Write only what the fields cannot show – reviewers read the fields, so repeating them only uses up the box. Your standard paragraphs are under 📋 My comments.</p>';
/* live character count under every box that has one */
document.addEventListener('input', e => { const t = e.target; if (!t || t.tagName !== 'TEXTAREA' || !t.maxLength || t.maxLength < 0) return; const lab = t.closest('label'); const c = lab && lab.querySelector('.cmtcnt'); if (!c) return;
  const max = t.maxLength; c.textContent = `${t.value.length.toLocaleString()} / ${max.toLocaleString()} characters`; c.classList.toggle('warnTxt', t.value.length >= max); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cmtdraft]'); if (!b || !app.job) return; const k = b.dataset.cmtdraft; const R = R0(app.job);
  if (R[k] && !confirm('Replace your text in this box with a new draft?')) return; R[k] = cmtDraft(app.job, k); save(); rptRedraw(); });
