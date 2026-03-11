# 阶段 1：构建产物阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制包管理配置文件并安装依赖
COPY package*.json ./
RUN npm install

# 复制整个项目工程到容器中
COPY . .

# 执行打包命令，输出物在 /app/dist 目录下
RUN npm run build

# 阶段 2：生产伺服阶段
FROM nginx:alpine

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
