from django.db import models


class Device(models.Model):
    class DeviceStatus(models.TextChoices):
        ONLINE = "online", "在线"
        OFFLINE = "offline", "离线"
        STANDBY = "standby", "待机"

    id = models.CharField(max_length=32, primary_key=True)
    device_sn = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    model_type = models.CharField(max_length=128)
    location = models.CharField(max_length=128)
    status = models.CharField(
        max_length=16,
        choices=DeviceStatus.choices,
        default=DeviceStatus.ONLINE,
    )
    last_maintenance = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["device_sn"]),
        ]

    def __str__(self) -> str:
        return f"{self.id} - {self.name}"

# Create your models here.
