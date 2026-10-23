/* =====================================================================
   "My comments" on every comment box (her ask Oct 21 2026: "if I am in the highest and best use section, I click
   in the comment box and I can either type or pull in a standard comment for that section").
   - Each comment box knows its section (CPK_BOX). Clicking into the box shows that section's comments as chips
     under it – one click puts the comment in at the cursor. "📋 My comments" opens the full list for that
     section (search, "show every section", UAD 2.6 comments hidden unless ticked).
   - The library is her hub "My comments" (kv 'cmt:lib', this computer only). Shared file: built into the Comp
     genie and the hub.
   ===================================================================== */
const CPK = { lib: null, target: null, caret: null, q: '', also26: false, all: false, box: null };
/* [which boxes, what the box is, which sections of her library belong to it] */
const CPK_BOX = [
  ['textarea[data-gnote], #drText', 'Sales comparison', /sales comp|comparable search|comparable selection/i],
  ['textarea[data-rpt="reconNote"]', 'Reconciliation', /reconcil/i],
  ['textarea[data-rpt="hbuNote"], #f_hbuNote', 'Highest and best use', /highest and best|\bhbu\b/i],
  ['textarea[data-rpt="sowNote"], #f_sowNote', 'Scope of work', /scope of work|data source|ansi/i],
  ['textarea[data-rpt="eaNote"], #f_ea', 'Extraordinary assumptions', /extraordinary|\bEA\b/],
  ['textarea[data-rpt="hcNote"], #f_hc', 'Hypothetical conditions', /hypothetical|\bHC\b/],
  ['textarea[data-rpt="priorSvcText"]', 'Prior services', /prior (appraisal|service)/i],
  ['textarea[data-rpt="addlCondText"]', 'Assignment conditions', /assignment|condition|limiting/i],
  ['textarea[data-rpt="rightsNot"], #f_rightsNot', 'Rights not appraised', /rights|mineral|ownership/i],
  ['textarea[data-rpt^="cert"]', 'Additional certifications', /certif/i],
  ['textarea[data-rpt="cAssign"]', 'Assignment information and scope of work', /assignment|inspection|scope of work|ansi/i],
  ['textarea[data-rpt="cSubjPrior"], textarea[data-rpt="cCompPrior"]', 'Prior sales and transfers', /prior sale|transfer|sales history/i],
  ['textarea[data-rpt="cSite"]', 'Site', /^site(?! value)|zoning|hazard|flood|fire|views?\b/i],
  ['textarea[data-rpt="cSubject"]', 'Subject property', /subject|improvement|functional|energy|green|ansi/i],
  ['textarea[data-rpt="cQC"]', 'Quality and condition', /quality and condition|overall quality|condition rating/i],
  ['textarea[data-rpt="cMarket"], textarea[data-mcx="summary"]', 'Market', /market(?! boundar)|price trend/i],
  ['textarea[data-mk="general"]', 'Market', /market(?! boundar)|price trend/i],
  ['textarea[data-mk="comment"]', 'Price trends', /price trend|market commentary|market condition/i],
  ['textarea[data-mk="boundary"]', 'Market area boundary', /boundar|neighborhood|market area/i],
  ['textarea[data-mk="criteria"]', 'Search criteria', /criteria|comparable search|search/i],
  ['textarea[data-landc]', 'Site value', /site value|land/i],
  ['textarea[data-ck="comment"]', 'Cost approach', /cost/i],
  ['textarea[data-ik="comment"]', 'Income approach', /income|rent/i],
  ['#pbComment', 'Permits', /permit/i],
  ['#f_userText', 'Intended use and user', /intended (use|user)/i],
  ['#f_extra', 'Engagement letter terms', /engagement|letter|terms|confidential/i]];
