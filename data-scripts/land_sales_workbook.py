import sqlite3, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment
c=sqlite3.connect('/home/claude/aa/data/assistant_comps.db'); c.row_factory=sqlite3.Row
rows=c.execute("""select * from comp_records where comparable_type='Sale' and price>0 and (property_type_id=5 or (property_type_id=1 and (gla is null or gla=0) and site_sf>0 and (upper(from_report) like '%LOT%' or upper(from_report) like '%LAND%' or upper(from_report) like '%VAC%'))) order by entered_date desc""").fetchall()
seen=set(); data=[]
for r in rows:
    k=((r['norm_address'] or (str(r['street_number'])+' '+str(r['street_name']))).lower(), r['sale_month'])
    if k in seen: continue
    seen.add(k); data.append(r)
AREAS=['Montecito','Hope Ranch / Foothills','Santa Barbara (Riviera / San Roque / Mission Canyon)','Santa Barbara East / Riviera','Santa Barbara Downtown / West','Mesa','Goleta','Goleta (Noleta)','Carpinteria','Summerland']
NAMES={'Santa Barbara (Riviera / San Roque / Mission Canyon)':'SB Riviera-San Roque-Mission','Santa Barbara East / Riviera':'SB East-Riviera','Santa Barbara Downtown / West':'SB Downtown-West','Hope Ranch / Foothills':'Hope Ranch-Foothills'}
sheetname=lambda a: NAMES.get(a,a)[:31]
groups={}
for r in data:
    a=r['area_name'] if r['area_name'] in AREAS else 'Other'; groups.setdefault(a,[]).append(r)
# CORT: sales its reports label vacant land (no living area) - she confirms each one
import csv, re
def cort_land(r):
    t=((r.get('remarks') or '')+' '+(r.get('detail') or '')).upper()
    if not re.search(r'VACANT|UNIMPROVED|RAW LAND|LAND ONLY',t): return False
    if (r.get('sqft') or '').strip() not in ('','0'): return False
    return not re.search(r'\d\s*FP|GAR|POOL|BDRM|\bBR\b', t.split('REMARKS')[-1])
CITY={'MONT':'Montecito','SUMM':'Summerland','CARP':'Carpinteria','GOLT':'Goleta','GOLE':'Goleta'}
for r in csv.DictReader(open('/home/claude/aa/data/cort/cort_all.csv')):
    if not cort_land(r): continue
    t=(r.get('remarks') or '')+' '+(r.get('detail') or '')
    m=re.search(r'(\d+(?:\.\d+)?|1/2|1/4|3/4)\s*(?:ACRES?|AC)\b',t,re.I); ac=None
    if m: v=m.group(1); ac={'1/2':.5,'1/4':.25,'3/4':.75}.get(v) or float(v)
    sq=re.search(r'LOT[: ]*([\d,]+)\s*(?:SQ ?FT|SF)',t,re.I)
    site=round(ac*43560) if ac else (int(sq.group(1).replace(',','')) if sq else None)
    d=re.match(r'(\d\d)/(\d\d)/(\d\d)',r.get('date') or ''); ym=('20'+d.group(3)+'-'+d.group(1)) if d else None
    addr=r['address'] if r.get('address') and 'NO ADDRESS' not in r['address'] else ''
    rem=re.sub(r'\s+',' ',(r.get('remarks') or '').strip() or (re.search(r'Remarks\s*:\s*([^F]*)',r.get('detail') or '') or [None,''])[1]).strip()
    a=CITY.get(r.get('city'),'Other')
    groups.setdefault(a,[]).append({'_cort':True,'neighborhood':None if a!='Other' else ('Santa Barbara – move to its area' if r.get('city')=='SBAR' else r.get('city')),
      'street_number':'','street_name':addr.title(),'unit':None,'apn':r.get('apn'),'sale_month':ym,'price':float(r['price']) if (r.get('price') or '').replace('.','').isdigit() else None,
      'site_sf':site,'usable_sf':None,'view_rating':None,'view_types':None,'topography':None,'from_report':'CORT '+(r.get('report_date') or '')+' inst. '+(r.get('instno') or '')+(' – '+rem if rem else ''),'property_type_id':'cort'})
