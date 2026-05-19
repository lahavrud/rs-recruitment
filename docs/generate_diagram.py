from diagrams import Cluster, Diagram, Edge
from diagrams.aws.compute import ECR
from diagrams.aws.database import RDS
from diagrams.aws.integration import SNS
from diagrams.aws.management import SSM, Cloudwatch
from diagrams.aws.security import Inspector
from diagrams.aws.storage import S3
from diagrams.generic.network import Firewall
from diagrams.onprem.ci import GithubActions
from diagrams.onprem.client import Users
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.network import Nginx

graph_attr = {
    "fontsize": "13",
    "bgcolor": "white",
    "pad": "0.8",
    "splines": "ortho",
    "nodesep": "0.8",
    "ranksep": "1.4",
}

with Diagram(
    "RS Recruitment — AWS Architecture",
    filename="docs/screenshots/aws-architecture",
    outformat="png",
    show=False,
    graph_attr=graph_attr,
    direction="TB",
):
    users = Users("Users")
    cloudflare = Firewall("Cloudflare\nTLS + CDN")
    github = GithubActions("GitHub Actions")

    with Cluster("AWS — us-east-1"):
        with Cluster("ECR"):
            ecr_api = ECR("rs-recruitment/api")
            ecr_fe = ECR("rs-recruitment/frontend")

        ssm_param = SSM("SSM Parameter Store\n20+ params / SecureStrings")
        ssm_run = SSM("SSM Run Command\n(deploy trigger)")

        with Cluster("VPC  10.0.0.0/16"):
            with Cluster("Public Subnets  (1a + 1b)"):
                nginx = Nginx("nginx\n(SPA + /api proxy)")
                redis = Redis("Redis\n(task queue)")

            with Cluster("Private Subnets  (1a + 1b)"):
                rds = RDS("RDS PostgreSQL 16\ndb.t3.micro")

        with Cluster("S3"):
            s3_main = S3("rs-recruitment\n(uploads + deploy)")
            s3_trail = S3("cloudtrail\n(audit logs)")

        with Cluster("Observability"):
            cw = Cloudwatch("CloudWatch\n7 alarms + 6 log groups")
            sns = SNS("SNS\nops-alerts")
            inspector = Inspector("Inspector2\n(vuln scanning)")

    # Request path
    users >> cloudflare >> nginx
    nginx >> rds
    nginx >> redis
    nginx >> s3_main

    # Secrets injected at startup
    ssm_param >> Edge(style="dashed", label="env secrets") >> nginx

    # CI/CD path
    github >> Edge(label="push images") >> ecr_api
    github >> Edge(label="push images") >> ecr_fe
    github >> Edge(label="deploy artifacts") >> s3_main
    github >> Edge(label="trigger deploy") >> ssm_run >> nginx
    ecr_api >> Edge(label="pull on deploy") >> nginx

    # Monitoring
    nginx >> Edge(style="dashed") >> cw
    rds >> Edge(style="dashed") >> cw
    cw >> sns

    # Audit
    cw >> Edge(style="dashed", label="trail logs") >> s3_trail

    # Security scanning
    inspector >> Edge(style="dashed") >> ecr_api
