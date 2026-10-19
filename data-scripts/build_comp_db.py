"""Build the Appraisal Assistant comp database from a COPY of aci_archive.db.
usage: python3 -I build_comp_db.py <aci_archive.db (read-only)> <out.db>
The original is opened read-only and never written."""
import sqlite3, sys, json, re, collections, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parse_aci as P

SRC, OUT = sys.argv[1], sys.argv[2]
src = sqlite3.connect(f'file:{SRC}?mode=ro', uri=True)
src.row_factory = sqlite3.Row
if os.path.exists(OUT): os.remove(OUT)
db = sqlite3.connect(OUT)

rows = src.execute('select * from aci_comps').fetchall()
CUSTOM = ['PorchPatioDeck1', 'PorchPatioDeck2', 'Fireplace', 'FencePool', 'Other1', 'Other2']

# ---------- neighborhood vocabulary (her names + names written after usable acres)
vocab = collections.Counter()
for r in rows:
    if r['NeighborhoodName']: vocab[r['NeighborhoodName'].strip().lower()] += 1
for r in rows:
    for f in CUSTOM:
        k, conf, pay = P.classify_custom(r[f], set())
        if k == 'usable_nbhd' and pay and pay.get('nbhd'): vocab[pay['nbhd'].strip().lower()] += 1
nbhd_vocab = {v for v, n in vocab.items() if n >= 2 and not P.land_rating(v)}
nbhd_vocab |= {re.sub(r'[^a-z]', '', v) for v in nbhd_vocab if re.search(r'[a-z]{3}', v)}

# ---------- pass 1: classify custom values; learn each report's field roles
cls = {}
role_votes = collections.defaultdict(collections.Counter)
for r in rows:
    rep = r['FromFileName'] or '?'
    for f in CUSTOM:
        k, conf, pay = P.classify_custom(r[f], nbhd_vocab)
        cls[(r['comp_row_id'], f)] = (k, conf, pay)
        if k and conf >= 2: role_votes[(rep, f)][k] += 1
role = {key: c.most_common(1)[0][0] for key, c in role_votes.items()}
# global fallback role per field (used when a report has no confident values in that field)
glob_votes = collections.defaultdict(collections.Counter)
for (rep, f), c in role_votes.items():
    glob_votes[f][c.most_common(1)[0][0]] += 1

def resolve(r, f):
    """Return (kind, payload, how) after applying the report's field role to ambiguous values."""
    k, conf, pay = cls[(r['comp_row_id'], f)]
    if k is None: return None, None, None
    if conf >= 2: return k, pay, 'pattern'
    rl = role.get((r['FromFileName'] or '?', f))
    raw = P.clean(r[f])
    if rl is None:
        return (k, pay, 'pattern-weak') if conf >= 1 else (k, pay, 'unmatched')
    if k == 'none':
        return ({'accessory': 'accessory', 'amenity_land': 'amenity_land', 'fireplace': 'fireplace',
                 'usable_nbhd': 'none', 'porch': 'porch'}.get(rl, 'none'),
                {'accessory': {'blds': []}, 'amenity_land': {'amen': [], 'land': None},
                 'fireplace': {'count': 0}}.get(rl), 'report-role')
    if re.fullmatch(r'\s*[0-6]\s*', raw or ''):
        if f == 'Fireplace' and rl in (None, 'fireplace'): return 'fireplace', {'count': int(raw)}, 'report-role'
        return 'other', None, 'unmatched'
    if rl == 'usable_nbhd':
        if re.fullmatch(r'\s*\d*\.\d+\s*', raw or ''):   # bare decimal = usable acres; bare integers stay ambiguous
            return 'usable_nbhd', {'usable_sf': P.area_token(('0' if raw.strip().startswith('.') else '') + raw.strip()), 'usable_pct': None, 'nbhd': None, 'ff': None}, 'report-role'
        if k in ('nbhd', 'other', 'land_only') and re.search(r'[A-Za-z]', raw or ''):
            topo = None
            m = re.match(r'\s*(steep|sloping|slope|level|hillside|gentle\w*)\s*/\s*(.+)$', raw, re.I)
            if m: return 'usable_nbhd', {'usable_sf': None, 'usable_pct': None, 'nbhd': m.group(2).strip(), 'ff': None, 'topo': m.group(1)}, 'report-role'
            return 'usable_nbhd', {'usable_sf': None, 'usable_pct': None, 'nbhd': raw, 'ff': None}, 'report-role'
    if rl == 'amenity_land':
        if k == 'land_only': return 'amenity_land', {'amen': [], 'land': pay['land']}, 'report-role'
        if k == 'amenity_land': return k, pay, 'report-role'
    if rl == 'accessory' and k == 'accessory': return k, pay, 'report-role'
    if rl == 'fireplace' and re.fullmatch(r'\s*\d\s*', raw or ''): return 'fireplace', {'count': int(raw)}, 'report-role'
    if conf >= 1 and k == rl: return k, pay, 'report-role'
    if conf >= 1: return k, pay, 'pattern-weak'
    return k, pay, 'unmatched'

