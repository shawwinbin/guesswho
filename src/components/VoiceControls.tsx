import { useEffect } from 'react'
import type { UseVoiceInputResult } from '../lib/useVoiceInput'
import type { VoiceTarget } from '../lib/useVoiceGameController'

interface VoiceInputButtonProps {
  voice: UseVoiceInputResult
  target: VoiceTarget
  currentTarget: VoiceTarget
  onTargetChange: (target: VoiceTarget) => void
  onVoiceResult: (transcript: string) => void
  disabled: boolean
  voiceMode?: boolean
}

export function VoiceInputButton({
  voice,
  target,
  currentTarget,
  onTargetChange,
  onVoiceResult,
  disabled,
  voiceMode = false,
}: VoiceInputButtonProps) {
  const isActive = currentTarget === target

  useEffect(() => {
    if (isActive && voice.transcript && voice.state === 'idle') {
      onVoiceResult(voice.transcript)
    }
  }, [isActive, voice.transcript, voice.state, onVoiceResult])

  if (!voice.isSupported) {
    return (
      <span className="voice-unsupported" title="浏览器不支持语音输入">
        🎤
      </span>
    )
  }

  const handleClick = () => {
    onTargetChange(target)

    if (voice.state === 'listening') {
      voice.stopListening()
    } else {
      voice.resetTranscript()
      voice.startListening()
    }
  }

  const buttonTitle = voiceMode
    ? voice.state === 'listening'
      ? '正在收听，语音将自动提交'
      : '点击开始语音输入，识别后自动提交'
    : voice.state === 'listening'
      ? '正在收听，点击停止'
      : '点击开始语音输入'

  return (
    <button
      className={`voice-btn ${isActive ? 'active' : ''} ${voice.state === 'listening' ? 'listening' : ''} ${voice.state === 'error' ? 'error' : ''} ${voiceMode ? 'voice-mode' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={voice.state === 'listening' ? '停止语音输入' : '开始语音输入'}
      title={buttonTitle}
    >
      {voice.state === 'listening' ? '🔴' : '🎤'}
    </button>
  )
}

interface VoiceStatusIndicatorProps {
  voice: UseVoiceInputResult
  voiceMode?: boolean
}

export function VoiceStatusIndicator({ voice, voiceMode = false }: VoiceStatusIndicatorProps) {
  if (!voice.isSupported) return null
  if (voice.state === 'idle' && !voice.error) return null

  return (
    <div className={`voice-status ${voice.state}`}>
      {voiceMode && voice.state === 'listening' && '🔊 语音模式：识别后自动提交'}
      {!voiceMode && voice.state === 'listening' && '正在收听...'}
      {voice.state === 'error' && voice.error}
      {voice.transcript && voice.state === 'listening' && (
        <span className="voice-transcript-preview">{voice.transcript}</span>
      )}
    </div>
  )
}
