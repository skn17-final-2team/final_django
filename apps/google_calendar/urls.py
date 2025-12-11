from django.urls import path
from . import views

urlpatterns = [
    path("google/login/", views.google_login, name="google_login"),
    path("oauth2callback/", views.oauth2callback, name="oauth2callback"),
    path("api/google-events/", views.google_events, name="google_events"),
    path("api/google-events/create/", views.create_google_event, name="create_google_event"),
    path("api/google-events/<str:event_id>/update/", views.update_google_event, name="update_google_event"),
    path("api/google-events/<str:event_id>/delete/", views.google_events_delete, name="google_events_delete",),
    path("api/google-auth-status/", views.google_auth_status, name="google_auth_status"),
]
