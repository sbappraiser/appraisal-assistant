// Step 6: one full test report through the octopus – intake on the hub, then tentacles 2–9 in the genie, then the SFREP file and every check.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
import fs from 'fs';
const D = '/tmp/claude-0/-home-claude/42748c0a-62f2-5f4a-bc48-7275f362e257/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
await ctx.route(/tile\.openstreetmap\.org|nationalmap\.gov|arcgisonline|basemaps/, r => r.fulfill({ path: D + 'tile.png', headers: { 'access-control-allow-origin': '*' } }));
await ctx.route(/nominatim/, r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ lat: '34.44' + Math.floor(Math.random() * 90 + 10), lon: '-119.7' + Math.floor(Math.random() * 900 + 100) }]) }));
await ctx.route(/hazards\.fema\.gov|api\.anthropic/, r => r.fulfill({ status: 500, body: '' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('hub: ' + e.message)); p.on('dialog', d => d.accept().catch(() => {}));
const log = (...a) => console.log(...a);
await p.goto('http://localhost:8794/hub/index.html'); await p.waitForTimeout(1500);
// ---- 1 Intake (the hub) ----
await p.evaluate(() => { startNewOrder(); showTab('letter'); const f = (id, v) => { const e = document.getElementById(id); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; };
  f('f_fileNo', 'Test6-1'); f('f_address', '5464 Berkeley Rd'); f('f_lenderCo', 'TEST Bank'); f('f_borrower', 'TEST Borrower'); f('f_owner', 'TEST Owner'); f('f_fee', '850'); f('f_purpose', 'Refinance');
  f('f_effDate', '2026-10-15'); f('f_inspDate', '2026-10-15'); f('f_apSales', true); f('f_apCost', true); f('f_apIncome', false); f('f_rent', false); f('f_otherUsers', '');
  cur = readForm(); update(); saveLetter(true); octoMark(); });
await p.waitForTimeout(800);
log('1 Intake saved:', await p.evaluate(() => JSON.stringify({ file: cur.fileNo, addr: cur.address, cost: cur.apCost, done: oDone(cur) })));
// ---- 3 Market (hub tab): her market-area search CSV ----
await p.click('nav.octo [data-tent="3"]'); await p.waitForTimeout(800);
await p.setInputFiles('#mkFile', [D + 'gn/mac.csv']); await p.waitForTimeout(2500);
for (const [k, v] of [['boundary', 'TEST: Goleta Valley – north of Hollister Ave, south of the foothills, between Patterson and Glen Annie.'], ['criteria', 'TEST: SFR, 1,500–2,300 sq ft, 12 months.']]) { const e = await p.$(`textarea[data-mk="${k}"]`); if (e) { await e.fill(v); await e.dispatchEvent('input'); await e.dispatchEvent('change'); } }
await p.waitForTimeout(800); log('3 market:', await p.evaluate(() => JSON.stringify(cur.market && cur.market.uad ? Object.fromEntries(Object.entries(cur.market.uad).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 20) : v])) : null)));
// ---- 2 Subject: the genie opens in the hub ----
await p.click('nav.octo [data-tent="2"]'); await p.waitForTimeout(5000);
const fr = p.frame({ url: /comp-genie\/index/ }); fr.on && 0; p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 150)); });
log('2 genie page:', await fr.evaluate(() => typeof pageName === 'function' ? pageName(app.stage) : app.stage), '| order linked:', await fr.evaluate(() => !!(typeof orderOf === 'function' && orderOf(app.job))));
await fr.setInputFiles('#subjCard input[data-act="files"]', [D + 'gn/t/wfb.zip']); await p.waitForTimeout(12000);
await fr.evaluate(() => document.querySelectorAll('.sheet-bg,.sheetbg').forEach(x => x.remove()));
log('   workfile:', await fr.evaluate(() => JSON.stringify({ insp: !!app.job.subject.insp, gla: (app.job.subject.insp || {}).gla, addr: app.job.subject.address || app.job.subject.addr })));
// Subject details (office part) – answered like she would
await fr.evaluate(() => { genieGo('setup'); }); await p.waitForTimeout(800);
const pick = async (k, v) => { const s = `select[data-rpt="${k}"]`; if (await fr.$(s)) { await fr.selectOption(s, v).catch(() => {}); await p.waitForTimeout(150); } else log('   (no field', k + ')'); };
const type = async (k, v) => { const s = `[data-rpt="${k}"]`; const e = await fr.$(s); if (!e) { log('   (no field', k + ')'); return; } await e.fill(v); await e.dispatchEvent('change'); await p.waitForTimeout(150); };
await fr.evaluate(() => { const R = R0(app.job); R.legal = R.legal || 'LOT 12 OF TRACT 1234, IN THE CITY OF SANTA BARBARA, COUNTY OF SANTA BARBARA, STATE OF CALIFORNIA (TEST)'; save(); rptRedraw(); });
await pick('zoneComp', 'Legal'); await type('siteDim', '75 x 140'); await pick('ease', 'false'); await pick('encr', 'false');
await pick('listedYear', 'false'); await pick('vcond', 'AsIs'); await pick('asIsCond', 'C3');
await fr.evaluate(() => { const R = R0(app.job); R.hbu = { legal: true, phys: true, fin: true, max: true }; R.hbuPresent = 'true'; R.hbuNote = R.hbuNote || 'TEST: the present use as a single-family residence is the highest and best use as improved.'; R.sowAddlScope = 'false'; save(); rptRedraw(); });
log('   still needed on 2:', await fr.evaluate(() => [...document.querySelectorAll('#setupCard .rptneed li')].map(l => l.textContent.trim().slice(0, 60)).join(' | ') || 'nothing'));
// ---- 3 Market: MLS sales ----
await fr.setInputFiles('input[data-act="files"] >> nth=-1', [D + 'gn/mi.csv']); await p.waitForTimeout(3000);
await fr.evaluate(() => document.querySelectorAll('.sheet-bg,.sheetbg').forEach(x => x.remove()));
// ---- 4 Sales comparison: 3 closed sales, her picks, rates and value ----
const info = await fr.evaluate(async () => { const J = app.job; const sold = J.comps.filter(c => /closed|sold/i.test(V(c, 'status') || '') && V(c, 'salePrice')).slice(0, 3); sold.forEach((c, i) => { c.use = i + 1; c.confirmed = true; c.edit = c.edit || {}; if (!num(V(c, 'gla'))) c.edit.gla = [1780, 1920, 1850][i]; if (!num(V(c, 'usableSf'))) c.edit.usableSf = num(V(c, 'siteSf')) || 7000; });
  const G = G0(J); G.rates.gla = 350; G.weights = {}; sold.forEach((c, i) => G.weights[c.id] = i === 0 ? 'Most' : 'Less');
  sold.forEach(c => { [['attach', 'Detached'], ['style', 'Ranch'], ['heat', 'Forced warm air'], ['cool', 'None'], ['status', 'Settled sale'], ['q', 'Q4'], ['c', 'C3'], ['energy', 'None'], ['constr', 'Site built'], ['streetAccess', 'Local road | Asphalt']].forEach(([k, v]) => { try { pkSave(J, c.id, k, v); } catch (e) {} }); });
  await saveNow(); render(); return { comps: J.comps.length, used: sold.length, ids: sold.map(c => c.id) }; });
