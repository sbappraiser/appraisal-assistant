/* =====================================================================
   My comments – her comment library (Oct 18 2026).
   Imported from her OneNote export (PDF: one page per comment, title, date line, text,
   "SECTION Page n" at the bottom; long comments run onto the next page without a title).
   Every comment carries the UAD version it was written for: the OneNote library came from her
   UAD 2.6 reports, so it imports as 2.6 (her rule – 2.6 wording may not fit 3.6).
   Kept in this browser only (kv 'cmt:lib' = {id: item}); in Back up / Restore; never sent anywhere.
   OctoSleuth reads the same list for its "My comments" picker.
   item: {id, title, section, text, ver: '2.6' | '3.6' | 'both', src, added, edited}
   ===================================================================== */
let CMT = {}; const CMT_UI = { q: '', sec: '', ver: '', edit: null, open: {}, grp: (() => { try { return localStorage.getItem('aa.cmtGrp') || ''; } catch (e) { return ''; } })() };
/* the report's sections, in the order they come in the report (her ask Oct 22 2026: small boxes by section, not alphabetical);
   each comment goes in the first group whose words match its Section name */
const CMT_GROUPS = [
  ['Assignment and scope of work', /assignment|scope of work|intended (use|user)|extraordinary|hypothetical|\bEA\b|\bHC\b|data source|confidential|engagement|prior (appraisal|service)|inspection|ansi|measure/i],
  ['Subject and transfer history', /subject prior|prior sale|transfer|listing|sales history/i],
  ['Market', /market|price trend|neighbou?rhood|boundar|search criteria/i],
  ['Site', /^site(?! value)|zoning|hazard|flood|fire|views?\b|easement|well|septic|utilit|access|lot\b|mineral|rights/i],
  ['Highest and best use', /highest and best|\bhbu\b/i],
  ['Improvements', /subject property|improvement|dwelling|quality|condition|functional|energy|green|adu|outbuilding|permit|garage|pool/i],
  ['Sales contract', /contract|concession/i],
  ['Sales comparison', /sales comp|comparable/i],
  ['Cost approach', /cost|site value|land/i],
  ['Income approach', /income|rent|grm/i],
  ['Reconciliation', /reconcil|exposure|final value/i],
  ['Certifications and conditions', /certif|limiting|condition/i]];
