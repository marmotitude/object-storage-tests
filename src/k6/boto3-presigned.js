import { check, group, fail } from 'k6'
import http from 'k6/http';
import exec from 'k6/x/exec';
import { parse as yamlParse } from "k6/x/yaml";
import { crypto } from "k6/experimental/webcrypto"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"
import { aws } from './utils/index.js'

// init stage
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data);
}
export default function scenarios (data){
  presignPut(data)
}

export function presignPut({bucketName}){
  const url = exec.command('./src/boto3/presign.py',[
    __ENV.AWS_CLI_PROFILE, 'generate-put-url', bucketName, testFileName])
  console.log(url)
  let checkTags = {
    feature: tags.features.CREATE_PRESIGN_PUT_URL,
    tool: tags.tools.LIB_PYTHON_BOTO3,
    command: tags.commands.LIB_PYTHON_BOTO3_CLIENT_GENERATE_PRESIGNED_URL,
  }
  group(checkTags.feature, function(){
    check(url, {
      [`${checkTags.command}`]: u => u.includes("X-Amz-Signature=") }, checkTags)
  })

  const res = http.put(url.trim(), testFile)
  console.log(`PUT response status =${res.status}`)
  checkTags = {
    feature: tags.features.PUT_OBJECT_PRESIGNED,
    tool: tags.tools.HTTP,
    command: tags.commands.HTTP_PUT,
  }
  group(checkTags.feature, function(){
    check(res.status, {
      [`${checkTags.command}`]: s => s === 200 }, checkTags)

    const list = aws(s3Config, "s3", ["ls", `s3://${bucketName}`])
    console.log(`s3 ls = ${list}`)
    checkTags = {
      feature: tags.features.LIST_BUCKET_OBJECTS,
      tool: tags.tools.CLI_AWS,
      command: tags.commands.CLI_AWS_S3_LS,
    }
    check(list, {
      [`${checkTags.command} contains uploaded object`]:l => l.includes(testFileName)}, checkTags)
    })
}
