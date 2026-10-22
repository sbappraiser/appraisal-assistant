/* =====================================================================
   Draft the sales comparison comment from her grid, in her wording (Oct 2026;
   patterns from three of her UAD 3.6 sales comparison comments).
   Per comparable: "[addr] is inferior to the subject overall." then one sentence per
   adjustment ("An upward adjustment of $730,000 was made for the inferior lot
   utility (0.77 usable acres)"), her tier words (low C2, high C3), listing / sale-to-list
   facts, her own comp notes in [brackets] to rework. Then the rate paragraphs with her
   grid rates, and the reconciliation's bracketing opening. It is a DRAFT in a review box:
   nothing goes into the comment until she presses a button, and [brackets] mark
   what only she can write.
   ===================================================================== */
const DR = { open: false, text: '' };
const $m = v => (v < 0 ? '−' : '') + money(Math.abs(Math.round(v)));
const dir = v => v > 0 ? 'An upward' : 'A downward';
const sup = v => v > 0 ? 'inferior' : 'superior';   // a plus adjustment means the comp is inferior
function drTier(J, who, k, F) { const r = String(F[k] || '').toUpperCase().match(/[QC][1-6]/); if (!r) return ''; return fineOf(J, who, k) + ' ' + r[0]; }
function drOverall(t) { const p = t.price || 1, n = t.net / p; return Math.abs(n) <= 0.03 ? 'similar to the subject overall' : Math.abs(n) <= 0.07 ? 'fairly similar to the subject overall' : n > 0 ? 'inferior to the subject overall' : 'superior to the subject overall'; }
function drComp(J, c, t) {
  const S = subjFacts(J), C = compFacts(c, J); const A = id => { const r = adjRows(J).find(x => x[0] === id); return r ? (cellAmount(J, c, r).v || 0) : 0; };
  const st = String(V(c, 'status') || 'Closed'); const listing = /active|pending|contingent|coming/i.test(st);
  const s = []; const addr = compTitle(c);
  s.push(`${addr} is ${listing ? `${/pending|contingent/i.test(st) ? 'a pending sale' : 'an active listing'}, and it is ` : ''}${drOverall(t)}.`);
  const loc = A('loc'); if (loc) s.push(`${dir(loc)} adjustment of ${$m(Math.abs(loc))} was made for its ${sup(loc)} location.`);
  const nb = A('nbhd'); if (nb) s.push(`${dir(nb)} adjustment of ${$m(Math.abs(nb))} was made for the ${sup(nb)} market area.`);
  const us = A('usable'), vw = A('view'); const site = A('site');
  const part = [];
  if (us) part.push(`${part.length ? dir(us).toLowerCase() : dir(us)} adjustment of ${$m(Math.abs(us))} was made for the ${sup(us)} lot utility${blank(C.usable) ? '' : ` (${C.usable} usable acres)`}`);
  if (vw) { const vl = String(C.view || '').split(':').slice(1).join(':').split(/;\s*|,\s*/).map(x => x.trim().toLowerCase()).filter(Boolean); const vt = vl.length > 2 ? vl.slice(0, -1).join(', ') + ', and ' + vl.at(-1) : vl.join(' and '); part.push(`${part.length ? dir(vw).toLowerCase() : dir(vw)} adjustment of ${$m(Math.abs(vw))} was made for the ${sup(vw)} ${vt ? vt + ' ' : ''}view`); }
  if (part.length) s.push(part.join(', and ') + '.'); else if (!blank(C.view) && !blank(S.view) && vtOf(J, C._id, C.view) === vtOf(J, 'subj', S.view)) s.push('The view is similar.');
  if (site) s.push(`${dir(site)} adjustment of ${$m(Math.abs(site))} was made for the ${site > 0 ? 'smaller' : 'larger'} total site.`);
  const q = A('q'), cd = A('c'), sty = A('style'); const sim = []; const adj = [];
  if (!sty) sim.push('design/style'); else adj.push(`${dir(sty).toLowerCase()} adjustment of ${$m(Math.abs(sty))} was made for its ${sup(sty)} design/style`);
  if (!q) sim.push('quality'); else adj.push(`${adj.length ? dir(q).toLowerCase() : dir(q).toLowerCase()} adjustment of ${$m(Math.abs(q))} was made for its ${sup(q)} ${drTier(J, c.id, 'q', C) || 'quality'} rating`);
  if (!cd) sim.push('condition'); else adj.push(`${dir(cd).toLowerCase()} adjustment of ${$m(Math.abs(cd))} was made for its ${sup(cd)} ${drTier(J, c.id, 'c', C) || 'condition'} rating`);
  const simTxt = sim.length ? `similar ${sim.length > 1 ? sim.slice(0, -1).join(', ') + ' and ' + sim.at(-1) : sim[0]}` : '';
  s.push(`The residence has ${simTxt}${simTxt && adj.length ? ', but ' : ''}${adj.length ? adj.join(', and ') : ''}.`.replace('has , but', 'has').replace(/^The residence has \.$/, ''));
  const rem = V(c, 'remodel'); { const m = String(rem || '').match(/(?:'(\d{2})|\b((?:19|20)\d{2}))\s*(?:[-–]\s*'?(\d{2,4}))?\s*(?:rmdl|rmd|remodel|reno|renovat|rebuild|rbld|update|updt)/i);   // '26 Rmdl → 2026 (her shorthand)
    if (m) { const y = m[2] || (+m[1] > 30 ? '19' : '20') + m[1]; const rb = /rebuild|rbld/i.test(m[0]); s.push(`The residence was ${rb ? 'rebuilt' : 'remodeled'} in ${y}.`); } }
  const gla = A('gla'), bs = A('bsmt');
  if (!blank(S.gla) && !blank(C.gla)) { const d = (+C.gla) - (+S.gla); s.push(Math.abs(d) < 100 ? 'It has similar gross living area.' : `It is ${d > 0 ? 'superior' : 'inferior'} in gross living area.`); }
  if (bs) s.push(`${dir(bs)} adjustment of ${$m(Math.abs(bs))} was made for its ${bs > 0 ? 'smaller' : 'larger'} below-grade finished area.`);
  const bt = A('baths'); if (bt) s.push(`${dir(bt)} adjustment of ${$m(Math.abs(bt))} was made for its ${sup(bt)} bathroom count.`);
  const bd = A('beds'); if (bd) s.push(`${dir(bd)} adjustment of ${$m(Math.abs(bd))} was made for its ${sup(bd)} bedroom count.`);
  const fu = A('func') || 0; if (fu) s.push(`${dir(fu)} adjustment of ${$m(Math.abs(fu))} was made on the Functional Utility line [reason].`);
  const ad = A('adu'); if (ad) s.push(`${C.adu && C.adu !== 'None' ? `It has ${C.adu.replace(/^Living outbuilding, /, 'a living outbuilding, ')}. ` : ''}${dir(ad)} adjustment of ${$m(Math.abs(ad))} was made on the ancillary buildings line.`);
  const landWord = t => String(t || '').toLowerCase().replace(/\bavg\b/g, 'average').replace(/\bv[-. ]?good\b/, 'very good');
  const R = G0(J).rates; const feat = [];   // her style: "$125,000 for the pool and $25,000 for the spa"
  [['pool', 'pool'], ['spa', 'spa'], ['pond', 'pond'], ['lake', 'lake'], ['tennis', 'tennis court'], ['sport', 'sport court']].forEach(([k, l]) => { const r = num(R[k]); const a = hasFeat(S, k), b = hasFeat(C, k); if (r && a !== b) feat.push([(a - b) * r, l]); });
  const fSum = feat.reduce((t, x) => t + x[0], 0), fRow = A('pool') + A('courts');
  if (feat.length && Math.round(fSum / 500) * 500 === fRow) { const ups = feat.filter(x => x[0] > 0), dns = feat.filter(x => x[0] < 0); const one = L => L.map(x => `${$m(Math.abs(x[0]))} for the ${x[1]}`).join(' and ');
    const say = (L, w) => L.length > 1 ? `${w} adjustments of ${one(L)} were made` : `${w === 'downward' ? 'a downward' : 'an upward'} adjustment of ${$m(Math.abs(L[0][0]))} was made for the ${L[0][1]}${w === 'upward' ? ' the subject has' : ''}`;
    const txt = [dns.length ? say(dns, 'downward') : '', ups.length ? say(ups, 'upward') : ''].filter(Boolean).join(', and '); s.push(txt.charAt(0).toUpperCase() + txt.slice(1) + '.'); }
  const am = []; [['pool', feat.length && Math.round(fSum / 500) * 500 === fRow ? null : 'water features'], ['courts', feat.length && Math.round(fSum / 500) * 500 === fRow ? null : 'tennis / sport court'], ['land', 'landscaping'], ['garage', 'vehicle storage'], ['energy', 'energy efficient features'], ['porch', 'porch / patio / deck'], ['other', 'other amenities']].forEach(([id, l]) => { if (!l) return; const v = A(id); if (v) am.push(`${am.length ? dir(v).toLowerCase() : dir(v)} adjustment of ${$m(Math.abs(v))} was made for the ${sup(v)} ${id === 'land' && C.land ? landWord(C.land) + ' ' : ''}${l}`); });
  if (am.length) s.push(am.join(', and ') + '.');
  const tm = A('sale'); if (tm && !listing) s.push(`${dir(tm)} market conditions adjustment of ${$m(Math.abs(tm))} was made for the time between its contract date and the effective date.`);
  if (tm && listing) s.push(`The listing adjustment of ${$m(Math.abs(tm))} is discussed under Market Conditions/Time Adjustments.`);
  const lp = num(V(c, 'listPrice')), sp = C.price; if (!listing && lp && sp) { const d = lp - sp; s.push(Math.abs(d) < lp * 0.005 ? 'It sold at its list price.' : d > 0 ? `It sold for ${money(sp)}, ${money(d)} below its final list price.` : `It sold for ${money(sp)}, ${money(-d)} above its final list price.`); }
  if (c.notes && c.notes.trim()) s.push(`[Your notes for this comp: ${c.notes.trim()}]`);
  return s.filter(Boolean).join(' ');
}
function drRates(J) {   // her rate paragraphs, only for the rates set on this grid
  const R = G0(J).rates; const out = []; const set = k => !blank(R[k]) && num(R[k]);
  if (set('usableAc')) out.push(`The lot utility (usable lot area) adjustment reflects differences in the usable portion of each site. Buyers typically pay less for a steeply sloping site than for an otherwise similar level site, because the level site offers more usable area and greater potential for outdoor living, landscaping, recreational amenities, and additional buildings. Usable area is typically reduced by easements, moderate to steep slopes, creeks, surface water, drainage issues, irregular shape, and limited access. The value of additional usable land is not necessarily proportional to its size and can vary with zoning, demand, and development potential. This adjustment reflects the capacity and potential of the usable land only. Based on market reaction, an adjustment of ${money(R.usableAc)} per usable acre of difference was derived for the range of site sizes in this analysis.`);
  if (set('viewStep') || set('viewPct')) out.push(`View adjustments consider the type, breadth, quality, orientation, prominence, privacy, and permanence of the view, along with any obstructions and its overall market appeal. Based on market reaction, an adjustment of ${set('viewStep') ? money(R.viewStep) : R.viewPct + '% of the sale price'} per tier of difference was derived.`);
  out.push(`Design/style adjustments reflect how the market reacts to differences in architectural design, detailing, and character. The subject and comparables have designs that compete in this market segment, and the market evidence did not show a measurable buyer reaction to the differences in architectural style. No design/style adjustment was warranted.`);
  if (set('qStep') || set('qPct')) out.push(`Quality adjustments consider differences in construction, materials, and workmanship; architectural and structural complexity, including roofline design, exterior articulation, and specialized foundations for hillside sites; and the grade of interior and exterior components, including integrated technology and electrical systems, doors and windows, wall, floor, and window/wall treatments, cabinetry and built-ins, bath and kitchen finishes, appliances, and fixtures. When the market supports it, each UAD quality rating may be divided into low, middle, and high tiers for analysis, so two properties with the same UAD quality rating may still warrant an adjustment. These tiers are internal to the analysis and do not change the standardized UAD rating reported. Based on market reaction, an adjustment of ${set('qStep') ? money(R.qStep) : R.qPct + '% of the sale price'} per UAD rating step was derived (one third of that between low, middle, and high tiers). Differences in original estimated construction cost were considered as supporting evidence of quality differences, but the adjustment reflects what buyers in this market segment pay for those differences, not the cost to build them.`);
  out.push(`Chronological age is considered together with effective age, condition, renovation history, and quality. A separate age adjustment is made only when the market shows a measurable difference that the condition, quality, or other adjustments do not already capture.`);
  if (set('cStep') || set('cPct')) out.push(`Condition adjustments reflect differences in physical condition, effective age, maintenance, renovation, modernization, deferred maintenance, and dated features. When the market supports it, each UAD condition rating may be divided into low, middle, and high tiers for analysis. As a result, two properties with the same UAD condition rating may still warrant an adjustment. These tiers are internal to the analysis and do not change the standardized UAD rating reported. An adjustment of ${set('cStep') ? money(R.cStep) : R.cPct + '% of the sale price'} per UAD rating step was derived (one third of that between low, middle, and high tiers). Renovation, repair, or cost-to-cure figures may support the analysis, but they are not assumed to equal market value dollar for dollar.`);
  out.push(set('bed') ? `Bedroom adjustments of ${money(R.bed)} per bedroom were made for comparables with fewer than three bedrooms; the market does not pay a premium for more than three bedrooms in addition to the living area adjustments.` : `Each comparable has sufficient combined above-grade and below-grade bedroom count, and the market does not pay a premium for more than three bedrooms, so no bedroom adjustments were made in addition to the living area adjustments.`);
  if (set('bath')) out.push(`Bathroom adjustments reflect how the market values differences in bathroom count, layout, utility, and quality, not the cost to build a bathroom. Based on market reaction, adjustments of ${money(R.bath)} per full bath and ${money(num(R.halfBath) || R.bath / 2)} per half bath were derived for the main residence.`);
  if (set('gla')) out.push(`Above-grade gross living area adjustments reflect the value the market places on additional square footage. They are not based on construction cost or on the average price per square foot. Based on market reaction, an adjustment of ${money(R.gla)} per square foot was derived.`);
  const am = [['space', 'Garage', ' per bay'], ['pool', 'In-ground pool', ''], ['spa', 'In-ground spa', ''], ['pond', 'Pond', ''], ['lake', 'Lake', ''], ['tennis', 'Tennis court', ''], ['sport', 'Sports court', ''], ['aduSf', 'ADU / guest quarters', ' per sq. ft.'], ['aduBath', 'ADU / guest quarters bath', '']].filter(([k]) => set(k));
  if (am.length) out.push('Amenities. The following adjustments were derived from market data:\n\n' + am.map(([k, l, u]) => `${l}: ${money(R[k])}${u}`).join('\n') + '\n[add any others: central air conditioning, owned solar, backup power, private well …]\n\nAn adjustment is not made simply because a feature is present or absent. Each amount reflects the appraiser\'s analysis of that feature\'s value in the subject\'s market segment.');
  if (set('landStep')) out.push(`Landscaping and Site Improvements. In this market segment, buyers place significant weight on landscaping and site improvements, and this adjustment reflects the overall quality, design, maturity, and extent of those improvements compared with the comparables. Landscaping includes hardscaping and covers all site improvements, such as plantings, trees, lawns, patios, porches, decking, terracing, walkways, driveways, driveway gates, site walls, fencing, pergolas, trellises, loggias, ponds, fountains, bocce courts, irrigation, drainage, and exterior lighting. Although patios, porches, and decks are reported on a separate line of the grid, no adjustment is made on that line. Market participants react to site improvements as a whole rather than item by item, and basic patios, porches, and decking are expected in this market for all but new construction, so any differences are reflected in this adjustment. Pools, spas, tennis courts, sport courts, and similar recreational amenities are adjusted separately and are not included here. This adjustment reflects the improvements themselves, not the amount of usable land available for them, which is addressed in the lot utility adjustment. Based on market reaction, an adjustment of ${money(R.landStep)} per tier of difference was derived.`);
  return out;
}
function drRatesShort(J) {   // one paragraph, for when the full rate paragraphs would push the comment past 10,000 characters
  const R = G0(J).rates; const set = k => !blank(R[k]) && num(R[k]); const L = [];
  if (set('usableAc')) L.push(`lot utility ${money(R.usableAc)} per usable acre`);
  if (set('viewStep')) L.push(`view ${money(R.viewStep)} per tier`); else if (set('viewPct')) L.push(`view ${R.viewPct}% of the sale price per tier`);
  if (set('qStep')) L.push(`quality ${money(R.qStep)} per UAD rating step`); else if (set('qPct')) L.push(`quality ${R.qPct}% per UAD rating step`);
  if (set('cStep')) L.push(`condition ${money(R.cStep)} per UAD rating step`); else if (set('cPct')) L.push(`condition ${R.cPct}% per UAD rating step`);
  if (set('bath')) L.push(`${money(R.bath)} per full bath and ${money(num(R.halfBath) || R.bath / 2)} per half bath`);
  if (set('bed')) L.push(`${money(R.bed)} per bedroom below three`);
  if (set('gla')) L.push(`living area ${money(R.gla)} per sq. ft.`);
  [['space', 'garage', ' per bay'], ['pool', 'pool', ''], ['spa', 'spa', ''], ['pond', 'pond', ''], ['lake', 'lake', ''], ['tennis', 'tennis court', ''], ['sport', 'sport court', ''], ['aduSf', 'ADU / guest quarters', ' per sq. ft.'], ['landStep', 'landscaping', ' per tier']].forEach(([k, l, u]) => { if (set(k)) L.push(`${l} ${money(R[k])}${u}`); });
  if (!L.length) return '';
  return `Based on market reaction in the subject's market segment, the following adjustments were derived: ${L.join('; ')}. Quality and condition are analyzed in low, middle, and high tiers within each UAD rating (one third of a step each); these tiers are internal to the analysis and do not change the standardized UAD rating reported. Adjustments reflect what buyers pay for each difference, not construction cost or the average price per square foot. [Other amenities: central air, owned solar, backup power, private well …]`;
}
function drRecon(J) {
  const used = usedComps(J); const G = G0(J); const T = used.map(c => ({ c, t: compTotals(J, c), listing: /active|pending|contingent|coming/i.test(String(V(c, 'status') || '')) }));
  const closed = T.filter(x => !x.listing && x.t.price); if (!closed.length) return '';
  const ps = closed.map(x => x.t.price); const n = x => `Comparable ${x.c.use}`; const list = L => L.length > 1 ? L.slice(0, -1).join(', ') + ' and ' + L.at(-1) : L[0];
  const inf = closed.filter(x => x.t.net / x.t.price > 0.03), supr = closed.filter(x => x.t.net / x.t.price < -0.03), sim = closed.filter(x => Math.abs(x.t.net / x.t.price) <= 0.03);
  const s = [`Before adjustment, the closed comparable sales ranged from ${money(Math.min(...ps))} to ${money(Math.max(...ps))}.`];
  if (inf.length) s.push(`${inf.length > 1 ? 'Comparables ' + list(inf.map(x => x.c.use)) + ' are' : n(inf[0]) + ' is'} inferior to the subject, indicating that the subject's value should be more than ${money(Math.max(...inf.map(x => x.t.price)))}.`);
  if (supr.length) s.push(`${supr.length > 1 ? 'Comparables ' + list(supr.map(x => x.c.use)) + ' are' : n(supr[0]) + ' is'} superior, indicating a value of less than ${money(Math.min(...supr.map(x => x.t.price)))}.`);
  if (sim.length) s.push(`${sim.length > 1 ? 'Comparables ' + list(sim.map(x => x.c.use)) + ', which are similar overall, sold for ' + list(sim.map(x => money(x.t.price))) : n(sim[0]) + ', which is similar overall, sold for ' + money(sim[0].t.price)}.`);
  const adj = closed.map(x => x.t.adj); s.push(`\n\nAfter adjustment, the closed comparables indicate a range of ${money(Math.min(...adj))} to ${money(Math.max(...adj))}.`);
  const most = T.filter(x => G.weights[x.c.id] === 'Most'), less = T.filter(x => G.weights[x.c.id] === 'Less' || G.weights[x.c.id] === 'NoWeight');
  if (most.length) { const a = most.map(x => x.t.adj); s.push(`Most consideration was given to ${most.length > 1 ? 'Comparables ' + list(most.map(x => x.c.use)) : n(most[0])} [why: similarity, recency, lowest adjustments …], which indicate ${most.length > 1 ? `an adjusted range of ${money(Math.min(...a))} to ${money(Math.max(...a))}` : money(a[0])}.`); }
  if (less.length) s.push(`${less.length > 1 ? 'Comparables ' + list(less.map(x => x.c.use)) + ' were' : n(less[0]) + ' was'} given less weight [why].`);
  const lst = T.filter(x => x.listing); if (lst.length) s.push(`${lst.length > 1 ? 'The listings (Comparables ' + list(lst.map(x => x.c.use)) + ')' : 'The listing (' + n(lst[0]) + ')'} ${lst.length > 1 ? 'were' : 'was'} considered as an indication of current competition.`);
  if (!blank(G.value)) s.push(`\n\nThe Sales Comparison Approach indicates a value of ${money(num(G.value))}. This approach is given primary weight in the final value conclusion because it is the most direct evidence of how market participants value properties like the subject.`);
  return s.join(' ').replace(/ \n\n /g, '\n\n');
}
function drBuild(J) {
  const used = usedComps(J); const T = used.map(c => compTotals(J, c));
  const nClosed = used.filter(c => !/active|pending|contingent|coming/i.test(String(V(c, 'status') || ''))).length, nPend = used.filter(c => /pending|contingent/i.test(String(V(c, 'status') || ''))).length, nAct = used.length - nClosed - nPend;
  const nu = J.comps.filter(c => c.notUsed && !c.use).length;
  const parts = [];
  parts.push('COMPARABLE SEARCH\n\n[Your search: area, site, view, quality, condition and living area ranges – see My comments → "Comparable search".]' + ` The appraiser researched and adjusted ${J.comps.length} properties${nu ? `, ${nu} of which were considered but not used` : ''}.`);
  parts.push(`COMPARABLE SELECTION\n\nThis report includes ${nClosed} closed sale${nClosed === 1 ? '' : 's'}, ${nPend} pending sale${nPend === 1 ? '' : 's'}, and ${nAct} active listing${nAct === 1 ? '' : 's'}.`);
  const G = G0(J); parts.push(`MARKET CONDITIONS/TIME ADJUSTMENTS\n\n${!blank(G.rates.timePct) && num(G.rates.timePct) ? `Market conditions were analyzed from each comparable's contract date through the effective date of the appraisal. Based on the market evidence, an adjustment of ${G.rates.timePct}% per month was applied${G.rateFrom && G.rateFrom.timePct ? ` [support: ${G.rateFrom.timePct}]` : ''}.` : `Market conditions were analyzed from each comparable's contract date through the effective date of the appraisal. The available market evidence did not show a measurable change in market conditions in the subject's market segment during this period, and no market conditions adjustment was warranted for the closed sales.`}`);
  parts.push('COMPARABLE PROPERTIES\n\n' + used.map((c, i) => drComp(J, c, T[i])).join('\n\n'));
  const RATE_AT = parts.length; parts.push('COMPARABLE ADJUSTMENT ANALYSIS\n\n' + drRates(J).join('\n\n'));
  { const dv = typeof methDerivation === 'function' ? methDerivation(J) : ''; if (dv) parts.push(dv); }
  const anyLimit = gridReview(J).some(f => f.limit); if (anyLimit) parts.push('ADJUSTMENT GUIDELINES\n\nSome individual, net, or gross adjustments may exceed the common guidelines of 10%, 15%, and 25%, respectively. These percentages may draw extra attention in some lending and review settings, but they are not absolute limits. The size of an adjustment does not by itself make a comparable unacceptable.\n\nWhen large adjustments were needed, the appraiser considered two questions: whether the comparable remained relevant after adjustment, and whether a more similar alternative was reasonably available. The selected comparables are the most relevant market evidence available for this assignment. Their adjustments reflect market-supported differences from the subject. Comparable selection and weighting are based on overall similarity, relevance, data reliability, and market support.');
  parts.push('SALES COMPARISON RECONCILIATION\n\n' + drRecon(J));
  DR.short = false;
  if (parts.join('\n\n').length > 10000 || DR.forceShort) { const sh = drRatesShort(J); if (sh) { parts[RATE_AT] = 'COMPARABLE ADJUSTMENT ANALYSIS\n\n' + sh; DR.short = true; } }
  return parts.join('\n\n');
}
function draftHTML(J) {
  if (!usedComps(J).length) return '';
  return `<div class="draft"><div class="row"><button class="btn" data-act="dr-make">${DR.open ? 'Draft again from the grid' : 'Draft the comment from my grid'}</button><small>Writes the comparable paragraphs, your rate paragraphs and the start of the reconciliation in your wording. [Brackets] are for you to fill in. Nothing goes into the comment until you press a button below.</small></div>
    ${DR.open ? `<textarea class="txt" rows="18" id="drText">${esc(DR.text)}</textarea>
    <div class="row"><button class="btn primary" data-act="dr-replace">Put it in the comment (replace)</button><button class="btn" data-act="dr-append">Add it to the end of the comment</button><button class="btn" data-act="dr-copy">Copy</button><button class="btn" data-act="dr-close">Close</button><label class="chk"><input type="checkbox" data-drshort="1" ${DR.short ? 'checked' : ''}> short rate paragraph</label><small>${DR.short && !DR.forceShort ? 'The full rate paragraphs would go past 10,000 characters, so your rates are listed in one short paragraph (your full paragraphs are in My comments). ' : ''}${(DR.text.match(/\[[^\]]+\]/g) || []).length} [brackets] to fill in · <span id="drCt">${scCount(DR.text)}</span></small></div>` : ''}</div>`;
}
