/* ---------------- small helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const blank = v => v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v)) || (Array.isArray(v) && !v.length);
const num = v => { if (blank(v)) return null; const n = Number(String(v).replace(/[$,\s]/g, '')); return isNaN(n) ? null : n; };
const money = v => blank(v) ? '' : '$' + Math.round(+v).toLocaleString();
const int = v => blank(v) ? '' : Math.round(+v).toLocaleString();
const titleCase = s => String(s || '').toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(Ii|Iii|Iv)\b/g, m => m.toUpperCase());
function toast(msg, ms = 2800) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

/* ---------------- dates: everything is kept as YYYY-MM-DD ---------------- */
function isoDate(v) {
  if (blank(v)) return '';
  const s = String(v).trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) { let y = +m[3]; if (y < 100) y += y > 50 ? 1900 : 2000; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, '0')}`; // month only (archive)
  return '';
}
const showDate = v => { const d = isoDate(v); if (!d) return ''; const [y, m, dd] = d.split('-'); return dd ? `${m}/${dd}/${y}` : `${m}/${y}`; };
const monthsBetween = (a, b) => { const A = new Date(isoDate(a).length === 7 ? a + '-15' : a), B = new Date(isoDate(b).length === 7 ? b + '-15' : b); return (B - A) / (30.44 * 864e5); };

/* ---------------- addresses ----------------
   One key per property that survives the ways the sources write an address:
   "1848 E Valley Rd" (archive), "1848 Valley" (MLS export), "1848 E VALLEY RD" (CORT / CRS).
   Key = street number + the street name without direction and suffix (+ unit). */
const DIRS = new Set(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west']);
const SUFFIX = new Set(['rd', 'road', 'dr', 'drive', 'ln', 'lane', 'st', 'street', 'ave', 'avenue', 'av', 'way', 'wy', 'ct', 'court', 'pl', 'place', 'cir', 'circle', 'blvd', 'boulevard', 'ter', 'terrace', 'trl', 'trail', 'pkwy', 'parkway', 'hwy', 'highway', 'loop']);
function splitAddr(s) {
  s = String(s || '').replace(/,.*$/, '').trim();
  let unit = ''; const um = s.match(/\s+(?:#|unit|apt|ste|suite|spc|space)\s*([\w-]+)\s*$/i); if (um) { unit = um[1]; s = s.slice(0, um.index); }
  const m = s.match(/^(\d+[A-Za-z]?(?:-\d+)?)\s+(.*)$/); if (!m) return { no: '', street: s, unit };
  return { no: m[1], street: m[2].trim(), unit };
}
function addrKey(no, street, unit) {
  if (street === undefined) { const p = splitAddr(no); no = p.no; street = p.street; unit = p.unit; }
  const w = String(street || '').toLowerCase().replace(/[.'’]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  while (w.length > 1 && DIRS.has(w[0])) w.shift();
  while (w.length > 1 && (SUFFIX.has(w[w.length - 1]) || DIRS.has(w[w.length - 1]))) w.pop();
  const base = String(no || '').toLowerCase().replace(/-.*$/, '') + '|' + w.join(' ');
  return unit ? base + '#' + String(unit).toLowerCase() : base;
}
const apnKey = s => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(0, 9) : ''; };
const fmtApn = s => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 8 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}` : String(s || ''); };

