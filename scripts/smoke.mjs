// End-to-end smoke test against a running stack:
//   node scripts/smoke.mjs                         # pnpm dev (API on :4000, or via web on :3000)
//   node scripts/smoke.mjs http://localhost:8080   # docker-compose.full.yml
// Uses the dev ad provider and Cloudflare's Turnstile test keys (dummy token).
import { crc32, deflateSync } from "node:zlib";

const base = (process.argv[2] ?? "http://localhost:4000").replace(/\/$/, "");
const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
let cookie = "";

async function call(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) },
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return res;
}

async function json(path, init) {
  const res = await call(path, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function check(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function unlock(toolSlug) {
  const start = await json("/api/unlock/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toolSlug, turnstileToken: TURNSTILE_DUMMY_TOKEN }),
  });
  check(
    start.status === 200,
    `unlock/start ${toolSlug} (${start.status} ${JSON.stringify(start.body?.error ?? start.body?.ad)})`,
  );
  const early = await json(`/api/unlock/${start.body.sessionId}/status`);
  check(early.body.status === "pending", "token is not issued before the ad finishes");
  for (let i = 0; i < 30; i++) {
    const status = await json(`/api/unlock/${start.body.sessionId}/status`);
    if (status.body.status === "verified") return status.body.token;
    await sleep(Math.min(status.body.retryAfterMs ?? 1000, 1000));
  }
  check(false, "unlock verified in time");
}

const health = await json("/api/health");
check(health.status === 200, `API reachable at ${base}`);

const tools = await json("/api/catalog/tools?locale=es");
check(tools.body?.tools?.length > 0, `catalog lists ${tools.body?.tools?.length} tools`);

const denied = await json("/api/tools/password-generator/run", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
check(denied.status === 401, "running without an unlock is rejected");

const pwToken = await unlock("password-generator");
const pw = await json("/api/tools/password-generator/run", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${pwToken}` },
  body: JSON.stringify({ length: 24, symbols: true }),
});
check(pw.status === 200 && pw.body.result.passwords[0].length === 24, "password generated");

const wrongTool = await call("/api/tools/pixelate-image/run", {
  method: "POST",
  headers: { authorization: `Bearer ${pwToken}` },
  body: new FormData(),
});
check(wrongTool.status === 403, "a token for another tool is rejected");

/** Minimal RGB PNG encoder (no image library needed). */
function makePng(width, height) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
    return Buffer.concat([len, Buffer.from(type), data, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit, truecolor
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(0); // filter: none
    for (let x = 0; x < width; x++) rows.push((x * 37) % 256, (y * 53) % 256, ((x + y) * 19) % 256);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const png = makePng(64, 48);
const pxToken = await unlock("pixelate-image");
const form = new FormData();
form.set("input", JSON.stringify({ mode: "pixelate", intensity: 50 }));
form.set("file", new Blob([png], { type: "image/png" }), "smoke.png");
const run = await json("/api/tools/pixelate-image/run", {
  method: "POST",
  headers: { authorization: `Bearer ${pxToken}` },
  body: form,
});
check(
  run.status === 202,
  `pixelate job enqueued (${run.status} ${JSON.stringify(run.body?.error ?? "")})`,
);

let job;
for (let i = 0; i < 30; i++) {
  job = (await json(`/api/jobs/${run.body.jobId}`)).body;
  if (job.state === "completed" || job.state === "failed") break;
  await sleep(500);
}
check(job.state === "completed", `job completed (${job.state} ${JSON.stringify(job.error ?? "")})`);
const file = job.result.files[0];
const download = await fetch(file.url.startsWith("http") ? file.url : `${base}${file.url}`);
const bytes = Buffer.from(await download.arrayBuffer());
check(
  download.status === 200 && bytes.subarray(1, 4).toString() === "PNG",
  `result downloaded (${bytes.length} bytes)`,
);

console.log("\nSmoke test passed.");
