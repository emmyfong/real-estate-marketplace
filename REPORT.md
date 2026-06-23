## Design decisions

Address each of the four ambiguous areas (one to three sentences each):

1. **Map provider** — which provider you chose and the trade-off versus the alternatives.
2. **Performance at density** — how you keep the map smooth with all markers visible (clustering, viewport rendering, etc.) and what you observed.
3. **Geospatial querying** — how the server answers a viewport query without scanning the table, and how you use the geohash index.
4. **Filtering model** — the dimensions you support, how filters compose, and the empty/reset behaviour.

## What I'd add with more time

Describe the highest-value improvements you would make next.
