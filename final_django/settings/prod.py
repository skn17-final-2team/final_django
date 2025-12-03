from .base import *
import os

DEBUG = False

ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    os.getenv("AWS_ELASTIC_IP") or '',
    os.getenv("DOMAIN_URL") or '',
]

# 운영은 RDS로
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'testdb',          # 실제 DB 이름으로 수정
        'USER': 'admin',           # 실제 유저명으로 수정
        'PASSWORD': os.getenv('DATABASES_PASSWORD'),
        'HOST': os.getenv('DATABASES_HOST'),
        'PORT': '3306',
        'OPTIONS': {
            'sql_mode': 'STRICT_TRANS_TABLES',
            'charset': 'utf8mb4',
        },
    },
}