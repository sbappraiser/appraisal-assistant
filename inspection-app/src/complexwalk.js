/* =====================================================================
   COMPLEX WALK – large properties (her Montecito inspection, Oct 23 2026).
   Two fixed steps (① Street & driveway, ② On the way to the door), then she moves freely
   with big buttons: Main house – outside / inside, Site & landscaping, Buildings, Pool & outdoor,
   Mechanical & systems, Ask / later, Finish for the report.
   Every question shown here is the SAME field as on the buttons and tabs (one home);
   walk-only words (gate, motor court, second driveway, things seen on the grounds) are kept in
   ins.data.cw and go into the Inspection Notes and the comment drafts.
   Each section: 📷 photos labeled with the section (Claude names what is in the picture only when
   the order's AI use is Yes), and a note box (type, or tap the keyboard 🎤 and speak).
   ===================================================================== */
const CWF = (sec, k) => ({ f: [sec, k] });          // one field
const CWG = (sec, g, skip) => ({ g: [sec, g, skip || []] });   // every field of a group
const CWL = list => ({ list });                     // a list (rooms, buildings, pools…)
const CWW = (id, t, words) => ({ cw: id, t, words });          // walk-only words
const CW_SECS = [
  { id: 'street', n: '①', t: 'Street & driveway', fixed: true, ph: 'street', icon: 'street', parts: [
    CWW('gate', 'Gate', ['Gated', 'Automatic gate', 'Call box / intercom', 'Open – no gate', 'Guard / gate house']),
    CWG('street', 'access', ['note']), CWG('street', 'streetPh'),
    CWG('driveway', 'drive', ['note']),
    CWW('drive2', 'Second driveway – material', ['Asphalt', 'Concrete', 'Pavers', 'Gravel', 'Stone', 'Decomposed granite', 'Brick', 'Cobblestone'])] },
  { id: 'door', n: '②', t: 'On the way to the door', fixed: true, ph: 'front', icon: 'front', parts: [
    CWW('door', 'What you see', ['Motor court', 'Guest parking', 'Fountain', 'Courtyard entry', 'Porte-cochère', 'Entry gate / arbor', 'Front lawn', 'Specimen trees']),
    CWG('site', 'view'), CWG('front', 'frontPh')] },
  { id: 'site', t: 'Site & landscaping', ph: 'site', icon: 'palm', parts: [
    CWG('amenities', 'land'),
    CWF('site', 'topo'), CWF('site', 'topoOth'), CWF('site', 'topoMore'), CWF('site', 'usable'), CWF('site', 'siteFeat'), CWF('site', 'siteFeatOth'), CWF('site', 'siteFeatImpact'), CWF('site', 'siteFeatDesc'), CWF('site', 'drainage'), CWF('site', 'photoSite'), CWF('site', 'photoSite2'),
    CWW('grounds', 'Seen on the grounds', ['Well head', 'Propane tank', 'Septic lid', 'Water tanks', 'Generator', 'Solar panels', 'Transformer', 'Oil / gas well', 'Easement / path']),
    CWG('site', 'infl'), CWG('site', 'restr')] },
  { id: 'ext', t: 'Main house – outside', ph: 'front', icon: 'front', parts: [
    CWG('front', 'design'), CWG('front', 'walls', ['note']), CWL('roofs2'), CWG('exterior', 'rearPh'), CWG('front', 'extQC'), CWG('exterior', 'extDef', ['note'])] },
  { id: 'int', t: 'Main house – inside', ph: 'interior', icon: 'interior', parts: [
    CWL('levels'), CWL('rooms'), CWL('bedrooms'), CWL('baths'), CWL('kitchens'), CWL('wetbars'), CWL('stairs'),
    CWG('interior', 'finish'), CWG('interior', 'feat'), CWG('interior', 'safety'), CWG('interior', 'attic'), CWG('interior', 'noncont'), CWG('interior', 'unit'), CWG('interior', 'intQC', ['note'])] },
  { id: 'bldg', t: 'Buildings', add: 'building', ph: 'buildings', icon: 'adu', parts: [CWL('adus'), CWL('outbuildings'), CWG('garage', 'vs', ['note'])] },
  { id: 'pool', t: 'Pool & outdoor', add: 'pool', ph: 'amenities', icon: 'palm', parts: [CWL('waterFeatures'), CWL('outdoorLiving'), CWG('amenities', 'rec', ['note'])] },
  { id: 'mech', t: 'Mechanical & systems', ph: 'systems', icon: 'systems', parts: [CWG('systems', 'hvac'), CWG('systems', 'wh'), CWG('systems', 'mech'), CWG('systems', 'energy'), CWG('systems', 'smart', ['note']), CWG('interview', 'disaster')] },
  { id: 'ask', t: 'Ask / later', ph: 'interview', icon: 'interview', ask: true, parts: [
    CWG('site', 'hazard', ['note']), CWF('front', 'foundType'), CWF('front', 'foundTypeOth'), CWF('front', 'foundMat'), CWF('front', 'foundMatOth'), CWF('front', 'foundCond'),
    CWG('project', 'projHOA'), CWG('project', 'projSee'),   // her Oct 24 2026: the HOA questions are asked of the owner / agent, with the interview
    CWG('interview', 'updates'), CWG('interview', 'sysConf'), CWG('interview', 'utilConf'), CWG('interview', 'confirm'), CWL('eas'), CWL('defects')] },
  { id: 'finish', t: 'Finish for the report', icon: 'wrapup', finish: true, parts: [] },
];
const cwData = ins => { const d = ins.data.cw = ins.data.cw || {}; d.ticks = d.ticks || {}; d.notes = d.notes || {}; d.x26 = d.x26 || {}; return d; };
const cwSec = id => CW_SECS.find(s => s.id === id) || CW_SECS[0];
const LIST_HOME = {}; SECTIONS.forEach(s => s.groups.forEach(g => { if (g.list) LIST_HOME[g.list] = [s.id, g.id]; }));
/* which issues belong to a walk section (for its red count) */
function cwOwns(S, x) {
  return S.parts.some(p => (p.f && x.key === p.f[0] + ':' + p.f[1]) || (p.g && x.tab === p.g[0] && x.group === p.g[1]) || (p.list && LIST_HOME[p.list] && x.tab === LIST_HOME[p.list][0] && x.group === LIST_HOME[p.list][1]));
}
const cwIssues = ins => computeIssues(ins).filter(x => !ins.overrides[x.key] && (x.sev === 'Required' || x.sev === 'Photo'));
function cwField(sec, k) { const { f, g } = findField(sec, k); if (!f) return ''; return renderField(f, secData(app.ins, sec, f), { sec, group: g.id }); }
function cwPart(p) {
  const ins = app.ins; const D = cwData(ins);
  if (p.f) return cwField(p.f[0], p.f[1]);
  if (p.g) { const sec = SECTIONS.find(s => s.id === p.g[0]); const g = sec && sec.groups.find(x => x.id === p.g[1]); if (!g || (sec.showTab && !sec.showTab(ins)) || !groupShown(g, sec, ins)) return '';
    const inner = g.fields.filter(f => f && !p.g[2].includes(f.k)).map(f => renderField(f, secData(ins, sec.id, f), { sec: sec.id, group: g.id })).join('');
    const lst = g.list && (!g.listShow || g.listShow(ins.data[sec.id], ins)) ? renderList(g.list) : '';
    return inner || lst ? `<div class="cw-sub"><h3>${esc(g.title)}</h3>${inner ? `<div class="fields two">${inner}</div>` : ''}${lst}</div>` : ''; }
  if (p.list) { const L = LISTS[p.list]; return `<div class="cw-sub"><h3>${esc(L.title || p.list)}</h3>${renderList(p.list)}</div>`; }
  if (p.cw) { const on = new Set(D.ticks[p.cw] || []);
    return `<div class="cw-sub"><h3>${esc(p.t)}</h3><div class="cw-words">${p.words.map(w => `<button type="button" class="cw-w${on.has(w) ? ' on' : ''}" data-cwt="${esc(p.cw)}" data-cww="${esc(w)}" aria-pressed="${on.has(w)}"><span class="cw-box" aria-hidden="true">${on.has(w) ? '✓' : ''}</span>${esc(w)}</button>`).join('')}</div></div>`; }
  return '';
}
function cwAdded(ins) {
  const L = ins.lists, out = [];
  (L.adus || []).forEach((it, i) => out.push(['bldg', LISTS.adus.name(it, i, L.adus)]));
  (L.outbuildings || []).forEach((it, i) => out.push(['bldg', LISTS.outbuildings.name(it, i, L.outbuildings)]));
  if ((ins.data.garage || {}).hasGarage) out.push(['bldg', 'Garage']);
  (L.waterFeatures || []).forEach((it, i) => out.push(['pool', LISTS.waterFeatures.name(it, i, L.waterFeatures)]));
  return out;
}
function renderCW() {
  const ins = app.ins; const D = cwData(ins); const cur = cwSec(app.cwSec || D.at || 'street'); D.at = cur.id;
  const issues = cwIssues(ins); const n = S => S.finish ? issues.length : issues.filter(x => cwOwns(S, x)).length;
  const btn = S => { const m = n(S); const on = S.id === cur.id;
    return `<button type="button" class="cw-b${on ? ' on' : ''}${S.fixed ? ' fixed' : ''}${S.ask ? ' ask' : ''}${S.add ? ' add' : ''}" data-cwgo="${S.id}"${on ? ' aria-current="true"' : ''}>${OV_ICON[S.icon] ? `<svg class="cw-ic" viewBox="${OV_VB[S.icon] || '0 0 24 24'}" aria-hidden="true">${OV_ICON[S.icon]}</svg>` : ''}${S.n ? S.n + ' ' : ''}${esc(S.t)}${m ? ` <span class="cw-n">${m}</span>` : (S.finish ? '' : ' <span class="cw-ok">✓</span>')}</button>`; };
  const added = cwAdded(ins);
  let body;
  if (cur.finish) body = cwFinishHTML(ins, issues);
  else {
    const slot = { sec: cur.ph, extra: true, cw: cur.id, label: cur.t, cat: 'SupplementalExhibit' };
    body = `${cur.add === 'building' ? `<div class="cw-addrow"><b>Add a building as you come to it:</b> use <b>＋ Add</b> under ADUs or Outbuildings below (garage, guest house, pool house, exterior bath, barn…).</div>` : ''}
      ${cur.add === 'pool' ? `<div class="cw-addrow"><b>Add a pool, spa or water feature</b> with <b>＋ Add</b> under Pool, Spa &amp; Water Features below.</div>` : ''}
      <div class="cw-tools"><div class="cw-photo"><b>📷 Photos – ${esc(cur.t)}</b> <small>${cwAiOn(ins) ? 'Claude names what is in each picture (this order allows AI)' : 'labeled with this section – rename a photo by tapping it'}</small>${photoSlot(slot)}</div>
        <label class="cw-note"><b>🎤 Note – ${esc(cur.t)}</b> <small>type, or tap the microphone on the keyboard and speak</small><textarea class="txt" rows="3" data-cwnote="${cur.id}">${esc(D.notes[cur.id] || '')}</textarea></label></div>
      ${cur.parts.map(cwPart).join('')}`;
  }
  const i = CW_SECS.indexOf(cur), next = CW_SECS[i + 1];
  return `<div class="cw">
    <div class="cw-steps">${CW_SECS.filter(S => S.fixed).map(btn).join('')}</div>
    <div class="cw-jump">${CW_SECS.filter(S => !S.fixed).map(btn).join('')}</div>
    ${added.length ? `<div class="cw-added"><span>Added so far:</span>${added.map(([s, l]) => `<button type="button" class="cw-chip" data-cwgo="${s}">${esc(l)}</button>`).join('')}</div>` : ''}
    <div class="cw-tools2"><button type="button" class="btn" data-cwprint="1">🖨 Clipboard sheet</button><button type="button" class="btn" data-ovback="1">▦ All buttons</button></div>
    <h2 class="cw-title">${esc(cur.t)}${n(cur) ? ` <small>${n(cur)} still needed for the report</small>` : ''}</h2>
    ${body}
    ${next ? `<div class="cw-nextrow"><button type="button" class="btn primary" data-cwgo="${next.id}">Next: ${esc(next.t)} ›</button></div>` : ''}</div>`;
}
/* the last step: what the report still needs (her order's form decides) */
function cwFinishHTML(ins, issues) {
  const O = (ins.data.property || {}).order || {}; const f26 = /2\.6/.test(O.reportForm || '');
  const by = {}; issues.forEach(x => { const b = OV_BTNS.find(B => ovIn(B, x)) || { id: 'attention', t: 'Other' }; (by[b.id] = by[b.id] || { b, xs: [] }).xs.push(x); });
  const D = cwData(ins), X = D.x26;
  const R = ins.lists; const roomsAG = (R.rooms || []).filter(r => !/bath|laundry|entry|foyer|hall|utility|mud|pantry|closet|storage|garage/i.test(String(r.type || r.kind || ''))).length + (R.bedrooms || []).length + (R.kitchens || []).length;
  const yn = (k, l) => `<div class="cw-sub"><h3>${esc(l)}</h3><div class="cw-words">${['Yes', 'No'].map(v => `<button type="button" class="cw-w${X[k] === v ? ' on' : ''}" data-cwx="${k}" data-cwv="${v}"><span class="cw-box">${X[k] === v ? '✓' : ''}</span>${v}</button>`).join('')}</div></div>`;
  return `<p class="cw-lead">${f26 ? 'This order is <b>UAD 2.6</b>: the 2.6 items are at the bottom.' : 'The order’s form: <b>' + esc(O.reportForm || 'not given – asking the UAD 3.6 list') + '</b>.'} Everything you tapped on the walk already counts. Tap a line to answer it.</p>
    ${issues.length ? Object.values(by).map(({ b, xs }) => `<div class="cw-sub"><h3>${esc(b.t)} <small>${xs.length}</small></h3><ul class="cw-miss">${xs.slice(0, 12).map(x => `<li><button type="button" class="lnk" data-cwfix="${esc(b.id)}" data-anchor="${esc(x.anchor || '')}">${esc(x.label)}</button></li>`).join('')}${xs.length > 12 ? `<li>…and ${xs.length - 12} more</li>` : ''}</ul></div>`).join('') : '<p class="cw-done">✓ Nothing required is missing.</p>'}
    ${f26 ? `<div class="cw-sub cw26"><h3>UAD 2.6 extras</h3>
      <label class="cw-in">Total rooms above grade <small>(from your rooms list: about ${roomsAG} – check it)</small><input class="txt" inputmode="numeric" data-cwxin="rooms" value="${esc(X.rooms || '')}"></label>
      <label class="cw-in">Basement – % finished <small>(blank if none)</small><input class="txt" inputmode="numeric" data-cwxin="bsmtPct" value="${esc(X.bsmtPct || '')}"></label>
      <label class="cw-in">Rooms below grade <small>(rec room, bedrooms, baths)</small><input class="txt" data-cwxin="bsmtRooms" value="${esc(X.bsmtRooms || '')}"></label></div>
      ${yn('infest', 'Evidence of infestation?')}${yn('damp', 'Evidence of dampness?')}${yn('settle', 'Evidence of settlement?')}` : ''}`;
}
function cwAiOn(ins) { const O = (ins.data.property || {}).order || {}; return O.aiUse === 'Yes' && typeof hwKey === 'function' && !!hwKey(); }
/* Claude names what is in a walk photo (only when the order's AI use is Yes) */
async function cwAiLabel(meta) {
  const ins = app.ins; if (!ins || !cwAiOn(ins) || navigator.onLine === false) return;
  try {
    const rec = await DB.get('photos', meta.id); if (!rec || !rec.blob) return;
    const bmp = await createImageBitmap(rec.blob); const sc = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const b64 = cv.toDataURL('image/jpeg', 0.7).split(',')[1];
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': hwKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: hwModel(), max_tokens: 30, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: `This is an appraisal inspection photo taken in the section "${meta.label}". Name what it shows in 1 to 4 words, like an appraiser's photo label (e.g. "Pool", "Kitchen", "Garage interior", "Wine cellar", "Rose garden", "Well head"). Reply with the label only.` }] }] }) });
    const j = await res.json(); if (!res.ok) return;
    const t = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').replace(/["\n.]/g, '').trim().slice(0, 40); if (!t) return;
    const m = ins.photos.find(p => p.id === meta.id); if (!m || !m.autoLabel) return;
    const same = ins.photos.filter(p => p !== m && String(p.label).replace(/ \d+$/, '') === t).length;
    m.label = t + (same ? ' ' + (same + 1) : ''); m.aiLabel = true; save(); if (app.tab === 'cw') renderTab(); toast('Photo named: ' + m.label);
  } catch (e) { /* the section label stays */ }
}
function bindCW(root) {
  const D = cwData(app.ins);
  root.querySelectorAll('[data-cwgo]').forEach(b => b.onclick = () => { app.cwSec = b.dataset.cwgo; D.at = app.cwSec; save(); renderTab(); window.scrollTo(0, 0); });
  root.querySelectorAll('[data-cwt]').forEach(b => b.onclick = () => { const k = b.dataset.cwt, w = b.dataset.cww; const s = new Set(D.ticks[k] || []); s.has(w) ? s.delete(w) : s.add(w); D.ticks[k] = [...s]; save(); renderTab(); });
  root.querySelectorAll('[data-cwnote]').forEach(t => t.oninput = () => { D.notes[t.dataset.cwnote] = t.value; save(); });
  root.querySelectorAll('[data-cwx]').forEach(b => b.onclick = () => { const k = b.dataset.cwx; D.x26[k] = D.x26[k] === b.dataset.cwv ? undefined : b.dataset.cwv; save(); renderTab(); });
  root.querySelectorAll('[data-cwxin]').forEach(i => i.oninput = () => { D.x26[i.dataset.cwxin] = i.value; save(); });
  root.querySelectorAll('[data-cwfix]').forEach(b => b.onclick = () => { const id = b.dataset.cwfix; if (id === 'attention') goTab('attention'); else goTab('b:' + id); const a = b.dataset.anchor; if (a) setTimeout(() => scrollToEl(a), 120); });
  root.querySelectorAll('[data-cwprint]').forEach(b => b.onclick = cwPrint);
  root.querySelectorAll('[data-ovback]').forEach(el => el.onclick = () => { goTab('overview'); window.scrollTo(0, 0); });
}
/* the clipboard sheet: the same sections and words, with tick boxes, to print */
function cwSheetHTML(ins) {
  const box = w => `<span class="w"><i></i>${esc(w)}</span>`;
  const opts = f => { let o = f.o; if (typeof o === 'function') { try { o = o({}, ins); } catch (e) { o = null; } } if (f.t === 'yn') return ['Yes', 'No']; return (o || []).map(x => Array.isArray(x) ? x[1] : x).filter(x => x && !/^Other$/.test(x)).slice(0, 18); };
  const fieldRow = f => { if (!f || ['photo', 'info', 'calc', 'review', 'crs', 'permits', 'order', 'note'].includes(f.t) || (f.show && f.show.toString().includes('() => false'))) return '';
    const w = opts(f); return `<div class="r"><b>${esc(f.l.replace(/<[^>]+>/g, ''))}</b><span class="o">${w.length ? w.map(box).join('') : '<span class="line"></span>'}</span></div>`; };
  const part = p => {
    if (p.cw) return `<div class="r"><b>${esc(p.t)}</b><span class="o">${p.words.map(box).join('')}</span></div>`;
    if (p.f) return fieldRow(findField(p.f[0], p.f[1]).f);
    if (p.g) { const sec = SECTIONS.find(s => s.id === p.g[0]); const g = sec && sec.groups.find(x => x.id === p.g[1]); return g ? g.fields.filter(f => f && !p.g[2].includes(f.k) && !/Oth$|Other$|Desc$/.test(f.k)).map(fieldRow).join('') : ''; }
    if (p.list) return `<div class="r"><b>${esc((LISTS[p.list] || {}).title || p.list)}</b><span class="o"><span class="line"></span><span class="line"></span></span></div>`;
    return ''; };
  const addr = [insTitle(ins), insAddr(ins)].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Clipboard sheet – ${esc(addr)}</title><style>
    @page { size: letter; margin: 0.45in; } body { font: 12.5pt/1.35 Arial, Helvetica, sans-serif; color: #000; margin: 0; }
    h1 { font-size: 17pt; margin: 0 0 6px; } h2 { font-size: 14pt; margin: 12px 0 4px; border-bottom: 2px solid #000; break-after: avoid; }
    .s { border: 1.5px solid #000; border-radius: 5px; padding: 6px 8px; margin: 0 0 8px; break-inside: avoid-page; }
    .r { margin: 2px 0; display: flex; gap: 10px; align-items: baseline; } .r b { flex: 0 0 1.7in; } .r .o { flex: 1; display: flex; flex-wrap: wrap; gap: 2px 12px; min-width: 0; } .w { white-space: nowrap; display: inline-block; }   /* her Oct 24 2026: label on the left, choices wrap in their own column */
    .w i { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; margin-right: 4px; vertical-align: -1px; }
    .line { display: inline-block; width: 2.2in; border-bottom: 1px solid #000; height: 14px; margin-right: 10px; } .meta { font-size: 11pt; margin-bottom: 6px; }
    .ph { font-size: 11pt; margin-top: 4px; } @media screen { body { max-width: 8in; margin: 16px auto; padding: 0 16px; } .noprint { margin: 10px 0; } } @media print { .noprint { display: none; } }
  </style></head><body><div class="noprint"><button onclick="window.print()" style="font-size:16px;padding:8px 14px">Print</button></div>
  <h1>Complex walk – clipboard sheet</h1><div class="meta">${esc(addr || 'File ________  Address ______________________')}   Date __________</div>
  ${CW_SECS.filter(S => !S.finish).map(S => `<h2>${S.n ? S.n + ' ' : ''}${esc(S.t)}</h2><div class="s">${S.parts.map(part).join('')}<div class="ph">Photos # ________   Notes ____________________________________________</div></div>`).join('')}
  <h2>Finish for the report</h2><div class="s"><div class="r"><b>Quality</b>${['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map(box).join('')} ${['low', 'mid', 'high'].map(box).join('')}</div><div class="r"><b>Condition</b>${['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(box).join('')} ${['low', 'mid', 'high'].map(box).join('')}</div>
  <div class="r"><b>2.6 only</b>Total rooms ____  Basement % finished ____  ${['Infestation', 'Dampness', 'Settlement', 'None of these'].map(box).join('')}</div></div></body></html>`;
}
function cwPrint() {
  const html = cwSheetHTML(app.ins); const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank'); if (!w) { const a = document.createElement('a'); a.href = url; a.download = 'Clipboard sheet.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved the clipboard sheet – open it and print'); }
}
/* walk-only words into the Inspection Notes and the comment drafts */
function cwNotesHTML(ins) {
  const D = (ins.data || {}).cw; if (!D) return '';
  const rows = []; CW_SECS.forEach(S => { const words = S.parts.filter(p => p.cw && (D.ticks[p.cw] || []).length).map(p => `${p.t}: ${D.ticks[p.cw].join(', ')}`); const note = (D.notes[S.id] || '').trim();
    if (words.length || note) rows.push(`<tr><th>${esc(S.t)}</th><td>${esc(words.join(' · '))}${note ? `${words.length ? '<br>' : ''}<i>${esc(note)}</i>` : ''}</td></tr>`); });
  const X = D.x26 || {}; const x = [X.rooms && 'Total rooms above grade ' + X.rooms, X.bsmtPct && 'Basement ' + X.bsmtPct + '% finished', X.bsmtRooms && 'Rooms below grade: ' + X.bsmtRooms, X.infest && 'Infestation: ' + X.infest, X.damp && 'Dampness: ' + X.damp, X.settle && 'Settlement: ' + X.settle].filter(Boolean);
  if (x.length) rows.push(`<tr><th>UAD 2.6 extras</th><td>${esc(x.join(' · '))}</td></tr>`);
  return rows.length ? `<section><h2>Complex walk – words and notes</h2><table>${rows.join('')}</table></section>` : '';
}
function cwGen(ins, id) {
  const D = (ins.data || {}).cw; if (!D) return [];
  const T = k => (D.ticks[k] || []); const lc = a => a.map(s => s.toLowerCase());
  const out = [];
  if (id === 'amenities') { const g = T('gate').filter(w => !/Open/.test(w)); const door = T('door'); const gr = T('grounds');
    if (g.length) out.push(S('The property is ' + listJoin(lc(g)).replace(/^gated/, 'gated') + '', 3));
    if (door.length) out.push(S('The approach includes ' + listJoin(lc(door)), 3));
    if (gr.length) out.push(S('Also observed on the site: ' + listJoin(lc(gr)), 3)); }
  if (id === 'vehicle' && T('drive2').length) out.push(S('A second driveway is ' + listJoin(lc(T('drive2'))), 3));
  return out.filter(Boolean);
}
