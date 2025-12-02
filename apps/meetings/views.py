from django.views.generic import TemplateView
from apps.core.views import LoginRequiredSessionMixin

class MeetingListAllView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_all.html"

class MeetingListMineView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_mine.html"

class MeetingListOpenView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_list_open.html"

class MeetingCreateView(LoginRequiredSessionMixin, TemplateView):
    template_name = "meetings/meeting_create.html"
