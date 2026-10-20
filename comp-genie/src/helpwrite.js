/* =====================================================================
   ✍ Help me write (Oct 20 2026, her ask): under each comment box. She types what she wants to say; Claude
   rewrites it so it reads well and fits UAD 3.6 and USPAP, with no biased wording – keeping every fact she gave
   and adding none. She reads the suggestion and picks "Use this" or "Keep mine"; nothing is replaced on its own.
   Her rules: AI only per the order's AI setting (No AI = nothing is sent; Redacted = names, phones and e-mails
   are taken out first); her own comment library (no order) sends only the text in the box, phones and e-mails removed.
   Shared by the Appraisal Assistant (hub) and the Comp genie – same file in both builds.
   ===================================================================== */
const HW_SEL = [
  // hub
  'textarea[data-ce="text"]', 'textarea[data-mk="comment"]', 'textarea[data-mk="boundary"]', 'textarea[data-mk="criteria"]', 'textarea[data-mcx="summary"]', '#pbComment', '#f_ea', '#f_hc', '#f_extra', '#f_rightsNot',
  // comp genie
  '#drText', 'textarea[data-gnote]', 'textarea[data-landc]', 'textarea[data-ck="comment"]', 'textarea[data-ik="comment"]', 'textarea[data-rpt="reconNote"]', 'textarea[data-rpt="hbuNote"]', 'textarea[data-rpt="sowNote"]', 'textarea[data-rpt="priorSvcText"]', 'textarea[data-rpt="addlCondText"]', 'textarea[data-rpt="rightsNot"]'].join(',');
