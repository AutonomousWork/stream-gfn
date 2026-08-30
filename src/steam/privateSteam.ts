export const STEAM_SHORTCUT_APP_TYPE = 1073741824;
export const LIBRARY_DETAILS_LAUNCH_SOURCE = 100;

const UINT32_MAX = 0xffff_ffff;

export type SteamActivitySnapshot =
  | "ReadyToLaunch"
  | "Launching"
  | "Running"
  | "Terminating"
  | "Other"
  | null;

export interface RunnerFingerprint {
  displayName: string;
  executablePath: string;
  startDirectory: string;
  launchOptions: string;
  shortcutLaunchOptions: string;
}

export interface SteamShortcut extends RunnerFingerprint {
  runnerShortcutId: string;
  runnerGameId64: string;
  isNonSteamShortcut: boolean;
  hidden: boolean;
}

export interface SteamLifetimeEvent {
  running: boolean;
}

export type CapabilityDiagnostic =
  | { available: true; code: "ready"; message: string }
  | { available: false; code: string; message: string };

export interface PrivateSteamPort {
  readonly diagnostic: CapabilityDiagnostic;
  listShortcuts(): Promise<SteamShortcut[]>;
  getShortcut(runnerShortcutId: string): Promise<SteamShortcut | null>;
  addShortcut(fingerprint: RunnerFingerprint): Promise<string>;
  waitForOverview(runnerShortcutId: string, present: boolean): Promise<boolean>;
  configureShortcut(
    runnerShortcutId: string,
    fingerprint: RunnerFingerprint,
  ): Promise<void>;
  waitForFingerprint(
    runnerShortcutId: string,
    fingerprint: RunnerFingerprint,
  ): Promise<SteamShortcut | null>;
  setHidden(runnerShortcutId: string, hidden: boolean): Promise<boolean>;
  removeShortcut(runnerShortcutId: string): Promise<void>;
  waitForAbsence(runnerShortcutId: string): Promise<boolean>;
  readActivity(runnerShortcutId: string): Promise<SteamActivitySnapshot>;
  subscribeLifetime(listener: (event: SteamLifetimeEvent) => void): () => void;
  runGame(runnerGameId64: string, targetSteamAppId: string): void;
}

export class PrivateSteamError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PrivateSteamError";
  }
}

interface Unregisterable {
  unregister(): void;
}

interface AppDetailsSurface {
  unAppID: number;
  strDisplayName: string;
  strShortcutExe: string;
  strShortcutStartDir: string;
  strLaunchOptions: string;
  strShortcutLaunchOptions: string;
  eDisplayStatus: unknown;
}

interface OverviewSurface {
  appid: number;
  display_name: string;
  gameid: string;
  app_type: number;
}

interface AppsSurface {
  AddShortcut(name: string, executable: string, directory: string, options: string): Promise<number>;
  RemoveShortcut(appId: number): void;
  RegisterForAppDetails(
    appId: number,
    callback: (details: Partial<AppDetailsSurface>) => void,
  ): Unregisterable;
  SetShortcutName(appId: number, name: string): void;
  SetShortcutExe(appId: number, executable: string): void;
  SetShortcutStartDir(appId: number, directory: string): void;
  SetAppLaunchOptions(appId: number, options: string): void;
  SetShortcutLaunchOptions(appId: number, options: string): void;
  RunGame(gameId: string, options: string, index: number, source: number): void;
}

interface SteamSurface {
  SteamClient: {
    Apps: AppsSurface;
    GameSessions: {
      RegisterForAppLifetimeNotifications(
        listener: (event: { unAppID?: unknown; bRunning?: unknown }) => void,
      ): Unregisterable;
    };
  };
  appStore: {
    m_mapApps: { get(appId: number): Partial<OverviewSurface> | undefined };
  };
  collectionStore: {
    deckDesktopApps: { allApps: Iterable<Partial<OverviewSurface>> };
    BIsHidden(appId: number): unknown;
    SetAppsAsHidden(appIds: number[], hidden: boolean): void;
  };
}

export interface PrivateSteamTiming {
  pollAttempts: number;
  pollIntervalMs: number;
  detailsTimeoutMs: number;
}

const DEFAULT_TIMING: PrivateSteamTiming = {
  pollAttempts: 4,
  pollIntervalMs: 250,
  detailsTimeoutMs: 1_000,
};

