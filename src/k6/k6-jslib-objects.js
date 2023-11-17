import { check, group } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import { crypto } from "k6/experimental/webcrypto"
import { aws } from "./utils/clis.js"
import makeS3Client from "./utils/s3-client.js"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");
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
export default async function scenarios(data) {
  await putAndGetObject(data)
  group(tags.features.PUT_OBJECT_MULTIPART, function(){
    abortMultipart(data)
  })
}

export async function putAndGetObject({bucketName}) {
  const testFileKey = `${testFileName}_${crypto.randomUUID()}`
  let checkTags = {
    feature: tags.features._PUT_OBJECT,
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.LIB_JS_K6_AWS,
    command: tags.commands.LIB_JS_K6_AWS_S3CLIENT_PUT_OBJECT,
  };
  console.info(`uploading test file ${testFileKey} to bucket ${bucketName}`)
  const putResult = await s3.putObject(bucketName, testFileKey, testFile);
  group(tags.features.PUT_OBJECT, function(){
    check(putResult, {
      [checkTags.command]: r => r === undefined
    }, checkTags)
  })

  checkTags = {
    feature: tags.features._GET_OBJECT,
    feature: tags.features.GET_OBJECT,
    tool: tags.tools.LIB_JS_K6_AWS,
    command: tags.commands.LIB_JS_K6_AWS_S3CLIENT_GET_OBJECT,
  };
  const getResult = await s3.getObject(bucketName, testFileKey);
  group(tags.features.GET_OBJECT, function(){
    check(getResult, {
      [checkTags.command]: o => o.size === testFile.length,
    }, checkTags)
  })
}

export async function abortMultipart({bucketName}) {
  const testFileKey = `${testFileName}_${crypto.randomUUID()}`
  console.info(`creating multipart upload of ${testFileKey} on bucket ${bucketName}...`)
  let createMultipartUploadResult
  let abortMultipartUploadResult = null // undefined is a success result, so we use null as unset
  // XXX: this fails on some S3 implementations that dont support virtual-hosted-style URLs
  try {
    // see https://github.com/grafana/k6-jslib-aws/issues/70 is fixed
    createMultipartUploadResult = await s3.createMultipartUpload(bucketName, testFileKey);
    // abort multipart upload
    abortMultipartUploadResult = await s3.abortMultipartUpload(
      bucketName, testFileKey, createMultipartUploadResult.uploadId);
  } catch (e) {
    console.error(e.message)
  }
  let checkTags = {
    feature: tags.features._PUT_OBJECT_MULTIPART,
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.LIB_JS_K6_AWS,
    command: tags.commands.LIB_JS_K6_AWS_S3CLIENT_CREATE_MULTIPART,
  };
  group(checkTags.feature, function(){
    check(createMultipartUploadResult, {
      [checkTags.command]: m => m && m.uploadId !== undefined,
    }, checkTags)

    checkTags = {
      feature: tags.features._PUT_OBJECT_MULTIPART,
      feature: tags.features.PUT_OBJECT_MULTIPART,
      tool: tags.tools.LIB_JS_K6_AWS,
      command: tags.commands.LIB_JS_K6_AWS_S3CLIENT_ABORT_MULTIPART,
    };
    check(abortMultipartUploadResult, {
      [checkTags.command]: a => a === undefined }, checkTags)
  })
}
