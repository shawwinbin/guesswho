// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
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

function renderWithParams(params: Record<string, string | undefined>, storedProgress = createProgress()): void {
  routerState.params = params
  storageGetMock.mockImplementation((key: string) => {
    if (key === LEVEL_PROGRESS_KEY) {
      return storedProgress
    }

    return null
  })

  render(<ResultPage />)
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
      createProgress({
        currentLevel: 4,
        highestUnlockedLevel: 4,
        highestClearedLevel: 3,
        levelStreak: 1,
        lastResult: 'lose',
      }),
    )

    expect(screen.getByText('第4关通关')).toBeInTheDocument()
    expect(screen.getByText('挑战第5关')).toBeInTheDocument()
    expect(storageSetMock).toHaveBeenCalledTimes(1)
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
      createProgress({
        currentLevel: 4,
        highestUnlockedLevel: 4,
        highestClearedLevel: 3,
        levelStreak: 2,
        lastResult: 'win',
      }),
    )

    expect(screen.getByText('已为你保留至第4关')).toBeInTheDocument()
    expect(screen.getByText('从第4关继续')).toBeInTheDocument()
    expect(storageSetMock).toHaveBeenCalledTimes(1)
    expect(storageSetMock).toHaveBeenCalledWith(LEVEL_PROGRESS_KEY, createProgress({
      currentLevel: 4,
      highestUnlockedLevel: 4,
      highestClearedLevel: 3,
      levelStreak: 0,
      lastResult: 'lose',
    }))
  })
})
