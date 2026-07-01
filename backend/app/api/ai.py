"""AI(Gemini)関連APIのルーティング。

サービス層(ai_service / file_service)を呼び出すだけの薄い層に保つ。
"""
from __future__ import annotations

import base64
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import ai_service, file_service
from app.services.ai_service import AiError, AiInvalidDesignStyle, AiInvalidModel, AiNotConfigured
from app.services.file_service import PathError

logger = logging.getLogger(__name__)
router = APIRouter()


class GeneratePromptRequest(BaseModel):
    """ゼロからのHTML生成リクエスト。"""

    prompt: str
    model: str | None = None
    design_style: str | None = None


class EditFullRequest(BaseModel):
    """ページ全体の編集リクエスト。"""

    instruction: str
    html: str
    model: str | None = None


class EditFragmentRequest(BaseModel):
    """選択要素(HTML断片)の編集リクエスト。"""

    instruction: str
    fragment: str
    model: str | None = None


class ImageRequest(BaseModel):
    """画像生成リクエスト。

    reference_path があればその近傍にファイル保存し相対srcを返す(ハイブリッド)。
    無ければ data URI を返す。
    """

    prompt: str
    reference_path: str | None = None


def _ensure_text(value: str, field: str) -> str:
    """必須テキストの空チェック。"""
    text = (value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail=f"{field}を入力してください")
    return text


def _handle_ai_error(exc: AiError) -> HTTPException:
    """AI例外をHTTP応答へ変換する。"""
    if isinstance(exc, (AiInvalidModel, AiInvalidDesignStyle)):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, AiNotConfigured):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=502, detail=str(exc))


@router.get("/ai/status")
def ai_status() -> dict:
    """AI機能の利用可否とモデル名を返す(フロントの出し分け用)。"""
    return ai_service.status()


@router.post("/ai/generate")
def generate(req: GeneratePromptRequest) -> dict:
    """要望からHTMLページをゼロ生成する。"""
    prompt = _ensure_text(req.prompt, "要望")
    try:
        html = ai_service.generate_html(prompt, req.model, req.design_style)
    except AiError as exc:
        raise _handle_ai_error(exc) from exc
    return {"html": html}


@router.post("/ai/edit")
def edit_full(req: EditFullRequest) -> dict:
    """ページ全体を指示に従って編集する。"""
    instruction = _ensure_text(req.instruction, "指示")
    try:
        html = ai_service.edit_full_html(instruction, req.html, req.model)
    except AiError as exc:
        raise _handle_ai_error(exc) from exc
    return {"html": html}


@router.post("/ai/edit-fragment")
def edit_fragment(req: EditFragmentRequest) -> dict:
    """選択要素を指示に従って編集する。"""
    instruction = _ensure_text(req.instruction, "指示")
    fragment = _ensure_text(req.fragment, "対象要素")
    try:
        html = ai_service.edit_fragment(instruction, fragment, req.model)
    except AiError as exc:
        raise _handle_ai_error(exc) from exc
    return {"html": html}


@router.post("/ai/image")
def image(req: ImageRequest) -> dict:
    """画像を生成する。ハイブリッド方式で保存先を出し分ける。"""
    prompt = _ensure_text(req.prompt, "画像の説明")
    try:
        data, mime = ai_service.generate_image(prompt)
    except AiError as exc:
        raise _handle_ai_error(exc) from exc

    # 編集中ファイルがあればファイル保存して相対参照、無ければ data URI。
    if req.reference_path:
        try:
            _, relative_src = file_service.save_generated_image(req.reference_path, data, mime)
        except PathError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except OSError as exc:
            logger.error("画像保存失敗: %s", exc)
            raise HTTPException(status_code=500, detail="画像の保存に失敗しました") from exc
        return {"mode": "file", "src": relative_src, "mime": mime}

    encoded = base64.b64encode(data).decode("ascii")
    return {"mode": "data", "src": f"data:{mime};base64,{encoded}", "mime": mime}
