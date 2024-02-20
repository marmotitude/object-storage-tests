import { check, group } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import { crypto } from "k6/experimental/webcrypto"
import { aws, aws2 } from "./utils/clis.js"
import { parseJsonOrFail } from "./utils/index.js"
import {bucketSetup, bucketTeardown} from "./utils/test-bucket.js"
import tags from "./utils/tags.js"

// init stage
const profile = __ENV.AWS_CLI_PROFILE
const config = yamlParse(open('../../config.yaml'));
const s3Config = config.remotes[profile].s3
const testFileName = "LICENSE"
const testFile = `./${testFileName}`;
const bucketName2 = `test-${crypto.randomUUID()}`
let s3ConfigSecond;
const locationConstraint = s3Config.region === 'us-east-1' ?  [] :
  ["--create-bucket-configuration", `LocationConstraint=${s3Config.region}`]
try {
  s3ConfigSecond = config.remotes[`${profile}-second`].s3;
} catch (error) {
  s3ConfigSecond = false;
}

// test stages
export function setup(){
  return bucketSetup(s3Config);
}
export function teardown(data){
  return bucketTeardown(data)
}

export default function scenarios(data) {
  if (!s3ConfigSecond) { return }
  createSecondBucket(data)
  const data2 = catch_id(data)
  READwithoutacl(data)
  READonREADacl(data2)
  WRITEonREADacl(data)
  WRITEonWRITEacl(data2)
  READonWRITEacl(data)
  READonREADWRITE(data2)
  WRITEonREADWRITE(data)
  READ_ACPwithoutacl(data)
  READ_ACPonREAD_ACPacl(data2)
  WRITE_ACPonREAD_ACPacl(data2)
  WRITE_ACPwithoutAcl(data2)
  WRITE_ACPonWRITE_ACPacl(data2)
  READ_ACPonWRITE_ACPacl(data)
  READonFull_Controlacl(data2)
  WRITEonFull_Controlacl(data)
  READ_ACPonFull_Controlacl(data2)
  WRITE_ACPonFull_Controlacl(data)
  PUBLICREADonPUBLICREADacl(data)
  READonREADobjectonlyacl(data2)
  READobjectonREADobjectonlyacl(data)
  GETonREADacl(data2)
  removeBucket(data)
}

export function createSecondBucket({data}) {
  const checkTags = {
    feature: tags.features.CREATE_BUCKET,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_CREATE_BUCKET,
  }

  const SecondBucketResult = aws2(s3ConfigSecond, "s3", [
    "mb",
    `s3://${bucketName2}`,
    ...locationConstraint
  ])
  check(SecondBucketResult, {
    [`${checkTags.command} Second Bucket created` ]: out => out.includes(bucketName2)
  }, checkTags)
}

export function catch_id({bucketName}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  const getID = aws2(s3ConfigSecond, "s3api", [
    "get-bucket-acl",
    "--bucket", bucketName2,
    ...locationConstraint
  ])
  let parsedResult = parseJsonOrFail(getID)
  const ID = parsedResult.Owner.ID
  console.log(ID)
  check(getID, {
    [`${checkTags.command} ID catched` ]: out => out.includes(ID)
  }, checkTags)
  return {bucketName, ID}
}

export function READwithoutacl({bucketName}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  const READwithoutaclResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READwithoutaclResult)
  check(READwithoutaclResult, {
    [`${checkTags.command} READ without acl` ]: out => out.includes("exit status")
  }, checkTags)
}

export function READonREADacl({bucketName, ID}, data) {
  console.log(data)
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-read",
    `id=${ID}`,
    ...locationConstraint
  ])
  aws(s3Config, "s3", [ "cp", testFileName, `s3://${bucketName}/${testFileName}` ])
  const READonREADaclResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READonREADaclResult)
  check(READonREADaclResult, {
    [`${checkTags.command} READ on READ acl` ]: out => out.includes(testFileName)
  }, checkTags)
}

export function WRITEonREADacl({bucketName}) {
  const checkTags = {
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_OBJECT,
  }
  const WriteWhithoutWriteuploadOutput = aws2(s3ConfigSecond, "s3api", [
    "put-object",
    "--bucket", bucketName,
    "--key", "License2",
    "--body", testFile,
    ...locationConstraint
  ])
  console.log({WriteWhithoutWriteuploadOutput})
  check(WriteWhithoutWriteuploadOutput, {
    [`${checkTags.command} WRITE on READ acl expected error`]: o => o.includes("exit status"),
  }, checkTags)
}

export function WRITEonWRITEacl({bucketName, ID}) {
  const checkTags = {
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_OBJECT,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-write",
    `id=${ID}`,
    ...locationConstraint
  ])
  const WRITEonWRITEaclResult = aws2(s3ConfigSecond, "s3api", [
    "put-object",
    "--acl", "bucket-owner-full-control",
    "--bucket", bucketName,
    "--key", "License2",
    "--body", testFile,
    ...locationConstraint
  ])
  console.log(WRITEonWRITEaclResult)
  check(WRITEonWRITEaclResult, {
    [`${checkTags.command} WRITE on WRITE acl`]: o => o.includes("ETag"),
  }, checkTags)
}

