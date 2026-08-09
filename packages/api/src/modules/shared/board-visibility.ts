export interface VisibilityBoardRow {
  id: string;
  parentId: string | null;
  isGuestVisible: boolean;
}

/*
 * Guest visibility is inherited from every ancestor. Centralizing the walk
 * prevents search, listings, and future reads from disagreeing about whether
 * an orphaned or hidden subtree may contribute rows, counts, or timing data.
 */
export function visibleBoards<Row extends VisibilityBoardRow>(
  rows: Row[],
  isAuthenticated: boolean,
): Row[] {
  if (isAuthenticated) return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const visibility = new Map<string, boolean>();
  const isVisible = (row: Row): boolean => {
    const cached = visibility.get(row.id);
    if (cached !== undefined) return cached;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    const visible =
      row.isGuestVisible &&
      (row.parentId === null || (parent ? isVisible(parent) : false));
    visibility.set(row.id, visible);
    return visible;
  };
  return rows.filter(isVisible);
}
