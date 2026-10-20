/* =====================================================================
   Income approach and rent survey (her request, Oct 20 2026). Gross rent multiplier: comparable rentals give the
   subject's market rent; sales that were rented give the GRM (sale price ÷ monthly rent). Value = market rent × GRM.
   Rentals go on the Rental map (Maps card). Every figure is hers – the page suggests medians and adds up.
   UAD 3.6: APPROACH_TO_VALUE / INCOME_APPROACH / INCOME_APPROACH_DETAIL (GRM, comment, value). The rental
   comparables' own UAD records follow when the UAD 3.6 schema shows where they belong.
   ===================================================================== */
const IN = { open: false };
function incomeJob(J) { J.income = J.income || { grm: [], rent: null, grmUse: null, value: null, comment: null }; J.rentals = J.rentals || []; return J.income; }
function incomeCalc(J) { const K = incomeJob(J); const R = J.rentals.filter(r => r.use);
  const adj = r => (num(r.rent) || 0) + (num(r.adj) || 0); const rents = R.map(adj).filter(Boolean);
  const grms = K.grm.filter(g => g.use !== false && num(g.price) && num(g.rent)).map(g => num(g.price) / num(g.rent));
  const rent = num(K.rent) || median(rents) || null; const grm = num(K.grmUse) || (grms.length ? Math.round(median(grms)) : null);
  return { R, rents, grms, rentMed: median(rents), grmMed: grms.length ? median(grms) : null, rent, grm, ind: rent && grm ? rent * grm : null, adj }; }
function incomeDraft(J) { const K = incomeJob(J), X = incomeCalc(J);
  let t = 'The income approach was developed using a gross rent multiplier (GRM).';
  if (X.R.length) t += ` ${X.R.length} comparable rental${X.R.length > 1 ? 's' : ''} indicate${X.R.length > 1 ? '' : 's'} adjusted monthly rents of ${money(Math.min(...X.rents))} to ${money(Math.max(...X.rents))} (median ${money(X.rentMed)}); the subject's market rent is estimated at ${money(X.rent)} per month.`;
  if (X.grms.length) t += ` ${X.grms.length} sale${X.grms.length > 1 ? 's' : ''} with known rents indicate GRMs of ${Math.round(Math.min(...X.grms))} to ${Math.round(Math.max(...X.grms))} (median ${Math.round(X.grmMed)}); a GRM of ${X.grm} was applied.`;
  if (X.ind) t += ` ${money(X.rent)} × ${X.grm} = ${money(X.ind)}.`;
  t += ' Single-family homes in this market are typically purchased for owner occupancy, so the income approach is given less weight than the sales comparison approach.';
  return t.slice(0, 5000); }
