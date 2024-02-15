import { check } from 'k6'
import exec from 'k6/x/exec';
import { parse as yamlParse } from 'k6/x/yaml';
import { rclone } from './utils/clis.js'
import {bucketSetup } from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

const profileName = __ENV.AWS_CLI_PROFILE
const config = yamlParse(open('../../config.yaml'));
const rcloneConfig = config.remotes[__ENV.AWS_CLI_PROFILE].s3
const testFile = "LICENSE"
const largeFile = "/usr/bin/k6"
const largeFileName = "k6"

// test stages
export function setup(){
    return bucketSetup(rcloneConfig);
}

export function teardown(){
  return '';
}

export default function scenarios (data){
    uploadObject(data)
    uploadMultipartObject(data)
    downloadObject(data)
    listBuckets(data)
    rcloneCat(data)
    purgeBucket(data)
}

export function uploadObject({bucketName}) {
    let checkTags = {
        feature: tags.features.PUT_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_COPY,
    }
    const res = rclone("copy", [testFile, `${profileName}-s3:${bucketName}`])
    console.log(res)
    check(res, {[`${checkTags.command} upload`]:l => !l.includes('exit status')}, checkTags)
}

export function uploadMultipartObject({bucketName}) {
    let checkTags = {
        feature: tags.features.PUT_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_COPY,
      }
    const res = rclone("copy", [largeFile, `${profileName}-s3:${bucketName}`,'--transfers', '4', '--s3-upload-concurrency', '4', '--s3-chunk-size', '5Mi'])
    console.log(res)
    check(res, {[`${checkTags.command} upload multipart`]:l => !l.includes('exit status')}, checkTags)
}

export function downloadObject({bucketName}) {
    let checkTags = {
        feature: tags.features.GET_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_COPY,
    }
    const outDir = `test-local-${bucketName}`
    // test copying to the same existing local file
    const copyOutput = rclone("copy", [`${profileName}-s3:${bucketName}/${testFile}`, `.`])
    console.log("download response:", copyOutput)
    check(copyOutput, {
      [`${checkTags.command} download to existing`]:out => !out.includes('exit status'),
    }, checkTags)

    // test copying file not present on destination
    // delete local file before downloading
    const newName = `${testFile}2`
    const copyOutput2 = rclone("copyto", [`${profileName}-s3:${bucketName}/${testFile}`, `./${newName}`])
    console.log("download2 response:", copyOutput2)
    check(copyOutput2, {
      [`${checkTags.command} download`]:out => !out.includes('exit status'),
    }, checkTags)
    // remove new copy
    console.log(exec.command("rm", [newName]))
}

export function listBuckets({bucketName}) {
  let checkTags = {
      feature: tags.features.LIST_BUCKETS,
      tool: tags.tools.CLI_RCLONE,
      command: tags.commands.CLI_RCLONE_LIST,
    }
    const res = rclone("lsd", [`${profileName}-s3:`])
    console.log(res)
  check(res, {[checkTags.command]:l => l.includes(`${bucketName}`)}, checkTags)
}

export function rcloneCat({bucketName}) {
    let checkTags = {
        feature: tags.features.GET_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_CAT,
      }
      const res = rclone("cat", [`${profileName}-s3:${bucketName}/${testFile}`])
      console.log("cat response", res)
    check(res, {[checkTags.command]:l => l.includes("MIT License")}, checkTags)
}

export function purgeBucket({bucketName}) {
    let checkTags = {
        feature: tags.features.DELETE_BUCKET,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_PURGE,
      }
    const res = rclone("purge", [`${profileName}-s3:${bucketName}`])
    console.log(res)
    check(res, {[checkTags.command]:l => !l.includes("exit status")}, checkTags)
}
