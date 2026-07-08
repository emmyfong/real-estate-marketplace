# Property Copilot - Design Report

A map-based rental browser for Metro Vancouver: a Mapbox map and a
listings panel that stay in sync, backed by a server-side geohash viewport query
against DynamoDB.

## Design decisions

### 1. Map provider: **Mapbox GL** (via `react-map-gl`)

I evaluated the three suggested providers against what this product actually
needs: many custom, data-driven markers; clustering; a clean brand look; and
low onboarding cost

| | **Mapbox GL** (chosen) | Google Maps | Leaflet + OSM |
|---|---|---|---|
| Rendering engine | Vector / WebGL allowing for  smooth tilt, zoom, and 60 fps panning | Raster tiles + DOM overlay markers | Raster tiles + DOM markers |
| Custom, data-driven markers | First-class: price bubbles as React `<Marker>`s with hover/active states via `react-map-gl` | Imperative `google.maps.Marker` / `AdvancedMarkerElement`; clunkier for React-driven, data-driven styles at scale | Manual DOM injection; no native React wrapper |
| Clustering | `supercluster` (same author as Mapbox GL) GPU-smooth; configurable radius, `minPoints`, `maxZoom` | `@googlemaps/markerclusterer` add-on; decent but less tunable | `Leaflet.markercluster` add-on; mature but raster-bound |
| Map styling | Fully custom: Default / Satellite out of the box; custom brand styles via Mapbox Studio | Also offers Default / Satellite; Cloud-based Map Styles give decent control, though less granular than Mapbox Studio | Tile-provider dependent; raster limits what's possible |
| Onboarding / cost | Free public token, no credit card required | Free $200/mo credit (plenty for this scale); requires a billing account + credit card to activate, plus key domain-restriction | Free under OSM fair-use tile policy; heavier at production scale |
| Routing / commute APIs | Isochrone API (reachable-area polygons), Directions API, Matrix API | Distance Matrix + Directions arguably richer transit data in some regions | None built-in; must use a third-party routing service |
| React integration | `react-map-gl` declarative, component-based, well-maintained | `@vis.gl/react-google-maps` exists but less mature; most tutorials still use imperative JS | `react-leaflet` decent wrapper but tightly coupled to raster paradigm |

**Why Mapbox:** the entire UI is custom, data-driven markers:

- price bubbles with `$2.4k` labels
- count-cluster circles
- three-state hover/active/default styling

Mapbox's vector engine and `react-map-gl` express these as ordinary React
components with CSS transitions, and `supercluster` gives GPU-smooth clustering
that collapses nearby listings into count bubbles automatically. Google's marker
API would have required more imperative DOM management to achieve the same
result; Leaflet's raster renderer would not pan/zoom as smoothly under heavy
marker load. Mapbox also required zero credit-card setup a free public token
was enough to ship.

**Trade-off:** Google's routing and transit data is
arguably better (Distance Matrix / Directions with real-time traffic), and if
including commute times were an important feature, Google's routing API would be
a strong contender. But two things make Mapbox the defensible choice:

1. **Using Mapbox does not prevent using Google's routing engine for commute times:** Mapbox has its own routing APIs (Isochrone API, Directions API, and Matrix API) and is not a dead end for commute-time calculations.
2. **Rendering and routing are separable:** The map library (Mapbox GL vs Google
   Maps JS) does not lock the routing choice. You could render with Mapbox and
   still call Google's Distance Matrix for commute data if you specifically
   needed Google's numbers, nothing in the architecture prevents it.

To keep that flexibility explicit, **the map is fully isolated behind
`MapPanel`'s props** (`properties`, `activeId`, `onSelect`,
`onViewportChange`, …). Nothing else in the app imports `mapbox-gl` or
`react-map-gl`, so swapping or augmenting the renderer is a single-file change.

---

### 2. Performance

Two complementary layers, because they solve different problems:

| Concern | Technique | What it does |
|---|---|---|
| **Rendering smoothness** | `supercluster` clustering | Nearby listings collapse into count bubbles at low zoom, expand on click. The DOM never holds hundreds of markers at once. |
| **Data volume** | Server-side viewport query (§3) | The server only returns listings inside the current map bounds and the client never filters a full table. |
| **Network chatter** | 150 ms debounce on `onMoveEnd` | Rapid pans/zooms coalesce into a single API call, avoiding request storms. |
| **Perceived speed** | Keep-previous-results pattern | During a refetch the current list stays visible with an "updating…" hint instead of flashing skeletons. |
| **Animation overlap** | Parallel query on reset | `resetView` fires the API call for the destination bounds *in parallel* with the `easeTo` fly animation, shaving ~350 ms off the felt latency. |

*Alternatives considered and rejected:*

| Alternative | Why not |
|---|---|
| Client-side filtering only (no viewport query) | Violates the "no client-side filtering" requirement; ships the entire table to the browser |
| Server-side pagination without clustering | Markers still pile up visually; pagination doesn't solve the rendering density problem |
| Canvas/WebGL-rendered markers (deck.gl) | Overkill for 50 listings; loses the ability to use ordinary React components for marker styling |

**What I measured** (`npm run bench`: geohash query vs. a full-table
scan, 5,000 synthetic listings, avg of 8 runs, DynamoDB Local):

| Viewport | Returned | Geo-query | Full scan | Speedup |
|---|---|---|---|---|
| Block (~1 km) | 2 | **4.8 ms** | 208.9 ms | 43× |
| Neighbourhood (~5 km) | 113 | **15.2 ms** | 196.4 ms | 13× |
| Whole metro | 5,000 | 159.6 ms | 184.9 ms | 1.2× |

