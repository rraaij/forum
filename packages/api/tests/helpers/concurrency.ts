import { dbTargetFromEnv } from "@forum/db/safe-target";
import postgres from "postgres";

/** Tracks whether a promise has settled, without awaiting it. */
export function track<T>(promise: Promise<T>) {
  const state = {
    settled: false,
    rejected: false,
    value: undefined as unknown,
  };
  const done = promise.then(
    (value) => {
      state.settled = true;
      state.value = value;
      return value;
    },
    (error) => {
      state.settled = true;
      state.rejected = true;
      state.value = error;
      throw error;
    },
  );
  // Prevent unhandled rejection warnings while the test inspects `state`.
  done.catch(() => {});
  return { state, done };
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opens a second connection and holds the given advisory lock for as long
 * as `body` runs, so tests can prove that module commands block behind it.
 */
export async function holdingAdvisoryLock(
  lockSql: "exclusive" | "shared",
  lockName: string,
  body: () => Promise<void>,
): Promise<void> {
  const target = dbTargetFromEnv(process.env);
  const holder = postgres({
    host: target.host,
    port: target.port,
    database: target.database,
    username: target.user,
    password: target.password,
    max: 1,
    onnotice: () => {},
  });
  try {
    await holder.begin(async (tx) => {
      if (lockSql === "exclusive") {
        await tx`SELECT pg_advisory_xact_lock(hashtext(${lockName}))`;
      } else {
        await tx`SELECT pg_advisory_xact_lock_shared(hashtext(${lockName}))`;
      }
      await body();
    });
  } finally {
    await holder.end();
  }
}
