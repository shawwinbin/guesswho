import { useState, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
import { platform } from '../utils/platform'

export type VoiceState = 'idle' | 'recording' | 'processing'

interface UseVoiceGameOptions {
  onTranscript?: (text: string) => void
  onError?: (error: string) => void
}

export function useVoiceGame(options: UseVoiceGameOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recorderRef = useRef<ReturnType<typeof Taro.getRecorderManager> | null>(null)

  const startRecording = useCallback(() => {
    if (!platform.isWeapp) {
      options.onError?.('H5 语音需要浏览器支持')
      return
    }
    setState('recording')
    setTranscript('')
    const recorder = Taro.getRecorderManager()
    recorderRef.current = recorder
    recorder.onStart(() => setState('recording'))
    recorder.onStop((res) => {
      setState('processing')
      // TODO: upload to ASR service
      console.log('Recording stopped:', res)
    })
    recorder.onError((err) => {
      setState('idle')
      options.onError?.(err.errMsg || '录音失败')
    })
    recorder.start({ format: 'mp3', duration: 60000 })
  }, [options])

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop()
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