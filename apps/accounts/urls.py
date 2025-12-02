from django.urls import path
from .views import login_view, login_api, logout_view

app_name = "accounts"

urlpatterns = [
    path("login/", login_view, name="login"),
    path("login-api/", login_api, name="login_api"),
    path("logout/", logout_view, name="logout"),
]
