import { check, fail, sleep } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import exec from 'k6/x/exec';
import { parse as yamlParse } from "k6/x/yaml";
import { aws, swift, swiftSetupCheck } from './utils/index.js'

const config = yamlParse(open('../../config.yaml'));
const swiftConfig = config.remotes[__ENV.AWS_CLI_PROFILE].swift
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3 

export function setup() {
  const errors = swiftSetupCheck(swiftConfig).join(", ")
  if (errors.length > 0) { fail(errors) }
  const testBuckets = [
    `test-s3-cp-${crypto.randomUUID()}`,
    `test-s3-cp-${crypto.randomUUID()}`,
  ]
  const largeFiles = [
    "/usr/bin/k6",
    "/usr/bin/rclone",
  ]
  testBuckets.forEach(bucketName => {
    const output = aws(s3Config, "s3", [ "mb", `s3://${bucketName}` ])
    console.log(output)
    check(output, {
      "aws s3 mb (make bucket) success": o => o.includes(bucketName),
    })
  })
  return {testBuckets, largeFiles}
}
export function teardown({testBuckets, largeFiles}) {
  testBuckets.forEach(bucketName => {
    const output = aws(s3Config, "s3", [ "rb", "--force", `s3://${bucketName}` ])
    console.log(output)
    check(output, {
      "aws s3 rb (remove bucket) with --force success": o => o.includes(bucketName),
    })
  })
}

export default function scenarios(data) {
  uploadWithSegments(data)
  overwriteUploadWithSegments(data)
}
function getObjectsCount(statString){
  const match = /Objects: (\d+)/.exec(statString)[1]
  return parseInt(match, 10)
}
export function uploadWithSegments({testBuckets, largeFiles}) {
  const objectName = "largeFile"
  let bucketStats = []
  testBuckets.forEach((bucketName, i) => {
    console.log(i, `aws s3 cp ${largeFiles[i]} s3://${bucketName}/${objectName}`)
    const output = aws(s3Config, "s3", [ "cp", "--no-progress", largeFiles[i], `s3://${bucketName}/${objectName}` ])
    console.log(output)
    check(output, {
      "aws s3 cp success": o => o.includes(bucketName) && o.includes(objectName),
    })
    bucketStats.push(
      swift(swiftConfig, "stat", [`${bucketName}+segments`])
    )
  })
  console.log({bucketStats})
  const objectCounts = bucketStats.map(getObjectsCount)
  console.log({objectCounts})
  check(objectCounts, {
    "swift s3api middleware filled +segments containers": counts => counts.length === testBuckets.length,
    "number of segments are different between the 2 files": counts => counts[0] !== counts[1],
  })
}
export function overwriteUploadWithSegments({testBuckets, largeFiles}){
  const bucketName = testBuckets[0]
  const target = `s3://${bucketName}/largeFile`
  const fileA = largeFiles[0]
  const fileB = largeFiles[1]
  let objectCounts = []
  // first upload
  console.log(`aws s3 cp ${fileA} ${target}`)
  console.log(aws(s3Config, "s3", [ "cp", "--no-progress", fileA, target ]))
  objectCounts.push(getObjectsCount(
    swift(swiftConfig, "stat", [`${bucketName}+segments`])
  ))
  // second upload, overwrite with a different file
  console.log(`aws s3 cp ${fileB} ${target}`)
  console.log(aws(s3Config, "s3", [ "cp", "--no-progress", fileB, target ]))
  objectCounts.push(getObjectsCount(
    swift(swiftConfig, "stat", [`${bucketName}+segments`])
  ))
  // third upload, overwrite the original file
  console.log(`aws s3 cp ${fileA} ${target}`)
  console.log(aws(s3Config, "s3", [ "cp", "--no-progress", fileA, target ]))
  objectCounts.push(getObjectsCount(
    swift(swiftConfig, "stat", [`${bucketName}+segments`])
  ))
  console.log({objectCounts})
  check(objectCounts, {
    "segments count is different when A is replaced with B": counts => counts[0] !== counts[1],
    "segments count is different when B is replaced with A": counts => counts[1] !== counts[2],
    "segments count is the same of original A and the result of A>B>A": counts => counts[2] === counts[0],
  })
}
