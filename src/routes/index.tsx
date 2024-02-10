import { component$, Resource, useSignal, useStore } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";
import { Link } from "@builder.io/qwik-city";
import Card from "~/components/card/card";

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
      <h1>Okie Dokie!</h1>

      <Resource
        value={blogData}
        onPending={() => <div>Loading blogs...</div>}
        onResolved={(blogs) => (
          <div class="blogs">
            {blogs &&
              blogs.map((blog) => (
                <Card key={blog.id}>
                  <h3 q:slot="title">{blog.title}</h3>
                  <p q:slot="content">{blog.content.slice(0, 50)}...</p>
                  <Link q:slot="footer" href={"/blog/" + blog.id}>
                    <button>Read more</button>
                  </Link>
                </Card>
              ))}
          </div>
        )}
      />
    </div>
  );
});

export const head: DocumentHead = {
  title: "Mario Life",
  meta: [
    {
      name: "description",
      content: "a blog site about everything Super Mario related",
    },
  ],
};
