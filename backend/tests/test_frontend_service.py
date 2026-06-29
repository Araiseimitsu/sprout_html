from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from app.services.frontend_service import FrontendBuildError, FrontendPathError, resolve_frontend_file


class FrontendServiceTests(unittest.TestCase):
    def test_root_resolves_to_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp).resolve()
            index = dist / "index.html"
            index.write_text("<html></html>", encoding="utf-8")

            with patch("app.services.frontend_service.FRONTEND_DIST_DIR", dist):
                self.assertEqual(resolve_frontend_file(""), index)

    def test_existing_asset_resolves_inside_dist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp).resolve()
            (dist / "index.html").write_text("<html></html>", encoding="utf-8")
            asset = dist / "app-assets" / "main.js"
            asset.parent.mkdir()
            asset.write_text("console.log('ok')", encoding="utf-8")

            with patch("app.services.frontend_service.FRONTEND_DIST_DIR", dist):
                self.assertEqual(resolve_frontend_file("app-assets/main.js"), asset)

    def test_page_route_falls_back_to_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp).resolve()
            index = dist / "index.html"
            index.write_text("<html></html>", encoding="utf-8")

            with patch("app.services.frontend_service.FRONTEND_DIST_DIR", dist):
                self.assertEqual(resolve_frontend_file("workspace/editor"), index)

    def test_missing_build_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with patch("app.services.frontend_service.FRONTEND_DIST_DIR", Path(tmp).resolve()):
                with self.assertRaises(FrontendBuildError):
                    resolve_frontend_file("")

    def test_missing_asset_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp).resolve()
            (dist / "index.html").write_text("<html></html>", encoding="utf-8")

            with patch("app.services.frontend_service.FRONTEND_DIST_DIR", dist):
                with self.assertRaises(FrontendPathError):
                    resolve_frontend_file("app-assets/missing.js")


if __name__ == "__main__":
    unittest.main()
