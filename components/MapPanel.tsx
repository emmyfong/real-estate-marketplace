"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";
import type { BoundingBox, Property } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Frame Metro Vancouver on first load
const INITIAL_VIEW = { longitude: -123.0, latitude: 49.2, zoom: 9 };

// Zoom level when a listing is selected
const SELECTED_ZOOM = 14;
const CLUSTER_MAX_ZOOM = 12;

// Approximate bounds the initial / reset view shows (all of Metro Vancouver)
const RESET_BOUNDS: BoundingBox = { minLat: 49.05, minLng: -123.25, maxLat: 49.35, maxLng: -122.75 };

// Selectable base map styles for the switcher at the bottom of the map.
const MAP_STYLES = [
  { label: "Default", value: "mapbox://styles/mapbox/light-v11" },
  { label: "Streets", value: "mapbox://styles/mapbox/streets-v12" },
  { label: "Satellite", value: "mapbox://styles/mapbox/satellite-streets-v12" }
];

type PointProps = { id: string; rent: number };
type ViewState = { bounds: [number, number, number, number]; zoom: number };

// Price label marker 2400 -> "$2.4k"
function priceLabel(rent: number): string {
  return rent >= 1000 ? `$${(rent / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${rent}`;
}

function bubbleClasses(state: "active" | "hover" | "default"): string {
  const base =
    "cursor-pointer rounded-full border px-2 py-0.5 text-xs font-semibold shadow-md transition";
  if (state === "active") return `${base} border-brand-navy bg-brand-navy text-white`;
  if (state === "hover") return `${base} border-brand-navy bg-white text-brand-navy ring-2 ring-brand-navy/25`;
  return `${base} border-gray-300 bg-white text-brand-navy hover:border-brand-navy`;
}

type MapPanelProps = {
  properties: Property[];
  activeId?: string | null;
  hoveredId?: string | null;
  fitBounds?: BoundingBox | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  onViewportChange?: (box: BoundingBox) => void;
};

/**
 * Mapbox GL map
 */
