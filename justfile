# Globals used in recipes
#------------------------
date := `date +%Y%m%d-%H%M%S`
config_file := env_var_or_default("CONFIG_PATH", "./") + "config.yaml"
rclone_conf_exists := path_exists(env_var("HOME") + "/.config/rclone")
aws_conf_exists := path_exists(env_var("HOME") + "/.aws")

# k6
# https://k6.io/docs/get-started/running-k6/#adding-more-vus
k6_vus := "1"
k6_iterations := "1"


# Public Recipes
#---------------

# List available recipes
_default:
  @just --list --unsorted

# Check dependencies
check-tools:
  k6 version
  aws --version
  rclone --version | head -n1
  swift --version
  openssl version
  gotpl version | head -n1
  dasel --version
  tee --version | head -n1

# List configured remotes
list-remotes: _setup
  rclone listremotes
  aws configure list-profiles

# Test a S3-compatible provider with k6
test remote testname="index-s3": _setup-rclone _setup-aws
  @just _test-k6 {{remote}} {{date}} `just _print-unique-name` {{testname}}

# Build main docker image. Builder can be docker or podman.
build builder="docker":
  {{builder}} build -t docker.io/fczuardi/object-storage-tests:latest -f ./Dockerfile .

# Run main docker image
run *args:
  mkdir -p results
  podman run \
    --volume ./results:/app/results:Z \
    --volume .:/app/config:Z \
    --env "CONFIG_PATH=/app/config/" \
    object-storage-tests {{args}}

# Build dev-shell image and assemble distrobox. Builder can be docker or podman.
build-dev builder="docker":
  {{builder}} build -t docker.io/fczuardi/object-storage-tests:devshell -f ./devshell.Dockerfile .
  SHELL=/usr/bin/fish distrobox assemble create

# Enter dev-shell
dev:
  distrobox enter -a "--env EDITOR=/usr/bin/vim" devshell-obj


# Private recipes
#----------------

# Check devshell tools
_check-dev-tools:
  ssh -V
  git --version
  vim --version | head -n1
  groff --version | head -n1
  bat --version
  rg --version | head -n1

# write local rclone.conf
_setup-rclone:
  {{ if rclone_conf_exists == "false" { "just __setup-rclone" } else { "" } }}
__setup-rclone:
  @echo "writing ~/.config/rclone/rclone.conf…"
  @mkdir -p ~/.config/rclone
  gotpl src/templates/rclone.conf -f {{config_file}} -o ~/.config/rclone

# write local ~/.aws
_setup-aws:
  {{ if aws_conf_exists == "false" { "just __setup-aws" } else { "" } }}
__setup-aws:
  @echo "writing ~/.aws…"
  @mkdir -p ~/.aws
  gotpl src/templates/aws/config -f {{config_file}} -o ~/.aws
  gotpl src/templates/aws/credentials -f {{config_file}} -o ~/.aws

# setup cli tools
_setup: _setup-rclone _setup-aws

# prints a random string
_print-unique-name:
  openssl rand -hex 12

# run k6 test with env vars
_k6-run remote testname results_dir *args:
  k6 run src/k6/{{testname}}.js \
    --quiet \
    --vus={{k6_vus}} --iterations={{k6_iterations}} \
    --env AWS_CLI_PROFILE={{remote}} \
    --env S3_ACCESS_KEY_ID=$(dasel -f {{config_file}} -s remotes.{{remote}}.s3.access_key) \
    --env S3_SECRET_ACCESS_KEY=$(dasel -f {{config_file}} -s .remotes.{{remote}}.s3.secret_key) \
    --env S3_ENDPOINT=$(dasel -f {{config_file}} -s remotes.{{remote}}.s3.endpoint) \
    --env S3_REGION=$(dasel -f {{config_file}} -s remotes.{{remote}}.s3.region) \
    --env SWIFT_AUTH_URL=$(dasel -f config.yaml -s remotes.{{ remote }}.swift.auth) \
    --env SWIFT_USER=$(dasel -f config.yaml -s remotes.{{ remote }}.swift.user) \
    --env SWIFT_KEY=$(dasel -f config.yaml -s remotes.{{ remote }}.swift.key) \
    --out json="{{results_dir}}/k6-{{testname}}.json" \
    --console-output="{{results_dir}}/k6-{{testname}}.console.log" \
    {{args}} 2>&1 | tee "{{results_dir}}/k6-{{testname}}.log"

# TODO remove this bucket_name argument when k6-jslib-aws is able to create buckets 
#       see: https://github.com/grafana/k6-jslib-aws/issues/69
k6_test_bucket := "test-jslib-aws-"
__test-k6 remote unique_sufix results_dir testname:
  # create local folder for storing results
  mkdir -p {{results_dir}}
  # TODO: remove this mkdir once k6 is able to create buckets
  rclone mkdir {{remote}}-s3:{{k6_test_bucket}}{{unique_sufix}}
  # TODO: remove this env S3_TEST_BUCKET_NAME once k6 is able to create buckets
  just _k6-run {{remote}} {{testname}} {{results_dir}} --env S3_TEST_BUCKET_NAME={{k6_test_bucket}}{{unique_sufix}}
  # TODO: remove this purge once k6 is able to delete buckets
  rclone purge {{remote}}-s3:{{k6_test_bucket}}{{unique_sufix}}

