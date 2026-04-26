import { useState, useCallback, useEffect } from 'react'
import { createSession, fetchSession, submitQuestion, submitGuess } from '../lib/gameApi'
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
  isWinner: boolean
  errorMsg: string | null
  revealedName: string | null
  remainingQuestions: number | null
}

const SESSION_KEY = 'history-figure-guess-session'
const INITIAL_STATE: GameState = {
  sessionId: null,
  phase: 'idle',
  level: null,
  history: [],
  guesses: [],
  isWinner: false,
  errorMsg: null,
  revealedName: null,
  remainingQuestions: null
}

export function useGameSession(settings: GameSettings) {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoreComplete, setIsRestoreComplete] = useState(false)

  const resolveLevel = useCallback((snapshot?: GameSessionSnapshot) => {
    if (snapshot && Number.isInteger(snapshot.level) && snapshot.level >= 1) {
      return snapshot.level
    }

    return readLevelProgress().currentLevel
  }, [])

  useEffect(() => {
    const savedSessionId = storage.get<string>(SESSION_KEY)
    if (!savedSessionId) {
      setIsRestoreComplete(true)
      return
    }

    const restore = async () => {
      setIsLoading(true)
      try {
        const snapshot = await fetchSession(savedSessionId)
        applySnapshot(snapshot)
      } catch {
        storage.remove(SESSION_KEY)
      } finally {
        setIsLoading(false)
        setIsRestoreComplete(true)
      }
    }

    restore()
  }, [])

  const applySnapshot = useCallback((snapshot: GameSessionSnapshot) => {
    setState({
      sessionId: snapshot.sessionId,
      phase: snapshot.status === 'ended' ? 'ended' : 'playing',
      level: resolveLevel(snapshot),
      history: snapshot.history,
      guesses: snapshot.guesses.map(g => g.guess),
      isWinner: snapshot.guesses[snapshot.guesses.length - 1]?.isCorrect ?? false,
      errorMsg: null,
      revealedName: snapshot.revealedName ?? null,
      remainingQuestions: snapshot.remainingQuestions
    })
    storage.set(SESSION_KEY, snapshot.sessionId)
  }, [resolveLevel])

  const startGame = useCallback(async (level: number) => {
    const nextLevel = Number.isInteger(level) && level >= 1 ? level : resolveLevel()
    setIsLoading(true)
    setState(prev => ({ ...prev, phase: 'loading', errorMsg: null }))
    try {
      const snapshot = await createSession({
        questionLimit: settings.questionLimit,
        figureScope: settings.figureScope,
        level: nextLevel
      })
      applySnapshot(snapshot)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '启动失败'
      setState(prev => ({ ...prev, phase: 'idle', errorMsg: msg }))
      storage.remove(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [applySnapshot, resolveLevel, settings])

  const askQuestion = useCallback(async (question: string) => {
    if (!state.sessionId || state.phase !== 'playing') return
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提问失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
    } finally {
      setIsLoading(false)
    }
  }, [state.sessionId, state.phase])

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : '猜测失败'
      setState(prev => ({ ...prev, errorMsg: msg }))
    } finally {
      setIsLoading(false)
    }
  }, [state.sessionId, state.phase])

  const restart = useCallback(async (levelOverride?: number) => {
    const nextLevel = levelOverride ?? state.level ?? resolveLevel()
    storage.remove(SESSION_KEY)
    setState(INITIAL_STATE)
    await startGame(nextLevel)
  }, [resolveLevel, startGame, state.level])

  const clearError = useCallback(() => setState(prev => ({ ...prev, errorMsg: null })), [])

  return { state, isLoading, isRestoreComplete, startGame, askQuestion, makeGuess, restart, clearError }
}
