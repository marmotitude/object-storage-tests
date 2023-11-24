import { check, group } from 'k6'
import http from 'k6/http';
import { parse as yamlParse } from "k6/x/yaml";
import { aws } from './utils/index.js'
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const testFileName = "LICENSE"
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const endpoint = s3Config.endpoint
const mgcConfig = config.remotes[__ENV.AWS_CLI_PROFILE].mgc

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
    return bucketTeardown(data);
}
export default function scenarios(data) {
  if (mgcConfig) {
    group(tags.features.GET_OBJECT_PUBLIC, function(){
      publicGetWithProject(data);
    });
  } else {
    return
  }
}
export function publicGetWithProject({bucketName}) {
  const fileName = `get-${testFileName}`

  // upload a test file
  let checkTags = {
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3_CP,
  }
  const uploadOutput = aws(s3Config, "s3", [ "cp", testFileName, `s3://${bucketName}/${fileName}` ])
  console.log({uploadOutput})
  check(uploadOutput, {
    [`${checkTags.command} response have filename`]: o => o.includes(testFileName),
    [`${checkTags.command} response have bucket name`]: o => o.includes(bucketName),
    [`${checkTags.command} response have object key`]: o => o.includes(fileName),
  }, checkTags)

  // download testFile using Private url
  checkTags = {
    tool: tags.tools.HTTP,
    feature: tags.features.GET_OBJECT_PRIVATE,
    command: tags.commands.HTTP_GET,
  }
  const url_priv = `${endpoint}/${mgcConfig.project}/${bucketName}/${fileName}`
  //
  console.log(url_priv)
  const res_priv = http.get(url_priv.trim())
  console.log(`GET response=${res_priv.body}`)
  console.log(`GET response status =${res_priv.status}`)
  check(res_priv.status, {
    [`${checkTags.command} response have status 401`]: s => s === 401
  }, checkTags)

  // generate public (GET) url using AWS-CLI
  checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  const response = aws(s3Config, "s3api", [ "put-bucket-acl", "--bucket", bucketName, "--acl", "public-read" ])
  check(response, {
    [`${checkTags.command} put bucket acl empty response`]: r => r.includes("")
  }, checkTags)

  // download testFile using Public url
  checkTags = {
    tool: tags.tools.HTTP,
    feature: tags.features.GET_OBJECT_PUBLIC,
    command: tags.commands.HTTP_GET,
  }
  const url = `${endpoint}/${mgcConfig.project}/${bucketName}/${fileName}`
  //
  console.log(url)
  const res = http.get(url.trim())
  console.log(`GET response=${res.body}`)
  console.log(`GET response status =${res.status}`)
  check(res.status, {
    [`${checkTags.command} response have status 200`]: s => s === 200
  }, checkTags)
}
