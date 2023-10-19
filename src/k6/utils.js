import { randomBytes } from 'k6/crypto';
import { fail } from 'k6'
import file from 'k6/x/file';
import exec from 'k6/x/exec';

const profileName = __ENV.AWS_CLI_PROFILE
const endpoint = __ENV.S3_ENDPOINT
const region = __ENV.S3_REGION
const authUrl = __ENV.SWIFT_AUTH_URL // URL for obtaining an auth token
const user = __ENV.SWIFT_USER // User name for obtaining an auth token.
const key = __ENV.SWIFT_KEY // Key for obtaining an auth token.
const authVersion = "1.0" // Specify a version for authentication.


export function aws(subCommand, args=[]){
  return exec.command("aws", [
    subCommand,
    "--profile", profileName,
    "--endpoint", endpoint,
    "--region", region,
    ...args,
  ])
}
export function swift(cmdName, args=[]){
  return exec.command("swift", [
    "--auth-version", authVersion,
    "--auth", authUrl,
    "--user", user,
    "--key", key,
    cmdName,
    ...args,
  ])
}
export function swiftSetupCheck() {
  let errors = []
  if (!authUrl) { errors.push("Missing SWIFT_AUTH_URL") }
  if (!user) { errors.push("Missing SWIFT_USER") }
  if (!key) { errors.push("Missing SWIFT_KEY") }
  return errors
}

// parse JSON
export function parseJsonOrFail(value) {
  let parsedResult;
  try {
    parsedResult = JSON.parse(value)
  } catch(e) {
    console.error(e)
    fail('Unparseable result response')
  }
  return parsedResult
}

// checks if every etag from a given etag list, is present in the stdOut string
export function checkParts(parts, etags) {
  return parts.reduce((result, part) => {
    return (etags.find(e => e.ETag == part.ETag) !== undefined) && result
  }, true)
}

export function generateMultipartFiles(chunkPrefix, chunkCount=2, chunkSize=6) {
  console.log("Generating files for test multipart upload...")
  const bigFile = randomBytes(chunkSize * chunkCount * 1024 * 1024);
  let chunks = []
  let initSlice = 0
  
  for (let i = 1; i <= chunkCount; i++) {
    let endSlice = (chunkSize * i) * 1024 * 1024
    let partData = bigFile.slice(initSlice, endSlice);
    let chunkPath = `${chunkPrefix}_${i}`
    file.writeBytes(
      chunkPath, 
      Array.from(new Uint8Array(partData)));
    initSlice = endSlice
    chunks.push({path: chunkPath, partNumber: i})
  }
  console.log("Done generating files for test multipart upload...")
  return chunks
}

export function removeMultipartFiles(chunkPrefix, chunkCount) {
  console.log("Cleaning files for test multipart upload...")
  for(let i = 1; i <= chunkCount; i++) {
    file.deleteFile(`${chunkPrefix}_${i}`)
  }
  console.log("Done cleaning files for test multipart upload...")
}
