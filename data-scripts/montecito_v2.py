"""Montecito re-test the way Jennifer adjusts: usable acres (no total site), view tiers, busy road split from
'some traffic'.  usage: python3 -I montecito_v2.py <assistant_comps.db> <out.json>"""
import sqlite3, sys, json, math, re
import numpy as np, pandas as pd
rng = np.random.default_rng(7)
d = sqlite3.connect(f'file:{sys.argv[1]}?mode=ro', uri=True)
df = pd.read_sql('''select s.price, s.sale_month, c.* from sales s join comp_records c on c.rec_id = s.primary_rec_id
    where s.use_for_analysis = 1 and s.zip = '93108' and s.sale_month >= '2012-01' and c.quality is not null and c.condition is not null''', d)
df = df.loc[:, ~df.columns.duplicated()]
n_all = len(df)
df = df[df.usable_sf.notna() & (df.usable_sf > 1000)].copy()
df['usable_ac'] = df.usable_sf / 43560
df = df[df.usable_ac <= 15]

def tier(raw):
    """Her scale: Adverse -1 | Neutral 0 (garden, wooded, residential; also anything she rated N) |
    Beneficial limited 1 | Beneficial full 2 | Beneficial panoramic / unobstructed / coastline 3."""
    v = (raw if isinstance(raw, str) else '').lower()
    if v.startswith('a;'): return -1
    if not v.startswith('b;'): return 0
    if re.search(r'coast|unobstr|panor|whitewater|excel', v): return 3
    if re.search(r'ltd|limited|peek|partial|filtered', v): return 1
    return 2
df['view_tier'] = df.view_raw.map(tier)
lf = df.location_raw.fillna('').str.lower()
df['busy_road'] = lf.str.contains(r'bsyrd|busy|heavy|fwy|hwy|freeway|trainnse|train').astype(int)
df['some_traffic'] = (lf.str.contains(r'some\s*tr|smetrfc|sometr|bckstrfc|trfcnse') & (df.busy_road == 0)).astype(int)
df['shared_drive'] = lf.str.contains('shrdrv|shared').astype(int)
df['private_lane'] = lf.str.contains(r'prvt|pvt|private').astype(int)
df['flood_debris'] = lf.str.contains(r'fld|flood|dbrs|df|debris').astype(int)
df['waterfront'] = lf.str.contains(r'wtrfr|waterfront|bch|bluff').astype(int)
q = df.quality.astype(int); c = df.condition.astype(int)
for k in (1, 2, 3): df[f'Q{k}'] = (q == k).astype(int)
df['Q5_6'] = (q >= 5).astype(int)
df['C1'] = (c == 1).astype(int); df['C2'] = (c == 2).astype(int); df['C4'] = (c == 4).astype(int); df['C5_6'] = (c >= 5).astype(int)
df['lnGLA'] = np.log(df.gla); df['lnP'] = np.log(df.price)
df['baths_full'] = df.baths_full.fillna(df.baths_full.median()); df['baths_half'] = df.baths_half.fillna(0)
df['acc_known'] = df.acc_count.notna().astype(int); df['acc_fin_k'] = df.acc_fin_sf.fillna(0).clip(0, 8000) / 1000
df['pool'] = df.pool.fillna(0); df['court'] = ((df.tennis == 1) | (df.sport_court == 1) | (df.pickleball == 1)).astype(int)
L = df.landscaping.fillna('?')
df['land_good'] = L.isin(['Good', 'Very Good', 'Excellent']).astype(int); df['land_ag'] = (L == 'Avg-Good').astype(int)
df['land_below'] = L.isin(['Minimal', 'Fair', 'Avg-Fair', 'Poor', 'Immature']).astype(int)
df['qtr'] = df.sale_month.map(lambda s: f'{s[:4]}Q{(int(s[5:7]) - 1) // 3 + 1}')
BASE = ['lnGLA', 'Q1', 'Q2', 'Q3', 'Q5_6', 'C1', 'C2', 'C4', 'C5_6', 'baths_full', 'baths_half', 'acc_known', 'acc_fin_k', 'pool', 'court',
        'land_good', 'land_ag', 'land_below', 'busy_road', 'some_traffic', 'shared_drive', 'private_lane', 'flood_debris', 'waterfront']

def ols(X, y):
    XtX = np.linalg.pinv(X.T @ X); b = XtX @ X.T @ y; e = y - X @ b; n, k = X.shape
    V = XtX @ ((X * e[:, None] ** 2).T @ X) @ XtX * n / (n - k); return b, np.sqrt(np.diag(V)), e

def fit(land_cols, view_cols, data):
    Q = pd.get_dummies(data.qtr).astype(float); Q = Q.drop(columns=[Q.columns[0]])
    X = pd.concat([pd.Series(1.0, index=data.index, name='const'), data[BASE + land_cols + view_cols].astype(float), Q], axis=1)
    b, se, e = ols(X.values, data.lnP.values); names = list(X.columns)
    boots = np.array([ols(X.values[s], data.lnP.values[s])[0] for s in (rng.integers(0, len(data), len(data)) for _ in range(200))])
    return names, b, se, boots, 1 - (e ** 2).sum() / ((data.lnP - data.lnP.mean()) ** 2).sum()

