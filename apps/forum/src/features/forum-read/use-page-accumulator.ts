import { createEffect, createSignal, on } from "solid-js";
import { dedupeById } from "./topic-link";

interface PageShape<T> {
  items: T[];
  nextCursor: string | null;
}

/*
 * "Load more" state shared by board topic lists and topic replies (plan
 * section 7.2): the route loader supplies page one; later pages append in
 * cursor order and deduplicate by ID; new loader data (invalidation or
 * refresh) restarts the traversal.
 */
export function createPageAccumulator<T extends { id: string }>(
  base: () => PageShape<T>,
  fetchMore: (cursor: string) => Promise<PageShape<T>>,
) {
  const [extra, setExtra] = createSignal<PageShape<T> | null>(null);
  const [loading, setLoading] = createSignal(false);

  createEffect(on(base, () => setExtra(null), { defer: true }));

  const items = () => {
    const extraPage = extra();
    return extraPage ? dedupeById(base().items, extraPage.items) : base().items;
  };

  const nextCursor = () => {
    const extraPage = extra();
    return extraPage ? extraPage.nextCursor : base().nextCursor;
  };

  const loadMore = async () => {
    const cursor = nextCursor();
    if (!cursor || loading()) return;
    setLoading(true);
    try {
      const page = await fetchMore(cursor);
      setExtra((prev) => ({
        items: [...(prev?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      }));
    } finally {
      setLoading(false);
    }
  };

  return { items, nextCursor, loadMore, loading };
}
