from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from assets.models import Device
from assets.seed import ensure_seed_devices
from health.models import HealthAlert

from .models import DiagnosisModel, DiagnosisResult, DiagnosisTask
from .serializers import DiagnosisModelSerializer


def ensure_seed_models() -> None:
    if DiagnosisModel.objects.exists():
        return
    DiagnosisModel.objects.bulk_create(
        [
            DiagnosisModel(
                name="高斯注意力机制轻量化网络",
                version="v1.2.0",
                status=DiagnosisModel.ModelStatus.STANDBY,
                source="官方内置",
                description="默认推荐模型",
            ),
            DiagnosisModel(
                name="DCNN_ResNet50_Custom",
                version="v0.9.1-beta",
                status=DiagnosisModel.ModelStatus.STANDBY,
                source="用户二次开发(MCP上传)",
                description="用户可扩展模型",
            ),
        ]
    )


class ModelListCreateView(APIView):
    def get(self, request):
        ensure_seed_models()
        queryset = DiagnosisModel.objects.all().order_by("id")
        serializer = DiagnosisModelSerializer(queryset, many=True)
        return Response({"items": serializer.data, "count": queryset.count()})

    def post(self, request):
        serializer = DiagnosisModelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        model = serializer.save()
        return Response(DiagnosisModelSerializer(model).data, status=status.HTTP_201_CREATED)


class ModelActivateView(APIView):
    def post(self, request, model_id: str):
        ensure_seed_models()
        try:
            model = DiagnosisModel.objects.get(pk=model_id)
        except DiagnosisModel.DoesNotExist:
            return Response({"detail": "Model not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            DiagnosisModel.objects.exclude(pk=model.pk).update(status=DiagnosisModel.ModelStatus.STANDBY)
            model.status = DiagnosisModel.ModelStatus.ACTIVE
            model.save(update_fields=["status", "updated_at"])
        return Response(DiagnosisModelSerializer(model).data)


class DiagnosisRunView(APIView):
    def post(self, request):
        ensure_seed_devices()
        ensure_seed_models()

        model_id = request.data.get("model_id")
        device_id = request.data.get("device_id")
        alert_id = request.data.get("alert_id")
        requested_by = request.data.get("requested_by", "api-user")

        if model_id:
            model = DiagnosisModel.objects.filter(pk=model_id).first()
        else:
            model = DiagnosisModel.objects.filter(status=DiagnosisModel.ModelStatus.ACTIVE).first()
            if model is None:
                model = DiagnosisModel.objects.first()

        if model is None:
            return Response({"detail": "No diagnosis model available."}, status=status.HTTP_400_BAD_REQUEST)

        device = Device.objects.filter(pk=device_id).first() if device_id else None
        alert = HealthAlert.objects.filter(pk=alert_id).first() if alert_id else None
        if device is None and alert is not None:
            device = alert.device
        if device is None:
            device = Device.objects.first()

        now = timezone.now()
        with transaction.atomic():
            task = DiagnosisTask.objects.create(
                device=device,
                alert=alert,
                model=model,
                status=DiagnosisTask.TaskStatus.RUNNING,
                requested_by=requested_by,
                requested_payload=request.data,
                started_at=now,
            )

            if device and device.id == "B-002":
                component = "一级小齿轮"
                confidence = 0.942
                suggestion = "建议安排停机检查一级小齿轮齿面并准备备件。"
            else:
                component = "输入轴轴承"
                confidence = 0.963
                suggestion = "建议开盖检查并结合油液铁谱进行复核。"

            result = DiagnosisResult.objects.create(
                task=task,
                fault_component=component,
                severity="严重",
                confidence=confidence,
                suggestion=suggestion,
                raw_output={
                    "model": model.name,
                    "device_id": device.id if device else None,
                },
            )

            task.status = DiagnosisTask.TaskStatus.COMPLETED
            task.completed_at = timezone.now()
            task.save(update_fields=["status", "completed_at", "updated_at"])

        return Response(
            {
                "task_id": task.task_id,
                "status": task.status,
                "result": {
                    "fault_component": result.fault_component,
                    "severity": result.severity,
                    "confidence": result.confidence,
                    "suggestion": result.suggestion,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class DiagnosisResultView(APIView):
    def get(self, request, task_id: str):
        task = DiagnosisTask.objects.filter(task_id=task_id).select_related("result", "model", "device").first()
        if task is None:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        result = getattr(task, "result", None)
        return Response(
            {
                "task_id": task.task_id,
                "status": task.status,
                "device_id": task.device_id,
                "model": task.model.name if task.model else None,
                "result": None
                if result is None
                else {
                    "fault_component": result.fault_component,
                    "severity": result.severity,
                    "confidence": result.confidence,
                    "suggestion": result.suggestion,
                },
            }
        )
