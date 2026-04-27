import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors.js'
import { createHostLlmService } from './hostLlmService.js'

function createJsonResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }),
  } as Response
}

describe('hostLlmService', () => {
  it('parses the start-round figure payload from upstream JSON content', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createJsonResponse('{"name":"李白","aliases":["李太白"],"era":"唐朝"}'))
    const service = createHostLlmService({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-test',
      fetchImpl,
    })

    const figure = await service.startRound({ figureScope: 'poet' })

    expect(figure).toEqual({
      name: '李白',
      aliases: ['李太白'],
      era: '唐朝',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('normalizes yes-no answers returned by the upstream host', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createJsonResponse('yes'))
    const service = createHostLlmService({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-test',
      fetchImpl,
    })

    const answer = await service.answerQuestion({
      question: '他是诗人吗？',
      figure: {
        name: '李白',
        aliases: ['李太白'],
        era: '唐朝',
      },
    })

    expect(answer).toBe('是')
  })

  it('parses guess verdicts from upstream JSON content', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createJsonResponse('{"correct":false,"revealedName":"李白"}'))
    const service = createHostLlmService({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-test',
      fetchImpl,
    })

    const verdict = await service.judgeGuess({
      guess: '杜甫',
      figure: {
        name: '李白',
        aliases: ['李太白'],
        era: '唐朝',
      },
    })

    expect(verdict).toEqual({
      isCorrect: false,
      revealedName: '李白',
    })
  })

  it('falls back to the stored figure names when verdict JSON is malformed', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createJsonResponse('not-json'))
    const service = createHostLlmService({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-test',
      fetchImpl,
    })

    const verdict = await service.judgeGuess({
      guess: '李太白',
      figure: {
        name: '李白',
        aliases: ['李太白'],
        era: '唐朝',
      },
    })

    expect(verdict).toEqual({
      isCorrect: true,
      revealedName: '李白',
    })
  })

  it('throws an upstream error when the host fails to return a valid start figure', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createJsonResponse('not-json'))
    const service = createHostLlmService({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-test',
      fetchImpl,
    })

    await expect(service.startRound({ figureScope: 'all' })).rejects.toBeInstanceOf(AppError)
  })
})
