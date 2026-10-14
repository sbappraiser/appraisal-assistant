"""Regression reliability test on the converted comp database.
For each market segment: a log-price hedonic regression with period fixed effects, then for every
feature: sales count, estimate, robust 95% CI, bootstrap sign stability, early/late split agreement,
and a plain grade.  Writes JSON results for the report.
usage: python3 -I reliability.py <assistant_comps.db> <out.json>"""
import sqlite3, sys, json, math, collections
import numpy as np, pandas as pd

DB, OUT = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(20261013)
d = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
df = pd.read_sql('''select s.sale_id, s.zip, s.price, s.sale_month, s.resale_flag, c.* from sales s
                    join comp_records c on c.rec_id = s.primary_rec_id
                    where s.use_for_analysis = 1''', d)
df = df.loc[:, ~df.columns.duplicated()]
n_all = len(df)
df = df[(df.sale_month >= '2012-01') & df.quality.notna() & df.condition.notna() & df.site_sf.notna() & (df.price > 100000)].copy()
n_base = len(df)

# ---------------------------------------------------------------- features
df['lnP'] = np.log(df.price)
df['lnGLA'] = np.log(df.gla)
df['lnSite'] = np.log(df.site_sf.clip(lower=1000))
ratio = (df.usable_sf / df.site_sf).clip(0.02, 1.0)
df['usable_known'] = df.usable_sf.notna().astype(int)
df['lnUsableShare'] = np.where(df.usable_known == 1, np.log(ratio.fillna(1)), 0.0)
q = df.quality.astype(int); c = df.condition.astype(int)
for k in (1, 2, 3): df[f'Q{k}'] = (q == k).astype(int)
df['Q5_6'] = (q >= 5).astype(int)
df['C1'] = (c == 1).astype(int); df['C2'] = (c == 2).astype(int); df['C4'] = (c == 4).astype(int); df['C5_6'] = (c >= 5).astype(int)
df['baths_full'] = df.baths_full.fillna(df.baths_full.median()); df['baths_half'] = df.baths_half.fillna(0)
df['beds'] = df.beds.fillna(df.beds.median())
df['age10'] = (df.actual_age.fillna(df.actual_age.median()).clip(0, 120)) / 10.0
vt = df.view_types.fillna('')
water = vt.str.contains('Water')
df['view_water_full'] = (water & (df.view_limited == 0) & (df.view_rating != 'Adverse')).astype(int)
df['view_water_limited'] = (water & (df.view_limited == 1) & (df.view_rating != 'Adverse')).astype(int)
df['view_mtn_city'] = (~water & vt.str.contains('Mountain|City Skyline|Canyon') & (df.view_rating == 'Beneficial')).astype(int)
df['view_adverse'] = (df.view_rating == 'Adverse').astype(int)
lf = df.location_factors.fillna('')
df['loc_adverse'] = ((df.location_rating == 'Adverse') & ~lf.str.contains('BusyRd|FwyNse|Noise|Train|ShrDrv|PvtLn|PvtRd')).astype(int)
df['loc_beneficial'] = ((df.location_rating == 'Beneficial') & ~lf.str.contains('WtrFr')).astype(int)
df['loc_busy_road'] = lf.str.contains('BusyRd|FwyNse|Noise|Train').astype(int)
df['loc_shared_drive'] = lf.str.contains('ShrDrv').astype(int)
df['loc_private_lane'] = lf.str.contains('PvtLn|PvtRd').astype(int)
df['loc_waterfront'] = lf.str.contains('WtrFr').astype(int)
df['garage_spaces'] = df.garage_spaces.fillna(df.garage_spaces.median()).clip(0, 5)
df['bsmt_fin_k'] = df.bsmt_fin_sf.fillna(0) / 1000.0
df['acc_known'] = df.acc_count.notna().astype(int)
df['acc_fin_k'] = df.acc_fin_sf.fillna(0).clip(0, 8000) / 1000.0
df['acc_unfin_k'] = (df.acc_unfin_sf.fillna(0) + df.acc_unlabeled_sf.fillna(0)).clip(0, 10000) / 1000.0
df['pool'] = df.pool.fillna(0).astype(int)
df['spa_no_pool'] = ((df.spa == 1) & (df.pool == 0)).astype(int)
df['sport_court'] = ((df.tennis == 1) | (df.sport_court == 1) | (df.pickleball == 1)).astype(int)
L = df.landscaping.fillna('?')
df['land_known'] = (L != '?').astype(int)
df['land_below_avg'] = L.isin(['Minimal', 'Fair', 'Avg-Fair', 'Poor', 'Immature']).astype(int)
df['land_avg_good'] = (L == 'Avg-Good').astype(int)
df['land_good_plus'] = L.isin(['Good', 'Very Good', 'Excellent']).astype(int)
df['land_natural'] = L.isin(['None/Natural', 'Orchard/Vineyard']).astype(int)
df['solar'] = df.solar.fillna(0).astype(int)

