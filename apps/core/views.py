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


class MeetingListAllView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_all.html"


class MeetingListMineView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_mine.html"


class MeetingListOpenView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_open.html"


class MeetingCreateView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_create.html"