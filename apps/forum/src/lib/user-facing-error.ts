import { ApiError } from "./api";

const errorMessages: Record<string, string> = {
  BOARD_NOT_FOUND: "Dit forum bestaat niet meer.",
  INVALID_INPUT: "Controleer je invoer en probeer het opnieuw.",
  NOT_POST_AUTHOR: "Alleen de schrijver kan dit bericht bewerken.",
  OPENING_POST_UNDELETABLE:
    "De eerste post van een topic kan niet worden verwijderd.",
  POST_DELETED: "Dit bericht is al verwijderd.",
  POST_NOT_FOUND: "Dit bericht bestaat niet meer.",
  QUOTED_POST_DELETED: "Het geciteerde bericht is inmiddels verwijderd.",
  TOPIC_LOCKED: "Dit topic is gesloten voor nieuwe reacties.",
  TOPIC_NOT_FOUND: "Dit topic bestaat niet meer.",
  UNAUTHENTICATED: "Log opnieuw in om dit te doen.",
};

/**
 * API messages are operator-facing and can include implementation details.
 * Present only stable, translated codes/statuses at the browser boundary.
 */
export function userFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code && errorMessages[error.code]) return errorMessages[error.code];

  if (error.status === 401) return "Log opnieuw in om dit te doen.";
  if (error.status === 403) return "Je hebt geen toestemming om dit te doen.";
  if (error.status === 404) return "Dit onderdeel bestaat niet meer.";
  if (error.status === 409)
    return "Iemand was je net voor. Vernieuw de pagina en probeer opnieuw.";
  if (error.status === 413) return "Je bericht is te lang om te versturen.";
  return fallback;
}
