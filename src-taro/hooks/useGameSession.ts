import { useState, useCallback, useEffect } from 'react'
import { createSession, fetchSession, submitQuestion, submitGuess, requestHint } from '../lib/gameApi'
import { FIXED_QUESTION_LIMIT } from '../lib/gameRules'
import { readLevelProgress } from '../lib/levelProgress'
import { storage } from '../lib/storage'
import { GameSessionSnapshot, GameSettings, QuestionAnswer, YesNoAnswer } from '../lib/types'

export type GamePhase = 'idle' | 'loading' | 'playing' | 'ended'

export interface GameState {
  sessionId: string | null
  phase: GamePhase
  level: number | null
  history: QuestionAnswer[]
  guesses: string[]
  hints: string[]
  remainingHints: number
  isWinner: boolean
  errorMsg: string | null
  revealedName: string | null
  remainingQuestions: number | null
}

const SESSION_KEY = 'history-figure-guess-session'
const SESSION_SAVED_AT_KEY = 'history-figure-guess-session-saved-at'
const RESET_DATA_AT_KEY = 'history-figure-guess-reset-data-at'
const INITIAL_STATE: GameState = {
  sessionId: null,
  phase: 'idle',
  level: null,
  history: [],
  guesses: [],
  hints: [],
  remainingHints: 2,
  isWinner: false,
  errorMsg: null,
  revealedName: null,
  remainingQuestions: null
}

export function useGameSession(settings: GameSettings) {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoreComplete, setIsRestoreComplete] = useState(false)

  const clearPersistedSession = useCallback(() => {
    storage.remove(SESSION_KEY)
    storage.remove(SESSION_SAVED_AT_KEY)
  }, [])

  const persistSession = useCallback((sessionId: string) => {
    storage.set(SESSION_KEY, sessionId)
    storage.set(SESSION_SAVED_AT_KEY, Date.now())
  }, [])

  const resolveLevel = useCallback((snapshot?: GameSessionSnapshot) => {
    if (snapshot && Number.isInteger(snapshot.level) && snapshot.level >= 1) {
      return snapshot.level
    }

    return readLevelProgress().currentLevel
  }, [])

  const applySnapshot = useCallback((snapshot: GameSessionSnapshot) => {
    setState({
      sessionId: snapshot.sessionId,
      phase: snapshot.status === 'ended' ? 'ended' : 'playing',
      level: resolveLevel(snapshot),
      history: snapshot.history,
      guesses: snapshot.guesses.map(g => g.guess),
      hints: snapshot.hints?.map(item => item.hint) ?? [],
      remainingHints: snapshot.remainingHints ?? Math.max(2 - (snapshot.hints?.length ?? 0), 0),
      isWinner: snapshot.guesses[snapshot.guesses.length - 1]?.isCorrect ?? false,
      errorMsg: null,
      revealedName: snapshot.revealedName ?? null,
      remainingQuestions: snapshot.remainingQuestions
    })
    persistSession(snapshot.sessionId)
  }, [persistSession, resolveLevel])

  useEffect(() => {
    const savedSessionId = storage.get<string>(SESSION_KEY)
    if (!savedSessionId) {
      setIsRestoreComplete(true)
      return
    }

    const sessionSavedAt = storage.get<number>(SESSION_SAVED_AT_KEY)
    const resetDataAt = storage.get<number>(RESET_DATA_AT_KEY)
    if (typeof resetDataAt === 'number' && (!Number.isFinite(sessionSavedAt) || sessionSavedAt < resetDataAt)) {
      clearPersistedSession()
      setIsRestoreComplete(true)
      return
    }

    const restore = async () => {
      setIsLoading(true)
      try {
        const snapshot = await fetchSession(savedSessionId)
        if (snapshot.status === 'ended') {
          clearPersistedSession()
          setState(INITIAL_STATE)
          return
        }
        applySnapshot(snapshot)
      } catch {
        clearPersistedSession()
      } finally {
        setIsLoading(false)
        setIsRestoreComplete(true)
      }
    }

    restore()
  }, [applySnapshot, clearPersistedSession])

  const startGame = useCallback(async (level: number) => {
    const nextLevel = Number.isInteger(level) && level >= 1 ? level : resolveLevel()
    setIsLoading(true)
    setState(prev => ({ ...prev, phase: 'loading', errorMsg: null }))
    try {
      const snapshot = await createSession({
        questionLimit: FIXED_QUESTION_LIMIT,
        figureScope: settings.figureScope,
        level: nextLevel
      })
      applySnapshot(snapshot)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '启动失败'
      setState(prev => ({ ...prev, phase: 'idle', errorMsg: msg }))
      clearPersistedSession()
    } finally {
      setIsLoading(false)
    }
  }, [applySnapshot, clearPersistedSession, resolveLevel, settings])

  const askQuestion = useCallback(async (question: string) => {
    if (!state.sessionId || state.phase !== 'playing') return null
    setIsLoading(true)
    setState(prev => ({ ...prev, errorMsg: null }))
    try {
      const res = await submitQuestion(state.sessionId, question)
      setState(prev => ({
        ...prev,
        history: [...prev.history, { question, answer: res.answer as YesNoAnswer }],
        phase: res.status === 'ended' ? 'ended' : 'playing',
        remainingQuestions: res.remainingQuestions,
        revealedName: res.revealedName ?? prev.revealedName
      }))
      if (res.status === 'ended') {
        clearPersistedSession()
      }
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提问失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [clearPersistedSession, state.sessionId, state.phase])

  const makeGuess = useCallback(async (guess: string) => {
    if (!state.sessionId || state.phase !== 'playing') return
    setIsLoading(true)
    setState(prev => ({ ...prev, errorMsg: null }))
    try {
      const res = await submitGuess(state.sessionId, guess)
      setState(prev => ({
        ...prev,
        phase: 'ended',
        guesses: [...prev.guesses, guess],
        isWinner: res.isCorrect,
        revealedName: res.revealedName
      }))
      clearPersistedSession()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '猜测失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
    } finally {
      setIsLoading(false)
    }
  }, [state.sessionId, state.phase])

  const requestAiHint = useCallback(async () => {
    if (!state.sessionId || state.phase !== 'playing' || state.remainingHints <= 0) return
    setIsLoading(true)
    setState(prev => ({ ...prev, errorMsg: null }))
    try {
      const res = await requestHint(state.sessionId)
      setState(prev => ({
        ...prev,
        hints: res.hints.map(item => item.hint),
        remainingHints: res.remainingHints
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取提示失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
    } finally {
      setIsLoading(false)
    }
  }, [state.sessionId, state.phase, state.remainingHints])

  const restart = useCallback(async (levelOverride?: number) => {
    const nextLevel = levelOverride ?? state.level ?? resolveLevel()
    clearPersistedSession()
    setState(INITIAL_STATE)
    await startGame(nextLevel)
  }, [clearPersistedSession, resolveLevel, startGame, state.level])

  const clearError = useCallback(() => setState(prev => ({ ...prev, errorMsg: null })), [])

  return { state, isLoading, isRestoreComplete, startGame, askQuestion, makeGuess, requestAiHint, restart, clearError }
}
