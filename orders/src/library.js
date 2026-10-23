/* =====================================================================
   The Library (the head of the octopus, her ask Oct 22 2026): her reference documents in one place – Fannie Mae F-1, A-1, D-1, UAD
   FAQs, UAD 2.6 guidelines, the Selling Guide, USPAP (her own purchased copy) with its FAQs and Advisory Opinions, client guidelines.
   - Drop files on the page (or Choose files). Each one is kept on this computer only, in the same storage as the order documents
     (orderId '__library__'), so the automatic backup copies it once into "Appraisal Assistant documents".
   - The text of each page is read once and searched across every document; a hit opens the PDF at that page.
   - Nothing is changed in a document and nothing is sent anywhere.
   ===================================================================== */
const LIB_ORDER = '__library__';
const LIB_KINDS = [['f1', 'Fannie Mae F-1 – URAR reference guide'], ['a1', 'Fannie Mae A-1 – UAD 3.6 fields and choices'], ['d1', 'Fannie Mae D-1 – sample reports'], ['faq', 'UAD 3.6 FAQs and announcements'],
  ['uad26', 'UAD 2.6 guidelines'], ['sg', 'Fannie Mae Selling Guide'], ['uspap', 'USPAP'], ['ao', 'USPAP FAQs and Advisory Opinions'], ['client', 'Client guidelines'], ['local', 'Community plans and zoning (county / city)'], ['other', 'Other']];
const libKindOf = n => { n = String(n || '').toLowerCase();
  return /\bf-?1\b|urar.*(reference|guide)/.test(n) ? 'f1' : /\ba-?1\b|delivery spec|appendix a/.test(n) ? 'a1' : /\bd-?1\b|sample/.test(n) ? 'd1' : /faq|announcement/.test(n) && /uad/.test(n) ? 'faq'
    : /2\.6|uad[-_ ]?26|appendix d/.test(n) ? 'uad26' : /selling guide|\bb4-/.test(n) ? 'sg' : /advisory|\bao-?\d/.test(n) ? 'ao' : /uspap/.test(n) ? 'uspap' : /guideline|requirement|lender|amc/.test(n) ? 'client' : /plan\b|zoning|ordinance|overlay|land use|municipal code|county code|\bcode\b|design guidelines|specific plan|general plan|coastal/.test(n) ? 'local' : 'other'; };
const LIB = { list: [], q: '', hits: null, busy: '' };
async function libLoad() { const r = await ODB.get('kv', 'lib:index'); LIB.list = (r && r.v) || []; }
async function libSave() { await ODB.put('kv', { id: 'lib:index', v: LIB.list }); }
/* a spreadsheet as text: one "page" per 60 rows of each sheet, cells joined with " | " */
async function libXlsxPages(file) { const z = await G.readZip(file); const dec = new TextDecoder(); const X = n => z.has(n) ? new DOMParser().parseFromString(dec.decode(z.get(n)), 'application/xml') : null;
  const ss = []; const sst = X('xl/sharedStrings.xml'); if (sst) [...sst.getElementsByTagName('si')].forEach(si => ss.push([...si.getElementsByTagName('t')].map(t => t.textContent).join('')));
  const pages = []; const names = [...z.keys()].filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  for (const n of names) { const d = X(n); const rows = [...d.getElementsByTagName('row')].map(r => [...r.getElementsByTagName('c')].map(c => { const v = c.getElementsByTagName('v')[0], is = c.getElementsByTagName('is')[0];
      return c.getAttribute('t') === 's' && v ? ss[+v.textContent] : is ? is.textContent : v ? v.textContent : ''; }).filter(x => String(x).trim()).join(' | ')).filter(Boolean);
    for (let i = 0; i < rows.length; i += 60) pages.push(rows.slice(i, i + 60).join('\n')); }
  return pages; }
