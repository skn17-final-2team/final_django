import json
from google.oauth2.credentials import Credentials
from django.conf import settings
from apps.google_calendar.models import GoogleCalendarToken


def get_google_credentials(request):
    # 1) 세션에 있으면 바로 사용
    token_json = request.session.get("google_credentials")
    if token_json:
        info = json.loads(token_json)
        return Credentials.from_authorized_user_info(
            info, settings.GOOGLE_OAUTH2_SCOPES
        )

    # 2) 로그인 유저 가져오기
    user_id = request.session.get("login_user_id")
    if not user_id:
        return None

    # 3) DB에서 토큰 조회
    try:
        token_obj = GoogleCalendarToken.objects.get(user_id=user_id)
    except GoogleCalendarToken.DoesNotExist:
        return None

    # DB 토큰을 세션에 넣어두기 (다음 API 호출 빠르게)
    request.session["google_credentials"] = token_obj.token_json

    info = json.loads(token_obj.token_json)
    return Credentials.from_authorized_user_info(
        info, settings.GOOGLE_OAUTH2_SCOPES
    )
