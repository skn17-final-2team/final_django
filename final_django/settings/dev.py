from .base import *

DEBUG = True

ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
]

# 로컬은 sqlite3로 간단하게
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME': 'testdb',          # 실제 DB 이름으로 수정
#         'USER': 'admin',           # 실제 유저명으로 수정
#         'PASSWORD': os.getenv('DATABASES_PASSWORD'),
#         'HOST': os.getenv('DATABASES_HOST'),
#         'PORT': '3306',
#         'OPTIONS': {
#             'sql_mode': 'STRICT_TRANS_TABLES',
#             'charset': 'utf8mb4',
#         },
#     },
# }