# Prompt Engineering Studio

> **CCA Activity for Artificial Intelligence • First Year, First Semester**  
> A student exploration prototype for learning, practicing, and evaluating prompt engineering techniques using **Google Gemini**.

---

## 1. Project Title
**Prompt Engineering Studio**

---

## 2. CCA Activity Context
This project was developed as a student learning activity for the **Artificial Intelligence course (First Year, First Semester)**. It is built as a hands-on laboratory prototype to understand how generative AI responds to differently structured prompts.

---

## 3. Project Overview
Large language models such as Google Gemini are sensitive to how a prompt is worded and structured. A vague or unstructured prompt often yields generic, overly verbose, or unfocused responses.

**Prompt Engineering Studio** is an interactive, lightweight web application built to explore this behavior. It allows a user to:
1. Enter a basic prompt.
2. Select one or more recognized prompt-engineering techniques.
3. Automatically generate structured variations of the prompt locally without using any API tokens.
4. Review the generated prompts and understand the rationale behind each transformation.
5. Send the original prompt and enhanced variations simultaneously to Google Gemini to compare real responses, latency, and token consumption side by side.

This is a prototype created for learning purposes, rather than a commercial or production product.

---

## 4. Purpose and Learning Objectives
The primary learning objectives of this activity were:
- **Understand Prompt Formulation**: Observe how explicit instructions, constraints, and personas change the way an LLM generates output.
- **Compare Structured Techniques**: Evaluate standard prompt-engineering patterns (such as Few-Shot prompting, Role prompting, and Step-by-Step reasoning) side by side against a baseline prompt.
- **Analyze Empirical Differences**: Study observable differences in response length, response duration, token usage, and constraint compliance when interacting with a real-world model (Google Gemini).
- **Practice Secure API Handling**: Implement safe practices for API keys in student software (avoiding hardcoded secrets, using in-memory session handling, and sanitizing error output).

---

## 5. How It Works
The studio is structured as a 4-stage sequential workflow:

```
[ Stage 1: Write Prompt ] ➔ [ Stage 2: Choose Techniques ] ➔ [ Stage 3: Review Enhanced Prompts ] ➔ [ Stage 4: Compare Gemini Responses ]
```

1. **Stage 1 — Write your prompt**: The user inputs an initial question or task in everyday language (or clicks one of three realistic sample presets: Science, Business, or Code). An optional drawer allows specifying target audience, background context, tone, length limit, output format, expert role, or a few-shot demonstration example.
2. **Stage 2 — Choose improvements**: The user selects which prompt techniques they want to apply from a catalog of specimen cards.
3. **Stage 3 — Review enhanced prompts**: The app applies deterministic template transformations locally, producing full prompt variations along with bulleted explanations of what changed and why. The user can review, edit, or copy any variation.
4. **Stage 4 — Compare Gemini's responses**: If a Gemini API key is provided, the app dispatches the original prompt and selected enhanced versions to Google Gemini simultaneously. The resulting answers appear in side-by-side cards with latency and token metrics, followed by an automated heuristic comparison table.

---

## 6. Prompt-Engineering Techniques Implemented
Every technique in the studio is implemented as a local JavaScript template generator in `app.js`. No API quota is consumed during the prompt enhancement step:

| Technique | Category | What It Changes in the Prompt |
| :--- | :--- | :--- |
| **A. Clear Task** | *Core* | Establishes prompt primacy with a `[TASK SPECIFICATION]` header and converts the user request into direct, unambiguous action directives. |
| **B. Role-Based** | *Persona* | Frames the response through an explicit domain expert role (e.g., *"A friendly science teacher"*) to guide voice, pedagogical style, and tone. |
| **C. Context & Audience** | *Targeted* | Inserts explicit `[TARGET AUDIENCE PROFILE]` and `[SITUATIONAL CONTEXT]` blocks to calibrate vocabulary and complexity without adding unsupported facts. |
| **D. Constraints & Guardrails** | *Control* | Adds strict length constraints, tone guardrails, and negative constraints suppressing conversational fluff (such as *"Certainly!"* or *"Here is your answer"*). |
| **E. Step-by-Step Guidance** | *Logic* | Structures the task into four progressive sequential steps (Core Concept &rarr; Mechanism &rarr; Real-World Impact &rarr; Key Takeaway) without demanding hidden internal reasoning. |
| **F. Few-Shot Example** | *In-Context* | Injects the user-supplied demonstration into the prompt (`--- EXAMPLE DEMONSTRATION ---`) so Gemini learns the desired output format through pattern matching. |
| **G. Structured Output** | *Layout* | Enforces explicit structural requirements (such as bullet points with bold headers, markdown comparison tables, or clean JSON objects). |
| **★ Combined Master Prompt** | *Synergy* | Synthesizes all active techniques (role, audience, constraints, steps, and structure) into a single unified prompt. |

