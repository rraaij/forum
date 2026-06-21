import { Modal } from "@forum/ui";
import type { Component } from "solid-js";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { apiFetch } from "@/lib/api";
import type { Category } from "@/types/forum";

type InlineForm = {
  name: string;
  slug: string;
  abbreviation: string;
  description: string;
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toAbbreviation(name: string): string {
  /*
   * Category codes are displayed in compact header areas, so normalize the
   * generated default to uppercase and enforce the database's five-character
   * limit before the value ever reaches the API.
   */
  return name.trimStart().slice(0, 5).toUpperCase();
}

// ── Inline edit form ──────────────────────────────────────

function EditForm(props: {
  form: InlineForm;
  onNameInput: (v: string) => void;
  onSlugInput: (v: string) => void;
  onAbbreviationInput: (v: string) => void;
  onDescriptionInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="min-w-0 flex-1 space-y-3 rounded-sm border border-base-300 bg-base-200/35 p-3">
      {/*
       * Name receives the flexible column, while slug and abbreviation stay
       * compact. At small widths the grid wraps naturally for usability.
       */}
      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem]">
        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Name</span>
          <input
            class="input input-sm input-bordered w-full"
            value={props.form.name}
            onInput={(event) => props.onNameInput(event.currentTarget.value)}
            placeholder="Name"
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Slug</span>
          <input
            class="input input-sm input-bordered w-full"
            value={props.form.slug}
            onInput={(event) => props.onSlugInput(event.currentTarget.value)}
            placeholder="slug"
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Abbreviation</span>
          <input
            class="input input-sm input-bordered w-full uppercase"
            value={props.form.abbreviation}
            onInput={(event) =>
              props.onAbbreviationInput(event.currentTarget.value)
            }
            placeholder="ABCDE"
            maxlength={5}
            required
          />
        </label>
      </div>

      <label class="form-control gap-1">
        <span class="label-text text-xs font-semibold">Description</span>
        <textarea
          class="textarea textarea-bordered min-h-20 w-full"
          value={props.form.description}
          onInput={(event) =>
            props.onDescriptionInput(event.currentTarget.value)
          }
          placeholder="Describe what belongs in this forum section"
        />
      </label>

      <div class="flex justify-end gap-2">
        <button class="btn btn-sm btn-primary" onClick={props.onSave}>
          Save
        </button>
        <button class="btn btn-sm btn-ghost" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Inline add form ───────────────────────────────────────

function AddForm(props: {
  form: InlineForm;
  label: string;
  onNameInput: (v: string) => void;
  onSlugInput: (v: string) => void;
  onAbbreviationInput: (v: string) => void;
  onDescriptionInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="mt-2 space-y-3 rounded-sm border border-info/30 bg-info/5 p-3">
      {/* New categories and subcategories share the same persisted metadata. */}
      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem]">
        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Name</span>
          <input
            class="input input-sm input-bordered w-full"
            value={props.form.name}
            onInput={(event) => props.onNameInput(event.currentTarget.value)}
            placeholder={props.label}
            autofocus
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Slug</span>
          <input
            class="input input-sm input-bordered w-full"
            value={props.form.slug}
            onInput={(event) => props.onSlugInput(event.currentTarget.value)}
            placeholder="slug"
          />
        </label>

        <label class="form-control gap-1">
          <span class="label-text text-xs font-semibold">Abbreviation</span>
          <input
            class="input input-sm input-bordered w-full uppercase"
            value={props.form.abbreviation}
            onInput={(event) =>
              props.onAbbreviationInput(event.currentTarget.value)
            }
            placeholder="ABCDE"
            maxlength={5}
            required
          />
        </label>
      </div>

      <label class="form-control gap-1">
        <span class="label-text text-xs font-semibold">Description</span>
        <textarea
          class="textarea textarea-bordered min-h-20 w-full"
          value={props.form.description}
          onInput={(event) =>
            props.onDescriptionInput(event.currentTarget.value)
          }
          placeholder="Describe what belongs in this forum section"
        />
        <span class="text-[11px] text-base-content/55">
          The abbreviation defaults to the first 5 name characters.
        </span>
      </label>

      <div class="flex justify-end gap-2">
        <button class="btn btn-sm btn-primary" onClick={props.onSave}>
          Add
        </button>
        <button class="btn btn-sm btn-ghost" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
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

  /*
   * Management order is intentionally independent from public sortOrder.
   * Copying before sort keeps resource data immutable and guarantees the
   * dialog always presents a predictable alphabetical category list.
   */
  const sortedCategories = createMemo(() =>
    [...(data() ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, {
        sensitivity: "base",
      }),
    ),
  );

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
    abbreviation: "",
    description: "",
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
    abbreviation: "",
    description: "",
  });
  const [addAbbreviationEdited, setAddAbbreviationEdited] = createSignal(false);

  // Delete confirm state
  const [deletingId, setDeletingId] = createSignal<string | null>(null);

  // Mutation error state
  const [mutationError, setMutationError] = createSignal<string | null>(null);

  // Record only successful server mutations. Editing form fields or canceling
  // an action should not cause an unnecessary page reload when the dialog
  // closes.
  const [hasChanges, setHasChanges] = createSignal(false);

  // ── Handlers ─────────────────────────────────────────────

  const closeDialog = () => {
    const shouldReload = hasChanges();

    // Reset before notifying the parent because closing the native dialog can
    // emit another close event. This prevents scheduling duplicate reloads.
    setHasChanges(false);
    props.onClose();

    // A full reload refreshes every route loader and shared navigation element,
    // so renamed, added, or removed categories are immediately visible.
    if (shouldReload) {
      window.location.reload();
    }
  };

  const startEdit = (item: {
    id: string;
    name: string;
    slug: string;
    abbreviation?: string;
    description?: string | null;
  }) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      slug: item.slug,
      abbreviation: item.abbreviation ?? "",
      description: item.description ?? "",
    });
  };

  const saveEdit = async (
    endpoint: "categories" | "subcategories",
    id: string,
  ) => {
    const f = editForm();
    try {
      await apiFetch(`/admin/${endpoint}/${id}`, {
        method: "PUT",
        // Every forum level now owns the same editable metadata fields.
        body: JSON.stringify({
          name: f.name,
          slug: f.slug,
          abbreviation: f.abbreviation,
          description: f.description,
        }),
      });
      setEditingId(null);
      setMutationError(null);
      setHasChanges(true);
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
          body: JSON.stringify({
            name: f.name,
            slug: f.slug,
            abbreviation: f.abbreviation,
            description: f.description,
          }),
        });
      } else {
        await apiFetch("/admin/subcategories", {
          method: "POST",
          body: JSON.stringify({
            categoryId: mode.categoryId,
            parentSubcategoryId: mode.parentSubcategoryId ?? null,
            name: f.name,
            slug: f.slug,
            abbreviation: f.abbreviation,
            description: f.description,
          }),
        });
      }
      setAddMode(null);
      setAddForm({
        name: "",
        slug: "",
        abbreviation: "",
        description: "",
      });
      setAddAbbreviationEdited(false);
      setMutationError(null);
      setHasChanges(true);
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
      setHasChanges(true);
      refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to delete");
      setDeletingId(null);
    }
  };

  const startAdd = (mode: AddMode, expandId?: string) => {
    setAddMode(mode);
    setAddForm({
      name: "",
      slug: "",
      abbreviation: "",
      description: "",
    });
    setAddAbbreviationEdited(false);
    if (expandId) {
      setExpanded((prev) => new Set([...prev, expandId]));
    }
  };

  const updateAddName = (v: string) =>
    setAddForm((form) => ({
      ...form,
      name: v,
      slug: toSlug(v),
      // Continue deriving the default until the user intentionally changes it.
      abbreviation: addAbbreviationEdited()
        ? form.abbreviation
        : toAbbreviation(v),
    }));
  const updateAddSlug = (v: string) => setAddForm((f) => ({ ...f, slug: v }));
  const updateAddAbbreviation = (v: string) => {
    setAddAbbreviationEdited(true);
    setAddForm((form) => ({
      ...form,
      abbreviation: v.toUpperCase().slice(0, 5),
    }));
  };
  const updateAddDescription = (v: string) =>
    setAddForm((form) => ({ ...form, description: v }));
  const updateEditName = (v: string) =>
    setEditForm((form) => ({ ...form, name: v, slug: toSlug(v) }));
  const updateEditSlug = (v: string) => setEditForm((f) => ({ ...f, slug: v }));
  const updateEditAbbreviation = (v: string) =>
    setEditForm((form) => ({
      ...form,
      abbreviation: v.toUpperCase().slice(0, 5),
    }));
  const updateEditDescription = (v: string) =>
    setEditForm((form) => ({ ...form, description: v }));

  return (
    <Modal
      open={props.open}
      onClose={closeDialog}
      title="Manage Categories"
      class="max-w-3xl w-full"
    >
      <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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
            each={sortedCategories()}
            fallback={
              <p class="text-base-content/60 text-sm">No categories yet.</p>
            }
          >
            {(cat) => (
              <div class="border border-base-300 rounded-sm overflow-hidden">
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
                        {/* Show the saved code beside the category so admins
                            can verify it without opening the edit form. */}
                        <span class="badge badge-ghost badge-sm ml-2 font-mono">
                          {cat.abbreviation}
                        </span>
                      </span>
                    }
                  >
                    <EditForm
                      form={editForm()}
                      onNameInput={updateEditName}
                      onSlugInput={updateEditSlug}
                      onAbbreviationInput={updateEditAbbreviation}
                      onDescriptionInput={updateEditDescription}
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
                                <span class="flex-1 text-sm">
                                  {sub.name}
                                  <span class="badge badge-ghost badge-xs ml-2 font-mono">
                                    {sub.abbreviation}
                                  </span>
                                </span>
                              }
                            >
                              <EditForm
                                form={editForm()}
                                onNameInput={updateEditName}
                                onSlugInput={updateEditSlug}
                                onAbbreviationInput={updateEditAbbreviation}
                                onDescriptionInput={updateEditDescription}
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
                                          <span class="badge badge-ghost badge-xs ml-2 font-mono">
                                            {subsub.abbreviation}
                                          </span>
                                        </span>
                                      }
                                    >
                                      <EditForm
                                        form={editForm()}
                                        onNameInput={updateEditName}
                                        onSlugInput={updateEditSlug}
                                        onAbbreviationInput={
                                          updateEditAbbreviation
                                        }
                                        onDescriptionInput={
                                          updateEditDescription
                                        }
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
                                  onAbbreviationInput={updateAddAbbreviation}
                                  onDescriptionInput={updateAddDescription}
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
                        onAbbreviationInput={updateAddAbbreviation}
                        onDescriptionInput={updateAddDescription}
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
              onAbbreviationInput={updateAddAbbreviation}
              onDescriptionInput={updateAddDescription}
              onSave={saveAdd}
              onCancel={() => setAddMode(null)}
            />
          </Show>
        </Show>
      </div>

      {/* Keep creation as the leading action and dismissal in the conventional
          trailing position so the two controls are easy to distinguish. */}
      <div class="mt-4 flex items-center justify-between border-t border-base-200 pt-4">
        <Show when={!data.loading}>
          <button
            class="btn btn-info btn-sm"
            onClick={() => startAdd({ type: "category" })}
          >
            + Add Category
          </button>
        </Show>
        <button class="btn btn-ghost btn-sm" onClick={closeDialog}>
          Close
        </button>
      </div>
    </Modal>
  );
};
