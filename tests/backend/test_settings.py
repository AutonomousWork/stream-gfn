import json
import unittest

from backend import settings


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


if __name__ == "__main__":
    unittest.main()