# ---------- schema
db.executescript('''
CREATE TABLE comp_records (
  rec_id INTEGER PRIMARY KEY,               -- = aci_comps.comp_row_id in the original archive
  sale_id INTEGER, aci_property_id INTEGER, from_report TEXT, record_role TEXT, comparable_type TEXT, property_type_id INTEGER,
  entered_date TEXT, entered_by TEXT,
  street_number TEXT, street_name TEXT, unit TEXT, city TEXT, zip TEXT, area_name TEXT, norm_address TEXT, apn TEXT,
  neighborhood TEXT, neighborhood_row TEXT, census_tract TEXT,
  price REAL, sale_month TEXT, contract_month TEXT, sale_type TEXT, financing TEXT, concession_amt REAL,
  mls_no TEXT, dom INTEGER, verification TEXT, listing_status TEXT,
  location_rating TEXT, location_factors TEXT, location_raw TEXT,
  site_sf REAL, usable_sf REAL, usable_pct REAL, usable_source TEXT, front_feet INTEGER, topography TEXT,
  view_rating TEXT, view_types TEXT, view_limited INTEGER, view_panoramic INTEGER, view_grade_old TEXT, view_raw TEXT,
  attachment TEXT, stories REAL, style TEXT, design_raw TEXT,
  quality INTEGER, quality_mod TEXT, quality_raw TEXT, condition INTEGER, condition_mod TEXT, condition_raw TEXT,
  actual_age INTEGER, effective_age INTEGER, year_built_est INTEGER,
  rooms INTEGER, beds INTEGER, baths_full INTEGER, baths_half INTEGER, gla INTEGER,
  bsmt_sf INTEGER, bsmt_fin_sf INTEGER, bsmt_access TEXT, bg_rec INTEGER, bg_beds INTEGER, bg_full INTEGER, bg_half INTEGER, bg_other INTEGER,
  garage_spaces INTEGER, garage_type TEXT, driveway_spaces INTEGER, carport_spaces INTEGER, garage_raw TEXT,
  heating_cooling TEXT, energy_raw TEXT, solar INTEGER, battery INTEGER, generator INTEGER,
  fu_raw TEXT, remodel_year INTEGER, buyer_to_remodel INTEGER, cost_to_cure INTEGER, deferred_maint INTEGER, two_lots INTEGER,
  lpr_days INTEGER, storm_impact INTEGER, buyer_broker_pct REAL, dated INTEGER,
  porch_patio TEXT, fireplaces INTEGER, land_split TEXT, orchard_sf REAL,
  pool INTEGER, spa INTEGER, tennis INTEGER, pickleball INTEGER, sport_court INTEGER, sauna INTEGER, equestrian INTEGER,
  community_amenities INTEGER, amenities TEXT, landscaping TEXT,
  acc_count INTEGER, acc_fin_sf INTEGER, acc_unfin_sf INTEGER, acc_unlabeled_sf INTEGER, adu_or_guest INTEGER, accessory_json TEXT, accessory_raw TEXT,
  hoa_month REAL, prior_sale TEXT,
  front_photo TEXT, rear_photo TEXT, street_photo TEXT,
  custom_rows_json TEXT, flags TEXT
);
CREATE TABLE sales (
  sale_id INTEGER PRIMARY KEY, norm_address TEXT, unit TEXT, zip TEXT, area_name TEXT, neighborhood TEXT,
  price REAL, sale_month TEXT, sale_type TEXT, primary_rec_id INTEGER, n_records INTEGER, n_reports INTEGER,
  versions TEXT, disagreements TEXT, resale_flag TEXT, use_for_analysis INTEGER, exclude_reason TEXT
);
CREATE TABLE custom_value_review (field TEXT, raw_value TEXT, n INTEGER, kind TEXT, how TEXT, example_report TEXT, needs_review INTEGER, her_decision TEXT);
CREATE TABLE report_field_roles (report TEXT, field TEXT, role TEXT, votes TEXT);
CREATE TABLE data_flags (rec_id INTEGER, flag TEXT, detail TEXT);
CREATE TABLE conversion_info (key TEXT, value TEXT);
''')

