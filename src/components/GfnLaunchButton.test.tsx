import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", () => ({ DialogButton: () => null }));

import type { BuildIdentity, GfnPreflight } from "../api";
import type { CapabilityDiagnostic } from "../steam/privateSteam";
import type {
  CleanupRunnerResult,
  PrepareRunnerResult,
  ServiceLaunchResult,
} from "../steam/runnerShortcut";
import type { RunnerActivity } from "../steam/runnerState";
import {
  GfnLaunchController,
  getLaunchPresentation,
  type RunnerServicePort,
} from "./GfnLaunchButton";

const READY: CapabilityDiagnostic = {
  available: true,
  code: "ready",
  message: "Steam compatibility ready",
};

class FakeRunnerService implements RunnerServicePort {
  readonly capability = READY;
  activity: RunnerActivity = "inactive";
  prepareResult: PrepareRunnerResult = {
    ok: true,
    runner: { runnerShortcutId: "42", runnerGameId64: "76561199000000042" },
    created: false,
    recovered: false,
  };
  launchResult: Promise<ServiceLaunchResult> = Promise.resolve({
    ok: true,
    accepted: true,
    activity: "active",
  });
  cleanupResult: CleanupRunnerResult = { ok: true, outcome: "removed" };
  prepare = vi.fn(async () => this.prepareResult);
  launch = vi.fn(async () => this.launchResult);
  cleanup = vi.fn(async () => this.cleanupResult);
  dispose = vi.fn();
  private listeners = new Set<(activity: RunnerActivity) => void>();

  subscribeStatus(listener: (activity: RunnerActivity) => void): () => void {
    this.listeners.add(listener);
    listener(this.activity);
    return () => this.listeners.delete(listener);
  }

  emit(activity: RunnerActivity): void {
    this.activity = activity;
    for (const listener of this.listeners) listener(activity);
  }
}

const backend = (
  preflight: GfnPreflight = { ready: true, code: "ready", message: "GFN ready" },
  identity: BuildIdentity = {
    schemaVersion: 1,
    source: "package",
    metadataValidated: true,
    tag: "v0.1.0-alpha.1",
    commit: "0123456789abcdef",
  },
) => ({
  getGfnPreflight: vi.fn(async () => preflight),
  getBuildIdentity: vi.fn(async () => identity),
});

