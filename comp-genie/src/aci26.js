/* =====================================================================
   2.6 copy sheet for ACI (her ask Oct 22 2026). ACI has no import for another program's report, so the octopus writes every
   grid answer in UAD 2.6 form (Fannie Mae Appendix D v1.7, reference/UAD26_Appendix_D_v1.7.txt) in ACI's grid order, each one a
   click-to-copy button, to paste into ACI field by field. A comp from her ACI archive shows her own 2.6 entry when she has not
   changed that line on the grid; anything else is converted from her 3.6 answers and marked so she can check it.
   Nothing is decided here: the values, ratings and adjustments are hers – this only formats them.
   ===================================================================== */
const A26 = { idx: null };
function a26Raw(c) { if (!ARCH.loaded || !c.src || !c.src.arch || !c.src.arch.length) return null; const a = archChosen(c); if (!a) return null;
  if (!A26.idx) { A26.idx = new Map(); const i = ARCH.cols.indexOf('rec_id'); ARCH.rows.forEach((r, k) => A26.idx.set(r[i], k)); } const k = A26.idx.get(a.rec); return k === undefined ? null : archRow(k); }
const a26Own = (c, keys) => { const E = c.edit || {}; return keys.some(k => !blank(E[k]) || !blank(E['grid_' + k]) || !blank(E['pk_' + k])); };
const A26_DIR = { North: 'N', South: 'S', East: 'E', West: 'W', NorthEast: 'NE', NorthWest: 'NW', SouthEast: 'SE', SouthWest: 'SW' };
const A26_LOC = { Residential: 'Res', BusyRoadway: 'BsyRd', CommercialArea: 'Comm', IndustrialArea: 'Ind', GolfCourse: 'GlfCse', BodyOfWater: 'WtrFr', Park: 'AdjPrk', OverheadElectricPowerTransmissionLine: 'AdjPwr', LocalDistributionLine: 'AdjPwr', PublicTransportationHub: 'PubTrn' };
const A26_VIEW = { Residential: 'Res', Mountain: 'Mtn', Ocean: 'Wtr', Bay: 'Wtr', Lake: 'Wtr', River: 'Wtr', Creek: 'Wtr', Pond: 'Wtr', Reservoir: 'Wtr', Canal: 'Wtr', Cove: 'Wtr', Gulf: 'Wtr', Sound: 'Wtr', Woods: 'Woods', Park: 'Prk', Pastoral: 'Pstrl', Valley: 'Pstrl', GolfCourse: 'Glfvw', Skyline: 'CtySky', CityStreet: 'CtyStr', Industrial: 'Ind' };
const a26Rating = L => L.some(x => x.impact === 'Adverse') ? 'A' : L.some(x => x.impact === 'Beneficial') ? 'B' : 'N';
const a26MY = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})/); return m ? `${m[2]}/${m[1].slice(2)}` : ''; };
function a26Loc(text) { const L = typeof siParse === 'function' ? siParse(text || '') : []; if (!L.length) return ''; const f = []; L.forEach(x => { const a = A26_LOC[x.type] || (x.type === 'Other' ? (x.other || '').replace(/\s+/g, '') : ''); if (a && !f.includes(a) && f.length < 2) f.push(a); }); return [a26Rating(L), ...f, ...(f.length < 2 ? [''] : [])].join(';'); }
function a26View(text) { const L = typeof vwParse === 'function' ? vwParse(text || '') : []; if (!L.length) return ''; const f = []; L.forEach(x => { const a = A26_VIEW[x.type] || (/power|pwr/i.test(x.other || '') ? 'PwrLn' : x.type === 'Other' ? (x.other || '').replace(/\s+/g, '') : ''); if (a && !f.includes(a) && f.length < 2) f.push(a); });
  if (f.length < 2 && L.some(x => x.range === 'Partial') && !f.includes('Res')) f.push('LtdSght'); return [a26Rating(L), ...f, ...(f.length < 2 ? [''] : [])].join(';'); }
function a26Design(F) { const at = /semi/i.test(F.attach || '') ? 'SD' : /attach/i.test(F.attach || '') && !/detach/i.test(F.attach || '') ? 'AT' : 'DT'; const lv = num(F.levels); const st = String(F.style || '').replace(/[^A-Za-z]/g, '');
  return `${at}${lv ? (+lv).toString().replace(/\.0+$/, '') : ''}${st ? ';' + st : ''}`; }
