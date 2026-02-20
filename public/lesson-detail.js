// Lesson Detail — Connected Flow
const API_BASE = window.location.origin;

let currentStep = 1;
let lessonData  = null;
let quizData    = null;
let codeExercises = null;
let currentExercise = null;
let currentQuizIndex = 0;
let quizScore   = 0;
let editor      = null;
let pyodide     = null;
let currentHintIndex = 0;

const STORAGE_KEY = 'learning-accelerator-progress';

// ── Library glossary ──────────────────────────────────────────────────────────
// Plain-English explanations for every library / function a student might hit.
const LIBRARY_GLOSSARY = {
  re: {
    label: 're',
    what: "Python's text-search tool. You describe a pattern and it scans your string for matches.",
    fns: {
      'findall':  'Returns a list of every match — use this when you want all results.',
      'search':   'Finds the first match only. Returns None if nothing matched.',
      'match':    'Checks if the pattern matches at the very start of the string.',
      'sub':      'Replaces every match with a different string (like find-and-replace).',
      'compile':  'Saves a pattern so you can reuse it without rewriting the pattern string.',
    }
  },
  Counter: {
    label: 'Counter (from collections)',
    what: "A special dictionary that counts how many times each item appears in a list.",
    fns: {
      'most_common': 'Returns items sorted from most frequent to least.',
    }
  },
  torch: {
    label: 'torch (PyTorch)',
    what: "The core PyTorch library for building and running neural networks.",
    fns: {
      'tensor':  'Creates a multi-dimensional number array (a "tensor") from a Python list.',
      'zeros':   'Creates a tensor filled entirely with zeros.',
      'ones':    'Creates a tensor filled entirely with ones.',
      'randn':   'Creates a tensor filled with small random numbers.',
      'matmul':  'Multiplies two tensors together (matrix multiplication).',
    }
  },
  nn: {
    label: 'torch.nn',
    what: "PyTorch's collection of neural network building blocks — layers, activations, and more.",
    fns: {
      'Embedding':  'A lookup table: given a token ID (number), it returns a fixed-size vector of numbers that represents that token.',
      'Linear':     'A fully-connected layer — multiplies inputs by learned weights and adds a bias.',
      'ReLU':       'An activation function that turns negative numbers into zero.',
      'Softmax':    'Squishes a list of numbers into probabilities that add up to 1.',
      'Sequential': 'Chains layers in order — input flows through each one.',
      'Module':     'The base class every custom neural network inherits from.',
    }
  },
  math: {
    label: 'math',
    what: "Python's built-in math tools — logarithms, square roots, trig, etc.",
    fns: {
      'log':   'Natural logarithm (base e). Use math.log2() for base-2 log.',
      'sqrt':  'Square root.',
      'exp':   'e raised to the power of x.',
      'floor': 'Rounds a number down to the nearest integer.',
      'ceil':  'Rounds a number up to the nearest integer.',
    }
  },
  numpy: {
    label: 'numpy (np)',
    what: "Fast arrays and math operations — the backbone of most data science in Python.",
    fns: {
      'array':    'Creates an ndarray from a Python list.',
      'zeros':    'Array filled with zeros.',
      'ones':     'Array filled with ones.',
      'dot':      'Dot product of two arrays.',
      'reshape':  'Changes the shape of an array without changing its data.',
      'mean':     'Average value.',
      'sum':      'Total of all values.',
    }
  },
};

// ── Progress helpers ─────────────────────────────────────────────────────────
function loadLocalProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      completedLessons: [], xp: 0, streak: 0, lastActive: null
    };
  } catch {
    return { completedLessons: [], xp: 0, streak: 0, lastActive: null };
  }
}

function saveLocalProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (e) {
    console.error('Failed to save progress:', e);
    return false;
  }
}

