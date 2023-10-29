import { describe } from "https://jslib.k6.io/k6chaijs/4.3.4.3/index.js";
import { parse as yamlParse } from "k6/x/yaml";
import makeS3Client from "./utils/s3-client.js";
import {
  default as k6JsLibBucketsTest,
  setup as k6JsLibBucketsSetup,
  teardown as k6JsLibBucketsTeardown,
} from "./k6-jslib-buckets.js";
import {
  default as k6JsLibObjectsTest,
  setup as k6JsLibObjectsSetup,
  teardown as k6JsLibObjectsTeardown,
} from "./k6-jslib-objects.js";
import {
  default as awsCliMultipartTest,
  setup as awsCliMultipartSetup,
  teardown as awsCliMultipartTeardown,
} from "./aws-cli-multipart.js";
import {
  default as awsCliPresignTest,
  setup as awsCliPresignSetup,
  teardown as awsCliPresignTeardown,
} from "./aws-cli-presigned.js";
import {
  default as boto3Test,
  setup as boto3Setup,
  teardown as boto3Teardown
} from "./boto3-presigned.js";

// init stage
// XXX: due to k6 this is the aggregated copy/paste of each init stage
// of the individual tests
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const swiftConfig = config.remotes[__ENV.AWS_CLI_PROFILE].swift
const s3 = makeS3Client(s3Config);
const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");

export function setup() {
  let setupData = {};
  describe("Setup k6-jslib-aws buckets test", (_t) => {
    setupData.k6JsLibBucketsData = k6JsLibBucketsSetup();
  });
  describe("Setup k6-jslib-aws objects test", (_t) => {
    setupData.k6JsLibObjectsData = k6JsLibObjectsSetup();
  });
  describe("Setup aws-cli multipart tests", (_t) => {
    setupData.awsCliMultipartData = awsCliMultipartSetup();
  });
  describe("Setup aws-cli presign tests", (_t) => {
    setupData.awsCliPresignData = awsCliPresignSetup();
  });
  describe("Setup boto3 test", (_t) => {
    setupData.boto3Data = boto3Setup();
  });
  return setupData;
}
export default function ({
  k6JsLibBucketsData,
  k6JsLibObjectsData,
  awsCliMultipartData,
  awsCliPresignData,
  boto3Data,
}) {
  describe("Run k6-jslib-aws buckets test", async (_t) => {
    await k6JsLibBucketsTest(k6JsLibBucketsData);
  });
  describe("Run k6-jslib-aws objects test", async (_t) => {
    await k6JsLibObjectsTest(k6JsLibObjectsData);
  });
  describe("Run aws-cli multipart tests", (_t) => {
    awsCliMultipartTest(awsCliMultipartData);
  });
  describe("Run aws-cli presign tests", (_t) => {
    awsCliPresignTest(awsCliPresignData);
  });
  describe("Run boto3 presign test", (_t) => {
    boto3Test(boto3Data);
  });
}

export function teardown({
  k6JsLibBucketsData,
  k6JsLibObjectsData,
  awsCliMultipartData,
  awsCliPresignData,
  boto3Data,
}) {
  describe("Teardown k6-jslib-aws objects test", (_t) => {
    k6JsLibObjectsTeardown(k6JsLibObjectsData);
  });
  describe("Teardown k6-jslib-aws buckets test", (_t) => {
    k6JsLibBucketsTeardown(k6JsLibBucketsData);
  });
  describe("Teardown aws-cli multipart tests", (_t) => {
    awsCliMultipartTeardown(awsCliMultipartData);
  });
  describe("Teardown aws-cli presign tests", (_t) => {
    awsCliPresignTeardown(awsCliPresignData);
  });
  describe("Teardown boto3 presign test", (_t) => {
     boto3Teardown(boto3Data);
  });
}
