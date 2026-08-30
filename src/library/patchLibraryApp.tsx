import { routerHook } from "@decky/api";
import {
  Navigation,
  afterPatch,
  appDetailsClasses,
  createReactTreePatcher,
  findInReactTree,
} from "@decky/ui";
import type { ReactElement } from "react";

import {
  GfnLaunchButton,
  type GfnLaunchController,
  type LibraryCompatibilityReport,
} from "../components/GfnLaunchButton";
import { EXPEDITION_33_APP_ID } from "../steam/runnerShortcut";

export const EXPEDITION_33_APP_ID_NUMBER = Number(EXPEDITION_33_APP_ID);
export const LIBRARY_APP_ROUTE = "/library/app/:appid";
export const LIBRARY_ACTION_MARKER = "data-stream-gfn-action";

type TreeNode = {
  props?: Record<string, unknown> & {
    children?: unknown;
    className?: unknown;
  };
  child?: unknown;
  sibling?: unknown;
};

export interface LibraryPatchController {
  readonly canPatchLibrary: boolean;
  consumeRunnerRedirect(appId: unknown): boolean;
  reportLibraryCompatibility(report: LibraryCompatibilityReport): void;
}

type RoutePatch = (route: unknown) => unknown;
type NestedPatch = {
  hasUnpatched?: boolean;
  unpatch(): void;
};

export interface LibraryPatchDependencies {
  route: {
    addPatch(path: string, patch: RoutePatch): RoutePatch;
    removePatch(path: string, patch: RoutePatch): void;
  };
  findInReactTree(tree: unknown, predicate: (node: unknown) => boolean): unknown;
  afterPatch(
    object: Record<string, unknown>,
    property: string,
    handler: (args: unknown[], result: unknown) => unknown,
  ): unknown;
  createReactTreePatcher(
    steps: Array<(tree: unknown) => unknown>,
    handler: (args: unknown[], result: unknown) => unknown,
    debugName?: string,
  ): (args: unknown[], result: unknown) => unknown;
  innerContainerClass: string;
  createAction(controller: LibraryPatchController): ReactElement | object;
  navigateBack(): void;
}

export interface LibraryPatchHandle {
  dispose(): void;
}

export type LibraryInjectionResult =
  | "injected"
  | "already-present"
  | "not-target"
  | "missing-action-area";

export const isExpedition33AppId = (value: unknown): value is number =>
  Number.isInteger(value) && value === EXPEDITION_33_APP_ID_NUMBER;

const findTreeNode = (
  root: unknown,
  predicate: (node: TreeNode) => boolean,
): TreeNode | null => {
  const seen = new Set<object>();
  const visit = (value: unknown): TreeNode | null => {
    if (typeof value !== "object" || value === null) return null;
    if (seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const match = visit(item);
        if (match !== null) return match;
      }
      return null;
    }
    const node = value as TreeNode;
    if (predicate(node)) return node;
    for (const child of [node.props, node.props?.children, node.child, node.sibling]) {
      const match = visit(child);
      if (match !== null) return match;
    }
    return null;
  };
  return visit(root);
};

const isMarkedAction = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  (value as TreeNode).props?.[LIBRARY_ACTION_MARKER] === true;

export const injectLibraryAction = (
  renderedTree: unknown,
  appId: unknown,
  action: ReactElement | object,
  innerContainerClass: string,
): LibraryInjectionResult => {
  if (!isExpedition33AppId(appId)) return "not-target";
  if (innerContainerClass.length === 0) return "missing-action-area";

  const parent = findTreeNode(renderedTree, (node) => {
    const className = node.props?.className;
    return (
      typeof className === "string" &&
      className.includes(innerContainerClass) &&
      Array.isArray(node.props?.children)
    );
  });
  const children = parent?.props?.children;
  if (!Array.isArray(children)) return "missing-action-area";
  if (children.some(isMarkedAction)) return "already-present";

  const appPanelIndex = children.findIndex((value) => {
    if (typeof value !== "object" || value === null) return false;
    const props = (value as TreeNode).props;
    const panelProps = (props?.children as TreeNode | undefined)?.props;
    return (
      props?.childFocusDisabled !== undefined &&
      props.navRef !== undefined &&
      panelProps?.details !== undefined &&
      panelProps.overview !== undefined &&
      panelProps.bFastRender !== undefined
    );
  });
  if (appPanelIndex < 0) return "missing-action-area";
  try {
    children.splice(appPanelIndex, 0, action);
  } catch (_error) {
    return "missing-action-area";
  }
  return "injected";
};

