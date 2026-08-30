import json
import tempfile
import unittest
from pathlib import Path

from backend import identity


class BuildIdentityTest(unittest.TestCase):
    def test_missing_development_metadata_returns_unvalidated_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = identity.load_build_identity(Path(directory))

        self.assertEqual(
            result,
            {
                "schemaVersion": 1,
                "source": "development",
                "metadataValidated": False,
                "tag": None,
                "commit": None,
            },
        )

    def test_valid_packaged_metadata_returns_validated_read_only_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            plugin_root = Path(directory)
            build_info = plugin_root / identity.BUILD_INFO_FILE_NAME
            build_info.write_text(
                json.dumps(
                    {
                        "schemaVersion": identity.BUILD_IDENTITY_SCHEMA_VERSION,
                        "tag": "v0.1.0-alpha.1",
                        "commit": "a" * 40,
                    }
                ),
                encoding="utf-8",
            )
            build_info.chmod(0o400)
            before = (build_info.stat().st_mode, build_info.stat().st_mtime_ns)

            result = identity.load_build_identity(plugin_root)

            self.assertEqual(
                result,
                {
                    "schemaVersion": 1,
                    "source": "packaged",
                    "metadataValidated": True,
                    "tag": "v0.1.0-alpha.1",
                    "commit": "a" * 40,
                },
            )
            self.assertEqual(
                (build_info.stat().st_mode, build_info.stat().st_mtime_ns), before
            )
            self.assertEqual([path.name for path in plugin_root.iterdir()], ["build-info.json"])

    def test_malformed_packaged_metadata_is_rejected(self) -> None:
        invalid_values = (
            "{broken",
            json.dumps({"schemaVersion": 1, "tag": "v0.1.0-alpha.1"}),
            json.dumps(
                {
                    "schemaVersion": 999,
                    "tag": "v0.1.0-alpha.1",
                    "commit": "a" * 40,
                }
            ),
            json.dumps(
                {
                    "schemaVersion": 1,
                    "tag": "v0.1.0-alpha.1",
                    "commit": "not-a-full-git-commit",
                }
            ),
            json.dumps(
                {
                    "schemaVersion": 1,
                    "tag": "v0.1.0-alpha.1",
                    "commit": "a" * 40,
                    "route": "must-not-be-packaged",
                }
            ),
        )

        for invalid_value in invalid_values:
            with self.subTest(invalid_value=invalid_value):
                with tempfile.TemporaryDirectory() as directory:
                    build_info = Path(directory) / identity.BUILD_INFO_FILE_NAME
                    build_info.write_text(invalid_value, encoding="utf-8")

                    with self.assertRaises(identity.BuildIdentityError):
                        identity.load_build_identity(Path(directory))


if __name__ == "__main__":
    unittest.main()
