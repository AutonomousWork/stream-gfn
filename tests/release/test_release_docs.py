import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
TAG = "v0.1.0-alpha.1"
ASSET_URL = (
    "https://github.com/AutonomousWork/stream-gfn/releases/download/"
    f"{TAG}/stream-gfn-{TAG}.zip"
)


class ReleaseDocsTest(unittest.TestCase):
    def test_readme_documents_primary_and_fallback_install_paths(self) -> None:
        readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")

        self.assertIn("Decky Settings", readme)
        self.assertIn("Install Plugin from URL", readme)
        self.assertIn(ASSET_URL, readme)
        self.assertIn("~/homebrew/plugins/stream-gfn", readme)
        self.assertIn("Source code", readme)

    def test_release_notes_open_with_unvalidated_warning(self) -> None:
        notes = (REPO_ROOT / f"docs/releases/{TAG}.md").read_text(encoding="utf-8")

        self.assertTrue(notes.startswith("# UNVALIDATED DEVICE BUILD"))
        self.assertIn("stable", notes.lower())
        self.assertIn("docs/device-proof.md", notes)

    def test_device_proof_uses_install_from_url_as_primary_path(self) -> None:
        proof = (REPO_ROOT / "docs/device-proof.md").read_text(encoding="utf-8")
        primary_section = proof.split("## 2.", maxsplit=1)[0]

        self.assertIn("Install Plugin from URL", primary_section)
        self.assertIn(ASSET_URL, primary_section)
        self.assertIn("~/homebrew/plugins/stream-gfn", primary_section)


if __name__ == "__main__":
    unittest.main()
