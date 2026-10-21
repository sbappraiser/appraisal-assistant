/* ---------------- outbuildings (UAD 3.6 Outbuilding Type, F-1 12.001 / 22.14) – her ask Oct 20 2026 ----------------
   One row per outbuilding: its 3.6 type, and for a living one (ADU, guest house …) its finished sq ft and baths, which the
   ADU / guest rates use. Shows as "Guest House 600 sf 1/0 ba; Shed". A detached garage that is only for cars goes in
   Vehicle storage, not here; an ADU over a garage is "ADU/Garage". */
const OB_TYPES = ['Standalone ADU', 'ADU/Garage', 'Guest House', 'Pool House', 'Studio', 'Office', 'Workshop', 'Shed', 'Barn', 'Stable', 'Greenhouse', 'Bunkhouse', 'Boathouse', 'Enclosed Kennel', 'Indoor Riding Arena', 'Manufactured Home', 'Silo', 'Other'];
const OB_LIVING = ['Standalone ADU', 'ADU/Garage', 'Guest House', 'Pool House', 'Studio', 'Office', 'Bunkhouse', 'Manufactured Home'];
const OB_ADU = ['Standalone ADU', 'ADU/Garage'];   // F-1 22.07 / 22.14: these go in the Unit(s) part of the 3.6 grid, not Outbuilding
const OB_ALIAS = [[/^adu ?\/ ?gar|garage.*adu|adu.*garage|gar.*apt|apartment over/i, 'ADU/Garage'], [/^(adu|standalone adu|second unit|2nd unit|granny|cottage)/i, 'Standalone ADU'], [/^(guest|gst|guesthouse)/i, 'Guest House'], [/^pool ?house|^pool ?hse|cabana/i, 'Pool House'],
  [/^studio/i, 'Studio'], [/^office|^ofc/i, 'Office'], [/^work ?shop|^wkshp|^shop/i, 'Workshop'], [/^shed|^storage|^stg/i, 'Shed'], [/^barn|^brn/i, 'Barn'], [/^stable/i, 'Stable'], [/^green ?house/i, 'Greenhouse'], [/^bunk/i, 'Bunkhouse'], [/^boat/i, 'Boathouse'], [/^kennel/i, 'Enclosed Kennel'], [/^riding|arena/i, 'Indoor Riding Arena'], [/^manufactured|^mobile/i, 'Manufactured Home'], [/^silo/i, 'Silo']];
function obParse(text) { const t = String(text || '').trim(); if (!t || /^(none|no)$/i.test(t)) return { none: !!t, items: [] };
  const items = []; t.split(/;\s*/).forEach(p => { p = p.trim(); if (!p || /^(none|no|n\/a)$/i.test(p)) return;
    const hit = OB_TYPES.find(x => p.toLowerCase().startsWith(x.toLowerCase())) || (OB_ALIAS.find(([re]) => re.test(p)) || [])[1] || ''; if (!hit) { items.push({ t: 'Other', other: p.slice(0, 40), sf: '', full: '', half: '' }); return; }
    const sf = p.match(/(\d[\d,]*)\s*(sf|sq)/i), ba = p.match(/(\d+)\s*\/\s*(\d+)\s*ba/i) || p.match(/(\d+)\s*(?:full\s*)?ba/i);
    const q = p.match(/\bQ([1-6])\b/), cc = p.match(/\bC([1-6])\b/);
    items.push({ t: hit, other: hit === 'Other' ? p.replace(/^other:?\s*/i, '').slice(0, 40) : '', sf: sf ? +sf[1].replace(/,/g, '') : '', full: ba ? +ba[1] : '', half: ba && ba[2] !== undefined ? +ba[2] : '', q: q ? 'Q' + q[1] : '', c: cc ? 'C' + cc[1] : '' }); });
  return { none: !items.length, items }; }
const obText = (none, items) => none || !items.length ? 'None' : items.map(x => `${x.t === 'Other' ? 'Other: ' + (x.other || '') : x.t}${x.sf ? ' ' + (+x.sf).toLocaleString() + ' sf' : ''}${x.full !== '' || x.half !== '' ? ` ${x.full || 0}/${x.half || 0} ba` : ''}${x.q ? ' ' + x.q : ''}${x.c ? ' ' + x.c : ''}`).join('; ');
/* living area and baths for the ADU / guest rates: every living outbuilding added up (sheds, barns … do not count) */
function obLiving(text) { const P = obParse(text); if (!P.items.length) return P.none ? { sf: 0, baths: 0 } : null; const L = P.items.filter(x => OB_LIVING.includes(x.t));
  return { sf: L.reduce((s, x) => s + (+x.sf || 0), 0), baths: L.reduce((s, x) => s + (+x.full || 0) + (+x.half || 0) * 0.5, 0) }; }
