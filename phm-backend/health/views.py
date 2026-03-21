from datetime import date, datetime, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from assets.models import Device
from assets.seed import ensure_seed_devices

from .models import HealthAlert, HealthMetric


def ensure_seed_health_data(device: Device) -> None:
    if not HealthMetric.objects.filter(device=device).exists():
        start = date(2025, 7, 1)
        metrics = []
        base = 100.0 if device.id == "A-001" else 88.0
        for i in range(20):
            day = start + timedelta(days=i * 10)
            measured_at = timezone.make_aware(datetime.combine(day, time(9, 0)))
            metrics.append(
                HealthMetric(
                    device=device,
                    measured_at=measured_at,
                    value=round(max(0.0, base - i * 2.7), 1),
                    source_feature="jpcced",
                )
            )
        HealthMetric.objects.bulk_create(metrics)

    if not HealthAlert.objects.filter(device=device).exists():
        seed = [
            (
                "2026-02-09 15:37:17",
                "Z轴振动信号异常",
                HealthAlert.AlertLevel.CRITICAL,
                "输入轴轴承故障（GALN算法）",
            ),
            (
                "2025-07-10 10:22:15",
                "X轴振动信号异常",
                HealthAlert.AlertLevel.WARNING,
                "二级大齿轮点蚀（GALN算法）",
            ),
        ]
        for alert_time, rule, level, desc in seed:
            dt = timezone.make_aware(datetime.strptime(alert_time, "%Y-%m-%d %H:%M:%S"))
            HealthAlert.objects.create(
                device=device,
                alert_time=dt,
                rule=rule,
                level=level,
                description=desc,
            )


class HealthTrendView(APIView):
    def get(self, request):
        ensure_seed_devices()
        device_id = request.query_params.get("device_id", "A-001")
        device = Device.objects.filter(pk=device_id).first()
        if device is None:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        ensure_seed_health_data(device)
        queryset = HealthMetric.objects.filter(device=device).order_by("measured_at")
        points = [{"date": m.measured_at.date().isoformat(), "value": m.value} for m in queryset]
        return Response({"device_id": device_id, "points": points})


class HealthAlertView(APIView):
    def get(self, request):
        ensure_seed_devices()
        device_id = request.query_params.get("device_id", "A-001")
        device = Device.objects.filter(pk=device_id).first()
        if device is None:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        ensure_seed_health_data(device)

        queryset = HealthAlert.objects.filter(device=device).order_by("-alert_time")
        level = request.query_params.get("level")
        if level:
            queryset = queryset.filter(level=level)

        items = [
            {
                "id": alert.id,
                "time": alert.alert_time.strftime("%Y-%m-%d %H:%M:%S"),
                "rule": alert.rule,
                "level": alert.get_level_display(),
                "desc": alert.description,
                "level_code": alert.level,
            }
            for alert in queryset
        ]
        return Response({"device_id": device_id, "items": items, "count": queryset.count()})
