/* =====================================================================
   Review genie (her plan part C, Oct 21 2026): a second look before export, beyond the file check –
   math, consistency, USPAP, the engagement letter / client, GSE (Fannie / Freddie) and UAD 3.6.
   It reads only; nothing is changed for her. Each finding says where to go.
   ===================================================================== */
const REV_CATS = [['math', 'Math'], ['cons', 'Consistency'], ['uspap', 'USPAP'], ['client', 'Engagement letter and client'], ['gse', 'Fannie Mae / Freddie Mac'], ['uad', 'UAD 3.6 file']];
function reviewRun(J) { if (typeof RC !== 'undefined' && !RC && typeof rcRun === 'function') return rcRun(() => reviewRun(J));
  const out = []; const A = (cat, sev, msg, go) => out.push({ cat, sev, msg, go });
  const T = f => { try { f(); } catch (e) { A('math', 'Check', 'Part of the review could not run: ' + e.message); } };
  const G = G0(J), R = typeof RE === 'function' ? RE(J) : R0(J), F = reportFrom(J), S = subjFacts(J), U = usedComps(J), o = orderOf(J) || {};
  const eff = J.subject.eff || F.eff; const opinion = rptOpinion(J); const ind = num(G.value);
  const grid = { st: 'workbook', sel: '#gridCard' }, rep = { st: 'final', sel: '#reportCard' }, cost = { st: 'cost', sel: '#costCard' };
  /* ---- math ---- */
  T(() => { const tot = U.map(c => ({ c, t: compTotals(J, c) }));
    tot.forEach(({ c, t }) => { if (!t.price) return;
      if (Math.abs(t.netPct) > 15) A('math', 'Check', `Comp ${c.use} (${compTitle(c)}): net adjustment ${t.netPct.toFixed(1)}% – over 15%; explain why it is still a good comparable.`, grid);
      if (t.grossPct > 25) A('math', 'Check', `Comp ${c.use} (${compTitle(c)}): gross adjustment ${t.grossPct.toFixed(1)}% – over 25%; explain why it is still a good comparable.`, grid); });
    const adj = tot.filter(x => x.t.price).map(x => x.t.adj);
    if (ind && adj.length) { const lo = Math.min(...adj), hi = Math.max(...adj); if (ind < lo || ind > hi) A('math', 'Must fix', `Your indicated value ${money(ind)} is outside the adjusted range ${money(lo)} – ${money(hi)}.`, grid); }
    if (adj.length >= 2) { const lo = Math.min(...adj), hi = Math.max(...adj); if ((hi - lo) / lo > 0.15) A('math', 'Check', `The adjusted prices spread ${(((hi - lo) / lo) * 100).toFixed(0)}% (${money(lo)} – ${money(hi)}) – tighten the adjustments or explain the spread.`, grid); } });
  T(() => { const on = J.costOn ?? (R.sowCost === 'true' || (!R.sowCost && o.apCost)); if (!on) return; const K = costJob(J), X = costCalc(J);
    K.lines.forEach(l => { if (!blank(l.cost) && num(l.area) && num(l.rate) && Math.abs(+l.cost - num(l.area) * num(l.rate)) > 1) A('math', 'Must fix', `Cost approach line "${l.label || ((typeof COST_AREA !== 'undefined' && COST_AREA.find(x => x[0] === l.t)) || [, l.t])[1]}": amount ${money(+l.cost)} is not area × rate (${money(num(l.area) * num(l.rate))}) – UAD 3.6 requires them to agree.`, cost); });
    if (num(K.effAge) !== null && num(K.life) && num(K.effAge) > num(K.life)) A('math', 'Must fix', 'Effective age is more than the total economic life.', cost);
    if (!blank(K.value) && X.rounded && Math.abs(num(K.value) - X.ind) > Math.max(5000, X.ind * 0.01)) A('math', 'Check', `Cost approach: your value ${money(num(K.value))} differs from the sum ${money(Math.round(X.ind))} (site + depreciated improvements + site improvements).`, cost); });
  /* ---- consistency ---- */
  T(() => { const I = J.subject.insp || {};
    if (num(I.gla) && num(S.gla) && num(I.gla) !== num(S.gla)) A('cons', 'Check', `Subject living area: grid ${int(num(S.gla))} sq ft, iPad inspection ${int(num(I.gla))} sq ft.`, grid);
    const on = J.costOn ?? (R.sowCost === 'true' || (!R.sowCost && o.apCost));
    if (on) { const K = costJob(J); const liv = K.lines.find(l => l.t === 'StandardFinishedAreaAboveGrade'); if (liv && num(liv.area) && num(S.gla) && Math.abs(num(liv.area) - num(S.gla)) > 1) A('cons', 'Check', `Living area: cost approach ${int(num(liv.area))} sq ft, grid ${int(num(S.gla))} sq ft.`, cost);
      const age = num(S.year) && eff ? new Date(eff).getFullYear() - num(S.year) : null; if (age !== null && num(K.effAge) !== null && num(K.effAge) > age) A('cons', 'Check', `Effective age ${num(K.effAge)} years is more than the actual age (${age}) – explain it (deferred maintenance) or look again.`, cost); }
    const money$ = t => (String(t || '').match(/\$\s?[\d,]{6,}/g) || []).map(x => num(x.replace(/[$,\s]/g, '')));
    { const m = String(G.note || '').match(/indicated (?:value|by the sales comparison)[^$.]{0,80}(\$\s?[\d,]{6,})/i); if (m && ind && num(m[1].replace(/[$,\s]/g, '')) !== ind) A('cons', 'Must fix', `The sales comparison comment says ${m[1].trim()}, but your indicated value is ${money(ind)}.`, { st: 'workbook', sel: 'textarea[data-gnote]' }); }
    if (opinion) { const v = money$(R.reconNote); if (v.length && !v.includes(opinion) && /(opinion|market value|reconcil)/i.test(R.reconNote || '')) A('cons', 'Check', `The reconciliation comment names ${v.map(money).join(', ')} – your opinion of value is ${money(opinion)}.`, rep); }
    if (opinion && ind && Math.abs(opinion - ind) / ind > 0.05) A('cons', 'Check', `Opinion of value ${money(opinion)} is ${((opinion - ind) / ind * 100).toFixed(1)}% from your sales comparison value ${money(ind)} – say why in the reconciliation.`, rep);
    if (opinion && on) { const X = costCalc(J); if (X.ind && Math.abs(X.ind - opinion) / opinion > 0.1) A('cons', 'Check', `The cost approach (${money(Math.round(X.ind))}) is ${(((X.ind - opinion) / opinion) * 100).toFixed(0)}% from your opinion – explain the weight you gave it.`, rep); } });
  /* ---- USPAP ---- */
  T(() => { const vc = R.vcond || 'AsIs'; const ea = String(R.eaNote || '').trim(), hc = String(R.hcNote || '').trim();
    if (/SubjectTo/i.test(vc) && !hc && !ea) A('uspap', 'Must fix', `Market value condition is "${vc.replace(/([a-z])([A-Z])/g, '$1 $2')}" – state the hypothetical condition (or extraordinary assumption) it rests on (Report details).`, rep);
    [[ea, 'extraordinary assumptions'], [hc, 'hypothetical conditions']].forEach(([t, l]) => { if (t && !/(might|may|could) (have )?affect/i.test(t)) A('uspap', 'Check', `USPAP: say that the use of the ${l} might have affected the assignment results.`, rep); });
    if (!String(R.hbuNote || '').trim()) A('uspap', 'Check', 'Highest and best use comment is blank – summarize your support (Order › Scope of work or Report details).', rep);
    if (o.inspection === 'exterior' && /Interior/i.test(String((J.subject.insp || {}).inspType || F.insp || ''))) A('uspap', 'Check', 'The order says exterior only, but the inspection is interior and exterior – make the scope of work match what you did.', rep);
    if (o.id && !(o.docs || []).some(d => ['clientLetter', 'myLetter'].includes(d.type)) && !o.letterMade) A('uspap', 'Check', 'No engagement letter in the order’s documents – keep it in your workfile.', null); });
  /* ---- engagement letter and client ---- */
  T(() => { (typeof clientNeeds === 'function' ? clientNeeds(J) : []).forEach(x => A('client', x.warn ? 'Check' : 'Check', 'The client’s letter asks for: ' + x.t + '.', rep));
    if (o.dueDate) { const d = (new Date(o.dueDate) - new Date()) / 864e5; if (d < 0) A('client', 'Check', `The report was due ${showDate(o.dueDate)}.`, null); else if (d < 2) A('client', 'Check', `The report is due ${showDate(o.dueDate)}.`, null); }
    const cl = String(rv(J, 'client') || '').trim(), c0 = ((o.clients || [])[0] || {}); const oc = String(c0.company || c0.name || '').trim();
    if (cl && oc && cl.toLowerCase() !== oc.toLowerCase()) A('client', 'Check', `Client in Report details "${cl}" is not the order's client "${oc}".`, rep); });
  /* ---- Fannie / Freddie ---- */
  T(() => { const closed = U.filter(c => !compFacts(c, J).listing); if (closed.length < 3) A('gse', 'Must fix', `${closed.length} closed sale${closed.length === 1 ? '' : 's'} on the grid – Fannie Mae and Freddie Mac expect at least three.`, { st: 'micro', sel: '#compsCard' });
    U.forEach(c => { const C = compFacts(c, J); if (C.sale && eff) { const m = monthsBetween(C.sale, eff); if (isFinite(m) && m > 12) A('gse', 'Check', `Comp ${c.use} sold ${Math.round(m)} months before the effective date – explain why a sale over 12 months old is used.`, grid); }
      const px = proximity(c, J); if (px && px.mi > 1) A('gse', 'Check', `Comp ${c.use} is ${px.mi.toFixed(2)} miles away – explain why closer sales were not used.`, grid); });
    const old6 = U.some(c => { const C = compFacts(c, J); const m = C.sale && eff ? monthsBetween(C.sale, eff) : 0; return isFinite(m) && m > 6; }); if (old6 && blank(G.rates.timePct)) A('gse', 'Check', 'Some sales are over 6 months old and there is no market conditions (time) rate – support "no adjustment" in the comment.', grid);
    const gl = closed.map(c => num(compFacts(c, J).gla)).filter(Boolean); if (num(S.gla) && gl.length >= 2 && (num(S.gla) < Math.min(...gl) || num(S.gla) > Math.max(...gl))) A('gse', 'Check', `The subject's living area (${int(num(S.gla))} sq ft) is not bracketed by the comps (${int(Math.min(...gl))} – ${int(Math.max(...gl))}).`, grid);
    const pr = closed.map(c => compFacts(c, J).price).filter(Boolean); if (opinion && pr.length >= 2 && (opinion < Math.min(...pr) || opinion > Math.max(...pr))) A('gse', 'Check', `Your opinion of value ${money(opinion)} is outside the comps' sale prices (${money(Math.min(...pr))} – ${money(Math.max(...pr))}) – explain.`, grid); });
  /* ---- UAD 3.6 file ---- */
  { const P = app.pre && app.pre.job === J.id ? app.pre : null; if (!P) A('uad', 'Check', 'Run the pre-check below – it checks the report file against Fannie Mae’s UAD 3.6 rules (Appendix A-1).', { st: 'final', sel: '#preCard' });
    else { const must = P.items.filter(x => x.sev === 'Must fix').length; if (must) A('uad', 'Must fix', `The pre-check found ${must} thing${must > 1 ? 's' : ''} to fix in the report file.`, { st: 'final', sel: '#preCard' }); } }
  return { at: Date.now(), job: J.id, items: out }; }
