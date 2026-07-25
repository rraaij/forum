/*
 * REMAINING hand-maintained transport types. Forum read/write types are now
 * derived from the Hono AppType (see features/forum-read/api.ts and
 * features/topic-discussion/api.ts). What is left here serves callers whose
 * endpoints have not been replaced yet:
 * - Category/Subcategory: CategoryManagerDialog + GET /api/categories
 *   (replaced by /admin/boards in Phase 5)
 * - UserProfile/UserPostActivity: profile.tsx (replaced in Phases 6-7)
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

export type UserProfile = {
  username: string;
  email: string;
  displayName: string | null;
  dateOfBirth: string | null;
  profileText: string | null;
  image: string | null;
  location: string | null;
  website: string | null;
  photoUrls: string[];
};

export type UserPostActivity = {
  postId: string;
  postContent: string;
  postCreatedAt: string;
  postDeleted: boolean;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  topicCreatedAt: string;
  categorySlug: string | null;
  subcategorySlug: string | null;
  isTopicStart: boolean;
};
