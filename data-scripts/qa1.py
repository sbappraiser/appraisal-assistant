import sqlite3,collections,json
d=sqlite3.connect('/home/claude/aa/data/assistant_comps.db')
print(d.execute("select exclude_reason,count(*) from sales group by 1 order by 2 desc").fetchall())
print(d.execute("select flag,count(*) from data_flags group by 1 order by 2 desc").fetchall())
q="""select count(*), sum(gla is not null), sum(quality is not null), sum(condition is not null), sum(site_sf is not null), sum(usable_sf is not null),
 sum(view_rating is not null), sum(location_rating is not null), sum(acc_count is not null), sum(landscaping is not null), sum(beds is not null), sum(baths_full is not null),
 sum(garage_spaces is not null), sum(c.neighborhood is not null or neighborhood_row is not null), sum(pool), sum(adu_or_guest), sum(fireplaces is not null), sum(porch_patio is not null), sum(dom is not null)
 from sales s join comp_records c on c.rec_id=s.primary_rec_id where use_for_analysis=1"""
names="n gla Q C site usable viewR locR acc land beds baths gar nbhd pool adu fp porch dom".split()
print(dict(zip(names,d.execute(q).fetchone())))
print(d.execute("select substr(s.sale_month,1,4) y,count(*),sum(c.quality is not null) from sales s join comp_records c on c.rec_id=s.primary_rec_id where use_for_analysis=1 group by 1").fetchall())
print(d.execute("select s.zip,count(*),round(avg(s.price)),sum(usable_sf is not null) from sales s join comp_records c on c.rec_id=s.primary_rec_id where use_for_analysis=1 group by 1 order by 2 desc").fetchall())
print('review top:')
for r in d.execute("select * from custom_value_review order by n desc limit 40"): print('  ',r)
print(d.execute("select kind,how,count(*),sum(n) from custom_value_review group by 1,2 order by 4 desc").fetchall())
print(d.execute("select count(*), sum(disagreements is not null), sum(resale_flag is not null), sum(n_records>1) from sales").fetchone())
