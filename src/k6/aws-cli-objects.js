import exec from 'k6/x/exec';
import { check, fail } from 'k6'
import { crypto } from "k6/experimental/webcrypto"

const profileName = __ENV.AWS_CLI_PROFILE
const endpoint = __ENV.S3_ENDPOINT

function s3api(cmdName, bucketName, args){
  return exec.command("aws", [
    "s3api",
    "--profile", profileName,
    "--endpoint", endpoint,
    cmdName,
    "--bucket", bucketName,
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
  console.log(s3api("delete-bucket", bucketName, []))
}

export default function scenarios(data) {
  createMultipartUpload(data)
}

export function createMultipartUpload({bucketName}){
  const keyName = crypto.randomUUID()

  // create the multipart upload
  let stdOut = s3api("create-multipart-upload", bucketName, [
    "--key", keyName
  ])
  console.info("Create Output", stdOut)
  let parsedResult;
  try {
    parsedResult = JSON.parse(stdOut)
  } catch(e) {
    console.error(e)
    fail('Unparseable create-multipart-upload response')
  }
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

  // TBD: upload parts

  // abort the multipart upload
  stdOut = s3api("abort-multipart-upload", bucketName, [
    "--key", keyName,
    "--upload-id", uploadId, 
  ])
  console.info("Abort Output:", stdOut)
  
}
