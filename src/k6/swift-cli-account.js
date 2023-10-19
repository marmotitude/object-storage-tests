import { check, fail } from 'k6'
import { swift, swiftSetupCheck } from './utils.js'

export function setup() {
  const errors = swiftSetupCheck().join(", ")
  if (errors.length > 0) { fail(errors) }
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
