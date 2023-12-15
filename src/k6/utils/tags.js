const tags = {
  features: {
    // buckets
    CREATE_BUCKET: "create bucket",
    LIST_BUCKETS: "list buckets",
    DELETE_BUCKET: "delete bucket",
    BUCKET_INFO_CREATION_DATE: "bucket creation date",
    CREATE_BUCKET_DUPLICATE: "create bucket duplicate",

    // objects
    GET_OBJECT_PRESIGNED_V2: "get object (presigned v2)",

    // multipart objects
    CREATE_MULTIPART_UPLOAD: "start multipart upload",

    // new list

    // Transfer Bucket Between Regions
    // Set Bucket Permission to a Public Bucket
    // Set Bucket Permission to a Private Bucket
    PURGE_BUCKET: "Force Delete Bucket",
    GET_OBJECT: "Download Object from a Bucket",
    PUT_OBJECT: "Upload Object to a Bucket",
    LIST_BUCKET_OBJECTS: "List All Objects in a Bucket",
    //     Upload Object Date
    //     Object Size
    //     Last Modification
    //     Object Metadata
    DELETE_OBJECT: "Delete Object from a Bucket",
    PUT_OBJECT_MULTIPART: "Put Object Multipart",
    ABORT_MULTIPART_UPLOAD: "Abort Object Multipart",
    // Pause Object Multipart
    // Delete Object Multipart
    // Resume Object Multipart
    LIST_MULTIPART_UPLOADS: "List Ongoing Object Multipart Upload",
    //    id part
    //    Object Name
    //    Upload Part Date
    //    Status
    //    Last Modification
    LIST_MULTIPART_UPLOAD_PARTS: "List Parts of Object Multipart Upload",
    //    Upload Object Date
    //    Object Size
    //    Last Modification
    //    Object Metadata
    UPLOAD_MULTIPART_PART: "Put Part of Object Multipart",
    // Create Object ACL
    // List Object ACL
    // 	  User
    // 	  Rules
    // 	  Bucket ACL Creation Date
    // 	  Last Modifcation
    // Delete Object ACL
    // Edit Object ACL
    // Duplicate Object
    // Copy Objects Between Buckets in the same region
    // Copy Objects Between Buckets in different region
    // Transfer Objects Between Buckets in the same region
    // Transfer Objects Between Buckets in different region
    GET_OBJECT_PRESIGNED: "Download a Private Object from a Generated Pre-Signed URL",
    PUT_OBJECT_PRESIGNED: "Upload a Private Object to a Generated Pre-Signed URL",
    // Generate Shared URL for Public Buckets
    // Rename Objects
    // Encrypt Objects
  },
  tools: {
    CLI_AWS: "aws cli",
    CLI_SWIFT: "swift cli",
    CLI_MGC: "mgc cli",
    CLI_RCLONE: "rclone cli",
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
    CLI_AWS_S3API_CREATE_BUCKET: "aws s3api create-bucket",
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
    CLI_RCLONE_LIST: "rclone lsd",
    CLI_RCLONE_COPY: "rclone copy",
    CLI_RCLONE_PURGE: "rclone purge",
    CLI_RCLONE_CAT: "rclone cat",
    HTTP_PUT: "http put",
    HTTP_GET: "http get",
    LIB_PYTHON_BOTO3_CLIENT_GENERATE_PRESIGNED_URL: "boto3 client.generate_presigned_url",
    LIB_JS_K6_AWS_S3CLIENT_LIST_BUCKETS: "k6-jslib-aws S3Client.listBuckets",
    LIB_JS_K6_AWS_S3CLIENT_PUT_OBJECT: "k6-jslib-aws S3Client.putObject",
    LIB_JS_K6_AWS_S3CLIENT_GET_OBJECT: "k6-jslib-aws S3Client.getObject",
    LIB_JS_K6_AWS_S3CLIENT_CREATE_MULTIPART: "k6-jslib-aws S3Client.createMultipartUpload",
    LIB_JS_K6_AWS_S3CLIENT_ABORT_MULTIPART: "k6-jslib-aws S3Client.abortMultipartUpload",
    LIB_JS_K6_AWS_S3CLIENT_CREATE_BUCKET: "k6-jslib-aws S3Client.createBucket",
  },
  fixes: {
    CREATION_DATE_2009_02_03: "OpenStack Swift Bug #1856938",
  },
}

export default tags