// ── URL params ───────────────────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const lessonId  = urlParams.get('id');

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!lessonId) {
    alert('No lesson specified');
    window.location.href = 'lessons.html';
    return;
  }

  // Show XP in nav
  const progress = loadLocalProgress();
  const navXpEl = document.getElementById('nav-xp-value');
  if (navXpEl) navXpEl.textContent = progress.xp || 0;

  try {
    await checkLessonAccess();
    await loadLesson();
    await loadQuiz();
    await loadCodeExercise();
    initPyodide();
    updateProgressBar(1);

    // Scroll reveal for content cards
    setupReveal();

    window.scrollTo(0, 0);
  } catch (err) {
    console.error('Init failed:', err);
    const titleEl = document.getElementById('lesson-title');
    if (titleEl) {
      titleEl.textContent = 'Error loading lesson';
      titleEl.style.color = '#ef4444';
    }
    alert('Failed to load lesson: ' + err.message);
  }
});

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function setupReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── Access check ──────────────────────────────────────────────────────────────
async function checkLessonAccess() {
  try {
    const progress = loadLocalProgress();
    const res = await fetch(`${API_BASE}/api/lessons`);
    const data = await res.json();
    const lessons = Array.isArray(data) ? data : (data.lessons || []);

    const idx = lessons.findIndex(l => l.id === lessonId);
    if (idx === -1) {
      alert('Lesson not found');
      window.location.href = 'lessons.html';
      return;
    }
    if (idx === 0) return; // first lesson always unlocked

    const prev = lessons[idx - 1];
    const completed = progress.completedLessons || [];
    if (!completed.includes(prev.id)) {
      alert(`Please complete "${prev.title}" first`);
      window.location.href = 'lessons.html';
    }
  } catch (e) {
    // fail open
    console.warn('Access check error (allowing):', e);
  }
}

