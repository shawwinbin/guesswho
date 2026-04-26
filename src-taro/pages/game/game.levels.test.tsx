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
  restartMock,
  clearErrorMock,
} = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  storageGetMock: vi.fn(),
  startGameMock: vi.fn(),
  askQuestionMock: vi.fn(),
  makeGuessMock: vi.fn(),
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
  useGameSession: () => ({
    state: mockGameState,
    isLoading: false,
    isRestoreComplete: true,
    startGame: startGameMock,
    askQuestion: askQuestionMock,
    makeGuess: makeGuessMock,
    restart: restartMock,
    clearError: clearErrorMock,
  }),
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
    restartMock.mockReset()
    clearErrorMock.mockReset()
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

  it('shows level title and unlock hint', async () => {
    render(<GamePage />)

    expect(await screen.findByText('LEVEL 7')).toBeInTheDocument()
    expect(screen.getByText('熟手')).toBeInTheDocument()
    expect(screen.getByText('胜利后解锁第8关')).toBeInTheDocument()
  })
})
