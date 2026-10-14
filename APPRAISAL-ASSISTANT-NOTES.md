# Appraisal Assistant – running notes

## 2026-10-13 – build step 2, part 1: ACI conversion + regression reliability test
- Original aci_archive.zip kept unchanged (sha256 1fb9ba4d…2d70b); the database is rebuilt from it read-only.
- `scripts/build_comp_db.py <aci_archive.db> <assistant_comps.db>` → assistant comp database (SQLite):
  - `comp_records` – every ACI record (rec_id = aci_comps.comp_row_id) parsed: address/ZIP/area, sale + contract month,
    sale type, financing, concessions, MLS #, DOM, LPR, buyer-broker %, location rating + factors, site / usable / front feet,
    view rating + types + limited, design/stories/style, Q/C (+/-), rooms, baths full/half, GLA, basement, below-grade rooms,
    garage, energy (solar/battery/generator), remodel year and other notes, porch, fireplaces, own vs community amenities,
    landscaping (her scale), accessory buildings (JSON list + finished/unfinished sf), photos, raw values beside parsed ones,
    `custom_rows_json` = how each shifting custom row was read.
  - `sales` – one row per sale event (repeats in several reports combined; most recently entered record = primary;
    `disagreements` lists differing values); `resale_flag`; `use_for_analysis` + `exclude_reason`.
  - `custom_value_review` (needs_review=1 → 1,157 values for her), `report_field_roles` (which field held which custom row
    in each report), `data_flags` (every correction and flag), `conversion_info`.
- Custom rows mapped by value pattern, then by the report's own field layout (majority vote per report) for ambiguous values.
- Corrections (logged in data_flags): contract year 19xx→20xx (0–18 months before sale only); "NNNN ac" read as sf;
  usable > site trimmed (≤15% over) or dropped; ZIP filled from same address. Bad dates flagged, never guessed.
- `scripts/reliability.py` → reliability.json: log-price regression per area (Montecito, Hope Ranch, SB city, Mesa, Goleta,
  Carp/Summ, all) with quarter/half-year fixed effects, HC1 robust SEs, 200 bootstraps, 2012-18 vs 2019-26 split, 5-fold
  out-of-sample. Grades: Supported / Use with caution / Not supported / Insufficient data / Inconsistent.
- Report: claude.ai doc "Comp Archive Conversion & Adjustment Reliability Test".
- Open decisions for Jennifer: accept the 4 automatic corrections; latest-record-wins rule; "0.62r/2.15o" = usable/overall;
  old-report "Average" / bare "1","2" in the Fireplace field; sort review list (Custom-row-values-to-sort.xlsx).
- Next: MLS/CRS/CORT importers, three-way compare, comps-considered, comp photo app (rest of step 2); then step 1 foundation.
  The construction cost database (Construction_Cost_Database.xlsx, 32 projects, 189 review flags undecided) is received.

## 2026-10-13 – Jennifer's corrections (Montecito)
- She adjusts land on USABLE acres only (~$1.5M per usable acre in Montecito), never on total site.
- View scale (her definition): Adverse (freeway, gas station – could devalue) | Neutral (garden setting, wooded, residential –
  a buyer would not pay extra) | Beneficial, graded limited → average → excellent/panoramic (ocean, mountain, lake, golf, city,
  city skyline, city street, canyon – a buyer would pay more). She uses about 10% per tier.