export function READonWRITEacl({bucketName}){
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  const READonWRITEaclResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READonWRITEaclResult)
  check(READonWRITEaclResult, {
    [`${checkTags.command} READ on WRITE acl response dont have file` ]: out => out.includes("exit status")
  }, checkTags)
}

export function READonREADWRITE({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-read",
    `id=${ID}`,
    "--grant-write",
    `id=${ID}`,
    ...locationConstraint
  ])
  const READonREADWRITEResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READonREADWRITEResult)
  check(READonREADWRITEResult, {
    [`${checkTags.command} READ on READ-WRITE acl response dont have file` ]: out => out.includes("LICENSE")
  }, checkTags)
}

export function WRITEonREADWRITE({bucketName}) {
  const checkTags = {
    feature: tags.features.PUT_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_OBJECT,
  }
  const WRITEonREADWRITEResult = aws2(s3ConfigSecond, "s3api", [
    "put-object",
    "--acl", "bucket-owner-full-control",
    "--bucket", bucketName,
    "--key", "License2",
    "--body", testFile,
    ...locationConstraint
  ])
  console.log(WRITEonREADWRITEResult)
  check(WRITEonREADWRITEResult, {
    [`${checkTags.command} WRITE on READ WRITE`]: o => o.includes("ETag"),
  }, checkTags)
}

export function READ_ACPwithoutacl({bucketName}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_GET_BUCKET_ACL,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--acl", "private"
  ])
  const READ_ACPwithoutaclResult = aws2(s3ConfigSecond, "s3api", [
    "get-bucket-acl",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READ_ACPwithoutaclResult)
  check(READ_ACPwithoutaclResult, {
    [`${checkTags.command} READ_ACP without acl expected error` ]: out => out.includes("exit status")
  }, checkTags)
}

export function READ_ACPonREAD_ACPacl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_GET_BUCKET_ACL,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-read-acp",
    `id=${ID}`,
    ...locationConstraint
  ])
  const READ_ACPonREAD_ACPaclResult = aws2(s3ConfigSecond, "s3api", [
    "get-bucket-acl",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READ_ACPonREAD_ACPaclResult)
  check(READ_ACPonREAD_ACPaclResult, {
    [`${checkTags.command} READ_ACP on READ_ACP includes ID` ]: out => out.includes(ID)
  }, checkTags)
}

export function WRITE_ACPonREAD_ACPacl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  const WRITE_ACPonREAD_ACPaclResult = aws2(s3ConfigSecond, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-full-control",
    `id=${ID}`,
    ...locationConstraint
  ])
  console.log(WRITE_ACPonREAD_ACPaclResult)
  check(WRITE_ACPonREAD_ACPaclResult, {
    [`${checkTags.command} WRITE_ACP IN READ ACP expected error` ]: out => out.includes("exit status")
  }, checkTags)
}

export function WRITE_ACPwithoutAcl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--acl", "private"
  ])
  const WRITE_ACPwithoutAclResult = aws2(s3ConfigSecond, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-full-control",
    `id=${ID}`,
    ...locationConstraint
  ])
  console.log(WRITE_ACPwithoutAclResult)
  check(WRITE_ACPwithoutAclResult, {
    [`${checkTags.command} WRITE_ACP without ACL expected error` ]: out => out.includes("exit status")
  }, checkTags)
}

export function WRITE_ACPonWRITE_ACPacl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  aws(s3ConfigSecond, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-write-acp",
    `id=${ID}`,
    ...locationConstraint
  ])
  const WRITE_ACPonWRITE_ACPaclResult = aws2(s3ConfigSecond, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-full-control",
    `id=${ID}`,
    ...locationConstraint
  ])

  console.log(WRITE_ACPonWRITE_ACPaclResult)
  check(WRITE_ACPonWRITE_ACPaclResult, {
    [`${checkTags.command} WRITE_ACP IN WRITE_ACP` ]: out => out.includes("")
  }, checkTags)
}

export function READ_ACPonWRITE_ACPacl({bucketName}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_GET_BUCKET_ACL,
  }
  const READ_ACPonWRITE_ACPaclResult = aws2(s3ConfigSecond, "s3api", [
    "get-bucket-acl",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READ_ACPonWRITE_ACPaclResult)
  check(READ_ACPonWRITE_ACPaclResult, {
    [`${checkTags.command} READ_ACP on ACL READ_ACP` ]: out => out.includes("exit status")
  }, checkTags)
}

export function READonFull_Controlacl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-full-control",
    `id=${ID}`,
    ...locationConstraint
  ])
  const READonFull_ControlaclResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READonFull_ControlaclResult)
  check(READonFull_ControlaclResult, {
    [`${checkTags.command} READ in Full Control acl` ]: out => out.includes("LICENSE")
  }, checkTags)
}

