"""AI(Gemini)連携の正本となるサービス層。

HTMLのゼロ生成・全体編集・部分編集と、画像生成()を担う。
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
    GEMINI_TEXT_MODELS,
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


class AiInvalidModel(AiError):
    """許可されていないモデルが指定された場合に送出する。"""


class AiInvalidDesignStyle(AiError):
    """許可されていないページ生成デザインが指定された場合に送出する。"""


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
    "{rules}\n\nデザイン形式:\n{design_style}\n\n要望:\n{prompt}"
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

_DEFAULT_DESIGN_STYLE = "vertical_scroll"

_DESIGN_STYLE_INSTRUCTIONS = {
    "vertical_scroll": (
        "縦スクロール型。通常のランディングページとして、hero、概要、詳細、CTAなどを"
        "上から自然に読み進められる複数セクションで構成する。"
    ),
    "slide_deck": (
        "横送りスライド型。各セクションを1画面に近いスライドとして設計し、前へ/次へ"
        "ボタンでページ送りできる構成にする。CSS scroll-snapと最小限のJavaScriptを使い、"
        "現在位置が分かるインジケーターも付ける。モバイルでもボタン操作しやすくする。"
    ),
    "story_split": (
        "ストーリー型。ビジュアル領域と本文領域を交互に配置し、導入、課題、解決、実績、"
        "次の行動が自然につながる構成にする。"
    ),
    "dashboard_grid": (
        "ダッシュボード型。カード、指標、比較表、一覧ブロックを使い、情報を素早く比較・確認"
        "できる密度の高い構成にする。"
    ),
}


def is_configured() -> bool:
    """AI機能が利用可能か(SDK導入済み かつ APIキー設定済み)を返す。"""
    return _SDK_AVAILABLE and bool(GEMINI_API_KEY)


def status() -> dict:
    """フロントの機能出し分け用に、設定状況とモデル名を返す。"""
    return {
        "configured": is_configured(),
        "sdk_available": _SDK_AVAILABLE,
        "text_model": GEMINI_TEXT_MODEL,
        "text_models": list(GEMINI_TEXT_MODELS),
        "image_model": GEMINI_IMAGE_MODEL,
    }


_client = None


def _get_client():
    """Geminiクライアントを遅延生成して使い回す。"""
    global _client
    if not _SDK_AVAILABLE:
        raise AiNotConfigured("google-genai がインストールされていません。uv sync を実行してください")
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


def _resolve_text_model(model: str | None = None) -> str:
    """指定モデルを許可リストに照合し、未指定時は既定モデルを返す。"""
    selected = (model or GEMINI_TEXT_MODEL).strip()
    if selected not in GEMINI_TEXT_MODELS:
        raise AiInvalidModel(f"使用できないAIモデルです: {selected}")
    return selected


def _resolve_design_style(design_style: str | None = None) -> str:
    """生成デザインIDを許可リストに照合し、プロンプト用の指示文を返す。"""
    selected = (design_style or _DEFAULT_DESIGN_STYLE).strip()
    if selected not in _DESIGN_STYLE_INSTRUCTIONS:
        raise AiInvalidDesignStyle(f"使用できないデザイン形式です: {selected}")
    return _DESIGN_STYLE_INSTRUCTIONS[selected]


def _generate_text(prompt: str, model: str | None = None) -> str:
    """テキストモデルを呼び出し、コードフェンス除去済みの本文を返す。"""
    client = _get_client()
    text_model = _resolve_text_model(model)
    try:
        response = client.models.generate_content(
            model=text_model,
            contents=prompt,
        )
    except Exception as exc:  # SDK内部例外を業務例外へ変換
        logger.error("Geminiテキスト生成に失敗: %s", exc)
        raise AiError(f"AI生成に失敗しました: {exc}") from exc

    text = (response.text or "").strip()
    if not text:
        raise AiError("AIから有効な応答が得られませんでした")
    return _strip_code_fence(text)


def generate_html(
    prompt: str,
    model: str | None = None,
    design_style: str | None = None,
) -> str:
    """要望からHTMLページをゼロ生成する。"""
    text_model = _resolve_text_model(model)
    design_instruction = _resolve_design_style(design_style)
    logger.info("HTMLゼロ生成: model=%s design_style=%s", text_model, design_style)
    return _generate_text(
        _GENERATE_HTML_PROMPT.format(
            rules=_HTML_RULES,
            design_style=design_instruction,
            prompt=prompt,
        ),
        text_model,
    )


def edit_full_html(instruction: str, html: str, model: str | None = None) -> str:
    """ページ全体を指示に従って編集する。"""
    text_model = _resolve_text_model(model)
    logger.info("HTML全体編集: model=%s", text_model)
    return _generate_text(
        _EDIT_FULL_PROMPT.format(rules=_HTML_RULES, instruction=instruction, html=html),
        text_model,
    )


def edit_fragment(instruction: str, fragment: str, model: str | None = None) -> str:
    """選択要素(HTML断片)を指示に従って編集する。"""
    text_model = _resolve_text_model(model)
    logger.info("HTML部分編集: model=%s", text_model)
    return _generate_text(
        _EDIT_FRAGMENT_PROMPT.format(
            rules=_FRAGMENT_RULES, instruction=instruction, fragment=fragment
        ),
        text_model,
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
