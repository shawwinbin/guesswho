// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVEL_PROGRESS_KEY } from '../../lib/levelProgress'
import type { LevelProgress } from '../../lib/types'

const { navigateToMock, storageGetMock, storageSetMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    navigateTo: navigateToMock,
  },
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

import IndexPage from './index'

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

describe('IndexPage level progress', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    storageGetMock.mockReset()
    storageSetMock.mockReset()
    storageGetMock.mockReturnValue(null)
  })

  it('renders the stored current level with a resume CTA', () => {
    storageGetMock.mockImplementation((key: string) => {
      if (key === LEVEL_PROGRESS_KEY) {
        return createProgress({
          currentLevel: 7,
          highestUnlockedLevel: 9,
          highestClearedLevel: 6,
          levelStreak: 3,
          lastResult: 'win',
        })
      }

      return null
    })

    render(<IndexPage />)

    expect(screen.getAllByText('第7关').length).toBeGreaterThan(0)
    expect(screen.getByText('继续第7关')).toBeInTheDocument()
    expect(screen.getAllByText('已通关').length).toBeGreaterThan(0)
    expect(screen.getByText('6 关')).toBeInTheDocument()
    expect(screen.getByText('已解锁')).toBeInTheDocument()
    expect(screen.getByText('9 关')).toBeInTheDocument()
  })

  it('lets players switch to an older unlocked level before starting', () => {
    storageGetMock.mockImplementation((key: string) => {
      if (key === LEVEL_PROGRESS_KEY) {
        return createProgress({
          currentLevel: 7,
          highestUnlockedLevel: 9,
          highestClearedLevel: 6,
          lastResult: 'win',
        })
      }

      return null
    })

    render(<IndexPage />)

    fireEvent.click(screen.getByText('第5关'))

    expect(screen.getAllByText('第5关').length).toBeGreaterThan(0)
    expect(screen.getByText('继续第5关')).toBeInTheDocument()
    expect(storageSetMock).toHaveBeenCalledWith(LEVEL_PROGRESS_KEY, createProgress({
      currentLevel: 5,
      highestUnlockedLevel: 9,
      highestClearedLevel: 6,
      levelStreak: 0,
      lastResult: 'win',
    }))
  })
})
