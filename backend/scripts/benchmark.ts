// Performance benchmark for the geospatial query. Seeds a large synthetic data
// set into DynamoDB Local and compares the geohash bounding-box query against a
// naive full-table Scan + in-memory filter (the baseline the scaffold shipped),
// across viewport sizes. Produces the numbers cited in REPORT.md.
//
// Run with DynamoDB Local up (`docker compose up -d`): `npm run bench`.
//
// Uses a dedicated `Properties-bench` table so it never touches dev/seed data.
process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
process.env.PROPERTIES_TABLE = process.env.PROPERTIES_TABLE ?? "Properties-bench";
process.env.AWS_REGION = process.env.AWS_REGION ?? "us-west-2";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "local";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "local";

import {
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ensurePropertiesTable } from "./create-table";
import { isInBoundingBox, type BoundingBox } from "../src/geo";
import type { Property } from "../src/types";

const TABLE_SIZE = 5000;
const RUNS = 8;

const control = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
  }
});

// Metro Vancouver spread for the synthetic data.
const METRO = { minLat: 49.0, minLng: -123.25, maxLat: 49.35, maxLng: -122.7 };

const BOXES: Array<{ name: string; box: BoundingBox }> = [
  {
    name: "block (~1km)",
    box: { minLat: 49.278, minLng: -123.126, maxLat: 49.288, maxLng: -123.115 }
  },
  {
    name: "neighbourhood (~5km)",
    box: { minLat: 49.24, minLng: -123.17, maxLat: 49.29, maxLng: -123.09 }
  },
  {
    name: "whole metro",
    box: METRO
  }
];

async function waitForActive(tableName: string) {
  for (let i = 0; i < 30; i += 1) {
    const { Table } = await control.send(new DescribeTableCommand({ TableName: tableName }));
    const gsiReady = (Table?.GlobalSecondaryIndexes ?? []).every((g) => g.IndexStatus === "ACTIVE");
    if (Table?.TableStatus === "ACTIVE" && gsiReady) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function timeAverage<T>(fn: () => Promise<T>): Promise<{ ms: number; result: T }> {
  await fn(); // warm up
  const start = performance.now();
  let result = await fn();
  for (let i = 1; i < RUNS; i += 1) result = await fn();
  return { ms: (performance.now() - start) / RUNS, result };
}

async function main() {
  const { getDocClient, TABLE_NAME } = await import("../src/db");
  const { queryByBoundingBox, withGeoAttributes } = await import("../src/properties");
  const doc = getDocClient();

  console.log(`Seeding ${TABLE_SIZE} synthetic listings into "${TABLE_NAME}"...`);
  await control.send(new DeleteTableCommand({ TableName: TABLE_NAME })).catch(() => {});
  await ensurePropertiesTable(control, TABLE_NAME);
  await waitForActive(TABLE_NAME);

  const items: Property[] = Array.from({ length: TABLE_SIZE }, (_unused, i) =>
    withGeoAttributes({
      id: `bench-${i}`,
      title: "bench",
      description: "",
      rent: 1500 + Math.floor(Math.random() * 5000),
      bedrooms: 2,
      bathrooms: 1,
      propertyType: "apartment",
      squareFeet: 800,
      street: "1 Bench St",
      city: "Vancouver",
      province: "BC",
      postalCode: "V6B 1A1",
      lat: METRO.minLat + Math.random() * (METRO.maxLat - METRO.minLat),
      lng: METRO.minLng + Math.random() * (METRO.maxLng - METRO.minLng),
      images: ["a", "b", "c", "d", "e"],
      createdAt: new Date().toISOString()
    })
  );

  for (let i = 0; i < items.length; i += 25) {
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }))
        }
      })
    );
  }

  // Naive baseline: Scan the whole table, filter to the box in memory.
  async function scanAndFilter(box: BoundingBox): Promise<number> {
    const kept: Property[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const res = await doc.send(new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastKey }));
      for (const item of (res.Items as Property[] | undefined) ?? []) {
        if (isInBoundingBox(item.lat, item.lng, box)) kept.push(item);
      }
      lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return kept.length;
  }

  console.log(`\nTable size: ${TABLE_SIZE} items · avg of ${RUNS} runs\n`);
  console.log("viewport               | returned |  geo-query |  full-scan | speedup");
  console.log("-----------------------|----------|------------|------------|--------");
  for (const { name, box } of BOXES) {
    const geo = await timeAverage(() => queryByBoundingBox(box));
    const scan = await timeAverage(() => scanAndFilter(box));
    const speedup = (scan.ms / geo.ms).toFixed(1);
    console.log(
      `${name.padEnd(22)} | ${String(geo.result.length).padStart(8)} | ${geo.ms
        .toFixed(1)
        .padStart(8)}ms | ${scan.ms.toFixed(1).padStart(8)}ms | ${speedup.padStart(5)}x`
    );
  }

  await control.send(new DeleteTableCommand({ TableName: TABLE_NAME })).catch(() => {});
  console.log("\nDone (bench table dropped).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
