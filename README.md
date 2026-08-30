# Stream GFN

Stream GFN adds a one-tap **Stream on GeForce NOW** action to the normal Steam library page for supported games. This prerelease supports only *Clair Obscur: Expedition 33* (Steam AppID `1903340`) and reuses one hidden Steam shortcut rather than creating a shortcut per title.

> **UNVALIDATED DEVICE BUILD:** `v0.1.0-alpha.3` still requires the recorded Legion Go S proof. It is a test build, not a stable release. Do not use alpha.1 or alpha.2; both are marked no-go.

## Install on the Legion Go S

Prerequisites: Decky Loader is installed, the GeForce NOW Flatpak (`com.nvidia.geforcenow`) is installed and signed in, and GFN is fully closed.

The primary installation path stays in Gaming Mode:

1. Open **Decky Settings**.
2. Choose **Install Plugin from URL**.
3. Paste this exact release asset URL:

   ```text
   https://github.com/AutonomousWork/stream-gfn/releases/download/v0.1.0-alpha.3/stream-gfn-v0.1.0-alpha.3.zip
   ```

4. Install the plugin, then reload Decky if prompted.
5. Open the Stream GFN panel and confirm it reports tag `v0.1.0-alpha.3` and the commit shown on the GitHub release.

Do **not** install GitHub's automatically generated **Source code (zip)**. It is not the Decky package and does not contain the generated frontend bundle or packaged build identity. Use the asset named `stream-gfn-v0.1.0-alpha.3.zip`.

### Desktop Mode fallback

If Install Plugin from URL is unavailable, download the named ZIP asset and its `.sha256` file from the release page in Desktop Mode, verify it, then extract the single `stream-gfn/` directory so the final path is:

```text
~/homebrew/plugins/stream-gfn
```

For example, from the download directory:

```sh
sha256sum -c stream-gfn-v0.1.0-alpha.3.zip.sha256
unzip stream-gfn-v0.1.0-alpha.3.zip -d ~/homebrew/plugins
```

Reload Decky or restart Gaming Mode after extraction. An upgrade replaces the plugin directory but must not silently remove the reusable hidden runner.

## Use

Open *Clair Obscur: Expedition 33* in the Steam library and activate **Stream on GeForce NOW** once. The plugin fails closed if its required private Steam surfaces, the exact owned runner fingerprint, or the GFN Flatpak preflight cannot be verified.

The plugin panel shows compatibility, runner activity, and packaged build identity. Before uninstalling, use **Cleanup Runner** only while its state is confirmed inactive. Cleanup reverifies the complete owned fingerprint and leaves unknown or foreign shortcuts untouched.

See the [Legion Go S device-proof checklist](docs/device-proof.md) for the prerelease acceptance boundary.

## Development and release verification

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` typechecks, runs frontend and backend tests, builds `dist/index.js`, tests the release packager, and produces:

- `release/stream-gfn-v0.1.0-alpha.3.zip`
- `release/stream-gfn-v0.1.0-alpha.3.zip.sha256`

The normal bundle command is explicitly for dirty-tree/CI verification. `pnpm run bundle:publication` is the release-owner gate: it requires no tracked or staged changes and requires tag `v0.1.0-alpha.3` to resolve to the exact packaged `HEAD`. Untracked workspace files are excluded by the package allowlist and do not affect that source-cleanliness gate.

## License

BSD 3-Clause. See [LICENSE](LICENSE).
