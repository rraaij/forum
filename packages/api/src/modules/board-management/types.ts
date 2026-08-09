/*
 * Board management contract (refactor plan section 5.3). Boards form one
 * arbitrary-depth adjacency list; a root board is presented as a category,
 * a non-root board as a subcategory.
 */

export interface CreateBoardInput {
  /** null creates a root board (category). */
  parentId: string | null;
  name: string;
  slug: string;
  abbreviation: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isGuestVisible?: boolean;
  allowNewTopics?: boolean;
}

export interface UpdateBoardInput {
  boardId: string;
  name?: string;
  slug?: string;
  abbreviation?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isGuestVisible?: boolean;
  allowNewTopics?: boolean;
}

export interface MoveBoardInput {
  boardId: string;
  newParentId: string | null;
  sortOrder: number;
}

export interface ReorderBoardGroupsInput {
  groups: Array<{
    parentId: string | null;
    /** Complete sibling order, first to last. */
    boardIds: string[];
  }>;
}

export interface BoardPurgeImpactCounts {
  boards: number;
  topics: number;
  posts: number;
  reactions: number;
  votes: number;
  topicViews: number;
}

export interface BoardPurgeImpact {
  boardId: string;
  /** Exact case-sensitive name the confirmation must repeat. */
  boardName: string;
  counts: BoardPurgeImpactCounts;
}

export interface PurgeBoardTreeInput {
  boardId: string;
  confirmationName: string;
  expectedImpact: BoardPurgeImpactCounts;
}

export interface BoardManagement {
  createBoard(input: CreateBoardInput): Promise<{ boardId: string }>;
  updateBoard(input: UpdateBoardInput): Promise<void>;
  moveBoard(input: MoveBoardInput): Promise<void>;
  reorderBoardGroups(
    input: ReorderBoardGroupsInput,
  ): Promise<{ groups: number; boards: number }>;
  previewRecursivePurge(boardId: string): Promise<BoardPurgeImpact>;
  purgeBoardTree(input: PurgeBoardTreeInput): Promise<BoardPurgeImpactCounts>;
}
