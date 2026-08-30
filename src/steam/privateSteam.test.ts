import { describe, expect, it, vi } from "vitest";

import { createPrivateSteamAdapter } from "./privateSteam";

const makeSurface = () => {
  const details = {
    unAppID: 42,
    strDisplayName: "Stream GFN Runner",
    strShortcutExe: "/plugin/bin/gfn-launch",
    strShortcutStartDir: "/plugin",
    strLaunchOptions: "",
    strShortcutLaunchOptions: "",
    eDisplayStatus: 10,
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
    source: {
      SteamClient: {
        Apps: apps,
        GameSessions: {
          RegisterForAppLifetimeNotifications: vi.fn(() => ({ unregister: vi.fn() })),
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
});
