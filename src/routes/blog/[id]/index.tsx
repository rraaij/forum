import { component$, Resource } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useBlog = routeLoader$(async (requestEvent) => {
  console.log(`fetching data: ${JSON.stringify(requestEvent.params, null, 2)}`);

  const res = await fetch(
    `http://localhost:3000/blogs/${requestEvent.params.id}`,
  );

  if (!res.ok) {
    console.log("redirecting...");
    return requestEvent.fail(404, { errorMessage: "NOT FOUND" });
  }

  return await res.json();
});

export default component$(() => {
  const blog = useBlog();
  if (blog.value.errorMessage) {
    return <div>ERROR: {blog.value.errorMessage}</div>;
  }

  return (
    <Resource
      value={blog}
      onPending={() => <div>Loading...</div>}
      onResolved={(blog) => (
        <div>
          <h3>{blog.title}</h3>
          <p>{blog.content}</p>
        </div>
      )}
    />
  );
});
