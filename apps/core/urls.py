from django.urls import path
from .views import HomeView, AdminHomeView

app_name = "core"

urlpatterns = [
    path("", HomeView.as_view(), name="home"),
    path("admin/", AdminHomeView.as_view(), name="admin_home"),
    
]
