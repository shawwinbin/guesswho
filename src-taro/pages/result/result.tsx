import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
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

  const handleRestart = () => Taro.redirectTo({ url: '/pages/game/game' })
  const handleBackHome = () => Taro.redirectTo({ url: '/pages/index/index' })

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
          <Button type="primary" size="large" onClick={handleRestart}>再来一局</Button>
          <Button type="default" size="large" onClick={handleBackHome}>返回首页</Button>
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