from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import ALLOWED_ROOT
from app.services.file_service import _resolve_edit_path


class FileServicePathTests(unittest.TestCase):
    def test_absolute_paths_outside_default_root_are_allowed(self) -> None:
        outside_root = Path("C:/Windows/sprout-outside-root.html")

        self.assertEqual(_resolve_edit_path(str(outside_root)), outside_root.resolve())

    def test_relative_paths_still_start_from_default_root(self) -> None:
        self.assertEqual(_resolve_edit_path("sample.html"), (ALLOWED_ROOT / "sample.html").resolve())


if __name__ == "__main__":
    unittest.main()
