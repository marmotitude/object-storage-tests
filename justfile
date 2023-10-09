### Setup
set dotenv-load

date := `date +%Y%m%d-%H%M%S`
time_format := "%E"

# k6
test_bucket := "test-jslib-aws-"
# https://k6.io/docs/get-started/running-k6/#adding-more-vus
k6_vus := "2"
k6_iterations := "2"

# rclone
test_dir := "test-rclone-"
results_prefix := "results"
rclone_conf := "~/.config/rclone/rclone.conf"
# https://rclone.org/commands/rclone_test_makefiles/
rclone_files_count := "50"
rclone_files_per_directory := "5"


### Public Recipes

# List available recipes
_default:
  @just --list

# Run all tests
test remote:
 @just _test {{remote}} {{date}} `just _print-unique-name`

# Test a S3-compatible provider with k6
test-k6 remote:
  @just _test-k6 {{remote}} {{date}} `just _print-unique-name`

# Test a S3-compatible provider with rclone
test-rclone remote:
  @just _test-rclone {{remote}} {{date}} `just _print-unique-name`


### Private recipes

# prints a random string
_print-unique-name:
  openssl rand -hex 12

# Convert an rclone.conf to a local yml used on k6 tests
_setup-k6 remote:
  # convert an rclone.conf block to yml
  # https://unix.stackexchange.com/a/647369
  printf '%s\n' '?\[{{remote}}\]?+1' '. +1,/^$/ -1 p' | ed -s {{rclone_conf}} | sed 's/ =/:/g' \
    > .remote.{{remote}}.yml

_test remote timestamp unique_sufix:
  @just _test-k6 {{remote}} {{timestamp}} {{unique_sufix}}
  @just _test-rclone {{remote}} {{timestamp}} {{unique_sufix}}

# run k6 test with env vars
_k6-run remote testname bucket_name results_dir:
  @just _setup-k6 {{remote}}
  k6 run src/k6/{{testname}}.js \
    --vus={{k6_vus}} --iterations={{k6_iterations}} \
    --out json={{results_dir}}/k6-{{testname}}.json \
    --env S3_TEST_BUCKET_NAME={{bucket_name}} \
    --env S3_ACCESS_KEY_ID=`dasel -f .remote.{{remote}}.yml 'access_key_id'` \
    --env S3_SECRET_ACCESS_KEY=`dasel -f .remote.{{remote}}.yml 'secret_access_key'` \
    --env S3_ENDPOINT=`dasel -f .remote.{{remote}}.yml 'endpoint'` \
    --env S3_REGION=`dasel -f .remote.{{remote}}.yml 'region'` \
  | tee {{results_dir}}/k6-{{testname}}.log
  # remove temp yml
  # rm .remote.{{remote}}.yml

__test-k6 remote unique_sufix results_dir:
  # create local folder for storing results
  mkdir -p {{results_dir}}
  # TODO: remove this mkdir once k6 is able to create buckets
  #       see: https://github.com/grafana/k6-jslib-aws/issues/69
  rclone mkdir {{remote}}:{{test_bucket}}{{unique_sufix}}
  @just _k6-run {{remote}} buckets {{test_bucket}}{{unique_sufix}} {{results_dir}}
  # TODO: remove this purge once k6 is able to delete buckets
  rclone purge {{remote}}:{{test_bucket}}{{unique_sufix}}

_test-k6 remote timestamp unique_sufix:
  @just __test-k6 {{remote}} {{unique_sufix}} {{results_prefix}}/{{remote}}/{{timestamp}}

__test-rclone remote unique_sufix results_dir:
  # create local directory for results and logs
  mkdir -p {{results_dir}}
  # create a remote bucket to upload test files
  rclone mkdir {{test_dir}}{{unique_sufix}}
  # create local directories with test files
  rclone test makefiles \
    {{test_dir}}/test_ascii --ascii \
    --files {{rclone_files_count}} \
    --files-per-directory {{rclone_files_per_directory}} \
    --log-file {{results_dir}}/makefiles_ascii_local.log
  # sync local and remote test dirs, save logs to local results dir
  \time -f "{{time_format}}" -o "{{results_dir}}/time_upload" \
    rclone sync \
    {{test_dir}} {{remote}}:{{test_dir}}{{unique_sufix}} \
    -v --log-file {{results_dir}}/makefiles_ascii_sync.log
  # (optional) test rclone cat
  rclone copy {{results_dir}}/time_upload {{remote}}:{{test_dir}}{{unique_sufix}}/time_upload
  -rclone cat {{remote}}:{{test_dir}}{{unique_sufix}}/time_upload
  # delete remote test dirs, save logs to local results dir
  \time -f "{{time_format}}" -o "{{results_dir}}/time_purge" \
    rclone purge \
    {{remote}}:{{test_dir}}{{unique_sufix}} \
    -v --log-file {{results_dir}}/purge_bucket.log
  # cleanup test folders
  rm -rf {{test_dir}}*

_test-rclone remote timestamp unique_sufix:
  @just __test-rclone {{remote}} {{unique_sufix}} {{results_prefix}}/{{remote}}/{{timestamp}}

