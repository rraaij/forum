import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { categories, subcategories } from "../src/schema/index";

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}`;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log("Seeding database...");

  // Insert categories
  const [general, tech, meta] = await db
    .insert(categories)
    .values([
      {
        name: "General Discussion",
        slug: "general",
        description: "Talk about anything and everything",
        icon: "💬",
        sortOrder: 0,
      },
      {
        name: "Technology",
        slug: "technology",
        description: "Tech news, programming, and gadgets",
        icon: "💻",
        sortOrder: 1,
      },
      {
        name: "Meta",
        slug: "meta",
        description: "Forum feedback and suggestions",
        icon: "📋",
        sortOrder: 2,
      },
    ])
    .returning();

  // Insert subcategories
  await db.insert(subcategories).values([
    // General Discussion
    {
      categoryId: general.id,
      name: "Introductions",
      slug: "introductions",
      description: "Say hello to the community",
      sortOrder: 0,
    },
    {
      categoryId: general.id,
      name: "Off Topic",
      slug: "off-topic",
      description: "Random conversations and fun",
      sortOrder: 1,
    },
    // Technology
    {
      categoryId: tech.id,
      name: "Web Development",
      slug: "web-dev",
      description: "Frontend, backend, and full-stack discussions",
      sortOrder: 0,
    },
    {
      categoryId: tech.id,
      name: "Hardware",
      slug: "hardware",
      description: "Computers, phones, and gadgets",
      sortOrder: 1,
    },
    {
      categoryId: tech.id,
      name: "Self-Hosting",
      slug: "self-hosting",
      description: "NAS, Docker, home servers",
      sortOrder: 2,
    },
    // Meta
    {
      categoryId: meta.id,
      name: "Bug Reports",
      slug: "bugs",
      description: "Report issues with the forum",
      sortOrder: 0,
    },
    {
      categoryId: meta.id,
      name: "Feature Requests",
      slug: "features",
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
