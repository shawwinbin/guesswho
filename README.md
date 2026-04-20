# 历史人物猜谜 - Taro 跨平台版本

一个使用 Taro 框架开发的跨平台历史人物猜谜游戏，支持 H5 和微信小程序。

## 功能特性

- **跨平台支持**: 同时支持 H5 网页和微信小程序
- **猜谜游戏**: 通过提问猜出历史人物
- **语音功能**: 支持语音输入（H5 使用 Web Speech API，小程序使用微信录音）
- **微信登录**: 小程序端支持微信登录
- **分享功能**: 支持分享到微信好友

## 项目结构

```
src-taro/
├── app.tsx              # 应用入口
├── app.config.ts        # 应用配置（路由）
├── app.scss             # 全局样式
├── pages/               # 页面组件
│   ├── index/           # 首页
│   ├── game/            # 游戏页
│   ├── result/          # 结果页
│   └── settings/        # 设置页
├── components/          # UI 组件
│   ├── AnswerBadge.tsx  # 答案徽章
│   ├── QuestionForm.tsx # 提问表单
│   ├── GuessForm.tsx    # 猜测表单
│   ├── VoiceControls.tsx# 语音控制
│   └── LoadingSpinner.tsx
├── hooks/               # React Hooks
│   ├── useGameSession.ts# 游戏会话管理
│   └── useVoiceGame.ts  # 语音控制
├── lib/                 # 核心逻辑
│   ├── gameApi.ts       # API 接口
│   ├── storage.ts       # 本地存储
│   ├── voiceAdapter.ts  # 语音适配
│   ├── types/           # 类型定义
│   ├── gameContent.ts   # 游戏内容
│   └── localEngine.ts   # 本地引擎
├── data/                # 数据
│   └ figures.ts         # 历史人物数据
└── utils/               # 工具函数
    └── platform.ts      # 平台检测
```

## 开发指南

### 环境要求

- Node.js 18+
- npm 或 yarn
- 微信开发者工具（小程序开发）

### 安装依赖

```bash
npm install --legacy-peer-deps
```

### 开发命令

```bash
# H5 开发
npm run taro:dev:h5

# 小程序开发
npm run taro:dev

# H5 构建
npm run taro:build:h5

# 小程序构建
npm run taro:build
```

### 小程序调试

1. 运行 `npm run taro:build` 构建
2. 打开微信开发者工具
3. 导入项目，选择 `dist-taro` 目录
4. 填写 AppID（在 `project.config.json` 中配置）

## 技术栈

- **Taro 4.x**: 跨平台框架
- **React 18**: UI 框架
- **NutUI React Taro**: UI 组件库
- **TypeScript**: 类型安全
- **SCSS**: 样式

## API 接口

游戏需要后端 API 支持，主要接口：

- `POST /v1/game-sessions` - 创建游戏会话
- `GET /v1/game-sessions/:id` - 获取会话状态
- `POST /v1/game-sessions/:id/questions` - 提交问题
- `POST /v1/game-sessions/:id/guesses` - 提交猜测
- `POST /v1/auth/wechat` - 微信登录
- `POST /v1/voice/transcribe` - 语音转文字
- `POST /v1/voice/synthesize` - 文字转语音

## 配置说明

### Taro 配置

配置文件位于 `config/index.ts`:

- `designWidth: 750` - 设计稿宽度
- `sourceRoot: 'src-taro'` - 源码目录
- `outputRoot: 'dist-taro'` - 输出目录

### 微信小程序配置

修改 `dist-taro/project.config.json`:

```json
{
  "miniprogramRoot": "./",
  "appid": "your-app-id"
}
```

## 注意事项

1. 使用 `--legacy-peer-deps` 安装依赖解决 React 版本冲突
2. webpack 版本固定为 5.88.2 以兼容 Taro 4.2.0
3. NutUI 样式导入使用 `.css` 格式而非 `.scss`