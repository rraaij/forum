import {
  component$,
  useSignal,
  useStore,
  useStylesScoped$,
} from "@builder.io/qwik";
import styles from "./contact.module.css?inline";

export default component$(() => {
  useStylesScoped$(styles);
  const formVisible = useSignal(false);
  const formState = useStore({ name: "", message: "" });

  return (
    <article>
      <h2>Contact</h2>

      <button onClick$={() => (formVisible.value = true)}>Contact me</button>

      {formVisible.value && (
        <form
          preventdefault:submit
          onSubmit$={() => {
            console.log(formState.name, formState.message);
            formState.name = "";
            formState.message = "";
          }}
        >
          <label>
            <span>Name:</span>
            <input
              value={formState.name}
              type={"text"}
              onInput$={(e) =>
                (formState.name = (e.target as HTMLInputElement).value)
              }
            />
          </label>
          <label>
            <span>Message:</span>
            <textarea
              value={formState.message}
              onInput$={(e) =>
                (formState.message = (e.target as HTMLInputElement).value)
              }
            ></textarea>
          </label>
          <button>Send</button>

          <p>{JSON.stringify(formState, null, 2)}</p>
        </form>
      )}
    </article>
  );
});
