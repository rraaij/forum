import {
  categories,
  posts,
  subcategories,
  topics,
  users,
} from "@forum/db/schema";
import { desc, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db";
import { requireUser } from "../middleware/require-user";
import type { AppEnv } from "../types";
import {
  legacyJsonBodyLimit,
  legacyValidator,
  PROFILE_BODY_LIMIT,
} from "../validation/legacy";

const profileRoutes = new Hono<AppEnv>();

const MAX_PHOTOS = 12;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_DATA_PATTERN =
  /^data:image\/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

/*
 * Structural transport validation only: field-level rules (lengths, MIME
 * types, image bytes, dates) stay in the validators below so their error
 * messages — which the characterization tests pin — are unchanged.
 */
const profileUpdateSchema = z.object({
  displayName: z.string({ message: "Display name must be text" }).nullish(),
  dateOfBirth: z.string({ message: "Date of birth must be text" }).nullish(),
  profileText: z.string({ message: "Profile text must be text" }).nullish(),
  image: z.string({ message: "Avatar must be text" }).nullish(),
  location: z.string({ message: "Location must be text" }).nullish(),
  website: z.string({ message: "Website must be text" }).nullish(),
  photoUrls: z.array(z.string({ message: "Photos must be images" }), {
    message: "Photos must be an array of images",
  }),
});

const avatarUpdateSchema = z.object({
  image: z.string({ message: "Avatar must be text" }).nullish(),
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

function optionalText(
  value: unknown,
  field: string,
  maximumLength: number,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${field} must be text`);
  }

  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new Error(`${field} must be at most ${maximumLength} characters`);
  }

  return normalized || null;
}

function optionalUrl(value: unknown, field: string): string | null {
  const normalized = optionalText(value, field, 2_000);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error(`${field} must be a valid http(s) URL`);
  }

  return normalized;
}

function optionalImage(value: unknown, field: string): string | null {
  const normalized = optionalText(
    value,
    field,
    // Base64 is roughly one third larger than the source file. Keep a modest
    // allowance for the MIME prefix and padding before exact byte validation.
    Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100,
  );
  if (!normalized) return null;

  /*
   * Continue accepting an existing http(s) image for backwards compatibility,
   * but every new file selected by the profile UI arrives as a data URL and is
   * therefore stored directly in PostgreSQL.
   */
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return optionalUrl(normalized, field);
  }

  const match = normalized.match(IMAGE_DATA_PATTERN);
  if (!match) {
    throw new Error(
      `${field} must be a JPEG, PNG, WebP, or GIF image selected from your device`,
    );
  }

  const base64 = match[1];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor((base64.length * 3) / 4) - padding;
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`${field} must be no larger than 2 MB`);
  }

  return normalized;
}

function profileShape(user: typeof users.$inferSelect) {
  return {
    // The Better Auth name is deliberately exposed as username but never
    // accepted by PATCH, making its immutability an API-level guarantee.
    username: user.name ?? "",
    email: user.email,
    displayName: user.displayName,
    dateOfBirth: user.dateOfBirth,
    profileText: user.profileText,
    image: user.image,
    location: user.location,
    website: user.website,
    photoUrls: user.photoUrls,
  };
}

profileRoutes.get("/", async (c) => {
  const sessionUser = c.get("user");
  if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(profileShape(user));
});

profileRoutes.get("/activity", async (c) => {
  const sessionUser = c.get("user");
  if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

  const rows = await getDb()
    .select({
      postId: posts.id,
      postContent: posts.content,
      postCreatedAt: posts.createdAt,
      postDeleted: posts.isDeleted,
      topicId: topics.id,
      topicTitle: topics.title,
      topicSlug: topics.slug,
      topicCreatedAt: topics.createdAt,
      topicAuthorId: topics.authorId,
      categorySlug: categories.slug,
      subcategorySlug: subcategories.slug,
      /*
       * The query is restricted to one author. For a topic that user created,
       * their first post is therefore its opening post.
       */
      authorPostPosition: sql<number>`row_number() over (
        partition by ${topics.id}
        order by ${posts.createdAt}, ${posts.id}
      )`,
    })
    .from(posts)
    .innerJoin(topics, eq(posts.topicId, topics.id))
    .leftJoin(subcategories, eq(topics.subcategoryId, subcategories.id))
    .leftJoin(
      categories,
      or(
        eq(categories.id, topics.categoryId),
        eq(categories.id, subcategories.categoryId),
      ),
    )
    .where(eq(posts.authorId, sessionUser.id))
    .orderBy(desc(posts.createdAt));

  return c.json(
    rows.map((row) => ({
      postId: row.postId,
      postContent: row.postContent,
      postCreatedAt: row.postCreatedAt,
      postDeleted: row.postDeleted,
      topicId: row.topicId,
      topicTitle: row.topicTitle,
      topicSlug: row.topicSlug,
      topicCreatedAt: row.topicCreatedAt,
      categorySlug: row.categorySlug,
      subcategorySlug: row.subcategorySlug,
      isTopicStart:
        row.topicAuthorId === sessionUser.id &&
        Number(row.authorPostPosition) === 1,
    })),
  );
});

// Avatar changes save independently so selecting a file can update author
// imagery everywhere without also committing unrelated in-progress form edits.
profileRoutes.patch(
  "/avatar",
  requireUser,
  legacyJsonBodyLimit(PROFILE_BODY_LIMIT),
  legacyValidator("json", avatarUpdateSchema),
  async (c) => {
    const sessionUser = c.get("user");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

    try {
      const body = c.req.valid("json");
      const [updatedUser] = await getDb()
        .update(users)
        .set({
          image: optionalImage(body.image, "Avatar"),
          updatedAt: new Date(),
        })
        .where(eq(users.id, sessionUser.id))
        .returning();

      if (!updatedUser) return c.json({ error: "User not found" }, 404);
      return c.json(profileShape(updatedUser));
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "Invalid avatar" },
        400,
      );
    }
  },
);

profileRoutes.patch(
  "/",
  requireUser,
  legacyJsonBodyLimit(PROFILE_BODY_LIMIT),
  legacyValidator("json", profileUpdateSchema),
  async (c) => {
    const sessionUser = c.get("user");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

    const body: ProfileUpdate = c.req.valid("json");

    try {
      const dateOfBirth = optionalText(body.dateOfBirth, "Date of birth", 10);
      if (dateOfBirth && !DATE_PATTERN.test(dateOfBirth)) {
        return c.json({ error: "Date of birth must use YYYY-MM-DD" }, 400);
      }
      if (dateOfBirth) {
        const parsedDate = new Date(`${dateOfBirth}T00:00:00Z`);
        if (
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== dateOfBirth
        ) {
          return c.json({ error: "Date of birth is not a valid date" }, 400);
        }
        if (parsedDate > new Date()) {
          return c.json(
            { error: "Date of birth cannot be in the future" },
            400,
          );
        }
      }

      if (!Array.isArray(body.photoUrls)) {
        return c.json({ error: "Photos must be an array of images" }, 400);
      }
      if (body.photoUrls.length > MAX_PHOTOS) {
        return c.json(
          { error: `A profile can contain up to ${MAX_PHOTOS} photos` },
          400,
        );
      }

      // Validate every gallery image before writing anything, so a bad final item
      // cannot leave the user's other profile fields partially updated.
      const photoUrls = body.photoUrls.map((photo, index) => {
        const validated = optionalImage(photo, `Photo ${index + 1}`);
        if (!validated) throw new Error(`Photo ${index + 1} cannot be empty`);
        return validated;
      });

      const [updatedUser] = await getDb()
        .update(users)
        .set({
          displayName: optionalText(body.displayName, "Display name", 80),
          dateOfBirth,
          profileText: optionalText(body.profileText, "Profile text", 2_000),
          image: optionalImage(body.image, "Avatar"),
          location: optionalText(body.location, "Location", 100),
          website: optionalUrl(body.website, "Website"),
          photoUrls,
          updatedAt: new Date(),
        })
        .where(eq(users.id, sessionUser.id))
        .returning();

      if (!updatedUser) return c.json({ error: "User not found" }, 404);
      return c.json(profileShape(updatedUser));
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "Invalid profile" },
        400,
      );
    }
  },
);

export { profileRoutes };
