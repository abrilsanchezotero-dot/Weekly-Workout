# Recomp Studio v2

A mobile-first Progressive Web App for a four-day body recomposition routine.

## New in this version

- The entire app interface is in English.
- A Calendar tab shows which days you trained and which workout you completed.
- Every set includes three tracking fields: **Kg**, **Reps**, and **RIR**.
- Every exercise has its own note field.
- The next time an exercise appears, **Last time** shows:
  - previous weight,
  - previous reps,
  - previous RIR,
  - and the exercise note you saved.
- Existing workout history is migrated automatically when possible.

## Uploading the update to GitHub

Upload and replace these files in the root of the `recomp-studio` repository:

- `index.html`
- `styles.css`
- `app.js`
- `routine-data.js`
- `manifest.json`
- `service-worker.js`

You can also upload the full project ZIP contents. Do not upload the ZIP itself.

After committing the files, GitHub Pages updates automatically. The new service-worker cache is named `recomp-studio-v2`.
