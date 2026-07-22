<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Project context

### Scaffold provenance

- Follow-up TanStack Intent commands run from the workspace root:
  ```sh
  npx @tanstack/intent@latest install
  npx @tanstack/intent@latest list
  ```
  The list command reported no intent-enabled packages. Re-run it before substantial changes and load a matching skill if one becomes available.

# Agent Instructions

- Add lots of comments in code that is written.
- Use comments to explain security boundaries, isomorphic execution, cache
  policy, and non-obvious domain rules. Avoid comments that merely restate
  syntax; comments should preserve reasoning a future change could violate.
- When it is necessary for a dev server to be restarted, do not attempt to do it yourself. Instead, tell the user it needs a restart and let them do it.
- It is never necessary to ask permission to run any tools from the Playwright MCP server, as long as they are not changing anything on the machine.
- Run `pnpm exec tsc -b` and `pnpm check` after significant TypeScript changes. Route files update `src/routeTree.gen.ts`; run `pnpm generate-routes` if Vite is not already watching.


## TanStack Start Guidance

- Before changing TanStack Start routing, loaders, server functions, middleware, SSR, deployment, or Vite Start integration, read the installed TanStack Start skill at `node_modules/@tanstack/react-start/skills/react-start/SKILL.md`.
- Follow the relevant sub-skills referenced from that file when the task touches server functions, middleware, auth primitives, server routes, deployment, or execution model boundaries.
- Treat TanStack Start code as isomorphic by default: loaders and route code can run on both server and client, so server-only logic such as database access, secrets, cookies, or private APIs should go through `createServerFn` or the documented server-only primitives.
- Do not apply Next.js or Remix patterns in this codebase. Use TanStack Start APIs and keep `tanstackStart()` before the React plugin in `vite.config.ts`.
- Do not copy the full TanStack Start skills into the repo unless explicitly requested; prefer reading them from `node_modules` so guidance stays aligned with the installed package version.