function incomeHTML(J) {
  const o = typeof orderOf === 'function' ? orderOf(J) : null; const on = J.incomeOn ?? !!(o && (o.apIncome || o.rent));
  if (!on) return `<div class="row"><h2 style="margin:0">Income approach and rent survey</h2><span class="grow"></span><button class="btn sm" data-inc="on">Develop the income approach</button></div><p class="help">Not developed for this assignment${o ? ` (the order says it ${o.apIncome ? 'is' : 'is not'} needed)` : ''}. Opens a rent survey (comparable rentals, mapped) and a gross rent multiplier.</p>`;
  const K = incomeJob(J), X = incomeCalc(J); const nf = v => blank(v) || v === '' ? '' : Math.round(+v).toLocaleString();
  const rrow = (r, i) => `<tr><td><input type="checkbox" data-rt="${r.id}|use" ${r.use ? 'checked' : ''}></td><td>Rental ${i + 1}</td><td><input class="txt sm" data-rt="${r.id}|addr" value="${esc(r.addr || '')}" placeholder="Address" style="width:13em"><input class="txt xs" data-rt="${r.id}|city" value="${esc(r.city || '')}" placeholder="City" style="width:7em"></td>
    <td><input class="txt xs" data-rt="${r.id}|date" value="${esc(r.date || '')}" placeholder="MM/YYYY" style="width:6em"></td><td><input class="txt xs num" data-rt="${r.id}|beds" value="${esc(r.beds ?? '')}" style="width:3em">/<input class="txt xs num" data-rt="${r.id}|baths" value="${esc(r.baths ?? '')}" style="width:3em"></td>
    <td><input class="txt xs num" data-rt="${r.id}|gla" value="${nf(r.gla)}" style="width:5em"></td><td><input class="txt xs num" data-rt="${r.id}|rent" value="${nf(r.rent)}" style="width:6em"></td><td><input class="txt xs num" data-rt="${r.id}|adj" value="${nf(r.adj)}" placeholder="±" style="width:6em"></td>
    <td class="r"><b>${money(X.adj(r))}</b></td><td><input class="txt xs" data-rt="${r.id}|src" value="${esc(r.src || '')}" placeholder="MLS #, owner, agent" style="width:9em"></td><td><button class="btn xs" data-rtdel="${r.id}">✕</button></td></tr>`;
  const grow = g => `<tr><td><input type="checkbox" data-gm="${g.id}|use" ${g.use !== false ? 'checked' : ''}></td><td><input class="txt sm" data-gm="${g.id}|addr" value="${esc(g.addr || '')}" style="width:14em"></td><td><input class="txt xs num" data-gm="${g.id}|price" value="${nf(g.price)}" style="width:8em"></td><td><input class="txt xs num" data-gm="${g.id}|rent" value="${nf(g.rent)}" style="width:6em"></td><td class="r">${num(g.price) && num(g.rent) ? (num(g.price) / num(g.rent)).toFixed(0) : ''}</td><td><button class="btn xs" data-gmdel="${g.id}">✕</button></td></tr>`;
  const cm = K.comment != null ? K.comment : incomeDraft(J);
  return `<div class="row"><h2 style="margin:0">Income approach and rent survey <small>gross rent multiplier · UAD 3.6 Income Approach</small></h2><span class="grow"></span><button class="btn sm ghost" data-inc="off">Not developed</button></div>
    <h3>Comparable rentals <small>(tick the ones you use – they go on the Rental map)</small></h3>
    <div class="tablewrap"><table class="tbl"><thead><tr><th>Use</th><th></th><th>Address</th><th>Leased</th><th>Bd/Ba</th><th>Sq ft</th><th>Rent / mo</th><th>Your adjustment</th><th class="r">Adjusted</th><th>Source</th><th></th></tr></thead><tbody>${J.rentals.map(rrow).join('')}</tbody></table></div>
    <div class="row"><button class="btn sm" data-rtadd="1">+ Add a rental</button><label class="btn sm">Drop an MLS lease CSV<input type="file" accept=".csv" data-rtcsv="1" hidden></label><span class="help">${X.rents.length ? `Adjusted rents ${money(Math.min(...X.rents))} – ${money(Math.max(...X.rents))}, median ${money(X.rentMed)}.` : ''}</span></div>
    <h3>Gross rent multiplier <small>sales that were rented: sale price ÷ monthly rent</small></h3>
    <table class="tbl"><thead><tr><th>Use</th><th>Address</th><th>Sale price</th><th>Rent / mo</th><th class="r">GRM</th><th></th></tr></thead><tbody>${K.grm.map(grow).join('')}</tbody></table>
    <div class="row"><button class="btn sm" data-gmadd="1">+ Add a rented sale</button><span class="help">${X.grms.length ? `GRMs ${Math.round(Math.min(...X.grms))} – ${Math.round(Math.max(...X.grms))}, median ${Math.round(X.grmMed)}.` : ''}</span></div>
    <div class="gsum"><label><span>Subject market rent / month</span><input class="txt" data-ik="rent" value="${nf(K.rent)}" placeholder="${X.rentMed ? Math.round(X.rentMed).toLocaleString() : '$'}"></label><label><span>GRM used</span><input class="txt" data-ik="grmUse" value="${K.grmUse ?? ''}" placeholder="${X.grmMed ? Math.round(X.grmMed) : ''}"></label>
      <div><span>Indicated value</span><b>${X.ind ? money(X.ind) : '–'}</b></div><label><span>Your value by the income approach</span><input class="txt" data-ik="value" value="${nf(K.value)}" placeholder="${X.ind ? (Math.round(X.ind / 1000) * 1000).toLocaleString() : '$'}"></label></div>
    <label class="fld"><span>Income approach comment <small>${cm.length.toLocaleString()} / 5,000 characters – read and edit it</small> ${typeof cmtBtn === 'function' ? cmtBtn('textarea[data-ik="comment"]') : ''}</span><textarea class="txt" rows="5" data-ik="comment">${esc(cm)}</textarea></label>
    <div class="row"><button class="btn sm ghost" data-inc="redraft">Write it again from the figures</button></div>
    <p class="help">Goes into the Full report for SFREP: GRM, comment and your value. Make the <b>Rental map</b> in the Maps card.</p>`;
}
function incomeRedraw() { const c = $('#incomeCard'); if (c && app.job) { const y = window.scrollY; c.innerHTML = incomeHTML(app.job); window.scrollTo(0, y); } if (typeof mapsRender === 'function') mapsRender(); }
document.addEventListener('click', e => { const t = e.target.closest('[data-inc],[data-rtadd],[data-rtdel],[data-gmadd],[data-gmdel]'); if (!t || !app.job) return; const J = app.job; const K = incomeJob(J);
  if (t.dataset.inc === 'on') J.incomeOn = true; else if (t.dataset.inc === 'off') J.incomeOn = false; else if (t.dataset.inc === 'redraft') K.comment = null;
  else if (t.dataset.rtadd) J.rentals.push({ id: uid(), use: true, city: J.subject.city || '' }); else if (t.dataset.rtdel) J.rentals = J.rentals.filter(r => r.id !== t.dataset.rtdel);
  else if (t.dataset.gmadd) K.grm.push({ id: uid(), use: true }); else if (t.dataset.gmdel) K.grm = K.grm.filter(g => g.id !== t.dataset.gmdel);
  save(); incomeRedraw(); });
