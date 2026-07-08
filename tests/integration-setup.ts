//Integration test environment
//These tests run against DynamoDB Local
process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
process.env.PROPERTIES_TABLE = "Properties-itest";
process.env.AWS_REGION = process.env.AWS_REGION ?? "us-west-2";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "local";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "local";
