/* =====================================================================
   Her reference databases, shared by the Comp genie and the cost approach (her rule, Oct 19 2026)
   · Land sales  – her workbook "Land Sales by Market Area.xlsx" (older copies with a Neighborhood column still read) (her reports + CORT vacant land + her own)
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
const LAND_HEAD = { 'Market area': 'nbhd', 'Neighborhood': 'nbhd', 'Address': 'addr', 'Unit': 'unit', 'APN': 'apn', 'Sale date (YYYY-MM)': 'ym', 'Sale price ($)': 'price', 'Site size (sq ft)': 'site', 'Usable area (sq ft)': 'usable', 'Zoning': 'zoning', 'View': 'view', 'Topography': 'topo', 'Utilities / water': 'util', 'Improvements at sale': 'impr', 'Source': 'source', 'Your notes': 'note', 'Check': 'check' };
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
/* her land sale choices for this assignment (Oct 20 2026): filters, the sales she ticks, the site value and its comment */
function landJob(J) { const L = J.land = J.land || {}; L.use = L.use || []; if (!L.f) { L.f = { years: 5 }; const s = (subjFacts(J) || {}).site; if (s) { L.f.minSite = Math.round(s / 2); L.f.maxSite = Math.round(s * 2); } } return L; }
/* Noleta (93111) is part of Goleta (her rule) */
function landInArea(x, area) { if (x.area === area) return true; const t = [x.nbhd, x.addr, x.source, x.note].join(' ');
  if (/^goleta/i.test(area)) return /\b(?:goleta|noleta|93117|93111)\b/i.test(t); return new RegExp('\\b' + area.replace(/[-–].*$/, '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(String(x.nbhd || '')); }
function landUsedHTML(J) {
  const LD = landJob(J); const U = (app.land || []).filter(x => LD.use.includes(x.id)); if (!U.length) return '';
  const pr = U.map(x => x.price), psf = U.map(x => x.site ? x.price / x.site : null).filter(Boolean), pua = U.map(x => x.usable ? x.price / (x.usable / 43560) : null).filter(Boolean);
  const rng = a => a.length ? money(Math.min(...a)) + ' to ' + money(Math.max(...a)) : '';
  const draft = landDraft(J, U); LD.lastDraft = draft; const cm = LD.comment != null ? LD.comment : draft;
  return `<div class="landused"><h3>Land sales used for the site value (${U.length})</h3>
    <p class="help">Prices ${rng(pr)}${psf.length ? ' · ' + rng(psf) + ' per site sq ft (median ' + money(median(psf)) + ')' : ''}${pua.length ? ' · ' + rng(pua) + ' per usable acre (median ' + money(median(pua)) + ')' : ''}.</p>
    <div class="row"><label>Site value $<input class="txt num" data-landv="1" value="${LD.value ? Math.round(LD.value).toLocaleString() : ''}" inputmode="numeric" style="width:10em"></label><span class="help">Method: sales comparison. Your choice – the app does not pick it.</span></div>
    <label class="fld"><span>Site value comment for the Cost Approach <small>${cm.length.toLocaleString()} / 2,500 characters – read and edit it</small></span><textarea class="txt" data-landc="1" rows="6">${esc(cm)}</textarea></label>
    <div class="row"><button class="btn sm" data-landcopy="1">Copy the comment</button><button class="btn sm ghost" data-landredraft="1">Write it again from the ticked sales</button></div>
    <p class="help">In SFREP › Cost Approach: type the site value and paste this comment. The ticked sales and your value are saved with this assignment.</p></div>`;
}
function landDraft(J, U) {
  const LD = landJob(J); const ym = U.map(x => x.ym).filter(Boolean).sort(); const psf = U.map(x => x.site ? x.price / x.site : null).filter(Boolean), pua = U.map(x => x.usable ? x.price / (x.usable / 43560) : null).filter(Boolean);
  const one = x => `${x.addr || x.apn} (${x.ym ? x.ym.replace(/^(\d{4})-(\d{2})$/, '$2/$1') : 'date n/a'}, ${money(x.price)}${x.site ? ', ' + int(x.site) + ' sq ft site' : ''}${x.usable ? ', ' + (x.usable / 43560).toFixed(2) + ' usable acres' : ''})`;
  let t = `The site value was estimated by sales comparison. ${U.length} land sale${U.length > 1 ? 's' : ''}${ym.length ? ' from ' + ym[0].replace(/^(\d{4})-(\d{2})$/, '$2/$1') + (ym.length > 1 ? ' to ' + ym[ym.length - 1].replace(/^(\d{4})-(\d{2})$/, '$2/$1') : '') : ''} were considered: ${U.map(one).join('; ')}.`;
  if (psf.length) t += ` They indicate ${money(Math.min(...psf))} to ${money(Math.max(...psf))} per square foot of site area (median ${money(median(psf))})${pua.length ? ` and ${money(Math.min(...pua))} to ${money(Math.max(...pua))} per usable acre (median ${money(median(pua))})` : ''}.`;
  t += LD.value ? ` The subject site value is estimated at ${money(LD.value)}.` : ' The subject site value is estimated at $___.';
  return t.length > 2500 ? t.slice(0, 2497) + '…' : t;
}
async function landRedraw() { const c = $('#refCard'); if (c && app.job) { const y = window.scrollY; c.innerHTML = refHTML(app.job); window.scrollTo(0, y); } try { await saveNow(); } catch (e) {} }
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || !app.job) return; const LD = landJob(app.job);
  if (t.dataset.landuse !== undefined) { const id = t.dataset.landuse; LD.use = t.checked ? [...new Set([...LD.use, id])] : LD.use.filter(x => x !== id); if (LD.comment != null && LD.comment === LD.lastDraft) LD.comment = null; landRedraw(); }
  else if (t.dataset.landf !== undefined) { const k = t.dataset.landf; const v = k === 'years' ? +t.value : num(String(t.value).replace(/[^0-9.]/g, '')); LD.f[k] = v || (k === 'years' ? 0 : null); landRedraw(); }
  else if (t.dataset.landv !== undefined) { LD.value = num(String(t.value).replace(/[^0-9.]/g, '')) || null; if (LD.comment == null || LD.comment === LD.lastDraft) LD.comment = null; landRedraw(); }
  else if (t.dataset.landc !== undefined) { LD.comment = t.value; saveNow(); } });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-landreset],[data-landclear],[data-landcopy],[data-landredraft]'); if (!b || !app.job) return; const LD = landJob(app.job);
  if (b.dataset.landreset) { const s = (subjFacts(app.job) || {}).site; LD.f = { years: 5 }; if (s) { LD.f.minSite = Math.round(s / 2); LD.f.maxSite = Math.round(s * 2); } landRedraw(); }
  else if (b.dataset.landclear) { LD.f = { years: 0 }; landRedraw(); }
  else if (b.dataset.landredraft) { LD.comment = null; landRedraw(); }
  else if (b.dataset.landcopy) { const ta = document.querySelector('[data-landc]'); const v = ta ? ta.value : ''; try { navigator.clipboard.writeText(v).then(() => toast('Comment copied – paste it in SFREP › Cost Approach')); } catch (x) { ta.select(); document.execCommand('copy'); toast('Comment copied'); } } });
