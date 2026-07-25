/*
 * Typed domain errors (refactor plan sections 5 and 6).
 *
 * Modules throw DomainError subclasses/instances; they never know about HTTP.
 * The single route-level mapper in src/transport/error-envelope.ts translates
 * an error's `kind` to a status code and its fields to the standard envelope.
 */

export type DomainErrorKind =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict";

export class DomainError extends Error {
  readonly kind: DomainErrorKind;
  /** Stable machine-readable code, e.g. TOPIC_SLUG_CONFLICT. */
  readonly code: string;
  /** Optional input field the error refers to, e.g. "abbreviation". */
  readonly field?: string;

  constructor(
    kind: DomainErrorKind,
    code: string,
    message: string,
    options?: { field?: string },
  ) {
    super(message);
    this.name = "DomainError";
    this.kind = kind;
    this.code = code;
    this.field = options?.field;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function validationError(
  code: string,
  message: string,
  field?: string,
): DomainError {
  return new DomainError("validation", code, message, { field });
}

export function notFoundError(code: string, message: string): DomainError {
  return new DomainError("not_found", code, message);
}

export function forbiddenError(code: string, message: string): DomainError {
  return new DomainError("forbidden", code, message);
}

export function conflictError(
  code: string,
  message: string,
  field?: string,
): DomainError {
  return new DomainError("conflict", code, message, { field });
}

export function unauthenticatedError(
  code = "UNAUTHENTICATED",
  message = "Authentication required",
): DomainError {
  return new DomainError("unauthenticated", code, message);
}
