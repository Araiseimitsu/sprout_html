import unittest
from unittest.mock import patch

from app.services import ai_service
from app.services.ai_service import AiInvalidDesignStyle, AiInvalidModel


class AiServiceModelTests(unittest.TestCase):
    def test_status_returns_selectable_text_models(self) -> None:
        with patch.object(ai_service, "GEMINI_TEXT_MODEL", "gemini-3.1-flash-lite"):
            status = ai_service.status()

        self.assertEqual(status["text_model"], "gemini-3.1-flash-lite")
        self.assertEqual(
            status["text_models"],
            ["gemini-3.1-flash-lite", "gemini-3.5-flash"],
        )

    def test_generate_html_rejects_unknown_model_before_client_call(self) -> None:
        with self.assertRaises(AiInvalidModel):
            ai_service.generate_html("ページを作って", "unknown-model")

    def test_generate_html_rejects_unknown_design_style_before_client_call(self) -> None:
        with self.assertRaises(AiInvalidDesignStyle):
            ai_service.generate_html("ページを作って", design_style="unknown-design")

    def test_generate_html_passes_design_instruction_to_model(self) -> None:
        with patch.object(ai_service, "_generate_text", return_value="<!DOCTYPE html>") as generate_text:
            ai_service.generate_html("ページを作って", design_style="slide_deck")

        prompt = generate_text.call_args.args[0]
        self.assertIn("横送りスライド型", prompt)
        self.assertIn("前へ/次へ", prompt)
        self.assertIn("ページ送り", prompt)


if __name__ == "__main__":
    unittest.main()
