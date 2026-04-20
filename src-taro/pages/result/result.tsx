import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './result.scss'

export default function ResultPage() {
  const handleRestart = () => Taro.redirectTo({ url: '/pages/game/game' })
  return (
    <View className="result-page">
      <View className="result-content">
        <Text className="result-title">游戏结束（待实现）</Text>
        <Button type="primary" onClick={handleRestart}>再来一局</Button>
      </View>
    </View>
  )
}

ResultPage.useShareAppMessage = () => ({
  title: '我猜出了历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})