def mdiff(a, b):
    return abs((int(a[:4]) * 12 + int(a[5:7])) - (int(b[:4]) * 12 + int(b[5:7])))

review = collections.Counter(); review_ex = {}
flags_rows = []
out = []
for r in rows:
    fl = []
    rid = r['comp_row_id']
    zip_ = P.zip5(r['ZipCode']) or P.zip5(r['UnitNumber'])
    sale_month = (r['norm_sale_date'] or '')[:7] or None
    s_ud, c_ud = P.userdefined_dates(r['UserDefined1'])
    if not sale_month and s_ud: sale_month = s_ud
    contract = (r['ContractDate'] or '')[:7] or c_ud
    if sale_month and (sale_month < '1990' or sale_month > P.TODAY[:7]):
        fl.append(('bad_sale_date', sale_month)); sale_month = None
    if contract and contract < '1990' and sale_month:
        fixed = f'{int(contract[:4]) + 100:04d}{contract[4:]}'   # same two-digit-year problem the archive fixed for sale dates
        if fixed <= sale_month and mdiff(fixed, sale_month) <= 18:
            fl.append(('contract_year_corrected', f'{contract} -> {fixed}')); contract = fixed
    if contract and (contract < '1990' or contract > P.TODAY[:7]):
        fl.append(('bad_contract_date', contract)); contract = None
    if sale_month and contract and contract > sale_month:
        fl.append(('contract_after_sale_ignored', f'{contract} > {sale_month}')); contract = None
    price = r['norm_sale_price'] if r['norm_sale_price'] and r['norm_sale_price'] > 0 else None
    if price and price < 50000 and r['ComparableType'] != 'Rental': fl.append(('price_suspicious', str(price)))
    st = P.sale_type(r['Concessions1'])
    status = None
    vs2 = (r['VerificationSource2'] or '').lower()
    for w in ('pending', 'active', 'withdrawn', 'expired', 'coming soon', 'contingent'):
        if w in vs2 or w in (r['UserDefined1'] or '').lower(): status = w.title(); break
    fin, conc = P.financing(r['Concessions2'])
    ver = P.verification(r['VerificationSource1'])
    dom = ver['dom'] if ver['dom'] is not None else (r['DaysOnMarket'] or None)
    lrat, lfac, lraw = P.location(r['Location'])
    vrat, vtypes, vlim, vpano, vgrade = P.view(r['PropertyView'])
    site_sf, us_sf, us_pct, ff = P.site(r['Site'])
    if r['Site'] and re.match(r'\s*\d{4,}\s*ac', r['Site'], re.I): fl.append(('site_unit_corrected', f"'{r['Site']}' read as sf"))
    if not site_sf and r['LotSize'] and r['LotSize'] >= 1000: site_sf = float(r['LotSize'])
    us_src = 'Site field' if us_sf else None
    att, stories, style = P.design(r['Design'])
    q, qm, qraw = P.qc(r['QualityOfConstruction'], 'Q')
    c, cm, craw = P.qc(r['Condition'], 'C')
    bf, bh = P.baths(r['TotalBathrooms'])
    bs, bfin, bacc = P.basement(r['BasementArea'])
    rb = P.rooms_below(r['FinishedRoomsBelowGrade']) or {}
    g, gt, dw, cp = P.garage(r['GarageCarport'])
    en = P.energy(r['EnergyEfficient1'])
    fu = P.fu_notes(r['FunctionalUtility'])
    vs2n = P.fu_notes(r['VerificationSource2'])          # her 'lpr:13; 1%' notes live here
    if fu['lpr_days'] is None: fu['lpr_days'] = vs2n['lpr_days']
    if fu['buyer_broker_pct'] is None: fu['buyer_broker_pct'] = vs2n['buyer_broker_pct']
    gla = r['GrossLivingArea'] or None
    if gla is not None and gla < 200: fl.append(('gla_suspicious', str(gla))); gla = None
    # custom rows
    custom = {}; nb_row = None; topo = None; porch = None; fps = None
    am = set(); land = None; blds = []; acc_raw = []; acc_seen = False; land_split = None
    for f in CUSTOM:
        k, pay, how = resolve(r, f)
        if k is None: continue
        raw = P.clean(r[f])
        custom[f] = {'raw': raw, 'kind': k, 'how': how}
        if how in ('unmatched', 'pattern-weak') and k not in ('none', 'porch', 'fireplace'):
            review[(f, raw, k, how)] += 1; review_ex.setdefault((f, raw, k, how), r['FromFileName'])
        if k == 'usable_nbhd' and pay:
            if pay.get('usable_sf') and not us_sf:
                us_sf = pay['usable_sf']; us_src = f'{f} (custom row)'
            if pay.get('usable_pct') is not None and us_pct is None: us_pct = pay['usable_pct']
            if pay.get('nbhd') and not nb_row: nb_row = pay['nbhd']
            if pay.get('ff') and not ff: ff = pay['ff']
            if pay.get('topo'): topo = pay['topo']
            if pay.get('land_split'): land_split = pay['land_split']
        elif k == 'nbhd' and pay and not nb_row: nb_row = pay['nbhd']
        elif k == 'porch' and not porch: porch = raw
        elif k == 'fireplace' and pay and fps is None: fps = pay.get('count')
        elif k == 'amenity_land' and pay:
            am |= set(pay.get('amen') or []); land = land or pay.get('land')
        elif k == 'land_only' and pay: land = land or pay['land']
        elif k == 'accessory' and pay:
            acc_seen = True
            # the same accessory text is often repeated in a second custom row; count it once
            if re.sub(r'\s+', '', raw).lower() not in {re.sub(r'\s+', '', a).lower() for a in acc_raw}:
                blds += pay.get('blds') or []; acc_raw.append(raw)
    # sanity on usable area
    if us_sf and site_sf and us_sf > site_sf * 1.02:
        if us_sf <= site_sf * 1.15:
            fl.append(('usable_capped_at_site', f'{us_sf:.0f} -> {site_sf:.0f}')); us_sf = site_sf
        else:
            fl.append(('usable_exceeds_site_dropped', f'{us_sf:.0f} > {site_sf:.0f}')); us_sf = None; us_src = None
    fin_sf = sum(b['sf'] or 0 for b in blds if b['fin'] is True)
    if any(b['fin'] is True and not b['sf'] for b in blds):
        fl.append(('accessory_size_missing', '; '.join(acc_raw)))
    unf_sf = sum(b['sf'] or 0 for b in blds if b['fin'] is False)
    unl_sf = sum(b['sf'] or 0 for b in blds if b['fin'] is None)
    adu = int(any(b['type'] in ('ADU', 'JADU', 'Guest house') for b in blds))
    own = {x for x in am if not x.startswith('community')}
    sale_year = int(sale_month[:4]) if sale_month else None
    yb = sale_year - r['ActualAgeInYears'] if (sale_year and r['ActualAgeInYears']) else None
    for k_, v_ in fl: flags_rows.append((rid, k_, v_))
    role_ = 'subject' if r['FromType'] == 'Subject' else 'comparable'
    out.append(dict(
        rec_id=rid, aci_property_id=r['PropertyID'], from_report=r['FromFileName'], record_role=role_,
        comparable_type=r['ComparableType'] or ('Listing' if st == 'Listing' else None), property_type_id=r['PropertyTypeID'],
        entered_date=r['EnteredDate'], entered_by=r['EnteredBy'],
        street_number=r['StreetNumber'], street_name=r['StreetName'], unit=P.clean(r['UnitNumber']) if r['UnitNumber'] and len(r['UnitNumber']) <= 6 and r['UnitNumber'] != '-' else None,
        city=P.city(r['City']), zip=zip_, area_name=P.AREA_NAME.get(zip_), norm_address=r['norm_address'], apn=P.clean(r['APNNumber']) if r['norm_apn_digits'] else None,
        neighborhood=P.clean(r['NeighborhoodName']), neighborhood_row=nb_row, census_tract=P.clean(r['Censustract']),
        price=price, sale_month=sale_month, contract_month=contract, sale_type=st, financing=fin, concession_amt=conc,
        mls_no=ver['mls'], dom=dom, verification=' | '.join(x for x in (P.clean(r['VerificationSource1']), P.clean(r['VerificationSource2'])) if x) or None, listing_status=status,
        location_rating=lrat, location_factors=';'.join(lfac) or None, location_raw=lraw,
        site_sf=site_sf, usable_sf=us_sf, usable_pct=us_pct, usable_source=us_src, front_feet=ff, topography=topo,
        view_rating=vrat, view_types=';'.join(vtypes) or None, view_limited=int(vlim), view_panoramic=int(vpano), view_grade_old=vgrade, view_raw=P.clean(r['PropertyView']),
        attachment=att, stories=stories, style=style, design_raw=P.clean(r['Design']),
        quality=q, quality_mod=qm, quality_raw=qraw, condition=c, condition_mod=cm, condition_raw=craw,
        actual_age=r['ActualAgeInYears'], effective_age=r['EffectiveAgeInYears'] or None, year_built_est=yb,
        rooms=r['TotalRoomCount'] or None, beds=r['TotalBedrooms'], baths_full=bf, baths_half=bh, gla=gla,
        bsmt_sf=bs, bsmt_fin_sf=bfin, bsmt_access=bacc, bg_rec=rb.get('rec'), bg_beds=rb.get('bed'), bg_full=rb.get('full'), bg_half=rb.get('half'), bg_other=rb.get('other'),
        garage_spaces=g, garage_type=gt, driveway_spaces=dw, carport_spaces=cp, garage_raw=P.clean(r['GarageCarport']),
        heating_cooling=P.clean(r['HeatingCooling']), energy_raw=P.clean(r['EnergyEfficient1']), solar=int(en['solar']), battery=int(en['battery']), generator=int(en['generator']),
        fu_raw=P.clean(r['FunctionalUtility']), remodel_year=fu['remodel_year'], buyer_to_remodel=int(fu['buyer_to_remodel']), cost_to_cure=int(fu['cost_to_cure']),
        deferred_maint=int(fu['deferred_maint']), two_lots=int(fu['two_lots']), lpr_days=fu['lpr_days'], storm_impact=int(fu['storm_impact']),
        buyer_broker_pct=fu['buyer_broker_pct'], dated=int(fu['dated']),
        porch_patio=porch, fireplaces=fps if r['PropertyTypeID'] == 2 else None,  # fireplaces kept for condos only (she never adjusts for them otherwise)
        land_split=json.dumps(land_split) if land_split else None, orchard_sf=(land_split or {}).get('o', 0) * P.ACRE or None,
        pool=int('pool' in own or 'lap_pool' in own), spa=int('spa' in own), tennis=int('tennis' in own), pickleball=int('pickleball' in own),
        sport_court=int('sport_court' in own), sauna=int('sauna' in own), equestrian=int('equestrian' in own),
        community_amenities=int(any(x.startswith('community') for x in am)), amenities=';'.join(sorted(am)) or None, landscaping=land,
        acc_count=len(blds) if acc_seen else None,
        acc_fin_sf=(None if any(b['fin'] is True and not b['sf'] for b in blds) else fin_sf) if acc_seen else None, acc_unfin_sf=unf_sf if acc_seen else None,
        acc_unlabeled_sf=unl_sf if acc_seen else None, adu_or_guest=adu if acc_seen else None,
        accessory_json=json.dumps(blds) if blds else None, accessory_raw='; '.join(acc_raw) or None,
        hoa_month=r['CondoHOAMonthlyAssesments'] or None,
        prior_sale=' | '.join(x for x in (P.clean(r['PriorSaleData1']), P.clean(r['PriorSaleData2']), P.clean(r['PriorSaleData3'])) if x) or None,
        front_photo=r['FrontPhotoFileName'], rear_photo=r['RearPhotoFileName'], street_photo=r['StreetPhotoFileName'],
        custom_rows_json=json.dumps(custom), flags=';'.join(k_ for k_, _ in fl) or None))

