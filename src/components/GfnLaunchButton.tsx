import { DialogButton } from "@decky/ui";
import { useEffect, useState } from "react";

import type { BuildIdentity, GfnPreflight } from "../api";
import type { CapabilityDiagnostic } from "../steam/privateSteam";
import type {
  CleanupRunnerResult,
  PrepareRunnerResult,
  ServiceLaunchResult,
} from "../steam/runnerShortcut";
import type { RunnerActivity } from "../steam/runnerState";

export type LaunchInteraction =
  | "ready"
  | "starting"
  | "active"
  | "unknown"
  | "compatibility-unavailable";

export interface CompatibilityVersions {
  steam: string;
  decky: string;
}

export interface CompatibilityState {
  available: boolean;
  code: string;
  message: string;
  steamVersion: string;
  deckyVersion: string;
}

export interface LaunchSnapshot {
  interaction: LaunchInteraction;
  activity: RunnerActivity;
  compatibility: CompatibilityState;
  preflight: GfnPreflight | null;
  buildIdentity: BuildIdentity | null;
  diagnostic: string | null;
  busy: boolean;
}

export interface LaunchPresentation {
  label: string;
  disabled: boolean;
  focusable: boolean;
}

export interface RunnerServicePort {
  readonly activity: RunnerActivity;
  subscribeStatus(listener: (activity: RunnerActivity) => void): () => void;
  prepare(): Promise<PrepareRunnerResult>;
  launch(): Promise<ServiceLaunchResult>;
  cleanup(): Promise<CleanupRunnerResult>;
  dispose(): void;
}

export interface PanelBackendPort {
  getGfnPreflight(): Promise<GfnPreflight>;
  getBuildIdentity(): Promise<BuildIdentity>;
}

export interface PluginToast {
  body: string;
  critical?: boolean;
}

export interface LibraryCompatibilityReport {
  available: boolean;
  code: string;
  message: string;
}

interface GfnLaunchControllerOptions {
  service: RunnerServicePort | null;
  capability: CapabilityDiagnostic;
  backend: PanelBackendPort;
  notify(toast: PluginToast): void;
  versions?: CompatibilityVersions;
  recreateRuntime?(): {
    service: RunnerServicePort | null;
    capability: CapabilityDiagnostic;
  };
}

const UNKNOWN_VERSIONS: CompatibilityVersions = {
  steam: "not exposed",
  decky: "not exposed",
};

const normalizeVersion = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized.slice(0, 120) : null;
};

