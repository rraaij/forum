# forum

Nest.js with Next.js and tRPC!!
- from tutorial: https://www.tomray.dev/nestjs-nextjs-trpc
- github: https://github.com/tomwray13/nestjs-nextjs-trpc/tree/main
- youtube: https://www.youtube.com/watch?v=_B093QdDO7g

### start dev environment 
```pnpm dev```
(both server and web projects in parallel)

### to add package to nest.js server or web app
```pnpm add @nestjs/config --filter=server|web```

### deployment to Railway
see end of Youtube video (linked above) for deployment instructions

# Next.js Frontend
### Shad-cn/ui component library
tutorial: https://www.freecodecamp.org/news/shadcn-with-next-js-14/
```shell
// initialize
$ pnpm dlx shadcn-ui@latest init

// install icons
$ pnpm i @radix-ui/react-icons

// add specific component
$ pnpm dlx shadcn-ui@latest add <component>

// add component from list
$ pnpm dlx shadcn-ui@latest add
```

# Nest.js backend
tutorials Anson the Developer: https://www.youtube.com/@ansonthedev

## SUPABASE
- interessante blogs: Next x Nest (zonder tRPC) + Supabase in NestJS https://dev.to/abhikbanerjee99/series/24391 + bijbehorende github https://github.com/abhik-99/Trivial-Kanban/tree/main/apps/backend
- NestJS Supabase Auth https://github.com/hiro1107/nestjs-supabase-auth
