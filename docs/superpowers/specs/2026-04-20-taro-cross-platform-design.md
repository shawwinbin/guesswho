# 历史人物猜谜 Taro 跨平台设计方案

> 将现有 H5 React 项目改造成同时支持微信小程序版本

## 概述

### 目标

将现有 H5 版本的历史人物猜谜游戏，使用 Taro 框架重写，实现一套代码编译到 H5 + 微信小程序双平台。

### 功能范围

- **全功能同步**: 游戏核心功能 + 语音输入/播报 + 设置面板
- **微信特性**: 微信登录、分享功能、匿名游玩支持

### 技术选型

| 层面 | 技术 |
|------|------|
| 框架 | Taro 4.x（最新稳定版） |
| UI 组件 | NutUI（京东官方组件库） |
| 状态管理 | Taro 内置 hooks |
| 样式 | Sass/SCSS |
| 网络请求 | Taro.request |
| 语音 | 后端代理 + 第三方 ASR/TTS |
| 存储 | Taro.setStorageSync |
| 登录 | Taro.login + 后端 openid 验证 |
| 分享 | onShareAppMessage 页面钩子 |

## 项目结构

```
history-figure-guess/
├── src/
│   ├── app.config.ts          # Taro 全局配置（路由、窗口样式）
│   ├── app.tsx                # Taro 入口组件
│   ├── app.scss               # 全局样式
│   │
│   ├── pages/
│   │   ├── index/             # 首页（开始游戏）
│   │   │   ├── index.config.ts
│   │   │   ├── index.tsx
│   │   │   └── index.scss
│   │   ├── game/              # 游戏页面
│   │   │   ├── game.config.ts
│   │   │   ├── game.tsx
│   │   │   └── game.scss
│   │   ├── result/            # 结果页面
│   │   │   ├── result.config.ts
│   │   │   ├── result.tsx
│   │   │   └── result.scss
│   │   └── settings/          # 设置页面
│   │       ├── settings.config.ts
│   │       ├── settings.tsx
│   │       └── settings.scss
│   │
│   ├── components/            # 跨平台组件
│   │   ├── QuestionForm.tsx
│   │   ├── GuessForm.tsx
│   │   ├── VoiceControls.tsx
│   │   ├── AnswerBadge.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── lib/                   # 业务逻辑层
│   │   ├── types/             # 类型定义（figure.ts, game.ts）
│   │   ├── localEngine.ts     # 本地游戏引擎
│   │   ├── gameApi.ts         # API client（Taro.request）
│   │   ├── llmClient.ts       # LLM client
│   │   ├── gameContent.ts     # 历史人物数据
│   │   ├── voiceAdapter.ts    # 跨平台语音适配层
│   │   ├── storage.ts         # 本地存储适配
│   │   ├── auth.ts            # 微信登录适配
│   │   └── share.ts           # 分享功能
│   │
│   ├── hooks/                 # Taro hooks
│   │   ├── useGameSession.ts
│   │   ├── useVoiceGame.ts
│   │   └── useWechatAuth.ts
│   │
│   ├── data/
│   │   └── figures.ts         # 历史人物数据集
│   │
│   └── utils/
│   │   └── platform.ts        # 平台判断工具
│   │
│   └── assets/
│   │   └── share-cover.png    # 分享封面图
│   │
├── config/                    # Taro 编译配置
│   ├── dev.js
│   ├── prod.js
│   └── project.config.json
│
├── server/                    # 后端服务（保持不变，新增接口）
│   └── ...
│
├── package.json
├── tsconfig.json
└── project.config.json        # 小程序 AppID 配置
```

## 页面设计

### 路由配置

```typescript
// src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/game/game',
    'pages/result/result',
    'pages/settings/settings'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '历史人物猜谜',
    navigationBarTextStyle: 'black'
  }
})
```

### 页面跳转流程

```
首页 ──────→ 游戏页 ──────→ 结果页
  │            │               │
  │            ↓               ↓
  │        设置页 ←───────── 再来一局
  │            ↑
  └────────────┘
```

### 首页（pages/index）

**功能**:
- 游戏标题和简介
- "开始游戏" 按钮 → 进入游戏页
- "设置" 按钮 → 进入设置页
- 微信头像展示（如已登录）
- 分享入口

### 游戏页（pages/game）

**功能**:
- 游戏状态面板：当前会话 ID、提问次数、剩余次数
- 问答历史列表：问题 + 是/不是答案徽章
- 提问表单：文本输入 + 语音按钮
- 最终猜测表单：文本输入 + 提交按钮
- 返回/重新开始按钮

**交互流程**:
1. 进入页面 → 创建新会话（POST /v1/game-sessions）
2. 用户提问 → POST /v1/game-sessions/:id/questions
3. 显示答案（是/不是）+ AI 播报语音
4. 用户猜测 → POST /v1/game-sessions/:id/guesses
5. 显示结果 → 跳转结果页

### 结果页

**功能**:
- 显示猜测结果：正确/错误
- 显示正确答案（如错误）
- "再来一局" 按钮
- 分享按钮

### 设置页

**功能**:
- 游戏模式切换：本地模式 / 后端 API 模式
- API 设置：Base URL、API Key、Model
- 语音设置：开启/关闭语音播报、语音输入
- 微信登录/退出登录
- 清除本地数据

## 跨平台适配层

### 网络请求

```typescript
// src/lib/apiClient.ts
import Taro from '@tarojs/taro'

export const request = async (url: string, options: RequestOptions) => {
  const res = await Taro.request({
    url,
    method: options.method || 'GET',
    data: options.body,
    header: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  if (res.statusCode >= 400) {
    throw new Error(res.data.message || 'Request failed')
  }
  return res.data
}
```

