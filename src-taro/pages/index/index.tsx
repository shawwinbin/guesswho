import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './index.scss'

export default function IndexPage() {
  const handleStart = () => Taro.navigateTo({ url: '/pages/game/game' })
  const handleSettings = () => Taro.navigateTo({ url: '/pages/settings/settings' })

  return (
    <View className="index-page">
      <View className="header">
        <Text className="title">历史人物猜谜</Text>
        <Text className="subtitle">AI 秘密选择一位历史人物，你来猜是谁</Text>
      </View>
      <View className="intro">
        <Text className="intro-text">通过提问只能回答「是」或「不是」的问题，逐步缩小范围，最终猜出历史人物！</Text>
      </View>
      <View className="actions">
        <Button type="primary" size="large" onClick={handleStart}>开始游戏</Button>
        <Button type="default" size="large" onClick={handleSettings}>设置</Button>
      </View>
    </View>
  )
}