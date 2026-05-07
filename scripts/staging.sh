#!/usr/bin/env bash
# Toggle the staging environment on/off.
# Assumes a pre-provisioned staging EC2 + RDS, tagged Env=staging in us-east-1.
#
# Provision once (manually or via Terraform) tagging both with:
#   EC2:  Key=Env,Value=staging
#   RDS:  Key=Env,Value=staging  (RDS tags applied with --tags 'Key=Env,Value=staging')
#
# Usage:
#   scripts/staging.sh up      # start EC2 + RDS, print endpoints
#   scripts/staging.sh down    # stop EC2 + RDS
#   scripts/staging.sh status

set -euo pipefail
REGION="${AWS_REGION:-us-east-1}"
TAG_KEY="Env"
TAG_VAL="staging"

ec2_id() {
  aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:${TAG_KEY},Values=${TAG_VAL}" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[0].InstanceId' --output text
}

rds_id() {
  aws rds describe-db-instances --region "$REGION" \
    --query "DBInstances[?contains(TagList[?Key=='${TAG_KEY}'].Value, '${TAG_VAL}')].DBInstanceIdentifier | [0]" \
    --output text 2>/dev/null
}

case "${1:-status}" in
  up)
    EC2=$(ec2_id); RDS=$(rds_id)
    [[ -n "$RDS" && "$RDS" != "None" ]] && aws rds start-db-instance --db-instance-identifier "$RDS" --region "$REGION" >/dev/null && echo "RDS $RDS starting"
    [[ -n "$EC2" && "$EC2" != "None" ]] && aws ec2 start-instances --instance-ids "$EC2" --region "$REGION" >/dev/null && echo "EC2 $EC2 starting"
    ;;
  down)
    EC2=$(ec2_id); RDS=$(rds_id)
    [[ -n "$EC2" && "$EC2" != "None" ]] && aws ec2 stop-instances --instance-ids "$EC2" --region "$REGION" >/dev/null && echo "EC2 $EC2 stopping"
    [[ -n "$RDS" && "$RDS" != "None" ]] && aws rds stop-db-instance --db-instance-identifier "$RDS" --region "$REGION" >/dev/null && echo "RDS $RDS stopping (auto-restarts after 7 days)"
    ;;
  status)
    EC2=$(ec2_id); RDS=$(rds_id)
    if [[ -z "$EC2" || "$EC2" == "None" ]]; then echo "EC2: not found (tag ${TAG_KEY}=${TAG_VAL})"
    else aws ec2 describe-instances --instance-ids "$EC2" --region "$REGION" \
      --query 'Reservations[0].Instances[0].{Id:InstanceId,State:State.Name,Ip:PublicIpAddress}' --output table; fi
    if [[ -z "$RDS" || "$RDS" == "None" ]]; then echo "RDS: not found (tag ${TAG_KEY}=${TAG_VAL})"
    else aws rds describe-db-instances --db-instance-identifier "$RDS" --region "$REGION" \
      --query 'DBInstances[0].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address}' --output table; fi
    ;;
  *)
    echo "Usage: $0 {up|down|status}" >&2; exit 1;;
esac
