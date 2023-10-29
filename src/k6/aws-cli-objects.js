import { check, group } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import http from 'k6/http';
import exec from 'k6/x/exec';
import { parse as yamlParse } from "k6/x/yaml";
import { aws, parseJsonOrFail, checkParts, generateMultipartFiles, removeMultipartFiles } from './utils/index.js'
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const testFileName = "LICENSE"
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3

function s3api(cmdName, bucketName, args){
  return aws(s3Config, "s3api", [
    cmdName,
    "--bucket", bucketName,
    ...args,
  ])
}

function s3(cmdName, args=[]){
  return aws(s3Config, "s3", [
    cmdName,
    ...args,
  ])
}

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
  group(tags.features.PUT_OBJECT_MULTIPART, function(){
    const data2 = createMultipartUpload(data)
    listMultipartUploads(data2)
    abortMultipartUpload(data2)

    const data3 = createMultipartUpload(data)
    completeMultipartUpload(data3)

    const data4 = createMultipartUpload(data)
    copyMultipartUpload(data4)
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
  const uploadOutput = s3("cp", [ testFileName, `s3://${bucketName}/${fileName}` ])
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
  const url = s3("presign", [ `s3://${bucketName}/${fileName}` ])
  console.log(`Pre-signed GET URL=${url}`)
  check(url, {
    [`${checkTags.command} GET URL contains Signature param`]: u => u.includes("Signature=")
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

export function createMultipartUpload({bucketName}){
  const keyName = crypto.randomUUID()

  // create the multipart upload
  let checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_CREATE_MULTIPART,
  }
  let stdOut = s3api("create-multipart-upload", bucketName, [
    "--key", keyName
  ])
  console.info("Create Output", stdOut)
  let parsedResult = parseJsonOrFail(stdOut)
  const uploadId = parsedResult.UploadId 
  check(uploadId, {
    [`${checkTags.command} have UploadId`]: id => id !== undefined,
  }, checkTags)

  return {bucketName, keyName, uploadId}
}
function listMultipartUploads({bucketName, keyName, uploadId}) {
  // list multipart uploads
  const checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_MULTIPART,
  }
  const stdOut = s3api("list-multipart-uploads", bucketName, [])
  console.info("List Output", stdOut)
  check(stdOut, {
    [`${checkTags.command} have key`]: s => s.includes(keyName),
    [`${checkTags.command} have upload ID`]: s => s.includes(uploadId),
  }, checkTags)

  return {bucketName, keyName, uploadId}
}

function abortMultipartUpload({bucketName, keyName, uploadId}) {
  // abort the multipart upload
  const checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_ABORT_MULTIPART,
  }
  const stdOut = s3api("abort-multipart-upload", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId, 
  ])
  console.info("Abort Output:", stdOut)
  check(stdOut, {
    [`${checkTags.command}`]: o => o === ""
  }, checkTags)
}
function completeMultipartUpload({bucketName, keyName, uploadId}) {
  // generate parts
  let chunkCount = 2
  let chunks = generateMultipartFiles(keyName, chunkCount)

  // upload parts
  let etags = []
  let stdOut
  let checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_UPLOAD_PART,
  }
  chunks.forEach(chunk => {
    stdOut = s3api("upload-part", bucketName, [
      "--key", keyName,
      "--upload-id", uploadId,
      "--part-number", chunk.partNumber,
      "--body", chunk.path
    ])
    console.info("Upload part Output:", stdOut)
    check(stdOut, {
      [`${checkTags.command} has Etag`]: s => s.includes("ETag")
    }, checkTags)
    etags.push(parseJsonOrFail(stdOut))
  })

  // list uploaded parts
  checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_PARTS,
  }
  stdOut = s3api("list-parts", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId
  ])
  console.info("List parts Output:", stdOut)
  let parts = parseJsonOrFail(stdOut).Parts
  check(stdOut, {
    [`${checkTags.command} has all Etags`]: s => checkParts(parts, etags)
  }, checkTags)

  // complete multipart
  parts = parts.map(p => { 
    return {"PartNumber": p.PartNumber, "ETag": p.ETag}
  })
  checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_COMPLETE_MULTIPART,
  }
  stdOut = s3api("complete-multipart-upload", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId,
    "--multipart-upload", JSON.stringify({Parts: parts})
  ])
  console.info("Complete multipart Output:", stdOut)
  check(stdOut, {
    [`${checkTags.command} has Etag`]: s => s.includes("ETag")
  }, checkTags)

  removeMultipartFiles(keyName, chunkCount)
}

function copyMultipartUpload({bucketName, keyName, uploadId}) {
  let chunkCount = 2
  let chunks = generateMultipartFiles(keyName, chunkCount)
  let firstChunk = chunks[0]
  let etags = []

  // upload any singlepart object
  let singlePartKeyName = `${keyName}_singlepart`
  let checkTags = {
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_OBJECT,
  }
  let stdOut = s3api("put-object", bucketName, [
    "--key", singlePartKeyName,
    "--body", firstChunk.path
  ])
  console.info("Upload object Output:", stdOut)
  check(stdOut, {
    [`${checkTags.command} has Etag`]: s => s.includes("ETag")
  }, checkTags)
  etags.push(parseJsonOrFail(stdOut))

  // copy the singlepart object as second part
  checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_UPLOAD_PART_COPY,
  }
  stdOut = s3api("upload-part-copy", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId,
    "--part-number", "1",
    "--copy-source", `${bucketName}/${singlePartKeyName}`,
  ])
  console.info("Upload part copy Output:", stdOut)
  check(stdOut, {
    [`${checkTags.command} has Etag`]: s => s.includes("ETag")
  }, checkTags)

  // list uploaded parts
  checkTags = {
    feature: tags.features.PUT_OBJECT_MULTIPART,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_PARTS,
  }
  stdOut = s3api("list-parts", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId
  ])
  console.info("List parts Output:", stdOut)
  let parts = parseJsonOrFail(stdOut).Parts
  check(stdOut, {
    [`${checkTags.command} has Etags`]: s => checkParts(parts, etags)
  }, checkTags)

  // abort the multipart upload
  abortMultipartUpload({bucketName, keyName, uploadId})

  removeMultipartFiles(keyName, chunkCount)
}
