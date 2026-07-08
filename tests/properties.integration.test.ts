import { afterAll, beforeAll, describe, expect, test } from "vitest";
import ngeohash from "ngeohash";
import { putProperty, queryByBoundingBox } from "../backend/src/properties";
import { encodeGeohash, geohashPrefix, type BoundingBox } from "../backend/src/geo";
import { dropTable, listing, resetTable } from "./integration-helpers";

// Derive coordinates from a REAL precision-5 geohash cell (downtown Vancouver),
// so the "same prefix but opposite ends of the cell" relationship is guaranteed
// by construction rather than by a lucky coordinate choice.
const seedPrefix = geohashPrefix(encodeGeohash(49.2827, -123.1207));
const [cellMinLat, cellMinLng, cellMaxLat, cellMaxLng] = ngeohash.decode_bbox(seedPrefix);
const cellH = cellMaxLat - cellMinLat;
const cellW = cellMaxLng - cellMinLng;

// IN: cell centre. OUT_SAME: ~5% in from the SW corner of the SAME cell (shares
// the prefix, but ~45% of the cell away from centre). FAR: Surrey, a different
// prefix that the box never touches.
const inPoint = listing("in", cellMinLat + cellH * 0.5, cellMinLng + cellW * 0.5);
const outSame = listing("out-same", cellMinLat + cellH * 0.05, cellMinLng + cellW * 0.05);
const farPoint = listing("far", 49.1913, -122.849);

// A tight window around the cell centre: contains IN, excludes OUT_SAME.
const box: BoundingBox = {
  minLat: cellMinLat + cellH * 0.4,
  maxLat: cellMinLat + cellH * 0.6,
  minLng: cellMinLng + cellW * 0.4,
  maxLng: cellMinLng + cellW * 0.6
};

async function idsInBox(query: BoundingBox): Promise<string[]> {
  return (await queryByBoundingBox(query)).map((p) => p.id);
}

beforeAll(async () => {
  await resetTable();
  await putProperty(inPoint);
  await putProperty(outSame);
  await putProperty(farPoint);
});

afterAll(dropTable);

describe("queryByBoundingBox (DynamoDB Local)", () => {
  test("sanity: the two near points share a geohash prefix; the far one does not", () => {
    expect(geohashPrefix(encodeGeohash(inPoint.lat, inPoint.lng))).toBe(seedPrefix);
    expect(geohashPrefix(encodeGeohash(outSame.lat, outSame.lng))).toBe(seedPrefix);
    expect(geohashPrefix(encodeGeohash(farPoint.lat, farPoint.lng))).not.toBe(seedPrefix);
  });

  test("returns an item inside the box", async () => {
    expect(await idsInBox(box)).toContain("in");
  });

  test("trims a same-prefix item that lies outside the exact box", async () => {
    // out-same is returned by the GSI Query (same partition as `in`) but must be
    // filtered out by isInBoundingBox — this is the over-fetch trim guarantee.
    expect(await idsInBox(box)).not.toContain("out-same");
  });

  test("does not return an item whose partition the box never queries", async () => {
    expect(await idsInBox(box)).not.toContain("far");
  });

  test("a box spanning the whole cell returns both near points", async () => {
    const wholeCell: BoundingBox = {
      minLat: cellMinLat,
      maxLat: cellMaxLat,
      minLng: cellMinLng,
      maxLng: cellMaxLng
    };
    const ids = await idsInBox(wholeCell);
    expect(ids).toContain("in");
    expect(ids).toContain("out-same");
    expect(ids).not.toContain("far");
  });
});
