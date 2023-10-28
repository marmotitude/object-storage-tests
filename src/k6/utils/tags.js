const tags = {
  features: {
    // buckets
    CREATE_BUCKET: "create bucket",
    LIST_BUCKETS: "list buckets",
    DELETE_BUCKET: "delete bucket",
    LIST_BUCKET_OBJECTS: "list bucket objects",
    PURGE_BUCKET: "force delete bucket",
    BUCKET_INFO_CREATION_DATE: "bucket creation date",

    // objects
    PUT_OBJECT: "put object",
    GET_OBJECT: "get object",
    PUT_OBJECT_PRESIGNED: "put object (presigned)",
    GET_OBJECT_PRESIGNED: "get object (presigned)",
    CREATE_MULTIPART: "create multipart",
    ABORT_MULTIPART: "abort multipart",

    // temporary URLs
    CREATE_PRESIGN_PUT_URL: "create v4 presign upload URL",
    CREATE_PRESIGN_GET_URL: "create v4 presign download URL",
    CREATE_PRESIGN_PUT_URL_V2: "create v2 presign upload URL",
    CREATE_PRESIGN_GET_URL_V2: "create v2 presign download URL",
  },
  tools: {
    CLI_AWS: "aws cli",
    CLI_SWIFT: "swift cli",
    CLI_MGC: "mgc cli",
    HTTP: "http",
    LIB_PYTHON_BOTO3: "boto3",
    LIB_JS_K6_AWS: "k6-jslib-aws",
  },
  commands: {
    CLI_AWS_S3_MB: "aws s3 mb",
    CLI_AWS_S3_RB: "aws s3 rb",
    CLI_AWS_S3_LS: "aws s3 ls",
    HTTP_PUT_OBJECT: "http put object",
    LIB_PYTHON_BOTO3_CLIENT_GENERATE_PRESIGNED_URL: "boto3 client.generate_presigned_url",
    LIB_JS_K6_AWS_S3CLIENT_LIST_BUCKETS: "k6-jslib-aws S3Client.listBuckets",
    LIB_JS_K6_AWS_S3CLIENT_PUT_OBJECT: "k6-jslib-aws S3Client.putObject",
    LIB_JS_K6_AWS_S3CLIENT_GET_OBJECT: "k6-jslib-aws S3Client.getObject",
    LIB_JS_K6_AWS_S3CLIENT_CREATE_MULTIPART: "k6-jslib-aws S3Client.createMultipartUpload",
    LIB_JS_K6_AWS_S3CLIENT_ABORT_MULTIPART: "k6-jslib-aws S3Client.abortMultipartUpload",
  },
  fixes: {
    CREATION_DATE_2009_02_03: "OpenStack Swift Bug #1856938",
  },
}

export default tags
