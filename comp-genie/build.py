import pathlib, time, shutil
src = pathlib.Path('src'); out = pathlib.Path('dist'); out.mkdir(exist_ok=True)
BUILD = 'g2-' + time.strftime('%m%d-%H%M')
js = 'const BUILD=' + repr(BUILD) + ';\n' + '\n'.join((src / f).read_text() for f in ['util.js', 'crs.js', 'sources.js', 'model.js', 'export.js', 'grid.js', 'time.js', 'sens.js', 'support.js', 'a1.js', 'precheck.js', 'wb.js', 'cmtpick.js', 'd1order.js', 'report.js', 'ui.js', 'main.js'])
html = (src / 'template.html').read_text().replace('/*CSS*/', (src / 'styles.css').read_text()).replace('/*JS*/', js)
(out / 'index.html').write_text(html)
print('index.html', len(html), BUILD)
