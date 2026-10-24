/* =====================================================================
   The button page (her layout, Oct 23 2026 – mockup "Octopus Mobile Sections Page").
   Opening an inspection shows buttons by what she is looking for; tapping one slides in
   its questions (the same groups and fields as the tabs – every answer keeps ONE home).
   The walk-through keeps her own order. Classic tabs stay one tap away.
   ===================================================================== */
const OV_ICON = {
  setup: '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
  project: '<rect x="5" y="3" width="14" height="18"/><path d="M8.5 7h2M13.5 7h2M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2M10.5 21v-3h3v3"/>',
  street: '<path d="M7 21 10 3M17 21 14 3M12 6v2M12 11v2M12 16v2"/>',
  driveway: '<circle cx="3.5" cy="3" r="1"/><circle cx="20.5" cy="3" r="1"/><path d="M3.5 4v7.5M20.5 4v7.5"/><path d="M3.5 6.5Q8 4.3 12 6.3Q16 4.3 20.5 6.5M3.5 11.5h17M12 6.3v5.2M7.7 5.3v6.2M16.3 5.3v6.2"/><path d="M7 12 2.5 22M17 12l4.5 10"/><rect x="8.8" y="13.4" width="3" height="1.4" rx="0.58" stroke-width="1.2"/><rect x="12.2" y="13.4" width="3" height="1.4" rx="0.58" stroke-width="1.2"/><rect x="6.7" y="16.2" width="3.2" height="1.7" rx="0.71" stroke-width="1.2"/><rect x="10.4" y="16.2" width="3.2" height="1.7" rx="0.71" stroke-width="1.2"/><rect x="14.1" y="16.2" width="3.2" height="1.7" rx="0.71" stroke-width="1.2"/><rect x="5.1" y="19.3" width="3" height="1.9" rx="0.79" stroke-width="1.2"/><rect x="8.8" y="19.3" width="3" height="1.9" rx="0.79" stroke-width="1.2"/><rect x="12.5" y="19.3" width="3" height="1.9" rx="0.79" stroke-width="1.2"/><rect x="16.2" y="19.3" width="3" height="1.9" rx="0.79" stroke-width="1.2"/>',   // her ask Oct 24 2026: gated, cobblestone driveway
  site: '<path d="M3 18.5 8 16l8 3 5-2.5V5L16 7.5 8 4.5 3 7z"/><path d="M8 4.5v11.5M16 7.5V19"/>',
  palm: '<g transform="translate(-2.9 -2.3) scale(1.22)" stroke-width="1.45"><rect x="2.8" y="13.4" width="14.6" height="7" rx="1.6"/><path d="M6.3 15.9c1 .7 2 .7 3 0s2-.7 3 0 2 .7 3 0M6.3 18.3c1 .7 2 .7 3 0s2-.7 3 0 2 .7 3 0"/><path d="M17 13.4V7.3"/><path d="M17 7.3c-.3-2.1-1.6-3.6-3.4-4.3M17 7.3c-1.7-1-4-.9-5.7.9M17 7.3c.6-1.6 2.1-2.6 4-2.4M17 7.3c2-.2 3.6.9 4.6 2.6M16.6 7.4c-1.7.4-3 1.6-3.7 3" stroke="#1e8f3a"/></g>',   // her design Oct 24 2026: pool with a green palm
  pool: '<path d="M3 15.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1M3 19.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M8 13V5.5a1.8 1.8 0 0 1 3.6 0M16 13V5.5a1.8 1.8 0 0 0-3.6 0M8 8.5h8"/>',
  front: '<g stroke-width=".85"><path d="M1 20.2h46M2.2 20.2V11.2M1.6 11.2a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0a0.55 0.55 0 0 1 1.10 0M5.6 11.2V7.6h2.4v3.6M5.2 7.6h3.2M6.1 7.6V6.6h1.4v1M3.6 13.2h2.6v4.2h-2.6zM4.9 13.2v4.2M3.6 15.299999999999999h2.6M10.2 12.4a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0M10.6 12.4V20.2M11.55 20.2V14.95a1.35 1.35 0 0 1 2.7 0V20.2M14.750000000000002 20.2V14.95a1.35 1.35 0 0 1 2.7 0V20.2M17.95 20.2V14.95a1.35 1.35 0 0 1 2.7 0V20.2M21.6 20.2V7.2M29.4 7.2V20.2M20.6 7.4 25.5 4.2 30.4 7.4M21 7.4a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0a0.50 0.50 0 0 1 1.00 0M24.95 6.6V5.8500000000000005a0.55 0.55 0 0 1 1.1 0V6.6M23.0 20.2V12.1a2.5 2.5 0 0 1 5.0 0V20.2M24.2 20.2V15.3a1.3 1.3 0 0 1 2.6 0V20.2M25.5 11.4v.8M22.4 20.9h6.2M23.2 20.2v.7M27.8 20.2v.7M38 20.2V9.8M29.4 9.8a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0a0.58 0.58 0 0 1 1.15 0M32.2 12.6h2.8v4.6h-2.8zM33.6 12.6v4.6M32.2 14.899999999999999h2.8M46.4 20.2V12.6M38 12.6M38 12.6a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0a0.56 0.56 0 0 1 1.12 0M41.4 14.4h2.2v3.8h-2.2zM42.5 14.4v3.8M41.4 16.3h2.2"/><circle cx="25.5" cy="12.7" r=".5"/></g>',   // her design Oct 24 2026: Spanish-style estate (wide – drawn on a 48 × 22 grid)
  interior: '<path d="M5 12V9.5A2.5 2.5 0 0 1 7.5 7h9A2.5 2.5 0 0 1 19 9.5V12"/><path d="M3.5 12.5a1.5 1.5 0 0 1 3 0V15h11v-2.5a1.5 1.5 0 0 1 3 0V18h-17z"/><path d="M5.5 18v2M18.5 18v2"/>',
  systems: '<circle cx="12" cy="12" r="3.4" fill="#ffd84d"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  energy: '<path d="M4.5 19.5c0-8.5 5.5-14 15.5-15-1 10-6.5 15.5-15.5 15Z" fill="#8fd18f" stroke="#1e7a34"/><path d="M4.5 19.5 14 10M9 15h4M11.5 12.5V9" stroke="#1e7a34"/>',
  disaster: '<ellipse cx="12" cy="4.6" rx="9" ry="2.1"/><path d="M3.8 7.6C5.5 9.6 18 9.9 20 7.7"/><path d="M5.4 10.6C7.2 12.4 16.8 12.5 18.4 10.5"/><path d="M7.4 13.4C8.9 14.9 15.6 14.9 16.8 13.3"/><path d="M9.2 16C10.3 17.2 14.4 17.2 15.3 15.9"/><path d="M10.8 18.3C11.5 19 13.3 19 13.9 18.2"/><path d="M12.6 19.4C12.8 20.6 12 21.5 10.4 22.2"/>',
  garage: '<path d="M5 16.5V12l1.8-4.6A1.5 1.5 0 0 1 8.2 6.5h7.6a1.5 1.5 0 0 1 1.4.9L19 12v4.5z"/><path d="M5 12h14"/><path d="M6 16.5V19M18 16.5V19"/><circle cx="8.3" cy="14.3" r="0.9"/><circle cx="15.7" cy="14.3" r="0.9"/>',
  defects: '<path d="M12 3.5 21.5 20H2.5z" fill="#ffe680"/><path d="M12 9.5v5M12 17.2v.3" stroke-width="2.2"/>',   // her ask Oct 24 2026: light yellow warning sign with !
  wrapup: '<circle cx="12" cy="10" r="6"/><path d="m9.3 10 1.9 1.9L15 8.2"/><path d="M8.5 15 7 21l5-2.5 5 2.5-1.5-6"/>',
  adu: '<path d="M2.5 13 8 8.5l5.5 4.5V20h-11z"/><path d="M13.5 15 17.5 11.5 21.5 15v5h-8"/><path d="M6.5 20v-3h3v3"/>',
  outb: '<path d="M3 12 10 6l7 6"/><path d="M5 11v8h10v-8"/><path d="M19.5 19v-5"/><circle cx="19.5" cy="11.5" r="2.6"/><path d="M8 19v-3.5h4V19"/>',
  add: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  sketch: '<path d="M4 20V4h9"/><path d="M4 20h16v-9"/><path d="m11 13 7.5-7.5a1.8 1.8 0 0 1 2.5 2.5L13.5 15.5 10 16.5z"/>',
  photos: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  interview: '<path d="M4 5h11v8H9l-4 3v-3H4z"/><path d="M15 9h5v7h-1v3l-3.5-3H11v-3"/>',
  permit: '<path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19"/><circle cx="12" cy="14" r="3.2"/><path d="m10.6 14 1 1 1.8-1.9"/>',
  attention: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4M12 7v5.5M9.5 10l2.5 2.5 2.5-2.5"/>',
};
/* each button: the groups it shows ([section, [group ids] | null = the whole section]) */
const OV_VB = { front: '0 0 48 22' };   // icons not drawn on the 24 × 24 grid
const OV_BTNS = [
  { id: 'setup', grp: 'Assignment', t: 'Report setup', icon: 'setup', sub: 'Type · buildings · Quick/Complex', parts: [['property', ['assign', 'ptype']]] },
  { id: 'street', grp: 'Inspection', t: 'Street', icon: 'street', parts: [['street', null]] },
  { id: 'drive', grp: 'Inspection', t: 'Driveway', icon: 'driveway', parts: [['driveway', null]] },
  { id: 'site', grp: 'Inspection', t: 'Site, topography & view', icon: 'site', sub: 'Hazards · utilities', parts: [['site', null]] },
  { id: 'outdoor', grp: 'Inspection', t: 'Landscaping & outdoor living', icon: 'palm', sub: 'Pool · spa · courts', parts: [['amenities', null]] },
  { id: 'ext', grp: 'Main dwelling', t: 'Exterior', icon: 'front', sub: 'Rear & side photos too', parts: [['front', null], ['exterior', null]] },
  { id: 'int', grp: 'Main dwelling', t: 'Interior', icon: 'interior', sub: 'Smoke & CO · attic', parts: [['interior', null]] },
  { id: 'sys', grp: 'Main dwelling', t: 'Systems & features', icon: 'systems', sub: 'Heating · cooling · water heater · smart home', parts: [['systems', ['hvac', 'wh', 'mech', 'smart']]] },
  { id: 'garage', grp: 'Main dwelling', t: 'Garage & parking', icon: 'garage', parts: [['garage', null]] },
  { id: 'qc', grp: 'Main dwelling', t: 'Quality & condition', icon: 'wrapup', sub: 'Functional obsolescence · notes', parts: [['condition', null]] },
  { id: 'disaster', grp: 'Main dwelling', t: 'Disaster mitigation', icon: 'disaster', sub: 'Water heater strapping · retrofit', parts: [['interview', ['disaster']], ['systems', ['wh']]] },
  { id: 'energy', grp: 'Main dwelling', t: 'Green & energy efficiency', icon: 'energy', sub: 'Solar · battery · ratings', parts: [['systems', ['energy']]] },
  { id: 'defects', grp: 'Main dwelling', t: 'Deficiencies', icon: 'defects', parts: [['defects', null]] },
  { id: 'adu', grp: 'Other buildings', t: 'ADUs', icon: 'adu', parts: [['buildings', ['adu']]], count: ins => ins.lists.adus.length },
  { id: 'outb', grp: 'Other buildings', t: 'Outbuildings', icon: 'outb', parts: [['buildings', ['outb']]], count: ins => ins.lists.outbuildings.length },
  { id: 'sketch', grp: 'Other', t: 'OctoSketch', icon: 'sketch', act: 'sketch' },
  { id: 'photos', grp: 'Other', t: 'Photos', icon: 'photos', tab: 'photos' },
  { id: 'interview', grp: 'Other', t: 'Interview', icon: 'interview', sub: 'Remodels · EAs · sale & rent', parts: [['interview', ['updates', 'sysConf', 'utilConf', 'ea', 'confirm']]] },
  { id: 'hoa', grp: 'Other', t: 'HOA / Project', icon: 'project', sub: 'Ask the owner or agent', parts: [['project', null]], show: ins => tabShown(SECTIONS.find(s => s.id === 'project'), ins), off: 'Appears for condo, PUD or co-op' },
  { id: 'permits', grp: 'Other', t: 'Permits & public records', icon: 'permit', sub: 'From the order', parts: [['property', ['crs', 'pubrec']]] },
  { id: 'attention', grp: 'Other', t: 'Needs attention', icon: 'attention', tab: 'attention' },
  { id: 'desktop', grp: 'Other', t: 'Send to desktop', icon: 'desktop', sub: 'Summaries · export', tab: 'export' },
];
const OV_GROUPS = ['Assignment', 'Inspection', 'Main dwelling', 'Other buildings', 'Other'];
const ovBtn = id => OV_BTNS.find(b => b.id === id);
const ovIn = (b, x) => (b.parts || []).some(([s, g]) => x.tab === s && (!g || g.includes(x.group)));
function ovMissing(b, issues) {
  if (b.tab === 'attention') return issues.length;
  if (b.tab === 'photos') return issues.filter(x => x.photo).length;
  if (b.act === 'sketch') return issues.filter(x => /^sk/.test(x.key)).length;
  return issues.filter(x => ovIn(b, x)).length;
}
function ovSketchSf(ins) { const T = ins.sketch && ins.sketch.totals; return T && T.agFin ? T.agFin.toLocaleString() + ' sq ft' : ''; }
function renderOverview() {
  const ins = app.ins; const issues = computeIssues(ins).filter(x => !ins.overrides[x.key] && (x.sev === 'Required' || x.sev === 'Photo'));
  const P = ins.data.property || {};
  const tile = b => { const shown = !b.show || b.show(ins); const miss = shown ? ovMissing(b, issues) : 0;
    const n = b.count ? b.count(ins) : null; const title = b.t + (n !== null ? ` (${n})` : '');
    const sub = !shown ? b.off : b.act === 'sketch' ? (ovSketchSf(ins) || 'Not drawn yet') : n === 0 ? 'None yet – tap to add one' : (b.sub || '');
    const st = !shown ? '' : miss ? `<span class="ov-badge" aria-label="${miss} missing">${miss}</span>` : (b.tab === 'photos' || b.tab === 'export' || b.act || n === 0) ? '' : '<span class="ov-ok" aria-label="Complete">✓</span>';
    return `<button class="ov-tile${shown ? '' : ' off'}${miss ? ' miss' : ''}" data-ov="${b.id}"${shown ? '' : ' disabled'}>${st}<svg viewBox="${OV_VB[b.icon] || '0 0 24 24'}" aria-hidden="true">${OV_ICON[b.icon]}</svg><b>${esc(title)}</b>${shown ? (miss ? `<small class="st miss">${miss} missing</small>` : (st ? '<small class="st ok">Complete</small>' : '')) : ''}${sub ? (shown ? `<i class="ov-tag" title="${esc(sub)}">${esc(sub)}</i>` : `<small>${esc(sub)}</small>`) : ''}</button>`; };
  const type = [P.legal && P.legal !== 'None' ? P.legal : (P.pud ? 'PUD' : 'Single family'), P.attach, P.mode].filter(Boolean).join(' · ');
  const cwb = `<button class="ov-cw" data-ovcw="1"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m9 21 2-6 2 2v4M7 12l2-4 4 1 3 3M11 15l-2-3"/></svg><span><b>Complex walk</b><small>${P.mode === 'Complex' ? 'For this large property – tap what you see as you walk' : 'For large properties – street, driveway, then go anywhere'}</small></span></button>`;
  return `<div class="ov">${cwb}<p class="ov-lead">Tap a button and its questions slide in. ${esc(type)}. The 🚶 walk-through keeps your own order.</p>
    ${OV_GROUPS.map(g => `<section class="ov-group"><h2>${esc(g)}${g === 'Assignment' ? ' <small>answer first – it sets up the rest</small>' : ''}</h2><div class="ov-grid">${OV_BTNS.filter(b => b.grp === g).map(tile).join('')}</div></section>`).join('')}
    <p class="ov-classic"><button class="btn sm" data-ovclassic="1">Show the classic tabs</button></p></div>`;
}
function renderOvButton(id) {
  const b = ovBtn(id); if (!b || !b.parts) return renderOverview();
  const i = OV_BTNS.indexOf(b); const next = OV_BTNS.slice(i + 1).find(x => x.parts && (!x.show || x.show(app.ins)));
  const body = b.parts.map(([s, g]) => { const sec = SECTIONS.find(x => x.id === s); return sec ? renderSection(sec, g) + (!g ? extraPhotos(sec) : '') : ''; }).join('');
  return `<div class="ov-head"><button class="btn" data-ovback="1">‹ All buttons</button><h2><svg viewBox="${OV_VB[b.icon] || '0 0 24 24'}" aria-hidden="true">${OV_ICON[b.icon]}</svg>${esc(b.t)}</h2>${next ? `<button class="btn" data-ov="${next.id}">Next: ${esc(next.t)} ›</button>` : ''}</div>${legend()}${body}`;
}
function bindOverview(root) {
  root.querySelectorAll('[data-ckgo]').forEach(el => el.onclick = () => { app.ckLast = el.dataset.ckgo; goTab('ck:' + el.dataset.ckgo); window.scrollTo(0, 0); });
  root.querySelectorAll('[data-ov]').forEach(el => el.onclick = () => { const b = ovBtn(el.dataset.ov); if (!b) return;
    if (b.act === 'sketch') { const s = document.getElementById('sketchBtn'); if (s) s.click(); return; }
    if (b.tab) { goTab(b.tab); return; }
    goTab('b:' + b.id); window.scrollTo(0, 0); });
  root.querySelectorAll('[data-ovback]').forEach(el => el.onclick = () => { goTab('overview'); window.scrollTo(0, 0); });
  root.querySelectorAll('[data-ovcw]').forEach(el => el.onclick = () => { goTab('cw'); window.scrollTo(0, 0); });
  root.querySelectorAll('[data-ovclassic]').forEach(el => el.onclick = () => { app.classic = true; goTab('property'); });
  root.querySelectorAll('[data-ovadd]').forEach(el => el.onclick = () => { goTab('b:adu'); window.scrollTo(0, 0); toast('Add an ADU here, or tap Next for outbuildings'); });
}
/* the section a group button belongs to (a button page shows groups from several sections) */
function secOfEl(el) { const s = el.closest && el.closest('[data-secid]'); return SECTIONS.find(x => x.id === (s ? s.dataset.secid : app.tab)); }

