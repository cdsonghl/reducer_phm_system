import math
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from assets.models import Device
from assets.seed import ensure_seed_devices

from .models import DataSource, SignalSnapshot
from .serializers import DataSourceCreateSerializer, DataSourceSerializer


def ensure_seed_sources() -> None:
    ensure_seed_devices()
    if DataSource.objects.exists():
        return
    devices = {d.id: d for d in Device.objects.all()}
    if "A-001" in devices:
        DataSource.objects.get_or_create(
            source_id="s1",
            defaults={
                "device": devices["A-001"],
                "name": "MQTT 流: X轴振动加速度",
                "source_type": DataSource.SourceType.MQTT,
                "topic_route": "factory/a1/vib/x",
                "is_running": True,
            },
        )
        DataSource.objects.get_or_create(
            source_id="s2",
            defaults={
                "device": devices["A-001"],
                "name": "MQTT 流: 油温传感器 PT100",
                "source_type": DataSource.SourceType.MQTT,
                "topic_route": "factory/a1/temp/oil",
                "is_running": True,
            },
        )
    if "B-002" in devices:
        DataSource.objects.get_or_create(
            source_id="s3",
            defaults={
                "device": devices["B-002"],
                "name": "本地历史库: Y轴冲击包络段",
                "source_type": DataSource.SourceType.DB,
                "topic_route": "history/b2/y-envelope",
                "is_running": False,
            },
        )


def build_signal_points(source_id: str) -> tuple[list[dict], list[dict]]:
    now = timezone.now()
    waveform = []
    fft = []
    freq_base = 80 if source_id == "s1" else 5 if source_id == "s2" else 120
    for i in range(64):
        ts = now - timedelta(milliseconds=(63 - i) * 50)
        value = (
            math.sin(2 * math.pi * freq_base * i / 1000)
            + 0.35 * math.sin(2 * math.pi * (freq_base * 3) * i / 1000)
        )
        waveform.append({"time": ts.isoformat(), "value": round(value, 4)})
    for i in range(40):
        freq = i * 10
        amp = 0.05 + (1.6 if abs(freq - freq_base) < 5 else 0.15 * math.sin(i / 2))
        fft.append({"freq": freq, "amp": round(max(0.0, amp), 4)})
    return waveform, fft


class SourceListCreateView(APIView):
    def get(self, request, device_id: str):
        ensure_seed_sources()
        if not Device.objects.filter(pk=device_id).exists():
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        queryset = DataSource.objects.filter(device_id=device_id)
        serializer = DataSourceSerializer(queryset, many=True)
        return Response({"device_id": device_id, "items": serializer.data, "count": queryset.count()})

    def post(self, request, device_id: str):
        try:
            device = Device.objects.get(pk=device_id)
        except Device.DoesNotExist:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DataSourceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(device=device)
        return Response(DataSourceSerializer(obj).data, status=status.HTTP_201_CREATED)


class SourceDeleteView(APIView):
    def delete(self, request, source_id: str):
        try:
            source = DataSource.objects.get(source_id=source_id)
        except DataSource.DoesNotExist:
            return Response({"detail": "Source not found."}, status=status.HTTP_404_NOT_FOUND)
        source.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WaveformView(APIView):
    def get(self, request, source_id: str):
        try:
            source = DataSource.objects.get(source_id=source_id)
        except DataSource.DoesNotExist:
            return Response({"detail": "Source not found."}, status=status.HTTP_404_NOT_FOUND)
        snapshot = source.snapshots.order_by("-captured_at").first()
        if snapshot is None:
            waveform, fft = build_signal_points(source.source_id)
            snapshot = SignalSnapshot.objects.create(
                source=source,
                captured_at=timezone.now(),
                waveform=waveform,
                fft=fft,
            )
        return Response({"source_id": source_id, "points": snapshot.waveform})


class FftView(APIView):
    def get(self, request, source_id: str):
        try:
            source = DataSource.objects.get(source_id=source_id)
        except DataSource.DoesNotExist:
            return Response({"detail": "Source not found."}, status=status.HTTP_404_NOT_FOUND)
        snapshot = source.snapshots.order_by("-captured_at").first()
        if snapshot is None:
            waveform, fft = build_signal_points(source.source_id)
            snapshot = SignalSnapshot.objects.create(
                source=source,
                captured_at=timezone.now(),
                waveform=waveform,
                fft=fft,
            )
        return Response({"source_id": source_id, "bins": snapshot.fft})

# Create your views here.
