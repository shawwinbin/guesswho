import { useCallback, useEffect, useState } from 'react'
import {
  buildAnswerAnnouncement,
  buildCorrectGuessAnnouncement,
  buildGuessFailureAnnouncement,
  buildLimitReachedAnnouncement,
  buildStartAnnouncement,
  buildStartFailureAnnouncement,
  buildSubmitGuessFailureAnnouncement,
  buildSubmitQuestionFailureAnnouncement,
} from './gameAnnouncements'
import { createSession, fetchSession, submitGuess as submitGuessRequest, submitQuestion as submitQuestionRequest } from './gameApi'
import type { GameSessionSnapshot, GameSettings, GuessRecord, QuestionAnswer, YesNoAnswer } from './types'

export type GamePhase = 'idle' | 'loading' | 'playing' | 'ended'
export type EndReason = 'guess' | 'limit' | null
export type EffectiveMode = 'ai'
export type VoiceTarget = 'question' | 'guess' | null

export interface GameSessionState {
  sessionId: string | null
  phase: GamePhase
  history: QuestionAnswer[]
  guesses: string[]
  isWinner: boolean
  errorMsg: string | null
  endReason: EndReason
  revealedName: string | null
}

interface UseGameSessionParams {
  settings: GameSettings
  voiceModeEnabled: boolean
  continuousVoiceModeEnabled: boolean
  autoStartContinuousVoiceEnabled: boolean
  speech: {
    speak: (text: string) => void
    cancel: () => void
  }
}

const SESSION_STORAGE_KEY = 'history-figure-guess-session-id'

const INITIAL_GAME_STATE: GameSessionState = {
  sessionId: null,
  phase: 'idle',
  history: [],
  guesses: [],
  isWinner: false,
  errorMsg: null,
  endReason: null,
  revealedName: null,
}

