"use client";

import type { ReactNode } from "react";
import type { Property } from "@/lib/types";
import { PropertyCard } from "@/components/PropertyCard";

export type SortKey = "priceAsc" | "priceDesc" | "bedsDesc" | "sqftDesc" | "nearest";

export const SORT_LABELS: Record<SortKey, string> = {
  priceAsc: "Price: Low to High",
  priceDesc: "Price: High to Low",
  bedsDesc: "Most bedrooms",
  sqftDesc: "Largest area",
  nearest: "Closest to centre"
};

type ListingsPanelProps = {
  properties: Property[]; // sorted for display
  loading: boolean; // first load ->  show skeletons
  refreshing: boolean; // background refetch -> keep list and show hint
  error: string | null;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  onRetry?: () => void;
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

/**
 * The scrollable listings pane
 * count + sort header and body states: error, loading (skeletons), empty, and results
 */
export function ListingsPanel({
  properties,
  loading,
  refreshing,
  error,
  sort,
  onSort,
  onRetry,
  activeId,
  hoveredId,
  onSelect,
  onHover
}: ListingsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <p className="text-sm text-gray-600">
          {loading
            ? "Searching…"
            : `${properties.length} home${properties.length === 1 ? "" : "s"} in view`}
          {refreshing ? <span className="ml-2 text-gray-400">updating…</span> : null}
        </p>
        <label className="flex items-center gap-1 text-sm text-gray-600">
          Sort
          <select
            aria-label="Sort listings"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error ? (
          <StateMessage
            variant="error"
            title="Couldn’t load listings"
            body={error}
            action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
          />
        ) : loading ? (
          <SkeletonGrid />
        ) : properties.length === 0 ? (
          <StateMessage
            variant="empty"
            title="No listings here"
            body="No homes match your filters in this area. Try zooming out or clearing your filters."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-1 xl:grid-cols-2">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                active={property.id === activeId}
                highlighted={property.id === hoveredId}
                onSelect={onSelect}
                onHover={onHover}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StateMessage({
  variant,
  title,
  body,
  action
}: {
  variant: "error" | "empty";
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <Icon variant={variant} />
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="max-w-xs text-sm text-gray-500">{body}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-navy/90"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

function Icon({ variant }: { variant: "error" | "empty" }): ReactNode {
  const cls = variant === "error" ? "h-8 w-8 text-red-400" : "h-8 w-8 text-gray-300";
  return variant === "error" ? (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  ) : (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-1 xl:grid-cols-2" aria-hidden data-testid="skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="h-40 w-full animate-pulse bg-gray-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
