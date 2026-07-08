# property-copilot-intern-oa-FA2026: Map Browser

Candidates: start with [CANDIDATE.md](./CANDIDATE.md) for the OA instructions.

A scaffold for a **map-based rental browser** across Metro Vancouver. It ships:

- A **Next.js** frontend (deploys to **Vercel**) with a plain listings page and a
  placeholder map panel.
- An **AWS** backend: a **DynamoDB** table (with a geohash GSI for geospatial
  queries), an AWS **Lambda** request handler, and an **API Gateway** HTTP API,
  all defined with **AWS CDK** in [`infra/`](./infra).
- A **seed of 50 listings** across Vancouver, Richmond, Burnaby, and Surrey,
  each with a full address, geocoordinates, rental metadata, and five images.

The scaffold deliberately ships a **naive baseline**: the API scans the whole
table and the frontend has no map and no filters. Building the performant map and
the filtering experience on top is the OA — see `CANDIDATE.md`.

## Project layout

```
app/            Next.js frontend (Vercel)
components/      Reusable UI components (PropertyCard, MapPanel placeholder)
lib/            Frontend API client + shared types
backend/src/    DynamoDB data layer, geohash helpers, request router, Lambda handler
backend/scripts/ Local table creation + seed
infra/          AWS CDK app (DynamoDB + Lambda + API Gateway)
tests/          Vitest unit tests (geo math, filters, seed data)
```

## Prerequisites

- Node.js 24 LTS and npm 11+
- Docker Desktop (for local DynamoDB)
- Git
- An AWS account (free tier is fine) and the AWS CLI configured (`aws configure`)
  for deploying the backend.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file:
   ```bash
   cp .env.example .env
   ```
   The defaults point at local DynamoDB and the local API server; no edits are
   needed for local dev.
3. Start local DynamoDB:
   ```bash
   docker compose up -d
   ```
4. Create the table and seed 50 listings:
   ```bash
   npm run db:local
   npm run seed
   ```
5. In one terminal, start the local API (stands in for API Gateway + Lambda):
   ```bash
   npm run dev:api
   ```
6. In another terminal, start the frontend:
   ```bash
   npm run dev
   ```
7. Open http://localhost:3000 and go to **Browse**.

## Running tests

**Unit tests** (no database needed):
```bash
npm test
```

Covers geohash helpers (`tests/geo.test.ts`), filter composition
(`tests/filter.test.ts`), seed data (`tests/seed-data.test.ts`), and component
tests (`tests/ListingsPanel.test.tsx`, `tests/PropertyCard.test.tsx`).

**Integration tests** (requires DynamoDB Local — `docker compose up -d` first):
```bash
npm run test:integration
```

Exercises the real data layer and router against DynamoDB Local
(`tests/properties.integration.test.ts`, `tests/router.integration.test.ts`)

**CI:** Both suites run automatically on every push and PR to `main` via GitHub
Actions (`.github/workflows/ci.yml`), which also spins up a DynamoDB Local
service container for the integration tests


## Deploying

### Backend (AWS)

```bash
cd infra
npm install
npx cdk bootstrap   # first time per account/region
npx cdk deploy
```

The stack creates the `Properties` table (with the `geo-index` GSI), the Lambda,
and the HTTP API. Note the `ApiUrl` output. Then seed your real table:

```bash
# from the repo root, with .env pointing at AWS (unset DYNAMODB_ENDPOINT,
# set AWS_REGION / PROPERTIES_TABLE to match the deployed stack)
npm run seed
```

### Frontend (Vercel)

Connect the repo to Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the API Gateway URL
from the CDK `ApiUrl` output. With Vercel's Git integration, pushes to `main` ship
to production automatically (this satisfies CD).
