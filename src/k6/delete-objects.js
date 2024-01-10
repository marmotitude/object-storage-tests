import { check } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import { aws, rclone } from "./utils/clis.js"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const bucketName = __ENV.TEST_BUCKET
const testFileName = "LICENSE"
const profileName = __ENV.AWS_CLI_PROFILE
const profile = __ENV.AWS_CLI_PROFILE
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[profile].s3

export function setup(){
  // a list of key names will be used to create and delete 7 objects
  const objectKeys = Array.from(
    { length: 7 },
    (_, index) => `obj-${(index + 1).toString().padStart(3, '0')}`
  );
  const localFile = `./${testFileName}`
  const data = bucketSetup(s3Config, bucketName);
  return Object.assign({}, data, {objectKeys: objectKeys, localFile})
}
export function teardown(data){
  return bucketTeardown(data, bucketName)
}
export default function scenarios(data) {
  createObjects(data)
  deleteObjects(data)
}

// create small objects using different tools
function createObjects(data) {
  let checkTags = { feature: tags.features.PUT_OBJECT, }
  data.objectKeys.forEach((keyName, index) => {
    let out;
    if (index < 2) {
      // copy some files using s3 cp
      out = aws(s3Config, "s3", ["cp", data.localFile, `s3://${data.bucketName}/${keyName}`])
      checkTags.tool = tags.tools.CLI_AWS
      checkTags.command = tags.commands.CLI_AWS_S3_CP
      check(out, { [`${checkTags.command}` ]: out => out.includes("Completed") }, checkTags)
    } else if (index >= 2 && index < 4) {
      // copy some files using s3api put-object
      out = aws(s3Config, "s3api", [
        "put-object",
        "--body", data.localFile,
        "--key", keyName,
        "--bucket", data.bucketName
      ])
      checkTags.tool = tags.tools.CLI_AWS
      checkTags.command = tags.commands.CLI_AWS_S3API_PUT_OBJECT
      check(out, { [`${checkTags.command}` ]: out => out.includes("ETag") }, checkTags)
    } else {
      // copy some files using rclone copyto
      out = rclone("copyto", [ data.localFile, `${profileName}-s3:${data.bucketName}/${keyName}` ])
      checkTags.tool = tags.tools.CLI_RCLONE
      checkTags.command = tags.commands.CLI_RCLONE_COPYTO
      check(out, { [`${checkTags.command}` ]: out => !out.includes("exit status") }, checkTags)
    }
  })
}

//delete small objects using different tools
function deleteObjects(data) {
  let checkTags = { feature: tags.features.DELETE_OBJECT, }
  data.objectKeys.every((keyName, index) => {
    let out;
    if (index == 0) {
      // delete a single object using aws s3
      out = aws(s3Config, "s3", ["rm", `s3://${data.bucketName}/${keyName}`])
      checkTags.tool = tags.tools.CLI_AWS
      checkTags.command = tags.commands.CLI_AWS_S3_RM
      check(out, { [`${checkTags.command}` ]: out => out.includes("delete:") }, checkTags)
      return true
    } else if (index == 1) {
      // delete a single object using aws s3api
      out = aws(s3Config, "s3api", ["delete-object", "--bucket", data.bucketName, "--key", keyName])
      checkTags.tool = tags.tools.CLI_AWS
      checkTags.command = tags.commands.CLI_AWS_S3API_DELETE_OBJECT
      check(out, { [`${checkTags.command}` ]: out => !out.includes("exit status") }, checkTags)
      return true
    } else if (index == 2) {
      // delete a single object using rclone
      out = rclone("delete", [ "-v", `${profileName}-s3:${data.bucketName}/${keyName}` ])
      checkTags.tool = tags.tools.CLI_RCLONE
      checkTags.command = tags.commands.CLI_RCLONE_DELETE
      check(out, { [`${checkTags.command}` ]: out => !out.includes("exit status") }, checkTags)
      return true
    } else if (index == 3) {
      // delete two objects using aws s3api
      const objectsToDelete = data.objectKeys.slice(index, index + 2).map(k => ({"Key": k}))
      out = aws(s3Config, "s3api", [
        "delete-objects",
        "--bucket", data.bucketName,
        "--delete", `{"Objects": ${JSON.stringify(objectsToDelete)} }`
      ])
      console.log({out})
      checkTags.feature = tags.features.DELETE_OBJECTS
      checkTags.tool = tags.tools.CLI_AWS
      checkTags.command = tags.commands.CLI_AWS_S3API_DELETE_OBJECTS
      check(out, { [`${checkTags.command}` ]: out => out.includes("Deleted") }, checkTags)
      check(out, { [`${checkTags.command}` ]: out => out.includes(keyName) }, checkTags)
      return true
    } else if (index == 4) {
      // skiped because previous deleted 2
      return true
    } else {
      // check size before deletion
      out = rclone("size", [ `${profileName}-s3:${data.bucketName}` ])
      console.log({out})
      let match = out.match(/Total objects: (\d+)/);
      const totalObjectsBefore = match ? parseInt(match[1], 10) : null;
      // delete remaining objects using rclone
      out = rclone("delete", [ "--min-size", "10B", "-v", `${profileName}-s3:${data.bucketName}` ])
      checkTags.feature = tags.features.DELETE_OBJECTS
      checkTags.tool = tags.tools.CLI_RCLONE
      checkTags.command = tags.commands.CLI_RCLONE_DELETE
      console.log({out})
      check(out, { [`${checkTags.command}` ]: out => !out.includes("exit status") }, checkTags)
      // check size after deletion
      out = rclone("size", [ `${profileName}-s3:${data.bucketName}` ])
      console.log({out})
      match = out.match(/Total objects: (\d+)/);
      const totalObjectsAfter = match ? parseInt(match[1], 10) : null;
      const objectsDelta = totalObjectsAfter - totalObjectsBefore
      console.log({objectsDelta})
      check(objectsDelta, { [`${checkTags.command} multiple objects` ]: d => d <= -2 }, checkTags)
      return false
    }
  })
}
