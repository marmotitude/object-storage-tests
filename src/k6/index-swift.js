import { describe } from "https://jslib.k6.io/k6chaijs/4.3.4.3/index.js";
import {
  default as swiftCliAccountTest,
  setup as swiftCliAccountSetup,
  teardown as swiftCliAccountTeardown,
} from "./swift-cli-account.js";
import {
  default as swiftCliS3MultipartTest,
  setup as swiftCliS3MultipartSetup,
  teardown as swiftCliS3MultipartTeardown,
} from "./swift-cli-s3api-multipart.js";

export function setup() {
  let setupData = {};
  describe("Setup swift-cli account test", (_t) => {
    setupData.accountData = swiftCliAccountSetup();
  });
  describe("Setup swift-cli-s3api multipart upload test", (_t) => {
    setupData.s3MultipartData = swiftCliS3MultipartSetup();
  });
  return setupData;
}
export default function ({ accountData, s3MultipartData }) {
  describe("Run swift-cli account test", (_t) => {
    swiftCliAccountTest(accountData);
  });
  describe("Run swift-cli-s3api multipart upload test", (_t) => {
    swiftCliS3MultipartTest(s3MultipartData);
  });
}
export function teardown({ accountData, s3MultipartData }) {
  describe("Teardown swift-cli account test", (_t) => {
    swiftCliAccountTeardown(accountData);
  });
  describe("Teardown swift-cli-s3api multipart upload test", (_t) => {
    swiftCliS3MultipartTeardown(s3MultipartData);
  });
}
