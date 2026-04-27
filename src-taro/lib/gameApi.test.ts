import Taro from '@tarojs/taro'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSession, requestHint } from './gameApi'

const requestMock = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    request: requestMock,
  },
}))

describe('gameApi', () => {
  beforeEach(() => {
    requestMock.mockReset()
    requestMock.mockResolvedValue({
      statusCode: 200,
      data: {},
    })
  })

  it('does not send a json content type for empty POST requests', async () => {
    await requestHint('session-1')

    expect(Taro.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/v1/game-sessions/session-1/hints',
      method: 'POST',
      data: undefined,
      header: undefined,
    }))
  })

  it('sends json content type when a request has a body', async () => {
    await createSession({
      level: 1,
      questionLimit: 20,
      figureScope: 'all',
    })

    expect(Taro.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/v1/game-sessions',
      method: 'POST',
      data: {
        level: 1,
        questionLimit: 20,
        figureScope: 'all',
      },
      header: {
        'Content-Type': 'application/json',
      },
    }))
  })
})
