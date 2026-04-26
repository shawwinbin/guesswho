import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useGameSession } from '../../hooks/useGameSession'
import { QuestionForm } from '../../components/QuestionForm'
import { GuessForm } from '../../components/GuessForm'
import { AnswerBadge } from '../../components/AnswerBadge'
import { VoiceControls } from '../../components/VoiceControls'
import { useVoiceGame } from '../../hooks/useVoiceGame'
import { SUGGESTED_QUESTIONS } from '../../lib/gameContent'
import { getLevelHint, getLevelTitle, readLevelProgress } from '../../lib/levelProgress'
import { storage } from '../../lib/storage'
import { GameSettings } from '../../lib/types'
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
  const { state, isLoading, isRestoreComplete, startGame, askQuestion, makeGuess, restart, clearError } = useGameSession(settings)
  const voice = useVoiceGame({ onTranscript: (text) => askQuestion(text) })
  const [pendingGuess, setPendingGuess] = useState<string | null>(null)
  const activeLevel = state.level ?? readLevelProgress().currentLevel
  const levelTitle = getLevelTitle(activeLevel)
  const levelHint = getLevelHint(activeLevel)
  const currentGoal = `通关条件：在 ${settings.questionLimit} 次提问内猜中本关人物`
  const nextUnlockCopy = `胜利后解锁第${activeLevel + 1}关`

  useEffect(() => {
    if (!isRestoreComplete) return
    if (state.phase === 'idle') startGame(readLevelProgress().currentLevel)
  }, [isRestoreComplete, startGame, state.phase])

  useEffect(() => {
    if (state.phase === 'ended' && state.revealedName) {
      setPendingGuess(null)
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

  const handleGuessRequest = (guess: string) => {
    setPendingGuess(guess)
  }

  const handleConfirmGuess = async () => {
    if (!pendingGuess) return
    const guess = pendingGuess
    setPendingGuess(null)
    await makeGuess(guess)
  }

  return (
    <View className="game-page mini-game-page">
      <View className="game-header">
        <View className="game-header__menu mg-icon-button">
          <View className="game-header__menu-line" />
          <View className="game-header__menu-line" />
          <View className="game-header__menu-line" />
        </View>
        <View className="game-header__title-wrap">
          <Text className="game-header__title">HISTORY RIDDLES</Text>
          <Text className="game-header__subtitle">古韵猜猜看</Text>
        </View>
        <View className="game-header__help">
          <Text className="game-header__help-text">?</Text>
        </View>
      </View>

      <View className="level-hud mg-card">
        <View className="level-hud__top">
          <View className="level-hud__identity">
            <Text className="level-hud__tag">{`LEVEL ${activeLevel}`}</Text>
            <Text className="level-hud__title">{levelTitle}</Text>
          </View>
          <View className="level-hud__unlock">
            <Text className="level-hud__unlock-label">NEXT</Text>
            <Text className="level-hud__unlock-text">{nextUnlockCopy}</Text>
          </View>
        </View>
        <View className="level-hud__details">
          <View className="level-hud__detail">
            <Text className="level-hud__detail-label">难度提示</Text>
            <Text className="level-hud__detail-text">{levelHint}</Text>
          </View>
          <View className="level-hud__detail">
            <Text className="level-hud__detail-label">本关目标</Text>
            <Text className="level-hud__detail-text">{currentGoal}</Text>
          </View>
        </View>
      </View>

      <View className="status-bar">
        <View className="status-bar__counter">
          <Text className="status-bar__label">ROUND</Text>
          <Text className="status-bar__counter-text">{`${String(state.history.length).padStart(2, '0')}/${String(settings.questionLimit).padStart(2, '0')}`}</Text>
        </View>
        <View className="status-bar__hearts">
          <Text className="status-bar__hearts-label">LIFE</Text>
          <Text>♥</Text>
          <Text>♥</Text>
          <Text>♥</Text>
        </View>
        <View className="status-bar__restart" onClick={() => restart(activeLevel)}>
          <Text className="status-bar__restart-text">↻</Text>
        </View>
      </View>

      {state.remainingQuestions !== null && (
        <Text className="game-remaining">剩余提问次数：{state.remainingQuestions}</Text>
      )}

      {state.errorMsg && (
        <View className="error-banner">
          <Text className="error-banner__text">{state.errorMsg}</Text>
          <Text className="close-btn" onClick={clearError}>✕</Text>
        </View>
      )}

      <View className="hint-panel">
        <Text className="hint-panel__bulb">💡</Text>
        <View className="hint-panel__copy">
          <Text className="hint-panel__tag">QUEST TIP</Text>
          <Text className="hint">Ask questions that can only be answered with Yes or No.</Text>
          <Text className="hint-panel__subhint">请只提问“是”或“否”可以回答的问题</Text>
        </View>
      </View>

      <View className="history-board mg-card">
        <View className="history-board__cap">
          <Text className="history-board__cap-text">问答卷轴</Text>
          <Text className="history-board__cap-sub">历史线索记录</Text>
        </View>

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
                      <Text className="history-item__label">你的提问</Text>
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
        <View className="input-panel__header">
          <Text className="input-panel__title">操作台</Text>
          <Text className="input-panel__sub">提问、语音、最终猜测</Text>
        </View>

        <QuestionForm
          onSubmit={askQuestion}
          disabled={isLoading || (state.remainingQuestions !== null && state.remainingQuestions <= 0)}
          loading={isLoading}
          suggestions={SUGGESTED_QUESTIONS.slice(0, 3)}
          onSuggestionClick={(suggestion) => askQuestion(suggestion)}
        />

        <View className="voice-panel">
          <Text className="voice-panel__label">语音提问</Text>
          <VoiceControls
            onStartRecord={voice.startRecording}
            onStopRecord={voice.stopRecording}
            isRecording={voice.isRecording}
            disabled={isLoading}
            transcript={settings.voiceMode ? voice.transcript : undefined}
          />
        </View>

        <GuessForm onSubmit={handleGuessRequest} disabled={isLoading} loading={isLoading} />
      </View>

      {pendingGuess && (
        <View className="guess-modal">
          <View className="guess-modal__scrim" onClick={() => setPendingGuess(null)} />
          <View className="guess-modal__card mg-card">
            <View className="guess-modal__seal">印</View>
            <Text className="guess-modal__title">一锤定音</Text>
            <Text className="guess-modal__name-label">你猜的是：</Text>
            <View className="guess-modal__name-pill">
              <Text className="guess-modal__name">{pendingGuess}</Text>
            </View>
            <Text className="guess-modal__warning">提交后本局将结束，不可撤回哦</Text>

            <View className="guess-modal__actions">
              <View className="guess-modal__cancel mg-secondary-button" onClick={() => setPendingGuess(null)}>
                <Text className="guess-modal__cancel-text">再想想</Text>
              </View>
              <View className="guess-modal__confirm mg-primary-button" onClick={handleConfirmGuess}>
                <Text className="guess-modal__confirm-text">确认提交</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

GamePage.useShareAppMessage = () => ({
  title: '快来帮我猜历史人物！',
  path: '/pages/index/index',
  imageUrl: '/assets/share-cover.png'
})
