# Appraisal Assistant – Plan and Handoff
Jennifer Heath, Santa Barbara · prepared 2026-10-13 · for continuing in a new chat

This document carries everything agreed in the October 2026 conversations about the desktop
"Appraisal Assistant". Give it to the new chat together with the files listed in section 12.

---

## 1. Who this is for and what it must do
- Jennifer is a residential appraiser (33 years) working mostly on complex, high-end, non-conforming
  properties in Santa Barbara County: Montecito (93108 – her largest area), Hope Ranch, Summerland,
  Carpinteria, the Mesa, Goleta. Estates with guest houses, ADUs, barns, pools, tennis/pickleball
  courts; properties with lots whose usable area matters more than the total.
- Software: SFREP Appraise-It Pro (UAD 3.6; imports via Home → Import Forms), Apex (sketch, being
  replaced by the inspection app's sketch), Microsoft 365 / Word / OneNote / OneDrive, Adobe
  Acrobat (Redact + Adobe Sign), Chrome. Desktop PC on order (Core Ultra 7 265K, 16 GB RAM – 64 GB
  recommended, Windows 11 – Pro recommended for BitLocker). Daily external-drive backup. OneDrive.
- The **UAD 3.6 Field Inspection app** (iPad PWA, version 6a, sketch built in) already exists and
  feeds the assistant via its workfile zip and SFREP MISMO zip. Source: UAD-Field-Inspection-source-v6a.zip.
- Goal: she makes every appraisal decision (comp selection, Q/C ratings, adjustments, weighting,
  value). The assistant removes the clerical work: retyping, importing, filing, cross-checking,
  math, charts, drafting in her words, checking requirements. Save time; be accurate and credible.
- Nobody else uses it (daughter does office work only, never touches appraisals). One login,
  Windows password + BitLocker. No sharing features, no user accounts.

## 2. Architecture decisions (settled)
- Built like the inspection app (single-page web app from build.py) but opened in **Chrome** on the
  desktop, installed as a Chrome desktop app (own window + icon). Uses the File System Access API to
  read/write her real folders. Firefox/Safari not supported for the desktop app (no folder access).
  iPad keeps Safari + inspection app; a read-only lookup view for the iPad is a later nice-to-have.
- **Her existing folder structure stays**: a top-level appraisal folder on the desktop, inside it
  a Comp Photos subfolder and Subject Property folders by year, each with subfolders by file number.
  The assistant adds subfolders inside each job (Inspection, Documents/{Contract, Title-Prelim,
  Permits, Assessor, MLS, CRS, Engagement}, Subject Photos, Comps Considered, Review). It never
  reorganizes anything. External drive + OneDrive keep backing it up as now.
- **Two layers**:
  - Layer 1, no AI, available on every job: databases, imports, cross-checks, resale flags,
    comps-considered tracking, math/graphs/market conditions, job folders, photo filing, comment
    library, engagement letters, bookkeeping, rule checks, SFREP export.
  - Layer 2, AI (Claude API, her own key, business terms): document reader (contracts, prelims,
    leases, engagement letters, permits), MLS remarks, floor-plan reading, photo captions, comments
    in her voice, written review, library Q&A.
- **AI setting per job: Full / Redacted only / None.** None = sealed: AI buttons locked, nothing in
  that folder is ever sent anywhere, job log records it. Redacted = assistant removes names
  (borrower, client, seller, decedent, signers), file/loan numbers, phones, emails, signatures
  locally (true redaction, text removed, page rebuilt, hidden info stripped) and shows the result
  for approval before sending; property address stays. Keep AI and non-AI jobs in physically
  separate folders on disk. Where a client clause is ambiguous, choose None.
- **Engagement letter handling order**: (1) local clause scan, no AI – finds "artificial
  intelligence / AI / automated / third party / confidential / data / share" and shows those
  paragraphs; a ban → job set to None, letter never sent to AI; (2) otherwise AI reads the
  redacted letter once; (3) requirements stored **per client** so later letters are compared
  locally and only changes are flagged (AI reads only changed paragraphs).
- **AI key**: platform.claude.com (Claude Console) → Billing (card + monthly spending limit) → Settings → API keys → Create
  Key → save in password manager → paste into assistant settings (stays on her computer). Not
  needed until the document reader stage. Alternative: assistant prepares documents and she drops
  them into the Claude app herself under her Pro plan (training off).
- **SFREP import** (from her Import Forms screenshot): the dialog lists forms to tick (UAD Uniform
  Residential Appraisal Report / UAD Comps Adjustments / UAD Condition and Quality Rating
  Definitions), "Overwrite populated fields" (off = fill only empty fields), "Always overwrite
  repeatable forms" vs "Always add new repeatable forms" (comps, photos), "Include extended
  comments", "Include adjustments". So section-by-section imports work: inspection first, grid /
  cost approach / comments later as separate exports, overwrite off; "add new" when adding comps.
  The assistant prints the recommended settings beside each export. Still to test: whether "add
  new" appends or matches comps by position.
- Full report → SFREP → PDF/delivery remains SFREP's job; the assistant replaces the typing only.
- Not doing: live connections to MLS/CRS/CORT (export and drop in); anything that is a judgment call.

## 3. Job workflow (her five steps)
1. Home: job list with search (file #, street name/address, borrower, client, intended use, year,
   status). New job → **order intake form** → AI setting → engagement letter.
2. Documents: everything uploaded into the job's Documents section by type. CRS report and parcel
   permit history also pushed to the inspection app for the iPad.
3. Inspection on the iPad (data, floor plan/sketch, photos). Workfile zip comes back and unpacks.
4. Photos: subject photos (labels from the app) copied to Subject Property Photos/<year>/<file #>.
   Photo review screen: one photo at a time, room/category pre-filled, name + comment fields,
   arrows; edits rename the file. Optional AI caption only on AI jobs. **Comp photo app**: pick a
   photo from SD card/iPad/phone, type the address in her format (street number + street name, with
   a letter/number when she uses one), saved into her Comp Photos folder under that name; the grid
   finds comp photos by that name; a subject that is a purchase also gets filed as a comp photo.
5. Inspection, sketch, photos → SFREP (existing export). Grid and cost approach done in the
   assistant, exported as later imports (see section 2).

## 4. Order intake and engagement letters (every job, no AI)
Intake fields: client (company, contact, mailing address, email, phone) from the **contact pick
list**; lender (if different); **AMC** (if any) with license/registration ID + state; intended
user(s); intended use (estate / date-of-death, divorce, lending, pre-listing, trust …); subject
address (USPS-verified; USPS address API with fallback to opening the USPS lookup pre-filled);
property type; decedent name + date of death (sets retrospective effective date); access contact
(name, phone, relationship); fee, retainer, due date; report type; AI setting. Fields hide when
not applicable.
UAD 3.6 homes: Assignment Information section 2 – parties with roles Client, Lender,
**ManagementCompany** (AMC) each with company, address, license ID/state/expiry; **AMC Fee**
(2.007); **AMC Reference ID** in footer (HF.008). When the AMC engages her it is both Client and
ManagementCompany.
Engagement letter: assembled from her own sample letters (one template per assignment type) with
intake values; opens as Word in Documents\Engagement Letters (named by file # + client); she saves
to PDF, sends via Adobe Sign, drops the signed PDF into the job workfile. Status shown on the job:
drafted / sent / signed. Intake data then flows to the report's assignment section.
Uploaded lender/AMC engagement letters → requirements checklist (forms/addenda, photo
requirements, scope items, delivery, fee), confidentiality policy in plain words, **inspection
to-dos pushed to the inspection app** (e.g. smoke detector in every bedroom, house number at curb),
completion check before delivery. Requirements library per client; only changes flagged later.
Contact book: lenders, AMCs, attorneys, trustees, agents, private clients; seeded from past reports
and engagement letters; grows as she works.

## 5. Databases
### 5a. ACI comp archive (delivered: aci_archive.zip → aci_archive.db, SQLite)
- 24,333 comps (23,587 sales, 71 rentals, 675 unlabeled), versions in aci_comps_history,
  20,231 linked photos (front/rear/street per comp), 90 fields, sale-year corrections applied.
- APN on only ~3,000 → **address is the key** (USPS-standardized both sides; norm_address exists).
- Use ZIP for area, not City (93108 Montecito = 6,536 sales, avg ~$7.1M; 93067 Summerland; 93013
  Carpinteria; 93110 Hope Ranch/Foothills; 93105/93109 Mesa; 93117 Goleta…). Clean city spellings.
- Bad dates exist (e.g. '0205-01-01', a 12/12/2026 future date): flag, never guess.
- Her custom grid rows moved between ACI fields across form versions (e.g. "1.1/GldnQdrngl"
  sits in Fireplace in one report and Other1 in another) → **map by value pattern, not field**;
  show unmatched values in a review screen for her to sort.
- **Never modify her original.** Build the assistant's comp DB from a copy; keep the original zip in
  the project. If conversion looks wrong, fix the conversion.
- Full field dictionary: ACI-FIELD-DICTIONARY.md (in this package) + the three abbreviation images.
- When she types an address used before: ask whether to import; show versions (date used, file #,
  UAD or GPAR form); she picks. Her database beats MLS/CRS when it has the property.
- Resale flag: sold then resold much higher within ~1–2 years → "likely remodeled, re-research",
  but still pull listing history, dates, prices, MLS #s, DOM.
### 5b. Construction cost database (she built it with Claude earlier; 30+ budget folders with
property info) – feeds depreciated cost for pools, guest houses, barns, site work, and the cost approach.
### 5c. CORT weekly closings (email PDF ~weekly; binders back 20 years in 6-month increments).
Import the emailed PDFs going forward + last 2–3 years from binders first; judge value before scanning more.
### 5d. Monthly MLS market statistics → market conditions section, trends, absorption, DOM,
list-to-sale, time adjustments.
### 5e. Reference library: USPAP, UAD 3.6 spec/samples (she has them), Fannie/Freddie guidance,
Mission Canyon Plan, Toro Canyon Plan, Hope Ranch / Solfatara material, zoning code, State assessor
building cost handbook, Appraisal Foundation guidance. Full-text search (OCR scanned PDFs once),
bookmarks/notes, link a page to a job; AI Q&A with page citations on AI jobs. USPAP is copyrighted –
her copy for her use only.

## 6. Comp genie (grid data)
- Drop in MLS export (spreadsheet preferred; PDF too), CRS report, CORT data per comp.
- Look up in her ACI DB by address; her DB wins. Three-way side-by-side where sources disagree;
  she clicks the value. Nothing decided for her; Q/C ratings always hers.
- Reads MLS remarks for form; floor plans → square footage **estimated, marked as such**.
- Listing history: list dates, price changes, days since last reduction (LPR), cumulative DOM,
  withdrawn/relisted, MLS #, doc #, financing type (cash/FHA/VA/conv), contract date, concessions,
  who paid buyer-broker compensation and how much.
- Verification log per comp (calls, what confirmed, when) → workfile + UAD data-source fields.
- Comps considered: any comp loaded/adjusted/removed goes automatically to "considered but not used".
- She may load 20+ comps and prune; sensitivity analysis along the way.
- Comp photo page from the Comp Photos folder; front photo found by her address format.

## 7. Adjustment assistant (no pairs in her market – test, don't promise)
- **Regression reliability test first** on the ACI data: per feature report sales count, confidence,
  stability when sales are removed; features that fail get "insufficient data".
- Sensitivity/spread analysis on the grid (which amounts tighten the adjusted range).
- Ranking (relative comparison) for view/quality where dollars can't be supported.
- Depreciated cost from her cost DB + assessor cost handbook for amenities/outbuildings.
- Income (rent × multiplier) for ADUs/guest houses. Land: land sales / allocation / extraction.
- Time adjustments from CORT/MLS stats + resales in her DB. Matched pairs when they exist.
- Market interview notes summarized into workfile language.
- Every result carries a plain "how this was derived" note. Past ACI adjustments are not visible in
  the archive and would be circular anyway; support comes from sale prices.
- Cost approach: cost DB + handbook for cost new; site value and depreciation entered by her;
  exports to the MISMO cost section.

## 8. Her custom fields → UAD 3.6 (checked against Appendix A-1 spec)
See ACI-FIELD-DICTIONARY.md "UAD 3.6 homes". Key points: Neighborhood Name is a grid row (22.03.22);
Location splits into Primary Access / Easement / Hazard Zone / Site Influence / Shared Driveway with
impact ratings; View = type + range + impact; Dwelling Style enumeration (+Other description for
Spanish Revival, Mid-Century Modern etc.); ADU section vs Outbuilding types (GuestHouse, Studio,
PoolHouse, Barn, Stable, Workshop…) with areas/baths/kitchen; Property Amenities categories (Water
Features: pool/spa/sauna; Outdoor Accessories: sports court, outdoor kitchen/fireplace, riding ring;
Outdoor Living: patio/deck/porch/balcony); Landscaping = Site Characteristics line with impact +
comment (her scale None/Natural, Minimal, Fair, Avg-Fair, Avg, Avg-Gd/AG, Good, Excellent);
DOM row; concessions incl. seller-paid buyer-broker %. **Usable lot area has no 3.6 field** → own
assistant field shown under Site Size; exported into Site Characteristics comment ("Usable approx
1.1 ac of 2.04 ac; sloping"); custom grid row if SFREP allows.
**Her SFREP placement (Oct 15 2026 screenshot):** Site section → "Add Other" row at the end of Site (after
View) labeled exactly "Usable Lot Area/Utility"; subject value "0.16 ac", comp value "0.25" (acres), adjustment in the
comp's adjustment column (e.g. $(90,000)). Export usable acres + the site adjustment to this row; test whether the MISMO
import can create an "Other" site row with that label, else she adds the row in SFREP and the assistant gives her the values.
**Found in Fannie's D-1 sample (SF1_Appraisal_v1.4.xml):** an "Add Other" grid row = COMPARABLE_ADJUSTMENT with
ComparableAdjustmentType SalesComparableAdditionalAdjustableComparisonItem, AdditionalComparisonLineItemIdentifier = row label
(e.g. "Below Grade Exterior Access" → ours "Usable Lot Area/Utility"), AdditionalComparisonLineItemDescription = value
("Walk Out" → "0.16 ac"), ComparableAdjustmentAmount on comps (subject has no amount). Other adjustment types in the sample:
SaleDate, ContractDate, SalesConcessions, SiteSize, SiteInfluence, Topography, NeighborhoodName, YearBuilt, OverallConditionRating,
LivingUnitBedroomCount/BathroomCount, LivingUnitStandardFinishedAreaAboveGrade/BelowGrade, LivingUnitUnfinishedAreaBelowGrade,
OutdoorLivingAmenity, WaterFeaturesAmenity, MiscellaneousAmenity, EnergyEfficientAndGreenFeatures. LPR/SI → comp comment + DB.

## 9. Other functions agreed
- Document reader (AI jobs): contracts (final price, contract date, credits, buyer-broker comp and
  who pays, personal property, leaseback/exchange, appraisal/loan contingencies, LLC/trust/trustee
  signers, changes from printed form), prelims (exceptions, exclusions, easements, agreements,
  rights), leases (rent, term, furnished), permits, parcel history; each item shows its source page;
  approval queue (accept / edit / reject) before anything enters the report.
- Comments in her voice from her OneNote canned comments reorganized by UAD 3.6 section (library
  works without AI; AI drafts from it on AI jobs). Assignment-type comment sets (estate/date of death,
  divorce, trust, pre-listing). GPAR/non-lender forms from the same data.
- Prior-report pull for a subject appraised before; neighborhood profiles; zoning/H&BU helper from
  the library; public lookups (flood zone, census tract, MSA, FEMA map); email drafts.
- Market conditions section + charts from MLS stats and CORT; exposure/marketing time statistics;
  reconciliation helper (adjusted range, net/gross %, weighting in her words).
- Reviewer: rule-based checks always (math, grid totals, consistency, dates, required items, UAD 3.6
  compliance rules from Appendix H-1 run locally before SFREP); AI review on AI jobs (spelling,
  grammar, clarity, USPAP checklist). Workfile completeness check + one-click archive to year folder.
- Bookkeeping, minimal: invoice logged at delivery (fee from intake), mark paid / drop payment stub,
  unpaid list with one-click follow-up email, printable twice-a-year reconciliation.
- Sketch pages, symbols, rotate, etc. are done in the inspection app (v6a).

## 10. Build order (each step useful on its own)
1. Foundation: Chrome desktop shell, job folders in her structure, AI switch, order intake +
   contact book + engagement letters, inspection workfile import, comment library reorganized for
   3.6, SFREP comp-grid import test (grid export built from Fannie's D-1 sample; she test-imports into SFREP – an SFREP export is not needed).
2. Comp genie: ACI conversion (dictionary) + regression reliability test (first deliverable),
   MLS/CRS/CORT importers, three-way compare, resale flags, comps considered, comp photo app.
3. Adjustment assistant: sensitivity, regression (if reliable), depreciated cost, market conditions.
4. Document reader + redaction + approval queue (AI jobs); engagement-letter requirements reader.
5. Comments in her voice, photo captions, reviewer, library Q&A.
Open questions: SFREP "add new repeatable forms" behavior; whether SFREP allows custom grid rows;
USPS API availability; how much old CORT history is worth scanning.

## 11. Conventions from the inspection app (reuse)
- schema.js field definitions and her custom lists; export.js MISMO writer (PROPERTY_UNIT_AREA,
  LEVEL, outbuildings, amenities, parties, photos); workfile zip format (Inspection Notes.html,
  Photos/, SFREP/, inspection-backup.json, Sketch.pdf); PROJECT-NOTES.md style of running notes;
  build.py single-file builds; version stamps "6a-MMDD-HHMM".
- Testing with Playwright/Chromium; she tests on the real device/desktop.
- Deliver updates as a zip of files to upload (GitHub Pages for the iPad app); for the desktop app a
  local folder/installer approach is fine (decide in the new chat).

## 12. Files to give the new chat
From this package: APPRAISAL-ASSISTANT-PLAN.md (this file), ACI-FIELD-DICTIONARY.md, the three
abbreviation images, SFREP-Import-Forms-dialog.png, UAD-Field-Inspection-source-v6a.zip.
From her: aci_archive.zip (again – the new chat has no files), construction cost database,
2–3 screenshots of completed 2.6 grids, MLS export (10–20 properties, spreadsheet + PDF), one CRS
report (a second if different property type), 2–3 CORT weekly PDFs, 3–4 sample engagement letters
(Word), OneNote comments export, a completed SFREP 3.6 report exported as MISMO zip, the UAD 3.6
spec/sample files (SF1/3/4/5, condo, co-op XML+PDF; Appendix A-1 xlsx; Appendix H-1 xlsm;
Appendix D-1 SF1 zip; UAD 3.6 template PDF; her SFREP .rptx template) if the new chat needs them.

## 13. Inspection app follow-ups (not yet built; carry into the new chat)
- Floor plan requirement: Fannie's "floor plan" definition requires all levels, exterior wall
  dimensions, **interior walls, doorways, staircases, exterior ingress/egress**, room labels, and
  calculations. The sketch has stairs symbols but not interior walls/doors yet → add interior wall
  and door drawing (thin walls, door swings, exterior entries).
- Possible: 45° line-up dots; more stair shapes (L-shaped); "not backed up" flag on the home list;
  hide the "Level 1" label on single-level sketches if she prefers.
- Deferred earlier ("later"): AI photo/voice suggestions in the field; "New Job" automation (the
  assistant's intake now covers this – push job data to the iPad); engagement-letter import (now the
  assistant's job); desktop companion (cost library, MLS comps and maps, trends – now the assistant).
- Retire the inspect-test repo once v6a is confirmed on the iPad (test inspections: Save backup in
  TEST → Restore backup in the real app).

## 14. Compliance and privacy notes agreed
- Claude.ai Pro with "help improve Claude" OFF (confirmed): conversations not used for training,
  ~30-day retention. API use (assistant's AI features) runs under commercial terms. She receives no
  SSNs, loan numbers, credit reports or financial statements; contracts, engagement letters, photos
  and property data are fine to upload; leave out borrower financial details if ever present.
- Client agreements may restrict AI/third-party tools (GLBA-driven). Clause types: confidential-info
  bans (usually satisfied by redaction), outright AI bans (→ None), "AI may not develop the value /
  disclose AI use", approved-vendor-only. Search each letter for "artificial intelligence", "AI",
  "third party", "confidential". Ambiguous → None. Not legal advice; attorney/AMC has final word.
- Workfile note when AI is used (her wording to adopt): "AI tool used to summarize the purchase
  contract/prelim and to calculate [sensitivity/regression] data; results reviewed and verified by
  the appraiser." Report disclosure if the client requires it.
- Redaction: Acrobat Redact + Apply (she already does this) or the assistant's own true redaction;
  remove hidden information too. Drawing a black box is NOT redaction.
- OneDrive is acceptable storage: two-step verification on, "specific people" share links, Personal
  Vault for the most sensitive items. BitLocker (Windows Pro) on the new desktop. USPAP record
  keeping: workfile retrievable ≥ 5 years; external drive + OneDrive = two copies.
- CORT weekly data fields: closings with terms, address, APN, document recording number, and a few
  others – the assistant's closings table should keep all of them.


## Grid workbook – her requirements (Oct 16 2026, her words summarized)
- Office only (desktop, 3 monitors), never in the field.
- See subject + at least 3 comps at a time, ideally pop-outs: subject + comps 1–3 on the left monitor, 4–6 middle, 7–9 right. Tab moves to the SAME field in the next comp (row-wise), so she adjusts one line across all comps, then goes down line by line. Check consistency (e.g. central A/C $10k on comp 1 vs $15k on comp 6).
- Working grid of 4–99 comps (usually 4–20): add candidates freely, then narrow; removed comps go to "considered but not used" (UAD 3.6) and to her database. Final report usually 9 comps incl. 1–2 listings/pendings; sometimes 3 closed + 1–2 listings.
- Only the compared/adjusted lines in the workbook view; data sources, listing history etc. hidden while adjusting; workbook writes everything back in UAD 3.6 order.
- Photos: each comp needs a street scene; often a hedge/gate → supplemental MLS, listing, online or satellite photo; agents remove photos after closing → flexible photo choice per comp.
- Suggestions: sensitivity analysis (narrow the adjusted range), matched pairs inside the grid, grouped sales, depreciated cost (cost DB + age/condition), regression where reliable, and her starting points per market segment/value range. Her style: round, consistent $ per tier across the grid (e.g. $5M home: view avg-good→good $500k, avg-good→excellent $1.5M; condition ~5% per tier rounded, e.g. $250k per tier), not raw percentages. Explain how each adjustment was derived (GSE wants support + graphs).
- Fine condition/quality: C3-, C3, C3+ in a hidden field (UAD shows C3); saved to her database for next time. Her ACI functional-utility field (fu_raw) holds these (≈1,500 records found with C/Q +/-) plus comp notes, doc #/closing date.
- Comments: she will send sample sales comparison grids + comments so it learns her style; it drafts, she reviews/adds (agent conversations etc.).
- Decisions (Oct 16 2026): keeps her THREE monitors (email left, research/Acrobat right, form middle; she moves windows with a monitor-hop button). → grid pops out into separate synced browser windows she can move (subject + comps 1–3, 4–6, 7–9…), plus paging inside one window; Tab = same line, next comp. Suggestions start from BOTH her starting points and her past grids. Fine ratings (C3-/C3/C3+) as a small tag in the grid, editable any time as agents add info; only C3 goes to SFREP; +/− saved to her database. Persistent comp notes per property (paste agent emails/calls) shown whenever that comp is pulled in again, years later.
- More grid rules (Oct 16 2026):
  - Keys: "=" in a comp cell copies the subject's entry for that line; "=2" copies comp 2's entry. Ctrl+Shift+2 swaps the current comp column with comp 2 (also drag a column). "Arrange" button: move comps up/down, e.g. #12 into #2.
  - Ctrl+Z (outside a text box) removes the current comp from the grid – first saved to her database and to "considered but not used"; Undo bar to bring it back. Inside a text box Ctrl+Z still undoes typing.
  - "Save comps to database" button + autosave whenever a comp changes. If the comp is already in the database from another report and the report format differs (UAD 3.6 / UAD 2.6 / GPAR – different fields; no UAD abbreviations on GPAR), save a NEW VERSION instead of overwriting.
  - New comp not in her database: fill from CRS + MLS what is possible, but NEVER location, view, design, quality, condition, room count, square footage (exception: MLS "Main House sq ft" or an MLS floor plan with per-level areas), functional utility, outbuilding/ADU size (exception: MLS states that ADU/outbuilding size). MLS/CRS values show as a reference beside the empty box.
  - Permit folder/files dropped on a comp: AI (Claude, with redaction rules) reads them → very brief permit summary in date order: what, final/closed or not, enforcement cases, restrictions (no cooking / sleeping / rental in guest house or outbuilding), remodel/repair/addition years, solar kW and year, square footages from plans. Links to each permit file. Saved as "AI permit notes" on the comp in the database, SEPARATE from her own comp notes; both open from a Notes button in the workbook.
- Square footage for a comp already in her database (Oct 16 2026): her last database figure is the default (it was researched). If database = MLS = CRS and no floor plan says otherwise → fill it in silently. If they differ → show all figures side by side and let her choose, preselecting her database figure. Only raise a question ("re-examine this property – possibly remodeled / enlarged / upgraded") when the newer listing also shows a change in quality, condition or room count compared with her last use of the comp, or a new floor plan shows different areas.

## Pre-check before export (Oct 16 2026, from a 3.6 community post she shared)
Run on the full report before it goes to SFREP; nothing about value, all about consistency. Three layers:
1. Fannie Mae's own rules from Appendix A-1 (Conditionality / Cardinality columns): required and conditionally required fields, allowed values, formats – automated from the spec (tools/validate_uad.py is the start).
2. Consistency checks: area data source = physical measurement when she measured; measured vs county area > 10% → reconciliation comment present; every exhibit photo captioned (outbuildings too); market search description states radius, time period, data source and the ranges; lookback months in the text = lookback field; comps > ~1 mile → distance explained + location support (unadjusted $/sf near vs far comps drafted from the numbers); PUD vs project coded the same for subject and comps; numbers in narrative = numbers in fields (GLA, value, dates, DOM); grid totals = adjusted prices; gross/net % flagged.
3. Her own rules: a Revision log in the assistant – she pastes every stip / revision request / precheck flag; each becomes a rule (checklist item first, automated check when possible). The list grows with every file.
Cautions kept: it flags, she decides; no commentary goes out unread; every check result and the math behind it is saved to the workfile.

## The whole report in the Appraisal Assistant, one import into SFREP (her goal, Oct 19 2026)
Her words: start and finish the entire report in the Appraisal Assistant; one import file fills SFREP completely so SFREP validates and converts it to the file she emails the client. The assistant also keeps the workfile (inspection notes, labeled photos, aerial, legal description, FEMA map, property data report, permit summary, documents).
Section order = the order she considers the data (her UAD 2.6 template order, close to her inspection workflow), one tab each on the order:
 1. Order & engagement (exists: Order, client requirements, documents, bookkeeping)
 2. Scope of work · intended use/users · relevant dates · extraordinary assumptions / hypothetical conditions (near the beginning)
 3. Subject & contract (legal, rights, contract analysis – exists in the reader)
 4. Neighborhood & market conditions (exists: Market tab)
 5. Site (iPad + flood/FEMA map, zoning, permits summary, aerial)
 6. Improvements (iPad + sketch, floor plan, photos)
 7. Highest and best use – MOVE OUT of the Comp genie into this front section
 8. Approaches to value (which are developed and why)
 9. Cost approach – BEFORE the sales comparison: land value (land sales database: her archive + CORT land sales), cost new (construction cost database), depreciation (physical / functional / external), cost grid
10. Sales comparison – the Comp genie: market-condition (time) adjustment, comps, grid, considered-not-used, comments, graphs
11. Income approach (only when developed) – after the sales comparison
12. Reconciliation (approaches, final value)
13. Certifications · addenda
14. Pre-check → one "Full report for SFREP" file; workfile zip
Open questions for her: construction cost source (Marshall & Swift / CoreLogic? her own cost figures from the ACI archive?); land sales source; which addenda SFREP must carry vs. attach in SFREP; does Import Forms start from her template.

## Guiding rule from her (Oct 19 2026) – the assistant follows HER process, not the form
"I don't like the SFREP form style. The UAD 3.6 format does not flow per my process and workflow. … Simplify: let me do the analysis and inspection notes and photos; the assistant does the clerical, data, typing, organization, UAD coordination, storage of data, and items appraiser expertise is not needed for. Assistant does spell check, review, write notes based on inspection notes, etc."
- Screens are laid out in her working order; the UAD 3.6 field structure stays behind the scenes and is only assembled at export (one import file), then SFREP validates/converts.
- She: inspection (iPad notes, photos, sketch), analysis and judgment (comp selection, adjustments, ratings, value, which approaches), reading and approving every comment.
- Assistant: reading documents, filling data, typing, organizing the workfile, mapping everything to UAD 3.6, storing her data, spell check, consistency review / pre-check, drafting notes and comments from her inspection notes and data in her wording (drafts only – she reads them).
- Drafting: rule-based from her own phrases and comment library first (works on No-AI orders); Claude only when the order's AI setting allows it.
- Her rule (Oct 19 2026): the Comp genie AND the cost approach both use the cost database and the land sale database – one shared copy in the browser (same site, like the archive and CORT), read by both. Genie: depreciated cost as support for adjustments (ADU, garage, pool, additions) and land sales for site/usable-area adjustments; cost approach: land value + cost new + depreciation.
- Cost data (her words, Oct 19 2026): her own collection of local contractor budgets is THE cost source – Construction_Cost_Database.xlsx (built with Claude Oct 13: 32 projects, 2,457 line items by trade and cost layer, Summary by layer, CCCI index table to bring budgets to the effective date, 189 review flags still undecided). She stopped using Marshall & Swift (needed too many add-ons to reach South Coast costs; building-cost.com similar). She occasionally checks against the California State Board of Equalization Assessors' Handbook (residential building costs, current year) – a secondary check, not the main source.