# ---------- fill missing ZIP from other records of the same address
zip_by_addr = collections.defaultdict(collections.Counter)
for o in out:
    if o['zip']: zip_by_addr[o['norm_address']][o['zip']] += 1
for o in out:
    if not o['zip'] and zip_by_addr.get(o['norm_address']):
        o['zip'] = zip_by_addr[o['norm_address']].most_common(1)[0][0]; o['area_name'] = P.AREA_NAME.get(o['zip'])
        flags_rows.append((o['rec_id'], 'zip_filled_from_same_address', o['zip']))

# ---------- group records into sale events
is_sale = lambda o: (o['comparable_type'] == 'Sale' and o['sale_type'] != 'Listing' and o['price'] and o['sale_month']
                     and o['record_role'] == 'comparable' and (o['listing_status'] is None or o['listing_status'] == 'Contingent'))
groups = []
by_addr = collections.defaultdict(list)
for o in out:
    if is_sale(o): by_addr[(o['norm_address'], o['unit'])].append(o)
for key, lst in by_addr.items():
    lst.sort(key=lambda o: o['sale_month'])
    cur = []
    for o in lst:
        if cur and (mdiff(o['sale_month'], cur[0]['sale_month']) <= 2 or
                    (abs(o['price'] - cur[0]['price']) <= 0.005 * cur[0]['price'] and mdiff(o['sale_month'], cur[0]['sale_month']) <= 7)):
            cur.append(o)
        else:
            if cur: groups.append(cur)
            cur = [o]
    if cur: groups.append(cur)

