import type { JSX } from "solid-js";
import { createSignal, onMount, splitProps } from "solid-js";
import { formatCalendarDate, formatRelativeTime } from "@/lib/date-time";

type RelativeTimeProps = Omit<
  JSX.TimeHTMLAttributes<HTMLTimeElement>,
  "datetime" | "children"
> & {
  value: string;
};

/*
 * Date.now() cannot participate in SSR output: the server and browser can
 * cross a relative-time boundary before hydration. Both environments first
 * render the same calendar date, then the browser enhances it after mount.
 */
export function RelativeTime(props: RelativeTimeProps) {
  const [local, rest] = splitProps(props, ["value"]);
  const [mounted, setMounted] = createSignal(false);

  onMount(() => setMounted(true));

  return (
    <time {...rest} datetime={local.value}>
      {mounted()
        ? formatRelativeTime(local.value)
        : formatCalendarDate(local.value)}
    </time>
  );
}
