import os
import json

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

from apps.accounts.models import User
from apps.google_calendar.models import GoogleCalendarToken
from apps.google_calendar.utils import get_google_credentials

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build


# -------------------------------------------------------------------
# Google OAuth 로그인 / 콜백
# -------------------------------------------------------------------
def google_login(request):
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_OAUTH2_CLIENT_SECRETS_JSON,
        scopes=settings.GOOGLE_OAUTH2_SCOPES,
        redirect_uri="http://localhost:8000/oauth2callback/",
    )
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    # state를 세션에 저장
    request.session["state"] = state

    return redirect(authorization_url)


def oauth2callback(request):
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    state = request.session.get("state")
    if not state:
        return JsonResponse({"error": "missing_state"}, status=400)

    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_OAUTH2_CLIENT_SECRETS_JSON,
        scopes=settings.GOOGLE_OAUTH2_SCOPES,
        state=state,
    )
    flow.redirect_uri = request.build_absolute_uri("/oauth2callback/")

    authorization_response = request.build_absolute_uri()
    flow.fetch_token(authorization_response=authorization_response)

    credentials = flow.credentials
    token_json = credentials.to_json()

    login_user_id = request.session.get("login_user_id")
    if not login_user_id:
        return JsonResponse({"error": "not_logged_in"}, status=400)

    user = User.objects.get(pk=login_user_id)

    # 유저별 토큰 저장/갱신
    GoogleCalendarToken.objects.update_or_create(
        user=user,
        defaults={"token_json": token_json},
    )

    # 세션에도 보관 (utils에서 어떻게 읽는지에 따라 사용)
    request.session["google_credentials"] = token_json

    return redirect("/")


# -------------------------------------------------------------------
# Google Calendar 이벤트 목록 조회
#  - /api/google-events/
# -------------------------------------------------------------------
def google_events(request):
    creds = get_google_credentials(request)
    if not creds:
        return JsonResponse({"error": "not_authenticated"}, status=401)

    service = build("calendar", "v3", credentials=creds)

    events_result = service.events().list(
        calendarId="primary",
        timeMin="2020-01-01T00:00:00Z",
        timeMax="2030-12-31T23:59:59Z",
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for e in events_result.get("items", []):
        events.append(
            {
                "id": e["id"],
                "title": e.get("summary", ""),
                "start": e["start"].get("dateTime") or e["start"].get("date"),
                "end": e["end"].get("dateTime") or e["end"].get("date"),
                # 모달에 설명을 표시할 수 있도록 description도 전달
                "description": e.get("description", ""),
            }
        )

    return JsonResponse(events, safe=False)


# -------------------------------------------------------------------
# Google Calendar 이벤트 생성
#  - /api/google-events/create/
# -------------------------------------------------------------------
@csrf_exempt  # CSRF 토큰 제대로 쓰실 거면 이 데코레이터는 제거해도 됩니다.
@require_POST
def create_google_event(request):
    """
    홈 화면에서 보낸 일정 데이터를 사용자의 Google Calendar에 생성
    """
    creds = get_google_credentials(request)
    if not creds:
        return JsonResponse({"error": "not_authenticated"}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    title = data.get("title")
    start = data.get("start")
    end = data.get("end")
    description = data.get("description", "")

    if not title or not start or not end:
        return JsonResponse({"error": "missing_fields"}, status=400)

    service = build("calendar", "v3", credentials=creds)

    time_zone = "Asia/Seoul"

    event_body = {
        "summary": title,
        "description": description,
        "start": {
            "dateTime": start,
            "timeZone": time_zone,
        },
        "end": {
            "dateTime": end,
            "timeZone": time_zone,
        },
    }

    try:
        created_event = service.events().insert(
            calendarId="primary",
            body=event_body,
        ).execute()
    except Exception as e:
        return JsonResponse(
            {"error": "google_api_error", "detail": str(e)},
            status=500,
        )

    return JsonResponse(
        {
            "id": created_event.get("id"),
            "status": created_event.get("status"),
        }
    )


# -------------------------------------------------------------------
# Google Calendar 인증 여부 확인
#  - /api/google-auth-status/
# -------------------------------------------------------------------
def google_auth_status(request):
    """
    현재 요청 기준으로 Google 인증이 되어 있는지 여부만 반환
    """
    creds = get_google_credentials(request)
    return JsonResponse({"authenticated": bool(creds)})


# -------------------------------------------------------------------
# Google Calendar 이벤트 삭제
#  - /api/google-events/<event_id>/delete/
# -------------------------------------------------------------------
@csrf_exempt  # 마찬가지로 CSRF 토큰 처리 후에는 제거 가능
@require_POST
def google_events_delete(request, event_id):
    """
    /api/google-events/<event_id>/delete/ 로 들어오는 삭제 요청 처리
    """
    creds = get_google_credentials(request)
    if not creds:
        return JsonResponse({"error": "not_authenticated"}, status=401)

    service = build("calendar", "v3", credentials=creds)

    try:
        service.events().delete(
            calendarId="primary",
            eventId=event_id,
        ).execute()
    except Exception as e:
        return JsonResponse(
            {"error": "google_api_error", "detail": str(e)},
            status=500,
        )

    return JsonResponse({"success": True})
