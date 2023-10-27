const tags = {
  features: {
    // buckets
    CREATE_BUCKET: "create bucket",
    LIST_BUCKETS: "list buckets",
    DELETE_BUCKET: "delete bucket",
    PURGE_BUCKET: "force delete bucket",
    BUCKET_INFO_CREATION_DATE: "bucket creation date",

    // objects
    PUT_OBJECT: "put object",
    GET_OBJECT: "get object",

    // temporary URLs
    CREATE_PRESIGN_PUT_URL: "create temporary upload URL",
    CREATE_PRESIGN_GET_URL: "create temporary download URL",
  },
  tools: {
    HTTP: "http",
    CLI_AWS: "aws cli",
    CLI_SWIFT: "swift cli",
    CLI_MGC: "mgc cli",
    LIB_PYTHON_BOTO3: "aws sdk python",
    LIB_JS_K6_AWS: "k6-jslib-aws",
  },
  commandSets: {
    CLI_AWS_S3: "aws s3",
    LIB_JS_K6_AWS_S3CLIENT: "k6-jslib-aws S3Client",
  },
  commands: {
    CLI_AWS_S3_MB: "aws s3 mb",
    CLI_AWS_S3_RB: "aws s3 rb",
    LIB_JS_K6_AWS_S3CLIENT_LIST_BUCKETS: "k6-jslib-aws S3Client.listBuckets",
  },
  fixes: {
    CREATION_DATE_2009_02_03: "OpenStack Swift Bug #1856938",
  },
}

export default tags
