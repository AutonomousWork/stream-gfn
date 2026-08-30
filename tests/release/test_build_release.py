import hashlib
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath


REPO_ROOT = Path(__file__).resolve().parents[2]
TAG = "v0.1.0-alpha.1"
COMMIT = "a" * 40
ARCHIVE_NAME = f"stream-gfn-{TAG}.zip"


class BuildReleaseTest(unittest.TestCase):
    def test_archive_is_exact_deterministic_and_extracted_runtime_smokes(self) -> None:
        from scripts import build_release

        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            result = build_release.build_release(
                repo_root=REPO_ROOT,
                output_dir=output_dir,
                tag=TAG,
                commit=COMMIT,
                publication=False,
            )
            first_archive = result.archive.read_bytes()
            first_checksum = result.checksum.read_text(encoding="ascii")

            build_release.build_release(
                repo_root=REPO_ROOT,
                output_dir=output_dir,
                tag=TAG,
                commit=COMMIT,
                publication=False,
            )

            self.assertEqual(result.archive.read_bytes(), first_archive)
            self.assertEqual(result.checksum.read_text(encoding="ascii"), first_checksum)
            digest = hashlib.sha256(first_archive).hexdigest()
            self.assertEqual(first_checksum, f"{digest}  {ARCHIVE_NAME}\n")

            expected_files = {
                "stream-gfn/LICENSE",
                "stream-gfn/README.md",
                "stream-gfn/backend/__init__.py",
                "stream-gfn/backend/identity.py",
                "stream-gfn/backend/launcher.py",
                "stream-gfn/backend/settings.py",
                "stream-gfn/bin/gfn-launch",
                "stream-gfn/build-info.json",
                "stream-gfn/dist/index.js",
                "stream-gfn/main.py",
                "stream-gfn/package.json",
                "stream-gfn/plugin.json",
            }

            with zipfile.ZipFile(result.archive) as archive:
                infos = archive.infolist()
                names = [info.filename for info in infos]
                self.assertEqual(names, sorted(expected_files))
                self.assertEqual(set(names), expected_files)
                self.assertEqual(
                    {PurePosixPath(name).parts[0] for name in names}, {"stream-gfn"}
                )
                self.assertNotIn("stream-gfn/dist/index.js.map", names)
                for info in infos:
                    path = PurePosixPath(info.filename)
                    self.assertFalse(path.is_absolute())
                    self.assertNotIn("..", path.parts)
                    mode = info.external_attr >> 16
                    self.assertTrue(stat.S_ISREG(mode))
                    self.assertNotEqual(stat.S_IFMT(mode), stat.S_IFLNK)
                    self.assertEqual(info.date_time, (1980, 1, 1, 0, 0, 0))

                runner_info = archive.getinfo("stream-gfn/bin/gfn-launch")
                self.assertEqual(stat.S_IMODE(runner_info.external_attr >> 16), 0o755)
                build_info = json.loads(
                    archive.read("stream-gfn/build-info.json").decode("utf-8")
                )
                self.assertEqual(
                    build_info,
                    {"schemaVersion": 1, "tag": TAG, "commit": COMMIT},
                )

                extracted = output_dir / "extracted"
                archive.extractall(extracted)
                for info in infos:
                    os.chmod(extracted / info.filename, stat.S_IMODE(info.external_attr >> 16))

            plugin_root = extracted / "stream-gfn"
            smoke = subprocess.run(
                [
                    sys.executable,
                    "-c",
                    (
                        "import pathlib, sys, types; "
                        "root = pathlib.Path(sys.argv[1]); "
                        "decky = types.ModuleType('decky'); "
                        "decky.logger = type('Logger', (), {'info': lambda *args: None})(); "
                        "sys.modules['decky'] = decky; sys.path.insert(0, str(root)); "
                        "import main; from backend.identity import load_build_identity; "
                        "identity = load_build_identity(root); "
                        "assert identity['tag'] == sys.argv[2]; "
                        "assert identity['commit'] == sys.argv[3]"
                    ),
                    str(plugin_root),
                    TAG,
                    COMMIT,
                ],
                capture_output=True,
                check=False,
                text=True,
            )
            self.assertEqual(smoke.returncode, 0, smoke.stderr)

            runner = subprocess.run(
                [str(plugin_root / "bin/gfn-launch"), "620"],
                capture_output=True,
                check=False,
                text=True,
            )
            self.assertEqual(runner.returncode, 3)
            self.assertIn("unsupported Steam AppID", runner.stderr)

    def test_mismatched_or_unsafe_identity_is_rejected(self) -> None:
        from scripts import build_release

        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            for tag, commit in (
                ("v0.1.0", COMMIT),
                ("../../v0.1.0-alpha.1", COMMIT),
                (TAG, "abc123"),
                (TAG, "A" * 40),
            ):
                with self.subTest(tag=tag, commit=commit):
                    with self.assertRaises(build_release.ReleaseBuildError):
                        build_release.build_release(
                            repo_root=REPO_ROOT,
                            output_dir=output_dir,
                            tag=tag,
                            commit=commit,
                            publication=False,
                        )

            for unsafe_path in ("../secret", "/absolute", "stream-gfn/../secret"):
                with self.subTest(unsafe_path=unsafe_path):
                    with self.assertRaises(build_release.ReleaseBuildError):
                        build_release.validate_archive_path(unsafe_path)

    def test_symlinked_runtime_source_is_rejected(self) -> None:
        from scripts import build_release

        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / "fixture"
            self._copy_runtime_fixture(fixture)
            (fixture / "backend/launcher.py").unlink()
            (fixture / "backend/launcher.py").symlink_to(fixture / "main.py")

            with self.assertRaisesRegex(build_release.ReleaseBuildError, "symlink"):
                build_release.build_release(
                    repo_root=fixture,
                    output_dir=Path(directory) / "output",
                    tag=TAG,
                    commit=COMMIT,
                    publication=False,
                )

    def test_publication_requires_clean_tagged_head_but_allows_unrelated_untracked(self) -> None:
        from scripts import build_release

        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / "fixture"
            self._copy_runtime_fixture(fixture)
            self._git(fixture, "init")
            self._git(fixture, "add", ".")
            self._git(
                fixture,
                "-c",
                "user.name=Release Test",
                "-c",
                "user.email=release-test@example.invalid",
                "commit",
                "-m",
                "fixture",
            )
            commit = self._git(fixture, "rev-parse", "HEAD").stdout.strip()
            self._git(fixture, "tag", TAG)
            (fixture / "untracked-note.txt").write_text("excluded\n", encoding="utf-8")

            result = build_release.build_release(
                repo_root=fixture,
                output_dir=fixture / "release",
                tag=TAG,
                commit=commit,
                publication=True,
            )
            self.assertTrue(result.archive.is_file())

            (fixture / "README.md").write_text("tracked dirt\n", encoding="utf-8")
            with self.assertRaisesRegex(
                build_release.ReleaseBuildError, "tracked or staged changes"
            ):
                build_release.build_release(
                    repo_root=fixture,
                    output_dir=fixture / "release",
                    tag=TAG,
                    commit=commit,
                    publication=True,
                )

    def test_publication_rejects_untracked_runtime_inputs(self) -> None:
        from scripts import build_release

        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / "fixture"
            self._copy_runtime_fixture(fixture)
            self._git(fixture, "init")
            self._git(fixture, "add", ".")
            self._git(fixture, "rm", "--cached", "dist/index.js")
            self._git(
                fixture,
                "-c",
                "user.name=Release Test",
                "-c",
                "user.email=release-test@example.invalid",
                "commit",
                "-m",
                "fixture without bundle",
            )
            commit = self._git(fixture, "rev-parse", "HEAD").stdout.strip()
            self._git(fixture, "tag", TAG)

            with self.assertRaisesRegex(build_release.ReleaseBuildError, "not tracked"):
                build_release.build_release(
                    repo_root=fixture,
                    output_dir=fixture / "release",
                    tag=TAG,
                    commit=commit,
                    publication=True,
                )

            (fixture / "backend/extra.py").write_text("raise RuntimeError\n", encoding="utf-8")
            with self.assertRaisesRegex(build_release.ReleaseBuildError, "unexpected backend"):
                build_release.build_release(
                    repo_root=fixture,
                    output_dir=fixture / "release",
                    tag=TAG,
                    commit=commit,
                    publication=True,
                )

    @staticmethod
    def _git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["git", *args],
            cwd=repo,
            capture_output=True,
            check=True,
            text=True,
        )

    @staticmethod
    def _copy_runtime_fixture(destination: Path) -> None:
        destination.mkdir()
        for relative in (
            "LICENSE",
            "README.md",
            "backend/__init__.py",
            "backend/identity.py",
            "backend/launcher.py",
            "backend/settings.py",
            "bin/gfn-launch",
            "dist/index.js",
            "main.py",
            "package.json",
            "plugin.json",
        ):
            source = REPO_ROOT / relative
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source.read_bytes())


if __name__ == "__main__":
    unittest.main()
