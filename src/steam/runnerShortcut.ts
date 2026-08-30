import type { BackendPort, PluginPaths } from "../api";
import type {
  CapabilityDiagnostic,
  PrivateSteamPort,
  PrivateSteamTiming,
  RunnerFingerprint,
  SteamShortcut,
} from "./privateSteam";
import { createPrivateSteamAdapter, pathMatches } from "./privateSteam";
import {
  type RunnerActivity,
  type RunnerLaunchResult,
  RunnerStateTracker,
  mapSteamActivity,
} from "./runnerState";

export const RUNNER_NAME = "Stream GFN Runner";
export const EXPEDITION_33_APP_ID = "1903340";
export const DEFAULT_LAUNCH_NOTIFICATION_TIMEOUT_MS = 10_000;

export interface PreparedRunner {
  runnerShortcutId: string;
  runnerGameId64: string;
}

export type PrepareRunnerResult =
  | {
      ok: true;
      runner: PreparedRunner;
      created: boolean;
      recovered: boolean;
    }
  | { ok: false; code: string; diagnostic: string };

export type CleanupRunnerResult =
  | { ok: true; outcome: "removed" | "no_owned_runner" }
  | { ok: false; code: string; diagnostic: string };

interface InventoryInspection {
  exact: SteamShortcut[];
  near: SteamShortcut[];
}

type PrepareFailure = Extract<PrepareRunnerResult, { ok: false }>;

const fingerprintFor = (paths: PluginPaths): RunnerFingerprint => ({
  displayName: RUNNER_NAME,
  executablePath: paths.runnerPath,
  startDirectory: paths.pluginRoot,
  launchOptions: "",
  shortcutLaunchOptions: "",
});

const hasExactFingerprint = (
  shortcut: SteamShortcut,
  fingerprint: RunnerFingerprint,
): boolean =>
  shortcut.displayName === fingerprint.displayName &&
  pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
  pathMatches(fingerprint.startDirectory, shortcut.startDirectory) &&
  shortcut.launchOptions === "" &&
  shortcut.shortcutLaunchOptions === "" &&
  shortcut.isNonSteamShortcut;

const isNearMatch = (shortcut: SteamShortcut, fingerprint: RunnerFingerprint): boolean =>
  !hasExactFingerprint(shortcut, fingerprint) &&
  (shortcut.displayName === fingerprint.displayName ||
    pathMatches(fingerprint.executablePath, shortcut.executablePath) ||
    pathMatches(fingerprint.startDirectory, shortcut.startDirectory));

const isRepairableOwnedRunner = (
  shortcut: SteamShortcut,
  fingerprint: RunnerFingerprint,
): boolean =>
  shortcut.displayName === fingerprint.displayName &&
  pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
  (shortcut.startDirectory === "" ||
    pathMatches(fingerprint.startDirectory, shortcut.startDirectory)) &&
  shortcut.launchOptions === "" &&
  shortcut.shortcutLaunchOptions === "" &&
  shortcut.isNonSteamShortcut &&
  shortcut.runnerGameId64.length > 0;

const inspectInventory = (
  inventory: SteamShortcut[],
  fingerprint: RunnerFingerprint,
): InventoryInspection => ({
  exact: inventory.filter((shortcut) => hasExactFingerprint(shortcut, fingerprint)),
  near: inventory.filter((shortcut) => isNearMatch(shortcut, fingerprint)),
});

const failure = (code: string, diagnostic: string): PrepareFailure => ({
  ok: false,
  code,
  diagnostic,
});

const identityOf = (shortcut: SteamShortcut): PreparedRunner => ({
  runnerShortcutId: shortcut.runnerShortcutId,
  runnerGameId64: shortcut.runnerGameId64,
});

