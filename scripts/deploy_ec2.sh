#!/bin/bash
# EC2 deploy script — pulls images, starts services, runs migrations.
# All application config is fetched directly from SSM Parameter Store by the
# app at startup (ENVIRONMENT=production in docker-compose.deploy.yml triggers
# SsmSettingsSource). No .env file is written — secrets never touch disk.
set -e

APP_DIR="/home/ec2-user/app"

# Derive account-specific values from the EC2 IAM role (no credentials needed)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
S3_BUCKET="rs-recruitment-${ACCOUNT_ID}"

echo "==> ECR registry: ${ECR_REGISTRY}"
echo "==> S3 bucket:    ${S3_BUCKET}"

echo "==> Logging in to ECR"
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "==> Pulling deploy config from S3"
mkdir -p "${APP_DIR}/frontend/tls"
aws s3 cp "s3://${S3_BUCKET}/deploy/docker-compose.deploy.yml" "${APP_DIR}/docker-compose.deploy.yml"
aws s3 cp "s3://${S3_BUCKET}/deploy/nginx.conf" "${APP_DIR}/frontend/nginx.conf"

echo "==> Materializing TLS cert from SSM"
aws ssm get-parameter --name /rs-recruitment/infra/TLS_CERT --with-decryption \
  --query 'Parameter.Value' --output text > "${APP_DIR}/frontend/tls/cert.pem"
aws ssm get-parameter --name /rs-recruitment/infra/TLS_KEY --with-decryption \
  --query 'Parameter.Value' --output text > "${APP_DIR}/frontend/tls/key.pem"
chmod 600 "${APP_DIR}/frontend/tls/key.pem"
chmod 644 "${APP_DIR}/frontend/tls/cert.pem"

echo "==> Syncing frontend files"
# Force-copy index.html — aws s3 sync skips same-size files even when content changes
aws s3 cp "s3://${S3_BUCKET}/deploy/dist/index.html" "${APP_DIR}/frontend/dist/index.html"
aws s3 sync "s3://${S3_BUCKET}/deploy/dist/" "${APP_DIR}/frontend/dist/" --delete

echo "==> Pulling Docker images"
ECR_REGISTRY="${ECR_REGISTRY}" docker compose -f "${APP_DIR}/docker-compose.deploy.yml" pull

echo "==> Starting services"
ECR_REGISTRY="${ECR_REGISTRY}" docker compose -f "${APP_DIR}/docker-compose.deploy.yml" up -d

echo "==> Reloading nginx (picks up new API container IP)"
docker compose -f "${APP_DIR}/docker-compose.deploy.yml" restart nginx

echo "==> Running database migrations"
docker compose -f "${APP_DIR}/docker-compose.deploy.yml" exec -T api uv run alembic upgrade head

echo "==> Deploy complete"
