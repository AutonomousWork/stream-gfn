import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from py_modules.stream_gfn_backend import settings


class SettingsStateTest(unittest.TestCase):
    def test_default_state_is_json_serializable_and_unbound(self) -> None:
        state = settings.default_state()

        self.assertEqual(
            state,
            {"schemaVersion": settings.STATE_SCHEMA_VERSION, "runnerShortcutId": None},
        )
        self.assertEqual(json.loads(json.dumps(state)), state)

    def test_runner_shortcut_id_must_be_a_string_or_null(self) -> None:
        self.assertEqual(
            settings.validate_state(
                {"schemaVersion": settings.STATE_SCHEMA_VERSION, "runnerShortcutId": "42"}
            ),
            {"schemaVersion": settings.STATE_SCHEMA_VERSION, "runnerShortcutId": "42"},
        )
        self.assertIsNone(settings.validate_state(settings.default_state())["runnerShortcutId"])

        for invalid_value in (42, True, [], {}):
            with self.subTest(invalid_value=invalid_value):
                with self.assertRaisesRegex(
                    settings.StateValidationError, "runnerShortcutId"
                ):
                    settings.validate_state(
                        {
                            "schemaVersion": settings.STATE_SCHEMA_VERSION,
                            "runnerShortcutId": invalid_value,
                        }
                    )

    def test_state_requires_current_schema_version(self) -> None:
        with self.assertRaisesRegex(settings.StateValidationError, "schemaVersion"):
            settings.validate_state({"schemaVersion": 999, "runnerShortcutId": None})

    def test_state_rejects_unknown_persisted_fields(self) -> None:
        with self.assertRaisesRegex(settings.StateValidationError, "only"):
            settings.validate_state(
                {
                    "schemaVersion": settings.STATE_SCHEMA_VERSION,
                    "runnerShortcutId": None,
                    "route": "must-not-be-persisted",
                }
            )


class StateStoreTest(unittest.TestCase):
    def test_missing_state_returns_default_with_internal_diagnostic(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = settings.StateStore(Path(directory)).load()

        self.assertEqual(result.state, settings.default_state())
        self.assertEqual(result.diagnostic, "missing")

    def test_round_trip_is_atomic_same_directory_and_mode_0600(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            settings_dir = Path(directory)
            store = settings.StateStore(settings_dir)
            state = {
                "schemaVersion": settings.STATE_SCHEMA_VERSION,
                "runnerShortcutId": "4294967295",
            }

            with patch(
                "py_modules.stream_gfn_backend.settings.os.replace",
                wraps=os.replace,
            ) as replace:
                store.save(state)

            source, destination = replace.call_args.args
            self.assertEqual(Path(source).parent, settings_dir.resolve())
            self.assertEqual(Path(destination), store.path)
            self.assertEqual(store.load().state, state)
            self.assertEqual(store.load().diagnostic, "loaded")
            self.assertEqual(store.path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(
                set(json.loads(store.path.read_text(encoding="utf-8"))),
                {"schemaVersion", "runnerShortcutId"},
            )

    def test_failed_replace_preserves_prior_state_and_cleans_temp_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            settings_dir = Path(directory)
            store = settings.StateStore(settings_dir)
            original = {
                "schemaVersion": settings.STATE_SCHEMA_VERSION,
                "runnerShortcutId": "7",
            }
            store.save(original)

            with patch(
                "py_modules.stream_gfn_backend.settings.os.replace",
                side_effect=OSError("replace failed"),
            ):
                with self.assertRaisesRegex(OSError, "replace failed"):
                    store.save(
                        {
                            "schemaVersion": settings.STATE_SCHEMA_VERSION,
                            "runnerShortcutId": "8",
                        }
                    )

            self.assertEqual(store.load().state, original)
            self.assertEqual(
                [path.name for path in settings_dir.iterdir()],
                [settings.STATE_FILE_NAME],
            )

    def test_malformed_json_and_unknown_schema_are_safe_distinct_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = settings.StateStore(Path(directory))
            store.path.write_text("{broken", encoding="utf-8")

            malformed = store.load()
            store.path.write_text(
                json.dumps({"schemaVersion": 999, "runnerShortcutId": "4"}),
                encoding="utf-8",
            )
            unknown_schema = store.load()

        self.assertEqual(malformed.state, settings.default_state())
        self.assertEqual(malformed.diagnostic, "malformed_json")
        self.assertEqual(unknown_schema.state, settings.default_state())
        self.assertEqual(unknown_schema.diagnostic, "invalid_state")

    def test_clear_persists_only_the_default_state(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = settings.StateStore(Path(directory))
            store.save(
                {
                    "schemaVersion": settings.STATE_SCHEMA_VERSION,
                    "runnerShortcutId": "42",
                }
            )

            cleared = store.clear()

            self.assertEqual(cleared, settings.default_state())
            self.assertEqual(store.load().state, settings.default_state())

    def test_settings_directory_must_be_absolute(self) -> None:
        with self.assertRaisesRegex(ValueError, "absolute"):
            settings.StateStore(Path("relative/settings"))


if __name__ == "__main__":
    unittest.main()
