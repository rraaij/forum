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

const sizePixels: Record<AvatarSize, number> = {
  xs: 24,
  shell: 30,
  sm: 32,
  md: 40,
  lg: 64,
  xl: 88,
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
  const initialClass = () => {
    if (local.size === "xl") return "text-4xl";
    if (local.size === "lg") return "text-lg";
    return "text-xs";
  };

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
            <div class="flex size-full items-center justify-center rounded-none bg-primary font-extrabold text-primary-content">
              <span class={initialClass()} aria-hidden="true">
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
              width={sizePixels[local.size ?? "md"]}
              height={sizePixels[local.size ?? "md"]}
            />
          )}
        </Show>
      </div>
    </div>
  );
}
