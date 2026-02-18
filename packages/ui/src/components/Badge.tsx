import type { ParentProps } from "solid-js";

type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "info"
  | "success"
  | "warning"
  | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  outline?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  class?: string;
}

export function Badge(props: ParentProps<BadgeProps>) {
  const classes = () => {
    const parts = ["badge"];
    if (props.variant) parts.push(`badge-${props.variant}`);
    if (props.outline) parts.push("badge-outline");
    if (props.size) parts.push(`badge-${props.size}`);
    if (props.class) parts.push(props.class);
    return parts.join(" ");
  };

  return <span class={classes()}>{props.children}</span>;
}
