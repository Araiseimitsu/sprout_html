"""AI(Gemini)連携の正本となるサービス層。

HTMLのゼロ生成・全体編集・部分編集と、画像生成(nanobanana2)を担う。
APIキー・モデル呼び出しはこの層に集約し、API層からのみ呼び出す。
フロントエンドにはAPIキーやモデル呼び出しを一切持たせない(二重実装防止)。
"""
from __future__ import annotations

import logging
import re

from app.config import (
    GEMINI_API_KEY,
    GEMINI_IMAGE_MODEL,
    GEMINI_TEXT_MODEL,
)

logger = logging.getLogger(__name__)

# google-genai は任意依存。未インストールでもアプリ起動を妨げないよう遅延importする。
try:  # pragma: no cover - import可否は環境依存
    from google import genai
    from google.genai import types

    _SDK_AVAILABLE = True
except ImportError:  # pragma: no cover
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]
    _SDK_AVAILABLE = False


class AiError(Exception):
    """AI処理中のエラー。UI側で message を表示する。"""


class AiNotConfigured(AiError):
    """APIキー未設定やSDK未導入で利用できない場合に送出する。"""


# ---- プロンプト定義(マジック文字列の集中管理) ----

_HTML_RULES = (
    "出力は完全なHTMLドキュメント1つのみ。"
    "説明文・前置き・後書き・マークダウンのコードフェンス(```)は一切含めない。"
    "<!DOCTYPE html> から始め、必要なCSSは<style>として<head>にまとめる。"
    "日本語のページとして lang=\"ja\" を指定し、文字コードはUTF-8とする。"
)

_FRAGMENT_RULES = (
    "出力は指定要素を置き換えるHTML断片のみ。"
    "説明文・前置き・マークダウンのコードフェンス(```)は一切含めない。"
    "<html>や<body>などのドキュメント全体は出力せず、要素そのものだけを返す。"
)

_GENERATE_HTML_PROMPT = (
    "あなたは熟練のWebデザイナー兼フロントエンドエンジニアです。"
    "次の要望に沿って、見栄えの良い静的なHTMLページを作成してください。\n"
    "{rules}\n\n要望:\n{prompt}"
)

_EDIT_FULL_PROMPT = (
    "あなたは熟練のフロントエンドエンジニアです。"
    "既存のHTMLページ全体を、次の指示に従って修正してください。"
    "既存の構造・内容はできる限り保ち、指示された箇所のみを的確に変更します。\n"
    "{rules}\n\n指示:\n{instruction}\n\n--- 既存HTML ---\n{html}"
)

_EDIT_FRAGMENT_PROMPT = (
    "あなたは熟練のフロントエンドエンジニアです。"
    "次のHTML要素を、指示に従って修正してください。"
    "要素の役割は保ちつつ、指示された内容を反映します。\n"
    "{rules}\n\n指示:\n{instruction}\n\n--- 対象要素 ---\n{fragment}"
)


def is_configured() -> bool:
    """AI機能が利用可能か(SDK導入済み かつ APIキー設定済み)を返す。"""
    return _SDK_AVAILABLE and bool(GEMINI_API_KEY)


def status() -> dict:
    """フロントの機能出し分け用に、設定状況とモデル名を返す。"""
    return {
        "configured": is_configured(),
        "sdk_available": _SDK_AVAILABLE,
        "text_model": GEMINI_TEXT_MODEL,
        "image_model": GEMINI_IMAGE_MODEL,
    }


_client = None


def _get_client():
    """Geminiクライアントを遅延生成して使い回す。"""
    global _client
    if not _SDK_AVAILABLE:
        raise AiNotConfigured(
            "google-genai がインストールされていません。requirements.txt を導入してください"
        )
    if not GEMINI_API_KEY:
        raise AiNotConfigured("環境変数 GEMINI_API_KEY が設定されていません")
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _strip_code_fence(text: str) -> str:
    """モデルが付けがちなマークダウンのコードフェンスを除去する。"""
    stripped = text.strip()
    fence = re.match(r"^```[a-zA-Z]*\n(.*)\n```$", stripped, re.DOTALL)
    if fence:
        return fence.group(1).strip()
    # 前後どちらかにだけフェンスが付くケースも保険で除去。
    stripped = re.sub(r"^```[a-zA-Z]*\n?", "", stripped)
    stripped = re.sub(r"\n?```$", "", stripped)
    return stripped.strip()


def _generate_text(prompt: str) -> str:
    """テキストモデルを呼び出し、コードフェンス除去済みの本文を返す。"""
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_TEXT_MODEL,
            contents=prompt,
        )
    except Exception as exc:  # SDK内部例外を業務例外へ変換
        logger.error("Geminiテキスト生成に失敗: %s", exc)
        raise AiError(f"AI生成に失敗しました: {exc}") from exc

    text = (response.text or "").strip()
    if not text:
        raise AiError("AIから有効な応答が得られませんでした")
    return _strip_code_fence(text)


def generate_html(prompt: str) -> str:
    """要望からHTMLページをゼロ生成する。"""
    logger.info("HTMLゼロ生成: model=%s", GEMINI_TEXT_MODEL)
    return _generate_text(_GENERATE_HTML_PROMPT.format(rules=_HTML_RULES, prompt=prompt))


def edit_full_html(instruction: str, html: str) -> str:
    """ページ全体を指示に従って編集する。"""
    logger.info("HTML全体編集: model=%s", GEMINI_TEXT_MODEL)
    return _generate_text(
        _EDIT_FULL_PROMPT.format(rules=_HTML_RULES, instruction=instruction, html=html)
    )


def edit_fragment(instruction: str, fragment: str) -> str:
    """選択要素(HTML断片)を指示に従って編集する。"""
    logger.info("HTML部分編集: model=%s", GEMINI_TEXT_MODEL)
    return _generate_text(
        _EDIT_FRAGMENT_PROMPT.format(
            rules=_FRAGMENT_RULES, instruction=instruction, fragment=fragment
        )
    )


def generate_image(prompt: str) -> tuple[bytes, str]:
    """プロンプトから画像を生成し、(バイト列, MIMEタイプ) を返す。"""
    client = _get_client()
    logger.info("画像生成: model=%s", GEMINI_IMAGE_MODEL)
    try:
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
    except Exception as exc:
        logger.error("画像生成に失敗: %s", exc)
        raise AiError(f"画像生成に失敗しました: {exc}") from exc

    image = _extract_inline_image(response)
    if image is None:
        raise AiError("AIから画像データが得られませんでした")
    return image


def _extract_inline_image(response) -> tuple[bytes, str] | None:
    """レスポンスから最初の画像(inline_data)を取り出す。"""
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                mime = getattr(inline, "mime_type", None) or "image/png"
                return inline.data, mime
    return None
