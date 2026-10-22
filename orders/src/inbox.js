/* =====================================================================
   Inbox (her request, Oct 22 2026): "A mailbox for CORT. A mailbox for agent marketing. Sort the emails by property –
   they go into the folder as an attachment I can open if I need more information or the photos."
   Her Microsoft 365 saves the emails into her OneDrive (Power Automate – see Help): Inbox › CORT (the report PDFs) and
   Inbox › Agent emails (each email as an .eml file). This page, on her computer only:
   - Agent emails: reads each email, finds the property address (subject first), the price, beds, baths, sq ft and open house;
     she checks them, then "File them" moves each email into Agent emails › By property › <address> and adds it to the
     Listing emails list (searchable; Open shows the text and the photos). Show first, undo, log – her rules.
   - CORT: lists the new report PDFs (reading them here comes later; for now she sends them to Claude in the chat).
   Nothing is sent anywhere. Links in emails are never opened; pictures from the web load only when she clicks.
   ===================================================================== */
const IB = { dir: null, perm: '', mail: null, cort: null, busy: false, q: '', err: '' };
const IB_SUF = { road: 'rd', street: 'st', avenue: 'ave', drive: 'dr', lane: 'ln', boulevard: 'blvd', court: 'ct', place: 'pl', circle: 'cir', terrace: 'ter', trail: 'trl', highway: 'hwy', parkway: 'pkwy' };
const ibKey = a => String(a || '').toLowerCase().replace(/,.*$/, '').replace(/[.#]/g, ' ').replace(/\b(road|street|avenue|drive|lane|boulevard|court|place|circle|terrace|trail|highway|parkway)\b/g, m => IB_SUF[m])
  .replace(/\b(east|west|north|south)\b/g, m => m[0]).replace(/\s+/g, ' ').trim();
const IB_TYPES = 'Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Way|Boulevard|Blvd|Court|Ct|Place|Pl|Circle|Cir|Terrace|Ter|Trail|Trl|Highway|Hwy|Parkway|Pkwy|Row|Walk|Loop';
const IB_CITY = 'Montecito|Santa Barbara|Goleta|Carpinteria|Summerland|Hope Ranch|Solvang|Santa Ynez|Los Olivos|Buellton|Lompoc|Ojai|Isla Vista|Mission Canyon|Santa Maria|Ventura';
const IB_RX = [new RegExp(`\\b(\\d{1,6}[A-Za-z]?)\\s+((?:[NSEW]\\.?\\s+)?(?:[A-Za-z][A-Za-z'’.-]+\\s+){0,3}(?:${IB_TYPES}))\\b\\.?(?:,?\\s*(?:#|Unit|Apt\\.?)\\s*[\\w-]+)?(?:,?\\s+(${IB_CITY}))?`, 'gi'),
  new RegExp(`\\b(\\d{1,6})\\s+((?:Via|Camino|Calle|Paseo|Avenida|Vista|Rancho|Cima|Las|Los|La|El)\\s+(?:[A-Z][A-Za-z'’.-]+\\s?){1,3})(?:,?\\s+(${IB_CITY}))?`, 'g')];
const ibTidy = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/\b([a-z])/gi, (m, c, o, str) => (o === 0 || str[o - 1] === ' ') ? c.toUpperCase() : c).replace(/\b(Rd|St|Ave|Dr|Ln|Blvd|Ct|Pl|Cir|Ter|Hwy|Pkwy)\b\.?/gi, m => m.replace('.', '').charAt(0).toUpperCase() + m.replace('.', '').slice(1).toLowerCase());
function ibFind(subject, text, ignore) {   // every address in the email, best first
  const C = new Map(); const add = (m, w, near) => { const street = ibTidy(m[1] + ' ' + m[2]); const city = m[3] ? ibTidy(m[3]) : ''; const k = ibKey(street); if (!k || /^\d+\s*$/.test(k)) return;
    const c = C.get(k) || { street, city: '', score: 0 }; c.score += w + (near ? -6 : 0); if (city && !c.city) c.city = city; C.set(k, c); };
  for (const rx of IB_RX) { rx.lastIndex = 0; let m; while ((m = rx.exec(subject || ''))) add(m, 10); }
  const T = String(text || ''); for (const rx of IB_RX) { rx.lastIndex = 0; let m; while ((m = rx.exec(T))) { const around = T.slice(Math.max(0, m.index - 120), m.index + m[0].length + 60); add(m, 1, /\b(DRE|Lic\.?|License|Office|Suite|Ste\.?|Brokerage|Inc\.|Unsubscribe|copyright|©)\b/i.test(around)); } }
  return [...C.entries()].filter(([k]) => !(ignore || []).includes(k)).map(([k, c]) => ({ key: k, addr: c.street + (c.city ? ', ' + c.city : ''), score: c.score })).sort((a, b) => b.score - a.score); }
function ibFacts(text) { const T = String(text || ''); const g = rx => (T.match(rx) || [])[1] || '';
  const price = (T.match(/\$\s?\d{1,3}(?:,\d{3}){1,3}(?:\.\d\d)?|\$\s?\d+(?:\.\d+)?\s?(?:M|Million)\b/i) || [''])[0].replace(/\s/g, '');
  return { price, beds: g(/\b(\d{1,2})\s*(?:bed(?:room)?s?|BR|BD)\b/i), baths: g(/\b(\d{1,2}(?:\.\d)?)\s*(?:bath(?:room)?s?|BA)\b/i), sqft: g(/\b(\d{1,2},?\d{3})\s*(?:sq\.?\s?ft\.?|square feet|SF)\b/i).replace(',', ''),
    open: (T.match(/open house[^\n.]{0,90}/i) || [''])[0].trim() }; }

async function ibGetDir() { if (IB.dir) return IB.dir; const r = await ODB.get('kv', 'inbox:dir'); IB.dir = (r && r.v) || null; return IB.dir; }
async function ibPermission(ask) { const d = await ibGetDir(); if (!d) { IB.perm = 'none'; return false; }
  let p = await d.queryPermission({ mode: 'readwrite' }); if (p !== 'granted' && ask) p = await d.requestPermission({ mode: 'readwrite' }); IB.perm = p; return p === 'granted'; }
async function ibSub(d, path, create) { let x = d; for (const n of path) x = await x.getDirectoryHandle(n, { create: !!create }); return x; }
async function ibPick() {
  if (typeof window.showDirectoryPicker !== 'function') { toast('Use Chrome on your computer for the Inbox'); return; }
  let d; try { d = await window.showDirectoryPicker({ id: 'aa-inbox', mode: 'readwrite', startIn: 'documents' }); } catch (e) { return; }
  await ODB.put('kv', { id: 'inbox:dir', v: d }); IB.dir = d; await ibSub(d, ['CORT'], true); await ibSub(d, ['Agent emails', 'By property'], true); await ibSub(d, ['Agent emails', 'Not filed'], true);
  IB.perm = 'granted'; toast('The Inbox folder is set: ' + d.name + ' (with CORT and Agent emails inside)', 6000); ibCheck(); }
async function ibSeen() { const r = await ODB.get('kv', 'inbox:seen'); return new Set((r && r.v) || []); }
async function ibSeenAdd(keys) { const S = await ibSeen(); keys.forEach(k => S.add(k)); await ODB.put('kv', { id: 'inbox:seen', v: [...S].slice(-5000) }); }
async function ibIndex() { const r = await ODB.get('kv', 'listingEmails'); return (r && r.v) || []; }
async function ibLog(what) { const r = await ODB.get('kv', 'inbox:log'); const L = (r && r.v) || []; L.push({ at: new Date().toISOString(), ...what }); await ODB.put('kv', { id: 'inbox:log', v: L.slice(-500) }); }

async function ibCheck() {   // look in the folder: new agent emails (read here) and new CORT reports
  if (IB.busy) return; IB.busy = true; IB.err = ''; ibRender();
  try { if (!(await ibPermission(false))) { IB.busy = false; ibRender(); return; }
    const d = await ibGetDir(); const seen = await ibSeen(); const ign = ((await ODB.get('kv', 'inbox:ignoreAddr')) || {}).v || [];
    const cortDir = await ibSub(d, ['CORT'], true); IB.cort = [];
    for await (const [name, h] of cortDir.entries()) { if (h.kind !== 'file' || !/\.pdf$/i.test(name)) continue; const f = await h.getFile(); const k = 'cort|' + name + '|' + f.size; if (!seen.has(k)) IB.cort.push({ name, size: f.size, key: k, date: f.lastModified }); }
    const mailDir = await ibSub(d, ['Agent emails'], true); IB.mail = [];
    for await (const [name, h] of mailDir.entries()) { if (h.kind !== 'file' || !/\.(eml|msg)$/i.test(name)) continue;
      const f = await h.getFile(); let E = null; try { E = await readEmail(f); } catch (e) { IB.mail.push({ name, err: 'could not be read', addrs: [], facts: {} }); continue; }
      const text = E.text || (E.html ? htmlText(E.html) : ''); const addrs = ibFind(E.subject, text, ign);
      IB.mail.push({ name, size: f.size, subject: E.subject || '', from: E.from || '', date: E.date && !isNaN(E.date) ? E.date.toISOString() : new Date(f.lastModified).toISOString(), addrs, pick: addrs[0] && addrs[0].score > 0 ? addrs[0].addr : '', facts: ibFacts(text), pics: (E.files || []).filter(x => /^image\//.test(x.type)).length, on: !!(addrs[0] && addrs[0].score > 0) }); }   /* an address only in an office footer is not picked */
    IB.mail.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  } catch (e) { console.error(e); IB.err = String(e.message || e); }
  IB.busy = false; ibRender(); }

const ibFolderName = a => String(a || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Unknown address';
async function ibFile(rows) {   // move each ticked email into By property/<address>; add it to the list; keep a log to undo
  const d = await ibGetDir(); const src = await ibSub(d, ['Agent emails']); const idx = await ibIndex(); const moved = [];
  for (const r of rows) { try {
      const h = await src.getFileHandle(r.name); const f = await h.getFile(); const folder = r.skip ? null : ibFolderName(r.pick);
      const dest = r.skip ? await ibSub(d, ['Agent emails', 'Not filed'], true) : await ibSub(d, ['Agent emails', 'By property', folder], true);
      const nm = ibFolderName((r.date || '').slice(0, 10) + ' ' + (r.subject || r.name.replace(/\.(eml|msg)$/i, ''))).slice(0, 90) + (r.name.match(/\.(eml|msg)$/i) || ['.eml'])[0].toLowerCase();
      const out = await dest.getFileHandle(nm, { create: true }); const w = await out.createWritable(); await w.write(f); await w.close();
      await src.removeEntry(r.name);
      if (!r.skip) idx.push({ id: uid(), key: ibKey(r.pick), addr: r.pick, date: r.date, subject: r.subject, from: r.from, ...r.facts, pics: r.pics, folder, file: nm, at: new Date().toISOString() });
      moved.push({ from: r.name, folder: r.skip ? 'Not filed' : folder, file: nm, skip: !!r.skip });
    } catch (e) { console.error(e); toast('Could not file ' + r.name + ': ' + (e.message || e), 7000); } }
  await ODB.put('kv', { id: 'listingEmails', v: idx }); await ibLog({ act: 'filed', moved });
  IB.lastMove = moved; toast(`Filed ${moved.filter(m => !m.skip).length} email${moved.length === 1 ? '' : 's'} by property${moved.some(m => m.skip) ? `, ${moved.filter(m => m.skip).length} in Not filed` : ''}`, 6000); ibCheck(); }
async function ibUndo() { const M = IB.lastMove; if (!M || !M.length) return; const d = await ibGetDir(); const src = await ibSub(d, ['Agent emails']); let idx = await ibIndex();
  for (const m of M) { try { const dir = m.skip ? await ibSub(d, ['Agent emails', 'Not filed']) : await ibSub(d, ['Agent emails', 'By property', m.folder]); const f = await (await dir.getFileHandle(m.file)).getFile();
      const out = await src.getFileHandle(m.from, { create: true }); const w = await out.createWritable(); await w.write(f); await w.close(); await dir.removeEntry(m.file); idx = idx.filter(x => !(x.folder === m.folder && x.file === m.file)); } catch (e) { console.warn(e); } }
  await ODB.put('kv', { id: 'listingEmails', v: idx }); await ibLog({ act: 'undo', moved: M }); IB.lastMove = null; toast('Put back in Agent emails'); ibCheck(); }

async function ibOpen(id) {   // the saved email: its words, its attached photos; pictures from the web only on her click
  const x = (await ibIndex()).find(r => r.id === id); if (!x) return; if (!(await ibPermission(true))) { toast('Allow the Inbox folder first'); return; }
  const d = await ibGetDir(); let f; try { f = await (await (await ibSub(d, ['Agent emails', 'By property', x.folder])).getFileHandle(x.file)).getFile(); } catch (e) { toast('That email is no longer in its folder (' + x.folder + ')'); return; }
  const E = await readEmail(f); const imgs = (E.files || []).filter(z => /^image\//.test(z.type)).map(z => URL.createObjectURL(z));
  const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups for this page to open the email'); return; }
  const html = E.html || ''; const csp = on => `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob: ${on ? 'https: http:' : ''}">`;
  const frame = on => `<iframe sandbox="" referrerpolicy="no-referrer" style="width:100%;height:70vh;border:1px solid #ccc;border-radius:8px" srcdoc="${hesc(csp(on) + html)}"></iframe>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${hesc(E.subject || x.file)}</title><style>body{font:15px/1.5 Arial,sans-serif;max-width:980px;margin:20px auto;padding:0 16px}th{text-align:left;color:#555;padding-right:12px}img.ph{max-width:300px;max-height:220px;margin:4px;border-radius:6px}button{font:inherit;padding:6px 12px;margin:6px 0;cursor:pointer}</style></head><body>
    <table><tr><th>Property</th><td><b>${hesc(x.addr)}</b></td></tr><tr><th>From</th><td>${hesc(E.from || '')}</td></tr><tr><th>Date</th><td>${hesc(E.date && !isNaN(E.date) ? E.date.toLocaleString() : '')}</td></tr><tr><th>Subject</th><td>${hesc(E.subject || '')}</td></tr><tr><th>Saved in</th><td>OneDrive › Inbox › Agent emails › By property › ${hesc(x.folder)} › ${hesc(x.file)} <small>(double-click it there to open it in Outlook)</small></td></tr></table>
    ${imgs.length ? `<p><b>Attached photos (${imgs.length})</b><br>${imgs.map(u => `<a href="${u}" target="_blank"><img class="ph" src="${u}"></a>`).join('')}</p>` : ''}
    ${html ? `<p><b>The email</b> – pictures from the web are off (the sender can tell when they load). <button id="pics">Show the pictures from the web</button></p><div id="fr">${frame(false)}</div>` : `<pre style="white-space:pre-wrap">${hesc(E.text || '')}</pre>`}
    </body></html>`); w.document.close();
  const b = w.document.getElementById('pics'); if (b) b.onclick = () => { w.document.getElementById('fr').innerHTML = frame(true); b.remove(); };
}

async function ibRender() {
  const box = $('#inboxCard'); if (!box) return; const d = await ibGetDir();
  if (!d) { box.innerHTML = `<div class="card ibcard"><h3>Inbox <small class="muted">CORT reports and agent emails from your Microsoft 365</small></h3><p class="help">Pick your OneDrive <b>Appraisal Assistant › Inbox</b> folder once (Help › Inbox has the Microsoft 365 steps). The Octopus makes <b>CORT</b> and <b>Agent emails</b> folders inside it.</p><button type="button" class="btn small primary" id="ibPick">Pick the Inbox folder</button></div>`; $('#ibPick').onclick = ibPick; return; }
  if (IB.perm !== 'granted') await ibPermission(false);
  const idx = await ibIndex(); const q = IB.q.trim(); const hits = q ? idx.filter(x => (x.addr + ' ' + x.subject).toLowerCase().includes(q.toLowerCase()) || ibKey(x.addr).includes(ibKey(q))).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 40) : [];
  const M = IB.mail || [], C = IB.cort || [];
  box.innerHTML = `<div class="card ibcard"><h3>Inbox <small class="muted">${hesc(d.name)} · ${idx.length} agent email${idx.length === 1 ? '' : 's'} filed by property</small></h3>
    ${IB.perm !== 'granted' ? `<p><button type="button" class="btn small primary" id="ibAllow">Allow the Inbox folder</button> <span class="help">Chrome asks once each time you open the hub.</span></p>` : `<div class="row"><button type="button" class="btn small" id="ibCheck">${IB.busy ? 'Looking…' : 'Check the Inbox now'}</button>${IB.lastMove ? '<button type="button" class="btn ghost small" id="ibUndo">Undo the last filing</button>' : ''}<button type="button" class="btn ghost small" id="ibRepick">Change the folder</button></div>`}
    ${IB.err ? `<p class="help warnTxt">${hesc(IB.err)}</p>` : ''}
    ${C.length ? `<p><b>${C.length} new CORT report${C.length === 1 ? '' : 's'}:</b> ${C.map(c => hesc(c.name)).join(', ')}. <span class="help">Send ${C.length === 1 ? 'it' : 'them'} to Claude in the chat to add to your CORT table (reading them here comes next).</span> <button type="button" class="btn ghost small" id="ibCortDone">Mark as added</button></p>` : IB.cort ? '<p class="help">No new CORT reports.</p>' : ''}
    ${M.length ? `<h4>${M.length} new agent email${M.length === 1 ? '' : 's'} – check the address, then File them</h4><div class="tableWrap"><table class="facts ibt"><tr><th></th><th>Date · from · subject</th><th>Property</th><th>Price · beds/baths · sq ft</th></tr>
      ${M.map((m, i) => `<tr><td><input type="checkbox" data-ibon="${i}" ${m.on ? 'checked' : ''} aria-label="File this one"></td><td><small>${hesc((m.date || '').slice(0, 10))} · ${hesc(m.from || '')}</small><br>${hesc(m.subject || m.name)}${m.pics ? ` <small>· ${m.pics} photo${m.pics === 1 ? '' : 's'}</small>` : ''}${m.err ? ' <span class="warnTxt">' + hesc(m.err) + '</span>' : ''}</td>
        <td><input data-ibaddr="${i}" list="ibAddrs${i}" value="${hesc(m.pick || '')}" placeholder="type the address" style="min-width:240px"><datalist id="ibAddrs${i}">${(m.addrs || []).map(a => `<option value="${hesc(a.addr)}">`).join('')}</datalist>${(m.addrs || []).length > (m.pick ? 1 : 0) ? `<br><small class="muted">also found: ${m.addrs.slice(m.pick ? 1 : 0, 4).map(a => hesc(a.addr)).join('; ')}</small>` : ''}<br><button type="button" class="lnk" data-ibskip="${i}">not a listing → Not filed</button> · <button type="button" class="lnk" data-ibign="${i}">ignore this address (an office)</button></td>
        <td><small>${hesc([m.facts.price, [m.facts.beds && m.facts.beds + ' bd', m.facts.baths && m.facts.baths + ' ba'].filter(Boolean).join('/'), m.facts.sqft && Number(m.facts.sqft).toLocaleString() + ' sf'].filter(Boolean).join(' · '))}${m.facts.open ? '<br>' + hesc(m.facts.open) : ''}</small></td></tr>`).join('')}</table></div>
      <div class="row"><button type="button" class="btn small primary" id="ibFile">File the ticked emails by property</button><span class="help">Each moves into Agent emails › By property › its address folder. Undo puts them back.</span></div>` : IB.mail ? '<p class="help">No new agent emails.</p>' : ''}
    <label>Find agent emails for an address <input id="ibQ" type="search" value="${hesc(IB.q)}" placeholder="for example 835 Cheltenham"></label>
    ${q ? (hits.length ? `<table class="facts ibt">${hits.map(x => `<tr><td><b>${hesc(x.addr)}</b><br><small>${hesc((x.date || '').slice(0, 10))} · ${hesc(x.from || '')}</small></td><td>${hesc(x.subject || '')}<br><small>${hesc([x.price, x.beds && x.beds + ' bd', x.baths && x.baths + ' ba', x.sqft && x.sqft + ' sf'].filter(Boolean).join(' · '))}</small></td><td><button type="button" class="btn small" data-ibopen="${x.id}">Open</button></td></tr>`).join('')}</table>` : '<p class="help">No agent emails for that address yet.</p>') : ''}
  </div>`;
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  on('ibAllow', async () => { if (await ibPermission(true)) ibCheck(); else ibRender(); }); on('ibCheck', () => ibCheck()); on('ibRepick', () => ibPick()); on('ibUndo', () => ibUndo());
  on('ibCortDone', async () => { await ibSeenAdd(C.map(c => c.key)); await ibLog({ act: 'cort marked added', files: C.map(c => c.name) }); IB.cort = []; ibRender(); });
  box.querySelectorAll('[data-ibon]').forEach(c => c.onchange = () => { M[+c.dataset.ibon].on = c.checked; });
  box.querySelectorAll('[data-ibaddr]').forEach(c => c.onchange = () => { const m = M[+c.dataset.ibaddr]; m.pick = c.value.trim(); m.on = !!m.pick; ibRender(); });
  box.querySelectorAll('[data-ibskip]').forEach(b => b.onclick = async () => { const m = M[+b.dataset.ibskip]; if (!confirm('Move “' + (m.subject || m.name) + '” to Agent emails › Not filed?')) return; await ibFile([{ ...m, skip: true }]); });
  box.querySelectorAll('[data-ibign]').forEach(b => b.onclick = async () => { const m = M[+b.dataset.ibign]; const a = m.addrs && m.addrs[0]; if (!a) return; if (!confirm(`Never pick “${a.addr}” as a property again (an office or brokerage address)?`)) return;
    const r = await ODB.get('kv', 'inbox:ignoreAddr'); const L = (r && r.v) || []; L.push(a.key); await ODB.put('kv', { id: 'inbox:ignoreAddr', v: L }); ibCheck(); });
  on('ibFile', async () => { const rows = M.filter(m => m.on && m.pick && !m.err); if (!rows.length) { toast('Tick the emails to file (each needs an address)'); return; }
    if (!confirm(`File ${rows.length} email${rows.length === 1 ? '' : 's'} by property?\n\n` + rows.slice(0, 12).map(r => '• ' + r.pick + ' – ' + (r.subject || r.name).slice(0, 60)).join('\n') + (rows.length > 12 ? '\n…' : ''))) return; await ibFile(rows); });
  const qi = $('#ibQ'); if (qi) qi.oninput = () => { IB.q = qi.value; clearTimeout(IB.qt); IB.qt = setTimeout(() => { const pos = qi.selectionStart; ibRender().then(() => { const n = $('#ibQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); }, 250); };
  box.querySelectorAll('[data-ibopen]').forEach(b => b.onclick = () => ibOpen(b.dataset.ibopen));
}
