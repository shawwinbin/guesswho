import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './game.scss'

export default function GamePage() {
  return (
    <View className="game-page">
      <View className="status-bar"><Text>游戏状态面板（待实现）</Text></View>
      <View className="game-content"><Text>游戏主界面（待实现）</Text></View>
    </View>
  )
}

GamePage.useShareAppMessage = () => ({
  title: '快来帮我猜历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})