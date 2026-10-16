# AACM 連携ヘルスチェック実装ガイド (AACM Health Check Guide)

このドキュメントは、管理棟アプリ **AACM (Arai App Control Manager)** に新規アプリや既存アプリを登録・監視させる際、
**「ヘルス異常」「タイムアウト（2.0秒）」を起こさず安定稼働させるためのヘルスチェック実装仕様・落とし穴と対策・テンプレートコード** をまとめたものです。

---

## 1. AACM のヘルスチェック監視仕様

AACM のバックエンド（`app/infrastructure/health_checker.py`）は以下のルールでアプリを監視します。

| 項目 | 仕様 | 注意点 |
| :--- | :--- | :--- |
| **タイムアウト** | **2.0 秒** (`timeout=2.0`) | **2秒以内にレスポンス完了が必須**。DB接続の遅延等で2秒を超えると「タイムアウト」判定。 |
| **監視間隔** | フロントエンド表示時は **5 秒ごと**、バックグラウンド時は定周期（通常1分ごと） | 毎秒のような高頻度接続にも耐える軽量さが必須。 |
| **リダイレクト** | `follow_redirects=False` | **リダイレクト（301/302）は不可**。末尾スラッシュの有無などでリダイレクトされると fail 判定。 |
| **判定条件** | HTTP ステータス `200` かつ JSON の `"status": "ok"` | 200 以外、または status が "ok" 以外はすべて異常扱い。 |
| **期待する JSON** | `{"status": "ok", "version": "1.0", "access_total": <int>}` | `version` と `access_total` は AACM の画面・グラフ表示に自動反映される。 |

### 期待されるレスポンス例 (HTTP 200)
```json
{
  "status": "ok",
  "version": "1.0",
  "access_total": 1284,
  "database": "ok"
}
```

---

## 2. Windows 環境で発生する重要トラップと対策

### ① Windows の `localhost` による IPv6 (`::1`) 2秒遅延問題【最重要】
- **原因**:
  - Windows では `localhost` の名前解決で IPv6（`::1`）が優先されます。
  - Webサーバー（Waitress や Uvicorn 等）を IPv4（`127.0.0.1`）のみで起動していると、AACM が `http://localhost:.../health` にアクセスした際に **IPv6 への TCP SYN がタイムアウト（約2秒）するまで待たされてから IPv4 にフォールバック** します。
  - このため、アプリ側の処理がどれだけ速くても接続だけで約 2 秒消費し、AACM の 2.0 秒タイムアウトに抵触して「ヘルス異常（タイムアウト）」になります。
- **対策**:
  1. **アプリ側**: Waitress 待受を IPv4 と IPv6 の **デュアルスタック** でリッスンする。
     ```python
     # Waitress の場合: listen 引数で 127.0.0.1 と [::1] の両方を指定
     serve(app, listen=f"127.0.0.1:{port} [::1]:{port}", threads=8)
     ```
  2. **AACM 設定側**: `apps.yaml` の `health_url` には `localhost` ではなく **`http://127.0.0.1:ポート/...`** を指定する。

---

### ② リモート DB 疎通チェックの遅延・タイムアウト
- **原因**:
  - `/health` の中で毎回 MySQL や PostgreSQL 等の DB 接続を行うと、リモート接続のハンドシェイクに 1.0〜1.3 秒かかります。
  - 5 秒間隔でポーリングされた場合、DB 接続が枯渇したり、ネットワークのわずかなジッターで 2.0 秒を超過します。
  - `connect_timeout` を未指定だと、万一 DB が停止・再起動した際にソケットが 10〜60 秒ハングし、アプリ全体が停止します。
- **対策**:
  1. DB 接続には必ず **`connect_timeout=1.0, read_timeout=1.0`** を設定する。
  2. ヘルスチェックの DB 疎通結果は **短時間（10〜15 秒）メモリキャッシュ** する。
     - キャッシュヒット時は **1ms 以内** に即答し、DB への接続頻度を 1/2〜1/3 に低減。

---

### ③ `/health` アクセスによるカウンター水増し・ログ肥大化
- **原因**:
  - AACM が 5 秒ごとにポーリングするため、通常のページアクセスと同様にカウントすると 1 時間で 720 回、1 日で 17,000 回以上 `access_total` が増えてしまい、実際のユーザー利用数が把握できなくなります。
  - また、ログファイル（`app.log`）が `/health 200` のログだけで溢れます。
