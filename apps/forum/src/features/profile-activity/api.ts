/*
 * Profile activity transport (plan sections 6.2 and 7.2). Types are inferred
 * from the exported Hono AppType — including the canonical route params the
 * backend produces, so this feature never derives a topic URL itself.
 */

import type { InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const activityGet = apiClient.api.profile.activity.$get;

export type ProfileActivity = InferResponseType<typeof activityGet, 200>;
export type ProfileActivityItem = ProfileActivity[number];

export async function fetchProfileActivity(): Promise<ProfileActivity> {
  const res = await activityGet();
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as ProfileActivity;
}
