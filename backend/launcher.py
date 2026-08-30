"""Strict GeForce NOW launcher for supported Steam titles."""

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Callable, List, Optional, Sequence, TextIO, TypedDict


FLATPAK_PATH = "/usr/bin/flatpak"
RUNNER_PATH = str(Path(__file__).resolve().parents[1] / "bin" / "gfn-launch")
SUPPORTED_APP_ID = "1903340"
EXPEDITION_33_ROUTE = (
    "#?cmsId=103134919&launchSource=External&shortName=game_gfn_pc"
    "&parentGameId=037a263a-adbf-4705-8509-76447080de75"
)
GFN_FLATPAK_APP_ID = "com.nvidia.geforcenow"
PREFLIGHT_TIMEOUT_SECONDS = 5.0

_APP_ID_PATTERN = re.compile(r"[1-9][0-9]*\Z")


class PluginPathError(RuntimeError):
    """Raised when Decky's plugin root cannot produce a safe runner path."""


class PluginPaths(TypedDict):
    pluginRoot: str
    runnerPath: str


class PreflightResult(TypedDict):
    ready: bool
    code: str
    message: str


def _error(message: str, *, stderr: TextIO) -> None:
    print(f"stream-gfn: {message}", file=stderr)


def _launch_argv() -> List[str]:
    return [
        FLATPAK_PATH,
        "run",
        "--command=/app/cef/GeForceNOW",
        GFN_FLATPAK_APP_ID,
        f"--url-route={EXPEDITION_33_ROUTE}",
    ]


def resolve_plugin_paths(plugin_root: Path) -> PluginPaths:
    """Resolve the fixed runner inside an absolute Decky-owned plugin root."""

    root_input = Path(plugin_root)
    if not root_input.is_absolute():
        raise PluginPathError("plugin root must be absolute")

    try:
        root = root_input.resolve(strict=True)
    except (OSError, RuntimeError) as error:
        raise PluginPathError("plugin root is unavailable") from error
    if not root.is_dir():
        raise PluginPathError("plugin root is not a directory")

    runner_input = root / "bin" / "gfn-launch"
    try:
        runner = runner_input.resolve(strict=True)
    except (OSError, RuntimeError) as error:
        raise PluginPathError("plugin runner is missing") from error

    try:
        runner.relative_to(root)
    except ValueError as error:
        raise PluginPathError("plugin runner resolves outside the plugin root") from error

    if not runner.is_file():
        raise PluginPathError("plugin runner is not a file")
    if not os.access(str(runner), os.X_OK):
        raise PluginPathError("plugin runner is not executable")

    return {"pluginRoot": str(root), "runnerPath": str(runner)}


def _preflight_result(ready: bool, code: str, message: str) -> PreflightResult:
    return {"ready": ready, "code": code, "message": message}


def _is_missing_gfn_app(diagnostic: str) -> bool:
    normalized = diagnostic.casefold()
    return any(
        marker in normalized
        for marker in (
            "not installed",
            "no installed refs found",
            "nothing matches",
        )
    )


def gfn_preflight(
    *,
    run: Callable[..., subprocess.CompletedProcess] = subprocess.run,
    path_is_file: Callable[[str], bool] = os.path.isfile,
    path_access: Callable[[str, int], bool] = os.access,
) -> PreflightResult:
    """Check the fixed GFN Flatpak dependency with no client-controlled input."""

    if not path_is_file(FLATPAK_PATH):
        return _preflight_result(
            False, "flatpak_missing", f"{FLATPAK_PATH} is unavailable"
        )
    if not path_access(FLATPAK_PATH, os.X_OK):
        return _preflight_result(
            False,
            "flatpak_not_executable",
            f"{FLATPAK_PATH} is not executable",
        )

    command = [FLATPAK_PATH, "info", GFN_FLATPAK_APP_ID]
    try:
        completed = run(
            command,
            capture_output=True,
            check=False,
            shell=False,
            text=True,
            timeout=PREFLIGHT_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return _preflight_result(
            False,
            "flatpak_timeout",
            "Flatpak did not finish checking GeForce NOW in time",
        )
    except OSError:
        return _preflight_result(
            False, "flatpak_error", "Flatpak could not check GeForce NOW"
        )

    stdout = completed.stdout or ""
    stderr = completed.stderr or ""
    if completed.returncode != 0:
        if _is_missing_gfn_app(stderr):
            return _preflight_result(
                False,
                "gfn_not_installed",
                "GeForce NOW is not installed as a Flatpak",
            )
        return _preflight_result(
            False, "flatpak_error", "Flatpak could not check GeForce NOW"
        )

    if GFN_FLATPAK_APP_ID.casefold() not in stdout.casefold():
        return _preflight_result(
            False,
            "malformed_response",
            "Flatpak returned an unexpected GeForce NOW response",
        )

    return _preflight_result(True, "ready", "GeForce NOW is installed")


def main(
    arguments: Optional[Sequence[str]] = None,
    *,
    execv: Callable[[str, List[str]], object] = os.execv,
    path_is_file: Callable[[str], bool] = os.path.isfile,
    path_access: Callable[[str, int], bool] = os.access,
    stderr: TextIO = sys.stderr,
) -> int:
    """Validate one Steam AppID, then replace this process with GeForce NOW."""

    args = list(sys.argv[1:] if arguments is None else arguments)
    if len(args) != 1:
        _error("expected exactly one Steam AppID argument", stderr=stderr)
        return 2

    app_id = args[0]
    if _APP_ID_PATTERN.fullmatch(app_id) is None:
        _error(f"malformed Steam AppID: {app_id!r}", stderr=stderr)
        return 2
    if app_id != SUPPORTED_APP_ID:
        _error(f"unsupported Steam AppID: {app_id}", stderr=stderr)
        return 3

    if not path_is_file(RUNNER_PATH):
        _error(f"runner is missing: {RUNNER_PATH}", stderr=stderr)
        return 4
    if not path_access(RUNNER_PATH, os.X_OK):
        _error(f"runner is not executable: {RUNNER_PATH}", stderr=stderr)
        return 4
    if not path_is_file(FLATPAK_PATH):
        _error(f"{FLATPAK_PATH} is unavailable", stderr=stderr)
        return 5
    if not path_access(FLATPAK_PATH, os.X_OK):
        _error(f"{FLATPAK_PATH} is not executable", stderr=stderr)
        return 5

    try:
        execv(FLATPAK_PATH, _launch_argv())
    except OSError as error:
        _error(f"failed to launch GeForce NOW: {error}", stderr=stderr)
        return 6

    return 0
