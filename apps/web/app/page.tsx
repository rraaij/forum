import { trpc } from "@web/app/trpc";
import Clientside from "@web/app/Clientside";

export default async function Home() {
  const response = await trpc.hello.query({ name: "Ramon" });
  return (
    <>
      <div>Server side {response}</div>
      <Clientside />
    </>
  );
}
