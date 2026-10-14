# Appraisal Assistant

Tools for Jennifer Heath's residential appraisal practice (Santa Barbara / Montecito).

| Folder | What it is | Where it runs |
|---|---|---|
| `orders/` → `docs/` | **Order hub (home page):** orders list, intake form, one-time document upload (auto-sorted; CRS/MLS/permit history read), engagement letter, clients, iPad "Active Orders" file, link to the comp genie | GitHub Pages of this repo, folder `/docs` |
| `inspection-app/` | iPad field inspection (UAD 3.6) with sketch; exports a MISMO file for SFREP | GitHub Pages repo **Inspection** |
| `comp-genie/` | Comparable sales: archive + MLS + CRS + CORT, flags, SFREP comps export | GitHub Pages repo **comp-genie** |
| `engagement-letter-writer/` | Letter wording (`clauses.js`, `letter.js`) used by the order hub; the old standalone writer | Retired once she restores its backup into the hub |
| `data-scripts/` | Scripts that converted her ACI comp archive and CORT scans | Run by Claude, not by her |

`python3 orders/build.py` writes `docs/` (commit it; Pages serves it). Each other app folder has `build.py`; run `python3 build.py` inside it to make the files that get uploaded.

**Data rule:** her comp archive, CORT table, client documents and client list are never committed here. They live only on her computer.

Project history and her decisions: `APPRAISAL-ASSISTANT-NOTES.md`, `APPRAISAL-ASSISTANT-PLAN.md`, `inspection-app/PROJECT-NOTES.md`.
