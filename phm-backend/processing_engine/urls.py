from django.urls import path

from .views import FeatureStreamView, ProcessingConfigView

urlpatterns = [
    path("config/", ProcessingConfigView.as_view(), name="proc-config"),
    path("features/stream/", FeatureStreamView.as_view(), name="proc-feature-stream"),
]
