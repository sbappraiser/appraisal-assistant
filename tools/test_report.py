#!/usr/bin/env python3
"""Full UAD 3.6 test report for SFREP import (Oct 15 2026).

Base = her iPad inspection export (subject, photos, sketch).  Added: comps from her database with a grid of TEST
adjustments (incl. her "Lot Utility/ Usable lot area" Add Other row), comps analyzed but not used, market, a TEST
purchase contract, scope, approaches, reconciliation, parties and data sources.  Element order follows Fannie Mae's
Appendix D-1 sample (SF1_Appraisal_v1.4.xml).  Everything invented for the test says TEST.

usage: test_report.py <ipad SFREP xml> <images dir> <assistant_comps.db> <D-1 xml> <out.zip>
"""
import sys, sqlite3, zipfile, os, re, statistics, datetime
import xml.etree.ElementTree as ET

NS = 'http://www.mismo.org/residential/2009/schemas'; XL = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', NS); ET.register_namespace('xlink', XL); ET.register_namespace('gse', 'http://www.datamodelextension.org')
q = lambda t: '{%s}%s' % (NS, t); LAB = '{%s}label' % XL
s = lambda t: t.split('}')[-1]

ipad_xml, img_dir, db_path, d1_path, out_zip = sys.argv[1:6]

# ---- element order learned from the D-1 sample ------------------------------------------------------------------
ORDER = {}
for e in ET.parse(d1_path).getroot().iter():
    seq = ORDER.setdefault(s(e.tag), [])
    for k in e:
        if s(k.tag) not in seq: seq.append(s(k.tag))
def rank(parent, tag):
    seq = ORDER.get(parent, [])
    return seq.index(tag) if tag in seq else 500 + sum(map(ord, tag[:3]))
def add(parent, tag, text=None, attrs=None, **kw):
    """append child keeping D-1 sibling order"""
    n = ET.Element(q(tag), {(LAB if k == 'label' else k): v for k, v in (attrs or {}).items()})
    if text is not None: n.text = str(text)
    kids = list(parent); pos = len(kids); r = rank(s(parent.tag), tag)
    for i, k in enumerate(kids):
        if rank(s(parent.tag), s(k.tag)) > r: pos = i; break
    parent.insert(pos, n); return n
def put(parent, path, text=None, attrs=None):
    """add a chain A/B/C (creating each level), set text on the last"""
    cur = parent
    for i, t in enumerate(path.split('/')):
        last = i == len(path.split('/')) - 1
        if last: return add(cur, t, text, attrs)
        nxt = cur.find(q(t)); cur = nxt if nxt is not None else add(cur, t)
def vals(parent, path, d, attrs=None):
    box = put(parent, path) if path else parent
    for k, v in d.items():
        if v is None or v == '': continue
        add(box, k, 'true' if v is True else 'false' if v is False else v, (attrs or {}).get(k))
    return box
SQFT = {'AreaUnitOfMeasureType': 'SquareFeet'}

tree = ET.parse(ipad_xml); root = tree.getroot()
VA = root.find('.//' + q('VALUATION_ANALYSIS')); PROPS = VA.find(q('PROPERTIES')); VR = VA.find(q('VALUATION_REPORT'))
SERVICE = root.find('.//' + q('SERVICE')); DOC = root.find('.//' + q('DOCUMENT'))
SUBJ = [p for p in PROPS if p.get('ValuationUseType') == 'SubjectProperty'][0]
txt = lambda e, p: (e.find('.//' + q(p)).text if e.find('.//' + q(p)) is not None else None)
S_GLA = int(float(txt(SUBJ, 'UnitStandardAboveGradeFinishedAreaMeasure'))); S_SITE = float(txt(SUBJ, 'LotSizeAreaMeasure'))
S_USABLE_AC = round(S_SITE / 43560, 2)        # her inspection: "All Usable"
EFF = txt(SUBJ, 'InspectionDate')

# ---- comps from her database -------------------------------------------------------------------------------------
db = sqlite3.connect(db_path); db.row_factory = sqlite3.Row
def rec(no, street):
    return dict(db.execute("select r.* from comp_records r join sales s on s.primary_rec_id=r.rec_id where r.street_number=? and r.street_name=? order by r.sale_month desc limit 1", (no, street)).fetchone())
