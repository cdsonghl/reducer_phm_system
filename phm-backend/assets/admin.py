from django.contrib import admin

from .models import Device


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("id", "device_sn", "name", "status", "location", "last_maintenance")
    search_fields = ("id", "device_sn", "name")
    list_filter = ("status",)
