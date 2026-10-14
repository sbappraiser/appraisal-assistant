/* Letter model (one list of blocks) -> Word .docx and -> HTML preview.  No libraries. */
const BLANK = '______________';
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined && v[k] !== null && String(v[k]).trim() !== '') ? String(v[k]).trim() : BLANK);
const longDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); if (!y || !m || !d) return iso;
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] + ' ' + d + ', ' + y; };
const money = v => { const n = Number(String(v || '').replace(/[^\d.]/g, '')); return n ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) : ''; };

function clientLines(c) {
  const out = [];
  if (c.name) out.push(c.name);
  if (c.company) out.push(c.company);
  if (c.addr1) out.push(c.addr1);
  if (c.addr2) out.push(c.addr2);
  if (c.phone) out.push(c.phone);
  if (c.email) out.push(c.email);
  return out.length ? out : ['Name', 'Address', 'Phone', 'Email'];
}

function deliveryParts(f, T) { // number + unit; reads older saved letters that kept '2 weeks' as text
  if (f.deliveryN) return { n: String(f.deliveryN).trim(), unit: f.deliveryUnit || 'days' };
  const m = String(f.delivery || T.deliveryDefault || '').match(/(\d+)\s*(business days|days|weeks?)/i);
  return m ? { n: m[1], unit: m[2].toLowerCase().replace(/^week$/, 'weeks') } : { n: '', unit: 'days' };
}
function buildLetter(f) {
  const T = TYPES[f.type] || TYPES.dod;
  const ptype = PROPERTY_TYPES.find(p => p[0] === f.propType) || PROPERTY_TYPES[0];
  const v = { dod: longDate(f.dod), decedent: (f.decedent || '').trim() || (f.type === 'taxAppeal' ? 'Santa Barbara County' : ''), otherUsers: f.otherUsers, delivery: f.delivery || T.deliveryDefault,
    retroWord: T.retro ? 'retrospective' : 'current', listingDetail: f.listingDetail ? ' (' + f.listingDetail.trim() + ')' : '',
    retroWhoCap: (f.decedent || '').trim() ? f.decedent.trim().replace(/^./, c => c.toUpperCase()) : (T.dateLabels ? T.dateLabels[2] : ''),
    effParen: T.effParen || '', jointUse: T.divorce && f.joint !== false ? ' This appraisal is prepared for settlement planning purposes only and is not prepared at the direction of, or for the benefit of, either spouse individually.' : '',
    plans: (f.plans || '').trim() || 'plans, specifications, and detailed cost budget', completion: longDate(f.completion),
    purpose: (f.purpose || '').trim(), purposeTitle: (f.purpose || '').trim() ? f.purpose.trim().replace(/^./, c => c.toUpperCase()) : 'Appraisal Assignment',
    tRate: money(f.tRate) || '$' + BLANK, tDecl: money(f.tDecl) || '$' + BLANK, tRetainer: money(f.tRetainer) || '$' + BLANK, tCancel: money(f.tCancel) || '$' + BLANK };
  const B = []; const P = (text, o = {}) => B.push({ k: 'p', runs: Array.isArray(text) ? text : [[text]], ...o });
  const H = t => B.push({ k: 'h', text: t });
  const sec = (title, ...paras) => { H(title); paras.flat().filter(x => x).forEach(x => typeof x === 'object' && x.list ? B.push({ k: 'list', items: x.list.map(i => fill(i, v)) }) : P(fill(x, v))); B.push({ k: 'gap' }); };
  const dateStr = longDate(f.agreeDate) || BLANK;

  P([['DATE OF AGREEMENT: ', true], [dateStr]]); B.push({ k: 'gap' });
  P([['PARTIES TO AGREEMENT:', true]], { after: 0 });
  const clients = (f.clients || []).filter(c => Object.values(c).some(x => String(x || '').trim()));
  (clients.length ? clients : [{}]).forEach((c, i) => {
    const lines = clientLines(c);
    P([[i === 0 ? (clients.length > 1 ? 'Clients:' : 'Client:') : '', true]], { after: 0 });
    lines.forEach((l, j) => P(l, { ind: 1, after: j === lines.length - 1 ? 160 : 0 }));
  });
  B.push({ k: 'gap' });
  P([['Appraiser:', true]], { after: 0 });
  [APPRAISER.name, APPRAISER.company, APPRAISER.addr1, APPRAISER.addr2, APPRAISER.phone, APPRAISER.email].forEach((l, j, a) => P(l, { ind: 1, after: j === a.length - 1 ? 160 : 0 }));
  B.push({ k: 'rule' });
  const PR = T.premise && !T.retro ? PREMISE[f.premise || T.premiseDefault || 'asis'] : null;
  P([[T.title, true]], { after: 0 }); P([[fill(T.subtitle, v), true]]); B.push({ k: 'gap' });
  P([['Client hereby engages Appraiser to complete ' + (PR ? PR.engage : 'a ' + (T.retro ? 'retrospective ' : 'current ') + T.valueWord + ' appraisal') + ' assignment as follows:', true]]);
  B.push({ k: 'gap' });

  sec('PROPERTY IDENTIFICATION', 'Address: ' + (f.address || '').trim() + (f.apn ? ' APN: ' + f.apn.trim() : ''));
  sec('PROPERTY TYPE', f.propType === 'other' ? (f.propTypeOther || BLANK) : ptype[1]);
  sec('INTEREST VALUED', (f.interest || '').trim() || ptype[3] || 'Fee Simple');
  // "Other intended users" is for names. "None", "No additional intended users" etc. mean none;
  // a full sentence about intended users is treated as her own wording for the section.
  const ou = (f.otherUsers || '').trim();
  if (/^(no|none|n\/?a|nil|-+)\b/i.test(ou)) f = { ...f, otherUsers: '' };
  else if (ou && !(f.userText || '').trim() && (/intended user/i.test(ou) || /[.!]\s+[A-Z]/.test(ou))) f = { ...f, otherUsers: '', userText: ou };
  v.otherUsers = f.otherUsers;
  if ((f.userText || '').trim()) sec('INTENDED USER', f.userText.trim().split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim()));
  else sec('INTENDED USER', T.divorce && f.joint !== false ? T.jointUserText + ((f.otherUsers || '').trim() ? ' The intended users also include ' + f.otherUsers.trim() + '.' : '') : (f.otherUsers || '').trim() ? STD.intendedUserMore : STD.intendedUserSole);
  sec('INTENDED USE', T.intendedUse);
  sec('EFFECTIVE DATE OF VALUE', PR ? PR.effective : T.effective);
  sec('TYPE OF VALUE', T.typeOfValue);
  sec('EXTRAORDINARY ASSUMPTIONS', (f.ea || '').trim() || (PR && PR.ea) || T.ea);
  sec('HYPOTHETICAL CONDITIONS:', (f.hc || '').trim() || (PR && PR.hc) || T.hc);
  sec('APPLICABLE STANDARDS AND REQUIREMENTS', STD.standards, T.standardsExtra || null);
  sec('SCOPE OF WORK', STD.scope[f.inspection || 'interior'] + STD.scopeTail);
  sec('INSPECTION AND PROPERTY CONDITION', T.inspectionExtra ? STD.inspection.replace('professional inspections and expert evaluations.', 'professional inspections and expert evaluations prior to entering into any purchase agreement.') : STD.inspection);
  const ap = []; if (f.apSales !== false) ap.push('Sales Comparison Approach'); if (f.apCost) ap.push('Cost Approach (as applicable)'); if (f.apIncome) ap.push('Income Approach (as applicable)');
  H('VALUATION APPROACHES'); (ap.length ? ap : [BLANK]).forEach((a, i, arr) => P(a, { after: i === arr.length - 1 ? 160 : 0 })); B.push({ k: 'gap' });
  H('REPORT TYPE'); P('Appraisal Report (as defined by USPAP)', { after: 0 }); P('Format: ' + ((f.format || '').trim() || T.formatDefault || ptype[2]), { after: f.rent ? 0 : 160 });
  if (f.rent) P('A Current Market Rent Survey will also be completed, on a separate form.'); B.push({ k: 'gap' });
  sec('CONTACT FOR PROPERTY ACCESS, IF APPLICABLE', (f.accessName || '').trim() ? [f.accessName, f.accessRel && '(' + f.accessRel + ')', f.accessPhone].filter(Boolean).join(' ') : 'Client (see above)');
  if (T.extraSection) sec(T.extraSection[0], T.extraSection[1]);
  if (PR || ['proposed', 'renovation'].includes(f.propType)) sec('PLANS, SPECIFICATIONS AND DOCUMENTS TO BE PROVIDED', DOCS_TO_PROVIDE);
  if (f.listing && f.listing !== 'omit') sec('PROPERTY LISTING AND CONTRACT STATUS', LISTING_TEXT[f.listing]);
  const dl = deliveryParts(f, T);
  const FROM = { either: 'the inspection or receipt of payment, whichever is more recent', inspection: 'the inspection', payment: 'receipt of payment' };
  sec('DELIVERY', 'Delivery Timeline: Within ' + (dl.n || BLANK) + ' ' + dl.unit + ' after ' + FROM[f.deliveryFrom || (f.payWhen === 'report' ? 'inspection' : 'either')] + ', unless otherwise agreed in writing.');
  sec('NUMBER OF COPIES', STD.copies);
  H('FEES');
  const num = x => Number(String(x || '').replace(/[^\d.]/g, '')) || 0;
  if (f.rent) { P('Appraisal: ' + (money(f.fee) || '$' + BLANK), { after: 0 }); P('Current Market Rent Survey: ' + (money(f.rentFee) || '$' + BLANK), { after: 0 });
    P('Total Fee: ' + (num(f.fee) && num(f.rentFee) ? money(num(f.fee) + num(f.rentFee)) : '$' + BLANK), { after: 0 }); }
  else P('Total Fee: ' + (money(f.fee) || '$' + BLANK), { after: 0 });
  if (money(f.retainer)) P('Retainer: ' + money(f.retainer) + ', due upon signing this Agreement', { after: 0 });
  const PAY = { inspection: 'At or before the inspection, unless otherwise agreed in writing.', report: 'Upon delivery of the appraisal report. The invoice will accompany the report and is due upon receipt.', signing: 'Upon signing this Agreement.' };
  const payWhen = f.payWhen || ((f.payDue || '').trim() ? 'other' : 'inspection');
  P('Payment Due: ' + (payWhen === 'other' ? ((f.payDue || '').trim().replace(/^payment (is )?due:?\s*/i, '').replace(/^./, c => c.toUpperCase()).replace(/([^.])$/, '$1.') || BLANK) : PAY[payWhen])); B.push({ k: 'gap' });
  sec('CONFIDENTIALITY', STD.confidentiality + (T.confidentialityExtra ? ' ' + T.confidentialityExtra : ''), f.ai !== false ? (f.aiText || AI_DEFAULT) : null);
  sec('THIRD-PARTY RELIANCE', STD.reliance, T.relianceExtra || null);
  sec('CHANGES TO AGREEMENT', STD.changes);
  sec('CANCELLATION AND APPRAISER WITHDRAWAL', STD.cancel1, STD.cancel2);
  if (f.testimony) sec('COURT TESTIMONY AND EXPERT WITNESS SERVICES', TESTIMONY_FULL); else sec('TESTIMONY', STD.testimony + (T.divorce ? ' Any request for testimony or court-related services shall require a separate written agreement and fee schedule.' : ''));
  sec('APPRAISER INDEPENDENCE', STD.independence);
  sec('LIMITATION OF LIABILITY', STD.liability);
  sec('TIME LIMIT FOR LEGAL ACTION', STD.timeLimit);
  sec('GOVERNING LAW', STD.law);
  sec('COMPLETION OF SERVICES', STD.completion);
  if ((f.extra || '').trim()) sec('ADDITIONAL TERMS', f.extra.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean));
  if (T.authorization && f.joint !== false && clients.length < 2) sec(T.authorization[0], T.authorization[1]);
  sec('EXPIRATION', STD.expiration);
  const names = (clients.length ? clients : [{}]).map(c => c.name || '');
  const rows = [[['By Appraiser:', true], [names.length > 1 ? 'By Clients:' : 'By Client:', true]], [['__________________________________'], ['__________________________________']], [['(Signature)'], ['(Signature)']],
    [['Name: ' + APPRAISER.sigName], ['Name: ' + names[0]]], [['Date: ' + dateStr], ['Date: ___________________']]];
  names.slice(1).forEach(n => rows.push([[''], ['']], [[''], ['__________________________________']], [[''], ['(Signature)']], [[''], ['Name: ' + n]], [[''], ['Date: ___________________']]));
  B.push({ k: 'sig', rows });
  return B;
}

