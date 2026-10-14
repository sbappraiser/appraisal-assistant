"""Parsers for Jennifer's ACI (UAD 2.6) comp fields.  Pure functions, no I/O.
Every parser returns plain values or None; never guesses beyond the dictionary."""
import re

ACRE = 43560.0
TODAY = '2026-10-13'

def clean(v):
    if v is None: return None
    v = str(v).strip()
    return v or None

NONE_WORDS = {'none', 'n/a', 'na', 'no', '-', '0', 'none noted', 'none recorded', 'no aux. bldgs', 'none permitted',
              'not applicable', 'unknown', 'unk'}

# ---------------------------------------------------------------- address / area
CITY_FIX = {'santa barbara': 'Santa Barbara', 'sant abarbara': 'Santa Barbara', '-santa barbara': 'Santa Barbara',
            'santa barbar': 'Santa Barbara', 'santa barabara': 'Santa Barbara', 'sb': 'Santa Barbara',
            'goleta': 'Goleta', 'carpinteria': 'Carpinteria', 'summerland': 'Summerland', 'montecito': 'Montecito',
            'ventura': 'Ventura', 'ojai': 'Ojai', 'hope ranch': 'Santa Barbara', 'isla vista': 'Isla Vista'}

def city(v):
    v = clean(v)
    if not v: return None
    k = re.sub(r'\s+', ' ', v.lower().strip(' -,.'))
    return CITY_FIX.get(k, v.strip(' -,') if len(k) > 2 else None)

def zip5(v):
    v = clean(v)
    if not v: return None
    m = re.search(r'(?<!\d)(9[0-6]\d{3})(?!\d)', v)
    return m.group(1) if m else None

AREA_NAME = {'93108': 'Montecito', '93067': 'Summerland', '93013': 'Carpinteria', '93110': 'Hope Ranch / Foothills',
             '93105': 'Santa Barbara (Riviera / San Roque / Mission Canyon)', '93109': 'Mesa', '93103': 'Santa Barbara East / Riviera',
             '93101': 'Santa Barbara Downtown / West', '93111': 'Goleta (Noleta)', '93117': 'Goleta', '93001': 'Ventura',
             '93023': 'Ojai'}

# ---------------------------------------------------------------- sale type / financing
SALE_TYPES = [('listing', 'Listing'), ('armlth', 'ArmLth'), ('arms', 'ArmLth'), ('estate', 'Estate'), ('relo', 'Relo'),
              ('reo', 'REO'), ('crtord', 'CrtOrd'), ('court', 'CrtOrd'), ('short', 'Short'), ('nonarm', 'NonArm'),
              ('non-arm', 'NonArm'), ('trust', 'Trust')]

def sale_type(v):
    v = clean(v)
    if not v: return None
    k = v.lower().replace(' ', '')
    for key, out in SALE_TYPES:
        if key in k: return out
    return None

FIN = [('cash', 'Cash'), ('conv', 'Conv'), ('fha', 'FHA'), ('va', 'VA'), ('usda', 'USDA'), ('rh', 'USDA'),
       ('seller', 'Seller'), ('private', 'Private'), ('assum', 'Assumed'), ('1031', '1031'), ('trade', 'Trade')]

def financing(v):
    """'Conv;0' -> ('Conv', 0.0); ';' -> (None, None)."""
    v = clean(v)
    if not v: return None, None
    parts = v.split(';', 1)
    t = parts[0].strip().lower()
    ftype = None
    for key, out in FIN:
        if t.startswith(key) or (key in t and len(key) > 2):
            ftype = out; break
    if ftype is None and t in ('unk', 'unknown'): ftype = 'Unknown'
    amt = None
    if len(parts) > 1:
        m = re.search(r'-?\d[\d,]*\.?\d*', parts[1])
        if m:
            try: amt = float(m.group(0).replace(',', ''))
            except ValueError: amt = None
    return ftype, amt

def mmyy(s):
    """'10/26' -> '2026-10'."""
    m = re.match(r'\s*(\d{1,2})/(\d{2,4})\s*$', s)
    if not m: return None
    mo, yr = int(m.group(1)), int(m.group(2))
    if not 1 <= mo <= 12: return None
    if yr < 100: yr += 2000 if yr <= 30 else 1900
    return f'{yr:04d}-{mo:02d}'

