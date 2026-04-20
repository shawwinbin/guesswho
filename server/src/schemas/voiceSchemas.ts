import { badRequest } from '../lib/errors.js'

export function parseSynthesizeBody(input: unknown): { text: string } {
  const body = asObject(input)
  if (typeof body.text !== 'string' || !body.text.trim()) {
    throw badRequest('text 不能为空')
  }

  return {
    text: body.text.trim(),
  }
}

export interface TranscribeResponse {
  text: string
}

export interface SynthesizeResponse {
  audioUrl: string
}

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('请求体必须是对象')
  }

  return input as Record<string, unknown>
}