# U7 Legion Go S device proof

U7 is a hard gate. Do not begin U3-U6 shortcut automation, page injection, proof bundling, or integrated testing until both checks below are `GO` on the target Legion Go S.

## Prerequisites and record

- Legion Go S is in Gaming Mode with Decky Loader available.
- The official `com.nvidia.geforcenow` Flatpak is installed, authenticated, and fully stopped.
- The current branch and its executable `bin/gfn-launch` runner are available on the device.
- Evidence is sanitized: never capture account names, tokens, cookies, device credentials, or unrelated library entries.

Record the exact test tuple before running:

| Field | Value |
|---|---|
| Date and operator | |
| Plugin commit | |
| Decky Loader | |
| Steam client | |
| SteamOS | |
| GFN Flatpak | |

Record the pre-run shortcut inventory as a total count plus proof-owned entries only. Record whether Steam considers the proof runner active and the output of:

```sh
/usr/bin/pgrep -af 'com.nvidia.geforcenow|/app/cef/GeForceNOW'
```

The process check must return no matches. Sanitize all captured output.

## 1. Direct route

From the plugin root, run the executable wrapper with exactly one positional argument:

```sh
./bin/gfn-launch 1903340
```

Pass only if GFN identifies *Clair Obscur: Expedition 33* in allocation or a queue. A generic GFN home, sign-in, error, or game-selection screen is not sufficient. Capture sanitized title-identifying evidence, then close GFN completely before the lifecycle check.

## 2. Manual Steam lifecycle

Create one temporary non-Steam shortcut owned only by this proof. Before creating it, record this complete fingerprint as exact strings:

| Fingerprint field | Required value |
|---|---|
| Display name | `Stream GFN U7 Temporary Runner` |
| Target executable | Absolute path to this checkout's `bin/gfn-launch` |
| Start directory | Absolute path to this checkout |
| Stored launch options | `1903340` |
| Steam shortcut ID | Record as an opaque string |
| Steam 64-bit game ID | Record as an opaque string |

Do not reuse, edit, or delete a shortcut that differs in any fingerprint field. Launch this temporary shortcut from Gaming Mode and verify all of the following:

1. GFN reaches title-identifying Expedition 33 allocation or queue and receives Gamescope foreground input without falling back to Desktop Mode.
2. The operator names and tests one specific built-in Legion Go S controller action (for example, left-stick navigation) and records the observed response.
3. The Steam overlay opens and closes over GFN.
4. Steam's **Exit Game** action is used to end the temporary runner.

Record the exact Steam API path or state primitive used to read the verified runner's current state, plus its raw value. Normalize an explicit running value to `active`, an explicit stopped value to `inactive`, and any missing API, exception, timeout, or ambiguous value to `unknown`. Only `inactive` satisfies the exit check.

After Exit Game, poll every 500 ms for at most 10 seconds. Success requires two consecutive polls where both conditions hold:

- the recorded Steam state primitive reports the temporary runner `inactive`; and
- `/usr/bin/pgrep -af 'com.nvidia.geforcenow|/app/cef/GeForceNOW'` returns no matches.

Any `unknown` Steam state fails the lifecycle check.

## Results

| Check | Status | Evidence link | Notes |
|---|---|---|---|
| Direct route | NOT RUN | | |
| Manual lifecycle | NOT RUN | | |

Mark U7 `GO` only when both rows pass. A falsified route or lifecycle is `NO-GO` and stops U3-U6. Unavailable hardware or device access is `BLOCKED / NOT RUN`, not `NO-GO`.

## Safe cleanup

1. Use Steam's **Exit Game** for the proof-owned runner, then repeat the two-consecutive-poll lifecycle check.
2. Re-read every fingerprint field and both opaque IDs from the temporary shortcut. Remove it only if the complete fingerprint exactly matches the values recorded before creation.
3. If any field is missing or different, leave the shortcut untouched and record the mismatch.
4. Record the final total shortcut count, proof-owned entries, normalized Steam state, and sanitized GFN process state.

The device proof is currently blocked until the operator supplies access to the Legion Go S. No credentials need to be included in the proof record.
