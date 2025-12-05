from django.db import models
from apps.accounts.models import User


class GoogleCalendarToken(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="google_calendar_token",
    )
    token_json = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "google_calendar_token"

    def __str__(self):
        return f"GoogleToken({self.user.user_id})"