### 本地存储

```typescript
// src/lib/storage.ts
import Taro from '@tarojs/taro'

export const storage = {
  get: (key: string) => Taro.getStorageSync(key),
  set: (key: string, value: any) => Taro.setStorageSync(key, value),
  remove: (key: string) => Taro.removeStorageSync(key),
  clear: () => Taro.clearStorageSync()
}
```

### 语音适配（voiceAdapter.ts）

**跨平台实现**:

| 平台 | 语音输入 | 语音播报 |
|------|----------|----------|
| H5 | Web Speech Recognition | speechSynthesis |
| 小程序 | 录音 → 后端 ASR | 后端 TTS → 音频播放 |

**小程序语音流程**:

1. 用户点击语音按钮
2. `Taro.getRecorderManager().start()` 开始录音
3. 录音结束，上传音频文件到后端
4. 后端调用 ASR 服务（百度/讯飞）返回文本
5. 显示识别文本，用户确认后提交

**播报流程**:

1. 收到 AI 答案（是/不是）
2. 调用后端 TTS 接口获取音频 URL
3. `Taro.createInnerAudioContext()` 播放音频

### 平台判断

```typescript
// src/utils/platform.ts
export const platform = {
  isWeapp: process.env.TARO_ENV === 'weapp',
  isH5: process.env.TARO_ENV === 'h5',
  isWeb: typeof window !== 'undefined' && !process.env.TARO_ENV
}
```

## 微信功能

### 微信登录

**流程**:

1. 用户点击"微信登录"
2. `Taro.login()` 获取 code
3. 发送 code 到后端 `/v1/auth/wechat`
4. 后端调用微信 API 换取 openid
5. 存储 openid，显示用户头像

**匿名游玩**: 不登录直接开始游戏，会话通过本地存储关联。

**会话关联**:
- 登录用户：会话记录关联 openid，可跨设备恢复
- 匿名用户：会话 ID 存本地，仅当前设备可用

### 分享功能

**分享入口**:

| 位置 | 分享内容 |
|------|----------|
| 首页 | 游戏介绍 + 邀请好友挑战 |
| 游戏页 | "我已猜了 N 次，快来帮我猜！" |
| 结果页 | "我用 X 次猜出了 [人物名]！" |

**实现**:

```typescript
// pages/game/game.tsx
Taro.useShareAppMessage(() => ({
  title: `我已猜了 ${questionCount} 次，快来帮我猜历史人物！`,
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
}))
```

## NutUI 组件选用

| NutUI 组件 | 用途 |
|------------|------|
| Button | 开始游戏、提交按钮 |
| Input | 文本输入框 |
| Cell / CellGroup | 设置项列表 |
| Switch | 开关（语音设置） |
| Radio / RadioGroup | 单选（游戏模式） |
| Avatar | 微信头像展示 |
| Dialog | 弹窗（确认、错误提示） |
| Toast | 轻提示 |
| Empty | 空状态 |
| List | 问答历史列表 |
| Loading | 加载动画 |

**安装**:

```bash
npm install @nutui/nutui-react-taro
```

## 后端新增接口

| 接口 | 功能 |
|------|------|
| POST /v1/auth/wechat | 微信登录（code → openid） |
| POST /v1/voice/transcribe | 语音识别（音频 → 文本） |
| POST /v1/voice/synthesize | 语音合成（文本 → 音频 URL） |

**微信登录接口**:

```
Request:  { "code": string }
Response: { "openid": string, "isNewUser": boolean }

后端调用:
GET https://api.weixin.qq.com/sns/jscode2session
  ?appid=APPID&secret=SECRET&js_code=CODE&grant_type=authorization_code
```

**语音接口**:

对接第三方 ASR/TTS 服务（百度/讯飞），后端代理调用。

## UI 组件迁移

**Web → Taro 组件对照**:

| Web | Taro |
|-----|------|
| `<div>` | `<View>` |
| `<span>` / `<p>` | `<Text>` |
| `<button>` | `<Button>` |
| `<input>` | `<Input>` |
| `<img>` | `<Image>` |

**样式适配**:
- 使用 px 单位，Taro 自动转换为 rpx
- 设计稿基准 750px
- 支持 Sass/SCSS

## 实施计划

| 阶段 | 任务 | 预估 |
|------|------|------|
| Phase 1 | Taro 项目初始化 + 基础架构 | 1 天 |
| Phase 2 | 核心业务逻辑迁移 | 1 天 |
| Phase 3 | 页面骨架搭建 | 0.5 天 |
| Phase 4 | UI 组件迁移（NutUI） | 2 天 |
| Phase 5 | 语音适配层实现 | 1.5 天 |
| Phase 6 | 微信登录 + 分享 | 1 天 |
| Phase 7 | 后端新增接口 | 1.5 天 |
| Phase 8 | 测试 + 发布准备 | 1 天 |

**总预估**: 10 天

## 小程序配置注意事项

1. **request 域名白名单**: 在小程序后台配置后端 API 域名
2. **AppID**: 在 `project.config.json` 中配置小程序 AppID
3. **分享封面图**: 准备 750x600 像素的封面图
4. **语音权限**: 小程序需申请录音权限

## 风险与注意事项

1. **语音方案**: 依赖后端对接第三方 ASR/TTS，需选择服务商并测试
2. **样式兼容**: 小程序部分 CSS 特性受限，需逐页面调试
3. **真机测试**: 小程序开发者工具表现可能与真机不同，需真机验证
4. **审核**: 小程序提交审核需符合微信规范，语音功能可能需特殊说明