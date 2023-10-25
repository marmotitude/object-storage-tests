import { check } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { parse as yamlParse } from "k6/x/yaml";
import { aws } from "./utils/clis.js"
import makeS3Client from "./utils/s3-client.js"

// k6LibBuckets init stage
const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const s3 = makeS3Client(config.remotes[__ENV.AWS_CLI_PROFILE].s3);

export default async function scenarios(data) {
  await putObject(data)
  await abortMultipart(data)
}
export function setup(){
  const bucketName = `test-k6-jslib-aws-${crypto.randomUUID()}`
  console.log(aws(s3Config, "s3", ["mb", `s3://${bucketName}`]))
  return {bucketName}
}

export function teardown({bucketName}) {
    // delete bucket used by the tests
    console.log(aws(s3Config, "s3", [ "rb",
      `s3://${bucketName}`, "--force"
    ]))
  }

export async function putObject({bucketName}) {
  const testFileKey = `object_${crypto.randomUUID()}`
  console.info(`uploading test file ${testFileKey} to bucket ${bucketName}`)
  await s3.putObject(bucketName, testFileKey, testFile);
  const obj = await s3.getObject(bucketName, testFileKey);
  check(obj, {
    'simple upload: test file have same size': o => o.size === testFile.length,
  })
}

export async function abortMultipart({bucketName}) {
  const testFileKey = `object_${crypto.randomUUID()}`
  console.info(`creating multipart upload of ${testFileKey} on bucket ${bucketName}...`)
  let multipartUpload = undefined
  try {
    // XXX: this fails on some S3 implementations that dont support virtual-hosted-style URLs
    // see https://github.com/grafana/k6-jslib-aws/issues/70 is fixed
    multipartUpload = await s3.createMultipartUpload(bucketName, testFileKey);
    check(multipartUpload, {
      'multipart upload have uploadId': u => u && u.uploadId !== undefined,
    })
    // abort multipart upload
    await s3.abortMultipartUpload(bucketName, testFileKey, multipartUpload.uploadId);
  } catch (e) {
    console.error(e)
  }
}
