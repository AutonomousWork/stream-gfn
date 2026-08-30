#!/usr/bin/env python3
"""Build the deterministic, browser-installable Stream GFN release assets."""

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Dict, Iterable, Optional, Sequence, Tuple


ARCHIVE_ROOT = "stream-gfn"
BUILD_INFO_SCHEMA_VERSION = 1
FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
TAG_PATTERN = re.compile(
    r"v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)"
    r"(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?\Z"
)
COMMIT_PATTERN = re.compile(r"[0-9a-f]{40}\Z")

FIXED_RUNTIME_FILES = (
    "LICENSE",
    "README.md",
    "bin/gfn-launch",
    "dist/index.js",
    "main.py",
    "package.json",
    "plugin.json",
)
FIXED_BACKEND_FILES = (
    "py_modules/stream_gfn_backend/__init__.py",
    "py_modules/stream_gfn_backend/identity.py",
    "py_modules/stream_gfn_backend/launcher.py",
    "py_modules/stream_gfn_backend/settings.py",
)


class ReleaseBuildError(RuntimeError):
    """Raised when release input cannot produce a trustworthy package."""


@dataclass(frozen=True)
class ReleaseAssets:
    archive: Path
    checksum: Path


def validate_archive_path(value: str) -> PurePosixPath:
    """Return a safe relative archive path or fail closed."""

    path = PurePosixPath(value)
    if not value or path.is_absolute() or ".." in path.parts or "." in path.parts:
        raise ReleaseBuildError(f"unsafe archive path: {value!r}")
    if path.parts[0] != ARCHIVE_ROOT:
        raise ReleaseBuildError(
            f"archive path must be rooted at {ARCHIVE_ROOT!r}: {value!r}"
        )
    return path


