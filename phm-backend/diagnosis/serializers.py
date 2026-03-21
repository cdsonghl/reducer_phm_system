from rest_framework import serializers

from .models import DiagnosisModel, DiagnosisResult, DiagnosisTask


class DiagnosisModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisModel
        fields = ["id", "name", "version", "status", "source", "description", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class DiagnosisTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisTask
        fields = [
            "task_id",
            "device",
            "alert",
            "model",
            "status",
            "requested_by",
            "requested_payload",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DiagnosisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisResult
        fields = [
            "task",
            "fault_component",
            "severity",
            "confidence",
            "suggestion",
            "raw_output",
            "created_at",
        ]