- **対策**:
  - `before_request`（カウント処理）および `after_request`（アクセスログ出力）で `/health` を除外する。

### ④ キャッシュ再検証（304）で画面アクセスが増えない問題
- **集計の定義**: `access_total` はサーバーが受けた画面表示・再読み込みの累計。HTML画面のGETでHTTP 200または304になった場合に加算する。API、POST、監視、静的ファイル、エラー応答は加算しない。AACMは `/health` の値を読み取って表示し、監視自体は加算しない。
- **原因**: 304応答ではContent-Typeが省略される場合がある。`status_code == 200` や `Content-Type: text/html` だけを条件にすると、キャッシュ再検証による再読み込みが集計から漏れる。
- **対策**: 200ではHTMLのContent-Type、304では配信処理が設定した「実際の配信対象がHTML」という印を使って判定する。URLの拡張子が無いことや、ブラウザのAcceptヘッダーだけでは判定しない。JavaScriptなどの304を混ぜないためである。
- **集計の限界**: サーバーへリクエストが届かないブラウザ・Service Worker・プロキシのキャッシュ表示、オフライン表示、SPA内の画面切り替え、別の開発サーバーの画面表示はこの方式では加算できない。304を数える修正だけで、稼働環境の増加停止原因が確定するわけではない。
- **永続化**: 以下のファイル方式は単一プロセス運用を前提とする。複数ワーカー・複数インスタンスで運用する場合は、共有DBなどで累計を一元管理する。

---

## 3. 実装テンプレート (Flask + Waitress)

Python (Flask + Waitress) で新規アプリを作成する際、そのままコピー＆ペーストして使える実装テンプレートです。

```python
import datetime
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import sys
import threading
import time

from flask import Flask, jsonify, request, g
import pymysql
from waitress import serve

app = Flask(__name__)

# この例はルート直下に置く想定。src/配下へ組み込む場合は実際のルートに変更する。
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
_file_handler = RotatingFileHandler(
    os.path.join(PROJECT_ROOT, "app.log"),
    maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8",
)
_file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(_file_handler)
logger = logging.getLogger(__name__)

# ==============================================================================
# 1. 累計アクセス数（access_total）の永続化管理
# ==============================================================================
ACCESS_COUNTER_FILE = os.path.join(os.path.dirname(__file__), "access_counter.json")
_access_total = 0
_counter_lock = threading.Lock()


def _load_access_total():
    global _access_total
    if os.path.exists(ACCESS_COUNTER_FILE):
        try:
            with open(ACCESS_COUNTER_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                _access_total = int(data.get("access_total", 0))
        except Exception as e:
            logger.warning(f"access_counter.json 読込失敗: {e}")


def increment_access_total():
    global _access_total
    with _counter_lock:
        _access_total += 1
        total = _access_total
        try:
            tmp = ACCESS_COUNTER_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump({"access_total": total}, f)
            os.replace(tmp, ACCESS_COUNTER_FILE)
        except OSError as e:
            logger.warning("access_counter 保存失敗: %s", type(e).__name__)
        return total


def get_access_total():
    with _counter_lock:
        return _access_total


_load_access_total()


# ==============================================================================
# 2. 監視アクセス・静的ファイルの除外フィルター
# ==============================================================================
def is_monitoring_or_static(path: str) -> bool:
    """ヘルスチェックや静的アセットなど、集計・ログから除外するパスを判定"""
    if path.startswith(("/static/", "/assets/", "/_app/")) or path in (
        "/favicon.ico", "/robots.txt", "/sw.js", "/manifest.webmanifest",
    ):
        return True
    clean = path.rstrip("/")
    if clean.endswith("/health"):
        return True
    return False


@app.after_request
def log_request_result(response):
    if not is_monitoring_or_static(request.path):
        is_page_view = (
            request.method == "GET"
            and not (request.path == "/api" or request.path.startswith("/api/"))
            and (
                (response.status_code == 200 and response.mimetype == "text/html")
                or (response.status_code == 304 and getattr(g, "is_frontend_html", False))
            )
        )
        if is_page_view:
            increment_access_total()
        remote = request.headers.get("X-Forwarded-For", request.remote_addr or "-")
        logger.info(f'{remote} "{request.method} {request.path}" {response.status_code}')
    return response


# ==============================================================================
# 3. キャッシュ付き DB 疎通チェック & ヘルスエンドポイント
# ==============================================================================
_last_db_check_time = 0.0
_last_db_status = "ok"
_db_check_lock = threading.Lock()


def check_db_health(cache_ttl_seconds: float = 10.0) -> str:
    """DB疎通チェック（AACM等の高頻度チェックで遅延・枯渇が出ないよう短時間キャッシュ）"""
    global _last_db_check_time, _last_db_status
    now = time.time()
    if now - _last_db_check_time < cache_ttl_seconds:
        return _last_db_status

    with _db_check_lock:
        now = time.time()
        if now - _last_db_check_time < cache_ttl_seconds:
            return _last_db_status
        try:
            # 必ず connect_timeout / read_timeout を設定してハングを防止
            conn = pymysql.connect(
                host=os.environ.get("DB_HOST", "192.168.1.111"),
                port=int(os.environ.get("DB_PORT", "3306")),
                user=os.environ.get("DB_USER", "user"),
                password=os.environ.get("DB_PASS", "password"),
                db=os.environ.get("DB_NAME", "my_db"),
                connect_timeout=1.0,
                read_timeout=1.0,
            )
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
            cur.close()
            conn.close()
            _last_db_status = "ok"
        except Exception as e:
            _last_db_status = f"ng: {e}"
            logger.warning(f"ヘルスチェックDB疎通エラー: {e}")
        _last_db_check_time = time.time()
        return _last_db_status


# strict_slashes=False により /health と /health/ の両方にリダイレクトなしで 200 応答
@app.route("/health", methods=["GET"], strict_slashes=False)
def health():
    db_status = check_db_health()
    is_healthy = (db_status == "ok")
    return (
        jsonify({
            "status": "ok" if is_healthy else "error",
            "version": "1.0",
            "access_total": get_access_total(),
            "database": db_status,
        }),
        200 if is_healthy else 503
    )


# ==============================================================================
# 4. サーバー起動（IPv4 / IPv6 デュアルスタック対応）
# ==============================================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8001"))
    host_env = os.environ.get("HOST", "127.0.0.1")

    # Windows で localhost 宛ての IPv6 (::1) がタイムアウトするのを防ぐためデュアルスタック待受
    if host_env in ("127.0.0.1", "localhost"):
        listen_arg = f"127.0.0.1:{port} [::1]:{port}"
    elif host_env == "0.0.0.0":
        listen_arg = f"*:{port}"
    else:
        listen_arg = f"{host_env}:{port}"

    logger.info(f"Waitress 起動待受: {listen_arg}")
    serve(app, listen=listen_arg, threads=8)
```

