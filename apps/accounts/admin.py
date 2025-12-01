from django.contrib import admin
from .models import Dept, User

@admin.register(Dept)
class DeptAdmin(admin.ModelAdmin):
    list_display = ("dept_id", "dept_name")
    search_fields = ("dept_name",)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("user_id", "name", "dept", "status", "admin_yn")
    list_filter = ("dept", "status", "admin_yn")
    search_fields = ("user_id", "name")
