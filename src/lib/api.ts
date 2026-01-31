const BASE_URL = "http://localhost:4000";

export const apiFetch = async (path: string, options?: RequestInit) => {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
};

export const forumApi = {
  listCategories: (parentId?: string) => 
    apiFetch(`/categories${parentId ? `?parentId=${parentId}` : ""}`),
  
  getCategory: (id: string) => 
    apiFetch(`/categories/${id}`),
  
  listTopics: (categoryId: string) => 
    apiFetch(`/categories/${categoryId}/topics`),
  
  getTopic: (id: string) => 
    apiFetch(`/topics/${id}`),
  
  createTopic: (data: { title: string; categoryId: string; authorId: string; content: string }) => 
    apiFetch("/topics", { method: "POST", body: JSON.stringify(data) }),
  
  listPosts: (topicId: string) => 
    apiFetch(`/topics/${topicId}/posts`),
  
  createPost: (data: { topicId: string; content: string; authorId: string }) => 
    apiFetch("/posts", { method: "POST", body: JSON.stringify(data) }),
  
  seed: () => 
    apiFetch("/seed", { method: "POST" }),
};
