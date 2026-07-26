import { createSignal, Show } from "solid-js";
import { changePassword } from "@/lib/auth-client";

/*
 * Password changes stay with Better Auth (plan section 5.4) — deliberately
 * NOT part of the ProfileEdit module. This component only collects the
 * values and delegates.
 */
export function ChangePasswordDialog(props: { onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword().length < 8) {
      setError("The new password must contain at least 8 characters.");
      return;
    }
    if (newPassword() !== confirmPassword()) {
      setError("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({
        currentPassword: currentPassword(),
        newPassword: newPassword(),
        // Keep the user's other signed-in devices active.
        revokeOtherSessions: false,
      });

      if (result.error) {
        throw new Error(result.error.message || "Password change failed.");
      }

      // Never retain password values in component state after a successful
      // credential change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      props.onSuccess();
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : "The password could not be changed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section class="card border border-base-content/10 bg-base-100 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="text-sm font-bold uppercase tracking-wide">
          Change password
        </h2>

        <Show when={error()}>
          {(message) => (
            <div class="alert alert-error py-2 text-sm" role="alert">
              <span>{message()}</span>
            </div>
          )}
        </Show>

        <form onSubmit={handleSubmit} class="grid gap-3 sm:grid-cols-3">
          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">
              Current password
            </span>
            <input
              type="password"
              class="input input-bordered input-sm w-full"
              value={currentPassword()}
              onInput={(event) => setCurrentPassword(event.currentTarget.value)}
              disabled={submitting()}
              required
            />
          </label>

          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">New password</span>
            <input
              type="password"
              class="input input-bordered input-sm w-full"
              value={newPassword()}
              onInput={(event) => setNewPassword(event.currentTarget.value)}
              disabled={submitting()}
              minLength={8}
              required
            />
          </label>

          <label class="form-control gap-1">
            <span class="label-text text-xs font-semibold">
              Confirm new password
            </span>
            <input
              type="password"
              class="input input-bordered input-sm w-full"
              value={confirmPassword()}
              onInput={(event) => setConfirmPassword(event.currentTarget.value)}
              disabled={submitting()}
              required
            />
          </label>

          <div class="sm:col-span-3">
            <button
              type="submit"
              class="btn btn-outline btn-sm"
              disabled={submitting()}
            >
              Change password
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
