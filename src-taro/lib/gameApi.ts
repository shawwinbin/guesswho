import Taro from '@tarojs/taro'
import { CreateSessionRequest, GameSessionSnapshot, GuessResponse, HintResponse, QuestionIntent, QuestionResponse } from './types'

// H5 is deployed behind the same-origin reverse proxy, so relative paths are stable here.
const API_BASE_URL = ''

async function taroRequest<T>(path: string, options: {
  method?: 'GET' | 'POST'
  data?: unknown
}): Promise<T> {
  const res = await Taro.request({
    url: `${API_BASE_URL}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json'
    }
  })

  if (res.statusCode >= 400) {
    const msg = res.data?.error?.message || `请求失败: ${res.statusCode}`
    throw new Error(msg)
  }

  return res.data as T
}

export function createSession({ questionLimit, figureScope, level }: CreateSessionRequest): Promise<GameSessionSnapshot> {
  return taroRequest('/v1/game-sessions', {
    method: 'POST',
    data: { questionLimit, figureScope, level }
  })
}

export function fetchSession(sessionId: string): Promise<GameSessionSnapshot> {
  return taroRequest(`/v1/game-sessions/${sessionId}`)
}

export function submitQuestion(sessionId: string, question: string): Promise<QuestionResponse> {
  return taroRequest(`/v1/game-sessions/${sessionId}/questions`, {
    method: 'POST',
    data: { question }
  })
}

export function classifyQuestionIntent(sessionId: string, question: string): Promise<QuestionIntent> {
  return taroRequest(`/v1/game-sessions/${sessionId}/question-intent`, {
    method: 'POST',
    data: { question }
  })
}

export function submitGuess(sessionId: string, guess: string): Promise<GuessResponse> {
  return taroRequest(`/v1/game-sessions/${sessionId}/guesses`, {
    method: 'POST',
    data: { guess }
  })
}

export function requestHint(sessionId: string): Promise<HintResponse> {
  return taroRequest(`/v1/game-sessions/${sessionId}/hints`, {
    method: 'POST'
  })
}

export function request<T>(path: string, options: {
  method?: 'GET' | 'POST'
  data?: unknown
}): Promise<T> {
  return taroRequest<T>(path, options)
}
