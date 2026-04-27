export class AppError extends Error {
  statusCode: number
  code: string
  details?: unknown

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(message, 400, 'bad_request', details)
}

export function notFound(message: string): AppError {
  return new AppError(message, 404, 'not_found')
}

export function upstreamFailure(message: string, details?: unknown): AppError {
  return new AppError(message, 502, 'upstream_failure', details)
}
