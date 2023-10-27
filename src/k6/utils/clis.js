import exec from 'k6/x/exec';

const profileName = __ENV.AWS_CLI_PROFILE

export function aws({endpoint, region}, subCommand, args=[]){
  return exec.command("aws", [
    subCommand,
    "--profile", profileName,
    "--endpoint", endpoint,
    "--region", region,
    ...args,
  ])
}

export function swift({auth, user, key}={}, cmdName, args=[]){
  const authVersion = "1.0" // Specify a version for authentication.
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
  return exec.command("mgc", [
    "object-storage",
    command,
    subCommand,
    "--region", region,
    ...args,
  ])
}