log('4 comps:', JSON.stringify(info));
await fr.evaluate(() => { const J = app.job, G = G0(J); const vals = usedComps(J).map(c => { try { return adjustedPrice(c, J); } catch (e) { return num(V(c, 'salePrice')); } }).filter(Boolean); G.value = Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length || 1)) / 5000) * 5000 || 2000000; G.note = 'TEST: the comparables bracket the subject; most weight to comp 1.'; save(); render(); });
// ---- 5 Cost ----
await fr.evaluate(() => { const J = app.job; J.costOn = true; const K = costJob(J); if (K.lines[0]) { K.lines[0].rate = 650; if (!K.lines[0].area) K.lines[0].area = 1839; } K.effAge = 20; if (K.site[0]) K.site[0].amt = 60000; J.land = { use: [], f: {}, value: 1200000, comment: 'TEST: site value by allocation.' }; K.siteMethod = 'Allocation'; save(); render(); });
// ---- 7 Reconciliation, 8 certifications ----
await fr.evaluate(() => { const R = R0(app.job); R.expLow = 30; R.expHigh = 90; R.reconNote = 'TEST: most weight to the sales comparison approach.'; R.addlCert = 'false'; R.priorSvc = 'false'; R.reconsider = 'false'; save(); rptRedraw && rptRedraw(); });
// ---- 9 Exhibits: location map ----
await fr.evaluate(() => genieGo('exh')); await p.waitForTimeout(600);
if (await fr.$('[data-map=loc]')) { await fr.click('[data-map=loc]'); await fr.waitForFunction(() => !MAPS.busy, null, { timeout: 60000 }).catch(() => {}); }
// ---- the octopus marks ----
await p.waitForTimeout(800);
log('octopus ✓:', await p.evaluate(() => [...document.querySelectorAll('nav.octo [data-tent]')].map(b => b.dataset.tent + (b.querySelector('.tck').textContent ? '✓' : '·')).join(' ')));
log('genie steps:', await fr.evaluate(() => pathSteps(app.job).map(s => s.n + ':' + (s.done ? '✓' : '·') + s.l.slice(0, 14)).join(' | ')));
// ---- 8 the SFREP file and the checks ----
await fr.evaluate(() => { const J = app.job; gridReview(J).forEach(f => { J.revOk = J.revOk || {}; }); });
const r = await fr.evaluate(async () => { const R = await buildFullReport(app.job); if (R.err) return { err: R.err }; const z = await makeZip(R.entries); const buf = new Uint8Array(await (z.arrayBuffer ? z.arrayBuffer() : z)); let bin = ''; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768)); window.__zip = btoa(bin);
  return { xml: R.xml, names: R.entries.map(e => e.name).filter(n => !/^Images\//.test(n)), imgs: R.entries.filter(e => /^Images\//.test(e.name)).length,
    must: precheckXML(R.xml).filter(o => o.sev === 'Must fix').map(o => o.msg), chk: precheckXML(R.xml).filter(o => o.sev !== 'Must fix').map(o => o.msg),
    grid: precheckGrid(app.job).map(o => o.sev + ': ' + o.msg), rpt: precheckRev(app.job, R.xml).map(o => o.sev + ': ' + o.msg) }; });
if (r.err) log('ERR building:', r.err); else {
  fs.writeFileSync(D + 'cmp/e2e.xml', r.xml); fs.writeFileSync(D + 'TEST Test6-1 5464 Berkeley Rd - Full report SFREP.zip', Buffer.from(await fr.evaluate(() => window.__zip), 'base64')); log('file:', JSON.stringify({ names: r.names, images: r.imgs, kb: Math.round(r.xml.length / 1024) }));
  log('A-1 file check – must fix (' + r.must.length + '):\n  ' + r.must.slice(0, 30).join('\n  ')); log('A-1 file check – other (' + r.chk.length + '):\n  ' + r.chk.slice(0, 15).join('\n  '));
  log('pre-check (grid etc.) (' + r.grid.length + '):\n  ' + r.grid.slice(0, 40).join('\n  ')); if (r.rpt.length) log('report pre-check:\n  ' + r.rpt.slice(0, 30).join('\n  ')); }
log('ERRORS:', errs.length ? errs.slice(0, 10).join('\n') : 'none');
await b.close();
