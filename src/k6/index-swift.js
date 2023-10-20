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
  const swiftCliAccountData = swiftCliAccountSetup();
  const swiftCliS3MultipartData = swiftCliS3MultipartSetup();
  return {
    swiftCliAccountData,
    swiftCliS3MultipartData,
  };
}
export default function ({ swiftCliAccountData, swiftCliS3MultipartData }) {
  swiftCliAccountTest(swiftCliAccountData);
  swiftCliS3MultipartTest(swiftCliS3MultipartData);
}
export function teardown({ swiftCliAccountData, swiftCliS3MultipartData }) {
  swiftCliAccountTeardown(swiftCliAccountData);
  swiftCliS3MultipartTeardown(swiftCliS3MultipartData);
}
