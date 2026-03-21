from rest_framework.response import Response
from rest_framework.views import APIView

from .models import IntegrationConfig, Role


def ensure_seed_system_support() -> None:
    if not Role.objects.exists():
        Role.objects.bulk_create(
            [
                Role(name="Admin", permissions_desc="全局读写与系统重置", is_builtin=True),
                Role(name="Algorithm Expert", permissions_desc="MCP算法上下行与参数控制", is_builtin=True),
                Role(name="Operator", permissions_desc="大屏只读与接转维修工单", is_builtin=True),
            ]
        )
    if not IntegrationConfig.objects.exists():
        IntegrationConfig.objects.bulk_create(
            [
                IntegrationConfig(
                    key="erp_mes_endpoint",
                    value="https://api.factory-erp.internal/v1/sync",
                    description="ERP/MES 外部接口",
                ),
                IntegrationConfig(
                    key="notify_webhook",
                    value="https://oapi.dingtalk.com/robot/send?access_token=...",
                    description="告警通知 Webhook",
                ),
            ]
        )


class RoleListView(APIView):
    def get(self, request):
        ensure_seed_system_support()
        queryset = Role.objects.all().order_by("name")
        items = [
            {
                "id": r.id,
                "name": r.name,
                "permissions": r.permissions_desc,
                "is_builtin": r.is_builtin,
            }
            for r in queryset
        ]
        return Response({"items": items, "count": queryset.count()})


class IntegrationConfigView(APIView):
    def get(self, request):
        ensure_seed_system_support()
        payload = {row.key: row.value for row in IntegrationConfig.objects.all()}
        return Response(payload)

    def put(self, request):
        ensure_seed_system_support()
        for key, value in request.data.items():
            IntegrationConfig.objects.update_or_create(
                key=key,
                defaults={"value": str(value)},
            )
        payload = {row.key: row.value for row in IntegrationConfig.objects.all()}
        return Response(payload)
