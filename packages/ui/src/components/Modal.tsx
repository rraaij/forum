import { createEffect, type ParentProps } from "solid-js";

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
      dialogRef?.showModal();
    } else {
      dialogRef?.close();
    }
  });

  return (
    <dialog
      ref={dialogRef}
      class="modal"
      onClose={props.onClose}
      onClick={(e) => {
        // Close when clicking the backdrop (outside modal-box)
        if (e.target === dialogRef) props.onClose();
      }}
    >
      <div class={`modal-box ${props.class ?? ""}`}>
        {props.title && (
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-bold">{props.title}</h3>
            <button
              class="btn btn-circle btn-ghost btn-sm"
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>
        )}
        {props.children}
      </div>
    </dialog>
  );
}
