set dotenv-load

timestamp := `date +%Y%m%d-%H%M%S`
time_format := "%E"
test_dir := "test-" + timestamp
results_prefix := "results"
# https://rclone.org/commands/rclone_test_makefiles/
rclone_files_count := "50"
rclone_files_per_directory := "5"

_default:
  @just --list

# prints a random string
_print-unique-name:
  openssl rand -hex 12

# Test a S3-compatible provider with rclone
test-rclone remote:
  @just _test-rclone {{remote}} `just _print-unique-name` {{results_prefix}}/{{remote}}/{{timestamp}}

_test-rclone remote unique_sufix results_dir:
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
    -v --progress --log-file {{results_dir}}/makefiles_ascii_sync.log
  # (optional) test rclone cat
  rclone copy {{results_dir}}/time_upload {{remote}}:{{test_dir}}{{unique_sufix}}/time_upload
  -rclone cat {{remote}}:{{test_dir}}{{unique_sufix}}/time_upload
  # delete remote test dirs, save logs to local results dir
  \time -f "{{time_format}}" -o "{{results_dir}}/time_purge" \
    rclone purge \
    {{remote}}:{{test_dir}}{{unique_sufix}} \
    -v --progress --log-file {{results_dir}}/purge_bucket.log
  # cleanup test folders
  rm -rf {{test_dir}}*