def userdefined_dates(v):
    """'s10/26;c09/26' -> ('2026-10', '2026-09'); 's10/26;09/26' (typo, c missing) handled."""
    v = clean(v)
    if not v: return None, None
    s = c = None
    parts = [p.strip() for p in v.split(';')]
    for i, p in enumerate(parts):
        pl = p.lower()
        if pl.startswith('s'): s = mmyy(p[1:]) or s
        elif pl.startswith('c'): c = mmyy(p[1:]) or c
        elif i == 1 and s and mmyy(p): c = mmyy(p)
    return s, c

def verification(v):
    """'SBMLS #26-1933;DOM 84' -> {'mls': '26-1933', 'dom': 84, 'source': 'SBMLS'}"""
    v = clean(v)
    out = {'mls': None, 'dom': None, 'source': None}
    if not v: return out
    m = re.search(r'#\s*([0-9][0-9A-Za-z-]*)', v)
    if m and not re.fullmatch(r'0+(-0+)?', m.group(1)): out['mls'] = m.group(1)
    m = re.search(r'DOM\s*(\d+)', v, re.I)
    if m: out['dom'] = int(m.group(1))
    m = re.match(r'\s*([A-Za-z]+)', v)
    if m: out['source'] = m.group(1).upper()
    return out

# ---------------------------------------------------------------- location / view
LOC_FACTORS = [  # (regex on lower-case token, canonical code, UAD 3.6 home)
    (r'^res', 'Res', None),
    (r'shr\w*dr|shared', 'ShrDrv', 'Shared Driveway'),
    (r'^(prvt|pvt|prv|private|prvte)\s*(ln|lane)', 'PvtLn', 'Primary Access: Private Street'),
    (r'^(prvt|pvt|prv|private|prvte)\s*(rd|road|st)', 'PvtRd', 'Primary Access: Private Street'),
    (r'drv?esm|driveway ease', 'DrvEsmt', 'Easement: Ingress/Egress'),
    (r'esm', 'Esmt', 'Easement'),
    (r'fld\s*wy|floodway', 'FldWy', 'Hazard Zone: Floodway'),
    (r'fld|flood', 'FldZn', 'Hazard Zone: FEMA SFHA'),
    (r'fwy|freeway|hwy', 'FwyNse', 'Site Influence: Busy Roadway (freeway)'),
    (r'bsy|busy|heavy|trfc|traffic|trffc|bckstrfc', 'BusyRd', 'Site Influence: Busy Roadway'),
    (r'tr(ai)?n', 'Train', 'Site Influence: Railroad'),
    (r'^schl|school', 'Schl', 'Site Influence: School'),
    (r'^comm|commercial', 'Comm', 'Site Influence: Commercial'),
    (r'^ind', 'Ind', 'Site Influence: Industrial'),
    (r'glf|golf', 'GlfCse', 'Site Influence: Golf Course'),
    (r'adjprk|park', 'AdjPrk', 'Site Influence: Green Space'),
    (r'pwr|power', 'AdjPwr', 'Site Influence: Power Lines'),
    (r'lndfl|landfill', 'Lndfl', 'Site Influence: Landfill'),
    (r'pubtrn', 'PubTrn', 'Site Influence: Public Transportation'),
    (r'flag', 'FlagLot', 'Site Characteristics: Shape (flag lot)'),
    (r'inter\s*lot|intlot|interior', 'InterLot', None),
    (r'wtrfr|waterfront|bch\s*fr|beach\s*front|bluff', 'WtrFr', 'Site Influence: Waterfront'),
    (r'nrwtr|near beach|nr\s*bch', 'NrWtr', 'Site Influence: Near Water'),
    (r'gated', 'Gated', None),
    (r'rural', 'Rural', None),
    (r'nse|noise', 'Noise', 'Site Influence: Noise'),
    (r'^df|dbrs|debris|burn|fire', 'Debris/Fire', 'Hazard Zone'),
    (r'airp|airport', 'Airport', 'Site Influence: Airport'),
    (r'lts2', 'LotsToAmenity', None),
    (r'2nd row', 'SecondRow', None),
]

