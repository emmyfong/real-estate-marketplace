import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import nextEnv from "@next/env";
import { ensurePropertiesTable } from "./create-table";

// Creates the Properties table (and geo GSI) in DynamoDB Local for development.
// The real table is created by the CDK stack (infra/) in your AWS account; this
// script mirrors that schema so local dev matches production.

nextEnv.loadEnvConfig(process.cwd());

const TABLE_NAME = process.env.PROPERTIES_TABLE ?? "Properties";
const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-west-2",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
  }
});

async function main() {
  const created = await ensurePropertiesTable(client, TABLE_NAME);
  console.log(
    created
      ? `Created table "${TABLE_NAME}" with geo-index at ${ENDPOINT}.`
      : `Table "${TABLE_NAME}" already exists at ${ENDPOINT}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
