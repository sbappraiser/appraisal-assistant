# Working on the Appraisal Assistant

- The user is an appraiser, not a developer. Explain in plain words; give click-by-click steps for GitHub and Chrome.
- Read `APPRAISAL-ASSISTANT-NOTES.md` and `APPRAISAL-ASSISTANT-PLAN.md` before starting work; they hold her decisions (adjustment method, view tiers, subject beds/baths/sq ft never prefilled, etc.).
- Never commit her data (archive, CORT, client documents, client list). See `.gitignore`.
- UAD 3.6 field names and enumerations must match Fannie Mae Appendix A-1; ask her for the spreadsheet if it is needed (not stored here).
- Each app: edit `src/`, run `python3 build.py`, test in Chromium (Playwright), then deliver the built files.
- Next step (Oct 2026): the order intake — one assignment record shared by every module (see notes, "Her order workflow").
