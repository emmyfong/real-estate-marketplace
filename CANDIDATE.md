# Property Copilot. Intern Take-Home: Map-Based Rental Browser

## Overview
Build a **map-based rental browser** for Metro Vancouver. A renter should be able
to see listings on a **map**, **filter** them down to what they want, and have the
map and the list stay in sync. The product must be deployed to a live URL with the
code in a GitHub repo.

You start from a scaffold. It already provides the data, the data model, an AWS
backend you can deploy, and a deliberately plain frontend, so you do not spend your
budget on boilerplate. Read the [README](./README.md) first and run it locally.

## The two things we are evaluating
Everything else is secondary. Focus your time here:

1. **Map.** Render all 50 listings on a map at their correct geographic location,
   and keep it performant with every marker visible (no jank when panning or
   zooming). Clicking a marker should surface that listing, and the map and the
   list should stay in sync.
2. **Filtering.** A renter can filter listings by **rent price range**, **number
   of bedrooms**, and **at least one more dimension** (bathrooms, property type,
   square footage — your call). Filters must **compose** (combining them narrows
   results), and both the map and the list must reflect the active filters.

## What the scaffold gives you
- **50 seeded listings** across Vancouver, Richmond, Burnaby, and Surrey, each
  with a full address, latitude/longitude, rental metadata, and five images.
- A **DynamoDB** data model with a **geohash GSI** for geospatial queries, plus
  geohash helpers in `backend/src/geo.ts`.
- A deployable **AWS backend** (DynamoDB + Lambda + API Gateway) defined with CDK
  in `infra/`, and a local dev server that runs the same request router.
- A **plain Next.js frontend** with a listings page, a reusable `PropertyCard`,
  and a **placeholder `MapPanel`** where your map goes.

The baseline is intentionally naive: the API **scans the whole table** and the
frontend has **no map and no filters**. Improving on that is the assignment.

## What you must build (core)
1. **The map.** Replace `components/MapPanel.tsx` with a real, performant map.
   Pick a provider (Google Maps, Mapbox, or OpenStreetMap/Leaflet) and integrate
   it cleanly. Render a marker per listing; clicking one selects the listing and
   syncs with the list.
2. **Filtering.** Build the filter UI (rent range, bedrooms, +1 more), make
   filters compose, update both the map and the list, and make active filters and
   reset obvious.
3. **Server-side queries.** Filtering and the map **viewport query** must be
   handled **server-side** against DynamoDB — do not dump all rows to the client
   and filter in the browser. A `queryByBoundingBox` stub and a geohash helper are
   provided in `backend/src/`; wire the viewport path to the `geo-index` GSI
   rather than scanning the table.
4. **Deployed live URL** that works end to end.
5. **CI and CD.**
   - **CI:** the provided GitHub Actions workflow runs your tests on every push
     and PR to `main`. Keep it **green on the commit you submit**; extend it with
     real tests, do not delete it.
   - **CD:** pushing to `main` updates the live frontend (Vercel Git integration).

## Stack (do not swap these)
- **Frontend: Next.js on Vercel.**
- **Backend: AWS, on your own (free-tier) dev account.** The scaffold uses
  **DynamoDB** with a geohash index for geospatial queries, fronted by Lambda +
  API Gateway. Stay on DynamoDB.

You do not need to design infra from scratch — the CDK stack is provided. Spend
your time on the map, the filtering, and the geospatial query.

## Hard requirements (pass/fail — missing any is a reject regardless of polish)
- **The backend is real and on AWS.** Data is served from **your** DynamoDB table
  through your deployed API. Do **not** fake the backend or hardcode listings into
  the frontend.
- **Queries are server-side.** Filtering and the viewport query run on the server
  against DynamoDB, not by shipping all rows to the browser.
- The repo runs locally from a clean clone following the README.
- The deployed URL works end to end.

## The ambiguous parts (decide and defend in REPORT.md)
We left these open on purpose. Pick an answer, implement it, document it (one to
three sentences each):

1. **Map provider.** Which provider did you choose and why? What is the trade-off
   versus the alternatives for this use case?
2. **Performance at density.** How do you keep the map smooth with all markers
   visible — clustering, viewport-based rendering, both? What did you measure?
3. **Geospatial querying.** How does the server answer "what listings are in this
   viewport" without scanning the table? How do you use the geohash index?
4. **Filtering model.** What dimensions can a renter filter on, how do filters
   compose, and what does the empty/reset state look like?

## On the UI (we score this)
Clean, responsive Next.js. A small set of **reusable components** used
consistently, not copy-pasted markup. Handle **loading, empty, and error** states.
The scaffold is deliberately plain so the design language is yours.

## Testing (this is scored)
Write meaningful tests for the logic that matters — the geospatial query and the
filtering logic especially. A few solid tests beat 100% coverage of trivial
getters. Document how to run them (already in the README).

## Time and window
- **1 week** to submit; budget roughly **5–6 focused hours**. Use AI tools freely.
- Do not gold-plate. When tempted to add scope beyond the core, write it in the
  "What I'd add with more time" section of `REPORT.md` instead.

## Deliverables
1. **Your repo** (pushed from the scaffold). Commit history welcome.
2. **Live deployed URL.**
3. **`REPORT.md`** with exactly two sections:
   - **Design decisions** — the four ambiguous areas above.
   - **What I'd add with more time** — scope you deliberately cut.
4. **README** kept current for setup and how to run tests.

Build something you would be comfortable demoing live.
