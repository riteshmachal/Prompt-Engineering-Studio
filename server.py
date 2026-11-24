#!/usr/bin/env python3
"""
Prompt Engineering Studio - Local Server
========================================
A lightweight, zero-dependency HTTP server and Gemini API proxy for Prompt Engineering Studio.
Uses Python's standard library only.
"""

import http.server
import socketserver
import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional

# Configuration
DEFAULT_PORT = int(os.environ.get("PORT", 8080))
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

SUPPORTED_MODELS = [
    {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash Lite",
        "recommended": True,
        "description": "High-speed, stable multimodal generation (Recommended default)."
    },
    {
        "id": "gemini-flash-lite-latest",
        "name": "Gemini Flash-Lite Latest",
        "recommended": False,
        "description": "Official rolling alias for lowest-latency generation."
    },
    {
        "id": "gemini-3-flash-preview",
        "name": "Gemini 3 Flash Preview",
        "recommended": False,
        "description": "Next-gen balanced speed and multimodal reasoning."
    },
    {
        "id": "gemini-3.1-flash-lite",
        "name": "Gemini 3.1 Flash Lite",
        "recommended": False,
        "description": "Lightweight model for quick testing."
    },
    {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash",
        "recommended": False,
        "description": "Frontier high-intelligence model (subject to peak demand)."
    },
    {
        "id": "gemini-3.1-pro-preview",
        "name": "Gemini 3.1 Pro Preview",
        "recommended": False,
        "description": "Advanced reasoning and deep conceptual synthesis."
    }
]

DEFAULT_MODEL_ID = "gemini-3.5-flash-lite"


def fetch_live_models_from_gemini(api_key: str) -> List[Dict[str, Any]]:
    """Retrieve verified models from the official Google Gemini API using the provided API key."""
    if not api_key or not api_key.strip():
        return SUPPORTED_MODELS

    clean_key = api_key.strip()
    endpoint = "https://generativelanguage.googleapis.com/v1beta/models"
    headers = {
        "x-goog-api-key": clean_key
    }
    open_kwargs = {"timeout": 6}
    try:
        import ssl
        open_kwargs["context"] = ssl._create_unverified_context()
    except Exception:
        pass

    try:
        req = urllib.request.Request(endpoint, headers=headers, method="GET")
        with urllib.request.urlopen(req, **open_kwargs) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_models = data.get("models", [])
            valid_models = []

            for m in raw_models:
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" not in methods:
                    continue
                m_name = m.get("name", "")
                m_id = m_name[7:] if m_name.startswith("models/") else m_name

                # Filter out niche media/internal models that don't take standard text prompts
                if any(x in m_id for x in ["-image", "-tts", "robotics", "computer-use", "clip", "transcribe", "banana"]):
                    continue

                display_name = m.get("displayName", m_id)
                description = m.get("description", "Multimodal text generation model.")
                if len(description) > 115:
                    description = description[:112] + "..."

                valid_models.append({
                    "id": m_id,
                    "name": display_name,
                    "recommended": (m_id == DEFAULT_MODEL_ID),
                    "description": description
                })

            if valid_models:
                # Ensure default model is first, then recommended, then alphabetically
                valid_models.sort(key=lambda x: (0 if x["id"] == DEFAULT_MODEL_ID else (1 if x.get("recommended") else 2), x["id"]))
                return valid_models
    except Exception:
        pass

    return SUPPORTED_MODELS


def sanitize_error_message(msg: str, key: Optional[str] = None) -> str:
    """Mask any accidental API key leaks or sensitive headers in error messages."""
    if not msg:
        return ""
    if key and len(key) > 6:
        msg = msg.replace(key, f"{key[:4]}...[REDACTED]")
    # Mask any generic AIzaSy or AQ. keys that might appear
    import re
    msg = re.sub(r'AIzaSy[A-Za-z0-9_-]{33}', '[REDACTED_API_KEY]', msg)
    msg = re.sub(r'AQ\.[A-Za-z0-9_.-]{20,}', '[REDACTED_API_KEY]', msg)
    msg = re.sub(r'([?&]key=)[^&\s"\']+', r'\1[REDACTED_API_KEY]', msg)
    msg = re.sub(r'(Bearer\s+)[A-Za-z0-9_.-]{10,}', r'\1[REDACTED_TOKEN]', msg)
    msg = re.sub(r'(x-goog-api-key:\s*)[^\s"\']+', r'\1[REDACTED_API_KEY]', msg)
    return msg


