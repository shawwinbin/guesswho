# Taro 跨平台改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 H5 React 历史人物猜谜游戏改造成 Taro 项目，一套代码编译到 H5 + 微信小程序双平台。

**Architecture:** Taro 4.x 框架 + NutUI 组件库，复用现有业务逻辑层（类型、游戏引擎、数据集），适配层封装跨平台差异（网络请求、存储、语音），新增微信登录和分享功能。

**Tech Stack:** Taro 4.x, NutUI React Taro, React hooks, Sass/SCSS, Taro.request, Taro.storage, Taro.voice APIs

---

## 文件结构概览

### 新建文件（Taro 项目）

```
src-taro/
├── app.config.ts              # Taro 全局路由配置
├── app.tsx                    # Taro 入口
├── app.scss                   # 全局样式
├── pages/
│   ├── index/                 # 首页
│   ├── game/                  # 游戏页
│   ├── result/                # 结果页
│   └── settings/              # 设置页
├── components/
│   ├── QuestionForm.tsx       # 提问表单
│   ├── GuessForm.tsx          # 猜测表单
│   ├── VoiceControls.tsx      # 语音控制
│   ├── AnswerBadge.tsx        # 答案徽章
│   └── LoadingSpinner.tsx     # 加载动画
├── lib/
│   ├── types/                 # 类型定义（复用现有）
│   ├── localEngine.ts         # 本地引擎（复用现有）
│   ├── gameApi.ts             # API client（适配 Taro.request）
│   ├── storage.ts             # 存储适配层
│   ├── voiceAdapter.ts        # 语音适配层
│   ├── auth.ts                # 微信登录
│   └── share.ts               # 分享功能
├── hooks/
│   ├── useGameSession.ts      # 游戏会话 hook
│   ├── useVoiceGame.ts        # 语音游戏 hook
│   └── useWechatAuth.ts       # 微信登录 hook
├── data/
│   └── figures.ts             # 人物数据（复用现有）
├── utils/
│   └── platform.ts            # 平台判断
├── assets/
│   └── share-cover.png        # 分享封面
config/
├── index.ts                   # Taro 编译配置
├── dev.ts                     # 开发配置
├── prod.ts                    # 生产配置
project.config.json            # 小程序 AppID
```

### 后端新增文件

```
server/src/
├── routes/
│   └── auth.ts                # 微信登录路由
│   └── voice.ts               # 语音接口路由
├── services/
│   ├── authService.ts         # 微信登录服务
│   └── voiceService.ts        # 语音 ASR/TTS 服务
├── schemas/
│   └── authSchemas.ts         # 登录请求校验
│   └── voiceSchemas.ts        # 语音请求校验
```

---

## Task 1: 初始化 Taro 项目

**Files:**
- Create: `src-taro/` 目录结构
- Create: `package.json` (Taro 依赖)
- Create: `config/index.ts`
- Create: `config/dev.ts`
- Create: `config/prod.ts`
- Create: `project.config.json`
- Create: `src-taro/app.config.ts`
- Create: `src-taro/app.tsx`
- Create: `src-taro/app.scss`

- [ ] **Step 1: 安装 Taro CLI 和初始化项目**

```bash
# 在项目根目录执行
npm install @tarojs/cli@4 @tarojs/taro@4 @tarojs/components@4 @tarojs/runtime@4 @tarojs/plugin-framework-react@4
npm install @nutui/nutui-react-taro sass --save-dev
```

- [ ] **Step 2: 创建 Taro 配置文件 config/index.ts**

```typescript
// config/index.ts
const config = {
  projectName: 'history-figure-guess',
  date: '2026-4-20',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src-taro',
  outputRoot: 'dist-taro',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {}
      },
      pxtransform: {
        enable: true,
        config: {}
      }
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
```

- [ ] **Step 3: 创建开发配置 config/dev.ts**

```typescript
// config/dev.ts
module.exports = {
  env: {
    NODE_ENV: 'development'
  },
  mini: {},
  h5: {}
}
```

- [ ] **Step 4: 创建生产配置 config/prod.ts**

```typescript
// config/prod.ts
module.exports = {
  env: {
    NODE_ENV: 'production'
  },
  mini: {},
  h5: {}
}
```

- [ ] **Step 5: 创建小程序配置 project.config.json**

```json
{
  "miniprogramRoot": "dist-taro/",
  "projectname": "history-figure-guess",
  "description": "历史人物猜谜小游戏",
  "appid": "touristappid",
  "setting": {
    "urlCheck": true,
    "es6": false,
    "enhance": true,
    "compileHotReLoad": false,
    "postcss": false,
    "minified": false
  },
  "compileType": "miniprogram"
}
```

- [ ] **Step 6: 创建 Taro 入口配置 src-taro/app.config.ts**

```typescript
// src-taro/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/game/game',
    'pages/result/result',
    'pages/settings/settings'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '历史人物猜谜',
    navigationBarTextStyle: 'black'
  }
})
```

- [ ] **Step 7: 创建 Taro 入口组件 src-taro/app.tsx**

```typescript
// src-taro/app.tsx
import { Component } from 'react'
import './app.scss'

class App extends Component {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children
  }
}

export default App
```

- [ ] **Step 8: 创建全局样式 src-taro/app.scss**

```scss
// src-taro/app.scss
@import '@nutui/nutui-react-taro/dist/styles/themes/default.scss';

page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  padding: 20px;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
  border-radius: 8px;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
  border-radius: 8px;
}
```

- [ ] **Step 9: 更新 package.json 添加 Taro 命令**

```json
{
  "scripts": {
    "taro:dev": "taro build --type weapp --watch",
    "taro:dev:h5": "taro build --type h5 --watch",
    "taro:build": "taro build --type weapp",
    "taro:build:h5": "taro build --type h5"
  }
}
```

- [ ] **Step 10: 验证 Taro 项目结构创建成功**

```bash
ls -la src-taro/
ls -la config/
```

Expected: 目录结构完整，配置文件存在

- [ ] **Step 11: Commit**

