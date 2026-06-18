export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ message: error.message, details: error.details }, { status: error.status });
  }

  return jsonResponse({ message: "Unexpected server error" }, { status: 500 });
}

