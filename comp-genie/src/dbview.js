/* ===== My databases (her ask Oct 21 2026): one place for the files that feed every assignment – CSV, PDF, Excel, the archive.
   Opened as comp-genie/?view=db (the hub's "My databases" tab shows it). Per-order files stay in the order's Documents. ===== */
const DBV = new URLSearchParams(location.search).get('view') === 'db';
function dbViewHTML() {
  const add = (label, accept) => `<label class="btn primary">${label}<input type="file" multiple accept="${accept}" data-act="files" hidden></label>`;
  const ok = (on, txt) => `<span class="dbst ${on ? 'on' : 'off'}">${on ? '✓ ' : ''}${txt}</span>`;
  const landN = (app.land || []).length, cost = app.costDb, cortN = (app.cort || []).length;
  const cortDates = cortN ? (() => { const d = app.cort.map(r => r.saleDate || r.recDate || r.date || '').filter(Boolean).sort(); return d.length ? ` · ${showDate(d[0])} to ${showDate(d[d.length - 1])}` : ''; })() : '';
  const cards = [
    ['Comp archive (your ACI reports)', ARCH.loaded ? ok(true, `${ARCH.rows.length.toLocaleString()} records`) : ok(false, 'not loaded in this browser'),
      'Every comparable and subject from your past ACI reports – the comps you used, their adjustments and notes.', 'Comps considered (your archive column), History, grouped sales, sensitivity',
      add('Add the archive (Comp Archive.json.gz)', '.gz,.json') + (ARCH.loaded ? ' <button class="btn" data-dbcopen="arch">Look inside</button>' : '') + (ARCH.loaded ? ` <button class="btn" data-act="archphotos">${AP.state === 'ok' ? 'Archive photos ✓ – reconnect' : 'Connect the archive photos folder'}</button>` : '')],
    ['CORT weekly closings', cortN ? ok(true, `${cortN.toLocaleString()} sales${cortDates}`) : ok(false, 'none yet'),
      'The recorded sales from your weekly CORT emails – document numbers, buyers and sellers, prices, financing.', 'Sale verification and document numbers on each comp, off-market sales',
      add('Add CORT files (PDF or CSV)', '.pdf,.csv') + (cortN ? ' <button class="btn" data-dbcopen="cort">Look inside</button>' : '')],
    ['Land sales', landN ? ok(true, `${landN.toLocaleString()} sales`) : ok(false, 'none yet'),
      'Vacant land sales from MLS or CRS exports, with your own edits (location, access, view).', 'Cost approach › site value (land sales, extraction)',
      add('Add land sales (your land sales workbook, Excel)', '.xlsx') + (landN ? ' <button class="btn" data-dbcopen="land">Look inside</button>' : '')],
    ['Construction cost database', cost ? ok(true, `${cost.projects.length} projects · ${cost.lines.length.toLocaleString()} budget lines${cost.decisions ? ' · your decisions applied' : ''}`) : ok(false, 'not loaded'),
      'Your contractors’ budgets: cost per square foot by area, quality and kind of project.', 'Cost approach › cost new and soft costs',
      add('Add the cost database (Excel .xlsx)', '.xlsx') + (cost ? ' <button class="btn" data-dbcopen="cost">Look inside</button>' : '')],
    ...(typeof rdbCardHTML === 'function' ? [rdbCardHTML()] : []),
    ['MLS market statistics', '<span class="dbst">in the Appraisal Assistant</span>', 'Monthly market numbers for the market conditions section.', 'Order › Market tab (macro → micro)', ''],
    ['Your comments and standard wording', '<span class="dbst">in the Appraisal Assistant</span>', 'Your comment library (OneNote) and the standard paragraphs you reuse.', 'Every comment box (My comments), engagement letters', '']];
  return `<header class="top"><h1>Database center</h1><span class="pill ver">Version ${typeof BUILD !== 'undefined' ? BUILD : ''}</span><span class="grow"></span></header>
  <p class="help">The files that feed every assignment. Add files with the buttons, or drop them anywhere on this page – each one is recognized by what is in it and filed in the right database. <b>Nothing changes until you say so</b>: you see what a file would add, change or remove first, and the version before is kept for undo. Everything stays on this computer. Files for one assignment (engagement letter, contract, CRS report, plans, the iPad workfile) go in that order's <b>① Documents</b> instead.</p>
  <div class="dbcards">${cards.map(([t, st, what, where, btn]) => `<section class="card dbcard"><h2>${t} ${st}</h2><p>${what}</p><p class="dbuse"><b>Used in:</b> ${where}</p>${btn ? `<div class="row">${btn}</div>` : ''}</section>`).join('')}</div>
  <label class="drop" id="drop"><input type="file" multiple data-act="files" hidden><b>Or drop files here</b></label>
  ${typeof dbcIntegrityHTML === 'function' ? dbcIntegrityHTML() : ''}
  ${typeof safetyHTML === 'function' ? safetyHTML() : ''}`;
}
