import "flowbite";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createResource, For, Suspense } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://igajhxbjnnztxdosvlfz.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnYWpoeGJqbm56dHhkb3N2bGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIzMDc5MDEsImV4cCI6MjAyNzg4MzkwMX0.t0eIFCGQEyqbemXiN_TLz42RD8bMgNnnjfOahK0XDbA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const getTweets = async () => {
  const { data } = await supabase.from("tweets").select();
  return data;
};

export default function App() {
  const [tweets] = createResource(getTweets);
  return (
    <Router
      root={(props) => (
        <>
          <Nav />
          <Suspense>{props.children}</Suspense>
          <ul>
            <For each={tweets()}>{(tweet) => <li>{tweet.title}</li>}</For>
          </ul>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
