/*
 * Characterization tests: the CURRENT profile validation behavior, recorded
 * before the refactor. Plan section 5.4 keeps these rules (HTTP(S)/data-URL
 * MIME types, decoded 2 MB image limit, 12-photo gallery limit, text
 * lengths, date validation, immutable username, replacement semantics)
 * unless a test here proves a behavior accidental.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { signUpUser, type TestUser } from "../helpers/auth";
import { closeTestSql, truncateAll } from "../helpers/db";

const app = createApp();
let user: TestUser;

// Smallest valid PNG data URL (1x1 transparent pixel).
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Decodes to exactly 2 MiB + 1 byte: one byte over the limit.
const OVERSIZED_PNG = `data:image/png;base64,${"A".repeat(2_796_204)}`;

function patch(path: string, body: unknown) {
  return app.request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: user.cookie },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await truncateAll();
  user = await signUpUser(app, "profile-owner");
});

afterAll(async () => {
  await closeTestSql();
});

describe("PATCH /api/profile (replacement semantics)", () => {
  it("accepts a full valid profile and echoes the stored shape", async () => {
    const res = await patch("/api/profile", {
      displayName: "  Ramon  ",
      dateOfBirth: "1990-04-01",
      profileText: "Hello",
      image: TINY_PNG,
      location: "NL",
      website: "https://example.com/site",
      photoUrls: [TINY_PNG],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe("Ramon");
    expect(body.username).toBe("profile-owner");
    expect(body.photoUrls).toEqual([TINY_PNG]);
  });

  it("REPLACES the profile: omitted fields become null", async () => {
    await patch("/api/profile", {
      displayName: "Ramon",
      location: "NL",
      photoUrls: [],
    });
    const res = await patch("/api/profile", { photoUrls: [] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBeNull();
    expect(body.location).toBeNull();
  });

  it("requires photoUrls to be an array on every update", async () => {
    const res = await patch("/api/profile", { displayName: "Ramon" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Photos must be an array of images");
  });

  it("rejects more than 12 photos", async () => {
    const res = await patch("/api/profile", {
      photoUrls: Array.from({ length: 13 }, () => TINY_PNG),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "A profile can contain up to 12 photos",
    );
  });

  it("validates date of birth format, validity, and future dates", async () => {
    for (const [dateOfBirth, message] of [
      ["01-04-1990", "Date of birth must use YYYY-MM-DD"],
      ["1990-02-30", "Date of birth is not a valid date"],
      ["2999-01-01", "Date of birth cannot be in the future"],
    ] as const) {
      const res = await patch("/api/profile", { dateOfBirth, photoUrls: [] });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(message);
    }
  });

  it("enforces text lengths and http(s) website URLs", async () => {
    const longName = await patch("/api/profile", {
      displayName: "x".repeat(81),
      photoUrls: [],
    });
    expect(longName.status).toBe(400);

    const badUrl = await patch("/api/profile", {
      website: "ftp://example.com",
      photoUrls: [],
    });
    expect(badUrl.status).toBe(400);
    expect((await badUrl.json()).error).toBe(
      "Website must be a valid http(s) URL",
    );
  });

  it("username (Better Auth name) is not writable through the profile", async () => {
    const res = await patch("/api/profile", {
      username: "new-name",
      name: "new-name",
      photoUrls: [],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("profile-owner");
  });
});

describe("PATCH /api/profile/avatar", () => {
  it("accepts a small data URL and clears with null", async () => {
    const set = await patch("/api/profile/avatar", { image: TINY_PNG });
    expect(set.status).toBe(200);
    expect((await set.json()).image).toBe(TINY_PNG);

    const clear = await patch("/api/profile/avatar", { image: null });
    expect(clear.status).toBe(200);
    expect((await clear.json()).image).toBeNull();
  });

  it("keeps accepting existing http(s) avatar URLs", async () => {
    const res = await patch("/api/profile/avatar", {
      image: "https://example.com/avatar.png",
    });
    expect(res.status).toBe(200);
    expect((await res.json()).image).toBe("https://example.com/avatar.png");
  });

  it("rejects non-image MIME types", async () => {
    const res = await patch("/api/profile/avatar", {
      image: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "Avatar must be a JPEG, PNG, WebP, or GIF image selected from your device",
    );
  });

  it("rejects images over the decoded 2 MB limit", async () => {
    const res = await patch("/api/profile/avatar", { image: OVERSIZED_PNG });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Avatar must be no larger than 2 MB");
  });
});
