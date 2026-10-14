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

## TEST copy (inspect-test) – sketch stage 1 (Oct 12, 2026)
- Separate DB "uad36-inspect-TEST" (v2, stores inspections/photos/sketches), cache prefix "uad-test-" (SW only deletes its own prefix), name "Inspect TEST", purple bar + banner.
- sketch.html = separate page (own memory); shares storage; ?ins=<id>&tab=<tab>; Back -> index.html?open=<id>&tab=<tab>.
- Sketch: keypad lengths 0.1 ft, 8 arrows + any angle, backspace (digit, then walls; reopens closed area), auto-close at start, Close/Stop, tap wall to edit length (later corners shift), area properties (name, type, level), rotate 90/any, rotate whole sketch, drag to move (snaps to corners), labels (her list + custom saved), custom area types with UAD bucket, levels L1-L10/B1-B5 with ghost outlines, nested areas subtracted, totals by bucket/level, undo/redo, 25 saved versions, library export/import.
- Inspection: ins.sketch.totals; Interior "Area from the sketch" review; sketch image photo (SubjectPropertyImprovementSketch).
- Export: PROPERTY_UNIT_AREA six measures, LEVEL finished/unfinished per level, CarStorageAreaMeasure (garage/carport).
- TODO real app: sw.js cache cleanup must only delete its own prefix ('uad-inspect-') before both apps share the site.
- Stage 2 ideas: icons (fireplace, stairs, wood stove), interior walls, auto-create rooms from labels, outbuilding/ADU/amenity areas into their lists, sync levels with Levels list, dims of shared walls.
- Stage 1b: angle dial (drag, ±1/±½°, turn left/right 22.5/45/90 from last wall, live dashed preview), curved walls (bow depth at middle, flip side, half circle, make straight; arc length shown; areas use the true curve), SW pages cache-first (uad-test-v2), pages cached under plain URL.
- Stage 1c: sketch saves totals to the inspection after every change (not only on Back); saves on pagehide; Saved ✓ time + storage warning; inspection flags out-of-date sketch image; home shows 'opened from Home Screen icon' vs 'opened in Safari' + Safari warning.
- Stage 1d: room labels linked to Interior lists (bedrooms/baths/kitchens/wetbars/rooms; same room types as the app; custom rooms saved as Other+name; links to existing rooms first; never deletes; removed-label Check), levels synced to Levels list, LEVELS_ALL L1-L10/B1-B5; cursor (tap empty space / start mode) + Jump to nearest corner (press again = next nearest) + Start here / New area here / Label here; Center + Fit all; drag-to-draw from the orange pen point (45° and corner snapping, 0.1 ft), press-drag from a corner in start mode, hold a corner 0.45 s to start a new area of the last type; Apple Pencil draws from anywhere while drawing (fingers pan).
- 1e: version stamp (BUILD) on banner, sketch header and error box; cache name = build (fresh offline copy each update; fetches bypass GitHub's 10-min cache); Sketch button never waits >1.5 s for saving; sketch shows an error with Back if not open in 6 s.
- 1f: storage hardening for iPad page switching: each page finishes saving and closes its storage connection before switching (no writes while leaving; reload if a frozen copy is shown again); open retries (wake-up + up to 4 attempts) and every request has a time limit; sketch boot reports the exact step if it cannot open (15 s).
- 1g: line-up dots while drawing (right/left/up/down from the pen point, at every corner x / y on this level and other levels; nearest 8 per direction; no backtracking dots; length shown; green = closes); tap a dot or the green start to draw the wall; drag drawing snaps into line with corners (dashed guide); toggle 'Line-up dots on/off' (remembered).
- 1g (rebuild): line-up dots stay visible while dragging and are magnetic (24 px) – drag toward a dot and the wall lands exactly on it.
- 1h/1i: Apex-style area calculations: each area sliced into rectangles/trapezoids/triangles (best of each wall direction), curves as circular segments, 'less' for areas drawn inside; exact areas used everywhere. Letter-size sketch pages (1700x2200): levels top floor first with name + sf at right, one scale for all levels (shrinks up to 40% to save a page), AREA CALCULATIONS SUMMARY (Code/Description/Factor/Net Size/Perimeter/Net Totals, Finished Above Grade cnt + rounded) and BREAKDOWN (Name/Base x/Height x/Width =/Area; finished above grade first, other areas after), continues onto more pages; each page saved as a sketch photo (SFREP SubjectPropertyImprovementSketch); Sketch.pdf in the workfile; calculations also in Totals sheet and workfile notes.
- 1j: label picker '＋ New label or room' (name + Room / Bedroom / Full bath / Half bath / Just a label; remembered in the library, rooms go to the Interior tab). Symbols (◫ Symbol): fireplace, corner fireplace, double-sided fireplace, wood stove, stairs (width/length −/+ or typed, arrow shows up direction), spiral stairs, elevator; rotate 90/45, drag to move, in undo/versions/pages; rotate-whole-sketch carries symbols. More menu: Text size and Dimension size (60–250%, remembered, applies on screen and pages); Area colors on/off (colors come from the UAD category of the area type: finished = cream, garage = blue-grey, ADU/guest house = lavender, etc.). Area names: automatic spot avoids room labels and symbols using real text width at the drawing scale (fixes garage name over 'Workshop Area'); per-area Name position Inside / Above / Below / Left / Right or drag the name anywhere (a.nameAt = mode or {x,y}; dragged names move/rotate with the area; page layout makes room for outside names). Wall lengths never print inside a neighbouring building; page level title moved clear of right-hand dimensions.
- 1k: tap-to-turn. Selected area, symbol, or whole sketch (More → Turn the whole sketch) shows ↺ / ↻ buttons that turn by a step per tap (90/45/30/15/5/1°, remembered, default 30° so 6 taps = upside down), a running 'turned N° left/right' readout, and Exact… for typed degrees. Whole-sketch turning keeps a fixed centre while tapping and saves one version on Done. Removed the old ↻90°/Rotate…/↻45° buttons. Delete on a label or symbol is instant (toast; Undo restores); areas still ask first.
- 1l: press-and-hold (~0.3 s) on an area name, label or symbol picks it up without tapping first (darker orange + small vibration where supported), then drag; a quick swipe still pans. Selected area's name gets an orange box. Name buttons refresh after a drag. Research note: Fannie Selling Guide 'floor plan' definition requires all levels, exterior wall dimensions, interior walls, doorways, staircases, exterior ingress/egress, room labels and calculations – interior walls/doors not built yet.
- 1m: sketch pages. Every area/label/symbol carries pg (default 1); SK.sk.pages = [{n, name}] (default 'Main house'); page chips + '+ Page' left of the level chips; tap the current page chip to rename/delete. Each page has its own levels; screen shows only the current page. Other levels on the same page are solid grey outlines tagged with the level name (no more dashed). '+ Level' offers 'Copy the outline' of the current level's living/unfinished areas when the new level is empty; area context '⧉ Copy to level' and 'Move to page' (takes labels, symbols and areas inside it; can create a new page). Printing: each page starts a new sheet with its name as a heading (headings only once pages exist); levels top-first within a page; level title shown when finished area or more than one level; calculation boxes cover all pages at the end. Undo covers page list. Paper-size constant renamed PAGE_SIZE.
- 1m (rebuild 2008): pages are optional – with one page only a '+ 2nd page' chip shows (no page chips, no page heading on the printout); default page name 'Page 1'. Sketch output still spills onto extra sheets automatically when one sheet is too full.
