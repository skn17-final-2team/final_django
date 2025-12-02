from django.urls import path
from .views import login_view, login_api

app_name = "accounts"

urlpatterns = [
    path("login/", login_view, name="login"),
    path("login-api/", login_api, name="login_api"),
]
