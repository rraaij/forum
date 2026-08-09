import { Avatar, Button, Field } from "@forum/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { signUp, useSession } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error-message";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUp,
});

// Intentional editorial poster copy, not a claim about live member activity.
const editorialMembers = ["Tessa", "Fenno", "Annelies"];

function SignUp() {
  const navigate = useNavigate();
  const session = useSession();
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp.email(
        { name: name(), email: email(), password: password() },
        {
          onSuccess: async () => {
            // Account creation establishes a session server-side. Refresh the
            // shared client store before navigation so the persistent app shell
            // renders the new identity immediately.
            await session().refetch();
            await navigate({ to: "/" });
          },
          onError: (context) => {
            setError(authErrorMessage("sign-up", context.error));
          },
        },
      );
    } catch {
      setError(authErrorMessage("sign-up"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="grid min-h-[525px] border-b-2 border-base-content lg:grid-cols-[1.05fr_1fr]">
      <section class="flex min-h-[410px] flex-col bg-primary px-7 py-10 text-primary-content sm:px-10 sm:py-11">
        <p class="text-[12px] font-bold tracking-[0.08em] text-base-300 uppercase">
          Eén account
        </p>
        <h1 class="mt-4 text-[42px] leading-[1.02] font-semibold tracking-[-0.01em] text-base-200">
          <span class="block">Meelezen mag.</span>
          <span class="block">Meepraten</span>
          <span class="block">is leuker.</span>
        </h1>
        <p class="mt-6 max-w-[36ch] text-[15.5px] leading-[1.6] text-base-300">
          Dezelfde inlog geldt straks ook voor het nieuws, het fotoboek en je
          dm&apos;s.
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-3 pt-10">
          <div class="flex pl-2">
            <For each={editorialMembers}>
              {(member) => (
                <Avatar
                  name={member}
                  size="sm"
                  alt=""
                  class="-ml-2 border-2 border-primary"
                />
              )}
            </For>
          </div>
          <p class="text-[12.5px] text-base-200">1.284 leden gingen je voor</p>
        </div>
      </section>

      <section class="bg-base-100 px-7 py-10 sm:px-10 sm:py-11">
        <div class="mx-auto max-w-[465px]">
          <h2 class="text-[27px] leading-tight font-semibold">
            Account aanmaken
          </h2>
          <p class="mt-1 text-[14px] text-brand-700">
            Drie velden en je bent binnen.
          </p>

          <Show when={error()}>
            {(message) => (
              <div
                id="sign-up-error"
                class="mt-6 border-l-[3px] border-error bg-error/10 px-[14px] py-[10px] text-sm text-error"
                role="alert"
              >
                {message()}
              </div>
            )}
          </Show>

          <form onSubmit={handleSubmit} class="mt-6 space-y-4">
            <Field
              label="Naam"
              for="sign-up-name"
              hint="Dit zien anderen bij je posts."
              hintId="sign-up-name-hint"
              required
            >
              <input
                id="sign-up-name"
                name="name"
                type="text"
                class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
                placeholder="Marijn de Vries"
                value={name()}
                onInput={(event) => setName(event.currentTarget.value)}
                disabled={loading()}
                autocomplete="name"
                aria-invalid={Boolean(error())}
                aria-describedby={
                  error() ? "sign-up-error" : "sign-up-name-hint"
                }
                required
              />
            </Field>

            <Field label="E-mailadres" for="sign-up-email" required>
              <input
                id="sign-up-email"
                name="email"
                type="email"
                spellcheck={false}
                class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
                placeholder="marijn@voorbeeld.nl"
                value={email()}
                onInput={(event) => setEmail(event.currentTarget.value)}
                disabled={loading()}
                autocomplete="email"
                aria-invalid={Boolean(error())}
                aria-describedby={error() ? "sign-up-error" : undefined}
                required
              />
            </Field>

            <Field
              label="Wachtwoord"
              for="sign-up-password"
              hint="Minimaal 8 tekens."
              hintId="sign-up-password-hint"
              required
            >
              <input
                id="sign-up-password"
                name="password"
                type="password"
                class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
                placeholder="Minimaal 8 tekens"
                value={password()}
                onInput={(event) => setPassword(event.currentTarget.value)}
                disabled={loading()}
                autocomplete="new-password"
                aria-invalid={Boolean(error())}
                aria-describedby={
                  error() ? "sign-up-error" : "sign-up-password-hint"
                }
                required
                minLength={8}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              class="h-11 w-full justify-start px-4"
              loading={loading()}
            >
              {loading() ? "Account aanmaken…" : "Account aanmaken"}
            </Button>
          </form>

          <p class="mt-4 text-[13.5px] text-brand-800">
            Al een account?{" "}
            <Link
              to="/auth/sign-in"
              class="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
            >
              Inloggen
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
