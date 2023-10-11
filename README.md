# object-storage-tests
Collection of simple scripts to consume object storage APIs and gather metrics.

## Toolbox

- [aws-cli](https://aws.amazon.com/cli/)
- [k6](https://github.com/grafana/k6)
  - with [xk6-exec](https://github.com/grafana/xk6-exec) extension
- [rclone](https://rclone.org/)
- [just](https://just.systems/)
- [dasel](https://github.com/TomWright/dasel)
- [tee](https://en.wikipedia.org/wiki/Tee_(command))
- [openssl](https://www.openssl.org/docs/man1.0.2/man1/openssl.html)

## Setup

### bundle xk6-exec extension on k6

```
# generate new binary
docker run --rm -it -u "$(id -u):$(id -g)" -v "${PWD}:/xk6" grafana/xk6 build v0.43.1 --with github.com/grafana/xk6-exec@v0.3.0

# overwrite existing k6 with the new one
sudo cp -f ./k6 `which k6`
```

### rclone

Create an rclone.conf using the command:

```
rclone config
```

NOTE: Open your rclone.conf file and make sure your AWS block contains something similar to
 `endpoint = https://s3.us-east-1.amazonaws.com` and that all remotes contains a `region = something`


### aws-cli

Setup your profile credentials with:

```
aws configure --profile <profile_name>
```

## Usage

Run the desired tests using `just`, the reciepe name and pass a remote name as argument.

Type `just` to get a list of the available tests.

See the [justfile](./justfile) for more info on the actual command executed.

## License

MIT License (c) 2023 Marmotidude and [AUTHORS](./AUTHORS)
