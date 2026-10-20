import pathlib
src=pathlib.Path('src'); out=pathlib.Path('dist'); out.mkdir(exist_ok=True)
css=(src/'styles.css').read_text()+'\n'+(src/'walk.css').read_text()
BUILD='6w-'+__import__('time').strftime('%m%d-%H%M')
js='const BUILD='+repr(BUILD)+';\n'+'\n'.join((src/f).read_text() for f in ['enums.js','schema.js','core.js','crs.js','permits.js','summary.js','ui.js','dictate.js','walkcore.js','walk.js','export.js','main.js'])
t=(src/'template.html').read_text().replace('/*CSS*/',css).replace('/*JS*/',js)
# artifact preview: page content only
(out/'preview.html').write_text(t.replace('<!--PWA-->',''))
# hosted app: full document with manifest
pwa='<link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" href="icon-512.png">'
full='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+t.replace('<!--PWA-->',pwa).replace('<div id="app">','</head><body><div id="app">',1)+'\n</body></html>'
(out/'index.html').write_text(full)
print(len(full))
# sketch page: its own page (own memory) sharing the same on-device storage
st=(src/'sketch_template.html').read_text()
sjs='const BUILD='+repr(BUILD)+';\n'+'\n'.join((src/f).read_text() for f in ['enums.js','schema.js','core.js','sketch.js','walkcore.js','walksk.js'])
(out/'sketch.html').write_text(st.replace('/*CSS*/',css+'\n'+(src/'sketch.css').read_text()).replace('/*JS*/',sjs))
print('sketch', (out/'sketch.html').stat().st_size, BUILD)
sw=(out/'sw.js').read_text(); import re as _re; sw=_re.sub(r"const CACHE = 'uad-inspect-[^']*';", "const CACHE = 'uad-inspect-"+BUILD+"';", sw); (out/'sw.js').write_text(sw)
