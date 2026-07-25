/*
 * Profile edit transport (plan sections 6.2 and 7.2). Types are inferred
 * from the exported Hono AppType. PUT, not PATCH: updateProfile replaces
 * every editable field, so omitting one clears it.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const profileGet = apiClient.api.profile.$get;
const profilePut = apiClient.api.profile.$put;

export type EditableProfile = InferResponseType<typeof profileGet, 200>;
export type UpdateProfileBody = InferRequestType<typeof profilePut>["json"];

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

export async function fetchProfile(): Promise<EditableProfile> {
  const res = await ensureOk(await profileGet());
  return (await res.json()) as EditableProfile;
}

export async function saveProfile(
  body: UpdateProfileBody,
): Promise<EditableProfile> {
  const res = await ensureOk(await profilePut({ json: body }));
  return (await res.json()) as EditableProfile;
}

export async function saveAvatar(
  image: string | null,
): Promise<{ image: string | null }> {
  const res = await ensureOk(
    await apiClient.api.profile.avatar.$put({ json: { image } }),
  );
  return (await res.json()) as { image: string | null };
}
