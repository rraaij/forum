import { useRouter } from "@tanstack/solid-router";
import { createSignal } from "solid-js";

/*
 * Controller for the board manager (plan section 7.2). Mutation state is
 * explicit — pending, error, and last success are separate signals, so the
 * page never guesses what is happening. Successful mutations invalidate the
 * active route instead of forcing a full page reload.
 */
export function createBoardManager() {
  const router = useRouter();
  const [pending, setPending] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [lastResult, setLastResult] = createSignal<string | null>(null);

  /** Runs one mutation with named pending state and shared error handling. */
  async function run<T>(
    label: string,
    action: () => Promise<T>,
    describe?: (result: T) => string,
  ): Promise<T | undefined> {
    setPending(label);
    setError(null);
    setLastResult(null);
    try {
      const result = await action();
      await router.invalidate();
      setLastResult(describe ? describe(result) : `${label} succeeded`);
      return result;
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : `${label} failed`,
      );
      return undefined;
    } finally {
      setPending(null);
    }
  }

  return {
    pending,
    error,
    lastResult,
    isPending: (label?: string) =>
      label ? pending() === label : pending() !== null,
    clearMessages: () => {
      setError(null);
      setLastResult(null);
    },
    run,
  };
}

export type BoardManager = ReturnType<typeof createBoardManager>;
