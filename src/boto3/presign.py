#!/usr/bin/env python3

import sys
import boto3
import yaml
import boto3.session
from botocore.config import Config

profile_name = sys.argv[1]
command_name = sys.argv[2]

with open('config.yaml', 'r') as file:
    config = yaml.safe_load(file)

endpoint_url = config['remotes'][profile_name]['s3']['endpoint']

my_session = boto3.session.Session(profile_name=profile_name)
my_config = Config(
    signature_version = 'v4',
)
client = my_session.client(
    service_name = 's3',
    endpoint_url = endpoint_url,
    config=my_config,
)

def generate_presigned_put_url():
    s3_client = client
    client_method = 'put_object'
    bucket_name = sys.argv[3]
    key_name = sys.argv[4]
    try:
        url = s3_client.generate_presigned_url(ClientMethod= client_method, HttpMethod="PUT", Params={'Bucket': bucket_name, 'Key': key_name})
    except:
        print(
            "Couldn't get a presigned URL for client method '%s'.", client_method
        )
        raise
    return url

if command_name == 'generate-put-url':
    print(generate_presigned_put_url())
