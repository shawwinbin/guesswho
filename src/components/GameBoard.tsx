import type { KeyboardEvent, ReactNode } from 'react'
import type { QuestionAnswer } from '../lib/types'

interface GameBoardProps {
  history: QuestionAnswer[]
  remainingQuestions: number | null
  isLoading: boolean
  isLimitExhausted: boolean
  suggestedQuestions: readonly string[]
  continuousVoiceModeEnabled: boolean
  continuousVoiceRequiresManualStart: boolean
  continuousVoiceStatusLabel: string | null
  continuousVoiceHelpLabel: string | null
  activeVoiceStatus: ReactNode
  questionInput: string
  guessInput: string
  questionVoiceButton: ReactNode
  guessVoiceButton: ReactNode
  onRestart: () => void
  onAskQuestion: (question: string) => void
  onQuestionChange: (value: string) => void
  onQuestionSubmit: () => void
  onQuestionFocus: () => void
  onGuessChange: (value: string) => void
  onGuessSubmit: () => void
  onGuessFocus: () => void
}

export function GameBoard({
  history,
  remainingQuestions,
  isLoading,
  isLimitExhausted,
  suggestedQuestions,
  continuousVoiceModeEnabled,
  continuousVoiceRequiresManualStart,
  continuousVoiceStatusLabel,
  continuousVoiceHelpLabel,
  activeVoiceStatus,
  questionInput,
  guessInput,
  questionVoiceButton,
  guessVoiceButton,
  onRestart,
  onAskQuestion,
  onQuestionChange,
  onQuestionSubmit,
  onQuestionFocus,
  onGuessChange,
  onGuessSubmit,
  onGuessFocus,
}: GameBoardProps) {
  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onQuestionSubmit()
    }
  }

  const handleGuessKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onGuessSubmit()
    }
  }

  return (
    <div className="game-board">
      <div className="status-bar">
        <span>已提问 {history.length} 次</span>
        {remainingQuestions !== null && <span className="remaining">剩余 {remainingQuestions} 次</span>}
        <span className="mode-badge">AI 已选择人物</span>
        <button className="btn-secondary" onClick={onRestart}>重新开始</button>
      </div>

      <div className="question-hint">💡 提示：请问可以用"是"或"不是"回答的问题</div>
      <div className="consistency-hint">🧠 AI 会参考整局问答历史，尽量保持前后一致。</div>
      {continuousVoiceModeEnabled && (
        <div className="continuous-voice-panel">
          <div className="continuous-voice-header">
            <strong>🎙️ 连续语音对话已开启</strong>
            <span>说出人名会直接作为最终猜测</span>
          </div>
          <div className="continuous-voice-actions">
            {questionVoiceButton}
            <span className="continuous-voice-tip">点一次开始后持续对话</span>
          </div>
          {continuousVoiceRequiresManualStart && (
            <div className="continuous-voice-commands">
              当前浏览器需要你先点一次“开始连续语音对话”，之后才会进入连续收听。
            </div>
          )}
          {continuousVoiceStatusLabel && (
            <div className="continuous-voice-status-banner">{continuousVoiceStatusLabel}</div>
          )}
          {continuousVoiceHelpLabel && (
            <div className="continuous-voice-help">{continuousVoiceHelpLabel}</div>
          )}
          {activeVoiceStatus}
          <div className="continuous-voice-commands">
            可用口令：重新开始 / 再说一遍 / 退出语音模式
          </div>
        </div>
      )}

      <div className="suggestions">
        <span className="suggestions-label">快捷提问：</span>
        {suggestedQuestions.map(item => (
          <button
            key={item}
            className="suggestion-chip"
            onClick={() => onAskQuestion(item)}
            disabled={isLoading || isLimitExhausted}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="history-panel">
        <h3>问答历史</h3>
        {history.length === 0 ? (
          <p className="empty-history">还没有提问，点击上方快捷问题或输入自定义问题</p>
        ) : (
          <ul className="history-list">
            {history.map((item, index) => (
              <li key={`${item.question}-${index}`}>
                <span className="q">问: {item.question}</span>
                <span className={`a ${item.answer === '是' ? 'yes' : 'no'}`}>答: {item.answer}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="input-panel">
        {!continuousVoiceModeEnabled && activeVoiceStatus}
        <div className="question-input">
          <input
            type="text"
            placeholder="输入你的问题（建议用是/不是问题）..."
            value={questionInput}
            onChange={event => onQuestionChange(event.target.value)}
            disabled={isLoading || isLimitExhausted}
            onKeyDown={handleQuestionKeyDown}
            onFocus={onQuestionFocus}
          />
          {!continuousVoiceModeEnabled && questionVoiceButton}
          <button onClick={onQuestionSubmit} disabled={isLoading || !questionInput.trim() || isLimitExhausted}>
            {isLoading ? '...' : '提问'}
          </button>
        </div>

        <div className="guess-input">
          <input
            type="text"
            placeholder="输入你猜测的历史人物名字..."
            value={guessInput}
            onChange={event => onGuessChange(event.target.value)}
            disabled={isLoading}
            onKeyDown={handleGuessKeyDown}
            onFocus={onGuessFocus}
          />
          {!continuousVoiceModeEnabled && guessVoiceButton}
          <button className="btn-guess" onClick={onGuessSubmit} disabled={isLoading || !guessInput.trim()}>
            {isLoading ? '...' : '最终猜测'}
          </button>
        </div>
      </div>
    </div>
  )
}
