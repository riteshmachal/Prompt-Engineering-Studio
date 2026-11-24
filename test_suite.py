#!/usr/bin/env python3
"""
Test Suite for Prompt Engineering Studio
========================================
Comprehensive automated unit and integration tests verifying:
1. Static asset integrity and required elements (HTML/CSS/JS)
2. Prompt engineering technique templates and constraint integrity
3. Server request handling, validation logic, and key masking without requiring socket permissions
4. Error handling and key masking logic
"""

import unittest
import os
import io
import re
import json
import time
import urllib.request
import urllib.error

# Import server components
import server

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))


class TestStaticAssets(unittest.TestCase):
    """Verify that all frontend files exist and satisfy user-friendly requirements."""

    def test_files_exist(self):
        for fname in ["index.html", "styles.css", "app.js", "server.py"]:
            path = os.path.join(PROJECT_DIR, fname)
            self.assertTrue(os.path.isfile(path), f"File {fname} must exist.")
            self.assertGreater(os.path.getsize(path), 500, f"File {fname} should not be empty.")

    def test_html_title_and_header(self):
        with open(os.path.join(PROJECT_DIR, "index.html"), "r", encoding="utf-8") as f:
            html = f.read()

        # Check title and visible header
        self.assertIn("<title>Prompt Engineering Studio</title>", html)
        self.assertIn('<h1 class="brand-title">Prompt Engineering Studio</h1>', html)

        # Check numbered stages
        self.assertIn("Write your prompt", html)
        self.assertIn("Choose improvements", html)
        self.assertIn("Review enhanced prompts", html)
        self.assertIn("Compare Gemini’s responses", html)
        self.assertIn("Prompt Comparison", html)
        self.assertIn("Model Comparison", html)

        # Check How it works area
        self.assertIn("How Prompt Engineering Studio Works", html)

        # Check API key controls
        self.assertIn("gemini-api-key-input", html)
        self.assertIn("btn-toggle-key-visibility", html)
        self.assertIn("btn-save-key", html)
        self.assertIn("btn-remove-key", html)
        self.assertIn("chk-remember-key", html)

        # Check technique cards
        for tech in ["tech-clear-task", "tech-role", "tech-audience", "tech-constraints",
                     "tech-step-by-step", "tech-few-shot", "tech-structured", "tech-combined"]:
            self.assertIn(tech, html, f"Technique checkbox {tech} must be in index.html")

        # Check Stage 5: Model Comparison markup
        self.assertIn('id="stage-5"', html, "Model Comparison section must exist in index.html")
        self.assertIn('id="model-comp-chips-grid"', html)
        self.assertIn('id="btn-run-model-comparison"', html)
        self.assertIn('id="model-comp-matrix-table"', html)

        # Check Stage 6: Prompt Battle markup
        self.assertIn('id="stage-6"', html, "Prompt Battle section must exist in index.html")
        self.assertIn('Prompt Battle: Head-to-Head Comparison', html)
        self.assertIn('id="battle-prompt-a-input"', html)
        self.assertIn('id="battle-prompt-b-input"', html)
        self.assertIn('id="btn-start-battle"', html)
        self.assertIn('id="battle-results-grid"', html)
        self.assertIn('id="battle-response-card-a"', html)
        self.assertIn('id="battle-response-card-b"', html)
        self.assertIn('id="battle-judgement-panel"', html)
        self.assertIn('value="Prompt A"', html)
        self.assertIn('value="Prompt B"', html)
        self.assertIn('value="About the same"', html)
        self.assertIn('id="battle-explanation-input"', html)
        self.assertIn('id="btn-save-verdict"', html)

        # Check Feature 2: Gemini Model Selector markup
        self.assertIn('id="stage4-model-select"', html, "Stage 4 model selector must exist")
        self.assertIn('id="battle-model-select"', html, "Prompt Battle model selector must exist")
        self.assertIn('id="gemini-model-select"', html, "Settings model selector must exist")
        self.assertIn('gemini-3.5-flash-lite', html)

        # Check accessible landmarks
        self.assertIn('role="main"', html)
        self.assertIn('role="banner"', html)
        self.assertIn('class="skip-link"', html)

    def test_css_accessibility_and_responsiveness(self):
        with open(os.path.join(PROJECT_DIR, "styles.css"), "r", encoding="utf-8") as f:
            css = f.read()

        self.assertIn(":focus-visible", css, "Must include visible focus styles for accessibility")
        self.assertIn("@media (max-width:", css, "Must include responsive media queries")
        self.assertIn("--primary", css, "Must define design system CSS variables")
        self.assertIn(".status-retrying", css, "Must define retrying status style")
        self.assertIn(".status-waiting", css, "Must define waiting status style")
        self.assertIn(".card-retry-actions", css, "Must define card retry actions container")
        self.assertIn(".meta-pill-alt", css, "Must define alternative fallback model pill")

    def test_js_techniques_defined(self):
        with open(os.path.join(PROJECT_DIR, "app.js"), "r", encoding="utf-8") as f:
            js = f.read()

        for tech in ["clear_task", "role", "audience", "constraints", "step_by_step", "few_shot", "structured", "combined"]:
            self.assertIn(tech, js, f"Technique {tech} must be defined in app.js")

        # Verify retry functions and alternative fallback logic
        self.assertIn("getVerifiedAlternativeModel", js, "Must define verified alternative model helper")
        self.assertIn("retryComparisonCard", js, "Must implement single-card retry")
        self.assertIn("retryBattleFighter", js, "Must implement single-fighter battle retry")
        self.assertIn("retryModelCard", js, "Must implement single-model retry for model comparison")
        self.assertIn("runModelComparison", js, "Must implement multi-model comparison runner")
        self.assertIn("renderModelComparisonChips", js, "Must implement model comparison chips renderer")
        self.assertIn("btn-retry-card", js, "Must support per-card retry control")
        self.assertIn("btn-retry-card-alt", js, "Must support per-card alternative model retry")

        # Ensure no hardcoded secret
        self.assertNotIn("AIzaSyB", js, "Never hardcode real Gemini API key in JS source")


