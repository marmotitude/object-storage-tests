import { check, group } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import makeS3Client from "./utils/s3-client.js"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3;

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data);
}
export default async function scenarios(data) {
  const response = createBucket(data);
  
  group(checkTags.command, function(){
    check(response, {
      [`${checkTags.feature} create bucket duplicate`]: resp => resp,
      [`${checkTags.feature} not create bucket duplicate`]: b => resp => !resp,
    }, checkTags)
  })
}

export async function createBucket({bucketName}) {
  checkTags = {
    feature: tags.features.CREATE_BUCKET_DUPLICATE,
    tool: tags.tools.LIB_JS_K6_AWS,
    command: tags.commands.LIB_JS_K6_AWS_S3CLIENT_CREATE_BUCKET,
  }
  const locationConstraint = s3Config.region === 'us-east-1' ?  [] :
    ["--create-bucket-configuration", `LocationConstraint=${s3Config.region}`]
  const createBucketResult = aws(s3Config, "s3api", [
    "create-bucket",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log("create-bucket output:", createBucketResult)
  const checkTags = {
    feature: tags.features.CREATE_BUCKET,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_CREATE_BUCKET,
  }
  check(createBucketResult, {
    [checkTags.command]: out => !out.includes("exit status")
  }, checkTags)
}