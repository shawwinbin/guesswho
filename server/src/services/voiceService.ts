interface VoiceConfig {
  asrProvider: 'baidu' | 'xunfei' | 'aliyun'
  ttsProvider: 'baidu' | 'xunfei' | 'aliyun'
  apiKey: string
  apiSecret: string
  appId?: string
}

export class VoiceService {
  private config: VoiceConfig

  constructor() {
    this.config = {
      asrProvider: (process.env.VOICE_ASR_PROVIDER as VoiceConfig['asrProvider']) || 'baidu',
      ttsProvider: (process.env.VOICE_TTS_PROVIDER as VoiceConfig['ttsProvider']) || 'baidu',
      apiKey: process.env.VOICE_API_KEY || '',
      apiSecret: process.env.VOICE_API_SECRET || '',
      appId: process.env.VOICE_APP_ID,
    }
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    if (this.config.asrProvider === 'baidu') {
      return this.baiduASR(audioBuffer)
    }
    throw new Error('未配置 ASR 服务')
  }

  async synthesize(text: string): Promise<string> {
    if (this.config.ttsProvider === 'baidu') {
      return this.baiduTTS(text)
    }
    throw new Error('未配置 TTS 服务')
  }

  private async baiduASR(_audioBuffer: Buffer): Promise<string> {
    throw new Error('待实现 - 需要对接百度语音 API')
  }

  private async baiduTTS(_text: string): Promise<string> {
    throw new Error('待实现 - 需要对接百度语音 API')
  }
}

export function createVoiceService(): VoiceService {
  return new VoiceService()
}