import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  outline?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  ghost: "badge-ghost",
  info: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
};

const sizeClasses = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "badge-md",
  lg: "badge-lg",
} as const;

export function Badge(props: ParentProps<BadgeProps>) {
  const [local, rest] = splitProps(props, [
    "variant",
    "outline",
    "size",
    "class",
    "children",
  ]);

  const classes = () => {
    const parts = ["badge rounded-none font-extrabold"];
    if (local.variant) parts.push(variantClasses[local.variant]);
    if (local.outline) parts.push("badge-outline");
    if (local.size) parts.push(sizeClasses[local.size]);
    if (local.class) parts.push(local.class);
    return parts.join(" ");
  };

  return (
    <span {...rest} class={classes()}>
      {local.children}
    </span>
  );
}
