import { describe, expect, it, vi } from "vitest";

import type { BackendPort } from "../api";
import type {
  CapabilityDiagnostic,
  PrivateSteamPort,
  RunnerFingerprint,
  SteamLifetimeEvent,
  SteamShortcut,
} from "./privateSteam";
import {
  RUNNER_NAME,
  cleanupRunner,
  pathMatches,
  prepareRunner,
  RunnerService,
} from "./runnerShortcut";

const PATHS = {
  pluginRoot: "/home/deck/homebrew/plugins/stream-gfn",
  runnerPath: "/home/deck/homebrew/plugins/stream-gfn/bin/gfn-launch",
};

const exactRunner = (
  runnerShortcutId = "42",
  overrides: Partial<SteamShortcut> = {},
): SteamShortcut => ({
  runnerShortcutId,
  runnerGameId64: "76561199000000042",
  displayName: RUNNER_NAME,
  executablePath: PATHS.runnerPath,
  startDirectory: PATHS.pluginRoot,
  launchOptions: "",
  shortcutLaunchOptions: "",
  isNonSteamShortcut: true,
  hidden: true,
  ...overrides,
});

class FakeBackend implements BackendPort {
  paths = PATHS;
  savedId: string | null = null;
  saves: string[] = [];
  clears = 0;

  async getPluginPaths() {
    return this.paths;
  }

  async getGfnPreflight() {
    return { ready: true as const, code: "ready", message: "ready" };
  }

  async loadState() {
    return { schemaVersion: 1 as const, runnerShortcutId: this.savedId };
  }

  async saveState(runnerShortcutId: string) {
    this.savedId = runnerShortcutId;
    this.saves.push(runnerShortcutId);
    return { schemaVersion: 1 as const, runnerShortcutId };
  }

  async clearState() {
    this.savedId = null;
    this.clears += 1;
    return { schemaVersion: 1 as const, runnerShortcutId: null };
  }
}

class FakeSteam implements PrivateSteamPort {
  readonly diagnostic: CapabilityDiagnostic = {
    available: true,
    code: "ready",
    message: "ready",
  };
  shortcuts: SteamShortcut[] = [];
  calls: string[] = [];
  activity: "ReadyToLaunch" | "Launching" | "Running" | "Terminating" | "Other" | null =
    "ReadyToLaunch";
  configureFails = false;
  hideFails = false;
  inventoryFails = false;
  nextId = "77";
  nextGameId = "76561199000000077";
  lifetimeListeners = new Set<(event: SteamLifetimeEvent) => void>();

  async listShortcuts() {
    this.calls.push("list");
    if (this.inventoryFails) throw new Error("inventory unreadable");
    return this.shortcuts.map((shortcut) => ({ ...shortcut }));
  }

  async getShortcut(runnerShortcutId: string) {
    this.calls.push(`get:${runnerShortcutId}`);
    return this.shortcuts.find((shortcut) => shortcut.runnerShortcutId === runnerShortcutId) ?? null;
  }

  async addShortcut(fingerprint: RunnerFingerprint) {
    this.calls.push(
      `add:${fingerprint.displayName}:${fingerprint.executablePath}:${fingerprint.startDirectory}:${fingerprint.launchOptions}`,
    );
    this.shortcuts.push(
      exactRunner(this.nextId, {
        runnerGameId64: this.nextGameId,
        displayName: "incomplete",
        hidden: false,
      }),
    );
    return this.nextId;
  }

  async waitForOverview(runnerShortcutId: string, present: boolean) {
    this.calls.push(`overview:${runnerShortcutId}:${present}`);
    return this.shortcuts.some((item) => item.runnerShortcutId === runnerShortcutId) === present;
  }

  async configureShortcut(runnerShortcutId: string, fingerprint: RunnerFingerprint) {
    this.calls.push(`configure:${runnerShortcutId}`);
    const shortcut = this.shortcuts.find((item) => item.runnerShortcutId === runnerShortcutId);
    if (shortcut) {
      Object.assign(shortcut, {
        displayName: fingerprint.displayName,
        executablePath: fingerprint.executablePath,
        startDirectory: fingerprint.startDirectory,
        launchOptions: fingerprint.launchOptions,
        shortcutLaunchOptions: fingerprint.shortcutLaunchOptions,
      });
    }
    if (this.configureFails) throw new Error("configure failed");
  }

  async waitForFingerprint(runnerShortcutId: string, fingerprint: RunnerFingerprint) {
    this.calls.push(`fingerprint:${runnerShortcutId}`);
    const shortcut = await this.getShortcut(runnerShortcutId);
    if (
      shortcut?.displayName === fingerprint.displayName &&
      pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
      pathMatches(fingerprint.startDirectory, shortcut.startDirectory) &&
      shortcut.launchOptions === "" &&
      shortcut.shortcutLaunchOptions === "" &&
      shortcut.isNonSteamShortcut
    ) {
      return { ...shortcut };
    }
    return null;
  }