USED = [rec('236', 'Pereza Cir'), rec('5549', 'Huntington Dr'), rec('476', 'Venado Dr')]
NOT_USED = [(rec('5161', 'Calle Asilo'), ['Quality'], 'TEST – quality code differs; three closer sales used'), (rec('5308', 'University Dr'), ['Other'], 'TEST – two-story design with a pool; less similar')]
ZIPCITY = {'93111': 'Santa Barbara', '93110': 'Santa Barbara', '93117': 'Goleta'}
TEST_PROX = [('0.4', 'East'), ('0.6', 'NorthEast'), ('0.9', 'North')]      # her DB has no lat/lon – TEST distances
mid = lambda m: m + '-15'                                                       # her DB keeps sale month only

# TEST adjustments (her decisions in a real report): time 0, usable land $800k/ac, GLA $350/sf, full bath $15k, condition C4→C3 $75k
def adjustments(c):
    usable_ac = round((c['usable_sf'] or c['site_sf'] or 0) / 43560, 2)
    gla_adj = round((S_GLA - c['gla']) * 350 / 1000) * 1000
    land = round((S_USABLE_AC - usable_ac) * 800000 / 1000) * 1000
    cond = 75000 if (c['condition'] or 3) >= 4 else 0
    rows = [('SaleDate', 0), ('SalesConcessions', 0), ('ContractDate', 0), ('SiteSize', 0),
            ('LivingUnitBedroomCount', 0), ('LivingUnitBathroomCount', (2 - (c['baths_full'] or 2)) * 15000),
            ('LivingUnitStandardFinishedAreaAboveGrade', gla_adj), ('OverallConditionRating', cond), ('YearBuilt', 0)]
    other = [('Lot Utility/ Usable lot area', '%.2f ac' % usable_ac, land)]
    return rows, other

