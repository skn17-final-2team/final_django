import os
import json

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

from apps.accounts.models import User
from apps.google_calendar.models import GoogleCalendarToken, OAuthState
from apps.google_calendar.utils import get_google_credentials

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build


# -------------------------------------------------------------------
# Google OAuth 로그인 / 콜백
# -------------------------------------------------------------------
def google_login(request):
    """
    구글 OAuth 로그인/동의 화면으로 리다이렉트
    """
    # 로그인 확인
    login_user_id = request.session.get("login_user_id")
    if not login_user_id:
        return JsonResponse(
            {"error": "not_logged_in", "detail": "먼저 로그인해주세요."},
            status=400
        )

    if settings.DEBUG:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    flow = Flow.from_client_secrets_file(
        settings.GOOGLE_OAUTH2_CLIENT_SECRETS_JSON,
        scopes=settings.GOOGLE_OAUTH2_SCOPES,
        redirect_uri=settings.GOOGLE_OAUTH2_REDIRECT_URI,
    )

    # authorization_url을 만들면서, 내부적으로 state를 생성해 준다.
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    # ✅ state와 user_id를 DB에 저장 (세션이 유지되지 않으므로)
    OAuthState.objects.update_or_create(
        state=state,
        defaults={"user_id": login_user_id}
    )

    return redirect(authorization_url)

def oauth2callback(request):
    """
    구글에서 redirect 되는 콜백 URL
    - 구글이 준 code, state를 이용해 토큰 발급
    - 로그인한 User 기준으로 GoogleCalendarToken 저장
    """
    if settings.DEBUG:
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    # URL에서 state 파라미터 가져오기
    state = request.GET.get("state")
    if not state:
        return JsonResponse({
            "error": "missing_state",
            "detail": "인증 상태 정보가 없습니다.",
        }, status=400)

    # DB에서 state로 user_id 조회
    try:
        oauth_state = OAuthState.objects.get(state=state)
        login_user_id = oauth_state.user_id
    except OAuthState.DoesNotExist:
        return JsonResponse({
            "error": "invalid_state",
            "detail": "유효하지 않은 인증 상태입니다. 다시 시도해주세요.",
        }, status=400)

    # ✅ Flow를 같은 state, 같은 redirect_uri로 생성해야 한다.
    try:
        flow = Flow.from_client_secrets_file(
            settings.GOOGLE_OAUTH2_CLIENT_SECRETS_JSON,
            scopes=settings.GOOGLE_OAUTH2_SCOPES,
            state=state,
        )
        flow.redirect_uri = settings.GOOGLE_OAUTH2_REDIRECT_URI

        # 구글이 현재 이 콜백으로 호출한 전체 URL
        authorization_response = request.build_absolute_uri()

        # ✅ 여기서 oauthlib이 "URL에 있는 state"와 "Flow에 지정된 state"를 비교한다.
        flow.fetch_token(authorization_response=authorization_response)

        credentials = flow.credentials
        token_json = credentials.to_json()

    except Exception as e:
        return JsonResponse({
            "error": "oauth_error",
            "detail": str(e)
        }, status=500)

    try:
        user = User.objects.get(user_id=login_user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "user_not_found"}, status=404)

    # 유저별로 토큰 저장/업데이트
    GoogleCalendarToken.objects.update_or_create(
        user=user,
        defaults={"token_json": token_json},
    )

    # 사용한 state는 DB에서 삭제
    oauth_state.delete()

    # 세션을 복원하고 리다이렉트
    request.session["login_user_id"] = login_user_id
    request.session["google_credentials"] = token_json
    request.session.save()

    return redirect("/")  # 홈으로 이동

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
        # 반복 규칙 파싱
        repeat_type = "none"
        if "recurrence" in e:
            rrule = e["recurrence"][0] if e["recurrence"] else ""
            if "FREQ=DAILY" in rrule:
                repeat_type = "daily"
            elif "FREQ=WEEKLY" in rrule:
                repeat_type = "weekly"
            elif "FREQ=MONTHLY" in rrule:
                repeat_type = "monthly"
            elif "FREQ=YEARLY" in rrule:
                repeat_type = "yearly"

        events.append(
            {
                "id": e["id"],
                "title": e.get("summary", ""),
                "start": e["start"].get("dateTime") or e["start"].get("date"),
                "end": e["end"].get("dateTime") or e["end"].get("date"),
                "description": e.get("description", ""),
                "repeat": repeat_type,
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
    repeat = data.get("repeat", "none")

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

    # 반복 규칙 추가
    if repeat and repeat != "none":
        freq_map = {
            "daily": "DAILY",
            "weekly": "WEEKLY",
            "monthly": "MONTHLY",
            "yearly": "YEARLY",
        }
        freq = freq_map.get(repeat)
        if freq:
            event_body["recurrence"] = [f"RRULE:FREQ={freq}"]

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
# Google Calendar 이벤트 수정
#  - /api/google-events/<event_id>/update/
# -------------------------------------------------------------------
@csrf_exempt
@require_POST
def update_google_event(request, event_id):
    """
    /api/google-events/<event_id>/update/ 로 들어오는 수정 요청 처리
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
    repeat = data.get("repeat", "none")

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

    # 반복 규칙 추가
    if repeat and repeat != "none":
        freq_map = {
            "daily": "DAILY",
            "weekly": "WEEKLY",
            "monthly": "MONTHLY",
            "yearly": "YEARLY",
        }
        freq = freq_map.get(repeat)
        if freq:
            event_body["recurrence"] = [f"RRULE:FREQ={freq}"]

    try:
        updated_event = service.events().update(
            calendarId="primary",
            eventId=event_id,
            body=event_body,
        ).execute()
    except Exception as e:
        return JsonResponse(
            {"error": "google_api_error", "detail": str(e)},
            status=500,
        )

    return JsonResponse(
        {
            "id": updated_event.get("id"),
            "status": updated_event.get("status"),
        }
    )


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