**Flaskへの組み込み**: HTML配信ルートで、`send_file` / `send_from_directory` / `render_template` の応答を返す前に `g.is_frontend_html = True` を設定する。汎用ファイル配信ルートでは、解決済みの配信対象ファイルがHTMLの場合だけ設定する。これによりContent-Typeのない304も集計できる。APIプレフィックスはアプリの実際のルート構成に合わせる。

---

## 4. 実装テンプレート (FastAPI + Uvicorn)

FastAPI で新規アプリを作成する場合の、コピー＆ペースト可能なテンプレートです。
Flask 版と同じ要件（DB 疎通キャッシュ・累計アクセス数の永続化・`/health` の集計/ログ除外・`app.log` 出力）を満たします。

```python
import json
import logging
import os
import threading
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

import psycopg2  # MySQL の場合は pymysql（connect_timeout / read_timeout を指定）
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

APP_VERSION = "1.0"
PROJECT_ROOT = Path(__file__).resolve().parent  # この例はルート直下を想定。src/配下では実際のルートに変更。
LOG_PATH = PROJECT_ROOT / "app.log"  # プロジェクトルート直下
ACCESS_COUNTER_FILE = PROJECT_ROOT / "access_counter.json"
HEALTH_PATH = "/health"
DB_CACHE_TTL_SECONDS = 10.0
STATIC_PREFIXES = ("/static/", "/assets/", "/_app/")
EXCLUDED_PATHS = ("/favicon.ico", "/robots.txt", "/sw.js", "/manifest.webmanifest")

# ==============================================================================
# 1. ログ（コンソール + ルート直下 app.log）
# ==============================================================================
LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
_file_handler = RotatingFileHandler(
    LOG_PATH, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
)
_file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(_file_handler)
logger = logging.getLogger(__name__)

app = FastAPI()

# ==============================================================================
# 2. 累計アクセス数（access_total）の永続化
# ==============================================================================
_counter_lock = threading.Lock()


def _load_access_total() -> int:
    try:
        return int(json.loads(ACCESS_COUNTER_FILE.read_text("utf-8")).get("access_total", 0))
    except (OSError, ValueError, AttributeError):
        return 0


_access_total = _load_access_total()


def increment_access_total() -> None:
    global _access_total
    with _counter_lock:
        _access_total += 1
        try:
            tmp = ACCESS_COUNTER_FILE.with_suffix(".json.tmp")
            tmp.write_text(json.dumps({"access_total": _access_total}), encoding="utf-8")
            tmp.replace(ACCESS_COUNTER_FILE)
        except OSError as e:
            logger.warning("access_counter 保存失敗: %s", e)


# ==============================================================================
# 3. 監視・静的ファイルの除外 / アクセスログ / 画面表示のみ集計
# ==============================================================================
def is_monitoring_or_static(path: str) -> bool:
    if path.startswith(STATIC_PREFIXES) or path in EXCLUDED_PATHS:
        return True
    return path.rstrip("/").endswith(HEALTH_PATH)


@app.middleware("http")
async def record_access(request: Request, call_next):
    if is_monitoring_or_static(request.url.path):
        return await call_next(request)

    response = await call_next(request)
    # 304はContent-Typeが無い場合があるため、配信処理が設定した印で判定する。
    is_page_view = (
        request.method == "GET"
        and not (request.url.path == "/api" or request.url.path.startswith("/api/"))
        and (
            (
                response.status_code == 200
                and response.headers.get("content-type", "").startswith("text/html")
            )
            or (
                response.status_code == 304
                and getattr(request.state, "is_frontend_html", False)
            )
        )
    )
    if is_page_view:
        await run_in_threadpool(increment_access_total)
    remote = request.headers.get("X-Forwarded-For", request.client.host if request.client else "-")
    logger.info('%s "%s %s" %s', remote, request.method, request.url.path, response.status_code)
    return response


# ==============================================================================
# 4. キャッシュ付き DB 疎通チェック & ヘルスエンドポイント
# ==============================================================================
_db_lock = threading.Lock()
_db_checked_at: float | None = None
_db_status = "ok"


def check_db_health() -> str:
    """connect_timeout=1秒で打ち切り、結果を 10 秒キャッシュ（AACM の高頻度ポーリング対策）"""
    global _db_checked_at, _db_status

    def fresh() -> bool:
        return _db_checked_at is not None and time.monotonic() - _db_checked_at < DB_CACHE_TTL_SECONDS

    if fresh():
        return _db_status
    with _db_lock:
        if fresh():
            return _db_status
        try:
            conn = psycopg2.connect(
                os.environ["DATABASE_URL"],
                connect_timeout=1,
                options="-c statement_timeout=1000",
            )
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
            finally:
                conn.close()
            _db_status = "ok"
        except Exception as e:
            _db_status = f"ng: {type(e).__name__}"
            logger.warning("ヘルスチェックDB疎通エラー: %s", e)
        _db_checked_at = time.monotonic()
        return _db_status


# 末尾スラッシュ有無のどちらでもリダイレクトなし(200)で応答させる
@app.get(HEALTH_PATH)
@app.get(HEALTH_PATH + "/", include_in_schema=False)
def health() -> JSONResponse:
    db_status = check_db_health()
    ok = db_status == "ok"
    return JSONResponse(
        {
            "status": "ok" if ok else "error",
            "version": APP_VERSION,
            "access_total": _access_total,
            "database": db_status,
        },
        status_code=200 if ok else 503,
    )
```

