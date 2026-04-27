// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVEL_PROGRESS_KEY } from '../../lib/levelProgress'
import type { GameState, GamePhase } from '../../hooks/useGameSession'

const {
  navigateToMock,
  storageGetMock,
  startGameMock,
  askQuestionMock,
  makeGuessMock,
  requestAiHintMock,
  restartMock,
  clearErrorMock,
} = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  storageGetMock: vi.fn(),
  startGameMock: vi.fn(),
  askQuestionMock: vi.fn(),
  makeGuessMock: vi.fn(),
  requestAiHintMock: vi.fn(),
  restartMock: vi.fn(),
  clearErrorMock: vi.fn(),
}))

const mockGameState: GameState = {
  sessionId: 'session-1',
  phase: 'playing' as GamePhase,
  level: 7,
  history: [],
  guesses: [],
  isWinner: false,
  errorMsg: null,
  revealedName: null,
  remainingQuestions: 20,
  hints: [],
  remainingHints: 2,
}

const mockGameSession = {
  state: mockGameState,
  isLoading: false,
  isRestoreComplete: true,
  startGame: startGameMock,
  askQuestion: askQuestionMock,
  makeGuess: makeGuessMock,
  requestAiHint: requestAiHintMock,
  restart: restartMock,
  clearError: clearErrorMock,
}

vi.mock('@tarojs/taro', () => ({
  default: {
    navigateTo: navigateToMock,
  },
}))

vi.mock('@tarojs/components', () => ({
  View: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <span {...props}>{children}</span>,
  ScrollView: ({
    children,
    scrollY: _scrollY,
    scrollWithAnimation: _scrollWithAnimation,
    ...props
  }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('../../lib/storage', () => ({
  storage: {
    get: storageGetMock,
  },
}))

vi.mock('../../hooks/useVoiceGame', () => ({
  useVoiceGame: () => ({
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    isRecording: false,
    transcript: '',
  }),
}))

vi.mock('../../hooks/useGameSession', () => ({
  useGameSession: () => mockGameSession,
}))

vi.mock('../../components/QuestionForm', () => ({
  QuestionForm: () => <div>QuestionForm</div>,
}))

vi.mock('../../components/GuessForm', () => ({
  GuessForm: () => <div>GuessForm</div>,
}))

vi.mock('../../components/AnswerBadge', () => ({
  AnswerBadge: () => <div>AnswerBadge</div>,
}))

vi.mock('../../components/VoiceControls', () => ({
  VoiceControls: () => <div>VoiceControls</div>,
}))

import GamePage from './game'

describe('GamePage level HUD', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    storageGetMock.mockReset()
    startGameMock.mockReset()
    askQuestionMock.mockReset()
    makeGuessMock.mockReset()
    requestAiHintMock.mockReset()
    restartMock.mockReset()
    clearErrorMock.mockReset()
    mockGameState.sessionId = 'session-1'
    mockGameState.phase = 'playing'
    mockGameState.level = 7
    mockGameState.history = []
    mockGameState.guesses = []
    mockGameState.isWinner = false
    mockGameState.errorMsg = null
    mockGameState.revealedName = null
    mockGameState.remainingQuestions = 20
    mockGameState.hints = []
    mockGameState.remainingHints = 2
    mockGameSession.isLoading = false
    mockGameSession.isRestoreComplete = true
    storageGetMock.mockImplementation((key: string) => {
      if (key === LEVEL_PROGRESS_KEY) {
        return {
          currentLevel: 7,
          highestUnlockedLevel: 7,
          highestClearedLevel: 6,
          levelStreak: 2,
          lastResult: 'win',
        }
      }

      return null
    })
  })

  it('shows a compact level header and core actions', async () => {
    render(<GamePage />)

    expect(await screen.findByText('第7关 · 常识')).toBeInTheDocument()
    expect(screen.getByText('00/20')).toBeInTheDocument()
    expect(screen.getByText('胜利后解锁第8关')).toBeInTheDocument()
    expect(screen.getByText('AI 提示（剩余 2 次）')).toBeInTheDocument()
    expect(screen.queryByText('LEVEL 7')).not.toBeInTheDocument()
    expect(screen.queryByText('难度提示')).not.toBeInTheDocument()
    expect(screen.queryByText('本关目标')).not.toBeInTheDocument()
    expect(screen.queryByText('请只提问可以用“是”或“否”回答的问题。')).not.toBeInTheDocument()
    expect(screen.queryByText('问答卷轴')).not.toBeInTheDocument()
    expect(screen.queryByText('开始提问')).not.toBeInTheDocument()
  })

  it('shows used AI hints on the game page', async () => {
    mockGameState.hints = ['这位人物主要活跃在唐朝。']
    mockGameState.remainingHints = 1

    render(<GamePage />)

    expect(await screen.findByText('AI 提示（剩余 1 次）')).toBeInTheDocument()
    expect(screen.getByText('提示 1：这位人物主要活跃在唐朝。')).toBeInTheDocument()
  })

  it('shows broader unlocked progress instead of a fake next-unlock claim when replaying an older level', async () => {
    mockGameState.level = 5
    storageGetMock.mockImplementation((key: string) => {
      if (key === LEVEL_PROGRESS_KEY) {
        return {
          currentLevel: 5,
          highestUnlockedLevel: 8,
          highestClearedLevel: 7,
          levelStreak: 0,
          lastResult: 'lose',
        }
      }

      return null
    })

    render(<GamePage />)

    expect(await screen.findByText('第5关 · 常识')).toBeInTheDocument()
    expect(screen.getByText('当前已解锁至第8关')).toBeInTheDocument()
    expect(screen.queryByText('胜利后解锁第6关')).not.toBeInTheDocument()
  })

  it('auto-starts only once per mount even if the initial start falls back to idle after a failure', () => {
    mockGameState.sessionId = null
    mockGameState.phase = 'idle'

    const { rerender } = render(<GamePage />)

    expect(startGameMock).toHaveBeenCalledTimes(1)
    expect(startGameMock).toHaveBeenCalledWith(7)

    mockGameState.phase = 'loading'
    rerender(<GamePage />)

    mockGameState.phase = 'idle'
    rerender(<GamePage />)

    expect(startGameMock).toHaveBeenCalledTimes(1)
  })

  it('navigates to result with the played session level instead of the HUD fallback level', () => {
    mockGameState.phase = 'ended'
    mockGameState.level = null
    mockGameState.revealedName = '李白'
    mockGameState.history = [
      { question: '他是诗人吗？', answer: '是' },
      { question: '他生活在唐朝吗？', answer: '是' },
    ]

    render(<GamePage />)

    expect(navigateToMock).toHaveBeenCalledWith({
      url: '/pages/result/result?winner=false&name=李白&count=2&level=null',
    })
  })
})
