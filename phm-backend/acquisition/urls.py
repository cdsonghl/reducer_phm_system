from django.urls import path

from .views import FftView, SourceDeleteView, SourceListCreateView, WaveformView

urlpatterns = [
    path("devices/<str:device_id>/sources/", SourceListCreateView.as_view(), name="acq-source-list"),
    path("sources/<str:source_id>/", SourceDeleteView.as_view(), name="acq-source-delete"),
    path("signals/<str:source_id>/waveform/", WaveformView.as_view(), name="acq-waveform"),
    path("signals/<str:source_id>/fft/", FftView.as_view(), name="acq-fft"),
]