FEATURES = [  # (column, plain name, kind, expected sign)
    ('lnGLA', 'Gross living area', 'log', +1),
    ('lnSite', 'Site size (total lot)', 'log', +1),
    ('lnUsableShare', 'Usable share of the lot (when recorded)', 'logshare', +1),
    ('Q1', 'Quality Q1 vs Q4', 'dummy', +1), ('Q2', 'Quality Q2 vs Q4', 'dummy', +1), ('Q3', 'Quality Q3 vs Q4', 'dummy', +1),
    ('Q5_6', 'Quality Q5/Q6 vs Q4', 'dummy', -1),
    ('C1', 'Condition C1 vs C3', 'dummy', +1), ('C2', 'Condition C2 vs C3', 'dummy', +1), ('C4', 'Condition C4 vs C3', 'dummy', -1),
    ('C5_6', 'Condition C5/C6 vs C3', 'dummy', -1),
    ('baths_full', 'Full bath (each)', 'count', +1), ('baths_half', 'Half bath (each)', 'count', +1), ('beds', 'Bedroom (each, GLA held equal)', 'count', 0),
    ('age10', 'Actual age (per 10 years, condition held equal)', 'count', 0),
    ('view_water_full', 'Ocean/water view, unobstructed', 'dummy', +1), ('view_water_limited', 'Ocean/water view, limited', 'dummy', +1),
    ('view_mtn_city', 'Mountain/city view (beneficial, no water)', 'dummy', +1), ('view_adverse', 'Adverse view', 'dummy', -1),
    ('loc_waterfront', 'Waterfront / beach / bluff', 'dummy', +1), ('loc_beneficial', 'Beneficial location (other)', 'dummy', +1),
    ('loc_adverse', 'Other adverse location (not road noise / shared drive / private lane)', 'dummy', -1), ('loc_busy_road', 'Busy road / freeway / train noise', 'dummy', -1),
    ('loc_shared_drive', 'Shared driveway', 'dummy', -1), ('loc_private_lane', 'Private lane / road', 'dummy', 0),
    ('garage_spaces', 'Garage space (each)', 'count', +1), ('bsmt_fin_k', 'Finished basement (per 1,000 sf)', 'per1000', +1),
    ('acc_fin_k', 'Finished accessory buildings – guest house/ADU/studio/pool house (per 1,000 sf)', 'per1000', +1),
    ('acc_unfin_k', 'Unfinished/other outbuildings – barn/storage/workshop (per 1,000 sf)', 'per1000', +1),
    ('pool', 'Pool', 'dummy', +1), ('spa_no_pool', 'Spa only (no pool)', 'dummy', +1), ('sport_court', 'Tennis / sport / pickleball court', 'dummy', +1),
    ('land_good_plus', 'Landscaping Good or better vs Average', 'dummy', +1), ('land_avg_good', 'Landscaping Avg-Good vs Average', 'dummy', +1),
    ('land_below_avg', 'Landscaping below Average (Minimal/Fair/Immature)', 'dummy', -1), ('land_natural', 'Natural landscaping / orchard vs Average', 'dummy', 0),
    ('solar', 'Solar', 'dummy', +1),
]
CONTROLS = ['usable_known', 'acc_known', 'land_known']

