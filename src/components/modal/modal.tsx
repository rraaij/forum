import type { PropFunction } from "@builder.io/qwik";
import { component$, Slot, useStylesScoped$ } from "@builder.io/qwik";
import styles from "./modal.css?inline";

interface ModalProps {
  size: "sm" | "lg";
  frosted?: boolean;
  close: PropFunction<() => void>;
}
export default component$(({ size, frosted, close }: ModalProps) => {
  useStylesScoped$(styles);

  return (
    <div class={`modal ${size} ${frosted && "frosted"}`}>
      <div class="modal-content">
        <div class="close" onClick$={close}>
          close
        </div>
        <main class="main-content">
          <Slot name={"content"} />
        </main>
        <footer>
          <Slot name={"footer"} />
        </footer>
      </div>
    </div>
  );
});
