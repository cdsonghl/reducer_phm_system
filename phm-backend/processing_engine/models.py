from django.db import models

from assets.models import Device


class ProcessingConfig(models.Model):
    class Algorithm(models.TextChoices):
        MA = "ma", "滑动平均法"
        SG = "sg", "Savitzky-Golay"
        SVD = "svd", "奇异值分解"
        WAVELET = "wavelet", "小波去噪"
        EMD = "emd", "经验模态分解"
        EEMD = "eemd", "集成经验模态分解"

    device = models.OneToOneField(
        Device,
        on_delete=models.CASCADE,
        related_name="processing_config",
        null=True,
        blank=True,
    )
    window_size = models.PositiveIntegerField(default=1024)
    algorithm = models.CharField(max_length=16, choices=Algorithm.choices, default=Algorithm.WAVELET)
    remove_anomaly = models.BooleanField(default=True)
    calc_features = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        owner = self.device_id if self.device_id else "GLOBAL"
        return f"Config({owner})"


class FeaturePoint(models.Model):
    class FeatureKey(models.TextChoices):
        RMS = "rms", "RMS"
        P2P = "p2p", "峰峰值"
        ENERGY = "energy", "绝对能量"

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="feature_points")
    feature = models.CharField(max_length=16, choices=FeatureKey.choices)
    timestamp = models.DateTimeField()
    raw_value = models.FloatField()
    denoised_value = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]
        indexes = [
            models.Index(fields=["device", "feature", "timestamp"]),
        ]

    def __str__(self) -> str:
        return f"{self.device_id}:{self.feature}@{self.timestamp.isoformat()}"

# Create your models here.
