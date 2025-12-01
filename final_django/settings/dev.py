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

# 개발 환경에서는 로컬 파일에 저장하도록 권장
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# 정적 파일은 base 설정 그대로 사용
# MEDIA 설정 (로컬)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'