function persistSessionId(sessionId: string | null) {
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

function loadPersistedSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function deriveGameStateFromSnapshot(snapshot: GameSessionSnapshot): Pick<GameSessionState, 'sessionId' | 'phase' | 'history' | 'guesses' | 'revealedName' | 'isWinner' | 'endReason'> {
  const lastGuess = snapshot.guesses[snapshot.guesses.length - 1]
  const phase = snapshot.status === 'ended' ? 'ended' : 'playing'
  const endReason = snapshot.status === 'ended'
    ? lastGuess
      ? 'guess'
      : 'limit'
    : null

  return {
    sessionId: snapshot.sessionId,
    phase,
    history: snapshot.history,
    guesses: snapshot.guesses.map((item: GuessRecord) => item.guess),
    revealedName: snapshot.revealedName ?? null,
    isWinner: lastGuess?.isCorrect ?? false,
    endReason,
  }
}

export function useGameSession({
  settings,
  voiceModeEnabled,
  continuousVoiceModeEnabled,
  autoStartContinuousVoiceEnabled,
  speech,
}: UseGameSessionParams) {
  const [game, setGame] = useState<GameSessionState>(INITIAL_GAME_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAutoListenTarget, setPendingAutoListenTarget] = useState<VoiceTarget>(null)
  const [questionLimit, setQuestionLimit] = useState(settings.questionLimit)
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(settings.questionLimit)

  const isLimitExhausted = remainingQuestions !== null && remainingQuestions <= 0
  const revealedName = game.revealedName ?? '未知人物'

  const hydrateFromSnapshot = useCallback((snapshot: GameSessionSnapshot) => {
    const nextState = deriveGameStateFromSnapshot(snapshot)
    setGame(prev => ({
      ...prev,
      ...nextState,
      errorMsg: null,
    }))
    setQuestionLimit(snapshot.questionLimit)
    setRemainingQuestions(snapshot.remainingQuestions)
    persistSessionId(snapshot.sessionId)
  }, [])

  useEffect(() => {
    const persistedSessionId = loadPersistedSessionId()
    if (!persistedSessionId) return

    let cancelled = false

    const restoreSession = async () => {
      setIsLoading(true)
      try {
        const snapshot = await fetchSession(persistedSessionId)
        if (!cancelled) {
          hydrateFromSnapshot(snapshot)
        }
      } catch {
        persistSessionId(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [hydrateFromSnapshot])

  const startGame = useCallback(async () => {
    speech.cancel()
    setIsLoading(true)

    try {
      const snapshot = await createSession({
        questionLimit: settings.questionLimit,
        figureScope: settings.figureScope,
      })

      hydrateFromSnapshot(snapshot)

      if (continuousVoiceModeEnabled && autoStartContinuousVoiceEnabled) {
        setPendingAutoListenTarget('question')
      } else {
        setPendingAutoListenTarget(null)
      }

      if (voiceModeEnabled) {
        speech.speak(buildStartAnnouncement('ai'))
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '启动失败'
      persistSessionId(null)
      setGame({ ...INITIAL_GAME_STATE, errorMsg: `网络错误: ${msg}` })
      setQuestionLimit(settings.questionLimit)
      setRemainingQuestions(settings.questionLimit)
      setPendingAutoListenTarget(null)

      if (voiceModeEnabled) {
        speech.speak(buildStartFailureAnnouncement())
      }
    } finally {
      setIsLoading(false)
    }
  }, [autoStartContinuousVoiceEnabled, continuousVoiceModeEnabled, hydrateFromSnapshot, settings.figureScope, settings.questionLimit, speech, voiceModeEnabled])

  const restartGame = useCallback(async () => {
    persistSessionId(null)
    await startGame()
  }, [startGame])

  const submitQuestion = useCallback(async (questionText: string) => {
    const askedQuestion = questionText.trim()
    if (!askedQuestion || game.phase !== 'playing' || isLimitExhausted || !game.sessionId) return

    setIsLoading(true)
    setGame(prev => ({ ...prev, errorMsg: null }))

    try {
      const response = await submitQuestionRequest(game.sessionId, askedQuestion)
      const nextHistory = [...game.history, { question: askedQuestion, answer: response.answer as YesNoAnswer }]
      const nextPhase = response.status === 'ended' ? 'ended' : 'playing'
      const nextEndReason = response.status === 'ended' ? 'limit' : null

      setGame(prev => ({
        ...prev,
        history: nextHistory,
        phase: nextPhase,
        endReason: nextEndReason,
        revealedName: response.revealedName ?? prev.revealedName,
      }))
      setQuestionLimit(response.questionLimit)
      setRemainingQuestions(response.remainingQuestions)

      if (continuousVoiceModeEnabled) {
        setPendingAutoListenTarget(response.status === 'ended' ? null : 'question')
      } else {
        setPendingAutoListenTarget(null)
      }

      if (voiceModeEnabled) {
        speech.speak(buildAnswerAnnouncement(response.answer))
      }

      if (response.status === 'ended' && voiceModeEnabled && response.revealedName) {
        setTimeout(() => {
          speech.speak(buildLimitReachedAnnouncement(response.revealedName!))
        }, 500)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '网络请求失败，请检查设置后重试'
      setGame(prev => ({ ...prev, errorMsg: `网络错误: ${msg}` }))
      setPendingAutoListenTarget(null)

      if (voiceModeEnabled) {
        speech.speak(buildSubmitQuestionFailureAnnouncement())
      }
    } finally {
      setIsLoading(false)
    }
  }, [continuousVoiceModeEnabled, game.history, game.phase, game.sessionId, isLimitExhausted, speech, voiceModeEnabled])

  const submitGuess = useCallback(async (guessText: string) => {
    const currentGuess = guessText.trim()
    if (!currentGuess || game.phase !== 'playing' || !game.sessionId) return

    setIsLoading(true)
    setGame(prev => ({ ...prev, errorMsg: null }))

    try {
      const response = await submitGuessRequest(game.sessionId, currentGuess)
      setGame(prev => ({
        ...prev,
        phase: 'ended',
        guesses: [...prev.guesses, currentGuess],
        isWinner: response.isCorrect,
        endReason: 'guess',
        revealedName: response.revealedName,
      }))
      setPendingAutoListenTarget(null)

      if (voiceModeEnabled) {
        if (response.isCorrect) {
          speech.speak(buildCorrectGuessAnnouncement(response.revealedName))
        } else {
          speech.speak(buildGuessFailureAnnouncement(currentGuess, response.revealedName))
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '提交失败，请重试'
      setGame(prev => ({ ...prev, errorMsg: `错误: ${msg}` }))
      setPendingAutoListenTarget(null)

      if (voiceModeEnabled) {
        speech.speak(buildSubmitGuessFailureAnnouncement())
      }
    } finally {
      setIsLoading(false)
    }
  }, [game.phase, game.sessionId, speech, voiceModeEnabled])

  const clearError = useCallback(() => {
    setGame(prev => ({ ...prev, errorMsg: null }))
  }, [])

  return {
    game,
    isLoading,
    pendingAutoListenTarget,
    setPendingAutoListenTarget,
    remainingQuestions,
    isLimitExhausted,
    revealedName,
    questionLimit,
    startGame,
    restartGame,
    submitQuestion,
    submitGuess,
    clearError,
  }
}
