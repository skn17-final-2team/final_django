from django.shortcuts import render, redirect
from django.views.generic import TemplateView

class LoginRequiredSessionMixin:
    login_url = "/accounts/login/"

    def dispatch(self, request, *args, **kwargs):
        if not request.session.get("login_user_id"):
            return redirect(self.login_url)
        return super().dispatch(request, *args, **kwargs)


class HomeView(LoginRequiredSessionMixin, TemplateView):
    template_name = "core/home.html"


