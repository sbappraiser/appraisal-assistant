/* =====================================================================
   Emails into the workfile (her request, Oct 19 2026)
   Drag an email from Outlook (a .msg file) or save one as .eml and drop it in Documents.
   It is read here, on this computer: from, to, date, subject and the text become a document
   ("Email") that the search finds; every attachment is added to the order as its own document
   (sorted by kind and read like any other upload). Nothing is sent anywhere.
   ===================================================================== */
const isEmailFile = f => /\.(eml|msg)$/i.test(f.name) || f.type === 'message/rfc822' || f.type === 'application/vnd.ms-outlook';

/* ---- .eml (internet mail) ---- */
function emlDecodeWords(s) {   // =?utf-8?B?...?= and =?iso-8859-1?Q?...?=
  return String(s || '').replace(/(\?=)\s+(?==\?)/g, '$1').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (m, cs, enc, txt) => {
    try { const bytes = /b/i.test(enc) ? Uint8Array.from(atob(txt), c => c.charCodeAt(0)) : qpBytes(txt.replace(/_/g, ' '));
      return new TextDecoder(cs.toLowerCase().replace('latin1', 'iso-8859-1')).decode(bytes); } catch (e) { return txt; } });
}
function qpBytes(s) { const out = []; s = s.replace(/=\r?\n/g, '');
  for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else out.push(s.charCodeAt(i) & 255); }
  return new Uint8Array(out); }
