import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GameBoard } from './GameBoard'
import { ResultScreen } from './ResultScreen'
import { StartScreen } from './StartScreen'

describe('game screens', () => {
  it('renders start screen content and handles start action', () => {
    const onStart = vi.fn()

    render(
      <StartScreen
        voiceModeEnabled={false}
        continuousVoiceModeEnabled={false}
        questionLimit={20}
        figureScopeLabel="全部历史人物"
        isLoading={false}
        onStart={onStart}
      />,
    )

    expect(screen.getByText(/欢迎来到历史人物猜谜/)).toBeInTheDocument()
    expect(screen.getByText(/当前模式: 后端AI主持模式/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('开始游戏'))
    expect(onStart).toHaveBeenCalled()
  })

  it('renders game board history and question actions', () => {
    const onAskQuestion = vi.fn()
    const onRestart = vi.fn()

    render(
      <GameBoard
        history={[{ question: '他是皇帝吗？', answer: '是' }]}
        remainingQuestions={3}
        isLoading={false}
        isLimitExhausted={false}
        suggestedQuestions={['他是中国人吗？']}
        continuousVoiceModeEnabled={false}
        continuousVoiceRequiresManualStart={false}
        continuousVoiceStatusLabel={null}
        continuousVoiceHelpLabel={null}
        activeVoiceStatus={null}
        questionInput="他是秦朝人物吗？"
        guessInput=""
        questionVoiceButton={<span>question-voice</span>}
        guessVoiceButton={<span>guess-voice</span>}
        onRestart={onRestart}
        onAskQuestion={onAskQuestion}
        onQuestionChange={vi.fn()}
        onQuestionSubmit={vi.fn()}
        onQuestionFocus={vi.fn()}
        onGuessChange={vi.fn()}
        onGuessSubmit={vi.fn()}
        onGuessFocus={vi.fn()}
      />,
    )

    expect(screen.getByText(/问: 他是皇帝吗？/)).toBeInTheDocument()
    expect(screen.getByText(/答: 是/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('重新开始'))
    fireEvent.click(screen.getByText('他是中国人吗？'))

    expect(onRestart).toHaveBeenCalled()
    expect(onAskQuestion).toHaveBeenCalledWith('他是中国人吗？')
  })

  it('shows continuous voice command hints when continuous mode is enabled', () => {
    render(
      <GameBoard
        history={[]}
        remainingQuestions={5}
        isLoading={false}
        isLimitExhausted={false}
        suggestedQuestions={[]}
        continuousVoiceModeEnabled={true}
        continuousVoiceRequiresManualStart={true}
        continuousVoiceStatusLabel="等待点击开始连续语音对话"
        continuousVoiceHelpLabel="请先在浏览器地址栏或系统设置里允许麦克风，再点一次“开始连续语音对话”。"
        activeVoiceStatus={<span>voice-status</span>}
        questionInput=""
        guessInput=""
        questionVoiceButton={<button>voice-entry</button>}
        guessVoiceButton={<span>guess-voice</span>}
        onRestart={vi.fn()}
        onAskQuestion={vi.fn()}
        onQuestionChange={vi.fn()}
        onQuestionSubmit={vi.fn()}
        onQuestionFocus={vi.fn()}
        onGuessChange={vi.fn()}
        onGuessSubmit={vi.fn()}
        onGuessFocus={vi.fn()}
      />,
    )

    expect(screen.getByText(/连续语音对话已开启/)).toBeInTheDocument()
    expect(screen.getByText(/可用口令：重新开始 \/ 再说一遍 \/ 退出语音模式/)).toBeInTheDocument()
    expect(screen.getByText(/当前浏览器需要你先点一次/)).toBeInTheDocument()
    expect(screen.getByText('等待点击开始连续语音对话')).toBeInTheDocument()
    expect(screen.getByText(/请先在浏览器地址栏或系统设置里允许麦克风/)).toBeInTheDocument()
    expect(screen.getByText('voice-entry')).toBeInTheDocument()
    expect(screen.queryByText('guess-voice')).not.toBeInTheDocument()
  })

  it('renders result screen for a winning guess', () => {
    const onRestart = vi.fn()

    render(
      <ResultScreen
        endReason="guess"
        isWinner={true}
        revealedName="秦始皇"
        lastGuess="秦始皇"
        questionCount={4}
        questionLimit={20}
        voiceModeEnabled={false}
        onRestart={onRestart}
      />,
    )

    expect(screen.getByText(/恭喜你猜对了/)).toBeInTheDocument()
    expect(screen.getByText('秦始皇')).toBeInTheDocument()

    fireEvent.click(screen.getByText('再玩一次'))
    expect(onRestart).toHaveBeenCalled()
  })
})
