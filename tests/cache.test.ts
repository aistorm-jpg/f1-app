import { describe, expect, test } from "bun:test";
import { loadCached, readEntry, type KeyValueStore } from "../src/data/cache.ts";

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("localStorage-cache", () => {
  test("frisk data hentes ikke igen", async () => {
    const store = new MemoryStore();
    let calls = 0;
    const first = await loadCached({
      store,
      key: "stilling",
      ttlMs: 1_000,
      now: 1_000,
      load: async () => {
        calls += 1;
        return { points: 10 };
      },
    });
    const second = await loadCached({
      store,
      key: "stilling",
      ttlMs: 1_000,
      now: 1_500,
      load: async () => {
        calls += 1;
        return { points: 99 };
      },
    });
    expect(first).toEqual({ points: 10 });
    expect(second).toEqual({ points: 10 });
    expect(calls).toBe(1);
  });

  test("gammel cache bruges når nettet fejler, og ny data gemmes når det virker", async () => {
    const store = new MemoryStore();
    await loadCached({
      store,
      key: "løb",
      ttlMs: 100,
      now: 0,
      load: async () => ["gammel"],
    });
    const stale = await loadCached({
      store,
      key: "løb",
      ttlMs: 100,
      now: 500,
      load: async () => {
        throw new Error("offline");
      },
    });
    expect(stale).toEqual(["gammel"]);
    const fresh = await loadCached({
      store,
      key: "løb",
      ttlMs: 100,
      now: 800,
      load: async () => ["ny"],
    });
    expect(fresh).toEqual(["ny"]);
    expect(readEntry<string[]>(store, "løb")?.data).toEqual(["ny"]);
  });

  test("ødelagt json og en fuld lagerplads stopper ikke et frisk kald", async () => {
    const broken = new MemoryStore();
    broken.setItem("x", "{");
    const value = await loadCached({
      store: broken,
      key: "x",
      ttlMs: 50,
      now: 10,
      load: async () => "ok",
    });
    expect(value).toBe("ok");

    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    await expect(
      loadCached({ store: full, key: "y", ttlMs: 50, now: 0, load: async () => 7 }),
    ).resolves.toBe(7);
  });

  test("uden cache og med fejl kastes fejlen videre", async () => {
    await expect(
      loadCached({
        store: null,
        key: "z",
        ttlMs: 50,
        now: 0,
        load: async () => {
          throw new Error("nede");
        },
      }),
    ).rejects.toThrow("nede");
  });
});
