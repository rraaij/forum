import { component$, useSignal, useStyles$, $ } from "@builder.io/qwik";
import styles from "./about.module.css?inline";
import Modal from "~/components/modal/modal";
export default component$(() => {
  useStyles$(styles);

  const modalVisible = useSignal(false);

  const closeModal = $(() => {
    modalVisible.value = false;
  });
  return (
    <article>
      <h2>About</h2>
      <p>So, here's my list of questions lol:</p>
      <p>
        What was the general pocket size for pro-speed tournaments? What were
        table conditions like? What was the belief behind forward balanced/steel
        joint cues?
      </p>
      <p>
        I've noticed players of this era (Varner, Hall, Sigel, etc) playing with
        steel joint.
      </p>
      <p>
        Is the information that's available today (pocket lines, cue ball
        physics, navigating the table, etc. Advanced details, so to speak), the
        same information as back then? If not, what has changed?
      </p>

      <button onClick$={() => (modalVisible.value = true)}>Open Modal</button>

      {modalVisible.value && (
        <Modal size={"sm"} frosted close={closeModal}>
          <div q:slot={"content"}>
            <h2>Great news</h2>
          </div>
          <div q:slot={"footer"}>
            <button>Sign up now!</button>
          </div>
        </Modal>
      )}
    </article>
  );
});
