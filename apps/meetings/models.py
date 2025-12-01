from django.db import models

class Meeting(models.Model):
    # meeting_id INTEGER PK
    meeting_id = models.AutoField(primary_key=True)

    # host_id FK → accounts.User.user_id
    host = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="hosted_meetings",
    )

    transcript = models.TextField()
    title = models.CharField(max_length=90)
    meet_date_time = models.DateTimeField()
    place = models.CharField(max_length=90)

    summary = models.TextField(blank=True)
    meeting_notes = models.TextField(blank=True)
    record_url = models.CharField(max_length=90, blank=True)
    domain_upload = models.BooleanField(default=False)

    class Meta:
        db_table = "meeting_tbl"

    def __str__(self):
        return f"[{self.meet_id}] {self.title}"

class Attendee(models.Model):
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="attendees",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="attendances",
    )

    class Meta:
        db_table = "attendee_tbl"
        unique_together = ("meeting", "user")

    def __str__(self):
        return f"{self.meeting_id} - {self.user_id}"
    
class Task(models.Model):
    task_id = models.AutoField(primary_key=True)

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="tasks",
    )

    # assignee_id FK → User (nullable)
    assignee = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )

    task_content = models.CharField(max_length=90)
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "task_tbl"

    def __str__(self):
        return f"[{self.meeting_id}] {self.task_content}"

class Domain(models.Model):
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="domains",
    )
    domain_name = models.CharField(max_length=16)

    class Meta:
        db_table = "domain"
        unique_together = ("meeting", "domain_name")

    def __str__(self):
        return f"{self.meeting_id} - {self.domain_name}"