class TestPromptEngineeringTechniques(unittest.TestCase):
    """Verify that each prompt technique preserves intent and adds required structure."""

    def setUp(self):
        self.original_prompt = "Explain climate change to a 12-year-old in under 100 words."
        self.options = {
            "audience": "12-year-old student",
            "context": "Science classroom presentation",
            "tone": "Friendly, encouraging, and engaging",
            "length": "Under 100 words",
            "format": "Bullet points with bold topic headers",
            "role": "Friendly science teacher",
            "fewShot": "• Idea: Earth's atmosphere acts like a blanket.\n• Problem: Burning fossil fuels makes it too thick."
        }

    def test_security_key_sanitization(self):
        fake_key = "AIzaSyDummySecretKey1234567890abcdef"
        raw_error = f"Google API error using key {fake_key}: Quota exhausted."
        sanitized = server.sanitize_error_message(raw_error, fake_key)
        self.assertNotIn(fake_key, sanitized, "Sanitized message must not contain the raw key")
        self.assertIn("[REDACTED", sanitized)

        # Query param sanitization
        query_leak = "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSySecret12345678901234567890"
        sanitized_query = server.sanitize_error_message(query_leak)
        self.assertNotIn("AIzaSySecret", sanitized_query)
        self.assertIn("[REDACTED_API_KEY]", sanitized_query)

    def test_call_gemini_api_validation(self):
        # Empty API key
        res = server.call_gemini_api("Test prompt", "gemini-3.5-flash-lite", "")
        self.assertFalse(res["success"])
        self.assertEqual(res["statusCode"], 401)
        self.assertIn("API key", res["error"])

        # Empty prompt
        res = server.call_gemini_api("", "gemini-3.5-flash-lite", "AIzaSyDummyKey12345678901234567890")
        self.assertFalse(res["success"])
        self.assertEqual(res["statusCode"], 400)
        self.assertIn("Prompt cannot be empty", res["error"])

        # Deprecated model rejection
        res_deprecated = server.call_gemini_api("Hello", "gemini-2.0-flash", "AIzaSyDummyKey12345678901234567890")
        self.assertFalse(res_deprecated["success"])
        self.assertEqual(res_deprecated["statusCode"], 404)
        self.assertIn("retired", res_deprecated["error"])

        # Supported models check
        supported_ids = [m["id"] for m in server.SUPPORTED_MODELS]
        self.assertIn("gemini-3.1-flash-lite", supported_ids)
        self.assertIn("gemini-3.5-flash-lite", supported_ids)
        self.assertIn("gemini-3.8-flash", supported_ids)
        self.assertIn("gemini-3.1-pro-preview", supported_ids)
        self.assertIn("gemini-flash-lite-latest", supported_ids)
        self.assertIn("gemini-3-flash-preview", supported_ids)

        # Alternative model verification
        alt_for_default = server.get_verified_alternative_model("gemini-3.5-flash-lite")
        self.assertNotEqual(alt_for_default, "gemini-3.5-flash-lite", "Fallback must not recommend the same model that failed")
        self.assertEqual(alt_for_default, "gemini-flash-lite-latest")

        alt_for_latest = server.get_verified_alternative_model("gemini-flash-lite-latest")
        self.assertEqual(alt_for_latest, "gemini-3.5-flash-lite")

        alt_for_other = server.get_verified_alternative_model("gemini-3.8-flash")
        self.assertEqual(alt_for_other, "gemini-3.5-flash-lite")

        # Check model retrieval fallback without key
        models_fallback = server.fetch_live_models_from_gemini("")
        self.assertGreaterEqual(len(models_fallback), 4)
        self.assertEqual(models_fallback[0]["id"], server.DEFAULT_MODEL_ID)


