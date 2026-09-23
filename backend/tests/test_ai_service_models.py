import os
import unittest
from unittest.mock import patch

from app import config
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

    def test_env_configures_selectable_text_models(self) -> None:
        previous = {
            "GEMINI_TEXT_MODELS": os.environ.get("GEMINI_TEXT_MODELS"),
            "GEMINI_TEXT_MODEL": os.environ.get("GEMINI_TEXT_MODEL"),
        }
        try:
            os.environ["GEMINI_TEXT_MODELS"] = "gemini-3.5-flash,gemini-3.1-flash-lite"
            os.environ["GEMINI_TEXT_MODEL"] = ""
            config_module = __import__("importlib").reload(config)
            self.assertEqual(config_module.GEMINI_TEXT_MODELS, ("gemini-3.5-flash", "gemini-3.1-flash-lite"))
            self.assertEqual(config_module.GEMINI_TEXT_MODEL, "gemini-3.5-flash")
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
            __import__("importlib").reload(config)

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
