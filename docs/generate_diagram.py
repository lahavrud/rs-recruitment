from diagrams import Cluster, Diagram, Edge
from diagrams.aws.compute import ECR
from diagrams.aws.database import RDS
from diagrams.aws.integration import SNS, SQS
from diagrams.aws.management import SSM, Cloudwatch
from diagrams.aws.security import Inspector
from diagrams.aws.storage import S3
from diagrams.generic.network import Firewall
from diagrams.onprem.ci import GithubActions
from diagrams.onprem.client import Users
from diagrams.onprem.network import Nginx

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "2.0",
    "splines": "curved",
    "nodesep": "1.5",
    "ranksep": "2.5",
    "overlap": "false",
}

node_attr = {
    "fontsize": "13",
    "margin": "0.5,0.4",
}

with Diagram(
    "RS Recruitment — AWS Architecture",
    filename="docs/screenshots/aws-architecture",
    outformat="png",
    show=False,
    graph_attr=graph_attr,
    node_attr=node_attr,
    direction="LR",
):
    users = Users("Users")
    cloudflare = Firewall("Cloudflare\nTLS + CDN")
    github = GithubActions("GitHub Actions")

    with Cluster("AWS  us-east-1"):
        ecr = ECR("ECR\napi + frontend")
        ssm = SSM("SSM\nParam Store + Run Command")
        s3 = S3("S3\nuploads · deploy · trail")
        cw = Cloudwatch("CloudWatch\n7 alarms · 6 log groups")
        sns = SNS("SNS\nops-alerts")
        sqs = SQS("SQS\nrs-recruiting-tasks")
        inspector = Inspector("Inspector2\nvuln scanning")

        with Cluster("VPC  10.0.0.0/16\npublic + private subnets  (1a + 1b)"):
            nginx = Nginx("nginx\nSPA + /api proxy")
            rds = RDS("RDS PostgreSQL 16\ndb.t3.micro")

    # Request path
    users >> cloudflare >> nginx
    nginx >> rds
    nginx >> sqs
    nginx >> s3

    # CI/CD
    github >> Edge(label="push") >> ecr
    github >> Edge(label="deploy via SSM") >> ssm >> nginx
    ecr >> Edge(label="pull") >> nginx

    # Observability
    nginx >> Edge(style="dashed", color="gray") >> cw
    rds >> Edge(style="dashed", color="gray") >> cw
    cw >> sns
    inspector >> Edge(style="dashed", color="gray") >> ecr
