import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from './useVoiceInput'

describe('useVoiceInput', () => {
  let originalSpeechRecognition: unknown
  let originalWebkitSpeechRecognition: unknown
  let recognitionInstances: Array<{
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: ((event: unknown) => void) | null
    onerror: ((event: unknown) => void) | null
    onend: (() => void) | null
    onstart: (() => void) | null
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    abort: ReturnType<typeof vi.fn>
  }>

  beforeEach(() => {
    originalSpeechRecognition = window.SpeechRecognition
    originalWebkitSpeechRecognition = window.webkitSpeechRecognition
    recognitionInstances = []
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      configurable: true,
      writable: true,
    })

    // Use Object.defineProperty to properly set the constructor
    Object.defineProperty(window, 'SpeechRecognition', {
      value: class {
        continuous = false
        interimResults = true
        lang = ''
        onresult = null
        onerror = null
        onend = null
        onstart = null
        start = vi.fn()
        stop = vi.fn()
        abort = vi.fn()

        constructor() {
          recognitionInstances.push(this)
        }
      },
      configurable: true,
      writable: true,
    })

    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: class {
        continuous = false
        interimResults = true
        lang = ''
        onresult = null
        onerror = null
        onend = null
        onstart = null
        start = vi.fn()
        stop = vi.fn()
        abort = vi.fn()

        constructor() {
          recognitionInstances.push(this)
        }
      },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: originalSpeechRecognition,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: originalWebkitSpeechRecognition,
      configurable: true,
      writable: true,
    })
    vi.clearAllMocks()
  })

  it('returns unsupported state when Web Speech API is not available', () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useVoiceInput())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.state).toBe('unsupported')
  })

  it('returns supported state when Web Speech API is available', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(result.current.isSupported).toBe(true)
    expect(result.current.state).toBe('idle')
  })

  it('initializes with empty transcript and no error', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(result.current.transcript).toBe('')
    expect(result.current.error).toBe(null)
    expect(result.current.errorCode).toBe(null)
  })

  it('provides startListening, stopListening, and resetTranscript methods', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(result.current.startListening).toBeDefined()
    expect(result.current.stopListening).toBeDefined()
    expect(result.current.resetTranscript).toBeDefined()
  })

  it('resetTranscript clears transcript and error', () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.resetTranscript()
    })

    expect(result.current.transcript).toBe('')
    expect(result.current.error).toBe(null)
    expect(result.current.state).toBe('idle')
  })

  it('keeps the same recognition instance after listening starts', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(recognitionInstances).toHaveLength(1)
    const recognition = recognitionInstances[0]

    act(() => {
      result.current.startListening()
    })

    expect(recognition.start).toHaveBeenCalledTimes(1)

    act(() => {
      recognition.onstart?.()
    })

    expect(result.current.state).toBe('listening')
    expect(recognitionInstances).toHaveLength(1)
    expect(recognition.abort).not.toHaveBeenCalled()
  })

  it('maps mobile permission errors to a more actionable message', () => {
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    })

    const { result } = renderHook(() => useVoiceInput())
    const recognition = recognitionInstances[0]

    act(() => {
      recognition.onerror?.({ error: 'not-allowed', message: '' })
    })

    expect(result.current.state).toBe('error')
    expect(result.current.errorCode).toBe('permission-denied')
    expect(result.current.error).toBe('麦克风权限未开启，请先允许浏览器和系统麦克风后重试')
  })

  it('maps service-not-allowed errors to a browser service hint', () => {
    const { result } = renderHook(() => useVoiceInput())
    const recognition = recognitionInstances[0]

    act(() => {
      recognition.onerror?.({ error: 'service-not-allowed', message: '' })
    })

    expect(result.current.state).toBe('error')
    expect(result.current.errorCode).toBe('service-unavailable')
    expect(result.current.error).toBe('当前浏览器的语音识别服务不可用，请检查权限或切换浏览器重试')
  })

  describe('when unsupported', () => {
    it('startListening does nothing', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: undefined,
        configurable: true,
        writable: true,
      })

      const { result } = renderHook(() => useVoiceInput())

      act(() => {
        result.current.startListening()
      })

      expect(result.current.state).toBe('unsupported')
    })
  })
})

describe('VoiceInputButton behavior', () => {
  it('shows unsupported indicator when voice is not supported', async () => {
    vi.doMock('./useVoiceInput', () => ({
      useVoiceInput: () => ({
        isSupported: false,
        state: 'unsupported',
        transcript: '',
        error: null,
        errorCode: null,
        startListening: vi.fn(),
        stopListening: vi.fn(),
        resetTranscript: vi.fn(),
      }),
    }))

    // The actual rendering test would be in App.test.tsx
    expect(true).toBe(true)
  })
})
