import { check, fail } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { parse as yamlParse } from "k6/x/yaml";
import makeS3Client from "./utils/s3-client.js"
import { aws } from "./utils/clis.js"

// k6LibBuckets init stage
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const s3 = makeS3Client(config.remotes[__ENV.AWS_CLI_PROFILE].s3);

export function setup() {
  const bucketName = `test-k6-jslib-aws-${crypto.randomUUID()}`
  console.log(aws(s3Config, "s3", ["mb", `s3://${bucketName}`]))
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

export function teardown({bucketName}) {
    // delete bucket used by the tests
    console.log(aws(s3Config, "s3", [ "rb",
      `s3://${bucketName}`, "--force"
    ]))
  }
