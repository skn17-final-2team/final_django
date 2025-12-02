from django.urls import path
from .views import (
    MeetingCreateView,
    MeetingListAllView,
    MeetingListMineView,
    MeetingListOpenView,
)

app_name = "meetings"

urlpatterns = [
    path("new/", MeetingCreateView.as_view(), name="create"),
    path("list/all/", MeetingListAllView.as_view(), name="list_all"),
    path("list/mine/", MeetingListMineView.as_view(), name="list_mine"),
    path("list/open/", MeetingListOpenView.as_view(), name="list_open"),
]