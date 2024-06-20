# WARNING This project is no longer maintained

see the new one at https://github.com/marmotitude/s3-tester

# object-storage-tests

A growing test suite for S3-like object storage implementations.

## About

This project uses the load tests framework [k6][k6] (extended
with some extensions) as the basis to execute test scenarios using popular
open source command line tools like [aws-cli][aws-cli], [rclone][rclone],
[swift-cli][swift-cli] as well as the open source k6 module
[k6-jslib-aws][k6-jslib-aws].

### Roadmap

This is an early-stage project and the main focus is to test proprietary
object storage providers, like AWS and Digital Ocean. But we would like
to include open source/self-hosted object storage providers as well,
some extra tests for [OpenStack Swift][openstack-swift] providers are available and
other free solutions like [MinIO][minio] using the [mc][mc] tool are in the roadmap.

An informal kanban board can be viewed
[here](https://github.com/orgs/marmotitude/projects/2), card descriptions
might be mixed in Portuguese and English.

## Requirements

This tool was only tested on **Linux** machines with
[just][just] and [podman][podman] (or docker) installed.

## Usage

### Download latest version

```
git clone https://github.com/marmotitude/object-storage-tests.git
cd object-storage-tests
```

### Setup remotes (config.yaml)

To run the test against a S3-compatible provider (we call them "remotes"),
first copy the [example.config.yaml](./example.config.yaml) to `config.yaml`
and edit it to include your credentials.

```
cp example.config.yaml config.yaml
vim config.yaml #edit with your remotes
```

### Configuring Output Formats for Test Results

The output format of the test results can be controlled via the `prometheus_rw_url` variable in the `config.yaml` file. This allows for flexibility in how you wish to view and use your test data.

- **JSON Output (Default)**: System will always output JSON.

- **Prometheus Metrics Output**: If you set a value for `prometheus_rw_url` in the `config.yaml`, the test results will be also outputed as Prometheus metrics. This is useful for integrating with monitoring systems that are compatible with Prometheus.

Example configuration in `config.yaml`:

```yaml
prometheus_rw_url: "http://your-prometheus-server:port/api/v1/write"  # Outputs Prometheus metrics and JSON
# prometheus_rw_url: ""                                               # Outputs JSON (default)
```

### Run tests using a pre-made docker image

**object-storage-tests** is available as three
[docker images](https://github.com/marmotitude/object-storage-tests/pkgs/container/object-storage-tests/versions?filters%5Bversion_type%5D=tagged):
  - tag `main` is the [main tests runner][Dockerfile] with its commands and
requirements.
  - tag `devshell` is a [shell for developers][devshell.Dockerfile] to use it
interactively and make contributions.
  - tag `webapp` is the same as main with a [webserver exposed on port 5000][webapp.Dockerfile] that
serves html reports from the `results` folder, this image have a `run_tests.sh` script that updates
the folder with a new report.

If you are on a machine with podman installed, you can use `just run <command>` to execute a
command from within the main test runner image (tag latest). For example:

#### list available commands

```

just run

```

#### list available remotes
```

just run list-remotes

```

#### list available test scenarios
```

just run list-tests

```

#### run a single test scenario agains a single remote

```

just run test aws-east-1 boto3-presigned

```

The output of the tests are stored in a folder named `results`.

#### run the default s3 scenarions on a single remote
```

just run test aws-east-1

```

### (Optional) mgc cli
If you have remotes that have a "mgc" config, copy the cli binary
to the project path, renaming the executable to `mgc`.

### Run commands from inside the devshell

if you are inside the devshell, or not using the OCI images, you
don't need the word `run` (see the "Contributing" section below), you can use `just <command>`
directly.


## License

MIT License (c) 2023 Marmotidude and [AUTHORS](./AUTHORS)

## Contributing

The easiest way to have a working developing environment is to use the
provided dev-shell, using [distrobox][distrobox]:

First assemble the distrobox with:
```

just assemble-dev

```

Then enter it with
```

just dev

```

To run the tests from inside the devshell use:
```

just test <remote name>

```

The devshell is a container with all the project tools installed, plus some
extra developer tools like a code editor and a nice shell, to know more about
this dev image see [devshell.Dockerfile][devshell.Dockerfile].

But you dont have to use it, feel free to install the tools used by this project:
- [gotpl][gotpl]
- [dasel][dasel]
- [k6][k6] + [xk6-exec][xk6-exec] + [xk6-file][xk6-file] + [xk6-yaml][xk6-yaml]
- [aws-cli][aws-cli]
- [rclone][rclone]
- Optional
  - [swift-cli][swift-cli]
  - mgc (unreleased)

Check [Dockerfile][Dockerfile] for an up-to-date complete list.

## Acknowledgments

- Luizalabs / @kikoreis / @cprov: for sponsoring @fczuardi and for supporting an open culture
- rclone: for being a powerful swiss army knife tool
- Grafana / K6: for open sourcing tools and for fostering a community around them
- NixOs: for planting the reproducible builds seeds
- Universal Blue / @castrojo / Boxkit Alpine: for promoting usability, community-driven projects and showcasing nice tools
- Microsoft / Github: for providing a great platform for developers for free

[just]:https://just.systems
[podman]:https://podman.io
[gotpl]:https://github.com/belitre/gotpl
[dasel]:https://github.com/TomWright/dasel
[k6]:https://github.com/grafana/k6
[xk6-exec]:https://github.com/grafana/xk6-exec
[xk6-file]:https://github.com/avitalique/xk6-file
[xk6-yaml]:https://github.com/szkiba/xk6-yaml
[k6-jslib-aws]:https://github.com/grafana/k6-jslib-aws
[aws-cli]:https://aws.amazon.com/cli/
[rclone]:https://rclone.org/
[distrobox]:https://distrobox.it

[openstack-swift]:https://www.openstack.org/software/releases/antelope/components/swift
[swift-cli]:https://docs.openstack.org/ocata/cli-reference/swift.html
[minio]:https://min.io/
[mc]:https://min.io/docs/minio/linux/reference/minio-mc.html

[devshell.Dockerfile]:./devshell.Dockerfile
[Dockerfile]:./Dockerfile

