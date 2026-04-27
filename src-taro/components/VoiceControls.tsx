import { View, Text } from '@tarojs/components'
import { platform } from '../utils/platform'
import './components.scss'

interface VoiceControlsProps {
  onStartRecord: () => void
  onStopRecord: () => void
  isRecording: boolean
  disabled?: boolean
  transcript?: string
}

export function VoiceControls({ onStartRecord, onStopRecord, isRecording, disabled = false, transcript }: VoiceControlsProps) {
  const handleClick = () => {
    if (disabled) return
    if (isRecording) {
      onStopRecord()
      return
    }
    onStartRecord()
  }

  return (
    <View className="voice-controls">
      <View className="voice-copy">
        <Text className="voice-copy__title">{isRecording ? '正在聆听' : '点击麦克风提问'}</Text>
        <Text className="voice-copy__sub">{transcript || '支持语音转文字，快速发起一轮问题'}</Text>
      </View>
      <View className={`voice-button ${isRecording ? 'is-recording' : ''} ${disabled ? 'is-disabled' : ''}`} onClick={handleClick}>
        <Text className="voice-button__icon">{isRecording ? '◉' : '🎤'}</Text>
      </View>
      {!platform.canUseRecorder && platform.isWeapp && <Text className="voice-hint">小程序语音需要后端支持</Text>}
    </View>
  )
}
