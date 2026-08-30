import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", () => ({
  ButtonItem: () => null,
  ConfirmModal: () => null,
  DialogButton: () => null,
  PanelSection: () => null,
  PanelSectionRow: () => null,
  showModal: vi.fn(),
}));

import type { CapabilityDiagnostic } from "../steam/privateSteam";
import type {
  CleanupRunnerResult,
  PrepareRunnerResult,
  ServiceLaunchResult,
} from "../steam/runnerShortcut";
import type { RunnerActivity } from "../steam/runnerState";
import { GfnLaunchController, type RunnerServicePort } from "./GfnLaunchButton";
import {
  CLEANUP_CONFIRMATION,
  formatBuildIdentity,
  formatRunnerActivity,
} from "./PluginPanel";

const READY: CapabilityDiagnostic = {
  available: true,
  code: "ready",
  message: "Steam compatibility ready",
};

class PanelService implements RunnerServicePort {
  readonly capability = READY;
  activity: RunnerActivity = "inactive";
  prepareResult: PrepareRunnerResult = {
    ok: true,
    runner: { runnerShortcutId: "42", runnerGameId64: "76561199000000042" },
    created: false,
    recovered: false,
  };
  cleanupResult: CleanupRunnerResult = { ok: true, outcome: "removed" };
  prepare = vi.fn(async () => this.prepareResult);
  launch = vi.fn(async (): Promise<ServiceLaunchResult> => ({
    ok: true,
    accepted: true,
    activity: "active",
  }));
  cleanup = vi.fn(async () => this.cleanupResult);
  dispose = vi.fn();
  subscribeStatus(listener: (activity: RunnerActivity) => void): () => void {
    listener(this.activity);
    return () => undefined;
  }
}

const makeController = (service: PanelService, notify = vi.fn()) =>
  new GfnLaunchController({
    service,
    capability: READY,
    notify,
    backend: {
      getGfnPreflight: vi.fn(async () => ({
        ready: true,
        code: "ready",
        message: "GFN ready",
      })),
      getBuildIdentity: vi.fn(async () => ({
        schemaVersion: 1 as const,
        source: "packaged" as const,
        metadataValidated: true,
        tag: "v0.1.0-alpha.1",
        commit: "0123456789abcdef",
      })),
    },
  });

describe("plugin panel contracts", () => {
  it("renders concise build and runner labels", () => {
    expect(
      formatBuildIdentity({
        schemaVersion: 1,
        source: "packaged" as const,
        metadataValidated: true,
        tag: "v0.1.0-alpha.1",
        commit: "0123456789abcdef",
      }),
    ).toBe("v0.1.0-alpha.1 · 01234567");
    expect(formatRunnerActivity("inactive")).toBe("Inactive");
    expect(formatRunnerActivity("active")).toBe("Active");
    expect(formatRunnerActivity("unknown")).toBe("Unknown");
  });

  it("warns that cleanup removes only the verified plugin-owned runner", () => {
    expect(CLEANUP_CONFIRMATION).toContain("verified Stream GFN Runner");
    expect(CLEANUP_CONFIRMATION).toContain("inactive");
    expect(CLEANUP_CONFIRMATION).toContain("other shortcuts");
  });

  it.each([
    [{ ok: true, outcome: "removed" } satisfies CleanupRunnerResult, "Runner removed"],
    [
      { ok: true, outcome: "no_owned_runner" } satisfies CleanupRunnerResult,
      "No owned runner found",
    ],
  ])("reports cleanup outcome %j", async (result, expectedBody) => {
    const service = new PanelService();
    service.cleanupResult = result;
    const notify = vi.fn();
    const controller = makeController(service, notify);
    await controller.initialize();

    await controller.cleanup();

    expect(service.cleanup).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ body: expectedBody }));
    expect(controller.snapshot.activity).toBe("inactive");
  });

  it.each(["active", "unknown"] as const)(
    "surfaces %s cleanup refusal without pretending removal succeeded",
    async (activity) => {
      const service = new PanelService();
      service.activity = activity;
      service.cleanupResult = {
        ok: false,
        code: "runner_not_inactive",
        diagnostic: `Runner activity is ${activity}; cleanup requires inactive`,
      };
      const notify = vi.fn();
      const controller = makeController(service, notify);
      await controller.initialize();

      await controller.cleanup();

      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          critical: true,
          body: expect.stringContaining("cleanup requires inactive"),
        }),
      );
    },
  );

  it("retries backend preflight and runner preparation", async () => {
    const service = new PanelService();
    const controller = makeController(service);
    await controller.initialize();

    await controller.retryCompatibility();

    expect(service.prepare).toHaveBeenCalledTimes(2);
  });

  it("maps an unexpected cleanup rejection to a toaster error", async () => {
    const service = new PanelService();
    service.cleanup = vi.fn(async () => {
      throw new Error("cleanup surface exploded");
    });
    const notify = vi.fn();
    const controller = makeController(service, notify);
    await controller.initialize();

    await expect(controller.cleanup()).resolves.toBeUndefined();

    expect(controller.snapshot.busy).toBe(false);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ critical: true, body: "cleanup surface exploded" }),
    );
  });
});
