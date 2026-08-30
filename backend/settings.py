"""Versioned backend state contract for the shared Steam runner."""

from typing import Any, Dict, Optional, TypedDict, cast


STATE_SCHEMA_VERSION = 1


class State(TypedDict):
    schemaVersion: int
    runnerShortcutId: Optional[str]


class StateValidationError(ValueError):
    """Raised when persisted plugin state does not match the current schema."""


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
