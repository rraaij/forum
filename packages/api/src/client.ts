// Use environment variable for API URL, fallback to localhost for development
const BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiFetch = async <T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      body?.error || `API Error: ${response.statusText}`,
      response.status,
      body,
    );
  }

  return body as T;
};

// Types for API responses
export interface Category {
  _id: string;
  _creationTime: number;
  title: string;
  description?: string;
  parentId?: string;
  order: number;
}

export interface Topic {
  _id: string;
  _creationTime: number;
  title: string;
  categoryId: string;
  authorId: string;
  createdAt: number;
}

export interface Post {
  _id: string;
  _creationTime: number;
  topicId: string;
  content: string;
  authorId: string;
  createdAt: number;
}

export const forumApi = {
  // Read operations (public, via API)
  listCategories: (parentId?: string) =>
    apiFetch<Category[]>(
      `/categories${parentId ? `?parentId=${parentId}` : ""}`,
    ),

  getCategory: (id: string) => apiFetch<Category>(`/categories/${id}`),

  listTopics: (categoryId: string) =>
    apiFetch<Topic[]>(`/categories/${categoryId}/topics`),

  getTopic: (id: string) => apiFetch<Topic>(`/topics/${id}`),

  listPosts: (topicId: string) => apiFetch<Post[]>(`/topics/${topicId}/posts`),

  // System (dev only)
  seed: () => apiFetch<{ success: boolean }>("/seed", { method: "POST" }),
};
