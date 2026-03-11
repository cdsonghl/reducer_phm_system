# 阶段 1：构建产物阶段
# 由于国内网络原因，直接拉取 docker.io 容易超时。这里提供了几个备选镜像源，如果当前失效可以在代码中替换 FROM 后面的前缀：
# 备选 1: docker.1panel.live/library/
# 备选 2: dockerpull.com/
# 备选 3: docker.anyhub.us.kg/library/
FROM docker.1panel.live/library/node:20-alpine AS builder

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
FROM docker.1panel.live/library/nginx:alpine

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
