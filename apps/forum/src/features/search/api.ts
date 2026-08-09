import type { InferRequestType, InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const searchGet = apiClient.api.search.$get;

export type SearchPage = InferResponseType<typeof searchGet, 200>;
export type SearchResult = SearchPage["items"][number];
type SearchRequest = InferRequestType<typeof searchGet>;

export async function fetchSearch(
  query: SearchRequest["query"],
  signal?: AbortSignal,
): Promise<SearchPage> {
  const response = await searchGet({ query }, { init: { signal } });
  if (response.status !== 200) throw await toApiError(response);
  return response.json();
}
