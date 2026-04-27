import { apiRequest } from './apiClient'
import type { CreateSessionRequest, GameSessionSnapshot, GuessResponse, QuestionResponse } from './types'

export function createSession(payload: CreateSessionRequest): Promise<GameSessionSnapshot> {
  return apiRequest('/v1/game-sessions', {
    method: 'POST',
    bodyJson: payload,
  })
}

export function fetchSession(sessionId: string): Promise<GameSessionSnapshot> {
  return apiRequest(`/v1/game-sessions/${sessionId}`)
}

export function submitQuestion(sessionId: string, question: string): Promise<QuestionResponse> {
  return apiRequest(`/v1/game-sessions/${sessionId}/questions`, {
    method: 'POST',
    bodyJson: { question },
  })
}

export function submitGuess(sessionId: string, guess: string): Promise<GuessResponse> {
  return apiRequest(`/v1/game-sessions/${sessionId}/guesses`, {
    method: 'POST',
    bodyJson: { guess },
  })
}
