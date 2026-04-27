import Taro from '@tarojs/taro'
import { platform } from '../utils/platform'

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

class WebSpeechRecognition {
  private recognition: any = null
  private isListening = false

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.recognition.lang = 'zh-CN'
      this.recognition.continuous = false
      this.recognition.interimResults = false
    }
  }

  start(onResult: (text: string) => void, onError: (error: string) => void) {
    if (!this.recognition) { onError('浏览器不支持语音识别'); return }
    this.isListening = true
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
      this.isListening = false
    }
    this.recognition.onerror = (event: any) => {
      onError(formatSpeechRecognitionError(event.error))
      this.isListening = false
    }
    this.recognition.onend = () => {
      this.isListening = false
    }

    try {
      this.recognition.start()
    } catch (err) {
      this.isListening = false
      onError(err instanceof Error ? err.message : '语音识别启动失败')
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }
}

function formatSpeechRecognitionError(error: string) {
  const errorMessages: Record<string, string> = {
    'not-allowed': '浏览器未授予麦克风权限，或当前页面不是 HTTPS/localhost',
    'service-not-allowed': '浏览器语音识别服务不可用，请尝试 Chrome/Edge 或 HTTPS 访问',
    'no-speech': '没有识别到语音内容',
    'audio-capture': '没有检测到可用麦克风',
    network: '语音识别网络服务不可用',
    aborted: '语音识别已取消',
  }

  return errorMessages[error] ?? error ?? '语音识别失败'
}

class WeappVoiceService {
  private recorder: any = null

  startRecording(onStop: (filePath: string) => void, onError: (error: string) => void) {
    this.recorder = Taro.getRecorderManager()
    this.recorder.onStop((res: any) => onStop(res.tempFilePath))
    this.recorder.onError((err: any) => onError(err.errMsg))
    this.recorder.start({ format: 'mp3', duration: 60000, sampleRate: 16000, numberOfChannels: 1 })
  }

  stopRecording() {
    if (this.recorder) this.recorder.stop()
  }

  async transcribe(filePath: string): Promise<string> {
    const uploadRes = await Taro.uploadFile({
      url: '/v1/voice/transcribe',
      filePath,
      name: 'audio'
    })
    const data = JSON.parse(uploadRes.data)
    return data.text
  }

  async synthesize(text: string): Promise<string> {
    // TODO: call backend TTS
    throw new Error('待实现')
  }

  async playAudio(url: string) {
    const audio = Taro.createInnerAudioContext()
    audio.src = url
    audio.play()
    return new Promise<void>((resolve) => {
      audio.onEnded(() => { audio.destroy(); resolve() })
    })
  }
}

export const voiceService = {
  input: {
    start: (onResult: (text: string) => void, onError: (error: string) => void) => {
      if (platform.isH5) {
        const webSpeech = new WebSpeechRecognition()
        webSpeech.start(onResult, onError)
        return webSpeech
      } else {
        const weapp = new WeappVoiceService()
        weapp.startRecording(async (filePath) => {
          try {
            const text = await weapp.transcribe(filePath)
            onResult(text)
          } catch (err) {
            onError(err instanceof Error ? err.message : '识别失败')
          }
        }, onError)
        return weapp
      }
    },
    stop: (service: any) => {
      if (platform.isH5) (service as WebSpeechRecognition).stop()
      else (service as WeappVoiceService).stopRecording()
    }
  },

  output: {
    speak: async (text: string) => {
      if (platform.isH5) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'zh-CN'
        speechSynthesis.speak(utterance)
      } else {
        const weapp = new WeappVoiceService()
        const audioUrl = await weapp.synthesize(text)
        await weapp.playAudio(audioUrl)
      }
    },
    stop: () => {
      if (platform.isH5) speechSynthesis.cancel()
    }
  },

  capabilities: {
    canInput: platform.isH5 || platform.isWeapp,
    canOutput: platform.isH5 || platform.isWeapp
  }
}
