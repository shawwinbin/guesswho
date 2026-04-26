import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runMigrations } from './runMigrations.js'

describe('runMigrations', () => {
  it('executes sql files from the migrations directory in lexical order', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'history-guess-migrations-'))

    try {
      writeFileSync(join(directory, '002_second.sql'), 'select 2;')
      writeFileSync(join(directory, '001_first.sql'), 'select 1;')

      const query = vi.fn(async () => undefined)

      await runMigrations({
        query,
        migrationsDir: directory,
      })

      expect(query).toHaveBeenNthCalledWith(1, 'select 1;')
      expect(query).toHaveBeenNthCalledWith(2, 'select 2;')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('scopes the level constraint existence check to game_sessions', () => {
    const migrationFile = [
      join(process.cwd(), 'src/db/migrations/002_add_game_session_level.sql'),
      join(process.cwd(), 'server/src/db/migrations/002_add_game_session_level.sql'),
    ].find(candidate => existsSync(candidate))

    expect(migrationFile).toBeTruthy()

    const sql = readFileSync(migrationFile!, 'utf8')

    expect(sql).toContain("where conname = 'game_sessions_level_check'")
    expect(sql).toContain("and conrelid = 'game_sessions'::regclass")
  })
})