AMOUNTS = []
for n, c in enumerate(USED, 1):
    P = ET.Element(q('PROPERTY'), {'ValuationUseType': 'SalesComparable', LAB: 'PROPERTY_SALESCOMP%d' % n})
    vals(P, 'ADDRESS', {'AddressLineText': c['street_number'] + ' ' + c['street_name'], 'CityName': ZIPCITY.get(c['zip'], c['city']), 'PostalCode': c['zip'], 'StateCode': 'CA'})
    if c['garage_spaces']:
        vals(P, 'CAR_STORAGES/CAR_STORAGE/CAR_STORAGE_DETAIL', {'CarStorageType': 'Garage', 'ParkingSpacesCount': int(c['garage_spaces'])})
    rows, other = adjustments(c)
    adjs = put(P, 'COMPARABLE/COMPARABLE_ADJUSTMENTS'); net = 0
    for ident, desc, amt in other:
        a = add(adjs, 'COMPARABLE_ADJUSTMENT'); add(a, 'AdditionalComparisonLineItemDescription', desc); add(a, 'AdditionalComparisonLineItemIdentifier', ident)
        add(a, 'ComparableAdjustmentAmount', amt); add(a, 'ComparableAdjustmentType', 'SalesComparableAdditionalAdjustableComparisonItem'); net += amt
    for t, amt in rows:
        a = add(adjs, 'COMPARABLE_ADJUSTMENT'); add(a, 'ComparableAdjustmentAmount', amt); add(a, 'ComparableAdjustmentType', t); net += amt
    price = int(c['price']); adjusted = price + net; AMOUNTS.append(adjusted)
    vals(P.find(q('COMPARABLE')), 'COMPARABLE_DETAIL', {'AdjustedSalesPriceAmount': adjusted, 'ComparableToSubjectDirectionType': TEST_PROX[n - 1][1], 'ComparableWeightType': 'Most' if n == 1 else 'Less',
        'ContractDateUnknownIndicator': True, 'PricePerTotalStandardAboveGradeFinishedAreaAmount': round(price / c['gla']), 'PropertyOrdinalNumber': n,
        'ProximityToSubjectDistanceLinearMeasure': TEST_PROX[n - 1][0], 'SalePriceNetTotalAdjustmentAmount': net},
        {'ProximityToSubjectDistanceLinearMeasure': {'LinearUnitOfMeasureType': 'Miles'}})
    vals(P, 'ENERGY_EFFICIENCY_AND_GREEN/ENERGY_EFFICIENCY_AND_GREEN_DETAIL', {'EfficiencyRatingExistsIndicator': False})
    imp = put(P, 'IMPROVEMENTS/IMPROVEMENT')
    vals(imp, 'IMPROVEMENT_DETAIL', {'ImprovementType': 'Dwelling', 'PropertyStructureBuiltYear': c['year_built_est'], 'PropertyStructureBuiltYearEstimatedIndicator': False})
    pu = put(imp, 'PROPERTY_UNITS/PROPERTY_UNIT')
    vals(pu, 'PROPERTY_UNIT_AREA', {'UnitBelowGradeUnfinishedAreaMeasure': 0, 'UnitStandardAboveGradeFinishedAreaMeasure': int(c['gla']), 'UnitStandardBelowGradeFinishedAreaMeasure': 0},
         {'UnitBelowGradeUnfinishedAreaMeasure': SQFT, 'UnitStandardAboveGradeFinishedAreaMeasure': SQFT, 'UnitStandardBelowGradeFinishedAreaMeasure': SQFT})
    Q = 'Q%d' % (c['quality'] or 4); C = 'C%d' % (c['condition'] or 4)
    vals(pu, 'PROPERTY_UNIT_DETAIL', {'AccessoryDwellingUnitIndicator': False, 'BedroomCount': c['beds'], 'FullBathroomCount': c['baths_full'], 'HalfBathroomCount': c['baths_half'] or 0,
         'InteriorConditionRatingCode': C, 'InteriorQualityRatingCode': Q})
    st = put(imp, 'STRUCTURE'); put(st, 'CONSTRUCTION_METHODS/CONSTRUCTION_METHOD/ConstructionMethodType', 'SiteBuilt')
    vals(st, 'STRUCTURE_DETAIL', {'ExteriorConditionRatingCode': C, 'ExteriorQualityRatingCode': Q, 'LivingUnitCount': 1, 'StoriesCount': int(c['stories'] or 1)})
    vals(P, 'LISTING_INFORMATIONS/LISTING_INFORMATION/LISTING_INFORMATION_DETAIL', {'DaysOnMarketCount': c['dom'], 'ListingStatusType': 'SettledSale'})
    put(P, 'NEIGHBORHOOD/NEIGHBORHOOD_DETAIL/NeighborhoodName', c['neighborhood'] or 'Goleta North')
    vals(P, 'PROPERTY_DETAIL', {'AccessoryDwellingUnitTotalCount': 0, 'AttachmentType': 'Detached', 'DwellingCount': 1, 'HomeownerResponsibleForExteriorMaintenanceIndicator': True,
         'LivingUnitExcludingADUCount': 1, 'OverallConditionRatingCode': C, 'OverallQualityRatingCode': Q, 'PriorSalesOrTransfersIndicator': False,
         'PropertyAmenityExistsIndicator': False, 'PropertyEstateType': 'FeeSimple', 'PropertyInProjectIndicator': False, 'PUDIndicator': False})
    vals(P, 'SALES_CONTRACTS/SALES_CONTRACT/SALES_CONTRACT_DETAIL', {'SalesConcessionAmountKnownIndicator': True, 'SalesConcessionIndicator': bool(c['concession_amt']),
         'TotalSalesConcessionAmount': int(c['concession_amt'] or 0)})
    sh = put(P, 'SALES_HISTORIES/SALES_HISTORY', attrs={'label': 'SALES_HISTORY_SalesComp%d' % n})
    for k, v in (('OwnershipTransferDate', mid(c['sale_month'])), ('OwnershipTransferTransactionAmount', price), ('OwnershipTransferTransactionType', 'Sale'), ('SaleType', 'TypicallyMotivated')): add(sh, k, v)
    site = put(P, 'SITE')
    vals(site, 'SITE_DETAIL', {'LandOwnedInCommonIndicator': False})
    vals(site, 'SITE_INFLUENCES/SITE_INFLUENCE/SITE_INFLUENCE_DETAIL', {'SiteInfluenceType': 'Residential'})
    put(site, 'SITE_SIZE_LAYOUT/LotSizeAreaMeasure', int(c['site_sf'] or c['usable_sf']), SQFT)
    vals(site, 'SITE_VIEWS/SITE_VIEW', {'ViewRangeType': 'Full', 'ViewType': 'Residential'})
    pos = list(PROPS).index(SUBJ) + n; PROPS.insert(pos, P)