SEGMENTS = [
    ('montecito', 'Montecito (93108)', ['93108']),
    ('hope_ranch', 'Hope Ranch / Foothills (93110)', ['93110']),
    ('sb_city', 'Santa Barbara – Riviera, San Roque, Downtown, East/West side (93101, 93103, 93105)', ['93101', '93103', '93105']),
    ('mesa', 'Mesa (93109)', ['93109']),
    ('goleta', 'Goleta (93111, 93117)', ['93111', '93117']),
    ('carp_summ', 'Carpinteria / Summerland (93013, 93067)', ['93013', '93067']),
    ('all', 'All areas together (ZIP held equal)', None),
]

def ols(X, y):
    XtX_inv = np.linalg.pinv(X.T @ X)
    b = XtX_inv @ X.T @ y
    e = y - X @ b
    n, k = X.shape
    meat = (X * e[:, None] ** 2).T @ X
    V = XtX_inv @ meat @ XtX_inv * n / max(n - k, 1)  # HC1
    return b, np.sqrt(np.clip(np.diag(V), 0, None)), e

def period(sm, per):
    y, m = int(sm[:4]), int(sm[5:7])
    return f'{y}-Q{(m - 1) // 3 + 1}' if per == 'Q' else f'{y}-H{1 if m <= 6 else 2}'

def design(sub, per, extra_dummies=None):
    cols = []
    feats = []
    for f, *_ in FEATURES:
        v = sub[f].values.astype(float)
        if np.nanstd(v) > 0 and (sub[f] != 0).sum() >= 5: feats.append(f)
    ctrl = [cname for cname in CONTROLS if sub[cname].std() > 0]
    P = sub.sale_month.map(lambda s: period(s, per))
    periods = sorted(P.unique())
    Pd = pd.get_dummies(P).reindex(columns=periods, fill_value=0).astype(float)
    base_period = periods[0]
    Pd = Pd.drop(columns=[base_period])
    parts = [pd.Series(1.0, index=sub.index, name='const'), sub[feats + ctrl].astype(float), Pd]
    if extra_dummies is not None:
        Z = pd.get_dummies(sub[extra_dummies]).astype(float)
        Z = Z.drop(columns=[Z.sum().idxmax()])
        Z.columns = [f'zip_{x}' for x in Z.columns]
        parts.append(Z)
    X = pd.concat(parts, axis=1)
    return X, feats, periods

