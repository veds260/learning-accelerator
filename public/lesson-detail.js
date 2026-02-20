// Lesson Detail — Connected Flow
const API_BASE = window.location.origin;

let currentStep = 1;
let lessonData  = null;
let quizData    = null;
let codeExercises = null;
let currentQuizIndex = 0;
let quizScore   = 0;
let editor      = null;
let pyodide     = null;
let currentHintIndex = 0;

const STORAGE_KEY = 'learning-accelerator-progress';

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

// ── Code Exercise ─────────────────────────────────────────────────────────────
function renderCodeExercise() {
  if (!codeExercises || !codeExercises.length) {
    const el = document.getElementById('code-instructions');
    if (el) el.textContent = 'No coding exercise for this lesson.';
    return;
  }

  const exercise = codeExercises[0];
  const instrEl = document.getElementById('code-instructions');
  if (instrEl) instrEl.textContent = exercise.instructions;

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
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
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
    pyodide = await loadPyodide();
  } catch (e) {
    console.warn('Pyodide failed to load:', e);
  }
}

async function runCode() {
  if (!pyodide) { appendToConsole('⚠️ Python runtime not ready yet. Please wait...'); return; }
  if (!editor)  { appendToConsole('❌ Editor not initialized'); return; }

  const code = editor.getValue();
  clearConsole();
  appendToConsole('Running...\n');

  try {
    await pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
`);
    await pyodide.runPythonAsync(code);
    const output = await pyodide.runPythonAsync('sys.stdout.getvalue()');
    appendToConsole(output || '(no output)');
  } catch (e) {
    appendToConsole(`Error:\n${e.message}`, 'error');
  }
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
