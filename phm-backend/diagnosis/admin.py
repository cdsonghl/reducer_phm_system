from django.contrib import admin

from .models import DiagnosisModel, DiagnosisResult, DiagnosisTask


@admin.register(DiagnosisModel)
class DiagnosisModelAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "version", "status", "source", "updated_at")
    search_fields = ("name", "source")
    list_filter = ("status",)


@admin.register(DiagnosisTask)
class DiagnosisTaskAdmin(admin.ModelAdmin):
    list_display = ("task_id", "device", "model", "status", "created_at", "completed_at")
    search_fields = ("task_id", "device__id")
    list_filter = ("status",)


@admin.register(DiagnosisResult)
class DiagnosisResultAdmin(admin.ModelAdmin):
    list_display = ("task", "fault_component", "severity", "confidence", "created_at")
    search_fields = ("task__task_id", "fault_component")
