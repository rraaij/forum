/*
 * Development seed: creates an arbitrary-depth BOARD hierarchy only
 * (refactor plan Phase 2). No users, topics, or posts — test fixtures create
 * their own content, and a separate optional content seed may come later.
 *
 * Run through the fail-closed wrapper: pnpm --filter @forum/db db:seed:dev
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  assertSafeDbTarget,
  dbTargetFromEnv,
  describeDbTarget,
} from "../src/safe-target";
import { boards } from "../src/schema/forum";

// Defense in depth: even when invoked outside safe-db.ts (e.g. the legacy
// db:seed script), never seed anything that is not a loopback _dev database.
const target = dbTargetFromEnv(process.env);
assertSafeDbTarget(target, "dev");

const client = postgres({
  host: target.host,
  port: target.port,
  database: target.database,
  username: target.user,
  password: target.password,
  max: 1,
  onnotice: () => {},
});
const db = drizzle(client);

interface BoardSeed {
  name: string;
  slug: string;
  abbreviation: string;
  description?: string;
  icon?: string;
  children?: BoardSeed[];
}

// Five levels deep on the Technology branch to exercise arbitrary depth.
const tree: BoardSeed[] = [
  {
    name: "General Discussion",
    slug: "general",
    abbreviation: "GEN",
    description: "Talk about anything and everything",
    icon: "💬",
    children: [
      {
        name: "Introductions",
        slug: "introductions",
        abbreviation: "INTRO",
        description: "Say hello to the community",
      },
      {
        name: "Off Topic",
        slug: "off-topic",
        abbreviation: "OFF",
        description: "Random conversations and fun",
      },
    ],
  },
  {
    name: "Technology",
    slug: "technology",
    abbreviation: "TECH",
    description: "Tech news, programming, and gadgets",
    icon: "💻",
    children: [
      {
        name: "Web Development",
        slug: "web-dev",
        abbreviation: "WEB",
        description: "Frontend, backend, and full-stack discussions",
        children: [
          {
            name: "Frontend",
            slug: "frontend",
            abbreviation: "FE",
            children: [
              {
                name: "SolidJS",
                slug: "solidjs",
                abbreviation: "SOLID",
                children: [
                  {
                    name: "TanStack",
                    slug: "tanstack",
                    abbreviation: "TAN",
                    description: "Router, Start, and Query on Solid",
                  },
                ],
              },
              { name: "Styling", slug: "styling", abbreviation: "CSS" },
            ],
          },
          { name: "Backend", slug: "backend", abbreviation: "BE" },
        ],
      },
      {
        name: "Hardware",
        slug: "hardware",
        abbreviation: "HW",
        description: "Computers, phones, and gadgets",
      },
      {
        name: "Self-Hosting",
        slug: "self-hosting",
        abbreviation: "SELF",
        description: "NAS, Docker, home servers",
      },
    ],
  },
  {
    name: "Meta",
    slug: "meta",
    abbreviation: "META",
    description: "Forum feedback and suggestions",
    icon: "📋",
    children: [
      {
        name: "Bug Reports",
        slug: "bugs",
        abbreviation: "BUG",
        description: "Report issues with the forum",
      },
      {
        name: "Feature Requests",
        slug: "features",
        abbreviation: "FEAT",
        description: "Suggest improvements",
      },
    ],
  },
];

async function insertTree(
  nodes: BoardSeed[],
  parentId: string | null,
): Promise<number> {
  let inserted = 0;
  for (const [index, node] of nodes.entries()) {
    const [row] = await db
      .insert(boards)
      .values({
        parentId,
        name: node.name,
        slug: node.slug,
        abbreviation: node.abbreviation,
        description: node.description ?? null,
        icon: node.icon ?? null,
        sortOrder: index,
      })
      .returning({ id: boards.id });
    inserted += 1;
    if (node.children) {
      inserted += await insertTree(node.children, row.id);
    }
  }
  return inserted;
}

async function seed() {
  console.log(`[seed] target: ${describeDbTarget(target)}`);

  const existing = await db.select({ id: boards.id }).from(boards).limit(1);
  if (existing.length > 0) {
    console.log("[seed] boards already present; nothing to do");
    process.exit(0);
  }

  const inserted = await insertTree(tree, null);
  console.log(`[seed] created ${inserted} boards (up to 5 levels deep)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