/* ================= the active checklist (her Oct 24 2026) =================
   Her clipboard sheet as a live screen: one tab per button, every group open, compact rows (question on the left, words on the right),
   tap a word to choose it. Same answers as the buttons; lists (bedrooms, baths, roofs, outbuildings…) grow with their ＋ Add buttons. */
function renderCK(id) {
  const ins = app.ins; const issues = computeIssues(ins).filter(x => !ins.overrides[x.key] && (x.sev === 'Required' || x.sev === 'Photo'));
  const tabs = OV_BTNS.filter(b => b.parts && (!b.show || b.show(ins)));
  const b = tabs.find(x => x.id === id) || tabs[0]; app.ckLast = b.id;
  b.parts.forEach(([s, g]) => { const sec = SECTIONS.find(x => x.id === s); if (!sec) return; const set = ensureGroups(sec, g); sec.groups.forEach(x => { if (!g || g.includes(x.id)) set.add(x.id); }); });
  const body = b.parts.map(([s, g]) => { const sec = SECTIONS.find(x => x.id === s); return sec ? renderSection(sec, g) + (!g ? extraPhotos(sec) : '') : ''; }).join('');
  const i = tabs.indexOf(b), next = tabs[i + 1], prev = tabs[i - 1];
  const tab = x => { const m = ovMissing(x, issues); return `<button class="ck-tab${x === b ? ' on' : ''}" data-ckgo="${x.id}">${esc(x.t)}${m ? ` <span class="ck-n">${m}</span>` : ''}</button>`; };
  return `<div class="ck"><div class="ck-tabs">${tabs.map(tab).join('')}</div>
    <p class="ck-tip">Tap a word to choose it (dark = chosen), tap again to clear. <span class="ck-dot">●</span> = UAD required. ＋ Add makes a new box (bedroom, bath, roof, outbuilding…). Same answers as the buttons.</p>
    <div class="ck-body">${body}</div>
    <div class="ck-nav">${prev ? `<button class="btn" data-ckgo="${prev.id}">‹ ${esc(prev.t)}</button>` : '<span></span>'}${next ? `<button class="btn primary" data-ckgo="${next.id}">${esc(next.t)} ›</button>` : ''}</div></div>`;
}
