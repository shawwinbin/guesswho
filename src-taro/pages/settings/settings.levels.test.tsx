// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVEL_PROGRESS_KEY } from '../../lib/levelProgress'

type DialogOptions = {
  title: string
  content: string
  onConfirm?: () => void
}

const RESET_DATA_AT_KEY = 'history-figure-guess-reset-data-at'

const {
  dialogConfirmMock,
  navigateBackMock,
  storageGetMock,
  storageRemoveMock,
  storageSetMock,
  toastShowMock,
} = vi.hoisted(() => ({
  dialogConfirmMock: vi.fn(),
  navigateBackMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  storageSetMock: vi.fn(),
  toastShowMock: vi.fn(),
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    navigateBack: navigateBackMock,
    login: vi.fn(),
    getUserInfo: vi.fn(),
  },
}))

vi.mock('@tarojs/components', () => ({
  View: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <span {...props}>{children}</span>,
  Image: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <img {...props}>{children}</img>,
}))

vi.mock('@nutui/nutui-react-taro', () => ({
  Dialog: {
    confirm: dialogConfirmMock,
  },
  Toast: {
    show: toastShowMock,
  },
}))

vi.mock('../../lib/storage', () => ({
  storage: {
    get: storageGetMock,
    remove: storageRemoveMock,
    set: storageSetMock,
  },
}))

vi.mock('../../utils/platform', () => ({
  platform: {
    isWeapp: false,
  },
}))

import SettingsPage from './settings'

describe('SettingsPage level reset flows', () => {
  beforeEach(() => {
    dialogConfirmMock.mockReset()
    navigateBackMock.mockReset()
    storageGetMock.mockReset()
    storageRemoveMock.mockReset()
    storageSetMock.mockReset()
    toastShowMock.mockReset()
    storageGetMock.mockReturnValue(null)
    dialogConfirmMock.mockImplementation(({ onConfirm }: DialogOptions) => {
      onConfirm?.()
    })
  })

  it('resets settings and level progress while invalidating any previously saved round restore', () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByText('重置数据（设置/关卡）'))

    expect(dialogConfirmMock).toHaveBeenCalledWith({
      title: '清除数据',
      content: '确定要清除设置和关卡进度吗？',
      onConfirm: expect.any(Function),
    })
    expect(storageRemoveMock).toHaveBeenCalledWith('game-settings')
    expect(storageRemoveMock).toHaveBeenCalledWith('wechat-openid')
    expect(storageRemoveMock).toHaveBeenCalledWith('wechat-userinfo')
    expect(storageRemoveMock).toHaveBeenCalledWith(LEVEL_PROGRESS_KEY)
    expect(storageRemoveMock).not.toHaveBeenCalledWith('history-figure-guess-session')
    expect(storageSetMock).toHaveBeenCalledWith(RESET_DATA_AT_KEY, expect.any(Number))
    expect(toastShowMock).toHaveBeenCalledWith('数据已清除')
  })

  it('shows the fixed 20-question rule and removes the old 30-question entry', () => {
    render(<SettingsPage />)

    expect(screen.getByText('固定 20 次')).toBeTruthy()
    expect(screen.getByText('所有关卡提问次数一致，难度只由人物池递进。')).toBeTruthy()
    expect(screen.queryByText('30次')).toBeNull()
  })
})
