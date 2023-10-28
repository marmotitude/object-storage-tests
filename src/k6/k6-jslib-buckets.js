import { check, group } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import makeS3Client from "./utils/s3-client.js"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const s3 = makeS3Client(config.remotes[__ENV.AWS_CLI_PROFILE].s3);

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data);
}
export default async function({bucketName}){
  let checkTags;
  const buckets = await s3.listBuckets()
  checkTags = {
    feature: tags.features.LIST_BUCKETS,
    tool: tags.tools.LIB_JS_K6_AWS,
    command: tags.commands.LIB_JS_K6_AWS_S3CLIENT_LIST_BUCKETS,
  }
  group(checkTags.command, function(){
    console.log(`buckets list =${JSON.stringify(buckets)}`)
    check(buckets, {
      [`${checkTags.feature} is array`]: b => Array.isArray(b),
      [`${checkTags.feature} contains test bucket`]: b => {
          const names = b.map(i => i.name);
          return names.includes(bucketName)
      },
    }, checkTags)
  })

  checkTags = {
    feature: tags.features.BUCKET_INFO_CREATION_DATE,
    fix: tags.fixes.CREATION_DATE_2009_02_03,
  };
  group(checkTags.fix, function(){
    const SWIFT_BUG_1856938_DATE = 1233679509000 //2009-02-03T16:45:09.000Z
    const testBucket = buckets.find(b => b.name === bucketName)
    check(testBucket, {
      [`${checkTags.feature} different than fixed date`]: b => b.creationDate !== SWIFT_BUG_1856938_DATE,
      [`${checkTags.feature} newer than 2009`]: b => new Date(b.creationDate).getUTCFullYear() > 2009 ,
    }, checkTags)
  })
}

