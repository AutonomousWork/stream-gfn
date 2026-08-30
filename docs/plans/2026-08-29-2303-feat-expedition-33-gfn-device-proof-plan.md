---
title: Expedition 33 One-Tap GFN Device Proof - Plan
type: feat
date: 2026-08-29
deepened: 2026-08-29
topic: expedition-33-gfn-device-proof
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Expedition 33 One-Tap GFN Device Proof - Plan

## Goal Capsule

- **Objective:** From Gaming Mode on the Legion Go S, the user can start *Clair Obscur: Expedition 33* in GeForce NOW from its normal Steam page with one action while Steam retains input and process lifecycle control.
- **Means:** A Decky action launches one plugin-owned hidden Steam runner with AppID `1903340`; the runner maps that value to a fixed, validated GFN route. (KTD2, KTD3, KTD5)
- **Product authority:** This plan owns the single-title device proof. Catalog-backed multi-title support and release-grade behavior are surrounding work, not active scope.
- **Execution profile:** Build the strict runner, pass the direct-route and manual Steam-lifecycle gates on the Legion Go S, then automate the hidden runner and add the library action.
- **Stop conditions:** Stop before launch if GFN is not installed, the target is unsupported, the hidden runner cannot be reconciled without duplication, or a session already owns the runner.
- **Tail ownership:** The implementing workflow owns code, tests, a local proof bundle, device-proof instructions, and recorded verification evidence. It does not claim the proof passed without Legion Go S evidence.

---

## Product Contract

### Summary

Add a Stream on GeForce NOW action to Expedition 33's existing Steam page. The action uses one shared hidden Steam runner to cold-start the official GFN client and enter allocation or queueing without a second Play action.

### Problem Frame

Today the user must open NVIDIA GeForce NOW from the Steam library, navigate NVIDIA's library to Expedition 33, and launch it there. Steam already presents the game where the user decides what to play, but it offers no direct path into the GFN session. The proof must remove the duplicate browse-and-launch sequence without sacrificing Gaming Mode focus, controls, overlay access, or Exit Game behavior.

### Key Decisions

- **Prove the risky device path before building the broader product.** (session-settled: user-directed — chosen over a usable alpha or full MVP: validate the launch and Steam lifecycle integration before adding breadth) Governs R1-R12.
- **Require one-tap session launch.** (session-settled: user-directed — chosen over a GFN details-page handoff: eliminate the second navigation and Play action) Governs R2, R6.
- **Keep one shared hidden runner.** (session-settled: user-directed — chosen over one hidden shortcut per title: keep the shortcut footprint constant as title support grows) Governs R3, R4, R5, R11, R12.
- **Use one shared GFN controller profile.** (session-settled: user-approved — chosen over per-title Steam Input profiles: avoid shortcut sprawl in the proof) Governs R8.
- **Hard-code the proof target.** Expedition 33 is the only recognized title until the device path passes. Governs R4, R5.

### How This Work Fits Together

This plan owns the Expedition 33 device proof. These areas are surrounding-work hypotheses, not a committed roadmap.

- **Catalog-backed multi-title support:** Depends on this proof and shares its single-runner AppID input contract.
- **Production resilience and user guidance:** Depends on observed failure modes of the official GFN client and Steam lifecycle on the target device.
- **Per-title input customization:** Can proceed independently later only if it preserves R3's constant shortcut footprint.

### Actors

- A1. **Legion Go S player:** Chooses between the existing Steam action and streaming Expedition 33 through GFN from Gaming Mode.
- A2. **Steam and Decky integration:** Presents the Stream action and owns the shared runner's launch lifecycle.
- A3. **Official GeForce NOW client:** Accepts the title route and performs authentication, allocation, queueing, and streaming.

### Requirements

#### Steam page experience

- R1. Expedition 33's normal Steam detail page for AppID `1903340` presents a distinct Stream on GeForce NOW action without replacing or changing Steam's native action.
- R2. One activation of the Stream action initiates the GFN launch flow without requiring the user to browse NVIDIA's library or press Play again.

#### Shared runner boundary

- R3. The plugin maintains at most one plugin-owned hidden Steam runner regardless of how many titles may be supported later.
- R4. Each launch supplies only the selected Steam AppID to the shared runner, and the runner rejects unrecognized input instead of accepting arbitrary commands or raw routes.
- R5. For this proof, AppID `1903340` resolves to the validated Expedition 33 GFN route and no other AppID is supported.

#### Cold launch and Steam lifecycle

