import { A, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { signIn } from "@/lib/auth-client";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signIn.email(
      { email: email(), password: password() },
      {
        onSuccess: () => navigate("/"),
        onError: (ctx) => {
          setError(ctx.error.message || "Sign in failed");
        },
      },
    );

    setLoading(false);
  };

  return (
    <div class="flex justify-center">
      <div class="card bg-base-100 shadow w-full max-w-md">
        <div class="card-body">
          <h2 class="card-title">Sign In</h2>
          {error() && (
            <div class="alert alert-error">
              <span>{error()}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} class="space-y-4">
            <label class="floating-label">
              <span>Email</span>
              <input
                type="email"
                class="input input-bordered w-full"
                placeholder="Email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
              />
            </label>
            <label class="floating-label">
              <span>Password</span>
              <input
                type="password"
                class="input input-bordered w-full"
                placeholder="Password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
              />
            </label>
            <button
              type="submit"
              class="btn btn-primary w-full"
              disabled={loading()}
            >
              {loading() ? <span class="loading loading-spinner" /> : "Sign In"}
            </button>
          </form>
          <p class="text-center mt-4 text-sm">
            Don't have an account?{" "}
            <A href="/auth/sign-up" class="link link-primary">
              Sign Up
            </A>
          </p>
        </div>
      </div>
    </div>
  );
}
