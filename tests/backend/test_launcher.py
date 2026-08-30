import io
import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from backend import launcher


class LauncherTest(unittest.TestCase):
    def setUp(self) -> None:
        self.execv = Mock()
        self.stderr = io.StringIO()

    def run_launcher(
        self,
        arguments: list[str],
        *,
        existing_paths: tuple[str, ...] = (
            launcher.RUNNER_PATH,
            launcher.FLATPAK_PATH,
        ),
        executable_paths: tuple[str, ...] = (
            launcher.RUNNER_PATH,
            launcher.FLATPAK_PATH,
        ),
    ) -> int:
        return launcher.main(
            arguments,
            execv=self.execv,
            path_is_file=lambda path: path in existing_paths,
            path_access=lambda path, mode: mode == os.X_OK
            and path in executable_paths,
            stderr=self.stderr,
        )

    def test_expedition_33_execs_exact_geforce_now_route_without_shell(self) -> None:
        result = self.run_launcher(["1903340"])

        self.assertEqual(result, 0)
        self.execv.assert_called_once_with(
            "/usr/bin/flatpak",
            [
                "/usr/bin/flatpak",
                "run",
                "--command=/app/cef/GeForceNOW",
                "com.nvidia.geforcenow",
                "--url-route=#?cmsId=103134919&launchSource=External&shortName=game_gfn_pc&parentGameId=037a263a-adbf-4705-8509-76447080de75",
            ],
        )

    def test_missing_app_id_is_rejected_without_launching(self) -> None:
        self.assertEqual(self.run_launcher([]), 2)
        self.execv.assert_not_called()
        self.assertIn("exactly one Steam AppID", self.stderr.getvalue())

    def test_extra_arguments_are_rejected_without_launching(self) -> None:
        self.assertEqual(self.run_launcher(["1903340", "unexpected"]), 2)
        self.execv.assert_not_called()

    def test_malformed_app_id_is_rejected_without_launching(self) -> None:
        self.assertEqual(self.run_launcher(["1903340;echo"]), 2)
        self.execv.assert_not_called()
        self.assertIn("malformed Steam AppID", self.stderr.getvalue())

    def test_unsupported_app_id_is_rejected_without_launching(self) -> None:
        self.assertEqual(self.run_launcher(["12345"]), 3)
        self.execv.assert_not_called()
        self.assertIn("unsupported Steam AppID", self.stderr.getvalue())

    def test_missing_runner_executable_fails_preflight(self) -> None:
        self.assertEqual(
            self.run_launcher(["1903340"], existing_paths=(launcher.FLATPAK_PATH,)),
            4,
        )
        self.execv.assert_not_called()
        self.assertIn("runner is missing", self.stderr.getvalue())

    def test_non_executable_runner_fails_preflight(self) -> None:
        self.assertEqual(
            self.run_launcher(
                ["1903340"], executable_paths=(launcher.FLATPAK_PATH,)
            ),
            4,
        )
        self.execv.assert_not_called()
        self.assertIn("runner is not executable", self.stderr.getvalue())

    def test_missing_flatpak_fails_preflight(self) -> None:
        self.assertEqual(
            self.run_launcher(["1903340"], existing_paths=(launcher.RUNNER_PATH,)),
            5,
        )
        self.execv.assert_not_called()
        self.assertIn("/usr/bin/flatpak is unavailable", self.stderr.getvalue())

    def test_non_executable_flatpak_fails_preflight(self) -> None:
        self.assertEqual(
            self.run_launcher(
                ["1903340"], executable_paths=(launcher.RUNNER_PATH,)
            ),
            5,
        )
        self.execv.assert_not_called()
        self.assertIn("/usr/bin/flatpak is not executable", self.stderr.getvalue())

    def test_exec_failure_returns_nonzero_with_clear_error(self) -> None:
        self.execv.side_effect = OSError("exec denied")

        self.assertEqual(self.run_launcher(["1903340"]), 6)
        self.assertIn("failed to launch GeForce NOW", self.stderr.getvalue())


