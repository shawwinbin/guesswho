import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { loadEnv } from './config/env.js'
import { createDbPool } from './db/pool.js'
import { AppError } from './lib/errors.js'
import { PostgresGameEventRepository, PostgresGameSessionRepository } from './repositories/gameSessionRepository.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerGameSessionRoutes } from './routes/gameSessions.js'
import { registerVoiceRoutes } from './routes/voice.js'
import { GameSessionService } from './services/gameSessionService.js'
import { createHostLlmService } from './services/hostLlmService.js'
import { createAuthService } from './services/authService.js'
import { createVoiceService } from './services/voiceService.js'

interface BuildAppOptions {
  corsOrigin?: string
  gameSessionService?: GameSessionService
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify()

  await app.register(cors, {
    origin: options.corsOrigin ?? loadEnv().corsOrigin,
  })

  const gameSessionService = options.gameSessionService ?? createDefaultGameSessionService(app)

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error)

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    return reply.status(500).send({
      error: {
        code: 'internal_error',
        message: '服务内部错误',
      },
    })
  })

  await registerGameSessionRoutes(app, gameSessionService)
  await registerAuthRoutes(app, createAuthService())
  await registerVoiceRoutes(app, createVoiceService())

  return app
}

function createDefaultGameSessionService(app: FastifyInstance): GameSessionService {
  const env = loadEnv()
  const pool = createDbPool(env.databaseUrl)

  app.addHook('onClose', async () => {
    await pool.end()
  })

  return new GameSessionService({
    sessionRepository: new PostgresGameSessionRepository(pool),
    eventRepository: new PostgresGameEventRepository(pool),
    hostService: createHostLlmService({
      baseUrl: env.llmBaseUrl,
      apiKey: env.llmApiKey,
      model: env.llmModel,
    }),
  })
}
