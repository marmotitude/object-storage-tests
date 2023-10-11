import { check } from 'k6'
import makeS3Client from "./s3-client.js"

const s3 = makeS3Client();
const testBucketName = __ENV.S3_TEST_BUCKET_NAME
const testFile = open("../../LICENSE", "r")

export default async function() {
  await putObject()
}

export async function putObject() {
  const testKey = "object_1"
  await s3.putObject(testBucketName, testKey, testFile);
  const obj = await s3.getObject(testBucketName, testKey);
  check(obj, {
    'simple upload: test file have same size': o => o.size === testFile.length,
  })
}
