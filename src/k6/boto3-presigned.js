import exec from 'k6/x/exec';
import { check, fail } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { aws } from './utils.js'
import http from 'k6/http';

const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");

export function setup() {
    const bucketName = `test-aws-cli-${crypto.randomUUID()}`
    console.log(aws("s3", ["mb", `s3://${bucketName}`]))
    return {bucketName}
}

export default function scenarios (data){
    presignPut(data)
}

export function teardown({bucketName}) {
    // delete bucket used by the tests
    console.log(aws("s3", [ "rb",
      `s3://${bucketName}`, "--force"
    ]))
  }

export function presignPut({bucketName}){
    const url = exec.command('./src/boto3/presign.py',[__ENV.AWS_CLI_PROFILE, 'generate-put-url', bucketName, testFileName])
    console.log(url)
    check(url, {"[presign.py] Pre-signed PUT URL contains query parameter X-Amz-Signature": u => u.includes("X-Amz-Signature=")})
    const res = http.put(url.trim(), testFile)
  console.log(`PUT response=${res.body}`)
  console.log(`PUT response status =${res.status}`)
  check(res.status, {"[upload] PUT response have status 200": s => s === 200 })
}

