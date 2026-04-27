import './App.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GameBoard } from './components/GameBoard'
import { ResultScreen } from './components/ResultScreen'
import { SettingsPanel } from './components/SettingsPanel'
import { StartScreen } from './components/StartScreen'
import { VoiceInputButton, VoiceStatusIndicator } from './components/VoiceControls'
import { SUGGESTED_QUESTIONS, getFigureScopeLabel } from './lib/gameContent'
import { loadSettings, saveSettings } from './lib/llmClient'
import { parseVoiceIntent } from './lib/voiceIntent'
import { useGameSession } from './lib/useGameSession'
import { useVoiceGameController } from './lib/useVoiceGameController'
import { useVoiceInput } from './lib/useVoiceInput'
import { useSpeechSynthesis } from './lib/useSpeechSynthesis'
import type { GameSettings } from './lib/types'

function requiresManualContinuousVoiceStart(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    return true
  }

  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
}

function getContinuousVoiceHelpLabel(
  errorCode: ReturnType<typeof useVoiceInput>['errorCode'],
  manualContinuousVoiceStartRequired: boolean,
): string | null {
  switch (errorCode) {
    case 'permission-denied':
      return manualContinuousVoiceStartRequired
        ? '请先在浏览器地址栏或系统设置里允许麦克风，再点一次“开始连续语音对话”。'
        : '请在浏览器地址栏或系统设置里允许麦克风，然后重新开始收听。'
    case 'service-unavailable':
      return '当前浏览器的语音识别服务暂时不可用。移动端建议切到 Safari 或 Chrome 后重试。'
    case 'audio-capture':
      return '没有检测到可用麦克风。请检查系统录音权限、耳机连接或其他 App 的麦克风占用。'
    case 'network':
      return '语音识别依赖网络连接。请确认当前网络可用后再试。'
    default:
      return null
  }
}

