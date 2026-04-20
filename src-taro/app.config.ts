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