/* zips (her Oct 22 2026: Fannie's D-1 comes as a zip of zips): every PDF, XML, Word, Excel or text file inside is added on its own, named after the zip it came from */
const LIB_OK = /\.(pdf|docx|xlsx|txt|csv|xml)$/i;
async function libExpand(files) { const out = [];
  const walk = async (blob, prefix, hint, depth) => { const z = await G.readZip(blob);
    for (const [name, bytes] of z) { if (/(^|\/)__MACOSX\/|\/$/.test(name)) continue; const base = name.split('/').pop(); if (!base || base.startsWith('.')) continue;
      if (/\.zip$/i.test(base) && depth < 3) { await walk(new Blob([bytes]), base.replace(/\.zip$/i, '').replace(/^Appendix D-1\s*/i, 'D-1 ') + ' – ', hint, depth + 1); continue; }
      if (!LIB_OK.test(base)) continue; const f = new File([bytes], prefix + base, { type: /\.pdf$/i.test(base) ? 'application/pdf' : /\.xml$/i.test(base) ? 'text/xml' : '' }); f.kindHint = hint; out.push(f); } };
  for (const f of files) { if (/\.zip$/i.test(f.name)) { LIB.busy = 'Opening ' + f.name + '…'; libRender(); try { await walk(f, '', libKindOf(f.name), 0); } catch (e) { toast('Could not open ' + f.name + ': ' + (e.message || e), 6000); } } else out.push(f); }
  return out; }
async function libAdd(files0) { let added = 0, same = 0; const files = await libExpand(files0);
  for (const file of files) { if (LIB.list.some(x => x.name === file.name && x.size === file.size)) { same++; continue; }
    const id = 'lib' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    LIB.busy = 'Reading ' + file.name + '…'; libRender();
    await ODB.put('docs', { id, orderId: LIB_ORDER, name: file.name, type: 'library', size: file.size, mime: file.type, added: new Date().toISOString(), blob: file });
    let pages = []; try { if (/\.xml$/i.test(file.name)) { const lines = (await file.text()).split(/\n/); for (let i = 0; i < lines.length; i += 250) pages.push(lines.slice(i, i + 250).join('\n')); const rec = await ODB.get('docs', id); rec.pagesText = pages; await ODB.put('docs', rec); }
      else if (/\.xlsx$/i.test(file.name)) { pages = await libXlsxPages(file); const rec = await ODB.get('docs', id); rec.pagesText = pages; await ODB.put('docs', rec); } else { const rec = await docPages(id); pages = (rec && rec.pagesText) || []; await ODB.put('docs', rec); } } catch (e) { console.warn('library read', e); }
    const words = pages.join(' ').match(/[A-Za-z]{3,}/g) || [];
    LIB.list.push({ id, name: file.name, kind: file.kindHint && file.kindHint !== 'other' ? file.kindHint : libKindOf(file.name), size: file.size, added: new Date().toISOString().slice(0, 10), pages: pages.length, scan: words.length < 50 * Math.max(1, pages.length) / 10 });
    await libSave(); added++; }
  LIB.busy = ''; LIB.hits = null; libRender(); if (typeof abSoon === 'function') abSoon();
  toast(`${added} added to the Library${same ? ` · ${same} already there` : ''}`, 5000); }
/* search every page of every document: all the words must be on the page */
async function libSearch(q, kind) { LIB.q = q; LIB.kind = kind || ''; const W = q.toLowerCase().split(/\s+/).filter(w => w.length > 1); if (!W.length) { LIB.hits = null; libRender(); return; }
  const hits = []; for (const d of LIB.list.filter(x => !LIB.kind || x.kind === LIB.kind)) { const rec = await ODB.get('docs', d.id); const P = (rec && rec.pagesText) || [];
    const fid = /^\d{1,2}\.\d{2,3}(\.\d+)?$/.test(q.trim()) ? q.trim().replace(/\./g, '\\.\\s?') : null;   // PDF text sometimes reads 27.005 as "27. 005"   // a F-1 field number: the exact number, its definition row first
    if (fid) { const any = new RegExp('(^|[^\\d.])' + fid + '(?![\\d])'), row = new RegExp('(^|\\n)\\s*' + fid + '\\s+[A-Z][^\\n]{0,160}?(required|Required|Displays|displays|Optional|optional|N/A)');   // the field's own row in F-1's tables: number, label, when to include
      P.forEach((t, i) => { const m = any.exec(t); if (!m) return; const at = m.index; const s0 = Math.max(0, at - 60);
        hits.push({ id: d.id, name: d.name, kind: d.kind, page: i + 1, snip: (s0 ? '…' : '') + t.slice(s0, at + 320).replace(/\s+/g, ' ') + '…', score: row.test(t) ? 100 : 1 }); }); continue; }
    P.forEach((t, i) => { const low = t.toLowerCase(); if (!W.every(w => low.includes(w))) return; const at = low.indexOf(W[0]); const s = Math.max(0, at - 120);
      hits.push({ id: d.id, name: d.name, kind: d.kind, page: i + 1, snip: (s ? '…' : '') + t.slice(s, at + 260).replace(/\s+/g, ' ') + '…', score: W.reduce((n, w) => n + low.split(w).length - 1, 0) }); }); }
  hits.sort((a, b) => b.score - a.score); LIB.hits = hits.slice(0, 80); libRender(); }
