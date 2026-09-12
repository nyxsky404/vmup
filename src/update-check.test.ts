import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cacheIsStale,
  CHECK_EVERY_MS,
  beginUpdateCheck,
  isInteractiveTty,
  noticeFromCache,
  printUpdateNotice,
  skipUpdateCheck,
  type UpdateCache,
} from "./update-check.js";

const HOUR = 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function cache(partial: Partial<UpdateCache> & { latest: string }): UpdateCache {
  return {
    checkedAt: NOW,
    ...partial,
  };
}

describe("skipUpdateCheck", () => {
  it("skips VMUP_NO_UPDATE_CHECK and CI", () => {
    assert.equal(skipUpdateCheck({}), false);
    assert.equal(skipUpdateCheck({ VMUP_NO_UPDATE_CHECK: "1" }), true);
    assert.equal(skipUpdateCheck({ VMUP_NO_UPDATE_CHECK: "0" }), false);
    assert.equal(skipUpdateCheck({ CI: "true" }), true);
    assert.equal(skipUpdateCheck({ CI: "1" }), true);
    assert.equal(skipUpdateCheck({ CI: "false" }), false);
  });
});

describe("isInteractiveTty", () => {
  it("requires both stdout and stderr", () => {
    assert.equal(isInteractiveTty(true, true), true);
    assert.equal(isInteractiveTty(true, false), false);
    assert.equal(isInteractiveTty(false, true), false);
    assert.equal(isInteractiveTty(false, false), false);
  });
});

describe("cacheIsStale", () => {
  it("is stale when missing or older than the interval", () => {
    assert.equal(cacheIsStale(null, NOW), true);
    assert.equal(cacheIsStale(cache({ latest: "0.3.2", checkedAt: NOW - 1000 }), NOW), false);
    assert.equal(
      cacheIsStale(cache({ latest: "0.3.2", checkedAt: NOW - CHECK_EVERY_MS - 1 }), NOW),
      true,
    );
  });
});

describe("noticeFromCache", () => {
  it("is silent with no cache or when already current", () => {
    assert.equal(noticeFromCache(null, "0.2.1", NOW), null);
    assert.equal(noticeFromCache(cache({ latest: "" }), "0.2.1", NOW), null);
    assert.equal(noticeFromCache(cache({ latest: "0.2.1" }), "0.2.1", NOW), null);
    assert.equal(noticeFromCache(cache({ latest: "0.2.0" }), "0.2.1", NOW), null);
  });

  it("prints a newer cached version", () => {
    assert.equal(noticeFromCache(cache({ latest: "0.3.2" }), "0.2.1", NOW), "0.3.2");
  });

  it("reminds at most once per interval while still behind", () => {
    assert.equal(
      noticeFromCache(
        cache({ latest: "0.3.1", notifiedAt: NOW - HOUR, notifiedVersion: "0.3.1" }),
        "0.2.1",
        NOW,
      ),
      null,
    );
    assert.equal(
      noticeFromCache(
        cache({
          latest: "0.3.2",
          notifiedAt: NOW - CHECK_EVERY_MS - 1,
          notifiedVersion: "0.3.1",
        }),
        "0.2.1",
        NOW,
      ),
      "0.3.2",
    );
  });
});

describe("beginUpdateCheck", () => {
  it("returns null and does not spawn when skipped", async () => {
    let spawned = 0;
    const latest = await beginUpdateCheck({
      env: { VMUP_NO_UPDATE_CHECK: "1" },
      stdoutTTY: true,
      stderrTTY: true,
      spawnCheck: () => {
        spawned += 1;
      },
    });
    assert.equal(latest, null);
    assert.equal(spawned, 0);
  });

  it("returns null and does not spawn when not a TTY", async () => {
    let spawned = 0;
    const latest = await beginUpdateCheck({
      env: {},
      stdoutTTY: true,
      stderrTTY: false,
      spawnCheck: () => {
        spawned += 1;
      },
    });
    assert.equal(latest, null);
    assert.equal(spawned, 0);
  });

  it("prints from cache without spawning when the check is fresh", async () => {
    let spawned = 0;
    let writes = 0;
    const stored = cache({ latest: "0.3.2", checkedAt: NOW - HOUR });
    const latest = await beginUpdateCheck({
      env: {},
      stdoutTTY: true,
      stderrTTY: true,
      now: () => NOW,
      currentVersion: "0.2.1",
      readCache: async () => stored,
      writeCache: async () => {
        writes += 1;
      },
      spawnCheck: () => {
        spawned += 1;
      },
    });
    assert.equal(latest, "0.3.2");
    assert.equal(spawned, 0);
    assert.equal(writes, 0);
  });

  it("stamps and spawns when stale, and still prints a known newer version", async () => {
    let spawned = 0;
    const writes: UpdateCache[] = [];
    const stored = cache({
      latest: "0.3.1",
      checkedAt: NOW - CHECK_EVERY_MS - 1,
      notifiedAt: NOW - CHECK_EVERY_MS - 1,
    });
    const latest = await beginUpdateCheck({
      env: {},
      stdoutTTY: true,
      stderrTTY: true,
      now: () => NOW,
      currentVersion: "0.2.1",
      readCache: async () => stored,
      writeCache: async (c) => {
        writes.push(c);
      },
      spawnCheck: () => {
        spawned += 1;
      },
    });
    assert.equal(latest, "0.3.1");
    assert.equal(spawned, 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.checkedAt, NOW);
    assert.equal(writes[0]?.latest, "0.3.1");
  });

  it("spawns on first run but does not print until cache has a newer version", async () => {
    let spawned = 0;
    const latest = await beginUpdateCheck({
      env: {},
      stdoutTTY: true,
      stderrTTY: true,
      now: () => NOW,
      currentVersion: "0.2.1",
      readCache: async () => null,
      writeCache: async () => undefined,
      spawnCheck: () => {
        spawned += 1;
      },
    });
    assert.equal(latest, null);
    assert.equal(spawned, 1);
  });
});

describe("printUpdateNotice", () => {
  it("does not print or mark notified for --json", async () => {
    let writes = 0;
    await printUpdateNotice(Promise.resolve("0.3.2"), true, {
      env: {},
      stdoutTTY: true,
      stderrTTY: true,
      writeCache: async () => {
        writes += 1;
      },
    });
    assert.equal(writes, 0);
  });

  it("records notifiedAt after printing", async () => {
    const writes: UpdateCache[] = [];
    const stored = cache({ latest: "0.3.2", checkedAt: NOW - HOUR });
    const err = console.error;
    console.error = () => undefined;
    try {
      await printUpdateNotice(Promise.resolve("0.3.2"), false, {
        env: {},
        stdoutTTY: true,
        stderrTTY: true,
        now: () => NOW,
        readCache: async () => stored,
        writeCache: async (c) => {
          writes.push({ ...c });
        },
      });
    } finally {
      console.error = err;
    }
    assert.equal(writes[0]?.notifiedAt, NOW);
    assert.equal(writes[0]?.notifiedVersion, "0.3.2");
    assert.equal(writes[0]?.latest, "0.3.2");
  });
});
