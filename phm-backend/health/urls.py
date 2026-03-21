from django.urls import path

from .views import HealthAlertView, HealthTrendView

urlpatterns = [
    path("trend/", HealthTrendView.as_view(), name="health-trend"),
    path("alerts/", HealthAlertView.as_view(), name="health-alerts"),
]