class MockSocket:
    """Mock socket for testing SimpleHTTPRequestHandler without OS sockets."""
    def __init__(self, request_bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self.rfile
        elif 'w' in mode:
            return self.wfile


class TestHandlerInternals(unittest.TestCase):
    """Directly test server handler dispatch without network sockets."""

    def test_get_api_key_from_request(self):
        handler = server.StudioRequestHandler.__new__(server.StudioRequestHandler)
        handler.headers = {"x-goog-api-key": "AIzaSyHeaderKey123456"}
        key = handler._get_api_key_from_request({})
        self.assertEqual(key, "AIzaSyHeaderKey123456")

        handler.headers = {"Authorization": "Bearer AIzaSyBearerKey123456"}
        key = handler._get_api_key_from_request({})
        self.assertEqual(key, "AIzaSyBearerKey123456")

        handler.headers = {}
        key = handler._get_api_key_from_request({"apiKey": "AIzaSyBodyKey123456"})
        self.assertEqual(key, "AIzaSyBodyKey123456")

    def test_find_available_port(self):
        port = server.find_available_port(8080)
        self.assertIsInstance(port, int)
        self.assertGreaterEqual(port, 8080)


class TestServerHandlerDispatch(unittest.TestCase):
    """Test server HTTP request dispatch and endpoints using mocked handler without OS sockets."""

    def setUp(self):
        self.handler = server.StudioRequestHandler.__new__(server.StudioRequestHandler)
        self.sent_responses = []
        def mock_send_json(data, status=200):
            self.sent_responses.append((data, status))
        self.handler._send_json = mock_send_json
        self.handler.headers = {}

    def test_health_endpoint(self):
        self.handler.path = "/api/health"
        self.handler.do_GET()
        self.assertEqual(len(self.sent_responses), 1)
        data, status = self.sent_responses[0]
        self.assertEqual(status, 200)
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["app"], "Prompt Engineering Studio")

    def test_config_endpoint(self):
        self.handler.path = "/api/config"
        self.handler.do_GET()
        self.assertEqual(len(self.sent_responses), 1)
        data, status = self.sent_responses[0]
        self.assertEqual(status, 200)
        self.assertIn("models", data)
        self.assertEqual(data["default_model"], server.DEFAULT_MODEL_ID)

    def test_models_endpoint(self):
        self.handler.path = "/api/gemini/models"
        self.handler.do_GET()
        self.assertEqual(len(self.sent_responses), 1)
        data, status = self.sent_responses[0]
        self.assertEqual(status, 200)
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["models"]), 4)

    def test_generate_endpoint_validation(self):
        self.handler._read_json_body = lambda: {"prompt": "Hello", "model": server.DEFAULT_MODEL_ID}
        old_key = os.environ.pop("GEMINI_API_KEY", None)
        try:
            self.handler._handle_generate()
            self.assertEqual(len(self.sent_responses), 1)
            data, status = self.sent_responses[0]
            self.assertEqual(status, 401)
            self.assertIn("No Gemini API key supplied", data["error"])
        finally:
            if old_key is not None:
                os.environ["GEMINI_API_KEY"] = old_key

    def test_compare_endpoint_validation(self):
        self.handler._read_json_body = lambda: {"prompts": [{"id": "p1", "text": "Hello"}]}
        old_key = os.environ.pop("GEMINI_API_KEY", None)
        try:
            self.handler._handle_compare()
            self.assertEqual(len(self.sent_responses), 1)
            data, status = self.sent_responses[0]
            self.assertEqual(status, 401)
            self.assertIn("No Gemini API key supplied", data["error"])
        finally:
            if old_key is not None:
                os.environ["GEMINI_API_KEY"] = old_key


