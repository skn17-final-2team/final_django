from django.urls import path
from .views import (
    HomeView,
    MeetingListAllView,
    MeetingListMineView,
    MeetingListOpenView,
    MeetingCreateView,
)

app_name = "core"

urlpatterns = [
    path("", HomeView.as_view(), name="home"),

    path("meetings/new/", MeetingCreateView.as_view(), name="meeting_create"),
    path("meetings/list/all/", MeetingListAllView.as_view(), name="meeting_list_all"),
    path("meetings/list/mine/", MeetingListMineView.as_view(), name="meeting_list_mine"),
    path("meetings/list/open/", MeetingListOpenView.as_view(), name="meeting_list_open"),
]
