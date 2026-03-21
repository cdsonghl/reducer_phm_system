from django.contrib import admin

from .models import DataSource, SignalSnapshot


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ("source_id", "device", "name", "source_type", "is_running", "updated_at")
    search_fields = ("source_id", "name", "device__id")
    list_filter = ("source_type", "is_running")


@admin.register(SignalSnapshot)
class SignalSnapshotAdmin(admin.ModelAdmin):
    list_display = ("source", "captured_at", "created_at")
    search_fields = ("source__source_id", "source__name")