_test-k6 remote timestamp unique_sufix testname:
  @just __test-k6 {{remote}} {{unique_sufix}} {{results_prefix}}/{{remote}}/{{timestamp}} {{testname}}


#------------------
# TO BE DEPRECATED
#------------------

# Globals used in legacy recipes
#-----------------------------------
time_format := "%E"

# aws-cli
s3api_test_bucket := "test-aws-cli-s3api-"

# rclone
test_dir := "test-rclone-"
results_prefix := "results"
rclone_conf := "~/.config/rclone/rclone.conf"
# https://rclone.org/commands/rclone_test_makefiles/
rclone_files_count := "50"


# To be Deprecated Recipes
#-------------------------

# (legacy) Run all tests
legacy-test remote: _setup
 @just _test {{remote}} {{date}} `just _print-unique-name`

# (legacy) Test a S3-compatible provider with aws-cli
legacy-test-aws-s3api remote: _setup-aws
  @just _test-aws-s3api {{remote}} {{date}} `just _print-unique-name`

# (legacy) Test a S3-compatible provider with rclone
legacy-test-rclone remote: _setup-rclone
  @just _test-rclone {{remote}} {{date}} `just _print-unique-name`
rclone_files_per_directory := "5"


# To be deprecated private recipes
#---------------------------------

_aws-s3api endpoint profile command results_dir *args:
  aws s3api {{command}} \
    --endpoint {{endpoint}} \
    --profile {{profile}} \
    {{args}} 2>&1 | tee -a {{results_dir}}/s3api_{{command}}.log

__test-aws-s3api remote unique_sufix endpoint results_dir:
  mkdir -p {{results_dir}}
  # create test bucket
  @just _aws-s3api {{endpoint}} {{remote}} create-bucket {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
    --debug
  # list buckets
  @just _aws-s3api {{endpoint}} {{remote}} list-buckets {{results_dir}} \
    --debug
  # put 2 objects
  @just _aws-s3api {{endpoint}} {{remote}} put-object {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
    --key object_1 \
    --body LICENSE \
    --debug
  @just _aws-s3api {{endpoint}} {{remote}} put-object {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
    --key object_2 \
    --body README.md \
    --debug
  # list objects
  @just _aws-s3api {{endpoint}} {{remote}} list-objects {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
  # delete objects
  @just _aws-s3api {{endpoint}} {{remote}} delete-objects {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
    '--delete "{ \"Objects\": [ {\"Key\": \"object_1\"}, {\"Key\": \"object_2\"} ]}"' \
    --debug
  # list objects
  @just _aws-s3api {{endpoint}} {{remote}} list-objects {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
  # delete test bucket
  @just _aws-s3api {{endpoint}} {{remote}} delete-bucket {{results_dir}} \
    --bucket {{s3api_test_bucket}}{{unique_sufix}} \
    --debug

_test-aws-s3api remote timestamp unique_sufix:
  @just __test-aws-s3api {{remote}} {{unique_sufix}} `dasel -f {{config_file}} -s remotes.{{remote}}.s3.endpoint` {{results_prefix}}/{{remote}}/{{timestamp}}


_test remote timestamp unique_sufix:
  @just _test-rclone {{remote}} {{timestamp}} {{unique_sufix}}
  @just _test-aws-s3api {{remote}} {{timestamp}} {{unique_sufix}}

__test-rclone remote unique_sufix results_dir:
  # create local directory for results and logs
  mkdir -p {{results_dir}}
  # create a remote bucket to upload test files
  rclone mkdir {{remote}}-s3:{{test_dir}}{{unique_sufix}}
  # create local directories with test files
  rclone test makefiles \
    {{test_dir}}/test_ascii --ascii \
    --files {{rclone_files_count}} \
    --files-per-directory {{rclone_files_per_directory}} \
    --log-file {{results_dir}}/makefiles_ascii_local.log
  # sync local and remote test dirs, save logs to local results dir
  \time -f "{{time_format}}" -o "{{results_dir}}/time_upload" \
    rclone sync \
    {{test_dir}} {{remote}}-s3:{{test_dir}}{{unique_sufix}} \
    -v --log-file {{results_dir}}/makefiles_ascii_sync.log
  # (optional) test rclone cat
  rclone copy {{results_dir}}/time_upload {{remote}}-s3:{{test_dir}}{{unique_sufix}}/time_upload
  -rclone cat {{remote}}-s3:{{test_dir}}{{unique_sufix}}/time_upload
  # delete remote test dirs, save logs to local results dir
  \time -f "{{time_format}}" -o "{{results_dir}}/time_purge" \
    rclone purge \
    {{remote}}-s3:{{test_dir}}{{unique_sufix}} \
    -v --log-file {{results_dir}}/purge_bucket.log
  # cleanup test folders
  rm -rf {{test_dir}}*

_test-rclone remote timestamp unique_sufix:
  @just __test-rclone {{remote}} {{unique_sufix}} {{results_prefix}}/{{remote}}/{{timestamp}}
