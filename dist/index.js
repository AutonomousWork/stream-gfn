const manifest = {"name":"Stream GFN"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const call = api.call;
const routerHook = api.routerHook;
const toaster = api.toaster;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } } return target; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaCloud (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M537.6 226.6c4.1-10.7 6.4-22.4 6.4-34.6 0-53-43-96-96-96-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32c-88.4 0-160 71.6-160 160 0 2.7.1 5.4.2 8.1C40.2 219.8 0 273.2 0 336c0 79.5 64.5 144 144 144h368c70.7 0 128-57.3 128-128 0-61.9-44-113.6-102.4-125.4z"},"child":[]}]})(props);
}

const deckyBackend = {
    getPluginPaths: () => call("get_plugin_paths"),
    getGfnPreflight: () => call("get_gfn_preflight"),
    loadState: () => call("load_state"),
    saveState: (runnerShortcutId) => call("save_state", runnerShortcutId),
    clearState: () => call("clear_state"),
    getBuildIdentity: () => call("get_build_identity"),
};

const UNKNOWN_VERSIONS = {
    steam: "not exposed",
    decky: "not exposed",
};
const normalizeVersion = (value) => {
    if (typeof value !== "string" && typeof value !== "number")
        return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized.slice(0, 120) : null;
};
const readNested = (source, path) => {
    let value = source;
    for (const key of path) {
        if (typeof value !== "object" || value === null || !(key in value))
            return undefined;
        value = value[key];
    }
    return value;
};
const readCompatibilityVersions = (source = globalThis) => {
    const steam = normalizeVersion(readNested(source, ["SteamClient", "System", "version"])) ??
        normalizeVersion(readNested(source, ["navigator", "userAgent"])) ??
        UNKNOWN_VERSIONS.steam;
    const decky = normalizeVersion(readNested(source, ["__DECKY_VERSION__"])) ??
        normalizeVersion(readNested(source, ["DeckyPluginLoader", "version"])) ??
        UNKNOWN_VERSIONS.decky;
    return { steam, decky };
};
const interactionForActivity = (activity) => {
    if (activity === "inactive")
        return "ready";
    if (activity === "active")
        return "active";
    return "unknown";
};
const getLaunchPresentation = (interaction) => {
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
class GfnLaunchController {
    constructor(options) {
        this.options = options;
        this.listeners = new Set();
        this.unsubscribeStatus = null;
        this.refreshPromise = null;
        this.operationPromise = null;
        this.disposed = false;
        this.suppressActivity = false;
        this.libraryDiagnostic = null;
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
    get snapshot() {
        return this.current;
    }
    get canPatchLibrary() {
        return this.capability.available && this.service !== null;
    }
    consumeRunnerRedirect(appId) {
        return this.service?.consumeRunnerRedirect(appId) ?? false;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener();
        return () => this.listeners.delete(listener);
    }
    initialize() {
        return this.refreshCompatibility();
    }
    retryCompatibility() {
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
    reportLibraryCompatibility(report) {
        if ((report.available && this.libraryDiagnostic === null) ||
            (!report.available &&
                this.libraryDiagnostic?.code === report.code &&
                this.libraryDiagnostic.message === report.message)) {
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
    launch() {
        if (this.operationPromise !== null)
            return this.operationPromise;
        if (this.current.interaction !== "ready" || this.service === null) {
            return Promise.resolve();
        }
        const operation = this.performLaunch().catch((error) => {
            this.handleUnexpected(error, "launch");
        });
        this.operationPromise = operation;
        void operation.finally(() => {
            if (this.operationPromise === operation)
                this.operationPromise = null;
        });
        return operation;
    }
    cleanup() {
        if (this.operationPromise !== null)
            return this.operationPromise;
        if (this.service === null) {
            this.options.notify({
                critical: true,
                body: this.current.compatibility.message,
            });
            return Promise.resolve();
        }
        const operation = this.performCleanup().catch((error) => {
            this.handleUnexpected(error, "cleanup");
        });
        this.operationPromise = operation;
        void operation.finally(() => {
            if (this.operationPromise === operation)
                this.operationPromise = null;
        });
        return operation;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.unsubscribeStatus?.();
        this.listeners.clear();
        this.service?.dispose();
    }
    refreshCompatibility() {
        if (this.refreshPromise !== null)
            return this.refreshPromise;
        const refresh = this.performRefresh().catch((error) => {
            this.handleUnexpected(error, "refresh");
        });
        this.refreshPromise = refresh;
        void refresh.finally(() => {
            if (this.refreshPromise === refresh)
                this.refreshPromise = null;
        });
        return refresh;
    }
    async performRefresh() {
        if (this.disposed)
            return;
        this.update({ busy: true });
        const [preflight, buildIdentity] = await Promise.all([
            this.options.backend
                .getGfnPreflight()
                .catch((error) => ({
                ready: false,
                code: "preflight_failed",
                message: error instanceof Error ? error.message : "GFN preflight failed",
            })),
            this.options.backend.getBuildIdentity().catch(() => null),
        ]);
        if (this.disposed)
            return;
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
        if (this.disposed)
            return;
        if (!prepared.ok) {
            this.update({
                busy: false,
                activity: "unknown",
                interaction: prepared.code === "capability_unavailable"
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
    async performLaunch() {
        const service = this.service;
        if (service === null)
            return;
        this.update({ interaction: "starting", busy: true, diagnostic: null });
        const result = await service.launch();
        if (this.disposed)
            return;
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
    async performCleanup() {
        const service = this.service;
        if (service === null)
            return;
        this.update({ busy: true });
        this.suppressActivity = true;
        let result;
        try {
            result = await service.cleanup();
        }
        finally {
            this.suppressActivity = false;
        }
        if (this.disposed)
            return;
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
    handleUnexpected(error, context) {
        if (this.disposed)
            return;
        const diagnostic = error instanceof Error ? error.message : `Unexpected ${context} failure`;
        this.update({
            busy: false,
            interaction: context === "launch" || context === "refresh" ? "ready" : this.current.interaction,
            diagnostic,
        });
        this.options.notify({ critical: true, body: diagnostic });
    }
    handleActivity(activity) {
        if (this.disposed || this.suppressActivity)
            return;
        if (this.current.interaction === "starting" && activity !== "active")
            return;
        this.update({
            activity,
            interaction: this.libraryDiagnostic
                ? "compatibility-unavailable"
                : interactionForActivity(activity),
        });
    }
    subscribeToService() {
        this.unsubscribeStatus =
            this.service?.subscribeStatus((activity) => this.handleActivity(activity)) ?? null;
    }
    compatibilityFrom(diagnostic, versions = {
        steam: this.current.compatibility.steamVersion,
        decky: this.current.compatibility.deckyVersion,
    }) {
        return {
            available: diagnostic.available,
            code: diagnostic.code,
            message: diagnostic.message,
            steamVersion: versions.steam,
            deckyVersion: versions.decky,
        };
    }
    compatibilityFromReport(report) {
        return {
            available: report.available,
            code: report.code,
            message: report.message,
            steamVersion: this.current.compatibility.steamVersion,
            deckyVersion: this.current.compatibility.deckyVersion,
        };
    }
    update(patch) {
        if (this.disposed)
            return;
        this.current = { ...this.current, ...patch };
        for (const listener of this.listeners)
            listener();
    }
}
const GfnLaunchButton = ({ controller }) => {
    const [snapshot, setSnapshot] = SP_REACT.useState(controller.snapshot);
    SP_REACT.useEffect(() => controller.subscribe(() => setSnapshot(controller.snapshot)), [controller]);
    const presentation = getLaunchPresentation(snapshot.interaction);
    const accessibilityProps = {
        "aria-label": presentation.label,
        "data-stream-gfn-action": true,
    };
    return (SP_JSX.jsx(DFL.DialogButton, { ...accessibilityProps, disabled: presentation.disabled, focusable: presentation.focusable, noFocusRing: false, onClick: () => void controller.launch(), children: presentation.label }));
};

const CLEANUP_CONFIRMATION = "Remove only the verified Stream GFN Runner while it is inactive? This does not remove other shortcuts.";
const formatBuildIdentity = (identity) => {
    if (identity === null)
        return "Unavailable";
    const tag = identity.tag ?? "development";
    const commit = identity.commit?.slice(0, 8) ?? "unknown";
    return `${tag} · ${commit}`;
};
const formatRunnerActivity = (activity) => {
    switch (activity) {
        case "inactive":
            return "Inactive";
        case "active":
            return "Active";
        case "unknown":
            return "Unknown";
    }
};
const PluginPanel = ({ controller }) => {
    const [snapshot, setSnapshot] = SP_REACT.useState(controller.snapshot);
    SP_REACT.useEffect(() => controller.subscribe(() => setSnapshot(controller.snapshot)), [controller]);
    const compatibility = snapshot.compatibility.available
        ? "Ready"
        : "Compatibility unavailable";
    const preflight = snapshot.preflight?.ready
        ? "Ready"
        : (snapshot.preflight?.message ?? "Checking…");
    const confirmCleanup = () => {
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { bDestructiveWarning: true, strTitle: "Cleanup Stream GFN Runner?", strDescription: CLEANUP_CONFIRMATION, strOKButtonText: "Cleanup Runner", strCancelButtonText: "Cancel", onOK: () => void controller.cleanup() }));
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Status", spinner: snapshot.busy, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { children: ["Build: ", formatBuildIdentity(snapshot.buildIdentity)] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { children: ["Compatibility: ", compatibility] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { children: ["GeForce NOW: ", preflight] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { children: ["Runner: ", formatRunnerActivity(snapshot.activity)] }) }), snapshot.diagnostic ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { children: snapshot.diagnostic }) })) : null, !snapshot.compatibility.available ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { children: ["Steam: ", snapshot.compatibility.steamVersion, SP_JSX.jsx("br", {}), "Decky: ", snapshot.compatibility.deckyVersion, SP_JSX.jsx("br", {}), "The native library page was left unchanged."] }) })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Maintenance", children: [SP_JSX.jsx(DFL.ButtonItem, { label: "Retry compatibility check", description: "Recheck Steam surfaces, GFN, and the hidden runner", disabled: snapshot.busy, onClick: () => void controller.retryCompatibility() }), SP_JSX.jsx(DFL.ButtonItem, { label: "Cleanup Runner", description: "Remove only the verified plugin-owned hidden shortcut", disabled: snapshot.busy, onClick: confirmCleanup })] })] }));
};

const STEAM_SHORTCUT_APP_TYPE = 1073741824;
const LIBRARY_DETAILS_LAUNCH_SOURCE = 100;
const UINT32_MAX = 4294967295;
class PrivateSteamError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "PrivateSteamError";
    }
}
const DEFAULT_TIMING = {
    pollAttempts: 4,
    pollIntervalMs: 250,
    detailsTimeoutMs: 1000,
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
];
const diagnosticCode = (label) => `missing_${label.replace(/\./g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}`;
const getNested = (source, path) => {
    let value = source;
    for (const part of path) {
        if (typeof value !== "object" || value === null || !(part in value))
            return undefined;
        value = value[part];
    }
    return value;
};
const diagnosePrivateSteam = (source) => {
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
    if (allApps === undefined ||
        allApps === null ||
        typeof allApps[Symbol.iterator] !== "function") {
        return {
            available: false,
            code: "missing_collection_store_inventory",
            message: "Steam compatibility unavailable: collectionStore.deckDesktopApps.allApps is missing",
        };
    }
    return { available: true, code: "ready", message: "Steam compatibility ready" };
};
const parseShortcutId = (value) => {
    if (!/^(?:[1-9][0-9]*)$/.test(value)) {
        throw new PrivateSteamError("invalid_shortcut_id", "runner shortcut ID is not a safe uint32");
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > UINT32_MAX) {
        throw new PrivateSteamError("invalid_shortcut_id", "runner shortcut ID is not a safe uint32");
    }
    return parsed;
};
const shortcutIdFromNumber = (value) => {
    if (!Number.isSafeInteger(value) || value <= 0 || value > UINT32_MAX) {
        throw new PrivateSteamError("invalid_assigned_shortcut_id", "Steam returned a shortcut ID outside safe uint32");
    }
    return String(value);
};
const sleep = (durationMs) => durationMs <= 0
    ? Promise.resolve()
    : new Promise((resolve) => {
        setTimeout(resolve, durationMs);
    });
const isDetailsFor = (value, appId) => value.unAppID === appId &&
    typeof value.strDisplayName === "string" &&
    typeof value.strShortcutExe === "string" &&
    typeof value.strShortcutStartDir === "string" &&
    typeof value.strLaunchOptions === "string" &&
    typeof value.strShortcutLaunchOptions === "string";
const isOverviewFor = (value, appId) => value !== undefined &&
    value.appid === appId &&
    typeof value.display_name === "string" &&
    typeof value.gameid === "string" &&
    value.gameid.length > 0 &&
    typeof value.app_type === "number";
const pathMatches = (expected, actual) => actual === expected || actual === `"${expected}"`;
const hasFingerprint = (shortcut, fingerprint) => shortcut.displayName === fingerprint.displayName &&
    pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
    pathMatches(fingerprint.startDirectory, shortcut.startDirectory) &&
    shortcut.launchOptions === fingerprint.launchOptions &&
    shortcut.shortcutLaunchOptions === fingerprint.shortcutLaunchOptions &&
    shortcut.isNonSteamShortcut;
class BrowserPrivateSteamPort {
    constructor(surface, timing) {
        this.surface = surface;
        this.timing = timing;
        this.diagnostic = {
            available: true,
            code: "ready",
            message: "Steam compatibility ready",
        };
    }
    async listShortcuts() {
        let inventory;
        try {
            inventory = Array.from(this.surface.collectionStore.deckDesktopApps.allApps);
        }
        catch (error) {
            throw new PrivateSteamError("inventory_unreadable", "Steam shortcut inventory is unreadable");
        }
        const ids = inventory.map((item) => {
            if (!Number.isInteger(item.appid)) {
                throw new PrivateSteamError("inventory_unreadable", "Steam shortcut inventory has an invalid ID");
            }
            return shortcutIdFromNumber(item.appid);
        });
        const shortcuts = await Promise.all(ids.map((id) => this.getShortcut(id)));
        if (shortcuts.some((shortcut) => shortcut === null)) {
            throw new PrivateSteamError("inventory_unreadable", "Steam shortcut inventory details are unreadable");
        }
        return shortcuts;
    }
    async getShortcut(runnerShortcutId) {
        const appId = parseShortcutId(runnerShortcutId);
        const overview = this.readOverview(appId);
        if (overview === null)
            return null;
        const details = await this.readDetails(appId);
        if (details === null)
            return null;
        let hidden;
        try {
            hidden = this.surface.collectionStore.BIsHidden(appId);
        }
        catch (error) {
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
    async addShortcut(fingerprint) {
        const id = await this.surface.SteamClient.Apps.AddShortcut(fingerprint.displayName, fingerprint.executablePath, "", "");
        return shortcutIdFromNumber(id);
    }
    async waitForOverview(runnerShortcutId, present) {
        const appId = parseShortcutId(runnerShortcutId);
        return this.poll(() => (this.readOverview(appId) !== null) === present);
    }
    async configureShortcut(runnerShortcutId, fingerprint) {
        const appId = parseShortcutId(runnerShortcutId);
        const apps = this.surface.SteamClient.Apps;
        apps.SetShortcutName(appId, fingerprint.displayName);
        apps.SetShortcutExe(appId, fingerprint.executablePath);
        apps.SetShortcutStartDir(appId, fingerprint.startDirectory);
        apps.SetAppLaunchOptions(appId, fingerprint.launchOptions);
        apps.SetShortcutLaunchOptions(appId, fingerprint.shortcutLaunchOptions);
    }
    async waitForFingerprint(runnerShortcutId, fingerprint) {
        let match = null;
        const matched = await this.poll(async () => {
            match = await this.getShortcut(runnerShortcutId);
            return match !== null && hasFingerprint(match, fingerprint);
        });
        return matched ? match : null;
    }
    async setHidden(runnerShortcutId, hidden) {
        const appId = parseShortcutId(runnerShortcutId);
        try {
            if (this.surface.collectionStore.BIsHidden(appId) !== hidden) {
                this.surface.collectionStore.SetAppsAsHidden([appId], hidden);
            }
            return this.poll(() => this.surface.collectionStore.BIsHidden(appId) === hidden);
        }
        catch (error) {
            return false;
        }
    }
    async removeShortcut(runnerShortcutId) {
        this.surface.SteamClient.Apps.RemoveShortcut(parseShortcutId(runnerShortcutId));
    }
    async waitForAbsence(runnerShortcutId) {
        const appId = parseShortcutId(runnerShortcutId);
        return this.poll(async () => {
            const overviewAbsent = this.readOverview(appId) === null;
            const detailsAbsent = (await this.readDetails(appId)) === null;
            return overviewAbsent && detailsAbsent;
        });
    }
    async readActivity(runnerShortcutId) {
        const details = await this.readDetails(parseShortcutId(runnerShortcutId));
        if (details === null)
            return null;
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
    subscribeLifetime(listener) {
        const unregisterable = this.surface.SteamClient.GameSessions.RegisterForAppLifetimeNotifications((event) => {
            if (typeof event.bRunning !== "boolean")
                return;
            // Steam reports unAppID=0 for non-Steam shortcuts. Treat the event only as
            // a wakeup; RunnerStateTracker confirms the exact runner through AppDetails.
            listener({ running: event.bRunning });
        });
        let active = true;
        return () => {
            if (!active)
                return;
            active = false;
            unregisterable.unregister();
        };
    }
    runGame(runnerGameId64, targetSteamAppId) {
        this.surface.SteamClient.Apps.RunGame(runnerGameId64, targetSteamAppId, -1, LIBRARY_DETAILS_LAUNCH_SOURCE);
    }
    readOverview(appId) {
        const overview = this.surface.appStore.m_mapApps.get(appId);
        return isOverviewFor(overview, appId) ? overview : null;
    }
    async readDetails(appId) {
        return new Promise((resolve) => {
            let completed = false;
            let unregisterable;
            const timeout = setTimeout(() => finish(null), this.timing.detailsTimeoutMs);
            const finish = (value) => {
                if (completed)
                    return;
                completed = true;
                clearTimeout(timeout);
                unregisterable?.unregister();
                resolve(value);
            };
            try {
                unregisterable = this.surface.SteamClient.Apps.RegisterForAppDetails(appId, (details) => {
                    finish(isDetailsFor(details, appId) ? details : null);
                });
                if (completed)
                    unregisterable.unregister();
            }
            catch (_error) {
                finish(null);
            }
        });
    }
    async poll(predicate) {
        for (let attempt = 0; attempt < this.timing.pollAttempts; attempt += 1) {
            if (await predicate())
                return true;
            if (attempt + 1 < this.timing.pollAttempts)
                await sleep(this.timing.pollIntervalMs);
        }
        return false;
    }
}
const createPrivateSteamAdapter = (source = globalThis, timing = {}) => {
    const diagnostic = diagnosePrivateSteam(source);
    if (!diagnostic.available)
        return { diagnostic, port: null };
    const resolvedTiming = { ...DEFAULT_TIMING, ...timing };
    return {
        diagnostic,
        port: new BrowserPrivateSteamPort(source, resolvedTiming),
    };
};

const mapSteamActivity = (state) => {
    if (state === "ReadyToLaunch")
        return "inactive";
    if (state === "Launching" || state === "Running" || state === "Terminating") {
        return "active";
    }
    return "unknown";
};
class RunnerStateTracker {
    constructor(steam) {
        this.steam = steam;
        this.currentActivity = "unknown";
        this.runnerShortcutId = null;
        this.unsubscribeLifetime = null;
        this.listeners = new Set();
        this.launchUnconfirmed = false;
        this.lifecycleGeneration = 0;
        this.cancelPendingLaunch = null;
    }
    get activity() {
        return this.currentActivity;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.currentActivity);
        return () => {
            this.listeners.delete(listener);
        };
    }
    async attach(runnerShortcutId) {
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
    async refresh(runnerShortcutId = this.runnerShortcutId) {
        if (runnerShortcutId === null || this.launchUnconfirmed) {
            this.setActivity("unknown");
            return this.currentActivity;
        }
        return this.refreshForGeneration(runnerShortcutId, this.lifecycleGeneration);
    }
    async launch(identity, targetSteamAppId, notificationTimeoutMs) {
        const generation = this.lifecycleGeneration;
        if (this.launchUnconfirmed) {
            this.setActivity("unknown");
            return { accepted: false, activity: "unknown", reason: "launch_unconfirmed" };
        }
        let settleNotification = null;
        let notificationSettled = false;
        const notification = new Promise((resolve) => {
            settleNotification = (activity) => {
                if (notificationSettled)
                    return;
                notificationSettled = true;
                resolve(activity);
            };
        });
        const unsubscribe = this.steam.subscribeLifetime(() => {
            void this.confirmActive(identity.runnerShortcutId, generation, settleNotification);
        });
        const cancelLaunch = () => settleNotification?.(null);
        this.cancelPendingLaunch = cancelLaunch;
        let snapshot;
        try {
            snapshot = mapSteamActivity(await this.steam.readActivity(identity.runnerShortcutId));
        }
        catch (_error) {
            snapshot = "unknown";
        }
        if (generation !== this.lifecycleGeneration) {
            unsubscribe();
            if (this.cancelPendingLaunch === cancelLaunch)
                this.cancelPendingLaunch = null;
            return { accepted: false, activity: "unknown", reason: "launch_cancelled" };
        }
        this.setActivity(snapshot);
        if (snapshot !== "inactive") {
            unsubscribe();
            if (this.cancelPendingLaunch === cancelLaunch)
                this.cancelPendingLaunch = null;
            return {
                accepted: false,
                activity: snapshot,
                reason: snapshot === "active" ? "runner_active" : "runner_unknown",
            };
        }
        try {
            this.steam.runGame(identity.runnerGameId64, targetSteamAppId);
        }
        catch (_error) {
            unsubscribe();
            if (this.cancelPendingLaunch === cancelLaunch)
                this.cancelPendingLaunch = null;
            this.setActivity("unknown");
            return { accepted: false, activity: "unknown", reason: "launch_error" };
        }
        void this.confirmActive(identity.runnerShortcutId, generation, settleNotification);
        let timeoutId = null;
        const timeout = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve(null), notificationTimeoutMs);
        });
        let confirmedActivity;
        try {
            confirmedActivity = await Promise.race([notification, timeout]);
        }
        finally {
            if (timeoutId !== null)
                clearTimeout(timeoutId);
            unsubscribe();
            if (this.cancelPendingLaunch === cancelLaunch)
                this.cancelPendingLaunch = null;
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
    detach() {
        this.lifecycleGeneration += 1;
        this.cancelPendingLaunch?.();
        this.cancelPendingLaunch = null;
        this.detachLifetime();
        this.runnerShortcutId = null;
        this.launchUnconfirmed = false;
        this.setActivity("unknown");
    }
    async refreshForGeneration(runnerShortcutId, generation) {
        let activity;
        try {
            activity = mapSteamActivity(await this.steam.readActivity(runnerShortcutId));
        }
        catch (_error) {
            activity = "unknown";
        }
        if (generation === this.lifecycleGeneration &&
            runnerShortcutId === this.runnerShortcutId) {
            this.launchUnconfirmed = false;
            this.setActivity(activity);
        }
        return this.currentActivity;
    }
    async confirmActive(runnerShortcutId, generation, settle) {
        if (generation !== this.lifecycleGeneration)
            return;
        let activity;
        try {
            activity = mapSteamActivity(await this.steam.readActivity(runnerShortcutId));
        }
        catch (_error) {
            return;
        }
        if (generation === this.lifecycleGeneration && activity === "active") {
            settle?.("active");
        }
    }
    setActivity(activity) {
        if (activity === this.currentActivity)
            return;
        this.currentActivity = activity;
        for (const listener of this.listeners)
            listener(activity);
    }
    detachLifetime() {
        this.unsubscribeLifetime?.();
        this.unsubscribeLifetime = null;
    }
}

const RUNNER_NAME = "Stream GFN Runner";
const EXPEDITION_33_APP_ID = "1903340";
const DEFAULT_LAUNCH_NOTIFICATION_TIMEOUT_MS = 10000;
const fingerprintFor = (paths) => ({
    displayName: RUNNER_NAME,
    executablePath: paths.runnerPath,
    startDirectory: paths.pluginRoot,
    launchOptions: "",
    shortcutLaunchOptions: "",
});
const hasExactFingerprint = (shortcut, fingerprint) => shortcut.displayName === fingerprint.displayName &&
    pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
    pathMatches(fingerprint.startDirectory, shortcut.startDirectory) &&
    shortcut.launchOptions === "" &&
    shortcut.shortcutLaunchOptions === "" &&
    shortcut.isNonSteamShortcut;
const isNearMatch = (shortcut, fingerprint) => !hasExactFingerprint(shortcut, fingerprint) &&
    (shortcut.displayName === fingerprint.displayName ||
        pathMatches(fingerprint.executablePath, shortcut.executablePath) ||
        pathMatches(fingerprint.startDirectory, shortcut.startDirectory));
const isRepairableOwnedRunner = (shortcut, fingerprint) => shortcut.displayName === fingerprint.displayName &&
    pathMatches(fingerprint.executablePath, shortcut.executablePath) &&
    (shortcut.startDirectory === "" ||
        pathMatches(fingerprint.startDirectory, shortcut.startDirectory)) &&
    shortcut.launchOptions === "" &&
    shortcut.shortcutLaunchOptions === "" &&
    shortcut.isNonSteamShortcut &&
    shortcut.runnerGameId64.length > 0;
const inspectInventory = (inventory, fingerprint) => ({
    exact: inventory.filter((shortcut) => hasExactFingerprint(shortcut, fingerprint)),
    near: inventory.filter((shortcut) => isNearMatch(shortcut, fingerprint)),
});
const failure = (code, diagnostic) => ({
    ok: false,
    code,
    diagnostic,
});
const identityOf = (shortcut) => ({
    runnerShortcutId: shortcut.runnerShortcutId,
    runnerGameId64: shortcut.runnerGameId64,
});
const repairableOwnedCandidate = (inspection, fingerprint) => {
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
const repairOwnedRunner = async (backend, steam, candidate, fingerprint, canContinue) => {
    try {
        if (!canContinue())
            throw new Error("Runner preparation was cancelled");
        await steam.configureShortcut(candidate.runnerShortcutId, fingerprint);
        const configured = await steam.waitForFingerprint(candidate.runnerShortcutId, fingerprint);
        if (configured === null)
            throw new Error("Steam did not repair the runner fingerprint");
        if (!(await steam.setHidden(candidate.runnerShortcutId, true))) {
            throw new Error("Steam did not verify the repaired runner as hidden");
        }
        const finalInventory = inspectInventory(await steam.listShortcuts(), fingerprint);
        if (!canContinue())
            throw new Error("Runner preparation was cancelled");
        const repaired = finalInventory.exact[0];
        if (finalInventory.near.length > 0 ||
            finalInventory.exact.length !== 1 ||
            repaired?.runnerShortcutId !== candidate.runnerShortcutId ||
            repaired.runnerGameId64.length === 0 ||
            !repaired.hidden) {
            throw new Error("Steam did not verify one unique repaired runner");
        }
        await backend.saveState(repaired.runnerShortcutId);
        return {
            ok: true,
            runner: identityOf(repaired),
            created: false,
            recovered: true,
        };
    }
    catch (error) {
        return failure("repair_failed", error instanceof Error ? error.message : "Runner repair failed");
    }
};
const requireUnambiguousOwned = (inspection) => {
    if (inspection.exact.length > 1 || inspection.near.length > 0) {
        return {
            runner: null,
            error: failure("ambiguous_runner", "Steam contains duplicate or partial Stream GFN runner matches; nothing was changed"),
        };
    }
    const runner = inspection.exact[0] ?? null;
    if (runner !== null && !runner.hidden) {
        return {
            runner: null,
            error: failure("hidden_state_mismatch", "The exact Stream GFN runner is not verifiably hidden; nothing was changed"),
        };
    }
    return { runner, error: null };
};
const rollbackCreatedRunner = async (steam, runnerShortcutId, fingerprint) => {
    try {
        const verified = await steam.waitForFingerprint(runnerShortcutId, fingerprint);
        if (verified === null || !hasExactFingerprint(verified, fingerprint))
            return;
        await steam.removeShortcut(runnerShortcutId);
        await steam.waitForAbsence(runnerShortcutId);
    }
    catch (_error) {
        // Best effort only: never broaden rollback from this attempt's exact candidate.
    }
};
const prepareRunner = async (backend, steam, canContinue = () => true) => {
    if (!steam.diagnostic.available) {
        return failure("capability_unavailable", steam.diagnostic.message);
    }
    let paths;
    let savedId;
    let inventory;
    try {
        const [resolvedPaths, state, resolvedInventory] = await Promise.all([
            backend.getPluginPaths(),
            backend.loadState(),
            steam.listShortcuts(),
        ]);
        paths = resolvedPaths;
        savedId = state.runnerShortcutId;
        inventory = resolvedInventory;
    }
    catch (error) {
        return failure("inventory_unreadable", error instanceof Error ? error.message : "Steam shortcut inventory is unreadable");
    }
    if (!canContinue())
        return failure("operation_cancelled", "Runner preparation was cancelled");
    const fingerprint = fingerprintFor(paths);
    const inspection = inspectInventory(inventory, fingerprint);
    const repairable = repairableOwnedCandidate(inspection, fingerprint);
    if (repairable !== null) {
        return repairOwnedRunner(backend, steam, repairable, fingerprint, canContinue);
    }
    const resolved = requireUnambiguousOwned(inspection);
    if (resolved.error !== null)
        return resolved.error;
    if (savedId !== null) {
        try {
            const saved = await steam.getShortcut(savedId);
            if (saved !== null &&
                hasExactFingerprint(saved, fingerprint) &&
                saved.hidden &&
                resolved.runner?.runnerShortcutId === saved.runnerShortcutId) {
                if (!canContinue()) {
                    return failure("operation_cancelled", "Runner preparation was cancelled");
                }
                return { ok: true, runner: identityOf(saved), created: false, recovered: false };
            }
        }
        catch (error) {
            return failure("invalid_saved_runner", error instanceof Error ? error.message : "Saved runner identity is invalid");
        }
    }
    if (resolved.runner !== null) {
        try {
            if (!canContinue()) {
                return failure("operation_cancelled", "Runner preparation was cancelled");
            }
            await backend.saveState(resolved.runner.runnerShortcutId);
        }
        catch (error) {
            return failure("state_save_failed", error instanceof Error ? error.message : "Runner state could not be saved");
        }
        return {
            ok: true,
            runner: identityOf(resolved.runner),
            created: false,
            recovered: true,
        };
    }
    let createdId = null;
    try {
        if (!canContinue())
            throw new Error("Runner preparation was cancelled");
        createdId = await steam.addShortcut(fingerprint);
        if (!canContinue())
            throw new Error("Runner preparation was cancelled");
        if (!(await steam.waitForOverview(createdId, true))) {
            throw new Error("Steam did not publish the new runner overview");
        }
        await steam.configureShortcut(createdId, fingerprint);
        if (!canContinue())
            throw new Error("Runner preparation was cancelled");
        const configured = await steam.waitForFingerprint(createdId, fingerprint);
        if (configured === null)
            throw new Error("Steam did not retain the exact runner fingerprint");
        if (!(await steam.setHidden(createdId, true))) {
            throw new Error("Steam did not verify the runner as hidden");
        }
        const hidden = await steam.getShortcut(createdId);
        if (hidden === null || !hasExactFingerprint(hidden, fingerprint) || !hidden.hidden) {
            throw new Error("Steam did not reverify the hidden runner fingerprint");
        }
        const finalInventory = inspectInventory(await steam.listShortcuts(), fingerprint);
        if (!canContinue())
            throw new Error("Runner preparation was cancelled");
        if (finalInventory.near.length > 0 ||
            finalInventory.exact.length !== 1 ||
            finalInventory.exact[0]?.runnerShortcutId !== createdId ||
            finalInventory.exact[0]?.runnerGameId64.length === 0 ||
            !finalInventory.exact[0]?.hidden) {
            throw new Error("Steam did not verify one unique hidden runner");
        }
        await backend.saveState(createdId);
        return {
            ok: true,
            runner: identityOf(finalInventory.exact[0]),
            created: true,
            recovered: false,
        };
    }
    catch (error) {
        if (createdId !== null)
            await rollbackCreatedRunner(steam, createdId, fingerprint);
        return failure("create_failed", error instanceof Error ? error.message : "Runner creation failed");
    }
};
const cleanupRunner = async (backend, steam) => {
    if (!steam.diagnostic.available) {
        return { ok: false, code: "capability_unavailable", diagnostic: steam.diagnostic.message };
    }
    let fingerprint;
    let inspection;
    try {
        const [paths, inventory] = await Promise.all([
            backend.getPluginPaths(),
            steam.listShortcuts(),
        ]);
        fingerprint = fingerprintFor(paths);
        inspection = inspectInventory(inventory, fingerprint);
    }
    catch (error) {
        return {
            ok: false,
            code: "inventory_unreadable",
            diagnostic: error instanceof Error ? error.message : "Steam shortcut inventory is unreadable",
        };
    }
    const resolved = requireUnambiguousOwned(inspection);
    if (resolved.error !== null)
        return resolved.error;
    if (resolved.runner === null) {
        await backend.clearState();
        return { ok: true, outcome: "no_owned_runner" };
    }
    let activity;
    try {
        activity = mapSteamActivity(await steam.readActivity(resolved.runner.runnerShortcutId));
    }
    catch (_error) {
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
    }
    catch (error) {
        return {
            ok: false,
            code: "cleanup_failed",
            diagnostic: error instanceof Error ? error.message : "Runner cleanup failed",
        };
    }
};
class RunnerService {
    constructor(backend, steam, notificationTimeoutMs = DEFAULT_LAUNCH_NOTIFICATION_TIMEOUT_MS) {
        this.backend = backend;
        this.steam = steam;
        this.notificationTimeoutMs = notificationTimeoutMs;
        this.prepared = null;
        this.pendingRunnerRedirect = null;
        this.disposed = false;
        this.lifecycleGeneration = 0;
        this.state = new RunnerStateTracker(steam);
    }
    get activity() {
        return this.state.activity;
    }
    subscribeStatus(listener) {
        return this.state.subscribe(listener);
    }
    consumeRunnerRedirect(appId) {
        const pending = this.pendingRunnerRedirect;
        if (pending === null)
            return false;
        if (Date.now() > pending.expiresAt) {
            this.pendingRunnerRedirect = null;
            return false;
        }
        if (!Number.isInteger(appId) || String(appId) !== pending.shortcutId)
            return false;
        this.pendingRunnerRedirect = null;
        return true;
    }
    async prepare() {
        if (this.disposed)
            return this.disposedPrepareFailure();
        const generation = this.lifecycleGeneration;
        const result = await prepareRunner(this.backend, this.steam, () => this.isCurrent(generation));
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
        }
        else {
            await this.state.attach(result.runner.runnerShortcutId);
        }
        if (!this.isCurrent(generation)) {
            this.state.detach();
            return this.disposedPrepareFailure();
        }
        this.prepared = result.runner;
        return result;
    }
    async launch() {
        if (this.disposed)
            return this.disposedLaunchFailure();
        const generation = this.lifecycleGeneration;
        let preflight;
        try {
            preflight = await this.backend.getGfnPreflight();
        }
        catch (error) {
            return {
                ok: false,
                code: "preflight_failed",
                diagnostic: error instanceof Error ? error.message : "GFN preflight failed",
                activity: "unknown",
            };
        }
        if (!this.isCurrent(generation))
            return this.disposedLaunchFailure();
        if (!preflight.ready) {
            return {
                ok: false,
                code: preflight.code,
                diagnostic: preflight.message,
                activity: "unknown",
            };
        }
        const prepared = await this.prepare();
        if (!this.isCurrent(generation))
            return this.disposedLaunchFailure();
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
            expiresAt: Date.now() + Math.max(this.notificationTimeoutMs, 5000),
        };
        this.pendingRunnerRedirect = pendingRedirect;
        const launched = await this.state.launch(runner, EXPEDITION_33_APP_ID, this.notificationTimeoutMs);
        if (!launched.accepted && this.pendingRunnerRedirect === pendingRedirect) {
            this.pendingRunnerRedirect = null;
        }
        if (!this.isCurrent(generation))
            return this.disposedLaunchFailure();
        return { ok: true, ...launched };
    }
    async cleanup() {
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
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.lifecycleGeneration += 1;
        this.prepared = null;
        this.pendingRunnerRedirect = null;
        this.state.detach();
    }
    isCurrent(generation) {
        return !this.disposed && generation === this.lifecycleGeneration;
    }
    disposedPrepareFailure() {
        return failure("service_disposed", "Runner service was disposed");
    }
    disposedLaunchFailure() {
        return {
            ok: false,
            code: "service_disposed",
            diagnostic: "Runner service was disposed",
            activity: "unknown",
        };
    }
}
const createRunnerRuntime = (backend, source = globalThis, options = {}) => {
    const adapter = createPrivateSteamAdapter(source, options.steamTiming);
    return {
        diagnostic: adapter.diagnostic,
        service: adapter.port === null
            ? null
            : new RunnerService(backend, adapter.port, options.launchNotificationTimeoutMs),
    };
};

const EXPEDITION_33_APP_ID_NUMBER = Number(EXPEDITION_33_APP_ID);
const LIBRARY_APP_ROUTE = "/library/app/:appid";
const LIBRARY_ACTION_MARKER = "data-stream-gfn-action";
const isExpedition33AppId = (value) => Number.isInteger(value) && value === EXPEDITION_33_APP_ID_NUMBER;
const findTreeNode = (root, predicate) => {
    const seen = new Set();
    const visit = (value) => {
        if (typeof value !== "object" || value === null)
            return null;
        if (seen.has(value))
            return null;
        seen.add(value);
        if (Array.isArray(value)) {
            for (const item of value) {
                const match = visit(item);
                if (match !== null)
                    return match;
            }
            return null;
        }
        const node = value;
        if (predicate(node))
            return node;
        for (const child of [node.props, node.props?.children, node.child, node.sibling]) {
            const match = visit(child);
            if (match !== null)
                return match;
        }
        return null;
    };
    return visit(root);
};
const isMarkedAction = (value) => typeof value === "object" &&
    value !== null &&
    value.props?.[LIBRARY_ACTION_MARKER] === true;
const injectLibraryAction = (renderedTree, appId, action, innerContainerClass) => {
    if (!isExpedition33AppId(appId))
        return "not-target";
    if (innerContainerClass.length === 0)
        return "missing-action-area";
    const parent = findTreeNode(renderedTree, (node) => {
        const className = node.props?.className;
        return (typeof className === "string" &&
            className.includes(innerContainerClass) &&
            Array.isArray(node.props?.children));
    });
    const children = parent?.props?.children;
    if (!Array.isArray(children))
        return "missing-action-area";
    if (children.some(isMarkedAction))
        return "already-present";
    const appPanelIndex = children.findIndex((value) => {
        if (typeof value !== "object" || value === null)
            return false;
        const props = value.props;
        const panelProps = props?.children?.props;
        return (props?.childFocusDisabled !== undefined &&
            props.navRef !== undefined &&
            panelProps?.details !== undefined &&
            panelProps.overview !== undefined &&
            panelProps.bFastRender !== undefined);
    });
    if (appPanelIndex < 0)
        return "missing-action-area";
    try {
        children.splice(appPanelIndex, 0, action);
    }
    catch (_error) {
        return "missing-action-area";
    }
    return "injected";
};
const defaultDependencies = (controller) => ({
    route: routerHook,
    findInReactTree: DFL.findInReactTree,
    afterPatch: DFL.afterPatch,
    createReactTreePatcher: DFL.createReactTreePatcher,
    innerContainerClass: DFL.appDetailsClasses?.InnerContainer ?? "",
    createAction: () => {
        const markerProps = { [LIBRARY_ACTION_MARKER]: true };
        return SP_JSX.jsx(GfnLaunchButton, { ...markerProps, controller: controller });
    },
    navigateBack: () => DFL.Navigation.NavigateBack(),
});
const installLibraryAppPatch = (controller, injectedDependencies) => {
    const dependencies = defaultDependencies(controller);
    if (dependencies.innerContainerClass.length === 0 ||
        typeof dependencies.route.addPatch !== "function" ||
        typeof dependencies.route.removePatch !== "function") {
        controller.reportLibraryCompatibility({
            available: false,
            code: "missing_library_patch_surface",
            message: "Compatibility unavailable: Steam library action surface is missing",
        });
        return { dispose: () => undefined };
    }
    let disposed = false;
    const patchedRenderSurfaces = new WeakSet();
    const nestedPatches = new Set();
    const patchRoute = (tree) => {
        if (!controller.canPatchLibrary)
            return tree;
        const routeProps = dependencies.findInReactTree(tree, (node) => typeof node === "object" &&
            node !== null &&
            typeof node.renderFunc === "function");
        if (typeof routeProps !== "object" || routeProps === null) {
            controller.reportLibraryCompatibility({
                available: false,
                code: "missing_library_render_surface",
                message: "Compatibility unavailable: Steam library render surface is missing",
            });
            return tree;
        }
        if (patchedRenderSurfaces.has(routeProps))
            return tree;
        try {
            let appId;
            const renderPatch = dependencies.createReactTreePatcher([
                (renderTree) => {
                    const carrier = dependencies.findInReactTree(renderTree, (node) => {
                        if (typeof node !== "object" || node === null)
                            return false;
                        const children = node.props?.children;
                        return (typeof children === "object" &&
                            children !== null &&
                            typeof children.props?.overview === "object");
                    });
                    const children = carrier?.props?.children;
                    appId = children?.props?.overview?.appid;
                    return children ?? null;
                },
            ], (_args, renderedTree) => {
                if (controller.consumeRunnerRedirect(appId)) {
                    dependencies.navigateBack();
                    return renderedTree;
                }
                const result = injectLibraryAction(renderedTree, appId, dependencies.createAction(controller), dependencies.innerContainerClass);
                if (result === "missing-action-area") {
                    controller.reportLibraryCompatibility({
                        available: false,
                        code: "missing_library_action_area",
                        message: "Compatibility unavailable: Steam library action area is missing",
                    });
                }
                else if (result === "injected" || result === "already-present") {
                    controller.reportLibraryCompatibility({
                        available: true,
                        code: "ready",
                        message: "Steam library action ready",
                    });
                }
                return renderedTree;
            }, "StreamGFNLibraryAction");
            const nestedPatch = dependencies.afterPatch(routeProps, "renderFunc", renderPatch);
            if (typeof nestedPatch === "object" &&
                nestedPatch !== null &&
                typeof nestedPatch.unpatch === "function") {
                nestedPatches.add(nestedPatch);
            }
            patchedRenderSurfaces.add(routeProps);
        }
        catch (_error) {
            controller.reportLibraryCompatibility({
                available: false,
                code: "library_patch_failed",
                message: "Compatibility unavailable: Steam library action patch failed safely",
            });
        }
        return tree;
    };
    let routePatch;
    try {
        routePatch = dependencies.route.addPatch(LIBRARY_APP_ROUTE, patchRoute);
    }
    catch (_error) {
        controller.reportLibraryCompatibility({
            available: false,
            code: "library_route_registration_failed",
            message: "Compatibility unavailable: Steam library route patch could not be registered",
        });
        return { dispose: () => undefined };
    }
    return {
        dispose: () => {
            if (disposed)
                return;
            disposed = true;
            try {
                dependencies.route.removePatch(LIBRARY_APP_ROUTE, routePatch);
            }
            catch (_error) {
                // The nested render patches are still explicitly released below.
            }
            for (const patch of nestedPatches) {
                if (patch.hasUnpatched)
                    continue;
                try {
                    patch.unpatch();
                }
                catch (_error) {
                    // Another plugin may already have released the shared render surface.
                }
            }
            nestedPatches.clear();
        },
    };
};

const PLUGIN_NAME = "Stream GFN";
var index = definePlugin(() => {
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
                duration: critical ? 8000 : 4000,
            });
        },
    });
    const libraryPatch = installLibraryAppPatch(controller);
    void controller.initialize();
    return {
        name: PLUGIN_NAME,
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: PLUGIN_NAME }),
        content: SP_JSX.jsx(PluginPanel, { controller: controller }),
        icon: SP_JSX.jsx(FaCloud, {}),
        onDismount() {
            libraryPatch.dispose();
            controller.dispose();
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