def rating_prefix(v):
    m = re.match(r'\s*([NBA])\s*;', v)
    return ({'N': 'Neutral', 'B': 'Beneficial', 'A': 'Adverse'}[m.group(1)], v[m.end():]) if m else (None, v)

def location(v):
    v = clean(v)
    if not v: return None, [], None
    rating, rest = rating_prefix(v)
    toks = [t.strip() for t in re.split(r'[;,/]', rest) if t.strip()]
    factors = []
    for t in toks:
        tl = t.lower()
        for rx, code, _ in LOC_FACTORS:
            if re.search(rx, tl):
                if code not in factors: factors.append(code)
                break
    return rating, factors, v

VIEW_TYPES = [
    (r'wtr|ocn|ocean|coast|whitewater|bch|beach|water|harbor|island|channel', 'Water'),
    (r'mtn|mount', 'Mountain'),
    (r'ctysky|city sky|city', 'City Skyline'),
    (r'ctystr|street', 'City Street'),
    (r'glf|golf', 'Golf Course'),
    (r'wood', 'Woods'),
    (r'pstrl|pastor', 'Pastoral'),
    (r'prk|park', 'Park'),
    (r'cny?n|canyon', 'Canyon'),
    (r'garden|setting', 'Garden Setting'),
    (r'^res|residential', 'Residential'),
    (r'pwr|wire', 'Power Lines'),
    (r'ind', 'Industrial'),
]
VIEW_GRADE = [(r'excel', 'Excellent'), (r'v\s*-?\s*g(oo)?d|very good', 'Very Good'), (r'avg-?\s*g(oo)?d|average-good|avg-gd', 'Avg-Good'),
              (r'avg-?\s*fair|average-fair', 'Avg-Fair'), (r'^g(oo)?d|\bgood|\bgd\b', 'Good'), (r'avg|average', 'Average'),
              (r'fair', 'Fair'), (r'limited|peek|ltd', 'Limited'), (r'unobstr|panoram', 'Panoramic'), (r'neutral', 'Neutral')]

def view(v):
    """-> rating, [types], limited(bool), panoramic(bool), old_grade(text for pre-UAD wording)"""
    v = clean(v)
    if not v: return None, [], False, False, None
    rating, rest = rating_prefix(v)
    low = rest.lower()
    types = []
    for t in re.split(r'[;,/&]|\s+', low):
        if not t: continue
        for rx, code in VIEW_TYPES:
            if re.search(rx, t):
                if code not in types: types.append(code)
                break
    limited = bool(re.search(r'ltd|limited|peek|partial|filtered', low))
    pano = bool(re.search(r'panoram|unobstr|whitewater|coastline', low))
    grade = None
    if rating is None:
        for rx, g in VIEW_GRADE:
            if re.search(rx, low): grade = g; break
    return rating, types, limited, pano, grade

# ---------------------------------------------------------------- site
def _num(s):
    try: return float(s.replace(',', ''))
    except (ValueError, AttributeError): return None

def area_token(s, assume=None):
    """'7405 sf' -> 7405 sf, '1.51 ac' -> sf, '0.52' -> acres if small. Returns sf."""
    s = s.strip().lower()
    m = re.match(r'([\d,]*\.?\d+)\s*(sf\b|ac\b|acres?\b|sq\.?\s*ft)?', s)
    if not m: return None
    n = _num(m.group(1))
    if n is None: return None
    unit = m.group(2) or assume
    if unit is None: unit = 'ac' if n < 200 else 'sf'
    return n * ACRE if unit.startswith('ac') else n

