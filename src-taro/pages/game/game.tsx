import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef } from 'react'
import { useGameSession } from '../../hooks/useGameSession'
import { QuestionForm } from '../../components/QuestionForm'
import { AnswerBadge } from '../../components/AnswerBadge'
import { SUGGESTED_QUESTIONS } from '../../lib/gameContent'
import { getLevelTitle, readLevelProgress } from '../../lib/levelProgress'
import { normalizeGameSettings } from '../../lib/gameRules'
import { extractGuessFromQuestion } from '../../lib/questionGuess'
import { storage } from '../../lib/storage'
import type { GameSettings } from '../../lib/types'
import './game.scss'

export default function GamePage() {
  const settings = normalizeGameSettings(storage.get<GameSettings>('game-settings'))
  const { state, isLoading, isRestoreComplete, startGame, askQuestion, makeGuess, requestAiHint, restart, clearError } = useGameSession(settings)
  const hasAttemptedInitialStartRef = useRef(false)
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

  const handleQuestionSubmit = async (question: string) => {
    const guess = extractGuessFromQuestion(question)

    if (guess) {
      await makeGuess(guess)
      return
    }

    await askQuestion(question)
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

      <View className="history-board mg-card">
        <ScrollView className="history-panel" scrollY scrollWithAnimation>
          {state.history.length === 0 ? (
            <View className="empty-history mg-card">
              <Text className="empty-history__title">还没有提问</Text>
              <Text className="empty-history__desc">先从“他是中国人吗？”开始吧</Text>
            </View>
          ) : (
            <View className="history-list">
              {state.history.map((item, idx) => (
                <View key={idx} className="history-item mg-card">
                  <View className="history-item__row">
                    <View className="history-item__index-shell">
                      <Text className="history-item__index">{`Q${idx + 1}`}</Text>
                    </View>
                    <View className="history-item__content">
                      <Text className="question">{item.question}</Text>
                    </View>
                  </View>
                  <AnswerBadge answer={item.answer} />
                </View>
              ))}
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
          {state.hints.length > 0 && (
            <View className="ai-hint-list">
              {state.hints.map((hint, idx) => (
                <Text key={idx} className="ai-hint-item">提示 {idx + 1}：{hint}</Text>
              ))}
            </View>
          )}
        </View>

        <QuestionForm
          onSubmit={handleQuestionSubmit}
          disabled={isLoading || (state.remainingQuestions !== null && state.remainingQuestions <= 0)}
          loading={isLoading}
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
