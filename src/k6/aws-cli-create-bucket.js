import { check, group } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import { aws2 } from "./utils/clis.js"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const profile = __ENV.AWS_CLI_PROFILE
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[profile].s3
let s3ConfigSecond;

try {
  s3ConfigSecond = config.remotes[`${profile}-second`].s3;
} catch (error) {
  s3ConfigSecond = false;
}

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data)
}

export default function scenarios(data) {
  if (!s3ConfigSecond) { return }
  createBucket(data);
}

export function createBucket({bucketName}) {
  const checkTags = {
    feature: tags.features.CREATE_BUCKET_DUPLICATE,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_CREATE_BUCKET,
  }
  const locationConstraint = s3ConfigSecond.region === 'us-east-1' ?  [] :
    ["--create-bucket-configuration", `LocationConstraint=${s3ConfigSecond.region}`]
  const createBucketResult = aws2(s3ConfigSecond, "s3api", [
    "create-bucket",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(createBucketResult)
  check(createBucketResult, {
    [`${checkTags.command} duplicate in environment` ]: out => out.includes("exit status")
  }, checkTags)
}

export function removeBucket({bucketName}) {
  const purgeBucketResult = aws2(
    s3Config,
    "s3",
    [ "rb", `s3://${bucketName}`, "--force" ]
  )
  console.log(purgeBucketResult)
  const checkTags = {
    feature: tags.features.PURGE_BUCKET,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3_RB,
  }
  check(purgeBucketResult, {
    [checkTags.command]: out => out.includes(bucketName)}, checkTags)
  }