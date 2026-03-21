from django.contrib import admin

from .models import FeaturePoint, ProcessingConfig


@admin.register(ProcessingConfig)
class ProcessingConfigAdmin(admin.ModelAdmin):
    list_display = ("id", "device", "window_size", "algorithm", "remove_anomaly", "calc_features", "updated_at")
    list_filter = ("algorithm", "remove_anomaly", "calc_features")


@admin.register(FeaturePoint)
class FeaturePointAdmin(admin.ModelAdmin):
    list_display = ("device", "feature", "timestamp", "raw_value", "denoised_value")
    search_fields = ("device__id", "feature")
    list_filter = ("feature",)
