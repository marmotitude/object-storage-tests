import { check, fail } from 'k6'
import http from 'k6/http';
import { crypto } from "k6/experimental/webcrypto"
import exec from 'k6/x/exec';
import { parse as yamlParse } from "k6/x/yaml";
import { aws } from './utils/index.js'

const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const testFileName = "LICENSE"
const testFile = open(`../../${testFileName}`, "r");


export function setup() {
    const bucketName = `test-aws-cli-${crypto.randomUUID()}`
    console.log(aws(s3Config, "s3", ["mb", `s3://${bucketName}`]))
    return {bucketName}
}

export default function scenarios (data){
    presignPut(data)
    listObject(data)
}

export function teardown({bucketName}) {
    // delete bucket used by the tests
    console.log(aws(s3Config, "s3", [ "rb",
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

export function listObject({bucketName}){
  const list = (aws(s3Config, "s3", ["ls", `s3://${bucketName}/${testFileName}`]))
  console.log(`List s3=${list}`)
  check(list, {"[List] response contains object name":l => l.includes(testFileName)})
}