- R6. With GFN fully stopped, the Stream action cold-starts the official client and reaches Expedition 33's allocation or queue without another user action.
- R7. Gamescope focuses the GFN client after Steam launches the shared runner.
- R8. The Legion Go S controls operate through one shared GFN Steam Input profile.
- R9. Steam's overlay is available while GFN is running.
- R10. Steam's Exit Game action ends the shared runner and the GFN process it owns.
- R11. The plugin-owned shared runner remains hidden from the normal Steam library.
- R12. Repeated launches reuse the existing runner without creating additional shortcuts.

### Key Flows

- F1. **Cold-start Expedition 33 from its Steam page.** A1 selects Stream on GeForce NOW while GFN is stopped; A2 launches the shared runner with AppID `1903340`; the runner validates and resolves the target; A3 enters allocation or queueing. Covers R1-R6.
- F2. **Use and exit the Steam-owned GFN session.** Gamescope focuses GFN; the shared controller profile handles input; A1 can open the Steam overlay and invoke Exit Game. Covers R7-R10.
- F3. **Reuse the runner.** A1 launches again after a completed exit; A2 reconciles and reuses the same hidden runner with AppID `1903340`. Covers R3-R5, R11, R12.

### Acceptance Examples

- AE1. **Cold one-tap launch.** Given GFN is installed, authenticated, and stopped on the Legion Go S, when the user selects Stream on GeForce NOW from Expedition 33's Steam page, then GFN reaches allocation or queue without another Play action. Covers R1, R2, R5, R6.
- AE2. **Steam-owned lifecycle.** Given Expedition 33 was launched through the shared runner, when the user operates the built-in controls, opens the Steam overlay, and selects Exit Game, then input works, the overlay appears, and Steam terminates the runner and its owned GFN process. Covers R7-R10.
- AE3. **Constant shortcut footprint.** Given the hidden runner exists, when the user launches Expedition 33 again, then the same runner is reused, the plugin-owned shortcut count remains one, and no visible duplicate appears. Covers R3, R11, R12.
- AE4. **Reject an unsupported target.** Given the runner receives an AppID other than `1903340`, when launch is attempted, then it exits before Flatpak without treating the input as a command or launching another title. Covers R4, R5.

### Success Criteria

- AE1-AE3 pass twice in succession from Gaming Mode on the Legion Go S.
- AE4 passes once before the proof is accepted.
- The second run reuses the same hidden shortcut and produces the same one-tap result as the first.
- The proof produces an unambiguous go or no-go decision for catalog-backed title expansion without requiring catalog work to reach that decision.

### Scope Boundaries

#### Deferred for later

- NVIDIA catalog discovery, caching, refresh, and support for titles beyond Expedition 33.
- GFN installation, authentication recovery, concurrent-session handling, and production fallback behavior.
- Automatic detection of remote game completion, automatic background client shutdown, distribution packaging, and plugin-store release polish.
- Per-title Steam Input profiles that preserve R3's constant shortcut footprint.

#### Outside this product's identity

- Creating one hidden Steam shortcut per supported title.
- Creating visible duplicate GFN entries for games already represented in the Steam library.

### Dependencies

- The target Legion Go S has Decky Loader and NVIDIA's official `com.nvidia.geforcenow` Flatpak installed and authenticated.
- The development host is macOS, so Gamescope, Steam Input, overlay, and Exit Game evidence must come from the Legion Go S.
- Steam and GFN expose undocumented compatibility surfaces. The implementation must version-gate them and fail closed when they are absent.

### Sources and Research

