import { describe, expect, it } from 'vitest'
import { PostgresGameSessionRepository } from './gameSessionRepository.js'

type QueryResultRow = Record<string, unknown>

class FakePool {
  private readonly sessions = new Map<string, QueryResultRow>()

  getSessionRow(sessionId: string): QueryResultRow | undefined {
    return this.sessions.get(sessionId)
  }

  async query(sql: string, params: unknown[] = []): Promise<{ rowCount: number; rows: QueryResultRow[] }> {
    if (sql.includes('insert into game_sessions')) {
      const row = {
        id: String(params[0]),
        level: params[1],
        status: 'playing',
        question_limit: params[2],
        question_count: 0,
        secret_figure_name: params[3],
        secret_figure_aliases: JSON.parse(String(params[4])),
        secret_figure_era: params[5],
        revealed_name: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
      }
      this.sessions.set(String(params[0]), row)
      return {
        rowCount: 1,
        rows: [row],
      }
    }

    if (sql === 'select * from game_sessions where id = $1') {
      const row = this.sessions.get(String(params[0]))
      return {
        rowCount: row ? 1 : 0,
        rows: row ? [row] : [],
      }
    }

    throw new Error(`Unexpected query: ${sql}`)
  }
}

describe('PostgresGameSessionRepository', () => {
  it('round-trips persisted session level through create and read paths', async () => {
    const repository = new PostgresGameSessionRepository(new FakePool() as never)

    const created = await repository.createSession({
      id: 'session-1',
      level: 6,
      questionLimit: 20,
      secretFigure: {
        name: '李白',
        aliases: ['李太白'],
        era: '唐朝',
      },
    })
    const restored = await repository.findSessionById('session-1')

    expect(created.level).toBe(6)
    expect(restored?.level).toBe(6)
  })

  it('fails loudly when a persisted session row has an invalid level', async () => {
    const pool = new FakePool()
    const repository = new PostgresGameSessionRepository(pool as never)

    await repository.createSession({
      id: 'session-2',
      level: 4,
      questionLimit: 10,
      secretFigure: {
        name: '杜甫',
        aliases: ['杜工部'],
        era: '唐朝',
      },
    })

    const row = pool.getSessionRow('session-2') as QueryResultRow
    row.level = 0

    await expect(repository.findSessionById('session-2')).rejects.toThrow(
      'Invalid game_sessions.level: expected integer >= 1',
    )
  })
})