const requiredFunctions = [
  ["SteamClient.Apps.AddShortcut", ["SteamClient", "Apps", "AddShortcut"]],
  ["SteamClient.Apps.RemoveShortcut", ["SteamClient", "Apps", "RemoveShortcut"]],
  ["SteamClient.Apps.RegisterForAppDetails", ["SteamClient", "Apps", "RegisterForAppDetails"]],
  ["SteamClient.Apps.SetShortcutName", ["SteamClient", "Apps", "SetShortcutName"]],
  ["SteamClient.Apps.SetShortcutExe", ["SteamClient", "Apps", "SetShortcutExe"]],
  ["SteamClient.Apps.SetShortcutStartDir", ["SteamClient", "Apps", "SetShortcutStartDir"]],
  ["SteamClient.Apps.SetAppLaunchOptions", ["SteamClient", "Apps", "SetAppLaunchOptions"]],
  [
    "SteamClient.Apps.SetShortcutLaunchOptions",
    ["SteamClient", "Apps", "SetShortcutLaunchOptions"],
  ],
  ["SteamClient.Apps.RunGame", ["SteamClient", "Apps", "RunGame"]],
  [
    "SteamClient.GameSessions.RegisterForAppLifetimeNotifications",
    ["SteamClient", "GameSessions", "RegisterForAppLifetimeNotifications"],
  ],
  ["appStore.m_mapApps.get", ["appStore", "m_mapApps", "get"]],
  ["collectionStore.BIsHidden", ["collectionStore", "BIsHidden"]],
  ["collectionStore.SetAppsAsHidden", ["collectionStore", "SetAppsAsHidden"]],
] as const;

const diagnosticCode = (label: string): string =>
  `missing_${label.replace(/\./g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}`;

