/* =====================================================================
   Section check marks on the tabs (her request, Oct 19 2026): a green ✓ on
   Order, Market, Comp genie and Bookkeeping when that section of the open
   order is not missing anything. Hover a tab to see what is still needed.
   ===================================================================== */
function orderMissing(f) {   // the letter's main fields (also shown under the letter as "Still blank: …")
  const missing = [];
  if (!f.aiUse) missing.push('AI use');
  if (!((f.clients || [])[0] || {}).name || !String(f.clients[0].name).trim()) missing.push('client name');
  if (!String(f.address || '').trim()) missing.push('property address');
  if (!String(f.fee ?? '').trim()) missing.push('fee');
  const T = TYPES[f.type] || {}; const DL = T.dateLabels || ['decedent', 'date of death'];
  if (T.retro && !String(f.decedent || '').trim() && !['divorceRetro', 'otherRetro', 'taxAppeal'].includes(f.type)) missing.push(DL[0].toLowerCase());
  if (T.retro && !f.dod) missing.push(DL[1].toLowerCase());
  if (T.purpose && !String(f.purpose || '').trim()) missing.push('purpose');
  if (['prospective', 'both'].includes(f.premise) && T.premise && !f.completion) missing.push('completion date');
  return missing;
}
const SCAN_MATTERS = ['clientLetter', 'crs', 'permitsCounty', 'permitsPdf', 'legal', 'deed', 'prelim', 'mls', 'contract', 'counter', 'addendum', 'condoQ', 'budget'];   // scans that hold facts for the report
function needOrder(o) {
  const n = orderMissing(o).map(x => 'the ' + x);
  if (!['Signed', 'Client letter'].includes(o.status)) n.push('the signed engagement letter (My letter is ' + (o.status || 'Drafted') + ')');
  const open = (o.reqs || []).filter(x => !x.done).length; if (open) n.push(open + ' client requirement' + (open === 1 ? '' : 's') + ' not ticked');
  const docs = o.docs || []; let pend = 0, scans = 0;
  docs.forEach(d => { const S = ((o.review || {})[d.id] || {}).sugg || []; if (S.some(x => x.state === 'new')) pend++;
    const read = S.length || (o.facts || []).some(f => f.docId === d.id) || (o.aiLog || []).some(l => l.doc === d.name) || ((o.permitTimeline || {}).files || []).includes(d.name);
    if (d.textState === 'scan' && SCAN_MATTERS.includes(d.type) && !read) scans++; });
  if (pend) n.push(pend + ' document' + (pend === 1 ? '' : 's') + ' with suggestions to accept or reject');
  if (scans) n.push(scans + ' scanned document' + (scans === 1 ? '' : 's') + ' not read yet (Claude or Acrobat)');
  return n;
}
function needMarket(o) {
  const m = o.market || {}; const U = m.uad || {}; const n = [];
  if (!(m.rows || []).length) n.push('the Market Area Boundary search (box 1)');
  if (!((m.micro || {}).rows || []).length) n.push('the Search Criteria search (box 2)');
  if (!String(m.boundary || '').trim()) n.push('the Market Area Boundary description');
  if (!String(m.criteria || '').trim()) n.push('the Search Criteria Description');
  if (!U.distress) n.push('Distressed Market Competition'); if (!U.supply) n.push('Demand/Supply'); if (!U.mktime) n.push('Marketing Time');
  if (!m.trendConcl) n.push('your price-trend conclusion');
  if (!String(m.comment || '').trim()) n.push('the Price Trend Analysis Commentary');
  return n;
}
function needBooks(o) {
  if (o.stage === 'Cancelled') return [];
  const n = []; if (!String(o.invNo || '').trim() || !o.invDate) n.push('the invoice (Make the invoice)'); if (!o.paidDate) n.push('the payment (Mark paid)'); return n;
}
/* the Comp genie keeps its own storage on the same site; its grid pre-check for this order is read here (read-only) */
let GENIE_ST = {};   // orderId → { n: [what is still needed], at }
function readGenieJobs() {
  return new Promise(res => { let r; try { r = indexedDB.open('appraisal-assistant'); } catch (e) { res([]); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} }; r.onerror = () => res([]); r.onblocked = () => res([]);
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('jobs')) { d.close(); res([]); return; }
      const q = d.transaction('jobs').objectStore('jobs').getAll(); q.onsuccess = () => { d.close(); res(q.result || []); }; q.onerror = () => { d.close(); res([]); }; }; });
}
let genieReadT = 0;
async function refreshGenieStatus() {
  try { if (indexedDB.databases) { const l = await indexedDB.databases(); if (!l.some(d => d.name === 'appraisal-assistant')) return; } } catch (e) {}
  const jobs = await readGenieJobs(); const st = {};
  jobs.filter(j => j.orderId).sort((a, b) => (a.updated || 0) - (b.updated || 0)).forEach(j => { st[j.orderId] = j.status || { n: ['open this order in the Comp genie once so it can be checked'] }; });
  GENIE_ST = st; tabMarks(true);
}
function needGenie(o) {
  const s = GENIE_ST[o.id]; if (!s) return ['not started in the Comp genie yet']; return s.n || [];
}
function tabMarks(noRead) {
  if (!noRead && Date.now() - genieReadT > 4000) { genieReadT = Date.now(); refreshGenieStatus(); }
  const o = (typeof cur !== 'undefined' && cur && hasContent(cur)) ? cur : null;
  const W = { letter: needOrder, market: needMarket, genie: needGenie, books: needBooks };
  Object.entries(W).forEach(([t, fn]) => { const b = document.querySelector(`nav.tabs [data-tab="${t}"]`); if (!b) return;
    if (!b.dataset.label) b.dataset.label = b.textContent.trim();
    let n = null; if (o) { try { n = fn(o); } catch (e) { n = null; } }
    const done = !!(n && !n.length);
    b.innerHTML = h(b.dataset.label) + (done ? ' <span class="tabck" aria-label="complete">✓</span>' : '');
    b.title = !o ? '' : done ? b.dataset.label + ' – complete for this order' : n ? b.dataset.label + ' – still needed: ' + n.join('; ') : ''; });
}
window.addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.type === 'aa-genie-status') { if (e.data.order) { GENIE_ST[e.data.order] = { n: e.data.n || [], at: Date.now() }; tabMarks(true); } } });