def call_gemini_api(prompt: str, model: str, api_key: str, temperature: float = 0.7, max_retries: int = 1) -> Dict[str, Any]:
    """Execute a single generation request to the official Google Gemini API with bounded retry on transient errors."""
    if not api_key or not api_key.strip():
        return {
            "success": False,
            "error": "No Gemini API key provided. Please enter and save your API key in the settings.",
            "statusCode": 401,
            "retryable": False
        }

    if not prompt or not prompt.strip():
        return {
            "success": False,
            "error": "Prompt cannot be empty.",
            "statusCode": 400,
            "retryable": False
        }

    if not model or not model.strip():
        model = DEFAULT_MODEL_ID

    model = model.strip()
    if model.startswith("models/"):
        model = model[7:]

    # Check for deprecated models to return a helpful, immediate non-retry error
    deprecated_models = {
        "gemini-2.0-flash": f"Model 'gemini-2.0-flash' has been retired by Google. Please select '{DEFAULT_MODEL_ID}'.",
        "gemini-2.5-flash": f"Model 'gemini-2.5-flash' is no longer available to new users. Please select '{DEFAULT_MODEL_ID}'.",
        "gemini-2.5-flash-lite": f"Model 'gemini-2.5-flash-lite' is no longer available to new users. Please select '{DEFAULT_MODEL_ID}'.",
        "gemini-1.5-flash": f"Model 'gemini-1.5-flash' has been retired by Google. Please select '{DEFAULT_MODEL_ID}'.",
        "gemini-1.5-pro": f"Model 'gemini-1.5-pro' has been retired by Google. Please select '{DEFAULT_MODEL_ID}'."
    }
    if model in deprecated_models:
        return {
            "success": False,
            "error": deprecated_models[model],
            "raw_error": f"Deprecated model requested: {model}",
            "statusCode": 404,
            "retryable": False,
            "model": model
        }

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key.strip()
    }

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": max(0.0, min(2.0, float(temperature)))
        }
    }

    req_data = json.dumps(payload).encode("utf-8")
    open_kwargs = {"timeout": 30}
    try:
        import ssl
        open_kwargs["context"] = ssl.create_default_context()
    except Exception:
        pass

    attempts = 0
    total_allowed = 1 + max(0, min(2, max_retries))  # max 2 attempts total (1 retry)
    start_time = time.perf_counter()

    while attempts < total_allowed:
        attempts += 1
        req = urllib.request.Request(endpoint, data=req_data, headers=headers, method="POST")

        try:
            try:
                resp = urllib.request.urlopen(req, **open_kwargs)
            except urllib.error.URLError as uerr:
                import ssl
                reason_str = str(getattr(uerr, 'reason', uerr))
                if "CERTIFICATE_VERIFY_FAILED" in reason_str or isinstance(getattr(uerr, 'reason', None), getattr(ssl, 'SSLCertVerificationError', tuple())):
                    open_kwargs["context"] = ssl._create_unverified_context()
                    resp = urllib.request.urlopen(req, **open_kwargs)
                else:
                    raise

            with resp:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000)
                res_body = resp.read().decode("utf-8")
                data = json.loads(res_body)

                candidates = data.get("candidates", [])
                if not candidates:
                    feedback = data.get("promptFeedback", {})
                    block_reason = feedback.get("blockReason", "No response candidates returned.")
                    return {
                        "success": False,
                        "error": f"Content was filtered by Gemini safety system: {block_reason}",
                        "statusCode": 200,
                        "duration_ms": elapsed_ms,
                        "model": model,
                        "retryable": False
                    }

                first_candidate = candidates[0]
                finish_reason = first_candidate.get("finishReason", "STOP")
                parts = first_candidate.get("content", {}).get("parts", [])
                text = "".join(part.get("text", "") for part in parts)

                if finish_reason == "SAFETY":
                    return {
                        "success": False,
                        "error": "Response was blocked due to Gemini safety policies.",
                        "statusCode": 200,
                        "duration_ms": elapsed_ms,
                        "model": model,
                        "retryable": False
                    }

                usage_metadata = data.get("usageMetadata", {})
                usage = None
                if usage_metadata:
                    usage = {
                        "prompt_tokens": usage_metadata.get("promptTokenCount", 0),
                        "candidates_tokens": usage_metadata.get("candidatesTokenCount", 0),
                        "total_tokens": usage_metadata.get("totalTokenCount", 0)
                    }

                return {
                    "success": True,
                    "text": text,
                    "model": model,
                    "finish_reason": finish_reason,
                    "duration_ms": elapsed_ms,
                    "usage": usage,
                    "attempts": attempts
                }

        except urllib.error.HTTPError as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000)
            try:
                err_body = e.read().decode("utf-8")
                err_json = json.loads(err_body)
                raw_msg = err_json.get("error", {}).get("message", str(e))
                status_code = err_json.get("error", {}).get("code", e.code)
            except Exception:
                raw_msg = str(e)
                status_code = e.code

            clean_msg = sanitize_error_message(raw_msg, api_key)

            # Determine if transient and retryable
            is_transient = status_code in (500, 503, 504)
            if is_transient and attempts < total_allowed:
                time.sleep(1.5)
                continue

            if status_code in (400, 401, 403) and ("API key" in clean_msg or "INVALID_ARGUMENT" in clean_msg or "PERMISSION_DENIED" in clean_msg or status_code == 403):
                friendly = "Invalid or inactive Gemini API key. Please check your key in Google AI Studio and ensure it is saved correctly."
                retryable = False
            elif status_code == 404:
                friendly = f"Gemini model '{model}' was not found or is no longer available on this endpoint. Please select a supported model such as {DEFAULT_MODEL_ID}."
                retryable = False
            elif status_code == 429:
                friendly = f"Gemini quota or rate limit exceeded for model '{model}'. Please wait a moment before sending another request, or check your quota in Google AI Studio."
                retryable = False
            elif status_code in (500, 503, 504):
                friendly = f"Google Gemini service is temporarily overloaded for model '{model}' ({status_code} Service Unavailable). Spikes in demand are temporary; please retry in a few moments or switch to a faster model like {DEFAULT_MODEL_ID}."
                retryable = True
            else:
                friendly = f"Gemini API error ({status_code}): {clean_msg}"
                retryable = False

            return {
                "success": False,
                "error": friendly,
                "raw_error": clean_msg,
                "statusCode": status_code,
                "duration_ms": elapsed_ms,
                "model": model,
                "retryable": retryable,
                "attempts": attempts
            }

        except (urllib.error.URLError, TimeoutError) as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000)
            if attempts < total_allowed:
                time.sleep(1.5)
                continue

            reason_text = getattr(e, 'reason', str(e))
            clean_reason = sanitize_error_message(str(reason_text), api_key)
            return {
                "success": False,
                "error": f"Network connection error: Unable to reach Google Gemini API ({clean_reason}). Please verify your internet connection.",
                "statusCode": 504 if isinstance(e, TimeoutError) else 0,
                "duration_ms": elapsed_ms,
                "model": model,
                "retryable": True,
                "attempts": attempts
            }

        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000)
            return {
                "success": False,
                "error": f"An unexpected error occurred: {sanitize_error_message(str(e), api_key)}",
                "statusCode": 500,
                "duration_ms": elapsed_ms,
                "model": model,
                "retryable": False,
                "attempts": attempts
            }


class StudioRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler serving the Studio frontend and API endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-goog-api-key")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        url_path = urllib.parse.urlparse(self.path).path
        if url_path == "/api/health":
            self._send_json({"status": "ok", "app": "Prompt Engineering Studio", "version": "1.0.0"})
            return
        elif url_path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        elif url_path == "/api/config":
            server_key_present = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
            self._send_json({
                "models": SUPPORTED_MODELS,
                "default_model": DEFAULT_MODEL_ID,
                "has_server_key": server_key_present
            })
            return
        elif url_path == "/api/gemini/models":
            query_params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            key = query_params.get("key", [""])[0] or self.headers.get("x-goog-api-key", "")
            if not key and self.headers.get("Authorization", "").startswith("Bearer "):
                key = self.headers.get("Authorization", "")[7:].strip()
            if not key:
                key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
            models = fetch_live_models_from_gemini(key)
            self._send_json({
                "success": True,
                "models": models,
                "default_model": DEFAULT_MODEL_ID
            })
            return

        # Serve static files from PROJECT_DIR
        super().do_GET()

    def do_POST(self):
        url_path = urllib.parse.urlparse(self.path).path

        if url_path == "/api/gemini/generate":
            self._handle_generate()
        elif url_path == "/api/gemini/compare":
            self._handle_compare()
        elif url_path == "/api/gemini/models":
            self._handle_models()
        else:
            self._send_json({"error": "Endpoint not found"}, status=404)

    def _get_api_key_from_request(self, data: Dict[str, Any]) -> str:
        # Check header x-goog-api-key
        header_key = self.headers.get("x-goog-api-key")
        if header_key and header_key.strip():
            return header_key.strip()
        # Check Bearer token
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if token:
                return token
        # Check body apiKey
        body_key = data.get("apiKey")
        if body_key and str(body_key).strip():
            return str(body_key).strip()
        # Fallback to server env var if present
        return os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""

    def _read_json_body(self) -> Optional[Dict[str, Any]]:
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                return {}
            body = self.rfile.read(content_length).decode("utf-8")
            return json.loads(body)
        except Exception:
            return None

    def _send_json(self, data: Dict[str, Any], status: int = 200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_generate(self):
        data = self._read_json_body()
        if data is None:
            self._send_json({"success": False, "error": "Invalid JSON in request body."}, status=400)
            return

        prompt = data.get("prompt", "")
        model = data.get("model", DEFAULT_MODEL_ID)
        temperature = data.get("temperature", 0.7)
        api_key = self._get_api_key_from_request(data)

        if not api_key:
            self._send_json({
                "success": False,
                "error": "No Gemini API key supplied. Please save your API key in the API Key settings first.",
                "statusCode": 401
            }, status=401)
            return

        result = call_gemini_api(prompt, model, api_key, temperature)
        status_code = 200 if result.get("success") else (result.get("statusCode") or 400)
        if status_code < 200 or status_code > 599:
            status_code = 500
        self._send_json(result, status=status_code)

    def _handle_compare(self):
        data = self._read_json_body()
        if data is None:
            self._send_json({"success": False, "error": "Invalid JSON in request body."}, status=400)
            return

        items = data.get("prompts", [])
        if not items or not isinstance(items, list):
            self._send_json({"success": False, "error": "A list of prompts to compare is required."}, status=400)
            return

        model = data.get("model", DEFAULT_MODEL_ID)
        temperature = data.get("temperature", 0.7)
        api_key = self._get_api_key_from_request(data)

        if not api_key:
            self._send_json({
                "success": False,
                "error": "No Gemini API key supplied. Please save your API key in the API Key settings first.",
                "statusCode": 401
            }, status=401)
            return

        # Execute prompts in parallel
        results = [None] * len(items)

        def worker(idx: int, item: Dict[str, Any]):
            p_text = item.get("text", "")
            p_id = item.get("id", f"prompt_{idx}")
            p_label = item.get("label", f"Prompt #{idx + 1}")
            p_technique = item.get("technique", "")

            call_res = call_gemini_api(p_text, model, api_key, temperature)
            call_res["id"] = p_id
            call_res["label"] = p_label
            call_res["technique"] = p_technique
            call_res["prompt_text"] = p_text
            return idx, call_res

        with ThreadPoolExecutor(max_workers=min(len(items), 8)) as executor:
            future_to_idx = {executor.submit(worker, i, item): i for i, item in enumerate(items)}
            for future in as_completed(future_to_idx):
                try:
                    idx, res = future.result()
                    results[idx] = res
                except Exception as ex:
                    idx = future_to_idx[future]
                    results[idx] = {
                        "id": items[idx].get("id", f"prompt_{idx}"),
                        "label": items[idx].get("label", f"Prompt #{idx + 1}"),
                        "prompt_text": items[idx].get("text", ""),
                        "success": False,
                        "error": sanitize_error_message(f"Execution error: {str(ex)}", api_key),
                        "statusCode": 500,
                        "model": model
                    }

        self._send_json({"success": True, "results": results, "model": model})

    def _handle_models(self):
        data = self._read_json_body() or {}
        api_key = self._get_api_key_from_request(data)
        models = fetch_live_models_from_gemini(api_key)
        self._send_json({"success": True, "models": models, "default_model": DEFAULT_MODEL_ID})


def find_available_port(start_port: int, max_attempts: int = 15) -> int:
    """Find an open port starting from start_port."""
    import socket
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start_port


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Prompt Engineering Studio Server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to run the server on")
    args = parser.parse_args()

    port = find_available_port(args.port)
    server_address = ("127.0.0.1", port)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(server_address, StudioRequestHandler) as httpd:
        print("\n" + "=" * 65)
        print("  🌟 Prompt Engineering Studio Server")
        print(f"  URL: http://127.0.0.1:{port}")
        print("  Press Ctrl+C to stop.")
        print("=" * 65 + "\n")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()


if __name__ == "__main__":
    main()
