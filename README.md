# object-storage-tests
A growing test suite for S3-like object storage implementations.

## About
This project uses the load tests framework [k6](https://github.com/grafana/k6) (extended
with the [xk6-exec](https://github.com/grafana/xk6-exec) extension) as the basis
to execute test scenarios using popular open source command line tools
like [aws-cli](https://aws.amazon.com/cli/), [rclone](https://rclone.org/), as well as
the open source k6 module [k6-jslib-aws](https://github.com/grafana/k6-jslib-aws).

### Roadmap
This is an early-stage project and the main focus is to test S3-compatible providers,
like AWS and Digital Ocean. But other object storage open source servers, like MinIO
and OpenStack Swift are planned, so tests using the 
[swift-cli](https://docs.openstack.org/ocata/cli-reference/swift.html) and
[mc](https://min.io/docs/minio/linux/reference/minio-mc.html) tools are in the roadmap.

An informal "board" can be viewed [here](https://github.com/orgs/marmotitude/projects/2), card
descriptions might be mixed in Portuguese and English.

## Usage

This tool is available as a [docker image](https://hub.docker.com/r/fczuardi/object-storage-tests), 
to run the tests against your object-storage servers, copy the [example.config.toml](./example.config.toml) to `config.toml`
and run:

```
podman run object-storage-tests test <remote-name>
```

The output of the tests, metrics and logs are stored in a folder named `results`.

## License

MIT License (c) 2023 Marmotidude and [AUTHORS](./AUTHORS)

## Contributing

The easiest way to have a working developing environment is to use the provided dev-shell,
using distrobox:

```
distrobox assemble create
distrobox enter devshell-obj
```

If you have just, there is a shortcut:

```
just build-dev
just dev
```

The devshell is a container with all the project tools installed, plus some extra developer
tools like a code editor and a nice shell, to know more about this dev image see
[devshell.Dockerfile](./devshell.Dockerfile).

