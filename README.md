# Nav Site

[![Static Badge](https://img.shields.io/badge/github-Nav--Site-181717?style=flat&logo=github&logoColor=white)
](https://github.com/shenbourne/Nav-Site)
[![Static Badge](https://img.shields.io/badge/docker-shenbourne%2Fnav--site-2496ED?style=flat&logo=docker&logoColor=white)](https://hub.docker.com/repository/docker/shenbourne/nav-site)

一个简洁美观的个人导航网站，支持分类管理、链接收藏、暗色模式等功能。基于 Vue 3 + Express 5 构建，支持 Docker 一键部署。

![![demo.png](demo/demo.png)](https://nav.shenb.net/)

demo 网页：https://nav.shenb.net/

## ✨ 功能特性

### 🏠 主页

![homepage.png](demo/homepage.png)

- **分类导航** - 支持两级分类体系（一级分类 + 二级分类），Emoji 图标选择器
- **双布局模式** - 分页模式和一栏流式布局，适配不同使用习惯
- **全局搜索** - 按标题、描述、URL 快速定位链接
- **暗色模式** - 支持亮色/暗色/跟随系统三种主题
- **悬停提示** - 鼠标悬停卡片时浮现 tooltip 显示完整标题和描述
- **点击弹窗** - 点击卡片打开详情窗口，集中展示链接信息

### ⚙️ 后台管理

![backend.png](demo/backend.png)

- **JWT 认证** - 安全的登录机制，支持密码修改
- **分类管理** - 拖拽排序、增删改一级/二级分类
- **链接管理** - 添加/编辑/删除/跨分类移动链接
- **自动获取元数据** - 输入 URL 自动抓取网站标题、描述和图标
- **本地图标库** - 从本地图标库智能匹配网站图标
- **站点设置** - 自定义站点标题、Logo，浏览器标签栏图标同步
- **数据持久化** - JSON 文件存储，备份迁移方便

### 📝 卡片编辑

![editor.png](demo/editor.png)

- **基础信息** - 标题、URL、描述（纯文本）、图标
- **支持平台** - 标记支持的平台（Windows / macOS / Linux / iOS / Android / Web）
- **图片集** - 可添加多个图片链接，支持拖拽排序
- **详细介绍** - Markdown 格式富文本编辑
- **自定义按钮** - 可添加多个自定义快捷按钮，图标集成 Simple Icons

### 🎯 卡片详情

![details.png](demo/details.png)

- **链接介绍** - 大尺寸图标 + 标题 + 概述
- **快捷访问** - "官网" + 自定义按钮
- **平台标签** - 展示支持的平台（留空时不显示）
- **图片轮播** - 图片集，支持手动翻页、自动轮播
- **详细介绍** - Markdown 渲染的详细介绍

## 🚀 快速开始

### 🧰 本地开发

**安装依赖**

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

**启动服务**

```bash
# 启动后端 (端口 3000)
cd backend
node server.js

# 启动前端 (端口 5173)
cd frontend
npm run dev
```

访问 `http://localhost:5173` 即可使用。

**首次启动时会自动创建管理员账号**

- 用户名：`admin`
- 密码：`admin123`

> 建议首次登录后立即修改密码。

### 📦 Docker 部署

```bash
# 使用 Docker Compose 一键部署
docker compose up -d
```

``` yaml
# docker-compose.yml

services:
  nav-site:
    image: "shenbourne/nav-site:latest"
    ports:
      - "3000:3000"
    volumes:
      - ./backend/data:/app/data
    restart: unless-stopped
```

访问 `http://localhost:3000` 即可使用。

数据通过 volume 持久化到 `./backend/data` 目录，包括导航数据、认证配置和上传的文件。

**首次启动时会自动创建管理员账号**

- 用户名：`admin`
- 密码：`admin123`

> 建议首次登录后立即修改密码。

## 📝 链接数据结构

链接对象包含以下字段：

```json
{
  "id": "lnk_xxxxxx",
  "title": "网站标题",
  "url": "https://example.com",
  "description": "简短描述（纯文本）",
  "favicon": "https://example.com/favicon.ico",
  "platforms": ["Windows", "macOS", "Linux"],
  "imageGallery": ["https://example.com/img1.png", "https://example.com/img2.png"],
  "detailDescription": "# 详细介绍\n\n支持 **Markdown** 格式",
  "customButtons": [
    {
      "id": "btn_xxxxxx",
      "label": "文档",
      "url": "https://docs.example.com",
      "iconSlug": "gitbook",
      "iconSvg": "..."
    }
  ]
}
```

## ⚙️ 技术栈

| 模块 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) |
| 状态管理 | Pinia |
| 构建工具 | Vite 7 |
| HTTP 客户端 | Axios |
| 拖拽排序 | vuedraggable |
| 后端框架 | Express 5 |
| 认证 | JWT + bcryptjs |
| 文件上传 | Multer |
| 网页解析 | Cheerio |
| 数据存储 | JSON 文件 |
| 容器化 | Docker (多阶段构建) |


## ⛓️ API 概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/categories` | 获取所有分类及链接 | 否 |
| POST | `/api/categories` | 创建一级分类 | 是 |
| PUT | `/api/categories/:id` | 更新一级分类 | 是 |
| DELETE | `/api/categories/:id` | 删除一级分类 | 是 |
| POST | `/api/categories/:catId/subcategories` | 创建二级分类 | 是 |
| POST | `/api/categories/:catId/subcategories/:subId/links` | 创建链接 | 是 |
| PUT | `/api/categories/:catId/subcategories/:subId/links/:linkId` | 更新链接 | 是 |
| POST | `/api/links/move` | 跨分类移动链接 | 是 |
| GET | `/api/settings` | 获取站点设置 | 否 |
| PUT | `/api/settings` | 更新站点设置 | 是 |
| POST | `/api/upload-logo` | 上传 Logo | 是 |
| POST | `/api/fetch-meta` | 抓取网页元数据 | 是 |
| POST | `/api/login` | 登录 | 否 |
| PUT | `/api/change-password` | 修改密码 | 是 |

## 📜 许可证

本项目采用 GNU AGPLv3 协议开源。
