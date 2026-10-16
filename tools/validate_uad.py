"""Check a UAD 3.6 XML against Appendix A-1: every element path known, enumerations valid, sibling order by XML Sort Number."""
import sys, openpyxl, warnings, re
import xml.etree.ElementTree as ET
warnings.filterwarnings('ignore')
spec, xmlf = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(spec, read_only=True)['UAD Delivery Spec 1.4']
rows = list(ws.iter_rows(values_only=True)); H = rows[0]
ix = {h: i for i, h in enumerate(H)}
X, DP, AT, EN, SN = ix['MISMO xPath'], ix['MISMO Data Point Name'], ix['MISMO Attribute Name'], [i for i, h in enumerate(H) if h and h.startswith('Supported Data Point Enumerations')][0], ix['XML Sort Number']
paths = {}; enums = {}
for r in rows[1:]:
    xp = (r[X] or '').strip().rstrip('/');
    if not xp: continue
    dp = (r[DP] or '').strip(); at = (r[AT] or '').strip()
    full = xp + ('/' + dp if dp else '') + (('/@' + at.lstrip('@')) if at and not dp else '')
    paths.setdefault(full, r[SN])
    if dp and r[EN] and str(r[EN]).strip(): enums.setdefault(xp + '/' + dp, set()).update(x.strip() for x in re.split(r'[\n,;]', str(r[EN])) if x.strip())
wb2 = openpyxl.load_workbook(spec, read_only=True)['UAD Enumerations']; en2 = {}
for r in list(wb2.iter_rows(values_only=True))[1:]:
    if r[2] and r[3]: en2.setdefault(str(r[2]).strip(), set()).add(str(r[3]).strip())
s = lambda t: t.split('}')[-1]
root = ET.parse(xmlf).getroot(); bad = set(); badenum = []; order = []
def walk(e, path):
    prev = None
    for k in e:
        p = path + '/' + s(k.tag)
        sn = paths.get(p)
        if sn is None: bad.add(p)
        elif prev is not None and isinstance(sn, (int, float)) and isinstance(prev[1], (int, float)) and sn < prev[1]: order.append((path, prev[0], s(k.tag)))
        if sn is not None: prev = (s(k.tag), sn)
        if len(k): walk(k, p)
        else:
            ev = en2.get(s(k.tag))
            if ev and (k.text or '').strip() not in ev and len(ev) > 1: badenum.append((p.split('/')[-1], k.text))
walk(root, 'MESSAGE')
print('unknown paths:', len(bad)); [print('  ', b[-150:]) for b in sorted(bad)[:60]]
print('bad enum values:', len(badenum)); [print('  ', b) for b in sorted(set(badenum))[:60]]
print('order problems:', len(order)); [print('  ', o[0][-80:], o[1], '>', o[2]) for o in sorted(set(order))[:60]]
