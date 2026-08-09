type AuthOperation = "sign-in" | "sign-up";

type AuthClientError = {
  code?: string;
  status?: number;
};

const DUPLICATE_ACCOUNT_CODES = new Set([
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

/*
 * Provider messages are implementation details and can contain unsafe or
 * untranslated copy. Only stable codes cross this presentation boundary;
 * unknown failures deliberately collapse to a generic Dutch message.
 */
export function authErrorMessage(
  operation: AuthOperation,
  error?: AuthClientError,
): string {
  if (operation === "sign-in") {
    if (error?.code === "INVALID_EMAIL_OR_PASSWORD" || error?.status === 401) {
      return "Het e-mailadres of wachtwoord klopt niet.";
    }
    return "Inloggen lukt nu niet. Probeer het later opnieuw.";
  }

  if (error?.code && DUPLICATE_ACCOUNT_CODES.has(error.code)) {
    return "Er bestaat al een account met dit e-mailadres.";
  }
  if (error?.code === "PASSWORD_TOO_SHORT") {
    return "Gebruik een wachtwoord van minimaal 8 tekens.";
  }
  return "Account aanmaken lukt nu niet. Probeer het later opnieuw.";
}