const a26Q = v => (String(v || '').match(/Q[1-6]/i) || [''])[0].toUpperCase(), a26C = v => (String(v || '').match(/C[1-6]/i) || [''])[0].toUpperCase();
function a26Site(sf) { const s = num(sf); if (!s) return ''; return s < 43560 ? `${Math.round(s)} sf` : `${(s / 43560).toFixed(2)} ac`; }
function a26Baths(f, h) { return `${num(f) || 0}.${num(h) || 0}`; }
/* heating / cooling in her 2.6 style (her archive: "FWA C/Air", "FWA None") */
function a26HC(F) { const H = { forcedwarmair: 'FWA', radiant: 'Radiant', baseboard: 'Bsbrd', radiators: 'Rdtrs', gravityair: 'Grvty', minisplit: 'MiniSplit', fireplace: 'Fplc', stove: 'Stove', passivesolar: 'PsvSolar', none: 'None', wallheater: 'Wall', heatpump: 'HtPmp' };
  const C = { centralized: 'C/Air', central: 'C/Air', individual: 'Ind', none: 'None' }; const k = t => String(t || '').toLowerCase().replace(/\(.*?\)|[^a-z]/g, '');
  const h = String(F.heat || '').split(/[,;]\s*/).filter(Boolean).map(x => H[k(x)] || x.trim()).join('/'); const c = String(F.cool || '').split(/[,;]\s*/).filter(Boolean).map(x => C[k(x)] || x.trim()).join('/');
  return [h, c].filter(Boolean).join(' '); }
function a26Bsmt(F) { const fin = num(F.bsmt) || 0, unf = num(F.bsmtUnf) || 0, tot = fin + unf; return tot ? `${Math.round(tot)}sf${fin ? Math.round(fin) + 'sf' : ''}` : '0sf'; }
function a26Garage(c, F) { const rows = c && c.edit && Array.isArray(c.edit.vs) && c.edit.vs.length ? c.edit.vs : null; const n = { ga: 0, gd: 0, gbi: 0, cp: 0, dw: 0 };
  if (rows) rows.forEach(x => { const k = x.t === 'Garage' ? (x.a === 'Detached' ? 'gd' : x.a === 'BuiltIn' ? 'gbi' : 'ga') : x.t === 'Carport' || x.t === 'CommonCarport' ? 'cp' : /Driveway/.test(x.t) ? 'dw' : null; if (k) n[k] += +x.n || 0; });
  else { const gt = String((c ? V(c, 'garageType') : '') || ''); const g = num(F.garage) || 0; n[/detach/i.test(gt) ? 'gd' : /built/i.test(gt) ? 'gbi' : 'ga'] += g; n.cp += num(F.carport) || 0; if (c) n.dw += num(V(c, 'driveway')) || 0; }
  const s = ['ga', 'gd', 'gbi', 'cp', 'dw'].filter(k => n[k]).map(k => n[k] + k).join(''); return s || (c && c.edit && c.edit.vsNone ? 'None' : ''); }
const A26_FIN = { Cash: 'Cash', Conventional: 'Conv', FHA: 'FHA', VA: 'VA', USDARuralDevelopment: 'RH', Private: 'Seller', Seller: 'Seller' };
function a26Fin(F) { const t = String(F.terms || ''); const k = /cash/i.test(t) ? 'Cash' : /fha/i.test(t) ? 'FHA' : /\bva\b/i.test(t) ? 'VA' : /usda|rural/i.test(t) ? 'RH' : /seller|private/i.test(t) ? 'Seller' : /conv/i.test(t) ? 'Conv' : t ? t.slice(0, 12) : '';
  return k ? `${k};${Math.round(num(F.conc) || 0)}` : ''; }
