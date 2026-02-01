import { renderToString } from "react-dom/server";
import { StartServer } from "@tanstack/start/server";
import { createRouter } from "./router";
import type { EntryContext } from "@tanstack/start";

export async function render(context: EntryContext) {
  const router = createRouter();
  const html = renderToString(<StartServer router={router} />);
  return { html };
}
