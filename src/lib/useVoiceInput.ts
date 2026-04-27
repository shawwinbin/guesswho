import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceState = 'unsupported' | 'idle' | 'listening' | 'processing' | 'error'
export type VoiceErrorCode =
  | 'no-speech'
  | 'audio-capture'
  | 'permission-denied'
  | 'service-unavailable'
  | 'network'
  | 'aborted'
  | 'unknown'
  | null

export interface UseVoiceInputResult {
  state: VoiceState
  transcript: string
  error: string | null
  errorCode: VoiceErrorCode
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

function isLikelyMobileVoicePermissionFlow(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    return true
  }

  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
}

function mapVoiceRecognitionError(error: string): { code: Exclude<VoiceErrorCode, null>; message: string } {
  switch (error) {
    case 'no-speech':
      return {
        code: 'no-speech',
        message: '未检测到语音，请重试',
      }
    case 'audio-capture':
      return {
        code: 'audio-capture',
        message: '无法访问麦克风，请检查浏览器或系统是否禁用了麦克风',
      }
    case 'not-allowed':
      return {
        code: 'permission-denied',
        message: isLikelyMobileVoicePermissionFlow()
          ? '麦克风权限未开启，请先允许浏览器和系统麦克风后重试'
          : '麦克风权限被拒绝，请在浏览器设置中允许后重试',
      }
    case 'service-not-allowed':
      return {
        code: 'service-unavailable',
        message: '当前浏览器的语音识别服务不可用，请检查权限或切换浏览器重试',
      }
    case 'network':
      return {
        code: 'network',
        message: '网络错误，语音识别需要网络连接',
      }
    case 'aborted':
      return {
        code: 'aborted',
        message: '语音输入已取消',
      }
    default:
      return {
        code: 'unknown',
        message: `语音识别错误: ${error}`,
      }
  }
}

export function useVoiceInput(): UseVoiceInputResult {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<VoiceErrorCode>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const stateRef = useRef<VoiceState>('idle')

  const isSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const updateState = useCallback((nextState: VoiceState) => {
    stateRef.current = nextState
    setState(nextState)
  }, [])

  useEffect(() => {
    if (!isSupported) {
      updateState('unsupported')
      return
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'zh-CN'

    recognition.onstart = () => {
      updateState('listening')
      setError(null)
      setErrorCode(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < results.length; i++) {
        const transcriptPart = results[i][0].transcript
        if (results[i].isFinal) {
          finalTranscript += transcriptPart
        } else {
          interimTranscript += transcriptPart
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript)
      } else if (interimTranscript) {
        setTranscript(interimTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      updateState('error')
      const mappedError = mapVoiceRecognitionError(event.error)
      setError(mappedError.message)
      setErrorCode(mappedError.code)
    }

    recognition.onend = () => {
      if (stateRef.current === 'listening' || stateRef.current === 'processing') {
        updateState('idle')
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [isSupported, updateState])

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return
    if (stateRef.current === 'listening') return

    setError(null)
    setErrorCode(null)
    setTranscript('')
    updateState('idle')

    try {
      recognitionRef.current.start()
    } catch (e) {
      updateState('error')
      setError('无法启动语音识别，请重试')
      setErrorCode('unknown')
    }
  }, [isSupported, updateState])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    updateState('idle')
  }, [updateState])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
    setErrorCode(null)
    updateState('idle')
  }, [updateState])

  return {
    state,
    transcript,
    error,
    errorCode,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
