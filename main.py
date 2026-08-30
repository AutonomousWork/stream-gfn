"""Decky backend lifecycle and fixed-shape RPCs for Stream GFN."""

import asyncio
from pathlib import Path
from typing import Optional

import decky

from stream_gfn_backend import identity, launcher, settings


class Plugin:
    def __init__(
        self,
        *,
        plugin_root: Optional[Path] = None,
        settings_dir: Optional[Path] = None,
    ) -> None:
        self._plugin_root_override = plugin_root
        self._settings_dir_override = settings_dir
        self._state_store_instance: Optional[settings.StateStore] = None

    async def _main(self) -> None:
        decky.logger.info("Stream GFN backend loaded")

    async def _unload(self) -> None:
        decky.logger.info("Stream GFN backend unloaded")

    async def _uninstall(self) -> None:
        decky.logger.info("Stream GFN backend uninstalled")

    async def get_plugin_paths(self) -> launcher.PluginPaths:
        return launcher.resolve_plugin_paths(self._plugin_root())

    async def get_gfn_preflight(self) -> launcher.PreflightResult:
        return await asyncio.to_thread(launcher.gfn_preflight)

    async def load_state(self) -> settings.State:
        result = await asyncio.to_thread(self._state_store().load)
        if result.diagnostic != "loaded":
            decky.logger.info(
                "Stream GFN state defaulted (%s)", result.diagnostic
            )
        return result.state

    async def save_state(self, runner_shortcut_id: str) -> settings.State:
        state = {
            "schemaVersion": settings.STATE_SCHEMA_VERSION,
            "runnerShortcutId": runner_shortcut_id,
        }
        return await asyncio.to_thread(
            self._state_store().save,
            state,
        )

    async def clear_state(self) -> settings.State:
        return await asyncio.to_thread(self._state_store().clear)

    async def get_build_identity(self) -> identity.BuildIdentity:
        plugin_paths = launcher.resolve_plugin_paths(self._plugin_root())
        return identity.load_build_identity(Path(plugin_paths["pluginRoot"]))

    def _plugin_root(self) -> Path:
        if self._plugin_root_override is not None:
            return self._plugin_root_override
        return self._decky_path("DECKY_PLUGIN_DIR")

    def _settings_dir(self) -> Path:
        if self._settings_dir_override is not None:
            return self._settings_dir_override
        return self._decky_path("DECKY_PLUGIN_SETTINGS_DIR")

    def _state_store(self) -> settings.StateStore:
        if self._state_store_instance is None:
            self._state_store_instance = settings.StateStore(self._settings_dir())
        return self._state_store_instance

    @staticmethod
    def _decky_path(attribute: str) -> Path:
        value = getattr(decky, attribute, None)
        if not isinstance(value, (str, Path)):
            raise RuntimeError(f"Decky did not provide {attribute}")
        path = Path(value)
        if not path.is_absolute():
            raise RuntimeError(f"Decky provided a non-absolute {attribute}")
        return path
