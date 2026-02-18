import type { Session } from "./auth";

// Extend Better Auth's user type with our custom fields
type User = Session["user"] & {
  role: string;
};

export type AppEnv = {
  Variables: {
    user: User | null;
    session: Session["session"] | null;
  };
};
