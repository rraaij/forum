import { Show } from "solid-js";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  class?: string;
}

export function Avatar(props: AvatarProps) {
  const sizeClass = () => {
    switch (props.size) {
      case "xs":
        return "w-6";
      case "sm":
        return "w-8";
      case "lg":
        return "w-16";
      default:
        return "w-10";
    }
  };

  const initials = () => {
    if (!props.name) return "?";
    return props.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div class={`avatar ${props.class ?? ""}`}>
      <div class={`${sizeClass()} rounded-full`}>
        <Show
          when={props.src}
          fallback={
            <div class="bg-neutral text-neutral-content flex items-center justify-center w-full h-full rounded-full">
              <span class="text-xs">{initials()}</span>
            </div>
          }
        >
          {(src) => <img src={src()} alt={props.name ?? "Avatar"} />}
        </Show>
      </div>
    </div>
  );
}
