/**
 * Prompt Engineering Studio - Frontend Application Logic
 * ========================================================
 * Implements prompt engineering techniques, state management,
 * Gemini API comparison execution, and heuristic diagnostics.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------------------
  const state = {
    apiKey: '',
    rememberKey: false,
    selectedModel: 'gemini-3.5-flash-lite',
    availableModels: [
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', recommended: true },
      { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite Latest', recommended: false },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', recommended: false },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', recommended: false },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', recommended: false },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', recommended: false }
    ],
    originalPrompt: '',
    options: {
      audience: '',
      context: '',
      tone: '',
      length: '',
      format: '',
      role: '',
      fewShot: ''
    },
    selectedTechniques: new Set(['clear_task', 'role', 'constraints']),
    enhancedPrompts: [],
    comparisonResults: [],
    isRunningComparison: false,
    battle: {
      promptA: '',
      promptB: '',
      isRunning: false,
      resultA: null,
      resultB: null,
      verdict: '',
      explanation: ''
    }
  };

  // Preset Sample Data
  const SAMPLES = {
    climate: {
      prompt: 'Explain climate change to a 12-year-old in under 100 words.',
      audience: 'A 12-year-old middle school student',
      context: 'Preparing for a 5-minute science class presentation',
      tone: 'Friendly, encouraging, and engaging',
      length: 'Under 100 words',
      format: 'Bullet points with bold topic headers',
      role: 'A friendly science teacher and passionate educator',
      fewShot: '• The Big Idea: Earth has an invisible atmospheric blanket trapping heat.\n• The Problem: Burning coal and oil adds extra blankets, making Earth too warm.\n• The Action: Switching to clean energy like solar helps cool our planet.'
    },
    invoice: {
      prompt: 'Write a polite follow-up email to a client whose invoice #1042 is 14 days overdue.',
      audience: 'Finance manager at a long-term corporate client',
      context: 'We have a great working relationship, but payment is two weeks late',
      tone: 'Professional, clear, and executive',
      length: 'Under 150 words',
      format: 'Executive summary followed by key action items',
      role: 'Senior accounts receivable specialist',
      fewShot: 'Subject: Friendly Follow-Up: Invoice #1042\n\nDear Alex,\nI hope your week is going well. This is a gentle reminder that Invoice #1042 ($2,400) was due on Nov 8. Please let us know if you need another copy of the invoice.'
    },
    python: {
      prompt: 'Review this Python function and explain why it is slow for large lists: def find_dupes(nums): return [x for x in nums if nums.count(x) > 1]',
      audience: 'Junior Python developer learning algorithmic efficiency',
      context: 'Code review for a high-volume data pipeline',
      tone: 'Simple, direct, and jargon-free',
      length: '2 concise paragraphs',
      format: 'Numbered step-by-step sequence',
      role: 'Senior Python software architect',
      fewShot: '1. Root Cause: nums.count(x) scans the entire list for every item, creating O(N²) time complexity.\n2. Solution: Use a Python set or collections.Counter to check duplicates in O(N) linear time.'
    }
  };

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const dom = {
    // Header & Global
    apiStatusDot: document.getElementById('api-status-dot'),
    apiStatusText: document.getElementById('api-status-text'),
    btnOpenApiModal: document.getElementById('btn-open-api-modal'),
    btnResetSession: document.getElementById('btn-reset-session'),
    toastContainer: document.getElementById('toast-container'),

    // Guide
    btnToggleGuide: document.getElementById('btn-toggle-guide'),
    guideContent: document.getElementById('guide-content'),
    guideToggleText: document.getElementById('guide-toggle-text'),
    guideToggleIcon: document.getElementById('guide-toggle-icon'),

    // Stepper
    stepperItems: document.querySelectorAll('.stepper-item'),

    // Stage 1
    originalPromptInput: document.getElementById('original-prompt-input'),
    originalPromptCounter: document.getElementById('original-prompt-counter'),
    promptValidationMsg: document.getElementById('prompt-validation-msg'),
    btnToggleOptions: document.getElementById('btn-toggle-options'),
    optionalFieldsContainer: document.getElementById('optional-fields-container'),
    optAudience: document.getElementById('opt-audience'),
    optContext: document.getElementById('opt-context'),
    optTone: document.getElementById('opt-tone'),
    optLength: document.getElementById('opt-length'),
    optFormat: document.getElementById('opt-format'),
    optRole: document.getElementById('opt-role'),
    optFewShot: document.getElementById('opt-fewshot'),
    btnInsertSampleFewShot: document.getElementById('btn-insert-sample-fewshot'),
    stage1Summary: document.getElementById('stage-1-summary'),
    btnGoToStage2: document.getElementById('btn-go-to-stage-2'),
    sampleButtons: document.querySelectorAll('[data-sample]'),

    // Stage 2
    techCheckboxes: document.querySelectorAll('.tech-checkbox'),
    techValidationMsg: document.getElementById('tech-validation-msg'),
    techSelectionCount: document.getElementById('tech-selection-count'),
    btnSelectAllTech: document.getElementById('btn-select-all-tech'),
    btnSelectRecommendedTech: document.getElementById('btn-select-recommended-tech'),
    btnClearTech: document.getElementById('btn-clear-tech'),
    btnEnhancePrompts: document.getElementById('btn-enhance-prompts'),
    btnEnhanceText: document.getElementById('btn-enhance-text'),

    // Stage 3
    enhancedEmptyState: document.getElementById('enhanced-empty-state'),
    enhancedCardsContainer: document.getElementById('enhanced-cards-container'),
    enhancedActiveCounter: document.getElementById('enhanced-active-counter'),
    enhancedCardsList: document.getElementById('enhanced-cards-list'),
    btnCheckAllComparison: document.getElementById('btn-check-all-comparison'),
    btnUncheckAllComparison: document.getElementById('btn-uncheck-all-comparison'),
    btnGoToComparison: document.getElementById('btn-go-to-comparison'),
    comparisonReadyNote: document.getElementById('comparison-ready-note'),

    // Stage 4
    stage4ModelSelect: document.getElementById('stage4-model-select'),
    activeModelDisplay: document.getElementById('active-model-display'),
    btnRunComparison: document.getElementById('btn-run-comparison'),
    btnRunComparisonText: document.getElementById('btn-run-comparison-text'),
    missingKeyBanner: document.getElementById('missing-key-banner'),
    btnPromptEnterKey: document.getElementById('btn-prompt-enter-key'),
    comparisonProgressWrap: document.getElementById('comparison-progress-wrap'),
    comparisonProgressBar: document.getElementById('comparison-progress-bar'),
    comparisonProgressText: document.getElementById('comparison-progress-text'),
    comparisonEmptyState: document.getElementById('comparison-empty-state'),
    comparisonResultsGrid: document.getElementById('comparison-results-grid'),
    observableDifferencesPanel: document.getElementById('observable-differences-panel'),
    differencesTbody: document.getElementById('differences-tbody'),
    learningsContent: document.getElementById('learnings-content'),

    // Stage 5: Prompt Battle
    battleModelSelect: document.getElementById('battle-model-select'),
    battlePromptAInput: document.getElementById('battle-prompt-a-input'),
    battlePromptBInput: document.getElementById('battle-prompt-b-input'),
    battleCounterA: document.getElementById('battle-counter-a'),
    battleCounterB: document.getElementById('battle-counter-b'),
    battleSourceA: document.getElementById('battle-prompt-a-source-label'),
    battleSourceB: document.getElementById('battle-prompt-b-source-label'),
    btnBattleLoadStudio: document.getElementById('btn-battle-load-studio'),
    btnBattleSampleClimate: document.getElementById('btn-battle-sample-climate'),
    btnBattleSampleCode: document.getElementById('btn-battle-sample-code'),
    btnBattleSwap: document.getElementById('btn-battle-swap'),
    btnBattleLoadOriginalA: document.getElementById('btn-battle-load-original-a'),
    battleLoadEnhancedSelect: document.getElementById('battle-load-enhanced-select'),
    btnStartBattle: document.getElementById('btn-start-battle'),
    btnStartBattleText: document.getElementById('btn-start-battle-text'),
    battleMissingKeyBanner: document.getElementById('battle-missing-key-banner'),
    btnBattleEnterKey: document.getElementById('btn-battle-enter-key'),
    battleValidationMsg: document.getElementById('battle-validation-msg'),
    battleProgressWrap: document.getElementById('battle-progress-wrap'),
    battleProgressBar: document.getElementById('battle-progress-bar'),
    battleProgressText: document.getElementById('battle-progress-text'),
    battleEmptyState: document.getElementById('battle-empty-state'),
    battleResultsGrid: document.getElementById('battle-results-grid'),
    battleRespCardA: document.getElementById('battle-response-card-a'),
    battleRespCardB: document.getElementById('battle-response-card-b'),
    battleRespModelA: document.getElementById('battle-resp-model-a'),
    battleRespModelB: document.getElementById('battle-resp-model-b'),
    battleRespDurationA: document.getElementById('battle-resp-duration-a'),
    battleRespDurationB: document.getElementById('battle-resp-duration-b'),
    battleRespTokensA: document.getElementById('battle-resp-tokens-a'),
    battleRespTokensB: document.getElementById('battle-resp-tokens-b'),
    battleSnapshotA: document.getElementById('battle-snapshot-a'),
    battleSnapshotB: document.getElementById('battle-snapshot-b'),
    battleRespBodyA: document.getElementById('battle-resp-body-a'),
    battleRespBodyB: document.getElementById('battle-resp-body-b'),
    btnCopyBattleA: document.getElementById('btn-copy-battle-a'),
    btnCopyBattleB: document.getElementById('btn-copy-battle-b'),
    battleJudgementPanel: document.getElementById('battle-judgement-panel'),
    battleVerdictRadios: document.querySelectorAll('input[name="battle-verdict"]'),
    battleExplanationInput: document.getElementById('battle-explanation-input'),
    btnSaveVerdict: document.getElementById('btn-save-verdict'),
    battleVerdictSummary: document.getElementById('battle-verdict-summary'),

    // Modals
    apiKeyModal: document.getElementById('api-key-modal'),
    geminiApiKeyInput: document.getElementById('gemini-api-key-input'),
    btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
    eyeIcon: document.getElementById('eye-icon'),
    geminiModelSelect: document.getElementById('gemini-model-select'),
    chkRememberKey: document.getElementById('chk-remember-key'),
    keyValidationFeedback: document.getElementById('key-validation-feedback'),
    btnSaveKey: document.getElementById('btn-save-key'),
    btnRemoveKey: document.getElementById('btn-remove-key'),
    btnCancelApiModal: document.getElementById('btn-cancel-api-modal'),
    btnCloseApiModal: document.getElementById('btn-close-api-modal'),

    confirmRemoveModal: document.getElementById('confirm-remove-modal'),
    btnConfirmRemoveKey: document.getElementById('btn-confirm-remove-key'),
    btnCancelRemoveKey: document.getElementById('btn-cancel-remove-key'),
    btnCloseRemoveModal: document.getElementById('btn-close-remove-modal'),

    resetConfirmModal: document.getElementById('reset-confirm-modal'),
    chkResetAlsoRemoveKey: document.getElementById('chk-reset-also-remove-key'),
    btnConfirmReset: document.getElementById('btn-confirm-reset'),
    btnCancelReset: document.getElementById('btn-cancel-reset'),
    btnCloseResetModal: document.getElementById('btn-close-reset-modal')
  };

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  function init() {
    loadSavedSettings();
    updateApiStatusDisplay();
    attachEventListeners();
    updateCharCounter();
    updateTechSelectionCount();
    updateBattleCounters();

    // Check if server provides default config and live models
    checkServerConfig();
    fetchAvailableModels(state.apiKey);
  }

  function populateModelSelectors(models) {
    if (!models || !models.length) return;
    state.availableModels = models;
    const selects = [dom.stage4ModelSelect, dom.battleModelSelect, dom.geminiModelSelect];
    selects.forEach(sel => {
      if (!sel) return;
      const prevVal = sel.value || state.selectedModel;
      sel.innerHTML = '';
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.id})${m.recommended ? ' — Recommended' : ''}`;
        if (m.id === prevVal) opt.selected = true;
        sel.appendChild(opt);
      });
      if (state.selectedModel) {
        sel.value = state.selectedModel;
      }
    });
  }

  function syncSelectedModel(newModel, showToastNotification = false) {
    if (!newModel || typeof newModel !== 'string') return;
    const clean = newModel.trim();
    state.selectedModel = clean;

    if (dom.stage4ModelSelect) dom.stage4ModelSelect.value = clean;
    if (dom.battleModelSelect) dom.battleModelSelect.value = clean;
    if (dom.geminiModelSelect) dom.geminiModelSelect.value = clean;
    if (dom.activeModelDisplay) dom.activeModelDisplay.textContent = `Model: ${clean}`;
    if (dom.battleRespModelA) dom.battleRespModelA.textContent = clean;
    if (dom.battleRespModelB) dom.battleRespModelB.textContent = clean;

    try {
      localStorage.setItem('pes_selected_model', clean);
    } catch (e) {}

    if (showToastNotification) {
      showToast(`Active Gemini model set to: ${clean}`, 'info', 2200);
    }
  }

  async function fetchAvailableModels(apiKey) {
    try {
      const headers = {};
      const keyToUse = apiKey || state.apiKey;
      if (keyToUse) headers['x-goog-api-key'] = keyToUse.trim();
      const res = await fetch('/api/gemini/models', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length) {
          populateModelSelectors(data.models);
          if (data.default_model && !state.selectedModel) {
            syncSelectedModel(data.default_model);
          }
          return;
        }
      }
    } catch (e) {}

    // Fallback to /api/config
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length) {
          populateModelSelectors(data.models);
          if (data.default_model && !state.selectedModel) {
            syncSelectedModel(data.default_model);
          }
        }
      }
    } catch (e) {}
  }

  function loadSavedSettings() {
    try {
      const remembered = localStorage.getItem('pes_remember_key') === 'true';
      state.rememberKey = remembered;
      dom.chkRememberKey.checked = remembered;

      if (remembered) {
        const savedKey = localStorage.getItem('pes_api_key');
        if (savedKey) {
          state.apiKey = savedKey;
          dom.geminiApiKeyInput.value = savedKey;
        }
      }

      // Check saved model preference
      const savedModel = localStorage.getItem('pes_selected_model');
      if (savedModel && savedModel !== 'gemini-3.1-flash-lite') {
        state.selectedModel = savedModel;
      } else {
        state.selectedModel = 'gemini-3.5-flash-lite';
        try { localStorage.setItem('pes_selected_model', 'gemini-3.5-flash-lite'); } catch (e) {}
      }

      populateModelSelectors(state.availableModels);
      syncSelectedModel(state.selectedModel, false);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  }

  async function checkServerConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length) {
          populateModelSelectors(data.models);
        }
        if (data.default_model && (!state.selectedModel || state.selectedModel === 'gemini-3.1-flash-lite')) {
          syncSelectedModel(data.default_model);
        }
        if (data.has_server_key && !state.apiKey) {
          dom.apiStatusDot.className = 'status-dot dot-active';
          dom.apiStatusText.textContent = 'Server Key Active';
        }
      }
    } catch (e) {}
  }

  function updateApiStatusDisplay() {
    if (state.apiKey && state.apiKey.trim()) {
      dom.apiStatusDot.className = 'status-dot dot-active';
      const masked = `${state.apiKey.substring(0, 6)}••••${state.apiKey.substring(state.apiKey.length - 4)}`;
      dom.apiStatusText.textContent = `Key: ${masked}`;
      dom.btnRemoveKey.classList.remove('hidden');
      dom.missingKeyBanner.classList.add('hidden');
      if (dom.battleMissingKeyBanner) dom.battleMissingKeyBanner.classList.add('hidden');
    } else {
      dom.apiStatusDot.className = 'status-dot dot-inactive';
      dom.apiStatusText.textContent = 'No API Key Saved';
      dom.btnRemoveKey.classList.add('hidden');
    }
    if (dom.activeModelDisplay) dom.activeModelDisplay.textContent = `Model: ${state.selectedModel}`;
    if (dom.stage4ModelSelect) dom.stage4ModelSelect.value = state.selectedModel;
    if (dom.battleModelSelect) dom.battleModelSelect.value = state.selectedModel;
    if (dom.geminiModelSelect) dom.geminiModelSelect.value = state.selectedModel;
  }

  // -------------------------------------------------------------------------
  // Notifications & Modals
  // -------------------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function openModal(modalEl) {
    modalEl.classList.remove('hidden');
    const firstInput = modalEl.querySelector('input:not([type="checkbox"]), select, button');
    if (firstInput) firstInput.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // -------------------------------------------------------------------------
  // API Key Management
  // -------------------------------------------------------------------------
  function validateApiKey(key) {
    if (!key || !key.trim()) {
      return { valid: false, message: 'API key cannot be empty. Please enter your Gemini API key.' };
    }
    const cleanKey = key.trim();
    if (cleanKey.length < 15) {
      return { valid: false, message: 'API key appears too short. Please verify your Gemini API key.' };
    }
    return { valid: true, message: 'Key format is valid.' };
  }

  function handleSaveKey() {
    const rawKey = dom.geminiApiKeyInput.value.trim();
    const validation = validateApiKey(rawKey);

    dom.keyValidationFeedback.classList.remove('hidden');
    if (!validation.valid) {
      dom.keyValidationFeedback.className = 'validation-msg error-msg';
      dom.keyValidationFeedback.textContent = validation.message;
      return;
    }

    state.apiKey = rawKey;
    state.rememberKey = dom.chkRememberKey.checked;
    const chosenModel = dom.geminiModelSelect.value || state.selectedModel;

    try {
      localStorage.setItem('pes_remember_key', state.rememberKey ? 'true' : 'false');
      localStorage.setItem('pes_selected_model', chosenModel);
      if (state.rememberKey) {
        localStorage.setItem('pes_api_key', state.apiKey);
      } else {
        localStorage.removeItem('pes_api_key');
      }
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }

    syncSelectedModel(chosenModel);
    fetchAvailableModels(state.apiKey);

    dom.keyValidationFeedback.className = 'validation-msg success-msg';
    dom.keyValidationFeedback.textContent = 'API key saved successfully!';

    updateApiStatusDisplay();
    showToast('Gemini API key saved for this session.', 'success');

    setTimeout(() => {
      closeModal(dom.apiKeyModal);
      dom.keyValidationFeedback.classList.add('hidden');
    }, 600);
  }

  function handleConfirmRemoveKey() {
    state.apiKey = '';
    dom.geminiApiKeyInput.value = '';
    try {
      localStorage.removeItem('pes_api_key');
    } catch (e) {}

    updateApiStatusDisplay();
    closeModal(dom.confirmRemoveModal);
    closeModal(dom.apiKeyModal);
    showToast('API key removed from this session.', 'info');
  }

  // -------------------------------------------------------------------------
  // Technique Enhancement Generators (Pure Templates, Zero Quota Consumed)
  // -------------------------------------------------------------------------
  function buildClearTaskPrompt(original, options) {
    const lines = [
      `[TASK SPECIFICATION]`,
      `Your task is to: ${original.trim()}`,
      ``,
      `[CORE DIRECTIVES]`,
      `1. Focus directly on the primary question or objective.`,
      `2. Explain the concept with clear, unambiguous terminology.`,
      `3. Maintain strict coherence without tangential digressions.`
    ];

    const changes = [
      'Added an explicit [TASK SPECIFICATION] block to anchor prompt primacy.',
      'Reframed the user request into active, direct directives.',
      'Added clarity constraints to prevent rambling and ambiguity.'
    ];

    return { prompt: lines.join('\n'), changes, missing: null };
  }

  function buildRoleBasedPrompt(original, options) {
    const role = options.role.trim() || 'a friendly science teacher and patient educator';
    const lines = [
      `[ROLE & PERSONA]`,
      `Act as ${role}. Communicate with authoritative domain expertise, warmth, and an engaging teaching style suited to curious learners.`,
      ``,
      `[TASK]`,
      `${original.trim()}`,
      ``,
      `[PEDAGOGICAL GUIDELINES]`,
      `- Maintain the chosen persona consistently throughout the explanation.`,
      `- Use accessible, relatable analogies to illuminate complex ideas.`,
      `- Keep the tone encouraging, respectful, and crystal-clear.`
    ];

    const changes = [
      `Assigned domain expert persona: "${role}".`,
      `Framed voice, empathy, and pedagogical tone to match the chosen role.`,
      `Preserved the original request within the persona context.`
    ];

    return { prompt: lines.join('\n'), changes, missing: null };
  }

  function buildContextAudiencePrompt(original, options) {
    const audience = options.audience.trim();
    const context = options.context.trim();
    const missing = [];

    const audienceVal = audience || '[Specify target audience, e.g., 12-year-old student]';
    const contextVal = context || '[Specify background context, e.g., 5-minute science class presentation]';

    if (!audience) missing.push('Audience');
    if (!context) missing.push('Background Context');

    const lines = [
      `[TARGET AUDIENCE PROFILE]`,
      `Audience: ${audienceVal}`,
      ``,
      `[SITUATIONAL CONTEXT]`,
      `Context: ${contextVal}`,
      ``,
      `[TASK]`,
      `${original.trim()}`,
      ``,
      `[CALIBRATION GUIDELINES]`,
      `- Calibrate vocabulary, sentence length, and conceptual depth specifically for ${audienceVal}.`,
      `- Tailor the focus to be directly applicable for: ${contextVal}.`,
      `- Do not make unsupported factual assumptions beyond the provided context.`
    ];

    const changes = [
      `Embedded targeted [TARGET AUDIENCE PROFILE] (${audience || 'placeholder added'}).`,
      `Embedded situational background (${context || 'placeholder added'}).`,
      `Instructed model to adjust cognitive depth without hallucinating unrequested facts.`
    ];

    return { prompt: lines.join('\n'), changes, missing: missing.length ? missing : null };
  }

  function buildConstraintsPrompt(original, options) {
    const lengthVal = options.length.trim() || 'Under 100 words';
    const toneVal = options.tone.trim() || 'Clear, objective, and engaging';

    const lines = [
      `[PRIMARY TASK]`,
      `${original.trim()}`,
      ``,
      `[STRICT CONSTRAINTS & GUARDRAILS]`,
      `- Length limit: ${lengthVal}. Strictly adhere to this boundary.`,
      `- Tone requirement: ${toneVal}.`,
      `- Negative constraints: Do NOT include conversational filler, pleasantries (such as "Certainly!" or "Here is..."), or unprompted disclaimers.`,
      `- Content focus: Deliver the substantive answer directly with zero introductory chatter.`
    ];

    const changes = [
      `Enforced explicit length limit: "${lengthVal}".`,
      `Enforced tone requirement: "${toneVal}".`,
      `Added negative guardrails suppressing conversational filler and preambles.`
    ];

    return { prompt: lines.join('\n'), changes, missing: null };
  }

  function buildStepByStepPrompt(original, options) {
    const lines = [
      `[TASK]`,
      `${original.trim()}`,
      ``,
      `[STRUCTURED STEP-BY-STEP PROGRESSION]`,
      `Break down the answer into a progressive sequence of 4 clearly numbered steps:`,
      `Step 1: Foundational Concept — Define the core phenomenon in one plain sentence.`,
      `Step 2: Underlying Mechanism — Explain how and why it happens using a simple cause-and-effect chain.`,
      `Step 3: Real-World Impact — Share a tangible, observable example or consequence.`,
      `Step 4: Key Takeaway — Summarize the most important insight to remember.`,
      ``,
      `Ensure each step is self-contained, concise, and builds naturally upon the previous step.`
    ];

    const changes = [
      'Organized response into a 4-step progressive sequence (Concept -> Mechanism -> Impact -> Takeaway).',
      'Provides ordered guidance so the response is easy to follow without requesting hidden chain-of-thought tokens.',
      'Eliminates unguided stream-of-consciousness text.'
    ];

    return { prompt: lines.join('\n'), changes, missing: null };
  }

  function buildFewShotPrompt(original, options) {
    const fewShot = options.fewShot.trim();
    const missing = fewShot ? null : ['Few-Shot Example Demonstration'];

    const demonstration = fewShot || '[Add your demonstration example here or click "Insert sample example" in Stage 1]';

    const lines = [
      `[TASK OBJECTIVE]`,
      `${original.trim()}`,
      ``,
      `[DESIRED STYLE DEMONSTRATION]`,
      `Model your response strictly after the style, formatting, and density shown in this demonstration:`,
      `--- EXAMPLE DEMONSTRATION START ---`,
      `${demonstration}`,
      `--- EXAMPLE DEMONSTRATION END ---`,
      ``,
      `[INSTRUCTIONS]`,
      `Now complete the task above using the exact structural pattern, tone, and conciseness demonstrated in the example.`
    ];

    const changes = [
      'Injected an in-context demonstration example to guide output styling.',
      'Instructed the model to mimic the demonstration format and conciseness.',
      'Uses pattern recognition to enforce high-fidelity output.'
    ];

    return { prompt: lines.join('\n'), changes, missing };
  }

  function buildStructuredOutputPrompt(original, options) {
    const formatVal = options.format.trim() || 'Bullet points with bold topic headers';

    const lines = [
      `[TASK]`,
      `${original.trim()}`,
      ``,
      `[OUTPUT FORMAT SPECIFICATION]`,
      `Format the entire response strictly as: ${formatVal}`,
      ``,
      `Formatting Rules:`,
      `- Use consistent markdown tags, bullet indentation, or schema structure as requested.`,
      `- Do not include conversational wrapper text before or after the formatted response.`,
      `- Deliver the structured content directly.`
    ];

    const changes = [
      `Enforced explicit layout structure: "${formatVal}".`,
      `Restricted meta-commentary and conversational preambles.`,
      `Guarantees clean, scannable presentation.`
    ];

    return { prompt: lines.join('\n'), changes, missing: null };
  }

  function buildCombinedPrompt(original, options) {
    const roleVal = options.role.trim() || 'an expert educator and clear communicator';
    const audienceVal = options.audience.trim() || 'a general audience seeking clear understanding';
    const lengthVal = options.length.trim() || 'concise and under 120 words';
    const formatVal = options.format.trim() || 'Bullet points with bold headers';

    const lines = [
      `[ROLE & PERSONA]`,
      `Act as ${roleVal}. Explain with authoritative domain expertise, warmth, and exceptional clarity.`,
      ``,
      `[AUDIENCE & CONTEXT]`,
      `Target Audience: ${audienceVal}`,
      options.context.trim() ? `Background: ${options.context.trim()}` : null,
      ``,
      `[CORE TASK]`,
      `${original.trim()}`,
      ``,
      `[EXECUTION CONSTRAINTS]`,
      `- Length limit: ${lengthVal}.`,
      `- Formatting: ${formatVal}.`,
      `- Style: No filler phrases, no pleasantries, no conversational padding.`,
      `- Step Progression: Ensure ideas progress logically from foundational concept to tangible takeaway.`
    ].filter(Boolean);

    const changes = [
      `Combined Role Persona ("${roleVal}") with Target Audience framing.`,
      `Enforced strict length constraint ("${lengthVal}") and format specification ("${formatVal}").`,
      `Applied negative guardrails suppressing filler words and pleasantries.`
    ];

    return { prompt: lines.join('\n'), changes, missing: null };
  }

  // -------------------------------------------------------------------------
  // Enhancement Generation Controller
  // -------------------------------------------------------------------------
  const TECHNIQUE_DEFINITIONS = {
    clear_task: {
      name: 'Clear Task',
      badge: 'Core',
      badgeClass: 'badge-emerald',
      desc: 'Makes the requested action direct, specific, and explicit upfront while preserving original meaning.',
      generator: buildClearTaskPrompt
    },
    role: {
      name: 'Role-based',
      badge: 'Persona',
      badgeClass: 'badge-indigo',
      desc: 'Frames the perspective, voice, and pedagogical approach from a domain expert persona.',
      generator: buildRoleBasedPrompt
    },
    audience: {
      name: 'Context & Audience',
      badge: 'Targeted',
      badgeClass: 'badge-amber',
      desc: 'Calibrates vocabulary and conceptual depth for your designated audience without unverified facts.',
      generator: buildContextAudiencePrompt
    },
    constraints: {
      name: 'Constraints & Guardrails',
      badge: 'Control',
      badgeClass: 'badge-rose',
      desc: 'Enforces length limits, tone requirements, and eliminates conversational filler.',
      generator: buildConstraintsPrompt
    },
    step_by_step: {
      name: 'Step-by-Step Guidance',
      badge: 'Logic',
      badgeClass: 'badge-cyan',
      desc: 'Breaks complex explanations into an ordered sequence of progressive steps.',
      generator: buildStepByStepPrompt
    },
    few_shot: {
      name: 'Few-Shot Example',
      badge: 'In-Context',
      badgeClass: 'badge-purple',
      desc: 'Guides the model by demonstrating the exact style, formatting, and density expected.',
      generator: buildFewShotPrompt
    },
    structured: {
      name: 'Structured Output',
      badge: 'Layout',
      badgeClass: 'badge-blue',
      desc: 'Enforces structured presentation such as bullets, comparative tables, or JSON.',
      generator: buildStructuredOutputPrompt
    },
    combined: {
      name: 'Combined All-in-One',
      badge: 'Master Prompt',
      badgeClass: 'badge-gold',
      desc: 'Synthesizes all selected techniques into a cohesive, production-grade master prompt.',
      generator: buildCombinedPrompt
    }
  };

  function readInputs() {
    state.originalPrompt = dom.originalPromptInput.value.trim();
    state.options.audience = dom.optAudience.value.trim();
    state.options.context = dom.optContext.value.trim();
    state.options.tone = dom.optTone.value;
    state.options.length = dom.optLength.value.trim();
    state.options.format = dom.optFormat.value;
    state.options.role = dom.optRole.value.trim();
    state.options.fewShot = dom.optFewShot.value.trim();
  }

  function handleEnhancePrompts() {
    readInputs();

    // Validation: Original prompt cannot be blank
    dom.promptValidationMsg.classList.add('hidden');
    dom.techValidationMsg.classList.add('hidden');

    if (!state.originalPrompt) {
      dom.promptValidationMsg.textContent = 'Please enter an original prompt before enhancing. Type a task or click one of the quick samples above.';
      dom.promptValidationMsg.classList.remove('hidden');
      dom.originalPromptInput.focus();
      return;
    }

    if (state.selectedTechniques.size === 0) {
      dom.techValidationMsg.textContent = 'Please select at least one prompt-engineering technique to generate enhanced versions.';
      dom.techValidationMsg.classList.remove('hidden');
      return;
    }

    // Build enhanced prompts for each selected technique
    state.enhancedPrompts = [];

    for (const techKey of state.selectedTechniques) {
      const def = TECHNIQUE_DEFINITIONS[techKey];
      if (!def) continue;

      const generated = def.generator(state.originalPrompt, state.options);
      state.enhancedPrompts.push({
        id: techKey,
        name: def.name,
        badge: def.badge,
        badgeClass: def.badgeClass,
        desc: def.desc,
        generatedPrompt: generated.prompt,
        currentPrompt: generated.prompt,
        whatChanged: generated.changes,
        missingFields: generated.missing,
        includeInComparison: true
      });
    }

    renderEnhancedCards();
    showToast(`Generated ${state.enhancedPrompts.length} enhanced prompt variations.`, 'success');

    // Scroll to Stage 3
    document.getElementById('stage-3').scrollIntoView({ behavior: 'smooth' });
    updateStepper(3);
  }

  function renderEnhancedCards() {
    if (state.enhancedPrompts.length === 0) {
      dom.enhancedEmptyState.classList.remove('hidden');
      dom.enhancedCardsContainer.classList.add('hidden');
      return;
    }

    dom.enhancedEmptyState.classList.add('hidden');
    dom.enhancedCardsContainer.classList.remove('hidden');
    dom.enhancedActiveCounter.textContent = `Showing ${state.enhancedPrompts.length} enhanced prompt${state.enhancedPrompts.length > 1 ? 's' : ''}`;

    dom.enhancedCardsList.innerHTML = '';

    state.enhancedPrompts.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `enhanced-card ${item.includeInComparison ? '' : 'excluded-from-comparison'}`;
      card.id = `enhanced-card-${item.id}`;

      // Missing fields warning banner if any
      let missingWarningHtml = '';
      if (item.missingFields && item.missingFields.length > 0) {
        missingWarningHtml = `
          <div class="missing-field-alert" role="alert">
            <span><strong>Missing Details:</strong> This technique requires ${escapeHtml(item.missingFields.join(' and '))}. Placeholder tags were inserted.</span>
            <button type="button" class="btn btn-dark btn-xs btn-jump-to-option" data-field="${escapeHtml(item.missingFields[0])}">
              Add in Stage 1
            </button>
          </div>
        `;
      }

      const whatChangedHtml = item.whatChanged.map(change => `<li>${escapeHtml(change)}</li>`).join('');

      card.innerHTML = `
        <div class="enhanced-card-header">
          <div class="enhanced-card-title-wrap">
            <span class="badge ${item.badgeClass}">${item.badge}</span>
            <h3 class="enhanced-card-title">${escapeHtml(item.name)}</h3>
          </div>
          <div class="enhanced-card-controls">
            <label class="include-toggle-label" title="Toggle inclusion in comparison">
              <input type="checkbox" class="chk-include-comparison" data-tech="${item.id}" ${item.includeInComparison ? 'checked' : ''}>
              <span>Include in Gemini comparison</span>
            </label>
          </div>
        </div>

        <p class="enhanced-card-desc">${escapeHtml(item.desc)}</p>

        ${missingWarningHtml}

        <div class="enhanced-prompt-editor-wrap">
          <div class="label-row">
            <label for="prompt-editor-${item.id}" class="form-label">Enhanced Prompt (Editable)</label>
            <span class="char-counter" id="counter-${item.id}">
              ${countWords(item.currentPrompt)} words | ${item.currentPrompt.length} chars
            </span>
          </div>
          <textarea
            id="prompt-editor-${item.id}"
            class="form-control enhanced-textarea"
            rows="6"
            data-tech="${item.id}"
          >${escapeHtml(item.currentPrompt)}</textarea>
          <div class="editor-footer">
            <span class="input-subhint">You can freely edit this prompt before testing it with Gemini.</span>
            <div class="editor-actions">
              <button type="button" class="btn btn-ghost btn-xs btn-reset-card-prompt" data-tech="${item.id}">
                Reset prompt
              </button>
              <button type="button" class="btn btn-ghost btn-xs btn-copy-card-prompt" data-tech="${item.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy
              </button>
            </div>
          </div>
        </div>

        <div class="what-changed-card">
          <div class="what-changed-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            What changed and why:
          </div>
          <ul class="what-changed-list">
            ${whatChangedHtml}
          </ul>
        </div>
      `;

      dom.enhancedCardsList.appendChild(card);
    });

    updateComparisonReadyNote();
    updateBattleEnhancedDropdown();
  }

  function updateComparisonReadyNote() {
    const included = state.enhancedPrompts.filter(p => p.includeInComparison).length;
    dom.comparisonReadyNote.textContent = `${included} enhanced prompt${included !== 1 ? 's' : ''} selected for comparison.`;
    updateBattleEnhancedDropdown();
  }

  // -------------------------------------------------------------------------
  // Gemini API Execution & Comparison Flow
  // -------------------------------------------------------------------------
  async function runGeminiComparison() {
    readInputs();

    if (!state.originalPrompt) {
      showToast('Please enter an original prompt first.', 'error');
      document.getElementById('stage-1').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Check API Key
    if (!state.apiKey) {
      dom.missingKeyBanner.classList.remove('hidden');
      openModal(dom.apiKeyModal);
      showToast('A Gemini API key is required to send requests to Google Gemini.', 'error');
      return;
    }

    if (state.isRunningComparison) return;

    // Determine which prompts to send based on user selection
    const runMode = document.querySelector('input[name="comparison-mode"]:checked')?.value || 'both';
    const queue = [];

    if (runMode === 'both' || runMode === 'original_only') {
      queue.push({
        id: 'original',
        label: 'Original Prompt',
        techniqueName: 'Raw Input',
        badgeClass: 'badge-indigo',
        prompt: state.originalPrompt
      });
    }

    if (runMode === 'both' || runMode === 'enhanced_only') {
      const activeEnhanced = state.enhancedPrompts.filter(p => p.includeInComparison);
      if (activeEnhanced.length === 0 && runMode === 'enhanced_only') {
        showToast('No enhanced prompts are currently selected for comparison.', 'error');
        return;
      }
      activeEnhanced.forEach(p => {
        queue.push({
          id: p.id,
          label: p.name,
          techniqueName: p.name,
          badgeClass: p.badgeClass,
          prompt: p.currentPrompt
        });
      });
    }

    if (queue.length === 0) {
      showToast('Please select at least one prompt to test.', 'error');
      return;
    }

    const modelToUse = (dom.stage4ModelSelect?.value || state.selectedModel || 'gemini-3.5-flash-lite').trim();
    syncSelectedModel(modelToUse);

    // Start comparison execution
    state.isRunningComparison = true;
    dom.btnRunComparison.disabled = true;
    dom.btnRunComparisonText.textContent = 'Calling Gemini...';
    dom.comparisonEmptyState.classList.add('hidden');
    dom.comparisonResultsGrid.classList.remove('hidden');
    dom.comparisonProgressWrap.classList.remove('hidden');
    dom.observableDifferencesPanel.classList.add('hidden');

    updateProgress(10, `Preparing ${queue.length} prompt request${queue.length > 1 ? 's' : ''}...`);

    // Prepare UI cards in "Generating" state
    dom.comparisonResultsGrid.innerHTML = '';
    state.comparisonResults = queue.map(item => ({
      ...item,
      status: 'generating',
      response: '',
      duration_ms: 0,
      usage: null,
      error: null
    }));

    state.comparisonResults.forEach(item => {
      renderResultCard(item);
    });

    let completedCount = 0;

    // Send independent requests in parallel
    const promises = queue.map(async (item, idx) => {
      try {
        const onRetry = (attempt, maxAttempts) => {
          const statusBadge = document.getElementById(`status-${item.id}`);
          if (statusBadge) {
            statusBadge.className = 'result-status-badge status-generating';
            statusBadge.innerHTML = `<span class="spinner-sm"></span><span>Retrying (${attempt}/${maxAttempts})...</span>`;
          }
          dom.comparisonProgressText.textContent = `Retrying ${item.label} (temporary provider spike)...`;
        };

        const result = await executeGeminiRequest(item.prompt, state.selectedModel, state.apiKey, onRetry);
        completedCount++;
        const pct = Math.round((completedCount / queue.length) * 90) + 10;
        updateProgress(pct, `Completed ${completedCount} of ${queue.length} responses...`);

        state.comparisonResults[idx] = {
          ...item,
          status: result.success ? 'success' : 'error',
          response: result.text || '',
          duration_ms: result.duration_ms || 0,
          usage: result.usage || null,
          error: result.error || null,
          model: result.model || state.selectedModel
        };
      } catch (err) {
        completedCount++;
        state.comparisonResults[idx] = {
          ...item,
          status: 'error',
          response: '',
          duration_ms: 0,
          usage: null,
          error: sanitizeErrorText(err.message || 'Unknown network error', state.apiKey),
          model: state.selectedModel
        };
      } finally {
        updateResultCard(state.comparisonResults[idx]);
      }
    });

    await Promise.all(promises);

    // Finished
    state.isRunningComparison = false;
    dom.btnRunComparison.disabled = false;
    dom.btnRunComparisonText.textContent = 'Compare with Gemini';
    updateProgress(100, 'All Gemini responses received!');

    setTimeout(() => {
      dom.comparisonProgressWrap.classList.add('hidden');
    }, 1200);

    // Render Observable Differences & Diagnostic Breakdown
    renderObservableDifferences();
    updateStepper(4);
    showToast('Gemini comparison completed!', 'success');
  }

  async function executeGeminiRequest(promptText, model, key, onRetry) {
    const requestedModel = (model || state.selectedModel || 'gemini-3.5-flash-lite').trim();

    // 1. Attempt backend server proxy first
    try {
      const serverRes = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': (key || '').trim()
        },
        body: JSON.stringify({
          prompt: promptText,
          model: requestedModel,
          apiKey: (key || '').trim(),
          temperature: 0.7
        })
      });

      const data = await serverRes.json().catch(() => null);
      if (data) {
        if (data.success) {
          return {
            ...data,
            model: data.model || requestedModel
          };
        }

        // Check if backend returned a non-retryable error (e.g. invalid key 401, bad request 400, deprecated 404, quota 429)
        const isNonRetryable = data.statusCode === 400 || data.statusCode === 401 || data.statusCode === 403 || data.statusCode === 404 || data.statusCode === 429 || data.retryable === false;
        if (isNonRetryable) {
          return {
            success: false,
            error: data.error,
            statusCode: data.statusCode || serverRes.status,
            model: data.model || requestedModel,
            retryable: false
          };
        }

        // If backend returned a network/cert error, fall through to direct browser fetch
        const errMsg = String(data.error || '');
        if (!errMsg.includes('CERTIFICATE_VERIFY_FAILED') && !errMsg.includes('Network connection error')) {
          return {
            success: false,
            error: data.error,
            statusCode: data.statusCode || serverRes.status,
            model: data.model || requestedModel,
            retryable: data.retryable || false
          };
        }
      }
    } catch (netErr) {
      // Backend not running; fallback to direct browser fetch
    }

    // 2. Direct browser fetch fallback (for static hosting or SSL bypass)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requestedModel)}:generateContent`;
    let attempts = 0;
    const maxAttempts = 2; // Bounded retry: 1 initial attempt + 1 retry

    while (attempts < maxAttempts) {
      attempts++;
      const start = performance.now();
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': (key || '').trim()
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: promptText }]
              }
            ],
            generationConfig: {
              temperature: 0.7
            }
          })
        });

        const elapsed = Math.round(performance.now() - start);

        if (!resp.ok) {
          const errorJson = await resp.json().catch(() => null);
          let errorMsg = `HTTP Error ${resp.status}`;
          if (errorJson && errorJson.error && errorJson.error.message) {
            errorMsg = errorJson.error.message;
          }

          // Check for transient 500/503/504 errors: bounded retry with backoff
          const isTransient = resp.status >= 500 && resp.status <= 504;
          if (isTransient && attempts < maxAttempts) {
            if (typeof onRetry === 'function') onRetry(attempts + 1, maxAttempts);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }

          let friendly = errorMsg;
          if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
            friendly = 'Invalid or rejected Gemini API key. Please check your key in Google AI Studio and re-enter it.';
          } else if (resp.status === 404) {
            friendly = `Gemini model '${requestedModel}' was not found or is no longer available. Please select a supported model such as gemini-3.5-flash-lite.`;
          } else if (resp.status === 429) {
            friendly = `Gemini quota or rate limit exceeded for model '${requestedModel}'. Please wait a moment before sending another request.`;
          } else if (resp.status >= 500) {
            friendly = `Google Gemini service is temporarily overloaded for model '${requestedModel}' (${resp.status} Service Unavailable). Spikes in demand are temporary; please retry in a few moments or switch to gemini-3.5-flash-lite.`;
          }

          return {
            success: false,
            error: friendly,
            statusCode: resp.status,
            duration_ms: elapsed,
            model: requestedModel,
            retryable: isTransient
          };
        }

        const data = await resp.json();
        const candidates = data.candidates || [];
        if (!candidates.length) {
          const blockReason = data.promptFeedback?.blockReason || 'Filtered by safety policies';
          return {
            success: false,
            error: `Content was filtered by Gemini safety system: ${blockReason}`,
            statusCode: 200,
            duration_ms: elapsed,
            model: requestedModel,
            retryable: false
          };
        }

        const first = candidates[0];
        const text = (first.content && first.content.parts && first.content.parts[0])
          ? first.content.parts.map(p => p.text || '').join('')
          : '';

        const usageMetadata = data.usageMetadata || {};

        return {
          success: true,
          text,
          model: requestedModel,
          duration_ms: elapsed,
          usage: {
            prompt_tokens: usageMetadata.promptTokenCount || 0,
            candidates_tokens: usageMetadata.candidatesTokenCount || 0,
            total_tokens: usageMetadata.totalTokenCount || 0
          }
        };

      } catch (err) {
        if (attempts < maxAttempts) {
          if (typeof onRetry === 'function') onRetry(attempts + 1, maxAttempts);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return {
          success: false,
          error: `Network error connecting to Gemini: ${sanitizeErrorText(err.message, key)}`,
          statusCode: 0,
          duration_ms: 0,
          model: requestedModel,
          retryable: true
        };
      }
    }
  }

  function updateProgress(percent, text) {
    dom.comparisonProgressBar.style.width = `${percent}%`;
    dom.comparisonProgressText.textContent = text;
  }

  // -------------------------------------------------------------------------
  // Results Cards Rendering
  // -------------------------------------------------------------------------
  function renderResultCard(item) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.id = `result-card-${item.id}`;

    card.innerHTML = `
      <div class="result-card-header">
        <div class="result-source-wrap">
          <span class="badge ${item.badgeClass}">${escapeHtml(item.techniqueName)}</span>
          <span class="result-source-name">${escapeHtml(item.label)}</span>
        </div>
        <div class="result-status-badge status-generating" id="status-${item.id}">
          <span class="spinner-sm"></span>
          <span>Generating...</span>
        </div>
      </div>

      <div class="result-content-body" id="body-${item.id}">
        <p class="text-muted">Waiting for response from Gemini...</p>
      </div>

      <details class="prompt-inspect-details">
        <summary>View Exact Prompt Sent</summary>
        <pre class="prompt-inspect-text">${escapeHtml(item.prompt)}</pre>
      </details>

      <div class="result-card-footer">
        <div class="result-meta-items" id="meta-${item.id}">
          <span class="meta-pill">Model: ${escapeHtml(state.selectedModel)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-copy-result" data-id="${item.id}" disabled>
          Copy Response
        </button>
      </div>
    `;

    dom.comparisonResultsGrid.appendChild(card);
  }

  function updateResultCard(item) {
    const card = document.getElementById(`result-card-${item.id}`);
    if (!card) return;

    const statusEl = document.getElementById(`status-${item.id}`);
    const bodyEl = document.getElementById(`body-${item.id}`);
    const metaEl = document.getElementById(`meta-${item.id}`);
    const copyBtn = card.querySelector('.btn-copy-result');

    if (item.status === 'success') {
      statusEl.className = 'result-status-badge status-success';
      statusEl.textContent = 'Success';

      // Render Markdown formatting
      bodyEl.innerHTML = renderMarkdown(item.response);
      copyBtn.disabled = false;

      // Meta items
      const durationSec = (item.duration_ms / 1000).toFixed(2);
      let tokensHtml = '';
      if (item.usage && item.usage.total_tokens) {
        const inTokens = item.usage.prompt_tokens || 0;
        const outTokens = item.usage.candidates_tokens || item.usage.candidate_tokens || 0;
        tokensHtml = `<span class="meta-pill" title="Tokens consumed">Tokens: ${item.usage.total_tokens} (In: ${inTokens} / Out: ${outTokens})</span>`;
      }

      metaEl.innerHTML = `
        <span class="meta-pill">Model: ${escapeHtml(item.model || state.selectedModel)}</span>
        <span class="meta-pill">Time: ${durationSec}s</span>
        ${tokensHtml}
        <span class="meta-pill">Words: ${countWords(item.response)}</span>
      `;
    } else {
      statusEl.className = 'result-status-badge status-error';
      statusEl.textContent = 'Error';

      bodyEl.innerHTML = `
        <div class="validation-msg error-msg">
          <strong>Request Failed:</strong> ${escapeHtml(item.error || 'Unknown error occurred.')}
        </div>
        <p class="input-subhint mt-3">Model: <code>${escapeHtml(item.model || state.selectedModel)}</code></p>
      `;
      metaEl.innerHTML = `
        <span class="meta-pill">Model: ${escapeHtml(item.model || state.selectedModel)}</span>
      `;
      copyBtn.disabled = true;
    }
  }

  // -------------------------------------------------------------------------
  // Observable Differences Diagnostic Table
  // -------------------------------------------------------------------------
  function renderObservableDifferences() {
    const completed = state.comparisonResults.filter(r => r.status === 'success');
    if (completed.length === 0) return;

    dom.differencesTbody.innerHTML = '';

    completed.forEach(item => {
      const text = item.response;
      const wordCount = countWords(text);
      const durationStr = (item.duration_ms / 1000).toFixed(2) + 's';
      const tokenStr = item.usage ? `${item.usage.total_tokens}` : 'N/A';

      // Formatting detections
      const features = [];
      if (/^\s*[-*•]\s+/m.test(text)) features.push('Bullets');
      if (/^\s*\d+\.\s+/m.test(text)) features.push('Numbered Steps');
      if (/```/.test(text)) features.push('Code Block');
      if (/\|.*\|.*\|/.test(text)) features.push('Table');
      if (/\{[\s\S]*\}/.test(text) && !/```/.test(text)) features.push('JSON');

      const structureText = features.length ? features.join(', ') : 'Paragraphs';

      // Constraint audit
      let constraintNote = 'No explicit constraint set';
      const lengthConstraint = state.options.length.toLowerCase();
      if (lengthConstraint.includes('100') || state.originalPrompt.toLowerCase().includes('100 words')) {
        if (wordCount <= 100) {
          constraintNote = `<span class="text-emerald">✓ Within limit (${wordCount} words &le; 100)</span>`;
        } else {
          constraintNote = `<span class="text-muted">Exceeded limit (${wordCount} words &gt; 100)</span>`;
        }
      } else if (state.options.format) {
        constraintNote = `Formatted as ${escapeHtml(state.options.format.substring(0, 24))}...`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHtml(item.label)}</strong></td>
        <td>${wordCount}</td>
        <td>${durationStr}</td>
        <td>${tokenStr}</td>
        <td>${structureText}</td>
        <td>${constraintNote}</td>
      `;
      dom.differencesTbody.appendChild(row);
    });

    // Generate beginner learning takeaway
    const orig = completed.find(r => r.id === 'original');
    const enhancedList = completed.filter(r => r.id !== 'original');

    let takeawayText = '';
    if (orig && enhancedList.length > 0) {
      const origWords = countWords(orig.response);
      const avgEnhancedWords = Math.round(enhancedList.reduce((acc, cur) => acc + countWords(cur.response), 0) / enhancedList.length);

      takeawayText = `
        <p>
          Comparing the <strong>${escapeHtml(orig.label)}</strong> (${origWords} words) with the enhanced versions (averaging ${avgEnhancedWords} words) reveals how explicit prompt engineering directs Gemini's output density, structural predictability, and constraint adherence.
        </p>
        <p class="mt-3">
          Notice how techniques like <strong>Constraints & Guardrails</strong> discipline the response length, while <strong>Role-based</strong> and <strong>Clear Task</strong> establish domain-accurate vocabulary and actionable tone.
        </p>
      `;
    } else {
      takeawayText = `
        <p>Multiple prompt engineering techniques demonstrate distinct structural variations in Gemini's response formatting, readability, and information density.</p>
      `;
    }

    dom.learningsContent.innerHTML = takeawayText;
    dom.observableDifferencesPanel.classList.remove('hidden');
  }

  // -------------------------------------------------------------------------
  // Feature 1: Prompt Battle Flow
  // -------------------------------------------------------------------------
  function updateBattleCounters() {
    const textA = (dom.battlePromptAInput?.value || '').trim();
    const wordsA = textA ? textA.split(/\s+/).length : 0;
    const charsA = dom.battlePromptAInput?.value?.length || 0;
    if (dom.battleCounterA) {
      dom.battleCounterA.textContent = `${wordsA} word${wordsA !== 1 ? 's' : ''} | ${charsA} char${charsA !== 1 ? 's' : ''}`;
    }

    const textB = (dom.battlePromptBInput?.value || '').trim();
    const wordsB = textB ? textB.split(/\s+/).length : 0;
    const charsB = dom.battlePromptBInput?.value?.length || 0;
    if (dom.battleCounterB) {
      dom.battleCounterB.textContent = `${wordsB} word${wordsB !== 1 ? 's' : ''} | ${charsB} char${charsB !== 1 ? 's' : ''}`;
    }
  }

  function updateBattleEnhancedDropdown() {
    if (!dom.battleLoadEnhancedSelect) return;
    const prev = dom.battleLoadEnhancedSelect.value;
    dom.battleLoadEnhancedSelect.innerHTML = '<option value="">Load an enhanced prompt...</option>';
    state.enhancedPrompts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${countWords(p.currentPrompt)} words)`;
      if (p.id === prev) opt.selected = true;
      dom.battleLoadEnhancedSelect.appendChild(opt);
    });
  }

  function loadBattlePreset(presetType) {
    if (presetType === 'studio') {
      readInputs();
      if (!state.originalPrompt) {
        showToast('Please write an original prompt in Stage 1 first.', 'info');
        return;
      }
      dom.battlePromptAInput.value = state.originalPrompt;
      if (dom.battleSourceA) dom.battleSourceA.textContent = 'Stage 1 Original Prompt';

      // Master prompt or first enhanced prompt
      const master = state.enhancedPrompts.find(p => p.id === 'combined') || state.enhancedPrompts[0];
      if (master) {
        dom.battlePromptBInput.value = master.currentPrompt;
        if (dom.battleSourceB) dom.battleSourceB.textContent = `Stage 3: ${master.name}`;
      } else {
        dom.battlePromptBInput.value = 'You are a domain expert. Provide a concise, clear, and structured response with bold bullet headers under 120 words.';
        if (dom.battleSourceB) dom.battleSourceB.textContent = 'Engineered Expert Template';
      }
      showToast('Loaded Original Prompt (A) vs Master Enhanced Prompt (B).', 'success');
    } else if (presetType === 'climate') {
      dom.battlePromptAInput.value = 'Explain climate change.';
      if (dom.battleSourceA) dom.battleSourceA.textContent = 'Vague / Unconstrained Sample';

      dom.battlePromptBInput.value = 'You are an encouraging middle school science teacher. Explain climate change to a 12-year-old student in 3 bullet points with bold topic headers. Keep the total explanation strictly under 90 words.';
      if (dom.battleSourceB) dom.battleSourceB.textContent = 'Role + Audience + Constraints Sample';
      showToast('Loaded Climate Battle: Vague vs Role & Constraints.', 'info');
    } else if (presetType === 'code') {
      dom.battlePromptAInput.value = 'Why is my python code slow? def find_dupes(nums): return [x for x in nums if nums.count(x) > 1]';
      if (dom.battleSourceA) dom.battleSourceA.textContent = 'Direct Query Sample';

      dom.battlePromptBInput.value = 'You are a senior Python performance engineer. Review the following function: def find_dupes(nums): return [x for x in nums if nums.count(x) > 1]. In step 1, explain the Big-O time complexity and root cause of slowness. In step 2, provide the optimized O(N) solution using a set. Keep your explanation under 120 words.';
      if (dom.battleSourceB) dom.battleSourceB.textContent = 'Persona + Step-by-Step Code Review Sample';
      showToast('Loaded Code Review Battle: Direct Query vs Step-by-Step.', 'info');
    }

    updateBattleCounters();
    if (dom.battleValidationMsg) dom.battleValidationMsg.classList.add('hidden');
  }

  function swapBattlePrompts() {
    const valA = dom.battlePromptAInput.value;
    const valB = dom.battlePromptBInput.value;
    dom.battlePromptAInput.value = valB;
    dom.battlePromptBInput.value = valA;

    const labelA = dom.battleSourceA ? dom.battleSourceA.textContent : '';
    const labelB = dom.battleSourceB ? dom.battleSourceB.textContent : '';
    if (dom.battleSourceA) dom.battleSourceA.textContent = labelB;
    if (dom.battleSourceB) dom.battleSourceB.textContent = labelA;

    updateBattleCounters();
    showToast('Swapped Prompt A and Prompt B.', 'info');
  }

  async function startPromptBattle() {
    if (state.battle.isRunning) return;

    const promptA = (dom.battlePromptAInput?.value || '').trim();
    const promptB = (dom.battlePromptBInput?.value || '').trim();

    dom.battleValidationMsg.classList.add('hidden');

    if (!promptA) {
      dom.battleValidationMsg.textContent = 'Please enter or load Prompt A before starting the battle.';
      dom.battleValidationMsg.classList.remove('hidden');
      dom.battlePromptAInput.focus();
      return;
    }

    if (!promptB) {
      dom.battleValidationMsg.textContent = 'Please enter or load Prompt B before starting the battle.';
      dom.battleValidationMsg.classList.remove('hidden');
      dom.battlePromptBInput.focus();
      return;
    }

    if (!state.apiKey || !state.apiKey.trim()) {
      dom.battleMissingKeyBanner.classList.remove('hidden');
      dom.battleMissingKeyBanner.scrollIntoView({ behavior: 'smooth' });
      openModal(dom.apiKeyModal);
      return;
    }

    const battleModel = (dom.battleModelSelect?.value || state.selectedModel || 'gemini-3.5-flash-lite').trim();
    syncSelectedModel(battleModel);

    // Lock UI during execution
    state.battle.isRunning = true;
    dom.btnStartBattle.disabled = true;
    dom.btnStartBattleText.textContent = 'Battling Prompts...';

    dom.battleEmptyState.classList.add('hidden');
    dom.battleResultsGrid.classList.remove('hidden');
    dom.battleProgressWrap.classList.remove('hidden');
    dom.battleProgressBar.style.width = '30%';
    dom.battleProgressText.textContent = `Sending both prompts in parallel to Gemini (${battleModel})...`;

    // Reset judgement and snapshots
    dom.battleJudgementPanel.classList.add('hidden');
    dom.battleVerdictSummary.classList.add('hidden');
    dom.battleVerdictRadios.forEach(r => r.checked = false);
    if (dom.battleExplanationInput) dom.battleExplanationInput.value = '';
    dom.battleSnapshotA.textContent = promptA;
    dom.battleSnapshotB.textContent = promptB;

    // Loading skeletons in response cards
    dom.battleRespModelA.textContent = battleModel;
    dom.battleRespModelB.textContent = battleModel;
    dom.battleRespDurationA.textContent = 'Processing...';
    dom.battleRespDurationB.textContent = 'Processing...';
    dom.battleRespTokensA.textContent = '-- tokens';
    dom.battleRespTokensB.textContent = '-- tokens';
    dom.battleRespBodyA.innerHTML = '<div class="loading-spinner-wrap"><div class="spinner"></div><p>Generating response for Prompt A...</p></div>';
    dom.battleRespBodyB.innerHTML = '<div class="loading-spinner-wrap"><div class="spinner"></div><p>Generating response for Prompt B...</p></div>';

    // Execute in parallel against the SAME model and settings
    const runA = executeGeminiRequest(promptA, battleModel, state.apiKey, (attempt, max) => {
      dom.battleProgressText.textContent = `Retrying Prompt A (attempt ${attempt} of ${max})...`;
    });

    const runB = executeGeminiRequest(promptB, battleModel, state.apiKey, (attempt, max) => {
      dom.battleProgressText.textContent = `Retrying Prompt B (attempt ${attempt} of ${max})...`;
    });

    let resA = null;
    let resB = null;

    try {
      [resA, resB] = await Promise.all([runA, runB]);
    } catch (err) {
      console.error('Unexpected battle exception:', err);
    }

    state.battle.resultA = resA;
    state.battle.resultB = resB;

    // Render Response A (preserving it even if B fails)
    renderBattleResponse('A', resA, battleModel);

    // Render Response B (preserving it even if A fails)
    renderBattleResponse('B', resB, battleModel);

    // Complete Progress
    dom.battleProgressBar.style.width = '100%';
    dom.battleProgressText.textContent = 'Prompt Battle complete!';

    setTimeout(() => {
      dom.battleProgressWrap.classList.add('hidden');
    }, 1000);

    state.battle.isRunning = false;
    dom.btnStartBattle.disabled = false;
    dom.btnStartBattleText.textContent = 'Start Prompt Battle';

    // Show Judgement Panel
    dom.battleJudgementPanel.classList.remove('hidden');
    dom.battleResultsGrid.scrollIntoView({ behavior: 'smooth' });
    updateStepper(5);

    showToast('Prompt Battle completed! Compare the responses side by side.', 'success');
  }

  function renderBattleResponse(fighter, result, model) {
    const isA = fighter === 'A';
    const bodyEl = isA ? dom.battleRespBodyA : dom.battleRespBodyB;
    const durEl = isA ? dom.battleRespDurationA : dom.battleRespDurationB;
    const tokEl = isA ? dom.battleRespTokensA : dom.battleRespTokensB;
    const modEl = isA ? dom.battleRespModelA : dom.battleRespModelB;

    modEl.textContent = (result && result.model) ? result.model : model;

    if (!result) {
      durEl.textContent = 'Failed';
      tokEl.textContent = '0 tokens';
      bodyEl.innerHTML = `
        <div class="alert-banner alert-danger">
          <p class="alert-desc">No response was received from Gemini for Prompt ${fighter}.</p>
        </div>
      `;
      return;
    }

    durEl.textContent = `${result.duration_ms || 0} ms`;
    const tokens = result.usage ? result.usage.total_tokens : 0;
    tokEl.textContent = `${tokens} token${tokens !== 1 ? 's' : ''}`;

    if (result.success && result.text) {
      bodyEl.innerHTML = renderMarkdown(result.text);
    } else {
      const errorMsg = result.error || 'An error occurred while generating this response.';
      bodyEl.innerHTML = `
        <div class="alert-banner alert-danger">
          <h4 class="alert-title">Prompt ${fighter} Request Failed</h4>
          <p class="alert-desc">${escapeHtml(errorMsg)}</p>
        </div>
      `;
    }
  }

  function saveBattleVerdict() {
    let chosenVerdict = '';
    dom.battleVerdictRadios.forEach(radio => {
      if (radio.checked) chosenVerdict = radio.value;
    });

    if (!chosenVerdict) {
      showToast('Please select which response was more useful before saving.', 'info');
      return;
    }

    const explanation = (dom.battleExplanationInput?.value || '').trim();
    state.battle.verdict = chosenVerdict;
    state.battle.explanation = explanation;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const modelUsed = state.selectedModel;

    dom.battleVerdictSummary.innerHTML = `
      <h4>Verdict Recorded: ${escapeHtml(chosenVerdict)}</h4>
      <p class="mb-1"><strong>Evaluated Model:</strong> <code>${escapeHtml(modelUsed)}</code> &bull; <strong>Time:</strong> ${timestamp}</p>
      ${explanation ? `<p class="mt-2"><strong>Your Notes:</strong> <em>"${escapeHtml(explanation)}"</em></p>` : '<p class="mt-2 text-muted"><em>No additional notes provided.</em></p>'}
      <div class="mt-3">
        <span class="badge badge-emerald">✓ Verdict Saved</span>
      </div>
    `;
    dom.battleVerdictSummary.classList.remove('hidden');
    dom.battleVerdictSummary.scrollIntoView({ behavior: 'smooth' });

    showToast(`Battle verdict saved: "${chosenVerdict}"!`, 'success');
  }

  // -------------------------------------------------------------------------
  // Helper Functions
  // -------------------------------------------------------------------------
  function countWords(str) {
    if (!str || !str.trim()) return 0;
    return str.trim().split(/\s+/).length;
  }

  function updateCharCounter() {
    const text = dom.originalPromptInput.value;
    const words = countWords(text);
    const chars = text.length;
    dom.originalPromptCounter.textContent = `${words} words | ${chars} chars`;

    if (words > 0) {
      dom.stage1Summary.textContent = `Prompt ready (${words} words). Click Continue to select improvements.`;
    } else {
      dom.stage1Summary.textContent = 'Ready to choose improvements.';
    }
  }

  function updateTechSelectionCount() {
    const count = state.selectedTechniques.size;
    dom.techSelectionCount.textContent = `${count} technique${count !== 1 ? 's' : ''} selected`;
    dom.btnEnhanceText.textContent = `Enhance Prompts (${count} selected)`;
    dom.btnEnhancePrompts.disabled = count === 0;
  }

  function updateStepper(activeStep) {
    dom.stepperItems.forEach((item, idx) => {
      const stepNum = idx + 1;
      if (stepNum < activeStep) {
        item.className = 'stepper-item completed';
      } else if (stepNum === activeStep) {
        item.className = 'stepper-item active';
      } else {
        item.className = 'stepper-item';
      }
    });
  }

  function sanitizeErrorText(msg, key) {
    if (!msg) return 'An error occurred';
    let clean = String(msg);
    if (key && key.length > 5) {
      clean = clean.split(key).join('[REDACTED_API_KEY]');
    }
    clean = clean.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
    clean = clean.replace(/AQ\.[A-Za-z0-9_.-]{20,}/g, '[REDACTED_API_KEY]');
    clean = clean.replace(/([?&]key=)[^&\s"']+/g, '$1[REDACTED_API_KEY]');
    clean = clean.replace(/(Bearer\s+)[A-Za-z0-9_.-]{10,}/g, '$1[REDACTED_TOKEN]');
    clean = clean.replace(/(x-goog-api-key:\s*)[^\s"']+/g, '$1[REDACTED_API_KEY]');
    return clean;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(md) {
    if (!md) return '';
    let html = escapeHtml(md);

    // Code blocks
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet points
    html = html.replace(/^\s*[-*•]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    return paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<ol')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
  }

  function copyTextToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'success');
      }).catch(() => {
        fallbackCopyText(text, successMsg);
      });
    } else {
      fallbackCopyText(text, successMsg);
    }
  }

  function fallbackCopyText(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (e) {
      showToast('Could not copy to clipboard.', 'error');
    }
    ta.remove();
  }

  // -------------------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------------------
  function attachEventListeners() {
    // API Key Modal Controls
    dom.btnOpenApiModal.addEventListener('click', () => {
      dom.geminiApiKeyInput.value = state.apiKey;
      dom.chkRememberKey.checked = state.rememberKey;
      dom.geminiModelSelect.value = state.selectedModel;
      dom.keyValidationFeedback.classList.add('hidden');
      openModal(dom.apiKeyModal);
    });

    dom.btnCloseApiModal.addEventListener('click', () => closeModal(dom.apiKeyModal));
    dom.btnCancelApiModal.addEventListener('click', () => closeModal(dom.apiKeyModal));
    dom.btnSaveKey.addEventListener('click', handleSaveKey);

    dom.btnToggleKeyVisibility.addEventListener('click', () => {
      const isPass = dom.geminiApiKeyInput.type === 'password';
      dom.geminiApiKeyInput.type = isPass ? 'text' : 'password';
      dom.eyeIcon.innerHTML = isPass
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    });

    dom.btnRemoveKey.addEventListener('click', () => openModal(dom.confirmRemoveModal));
    dom.btnCloseRemoveModal.addEventListener('click', () => closeModal(dom.confirmRemoveModal));
    dom.btnCancelRemoveKey.addEventListener('click', () => closeModal(dom.confirmRemoveModal));
    dom.btnConfirmRemoveKey.addEventListener('click', handleConfirmRemoveKey);

    dom.btnPromptEnterKey.addEventListener('click', () => openModal(dom.apiKeyModal));

    // Reset Session Modal
    dom.btnResetSession.addEventListener('click', () => openModal(dom.resetConfirmModal));
    dom.btnCloseResetModal.addEventListener('click', () => closeModal(dom.resetConfirmModal));
    dom.btnCancelReset.addEventListener('click', () => closeModal(dom.resetConfirmModal));
    dom.btnConfirmReset.addEventListener('click', handleResetSession);

    // Guide Toggle
    dom.btnToggleGuide.addEventListener('click', () => {
      const isHidden = dom.guideContent.classList.contains('hidden');
      if (isHidden) {
        dom.guideContent.classList.remove('hidden');
        dom.guideToggleText.textContent = 'Hide Guide';
        dom.guideToggleIcon.style.transform = 'rotate(0deg)';
        dom.btnToggleGuide.setAttribute('aria-expanded', 'true');
      } else {
        dom.guideContent.classList.add('hidden');
        dom.guideToggleText.textContent = 'Show Guide';
        dom.guideToggleIcon.style.transform = 'rotate(180deg)';
        dom.btnToggleGuide.setAttribute('aria-expanded', 'false');
      }
    });

    // Optional Details Toggle
    dom.btnToggleOptions.addEventListener('click', () => {
      const isExpanded = dom.btnToggleOptions.getAttribute('aria-expanded') === 'true';
      dom.btnToggleOptions.setAttribute('aria-expanded', !isExpanded);
      dom.optionalFieldsContainer.classList.toggle('hidden', isExpanded);
    });

    // Quick Sample Prompts
    dom.sampleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-sample');
        const data = SAMPLES[key];
        if (!data) return;

        dom.originalPromptInput.value = data.prompt;
        dom.optAudience.value = data.audience;
        dom.optContext.value = data.context;
        dom.optTone.value = data.tone;
        dom.optLength.value = data.length;
        dom.optFormat.value = data.format;
        dom.optRole.value = data.role;
        dom.optFewShot.value = data.fewShot;

        // Open optional drawer so user sees what was populated
        dom.btnToggleOptions.setAttribute('aria-expanded', 'true');
        dom.optionalFieldsContainer.classList.remove('hidden');

        updateCharCounter();
        dom.promptValidationMsg.classList.add('hidden');
        showToast(`Loaded sample prompt: "${btn.textContent.split('(')[0].trim()}"`, 'info');
      });
    });

    // Textarea input monitoring
    dom.originalPromptInput.addEventListener('input', () => {
      updateCharCounter();
      dom.promptValidationMsg.classList.add('hidden');
    });

    // Sample Few-Shot button
    dom.btnInsertSampleFewShot.addEventListener('click', () => {
      dom.optFewShot.value = 'Q: What is a solar eclipse?\nA: A solar eclipse happens when the Moon passes between Earth and the Sun, temporarily casting a shadow on Earth.';
      showToast('Inserted sample few-shot demonstration.', 'info');
    });

    // Stage 1 CTA -> Go to Stage 2
    dom.btnGoToStage2.addEventListener('click', () => {
      readInputs();
      if (!state.originalPrompt) {
        dom.promptValidationMsg.textContent = 'Please enter an original prompt before continuing.';
        dom.promptValidationMsg.classList.remove('hidden');
        dom.originalPromptInput.focus();
        return;
      }
      document.getElementById('stage-2').scrollIntoView({ behavior: 'smooth' });
      updateStepper(2);
    });

    // Technique Selection Checkboxes
    dom.techCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          state.selectedTechniques.add(cb.value);
        } else {
          state.selectedTechniques.delete(cb.value);
        }
        updateTechSelectionCount();
        dom.techValidationMsg.classList.add('hidden');
      });
    });

    // Technique Quick Filters
    dom.btnSelectAllTech.addEventListener('click', () => {
      dom.techCheckboxes.forEach(cb => {
        cb.checked = true;
        state.selectedTechniques.add(cb.value);
      });
      updateTechSelectionCount();
    });

    dom.btnSelectRecommendedTech.addEventListener('click', () => {
      const rec = new Set(['clear_task', 'role', 'constraints']);
      dom.techCheckboxes.forEach(cb => {
        const isRec = rec.has(cb.value);
        cb.checked = isRec;
        if (isRec) state.selectedTechniques.add(cb.value);
        else state.selectedTechniques.delete(cb.value);
      });
      updateTechSelectionCount();
    });

    dom.btnClearTech.addEventListener('click', () => {
      dom.techCheckboxes.forEach(cb => {
        cb.checked = false;
      });
      state.selectedTechniques.clear();
      updateTechSelectionCount();
    });

    // Enhance Prompts Action
    dom.btnEnhancePrompts.addEventListener('click', handleEnhancePrompts);

    // Stage 3: Bulk Include / Exclude
    dom.btnCheckAllComparison.addEventListener('click', () => {
      state.enhancedPrompts.forEach(p => p.includeInComparison = true);
      document.querySelectorAll('.chk-include-comparison').forEach(cb => cb.checked = true);
      document.querySelectorAll('.enhanced-card').forEach(card => card.classList.remove('excluded-from-comparison'));
      updateComparisonReadyNote();
    });

    dom.btnUncheckAllComparison.addEventListener('click', () => {
      state.enhancedPrompts.forEach(p => p.includeInComparison = false);
      document.querySelectorAll('.chk-include-comparison').forEach(cb => cb.checked = false);
      document.querySelectorAll('.enhanced-card').forEach(card => card.classList.add('excluded-from-comparison'));
      updateComparisonReadyNote();
    });

    dom.btnGoToComparison.addEventListener('click', () => {
      document.getElementById('stage-4').scrollIntoView({ behavior: 'smooth' });
      updateStepper(4);
    });

    // Event Delegation for Enhanced Cards (Edit, Reset, Copy, Toggle, Jump)
    dom.enhancedCardsList.addEventListener('input', e => {
      if (e.target.classList.contains('enhanced-textarea')) {
        const techId = e.target.getAttribute('data-tech');
        const item = state.enhancedPrompts.find(p => p.id === techId);
        if (item) {
          item.currentPrompt = e.target.value;
          const counterEl = document.getElementById(`counter-${techId}`);
          if (counterEl) {
            counterEl.textContent = `${countWords(item.currentPrompt)} words | ${item.currentPrompt.length} chars`;
          }
        }
      }
    });

    dom.enhancedCardsList.addEventListener('change', e => {
      if (e.target.classList.contains('chk-include-comparison')) {
        const techId = e.target.getAttribute('data-tech');
        const item = state.enhancedPrompts.find(p => p.id === techId);
        if (item) {
          item.includeInComparison = e.target.checked;
          const card = document.getElementById(`enhanced-card-${techId}`);
          if (card) {
            card.classList.toggle('excluded-from-comparison', !item.includeInComparison);
          }
          updateComparisonReadyNote();
        }
      }
    });

    dom.enhancedCardsList.addEventListener('click', e => {
      const target = e.target.closest('button');
      if (!target) return;

      // Copy Prompt
      if (target.classList.contains('btn-copy-card-prompt')) {
        const techId = target.getAttribute('data-tech');
        const item = state.enhancedPrompts.find(p => p.id === techId);
        if (item) {
          copyTextToClipboard(item.currentPrompt, `Copied "${item.name}" prompt to clipboard!`);
        }
      }

      // Reset Prompt
      if (target.classList.contains('btn-reset-card-prompt')) {
        const techId = target.getAttribute('data-tech');
        const item = state.enhancedPrompts.find(p => p.id === techId);
        if (item) {
          item.currentPrompt = item.generatedPrompt;
          const ta = document.getElementById(`prompt-editor-${techId}`);
          if (ta) ta.value = item.generatedPrompt;
          const counterEl = document.getElementById(`counter-${techId}`);
          if (counterEl) {
            counterEl.textContent = `${countWords(item.currentPrompt)} words | ${item.currentPrompt.length} chars`;
          }
          showToast(`Reset prompt for "${item.name}".`, 'info');
        }
      }

      // Jump to Option
      if (target.classList.contains('btn-jump-to-option')) {
        dom.btnToggleOptions.setAttribute('aria-expanded', 'true');
        dom.optionalFieldsContainer.classList.remove('hidden');
        document.getElementById('stage-1').scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Event Delegation for Comparison Result Cards (Copy Response)
    dom.comparisonResultsGrid.addEventListener('click', e => {
      const target = e.target.closest('.btn-copy-result');
      if (!target) return;
      const resId = target.getAttribute('data-id');
      const item = state.comparisonResults.find(r => r.id === resId);
      if (item && item.response) {
        copyTextToClipboard(item.response, `Copied ${item.label} response!`);
      }
    });

    // Run Comparison CTA
    dom.btnRunComparison.addEventListener('click', runGeminiComparison);

    // Model Selectors Synchronization
    if (dom.stage4ModelSelect) {
      dom.stage4ModelSelect.addEventListener('change', e => syncSelectedModel(e.target.value, true));
    }
    if (dom.battleModelSelect) {
      dom.battleModelSelect.addEventListener('change', e => syncSelectedModel(e.target.value, true));
    }
    if (dom.geminiModelSelect) {
      dom.geminiModelSelect.addEventListener('change', e => syncSelectedModel(e.target.value, false));
    }

    // Prompt Battle Controls
    if (dom.battlePromptAInput) {
      dom.battlePromptAInput.addEventListener('input', () => {
        updateBattleCounters();
        if (dom.battleValidationMsg) dom.battleValidationMsg.classList.add('hidden');
      });
    }
    if (dom.battlePromptBInput) {
      dom.battlePromptBInput.addEventListener('input', () => {
        updateBattleCounters();
        if (dom.battleValidationMsg) dom.battleValidationMsg.classList.add('hidden');
      });
    }
    if (dom.btnBattleLoadStudio) {
      dom.btnBattleLoadStudio.addEventListener('click', () => loadBattlePreset('studio'));
    }
    if (dom.btnBattleSampleClimate) {
      dom.btnBattleSampleClimate.addEventListener('click', () => loadBattlePreset('climate'));
    }
    if (dom.btnBattleSampleCode) {
      dom.btnBattleSampleCode.addEventListener('click', () => loadBattlePreset('code'));
    }
    if (dom.btnBattleSwap) {
      dom.btnBattleSwap.addEventListener('click', swapBattlePrompts);
    }
    if (dom.btnBattleLoadOriginalA) {
      dom.btnBattleLoadOriginalA.addEventListener('click', () => {
        readInputs();
        if (state.originalPrompt) {
          dom.battlePromptAInput.value = state.originalPrompt;
          if (dom.battleSourceA) dom.battleSourceA.textContent = 'Stage 1 Original Prompt';
          updateBattleCounters();
          showToast('Loaded Original Prompt into Prompt A.', 'info');
        } else {
          showToast('No original prompt written in Stage 1 yet.', 'info');
        }
      });
    }
    if (dom.battleLoadEnhancedSelect) {
      dom.battleLoadEnhancedSelect.addEventListener('change', e => {
        const techId = e.target.value;
        if (!techId) return;
        const item = state.enhancedPrompts.find(p => p.id === techId);
        if (item) {
          dom.battlePromptBInput.value = item.currentPrompt;
          if (dom.battleSourceB) dom.battleSourceB.textContent = `Stage 3: ${item.name}`;
          updateBattleCounters();
          showToast(`Loaded "${item.name}" into Prompt B.`, 'info');
        }
      });
    }
    if (dom.btnStartBattle) {
      dom.btnStartBattle.addEventListener('click', startPromptBattle);
    }
    if (dom.btnBattleEnterKey) {
      dom.btnBattleEnterKey.addEventListener('click', () => openModal(dom.apiKeyModal));
    }
    if (dom.btnCopyBattleA) {
      dom.btnCopyBattleA.addEventListener('click', () => {
        if (state.battle.resultA && state.battle.resultA.text) {
          copyTextToClipboard(state.battle.resultA.text, 'Copied Response A to clipboard!');
        }
      });
    }
    if (dom.btnCopyBattleB) {
      dom.btnCopyBattleB.addEventListener('click', () => {
        if (state.battle.resultB && state.battle.resultB.text) {
          copyTextToClipboard(state.battle.resultB.text, 'Copied Response B to clipboard!');
        }
      });
    }
    if (dom.btnSaveVerdict) {
      dom.btnSaveVerdict.addEventListener('click', saveBattleVerdict);
    }

    // Keyboard shortcuts: Escape to close modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!dom.apiKeyModal.classList.contains('hidden')) closeModal(dom.apiKeyModal);
        if (!dom.confirmRemoveModal.classList.contains('hidden')) closeModal(dom.confirmRemoveModal);
        if (!dom.resetConfirmModal.classList.contains('hidden')) closeModal(dom.resetConfirmModal);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Session Reset
  // -------------------------------------------------------------------------
  function handleResetSession() {
    const alsoRemoveKey = dom.chkResetAlsoRemoveKey.checked;

    // Clear inputs
    dom.originalPromptInput.value = '';
    dom.optAudience.value = '';
    dom.optContext.value = '';
    dom.optTone.value = '';
    dom.optLength.value = '';
    dom.optFormat.value = '';
    dom.optRole.value = '';
    dom.optFewShot.value = '';

    state.originalPrompt = '';
    state.options = { audience: '', context: '', tone: '', length: '', format: '', role: '', fewShot: '' };
    state.enhancedPrompts = [];
    state.comparisonResults = [];

    // Reset technique selection to recommended
    const rec = new Set(['clear_task', 'role', 'constraints']);
    dom.techCheckboxes.forEach(cb => {
      const isRec = rec.has(cb.value);
      cb.checked = isRec;
      if (isRec) state.selectedTechniques.add(cb.value);
      else state.selectedTechniques.delete(cb.value);
    });

    // Reset cards & grids
    dom.enhancedCardsList.innerHTML = '';
    dom.enhancedEmptyState.classList.remove('hidden');
    dom.enhancedCardsContainer.classList.add('hidden');

    dom.comparisonResultsGrid.innerHTML = '';
    dom.comparisonResultsGrid.classList.add('hidden');
    dom.comparisonEmptyState.classList.remove('hidden');
    dom.observableDifferencesPanel.classList.add('hidden');

    // Reset Prompt Battle
    if (dom.battlePromptAInput) dom.battlePromptAInput.value = '';
    if (dom.battlePromptBInput) dom.battlePromptBInput.value = '';
    if (dom.battleSourceA) dom.battleSourceA.textContent = 'Manual / Custom Prompt';
    if (dom.battleSourceB) dom.battleSourceB.textContent = 'Manual / Custom Prompt';
    if (dom.battleEmptyState) dom.battleEmptyState.classList.remove('hidden');
    if (dom.battleResultsGrid) dom.battleResultsGrid.classList.add('hidden');
    if (dom.battleJudgementPanel) dom.battleJudgementPanel.classList.add('hidden');
    if (dom.battleVerdictSummary) dom.battleVerdictSummary.classList.add('hidden');
    if (dom.battleExplanationInput) dom.battleExplanationInput.value = '';
    dom.battleVerdictRadios.forEach(r => r.checked = false);
    state.battle = { promptA: '', promptB: '', isRunning: false, resultA: null, resultB: null, verdict: '', explanation: '' };
    updateBattleCounters();

    // Optionally remove key
    if (alsoRemoveKey) {
      state.apiKey = '';
      dom.geminiApiKeyInput.value = '';
      try {
        localStorage.removeItem('pes_api_key');
      } catch (e) {}
      updateApiStatusDisplay();
    }

    updateCharCounter();
    updateTechSelectionCount();
    updateStepper(1);
    closeModal(dom.resetConfirmModal);

    showToast('Studio session has been reset.', 'info');
    document.getElementById('stage-1').scrollIntoView({ behavior: 'smooth' });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
