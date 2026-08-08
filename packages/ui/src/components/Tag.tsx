import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export type TagVariant = "base" | "primary" | "secondary" | "accent";

export interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const variantClasses: Record<TagVariant, string> = {
  base: "border-brand-300 bg-base-300 text-base-content",
  primary: "border-primary bg-primary text-primary-content",
  // Orange tags are restricted to pinned/status/category meanings from the
  // design system; callers should not use this as general emphasis.
  secondary: "border-secondary bg-secondary text-secondary-content",
  accent: "border-accent bg-accent text-accent-content",
};

export function Tag(props: ParentProps<TagProps>) {
  const [local, rest] = splitProps(props, ["variant", "class", "children"]);

  return (
    <span
      {...rest}
      class={`inline-flex min-h-6 items-center rounded-none border px-2 py-1 text-[11.5px] leading-none font-extrabold ${variantClasses[local.variant ?? "base"]} ${local.class ?? ""}`}
    >
      {local.children}
    </span>
  );
}
