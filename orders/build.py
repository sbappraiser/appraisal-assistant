"""Builds the Appraisal Assistant order hub into ../docs (published with GitHub Pages).
Letter wording comes from ../engagement-letter-writer/src; the PDF/CSV readers are shared
with the comp genie and the inspection app, so every module reads a CRS report the same way."""
import pathlib, time, shutil
here = pathlib.Path(__file__).parent; root = here.parent; src = here / 'src'; out = root / 'docs'; out.mkdir(exist_ok=True)
BUILD = 'o1-' + time.strftime('%m%d-%H%M')
shared = '\n'.join((root / p).read_text() for p in ['comp-genie/src/util.js', 'comp-genie/src/crs.js', 'comp-genie/src/sources.js', 'inspection-app/src/permits.js'])
G = ('const G = (() => {\n' + shared + '\nreturn { parseCRS, crsCanon, parseMlsCsv, parseMlsPdf, parsePermits, permitItems: typeof permitItems === "function" ? permitItems : null,'
     ' pdfLines, pdfFirstText, readText, parseCSV, isoDate, showDate, num, money, titleCase, addrKey, splitAddr, apnKey, fmtApn, makeZip, readZip, safeName };\n})();\n')
js = 'const BUILD=' + repr(BUILD) + ';\n' + G + '\n'.join((root / 'engagement-letter-writer/src' / f).read_text() for f in ['clauses.js', 'letter.js']) + '\n' + '\n'.join((src / f).read_text() for f in ['store.js', 'docs.js', 'market.js', 'reader.js', 'wizard.js', 'app.js'])
html = (src / 'template.html').read_text().replace('/*JS*/', js)
(out / 'index.html').write_text(html)
for f in ['pdf.min.mjs', 'pdf.worker.min.mjs', 'pdfjs-LICENSE.txt']: shutil.copy(root / 'inspection-app' / f, out / f)
for d in ['wasm', 'standard_fonts']: shutil.copytree(root / 'vendor' / 'pdfjs' / d, out / d, dirs_exist_ok=True)  # scanned PDFs (JBIG2/JPEG 2000) and non-embedded fonts
print('docs/index.html', len(html), BUILD)
