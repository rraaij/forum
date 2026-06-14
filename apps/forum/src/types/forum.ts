/*
 * Shared forum API models.
 *
 * Keeping these response shapes in one module prevents route components from
 * drifting apart when the API adds a field such as topicCount or a parent ID.
 * Dates are strings because these values cross the JSON API boundary.
 */

export type Subcategory = {
  id: string;
  categoryId: string;
  parentSubcategoryId: string | null;
  name: string;
  slug: string;
  abbreviation: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  topicCount: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  topicCount: number;
  subcategories: Subcategory[];
};

/*
 * This is the shape returned by GET /topics. It contains the author display
 * name from the users join but intentionally does not contain full post data.
 */
export type TopicSummary = {
  id: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  postCount: number;
  lastPostAt: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
};

export type ForumPost = {
  id: string;
  content: string;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
};

/*
 * GET /topics/:id returns the stored topic row plus its ordered posts. Unlike
 * TopicSummary, the detail endpoint does not join an author display name onto
 * the topic itself.
 */
export type TopicDetail = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  authorId: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  postCount: number;
  lastPostAt: string | null;
  createdAt: string;
  posts: ForumPost[];
};

export type CreatedTopic = Pick<TopicDetail, "id" | "slug">;

/*
 * A topic belongs to exactly one parent. The never fields make it impossible
 * for callers to accidentally submit both IDs to the creation endpoint.
 */
export type TopicParent =
  | {
      categoryId: string;
      subcategoryId?: never;
    }
  | {
      categoryId?: never;
      subcategoryId: string;
    };

export type SubcategoryMeta = {
  topicCount: number;
  replyCount: number;
  lastActivityAt: string | null;
};
