import { type ParentProps, Show } from "solid-js";
import { Portal } from "solid-js/web";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  class?: string;
}

export function Modal(props: ParentProps<ModalProps>) {
  return (
    <Show when={props.open}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop — button for a11y, closes on click */}
          <button
            class="absolute inset-0 h-full w-full cursor-default border-0 bg-black/40 p-0"
            onClick={props.onClose}
            aria-label="Close dialog"
            tabIndex={-1}
          />
          {/* Dialog box — relative z-index sits above the backdrop */}
          <div
            class={`modal-box relative z-10 rounded bg-base-100 p-6 shadow ${props.class ?? ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={props.title ? "modal-title" : undefined}
          >
            <Show when={props.title}>
              <div class="mb-4 flex items-center justify-between">
                <h3 id="modal-title" class="text-lg font-bold">
                  {props.title}
                </h3>
                <button
                  class="btn btn-circle btn-ghost btn-sm"
                  onClick={props.onClose}
                >
                  ✕
                </button>
              </div>
            </Show>
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  );
}
