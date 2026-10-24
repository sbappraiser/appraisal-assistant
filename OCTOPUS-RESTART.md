# THE OCTOPUS – restart file (paste this into a new Claude chat)

Last updated: Oct 22, 2026 (evening). Owner: Jennifer Heath, SRA, AI-RRS – certified residential appraiser,
Santa Barbara County (Montecito 93108, Hope Ranch, Summerland, Carpinteria, the Mesa, Goleta). Complex,
high-end, non-conforming properties. Not a developer: explain in plain words, give click-by-click steps.

**To Claude reading this:** this file is the map. The full detail lives in the GitHub repos below – before
doing any work, get access to all three repos (Claude Code on the web: add the repos to the session) and
read, in `sbappraiser/appraisal-assistant`: `CLAUDE.md`, `APPRAISAL-ASSISTANT-NOTES.md` (dated log of every
change and decision, ~900 lines) and `APPRAISAL-ASSISTANT-PLAN.md` (original plan). Then pick up from
"Open items" at the bottom. Never guess – check the code and notes.

---

## 1. Her rules (non-negotiable)
- **She makes every final decision and determines market value.** The apps never choose comps, Q/C
  ratings, adjustments, weighting or value. They gather, read, sort, chart, calculate (once she gives the
  rate or tier), suggest, reword (her click to use), check (errors, typos, math, redundancy, bias / banned
  words, USPAP, client guidelines), remind and guide.
- **Databases are never changed without her OK**: show what would change first, keep it for undo, log it.
- **Data from one property never mixes into another.**
- **Never commit her data** to GitHub: the ACI comp archive, CORT, client documents, client list, her
  reports, rent surveys, cost database, uploaded ACI XML. Her e-mail is for identification only.
- She does **not** appraise manufactured homes, ground leases, community land trusts, 2–4 units, high
  rises, or do hybrid assignments; no lava zones, hurricanes, cesspools, engineered septic. Trim those
  choices from drop-downs (adjustable in Settings) and from comments.
- UAD 3.6 field names and choices must match **Fannie Mae Appendix A-1**; required fields per A-1 / F-1.
  Ask her for the A-1 spreadsheet if needed (not stored in the repo).
- Every enumerated UAD field gets a drop-down from A-1.
- Each answer has ONE home (no entering the same thing twice).
- Front door only: public specs, her own downloads/exports, public map services. No logging into
  MLS/CRS on her behalf, no scraping, no Esri/CARTO maps (license). Her ACI archive was built by reading
  her own ACI data files – keep it private; never offer that reader to others.
- After every change: update the hub **Help** tab and `APPRAISAL-ASSISTANT-NOTES.md`, rebuild, test in
  Chromium (Playwright), push to all three repos. Commit trailer is required (see CLAUDE.md).

## 2. The three apps ("the Octopus")
She calls the whole system **the Octopus** (formerly "Appraisal Assistant"): a HEAD plus nine TENTACLES
per order. Her map: Claude Doc **"The Octopus – where everything lives"**
https://claude.ai/artifact/U8jYQEFoeKGdEqEt7yrPaU (decisions, field accounting, build order).

| App | Runs on | Link | Repo | Source in session |
|---|---|---|---|---|
| Octopus hub (head + tentacles 1–9) | Chrome on her PC, installed as an app | https://sbappraiser.github.io/appraisal-assistant/ | sbappraiser/appraisal-assistant (`orders/src` → `python3 orders/build.py` → `docs/index.html`) | the repo |
| Comp genie (help for tentacles 3–6: grid, adjustments, cost, income, maps) | inside the hub (and standalone) | https://sbappraiser.github.io/comp-genie/ | sbappraiser/comp-genie (built `index.html`) | source in appraisal-assistant `comp-genie/src` + `build.py`; working copy /home/claude/genie |
| UAD 3.6 Field Inspection (iPad and iPhone) | Safari → Share → Add to Home Screen | https://sbappraiser.github.io/Inspection/ (capital I) | sbappraiser/Inspection (`index.html`, `sketch.html`, `sw.js`) | source in appraisal-assistant `inspection-app/src` + `build.py` + `sw.js`; working copy /home/claude/uad |

Builds: genie `python3 build.py` → `dist/index.html`; iPad `python3 build.py` → `dist/index.html`,
`dist/sketch.html`, `dist/sw.js`; hub `python3 orders/build.py` (pulls `comp-genie/src`). Copy src +
build.py back into the appraisal-assistant repo before committing. Clone fresh in a new session.

