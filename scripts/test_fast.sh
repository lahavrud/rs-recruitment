#!/usr/bin/env bash
# Fast local test loop: parallel workers, no coverage instrumentation.
# CI keeps coverage on; this is only for developer iteration.
#
# Pass any extra pytest args after the script name:
#   scripts/test_fast.sh tests/api/test_admin_jobs.py -v
#   scripts/test_fast.sh -k "salary"

set -euo pipefail
exec uv run pytest -n auto "$@"
