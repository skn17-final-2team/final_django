import json
from google.oauth2.credentials import Credentials
from django.conf import settings
from apps.google_calendar.models import GoogleCalendarToken


def get_google_credentials(request):
    # 1) 세션에 있으면 바로 사용
    token_json = request.session.get("google_credentials")
    if token_json:
        info = json.loads(token_json)
        creds = Credentials.from_authorized_user_info(
            info, settings.GOOGLE_OAUTH2_SCOPES
        )
        # 토큰이 만료되었거나 유효하지 않으면 None 반환
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # 리프레시 토큰이 있으면 갱신 시도
                try:
                    from google.auth.transport.requests import Request
                    creds.refresh(Request())
                    # 갱신된 토큰을 세션에 저장
                    request.session["google_credentials"] = creds.to_json()
                    # DB에도 저장
                    user_id = request.session.get("login_user_id")
                    if user_id:
                        GoogleCalendarToken.objects.filter(user_id=user_id).update(
                            token_json=creds.to_json()
                        )
                    return creds
                except Exception:
                    # 갱신 실패하면 세션에서 제거
                    request.session.pop("google_credentials", None)
                    return None
            else:
                # 만료되었고 리프레시 토큰이 없으면 세션에서 제거
                request.session.pop("google_credentials", None)
                return None
        return creds

    # 2) 로그인 유저 가져오기
    user_id = request.session.get("login_user_id")
    if not user_id:
        return None

    # 3) DB에서 토큰 조회
    try:
        token_obj = GoogleCalendarToken.objects.get(user_id=user_id)
    except GoogleCalendarToken.DoesNotExist:
        return None

    info = json.loads(token_obj.token_json)
    creds = Credentials.from_authorized_user_info(
        info, settings.GOOGLE_OAUTH2_SCOPES
    )

    # 토큰이 만료되었거나 유효하지 않으면 None 반환
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            # 리프레시 토큰이 있으면 갱신 시도
            try:
                from google.auth.transport.requests import Request
                creds.refresh(Request())
                # 갱신된 토큰을 세션과 DB에 저장
                updated_token = creds.to_json()
                request.session["google_credentials"] = updated_token
                token_obj.token_json = updated_token
                token_obj.save()
                return creds
            except Exception:
                # 갱신 실패하면 DB에서 제거
                token_obj.delete()
                return None
        else:
            # 만료되었고 리프레시 토큰이 없으면 DB에서 제거
            token_obj.delete()
            return None

    # DB 토큰을 세션에 넣어두기
    request.session["google_credentials"] = token_obj.token_json
    return creds
