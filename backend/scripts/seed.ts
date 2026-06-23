import nextEnv from "@next/env";
import { putProperty } from "../src/properties";
import { SEED_PROPERTIES } from "../src/seed-data";
import { TABLE_NAME } from "../src/db";

// Writes the 50 seed listings into DynamoDB. Targets DynamoDB Local when
// DYNAMODB_ENDPOINT is set, or your real AWS table otherwise.

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  console.log(`Seeding ${SEED_PROPERTIES.length} properties into "${TABLE_NAME}"...`);

  for (const property of SEED_PROPERTIES) {
    await putProperty(property);
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
