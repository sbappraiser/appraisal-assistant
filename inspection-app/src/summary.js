/* ---------------- Sentence summaries for UAD commentary fields ----------------
   Each generator returns [{t: sentence, p: priority}] (1 = keep first, 3 = drop first).
   The user's own comment for a field is always kept; generated sentences are
   dropped lowest-priority-first until the combined text fits the UAD limit. */

// lower-case for running text, but keep acronyms, model names and brands (EV, HVAC, Control4, Sub-Zero…)
const KEEP_CASE = new Set(['Control4','Lutron','Crestron','Savant','Sonos','Tesla','Powerwall','Ring','Nest','Sub-Zero','Wolf','Miele','Thermador','Gaggenau','Viking','Corian','Wi-Fi','Murphy','Trex','Hardie','James','Pella','Andersen','Marvin','Fleetwood','Western','Kohler','Toto','Waterworks','Duravit']);
const lc = s => String(s || '').split(/(\s+|\/)/).map(w => (/^[A-Z0-9]{2,}[A-Za-z]?$/.test(w) || /\d/.test(w) || KEEP_CASE.has(w)) ? w : w.toLowerCase()).join('');
function listJoin(a) { a = (Array.isArray(a) ? a : (a == null || a === '' ? [] : [a])).filter(Boolean).map(String); if (a.length <= 1) return a.join(''); return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function F(secId, k) { for (const s of SECTIONS) if (s.id === secId) for (const g of s.groups) for (const f of g.fields) if (f.k === k) return f; return null; }
function L(listKey, k) { return LISTS[listKey].fields.find(f => f.k === k); }
function sv(ins, secId, k) { const f = F(secId, k); const d = ins.data[(f && f.link) || secId]; const v = d[k]; return f ? valText(f, v, d) : v; }
function lv(listKey, it, k) { const f = L(listKey, k); return f ? valText(f, it[k]) : it[k]; }
function lvl(ins, secId, k) { const f = F(secId, k); const d = ins.data[secId]; const v = d[k]; if (!f || isEmpty(v)) return []; return (Array.isArray(v) ? v : [v]).filter(x => x !== 'None' && x !== 'No Fire Hazard Zone').map(x => lc(labelFor(f, x, d))); }
const brandList = it => Object.entries(it.appl || {}).map(([k, s]) => s.brand).filter(b => b && b !== 'Other' && !/^Unknown/.test(b)).filter((b, i, a) => a.indexOf(b) === i);
function S(t, p = 2) { return t ? { t: t.replace(/\s+/g, ' ').trim().replace(/([^.!?])$/, '$1.'), p } : null; }
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* Commentary follows the appraiser's own template style: concise analytical statements plus only
   what the UAD data fields cannot carry. Kitchens, baths, finishes and systems get a descriptive
   paragraph in the Unit Interior commentary. Every checkbox stays in the workfile notes. */
const LUX = ['Sub-Zero','Wolf','Miele','Thermador','Gaggenau','La Cornue','Viking','Dacor','GE Monogram','Fisher & Paykel','Bertazzoni','JennAir','Cove','Scotsman','Perlick','True','U-Line','BlueStar','Hestan','Signature Kitchen Suite','Liebherr','Asko','Bosch Benchmark','Officine Gullo','Lacanche','Molteni','Aga'];
const per = ins => listJoin((ins.data.interview.who || []).map(lc)) || 'the interviewee';
const yr4 = y => /^\d{4}$/.test(String(y || ''));
function applDetail(it) {
  return Object.entries(it.appl || {}).map(([k, s]) => { const a = APPLIANCES.find(x => x.k === k); if (!a) return null; const nm = lc(a.l).replace(' / ', '/');
    return `${s.brand && s.brand !== 'Other' && !/^Unknown/.test(s.brand) ? s.brand + ' ' : ''}${nm}${s.opt ? ' (' + s.opt.toLowerCase() + ')' : ''}${s.qty > 1 ? ' (' + s.qty + ')' : ''}`; }).filter(Boolean);
}
const mats = (arr, opt) => (arr || []).filter(x => x && x !== 'None').map(x => lc(opt ? labelOf(opt, x) : x));
function kitchenText(k, name) {
  const p = [];
  const cab = mats(k.cab); if (cab.length) p.push(`${listJoin(cab)} cabinetry`);
  const ctr = mats(k.counter); if (ctr.length) p.push(`${listJoin(ctr)} counters${(k.amen || []).includes('Waterfall Counter Edge') ? ' with waterfall edge' : ''}`);
  const ap = applDetail(k); if (ap.length) p.push(listJoin(ap));
  if (k.islands) p.push(`${k.islands > 1 ? k.islands + ' islands' : 'an island'}${k.islandSeat ? ' with bar seating' : ''}`);
  const am = mats(k.amen).filter(x => x !== 'waterfall counter edge'); if (am.length) p.push(listJoin(am));
  const fn = mats(k.finish); if (fn.length) p.push(`${listJoin(fn)} fixtures`);
  const fl = mats(k.flooring, FLOORING); if (fl.length) p.push(`${listJoin(fl)} flooring`);
  return p.length ? `${cap(name)}: ${p.join('; ')}` : '';
}
function bathText(b, name) {
  const p = [];
  const sinks = mats(b.vanity).filter(x => /sinks|makeup/.test(x)), van = mats(b.vanity).filter(x => !/sinks|makeup/.test(x)), vm = mats(b.vanMat);
  if (van.length || vm.length || sinks.length) p.push(`${[listJoin(vm), listJoin(van)].filter(Boolean).join(' ')} vanit${b.vanQty > 1 ? 'ies (' + b.vanQty + ')' : 'y'}${sinks.length ? ' with ' + listJoin(sinks) : ''}`.trim());
  const ctr = mats(b.counter); if (ctr.length) p.push(`${listJoin(ctr)} counters`);
  if (b.tubFree) p.push(`${mats(b.tubFreeMat).length ? listJoin(mats(b.tubFreeMat)) + ' ' : ''}freestanding tub`);
  if (b.tubShower) p.push(`tub/shower with ${listJoin(mats(b.tubShowerMat)) || 'tile'} surround`);
  if (b.shower) p.push(`${mats(b.showerMat).length ? listJoin(mats(b.showerMat)) + ' ' : ''}shower${(b.feat || []).includes('Frameless Glass') ? ' with frameless glass' : ''}`);
  const f = mats(b.feat).filter(x => x !== 'frameless glass' || !b.shower); if (f.length) p.push(listJoin(f));
  
  const fl = mats(b.flooring, FLOORING); if (fl.length) p.push(`${listJoin(fl)} flooring`);
  return p.length ? `${cap(name)}: ${p.join('; ')}` : '';
}

const GEN = {
  accessDesc(ins) {
    const d = ins.data.street; const out = [];
    if (d.accessTypical === false || d.primaryAccess) out.push(S(`The site has ${lc(sv(ins, 'street', 'primaryAccess')) || 'street'} access via a ${lc(sv(ins, 'street', 'streetSurface'))} ${lc(sv(ins, 'street', 'streetType'))}`.replace(/ +/g, ' '), 1));
    if (d.accessTypical === false) out.push(S('Access is not typical for the market', 1));
    return out;
  },
  siteFeatures(ins) {
    const s = ins.data.site, a = ins.data.amenities, out = [];
    if (s.ageRestr === true && !IS_HOA(ins)) out.push(S(`The property is age restricted${s.ageDesc ? ' (' + (s.ageDesc.charAt(0).toLowerCase() + s.ageDesc.slice(1)).replace(/\.$/, '') + ')' : ''}; the effect on value and marketability is considered ${(s.ageImpact || 'neutral').toLowerCase()}`, 1));
    out.push(S(s.siteDefects === true ? 'Adverse site conditions observed are described in the site defects section' : 'No readily observable adverse site conditions or material encroachments were noted during observation', 1));
    out.push(S('This analysis does not determine precise boundaries, easements, or legal matters requiring a professional survey or title examination. Site data (boundaries, dimensions, configuration) is based on available public records, plat maps, and aerial imagery considered reliable for appraisal purposes', 1));
    if ((a.hardscape || []).includes('Fencing') || (a.hardscape || []).includes('Perimeter Walls')) out.push(S('Perimeter fencing provides an effective physical buffer from adjacent parcels, supporting typical residential usage within this market segment', 2));
    if (s.usable && s.usable !== 'All Usable') out.push(S(`${cap(lc(s.usable))} site area`, 2));
    const fz = (s.fire || []).filter(x => /Hazard Severity Zone/.test(x));
    if (fz.length) out.push(S(`Fire Hazard Severity Zone: According to CAL FIRE Fire Hazard Severity Zone mapping, the subject is located within a ${listJoin(fz.map(x => x.replace(' Fire Hazard Severity Zone', '')))} Fire Hazard Severity Zone. The designation and any market-supported effect on marketability or value were considered`, 1));
    else if ((s.fire || []).includes('No Fire Hazard Zone')) out.push(S('Fire Hazard Severity Zone: According to CAL FIRE Fire Hazard Severity Zone mapping, the subject is not located within a Fire Hazard Severity Zone', 1));
    if ((s.fire || []).includes('Brush Clearance Needed')) out.push(S('Brush clearance appears needed to maintain defensible space', 1));
    { const P = ins.data.property.permits; if (P && P.holds.length) out.push(S(`County records show a parcel hold (${P.holds.join('; ')}); clearance may be required prior to marketing`, 1)); }
    const hz = lvl(ins, 'site', 'hazard'); if (hz.length) out.push(S(`Hazard zone: ${listJoin(hz)}${(s.hazard || []).includes('Other') && s.hazardOther ? ' (' + s.hazardOther + ')' : ''}`, 1));
    return out;
  },
  siteInfluence(ins) {
    const s = ins.data.site, out = []; const infl = lvl(ins, 'site', 'influences').filter(x => x !== 'residential');
    if (infl.length) out.push(S(`The site is ${lc(sv(ins, 'site', 'inflProx')) || 'near'} ${listJoin(infl)}, with a ${lc(sv(ins, 'site', 'inflImpact')) || 'neutral'} influence. Market reaction is evaluated within the sales grid`, 1));
    else if ((s.influences || []).includes('Residential')) out.push(S('The site is located in a residential setting with no notable adverse site influences observed', 2));
    if (s.waterPrivate) out.push(S(`The property has private ${lc(sv(ins, 'site', 'water'))} frontage with ${lc(sv(ins, 'site', 'waterRights'))} access${(s.waterFeat || []).length ? ' and ' + listJoin(lvl(ins, 'site', 'waterFeat')) : ''}`, 1));
    const env = lvl(ins, 'site', 'envCond'); if (env.length) out.push(S(`Apparent environmental conditions: ${listJoin(env)}`, 1));
    return out;
  },
  view(ins) {
    const s = ins.data.site; if (isEmpty(s.view)) return [];
    const views = lvl(ins, 'site', 'view'); const prim = s.viewPrimary ? lc(labelFor(F('site', 'view'), s.viewPrimary)) : views[0];
    const others = views.filter(v => v !== prim); const more = lvl(ins, 'site', 'viewMore');
    return [S(`The subject has a ${lc(sv(ins, 'site', 'viewImpact')) || 'neutral'} ${lc(sv(ins, 'site', 'viewRange'))} ${prim} view amenity${others.length ? ', with ' + listJoin(others) + ' views' : ''}${more.length ? '; the view is ' + listJoin(more) : ''}`.replace(/ +/g, ' '), 1),
      S('View analysis considers the type, breadth, orientation, prominence, permanence, obstruction, privacy, and market appeal of the view amenity to the extent supported by available market evidence', 1)];
  },
  disaster(ins) {
    const iv = ins.data.interview, sy = ins.data.systems; const d = lvl(ins, 'interview', 'disaster'); if (!d.length) return [];
    const out = []; const strap = lvl(ins, 'systems', 'whStrap').filter(x => x !== 'not observed');
    if ((iv.disaster || []).some(x => /WaterHeater/i.test(x)) && strap.length) out.push(S(`Water heater is ${listJoin(strap)}`, 1));
    const rest = d.filter(x => !/water heater/.test(x)); if (rest.length) out.push(S(`${cap(listJoin(rest))} noted`, 1));
    out.push(S('Features were not tested; installation/code compliance was not determined', 1));
    return out;
  },
  energy(ins) {
    const s = ins.data.systems, out = [];
    const c = lvl(ins, 'systems', 'certs'), r = lvl(ins, 'systems', 'ratings');
    out.push(S(c.length ? `Known green certifications: ${listJoin(c)}` : 'Formal green certifications unknown', 1));
    if (r.length) out.push(S(`Known efficiency ratings: ${listJoin(r)}`, 2));
    if ((s.renew || []).includes('Solar')) out.push(S(`Solar panels are ${lc(sv(ins, 'systems', 'solarOwn')) || '[owned/leased]'}${s.solarFin === true ? ' and financed' : ''}${s.solarKw ? ', approximately ' + s.solarKw + ' kW' : ''}${s.solarYear ? ', installed ' + s.solarYear + ' per ' + per(ins) : ''}. Contributory value and market reaction are evaluated within the sales grid${s.solarKw || s.solarYear ? '' : '. Size and year installed were not verified'}`, 1));
    const other = lvl(ins, 'systems', 'renew').filter(x => x !== 'solar'); if (other.length) out.push(S(`Other renewable energy: ${listJoin(other)}`, 1));
    const eff = lvl(ins, 'systems', 'eff').map(x => s.battery && x === 'backup battery system' ? x + ' (' + s.battery + ')' : x); if (eff.length) out.push(S(`${cap(listJoin(eff))} noted; efficiency not verified`, 1));
    return out.length > 1 || (s.renew || []).some(x => x !== 'None') ? out : [];
  },
  exterior(ins) {
    const f = ins.data.front, iv = ins.data.interview, out = [];
    if (ins.data.property.hoExt === false) out.push(S('Exterior components are maintained by the association; exterior observations are limited to the portions visible from common areas', 1));
    if (f.roofObs === false) out.push(S('The roof surface was not fully observable; roof condition is based on the portions visible from the ground', 1));
    const rs = lvl(ins, 'front', 'roofStyle'); if (rs.length) out.push(S(`${cap(listJoin(rs))} roof`, 3));
    if (yr4(iv.roofYear)) out.push(S(`Main roof installed or replaced in ${iv.roofYear}, per ${per(ins)}`, 1));
    (ins.lists.roofs2 || []).forEach((r, i) => { const nm = lc(LISTS.roofs2.name(r, i)); out.push(S(`${cap(nm)}: ${r.mat ? lc(r.mat) : 'material not noted'}${yr4(r.year) ? ', installed ' + r.year + (r.src ? ' per ' + lc(r.src) : '') : ''}`, 1)); });
    const ef = lvl(ins, 'front', 'extFeat'); if (ef.length) out.push(S(`Exterior features include ${listJoin(ef)}`, 2));
    const fd = lvl(ins, 'front', 'frontDoor'); if (fd.length) out.push(S(`${cap(listJoin(fd))} front entry door`, 3));
    const xd = lvl(ins, 'interior', 'extDoors'); if (xd.length) out.push(S(`Exterior doors include ${listJoin(xd)}`, 2));
    { const all = lvl(ins, 'front', 'gutterMat').filter(x => !/^none$/i.test(x)); const ex = ['downspouts', 'rain chains', 'underground drains']; const gm = all.filter(x => !ex.includes(String(x).toLowerCase())), g = all.filter(x => ex.includes(String(x).toLowerCase())).map(x => String(x).toLowerCase());
      if (gm.length || g.length) out.push(S(`${gm.length ? cap(listJoin(gm)) + ' gutters' : 'Gutters'}${g.length ? ' with ' + listJoin(g) : ''}`, 3)); }
    if (f.converted) out.push(S(`A converted ${lc(sv(ins, 'front', 'convFrom'))} area is ${lc(sv(ins, 'front', 'convSim'))} to the rest of the living area`, 1));
    if (iv.addDesc) out.push(S(`Reported additions / conversions: ${iv.addDesc}${iv.addPermit === 'Yes' ? ' (reported as permitted)' : iv.addPermit === 'No' ? ' (reported as not permitted)' : ''}`, 1));
    return out;
  },
  interior(ins) {
    const d = ins.data.interior, iv = ins.data.interview, sy = ins.data.systems, out = []; const L2 = ins.lists;
    if (d.ic || d.iq) out.push(S(`${d.ic || ''} condition / ${d.iq || ''} quality`.replace(/^ condition \/ | \/  quality$/g, ''), 1));
    const upd = [];
    if (yr4(iv.kitYear)) upd.push(`kitchen ${iv.kitScope ? lc(iv.kitScope) : 'remodeled'} in ${iv.kitYear}`);
    if (yr4(iv.bathYear)) upd.push(`bathrooms ${iv.bathScope ? lc(iv.bathScope) : 'remodeled'} in ${iv.bathYear}`);
    if (upd.length) out.push(S(`${cap(listJoin(upd))}, per ${per(ins)}`, 1));
    { const pos = lvl(ins, 'interior', 'unitPos'); const fl = RISE(ins) && d.floorNum ? `floor ${d.floorNum}${d.corner ? ' corner unit' : ''}` : ''; if (pos.length || fl) out.push(S(`Unit location: ${listJoin([fl, ...pos].filter(Boolean))}`, 2)); }
    out.push(S('Materials show expected physical utility', 2));
    // descriptive finishes: kitchens, baths, wet bars
    L2.kitchens.forEach((k, i) => { const t = kitchenText(k, LISTS.kitchens.name(k, i)); if (t) out.push(S(t, 1)); });
    L2.baths.forEach((b, i) => { const nm = i === 0 ? 'Primary bath' : LISTS.baths.name(b, i, L2.baths); const t = bathText(b, nm); if (t) out.push(S(t, i === 0 ? 1 : 2)); });
    L2.wetbars.forEach((w, i) => { const p = [mats(w.cab).length ? listJoin(mats(w.cab)) + ' cabinetry' : '', mats(w.counter).length ? listJoin(mats(w.counter)) + ' counter' : '', mats(w.feat).length ? listJoin(mats(w.feat)) : ''].filter(Boolean); out.push(S(`${w.label || 'Wet bar'}${p.length ? ': ' + p.join('; ') : ''}`, 2)); });
    // finishes
    const fin = [];
    const fl = unitList(ins, 'flooring').filter(x => x !== 'None').map(x => lc(labelOf(FLOORING, x))); if (fl.length) fin.push(`${listJoin(fl)} flooring`);
    const ch = lvl(ins, 'interior', 'ceilH'), cs = unitList(ins, 'ceilS').map(x => lc(labelOf(CEIL_S, x))); if (ch.length || cs.length) fin.push(`${listJoin(ch)}${ch.length ? ' ' : ''}${cs.length ? listJoin(cs) + ' ' : ''}ceilings`);
    if (d.fireplaces) fin.push(`${d.fireplaces > 1 ? d.fireplaces + ' fireplaces' : 'fireplace'}${(d.fpType || []).length ? ' (' + listJoin(lvl(ins, 'interior', 'fpType')) + ')' : ''}`);
    const feat = lvl(ins, 'interior', 'intFeat'); if (feat.length) fin.push(listJoin(feat));
    const wc = lvl(ins, 'interior', 'winCover'); if (wc.length) fin.push(`window coverings (${listJoin(wc)})`);
    const dr = lvl(ins, 'interior', 'intDoors'); if (dr.length) fin.push(`${listJoin(dr)} interior doors`);
    if (fin.length) out.push(S(`Finishes: ${fin.join('; ')}`, 2));
    // systems & components
    const sys = [];
    const heat = lvl(ins, 'systems', 'heat'), cool = lvl(ins, 'systems', 'cool');
    const mech = lvl(ins, 'systems', 'mech'); if (mech.length) sys.push(listJoin(mech));
    const wh = lvl(ins, 'systems', 'wh').map(x => x.replace(' – ', ' ')); if (wh.length) sys.push(`${listJoin(wh)} water heating${sy.whRecirc ? ' with recirculation' : ''}`);
    const sm = lvl(ins, 'systems', 'smart'); if (sm.length) sys.push(listJoin(sm));
    const sec = lvl(ins, 'systems', 'security'); if (sec.length) sys.push(listJoin(sec));
    const tech = lvl(ins, 'systems', 'tech'); if (tech.length) sys.push(listJoin(tech));
    if (sys.length) out.push(S(`Systems and components: ${sys.join('; ')}`, 2));
    const ac = lvl(ins, 'interior', 'access'); if (ac.length) out.push(S(`Accessibility features: ${listJoin(ac)}`, 2));
    if (d.co === true || d.smoke === true) out.push(S(`${[d.smoke ? 'Smoke' : '', d.co ? 'carbon monoxide' : ''].filter(Boolean).join(' and ')} detectors observed (not tested)`, 2));
    if (d.atticAcc === true) out.push(S(`Attic: ${lc(sv(ins, 'interior', 'atticAccess'))} access, ${lc(sv(ins, 'interior', 'atticFinish'))}`, 3)); else if (d.attic === true) out.push(S('Attic: no access; not entered', 3));
    { const c = ins.data.property.crs, p = ins.data.property;
      if (c && p.pubCmt !== false) {
        const n = v => v ? Number(v).toLocaleString() : '';
        const part = (src, sq, beds, baths, yr) => { const b = [sq && n(sq) + ' sq. ft.', beds && beds + ' bedrooms', baths && baths + ' baths'].filter(Boolean); if (!b.length && !yr) return ''; return src + ' ' + (b.length ? listJoin(b) + (yr ? ', built in ' + yr : '') : 'a year built of ' + yr); };
        const a = part('Public records show', c.sqftAssessor || c.sqft, c.beds, c.baths, c.yearBuilt), m = part('MLS data shows', c.sqftMls, c.bedsMls, c.bathsMls, c.yearBuiltMls);
        const fb = L2.baths.filter(b => b.kind === 'FullBathroom').length, hb = L2.baths.filter(b => b.kind === 'HalfBathroom').length;
        if (a || m) out.push(S(`${[a, m].filter(Boolean).join('; ')}. Public record and MLS data are often inaccurate and may include other buildings; MLS data may be dated if the property has not been listed recently, and may include ADUs and/or outbuildings. The appraiser therefore relied on ${p.measuredGla ? 'the measured gross living area of ' + n(p.measuredGla) + ' sq. ft.' : 'the appraiser\'s measured gross living area'} and the room count observed at inspection (${L2.bedrooms.length} bedroom${L2.bedrooms.length === 1 ? '' : 's'}, ${fb} full${hb ? ' and ' + hb + ' half' : ''} bath${fb + hb === 1 ? '' : 's'})`, 1));
      } }
    return out;
  },
  adu(ins) {
    return ins.lists.adus.flatMap((a, i) => {
      const name = LISTS.adus.name(a, i); const out = [];
      out.push(S(`${name} is ${a.loc === 'Dwelling' ? 'located within the main dwelling' : a.loc === 'Garage' ? 'located above or within the detached garage' : 'a standalone structure'} with ${a.beds || 0} bedroom${a.beds === 1 ? '' : 's'}, ${a.fullBaths || 0} full bath${a.fullBaths === 1 ? '' : 's'}${a.halfBaths ? ', ' + a.halfBaths + ' half bath' : ''}${a.kitchen && a.kitchen !== 'None' ? ' and a ' + lc(a.kitchen) : ''}`, 1));
      const p = [['ADU', a.permitted], ['kitchen', a.permKitchen], ['bath', a.permBath], ['sleeping area', a.permSleep]].filter(x => x[1]);
      if (p.length) out.push(S(`Permit status per ${per(ins)}: ${p.map(x => x[0] + ' ' + (x[1] === 'Yes' ? 'permitted' : x[1] === 'No' ? 'not permitted' : lc(x[1]))).join('; ')}`, 1));
      const f = (a.features || []).map(lc); if (f.length) out.push(S(`Features include ${listJoin(f)}`, 2));
      if (a.note) out.push(S(a.note, 1));
      return out;
    });
  },
  outbuilding(ins) {
    return ins.lists.outbuildings.map((o, i) => {
      const f = (o.feat || []).map(lc);
      let t = `${LISTS.outbuildings.name(o, i)}: ${lc(o.type || 'outbuilding')}${f.length ? ' with ' + listJoin(f) : ''}${o.real === false ? ', not considered real property' : ''}`;
      if (o.living) t += `; living quarters with ${o.beds || 0} bedroom(s), ${o.fullBaths || 0} full bath(s), kitchen: ${lc(o.kitchen || 'none')}`;
      if (o.permitted) t += `. ${o.permitted === 'Yes' ? 'Permitted' : o.permitted === 'No' ? 'Not permitted' : 'Permit status unknown'}, per ${per(ins)}`;
      return S(t, 1);
    });
  },
  functional(ins) {
    const d = ins.data.condition; const f = (d.func || []).filter(x => x !== 'None');
    if ((d.func || []).includes('None')) return [S('No functional obsolescence was observed', 1)];
    if (!f.length) return [];
    const out = [];
    if (f.includes('Overimprovement')) out.push(S('Dwelling represents a functional superadequacy in square footage/room count. Diminishing return is adjusted in the grid', 1));
    const rest = f.filter(x => x !== 'Overimprovement').map(x => lc(labelFor(F('condition', 'func'), x)));
    if (rest.length) out.push(S(`Functional issues: ${listJoin(rest)}${d.cure ? ' (' + lc(d.cure) + ')' : ''}. Market reaction is evaluated within the sales grid`, 1));
    return out;
  },
  vehicle(ins) {
    const g = ins.data.garage, d = ins.data.driveway, out = [];
    if (g.garShared === true) out.push(S('The unit has the use of a shared (common) parking garage', 1));
    if (g.hasGarage && g.garShared !== true) {
      const att = lc(sv(ins, 'garage', 'garAttach')); const tandem = g.garTandemYN && g.garTandem;
      out.push(S(`Property features a${/^[aeiou]/.test(att) ? 'n' : ''} ${att} ${g.garSpaces || '[ ]'}-car garage${tandem ? ' with ' + (g.garTandem > 1 ? g.garTandem + ' tandem bays' : 'one tandem bay') : ''}. ${tandem ? 'Reduced tandem utility is adjusted via the grid' : 'Structural utility is standard; evaluated in the grid'}`, 1));
      if (g.garConverted) out.push(S(`The garage has been converted (${lc(g.garConvPermit || 'permit status unknown')})`, 1));
      const feat = lvl(ins, 'garage', 'garFeat').filter(x => !/^ev charger$/i.test(x)); if (feat.length || g.garFinish) out.push(S(`${feat.length ? 'Garage features include ' + listJoin(feat) : 'Garage'}${g.garFinish ? (feat.length ? '; ' : ' is ') + lc(g.garFinish) : ''}`, 2));
    } else if (g.hasGarage === false && g.garShared !== true && !(IS_HOA(ins) && ((g.pgSpaces || 0) + (g.ccSpaces || 0) + (g.olSpaces || 0)) > 0)) out.push(S('There is no garage', 1));
    if (g.carport) out.push(S(`${g.carport}-car carport`, 2));
    if (IS_HOA(ins)) [['pgSpaces', 'pgAssign', 'parking garage'], ['ccSpaces', 'ccAssign', 'common carport'], ['olSpaces', 'olAssign', 'open lot']].forEach(([n, a, t]) => { if ((g[n] || 0) > 0) out.push(S(`${g[n]} ${g[a] ? lc(g[a]) + ' ' : ''}${t} space${g[n] > 1 ? 's' : ''}${g.spaceIds ? ' (' + g.spaceIds + ')' : ''}`, 1)); });
    const op = lvl(ins, 'garage', 'otherPark'); if (op.length) out.push(S(`Other parking: ${listJoin(op)}`, 3));
    return out;
  },
  amenities(ins) {
    const a = ins.data.amenities, out = []; const items = [];
    ins.lists.outdoorLiving.forEach(o => { const m = lc(lv('outdoorLiving', o, 'material')); items.push(`${m ? m + ' ' : ''}${lc(lv('outdoorLiving', o, 'type'))}${(o.feat || []).length ? ' (' + listJoin((o.feat || []).map(lc)) + ')' : ''}`); });
    const pp = [];
    ins.lists.waterFeatures.forEach(w => { const nm = lc(lv('waterFeatures', w, 'type')); if (/^above-ground/.test(nm)) { pp.push(nm); return; } items.push(`${nm}${(w.feat || []).length ? ' (' + listJoin((w.feat || []).map(lc)) + ')' : ''}`); });
    items.push(...lvl(ins, 'amenities', 'outdoor'), ...lvl(ins, 'amenities', 'rec'));
    if (a.equestrian) items.push(`equestrian improvements${lvl(ins, 'amenities', 'equine').length ? ' (' + listJoin(lvl(ins, 'amenities', 'equine')) + ')' : ''}`);
    if (items.length) {
      out.push(S(`Site and structural improvements include ${listJoin(items)}`, 1));
      out.push(S("These permanent fixtures and amenities expand the property's overall site utility; the aggregate contributory market reaction to these improvements is documented and adjusted within the sales grid", 1));
    }
    if (pp.length) out.push(S(`The ${listJoin(pp)} ${pp.length > 1 ? 'are' : 'is'} considered personal property and ${pp.length > 1 ? 'were' : 'was'} given no contributory value`, 1));
    return out;
  },
  assignment(ins) {
    const out = []; const list = ins.lists.eas || [];
    const W = (it) => { const d = it.detail ? it.detail.trim() : ''; const hc = it.type === 'HC';
      const lead = hc ? 'This appraisal is based on the hypothetical condition that' : 'It is an extraordinary assumption of this appraisal that';
      switch (it.topic) {
        case 'Permits': return `${lead} ${d || 'all improvements'} ${hc ? 'were' : 'was'} completed with all required permits and final inspections. Should this not be the case, the opinion of value may be affected`;
        case 'Measurements / floor plan': return `${lead} the living area estimated by the appraiser is reasonably accurate${d ? '; ' + d + ' could not be fully measured and was estimated from the appraiser\'s sketch' : ''}. A material difference in actual size may affect the opinion of value`;
        case 'Defect / condition': return `${lead} ${d || 'the noted condition'} does not affect the soundness or structural integrity of the improvements. Inspection by a qualified professional is recommended; findings to the contrary may affect the opinion of value`;
        case 'Lot lines / boundaries': return `${lead} the improvements are located within the legal boundaries of the site as shown on the assessor's parcel map${d ? ', including ' + d : ''}. No survey was provided`;
        case 'Easement / encroachment': return `${lead} there are no adverse easements, encroachments or restrictions other than those noted${d ? ' (' + d + ')' : ''}. A title report or survey may reveal otherwise`;
        case 'Proposed construction / plans': return `${lead} the proposed improvements${d ? ' (' + d + ')' : ''} ${hc ? 'have been' : 'will be'} completed in a workmanlike manner per the plans and specifications provided`;
        case 'Repairs to be completed': return `${lead} ${d || 'the noted repairs'} ${hc ? 'have been' : 'will be'} completed in a workmanlike manner`;
        case 'Project / HOA data': return `${lead} the project information provided${d ? ' by ' + d : ''} is accurate`;
        case 'Well / septic / private utilities': return `${lead} ${d || 'the private water and wastewater systems'} ${/s$/.test(d || 'systems') ? 'are' : 'is'} functional and adequate for the intended use. No testing was performed`;
        case 'Areas not observed': return `${lead} ${d || 'the areas not observed'} ${/s$/.test(d || 'areas') ? 'are' : 'is'} in condition similar to the areas observed`;
        case 'Year built / age': return `${lead} the ${d || 'reported year built and effective age'} ${/s$/.test(d) ? 'are' : 'is'} accurate`;
        default: return d ? `${lead} ${d}` : '';
      } };
    list.forEach(it => { const t = (it.custom || '').trim() || W(it); if (t) out.push(S(t, 1)); });
    if (out.length) {
      const hasEA = list.some(x => x.type !== 'HC'), hasHC = list.some(x => x.type === 'HC');
      const n = list.length, many = n > 1;
      const what = hasEA && hasHC ? 'these extraordinary assumptions and hypothetical conditions' : hasHC ? (many ? 'these hypothetical conditions' : 'this hypothetical condition') : (many ? 'these extraordinary assumptions' : 'this extraordinary assumption');
      out.push(S(`The use of ${what} might have affected the assignment results`, 1));
    }
    return out;
  },
  project(ins) {
    if (!IS_HOA(ins)) return [];
    const P0 = ins.data.property, J = ins.data.project, g = ins.data.garage, out = [];
    if (J.projCmt) { out.push(S(J.projCmt, 1)); return out; }
    const kind = IS_COOP(ins) ? 'cooperative' : IS_PROJ(ins) ? 'condominium' : 'planned unit development';
    const des = P0.attach === 'Attached' && P0.structDesign ? lc(labelOf(F('property', 'structDesign').o, P0.structDesign)).replace(/ \(.*\)/, '') + ' ' : '';
    const unitDesc = [RISE(ins) && ins.data.interior.floorNum ? `floor ${ins.data.interior.floorNum}` : '', RISE(ins) && ins.data.interior.corner ? 'corner' : ''].filter(Boolean).join(' ');
    out.push(S(`The subject is ${unitDesc ? 'a ' + unitDesc + ' unit' : 'located'} in ${J.projName ? J.projName + ', a' : 'a'} ${des}${kind}${P0.condotel ? ' operated with a hotel-style rental program (condotel)' : ''}`, 1));
    const am = (J.projAmen || []).filter(x => x !== 'None').map(x => x === 'Other' ? (J.projAmenOther || 'other amenities') : x.startsWith('Other:') ? x.slice(6) : labelOf(PROJ_AMEN, x)).map(lc);
    if (am.length) out.push(S(`Common elements include ${listJoin([...new Set(am)])}`, 2));
    { const AG = ins.data.site.ageRestr !== undefined ? ins.data.site : J; if (AG.ageRestr === true) out.push(S(`The project is age restricted${AG.ageDesc ? ' (' + (AG.ageDesc.charAt(0).toLowerCase() + AG.ageDesc.slice(1)).replace(/\.$/, '') + ')' : ''}`, 1)); }
    if (J.clubReq === true) out.push(S(`Ownership requires ${J.clubName ? 'membership in ' + J.clubName : 'a club membership'}${J.clubInit ? ', with an initiation fee of $' + Number(J.clubInit).toLocaleString() : ''}${J.clubDues ? (J.clubInit ? ' and' : ',') + ' club dues of $' + Number(J.clubDues).toLocaleString() + ' per month' : ''}, in addition to the association dues`, 1));
    if (J.groundRent === true) out.push(S(`The project is on leased land${J.grMonthly ? ' with a land lease payment of $' + Number(J.grMonthly).toLocaleString() + ' per month' : ''}${J.grExp ? ', expiring ' + String(J.grExp).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1') : ''}, in addition to the association dues`, 1));
    const cond = { 'Well Kept': 'Common elements appear adequately maintained', 'Typical Wear and Tear': 'Common elements show typical wear and tear', 'Deferred Maintenance': 'Common elements show deferred maintenance', 'Under Renovation': 'Common elements are under renovation' }[J.projCond];
    if (cond) out.push(S(cond, 2));
    if (J.dues !== undefined) { const ut = (J.duesUtil || []).filter(x => x !== 'None').flatMap(x => x === 'Other' ? ([...(J.duesUtilOtherPick || []), J.duesUtilOther].filter(Boolean).map(lc).length ? [...(J.duesUtilOtherPick || []), J.duesUtilOther].filter(Boolean).map(lc) : ['other']) : [x === 'SanitarySewer' ? 'sewer' : lc(x)]); const inc = [...ut, ...(J.duesIncl || []).map(lc)];
      out.push(S(`Association dues are reported by the owner at $${Number(J.dues).toLocaleString('en-US', Number(J.dues) % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {})}${' ' + (J.duesFreq || 'Monthly').toLowerCase()}${inc.length ? ' and include ' + listJoin(inc) : ''}`, 1)); }
    if (P0.hoExt === false) out.push(S('Exterior maintenance is the responsibility of the association', 2));
    const park = [['pgSpaces', 'pgAssign', 'parking garage'], ['ccSpaces', 'ccAssign', 'common carport'], ['olSpaces', 'olAssign', 'open lot']].filter(([n]) => (g[n] || 0) > 0).map(([n, a, t]) => `${g[n]} ${g[a] ? lc(g[a]) + ' ' : ''}${t} space${g[n] > 1 ? 's' : ''}`);
    if (park.length) out.push(S(`Parking: ${listJoin(park)}`, 2));
    if (J.projDef === false) out.push(S('No project deficiencies were observed in the common areas viewed', 2));
    return out;
  },
  qc(ins) {
    const c = ins.data.condition, iv = ins.data.interview, out = [];
    const cn = parseInt(String(c.oc || '').replace(/\D/g, ''), 10);
    if (cn <= 2) out.push(S('All major building components are recently renovated. Construction materials show minimal wear', 1));
    else if (cn === 3) out.push(S('Major building components have been updated and reflect typical wear and tear', 1));
    else if (cn === 4) out.push(S('Finishes exhibit deferred modernization and typical wear, remaining functional for current housing use', 1));
    else if (cn >= 5) out.push(S('Physical components show deferred maintenance and structural wear. Specific cost to cure is noted in tables', 1));
    [['kitchen', iv.kitYear, iv.kitScope], ['bathrooms', iv.bathYear, iv.bathScope]].forEach(([n, y, sc]) => {
      const verb = n === 'kitchen' ? 'was' : 'were';
      if (yr4(y)) out.push(S(`The ${n} ${verb} ${sc ? lc(sc) : 'remodeled'} in ${y}, per ${per(ins)}`, 1));
      else if (/^Before/.test(y || '')) out.push(S(`The ${n} ${verb} ${sc ? lc(sc) : 'remodeled'} ${lc(y)}, per ${per(ins)}`, 2));
      else if (y === 'Original') out.push(S(`The ${n} ${verb} reported as original`, 2));
    });
    if (yr4(iv.roofYear)) out.push(S(`The roof was installed or replaced in ${iv.roofYear}, per ${per(ins)}`, 2));
    if ((iv.recent15 || []).length) out.push(S(`Replaced or remodeled within the last 15 years, per ${per(ins)}: ${listJoin(iv.recent15)}`, 2));
    if (iv.addDesc) out.push(S(`Reported additions / conversions: ${iv.addDesc}${iv.addPermit === 'Yes' ? ' (reported as permitted)' : iv.addPermit === 'No' ? ' (reported as not permitted)' : iv.addPermit === 'Unknown' ? ' (permit status unknown)' : ''}`, 1));
    if (iv.addPermit === 'No' && iv.additions) out.push(S(`Unpermitted additions: ${iv.additions}`, 2));
    if (iv.repairs) out.push(S(`Reported repairs: ${iv.repairs}`, 2));
    if (out.length) out.push(S('Mechanical systems were not tested', 1));
    return out;
  },
};

/* Build the final text for a comment target within its limit */
function buildComment(ins, target) {
  if (ins.finals[target.id] !== undefined && ins.finals[target.id] !== null) {
    const t = ins.finals[target.id]; return { text: t, dropped: [], edited: true, over: t.length > target.lim };
  }
  const gen = (GEN[target.id] ? GEN[target.id](ins) : []).concat(typeof cwGen === 'function' ? cwGen(ins, target.id) : []).filter(Boolean).filter(x => x.t && x.t !== '.');
  const user = (ins.comments[target.id] || '').trim();
  let keep = gen.map((g, i) => ({ ...g, i }));
  const join = arr => [arr.map(x => x.t).join(' '), user].filter(Boolean).join(' ');
  const dropped = [];
  while (join(keep).length > target.lim && keep.length) {
    let worst = keep.reduce((a, b) => (b.p > a.p || (b.p === a.p && b.i > a.i)) ? b : a);
    dropped.push(worst.t); keep = keep.filter(x => x !== worst);
  }
  let text = join(keep);
  const over = text.length > target.lim;
  return { text, dropped, edited: false, over };
}

/* Kitchen / bath quality comment (10.040), in the appraiser's style */
function roomQualityComment(listKey, it) {
  const parts = [];
  const cabTier = c => (c || []).includes('Custom Built') ? 'upgraded custom' : (c || []).includes('Semi-Custom') ? 'semi-custom' : (c || []).length ? 'standard' : '';
  if (listKey === 'kitchens') {
    const ct = cabTier(it.cab); if (ct) parts.push(ct + ' cabinetry');
    const br = brandList(it); const lux = br.filter(b => LUX.includes(b));
    if (br.length) parts.push(`${lux.length ? 'built-in luxury' : 'brand-name'} appliances (${(lux.length ? lux : br).slice(0, 3).join('/')})`);
    const ctr = mats(it.counter); if (ctr.length) parts.push(listJoin(ctr) + ' counters' + ((it.amen || []).includes('Waterfall Counter Edge') ? ' with waterfall edge' : ''));
    if (it.islands) parts.push(`${it.islands > 1 ? it.islands + ' islands' : 'an island'}${it.islandSeat ? ' with bar seating' : ''}`);
  } else {
    const ct = cabTier(it.vanMat); if (ct) parts.push(ct + ' cabinetry');
    const ctr = mats(it.counter); if (ctr.length) parts.push(listJoin(ctr) + ' counters');
    if (it.shower) parts.push(`${listJoin(mats(it.showerMat)) || 'tile'} shower${(it.feat || []).includes('Frameless Glass') ? ' with frameless glass' : ''}`);
    if (it.tubFree) parts.push('freestanding tub'); if (it.tubShower) parts.push('tub/shower');
    parts.push(...mats(it.feat).filter(x => x !== 'frameless glass').slice(0, 2));
  }
  const p = parts.filter(Boolean); let t = cap(listJoin(p)); if (t) t += '.';
  while (t.length > 110 && p.length > 1) { p.pop(); t = cap(listJoin(p)) + '.'; }
  return t;
}
