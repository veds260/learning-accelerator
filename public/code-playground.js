// Code Playground Logic with Pyodide

let pyodideInstance = null;
let monacoEditor = null;
let currentExercise = null;
let attemptCount = 0;
let currentHintIndex = 0;

// Exercise state
const exerciseState = {
  lessonId: null,
  exerciseId: null,
  starterCode: '',
  solution: '',
  expectedOutput: '',
  hints: [],
  xp: 20
};

// Initialize Pyodide (load once, heavy operation)
async function initPyodide() {
  if (pyodideInstance) return pyodideInstance;
  
  console.log('Loading Pyodide...');
  const startTime = Date.now();
  
  try {
    pyodideInstance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
    });
    
    // Capture stdout
    await pyodideInstance.runPythonAsync(`
import sys
from io import StringIO

sys.stdout = StringIO()
sys.stderr = StringIO()
    `);
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Pyodide loaded in ${loadTime}s`);
    
    return pyodideInstance;
  } catch (error) {
    console.error('Failed to load Pyodide:', error);
    throw error;
  }
}

// Initialize Monaco Editor
function initMonacoEditor() {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
  
  require(['vs/editor/editor.main'], function() {
    monacoEditor = monaco.editor.create(document.getElementById('code-editor'), {
      value: '# Loading...',
      language: 'python',
      theme: 'vs-dark',
      fontSize: 14,
      minimap: { enabled: false },
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on'
    });
    
    console.log('Monaco Editor initialized');
  });
}

// Open playground with specific exercise
async function openPlayground(lessonId, exerciseId) {
  try {
    // Fetch exercise data
    const response = await fetch(`/api/code-exercises/${lessonId}/${exerciseId}`);
    if (!response.ok) throw new Error('Exercise not found');
    
    currentExercise = await response.json();
    exerciseState.lessonId = lessonId;
    exerciseState.exerciseId = exerciseId;
    exerciseState.starterCode = currentExercise.starterCode;
    exerciseState.solution = currentExercise.solution;
    exerciseState.expectedOutput = currentExercise.expectedOutput;
    exerciseState.hints = currentExercise.hints || [];
    exerciseState.xp = currentExercise.xp || 20;
    
    // Reset state
    attemptCount = 0;
    currentHintIndex = 0;
    
    // Update UI
    document.getElementById('exercise-title').textContent = currentExercise.title;
    document.getElementById('exercise-instructions').textContent = currentExercise.instructions;
    
    // Load starter code into editor
    if (monacoEditor) {
      monacoEditor.setValue(exerciseState.starterCode);
    }
    
    // Show playground
    document.getElementById('playground-container').classList.remove('hidden');
    
    // Initialize Pyodide in background if not loaded
    if (!pyodideInstance) {
      initPyodide().catch(err => {
        showValidation('error', '❌ Failed to load Python environment. Please refresh the page.');
      });
    }
    
    // Clear console
    clearConsole();
    
    // Hide hints/solution initially
    document.getElementById('hints-section').classList.add('hidden');
    document.getElementById('solution-section').classList.add('hidden');
    document.getElementById('hint-display').classList.add('hidden');
    document.getElementById('validation-message').classList.add('hidden');
    
  } catch (error) {
    console.error('Failed to load exercise:', error);
    alert('Failed to load exercise. Please try again.');
  }
}

// Run user code
async function runCode() {
  if (!pyodideInstance) {
    showConsole('⏳ Loading Python environment, please wait...\n', 'info');
    await initPyodide();
  }
  
  const userCode = monacoEditor.getValue();
  const runBtn = document.getElementById('run-code-btn');
  
  try {
    // Disable button during execution
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Running...';
    
    // Clear previous output
    clearConsole();
    
    // Reset stdout/stderr
    await pyodideInstance.runPythonAsync(`
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);
    
    // Run user code
    await pyodideInstance.runPythonAsync(userCode);
    
    // Get output
    const stdout = await pyodideInstance.runPythonAsync('sys.stdout.getvalue()');
    const stderr = await pyodideInstance.runPythonAsync('sys.stderr.getvalue()');
    
    if (stderr) {
      showConsole(stderr, 'error');
      attemptCount++;
      checkAttempts();
      showValidation('error', '❌ Error in your code. Check the console output.');
      return;
    }
    
    if (stdout) {
      showConsole(stdout, 'success');
      
      // Validate output
      validateOutput(stdout);
    } else {
      showConsole('(No output)', 'info');
      attemptCount++;
      checkAttempts();
      showValidation('warning', '⚠️ Your code ran but produced no output.');
    }
    
  } catch (error) {
    showConsole(`Error: ${error.message}`, 'error');
    attemptCount++;
    checkAttempts();
    showValidation('error', '❌ Syntax error or runtime error. Check your code!');
    
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run Code';
  }
}

