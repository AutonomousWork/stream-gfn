import type {
  PrivateSteamPort,
  SteamActivitySnapshot,
} from "./privateSteam";

export type RunnerActivity = "inactive" | "active" | "unknown";

export interface RunnerLaunchIdentity {
  runnerShortcutId: string;
  runnerGameId64: string;
}

export type RunnerLaunchResult =
  | { accepted: true; activity: RunnerActivity }
  | {
      accepted: false;
      activity: RunnerActivity;
      reason:
        | "runner_active"
        | "runner_unknown"
        | "launch_unconfirmed"
        | "launch_error"
        | "launch_cancelled";
    };

type StateSteamPort = Pick<
  PrivateSteamPort,
  "readActivity" | "subscribeLifetime" | "runGame"
>;

export const mapSteamActivity = (state: SteamActivitySnapshot): RunnerActivity => {
  if (state === "ReadyToLaunch") return "inactive";
  if (state === "Launching" || state === "Running" || state === "Terminating") {
    return "active";
  }
  return "unknown";
};

export class RunnerStateTracker {
  private currentActivity: RunnerActivity = "unknown";
  private runnerShortcutId: string | null = null;
  private unsubscribeLifetime: (() => void) | null = null;
  private readonly listeners = new Set<(activity: RunnerActivity) => void>();
  private launchUnconfirmed = false;
  private lifecycleGeneration = 0;
  private cancelPendingLaunch: (() => void) | null = null;

  constructor(private readonly steam: StateSteamPort) {}

  get activity(): RunnerActivity {
    return this.currentActivity;
  }

  subscribe(listener: (activity: RunnerActivity) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentActivity);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async attach(runnerShortcutId: string): Promise<RunnerActivity> {
    this.detachLifetime();
    this.lifecycleGeneration += 1;
    const generation = this.lifecycleGeneration;
    this.runnerShortcutId = runnerShortcutId;
    this.launchUnconfirmed = false;
    this.unsubscribeLifetime = this.steam.subscribeLifetime(() => {
      void this.refreshForGeneration(runnerShortcutId, generation);
    });
    return this.refreshForGeneration(runnerShortcutId, generation);
  }

  async refresh(runnerShortcutId = this.runnerShortcutId): Promise<RunnerActivity> {
    if (runnerShortcutId === null || this.launchUnconfirmed) {
      this.setActivity("unknown");
      return this.currentActivity;
    }
    return this.refreshForGeneration(runnerShortcutId, this.lifecycleGeneration);
  }

  async launch(
    identity: RunnerLaunchIdentity,
    targetSteamAppId: string,
    notificationTimeoutMs: number,
  ): Promise<RunnerLaunchResult> {
    const generation = this.lifecycleGeneration;
    if (this.launchUnconfirmed) {
      this.setActivity("unknown");
      return { accepted: false, activity: "unknown", reason: "launch_unconfirmed" };
    }

    let settleNotification: ((activity: RunnerActivity | null) => void) | null = null;
    let notificationSettled = false;
    const notification = new Promise<RunnerActivity | null>((resolve) => {
      settleNotification = (activity) => {
        if (notificationSettled) return;
        notificationSettled = true;
        resolve(activity);
      };
    });
    const unsubscribe = this.steam.subscribeLifetime(() => {
      void this.confirmActive(identity.runnerShortcutId, generation, settleNotification);
    });
    const cancelLaunch = (): void => settleNotification?.(null);
    this.cancelPendingLaunch = cancelLaunch;

    let snapshot: RunnerActivity;
    try {
      snapshot = mapSteamActivity(await this.steam.readActivity(identity.runnerShortcutId));
    } catch (_error) {
      snapshot = "unknown";
    }
    if (generation !== this.lifecycleGeneration) {
      unsubscribe();
      if (this.cancelPendingLaunch === cancelLaunch) this.cancelPendingLaunch = null;
      return { accepted: false, activity: "unknown", reason: "launch_cancelled" };
    }
    this.setActivity(snapshot);
    if (snapshot !== "inactive") {
      unsubscribe();
      if (this.cancelPendingLaunch === cancelLaunch) this.cancelPendingLaunch = null;
      return {
        accepted: false,
        activity: snapshot,
        reason: snapshot === "active" ? "runner_active" : "runner_unknown",
      };
    }

    try {
      this.steam.runGame(identity.runnerGameId64, targetSteamAppId);
    } catch (_error) {
      unsubscribe();
      if (this.cancelPendingLaunch === cancelLaunch) this.cancelPendingLaunch = null;
      this.setActivity("unknown");
      return { accepted: false, activity: "unknown", reason: "launch_error" };
    }

    void this.confirmActive(identity.runnerShortcutId, generation, settleNotification);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), notificationTimeoutMs);
    });
    let confirmedActivity: RunnerActivity | null;
    try {
      confirmedActivity = await Promise.race([notification, timeout]);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
      unsubscribe();
      if (this.cancelPendingLaunch === cancelLaunch) this.cancelPendingLaunch = null;
    }
    if (generation !== this.lifecycleGeneration) {
      return { accepted: false, activity: "unknown", reason: "launch_cancelled" };
    }
    if (confirmedActivity === "active") {
      this.launchUnconfirmed = false;
      this.setActivity("active");
      return { accepted: true, activity: "active" };
    }

    this.launchUnconfirmed = true;
    this.setActivity("unknown");
    return { accepted: true, activity: "unknown" };
  }

  detach(): void {
    this.lifecycleGeneration += 1;
    this.cancelPendingLaunch?.();
    this.cancelPendingLaunch = null;
    this.detachLifetime();
    this.runnerShortcutId = null;
    this.launchUnconfirmed = false;
    this.setActivity("unknown");
  }

  private async refreshForGeneration(
    runnerShortcutId: string,
    generation: number,
  ): Promise<RunnerActivity> {
    let activity: RunnerActivity;
    try {
      activity = mapSteamActivity(await this.steam.readActivity(runnerShortcutId));
    } catch (_error) {
      activity = "unknown";
    }
    if (
      generation === this.lifecycleGeneration &&
      runnerShortcutId === this.runnerShortcutId
    ) {
      this.launchUnconfirmed = false;
      this.setActivity(activity);
    }
    return this.currentActivity;
  }

  private async confirmActive(
    runnerShortcutId: string,
    generation: number,
    settle: ((activity: RunnerActivity | null) => void) | null,
  ): Promise<void> {
    if (generation !== this.lifecycleGeneration) return;
    let activity: RunnerActivity;
    try {
      activity = mapSteamActivity(await this.steam.readActivity(runnerShortcutId));
    } catch (_error) {
      return;
    }
    if (generation === this.lifecycleGeneration && activity === "active") {
      settle?.("active");
    }
  }

  private setActivity(activity: RunnerActivity): void {
    if (activity === this.currentActivity) return;
    this.currentActivity = activity;
    for (const listener of this.listeners) listener(activity);
  }

  private detachLifetime(): void {
    this.unsubscribeLifetime?.();
    this.unsubscribeLifetime = null;
  }
}
