/*
 * Pure hierarchy rules (refactor plan section 5.3). Arbitrary depth is
 * allowed; self-parenting and cycles are not. The database trigger added in
 * migration 0006 is authoritative — these checks exist so callers get a
 * typed, actionable error instead of a raw constraint violation.
 */

import { boardCycle } from "./errors";

export interface BoardNode {
  id: string;
  parentId: string | null;
}

/** Every ancestor of `boardId`, nearest first. */
export function ancestorsOf(
  boardId: string,
  byId: Map<string, BoardNode>,
): string[] {
  const chain: string[] = [];
  let current = byId.get(boardId)?.parentId ?? null;
  // A malformed cycle in the data would loop forever; the visited set makes
  // this function safe to run even then.
  const visited = new Set<string>([boardId]);
  while (current && !visited.has(current)) {
    chain.push(current);
    visited.add(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return chain;
}

/**
 * Rejects moving a board under itself or under one of its own descendants.
 * Equivalent formulation: the new parent must not be the board itself, and
 * the board must not appear among the new parent's ancestors.
 */
export function assertMoveKeepsTreeAcyclic(
  boardId: string,
  newParentId: string | null,
  byId: Map<string, BoardNode>,
): void {
  if (newParentId === null) return;
  if (newParentId === boardId) throw boardCycle();
  if (ancestorsOf(newParentId, byId).includes(boardId)) throw boardCycle();
}
