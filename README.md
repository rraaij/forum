# SolidStart

Everything you need to build a Solid project, powered by [`solid-start`](https://start.solidjs.com);

## Creating a project

```bash
# create a new project in the current directory
npm init solid@latest

# create a new project in my-app
npm init solid@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

Solid apps are built with _presets_, which optimise your project for deployment to different environments.

By default, `npm run build` will generate a Node app that you can run with `npm start`. To use a different preset, add it to the `devDependencies` in `package.json` and specify in your `app.config.js`.

## Used Tech
- This project was created with the [Solid CLI](https://solid-cli.netlify.app)
- TailwindCSS
- [Flowbite](https://flowbite.com/)
- [Supabase](https://supabase.com/docs)
- vitest

## Wanna Use Tech
- Drizzle ORM or Prisma ORM?
- [Solid-community @ github](https://github.com/solidjs-community)
- [biome (linting and codestyling)](https://biomejs.dev/linter/)

## UI library alternatives
- [kobalte](https://kobalte.dev/docs/core/overview/introduction)
- [corvu](https://corvu.dev/)
- [ark-ui](https://ark-ui.com/)
- [park-ui](https://park-ui.com/)
- [solid-ui (shad-cn/ui port)](https://www.solid-ui.com/)

## SolidJS on Youtube
- [Atila](https://www.youtube.com/@AtilaDotIO)
- 
