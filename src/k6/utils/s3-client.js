import { AWSConfig, S3Client } from 'https://jslib.k6.io/aws/0.11.0/s3.js'
import { SharedArray } from 'k6/data';

export default function (s3Config={}){
  const {endpoint, region, access_key, secret_key} = s3Config
  const awsConfig = new AWSConfig({
    region,
    endpoint,
    accessKeyId: access_key,
    secretAccessKey: secret_key,
  })

  const s3 = new S3Client(awsConfig)

  return s3
}