for n, (c, reasons, why) in enumerate(NOT_USED, 1):
    P = ET.SubElement(PROPS, q('PROPERTY'), {'ValuationUseType': 'PropertyAnalyzedNotUsed'})
    vals(P, 'ADDRESS', {'AddressLineText': c['street_number'] + ' ' + c['street_name'], 'CityName': ZIPCITY.get(c['zip'], c['city']), 'PostalCode': c['zip'], 'StateCode': 'CA'})
    put(P, 'COMPARABLE/COMPARABLE_DETAIL/PropertyOrdinalNumber', n)
    put(P, 'LISTING_INFORMATIONS/LISTING_INFORMATION/LISTING_INFORMATION_DETAIL/ListingStatusType', 'SettledSale')
    pnu = put(P, 'PROPERTY_NOT_USED'); vals(pnu, 'PROPERTY_NOT_USED_DETAIL', {'AdditionalPropertyAnalyzedNotUsedText': why, 'ConsiderationRequestedIndicator': False})
    for r_ in reasons: put(pnu, 'PROPERTY_NOT_USED_REASONS/PROPERTY_NOT_USED_REASON/ReasonPropertyNotUsedType', r_)

VALUE = int(round(statistics.mean(AMOUNTS) / 5000) * 5000)

# ---- subject additions --------------------------------------------------------------------------------------------
a = put(SUBJ, 'COMPARABLE/COMPARABLE_ADJUSTMENTS/COMPARABLE_ADJUSTMENT')
add(a, 'AdditionalComparisonLineItemDescription', '%.2f ac' % S_USABLE_AC); add(a, 'AdditionalComparisonLineItemIdentifier', 'Lot Utility/ Usable lot area')
add(a, 'ComparableAdjustmentType', 'SalesComparableAdditionalAdjustableComparisonItem')
put(SUBJ, 'NEIGHBORHOOD/NEIGHBORHOOD_DETAIL/NeighborhoodName', 'Goleta North')
vals(SUBJ, 'LISTING_INFORMATION_SUMMARY', {'CumulativeDaysOnMarketCount': 9, 'ListedWithinPreviousYearIndicator': True})
vals(SUBJ, 'LISTING_INFORMATIONS/LISTING_INFORMATION/LISTING_INFORMATION_DETAIL', {'DaysOnMarketCount': 9, 'FinalListPriceAmount': 1795000, 'InitialListPriceAmount': 1795000,
     'ListingEndDate': '2026-09-20', 'ListingIdentifier': '26-TEST', 'ListingStartDate': '2026-09-11', 'ListingStatusType': 'Pending', 'ListingType': 'MLS'})
# market: settled sales from her database (Goleta North, 1-story, 1,400–2,200 sf, last 12 months); listings/pendings TEST
since = (datetime.date.fromisoformat(EFF) - datetime.timedelta(days=365)).isoformat()[:7]
ms = [r['price'] for r in db.execute("""select r.price from comp_records r join sales s on s.primary_rec_id=r.rec_id where r.neighborhood like 'Goleta North%'
       and r.sale_month>=? and r.sale_month<=? and r.gla between 1400 and 2200 and r.price>0""", (since, EFF[:7]))]
mk = put(SUBJ, 'MARKET')
vals(mk, 'MARKET_DETAIL', {'MarketBoundariesDescription': 'TEST – North: foothills; South: Hollister Ave; East: San Antonio Creek; West: Fairview Ave',
     'MarketInventoryLookbackMonthsCount': 12, 'MarketInventorySearchParameterDescription': 'Detached, 1,400–2,200 sq ft, Goleta North (SBMLS)'})
