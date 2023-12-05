#!/bin/sh
set +x

# Check if CONFIG_YAML_CONTENT is present
if [ -z "$CONFIG_YAML_CONTENT" ]; then
    echo "Error: CONFIG_YAML_CONTENT environment variable is not set."
    printf ":-(\n\nError: CONFIG_YAML_CONTENT environment variable is not set. $(date)" > /app/results/smile.txt
    exit 1
fi

# create config.yaml file from env var
echo "$CONFIG_YAML_CONTENT" > /app/config.yaml

# create ~/.aws config files
just _setup

# space separated list of remote names
remotes=$(dasel -f /app/config.yaml -r yaml -s  '.remotes.all().key()' | grep -v '\-second$' | tr '\n' ' ')

echo "Remotes: $remotes"
date

# Sync local_results_folder with remote_results_bucket as source
remote_results_bucket=$(dasel -f ./config.yaml -r yaml -s  '.results_bucket')
local_results_folder="./results"
rclone mkdir "$remote_results_bucket" # create remote bucket if it doesnt exist
rclone sync "$remote_results_bucket" "$local_results_folder" # fetch previous results

# Do a list-buckets on each remote
for remote in $remotes; do
    echo "Executing AWS CLI command for profile $remote"
    echo "$remote" >> /app/results/smile.txt
    aws s3api list-buckets --cli-connect-timeout 2 --cli-read-timeout 2 --profile "$remote" >> /app/results/smile.txt
done

# asure that results folder is readable
chmod -R 755 results

# Schedule for TEST_SUITE=big
echo "8 7,9,11,14,16,18,22,0 * * * TEST_SUITE=big /app/run_tests.sh" >> /etc/crontabs/root

# Schedule for TEST_SUITE=small
echo "*/5 * * * * TEST_SUITE=small /app/run_tests.sh" >> /etc/crontabs/root

# Start cron
crond -f &

# Start Nginx
exec nginx -g 'daemon off;'