const cpkBoxOf = ta => CPK_BOX.find(([s]) => ta.matches(s));
/* the same box again after the page redraws: its id, or its data- attributes */
const cpkKey = ta => ta.id ? '#' + CSS.escape(ta.id) : 'textarea' + [...ta.attributes].filter(a => a.name.startsWith('data-') && !/^data-(cpk|hw)$/.test(a.name)).map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
async function cpkLoad() {
  try { if (typeof CMT !== 'undefined' && CMT && Object.keys(CMT).length) { CPK.lib = Object.values(CMT); return; } } catch (e) {}   // in the hub: the library as it is now
  let r = null; try { r = typeof ODB !== 'undefined' ? await ODB.get('kv', 'cmt:lib') : await readOrderKv('cmt:lib'); } catch (e) {}
  CPK.lib = r && r.v ? Object.values(r.v).filter(x => x && x.text) : []; }
const cpkUsable = x => CPK.also26 || x.ver !== '2.6';
function cpkFor(B) { const L = (CPK.lib || []).filter(x => x.text && cpkUsable(x)); if (!B) return { sec: [], title: [] };
  const sec = L.filter(x => B[2].test(x.section || '')), title = L.filter(x => !sec.includes(x) && B[2].test(x.title || ''));
  const by = (a, b) => (a.section || '').localeCompare(b.section || '') || (a.title || '').localeCompare(b.title || '');
  return { sec: sec.sort(by), title: title.sort(by) }; }
const cpkEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* --- the button and chips under each box --- */
function cpkAttach() { document.querySelectorAll(CPK_BOX.map(b => b[0]).join(',')).forEach(ta => { if (ta.dataset.cpk) return; ta.dataset.cpk = '1';
  let w = ta.nextElementSibling; if (!(w && w.classList.contains('hw'))) { w = document.createElement('div'); w.className = 'hw cpkw'; ta.insertAdjacentElement('afterend', w); }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm cpk-btn'; b.textContent = '📋 My comments'; b.title = 'Pull in one of your standard comments for this section';
  b.dataset.cmtpick = cpkKey(ta); w.insertBefore(b, w.firstChild); b.insertAdjacentText('afterend', ' ');
  const chips = document.createElement('div'); chips.className = 'cpkchips'; chips.hidden = true; w.appendChild(chips); }); }
document.addEventListener('focusin', async e => { const ta = e.target; if (!ta || ta.tagName !== 'TEXTAREA' || !ta.dataset.cpk) return; const B = cpkBoxOf(ta); if (!B) return;
  if (!CPK.lib) await cpkLoad(); const w = ta.nextElementSibling; const ch = w && w.querySelector('.cpkchips'); if (!ch) return;
  const { sec, title } = cpkFor(B); const L = [...sec, ...title];
  ch.innerHTML = !(CPK.lib || []).length ? '<small class="muted">Type here, or add your comment library in the Octopus › My comments to pull in standard comments.</small>'
    : L.length ? `<small class="cpklead">Type, or click one of your ${cpkEsc(B[1].toLowerCase())} comments:</small> ${L.slice(0, 8).map(x => `<button type="button" class="cpkchip" data-cpkins="${cpkEsc(x.id)}" data-cpkto="${cpkEsc(cpkKey(ta))}" title="${cpkEsc(x.text.slice(0, 300))}">${cpkEsc(x.title)}</button>`).join('')}${L.length > 8 ? ` <button type="button" class="cpkchip more" data-cmtpick="${cpkEsc(cpkKey(ta))}">all ${L.length} …</button>` : ''}`
    : `<small class="muted">No ${cpkEsc(B[1].toLowerCase())} comments in your library yet – type it, or 📋 My comments to look in every section.</small>`;
  ch.hidden = false; });
document.addEventListener('focusout', e => { const t = e.target; if (!t || t.tagName !== 'TEXTAREA') return; try { CPK.caretOf = [cpkKey(t), t.selectionStart, t.selectionEnd]; } catch (x) {}
  if (!t.dataset.cpk) return; setTimeout(() => { const ch = t.nextElementSibling && t.nextElementSibling.querySelector('.cpkchips'); if (ch && document.activeElement !== t) ch.hidden = true; }, 250); }, true);
