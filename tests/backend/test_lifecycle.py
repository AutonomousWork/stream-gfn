import asyncio
import importlib
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from py_modules.stream_gfn_backend import launcher


class PluginLifecycleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.logger = Mock()
        self.temp_directory = tempfile.TemporaryDirectory()
        self.settings_dir = Path(self.temp_directory.name) / "settings"
        self.plugin_root = Path(__file__).resolve().parents[2]
        self.py_modules = str(self.plugin_root / "py_modules")
        sys.path.insert(0, self.py_modules)
        sys.modules["decky"] = types.SimpleNamespace(
            logger=self.logger,
            DECKY_PLUGIN_DIR=str(self.plugin_root),
            DECKY_PLUGIN_SETTINGS_DIR=str(self.settings_dir),
        )
        sys.modules.pop("main", None)
        self.main = importlib.import_module("main")

    def tearDown(self) -> None:
        sys.modules.pop("main", None)
        sys.modules.pop("decky", None)
        for module_name in tuple(sys.modules):
            if module_name == "stream_gfn_backend" or module_name.startswith(
                "stream_gfn_backend."
            ):
                sys.modules.pop(module_name, None)
        sys.path.remove(self.py_modules)
        self.temp_directory.cleanup()

    def test_lifecycle_loads_and_unloads_without_filesystem_writes(self) -> None:
        plugin = self.main.Plugin()

        with patch("builtins.open", side_effect=AssertionError("unexpected write")):
            asyncio.run(plugin._main())
            asyncio.run(plugin._unload())
            asyncio.run(plugin._uninstall())

        self.assertEqual(self.logger.info.call_count, 3)

    def test_fixed_shape_backend_rpcs_integrate_paths_preflight_and_state(self) -> None:
        plugin = self.main.Plugin()
        ready = {
            "ready": True,
            "code": "ready",
            "message": "GeForce NOW is installed",
        }

        with patch("main.launcher.gfn_preflight", return_value=ready):
            paths = asyncio.run(plugin.get_plugin_paths())
            preflight = asyncio.run(plugin.get_gfn_preflight())
            initial = asyncio.run(plugin.load_state())
            saved = asyncio.run(plugin.save_state("42"))
            loaded = asyncio.run(plugin.load_state())
            cleared = asyncio.run(plugin.clear_state())

        self.assertEqual(
            paths,
            {
                "pluginRoot": str(self.plugin_root.resolve()),
                "runnerPath": str((self.plugin_root / "bin/gfn-launch").resolve()),
            },
        )
        self.assertEqual(preflight, ready)
        self.assertEqual(
            initial,
            {"schemaVersion": 1, "runnerShortcutId": None},
        )
        self.assertEqual(saved, {"schemaVersion": 1, "runnerShortcutId": "42"})
        self.assertEqual(loaded, saved)
        self.assertEqual(cleared, initial)
        self.assertEqual(
            (self.settings_dir / "state.json").stat().st_mode & 0o777,
            0o600,
        )

    def test_rpc_state_shape_cannot_persist_commands_routes_or_paths(self) -> None:
        plugin = self.main.Plugin()

        with self.assertRaises(TypeError):
            asyncio.run(
                plugin.save_state(  # type: ignore[call-arg]
                    "42", command="flatpak run arbitrary"
                )
            )

        self.assertFalse(self.settings_dir.exists())

    def test_build_identity_rpc_is_read_only_in_development(self) -> None:
        plugin = self.main.Plugin()
        before = set(self.plugin_root.iterdir())

        identity = asyncio.run(plugin.get_build_identity())

        self.assertEqual(
            identity,
            {
                "schemaVersion": 1,
                "source": "development",
                "metadataValidated": False,
                "tag": None,
                "commit": None,
            },
        )
        self.assertEqual(set(self.plugin_root.iterdir()), before)

    def test_preflight_rpc_accepts_no_client_supplied_process_data(self) -> None:
        plugin = self.main.Plugin()

        with self.assertRaises(TypeError):
            asyncio.run(
                plugin.get_gfn_preflight(  # type: ignore[call-arg]
                    executable="/tmp/not-flatpak"
                )
            )
