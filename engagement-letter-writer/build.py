import pathlib
s=pathlib.Path('src'); js='\n'.join((s/f).read_text() for f in ['clauses.js','letter.js','app.js'])
out=(s/'template.html').read_text().replace('/*JS*/',js)
pathlib.Path('dist').mkdir(exist_ok=True); (pathlib.Path('dist')/'Engagement Letter Writer.html').write_text(out); print(len(out))
