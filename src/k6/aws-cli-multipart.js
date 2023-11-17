import { check, group } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
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
  group(tags.features.PUT_OBJECT_MULTIPART, function(){
    const data2 = createMultipartUpload(data)
    data2 && listMultipartUploads(data2)
    data2 && abortMultipartUpload(data2)

    const data3 = createMultipartUpload(data)
    data3 && completeMultipartUpload(data3)

    const data4 = createMultipartUpload(data)
    data4 && copyMultipartUpload(data4)
  })
}
export function createMultipartUpload({bucketName}){
  const keyName = crypto.randomUUID()

  // create the multipart upload
  let checkTags = {
    tool: tags.tools.CLI_AWS,
    feature: tags.features.CREATE_MULTIPART_UPLOAD,
    command: tags.commands.CLI_AWS_S3API_CREATE_MULTIPART,
  }
  let stdOut = s3api("create-multipart-upload", bucketName, [
    "--key", keyName
  ])
  console.info("Create Output", stdOut)
  check(stdOut, {
    [`${checkTags.command}`]: o => o.includes("UploadId"),
  }, checkTags)
  let parsedResult = parseJsonOrFail(stdOut)
  const uploadId = parsedResult.UploadId 
  check(uploadId, {
    [`${checkTags.command}`]: id => id !== undefined,
  }, checkTags)

  return {bucketName, keyName, uploadId}
}
function listMultipartUploads({bucketName, keyName, uploadId}) {
  // list multipart uploads
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    feature: tags.features._LIST_MULTIPART_UPLOADS,
    feature: tags.features.LIST_MULTIPART_UPLOADS,
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
    tool: tags.tools.CLI_AWS,
    feature: tags.features._ABORT_MULTIPART_UPLOAD,
    feature: tags.features.ABORT_MULTIPART_UPLOAD,
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
    tool: tags.tools.CLI_AWS,
    feature: tags.features._UPLOAD_MULTIPART_PART,
    feature: tags.features.UPLOAD_MULTIPART_PART,
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
    tool: tags.tools.CLI_AWS,
    feature: tags.features._LIST_MULTIPART_UPLOAD_PARTS,
    feature: tags.features.LIST_MULTIPART_UPLOAD_PARTS,
    command: tags.commands.CLI_AWS_S3API_LIST_PARTS,
  }
  stdOut = s3api("list-parts", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId
  ])
  console.info("List parts Output:", stdOut)
  check(stdOut, {
    [`${checkTags.command}`]: o => o.includes("Parts"),
  }, checkTags)
  let parts = parseJsonOrFail(stdOut).Parts
  check(stdOut, {
    [`${checkTags.command} has all Etags`]: s => checkParts(parts, etags)
  }, checkTags)

  // complete multipart
  parts = parts.map(p => { 
    return {"PartNumber": p.PartNumber, "ETag": p.ETag}
  })
  checkTags = {
    tool: tags.tools.CLI_AWS,
    feature: tags.features._PUT_OBJECT_MULTIPART,
    feature: tags.features.PUT_OBJECT_MULTIPART,
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
    feature: tags.features._PUT_OBJECT,
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
    tool: tags.tools.CLI_AWS,
    feature: tags.features._UPLOAD_MULTIPART_PART,
    feature: tags.features.UPLOAD_MULTIPART_PART,
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
    tool: tags.tools.CLI_AWS,
    feature: tags.features._LIST_MULTIPART_UPLOAD_PARTS,
    feature: tags.features.LIST_MULTIPART_UPLOAD_PARTS,
    command: tags.commands.CLI_AWS_S3API_LIST_PARTS,
  }
  stdOut = s3api("list-parts", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId
  ])
  console.info("List parts Output:", stdOut)
  check(stdOut, {
    [`${checkTags.command}`]: s => s.includes("Parts")
  }, checkTags)
  let parts = parseJsonOrFail(stdOut).Parts
  check(stdOut, {
    [`${checkTags.command} has Etags`]: s => checkParts(parts, etags)
  }, checkTags)

  // abort the multipart upload
  abortMultipartUpload({bucketName, keyName, uploadId})

  removeMultipartFiles(keyName, chunkCount)
}