function a26SaleType(F) { if (F.listing) return 'Listing'; const t = String(F.xferTerms || '').toLowerCase(); return /reo|bank/.test(t) ? 'REO' : /short/.test(t) ? 'Short' : /court|foreclos/.test(t) ? 'CrtOrd' : /estate/.test(t) ? 'Estate' : /relocat/.test(t) ? 'Relo' : /related|non.?arm/.test(t) ? 'NonArm' : 'ArmLth'; }
function a26Date(F) { const st = String(F.status || ''); if (/active|coming/i.test(st)) return 'Active'; if (/pending|contract/i.test(st)) return F.contract ? 'c' + a26MY(F.contract) : 'c'; if (/expired/i.test(st)) return 'e' + a26MY(F.listDate);
  if (/withdrawn/i.test(st)) return 'w' + a26MY(F.listDate); const s = a26MY(F.sale); if (!s) return ''; const c = /^\d{4}-\d{2}/.test(String(F.contract || '')) ? 'c' + a26MY(F.contract) : 'Unk'; return `s${s};${c}`; }
function a26DataSrc(c, F) { const mls = c ? V(c, 'mls') : ''; const dom = F.dom === 0 ? 0 : blank(F.dom) ? 'Unk' : Math.round(num(F.dom)); return mls ? `SBMLS #${mls};DOM ${dom}` : (F.offMls ? `Off market;DOM 0` : ''); }   // her ACI form: "SBMLS #26-1392;DOM 148"
/* her verification line in ACI: the recorded document number and date ("#25286 7/24/26") */
function a26Verify(c, F) { const DN = typeof docNoOf === 'function' ? docNoOf(c) : null; const dn = DN ? (typeof docShort === 'function' ? docShort(DN.doc) : DN.doc) : ((c.src && c.src.cort && c.src.cort[c.cortPick || 0] && c.src.cort[c.cortPick || 0].doc) || ''); const cr = (c.src && c.src.cort && c.src.cort[0]) || null; const d = (cr && (cr.recDate || cr.saleDate)) || F.sale || ''; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return dn ? `#${String(dn).replace(/^#/, '')}${m ? ` ${+m[2]}/${+m[3]}/${m[1].slice(2)}` : ''}` : (F.listing ? 'Active' : ''); }
/* the grid rows in ACI's (1004) order: [label, value(F, c, raw, isSubj), grid lines whose $ adjustments sum here] */
const A26_ROWS = [
  ['Proximity to subject', (F, c) => { if (!c) return ''; const p = proximity(c, app.job); return p ? `${p.mi.toFixed(2)} miles ${A26_DIR[p.dir] || p.dir}` : ''; }, []],
  ['Sale price', F => F.price ? Math.round(F.price) : '', []],
  ['Sale price / gross liv. area', F => F.price && num(F.gla) ? (F.price / num(F.gla)).toFixed(2) : '', []],
  ['Data source(s)', (F, c) => c ? a26DataSrc(c, F) : '', []],
  ['Verification source(s)', (F, c) => c ? a26Verify(c, F) : '', []],
  ['Sale or financing concessions – line 1', (F, c) => c ? a26SaleType(F) : '', ['xferTerms']],
  ['Sale or financing concessions – line 2', (F, c) => c ? a26Fin(F) : '', ['terms', 'conc']],
  ['Date of sale / time', (F, c) => c ? a26Date(F) : '', ['sale']],
  ['Location', (F, c, R) => R && R.location_raw && !a26Own(c, ['loc', 'locRating', 'locFactors']) ? R.location_raw : a26Loc(F.loc), ['loc']],
  ['Leasehold / fee simple', () => 'Fee Simple', ['rights']],
  ['Site', F => a26Site(F.site), ['site', 'usable']],
  ['View', (F, c, R) => R && R.view_raw && !a26Own(c, ['view', 'viewRating', 'viewTypes']) ? R.view_raw : a26View(F.view), ['view']],
  ['Design (style)', (F, c, R) => R && R.design_raw && !a26Own(c, ['style', 'attach', 'levels', 'stories']) ? R.design_raw : a26Design(F), ['style', 'attach', 'levels']],
  ['Quality of construction', (F, c, R) => R && R.quality_raw && !a26Own(c, ['q', 'quality']) ? R.quality_raw : a26Q(F.q), ['q']],
  ['Actual age', F => { const y = num(F.year); const e = num(String(app.job.subject.eff || '').slice(0, 4)) || new Date().getFullYear(); return y && y > 1700 ? Math.max(0, e - y) : ''; }, ['year']],
  ['Condition', (F, c, R) => R && R.condition_raw && !a26Own(c, ['c', 'condition']) ? R.condition_raw : a26C(F.c), ['c']],
  ['Room count – total', F => num(F.rooms) ?? '', []],
  ['Room count – bedrooms', F => num(F.beds) ?? '', ['beds']],
  ['Room count – baths (full.half)', F => a26Baths(F.full, F.half), ['baths']],
  ['Gross living area (sq ft)', F => num(F.gla) ? Math.round(num(F.gla)) : '', ['gla']],
  ['Basement & finished rooms below grade', F => a26Bsmt(F), ['bsmt', 'bsmtUnf']],
  ['Functional utility', (F, c, R) => R && R.fu_raw && !a26Own(c, ['func']) ? R.fu_raw : (!F.func || /^none/i.test(F.func) ? 'Average' : String(F.func)), ['func']],
  ['Heating / cooling', (F, c, R) => R && R.heating_cooling && !a26Own(c, ['heat', 'cool', 'heatCool']) ? R.heating_cooling : a26HC(F), ['heat', 'cool']],
  ['Energy efficient items', (F, c, R) => R && R.energy_raw && !a26Own(c, ['energy']) ? R.energy_raw : (F.energy || 'None'), ['energy']],
  ['Garage / carport', (F, c, R) => R && R.garage_raw && !a26Own(c, ['garage', 'vs', 'carport', 'vsText']) ? R.garage_raw : a26Garage(c, F), ['garage', 'carport']],
  ['Porch / patio / deck', (F, c, R) => R && R.porch_patio && !a26Own(c, ['porch']) ? R.porch_patio : (F.porch || 'None'), ['porch']],
  /* her three own lines on the ACI grid (from her Oct 2026 report): usable acres/neighborhood · ADU and outbuildings · pool/landscaping */
  ['Usable lot / neighborhood (your line)', F => { const u = num(F.usable); const n = String(F.nbhd || '').replace(/\s+/g, ''); return u || n ? `${u ? (+u).toFixed(2).replace(/0$/, '') : ''}/${n}` : ''; }, ['usable', 'nbhd']],
  ['ADU / outbuildings (your line)', F => String(F.adu || 'None').split(/;\s*/).map(x => x.trim()).filter(x => x && !/^(no|none)$/i.test(x)).join('; ').slice(0, 40) || 'None', ['adu']],
  ['Pool / landscaping (your line)', F => `${String(F.pool || 'None').replace(/,\s*/g, ',').replace(/Inground |Above-ground /g, '').replace(/\s*\/\s*Hot Tub/ig, '').slice(0, 18)}/${String(F.land || 'Average').replace(/\s+/g, '-')}`, ['pool', 'land', 'courts']],
];
function a26Adj(J, c, ids) { if (!c || !ids.length) return null; const rows = adjRows(J).filter(r => ids.includes(r[0]) && (typeof rowShown !== 'function' || rowShown(r, J))); if (!rows.length) return null; let t = 0, any = false;
  rows.forEach(r => { const a = cellAmount(J, c, r); if (a && a.v !== null && a.v !== undefined && !isNaN(a.v)) { t += +a.v; any = true; } }); return any ? Math.round(t) : null; }