---

## 7. Gemini API Use & API Key Configuration
The application uses **Google Gemini** as the single evaluation model to compare how prompt changes affect the same underlying LLM:

- **Model Used**: Defaults to `gemini-3.1-flash-lite` (official current Google Gemini model with fast response times and high rate-limit tolerance). Users can also select `gemini-3.5-flash-lite`, `gemini-3.8-flash`, or `gemini-3.1-pro-preview` in the settings dialog.
- **Where the Key is Entered**: Users enter their official Gemini API key directly into the application interface via the **Gemini API Key Settings** modal dialog (accessible by clicking the key pill in the header).
- **Optional Environment Variable**: Alternatively, the server supports a server-side environment variable:
  ```bash
  export GEMINI_API_KEY="your-gemini-api-key"
  python3 server.py
  ```
- **Storage Preference**:
  - **In-Memory (Default)**: The key is kept strictly in browser memory for the current tab session.
  - **Remember on this device**: If explicitly checked by the user, the key is saved to `localStorage` (`pes_api_key`) on that browser.
- **Key Masking & Sanitization**: Error messages and logs automatically redact API keys using regular expressions (`[REDACTED_API_KEY]`).
- **Zero Hardcoded Secrets**: No real API keys are committed or bundled into the repository.

---

## 8. Technologies Used
This project intentionally uses minimal, accessible technologies without third-party npm packages or complex frameworks:

