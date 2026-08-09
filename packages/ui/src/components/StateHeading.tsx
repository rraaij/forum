import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export type StateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const headingTags = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

/* State panels can be a route's primary content or a nested section. */
export function StateHeading(props: {
  level?: StateHeadingLevel;
  class: string;
  children: JSX.Element;
}) {
  return (
    <Dynamic component={headingTags[props.level ?? 2]} class={props.class}>
      {props.children}
    </Dynamic>
  );
}