- Busy roads definitely affect value in Montecito; keep "some traffic" separate from busy road.
- Montecito is ~95% custom estates (non-conforming) – regression is support only.
- scripts/montecito_v2.py = re-test on her structure (results in data/montecito_v2.json and the doc's Montecito re-test table):
  usable acre $1.68M (0.5→1.5 ac), $1.03M (1→2), $0.58M (2→3) at the 2024-26 median $6.6M; busy road -9.3%;
  views avg +6.4%/tier but uneven: limited ≈ neutral, full +14% (ocean +17%), panoramic +48% (14 sales).
- Inspection app 6b: export opens a "file is ready" box; share sheet from its own tap, files only (no title), ASCII names.

## 2026-10-13 – Engagement Letter Writer (first piece of step 1)
- letter-writer/ (src/clauses.js = clause library, letter.js = model → .docx + preview, app.js = UI; build.py → "Engagement Letter Writer.html").
- Local HTML file opened in Chrome (artifact pages block downloads). Data in that browser's localStorage: el.contacts, el.letters,
  el.aiText, el.draft; Back up / Restore JSON (app 'engagement-letter-writer').
- Types: dod (IRC §1014), parentChild, trust (current), purchase (current Market Value). Condo = property type (GPAR Condominium form).
- All use her 2026 wording. Fixes vs samples: trust liability clause restored in full, "Bottom of Form" removed, signature date =
  agreement date, Purchase/Condo moved to newer wording, page X of Y footer, numbered list for Market Value implicit assumptions.
- AI-use paragraph (draft, editable on Standard wording tab) at end of Confidentiality; checkbox per letter to leave it out.
- Open: attorney / E&O review of AI paragraph; Trust letter cites Treas. Reg. §1.170A-17 (charitable-contribution rule) – confirm.
- 2026-10-13 update: letters named "<street> - Engagement Letter.docx" (her convention); APN removed (she doesn't use APNs or last names).
  Order section = intake: file #, order received, report due, type, status, client's letter upload (local scan, no AI: AI / confidentiality /
  third-party paragraphs; ban wording → AI use set to No), AI use Yes/No (No drops the AI paragraph). Clients tab = database that grows
  automatically on every save/download (matched by email, else name+firm; keeps file numbers and last-letter date).
  PDF reading uses pdf.js 3.11.174 from cdnjs (needs internet the first time) – not testable from the build sandbox; Word upload tested.
- 2026-10-13 update 2: new types divorce (current, both spouses jointly + authorization clause), divorceRetro (e.g. date of separation),
  gift (Form 709, Treas. Reg. §25.2512-1 FMV, §301.6501(c)-1(f)(3) adequate disclosure – DRAFT wording for her review).
  Court testimony / expert witness terms switch (her old rates $250/hr, $350 declaration, $2,500 retainer, $250 late cancel – remembered).
  Market rent survey add-on with its own fee and computed total. Client-letter reading gives 3 answers (AI not allowed / AI OK if
  confidential info removed / no restriction found); she picks AI use herself: Yes / Yes-redacted / No AI.
- 2026-10-13 update 3: preListing type (current Market Value, possible listing/sale; not a list-price recommendation or BPO; not for lender/buyer use).
- 2026-10-13 update 4: 16 types grouped (estate/trust/gift; divorce/co-owners; buying/selling; lending (private/portfolio, construction); tax (Prop 8 appeal, donation 8283 DRAFT); other current/past with her purpose text). Value premise (as is / as completed HC / prospective EA / both) + documents-to-provide section; property types add co-op (interest = shares + proprietary lease), detached PUD, proposed, renovation.
- 2026-10-13 update 5: delivery = number + unit + counted from (inspection or payment whichever later / inspection / payment); payment due choices (at/before inspection, on delivery of report, on signing, other text); payment on delivery switches delivery to 'from the inspection'. 'Intended user, in your own words' box replaces the standard sentence (cleans double periods).

## 2026-10-13 – her decisions on the conversion
- Versions: keep ALL versions of a sale to choose from per assignment (newest, the GPAR one, an old retrospective one);
  sales.versions lists them (entered date, report, UAD vs word ratings, GLA, Q, C). Exact duplicates removed, newest kept (407 removed).
- "0.62r/2.15o" = 0.62 ac core residential lot (= usable) + 2.15 ac orchard. Stored in land_split / orchard_sf (108 records).
  e = equestrian acres, w = watershed acres (steep, no access or utilities, wildfire buffer – not usable or valuable). Usable = r only.
- Fireplaces: no contributory value in Santa Barbara; she never adjusts. Kept for condos only; Fireplace-field oddities dropped from review.
- Automatic fixes (contract year, "NNNN ac" as sf, usable capped/dropped, ZIP fill): she did not object – kept, logged in data_flags.
- Rebuilt: 23,926 records, 11,929 sales; Montecito re-test unchanged in substance (usable acre $1.73M 0.5→1.5, $1.04M 1→2; busy road -9.4%; view +6.4%/tier).
- Comp genie must start from an address box: type a comp address → found in her archive → grid fields fill (all versions to choose) before MLS/CORT.
- MLS export now also has Geo Lat/Lon, Source (= square-footage source: M Measured, P Public Records, O Other/See Remarks), Basement (yes/no text), Association fee.
- Appendix A-1 URAR delivery spec saved in reference/ (UAD Delivery Spec 1.4, Enumerations, Visual Schema) – use for the 3.6 grid fields.
- Prior-sale rule: a prior sale dated before the year built (e.g. 940 Alston: $1.75M 2018, built 2019, $13.67M 2026) = land/teardown sale, shown as such, not a resale flag.
- Appendix D-1 SF1 sample (reference/D1): comps = PROPERTY_SALESCOMP1..3 with ~118 fields each (address, parking, adjustments by ComparableAdjustmentType, DOM, final list price, listing status, lat/lon, neighborhood, Q/C overall/interior/exterior, beds/baths, design, heating/cooling, amenities, concessions, contract + transfer dates, prior sales, view type+range, site influence, photo). Template for the genie's SFREP export.

## Comp Genie (build g1, Oct 14 2026)
- Source: /home/claude/genie/src (copy in aa/genie). `python3 build.py` → dist/index.html; host index.html + pdf.min.mjs + pdf.worker.min.mjs + pdfjs-LICENSE.txt on GitHub Pages (code only, no data).
- Her data loads locally into IndexedDB ("appraisal-assistant"): Comp Archive.json.gz (export_archive_json.py) and CORT Sales.csv (cort_ocr.py output).
- Sources: archive (all versions per address/APN), flexmls CSV (cp1252), flexmls photo zip (<MLS#>_<n>.jpg), flexmls PDF printout (detail + History: listings, price changes, under-contract price, fallthroughs, prior closed sales), CRS PDF, CORT table.
- Matching: MLS # → APN → address key (number + street words without direction/suffix).
- Default choice: sale facts from archive only when that archive record is this sale (price ±$1k or date ±1.5 mo); house facts from archive if record ≤ 24 months old, else MLS first; site/view/location archive first; lat/lon MLS → CRS. Her own value overrides all; click any cell to choose.
- Archive listing records (Active/Pending/Expired…) carry list price, not sale price.
- Archive prior_sale text: "date | 0 | No Transfers" = search date, not a sale; "date | 0 | Intrafamily" = $0 transfer.
- Flags: quick resale (≤24 mo, +25%), sold before year built = land/teardown, prior sale/transfer ≤12 mo, fallthroughs, relisted (CDOM>DOM+30), >15% under original list, non-arm's-length sale types, concessions "Yes" without amount, CORT OCR confidence <60, GLA disagreement, old archive record.
- Export: MISMO 3.6 comps (D-1 layout: PROPERTY SalesComparable, DATA_SOURCES MLS/AssessorRecord/Deed/PreviousAppraisal), front photos in Images\, CSV of all comps, front photos zip named "<address>.jpg". No adjustments, no ADU/outbuilding improvements, overall Q/C only (not interior/exterior split). SFREP import untested.
- build_comp_db.py fix: repeated accessory text in two custom rows was counted twice (655 records); now counted once. DB rebuilt: 23,918 records.
- Flag: recorded price (CRS/CORT) differing from the price used → explain effective price. Her rule: her verified negotiated price is the effective price (940 Alston $14,011,604 vs recorded $13,672,000).
- g1 fix: typing in subject / "your value" fields no longer redraws the whole page (Tab works); effective date is a plain mm/dd/yyyy box.

## Her order workflow (Oct 14 2026) → foundation design
1. Engagement letter: she writes one, or receives the client's.
2. Pull the CRS property sheet.
3. Check MLS for current or past listings of the subject.
She wants CRS (and other order facts) entered ONCE and shared by the letter writer / intake, inspection app, document reader and comp genie.
Plan: one "assignment" record created at intake (address, APN, lat/lon, client, effective date, AI setting, CRS facts, MLS status), stored on her computer under the shared site sbappraiser.github.io (same browser storage for all desktop modules); the iPad inspection app receives it as a file (or later sync). Move the letter writer onto the same site.
- Order intake = the one place she uploads: CRS, engagement letter, MLS listings, plans/specs/budget, HOA docs (condo questionnaire, CC&Rs, HOA budget, bylaws, minutes), purchase contract/counters/addenda/disclosures, leaseback, prelim title/legal description, permit PDF, permit history by parcel (county only).
- iPad: "Active orders" list; tap an order at the property → inspection prefilled from intake facts. Desktop→iPad hand-off planned as one "Active Orders" file (iCloud Drive / Files), since the iPad and desktop browsers don't share storage; inspection export comes back the same way and attaches to the order. No document uploaded twice.
- SUBJECT RULE: never prefill subject beds, baths or square footage from CRS/MLS/any document into the inspection; she measures and counts on site. (Other subject facts – APN, lot, year built, flood, etc. – may prefill.) Comps are unaffected.
- Floorplan idea (planned): floorplan image/PDF uploaded at intake travels with the order to the iPad and can be placed under the sketch as a faint tracing layer; she sets the scale with one known wall, traces, then corrects with her tape measurements; sketch math (ANSI) stays based on her measured walls. Automatic outline extraction from MLS marketing floorplans is not reliable (often not to scale; furniture/text clutter).

## To do – comp genie (from her testing, Oct 14 2026)
- DONE (g1, Oct 14): Undo button in the Files read box, ✕ per file in "Files in this assignment", Remove all comps, storage marked persistent. Original request: the "Files read" box only had OK. Add "Undo this file" there (removes the comps, photos and data that file added), plus "Remove all comps" / select-and-remove in the comps list. She dropped an 84-listing MLS export when she wanted 11 and had no way back except starting a new assignment.
- When an MLS export/printout row matches the subject (address or APN), file it as the SUBJECT's listing history (UAD subject listing section), not as a comp — same as the subject CRS report. Never use it to fill subject beds/baths/sq ft. Also show a "Remove file" (×) next to each file in "In this assignment".
- Comp genie photo viewer added (click a photo: full size, ←/→, "Use as the front photo"). NOTE: her flexmls photo zip export is 300×200 thumbnails – too small to judge quality/condition and small for the report. Ask her to pick a larger photo size in the flexmls export if offered; otherwise review photos online in MLS. Later: a "keep only front photos" cleanup per assignment.