const defaultDependencies = (controller: LibraryPatchController): LibraryPatchDependencies => ({
  route: routerHook,
  findInReactTree,
  afterPatch,
  createReactTreePatcher,
  innerContainerClass: appDetailsClasses?.InnerContainer ?? "",
  createAction: () => {
    const markerProps = { [LIBRARY_ACTION_MARKER]: true };
    return <GfnLaunchButton {...markerProps} controller={controller as GfnLaunchController} />;
  },
  navigateBack: () => Navigation.NavigateBack(),
});

export const installLibraryAppPatch = (
  controller: LibraryPatchController,
  injectedDependencies?: LibraryPatchDependencies,
): LibraryPatchHandle => {
  const dependencies = injectedDependencies ?? defaultDependencies(controller);
  if (
    dependencies.innerContainerClass.length === 0 ||
    typeof dependencies.route.addPatch !== "function" ||
    typeof dependencies.route.removePatch !== "function"
  ) {
    controller.reportLibraryCompatibility({
      available: false,
      code: "missing_library_patch_surface",
      message: "Compatibility unavailable: Steam library action surface is missing",
    });
    return { dispose: () => undefined };
  }

  let disposed = false;
  const patchedRenderSurfaces = new WeakSet<object>();
  const nestedPatches = new Set<NestedPatch>();
  const patchRoute = (tree: unknown): unknown => {
    if (!controller.canPatchLibrary) return tree;
    const routeProps = dependencies.findInReactTree(
      tree,
      (node) =>
        typeof node === "object" &&
        node !== null &&
        typeof (node as { renderFunc?: unknown }).renderFunc === "function",
    ) as Record<string, unknown> | null;
    if (typeof routeProps !== "object" || routeProps === null) {
      controller.reportLibraryCompatibility({
        available: false,
        code: "missing_library_render_surface",
        message: "Compatibility unavailable: Steam library render surface is missing",
      });
      return tree;
    }
    if (patchedRenderSurfaces.has(routeProps)) return tree;

    try {
      let appId: unknown;
      const renderPatch = dependencies.createReactTreePatcher(
        [
          (renderTree) => {
            const carrier = dependencies.findInReactTree(renderTree, (node) => {
              if (typeof node !== "object" || node === null) return false;
              const children = (node as TreeNode).props?.children;
              return (
                typeof children === "object" &&
                children !== null &&
                typeof (children as TreeNode).props?.overview === "object"
              );
            }) as TreeNode | null;
            const children = carrier?.props?.children as TreeNode | undefined;
            appId = (children?.props?.overview as { appid?: unknown } | undefined)?.appid;
            return children ?? null;
          },
        ],
        (_args, renderedTree) => {
          if (controller.consumeRunnerRedirect(appId)) {
            dependencies.navigateBack();
            return renderedTree;
          }
          const result = injectLibraryAction(
            renderedTree,
            appId,
            dependencies.createAction(controller),
            dependencies.innerContainerClass,
          );
          if (result === "missing-action-area") {
            controller.reportLibraryCompatibility({
              available: false,
              code: "missing_library_action_area",
              message: "Compatibility unavailable: Steam library action area is missing",
            });
          } else if (result === "injected" || result === "already-present") {
            controller.reportLibraryCompatibility({
              available: true,
              code: "ready",
              message: "Steam library action ready",
            });
          }
          return renderedTree;
        },
        "StreamGFNLibraryAction",
      );
      const nestedPatch = dependencies.afterPatch(routeProps, "renderFunc", renderPatch);
      if (
        typeof nestedPatch === "object" &&
        nestedPatch !== null &&
        typeof (nestedPatch as { unpatch?: unknown }).unpatch === "function"
      ) {
        nestedPatches.add(nestedPatch as NestedPatch);
      }
      patchedRenderSurfaces.add(routeProps);
    } catch (_error) {
      controller.reportLibraryCompatibility({
        available: false,
        code: "library_patch_failed",
        message: "Compatibility unavailable: Steam library action patch failed safely",
      });
    }
    return tree;
  };

  let routePatch: RoutePatch;
  try {
    routePatch = dependencies.route.addPatch(LIBRARY_APP_ROUTE, patchRoute);
  } catch (_error) {
    controller.reportLibraryCompatibility({
      available: false,
      code: "library_route_registration_failed",
      message: "Compatibility unavailable: Steam library route patch could not be registered",
    });
    return { dispose: () => undefined };
  }

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      try {
        dependencies.route.removePatch(LIBRARY_APP_ROUTE, routePatch);
      } catch (_error) {
        // The nested render patches are still explicitly released below.
      }
      for (const patch of nestedPatches) {
        if (patch.hasUnpatched) continue;
        try {
          patch.unpatch();
        } catch (_error) {
          // Another plugin may already have released the shared render surface.
        }
      }
      nestedPatches.clear();
    },
  };
};
