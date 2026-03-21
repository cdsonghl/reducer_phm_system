import uuid

from django.db import models

from assets.models import Device
from health.models import HealthAlert


def generate_task_id() -> str:
    return f"diag-{uuid.uuid4().hex[:12]}"


class DiagnosisModel(models.Model):
    class ModelStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        STANDBY = "standby", "Standby"

    name = models.CharField(max_length=128, unique=True)
    version = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=ModelStatus.choices, default=ModelStatus.STANDBY)
    source = models.CharField(max_length=64, default="官方内置")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name}({self.version})"


class DiagnosisTask(models.Model):
    class TaskStatus(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    task_id = models.CharField(max_length=64, unique=True, default=generate_task_id)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True, related_name="diagnosis_tasks")
    alert = models.ForeignKey(HealthAlert, on_delete=models.SET_NULL, null=True, blank=True, related_name="diagnosis_tasks")
    model = models.ForeignKey(DiagnosisModel, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks")
    status = models.CharField(max_length=16, choices=TaskStatus.choices, default=TaskStatus.QUEUED)
    requested_by = models.CharField(max_length=64, blank=True)
    requested_payload = models.JSONField(default=dict)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["task_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return self.task_id


class DiagnosisResult(models.Model):
    task = models.OneToOneField(DiagnosisTask, on_delete=models.CASCADE, related_name="result")
    fault_component = models.CharField(max_length=128)
    severity = models.CharField(max_length=32)
    confidence = models.FloatField()
    suggestion = models.TextField()
    raw_output = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.task.task_id}:{self.fault_component}"

# Create your models here.
