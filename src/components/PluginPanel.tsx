import {
  ButtonItem,
  ConfirmModal,
  PanelSection,
  PanelSectionRow,
  showModal,
} from "@decky/ui";
import { useEffect, useState } from "react";

import type { BuildIdentity } from "../api";
import type { RunnerActivity } from "../steam/runnerState";
import { GfnLaunchController } from "./GfnLaunchButton";

export const CLEANUP_CONFIRMATION =
  "Remove only the verified Stream GFN Runner while it is inactive? This does not remove other shortcuts.";

export const formatBuildIdentity = (identity: BuildIdentity | null): string => {
  if (identity === null) return "Unavailable";
  const tag = identity.tag ?? "development";
  const commit = identity.commit?.slice(0, 8) ?? "unknown";
  return `${tag} · ${commit}`;
};

export const formatRunnerActivity = (activity: RunnerActivity): string => {
  switch (activity) {
    case "inactive":
      return "Inactive";
    case "active":
      return "Active";
    case "unknown":
      return "Unknown";
  }
};

export interface PluginPanelProps {
  controller: GfnLaunchController;
}

export const PluginPanel = ({ controller }: PluginPanelProps) => {
  const [snapshot, setSnapshot] = useState(controller.snapshot);
  useEffect(
    () => controller.subscribe(() => setSnapshot(controller.snapshot)),
    [controller],
  );

  const compatibility = snapshot.compatibility.available
    ? "Ready"
    : "Compatibility unavailable";
  const preflight = snapshot.preflight?.ready
    ? "Ready"
    : (snapshot.preflight?.message ?? "Checking…");

  const confirmCleanup = (): void => {
    showModal(
      <ConfirmModal
        bDestructiveWarning
        strTitle="Cleanup Stream GFN Runner?"
        strDescription={CLEANUP_CONFIRMATION}
        strOKButtonText="Cleanup Runner"
        strCancelButtonText="Cancel"
        onOK={() => void controller.cleanup()}
      />,
    );
  };

  return (
    <>
      <PanelSection title="Status" spinner={snapshot.busy}>
        <PanelSectionRow>
          <div>Build: {formatBuildIdentity(snapshot.buildIdentity)}</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div>Compatibility: {compatibility}</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div>GeForce NOW: {preflight}</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div>Runner: {formatRunnerActivity(snapshot.activity)}</div>
        </PanelSectionRow>
        {snapshot.diagnostic ? (
          <PanelSectionRow>
            <div>{snapshot.diagnostic}</div>
          </PanelSectionRow>
        ) : null}
        {!snapshot.compatibility.available ? (
          <PanelSectionRow>
            <div>
              Steam: {snapshot.compatibility.steamVersion}
              <br />
              Decky: {snapshot.compatibility.deckyVersion}
              <br />
              The native library page was left unchanged.
            </div>
          </PanelSectionRow>
        ) : null}
      </PanelSection>
      <PanelSection title="Maintenance">
        <ButtonItem
          label="Retry compatibility check"
          description="Recheck Steam surfaces, GFN, and the hidden runner"
          disabled={snapshot.busy}
          onClick={() => void controller.retryCompatibility()}
        />
        <ButtonItem
          label="Cleanup Runner"
          description="Remove only the verified plugin-owned hidden shortcut"
          disabled={snapshot.busy}
          onClick={confirmCleanup}
        />
      </PanelSection>
    </>
  );
};
