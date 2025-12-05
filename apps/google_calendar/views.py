import os
import json
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

from apps.accounts.models import User

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from apps.google_calendar.models import GoogleCalendarToken
from apps.google_calendar.utils import get_google_credentials

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

    GoogleCalendarToken.objects.update_or_create(
        user=user,
        defaults={"token_json": token_json},
    )

    request.session["google_credentials"] = token_json

    return redirect("/")

# 구글 캘린더 전체 일정을 JSON으로 반환
def google_events_json(request):

    creds_data = request.session.get("google_credentials")
    if not creds_data:
        return JsonResponse({"error": "not_authenticated"}, status=401)

    creds = Credentials(**creds_data)
    service = build("calendar", "v3", credentials=creds)

    time_min = "2000-01-01T00:00:00Z"
    time_max = "2100-01-01T00:00:00Z"

    all_items = []
    page_token = None

    while True:
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                maxResults=2500,
                singleEvents=True,
                orderBy="startTime",
                pageToken=page_token,
            )
            .execute()
        )

        for e in events_result.get("items", []):
            start = e["start"].get("dateTime", e["start"].get("date"))
            end = e["end"].get("dateTime", e["end"].get("date"))

            all_items.append(
                {
                    "id": e.get("id"),
                    "title": e.get("summary", "(제목 없음)"),
                    "start": start,
                    "end": end,
                }
            )

        page_token = events_result.get("nextPageToken")
        if not page_token:
            break

    return JsonResponse(all_items, safe=False)


@csrf_exempt  # 개발용. 나중에 CSRF 토큰 처리로 바꿈
@require_POST
def create_google_event(request):   # 홈 화면에서 보낸 일정 데이터를 사용자의 Google Calendar에 생성

    creds_data = request.session.get("google_credentials")
    if not creds_data:
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

    creds = Credentials(**creds_data)
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
        created_event = (
            service.events()
            .insert(calendarId="primary", body=event_body)
            .execute()
        )
    except Exception as e:
        return JsonResponse(
            {"error": "google_api_error", "detail": str(e)}, status=500
        )

    return JsonResponse(
        {
            "id": created_event.get("id"),
            "status": created_event.get("status"),
        }
    )

# 세션에 구글 인증 정보가 있는지 확인
def google_auth_status(request):
    
    is_auth = "google_credentials" in request.session
    return JsonResponse({"authenticated": is_auth})

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
        events.append({
            "id": e["id"],
            "title": e.get("summary", ""),
            "start": e["start"].get("dateTime") or e["start"].get("date"),
            "end": e["end"].get("dateTime") or e["end"].get("date"),
        })

    return JsonResponse(events, safe=False)

def create_google_event(request):
    creds = get_google_credentials(request)
    if not creds:
        return JsonResponse({"error": "not_authenticated"}, status=401)

    data = json.loads(request.body)
    title = data.get("title")
    start = data.get("start")
    end = data.get("end")
    description = data.get("description")

    service = build("calendar", "v3", credentials=creds)

    event_body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
    }

    event = service.events().insert(calendarId="primary", body=event_body).execute()

    return JsonResponse({"id": event["id"]})

def google_auth_status(request):
    creds = get_google_credentials(request)
    return JsonResponse({"authenticated": bool(creds)})