#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PropertiesStack } from "../lib/properties-stack";

const app = new cdk.App();

new PropertiesStack(app, "PropertyCopilotStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-west-2"
  }
});