def site(v):
    """-> (site_sf, usable_sf or None, usable_pct or None, front_feet or None)"""
    v = clean(v)
    if not v: return None, None, None, None
    low = v.lower()
    ff = None
    m = re.search(r'(\d+)\s*ff', low)
    if m: ff = int(m.group(1))
    parts = [p for p in re.split(r'/+', low) if p.strip()]
    if not parts or not re.match(r'\s*[\d.,]', parts[0]): return None, None, None, ff
    total = area_token(parts[0])
    m0 = re.match(r'\s*([\d,]*\.?\d+)\s*ac', parts[0])
    if m0 and _num(m0.group(1)) and _num(m0.group(1)) >= 1000:   # '19166 ac' = typo for sf
        total = _num(m0.group(1))
    usable = pct = None
    for p in parts[1:]:
        p = p.strip()
        mp = re.match(r'([\d.]+)\s*%', p)
        if mp:
            pct = _num(mp.group(1)); continue
        if re.match(r'[\d.]', p) and 'ff' not in p:
            a = area_token(p)
            if a and total:
                if abs(a - total) / total < 0.06: continue    # same lot written in sf and ac
                if a < total: usable = a
    if pct is not None and total and usable is None and pct <= 100: usable = total * pct / 100
    return total, usable, pct, ff

# ---------------------------------------------------------------- design / ratings / rooms
STORY = {'DT1': ('Detached', 1), 'DT1.5': ('Detached', 1.5), 'DT2': ('Detached', 2), 'DT3': ('Detached', 3),
         'AT1': ('Attached', 1), 'AT2': ('Attached', 2), 'AT3': ('Attached', 3), 'SD1': ('Semi-detached', 1),
         'SD2': ('Semi-detached', 2), 'RT2': ('Row', 2)}
STYLE_FIX = {'spnshrvvl': 'Spanish Revival', 'spnshcolnl': 'Spanish Colonial', 'mdrnfrmhse': 'Modern Farmhouse',
             'midcntrymdrn': 'Mid-Century Modern', 'contemp': 'Contemporary', 'capecod': 'Cape Cod', 'cape cod': 'Cape Cod'}

def design(v):
    v = clean(v)
    if not v: return None, None, None
    m = re.match(r'\s*((?:DT|AT|SD|RT|GR|MR|HR)\d?(?:\.\d)?)\s*;?\s*(.*)$', v, re.I)
    attach = stories = None
    style = v
    if m:
        code = m.group(1).upper(); style = m.group(2).strip() or None
        attach, stories = STORY.get(code, (None, None))
        if attach is None and code[:2] in ('GR', 'MR', 'HR'): attach = {'GR': 'Garden', 'MR': 'Mid-rise', 'HR': 'High-rise'}[code[:2]]
    if style:
        style = STYLE_FIX.get(style.lower().replace(' ', ''), STYLE_FIX.get(style.lower(), style))
    return attach, stories, style

def qc(v, letter):
    """'Q3' -> (3, '', 'Q3'); 'C3-' -> (3, '-', ...); old words -> (None, None, word)"""
    v = clean(v)
    if not v: return None, None, None
    m = re.match(rf'\s*{letter}\s*([1-6])\s*([+-]?)', v, re.I)
    if m: return int(m.group(1)), m.group(2) or '', v
    return None, None, v

def baths(v):
    """'3.1' -> (3 full, 1 half); '2.5' is ambiguous in pre-UAD reports -> (2, 1)."""
    v = clean(v)
    if not v: return None, None
    m = re.match(r'\s*(\d+)(?:\.(\d))?', v)
    if not m: return None, None
    full = int(m.group(1)); h = m.group(2)
    half = 0 if h is None else (1 if h == '5' else int(h))
    return full, half

def basement(v):
    """'1832sf1832sfwo' -> (1832, 1832, 'walk-out')"""
    v = clean(v)
    if not v: return None, None, None
    m = re.match(r'\s*(\d+)\s*sf\s*(\d+)?\s*(?:sf)?\s*(wo|wu|in)?', v, re.I)
    if not m:
        return (0, 0, None) if v.lower() in NONE_WORDS else (None, None, None)
    acc = {'wo': 'Walk-out', 'wu': 'Walk-up', 'in': 'Interior only'}.get((m.group(3) or '').lower())
    return int(m.group(1)), int(m.group(2) or 0), acc

def rooms_below(v):
    """'2rr2br2.1ba0o' -> dict"""
    v = clean(v)
    if not v: return None
    m = re.match(r'\s*(\d+)rr(\d+)br(\d+)\.(\d)ba(\d+)o', v, re.I)
    if not m: return None
    return {'rec': int(m.group(1)), 'bed': int(m.group(2)), 'full': int(m.group(3)), 'half': int(m.group(4)), 'other': int(m.group(5))}

