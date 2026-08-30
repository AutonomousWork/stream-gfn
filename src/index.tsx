import { definePlugin, toaster } from "@decky/api";
import { staticClasses } from "@decky/ui";
import { FaCloud } from "react-icons/fa";

import { deckyBackend } from "./api";
import { GfnLaunchController, readCompatibilityVersions } from "./components/GfnLaunchButton";
import { PluginPanel } from "./components/PluginPanel";
import { installLibraryAppPatch } from "./library/patchLibraryApp";
import { createRunnerRuntime } from "./steam/runnerShortcut";

const PLUGIN_NAME = "Stream GFN";

export default definePlugin(() => {
  const runtime = createRunnerRuntime(deckyBackend, globalThis);
  const controller = new GfnLaunchController({
    service: runtime.service,
    capability: runtime.diagnostic,
    backend: deckyBackend,
    versions: readCompatibilityVersions(globalThis),
    recreateRuntime: () => {
      const recreated = createRunnerRuntime(deckyBackend, globalThis);
      return { service: recreated.service, capability: recreated.diagnostic };
    },
    notify: ({ body, critical = false }) => {
      toaster.toast({
        title: PLUGIN_NAME,
        body,
        critical,
        duration: critical ? 8_000 : 4_000,
      });
    },
  });
  const libraryPatch = installLibraryAppPatch(controller);
  void controller.initialize();

  return {
    name: PLUGIN_NAME,
    titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
    content: <PluginPanel controller={controller} />,
    icon: <FaCloud />,
    onDismount() {
      libraryPatch.dispose();
      controller.dispose();
    },
  };
});
