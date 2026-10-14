# Working on the Appraisal Assistant

- The user is an appraiser, not a developer. Explain in plain words; give click-by-click steps for GitHub and Chrome.
- Read `APPRAISAL-ASSISTANT-NOTES.md` and `APPRAISAL-ASSISTANT-PLAN.md` before starting work; they hold her decisions (adjustment method, view tiers, subject beds/baths/sq ft never prefilled, etc.).
- Never commit her data (archive, CORT, client documents, client list). See `.gitignore`.
- UAD 3.6 field names and enumerations must match Fannie Mae Appendix A-1; ask her for the spreadsheet if it is needed (not stored here).
- Each app: edit `src/`, run `python3 build.py`, test in Chromium (Playwright), then deliver the built files.
- Order hub built (o1, Oct 14 2026; see notes "Order hub"). Build with `python3 orders/build.py` → `docs/`. Market conditions are on the hub's Market tab (see notes). Next: document reader.
- Pushes work only to this repo; the comp-genie and Inspection repos are updated by her uploading the zips (unless she gives the Claude GitHub App access to them).