inv = put(mk, 'MARKET_INVENTORIES')
i1 = add(inv, 'MARKET_INVENTORY'); [add(i1, k, v) for k, v in (('MarketInventoryCount', 4), ('MarketInventoryHighestPriceAmount', 1895000), ('MarketInventoryLowestPriceAmount', 1495000),
     ('MarketInventoryMedianDaysOnMarketCount', 18), ('MarketInventoryMedianPriceAmount', 1695000), ('MarketInventoryType', 'ActiveListings'))]
i2 = add(inv, 'MARKET_INVENTORY'); add(i2, 'MarketInventoryCount', 3); add(i2, 'MarketInventoryType', 'PendingSales')
i3 = add(inv, 'MARKET_INVENTORY'); [add(i3, k, v) for k, v in (('MarketInventoryCount', len(ms)), ('MarketInventoryHighestPriceAmount', int(max(ms))), ('MarketInventoryLowestPriceAmount', int(min(ms))),
     ('MarketInventoryMedianPriceAmount', int(statistics.median(ms))), ('MarketInventoryType', 'TotalSales'))]
vals(mk, 'MARKET_TREND', {'MarketingTimeType': 'UnderThreeMonths', 'MarketSupplyTrendType': 'InBalance', 'MarketTrendsForeclosureActivityIndicator': False}).set(LAB, 'MARKET_TREND_1')
put(SUBJ, 'PARCEL_SUMMARY/PARCEL_SUMMARY_DETAIL/ParcelsLegalDescription', 'TEST – see legal description in the preliminary title report (APN 069-314-015)')
put(SUBJ, 'PROPERTY_VALUATIONS/PROPERTY_VALUATION/PROPERTY_VALUATION_DETAIL/PropertyValuationMethodType', 'TraditionalAppraisal')
vals(SUBJ, 'SALES_CONTRACTS/SALES_CONTRACT/SALES_CONTRACT_DETAIL', {'AllPropertyRightsAppraisedIndicator': True, 'ArmsLengthIndicator': True, 'PersonalPropertyIncludedIndicator': False,
     'SalesConcessionAmountKnownIndicator': True, 'SalesConcessionIndicator': False, 'SalesContractAmount': 1795000, 'SalesContractDate': '2026-09-20', 'SalesContractExistsIndicator': True,
     'SalesContractReviewedIndicator': True, 'SaleType': 'TypicallyMotivated', 'TotalSalesConcessionAmount': 0})
ua = SUBJ.find('.//' + q('PROPERTY_UNIT_AREA')); ua.set(LAB, 'PROPERTY_UNIT_AREA_SubjectPropertyArea')

# ---- data sources ---------------------------------------------------------------------------------------------------
DS = ET.Element(q('DATA_SOURCES')); VA.insert(0, DS)
def ds(label, typ=None, ident=None, name=None):
    d = add(DS, 'DATA_SOURCE', attrs={'label': label})
    if ident: add(d, 'DataSourceIdentifier', ident)
    if name: add(d, 'DataSourceName', name)
    if typ: add(d, 'DataSourceType', typ)
ds('DATA_SOURCE_SubjectProperty_GLA', 'PhysicalMeasurement'); ds('DATA_SOURCE_MLS', 'MLS'); ds('DATA_SOURCE_AssessorRecord', 'AssessorRecord'); ds('DATA_SOURCE_ExteriorInspection', 'ExteriorInspection')
for n, c in enumerate(USED, 1): ds('DATA_SOURCE_MLSSalesComp%d' % n, 'MLS', ident=c['mls_no'] or 'TEST')
ds('DATA_SOURCE_PriceTrend', name='SBMLS')

# ---- valuation report -------------------------------------------------------------------------------------------
def report_box(tag):
    e = VR.find(q(tag)); return e if e is not None else add(VR, tag)
ids = report_box('ADDITIONAL_IDENTIFIERS')
for v, t in (('TEST-LOAN-0001', 'Client'),):
    x = add(ids, 'ADDITIONAL_IDENTIFIER'); add(x, 'AdditionalValuationIdentifier', v); add(x, 'AdditionalValuationIdentifierType', t)
