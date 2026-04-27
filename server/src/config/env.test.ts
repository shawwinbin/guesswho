import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

describe('loadEnv', () => {
  it('loads configuration from a local .env file when process env is empty', () => {
    const directory = mkdtempSync(join(tmpdir(), 'history-guess-env-'))

    try {
      writeFileSync(join(directory, '.env'), [
        'PORT=4500',
        'CORS_ORIGIN=http://localhost:5173',
        'DATABASE_URL=postgres://postgres:postgres@localhost:5432/history_figure_guess',
        'LLM_BASE_URL=https://api.openai.com/v1',
        'LLM_API_KEY=test-key',
        'LLM_MODEL=gpt-4o-mini',
      ].join('\n'))

      const loaded = loadEnv({}, directory)

      expect(loaded).toEqual({
        port: 4500,
        corsOrigin: 'http://localhost:5173',
        databaseUrl: 'postgres://postgres:postgres@localhost:5432/history_figure_guess',
        llmBaseUrl: 'https://api.openai.com/v1',
        llmApiKey: 'test-key',
        llmModel: 'gpt-4o-mini',
      })
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
