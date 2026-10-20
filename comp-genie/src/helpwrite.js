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
  '#drText', 'textarea[data-gnote]', 'textarea[data-landc]', 'textarea[data-rpt="reconNote"]', 'textarea[data-rpt="hbuNote"]', 'textarea[data-rpt="sowNote"]', 'textarea[data-rpt="priorSvcText"]', 'textarea[data-rpt="addlCondText"]', 'textarea[data-rpt="rightsNot"]'].join(',');
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
  return ((h && h.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 120) + (k ? ' [' + k + ']' : '');
}
const HW_SYS = `You help a California residential real estate appraiser write report comments for UAD 3.6 (Fannie Mae / Freddie Mac redesigned URAR) reports.
Rewrite her draft so it reads clearly, concisely and professionally. Rules:
- Keep every fact, number, date, rating and conclusion she wrote. Never add facts, numbers, adjustments, opinions or conclusions she did not state; if something a reviewer would expect is missing, list it under "check" instead of inventing it.
- Factual, objective, verifiable wording that complies with USPAP (no advocacy, no guarantee, no misleading statements) and UAD 3.6 conventions.
- No biased or subjective wording and nothing about protected classes (race, color, religion, national origin, sex, familial status, disability, age): do not use words such as desirable, pride of ownership, safe, crime, exclusive, prestigious, upscale, family-friendly, master bedroom (say primary bedroom). Say "market area", never "neighborhood".
- Keep her style: plain words, third person ("the appraiser"), no exclamation marks, no marketing language. Keep her low/high tier marks such as C3+ or Q4- exactly as written.
- Stay within the character limit given.
Reply with JSON only: {"text": "the rewritten comment", "changes": ["short note of what you changed"], "check": ["anything she should confirm or add"]}`;
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
      body: JSON.stringify({ model: hwModel(), max_tokens: 2000, system: HW_SYS, messages: [{ role: 'user', content: `Comment box: ${hwWhat(ta)}\nCharacter limit: ${lim || 'none stated (keep it as short as the content allows)'}\n\nHer draft:\n${text}` }] }) });
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
const hwEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hwAttach(root) {
  (root || document).querySelectorAll(HW_SEL).forEach(ta => { if (ta.dataset.hw) return; ta.dataset.hw = '1';
    const wrap = document.createElement('div'); wrap.className = 'hw'; wrap.innerHTML = '<button type="button" class="btn sm hw-btn" title="Type what you want to say, then tap: Claude suggests clearer, UAD 3.6 / USPAP wording with no biased words. You decide whether to use it.">✍ Help me write</button><div class="hw-box"></div>';
    ta.insertAdjacentElement('afterend', wrap); wrap.querySelector('.hw-btn').onclick = () => hwRun(ta, wrap.querySelector('.hw-box')); });
}
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = `.hw{margin:6px 0 10px}.hw-btn{background:#f3ecff;border-color:#7b5cc4;color:#3d2a7a}.hw-msg{font-size:14px;margin:6px 0;padding:6px 10px;border-radius:8px;background:#f5f5f5}.hw-msg.warn{background:#fff1e0;color:#8a4500}.hw-msg.ok{background:#eefbf3;color:#0a4d27}
.hw-out{border:2px solid #7b5cc4;border-radius:10px;padding:10px 12px;margin-top:6px;background:#fbf9ff}.hw-out textarea{width:100%;margin:6px 0}.hw-row{display:flex;gap:8px;flex-wrap:wrap}.hw-check{font-size:14px;background:#fffbe6;border-radius:8px;padding:6px 10px;margin:6px 0}.hw-check ul,.hw-out ul{margin:4px 0;padding-left:20px}`;
  (document.head || document.documentElement).appendChild(st);
  const go = () => { hwAttach(document); new MutationObserver(() => hwAttach(document)).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
}
