from core.config import settings
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url=settings.minio.public_url,
    aws_access_key_id=settings.minio.access_key,
    aws_secret_access_key=settings.minio.secret_key,
    region_name=settings.minio.region
)


def ensure_bucket(bucket_name: str):
    existing_buckets = s3.list_buckets()
    if not any(b["Name"] == bucket_name for b in existing_buckets["Buckets"]):
        s3.create_bucket(Bucket=bucket_name)
        print(f"Bucket '{bucket_name}' created")
    else:
        print(f"Bucket '{bucket_name}' already exists")