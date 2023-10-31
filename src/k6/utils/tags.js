const tags = {
  features: {
    // buckets
    CREATE_BUCKET: "create bucket",
    LIST_BUCKETS: "list buckets",
    DELETE_BUCKET: "delete bucket",
    DELETE_OBJECT: "delete bucket",
    LIST_BUCKET_OBJECTS: "list bucket objects",
    PURGE_BUCKET: "force delete bucket",
    BUCKET_INFO_CREATION_DATE: "bucket creation date",

    // objects
    PUT_OBJECT: "put object",
    GET_OBJECT: "get object",
    PUT_OBJECT_PRESIGNED: "put object (presigned)",
    GET_OBJECT_PRESIGNED: "get object (presigned)",
    PUT_OBJECT_MULTIPART: "put object (multipart)",

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
    CLI_AWS_S3_CP: "aws s3 cp",
    CLI_AWS_S3_PRESIGN: "aws s3 presign",
    CLI_AWS_S3API_PUT_OBJECT: "aws s3api put-object",
    CLI_AWS_S3API_CREATE_MULTIPART: "aws s3api create-multipart-upload",
    CLI_AWS_S3API_LIST_MULTIPART: "aws s3api list-multipart-uploads",
    CLI_AWS_S3API_ABORT_MULTIPART: "aws s3api abort-multipart-upload",
    CLI_AWS_S3API_UPLOAD_PART: "aws s3api upload-part",
    CLI_AWS_S3API_UPLOAD_PART_COPY: "aws s3api upload-part-copy",
    CLI_AWS_S3API_LIST_PARTS: "aws s3api list-parts",
    CLI_AWS_S3API_COMPLETE_MULTIPART: "aws s3api complete-multipart-upload",
    CLI_MGC_BUCKETS_CREATE: "mgc object-storage buckets create",
    CLI_MGC_BUCKETS_LIST: "mgc object-storage buckets list",
    CLI_MGC_OBJECTS_UPLOAD: "mgc object-storage objects upload",
    CLI_MGC_OBJECTS_LIST: "mgc object-storage objects list",
    CLI_MGC_OBJECTS_DOWNLOAD: "mgc object-storage objects download",
    CLI_MGC_OBJECTS_DELETE: "mgc object-storage objects delete",
    CLI_MGC_BUCKETS_DELETE: "mgc object-storage buckets delete",
    HTTP_PUT: "http put",
    HTTP_GET: "http get",
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
