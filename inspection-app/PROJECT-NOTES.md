# UAD Field Inspection app – project notes (Oct 11, 2026)

## Where things stand
- Live app: your GitHub Pages site (7 files: index.html, sw.js, manifest.json, icon-192.png, icon-512.png, pdf.min.mjs, pdf.worker.min.mjs).
- Latest version sent Oct 11: index.html with stoplight checks, mint/powder-blue/lilac/tangerine colors, template-style comments,
  high-end finishes, SFREP mapping fixes, storage check / recovery, interview tab rebuild.
- Tested: SFREP Home > Import Forms works with the app's "– SFREP.zip" (options: all three forms checked,
  Overwrite populated fields ON, Include extended comments ON).

## To check next time
- Re-export the Berkeley test and import into SFREP: red comment fields gone? shed photo in main box? shed Type filled?
- If SFREP shows red fields, hover them and note SFREP's message.

## Planned (in suggested order)
1. Sketch module (separate page first): grid, 0.1 ft keypad, arrows + 45/30/60/custom angles, backspace = remove last wall
   (repeatable), undo/redo, auto-close, tap wall to edit length, tap area for properties (name/type/level/rotate/delete),
   rotate one/all, area-inside-area (garage within building, subtracts), interior walls, room labels (send Apex label list),
   symbols (fireplace, wood stove, stairs...), patios/porches/decks/balconies, UAD levels (above / partially below / below grade),
   ANSI Z765 totals, Apex-style summary + rectangle breakdown page, SFREP sketch exhibit + area fields.
   Open question: do you sketch in Apex inside SFREP today?
2. Voice notes + photo AI suggestions (Claude API via a small relay; "AI off" per inspection; AI log saved to workfile).
3. Engagement letter PDF import.
4. Desktop companion: My Cost Library (your cost breakdowns, ranges, time-adjusted), market-extraction worksheet
   (site value, contribution, depreciation), adjustment check (narrowing range, ±25% sensitivity, bracketing),
   trend charts from MLS CSV export, comps/map from MLS export.

## Files in this zip
- src/ – app source (schema.js = fields & options, summary.js = comments, export.js = SFREP/workfile, ui.js, styles.css)
- build.py – builds dist/index.html from src
- dist/ – the 7 files that go on GitHub

## v5 (Oct 11, 2026) – condo / co-op / PUD, extraordinary assumptions
- Property type: legal structure (Condominium/Cooperative/Condop), condotel flag, structure design (attached), townhouse end/back-to-back/stacked/location, special tax assessments (Mello-Roos).
- "Project / HOA" tab: observed project items + "HOA – ask the owner" (contact, dues + frequency, what dues include, owner-known special assessment). Questionnaire/MLS/HOA-doc items removed (entered in SFREP later). Tab also shows for a voluntary HOA / road association (Interview "HOA?" = Yes). Old Interview HOA block migrated.
- Garage: project parking (parking garage / common carport / open lot, assigned/unassigned/owned), carport attachment.
- Interior: floor number, corner unit (low/mid/high-rise), unit non-residential use and live/work (site owned in common), below-grade finish vs above, unit location/exposure.
- HOA maintains exterior (hoExt = No): exterior component conditions and exterior Q/C optional and not exported.
- Interview: extraordinary assumptions / hypothetical conditions list -> Assignment Information and Scope of Work Commentary (2.061).
- Wrap-up: Market value condition (As Is / Subject to...) with defect cross-check.
- Export: PROJECT, HOMEOWNERS_ASSOCIATIONS, PROPERTY_TAXES, DATA_SOURCES + RELATIONSHIPS, project commentaries, VALUATION_CONDITIONS, project photos.
- Fix: exterior quality/condition ratings now exported (were read from the wrong section).

