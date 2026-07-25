/*
 * COMPILE-ONLY contract test (refactor plan section 6.2). Never imported at
 * runtime; `pnpm typecheck` compiles it, so it fails when the exported Hono
 * routes and this frontend client drift apart. Extend the assertions as
 * feature APIs migrate to hc<AppType> in Phases 4-7.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
import type { apiClient } from "./api-client";

type Assert<T extends true> = T;

// /health exists and returns the expected shape.
type HealthResponse = InferResponseType<typeof apiClient.health.$get>;
export type HealthOk = Assert<
  HealthResponse extends { status: string } ? true : false
>;

// The legacy topic-creation write is runtime-validated; its JSON input type
// must flow through to the client.
type CreateTopicRequest = InferRequestType<
  typeof apiClient.api.topics.$post
>["json"];
export type CreateTopicHasTitle = Assert<
  CreateTopicRequest extends { title: string; content: string } ? true : false
>;

// Vote values are constrained at the transport seam.
type VoteRequest = InferRequestType<typeof apiClient.api.votes.$post>["json"];
export type VoteValueIsNumber = Assert<
  VoteRequest extends { postId: string; value: number } ? true : false
>;

// Profile replacement requires the photoUrls array.
type ProfileUpdateRequest = InferRequestType<
  typeof apiClient.api.profile.$patch
>["json"];
export type ProfileRequiresPhotoUrls = Assert<
  ProfileUpdateRequest extends { photoUrls: string[] } ? true : false
>;
