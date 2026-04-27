// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVEL_PROGRESS_KEY } from '../../lib/levelProgress'
import type { LevelProgress } from '../../lib/types'

const { redirectToMock, storageGetMock, storageSetMock, routerState } = vi.hoisted(() => ({
  redirectToMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
  routerState: {
    params: {} as Record<string, string | undefined>,
  },
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    redirectTo: redirectToMock,
  },
  useRouter: () => routerState,
}))

vi.mock('@tarojs/components', () => ({
  View: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('../../lib/storage', () => ({
  storage: {
    get: storageGetMock,
    set: storageSetMock,
  },
}))

import ResultPage from './result'

function createProgress(overrides: Partial<LevelProgress> = {}): LevelProgress {
  return {
    currentLevel: 1,
    highestUnlockedLevel: 1,
    highestClearedLevel: 0,
    levelStreak: 0,
    lastResult: null,
    ...overrides,
  }
}

function getProgressWrites(): unknown[][] {
  return storageSetMock.mock.calls.filter(([key]) => key === LEVEL_PROGRESS_KEY)
}

function renderWithParams(
  params: Record<string, string | undefined>,
  options: {
    storedProgress?: LevelProgress
    strictMode?: boolean
  } = {},
): void {
  const { storedProgress = createProgress(), strictMode = false } = options
  const storageState = new Map<string, unknown>([
    [LEVEL_PROGRESS_KEY, storedProgress],
  ])

  routerState.params = params
  storageGetMock.mockImplementation((key: string) => {
    return storageState.has(key) ? storageState.get(key) : null
  })
  storageSetMock.mockImplementation((key: string, value: unknown) => {
    storageState.set(key, value)
  })

  const ui = strictMode ? (
    <StrictMode>
      <ResultPage />
    </StrictMode>
  ) : (
    <ResultPage />
  )

  render(ui)
}

describe('ResultPage level progression', () => {
  beforeEach(() => {
    redirectToMock.mockReset()
    storageGetMock.mockReset()
    storageSetMock.mockReset()
    routerState.params = {}
  })

  it('promotes the next level after a win', () => {
    renderWithParams(
      { winner: 'true', name: '李白', count: '6', level: '4' },
      {
        storedProgress: createProgress({
          currentLevel: 4,
          highestUnlockedLevel: 4,
          highestClearedLevel: 3,
          levelStreak: 1,
          lastResult: 'lose',
        }),
      },
    )

    expect(screen.getByText('第4关通关')).toBeInTheDocument()
    expect(screen.getByText('挑战第5关')).toBeInTheDocument()
    expect(screen.getByText('提问次数')).toBeInTheDocument()
    expect(screen.getByText('6/20')).toBeInTheDocument()
    expect(screen.getByText('已解锁')).toBeInTheDocument()
    expect(screen.queryByText('01:24')).not.toBeInTheDocument()
    expect(screen.queryByText('6/5')).not.toBeInTheDocument()
    expect(screen.queryByText('🪙 +50')).not.toBeInTheDocument()
    expect(screen.queryByText('✹ +1')).not.toBeInTheDocument()
    expect(getProgressWrites()).toHaveLength(1)
    expect(storageSetMock).toHaveBeenCalledWith(LEVEL_PROGRESS_KEY, createProgress({
      currentLevel: 5,
      highestUnlockedLevel: 5,
      highestClearedLevel: 4,
      levelStreak: 2,
      lastResult: 'win',
    }))
  })

  it('keeps the current unlocked level after a loss', () => {
    renderWithParams(
      { winner: 'false', name: '李白', count: '20', level: '4' },
      {
        storedProgress: createProgress({
          currentLevel: 4,
          highestUnlockedLevel: 4,
          highestClearedLevel: 3,
          levelStreak: 2,
          lastResult: 'win',
        }),
      },
    )

    expect(screen.getByText('已为你保留至第4关')).toBeInTheDocument()
    expect(screen.getByText('从第4关继续')).toBeInTheDocument()
    expect(getProgressWrites()).toHaveLength(1)
    expect(storageSetMock).toHaveBeenCalledWith(LEVEL_PROGRESS_KEY, createProgress({
      currentLevel: 4,
      highestUnlockedLevel: 4,
      highestClearedLevel: 3,
      levelStreak: 0,
      lastResult: 'lose',
    }))
  })

  it('does not apply progression twice on the same logical result under StrictMode', () => {
    renderWithParams(
      { winner: 'true', name: '李白', count: '6', level: '4' },
      {
        storedProgress: createProgress({
          currentLevel: 4,
          highestUnlockedLevel: 4,
          highestClearedLevel: 3,
          levelStreak: 1,
          lastResult: 'lose',
        }),
        strictMode: true,
      },
    )

    expect(getProgressWrites()).toHaveLength(1)
    expect(getProgressWrites()[0]).toEqual([
      LEVEL_PROGRESS_KEY,
      expect.objectContaining({
        currentLevel: 5,
        highestUnlockedLevel: 5,
        highestClearedLevel: 4,
        lastResult: 'win',
      }),
    ])
  })

  it('routes the primary CTA back into the game page for the next round', () => {
    renderWithParams(
      { winner: 'true', name: '李白', count: '6', level: '4' },
      {
        storedProgress: createProgress({
          currentLevel: 4,
          highestUnlockedLevel: 4,
          highestClearedLevel: 3,
          levelStreak: 1,
          lastResult: 'lose',
        }),
      },
    )

    fireEvent.click(screen.getByText('挑战第5关'))

    expect(redirectToMock).toHaveBeenCalledWith({
      url: '/pages/game/game',
    })
  })
})
