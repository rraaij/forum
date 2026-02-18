import { A, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { signUp } from "@/lib/auth-client";

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signUp.email(
      { name: name(), email: email(), password: password() },
      {
        onSuccess: () => navigate("/"),
        onError: (ctx) => {
          setError(ctx.error.message || "Sign up failed");
        },
      },
    );

    setLoading(false);
  };

  return (
    <div class="flex justify-center">
      <div class="card bg-base-100 shadow w-full max-w-md">
        <div class="card-body">
          <h2 class="card-title">Sign Up</h2>
          {error() && (
            <div class="alert alert-error">
              <span>{error()}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} class="space-y-4">
            <label class="floating-label">
              <span>Name</span>
              <input
                type="text"
                class="input input-bordered w-full"
                placeholder="Name"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                required
              />
            </label>
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
                minLength={8}
              />
            </label>
            <button
              type="submit"
              class="btn btn-primary w-full"
              disabled={loading()}
            >
              {loading() ? <span class="loading loading-spinner" /> : "Sign Up"}
            </button>
          </form>
          <p class="text-center mt-4 text-sm">
            Already have an account?{" "}
            <A href="/auth/sign-in" class="link link-primary">
              Sign In
            </A>
          </p>
        </div>
      </div>
    </div>
  );
}
