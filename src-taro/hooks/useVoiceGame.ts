import { useState, useCallback, useRef } from 'react'
import { voiceService } from '../lib/voiceAdapter'

export type VoiceState = 'idle' | 'recording' | 'processing'

interface UseVoiceGameOptions {
  onTranscript?: (text: string) => void
  onError?: (error: string) => void
}

export function useVoiceGame(options: UseVoiceGameOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recorderRef = useRef<unknown>(null)

  const startRecording = useCallback(() => {
    if (!voiceService.capabilities.canInput) {
      options.onError?.('当前环境不支持语音输入')
      return
    }

    setState('recording')
    setTranscript('')

    recorderRef.current = voiceService.input.start(
      text => {
        const normalizedText = text.trim()
        setTranscript(normalizedText)
        setState('idle')

        if (normalizedText) {
          options.onTranscript?.(normalizedText)
        } else {
          options.onError?.('没有识别到语音内容')
        }
      },
      error => {
        setState('idle')
        options.onError?.(error || '语音识别失败')
      }
    )
  }, [options])

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      voiceService.input.stop(recorderRef.current)
      recorderRef.current = null
      setState('idle')
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setTranscript('')
  }, [])

  return {
    state,
    transcript,
    startRecording,
    stopRecording,
    reset,
    isRecording: state === 'recording'
  }
}
