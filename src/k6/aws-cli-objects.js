import exec from 'k6/x/exec';
import { check, fail } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import http from 'k6/http';
import { aws, parseJsonOrFail, checkParts, generateMultipartFiles, removeMultipartFiles } from './utils.js'

const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r"); //objects.js

function s3api(cmdName, bucketName, args){
  return aws("s3api", [
    cmdName,
    "--bucket", bucketName,
    ...args,
  ])
}

function s3(cmdName, args=[]){
  return aws("s3", [
    cmdName,
    ...args,
  ])
}

export function setup() {
  // create bucket to be used by the tests
  const bucketName = `test-aws-cli-${crypto.randomUUID()}`
  console.log(s3api("create-bucket", bucketName, []))
  return {bucketName}
}

export function teardown({bucketName}) {
  // delete bucket used by the tests
  console.log(s3("rb", [
    `s3://${bucketName}`, "--force"
  ]))
}

export default function scenarios(data) {
  presignGet(data)
  createMultipartUpload(data)
  completeMultipartUpload(data)
  copyMultipartUpload(data)
}

export function presignGet({bucketName}) {
  const fileName = `get-${testFileName}`

  // upload a test file
  const uploadOutput = s3("cp", [ testFileName, `s3://${bucketName}/${fileName}` ])
  console.log({uploadOutput})
  check(uploadOutput, {
    "[aws s3 cp] cp output contains filename": o => o.includes(testFileName),
    "[aws s3 cp] cp output contains bucket name": o => o.includes(bucketName),
    "[aws s3 cp] cp output contains object key": o => o.includes(fileName),
  })

  // generate presigned url using AWS-CLI
  const url = s3("presign", [ `s3://${bucketName}/${fileName}` ])
  console.log(`Pre-signed GET URL=${url}`)
  check(url, {"[aws s3 presign] Pre-signed GET URL contains query parameter Signature": u => u.includes("Signature=")})

  // download testFile using GET on that url before the expirantion date
  const res = http.get(url.trim())
  console.log(`GET response=${res.body}`)
  console.log(`GET response status =${res.status}`)
  check(res.status, {"[aws s3 presign] GET response have status 200": s => s === 200 })
}

export function createMultipartUpload({bucketName}){
  const keyName = crypto.randomUUID()

  // create the multipart upload
  let stdOut = s3api("create-multipart-upload", bucketName, [
    "--key", keyName
  ])
  console.info("Create Output", stdOut)
  let parsedResult = parseJsonOrFail(stdOut)
  const uploadId = parsedResult.UploadId 
  check(uploadId, {
    'CLI returns a response with UploadId': id => id !== undefined,
  })

  // list multipart uploads
  stdOut = s3api("list-multipart-uploads", bucketName, [])
  console.info("List Output", stdOut)
  check(stdOut, {
    'In-progress multipart uploads list the key': s => s.includes(keyName),
    'In-progress multipart uploads list the upload ID': s => s.includes(uploadId),
  })

  // abort the multipart upload
  stdOut = s3api("abort-multipart-upload", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId, 
  ])
  console.info("Abort Output:", stdOut)
  
}

export function completeMultipartUpload({bucketName}) {
  // setup
  const keyName = crypto.randomUUID()
  let chunkCount = 2
  let chunks = generateMultipartFiles(keyName, chunkCount)

  // create the multipart upload
  let stdOut = s3api("create-multipart-upload", bucketName, [
    "--key", keyName
  ])
  console.info("Create Output", stdOut)
  let parsedResult = parseJsonOrFail(stdOut)
  const uploadId = parsedResult.UploadId 
  check(uploadId, {
    'CLI returns a response with UploadId': id => id !== undefined,
  })

  // upload parts
  let etags = []
  chunks.forEach(chunk => {
    stdOut = s3api("upload-part", bucketName, [
      "--key", keyName,
      "--upload-id", uploadId,
      "--part-number", chunk.partNumber,
      "--body", chunk.path
    ])
    console.info("Upload part Output:", stdOut)
    check(stdOut, {
      'Uploaded part has Etag': s => s.includes("ETag")
    })
    etags.push(parseJsonOrFail(stdOut))
  })

  // list uploaded parts
  stdOut = s3api("list-parts", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId
  ])
  console.info("List parts Output:", stdOut)
  let parts = parseJsonOrFail(stdOut).Parts
  check(stdOut, {
    'List parts has all Etags': s => checkParts(parts, etags)
  })

  // complete multipart
  parts = parts.map(p => { 
    return {"PartNumber": p.PartNumber, "ETag": p.ETag}
  })
  stdOut = s3api("complete-multipart-upload", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId,
    "--multipart-upload", JSON.stringify({Parts: parts})
  ])
  console.info("Complete multipart Output:", stdOut)
  check(stdOut, {
    'Completed multipart has Etag': s => s.includes("ETag")
  })

  removeMultipartFiles(keyName, chunkCount)
}

export function copyMultipartUpload({bucketName}) {
  // setup
  const keyName = crypto.randomUUID()
  let chunkCount = 2
  let chunks = generateMultipartFiles(keyName, chunkCount)
  let firstChunk = chunks[0]
  let etags = []

  // create the multipart upload
  let stdOut = s3api("create-multipart-upload", bucketName, [
    "--key", keyName
  ])
  console.info("Create Output", stdOut)
  let parsedResult = parseJsonOrFail(stdOut)
  const uploadId = parsedResult.UploadId 
  check(uploadId, {
    'CLI returns a response with UploadId': id => id !== undefined,
  })

  // upload any singlepart object
  let singlePartKeyName = `${keyName}_singlepart`
  stdOut = s3api("put-object", bucketName, [
    "--key", singlePartKeyName,
    "--body", firstChunk.path
  ])
  console.info("Upload object Output:", stdOut)
  etags.push(parseJsonOrFail(stdOut))

  // copy the singlepart object as second part
  stdOut = s3api("upload-part-copy", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId,
    "--part-number", firstChunk.partNumber,
    "--copy-source", `${bucketName}/${singlePartKeyName}`,
  ])
  console.info("Upload part copy Output:", stdOut)
  check(stdOut, {
    'Copy part has Etag': s => s.includes("ETag")
  })

  // list uploaded parts
  stdOut = s3api("list-parts", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId
  ])
  console.info("List parts Output:", stdOut)
  let parts = parseJsonOrFail(stdOut).Parts
  check(stdOut, {
    'List parts uploaded with copy has Etags': s => checkParts(parts, etags)
  })

  // abort the multipart upload
  stdOut = s3api("abort-multipart-upload", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId, 
  ])
  console.info("Abort Output:", stdOut)

  removeMultipartFiles(keyName, chunkCount)
}
