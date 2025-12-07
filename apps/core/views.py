from django.shortcuts import redirect
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator

from apps.accounts.models import User, Dept
from datetime import date

class LoginRequiredSessionMixin:
    login_url = "/accounts/login/"

    @method_decorator(never_cache)
    def dispatch(self, request, *args, **kwargs):
        if not request.session.get("login_user_id"):
            return redirect(self.login_url)
        return super().dispatch(request, *args, **kwargs)

class HomeView(LoginRequiredSessionMixin, TemplateView):
    template_name = "core/home.html"

class AdminHomeView(TemplateView):
    template_name = "core/admin_home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["departments"] = Dept.objects.all().order_by("dept_name")
        # 나중에 가운데 테이블용 직원 목록도 여기서 넘길 예정
        return context