**HEAD:** Home, Library (UAD 3.6/2.6 guidance, USPAP, rules, her PDFs; search by field number),
Common responses (her comment library + 97 UAD 3.6 starter comments within field limits), Databases
(Database center), Claude, Settings, Help.
**TENTACLES:** 1 Intake · 2 Subject · 3 Market · 4 Sales comparison · 5 Cost · 6 Income ·
7 Final reconciliation · 8 Review and wrap-up · 9 Exhibits. Required fields are grouped by tentacle,
not URAR order. The pre-check lists every A-1 "always required" field that is missing, with its tentacle.

## 3. Where the data lives (her computer / devices – NOT GitHub)
- Hub and genie: Chrome IndexedDB on sbappraiser.github.io (`aa-orders`; genie jobs, archive, CORT,
  land sales, cost database, rent database, maps). Chrome must keep site data (fixed Oct 2026 after a
  loss). Daily backup zip + "Appraisal Assistant documents" folder in her backup folder.
- iPad / iPhone: each device keeps its own inspections (IndexedDB, Home Screen app). Move an inspection
  between devices with **Export › Workfile** (… – Workfile.zip) → Restore backup / Get orders on the
  other device. The SFREP.zip is for the computer only. Orders go to the devices with "Send active
  orders to the iPad" (Active Orders.json via iCloud Drive or OneDrive).
- Her databases: ACI comp archive (23,918 records, 2.6), CORT weekly closings, land sales, construction
  cost database (her spreadsheet), rental database (from her ACI rental comps – old rents must be
  updated before reuse), client list, comment library. AI key: her own Claude API key, saved per device.
- AI use per order: Yes / Redacted / No (No = nothing sent).

## 4. What each part does (summary – details in NOTES)
- **Intake (1):** order, file number, documents (engagement letter, CRS, MLS, title, contract,
  permits), engagement-letter clause scan, client requirements, 1004MC, invoices, send order to iPad.
- **Subject (2):** one home for subject facts, HBU, approaches, assumptions; iPad workfile import;
  24+ UAD fields with A-1 drop-downs.
- **Market (3):** market conditions from MLS CSV; boundary and search criteria (17.003/17.004).
- **Sales comparison (4) – Comp genie:** comps from MLS CSV / CRS / CORT / archive; UAD 3.6 grid with
  ▾ pick lists; quality/condition tiers; time adjustment; grid workbook; grid review flags;
  **Adjustment methods compared**: sensitivity (grid comps), sensitivity on **similar market-area
  sales** (her choice of months and size range), grouped sales, regression (all or similar sales),
  matched pairs, depreciated cost (upper limit). Each answer ● enough data / ⚠ care / ✗ not enough
  data – do not use; she ticks ✓ the method(s) she relies on → "HOW THE ADJUSTMENTS WERE DERIVED"
  paragraph; "Why do these disagree?" asks Claude with numbers only. Comment drafts; 2.6 copy sheet
  for ACI (incl. Improvements condition line). Exports UAD 3.6 MISMO for SFREP.
- **Cost (5), Income (6):** cost approach with her cost database; rent schedule, GRM, rental database.
- **Reconciliation (7), Review (8):** reconciliation, certifications, alternate value, reconsideration of
  value, revision history; pre-check (A-1 required fields, brackets, banned words, math).
- **Exhibits (9):** location, rental, **market area map (she draws the boundary)**, aerial (USDA NAIP
  1 ft), **FEMA flood map (zone, FIRM panel + date, BFE, LOMR/LOMA)**, **CAL FIRE wildfire map
  (SRA 2024 / LRA 2025)**; map styles; edit map (move/relabel labels, own labels). Maps tested only
  with stand-ins – confirm live in her browser.
- **iPad / iPhone app:** inspection by area tabs, dictation tuned to her words, Walk-through tab
  (place + photo + talk + sketch), summaries with 3.6 starter comments, CRS and permit PDF readers,
  workfile + SFREP export. Soft colors (baby green required, blue optional, yellow current, pink
  picked, green ✓ done, red missing); ☀ Outdoor = electric colors for sun (per device). iPhone layout.