function a26HTML(J) { if (!RC) return rcRun(() => a26HTML(J)); const U = usedComps(J); const S = subjFacts(J);
  const cp = (v, tag) => blank(v) || v === '' ? '<span class="muted">–</span>' : `<button type="button" class="a26cp" data-cp="${esc(String(v))}" title="Click to copy">${esc(String(v))}</button>${tag ? `<small class="a26t">${tag}</small>` : ''}`;
  const money0 = v => v === null ? '' : (v > 0 ? '+' : '') + Math.round(v).toLocaleString();
  const head = `<tr><th>ACI grid line</th><th>Subject</th>${U.map(c => `<th>Comp ${c.use}<br><small>${esc(compTitle(c))}</small></th>`).join('')}</tr>`;
  const body = A26_ROWS.map(([lab, fn, ids]) => `<tr><th>${esc(lab)}</th><td>${cp(fn(S, null, null, true))}</td>${U.map(c => { const F = compFacts(c, J), R = a26Raw(c); let v = ''; try { v = fn(F, c, R); } catch (e) { v = ''; }
      const fromArch = R && /Location|View|Design|Quality|Condition|Functional|Heating|Energy|Garage|Porch/.test(lab) && v && [R.location_raw, R.view_raw, R.design_raw, R.quality_raw, R.condition_raw, R.fu_raw, R.heating_cooling, R.energy_raw, R.garage_raw, R.porch_patio].includes(v);
      const a = a26Adj(J, c, ids); return `<td>${cp(v, fromArch ? 'your 2.6' : '')}${a !== null ? `<div class="a26adj">${cp(money0(a), 'adj.')}</div>` : ''}</td>`; }).join('')}</tr>`).join('');
  const net = `<tr><th>Net adjustment / adjusted sale price</th><td></td>${U.map(c => { let n = null, p = null; try { const T = typeof compTotals === 'function' ? compTotals(J, c) : null; if (T) { n = T.net; p = T.adj; } } catch (e) {} return `<td>${n !== null ? cp(money0(n)) : ''} ${p ? cp(Math.round(p)) : ''}</td>`; }).join('')}</tr>`;
  const R = R0(J); const texts = [['Sales comparison comment', G0(J).note], ['Reconciliation comment', R.reconNote], ['Highest and best use', R.hbuNote], ['Site comment', R.cSite], ['Subject / improvements comment', R.cSubject], ['Prior sale and transfer history – comps', R.cCompPrior], ['Prior sale and transfer history – subject', R.cSubjPrior]].filter(([, t]) => String(t || '').trim());
  const val = typeof rptOpinion === 'function' ? rptOpinion(J) : null;
  return `<div class="row"><h2 style="margin:0">2.6 copy sheet for ACI</h2><span class="grow"></span><button class="btn sm" data-a26close="1">Close</button></div>
    <p class="help">Each answer is written the UAD 2.6 way (Fannie Mae Appendix D) in ACI's grid order. Click one to copy it, then paste it into the same box in ACI (Ctrl+V). <b>your 2.6</b> = your own entry from your ACI archive for that comp; the rest are your grid answers written in 2.6 form – check them. Adjustments are your grid's amounts (<b>adj.</b>).</p>
    <div class="tablewrap"><table class="tbl a26">${head}${body}${net}</table></div>
    ${val ? `<p>Indicated value by sales comparison: ${cp(Math.round(num(G0(J).value) || 0) || '')} · Opinion of market value: ${cp(Math.round(val))}</p>` : ''}
    ${texts.length ? `<h3>Comments</h3>${texts.map(([l, t]) => `<div class="a26txt"><b>${esc(l)}</b> <small>${String(t).length.toLocaleString()} characters</small><br>${cp(String(t).trim())}</div>`).join('')}` : ''}
    ${a26CondHTML(J, S)}
    <p class="help">Condos use ACI's condo design and parking formats (e.g. GR2L;Garden, 1g1cv) – not on this sheet yet.</p>`; }
