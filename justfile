# Globals used in recipes
#------------------------
date := `date +%Y%m%d-%H%M%S`
config_file := env_var_or_default("CONFIG_PATH", "./") + "config.yaml"
results_prefix := "results"
rclone_conf_path := env_var("HOME") + "/.config/rclone"
rclone_conf_exists := path_exists(rclone_conf_path)
aws_conf_path := env_var("HOME") + "/.aws"
aws_conf_exists := path_exists(aws_conf_path)
distroboxrc_cm := `dasel -f ~/.distroboxrc \
  -s container_manager -r toml  2>/dev/null || true`
fallback_cm := if distroboxrc_cm == "" { "podman" } else { distroboxrc_cm }
oci_manager := env_var_or_default("DBX_CONTAINER_MANAGER", fallback_cm)

# k6
# https://k6.io/docs/get-started/running-k6/#adding-more-vus
k6_vus := "1"
k6_iterations := "1"



# OCI
main_image := "ghcr.io/marmotitude/object-storage-tests:main"
webapp_image := "ghcr.io/marmotitude/object-storage-tests:webapp"
devshell_image := "docker.io/fczuardi/object-storage-tests:devshell"
distrobox_name := "devshell-obj"


# Public Recipes
#---------------

# List available recipes
_default:
  @just --list --unsorted

# Check dependencies
check-tools:
  k6 version
  python -c "import boto3"
  aws --version
  rclone --version | head -n1
  swift --version
  mgc --version | true
  openssl version
  gotpl version | head -n1
  dasel --version
  tee --version | head -n1

# List configured remotes
list-remotes: _setup
  rclone listremotes
  aws configure list-profiles

# List test scenarios
list-tests:
  ls src/k6/ \
    --ignore utils \
    | sed "s/\.js//g"

# clean test buckets
clean-buckets profile: _setup
  ./src/k6/utils/clean-buckets.py {{profile}}

# Test a S3-compatible provider with k6
test remote test_name folder=date: _setup
  @just _test-k6 {{remote}} {{test_name}} {{folder}}

# Run on multiple(comma separated) remotes, multiple tests
group-test group_name remote_names test_names: _setup
  #!/usr/bin/env sh
  results_subdir={{group_name}}/{{date}}
  results_dir={{results_prefix}}/$results_subdir
  echo $results_dir
  mkdir -p $results_dir
  remotes=$(echo {{remote_names}} | tr ',' ' ')
  tests=$(echo {{test_names}} | tr ',' ' ')
  for remote in $remotes; do
    for test_name in $tests; do
      echo "STARTING $test_name on $remote"
      just test $remote $test_name {{date}} || true
    done
  done
  echo $remotes > $results_dir/remotes.txt
  echo $tests > $results_dir/tests.txt
  just write-reports {{group_name}} {{date}}

# Create html reports based on results from the past minutes
write-reports group_name folder:
  #!/usr/bin/env sh
  # Group all json files of remotes dirs, from the past 10 minutes, into a single one
  cd {{results_prefix}}
  results_subdir={{group_name}}/{{folder}}
  remotes=$(cat $results_subdir/remotes.txt)
  echo $remotes
  echo concatenating the following results:
  find $remotes -name "*.json" | grep {{folder}} | sort -r
  find $remotes -name "*.json" | grep {{folder}} | sort -r | xargs cat > $results_subdir/results.json
  cd ..
  results_json_file={{results_prefix}}/$results_subdir/results.json
  results_yaml_file={{results_prefix}}/$results_subdir/results.yaml
  results_html_file={{results_prefix}}/$results_subdir/report.html
  set -x
  ./src/tag-report.py $results_json_file "$remotes" > $results_yaml_file
  gotpl src/templates/report_new.html -f $results_yaml_file -o {{results_prefix}}/$results_subdir
  echo results saved to $results_json_file, $results_yaml_file and $results_html_file
  for remote in $remotes; do
    gotpl src/templates/feature_vs_client.html -f $results_yaml_file -s current_remote=$remote -s date_path="{{folder}}" -o {{results_prefix}}/$results_subdir
    mv {{results_prefix}}/$results_subdir/feature_vs_client.html {{results_prefix}}/$results_subdir/$remote.html
  done


