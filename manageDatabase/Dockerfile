# 使用官方 Go 镜像作为构建环境
FROM golang:1.21 AS builder

# 设置工作目录
WORKDIR /app

# 复制 go.mod 和 go.sum 并下载依赖
COPY go.mod go.sum ./
RUN go mod download

# 复制源码并构建
COPY . .
RUN go build -o server .

# 使用轻量级的 Alpine 运行环境
FROM alpine:latest

# 设置工作目录
WORKDIR /app

# 复制编译好的二进制文件
COPY --from=builder /app/server .

# 运行 HTTP 服务器
CMD ["./server"]

# 公开端口（假设 Server 运行在 8080 端口）
EXPOSE 8080