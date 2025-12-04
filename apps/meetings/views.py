from django.shortcuts import redirect, render
from django.views.generic import TemplateView
from apps.core.views import LoginRequiredSessionMixin
from apps.accounts.models import Dept, User
from django.db.models import Prefetch
from .models import Meeting, Attendee
from django.contrib import messages

from apps.meetings.utils.s3_upload import upload_raw_file_bytes
from apps.meetings.models import S3File

class MeetingListAllView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_all.html"

class MeetingListMineView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_mine.html"

class MeetingListOpenView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_open.html"

class MeetingCreateView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_create.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # DB에서 실제 부서 + 유저들을 가져오는 부분
        dept_qs = Dept.objects.prefetch_related(
            Prefetch("users", queryset=User.objects.order_by("name"))
        ).order_by("dept_name")

        context["departments"] = dept_qs   # 템플릿으로 넘김
        return context

    def post(self, request, *args, **kwargs):

        attendee_ids = request.POST.getlist("attendees")
        if not attendee_ids:
            messages.error(request, "참석자를 최소 1명 이상 선택해 주세요.")
            context = self.get_context_data()
            context["form_title"] = request.POST.get("title", "")
            context["form_meet_date_time"] = request.POST.get("meet_date_time", "")
            context["form_place"] = request.POST.get("place", "")
            return render(request, self.template_name, context)
        
        # 1. 폼 데이터
        title = request.POST.get("title")
        meet_date_time = request.POST.get("meet_date_time")
        place = request.POST.get("place")

        # 2. 세션에서 로그인한 사용자 id 가져오기
        login_user_id = request.session.get("login_user_id")
        if not login_user_id:
            # 혹시 세션 끊긴 경우 대비
            return redirect("login")

        # 3. host로 쓸 User 객체 조회
        host_user = User.objects.get(user_id=login_user_id)

        # 4. meeting_tbl에 새 레코드 생성
        meeting = Meeting.objects.create(
            title=title,
            meet_date_time=meet_date_time,
            place=place,
            host=host_user,      # ← host_id가 아니라 host(FK)에 User 인스턴스
            transcript="",       # NOT NULL 필드라 임시로 빈 문자열
        )

        # 5. 생성된 meeting_id를 가지고 녹음 화면으로 이동
        return redirect("meetings:meeting_record", meeting_id=meeting.meeting_id)
    
class MeetingRecordView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_record.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        meeting_id = self.kwargs.get("meeting_id")

        meeting = Meeting.objects.get(pk=meeting_id)

        context["meeting"] = meeting
        context["meeting_id"] = meeting_id
        return context

class MeetingTranscriptView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_transcript.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        meeting_id = self.kwargs.get("meeting_id")
        meeting = Meeting.objects.get(pk=meeting_id)

        # 이미 전사된 텍스트가 meeting_tbl.transcript에 저장되어 있다고 가정
        # 또는 별도 전사 테이블/파일에서 불러와도 됨
        context["meeting"] = meeting
        context["meeting_id"] = meeting_id

        # attendee_tbl, task_tbl 등도 필요하면 함께 조회
        # context["attendees"] = Attendee.objects.filter(meeting_id=meeting_id)

        return context

class MeetingDetailView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_detail.html"

# TODO 이거 수정 해야댐 ㄹㅇ
def meeting_record_upload(request, meeting_id):
    print()
    return 