from django.contrib import admin

from .models import IntegrationConfig, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "permissions_desc", "is_builtin", "created_at")
    search_fields = ("name", "permissions_desc")


@admin.register(IntegrationConfig)
class IntegrationConfigAdmin(admin.ModelAdmin):
    list_display = ("key", "value", "updated_at")
    search_fields = ("key", "value")
