from datetime import date

from .models import Device


def ensure_seed_devices() -> None:
    if Device.objects.exists():
        return
    Device.objects.bulk_create(
        [
            Device(
                id="A-001",
                device_sn="ZJ-Heli-A1",
                name="BP-14减速箱",
                model_type="两级行星直升机主减速器",
                location="1号试车台",
                status=Device.DeviceStatus.ONLINE,
                last_maintenance=date(2023, 11, 5),
            ),
            Device(
                id="B-002",
                device_sn="ZJ-Heli-A2",
                name="二号减速箱",
                model_type="两级行星直升机主减速器",
                location="备用仓库",
                status=Device.DeviceStatus.OFFLINE,
                last_maintenance=date(2023, 1, 12),
            ),
        ]
    )