## Sketch module – user's Apex lists (received Oct 11, 2026)
Labels (user adds custom ones often): 1 Car, 1 Car Garage, 1/2, 1/2 Bath, 2 Car, 2 Car Garage, 3 Car, 3 Car Garage, 4 Car, 4 Car Garage,
Above Grade Living Area, Area, Atrium, B-Fast, Balcony, Bath, Bath 1-5, Bed, Bedroom, Bedroom 1-5, Breakfast, Butler's, Carport, Cls, Deck, Den,
Dining, Dining Room, Dressing, Elev., Entrance, Entry, Family, Family Room, Finished, Foyer, Gallery, Garage, Gross Living Area, Gym, Hallway,
Kitchen, Laundry, Library, Living, Living Room, Lndry, Loft, Loggia, Master, Mech., Mechanical, Media, Mud Room, Office, Pantry, Patio, Pntry,
Pool, Porch, Primary, Rec., Recreation, Room, Sitting, Spa, Stable, Stairs, Stg, Storage, Stove, Study, Suite, Tack Room, Tennis, Unfin.,
Utilities, Wet Bar, Wood, Wood Deck.
Area definitions (Apex): GLA / GLA1-4; GBA1-3; Finished BSMT; Unfinished BSMT; P/P (Patio/Porch, Enclosed Patio, Covered Patio, Patio, Porch,
Wood Deck, Balcony); GAR (1-4 Car Garage, Garage, Carport); OTH (Gazebo, Shower, Changing, Attic - Unfinished, Attic, Incomplete finished
basement, Salon/Massage, Spa/Sauna, Wellness Center, Yoga Pavilion, Tennis Pavilion, Hot Walker (Horse), Bath 1, Bath 2, Gym, Sauna, Stairs,
1/2 Bath, Guest Apartment, Recreation Room, Media Room, Pool Bath, Stable, Studio, Guest Studio, Mechanical, Pool Equip, Laundry, Shed, JADU,
Workshop, Barn, Office, Cabana, Pool House, Storage, ADU, Guest Quarters, Guest House); NCA; UND.
To do: rename GLA areas to UAD 3.6 / ANSI terms (finished above grade, nonstandard, unfinished, below grade); "Master" is flagged as bias wording.

## v6a (2026-10-13) – sketch merged into the real app
- The TEST copy (versions 1a–1m, see PROJECT-NOTES-sketch-history.md) is now the production app. Same database name 'uad36-inspect' (IndexedDB upgraded 1→2: adds the 'sketches' store; inspections and photos untouched – verified with a v1 database).
- Files served: index.html, sketch.html, sw.js, manifest.json, icons, pdf.js. sketch.html shares the database with the inspection page.
- sw.js: cache name 'uad-inspect-'+BUILD (rewritten by build.py); activate deletes only caches starting with 'uad-inspect-' (the old 'uad-inspect-v3' cache is removed on first update). Cache-first navigations with background refresh.
- build.py: BUILD='6a-MMDD-HHMM' injected into both pages. APP_CFG={db:'uad36-inspect'} in both templates (no test flag → no banner).
- The old pre-sketch source is kept in src-v5b-backup/ for reference.

## 6c (Oct 14 2026)
- Project amenities: removed Airstrip, Boat Ramp, Boat Slip, Community Pier, Door Attendant, Outdoor Shower, Outdoor Riding Ring, Registration Services, Built-in Pool (kept Inground Pool; Built-in = pool built into a structure). "Common areas observed" (her own list, not UAD) merged into amenities as "Other:<name>" → AmenityType Other + description. Added Golf Course (Pitch & Putt).
- Age-restricted (55+) → ENCUMBRANCES / CONDITION_COVENANT_RESTRICTION RestrictionType Age (1.025, 4.052–4.053).
- Common area condition "Well Kept" shown as "Adequately Maintained" (workfile/comment only, not a UAD field).
- HOA: "Does the owner have an HOA contact?" (replaces hoaNoContact; migrated). Dues and all $ fields have an on-screen 10-key. Utilities "Other" gets picks (Trash, Cable/Internet, …) each sent as Other + description. Dues-cover list no longer has pool/spa, elevator, security gate, doorman/concierge. Mandatory club membership (name, initiation, monthly dues → ClubMembership amenity + comment). Land lease (monthly → annual ProjectAnalysisGroundRentAmount, expiry, notes).
- Sketch: keypad digits on pointerdown, only the length box updates (no lost/double taps); header "Save to inspection" button grey → green after saving, grey again after a change; Bedroom 1/2/3, Bath 1/2, Half Bath 1 numbering; label names title-cased (small words lower) with word suggestions.
- Includes the CRS sales-row fix.

## 6d (Oct 14 2026)
- Interior walls (SK.sk.iwalls [{id,a,b,level,pg}]): thin lines, never change area. Tool "┼ Interior wall": tap start/end (snaps to corners, wall points – square to the start when close – then 0.5 ft grid at 45° steps), keep tapping to chain, or type a length + arrow. Select → set length / delete. Included in undo, versions, rotate-all, print; move with their area when the area is dragged (with symbols/labels inside).
- Doors (symbols with door:true): Door, Double door, Sliding door, Open doorway, Exterior entry (door + arrow). "◜ Door" button. Dropped within 3 ft of a wall they seat on it and swing into the room; Hinge side / Swing in-out buttons; width only. Opening painted in the room's fill colour.
- L-shaped stairs symbol.
- Floor plan underlay (More → Floor plan underlay): picture or PDF page (choose page), stored as 'under:<id>' record in the sketches store, faint on screen only (never printed); set scale by tapping two points + real length; move; lighter/darker; turn 90°; hide; remove.
