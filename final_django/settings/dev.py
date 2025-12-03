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