# ---------- exact duplicates: identical in every appraisal field -> keep the newest only
DUP_IGNORE = {'rec_id', 'sale_id', 'aci_property_id', 'from_report', 'entered_date', 'entered_by', 'front_photo', 'rear_photo', 'street_photo', 'flags', 'custom_rows_json', 'record_role'}
# her rule (Oct 19 2026): also the same when only older – actual age, year built within 1 year (age arithmetic) – or when only
# the date she checked the prior sales changed ("No Transfers" searches, any source) -> keep the newest only
AGED_IGNORE = DUP_IGNORE | {'actual_age', 'year_built_est', 'prior_sale'}
def _prior(t):
    t = str(t or '').strip()
    return '' if not t or re.search(r'no transfers?', t, re.I) else re.sub(r'^\s*(CRS Data|CRS|Realist|Realquest|NDC)\s*-\s*', '', t, flags=re.I)
def _yb_close(a, b):
    if a is None or b is None: return a is None and b is None
    try: return abs(int(a) - int(b)) <= 1
    except (TypeError, ValueError): return a == b
dup_removed = set()
for g in groups:
    seen = {}; kept = []
    for o in sorted(g, key=lambda o: (o['entered_date'] or '', o['rec_id']), reverse=True):
        k = json.dumps({x: o[x] for x in o if x not in DUP_IGNORE}, sort_keys=True, default=str)
        if k in seen: dup_removed.add(o['rec_id']); flags_rows.append((o['rec_id'], 'exact_duplicate_removed', f"same as record {seen[k]}")); continue
        ka = json.dumps({x: o[x] for x in o if x not in AGED_IGNORE}, sort_keys=True, default=str)
        twin = next((p for p in kept if p[0] == ka and _yb_close(p[1]['year_built_est'], o['year_built_est']) and _prior(p[1]['prior_sale']) == _prior(o['prior_sale'])), None)
        if twin: dup_removed.add(o['rec_id']); flags_rows.append((o['rec_id'], 'aged_duplicate_removed', f"same as newer record {twin[1]['rec_id']} except age / prior-sale check date")); continue
        seen[k] = o['rec_id']; kept.append((ka, o))