async function libOpen(id, page) { const rec = await ODB.get('docs', id); if (!rec || !rec.blob) { toast('That file is not in this browser any more – add it again'); return; }
  const url = URL.createObjectURL(rec.blob); const pdf = /pdf|xml/i.test(rec.mime || '') || /\.(pdf|xml)$/i.test(rec.name);
  if (pdf) window.open(url + (page ? '#page=' + page : ''), '_blank'); else { const a = document.createElement('a'); a.href = url; a.download = rec.name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 120000); }
function libRender() { const box = $('#libBody'); if (!box) return;
  const kinds = Object.fromEntries(LIB_KINDS); const W = LIB.q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const mark = s => { let x = h(s); W.forEach(w => { x = x.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); }); return x; };
  box.innerHTML = `<label class="libdrop" id="libDrop"><input type="file" id="libFile" multiple accept=".pdf,.docx,.txt,.csv,.xlsx,.xml,.zip" hidden><b>Drop documents here, or click to choose them</b><span>PDF, Word, Excel, XML, text or a zip of them – F-1, A-1, D-1, UAD 2.6 guidelines, USPAP, Selling Guide, client guidelines, community plans and zoning</span></label>
    ${LIB.busy ? `<p class="help">${h(LIB.busy)}</p>` : ''}
    ${LIB.list.length ? `<div class="row libsearch"><input id="libQ" type="search" placeholder="Search every document, e.g. view range, extraordinary assumption, ANSI" value="${h(LIB.q)}"><button type="button" class="btn primary" id="libGo">Search</button></div>` : ''}
    ${LIB.hits ? `<h3>${LIB.hits.length ? LIB.hits.length + (LIB.hits.length === 80 ? '+' : '') + ' pages found' : LIB.kind && !LIB.list.some(x => x.kind === LIB.kind) ? `Your ${h((LIB_KINDS.find(k => k[0] === LIB.kind) || [, ''])[1])} is not in the Library yet – drop it in the box above` : 'Nothing found – try fewer or other words'}${LIB.kind ? ` <small>only in your ${h((LIB_KINDS.find(k => k[0] === LIB.kind) || [, ''])[1])} · <button type="button" class="linkbtn" id="libAll">search every document</button></small>` : ''}</h3>${LIB.hits.map(x => `<div class="libhit"><button type="button" class="linkbtn" data-libopen="${x.id}" data-libpage="${x.page}"><b>${h(x.name)}</b> – ${/\.xlsx$/i.test(x.name) ? 'rows, part ' + x.page : 'page ' + x.page}</button> <small class="muted">${h(kinds[x.kind] || '')}</small><div>${mark(x.snip)}</div></div>`).join('')}` : ''}
    <h3>Your documents (${LIB.list.length})</h3>
    ${LIB.list.length ? `<table class="facts libtab"><tr><th>Document</th><th>What it is</th><th>Pages</th><th>Added</th><th></th></tr>${LIB.list.slice().sort((a, b) => LIB_KINDS.findIndex(k => k[0] === a.kind) - LIB_KINDS.findIndex(k => k[0] === b.kind) || a.name.localeCompare(b.name)).map(d => `<tr>
      <td><button type="button" class="linkbtn" data-libopen="${d.id}">${h(d.name)}</button>${d.scan ? '<br><small class="warnTxt">A scan with little or no text – search cannot read it. In Acrobat: Scan &amp; OCR › Recognize text, then add it again.</small>' : ''}</td>
      <td><select data-libkind="${d.id}">${LIB_KINDS.map(([k, l]) => `<option value="${k}"${d.kind === k ? ' selected' : ''}>${h(l)}</option>`).join('')}</select></td><td>${d.pages || '–'}</td><td>${h(d.added || '')}</td>
      <td><button type="button" class="btn ghost small" data-libdel="${d.id}">${LIB.del === d.id ? 'Click again to remove' : 'Remove'}</button></td></tr>`).join('')}</table>`
      : '<p class="help">Nothing here yet. Drop your F-1 PDF, the A-1 spreadsheet, the UAD 2.6 guidelines, your USPAP and any client guidelines in the box above.</p>'}
    <p class="help">Kept on this computer only and backed up with your documents in your data folder. USPAP is copyrighted by The Appraisal Foundation – use your own purchased copy; it stays here and is never sent anywhere.</p>`;
  const f = $('#libFile'); if (f) f.onchange = () => { if (f.files.length) libAdd([...f.files]); f.value = ''; };
  const q = $('#libQ'); if (q) q.onkeydown = e => { if (e.key === 'Enter') libSearch(q.value); };
  const g = $('#libGo'); if (g) g.onclick = () => libSearch($('#libQ').value);
  const al = $('#libAll'); if (al) al.onclick = () => libSearch(LIB.q, '');
  if (q) q.onkeydown = e => { if (e.key === 'Enter') libSearch(q.value, LIB.kind); }; if (g) g.onclick = () => libSearch($('#libQ').value, LIB.kind);
}
document.addEventListener('click', async e => { if (!e.target.closest) return;
  const o = e.target.closest('[data-libopen]'); if (o) { libOpen(o.dataset.libopen, +o.dataset.libpage || 0); return; }
  const d = e.target.closest('[data-libdel]'); if (d) { const id = d.dataset.libdel; if (LIB.del !== id) { LIB.del = id; libRender(); setTimeout(() => { if (LIB.del === id) { LIB.del = null; libRender(); } }, 3000); return; }
    LIB.del = null; LIB.list = LIB.list.filter(x => x.id !== id); await libSave(); await ODB.del('docs', id).catch(() => {}); LIB.hits = null; libRender(); toast('Removed from the Library'); } });
