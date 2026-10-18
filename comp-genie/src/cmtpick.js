/* =====================================================================
   "My comments" picker (Oct 2026): her comment library from the hub (kv 'cmt:lib' in the
   hub's storage on this computer – the same list as the hub's My comments tab). Search,
   then Insert puts the comment where the cursor was in that box. UAD 2.6 comments are
   shown only when she ticks "also 2.6" (her rule: 2.6 wording may not fit 3.6).
   ===================================================================== */
const CPK = { lib: null, target: null, caret: null, q: '', also26: false };
const cmtBtn = sel => `<button type="button" class="btn sm cmtbtn" data-cmtpick="${esc(sel)}" title="Insert a comment from your library">My comments</button>`;
document.addEventListener('focusout', e => { const t = e.target; if (t && t.tagName === 'TEXTAREA') CPK.lastBox = t; try { CPK.caretOf = [t, t.selectionStart, t.selectionEnd]; } catch (x) {} }, true);
async function cpkOpen(sel) {
  const r = await readOrderKv('cmt:lib'); CPK.lib = r && r.v ? Object.values(r.v) : [];
  CPK.target = sel; const box = document.querySelector(sel);
  CPK.caret = CPK.caretOf && CPK.caretOf[0] === box ? [CPK.caretOf[1], CPK.caretOf[2]] : null;
  cpkRender(); const q = document.getElementById('cpkQ'); if (q) q.focus();
}
function cpkRender() {
  let m = document.getElementById('cpk'); if (!m) { m = document.createElement('div'); m.id = 'cpk'; m.className = 'cpk'; document.body.appendChild(m); }
  const L = (CPK.lib || []).filter(x => CPK.also26 || x.ver !== '2.6').filter(x => { const t = (x.title + ' ' + x.section + ' ' + x.text).toLowerCase(); return CPK.q.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w)); })
    .sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title));
  const n26 = (CPK.lib || []).filter(x => x.ver === '2.6').length;
  const hi = s => esc(s).replace(/\[([^\]]{1,80})\]/g, '<mark class="blank">[$1]</mark>').replace(/\n/g, '<br>');
  m.innerHTML = `<div class="cpkbox"><div class="row"><b>My comments</b><span class="grow"></span><button class="btn sm" data-cpk="close">Close</button></div>
    ${!(CPK.lib || []).length ? '<p class="help">Your comment library is empty in this browser. In the Appraisal Assistant hub, open <b>My comments</b> and import your OneNote PDF first.</p>' : `
    <div class="row"><input id="cpkQ" class="txt" placeholder="Search, e.g. view, extraordinary, net adjustment" value="${esc(CPK.q)}"><label class="chk"><input type="checkbox" data-cpk="26" ${CPK.also26 ? 'checked' : ''}> also show UAD 2.6 comments (${n26})</label></div>
    <div class="cpklist">${L.length ? L.map(x => `<div class="cpki"><div class="row"><b>${esc(x.title)}</b><small class="vt v${String(x.ver).replace('.', '')}">${x.ver === 'both' ? '2.6 and 3.6' : 'UAD ' + esc(x.ver)}</small><small>${esc(x.section)}</small><span class="grow"></span><button class="btn sm primary" data-cpkins="${esc(x.id)}">Insert</button></div><div class="cpkt">${hi(x.text.slice(0, 700))}${x.text.length > 700 ? '…' : ''}</div></div>`).join('')
      : `<p class="help">Nothing found${!CPK.also26 && n26 ? ' among your 3.6 comments – tick “also show UAD 2.6 comments” to search the rest' : ''}.</p>`}</div>`}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cmtpick]'); if (b) { e.preventDefault(); cpkOpen(b.dataset.cmtpick); return; }
  const c = e.target.closest('[data-cpk="close"]'); if (c || e.target.id === 'cpk') { const m = document.getElementById('cpk'); if (m) m.remove(); return; }
  const i = e.target.closest('[data-cpkins]'); if (i) {
    const x = (CPK.lib || []).find(y => y.id === i.dataset.cpkins); const box = document.querySelector(CPK.target); if (!x || !box) return;
    const v = box.value; const [a, z] = CPK.caret || [v.length, v.length]; const pre = v.slice(0, a), post = v.slice(z);
    const sep = pre && !/\s$/.test(pre) ? (/[.!?]$/.test(pre.trim()) ? ' ' : '\n\n') : '';
    box.value = pre + sep + x.text + (post && !/^\s/.test(post) ? ' ' : '') + post; const at = (pre + sep + x.text).length;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('cpk').remove();
    setTimeout(() => { const nb = document.querySelector(CPK.target); if (nb) { nb.focus(); try { nb.setSelectionRange(at, at); } catch (y) {} } }, 50);
    toast(/\[[^\]]+\]/.test(x.text) ? 'Inserted – fill in the [blanks]' : 'Inserted'); }
});
document.addEventListener('input', e => { if (e.target.id === 'cpkQ') { CPK.q = e.target.value; const pos = e.target.selectionStart; cpkRender(); const q = document.getElementById('cpkQ'); q.focus(); q.setSelectionRange(pos, pos); } });
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.cpk === '26') { CPK.also26 = e.target.checked; cpkRender(); } });