groups = [[o for o in g if o['rec_id'] not in dup_removed] for g in groups]
out = [o for o in out if o['rec_id'] not in dup_removed]

COMPARE = ['gla', 'quality', 'condition', 'beds', 'baths_full', 'site_sf', 'usable_sf', 'pool', 'acc_fin_sf', 'view_rating', 'location_rating']
sales = []
for sid, g in enumerate(groups, 1):
    # primary = most recently entered record (her latest research)
    g.sort(key=lambda o: (o['entered_date'] or '', o['rec_id']))
    prim = g[-1]
    dis = {}
    for f in COMPARE:
        vals = sorted({o[f] for o in g if o[f] is not None}, key=str)
        if len(vals) > 1: dis[f] = vals
    prices = {o['price'] for o in g}
    if len(prices) > 1: dis['price'] = sorted(prices)
    for o in g: o['sale_id'] = sid
    st = prim['sale_type']
    excl = None
    if st in ('REO', 'Short', 'CrtOrd', 'NonArm', 'Trust'): excl = f'sale type {st}'
    elif prim['property_type_id'] != 1: excl = 'not a single-family (property type %s)' % prim['property_type_id']
    elif prim['attachment'] and prim['attachment'] != 'Detached': excl = f'attached ({prim["attachment"]})'
    elif not prim['gla']: excl = 'no GLA'
    elif not prim['zip']: excl = 'no ZIP'
    elif prim['flags'] and 'price_suspicious' in prim['flags']: excl = 'price suspicious'
    versions = [{'rec_id': o['rec_id'], 'entered': o['entered_date'], 'report': o['from_report'],
                 'ratings': 'UAD (Q/C)' if o['quality'] else 'word ratings (GPAR / older form)', 'gla': o['gla'], 'q': o['quality'], 'c': o['condition']} for o in g]
    sales.append(dict(versions=json.dumps(versions), sale_id=sid, norm_address=prim['norm_address'], unit=prim['unit'], zip=prim['zip'], area_name=prim['area_name'],
                      neighborhood=prim['neighborhood'] or prim['neighborhood_row'], price=prim['price'], sale_month=prim['sale_month'],
                      sale_type=st, primary_rec_id=prim['rec_id'], n_records=len(g), n_reports=len({o['from_report'] for o in g}),
                      disagreements=json.dumps(dis) if dis else None, resale_flag=None, use_for_analysis=int(excl is None), exclude_reason=excl))

