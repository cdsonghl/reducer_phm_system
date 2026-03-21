from rest_framework import serializers

from .models import Device


class DeviceSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Device
        fields = [
            "id",
            "device_sn",
            "name",
            "model_type",
            "location",
            "status",
            "status_label",
            "last_maintenance",
            "created_at",
            "updated_at",
        ]