def garage(v):
    """'3gd6dw' -> (3, 'Detached', 6); '2 Car Garage' -> (2, 'Garage', None); '1cp' -> carport."""
    v = clean(v)
    if not v: return None, None, None, None
    low = v.lower()
    g = typ = dw = cp = None
    ms = list(re.finditer(r'(\d+)\s*g(a|d|bi)?(?![a-z]{2})', low))
    if ms:
        g = sum(int(m.group(1)) for m in ms)
        kinds = {{'a': 'Attached', 'd': 'Detached', 'bi': 'Built-in'}.get(m.group(2) or '', 'Garage') for m in ms}
        typ = kinds.pop() if len(kinds) == 1 else 'Mixed'
        if 'built' in low: typ = 'Built-in'
    m2 = re.search(r'(\d+)\s*(?:car\s*)?garage', low)
    if g is None and m2: g = int(m2.group(1)); typ = 'Garage'
    m = re.search(r'(\d+)\s*dw', low)
    if m: dw = int(m.group(1))
    m = re.search(r'(\d+)\s*(?:car\s*)?(cp|carport|cv)', low)
    if m: cp = int(m.group(1))
    if g is None and cp is None and dw is None and low in NONE_WORDS: g = 0
    return g, typ, dw, cp

# ---------------------------------------------------------------- functional utility / energy notes
def fu_notes(v):
    v = clean(v)
    out = {'remodel_year': None, 'buyer_to_remodel': False, 'cost_to_cure': False, 'deferred_maint': False,
           'two_lots': False, 'lpr_days': None, 'storm_impact': False, 'buyer_broker_pct': None, 'dated': False,
           'needs_roof': False}
    if not v: return out
    low = v.lower()
    m = re.search(r"'(\d{2})\s*(?:-\s*'?\d{2}\s*)?(?:\+/-\s*)?(rmdl|remodel|update|updte|rebuil|renov|kit|reno)", low)
    if m:
        y = int(m.group(1)); out['remodel_year'] = 2000 + y if y <= 30 else 1900 + y
    else:
        m = re.search(r'((?:19|20)\d{2})\s*(rmdl|remodel|update|rebuil|renov)', low)
        if m: out['remodel_year'] = int(m.group(1))
    out['buyer_to_remodel'] = bool(re.search(r'byr\s*2\s*rmdl|buyer to remodel', low))
    out['cost_to_cure'] = bool(re.search(r'cost\s*2?\s*(to)?\s*cure', low))
    out['deferred_maint'] = bool(re.search(r'def\w*\s*m\w*n', low))
    out['two_lots'] = bool(re.search(r'\b2\s*lots', low))
    m = re.search(r'lpr\s*:?\s*(\d+)', low)
    if m: out['lpr_days'] = int(m.group(1))
    out['storm_impact'] = bool(re.search(r'\bsi\b|storm', low))
    m = re.search(r'(\d(?:\.\d+)?)\s*%', low)
    if m and float(m.group(1)) <= 6: out['buyer_broker_pct'] = float(m.group(1))
    out['dated'] = bool(re.search(r'dated|original', low))
    out['needs_roof'] = bool(re.search(r'nds\s*rf|needs roof', low))
    return out

def energy(v):
    v = clean(v)
    low = (v or '').lower()
    return {'solar': 'solar' in low, 'battery': bool(re.search(r'bttry|battery|powerwall', low)),
            'generator': bool(re.search(r'gn?e?rtr|gntr|generator|gnrt', low)),
            'modern_eff': bool(re.search(r'm\.?e\.?\b|mdrn|modern', low)) and not bool(re.search(r'some|sme', low)),
            'some_modern_eff': bool(re.search(r'some|sme', low))}