# Run main docker image
run *args:
  mkdir -p results
  touch mgc
  {{oci_manager}} run \
    --volume ${PWD}/results:/app/results \
    --volume ${PWD}/config.yaml:/app/config.yaml:z \
    --volume ${PWD}/mgc:/usr/bin/mgc \
    --env "CONFIG_PATH=/app/" \
    {{main_image}} {{args}}

# Create create a distrobox for the dev-shell
assemble-dev:
  SHELL=/usr/bin/fish distrobox assemble create --replace

# Enter dev-shell
dev:
  distrobox enter -a "--env EDITOR=/usr/bin/vim" {{distrobox_name}}

# Build main docker image. Builder can be docker or podman.
build builder=oci_manager:
  {{builder}} build --rm -t {{main_image}} -f ./Dockerfile .

# Build dev-shell image and assemble distrobox. Builder can be docker or podman.
build-dev builder=oci_manager:
  {{builder}} build --rm -t {{devshell_image}} -f ./devshell.Dockerfile .

# Build webapp image.
build-webapp builder=oci_manager:
  # write ./nginx.conf to be copied by Dockerfile
  gotpl -f config.yaml src/templates/nginx.conf --output .
  {{builder}} build --no-cache --rm -t {{webapp_image}} -f ./webapp.Dockerfile .
  rm ./nginx.conf

# Launch webapp container
run-webapp:
  docker run -e CONFIG_YAML_CONTENT="$(cat ./small-config.yaml)" -p 5000:5000 {{webapp_image}}

# Private recipes
#----------------

# Check devshell tools
_check-dev-tools:
  ssh -V
  git --version
  vim --version | head -n1
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
  @mkdir -p {{aws_conf_path}}
  gotpl src/templates/aws/config -f {{config_file}} -o {{aws_conf_path}}
  gotpl src/templates/aws/credentials -f {{config_file}} -o {{aws_conf_path}}

_setup-mgc:
  @echo "writing ~/.config/mgc…"
  @mkdir -p ~/.config/mgc
  gotpl src/templates/mgc/auth.yaml -f {{config_file}} -o ~/.config/mgc

# setup cli tools
_setup: _setup-rclone _setup-aws _setup-mgc

# run k6 test with env vars and outputs to JSON and Prometheus if url is set
_k6-run remote testname results_dir *args:
  #!/usr/bin/env sh
  tester_hostname=$(hostname)
  prometheus_rw_url=$(dasel -f "{{config_file}}" 'prometheus_rw_url')
  prometheus_output_arg=""
  if [ -n "$prometheus_rw_url" ]; then
    echo "prometheus_rw_url is set and not empty"
    prometheus_output_arg="--out=experimental-prometheus-rw"
  fi
  K6_PROMETHEUS_RW_SERVER_URL="$prometheus_rw_url" \
  k6 run src/k6/{{testname}}.js \
    --address localhost:0 \
    --tag "remote={{remote}}" \
    $(if [ -n "$TEST_SUITE" ]; then echo "--tag \"test_suite_name=$TEST_SUITE\""; fi) \
    --tag "tester_hostname=$tester_hostname" \
    --quiet \
    --vus={{k6_vus}} --iterations={{k6_iterations}} \
    --env AWS_CLI_PROFILE={{remote}} \
    $prometheus_output_arg \
    --out json="{{results_dir}}/k6-{{testname}}.json" \
    --console-output="{{results_dir}}/k6-{{testname}}.console.log" \
    {{args}} 2>&1 | tee "{{results_dir}}/k6-{{testname}}.log"

_test-k6 remote test_name timestamp:
  #!/usr/bin/env sh
  results_dir={{results_prefix}}/{{remote}}/{{timestamp}}
  # create local folder for storing results
  mkdir -p $results_dir
  just _k6-run {{remote}} {{test_name}} $results_dir


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
rclone_conf := "~/.config/rclone/rclone.conf"
# https://rclone.org/commands/rclone_test_makefiles/
rclone_files_count := "50"


# To be Deprecated Recipes
#-------------------------

# prints a random string
_print-unique-name:
  openssl rand -hex 12

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
