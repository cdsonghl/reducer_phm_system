from django.urls import path

from .views import DeviceDetailView, DeviceListCreateView

urlpatterns = [
    path("devices/", DeviceListCreateView.as_view(), name="assets-device-list"),
    path("devices/<str:device_id>/", DeviceDetailView.as_view(), name="assets-device-detail"),
]
