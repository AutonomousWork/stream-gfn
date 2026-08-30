import type {
  PrivateSteamPort,
  SteamActivitySnapshot,
  SteamLifetimeEvent,
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
      reason: "runner_active" | "runner_unknown" | "launch_unconfirmed" | "launch_error";
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
    this.runnerShortcutId = runnerShortcutId;
    this.launchUnconfirmed = false;
    this.unsubscribeLifetime = this.steam.subscribeLifetime((event) => {
      this.handleLifetime(event);
    });
    return this.refresh(runnerShortcutId);
  }

  async refresh(runnerShortcutId = this.runnerShortcutId): Promise<RunnerActivity> {
    if (runnerShortcutId === null || this.launchUnconfirmed) {
      this.setActivity("unknown");
      return this.currentActivity;
    }
    try {
      this.setActivity(mapSteamActivity(await this.steam.readActivity(runnerShortcutId)));
    } catch (_error) {
      this.setActivity("unknown");
    }
    return this.currentActivity;
  }

  async launch(
    identity: RunnerLaunchIdentity,
    targetSteamAppId: string,
    notificationTimeoutMs: number,
  ): Promise<RunnerLaunchResult> {
    if (this.launchUnconfirmed) {
      this.setActivity("unknown");
      return { accepted: false, activity: "unknown", reason: "launch_unconfirmed" };
    }

    let settleNotification: ((event: SteamLifetimeEvent | null) => void) | null = null;
    const notification = new Promise<SteamLifetimeEvent | null>((resolve) => {
      settleNotification = resolve;
    });
    const unsubscribe = this.steam.subscribeLifetime((event) => {
      if (event.runnerShortcutId === identity.runnerShortcutId) {
        settleNotification?.(event);
      }
    });

    let snapshot: RunnerActivity;
    try {
      snapshot = mapSteamActivity(await this.steam.readActivity(identity.runnerShortcutId));
    } catch (_error) {
      snapshot = "unknown";
    }
    this.setActivity(snapshot);
    if (snapshot !== "inactive") {
      unsubscribe();
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
      this.setActivity("unknown");
      return { accepted: false, activity: "unknown", reason: "launch_error" };
    }

    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), notificationTimeoutMs);
    });
    const event = await Promise.race([notification, timeout]);
    unsubscribe();
    if (event?.running === true) {
      this.launchUnconfirmed = false;
      this.setActivity("active");
      return { accepted: true, activity: "active" };
    }

    this.launchUnconfirmed = true;
    this.setActivity("unknown");
    return { accepted: true, activity: "unknown" };
  }

  detach(): void {
    this.detachLifetime();
    this.runnerShortcutId = null;
    this.launchUnconfirmed = false;
    this.setActivity("unknown");
  }

  private handleLifetime(event: SteamLifetimeEvent): void {
    if (event.runnerShortcutId !== this.runnerShortcutId) return;
    this.launchUnconfirmed = false;
    this.setActivity(event.running ? "active" : "inactive");
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
