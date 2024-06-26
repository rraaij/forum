import AuthButton from "@/components/AuthButton";
import Header from "@/components/Header";
import FetchDataSteps from "@/components/tutorial/FetchDataSteps";
import { createClient } from "@/lib/supabase/server";
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
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <div className="w-full">
        <div className="py-6 font-bold bg-purple-950 text-center">
          This is a protected page that you can only see as an authenticated
          user
        </div>
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
            <AuthButton />
          </div>
        </nav>
      </div>
      <pre className={"text-xs"}>USER: {JSON.stringify(user, null, 2)}</pre>
      <pre className={"text-xs w-[300px]"}>
        SESSION: {JSON.stringify(session, null, 2)}
      </pre>
      <pre className={"text-xs w-[300px]"}>
        TWEETS: {JSON.stringify(tweets, null, 2)}
      </pre>

      <div className="flex-1 flex flex-col gap-20 opacity-0 max-w-4xl px-3">
        <Header />
        <main className="flex-1 flex flex-col gap-6">
          <h2 className="font-bold text-4xl mb-4">Next steps</h2>
          <FetchDataSteps />
        </main>
      </div>

      <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
        <p>
          Powered by{" "}
          <a
            href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Supabase
          </a>
        </p>
      </footer>
    </div>
  );
}
