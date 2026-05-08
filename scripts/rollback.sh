#!/usr/bin/env bash
# Roll prod back (or forward) to a previously-deployed git SHA.
#
# Pre-flight: confirms the per-SHA artifacts and ECR images exist.
# Action:     puts CURRENT_SHA in SSM, then sends an SSM Run-Command
#             to the prod EC2 instance to re-run deploy_ec2.sh with that SHA.
#
# Usage: scripts/rollback.sh <git-sha>
set -euo pipefail

SHA="${1:?usage: $(basename "$0") <git-sha>}"
REGION="us-east-1"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="rs-recruitment-${ACCOUNT_ID}"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "==> Verifying per-SHA artifacts in S3"
aws s3 ls "s3://${S3_BUCKET}/deploy/${SHA}/deploy_ec2.sh" >/dev/null
aws s3 ls "s3://${S3_BUCKET}/deploy/${SHA}/docker-compose.deploy.yml" >/dev/null

echo "==> Verifying ECR images exist for SHA ${SHA}"
aws ecr describe-images --repository-name rs-recruitment/api \
  --image-ids imageTag="${SHA}" >/dev/null
aws ecr describe-images --repository-name rs-recruitment/frontend \
  --image-ids imageTag="${SHA}" >/dev/null

echo "==> Locating prod EC2 instance"
EC2_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Env,Values=prod" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId | [0]' --output text)
if [[ -z "${EC2_ID}" || "${EC2_ID}" == "None" ]]; then
  echo "ERROR: no running EC2 instance tagged Env=prod"
  exit 1
fi

echo "==> Updating SSM CURRENT_SHA -> ${SHA}"
aws ssm put-parameter --name /rs-recruitment/infra/CURRENT_SHA \
  --value "${SHA}" --type String --overwrite >/dev/null

echo "==> Sending deploy command to ${EC2_ID}"
DEPLOY_CMD="aws s3 cp s3://${S3_BUCKET}/deploy/${SHA}/deploy_ec2.sh /tmp/deploy_${SHA}.sh && IMAGE_TAG=${SHA} bash /tmp/deploy_${SHA}.sh"
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "${EC2_ID}" \
  --document-name "AWS-RunShellScript" \
  --timeout-seconds 300 \
  --parameters "commands=[\"${DEPLOY_CMD}\"]" \
  --query 'Command.CommandId' --output text)

echo "Command ID: ${COMMAND_ID}"
echo "Tail with:"
echo "  aws ssm get-command-invocation --command-id ${COMMAND_ID} --instance-id ${EC2_ID} --query Status --output text"
