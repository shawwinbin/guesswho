import type { FastifyInstance } from 'fastify'
import { parseCreateSessionBody, parseGuessBody, parseQuestionBody } from '../schemas/gameSessionSchemas.js'
import type { GameSessionService } from '../services/gameSessionService.js'

export async function registerGameSessionRoutes(app: FastifyInstance, service: GameSessionService): Promise<void> {
  app.post('/v1/game-sessions', async (request, reply) => {
    const body = parseCreateSessionBody(request.body)
    const snapshot = await service.createSession(body)
    return reply.code(201).send(snapshot)
  })

  app.get('/v1/game-sessions/:sessionId', async request => {
    const params = request.params as { sessionId: string }
    return service.getSessionSnapshot(params.sessionId)
  })

  app.post('/v1/game-sessions/:sessionId/questions', async request => {
    const params = request.params as { sessionId: string }
    const body = parseQuestionBody(request.body)
    return service.submitQuestion(params.sessionId, body.question)
  })

  app.post('/v1/game-sessions/:sessionId/question-intent', async request => {
    const params = request.params as { sessionId: string }
    const body = parseQuestionBody(request.body)
    return service.classifyQuestionIntent(params.sessionId, body.question)
  })

  app.post('/v1/game-sessions/:sessionId/guesses', async request => {
    const params = request.params as { sessionId: string }
    const body = parseGuessBody(request.body)
    return service.submitGuess(params.sessionId, body.guess)
  })

  app.post('/v1/game-sessions/:sessionId/hints', async request => {
    const params = request.params as { sessionId: string }
    return service.requestHint(params.sessionId)
  })
}
