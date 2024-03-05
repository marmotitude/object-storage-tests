#!/bin/sh
set +x

# cron job starts on /root and is run by user root
cd /app

touch results/debug_last_test_start

# space separated list of remote names
remotes=$(dasel -f ./config.yaml -r yaml -s  '.remotes.all().key()' | grep -v '\-second$' | tr '\n' ',')
small_set_remotes=$(dasel -f ./config.yaml -r yaml -s  '.small_set_remotes')

# Check if TEST_SUITE is set and execute commands accordingly
if [ "$TEST_SUITE" = "big" ]; then
    # Run tests for big suite
    #tests="index-s3"
    tests="boto3-presigned,aws-cli-presigned,aws-cli-create-bucket,rclone-s3,aws-cli-s3-acl,k6-jslib-objects,k6-jslib-buckets,delete-objects,aws-cli-multipart"
    # TODO: return the mgc-s3, test
    just group-test _big "$remotes" "$tests" > results/debug_last_big_test.txt 2>&1
elif [ "$TEST_SUITE" = "small" ]; then
    # Run tests for small suite
    tests="delete-objects,k6-jslib-buckets"
    just group-test _small "$remotes" "$tests" > results/debug_last_small_test.txt 2>&1
else
    echo "Unknown TEST_SUITE value: $TEST_SUITE" > results/debug_last_test.txt 2>&1
    exit 1
fi


# asure that results folder is readable
chmod -R 755 results

printf ":-)\n\nLast test ended on $(date)" > results/smile.txt

# Sync remote_results_bucket with local_results_folder as source (send results)
remote_results_bucket=$(dasel -f ./config.yaml -r yaml -s  '.results_bucket')
local_results_folder="./results"
rclone sync "$local_results_folder" "$remote_results_bucket"