// ── Load lesson ───────────────────────────────────────────────────────────────
async function loadLesson() {
  const res = await fetch(`${API_BASE}/api/lessons/${lessonId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  lessonData = await res.json();
  renderLessonContent();
}

function renderLessonContent() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '';
  };

  set('lesson-title',    lessonData.title);
  set('lesson-subtitle', lessonData.subtitle);
  set('nav-lesson-title', lessonData.title);
  set('story-text',    lessonData.story);
  set('concept-text',  lessonData.concept);
  set('analogy-text',  lessonData.analogy);
  set('visual-diagram', lessonData.visual);
  set('easteregg-text', lessonData.easterEgg);

  // Lists
  const renderList = (id, items) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = (items || []).map(i => `<li>${i}</li>`).join('');
  };
  renderList('keypoints-list', lessonData.keyPoints);
  renderList('realworld-list', lessonData.realWorld);
}

// ── Load quiz ─────────────────────────────────────────────────────────────────
async function loadQuiz() {
  try {
    const res = await fetch(`${API_BASE}/api/quiz/${lessonId}`);
    if (res.ok) quizData = await res.json();
  } catch { /* optional */ }
}

// ── Load code ─────────────────────────────────────────────────────────────────
async function loadCodeExercise() {
  try {
    const res = await fetch(`${API_BASE}/api/code-exercises/${lessonId}`);
    if (res.ok) {
      const data = await res.json();
      codeExercises = data.exercises || [];
    }
  } catch { /* optional */ }
}

// ── Step navigation ───────────────────────────────────────────────────────────
function nextStep() {
  const steps = document.querySelectorAll('.lesson-step');
  if (currentStep >= steps.length) return;

  // Hide current
  steps[currentStep - 1].classList.remove('active');

  // Mark dot as done
  const prevDot = document.getElementById(`dot-${currentStep}`);
  if (prevDot) {
    prevDot.classList.remove('active');
    prevDot.classList.add('done');
    prevDot.querySelector('.dot-circle').textContent = '✓';
  }

  currentStep++;

  // Show next
  steps[currentStep - 1].classList.add('active');
  updateProgressBar(currentStep);

  // Mark new dot active
  const newDot = document.getElementById(`dot-${currentStep}`);
  if (newDot) newDot.classList.add('active');

  // Step-specific init
  if (currentStep === 2) renderQuiz();
  if (currentStep === 3) renderCodeExercise();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressBar(step) {
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = `${((step - 1) / 3) * 100}%`;
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
function renderQuiz() {
  const container = document.getElementById('quiz-container');

  if (!quizData || !quizData.inLessonQuizzes || !quizData.inLessonQuizzes.length) {
    container.innerHTML = `
      <div class="no-quiz">
        No quiz for this lesson.
        <br><br>
        <button class="btn-cta" onclick="nextStep()">Continue to Coding →</button>
      </div>`;
    return;
  }

  const quiz = quizData.inLessonQuizzes[0];
  const questions = quiz.questions || [];

  if (currentQuizIndex >= questions.length) {
    showQuizResults(questions.length);
    return;
  }

  const q = questions[currentQuizIndex];
  container.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-progress-text">Question ${currentQuizIndex + 1} of ${questions.length}</div>
      <div class="quiz-question-text">${q.question}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" onclick="answerQuestion(${i}, ${q.correct}, this)">
            ${opt}
          </button>`).join('')}
      </div>
    </div>`;
}

function answerQuestion(selected, correct, btn) {
  const isCorrect = selected === correct;
  if (isCorrect) quizScore++;

  // Disable all options
  document.querySelectorAll('.quiz-option').forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add('correct');
    else if (b === btn && !isCorrect) b.classList.add('incorrect');
  });

  const q = quizData.inLessonQuizzes[0].questions[currentQuizIndex];
  const container = document.getElementById('quiz-container');

  setTimeout(() => {
    container.innerHTML = `
      <div class="quiz-feedback">
        <div class="feedback-card ${isCorrect ? 'correct' : 'incorrect'}">
          <div class="feedback-icon">${isCorrect ? '✓' : '✗'}</div>
          <div>
            <div class="feedback-label">${isCorrect ? 'Correct!' : 'Not quite'}</div>
            <div class="feedback-explanation">${q.explanation}</div>
          </div>
        </div>
      </div>`;

    setTimeout(() => {
      nextQuestion();
    }, 1400);
  }, 200);
}

function nextQuestion() {
  currentQuizIndex++;
  const totalQuestions = quizData.inLessonQuizzes[0].questions.length;

  if (currentQuizIndex >= totalQuestions) {
    // ── BUG FIX: only showQuizResults handles auto-advance to next step.
    //    Previously nextQuestion() also called nextStep() after 2s,
    //    creating a double-call that skipped the Code step entirely
    //    and bypassed completeLesson(), so progress was never saved.
    showQuizResults(totalQuestions);
  } else {
    renderQuiz();
  }
}

function showQuizResults(total) {
  const container = document.getElementById('quiz-container');
  const pct = total > 0 ? Math.round((quizScore / total) * 100) : 0;
  const msg = pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good job!' : '💪 Keep going!';

  container.innerHTML = `
    <div class="quiz-results-card">
      <h3>Quiz Complete!</h3>
      <div class="score-big">${quizScore}/${total}</div>
      <div class="score-pct">${pct}%</div>
      <div class="score-label">${msg}</div>
      <p class="quiz-advance-note">Moving to coding exercise...</p>
    </div>`;

  setTimeout(() => nextStep(), 2000);
}

// ── Library detection ─────────────────────────────────────────────────────────
// Parses import lines from starter code and returns matching glossary entries.
function detectLibraries(starterCode) {
  const detected = [];
  const seen = new Set();

  const lines = starterCode.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // "import re", "import torch", "import numpy as np", "import math"
    const simpleMatch = trimmed.match(/^import\s+([\w.]+)(?:\s+as\s+\w+)?/);
    if (simpleMatch) {
      const mod = simpleMatch[1].split('.')[0];  // torch.nn → torch
      if (LIBRARY_GLOSSARY[mod] && !seen.has(mod)) {
        detected.push({ key: mod, ...LIBRARY_GLOSSARY[mod] });
        seen.add(mod);
      }
    }

    // "from collections import Counter", "from torch.nn import ..."
    const fromMatch = trimmed.match(/^from\s+[\w.]+\s+import\s+(\w+)/);
    if (fromMatch) {
      const name = fromMatch[1];
      if (LIBRARY_GLOSSARY[name] && !seen.has(name)) {
        detected.push({ key: name, ...LIBRARY_GLOSSARY[name] });
        seen.add(name);
      }
    }

    // "import torch.nn as nn" — also add nn entry
    if (trimmed.includes('torch.nn') && !seen.has('nn')) {
      detected.push({ key: 'nn', ...LIBRARY_GLOSSARY['nn'] });
      seen.add('nn');
    }
  }
  return detected;
}

// Renders a collapsible "What you'll use" panel inside the instructions panel.
function renderLibraryPanel(libraries, container) {
  if (!libraries.length) return;

  const items = libraries.map(lib => {
    const fnRows = Object.entries(lib.fns || {})
      .map(([fn, desc]) => `
        <div class="lib-fn-row">
          <code class="lib-fn-name">${lib.key === 'Counter' ? fn : lib.key + '.' + fn}()</code>
          <span class="lib-fn-desc">${desc}</span>
        </div>`)
      .join('');

    return `
      <div class="lib-entry">
        <div class="lib-entry-header">
          <span class="lib-badge">${lib.label}</span>
          <span class="lib-what">${lib.what}</span>
        </div>
        ${fnRows ? `<div class="lib-fns">${fnRows}</div>` : ''}
      </div>`;
  }).join('');

  const panel = document.createElement('div');
  panel.className = 'library-panel';
  panel.innerHTML = `
    <details class="library-details">
      <summary class="library-summary">
        <span class="lib-icon">📦</span>
        New to this exercise
      </summary>
      <div class="library-body">${items}</div>
    </details>`;

  container.appendChild(panel);
}

// ── Code Exercise ─────────────────────────────────────────────────────────────
function renderCodeExercise() {
  if (!codeExercises || !codeExercises.length) {
    const el = document.getElementById('code-instructions');
    if (el) el.textContent = 'No coding exercise for this lesson.';
    return;
  }

  const exercise = codeExercises[0];
  currentExercise = exercise;
  const instrEl = document.getElementById('code-instructions');
  if (instrEl) instrEl.textContent = exercise.instructions;

  // Library awareness panel
  const instrPanel = document.querySelector('.instructions-panel');
  if (instrPanel) {
    const libs = detectLibraries(exercise.starterCode || '');
    renderLibraryPanel(libs, instrPanel);
  }

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    const editorDiv = document.getElementById('code-editor');
    editorDiv.innerHTML = `<textarea id="simple-editor" style="
      width:100%; height:300px; padding:1rem;
      font-family:'SF Mono',monospace; font-size:13px;
      background:#1e1e1e; color:#d4d4d4;
      border:none; outline:none; resize:vertical;"
    >${exercise.starterCode || '# Write your code here\n'}</textarea>`;

    editor = {
      getValue: () => document.getElementById('simple-editor').value,
      setValue: (v) => { document.getElementById('simple-editor').value = v; }
    };
  } else {
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      editor = monaco.editor.create(document.getElementById('code-editor'), {
        value: exercise.starterCode || '# Write your code here\n',
        language: 'python',
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 }
      });
    });
  }

  // Hints
  const hints = exercise.hints || [];
  const hintBtn = document.getElementById('show-hint-btn');
  if (hintBtn && hints.length > 0) {
    hintBtn.onclick = () => {
      if (currentHintIndex < hints.length) {
        const display = document.getElementById('hint-display');
        if (display) {
          display.style.display = 'block';
          display.innerHTML = `<strong>Hint ${currentHintIndex + 1}:</strong> ${hints[currentHintIndex]}`;
          currentHintIndex++;
        }
        if (currentHintIndex >= hints.length) {
          hintBtn.disabled = true;
          hintBtn.textContent = 'No more hints';
        }
      }
    };
  } else if (hintBtn) {
    hintBtn.style.display = 'none';
  }

  // Buttons
  const runBtn = document.getElementById('run-code-btn');
  if (runBtn) runBtn.onclick = runCode;

  const resetBtn = document.getElementById('reset-code-btn');
  if (resetBtn) resetBtn.onclick = () => {
    if (editor) editor.setValue(exercise.starterCode || '# Write your code here\n');
  };

  const clearBtn = document.getElementById('clear-console-btn');
  if (clearBtn) clearBtn.onclick = clearConsole;
}

// ── Pyodide ───────────────────────────────────────────────────────────────────
async function initPyodide() {
  try {
    // indexURL must be explicit — without it Pyodide v0.25 calls calculateDirname
    // which fails when the script is loaded from a CDN path it can't resolve.
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
    });
    console.log('✅ Pyodide ready');
  } catch (e) {
    console.warn('Pyodide failed to load:', e);
    appendToConsole('⚠️ Python runtime failed to load. This can happen if your browser blocks WebAssembly (e.g. Brave Shields). Try disabling shields for this site.', 'error');
  }
}

async function runCode() {
  if (!pyodide) { appendToConsole('⚠️ Python runtime not ready yet. Please wait...'); return; }
  if (!editor)  { appendToConsole('❌ Editor not initialized'); return; }

  const code = editor.getValue();
  clearConsole();
  appendToConsole('Running...', 'running');

  try {
    await pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
`);
    await pyodide.runPythonAsync(code);
    const output = await pyodide.runPythonAsync('sys.stdout.getvalue()');
    clearConsole();
    showOutputResult(output.trimEnd());
  } catch (e) {
    clearConsole();
    showErrorExplained(e.message);
  }
}