/* her 2.6 Improvements condition line (Appendix D: "C3;Kitchen-updated-one to five years ago;Bathrooms-not updated;<description>").
   Suggested from the iPad's 3.6 answers – the two do not line up exactly (3.6 has no "remodeled", and its time frames differ),
   so every part is a drop-down she sets; the copy button builds the line. */
const A26_LVL = [['not updated', 'not updated'], ['updated', 'updated'], ['remodeled', 'remodeled']];
const A26_TF = ['less than one year ago', 'one to five years ago', 'six to ten years ago', 'eleven to fifteen years ago', 'timeframe unknown'];
function a26Sug(list) { const L = (list || []).filter(x => x && x.upd); if (!L.length) return null; const rank = { LessThanOneYear: 0, OneToFiveYears: 1, FiveToTenYears: 2, TenOrMoreYears: 3 };
  const upd = L.filter(x => x.upd !== 'NotUpdated').sort((a, b) => (rank[a.time] ?? 9) - (rank[b.time] ?? 9))[0]; if (!upd) return { lvl: 'not updated', tf: '' };
  return { lvl: 'updated', tf: { LessThanOneYear: A26_TF[0], OneToFiveYears: A26_TF[1], FiveToTenYears: A26_TF[2], TenOrMoreYears: A26_TF[3] }[upd.time] || A26_TF[4], from: upd }; }
