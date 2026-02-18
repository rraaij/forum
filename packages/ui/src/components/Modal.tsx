import type { ParentProps } from "solid-js";
import { Show } from "solid-js";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  class?: string;
}

export function Modal(props: ParentProps<ModalProps>) {
  return (
    <dialog class={`modal ${props.open ? "modal-open" : ""}`}>
      <div class={`modal-box ${props.class ?? ""}`}>
        <Show when={props.title}>
          <h3 class="font-bold text-lg">{props.title}</h3>
        </Show>
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={props.onClose}
        >
          ✕
        </button>
        {props.children}
      </div>
      <form method="dialog" class="modal-backdrop">
        <button onClick={props.onClose}>close</button>
      </form>
    </dialog>
  );
}
