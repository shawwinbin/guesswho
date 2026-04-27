import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { useGameSession } from '../../hooks/useGameSession'
import { QuestionForm } from '../../components/QuestionForm'
import { SUGGESTED_QUESTIONS } from '../../lib/gameContent'
import { getLevelTitle, readLevelProgress } from '../../lib/levelProgress'
import { normalizeGameSettings } from '../../lib/gameRules'
import { storage } from '../../lib/storage'
import type { GameSettings } from '../../lib/types'
import './game.scss'

export default function GamePage() {
  const settings = normalizeGameSettings(storage.get<GameSettings>('game-settings'))
  const { state, isLoading, isRestoreComplete, startGame, askQuestion, makeGuess, classifyQuestionIntent, requestAiHint, restart, clearError } = useGameSession(settings)
  const hasAttemptedInitialStartRef = useRef(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const levelProgress = readLevelProgress()
  const activeLevel = state.level ?? levelProgress.currentLevel
  const levelTitle = getLevelTitle(activeLevel)
  const isReplayingUnlockedLevel = levelProgress.highestUnlockedLevel > activeLevel
  const progressCopy = isReplayingUnlockedLevel
    ? `当前已解锁至第${levelProgress.highestUnlockedLevel}关`
    : `胜利后解锁第${activeLevel + 1}关`

  useEffect(() => {
    if (!isRestoreComplete) return
    if (hasAttemptedInitialStartRef.current) return

    hasAttemptedInitialStartRef.current = true

    if (state.phase === 'idle') {
      startGame(readLevelProgress().currentLevel)
    }
  }, [isRestoreComplete, startGame, state.phase])

  useEffect(() => {
    if (state.phase === 'ended' && state.revealedName) {
      Taro.navigateTo({
        url: `/pages/result/result?winner=${state.isWinner}&name=${state.revealedName}&count=${state.history.length}&level=${state.level}`
      })
    }
  }, [state.history.length, state.isWinner, state.level, state.phase, state.revealedName])

  if (state.phase === 'loading' && !state.sessionId) {
    return (
      <View className="game-page mini-game-page game-page--loading">
        <View className="game-loading-card mg-card">
          <Text className="game-loading-card__title">正在翻开卷轴…</Text>
          <Text className="game-loading-card__desc">历史人物即将登场</Text>
        </View>
      </View>
    )
  }

  const historyBottomId = pendingQuestion ? 'history-pending-bottom' : 'history-bottom'

  const handleQuestionSubmit = async (question: string) => {
    if (pendingQuestion) return

    setPendingQuestion(question)
    try {
      const intent = await classifyQuestionIntent(question)
      const response = await askQuestion(question)

      if (intent.type === 'guess' && response?.answer === '是' && response.status !== 'ended') {
        await makeGuess(intent.guess)
      }
    } finally {
      setPendingQuestion(null)
    }
  }

  return (
    <View className="game-page mini-game-page">
      <View className="game-header">
        <View className="game-header__back" onClick={() => Taro.redirectTo({ url: '/pages/index/index' })}>
          <Text className="game-header__back-icon">←</Text>
        </View>
        <View className="game-header__title-wrap">
          <Text className="game-header__title">第{activeLevel}关 · {levelTitle}</Text>
          <Text className="game-header__subtitle">{progressCopy}</Text>
        </View>
        <View className="game-header__counter">
          <Text className="game-header__counter-text">{`${String(state.history.length).padStart(2, '0')}/${String(settings.questionLimit).padStart(2, '0')}`}</Text>
        </View>
      </View>

      {state.errorMsg && (
        <View className="error-banner">
          <Text className="error-banner__text">{state.errorMsg}</Text>
          <Text className="close-btn" onClick={clearError}>✕</Text>
        </View>
      )}

      <View className="history-board">
        <ScrollView className="history-panel" scrollY scrollWithAnimation scrollIntoView={historyBottomId}>
          {state.history.length === 0 && state.hints.length === 0 && !pendingQuestion ? (
            <View className="empty-history mg-card">
              <Text className="empty-history__title">还没有提问</Text>
              <Text className="empty-history__desc">先从“他是中国人吗？”开始吧</Text>
            </View>
          ) : (
            <View className="history-list">
              {state.history.map((item, idx) => (
                <View key={idx} className="chat-turn">
                  <View className="chat-message chat-message--user">
                    <Text className="chat-message__meta">{`Q${idx + 1}`}</Text>
                    <Text className="chat-message__bubble">{item.question}</Text>
                  </View>
                  <View className={`chat-message chat-message--ai chat-message--${item.answer === '是' ? 'yes' : 'no'}`}>
                    <Text className="chat-message__meta">AI</Text>
                    <Text className="chat-message__bubble">{item.answer}</Text>
                  </View>
                </View>
              ))}
              {state.hints.map((hint, idx) => (
                <View key={`hint-${idx}`} className="chat-message chat-message--ai chat-message--hint">
                  <Text className="chat-message__meta">提示</Text>
                  <Text className="chat-message__bubble">{`提示 ${idx + 1}：${hint}`}</Text>
                </View>
              ))}
              {pendingQuestion && (
                <View className="chat-turn" id="history-pending-bottom">
                  <View className="chat-message chat-message--user">
                    <Text className="chat-message__meta">{`Q${state.history.length + 1}`}</Text>
                    <Text className="chat-message__bubble">{pendingQuestion}</Text>
                  </View>
                  <View className="chat-message chat-message--ai chat-message--thinking">
                    <Text className="chat-message__meta">AI</Text>
                    <Text className="chat-message__bubble">AI 思考中…</Text>
                  </View>
                </View>
              )}
              <View id="history-bottom" className="history-bottom-anchor" />
            </View>
          )}
        </ScrollView>
      </View>

      <View className="input-panel mg-card">
        <View className="ai-hints">
          <View className="input-panel__topline">
            <Text className="input-panel__topline-text">剩余 {state.remainingQuestions ?? settings.questionLimit} 次提问</Text>
            <View className="input-panel__restart" onClick={() => restart(activeLevel)}>
              <Text className="input-panel__restart-text">重开</Text>
            </View>
          </View>
          <View
            className={`ai-hint-button ${state.remainingHints <= 0 || isLoading ? 'ai-hint-button--disabled' : ''}`}
            onClick={() => {
              if (state.remainingHints <= 0 || isLoading) return
              requestAiHint()
            }}
          >
            <Text className="ai-hint-button__text">AI 提示（剩余 {state.remainingHints} 次）</Text>
          </View>
        </View>

        <QuestionForm
          onSubmit={handleQuestionSubmit}
          disabled={isLoading || pendingQuestion !== null || (state.remainingQuestions !== null && state.remainingQuestions <= 0)}
          loading={pendingQuestion !== null}
          suggestions={SUGGESTED_QUESTIONS.slice(0, 3)}
          onSuggestionClick={handleQuestionSubmit}
        />
      </View>
    </View>
  )
}

GamePage.useShareAppMessage = () => ({
  title: '快来帮我猜历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})
