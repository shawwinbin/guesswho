import { View, Text } from '@tarojs/components'
import { Button } from '@nutui/nutui-react-taro'
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
  const handleClick = () => { isRecording ? onStopRecord() : onStartRecord() }
  return (
    <View className="voice-controls">
      <Button type={isRecording ? 'warning' : 'default'} size="small" disabled={disabled} onClick={handleClick}>{isRecording ? '🔴 停止录音' : '🎤 语音输入'}</Button>
      {transcript && <View className="transcript-preview"><Text>{transcript}</Text></View>}
      {!platform.canUseRecorder && platform.isWeapp && <Text className="voice-hint">小程序语音需要后端支持</Text>}
    </View>
  )
}