document.addEventListener('change', async e => { const s = e.target.closest && e.target.closest('[data-libkind]'); if (!s) return; const d = LIB.list.find(x => x.id === s.dataset.libkind); if (d) { d.kind = s.value; await libSave(); toast('Saved'); } });
/* drag and drop anywhere on the Library page */
document.addEventListener('dragover', e => { if (!$('#panel-library') || $('#panel-library').hidden) return; e.preventDefault(); const z = $('#libDrop'); if (z) z.classList.add('over'); });
document.addEventListener('dragleave', e => { const z = $('#libDrop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
document.addEventListener('drop', e => { if (!$('#panel-library') || $('#panel-library').hidden) return; e.preventDefault(); const z = $('#libDrop'); if (z) z.classList.remove('over'); const F = [...(e.dataTransfer.files || [])]; if (F.length) libAdd(F); });
/* read the list when the Library is opened (the storage is ready by then) */
(() => { const st = showTab; showTab = function (t) { const r = st.apply(this, arguments); if (t === 'library') libLoad().then(libRender).catch(e => console.warn('library', e)); return r; }; })();

/* "ⓘ" in OctoSleuth (or any page): open the Library at a F-1 field number (her ask Oct 22 2026) */
async function libLookup(q, kind) { showTab('library'); if (typeof octoMark === 'function') octoMark(); await libLoad(); await libSearch(String(q || ''), kind || '');
  const t = document.querySelector('#libBody h3'); if (t) t.scrollIntoView({ block: 'start' }); }
window.addEventListener('message', e => { if (e.origin !== location.origin || !e.data || e.data.type !== 'aa-lib') return; libLookup(e.data.q, e.data.kind); });
{ const P = new URLSearchParams(location.search); if (P.get('tab') === 'library' && P.get('q')) setTimeout(() => libLookup(P.get('q'), P.get('kind') || ''), 900); }
