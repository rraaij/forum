import { createEffect, type ParentProps, Show } from "solid-js";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  class?: string;
}

export function Modal(props: ParentProps<ModalProps>) {
  let dialogRef!: HTMLDialogElement;

  createEffect(() => {
    if (props.open) {
      dialogRef.showModal();
    } else {
      dialogRef.close();
    }
  });

  return (
    <dialog ref={dialogRef} class="modal">
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