function obPick(who) {
  const J = app.job; const c = who === 'subj' ? null : J.comps.find(x => x.id === who); const F = c ? compFacts(c, J) : subjFacts(J); const name = c ? 'Comp ' + (c.use || '') + ' ' + compTitle(c) : 'Subject';
  const P = obParse(F.adu); let none = P.none && /^none|^no$/i.test(String(F.adu || '').trim()); const L = P.items.map(x => ({ ...x })); while (L.length < 4) L.push({ t: '', other: '', sf: '', full: '', half: '' });
  const bg = document.createElement('div'); bg.className = 'sheetbg';
  const draw = () => { bg.innerHTML = `<div class="sheet uadpick"><h2>Outbuildings – ${esc(name)}</h2>${F.adu && !P.items.length && !none ? `<p class="help warnTxt">Now: “${esc(F.adu)}” – not a 3.6 outbuilding type. Pick below.</p>` : ''}<div class="pkgrid"><div>
    <label class="check"><input type="checkbox" data-obnone="1" ${none ? 'checked' : ''}> None</label>
    <table class="mini"><tr><th>Outbuilding type (3.6)</th><th>Finished sq ft</th><th>Baths full / half</th><th title="ADU interior quality and condition – F-1 22.10 (adjust in the Overall quality / condition lines)">ADU Q / C</th></tr>${L.map((x, i) => `<tr><td><select data-ob="${i}|t" ${none ? 'disabled' : ''}><option value="">–</option>${OB_TYPES.map(v => `<option ${x.t === v ? 'selected' : ''}>${v}</option>`).join('')}</select>${x.t === 'Other' ? `<br><input class="txt sm" data-ob="${i}|other" maxlength="40" value="${esc(x.other || '')}" placeholder="describe, e.g. Barn/Garage">` : ''}</td>
      <td><input class="txt xs" data-ob="${i}|sf" value="${esc(x.sf)}" style="width:6em" ${none || !OB_LIVING.includes(x.t) ? 'disabled' : ''}></td><td><input class="txt xs" data-ob="${i}|full" value="${esc(x.full)}" style="width:3em" ${none || !OB_LIVING.includes(x.t) ? 'disabled' : ''}> / <input class="txt xs" data-ob="${i}|half" value="${esc(x.half)}" style="width:3em" ${none || !OB_LIVING.includes(x.t) ? 'disabled' : ''}></td><td>${OB_ADU.includes(x.t) && !none ? `<select data-ob="${i}|q"><option value="">Q</option>${[1,2,3,4,5,6].map(n => `<option ${x.q === 'Q' + n ? 'selected' : ''}>Q${n}</option>`).join('')}</select> <select data-ob="${i}|c"><option value="">C</option>${[1,2,3,4,5,6].map(n => `<option ${x.c === 'C' + n ? 'selected' : ''}>C${n}</option>`).join('')}</select>` : ''}</td></tr>`).join('')}</table></div>
    <div class="pkguide"><b>UAD guidance</b><p>One row for each outbuilding, with its intended use (F-1 12.001). Standalone ADU: a detached ADU with no other area. ADU/Garage: a detached garage with an ADU above it or attached by a common wall. Guest House: temporary living quarters without all the elements of a dwelling unit. A detached garage used only for cars goes in Vehicle storage, not here; a garage with other area (workshop, ADU and more) is Other – describe all uses (e.g. Workshop/ADU/Garage). Sq ft and baths are for living outbuildings – they drive your $ per ADU / guest sq ft and bath rates.</p><p>On the grid each ADU gets its own line (the 3.6 Unit(s) part) and each other outbuilding its own line, lined up like-to-like with the comps, each with its own adjustment. For an ADU pick its interior quality and condition too (F-1 22.10) – any adjustment for them goes in the Overall quality / condition lines.</p></div></div>
    <div class="row"><span class="grow"></span><button class="btn primary" data-obsave="1">OK</button><button class="btn" data-obclose="1">Cancel</button></div></div>`; };
  draw(); document.body.appendChild(bg);
  bg.addEventListener('change', e => { const t = e.target; if (t.dataset.obnone) { none = t.checked; draw(); return; } const d = t.dataset.ob; if (!d) return; const [i, k] = d.split('|'); L[+i][k] = ['sf', 'full', 'half'].includes(k) ? (t.value.trim() === '' ? '' : Math.max(0, +String(t.value).replace(/[^0-9.]/g, '') || 0)) : t.value; if (k === 't') draw(); });
  bg.addEventListener('click', e => { const t = e.target; if (t.dataset.obclose || t === bg) { bg.remove(); return; } if (!t.dataset.obsave) return;
    const rows = none ? [] : L.filter(x => x.t); const txt = obText(none, rows); bg.remove(); pkSave(J, who, 'adu', txt); });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-obpick]'); if (!b || !app.job) return; e.stopPropagation(); obPick(b.dataset.obpick); }, true);
const obBtn = who => ` <button type="button" class="btn xs" data-obpick="${who}" title="Pick the 3.6 outbuilding types, with sq ft and baths">▾ pick</button>`;