document.addEventListener('change', async e => { const t = e.target; if (!app.job) return; const J = app.job; const K = incomeJob(J); const n = v => num(String(v).replace(/[$,\s]/g, ''));
  if (t.dataset.rtcsv && t.files[0]) { try { const rows = parseMlsCsv(await readText(t.files[0])); let k = 0;
      rows.forEach(r => { if (J.rentals.some(x => x.mls && x.mls === r.mls)) return; J.rentals.push({ id: uid(), use: true, mls: r.mls, addr: r.addr, city: r.city || '', zip: r.zip || '', lat: num(r.lat) || null, lon: num(r.lon) || null, beds: r.beds, baths: r.bathsTotal, gla: r.gla,
        rent: r.salePrice || r.listPrice, date: (r.saleDate || r.listDate || '').slice(0, 7).replace(/^(\d{4})-(\d{2})$/, '$2/$1'), src: 'MLS ' + r.mls }); k++; });
      toast(`${k} rental${k === 1 ? '' : 's'} added from ${t.files[0].name} – check each rent (the lease price) and untick any that do not compete`, 7000); } catch (er) { toast(er.message || 'Could not read that CSV'); } t.value = ''; save(); incomeRedraw(); return; }
  if (t.dataset.rt) { const [id, k] = t.dataset.rt.split('|'); const r = J.rentals.find(x => x.id === id); if (!r) return; r[k] = k === 'use' ? t.checked : ['addr', 'city', 'date', 'src'].includes(k) ? t.value : (t.value.trim() === '' ? null : n(t.value)); if (k === 'addr' || k === 'city') { r.lat = null; r.lon = null; } }
  else if (t.dataset.gm) { const [id, k] = t.dataset.gm.split('|'); const g = K.grm.find(x => x.id === id); if (!g) return; g[k] = k === 'use' ? t.checked : k === 'addr' ? t.value : (t.value.trim() === '' ? null : n(t.value)); }
  else if (t.dataset.ik) { const k = t.dataset.ik; K[k] = k === 'comment' ? t.value : (t.value.trim() === '' ? null : n(t.value)); if (k === 'comment') { save(); return; } }
  else return; save(); incomeRedraw(); });
/* rentals with no latitude / longitude: by address, for the Rental map */
async function geocodeRentals(J) { const need = (J.rentals || []).filter(r => r.use && !(r.lat && r.lon) && r.addr); const miss = [];
  for (const r of need) { try { const q = [r.addr, r.city || J.subject.city || 'Santa Barbara', 'CA', r.zip || ''].filter(Boolean).join(', ');
      const a = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(q))).json(); if (a && a[0]) { r.lat = +a[0].lat; r.lon = +a[0].lon; } else miss.push(r.addr); } catch (e) { miss.push(r.addr); }
    await new Promise(z => setTimeout(z, 1100)); }
  if (need.length) save(); return miss; }
function incomeXML(J, VR, child, set) {
  if (!J.incomeOn) return; const K = incomeJob(J), X = incomeCalc(J);
  const IA = child(child(VR, 'APPROACH_TO_VALUE'), 'INCOME_APPROACH'); [...IA.children].filter(k => k.localName === 'VALUATION_APPROACH_EXCLUSION_REASONS').forEach(k => k.remove());
  const d = child(IA, 'INCOME_APPROACH_DETAIL'); if (X.grm) set(d, 'GrossRentMultiplierFactorNumber', Math.round(X.grm));
  set(d, 'IncomeAnalysisCommentDescription', (K.comment != null ? K.comment : incomeDraft(J)).slice(0, 5000)); const v = num(K.value) || (X.ind ? Math.round(X.ind / 1000) * 1000 : null); if (v) set(d, 'ValueIndicatedByIncomeApproachAmount', Math.round(v));
}
