from django.urls import path
from .views import (
    MeetingCreateView,
    MeetingListAllView,
    MeetingListMineView,
    MeetingListOpenView,
    MeetingRecordView,
    MeetingTranscriptView,
    MeetingDetailView,
    meeting_record_upload
)

app_name = "meetings"

urlpatterns = [
    path("new/", MeetingCreateView.as_view(), name="meeting_create"),
    path("<int:meeting_id>/record/", MeetingRecordView.as_view(), name="meeting_record"),
    path("<int:meeting_id>/upload/", meeting_record_upload, name="meeting_upload"),
    path("<int:meeting_id>/transcript/", MeetingTranscriptView.as_view(), name="meeting_transcript"),
    path("<int:meeting_id>/", MeetingDetailView.as_view(), name="meeting_detail"),
    path("list/all/", MeetingListAllView.as_view(), name="list_all"),
    path("list/mine/", MeetingListMineView.as_view(), name="list_mine"),
    path("list/open/", MeetingListOpenView.as_view(), name="list_open"),
]