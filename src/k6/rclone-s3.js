import { check } from 'k6'
import { rclone } from './utils/clis.js'
import { parse as yamlParse } from 'k6/x/yaml';
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
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
    const res = rclone(rcloneConfig, "copy", [testFile, `${profileName}:${bucketName}`])
    console.log(res)
    check(res, {[`${checkTags.command} upload`]:l => l.includes('')}, checkTags)
}

export function uploadMultipartObject({bucketName}) {
    let checkTags = {
        feature: tags.features.PUT_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_COPY,
      }
    const res = rclone(rcloneConfig, "copy", [largeFile, `${profileName}:${bucketName}`,'--transfers', '4', '--s3-upload-concurrency', '4', '--s3-chunk-size', '5Mi'])
    console.log(res)
    check(res, {[`${checkTags.command} upload multipart`]:l => l.includes('')}, checkTags)
}

export function downloadObject({bucketName}) {
    let checkTags = {
        feature: tags.features.GET_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_COPY,
      }
    const res = rclone(rcloneConfig, "copy", [`${profileName}:${bucketName}`, '.'])
    console.log(res)
    check(res, {[`${checkTags.command} download`]:l => l.includes('')}, checkTags)
}

export function listBuckets({bucketName}) {
  let checkTags = {
      feature: tags.features.LIST_BUCKETS,
      tool: tags.tools.CLI_RCLONE,
      command: tags.commands.CLI_RCLONE_LIST,
    }
    const res = rclone(rcloneConfig, "lsd", [`${profileName}:`])
    console.log(res)
  check(res, {[checkTags.command]:l => l.includes(`${bucketName}`)}, checkTags)
}

export function rcloneCat({bucketName}) {
    let checkTags = {
        feature: tags.features.GET_OBJECT,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_CAT,
      }
      const res = rclone(rcloneConfig, "cat", [`${profileName}:${bucketName}/${testFile}`])
      console.log(res)
    check(res, {[checkTags.command]:l => l.includes('')}, checkTags)
}

export function purgeBucket({bucketName}) {
    let checkTags = {
        feature: tags.features.DELETE_BUCKET,
        tool: tags.tools.CLI_RCLONE,
        command: tags.commands.CLI_RCLONE_PURGE,
      }
    const res = rclone(rcloneConfig, "purge", [`${profileName}:${bucketName}`])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes("")}, checkTags)
}