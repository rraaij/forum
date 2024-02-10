import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class={"rounded bg-white p-4 shadow-md"}>
      <div class={"mb-2 border-b-2 border-gray-100 pb-2"}>
        <Slot name={"title"} />
      </div>
      <div class={"my-2"}>
        <Slot name={"content"} />
      </div>
      <div class={"mt-6 text-center"}>
        <Slot name={"footer"} />
      </div>
    </div>
  );
});
