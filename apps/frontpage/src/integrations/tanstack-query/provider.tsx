import { QueryClient } from "@tanstack/solid-query";

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute - data is fresh for this long
        gcTime: 1000 * 60 * 5, // 5 minutes - unused data kept in cache
        retry: 2, // Retry failed requests twice
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: true, // Refetch when network reconnects
      },
      mutations: {
        retry: 1, // Retry failed mutations once
      },
    },
  });
  return {
    queryClient,
  };
}
