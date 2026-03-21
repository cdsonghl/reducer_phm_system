from rest_framework import serializers

from .models import HealthAlert, HealthMetric


class HealthMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthMetric
        fields = ["device", "measured_at", "value", "source_feature"]


class HealthAlertSerializer(serializers.ModelSerializer):
    level_label = serializers.CharField(source="get_level_display", read_only=True)

    class Meta:
        model = HealthAlert
        fields = [
            "id",
            "device",
            "alert_time",
            "rule",
            "level",
            "level_label",
            "description",
            "is_ack",
        ]
