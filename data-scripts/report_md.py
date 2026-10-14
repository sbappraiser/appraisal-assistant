import json, math
R=json.load(open('/home/claude/aa/data/reliability.json'))
segs=R['segments']
def money(v):
    a=abs(v); s='-' if v<0 else ''
    if a>=1e6: return f'{s}${a/1e6:.1f}M'
    if a>=1e3: return f'{s}${a/1e3:.0f}k'
    return f'{s}${a:.0f}'
def val(g):
    k=g['kind']
    if k=='log': return f"{money(g['dollars'])}/sf" if g['feature']=='lnGLA' else f"{money(g['dollars'])}/ac"
    if k=='logshare': return money(g['dollars'])
    if k=='per1000': return f"{money(g['dollars'])}/sf"
    pct=math.exp(g['est'])-1
    return f"{pct:+.0%} ({money(g['dollars'])})"
def cell(g):
    if g.get('est') is None or g['grade']=='Insufficient data': return 'too few'
    if g['grade']=='Supported': return '**'+val(g)+'**'
    if g['grade']=='Use with caution': return '~'+val(g)
    if g['grade']=='Inconsistent': return 'wrong direction'
    return 'no'
SHORT={'montecito':'Montecito','hope_ranch':'Hope Ranch','sb_city':'SB city','mesa':'Mesa','goleta':'Goleta','carp_summ':'Carp / Summ','all':'All areas'}
NAMES={'lnGLA':'GLA (per sf)','lnSite':'Lot size (per acre, at median lot)','lnUsableShare':'10% of lot unusable','Q1':'Q1 vs Q4','Q2':'Q2 vs Q4','Q3':'Q3 vs Q4','Q5_6':'Q5/Q6 vs Q4',
'C1':'C1 vs C3','C2':'C2 vs C3','C4':'C4 vs C3','C5_6':'C5/C6 vs C3','baths_full':'Full bath, each','baths_half':'Half bath, each','beds':'Bedroom, each (GLA equal)','age10':'Age, per 10 years (C equal)',
'view_water_full':'Ocean view, unobstructed','view_water_limited':'Ocean view, limited','view_mtn_city':'Mountain / city view','view_adverse':'Adverse view','loc_waterfront':'Waterfront / beach / bluff',
'loc_beneficial':'Beneficial location (other)','loc_adverse':'Other adverse location','loc_busy_road':'Busy road / freeway / train','loc_shared_drive':'Shared driveway','loc_private_lane':'Private lane / road',
'garage_spaces':'Garage space, each','bsmt_fin_k':'Finished basement (per sf)','acc_fin_k':'Guest house / ADU / studio (per sf)','acc_unfin_k':'Barn / storage / workshop (per sf)','pool':'Pool','spa_no_pool':'Spa only',
'sport_court':'Tennis / sport court','land_good_plus':'Landscaping Good+ vs Avg','land_avg_good':'Landscaping Avg-Good vs Avg','land_below_avg':'Landscaping below Avg','land_natural':'Natural / orchard vs Avg','solar':'Solar'}
skip={'view_adverse'}
hdr='| Feature | '+' | '.join(SHORT[s['key']] for s in segs)+' |\n| --- |'+' --- |'*len(segs)+'\n'
rows=''
for i,f in enumerate(segs[0]['features']):
    if f['feature'] in skip: continue
    rows+=f"| {NAMES[f['feature']]} | "+' | '.join(cell(s['features'][i]) for s in segs)+' |\n'
fit='| Area | Sales | Years | Median price | Median GLA | Typical miss (out-of-sample) |\n| --- | --- | --- | --- | --- | --- |\n'
for s in segs:
    fit+=f"| {s['label'].split(' (')[0] if s['key']!='all' else 'All areas'} | {s['n']:,} | {s['years']} | {money(s['median_price'])} | {s['median_gla']:,.0f} sf | {s['mdape']:.0%} |\n"
open('/home/claude/aa/report/s2.md','w').write(hdr+rows); open('/home/claude/aa/report/fit.md','w').write(fit)
# Montecito detail
m=segs[0]
det='| Feature | Effect | At the median sale | 95% range | Sales with it | Stable in resampling | 2012–18 vs 2019–26 | Grade |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n'
for f in m['features']:
    if f['feature'] in skip: continue
    if f.get('est') is None: det+=f"| {NAMES[f['feature']]} | | | | {f['n_varying']} | | | Too few sales |\n"; continue
    u=val(f).split(' (')[-1].rstrip(')') if f['kind'] not in ('log','logshare','per1000') else val(f)
    rng=f"{money(f['dollars_lo'])} to {money(f['dollars_hi'])}"
    if f['kind']=='log': rng+=' per sf' if f['feature']=='lnGLA' else ' per ac'
    if f['kind']=='per1000': rng+=' per sf'
    def hfmt(v):
        if f['kind']=='log': return f"{v['est']:+.2f}%"
        if f['kind']=='logshare': return f"{math.exp(v['est']*math.log(0.9))-1:+.1%}"
        return f"{math.exp(v['est'])-1:+.0%}"
    h=f['halves']; hv=' / '.join(hfmt(v) for v in h.values()) if h else ''
    eff=f['effect'].replace(' of price','').replace(' price','').replace('→','=')
    grade={'Supported':'Supported','Use with caution':'Use with caution','Not supported':'Not supported','Insufficient data':'Too few sales','Inconsistent':'Wrong direction – do not use'}[f['grade']]
    det+=f"| {NAMES[f['feature']]} | {eff} | {u} | {rng} | {f['n_varying']:,} | {f['boot_same_sign']:.0%} | {hv} | {grade} |\n"
open('/home/claude/aa/report/s3.md','w').write(det)
print(hdr+rows); print(fit); print(det)
