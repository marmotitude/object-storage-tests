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

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data);
}
export default function scenarios(data) {
  group(tags.features.GET_OBJECT_PRESIGNED, function(){
    presignGet(data)
  })
}
export function presignGet({bucketName}) {
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

  // generate presigned (GET) url using AWS-CLI
  checkTags = {
    feature: tags.features.CREATE_PRESIGN_GET_URL_V2,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3_PRESIGN,
  }
  const url = aws(s3Config, "s3", [ "presign", `s3://${bucketName}/${fileName}` ])
  console.log(`Pre-signed GET URL=${url}`)
  check(url, {
    [`${checkTags.command} GET URL contains Signature (v2) param`]: u => u.includes("Signature=")
  }, checkTags)

  // download testFile using GET on that url before the expirantion date
  checkTags = {
    feature: tags.features.GET_OBJECT,
    tool: tags.tools.HTTP,
    command: tags.commands.HTTP_GET,
  }
  const res = http.get(url.trim())
  console.log(`GET response=${res.body}`)
  console.log(`GET response status =${res.status}`)
  check(res.status, {
    [`${checkTags.command} response have status 200`]: s => s === 200
  }, checkTags)
}
