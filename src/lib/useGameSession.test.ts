import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameSession } from './useGameSession'
import * as gameApi from './gameApi'

vi.mock('./gameApi', () => ({
  createSession: vi.fn(),
  fetchSession: vi.fn(),
  submitQuestion: vi.fn(),
  submitGuess: vi.fn(),
}))

describe('useGameSession', () => {
  const speech = {
    speak: vi.fn(),
    cancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts a backend session and schedules question auto-listen in voice mode', async () => {
    vi.mocked(gameApi.createSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })

    const { result } = renderHook(() =>
      useGameSession({
        settings: {
          questionLimit: 20,
          figureScope: 'all',
          voiceMode: true,
          continuousVoiceMode: true,
        },
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: true,
        autoStartContinuousVoiceEnabled: true,
        speech,
      }),
    )

    await act(async () => {
      await result.current.startGame()
    })

    expect(gameApi.createSession).toHaveBeenCalledWith({
      questionLimit: 20,
      figureScope: 'all',
    })
    expect(result.current.game.phase).toBe('playing')
    expect(result.current.pendingAutoListenTarget).toBe('question')
    expect(speech.speak).toHaveBeenCalled()
  })

  it('does not schedule auto-listen when continuous mode is disabled', async () => {
    vi.mocked(gameApi.createSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })

    const { result } = renderHook(() =>
      useGameSession({
        settings: {
          questionLimit: 20,
          figureScope: 'all',
          voiceMode: true,
          continuousVoiceMode: false,
        },
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: false,
        autoStartContinuousVoiceEnabled: true,
        speech,
      }),
    )

    await act(async () => {
      await result.current.startGame()
    })

    expect(result.current.pendingAutoListenTarget).toBe(null)
    expect(speech.speak).toHaveBeenCalled()
  })

  it('does not auto-start continuous voice when manual mobile activation is required', async () => {
    vi.mocked(gameApi.createSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })

    const { result } = renderHook(() =>
      useGameSession({
        settings: {
          questionLimit: 20,
          figureScope: 'all',
          voiceMode: true,
          continuousVoiceMode: true,
        },
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: true,
        autoStartContinuousVoiceEnabled: false,
        speech,
      }),
    )

    await act(async () => {
      await result.current.startGame()
    })

    expect(result.current.pendingAutoListenTarget).toBe(null)
    expect(speech.speak).toHaveBeenCalled()
  })

  it('restores a persisted backend session on mount', async () => {
    localStorage.setItem('history-figure-guess-session-id', 'session-1')
    vi.mocked(gameApi.fetchSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 1,
      questionLimit: 20,
      remainingQuestions: 19,
      history: [{ question: '他是皇帝吗？', answer: '是' }],
      guesses: [],
    })

    const { result } = renderHook(() =>
      useGameSession({
        settings: {
          questionLimit: 20,
          figureScope: 'all',
          voiceMode: false,
          continuousVoiceMode: false,
        },
        voiceModeEnabled: false,
        continuousVoiceModeEnabled: false,
        autoStartContinuousVoiceEnabled: true,
        speech,
      }),
    )

    await waitFor(() => {
      expect(gameApi.fetchSession).toHaveBeenCalledWith('session-1')
      expect(result.current.game.history).toEqual([{ question: '他是皇帝吗？', answer: '是' }])
      expect(result.current.game.phase).toBe('playing')
    })
  })

  it('records answers and ends the session when the question limit is exhausted', async () => {
    vi.mocked(gameApi.createSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 0,
      questionLimit: 1,
      remainingQuestions: 1,
      history: [],
      guesses: [],
    })
    vi.mocked(gameApi.submitQuestion).mockResolvedValue({
      answer: '是',
      status: 'ended',
      questionCount: 1,
      questionLimit: 1,
      remainingQuestions: 0,
      revealedName: '秦始皇',
    })

    const { result } = renderHook(() =>
      useGameSession({
        settings: {
          questionLimit: 1,
          figureScope: 'all',
          voiceMode: false,
          continuousVoiceMode: false,
        },
        voiceModeEnabled: false,
        continuousVoiceModeEnabled: false,
        autoStartContinuousVoiceEnabled: true,
        speech,
      }),
    )

    await act(async () => {
      await result.current.startGame()
    })

    await act(async () => {
      await result.current.submitQuestion('他是皇帝吗？')
    })

    expect(gameApi.submitQuestion).toHaveBeenCalledWith('session-1', '他是皇帝吗？')
    expect(result.current.game.history).toEqual([{ question: '他是皇帝吗？', answer: '是' }])
    expect(result.current.game.phase).toBe('ended')
    expect(result.current.game.endReason).toBe('limit')
    expect(result.current.revealedName).toBe('秦始皇')
  })

  it('records guess results and ends the session on final guess', async () => {
    vi.mocked(gameApi.createSession).mockResolvedValue({
      sessionId: 'session-1',
      status: 'playing',
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })
    vi.mocked(gameApi.submitGuess).mockResolvedValue({
      isCorrect: true,
      revealedName: '李白',
      status: 'ended',
    })

    const { result } = renderHook(() =>
      useGameSession({
        settings: {
          questionLimit: 20,
          figureScope: 'poet',
          voiceMode: false,
          continuousVoiceMode: false,
        },
        voiceModeEnabled: false,
        continuousVoiceModeEnabled: false,
        autoStartContinuousVoiceEnabled: true,
        speech,
      }),
    )

    await act(async () => {
      await result.current.startGame()
    })

    await act(async () => {
      await result.current.submitGuess('李白')
    })

    expect(gameApi.submitGuess).toHaveBeenCalledWith('session-1', '李白')
    expect(result.current.game.phase).toBe('ended')
    expect(result.current.game.isWinner).toBe(true)
    expect(result.current.game.guesses).toEqual(['李白'])
  })
})
