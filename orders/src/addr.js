/* Property address in parts (her request Oct 15 2026): street typed by her; city, state, ZIP, ZIP+4 picked or filled from the CRS (USPS format).
   #f_address stays the full line "street, city, ST zip-zip4" that the rest of the app reads. */
const AA_CITIES = [['Santa Barbara County', ['Santa Barbara', 'Goleta', 'Summerland', 'Carpinteria']], ['Ventura County', ['Ventura', 'Ojai', 'Oak View', 'Oxnard', 'Camarillo', 'Santa Paula']]];
const AA_ZIPS = { '93101': 'Santa Barbara', '93103': 'Santa Barbara', '93105': 'Santa Barbara', '93108': 'Santa Barbara', '93109': 'Santa Barbara', '93110': 'Santa Barbara', '93111': 'Santa Barbara', '93117': 'Goleta', '93013': 'Carpinteria', '93067': 'Summerland' };
const CITY_ZIP = { Goleta: '93117', Carpinteria: '93013', Summerland: '93067' };
/* her Oct 24 2026: Montecito is not a USPS city – the mailing city is Santa Barbara (same for Hope Ranch; Isla Vista mail is Goleta) */
const USPS_CITY = { montecito: 'Santa Barbara', 'hope ranch': 'Santa Barbara', 'mission canyon': 'Santa Barbara', 'isla vista': 'Goleta' };
const uspsCity = c => USPS_CITY[String(c || '').trim().toLowerCase()] || c;
const ADDR_KEYS = ['street', 'city', 'state', 'zip', 'zip4'];
const cityList = () => AA_CITIES.flatMap(g => g[1]);
function addrRowHTML(p, v) {
  v = v || {}; const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<div class="addrrow">
    <label class="a-street">Property address<input id="${p}street" value="${esc(v.street)}" placeholder="Property address" autocomplete="off"></label>
    <label class="a-city">City<select id="${p}citySel"><option value=""></option>${AA_CITIES.map(([g, cs]) => `<optgroup label="${g}">${cs.map(c => `<option>${c}</option>`).join('')}</optgroup>`).join('')}<option value="__other">Other – type it</option></select><input id="${p}city" value="${esc(v.city)}" placeholder="type the city" hidden></label>
    <label class="a-state">State<input id="${p}state" value="${esc(v.state || 'CA')}" maxlength="2"></label>
    <label class="a-zip">ZIP<select id="${p}zipSel"><option value=""></option>${Object.keys(AA_ZIPS).map(z => `<option>${z}</option>`).join('')}<option value="__other">Other – type it</option></select><input id="${p}zip" value="${esc(v.zip)}" placeholder="ZIP" inputmode="numeric" maxlength="5" hidden></label>
    <label class="a-zip4">+4<input id="${p}zip4" value="${esc(v.zip4)}" placeholder="0000" inputmode="numeric" maxlength="4"></label></div>`;
}
/* show a picked value in the select, or switch to the typed box when it is not in the list */
function syncPick(p, key, list) {
  const inp = document.getElementById(p + key), sel = document.getElementById(p + key + 'Sel'); if (!inp || !sel) return;
  const v = inp.value.trim(); const hit = list.find(x => x.toLowerCase() === v.toLowerCase());
  if (!v && sel.value !== '__other') { sel.value = ''; inp.hidden = true; } else if (hit) { sel.value = hit; inp.value = hit; inp.hidden = true; } else if (v) { sel.value = '__other'; inp.hidden = false; }
}
function wireAddr(p, onChange) {
  const g = k => document.getElementById(p + k);
  hubStreetSugg(g('street'), () => (g('zip') || {}).value, onChange);   // her Oct 24 2026: street name suggestions
  const pick = (key, list, after) => { const sel = g(key + 'Sel'), inp = g(key);
    sel.onchange = () => { if (sel.value === '__other') { inp.hidden = false; inp.value = ''; inp.focus(); } else { inp.value = sel.value; inp.hidden = true; if (after) after(sel.value); } onChange(); };
    inp.oninput = () => onChange(); syncPick(p, key, list); };
  pick('city', cityList(), c => { if (!g('zip').value && CITY_ZIP[c]) { g('zip').value = CITY_ZIP[c]; syncPick(p, 'zip', Object.keys(AA_ZIPS)); } });
  pick('zip', Object.keys(AA_ZIPS), z => { if (!g('city').value && AA_ZIPS[z]) { g('city').value = AA_ZIPS[z]; syncPick(p, 'city', cityList()); } });
  g('street').addEventListener('input', onChange); g('state').oninput = () => { g('state').value = g('state').value.toUpperCase(); onChange(); };
  g('zip4').oninput = () => { g('zip4').value = g('zip4').value.replace(/\D/g, ''); onChange(); };
}
function readAddr(p) { const o = {}; ADDR_KEYS.forEach(k => { const el = document.getElementById(p + k); o[k] = el ? el.value.trim() : ''; }); return o; }
function writeAddr(p, v) { if (v && v.city) v.city = uspsCity(v.city); ADDR_KEYS.forEach(k => { const el = document.getElementById(p + k); if (el && v[k] !== undefined) el.value = v[k]; }); syncPick(p, 'city', cityList()); syncPick(p, 'zip', Object.keys(AA_ZIPS)); }
function joinAddr(v) { if (!(v.street || '').trim()) return ''; return [v.street, v.city, [v.state, v.zip ? v.zip + (v.zip4 ? '-' + v.zip4 : '') : ''].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
function splitAddr(line) { /* "1729 Bath St, Santa Barbara, CA 93101-1234" → parts */
  const parts = String(line || '').split(',').map(s => s.trim()).filter(Boolean); const o = { street: parts[0] || '', city: '', state: '', zip: '', zip4: '' };
  const last = parts.length > 1 ? parts[parts.length - 1] : ''; const m = last.match(/^([A-Za-z]{2})?\s*(\d{5})?(?:-(\d{4}))?$/);
  if (m && (m[1] || m[2])) { o.state = (m[1] || '').toUpperCase(); o.zip = m[2] || ''; o.zip4 = m[3] || ''; if (parts.length > 2) o.city = uspsCity(parts.slice(1, -1).join(', ')); }
  else if (parts.length > 1) { const m2 = last.match(/^(.*?)\s+([A-Za-z]{2})\s*(\d{5})?(?:-(\d{4}))?$/); if (m2) { o.city = m2[1]; o.state = m2[2].toUpperCase(); o.zip = m2[3] || ''; o.zip4 = m2[4] || ''; } else o.city = parts.slice(1).join(', '); }
  return o;
}
/* the order page */
function orderAddrChanged() { $('#f_address').value = joinAddr(readAddr('f_')); const z = $('#f_zip').value; if (!$('#f_county').value.trim()) { if (AA_ZIPS[z]) $('#f_county').value = 'Santa Barbara'; else if (/^930(0[0-9]|1[0-2]|2[0-9]|3[0-6]|4[0-9]|6[0-6])$/.test(z) && !AA_ZIPS[z]) {} } update(); }
function loadOrderAddr(f) { const box = $('#addrBox'); if (!box) return;
  let v = { street: f.street || '', city: uspsCity(f.city || ''), state: f.state || '', zip: f.zip || '', zip4: f.zip4 || '' };
  if (!v.street && f.address) v = { ...splitAddr(f.address) }; if (!v.state) v.state = 'CA';
  if (!box.dataset.built) { box.innerHTML = addrRowHTML('f_', v); box.dataset.built = '1'; wireAddr('f_', orderAddrChanged); }
  writeAddr('f_', v); $('#f_address').value = joinAddr(v);
}
/* used by the CRS, MLS and letter readers */
function setOrderAddr(v, force) { const old = readAddr('f_'); const n = { ...old };
  ADDR_KEYS.forEach(k => { if (v[k] && (force || !old[k] || (k === 'state' && old[k] === 'CA'))) n[k] = v[k]; }); writeAddr('f_', n); $('#f_address').value = joinAddr(n); return n; }

/* her Oct 24 2026: street name suggestions as she types the address – Census street list for her ZIP codes (streets.js) */
function hubStreetSugg(inp, getZip, onChange) {
  if (!inp || inp.dataset.sugg) return; inp.dataset.sugg = '1';
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sugg = v => { const m = String(v || '').match(/^\s*(\d+[A-Za-z]?(?:-\d+)?)\s+(.*)$/); const n = m ? m[1] : '', rest = (m ? m[2] : String(v || '')).trim().toLowerCase().replace(/\s+/g, ' ');
    if (rest.length < 2 || /,/.test(rest)) return []; const num = parseInt(n, 10), zi = STREET_ZIPS.indexOf(String(getZip() || '')), out = [];
    STREETS.forEach(([name, zs, lo, hi]) => { const l = name.toLowerCase(); if (l === rest) return; const bare = l.replace(/^(n|s|e|w)\s+/, '');
      let sc = l.startsWith(rest) ? 3 : bare.startsWith(rest) ? 2.5 : l.split(' ').some(w => w.startsWith(rest)) ? 1 : 0; if (!sc) return;
      if (zi >= 0 && zs.includes(String(zi))) sc += 2; if (num && hi && num >= lo && num <= hi) sc += 1.5; else if (num && hi) sc -= 1; out.push([sc, name]); });
    out.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1])); return [...new Set(out.map(x => x[1]))].slice(0, 6).map(x => (n ? n + ' ' : '') + x); };
  const box = document.createElement('div'); box.className = 'st-sugg'; box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:4px'; inp.insertAdjacentElement('afterend', box);
  const show = () => { const L = sugg(inp.value); box.innerHTML = L.map(s => `<button type="button" class="btn sm" data-st="${esc(s)}">${esc(s)}</button>`).join(''); box.style.display = L.length ? 'flex' : 'none'; };
  inp.addEventListener('input', show); inp.addEventListener('focus', show); inp.addEventListener('blur', () => setTimeout(() => { box.style.display = 'none'; }, 250));
  box.addEventListener('mousedown', e => { const b = e.target.closest('[data-st]'); if (!b) return; e.preventDefault(); inp.value = b.dataset.st; box.style.display = 'none'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); if (onChange) onChange(); });
  box.style.display = 'none';
}
