# Appraisal Assistant

Tools for Jennifer Heath's residential appraisal practice (Santa Barbara / Montecito).

| Folder | What it is | Where it runs |
|---|---|---|
| `inspection-app/` | iPad field inspection (UAD 3.6) with sketch; exports a MISMO file for SFREP | GitHub Pages repo **Inspection** |
| `comp-genie/` | Comparable sales: archive + MLS + CRS + CORT, flags, SFREP comps export | GitHub Pages repo **comp-genie** |
| `engagement-letter-writer/` | Engagement letters (Word) and client list | Local HTML file in Chrome |
| `data-scripts/` | Scripts that converted her ACI comp archive and CORT scans | Run by Claude, not by her |

Each app folder has `build.py`; run `python3 build.py` inside it to make the files that get uploaded.

**Data rule:** her comp archive, CORT table, client documents and client list are never committed here. They live only on her computer.

Project history and her decisions: `APPRAISAL-ASSISTANT-NOTES.md`, `APPRAISAL-ASSISTANT-PLAN.md`, `inspection-app/PROJECT-NOTES.md`.
