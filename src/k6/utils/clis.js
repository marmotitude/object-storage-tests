import exec from 'k6/x/exec';

const profileName = __ENV.AWS_CLI_PROFILE
const profileName2 = `${__ENV.AWS_CLI_PROFILE}-second`

export function aws({endpoint, region}, subCommand, args=[]){
  console.log(`execute aws`)
  console.log(`aws ${subCommand} --profile ${profileName} --endpoint ${endpoint} --region ${region} ${args.join(' ')}`)
  return exec.command("aws", [
    subCommand,
    "--profile", profileName,
    "--endpoint", endpoint,
    "--region", region,
    ...args,
  ])
}

export function aws2({endpoint, region}, subCommand, args=[]){
  return exec.command("aws", [
    subCommand,
    "--profile", profileName2,
    "--endpoint", endpoint,
    "--region", region,
    ...args,
  ])
}

export function swift({auth, user, key}={}, cmdName, args=[]){
  const authVersion = "1.0" // Specify a version for authentication.
  console.log(`execute swift`)
  return exec.command("swift", [
    "--auth-version", authVersion,
    "--auth", auth,
    "--user", user,
    "--key", key,
    cmdName,
    ...args,
  ])
}

export function mgc({region}, command, subCommand, args=[]){
  console.log(`execute mgc`)
  return exec.command("mgc", [
    "object-storage",
    command,
    subCommand,
    "--region", region,
    ...args,
  ])
}
export function rclone(subCommand, args=[]){
  console.log(`execute rclone`)
  console.log(`rclone ${subCommand} ${args.join(' ')}`)
  return exec.command("rclone", [
    subCommand,
    ...args,
  ])
}
