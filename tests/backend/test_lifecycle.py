import asyncio
import importlib
import sys
import types
import unittest
from unittest.mock import Mock, patch


class PluginLifecycleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.logger = Mock()
        sys.modules["decky"] = types.SimpleNamespace(logger=self.logger)
        sys.modules.pop("main", None)
        self.main = importlib.import_module("main")

    def tearDown(self) -> None:
        sys.modules.pop("main", None)
        sys.modules.pop("decky", None)

    def test_lifecycle_loads_and_unloads_without_filesystem_writes(self) -> None:
        plugin = self.main.Plugin()

        with patch("builtins.open", side_effect=AssertionError("unexpected write")):
            asyncio.run(plugin._main())
            asyncio.run(plugin._unload())
            asyncio.run(plugin._uninstall())

        self.assertEqual(self.logger.info.call_count, 3)
