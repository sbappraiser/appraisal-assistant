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
async function libAdd(files) { let added = 0, same = 0;
  for (const file of files) { if (LIB.list.some(x => x.name === file.name && x.size === file.size)) { same++; continue; }
    const id = 'lib' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    LIB.busy = 'Reading ' + file.name + '…'; libRender();
    await ODB.put('docs', { id, orderId: LIB_ORDER, name: file.name, type: 'library', size: file.size, mime: file.type, added: new Date().toISOString(), blob: file });
    let pages = []; try { if (/\.xlsx$/i.test(file.name)) { pages = await libXlsxPages(file); const rec = await ODB.get('docs', id); rec.pagesText = pages; await ODB.put('docs', rec); } else { const rec = await docPages(id); pages = (rec && rec.pagesText) || []; await ODB.put('docs', rec); } } catch (e) { console.warn('library read', e); }
    const words = pages.join(' ').match(/[A-Za-z]{3,}/g) || [];
    LIB.list.push({ id, name: file.name, kind: libKindOf(file.name), size: file.size, added: new Date().toISOString().slice(0, 10), pages: pages.length, scan: words.length < 50 * Math.max(1, pages.length) / 10 });
    await libSave(); added++; }
  LIB.busy = ''; LIB.hits = null; libRender(); if (typeof abSoon === 'function') abSoon();
  toast(`${added} added to the Library${same ? ` · ${same} already there` : ''}`, 5000); }
/* search every page of every document: all the words must be on the page */
async function libSearch(q) { LIB.q = q; const W = q.toLowerCase().split(/\s+/).filter(w => w.length > 1); if (!W.length) { LIB.hits = null; libRender(); return; }
  const hits = []; for (const d of LIB.list) { const rec = await ODB.get('docs', d.id); const P = (rec && rec.pagesText) || [];
    P.forEach((t, i) => { const low = t.toLowerCase(); if (!W.every(w => low.includes(w))) return; const at = low.indexOf(W[0]); const s = Math.max(0, at - 120);
      hits.push({ id: d.id, name: d.name, kind: d.kind, page: i + 1, snip: (s ? '…' : '') + t.slice(s, at + 260).replace(/\s+/g, ' ') + '…', score: W.reduce((n, w) => n + low.split(w).length - 1, 0) }); }); }
  hits.sort((a, b) => b.score - a.score); LIB.hits = hits.slice(0, 80); libRender(); }
async function libOpen(id, page) { const rec = await ODB.get('docs', id); if (!rec || !rec.blob) { toast('That file is not in this browser any more – add it again'); return; }
  const url = URL.createObjectURL(rec.blob); const pdf = /pdf/i.test(rec.mime || '') || /\.pdf$/i.test(rec.name);
  if (pdf) window.open(url + (page ? '#page=' + page : ''), '_blank'); else { const a = document.createElement('a'); a.href = url; a.download = rec.name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 120000); }
function libRender() { const box = $('#libBody'); if (!box) return;
  const kinds = Object.fromEntries(LIB_KINDS); const W = LIB.q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const mark = s => { let x = h(s); W.forEach(w => { x = x.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); }); return x; };
  box.innerHTML = `<label class="libdrop" id="libDrop"><input type="file" id="libFile" multiple accept=".pdf,.docx,.txt,.csv,.xlsx" hidden><b>Drop documents here, or click to choose them</b><span>PDF, Word, Excel or text – F-1, A-1, D-1, UAD 2.6 guidelines, USPAP, Selling Guide, client guidelines, community plans and zoning</span></label>
    ${LIB.busy ? `<p class="help">${h(LIB.busy)}</p>` : ''}
    ${LIB.list.length ? `<div class="row libsearch"><input id="libQ" type="search" placeholder="Search every document, e.g. view range, extraordinary assumption, ANSI" value="${h(LIB.q)}"><button type="button" class="btn primary" id="libGo">Search</button></div>` : ''}
    ${LIB.hits ? `<h3>${LIB.hits.length ? LIB.hits.length + (LIB.hits.length === 80 ? '+' : '') + ' pages found' : 'Nothing found – try fewer or other words'}</h3>${LIB.hits.map(x => `<div class="libhit"><button type="button" class="linkbtn" data-libopen="${x.id}" data-libpage="${x.page}"><b>${h(x.name)}</b> – ${/\.xlsx$/i.test(x.name) ? 'rows, part ' + x.page : 'page ' + x.page}</button> <small class="muted">${h(kinds[x.kind] || '')}</small><div>${mark(x.snip)}</div></div>`).join('')}` : ''}
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
