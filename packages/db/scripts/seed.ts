import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { categories, subcategories } from "../src";

// Reuse the same POSTGRES_* variables as the API so seed data goes into the
// configured database, whether that is the NAS server or a local override.
const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}`;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log("Seeding database...");

  // Insert the top-level forum sections first because subcategories reference
  // these IDs through their category_id foreign key.
  const [general, tech, meta] = await db
    .insert(categories)
    .values([
      {
        name: "General Discussion",
        slug: "general",
        abbreviation: "GENER",
        description: "Talk about anything and everything",
        icon: "💬",
        sortOrder: 0,
      },
      {
        name: "Technology",
        slug: "technology",
        abbreviation: "TECHN",
        description: "Tech news, programming, and gadgets",
        icon: "💻",
        sortOrder: 1,
      },
      {
        name: "Meta",
        slug: "meta",
        abbreviation: "META",
        description: "Forum feedback and suggestions",
        icon: "📋",
        sortOrder: 2,
      },
    ])
    .returning();

  // Insert the initial subforums. These rows are intentionally simple seed data
  // that make the home page useful during development without requiring admin
  // setup through the UI.
  await db.insert(subcategories).values([
    // General Discussion
    {
      categoryId: general.id,
      name: "Introductions",
      slug: "introductions",
      abbreviation: "INTRO",
      description: "Say hello to the community",
      sortOrder: 0,
    },
    {
      categoryId: general.id,
      name: "Off Topic",
      slug: "off-topic",
      abbreviation: "OFF T",
      description: "Random conversations and fun",
      sortOrder: 1,
    },
    // Technology
    {
      categoryId: tech.id,
      name: "Web Development",
      slug: "web-dev",
      abbreviation: "WEB D",
      description: "Frontend, backend, and full-stack discussions",
      sortOrder: 0,
    },
    {
      categoryId: tech.id,
      name: "Hardware",
      slug: "hardware",
      abbreviation: "HARDW",
      description: "Computers, phones, and gadgets",
      sortOrder: 1,
    },
    {
      categoryId: tech.id,
      name: "Self-Hosting",
      slug: "self-hosting",
      abbreviation: "SELF-",
      description: "NAS, Docker, home servers",
      sortOrder: 2,
    },
    // Meta
    {
      categoryId: meta.id,
      name: "Bug Reports",
      slug: "bugs",
      abbreviation: "BUG R",
      description: "Report issues with the forum",
      sortOrder: 0,
    },
    {
      categoryId: meta.id,
      name: "Feature Requests",
      slug: "features",
      abbreviation: "FEATU",
      description: "Suggest improvements",
      sortOrder: 1,
    },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
