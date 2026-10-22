# Field accounting for the octopus map: every A-1 field → tentacle and status. Needs a1/spec.tsv (from her A-1 spreadsheet) and a full-report XML; run from a folder holding them.
import csv,re,collections,glob,json,sys
import xml.etree.ElementTree as ET
R=list(csv.reader(open('a1/spec.tsv'),delimiter='\t')); H=R[0]; ci=H.index('Conditionality')
# export pairs
ex=set()
t=ET.parse('fullrep/5464 Berkeley Rd - Full report.xml')
def walk(e,parent):
    tag=e.tag.split('}')[-1]
    ex.add((parent,tag))
    for k in e.attrib: ex.add((tag,'@'+k.split('}')[-1]))
    for c in e: walk(c,tag)
walk(t.getroot(),'')
code=''
for f in glob.glob('/home/claude/uad/src/*.js')+glob.glob('/home/claude/genie/src/*.js'):
    if f.endswith(('a1.js','xsdorder.js','d1order.js')): continue
    code+=open(f).read()
def tent(sec,ss,name):
    if 'Exhibit' in ss: return 9
    if sec==2: return 1
    if sec==29: return 1 if re.search('Scope of Work|Intended',ss) else 7
    if sec in (3,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20): return 2
    if sec==4: return 5 if 'Site Valuation' in ss else 2
    if sec==21: return 2 if 'Subject' in ss else 4
    if sec==17: return 3
    if sec==22: return 4
    if sec==25: return 5
    if sec in (23,24): return 6
    if sec==26: return 7
    if sec==1: return 2 if 'Defects' in ss else 7
    if sec==27: return 8
    if sec==28: return 9
    return 0
rows=[]; seen=set()
for r in R[1:]:
    if len(r)<=ci: continue
    name=r[6].strip(); attr=r[7].strip(); par=r[5].strip()
    if not name: continue
    m=re.search(r'(\d+)\.(\d+)(?:\.\d+)*: ([^-]+?) - ([^-]+?) - (.*)', r[3])
    if m: sec=int(m.group(1)); sn=m.group(3).strip(); ss=m.group(4).strip(); lab=m.group(5).strip()[:60]; fid=r[3].split(':')[0]
    else: sec=0; sn='Does not display'; ss=''; lab=''; fid=''
    key=(par,name,attr,fid)
    if key in seen: continue
    seen.add(key)
    inx=(par,name) in ex if not attr else (name,attr) in ex
    nm=attr.lstrip('@') if attr else name
    inc=re.search(r'\b'+nm+r'\b',code) is not None
    st='in report' if inx else ('handled when it applies' if inc else 'not yet')
    rows.append(dict(t=tent(sec,ss,name),sec=sec,sn=sn,ss=ss,fid=fid,lab=lab,name=name,attr=attr,par=par,c=r[ci].strip(),st=st))
json.dump(rows,open('fieldmap.json','w'))
C=collections.Counter((x['t'],x['st']) for x in rows)
for t in range(0,10): print(t,{k[1]:v for k,v in C.items() if k[0]==t})
nd=[x for x in rows if x['st']=='not yet' and x['sec']]
print(len(rows),'fields;',len(nd),'not yet (displayed)')
for x in nd: print(x['t'],x['fid'],x['sn'],'|',x['ss'],'|',x['lab'],'|',x['name'],x['attr'],x['c'])