atv = report_box('APPROACH_TO_VALUE')
put(atv, 'COST_APPROACH/VALUATION_APPROACH_EXCLUSION_REASONS/VALUATION_APPROACH_EXCLUSION_REASON/ValuationApproachExclusionReasonType', 'NotNecessaryForCredibleResults')
put(atv, 'INCOME_APPROACH/VALUATION_APPROACH_EXCLUSION_REASONS/VALUATION_APPROACH_EXCLUSION_REASON/ValuationApproachExclusionReasonType', 'NotNecessaryForCredibleResults')
vals(atv, 'SALES_COMPARISON_APPROACH/SALES_COMPARISON_APPROACH_DETAIL', {'SalesComparisonCommentDescription': 'TEST – three closed sales in Goleta North within one mile and the last six months. Adjustments are TEST amounts to check the grid import.',
     'ValueIndicatedBySalesComparisonAmount': VALUE})
vals(report_box('SCOPE_OF_WORK'), 'SCOPE_OF_WORK_DETAIL', {'CostApproachIndicator': False, 'GovernmentAgencyAppraisalIndicator': False, 'IncomeApproachIndicator': False, 'RentScheduleIndicator': False,
     'SalesComparisonApproachIndicator': True, 'SiteValueIndicator': False, 'ValuationAdditionalIntendedUserIndicator': False, 'ValuationAdditionalScopeOfWorkIndicator': False, 'ValuationAssignmentType': 'Purchase'})
com = report_box('VALUATION_COMMENTARIES')
for cat, t in (('Market', 'TEST – market comment. Supply and demand are in balance; median price of settled sales in the last 12 months is $%s (%d sales, SBMLS).' % (format(int(statistics.median(ms)), ','), len(ms))),
               ('SalesContract', 'TEST – purchase contract for $1,795,000 accepted 9/20/2026. No seller credits; no personal property included; buyer pays buyer-broker compensation.'),
               ('SubjectListing', 'TEST – listed in SBMLS 9/11/2026 at $1,795,000; in contract after 9 days.'),
               ('HighestAndBestUse', 'TEST – the present use as a single-family residence is the highest and best use as improved.'),
               ('SubjectPriorSalesAndTransferHistory', 'No sales in the last three years. 6/15/2017 intrafamily transfer per CRS.'),
               ('ComparablesPriorSalesAndTransferHistory', 'TEST – no prior sales of the comparables in the year before their sale dates.')):
    x = add(com, 'VALUATION_COMMENTARY'); add(x, 'ValuationAnalysisCategoryType', cat); add(x, 'ValuationCommentText', t)
rec_ = report_box('VALUATION_RECONCILIATION')
vals(rec_, 'VALUATION_RECONCILIATION_DETAIL', {'AdditionalClientRequestedConditionsIndicator': False, 'ValuationReconciliationSummaryCommentDescription': 'TEST – most weight to comp 1 (closest and most similar).'})
summ = rec_.find(q('VALUATION_RECONCILIATION_SUMMARY'))
if summ is None: summ = add(rec_, 'VALUATION_RECONCILIATION_SUMMARY')
vals(summ, 'VALUATION_RECONCILIATION_SUMMARY_DETAIL', {'AppraisalReportEffectiveDate': EFF, 'MarketingOrExposureHighRangeDaysCount': 90, 'MarketingOrExposureLowRangeDaysCount': 30,
     'MarketingOrExposureTimeType': 'ReasonableExposureTime', 'OpinionOfValueAmount': VALUE})
vals(report_box('VALUATION_REPORT_DETAIL'), '', {'AppraiserAdditionalCertificationIndicator': False, 'AppraiserFileIdentifier': 'Brkl5464-1', 'AppraiserPriorServicesPerformedIndicator': False,
     'MeasurementStandardPublisherType': 'AmericanNationalStandardsInstitute', 'PropertyDataReportIndicator': False, 'ReconsiderationOfValueIndicator': False, 'SketchExistsIndicator': True,
     'ValuationReportInspectionCertificationType': 'InteriorAndExterior'})
sw = VR.find('.//' + q('ValuationSoftwareProductName')); sw.text = 'Appraisal Assistant (TEST report)'

