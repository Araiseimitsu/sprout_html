from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import ALLOWED_ROOT
from app.services.file_service import _resolve_edit_path, list_entries, to_display_path


class FileServicePathTests(unittest.TestCase):
    def test_absolute_paths_outside_default_root_are_allowed(self) -> None:
        outside_root = Path("C:/Windows/sprout-outside-root.html")

        self.assertEqual(_resolve_edit_path(str(outside_root)), outside_root.resolve())

    def test_relative_paths_still_start_from_default_root(self) -> None:
        self.assertEqual(_resolve_edit_path("sample.html"), (ALLOWED_ROOT / "sample.html").resolve())

    def test_windows_host_path_maps_to_container_path(self) -> None:
        with patch("app.services.file_service.SPROUT_HOST_ROOT", "C:\\sites"), patch(
            "app.services.file_service.SPROUT_CONTAINER_ROOT",
            Path("/workspace/html"),
        ):
            self.assertEqual(
                _resolve_edit_path("C:\\sites\\page.html"),
                Path("/workspace/html/page.html").resolve(),
            )

    def test_container_path_maps_to_windows_display_path(self) -> None:
        container_root = Path("C:/workspace/html").resolve()
        with patch("app.services.file_service.SPROUT_HOST_ROOT", "C:\\sites"), patch(
            "app.services.file_service.SPROUT_CONTAINER_ROOT",
            container_root,
        ):
            self.assertEqual(to_display_path(container_root / "page.html"), "C:\\sites\\page.html")

    def test_local_display_path_preserves_visible_path(self) -> None:
        with patch("app.services.file_service.SPROUT_HOST_ROOT", ""), patch(
            "app.services.file_service.SPROUT_CONTAINER_ROOT",
            None,
        ):
            self.assertEqual(to_display_path(Path("C:/Users/seizo/My Documents")), "C:\\Users\\seizo\\My Documents")

    def test_list_entries_returns_windows_parent_from_container_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            container_root = Path(tmp).resolve()
            child_dir = container_root / "pages"
            child_dir.mkdir()
            with patch("app.services.file_service.SPROUT_HOST_ROOT", "C:\\sites"), patch(
                "app.services.file_service.SPROUT_CONTAINER_ROOT",
                container_root,
            ), patch("app.services.file_service.ALLOWED_ROOT", container_root):
                current, parent, _ = list_entries(str(child_dir))

        self.assertEqual(current, "C:\\sites\\pages")
        self.assertEqual(parent, "C:\\sites")


if __name__ == "__main__":
    unittest.main()
