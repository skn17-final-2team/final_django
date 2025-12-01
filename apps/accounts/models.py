from django.db import models


class Dept(models.Model):
    dept_id = models.AutoField(primary_key=True)
    dept_name = models.CharField(max_length=40)

    class Meta:
        db_table = "dept_tbl"

    def __str__(self):
        return self.dept_name

class User(models.Model):
    user_id = models.CharField(max_length=20, primary_key=True)

    dept = models.ForeignKey(
        Dept,
        on_delete=models.PROTECT,
        related_name="users",
    )

    name = models.CharField(max_length=100)
    password = models.CharField(max_length=128)
    work_part = models.CharField(max_length=50)
    birth_date = models.DateField()
    status = models.CharField(max_length=1)
    admin_yn = models.BooleanField()
    delete_at = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "user_tbl"

    def __str__(self):
        return f"{self.user_id} / {self.name}"
