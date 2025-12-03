from django.urls import path
from .views import login_view, login_api, logout_view, modify_pw_view,check_old_pw

app_name = "accounts"

urlpatterns = [
    path("login/", login_view, name="login"),
    path("login-api/", login_api, name="login_api"),
    path("logout/", logout_view, name="logout"),
    path("modify-pw/", modify_pw_view, name="modify_pw"),
    path("check-old-pw/", check_old_pw, name="check_old_pw"),
]
