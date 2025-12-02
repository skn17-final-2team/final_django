from django.shortcuts import render, redirect
from django.views.generic import TemplateView

class HomeView(TemplateView):
    template_name = "core/base.html"
    
    # 세션 기반 로그인 여부 체크
    def dispatch(self, request, *args, **kwargs):
        if not request.session.get("login_user_id"):
            return redirect("/accounts/login/")
        return super().dispatch(request, *args, **kwargs)