export function WRITEonFull_Controlacl({bucketName}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_OBJECT_ACL,
  }
  const WRITEonFull_ControlaclResult = aws2(s3ConfigSecond, "s3api", [
    "put-object",
    "--acl", "bucket-owner-full-control",
    "--bucket", bucketName,
    "--key", "License3",
    "--body", testFile,
    ...locationConstraint
  ])
  console.log(WRITEonFull_ControlaclResult)
  check(WRITEonFull_ControlaclResult, {
    [`${checkTags.command} WRITE on Full Control`]: o => o.includes("ETag"),
  }, checkTags)
}

export function READ_ACPonFull_Controlacl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  const READ_ACPonFull_ControlaclResult = aws2(s3ConfigSecond, "s3api", [
    "get-bucket-acl",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READ_ACPonFull_ControlaclResult)
  check(READ_ACPonFull_ControlaclResult, {
    [`${checkTags.command} READ_ACP on Full Control` ]: out => out.includes(ID)
  }, checkTags)
}

export function WRITE_ACPonFull_Controlacl({bucketName}) {
  const checkTags = {
    feature: tags.features.PUT_PRIVATE_ACL,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_PUT_BUCKET_ACL,
  }
  const WRITE_ACPonFull_ControlaclResult = aws2(s3ConfigSecond, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--acl", "private"
  ])
  console.log(WRITE_ACPonFull_ControlaclResult)
  check(WRITE_ACPonFull_ControlaclResult, {
    [`${checkTags.command} WRITE_ACP in Full Control` ]: out => out.includes("")
  }, checkTags)
}

export function PUBLICREADonPUBLICREADacl({bucketName}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--acl", "public-read"
  ])
  const PUBLICREADonPUBLICREADaclResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(PUBLICREADonPUBLICREADaclResult)
  check(PUBLICREADonPUBLICREADaclResult, {
    [`${checkTags.command} PUBLIC-READ in PUBLIC-READ acl` ]: out => out.includes(testFileName)
  }, checkTags)
}

export function READonREADobjectonlyacl({bucketName, ID}) {
  const checkTags = {
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_LIST_OBJECTS_V2,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--acl", "private"
  ])
  aws(s3Config, "s3api", [
    "put-object-acl",
    "--bucket", bucketName,
    "--key", testFileName,
    "--grant-read", `id=${ID}`
  ])
  const READonREADobjectonlyaclResult = aws2(s3ConfigSecond, "s3api", [
    "list-objects-v2",
    "--bucket", bucketName,
    ...locationConstraint
  ])
  console.log(READonREADobjectonlyaclResult)
  check(READonREADobjectonlyaclResult, {
    [`${checkTags.command} READ bucket in READ object only expected error` ]: out => out.includes("exit status")
  }, checkTags)
}

export function READobjectonREADobjectonlyacl({bucketName}) {
  const checkTags = {
    feature: tags.features.GET_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_GET_OBJECT,
  }
  const READobjectonREADobjectonlyaclResult = aws2(s3ConfigSecond, "s3api", [
    "get-object",
    "--bucket", bucketName,
    "--key", testFileName,
    `./${testFileName}`,
    ...locationConstraint
  ])
  console.log(READobjectonREADobjectonlyaclResult)
  check(READobjectonREADobjectonlyaclResult, {
    [`${checkTags.command} Get object with read acl` ]: out => out.includes("")
  }, checkTags)
}

export function GETonREADacl({bucketName, ID}) {
  const checkTags = {
    feature: tags.features.GET_OBJECT,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3API_GET_OBJECT,
  }
  aws(s3Config, "s3api", [
    "put-bucket-acl",
    "--bucket", bucketName,
    "--grant-read",
    `id=${ID}`,
    ...locationConstraint
  ])
  aws(s3Config, "s3api", [
    "put-object-acl",
    "--bucket", bucketName,
    "--key", testFileName,
    "--acl", "private"
  ])
  const getObjectAclS3Result = aws2(s3ConfigSecond, "s3api", [
    "get-object",
    "--bucket", bucketName,
    "--key", testFileName,
    "/tmp/x",
    ...locationConstraint
  ])
  console.log(getObjectAclS3Result)
  check(getObjectAclS3Result, {
    [`${checkTags.command} GET object without Object acl` ]: out => out.includes("exit status")
  }, checkTags)
}

export function removeBucket({data}) {
  const purgeBucketResult = aws2(
    s3Config,
    "s3",
    [ "rb", `s3://${bucketName2}`, "--force" ]
  )
  console.log(purgeBucketResult)
  const checkTags = {
    feature: tags.features.PURGE_BUCKET,
    tool: tags.tools.CLI_AWS,
    command: tags.commands.CLI_AWS_S3_RB,
  }
  check(purgeBucketResult, {
    [checkTags.command]: out => out.includes(bucketName2)}, checkTags)
  }