/* her ask (Oct 20 2026): each outbuilding on its own line under the box, so all of them can be read on the grid */
function obList(text) { const P = obParse(text); if (P.items.length < 1 || (P.items.length === 1 && String(text).length < 28)) return '';
  return '<ul class="oblist">' + P.items.map(i => `<li><b>${esc(i.t === 'Other' && i.other ? i.other : i.t)}</b>${i.sf ? ' · ' + Number(i.sf).toLocaleString() + ' sf' : ''}${i.full !== '' || i.half !== '' ? ' · ' + (+i.full || 0) + '/' + (+i.half || 0) + ' ba' : ''}</li>`).join('') + '</ul>'; }

/* ---- her ask (Oct 20 2026): ADUs and outbuildings the way the GSEs want them (F-1 22.07 / 22.10 / 22.14) ----
   When the subject or any comp has an ADU or outbuilding, the grid opens one line per ADU (Unit(s)) and one per outbuilding,
   lined up like-to-like by type across the comps (two guest houses → Guest House 1 and Guest House 2), each with its own adjustment. */
const obKey = t => t.replace(/[^A-Za-z]/g, '');
function obSlots(text) { const P = obParse(text), out = {}; let a = 0; const n = {};
  P.items.forEach(x => { if (OB_ADU.includes(x.t)) out['aduU' + (++a)] = x; else { const k = obKey(x.t); n[k] = (n[k] || 0) + 1; out['ob_' + k + '_' + n[k]] = x; } }); return out; }
const obSlotText = x => !x ? '' : `${x.t === 'Other' && x.other ? 'Other: ' + x.other : x.t}${x.sf ? ' · ' + Number(x.sf).toLocaleString() + ' sf' : ''}${x.full !== '' || x.half !== '' ? ' · ' + (+x.full || 0) + '/' + (+x.half || 0) + ' ba' : ''}${x.q || x.c ? ' · ' + [x.q, x.c].filter(Boolean).join(' ') : ''}`;
/* adds the per-building lines to a subject or comp's facts: F._ob = { slotId: item }, F[slotId] = its text; F._obKnown = an entry was made (None counts) */
function obAttach(F) { if (!F) return F; const t = String(F.adu || '').trim(); F._obKnown = !!t; F._ob = obSlots(t); Object.entries(F._ob).forEach(([k, x]) => { F[k] = obSlotText(x); }); return F; }
const isObSlot = id => /^(aduU\d+|ob_[A-Za-z]+_\d+)$/.test(id);
let OB_BUSY = false;   // compFacts can ask for the grid lines while it is being worked out – no lines added then
function obSlotRows(J) { if (OB_BUSY) return []; return rcMemo('obSlotRows', 'x', () => { OB_BUSY = true; let all; try { all = [subjFacts(J), ...usedComps(J).map(c => compFacts(c, J))]; } finally { OB_BUSY = false; } let aMax = 0; const tMax = {};
  all.forEach(F => { const S = F._ob || {}; Object.keys(S).forEach(k => { let m = k.match(/^aduU(\d+)$/); if (m) { aMax = Math.max(aMax, +m[1]); return; } m = k.match(/^ob_([A-Za-z]+)_(\d+)$/); if (m) tMax[m[1]] = Math.max(tMax[m[1]] || 0, +m[2]); }); });
  const rows = []; const R3 = ['aduSf', 'aduBath', 'aduHalf'];
  for (let k = 1; k <= aMax; k++) rows.push(['aduU' + k, aMax > 1 ? 'ADU ' + k + ' (unit)' : 'ADU (unit)', 'Amenities', 'Outbuilding', R3]);
  OB_TYPES.filter(t => !OB_ADU.includes(t)).forEach(t => { const m = tMax[obKey(t)] || 0; for (let k = 1; k <= m; k++) rows.push(['ob_' + obKey(t) + '_' + k, 'Outbuilding: ' + t + (m > 1 ? ' ' + k : ''), 'Amenities', 'Outbuilding', OB_LIVING.includes(t) ? R3 : null]); });
  return rows; }); }
/* the $ for one ADU / outbuilding line: her $ per ADU / guest sq ft, full and half bath rates on that building (none on the other side = 0) */
function obSlotAmount(row, S, C, J) { if (!S._obKnown || !C._obKnown) return null; const R = G0(J).rates, key = row[4]; if (!key) return null;
  const a = (S._ob || {})[row[0]] || {}, b = (C._ob || {})[row[0]] || {}; let tot = 0, any = false;
  [['aduSf', 'sf'], ['aduBath', 'full'], ['aduHalf', 'half']].forEach(([k, f]) => { const r = num(R[k]); if (!r) return; tot += ((+a[f] || 0) - (+b[f] || 0)) * r; any = true; });
  return any ? Math.round(tot / 500) * 500 : null; }