const getNested = (source: unknown, path: readonly string[]): unknown => {
  let value = source;
  for (const part of path) {
    if (typeof value !== "object" || value === null || !(part in value)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
};

export const diagnosePrivateSteam = (source: unknown): CapabilityDiagnostic => {
  for (const [label, path] of requiredFunctions) {
    if (typeof getNested(source, path) !== "function") {
      return {
        available: false,
        code: diagnosticCode(label),
        message: `Steam compatibility unavailable: ${label} is missing`,
      };
    }
  }

  const allApps = getNested(source, ["collectionStore", "deckDesktopApps", "allApps"]);
  if (
    allApps === undefined ||
    allApps === null ||
    typeof (allApps as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== "function"
  ) {
    return {
      available: false,
      code: "missing_collection_store_inventory",
      message:
        "Steam compatibility unavailable: collectionStore.deckDesktopApps.allApps is missing",
    };
  }

  return { available: true, code: "ready", message: "Steam compatibility ready" };
};

export const parseShortcutId = (value: string): number => {
  if (!/^(?:[1-9][0-9]*)$/.test(value)) {
    throw new PrivateSteamError("invalid_shortcut_id", "runner shortcut ID is not a safe uint32");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > UINT32_MAX) {
    throw new PrivateSteamError("invalid_shortcut_id", "runner shortcut ID is not a safe uint32");
  }
  return parsed;
};

const shortcutIdFromNumber = (value: number): string => {
  if (!Number.isSafeInteger(value) || value <= 0 || value > UINT32_MAX) {
    throw new PrivateSteamError(
      "invalid_assigned_shortcut_id",
      "Steam returned a shortcut ID outside safe uint32",
    );
  }
  return String(value);
};

const sleep = (durationMs: number): Promise<void> =>
  durationMs <= 0
    ? Promise.resolve()
    : new Promise((resolve) => {
        setTimeout(resolve, durationMs);
      });

const isDetailsFor = (
  value: Partial<AppDetailsSurface>,
  appId: number,
): value is AppDetailsSurface =>
  value.unAppID === appId &&
  typeof value.strDisplayName === "string" &&
  typeof value.strShortcutExe === "string" &&
  typeof value.strShortcutStartDir === "string" &&
  typeof value.strLaunchOptions === "string" &&
  typeof value.strShortcutLaunchOptions === "string";

const isOverviewFor = (
  value: Partial<OverviewSurface> | undefined,
  appId: number,
): value is OverviewSurface =>
  value !== undefined &&
  value.appid === appId &&
  typeof value.display_name === "string" &&
  typeof value.gameid === "string" &&
  value.gameid.length > 0 &&
  typeof value.app_type === "number";

export const pathMatches = (expected: string, actual: string): boolean =>
  actual === expected || actual === `"${expected}"`;

const hasFingerprint = (shortcut: SteamShortcut, fingerprint: RunnerFingerprint): boolean =>
  shortcut.displayName === fingerprint.displayName &&
  pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
  pathMatches(fingerprint.startDirectory, shortcut.startDirectory) &&
  shortcut.launchOptions === fingerprint.launchOptions &&
  shortcut.shortcutLaunchOptions === fingerprint.shortcutLaunchOptions &&
  shortcut.isNonSteamShortcut;

class BrowserPrivateSteamPort implements PrivateSteamPort {
  readonly diagnostic: CapabilityDiagnostic = {
    available: true,
    code: "ready",
    message: "Steam compatibility ready",
  };

  constructor(
    private readonly surface: SteamSurface,
    private readonly timing: PrivateSteamTiming,
  ) {}

  async listShortcuts(): Promise<SteamShortcut[]> {
    let inventory: Partial<OverviewSurface>[];
    try {
      inventory = Array.from(this.surface.collectionStore.deckDesktopApps.allApps);
    } catch (error) {
      throw new PrivateSteamError("inventory_unreadable", "Steam shortcut inventory is unreadable");
    }

    const ids = inventory.map((item) => {
      if (!Number.isInteger(item.appid)) {
        throw new PrivateSteamError("inventory_unreadable", "Steam shortcut inventory has an invalid ID");
      }
      return shortcutIdFromNumber(item.appid as number);
    });

    const shortcuts = await Promise.all(ids.map((id) => this.getShortcut(id)));
    if (shortcuts.some((shortcut) => shortcut === null)) {
      throw new PrivateSteamError(
        "inventory_unreadable",
        "Steam shortcut inventory details are unreadable",
      );
    }
    return shortcuts as SteamShortcut[];
  }

  async getShortcut(runnerShortcutId: string): Promise<SteamShortcut | null> {
    const appId = parseShortcutId(runnerShortcutId);
    const overview = this.readOverview(appId);
    if (overview === null) return null;
    const details = await this.readDetails(appId);
    if (details === null) return null;

    let hidden: unknown;
    try {
      hidden = this.surface.collectionStore.BIsHidden(appId);
    } catch (error) {
      throw new PrivateSteamError("hidden_state_unreadable", "Steam hidden state is unreadable");
    }
    if (typeof hidden !== "boolean") {
      throw new PrivateSteamError("hidden_state_unreadable", "Steam hidden state is unreadable");
    }

    return {
      runnerShortcutId,
      runnerGameId64: overview.gameid,
      displayName: details.strDisplayName,
      executablePath: details.strShortcutExe,
      startDirectory: details.strShortcutStartDir,
      launchOptions: details.strLaunchOptions,
      shortcutLaunchOptions: details.strShortcutLaunchOptions,
      isNonSteamShortcut: overview.app_type === STEAM_SHORTCUT_APP_TYPE,
      hidden,
    };
  }

  async addShortcut(fingerprint: RunnerFingerprint): Promise<string> {
    const id = await this.surface.SteamClient.Apps.AddShortcut(
      fingerprint.displayName,
      fingerprint.executablePath,
      "",
      "",
    );
    return shortcutIdFromNumber(id);
  }

  async waitForOverview(runnerShortcutId: string, present: boolean): Promise<boolean> {
    const appId = parseShortcutId(runnerShortcutId);
    return this.poll(() => (this.readOverview(appId) !== null) === present);
  }

  async configureShortcut(
    runnerShortcutId: string,
    fingerprint: RunnerFingerprint,
  ): Promise<void> {
    const appId = parseShortcutId(runnerShortcutId);
    const apps = this.surface.SteamClient.Apps;
    apps.SetShortcutName(appId, fingerprint.displayName);
    apps.SetShortcutExe(appId, fingerprint.executablePath);
    apps.SetShortcutStartDir(appId, fingerprint.startDirectory);
    apps.SetAppLaunchOptions(appId, fingerprint.launchOptions);
    apps.SetShortcutLaunchOptions(appId, fingerprint.shortcutLaunchOptions);
  }

  async waitForFingerprint(
    runnerShortcutId: string,
    fingerprint: RunnerFingerprint,
  ): Promise<SteamShortcut | null> {
    let match: SteamShortcut | null = null;
    const matched = await this.poll(async () => {
      match = await this.getShortcut(runnerShortcutId);
      return match !== null && hasFingerprint(match, fingerprint);
    });
    return matched ? match : null;
  }

  async setHidden(runnerShortcutId: string, hidden: boolean): Promise<boolean> {
    const appId = parseShortcutId(runnerShortcutId);
    try {
      if (this.surface.collectionStore.BIsHidden(appId) !== hidden) {
        this.surface.collectionStore.SetAppsAsHidden([appId], hidden);
      }
      return this.poll(() => this.surface.collectionStore.BIsHidden(appId) === hidden);
    } catch (error) {
      return false;
    }
  }

  async removeShortcut(runnerShortcutId: string): Promise<void> {
    this.surface.SteamClient.Apps.RemoveShortcut(parseShortcutId(runnerShortcutId));
  }

  async waitForAbsence(runnerShortcutId: string): Promise<boolean> {
    const appId = parseShortcutId(runnerShortcutId);
    return this.poll(async () => {
      const overviewAbsent = this.readOverview(appId) === null;
      const detailsAbsent = (await this.readDetails(appId)) === null;
      return overviewAbsent && detailsAbsent;
    });
  }

  async readActivity(runnerShortcutId: string): Promise<SteamActivitySnapshot> {
    const details = await this.readDetails(parseShortcutId(runnerShortcutId));
    if (details === null) return null;
    switch (details.eDisplayStatus) {
      case "ReadyToLaunch":
      case 11:
        return "ReadyToLaunch";
      case "Launching":
      case 1:
        return "Launching";
      case "Running":
      case 4:
        return "Running";
      case "Terminating":
      case 36:
        return "Terminating";
      default:
        return "Other";
    }
  }

  subscribeLifetime(listener: (event: SteamLifetimeEvent) => void): () => void {
    const unregisterable =
      this.surface.SteamClient.GameSessions.RegisterForAppLifetimeNotifications((event) => {
        if (typeof event.bRunning !== "boolean") return;
        // Steam reports unAppID=0 for non-Steam shortcuts. Treat the event only as
        // a wakeup; RunnerStateTracker confirms the exact runner through AppDetails.
        listener({ running: event.bRunning });
      });
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      unregisterable.unregister();
    };
  }

  runGame(runnerGameId64: string, targetSteamAppId: string): void {
    this.surface.SteamClient.Apps.RunGame(
      runnerGameId64,
      targetSteamAppId,
      -1,
      LIBRARY_DETAILS_LAUNCH_SOURCE,
    );
  }

  private readOverview(appId: number): OverviewSurface | null {
    const overview = this.surface.appStore.m_mapApps.get(appId);
    return isOverviewFor(overview, appId) ? overview : null;
  }

  private async readDetails(appId: number): Promise<AppDetailsSurface | null> {
    return new Promise((resolve) => {
      let completed = false;
      let unregisterable: Unregisterable | undefined;
      const timeout = setTimeout(() => finish(null), this.timing.detailsTimeoutMs);
      const finish = (value: AppDetailsSurface | null): void => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        unregisterable?.unregister();
        resolve(value);
      };

      try {
        unregisterable = this.surface.SteamClient.Apps.RegisterForAppDetails(appId, (details) => {
          finish(isDetailsFor(details, appId) ? details : null);
        });
        if (completed) unregisterable.unregister();
      } catch (_error) {
        finish(null);
      }
    });
  }

  private async poll(predicate: () => boolean | Promise<boolean>): Promise<boolean> {
    for (let attempt = 0; attempt < this.timing.pollAttempts; attempt += 1) {
      if (await predicate()) return true;
      if (attempt + 1 < this.timing.pollAttempts) await sleep(this.timing.pollIntervalMs);
    }
    return false;
  }
}

export interface PrivateSteamAdapterResult {
  diagnostic: CapabilityDiagnostic;
  port: PrivateSteamPort | null;
}

export const createPrivateSteamAdapter = (
  source: unknown = globalThis,
  timing: Partial<PrivateSteamTiming> = {},
): PrivateSteamAdapterResult => {
  const diagnostic = diagnosePrivateSteam(source);
  if (!diagnostic.available) return { diagnostic, port: null };
  const resolvedTiming = { ...DEFAULT_TIMING, ...timing };
  return {
    diagnostic,
    port: new BrowserPrivateSteamPort(source as SteamSurface, resolvedTiming),
  };
};
