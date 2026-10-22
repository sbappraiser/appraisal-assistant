"""Builds the Appraisal Assistant order hub into ../docs (published with GitHub Pages).
Letter wording comes from ../engagement-letter-writer/src; the PDF/CSV readers are shared
with the comp genie and the inspection app, so every module reads a CRS report the same way."""
import pathlib, time, shutil
here = pathlib.Path(__file__).parent; root = here.parent; src = here / 'src'; out = root / 'docs'; out.mkdir(exist_ok=True)
BUILD = 'o1-' + time.strftime('%m%d-%H%M')
shared = '\n'.join((root / p).read_text() for p in ['comp-genie/src/util.js', 'comp-genie/src/crs.js', 'comp-genie/src/sources.js', 'inspection-app/src/permits.js'])
G = ('const G = (() => {\n' + shared + '\nreturn { parseCRS, crsCanon, parseMlsCsv, isCrsExport, parseCrsExport, parseMlsPdf, parsePermits, permitItems: typeof permitItems === "function" ? permitItems : null,'
     ' pdfLines, pdfFirstText, readText, parseCSV, isoDate, showDate, num, money, titleCase, addrKey, splitAddr, apnKey, fmtApn, makeZip, readZip, safeName };\n})();\n')
js = 'const BUILD=' + repr(BUILD) + ';\n' + G + '\n'.join((root / 'engagement-letter-writer/src' / f).read_text() for f in ['clauses.js', 'letter.js']) + '\n' + '\n'.join((src / f).read_text() for f in ['store.js', 'addr.js', 'docs.js', 'email.js', 'market.js', 'reader.js', 'permitsai.js', 'reqs.js', 'books.js', 'mc.js', 'comments.js', 'wizard.js', 'status.js', 'vault.js', 'autobackup.js', 'app.js', 'octo.js']) + '\n' + (root / 'comp-genie/src/cmtpick.js').read_text()+ '\n' + (root / 'comp-genie/src/helpwrite.js').read_text()
import subprocess, tempfile   # never publish a page whose script does not even parse (Oct 19 2026: one bad comment stopped the whole hub)
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as t: t.write(js)
chk = subprocess.run(['node', '--check', t.name], capture_output=True, text=True)
if chk.returncode: raise SystemExit('SCRIPT ERROR – not built:\n' + chk.stderr[:1500])
js += '\n' + (root / 'comp-genie/src/look.js').read_text() + "\nwindow.lookFileName = () => (typeof cur !== 'undefined' && cur && typeof hasContent === 'function' && hasContent(cur)) ? [cur.fileNo, street(cur)].filter(Boolean).join(' · ') : '';\n"   # one look (her Oct 21 2026 requests)
tpl = (src / 'template.html').read_text(); assert '</style>\n</head>' in tpl
html = tpl.replace('</style>\n</head>', (root / 'comp-genie/src/look.css').read_text() + '\n</style>\n</head>', 1).replace('/*JS*/', js)
(out / 'index.html').write_text(html)
for f in ['pdf.min.mjs', 'pdf.worker.min.mjs', 'pdfjs-LICENSE.txt']: shutil.copy(root / 'inspection-app' / f, out / f)
for d in ['wasm', 'standard_fonts']: shutil.copytree(root / 'vendor' / 'pdfjs' / d, out / d, dirs_exist_ok=True)  # scanned PDFs (JBIG2/JPEG 2000) and non-embedded fonts
print('docs/index.html', len(html), BUILD)
