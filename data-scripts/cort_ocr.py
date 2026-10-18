"""Read CORT 'Grant Deed Printout for the South County' scans into rows.
usage: python3 -I cort_ocr.py out.csv file1.pdf [file2.pdf ...]
Each sale is two printed lines:
  APN  GRANTOR  GRANTEE  Indic.$  Date  ADDRESS  CITY  Instno
  RMS=r /b /ba FT2=sf YR=yyyy Remarks:...      FIN:lender / loan APC=..
Columns are split by their position on the page (tesseract word boxes), not by spaces."""
import sys, os, re, csv, subprocess, tempfile

COLS = [('apn', 0.0), ('grantor', 0.112), ('grantee', 0.272), ('price', 0.455), ('date', 0.545), ('address', 0.612), ('city', 0.875), ('instno', 0.93)]

def col_of(x):
    name = COLS[0][0]
    for n, start in COLS:
        if x >= start - 0.004: name = n
    return name

def ocr_page(png):
    out = subprocess.run(['tesseract', png, '-', '--psm', '6', 'tsv'], capture_output=True, text=True, env={**os.environ, 'OMP_THREAD_LIMIT': '1'}).stdout
    words = []
    for ln in out.splitlines()[1:]:
        p = ln.split('\t')
        if len(p) < 12 or not p[11].strip() or p[10] == '-1': continue
        words.append({'block': int(p[2]), 'par': int(p[3]), 'line': int(p[4]), 'x': int(p[6]), 'y': int(p[7]), 'w': int(p[8]), 'h': int(p[9]), 'conf': float(p[10]), 't': p[11]})
    return words

def lines_of(words, width):
    # tesseract's own line grouping (block, paragraph, line) keeps each printed line together
    groups = {}
    for w in words: groups.setdefault((w['block'], w['par'], w['line']), []).append(w)
    rows = []
    for key, ws in groups.items():
        ws.sort(key=lambda w: w['x'])
        rows.append({'y': min(w['y'] for w in ws), 'w': ws, 'text': ' '.join(w['t'] for w in ws), 'xs': [(w['x'] / width, w['t'], w['conf']) for w in ws]})
    rows.sort(key=lambda r: r['y'])
    return rows

APN = re.compile(r'^\d{3}\W?\d{3}\W?\d{2}$')
def upright(png):
    """A page scanned sideways or upside down is turned before reading (tesseract's page-direction check)."""
    out = subprocess.run(['tesseract', png, '-', '--psm', '0'], capture_output=True, text=True, env={**os.environ, 'OMP_THREAD_LIMIT': '1'}).stdout
    m = re.search(r'Rotate:\s*(\d+)', out); c = re.search(r'Orientation confidence:\s*([\d.]+)', out)
    if not m or int(m.group(1)) == 0 or not c or float(c.group(1)) < 2: return
    from PIL import Image
    Image.open(png).rotate(-int(m.group(1)), expand=True).save(png)   # tesseract gives the clockwise turn; PIL turns counter-clockwise

def parse_pdf(pdf):
    recs = []; tmp = tempfile.mkdtemp()
    subprocess.run(['pdftoppm', '-r', '300', '-gray', '-png', pdf, os.path.join(tmp, 'p')], check=True)
    report = {'report_date': '', 'period': ''}
    for png in sorted(os.listdir(tmp), key=lambda s: int(re.sub(r'\D', '', s) or 0)):
        path = os.path.join(tmp, png)
        width = int(subprocess.run(['identify', '-format', '%w', path], capture_output=True, text=True).stdout or 2550) if False else None
        upright(path)
        words = ocr_page(path)
        if not words: continue
        width = max(w['x'] + w['w'] for w in words) * 1.0
        rows = lines_of(words, width)
        for r in rows:
            m = re.search(r'Report Date:\s*(\d{2}/\d{2}/\d{2})', r['text']);  report['report_date'] = m.group(1) if m else report['report_date']
            m = re.search(r'FROM\s+(\d{2}/\d{2}/\d{2})\s+TO\s+(\d{2}/\d{2}/\d{2})', r['text']); report['period'] = f'{m.group(1)}-{m.group(2)}' if m else report['period']
        cur = None
        for r in rows:
            first = r['xs'][0][1].replace('~', '-').replace('—', '-') if r['xs'] else ''
            if APN.match(first) and r['xs'][0][0] < 0.08:
                if cur: recs.append(cur)
                cur = {k: [] for k, _ in COLS}; cur['_conf'] = []; cur['detail'] = ''
                for x, t, c in r['xs']:
                    cur[col_of(x)].append(t); cur['_conf'].append(c)
                cur['apn'] = [first]
            elif cur is not None and re.match(r'^RMS', r['text']):
                cur['detail'] = r['text']
                recs.append(cur); cur = None
        if cur: recs.append(cur)
    out = []
    for c in recs:
        row = {k: ' '.join(c[k]).strip() for k, _ in COLS}
        row['apn'] = re.sub(r'\W', '', row['apn']); row['apn'] = f"{row['apn'][:3]}-{row['apn'][3:6]}-{row['apn'][6:8]}"
        row['price'] = re.sub(r'[^\d]', '', row['price'])
        m = re.match(r'^([A-Z]{3,5})\s+(\d{3,6})$', row['city'])
        if m and not row['instno']: row['city'], row['instno'] = m.group(1), m.group(2)
        row['date'] = re.sub(r'[^\d/]', '', row['date'])
        d = row['detail'] = c['detail']
        m = re.search(r'RMS=\s*(\d*)\s*/\s*(\d*)\s*/\s*([\d.]*)', d); row['rooms'], row['beds'], row['baths'] = (m.groups() if m else ('', '', ''))
        m = re.search(r'FT2=\s*([\d,]+)', d); row['sqft'] = m.group(1).replace(',', '') if m else ''
        m = re.search(r'YR=\s*(\d{4})', d); row['year_built'] = m.group(1) if m else ''
        m = re.search(r'Remarks:\s*(.*?)\s*FIN:', d); row['remarks'] = m.group(1).strip() if m else ''
        m = re.search(r'FIN:\s*(.*?)\s*/\s*([\d,\s]+?)\s*APC\s*=\s*(\S*)', d)
        if m: row['lender'], row['loan'], row['apc'] = m.group(1).strip(), re.sub(r'[^\d]', '', m.group(2)), m.group(3).strip()
        else: row['lender'] = row['loan'] = row['apc'] = ''
        row['no_address'] = int('NO ADDRESS' in row['address'] or 'NO COUNTY' in row['address'])
        row['ocr_conf_min'] = round(min(c['_conf']) if c['_conf'] else 0)
        row['source_file'] = os.path.basename(pdf); row['report_date'] = report['report_date']; row['period'] = report['period']
        out.append(row)
    return out

if __name__ == '__main__':
    rows = []
    for f in sys.argv[2:]: rows += parse_pdf(f)
    keys = ['period', 'report_date', 'apn', 'grantor', 'grantee', 'price', 'date', 'address', 'city', 'instno', 'rooms', 'beds', 'baths', 'sqft', 'year_built', 'remarks', 'lender', 'loan', 'apc', 'no_address', 'ocr_conf_min', 'source_file', 'detail']
    with open(sys.argv[1], 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=keys); w.writeheader(); [w.writerow({k: r.get(k, '') for k in keys}) for r in rows]
    print(len(rows), 'rows')
