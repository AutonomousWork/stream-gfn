import { describe, expect, it, vi } from "vitest";

import { createPrivateSteamAdapter } from "./privateSteam";

const makeSurface = () => {
  let lifetimeListener:
    | ((event: { unAppID?: unknown; bRunning?: unknown }) => void)
    | null = null;
  const details = {
    unAppID: 42,
    strDisplayName: "Stream GFN Runner",
    strShortcutExe: "/plugin/bin/gfn-launch",
    strShortcutStartDir: "/plugin",
    strLaunchOptions: "",
    strShortcutLaunchOptions: "",
    eDisplayStatus: 11,
  };
  const overview = {
    appid: 42,
    display_name: "Stream GFN Runner",
    gameid: "opaque-game-id",
    app_type: 1073741824,
  };
  const apps = {
    AddShortcut: vi.fn(async () => 42),
    RemoveShortcut: vi.fn(),
    RegisterForAppDetails: vi.fn((_id: number, callback: (value: object) => void) => {
      callback(details);
      return { unregister: vi.fn() };
    }),
    SetShortcutName: vi.fn(),
    SetShortcutExe: vi.fn(),
    SetShortcutStartDir: vi.fn(),
    SetAppLaunchOptions: vi.fn(),
    SetShortcutLaunchOptions: vi.fn(),
    RunGame: vi.fn(),
  };
  return {
    details,
    overview,
    source: {
      SteamClient: {
        Apps: apps,
        GameSessions: {
          RegisterForAppLifetimeNotifications: vi.fn((listener) => {
            lifetimeListener = listener;
            return { unregister: vi.fn() };
          }),
        },
      },
      appStore: { m_mapApps: new Map([[42, overview]]) },
      collectionStore: {
        deckDesktopApps: { allApps: [overview] },
        BIsHidden: vi.fn(() => true),
        SetAppsAsHidden: vi.fn(),
      },
    },
    apps,
    emitLifetime: (event: { unAppID?: unknown; bRunning?: unknown }) => {
      lifetimeListener?.(event);
    },
  };
};

describe("private Steam adapter", () => {
  it("returns an actionable diagnostic for each absent required capability", () => {
    const { source } = makeSurface();
    delete (source.SteamClient.Apps as Partial<typeof source.SteamClient.Apps>).RemoveShortcut;

    const result = createPrivateSteamAdapter(source);

    expect(result.diagnostic).toEqual({
      available: false,
      code: "missing_steam_client_apps_remove_shortcut",
      message: "Steam compatibility unavailable: SteamClient.Apps.RemoveShortcut is missing",
    });
    expect(result.port).toBeNull();
  });

  it("keeps shortcut IDs as strings at the boundary and rejects unsafe uint32 values", async () => {
    const { source } = makeSurface();
    const result = createPrivateSteamAdapter(source, { pollAttempts: 1, pollIntervalMs: 0 });
    expect(result.port).not.toBeNull();

    await expect(result.port?.getShortcut("42")).resolves.toMatchObject({
      runnerShortcutId: "42",
      runnerGameId64: "opaque-game-id",
    });
    await expect(result.port?.getShortcut("4294967296")).rejects.toThrow("safe uint32");
    await expect(result.port?.getShortcut("01")).rejects.toThrow("safe uint32");
  });

  it("uses the fixed library-details launch source without parsing opaque identity", () => {
    const { source, apps } = makeSurface();
    const result = createPrivateSteamAdapter(source);

    result.port?.runGame("not-a-number-but-opaque", "1903340");

    expect(apps.RunGame).toHaveBeenCalledWith("not-a-number-but-opaque", "1903340", -1, 100);
  });

  it("maps Decky's pinned display-status values and rejects the neighboring enum", async () => {
    const { source, details } = makeSurface();
    const result = createPrivateSteamAdapter(source, { detailsTimeoutMs: 5 });

    await expect(result.port?.readActivity("42")).resolves.toBe("ReadyToLaunch");
    details.eDisplayStatus = 10;
    await expect(result.port?.readActivity("42")).resolves.toBe("Other");
  });

  it("treats unAppID zero lifetime notifications as untrusted wakeups", () => {
    const { source, emitLifetime } = makeSurface();
    const result = createPrivateSteamAdapter(source);
    const listener = vi.fn();

    result.port?.subscribeLifetime(listener);
    emitLifetime({ unAppID: 0, bRunning: true });

    expect(listener).toHaveBeenCalledWith({ running: true });
  });

  it("fails closed for mismatched record IDs and non-boolean hidden state", async () => {
    const detailsMismatch = makeSurface();
    detailsMismatch.details.unAppID = 99;
    const detailsPort = createPrivateSteamAdapter(detailsMismatch.source, { detailsTimeoutMs: 5 });
    await expect(detailsPort.port?.getShortcut("42")).resolves.toBeNull();

    const overviewMismatch = makeSurface();
    overviewMismatch.overview.appid = 99;
    const overviewPort = createPrivateSteamAdapter(overviewMismatch.source);
    await expect(overviewPort.port?.getShortcut("42")).resolves.toBeNull();

    const hiddenMismatch = makeSurface();
    Object.defineProperty(hiddenMismatch.source.collectionStore, "BIsHidden", {
      value: vi.fn(() => "hidden"),
    });
    const hiddenPort = createPrivateSteamAdapter(hiddenMismatch.source);
    await expect(hiddenPort.port?.getShortcut("42")).rejects.toThrow(
      "hidden state is unreadable",
    );
  });
});
