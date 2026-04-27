import { loadEnv } from './config/env.js'
import { buildApp } from './app.js'

async function start() {
  const env = loadEnv()
  const app = await buildApp({
    corsOrigin: env.corsOrigin,
  })

  try {
    await app.listen({
      port: env.port,
      host: '0.0.0.0',
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void start()
