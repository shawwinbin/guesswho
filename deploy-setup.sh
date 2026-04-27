#!/bin/bash

# 配置 Docker 镜像加速器
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json > /dev/null << 'DAEMON_EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://mirror.aliyuncs.com"
  ]
}
DAEMON_EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

sleep 5

cd ~/history-figure-guess
docker compose up -d --build

sleep 10
docker compose ps
docker compose logs --tail=30