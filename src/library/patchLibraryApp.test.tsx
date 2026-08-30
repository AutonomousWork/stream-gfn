import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/api", () => ({
  routerHook: { addPatch: vi.fn(), removePatch: vi.fn() },
}));

vi.mock("@decky/ui", () => ({
  DialogButton: () => null,
  afterPatch: vi.fn(),
  appDetailsClasses: { InnerContainer: "SteamInnerContainer" },
  createReactTreePatcher: vi.fn(),
  findInReactTree: vi.fn(),
}));

import {
  EXPEDITION_33_APP_ID_NUMBER,
  LIBRARY_ACTION_MARKER,
  injectLibraryAction,
  installLibraryAppPatch,
  isExpedition33AppId,
  type LibraryPatchController,
  type LibraryPatchDependencies,
} from "./patchLibraryApp";

const action = { props: { [LIBRARY_ACTION_MARKER]: true } };

const libraryTree = () => {
  const nativeAction = { props: { id: "native-play" } };
  const appPanel = {
    props: {
      childFocusDisabled: false,
      navRef: {},
      children: {
        props: { details: {}, overview: {}, bFastRender: false },
      },
    },
  };
  const parent = {
    props: {
      className: "SteamInnerContainer extra",
      children: [nativeAction, appPanel] as unknown[],
    },
  };
  return { tree: { props: { children: parent } }, parent, nativeAction, appPanel };
};

describe("Expedition 33 library action patch", () => {
  it("accepts only the exact numeric Expedition 33 AppID", () => {
    expect(isExpedition33AppId(EXPEDITION_33_APP_ID_NUMBER)).toBe(true);
    expect(isExpedition33AppId(1903341)).toBe(false);
    expect(isExpedition33AppId("1903340")).toBe(false);
    expect(isExpedition33AppId(Number.NaN)).toBe(false);
    expect(isExpedition33AppId(null)).toBe(false);
  });

  it("injects once immediately before Steam's current app-panel wrapper", () => {
    const { tree, parent, nativeAction, appPanel } = libraryTree();

    expect(
      injectLibraryAction(tree, EXPEDITION_33_APP_ID_NUMBER, action, "SteamInnerContainer"),
    ).toBe("injected");
    expect(parent.props.children).toEqual([nativeAction, action, appPanel]);
    expect(
      injectLibraryAction(tree, EXPEDITION_33_APP_ID_NUMBER, action, "SteamInnerContainer"),
    ).toBe("already-present");
    expect(parent.props.children.filter((item) => item === action)).toHaveLength(1);
  });

  it.each([1903341, "1903340", undefined])(
    "leaves the native page untouched for unsupported or malformed AppID %j",
    (appId) => {
      const { tree, parent, nativeAction } = libraryTree();

      expect(injectLibraryAction(tree, appId, action, "SteamInnerContainer")).toBe("not-target");
      expect(parent.props.children).toEqual([nativeAction, expect.any(Object)]);
    },
  );

  it("fails closed and reports a missing library action surface", () => {
    const tree = { props: { children: [{ props: { id: "native-play" } }] } };

    expect(
      injectLibraryAction(tree, EXPEDITION_33_APP_ID_NUMBER, action, "SteamInnerContainer"),
    ).toBe("missing-action-area");
    expect(tree).toEqual({ props: { children: [{ props: { id: "native-play" } }] } });
  });

  it("registers and removes the guarded route patch without invoking runner cleanup", () => {
    let registeredPatch: unknown;
    const dependencies: LibraryPatchDependencies = {
      route: {
        addPatch: vi.fn((_path, patch) => {
          registeredPatch = patch;
          return patch;
        }),
        removePatch: vi.fn(),
      },
      findInReactTree: vi.fn(),
      afterPatch: vi.fn(),
      createReactTreePatcher: vi.fn(),
      innerContainerClass: "SteamInnerContainer",
      createAction: vi.fn(() => action),
    };
    const controller: LibraryPatchController = {
      canPatchLibrary: true,
      reportLibraryCompatibility: vi.fn(),
    };

    const handle = installLibraryAppPatch(controller, dependencies);
    handle.dispose();

    expect(dependencies.route.addPatch).toHaveBeenCalledWith(
      "/library/app/:appid",
      expect.any(Function),
    );
    expect(dependencies.route.removePatch).toHaveBeenCalledWith(
      "/library/app/:appid",
      registeredPatch,
    );
  });

  it("registers a dormant patch but leaves the page untouched while runtime is incompatible", () => {
    let routePatch: ((tree: unknown) => unknown) | undefined;
    const dependencies: LibraryPatchDependencies = {
      route: {
        addPatch: vi.fn((_path, patch) => {
          routePatch = patch;
          return patch;
        }),
        removePatch: vi.fn(),
      },
      findInReactTree: vi.fn(),
      afterPatch: vi.fn(),
      createReactTreePatcher: vi.fn(),
      innerContainerClass: "SteamInnerContainer",
      createAction: vi.fn(() => action),
    };
    const controller: LibraryPatchController = {
      canPatchLibrary: false,
      reportLibraryCompatibility: vi.fn(),
    };

    const tree = { props: { children: "native" } };
    const handle = installLibraryAppPatch(controller, dependencies);
    expect(routePatch?.(tree)).toBe(tree);
    handle.dispose();

    expect(dependencies.route.addPatch).toHaveBeenCalledTimes(1);
    expect(dependencies.findInReactTree).not.toHaveBeenCalled();
    expect(dependencies.createAction).not.toHaveBeenCalled();
  });

  it("leaves an unknown route tree unchanged and reports the missing render surface", () => {
    let routePatch: ((tree: unknown) => unknown) | undefined;
    const dependencies: LibraryPatchDependencies = {
      route: {
        addPatch: vi.fn((_path, patch) => {
          routePatch = patch;
          return patch;
        }),
        removePatch: vi.fn(),
      },
      findInReactTree: vi.fn(() => undefined),
      afterPatch: vi.fn(),
      createReactTreePatcher: vi.fn(),
      innerContainerClass: "SteamInnerContainer",
      createAction: vi.fn(() => action),
    };
    const controller: LibraryPatchController = {
      canPatchLibrary: true,
      reportLibraryCompatibility: vi.fn(),
    };
    const tree = { props: { children: "native" } };
    installLibraryAppPatch(controller, dependencies);

    expect(routePatch?.(tree)).toBe(tree);
    expect(dependencies.afterPatch).not.toHaveBeenCalled();
    expect(controller.reportLibraryCompatibility).toHaveBeenCalledWith(
      expect.objectContaining({ available: false, code: "missing_library_render_surface" }),
    );
  });
});
