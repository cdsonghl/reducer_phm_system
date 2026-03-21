from django.urls import path

from .views import DiagnosisResultView, DiagnosisRunView, ModelActivateView, ModelListCreateView

urlpatterns = [
    path("models/", ModelListCreateView.as_view(), name="diag-model-list"),
    path("models/<str:model_id>/activate/", ModelActivateView.as_view(), name="diag-model-activate"),
    path("run/", DiagnosisRunView.as_view(), name="diag-run"),
    path("results/<str:task_id>/", DiagnosisResultView.as_view(), name="diag-result"),
]