function a26CondHTML(J, S) { const I = (J.subject && J.subject.insp) || {}; const K = J.a26c || (J.a26c = {});
  const k = a26Sug(I.kitU), b = a26Sug(I.bathU); const c = String(S.c || I.c || '').match(/C[1-6]/); 
  const v = (key, dflt) => K[key] !== undefined ? K[key] : dflt;
  const st = { cr: v('cr', c ? c[0] : ''), none15: v('none15', !!(k && b && k.lvl === 'not updated' && b.lvl === 'not updated')), kl: v('kl', k ? k.lvl : 'not updated'), kt: v('kt', k ? k.tf : ''), bl: v('bl', b ? b.lvl : 'not updated'), bt: v('bt', b ? b.tf : ''), txt: v('txt', '') };
  const sel = (key, opts, cur) => `<select data-a26c="${key}">${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${cur === val ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  const part = (lab, l, t) => l === 'not updated' ? `${lab}-not updated` : `${lab}-${l}-${t || 'timeframe unknown'}`;
  const line = `${st.cr || '[C rating]'};${st.none15 ? 'No updates in the prior 15 years' : part('Kitchen', st.kl, st.kt) + ';' + part('Bathrooms', st.bl, st.bt)};${String(st.txt).trim() || '[enter description of property condition]'}`;
  const note = [k && k.from ? `kitchen: iPad says ${camelWords(k.from.upd).toLowerCase()}, ${camelWords(k.from.time || '').toLowerCase() || 'no time frame'}` : '', b && b.from ? `bathrooms: iPad says ${camelWords(b.from.upd).toLowerCase()}, ${camelWords(b.from.time || '').toLowerCase() || 'no time frame'}` : ''].filter(Boolean).join(' · ');
  return `<h3>Improvements condition line (subject)</h3>
    <p class="help">Appendix D format. Suggested from your iPad answers${note ? ' (' + esc(note) + ')' : ''} – 3.6 has no “remodeled” and its time frames are not the same as 2.6, so check each part. “10 or more years” could be over 15 years.</p>
    <div class="row a26cond">${sel('cr', ['', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'], st.cr)}
      <label class="check"><input type="checkbox" data-a26c="none15" ${st.none15 ? 'checked' : ''}> No updates in the prior 15 years</label>
      ${st.none15 ? '' : `<span>Kitchen ${sel('kl', A26_LVL, st.kl)} ${st.kl === 'not updated' ? '' : sel('kt', A26_TF, st.kt || A26_TF[4])}</span><span>Bathrooms ${sel('bl', A26_LVL, st.bl)} ${st.bl === 'not updated' ? '' : sel('bt', A26_TF, st.bt || A26_TF[4])}</span>`}</div>
    <label class="fld"><span>Description of the condition (yours)</span><textarea rows="2" data-a26c="txt">${esc(st.txt)}</textarea></label>
    <p>${String(st.txt).trim() && st.cr ? '' : '<small class="warnTxt">Fill in the [brackets] before you copy. </small>'}<button type="button" class="a26cp" data-cp="${esc(line)}">${esc(line)}</button></p>`; }
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || t.dataset.a26c === undefined || !app.job) return; const K = app.job.a26c || (app.job.a26c = {});
  const k = t.dataset.a26c; K[k] = t.type === 'checkbox' ? t.checked : t.value; save(); const sc = document.querySelector('.a26sheet'); const y = sc ? sc.scrollTop : 0; a26Open(); const sc2 = document.querySelector('.a26sheet'); if (sc2) sc2.scrollTop = y; });
function a26Open() { if (!app.job) return; let bg = document.getElementById('a26Bg'); if (!bg) { bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'a26Bg'; document.body.appendChild(bg); } bg.innerHTML = `<div class="sheet a26sheet">${a26HTML(app.job)}</div>`; }
document.addEventListener('click', async e => { const t = e.target.closest && e.target.closest('[data-a26open],[data-a26close],.a26cp'); if (!t) return;
  if (t.dataset.a26open) { a26Open(); return; } if (t.dataset.a26close) { const bg = document.getElementById('a26Bg'); if (bg) bg.remove(); return; }
  const v = t.dataset.cp; try { await navigator.clipboard.writeText(v); } catch (er) { const ta = document.createElement('textarea'); ta.value = v; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  t.classList.add('done'); toast('Copied: ' + v.slice(0, 60), 1500); });
