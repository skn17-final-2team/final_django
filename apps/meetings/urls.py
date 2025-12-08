from django.urls import path
from .views import (
    MeetingCreateView,
    MeetingListAllView,
    MeetingListMineView,
    MeetingListDeptView,
    MeetingRecordView,
    MeetingTranscriptView,
    MeetingDetailView,
    meeting_record_upload,
    meeting_summary,
    MeetingRenderingView,
    meeting_transcript_prepare,
    minutes_download,
    minutes_save,
)

app_name = "meetings"

urlpatterns = [
    path("new/", MeetingCreateView.as_view(), name="meeting_create"),
    path("<int:meeting_id>/record/", MeetingRecordView.as_view(), name="meeting_record"),
    path("<int:meeting_id>/upload/", meeting_record_upload, name="meeting_upload"),

    path("<int:meeting_id>/rendering/", MeetingRenderingView.as_view(), name="rendering"),
    path("<int:meeting_id>/transcript/prepare/", meeting_transcript_prepare, name="meeting_transcript_prepare"),

    path("<int:meeting_id>/transcript/", MeetingTranscriptView.as_view(), name="meeting_transcript"),
    path("<int:meeting_id>/detail", MeetingDetailView.as_view(), name="meeting_detail"),

    path("<int:meeting_id>/minutes/save/", minutes_save, name="minutes_save"),
    path("<int:meeting_id>/minutes/<str:fmt>/download/", minutes_download, name="minutes_download"),

    path("list/all/", MeetingListAllView.as_view(), name="list_all"),
    path("list/mine/", MeetingListMineView.as_view(), name="list_mine"),
    path("list/dept/", MeetingListDeptView.as_view(), name="list_dept"),
]