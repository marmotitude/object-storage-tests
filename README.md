# object-storage-tests
Collection of simple scripts to consume object storage APIs and gather metrics.

## Toolbox

- [k6](https://github.com/grafana/k6)
- [rclone](https://rclone.org/)
- [just](https://just.systems/)
- [dasel](https://github.com/TomWright/dasel)
- [tee](https://en.wikipedia.org/wiki/Tee_(command))
- [openssl](https://www.openssl.org/docs/man1.0.2/man1/openssl.html)

## Usage

Create an rclone.conf using the command:

```
rclone config
```

NOTE: Open your rclone.conf file and make sure your AWS block contains something similar to
 `endpoint = https://s3.us-east-1.amazonaws.com`

Run the desired tests using `just`, the reciepe name and pass a remote name as argument.

Type `just` to get a list of the available tests.

See the [justfile](./justfile) for more info on the actual command executed.

## License

MIT License (c) 2023 Marmotidude and [AUTHORS](./AUTHORS)
