import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useVoiceGameController } from './useVoiceGameController'
import type { UseVoiceInputResult, VoiceState } from './useVoiceInput'

function createVoiceMock(overrides?: Partial<UseVoiceInputResult>) {
  return {
    ...createBaseVoiceMock(),
    ...overrides,
  }
}

function createBaseVoiceMock(): UseVoiceInputResult {
  return {
    state: 'idle' as VoiceState,
    transcript: '',
    error: null,
    errorCode: null,
    isSupported: true,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    resetTranscript: vi.fn(),
  }
}

describe('useVoiceGameController', () => {
  it('starts listening on the pending target when voice mode is ready', () => {
    const setPendingAutoListenTarget = vi.fn()
    const questionVoice = createVoiceMock()
    const guessVoice = createVoiceMock()

    const { result } = renderHook(() =>
      useVoiceGameController({
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: true,
        gamePhase: 'playing',
        isLoading: false,
        speechState: 'idle',
        pendingAutoListenTarget: 'question',
        setPendingAutoListenTarget,
        questionVoice,
        guessVoice,
      }),
    )

    expect(result.current.voiceTarget).toBe('question')
    expect(setPendingAutoListenTarget).toHaveBeenCalledWith(null)
    expect(questionVoice.resetTranscript).toHaveBeenCalledTimes(1)
    expect(questionVoice.startListening).toHaveBeenCalledTimes(1)
    expect(guessVoice.startListening).not.toHaveBeenCalled()
  })

  it('clears the pending target instead of starting when the target voice is in error', () => {
    const setPendingAutoListenTarget = vi.fn()
    const questionVoice = createVoiceMock({ state: 'error', error: 'mic error' })

    const { result } = renderHook(() =>
      useVoiceGameController({
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: true,
        gamePhase: 'playing',
        isLoading: false,
        speechState: 'idle',
        pendingAutoListenTarget: 'question',
        setPendingAutoListenTarget,
        questionVoice,
        guessVoice: createVoiceMock(),
      }),
    )

    expect(result.current.voiceTarget).toBe(null)
    expect(setPendingAutoListenTarget).toHaveBeenCalledWith(null)
    expect(questionVoice.startListening).not.toHaveBeenCalled()
  })

  it('does nothing while speech synthesis is still speaking', () => {
    const setPendingAutoListenTarget = vi.fn()
    const questionVoice = createVoiceMock()

    const { result } = renderHook(() =>
      useVoiceGameController({
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: true,
        gamePhase: 'playing',
        isLoading: false,
        speechState: 'speaking',
        pendingAutoListenTarget: 'question',
        setPendingAutoListenTarget,
        questionVoice,
        guessVoice: createVoiceMock(),
      }),
    )

    expect(result.current.voiceTarget).toBe(null)
    expect(setPendingAutoListenTarget).not.toHaveBeenCalled()
    expect(questionVoice.startListening).not.toHaveBeenCalled()
  })

  it('does not auto-start listening when continuous mode is disabled', () => {
    const setPendingAutoListenTarget = vi.fn()
    const questionVoice = createVoiceMock()

    const { result } = renderHook(() =>
      useVoiceGameController({
        voiceModeEnabled: true,
        continuousVoiceModeEnabled: false,
        gamePhase: 'playing',
        isLoading: false,
        speechState: 'idle',
        pendingAutoListenTarget: 'question',
        setPendingAutoListenTarget,
        questionVoice,
        guessVoice: createVoiceMock(),
      }),
    )

    expect(result.current.voiceTarget).toBe(null)
    expect(setPendingAutoListenTarget).toHaveBeenCalledWith(null)
    expect(questionVoice.startListening).not.toHaveBeenCalled()
  })
})
