import { describe, expect, it, vi } from "vitest";

import type { PrivateSteamPort, SteamLifetimeEvent } from "./privateSteam";
import { RunnerStateTracker, mapSteamActivity } from "./runnerState";

const runner = {
  runnerShortcutId: "42",
  runnerGameId64: "76561199000000042",
};

const makeSteam = (activity: Awaited<ReturnType<PrivateSteamPort["readActivity"]>>) => {
  const listeners = new Set<(event: SteamLifetimeEvent) => void>();
  const calls: string[] = [];
  const steam = {
    readActivity: vi.fn(async () => {
      calls.push("read");
      return activity;
    }),
    subscribeLifetime: vi.fn((listener: (event: SteamLifetimeEvent) => void) => {
      calls.push("subscribe");
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    runGame: vi.fn((gameId: string, appId: string) => {
      calls.push(`run:${gameId}:${appId}`);
    }),
  };
  return { steam: steam as Pick<PrivateSteamPort, "readActivity" | "subscribeLifetime" | "runGame">, listeners, calls };
};

describe("runner activity", () => {
  it.each([
    ["ReadyToLaunch", "inactive"],
    ["Launching", "active"],
    ["Running", "active"],
    ["Terminating", "active"],
    ["Other", "unknown"],
    [null, "unknown"],
  ] as const)("maps %s to %s", (steamState, expected) => {
    expect(mapSteamActivity(steamState)).toBe(expected);
  });

  it("publishes snapshots and only matching runner lifetime events", async () => {
    const { steam, listeners } = makeSteam("ReadyToLaunch");
    const tracker = new RunnerStateTracker(steam);
    const statuses: string[] = [];
    const unsubscribe = tracker.subscribe((status) => statuses.push(status));

    await tracker.attach(runner.runnerShortcutId);
    for (const listener of listeners) listener({ runnerShortcutId: "99", running: true });
    for (const listener of listeners) listener({ runnerShortcutId: "42", running: true });
    for (const listener of listeners) listener({ runnerShortcutId: "42", running: false });
    unsubscribe();
    for (const listener of listeners) listener({ runnerShortcutId: "42", running: true });

    expect(statuses).toEqual(["unknown", "inactive", "active", "inactive"]);
  });

  it.each(["Running", "Other", null] as const)(
    "does not launch from %s",
    async (activity) => {
      const { steam } = makeSteam(activity);
      const tracker = new RunnerStateTracker(steam);

      const result = await tracker.launch(runner, "1903340", 5);

      expect(result).toMatchObject({ accepted: false });
      expect(steam.runGame).not.toHaveBeenCalled();
    },
  );

  it("subscribes before rereading and launches opaque game ID with target AppID separately", async () => {
    const { steam, listeners, calls } = makeSteam("ReadyToLaunch");
    steam.runGame = vi.fn((gameId: string, appId: string) => {
      calls.push(`run:${gameId}:${appId}`);
      for (const listener of listeners) listener({ runnerShortcutId: "42", running: true });
    });
    const tracker = new RunnerStateTracker(steam);

    const result = await tracker.launch(runner, "1903340", 20);

    expect(result).toEqual({ accepted: true, activity: "active" });
    expect(calls.indexOf("subscribe")).toBeLessThan(calls.indexOf("read"));
    expect(steam.runGame).toHaveBeenCalledWith("76561199000000042", "1903340");
  });

  it("latches unknown after an accepted launch notification timeout", async () => {
    vi.useFakeTimers();
    const { steam } = makeSteam("ReadyToLaunch");
    const tracker = new RunnerStateTracker(steam);

    const firstPromise = tracker.launch(runner, "1903340", 10);
    await vi.advanceTimersByTimeAsync(10);
    const first = await firstPromise;
    const second = await tracker.launch(runner, "1903340", 10);

    expect(first).toEqual({ accepted: true, activity: "unknown" });
    expect(second).toEqual({ accepted: false, activity: "unknown", reason: "launch_unconfirmed" });
    expect(steam.runGame).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("maps read errors to unknown", async () => {
    const { steam } = makeSteam("ReadyToLaunch");
    steam.readActivity = vi.fn().mockRejectedValue(new Error("Steam failed"));
    const tracker = new RunnerStateTracker(steam);

    await expect(tracker.attach("42")).resolves.toBe("unknown");
    expect(tracker.activity).toBe("unknown");
  });
});
