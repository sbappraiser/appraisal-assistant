# Working on the Appraisal Assistant

- The user is an appraiser, not a developer. Explain in plain words; give click-by-click steps for GitHub and Chrome.
- Read `APPRAISAL-ASSISTANT-NOTES.md` and `APPRAISAL-ASSISTANT-PLAN.md` before starting work; they hold her decisions (adjustment method, view tiers, subject beds/baths/sq ft never prefilled, etc.).
- Never commit her data (archive, CORT, client documents, client list). See `.gitignore`.
- UAD 3.6 field names and enumerations must match Fannie Mae Appendix A-1; ask her for the spreadsheet if it is needed (not stored here).
- Each app: edit `src/`, run `python3 build.py`, test in Chromium (Playwright), then deliver the built files.
- Order hub built (o1, Oct 14 2026; see notes "Order hub"). Build with `python3 orders/build.py` → `docs/`. Market conditions are on the hub's Market tab; client requirements, 1004MC, invoices and contract suggestions added Oct 18 (notes "Hub – client requirements…"). Comp genie: sensitivity, grouped-sales support, pre-check (A-1), grid workbook built Oct 18 (notes "Comp genie g2 – Oct 18 2026 evening").
- iPad app is at 6u (dictation tuned to her real text, photo blur; see notes "iPad 6k", "iPad 6u").
- Pushes work to all three repos (Claude GitHub App given access Oct 18 2026). Deliver app updates by pushing the built files: genie dist → sbappraiser/comp-genie (index.html etc.), uad dist index.html, sketch.html, sw.js → sbappraiser/Inspection (clones at /home/claude/comp-genie and /home/claude/inspection; clone fresh in a new session). She no longer uploads files.
- The hub has a Help tab (orders/src/template.html, panel-help): add or update its directions whenever a feature is added or changed.
