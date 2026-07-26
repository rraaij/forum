/*
 * Typed client error carrying the HTTP status and, when the API returned the
 * structured envelope { error: { code, message, field? } }, its domain code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly field?: string;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; field?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.field = options?.field;
  }
}

/*
 * Understands BOTH error shapes during the migration: the structured
 * envelope used by replacement endpoints and the intentional legacy
 * { error: string } contract retained by reactions/votes.
 */
export async function toApiError(res: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return new ApiError(res.status, `${res.status} ${res.statusText}`);
  }

  if (payload && typeof payload === "object" && "error" in payload) {
    const raw = payload.error;
    if (typeof raw === "string") {
      return new ApiError(res.status, raw);
    }
    if (
      raw &&
      typeof raw === "object" &&
      "message" in raw &&
      typeof raw.message === "string"
    ) {
      const code =
        "code" in raw && typeof raw.code === "string" ? raw.code : undefined;
      const field =
        "field" in raw && typeof raw.field === "string" ? raw.field : undefined;
      return new ApiError(res.status, raw.message, {
        code,
        field,
      });
    }
  }
  return new ApiError(res.status, `${res.status} ${res.statusText}`);
}
