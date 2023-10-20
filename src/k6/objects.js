import { check } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import makeS3Client from "./s3-client.js"

// k6LibBuckets init stage
const testFile = open("../../LICENSE", "r")
const s3 = makeS3Client();

export default async function scenarios(data) {
  await putObject(data)
  await abortMultipart(data)
}
export function setup(){
  const testBucketName = __ENV.S3_TEST_BUCKET_NAME
  return {
    testBucketName,
    testFile,
  }
}

export function teardown(data){}

export async function putObject({testBucketName, testFile}) {
  const testFileKey = `object_${crypto.randomUUID()}`
  console.info(`uploading test file ${testFileKey} to bucket ${testBucketName}`)
  await s3.putObject(testBucketName, testFileKey, testFile);
  const obj = await s3.getObject(testBucketName, testFileKey);
  check(obj, {
    'simple upload: test file have same size': o => o.size === testFile.length,
  })
}

export async function abortMultipart({testBucketName, testFile}) {
  const testFileKey = `object_${crypto.randomUUID()}`
  console.info(`creating multipart upload of ${testFileKey} on bucket ${testBucketName}...`)
  let multipartUpload = undefined
  try {
    // XXX: this fails on some S3 implementations that dont support virtual-hosted-style URLs
    // see https://github.com/grafana/k6-jslib-aws/issues/70 is fixed
    multipartUpload = await s3.createMultipartUpload(testBucketName, testFileKey);
    check(multipartUpload, {
      'multipart upload have uploadId': u => u && u.uploadId !== undefined,
    })
    // abort multipart upload
    await s3.abortMultipartUpload(testBucketName, testFileKey, multipartUpload.uploadId);
  } catch (e) {
    console.error(e)
  }
}
