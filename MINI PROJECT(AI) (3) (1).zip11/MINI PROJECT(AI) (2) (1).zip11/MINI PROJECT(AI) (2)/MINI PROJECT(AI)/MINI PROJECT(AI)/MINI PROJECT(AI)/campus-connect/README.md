# Campus Connect (local)

Run the app locally (from `campus-connect`):

```powershell
cd "C:\Users\Radandi Siddartha\Downloads\MINI PROJECT(AI) (3)\MINI PROJECT(AI)\MINI PROJECT(AI)\campus-connect"
npm install
node server.js
# open http://localhost:3000
```

Verification scripts:

```powershell
node scripts/check-be-links.js
node scripts/check-misc.js
```

What was added in this change:
- `data/placements.json`: realistic per-college placement entries
- `public/college.js`: testimonial carousel + 'View more' modal
- `public/styles.css`: carousel + modal CSS

If something doesn't work, restart the server and re-run the verification scripts.
# Campus Connect

Small full-stack scaffold showcasing the top 20 engineering colleges in Telangana.

## What this is
- Single Node.js Express app serving a static frontend.
- API: `GET /api/colleges` returns JSON of 20 Telangana engineering colleges.
- Frontend in `public/` provides search and listing.

## Run (Windows PowerShell)

Open PowerShell in `d:\MINI PROJECT(AI)\campus-connect` and run:

```powershell
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Project structure

- `server.js` — Express server and API
- `data/colleges.json` — colleges dataset (20 entries)
- `public/` — static frontend (`index.html`, `app.js`, `styles.css`)

## Notes
- Data curated for Telangana only. You can edit `data/colleges.json` to update details.
- This is an initial scaffold inspired by Shiksha & CollegeDunia layout ideas.

If you want a React front-end, an admin panel to add/edit colleges, paging, or real DB (SQLite/Postgres), tell me and I will extend it.
