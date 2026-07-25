import { notFoundError, validationError } from "../shared/errors";

export const profileUserNotFound = () =>
  notFoundError("USER_NOT_FOUND", "User not found");

/** Field-level profile validation failures keep their field name. */
export const profileFieldInvalid = (field: string, message: string) =>
  validationError("INVALID_PROFILE_FIELD", message, field);
