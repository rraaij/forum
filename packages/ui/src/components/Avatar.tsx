import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";

export type AvatarSize = "xs" | "shell" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  alt?: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6",
  shell: "size-[30px]",
  sm: "size-8",
  md: "size-10",
  lg: "size-16",
  xl: "size-[88px]",
};

export function Avatar(props: AvatarProps) {
  const [local, rest] = splitProps(props, [
    "src",
    "name",
    "alt",
    "size",
    "class",
  ]);

  const sizeClass = () => sizeClasses[local.size ?? "md"];

  const initial = () => {
    const name = local.name?.trim();
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <div {...rest} class={`avatar shrink-0 ${local.class ?? ""}`}>
      <div class={`${sizeClass()} overflow-hidden rounded-none`}>
        <Show
          when={local.src}
          fallback={
            <div class="flex size-full items-center justify-center rounded-none bg-accent font-extrabold text-base-200">
              <span class="text-xs" aria-hidden="true">
                {initial()}
              </span>
            </div>
          }
        >
          {(src) => (
            <img
              class="size-full rounded-none object-cover"
              src={src()}
              alt={local.alt ?? local.name ?? "Avatar"}
            />
          )}
        </Show>
      </div>
    </div>
  );
}
