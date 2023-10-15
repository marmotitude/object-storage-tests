# object-storage-tests
A growing test suite for S3-like object storage implementations.

## About
This project uses the load tests framework [k6](https://github.com/grafana/k6) (extended
with the [xk6-exec](https://github.com/grafana/xk6-exec) extension) as the basis
to execute test scenarios using popular open source command line tools
like [aws-cli](https://aws.amazon.com/cli/), [rclone](https://rclone.org/), as well as
the open source k6 module [k6-jslib-aws](https://github.com/grafana/k6-jslib-aws).

### Roadmap
This is an early-stage project and the main focus is to test proprietary
object storage providers, like AWS and Digital Ocean. But we would like
to include open source/self-hosted object storage providers as well,
like MinIO and OpenStack Swift, so tests using the
[swift-cli](https://docs.openstack.org/ocata/cli-reference/swift.html) and
[mc](https://min.io/docs/minio/linux/reference/minio-mc.html) tools are in the roadmap.

An informal "board" can be viewed [here](https://github.com/orgs/marmotitude/projects/2), card
descriptions might be mixed in Portuguese and English.

## Requirements

This tool was only tested on **Linux** machines with
[podman](https://podman.io/docs/installation#installing-on-linux) and
[just](https://just.systems/man/en/chapter_5.html) installed.

## Usage

**object-storage-tests** is available as two [docker images](https://hub.docker.com/r/fczuardi/object-storage-tests):
  - tag `latest` is the main test suite with commands and requirements to run it.
  - tag `devshell` is a shell for developer to use it interactively and make contributions.

To run the test against a S3-compatible provider (we call them "remotes"), first
copy the [example.config.yaml](./example.config.yaml) to `config.yaml` and edit it to
include your credentials.

Then list the configured remotes with:
```
just run list-remotes
```

And run the tests with:
```
just run test <remote name>
```

The output of the tests, metrics and logs are stored in a folder named `results`.

**Note:** if you are inside the devshell you don't need the word `run` (see the "Contributing" section below)


## License

MIT License (c) 2023 Marmotidude and [AUTHORS](./AUTHORS)

## Contributing

The easiest way to have a working developing environment is to use the provided dev-shell,
using [distrobox](https://distrobox.it/#installation):

First build the image and the distrobox with:
```
just build-dev
```

Then enter it with
```
just dev
```

To run the tests from inside the devshell use:
```
just test <remote name>
```

The devshell is a container with all the project tools installed, plus some extra developer
tools like a code editor and a nice shell, to know more about this dev image see
[devshell.Dockerfile](./devshell.Dockerfile).

## Acknowledgments

- Luizalabs / @kikoreis / @cprov: for sponsoring @fczuardi and for supporting an open culture
- rclone: for being a powerful swiss army knife tool
- Grafana / K6: for open sourcing tools and for fostering a community around them 
- NixOs: for planting the reproducible builds seeds
- Universal Blue / @castrojo / Boxkit Alpine: for promoting usability, community-driven projects and showcasing nice tools
- Microsoft / Github: for providing a great platform for developers for free