  async setHidden(runnerShortcutId: string, hidden: boolean) {
    this.calls.push(`hide:${runnerShortcutId}:${hidden}`);
    if (this.hideFails) return false;
    const shortcut = this.shortcuts.find((item) => item.runnerShortcutId === runnerShortcutId);
    if (shortcut) shortcut.hidden = hidden;
    return shortcut?.hidden === hidden;
  }

  async removeShortcut(runnerShortcutId: string) {
    this.calls.push(`remove:${runnerShortcutId}`);
    this.shortcuts = this.shortcuts.filter((item) => item.runnerShortcutId !== runnerShortcutId);
  }

  async waitForAbsence(runnerShortcutId: string) {
    this.calls.push(`absent:${runnerShortcutId}`);
    return !this.shortcuts.some((item) => item.runnerShortcutId === runnerShortcutId);
  }

  async readActivity() {
    return this.activity;
  }

  subscribeLifetime(listener: (event: SteamLifetimeEvent) => void) {
    this.calls.push("subscribe-lifetime");
    this.lifetimeListeners.add(listener);
    return () => this.lifetimeListeners.delete(listener);
  }

  runGame(runnerGameId64: string, targetSteamAppId: string) {
    this.calls.push(`run:${runnerGameId64}:${targetSteamAppId}`);
  }
}

describe("runner fingerprint and reconciliation", () => {
  it("accepts only a raw path or exactly one balanced outer quote pair", () => {
    expect(pathMatches(PATHS.runnerPath, PATHS.runnerPath)).toBe(true);
    expect(pathMatches(PATHS.runnerPath, `"${PATHS.runnerPath}"`)).toBe(true);
    expect(pathMatches(PATHS.runnerPath, `"${PATHS.runnerPath}`)).toBe(false);
    expect(pathMatches(PATHS.runnerPath, `${PATHS.runnerPath}"`)).toBe(false);
    expect(pathMatches(PATHS.runnerPath, `""${PATHS.runnerPath}""`)).toBe(false);
    expect(pathMatches(PATHS.runnerPath, `${PATHS.runnerPath} --flag`)).toBe(false);
  });

  it("reuses the sole fully verified saved runner without creation", async () => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    backend.savedId = "42";
    steam.shortcuts = [exactRunner()];

    const result = await prepareRunner(backend, steam);

    expect(result).toMatchObject({ ok: true, created: false, recovered: false });
    if (result.ok) expect(result.runner.runnerShortcutId).toBe("42");
    expect(steam.calls.some((call) => call.startsWith("add:"))).toBe(false);
    expect(backend.saves).toEqual([]);
  });

  it("accepts Steam's single outer quotes on both owned runner paths", async () => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    backend.savedId = "42";
    steam.shortcuts = [
      exactRunner("42", {
        executablePath: `"${PATHS.runnerPath}"`,
        startDirectory: `"${PATHS.pluginRoot}"`,
      }),
    ];

    const result = await prepareRunner(backend, steam);

    expect(result).toMatchObject({ ok: true, created: false, recovered: false });
    expect(steam.calls.some((call) => call.startsWith("add:"))).toBe(false);
  });

  it("recovers one exact runner from stale state and persists its string ID", async () => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    backend.savedId = "41";
    steam.shortcuts = [exactRunner("42")];

    const result = await prepareRunner(backend, steam);

    expect(result).toMatchObject({ ok: true, created: false, recovered: true });
    expect(backend.saves).toEqual(["42"]);
    expect(typeof backend.savedId).toBe("string");
  });

  it.each([
    ["name-only", exactRunner("8", { executablePath: "/foreign/runner" })],
    ["path-only", exactRunner("8", { displayName: "Foreign runner" })],
    ["partial", exactRunner("8", { startDirectory: "/foreign", hidden: false })],
  ])("fails closed for a %s near-match", async (_label, nearMatch) => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    steam.shortcuts = [nearMatch];

    const result = await prepareRunner(backend, steam);

    expect(result).toMatchObject({ ok: false, code: "ambiguous_runner" });
    expect(steam.calls.some((call) => call.startsWith("add:"))).toBe(false);
    expect(steam.calls.some((call) => call.startsWith("remove:"))).toBe(false);
  });

  it("creates, corrects, verifies, hides, uniquely reverifies, and persists one runner", async () => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();

    const first = await prepareRunner(backend, steam);
    const second = await prepareRunner(backend, steam);

    expect(first).toMatchObject({ ok: true, created: true, recovered: false });
    expect(second).toMatchObject({ ok: true, created: false, recovered: false });
    expect(steam.shortcuts).toEqual([exactRunner("77", { runnerGameId64: steam.nextGameId })]);
    expect(backend.saves).toEqual(["77"]);
    expect(steam.calls.filter((call) => call.startsWith("add:"))).toEqual([
      `add:${RUNNER_NAME}:${PATHS.runnerPath}:${PATHS.pluginRoot}:`,
    ]);
    expect(steam.calls.indexOf("overview:77:true")).toBeLessThan(
      steam.calls.indexOf("configure:77"),
    );
    expect(steam.calls.indexOf("configure:77")).toBeLessThan(
      steam.calls.indexOf("fingerprint:77"),
    );
    expect(steam.calls.indexOf("fingerprint:77")).toBeLessThan(
      steam.calls.indexOf("hide:77:true"),
    );
  });

  it("fails closed for duplicate exact runners or unreadable inventory", async () => {
    const backend = new FakeBackend();
    const duplicateSteam = new FakeSteam();
    duplicateSteam.shortcuts = [exactRunner("42"), exactRunner("43")];
    const unreadableSteam = new FakeSteam();
    unreadableSteam.inventoryFails = true;

    await expect(prepareRunner(backend, duplicateSteam)).resolves.toMatchObject({
      ok: false,
      code: "ambiguous_runner",
    });
    await expect(prepareRunner(backend, unreadableSteam)).resolves.toMatchObject({
      ok: false,
      code: "inventory_unreadable",
    });
    expect(duplicateSteam.calls.some((call) => call.startsWith("add:"))).toBe(false);
    expect(unreadableSteam.calls.some((call) => call.startsWith("add:"))).toBe(false);
  });

  it("fails without mutation when capabilities are absent", async () => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    Object.defineProperty(steam, "diagnostic", {
      value: { available: false, code: "missing_remove_shortcut", message: "missing RemoveShortcut" },
    });

    await expect(prepareRunner(backend, steam)).resolves.toMatchObject({
      ok: false,
      code: "capability_unavailable",
    });
    expect(steam.calls).toEqual([]);
  });

  it("rolls back only this attempt's returned candidate when it still exactly verifies", async () => {
    const backend = new FakeBackend();
    const exactFailure = new FakeSteam();
    exactFailure.configureFails = true;

    const exactResult = await prepareRunner(backend, exactFailure);

    expect(exactResult).toMatchObject({ ok: false, code: "create_failed" });
    expect(exactFailure.calls).toContain("remove:77");

    const foreignFailure = new FakeSteam();
    foreignFailure.configureFails = true;
    foreignFailure.waitForFingerprint = vi.fn().mockResolvedValue(null);
    await prepareRunner(backend, foreignFailure);
    expect(foreignFailure.calls).not.toContain("remove:77");
  });
});

