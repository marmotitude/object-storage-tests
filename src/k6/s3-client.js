import { AWSConfig, S3Client } from 'https://jslib.k6.io/aws/0.11.0/s3.js'

export default function (){
  const awsConfig = new AWSConfig({
    region: __ENV.S3_REGION,
    endpoint: __ENV.S3_ENDPOINT,
    accessKeyId: __ENV.S3_ACCESS_KEY_ID,
    secretAccessKey: __ENV.S3_SECRET_ACCESS_KEY,
  })

  const s3 = new S3Client(awsConfig)

  return s3
}