const repairableOwnedCandidate = (
  inspection: InventoryInspection,
  fingerprint: RunnerFingerprint,
): SteamShortcut | null => {
  if (inspection.exact.length === 1 && inspection.near.length === 0) {
    const exact = inspection.exact[0];
    return !exact.hidden && isRepairableOwnedRunner(exact, fingerprint) ? exact : null;
  }
  if (inspection.exact.length === 0 && inspection.near.length === 1) {
    const near = inspection.near[0];
    return isRepairableOwnedRunner(near, fingerprint) ? near : null;
  }
  return null;
};

const repairOwnedRunner = async (
  backend: BackendPort,
  steam: PrivateSteamPort,
  candidate: SteamShortcut,
  fingerprint: RunnerFingerprint,
  canContinue: () => boolean,
): Promise<PrepareRunnerResult> => {
  try {
    if (!canContinue()) throw new Error("Runner preparation was cancelled");
    await steam.configureShortcut(candidate.runnerShortcutId, fingerprint);
    const configured = await steam.waitForFingerprint(candidate.runnerShortcutId, fingerprint);
    if (configured === null) throw new Error("Steam did not repair the runner fingerprint");
    if (!(await steam.setHidden(candidate.runnerShortcutId, true))) {
      throw new Error("Steam did not verify the repaired runner as hidden");
    }

    const finalInventory = inspectInventory(await steam.listShortcuts(), fingerprint);
    if (!canContinue()) throw new Error("Runner preparation was cancelled");
    const repaired = finalInventory.exact[0];
    if (
      finalInventory.near.length > 0 ||
      finalInventory.exact.length !== 1 ||
      repaired?.runnerShortcutId !== candidate.runnerShortcutId ||
      repaired.runnerGameId64.length === 0 ||
      !repaired.hidden
    ) {
      throw new Error("Steam did not verify one unique repaired runner");
    }

    await backend.saveState(repaired.runnerShortcutId);
    return {
      ok: true,
      runner: identityOf(repaired),
      created: false,
      recovered: true,
    };
  } catch (error) {
    return failure(
      "repair_failed",
      error instanceof Error ? error.message : "Runner repair failed",
    );
  }
};

const requireUnambiguousOwned = (
  inspection: InventoryInspection,
): { runner: SteamShortcut | null; error: PrepareFailure | null } => {
  if (inspection.exact.length > 1 || inspection.near.length > 0) {
    return {
      runner: null,
      error: failure(
        "ambiguous_runner",
        "Steam contains duplicate or partial Stream GFN runner matches; nothing was changed",
      ),
    };
  }
  const runner = inspection.exact[0] ?? null;
  if (runner !== null && !runner.hidden) {
    return {
      runner: null,
      error: failure(
        "hidden_state_mismatch",
        "The exact Stream GFN runner is not verifiably hidden; nothing was changed",
      ),
    };
  }
  return { runner, error: null };
};

const rollbackCreatedRunner = async (
  steam: PrivateSteamPort,
  runnerShortcutId: string,
  fingerprint: RunnerFingerprint,
): Promise<void> => {
  try {
    const verified = await steam.waitForFingerprint(runnerShortcutId, fingerprint);
    if (verified === null || !hasExactFingerprint(verified, fingerprint)) return;
    await steam.removeShortcut(runnerShortcutId);
    await steam.waitForAbsence(runnerShortcutId);
  } catch (_error) {
    // Best effort only: never broaden rollback from this attempt's exact candidate.
  }
};

