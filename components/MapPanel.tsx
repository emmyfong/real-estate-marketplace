import type { Property } from "@/lib/types";

type MapPanelProps = {
  properties: Property[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
};

/**
 * PLACEHOLDER — this is where the map goes, and it is the core of the OA.
 *
 * Replace this component with a real, performant map (Google Maps, Mapbox, or
 * OpenStreetMap/Leaflet — your call, justify it in REPORT.md) that:
 *   - renders a marker for every property at its lat/lng,
 *   - stays smooth with all markers visible (clustering or viewport rendering),
 *   - selects a listing when its marker is clicked, and stays in sync with the
 *     list (the `activeId` / `onSelect` props are wired for you), and
 *   - ideally drives a server-side viewport query as the map pans/zooms.
 *
 * The props you need are already threaded through from the browse page.
 */
export function MapPanel({ properties, activeId }: MapPanelProps) {
  return (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <div className="space-y-1">
        <p className="font-medium text-gray-700">Map goes here</p>
        <p className="text-sm text-gray-500">
          {properties.length} listing{properties.length === 1 ? "" : "s"} to plot
          {activeId ? ` · selected ${activeId}` : ""}
        </p>
        <p className="text-xs text-gray-400">
          Render markers from each property&apos;s lat/lng. See components/MapPanel.tsx.
        </p>
      </div>
    </div>
  );
}
