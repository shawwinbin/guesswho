import Taro from '@tarojs/taro'
import { CreateSessionRequest, GameSessionSnapshot, GuessResponse, QuestionResponse } from './types'

const API_BASE_URL = process.env.TARO_ENV === 'h5'
  ? ''
  : ''

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

export function createSession(payload: CreateSessionRequest): Promise<GameSessionSnapshot> {
  return taroRequest('/v1/game-sessions', {
    method: 'POST',
    data: payload
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

export function submitGuess(sessionId: string, guess: string): Promise<GuessResponse> {
  return taroRequest(`/v1/game-sessions/${sessionId}/guesses`, {
    method: 'POST',
    data: { guess }
  })
}

export function request<T>(path: string, options: {
  method?: 'GET' | 'POST'
  data?: unknown
}): Promise<T> {
  return taroRequest<T>(path, options)
}