import {
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import { ensurePropertiesTable } from "../backend/scripts/create-table";
import { TABLE_NAME } from "../backend/src/db";
import type { Property } from "../backend/src/types";

/**
 * Shared helpers for the DynamoDB Local integration tests. The isolated table
 * name comes from tests/integration-setup.ts (PROPERTIES_TABLE), so these never
 * touch dev/seed data.
 */

/** Control-plane client for create/describe/delete against DynamoDB Local. */
export const control = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
  }
});

/** Drop and recreate the isolated table, waiting until it (and its GSI) is ACTIVE. */
export async function resetTable(): Promise<void> {
  await control.send(new DeleteTableCommand({ TableName: TABLE_NAME })).catch(() => {});
  await ensurePropertiesTable(control, TABLE_NAME);
  for (let i = 0; i < 30; i += 1) {
    const { Table } = await control.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    const gsiReady = (Table?.GlobalSecondaryIndexes ?? []).every((g) => g.IndexStatus === "ACTIVE");
    if (Table?.TableStatus === "ACTIVE" && gsiReady) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/** Delete the isolated table. */
export async function dropTable(): Promise<void> {
  await control.send(new DeleteTableCommand({ TableName: TABLE_NAME })).catch(() => {});
}

/** Minimal valid listing; override the fields a test cares about. */
export function listing(
  id: string,
  lat: number,
  lng: number,
  attrs: Partial<Property> = {}
): Omit<Property, "geohash" | "geohashPrefix"> {
  return {
    id,
    title: id,
    description: "",
    rent: 2000,
    bedrooms: 2,
    bathrooms: 1,
    propertyType: "apartment",
    squareFeet: 800,
    street: "1 Test St",
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1",
    lat,
    lng,
    images: ["a", "b", "c", "d", "e"],
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...attrs
  };
}
