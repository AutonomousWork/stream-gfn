"""Decky backend lifecycle for Stream GFN.

Feature RPCs are intentionally introduced by later implementation units. This
scaffold performs no filesystem writes and only uses Decky's logger.
"""

import decky


class Plugin:
    async def _main(self) -> None:
        decky.logger.info("Stream GFN backend loaded")

    async def _unload(self) -> None:
        decky.logger.info("Stream GFN backend unloaded")

    async def _uninstall(self) -> None:
        decky.logger.info("Stream GFN backend uninstalled")
