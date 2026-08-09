import { Button, Field, Modal } from "@forum/ui";
import { createSignal, Show } from "solid-js";
import { changePassword } from "@/lib/auth-client";

type PasswordField = "confirm" | "current" | "form" | "new";

function translatePasswordError(message: string | undefined): string {
  const normalized = message?.toLowerCase() ?? "";
  if (
    normalized.includes("incorrect") ||
    normalized.includes("invalid password")
  ) {
    return "Je huidige wachtwoord klopt niet.";
  }
  if (normalized.includes("too short") || normalized.includes("at least")) {
    return "Je nieuwe wachtwoord moet minimaal 8 tekens bevatten.";
  }
  if (normalized.includes("too long") || normalized.includes("128")) {
    return "Je nieuwe wachtwoord mag maximaal 128 tekens bevatten.";
  }
  if (normalized.includes("unauthorized") || normalized.includes("session")) {
    return "Je sessie is verlopen. Log opnieuw in en probeer het nog eens.";
  }
  return "Het wachtwoord kon niet worden gewijzigd. Probeer het nog eens.";
}

/*
 * Password changes remain inside Better Auth's sensitive-session boundary.
 * This modal never persists credentials and clears every field on success or
 * cancellation, including Escape and backdrop close through the shared Modal.
 */
export function ChangePasswordDialog(props: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [errorField, setErrorField] = createSignal<PasswordField>("form");
  let currentField: HTMLInputElement | undefined;
  let newField: HTMLInputElement | undefined;
  let confirmationField: HTMLInputElement | undefined;

  const focusField = (field: Exclude<PasswordField, "form">) =>
    queueMicrotask(() => {
      if (field === "current") currentField?.focus();
      if (field === "new") newField?.focus();
      if (field === "confirm") confirmationField?.focus();
    });

  const clearCredentials = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setErrorField("form");
  };

  const close = () => {
    if (submitting()) return;
    clearCredentials();
    props.onClose();
  };

  const fieldError = (field: PasswordField) =>
    errorField() === field ? error() : undefined;

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword().length < 8) {
      setErrorField("new");
      setError("Je nieuwe wachtwoord moet minimaal 8 tekens bevatten.");
      focusField("new");
      return;
    }
    if (newPassword().length > 128) {
      setErrorField("new");
      setError("Je nieuwe wachtwoord mag maximaal 128 tekens bevatten.");
      focusField("new");
      return;
    }
    if (newPassword() !== confirmPassword()) {
      setErrorField("confirm");
      setError("De nieuwe wachtwoorden zijn niet hetzelfde.");
      focusField("confirm");
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({
        currentPassword: currentPassword(),
        newPassword: newPassword(),
        // The design promises that the current and other sessions stay active.
        revokeOtherSessions: false,
      });

      if (result.error) {
        setErrorField("current");
        setError(translatePasswordError(result.error.message));
        focusField("current");
        return;
      }

      clearCredentials();
      props.onSuccess();
    } catch {
      setErrorField("form");
      setError(
        "Het wachtwoord kon niet worden gewijzigd. Probeer het nog eens.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={close}
      title="Wachtwoord wijzigen"
      class="max-w-[31rem]"
      footer={
        <>
          <Button
            type="submit"
            form="change-password-form"
            variant="primary"
            class="min-h-11 sm:min-h-9"
            loading={submitting()}
          >
            {submitting() ? "Wijzigen…" : "Wijzigen"}
          </Button>
          <Button
            type="button"
            variant="surface"
            class="min-h-11 sm:min-h-9 sm:bg-base-100"
            disabled={submitting()}
            onClick={close}
          >
            Annuleren
          </Button>
        </>
      }
      footerNote="Je blijft ingelogd"
    >
      <Show when={fieldError("form")}>
        {(message) => (
          <p class="mb-4 text-sm font-semibold text-error" role="alert">
            {message()}
          </p>
        )}
      </Show>

      <form
        id="change-password-form"
        onSubmit={handleSubmit}
        class="grid gap-[13px]"
      >
        <Field
          label="Huidig wachtwoord"
          for="current-password"
          error={fieldError("current")}
          errorId="current-password-error"
          required
        >
          <input
            ref={(element) => {
              currentField = element;
            }}
            id="current-password"
            name="currentPassword"
            type="password"
            class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
            value={currentPassword()}
            onInput={(event) => {
              setCurrentPassword(event.currentTarget.value);
              setError(null);
            }}
            disabled={submitting()}
            autocomplete="current-password"
            aria-invalid={Boolean(fieldError("current"))}
            aria-describedby={
              fieldError("current") ? "current-password-error" : undefined
            }
            required
          />
        </Field>

        <Field
          label="Nieuw wachtwoord"
          for="new-password"
          hint="Minimaal 8 tekens."
          hintId="new-password-hint"
          error={fieldError("new")}
          errorId="new-password-error"
          required
        >
          <input
            ref={(element) => {
              newField = element;
            }}
            id="new-password"
            name="newPassword"
            type="password"
            class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
            value={newPassword()}
            onInput={(event) => {
              setNewPassword(event.currentTarget.value);
              setError(null);
            }}
            disabled={submitting()}
            autocomplete="new-password"
            aria-invalid={Boolean(fieldError("new"))}
            aria-describedby={
              fieldError("new") ? "new-password-error" : "new-password-hint"
            }
            required
          />
        </Field>

        <Field
          label="Nieuw wachtwoord bevestigen"
          for="confirm-password"
          error={fieldError("confirm")}
          errorId="confirm-password-error"
          required
        >
          <input
            ref={(element) => {
              confirmationField = element;
            }}
            id="confirm-password"
            name="confirmPassword"
            type="password"
            class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
            value={confirmPassword()}
            onInput={(event) => {
              setConfirmPassword(event.currentTarget.value);
              setError(null);
            }}
            disabled={submitting()}
            autocomplete="new-password"
            aria-invalid={Boolean(fieldError("confirm"))}
            aria-describedby={
              fieldError("confirm") ? "confirm-password-error" : undefined
            }
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
