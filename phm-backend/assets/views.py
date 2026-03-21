from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Device
from .seed import ensure_seed_devices
from .serializers import DeviceSerializer


class DeviceListCreateView(APIView):
    def get(self, request):
        ensure_seed_devices()
        queryset = Device.objects.all()
        q = request.query_params.get("q")
        if q:
            queryset = queryset.filter(Q(name__icontains=q) | Q(device_sn__icontains=q))
        serializer = DeviceSerializer(queryset, many=True)
        return Response({"items": serializer.data, "count": queryset.count()})

    def post(self, request):
        serializer = DeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DeviceDetailView(APIView):
    def get(self, request, device_id: str):
        ensure_seed_devices()
        try:
            device = Device.objects.get(pk=device_id)
        except Device.DoesNotExist:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DeviceSerializer(device).data)

    def patch(self, request, device_id: str):
        try:
            device = Device.objects.get(pk=device_id)
        except Device.DoesNotExist:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DeviceSerializer(device, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

# Create your views here.
