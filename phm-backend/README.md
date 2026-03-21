# PHM Backend (Django)

`phm-backend` 是 PHM 系统后端 M1 骨架，基于 `Django + DRF + SQLite`。

## 1. 当前能力

- 项目骨架与 6 个业务模块 app 已就位：
  - `assets`
  - `acquisition`
  - `processing_engine`
  - `health`
  - `diagnosis`
  - `system_support`
- 已集成：
  - `djangorestframework`
  - `django-cors-headers`
  - `simplejwt`
  - `drf-spectacular`（OpenAPI + Swagger UI）
- 已完成 M2 第一版：核心模型与数据库迁移落地，接口使用 ORM 持久化读写。

## 2. 快速启动（Docker）

1. 在当前目录复制环境变量：

```bash
cp .env.example .env
```

2. 启动服务：

```bash
docker compose up --build
```

3. 访问：

- API 根：`http://localhost:8000/api/`
- Swagger：`http://localhost:8000/api/docs/`
- OpenAPI JSON：`http://localhost:8000/api/schema/`

4. 默认演示账号（容器启动时自动创建）：

- 用户名：`admin`
- 密码：`admin123`

## 3. 关键接口（M1 占位）

说明：除 `GET /api/`、`/api/schema/`、`/api/docs/`、`/api/auth/token/`、`/api/auth/token/refresh/` 外，其余业务接口均需携带 JWT。

- `GET/POST /api/assets/devices/`
- `GET/PATCH /api/assets/devices/{device_id}/`
- `GET/POST /api/acquisition/devices/{device_id}/sources/`
- `DELETE /api/acquisition/sources/{source_id}/`
- `GET /api/acquisition/signals/{source_id}/waveform/`
- `GET /api/acquisition/signals/{source_id}/fft/`
- `GET/PUT /api/processing/config/`
- `GET /api/processing/features/stream/?device_id=A-001&feature=rms`
- `GET /api/health/trend/?device_id=A-001`
- `GET /api/health/alerts/?device_id=A-001`
- `GET/POST /api/diagnosis/models/`
- `POST /api/diagnosis/models/{model_id}/activate/`
- `POST /api/diagnosis/run/`
- `GET /api/diagnosis/results/{task_id}/`
- `GET /api/system/roles/`
- `GET/PUT /api/system/integrations/`
- `GET /api/auth/me/`（需要 JWT）

## 4. 冒烟验证

可在容器中执行：

```bash
python scripts/smoke_api.py
```

会依次验证各模块关键 GET 接口，以及 `POST /api/diagnosis/run/` + 结果查询链路。

## 5. 下一阶段（M3）

- 为前端添加统一 API client（替换页面内 mock）
- 增加分页、筛选、排序与统一错误码
- 补充单元测试与接口测试
