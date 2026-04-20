import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { parseSynthesizeBody } from '../schemas/voiceSchemas.js'
import type { VoiceService } from '../services/voiceService.js'
import { AppError } from '../lib/errors.js'

export async function registerVoiceRoutes(app: FastifyInstance, voiceService: VoiceService): Promise<void> {
  await app.register(multipart)

  app.post('/v1/voice/transcribe', async (request, reply) => {
    const parts = request.parts()
    let audioBuffer: Buffer | null = null
    for await (const part of parts) {
      if (part.type === 'file') {
        audioBuffer = await part.toBuffer()
        break
      }
    }
    if (!audioBuffer) {
      throw new AppError('未上传音频文件', 400, 'invalid_input')
    }
    const text = await voiceService.transcribe(audioBuffer)
    return reply.code(200).send({ text })
  })

  app.post('/v1/voice/synthesize', async (request, reply) => {
    const body = parseSynthesizeBody(request.body)
    const audioUrl = await voiceService.synthesize(body.text)
    return reply.code(200).send({ audioUrl })
  })
}