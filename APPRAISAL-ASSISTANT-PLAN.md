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
View) labeled exactly "Lot Utility/ Usable lot area"; subject value "0.16 ac", comp value "0.25" (acres), adjustment in the
comp's adjustment column (e.g. $(90,000)). Export usable acres + the site adjustment to this row; test whether the MISMO
import can create an "Other" site row with that label, else she adds the row in SFREP and the assistant gives her the values.
**Found in Fannie's D-1 sample (SF1_Appraisal_v1.4.xml):** an "Add Other" grid row = COMPARABLE_ADJUSTMENT with
ComparableAdjustmentType SalesComparableAdditionalAdjustableComparisonItem, AdditionalComparisonLineItemIdentifier = row label
(e.g. "Below Grade Exterior Access" → ours "Lot Utility/ Usable lot area"), AdditionalComparisonLineItemDescription = value
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
