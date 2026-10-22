import csv,re,json
R=list(csv.reader(open('a1/spec.tsv'),delimiter='\t'));H=R[0];ci=H.index('Conditionality')
def tent(sec,ss):
    if sec==2: return 1
    if sec==29: return 1 if re.search('Scope of Work|Intended',ss) else 8
    if sec in (3,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20,21): return 2
    if sec==4: return 5 if 'Site Valuation' in ss else 2
    if sec==17: return 3
    if sec==22: return 4
    if sec==25: return 5
    if sec in (23,24): return 6
    if sec==26: return 7
    if sec==1: return 2
    return 8
SKIP=re.compile(r'/(PARTIES|VIEWS|ABOUT_VERSIONS|DOCUMENT_CLASSIFICATION|VALUATION_SOFTWARE_SYSTEMS)/')
out=[];seen=set()
for r in R[1:]:
    if len(r)<=ci or r[ci].strip()!='R': continue
    xp=r[4].strip(); fld=r[6].strip()
    if not fld or SKIP.search(xp) or fld in ('ValuationReportContentIdentifier','ImageFileLocationIdentifier','MIMETypeIdentifier','ImageCategoryType'): continue
    subj=r[13].strip()=='x'
    if subj:
        m=xp.split('/PROPERTIES/PROPERTY/',1); 
        if len(m)<2: continue
        rel=m[1].strip('/')
    else:
        m=xp.split('/VALUATION_ANALYSIS/',1)
        if len(m)<2: continue
        rel=m[1].strip('/')
    mm=re.match(r'(\d+)\.(\d+)[^:]*: ([^-]+?) - ([^-]+?) - (.*)', r[3])
    if mm: sec=int(mm.group(1)); lab=f"{mm.group(1)}.{mm.group(2)} {mm.group(3).strip()} – {mm.group(5).strip()}"; t=tent(sec,mm.group(4))
    else: lab=fld; t=8 if not subj else 2
    lab=re.sub(r'\s\d+\.\d+(\.\d+)*:.*$','',lab).strip(); words=re.sub(r'([a-z])([A-Z])',r'\1 \2',fld).replace(' Indicator','').replace(' Type','')
    if '{No Label}' in lab or '{No Subsection}' in lab: lab=re.sub(r'\{No (Label|Subsection)\}',words.lower(),lab)
    if rel.startswith('MARKET'): t=3
    OV={'OpinionOfValueAmount':('Opinion of market value',7),'PropertyValuationConditionalConclusionType':('As is or subject to',2),'AppraisalReportEffectiveDate':('Effective date',1),
        'ValuationAssignmentType':('Assignment reason',1),'MarketingOrExposureTimeType':('Exposure time',7),'CostApproachIndicator':('Cost approach developed? (Yes / No)',2),'IncomeApproachIndicator':('Income approach developed? (Yes / No)',2),
        'RentScheduleIndicator':('Rent schedule included? (Yes / No)',2),'SalesComparisonApproachIndicator':('Sales comparison approach developed? (Yes / No)',2),'GovernmentAgencyAppraisalIndicator':('Government agency appraisal? (Yes / No)',1),
        'ValuationAdditionalIntendedUserIndicator':('Intended users besides the client? (Yes / No)',1),'ValuationAdditionalScopeOfWorkIndicator':('Additional scope of work? (Yes / No)',2),'AdditionalClientRequestedConditionsIndicator':('Client-requested conditions? (Yes / No)',1),
        'AppraiserAdditionalCertificationIndicator':('Additional certifications? (Yes / No)',8),'AppraiserFileIdentifier':('Appraiser file number',1),'AppraiserPriorServicesPerformedIndicator':('Prior services? (Yes / No)',8),
        'ReconsiderationOfValueIndicator':('Reconsideration of value? (Yes / No)',8),'ValuationReportInspectionCertificationType':('Inspection certification (interior and exterior …)',8),'PropertyDataReportIndicator':('Property data report used? (Yes / No)',1),
        'SketchExistsIndicator':('Sketch included? (Yes / No)',9),'ImprovementType':('Improvement type (dwelling)',2),'ValuationReconciliationSummaryCommentDescription':('Reconciliation comment',7),
        'LatitudeIdentifier':('Subject latitude (map location)',2),'LongitudeIdentifier':('Subject longitude (map location)',2),'MarketInventoryType':('Market inventory type',3),'DataSourceType':('Data source type',4)}
    if fld in ('ValuationAnalysisCategoryType','ValuationCommentText'): continue
    if fld in OV: lab,t=OV[fld]
    key=(subj,rel,fld)
    if key in seen: continue
    seen.add(key); out.append([1 if subj else 0, rel, fld, lab[:90], t])
open('/home/claude/genie/src/a1req.js','w').write('/* UAD 3.6 fields Fannie Mae always requires (A-1 Conditionality "R"), the ones this app writes – generated from A-1 (Oct 22 2026, tools/mk_a1req.py).\n   [subject property?, path below PROPERTY or VALUATION_ANALYSIS, field, F-1 place, tentacle] */\nconst A1_REQ = '+json.dumps(out,separators=(',',':'))+';\n')
print(len(out))