```bash
git add src-taro/ config/ project.config.json package.json package-lock.json
git commit -m "feat: initialize Taro project structure with NutUI

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: 复用核心业务逻辑

**Files:**
- Copy: `src/lib/types/*` → `src-taro/lib/types/`
- Copy: `src/lib/localEngine.ts` → `src-taro/lib/localEngine.ts`
- Copy: `src/data/figures.ts` → `src-taro/data/figures.ts`
- Copy: `src/lib/gameContent.ts` → `src-taro/lib/gameContent.ts`
- Create: `src-taro/lib/gameApi.ts` (适配 Taro.request)
- Create: `src-taro/lib/storage.ts`

- [ ] **Step 1: 复制类型定义文件**

```bash
mkdir -p src-taro/lib/types
cp src/lib/types.ts src-taro/lib/types/index.ts
cp src/lib/types/figure.ts src-taro/lib/types/figure.ts
cp src/lib/types/game.ts src-taro/lib/types/game.ts
cp src/lib/types/ai.ts src-taro/lib/types/ai.ts
```

- [ ] **Step 2: 复制本地游戏引擎**

```bash
mkdir -p src-taro/lib
cp src/lib/localEngine.ts src-taro/lib/localEngine.ts
```

- [ ] **Step 3: 复制历史人物数据**

```bash
mkdir -p src-taro/data
cp src/data/figures.ts src-taro/data/figures.ts
```

- [ ] **Step 4: 复制游戏内容辅助函数**

```bash
cp src/lib/gameContent.ts src-taro/lib/gameContent.ts
```

- [ ] **Step 5: 创建 Taro API 客户端 src-taro/lib/gameApi.ts**

```typescript
// src-taro/lib/gameApi.ts
import Taro from '@tarojs/taro'
import type { CreateSessionRequest, GameSessionSnapshot, GuessResponse, QuestionResponse } from './types'

const API_BASE_URL = process.env.TARO_ENV === 'h5' 
  ? (process.env.VITE_API_BASE_URL || '')
  : '' // 小程序需要配置 request 域名白名单

async function taroRequest<T>(path: string, options: {
  method?: 'GET' | 'POST'
  data?: unknown
}): Promise<T> {
  const res = await Taro.request({
    url: `${API_BASE_URL}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json'
    }
  })

  if (res.statusCode >= 400) {
    const msg = res.data?.error?.message || `请求失败: ${res.statusCode}`
    throw new Error(msg)
  }

  return res.data as T
}

export function createSession(payload: CreateSessionRequest): Promise<GameSessionSnapshot> {
  return taroRequest('/v1/game-sessions', {
    method: 'POST',
    data: payload
  })
}

export function fetchSession(sessionId: string): Promise<GameSessionSnapshot> {
  return taroRequest(`/v1/game-sessions/${sessionId}`)
}

export function submitQuestion(sessionId: string, question: string): Promise<QuestionResponse> {
  return taroRequest(`/v1/game-sessions/${sessionId}/questions`, {
    method: 'POST',
    data: { question }
  })
}

export function submitGuess(sessionId: string, guess: string): Promise<GuessResponse> {
  return taroRequest(`/v1/game-sessions/${sessionId}/guesses`, {
    method: 'POST',
    data: { guess }
  })
}
```

- [ ] **Step 6: 创建存储适配层 src-taro/lib/storage.ts**

```typescript
// src-taro/lib/storage.ts
import Taro from '@tarojs/taro'

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const value = Taro.getStorageSync(key)
      return value ? value as T : null
    } catch {
      return null
    }
  },

  set: (key: string, value: unknown): void => {
    try {
      Taro.setStorageSync(key, value)
    } catch {
      // ignore
    }
  },

  remove: (key: string): void => {
    try {
      Taro.removeStorageSync(key)
    } catch {
      // ignore
    }
  },

  clear: (): void => {
    try {
      Taro.clearStorageSync()
    } catch {
      // ignore
    }
  }
}
```

- [ ] **Step 7: 创建平台判断工具 src-taro/utils/platform.ts**

```typescript
// src-taro/utils/platform.ts
export const platform = {
  isWeapp: process.env.TARO_ENV === 'weapp',
  isH5: process.env.TARO_ENV === 'h5',
  
  // 小程序特有功能判断
  canUseLogin: process.env.TARO_ENV === 'weapp',
  canUseShare: process.env.TARO_ENV === 'weapp',
  canUseRecorder: process.env.TARO_ENV === 'weapp',
  canUseWebSpeech: process.env.TARO_ENV === 'h5'
}
```

- [ ] **Step 8: Commit**

```bash
git add src-taro/lib/ src-taro/data/ src-taro/utils/
git commit -m "feat: copy core business logic and add Taro adapters

- Types, localEngine, figures data reused from H5
- gameApi adapted for Taro.request
- storage adapter for Taro.setStorageSync
- platform detection utility

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 创建页面骨架

**Files:**
- Create: `src-taro/pages/index/index.tsx`
- Create: `src-taro/pages/index/index.config.ts`
- Create: `src-taro/pages/index/index.scss`
- Create: `src-taro/pages/game/game.tsx`
- Create: `src-taro/pages/game/game.config.ts`
- Create: `src-taro/pages/game/game.scss`
- Create: `src-taro/pages/result/result.tsx`
- Create: `src-taro/pages/result/result.config.ts`
- Create: `src-taro/pages/result/result.scss`
- Create: `src-taro/pages/settings/settings.tsx`
- Create: `src-taro/pages/settings/settings.config.ts`
- Create: `src-taro/pages/settings/settings.scss`

- [ ] **Step 1: 创建首页配置 src-taro/pages/index/index.config.ts**

```typescript
export default definePageConfig({
  navigationBarTitleText: '历史人物猜谜'
})
```

- [ ] **Step 2: 创建首页组件 src-taro/pages/index/index.tsx**

```typescript
// src-taro/pages/index/index.tsx
import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './index.scss'

export default function IndexPage() {
  const handleStart = () => {
    Taro.navigateTo({ url: '/pages/game/game' })
  }

  const handleSettings = () => {
    Taro.navigateTo({ url: '/pages/settings/settings' })
  }

  return (
    <View className="index-page">
      <View className="header">
        <Text className="title">历史人物猜谜</Text>
        <Text className="subtitle">AI 秘密选择一位历史人物，你来猜是谁</Text>
      </View>

      <View className="intro">
        <Text className="intro-text">
          通过提问只能回答「是」或「不是」的问题，逐步缩小范围，最终猜出历史人物！
        </Text>
      </View>

      <View className="actions">
        <Button type="primary" size="large" onClick={handleStart}>
          开始游戏
        </Button>
        <Button type="default" size="large" onClick={handleSettings}>
          设置
        </Button>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: 创建首页样式 src-taro/pages/index/index.scss**

```scss
.index-page {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 48px;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 28px;
  color: #666;
  margin-top: 20px;
}

.intro {
  margin-bottom: 60px;
}

.intro-text {
  font-size: 28px;
  color: #888;
  text-align: center;
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
```

- [ ] **Step 4: 创建游戏页配置 src-taro/pages/game/game.config.ts**

```typescript
export default definePageConfig({
  navigationBarTitleText: '游戏中'
})
```

- [ ] **Step 5: 创建游戏页骨架 src-taro/pages/game/game.tsx**

```typescript
// src-taro/pages/game/game.tsx
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './game.scss'

export default function GamePage() {
  // 游戏逻辑将在后续任务中实现

  return (
    <View className="game-page">
      <View className="status-bar">
        <Text>游戏状态面板（待实现）</Text>
      </View>

      <View className="game-content">
        <Text>游戏主界面（待实现）</Text>
      </View>
    </View>
  )
}

// 分享配置
GamePage.useShareAppMessage = () => ({
  title: '快来帮我猜历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})
```

- [ ] **Step 6: 创建游戏页样式 src-taro/pages/game/game.scss**

```scss
.game-page {
  padding: 20px;
}

.status-bar {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.game-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}
```

- [ ] **Step 7: 创建结果页配置 src-taro/pages/result/result.config.ts**

```typescript
export default definePageConfig({
  navigationBarTitleText: '游戏结果'
})
```

- [ ] **Step 8: 创建结果页骨架 src-taro/pages/result/result.tsx**

```typescript
// src-taro/pages/result/result.tsx
import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './result.scss'

export default function ResultPage() {
  const handleRestart = () => {
    Taro.redirectTo({ url: '/pages/game/game' })
  }

  return (
    <View className="result-page">
      <View className="result-content">
        <Text className="result-title">游戏结束（待实现）</Text>
        <Button type="primary" onClick={handleRestart}>
          再来一局
        </Button>
      </View>
    </View>
  )
}

ResultPage.useShareAppMessage = () => ({
  title: '我猜出了历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})
```

- [ ] **Step 9: 创建结果页样式 src-taro/pages/result/result.scss**

```scss
.result-page {
  padding: 40px;
  text-align: center;
}

.result-content {
  padding: 40px;
  background: #fff;
  border-radius: 8px;
}

.result-title {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 40px;
}
```

- [ ] **Step 10: 创建设置页配置 src-taro/pages/settings/settings.config.ts**

```typescript
export default definePageConfig({
  navigationBarTitleText: '设置'
})
```

- [ ] **Step 11: 创建设置页骨架 src-taro/pages/settings/settings.tsx**

```typescript
// src-taro/pages/settings/settings.tsx
import { View, Text } from '@tarojs/components'
import { Cell, CellGroup, Switch, Button } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './settings.scss'

export default function SettingsPage() {
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className="settings-page">
      <CellGroup title="游戏设置">
        <Cell title="语音播报" extra={<Switch checked />} />
        <Cell title="语音输入" extra={<Switch checked />} />
      </CellGroup>

      <CellGroup title="账户">
        <Cell title="微信登录（待实现）" />
      </CellGroup>

      <View className="settings-actions">
        <Button type="default" onClick={handleBack}>
          返回
        </Button>
      </View>
    </View>
  )
}
```

- [ ] **Step 12: 创建设置页样式 src-taro/pages/settings/settings.scss**

```scss
.settings-page {
  padding: 20px;
}

.settings-actions {
  margin-top: 40px;
}
```

- [ ] **Step 13: 验证页面骨架创建成功**

```bash
ls -la src-taro/pages/
ls -la src-taro/pages/index/
ls -la src-taro/pages/game/
ls -la src-taro/pages/result/
ls -la src-taro/pages/settings/
```

Expected: 所有页面文件存在

- [ ] **Step 14: Commit**

```bash
git add src-taro/pages/
git commit -m "feat: create Taro page skeletons for index, game, result, settings

- Basic page structure with NutUI components
- Share configuration for weapp
- Placeholder content for later implementation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 实现 UI 组件（NutUI）

**Files:**
- Create: `src-taro/components/QuestionForm.tsx`
- Create: `src-taro/components/GuessForm.tsx`
- Create: `src-taro/components/AnswerBadge.tsx`
- Create: `src-taro/components/VoiceControls.tsx`
- Create: `src-taro/components/LoadingSpinner.tsx`
- Create: `src-taro/components/components.scss`

- [ ] **Step 1: 创建答案徽章组件 src-taro/components/AnswerBadge.tsx**

```typescript
// src-taro/components/AnswerBadge.tsx
import { View, Text } from '@tarojs/components'
import type { YesNoAnswer } from '../lib/types'
import './components.scss'

interface AnswerBadgeProps {
  answer: YesNoAnswer
}

export function AnswerBadge({ answer }: AnswerBadgeProps) {
  return (
    <View className={`answer-badge ${answer === '是' ? 'yes' : 'no'}`}>
      <Text className="badge-text">{answer}</Text>
    </View>
  )
}
```

- [ ] **Step 2: 创建提问表单组件 src-taro/components/QuestionForm.tsx**

```typescript
// src-taro/components/QuestionForm.tsx
import { View } from '@tarojs/components'
import { Input, Button } from '@nutui/nutui-react-taro'
import { useState } from 'react'
import './components.scss'

interface QuestionFormProps {
  onSubmit: (question: string) => void
  disabled?: boolean
  loading?: boolean
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
}

export function QuestionForm({
  onSubmit,
  disabled = false,
  loading = false,
  suggestions = [],
  onSuggestionClick
}: QuestionFormProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
      setValue('')
    }
  }

  return (
    <View className="question-form">
      {suggestions.length > 0 && (
        <View className="suggestions">
          {suggestions.map(s => (
            <View 
              key={s} 
              className="suggestion-chip"
              onClick={() => onSuggestionClick?.(s)}
            >
              <text>{s}</text>
            </View>
          ))}
        </View>
      )}

      <View className="input-row">
        <Input
          className="question-input"
          value={value}
          placeholder="输入你的问题..."
          disabled={disabled || loading}
          onChange={(val) => setValue(val)}
        />
        <Button
          type="primary"
          size="small"
          disabled={disabled || loading || !value.trim()}
          onClick={handleSubmit}
        >
          {loading ? '...' : '提问'}
        </Button>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: 创建猜测表单组件 src-taro/components/GuessForm.tsx**

```typescript
// src-taro/components/GuessForm.tsx
import { View } from '@tarojs/components'
import { Input, Button } from '@nutui/nutui-react-taro'
import { useState } from 'react'
import './components.scss'

interface GuessFormProps {
  onSubmit: (guess: string) => void
  disabled?: boolean
  loading?: boolean
}

export function GuessForm({
  onSubmit,
  disabled = false,
  loading = false
}: GuessFormProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
      setValue('')
    }
  }

  return (
    <View className="guess-form">
      <View className="input-row">
        <Input
          className="guess-input"
          value={value}
          placeholder="输入你猜测的人物名字..."
          disabled={disabled || loading}
          onChange={(val) => setValue(val)}
        />
        <Button
          type="success"
          size="small"
          disabled={disabled || loading || !value.trim()}
          onClick={handleSubmit}
        >
          {loading ? '...' : '最终猜测'}
        </Button>
      </View>
    </View>
  )
}
```

- [ ] **Step 4: 创建语音控制组件 src-taro/components/VoiceControls.tsx**

```typescript
// src-taro/components/VoiceControls.tsx
import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
import { useState } from 'react'
import { platform } from '../utils/platform'
import './components.scss'

interface VoiceControlsProps {
  onStartRecord: () => void
  onStopRecord: () => void
  isRecording: boolean
  disabled?: boolean
  transcript?: string
}

export function VoiceControls({
  onStartRecord,
  onStopRecord,
  isRecording,
  disabled = false,
  transcript
}: VoiceControlsProps) {
  const handleClick = () => {
    if (isRecording) {
      onStopRecord()
    } else {
      onStartRecord()
    }
  }

  return (
    <View className="voice-controls">
      <Button
        type={isRecording ? 'warning' : 'default'}
        size="small"
        disabled={disabled}
        onClick={handleClick}
      >
        {isRecording ? '🔴 停止录音' : '🎤 语音输入'}
      </Button>
      
      {transcript && (
        <View className="transcript-preview">
          <Text>{transcript}</Text>
        </View>
      )}

      {!platform.canUseRecorder && platform.isWeapp && (
        <Text className="voice-hint">小程序语音需要后端支持</Text>
      )}
    </View>
  )
}
```

- [ ] **Step 5: 创建加载动画组件 src-taro/components/LoadingSpinner.tsx**

```typescript
// src-taro/components/LoadingSpinner.tsx
import { View, Text } from '@tarojs/components'
import { Loading } from '@nutui/nutui-react-taro'
import './components.scss'

interface LoadingSpinnerProps {
  text?: string
}

export function LoadingSpinner({ text = '加载中...' }: LoadingSpinnerProps) {
  return (
    <View className="loading-spinner">
      <Loading />
      <Text className="loading-text">{text}</Text>
    </View>
  )
}
```

- [ ] **Step 6: 创建组件样式 src-taro/components/components.scss**

```scss
// 答案徽章
.answer-badge {
  display: inline-flex;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: bold;

  &.yes {
    background-color: #52c41a;
    color: white;
  }

  &.no {
    background-color: #f5222d;
    color: white;
  }
}

.badge-text {
  font-size: 28px;
}

// 提问表单
.question-form {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.suggestion-chip {
  padding: 10px 20px;
  background: #f0f0f0;
  border-radius: 20px;
  font-size: 24px;
}

.input-row {
  display: flex;
  gap: 10px;
}

.question-input,
.guess-input {
  flex: 1;
}

// 猜测表单
.guess-form {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  margin-top: 20px;
}

// 语音控制
.voice-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.transcript-preview {
  padding: 10px;
  background: #e6f7ff;
  border-radius: 8px;
}

.voice-hint {
  font-size: 24px;
  color: #888;
}

// 加载动画
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-text {
  margin-top: 20px;
  color: #888;
}
```

- [ ] **Step 7: Commit**

```bash
git add src-taro/components/
git commit -m "feat: create NutUI components for question, guess, voice, badge, loading

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 实现游戏 Hook

**Files:**
- Create: `src-taro/hooks/useGameSession.ts`
- Create: `src-taro/hooks/useVoiceGame.ts`

- [ ] **Step 1: 创建游戏会话 Hook src-taro/hooks/useGameSession.ts**

```typescript
// src-taro/hooks/useGameSession.ts
import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { createSession, fetchSession, submitQuestion, submitGuess } from '../lib/gameApi'
import { storage } from '../lib/storage'
import type { GameSessionSnapshot, GameSettings, QuestionAnswer, YesNoAnswer } from '../lib/types'

export type GamePhase = 'idle' | 'loading' | 'playing' | 'ended'

export interface GameState {
  sessionId: string | null
  phase: GamePhase
  history: QuestionAnswer[]
  guesses: string[]
  isWinner: boolean
  errorMsg: string | null
  revealedName: string | null
  remainingQuestions: number | null
}

const SESSION_KEY = 'history-figure-guess-session'
const INITIAL_STATE: GameState = {
  sessionId: null,
  phase: 'idle',
  history: [],
  guesses: [],
  isWinner: false,
  errorMsg: null,
  revealedName: null,
  remainingQuestions: null
}

export function useGameSession(settings: GameSettings) {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(false)

  // 恢复会话
  useEffect(() => {
    const savedSessionId = storage.get<string>(SESSION_KEY)
    if (!savedSessionId) return

    const restore = async () => {
      setIsLoading(true)
      try {
        const snapshot = await fetchSession(savedSessionId)
        applySnapshot(snapshot)
      } catch {
        storage.remove(SESSION_KEY)
      } finally {
        setIsLoading(false)
      }
    }
    restore()
  }, [])

  const applySnapshot = (snapshot: GameSessionSnapshot) => {
    setState({
      sessionId: snapshot.sessionId,
      phase: snapshot.status === 'ended' ? 'ended' : 'playing',
      history: snapshot.history,
      guesses: snapshot.guesses.map(g => g.guess),
      isWinner: snapshot.guesses[snapshot.guesses.length - 1]?.isCorrect ?? false,
      errorMsg: null,
      revealedName: snapshot.revealedName ?? null,
      remainingQuestions: snapshot.remainingQuestions
    })
    storage.set(SESSION_KEY, snapshot.sessionId)
  }

  const startGame = useCallback(async () => {
    setIsLoading(true)
    setState(prev => ({ ...prev, phase: 'loading', errorMsg: null }))
    
    try {
      const snapshot = await createSession({
        questionLimit: settings.questionLimit,
        figureScope: settings.figureScope
      })
      applySnapshot(snapshot)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '启动失败'
      setState(prev => ({ ...prev, phase: 'idle', errorMsg: msg }))
      storage.remove(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [settings])

  const askQuestion = useCallback(async (question: string) => {
    if (!state.sessionId || state.phase !== 'playing') return
    
    setIsLoading(true)
    setState(prev => ({ ...prev, errorMsg: null }))
    
    try {
      const res = await submitQuestion(state.sessionId, question)
      setState(prev => ({
        ...prev,
        history: [...prev.history, { question, answer: res.answer as YesNoAnswer }],
        phase: res.status === 'ended' ? 'ended' : 'playing',
        remainingQuestions: res.remainingQuestions,
        revealedName: res.revealedName ?? prev.revealedName
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提问失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
    } finally {
      setIsLoading(false)
    }
  }, [state.sessionId, state.phase])

  const makeGuess = useCallback(async (guess: string) => {
    if (!state.sessionId || state.phase !== 'playing') return
    
    setIsLoading(true)
    setState(prev => ({ ...prev, errorMsg: null }))
    
    try {
      const res = await submitGuess(state.sessionId, guess)
      setState(prev => ({
        ...prev,
        phase: 'ended',
        guesses: [...prev.guesses, guess],
        isWinner: res.isCorrect,
        revealedName: res.revealedName
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '猜测失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
    } finally {
      setIsLoading(false)
    }
  }, [state.sessionId, state.phase])

  const restart = useCallback(async () => {
    storage.remove(SESSION_KEY)
    setState(INITIAL_STATE)
    await startGame()
  }, [startGame])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, errorMsg: null }))
  }, [])

  return {
    state,
    isLoading,
    startGame,
    askQuestion,
    makeGuess,
    restart,
    clearError
  }
}
```

- [ ] **Step 2: 创建语音游戏 Hook src-taro/hooks/useVoiceGame.ts**

```typescript
// src-taro/hooks/useVoiceGame.ts
import { useState, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
import { platform } from '../utils/platform'

export type VoiceState = 'idle' | 'recording' | 'processing'

interface UseVoiceGameOptions {
  onTranscript?: (text: string) => void
  onError?: (error: string) => void
}

export function useVoiceGame(options: UseVoiceGameOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recorderRef = useRef<any>(null)

  const startRecording = useCallback(() => {
    if (!platform.isWeapp) {
      // H5 使用 Web Speech Recognition（简化版）
      options.onError?.('H5 语音需要浏览器支持')
      return
    }

    setState('recording')
    setTranscript('')

    const recorder = Taro.getRecorderManager()
    recorderRef.current = recorder

    recorder.onStart(() => {
      setState('recording')
    })

    recorder.onStop((res) => {
      setState('processing')
      // 上传音频到后端 ASR 服务（后续实现）
      // const audioPath = res.tempFilePath
      // uploadAndTranscribe(audioPath)
    })

    recorder.onError((err) => {
      setState('idle')
      options.onError?.(err.errMsg || '录音失败')
    })

    recorder.start({
      format: 'mp3',
      duration: 60000
    })
  }, [options])

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setTranscript('')
  }, [])

  return {
    state,
    transcript,
    startRecording,
    stopRecording,
    reset,
    isRecording: state === 'recording'
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src-taro/hooks/
git commit -m "feat: implement useGameSession and useVoiceGame hooks

- Game session management with Taro storage
- Voice recording for weapp (ASR integration pending)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 完善游戏页面实现

**Files:**
- Modify: `src-taro/pages/game/game.tsx`
- Modify: `src-taro/pages/game/game.scss`

- [ ] **Step 1: 重写游戏页面 src-taro/pages/game/game.tsx**

```typescript
// src-taro/pages/game/game.tsx
import { View, Text, ScrollView } from '@tarojs/components'
import { Button, Cell, Empty, Loading } from '@nutui/nutui-react-taro'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useGameSession } from '../../hooks/useGameSession'
import { QuestionForm } from '../../components/QuestionForm'
import { GuessForm } from '../../components/GuessForm'
import { AnswerBadge } from '../../components/AnswerBadge'
import { VoiceControls } from '../../components/VoiceControls'
import { useVoiceGame } from '../../hooks/useVoiceGame'
import { SUGGESTED_QUESTIONS } from '../../lib/gameContent'
import { storage } from '../../lib/storage'
import type { GameSettings } from '../../lib/types'
import './game.scss'

const DEFAULT_SETTINGS: GameSettings = {
  questionLimit: 20,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
  autoStartContinuousVoice: false
}

export default function GamePage() {
  const router = useRouter()
  const settings = storage.get<GameSettings>('game-settings') || DEFAULT_SETTINGS

  const { state, isLoading, startGame, askQuestion, makeGuess, restart, clearError } = useGameSession(settings)
  const voice = useVoiceGame({
    onTranscript: (text) => {
      // 处理语音识别结果
      askQuestion(text)
    }
  })

  // 进入页面自动开始游戏
  useEffect(() => {
    if (state.phase === 'idle') {
      startGame()
    }
  }, [])

  // 游戏结束跳转结果页
  useEffect(() => {
    if (state.phase === 'ended' && state.revealedName) {
      Taro.navigateTo({
        url: `/pages/result/result?winner=${state.isWinner}&name=${state.revealedName}&count=${state.history.length}`
      })
    }
  }, [state.phase, state.isWinner, state.revealedName])

  const handleRestart = () => {
    restart()
  }

  const handleSuggestionClick = (suggestion: string) => {
    askQuestion(suggestion)
  }

  if (state.phase === 'loading' && !state.sessionId) {
    return (
      <View className="game-page loading">
        <Loading text="正在选择人物..." />
      </View>
    )
  }

  return (
    <View className="game-page">
      {/* 状态栏 */}
      <View className="status-bar">
        <Text className="status-item">已提问 {state.history.length} 次</Text>
        {state.remainingQuestions !== null && (
          <Text className="status-item">剩余 {state.remainingQuestions} 次</Text>
        )}
        <Button size="small" type="default" onClick={handleRestart}>
          重新开始
        </Button>
      </View>

      {/* 错误提示 */}
      {state.errorMsg && (
        <View className="error-banner">
          <Text>{state.errorMsg}</Text>
          <Text className="close-btn" onClick={clearError}>✕</Text>
        </View>
      )}

      {/* 提示 */}
      <View className="hint-panel">
        <Text className="hint">💡 请问可以用「是」或「不是」回答的问题</Text>
      </View>

      {/* 问答历史 */}
      <ScrollView className="history-panel" scrollY scrollWithAnimation>
        {state.history.length === 0 ? (
          <Empty description="还没有提问" />
        ) : (
          <View className="history-list">
            {state.history.map((item, idx) => (
              <View key={idx} className="history-item">
                <Text className="question">问: {item.question}</Text>
                <AnswerBadge answer={item.answer} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 语音控制 */}
      {settings.voiceMode && (
        <View className="voice-panel">
          <VoiceControls
            onStartRecord={voice.startRecording}
            onStopRecord={voice.stopRecording}
            isRecording={voice.isRecording}
            disabled={isLoading}
            transcript={voice.transcript}
          />
        </View>
      )}

      {/* 输入面板 */}
      <View className="input-panel">
        <QuestionForm
          onSubmit={askQuestion}
          disabled={isLoading || (state.remainingQuestions !== null && state.remainingQuestions <= 0)}
          loading={isLoading}
          suggestions={SUGGESTED_QUESTIONS.slice(0, 4)}
          onSuggestionClick={handleSuggestionClick}
        />
        <GuessForm
          onSubmit={makeGuess}
          disabled={isLoading}
          loading={isLoading}
        />
      </View>
    </View>
  )
}

// 分享
GamePage.useShareAppMessage = (res) => {
  // 从全局状态获取提问次数
  return {
    title: '快来帮我猜历史人物！',
    path: '/pages/index/index',
    imageUrl: '/assets/share-cover.png'
  }
}
```

- [ ] **Step 2: 更新游戏页面样式 src-taro/pages/game/game.scss**

```scss
.game-page {
  min-height: 100vh;
  padding: 20px;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;

  &.loading {
    justify-content: center;
    align-items: center;
  }
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-item {
  font-size: 28px;
  color: #333;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  margin-bottom: 20px;
}

.close-btn {
  color: #f5222d;
  padding: 4px 8px;
}

.hint-panel {
  padding: 16px;
  background: #e6f7ff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.hint {
  font-size: 26px;
  color: #1890ff;
}

.history-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  max-height: 400px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.question {
  font-size: 28px;
  color: #333;
  flex: 1;
}

.voice-panel {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.input-panel {
  background: #fff;
  border-radius: 8px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src-taro/pages/game/
git commit -m "feat: implement full game page with hooks and components

- Auto-start game on page enter
- Question history with scroll
- Voice controls integration
- Error handling and restart

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 完善结果页面和设置页面

**Files:**
- Modify: `src-taro/pages/result/result.tsx`
- Modify: `src-taro/pages/settings/settings.tsx`

- [ ] **Step 1: 重写结果页面 src-taro/pages/result/result.tsx**

```typescript
// src-taro/pages/result/result.tsx
import { View, Text } from '@tarojs/components'
import { Button, Avatar, Cell } from '@nutui/nutui-react-taro'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import './result.scss'

export default function ResultPage() {
  const router = useRouter()
  const [isWinner, setIsWinner] = useState(false)
  const [revealedName, setRevealedName] = useState('')
  const [questionCount, setQuestionCount] = useState(0)

  useEffect(() => {
    const params = router.params
    setIsWinner(params.winner === 'true')
    setRevealedName(params.name || '未知人物')
    setQuestionCount(parseInt(params.count || '0', 10))
  }, [router.params])

  const handleRestart = () => {
    Taro.redirectTo({ url: '/pages/game/game' })
  }

  const handleBackHome = () => {
    Taro.redirectTo({ url: '/pages/index/index' })
  }

  return (
    <View className="result-page">
      <View className="result-card">
        {isWinner ? (
          <View className="win-section">
            <Text className="emoji">🎉</Text>
            <Text className="result-title">恭喜你猜对了！</Text>
            <Text className="figure-name">{revealedName}</Text>
            <Text className="stats">用了 {questionCount} 次提问</Text>
          </View>
        ) : (
          <View className="lose-section">
            <Text className="emoji">😔</Text>
            <Text className="result-title">很遗憾，猜错了</Text>
            <Text className="figure-name">正确答案: {revealedName}</Text>
          </View>
        )}

        <View className="actions">
          <Button type="primary" size="large" onClick={handleRestart}>
            再来一局
          </Button>
          <Button type="default" size="large" onClick={handleBackHome}>
            返回首页
          </Button>
        </View>
      </View>
    </View>
  )
}

ResultPage.useShareAppMessage = () => ({
  title: '我猜出了历史人物！来挑战吧',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})
```

- [ ] **Step 2: 重写设置页面 src-taro/pages/settings/settings.tsx**

```typescript
// src-taro/pages/settings/settings.tsx
import { View, Text } from '@tarojs/components'
import { Cell, CellGroup, Switch, Input, Button, Dialog, Toast } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { storage } from '../../lib/storage'
import { platform } from '../../utils/platform'
import type { GameSettings } from '../../lib/types'
import './settings.scss'

const DEFAULT_SETTINGS: GameSettings = {
  questionLimit: 20,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
  autoStartContinuousVoice: false
}

const SCOPE_OPTIONS = [
  { value: 'all', label: '全部人物' },
  { value: 'poet', label: '诗人' },
  { value: 'emperor', label: '皇帝' },
  { value: 'military', label: '军事家' }
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<{ nickName?: string; avatarUrl?: string } | null>(null)

  useEffect(() => {
    const saved = storage.get<GameSettings>('game-settings')
    if (saved) {
      setSettings(saved)
    }

    const openid = storage.get<string>('wechat-openid')
    if (openid) {
      setIsLoggedIn(true)
      const savedUser = storage.get<{ nickName?: string; avatarUrl?: string }>('wechat-userinfo')
      if (savedUser) {
        setUserInfo(savedUser)
      }
    }
  }, [])

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    storage.set('game-settings', newSettings)
    Toast.show('设置已保存')
  }

  const handleLogin = async () => {
    if (!platform.isWeapp) {
      Toast.show('仅小程序支持微信登录')
      return
    }

    try {
      const { code } = await Taro.login()
      // 调用后端登录接口（后续实现）
      // const res = await request('/v1/auth/wechat', { code })
      // storage.set('wechat-openid', res.openid)
      // setIsLoggedIn(true)

      // 获取用户信息
      const userInfoRes = await Taro.getUserInfo()
      setUserInfo(userInfoRes.userInfo)
      storage.set('wechat-userinfo', userInfoRes.userInfo)
      setIsLoggedIn(true)
      Toast.show('登录成功')
    } catch (err) {
      Toast.show('登录失败')
    }
  }

  const handleLogout = () => {
    Dialog.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      onConfirm: () => {
        storage.remove('wechat-openid')
        storage.remove('wechat-userinfo')
        setIsLoggedIn(false)
        setUserInfo(null)
        Toast.show('已退出登录')
      }
    })
  }

  const handleClearData = () => {
    Dialog.confirm({
      title: '清除数据',
      content: '确定要清除所有本地数据吗？包括游戏进度和设置。',
      onConfirm: () => {
        storage.clear()
        setSettings(DEFAULT_SETTINGS)
        setIsLoggedIn(false)
        setUserInfo(null)
        Toast.show('数据已清除')
      }
    })
  }

  return (
    <View className="settings-page">
      <CellGroup title="游戏设置">
        <Cell
          title="提问次数上限"
          extra={
            <Input
              value={settings.questionLimit.toString()}
              type="number"
              style={{ width: '100px' }}
              onChange={(val) => updateSetting('questionLimit', parseInt(val, 10) || 20)}
            />
          }
        />
        <Cell title="语音播报" extra={<Switch checked={settings.voiceMode} onChange={(val) => updateSetting('voiceMode', val)} />} />
      </CellGroup>

      {platform.isWeapp && (
        <CellGroup title="微信登录">
          {isLoggedIn && userInfo ? (
            <Cell
              title={userInfo.nickName || '已登录'}
              extra={<Avatar src={userInfo.avatarUrl} size="small" />}
            />
          ) : (
            <Cell title="点击登录" onClick={handleLogin} />
          )}
          {isLoggedIn && (
            <Cell title="退出登录" onClick={handleLogout} />
          )}
        </CellGroup>
      )}

      <CellGroup title="其他">
        <Cell title="清除本地数据" onClick={handleClearData} />
      </CellGroup>

      <View className="settings-footer">
        <Button type="default" onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: 更新设置页面样式 src-taro/pages/settings/settings.scss**

```scss
.settings-page {
  padding: 20px;
  background: #f5f5f5;
}

.settings-footer {
  margin-top: 40px;
  padding: 20px;
}
```

- [ ] **Step 4: Commit**

```bash
git add src-taro/pages/result/ src-taro/pages/settings/
git commit -m "feat: implement result and settings pages

- Result page with win/lose states
- Settings page with game options
- WeChat login integration (pending backend)
- Clear data functionality

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 实现语音适配层

**Files:**
- Create: `src-taro/lib/voiceAdapter.ts`

- [ ] **Step 1: 创建语音适配层 src-taro/lib/voiceAdapter.ts**

```typescript
// src-taro/lib/voiceAdapter.ts
import Taro from '@tarojs/taro'
import { platform } from '../utils/platform'
import { request } from './gameApi'

// Web Speech Recognition (H5)
declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

class WebSpeechRecognition {
  private recognition: any = null
  private isListening = false

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.recognition.lang = 'zh-CN'
      this.recognition.continuous = false
      this.recognition.interimResults = false
    }
  }

  start(onResult: (text: string) => void, onError: (error: string) => void) {
    if (!this.recognition) {
      onError('浏览器不支持语音识别')
      return
    }

    this.isListening = true
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
      this.isListening = false
    }

    this.recognition.onerror = (event: any) => {
      onError(event.error)
      this.isListening = false
    }

    this.recognition.start()
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }
}

class WeappVoiceService {
  private recorder: any = null

  startRecording(onStop: (filePath: string) => void, onError: (error: string) => void) {
    this.recorder = Taro.getRecorderManager()

    this.recorder.onStop((res: any) => {
      onStop(res.tempFilePath)
    })

    this.recorder.onError((err: any) => {
      onError(err.errMsg)
    })

    this.recorder.start({
      format: 'mp3',
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1
    })
  }

  stopRecording() {
    if (this.recorder) {
      this.recorder.stop()
    }
  }

  async transcribe(filePath: string): Promise<string> {
    // 上传音频到后端 ASR 服务
    const uploadRes = await Taro.uploadFile({
      url: '/v1/voice/transcribe',
      filePath,
      name: 'audio'
    })

    const data = JSON.parse(uploadRes.data)
    return data.text
  }

  async synthesize(text: string): Promise<string> {
    // 获取 TTS 音频 URL
    const res = await request('/v1/voice/synthesize', {
      method: 'POST',
      data: { text }
    })
    return res.audioUrl
  }

  async playAudio(url: string) {
    const audio = Taro.createInnerAudioContext()
    audio.src = url
    audio.play()
    return new Promise<void>((resolve) => {
      audio.onEnded(() => {
        audio.destroy()
        resolve()
      })
    })
  }
}

// 跨平台语音服务
export const voiceService = {
  // 语音输入
  input: {
    start: (
      onResult: (text: string) => void,
      onError: (error: string) => void
    ) => {
      if (platform.isH5) {
        const webSpeech = new WebSpeechRecognition()
        webSpeech.start(onResult, onError)
        return webSpeech
      } else {
        const weapp = new WeappVoiceService()
        weapp.startRecording(async (filePath) => {
          try {
            const text = await weapp.transcribe(filePath)
            onResult(text)
          } catch (err) {
            onError(err instanceof Error ? err.message : '识别失败')
          }
        }, onError)
        return weapp
      }
    },
    stop: (service: any) => {
      if (platform.isH5) {
        (service as WebSpeechRecognition).stop()
      } else {
        (service as WeappVoiceService).stopRecording()
      }
    }
  },

  // 语音播报
  output: {
    speak: async (text: string) => {
      if (platform.isH5) {
        // Web speechSynthesis
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'zh-CN'
        speechSynthesis.speak(utterance)
      } else {
        // 小程序 TTS
        const weapp = new WeappVoiceService()
        const audioUrl = await weapp.synthesize(text)
        await weapp.playAudio(audioUrl)
      }
    },
    stop: () => {
      if (platform.isH5) {
        speechSynthesis.cancel()
      }
      // 小程序音频在 playAudio 中会自动销毁
    }
  },

  // 平台能力判断
  capabilities: {
    canInput: platform.isH5 || platform.isWeapp,
    canOutput: platform.isH5 || platform.isWeapp
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src-taro/lib/voiceAdapter.ts
git commit -m "feat: implement cross-platform voice adapter

- Web Speech Recognition for H5
- RecorderManager + ASR/TTS for weapp
- Unified voice service interface

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 后端新增微信登录接口

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/services/authService.ts`
- Create: `server/src/schemas/authSchemas.ts`

- [ ] **Step 1: 创建认证 Schema server/src/schemas/authSchemas.ts**

```typescript
// server/src/schemas/authSchemas.ts
import { z } from 'zod'

export const wechatLoginSchema = z.object({
  code: z.string().min(1, 'code 不能为空')
})

export type WechatLoginRequest = z.infer<typeof wechatLoginSchema>

export const wechatLoginResponseSchema = z.object({
  openid: z.string(),
  isNewUser: z.boolean()
})

export type WechatLoginResponse = z.infer<typeof wechatLoginResponseSchema>
```

- [ ] **Step 2: 创建认证服务 server/src/services/authService.ts**

```typescript
// server/src/services/authService.ts
import { loadEnv } from '../config/env.js'

interface WechatSessionResponse {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export class AuthService {
  private appId: string
  private appSecret: string

  constructor() {
    const env = loadEnv()
    // 需要新增环境变量配置
    this.appId = process.env.WECHAT_APPID || ''
    this.appSecret = process.env.WECHAT_SECRET || ''
  }

  async loginWithCode(code: string): Promise<{ openid: string; isNewUser: boolean }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`

    const res = await fetch(url)
    const data = await res.json() as WechatSessionResponse

    if (data.errcode) {
      throw new Error(`微信登录失败: ${data.errmsg}`)
    }

    // TODO: 检查用户是否已存在（isNewUser）
    return {
      openid: data.openid,
      isNewUser: true
    }
  }
}

export function createAuthService(): AuthService {
  return new AuthService()
}
```

- [ ] **Step 3: 创建认证路由 server/src/routes/auth.ts**

```typescript
// server/src/routes/auth.ts
import type { FastifyInstance } from 'fastify'
import { wechatLoginSchema } from '../schemas/authSchemas.js'
import { AuthService } from '../services/authService.js'

export async function registerAuthRoutes(app: FastifyInstance, authService: AuthService): Promise<void> {
  app.post('/v1/auth/wechat', async (request, reply) => {
    const body = wechatLoginSchema.parse(request.body)
    const result = await authService.loginWithCode(body.code)
    return reply.code(200).send(result)
  })
}
```

- [ ] **Step 4: 在 app.ts 注册路由**

修改 `server/src/app.ts`，添加：
```typescript
import { createAuthService } from './services/authService.js'
import { registerAuthRoutes } from './routes/auth.js'

// 在 buildApp 中添加
const authService = createAuthService()
await registerAuthRoutes(app, authService)
```

- [ ] **Step 5: 添加环境变量配置**

修改 `server/src/config/env.ts`，添加：
```typescript
wechatAppId: z.string().optional(),
wechatSecret: z.string().optional()
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/auth.ts server/src/services/authService.ts server/src/schemas/authSchemas.ts
git commit -m "feat: add WeChat login API endpoint

- jscode2session integration
- Auth routes and service
- Environment config for appid/secret

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: 后端新增语音接口

**Files:**
- Create: `server/src/routes/voice.ts`
- Create: `server/src/services/voiceService.ts`
- Create: `server/src/schemas/voiceSchemas.ts`

- [ ] **Step 1: 创建语音 Schema server/src/schemas/voiceSchemas.ts**

```typescript
// server/src/schemas/voiceSchemas.ts
import { z } from 'zod'

export const transcribeSchema = z.object({
  audio: z.any() // 文件上传
})

export const synthesizeSchema = z.object({
  text: z.string().min(1, 'text 不能为空')
})

export type SynthesizeRequest = z.infer<typeof synthesizeSchema>

export const transcribeResponseSchema = z.object({
  text: z.string()
})

export const synthesizeResponseSchema = z.object({
  audioUrl: z.string()
})
```

- [ ] **Step 2: 创建语音服务 server/src/services/voiceService.ts`

```typescript
// server/src/services/voiceService.ts'
import { loadEnv } from '../config/env.js'

// ASR/TTS 服务配置
// 可选: 百度语音、讯飞语音、阿里云语音
interface VoiceConfig {
  asrProvider: 'baidu' | 'xunfei' | 'aliyun'
  ttsProvider: 'baidu' | 'xunfei' | 'aliyun'
  apiKey: string
  apiSecret: string
  appId?: string
}

export class VoiceService {
  private config: VoiceConfig

  constructor() {
    const env = loadEnv()
    this.config = {
      asrProvider: (process.env.VOICE_ASR_PROVIDER as VoiceConfig['asrProvider']) || 'baidu',
      ttsProvider: (process.env.VOICE_TTS_PROVIDER as VoiceConfig['ttsProvider']) || 'baidu',
      apiKey: process.env.VOICE_API_KEY || '',
      apiSecret: process.env.VOICE_API_SECRET || '',
      appId: process.env.VOICE_APP_ID
    }
  }

  // 语音识别 (ASR)
  async transcribe(audioBuffer: Buffer): Promise<string> {
    // TODO: 根据配置调用对应 ASR 服务
    // 示例: 百度语音 API
    if (this.config.asrProvider === 'baidu') {
      return this.baiduASR(audioBuffer)
    }
    throw new Error('未配置 ASR 服务')
  }

  // 语音合成 (TTS)
  async synthesize(text: string): Promise<string> {
    // TODO: 根据配置调用对应 TTS 服务
    // 返回音频 URL
    if (this.config.ttsProvider === 'baidu') {
      return this.baiduTTS(text)
    }
    throw new Error('未配置 TTS 服务')
  }

  private async baiduASR(audioBuffer: Buffer): Promise<string> {
    // 百度语音识别 API 实现
    // 参考: https://ai.baidu.com/ai-doc/SPEECH/Nk38y8xlm
    throw new Error('待实现')
  }

  private async baiduTTS(text: string): Promise<string> {
    // 百度语音合成 API 实现
    // 参考: https://ai.baidu.com/ai-doc/SPEECH/Gk38y8xlm
    throw new Error('待实现')
  }
}

export function createVoiceService(): VoiceService {
  return new VoiceService()
}
```

- [ ] **Step 3: 创建语音路由 server/src/routes/voice.ts**

```typescript
// server/src/routes/voice.ts
import type { FastifyInstance } from 'fastify'
import { synthesizeSchema } from '../schemas/voiceSchemas.js'
import { VoiceService } from '../services/voiceService.js'
import { AppError } from '../lib/errors.js'
import multipart from '@fastify/multipart'

export async function registerVoiceRoutes(app: FastifyInstance, voiceService: VoiceService): Promise<void> {
  // 注册 multipart 插件用于文件上传
  await app.register(multipart)

  // 语音识别
  app.post('/v1/voice/transcribe', async (request, reply) => {
    const parts = request.parts()
    let audioBuffer: Buffer | null = null

    for await (const part of parts) {
      if (part.type === 'file') {
        audioBuffer = await part.toBuffer()
        break
      }
    }

    if (!audioBuffer) {
      throw new AppError(400, 'invalid_input', '未上传音频文件')
    }

    const text = await voiceService.transcribe(audioBuffer)
    return reply.code(200).send({ text })
  })

  // 语音合成
  app.post('/v1/voice/synthesize', async (request, reply) => {
    const body = synthesizeSchema.parse(request.body)
    const audioUrl = await voiceService.synthesize(body.text)
    return reply.code(200).send({ audioUrl })
  })
}
```

- [ ] **Step 4: 在 app.ts 注册路由**

```typescript
import { createVoiceService } from './services/voiceService.js'
import { registerVoiceRoutes } from './routes/voice.js'

// 在 buildApp 中添加
const voiceService = createVoiceService()
await registerVoiceRoutes(app, voiceService)
```

- [ ] **Step 5: 安装 multipart 插件**

```bash
cd server
npm install @fastify/multipart
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/voice.ts server/src/services/voiceService.ts server/src/schemas/voiceSchemas.ts server/package.json
git commit -m "feat: add voice ASR/TTS API endpoints

- Transcribe endpoint for audio upload
- Synthesize endpoint for TTS
- Placeholder for Baidu/Xunfei integration

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: 测试与验证

**Files:**
- Test: H5 编译
- Test: 小程序编译
- Test: 微信开发者工具预览

- [ ] **Step 1: 编译 H5 版本**

```bash
npm run taro:dev:h5
```

Expected: H5 版本运行在 localhost:10086

- [ ] **Step 2: 编译小程序版本**

```bash
npm run taro:dev
```

Expected: 编译产物在 `dist-taro/`

- [ ] **Step 3: 微信开发者工具预览**

打开微信开发者工具，导入项目，选择 `dist-taro/` 目录。

Expected: 小程序预览正常，页面可跳转。

- [ ] **Step 4: 测试游戏流程**

- 点击「开始游戏」
- 输入问题并提交
- 查看答案（是/不是）
- 输入猜测并提交
- 查看结果

- [ ] **Step 5: 测试分享功能**

在游戏页点击右上角「...」分享，验证分享标题和封面。

- [ ] **Step 6: Commit 测试验证文档**

```bash
git add docs/
git commit -m "docs: verify Taro cross-platform build

- H5 and weapp compilation successful
- Game flow tested
- Share feature verified

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: 最终清理与文档更新

**Files:**
- Modify: `README.md`
- Create: 分享封面图 `src-taro/assets/share-cover.png`

- [ ] **Step 1: 更新 README.md**

添加 Taro 项目说明：

```markdown
## Taro 跨平台版本

本项目支持 H5 + 微信小程序双平台。

### Taro 开发

```bash
# H5 开发
npm run taro:dev:h5

# 小程序开发
npm run taro:dev

# 构建
npm run taro:build      # 小程序
npm run taro:build:h5   # H5
```

### 小程序配置

1. 在 `project.config.json` 中配置你的 AppID
2. 在微信后台配置 request 域名白名单
3. 配置语音服务（百度/讯飞）环境变量
```

- [ ] **Step 2: 准备分享封面图**

创建 `src-taro/assets/share-cover.png`，推荐尺寸 750x600px。

- [ ] **Step 3: Final commit**

```bash
git add README.md src-taro/assets/
git commit -m "docs: update README with Taro instructions

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 实施顺序总结

1. **Task 1**: Taro 项目初始化
2. **Task 2**: 复用核心业务逻辑
3. **Task 3**: 创建页面骨架
4. **Task 4**: 实现 UI 组件
5. **Task 5**: 实现游戏 Hook
6. **Task 6**: 完善游戏页面
7. **Task 7**: 完善结果和设置页面
8. **Task 8**: 实现语音适配层
9. **Task 9**: 后端微信登录接口
10. **Task 10**: 后端语音接口
11. **Task 11**: 测试与验证
12. **Task 12**: 最终清理与文档更新