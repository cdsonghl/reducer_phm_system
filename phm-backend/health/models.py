from django.db import models

from assets.models import Device


class HealthMetric(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="health_metrics")
    measured_at = models.DateTimeField()
    value = models.FloatField()
    source_feature = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["measured_at"]
        indexes = [
            models.Index(fields=["device", "measured_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.device_id}@{self.measured_at.isoformat()}={self.value}"


class HealthAlert(models.Model):
    class AlertLevel(models.TextChoices):
        INFO = "info", "提示"
        WARNING = "warning", "警告"
        CRITICAL = "critical", "严重"

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="health_alerts")
    alert_time = models.DateTimeField()
    rule = models.CharField(max_length=128)
    level = models.CharField(max_length=16, choices=AlertLevel.choices, default=AlertLevel.INFO)
    description = models.TextField()
    is_ack = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-alert_time"]
        indexes = [
            models.Index(fields=["device", "alert_time"]),
            models.Index(fields=["level"]),
        ]

    def __str__(self) -> str:
        return f"{self.device_id}:{self.get_level_display()}@{self.alert_time.isoformat()}"

# Create your models here.