# ---------------------------------------------------------------- the three shifting custom rows
LAND_SCALE = [  # order matters (longest first); value = her scale
    (r'^(none|natural|ntrl|native)', 'None/Natural'), (r'immat', 'Immature'), (r'^min', 'Minimal'),
    (r'^(avg|average)\s*-?\s*(fair|fr)\b', 'Avg-Fair'), (r'^(avg|average)\s*-?\s*(g(oo)?d|gd)|^ag$|^avg\+', 'Avg-Good'),
    (r'^(avg|average|typ)', 'Average'), (r'^fair', 'Fair'), (r'^(v\s*-?\s*g(oo)?d|very\s*good|vg)', 'Very Good'),
    (r'^(g(oo)?d|gd)', 'Good'), (r'^(excel|exc|ex)$|^excel', 'Excellent'), (r'^(poor|burn)', 'Poor'),
    (r'orch|vin|avo|grove', 'Orchard/Vineyard'),
]

def land_rating(s):
    s = (s or '').strip().lower()
    if not s: return None
    for rx, out in LAND_SCALE:
        if re.search(rx, s): return out
    return None

AMENITY = [(r'\blap\b', 'lap_pool'), (r'abv\s*pl|above', 'above_ground_pool'), (r'cmty|cmnty|comm|hoa|club', 'community'),
           (r'\bpl\b|pool|pls\b', 'pool'), (r'\bsp\b|spa|jacuzzi|hot\s*tub', 'spa'), (r'tns|tnns|tennis', 'tennis'),
           (r'\bpb\b|pickle', 'pickleball'), (r'spct|sport|bsktbl|basketball|\bsc\b', 'sport_court'),
           (r'sna|sauna', 'sauna'), (r'eq|horse|arena|riding', 'equestrian'), (r'otdrkit|bbq|outdoor kit', 'outdoor_kitchen'),
           (r'firepit|fire pit|f\s*pit', 'fire_pit'), (r'putt', 'putting_green'), (r'pond|lake', 'pond'),
           (r'well\b', 'well'), (r'orch|vin|avo|grove', 'orchard'), (r'\bph\b|pool\s*h', 'pool_house')]

def amenities(s):
    low = (s or '').lower()
    out = []
    for rx, code in AMENITY:
        if re.search(rx, low) and code not in out: out.append(code)
    if 'community' in out:  # community pool/tennis is not the property's own
        out = ['community'] + [f'community_{x}' for x in out if x in ('pool', 'spa', 'tennis')]
    return out

BLD = [  # token regex (lower, no spaces), type, finished?
    (r'^jadu', 'JADU', True), (r'^adu|^aprt|^apt|^ap$|^unit|^2nd\s*unit|^sfr', 'ADU', True),
    (r'^g(st|uest|s|h|t)?(hse|house|wng|wing|s|std|stdo|studio)?$|^gst|^guest|^casita|^brgst|^bagst', 'Guest house', True),
    (r'^(art)?(std|stdo|studio|stdio)|^artst|^art$|^bastd', 'Studio', True),
    (r'^c(b|bn|bna|abana|bns)?$|^cabana|^cbna|^cbn|^opn?cb|^opcb', 'Cabana', True),
    (r'^ph$|^plhs|^plhse|^poolh|^pool\s*h', 'Pool house', True),
    (r'^o$|^of|^off|^ofc|^offc|^office', 'Office', True),
    (r'^gy|^gym|^yoga|^fit', 'Gym', True),
    (r'^rec|^rc$|^media|^mda|^game|^bonus|^den|^hobby|^hbby|^craft|^tea|^loft|^sunroom|^snrm|^r$', 'Recreation/hobby room', True),
    (r'^b$|^brn|^barn', 'Barn', False), (r'^stb|^stable', 'Stable', False),
    (r'^stg|^st$|^storage|^s$|^shed|^sh$', 'Storage/shed', False),
    (r'^w$|^wk|^wks|^wksh|^wkshp|^wrk|^workshop|^shp|^shop', 'Workshop', False),
    (r'^grnh|^green', 'Greenhouse', False), (r'^gazebo|^pvln|^pvl|^pavilion|^shade', 'Pavilion/gazebo', False),
    (r'^wine|^winecellar', 'Wine cellar', False), (r'^mech|^lndry|^laundry|^ba$|^bath|^wh$|^wrh|^mnu', 'Utility/other', False),
]

def building_type(tok):
    t = tok.lower().replace(' ', '').replace('.', '')
    for rx, typ, fin in BLD:
        if re.search(rx, t): return typ, fin
    return None, None