const HW_BIAS = /\b(pride of ownership|desirable|undesirable|safe (?:area|neighborhood|community|street)|unsafe|crime|dangerous|exclusive|prestigious|upscale|elite|family[- ]friendly|young famil(?:y|ies)|kids|singles|retirees|elderly|seniors|church\w*|synagogue|mosque|ethnic\w*|integrated|diverse|master (?:bed(?:room)?|bath|suite)|man cave|handicap(?:ped)?|wheelchair[- ]bound|good (?:neighborhood|area|location)|bad (?:neighborhood|area)|neighborhood)\b/gi;
const hwKey = () => { try { return localStorage.getItem('aa.claudeKey') || ''; } catch (e) { return ''; } };
const hwModel = () => { let m = ''; try { m = localStorage.getItem('aa.claudeModel') || ''; } catch (e) {} m = m.trim().toLowerCase().replace(/[\s.]+/g, '-').replace(/-+/g, '-'); return m || 'claude-sonnet-5-5'; };
function hwOrderAi(ta) {   // 'Yes' | 'Redacted' | 'No' | 'library'
  if (ta.matches('textarea[data-ce="text"]')) return 'library';
  try { if (typeof cur !== 'undefined' && cur && document.getElementById('f_fileNo')) return cur.aiUse || ''; } catch (e) {}
  try { if (typeof app !== 'undefined' && app.job && typeof orderOf === 'function') { const o = orderOf(app.job); return (o && o.aiUse) || ''; } } catch (e) {}
  return '';
}
function hwScrub(t, mode) {
  let s = String(t || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail removed]').replace(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g, '[phone removed]');
  if (mode === 'Redacted') { try { if (typeof redactText === 'function' && typeof cur !== 'undefined' && cur) s = redactText(s); } catch (e) {} }
  return s;
}
function hwWhat(ta) {   // which comment it is, so the wording fits
  const lab = ta.closest('label, .fld, .field, section, .card, details'); const h = lab && lab.querySelector('span, b, h2, h3, summary');
  const k = ta.id || Object.entries(ta.dataset).map(([a, b]) => a + '=' + b).join(' ');
  const def = (HW_FIELDS.find(([sel]) => { try { return ta.matches(sel); } catch (e) { return false; } }) || [])[1];
  return (def ? def + ' ' : '') + '(on screen: ' + ((h && h.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 100) + (k ? ' [' + k + ']' : '') + ')';
}
/* what each box is in UAD 3.6 and what is reported elsewhere (so Claude does not ask her to repeat it) */
const HW_FIELDS = [
  ['textarea[data-mk="criteria"]', '17.004 Search Criteria Description (1,250 characters): the criteria used to find the competing properties within the market area boundary – MLS, property type, area/district, date range, size, quality, condition and any other filters. The counts, price ranges, days on market and list/sale figures are reported in the Search Result Metrics (17.005–17.016); the boundary is in 17.003 Market Area Boundary – do not add or ask for them here.'],
  ['textarea[data-mk="boundary"]', '17.003 Market Area Boundary (1,250 characters): the streets, landmarks or natural features that bound the market area. Not the search criteria or the results.'],
  ['textarea[data-mk="comment"]', '17.019 Price Trend Analysis Commentary (2,500 characters): how the price trend was analyzed and concluded (increasing / stable / declining) and its support. The sources are listed in 17.018 Price Trend Source; the counts and medians are in the Search Result Metrics. Her rule: price per square foot is not a measure of a price trend.'],
  ['textarea[data-mcx="summary"]', 'Form 1004MC summary (UAD 2.6 Market Conditions Addendum): summarize the market conditions shown by the 1004MC figures.'],
  ['#pbComment', 'Permit history comment: what the permit records show, by owner, newest first. Facts only.'],
  ['#f_ea', 'Extraordinary assumption(s) (USPAP): state the assumption, why it is needed, and that its use might affect the assignment results.'],
  ['#f_hc', 'Hypothetical condition(s) (USPAP): state the condition contrary to fact, why it is used, and that its use might affect the assignment results.'],
  ['#f_rightsNot, textarea[data-rpt="rightsNot"]', 'Rights not included in the appraisal (540 characters).'],
  ['#drText', 'Sales Comparison Approach commentary (UAD 3.6): why the comparables were selected, the adjustments and their support, and the range and reconciliation of the adjusted prices. The grid itself is reported separately.'],
  ['textarea[data-gnote]', 'Sales comparison grid note.'], ['textarea[data-ik="comment"]', 'Income Approach – Income Analysis Comment (5,000 characters): comparable rentals and the subject market rent, the GRM from rented sales, the indicated value, and the weight given (single-family homes are mostly owner-occupied).'], ['textarea[data-ck="comment"]', 'Cost Approach – Cost Analysis Comment (5,000 characters): source of cost new (her local contractor budgets, CCCI-indexed; BOE AH 531 check), cost type and method, depreciation (age-life: effective age / economic life), functional and external obsolescence, site improvements as is, and the weight given to the approach.'], ['textarea[data-landc]', 'Cost Approach – Site Estimated Value Comment (2,500 characters): how the site value was estimated (the land sales and their range).'],
  ['textarea[data-rpt="reconNote"]', 'Reconciliation commentary: the weight given to each approach and why, leading to the final opinion of value.'],
  ['textarea[data-rpt="hbuNote"]', 'Highest and Best Use commentary: the four tests (legally permissible, physically possible, financially feasible, maximally productive) as improved.'],
  ['textarea[data-rpt="sowNote"]', 'Assignment Information and Scope of Work commentary.'], ['textarea[data-rpt="priorSvcText"]', 'Prior services disclosure (1,250 characters): services performed regarding the subject within the three years before acceptance of the assignment.'],
  ['textarea[data-rpt="addlCondText"]', 'Additional client-requested conditions.'], ['textarea[data-ce="text"]', 'A comment for her own comment library.']];
const HW_SYS = `You help Jennifer, a California certified residential appraiser in Santa Barbara County, word comments for UAD 3.6 (redesigned URAR, Fannie Mae / Freddie Mac) reports. She is the expert: she knows UAD 3.6, USPAP and her market.
Rewrite her draft so it reads clearly and professionally in HER style. Rules:
- Keep every fact, number, date, rating and conclusion she wrote. Never add facts, numbers, adjustments, opinions or conclusions she did not state.
- Her vocabulary – keep it, never "correct" it: SBMLS (Santa Barbara MLS; never spell it out), Flexmls, Home/Estate (HE), district numbers, "market area" (never "neighborhood"), "finished area above grade" / "below grade" and "ANSI Z765" (UAD 3.6 terms; do not change them to GLA), Q1–Q6 and C1–C6 UAD ratings with her tiers written as she writes them ("high Q4", "low C3", "Q4+", "C3-"; a tier is her own refinement of the UAD rating – keep it, do not question it), "primary bedroom", "the appraiser", "effective date", "look-back period", "competing properties", "macro market area" (market area boundary search) and "micro market" (search criteria / competing properties).
- UAD 3.6 puts many facts in their own fields (counts, price ranges, days on market, boundaries, sources, ratings, sizes). Write only what belongs in THIS box (its definition is given). Do not add or ask for facts that have their own field.
- Plain, factual, objective wording that complies with USPAP: no advocacy, no guarantees, no marketing language, no exclamation marks, third person. Short sentences. Keep her order of ideas.
- No biased or subjective wording and nothing about protected classes (race, color, religion, national origin, sex, familial status, disability, age): never desirable, pride of ownership, safe, crime, exclusive, prestigious, upscale, family-friendly, master bedroom.
- Stay within the character limit.
"check": at most 3 items, only things genuinely required for THIS box by UAD 3.6 or USPAP that her draft leaves out, or a real inconsistency inside her draft. Never ask her to define her standard abbreviations or tiers, to confirm a term above, or to add something that has its own UAD field. Usually "check" is empty.
Reply with JSON only: {"text": "the rewritten comment", "changes": ["short note of what you changed"], "check": []}`;
async function hwRun(ta, box) {
  const draft = ta.value.trim(); const say = (h, cls) => { box.innerHTML = `<div class="hw-msg ${cls || ''}">${h}</div>`; };
  if (!draft) return say('Type what you want to say first, in your own words – then tap Help me write.');
  const mode = hwOrderAi(ta);
  if (mode === 'No') return say('This order is set to <b>No AI</b>, so nothing is sent. Change the order’s AI use to Yes or Redacted to use Help me write.', 'warn');
  if (!hwKey()) return say('No Claude key is saved on this computer. Add it in the Appraisal Assistant › Standard wording › AI settings.', 'warn');
  const lim = +ta.getAttribute('maxlength') || 0; const text = hwScrub(draft, mode);
  say('Claude is writing…');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': hwKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: hwModel(), max_tokens: 2000, system: HW_SYS + (hwRules() ? '\nHer own standing rules (follow them):\n' + hwRules() : ''), messages: [{ role: 'user', content: `Comment box: ${hwWhat(ta)}\nCharacter limit: ${lim || 'none stated (keep it as short as the content allows)'}\n\nHer draft:\n${text}` }] }) });
    const j = await res.json(); if (!res.ok) throw new Error((j.error && j.error.message) || 'Claude answered with an error (' + res.status + ')');
    const out = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''); const J = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    let t = String(J.text || '').trim(); if (!t) throw new Error('no text came back');
    const flags = [...new Set((t.match(HW_BIAS) || []).map(x => x.toLowerCase()))];
    box.innerHTML = `<div class="hw-out"><b>Suggested wording</b> <small>${t.length.toLocaleString()}${lim ? ' / ' + lim.toLocaleString() : ''} characters – read it and change anything before you use it</small>
      <textarea class="txt hw-txt" rows="${Math.min(14, 3 + Math.round(t.length / 95))}">${hwEsc(t)}</textarea>
      ${flags.length ? `<p class="hw-msg warn">Check these words: ${flags.map(hwEsc).join(', ')}</p>` : ''}${lim && t.length > lim ? `<p class="hw-msg warn">Over the ${lim.toLocaleString()} character limit – shorten it before you use it.</p>` : ''}
      ${(J.changes || []).length ? `<details><summary>What was changed</summary><ul>${J.changes.map(x => `<li>${hwEsc(x)}</li>`).join('')}</ul></details>` : ''}
      ${(J.check || []).length ? `<div class="hw-check"><b>You may want to check or add:</b><ul>${J.check.map(x => `<li>${hwEsc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="hw-row"><button type="button" class="btn primary sm hw-use">Use this</button><button type="button" class="btn sm hw-keep">Keep mine</button><button type="button" class="btn sm ghost hw-again">Try again</button></div></div>`;
    box.querySelector('.hw-use').onclick = () => { const v = box.querySelector('.hw-txt').value; ta.value = lim ? v.slice(0, lim) : v; ['input', 'change'].forEach(ev => ta.dispatchEvent(new Event(ev, { bubbles: true }))); box.innerHTML = '<div class="hw-msg ok">✓ Your comment box has the new wording. Read it once more before it goes in the report.</div>'; };
    box.querySelector('.hw-keep').onclick = () => { box.innerHTML = ''; };
    box.querySelector('.hw-again').onclick = () => hwRun(ta, box);
  } catch (e) { say('Help me write did not work: ' + hwEsc(e.message || String(e)), 'warn'); }
}
const hwRules = () => { try { return localStorage.getItem('aa.hwRules') || ''; } catch (e) { return ''; } };
function hwRulesUI(box) {
  box.innerHTML = `<div class="hw-out"><b>My writing rules</b> <small>one per line – used every time Help me write runs (kept on this computer)</small>
    <textarea class="txt hw-rules" rows="6" placeholder="e.g. Write SBMLS, never spell it out.&#10;Use “high Q4” / “low C3” for my tiers.&#10;Do not list the number of sales – it is in the Search Result Metrics.">${hwEsc(hwRules())}</textarea>
    <div class="hw-row"><button type="button" class="btn primary sm hw-rsave">Save my rules</button><button type="button" class="btn sm hw-keep">Close</button></div></div>`;
  box.querySelector('.hw-rsave').onclick = () => { try { localStorage.setItem('aa.hwRules', box.querySelector('.hw-rules').value.trim()); } catch (e) {} box.innerHTML = '<div class="hw-msg ok">✓ Saved – Help me write follows these from now on.</div>'; };
  box.querySelector('.hw-keep').onclick = () => { box.innerHTML = ''; };
}
const hwEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hwAttach(root) {
  (root || document).querySelectorAll(HW_SEL).forEach(ta => { if (ta.dataset.hw) return; ta.dataset.hw = '1';
    const wrap = document.createElement('div'); wrap.className = 'hw'; wrap.innerHTML = '<button type="button" class="btn sm hw-btn" title="Type what you want to say, then tap: Claude suggests clearer, UAD 3.6 / USPAP wording with no biased words. You decide whether to use it.">✍ Help me write</button> <button type="button" class="btn sm ghost hw-rbtn" title="Your standing rules for Help me write">My writing rules</button><div class="hw-box"></div>';
    ta.insertAdjacentElement('afterend', wrap); wrap.querySelector('.hw-btn').onclick = () => hwRun(ta, wrap.querySelector('.hw-box')); wrap.querySelector('.hw-rbtn').onclick = () => hwRulesUI(wrap.querySelector('.hw-box')); });
}
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = `.hw{margin:6px 0 10px}.hw-btn{background:#f3ecff;border-color:#7b5cc4;color:#3d2a7a}.hw-msg{font-size:14px;margin:6px 0;padding:6px 10px;border-radius:8px;background:#f5f5f5}.hw-msg.warn{background:#fff1e0;color:#8a4500}.hw-msg.ok{background:#eefbf3;color:#0a4d27}
.hw-out{border:2px solid #7b5cc4;border-radius:10px;padding:10px 12px;margin-top:6px;background:#fbf9ff}.hw-out textarea{width:100%;margin:6px 0}.hw-row{display:flex;gap:8px;flex-wrap:wrap}.hw-check{font-size:14px;background:#fffbe6;border-radius:8px;padding:6px 10px;margin:6px 0}.hw-check ul,.hw-out ul{margin:4px 0;padding-left:20px}`;
  (document.head || document.documentElement).appendChild(st);
  const go = () => { hwAttach(document); new MutationObserver(() => hwAttach(document)).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
}
