import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from "@forum/ui";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/solid-router";
import { X } from "lucide-solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import { fetchSearch } from "@/features/search/api";
import { SearchResultRow } from "@/features/search/SearchResultRow";

type SearchSort = "newest" | "relevance";

type SearchParams = {
  q?: string;
  topicsOnly?: boolean;
  latestMonth?: boolean;
  authorId?: string;
  boardId?: string;
  sort?: SearchSort;
  cursor?: string;
  trail?: string;
};

function validateSearch(raw: Record<string, unknown>): SearchParams {
  const string = (key: string, max: number) =>
    typeof raw[key] === "string" && raw[key].length <= max
      ? raw[key]
      : undefined;
  return {
    q: string("q", 200)?.trim() || undefined,
    topicsOnly:
      raw.topicsOnly === true || raw.topicsOnly === "true" || undefined,
    latestMonth:
      raw.latestMonth === true || raw.latestMonth === "true" || undefined,
    authorId: string("authorId", 255),
    boardId: string("boardId", 36),
    sort:
      raw.sort === "relevance" || raw.sort === "newest" ? raw.sort : undefined,
    cursor: string("cursor", 512),
    trail: string("trail", 4_096),
  };
}

export const Route = createFileRoute("/search")({
  validateSearch,
  loaderDeps: ({ search }) => ({
    q: search.q,
    topicsOnly: search.topicsOnly,
    latestMonth: search.latestMonth,
    authorId: search.authorId,
    boardId: search.boardId,
    sort: search.sort,
    cursor: search.cursor,
  }),
  loader: ({ deps, abortController }) =>
    deps.q && deps.q.length >= 2
      ? fetchSearch(
          {
            q: deps.q,
            ...(deps.topicsOnly ? { topicsOnly: "true" } : {}),
            ...(deps.latestMonth ? { latestMonth: "true" } : {}),
            ...(deps.authorId ? { authorId: deps.authorId } : {}),
            ...(deps.boardId ? { boardId: deps.boardId } : {}),
            ...(deps.sort ? { sort: deps.sort } : {}),
            ...(deps.cursor ? { cursor: deps.cursor } : {}),
          },
          abortController.signal,
        )
      : null,
  pendingComponent: () => <Skeleton class="my-8" label="Zoeken" rows={4} />,
  errorComponent: SearchError,
  component: SearchPage,
});

function SearchError() {
  const router = useRouter();
  return (
    <ErrorState
      headingLevel={1}
      class="my-8"
      title="Zoeken lukt nu niet"
      description="De zoekmachine heeft even zand in de tandwielen. Probeer het nog eens."
      action={
        <Button variant="primary" onClick={() => void router.invalidate()}>
          Opnieuw zoeken
        </Button>
      }
    />
  );
}

