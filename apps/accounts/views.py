from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.hashers import check_password, make_password
from django.views.decorators.http import require_POST
from .models import User
from .forms import LoginForm
from django.contrib.auth import logout as django_logout
import re

def login_view(request):
    form = LoginForm()
    return render(request, "users/login.html", {"form": form})


@require_POST
def login_api(request):
    form = LoginForm(request.POST)

    if not form.is_valid():
        return JsonResponse(
            {"ok": False, "errors": form.errors},
            status=400
        )

    user_id = form.cleaned_data["user_id"]
    password = form.cleaned_data["password"]

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return JsonResponse(
            {"ok": False, "errors": {"__all__": ["존재하지 않는 아이디입니다."]}},
            status=400
        )

    # 비밀번호 확인
    db_pw = user.password
    if db_pw.startswith("pbkdf2_"):
        pw_ok = check_password(password, db_pw)
    else:
        pw_ok = (password == db_pw)

    if not pw_ok:
        return JsonResponse(
            {"ok": False, "errors": {"__all__": ["비밀번호가 일치하지 않습니다."]}},
            status=400
        )

    # 비밀번호 정책(8~15자, 영문+숫자) 미충족 시 로그인 막고 변경 플래그 반환
    pw_pattern = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,15}$")
    if not pw_pattern.match(password):
        request.session["login_user_id"] = user.user_id
        request.session["login_user_name"] = user.name
        request.session["login_user_dept_name"] = getattr(user.dept, "dept_name", "")
        request.session["login_user_admin"] = user.admin_yn
        request.session.save()
        return JsonResponse(
            {
                "ok": False,
                "force_change": True,
                "message": "초기 비밀번호를 변경해 주세요.",
            },
            status=400,
        )

    # 세션 설정
    request.session["login_user_id"] = user.user_id
    request.session["login_user_name"] = user.name
    request.session["login_user_dept_name"] = getattr(user.dept, "dept_name", "")
    request.session["login_user_admin"] = user.admin_yn

    # 세션 명시적 저장
    request.session.save()

    print("[DEBUG] 로그인 성공 - 세션:", dict(request.session))

    next_url = request.POST.get("next") or "/"
    return JsonResponse({"ok": True, "redirect_url": next_url})

def logout_view(request):
    # Django auth + 직접 넣은 세션 모두 정리
    request.session.flush()
    return redirect("accounts:login")

@require_POST
def check_old_pw(request):
    """
    기존 비밀번호 실시간 확인용 API
    - ok: true  => 비밀번호 일치
    - ok: false => 비밀번호 불일치 또는 입력 없음
    """
    login_user_id = request.session.get("login_user_id")
    if not login_user_id:
        return JsonResponse({"ok": False}, status=401)

    # 세션에 user.user_id를 넣어두신 구조라면 이렇게 조회
    user = get_object_or_404(User, user_id=login_user_id)

    old_password = request.POST.get("old_password", "").strip()
    if not old_password:
        return JsonResponse({"ok": False}, status=400)

    if check_password(old_password, user.password):
        return JsonResponse({"ok": True})
    else:
        return JsonResponse({"ok": False})

@require_POST
def modify_pw_view(request):
    # 0. 로그인 여부 확인
    login_user_id = request.session.get("login_user_id")
    if not login_user_id:
        return JsonResponse(
            {"ok": False, "field": "common", "message": "로그인이 필요합니다."},
            status=401,
        )

    # 세션에 user.user_id를 넣어 두었다고 가정
    user = get_object_or_404(User, user_id=login_user_id)

    old_password = request.POST.get("old_password", "").strip()
    new_password = request.POST.get("new_password", "").strip()
    new_password2 = request.POST.get("new_password2", "").strip()

    # 1. (방어용) 빈 값 체크 – 프론트에서 이미 막지만 혹시 모를 경우 대비
    if not old_password or not new_password or not new_password2:
        return JsonResponse(
            {
                "ok": False,
                "field": "common",
                "message": "모든 항목을 입력해 주세요.",
            },
            status=400,
        )

    # 2. 비밀번호 정책(8~15자, 영문 + 숫자 포함) 체크
    pw_pattern = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,15}$")
    if not pw_pattern.match(new_password):
        return JsonResponse(
            {
                "ok": False,
                "field": "new_password",
                "message": "비밀번호 형식을 맞추어주세요.",
            },
            status=400,
        )

    # 3. 새 비밀번호 두 칸이 같은지 체크
    if new_password != new_password2:
        return JsonResponse(
            {
                "ok": False,
                "field": "new_password2",
                "message": "비밀번호를 확인해주세요.",
            },
            status=400,
        )

    # 4. 기존 비밀번호가 맞는지 체크
    if not check_password(old_password, user.password):
        return JsonResponse(
            {
                "ok": False,
                "field": "old_password",
                "message": "비밀번호를 확인해주세요.",
            },
            status=400,
        )

    # 5. 새 비밀번호가 기존과 같은지 방지 (선택)
    if check_password(new_password, user.password):
        return JsonResponse(
            {
                "ok": False,
                "field": "new_password",
                "message": "이전에 사용한 비밀번호와 다른 비밀번호를 입력해 주세요.",
            },
            status=400,
        )

    # 6. 실제 비밀번호 변경
    user.password = make_password(new_password)
    user.save()

    return JsonResponse({"ok": True})


@require_POST
def modify_pw_initial(request):
    """
    로그인 시 비밀번호 정책이 맞지 않아 막힌 경우,
    기존 비밀번호 입력 없이 새 비밀번호로만 변경
    """
    login_user_id = request.session.get("login_user_id")
    if not login_user_id:
        return JsonResponse(
            {"ok": False, "field": "common", "message": "로그인이 필요합니다."},
            status=401,
        )

    user = get_object_or_404(User, user_id=login_user_id)

    new_password = request.POST.get("new_password", "").strip()
    new_password2 = request.POST.get("new_password2", "").strip()

    if not new_password or not new_password2:
        return JsonResponse(
            {"ok": False, "field": "common", "message": "모든 항목을 입력해 주세요."},
            status=400,
        )

    pw_pattern = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,15}$")
    if not pw_pattern.match(new_password):
        return JsonResponse(
            {"ok": False, "field": "new_password", "message": "비밀번호 형식을 맞추어주세요."},
            status=400,
        )

    if new_password != new_password2:
        return JsonResponse(
            {"ok": False, "field": "new_password2", "message": "비밀번호를 확인해주세요."},
            status=400,
        )

    # 기존 비밀번호와 동일한지 체크 (평문/해시 모두 대응)
    if check_password(new_password, user.password) or user.password == new_password:
        return JsonResponse(
            {"ok": False, "field": "new_password", "message": "이전에 사용한 비밀번호와 다른 비밀번호를 입력해 주세요."},
            status=400,
        )

    user.password = make_password(new_password)
    user.save()

    return JsonResponse({"ok": True, "redirect_url": "/"})
