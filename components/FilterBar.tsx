"use client";

import { useRef, useState } from "react";
import { Popover } from "@/components/Popover";
import type { PropertyFilter, PropertyType } from "@/lib/types";

const PROPERTY_TYPES: PropertyType[] = ["apartment", "condo", "house", "townhouse"];
const BED_BATH_STEPS = [0, 1, 2, 3, 4, 5];

type FilterBarProps = {
  filter: PropertyFilter;
  onChange: (next: PropertyFilter) => void;
  /** Autocomplete candidates (cities / streets) for the search box */
  suggestions?: string[];
};

// Drop undefined values so an empty filter is `{}`
function clean(filter: PropertyFilter): PropertyFilter {
  const next: PropertyFilter = {};
  if (filter.minRent !== undefined) next.minRent = filter.minRent;
  if (filter.maxRent !== undefined) next.maxRent = filter.maxRent;
  if (filter.bedrooms !== undefined) next.bedrooms = filter.bedrooms;
  if (filter.bathrooms !== undefined) next.bathrooms = filter.bathrooms;
  if (filter.propertyType !== undefined) next.propertyType = filter.propertyType;
  if (filter.q !== undefined) next.q = filter.q;
  return next;
}

function money(value: number): string {
  return `$${value.toLocaleString("en-CA")}`;
}

//Filter bubble
export function FilterBar({ filter, onChange, suggestions = [] }: FilterBarProps) {
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const [search, setSearch] = useState(filter.q ?? "");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commitSearch(q: string) {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    onChange(clean({ ...filterRef.current, q: q === "" ? undefined : q }));
  }

  function onSearch(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => commitSearch(value.trim()), 300);
  }

  function pickSuggestion(value: string) {
    setSearch(value);
    setSearchFocused(false);
    commitSearch(value);
  }

  function reset() {
    setSearch("");
    onChange({});
  }

  const query = search.trim().toLowerCase();
  const matches =
    searchFocused && query
      ? suggestions.filter((s) => s.toLowerCase().includes(query)).slice(0, 6)
      : [];

  const hasFilters = Object.keys(clean(filter)).length > 0;

  const priceLabel =
    filter.minRent !== undefined || filter.maxRent !== undefined
      ? `${filter.minRent !== undefined ? money(filter.minRent) : "Any"} – ${
          filter.maxRent !== undefined ? money(filter.maxRent) : "Any"
        }`
      : "Price";

  const bedBathLabel =
    filter.bedrooms !== undefined || filter.bathrooms !== undefined
      ? [
          filter.bedrooms !== undefined ? `${filter.bedrooms}+ bd` : null,
          filter.bathrooms !== undefined ? `${filter.bathrooms}+ ba` : null
        ]
          .filter(Boolean)
          .join(", ")
      : "Beds & baths";

  const typeLabel = filter.propertyType ?? "Property type";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a1 1 0 01-1.42 1.42l-3.08-3.08A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search address or city"
          className="w-56 rounded-full border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-navy focus:outline-none sm:w-72"
        />
        {matches.length > 0 ? (
          <ul className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {matches.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  // onMouseDown fires before the input's blur
                  onMouseDown={() => pickSuggestion(s)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-navy/5"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Popover label={priceLabel} active={priceLabel !== "Price"}>
        {(close) => (
          <PricePanel
            min={filter.minRent}
            max={filter.maxRent}
            onApply={(min, max) => {
              onChange(clean({ ...filter, minRent: min, maxRent: max }));
              close();
            }}
          />
        )}
      </Popover>

      <Popover label={bedBathLabel} active={bedBathLabel !== "Beds & baths"}>
        {(close) => (
          <BedsBathsPanel
            beds={filter.bedrooms}
            baths={filter.bathrooms}
            onApply={(beds, baths) => {
              onChange(clean({ ...filter, bedrooms: beds, bathrooms: baths }));
              close();
            }}
          />
        )}
      </Popover>

      <Popover label={typeLabel} active={filter.propertyType !== undefined}>
        {(close) => (
          <TypePanel
            value={filter.propertyType}
            onApply={(value) => {
              onChange(clean({ ...filter, propertyType: value }));
              close();
            }}
          />
        )}
      </Popover>

      <button
        type="button"
        onClick={reset}
        disabled={!hasFilters && search.trim() === ""}
        className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition hover:text-brand-navy disabled:opacity-40"
      >
        Reset all
      </button>
    </div>
  );
}

function ApplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg bg-brand-navy py-2 text-sm font-semibold text-white hover:bg-brand-navy/90"
    >
      Apply
    </button>
  );
}

function PricePanel({
  min,
  max,
  onApply
}: {
  min?: number;
  max?: number;
  onApply: (min?: number, max?: number) => void;
}) {
  const [lo, setLo] = useState(min?.toString() ?? "");
  const [hi, setHi] = useState(max?.toString() ?? "");
  const toValue = (s: string) => (s.trim() === "" ? undefined : Number(s));

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Price range</p>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          placeholder="No min"
          value={lo}
          onChange={(e) => setLo(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="text-gray-400">–</span>
        <input
          inputMode="numeric"
          placeholder="No max"
          value={hi}
          onChange={(e) => setHi(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <ApplyButton onClick={() => onApply(toValue(lo), toValue(hi))} />
    </div>
  );
}

function Segmented({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-300">
      {BED_BATH_STEPS.map((step) => (
        <button
          key={step}
          type="button"
          onClick={() => onChange(step)}
          className={`flex-1 border-l border-gray-300 py-1.5 text-sm first:border-l-0 ${
            value === step ? "bg-brand-navy/10 font-semibold text-brand-navy" : "bg-white text-gray-700"
          }`}
        >
          {step === 0 ? "Any" : `${step}+`}
        </button>
      ))}
    </div>
  );
}

function BedsBathsPanel({
  beds,
  baths,
  onApply
}: {
  beds?: number;
  baths?: number;
  onApply: (beds?: number, baths?: number) => void;
}) {
  const [b, setB] = useState(beds ?? 0);
  const [ba, setBa] = useState(baths ?? 0);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Bedrooms</p>
        <Segmented value={b} onChange={setB} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Bathrooms</p>
        <Segmented value={ba} onChange={setBa} />
      </div>
      <ApplyButton onClick={() => onApply(b || undefined, ba || undefined)} />
    </div>
  );
}

function TypePanel({
  value,
  onApply
}: {
  value?: PropertyType;
  onApply: (value?: PropertyType) => void;
}) {
  const [v, setV] = useState<PropertyType | "">(value ?? "");

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Property type</p>
      <div className="grid grid-cols-2 gap-2">
        <TypeButton label="Any" selected={v === ""} onClick={() => setV("")} />
        {PROPERTY_TYPES.map((t) => (
          <TypeButton key={t} label={t} selected={v === t} onClick={() => setV(t)} />
        ))}
      </div>
      <ApplyButton onClick={() => onApply(v === "" ? undefined : v)} />
    </div>
  );
}

function TypeButton({
  label,
  selected,
  onClick
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border py-1.5 text-sm capitalize ${
        selected
          ? "border-brand-navy bg-brand-navy/10 font-semibold text-brand-navy"
          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
      }`}
    >
      {label}
    </button>
  );
}
