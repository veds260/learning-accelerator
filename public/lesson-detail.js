// Lesson Detail - Connected Flow
const API_BASE = window.location.origin;
let currentStep = 1;
let lessonData = null;
let quizData = null;
let codeExercises = null;
let currentQuizIndex = 0;
let quizScore = 0;
let editor = null;
let pyodide = null;
let currentHintIndex = 0;

// Client-side progress storage
const STORAGE_KEY = 'learning-accelerator-progress';

function loadLocalProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      completedLessons: [],
      xp: 0,
      streak: 0,
      lastActive: null
    };
  } catch (error) {
    console.error('Failed to load progress:', error);
    return { completedLessons: [], xp: 0, streak: 0, lastActive: null };
  }
}

function saveLocalProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    console.log('✅ Progress saved locally:', progress);
  } catch (error) {
    console.error('❌ Failed to save progress:', error);
  }
}

// Get lesson ID from URL
const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get('id');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (!lessonId) {
    alert('No lesson specified');
    window.location.href = 'lessons.html';
    return;
  }
  
  // Check if lesson is unlocked before loading
  await checkLessonAccess();
  
  await loadLesson();
  await loadQuiz();
  await loadCodeExercise();
  initPyodide();
});

// Check if user has access to this lesson
async function checkLessonAccess() {
  try {
    const progress = loadLocalProgress();
    
    const lessonsResponse = await fetch(`${API_BASE}/api/lessons`);
    const lessons = await lessonsResponse.json();
    
    const currentLessonIndex = lessons.findIndex(l => l.id === lessonId);
    
    if (currentLessonIndex === -1) {
      console.error('Lesson not found:', lessonId);
      alert('Lesson not found');
      window.location.href = 'lessons.html';
      return;
    }
    
    // First lesson is always unlocked
    if (currentLessonIndex === 0) {
      console.log('✅ First lesson - access granted');
      return;
    }
    
    // Check if previous lesson is completed
    const previousLesson = lessons[currentLessonIndex - 1];
    const completedLessons = progress.completedLessons || [];
    
    if (!completedLessons.includes(previousLesson.id)) {
      console.warn('⚠️ Previous lesson not completed:', previousLesson.id);
      alert(`Please complete "${previousLesson.title}" first`);
      window.location.href = 'lessons.html';
      return;
    }
    
    console.log('✅ Lesson access granted:', lessonId);
  } catch (error) {
    console.error('Error checking lesson access:', error);
    // Allow access on error (fail open)
  }
}

