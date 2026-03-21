from django.urls import include, path
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class ApiRootView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "service": "phm-backend",
                "status": "ok",
                "version": "0.1.0",
                "modules": [
                    "assets",
                    "acquisition",
                    "processing_engine",
                    "health",
                    "diagnosis",
                    "system_support",
                ],
            }
        )


class AuthMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "is_superuser": user.is_superuser,
                "is_staff": user.is_staff,
            }
        )


urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("assets/", include("assets.urls")),
    path("acquisition/", include("acquisition.urls")),
    path("processing/", include("processing_engine.urls")),
    path("health/", include("health.urls")),
    path("diagnosis/", include("diagnosis.urls")),
    path("system/", include("system_support.urls")),
]