def fit_segment(key, label, zips):
    sub = df if zips is None else df[df.zip.isin(zips)]
    sub = sub.copy()
    n = len(sub)
    per_count = n / max(1, sub.sale_month.map(lambda s: period(s, 'Q')).nunique())
    per = 'Q' if per_count >= 15 else 'H'
    X, feats, periods = design(sub, per, 'zip' if zips is None else None)
    y = sub.lnP.values
    Xv = X.values
    b, se, e = ols(Xv, y)
    names = list(X.columns)
    r2 = 1 - (e ** 2).sum() / ((y - y.mean()) ** 2).sum()
    # 5-fold out-of-sample accuracy
    idx = rng.permutation(n); folds = np.array_split(idx, 5); ape = []
    for f_ in folds:
        tr = np.setdiff1d(idx, f_)
        bb, _, _ = ols(Xv[tr], y[tr])
        ape.extend(np.abs(np.exp(Xv[f_] @ bb - y[f_]) - 1))
    mdape = float(np.median(ape))
    # bootstrap
    B = 200
    boots = np.empty((B, len(names)))
    for i in range(B):
        s_ = rng.integers(0, n, n)
        boots[i], _, _ = ols(Xv[s_], y[s_])
    # early / late split
    early = (sub.sale_month < '2019-01').values
    halves = {}
    for nm, mask in (('2012-2018', early), ('2019-2026', ~early)):
        if mask.sum() >= 150:
            Xs = X[mask]
            keep = [c_ for c_ in Xs.columns if Xs[c_].std() > 0 or c_ == 'const']
            bs, ses, _ = ols(Xs[keep].values, y[mask])
            halves[nm] = {c_: (bs[i], ses[i]) for i, c_ in enumerate(keep)}
    medP = float(np.median(sub.price)); medG = float(np.median(sub.gla)); medS = float(np.median(sub.site_sf))
    res = []
    for f, plain, kind, exp_sign in FEATURES:
        row = {'feature': f, 'name': plain, 'kind': kind}
        if f in ('lnUsableShare',):
            n_with = int(sub.usable_known.sum()); n_var = int(((sub.usable_known == 1) & (sub.usable_sf < sub.site_sf * 0.9)).sum())
        elif kind in ('dummy',):
            n_with = int((sub[f] == 1).sum()); n_var = n_with
        elif kind in ('per1000',):
            n_with = int((sub[f] > 0).sum()); n_var = n_with
        else:   # continuous / count: sales that differ from the typical (median) value
            n_with = int(sub[f].notna().sum()); n_var = int((sub[f] != sub[f].median()).sum())
        row.update(n_with=n_with, n_varying=n_var)
        if f not in names:
            row.update(grade='Insufficient data', why='too few sales with this feature to test', est=None)
            res.append(row); continue
        i = names.index(f)
        est, s = float(b[i]), float(se[i])
        lo, hi = est - 1.96 * s, est + 1.96 * s
        t = est / s if s > 0 else 0
        p = math.erfc(abs(t) / math.sqrt(2))
        bs_i = boots[:, i]
        same_sign = float(np.mean(np.sign(bs_i) == np.sign(est))) if est != 0 else 0.0
        b5, b95 = np.percentile(bs_i, [5, 95])
        hv = {}
        for hn, hd in halves.items():
            if f in hd: hv[hn] = {'est': float(hd[f][0]), 'se': float(hd[f][1])}
        halves_agree = all(np.sign(v['est']) == np.sign(est) for v in hv.values()) if len(hv) == 2 else None
        # dollars at the segment median
        if kind == 'log':
            ref = medG if f == 'lnGLA' else medS
            dollars = est * medP / ref
            unit = '$ per sf of GLA' if f == 'lnGLA' else '$ per sf of land'
            dollars_lo, dollars_hi = lo * medP / ref, hi * medP / ref
            pct = f'{est:.2f}% per 1% more' if False else None
            pct_txt = f'+1% {"GLA" if f == "lnGLA" else "lot size"} → {est:+.2f}% price'
            if f == 'lnSite':
                dollars, dollars_lo, dollars_hi = dollars * 43560, dollars_lo * 43560, dollars_hi * 43560; unit = '$ per acre (at the median lot)'
        elif kind == 'logshare':
            # effect of 10 percentage points less usable land at the median
            eff = math.exp(est * math.log(0.9)) - 1
            dollars, dollars_lo, dollars_hi = eff * medP, (math.exp(hi * math.log(0.9)) - 1) * medP, (math.exp(lo * math.log(0.9)) - 1) * medP
            unit = '$ for 10% of the lot being unusable'; pct_txt = f'10% unusable → {eff:+.1%} price'
        elif kind == 'per1000':
            dollars, dollars_lo, dollars_hi = (math.exp(est) - 1) * medP / 1000, (math.exp(lo) - 1) * medP / 1000, (math.exp(hi) - 1) * medP / 1000
            unit = '$ per sf'; pct_txt = f'+1,000 sf → {math.exp(est)-1:+.1%} price'
        else:
            dollars, dollars_lo, dollars_hi = (math.exp(est) - 1) * medP, (math.exp(lo) - 1) * medP, (math.exp(hi) - 1) * medP
            unit = '$ each' if kind == 'count' else '$'; pct_txt = f'{math.exp(est)-1:+.1%} of price'
        sign_ok = exp_sign == 0 or np.sign(est) == exp_sign
        min_n = 30
        if n_var < 15:
            grade, why = 'Insufficient data', f'only {n_var} sales with this feature'
        elif p < 0.05 and same_sign >= 0.95 and n_var >= min_n and halves_agree is not False and sign_ok and (abs(est) > 0 and (hi - lo) / 2 < 0.75 * abs(est)):
            grade, why = 'Supported', 'significant, stable in resampling and in both time periods'
        elif p < 0.10 and same_sign >= 0.90 and sign_ok:
            reasons = []
            if n_var < min_n: reasons.append(f'only {n_var} sales')
            if halves_agree is False: reasons.append('direction differs between 2012-18 and 2019-26')
            if (hi - lo) / 2 >= 0.75 * abs(est): reasons.append('wide range')
            if p >= 0.05: reasons.append('borderline significance')
            grade, why = 'Use with caution', '; '.join(reasons) or 'moderately stable'
        elif not sign_ok and p < 0.05:
            grade, why = 'Inconsistent', 'comes out in the unexpected direction – likely tangled with other features (do not use)'
        else:
            grade, why = 'Not supported', f'not distinguishable from zero (p={p:.2f})'
        row.update(est=est, se=s, lo=lo, hi=hi, p=p, boot_same_sign=same_sign, boot5=float(b5), boot95=float(b95), halves=hv,
                   halves_agree=halves_agree, dollars=dollars, dollars_lo=min(dollars_lo, dollars_hi), dollars_hi=max(dollars_lo, dollars_hi),
                   unit=unit, effect=pct_txt, grade=grade, why=why)
        res.append(row)
    # constant-quality price index from period effects
    idx_rows = []
    for pname in periods:
        if pname == periods[0]: val = 0.0
        else: val = float(b[names.index(pname)])
        cnt = int((sub.sale_month.map(lambda s: period(s, per)) == pname).sum())
        idx_rows.append({'period': pname, 'index': round(100 * math.exp(val), 1), 'sales': cnt})
    base = next((r_['index'] for r_ in idx_rows if r_['period'].startswith('2019')), idx_rows[0]['index'])
    for r_ in idx_rows: r_['index_2019'] = round(100 * r_['index'] / base, 1)
    return {'key': key, 'label': label, 'zips': zips, 'n': n, 'period': per, 'r2': float(r2), 'mdape': mdape,
            'median_price': medP, 'median_gla': medG, 'median_site': medS,
            'features': res, 'index': idx_rows, 'years': f'{sub.sale_month.min()[:4]}–{sub.sale_month.max()[:4]}'}

