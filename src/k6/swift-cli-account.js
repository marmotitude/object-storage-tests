import { check, fail } from 'k6'
import { parse as yamlParse } from "k6/x/yaml";
import { swift, swiftSetupCheck } from './utils/index.js'

const config = yamlParse(open('../../config.yaml'));
const swiftConfig = config.remotes[__ENV.AWS_CLI_PROFILE].swift

export function setup() {
  const errors = swiftSetupCheck(swiftConfig).join(", ")
  if (errors.length > 0) { fail(errors) }
}

export default function scenarios(data) {
  accountStats()
}

export function teardown(){}

export function accountStats() {
  const stdOut = swift(swiftConfig, "stat")
  console.log(stdOut)
  check(stdOut, {
    "swift stat contains Account: info": o => o.includes("Account:")
  })
}
