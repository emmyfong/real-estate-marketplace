import {
  CreateTableCommand,
  DescribeTableCommand,
  type DynamoDBClient
} from "@aws-sdk/client-dynamodb";

/**
 * Create the `Properties` table (id partition key) with the `geo-index` GSI
 * (geohashPrefix HASH, geohash RANGE) if it does not already exist. Mirrors the
 * CDK stack schema (infra/lib/properties-stack.ts) so local dev, tests, and
 * production all share one table shape. Returns true if it created the table,
 * false if it already existed.
 */
export async function ensurePropertiesTable(
  client: DynamoDBClient,
  tableName: string
): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return false;
  } catch {
    // Table does not exist yet — create it below.
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
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

  return true;
}
