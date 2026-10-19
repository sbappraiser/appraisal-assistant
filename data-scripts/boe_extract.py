import re, json, sys
L=open('ah.txt').read().split('\n')
SUBS={'CONVENTIONAL TYPE':'Conventional','PRE-1990 MODERN TYPE':'Modern, pre-1990','POST-1990 MODERN TYPE':'Modern, post-1990','A-FRAME TYPE':'A-frame','ATTACHED':'Attached garage','DETACHED':'Detached garage'}
part=None; sub=None; tables={}; page=None
order=[]
i=0
while i<len(L):
    l=L[i]; s=l.strip()
    m=re.search(r'AH 531\.(\d+)\s*[–—-]\s*([A-Za-z ,\-]+?)\s+(\d+)\s+January 2026',l)
    if m: page=int(m.group(3))
    if s in ('SINGLE-FAMILY RESIDENTIAL','MOUNTAIN RESIDENCES','MULTIPLE-FAMILY RESIDENCES','RESIDENTIAL GARAGES','MANUFACTURED HOUSING'): part=s.title().replace('-Family','-family'); sub=None
    if s in SUBS: sub=SUBS[s]
    hm=re.match(r'^"([CD])" CONSTRUCTION(?:\s*-\s*(.+?))?\s*`?$',s)
    if hm and i+1<len(L) and L[i+1].strip().startswith('Class'):
        cons=hm.group(1); shape=(hm.group(2) or '').strip(); areas=[int(x) for x in L[i+1].split()[1:]]
        key=f'{part}|{sub}|{cons}|{shape}'
        t=tables.setdefault(key,{'part':part,'type':sub,'construction':cons,'shape':shape,'rows':{},'pages':set()})
        if key not in order: order.append(key)
        j=i+2
        while j<len(L) and re.match(r'^\s*[CD]-?\d',L[j]):
            p=L[j].split(); cls=p[0]; vals=[float(x) for x in p[1:]]
            row=t['rows'].setdefault(cls,{})
            for a,v in zip(areas,vals): row[a]=v
            j+=1
        t['pages'].add(page); i=j; continue
    i+=1
# pages are the footer AFTER the table; fine as a citation (+/-1)
out=[]
for k in order:
    t=tables[k]; areas=sorted({a for r in t['rows'].values() for a in r})
    out.append({'part':t['part'],'type':t['type'],'construction':t['construction'],'shape':t['shape'],'pages':sorted(p+1 for p in t['pages'] if p),
      'areas':areas,'rows':{c:[r.get(a) for a in areas] for c,r in t['rows'].items()}})
# percent good: two pages, right-aligned pairs
def pg_page(start_kw, lives):
    idx=[n for n,l in enumerate(L) if start_kw in l][0]
    res={lv:{} for lv in lives}
    for l in L[idx+3:idx+70]:
        p=l.split()
        if not p or not re.fullmatch(r'\d+',p[0]): 
            if 'January 2026' in l: break
            continue
        age=int(p[0]); nums=[int(x) for x in p[1:]]
        pairs=[nums[k:k+2] for k in range(len(nums)-2,-1,-2)][::-1] if len(nums)%2==0 else []
        for lv,pr in zip(lives[len(lives)-len(pairs):],pairs): res[lv][age]=pr[1]
    return res
pg={}
pg.update(pg_page('20 Year Avg. Life',[20,25,30,40])); pg.update(pg_page('45 Year Avg. Life',[45,50,55,60]))
ref={'source':"California State Board of Equalization, Assessors' Handbook Section 531, Residential Building Costs (December 2025, effective January 1, 2026)",
 'location':{'Santa Barbara County – Southern Zone (south of the Santa Ynez River)':1.40,'Santa Barbara County – Northern Zone':1.10,'note':'Location adjustment map, AH 531.10 p. 6 (legend L = 1.40, F = 1.10). Additional considerations per BOE: extraordinary permits and fees, climate zone requirements.'},
 'tables':out,'percentGood':pg,
 'averageLife':{'note':'AH 531.70 p. 82: D or C single-family residence – class 5: 55 years, classes 6–10: 60 years (half classes round up).','sfr':{5:55,6:60,7:60,8:60,9:60,10:60}},
 'pools':{'concrete_psf':[94,173],'fiberglass_psf':[70,94],'liner_psf':[45,70],'typical440_concrete_psf':[113.14,161.05],'spa_with_pool':{'gunite':[14512,26927],'fiberglass':[11460,19290]},'spa_without_pool':{'gunite':[28262,36285],'fiberglass':[20244,25957]},'pages':[63]}}
json.dump(ref,open('boe2026.json','w'),indent=0)
print(len(out)); [print(t['part'],'|',t['type'],'|',t['construction'],t['shape'],len(t['rows']),t['areas'][:3],'…',t['areas'][-1],t['pages']) for t in out]
print({k:len(v) for k,v in pg.items()}, pg[60].get(50), pg[60].get(0), pg[40].get(31))