recent = df[df.sale_month >= '2024-01']; P_now = float(recent.price.median())
out = {'n_montecito_rated': n_all, 'n_with_usable': len(df), 'median_price_2024_26': P_now, 'n_2024_26': len(recent),
       'median_usable_ac': float(df.usable_ac.median()), 'view_tier_counts': df.view_tier.value_counts().sort_index().to_dict()}
# A: usable acres, log form -> marginal $ per usable acre at several sizes
df['ln_usable'] = np.log(df.usable_ac)
names, b, se, boots, r2 = fit(['ln_usable'], ['view_tier'], df)
i = names.index('ln_usable'); bl = b[i]; bls = boots[:, i]
marg = {}
for a in (0.5, 1.0, 1.5, 2.0, 3.0):
    # $ value of one more usable acre going from a to a+1 at today's median price for a home on a acres
    m = lambda bb: P_now * (math.exp(bb * math.log((a + 1) / a)) - 1)
    marg[str(a)] = {'est': m(bl), 'lo': float(np.percentile([m(x) for x in bls], 2.5)), 'hi': float(np.percentile([m(x) for x in bls], 97.5))}
out['usable_log'] = {'coef': bl, 'se': se[i], 'p': math.erfc(abs(bl / se[i]) / math.sqrt(2)), 'r2': r2, 'per_acre_next': marg}
j = names.index('view_tier'); vt = b[j]
out['view_tier_linear'] = {'pct_per_tier': math.exp(vt) - 1, 'lo': math.exp(np.percentile(boots[:, j], 2.5)) - 1, 'hi': math.exp(np.percentile(boots[:, j], 97.5)) - 1, 'p': math.erfc(abs(vt / se[j]) / math.sqrt(2))}
def coef(nm):
    k = names.index(nm); return {'pct': math.exp(b[k]) - 1, 'lo': math.exp(np.percentile(boots[:, k], 2.5)) - 1, 'hi': math.exp(np.percentile(boots[:, k], 97.5)) - 1,
                                 'p': math.erfc(abs(b[k] / se[k]) / math.sqrt(2)), 'n': int(df[nm].sum()), 'dollars_now': (math.exp(b[k]) - 1) * P_now}
out['location'] = {k: coef(k) for k in ('busy_road', 'some_traffic', 'shared_drive', 'private_lane', 'flood_debris', 'waterfront')}
# B: usable acres linear (percent per acre), for comparison
names2, b2, se2, boots2, r2b = fit(['usable_ac'], ['view_tier'], df)
k = names2.index('usable_ac')
out['usable_linear'] = {'pct_per_acre': math.exp(b2[k]) - 1, 'dollars_now': (math.exp(b2[k]) - 1) * P_now,
                        'lo': (math.exp(np.percentile(boots2[:, k], 2.5)) - 1) * P_now, 'hi': (math.exp(np.percentile(boots2[:, k], 97.5)) - 1) * P_now, 'r2': r2b}
# C: view tiers as separate steps (vs tier 0)
for t in (-1, 1, 2, 3): df[f'vt{t}'] = (df.view_tier == t).astype(int)
cols = [f'vt{t}' for t in (1, 2, 3) if df[f'vt{t}'].sum() >= 5] + (['vt-1'] if df['vt-1'].sum() >= 5 else [])
names3, b3, se3, boots3, _ = fit(['ln_usable'], cols, df)
out['view_steps'] = {c_: {'pct': math.exp(b3[names3.index(c_)]) - 1, 'lo': math.exp(np.percentile(boots3[:, names3.index(c_)], 2.5)) - 1,
                          'hi': math.exp(np.percentile(boots3[:, names3.index(c_)], 97.5)) - 1, 'n': int(df[c_].sum())} for c_ in cols}
vv = df.view_raw.fillna('').str.lower(); oc = vv.str.contains(r'wtr|ocn|ocean|coast')
for t in (1, 2): df[f'vt{t}_ocean'] = ((df.view_tier == t) & oc).astype(int); df[f'vt{t}_other'] = ((df.view_tier == t) & ~oc).astype(int)
cols4 = [c_ for c_ in ('vt1_ocean', 'vt1_other', 'vt2_ocean', 'vt2_other', 'vt3') if df[c_].sum() >= 5]
names4, b4, se4, boots4, _ = fit(['ln_usable'], cols4, df)
out['view_steps_by_type'] = {c_: {'pct': math.exp(b4[names4.index(c_)]) - 1, 'lo': math.exp(np.percentile(boots4[:, names4.index(c_)], 2.5)) - 1,
                          'hi': math.exp(np.percentile(boots4[:, names4.index(c_)], 97.5)) - 1, 'n': int(df[c_].sum())} for c_ in cols4}
json.dump(out, open(sys.argv[2], 'w'), indent=1, default=float)
print(json.dumps(out, indent=1, default=lambda x: round(float(x), 3)))
