"""Read-only packaged build identity with an explicit development fallback."""

import json
import re
from pathlib import Path
from typing import Any, Dict, Literal, Optional, TypedDict, cast


BUILD_IDENTITY_SCHEMA_VERSION = 1
BUILD_INFO_FILE_NAME = "build-info.json"

_TAG_PATTERN = re.compile(r"v[0-9][0-9A-Za-z.-]*\Z")
_COMMIT_PATTERN = re.compile(r"[0-9a-f]{40}\Z")


class BuildIdentity(TypedDict):
    schemaVersion: int
    source: Literal["development", "packaged"]
    metadataValidated: bool
    tag: Optional[str]
    commit: Optional[str]


class BuildIdentityError(ValueError):
    """Raised when packaged build identity metadata cannot be trusted."""


def _development_identity() -> BuildIdentity:
    return {
        "schemaVersion": BUILD_IDENTITY_SCHEMA_VERSION,
        "source": "development",
        "metadataValidated": False,
        "tag": None,
        "commit": None,
    }


def load_build_identity(plugin_root: Path) -> BuildIdentity:
    """Read the fixed package metadata file without changing plugin state."""

    root = Path(plugin_root)
    if not root.is_absolute():
        raise BuildIdentityError("plugin root must be absolute")
    build_info = root / BUILD_INFO_FILE_NAME
    if build_info.is_symlink():
        raise BuildIdentityError("packaged build identity must not be a symlink")

    try:
        with build_info.open("r", encoding="utf-8") as identity_file:
            value = json.load(identity_file)
    except FileNotFoundError:
        return _development_identity()
    except (json.JSONDecodeError, OSError) as error:
        raise BuildIdentityError("packaged build identity is unreadable") from error

    if not isinstance(value, dict):
        raise BuildIdentityError("packaged build identity must be a JSON object")
    metadata = cast(Dict[str, Any], value)
    if set(metadata) != {"schemaVersion", "tag", "commit"}:
        raise BuildIdentityError("packaged build identity has unexpected fields")
    if (
        type(metadata["schemaVersion"]) is not int
        or metadata["schemaVersion"] != BUILD_IDENTITY_SCHEMA_VERSION
    ):
        raise BuildIdentityError("packaged build identity has an unknown schema")

    tag = metadata["tag"]
    commit = metadata["commit"]
    if not isinstance(tag, str) or _TAG_PATTERN.fullmatch(tag) is None:
        raise BuildIdentityError("packaged build identity has an invalid tag")
    if not isinstance(commit, str) or _COMMIT_PATTERN.fullmatch(commit) is None:
        raise BuildIdentityError("packaged build identity has an invalid commit")

    return {
        "schemaVersion": BUILD_IDENTITY_SCHEMA_VERSION,
        "source": "packaged",
        "metadataValidated": True,
        "tag": tag,
        "commit": commit,
    }
