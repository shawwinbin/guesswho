#!/bin/bash

# 更新 Docker 配置，添加更多镜像源
sudo tee /etc/docker/daemon.json > /dev/null << 'DOCKER_EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerhub.timeweb.cloud",
    "https://dockerproxy.cn",
    "https://docker.nju.edu.cn"
  ]
}
DOCKER_EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

sleep 5

cd ~/history-figure-guess

echo "开始构建 Docker 容器..."
docker compose up -d --build

sleep 15

echo "检查容器状态:"
docker compose ps

echo "查看日志:"
docker compose logs --tail=50