def accessory(s):
    """'814g1ba;474stg' -> [{'sf':814,'type':'Guest house','fin':True,'baths':1.0}, {'sf':474,'type':'Storage/shed',...}]
    Returns (list, unparsed_pieces)."""
    s = clean(s)
    if not s or s.lower() in NONE_WORDS: return [], []
    blds, bad = [], []
    for piece in re.split(r'[;,+&]|\band\b', s):
        p = piece.strip()
        if not p: continue
        m = re.match(r'(\d{2,5})\s*(?:\+/-)?\s*(?:sf)?\s*(.*)$', p, re.I)
        sf = None; rest = p
        if m: sf = int(m.group(1)); rest = m.group(2)
        rest_l = rest.lower()
        ba = None
        mb = re.search(r'(\d)\s*(?:br|bd)?\s*/\s*(\d(?:\.\d)?)|(\d(?:\.\d)?)\s*ba|\.(\d)\s*ba', rest_l)
        if mb:
            ba = float(mb.group(2) or mb.group(3) or ('0.' + mb.group(4) if mb.group(4) else 0))
        words = re.findall(r'[a-z]+', rest_l)
        typ = fin = None
        for w in words:
            if w in ('sf', 'ba', 'br', 'bd', 'baths', 'bath', 'w', 'with', 'fin', 'finished', 'fnshd', 'det', 'att', 'attch', 'detached'):
                if w == 'w' and words.index(w) == 0 and sf is not None: typ, fin = 'Workshop', False; break
                continue
            typ, fin = building_type(w)
            if typ: break
        if typ is None and words:
            joined = ''.join(words)
            typ, fin = building_type(joined)
        if typ is None and sf is None:
            bad.append(p); continue
        if typ is None and sf is not None and not words:
            typ, fin = 'Unlabeled building', None
        if typ is None:
            bad.append(p); typ, fin = 'Unlabeled building', None
        blds.append({'sf': sf, 'type': typ, 'fin': fin, 'baths': ba})
    return blds, bad


