#!/bin/bash
# EC2 deploy script — pulls SHA-pinned images, runs migrations, starts services.
#
# This script is the single owner of /rs-recruitment/infra/CURRENT_SHA and
# /rs-recruitment/infra/PREV_SHA. CI never writes those parameters; it only
# uploads artifacts and triggers this script via SSM Run-Command. The EC2
# instance profile already has full SSM RW on /rs-recruitment/*, so all
# state mutation happens here with the same identity that runs the deploy.
#
# State model:
#   OLD_CURRENT = whatever was deployed before this run (read at top)
#   On health-pass:  PREV_SHA <- OLD_CURRENT;  CURRENT_SHA <- IMAGE_TAG
#   On health-fail:  redeploy OLD_CURRENT in place; SSM params untouched
#                    (CURRENT_SHA still points to OLD_CURRENT, which is now
#                    actually running again).
#
# Resolution order for IMAGE_TAG:
#   1. $IMAGE_TAG already exported (CI / rollback path)
#   2. SSM /rs-recruitment/infra/CURRENT_SHA (manual rerun picks up last good)
# If neither is available the script aborts.
set -euo pipefail

APP_DIR="/home/ec2-user/app"
REGION="us-east-1"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
S3_BUCKET="rs-recruitment-${ACCOUNT_ID}"

# Capture the SHA that is running RIGHT NOW (before any pull/migrate happens).
# This becomes the rollback target on health-fail and the new PREV_SHA on
# health-pass. Empty on the very first deploy of a fresh instance.
OLD_CURRENT=$(aws ssm get-parameter \
  --name /rs-recruitment/infra/CURRENT_SHA \
  --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "==> IMAGE_TAG not set; falling back to CURRENT_SHA"
  IMAGE_TAG="${OLD_CURRENT}"
fi
if [[ -z "${IMAGE_TAG}" ]]; then
  echo "ERROR: IMAGE_TAG is empty and CURRENT_SHA is unset. Cannot deploy."
  exit 1
fi
export IMAGE_TAG

echo "==> ECR registry: ${ECR_REGISTRY}"
echo "==> S3 bucket:    ${S3_BUCKET}"
echo "==> IMAGE_TAG:    ${IMAGE_TAG}"
echo "==> OLD_CURRENT:  ${OLD_CURRENT:-<none>}"

echo "==> Logging in to ECR"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "==> Fetching SHA-pinned compose file"
mkdir -p "${APP_DIR}/frontend/tls"
COMPOSE_FILE="${APP_DIR}/docker-compose.deploy.yml"
aws s3 cp "s3://${S3_BUCKET}/deploy/${IMAGE_TAG}/docker-compose.deploy.yml" "${COMPOSE_FILE}"

# Fetch the Redis password from SSM (/infra/ prefix — not read by SsmSettingsSource,
# which only loads /rs-recruitment/prod/* into Settings).
export REDIS_PASSWORD
REDIS_PASSWORD=$(aws ssm get-parameter \
  --name /rs-recruitment/infra/REDIS_PASSWORD --with-decryption \
  --query 'Parameter.Value' --output text)

# Write password to a secrets file mounted by docker-compose as a Docker secret
# (tmpfs at /run/secrets/redis_password inside the container). This keeps the
# value out of `docker inspect` environment. REDIS_PASSWORD stays exported for
# rollback compatibility — old SHA-pinned compose files use the env var directly.
SECRETS_DIR="${APP_DIR}/secrets"
mkdir -p "${SECRETS_DIR}"
chmod 700 "${SECRETS_DIR}"
printf '%s' "${REDIS_PASSWORD}" > "${SECRETS_DIR}/redis_password"
chmod 600 "${SECRETS_DIR}/redis_password"

echo "==> Materializing TLS cert from SSM"
aws ssm get-parameter --name /rs-recruitment/infra/TLS_CERT --with-decryption \
  --query 'Parameter.Value' --output text > "${APP_DIR}/frontend/tls/cert.pem"
aws ssm get-parameter --name /rs-recruitment/infra/TLS_KEY --with-decryption \
  --query 'Parameter.Value' --output text > "${APP_DIR}/frontend/tls/key.pem"
chmod 600 "${APP_DIR}/frontend/tls/key.pem"
chmod 644 "${APP_DIR}/frontend/tls/cert.pem"

echo "==> Pulling Docker images"
docker compose -f "${COMPOSE_FILE}" pull

# Run migrations BEFORE the new api container takes traffic.
# Previously this ran as `exec` AFTER `up -d`, meaning the new code briefly
# served requests against the old schema. `--no-deps` keeps redis out of the
# migration boot path; alembic only needs DATABASE_URL, which the app loads
# from SSM at startup. `--rm` discards the one-shot container after success.
# Migrations must be backward-compatible (add-only) — rollback below restarts
# the previous image against the already-advanced schema.
echo "==> Validating migration chain (must be exactly one head)"
HEAD_COUNT=$(docker compose -f "${COMPOSE_FILE}" run --rm --no-deps -T api \
  alembic heads 2>&1 | grep -c "(head)" || true)
if [ "${HEAD_COUNT}" -ne 1 ]; then
  echo "ERROR: alembic reports ${HEAD_COUNT} head(s) — expected exactly 1."
  echo "       Fix the migration chain before deploying."
  docker compose -f "${COMPOSE_FILE}" run --rm --no-deps -T api alembic heads
  exit 1
fi
echo "==> Migration chain OK (1 head)"

echo "==> Running database migrations (one-shot, against new image)"
# Invoke alembic directly from the project venv (on PATH via ENV PATH=
# /app/.venv/bin:... in the Dockerfile). `uv run` would otherwise try to
# initialize its cache at $HOME/.cache/uv = /app/.cache/uv as appuser,
# which fails because /app is root-owned.
docker compose -f "${COMPOSE_FILE}" run --rm --no-deps -T api alembic upgrade head
# Sentinel line for post-mortems: if this prints but the deploy then fails,
# the schema is ahead of CURRENT_SHA's code. Rollback works (migrations are
# add-only / backward-compat), but operators should know it happened.
echo "==> MIGRATIONS_APPLIED schema is now at head for IMAGE_TAG=${IMAGE_TAG}"

echo "==> Enabling Redis auth in REDIS_URL (atomic with compose up)"
# Update REDIS_URL in SSM to include the password so the new api container
# reads it correctly on startup. The currently-running app is unaffected —
# Settings reads SSM once at startup and never re-reads it.
REDIS_URL_AUTHED="redis://:${REDIS_PASSWORD}@redis:6379/0"
aws ssm put-parameter \
  --name /rs-recruitment/prod/REDIS_URL \
  --value "${REDIS_URL_AUTHED}" \
  --type SecureString --overwrite >/dev/null

echo "==> Starting services"
# --remove-orphans cleans up containers from the previous compose generation
# (e.g., the legacy 'nginx' service replaced by 'frontend').
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "==> Restarting frontend (refreshes upstream API IP)"
docker compose -f "${COMPOSE_FILE}" restart frontend

echo "==> Waiting for api container to become healthy (90s)"
deadline=$(( $(date +%s) + 90 ))
healthy=false
while [[ $(date +%s) -lt $deadline ]]; do
  CONTAINER_ID=$(docker compose -f "${COMPOSE_FILE}" ps -q api 2>/dev/null || echo "")
  if [[ -n "${CONTAINER_ID}" ]]; then
    HC_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "${CONTAINER_ID}" 2>/dev/null || echo "")
    case "${HC_STATUS}" in
      healthy)   healthy=true; break ;;
      unhealthy) break ;;
    esac
  fi
  sleep 5
