from django.contrib import admin

from .models import HealthAlert, HealthMetric


@admin.register(HealthMetric)
class HealthMetricAdmin(admin.ModelAdmin):
    list_display = ("device", "measured_at", "value", "source_feature")
    search_fields = ("device__id", "source_feature")


@admin.register(HealthAlert)
class HealthAlertAdmin(admin.ModelAdmin):
    list_display = ("device", "alert_time", "rule", "level", "is_ack")
    search_fields = ("device__id", "rule", "description")
    list_filter = ("level", "is_ack")
