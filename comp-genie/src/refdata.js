/* =====================================================================
   Her reference databases, shared by the Comp genie and the cost approach (her rule, Oct 19 2026)
   · Land sales  – her workbook "Land Sales by Neighborhood.xlsx" (her reports + CORT vacant land + her own)
   · Construction costs – her Construction_Cost_Database.xlsx (32 local contractor budgets, CCCI-indexed)
   Both are dropped on the Comp genie page once and kept in this browser (kv 'landSales', 'costDb'),
   like the archive and the CORT table. Nothing is uploaded anywhere.
   ===================================================================== */
/* ---- a small .xlsx reader: cell values as Excel last saved them (cached formula results) ---- */
async function readXlsx(file) {
  const z = await readZip(file); const dec = new TextDecoder(); const X = n => z.has(n) ? new DOMParser().parseFromString(dec.decode(z.get(n)), 'application/xml') : null;
  const ss = []; const sst = X('xl/sharedStrings.xml'); if (sst) [...sst.getElementsByTagName('si')].forEach(si => ss.push([...si.getElementsByTagName('t')].map(t => t.textContent).join('')));
  const wbx = X('xl/workbook.xml'), rel = X('xl/_rels/workbook.xml.rels'); const target = {};
  if (rel) [...rel.getElementsByTagName('Relationship')].forEach(r => { target[r.getAttribute('Id')] = r.getAttribute('Target').replace(/^\/?xl\//, '').replace(/^\//, ''); });
  const sheets = [];
  for (const s of [...wbx.getElementsByTagName('sheet')]) { const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const doc = X('xl/' + (target[rid] || '')); if (!doc) continue; const rows = [];
    [...doc.getElementsByTagName('row')].forEach(r => { const R = +r.getAttribute('r') - 1; const row = rows[R] = rows[R] || [];
      [...r.getElementsByTagName('c')].forEach(c => { const ref = c.getAttribute('r'); const col = ref.replace(/\d+/g, '').split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
        const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], is = c.getElementsByTagName('is')[0]; let val = null;
        if (t === 's' && v) val = ss[+v.textContent]; else if (t === 'inlineStr' && is) val = is.textContent; else if (t === 'str' && v) val = v.textContent; else if (t === 'b' && v) val = v.textContent === '1'; else if (v) { const n = +v.textContent; val = isNaN(n) ? v.textContent : n; }
        row[col] = val; }); });
    sheets.push({ name: s.getAttribute('name'), rows: Array.from(rows, r => r || []) }); }
  return sheets;
}
const xlDate = v => typeof v === 'number' && v > 20000 && v < 80000 ? new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10) : (v || '');

/* ---- land sales ---- */
const LAND_HEAD = { 'Neighborhood': 'nbhd', 'Address': 'addr', 'Unit': 'unit', 'APN': 'apn', 'Sale date (YYYY-MM)': 'ym', 'Sale price ($)': 'price', 'Site size (sq ft)': 'site', 'Usable area (sq ft)': 'usable', 'Zoning': 'zoning', 'View': 'view', 'Topography': 'topo', 'Utilities / water': 'util', 'Improvements at sale': 'impr', 'Source': 'source', 'Your notes': 'note', 'Check': 'check' };
function ingestLandWorkbook(sheets, name) {
  const out = [];
  sheets.forEach(sh => { const H = (sh.rows[0] || []).map(x => LAND_HEAD[String(x || '').trim()]); if (!H.includes('price')) return;
    sh.rows.slice(1).forEach(r => { const o = { area: sh.name }; H.forEach((k, i) => { if (k && r[i] !== null && r[i] !== undefined && r[i] !== '') o[k] = r[i]; });
      if (!num(o.price) || !(o.addr || o.apn)) return; o.price = num(o.price); ['site', 'usable'].forEach(k => { if (o[k] !== undefined) o[k] = num(o[k]); });
      if (typeof o.ym === 'number') o.ym = xlDate(o.ym).slice(0, 7); o.ym = String(o.ym || '').slice(0, 7); o.id = (o.apn || o.addr) + '|' + o.ym; out.push(o); }); });
  return out;
}
/* ---- construction cost database ---- */
function ingestCostWorkbook(sheets, name) {
  const get = n => sheets.find(s => s.name === n); const P = get('Projects'), S = get('Summary'), L = get('Line Items'); if (!P || !S) return null;
  const ids = (P.rows[0] || []).slice(1).filter(Boolean); const projects = ids.map(id => ({ id, f: {}, s: {} }));
  const fill = (sheet, key) => sheet.rows.slice(1).forEach(r => { const k = String(r[0] || '').trim(); if (!k) return; ids.forEach((id, j) => { const v = r[j + 1]; if (v !== null && v !== undefined && v !== '') projects[j][key][k] = v; }); });
  fill(P, 'f'); fill(S, 's');
  projects.forEach(p => { if (p.f['Budget date']) p.f['Budget date'] = xlDate(p.f['Budget date']); });
  const lines = L ? L.rows.slice(1).filter(r => r[0]).map(r => ({ p: r[0], ref: r[1], desc: r[2], amt: num(r[3]), trade: r[4], layer: r[5], flags: r[6] })) : [];
  const ccci = (P.rows.find(r => /^CCCI – index date/.test(String(r[0] || ''))) || [])[0] || '';
  return { file: name, loaded: new Date().toISOString(), projects, lines, indexNote: String(ccci).replace(/^CCCI – index date\s*/, '').replace(/[()]/g, '') };
}
async function ingestXlsx(f) {
  const sheets = await readXlsx(f);
  if (sheets.some(s => s.name === 'Line Items') && sheets.some(s => s.name === 'Projects')) {
    const C = ingestCostWorkbook(sheets, f.name); if (!C) return f.name + ': not the cost database layout';
    app.costDb = C; await DB.put('kv', { id: 'costDb', v: C }); return `${f.name}: construction cost database – ${C.projects.length} projects, ${C.lines.length.toLocaleString()} budget lines (kept in this browser; the cost approach and the grid use it)`; }
  const land = ingestLandWorkbook(sheets, f.name);
  if (land.length) { const old = app.land || []; const keep = old.filter(o => !land.some(n => n.id === o.id)); app.land = [...keep, ...land]; await DB.put('kv', { id: 'landSales', v: app.land });
    return `${f.name}: ${land.length} land sales (your land sale database now has ${app.land.length})`; }
  return f.name + ': this workbook is not your land sales or your construction cost database';
}
async function refLoad() { const a = await DB.get('kv', 'landSales'), b = await DB.get('kv', 'costDb'); app.land = (a && a.v) || []; app.costDb = (b && b.v) || null; }

/* ---- what she sees ---- */
const pick = (o, ...ks) => { for (const k of ks) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return null; };
const median = a => { const v = a.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const isRemodel = p => /remodel|renovat|addition/i.test(String(p.f['Project type'] || '')) && !/new construction|rebuild/i.test(String(p.f['Project type'] || ''));
function refAreaGuess(J) { const t = [J.subject.addr, J.subject.city, J.subject.zip, (subjFacts(J) || {}).nbhd].join(' ');
  return /93108|montecito/i.test(t) ? 'Montecito' : /hope ranch/i.test(t) ? 'Hope Ranch-Foothills' : /goleta|93117|93111/i.test(t) ? 'Goleta' : /carpinteria|93013/i.test(t) ? 'Carpinteria' : /summerland|93067/i.test(t) ? 'Summerland' : ''; }
function refHTML(J) {
  const L = app.land || [], C = app.costDb; const R = app.ref = app.ref || { tab: 'land', area: null, q: '', newOnly: true };
  if (R.area === null || R.job !== J.id) { R.area = refAreaGuess(J); R.job = J.id; }
  if (!L.length && !C) return `<h2>Land sales and construction costs</h2><p class="help">Drop your <b>Land Sales by Neighborhood.xlsx</b> and your <b>Construction_Cost_Database.xlsx</b> on this page once. They are kept in this browser and shared with the cost approach.</p>`;
  const areas = [...new Set(L.map(x => x.area))].sort();
  let body = '';
  if (R.tab === 'land') { const q = R.q.toLowerCase(); const rows = L.filter(x => (!R.area || x.area === R.area) && (!q || [x.nbhd, x.addr, x.apn, x.zoning, x.note].join(' ').toLowerCase().includes(q))).sort((a, b) => String(b.ym).localeCompare(String(a.ym)));
    const pua = rows.map(x => x.usable ? x.price / (x.usable / 43560) : null), psf = rows.map(x => x.site ? x.price / x.site : null);
    body = `<div class="row"><label>Area <select data-refarea="1"><option value="">All areas</option>${areas.map(a => `<option ${a === R.area ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label><input class="txt" data-refq="1" value="${esc(R.q)}" placeholder="neighborhood, street, APN, zoning…" style="width:22em">
      <span class="help">${rows.length} sale${rows.length === 1 ? '' : 's'}${median(pua) ? ' · median ' + money(median(pua)) + ' per usable acre' : ''}${median(psf) ? ' · median ' + money(median(psf)) + ' per site sq ft' : ''}</span></div>
      <div class="tablewrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Neighborhood</th><th>Address</th><th>APN</th><th>Sold</th><th class="r">Price</th><th class="r">Site</th><th class="r">Usable</th><th class="r">$/site sf</th><th class="r">$/usable ac</th><th>Zoning</th><th>Source</th><th>Check</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td>${esc(x.nbhd || '')}</td><td>${esc(x.addr || '')}</td><td>${esc(x.apn || '')}</td><td>${esc(x.ym || '')}</td><td class="r">${money(x.price)}</td><td class="r">${x.site ? int(x.site) + ' sf' : ''}</td><td class="r">${x.usable ? (x.usable / 43560).toFixed(2) + ' ac' : ''}</td><td class="r">${x.site ? money(x.price / x.site) : ''}</td><td class="r">${x.usable ? money(x.price / (x.usable / 43560)) : ''}</td><td>${esc(x.zoning || '')}</td><td><small>${esc(String(x.source || '').slice(0, 40))}</small></td><td><small>${esc(x.check || '')}</small></td></tr>`).join('')}</tbody></table></div>`; }
  else if (C) { const ps = C.projects.filter(p => !R.newOnly || !isRemodel(p));
    const v = (p, k) => num(p.s[k]); const rows = ps.map(p => ({ p, bd: v(p, 'Building direct $/SF GLA – indexed'), tot: v(p, 'Total budget – indexed') && num(p.f['GLA (SF) – appraisal']) ? v(p, 'Total budget – indexed') / num(p.f['GLA (SF) – appraisal']) : null, ex: v(p, 'Existing-site basis $/SF GLA – indexed'), gar: v(p, 'Garage – $/SF garage'), pool: v(p, 'Pool & spa'), land: v(p, 'Landscaping & irrigation') })).sort((a, b) => (b.bd || 0) - (a.bd || 0));
    body = `<div class="row"><label class="check"><input type="checkbox" data-refnew="1" ${R.newOnly ? 'checked' : ''}> New construction only (remodels are partial scope – components only)</label>
      <span class="help">${rows.length} project${rows.length === 1 ? '' : 's'} · median building direct ${money(median(rows.map(r => r.bd)))} / sf · existing-site basis ${money(median(rows.map(r => r.ex)))} / sf · indexed with the CCCI${C.indexNote ? ' (' + esc(C.indexNote) + ')' : ''}</span></div>
      <div class="tablewrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Project</th><th>Type</th><th>Budget</th><th>Submarket</th><th>Quality</th><th class="r">GLA</th><th class="r">Building direct $/sf</th><th class="r">Existing-site basis $/sf</th><th class="r">Total budget $/sf</th><th class="r">Garage $/sf</th><th class="r">Pool & spa</th><th class="r">Landscaping</th></tr></thead><tbody>
      ${rows.map(({ p, bd, ex, tot, gar, pool, land }) => `<tr${isRemodel(p) ? ' class="muted"' : ''}><td><b>${esc(p.id)}</b></td><td><small>${esc(String(p.f['Project type'] || ''))}</small></td><td>${esc(String(p.f['Budget date'] || '').slice(0, 7))}</td><td><small>${esc(String(p.f['Submarket'] || ''))}</small></td><td>${esc(String(p.f['Quality rating'] || ''))}</td><td class="r">${int(num(p.f['GLA (SF) – appraisal']))}</td><td class="r">${bd ? money(bd) : ''}</td><td class="r">${ex ? money(ex) : ''}</td><td class="r">${tot ? money(tot) : ''}</td><td class="r">${gar ? money(gar) : ''}</td><td class="r">${pool ? money(pool) : ''}</td><td class="r">${land ? money(land) : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="help">From ${esc(C.file)}, your local contractor budgets. Figures are brought to today with the California Construction Cost Index; you noted local costs rose faster, so older budgets read as floors. Your 135 review decisions are not in yet – figures use the suggested handling.</p>`; }
  else body = '<p class="help">Drop your <b>Construction_Cost_Database.xlsx</b> on this page.</p>';
  return `<h2>Land sales and construction costs <small>your own databases, shared with the cost approach</small></h2>
    <div class="row"><button class="btn sm${R.tab === 'land' ? ' primary' : ''}" data-reftab="land">Land sales (${L.length})</button><button class="btn sm${R.tab === 'cost' ? ' primary' : ''}" data-reftab="cost">Construction costs (${C ? C.projects.length + ' projects' : 'not loaded'})</button></div>${body}`;
}
