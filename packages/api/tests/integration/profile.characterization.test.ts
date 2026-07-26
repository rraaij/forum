/*
 * Characterization tests for profile validation. Written in Phase 0 against
 * the pre-refactor route; still asserting the SAME accepted and rejected
 * VALUES now that the rules live in the ProfileEdit module (plan 5.4):
 * HTTP(S)/data-URL MIME types, decoded 2 MB image limit, 12-photo gallery
 * limit, text lengths, date validation, immutable username, replacement
 * semantics.
 *
 * Two things deliberately changed with the module, both recorded in the
 * plan's contract table: the method is PUT (replacement, not patch) and
 * failures use the standard { error: { code, message, field } } envelope.
 * The messages themselves are unchanged.
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

function put(path: string, body: unknown) {
  return app.request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: user.cookie },
    body: JSON.stringify(body),
  });
}

/** Failure messages moved into the envelope; the wording is unchanged. */
async function errorMessage(res: Response): Promise<string> {
  return (await res.json()).error.message;
}

beforeEach(async () => {
  await truncateAll();
  user = await signUpUser(app, "profile-owner");
});

afterAll(async () => {
  await closeTestSql();
});

describe("PUT /api/profile (replacement semantics)", () => {
  it("accepts a full valid profile and echoes the stored shape", async () => {
    const res = await put("/api/profile", {
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
    await put("/api/profile", {
      displayName: "Ramon",
      location: "NL",
      photoUrls: [],
    });
    const res = await put("/api/profile", { photoUrls: [] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBeNull();
    expect(body.location).toBeNull();
  });

  it("requires photoUrls to be an array on every update", async () => {
    const res = await put("/api/profile", { displayName: "Ramon" });
    expect(res.status).toBe(400);
    expect(await errorMessage(res)).toBe("Photos must be an array of images");
  });

  it("rejects more than 12 photos", async () => {
    const res = await put("/api/profile", {
      photoUrls: Array.from({ length: 13 }, () => TINY_PNG),
    });
    expect(res.status).toBe(400);
    expect(await errorMessage(res)).toBe(
      "A profile can contain up to 12 photos",
    );
  });

  it("validates date of birth format, validity, and future dates", async () => {
    for (const [dateOfBirth, message] of [
      ["01-04-1990", "Date of birth must use YYYY-MM-DD"],
      ["1990-02-30", "Date of birth is not a valid date"],
      ["2999-01-01", "Date of birth cannot be in the future"],
    ] as const) {
      const res = await put("/api/profile", { dateOfBirth, photoUrls: [] });
      expect(res.status).toBe(400);
      expect(await errorMessage(res)).toBe(message);
    }
  });

  it("enforces text lengths and http(s) website URLs", async () => {
    const longName = await put("/api/profile", {
      displayName: "x".repeat(81),
      photoUrls: [],
    });
    expect(longName.status).toBe(400);

    const badUrl = await put("/api/profile", {
      website: "ftp://example.com",
      photoUrls: [],
    });
    expect(badUrl.status).toBe(400);
    expect(await errorMessage(badUrl)).toBe(
      "Website must be a valid http(s) URL",
    );
  });

  it("username (Better Auth name) is not writable through the profile", async () => {
    const res = await put("/api/profile", {
      username: "new-name",
      name: "new-name",
      photoUrls: [],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("profile-owner");
  });
});

describe("PUT /api/profile/avatar", () => {
  it("accepts a small data URL and clears with null", async () => {
    const set = await put("/api/profile/avatar", { image: TINY_PNG });
    expect(set.status).toBe(200);
    expect((await set.json()).image).toBe(TINY_PNG);

    const clear = await put("/api/profile/avatar", { image: null });
    expect(clear.status).toBe(200);
    expect((await clear.json()).image).toBeNull();
  });

  it("keeps accepting existing http(s) avatar URLs", async () => {
    const res = await put("/api/profile/avatar", {
      image: "https://example.com/avatar.png",
    });
    expect(res.status).toBe(200);
    expect((await res.json()).image).toBe("https://example.com/avatar.png");
  });

  it("rejects non-image MIME types", async () => {
    const res = await put("/api/profile/avatar", {
      image: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    });
    expect(res.status).toBe(400);
    expect(await errorMessage(res)).toBe(
      "Avatar must be a JPEG, PNG, WebP, or GIF image selected from your device",
    );
  });

  it("rejects images over the decoded 2 MB limit", async () => {
    const res = await put("/api/profile/avatar", { image: OVERSIZED_PNG });
    expect(res.status).toBe(400);
    expect(await errorMessage(res)).toBe("Avatar must be no larger than 2 MB");
  });
});