function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [question, setQuestion] = useState('')
  const [guess, setGuess] = useState('')
  const submitQuestionRef = useRef<(text: string) => void>(() => {})
  const submitGuessRef = useRef<(text: string) => void>(() => {})
  const restartGameRef = useRef<() => void>(() => {})
  const lastSpokenTextRef = useRef('')

  const questionVoice = useVoiceInput()
  const guessVoice = useVoiceInput()
  const speech = useSpeechSynthesis()

  const voiceModeEnabled = settings.voiceMode && questionVoice.isSupported && guessVoice.isSupported && speech.isSupported
  const continuousVoiceModeEnabled = voiceModeEnabled && settings.continuousVoiceMode
  const manualContinuousVoiceStartRequired = continuousVoiceModeEnabled && requiresManualContinuousVoiceStart()
  const autoStartContinuousVoiceEnabled = continuousVoiceModeEnabled && !manualContinuousVoiceStartRequired

  const speakAndRemember = useCallback((text: string) => {
    lastSpokenTextRef.current = text
    speech.speak(text)
  }, [speech])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const {
    game,
    isLoading,
    pendingAutoListenTarget,
    setPendingAutoListenTarget,
    remainingQuestions,
    isLimitExhausted,
    revealedName,
    questionLimit,
    startGame: startSession,
    restartGame: restartSession,
    submitQuestion: submitSessionQuestion,
    submitGuess: submitSessionGuess,
    clearError,
  } = useGameSession({
    settings,
    voiceModeEnabled,
    continuousVoiceModeEnabled,
    autoStartContinuousVoiceEnabled,
    speech: {
      speak: speakAndRemember,
      cancel: speech.cancel,
    },
  })

  const { voiceTarget, setVoiceTarget, activeVoice } = useVoiceGameController({
    voiceModeEnabled,
    continuousVoiceModeEnabled,
    gamePhase: game.phase,
    isLoading,
    speechState: speech.state,
    pendingAutoListenTarget,
    setPendingAutoListenTarget,
    questionVoice,
    guessVoice,
  })

  const resetInputs = useCallback(() => {
    setQuestion('')
    setGuess('')
    setVoiceTarget(null)
    setPendingAutoListenTarget(null)
    questionVoice.resetTranscript()
    guessVoice.resetTranscript()
  }, [questionVoice, guessVoice])

  const startGame = useCallback(async () => {
    resetInputs()
    await startSession()
  }, [resetInputs, startSession])

  const restartGame = useCallback(() => {
    resetInputs()
    void restartSession()
  }, [resetInputs, restartSession])

  const startContinuousVoiceConversation = useCallback(() => {
    if (questionVoice.state === 'listening') {
      questionVoice.stopListening()
      setVoiceTarget(null)
      setPendingAutoListenTarget(null)
      return
    }

    speech.cancel()
    setPendingAutoListenTarget(null)
    setVoiceTarget('question')
    questionVoice.resetTranscript()
    questionVoice.startListening()
  }, [questionVoice, setPendingAutoListenTarget, setVoiceTarget, speech])

  const submitQuestion = useCallback(async (questionText: string) => {
    const askedQuestion = questionText.trim()
    if (!askedQuestion) return
    setQuestion('')
    await submitSessionQuestion(askedQuestion)
  }, [submitSessionQuestion])

  const submitGuess = useCallback(async (guessText: string) => {
    const currentGuess = guessText.trim()
    if (!currentGuess) return
    setGuess('')
    await submitSessionGuess(currentGuess)
  }, [submitSessionGuess])

  // Update refs for voice handlers
  useEffect(() => {
    submitQuestionRef.current = submitQuestion
    submitGuessRef.current = submitGuess
    restartGameRef.current = restartGame
  }, [restartGame, submitQuestion, submitGuess])

  const handleAskQuestion = useCallback(async (questionText?: string) => {
    const askedQuestion = (questionText ?? question).trim()
    await submitQuestion(askedQuestion)
  }, [question, submitQuestion])

  const handleGuess = useCallback(async () => {
    await submitGuess(guess)
  }, [guess, submitGuess])

  const handleQuestionVoiceResult = useCallback((transcript: string) => {
    if (continuousVoiceModeEnabled) {
      const intent = parseVoiceIntent(transcript)
      setVoiceTarget(null)

      if (intent.type === 'control') {
        if (intent.command === 'restart') {
          void restartGameRef.current()
          return
        }

        if (intent.command === 'repeat') {
          if (game.phase === 'playing' && lastSpokenTextRef.current) {
            setPendingAutoListenTarget('question')
            speakAndRemember(lastSpokenTextRef.current)
          } else if (game.phase === 'playing') {
            setPendingAutoListenTarget('question')
          }
          return
        }

        if (intent.command === 'exit-continuous-mode') {
          questionVoice.stopListening()
          guessVoice.stopListening()
          setPendingAutoListenTarget(null)
          setSettings(prev => ({
            ...prev,
            continuousVoiceMode: false,
          }))
          speakAndRemember('已退出连续语音对话。')
          return
        }
      }

      if (intent.type === 'guess') {
        void submitGuessRef.current(intent.guess)
        return
      }

      if (intent.type === 'question') {
        void submitQuestionRef.current(intent.question)
        return
      }
    }

    if (voiceModeEnabled) {
      setVoiceTarget(null)
      void submitQuestionRef.current(transcript)
    } else {
      setQuestion(transcript)
      setVoiceTarget(null)
    }
  }, [continuousVoiceModeEnabled, game.phase, guessVoice, questionVoice, setPendingAutoListenTarget, speakAndRemember, voiceModeEnabled])

  const handleGuessVoiceResult = useCallback((transcript: string) => {
    if (voiceModeEnabled) {
      setVoiceTarget(null)
      void submitGuessRef.current(transcript)
    } else {
      setGuess(transcript)
      setVoiceTarget(null)
    }
  }, [voiceModeEnabled])

  const figureScopeLabel = getFigureScopeLabel(settings.figureScope)
  const continuousVoiceStatusLabel = !continuousVoiceModeEnabled
    ? null
    : speech.state === 'speaking'
      ? 'AI 正在语音回答，播报结束后会继续收听'
      : questionVoice.state === 'error'
        ? `语音暂时出错${questionVoice.error ? `：${questionVoice.error}` : ''}`
        : questionVoice.state === 'listening'
          ? '正在收听，请直接说问题或人名'
          : isLoading
            ? '正在处理你的上一句，请稍候'
            : manualContinuousVoiceStartRequired && voiceTarget !== 'question'
              ? '等待点击开始连续语音对话'
              : pendingAutoListenTarget === 'question'
                ? '准备恢复收听...'
                : '等待你的下一句'
  const continuousVoiceHelpLabel = !continuousVoiceModeEnabled
    ? null
    : getContinuousVoiceHelpLabel(questionVoice.errorCode, manualContinuousVoiceStartRequired)

  return (
    <div className="app">
      <header>
        <h1>历史人物猜谜</h1>
        <button className="settings-toggle" onClick={() => setShowSettings(value => !value)} aria-label="设置">
          ⚙️
        </button>
      </header>

      {showSettings && (
        <SettingsPanel settings={settings} onSettingsChange={setSettings} onClose={() => setShowSettings(false)} />
      )}

      {voiceModeEnabled && game.phase !== 'idle' && (
        <div className="voice-mode-indicator">
          🔊 语音模式已开启
          {continuousVoiceModeEnabled && ' | 连续对话中'}
          {speech.state === 'speaking' && ' - 正在播放...'}
        </div>
      )}

      {game.errorMsg && (
        <div className="error-banner">
          {game.errorMsg}
          <button onClick={clearError}>✕</button>
        </div>
      )}

      <main>
        {game.phase === 'idle' && (
          <StartScreen
            voiceModeEnabled={voiceModeEnabled}
            continuousVoiceModeEnabled={continuousVoiceModeEnabled}
            questionLimit={settings.questionLimit}
            figureScopeLabel={figureScopeLabel}
            isLoading={isLoading}
            onStart={() => void startGame()}
          />
        )}

        {game.phase === 'loading' && (
          <div className="loading-screen">
            <h2>正在选择人物...</h2>
            <p>AI 正在秘密挑选一位历史人物，请稍候。</p>
          </div>
        )}

        {game.phase === 'playing' && (
          <GameBoard
            history={game.history}
            remainingQuestions={remainingQuestions}
            isLoading={isLoading}
            isLimitExhausted={isLimitExhausted}
            suggestedQuestions={SUGGESTED_QUESTIONS}
            continuousVoiceModeEnabled={continuousVoiceModeEnabled}
            continuousVoiceRequiresManualStart={manualContinuousVoiceStartRequired}
            continuousVoiceStatusLabel={continuousVoiceStatusLabel}
            continuousVoiceHelpLabel={continuousVoiceHelpLabel}
            activeVoiceStatus={activeVoice ? <VoiceStatusIndicator voice={activeVoice} voiceMode={voiceModeEnabled} /> : null}
            questionInput={question}
            guessInput={guess}
            questionVoiceButton={(
              manualContinuousVoiceStartRequired ? (
                <div className="continuous-voice-entry">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={startContinuousVoiceConversation}
                    disabled={isLoading || isLimitExhausted || speech.state === 'speaking'}
                    aria-label="开始连续语音对话"
                  >
                    {questionVoice.state === 'listening' ? '停止连续语音对话' : '开始连续语音对话'}
                  </button>
                  <VoiceInputButton
                    voice={questionVoice}
                    target="question"
                    currentTarget={voiceTarget}
                    onTargetChange={setVoiceTarget}
                    onVoiceResult={handleQuestionVoiceResult}
                    disabled={isLoading || isLimitExhausted}
                    voiceMode={voiceModeEnabled}
                  />
                </div>
              ) : (
                <VoiceInputButton
                  voice={questionVoice}
                  target="question"
                  currentTarget={voiceTarget}
                  onTargetChange={setVoiceTarget}
                  onVoiceResult={handleQuestionVoiceResult}
                  disabled={isLoading || isLimitExhausted}
                  voiceMode={voiceModeEnabled}
                />
              )
            )}
            guessVoiceButton={(
              <VoiceInputButton
                voice={guessVoice}
                target="guess"
                currentTarget={voiceTarget}
                onTargetChange={setVoiceTarget}
                onVoiceResult={handleGuessVoiceResult}
                disabled={isLoading}
                voiceMode={voiceModeEnabled}
              />
            )}
            onRestart={restartGame}
            onAskQuestion={questionText => void handleAskQuestion(questionText)}
            onQuestionChange={setQuestion}
            onQuestionSubmit={() => void handleAskQuestion()}
            onQuestionFocus={() => setVoiceTarget('question')}
            onGuessChange={setGuess}
            onGuessSubmit={() => void handleGuess()}
            onGuessFocus={() => setVoiceTarget('guess')}
          />
        )}

        {game.phase === 'ended' && (
          <ResultScreen
            endReason={game.endReason}
            isWinner={game.isWinner}
            revealedName={revealedName}
            lastGuess={game.guesses[game.guesses.length - 1]}
            questionCount={game.history.length}
            questionLimit={questionLimit}
            voiceModeEnabled={voiceModeEnabled}
            onRestart={restartGame}
          />
        )}
      </main>
    </div>
  )
}

export default App
