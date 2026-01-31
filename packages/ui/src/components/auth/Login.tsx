import { useAuthActions } from "@convex-dev/auth/solid";
import { createSignal } from "solid-js";

export function Login() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = createSignal("");
  const [step, setStep] = createSignal<"signIn" | "verify">("signIn");
  const [loading, setLoading] = createSignal(false);

  const handleSignIn = async (e: SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn("resend", { email: email() });
      setStep("verify");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const code = formData.get("code") as string;
    setLoading(true);
    try {
      await signIn("resend", { email: email(), code });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex flex-col gap-4 p-6 border border-gray-100 rounded-2xl bg-white shadow-sm max-w-sm w-full mx-auto">
      <h2 class="text-xl font-bold text-gray-900 text-center">
        {step() === "signIn" ? "Sign In" : "Check your email"}
      </h2>
      <p class="text-sm text-gray-500 text-center mb-2">
        {step() === "signIn"
          ? "Enter your email to continue"
          : `We sent a code to ${email()}`}
      </p>

      {step() === "signIn" ? (
        <form onSubmit={handleSignIn} class="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email address"
            class="input input-bordered w-full bg-gray-50 focus:bg-white transition-colors"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
          <button
            type="submit"
            class="btn btn-primary w-full"
            disabled={loading()}
          >
            {loading() ? "Sending..." : "Continue with Email"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} class="flex flex-col gap-3">
          <input
            name="code"
            type="text"
            required
            placeholder="Enter code"
            class="input input-bordered w-full bg-gray-50 focus:bg-white text-center tracking-widest text-lg"
            maxLength={6}
          />
          <div class="flex flex-col gap-2">
            <button
              type="submit"
              class="btn btn-primary w-full"
              disabled={loading()}
            >
              {loading() ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm w-full"
              onClick={() => setStep("signIn")}
            >
              Go back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
