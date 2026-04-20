import type { FastifyInstance } from 'fastify'
import { wechatLoginSchema } from '../schemas/authSchemas.js'
import { AuthService } from '../services/authService.js'

export async function registerAuthRoutes(app: FastifyInstance, authService: AuthService): Promise<void> {
  app.post('/v1/auth/wechat', async (request, reply) => {
    const body = wechatLoginSchema.parse(request.body)
    const result = await authService.loginWithCode(body.code)
    return reply.code(200).send(result)
  })
}