const cmtGroup = x => (CMT_GROUPS.find(([, r]) => r.test(x.section || '')) || ['Other'])[0];
const cmtGrpOrder = g => { const i = CMT_GROUPS.findIndex(([n]) => n === g); return i < 0 ? 99 : i; };
const CMT_VER = { '2.6': 'UAD 2.6', '3.6': 'UAD 3.6', both: '2.6 and 3.6' };
async function cmtLoad() { const r = await ODB.get('kv', 'cmt:lib'); CMT = (r && r.v) || {}; }
async function cmtSave() { await ODB.put('kv', { id: 'cmt:lib', v: CMT }); try { new BroadcastChannel('aa-cmt').postMessage(1); } catch (e) {} }   // the comment boxes (here and in OctoSleuth) read the library again
const cmtId = (sec, title, text) => { let s = 0; const t = (sec + '|' + title + '|' + String(text).slice(0, 60)).toLowerCase(); for (let i = 0; i < t.length; i++) s = (s * 31 + t.charCodeAt(i)) >>> 0; return 'c' + s.toString(36); };
const cmtDate = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/;
/* a page's text as lines (pieces on the same row joined, top to bottom), with paragraph breaks where the gap is wide */
async function cmtPdfPages(file) {
  const lib = await loadPdfJs(); const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent(); const rows = [];
    tc.items.forEach(it => { if (!it.str) return; const y = it.transform[5], x = it.transform[4], hgt = Math.abs(it.transform[3]) || 10;
      let r = rows.find(r => Math.abs(r.y - y) < hgt * 0.5); if (!r) { r = { y, h: hgt, parts: [] }; rows.push(r); } r.parts.push({ x, s: it.str, w: it.width || 0 }); });
    rows.sort((a, b) => b.y - a.y);
    const lines = rows.map(r => { r.parts.sort((a, b) => a.x - b.x); let s = '', end = null; r.parts.forEach(p => { if (end !== null && p.x - end > 1.5 && !/\s$/.test(s) && !/^\s/.test(p.s)) s += ' '; s += p.s; end = p.x + p.w; }); return { y: r.y, h: r.h, t: s.replace(/\s+/g, ' ').trim() }; }).filter(l => l.t);
    pages.push(lines);
  }
  return pages;
}
function cmtParse(pages) {   // → { items, empty: [titles], pages }
  const items = [], empty = []; let last = null, prevLast = '';
  pages.forEach(L => {
    if (!L.length) return; let foot = null; const m = L[L.length - 1].t.match(/^(.*?)\s+Page\s+\d+$/); if (m) { foot = m[1].trim(); L = L.slice(0, -1); }
    const isNew = L.length >= 2 && cmtDate.test(L[1].t);
    let body = isNew ? L.slice(2) : L;
    if (!isNew && body.length && prevLast && body[0].t === prevLast) body = body.slice(1);   // OneNote repeats the last line of a page at the top of the next one
    if (L.length) prevLast = L[L.length - 1].t;
    // paragraphs: a gap wider than 1.6 lines starts a new one
    let txt = ''; body.forEach((l, i) => { if (i) { const gap = body[i - 1].y - l.y; txt += gap > l.h * 1.9 ? '\n\n' : ' '; } txt += l.t; });
    txt = txt.replace(/[ \t]+/g, ' ').replace(/ \n/g, '\n').trim();
    if (isNew) { last = { title: L[0].t, section: foot || (last && last.section) || 'Other', text: txt }; items.push(last); }
    else if (last && txt) last.text = (last.text + (last.text ? (/[.:!?"”)]$/.test(last.text) ? '\n\n' : ' ') : '') + txt).trim();   // mid-sentence page breaks join with a space
  });
  const out = items.filter(x => { if (!x.text) { empty.push(x.section + ' – ' + x.title); return false; } return !/^HOW TO USE THIS LIBRARY$/i.test(x.title); });
  return { items: out, empty, pages: pages.length };
}
async function cmtImport(file, ver) {
  try {
    toast('Reading your comment library…', 6000);
    let r;
    if (/\.json$/i.test(file.name)) {   // a comment file (from Claude, or her own export): {app:'my-comments', items:[{title, section, text, ver}]}
      const d = JSON.parse(await file.text()); const L = Array.isArray(d) ? d : d.items; if (!Array.isArray(L)) throw new Error('That file is not a comment file.');
      r = { items: L.filter(x => x && x.text).map(x => ({ title: String(x.title || 'Untitled'), section: String(x.section || 'My comments'), text: String(x.text), ver: x.ver, limit: +x.limit || null, note: x.note || '' })), empty: [], pages: L.length };
    } else r = cmtParse(await cmtPdfPages(file));
    if (!r.items.length) throw new Error('No comments found in that file. Export the OneNote section or notebook as PDF and try again.');
    let added = 0, updated = 0, kept = 0; const now = new Date().toISOString().slice(0, 10);
    r.items.forEach(x => { const id = cmtId(x.section, x.title, x.text); const have = CMT[id];
      if (have && have.edited) { kept++; return; }
      if (have) { have.text = x.text; if (x.limit) have.limit = x.limit; if (x.note) have.note = x.note; updated++; } else { CMT[id] = { id, title: x.title, section: x.section, text: x.text, ver: x.ver || ver, src: file.name, added: now, ...(x.limit ? { limit: x.limit } : {}), ...(x.note ? { note: x.note } : {}) }; added++; } });
    await cmtSave(); cmtRender();
    $('#cmtMsg').innerHTML = `<b>${added} comments added</b>${updated ? `, ${updated} updated` : ''}${kept ? `, ${kept} you edited were kept as you have them` : ''} – from ${r.pages} ${/\.json$/i.test(file.name) ? 'comments in the file' : 'pages'}${/\.json$/i.test(file.name) ? '' : `, all marked <b>${h(CMT_VER[ver])}</b>`}.${r.empty.length ? `<br><small>${r.empty.length} pages had a title but no text yet, so they were left out: ${h(r.empty.join(' · '))}</small>` : ''}`;
  } catch (e) { console.error(e); toast(e.message || 'Could not read that PDF'); }
}
const cmtFits = x => /^[A-Z][A-Z ]+ – /.test(x.title);   // condensed versions that fit one box come first
const cmtList = () => Object.values(CMT).sort((a, b) => cmtGrpOrder(cmtGroup(a)) - cmtGrpOrder(cmtGroup(b)) || a.section.localeCompare(b.section) || cmtFits(b) - cmtFits(a) || a.title.localeCompare(b.title));
const cmtHi = s => h(s).replace(/\[([^\]]{1,80})\]/g, '<mark class="blank">[$1]</mark>').replace(/\n/g, '<br>');
function cmtMatch(x, q, sec, ver) {
  if (sec && x.section !== sec) return false; if (ver && !(x.ver === ver || x.ver === 'both')) return false;
  if (!q) return true; const t = (x.title + ' ' + x.section + ' ' + x.text).toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w));
}
function cmtRender() {
  const box = $('#cmtBody'); if (!box) return;
  const all = cmtList(); const secs = [...new Set(all.map(x => x.section))].sort();
  const M = all.filter(x => cmtMatch(x, CMT_UI.q, CMT_UI.sec, CMT_UI.ver));
  const groups = [...CMT_GROUPS.map(([n]) => n), 'Other'].map(n => [n, M.filter(x => cmtGroup(x) === n).length, all.filter(x => cmtGroup(x) === n).length]).filter(g => g[2]);
  if (CMT_UI.grp && !groups.some(g => g[0] === CMT_UI.grp)) CMT_UI.grp = '';
  const searching = !!CMT_UI.q.trim(), editingNew = CMT_UI.edit && CMT[CMT_UI.edit] && !CMT[CMT_UI.edit].text;
  const L = M.filter(x => searching || editingNew && x.id === CMT_UI.edit || (CMT_UI.grp && cmtGroup(x) === CMT_UI.grp));
  const tiles = $('#cmtTiles'); if (tiles) tiles.innerHTML = groups.map(([n, k, t]) => `<button type="button" class="cmtTile${CMT_UI.grp === n && !searching ? ' on' : ''}${searching && !k ? ' none' : ''}" data-cgrp="${h(n)}"><b>${h(n)}</b><small>${searching ? `${k} found` : `${t} comment${t === 1 ? '' : 's'}`}</small></button>`).join('');
  $('#cmtCount').textContent = all.length ? `${all.length} comments · ${secs.length} sections${L.length !== all.length ? ` · ${L.length} shown` : ''}` : 'No comments yet – import your OneNote library (PDF) or add one.';
  const sel = $('#cmtSec'); const cur = CMT_UI.sec; sel.innerHTML = `<option value="">All sections</option>${secs.map(s => `<option ${s === cur ? 'selected' : ''}>${h(s)}</option>`).join('')}`;
  let sec = '';
  if (!L.length) { box.innerHTML = all.length ? `<p class="help cmtPick">${searching ? 'Nothing found – try fewer words.' : 'Click a section above to see its comments.'}</p>` : ''; return; }
  box.innerHTML = (searching ? '' : `<h2 class="cmtGrpH">${h(CMT_UI.grp)}</h2>`) + L.map(x => {
    const head = x.section !== sec ? `<h3 class="cmtSecH">${searching ? h(cmtGroup(x)) + ' › ' : ''}${h(x.section)}${x.limit ? ` <small>· this UAD 3.6 box holds ${x.limit.toLocaleString()} characters – everything you paste into it together</small>` : ''}</h3>` : ''; sec = x.section;
    if (CMT_UI.edit === x.id) return head + `<div class="cmt editing"><div class="grid2"><label>Title<input data-ce="title" value="${h(x.title)}"></label><label>Section<input data-ce="section" value="${h(x.section)}" list="cmtSecs"></label></div>
      <label>Written for<select data-ce="ver">${Object.entries(CMT_VER).map(([k, v]) => `<option value="${k}" ${k === x.ver ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Comment<textarea data-ce="text" rows="${Math.min(18, 4 + Math.round(x.text.length / 110))}">${h(x.text)}</textarea></label>
      <div class="toolrow"><button type="button" class="btn primary small" data-cact="save" data-id="${x.id}">Save</button><button type="button" class="btn ghost small" data-cact="cancel">Cancel</button><span class="grow"></span><button type="button" class="btn ghost small danger" data-cact="del" data-id="${x.id}">${CMT_UI.del === x.id ? 'Click again to delete' : 'Delete'}</button></div></div>`;
    const long = x.text.length > 420 && !CMT_UI.open[x.id];
    return head + `<div class="cmt"><div class="cmtTop"><b>${h(x.title)}</b><span class="vtag v${x.ver.replace('.', '')}">${h(CMT_VER[x.ver] || x.ver)}</span>${x.edited ? '<span class="vtag">edited</span>' : ''}<small class="cmtLen${x.limit && x.text.length > x.limit ? ' over' : ''}">${x.text.length.toLocaleString()}${x.limit ? ' of ' + x.limit.toLocaleString() : ''} characters</small><span class="grow"></span>
      <button type="button" class="btn small" data-cact="copy" data-id="${x.id}">Copy</button><button type="button" class="btn ghost small" data-cact="edit" data-id="${x.id}">Edit</button></div>
      ${x.note ? `<div class="cmtNote">${h(x.note)}</div>` : ''}<div class="cmtText${long ? ' clip' : ''}">${cmtHi(x.text)}</div>${long ? `<button type="button" class="linkbtn" data-cact="more" data-id="${x.id}">Show all</button>` : ''}</div>`;
  }).join('') + `<datalist id="cmtSecs">${secs.map(s => `<option value="${h(s)}">`).join('')}</datalist>`;
}
async function cmtCopy(x) {
  try { await navigator.clipboard.writeText(x.text); toast(/\[[^\]]+\]/.test(x.text) ? 'Copied – fill in the [blanks] after you paste it' : 'Copied – paste it into SFREP'); }
  catch (e) { const t = document.createElement('textarea'); t.value = x.text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast('Copied'); }
}
function cmtInit() {
  const p = $('#panel-comments'); if (!p) return;
  $('#cmtQ').oninput = e => { CMT_UI.q = e.target.value; cmtRender(); };
  $('#cmtSec').onchange = e => { CMT_UI.sec = e.target.value; cmtRender(); };
  $('#cmtVer').onchange = e => { CMT_UI.ver = e.target.value; cmtRender(); };
  $('#cmtFile').onchange = e => { const f = e.target.files[0]; if (f) cmtImport(f, $('#cmtImpVer').value); e.target.value = ''; };
  $('#cmtAdd').onclick = async () => { const id = 'n' + Date.now().toString(36); CMT[id] = { id, title: 'New comment', section: CMT_UI.sec || (CMT_UI.grp && CMT_UI.grp !== 'Other' ? CMT_UI.grp : 'My comments'), text: '', ver: '3.6', src: 'typed', added: new Date().toISOString().slice(0, 10), edited: true };
    CMT_UI.edit = id; CMT_UI.q = ''; $('#cmtQ').value = ''; await cmtSave(); cmtRender(); const t = document.querySelector('[data-ce="title"]'); if (t) { t.focus(); t.select(); } };
  p.addEventListener('click', async e => {
    const g = e.target.closest('[data-cgrp]'); if (g) { CMT_UI.grp = CMT_UI.grp === g.dataset.cgrp && !CMT_UI.q ? '' : g.dataset.cgrp; CMT_UI.q = ''; $('#cmtQ').value = ''; try { localStorage.setItem('aa.cmtGrp', CMT_UI.grp); } catch (x) {} cmtRender(); return; }
    const b = e.target.closest('[data-cact]'); if (!b) return; const x = CMT[b.dataset.id]; const a = b.dataset.cact;
    if (a === 'copy' && x) cmtCopy(x);
    if (a === 'edit') { CMT_UI.edit = b.dataset.id; CMT_UI.del = null; cmtRender(); }
    if (a === 'cancel') { const y = CMT[CMT_UI.edit]; if (y && !y.text && y.title === 'New comment') { delete CMT[y.id]; await cmtSave(); } CMT_UI.edit = null; cmtRender(); }
    if (a === 'more') { CMT_UI.open[b.dataset.id] = true; cmtRender(); }
    if (a === 'save' && x) { const g = k => (document.querySelector(`[data-ce="${k}"]`) || {}).value; x.title = (g('title') || '').trim() || 'Untitled'; x.section = (g('section') || '').trim() || 'My comments'; x.ver = g('ver') || x.ver; x.text = (g('text') || '').trim(); x.edited = true;
      await cmtSave(); CMT_UI.edit = null; cmtRender(); toast('Comment saved'); }
    if (a === 'del' && x) { if (CMT_UI.del !== x.id) { CMT_UI.del = x.id; cmtRender(); setTimeout(() => { if (CMT_UI.del === x.id) { CMT_UI.del = null; cmtRender(); } }, 3000); return; }
      delete CMT[x.id]; CMT_UI.del = null; CMT_UI.edit = null; await cmtSave(); cmtRender(); toast('Comment deleted'); }
  });
  cmtLoad().then(cmtRender);
}