results = [fit_segment(*s) for s in SEGMENTS]
meta = {'n_sales_in_db': int(d.execute('select count(*) from sales').fetchone()[0]), 'n_analysis_candidates': n_all,
        'n_used': n_base, 'filters': 'sold 2012-01 or later, single-family detached, arm\'s-length/estate/relo sales, Q and C ratings recorded, site recorded, price > $100,000; one record per sale (her most recent research of that sale)',
        'method': 'log(price) regression per area with quarter (or half-year) fixed effects; robust (HC1) standard errors; 200 bootstrap resamples; separate fits for 2012-2018 and 2019-2026; 5-fold out-of-sample check'}
json.dump({'meta': meta, 'segments': results}, open(OUT, 'w'), indent=1, default=float)
for s in results:
    print(f"\n== {s['label']}  n={s['n']}  R2={s['r2']:.3f}  MdAPE={s['mdape']:.1%}  per={s['period']}")
    for f in s['features']:
        if f.get('est') is None: print(f"   {f['name'][:55]:55s} {f['grade']}  ({f['why']})"); continue
        print(f"   {f['name'][:55]:55s} n={f['n_varying']:5d} {f['effect']:32s} ${f['dollars']:>12,.0f} [{f['dollars_lo']:>12,.0f} – {f['dollars_hi']:>12,.0f}] {f['unit'][:18]:18s} p={f['p']:.3f} boot={f['boot_same_sign']:.2f} halves={f['halves_agree']}  → {f['grade']}")
