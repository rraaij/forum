import { component$, Resource, useSignal, useStore } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

interface BlogData {
  id: string;
  title: string;
  content: string;
}
export const useBlogData = routeLoader$(async () => {
  console.log("fetching data");

  const res = await fetch("http://localhost:3000/blogs");
  return (await res.json()) as unknown as BlogData[];
});

export default component$(() => {
  const blogData = useBlogData();

  // for primitive values
  const name = useSignal("mario");
  // for arrays or objects
  const person = useStore({ name: "Peach", age: 30 });

  return (
    <div>
      <h2>Okie Dokie</h2>
      <p>Hello, {name.value}</p>
      <p>Hello, {person.name}</p>

      <button onClick$={() => (name.value = "luigi")}>click me</button>
      <button onClick$={() => (person.name = "bowser")}>click me too</button>

      <Resource
        value={blogData}
        onPending={() => <div>Loading...</div>}
        onResolved={(blogs) => (
          <div class={"blogs"}>
            {blogs &&
              blogs.map((blog) => (
                <div key={blog.id}>
                  <h3>{blog.title}</h3>
                  <p>{blog.content.slice(0, 50)}...</p>
                  <Link href={`/blog/${blog.id}`}>Read More</Link>
                </div>
              ))}
          </div>
        )}
      />
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
