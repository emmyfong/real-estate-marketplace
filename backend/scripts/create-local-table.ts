import {
  CreateTableCommand,
  DynamoDBClient,
  DescribeTableCommand
} from "@aws-sdk/client-dynamodb";
import nextEnv from "@next/env";

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
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table "${TABLE_NAME}" already exists at ${ENDPOINT}.`);
    return;
  } catch {
    // Table does not exist yet; create it below.
  }

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "geohashPrefix", AttributeType: "S" },
        { AttributeName: "geohash", AttributeType: "S" }
      ],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: "geo-index",
          KeySchema: [
            { AttributeName: "geohashPrefix", KeyType: "HASH" },
            { AttributeName: "geohash", KeyType: "RANGE" }
          ],
          Projection: { ProjectionType: "ALL" }
        }
      ]
    })
  );

  console.log(`Created table "${TABLE_NAME}" with geo-index at ${ENDPOINT}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
