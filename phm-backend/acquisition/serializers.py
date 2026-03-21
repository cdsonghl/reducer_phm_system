import uuid

from rest_framework import serializers

from .models import DataSource, SignalSnapshot


class DataSourceSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="source_type", read_only=True)

    class Meta:
        model = DataSource
        fields = [
            "source_id",
            "device",
            "name",
            "source_type",
            "type",
            "topic_route",
            "is_running",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DataSourceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = ["source_id", "name", "source_type", "topic_route", "is_running"]
        extra_kwargs = {
            "source_id": {"required": False, "allow_blank": True},
            "topic_route": {"required": False, "allow_blank": True},
            "is_running": {"required": False},
        }

    def validate_source_id(self, value):
        if DataSource.objects.filter(source_id=value).exists():
            raise serializers.ValidationError("source_id already exists.")
        return value

    def create(self, validated_data):
        if not validated_data.get("source_id"):
            validated_data["source_id"] = f"s_{uuid.uuid4().hex[:8]}"
        return super().create(validated_data)


class SignalSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignalSnapshot
        fields = ["source", "captured_at", "waveform", "fft", "created_at"]
