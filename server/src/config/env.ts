import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EnvConfig {
  port: number
  corsOrigin: string
  databaseUrl: string
  llmBaseUrl: string
  llmApiKey: string
  llmModel: string
  wechatAppid?: string
  wechatSecret?: string
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): EnvConfig {
  const mergedEnv = {
    ...readEnvFile(cwd),
    ...env,
  }

  const databaseUrl = mergedEnv.DATABASE_URL
  const llmBaseUrl = mergedEnv.LLM_BASE_URL
  const llmApiKey = mergedEnv.LLM_API_KEY
  const llmModel = mergedEnv.LLM_MODEL

  if (!databaseUrl) throw new Error('Missing DATABASE_URL')
  if (!llmBaseUrl) throw new Error('Missing LLM_BASE_URL')
  if (!llmApiKey) throw new Error('Missing LLM_API_KEY')
  if (!llmModel) throw new Error('Missing LLM_MODEL')

  return {
    port: Number.parseInt(mergedEnv.PORT ?? '4000', 10),
    corsOrigin: mergedEnv.CORS_ORIGIN ?? 'http://localhost:5173',
    databaseUrl,
    llmBaseUrl,
    llmApiKey,
    llmModel,
    wechatAppid: mergedEnv.WECHAT_APPID,
    wechatSecret: mergedEnv.WECHAT_SECRET,
  }
}

function readEnvFile(cwd: string): NodeJS.ProcessEnv {
  const envPath = join(cwd, '.env')
  if (!existsSync(envPath)) {
    return {}
  }

  const content = readFileSync(envPath, 'utf8')
  const pairs = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))

  const loaded: NodeJS.ProcessEnv = {}

  for (const line of pairs) {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()
    if (!key) continue

    loaded[key] = stripWrappingQuotes(rawValue)
  }

  return loaded
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}
