# 阶段 1：构建产物阶段
# 使用第三方高可用国内镜像加速源，如果该源失效可替换为 registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine 等
FROM m.daocloud.io/docker.io/library/node:20-alpine AS builder

WORKDIR /app

# 复制包管理配置文件并安装依赖
COPY package*.json ./
# 显式使用淘宝源加速依赖安装
RUN npm install --registry=https://registry.npmmirror.com

# 复制整个项目工程到容器中
COPY . .

# 执行打包命令，输出物在 /app/dist 目录下
RUN npm run build

# 阶段 2：生产伺服阶段
FROM m.daocloud.io/docker.io/library/nginx:alpine

# 删除 Nginx 的默认静态页面
RUN rm -rf /usr/share/nginx/html/*

# 将构建阶段产出的 dist 文件夹内容拷贝给 Nginx 的访问目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 将我们写好的 nginx.conf 拷贝进去覆盖默认的配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露给宿主机端口映射 80
EXPOSE 80

# 前台运行 Nginx
CMD ["nginx", "-g", "daemon off;"]