document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.cpkchip')) e.preventDefault(); });   // keep the cursor in the box
/* --- the full list for that section --- */
async function cpkOpen(key) { await cpkLoad(); CPK.target = key; const box = document.querySelector(key); CPK.box = box ? cpkBoxOf(box) : null; CPK.all = !CPK.box; CPK.q = '';
  CPK.caret = CPK.caretOf && CPK.caretOf[0] === key ? [CPK.caretOf[1], CPK.caretOf[2]] : null;
  cpkRender(); const q = document.getElementById('cpkQ'); if (q) q.focus(); }
function cpkRender() {
  let m = document.getElementById('cpk'); if (!m) { m = document.createElement('div'); m.id = 'cpk'; m.className = 'cpk'; document.body.appendChild(m); }
  const B = CPK.box, words = CPK.q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = x => { const t = (x.title + ' ' + x.section + ' ' + x.text).toLowerCase(); return words.every(w => t.includes(w)); };
  let groups; if (B && !CPK.all) { const f = cpkFor(B); groups = [[`Your ${B[1].toLowerCase()} comments`, f.sec.filter(hit)], ['Other sections that mention it', f.title.filter(hit)]]; }
  else { const L = (CPK.lib || []).filter(x => x.text && cpkUsable(x) && hit(x)).sort((a, b) => (a.section || '').localeCompare(b.section || '') || (a.title || '').localeCompare(b.title || '')); groups = [['Every section', L]]; }
  const n26 = (CPK.lib || []).filter(x => x.ver === '2.6').length, box = document.querySelector(CPK.target), full = box && box.value.trim();
  const hi = s => cpkEsc(s).replace(/\[([^\]]{1,80})\]/g, '<mark class="blank">[$1]</mark>').replace(/\n/g, '<br>');
  const item = x => `<div class="cpki"><div class="row"><b>${cpkEsc(x.title)}</b><small class="vt v${String(x.ver).replace('.', '')}">${x.ver === 'both' ? '2.6 and 3.6' : 'UAD ' + cpkEsc(x.ver)}</small><small class="muted">${cpkEsc(x.section)}</small><span class="grow"></span><button class="btn sm primary" data-cpkins="${cpkEsc(x.id)}">${full ? 'Add it' : 'Use this'}</button>${full ? `<button class="btn sm" data-cpkins="${cpkEsc(x.id)}" data-cpkrep="1">Replace my text</button>` : ''}</div><div class="cpkt">${hi(x.text.slice(0, 900))}${x.text.length > 900 ? '…' : ''}</div></div>`;
  const shown = groups.reduce((n, g) => n + g[1].length, 0);
  m.innerHTML = `<div class="cpkbox" role="dialog"><div class="row"><b>My comments${B ? ' – ' + cpkEsc(B[1]) : ''}</b><span class="grow"></span><button class="btn sm" data-cpk="close">Close</button></div>
    ${!(CPK.lib || []).length ? '<p class="help">Your comment library is empty in this browser. In the Octopus, open <b>My comments</b> and import your comments first.</p>' : `
    <div class="row"><input id="cpkQ" class="txt" placeholder="Search, e.g. legally permissible, view, net adjustment" value="${cpkEsc(CPK.q)}">
      ${B ? `<label class="chk"><input type="checkbox" data-cpk="all" ${CPK.all ? 'checked' : ''}> show every section</label>` : ''}
      <label class="chk"><input type="checkbox" data-cpk="26" ${CPK.also26 ? 'checked' : ''}> also UAD 2.6 comments (${n26})</label></div>
    <div class="cpklist">${groups.filter(g => g[1].length).map(([t, L]) => `<h4 class="cpkh">${cpkEsc(t)} (${L.length})</h4>${L.map(item).join('')}`).join('')}
      ${shown ? '' : `<p class="help">Nothing found${B && !CPK.all ? ' for this section – tick “show every section”' : ''}${!CPK.also26 && n26 ? ', or tick “also UAD 2.6 comments”' : ''}.</p>`}</div>`}</div>`;
}
function cpkPut(id, key, replace) { const x = (CPK.lib || []).find(y => y.id === id); const box = document.querySelector(key); if (!x || !box) return;
  const v = box.value; const [a, z] = replace ? [0, v.length] : (document.activeElement === box ? [box.selectionStart, box.selectionEnd] : CPK.caret || [v.length, v.length]);
  const pre = v.slice(0, a), post = v.slice(z); const sep = pre && !/\s$/.test(pre) ? (/[.!?:]$/.test(pre.trim()) && !/\n/.test(x.text) ? ' ' : '\n\n') : '';
  box.value = pre + sep + x.text + (post && !/^\s/.test(post) ? ' ' : '') + post; const at = (pre + sep + x.text).length;
  box.dispatchEvent(new Event('input', { bubbles: true })); box.dispatchEvent(new Event('change', { bubbles: true }));
  const m = document.getElementById('cpk'); if (m) m.remove();
  setTimeout(() => { const nb = document.querySelector(key); if (nb) { nb.focus(); try { nb.setSelectionRange(at, at); } catch (y) {} } }, 60);
  const max = +box.getAttribute('maxlength') || 0, len = (pre + sep + x.text + post).length;
  const msg = max && len > max ? `Put in – but the box is now ${(len - max).toLocaleString()} characters over its ${max.toLocaleString()} limit; shorten it` : /\[[^\]]+\]/.test(x.text) ? 'Put in – fill in the [blanks]' : 'Put in';
  if (typeof toast === 'function') toast(msg, max && len > max ? 7000 : 3000); }