- **Backend**: Python 3 standard library (`http.server`, `urllib.request`, `urllib.error`, `json`, `ssl`). Zero `pip` dependencies required.
- **Frontend Logic**: Vanilla JavaScript (ES6+), standard Fetch API, DOM manipulation. Zero external JS libraries.
- **Interface & Layout**: Semantic HTML5 and custom CSS3 with responsive Grid and Flexbox layouts.
- **Typography**: Google Fonts ([Fraunces](https://fonts.google.com/specimen/Fraunces), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)).
- **Testing**: Python standard library `unittest`.

---

## 9. Installation and Setup

### Prerequisites
- Python 3 (Python 3.8 or newer; tested with Python 3.10+ on macOS/Linux/Windows).
- A modern web browser (Chrome, Edge, Firefox, or Safari).
- An optional Google Gemini API key (obtainable for free from [Google AI Studio](https://aistudio.google.com/app/apikey)).

### Setup Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/riteshmachal/Prompt-Engineering-Studio.git
   cd Prompt-Engineering-Studio
   ```
2. No package installation is needed because the project uses only the Python standard library.

---

## 10. How to Run
Start the local server using Python:

```bash
python3 server.py
```

By default, the server finds an available port starting at `8080`. To run on a specific port (e.g. `8085`):

```bash
python3 server.py --port 8085
```

Once started, open your web browser to:
```
http://127.0.0.1:8085/
```

To stop the server, press `Ctrl + C` in the terminal.

---

## 11. How to Use the App (Step-by-Step)
1. **Enter API Key (Optional for Comparison)**:
   - Click the key status button in the top right header (`No API Key Saved`).
   - Enter your Gemini API key and click **Save Key**.
   *(Note: You can still use Stages 1–3 to generate and edit enhanced prompts even without an API key).*
2. **Draft Your Prompt (Stage 1)**:
   - Type your task in the **Original Prompt** box, or click a quick sample preset like `Explain Climate Change (Science)`.
   - Click **Optional Details** to expand optional fields (audience, tone, length constraint, format) if desired.
   - Click **Continue to Improvements**.
3. **Select Improvements (Stage 2)**:
   - Check the techniques you wish to apply (or click `Recommended` to select Clear Task, Role-based, and Constraints).
   - Click **Enhance Prompts**.
4. **Review & Edit (Stage 3)**:
   - Inspect each enhanced prompt card.
   - Read the *"What changed and why"* explanation to understand how the prompt was restructured.
   - Edit the text directly in the card or click **Copy** to use it elsewhere.
   - Click **Proceed to Gemini Comparison**.
5. **Compare Responses (Stage 4)**:
   - Select your comparison mode (*Original + Selected Enhanced*, *Selected Enhanced Only*, or *Original Only*).
   - Click **Compare with Gemini**.
   - Read the side-by-side responses and inspect duration, token consumption, and the **Observable Differences** table.

---

## 12. Example Walkthrough

### Raw Baseline Prompt:
```
Explain climate change to a 12-year-old in under 100 words.
```

### Enhanced Variation Generated by Studio (Clear Task + Role + Constraints):
```
[ROLE & PERSONA]
Act as a friendly science teacher and passionate educator. Communicate with authoritative domain expertise, warmth, and an engaging teaching style suited to curious learners.

[TASK SPECIFICATION]
Your task is to: Explain climate change to a 12-year-old in under 100 words.

[CORE DIRECTIVES]
1. Focus directly on the primary question or objective.
2. Explain the concept with clear, unambiguous terminology.
3. Maintain strict coherence without tangential digressions.

[TARGET AUDIENCE PROFILE]
Audience: A 12-year-old middle school student

[GUARDRAILS & OUTPUT CONSTRAINTS]
- Strict Length Limit: Under 100 words.
- Tone: Friendly, encouraging, and engaging.
- Negative Constraint: Do not include introductory filler (e.g., "Sure!", "Here is your explanation"). Start directly with the answer.
```

### Illustrative Gemini Response Comparison (Example Observation):
> *Note: Output below is an illustrative example observed during testing, not a guaranteed deterministic output from Gemini.*

- **Original Prompt Output**: Gemini produced a general 98-word paragraph explaining Earth's atmosphere as a blanket.
- **Enhanced Role-based Output**: Gemini produced a 94-word response comparing greenhouse gases to a car parked in the sun with windows rolled up—specifically matching a middle-school teacher's pedagogical style while adhering strictly to the sub-100-word constraint.

---

## 13. Project Structure
```
Prompt-Engineering-Studio/
├── index.html        # Semantic HTML5 markup containing the 4-stage workbench and dialogs
├── styles.css        # Custom CSS3 stylesheet with Editorial Atelier design system
├── app.js            # Client-side prompt engineering generators & Gemini comparison logic
├── server.py         # Lightweight Python standard library HTTP server & Gemini API proxy
├── test_suite.py     # Automated unit test suite (8 tests verifying markup, logic & security)
├── verify.py         # Quick verification script for preset integrity & key safety
├── .gitignore        # Ignores byte-caches, logs, and local environment files
├── screenshots/      # Real verification screenshots captured during testing
│   ├── 01-studio-workbench-overview.png
│   ├── 02-stage-3-enhanced-proofs.png
│   ├── 03-stage-4-gemini-comparison.png
│   └── 04-observable-differences-matrix.png
└── README.md         # This project documentation
```

---

## 14. Testing and Verification
The prototype includes automated test scripts and manual browser checks. The following tests were actually performed and verified:

1. **Automated Unit Tests (`test_suite.py`)**:
   - `test_static_assets_exist`: Confirmed existence of `index.html`, `styles.css`, `app.js`, and `server.py`.
   - `test_html_semantic_structure`: Verified `<header>`, `<main>`, `<footer>`, `<nav>`, and accessibility skip links.
   - `test_css_accessibility_and_responsiveness`: Verified `:focus-visible` styles, `@media` breakpoints, and CSS variables.
   - `test_js_techniques_defined`: Confirmed all 8 technique generators exist and no API keys are embedded.
   - `test_security_key_sanitization`: Confirmed regex masking of keys in error messages.
   - `test_mock_gemini_api_call_validation`: Tested mock API dispatch and rejection of blank prompts.
   - `test_server_endpoints`: Verified `/api/health` and `/api/config` routes.
   - `test_extract_api_key_from_headers`: Verified server header key extraction.
   - **Result**: `8/8 tests passed (0.001s)`.

2. **Logic Verification Script (`verify.py`)**:
   - Verified sample presets (`climate`, `invoice`, `python`).
   - Verified supported Gemini model list.
   - Verified source code contains 0 hardcoded real API keys.
   - **Result**: `All verification checks passed successfully`.

3. **Live Browser End-to-End Verification**:
   - Tested in browser at `http://127.0.0.1:8085/`.
   - Verified all 8 technique generators produce structured prompts with rationale.
   - Tested live parallel comparison against Google Gemini (`gemini-3.1-flash-lite`), recording 1.8s–2.3s latency and token metrics.
   - Verified zero console errors in browser developer tools.

---

## 15. Real Verification Screenshots

### Studio Workbench Overview (Stage 1 & Beginner Guide)
![Studio Workbench Overview](screenshots/01-studio-workbench-overview.png)

### Stage 3: Enhanced Prompt Proof Sheets with Explanations
![Stage 3 Enhanced Proof Sheets](screenshots/02-stage-3-enhanced-proofs.png)

### Stage 4: Live Side-by-Side Comparison with Google Gemini
![Stage 4 Gemini Live Comparison](screenshots/03-stage-4-gemini-comparison.png)

### Stage 4: Observable Differences Diagnostic Table
![Observable Differences Matrix](screenshots/04-observable-differences-matrix.png)

---

## 16. Limitations and Responsible Use
As a student learning project, this prototype has real limitations:
- **Model Hallucinations**: Responses generated by Google Gemini can still contain factual errors or hallucinations regardless of the prompt technique used. Outputs should always be critically reviewed.
- **Automated Heuristic Table**: The **Observable Differences** table uses automated client-side heuristics (word counts, regex checks for markdown headers, list markers, and length comparisons). These are indicators to assist learning, not qualitative proof of factual accuracy.
- **API Quota & Network**: Live comparisons require an active Internet connection and a valid Gemini API key subject to Google's rate limits.
- **Single Turn Only**: The studio evaluates single-turn prompts and responses; it is not a multi-turn conversational chatbot.

---

## 17. Privacy and Security
- **No Hardcoded Keys**: The project source contains zero API keys.
- **Local Proxying**: When using the local Python server, the API key is forwarded directly to `generativelanguage.googleapis.com` via HTTPS. The server does not store, log, or persist keys to disk.
- **Session vs. LocalStorage**: Keys entered in the web UI are stored in volatile JavaScript memory by default. They are only saved to browser `localStorage` if the user explicitly checks *"Remember on this device"*.
- **No External Analytics**: No third-party tracking, analytics, or external telemetry libraries are included.

---

## 18. Future Improvements (Ideas for Further Learning)
Realistic extensions that could be added in future coursework:
- [ ] **Export to Markdown / JSON**: Allow downloading a prompt comparison experiment report as a formatted file.
- [ ] **Prompt History**: Save previous comparison runs locally in the browser so students can track prompt iterations over time.
- [ ] **Temperature & Parameter Slider**: Add explicit controls for `temperature`, `top_p`, and `top_k` to observe how model sampling randomness affects prompt consistency.
- [ ] **Additional Prompt Patterns**: Implement Chain-of-Density and Metacognitive Prompting techniques.

---

## 19. Credits and Learning Context
- **Course**: Artificial Intelligence
- **Year & Semester**: First Year, First Semester
- **Activity**: Co-Curricular Activity (CCA) Student Project
- **Model Evaluated**: Google Gemini API (`gemini-3.1-flash-lite`)
- **Author**: Student learning project by riteshmachal
