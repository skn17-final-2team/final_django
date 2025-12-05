from django.shortcuts import redirect, render
from django.views.generic import TemplateView
from apps.core.views import LoginRequiredSessionMixin
from apps.accounts.models import Dept, User
from django.db.models import Prefetch

from django.shortcuts import get_object_or_404
from django.http import JsonResponse

from .models import Meeting, Attendee, Domain
from django.contrib import messages
from django.db import transaction


from apps.meetings.utils.s3_upload import upload_raw_file_bytes, get_presigned_url
from apps.meetings.utils.runpod import get_stt, runpod_health

from apps.meetings.models import S3File

class MeetingListAllView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_all.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # 1) 로그인 사용자
        login_user_id = self.request.session.get("login_user_id")
        login_user = None
        if login_user_id:
            login_user = User.objects.select_related("dept").get(user_id=login_user_id)

        # 2) 회의 + 참석자 미리 로딩 (일시 최신순)
        meeting_qs = (
            Meeting.objects
            .select_related("host")  # meeting.host
            .prefetch_related(
                Prefetch(
                    "attendees",
                    queryset=Attendee.objects.select_related("user", "user__dept"),
                )
            )
            .order_by("-meet_date_time")  # 기본 정렬: 일시 내림차순(최근 회의 먼저)
        )

        meetings_data = []

        for m in meeting_qs:
            attendees = list(m.attendees.all())
            attendee_count = len(attendees)
            attendee_names = ", ".join(a.user.name for a in attendees)

            # 참여 여부: 주최자이거나 참석자면 True, 그 외 False
            is_joined = False
            if login_user_id:
                if str(m.host_id) == str(login_user_id):
                    is_joined = True
                else:
                    is_joined = any(
                        str(a.user_id) == str(login_user_id) for a in attendees
                    )

            # 열람 여부: 실제 구현에 맞게 필드/로직 교체
            # 예시) meeting_tbl 에 viewed_yn 같은 필드가 있다면:
            #   is_read = m.viewed_yn
            # 지금은 일단 False 로 둠
            is_read = getattr(m, "viewed_yn", False)

            meetings_data.append(
                {
                    "meeting_id": m.meeting_id,
                    "title": m.title,
                    "meet_date_time": m.meet_date_time,
                    "place": m.place,
                    "host_name": m.host.name,
                    "attendee_count": attendee_count,
                    "attendee_names": attendee_names,
                    "is_joined": is_joined,
                    "is_read": is_read,
                }
            )

        context["login_user"] = login_user
        context["meetings"] = meetings_data
        return context

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
        # 로그인한 사용자 정보도 템플릿으로 내려줌
        login_user_id = self.request.session.get("login_user_id")
        if login_user_id:
            context["login_user"] = User.objects.get(user_id=login_user_id)
        return context

    def post(self, request, *args, **kwargs):

        attendee_ids = request.POST.getlist("attendees")
        domain_names = request.POST.getlist("domains")
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
        
        attendee_ids = [uid for uid in attendee_ids if str(uid) != str(login_user_id)]


        # 4. meeting_tbl에 새 레코드 생성
        with transaction.atomic():
            # meeting_tbl insert
            meeting = Meeting.objects.create(
                title=title,
                meet_date_time=meet_date_time,
                place=place,
                host=host_user,   # FK: User 인스턴스
                transcript="",    # NOT NULL 필드라면 임시값
                domain_upload=bool(domain_names),
            )

        Attendee.objects.create(meeting=meeting, user=host_user)

        users = User.objects.filter(user_id__in=attendee_ids)
        attendee_objs = [
                Attendee(meeting=meeting, user=u) for u in users
        ]
        Attendee.objects.bulk_create(attendee_objs)

        # domain_tbl insert (특화 도메인)
        if domain_names:
            domain_objs = [
                Domain(meeting=meeting, domain_name=name)
                for name in domain_names
            ]
            Domain.objects.bulk_create(domain_objs)

        # 5. 생성된 meeting_id를 가지고 녹음 화면으로 이동
        return redirect("meetings:meeting_record", meeting_id=meeting.meeting_id)
    
class MeetingRecordView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_record.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        meeting_id = self.kwargs.get("meeting_id")

        meeting = Meeting.objects.get(pk=meeting_id)

        context["attendees"] = (
            meeting.attendees
                   .select_related("user")  # Attendee.user
                   .all()
        )

        context["meeting"] = meeting
        context["meeting_id"] = meeting_id
        return context

class MeetingTranscriptView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_transcript.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        meeting_id = self.kwargs.get("meeting_id")
        meeting = Meeting.objects.get(pk=meeting_id)

        attendees_qs = (
            meeting.attendees
                   .select_related("user", "user__dept")
                   .all()
        )

        transcript_html = meeting.transcript or ""

        if not transcript_html:
            print('전사 진행 중')
            res = get_stt(get_presigned_url(str(meeting.record_url)))
            if res['status_code'] != 200 or not res['success']:
                transcript_html = res
            else:
                transcript_html = res['data']['full_text'].replace("\n", "<br>")
                meeting.transcript = transcript_html
                meeting.save()
        

        # 이미 전사된 텍스트가 meeting_tbl.transcript
        context.update(
            {
                "meeting": meeting,
                "meeting_id": meeting_id,
                "attendees": attendees_qs,
                "transcript_html": transcript_html,
            }
        )

        # attendee_tbl, task_tbl 등도 필요하면 함께 조회
        # context["attendees"] = Attendee.objects.filter(meeting_id=meeting_id)

        return context
    


class MeetingDetailView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_detail.html"

def meeting_record_upload(request, meeting_id):
    # 1) 메소드 체크
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    # 2) 회의 조회
    meeting = get_object_or_404(Meeting, pk=meeting_id)

    # 3) 파일 추출
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return JsonResponse({"error": "file is required"}, status=400)

    # 4) 확장자 검증 (png / wav)
    filename = uploaded_file.name
    ext = filename.split(".")[-1].lower()
    if ext not in ["png", "wav"]:
        return JsonResponse(
            {"error": "PNG/WAV 파일만 업로드 가능합니다."},
            status=400,
        )

    # 5) 유틸 호출
    file_bytes = uploaded_file.read()
    try:
        s3_key = upload_raw_file_bytes(
            file_bytes=file_bytes,
            original_filename=filename,
            delete_after_seconds=3600,
        )
    except Exception as e:
        # 유틸 호출 중 에러가 나도 반드시 응답을 반환
        return JsonResponse(
            {"error": f"S3 업로드 중 오류: {str(e)}"},
            status=500,
        )

    # 6) Meeting FK 연결 (record_url 이 ForeignKey(S3File, db_column="record_url") 일 때)
    meeting.record_url_id = s3_key
    meeting.save(update_fields=["record_url"])

    return JsonResponse({
        "ok": True,
    })