export function MapPanel({
  properties,
  activeId,
  hoveredId,
  fitBounds,
  onSelect,
  onHover,
  onViewportChange
}: MapPanelProps) {
  const mapRef = useRef<MapRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressReportRef = useRef(false);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES[0].value);

  // Build a supercluster index from the current listings
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: 60, maxZoom: CLUSTER_MAX_ZOOM, minPoints: 5 });
    sc.load(
      properties.map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id, rent: p.rent },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] }
      }))
    );
    return sc;
  }, [properties]);

  // Clusters + individual points visible in the current viewport/zoom.
  const clusters = useMemo(
    () => (viewState ? index.getClusters(viewState.bounds, Math.round(viewState.zoom)) : []),
    [index, viewState]
  );

  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  // Selecting a listing flies the map to it and zooms in
  //keyed on activeId
  useEffect(() => {
    if (!activeId) return;
    const map = mapRef.current?.getMap();
    const target = propertiesRef.current.find((p) => p.id === activeId);
    if (!map || !target) return;
    map.flyTo({ center: [target.lng, target.lat], zoom: Math.max(map.getZoom(), SELECTED_ZOOM) });
  }, [activeId]);

  useEffect(() => {
    if (!fitBounds) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.fitBounds(
      [
        [fitBounds.minLng, fitBounds.minLat],
        [fitBounds.maxLng, fitBounds.maxLat]
      ],
      { padding: 80, maxZoom: 16, duration: 600 }
    );
  }, [fitBounds]);

  const reportViewport = useCallback(() => {
    const bounds = mapRef.current?.getMap().getBounds();
    if (!bounds) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    onViewportChange?.({ minLat: sw.lat, minLng: sw.lng, maxLat: ne.lat, maxLng: ne.lng });
  }, [onViewportChange]);

  // Recompute which clusters/points to show from the current map bounds + zoom.
  const updateClusters = useCallback(() => {
    const map = mapRef.current?.getMap();
    const b = map?.getBounds();
    if (!map || !b) return;
    setViewState({
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom: map.getZoom()
    });
  }, []);

  const handleLoad = useCallback(() => {
    updateClusters();
    reportViewport();
  }, [updateClusters, reportViewport]);

  // Re-cluster
  const handleMoveEnd = useCallback(() => {
    updateClusters();
    if (suppressReportRef.current) {
      suppressReportRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(reportViewport, 150);
  }, [updateClusters, reportViewport]);

  // Reveal a cluster's listings on click
  const zoomToCluster = useCallback(
    (clusterId: number) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const leaves = index.getLeaves(clusterId, Infinity);
      if (leaves.length === 0) return;
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const leaf of leaves) {
        const [lng, lat] = leaf.geometry.coordinates;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
      const camera = map.cameraForBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        { padding: 40 }
      );
      const zoom = Math.min(Math.max(camera?.zoom ?? 0, CLUSTER_MAX_ZOOM + 0.5), 18);
      map.easeTo({
        center: camera?.center ?? [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom,
        duration: 500
      });
    },
    [index]
  );

  // Reset the map to the default Metro Vancouver overview
  const resetView = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // Start the list query for the destination now so it runs in parallel with
    // the fly animation, instead of only after it settles.
    suppressReportRef.current = true;
    onViewportChange?.(RESET_BOUNDS);
    map.easeTo({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      pitch: 0,
      bearing: 0,
      duration: 350
    });
  }, [onViewportChange]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment to load the map.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        dragRotate={false}
        maxPitch={0}
        onMoveEnd={handleMoveEnd}
        onLoad={handleLoad}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {clusters.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          const props = feature.properties;

          if ("cluster" in props && props.cluster) {
            return (
              <ClusterMarker
                key={`cluster-${props.cluster_id}`}
                longitude={longitude}
                latitude={latitude}
                count={props.point_count}
                onClick={() => zoomToCluster(props.cluster_id as number)}
              />
            );
          }

          return (
            <ListingMarker
              key={props.id}
              id={props.id}
              longitude={longitude}
              latitude={latitude}
              rent={props.rent}
              state={props.id === activeId ? "active" : props.id === hoveredId ? "hover" : "default"}
              onSelect={onSelect}
              onHover={onHover}
            />
          );
        })}
      </Map>

      <button
        type="button"
        onClick={resetView}
        className="absolute left-2 top-2 z-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-navy shadow-md transition hover:bg-gray-50"
      >
        Reset view
      </button>

      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 overflow-hidden rounded-md border border-gray-300 bg-white shadow-md">
        {MAP_STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setMapStyle(s.value)}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mapStyle === s.value ? "bg-brand-navy text-white" : "text-brand-navy hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A count bubble for a group of nearby listings; clicking it zooms in. */
function ClusterMarker({
  longitude,
  latitude,
  count,
  onClick
}: {
  longitude: number;
  latitude: number;
  count: number;
  onClick: () => void;
}) {
  return (
    <Marker longitude={longitude} latitude={latitude}>
      <button
        type="button"
        onClick={onClick}
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-navy text-xs font-semibold text-white shadow-md"
      >
        {count}
      </button>
    </Marker>
  );
}

/** A single listing's price bubble; selects on click and highlights on hover. */
function ListingMarker({
  id,
  longitude,
  latitude,
  rent,
  state,
  onSelect,
  onHover
}: {
  id: string;
  longitude: number;
  latitude: number;
  rent: number;
  state: "active" | "hover" | "default";
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  return (
    <Marker longitude={longitude} latitude={latitude} style={{ zIndex: state === "default" ? 1 : 2 }}>
      <button
        type="button"
        onClick={() => onSelect?.(id)}
        onMouseEnter={() => onHover?.(id)}
        onMouseLeave={() => onHover?.(null)}
        className={bubbleClasses(state)}
      >
        {priceLabel(rent)}
      </button>
    </Marker>
  );
}
