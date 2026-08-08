import {
  createEffect,
  createUniqueId,
  type JSX,
  type ParentProps,
  Show,
} from "solid-js";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: JSX.Element;
  ariaLabel?: string;
  footer?: JSX.Element;
  footerNote?: JSX.Element;
  class?: string;
}

export function Modal(props: ParentProps<ModalProps>) {
  let dialogRef!: HTMLDialogElement;
  const titleId = createUniqueId();

  const requestClose = () => {
    props.onClose();
  };

  const handleBackdropClick: JSX.EventHandler<HTMLDialogElement, MouseEvent> = (
    event,
  ) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const handleCancel: JSX.EventHandler<HTMLDialogElement, Event> = (event) => {
    // Keep the native dialog synchronized with its controlled owner. Letting
    // Escape close it directly would leave `open` true until another render.
    event.preventDefault();
    requestClose();
  };

  createEffect(() => {
    if (props.open && !dialogRef.open) {
      dialogRef.showModal();
    } else if (!props.open && dialogRef.open) {
      dialogRef.close();
    }
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape uses the dialog's cancel event; the backdrop is not a keyboard target.
    <dialog
      ref={dialogRef}
      // Keep a viewport gutter around wide dialogs, especially on phones where
      // a consumer may request `w-full` for the modal panel.
      class="modal p-4 sm:p-6"
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      aria-labelledby={props.title ? titleId : undefined}
      aria-label={props.title ? undefined : props.ariaLabel}
    >
      <div
        class={`modal-box rounded-none border-2 border-base-content bg-base-100 p-0 shadow-[6px_6px_0] shadow-base-content/10 ${props.class ?? ""}`}
      >
        <div class="px-6 py-5">
          <Show when={props.title}>
            <h2
              id={titleId}
              class="mb-5 text-[22px] leading-tight font-semibold"
            >
              {props.title}
            </h2>
          </Show>
          {props.children}
        </div>
        <Show when={props.footer || props.footerNote}>
          <footer class="flex flex-wrap items-center gap-2 border-t border-brand-300 px-6 py-[14px]">
            <div class="flex flex-wrap items-center gap-2">{props.footer}</div>
            <Show when={props.footerNote}>
              <p class="ml-auto text-[12.5px] text-brand-700">
                {props.footerNote}
              </p>
            </Show>
          </footer>
        </Show>
      </div>
    </dialog>
  );
}
