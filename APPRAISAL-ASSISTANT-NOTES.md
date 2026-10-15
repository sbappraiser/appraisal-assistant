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

## Market conditions module (requested Oct 14 2026)
UAD 3.6 Market section (A-1 17.xxx): 17.003 MarketBoundariesDescription (R, 1250); 17.004 MarketInventorySearchParameterDescription (R, 1250); 17.011 lookback months (R); 17.005 active listings count (R); 17.010 pending count (R); 17.012 sales count (R); list price low/median/high (17.007–17.009, CR); sale price low/median/high (17.013–17.015, CR); 17.006 median DOM (CR); 17.016 MarketTrendsForeclosureActivityIndicator (distressed competition, R); 17.021 MarketSupplyTrendType InBalance|OverSupply|Shortage (R); 17.022 MarketingTimeType UnderThreeMonths|ThreeToSixMonths|OverSixMonths (R); 17.019 PriceTrendsAnalysisDescription (CR, 2500). Image category AbsorptionRateGraph exists.
Her wording (Oct 14): data source name is "SBMLS" (not SBAOR MLS) unless a field truly needs the association name. A-1 check: 17.006 median DOM belongs to ACTIVE listings (not sales); 17.018 DataSourceName max 33 chars, one per source.
Graphs must work for any data-set size: small sets → individual sales as dots + quarterly (not monthly) medians, with a "few sales" note; no months-of-supply when there are no sales.
Plan: MICRO = her MLS search of the market area (actives, pendings, solds in lookback; export CSV) → counts, low/median/high, median DOM, distressed count, months of supply → demand/supply + marketing time suggestions, absorption chart image. MACRO = her monthly MLS statistics chart (her format) + Zillow trend for the city (prefer Zillow's downloadable data) + her archive time index → drafted price-trend commentary for the effective-date month. All computed in the app (no AI needed, works on "No AI" jobs); she reviews and edits every draft.
Need from her: sample monthly MLS statistics chart, a Zillow trend report, and one market-area MLS search export.
Samples received Oct 14 2026 (not stored in repo – ask her to re-send in the build session):
- "September_2026_stats.pdf": SBAOR Monthly MLS Statistics, 46 pages, TEXT PDF (parseable). Sections: Home Estate/PUD Districts 05-35 Summary of Stats (Sold, List/Sold, Co-Broker, New, Pending, Withdrawn, Cancelled, Expired, Back On Market, Extended, Active In Range, Current Active; counts, volume, median/avg list & sold, DOM, CDOM, SP/LP, SP/OLP), YTD 2022–2026 tables, 2025 vs 2026 YTD, YTD 2009–2026, then the same for Condos.
- Her 2.6 market commentary (~10,000 chars): SB South Coast overview (YTD bullets, 12-month and 24-month monthly median/count, marketing time & inventory, interest rates, supply/demand, uniqueness, data variations, condo trends, derivation of market-condition adjustments, other considerations, summary, effective-date statement). 3.6 PriceTrendsAnalysisDescription is 2,500 chars → condense; keep her wording style.
- Zillow screenshots (Goleta, Santa Barbara, 93108): ZHVI SFR, 1-yr change, inventory, new listings, median sale/list, sale-to-list, % over/under list, days to pending. Prefer Zillow Research CSV for exact series.
- Samarkand MLS export (CSV, 20 rows: A/P/C/E/L). Includes duplexes and two-homes-on-a-lot → micro search needs a property-type filter (SFR only) and an exclude list. Quick check, eff 10/14/2026, 12-mo lookback: 2 active, 1 pending, 14 sold; list $1.30M/$1.99M/$2.55M; sale $1.125M/$1.85M/$6.30M; median DOM 6.5; ~1.7 months supply (→ Shortage, Under 3 months); no REO/short sales (estate/trust sales are not distressed).

## Order hub (build o1, Oct 14 2026)
Home page of the assistant: https://sbappraiser.github.io/appraisal-assistant/ (Pages from /docs; source orders/src, letter wording from engagement-letter-writer/src, PDF/CSV readers shared from comp-genie/src and inspection-app/src).
- Storage: IndexedDB `aa-orders` (orders, docs with file blobs, kv) on sbappraiser.github.io; clients/AI wording/rates stay in localStorage `el.*`. Nothing leaves the computer. Back up = one zip (orders.json + documents/). Restore takes that zip or the old letter-writer backup .json (how she moves her clients/orders over).
- Order = the letter fields + order status (New … Delivered/Paid/Cancelled), inspection date/time, effective date (typed, else date of death for retrospective types, else inspection date), APN, county, owner, unit, lat/lon, legal, borrower, lender (if different), AMC (name, address, license/registration, state, expiry, AMC fee, reference ID), notes, inspection to-dos, documents, crs, listings, permits. Autosaves while typing (clients are added only on a real save / leaving the order).
- Documents: one drop box; type found from page-1 text, then file name (scans fall back to the name; she can change the type). CRS read first in a batch. CRS → subject facts (address if blank, APN, owner, county, lat/lon, legal; public-record table WITHOUT beds/baths/sq ft). MLS CSV/PDF → only rows that are the subject (APN or address) go to listing history and set the letter's listing/contract line. County permit history → kept unless it is for another parcel. Client letter → existing AI/confidentiality scan. Floor plan (image or a chosen PDF page) → picture for the iPad.
- Comp genie: `?order=ID` opens or creates the job for that order (job.orderId); "From an order…" picker; reads aa-orders read-only and never creates it.
- iPad (inspection 6e): home "Active orders" from the Active Orders.json file (OneDrive/iCloud → Files); Start inspection prefills address, ZIP+4, county, year built, flood, permits, inspection date, and a "From the order" box (client, type, access contact with tap-to-call, to-dos with checkboxes, MLS history, document list). Floor plans appear in Sketch → More → Floor plan underlay. CRS beds/baths/sq ft removed from the inspection's CRS box and never stored.
- Next: inspection export coming back and attaching to the order; client-letter requirements → to-dos automatically; USPS address check; invoice at delivery.

## Market conditions (built in the order hub, Market tab, Oct 14 2026)
Source orders/src/market.js. Per order (order.market): lookback, rows from her SBMLS CSV, excluded listings, property-type filter, her choices, texts. Shared (kv): mk:stats (parsed monthly SBMLS PDFs by month), mk:zillow (by city, typed by her), mk:boundaries (saved named market areas).
- Status on the effective date is worked out from the dates (Begin, Under Contract, Sold/COE, Withdrawal/Cancel/End or Status Change for off-market, Fallthrough), so retrospective dates work; actives' DOM = MLS DOM for current dates, else effective date − list date. Two-unit addresses (2535/2537, 18-20) are left out by default; she can tick them back.
- Suggestions (she confirms): months of supply < 4 Shortage, 4–6 In Balance, > 6 Oversupply; marketing time from median cumulative DOM of the sales (<90, 90–180, >180 days); distressed = REO / bank owned / foreclosure / short sale / notice of default (estate and trust are not distressed).
- Trend: log-linear $/sq ft vs date, reported only with ≥ 6 sales; < 3%/yr or R² < 0.15 → "no consistent trend".
- SBMLS PDF parser: Summary of Stats, Previous Year Comparison, YTD pages, and month-by-month charts (values matched to month labels by position; a chart that does not end at the report month or has months out of order is skipped with a note – the Sept 2026 condo charts are like that). Checked against her commentary's 24-month list: all match.
- Draft 17.019 ≤ 2,500 chars, parts dropped in priority order when long; 17.004 drafted from the search; 17.003 hers (saved areas). Graphs: price trend (dots + monthly or quarterly median; per sq ft option), absorption (sales per month), South Coast median by month; saved as PNG.
- Samarkand test (eff 10/14/2026, 12 mo, duplexes out): 2 active ($1.30M/$1.64M/$1.99M, median DOM 86), 1 pending, 12 sales ($1.125M/$2.14M/$6.3M), 2.0 months supply → Shortage, Under 3 months, no distressed.
- Later: MISMO export of section 17 with the report; Zillow Research CSV import; condo/HE segment choice override.

## Document reader (hub, Oct 14 2026) – orders/src/reader.js
- "Read" on each document opens the reader: page picture (pdf.js) on the left, a checklist for that kind of document on the right (contract, counter, addendum, leaseback, prelim, legal, condo questionnaire, HOA budget, CC&Rs, bylaws, minutes, disclosures, budget, plans, specs, permit records, client letter). Approval queue: suggestions → Accept (as shown or edited) / Reject; own entries keep the page. Accepted → order.facts [{docId, doc, type, key, label, value, page, by}] shown under Documents. Search box searches the text of every document in the order and opens the page with the word highlighted.
- Text per page cached on the docs record (pagesText, scanPages, garbled). FINDINGS: C.A.R. forms (RPA, RLAS, counters) print in scrambled fonts – only typed-in entries extract – so their checklist is hers or Claude's; scanned PDFs (purchase_contract.pdf, budget) have no text: reader tells her to run Acrobat Scan & OCR → Recognize text and drop the file again (browser OCR library not reachable from the build machine; revisit tesseract.js later).
- Preliminary title reports are read from the text: dated as of, vesting, estate, APN, taxes, 24-month transfers, numbered exceptions sorted into taxes / easements / CC&Rs / liens / other (tested on the First American prelim, 1545 San Roque).
- Read with Claude (Layer 2): only when the order's AI use is Yes or Redacted, with her API key (Standard wording → AI settings; localStorage aa.claudeKey / aa.claudeModel, default claude-sonnet-5-5). Sends JPEG page pictures (max 30 pages a time), never the file. Redacted: names from the order (clients, borrower, owner, decedent, access contact, lender, AMC, file/loan/AMC ref), accepted buyer/seller/vesting names, her "also remove these names" list, emails, phones, GUIDs (DocuSign IDs), case/loan/escrow numbers – painted black into the pixels; she drags boxes over signatures/initials; every page shown before sending. Results come back as suggestions with page and quote; order.aiLog records date, document, pages, mode, model. Tested with a mocked API (no key yet).
- Her rules (Oct 14): PRELIM – summarize only exceptions/exclusions worth noting: easements, restrictions/CC&Rs/reservations, oil/gas/minerals/wells, encroachments/survey, items to clear before a transfer (judgments, liens, delinquent taxes). Leave out deeds of trust, trust requirements, general printed items, paid tax installments. Standard statement: not a title expert, assumes marketable title, client to consult a title officer, brief summary only. She decides effect on market appeal/marketability. CONTRACT – final negotiated price, acceptance date, personal property, leaseback, credits, buyer broker (who pays, % or $), counters/addenda summary, loan contingency Y/N, appraisal contingency Y/N, entity signers (who, which entity), court-ordered/estate/trust/trustee/atypical terms, written-in terms only (not pre-printed); packet sentence "I received a 75-page document which contains a 17-page purchase contract, 2 seller counter offers, 1 buyer counter, 2 addendums, a lease agreement, a 1031 exchange agreement, and multiple agent/broker disclosures".
- Built for those: prelim reading per her rules + title summary draft + UAD 3.6 site encumbrance answers (4.050/4.051/4.055/4.068/3.029); contract checklist + "Parts of this document" (sentence built automatically; page count only for the purchase agreement) + UAD 3.6 sales contract (20.002, 20.004–20.010) + 20.011 analysis draft (5,000 chars). Stored: order.uad, order.review[docId].parts.
- Sticky notes (order.stickies: doc, page, tag Important / Affects market appeal / Clear before transfer / Ask the client / Put in the report / Follow up, done); listed under Documents with a tag filter; search covers document text, sticky notes and accepted entries (Search button + Enter).
- Redaction preview: drawn boxes can be Black box or Blur (18-px mosaic + blur, original pixels gone); Undo last box. Text matches are always black.
- Scanned PDFs (JBIG2, JPEG 2000) needed pdf.js's wasm decoders: vendor/pdfjs/wasm + standard_fonts are copied into docs/ by orders/build.py; every getDocument passes wasmUrl './wasm/' and standardFontDataUrl. Genie and inspection sources now pass the same options – copy vendor/pdfjs/wasm and standard_fonts into their dists the next time their zips are made.
- Help tab in the hub: step-by-step directions for every process, with a search box. KEEP IT CURRENT with every new feature.
- To do (her request): BLUR tool on the iPad photo pages (people, artwork, family photographs, religious symbols, graffiti, personal items); keep the unblurred original in the workfile; same tool in the photo review screen. Usually a lender/AMC requirement (not USPAP); USPAP's concern is that a report not be misleading, so note in the report that photos were edited for privacy.
- Next: requirements checklist from the client's letter → iPad to-dos; contract facts → UAD 3.6 contract section export; workfile AI note text in her wording.

## Redact a copy (Oct 15 2026)
Reader → "Redact a copy" (every order, no AI needed): same redaction screen as Read with Claude (auto black boxes from order names/patterns, extra names, drawn black/blur boxes) → "Save redacted PDF": a PDF made only of JPEG page pictures (jpegPdf in reader.js; no text layer, no metadata from the original) → Downloads + added to the order's documents as "<name> - REDACTED.pdf". Up to 200 pages a time. Send to Claude from that screen only on AI orders.

## Assignment types for lender/AMC orders (Oct 15 2026)
Group "Lender or AMC order – UAD 3.6": uadPurchase, uadRefi, uadHeloc, uadConstruction (premise default "as completed as of today"), uadOther – defined with UAD36() in engagement-letter-writer/src/clauses.js (Fannie-style intended use, federal market value definition, AIR/Reg Z statement). Choosing one sets My letter to "Not needed – client's letter" (still editable). Order fields govAgency (UAD 2.008 FHA/VA/USDA) and investorId (2.009). Old "Lending" types are now under "Private lending".

## Master checklist
Her live checklist page (she ticks items and adds her own): https://claude.ai/artifact/FZzBaFYusgsZtyQeajE2jy — read it (Artifact action "read") at the start of a session to see what she has checked or added. CHECKLIST.html here is the Oct 14 2026 starting copy only.
