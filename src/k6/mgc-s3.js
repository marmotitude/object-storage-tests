import { check } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { mgc } from './utils/clis.js'
import { parse as yamlParse } from 'k6/x/yaml';
import exec from 'k6/x/exec';
import tags from "./utils/tags.js"

const config = yamlParse(open('../../config.yaml'));
const mgcConfig = config.remotes[__ENV.AWS_CLI_PROFILE].mgc
const bucketName = `test-mgc-cli-${crypto.randomUUID()}`
const testFile = "LICENSE"
const largeFile = "/usr/bin/k6"
const largeFileName = "k6"

export function setup(){}

export default function scenarios (data){
    createBucket(data)
    listBucket(data)
    uploadObject(data)
    downloadObject(data)
    listObject(data)
    multipartUpload(data)
    deleteObject(data)
    deleteBucket(data)
    teardown(data)
}

export function teardown(){
    const output = exec.command("rm", ["-rf", `${bucketName}` ])
  }

export function createBucket() {
    let checkTags = {
        feature: tags.features.CREATE_BUCKET,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_BUCKETS_CREATE,
      }
    const res = mgc(mgcConfig, "buckets", "create", ["--name", bucketName])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes(bucketName)}, checkTags);
}

export function listBucket() {
    let checkTags = {
        feature: tags.features.LIST_BUCKETS,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_BUCKETS_LIST,
      }
    const res = mgc(mgcConfig, "buckets", "list")
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes(bucketName)}, checkTags)
}

export function uploadObject() {
    let checkTags = {
        feature: tags.features.PUT_OBJECT,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_OBJECTS_UPLOAD,
      }
    const res = mgc(mgcConfig, "objects", "upload", ["--src", testFile, "--dst", bucketName])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes(testFile)}, checkTags)
}

export function listObject() {
    let checkTags = {
        feature: tags.features.LIST_BUCKET_OBJECTS,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_BUCKETS_CREATE,
      }
    const res = mgc(mgcConfig, "objects", "list", ["--dst", bucketName])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes(testFile)}, checkTags)
}

export function multipartUpload() {
    let checkTags = {
        feature: tags.features.PUT_OBJECT_MULTIPART,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_OBJECTS_UPLOAD,
      }
    const res = mgc(mgcConfig, "objects", "upload", ["--src", largeFile, "--dst", bucketName])
    console.log(res)
    check(res, {[`${checkTags.command} has large file`]:l => l.includes(`Uploaded file ${largeFileName} to`)}, checkTags)
}

export function downloadObject() {
    let checkTags = {
        feature: tags.features.GET_OBJECT,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_OBJECTS_DOWNLOAD,
      }
    const res = mgc(mgcConfig, "objects", "download", ["--src", `${bucketName}/${testFile}`, "--dst", bucketName])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes(testFile)}, checkTags)
}

export function deleteObject() {
    let checkTags = {
        feature: tags.features.DELETE_OBJECT,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_OBJECTS_DELETE,
      }
    const res = mgc(mgcConfig, "objects", "delete", ["--dst", `${bucketName}/${testFile}`, "--cli.bypass-confirmation"])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes("")}, checkTags)
}


export function deleteBucket() {
    let checkTags = {
        feature: tags.features.DELETE_BUCKET,
        tool: tags.tools.CLI_MGC,
        command: tags.commands.CLI_MGC_BUCKETS_DELETE,
      }
    const res = mgc(mgcConfig, "buckets", "delete", ["--name", bucketName, "--cli.bypass-confirmation"])
    console.log(res)
    check(res, {[checkTags.command]:l => l.includes(bucketName)}, checkTags)
}



