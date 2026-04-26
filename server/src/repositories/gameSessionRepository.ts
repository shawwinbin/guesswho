import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'

export interface SecretFigureRecord {
  name: string
  aliases: string[]
  era: string
}

export interface CreateSessionInput {
  id: string
  level: number
  questionLimit: number
  secretFigure: SecretFigureRecord
}

export interface UpdateSessionAfterQuestionInput {
  questionCount: number
  status: 'playing' | 'ended'
  revealedName?: string | null
}

export interface UpdateSessionAfterGuessInput {
  revealedName: string
}

export interface GameSessionRecord {
  id: string
  level: number
  status: 'playing' | 'ended'
  questionLimit: number
  questionCount: number
  secretFigureName: string
  secretFigureAliases: string[]
  secretFigureEra: string
  revealedName: string | null
  createdAt: Date
  updatedAt: Date
}

export interface GameEventRecord {
  id: string
  sessionId: string
  eventType: 'question' | 'guess'
  questionText: string | null
  answerText: '是' | '不是' | null
  guessText: string | null
  isCorrect: boolean | null
  createdAt: Date
}

export interface ListSessionEventsOptions {
  sessionId: string
}

export interface GameSessionRepository {
  createSession(input: CreateSessionInput): Promise<GameSessionRecord>
  findSessionById(sessionId: string): Promise<GameSessionRecord | null>
  updateSessionAfterQuestion(sessionId: string, input: UpdateSessionAfterQuestionInput): Promise<GameSessionRecord>
  updateSessionAfterGuess(sessionId: string, input: UpdateSessionAfterGuessInput): Promise<GameSessionRecord>
}

export interface GameEventRepository {
  appendQuestionEvent(sessionId: string, question: string, answer: '是' | '不是'): Promise<void>
  appendGuessEvent(sessionId: string, guess: string, isCorrect: boolean): Promise<void>
  listSessionEvents(options: ListSessionEventsOptions): Promise<GameEventRecord[]>
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error(`Invalid ${fieldName}: expected integer >= 1`)
  }

  return Number(value)
}

function mapSessionRow(row: Record<string, unknown>): GameSessionRecord {
  return {
    id: String(row.id),
    level: parsePositiveInteger(row.level, 'game_sessions.level'),
    status: row.status === 'ended' ? 'ended' : 'playing',
    questionLimit: Number(row.question_limit),
    questionCount: Number(row.question_count),
    secretFigureName: String(row.secret_figure_name),
    secretFigureAliases: Array.isArray(row.secret_figure_aliases)
      ? row.secret_figure_aliases.map(value => String(value))
      : [],
    secretFigureEra: String(row.secret_figure_era ?? ''),
    revealedName: row.revealed_name ? String(row.revealed_name) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  }
}

function mapEventRow(row: Record<string, unknown>): GameEventRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    eventType: row.event_type === 'guess' ? 'guess' : 'question',
    questionText: row.question_text ? String(row.question_text) : null,
    answerText: row.answer_text === '是' || row.answer_text === '不是'
      ? row.answer_text
      : null,
    guessText: row.guess_text ? String(row.guess_text) : null,
    isCorrect: typeof row.is_correct === 'boolean' ? row.is_correct : null,
    createdAt: new Date(String(row.created_at)),
  }
}

export class PostgresGameSessionRepository implements GameSessionRepository {
  constructor(private readonly pool: Pool) {}

  async createSession(input: CreateSessionInput): Promise<GameSessionRecord> {
    const result = await this.pool.query(
      `insert into game_sessions (
        id,
        level,
        status,
        question_limit,
        question_count,
        secret_figure_name,
        secret_figure_aliases,
        secret_figure_era,
        revealed_name
      ) values ($1, $2, 'playing', $3, 0, $4, $5::jsonb, $6, null)
      returning *`,
      [
        input.id,
        input.level,
        input.questionLimit,
        input.secretFigure.name,
        JSON.stringify(input.secretFigure.aliases),
        input.secretFigure.era,
      ],
    )

    return mapSessionRow(result.rows[0] as Record<string, unknown>)
  }

  async findSessionById(sessionId: string): Promise<GameSessionRecord | null> {
    const result = await this.pool.query('select * from game_sessions where id = $1', [sessionId])
    if (result.rowCount === 0) return null
    return mapSessionRow(result.rows[0] as Record<string, unknown>)
  }

  async updateSessionAfterQuestion(sessionId: string, input: UpdateSessionAfterQuestionInput): Promise<GameSessionRecord> {
    const result = await this.pool.query(
      `update game_sessions
      set question_count = $2,
          status = $3,
          revealed_name = $4,
          updated_at = now()
      where id = $1
      returning *`,
      [sessionId, input.questionCount, input.status, input.revealedName ?? null],
    )

    return mapSessionRow(result.rows[0] as Record<string, unknown>)
  }

  async updateSessionAfterGuess(sessionId: string, input: UpdateSessionAfterGuessInput): Promise<GameSessionRecord> {
    const result = await this.pool.query(
      `update game_sessions
      set status = 'ended',
          revealed_name = $2,
          updated_at = now()
      where id = $1
      returning *`,
      [sessionId, input.revealedName],
    )

    return mapSessionRow(result.rows[0] as Record<string, unknown>)
  }
}

export class PostgresGameEventRepository implements GameEventRepository {
  constructor(private readonly pool: Pool) {}

  async appendQuestionEvent(sessionId: string, question: string, answer: '是' | '不是'): Promise<void> {
    await this.pool.query(
      `insert into game_events (
        id,
        session_id,
        event_type,
        question_text,
        answer_text,
        guess_text,
        is_correct
      ) values ($1, $2, 'question', $3, $4, null, null)`,
      [randomUUID(), sessionId, question, answer],
    )
  }

  async appendGuessEvent(sessionId: string, guess: string, isCorrect: boolean): Promise<void> {
    await this.pool.query(
      `insert into game_events (
        id,
        session_id,
        event_type,
        question_text,
        answer_text,
        guess_text,
        is_correct
      ) values ($1, $2, 'guess', null, null, $3, $4)`,
      [randomUUID(), sessionId, guess, isCorrect],
    )
  }

  async listSessionEvents(options: ListSessionEventsOptions): Promise<GameEventRecord[]> {
    const result = await this.pool.query(
      'select * from game_events where session_id = $1 order by created_at asc',
      [options.sessionId],
    )

    return result.rows.map(row => mapEventRow(row as Record<string, unknown>))
  }
}
