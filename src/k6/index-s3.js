import { describe } from "../../vendor/k6chaijs.min.js";
import { parse as yamlParse } from "k6/x/yaml";
import makeS3Client from "./utils/s3-client.js";

const fileNames = [
  "k6-jslib-buckets.js",
  "k6-jslib-objects.js",
  "aws-cli-multipart.js",
  "aws-cli-presigned.js",
  "boto3-presigned.js",
  "mgc-s3.js",
  "rclone-s3.js",
  "aws-cli-create-bucket.js",
  "delete-objects.js",
  "aws-cli-s3-acl.js",
]

function importModules(fileNames) {
  const modules = {};
  fileNames.forEach(fileName => {
      const module = require(`./${fileName}`);
      modules[fileName] = module.default;
      modules[`${fileName}Setup`] = module.setup;
      modules[`${fileName}Teardown`] = module.teardown;
  });
  return modules;
}

const modules = importModules(fileNames);

// init stage
// XXX: due to k6 this is the aggregated copy/paste of each init stage
// of the individual tests
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const swiftConfig = config.remotes[__ENV.AWS_CLI_PROFILE].swift
const mgcConfig = config.remotes[__ENV.AWS_CLI_PROFILE].mgc
const s3 = makeS3Client(s3Config);
const bucketName = __ENV.TEST_BUCKET
const profileName = __ENV.AWS_CLI_PROFILE
const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");
let s3ConfigSecond;
try {
  s3ConfigSecond = config.remotes[`${profile}-second`].s3;
} catch (error) {
  s3ConfigSecond = false;
}

export function setup() {
  const setupData = {};
  fileNames.forEach(moduleName => {
      describe(`Setup ${moduleName} test`, (_t) => {
          setupData[`${moduleName}Data`] = modules[`${moduleName}Setup`]();
      });
  });
  return setupData;
}

export default function (setupData) {
  fileNames.forEach(moduleName => {
      describe(`Run ${moduleName} test`, async (_t) => {
          await modules[moduleName](setupData[`${moduleName}Data`]);
      });
  });
}

export function teardown(setupData) {
  fileNames.forEach(moduleName => {
      describe(`Teardown ${moduleName} test`, (_t) => {
          modules[`${moduleName}Teardown`](setupData[`${moduleName}Data`]);
      });
  });
}