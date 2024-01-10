import { check, fail } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { aws } from "./clis.js"
import tags from "./tags.js"

export function bucketSetup(s3Config, testBucketName) {
  if (testBucketName) {
    console.log("a test bucker was passed, skip bucket creation")
    return {bucketName: testBucketName, s3Config}
  }
  const bucketName = `test-${crypto.randomUUID()}`
  const locationConstraint = s3Config.region === 'us-east-1' ?  [] :
    ["--create-bucket-configuration", `LocationConstraint=${s3Config.region}`]
  console.log({locationConstraint})
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
  if (createBucketResult.includes("exit status")) {
    fail("Failed `s3api create-bucket` during test setup")
  }
  return {bucketName, s3Config}
}

export function bucketTeardown({s3Config, bucketName}, testBucketName) {
  if (testBucketName) {
    console.log("a test bucker was passed, skip bucket purge")
    return
  }
  // delete bucket used by the tests
  const purgeBucketResult = aws(
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