// ── Output validation ─────────────────────────────────────────────────────────
function showOutputResult(output) {
  const el = document.getElementById('console-output');
  if (!el) return;

  const exercise = currentExercise;
  const expected = exercise && exercise.expectedOutput ? exercise.expectedOutput.trimEnd() : null;
  const hints    = exercise ? (exercise.hints || []) : [];

  if (!output) {
    el.innerHTML = `<div class="console-line muted">(no output — your code ran but printed nothing)</div>`;
    return;
  }

  // No expected output defined — just show what ran
  if (!expected) {
    el.innerHTML = `<pre class="console-line success">${escapeHtml(output)}</pre>`;
    return;
  }

  const normalize = s => s.split('\n').map(l => l.trimEnd()).join('\n').trimEnd();
  const isCorrect = normalize(output) === normalize(expected);

  if (isCorrect) {
    el.innerHTML = `
      <div class="output-correct-card">
        <div class="output-correct-header">
          <span>✅</span>
          <span class="output-correct-title">Perfect — that's the right output!</span>
        </div>
        <pre class="output-pre">${escapeHtml(output)}</pre>
      </div>`;
  } else {
    // Show the next unused hint, cycling through the list
    const hint = hints[currentHintIndex] || null;

    el.innerHTML = `
      <div class="output-mismatch-card">
        <div class="output-mismatch-header">
          <span>🔍</span>
          <span class="output-mismatch-title">Not quite — compare your output to what's expected</span>
        </div>
        <div class="output-compare">
          <div class="output-col">
            <div class="output-col-label">Your output</div>
            <pre class="output-pre yours">${escapeHtml(output)}</pre>
          </div>
          <div class="output-col">
            <div class="output-col-label">Expected</div>
            <pre class="output-pre expected">${escapeHtml(expected)}</pre>
          </div>
        </div>
        ${hint ? `
        <div class="output-hint">
          <span class="hint-spark">💡</span>
          <span>${escapeHtml(hint)}</span>
        </div>` : ''}
      </div>`;
  }
  el.scrollTop = el.scrollHeight;
}

