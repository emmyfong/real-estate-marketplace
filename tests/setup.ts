// Test environment defaults. The unit tests here are pure (no live DynamoDB),
// but these keep the data-layer modules happy if they are imported.
process.env.PROPERTIES_TABLE = process.env.PROPERTIES_TABLE ?? "Properties-test";
process.env.AWS_REGION = process.env.AWS_REGION ?? "us-west-2";
