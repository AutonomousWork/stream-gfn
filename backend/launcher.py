"""Strict GeForce NOW launcher for supported Steam titles."""

import os
import re
import sys
from pathlib import Path
from typing import Callable, List, Optional, Sequence, TextIO


FLATPAK_PATH = "/usr/bin/flatpak"
RUNNER_PATH = str(Path(__file__).resolve().parents[1] / "bin" / "gfn-launch")
SUPPORTED_APP_ID = "1903340"
EXPEDITION_33_ROUTE = (
    "#?cmsId=103134919&launchSource=External&shortName=game_gfn_pc"
    "&parentGameId=037a263a-adbf-4705-8509-76447080de75"
)

_APP_ID_PATTERN = re.compile(r"[1-9][0-9]*\Z")


def _error(message: str, *, stderr: TextIO) -> None:
    print(f"stream-gfn: {message}", file=stderr)


def _launch_argv() -> List[str]:
    return [
        FLATPAK_PATH,
        "run",
        "--command=/app/cef/GeForceNOW",
        "com.nvidia.geforcenow",
        f"--url-route={EXPEDITION_33_ROUTE}",
    ]


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