function SearchPage() {
  const search = Route.useSearch();
  const page = Route.useLoaderData();
  const navigate = useNavigate({ from: "/search" });
  const [draft, setDraft] = createSignal(search().q ?? "");
  let searchField: HTMLInputElement | undefined;

  createEffect(() => setDraft(search().q ?? ""));

  const update = (changes: Partial<SearchParams>) =>
    navigate({
      search: (previous) => ({
        ...previous,
        ...changes,
        cursor: undefined,
        trail: undefined,
      }),
    });

  const trail = () => search().trail?.split(".").filter(Boolean) ?? [];
  const next = () => {
    const nextCursor = page()?.nextCursor;
    if (!nextCursor) return;
    const history = [...trail(), search().cursor ?? "first"].slice(-10);
    void navigate({
      search: (previous) => ({
        ...previous,
        cursor: nextCursor,
        trail: history.join("."),
      }),
    });
  };
  const previous = () => {
    const history = trail();
    const target = history.at(-1);
    if (!target) return;
    void navigate({
      search: (current) => ({
        ...current,
        cursor: target === "first" ? undefined : target,
        trail: history.slice(0, -1).join(".") || undefined,
      }),
    });
  };

  return (
    <section class="border-b-2 border-base-content bg-base-100">
      <h1 class="sr-only">Forum doorzoeken</h1>
      <div class="border-b border-brand-300 bg-base-200 px-4 py-6 sm:px-8">
        <form
          class="flex flex-col gap-2 sm:flex-row"
          aria-label="Forum doorzoeken"
          onSubmit={(event) => {
            event.preventDefault();
            const q = draft().trim();
            if (q.length < 2) {
              searchField?.setCustomValidity(
                "Vul minstens twee niet-lege tekens in.",
              );
              searchField?.reportValidity();
              searchField?.focus();
              return;
            }
            void update({ q });
          }}
        >
          <label class="sr-only" for="forum-search-query">
            Zoekterm
          </label>
          <input
            id="forum-search-query"
            ref={(element) => {
              searchField = element;
            }}
            name="q"
            type="search"
            autocomplete="off"
            minlength="2"
            class="input min-h-11 min-w-0 flex-1 border-base-content bg-base-100 text-base"
            placeholder="Zoeken in alle forums"
            value={draft()}
            onInput={(event) => {
              event.currentTarget.setCustomValidity("");
              setDraft(event.currentTarget.value);
            }}
            required
          />
          <Button
            type="submit"
            variant="primary"
            class="min-w-24 sm:min-w-[84px]"
          >
            Zoeken
          </Button>
        </form>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          <span class="text-brand-700">filters:</span>
          <Button
            size="xs"
            variant={search().topicsOnly ? "secondary" : "surface"}
            aria-pressed={Boolean(search().topicsOnly)}
            class="px-3 hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700 sm:min-h-8"
            onClick={() => void update({ topicsOnly: !search().topicsOnly })}
          >
            alleen topics
            <Show when={search().topicsOnly}>
              <X aria-hidden="true" class="ml-1 size-3.5" />
            </Show>
          </Button>
          <Button
            size="xs"
            variant={search().latestMonth ? "secondary" : "surface"}
            aria-pressed={Boolean(search().latestMonth)}
            class="px-3 hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700 sm:min-h-8"
            onClick={() => void update({ latestMonth: !search().latestMonth })}
          >
            laatste maand
            <Show when={search().latestMonth}>
              <X aria-hidden="true" class="ml-1 size-3.5" />
            </Show>
          </Button>
          <Show when={page()?.appliedFilters.boardName}>
            {(name) => (
              <Button
                size="xs"
                variant="secondary"
                aria-label={`Filter ${name()} verwijderen`}
                class="px-3 hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700 sm:min-h-8"
                onClick={() => void update({ boardId: undefined })}
              >
                {name()} <X aria-hidden="true" class="ml-1 size-3.5" />
              </Button>
            )}
          </Show>
          <Show when={page()?.appliedFilters.authorName}>
            {(name) => (
              <Button
                size="xs"
                variant="secondary"
                aria-label={`Filter van ${name()} verwijderen`}
                class="px-3 hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700 sm:min-h-8"
                onClick={() => void update({ authorId: undefined })}
              >
                van {name()} <X aria-hidden="true" class="ml-1 size-3.5" />
              </Button>
            )}
          </Show>

          <Show when={page()}>
            {(results) => (
              <div class="ml-auto flex min-h-11 shrink-0 flex-nowrap items-center gap-2 text-brand-800">
                <span class="whitespace-nowrap" aria-live="polite">
                  {results().totalCount}{" "}
                  {results().totalCount === 1 ? "resultaat" : "resultaten"}
                </span>
                <label for="search-sort" class="sr-only">
                  Sorteren
                </label>
                <select
                  id="search-sort"
                  name="sort"
                  class="select min-h-11 rounded-none border-brand-300 bg-base-100 sm:min-h-8 sm:border-0 sm:bg-transparent"
                  value={search().sort ?? "newest"}
                  onChange={(event) =>
                    void update({
                      sort: event.currentTarget.value as SearchSort,
                    })
                  }
                >
                  <option value="newest">nieuwste eerst</option>
                  <option value="relevance">meest relevant</option>
                </select>
              </div>
            )}
          </Show>
        </div>
      </div>

      <Show
        when={page()}
        fallback={
          <EmptyState
            class="border-0"
            title="Waar ben je naar op zoek?"
            description="Vul minstens twee tekens in. De zoekmachine doet de rest, meestal zonder morren."
          />
        }
      >
        {(results) => (
          <Show
            when={results().items.length > 0}
            fallback={
              <EmptyState
                class="border-0"
                title="Niets gevonden"
                description="Probeer een andere term of haal een filter weg."
              />
            }
          >
            <section
              aria-label="Zoekresultaten"
              class="[&>*:last-child]:border-b-0"
            >
              <For each={results().items}>
                {(result) => <SearchResultRow result={result} />}
              </For>
            </section>
            <Show when={trail().length > 0 || results().nextCursor}>
              <Pagination
                ariaLabel="Zoekresultaten pagineren"
                hasPrevious={trail().length > 0}
                hasNext={Boolean(results().nextCursor)}
                onPrevious={previous}
                onNext={next}
                summary={`${results().totalCount} resultaten`}
                class="bg-base-200 px-4 sm:px-8"
              />
            </Show>
          </Show>
        )}
      </Show>
    </section>
  );
}