// Validate output against expected
function validateOutput(actualOutput) {
  const actual = actualOutput.trim();
  const expected = exerciseState.expectedOutput.trim();
  
  // Flexible matching (handles formatting differences)
  const actualNormalized = actual.replace(/\s+/g, ' ');
  const expectedNormalized = expected.replace(/\s+/g, ' ');
  
  if (actualNormalized === expectedNormalized) {
    // SUCCESS!
    showValidation('success', `✅ Perfect! You got it right! +${exerciseState.xp} XP`);
    celebrateSuccess();
    saveProgress();
  } else {
    attemptCount++;
    checkAttempts();
    
    showValidation('error', `❌ Not quite right. Expected output:\n${expected}\n\nYour output:\n${actual}`);
  }
}

// Check attempts and show hints/solution
function checkAttempts() {
  // Show hints after 1 attempt
  if (attemptCount >= 1 && exerciseState.hints.length > 0) {
    document.getElementById('hints-section').classList.remove('hidden');
  }
  
  // Show solution button after 3 attempts
  if (attemptCount >= 3) {
    document.getElementById('solution-section').classList.remove('hidden');
  }
}

// Show next hint
function showNextHint() {
  if (currentHintIndex < exerciseState.hints.length) {
    const hint = exerciseState.hints[currentHintIndex];
    const hintDisplay = document.getElementById('hint-display');
    
    hintDisplay.innerHTML = `<div class="hint-box"><strong>Hint ${currentHintIndex + 1}:</strong> ${hint}</div>`;
    hintDisplay.classList.remove('hidden');
    
    currentHintIndex++;
    
    // Hide button if no more hints
    if (currentHintIndex >= exerciseState.hints.length) {
      document.getElementById('show-hint-btn').textContent = '(No more hints)';
      document.getElementById('show-hint-btn').disabled = true;
    } else {
      document.getElementById('show-hint-btn').textContent = `💡 Show Next Hint (${exerciseState.hints.length - currentHintIndex} left)`;
    }
  }
}

// Show solution
function showSolution() {
  if (confirm('Are you sure? Viewing the solution gives no XP!')) {
    monacoEditor.setValue(exerciseState.solution);
    showValidation('info', 'ℹ️ Solution loaded. Study it and try to understand why it works!');
    document.getElementById('show-solution-btn').disabled = true;
  }
}

// Reset code to starter
function resetCode() {
  if (confirm('Reset to starter code? Your changes will be lost.')) {
    monacoEditor.setValue(exerciseState.starterCode);
    clearConsole();
    attemptCount = 0;
    currentHintIndex = 0;
    document.getElementById('hints-section').classList.add('hidden');
    document.getElementById('solution-section').classList.add('hidden');
    document.getElementById('hint-display').classList.add('hidden');
    document.getElementById('validation-message').classList.add('hidden');
  }
}

// Console output helpers
function showConsole(text, type = 'default') {
  const output = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = `console-line console-${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function clearConsole() {
  document.getElementById('console-output').innerHTML = '';
}

// Validation message
function showValidation(type, message) {
  const validationBox = document.getElementById('validation-message');
  validationBox.className = `validation-box validation-${type}`;
  validationBox.textContent = message;
  validationBox.classList.remove('hidden');
  
  // Scroll into view
  validationBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Celebration animation
function celebrateSuccess() {
  // Confetti effect (simple version)
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

// Save progress
async function saveProgress() {
  try {
    const response = await fetch('/api/code-exercises/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: exerciseState.lessonId,
        exerciseId: exerciseState.exerciseId,
        xp: exerciseState.xp
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Progress saved:', result);
      
      // Update parent window if in iframe
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'exercise-complete',
          xp: exerciseState.xp,
          exerciseId: exerciseState.exerciseId
        }, '*');
      }
    }
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

// Close playground
function closePlayground() {
  document.getElementById('playground-container').classList.add('hidden');
  
  // Notify parent window
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'playground-closed' }, '*');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Monaco Editor
  initMonacoEditor();
  
  // Button handlers
  document.getElementById('run-code-btn').addEventListener('click', runCode);
  document.getElementById('reset-code-btn').addEventListener('click', resetCode);
  document.getElementById('clear-console-btn').addEventListener('click', clearConsole);
  document.getElementById('show-hint-btn').addEventListener('click', showNextHint);
  document.getElementById('show-solution-btn').addEventListener('click', showSolution);
  document.getElementById('close-playground-btn').addEventListener('click', closePlayground);
  
  // Listen for messages from parent window
  window.addEventListener('message', (event) => {
    if (event.data.type === 'open-exercise') {
      openPlayground(event.data.lessonId, event.data.exerciseId);
    }
  });
});

// Export for embedding
window.CodePlayground = {
  open: openPlayground,
  close: closePlayground
};
