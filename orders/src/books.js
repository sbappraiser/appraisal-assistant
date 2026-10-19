/* =====================================================================
   Bookkeeping, kept minimal (her request, Oct 18 2026)
   Fee from intake → Invoice at delivery (printed / saved as PDF, her letterhead from the letter
   writer) → mark Paid (date, method). Home page: unpaid invoices with days outstanding and a
   follow-up email draft (opens her mail program; nothing is sent by the app), and a printable
   summary for each half year (Jan–Jun, Jul–Dec). Fields live on the order (invNo, invDate, invAmt,
   paidDate, paidMethod, paidAmt, paidRef), so Back up / Restore carry them with the orders.
   ===================================================================== */
const PAY_METHODS = ['Check', 'ACH / bank transfer', 'Credit card', 'Zelle', 'AMC payment', 'Cash', 'Other'];
const n$ = v => { const x = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return isFinite(x) ? x : 0; };
const usd = v => '$' + n$(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const invTotal = o => n$(o.fee) + (o.rent ? n$(o.rentFee) : 0);
const invAmount = o => String(o.invAmt || '').trim() ? n$(o.invAmt) : invTotal(o);
const invBalance = o => Math.max(0, invAmount(o) - n$(o.retainer));
const daysOut = o => o.invDate ? Math.max(0, Math.round((Date.parse(todayISO()) - Date.parse(o.invDate)) / 864e5)) : null;
const isUnpaid = o => !!o.invDate && !o.paidDate && (o.stage || '') !== 'Cancelled';
function billTo(o) {
  const c = (o.clients || [])[0] || {};
  if (o.amcUsed && o.amcCo) return { lines: [o.amcCo, o.amcAddr1, o.amcAddr2].filter(Boolean), email: c.email || '', who: o.amcCo, attn: c.name || '' };
  return { lines: [c.company && c.name ? c.name : '', c.company || c.name, c.addr1, c.addr2].filter(Boolean), email: c.email || '', who: c.company || c.name || '', attn: c.name || '' };
}
function invoiceHTML(o) {
  const A = APPRAISER, T = TYPES[o.type] || {}, B = billTo(o); const rf = ({ uad36: 'UAD 3.6 – new URAR', uad26: 'UAD 2.6', gpar: 'GPAR', other: '' })[o.reportForm] || '';
  const lines = [[`Appraisal of ${o.address || 'the property'}` + (o.format || rf ? ` – ${o.format || rf}` : '') + (T.label ? ` (${T.label})` : ''), n$(o.fee)]];
  if (o.rent && n$(o.rentFee)) lines.push(['Market rent survey', n$(o.rentFee)]);
  if (String(o.invAmt || '').trim() && Math.abs(n$(o.invAmt) - invTotal(o)) > 0.004) lines.push(['Adjustment', n$(o.invAmt) - invTotal(o)]);
  const total = invAmount(o), ret = n$(o.retainer), due = invBalance(o);
  const refs = [['File number', o.fileNo], [o.amcUsed ? 'AMC order / reference ID' : 'Client reference', o.amcRef], ['Loan number', o.loanNo], ['Borrower', o.borrower], [o.amcUsed ? 'Lender / client' : '', o.amcUsed ? ((o.clients || [])[0] || {}).company || ((o.clients || [])[0] || {}).name : ''], ['Effective date', effectiveDate(o) && longDate(effectiveDate(o))]].filter(r => r[0] && r[1]);
  const terms = o.payWhen === 'other' && o.payDue ? o.payDue : 'Due upon receipt.';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${hesc(o.invNo || o.fileNo || '')} - ${hesc(street(o))}</title><style>
    @page { size: letter; margin: 0.7in; } body { font: 14px/1.45 Georgia, 'Times New Roman', serif; color: #111; max-width: 7.1in; margin: 24px auto; }
    .hd { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; } .hd b { font-size: 18px; } h1 { font: 700 26px Arial, sans-serif; letter-spacing: .08em; margin: 0; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; } th, td { padding: 6px 4px; text-align: left; vertical-align: top; } .amt { text-align: right; white-space: nowrap; }
    .items th { border-bottom: 1px solid #111; font: 600 12px Arial, sans-serif; text-transform: uppercase; letter-spacing: .05em; } .items td { border-bottom: 1px solid #ddd; } .tot td { border: 0; } .tot .big { font-weight: 700; font-size: 16px; border-top: 2px solid #111; }
    .two { display: flex; gap: 40px; margin-top: 18px; } .two > div { flex: 1; } .lab { font: 600 11px Arial, sans-serif; text-transform: uppercase; letter-spacing: .06em; color: #555; } .refs td { padding: 2px 4px; } .refs td:first-child { color: #555; width: 45%; }
    .paid { margin-top: 18px; border: 3px solid #0a7a37; color: #0a7a37; font: 700 20px Arial, sans-serif; padding: 8px 14px; display: inline-block; transform: rotate(-2deg); } .foot { margin-top: 28px; font-size: 13px; color: #333; }
    @media print { body { margin: 0 auto; } .noprint { display: none; } }
  </style></head><body>
  <p class="noprint" style="font:14px Arial;background:#fff3e0;border:1px solid #ff8a00;padding:8px 12px;border-radius:8px">In the print window choose <b>Destination: Save as PDF</b>, then Save. Close this tab when done.</p>
  <div class="hd"><div><b>${hesc(A.company)}</b><br>${hesc(A.name)}<br>${hesc(A.addr1)}<br>${hesc(A.addr2)}<br>${hesc(A.phone)} · ${hesc(A.email)}</div><div><h1>INVOICE</h1><table class="refs" style="margin-top:6px;white-space:nowrap"><tr><td>Invoice no.</td><td><b>${hesc(o.invNo || o.fileNo || '')}</b></td></tr><tr><td>Date</td><td>${hesc(longDate(o.invDate || todayISO()))}</td></tr></table></div></div>
  <div class="two"><div><div class="lab">Bill to</div>${B.lines.map(hesc).join('<br>')}${B.email ? '<br>' + hesc(B.email) : ''}</div><div><div class="lab">Assignment</div><table class="refs">${refs.map(r => `<tr><td>${hesc(r[0])}</td><td>${hesc(r[1])}</td></tr>`).join('')}</table></div></div>
  <table class="items"><tr><th>Description</th><th class="amt">Amount</th></tr>${lines.map(l => `<tr><td>${hesc(l[0])}</td><td class="amt">${usd(l[1])}</td></tr>`).join('')}<tr><td>Sales tax</td><td class="amt">$0.00</td></tr></table>
  <table class="tot"><tr><td></td><td class="amt" style="width:40%">Total ${usd(total)}</td></tr>${ret ? `<tr><td></td><td class="amt">Retainer received −${usd(ret)}</td></tr>` : ''}<tr><td></td><td class="amt big">Balance due ${usd(due)}</td></tr></table>
  ${o.paidDate ? `<div class="paid">PAID ${hesc(longDate(o.paidDate))}${o.paidMethod ? ' · ' + hesc(o.paidMethod) : ''}${o.paidRef ? ' · ' + hesc(o.paidRef) : ''}</div>` : ''}
  <div class="foot"><b>Payment terms:</b> ${hesc(terms)} Please make checks payable to ${hesc(A.company)} and include the invoice number.<br>Thank you for the opportunity to be of service.</div>
  </body></html>`;
}
function printWindow(html, what) {
  const w = window.open('', '_blank'); if (!w) { toast('Chrome blocked the new tab – allow pop-ups for this page, then try again', 6000); return null; }
  w.document.open(); w.document.write(html); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 300);
  toast((what || 'It') + ' opened in a new tab – choose Destination: Save as PDF', 6000); return w;
}
const invNoOf = fileNo => { const f = String(fileNo || '').trim(); return f ? (/-inv$/i.test(f) ? f : f + '-inv') : ''; };   // her rule: the file name + "-inv" (brkl5464 → brkl5464-inv)
function deliveredToday() {   // order set to Delivered: the day she signs and sends the report is the invoice date
  if (!$('#f_signDate').value) $('#f_signDate').value = todayISO();
  if (!$('#f_invDate').value) $('#f_invDate').value = $('#f_signDate').value;
  if (!$('#f_invNo').value.trim()) $('#f_invNo').value = invNoOf($('#f_fileNo').value);
  toast('Delivered ' + longDate($('#f_signDate').value) + ' – the invoice is dated that day (Bookkeeping tab)', 5000);
}
function makeInvoice() {
  if (!$('#f_invNo').value.trim()) $('#f_invNo').value = invNoOf($('#f_fileNo').value);
  if (!$('#f_invDate').value) $('#f_invDate').value = $('#f_signDate').value || todayISO();
  cur = readForm(); if (!invAmount(cur)) { toast('Fill in the fee first (Total fee, above)'); $('#f_fee').focus(); return; }
  saveLetter(true); renderBooks(); printWindow(invoiceHTML(cur), 'The invoice');
}
function markPaid() {
  if (!$('#f_paidDate').value) $('#f_paidDate').value = todayISO();
  cur = readForm(); if (!String(cur.paidAmt || '').trim()) { $('#f_paidAmt').value = invBalance(cur).toLocaleString(); }
  if (!cur.invDate) { $('#f_invDate').value = $('#f_signDate').value || $('#f_paidDate').value; if (!$('#f_invNo').value.trim()) $('#f_invNo').value = invNoOf($('#f_fileNo').value); }
  if ($('#f_stage').value !== 'Cancelled') $('#f_stage').value = 'Paid';
  cur = readForm(); saveLetter(true); renderBooks(); renderLetters(); toast('Marked paid – order status set to Paid');
}
function renderBooks() {
  const el = $('#booksNote'); if (!el || !cur) return; const o = readForm(); const tot = invAmount(o);
  $('#f_invAmt').placeholder = tot ? tot.toLocaleString() + ' (the fee)' : 'the fee';
  el.className = 'help' + (isUnpaid(o) && daysOut(o) > 30 ? ' warnTxt' : '');
  el.innerHTML = o.paidDate ? `<b class="ck">✓</b> Paid ${h(longDate(o.paidDate))}${o.paidMethod ? ' by ' + h(o.paidMethod) : ''}${o.paidAmt ? ' · ' + usd(o.paidAmt) : ''}.`
    : o.invDate ? `Invoiced ${h(longDate(o.invDate))} · balance due ${usd(invBalance(o))} · ${daysOut(o)} day${daysOut(o) === 1 ? '' : 's'} outstanding.`
    : tot ? `Not invoiced yet. When you deliver the report, click <b>Make the invoice</b>: it fills in the number (your file number + -inv), the date you signed and delivered the report (today if blank) and ${usd(tot)}${n$(o.retainer) ? ' less the ' + usd(o.retainer) + ' retainer' : ''}.` : 'Fill in the fee above, then make the invoice when you deliver the report.';
}
function followUpMail(o) {
  const B = billTo(o); const first = (B.attn || '').trim().split(/\s+/)[0] || '';
  const sub = `Invoice ${o.invNo || o.fileNo || ''} – ${street(o)}`.replace(/\s+/g, ' ');
  const refs = [o.amcRef && 'reference ' + o.amcRef, o.loanNo && 'loan ' + o.loanNo].filter(Boolean).join(', ');
  const body = `Hello${first ? ' ' + first : ''},\n\nI hope you are well. This is a friendly reminder that invoice ${o.invNo || o.fileNo || ''} for the appraisal of ${o.address || street(o)}${refs ? ' (' + refs + ')' : ''}, dated ${longDate(o.invDate)}, for ${usd(invBalance(o))} is still open.\n\nIf payment is already on its way, thank you, and please disregard this note. Otherwise, please let me know when I can expect it. I am happy to send another copy of the invoice.\n\nThank you,\n${APPRAISER.name}\n${APPRAISER.company}\n${APPRAISER.phone}`;
  return 'mailto:' + encodeURIComponent(B.email || '') + '?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
}
function unpaidHTML() {
  const U = letters.filter(isUnpaid).sort((a, b) => String(a.invDate).localeCompare(String(b.invDate)));
  const notInv = letters.filter(o => (o.stage || '') === 'Delivered' && !o.invDate && !o.paidDate);
  const total = U.reduce((s, o) => s + invBalance(o), 0); const yr = +todayISO().slice(0, 4), half = +todayISO().slice(5, 7) <= 6 ? 1 : 2;
  return `<h3>Unpaid invoices</h3>${U.length ? `<div class="tableWrap"><table class="hmtable"><thead><tr><th>Invoice</th><th>Address</th><th>Bill to</th><th>Invoiced</th><th>Days</th><th class="num">Balance</th><th></th></tr></thead><tbody>${U.map(o => `<tr><td class="num"><b>${h(o.invNo || o.fileNo || '—')}</b></td><td><button type="button" class="lnk" data-bkopen="${o.id}">${h(street(o) || '(no address)')}</button></td><td>${h(billTo(o).who)}</td><td class="num">${h(longDate(o.invDate))}</td><td class="num${daysOut(o) > 30 ? ' warnTxt' : ''}">${daysOut(o)}</td><td class="num">${usd(invBalance(o))}</td>
      <td class="acts"><a class="btn ghost small" href="${h(followUpMail(o))}" title="Opens a draft in your mail program – read it before you send">Follow-up email</a><button type="button" class="btn ghost small" data-bkpaid="${o.id}">Mark paid</button></td></tr>`).join('')}</tbody></table></div><p class="help">${U.length} open · ${usd(total)} in all. <b>Follow-up email</b> opens a draft in your mail program for you to read and send; nothing is sent from here.</p>` : '<p class="help">No unpaid invoices.</p>'}
    ${notInv.length ? `<p class="help warnTxt">Delivered but not invoiced yet: ${notInv.map(o => `<button type="button" class="lnk" data-bkopen="${o.id}">${h(o.fileNo || street(o))}</button>`).join(', ')}.</p>` : ''}
    <div class="row"><label>Summary for <select id="bkHalf">${[yr, yr - 1, yr - 2].flatMap(y => [[y, 2], [y, 1]]).filter(([y, hh]) => y < yr || hh <= half).map(([y, hh]) => `<option value="${y}-${hh}">${hh === 1 ? 'January–June' : 'July–December'} ${y}</option>`).join('')}</select></label><button type="button" class="btn ghost small" id="bkSum">Print the summary</button></div>`;
}
function wireUnpaid(box) {
  box.querySelectorAll('[data-bkopen]').forEach(b => b.onclick = () => { openLetter(b.dataset.bkopen); setTimeout(() => showTab('books'), 60); });
  box.querySelectorAll('[data-bkpaid]').forEach(b => b.onclick = () => { openLetter(b.dataset.bkpaid); setTimeout(() => { showTab('books'); markPaid(); const f = $('#booksSet'); if (f) f.scrollIntoView({ block: 'center' }); }, 60); });
  const s = box.querySelector('#bkSum'); if (s) s.onclick = () => { const [y, hh] = box.querySelector('#bkHalf').value.split('-').map(Number); printWindow(summaryHTML(y, hh), 'The summary'); };
}
function summaryHTML(y, half) {
  const from = `${y}-${half === 1 ? '01' : '07'}-01`, to = `${y}-${half === 1 ? '06-30' : '12-31'}`; const inR = d => d && d >= from && d <= to; const name = (half === 1 ? 'January–June ' : 'July–December ') + y;
  const inv = letters.filter(o => inR(o.invDate)).sort((a, b) => a.invDate.localeCompare(b.invDate));
  const paidIn = letters.filter(o => inR(o.paidDate)); const sum = (L, f) => L.reduce((s, o) => s + f(o), 0);
  const paidAmt = o => String(o.paidAmt || '').trim() ? n$(o.paidAmt) : invBalance(o);
  const tInv = sum(inv, invAmount), tPaid = sum(paidIn, paidAmt), tOpen = sum(inv.filter(o => !o.paidDate), invBalance);
  const tRet = sum(inv, o => n$(o.retainer));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoices ${name}</title><style>@page { size: letter landscape; margin: 0.5in; } body { font: 12.5px/1.4 Arial, sans-serif; color: #111; margin: 20px; } h1 { font-size: 20px; margin: 0 0 4px; } table { width: 100%; border-collapse: collapse; margin-top: 12px; } th, td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: left; } th { border-bottom: 1.5px solid #111; font-size: 11px; text-transform: uppercase; } .n { text-align: right; white-space: nowrap; } .tot td { font-weight: 700; border-top: 2px solid #111; } .box { display: flex; gap: 30px; margin-top: 10px; } .box div { border: 1px solid #ccc; border-radius: 6px; padding: 8px 12px; } .box b { display: block; font-size: 17px; } @media print { .noprint { display: none; } }</style></head><body>
  <p class="noprint" style="background:#fff3e0;border:1px solid #ff8a00;padding:8px 12px;border-radius:8px">In the print window choose <b>Destination: Save as PDF</b> to keep a copy.</p>
  <h1>${hesc(APPRAISER.company)} – invoices, ${name}</h1><div>Printed ${hesc(longDate(todayISO()))} from the Appraisal Assistant. Invoices dated ${hesc(longDate(from))} to ${hesc(longDate(to))}.</div>
  <div class="box"><div>Invoiced<b>${usd(tInv)}</b>${inv.length} invoice${inv.length === 1 ? '' : 's'}</div><div>Retainers on these<b>${usd(tRet)}</b></div><div>Payments received in the period<b>${usd(tPaid)}</b>${paidIn.length} payment${paidIn.length === 1 ? '' : 's'}</div><div>Still unpaid (of these invoices)<b>${usd(tOpen)}</b>${inv.filter(o => !o.paidDate).length} open</div></div>
  <table><tr><th>Invoice</th><th>Invoiced</th><th>Property</th><th>Bill to</th><th class="n">Amount</th><th class="n">Retainer</th><th>Paid</th><th>Method</th><th class="n">Paid amount</th><th class="n">Unpaid</th></tr>
  ${inv.map(o => `<tr><td>${hesc(o.invNo || o.fileNo || '')}</td><td>${hesc(shortDate(o.invDate))}</td><td>${hesc(street(o))}</td><td>${hesc(billTo(o).who)}</td><td class="n">${usd(invAmount(o))}</td><td class="n">${n$(o.retainer) ? usd(o.retainer) : ''}</td><td>${hesc(shortDate(o.paidDate || ''))}</td><td>${hesc(o.paidMethod || '')}</td><td class="n">${o.paidDate ? usd(paidAmt(o)) : ''}</td><td class="n">${o.paidDate ? '' : usd(invBalance(o))}</td></tr>`).join('') || '<tr><td colspan="10">No invoices dated in this period.</td></tr>'}
  <tr class="tot"><td colspan="4">Total</td><td class="n">${usd(tInv)}</td><td class="n">${usd(tRet)}</td><td></td><td></td><td class="n">${usd(sum(inv.filter(o => o.paidDate), paidAmt))}</td><td class="n">${usd(tOpen)}</td></tr></table>
  ${paidIn.filter(o => !inR(o.invDate)).length ? `<h3 style="margin-top:18px">Payments received in this period for invoices dated earlier</h3><table><tr><th>Invoice</th><th>Invoiced</th><th>Property</th><th>Paid</th><th class="n">Amount</th></tr>${paidIn.filter(o => !inR(o.invDate)).map(o => `<tr><td>${hesc(o.invNo || o.fileNo || '')}</td><td>${hesc(shortDate(o.invDate || ''))}</td><td>${hesc(street(o))}</td><td>${hesc(shortDate(o.paidDate))}</td><td class="n">${usd(paidAmt(o))}</td></tr>`).join('')}</table>` : ''}
  </body></html>`;
}