# ---------- resale flags: same address resold within 24 months for much more (likely remodeled)
by_a = collections.defaultdict(list)
for s in sales: by_a[(s['norm_address'], s['unit'])].append(s)
for lst in by_a.values():
    lst.sort(key=lambda s: s['sale_month'])
    for a, b in zip(lst, lst[1:]):
        m = mdiff(a['sale_month'], b['sale_month'])
        if m <= 24 and b['price'] >= a['price'] * 1.25:
            note = f"resold {b['sale_month']} for {b['price']/a['price']-1:+.0%} after {m} months – likely remodeled, re-research"
            a['resale_flag'] = (a['resale_flag'] + ' | ' if a['resale_flag'] else '') + note
            b['resale_flag'] = (b['resale_flag'] + ' | ' if b['resale_flag'] else '') + f"previous sale {a['sale_month']} at ${a['price']:,.0f} ({m} months earlier, {b['price']/a['price']-1:+.0%})"

cols = list(out[0].keys()) + ['sale_id']
for o in out: o.setdefault('sale_id', None)
db.executemany(f'insert into comp_records ({",".join(cols)}) values ({",".join("?"*len(cols))})', [tuple(o[c] for c in cols) for o in out])
scol = list(sales[0].keys())
db.executemany(f'insert into sales ({",".join(scol)}) values ({",".join("?"*len(scol))})', [tuple(s[c] for c in scol) for s in sales])
db.executemany('insert into custom_value_review values (?,?,?,?,?,?,?,NULL)',
               [(f, raw, n, k, how, review_ex[(f, raw, k, how)], int((how == 'unmatched' or k == 'other') and not (f == 'Fireplace' and re.fullmatch(r'\s*(\d|average|avg|good|fair|minimal|yes|no)\s*', (raw or '').lower()))))
                for (f, raw, k, how), n in review.most_common()])
db.executemany('insert into report_field_roles values (?,?,?,?)',
               [(rep, f, role[(rep, f)], json.dumps(dict(role_votes[(rep, f)]))) for (rep, f) in role])
db.executemany('insert into data_flags values (?,?,?)', flags_rows)
db.executemany('insert into conversion_info values (?,?)', [
    ('source', os.path.basename(SRC)), ('source_records', str(len(rows))), ('built', P.TODAY),
    ('rule', 'Original archive opened read-only; this database is rebuilt from it and may be regenerated at any time.'),
    ('primary_record', 'Every version of a sale is kept (sales.versions) so the right one can be chosen per assignment; the most recently entered is shown first. Exact duplicates are removed, keeping the newest.'),
    ('land_split', 'r = core residential lot (used as usable area), o = orchard; e and w kept as typed, meaning to be confirmed.')])
db.execute('create index ix_cr_addr on comp_records(norm_address)'); db.execute('create index ix_cr_sale on comp_records(sale_id)')
db.execute('create index ix_s_zip on sales(zip, sale_month)')
db.commit()
print('records', len(out), 'sales', len(sales), 'usable for analysis', sum(s['use_for_analysis'] for s in sales),
      'review values', len(review), 'flags', len(flags_rows))
