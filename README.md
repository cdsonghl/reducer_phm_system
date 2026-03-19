# PHM Frontend

基于 `React + TypeScript + Vite + Ant Design + Tailwind` 的 PHM 前端演示与业务页面工程。

## 1. 目录结构

```text
phm-frontend/
├─ public/                 # 静态资源（3D模型、draco资源等）
├─ src/
│  ├─ components/          # 可复用组件（数字孪生、图表等）
│  ├─ layouts/             # 页面布局
│  ├─ pages/               # 各业务页面
│  ├─ App.tsx              # 路由入口
│  ├─ main.tsx             # 应用启动入口
│  └─ index.css            # 全局样式与主题变量
├─ Dockerfile              # 生产镜像构建（Node build + Nginx）
├─ docker-compose.yml      # 本地/服务器容器编排
├─ nginx.conf              # SPA 路由与静态资源服务
└─ package.json
```

## 2. 开发与构建

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

```bash
npm run lint
```

## 3. Docker 部署

### 3.1 构建并启动

```bash
docker compose up -d --build
```

访问地址：

`http://<your-host>:8080`

### 3.2 停止服务

```bash
docker compose down
```

### 3.3 注意事项

- 需要本机 Docker daemon 正常运行（Docker Desktop 已启动）。
- `Dockerfile` 使用双阶段构建：`node:20-alpine` 负责打包，`nginx:alpine` 负责静态托管。
- `nginx.conf` 已配置 SPA 回退（`try_files ... /index.html`）。

## 4. 当前约定

- 路由入口：`src/App.tsx`
- 统一布局：`src/layouts/MainLayout.tsx`
- 3D 数字孪生：`src/components/DigitalTwin.tsx`
- 高亮部件配置：`src/components/digitalTwinConfig.ts`

## 5. 后续建议

- 将页面内 mock 数据逐步迁移到 `src/services`（API 与 mock 分离）。
- 为关键页面补充状态管理与类型定义，减少页面文件复杂度。
- 引入 CI（lint + build）作为合并门禁，避免回归。
