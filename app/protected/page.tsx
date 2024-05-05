import AuthButton from "@/components/AuthButton";
import FetchDataSteps from "@/components/tutorial/FetchDataSteps";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = createClient();

  const { data: user } = await supabase.auth.getUser();
  const { data: session } = await supabase.auth.getSession();

  if (!user.user) {
    return redirect("/login");
  }

  const { data: tweets } = await supabase.from("tweets").select();

  return (
    <>
      <header className="bg-gray-800 text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">My Forum</h1>
        <nav className="flex space-x-4">
          <Link href="#" className="hover:text-gray-400">
            Home
          </Link>
          <Link href="#" className="hover:text-gray-400">
            Categories
          </Link>
          <Link href="#" className="hover:text-gray-400">
            Login
          </Link>
          <Link href="#" className="hover:text-gray-400">
            Register
          </Link>
        </nav>
        <AuthButton />
      </header>

      <main className="container mx-auto px-4 py-8">
        <aside className="w-1/4 float-left mr-4">
          <h2 className="text-lg font-bold mb-2">Categories</h2>
          <ul className="list-none space-y-2">
            <li className="hover:bg-gray-200 p-2 rounded">
              <Link href="#">General Discussion</Link>
            </li>
            <li className="hover:bg-gray-200 p-2 rounded">
              <Link href="#">Tech</Link>
            </li>
            <li className="hover:bg-gray-200 p-2 rounded">
              <Link href="#">Entertainment</Link>
            </li>
          </ul>
        </aside>

        <section className="w-3/4 float-left">
          <h2 className="text-lg font-bold mb-2">Latest Threads</h2>
          <article className="border border-gray-300 p-4 rounded mb-4">
            <h3 className="text-base font-bold hover:text-blue-500">
              <Link href="#">Sample Thread Title</Link>
            </h3>
            <div className="flex items-center mb-2">
              <span className="text-gray-500 mr-2">By: User123</span>
              <span className="text-gray-500">2 days ago</span>
            </div>
            <p className="text-gray-700">
              Here's a short description of the thread content.
            </p>
          </article>

          <article className="border border-gray-300 p-4 rounded mb-4">
            <pre className={"text-xs"}>
              USER: {JSON.stringify(user, null, 2)}
            </pre>
            <pre className={"text-xs w-[300px]"}>
              SESSION: {JSON.stringify(session, null, 2)}
            </pre>
            <pre className={"text-xs w-[300px]"}>
              TWEETS: {JSON.stringify(tweets, null, 2)}
            </pre>
          </article>
        </section>
      </main>

      <footer className="bg-gray-800 text-white text-center p-4">
        <p>&copy; My Forum 2024</p>
      </footer>
    </>
  );
}