function refHTML(J) {
  { /* a condo has no land value of its own: the card stays closed unless she opens it (her Encina question, Oct 19 2026) */
    const condo = typeof gridMode === 'function' && gridMode(J) === 'condo'; const RS = app.ref || {}; const open = RS.openFor === J.id ? true : RS.closedFor === J.id ? false : !condo;
    if (!open) return `<div class="row"><h2 style="margin:0">Land sales and construction costs <small>your own databases, shared with the cost approach</small></h2><span class="grow"></span><button class="btn sm" data-refopen="1">Show</button></div><p class="help">${condo ? 'Closed for this condo – land sales and site value are not used for a condominium unit.' : 'Closed.'} These are your land sale and construction cost databases (from your reports, your land sales workbook and CORT “vacant” sales), not comps for this assignment.</p>`;
  }
  const L = app.land || [], C = app.costDb; const R = app.ref = app.ref || { tab: 'land', area: null, q: '', newOnly: true };
  if (R.area === null || R.job !== J.id) { R.area = refAreaGuess(J); R.job = J.id; }
  if (!L.length && !C) return `<h2>Land sales and construction costs</h2><p class="help">Drop your <b>Land Sales by Market Area.xlsx</b> and your <b>Construction_Cost_Database.xlsx</b> on this page once. They are kept in this browser and shared with the cost approach.</p>`;
  const areas = [...new Set(L.map(x => x.area))].sort();
  let body = '';
  if (R.tab === 'land') { const LD = landJob(J); const F = LD.f; const q = R.q.toLowerCase(); const ys = F.years ? new Date().getFullYear() - F.years : 0;
    const rows = L.filter(x => (!R.area || landInArea(x, R.area)) && (!q || [x.nbhd, x.addr, x.apn, x.zoning, x.note, x.area].join(' ').toLowerCase().includes(q))
      && (!F.minSite || !x.site || x.site >= F.minSite) && (!F.maxSite || !x.site || x.site <= F.maxSite) && (!ys || (+String(x.ym).slice(0, 4) || 0) >= ys)
      && (!F.minP || x.price >= F.minP) && (!F.maxP || x.price <= F.maxP) || LD.use.includes(x.id)).sort((a, b) => (LD.use.includes(b.id) - LD.use.includes(a.id)) || String(b.ym).localeCompare(String(a.ym)));
    const pua = rows.map(x => x.usable ? x.price / (x.usable / 43560) : null), psf = rows.map(x => x.site ? x.price / x.site : null); const sub = subjFacts(J) || {};
    const nf = v => v ? Math.round(v).toLocaleString() : '';
    body = `<div class="row"><label>Area <select data-refarea="1"><option value="">All areas</option>${areas.map(a => `<option ${a === R.area ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label><input class="txt" data-refq="1" value="${esc(R.q)}" placeholder="ZIP, market area, street, APN, zoning…" style="width:20em"></div>
      <div class="row landf"><label>Site from <input class="txt num" data-landf="minSite" value="${nf(F.minSite)}" inputmode="numeric"> to <input class="txt num" data-landf="maxSite" value="${nf(F.maxSite)}" inputmode="numeric"> sq ft</label>
        <label>Sold in the last <select data-landf="years">${[[1, '1 year'], [2, '2 years'], [3, '3 years'], [5, '5 years'], [10, '10 years'], [0, 'any time']].map(([v, l]) => `<option value="${v}" ${+F.years === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Price from $<input class="txt num" data-landf="minP" value="${nf(F.minP)}" inputmode="numeric"> to $<input class="txt num" data-landf="maxP" value="${nf(F.maxP)}" inputmode="numeric"></label>
        <button class="btn sm ghost" data-landreset="1">Like the subject</button><button class="btn sm ghost" data-landclear="1">Clear filters</button></div>
      <p class="help">${rows.length} sale${rows.length === 1 ? '' : 's'}${median(pua) ? ' · median ' + money(median(pua)) + ' per usable acre' : ''}${median(psf) ? ' · median ' + money(median(psf)) + ' per site sq ft' : ''} · subject site ${sub.site ? int(sub.site) + ' sq ft' : 'not known yet'}. “Like the subject” = site ½ to 2 × the subject's, sold in the last 5 years. Tick <b>Use</b> for the sales you rely on for the site value.</p>
      <div class="tablewrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Use</th><th>Market area</th><th>Address</th><th>APN</th><th>Sold</th><th class="r">Price</th><th class="r">Site</th><th class="r">Usable</th><th class="r">$/site sf</th><th class="r">$/usable ac</th><th>Zoning</th><th>Source</th><th>Check</th></tr></thead><tbody>
      ${rows.map(x => `<tr${LD.use.includes(x.id) ? ' class="landon"' : ''}><td><input type="checkbox" data-landuse="${esc(x.id)}" ${LD.use.includes(x.id) ? 'checked' : ''} aria-label="Use this sale"></td><td>${esc(x.nbhd || x.area || '')}</td><td>${esc(x.addr || '')}</td><td>${esc(x.apn || '')}</td><td>${esc(x.ym || '')}</td><td class="r">${money(x.price)}</td><td class="r">${x.site ? int(x.site) + ' sf' : ''}</td><td class="r">${x.usable ? (x.usable / 43560).toFixed(2) + ' ac' : ''}</td><td class="r">${x.site ? money(x.price / x.site) : ''}</td><td class="r">${x.usable ? money(x.price / (x.usable / 43560)) : ''}</td><td>${esc(x.zoning || '')}</td><td><small>${esc(String(x.source || '').slice(0, 40))}</small></td><td><small>${esc(x.check || '')}</small></td></tr>`).join('')}</tbody></table></div>
      ${landUsedHTML(J)}`; }
  else if (C) { const ps = C.projects.filter(p => !R.newOnly || !isRemodel(p));
    const v = (p, k) => num(p.s[k]); const rows = ps.map(p => ({ p, bd: v(p, 'Building direct $/SF GLA – indexed'), tot: v(p, 'Total budget – indexed') && num(p.f['GLA (SF) – appraisal']) ? v(p, 'Total budget – indexed') / num(p.f['GLA (SF) – appraisal']) : null, ex: v(p, 'Existing-site basis $/SF GLA – indexed'), gar: v(p, 'Garage – $/SF garage'), pool: v(p, 'Pool & spa'), land: v(p, 'Landscaping & irrigation') })).sort((a, b) => (b.bd || 0) - (a.bd || 0));
    body = `<div class="row"><label class="check"><input type="checkbox" data-refnew="1" ${R.newOnly ? 'checked' : ''}> New construction only (remodels are partial scope – components only)</label>
      <span class="help">${rows.length} project${rows.length === 1 ? '' : 's'} · median building direct ${money(median(rows.map(r => r.bd)))} / sf · existing-site basis ${money(median(rows.map(r => r.ex)))} / sf · indexed with the CCCI${C.indexNote ? ' (' + esc(C.indexNote) + ')' : ''}</span></div>
      <div class="tablewrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Project</th><th>Type</th><th>Budget</th><th>Submarket</th><th>Quality</th><th class="r">GLA</th><th class="r">Building direct $/sf</th><th class="r">Existing-site basis $/sf</th><th class="r">Total budget $/sf</th><th class="r">Garage $/sf</th><th class="r">Pool & spa</th><th class="r">Landscaping</th></tr></thead><tbody>
      ${rows.map(({ p, bd, ex, tot, gar, pool, land }) => `<tr${isRemodel(p) ? ' class="muted"' : ''}><td><b>${esc(p.id)}</b></td><td><small>${esc(String(p.f['Project type'] || ''))}</small></td><td>${esc(String(p.f['Budget date'] || '').slice(0, 7))}</td><td><small>${esc(String(p.f['Submarket'] || ''))}</small></td><td>${esc(String(p.f['Quality rating'] || ''))}</td><td class="r">${int(num(p.f['GLA (SF) – appraisal']))}</td><td class="r">${bd ? money(bd) : ''}</td><td class="r">${ex ? money(ex) : ''}</td><td class="r">${tot ? money(tot) : ''}</td><td class="r">${gar ? money(gar) : ''}</td><td class="r">${pool ? money(pool) : ''}</td><td class="r">${land ? money(land) : ''}</td></tr>`).join('')}</tbody></table></div>
      ${boeHTML(J)}
      <p class="help">From ${esc(C.file)}, your local contractor budgets. Figures are brought to today with the California Construction Cost Index; you noted local costs rose faster, so older budgets read as floors. Your 135 review decisions are not in yet – figures use the suggested handling.</p>`; }
  else body = '<p class="help">Drop your <b>Construction_Cost_Database.xlsx</b> on this page.</p>';
  return `<div class="row"><h2 style="margin:0">Land sales and construction costs <small>your own databases, shared with the cost approach</small></h2><span class="grow"></span><button class="btn sm" data-refclose="1">Hide</button></div>
    <div class="row"><button class="btn sm${R.tab === 'land' ? ' primary' : ''}" data-reftab="land">Land sales (${L.length})</button><button class="btn sm${R.tab === 'cost' ? ' primary' : ''}" data-reftab="cost">Construction costs (${C ? C.projects.length + ' projects' : 'not loaded'})</button></div>${body}`;
}

/* ---- BOE Assessors' Handbook 531 (2026) as her check beside her own budgets ---- */
function boeTables(type) { return BOE2026.tables.filter(t => /Single-family/.test(t.part) && t.type === type && t.construction === 'D'); }
function boeRate(type, shape, cls, sf) {   // $/sf at this size, straight line between the handbook's size columns
  const t = boeTables(type).find(x => x.shape === 'SHAPE ' + shape); if (!t || !t.rows[cls]) return null; const A = t.areas, V = t.rows[cls];
  const pts = A.map((a, i) => [a, V[i]]).filter(p => p[1] !== null && p[1] !== undefined); if (!pts.length) return null;
  if (sf <= pts[0][0]) return { rate: pts[0][1], t, note: 'smallest size in the table' }; if (sf >= pts[pts.length - 1][0]) return { rate: pts[pts.length - 1][1], t, note: 'largest size in the table (' + int(pts[pts.length - 1][0]) + ' sf)' };
  for (let i = 1; i < pts.length; i++) if (sf <= pts[i][0]) { const [a0, v0] = pts[i - 1], [a1, v1] = pts[i]; return { rate: v0 + (v1 - v0) * (sf - a0) / (a1 - a0), t, note: '' }; }
  return null; }
function boePercentGood(life, age) { const T = BOE2026.percentGood[life] || BOE2026.percentGood[String(life)]; if (!T) return null; const ages = Object.keys(T).map(Number).sort((a, b) => a - b);
  if (age <= 0) return 100; let lo = ages[0]; for (const a of ages) { if (a <= age) lo = a; } const hi = ages.find(a => a >= age); if (hi === undefined) return T[ages[ages.length - 1]]; if (hi === lo) return T[lo]; return Math.round(T[lo] + (T[hi] - T[lo]) * (age - lo) / (hi - lo)); }
function boeHTML(J) {
  const B = app.boe = app.boe || {}; const S = subjFacts(J); const sf = num(B.sf) || num(S.gla) || null; const type = B.type || 'Modern, post-1990', shape = B.shape || 'A', cls = B.cls || '';
  const loc = 1.40; const classes = (boeTables(type)[0] || { rows: {} }); const r = cls && sf ? boeRate(type, shape, cls, sf) : null;
  const age = num(B.age) ?? (S.year ? new Date().getFullYear() - num(S.year) : null); const life = 60; const pg = age !== null ? boePercentGood(life, age) : null;
  const myMed = app.costDb ? median(app.costDb.projects.filter(p => !isRemodel(p)).map(p => num(p.s['Building direct $/SF GLA – indexed']))) : null;
  return `<div class="card notice" style="margin-top:12px"><b>Check against the BOE Assessors' Handbook 531 (2026)</b> <small class="muted">your occasional check – your own budgets come first</small>
    <div class="row" style="margin-top:6px"><label>Type <select data-boe="type">${['Conventional', 'Modern, pre-1990', 'Modern, post-1990'].map(t => `<option ${t === type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Shape <select data-boe="shape">${['A', 'B', 'C', 'D'].map(s => `<option ${s === shape ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>Class <select data-boe="cls"><option value="">pick (AH 531A)</option>${Object.keys(classes.rows).map(c => `<option ${c === cls ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label>Living area <input class="txt xs" data-boe="sf" value="${sf || ''}" style="width:6em"></label>
      <label>Age (years) <input class="txt xs" data-boe="age" value="${age ?? ''}" style="width:4em"></label></div>
    ${r ? `<p><b>${money(r.rate)}</b> / sf (D construction, shape ${esc(shape)}, ${esc(cls)}, ${int(sf)} sf${r.note ? ' – ' + esc(r.note) : ''}; AH 531 p. ${r.t.pages.join(', ')}) × <b>${loc.toFixed(2)}</b> Santa Barbara south-zone location factor (p. 6) = <b>${money(r.rate * loc)}</b> / sf · ${money(r.rate * loc * sf)} for ${int(sf)} sf.
      ${myMed ? ` Your local new-construction budgets: median building direct <b>${money(myMed)}</b> / sf.` : ''}</p>` : '<p class="help">Pick the class (AH 531A describes each one) to see the handbook cost.</p>'}
    ${pg !== null ? `<p>BOE normal percent good, ${life}-year life (single-family, classes 6–10), age ${age}: <b>${pg}%</b> (AH 531 p. 83–84) – physical wear only; your effective age and any functional or external obsolescence are yours.</p>` : ''}
    <p class="help">What each class includes is described in AH 531A (a separate BOE publication). The handbook lists extraordinary permits and fees and climate-zone requirements as additional adjustments (p. 6) and asks appraisers to research local costs – your budgets are that research. Pools per the handbook: concrete $94–$173 / sf (typical 440 sf pool $113–$161 / sf), p. 63.</p></div>`;
}