export const prepareRunner = async (
  backend: BackendPort,
  steam: PrivateSteamPort,
  canContinue: () => boolean = () => true,
): Promise<PrepareRunnerResult> => {
  if (!steam.diagnostic.available) {
    return failure("capability_unavailable", steam.diagnostic.message);
  }

  let paths: PluginPaths;
  let savedId: string | null;
  let inventory: SteamShortcut[];
  try {
    const [resolvedPaths, state, resolvedInventory] = await Promise.all([
      backend.getPluginPaths(),
      backend.loadState(),
      steam.listShortcuts(),
    ]);
    paths = resolvedPaths;
    savedId = state.runnerShortcutId;
    inventory = resolvedInventory;
  } catch (error) {
    return failure(
      "inventory_unreadable",
      error instanceof Error ? error.message : "Steam shortcut inventory is unreadable",
    );
  }
  if (!canContinue()) return failure("operation_cancelled", "Runner preparation was cancelled");

  const fingerprint = fingerprintFor(paths);
  const inspection = inspectInventory(inventory, fingerprint);
  const repairable = repairableOwnedCandidate(inspection, fingerprint);
  if (repairable !== null) {
    return repairOwnedRunner(backend, steam, repairable, fingerprint, canContinue);
  }
  const resolved = requireUnambiguousOwned(inspection);
  if (resolved.error !== null) return resolved.error;

  if (savedId !== null) {
    try {
      const saved = await steam.getShortcut(savedId);
      if (
        saved !== null &&
        hasExactFingerprint(saved, fingerprint) &&
        saved.hidden &&
        resolved.runner?.runnerShortcutId === saved.runnerShortcutId
      ) {
        if (!canContinue()) {
          return failure("operation_cancelled", "Runner preparation was cancelled");
        }
        return { ok: true, runner: identityOf(saved), created: false, recovered: false };
      }
    } catch (error) {
      return failure(
        "invalid_saved_runner",
        error instanceof Error ? error.message : "Saved runner identity is invalid",
      );
    }
  }

  if (resolved.runner !== null) {
    try {
      if (!canContinue()) {
        return failure("operation_cancelled", "Runner preparation was cancelled");
      }
      await backend.saveState(resolved.runner.runnerShortcutId);
    } catch (error) {
      return failure(
        "state_save_failed",
        error instanceof Error ? error.message : "Runner state could not be saved",
      );
    }
    return {
      ok: true,
      runner: identityOf(resolved.runner),
      created: false,
      recovered: true,
    };
  }

  let createdId: string | null = null;
  try {
    if (!canContinue()) throw new Error("Runner preparation was cancelled");
    createdId = await steam.addShortcut(fingerprint);
    if (!canContinue()) throw new Error("Runner preparation was cancelled");
    if (!(await steam.waitForOverview(createdId, true))) {
      throw new Error("Steam did not publish the new runner overview");
    }

    await steam.configureShortcut(createdId, fingerprint);
    if (!canContinue()) throw new Error("Runner preparation was cancelled");
    const configured = await steam.waitForFingerprint(createdId, fingerprint);
    if (configured === null) throw new Error("Steam did not retain the exact runner fingerprint");

    if (!(await steam.setHidden(createdId, true))) {
      throw new Error("Steam did not verify the runner as hidden");
    }

    const hidden = await steam.getShortcut(createdId);
    if (hidden === null || !hasExactFingerprint(hidden, fingerprint) || !hidden.hidden) {
      throw new Error("Steam did not reverify the hidden runner fingerprint");
    }

    const finalInventory = inspectInventory(await steam.listShortcuts(), fingerprint);
    if (!canContinue()) throw new Error("Runner preparation was cancelled");
    if (
      finalInventory.near.length > 0 ||
      finalInventory.exact.length !== 1 ||
      finalInventory.exact[0]?.runnerShortcutId !== createdId ||
      finalInventory.exact[0]?.runnerGameId64.length === 0 ||
      !finalInventory.exact[0]?.hidden
    ) {
      throw new Error("Steam did not verify one unique hidden runner");
    }

    await backend.saveState(createdId);
    return {
      ok: true,
      runner: identityOf(finalInventory.exact[0]),
      created: true,
      recovered: false,
    };
  } catch (error) {
    if (createdId !== null) await rollbackCreatedRunner(steam, createdId, fingerprint);
    return failure(
      "create_failed",
      error instanceof Error ? error.message : "Runner creation failed",
    );
  }
};