/* ---------------- Word (.docx) ---------------- */
const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const run = (t, b) => `<w:r>${b ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xesc(t)}</w:t></w:r>`;
function docxBody(B) {
  let x = ''; let i = 0; let listNo = 0;
  for (const b of B) {
    if (b.k === 'gap') continue;
    if (b.k === 'h') { x += `<w:p><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="0"/></w:pPr>${run(b.text, true)}</w:p>`; continue; }
    if (b.k === 'rule') { x += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:before="120" w:after="240"/></w:pPr></w:p>'; continue; }
    if (b.k === 'list') { listNo++; b.items.forEach((it, j) => { x += `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${listNo}"/></w:numPr><w:spacing w:after="${j === b.items.length - 1 ? 160 : 40}"/></w:pPr>${run(it)}</w:p>`; }); continue; }
    if (b.k === 'sig') {
      x += '<w:p><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="0"/></w:pPr></w:p>';
      b.rows.forEach((r, j) => { x += `<w:p><w:pPr><w:keepNext/><w:keepLines/><w:tabs><w:tab w:val="left" w:pos="5040"/></w:tabs><w:spacing w:after="${j === 0 || j === 2 ? 240 : 40}"/></w:pPr>${run(r[0][0], r[0][1])}<w:r><w:tab/></w:r>${run(r[1][0], r[1][1])}</w:p>`; });
      continue;
    }
    const ind = b.ind ? '<w:ind w:left="720"/>' : '';
    const after = b.after === undefined ? 160 : b.after;
    x += `<w:p><w:pPr><w:spacing w:after="${after}"/>${ind}</w:pPr>${b.runs.map(r => run(r[0], r[1])).join('')}</w:p>`;
    i++;
  }
  docxBody.lists = listNo;
  return x;
}
function docxFiles(B, meta) {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W}><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:t xml:space="preserve">${xesc(meta.footer || '')}Page </w:t></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:t xml:space="preserve"> of </w:t></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const body = docxBody(B); const nLists = Math.max(1, docxBody.lists);
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1008" w:right="1440" w:bottom="1008" w:left="1440" w:header="720" w:footer="576" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>${Array.from({ length: nLists }, (_, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="0"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${W}><w:defaultTabStop w:val="720"/><w:updateFields w:val="true"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xesc(meta.title || 'Engagement Letter')}</dc:title><dc:creator>Jennifer Heath, LLC</dc:creator><cp:lastModifiedBy>Jennifer Heath, LLC</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`],
    ['word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSty" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rIdSet" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'],
    ['word/document.xml', doc], ['word/styles.xml', styles], ['word/numbering.xml', numbering], ['word/settings.xml', settings], ['word/footer1.xml', footer],
  ];
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipBytes(files) { // stored zip -> Uint8Array
  const enc = new TextEncoder(); const parts = []; const central = []; let off = 0;
  const d = new Date(); const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [name, text] of files) {
    const data = enc.encode(text), nm = enc.encode(name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
  }
  const cs = central.reduce((s, p) => s + p.length, 0); const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)]; const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0)); let o = 0; all.forEach(p => { out.set(p, o); o += p.length; }); return out;
}
const makeDocx = (B, meta) => zipBytes(docxFiles(B, meta));

/* ---------------- HTML preview ---------------- */
const hesc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mark = s => hesc(s).replace(/_{6,}/g, m => `<span class="blank">${m}</span>`);
function previewHTML(B) {
  return B.map(b => {
    if (b.k === 'gap') return '';
    if (b.k === 'h') return `<p class="lh">${hesc(b.text)}</p>`;
    if (b.k === 'rule') return '<hr class="lrule">';
    if (b.k === 'list') return '<ol class="ll">' + b.items.map(i => `<li>${hesc(i)}</li>`).join('') + '</ol>';
    if (b.k === 'sig') return '<div class="lsig">' + b.rows.map(r => `<div>${r.map(c => `<span${c[1] ? ' class="b"' : ''}>${mark(c[0]) || '&nbsp;'}</span>`).join('')}</div>`).join('') + '</div>';
    return `<p class="lp${b.ind ? ' ind' : ''}${b.after === 0 ? ' tight' : ''}">${b.runs.map(r => r[1] ? `<b>${mark(r[0])}</b>` : mark(r[0])).join('')}</p>`;
  }).join('');
}
if (typeof module !== 'undefined') module.exports = { buildLetter, makeDocx, previewHTML, longDate };
