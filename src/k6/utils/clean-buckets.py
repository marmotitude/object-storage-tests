#!/usr/bin/env python
import boto3
import sys
import yaml


def delete_bucket_contents(s3, bucket_name):
    objects = s3.list_objects_v2(Bucket=bucket_name)
    if 'Contents' in objects:
        for obj in objects['Contents']:
            s3.delete_object(Bucket=bucket_name, Key=obj['Key'])

def delete_buckets(profile):
    with open("config.yaml", "r") as stream:
        try:
            data = yaml.safe_load(stream)
            endpoint = data['remotes'][profile]['s3']['endpoint']
            region = data['remotes'][profile]['s3']['region']
        except yaml.YAMLError as exc:
            print(exc)
    session = boto3.Session(profile_name=profile)
    s3 = session.client('s3', endpoint_url=endpoint, region_name=region)
    response = s3.list_buckets()
    for bucket in response['Buckets']:
        if bucket['Name'].startswith('test'):
            print(f"Deleting bucket: {bucket['Name']}...")
            delete_bucket_contents(s3, bucket['Name'])
            s3.delete_bucket(Bucket=bucket['Name'])

def main():
    if len(sys.argv) != 2:
        print("Use: python clean-all-buckets.py <profile>")
        sys.exit(1)
    profile = sys.argv[1]
    delete_buckets(profile)

if __name__ == "__main__":
    main()