from django.db import models

from assets.models import Device


class DataSource(models.Model):
    class SourceType(models.TextChoices):
        MQTT = "mqtt", "MQTT"
        DB = "db", "数据库"

    source_id = models.CharField(max_length=64, unique=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="sources")
    name = models.CharField(max_length=128)
    source_type = models.CharField(max_length=16, choices=SourceType.choices, default=SourceType.MQTT)
    topic_route = models.CharField(max_length=255, blank=True)
    is_running = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_id"]),
            models.Index(fields=["device", "source_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_id} ({self.name})"


class SignalSnapshot(models.Model):
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="snapshots")
    captured_at = models.DateTimeField()
    waveform = models.JSONField(default=list)
    fft = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-captured_at"]
        indexes = [
            models.Index(fields=["source", "captured_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.source.source_id} @ {self.captured_at.isoformat()}"

# Create your models here.
