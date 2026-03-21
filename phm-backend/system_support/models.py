from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=64, unique=True)
    permissions_desc = models.CharField(max_length=255)
    is_builtin = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class IntegrationConfig(models.Model):
    key = models.CharField(max_length=64, unique=True)
    value = models.TextField()
    description = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return self.key

# Create your models here.
