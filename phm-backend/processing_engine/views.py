from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from assets.models import Device
from assets.seed import ensure_seed_devices

from .models import FeaturePoint, ProcessingConfig
from .serializers import ProcessingConfigSerializer


class ProcessingConfigView(APIView):
    def get(self, request):
        ensure_seed_devices()
        device_id = request.query_params.get("device_id")
        device = None
        if device_id:
            device = Device.objects.filter(pk=device_id).first()
            if device is None:
                return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        config, _ = ProcessingConfig.objects.get_or_create(
            device=device,
            defaults={
                "window_size": 1024,
                "algorithm": ProcessingConfig.Algorithm.WAVELET,
                "remove_anomaly": True,
                "calc_features": True,
            },
        )
        return Response(ProcessingConfigSerializer(config).data)

    def put(self, request):
        ensure_seed_devices()
        device_id = request.query_params.get("device_id")
        device = None
        if device_id:
            device = Device.objects.filter(pk=device_id).first()
            if device is None:
                return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        config, _ = ProcessingConfig.objects.get_or_create(
            device=device,
            defaults={
                "window_size": 1024,
                "algorithm": ProcessingConfig.Algorithm.WAVELET,
                "remove_anomaly": True,
                "calc_features": True,
            },
        )
        serializer = ProcessingConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FeatureStreamView(APIView):
    def get(self, request):
        ensure_seed_devices()
        feature = request.query_params.get("feature", "rms")
        device_id = request.query_params.get("device_id", "A-001")
        device = Device.objects.filter(pk=device_id).first()
        if device is None:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)

        queryset = FeaturePoint.objects.filter(device=device, feature=feature).order_by("timestamp")
        if not queryset.exists():
            now = timezone.now()
            bulk = []
            for i in range(20):
                ts = now - timedelta(seconds=(19 - i) * 2)
                bulk.append(
                    FeaturePoint(
                        device=device,
                        feature=feature,
                        timestamp=ts,
                        raw_value=round(0.7 + i * 0.012, 4),
                        denoised_value=round(0.68 + i * 0.01, 4),
                    )
                )
            FeaturePoint.objects.bulk_create(bulk)
            queryset = FeaturePoint.objects.filter(device=device, feature=feature).order_by("timestamp")

        latest_points = list(queryset.order_by("-timestamp")[:60])
        latest_points.reverse()
        points = [
            {"time": p.timestamp.isoformat(), "raw": p.raw_value, "denoised": p.denoised_value}
            for p in latest_points
        ]
        return Response({"device_id": device_id, "feature": feature, "points": points})
