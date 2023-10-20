import { check, fail } from 'k6'
import makeS3Client from "./s3-client.js"

// k6LibBuckets init stage
const s3 = makeS3Client();

export function setup() {
  const bucketName = __ENV.S3_TEST_BUCKET_NAME
  return {bucketName}
}

export default async function({bucketName}){
  const SWIFT_BUG_1856938_DATE = 1233679509000 //2009-02-03T16:45:09.000Z
  const buckets = await s3.listBuckets()
  console.log(`buckets list =${JSON.stringify(buckets)}`)
  check(buckets, {
    'list is array': (buckets) => Array.isArray(buckets),
    'list contains test bucket': (buckets) => buckets.map(b => b.name).includes(bucketName),
  })

  console.log(`test bucket name is ${bucketName}`)
  const testBuckets = buckets.filter(b => b.name === bucketName)
  check(testBuckets, {
    'test bucket have date different than Swift Bug #1856938': t => t[0].creationDate !== SWIFT_BUG_1856938_DATE,
    'test bucket have date newer than 2009': t => new Date(t[0].creationDate).getUTCFullYear() > 2009 ,
  })
}

export function teardown(data) { }