class PluginPathsTest(unittest.TestCase):
    def test_resolves_absolute_plugin_owned_executable_paths(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plugin_root = Path(directory)
            runner = plugin_root / "bin" / "gfn-launch"
            runner.parent.mkdir()
            runner.write_text("#!/bin/sh\n", encoding="utf-8")
            runner.chmod(0o700)

            paths = launcher.resolve_plugin_paths(plugin_root)

            self.assertEqual(
                paths,
                {
                    "pluginRoot": str(plugin_root.resolve()),
                    "runnerPath": str(runner.resolve()),
                },
            )
            self.assertTrue(Path(paths["pluginRoot"]).is_absolute())
            self.assertTrue(Path(paths["runnerPath"]).is_absolute())
            self.assertTrue(
                Path(paths["runnerPath"]).stat().st_mode & stat.S_IXUSR
            )

    def test_rejects_runner_symlink_that_escapes_plugin_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            plugin_root = base / "plugin"
            runner = plugin_root / "bin" / "gfn-launch"
            runner.parent.mkdir(parents=True)
            outside = base / "outside-runner"
            outside.write_text("#!/bin/sh\n", encoding="utf-8")
            outside.chmod(0o700)
            runner.symlink_to(outside)

            with self.assertRaisesRegex(
                launcher.PluginPathError, "outside the plugin root"
            ):
                launcher.resolve_plugin_paths(plugin_root)

    def test_rejects_non_executable_runner(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plugin_root = Path(directory)
            runner = plugin_root / "bin" / "gfn-launch"
            runner.parent.mkdir()
            runner.write_text("#!/bin/sh\n", encoding="utf-8")
            runner.chmod(0o600)

            with self.assertRaisesRegex(
                launcher.PluginPathError, "not executable"
            ):
                launcher.resolve_plugin_paths(plugin_root)


class GfnPreflightTest(unittest.TestCase):
    def setUp(self) -> None:
        self.run = Mock()

    def preflight(
        self,
        *,
        flatpak_exists: bool = True,
        flatpak_executable: bool = True,
    ) -> launcher.PreflightResult:
        return launcher.gfn_preflight(
            run=self.run,
            path_is_file=lambda path: flatpak_exists
            and path == launcher.FLATPAK_PATH,
            path_access=lambda path, mode: flatpak_executable
            and path == launcher.FLATPAK_PATH
            and mode == os.X_OK,
        )

    def test_missing_flatpak_executable_is_actionable(self) -> None:
        self.assertEqual(
            self.preflight(flatpak_exists=False),
            {
                "ready": False,
                "code": "flatpak_missing",
                "message": "/usr/bin/flatpak is unavailable",
            },
        )
        self.run.assert_not_called()

    def test_non_executable_flatpak_is_actionable(self) -> None:
        self.assertEqual(
            self.preflight(flatpak_executable=False),
            {
                "ready": False,
                "code": "flatpak_not_executable",
                "message": "/usr/bin/flatpak is not executable",
            },
        )
        self.run.assert_not_called()

    def test_missing_gfn_app_is_distinct_from_other_flatpak_errors(self) -> None:
        self.run.return_value = subprocess.CompletedProcess(
            [], 1, "", "error: com.nvidia.geforcenow is not installed\n"
        )

        self.assertEqual(self.preflight()["code"], "gfn_not_installed")

    def test_timeout_is_bounded_and_actionable(self) -> None:
        self.run.side_effect = subprocess.TimeoutExpired([], 5)

        result = self.preflight()

        self.assertEqual(result["code"], "flatpak_timeout")
        self.assertFalse(result["ready"])

    def test_nonzero_flatpak_error_is_not_reported_as_missing_app(self) -> None:
        self.run.return_value = subprocess.CompletedProcess(
            [], 2, "", "error: unable to load system installation\n"
        )

        self.assertEqual(self.preflight()["code"], "flatpak_error")

    def test_os_error_is_reported_without_exception_details(self) -> None:
        self.run.side_effect = OSError("private host detail")

        result = self.preflight()

        self.assertEqual(result["code"], "flatpak_error")
        self.assertNotIn("private host detail", result["message"])

    def test_empty_success_response_is_malformed(self) -> None:
        self.run.return_value = subprocess.CompletedProcess([], 0, "", "")

        self.assertEqual(self.preflight()["code"], "malformed_response")

    def test_success_uses_fixed_no_shell_command(self) -> None:
        self.run.return_value = subprocess.CompletedProcess(
            [],
            0,
            "Name: GeForce NOW\nID: com.nvidia.geforcenow\n",
            "",
        )

        self.assertEqual(
            self.preflight(),
            {
                "ready": True,
                "code": "ready",
                "message": "GeForce NOW is installed",
            },
        )
        self.run.assert_called_once_with(
            [
                "/usr/bin/flatpak",
                "info",
                "com.nvidia.geforcenow",
            ],
            capture_output=True,
            check=False,
            shell=False,
            text=True,
            timeout=5.0,
        )


if __name__ == "__main__":
    unittest.main()