const readNested = (source: unknown, path: readonly string[]): unknown => {
  let value = source;
  for (const key of path) {
    if (typeof value !== "object" || value === null || !(key in value)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
};

export const readCompatibilityVersions = (source: unknown = globalThis): CompatibilityVersions => {
  const steam =
    normalizeVersion(readNested(source, ["SteamClient", "System", "version"])) ??
    normalizeVersion(readNested(source, ["navigator", "userAgent"])) ??
    UNKNOWN_VERSIONS.steam;
  const decky =
    normalizeVersion(readNested(source, ["__DECKY_VERSION__"])) ??
    normalizeVersion(readNested(source, ["DeckyPluginLoader", "version"])) ??
    UNKNOWN_VERSIONS.decky;
  return { steam, decky };
};

const interactionForActivity = (activity: RunnerActivity): LaunchInteraction => {
  if (activity === "inactive") return "ready";
  if (activity === "active") return "active";
  return "unknown";
};

export const getLaunchPresentation = (
  interaction: LaunchInteraction,
): LaunchPresentation => {
  switch (interaction) {
    case "ready":
      return { label: "Stream on GeForce NOW", disabled: false, focusable: true };
    case "starting":
      return { label: "Starting GeForce NOW…", disabled: true, focusable: false };
    case "active":
      return { label: "GeForce NOW is running", disabled: true, focusable: false };
    case "unknown":
      return { label: "Runner status unknown", disabled: true, focusable: false };
    case "compatibility-unavailable":
      return { label: "Compatibility unavailable", disabled: true, focusable: false };
  }
};

export class GfnLaunchController {
  private current: LaunchSnapshot;
  private readonly listeners = new Set<() => void>();
  private service: RunnerServicePort | null;
  private capability: CapabilityDiagnostic;
  private unsubscribeStatus: (() => void) | null = null;
  private refreshPromise: Promise<void> | null = null;
  private operationPromise: Promise<void> | null = null;
  private disposed = false;
  private suppressActivity = false;
  private libraryDiagnostic: LibraryCompatibilityReport | null = null;

  constructor(private readonly options: GfnLaunchControllerOptions) {
    const versions = options.versions ?? readCompatibilityVersions();
    this.service = options.service;
    this.capability = options.capability;
    this.current = {
      interaction: this.capability.available ? "unknown" : "compatibility-unavailable",
      activity: "unknown",
      compatibility: this.compatibilityFrom(this.capability, versions),
      preflight: null,
      buildIdentity: null,
      diagnostic: this.capability.available ? null : this.capability.message,
      busy: false,
    };
    this.subscribeToService();
  }

  get snapshot(): LaunchSnapshot {
    return this.current;
  }

  get canPatchLibrary(): boolean {
    return this.capability.available && this.service !== null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  initialize(): Promise<void> {
    return this.refreshCompatibility();
  }

  retryCompatibility(): Promise<void> {
    this.libraryDiagnostic = null;
    if ((!this.capability.available || this.service === null) && this.options.recreateRuntime) {
      const runtime = this.options.recreateRuntime();
      this.unsubscribeStatus?.();
      this.service?.dispose();
      this.service = runtime.service;
      this.capability = runtime.capability;
      this.subscribeToService();
      this.update({
        compatibility: this.compatibilityFrom(this.capability),
        interaction: this.capability.available ? "unknown" : "compatibility-unavailable",
        diagnostic: this.capability.available ? null : this.capability.message,
      });
    }
    return this.refreshCompatibility();
  }

  reportLibraryCompatibility(report: LibraryCompatibilityReport): void {
    if (
      (report.available && this.libraryDiagnostic === null) ||
      (!report.available &&
        this.libraryDiagnostic?.code === report.code &&
        this.libraryDiagnostic.message === report.message)
    ) {
      return;
    }
    this.libraryDiagnostic = report.available ? null : report;
    if (!report.available) {
      this.update({
        interaction: "compatibility-unavailable",
        compatibility: this.compatibilityFromReport(report),
        diagnostic: report.message,
      });
      return;
    }
    if (this.capability.available) {
      this.update({
        compatibility: this.compatibilityFrom(this.capability),
        interaction: interactionForActivity(this.current.activity),
        diagnostic: null,
      });
    }
  }

  launch(): Promise<void> {
    if (this.operationPromise !== null) return this.operationPromise;
    if (this.current.interaction !== "ready" || this.service === null) {
      return Promise.resolve();
    }

    const operation = this.performLaunch().catch((error: unknown) => {
      this.handleUnexpected(error, "launch");
    });
    this.operationPromise = operation;
    void operation.finally(() => {
      if (this.operationPromise === operation) this.operationPromise = null;
    });
    return operation;
  }

  cleanup(): Promise<void> {
    if (this.operationPromise !== null) return this.operationPromise;
    if (this.service === null) {
      this.options.notify({
        critical: true,
        body: this.current.compatibility.message,
      });
      return Promise.resolve();
    }

    const operation = this.performCleanup().catch((error: unknown) => {
      this.handleUnexpected(error, "cleanup");
    });
    this.operationPromise = operation;
    void operation.finally(() => {
      if (this.operationPromise === operation) this.operationPromise = null;
    });
    return operation;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeStatus?.();
    this.listeners.clear();
    this.service?.dispose();
  }

  private refreshCompatibility(): Promise<void> {
    if (this.refreshPromise !== null) return this.refreshPromise;
    const refresh = this.performRefresh().catch((error: unknown) => {
      this.handleUnexpected(error, "refresh");
    });
    this.refreshPromise = refresh;
    void refresh.finally(() => {
      if (this.refreshPromise === refresh) this.refreshPromise = null;
    });
    return refresh;
  }

  private async performRefresh(): Promise<void> {
    if (this.disposed) return;
    this.update({ busy: true });

    const [preflight, buildIdentity] = await Promise.all([
      this.options.backend
        .getGfnPreflight()
        .catch((error: unknown): GfnPreflight => ({
          ready: false,
          code: "preflight_failed",
          message: error instanceof Error ? error.message : "GFN preflight failed",
        })),
      this.options.backend.getBuildIdentity().catch(() => null),
    ]);
    if (this.disposed) return;
    this.update({ preflight, buildIdentity });

    if (this.service === null || !this.capability.available) {
      this.update({
        busy: false,
        interaction: "compatibility-unavailable",
        diagnostic: this.capability.message,
      });
      return;
    }

    const prepared = await this.service.prepare();
    if (this.disposed) return;
    if (!prepared.ok) {
      this.update({
        busy: false,
        activity: "unknown",
        interaction:
          prepared.code === "capability_unavailable"
            ? "compatibility-unavailable"
            : "ready",
        diagnostic: prepared.diagnostic,
      });
      return;
    }

    const activity = this.service.activity;
    this.update({
      busy: false,
      activity,
      interaction: this.libraryDiagnostic
        ? "compatibility-unavailable"
        : interactionForActivity(activity),
      diagnostic: this.libraryDiagnostic?.message ?? null,
    });
  }

  private async performLaunch(): Promise<void> {
    const service = this.service;
    if (service === null) return;
    this.update({ interaction: "starting", busy: true, diagnostic: null });
    const result = await service.launch();
    if (this.disposed) return;

    if (!result.ok) {
      this.update({
        activity: result.activity,
        interaction: "ready",
        busy: false,
        diagnostic: result.diagnostic,
        preflight: result.code.startsWith("gfn_")
          ? { ready: false, code: result.code, message: result.diagnostic }
          : this.current.preflight,
      });
      this.options.notify({ critical: true, body: result.diagnostic });
      return;
    }

    if (result.accepted) {
      this.update({
        activity: result.activity,
        interaction: interactionForActivity(result.activity),
        busy: false,
      });
      return;
    }

    if (result.reason === "runner_active") {
      this.update({ activity: "active", interaction: "active", busy: false });
      return;
    }
    if (result.reason === "runner_unknown" || result.reason === "launch_unconfirmed") {
      this.update({ activity: "unknown", interaction: "unknown", busy: false });
      return;
    }

    const diagnostic = "Steam did not accept the GeForce NOW launch; retry from the game page";
    this.update({ activity: "unknown", interaction: "ready", busy: false, diagnostic });
    this.options.notify({ critical: true, body: diagnostic });
  }

  private async performCleanup(): Promise<void> {
    const service = this.service;
    if (service === null) return;
    this.update({ busy: true });
    this.suppressActivity = true;
    let result: CleanupRunnerResult;
    try {
      result = await service.cleanup();
    } finally {
      this.suppressActivity = false;
    }
    if (this.disposed) return;

    if (!result.ok) {
      this.update({ busy: false, diagnostic: result.diagnostic });
      this.options.notify({ critical: true, body: result.diagnostic });
      return;
    }

    const body = result.outcome === "removed" ? "Runner removed" : "No owned runner found";
    this.update({
      busy: false,
      activity: "inactive",
      interaction: "ready",
      diagnostic: null,
    });
    this.options.notify({ body });
  }

  private handleUnexpected(
    error: unknown,
    context: "launch" | "cleanup" | "refresh",
  ): void {
    if (this.disposed) return;
    const diagnostic = error instanceof Error ? error.message : `Unexpected ${context} failure`;
    this.update({
      busy: false,
      interaction: context === "launch" || context === "refresh" ? "ready" : this.current.interaction,
      diagnostic,
    });
    this.options.notify({ critical: true, body: diagnostic });
  }

  private handleActivity(activity: RunnerActivity): void {
    if (this.disposed || this.suppressActivity) return;
    if (this.current.interaction === "starting" && activity !== "active") return;
    this.update({
      activity,
      interaction: this.libraryDiagnostic
        ? "compatibility-unavailable"
        : interactionForActivity(activity),
    });
  }

  private subscribeToService(): void {
    this.unsubscribeStatus =
      this.service?.subscribeStatus((activity) => this.handleActivity(activity)) ?? null;
  }

  private compatibilityFrom(
    diagnostic: CapabilityDiagnostic,
    versions: CompatibilityVersions = {
      steam: this.current.compatibility.steamVersion,
      decky: this.current.compatibility.deckyVersion,
    },
  ): CompatibilityState {
    return {
      available: diagnostic.available,
      code: diagnostic.code,
      message: diagnostic.message,
      steamVersion: versions.steam,
      deckyVersion: versions.decky,
    };
  }

  private compatibilityFromReport(report: LibraryCompatibilityReport): CompatibilityState {
    return {
      available: report.available,
      code: report.code,
      message: report.message,
      steamVersion: this.current.compatibility.steamVersion,
      deckyVersion: this.current.compatibility.deckyVersion,
    };
  }

  private update(patch: Partial<LaunchSnapshot>): void {
    if (this.disposed) return;
    this.current = { ...this.current, ...patch };
    for (const listener of this.listeners) listener();
  }
}

export interface GfnLaunchButtonProps {
  controller: GfnLaunchController;
}

export const GfnLaunchButton = ({ controller }: GfnLaunchButtonProps) => {
  const [snapshot, setSnapshot] = useState(controller.snapshot);
  useEffect(
    () => controller.subscribe(() => setSnapshot(controller.snapshot)),
    [controller],
  );
  const presentation = getLaunchPresentation(snapshot.interaction);
  const accessibilityProps = {
    "aria-label": presentation.label,
    "data-stream-gfn-action": true,
  };

  return (
    <DialogButton
      {...accessibilityProps}
      disabled={presentation.disabled}
      focusable={presentation.focusable}
      noFocusRing={false}
      onClick={() => void controller.launch()}
    >
      {presentation.label}
    </DialogButton>
  );
};
