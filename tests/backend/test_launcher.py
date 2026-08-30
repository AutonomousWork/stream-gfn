import io
import os
import unittest
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


if __name__ == "__main__":
    unittest.main()
