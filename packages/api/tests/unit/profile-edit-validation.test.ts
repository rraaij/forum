import { describe, expect, it, vi } from "vitest";
import { createProfileEdit } from "../../src/modules/profile-edit/commands";
import type { ProfileEditStore } from "../../src/modules/profile-edit/repository";

function storeStub(): ProfileEditStore {
  return {
    findUser: vi.fn(async () => null),
    updateUser: vi.fn(async () => null),
  };
}

describe("profile edit module validation", () => {
  it("validates replacement fields before persistence", async () => {
    const store = storeStub();
    const profile = createProfileEdit(store);

    await expect(
      profile.updateProfile({
        userId: "user",
        website: "javascript:alert(1)",
        photoUrls: [],
      }),
    ).rejects.toMatchObject({ field: "website" });
    await expect(
      profile.updateProfile({
        userId: "user",
        photoUrls: Array.from({ length: 13 }, () => "https://example.test/x"),
      }),
    ).rejects.toMatchObject({ field: "photoUrls" });
    expect(store.updateUser).not.toHaveBeenCalled();
  });

  it("validates avatar image policy before persistence", async () => {
    const store = storeStub();
    const profile = createProfileEdit(store);

    await expect(
      profile.updateAvatar({
        userId: "user",
        image: "data:text/plain;base64,SGVsbG8=",
      }),
    ).rejects.toMatchObject({ field: "image" });
    expect(store.updateUser).not.toHaveBeenCalled();
  });
});
