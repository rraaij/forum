import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "link"
  | "error"
  | "surface";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  outline?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary active:border-brand-700 active:bg-brand-700",
  // Secondary is reserved for semantic orange states such as active filters;
  // ordinary actions, including retries, use the primary teal treatment.
  secondary: "btn-secondary",
  accent: "btn-accent",
  ghost: "btn-ghost",
  link: "btn-link",
  error: "btn-error",
  surface:
    "border-brand-300 bg-base-300 text-base-content hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700 active:text-primary-content",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

export function Button(props: ParentProps<ButtonProps>) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "outline",
    "class",
    "children",
    "disabled",
    "type",
  ]);

  const classes = () => {
    const parts = [
      "btn min-h-11 rounded-none font-bold shadow-none transition-colors",
    ];
    if (local.variant) parts.push(variantClasses[local.variant]);
    if (local.size) parts.push(sizeClasses[local.size]);
    if (local.outline) parts.push("btn-outline");
    if (local.class) parts.push(local.class);
    return parts.join(" ");
  };

  return (
    <button
      {...rest}
      type={local.type ?? "button"}
      class={classes()}
      disabled={Boolean(local.disabled || local.loading)}
      aria-busy={local.loading || undefined}
    >
      {local.children}
    </button>
  );
}
