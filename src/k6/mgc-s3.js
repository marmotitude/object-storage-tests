import { check, fail } from 'k6'
import { crypto } from "k6/experimental/webcrypto"
import { mgc } from './utils/clis.js'
import { parse as yamlParse } from 'k6/x/yaml';
import exec from 'k6/x/exec';

const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes['mgc-se']['mgc']
const region = s3Config.region
const bucketName = `test-mgc-cli-${crypto.randomUUID()}`
const testFile = "LICENSE"
const largeFile = "/usr/bin/k6"


export default function scenarios (data){
    createBucket(data)
    listBucket(data)
    uploadObject(data)
    downloadObject(data)
    listObject(data)
    deleteObject(data)
    deleteBucket(data)
    teardown(data)
}

export function teardown(){
    const output = exec.command("rm", ["-rf", `${bucketName}` ])
}

export function createBucket() {
    const res = mgc(s3Config, "buckets", "create", ["--name", bucketName])
    check(res, {"[mgc] create bucket":l => l.includes(bucketName)});
}

export function listBucket() {
    console.log(s3Config)
    const res = mgc(s3Config, "buckets", "list")
    check(res, {"[mgc] list contains bucket name":l => l.includes(bucketName)})
}

export function uploadObject() {
    const res = mgc(s3Config, "objects", "upload", ["--src", testFile, "--dst", bucketName])
    check(res, {"[mgc] upload object":l => l.includes(testFile)})
}

export function listObject() {
    const res = mgc(s3Config, "objects", "list", ["--dst", bucketName])
    console.log(res)
    check(res, {"[mgc] object exists in bucket":l => l.includes(testFile)})
}

export function multipartUpload() {
    const res = mgc(s3Config, "objects", "upload", ["--src", largeFile, "--dst", bucketName])
    check(res, {"[mgc] upload large object":l => l.includes(`Uploaded file ${largeFile} to`)})
}

export function downloadObject() {
    const res = mgc(s3Config, "objects", "download", ["--src", `${bucketName}/${testFile}`, "--dst", bucketName])
    check(res, {"[mgc] download object":l => l.includes(testFile)})
}

export function deleteObject() {
    const res = mgc(s3Config, "objects", "delete", ["--dst", `${bucketName}/${testFile}`, "--cli.bypass-confirmation"])
    console.log(res)
    check(res, {"[mgc] object is deleted":l => l.includes("")})
}


export function deleteBucket() {
    const res = mgc(s3Config, "buckets", "delete", ["--name", bucketName, "--cli.bypass-confirmation"])
    check(res, {"[mgc] bucket is deleted":l => l.includes(bucketName)})
}



