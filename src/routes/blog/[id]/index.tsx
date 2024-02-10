import { component$, Resource } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

// export const onGet: RequestHandler<BlogData> = async ({ params, response }) => {
export const useBlogData = routeLoader$(async ({ params }) => {
  const res = await fetch("http://localhost:3000/blogs/" + params.id);

  if (!res.ok) {
    console.log("[ERROR]", JSON.stringify(res, null, 2));
    throw new Error(res.statusText);
    //   // @ts-ignore
    //   return redirect(undefined, "/");
  }
  return await res.json();
});

export default component$(() => {
  const blogData = useBlogData();

  return (
    <div class="blog">
      <Resource
        value={blogData}
        onPending={() => <div>Loading...</div>}
        onResolved={(blog) => (
          <div>
            <h2>{blog.title}</h2>
            <p>{blog.content}</p>
          </div>
        )}
      />
    </div>
  );
});
