"""Versioned backend state contract for the shared Steam runner."""

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Literal, Optional, TypedDict, cast


STATE_SCHEMA_VERSION = 1
STATE_FILE_NAME = "state.json"


class State(TypedDict):
    schemaVersion: int
    runnerShortcutId: Optional[str]


class StateValidationError(ValueError):
    """Raised when persisted plugin state does not match the current schema."""


StateLoadDiagnostic = Literal[
    "loaded", "missing", "malformed_json", "invalid_state", "read_error"
]


@dataclass(frozen=True)
class StateLoadResult:
    state: State
    diagnostic: StateLoadDiagnostic


def default_state() -> State:
    """Return a fresh, JSON-serializable state value."""

    return {"schemaVersion": STATE_SCHEMA_VERSION, "runnerShortcutId": None}


def validate_state(value: object) -> State:
    """Validate state at the persistence boundary and return a narrow copy."""

    if not isinstance(value, dict):
        raise StateValidationError("state must be a JSON object")

    state = cast(Dict[str, Any], value)
    if set(state) != {"schemaVersion", "runnerShortcutId"}:
        raise StateValidationError(
            "state must contain only schemaVersion and runnerShortcutId"
        )
    if (
        type(state["schemaVersion"]) is not int
        or state["schemaVersion"] != STATE_SCHEMA_VERSION
    ):
        raise StateValidationError(
            f"schemaVersion must equal {STATE_SCHEMA_VERSION}"
        )

    shortcut_id = state["runnerShortcutId"]
    if shortcut_id is not None and not isinstance(shortcut_id, str):
        raise StateValidationError("runnerShortcutId must be a string or null")

    return {
        "schemaVersion": STATE_SCHEMA_VERSION,
        "runnerShortcutId": shortcut_id,
    }


class StateStore:
    """Own atomic persistence for the backend's deliberately narrow state."""

    def __init__(self, settings_dir: Path) -> None:
        directory = Path(settings_dir)
        if not directory.is_absolute():
            raise ValueError("Decky settings directory must be absolute")
        self._settings_dir = directory.resolve(strict=False)
        self.path = self._settings_dir / STATE_FILE_NAME

    def load(self) -> StateLoadResult:
        if self.path.is_symlink():
            return StateLoadResult(default_state(), "invalid_state")

        try:
            with self.path.open("r", encoding="utf-8") as state_file:
                persisted = json.load(state_file)
        except FileNotFoundError:
            return StateLoadResult(default_state(), "missing")
        except json.JSONDecodeError:
            return StateLoadResult(default_state(), "malformed_json")
        except OSError:
            return StateLoadResult(default_state(), "read_error")

        try:
            state = validate_state(persisted)
        except StateValidationError:
            return StateLoadResult(default_state(), "invalid_state")
        return StateLoadResult(state, "loaded")

    def save(self, state: object) -> State:
        validated = validate_state(state)
        self._settings_dir.mkdir(parents=True, exist_ok=True)

        file_descriptor, temporary_name = tempfile.mkstemp(
            dir=str(self._settings_dir),
            prefix=f".{STATE_FILE_NAME}.",
            suffix=".tmp",
        )
        temporary_path = Path(temporary_name)
        try:
            os.fchmod(file_descriptor, 0o600)
            with os.fdopen(file_descriptor, "w", encoding="utf-8") as temporary_file:
                file_descriptor = -1
                json.dump(
                    validated,
                    temporary_file,
                    ensure_ascii=True,
                    separators=(",", ":"),
                )
                temporary_file.write("\n")
                temporary_file.flush()
                os.fsync(temporary_file.fileno())

            os.replace(temporary_path, self.path)
            self._fsync_settings_directory()
        except BaseException:
            if file_descriptor >= 0:
                os.close(file_descriptor)
            try:
                temporary_path.unlink()
            except FileNotFoundError:
                pass
            raise

        return validated

    def clear(self) -> State:
        return self.save(default_state())

    def _fsync_settings_directory(self) -> None:
        flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
        directory_descriptor = os.open(self._settings_dir, flags)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