document.addEventListener('click', e => { if (!e.target.closest) return;
  const b = e.target.closest('[data-cmtpick]'); if (b) { e.preventDefault(); cpkOpen(b.dataset.cmtpick); return; }
  if (e.target.closest('[data-cpk="close"]') || e.target.id === 'cpk') { const m = document.getElementById('cpk'); if (m) m.remove(); return; }
  const i = e.target.closest('[data-cpkins]'); if (i) { e.preventDefault(); cpkPut(i.dataset.cpkins, i.dataset.cpkto || CPK.target, !!i.dataset.cpkrep); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = document.getElementById('cpk'); if (m) m.remove(); } });
document.addEventListener('input', e => { if (e.target.id === 'cpkQ') { CPK.q = e.target.value; const pos = e.target.selectionStart; cpkRender(); const q = document.getElementById('cpkQ'); q.focus(); q.setSelectionRange(pos, pos); } });
document.addEventListener('change', e => { const d = e.target.dataset && e.target.dataset.cpk; if (d === '26') { CPK.also26 = e.target.checked; cpkRender(); } if (d === 'all') { CPK.all = e.target.checked; cpkRender(); } });
const cmtBtn = () => '';   // the old per-box button: every comment box now gets its own (cpkAttach)
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = `.cpk{position:fixed;inset:0;background:rgba(20,30,40,.35);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px}
.cpkbox{background:#fff;border-radius:12px;max-width:900px;width:100%;max-height:85vh;overflow:auto;padding:14px 18px;box-shadow:0 10px 40px rgba(0,0,0,.25)}.cpkbox .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cpkbox .grow{flex:1}
.cpkbox #cpkQ{min-width:300px;flex:1}.cpkbox label.chk{display:inline-flex;gap:6px;align-items:center;white-space:nowrap}.cpkbox label.chk input{width:auto;margin:0}.cpki{border-top:1px solid #eee;padding:8px 0}.cpkt{font-size:14px;line-height:1.45;color:#000;margin-top:4px}.cpkh{margin:12px 0 2px;color:#1f3a68}
.cpk-btn{background:#eef4ff;border-color:#1f3a68;color:#1f3a68}.cpkw{margin:6px 0 10px}.cpkchips{margin:6px 0 2px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.cpklead{color:var(--look-dir,#5b2a86)}
.cpkchip{font:inherit;font-size:14px;border:1px solid #1f3a68;background:#fff;color:#1f3a68;border-radius:14px;padding:3px 10px;cursor:pointer}.cpkchip:hover{background:#eef4ff}.cpkchip.more{border-style:dashed}`;
  (document.head || document.documentElement).appendChild(st);
  const go = () => { cpkAttach(); new MutationObserver(cpkAttach).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  try { const bc = new BroadcastChannel('aa-cmt'); bc.onmessage = () => { CPK.lib = null; }; } catch (e) {}   // the hub changed the library: read it again next time
}