# ---- parties and relationships ------------------------------------------------------------------------------------
PARTIES = add(SERVICE, 'PARTIES')
def party(name=None, first=None, last=None, roles=(), addr=None):
    p = add(PARTIES, 'PARTY')
    if name: put(p, 'LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/FullName', name)
    if first: nm = put(p, 'INDIVIDUAL/NAME'); add(nm, 'FirstName', first); add(nm, 'LastName', last)
    if addr: vals(p, 'ADDRESSES/ADDRESS', dict(zip(('AddressLineText', 'CityName', 'PostalCode', 'StateCode'), addr)))
    rs = put(p, 'ROLES'); out = []
    for r_ in roles:
        ro = add(rs, 'ROLE', attrs={'label': 'ROLE_' + r_} if r_ == 'Appraiser' else None); out.append(ro)
        if r_ == 'Appraiser': put(ro, 'APPRAISER/APPRAISER_DETAIL/AppraiserCompanyName', 'Jennifer Heath, LLC')
        put(ro, 'ROLE_DETAIL/PartyRoleType', r_)
    return p
party(name='TEST Bank, N.A.', roles=('Lender', 'Client'), addr=('100 Test Plaza', 'Irvine', '92614', 'CA'))
party(first='Jennifer', last='Heath', roles=('Appraiser',), addr=('5464 Berkeley Rd', 'Santa Barbara', '93111', 'CA'))
party(first='TEST', last='Borrower', roles=('Borrower',))
party(name='Heath-Bendle Family Trust 1/15/17', roles=('PropertySeller', 'PropertyOwner'))
RELS = add(SERVICE, 'RELATIONSHIPS')
def rel(arc, frm, to): ET.SubElement(RELS, q('RELATIONSHIP'), {'{%s}arcrole' % XL: 'urn:fdc:mismo.org:2009:residential/' + arc, '{%s}from' % XL: frm, '{%s}to' % XL: to})
for n in range(1, len(USED) + 1):
    rel('DATA_SOURCE_IsDataSourceFor_PROPERTY', 'DATA_SOURCE_MLSSalesComp%d' % n, 'PROPERTY_SALESCOMP%d' % n)
    rel('DATA_SOURCE_IsDataSourceFor_PROPERTY', 'DATA_SOURCE_AssessorRecord', 'PROPERTY_SALESCOMP%d' % n)
    rel('DATA_SOURCE_IsDataSourceFor_PROPERTY', 'DATA_SOURCE_ExteriorInspection', 'PROPERTY_SALESCOMP%d' % n)
rel('DATA_SOURCE_IsDataSourceFor_MARKET_TREND', 'DATA_SOURCE_PriceTrend', 'MARKET_TREND_1')
rel('DATA_SOURCE_IsDataSourceFor_PROPERTY_UNIT_AREA', 'DATA_SOURCE_SubjectProperty_GLA', 'PROPERTY_UNIT_AREA_SubjectPropertyArea')
if root.find('.//*[@{%s}label="INSPECTION_Appraiser"]' % XL) is not None: rel('INSPECTION_CompletedBy_ROLE', 'INSPECTION_Appraiser', 'ROLE_Appraiser')
put(SERVICE, 'SERVICE_DETAIL/ServiceType', 'Valuation') if SERVICE.find(q('SERVICE_DETAIL')) is None else None

# labels referenced must exist
labels = {e.get(LAB) for e in root.iter() if e.get(LAB)}
for r_ in list(RELS):
    for end in ('from', 'to'):
        if r_.get('{%s}%s' % (XL, end)) not in labels: print('dropping relationship to missing', r_.get('{%s}%s' % (XL, end))); RELS.remove(r_); break

# ---- write -------------------------------------------------------------------------------------------------------
ET.indent(tree, '\t')
body = ET.tostring(root, encoding='unicode')
xml = '<?xml version="1.0" encoding="UTF-8"?>\n<!--TEST report built by the Appraisal Assistant: subject from the iPad inspection; comps from her database; amounts marked TEST are made up for the import test.-->\n' + body
name = 'Brkl5464 TEST full report'
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr(name + '.xml', xml)
    for f in sorted(os.listdir(img_dir)): z.write(os.path.join(img_dir, f), 'Images/' + f)
print('value', VALUE, 'adjusted', AMOUNTS, 'market sales', len(ms))
