import exec from 'k6/x/exec';
import { check, fail } from 'k6'

const authUrl = __ENV.SWIFT_AUTH_URL // URL for obtaining an auth token
const user = __ENV.SWIFT_USER // User name for obtaining an auth token.
const key = __ENV.SWIFT_KEY // Key for obtaining an auth token.
const authVersion = "1.0" // Specify a version for authentication.

function swift(cmdName, args=[]){
  return exec.command("swift", [
    "--auth-version", authVersion,
    "--auth", authUrl,
    "--user", user,
    "--key", key,
    cmdName,
    ...args,
  ])
}

export function setup() {
  //check env vars
  if (!authUrl) { fail("Missing SWIFT_AUTH_URL") }
  if (!user) { fail("Missing SWIFT_USER") }
  if (!key) { fail("Missing SWIFT_KEY") }
}

export default function scenarios(data) {
  accountStats()
}

export function accountStats() {
  const stdOut = swift("stat")
  console.log(stdOut)
  check(stdOut, {
    "swift stat contains Account: info": o => o.includes("Account:")
  })
}