// ── Error interpreter ────────────────────────────────────────────────────────
// Turns raw Python tracebacks into plain-English lessons.
function explainPythonError(msg) {
  const rules = [
    // ── Missing argument ──────────────────────────────────────────────────
    {
      match: /(\w+)\(\) missing (\d+) required positional argument[s]?: '(.+?)'/,
      explain: (m) => ({
        title: 'Missing argument',
        body: `\`${m[1]}()\` needs more information to run. You're missing the \`${m[3]}\` argument.\n\nFunctions work like recipes — they need all the ingredients you promised them. Check how many arguments \`${m[1]}\` expects and make sure you're passing all of them.`
      })
    },
    // ── Wrong number of arguments ─────────────────────────────────────────
    {
      match: /(\w+)\(\) takes (\d+) positional argument[s]? but (\d+) (?:was|were) given/,
      explain: (m) => ({
        title: 'Too many arguments',
        body: `\`${m[1]}()\` expects ${m[2]} argument${m[2] === '1' ? '' : 's'} but you gave it ${m[3]}.\n\nRemove the extra argument and try again.`
      })
    },
    // ── Typo in function name (e.g. re.finall) ────────────────────────────
    {
      match: /module '(.+?)' has no attribute '(.+?)'/,
      explain: (m) => {
        const mod  = m[1];
        const fn   = m[2];
        const entry = LIBRARY_GLOSSARY[mod];
        // Find the closest real function name in the glossary
        const available = entry ? Object.keys(entry.fns || {}) : [];
        const closest = available.find(f => f.toLowerCase().startsWith(fn.slice(0, 4).toLowerCase()));
        let hint = `\`${mod}.${fn}\` doesn't exist — check the spelling.`;
        if (closest) {
          hint += ` Did you mean \`${mod}.${closest}()\`?\n\n${mod}.${closest}() — ${entry.fns[closest]}`;
        } else if (entry) {
          const fnList = available.map(f => `\`${mod}.${f}()\``).join(', ');
          hint += `\n\n${mod} is ${entry.what}\n\nFunctions you can use: ${fnList}`;
        } else {
          hint += `\n\nPython is case-sensitive. Double-check the function name.`;
        }
        return { title: 'Function name typo', body: hint };
      }
    },
    // ── Object has no attribute ───────────────────────────────────────────
    {
      match: /'(.+?)' object has no attribute '(.+?)'/,
      explain: (m) => ({
        title: 'Wrong method name',
        body: `A \`${m[1]}\` doesn't have a method called \`${m[2]}\`.\n\nCheck the spelling, or check that you're calling this on the right type of variable.`
      })
    },
    // ── NameError ─────────────────────────────────────────────────────────
    {
      match: /NameError: name '(.+?)' is not defined/,
      explain: (m) => ({
        title: 'Variable not defined',
        body: `\`${m[1]}\` doesn't exist yet when Python tries to use it.\n\nEither you have a typo, you forgot to create the variable before using it, or it was defined inside a function and you're using it outside.`
      })
    },
    // ── SyntaxError ───────────────────────────────────────────────────────
    {
      match: /SyntaxError: (.+)/,
      explain: (m) => ({
        title: 'Syntax error',
        body: `Python couldn't understand your code: ${m[1]}\n\nCommon causes: missing colon after \`if\`/\`for\`/\`def\`, unmatched parentheses or brackets, or a missing quote.`
      })
    },
    // ── IndentationError ─────────────────────────────────────────────────
    {
      match: /IndentationError: (.+)/,
      explain: () => ({
        title: 'Indentation error',
        body: `Your code isn't lined up correctly.\n\nPython uses spaces (not braces) to show which code belongs inside a function or loop. Every line inside a block needs the same number of spaces. Use 4 spaces per level.`
      })
    },
    // ── TypeError (generic) ───────────────────────────────────────────────
    {
      match: /TypeError: (.+)/,
      explain: (m) => ({
        title: 'Type error',
        body: `You used a value in a way it doesn't support: ${m[1]}\n\nThis usually means mixing incompatible types — like adding a number to a string, or calling a method on the wrong kind of variable. Check what types your variables are.`
      })
    },
    // ── IndexError ────────────────────────────────────────────────────────
    {
      match: /IndexError: (.+)/,
      explain: (m) => ({
        title: 'Index out of range',
        body: `${m[1]}\n\nYou're trying to access a position in a list that doesn't exist. Lists start at index 0, so a list of 3 items has positions 0, 1, and 2 — not 3.`
      })
    },
    // ── KeyError ─────────────────────────────────────────────────────────
    {
      match: /KeyError: (.+)/,
      explain: (m) => ({
        title: 'Key not found',
        body: `${m[1]} doesn't exist in your dictionary.\n\nCheck your spelling, or use \`.get(key)\` instead of \`[key]\` to avoid this crash when a key might be missing.`
      })
    },
    // ── ZeroDivisionError ─────────────────────────────────────────────────
    {
      match: /ZeroDivisionError/,
      explain: () => ({
        title: 'Division by zero',
        body: `You're dividing a number by 0, which is undefined.\n\nAdd a check before dividing: \`if divisor != 0:\``
      })
    },
    // ── RecursionError ────────────────────────────────────────────────────
    {
      match: /RecursionError/,
      explain: () => ({
        title: 'Infinite recursion',
        body: `Your function is calling itself forever without stopping.\n\nMake sure you have a base case — a condition where the function returns without calling itself again.`
      })
    },
  ];

  for (const rule of rules) {
    const m = msg.match(rule.match);
    if (m) return rule.explain(m);
  }

  return null;
}

