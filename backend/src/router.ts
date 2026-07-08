import { filterProperties, parseFilter } from "./filter";
import type { BoundingBox } from "./geo";
import { getPropertyById, queryByBoundingBox } from "./properties";

export type ApiRequest = {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
};

export type ApiResponse = {
  statusCode: number;
  body: unknown;
};

/**
 * Default viewport: Metro Vancouver, covering all four seed cities. Used when the
 * client has not reported a map viewport yet, so `/properties` always answers
 * from a bounded geo query and never scans the whole table.
 */
const DEFAULT_BBOX: BoundingBox = {
  minLat: 49.05,
  minLng: -123.25,
  maxLat: 49.35,
  maxLng: -122.75
};

/**
 * Parse a `bbox=minLat,minLng,maxLat,maxLng` query param. Falls back to
 * DEFAULT_BBOX on missing, malformed, or inverted input — a bad param should
 * never 500 the endpoint (lenient, matching parseFilter).
 */
function parseBbox(raw: string | undefined): BoundingBox {
  if (!raw) return DEFAULT_BBOX;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return DEFAULT_BBOX;
  }
  const [minLat, minLng, maxLat, maxLng] = parts;
  if (minLat > maxLat || minLng > maxLng) {
    return DEFAULT_BBOX;
  }
  return { minLat, minLng, maxLat, maxLng };
}

/**
 * Framework-agnostic request router shared by the Lambda handler (production)
 * and the local dev server. Keeps the HTTP plumbing in one place so the same
 * logic runs in both environments.
 */
export async function route(req: ApiRequest): Promise<ApiResponse> {
  if (req.method !== "GET") {
    return { statusCode: 405, body: { error: "Method not allowed" } };
  }

  if (req.path === "/health") {
    return { statusCode: 200, body: { ok: true } };
  }

  // GET /properties/:id
  const detailMatch = req.path.match(/^\/properties\/([^/]+)$/);
  if (detailMatch) {
    const property = await getPropertyById(decodeURIComponent(detailMatch[1]));
    if (!property) {
      return { statusCode: 404, body: { error: "Property not found" } };
    }
    return { statusCode: 200, body: { property } };
  }

  // GET /properties?bbox=minLat,minLng,maxLat,maxLng&minRent&maxRent&bedrooms&bathrooms&propertyType
  //
  // The bbox narrows to the map viewport via the geo-index GSI first, then the
  // attribute filters run in-memory on that small result set. This keeps the
  // query server-side and off the full table (no Scan).
  if (req.path === "/properties") {
    const box = parseBbox(req.query.bbox);
    const inViewport = await queryByBoundingBox(box);
    const properties = filterProperties(inViewport, parseFilter(req.query));
    return { statusCode: 200, body: { properties, count: properties.length } };
  }

  return { statusCode: 404, body: { error: "Not found" } };
}