describe("GFN launch interaction", () => {
  it("keeps the visible and accessible labels aligned across controller states", () => {
    expect(getLaunchPresentation("ready")).toEqual({
      label: "Stream on GeForce NOW",
      disabled: false,
      focusable: true,
    });
    expect(getLaunchPresentation("starting")).toMatchObject({
      label: "Starting GeForce NOW…",
      disabled: true,
    });
    expect(getLaunchPresentation("active")).toMatchObject({
      label: "GeForce NOW is running",
      disabled: true,
    });
    expect(getLaunchPresentation("unknown")).toMatchObject({
      label: "Runner status unknown",
      disabled: true,
    });
    expect(getLaunchPresentation("compatibility-unavailable")).toMatchObject({
      label: "Compatibility unavailable",
      disabled: true,
    });
  });

  it("turns a prepared inactive runner into a ready one-tap action", async () => {
    const service = new FakeRunnerService();
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify: vi.fn(),
    });

    await controller.initialize();

    expect(service.prepare).toHaveBeenCalledTimes(1);
    expect(controller.snapshot.interaction).toBe("ready");
    expect(controller.snapshot.activity).toBe("inactive");
    expect(controller.snapshot.preflight?.ready).toBe(true);
    expect(controller.snapshot.buildIdentity?.tag).toBe("v0.1.0-alpha.1");
  });

  it("coalesces rapid activation into exactly one Steam launch request", async () => {
    const service = new FakeRunnerService();
    let finish: ((value: ServiceLaunchResult) => void) | undefined;
    service.launchResult = new Promise((resolve) => {
      finish = resolve;
    });
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify: vi.fn(),
    });
    await controller.initialize();

    const first = controller.launch();
    const second = controller.launch();

    expect(controller.snapshot.interaction).toBe("starting");
    expect(service.launch).toHaveBeenCalledTimes(1);
    finish?.({ ok: true, accepted: true, activity: "active" });
    await Promise.all([first, second]);
    expect(controller.snapshot.interaction).toBe("active");
  });

  it("latches an accepted-but-unconfirmed launch as unknown and refuses repeats", async () => {
    const service = new FakeRunnerService();
    service.launchResult = Promise.resolve({ ok: true, accepted: true, activity: "unknown" });
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify: vi.fn(),
    });
    await controller.initialize();

    await controller.launch();
    await controller.launch();

    expect(controller.snapshot.interaction).toBe("unknown");
    expect(service.launch).toHaveBeenCalledTimes(1);
  });

  it("returns to ready and surfaces an explicit pre-launch failure through the toaster", async () => {
    const service = new FakeRunnerService();
    service.launchResult = Promise.resolve({
      ok: false,
      code: "gfn_not_installed",
      diagnostic: "Install GeForce NOW and retry",
      activity: "unknown",
    });
    const notify = vi.fn();
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify,
    });
    await controller.initialize();

    await controller.launch();

    expect(controller.snapshot.interaction).toBe("ready");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ critical: true, body: "Install GeForce NOW and retry" }),
    );
  });

  it("fails closed when the private Steam adapter is unavailable", async () => {
    const diagnostic: CapabilityDiagnostic = {
      available: false,
      code: "missing_run_game",
      message: "Steam compatibility unavailable: RunGame is missing",
    };
    const controller = new GfnLaunchController({
      service: null,
      capability: diagnostic,
      backend: backend(),
      notify: vi.fn(),
      versions: { steam: "Steam 123", decky: "Decky 4.0" },
    });

    await controller.initialize();
    await controller.launch();

    expect(controller.snapshot.interaction).toBe("compatibility-unavailable");
    expect(controller.snapshot.compatibility).toMatchObject({
      available: false,
      code: "missing_run_game",
      steamVersion: "Steam 123",
      deckyVersion: "Decky 4.0",
    });
  });

  it("recreates the private adapter when retry finds Steam capabilities after reload", async () => {
    const diagnostic: CapabilityDiagnostic = {
      available: false,
      code: "missing_run_game",
      message: "Steam compatibility unavailable: RunGame is missing",
    };
    const recovered = new FakeRunnerService();
    const controller = new GfnLaunchController({
      service: null,
      capability: diagnostic,
      backend: backend(),
      notify: vi.fn(),
      recreateRuntime: () => ({ service: recovered, capability: READY }),
    });
    await controller.initialize();

    await controller.retryCompatibility();

    expect(controller.canPatchLibrary).toBe(true);
    expect(recovered.prepare).toHaveBeenCalledTimes(1);
    expect(controller.snapshot.interaction).toBe("ready");
  });

  it("recovers the action after a later library-surface compatibility check succeeds", async () => {
    const service = new FakeRunnerService();
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify: vi.fn(),
    });
    await controller.initialize();
    controller.reportLibraryCompatibility({
      available: false,
      code: "missing_library_action_area",
      message: "Compatibility unavailable: action area missing",
    });

    controller.reportLibraryCompatibility({
      available: true,
      code: "ready",
      message: "Steam library action ready",
    });

    expect(controller.snapshot.interaction).toBe("ready");
    expect(controller.snapshot.compatibility.available).toBe(true);
    expect(controller.snapshot.diagnostic).toBeNull();
  });

  it("maps an unexpected launch rejection to a retryable toaster error", async () => {
    const service = new FakeRunnerService();
    service.launch = vi.fn(async () => {
      throw new Error("private surface exploded");
    });
    const notify = vi.fn();
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify,
    });
    await controller.initialize();

    await expect(controller.launch()).resolves.toBeUndefined();

    expect(controller.snapshot.interaction).toBe("ready");
    expect(controller.snapshot.busy).toBe(false);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ critical: true, body: "private surface exploded" }),
    );
  });

  it("disposes subscriptions without cleaning up the hidden runner", () => {
    const service = new FakeRunnerService();
    const controller = new GfnLaunchController({
      service,
      capability: READY,
      backend: backend(),
      notify: vi.fn(),
    });

    controller.dispose();

    expect(service.dispose).toHaveBeenCalledTimes(1);
    expect(service.cleanup).not.toHaveBeenCalled();
  });
});
