import type { Property } from "@/lib/types";

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

function bedroomLabel(bedrooms: number): string {
  return bedrooms === 0 ? "Studio" : `${bedrooms} bd`;
}

type PropertyCardProps = {
  property: Property;
  active?: boolean;
  onSelect?: (id: string) => void;
};

/**
 * Reusable listing tile. Intentionally plain — the design language is yours to
 * define. Reuse this (and add more small components like badges/buttons) across
 * the list and any detail view rather than duplicating markup.
 */
export function PropertyCard({ property, active, onSelect }: PropertyCardProps) {
  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white transition ${
        active ? "border-black ring-1 ring-black" : "border-gray-200"
      } ${onSelect ? "cursor-pointer hover:border-gray-400" : ""}`}
      onClick={onSelect ? () => onSelect(property.id) : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={property.images[0]}
        alt={property.title}
        className="h-40 w-full object-cover"
        loading="lazy"
      />
      <div className="space-y-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold">{CAD.format(property.rent)}/mo</p>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {property.propertyType}
          </span>
        </div>
        <p className="text-sm text-gray-700">
          {bedroomLabel(property.bedrooms)} · {property.bathrooms} ba · {property.squareFeet} sqft
        </p>
        <p className="truncate text-sm text-gray-600">
          {property.street}, {property.city}
        </p>
      </div>
    </article>
  );
}
