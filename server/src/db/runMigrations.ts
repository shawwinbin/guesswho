import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv } from '../config/env.js'
import { createDbPool } from './pool.js'

interface MigrationRunner {
  query: (sql: string) => Promise<unknown>
}

interface RunMigrationsOptions {
  migrationsDir?: string
  query: MigrationRunner['query']
}

export async function runMigrations({
  query,
  migrationsDir = join(process.cwd(), 'src/db/migrations'),
}: RunMigrationsOptions): Promise<void> {
  const migrationFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8').trim()
    if (!sql) continue
    await query(sql)
  }
}

async function main(): Promise<void> {
  const env = loadEnv()
  const pool = createDbPool(env.databaseUrl)

  try {
    await runMigrations({
      query: sql => pool.query(sql),
    })
    console.log('Migrations completed.')
  } finally {
    await pool.end()
  }
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href

if (isDirectRun) {
  void main()
}