function showErrorExplained(rawMessage) {
  const el = document.getElementById('console-output');
  if (!el) return;

  // Extract just the last error line (the actual exception)
  const lines    = rawMessage.split('\n').filter(Boolean);
  const lastLine = lines[lines.length - 1] || rawMessage;

  // Try to find a matching explanation
  const explained = explainPythonError(rawMessage) || explainPythonError(lastLine);

  // Find line number if mentioned in traceback
  const lineMatch = rawMessage.match(/line (\d+)/g);
  const lineRef   = lineMatch ? lineMatch[lineMatch.length - 1] : null;

  // Pull next exercise hint so the card is lesson-specific
  const exHints = currentExercise ? (currentExercise.hints || []) : [];
  const exHint  = exHints[currentHintIndex] || null;
  const hintHtml = exHint
    ? `<div class="output-hint" style="margin-top:0.85rem;"><span class="hint-spark">💡</span><span>${escapeHtml(exHint)}</span></div>`
    : '';

  const bodyHtml = (html) =>
    `${html}${hintHtml}
     <details class="error-details">
       <summary>See full error</summary>
       <pre class="error-raw">${escapeHtml(rawMessage)}</pre>
     </details>`;

  if (explained) {
    el.innerHTML = `
      <div class="error-card">
        <div class="error-card-header">
          <span class="error-icon">⚠️</span>
          <span class="error-title">${explained.title}${lineRef ? ` · ${lineRef}` : ''}</span>
        </div>
        <div class="error-body">${explained.body.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>')}</div>
        ${bodyHtml('')}
      </div>`;
  } else {
    el.innerHTML = `
      <div class="error-card">
        <div class="error-card-header">
          <span class="error-icon">⚠️</span>
          <span class="error-title">Error${lineRef ? ` · ${lineRef}` : ''}</span>
        </div>
        <pre class="error-raw">${escapeHtml(lastLine)}</pre>
        ${bodyHtml('')}
      </div>`;
  }
  el.scrollTop = el.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function clearConsole() {
  const el = document.getElementById('console-output');
  if (el) el.innerHTML = '';
}

function appendToConsole(text, type = '') {
  const el = document.getElementById('console-output');
  if (!el) return;
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = text;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Complete lesson ───────────────────────────────────────────────────────────
async function completeLesson() {
  try {
    const localProgress = loadLocalProgress();

    if (!localProgress.completedLessons.includes(lessonId)) {
      localProgress.completedLessons.push(lessonId);
      localProgress.xp = (localProgress.xp || 0) + 100;
      localProgress.lastActive = new Date().toISOString();
      saveLocalProgress(localProgress);
    }

    // Server backup (non-blocking)
    fetch(`${API_BASE}/api/lessons/${lessonId}/complete`, { method: 'POST' })
      .catch(() => {});

    // Show completion step
    const steps = document.querySelectorAll('.lesson-step');
    steps.forEach(s => s.classList.remove('active'));

    // Mark dots 1-3 done
    for (let i = 1; i <= 3; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        dot.classList.remove('active');
        dot.classList.add('done');
        dot.querySelector('.dot-circle').textContent = '✓';
      }
    }
    const dot4 = document.getElementById('dot-4');
    if (dot4) dot4.classList.add('active', 'done');

    const completeStep = document.getElementById('step-complete');
    if (completeStep) completeStep.classList.add('active');

    // Update progress bar to 100%
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = '100%';

    // Animate XP bar
    const totalXp = localProgress.xp;
    const maxXp = 2000; // rough cap for display
    const pct = Math.min((totalXp / maxXp) * 100, 100);

    setTimeout(() => {
      const xpFill = document.getElementById('total-xp-fill');
      if (xpFill) xpFill.style.width = `${pct}%`;
      const xpText = document.getElementById('total-xp-text');
      if (xpText) xpText.textContent = `Total: ${totalXp} XP`;
      const navXp = document.getElementById('nav-xp-value');
      if (navXp) navXp.textContent = totalXp;
    }, 300);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error('Complete lesson error:', e);
    alert('Error saving progress: ' + e.message);
  }
}

// ── Next lesson ───────────────────────────────────────────────────────────────
async function nextLesson() {
  try {
    const progress = loadLocalProgress();
    const res = await fetch(`${API_BASE}/api/lessons`);
    const data = await res.json();
    const lessons = Array.isArray(data) ? data : (data.lessons || []);

    const next = lessons.find(l => !progress.completedLessons.includes(l.id));

    if (next) {
      window.location.href = `lesson-detail.html?id=${next.id}`;
    } else {
      alert('🎉 All lessons complete!');
      window.location.href = 'lessons.html';
    }
  } catch (e) {
    console.error('nextLesson error:', e);
    window.location.href = 'lessons.html';
  }
}

// Export for inline handlers
window.nextStep       = nextStep;
window.completeLesson = completeLesson;
window.answerQuestion = answerQuestion;
window.runCode        = runCode;
window.nextLesson     = nextLesson;
