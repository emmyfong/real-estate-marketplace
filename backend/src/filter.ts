import type { Property, PropertyFilter } from "./types";

/**
 * Apply renter filters to a list of properties
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) => {
    if (filter.minRent !== undefined && property.rent < filter.minRent) {
      return false;
    }
    if (filter.maxRent !== undefined && property.rent > filter.maxRent) {
      return false;
    }
    if (filter.bedrooms !== undefined && property.bedrooms < filter.bedrooms) {
      return false;
    }
    if (filter.bathrooms !== undefined && property.bathrooms < filter.bathrooms) {
      return false;
    }
    if (filter.propertyType !== undefined && property.propertyType !== filter.propertyType) {
      return false;
    }
    if (filter.q !== undefined) {
      const needle = filter.q.toLowerCase();
      const haystack = `${property.title} ${property.street} ${property.city}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  });
}

/** Parse and validate raw query-string values into a PropertyFilter. */
export function parseFilter(query: Record<string, string | undefined>): PropertyFilter {
  const filter: PropertyFilter = {};

  const minRent = Number(query.minRent);
  if (query.minRent !== undefined && Number.isFinite(minRent)) {
    filter.minRent = minRent;
  }

  const maxRent = Number(query.maxRent);
  if (query.maxRent !== undefined && Number.isFinite(maxRent)) {
    filter.maxRent = maxRent;
  }

  const bedrooms = Number(query.bedrooms);
  if (query.bedrooms !== undefined && Number.isFinite(bedrooms)) {
    filter.bedrooms = bedrooms;
  }

  const bathrooms = Number(query.bathrooms);
  if (query.bathrooms !== undefined && Number.isFinite(bathrooms)) {
    filter.bathrooms = bathrooms;
  }

  if (
    query.propertyType === "apartment" ||
    query.propertyType === "condo" ||
    query.propertyType === "house" ||
    query.propertyType === "townhouse"
  ) {
    filter.propertyType = query.propertyType;
  }

  if (query.q !== undefined) {
    const q = query.q.trim();
    if (q.length > 0) {
      filter.q = q;
    }
  }

  return filter;
}