// Load lesson content
async function loadLesson() {
  try {
    console.log('Loading lesson:', lessonId);
    const response = await fetch(`${API_BASE}/api/lessons/${lessonId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    lessonData = await response.json();
    console.log('Lesson loaded:', lessonData);
    
    renderLessonContent();
  } catch (error) {
    console.error('Failed to load lesson:', error);
    alert('Failed to load lesson: ' + error.message);
  }
}

// Render lesson content in Step 1
function renderLessonContent() {
  document.getElementById('lesson-title').textContent = lessonData.title;
  document.getElementById('lesson-subtitle').textContent = lessonData.subtitle || '';
  
  document.getElementById('story-text').textContent = lessonData.story || '';
  document.getElementById('concept-text').textContent = lessonData.concept || '';
  document.getElementById('analogy-text').textContent = lessonData.analogy || '';
  document.getElementById('visual-diagram').textContent = lessonData.visual || '';
  
  // Key points
  const keypointsList = document.getElementById('keypoints-list');
  keypointsList.innerHTML = (lessonData.keyPoints || [])
    .map(point => `<li>${point}</li>`)
    .join('');
  
  // Real world applications
  const realworldList = document.getElementById('realworld-list');
  realworldList.innerHTML = (lessonData.realWorld || [])
    .map(item => `<li>${item}</li>`)
    .join('');
  
  document.getElementById('easteregg-text').textContent = lessonData.easterEgg || '';
}

// Load quiz for this lesson
async function loadQuiz() {
  try {
    const response = await fetch(`${API_BASE}/api/quiz/${lessonId}`);
    if (!response.ok) {
      console.warn('No quiz found for this lesson');
      return;
    }
    
    quizData = await response.json();
    console.log('Quiz loaded:', quizData);
  } catch (error) {
    console.error('Failed to load quiz:', error);
  }
}

// Load code exercises
async function loadCodeExercise() {
  try {
    const response = await fetch(`${API_BASE}/api/code-exercises/${lessonId}`);
    if (!response.ok) {
      console.warn('No code exercise found for this lesson');
      return;
    }
    
    const data = await response.json();
    codeExercises = data.exercises || [];
    console.log('Code exercises loaded:', codeExercises);
  } catch (error) {
    console.error('Failed to load code exercises:', error);
  }
}

// Step navigation
function nextStep() {
  const steps = document.querySelectorAll('.lesson-step');
  const progressSteps = document.querySelectorAll('.progress-step');
  
  // Hide current step
  steps[currentStep - 1].classList.remove('active');
  
  // Move to next step
  currentStep++;
  
  // Show next step
  if (currentStep <= steps.length) {
    steps[currentStep - 1].classList.add('active');
    progressSteps[currentStep - 1].classList.add('active');
    
    // Initialize step content
    if (currentStep === 2) {
      renderQuiz();
    } else if (currentStep === 3) {
      renderCodeExercise();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Render quiz questions
function renderQuiz() {
  const container = document.getElementById('quiz-container');
  
  if (!quizData || !quizData.inLessonQuizzes || quizData.inLessonQuizzes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p>No quiz available for this lesson.</p>
        <button class="btn primary" onclick="nextStep()">Skip to Coding →</button>
      </div>
    `;
    return;
  }
  
  const quiz = quizData.inLessonQuizzes[0]; // Use first quiz
  const questions = quiz.questions || [];
  
  if (currentQuizIndex >= questions.length) {
    showQuizResults();
    return;
  }
  
  const question = questions[currentQuizIndex];
  
  container.innerHTML = `
    <div class="quiz-question">
      <div class="quiz-progress">Question ${currentQuizIndex + 1} of ${questions.length}</div>
      <h3>${question.question}</h3>
      <div class="quiz-options">
        ${question.options.map((option, index) => `
          <button class="quiz-option" onclick="answerQuestion(${index}, ${question.correct})">
            ${option}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function answerQuestion(selected, correct) {
  const isCorrect = selected === correct;
  
  if (isCorrect) {
    quizScore++;
  }
  
  // Show feedback
  const container = document.getElementById('quiz-container');
  const question = quizData.inLessonQuizzes[0].questions[currentQuizIndex];
  
  container.innerHTML = `
    <div class="quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}">
      <div class="feedback-icon">${isCorrect ? '✅' : '❌'}</div>
      <h3>${isCorrect ? 'Correct!' : 'Not quite'}</h3>
      <p>${question.explanation}</p>
    </div>
  `;
  
  // Auto-advance to next question after 1.5 seconds
  setTimeout(() => {
    nextQuestion();
  }, 1500);
}

function nextQuestion() {
  currentQuizIndex++;
  
  // If quiz is done, auto-advance to code after showing results
  const totalQuestions = quizData.inLessonQuizzes[0].questions.length;
  if (currentQuizIndex >= totalQuestions) {
    renderQuiz(); // Show results
    setTimeout(() => {
      nextStep(); // Auto-advance to code after 2 seconds
    }, 2000);
  } else {
    renderQuiz();
  }
}

function showQuizResults() {
  const container = document.getElementById('quiz-container');
  const totalQuestions = quizData.inLessonQuizzes[0].questions.length;
  const percentage = Math.round((quizScore / totalQuestions) * 100);
  
  container.innerHTML = `
    <div class="quiz-results">
      <h3>Quiz Complete!</h3>
      <div class="score-display">
        <div class="score-number">${quizScore}/${totalQuestions}</div>
        <div class="score-percentage">${percentage}%</div>
      </div>
      <p>${percentage >= 80 ? '🎉 Excellent work!' : percentage >= 60 ? '👍 Good job!' : '💪 Keep practicing!'}</p>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 1rem;">Moving to coding exercise...</p>
    </div>
  `;
  
  // Auto-advance to code after showing results briefly
  setTimeout(() => {
    nextStep();
  }, 2000);
}

// Render code exercise
function renderCodeExercise() {
  if (!codeExercises || codeExercises.length === 0) {
    document.getElementById('code-instructions').textContent = 'No coding exercise for this lesson.';
    return;
  }
  
  const exercise = codeExercises[0];
  document.getElementById('code-instructions').textContent = exercise.instructions;
  
  // Detect mobile (use simple textarea instead of Monaco)
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // Use simple textarea for mobile
    const editorDiv = document.getElementById('code-editor');
    editorDiv.innerHTML = `
      <textarea id="simple-editor" style="
        width: 100%;
        height: 400px;
        padding: 1rem;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid var(--border);
        border-radius: 4px;
        resize: vertical;
      ">${exercise.starterCode || '# Write your code here\n'}</textarea>
    `;
    
    // Create simple editor interface
    editor = {
      getValue: () => document.getElementById('simple-editor').value,
      setValue: (val) => { document.getElementById('simple-editor').value = val; }
    };
    
    console.log('✅ Using mobile-friendly textarea editor');
  } else {
    // Initialize Monaco editor for desktop
    if (!editor) {
      require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
      require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('code-editor'), {
          value: exercise.starterCode || '# Write your code here\n',
          language: 'python',
          theme: 'vs-dark',
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true
        });
        console.log('✅ Monaco editor loaded');
      });
    }
  }
  
  // Setup hints
  if (exercise.hints && exercise.hints.length > 0) {
    document.getElementById('show-hint-btn').onclick = () => {
      if (currentHintIndex < exercise.hints.length) {
        const hintDisplay = document.getElementById('hint-display');
        hintDisplay.style.display = 'block';
        hintDisplay.innerHTML = `
          <strong>Hint ${currentHintIndex + 1}:</strong><br>
          ${exercise.hints[currentHintIndex]}
        `;
        currentHintIndex++;
        
        if (currentHintIndex >= exercise.hints.length) {
          document.getElementById('show-hint-btn').disabled = true;
          document.getElementById('show-hint-btn').textContent = 'No more hints';
        }
      }
    };
  }
  
  // Setup buttons
  document.getElementById('run-code-btn').onclick = runCode;
  document.getElementById('reset-code-btn').onclick = () => {
    if (editor) {
      editor.setValue(exercise.starterCode || '# Write your code here\n');
    }
  };
  document.getElementById('clear-console-btn').onclick = clearConsole;
}