order=AREAS+['Other']
wb=openpyxl.Workbook(); F='Arial'; ws=wb.active; ws.title='How to use'
txt=["Land sales by neighborhood – Jennifer Heath, LLC","",
"One sheet per area; each row is one land sale. The rows already filled in are the land sales from your own earlier reports (your appraisal archive) – please check them; some are missing a sale date or site size.",
"Add your other land sales at the bottom of the sheet for their area, one per row. Keep the columns as they are; leave a cell blank if you do not know it.",
"Yellow cells are yours to fill in. The grey columns (acres, price per site sq ft, price per usable acre) are worked out from your entries – do not type in them.",
"Example of a row: Montecito Foothills West | 123 Example Ln | | 013-000-000 | 2025-06 | 3,250,000 | 87,120 | 43,560 | (2.00) | ($37) | ($3,250,000) | A-1 | Mountain, partial | Sloping | Montecito Water, septic | none | MLS 25-1234 | sold with approved plans",
"Sale date: year and month, like 2025-06. Price and sizes: numbers only. Usable area: your measured usable land in square feet.",
"Check column: 'Land sale in your report' = a land sale you used before. 'In a land report – confirm it was land' = a sale with no living area from one of your land reports. 'CORT says vacant – confirm it was land' = a CORT sale marked vacant with no living area (CORT sometimes writes VACANT for an empty house). Correct or delete those rows.",
"When you are done, send the workbook back. The Appraisal Assistant will read it in as your land sale database for the cost approach (land value). Nothing changes until you send it.",
"","Areas and how many sales are filled in:"]
for i,t in enumerate(txt,1):
    cc=ws.cell(i,1,t); cc.font=Font(name=F,size=14 if i==1 else 11,bold=(i==1)); cc.alignment=Alignment(wrap_text=True,vertical='top')
ws.column_dimensions['A'].width=125
for i,a in enumerate(order): ws.cell(len(txt)+1+i,1,f"{sheetname(a)}: {len(groups.get(a,[]))} sale(s)").font=Font(name=F,size=11)
HEAD=['Neighborhood','Address','Unit','APN','Sale date (YYYY-MM)','Sale price ($)','Site size (sq ft)','Usable area (sq ft)','Acres','Price per site sq ft ($)','Price per usable acre ($)','Zoning','View','Topography','Utilities / water','Improvements at sale','Source','Your notes','Check']
W=[24,26,7,13,12,13,13,13,8,12,14,10,16,14,18,20,22,30,26]
yellow=PatternFill('solid',fgColor='FFF2CC'); grey=PatternFill('solid',fgColor='EDEDED'); head=PatternFill('solid',fgColor='FFDCB5'); thin=Side(style='thin',color='C9D1DA')
for a in order:
    sh=wb.create_sheet(sheetname(a))
    for j,(h,w) in enumerate(zip(HEAD,W),1):
        c1=sh.cell(1,j,h); c1.font=Font(name=F,bold=True,size=10); c1.fill=head; c1.alignment=Alignment(wrap_text=True,vertical='center'); sh.column_dimensions[get_column_letter(j)].width=w
    sh.row_dimensions[1].height=32; sh.freeze_panes='C2'
    rr=sorted(groups.get(a,[]), key=lambda r:((r['neighborhood'] or 'zzz'), r['sale_month'] or ''))
    for i in range(len(rr)+40):
        R=i+2; r=rr[i] if i<len(rr) else None; vals=[None]*len(HEAD)
        if r:
            vals[0]=r['neighborhood']; vals[1]=' '.join(x for x in [str(r['street_number'] or ''),str(r['street_name'] or '')] if x).strip(); vals[2]=r['unit']; vals[3]=r['apn']; vals[4]=r['sale_month']; vals[5]=r['price']
            vals[6]=round(r['site_sf']) if r['site_sf'] else None; vals[7]=round(r['usable_sf']) if r['usable_sf'] else None
            vals[12]=('; '.join(x for x in [r['view_rating'],r['view_types']] if x)) or None; vals[13]=r['topography']
            vals[16]=(str(r['from_report']) if r['property_type_id']=='cort' else 'Your report '+str(r['from_report'])); vals[18]='Land sale in your report' if r['property_type_id']==5 else 'CORT says vacant – confirm it was land' if r['property_type_id']=='cort' else 'In a land report – confirm it was land'
        for j,v in enumerate(vals,1):
            cell=sh.cell(R,j,v); cell.font=Font(name=F,size=10); cell.border=Border(bottom=thin)
            if j in (9,10,11): cell.fill=grey
            elif j not in (17,19): cell.fill=yellow
        sh.cell(R,9,f'=IF(G{R}>0,G{R}/43560,"")').number_format='0.00'
        sh.cell(R,10,f'=IF(AND(F{R}>0,G{R}>0),F{R}/G{R},"")').number_format='$#,##0'
        sh.cell(R,11,f'=IF(AND(F{R}>0,H{R}>0),F{R}/(H{R}/43560),"")').number_format='$#,##0'
        for col,fmt in ((6,'$#,##0'),(7,'#,##0'),(8,'#,##0')): sh.cell(R,col).number_format=fmt
    sh.cell(1,11).comment=Comment('Price ÷ usable acres. Blank until you enter the usable area.','Appraisal Assistant')
out='/tmp/claude-0/-home-claude/42748c0a-62f2-5f4a-bc48-7275f362e257/scratchpad/send/Land Sales by Neighborhood.xlsx'
wb.save(out); print(len(data), sum(1 for g in groups.values() for r in g if isinstance(r,dict)), {sheetname(a):len(groups.get(a,[])) for a in order})
