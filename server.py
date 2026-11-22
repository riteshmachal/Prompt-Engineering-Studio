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
        "id": "gemini-3.1-flash-lite",
        "name": "Gemini 3.1 Flash Lite",
        "recommended": True,
        "description": "Fastest, lightweight, and most responsive model for prompt testing."
    },
    {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash Lite",
        "recommended": False,
        "description": "High-speed multimodal generation and structured output."
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

DEFAULT_MODEL_ID = "gemini-3.1-flash-lite"


def sanitize_error_message(msg: str, key: Optional[str] = None) -> str:
    """Mask any accidental API key leaks in error messages."""
    if key and len(key) > 6:
        msg = msg.replace(key, f"{key[:4]}...[REDACTED]")
    # Also mask any generic AIzaSy or AQ. keys that might appear
    import re
    msg = re.sub(r'AIzaSy[A-Za-z0-9_-]{33}', '[REDACTED_API_KEY]', msg)
    msg = re.sub(r'AQ\.[A-Za-z0-9_.-]{20,}', '[REDACTED_API_KEY]', msg)
    return msg


def call_gemini_api(prompt: str, model: str, api_key: str, temperature: float = 0.7) -> Dict[str, Any]:
    """Execute a single generation request to the official Google Gemini API."""
    if not api_key or not api_key.strip():
        return {
            "success": False,
            "error": "No Gemini API key provided. Please enter and save your API key in the settings.",
            "statusCode": 401
        }

    if not prompt or not prompt.strip():
        return {
            "success": False,
            "error": "Prompt cannot be empty.",
            "statusCode": 400
        }

    if not model or not model.strip():
        model = DEFAULT_MODEL_ID

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

    start_time = time.perf_counter()
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(endpoint, data=req_data, headers=headers, method="POST")

    open_kwargs = {"timeout": 30}
    try:
        import ssl
        open_kwargs["context"] = ssl.create_default_context()
    except Exception:
        pass

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
                # Check for prompt feedback block
                feedback = data.get("promptFeedback", {})
                block_reason = feedback.get("blockReason", "No response candidates returned.")
                return {
                    "success": False,
                    "error": f"Content was filtered by Gemini safety system: {block_reason}",
                    "statusCode": 200,
                    "duration_ms": elapsed_ms,
                    "model": model
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
                    "model": model
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
                "usage": usage
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

        # Map to friendly beginner explanations
        if status_code in (400, 401, 403) and ("API key" in clean_msg or "INVALID_ARGUMENT" in clean_msg or status_code == 403):
            friendly = "Invalid or inactive Gemini API key. Please check your key in Google AI Studio and ensure it is saved correctly."
        elif status_code == 429:
            friendly = "Gemini quota or rate limit exceeded. Please wait a moment before sending another request, or check your quota in Google AI Studio."
        elif status_code >= 500:
            friendly = "Google Gemini service encountered a temporary server error. Please retry in a few moments."
        else:
            friendly = f"Gemini API error ({status_code}): {clean_msg}"

        return {
            "success": False,
            "error": friendly,
            "raw_error": clean_msg,
            "statusCode": status_code,
            "duration_ms": elapsed_ms,
            "model": model
        }

    except urllib.error.URLError as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000)
        return {
            "success": False,
            "error": f"Network connection error: Unable to reach Google Gemini API ({sanitize_error_message(str(e.reason), api_key)}). Please verify your internet connection.",
            "statusCode": 0,
            "duration_ms": elapsed_ms,
            "model": model
        }
    except TimeoutError:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000)
        return {
            "success": False,
            "error": "Request timed out after 30 seconds. Gemini took too long to respond.",
            "statusCode": 408,
            "duration_ms": elapsed_ms,
            "model": model
        }
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000)
        return {
            "success": False,
            "error": f"An unexpected error occurred: {sanitize_error_message(str(e), api_key)}",
            "statusCode": 500,
            "duration_ms": elapsed_ms,
            "model": model
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

        # Serve static files from PROJECT_DIR
        super().do_GET()

    def do_POST(self):
        url_path = urllib.parse.urlparse(self.path).path

        if url_path == "/api/gemini/generate":
            self._handle_generate()
        elif url_path == "/api/gemini/compare":
            self._handle_compare()
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
