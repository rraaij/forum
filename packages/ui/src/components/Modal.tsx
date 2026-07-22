import { createEffect, type ParentProps } from "solid-js";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  class?: string;
}

export function Modal(props: ParentProps<ModalProps>) {
  let dialogRef!: HTMLDialogElement;

  const handleClose = () => {
    props.onClose();
  };

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === dialogRef) {
      handleClose();
    }
  };

  const handleBackdropKeyDown = (event: KeyboardEvent) => {
    if (event.target !== dialogRef) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClose();
    }
  };

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
      // Keep a viewport gutter around wide dialogs, especially on phones where
      // a consumer may request `w-full` for the modal panel.
      class="modal p-4 sm:p-6"
      onClose={handleClose}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
    >
      <div class={`modal-box ${props.class ?? ""}`}>
        {props.title && (
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-bold">{props.title}</h3>
            <button
              class="btn btn-circle btn-ghost btn-sm"
              onClick={handleClose}
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
