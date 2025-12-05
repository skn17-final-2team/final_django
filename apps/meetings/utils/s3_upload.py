import uuid
import io
import boto3
from datetime import timedelta
from botocore.config import Config
from django.conf import settings
from django.utils import timezone

from apps.meetings.models import S3File

CONTENT_TYPE_MAP = {
    "png": "image/png",     # 테스트용
    "wav": "audio/wav",
}

REGION_NAME=settings.AWS_S3_REGION_NAME
BUCKET_NAME=settings.AWS_STORAGE_BUCKET_NAME

def get_s3_client():
    session = boto3.session.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=REGION_NAME,
    )

    client = session.client(
        "s3",
        region_name=REGION_NAME,
        endpoint_url=f"https://s3.{REGION_NAME}.amazonaws.com",
        config=Config(signature_version="s3v4"),
    )

    return client

def upload_raw_file_bytes(file_bytes: bytes, original_filename: str, delete_after_seconds: int) -> str:
    s3 = get_s3_client()
    
    ext = original_filename.split(".")[-1].lower()
    s3_key = f"tests/{uuid.uuid4()}.{ext}"

    content_type = CONTENT_TYPE_MAP.get(ext, "application/octet-stream")
    file_obj = io.BytesIO(file_bytes)

    # 업로드
    s3.upload_fileobj(
        Fileobj=file_obj,
        Bucket=BUCKET_NAME,
        Key=s3_key,
        ExtraArgs={"ContentType": content_type},
    )

    # 2) delete_at 계산
    delete_at = timezone.now() + timedelta(seconds=delete_after_seconds)

    # 3) S3File 레코드 생성 (PK = s3_key)
    S3File.objects.create(
        s3_key=s3_key,
        original_name=original_filename,
        delete_at=delete_at,
    )
    # 다운로드 URL 반환
    return s3_key

def get_presigned_url(s3_key):
    s3 = get_s3_client()
    presigned_url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": BUCKET_NAME, "Key": s3_key},
        ExpiresIn=600,  # 만료 시간 (600초)
    )
    return presigned_url