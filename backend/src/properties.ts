import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GEO_INDEX, TABLE_NAME, getDocClient } from "./db";
import {
  boundingBoxPrefixes,
  encodeGeohash,
  geohashPrefix,
  isInBoundingBox,
  type BoundingBox
} from "./geo";
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
 * Geospatial viewport query: return every property inside `box` without scanning the table
 */
export async function queryByBoundingBox(box: BoundingBox): Promise<Property[]> {
  const prefixes = boundingBoxPrefixes(box);

  const results = await Promise.all(
    prefixes.map((prefix) =>
      getDocClient().send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GEO_INDEX,
          KeyConditionExpression: "geohashPrefix = :prefix",
          ExpressionAttributeValues: { ":prefix": prefix }
        })
      )
    )
  );

  const items = results.flatMap((result) => (result.Items as Property[] | undefined) ?? []);
  return items.filter((item) => isInBoundingBox(item.lat, item.lng, box));
}
