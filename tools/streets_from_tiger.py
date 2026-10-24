"""Rebuild streets.js from a Census TIGER/Line ADDRFEAT file (public data).
Usage: python3 -I tools/streets_from_tiger.py tl_2024_06083_addrfeat.dbf streets.js
Then copy streets.js to inspection-app/src/ and orders/src/ and rebuild both apps."""
import struct, sys, json, collections, re
Z = {'93101','93103','93105','93108','93109','93110','93111','93117','93013','93067'}
f = open(sys.argv[1], 'rb'); h = f.read(32); n = struct.unpack('<I', h[4:8])[0]; hl = struct.unpack('<H', h[8:10])[0]; rl = struct.unpack('<H', h[10:12])[0]
fields = []
while True:
    d = f.read(32)
    if d[0] == 0x0D: break
    fields.append((d[:11].split(b'\0')[0].decode(), d[16]))
f.seek(hl); S = collections.defaultdict(lambda: {'z': set(), 'lo': None, 'hi': None})
num = lambda x: int(x) if re.match(r'^\d+$', x or '') else None
for _ in range(n):
    r = f.read(rl); o = 1; rec = {}
    for name, l in fields: rec[name] = r[o:o + l].decode('latin1').strip(); o += l
    for side in 'LR':
        z = rec['ZIP' + side]; nm = rec['FULLNAME']
        if z in Z and nm:
            e = S[nm]; e['z'].add(z)
            for a in (num(rec[side + 'FROMHN']), num(rec[side + 'TOHN'])):
                if a is None: continue
                e['lo'] = a if e['lo'] is None else min(e['lo'], a); e['hi'] = a if e['hi'] is None else max(e['hi'], a)
zl = sorted(Z)
out = sorted([[k, ''.join(str(zl.index(z)) for z in sorted(v['z'])), v['lo'] or 0, v['hi'] or 0] for k, v in S.items()])
open(sys.argv[2], 'w').write('/* Street names in her ZIP codes – U.S. Census TIGER/Line address ranges, Santa Barbara County (public data).\n   [name, ZIP indexes into STREET_ZIPS, lowest and highest house number] */\nconst STREET_ZIPS = ' + json.dumps(zl) + ';\nconst STREETS = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(len(out), 'streets')
