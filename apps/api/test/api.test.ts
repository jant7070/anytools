import { randomUUID } from "node:crypto";
import { events } from "@anytools/db";
import { RESULT_FILE_TTL_SECONDS, VISITOR_COOKIE_NAME } from "@anytools/shared";
import {
  createFileKey,
  createStorageProvider,
  storageConfigFromEnv,
} from "@anytools/tools/storage";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestContext,
  newVisitor,
  obtainToken,
  type Cookies,
  type TestContext,
} from "./helpers.js";

async function multipartBody(file: Buffer, input: unknown) {
  const form = new FormData();
  form.set("input", JSON.stringify(input));
  form.set("file", new Blob([new Uint8Array(file)], { type: "image/png" }), "photo.png");
  const req = new Request("http://local", { method: "POST", body: form });
  return {
    payload: Buffer.from(await req.arrayBuffer()),
    contentType: req.headers.get("content-type")!,
  };
}

describe("API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  describe("visitor cookie", () => {
    it("issues a signed, httpOnly, SameSite=Lax cookie once", async () => {
      const res = await ctx.app.inject({ method: "GET", url: "/api/catalog/tools" });
      const cookie = res.cookies.find((c) => c.name === VISITOR_COOKIE_NAME);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });

      const again = await ctx.app.inject({
        method: "GET",
        url: "/api/catalog/tools",
        cookies: { [VISITOR_COOKIE_NAME]: cookie!.value },
      });
      expect(again.cookies.find((c) => c.name === VISITOR_COOKIE_NAME)).toBeUndefined();
    });

    it("does not set cookies on health checks", async () => {
      const res = await ctx.app.inject({ method: "GET", url: "/api/health" });
      expect(res.json()).toEqual({ status: "ok" });
      expect(res.cookies).toHaveLength(0);
    });
  });

  describe("catalog", () => {
    it("lists seeded tools in both locales", async () => {
      const es = (
        await ctx.app.inject({ method: "GET", url: "/api/catalog/tools?locale=es" })
      ).json();
      const en = (
        await ctx.app.inject({ method: "GET", url: "/api/catalog/tools?locale=en" })
      ).json();
      expect(es.tools).toHaveLength(10);
      expect(es.tools.find((t: { slug: string }) => t.slug === "password-generator").name).toBe(
        "Generador de contraseñas",
      );
      expect(en.tools.find((t: { slug: string }) => t.slug === "password-generator").name).toBe(
        "Password generator",
      );
    });

    it("returns tool details and 404 for unknown tools", async () => {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/catalog/tools/pixelate-image?locale=en",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        slug: "pixelate-image",
        runMode: "queue",
        category: { slug: "image" },
      });
      const missing = await ctx.app.inject({ method: "GET", url: "/api/catalog/tools/nope" });
      expect(missing.statusCode).toBe(404);
      expect(missing.json().error.code).toBe("not_found");
    });

    it("builds the home sections", async () => {
      const home = (
        await ctx.app.inject({ method: "GET", url: "/api/catalog/home?locale=es" })
      ).json();
      expect(home.featured.map((t: { slug: string }) => t.slug).sort()).toEqual([
        "password-generator",
        "pixelate-image",
      ]);
      // Empty categories are hidden: "development" has no seeded tools yet.
      expect(home.categories.map((c: { slug: string }) => c.slug)).toEqual([
        "image",
        "pdf",
        "security",
        "generators",
        "text",
      ]);
      expect(home.audiences.length).toBe(5);
      expect(home.newest.length).toBeGreaterThan(0);
      expect(home.popular).toEqual([]);
    });

    it("hides drafts when SHOW_DRAFT_TOOLS=false", async () => {
      const prod = await createTestContext({ env: { SHOW_DRAFT_TOOLS: "false" } });
      try {
        const res = await prod.app.inject({ method: "GET", url: "/api/catalog/tools" });
        expect(res.json().tools).toEqual([]);
      } finally {
        await prod.close();
      }
    });
  });

  describe("unlock/start", () => {
    it("rejects a failed Turnstile check", async () => {
      const cookies = await newVisitor(ctx.app);
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/unlock/start",
        cookies,
        payload: { toolSlug: "password-generator", turnstileToken: "bad" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("turnstile_failed");
    });

    it("rejects tools that are not implemented", async () => {
      const cookies = await newVisitor(ctx.app);
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/unlock/start",
        cookies,
        payload: { toolSlug: "merge-pdf", turnstileToken: "valid-turnstile-token" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("validates the request body", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/unlock/start",
        payload: { toolSlug: "../etc" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("validation_failed");
    });

    it("returns the dev provider config", async () => {
      const cookies = await newVisitor(ctx.app);
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/unlock/start",
        cookies,
        payload: { toolSlug: "password-generator", turnstileToken: "valid-turnstile-token" },
      });
      expect(res.json().ad).toEqual({ provider: "dev", countdownSeconds: 5 });
    });
  });

  describe("queue tools", () => {
    let cookies: Cookies;
    let token: string;

    beforeEach(async () => {
      cookies = await newVisitor(ctx.app);
      ({ token } = await obtainToken(ctx, cookies, "pixelate-image", 5000));
    });

    it("stores the upload, enqueues a job and lets only the owner read it", async () => {
      const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#f00" } })
        .png()
        .toBuffer();
      const { payload, contentType } = await multipartBody(png, { mode: "blur", intensity: 10 });
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/tools/pixelate-image/run",
        cookies,
        headers: { authorization: `Bearer ${token}`, "content-type": contentType },
        payload,
      });
      expect(res.statusCode).toBe(202);
      const { jobId } = res.json();

      const job = await ctx.queue.getJob(jobId);
      expect(job?.data).toMatchObject({
        toolSlug: "pixelate-image",
        input: { mode: "blur", intensity: 10 },
      });
      expect(job?.data.files[0]).toMatchObject({
        filename: "photo.png",
        contentType: "image/png",
        size: png.length,
      });

      const status = await ctx.app.inject({ method: "GET", url: `/api/jobs/${jobId}`, cookies });
      expect(status.json()).toMatchObject({ id: jobId, state: "queued" });

      const stranger = await newVisitor(ctx.app);
      expect(
        (await ctx.app.inject({ method: "GET", url: `/api/jobs/${jobId}`, cookies: stranger }))
          .statusCode,
      ).toBe(404);
      await job?.remove();
    });

    it("rejects JSON bodies and invalid input for queue tools", async () => {
      const json = await ctx.app.inject({
        method: "POST",
        url: "/api/tools/pixelate-image/run",
        cookies,
        headers: { authorization: `Bearer ${token}` },
        payload: { mode: "blur" },
      });
      expect(json.statusCode).toBe(415);

      const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } })
        .png()
        .toBuffer();
      const { payload, contentType } = await multipartBody(png, { mode: "explode" });
      const invalid = await ctx.app.inject({
        method: "POST",
        url: "/api/tools/pixelate-image/run",
        cookies,
        headers: { authorization: `Bearer ${token}`, "content-type": contentType },
        payload,
      });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json().error.code).toBe("validation_failed");
    });
  });

  describe("result files", () => {
    it("serves files only with a valid, unexpired signature", async () => {
      const storage = createStorageProvider(storageConfigFromEnv(ctx.env));
      const key = createFileKey("results");
      const expiresAt = new Date(Date.now() + RESULT_FILE_TTL_SECONDS * 1000);
      await storage.put({
        key,
        data: Buffer.from("result"),
        contentType: "text/plain",
        filename: "out.txt",
        expiresAt,
      });

      const url = await storage.getDownloadUrl(key, { filename: "out.txt", expiresAt });
      const ok = await ctx.app.inject({ method: "GET", url });
      expect(ok.statusCode).toBe(200);
      expect(ok.body).toBe("result");
      expect(ok.headers["content-disposition"]).toContain('filename="out.txt"');

      const tampered = await ctx.app.inject({
        method: "GET",
        url: url.replace(/sig=[^&]+/, "sig=forged"),
      });
      expect(tampered.statusCode).toBe(404);
      const other = await ctx.app.inject({
        method: "GET",
        url: url.replace(key.split("/")[1]!, randomUUID()),
      });
      expect(other.statusCode).toBe(404);
    });
  });

  describe("events", () => {
    const postEvents = (cookies: Cookies | undefined, list: unknown[]) =>
      ctx.app.inject({ method: "POST", url: "/api/events", cookies, payload: { events: list } });
    const popular = async () =>
      (await ctx.app.inject({ method: "GET", url: "/api/catalog/home?locale=es" }))
        .json()
        .popular.map((t: { slug: string }) => t.slug);

    it("stores a batch of events", async () => {
      const cookies = await newVisitor(ctx.app);
      const res = await postEvents(cookies, [
        { type: "page_view", props: { path: "/es", locale: "es" } },
        { type: "tool_click", toolSlug: "password-generator", props: { section: "featured" } },
        { type: "tool_used", toolSlug: "password-generator" },
      ]);
      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({ accepted: 3 });

      const rows = await ctx.db.select().from(events);
      expect(rows).toHaveLength(3);
      expect(rows.find((r) => r.type === "tool_click")?.props).toEqual({ section: "featured" });
      expect(rows.find((r) => r.type === "page_view")?.toolId).toBeNull();
    });

    it("ignores forged tool_used events in the most-used ranking", async () => {
      for (let i = 0; i < 5; i++) {
        await postEvents(undefined, [{ type: "tool_used", toolSlug: "word-counter" }]);
      }
      const cookies = await newVisitor(ctx.app);
      await postEvents(cookies, [{ type: "tool_used", toolSlug: "password-generator" }]);
      expect(await popular()).toEqual([]);
    });

    it("counts a use only after a server-confirmed run, once per visitor per day", async () => {
      const cookies = await newVisitor(ctx.app);
      const { token } = await obtainToken(ctx, cookies, "password-generator", 5000);
      const run = await ctx.app.inject({
        method: "POST",
        url: "/api/tools/password-generator/run",
        cookies,
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });
      expect(run.statusCode).toBe(200);

      await postEvents(cookies, [
        { type: "tool_used", toolSlug: "password-generator" },
        { type: "tool_used", toolSlug: "password-generator" },
      ]);
      expect(await popular()).toEqual(["password-generator"]);
    });

    it("rejects malformed events", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/events",
        payload: { events: [{ type: "evil" }] },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});

describe("abuse limits", () => {
  it("caps unlock sessions per IP per day", async () => {
    const ctx = await createTestContext({ env: { UNLOCK_MAX_PER_IP_PER_DAY: "2" } });
    try {
      await ctx.reset();
      const cookies = await newVisitor(ctx.app);
      const start = () =>
        ctx.app.inject({
          method: "POST",
          url: "/api/unlock/start",
          cookies,
          payload: { toolSlug: "password-generator", turnstileToken: "valid-turnstile-token" },
        });
      expect((await start()).statusCode).toBe(200);
      expect((await start()).statusCode).toBe(200);
      const third = await start();
      expect(third.statusCode).toBe(429);
      expect(third.json().error.code).toBe("rate_limited");
    } finally {
      await ctx.close();
    }
  });
});