describe("verified cleanup", () => {
  it.each(["Running", null] as const)("rejects %s activity without removal", async (activity) => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    backend.savedId = "42";
    steam.shortcuts = [exactRunner()];
    steam.activity = activity;

    const result = await cleanupRunner(backend, steam);

    expect(result).toMatchObject({ ok: false, code: "runner_not_inactive" });
    expect(steam.calls).not.toContain("remove:42");
    expect(backend.clears).toBe(0);
  });

  it("reverifies, removes, confirms overview/details absence, then clears state", async () => {
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    backend.savedId = "42";
    steam.shortcuts = [exactRunner()];

    const result = await cleanupRunner(backend, steam);

    expect(result).toEqual({ ok: true, outcome: "removed" });
    expect(steam.calls).toContain("remove:42");
    expect(steam.calls).toContain("absent:42");
    expect(backend.clears).toBe(1);
    expect(steam.calls.indexOf("remove:42")).toBeLessThan(steam.calls.indexOf("absent:42"));
  });

  it("treats no owned runner as safe but leaves foreign or ambiguous state untouched", async () => {
    const emptyBackend = new FakeBackend();
    const emptySteam = new FakeSteam();
    emptyBackend.savedId = "999";
    await expect(cleanupRunner(emptyBackend, emptySteam)).resolves.toEqual({
      ok: true,
      outcome: "no_owned_runner",
    });
    expect(emptyBackend.clears).toBe(1);

    const foreignBackend = new FakeBackend();
    const foreignSteam = new FakeSteam();
    foreignBackend.savedId = "8";
    foreignSteam.shortcuts = [exactRunner("8", { executablePath: "/foreign" })];
    await expect(cleanupRunner(foreignBackend, foreignSteam)).resolves.toMatchObject({
      ok: false,
      code: "ambiguous_runner",
    });
    expect(foreignBackend.clears).toBe(0);
    expect(foreignSteam.calls).not.toContain("remove:8");
  });
});

describe("runtime service", () => {
  it("keeps an accepted notification timeout unknown and not retry-ready", async () => {
    vi.useFakeTimers();
    const backend = new FakeBackend();
    const steam = new FakeSteam();
    backend.savedId = "42";
    steam.shortcuts = [exactRunner()];
    const service = new RunnerService(backend, steam, 10);

    const firstPromise = service.launch();
    await vi.advanceTimersByTimeAsync(10);
    const first = await firstPromise;
    const second = await service.launch();

    expect(first).toMatchObject({ ok: true, accepted: true, activity: "unknown" });
    expect(second).toMatchObject({
      ok: true,
      accepted: false,
      activity: "unknown",
      reason: "launch_unconfirmed",
    });
    expect(steam.calls.filter((call) => call.startsWith("run:"))).toEqual([
      "run:76561199000000042:1903340",
    ]);
    vi.useRealTimers();
  });
});
