# object-storage-tests
Collection of simple scripts to consume object storage APIs and gather metrics.

## Toolbox

- [just](https://just.systems/)
- [rclone](https://rclone.org/)
- [openssl](https://www.openssl.org/docs/man1.0.2/man1/openssl.html)

## Usage

Configure remotes on your rclone.conf interactively with:

```
rclone config
```

And then run the desired test passing the name of your remote.
The results are stored on a `results` folder.

Type `just` to get a list of the available tests.
See the [justfile](./justfile) to check the default parameters and bucket names used.

## License

MIT License (c) 2023 Marmotidude and [AUTHORS](./AUTHORS)
