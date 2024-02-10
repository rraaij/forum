import { component$, useSignal, useStore } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  // for primitive values
  const name = useSignal("mario");
  // for arrays or objects
  const person = useStore({ name: "Peach", age: 30 });
  const blogs = useStore([
    { id: 1, title: "1st blog" },
    { id: 2, title: "2nd blog" },
    { id: 3, title: "3rd blog" },
  ]);
  return (
    <div>
      <h2>Okie Dokie</h2>
      <p>Hello, {name.value}</p>
      <p>Hello, {person.name}</p>

      <button onClick$={() => (name.value = "luigi")}>click me</button>
      <button onClick$={() => (person.name = "bowser")}>click me too</button>

      {blogs.map((blog) => (
        <div key={blog.id}>{blog.title}</div>
      ))}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
