import { View, Text, ScrollView } from '@tarojs/components'
import { Button, Empty, Loading } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'
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
  const settings = storage.get<GameSettings>('game-settings') || DEFAULT_SETTINGS
  const { state, isLoading, startGame, askQuestion, makeGuess, restart, clearError } = useGameSession(settings)
  const voice = useVoiceGame({ onTranscript: (text) => askQuestion(text) })

  useEffect(() => {
    if (state.phase === 'idle') startGame()
  }, [])

  useEffect(() => {
    if (state.phase === 'ended' && state.revealedName) {
      Taro.navigateTo({
        url: `/pages/result/result?winner=${state.isWinner}&name=${state.revealedName}&count=${state.history.length}`
      })
    }
  }, [state.phase, state.isWinner, state.revealedName])

  if (state.phase === 'loading' && !state.sessionId) {
    return (
      <View className="game-page loading">
        <Loading text="正在选择人物..." />
      </View>
    )
  }

  return (
    <View className="game-page">
      <View className="status-bar">
        <Text className="status-item">已提问 {state.history.length} 次</Text>
        {state.remainingQuestions !== null && (
          <Text className="status-item">剩余 {state.remainingQuestions} 次</Text>
        )}
        <Button size="small" type="default" onClick={restart}>重新开始</Button>
      </View>

      {state.errorMsg && (
        <View className="error-banner">
          <Text>{state.errorMsg}</Text>
          <Text className="close-btn" onClick={clearError}>✕</Text>
        </View>
      )}

      <View className="hint-panel">
        <Text className="hint">💡 请问可以用「是」或「不是」回答的问题</Text>
      </View>

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

      <View className="input-panel">
        <QuestionForm
          onSubmit={askQuestion}
          disabled={isLoading || (state.remainingQuestions !== null && state.remainingQuestions <= 0)}
          loading={isLoading}
          suggestions={SUGGESTED_QUESTIONS.slice(0, 4)}
          onSuggestionClick={(s) => askQuestion(s)}
        />
        <GuessForm onSubmit={makeGuess} disabled={isLoading} loading={isLoading} />
      </View>
    </View>
  )
}

GamePage.useShareAppMessage = () => ({
  title: '快来帮我猜历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})