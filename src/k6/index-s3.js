import makeS3Client from "./s3-client.js";
import { describe } from "https://jslib.k6.io/k6chaijs/4.3.4.3/index.js";
import {
  default as k6JsLibBucketsTest,
  setup as k6JsLibBucketsSetup,
  teardown as k6JsLibBucketsTeardown,
} from "./buckets.js";
import {
  default as k6JsLibObjectsTest,
  setup as k6JsLibObjectsSetup,
  teardown as k6JsLibObjectsTeardown,
} from "./objects.js";
import {
  default as awsCliTest,
  setup as awsCliSetup,
  teardown as awsCliTeardown,
} from "./aws-cli-objects.js";

// init stage
// XXX: due to k6 this is the aggregated copy/paste of each init stage
// of the individual tests
const s3 = makeS3Client(); // buckets.js, objects.js
const testFile = open("../../LICENSE", "r"); //objects.js

export function setup() {
  let setupData = {};
  describe("Setup k6-jslib-aws buckets test", (_t) => {
    setupData.k6JsLibBucketsData = k6JsLibBucketsSetup();
  });
  describe("Setup k6-jslib-aws objects test", (_t) => {
    setupData.k6JsLibObjectsData = k6JsLibObjectsSetup();
  });
  describe("Setup aws-cli tests", (_t) => {
    setupData.awsCliData = awsCliSetup();
  });
  return setupData;
}
export default function ({
  k6JsLibBucketsData,
  k6JsLibObjectsData,
  awsCliData,
}) {
  describe("Run k6-jslib-aws buckets test", async (_t) => {
    await k6JsLibBucketsTest(k6JsLibBucketsData);
  });
  describe("Run k6-jslib-aws objects test", async (_t) => {
    await k6JsLibObjectsTest(k6JsLibObjectsData);
  });
  describe("Run aws-cli tests", (_t) => {
    awsCliTest(awsCliData);
  });
}
export function teardown({
  k6JsLibBucketsData,
  k6JsLibObjectsData,
  awsCliData,
}) {
  describe("Teardown k6-jslib-aws objects test", (_t) => {
    k6JsLibObjectsTeardown(k6JsLibObjectsData);
  });
  describe("Teardown k6-jslib-aws buckets test", (_t) => {
    k6JsLibBucketsTeardown(k6JsLibBucketsData);
  });
  describe("Teardown aws-cli tests", (_t) => {
    awsCliTeardown(awsCliData);
  });
}