def classify_custom(v, nbhd_vocab):
    """Classify one value from the shifting custom rows.  Returns (kind, confidence, payload).
    kinds: usable_nbhd, nbhd, accessory, amenity_land, land_only, porch, fireplace, none, other"""
    v = clean(v)
    if not v: return None, 0, None
    low = v.lower().strip()
    if low in NONE_WORDS or low in ('none/none',): return 'none', 1, None
    # fireplace
    if re.search(r'f/?p\b|fireplace|fpl|wood\s*stove|\bfp\b', low) and not re.search(r'/\s*[a-z]{3,}', low.replace('f/p', '')):
        m = re.match(r'\s*(\d+)', low)
        return 'fireplace', 2, {'count': int(m.group(1)) if m else (0 if low.startswith('no') else None)}
    # "7405 sf/100%"  -> lot area + usable percent
    m = re.match(r'\s*([\d.,]+)\s*(sf|ac)?\s*/\s*([\d.]+)\s*%', low)
    if m:
        tot = area_token(m.group(1) + ' ' + (m.group(2) or ''))
        pct = _num(m.group(3))
        return 'usable_nbhd', 2, {'usable_sf': tot * pct / 100 if tot and pct is not None else None, 'usable_pct': pct, 'nbhd': None, 'ff': None}
    # land split by use: "0.62r/2.15o/ToroCyS", "1.9r/2.2e/4.89o/4.7w" -> r = core residential (usable), o = orchard, e, w kept as typed
    toks = re.findall(r'(\d*\.?\d+)\s*([roew])\b', low)
    if any(t[1] == 'r' for t in toks) and re.match(r'\s*\d*\.?\d+\s*r\b', low):
        split = {}
        for num, letter in toks:
            try: split[letter] = split.get(letter, 0) + float(num)
            except ValueError: pass
        rest = [p_.strip() for p_ in re.split(r'[/,;]', v) if p_.strip() and not re.fullmatch(r'\.?\d*\.?\d+\.?\s*[roewRO EW]?\.?', p_.strip(), re.I)]
        return 'usable_nbhd', 2, {'usable_sf': split.get('r', 0) * ACRE or None, 'usable_pct': None, 'nbhd': rest[-1] if rest else None, 'ff': None, 'land_split': split}
    # "<usable>/<ff>/<nbhd>", "1.1/GldnQdrngl", "0.62r/2.15o/ToroCyS", "1.65;19.48/OrtgaHill", "8000/Riviera N"
    m = re.match(r'\s*\.?([\d.,]+)\s*(sf|ac|r|acres?)?\s*[;/]', low)
    if m and not re.match(r'\s*\d+\s*(g|gst|adu|std|ph|cb|brn|stg|o|off|wk|ba|br)\b', low):
        parts = [p.strip() for p in re.split(r'[/;]', v) if p.strip()]
        nb = None; ff = None
        for p in parts[1:]:
            pl = p.lower()
            mf = re.match(r'(\d+)\s*ff', pl)
            if mf: ff = int(mf.group(1)); continue
            if re.match(r'[\d.]+\s*(o|ac|sf)?$', pl): continue
            nb = p
        num = m.group(1)
        if num.startswith('.'): num = '0' + num
        if v.strip().startswith('.'): num = '0.' + m.group(1)
        unit = m.group(2)
        usable = area_token(num + ' ' + ('ac' if unit in ('r', 'acres', 'acre') else (unit or '')))
        if nb and land_rating(nb) and not re.search(r'[A-Z][a-z]+[A-Z]', nb) and len(nb) < 12 and nb.lower() not in nbhd_vocab:
            # "Pool/Average" style already excluded by starting digit; "1/Good" is unusual -> treat as other
            return 'other', 0, None
        return 'usable_nbhd', 2, {'usable_sf': usable, 'usable_pct': None, 'nbhd': nb, 'ff': ff}
    if re.match(r'\s*\d+\s*ff\s*/', low):
        parts = v.split('/')
        return 'usable_nbhd', 1, {'usable_sf': None, 'usable_pct': None, 'nbhd': parts[-1].strip(), 'ff': int(re.match(r'\s*(\d+)', low).group(1))}
    # amenities / landscaping: "Pool,Spa/Good", "None/Average", "Pl,Sp,Tns,ShWl/VG"
    if '/' in v:
        left, right = v.rsplit('/', 1)
        lr = land_rating(right)
        if lr and not re.match(r'\s*\d', left):
            am = amenities(left)
            if am or left.strip().lower() in NONE_WORDS or land_rating(left) or left.strip() == '':
                return 'amenity_land', 2, {'amen': am, 'land': lr}
    am = amenities(low)
    if am and not re.search(r'\d{2,}', low) and not re.search(r'patio|porch|deck|balc', low):
        return 'amenity_land', 1, {'amen': am, 'land': land_rating(low.split('/')[-1]) if '/' in low else None}
    # porch / patio / deck
    if re.search(r'patio|porch|deck|balc|lgga|loggia|terr|trrc|veranda|courtyard|prgla|pergola|solar?i?um|cvd', low) and not re.search(r'\d{3,}\s*(g|gst|adu|std)', low):
        return 'porch', 2, None
    # accessory buildings
    blds, bad = accessory(v)
    if blds and not bad and any(b['type'] != 'Unlabeled building' for b in blds):
        return 'accessory', 2, {'blds': blds}
    if blds and any(b['type'] != 'Unlabeled building' for b in blds):
        return 'accessory', 1, {'blds': blds, 'bad': bad}
    if blds and not bad and len(blds) >= 1 and all(b['sf'] for b in blds):
        return 'accessory', 1, {'blds': blds}
    # landscaping word only ("Average", "Minimal")
    lr = land_rating(low)
    if lr and len(low) <= 16: return 'land_only', 1, {'land': lr}
    # neighborhood name only
    if re.search(r'[a-z]{3}', low) and (low in nbhd_vocab or re.sub(r'[^a-z]', '', low) in nbhd_vocab):
        return 'nbhd', 1, {'nbhd': v}
    if re.match(r'^[a-z][a-z .()/-]+$', low) and len(low) <= 30 and not re.search(r'yes|incl|good|avg|fair|typ|steep|zone', low):
        return 'nbhd', 0, {'nbhd': v}
    return 'other', 0, None
