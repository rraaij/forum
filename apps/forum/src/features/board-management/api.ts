/*
 * Board management feature API (plan sections 6.2 and 7.2). Transport types
 * are inferred from the exported Hono AppType; the board tree itself is
 * read through the public forum index, so admin has no private read model.
 */

import type { InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const purgeImpactGet =
  apiClient.api.admin.boards[":boardId"]["purge-impact"].$get;

export type PurgeImpact = InferResponseType<typeof purgeImpactGet, 200>;
export type PurgeImpactCounts = PurgeImpact["counts"];

async function ensureOk<T extends { ok: boolean }>(res: T): Promise<T> {
  if (!res.ok) {
    throw await toApiError(
      res as unknown as {
        status: number;
        statusText: string;
        json(): Promise<unknown>;
      },
    );
  }
  return res;
}

export interface BoardFields {
  name: string;
  slug: string;
  abbreviation: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export async function createBoard(
  input: BoardFields & { parentId: string | null },
): Promise<{ boardId: string }> {
  const res = await ensureOk(
    await apiClient.api.admin.boards.$post({ json: input }),
  );
  return (await res.json()) as { boardId: string };
}

export async function updateBoard(
  boardId: string,
  input: Partial<BoardFields>,
): Promise<void> {
  await ensureOk(
    await apiClient.api.admin.boards[":boardId"].$patch({
      param: { boardId },
      json: input,
    }),
  );
}

export async function moveBoard(
  boardId: string,
  newParentId: string | null,
  sortOrder: number,
): Promise<void> {
  await ensureOk(
    await apiClient.api.admin.boards[":boardId"].move.$post({
      param: { boardId },
      json: { newParentId, sortOrder },
    }),
  );
}

export async function fetchPurgeImpact(boardId: string): Promise<PurgeImpact> {
  const res = await ensureOk(await purgeImpactGet({ param: { boardId } }));
  return (await res.json()) as PurgeImpact;
}

export async function purgeBoard(
  boardId: string,
  confirmationName: string,
  expectedImpact: PurgeImpactCounts,
): Promise<PurgeImpactCounts> {
  const res = await ensureOk(
    await apiClient.api.admin.boards[":boardId"].purge.$post({
      param: { boardId },
      json: { confirmationName, expectedImpact },
    }),
  );
  return (await res.json()) as PurgeImpactCounts;
}
