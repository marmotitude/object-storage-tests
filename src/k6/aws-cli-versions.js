import { check, group } from 'k6'
import http from 'k6/http';
import { parse as yamlParse } from "k6/x/yaml";
import { aws, parseJsonOrFail } from './utils/index.js'
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const testFileName = "LICENSE"
const testFileName2 = "Dockerfile"
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[__ENV.AWS_CLI_PROFILE].s3

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data);
}
export default function scenarios(data) {
  group(tags.features.GET_OBJECT_PRESIGNED, function(){
    putVersioning(data)
  })
}
export function putVersioning({bucketName}) {

  // putVersioning
  let checkTags = {
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_VERSIONING,
  }
  const uploadOutput = aws(s3Config, "s3api", [ "put-bucket-versioning", "--bucket", bucketName, "--versioning-configuration", "Status=Enabled" ])
  console.log({uploadOutput})
  check(uploadOutput, {
    [`${checkTags.command} accepted`]: o => o.includes(""),
  }, checkTags)

  // upload three versions
  const upload = aws(s3Config, "s3api", [ "put-object", "--bucket", bucketName, "--key", testFileName])
  const upload2 = aws(s3Config, "s3api", [ "put-object", "--bucket", bucketName, "--key", testFileName, "--body", testFileName])
  const upload3 = aws(s3Config, "s3api", [ "put-object", "--bucket", bucketName, "--key", testFileName, "--body", testFileName2])
  // see three versions of testFile
  checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECT_VERSIONS,
  }
  const get_versions = aws(s3Config, "s3api", [ "list-object-versions", "--bucket", bucketName, "--prefix", testFileName])
  const versionsObject = parseJsonOrFail(get_versions)
    // Extrair os VersionId e armazená-los em uma variável
  const versionIds = versionsObject.Versions.map(version => version.VersionId)
  check(versionIds, {
    [`${checkTags.command} lengths equal to three`]: versionIds.length == 3,
  }, checkTags)
  const versionID = versionIds[1]
  checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_GET_OBJECT,
  }
  const getVersion = aws(s3Config, "s3api", [ "get-object", "--bucket", bucketName, "--key", testFileName, "--version-id", versionID, "LICENSE"])
  check(getVersion, {
    [`${checkTags.command} specific version`]: o => o.includes("LastModified"),
  }, checkTags)
  versionIds.forEach(element => {
    const remove_versions = aws(s3Config, "s3api", [ "delete-object", "--bucket", bucketName, "--key", testFileName, "--version-id", element])
  });
}