function emlHeaders(block) { const H = {}; block.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => { const m = l.match(/^([\w-]+):\s*(.*)$/); if (m) { const k = m[1].toLowerCase(); H[k] = H[k] ? H[k] + ', ' + m[2] : m[2]; } }); return H; }
const hdrParam = (v, p) => { const m = String(v || '').match(new RegExp(p + '\\*?=\\s*"?([^";]+)"?', 'i')); return m ? emlDecodeWords(decodeURIComponent(m[1].replace(/^utf-8''/i, ''))) : ''; };
function emlPart(raw, out) {   // raw: a "binary string" (one char per byte)
  const cut = raw.search(/\r?\n\r?\n/); const H = emlHeaders(cut < 0 ? raw : raw.slice(0, cut)); let body = cut < 0 ? '' : raw.slice(cut).replace(/^\r?\n\r?\n/, '');
  const ct = H['content-type'] || 'text/plain'; const te = (H['content-transfer-encoding'] || '').toLowerCase();
  if (/^multipart\//i.test(ct)) { const b = hdrParam(ct, 'boundary'); if (b) body.split('--' + b).slice(1).forEach(p => { if (!/^--/.test(p)) emlPart(p.replace(/^\r?\n/, ''), out); }); return H; }
  const bytes = te === 'base64' ? Uint8Array.from(atob(body.replace(/[^A-Za-z0-9+/=]/g, '')), c => c.charCodeAt(0)) : te === 'quoted-printable' ? qpBytes(body) : Uint8Array.from(body, c => c.charCodeAt(0) & 255);
  const name = hdrParam(H['content-disposition'], 'filename') || hdrParam(ct, 'name'); const cs = (hdrParam(ct, 'charset') || 'utf-8').toLowerCase();
  if (name || /attachment/i.test(H['content-disposition'] || '') || !/^text\//i.test(ct)) { if (name || !/^(text|multipart)/i.test(ct)) out.files.push(new File([bytes], name || 'attachment', { type: ct.split(';')[0].trim() })); }
  else { let t = ''; try { t = new TextDecoder(cs).decode(bytes); } catch (e) { t = new TextDecoder().decode(bytes); }
    if (/html/i.test(ct)) out.html = out.html || t; else out.text = out.text || t; }
  return H;
}
async function readEml(file) {
  const buf = new Uint8Array(await file.arrayBuffer()); let raw = ''; for (let i = 0; i < buf.length; i += 32768) raw += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
  const out = { files: [], text: '', html: '' }; const H = emlPart(raw, out);
  return { from: emlDecodeWords(H.from || ''), to: emlDecodeWords(H.to || ''), cc: emlDecodeWords(H.cc || ''), date: H.date ? new Date(H.date) : null, subject: emlDecodeWords(H.subject || ''), text: out.text || htmlText(out.html), files: out.files };
}
function htmlText(h) { if (!h) return ''; const d = new DOMParser().parseFromString(h, 'text/html'); d.querySelectorAll('style,script').forEach(x => x.remove()); d.querySelectorAll('br').forEach(x => x.replaceWith('\n')); d.querySelectorAll('p,div,tr,li').forEach(x => x.append('\n')); return (d.body ? d.body.textContent : '').replace(/\n{3,}/g, '\n\n').trim(); }

/* ---- .msg (Outlook): a compound file; streams named __substg1.0_<property><type> ---- */
function cfbRead(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); const u32 = o => dv.getUint32(o, true), u16 = o => dv.getUint16(o, true);
  if (u32(0) !== 0xE011CFD0 || u32(4) !== 0xE11AB1A1) throw new Error('not an Outlook message file');
  const ss = 1 << u16(30), mss = 1 << u16(32), cutoff = u32(56); const sec = n => 512 + n * ss;
  const difat = []; for (let i = 0; i < 109; i++) { const v = u32(76 + i * 4); if (v < 0xFFFFFFFA) difat.push(v); }
  let dn = u32(68), dcount = u32(72); while (dcount-- > 0 && dn < 0xFFFFFFFA) { for (let i = 0; i < ss / 4 - 1; i++) { const v = u32(sec(dn) + i * 4); if (v < 0xFFFFFFFA) difat.push(v); } dn = u32(sec(dn) + ss - 4); }
  const fat = []; difat.forEach(s => { for (let i = 0; i < ss / 4; i++) fat.push(u32(sec(s) + i * 4)); });
  const chain = (start, table) => { const out = []; let s = start, guard = 0; while (s < 0xFFFFFFFA && guard++ < 1e6) { out.push(s); s = table[s]; } return out; };
  const readBig = (start, size) => { const out = new Uint8Array(size); let o = 0; for (const s of chain(start, fat)) { const n = Math.min(ss, size - o); if (n <= 0) break; out.set(buf.subarray(sec(s), sec(s) + n), o); o += n; } return out; };
  const dirBytes = readBig(u32(48), chain(u32(48), fat).length * ss); const ents = [];
  for (let o = 0; o + 128 <= dirBytes.length; o += 128) { const d = new DataView(dirBytes.buffer, dirBytes.byteOffset + o, 128); const nl = d.getUint16(64, true); let name = ''; for (let i = 0; i < Math.max(0, nl - 2); i += 2) name += String.fromCharCode(d.getUint16(i, true));
    ents.push({ name, type: d.getUint8(66), left: d.getUint32(68, true), right: d.getUint32(72, true), child: d.getUint32(76, true), start: d.getUint32(116, true), size: d.getUint32(120, true) }); }
  const root = ents[0]; const miniStream = readBig(root.start, root.size);
  const mfat = []; chain(u32(60), fat).forEach(s => { for (let i = 0; i < ss / 4; i++) mfat.push(u32(sec(s) + i * 4)); });
  const readMini = (start, size) => { const out = new Uint8Array(size); let o = 0; for (const s of chain(start, mfat)) { const n = Math.min(mss, size - o); if (n <= 0) break; out.set(miniStream.subarray(s * mss, s * mss + n), o); o += n; } return out; };
  const data = e => e.size < cutoff ? readMini(e.start, e.size) : readBig(e.start, e.size);
  const kids = i => { const out = []; const walk = j => { if (j === 0xFFFFFFFF || j >= ents.length) return; const e = ents[j]; walk(e.left); out.push(j); walk(e.right); }; walk(ents[i].child); return out; };
  return { ents, kids, data };
}
async function readMsg(file) {
  const buf = new Uint8Array(await file.arrayBuffer()); const C = cfbRead(buf);
  const streams = i => { const o = {}; C.kids(i).forEach(j => { o[C.ents[j].name] = j; }); return o; };
  const top = streams(0); const u16 = b => { let s = ''; for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] | (b[i + 1] << 8)); return s.replace(/\0+$/, ''); };
  const str = (S, id) => { const u = S['__substg1.0_' + id + '001F'], a = S['__substg1.0_' + id + '001E']; if (u !== undefined) return u16(C.data(C.ents[u])); if (a !== undefined) return new TextDecoder('windows-1252').decode(C.data(C.ents[a])).replace(/\0+$/, ''); return ''; };
  const bin = (S, id) => { const b = S['__substg1.0_' + id + '0102']; return b === undefined ? null : C.data(C.ents[b]); };
  let date = null; const pv = top['__properties_version1.0']; if (pv !== undefined) { const p = C.data(C.ents[pv]); const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
    for (let o = 32; o + 16 <= p.length; o += 16) { const tag = dv.getUint32(o, true); if (tag === 0x00390040 || tag === 0x0E060040) { const ft = dv.getUint32(o + 8, true) + dv.getUint32(o + 12, true) * 4294967296; date = new Date(ft / 1e4 - 11644473600000); if (tag === 0x00390040) break; } } }
  let text = str(top, '1000'); if (!text) { const h = bin(top, '1013'); if (h) text = htmlText(new TextDecoder().decode(h)); }
  const files = [];
  Object.entries(top).filter(([n]) => /^__attach_version1\.0_/.test(n)).forEach(([, j]) => { const S = streams(j); const d = bin(S, '3701'); if (!d) return;   // an attached Outlook message (no data stream) is skipped
    const name = str(S, '3707') || str(S, '3704') || 'attachment'; files.push(new File([d], name, { type: str(S, '370E') || '' })); });
  const fromMail = str(top, '5D01') || str(top, '0C1F') || str(top, '0065');
  return { from: [str(top, '0C1A') || str(top, '0042'), fromMail && !/^\/o=/i.test(fromMail) ? '<' + fromMail + '>' : ''].filter(Boolean).join(' '), to: str(top, '0E04'), cc: str(top, '0E03'), date, subject: str(top, '0037'), text, files };
}
async function readEmail(file) { return /\.msg$/i.test(file.name) || file.type === 'application/vnd.ms-outlook' ? readMsg(file) : readEml(file); }
const emailText = E => [`From: ${E.from || ''}`, `To: ${E.to || ''}`, E.cc ? `Cc: ${E.cc}` : '', `Date: ${E.date && !isNaN(E.date) ? E.date.toLocaleString() : ''}`, `Subject: ${E.subject || ''}`, E.files.length ? `Attachments: ${E.files.map(f => f.name).join(', ')}` : '', '', E.text || ''].filter((l, i) => l !== '' || i > 4).join('\n');
function emailPage(E, name) {   // what opens when she clicks the email in Documents
  return `<!doctype html><html><head><meta charset="utf-8"><title>${hesc(E.subject || name)}</title><style>body{font:15px/1.5 Arial,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#111}table{border-collapse:collapse;margin-bottom:16px}th{text-align:left;color:#555;padding:2px 12px 2px 0;vertical-align:top}pre{white-space:pre-wrap;font:inherit;border-top:1px solid #ccc;padding-top:12px}</style></head><body>
  <table><tr><th>From</th><td>${hesc(E.from || '')}</td></tr><tr><th>To</th><td>${hesc(E.to || '')}</td></tr>${E.cc ? `<tr><th>Cc</th><td>${hesc(E.cc)}</td></tr>` : ''}<tr><th>Date</th><td>${hesc(E.date && !isNaN(E.date) ? E.date.toLocaleString() : '')}</td></tr><tr><th>Subject</th><td><b>${hesc(E.subject || '')}</b></td></tr>${E.files.length ? `<tr><th>Attachments</th><td>${hesc(E.files.map(f => f.name).join(', '))} <i>(each is in the order's Documents)</i></td></tr>` : ''}</table>
  <pre>${hesc(E.text || '')}</pre></body></html>`;
}
