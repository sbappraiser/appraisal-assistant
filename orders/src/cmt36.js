/* =====================================================================
   UAD 3.6 starter comments (her ask Oct 22 2026). Written for the 3.6 comment boxes – field by field, short, and only what the
   fields cannot show (Fannie Mae's D-1 samples run 1–4 sentences per box). Built from her OneNote 2.6 library (ANSI and laser
   measuring, observation limits, data sources, ownership rights, wells and agricultural meters, fire hazard and insurance,
   exposure time, adjustment percentages, legal nonconforming) and her test reports, re-cut for the 3.6 boxes and their limits.
   Left out on purpose (her work): manufactured homes, 2–4 units, co-ops, high-rise condos, ground leases, hybrid assignments,
   lava zones, hurricanes, cesspools.
   [brackets] = fill in from her inspection notes, the order or the documents; delete what does not apply.
   Each: [section (the box it belongs to – matches the box's My comments filter), title, F-1 field, box limit, text]
   ===================================================================== */
const CMT36 = [
  /* ---- Assignment Information and Scope of Work commentary (F-1 2.061, 5,000) ---- */
  ['Assignment information and scope of work', 'Interior and exterior observation', '2.061', 5000, 'The appraiser observed the interior and exterior of the subject on [date]. The observation was limited to readily accessible areas and was not a home inspection; no testing or dismantling was performed.'],
  ['Assignment information and scope of work', 'Areas not observed', '2.061', 5000, 'The [attic / crawlspace / roof surface / locked rooms] could not be observed because [access was unavailable / it was unsafe / the occupant restricted access]. No opinion is given on the condition of those areas.'],
  ['Assignment information and scope of work', 'Observation limited by personal property', '2.061', 5000, 'Personal property limited observation of [floors / walls / the garage]. Personal property was not moved; components concealed by it could not be observed.'],
  ['Assignment information and scope of work', 'Owner or occupant interview', '2.061', 5000, 'The [owner / occupant / listing agent] was present and reported [the dates of recent work / permit history / known issues]. This information was considered with the public records and the appraiser’s observations.'],
  ['Assignment information and scope of work', 'Specialist report reviewed', '2.061', 5000, 'A [home inspection / structural engineer / roof] report dated [date] was provided and considered. The appraiser relied on it only as discussed in this report and gives no independent technical opinion.'],
  ['Assignment information and scope of work', 'Permit research', '2.061', 5000, 'Permit records from the [City of Santa Barbara / County of Santa Barbara / City of Goleta] were reviewed with the [owner / agent]. The [addition / ADU / garage conversion] is [shown / not shown] in the permits reviewed.'],
  ['Assignment information and scope of work', 'Data sources and verification', '2.061', 5000, 'Data sources include SBMLS, CRS Data, CORT recorded sales, county permit and assessor records and the appraiser’s files. Comparable sales were verified with [agents / parties / recorded documents] where reasonably available.'],
  ['Assignment information and scope of work', 'Conflicting information', '2.061', 5000, 'Public records, the MLS and the [owner / agent] did not agree on [the living area / bedroom count / year built]. The appraiser relied on [the measurements taken at the inspection / the permits] as the most credible source.'],
  ['Assignment information and scope of work', 'Disaster declaration – no damage observed', '2.061', 5000, 'Santa Barbara County is included in [FEMA declaration DR-____-CA, date]. No storm or disaster damage was observed to the subject or its immediate market area, and no effect on marketability was indicated.'],
  ['Assignment information and scope of work', 'Appraisal Institute statement', '2.061', 5000, 'This report was developed and prepared in accordance with the Code of Professional Ethics and Standards of Professional Practice of the Appraisal Institute.'],

  /* ---- Additional scope of work, extraordinary assumptions, hypothetical conditions (F-1 29.003 – the three share 2,500) ---- */
  ['Scope of work – additional', 'Additional research', '29.003', 2500, 'Beyond the standard scope, the appraiser reviewed [the permit file / the preliminary title report / the CC&Rs / the well report] for this assignment.'],
  ['Scope of work – additional', 'Rent survey included', '29.003', 2500, 'At the client’s request, a rent schedule was developed using comparable rentals from the subject’s market area.'],
  ['Extraordinary assumptions', 'Permits', '29.003', 2500, 'It is assumed that the [addition / ADU / garage conversion] was built with the required permits and final approvals. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Area not observed', '29.003', 2500, 'It is assumed that the [attic / crawlspace / roof] that could not be observed is in condition consistent with the observed improvements. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Personal property concealing components', '29.003', 2500, 'It is assumed that the components concealed by personal property are consistent with the observable portions of the improvements. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Well or water supply', '29.003', 2500, 'It is assumed that the private well is legally permitted, operational and adequate in quantity and quality for the existing use. No well report was provided. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Agricultural water meter', '29.003', 2500, 'It is assumed that the agricultural water meter is legally established, transferable with the property and available for the reported use. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Ownership rights uncertain', '29.003', 2500, 'Information indicates the [mineral / water / other] rights may have been [severed / leased]. It is assumed that [all rights are included / the identified right is excluded] as stated in this report. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Access or maintenance responsibility', '29.003', 2500, 'No recorded [road maintenance / shared driveway] agreement was provided. It is assumed that legal access exists and maintenance is shared as is typical in the area. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Insurability in a fire hazard zone', '29.003', 2500, 'It is assumed that property insurance, including wildfire coverage, is available at a cost generally consistent with competing properties. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Lot line or boundary', '29.003', 2500, 'No survey was provided. It is assumed that the improvements are within the property lines and that no encroachments exist other than those noted. If this is found to be false, the assignment results could be affected.'],
  ['Extraordinary assumptions', 'Measurements where access was limited', '29.003', 2500, 'Where exterior walls could not be measured, interior measurements and wall-thickness estimates were used. It is assumed the reported areas are materially accurate. If this is found to be false, the assignment results could be affected.'],
  ['Hypothetical conditions', 'Proposed construction', '29.003', 2500, 'The value is based on the hypothetical condition that the improvements have been completed as of the effective date per the plans and specifications dated [date].'],
  ['Hypothetical conditions', 'Repairs completed', '29.003', 2500, 'The value is based on the hypothetical condition that the [repairs] described in this report have been completed in a workmanlike manner as of the effective date.'],

  /* ---- Subject: ownership rights ---- */
  ['Rights not appraised', 'Mineral rights excluded', '3.030', 540, 'Per the [preliminary title report / deed] dated [date], the mineral rights are reserved to [party]. They are not included in the value. [No effect on marketability was indicated.]'],
  ['Rights not appraised', 'Mineral rights leased', '3.030', 540, 'Per the [lease / title report] dated [date], the mineral rights are leased to [party]. The appraiser did not determine the legal effect of the lease. [No surface activity was observed.]'],

  /* ---- Prior services (F-1 29.051, 1,250) ---- */
  ['Prior services', 'Prior appraisal of the subject', '29.051', 1250, 'I appraised the subject for [client] with an effective date of [date]. No other services were performed regarding the subject in the three years before accepting this assignment.'],

  /* ---- Site (F-1 4.066 site commentary, 2,500 · 4.030 site influences · 4.049 hazard, 140) ---- */
  ['Site', 'Usable lot area', '4.066', 2500, 'The site is [level / gently sloping] with about [0.00] acres of usable area; the balance is [steep hillside / creek setback / easement] that adds little utility.'],
  ['Site', 'Typical for the market', '4.066', 2500, 'The site size, shape and utility are typical for the subject’s market area. No adverse site conditions were observed.'],
  ['Site', 'Public water with well for irrigation', '4.066', 2500, 'Public water serves the dwelling; a private well reportedly supplies irrigation. The well was not tested and no well report was provided. A functioning well is recognized as an amenity in this market.'],
  ['Site', 'Private well only', '4.066', 2500, 'Water is supplied by a private well, typical for the area. The well was not tested and no production or water-quality report was provided.'],
  ['Site', 'Agricultural water meter', '4.066', 2500, 'The site has an agricultural water meter used for [orchard / landscape irrigation]. The meter allocation and transferability were not verified.'],
  ['Site', 'Septic system', '4.066', 2500, 'The dwelling is served by a private septic system, typical for the area. The system was not inspected. [The owner reported it was pumped in [year].]'],
  ['Site', 'Shared driveway or private road', '4.066', 2500, 'Access is by a [shared driveway / private road]. [A recorded maintenance agreement was / No recorded maintenance agreement was] provided. Private access is common in this area and was not found to affect marketability.'],
  ['Site', 'Fire hazard severity zone', '4.049', 140, 'In a Cal Fire Very High Fire Hazard Severity Zone, as are most competing homes; no separate market effect was measured.'],
  ['Site', 'Flood zone', '4.049', 140, 'In FEMA Zone [AE]. Flood insurance is required; similar competing homes are in the zone and no separate effect was measured.'],
  ['Site', 'Coastal zone', '4.066', 2500, 'The subject is in the Coastal Zone; additions and new construction require a Coastal Development Permit. This is typical for competing properties.'],
  ['Site', 'Legal nonconforming site size', '4.066', 2500, 'The [2-E-1] zoning requires [2 acres] for new parcels; the subject’s [1.20 acres] is legal nonconforming as to size. Similar parcels are common nearby and no adverse effect on marketability was found.'],
  ['Site', 'Busy road', '4.030', 2500, 'The subject fronts [street], a busy collector with traffic noise. Comparables on similar streets were used and the location adjustment is supported in the grid.'],
  ['Site', 'Easement', '4.066', 2500, 'A [utility / drainage] easement runs along the [rear] lot line. It is typical and does not affect the use of the site.'],

  /* ---- Improvements: subject property commentary and quality / condition (F-1 15.010 required, 5,000) ---- */
  ['Quality and condition', 'Ratings reconciled – updated home', '15.010', 5000, 'The overall [Q4] quality and [C3] condition reflect the [2018] kitchen and bath remodel and well-maintained exterior; the original windows and roof are near the end of their typical life.'],
  ['Quality and condition', 'Ratings reconciled – original condition', '15.010', 5000, 'The overall [C4] condition reflects a well-maintained home with largely original kitchen and baths and normal wear for its age.'],
  ['Quality and condition', 'Ratings reconciled – interior and exterior differ', '15.010', 5000, 'The exterior was recently [painted and re-roofed]; the overall condition was reconciled to [C4] given the dated interior.'],
  ['Quality and condition', 'Custom quality', '15.010', 5000, 'The [Q2] quality reflects custom design and high-quality materials throughout, including [stone exterior, custom millwork, imported tile].'],
  ['Subject property', 'Recent work per owner', '10.061', 5000, 'Per the owner, the [kitchen] was remodeled in [year] and the [baths] in [year]. Work observed is consistent with that timing.'],
  ['Subject property', 'Unpermitted area', '10.061', 5000, 'The [garage conversion] is not shown in the permits reviewed. It is not included in the living area and was given [no / limited] contributory value.'],
  ['Subject property', 'ADU', '10.061', 5000, 'The detached ADU was [permitted in [year]] and has its own kitchen and bath. ADUs are common in this market and are recognized by buyers.'],
  ['Subject property', 'Deferred maintenance – no repair required', '10.061', 5000, 'Minor deferred maintenance was observed ([peeling paint, worn carpet]). It does not affect safety, soundness or structural integrity and is reflected in the condition rating.'],
  ['Subject property', 'Leased solar', '6.015', 2500, 'The solar panels are leased and are not real property. The lease is transferable; no measurable effect on value or marketability was indicated.'],
  ['Subject property', 'Owned solar', '6.015', 2500, 'The solar system is owned, installed in [year]. Owned solar contributes value in this market as shown in the grid.'],
  ['Subject property', 'Functional obsolescence – none', '11.001', 5000, 'No functional obsolescence was observed. The floor plan and room sizes are typical for the market.'],
  ['Subject property', 'Functional obsolescence – floor plan', '11.001', 5000, 'The [only full bath is reached through a bedroom]. This limits utility and is reflected in the functional utility adjustment.'],
  ['Subject property', 'Vehicle storage – tandem or shared', '13.010', 5000, 'The [two-car garage is tandem / driveway is shared with the neighbor]. This is common in the area and was considered in the grid.'],
  ['Subject property', 'Amenities', '14.011', 5000, 'The [pool and spa] are typical for homes in this price range. Differences are addressed in the sales comparison grid.'],
  ['Subject property', 'Sketch and measurement (ANSI)', '7.003', 5000, 'Areas were measured with a laser and classified per ANSI Z765-2021. Where exterior walls were obstructed, interior measurements with wall-thickness estimates were used.'],
  ['Subject property', 'Sketch – LiDAR', '7.003', 5000, 'The floor plan was developed with a LiDAR scan and checked with laser measurements; areas are classified per ANSI Z765-2021.'],
  ['Subject property', 'Sketch – prior measurements', '7.003', 5000, 'The appraiser measured the subject previously; the measurements were verified at this inspection.'],

  /* ---- Contract and subject history ---- */
  ['Prior sales and transfers – subject', 'No transfers in three years', '21.008', 5000, 'According to CRS Data and the county records, there were no sales or transfers of the subject in the three years before the effective date.'],
  ['Prior sales and transfers – subject', 'Prior sale and changes since', '21.008', 5000, 'The subject sold on [date] for [$]. Since then, [the kitchen and baths were remodeled], which supports the difference in price along with market change.'],
  ['Prior sales and transfers – subject', 'Transfer without consideration', '21.008', 5000, 'The [date] transfer was [an interspousal / trust] transfer with no consideration and does not indicate market value.'],
  ['Prior sales and transfers – comparables', 'No prior transfers', '21.010', 5000, 'According to CRS Data, the comparable sales did not transfer in the 12 months before their sale dates, other than the sales reported in this appraisal.'],
  ['Prior sales and transfers – comparables', 'Resale after a flip', '21.010', 5000, 'Comp [n] sold on [date] for [$] and was remodeled before the current sale; the increase reflects the work and market change.'],
  ['Sales contract', 'Contract reviewed – typical', '20.011', 5000, 'The fully executed contract dated [date] was reviewed. No atypical terms, concessions or personal property were noted.'],
  ['Sales contract', 'Seller credit', '20.011', 5000, 'The contract includes a [$] seller credit toward [closing costs / repairs], typical for the market; no adjustment was warranted.'],
  ['Sales contract', 'Personal property included', '20.011', 5000, 'The [furniture / hot tub] conveys with the sale and was given no value in the analysis.'],
  ['Subject listing', 'Listing history', '19.011', 5000, 'The subject was listed on [date] for [$], reduced to [$] on [date], and went under contract on [date] after [n] days on market, typical for the area.'],

  /* ---- Highest and best use (F-1 16.005) ---- */
  ['Highest and best use', 'Present use', '16.005', 5000, 'The present single-family use is legally permitted, physically possible, financially feasible and maximally productive, and is the highest and best use as improved.'],
  ['Highest and best use', 'Present use – legal nonconforming', '16.005', 5000, 'The present use is legal nonconforming and could be rebuilt if destroyed per the [zoning code]; it remains the highest and best use as improved.'],

  /* ---- Market (F-1 17.003 boundary, 17.004 search criteria, 17.019 price trends, 17.024 market commentary) ---- */
  ['Market area boundary', 'Boundary by streets', '17.003', 1250, 'North: [street]; East: [street]; South: [street]; West: [street].'],
  ['Search criteria', 'Search criteria', '17.004', 1250, 'Detached homes in the market area, [1,500–2,300] sq ft, [3–5] bedrooms, sold or listed in the [12] months before the effective date.'],
  ['Price trends', 'Stable market', '17.019', 2500, 'Median prices and price per square foot in the search were stable over the [12]-month look-back. No time adjustment was warranted.'],
  ['Price trends', 'Rising market', '17.019', 2500, 'Paired and median price analysis indicates prices increased about [3%] per year; a time adjustment of [0.25%] per month was applied.'],
  ['Market', 'High-value segment', '17.024', 5000, 'In the [Montecito / Hope Ranch] segment, sales are few and properties vary widely, so broader statistics were used only as a reasonableness check.'],
  ['Market', 'Low inventory', '17.024', 5000, 'Inventory remains low with about [2] months of supply; well-priced homes typically sell within [30] days.'],

  /* ---- Sales comparison (F-1 22.16.01, 10,000) ---- */
  ['Sales comparison', 'Comps bracket the subject', '22.16.01', 10000, 'The comparables are the best available and bracket the subject in [size, age and site]. Comp [n] is given most weight as the most similar in [location and condition].'],
  ['Sales comparison', 'Large adjustments – limited comparables', '22.16.01', 10000, 'Because few similar sales exist, some adjustments exceed common review guidelines. These guidelines are not limits; each comparable was kept for its relevance to the subject.'],
  ['Sales comparison', 'Time adjustments', '22.16.01', 10000, 'Time adjustments of [%] were applied to sales before [date], supported by paired sales in the segment and checked against market statistics.'],
  ['Sales comparison', 'Listing and pending included', '22.16.01', 10000, 'Comp [n] is a current listing included to show the direction of the market; it is given least weight.'],
  ['Sales comparison', 'Usable lot area adjustment', '22.16.01', 10000, 'Usable lot area was adjusted separately from total site size because buyers in this market pay for level, usable land rather than total acreage.'],

  /* ---- Cost (F-1 4.115 site value, 2,500 · 25.057, 5,000 · 8.021 effective age, 2,500) ---- */
  ['Site value', 'Allocation', '4.115', 2500, 'No competitive vacant land sales were found; the site value was estimated by allocation at about [%] of total value, supported by extraction from recent sales.'],
  ['Cost approach', 'Local contractor budgets', '25.057', 5000, 'Costs are from local contractor budgets for similar-quality homes, indexed to the effective date. Depreciation is by the age-life method.'],
  ['Cost approach', 'Effective age', '8.021', 2500, 'The effective age of [15] years reflects the [2015] remodel of the kitchen and baths with original windows and roof.'],

  /* ---- Income (F-1 23.04.01, 24.025) ---- */
  ['Income approach', 'Rental analysis', '23.04.01', 5000, 'Comparable rentals from the subject’s market area indicate market rent of [$]; most weight to rentals [1 and 2] as most similar.'],
  ['Income approach', 'Income approach – owner occupied market', '24.025', 5000, 'Single-family homes here are bought mainly for owner occupancy; the income approach is given least weight.'],

  /* ---- Reconciliation (F-1 26.019, 5,000; 26.018 client-requested conditions, 2,500) ---- */
  ['Reconciliation', 'Most weight to sales comparison', '26.019', 5000, 'The sales comparison approach is given most weight as it reflects buyer behavior in this market; the cost approach supports the conclusion.'],
  ['Reconciliation', 'Exposure time', '26.019', 5000, 'Exposure time is estimated at [30–90] days, based on the comparables’ days on market at a competitive price after the last price reduction.'],
  ['Assignment conditions', 'Client-requested condition', '26.018', 2500, 'At the client’s request, a value is also given [subject to completion of the repairs / as of a retrospective date] as described.'],
];
/* add the set to her library – shown first, nothing she has is changed (her database rule) */
async function cmt36Add() { const now = new Date().toISOString(); const add = []; CMT36.forEach(([section, title, fid, lim, text]) => { const id = cmtId(section, title + ' (3.6)', text); if (!CMT[id]) add.push({ id, section, title: `${title} – F-1 ${fid}, ${lim.toLocaleString()} characters`, text, ver: '3.6', src: 'UAD 3.6 starter set (Oct 2026)', added: now }); });
  if (!add.length) { toast('The UAD 3.6 starter comments are already in your library'); return; }
  const secs = [...new Set(add.map(x => x.section))];
  if (!confirm(`Add ${add.length} UAD 3.6 comments to your comment library?\n\nSections: ${secs.join(', ')}.\n\nThey are marked UAD 3.6; nothing you already have is changed. You can edit or delete any of them.`)) return;
  add.forEach(x => { CMT[x.id] = x; }); await cmtSave(); toast(`${add.length} UAD 3.6 comments added – open a section to see them`, 6000); if (typeof cmtRender === 'function') cmtRender(); }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-cmt36]')) cmt36Add(); });
