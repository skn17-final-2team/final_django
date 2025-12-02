from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.hashers import check_password
from django.views.decorators.http import require_POST
from .models import User
from .forms import LoginForm

def login_view(request):
    if request.method == "POST":
        form = LoginForm(request.POST)

        if form.is_valid():
            user_id = form.cleaned_data["user_id"]
            password = form.cleaned_data["password"]

            # DB에서 user 조회
            try:
                user = User.objects.get(user_id=user_id)
            except User.DoesNotExist:
                messages.error(request, "존재하지 않는 아이디입니다.")
                return render(request, "accounts/login.html", {"form": form})

            db_pw = user.password

            if db_pw.startswith("pbkdf2_"):
                pw_ok = check_password(password, db_pw)
            else:
                pw_ok = (password == db_pw)

            if not pw_ok:
                messages.error(request, "비밀번호가 일치하지 않습니다.")
                return render(request, "accounts/login.html", {"form": form})

            # 로그인 성공 처리(세션 저장)
            request.session["login_user_id"] = user.user_id
            request.session["login_user_name"] = user.name

            return redirect("/")  # 로그인 성공 시 홈으로 이동

    else:
        form = LoginForm()

    return render(request, "accounts/login.html", {"form": form})


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

    # 세션 설정
    request.session["login_user_id"] = user.user_id
    request.session["login_user_name"] = user.name

    next_url = request.POST.get("next") or "/"
    return JsonResponse({"ok": True, "redirect_url": next_url})