#!/bin/bash
# EC2 deploy script — pulls SHA-pinned images, starts services, runs migrations.
#
# Two SHA-tagged ECR images (api + frontend) carry all code and configs.
# This script materializes TLS from SSM (certs are not baked into images) and
# fetches the SHA-pinned compose file from s3://.../deploy/${IMAGE_TAG}/.
#
# Resolution order for IMAGE_TAG:
#   1. $IMAGE_TAG already exported (CI / rollback path)
#   2. SSM /rs-recruitment/infra/CURRENT_SHA (manual rerun, picks up last good)
# If neither is available the script aborts.
set -euo pipefail

APP_DIR="/home/ec2-user/app"
REGION="us-east-1"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
S3_BUCKET="rs-recruitment-${ACCOUNT_ID}"

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "==> IMAGE_TAG not set; reading from SSM CURRENT_SHA"
  IMAGE_TAG=$(aws ssm get-parameter \
    --name /rs-recruitment/infra/CURRENT_SHA \
    --query 'Parameter.Value' --output text 2>/dev/null || echo "")
fi
if [[ -z "${IMAGE_TAG}" ]]; then
  echo "ERROR: IMAGE_TAG is empty and CURRENT_SHA is unset. Cannot deploy."
  exit 1
fi
export IMAGE_TAG

echo "==> ECR registry: ${ECR_REGISTRY}"
echo "==> S3 bucket:    ${S3_BUCKET}"
echo "==> IMAGE_TAG:    ${IMAGE_TAG}"

echo "==> Logging in to ECR"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "==> Fetching SHA-pinned compose file"
mkdir -p "${APP_DIR}/frontend/tls"
aws s3 cp "s3://${S3_BUCKET}/deploy/${IMAGE_TAG}/docker-compose.deploy.yml" \
  "${APP_DIR}/docker-compose.deploy.yml"

echo "==> Materializing TLS cert from SSM"
aws ssm get-parameter --name /rs-recruitment/infra/TLS_CERT --with-decryption \
  --query 'Parameter.Value' --output text > "${APP_DIR}/frontend/tls/cert.pem"
aws ssm get-parameter --name /rs-recruitment/infra/TLS_KEY --with-decryption \
  --query 'Parameter.Value' --output text > "${APP_DIR}/frontend/tls/key.pem"
chmod 600 "${APP_DIR}/frontend/tls/key.pem"
chmod 644 "${APP_DIR}/frontend/tls/cert.pem"

echo "==> Pulling Docker images"
docker compose -f "${APP_DIR}/docker-compose.deploy.yml" pull

echo "==> Starting services"
# --remove-orphans cleans up containers from the previous compose generation
# (e.g., the legacy 'nginx' service replaced by 'frontend').
docker compose -f "${APP_DIR}/docker-compose.deploy.yml" up -d --remove-orphans

echo "==> Restarting frontend (refreshes upstream API IP)"
docker compose -f "${APP_DIR}/docker-compose.deploy.yml" restart frontend

echo "==> Running database migrations"
docker compose -f "${APP_DIR}/docker-compose.deploy.yml" exec -T api uv run alembic upgrade head

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
