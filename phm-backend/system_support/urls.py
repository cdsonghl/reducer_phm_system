from django.urls import path

from .views import IntegrationConfigView, RoleListView

urlpatterns = [
    path("roles/", RoleListView.as_view(), name="system-roles"),
    path("integrations/", IntegrationConfigView.as_view(), name="system-integrations"),
]
