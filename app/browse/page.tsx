"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProperties } from "@/lib/api";
import type { BoundingBox, Property, PropertyFilter } from "@/lib/types";
import { FilterBar } from "@/components/FilterBar";
import { ListingsPanel, type SortKey } from "@/components/ListingsPanel";

// mapbox-gl touches `window` at module load, so the map is client-only.
const MapPanel = dynamic(() => import("@/components/MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-500">
      Loading map…
    </div>
  )
});

type Status = "loading" | "ready" | "error";

/** Bounding box that encloses a set of listings, or null if empty. */
function boundsOf(list: Property[]): BoundingBox | null {
  if (list.length === 0) return null;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const p of list) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PropertyFilter>({});
  const [bbox, setBbox] = useState<BoundingBox | undefined>(undefined);
  const [sort, setSort] = useState<SortKey>("priceAsc");
  const [fitBounds, setFitBounds] = useState<BoundingBox | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Keep-previous-results: on the first load we show skeletons; on later refetches
  // (pan/zoom/filter) we keep the current list visible and show a subtle "updating"
  // hint instead of flashing skeletons, so the map feels responsive.
  // With a search query we search the whole metro (ignore the viewport) and fly
  // the map to the matches; otherwise the map viewport drives the query.
  const effectiveBbox = filter.q ? undefined : bbox;
  const hasDataRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (hasDataRef.current) setRefreshing(true);
    else setStatus("loading");

    const startedAt = performance.now();
    fetchProperties(filter, effectiveBbox)
      .then((data) => {
        if (cancelled) return;
        if (process.env.NODE_ENV === "development") {
          const ms = (performance.now() - startedAt).toFixed(0);
          console.debug(`[latency] /properties ${ms}ms · ${data.length} results`);
        }
        setProperties(data);
        hasDataRef.current = true;
        setStatus("ready");
        setError(null);
        if (filter.q) setFitBounds(boundsOf(data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load listings");
        if (!hasDataRef.current) setStatus("error");
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, effectiveBbox, reloadNonce]);

  // Autocomplete candidates from the listings in view: each city and each street
  // name (without the number), de-duplicated.
  const searchSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const p of properties) {
      set.add(p.city);
      set.add(p.street.replace(/^\d+\s*/, ""));
    }
    return [...set].sort();
  }, [properties]);

  // The server returns exactly the map viewport; the renter controls the order.
  const sortedProperties = useMemo(() => {
    const list = [...properties];
    switch (sort) {
      case "priceAsc":
        return list.sort((a, b) => a.rent - b.rent);
      case "priceDesc":
        return list.sort((a, b) => b.rent - a.rent);
      case "bedsDesc":
        return list.sort((a, b) => b.bedrooms - a.bedrooms);
      case "sqftDesc":
        return list.sort((a, b) => b.squareFeet - a.squareFeet);
      case "nearest": {
        if (!bbox) return list;
        const centerLat = (bbox.minLat + bbox.maxLat) / 2;
        const centerLng = (bbox.minLng + bbox.maxLng) / 2;
        const cosLat = Math.cos((centerLat * Math.PI) / 180);
        const distanceSq = (p: Property) => {
          const dLat = p.lat - centerLat;
          const dLng = (p.lng - centerLng) * cosLat;
          return dLat * dLat + dLng * dLng;
        };
        return list.sort((a, b) => distanceSq(a) - distanceSq(b));
      }
    }
  }, [properties, sort, bbox]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-gray-200 px-4 py-2">
        <FilterBar filter={filter} onChange={setFilter} suggestions={searchSuggestions} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex-1 overflow-hidden">
          <ListingsPanel
            properties={sortedProperties}
            loading={status === "loading"}
            refreshing={refreshing}
            error={status === "error" ? error : null}
            sort={sort}
            onSort={setSort}
            onRetry={() => setReloadNonce((n) => n + 1)}
            activeId={activeId}
            hoveredId={hoveredId}
            onSelect={setActiveId}
            onHover={setHoveredId}
          />
        </div>

        <div className="h-64 shrink-0 lg:h-auto lg:w-[55%]">
          <MapPanel
            properties={properties}
            activeId={activeId}
            hoveredId={hoveredId}
            fitBounds={fitBounds}
            onSelect={setActiveId}
            onHover={setHoveredId}
            onViewportChange={setBbox}
          />
        </div>
      </div>
    </div>
  );
}
