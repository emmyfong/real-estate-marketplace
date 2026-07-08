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
  highlighted?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
};

/**
 * Reusable listing tile.
 */
export function PropertyCard({
  property,
  active,
  highlighted,
  onSelect,
  onHover
}: PropertyCardProps) {
  const outline = active
    ? "border-brand-navy ring-2 ring-brand-navy/30"
    : highlighted
      ? "border-brand-navy/50 ring-1 ring-brand-navy/20"
      : "border-gray-200";

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white transition ${outline} ${
        onSelect ? "cursor-pointer hover:border-gray-400" : ""
      }`}
      onClick={onSelect ? () => onSelect(property.id) : undefined}
      onMouseEnter={onHover ? () => onHover(property.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
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
