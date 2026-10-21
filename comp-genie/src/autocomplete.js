/* ---------------- type-ahead in the grid boxes (her ask, Oct 20 2026) ----------------
   Typing the first letters of an allowed answer fills it in (one match) or lists the matches (several):
   "c" → Collector street, "ci" → City street / City skyline, "a" in a View box → Adverse (then the view types).
   Enter or Tab takes the highlighted answer, ↑ ↓ move, Esc closes. Works for the ▾ pick lines, View, Location,
   Landscaping, Contract date / Cumulative DOM (Unknown) and street surface (after "|"). */
const AC_IMP = ['Adverse', 'Beneficial', 'Neutral'];
function acSpec(id) {
  const lab = l => String(l).replace(/ \(.*\)$/, '');
  if (id === 'view') return { kind: 'imp', types: [...VIEW_TYPES.filter(t => t !== 'Other').map(t => ({ label: camelWords(t) })), { label: 'City skyline', insert: 'Skyline' }, { label: 'Other' }] };
  if (id === 'loc') return { kind: 'imp', types: SI_TYPES.map(t => ({ label: t === 'Other' ? 'Other' : siLabel(t) })) };
  if (id === 'land') return { kind: 'one', list: ['None', ...LAND_NAMES].map(l => ({ label: l })) };
  if (id === 'contract' || id === 'cdom') return { kind: 'one', list: [{ label: 'Unknown' }] };
  const S = typeof PICK !== 'undefined' && PICK[id]; if (!S) return null;
  return { kind: S.multi ? 'multi' : 'one', list: S.opts.map(o => ({ label: lab(o[1]) })).filter(x => x.label), surface: S.surface ? S.surface.map(l => ({ label: l })) : null };
}
const acKey = el => el && el.dataset ? (el.dataset.gfact ? el.dataset.gfact.split('|')[1] : el.dataset.gsubj || '') : '';
const acNorm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
/* what is being typed now: the part of the box the answer replaces, and the answers that fit it */
function acState(el) {
  const id = acKey(el), S = acSpec(id); if (!S) return null; const v = el.value, pos = el.selectionStart ?? v.length; const pre = v.slice(0, pos);
  let start = 0, pool = S.list || [], after = '';
  if (S.surface && pre.includes('|')) { start = pre.lastIndexOf('|') + 1; pool = S.surface; }
  else if (S.kind === 'multi' || S.kind === 'imp') start = Math.max(pre.lastIndexOf(';'), pre.lastIndexOf(',')) + 1;
  if (S.kind === 'imp') { const seg = pre.slice(start); const ci = seg.indexOf(':'); if (ci >= 0) { start += ci + 1; pool = S.types; } else { pool = [...AC_IMP.map(l => ({ label: l, imp: true })), ...S.types]; } }
  while (start < pre.length && pre[start] === ' ') start++;
  const tok = pre.slice(start); const k = acNorm(tok); if (!k) return { id, S, start, pos, tok, list: [] };
  const list = pool.filter(x => acNorm(x.label).startsWith(k)); return { id, S, start, pos, tok, list };
}
let AC = { el: null, st: null, i: 0, box: null };
function acBox() { if (AC.box && document.body.contains(AC.box)) return AC.box; const b = document.createElement('div'); b.id = 'acbox'; document.body.appendChild(b);
  b.addEventListener('mousedown', e => e.preventDefault()); b.addEventListener('click', e => { const it = e.target.closest('[data-aci]'); if (it) { AC.i = +it.dataset.aci; acTake(); } }); AC.box = b; return b; }
function acClose() { if (AC.box) AC.box.style.display = 'none'; AC.st = null; }
function acShow(el, st) {
  AC.el = el; AC.st = st; if (!st || !st.list.length) { acClose(); return; } if (AC.i >= st.list.length) AC.i = 0;
  const b = acBox(), r = el.getBoundingClientRect();
  b.innerHTML = st.list.slice(0, 10).map((x, i) => `<div class="aci${i === AC.i ? ' on' : ''}" data-aci="${i}"><b>${esc(x.label.slice(0, st.tok.length))}</b>${esc(x.label.slice(st.tok.length))}${x.imp ? ' <small>impact</small>' : ''}</div>`).join('') + (st.list.length > 10 ? `<div class="acmore">+${st.list.length - 10} more – keep typing</div>` : '') + '<div class="achint">Enter / Tab to use · ↑ ↓ · Esc</div>';
  b.style.display = 'block'; b.style.left = Math.round(r.left) + 'px'; b.style.top = Math.round(r.bottom + 2) + 'px'; b.style.minWidth = Math.max(160, Math.round(r.width)) + 'px';
}
function acTake() { const el = AC.el, st = AC.st; if (!el || !st || !st.list.length) return false; const x = st.list[Math.min(AC.i, st.list.length - 1)];
  const ins = (x.insert || x.label) + (x.imp ? ': ' : '');
  const v = el.value; let tail = v.slice(st.pos); if (el.selectionEnd > st.pos) tail = v.slice(el.selectionEnd);   // an inline completion is replaced
  el.value = v.slice(0, st.start) + ins + tail; const c = st.start + ins.length; try { el.setSelectionRange(c, c); } catch (e) {}
  AC.i = 0; acClose(); if (x.imp) { const s2 = acState(el); if (s2) { s2.list = s2.list.length ? s2.list : []; } }   // next: the view / influence type
  return true; }
document.addEventListener('input', e => { const el = e.target; if (!acKey(el) || !acSpec(acKey(el))) return;
  const st = acState(el); AC.i = 0; if (!st) { acClose(); return; }
  /* one answer fits: fill it in, with the rest selected so more typing replaces it */
  if (st.list.length === 1 && st.tok.length && e.inputType && e.inputType.startsWith('insert') && el.selectionStart === el.value.length) {
    const x = st.list[0], full = x.insert || x.label; if (acNorm(full).startsWith(acNorm(st.tok)) && full.toLowerCase().startsWith(st.tok.toLowerCase())) { el.value = el.value.slice(0, st.start) + full; try { el.setSelectionRange(st.start + st.tok.length, el.value.length); } catch (z) {} } }
  acShow(el, st); }, true);
document.addEventListener('keydown', e => { const el = e.target; if (!AC.st || el !== AC.el || !AC.box || AC.box.style.display === 'none') return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); const n = Math.min(10, AC.st.list.length); AC.i = (AC.i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; acShow(el, AC.st); return; }
  if (e.key === 'Enter' || e.key === 'Tab') { if (acTake()) { e.preventDefault(); e.stopImmediatePropagation(); if (AC.el && acSpec(acKey(AC.el)) && acSpec(acKey(AC.el)).kind === 'imp' && /:\s$/.test(AC.el.value)) acShow(AC.el, acState(AC.el)); } return; }
  if (e.key === 'Escape') { e.preventDefault(); acClose(); } }, true);
document.addEventListener('focusout', e => { if (e.target === AC.el) setTimeout(acClose, 120); }, true);
document.addEventListener('scroll', () => { if (AC.st && AC.el) acShow(AC.el, AC.st); }, { capture: true, passive: true });
