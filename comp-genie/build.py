import pathlib, time, shutil
src = pathlib.Path('src'); out = pathlib.Path('dist'); out.mkdir(exist_ok=True)
BUILD = 'g2-' + time.strftime('%m%d-%H%M')
js = 'const BUILD=' + repr(BUILD) + ';\n' + '\n'.join((src / f).read_text() for f in ['util.js', 'crs.js', 'sources.js', 'model.js', 'export.js', 'grid.js', 'time.js', 'sens.js', 'support.js', 'a1.js', 'precheck.js', 'wb.js', 'cmtpick.js', 'boe2026.js', 'refdata.js', 'draft.js', 'd1order.js', 'xsdorder.js', 'report.js', 'costapp.js', 'income.js', 'history.js', 'maps.js', 'pickers.js', 'guide.js', 'subarea.js', 'ui.js', 'helpwrite.js', 'main.js'])
html = (src / 'template.html').read_text().replace('/*CSS*/', (src / 'styles.css').read_text()).replace('/*JS*/', js)
import subprocess, tempfile   # never publish a page whose script does not parse
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as t: t.write(js)
chk = subprocess.run(['node', '--check', t.name], capture_output=True, text=True)
if chk.returncode: raise SystemExit('SCRIPT ERROR – not built:\n' + chk.stderr[:1500])
(out / 'index.html').write_text(html)
print('index.html', len(html), BUILD)
