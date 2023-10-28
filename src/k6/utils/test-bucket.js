import { check } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { aws } from "./clis.js"
import tags from "./tags.js"

export function bucketSetup(s3Config) {
  const bucketName = `test-k6-jslib-aws-${crypto.randomUUID()}`
  const createBucketResult = aws(s3Config, "s3", ["mb", `s3://${bucketName}`])
  console.log(createBucketResult)
  const checkTags = {
    feature: tags.features.CREATE_BUCKET,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3_MB,
  }
  check(createBucketResult, {
    [checkTags.command]: out => out.includes(bucketName)}, checkTags)
  return {bucketName, s3Config}
}

export function bucketTeardown({s3Config, bucketName}) {
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

