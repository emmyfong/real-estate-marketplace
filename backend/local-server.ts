import { createServer } from "node:http";
import nextEnv from "@next/env";
import { route } from "./src/router";

// Load .env so DYNAMODB_ENDPOINT / PROPERTIES_TABLE are available locally.
nextEnv.loadEnvConfig(process.cwd());

const PORT = Number(process.env.API_PORT ?? 4000);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

/**
 * Local stand-in for API Gateway + Lambda. Runs the exact same router the
 * deployed Lambda runs, so local behaviour matches production.
 */
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS).end();
    return;
  }

  try {
    const result = await route({
      method: req.method ?? "GET",
      path: url.pathname,
      query
    });
    res.writeHead(result.statusCode, CORS_HEADERS).end(JSON.stringify(result.body));
  } catch (error) {
    console.error(error);
    res.writeHead(500, CORS_HEADERS).end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`Local API listening on http://localhost:${PORT}`);
});
