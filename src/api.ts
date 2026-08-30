import { call } from "@decky/api";

export interface PluginPaths {
  pluginRoot: string;
  runnerPath: string;
}

export interface GfnPreflight {
  ready: boolean;
  code: string;
  message: string;
}

export interface RunnerBackendState {
  schemaVersion: 1;
  runnerShortcutId: string | null;
}

export interface BuildIdentity {
  schemaVersion: 1;
  source: "development" | "packaged";
  metadataValidated: boolean;
  tag: string | null;
  commit: string | null;
}

export interface BackendPort {
  getPluginPaths(): Promise<PluginPaths>;
  getGfnPreflight(): Promise<GfnPreflight>;
  loadState(): Promise<RunnerBackendState>;
  saveState(runnerShortcutId: string): Promise<RunnerBackendState>;
  clearState(): Promise<RunnerBackendState>;
}

export interface PluginBackendPort extends BackendPort {
  getBuildIdentity(): Promise<BuildIdentity>;
}

export const deckyBackend: PluginBackendPort = {
  getPluginPaths: () => call<[], PluginPaths>("get_plugin_paths"),
  getGfnPreflight: () => call<[], GfnPreflight>("get_gfn_preflight"),
  loadState: () => call<[], RunnerBackendState>("load_state"),
  saveState: (runnerShortcutId) =>
    call<[string], RunnerBackendState>("save_state", runnerShortcutId),
  clearState: () => call<[], RunnerBackendState>("clear_state"),
  getBuildIdentity: () => call<[], BuildIdentity>("get_build_identity"),
};
