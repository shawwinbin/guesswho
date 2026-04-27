interface StartScreenProps {
  voiceModeEnabled: boolean
  continuousVoiceModeEnabled: boolean
  questionLimit: number
  figureScopeLabel: string
  isLoading: boolean
  onStart: () => void
}

export function StartScreen({
  voiceModeEnabled,
  continuousVoiceModeEnabled,
  questionLimit,
  figureScopeLabel,
  isLoading,
  onStart,
}: StartScreenProps) {
  return (
    <div className="start-screen">
      <p className="intro">欢迎来到历史人物猜谜！电脑会随机选择一位历史人物，你需要通过提问来猜出是谁。</p>
      <p className="ai-intro">后端 AI 会秘密选择一位历史人物，并在整局游戏中负责回答和判定你的最终猜测。</p>
      {voiceModeEnabled && (
        <p className="voice-mode-hint">🔊 语音模式：说出问题或猜测后会自动提交，答案会语音播报。</p>
      )}
      {continuousVoiceModeEnabled && (
        <p className="voice-mode-hint">🎙️ 连续语音对话：点一次开始后可持续提问，直接说出人名会立即结算。</p>
      )}
      {questionLimit > 0 && <p className="limit-info">本局可提问 {questionLimit} 次</p>}
      <p className="scope-info">当前人物范围: {figureScopeLabel}</p>
      <button className="btn-primary" onClick={onStart} disabled={isLoading}>
        {isLoading ? '启动中...' : '开始游戏'}
      </button>
      <p className="mode-indicator">
        当前模式: 后端AI主持模式
        {voiceModeEnabled && ' | 🔊 语音模式'}
        {continuousVoiceModeEnabled && ' | 🎙️ 连续对话'}
      </p>
    </div>
  )
}
