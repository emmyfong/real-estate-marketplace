import type { Property, PropertyFilter } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/** Thin fetch wrapper around the AWS backend. Throws on non-2xx responses. */
async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

function toQueryString(filter: PropertyFilter): string {
  const params = new URLSearchParams();
  if (filter.minRent !== undefined) params.set("minRent", String(filter.minRent));
  if (filter.maxRent !== undefined) params.set("maxRent", String(filter.maxRent));
  if (filter.bedrooms !== undefined) params.set("bedrooms", String(filter.bedrooms));
  if (filter.propertyType !== undefined) params.set("propertyType", filter.propertyType);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchProperties(filter: PropertyFilter = {}): Promise<Property[]> {
  const data = await apiGet<{ properties: Property[] }>(`/properties${toQueryString(filter)}`);
  return data.properties;
}

export async function fetchProperty(id: string): Promise<Property> {
  const data = await apiGet<{ property: Property }>(`/properties/${id}`);
  return data.property;
}