**FastAPIへの組み込み**: HTML配信ルートに `request: Request` を受け取り、応答を返す前に `request.state.is_frontend_html = True` を設定する。SPAのフォールバックでindex.htmlを返す場合も設定する。汎用ファイル配信ルートでは、解決済みの配信対象ファイルがHTMLの場合だけ設定する。印が未設定の304は集計できないため、ミドルウェアだけをコピーして完了としない。APIプレフィックスは実際のルート構成に合わせる。

### 起動時の注意（Uvicorn）
- `uvicorn.run(..., host="127.0.0.1")` は IPv4 のみ待ち受けます。**Uvicorn は単一 host しか指定できず、Waitress のようなデュアルスタックにはできません**。そのため AACM の `health_url` には必ず `http://127.0.0.1:ポート/...` を指定してください（`localhost` は不可）。
- Uvicorn 標準のアクセスログは `/health` を含めて出力するため、アプリ側で記録する場合は `access_log=False` を指定して二重出力・ログ肥大化を防ぎます。
- `.gitignore` に `*.log`、`*.log.*`、`access_counter.json`、`access_counter.json.tmp` を追加してください。

---

## 5. AACM 側（`apps.yaml`）の設定推奨ルール

AACM 管理棟アプリの `apps.yaml` にアプリを追加する際は、以下の設定を推奨します。

