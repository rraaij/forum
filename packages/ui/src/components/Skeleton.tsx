import { createMemo, For } from "solid-js";

export interface SkeletonProps {
  rows?: number;
  label?: string;
  class?: string;
}

const primaryWidths = ["w-2/3", "w-5/6", "w-1/2"] as const;
const secondaryWidths = ["w-2/5", "w-1/3", "w-1/4"] as const;

export function Skeleton(props: SkeletonProps) {
  const rows = createMemo(() =>
    Array.from({ length: Math.max(1, props.rows ?? 3) }),
  );

  return (
    <section
      role="status"
      class={`border border-brand-300 bg-base-100 p-[30px] ${props.class ?? ""}`}
    >
      <span class="sr-only">{props.label ?? "Laden"}</span>
      <div class="space-y-3" aria-hidden="true">
        <For each={rows()}>
          {(_, index) => {
            const isLast = () => index() === rows().length - 1;
            const primaryWidth = () =>
              primaryWidths[index() % primaryWidths.length];
            const secondaryWidth = () =>
              secondaryWidths[index() % secondaryWidths.length];

            return (
              <div class="flex items-start gap-3">
                <div
                  class="size-[34px] shrink-0 rounded-none"
                  classList={{
                    "bg-base-300": !isLast(),
                    "bg-base-200": isLast(),
                  }}
                />
                <div class="min-w-0 flex-1 space-y-1.5 pt-1">
                  <div
                    class={`h-[11px] rounded-none ${primaryWidth()}`}
                    classList={{
                      "bg-base-300": !isLast(),
                      "bg-base-200": isLast(),
                    }}
                  />
                  <div
                    class={`h-[9px] rounded-none ${secondaryWidth()}`}
                    classList={{
                      "bg-base-300": !isLast(),
                      "bg-base-200": isLast(),
                    }}
                  />
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </section>
  );
}
