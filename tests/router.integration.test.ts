import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { putProperty } from "../backend/src/properties";
import { route } from "../backend/src/router";
import type { Property } from "../backend/src/types";
import { dropTable, listing, resetTable } from "./integration-helpers";

// Two listings in downtown Vancouver, one in Surrey (outside a downtown box but
// still inside the Metro-Vancouver DEFAULT_BBOX).
const cheap2bed = listing("cheap-2bed", 49.2827, -123.1207, {
  rent: 1800,
  bedrooms: 2,
  propertyType: "apartment"
});
const pricey3bed = listing("pricey-3bed", 49.285, -123.115, {
  rent: 3500,
  bedrooms: 3,
  propertyType: "condo"
});
const surrey = listing("surrey", 49.1913, -122.849, {
  rent: 1500,
  bedrooms: 1,
  propertyType: "house"
});

// Box around downtown Vancouver that excludes Surrey.
const DOWNTOWN_BBOX = "49.27,-123.14,49.30,-123.10";

async function getProperties(query: Record<string, string>) {
  const res = await route({ method: "GET", path: "/properties", query });
  expect(res.statusCode).toBe(200);
  return res.body as { properties: Property[]; count: number };
}

beforeAll(async () => {
  await resetTable();
  await putProperty(cheap2bed);
  await putProperty(pricey3bed);
  await putProperty(surrey);
});

afterAll(dropTable);

describe("route GET /properties (DynamoDB Local)", () => {
  test("bbox narrows to the viewport and excludes out-of-box listings", async () => {
    const { properties, count } = await getProperties({ bbox: DOWNTOWN_BBOX });
    const ids = properties.map((p) => p.id);
    expect(ids).toContain("cheap-2bed");
    expect(ids).toContain("pricey-3bed");
    expect(ids).not.toContain("surrey");
    expect(count).toBe(properties.length);
  });

  test("bbox + rent filter compose (viewport first, then attributes)", async () => {
    const { properties } = await getProperties({ bbox: DOWNTOWN_BBOX, maxRent: "2000" });
    expect(properties.map((p) => p.id)).toEqual(["cheap-2bed"]);
  });

  test("bbox + bedrooms filter compose", async () => {
    const { properties } = await getProperties({ bbox: DOWNTOWN_BBOX, bedrooms: "3" });
    expect(properties.map((p) => p.id)).toEqual(["pricey-3bed"]);
  });

  test("no bbox falls back to the Metro Vancouver default (bounded, never scans)", async () => {
    const { properties } = await getProperties({});
    const ids = properties.map((p) => p.id);
    expect(ids).toContain("cheap-2bed");
    expect(ids).toContain("pricey-3bed");
    expect(ids).toContain("surrey");
  });
});