done

if ! $healthy; then
  echo "==> Health check FAILED — rolling back to ${OLD_CURRENT:-<none>}"
  if [[ -z "${OLD_CURRENT}" ]]; then
    echo "ERROR: No OLD_CURRENT (first-ever deploy?) — cannot roll back"
    exit 1
  fi
  echo "==> Fetching previous compose (${OLD_CURRENT})"
  aws s3 cp "s3://${S3_BUCKET}/deploy/${OLD_CURRENT}/docker-compose.deploy.yml" "${COMPOSE_FILE}"
  echo "==> Reverting REDIS_URL to unauthenticated (matches previous compose)"
  aws ssm put-parameter \
    --name /rs-recruitment/prod/REDIS_URL \
    --value "redis://redis:6379/0" \
    --type String --overwrite >/dev/null
  echo "==> Restarting with previous images"
  IMAGE_TAG="${OLD_CURRENT}" docker compose -f "${COMPOSE_FILE}" pull
  IMAGE_TAG="${OLD_CURRENT}" docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
  IMAGE_TAG="${OLD_CURRENT}" docker compose -f "${COMPOSE_FILE}" restart frontend
  # CURRENT_SHA is already OLD_CURRENT — no SSM write needed. PREV_SHA is left
  # alone too (it still points at the last known good SHA, not this failed one).
  echo "==> Rolled back to ${OLD_CURRENT} — deploy failed"
  exit 1
fi

# Health passed — commit the new SHA to SSM. Only update PREV_SHA when we
# actually changed CURRENT, so a re-run of the same SHA doesn't clobber the
# real rollback target.
if [[ -n "${OLD_CURRENT}" && "${OLD_CURRENT}" != "${IMAGE_TAG}" ]]; then
  echo "==> Updating PREV_SHA -> ${OLD_CURRENT}"
  aws ssm put-parameter \
    --name /rs-recruitment/infra/PREV_SHA \
    --value "${OLD_CURRENT}" \
    --type String --overwrite >/dev/null
fi
echo "==> Updating CURRENT_SHA -> ${IMAGE_TAG}"
aws ssm put-parameter \
  --name /rs-recruitment/infra/CURRENT_SHA \
  --value "${IMAGE_TAG}" \
  --type String --overwrite >/dev/null

# Reclaim disk by keeping only the N most recent SHA-tagged images per
# repo (newest first). Without this, every deploy leaves ~200-500 MB per
# image lingering and the EC2 disk fills up. Keeping 3 means: the image
# we just deployed + the two prior — enough room for a fast rollback to
# the last-known-good without pulling. `|| true` ensures prune problems
# never fail an otherwise-successful deploy.
echo "==> Pruning old SHA-tagged images (keep newest 3 per repo)"
KEEP_IMAGES=3
for repo in \
    "${ECR_REGISTRY}/rs-recruitment/api" \
    "${ECR_REGISTRY}/rs-recruitment/frontend"; do
  docker images "$repo" --format '{{.CreatedAt}}|{{.Repository}}:{{.Tag}}' \
    | sort -r \
    | awk -F'|' -v keep="$KEEP_IMAGES" 'NR > keep {print $2}' \
    | xargs -r docker rmi -f \
    || true
done
# Sweep up any layers left dangling after the rmi -f calls above.
docker image prune -f || true

echo "==> Deploy complete (IMAGE_TAG=${IMAGE_TAG})"
