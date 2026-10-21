/* =====================================================================
   Adjustment support, two more checks (her path, step 9 – Oct 21 2026):
   1. Depreciated cost check – what each adjusted feature costs new (her cost database / her cost approach lines),
      less the subject's depreciation, beside her grid rate. Cost is an upper limit for most features: buyers rarely
      pay full depreciated cost for extra area or a pool, so her rate is normally at or below it.
   2. Matched pairs – only when two sales really differ in one feature and match on the rest (rare in her market).
   Both are support beside her rate – she decides.
   ===================================================================== */
function costCheck(J) { const G = G0(J), K = costJob(J), X = costCalc(J), M = costMedians(J), S = subjFacts(J);
  const soft = X.hardDw ? (X.hardDw + X.softAmt) / X.hardDw : (num(K.softPct) ? 1 + num(K.softPct) / 100 : 1);
  const dep = X.phys || 0, keep = 1 - dep / 100; const line = re => K.lines.find(l => re.test(l.t) && num(l.rate));
  const liv = line(/^StandardFinishedAreaAboveGrade$/), bg = line(/^StandardFinishedAreaBelowGrade$/), gar = line(/Garage/);
  const livRate = liv ? num(liv.rate) : M.bd ? Math.round(M.bd) : null;
  const out = [];
  const add = (k, label, unit, cn, src, note) => { if (!cn) return; const d = Math.round(cn * keep); out.push({ k, label, unit, cn: Math.round(cn), d, src, note, yours: G.rates[k] }); };
  add('gla', 'Living area', 'per sq ft', livRate && livRate * soft, liv ? 'your cost approach living-area rate' : `median of your budgets (${M.n || 0})`, 'Upper limit: extra square feet usually add less than their average cost, so your rate is normally well below this.');
  add('bsmtFin', 'Finished below grade', 'per sq ft', bg && num(bg.rate) * soft, 'your cost approach line', '');
  add('aduSf', 'ADU / guest sq ft', 'per sq ft', livRate && livRate * soft, liv ? 'the living-area rate' : 'median of your budgets', 'A separate unit can be worth more or less than its cost – rental use, permits and the market decide.');
  { const sp = num(S.garage); const per = gar && num(gar.area) && sp ? num(gar.area) / sp * num(gar.rate) : gar ? 240 * num(gar.rate) : (M.gar ? 240 * M.gar : null);
    add('space', 'Garage space', 'per space', per && per * soft, gar && sp ? `your garage line (${int(num(gar.area))} sq ft ÷ ${sp} spaces)` : gar ? 'your garage rate × 240 sq ft a space' : 'median garage $/sq ft × 240 sq ft a space', ''); }
  add('pool', 'Pool', 'each', M.pool, 'median pool & spa in your budgets', 'Pools rarely return their cost in resale – check the grouped sales.');
  add('landStep', 'Landscaping', 'all of it (your rate is per step)', M.land, 'median landscaping & irrigation in your budgets', 'Compare a full upgrade, not one step.');
  return { rows: out, dep, n: M.n || 0, hasDb: !!app.costDb }; }
function costCheckHTML(J) { let C; try { C = costCheck(J); } catch (e) { return ''; }
  const head = `<h3 style="margin-top:18px">Depreciated cost check <small>what the feature costs new, less depreciation</small></h3>`;
  if (!C.hasDb && !C.rows.length) return head + `<p class="help">Add your construction cost database (📥 Add to my databases) or fill in the cost approach lines to see this.</p>`;
  const f = v => blank(v) ? '–' : money(v);
  return head + `<div class="tablewrap"><table class="ts sup"><thead><tr><th>Feature</th><th>Your rate</th><th>Cost new</th><th>Less ${Math.round(C.dep * 10) / 10}% depreciation</th><th>From</th><th></th></tr></thead><tbody>
    ${C.rows.map(r => `<tr><th>${esc(r.label)} <small>${esc(r.unit)}</small></th><td>${f(r.yours)}</td><td>${f(r.cn)}</td><td><b>${f(r.d)}</b></td><td><small>${esc(r.src)}</small></td><td>${!blank(r.yours) && r.yours > r.d * 1.05 && r.k !== 'landStep' ? '<small class="warnTxt">Your rate is above the depreciated cost – say why in the comment, or look again.</small><br>' : ''}<small>${esc(r.note)}</small></td></tr>`).join('')}
    </tbody></table></div><p class="help">Depreciation is the subject's from your cost approach (effective age ÷ economic life${C.dep ? '' : ' – not filled in yet, so 0%'}). Cost new includes your soft-cost percent. Cost shows what a feature would take to add; the market may pay less.</p>`; }

