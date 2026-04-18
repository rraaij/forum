import { For, Show } from "solid-js";

interface HeaderStat {
  label: string;
  value: string;
}

interface ForumPageHeaderProps {
  forumCode: string;
  title: string;
  description: string;
  stats?: HeaderStat[];
  tags?: string[];
}

export default function ForumPageHeader(props: ForumPageHeaderProps) {
  return (
    // This hero is intentionally "forum-old-school": heavy overlay, condensed meta row, and section chips.
    <section class="forum-page-header card overflow-hidden border border-base-content/10 bg-base-100 shadow-xl">
      {/* Layered background gives a similar mood to the supplied page-header reference. */}
      <div class="forum-page-header-bg relative p-6 sm:p-8">
        {/* Darkening overlay keeps text readable in both light and dark themes. */}
        <div class="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25" />

        {/* This content layer stays above the background and overlay. */}
        <div class="relative z-10 flex flex-col gap-4 text-slate-100">
          {/* Top meta row keeps the compact forum-code pattern visible on every page. */}
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/80">
            <span>{props.forumCode}</span>
            <Show when={props.stats?.length}>
              <div class="flex flex-wrap items-center gap-2">
                <For each={props.stats}>
                  {(stat) => (
                    <span class="rounded bg-black/35 px-2 py-1">
                      {stat.label}: {stat.value}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>

          {/* Main title and summary are the key orientation points for the visitor. */}
          <div class="space-y-2">
            <h1 class="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {props.title}
            </h1>
            <p class="max-w-4xl text-sm leading-relaxed text-slate-100/85 sm:text-base">
              {props.description}
            </p>
          </div>

          {/* Tag row works as a visual echo of the colorful forum-grid from the inspiration. */}
          <Show when={props.tags?.length}>
            <div class="flex flex-wrap gap-2 pt-1">
              <For each={props.tags}>
                {(tag) => (
                  <span class="badge badge-outline border-slate-200/40 bg-black/25 px-3 py-3 text-[11px] font-bold tracking-wide text-slate-50">
                    {tag}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </section>
  );
}
