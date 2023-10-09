import { check } from 'k6'
import makeS3Client from "./s3-client.js"

// 1. init code
const s3 = makeS3Client();
const bucketName = __ENV.S3_TEST_BUCKET_NAME

export function setup() {
  // 2. setup code
  // This would be a good place to create the bucket ${bucketName}
  // however k6-jslib-aws dont have a method for that
  // see https://github.com/grafana/k6-jslib-aws/issues/69
  // for now we user rclone mkdir before k6
}

export default async function(data){
  // 3. VU code
  const buckets = await s3.listBuckets()

  check(buckets, {
    'list is array': (buckets) => Array.isArray(buckets),
    'list contains test bucket': (buckets) => buckets.map(b => b.name).includes(bucketName),
  })
}

export function teardown(data) {
  // 4. teardown code
  // This would be a good place for removing the bucket
  // for now we user rclone purge before k6
}
