# Legion Go S prerelease proof

This checklist validates the exact GitHub prerelease after it is published. It does not block implementation or prerelease publication. It blocks stable promotion and support for additional titles.

## 1. Install the released artifact

Open Decky Settings on the Legion Go S, choose **Install Plugin from URL**, and paste the exact packaged-asset URL:

```text
https://github.com/AutonomousWork/stream-gfn/releases/download/v0.1.0-alpha.4/stream-gfn-v0.1.0-alpha.4.zip
```

Do not choose GitHub's generated **Source code (zip)**. It is not the Decky package. After installation, reload Decky if prompted. The plugin panel must report tag `v0.1.0-alpha.4` and the same commit as the release.

For independent checksum evidence or when Install Plugin from URL is unavailable, use the Desktop Mode fallback. Open the GitHub release page in the browser and download both named assets:

- `stream-gfn-v0.1.0-alpha.4.zip`
- `stream-gfn-v0.1.0-alpha.4.zip.sha256`

Record the release URL, tag, target commit, date, and operator. Verify the checksum before installation:

```sh
sha256sum -c stream-gfn-v0.1.0-alpha.4.zip.sha256
```

The result must be `OK`. Extract the archive and confirm it contains one top-level `stream-gfn/` directory. Install that directory at `~/homebrew/plugins/stream-gfn`, then restart or reload Decky and confirm the packaged identity again.

Browser download by itself is only transport. Decky's Install Plugin from URL flow is the primary installation path; manual extraction is the fallback.

## 2. Record the target tuple

GFN must be installed from Flatpak, authenticated, and fully stopped. Sanitize all evidence; never include account names, tokens, cookies, device credentials, or unrelated library entries.

| Field | Value |
|---|---|
| Date and operator | |
| Release URL | |
| ZIP SHA-256 | |
| Plugin tag and commit | |
| Decky Loader | |
| Steam client | |
| SteamOS | |
| GFN Flatpak | |

Before testing, record the total non-Steam shortcut count, plugin-owned entries only, and the sanitized result of:

```sh
/usr/bin/pgrep -af 'com.nvidia.geforcenow|/app/cef/GeForceNOW'
```

The process check must return no matches.

## 3. Direct packaged-runner route

From the installed plugin directory, run:

```sh
./bin/gfn-launch 1903340
```

Pass only if GFN identifies *Clair Obscur: Expedition 33* in allocation or a queue. GFN home, sign-in, an error, or a game-selection screen is not sufficient. Capture sanitized title-identifying evidence, then close GFN completely.

## 4. One-tap Steam-library flow

In Gaming Mode, open Expedition 33's normal Steam page. Confirm Steam's native action is unchanged and a single `Stream on GeForce NOW` action is present.

Activate the streaming action once and verify:

1. GFN reaches title-identifying Expedition 33 allocation or queue without another Play action.
2. The plugin owns exactly one hidden runner named `Stream GFN Runner`.
3. Its executable and start directory resolve inside the installed `stream-gfn/` directory.
4. Both stored launch-option fields are empty; the launch receives only `1903340` as the per-call argument.
5. Gamescope gives GFN foreground input without Desktop Mode fallback.
6. A named built-in controller action responds.
7. Steam's overlay opens and closes over GFN.
8. Steam's **Exit Game** action ends the runner and owned GFN process.

After Exit Game, poll every 500 ms for up to 10 seconds. Pass only after two consecutive polls where Steam reports the runner exactly `ReadyToLaunch` and the process check returns no matches. Missing, unrecognized, failed, timed-out, `Launching`, `Running`, or `Terminating` state is not ready.

Repeat the complete launch and exit cycle once. The same runner identity must be reused, its hidden state must remain true, and the plugin-owned runner count must remain one.

## 5. Fail-closed and cleanup checks

- Invoke the packaged runner with an unsupported AppID. It must exit non-zero before starting GFN.
- Reload the plugin during an active session. It must rehydrate Active or Unknown and must not launch again or create a duplicate.
- Use the plugin's explicit **Cleanup Runner** action only after the runner is verified inactive. It must reverify the complete fingerprint, remove that one shortcut, wait for absence, and then clear saved state.
- If any ownership field is missing or different, leave the shortcut untouched and record the mismatch.

Plugin unload or ordinary upgrade must remove frontend patches and listeners but must not silently delete the reusable runner.

## Results

| Check | Status | Evidence link | Notes |
|---|---|---|---|
| Browser download, checksum, and installed identity | NOT RUN | | |
| Direct packaged-runner route | NOT RUN | | |
| First one-tap lifecycle | NOT RUN | | |
| Second one-tap lifecycle and constant footprint | NOT RUN | | |
| Unsupported AppID | NOT RUN | | |
| Reload without relaunch or duplicate | NOT RUN | | |
| Explicit cleanup | NOT RUN | | |

Mark `GO` only when every row passes. A falsified route, identity, ownership, lifecycle, or one-tap behavior is `NO-GO`; update the GitHub prerelease title or notes to `NO-GO / DO NOT USE` and do not promote it. Unavailable device access is `BLOCKED / NOT RUN`, not `NO-GO`.