The takeaway: the geo query's cost scales with the *viewport*, while the scan
always pays for the whole table — so at normal browsing zoom it's 13–43× faster,
converging only when you deliberately ask for everything.

**Honest limitation:** on the *deployed* API, first-load latency is dominated by
**Lambda cold start** (Node runtime + bundle init), not the query itself. Warm
requests are fast; the fix (provisioned concurrency / a lighter bundle) is in
§What I'd add.

---

### 3. Geospatial Querying

Latitude/longitude is a 2-D range, but a DynamoDB index is 1-D so a raw
"lat between A and B AND lng between C and D" would force a table scan. Geohashes
turn 2-D proximity into a 1-D string prefix (nearby points share a prefix), which
maps cleanly onto a single GSI partition key

| Approach | How it works | Cost per request |
|---|---|---|
| **Geohash prefix query (chosen)** | `boundingBoxPrefixes(box)` → handful of ~5 km prefix cells → `Query` the `geo-index` GSI once per prefix in parallel → trim to exact bounds | O(viewport) — reads only the partitions the viewport touches |
| Full-table `Scan` + client filter | Reads every item, sends all to the client | O(table) — pays for every item regardless of viewport |
| DynamoDB `Scan` with `FilterExpression` | Reads every item server-side, discards non-matching | Still O(table) read capacity; filter only saves network, not RCU |
| Dedicated geo database (PostGIS, Elasticsearch) | Native spatial queries | Accurate, but adds a second data store and deployment target — overkill for 50–5k items on DynamoDB |

Each item stores a precision-7 `geohash` (~150 m) and a precision-5
`geohashPrefix` (~5 km, the GSI partition key). A viewport query
(`queryByBoundingBox`) then:

1. `boundingBoxPrefixes(box)` → the handful of ~5 km prefix cells that overlap
   the visible box.
2. **`Query` the `geo-index` once per prefix, in parallel** (`Promise.all`) —
   each is an indexed partition read, never a scan.
3. `isInBoundingBox` trims items in cells that stick out past the exact box.

Because prefix cells are disjoint and each item has exactly one prefix, an item
can be returned by at most one query — **no de-duplication needed**. *Considered
and rejected:* the scaffold's baseline table scan (O(table) per request, ignores
the viewport). **Known gap:** each `Query` isn't paginated past DynamoDB's 1 MB
limit — fine at this scale, addressed in §What I'd add.

---

### 4. Filtering model

**Dimensions:** rent range (min/max), **bedrooms** (minimum), **bathrooms**
(minimum), **property type** (exact), and a **keyword search** over
title/street/city.

| Design choice | Options considered | What I chose and why |
|---|---|---|
| **Filter composition** | OR (any match), AND (all match) | **AND**: every provided constraint must hold. This matches renter intent: "2-bed AND under $2k AND in Vancouver" narrows results. OR would surprise users. |
| **Where filters run** | Client-side, server-side, hybrid | **Server-side**: a pure `filterProperties` function runs after the bbox narrows the set (viewport-first, then attributes). Keeps attribute filtering cheap and satisfies the "no client-side filtering" requirement. |
| **Filter UX pattern** | Inline toggles, sidebar form, popover pills | Each filter lives behind a labeled pill (e.g. `2+ bd`); clicking opens a popover panel; changes commit on **Apply**. Map and list refetch only once, not on every keystroke. |
| **Keyword search scoping** | Viewport-only, whole metro | **Whole metro**: when a search query is present, the viewport constraint is dropped and results fly the map to the matches. "Find this address" shouldn't be limited to what's already on screen. |
| **Reset behaviour** | Per-filter clear, global reset | **Both**: each pill shows its active value; an always-visible **Reset all** clears everything. |
| **Empty / error states** | Silent empty, toast, inline | Four explicit, mutually exclusive states: **loading** (skeletons), **empty** ("No listings here" + hint to zoom out or clear filters), **error** (alert + "Try again" button), and **results**. Each is covered by a component test. |

---

## What I'd add with more time

- **Commute-time filter (highest value for Metro Vancouver).** Metro Vancouver is commute-driven meaning renters choose neighbourhoods based on how long it takes to get to work or school 
  - A great feature would be the ability to show listings within *X* minutes of [pinned location] by transit / car / bike
  - Mapbox's **Isochrone API** fits well as it can call it with a pinned workplace or campus, draw the reachable-area polygon on the map, and keep only the listings that fall inside it
  - This is a natural extension of the existing map: the polygon layers on top of the existing price-bubble markers, and the server can filter before returning results
- **User accounts + saved searches / favourites.** Let renters sign in, save filter presets, favourite listings, and get notified when new matches appear. This is the difference between a one-time browser and a product people return to daily during their apartment search. An Amazon Cognito user pool would fit cleanly alongside the existing AWS stack
- **Playwright end-to-end tests.** Component + integration tests cover the
  states, rendering, and the geo query; a real-browser flow (set filters → map
  *and* list update → click a marker → card highlights → reset) would cover the
  wiring between them and catch regressions in the full interaction cycle.
- **Query pagination + adaptive precision.** Follow `LastEvaluatedKey` so a
  dense prefix cell can't truncate at DynamoDB's 1 MB limit, and adapt geohash
  precision to zoom level so a metro-wide view fires fewer partition queries
  while a street-level view gets finer cells.
- **Listing detail view.** Cards show the first of five images; a detail
  page/modal with the full image gallery, description, and a map-inset showing
  the single listing's location is the obvious next screen.
- **Faster first load on the deployed API.** The first request after the Lambda
  has been idle is slow because AWS has to start a fresh container for it (a
  "cold start"). Subsequent requests are fast. Keeping one instance always warm
  (provisioned concurrency) or shrinking the deployment bundle would fix this.