/* ---------------- distance and direction from the subject ---------------- */
function milesBetween(a, b) {
  if (!a || !b || blank(a.lat) || blank(b.lat) || blank(a.lon) || blank(b.lon)) return null;
  const R = 3958.8, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function directionOf(a, b) { // direction of the comparable (b) from the subject (a), UAD enumeration
  if (!a || !b || blank(a.lat) || blank(b.lat)) return '';
  const r = x => x * Math.PI / 180;
  const y = Math.sin(r(b.lon - a.lon)) * Math.cos(r(b.lat)), x = Math.cos(r(a.lat)) * Math.sin(r(b.lat)) - Math.sin(r(a.lat)) * Math.cos(r(b.lat)) * Math.cos(r(b.lon - a.lon));
  const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return ['North', 'NorthEast', 'East', 'SouthEast', 'South', 'SouthWest', 'West', 'NorthWest'][Math.round(deg / 45) % 8];
}

/* ---------------- CSV (MLS exports are Windows-1252) ---------------- */
async function readText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
  catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

/* ---------------- zip (store only for writing; reads stored or deflated) ---------------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function makeZip(entries) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const d = new Date(); const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const e of entries) {
    let data = e.data;
    if (typeof data === 'string') data = enc.encode(data);
    else if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
    const name = enc.encode(e.name); const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
async function readZip(blob) { // Map name -> Uint8Array
  const buf = new Uint8Array(await blob.arrayBuffer()); const dv = new DataView(buf.buffer); const out = new Map();
  let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Not a zip file');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loff = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    const lstart = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
    let data = buf.subarray(lstart, lstart + csize);
    if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    if (!name.endsWith('/')) out.set(name, data);
    p += 46 + nlen + xlen + clen;
  }
  return out;
}
async function gunzipJSON(file) {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  const stream = head[0] === 0x1f && head[1] === 0x8b ? file.stream().pipeThrough(new DecompressionStream('gzip')) : file.stream();
  return JSON.parse(await new Response(stream).text());
}
async function gzipBlob(text) { return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob(); }

/* ---------------- save a file (desktop Chrome: straight download) ---------------- */
const safeName = s => String(s || '').replace(/[\\/:*?"<>|#%]+/g, '-').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Comps';
function download(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------------- storage (IndexedDB) ---------------- */
const DB = (() => {
  let db = null;
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('appraisal-assistant', 1);
    r.onupgradeneeded = () => { const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('jobs')) d.createObjectStore('jobs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('photos')) { const p = d.createObjectStore('photos', { keyPath: 'id' }); p.createIndex('job', 'jobId'); } };
    r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error);
  });
  const tx = (store, mode, fn) => new Promise((res, rej) => {
    const t = db.transaction(store, mode); const s = t.objectStore(store); let out; const r = fn(s);
    if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
  return {
    ready: null,
    put: (store, obj) => tx(store, 'readwrite', s => s.put(obj)),
    get: (store, id) => tx(store, 'readonly', s => s.get(id)),
    del: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
    all: store => tx(store, 'readonly', s => s.getAll()),
    byJob: jobId => tx('photos', 'readonly', s => s.index('job').getAll(jobId)),
    init() { this.ready = open(); return this.ready; },
  };
})();

/* ---------------- PDF text, rebuilt into lines ----------------
   Each line is the text of one printed row; cells more than 8 points apart are joined with " | ". */
let pdfjsLib = null;
async function pdfLines(file, onPage) {
  if (!pdfjsLib) { pdfjsLib = await import('./pdf.min.mjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs'; }
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
  const out = []; out.rows = []; out.pages = doc.numPages; out.pageOf = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent(); const rows = new Map();
    tc.items.forEach(it => { if (!it.str.trim()) return; const y = Math.round(it.transform[5]); let k = [...rows.keys()].find(r => Math.abs(r - y) <= 2); if (k === undefined) { k = y; rows.set(k, []); } rows.get(k).push({ x: it.transform[4], s: it.str, w: it.width }); });
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, its]) => { its.sort((a, b) => a.x - b.x); let line = '', end = 0; const cells = []; its.forEach(i => { const gap = i.x - end; if (!line || gap > 8) cells.push({ x: i.x, s: i.s }); else cells[cells.length - 1].s += ' ' + i.s; line += (line ? (gap > 8 ? ' | ' : ' ') : '') + i.s; end = i.x + i.w; }); out.push(line.trim()); out.rows.push(cells.map(c => ({ x: c.x, s: c.s.trim() }))); out.pageOf.push(n); });
    if (onPage) onPage(n, doc.numPages);
  }
  return out;
}
async function pdfFirstText(file) { // quick look at page 1 to tell what kind of PDF this is
  if (!pdfjsLib) { pdfjsLib = await import('./pdf.min.mjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs'; }
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, wasmUrl: './wasm/', standardFontDataUrl: './standard_fonts/' }).promise;
  const tc = await (await doc.getPage(1)).getTextContent(); return { text: tc.items.map(i => i.str).join(' '), pages: doc.numPages };
}
