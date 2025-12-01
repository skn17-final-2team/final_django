from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.hashers import check_password
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