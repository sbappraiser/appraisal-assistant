/* =====================================================================
   The octopus (her structure, Oct 22 2026; map: "The Octopus – where everything lives").
   Shared places (Home, Library, Comments, Database center, Settings, Help) and the nine tentacles of the open order:
   1 Intake (this order, all orders, new order, clients, bookkeeping, letter templates) · 2 Subject · 3 Market · 4 Sales comparison ·
   5 Cost · 6 Income · 7 Reconciliation · 8 Review and wrap-up · 9 Exhibits.
   Tentacles 2 and 4–9 open the Comp genie's pages (inside this window) at that tentacle's step; 3 is the Market tab.
   The old tab row stays in the page (hidden) because other code clicks it.
   ===================================================================== */
const OCTO = { t: 0, steps: {} };
const OCTO_NAMES = { 1: 'Intake', 2: 'Subject property', 3: 'Market', 4: 'Sales comparison', 5: 'Cost approach', 6: 'Income approach', 7: 'Final reconciliation', 8: 'Review and wrap-up', 9: 'Exhibits' };
const OCTO_GENIE = { 2: 'insp', 4: 'data', 5: 'cost', 6: 'inc', 7: 'rec', 8: 'out', 9: 'exh' };   // the Comp genie step each tentacle opens on
const OCTO_T1 = ['letter', 'saved', 'new', 'contacts', 'books', 'wording'];
const octoHasOrder = () => typeof cur !== 'undefined' && cur && typeof hasContent === 'function' && hasContent(cur);
function octoGo(t, key) { t = +t;
  if (t === 1) { showTab(octoHasOrder() ? 'letter' : 'saved'); OCTO.t = 1; octoMark(); return; }
  if (!octoHasOrder()) { toast('Open an order first – Intake › All orders, or start a New order', 5000); return; }
  if (t === 3 && !key) { OCTO.t = 3; showTab('market'); octoMark(); return; }
  OCTO.t = t; window.GENIE_GO = key || OCTO_GENIE[t]; showTab('genie'); octoMark(); }
function octoMark() {
  const tab = typeof CUR_TAB !== 'undefined' ? CUR_TAB : '';
  if (OCTO_T1.includes(tab)) OCTO.t = 1; else if (tab === 'market') OCTO.t = 3; else if (tab !== 'genie') OCTO.t = 0;
  document.querySelectorAll('nav.octo [data-tent]').forEach(b => b.setAttribute('aria-current', String(+b.dataset.tent === OCTO.t)));
  document.querySelectorAll('nav.shared [data-go]').forEach(b => b.setAttribute('aria-current', String(b.dataset.go === tab)));
  const sub = $('#t1sub'); if (sub) { sub.hidden = OCTO.t !== 1; sub.querySelectorAll('[data-go]').forEach(b => b.setAttribute('aria-current', String(b.dataset.go === tab))); }
  const on = octoHasOrder(); const nav = document.querySelector('nav.octo'); if (nav) nav.classList.toggle('noorder', !on);
  const f = $('#octoFile'); if (f) f.textContent = on ? ([cur.fileNo, typeof street === 'function' ? street(cur) : ''].filter(Boolean).join(' · ') || 'This order') + ':' : 'No order open:';
  /* green ✓: tentacle 1 from the order; the others from the Comp genie's steps for this order (it tells this page after each redraw) */
  const done = {}; if (on && typeof oDone === 'function') { const d = oDone(cur); done[1] = d.docs && d.letter && d.scope; }
  const S = on && OCTO.steps.order === cur.id ? OCTO.steps.list || [] : [];
  for (let t = 2; t <= 9; t++) { const L = S.filter(x => +x.n === t); if (L.length) done[t] = L.every(x => x.done); }
  document.querySelectorAll('nav.octo [data-tent]').forEach(b => { const i = b.querySelector('.tck'); if (i) i.textContent = done[+b.dataset.tent] ? '✓' : ''; });
  const g = $('#gnTitle'); if (g && tab === 'genie' && OCTO.t > 1) g.textContent = OCTO.t + ' · ' + OCTO_NAMES[OCTO.t] + (on ? ' – ' + [cur.fileNo, typeof street === 'function' ? street(cur) : ''].filter(Boolean).join(' ') : '');
  const gh = $('#gnHelp'); if (gh && tab === 'genie') gh.textContent = OCTO.t > 1 ? 'Worked in the Comp genie, inside the Appraisal Assistant – the numbered steps under it belong to this tentacle and the ones after it.' : 'The Comp genie for the order that is open.';
}
function octoSettings() {   // the data folder card (drawn here while Settings is open) and the Claude settings (moved here, one copy)
  const ai = document.getElementById('aiSettingsBox'), sa = $('#setAi'); if (ai && sa && ai.parentNode !== sa) sa.appendChild(ai);
  if (typeof abRender === 'function') abRender(); }
document.addEventListener('click', e => {
  const tb = e.target.closest && e.target.closest('nav.octo [data-tent]'); if (tb) { octoGo(tb.dataset.tent); return; }
  const g = e.target.closest && e.target.closest('nav.shared [data-go], nav.t1sub [data-go]'); if (g) { const t = g.dataset.go;
    if (t === 'new') { if (typeof startNewOrder === 'function') startNewOrder(); OCTO.t = 1; octoMark(); return; }
    if (t === 'letter' && !octoHasOrder()) { showTab('saved'); octoMark(); return; }
    showTab(t); if (t === 'settings') octoSettings(); octoMark(); return; }
  const m = e.target.closest && e.target.closest('[data-octogo]'); if (m) octoGo(3, m.dataset.octogo);
});
window.addEventListener('message', e => { if (e.origin !== location.origin || !e.data || e.data.type !== 'aa-path') return; OCTO.steps = { order: e.data.order, list: e.data.steps || [] }; octoMark(); });
/* every tab change marks the octopus */
(() => { const st = showTab; showTab = function (t) { const r = st.apply(this, arguments); try { if (t === 'settings') octoSettings(); octoMark();
    if (t === 'market') { const mb = $('#panel-market'); if (mb && !mb.querySelector('.mkocto')) mb.insertAdjacentHTML('afterbegin', '<div class="mkocto"><span class="help" style="margin:0">Tentacle 3 also holds comp selection:</span><button type="button" class="btn small" data-octogo="sel">3 · Comp selection →</button></div>'); } } catch (e) {} return r; }; })();
setTimeout(octoMark, 300);
