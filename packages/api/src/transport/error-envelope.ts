/*
 * The ONE route-level mapper from typed domain errors to the standard HTTP
 * envelope (refactor plan section 6). Route adapters call this; modules
 * never see HTTP statuses.
 */

import type { Context } from "hono";
import type { DomainError, DomainErrorKind } from "../modules/shared/errors";

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

const KIND_STATUS = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
} as const satisfies Record<DomainErrorKind, number>;

export type DomainErrorStatus = (typeof KIND_STATUS)[DomainErrorKind];

export function toErrorResponse(error: DomainError): {
  status: DomainErrorStatus;
  body: ErrorResponse;
} {
  return {
    status: KIND_STATUS[error.kind],
    body: {
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
      },
    },
  };
}

export function respondWithDomainError(c: Context, error: DomainError) {
  const { status, body } = toErrorResponse(error);
  return c.json(body, status);
}
