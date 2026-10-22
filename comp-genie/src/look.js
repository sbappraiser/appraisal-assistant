/* ===== One look for every page (her requests Oct 21 2026): file name top right, "What the colors mean", mouse wheel on drop-downs.
   Each page sets window.lookFileName = () => 'Brkl5464 · 5464 Berkeley Rd' (or '' when no file is open). ===== */
(() => {
  const LEGEND = [['<span class="sw" style="background:#fff;color:#d00000;border-color:#ccc">*</span>', 'Red asterisk – a required line'],
    ['<span class="sw" style="background:var(--look-req);border-color:var(--look-req-b)"></span>', 'Green box – required, fill it in'],
    ['<span class="sw" style="background:var(--look-opt);border-color:var(--look-opt-b)"></span>', 'Blue box – optional; goes into the report as more information'],
    ['<span class="sw" style="background:var(--look-na)"></span>', 'Grey box – not for you to fill in (worked out or from a source)'],
    ['<span class="sw" style="background:var(--look-cur);border-color:var(--look-cur-b)"></span>', 'Pale yellow – the box or column you are working in'],
    ['<span class="sw" style="background:var(--look-pink);border-color:var(--look-pink-b)"></span>', 'Light pink – a section band'],
    ['<span class="sw" style="background:#fff;color:var(--look-dir)">Aa</span>', 'Purple writing – directions for you'],
    ['<span class="sw" style="background:#fff;color:var(--look-warn)">!</span>', 'Red writing – a warning or something to fix'],
    ['<span class="sw" style="background:var(--look-ok);color:#fff;border-color:var(--look-ok)">✓</span>', 'Green check – complete'],
    ['<span class="sw" style="background:#fff;color:#1f5fa8">ⓘ</span>', 'Information – point at or click it for an explanation']];
  function legend() { let L = document.getElementById('lookLegend'); if (L) { L.remove(); return; }
    L = document.createElement('div'); L.id = 'lookLegend'; L.setAttribute('role', 'dialog');
    L.innerHTML = `<button class="x" aria-label="Close">×</button><h3>What the colors mean</h3><ul>${LEGEND.map(([s, t]) => `<li>${s}<span>${t}</span></li>`).join('')}</ul>`;
    L.querySelector('.x').onclick = () => L.remove(); document.body.appendChild(L); }
  let F = null; function corner() { if (!F) { F = document.createElement('div'); F.id = 'lookFile'; } const H = document.querySelector('header.top, .top');   // in the page's own top bar, at its right end (pages that redraw their top bar get it back)
    if (H) { if (F.parentNode !== H) { F.className = 'inhead'; H.appendChild(F); const h = H.offsetHeight; if (h && getComputedStyle(H).position === 'sticky') document.documentElement.style.setProperty('--toph', h + 'px'); } }   /* the genie keeps its grid under the top bar (--toph): adding this box can make the bar taller */ else if (F.parentNode !== document.body) { F.className = ''; document.body.appendChild(F); }
    let name = ''; try { name = typeof window.lookFileName === 'function' ? String(window.lookFileName() || '') : ''; } catch (e) {}
    const e = t => t.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const parts = name.split(' · '); const fno = parts.length > 1 ? parts.shift() : '', addr = parts.join(' · ');   /* her ask (Oct 22 2026): the address on its own line, the file number under it */
    const want = (name ? `<span class="lfName" title="The file you are working in">📄 <span class="lfT"><span>${e(addr)}</span>${fno ? `<small>File ${e(fno)}</small>` : ''}</span></span>` : '') + '<button type="button" data-lookleg="1" title="What the colors mean">ⓘ Colors</button>';
    if (F.innerHTML !== want) F.innerHTML = want; }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-lookleg]')) legend(); });
  /* the mouse wheel moves a drop-down up and down once she has clicked on it (her ask) – the page still scrolls everywhere else */
  document.addEventListener('wheel', e => { const s = e.target.closest && e.target.closest('select'); if (!s || s.multiple || s.disabled || s.size > 1) return;
    if (document.activeElement !== s) return;   // only once she has clicked into it, so scrolling the page past a drop-down never changes an answer
    e.preventDefault(); const n = s.options.length; if (!n) return; let i = s.selectedIndex + (e.deltaY > 0 ? 1 : -1); i = Math.max(0, Math.min(n - 1, i));
    while (s.options[i] && s.options[i].disabled && i > 0 && i < n - 1) i += e.deltaY > 0 ? 1 : -1;
    if (i !== s.selectedIndex) { const key = selKey(s); s.selectedIndex = i; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true }));
      if (key) setTimeout(() => { if (document.activeElement && document.activeElement.matches && document.activeElement.matches(key)) return; const n = document.querySelector(key); if (n) n.focus({ preventScroll: true }); }, 60); } }, { passive: false });   // pages that redraw on a change: stay on the same drop-down so the wheel keeps working
  /* a selector that finds the same drop-down after the page redraws: its id, or its data- attributes */
  function selKey(el) { if (el.id) return '#' + CSS.escape(el.id); const a = [...el.attributes].filter(x => x.name.startsWith('data-')); return a.length ? 'select' + a.map(x => `[${x.name}="${CSS.escape(x.value)}"]`).join('') : null; }
  const start = () => { if (window.self !== window.top && document.body.classList.contains('embed')) return;   // inside the hub: the hub shows the file name
    corner(); setInterval(corner, 400); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
