# Pull the Sales Comparison Approach rows (22.xx.xx) out of the F-1 text (pdftotext -layout) into JSON.
# Columns are found per page from the blank vertical gutters between them.
import re, json, sys
L = open(sys.argv[1], encoding='utf-8').read().split('\n')
start = next(i for i, l in enumerate(L) if i > 11000 and l.startswith('22.01.16'))
end = next(i for i, l in enumerate(L) if i > start and '23 Rental Information' in l)
# pages: header (3 lines with 'Adjustable') then data until 'Appendix F-1' footer
pages, i = [], start - 3
while i < end:
    if 'Adjustable' in L[i] and 'Report' in L[i]:
        j = i + 3; blk = []
        while j < end and not L[j].startswith('Appendix F-1') and not ('Adjustable' in L[j] and 'Report' in L[j]): blk.append(L[j]); j += 1
        pages.append((L[i:i + 3], blk)); i = j; continue
    i += 1
def columns(hdr, blk):
    W = max([len(l) for l in blk + hdr] + [1])
    cnt = [0] * (W + 1)
    for l in blk:
        if not l.strip() or re.match(r'\s{30,}\S', l) and len(l.strip()) < 60 and 'Approach' in l: continue
        for x, ch in enumerate(l):
            if ch != ' ': cnt[x] += 1
    starts, inrun = [], False
    for x in range(W + 1):
        if cnt[x] and not inrun: starts.append(x); inrun = True
        elif not cnt[x]: inrun = False
    return starts
rows = []
for hdr, blk in pages:
    st = columns(hdr, blk)
    # want 8 columns: id, label, displays, include, answers, origin, adjustable, guidance. Merge narrow splits by header word anchors.
    h1, h2, h3 = hdr
    anchors = [0, h2.find('Report Label'), h3.find('Displays'), h3.find('each Comparable'), h3.find('Answers'), h3.find('Property Information'), h3.rfind('Row'), h2.find('Definition')]
    # map every gutter start to the nearest anchor at or left of (start+8)
    cols = []
    for k, a in enumerate(anchors):
        cand = [s for s in st if s <= max(a, 0) + 6 and (not cols or s > cols[-1])]
        cols.append(cand[-1] if cand else (cols[-1] + 1 if cols else 0))
    # guidance: first gutter start right of the Adjustable column's text
    adj = cols[6]; g = [s for s in st if s > adj + 2]; cols[7] = g[0] if g else cols[7]
    cur = None
    for l in blk:
        if re.match(r'\s+Sales Comparison Approach', l) or l.startswith('Uniform Appraisal Dataset'): continue
        parts = [l[cols[k]:cols[k + 1]] if k < 7 else l[cols[k]:] for k in range(8)]
        m = re.match(r'(\d\d\.\d\d\.\d\d)', l)
        if m:
            if cur and cur['fresh']:
                cur['ids'].append(m.group(1)); cur['fresh'] = False
            else:
                cur = {'ids': [m.group(1)], 'parts': [[] for _ in range(8)], 'fresh': True}; rows.append(cur)
        elif cur: cur['fresh'] = False
        if cur:
            for k in range(1, 8): cur['parts'][k].append(parts[k].rstrip())
def flat(a): return re.sub(r'\s+', ' ', ' '.join(s.strip() for s in a)).strip()
def para(a):
    out, buf = [], ''
    for s in a:
        t = s.strip()
        if not t: 
            if buf: out.append(buf); buf = ''
            continue
        if re.match(r'^[•●]', t) or re.match(r'^(Note|Notes|Example|Examples)\b', t):
            if buf: out.append(buf)
            buf = t
        else: buf = (buf + ' ' + t).strip()
    if buf: out.append(buf)
    return '\n'.join(re.sub(r'(\w)- (\w)', r'\1\2', x) for x in out)
res = [{'ids': r['ids'], 'label': flat(r['parts'][1]), 'displays': flat(r['parts'][2]), 'include': flat(r['parts'][3]), 'answers': flat(r['parts'][4]),
        'origin': flat(r['parts'][5]), 'adjustable': flat(r['parts'][6]), 'guidance': para(r['parts'][7])} for r in rows]
json.dump(res, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
print(len(res))
