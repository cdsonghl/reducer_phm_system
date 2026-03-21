import json
import os
import sys
from pathlib import Path

import django
from django.core.management import call_command
from django.test import Client

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

client = Client()
call_command("bootstrap_demo_user")

public_urls = [
    "/api/",
    "/api/schema/",
]

for url in public_urls:
    response = client.get(url)
    print(f"{url} -> {response.status_code}")

unauthorized_probe = client.get("/api/assets/devices/")
print(f"/api/assets/devices/ (no token) -> {unauthorized_probe.status_code}")

token_response = client.post(
    "/api/auth/token/",
    data=json.dumps(
        {
            "username": os.getenv("DEMO_ADMIN_USERNAME", "admin"),
            "password": os.getenv("DEMO_ADMIN_PASSWORD", "admin123"),
        }
    ),
    content_type="application/json",
)
print(f"/api/auth/token/ -> {token_response.status_code}")
access = token_response.json()["access"]
client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {access}"

get_urls = [
    "/api/assets/devices/",
    "/api/acquisition/devices/A-001/sources/",
    "/api/acquisition/signals/s1/waveform/",
    "/api/acquisition/signals/s1/fft/",
    "/api/processing/config/?device_id=A-001",
    "/api/processing/features/stream/?device_id=A-001&feature=rms",
    "/api/health/trend/?device_id=A-001",
    "/api/health/alerts/?device_id=A-001",
    "/api/diagnosis/models/",
    "/api/system/roles/",
    "/api/system/integrations/",
]

for url in get_urls:
    response = client.get(url)
    print(f"{url} -> {response.status_code}")

run_response = client.post(
    "/api/diagnosis/run/",
    data=json.dumps({"device_id": "A-001"}),
    content_type="application/json",
)
print(f"/api/diagnosis/run/ -> {run_response.status_code}")
task_id = run_response.json()["task_id"]
print(f"task_id={task_id}")

result_response = client.get(f"/api/diagnosis/results/{task_id}/")
print(f"/api/diagnosis/results/{task_id}/ -> {result_response.status_code}")

me_response = client.get("/api/auth/me/")
print(f"/api/auth/me/ -> {me_response.status_code}")
