import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "link"
  | "error";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  outline?: boolean;
}

export function Button(props: ParentProps<ButtonProps>) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "outline",
    "class",
    "children",
  ]);

  const classes = () => {
    const parts = ["btn"];
    if (local.variant) parts.push(`btn-${local.variant}`);
    if (local.size) parts.push(`btn-${local.size}`);
    if (local.outline) parts.push("btn-outline");
    if (local.loading) parts.push("loading");
    if (local.class) parts.push(local.class);
    return parts.join(" ");
  };

  return (
    <button class={classes()} disabled={local.loading} {...rest}>
      {local.children}
    </button>
  );
}
