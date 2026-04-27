import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeechState = 'unsupported' | 'idle' | 'speaking' | 'error'

export interface UseSpeechSynthesisResult {
  state: SpeechState
  isSupported: boolean
  speak: (text: string) => void
  stop: () => void
  cancel: () => void
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const detectSupport = () => typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'

  const [state, setState] = useState<SpeechState>(() => (detectSupport() ? 'idle' : 'unsupported'))
  const [isSupported, setIsSupported] = useState(() => detectSupport())
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supported = detectSupport()
    setIsSupported(supported)
    setState(supported ? 'idle' : 'unsupported')

    return () => {
      mountedRef.current = false
      if (supported && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      utteranceRef.current = null
    }
  }, [])

  const safeSetState = useCallback((nextState: SpeechState) => {
    if (mountedRef.current) {
      setState(nextState)
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim() || typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return

    const synth = window.speechSynthesis
    if (synth.speaking || synth.pending || utteranceRef.current) {
      synth.cancel()
    }

    const utterance = new window.SpeechSynthesisUtterance()
    utterance.text = text.trim()
    utterance.lang = 'zh-CN'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      safeSetState('speaking')
    }

    utterance.onend = () => {
      safeSetState('idle')
      utteranceRef.current = null
    }

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      if (event.error !== 'canceled') {
        safeSetState('error')
      } else {
        safeSetState('idle')
      }
      utteranceRef.current = null
    }

    utteranceRef.current = utterance
    safeSetState('speaking')
    synth.speak(utterance)
  }, [isSupported, safeSetState])

  const stop = useCallback(() => {
    if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    safeSetState('idle')
    utteranceRef.current = null
  }, [isSupported, safeSetState])

  const cancel = useCallback(() => {
    if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    safeSetState('idle')
    utteranceRef.current = null
  }, [isSupported, safeSetState])

  return {
    state,
    isSupported,
    speak,
    stop,
    cancel,
  }
}
