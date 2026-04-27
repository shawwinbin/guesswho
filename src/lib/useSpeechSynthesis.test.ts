import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechSynthesis } from './useSpeechSynthesis'

describe('useSpeechSynthesis', () => {
  let originalSpeechSynthesis: unknown
  let originalSpeechSynthesisUtterance: unknown

  beforeEach(() => {
    originalSpeechSynthesis = window.speechSynthesis
    originalSpeechSynthesisUtterance = window.SpeechSynthesisUtterance

    const mockSynthesis = {
      speaking: false,
      pending: false,
      speak: vi.fn((utterance: { onstart: () => void; onend: () => void }) => {
        utterance.onstart?.()
        setTimeout(() => utterance.onend?.(), 10)
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      onvoiceschanged: null,
    }

    const MockUtterance = vi.fn().mockImplementation(() => ({
      text: '',
      lang: 'zh-CN',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      onstart: null,
      onend: null,
      onerror: null,
    }))

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynthesis,
      configurable: true,
      writable: true,
    })

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: originalSpeechSynthesisUtterance,
      configurable: true,
      writable: true,
    })
    vi.clearAllMocks()
  })

  it('returns unsupported state when Speech Synthesis API is not available', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useSpeechSynthesis())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.state).toBe('unsupported')
  })

  it('returns supported state when Speech Synthesis API is available', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    expect(result.current.isSupported).toBe(true)
    expect(result.current.state).toBe('idle')
  })

  it('provides speak, stop, and cancel methods', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    expect(result.current.speak).toBeDefined()
    expect(result.current.stop).toBeDefined()
    expect(result.current.cancel).toBeDefined()
  })

  it('speak calls speechSynthesis.speak with utterance', async () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.speak('测试文本')
    })

    expect(window.speechSynthesis.speak).toHaveBeenCalled()
    expect(result.current.state).toBe('speaking')
  })

  it('speak does nothing when not supported', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.speak('测试文本')
    })

    expect(result.current.state).toBe('unsupported')
  })

  it('stop calls speechSynthesis.cancel', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.stop()
    })

    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
    expect(result.current.state).toBe('idle')
  })

  it('cancel calls speechSynthesis.cancel and resets state', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.cancel()
    })

    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
    expect(result.current.state).toBe('idle')
  })

  it('speak cancels previous speech before starting new', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.speak('第一句')
    })

    act(() => {
      result.current.speak('第二句')
    })

    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })

  it('speak ignores empty text', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.speak('')
    })

    expect(window.speechSynthesis.speak).not.toHaveBeenCalled()
  })

  it('speak ignores whitespace-only text', () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => {
      result.current.speak('   ')
    })

    expect(window.speechSynthesis.speak).not.toHaveBeenCalled()
  })
})