export const cleanupRunner = async (
  backend: BackendPort,
  steam: PrivateSteamPort,
): Promise<CleanupRunnerResult> => {
  if (!steam.diagnostic.available) {
    return { ok: false, code: "capability_unavailable", diagnostic: steam.diagnostic.message };
  }

  let fingerprint: RunnerFingerprint;
  let inspection: InventoryInspection;
  try {
    const [paths, inventory] = await Promise.all([
      backend.getPluginPaths(),
      steam.listShortcuts(),
    ]);
    fingerprint = fingerprintFor(paths);
    inspection = inspectInventory(inventory, fingerprint);
  } catch (error) {
    return {
      ok: false,
      code: "inventory_unreadable",
      diagnostic: error instanceof Error ? error.message : "Steam shortcut inventory is unreadable",
    };
  }

  const resolved = requireUnambiguousOwned(inspection);
  if (resolved.error !== null) return resolved.error;
  if (resolved.runner === null) {
    await backend.clearState();
    return { ok: true, outcome: "no_owned_runner" };
  }

  let activity: RunnerActivity;
  try {
    activity = mapSteamActivity(await steam.readActivity(resolved.runner.runnerShortcutId));
  } catch (_error) {
    activity = "unknown";
  }
  if (activity !== "inactive") {
    return {
      ok: false,
      code: "runner_not_inactive",
      diagnostic: `Runner activity is ${activity}; cleanup requires inactive`,
    };
  }

  try {
    const reverified = await steam.getShortcut(resolved.runner.runnerShortcutId);
    if (reverified === null || !hasExactFingerprint(reverified, fingerprint) || !reverified.hidden) {
      return {
        ok: false,
        code: "ownership_changed",
        diagnostic: "Runner ownership changed before cleanup; nothing was removed",
      };
    }
    await steam.removeShortcut(reverified.runnerShortcutId);
    if (!(await steam.waitForAbsence(reverified.runnerShortcutId))) {
      return {
        ok: false,
        code: "removal_unverified",
        diagnostic: "Steam did not confirm runner overview and details absence",
      };
    }
    await backend.clearState();
    return { ok: true, outcome: "removed" };
  } catch (error) {
    return {
      ok: false,
      code: "cleanup_failed",
      diagnostic: error instanceof Error ? error.message : "Runner cleanup failed",
    };
  }
};

export type ServiceLaunchResult =
  | ({ ok: true } & RunnerLaunchResult)
  | { ok: false; code: string; diagnostic: string; activity: RunnerActivity };

export class RunnerService {
  private readonly state: RunnerStateTracker;
  private prepared: PreparedRunner | null = null;
  private pendingRunnerRedirect: { shortcutId: string; expiresAt: number } | null = null;
  private disposed = false;
  private lifecycleGeneration = 0;

  constructor(
    private readonly backend: BackendPort,
    private readonly steam: PrivateSteamPort,
    private readonly notificationTimeoutMs = DEFAULT_LAUNCH_NOTIFICATION_TIMEOUT_MS,
  ) {
    this.state = new RunnerStateTracker(steam);
  }

  get activity(): RunnerActivity {
    return this.state.activity;
  }

  subscribeStatus(listener: (activity: RunnerActivity) => void): () => void {
    return this.state.subscribe(listener);
  }

  consumeRunnerRedirect(appId: unknown): boolean {
    const pending = this.pendingRunnerRedirect;
    if (pending === null) return false;
    if (Date.now() > pending.expiresAt) {
      this.pendingRunnerRedirect = null;
      return false;
    }
    if (!Number.isInteger(appId) || String(appId) !== pending.shortcutId) return false;
    this.pendingRunnerRedirect = null;
    return true;
  }