def build_release(
    *,
    repo_root: Path,
    output_dir: Path,
    tag: str,
    commit: str,
    publication: bool,
) -> ReleaseAssets:
    """Create the ZIP and checksum after validating all release inputs."""

    root = repo_root.resolve(strict=True)
    package_version = _read_package_version(root / "package.json")
    expected_tag = f"v{package_version}"
    if TAG_PATTERN.fullmatch(tag) is None or tag != expected_tag:
        raise ReleaseBuildError(
            f"release tag must exactly match package version ({expected_tag})"
        )
    if COMMIT_PATTERN.fullmatch(commit) is None:
        raise ReleaseBuildError("release commit must be a full lowercase 40-character SHA")

    runtime = _runtime_sources(root)
    if publication:
        _verify_publication_checkout(root, tag, commit, runtime)
    build_info = (
        json.dumps(
            {
                "commit": commit,
                "schemaVersion": BUILD_INFO_SCHEMA_VERSION,
                "tag": tag,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")

    entries: Dict[str, Tuple[bytes, int]] = {
        f"{ARCHIVE_ROOT}/{relative}": (source.read_bytes(), _mode_for(relative))
        for relative, source in runtime
    }
    entries[f"{ARCHIVE_ROOT}/build-info.json"] = (build_info, 0o644)
    for name in entries:
        validate_archive_path(name)

    output = output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive_name = f"{ARCHIVE_ROOT}-{tag}.zip"
    archive_path = output / archive_name
    checksum_path = output / f"{archive_name}.sha256"

    temporary_archive = _temporary_path(output, ".zip")
    temporary_checksum = _temporary_path(output, ".sha256")
    try:
        with zipfile.ZipFile(
            temporary_archive,
            mode="w",
            compression=zipfile.ZIP_STORED,
        ) as archive:
            for name in sorted(entries):
                payload, mode = entries[name]
                info = zipfile.ZipInfo(name, date_time=FIXED_TIMESTAMP)
                info.compress_type = zipfile.ZIP_STORED
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | mode) << 16
                info.extra = b""
                info.comment = b""
                archive.writestr(info, payload, compress_type=zipfile.ZIP_STORED)

        digest = hashlib.sha256(temporary_archive.read_bytes()).hexdigest()
        with temporary_checksum.open("w", encoding="ascii", newline="\n") as checksum_file:
            checksum_file.write(f"{digest}  {archive_name}\n")
        os.chmod(temporary_archive, 0o644)
        os.chmod(temporary_checksum, 0o644)
        os.replace(temporary_archive, archive_path)
        os.replace(temporary_checksum, checksum_path)
    finally:
        temporary_archive.unlink(missing_ok=True)
        temporary_checksum.unlink(missing_ok=True)

    return ReleaseAssets(archive=archive_path, checksum=checksum_path)


def _runtime_sources(root: Path) -> Sequence[Tuple[str, Path]]:
    relative_paths = [*FIXED_RUNTIME_FILES, *FIXED_BACKEND_FILES]
    backend = root / "py_modules" / "stream_gfn_backend"
    _require_directory(root, backend)
    allowed_backend = set(FIXED_BACKEND_FILES)
    unexpected_backend = sorted(
        path.relative_to(root).as_posix()
        for path in backend.glob("*.py")
        if path.relative_to(root).as_posix() not in allowed_backend
    )
    if unexpected_backend:
        raise ReleaseBuildError(
            "unexpected backend runtime module(s): " + ", ".join(unexpected_backend)
        )

    sources = []
    for relative in sorted(relative_paths):
        archive_name = f"{ARCHIVE_ROOT}/{relative}"
        validate_archive_path(archive_name)
        source = root / relative
        _require_regular_file(root, source)
        sources.append((relative, source))
    return sources


def _require_directory(root: Path, path: Path) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError as error:
        raise ReleaseBuildError(f"required runtime directory is missing: {path}") from error
    _reject_symlink_components(root, path)
    if not stat.S_ISDIR(metadata.st_mode) or not _is_within(root, path.resolve()):
        raise ReleaseBuildError(f"unsafe runtime directory: {path}")


def _require_regular_file(root: Path, path: Path) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError as error:
        raise ReleaseBuildError(f"required runtime file is missing: {path}") from error
    _reject_symlink_components(root, path)
    if not stat.S_ISREG(metadata.st_mode) or not _is_within(root, path.resolve()):
        raise ReleaseBuildError(f"unsafe runtime file: {path}")


def _is_within(root: Path, candidate: Path) -> bool:
    try:
        candidate.relative_to(root)
    except ValueError:
        return False
    return True


def _reject_symlink_components(root: Path, path: Path) -> None:
    try:
        relative = path.relative_to(root)
    except ValueError as error:
        raise ReleaseBuildError(f"runtime path leaves repository root: {path}") from error
    current = root
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            raise ReleaseBuildError(f"runtime path must not contain a symlink: {current}")


def _mode_for(relative: str) -> int:
    return 0o755 if relative == "bin/gfn-launch" else 0o644


def _read_package_version(package_path: Path) -> str:
    _require_regular_file(package_path.parent, package_path)
    try:
        value = json.loads(package_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        raise ReleaseBuildError("package.json is unreadable") from error
    version = value.get("version") if isinstance(value, dict) else None
    if not isinstance(version, str) or not version:
        raise ReleaseBuildError("package.json must contain a version string")
    return version


def _verify_publication_checkout(
    root: Path,
    tag: str,
    commit: str,
    runtime: Sequence[Tuple[str, Path]],
) -> None:
    top = _git(root, "rev-parse", "--show-toplevel")
    if Path(top).resolve() != root:
        raise ReleaseBuildError("publication root must be the Git checkout root")
    head = _git(root, "rev-parse", "HEAD")
    if head != commit:
        raise ReleaseBuildError("publication commit must exactly match HEAD")
    try:
        tagged_commit = _git(root, "rev-parse", f"refs/tags/{tag}^{{commit}}")
    except ReleaseBuildError as error:
        raise ReleaseBuildError(f"publication tag does not exist: {tag}") from error
    if tagged_commit != commit:
        raise ReleaseBuildError("publication tag does not resolve to the requested commit")

    tracked_dirty = _git_returncode(root, "diff", "--quiet", "--ignore-submodules", "--")
    staged_dirty = _git_returncode(
        root, "diff", "--cached", "--quiet", "--ignore-submodules", "--"
    )
    if tracked_dirty != 0 or staged_dirty != 0:
        raise ReleaseBuildError("publication checkout has tracked or staged changes")

    tracked_at_commit = set(_git(root, "ls-tree", "-r", "--name-only", commit).splitlines())
    untracked_runtime = sorted(
        relative for relative, _source in runtime if relative not in tracked_at_commit
    )
    if untracked_runtime:
        raise ReleaseBuildError(
            "publication runtime file(s) are not tracked at the tagged commit: "
            + ", ".join(untracked_runtime)
        )


def _git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode != 0:
        diagnostic = result.stderr.strip() or result.stdout.strip() or "git command failed"
        raise ReleaseBuildError(diagnostic)
    return result.stdout.strip()


def _git_returncode(root: Path, *args: str) -> int:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    ).returncode


def _temporary_path(directory: Path, suffix: str) -> Path:
    descriptor, value = tempfile.mkstemp(
        prefix=".stream-gfn-release-", suffix=suffix, dir=directory
    )
    os.close(descriptor)
    return Path(value)


def _resolve_commit(repo_root: Path, requested: Optional[str]) -> str:
    if requested is not None:
        return requested
    return _git(repo_root, "rev-parse", "HEAD")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root", type=Path, default=Path(__file__).resolve().parents[1]
    )
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--commit")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--allow-dirty",
        action="store_true",
        help="build a non-publication verification artifact from the current sources",
    )
    mode.add_argument(
        "--publication",
        action="store_true",
        help="require a clean tracked/index state and a tag at the exact HEAD",
    )
    return parser


def main(argv: Optional[Iterable[str]] = None) -> int:
    args = _parser().parse_args(argv)
    repo_root = args.repo_root.resolve()
    output_dir = (args.output_dir or (repo_root / "release")).resolve()
    try:
        result = build_release(
            repo_root=repo_root,
            output_dir=output_dir,
            tag=args.tag,
            commit=_resolve_commit(repo_root, args.commit),
            publication=args.publication,
        )
    except ReleaseBuildError as error:
        print(f"release build refused: {error}", file=sys.stderr)
        return 2
    print(result.archive)
    print(result.checksum)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
