import { Avatar, Button, Field } from "@forum/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { signIn, useSession } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error-message";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignIn,
});

// Intentional editorial poster copy, not a claim about live member activity.
const editorialMembers = ["Tessa", "Fenno", "Annelies"];

function SignIn() {
  const navigate = useNavigate();
  const session = useSession();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [rememberMe, setRememberMe] = createSignal(true);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn.email(
        { email: email(), password: password(), rememberMe: rememberMe() },
        {
          onSuccess: async () => {
            // Refresh the shared auth store before navigation so the persistent
            // app shell cannot briefly retain its signed-out account controls.
            await session().refetch();
            await navigate({ to: "/" });
          },
          onError: (context) => {
            setError(authErrorMessage("sign-in", context.error));
          },
        },
      );
    } catch {
      setError(authErrorMessage("sign-in"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="grid min-h-[640px] border-b-2 border-base-content lg:grid-cols-[1.05fr_1fr]">
      <section class="flex min-h-[430px] flex-col bg-primary px-7 py-10 text-primary-content sm:px-10 sm:py-11">
        <p class="text-[12px] font-bold tracking-[0.08em] text-base-300 uppercase">
          Sinds 2004
        </p>
        <h1 class="mt-4 text-[46px] leading-[1.02] font-semibold tracking-[-0.01em] text-base-200">
          <span class="block">Welkom terug.</span>
          <span class="block">Er is veel</span>
          <span class="block">gebeurd.</span>
        </h1>
        <p class="mt-6 max-w-[38ch] text-[15.5px] leading-[1.6] text-base-300">
          17 nieuwe reacties in de topics die je volgt, en iemand heeft
          eindelijk antwoord gegeven op die vraag over hydratatie.
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
          <p class="text-[12.5px] text-base-200">
            1.284 leden waren vandaag online
          </p>
        </div>
      </section>

      <section class="bg-base-100 px-7 py-10 sm:px-10 sm:py-11">
        <div class="mx-auto max-w-[465px]">
          <h2 class="text-[28px] leading-tight font-semibold">Inloggen</h2>
          <p class="mt-1 text-[14px] text-brand-700">
            Met je e-mailadres en wachtwoord.
          </p>

          <Show when={error()}>
            {(message) => (
              <div
                id="sign-in-error"
                class="mt-7 border-l-[3px] border-error bg-error/10 px-[14px] py-[10px] text-sm text-error"
                role="alert"
              >
                {message()}
              </div>
            )}
          </Show>

          <form onSubmit={handleSubmit} class="mt-6 space-y-4">
            <Field label="E-mailadres" for="sign-in-email" required>
              <input
                id="sign-in-email"
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
                aria-describedby={error() ? "sign-in-error" : undefined}
                required
              />
            </Field>

            <Field label="Wachtwoord" for="sign-in-password" required>
              <input
                id="sign-in-password"
                name="password"
                type="password"
                class="input min-h-11 bg-ink-100 sm:min-h-[38px]"
                classList={{ "border-error": Boolean(error()) }}
                placeholder="Je wachtwoord"
                value={password()}
                onInput={(event) => setPassword(event.currentTarget.value)}
                disabled={loading()}
                autocomplete="current-password"
                aria-invalid={Boolean(error())}
                aria-describedby={error() ? "sign-in-error" : undefined}
                required
              />
            </Field>

            <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-normal text-brand-800 sm:min-h-8">
              <input
                type="checkbox"
                name="rememberMe"
                class="checkbox checkbox-primary size-4"
                checked={rememberMe()}
                onChange={(event) => setRememberMe(event.currentTarget.checked)}
                disabled={loading()}
              />
              <span>Ingelogd blijven</span>
            </label>

            <Button
              type="submit"
              variant="primary"
              class="h-11 w-full justify-start px-4"
              loading={loading()}
            >
              {loading() ? "Inloggen…" : "Inloggen"}
            </Button>
          </form>

          <section class="mt-7 border-t-2 border-base-content pt-5">
            <h3 class="text-[18px] font-semibold">Nog geen account?</h3>
            <p class="mt-1 max-w-[36ch] text-[14px] leading-[1.55] text-brand-800">
              Aanmelden kost een minuut. Lezen mag ook zonder, maar meepraten is
              leuker.
            </p>
            <Link
              to="/auth/sign-up"
              class="mt-4 inline-flex min-h-11 items-center bg-base-300 px-4 text-sm font-bold text-base-content transition-colors hover:bg-primary hover:text-primary-content active:bg-brand-700"
            >
              Account aanmaken
            </Link>
          </section>
        </div>
      </section>
    </div>
  );
}