/* matched pairs: two sales (closed, within 12 months of each other) that match on everything but one feature */
const PAIR_FEATS = [
  ['gla', 'Living area', (a, b) => Math.abs(a.gla - b.gla) / Math.max(a.gla, b.gla) <= 0.05, (a, b) => Math.abs(a.gla - b.gla) >= 100, (a, b) => a.gla - b.gla, 'sq ft'],
  ['site', 'Site size', (a, b) => !a.site || !b.site || Math.abs(a.site - b.site) / Math.max(a.site, b.site) <= 0.15, (a, b) => a.site && b.site && Math.abs(a.site - b.site) / Math.max(a.site, b.site) > 0.25, (a, b) => a.site - b.site, 'sq ft of site'],
  ['q', 'Quality', (a, b) => String(a.q || '').slice(0, 2) === String(b.q || '').slice(0, 2), (a, b) => qn(a.q) && qn(b.q) && qn(a.q) !== qn(b.q), (a, b) => qn(b.q) - qn(a.q), 'step'],
  ['c', 'Condition', (a, b) => String(a.c || '').slice(0, 2) === String(b.c || '').slice(0, 2), (a, b) => qn(a.c) && qn(b.c) && qn(a.c) !== qn(b.c), (a, b) => qn(b.c) - qn(a.c), 'step'],
  ['view', 'View', (a, b) => vwKey(a) === vwKey(b), (a, b) => vwKey(a) !== vwKey(b), null, ''],
  ['full', 'Full baths', (a, b) => num(a.full) === num(b.full), (a, b) => num(a.full) !== null && num(b.full) !== null && num(a.full) !== num(b.full), (a, b) => num(a.full) - num(b.full), 'bath'],
  ['garage', 'Garage spaces', (a, b) => (num(a.garage) || 0) === (num(b.garage) || 0), (a, b) => (num(a.garage) || 0) !== (num(b.garage) || 0), (a, b) => (num(a.garage) || 0) - (num(b.garage) || 0), 'space'],
  ['pool', 'Pool', (a, b) => /pool/i.test(a.pool || '') === /pool/i.test(b.pool || ''), (a, b) => /pool/i.test(a.pool || '') !== /pool/i.test(b.pool || ''), (a, b) => (/pool/i.test(a.pool || '') ? 1 : 0) - (/pool/i.test(b.pool || '') ? 1 : 0), 'pool'],
  ['year', 'Year built', (a, b) => !num(a.year) || !num(b.year) || Math.abs(num(a.year) - num(b.year)) <= 10, (a, b) => num(a.year) && num(b.year) && Math.abs(num(a.year) - num(b.year)) > 20, null, '']];
const qn = v => { const m = String(v || '').match(/[QC]([1-6])/i); return m ? +m[1] : null; };
const vwKey = F => String(F.view || '').replace(/\s*\([^)]*\)/g, '').toLowerCase().split(/;\s*/).filter(Boolean).sort().join('|');
function matchedPairs(J) { const G = G0(J), tp = num(G.rates.timePct) || 0, eff = J.subject.eff;
  const L = J.comps.map(c => ({ c, F: compFacts(c, J) })).filter(x => x.F.price && x.F.sale && x.F.gla && !x.F.listing);
  const adjP = F => { const m = eff ? monthsBetween(F.sale, eff) : 0; return F.price * (1 + tp / 100 * (m || 0)); };
  const out = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i].F, b = L[j].F; const mo = monthsBetween(a.sale, b.sale); if (!isFinite(mo) || Math.abs(mo) > 12) continue;
    const diff = PAIR_FEATS.filter(([k, , same]) => !same(a, b)); if (diff.length !== 1) continue; const [k, label, , big, d, unit] = diff[0]; if (!big(a, b)) continue;
    const pd = adjP(a) - adjP(b); const units = d ? d(a, b) : null; out.push({ k, label, a: L[i].c, b: L[j].c, pd: Math.round(pd), per: units ? Math.round(pd / units) : null, unit, units }); }
  return out; }
function pairsHTML(J) { let P; try { P = matchedPairs(J); } catch (e) { return ''; }
  const head = `<h3 style="margin-top:18px">Matched pairs <small>two sales alike in everything but one feature</small></h3>`;
  if (!P.length) return head + `<p class="help">No matched pairs among the ${J.comps.length} sales in this assignment – usual in your market. A pair shows here only when two closed sales within 12 months of each other match on living area (±5%), site, quality, condition, view, baths, garage, pool and age, and differ in one of them.</p>`;
  return head + `<div class="tablewrap"><table class="ts sup"><thead><tr><th>Feature</th><th>Sales</th><th>Price difference<br><small>after your time adjustment</small></th><th>Per unit</th><th>Your rate</th></tr></thead><tbody>
    ${P.map(x => `<tr><th>${esc(x.label)}</th><td>${esc(compTitle(x.a))} vs ${esc(compTitle(x.b))}${x.units ? `<br><small>${x.k === 'pool' ? 'only one has a pool' : `differ by ${Math.abs(x.units).toLocaleString()} ${esc(x.unit)}${Math.abs(x.units) > 1 && !/ft$/.test(x.unit) ? 's' : ''}`}</small>` : ''}</td><td>${money(Math.abs(x.pd))}</td><td>${x.per === null ? '–' : (x.per < 0 ? '−' + money(-x.per) : money(x.per)) + ' per ' + esc(x.unit)}</td><td>${(() => { const r = { gla: 'gla', full: 'bath', garage: 'space', pool: 'pool', q: 'qStep', c: 'cStep', site: 'site' }[x.k]; const v = r && G0(J).rates[r]; return blank(v) ? '–' : money(v); })()}</td></tr>`).join('')}
    </tbody></table></div><p class="help">One pair is a clue, not proof – other differences you have not entered (location on the street, updates, the buyer) can be in the price. Look at both sales before relying on it.</p>`; }