  async prepare(): Promise<PrepareRunnerResult> {
    if (this.disposed) return this.disposedPrepareFailure();
    const generation = this.lifecycleGeneration;
    const result = await prepareRunner(
      this.backend,
      this.steam,
      () => this.isCurrent(generation),
    );
    if (!this.isCurrent(generation)) {
      this.state.detach();
      return this.disposedPrepareFailure();
    }
    if (!result.ok) {
      this.prepared = null;
      this.state.detach();
      return result;
    }
    if (this.prepared?.runnerShortcutId === result.runner.runnerShortcutId) {
      await this.state.refresh(result.runner.runnerShortcutId);
    } else {
      await this.state.attach(result.runner.runnerShortcutId);
    }
    if (!this.isCurrent(generation)) {
      this.state.detach();
      return this.disposedPrepareFailure();
    }
    this.prepared = result.runner;
    return result;
  }

  async launch(): Promise<ServiceLaunchResult> {
    if (this.disposed) return this.disposedLaunchFailure();
    const generation = this.lifecycleGeneration;
    let preflight;
    try {
      preflight = await this.backend.getGfnPreflight();
    } catch (error) {
      return {
        ok: false,
        code: "preflight_failed",
        diagnostic: error instanceof Error ? error.message : "GFN preflight failed",
        activity: "unknown",
      };
    }
    if (!this.isCurrent(generation)) return this.disposedLaunchFailure();
    if (!preflight.ready) {
      return {
        ok: false,
        code: preflight.code,
        diagnostic: preflight.message,
        activity: "unknown",
      };
    }

    const prepared = await this.prepare();
    if (!this.isCurrent(generation)) return this.disposedLaunchFailure();
    if (!prepared.ok) {
      return { ...prepared, activity: "unknown" };
    }
    const runner = this.prepared;
    if (runner === null) {
      return {
        ok: false,
        code: "runner_unavailable",
        diagnostic: "Runner preparation did not produce a launch identity",
        activity: "unknown",
      };
    }
    const pendingRedirect = {
      shortcutId: runner.runnerShortcutId,
      expiresAt: Date.now() + Math.max(this.notificationTimeoutMs, 5_000),
    };
    this.pendingRunnerRedirect = pendingRedirect;
    const launched = await this.state.launch(
      runner,
      EXPEDITION_33_APP_ID,
      this.notificationTimeoutMs,
    );
    if (!launched.accepted && this.pendingRunnerRedirect === pendingRedirect) {
      this.pendingRunnerRedirect = null;
    }
    if (!this.isCurrent(generation)) return this.disposedLaunchFailure();
    return { ok: true, ...launched };
  }

  async cleanup(): Promise<CleanupRunnerResult> {
    if (this.prepared !== null && this.state.activity !== "inactive") {
      return {
        ok: false,
        code: "runner_not_inactive",
        diagnostic: `Runner activity is ${this.state.activity}; cleanup requires inactive`,
      };
    }
    const result = await cleanupRunner(this.backend, this.steam);
    if (result.ok) {
      this.prepared = null;
      this.state.detach();
    }
    return result;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lifecycleGeneration += 1;
    this.prepared = null;
    this.pendingRunnerRedirect = null;
    this.state.detach();
  }

  private isCurrent(generation: number): boolean {
    return !this.disposed && generation === this.lifecycleGeneration;
  }

  private disposedPrepareFailure(): PrepareFailure {
    return failure("service_disposed", "Runner service was disposed");
  }

  private disposedLaunchFailure(): ServiceLaunchResult {
    return {
      ok: false,
      code: "service_disposed",
      diagnostic: "Runner service was disposed",
      activity: "unknown",
    };
  }
}

export interface RunnerRuntimeResult {
  diagnostic: CapabilityDiagnostic;
  service: RunnerService | null;
}

export const createRunnerRuntime = (
  backend: BackendPort,
  source: unknown = globalThis,
  options: {
    steamTiming?: Partial<PrivateSteamTiming>;
    launchNotificationTimeoutMs?: number;
  } = {},
): RunnerRuntimeResult => {
  const adapter = createPrivateSteamAdapter(source, options.steamTiming);
  return {
    diagnostic: adapter.diagnostic,
    service:
      adapter.port === null
        ? null
        : new RunnerService(
            backend,
            adapter.port,
            options.launchNotificationTimeoutMs,
          ),
  };
};
