# apps/core/context_processors.py

from datetime import date
from apps.meetings.models import Meeting


def today_meetings(request):
    """
    모든 템플릿에서 'today_meetings'로
    meet_date_time 기준 '오늘 날짜'인 회의 목록에 접근할 수 있게 해주는 컨텍스트 프로세서
    """
    today = date.today()

    meetings = (
        Meeting.objects
        .filter(meet_date_time__date=today)
        .select_related("host")
        .order_by("meet_date_time")
    )

    return {
        "today_meetings": meetings
    }
