export class DomainError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'DomainError'
    this.statusCode = statusCode
  }
}

export function toDomainHttpError(error: unknown) {
  if (error instanceof DomainError) {
    return {
      statusCode: error.statusCode,
      statusMessage: error.message,
      message: error.message,
    }
  }
  return null
}