```yaml
apps:
  - id: machine_check
    name: 機械点検管理システム
    # 【推奨】localhost ではなく 127.0.0.1 を指定するとホスト名解決遅延がゼロになる
    health_url: http://127.0.0.1:8001/machine_check_app/health
    url: http://127.0.0.1:8001/machine_check_app/
    start_cmd: "powershell -ExecutionPolicy Bypass -File start.ps1"
    stop_cmd: "powershell -ExecutionPolicy Bypass -File stop.ps1"
    category: manufacturing
    tags: [flask, python, mysql]

```

### チェックリスト
- [ ] `health_url` は **`http://127.0.0.1:ポート/...`** で登録されているか？
- [ ] `/health` はリダイレクトなし（HTTP 200）で返るか？（末尾スラッシュの有無で 308/301 になっていないか）
- [ ] レスポンス JSON に `"status": "ok"`、`"version": "..."`、`"access_total": <数値>` が含まれているか？
- [ ] `access_total` が API 呼び出しやヘルスチェックで水増しされていないか？（画面表示のみ集計する想定）
- [ ] HTML画面のGETは200でも304でも1回につき1増えるか？Content-Typeのない304でも増えるか？
- [ ] HTML配信処理に `g.is_frontend_html` / `request.state.is_frontend_html` を設定したか？静的ファイルの304・エラー応答・POSTは増えないか？
- [ ] 再起動後も累計が保持されるか？保存失敗の警告が `app.log` に出ていないか？
- [ ] `app.log` に `/health` のログが出ていないか？
- [ ] DB 疎通チェックに 1.0 秒以内のタイムアウトとキャッシュが設定されているか？
- [ ] サーバー（Waitress 等）が IPv4/IPv6 デュアルスタック、または 127.0.0.1 で確実に稼働しているか？
- [ ] （Docker）コンテナ内アプリは `0.0.0.0` で待ち受け、`health_url` の宛先は AACM の動作場所から届くか？（§6 ①②）
- [ ] （Docker）`access_counter.json` はボリュームに保存され、コンテナ再作成後も累計が残るか？（§6 ③）
- [ ] （AACM を Docker 化する場合）`AACM_ACCESS_FILE` / `AACM_APPS_FILE` をボリューム・マウントに置いたか？（§6 ④）

---

## 6. Docker で起動するアプリ・AACM の場合

`/health` の仕様（200 + `"status": "ok"` + `access_total`）は Docker 起動でも同じです。変わるのは **AACM から見た宛先** と **カウンターの保存先** です。

### ① `health_url` の宛先（`localhost` / `127.0.0.1` の意味が変わる）

| AACM の動作場所 | 監視対象アプリ | `health_url` の書き方 |
| :--- | :--- | :--- |
| ホスト（Windows 等） | Docker コンテナ（ポート公開あり） | `http://127.0.0.1:公開ポート/health`（`-p 8001:8001` の左側のポート） |
| Docker コンテナ | ホスト上のアプリ | `http://host.docker.internal:ポート/health`（Linux は `extra_hosts: ["host.docker.internal:host-gateway"]` が必要） |
| Docker コンテナ（同一 compose / 同一ネットワーク） | 別コンテナ | `http://サービス名:コンテナ内ポート/health`（例: `http://myapp:8001/health`） |
| Docker コンテナ | 別 compose のコンテナ | 共有ネットワークに参加させ、サービス名またはコンテナ名で指定。または公開ポート経由で `host.docker.internal` |

- **AACM がコンテナ内にある場合、`127.0.0.1` / `localhost` は AACM 自身を指す**ため、対象アプリには届きません。§5 の「`127.0.0.1` を指定」はホスト直起動の AACM を前提にしたルールです。
- ホスト側から見ると、公開ポートの変更（`-p` の左側）を `health_url` に反映し忘れると fail になります。

### ② アプリ側の待受アドレス（コンテナ内）

