/*
 * Profile reads live with the commands (plan section 5.4): getProfile is
 * exposed through the same ProfileEdit interface, so callers never need a
 * second module to display what they are about to edit. This file exists
 * to keep the plan's file layout explicit.
 */

export { createProfileEdit } from "./commands";
