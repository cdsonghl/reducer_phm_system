from rest_framework import serializers

from .models import IntegrationConfig, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "permissions_desc", "is_builtin", "created_at"]


class IntegrationConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationConfig
        fields = ["id", "key", "value", "description", "updated_at"]