- コンテナ内では **`0.0.0.0` で待ち受ける**必要があります。`127.0.0.1` のままだと、ポートを公開しても外から繋がりません。
  - Waitress: 本ガイドのテンプレートは環境変数 `HOST=0.0.0.0` で `*:ポート` 待受になります。
  - Uvicorn: `uvicorn.run(..., host="0.0.0.0")` または `--host 0.0.0.0`。
- §2 ① の Windows IPv6 遅延は、AACM が **Windows ホスト上で動き `localhost` 宛てに接続する場合** の問題です。`127.0.0.1` 指定、またはコンテナ名・サービス名指定ならこの遅延は出ません。

### ③ `access_total` を再作成で消さない（永続化）

テンプレートの `access_counter.json` はアプリ直下に書かれるため、**コンテナを作り直す（`docker compose up --force-recreate` / `down` → `up` / イメージ更新）と消えて 0 に戻ります**。
- 0 に戻ると AACM は「アプリ再起動によるリセット」とみなし、その回の差分は数えません（水増し・マイナスにはなりませんが、再作成直前までの未取得分は失われます）。
- 累計そのものを保持したい場合は、カウンターの保存先を **ボリュームにマウントしたディレクトリ** に変えます。

```python
# ACCESS_COUNTER_FILE の保存先を環境変数で切り替える（未指定ならアプリ直下）
DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
ACCESS_COUNTER_FILE = os.path.join(DATA_DIR, "access_counter.json")
```

```yaml
# docker-compose.yml（アプリ側）
services:
  myapp:
    environment:
      HOST: 0.0.0.0
      DATA_DIR: /data
    ports:
      - "8001:8001"
    volumes:
      - myapp_data:/data   # access_counter.json をここに保存
volumes:
  myapp_data:
```

- ボリューム配下は書き込み可能な権限にする（非 root 実行のイメージでは所有者に注意）。書き込めないと保存失敗の警告のみが出て、累計は再起動で消えます。
- `app.log` も同様にコンテナ内で消えます。残したい場合は `DATA_DIR` 配下へ出すか、標準出力へのログ（`docker logs`）で運用します。

### ④ AACM 自身を Docker で動かす場合

アクセス履歴（時間帯別集計）は AACM 側のファイルに保存されます。保存先は環境変数で変更できます。

| 環境変数 | 既定値 | 用途 |
| :--- | :--- | :--- |
| `AACM_ACCESS_FILE` | `backend/data/access.json` | アクセス履歴。**ボリュームに置かないと再作成で履歴が消える** |
| `AACM_APPS_FILE` | `backend/config/apps.yaml` | 監視対象の定義。ホストからマウントして編集できるようにする |

- `start_cmd` / `stop_cmd`（`powershell ...` 等）は **コンテナ内で実行される**ため、ホストのアプリは操作できません。起動・停止まで AACM から行いたい場合は、ホスト直起動にするか、Docker 操作に対応した方式（docker ソケットのマウント等。強い権限が必要なため利用範囲を限定する）を検討してください。
- 現在このリポジトリには AACM 用の Dockerfile / compose は含まれていません。

### ⑤ 複数コンテナ（レプリカ）構成

`access_total` はプロセスごとのファイル値のため、同一アプリを複数コンテナで動かすと、`/health` がどのコンテナに当たるかで値が前後し、AACM の差分計算（減少をリセットと判定）が崩れます。
- レプリカ構成にする場合は、累計を **共有 DB / Redis など1か所** で加算・参照する（§2 ④ の「永続化」も参照）。
- 単一コンテナで運用する場合は、この問題は起きません。

---

## 7. アクセス数が増えない場合の確認手順
1. 修正版が監視対象のサーバーへ反映され、バックエンドが再起動済みか確認する。
2. `/health` の `access_total` を控え、同じサーバーから配信されるアプリ画面を再読み込みして、再度 `/health` を読む。監視URLだけを再読み込みしても増えない。
3. 増えない場合はブラウザのネットワーク表示と `app.log` でHTMLリクエストの到達・応答コードを確認する。200ならHTMLのContent-Type、304なら配信対象の印を確認する。サーバーへ届いていなければキャッシュや別の配信元を確認する。
4. アプリ側JSONでは増えているのにAACM表示で増えない場合は、AACMの監視先URL・表示更新を確認する。複数プロセスの場合は累計が分散していないかも確認する。
