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
const avatarPut = apiClient.api.profile.avatar.$put;

export type EditableProfile = InferResponseType<typeof profileGet, 200>;
export type UpdateProfileBody = InferRequestType<typeof profilePut>["json"];
type AvatarRequest = InferRequestType<typeof avatarPut>;

export async function fetchProfile(): Promise<EditableProfile> {
  const res = await profileGet();
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function saveProfile(
  body: UpdateProfileBody,
): Promise<InferResponseType<typeof profilePut, 200>> {
  const res = await profilePut({ json: body });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function saveAvatar(
  image: AvatarRequest["json"]["image"],
): Promise<InferResponseType<typeof avatarPut, 200>> {
  const res = await avatarPut({ json: { image } });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}
