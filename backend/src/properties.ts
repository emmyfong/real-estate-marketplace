import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { GEO_INDEX, TABLE_NAME, getDocClient } from "./db";
import { encodeGeohash, geohashPrefix, type BoundingBox } from "./geo";
import type { Property } from "./types";

/** Compute the geo index attributes for an item from its coordinates. */
export function withGeoAttributes(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Property {
  const geohash = encodeGeohash(property.lat, property.lng);
  return { ...property, geohash, geohashPrefix: geohashPrefix(geohash) };
}

export async function putProperty(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Promise<Property> {
  const item = withGeoAttributes(property);
  await getDocClient().send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const result = await getDocClient().send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return (result.Item as Property | undefined) ?? null;
}

/**
 * BASELINE: returns every property by scanning the whole table.
 *
 * This is intentionally the naive implementation. It dumps all rows and does no
 * geospatial work. As the data set grows this scans more and more of the table
 * on every request, and it ignores the map viewport entirely.
 *
 * Your job (Backend & Data Design): replace the viewport path with a real
 * bounding-box query that uses the `geo-index` GSI and the geohash helpers in
 * geo.ts, so the server returns only what the map can see. A stub for that is
 * below.
 */
export async function listAllProperties(): Promise<Property[]> {
  const items: Property[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await getDocClient().send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastKey })
    );
    items.push(...((result.Items as Property[] | undefined) ?? []));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

/**
 * TODO (candidate): implement a geospatial viewport query.
 *
 * Outline:
 *   1. `boundingBoxPrefixes(box)` (geo.ts) -> the geohash prefixes covering the box.
 *   2. For each prefix, Query the `geo-index` GSI (partition key = geohashPrefix).
 *   3. Discard items whose lat/lng falls outside the exact box (`isInBoundingBox`).
 *
 * This avoids scanning the whole table and is what the map viewport should call.
 */
export async function queryByBoundingBox(_box: BoundingBox): Promise<Property[]> {
  void GEO_INDEX; // available for your Query: IndexName: GEO_INDEX
  throw new Error("queryByBoundingBox is not implemented yet — see Backend & Data Design.");
}
