import { Modal } from "@forum/ui";
import type { Component } from "solid-js";
import { createResource, createSignal, For, Show } from "solid-js";
import { apiFetch } from "@/lib/api";

interface Subcategory {
  id: string;
  categoryId: string;
  parentSubcategoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  subcategories: Subcategory[];
}

interface InlineForm {
  name: string;
  slug: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Inline edit form ──────────────────────────────────────

function EditForm(props: {
  form: InlineForm;
  onNameInput: (v: string) => void;
  onSlugInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="flex gap-2 items-center flex-1">
      <input
        class="input input-sm input-bordered flex-1"
        value={props.form.name}
        onInput={(e) => props.onNameInput(e.currentTarget.value)}
        placeholder="Name"
      />
      <input
        class="input input-sm input-bordered w-32"
        value={props.form.slug}
        onInput={(e) => props.onSlugInput(e.currentTarget.value)}
        placeholder="slug"
      />
      <button class="btn btn-sm btn-primary" onClick={props.onSave}>
        Save
      </button>
      <button class="btn btn-sm btn-ghost" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
}

// ── Inline add form ───────────────────────────────────────

function AddForm(props: {
  form: InlineForm;
  label: string;
  onNameInput: (v: string) => void;
  onSlugInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="flex gap-2 items-center mt-1">
      <input
        class="input input-sm input-bordered flex-1"
        value={props.form.name}
        onInput={(e) => props.onNameInput(e.currentTarget.value)}
        placeholder={props.label}
        autofocus
      />
      <input
        class="input input-sm input-bordered w-32"
        value={props.form.slug}
        onInput={(e) => props.onSlugInput(e.currentTarget.value)}
        placeholder="slug"
      />
      <button class="btn btn-sm btn-primary" onClick={props.onSave}>
        Add
      </button>
      <button class="btn btn-sm btn-ghost" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────

function DeleteConfirm(props: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div class="flex gap-1 items-center">
      <span class="text-sm text-error">Delete?</span>
      <button class="btn btn-xs btn-error" onClick={props.onConfirm}>
        Yes
      </button>
      <button class="btn btn-xs btn-ghost" onClick={props.onCancel}>
        No
      </button>
    </div>
  );
}

// ── Item actions (module-level to avoid closure in parent scope) ──

function ItemActions(props: {
  id: string;
  onEdit: () => void;
  addLabel?: string;
  onAdd?: () => void;
  deletingId: () => string | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onStartDelete: () => void;
}) {
  return (
    <Show
      when={props.deletingId() === props.id}
      fallback={
        <div class="flex gap-1 shrink-0">
          <button
            class="btn btn-xs btn-ghost"
            onClick={props.onEdit}
            title="Edit"
          >
            ✏️
          </button>
          <button
            class="btn btn-xs btn-ghost text-error"
            onClick={props.onStartDelete}
            title="Delete"
          >
            🗑️
          </button>
          <Show when={props.onAdd}>
            <button
              class="btn btn-xs btn-ghost"
              onClick={props.onAdd}
              title={props.addLabel}
            >
              + Sub
            </button>
          </Show>
        </div>
      }
    >
      <DeleteConfirm
        onConfirm={props.onDeleteConfirm}
        onCancel={props.onDeleteCancel}
      />
    </Show>
  );
}

// ── Main dialog ───────────────────────────────────────────

export const CategoryManagerDialog: Component<{
  open: boolean;
  onClose: () => void;
}> = (props) => {
  // Use a counter as the resource key so we can manually refetch
  const [fetchKey, setFetchKey] = createSignal(0);
  const [data] = createResource(
    () => (props.open ? fetchKey() : undefined),
    () => apiFetch<Category[]>("/categories"),
  );

  const refetch = () => setFetchKey((k) => k + 1);

  // Accordion expand state
  const [expanded, setExpanded] = createSignal(new Set<string>());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Edit state
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editForm, setEditForm] = createSignal<InlineForm>({
    name: "",
    slug: "",
  });

  type AddMode =
    | { type: "category" }
    | {
        type: "subcategory";
        categoryId: string;
        parentSubcategoryId?: string;
      };
  const [addMode, setAddMode] = createSignal<AddMode | null>(null);
  const [addForm, setAddForm] = createSignal<InlineForm>({
    name: "",
    slug: "",
  });

  // Delete confirm state
  const [deletingId, setDeletingId] = createSignal<string | null>(null);

  // Mutation error state
  const [mutationError, setMutationError] = createSignal<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────

  const startEdit = (item: { id: string; name: string; slug: string }) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, slug: item.slug });
  };

  const saveEdit = async (
    endpoint: "categories" | "subcategories",
    id: string,
  ) => {
    const f = editForm();
    try {
      await apiFetch(`/admin/${endpoint}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: f.name, slug: f.slug }),
      });
      setEditingId(null);
      setMutationError(null);
      refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const saveAdd = async () => {
    const mode = addMode();
    if (!mode) return;
    const f = addForm();

    try {
      if (mode.type === "category") {
        await apiFetch("/admin/categories", {
          method: "POST",
          body: JSON.stringify({ name: f.name, slug: f.slug }),
        });
      } else {
        await apiFetch("/admin/subcategories", {
          method: "POST",
          body: JSON.stringify({
            categoryId: mode.categoryId,
            parentSubcategoryId: mode.parentSubcategoryId ?? null,
            name: f.name,
            slug: f.slug,
          }),
        });
      }
      setAddMode(null);
      setAddForm({ name: "", slug: "" });
      setMutationError(null);
      refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to add");
    }
  };

  const deleteItem = async (
    endpoint: "categories" | "subcategories",
    id: string,
  ) => {
    try {
      await apiFetch(`/admin/${endpoint}/${id}`, { method: "DELETE" });
      setDeletingId(null);
      setMutationError(null);
      refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to delete");
      setDeletingId(null);
    }
  };

  const startAdd = (mode: AddMode, expandId?: string) => {
    setAddMode(mode);
    setAddForm({ name: "", slug: "" });
    if (expandId) {
      setExpanded((prev) => new Set([...prev, expandId]));
    }
  };

  const updateAddName = (v: string) => setAddForm({ name: v, slug: toSlug(v) });
  const updateAddSlug = (v: string) => setAddForm((f) => ({ ...f, slug: v }));
  const updateEditName = (v: string) =>
    setEditForm({ name: v, slug: toSlug(v) });
  const updateEditSlug = (v: string) => setEditForm((f) => ({ ...f, slug: v }));

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Manage Categories"
      class="max-w-2xl w-full"
    >
      <div class="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <Show when={mutationError()}>
          <div class="alert alert-error text-sm py-2 mb-2">
            <span>{mutationError()}</span>
          </div>
        </Show>
        <Show
          when={!data.loading}
          fallback={
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-lg" />
            </div>
          }
        >
          <For
            each={data()}
            fallback={
              <p class="text-base-content/60 text-sm">No categories yet.</p>
            }
          >
            {(cat) => (
              <div class="border border-base-300 rounded-lg overflow-hidden">
                {/* Category row */}
                <div class="flex items-center gap-2 px-3 py-2 bg-base-100">
                  <button
                    class="btn btn-xs btn-ghost"
                    onClick={() => toggle(cat.id)}
                  >
                    {expanded().has(cat.id) ? "▼" : "▶"}
                  </button>
                  <Show
                    when={editingId() === cat.id}
                    fallback={
                      <span class="flex-1 font-semibold">
                        <Show when={cat.icon}>
                          <span class="mr-1">{cat.icon}</span>
                        </Show>
                        {cat.name}
                      </span>
                    }
                  >
                    <EditForm
                      form={editForm()}
                      onNameInput={updateEditName}
                      onSlugInput={updateEditSlug}
                      onSave={() => saveEdit("categories", cat.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  </Show>
                  <Show when={editingId() !== cat.id}>
                    <ItemActions
                      id={cat.id}
                      onEdit={() => startEdit(cat)}
                      addLabel="Add subcategory"
                      onAdd={() =>
                        startAdd(
                          { type: "subcategory", categoryId: cat.id },
                          cat.id,
                        )
                      }
                      deletingId={deletingId}
                      onStartDelete={() => setDeletingId(cat.id)}
                      onDeleteConfirm={() => deleteItem("categories", cat.id)}
                      onDeleteCancel={() => setDeletingId(null)}
                    />
                  </Show>
                </div>

                {/* Subcategories (level 2) */}
                <Show when={expanded().has(cat.id)}>
                  <div class="px-4 py-2 space-y-1 bg-base-200/40">
                    <For
                      each={cat.subcategories.filter(
                        (s) => !s.parentSubcategoryId,
                      )}
                    >
                      {(sub) => (
                        <div class="border border-base-200 rounded bg-base-100">
                          <div class="flex items-center gap-2 px-2 py-1">
                            <button
                              class="btn btn-xs btn-ghost"
                              onClick={() => toggle(sub.id)}
                            >
                              {expanded().has(sub.id) ? "▼" : "▶"}
                            </button>
                            <Show
                              when={editingId() === sub.id}
                              fallback={
                                <span class="flex-1 text-sm">{sub.name}</span>
                              }
                            >
                              <EditForm
                                form={editForm()}
                                onNameInput={updateEditName}
                                onSlugInput={updateEditSlug}
                                onSave={() => saveEdit("subcategories", sub.id)}
                                onCancel={() => setEditingId(null)}
                              />
                            </Show>
                            <Show when={editingId() !== sub.id}>
                              <ItemActions
                                id={sub.id}
                                onEdit={() => startEdit(sub)}
                                addLabel="Add sub-subcategory"
                                onAdd={() =>
                                  startAdd(
                                    {
                                      type: "subcategory",
                                      categoryId: cat.id,
                                      parentSubcategoryId: sub.id,
                                    },
                                    sub.id,
                                  )
                                }
                                deletingId={deletingId}
                                onStartDelete={() => setDeletingId(sub.id)}
                                onDeleteConfirm={() =>
                                  deleteItem("subcategories", sub.id)
                                }
                                onDeleteCancel={() => setDeletingId(null)}
                              />
                            </Show>
                          </div>

                          {/* Sub-subcategories (level 3) */}
                          <Show when={expanded().has(sub.id)}>
                            <div class="px-4 py-1 space-y-1 bg-base-200/40">
                              <For
                                each={cat.subcategories.filter(
                                  (s) => s.parentSubcategoryId === sub.id,
                                )}
                              >
                                {(subsub) => (
                                  <div class="flex items-center gap-2 px-2 py-1 border border-base-200 rounded bg-base-100">
                                    <Show
                                      when={editingId() === subsub.id}
                                      fallback={
                                        <span class="flex-1 text-sm">
                                          {subsub.name}
                                        </span>
                                      }
                                    >
                                      <EditForm
                                        form={editForm()}
                                        onNameInput={updateEditName}
                                        onSlugInput={updateEditSlug}
                                        onSave={() =>
                                          saveEdit("subcategories", subsub.id)
                                        }
                                        onCancel={() => setEditingId(null)}
                                      />
                                    </Show>
                                    <Show when={editingId() !== subsub.id}>
                                      <ItemActions
                                        id={subsub.id}
                                        onEdit={() => startEdit(subsub)}
                                        deletingId={deletingId}
                                        onStartDelete={() =>
                                          setDeletingId(subsub.id)
                                        }
                                        onDeleteConfirm={() =>
                                          deleteItem("subcategories", subsub.id)
                                        }
                                        onDeleteCancel={() =>
                                          setDeletingId(null)
                                        }
                                      />
                                    </Show>
                                  </div>
                                )}
                              </For>
                              <Show
                                when={
                                  addMode()?.type === "subcategory" &&
                                  (
                                    addMode() as {
                                      parentSubcategoryId?: string;
                                    }
                                  ).parentSubcategoryId === sub.id
                                }
                              >
                                <AddForm
                                  form={addForm()}
                                  label="Sub-subcategory name"
                                  onNameInput={updateAddName}
                                  onSlugInput={updateAddSlug}
                                  onSave={saveAdd}
                                  onCancel={() => setAddMode(null)}
                                />
                              </Show>
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>

                    {/* Add subcategory form */}
                    <Show
                      when={
                        addMode()?.type === "subcategory" &&
                        !(addMode() as { parentSubcategoryId?: string })
                          .parentSubcategoryId &&
                        (addMode() as { categoryId: string }).categoryId ===
                          cat.id
                      }
                    >
                      <AddForm
                        form={addForm()}
                        label="Subcategory name"
                        onNameInput={updateAddName}
                        onSlugInput={updateAddSlug}
                        onSave={saveAdd}
                        onCancel={() => setAddMode(null)}
                      />
                    </Show>
                  </div>
                </Show>
              </div>
            )}
          </For>

          {/* Add category form */}
          <Show when={addMode()?.type === "category"}>
            <AddForm
              form={addForm()}
              label="Category name"
              onNameInput={updateAddName}
              onSlugInput={updateAddSlug}
              onSave={saveAdd}
              onCancel={() => setAddMode(null)}
            />
          </Show>

          <button
            class="btn btn-sm btn-outline w-full mt-2"
            onClick={() => startAdd({ type: "category" })}
          >
            + Add Category
          </button>
        </Show>
      </div>
    </Modal>
  );
};
