interface ResultScreenProps {
  endReason: 'guess' | 'limit' | null
  isWinner: boolean
  revealedName: string
  lastGuess?: string
  questionCount: number
  questionLimit: number
  voiceModeEnabled: boolean
  onRestart: () => void
}

export function ResultScreen({
  endReason,
  isWinner,
  revealedName,
  lastGuess,
  questionCount,
  questionLimit,
  voiceModeEnabled,
  onRestart,
}: ResultScreenProps) {
  return (
    <div className="result-screen">
      {endReason === 'limit' ? (
        <div className="limit-exhausted">
          <h2>⏰ 提问次数已用完</h2>
          <p>你未能猜出这位历史人物</p>
          <p>正确答案: <strong>{revealedName}</strong></p>
        </div>
      ) : isWinner ? (
        <div className="win">
          <h2>🎉 恭喜你猜对了！</h2>
          <p>答案是: <strong>{revealedName}</strong></p>
        </div>
      ) : (
        <div className="lose">
          <h2>😢 答错了</h2>
          <p>你的猜测: <strong>{lastGuess}</strong></p>
          <p>正确答案: <strong>{revealedName}</strong></p>
        </div>
      )}

      <div className="stats">
        <h4>本次游戏统计</h4>
        <p>提问次数: {questionCount}</p>
        {questionLimit > 0 && <p>次数上限: {questionLimit}</p>}
        <p>游戏模式: 后端AI主持</p>
        {voiceModeEnabled && <p>语音模式: 开启</p>}
      </div>

      <button className="btn-primary" onClick={onRestart}>再玩一次</button>
    </div>
  )
}
