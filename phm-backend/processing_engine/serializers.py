from rest_framework import serializers

from .models import FeaturePoint, ProcessingConfig


class ProcessingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingConfig
        fields = [
            "id",
            "device",
            "window_size",
            "algorithm",
            "remove_anomaly",
            "calc_features",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class FeaturePointSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturePoint
        fields = ["device", "feature", "timestamp", "raw_value", "denoised_value"]
