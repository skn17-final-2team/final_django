"""
WSGI config for final_django project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'final_django.settings.dev')    # 개발
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'final_django.settings.prod')   # 배포

application = get_wsgi_application()
