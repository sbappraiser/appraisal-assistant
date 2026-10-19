"""Export the assistant comp database to one compact gzip JSON file the comp genie loads once into the browser.
usage: python3 -I export_archive_json.py <assistant_comps.db> <out.json.gz>"""
import sqlite3, sys, json, gzip

DB, OUT = sys.argv[1], sys.argv[2]
d = sqlite3.connect(f'file:{DB}?mode=ro', uri=True); d.row_factory = sqlite3.Row
COLS = ['rec_id', 'sale_id', 'record_role', 'comparable_type', 'property_type_id', 'from_report', 'entered_date',
        'street_number', 'street_name', 'unit', 'city', 'zip', 'norm_address', 'apn', 'neighborhood', 'neighborhood_row',
        'price', 'sale_month', 'contract_month', 'sale_type', 'financing', 'concession_amt', 'mls_no', 'dom', 'verification', 'listing_status',
        'location_rating', 'location_factors', 'location_raw', 'site_sf', 'usable_sf', 'land_split', 'front_feet', 'topography',
        'view_rating', 'view_types', 'view_limited', 'view_panoramic', 'view_raw', 'attachment', 'stories', 'style', 'design_raw',
        'quality', 'quality_mod', 'quality_raw', 'condition', 'condition_mod', 'condition_raw', 'actual_age', 'effective_age', 'year_built_est',
        'rooms', 'beds', 'baths_full', 'baths_half', 'gla', 'bsmt_sf', 'bsmt_fin_sf', 'bsmt_access', 'bg_rec', 'bg_beds', 'bg_full', 'bg_half',
        'garage_spaces', 'garage_type', 'driveway_spaces', 'carport_spaces', 'garage_raw', 'heating_cooling', 'energy_raw', 'solar', 'battery', 'generator',
        'fu_raw', 'remodel_year', 'buyer_to_remodel', 'lpr_days', 'buyer_broker_pct', 'porch_patio', 'fireplaces',
        'pool', 'spa', 'tennis', 'pickleball', 'sport_court', 'sauna', 'equestrian', 'community_amenities', 'amenities', 'landscaping',
        'acc_count', 'acc_fin_sf', 'acc_unfin_sf', 'adu_or_guest', 'accessory_json', 'accessory_raw', 'hoa_month', 'prior_sale', 'front_photo', 'flags', 'also_reports']
rows = [[r[c] for c in COLS] for r in d.execute(f'select {",".join(COLS)} from comp_records order by norm_address, entered_date')]
sales = {r['sale_id']: {'price': r['price'], 'month': r['sale_month'], 'type': r['sale_type'], 'primary': r['primary_rec_id'], 'resale': r['resale_flag'],
                        'use': r['use_for_analysis'], 'diff': r['disagreements']} for r in d.execute('select * from sales')}
data = {'app': 'appraisal-assistant-comp-archive', 'version': 1, 'built': d.execute("select value from conversion_info where key='built'").fetchone()[0],
        'cols': COLS, 'rows': rows, 'sales': sales}
raw = json.dumps(data, separators=(',', ':'), default=str).encode()
with gzip.open(OUT, 'wb', compresslevel=9) as f: f.write(raw)
print(len(rows), 'records', len(sales), 'sales', round(len(raw) / 1e6, 1), 'MB raw')