// Initialize Pyodide
async function initPyodide() {
  try {
    console.log('Loading Pyodide...');
    pyodide = await loadPyodide();
    console.log('✅ Pyodide ready');
  } catch (error) {
    console.error('Failed to load Pyodide:', error);
  }
}

// Run code
async function runCode() {
  if (!pyodide) {
    appendToConsole('⚠️ Python runtime not ready yet. Please wait...');
    return;
  }
  
  if (!editor) {
    appendToConsole('❌ Editor not initialized');
    return;
  }
  
  const code = editor.getValue();
  clearConsole();
  appendToConsole('Running...\n');
  
  try {
    // Redirect stdout
    await pyodide.runPythonAsync(`
      import sys
      from io import StringIO
      sys.stdout = StringIO()
    `);
    
    // Run user code
    await pyodide.runPythonAsync(code);
    
    // Get output
    const output = await pyodide.runPythonAsync('sys.stdout.getvalue()');
    appendToConsole(output || '(no output)');
  } catch (error) {
    appendToConsole(`❌ Error:\n${error.message}`, 'error');
  }
}

function clearConsole() {
  document.getElementById('console-output').innerHTML = '';
}

function appendToConsole(text, type = 'output') {
  const consoleEl = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = text;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// Complete lesson
async function completeLesson() {
  try {
    console.log('📝 Completing lesson:', lessonId);
    
    // Load current progress from localStorage
    const localProgress = loadLocalProgress();
    
    // Check if already completed locally
    if (localProgress.completedLessons.includes(lessonId)) {
      console.log('⚠️ Lesson already completed locally');
    } else {
      // Mark as complete in localStorage
      localProgress.completedLessons.push(lessonId);
      localProgress.xp = (localProgress.xp || 0) + 100;
      localProgress.lastActive = new Date().toISOString();
      
      // Save to localStorage immediately
      saveLocalProgress(localProgress);
      console.log('✅ Saved to localStorage:', localProgress);
    }
    
    // ALSO save to server (persistent backup)
    try {
      const response = await fetch(`${API_BASE}/api/lessons/${lessonId}/complete`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const serverResult = await response.json();
        console.log('✅ Saved to server:', serverResult);
      } else {
        console.warn('⚠️ Server save failed, but localStorage worked');
      }
    } catch (serverError) {
      console.warn('⚠️ Server save failed:', serverError.message);
      console.log('📱 Progress saved locally, will sync when server is available');
    }
    
    // Show completion step
    currentStep = 4;
    document.querySelectorAll('.lesson-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-complete').classList.add('active');
    document.querySelectorAll('.progress-step').forEach(step => step.classList.add('active'));
    
    // Show badge if available
    if (lessonData.badge) {
      document.getElementById('completion-badge').innerHTML = `
        <div style="font-size: 4rem; margin: 1rem 0;">${lessonData.badge || '🎓'}</div>
        <p style="font-weight: 600;">Badge Earned!</p>
      `;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error('❌ Failed to complete lesson:', error);
    alert('Error completing lesson: ' + error.message);
  }
}

// Go to next lesson
async function nextLesson() {
  try {
    console.log('Finding next lesson...');
    
    // Load progress from localStorage
    const progress = loadLocalProgress();
    
    console.log('Current progress:', progress);
    console.log('Completed lessons:', progress.completedLessons);
    
    const lessonsResponse = await fetch(`${API_BASE}/api/lessons`);
    const lessons = await lessonsResponse.json();
    
    const completedLessons = progress.completedLessons || [];
    const nextLesson = lessons.find(l => !completedLessons.includes(l.id));
    
    console.log('Next uncompleted lesson:', nextLesson ? nextLesson.id : 'none');
    
    if (nextLesson) {
      console.log('Navigating to:', nextLesson.id);
      window.location.href = `lesson-detail.html?id=${nextLesson.id}`;
    } else {
      alert('🎉 All lessons complete!');
      window.location.href = 'lessons.html';
    }
  } catch (error) {
    console.error('Error finding next lesson:', error);
    alert('Error loading next lesson. Returning to lessons list.');
    window.location.href = 'lessons.html';
  }
}
