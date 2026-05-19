from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import EC2, ECR
from diagrams.aws.database import RDS
from diagrams.aws.storage import S3
from diagrams.aws.management import SSM
from diagrams.onprem.network import Nginx
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.ci import GithubActions
from diagrams.onprem.client import Users
from diagrams.generic.network import Firewall

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "0.6",
    "splines": "ortho",
    "nodesep": "0.8",
    "ranksep": "1.0",
}

with Diagram(
    "RS Recruitment — AWS Architecture",
    filename="docs/screenshots/aws-architecture",
    outformat="png",
    show=False,
    graph_attr=graph_attr,
    direction="LR",
):
    users = Users("Users")
    cloudflare = Firewall("Cloudflare\nTLS + CDN")

    with Cluster("AWS"):
        with Cluster("EC2 t3.micro"):
            nginx = Nginx("nginx\n(SPA + proxy)")
            redis = Redis("Redis\n(task queue)")

        rds = RDS("RDS PostgreSQL\n(private subnet)")
        s3 = S3("S3\nUploads + Artifacts")
        ecr = ECR("ECR\nDocker Registry")
        ssm = SSM("SSM")

    github = GithubActions("GitHub Actions")

    # Request path
    users >> cloudflare >> nginx

    # nginx backends
    nginx >> rds
    nginx >> redis
    nginx >> s3

    # CI/CD path
    github >> Edge(label="push image") >> ecr
    github >> Edge(label="artifacts") >> s3
    github >> Edge(label="deploy") >> ssm >> nginx
    ecr >> Edge(label="pull") >> nginx