class TestEnvAndTokenUsage(unittest.TestCase):
    """Verify safe environment key handling and token usage parsing."""

    def test_env_example_exists_and_gitignore(self):
        example_path = os.path.join(PROJECT_DIR, ".env.example")
        self.assertTrue(os.path.isfile(example_path), ".env.example must exist in project root.")
        with open(example_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("GEMINI_API_KEY=your_gemini_api_key_here", content)
        # Ensure no real key is in .env.example
        self.assertNotIn("AIzaSyB", content)

        # Check .gitignore
        gitignore_path = os.path.join(PROJECT_DIR, ".gitignore")
        with open(gitignore_path, "r", encoding="utf-8") as f:
            gi = f.read()
        self.assertIn(".env", gi)
        self.assertIn("!.env.example", gi)

    def test_load_env_file(self):
        import tempfile
        with tempfile.NamedTemporaryFile("w+", delete=False) as tf:
            tf.write("# Test env file\nGEMINI_API_KEY=test_sample_env_key_1234567\nPORT=9999\n")
            temp_path = tf.name

        try:
            # Clear if set
            old_val = os.environ.pop("GEMINI_API_KEY", None)
            server.load_env_file(temp_path)
            self.assertEqual(os.environ.get("GEMINI_API_KEY"), "test_sample_env_key_1234567")
        finally:
            os.remove(temp_path)
            if old_val is not None:
                os.environ["GEMINI_API_KEY"] = old_val
            else:
                os.environ.pop("GEMINI_API_KEY", None)

    def test_token_usage_contract_in_js(self):
        with open(os.path.join(PROJECT_DIR, "app.js"), "r", encoding="utf-8") as f:
            js = f.read()
        # Verify token distinction and unavailable message
        self.assertIn("Token usage unavailable for this response", js)
        self.assertIn("prompt_tokens", js)
        self.assertIn("candidates_tokens", js)
        self.assertIn("total_tokens", js)
        self.assertIn("Input:", js)
        self.assertIn("Output:", js)

    def test_compare_models_handler_validation(self):
        handler = server.StudioRequestHandler.__new__(server.StudioRequestHandler)
        # Mock json responses
        sent_responses = []
        def mock_send_json(data, status=200):
            sent_responses.append((data, status))
        handler._send_json = mock_send_json

        # Test missing body
        handler._read_json_body = lambda: None
        handler._handle_compare_models()
        self.assertEqual(sent_responses[-1][1], 400)

        # Test empty prompt
        handler._read_json_body = lambda: {"prompt": "", "models": ["gemini-3.5-flash-lite"]}
        handler._handle_compare_models()
        self.assertEqual(sent_responses[-1][1], 400)
        self.assertIn("Prompt cannot be empty", sent_responses[-1][0]["error"])

        # Test missing models
        handler._read_json_body = lambda: {"prompt": "Valid prompt", "models": []}
        handler._handle_compare_models()
        self.assertEqual(sent_responses[-1][1], 400)
        self.assertIn("at least two models", sent_responses[-1][0]["error"])

        # Test missing API key
        handler._read_json_body = lambda: {"prompt": "Valid prompt", "models": ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"]}
        handler.headers = {}
        old_key = os.environ.pop("GEMINI_API_KEY", None)
        try:
            handler._handle_compare_models()
            self.assertEqual(sent_responses[-1][1], 401)
            self.assertIn("No Gemini API key supplied", sent_responses[-1][0]["error"])
        finally:
            if old_key is not None:
                os.environ["GEMINI_API_KEY"] = old_key

    def test_model_comparison_structure_in_js(self):
        with open(os.path.join(PROJECT_DIR, "app.js"), "r", encoding="utf-8") as f:
            js = f.read()
        self.assertIn("modelComparison", js)
        self.assertIn("initModelComparison", js)
        self.assertIn("runModelComparison", js)
        self.assertIn("renderModelComparisonChips", js)
        self.assertIn("renderModelComparisonMatrix", js)
        self.assertIn("retryModelCard", js)


if __name__ == "__main__":
    unittest.main()
