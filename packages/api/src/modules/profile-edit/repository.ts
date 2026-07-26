/*
 * Persistence for profile reads and writes (plan section 5.4). Injected
 * into the commands; the module never calls the global getDb(). Profile
 * data is not forum content, so these writes take no forum-content lock.
 */

import { users } from "@forum/db/schema";
import { eq } from "drizzle-orm";
import type { Database } from "../../db";

export type UserRow = typeof users.$inferSelect;

export interface ProfileEditStore {
  findUser(userId: string): Promise<UserRow | null>;
  updateUser(
    userId: string,
    values: Partial<typeof users.$inferInsert>,
  ): Promise<UserRow | null>;
}

export function createDrizzleProfileEditStore(db: Database): ProfileEditStore {
  return {
    async findUser(userId) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return rows[0] ?? null;
    },

    async updateUser(userId, values) {
      const rows = await db
        .update(users)
        .set(values)
        .where(eq(users.id, userId))
        .returning();
      return rows[0] ?? null;
    },
  };
}