- [`README.md`](../../README.md) — current repository product statement.
- [Decky Loader plugin template](https://github.com/SteamDeckHomebrew/decky-plugin-template) — current package, build, lifecycle, and frontend/backend conventions.
- [Decky frontend Steam client types](https://github.com/SteamDeckHomebrew/decky-frontend-lib/tree/main/src/globals/steam-client) — shortcut creation and launch surface.
- [Klay at `70a37ed`](https://github.com/gshipley/Klay/tree/70a37ed36230d24146534d9bfbc02fb06e2adadf) — current GFN catalog query and native route construction.
- [MoonDeck at `4d1021b`](https://github.com/FrogTheFrog/moondeck/tree/4d1021b4f7afe930e8025e25471af40aab1d73a1) — adjacent Steam shortcut reconciliation, hidden-state verification, launch, and library-page patch patterns.
- NVIDIA's public GFN catalog response observed on 2026-08-29 — Expedition 33 Steam variant: CMS ID `103134919`, parent game ID `037a263a-adbf-4705-8509-76447080de75`, fallback short name `game_gfn_pc`.

---

## Planning Contract

### Product Contract Preservation

The Product Contract is unchanged. Planning resolves its deferred technical questions without changing R1-R12, F1-F3, or AE1-AE4.

### Key Technical Decisions

- KTD1. Use the current Decky TypeScript/React frontend and Python backend shape with `@decky/api`, `@decky/ui`, and `@decky/rollup`; do not use deprecated Decky APIs. This supplies a buildable greenfield baseline for R1-R12.
- KTD2. Steam launches the plugin-owned runner, and the runner replaces itself with the Flatpak process. The backend never launches GFN on behalf of the frontend. This preserves Steam's process ownership for R6-R10.
- KTD3. Store the Expedition 33 route as typed, immutable metadata and construct the Flatpak argument vector without shell parsing. The observed route is `#?cmsId=103134919&launchSource=External&shortName=game_gfn_pc&parentGameId=037a263a-adbf-4705-8509-76447080de75`. Accept exactly one decimal AppID and reject every unrecognized value before process launch. This implements R4 and R5.
- KTD4. Reconcile the runner through a narrow private-Steam adapter. Ownership requires an exact unique fingerprint of plugin-owned executable path, start directory, display name, and empty stored launch options. Create only when absent, verify hidden state, and remove only a candidate created and reverified during the current attempt. This implements R3, R11, and R12. (session-settled: user-directed — chosen over creating one shortcut per title: keep the shortcut footprint constant as support grows)
- KTD5. Keep the shortcut's stored launch options empty and supply AppID `1903340` through Steam's per-launch argument field. Do not rewrite shortcut options for each click. This implements R3-R5 and R12. (session-settled: user-directed — chosen over title-specific shortcut launch options: preserve a single reusable runner)
- KTD6. Patch only the `/library/app/:appid` surface, require an exact `1903340` match, guard all private React-tree lookups, and remove the patch during plugin dismount. This contains the compatibility risk for R1 and R2.
- KTD7. Model runner activity as `inactive`, `active`, or `unknown`. U7 records the target's initial-state primitive; U3 combines that snapshot with runner-scoped Steam lifetime notifications. Only `inactive` may launch. `active` and `unknown` disable launch and direct the user to Steam's Exit Game action. This keeps deferred concurrent-session behavior outside F1-F3.
- KTD8. Make the backend the sole persistence authority. Persist only the reconciled runner shortcut ID as a string and its schema version in Decky's settings directory. Do not persist fingerprints, raw routes, executable arguments, or commands. This supports deterministic reuse under R3, R4, and R12.
- KTD9. Keep `targetSteamAppId`, `runnerShortcutId`, and `runnerGameId64` as distinct string-valued concepts. Resolve the 64-bit launch identity from Steam's verified overview and never carry these opaque IDs as JavaScript numbers. This prevents cross-identity mutation while implementing R3-R5 and R12.

### Assumptions

These bets were not validated in the planning environment and remain explicit device gates.

- The installed GFN Flatpak accepts the observed route fields and enters allocation or queueing when cold-started.
- Steam's current Gaming Mode runtime exposes shortcut creation, per-launch arguments, library overview lookup, hidden collection state, and launch source `100` in the shapes observed in current Decky and MoonDeck sources.
- Replacing the runner process with Flatpak keeps GFN inside Steam's lifecycle boundary so overlay and Exit Game work as R9 and R10 require.
- One shared Steam Input profile on the runner supplies usable built-in controls to GFN.

### System-Wide Impact

- **Steam library state:** U3 may create one non-Steam shortcut. It may mutate or remove only a shortcut whose full plugin fingerprint proves ownership under KTD4.
- **Decky lifecycle:** U4 installs a private route patch and must remove it on unload or any compatibility failure so the native Steam page remains usable.
- **Process lifecycle:** KTD2 makes Steam the session owner. A detached or surviving GFN process invalidates the mechanism and stops later units.
- **Persistent state:** KTD8 limits durable state to a schema version and runner shortcut ID. Reconciliation treats missing, malformed, stale, and ambiguous state as distinct fail-closed outcomes.
- **Compatibility surface:** Route fields, private Steam state, and GFN process behavior are bound to the version tuple captured at each device gate.

### Risks and Mitigations

| Risk | Earliest gate | Mitigation and stop signal |
|---|---|---|
| The route fixture opens the wrong title or no title | U7 direct-route gate | Require title-identifying allocation or queue evidence; record `NO-GO` and stop before U3 |
| Flatpak detaches from Steam's process lifecycle | U7 manual lifecycle gate | Require Steam running-state clearance and no remaining GFN process after Exit Game; stop before U3 |
| Private Steam APIs drift or hiding cannot be verified | U3 automatic-runner gate | Feature-detect exact capabilities, preserve the pre-run inventory, remove only the verified new candidate, and stop before U4 |
| Shortcut identity types are confused | U3 automated and device tests | Enforce KTD9, persist strings, and compare the same opaque shortcut and 64-bit game identities before both launches |
| Page injection breaks the native library page | U4 tests and U6 final gate | Guard tree matching, cleanly unpatch, and unload the plugin during no-go cleanup |
| GFN account data leaks into evidence | U6 evidence review | Store only sanitized screenshots and logs; exclude credentials, tokens, and account identifiers |

### High-Level Technical Design

These sketches constrain boundaries and sequencing. Exact APIs and component names may change during implementation if the behavior and gates remain intact.

#### Component topology

```mermaid
flowchart LR
  Page[Steam game detail page] --> Patch[Decky page patch]
  Patch --> Orchestrator[Runner orchestrator]
  Orchestrator --> Steam[Steam shortcut and launch surface]
  Orchestrator --> Backend[Decky backend state and preflight]
  Steam --> Runner[Plugin-owned runner]
  Runner --> Flatpak[Official GFN Flatpak]
  Backend --> State[(Runner shortcut state)]
```

#### Cold-launch sequence

```mermaid
sequenceDiagram
  participant U as Player
  participant D as Decky frontend
  participant B as Decky backend
  participant S as Steam
  participant R as Shared runner
  participant G as GFN
  U->>D: Select Stream on GeForce NOW
  D->>B: Request preflight and saved runner identity
  B-->>D: Ready or actionable failure
  D->>S: Reconcile one hidden runner
  S-->>D: Stable launch identity
  D->>S: Launch with AppID 1903340
  S->>R: Start runner under Steam lifecycle
  R->>R: Validate and resolve AppID
  R->>G: Replace process with fixed GFN route
  G-->>U: Allocation or queue
```

#### Runner lifecycle

```mermaid
stateDiagram-v2
  [*] --> Unknown
  Unknown --> Missing: no valid saved runner
  Unknown --> Ready: saved runner verifies
  Missing --> Provisioning: launch requested
  Provisioning --> Ready: configured and hidden
  Provisioning --> Failed: configure or hide fails
  Ready --> Running: Steam launch succeeds
  Running --> Ready: Steam-owned process exits
  Running --> Running: second request is rejected
  Failed --> Missing: partial shortcut removed
```

#### Reconciliation decision flow

```mermaid
flowchart TD
  A[Load saved runner identity] --> B{Identity verifies?}
  B -->|Yes| C{Hidden state verifies?}
  B -->|No| D{Exactly one matching runner found?}
  D -->|Yes| C
  D -->|No match| E[Create one candidate]
  D -->|Ambiguous| F[Fail closed]
  E --> G[Configure candidate]
  G --> H{Hide and verify?}
  H -->|Yes| I[Persist identity]
  H -->|No| J[Remove candidate and fail]
  C -->|Yes| I
  C -->|No| F
```

#### Launch data boundary

```mermaid
flowchart LR
  AppId[Steam AppID text] --> Shape{Decimal and exact allowlist match?}
  Shape -->|No| Reject[Exit before Flatpak]
  Shape -->|Yes| Fixture[Immutable Expedition 33 fixture]
  Fixture --> Route[GFN route value]
  Route --> Args[Argument vector]
  Args --> Exec[Process replacement]
```

### Output Structure

```text
.
├── .github/workflows/ci.yml
├── backend/
│   ├── __init__.py
│   ├── launcher.py
│   └── settings.py
├── bin/gfn-launch
├── docs/
│   ├── device-proof.md
│   └── plans/2026-08-29-2303-feat-expedition-33-gfn-device-proof-plan.md
├── main.py
├── src/
│   ├── api.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── GfnLaunchButton.test.tsx
│   │   └── GfnLaunchButton.tsx
│   ├── library/
│   │   ├── patchLibraryApp.test.tsx
│   │   └── patchLibraryApp.tsx
│   └── steam/
│       ├── privateSteam.ts
│       ├── runnerShortcut.test.ts
│       ├── runnerShortcut.ts
│       ├── runnerState.test.ts
│       └── runnerState.ts
├── tests/
│   ├── test_launcher.py
│   └── test_settings.py
├── LICENSE
├── Makefile
├── package.json
├── pnpm-lock.yaml
├── plugin.json
├── rollup.config.mjs
└── tsconfig.json
```

### Implementation Constraints

- The plugin must run without root privileges.
- The backend may accept a supported AppID but must not accept executable paths, shell fragments, arbitrary Flatpak flags, or raw GFN routes from the frontend.
- The runner executable path and working directory must be absolute and plugin-owned.
- A newly created shortcut is not persistent state until its Steam overview, configuration, and hidden state all verify.
- Private Steam access must be feature-detected and isolated so a loader or Steam update produces an actionable error instead of a visible duplicate or a crash.
- The GFN route fixture must include its observation date and source metadata because the route is undocumented.
- The UI must not advertise a successful start until Steam accepts the runner launch.

### Sequencing

```mermaid
flowchart LR
  U1[U1 Scaffold and contracts] --> U2[U2 Safe route runner]
  U2 --> U7[U7 Direct route and manual lifecycle gate]
  U7 --> U3[U3 Shared shortcut orchestration and automatic runner gate]
  U3 --> U4[U4 Expedition 33 library action]
  U4 --> U5[U5 Local bundle and operator loop]
  U5 --> U6[U6 Integrated Legion Go S proof]
```

---

## Implementation Units

### U1. Establish the Decky plugin scaffold and executable contracts

- **Goal:** Create the smallest current Decky project that builds deterministically and gives backend, frontend, and tests stable boundaries.
- **Requirements:** R1-R12.
- **Dependencies:** None.
- **Files:** `package.json`, `pnpm-lock.yaml`, `plugin.json`, `rollup.config.js`, `tsconfig.json`, `main.py`, `backend/__init__.py`, `src/index.tsx`, `tests/frontend/scaffold.test.mjs`, `tests/backend/test_lifecycle.py`, `.github/workflows/ci.yml`.
- **Approach:** Pin the current Decky packages from KTD1, register a minimal plugin lifecycle, expose typed backend callables, and define build, typecheck, frontend-test, backend-test, and aggregate verification scripts. Keep the initial UI inert until U4.
- **Test scenarios:** A production build emits `dist/index.js`; TypeScript compilation succeeds without deprecated Decky imports; the backend loads and unloads without writing outside Decky's assigned directories; CI runs the same aggregate checks as local development.
- **Verification:** `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm run build`, and `pnpm test` succeed on the development host.

### U2. Build the strict Expedition 33 route runner

- **Goal:** Convert only AppID `1903340` into the observed GFN route and replace the runner process with the official Flatpak.
- **Requirements:** R4-R6, AE1, AE4.
- **Dependencies:** U1.
- **Files:** `backend/launcher.py`, `backend/settings.py`, `bin/gfn-launch`, `tests/backend/test_launcher.py`, `tests/backend/test_settings.py`.
- **Approach:** Implement KTD2, KTD3, and KTD8. Keep command construction pure and testable. Make the executable wrapper validate one positional argument, preserve the inherited environment, and replace itself with `/usr/bin/flatpak`. Expose preflight and saved-runner state through fixed-shape backend methods. Add a versioned environment adjustment only if U7 records a specific target conflict.
- **Test scenarios:** AppID `1903340` yields the exact CMS ID, parent ID, fallback short name, and argument-vector ordering; missing, extra, non-decimal, shell-like, and unsupported inputs exit before process replacement; a missing Flatpak produces a preflight failure; settings round-trip a valid shortcut ID and discard malformed or unknown-schema state; a mocked process replacement receives a list rather than a shell string.
- **Verification:** `pnpm run test:backend` passes, `bin/gfn-launch 0` exits non-zero without invoking Flatpak in a mocked harness, and the staged runner retains executable permissions.

### U7. Prove the direct route and manual Steam lifecycle on device

- **Goal:** Falsify the two riskiest assumptions before implementing private shortcut automation or library-page injection.
- **Requirements:** R5-R10, F1, F2, AE1, AE2.
- **Dependencies:** U2.
- **Files:** `docs/device-proof.md` and sanitized evidence under `docs/device-proof-results/`.
- **Execution note:** This is a hard device gate. A route or lifecycle `NO-GO` stops U3-U6 and does not authorize a details-page handoff, backend-owned launch, visible duplicate, or per-title runner.
- **Approach:** Capture the target version tuple and pre-run process state. First invoke the fixed route through the runner wrapper and require a title-identifying Expedition 33 allocation or queue screen. Then register one temporary Steam-owned runner manually and verify Gamescope foreground input, one named built-in controller action, visible Steam overlay open and close, Steam Exit Game, cleared Steam running state, and no remaining GFN process under the Verification Contract's lifecycle rule. Record the current-state Steam primitive that can initialize KTD7 before U3 begins. Remove only the verified temporary shortcut during cleanup.
- **Test scenarios:** The direct route opens the Expedition 33 allocation or queue rather than GFN home or another title; a manual Steam runner remains active for the session; the chosen initial-state primitive reports active and inactive states and maps errors to unknown; GFN receives foreground input without desktop fallback; the named controller action responds; the Steam overlay opens and closes over GFN; Exit Game clears Steam's running state and leaves no GFN process; any failure records the invalidated KTD and final inventory without proceeding.
- **Verification:** The U7 matrix records `GO` for both direct-route and manual lifecycle gates with sanitized evidence, or a reproducible `NO-GO` with cleanup. U3 may begin only after `GO`.

### U3. Reconcile and launch one hidden Steam runner

- **Goal:** Provision or recover exactly one hidden shortcut and launch it with a per-call AppID argument.
- **Requirements:** R3-R5, R11, R12, F3, AE3.
- **Dependencies:** U1, U2, U7.
- **Files:** `src/api.ts`, `src/steam/privateSteam.ts`, `src/steam/runnerShortcut.ts`, `src/steam/runnerState.ts`, `src/steam/runnerShortcut.test.ts`, `src/steam/runnerState.test.ts`.
- **Approach:** Implement KTD4, KTD5, KTD7-KTD9 behind injected Steam and backend ports. Wait for Steam's app overview before treating a shortcut as usable. Verify hidden state through a feature-detected collection adapter. Refuse near-match or foreign shortcuts. Resolve Steam's launch identity from the verified overview and pass `1903340` only at launch time.
- **Test scenarios:** A fully fingerprinted saved runner is reused without creation; one exact recoverable runner repairs stale saved state; a name-only or partial match is left untouched; no runner creates, configures, hides, verifies, and persists one candidate; an ambiguous match fails without creation; hide or configure failure reverifies and removes only the current candidate; runner IDs round-trip as strings; the target primitive initializes inactive, active, and unknown states; lifetime events update only the matching runner; active and unknown requests do not call Steam launch; Steam receives the 64-bit runner launch identity and target AppID separately.
- **Verification:** `pnpm run test:frontend -- src/steam` passes. On the Legion Go S, the automatic-runner gate records the required private API capabilities, proves one hidden fingerprinted runner, captures the runner receiving exactly one argument `1903340`, and confirms stored launch options remain empty before and after two sequential launches. Any failure stops before U4.

### U4. Add the Expedition 33 library-page action

- **Goal:** Present a guarded one-tap action only on Expedition 33's normal Steam page and connect it to U3.
- **Requirements:** R1, R2, R6, F1, AE1.
- **Dependencies:** U3.
- **Files:** `src/index.tsx`, `src/components/GfnLaunchButton.tsx`, `src/library/patchLibraryApp.tsx`, `src/library/patchLibraryApp.test.tsx`, `src/components/GfnLaunchButton.test.tsx`.
- **Approach:** Implement KTD6 and KTD7. Patch the library-detail route on mount, locate the action area through guarded tree matching, inject one Decky-styled action for exact AppID `1903340`, and remove the patch on dismount. Disable repeat activation while work is in flight or the runner is active. Surface preflight, reconciliation, and launch failures through concise toasts.
- **Test scenarios:** The button appears once for AppID `1903340` and never for another or malformed AppID; the native action remains present; one click issues one launch request; rapid repeated clicks issue one request; missing private surfaces render no broken control and emit a diagnostic; dismount removes the route patch; backend and Steam failures restore the enabled state and show an actionable toast.
- **Verification:** `pnpm run test:frontend -- src/library src/components` passes, `pnpm run typecheck` passes, and `pnpm run build` emits the frontend bundle.

#### U4 interaction states

| State | Stream action | Player guidance | Exit |
|---|---|---|---|
| Ready | Enabled; label `Stream on GeForce NOW` | None | Activation enters Starting |
| Starting | Disabled; label `Starting GeForce NOW…` | No success message until Steam reports the runner active | Steam rejection or timeout enters Failure; runner start enters Active |
| Active | Disabled; label `GeForce NOW is running` | Use Steam's Exit Game action to end the current stream | Matching lifetime-end event returns to Ready |
| Preflight failure | Enabled after the failed attempt | State the missing prerequisite and invite retry after it is corrected | Dismiss returns to Ready |
| Runner failure | Enabled after rollback | State that the hidden runner could not be prepared; invite Steam restart and retry | Dismiss returns to Ready |
| Launch failure | Enabled after rejection, cancellation, or timeout | State that Steam did not start GFN and invite retry | Dismiss returns to Ready |
| Unknown activity | Disabled | State that runner status cannot be verified; direct the player to Exit Game or restart Steam | A verified inactive snapshot returns to Ready |

### U5. Assemble the local proof bundle and document the operator loop

- **Goal:** Produce a local Decky device-test bundle and a repeatable development-to-device verification loop without creating a distribution package.
- **Requirements:** R1-R12 and AE1-AE4.
- **Dependencies:** U2, U3, U4, U7.
- **Files:** `README.md`, `docs/device-proof.md`, `Makefile`, `package.json`, `plugin.json`, `LICENSE`, and proof-bundle support files required by the current Decky template.
- **Approach:** Document prerequisites, build output, manual installation, reload, cleanup, Steam Input profile setup, version capture, cold-start preparation, and runner-count inspection. Stage only loader-required files and the runner/backend assets in a local proof directory. Do not create a release archive. Never automate account credentials or root-level installation.
- **Test scenarios:** A clean checkout builds the staging tree; it contains the manifest, frontend bundle, backend entrypoint, runner, backend modules, and license; it excludes source caches, dependencies, tests, and secrets; install and uninstall instructions preserve unrelated Steam shortcuts; the checklist captures Decky, Steam, SteamOS, and GFN versions.
- **Verification:** `pnpm run bundle:proof` succeeds, the staged tree matches the documented allowlist, and a clean copied bundle passes a backend import smoke test.

### U6. Execute and record the Legion Go S device proof

- **Goal:** Determine whether the single-runner architecture satisfies the user-visible proof on the target hardware.
- **Requirements:** R1-R12, F1-F3, AE1-AE4.
- **Dependencies:** U5.
- **Files:** `docs/device-proof.md` and device evidence under `docs/device-proof-results/` when the target is available.
- **Execution note:** This unit is an on-device acceptance gate. Development-host substitutes cannot prove Gamescope focus, Steam Input, overlay, hidden-library state, or Steam-owned termination.
- **Approach:** Capture the native Steam page, shortcut inventory, runner fingerprint, opaque identities, stored launch options, and process state before installation. Confirm U7 and U3 gate evidence still matches the installed versions. Run AE4, then run two complete AE1-AE3 cycles from fully stopped GFN. After each exit, record Steam running state, GFN processes, runner count, hidden state, launch options, and page usability. On failure, unload the page patch, stop the owned processes, and remove only a newly created runner whose ownership still verifies.
- **Test scenarios:** Unsupported AppID fails before Flatpak; the cold action reaches a title-identifying Expedition 33 allocation or queue without a second action; GFN receives foreground input without desktop fallback; a named built-in controller action responds; the Steam overlay opens and closes over GFN; Exit Game clears Steam's running state and leaves no GFN process after the recorded interval; the original game page remains usable; the second cycle launches the same hidden shortcut with exactly one argument `1903340`, empty stored launch options, and no shortcut mutation; every failure ends in the documented safe inventory and process state.
- **Verification:** The completed matrix links sanitized evidence for every AE and reports one `GO` or `NO-GO` conclusion. `GO` requires AE1-AE3 twice and AE4 once. `NO-GO` requires a reproducible failure record and completed cleanup.

---

## Verification Contract

### Development-host gates

- `pnpm install --frozen-lockfile` proves the lockfile resolves without mutation.
- `pnpm run typecheck` proves the Decky frontend and private adapter types compile.
- `pnpm run test:frontend` proves page gating, runner reconciliation, launch arguments, rollback, and reentrancy behavior under mocked Steam surfaces.
- `pnpm run test:backend` proves strict AppID validation, fixed route construction, safe process arguments, preflight, and settings behavior.
- `pnpm run build` proves the loader frontend bundle is emitted.
- `pnpm run bundle:proof` proves the local device-test bundle contains only the documented runtime files.
- `pnpm test` is the aggregate local and CI gate and must run typecheck, frontend tests, backend tests, build, and proof-bundle verification.

### Legion Go S gates

| Gate | Preconditions | Action | Done signal |
|---|---|---|---|
| Direct route | Runner from U2; GFN authenticated and stopped | Run U7 route check | Expedition 33 is identified on allocation or queue; a generic GFN screen is insufficient |
| Manual Steam lifecycle | Direct route passed; temporary runner fingerprint recorded | Run U7 lifecycle check | GFN takes foreground input; named controller action and overlay work; Exit Game clears Steam running state and GFN processes |
| Private API capability | U7 passed; target versions recorded | Inspect the exact page, shortcut, overview, hidden-state, launch, and active-run surfaces used by U3 | Every surface is present in the expected shape; any mismatch is `NO-GO` |
| Automatic runner | U3 installed without U4 page patch | Reconcile and launch twice after complete exits | Same hidden fingerprint and opaque identities; one argument `1903340`; empty stored launch options; runner count one |
| Unsupported target | GFN stopped; test harness invokes runner with a non-allowlisted value | Run AE4 once | Non-zero exit; no GFN process; diagnostic names unsupported AppID |
| Cold one-tap launch | GFN authenticated and fully stopped | Run AE1 from Expedition 33 page | Title-identifying Expedition 33 allocation or queue appears without another action |
| Gaming Mode lifecycle | Session started through the runner | Run AE2 | Foreground input, named controller action, and overlay pass; Exit Game clears Steam running state and GFN processes |
| Constant footprint | First run exited; runner identity recorded | Run AE3 and repeat AE1-AE3 | Same fingerprint and identities; one hidden runner; empty stored options; no visible duplicate or per-click mutation |

### Evidence rules

- Give each dated record an operator or evidence owner.
- Record the Decky Loader, Steam client, SteamOS, GFN Flatpak, and plugin commit versions.
- Record the runner fingerprint, opaque shortcut and game identities, route-fixture observation date, and stored launch options without account data.
- Record before and after runner count, hidden state, Steam running state, GFN process state, and native page usability.
- Record pass or fail for each observable step and link a supporting sanitized screenshot or log.
- Sanitize screenshots and logs so NVIDIA account data, tokens, and device credentials are absent.
- A development-host pass does not waive any Legion Go S gate.
- Browser testing is not applicable because the changed user surface is Steam Gaming Mode, not a web page.

### Lifecycle Observation Rule

- Start the observation clock when the player confirms Steam's Exit Game action.
- Poll every 500 milliseconds for up to 10 seconds.
- Steam is clear only when the runner-scoped lifetime state is not running.
- GFN is clear only when `/usr/bin/pgrep -af 'com.nvidia.geforcenow|/app/cef/GeForceNOW'` returns no matching process.
- Record `GO` only after both probes are clear on two consecutive polls. Timeout or an unavailable probe is `NO-GO`.

### No-Go Cleanup

- Stop any Steam-owned runner and confirm both lifecycle probes clear under the Lifecycle Observation Rule.
- Restore the native page by unloading the plugin patch.
- Remove only a shortcut created by this proof whose full ownership fingerprint still verifies.
- Restore the pre-existing verified runner state or clear persisted state when no owned runner remains.
- Record the failing assumption, phase, version tuple, and final shortcut inventory and process state.

---

## Definition of Done

- U1 is done when a clean checkout installs, typechecks, tests, builds, and produces `dist/index.js` through pinned commands.
- U2 is done when only AppID `1903340` can reach the fixed route and every invalid input exits before Flatpak.
- U7 is done when its device matrix records both route and lifecycle `GO`, or a reproducible `NO-GO` with cleanup that stops later units.
- U3 is done when mocked tests and the automatic-runner device gate prove exact fingerprint ownership, opaque-ID separation, create, recover, reuse, hide verification, rollback, active-run rejection, per-launch argument delivery, empty stored options, and constant shortcut count.
- U4 is done when the guarded action appears only on Expedition 33, preserves the native action, launches once per activation, and cleans up on dismount.
- U5 is done when the local device-test bundle and device runbook are reproducible from a clean checkout without a distribution archive.
- U6 is done when the Legion Go S matrix records AE1-AE3 passing twice and AE4 passing once, or records a reproducible `NO-GO` that identifies the invalidated assumption and completes no-go cleanup.
- R1-R12 each trace to an implementation unit and a verification gate.
- The repository contains no credentials, account data, build caches, dead-end experiments, duplicate runner logic, or abandoned implementation paths.
- The final diff preserves the requirements-only Product Contract's meaning and stable IDs.