function reviewHTML(J) { const V = app.review && app.review.job === J.id ? app.review : null;
  const head = `<h2>Review genie <small>a second look before export</small></h2>
    <p class="help">Checks the math, consistency between the grid, the cost approach, the comments and the iPad, USPAP disclosures, the client's engagement letter, Fannie Mae / Freddie Mac expectations and the UAD 3.6 file. It reads only – nothing is changed. You decide.</p>
    <div class="row"><button class="btn primary" data-act="rev-run">${V ? 'Review again' : 'Review this report'}</button>${V ? `<small>${new Date(V.at).toLocaleTimeString()} · ${V.items.filter(x => x.sev === 'Must fix').length} must fix · ${V.items.filter(x => x.sev !== 'Must fix').length} to check</small>` : ''}</div>`;
  if (!V) return head;
  return head + REV_CATS.map(([k, l]) => { const L = V.items.map((x, i) => ({ ...x, i })).filter(x => x.cat === k);
    return `<div class="revcat"><h3>${L.length ? '' : '<i class="pck">✓</i> '}${l}${L.length ? ` <small>${L.length}</small>` : ' <small class="rvok">nothing found</small>'}</h3>${L.map(x => `<div class="rv${x.go ? ' rvgo' : ''}"${x.go ? ` data-revgo="${x.i}" title="Click to go there"` : ''}><span class="rvs rv-${x.sev === 'Must fix' ? 'Mustfix' : 'Check'}">${esc(x.sev)}</span><span>${esc(x.msg)}${x.go ? ' <small class="rvlink">→ go there</small>' : ''}</span></div>`).join('')}</div>`; }).join(''); }
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-act="rev-run"],[data-revgo]'); if (!t || !app.job) return;
  if (t.dataset.act === 'rev-run') { app.review = reviewRun(app.job); const c = document.getElementById('reviewCard'); if (c) c.innerHTML = reviewHTML(app.job); return; }
  const x = (app.review && app.review.items || [])[+t.dataset.revgo]; if (!x || !x.go) return; app.job.stage = x.go.st; save(); render.top = true; render();
  setTimeout(() => { const el = document.querySelector(x.go.sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); });