- **Sketch (iPad/iPhone, being refined with her now):** main bar (＋ New area, Label, Symbol, Door,
  Interior wall, Rotate, Center, Undo); ＋ → drawing pad floating over the sketch (keypad, arrows,
  compact ∠ angle circle with ✓ Draw this wall / tap the ✓ at the line's end, ⬠ Close, ✓ Save to
  inspection, 🛑 Stop, ↶ Undo, ⌒ Curve, ⌖ Center); ⌫ = backspace; line-up dots (also for interior
  walls and other levels); orange start point you can move with length + arrow, tap it to start;
  levels (tap the active level to delete it; other levels grey with lengths; Clone a level);
  interior walls → "Make these walls an area"; Undo survives reopening; ⓘ = directions; ☰ menu.

## 5. UAD 3.6 reference she supplied (ask her to re-upload if needed)
Appendix A-1 (xlsx), F-1 field list, D-1 sample XML, Appendix D v1.7 (2.6, text kept in
`reference/UAD26_Appendix_D_v1.7.txt`), GSE XSD order (in code: `xsdorder.js`, `d1order.js`), her SFREP
template. SFREP import: Home → Import Forms. XML must follow XSD element order.

## 6. Recent versions (Oct 22, 2026)
- iPad/iPhone app **6x-1024-1527** · OctoSleuth **g2-1024-1526** · hub **o1-1024-1527**.

## 7. Open items (pick up here)
1. **Sketch on iPad/iPhone** – she is testing on her phone and iPad and sending screenshots; keep
   refining until she says it is settled.
2. **Desktop sketch in tentacle 2** (proposed construction from architectural plans; reuse the iPad
   sketch with the floor-plan underlay; totals + image to the subject) – after item 1.
3. **Waiting on SFREP (Charles Jones, charles@sfrep.com):** she sent Oct 22 the D-1 SF1 sample + list – import drops the Add Other line entirely (her Usable Lot Area/Utility) and the unit / misc amenity adjustment amounts (comp counts DO arrive). Berkeley Test6 imported Oct 22: still to check by hover – red Dimensions and red $0 grid boxes (see notes g2-1023-0426).
   **Waiting on her:** try the flood and wildfire maps live; try Adjustment methods compared on a live order;
   ACI menu screenshots / an .RPS file; what the YouTube link showed; old rent survey PDFs (optional).
4. Done Oct 22: accessibility, water frontage, outbuilding utilities sent; 2.6 condo formats. Still open:
   ADU line in the rent schedule. Starter comments doc for her review:
   https://claude.ai/artifact/PSjqkYGdpSKj9p1N8v6txu (apply her edits to the apps).
5. BUILT Oct 22 (o1-1022-2340, orders/src/inbox.js; Help › Inbox has her Microsoft 365 steps – she still has to make the 2 shared mailboxes + 2 Power Automate flows): hub Inbox folder (OneDrive › Appraisal Assistant › Inbox › CORT / MLS) checked on open, show-first + undo + log; CORT emails saved there by a Power Automate flow in her own Microsoft 365 (no outside services); daily flexmls hotsheet = her saved search exported to Inbox › MLS (no MLS login by the Octopus); CORT PDFs read on her computer (browser OCR) later. Third folder: Inbox › Agent emails – a Microsoft 365 alias she gives agents (e.g. listings@…), Power Automate saves each email + attached photos; the Octopus reads them on her computer (text + attached pictures only, never links or web images) into a 'Listing emails' database by address (her OK, undo, log); the Comp genie shows them when that address is a comp. Her saved backlog of agent emails (Outlook) can be dragged out as .msg files into that folder once.
   Optional offer: automatic device sync (would store inspection data online – her decision).
   Business idea (subscription for other appraisers): logo concepts https://claude.ai/artifact/VXvm911a4KTwinhwQAvmnv;
   her design summary for the IP attorney https://claude.ai/artifact/9BMfz4mZUCQkD6xieYMmKb.
6. Name: she may rename "the Octopus" (ideas were offered).

## 8. How to restart in a new chat
1. Start a Claude Code session on the web with the three repos (sbappraiser/appraisal-assistant,
   sbappraiser/comp-genie, sbappraiser/Inspection) and push access.
2. Paste this file, then say: "Read CLAUDE.md, the NOTES and the PLAN in appraisal-assistant, then
   continue with the open items."
3. For anything that needs her data (archive, CORT, cost database, A-1 spreadsheet, test workfile),
   she attaches the files again – they are never in GitHub.
